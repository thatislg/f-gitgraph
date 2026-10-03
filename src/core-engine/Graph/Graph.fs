namespace NeoGitCore.Graph

// Tầng giải thuật đồ thị: sắp xếp Topo, phân bổ làn thu gọn trái (Lane Pool),
// tính toán song song đa luồng tọa độ hình học SVG.
// Tham khảo thiết kế:
// docs/02_design/001_windows/04_Parallel_DAG_Layout_Solver.md

open System
open System.Collections.Generic
open System.Threading.Tasks
open NeoGitCore.Domain
open NeoGitCore.Storage

// --- Nhiệm vụ 4.1: Sắp Xếp Topo ---

[<RequireQualifiedAccess>]
module TopoSort =

    /// Bộ so sánh ưu tiên dạng max-heap: ưu tiên thế hệ cao hơn trước,
    /// sau đó đến thời gian tạo commit muộn hơn.
    let private priorityComparer =
        Comparer.Create(fun (g1: uint32, t1: int64) (g2: uint32, t2: int64) ->
            let c = compare g2 g1
            if c <> 0 then c else compare t2 t1)

    /// Sắp xếp topo dùng thuật toán Kahn cải tiến + hàng đợi ưu tiên.
    /// Trả về mảng chỉ số (index vào Commits) theo thứ tự hiển thị: commit con
    /// (mới hơn) luôn đứng trước commit cha (cũ hơn).
    ///
    /// Xử lý đầy đủ các trường hợp đặc biệt:
    /// - Bản sao nông (shallow): cha bị thiếu đã được tầng Storage lược bỏ.
    /// - Nhánh mồ côi / kho đa gốc: nhiều nút không có con (tip) được xử lý song song.
    /// - Octopus merge: chỉ cần quan hệ cha-con, không phụ thuộc số lượng cha.
    let order (snapshot: GraphSnapshot) : int[] =
        let n = snapshot.Commits.Length

        // indegree[i] = số lượng commit con đang trỏ tới commit i (chưa được đặt).
        // Nút có indegree = 0 là "tip" (commit mới nhất của mỗi nhánh).
        let indegree = Array.zeroCreate<int> n
        for i in 0 .. n - 1 do
            for p in snapshot.Parents[i] do
                indegree[p] <- indegree[p] + 1

        let queue = PriorityQueue<int, uint32 * int64>(priorityComparer)
        for i in 0 .. n - 1 do
            if indegree[i] = 0 then
                queue.Enqueue(i, (snapshot.Generation[i], snapshot.CommitTime[i]))

        let result = Array.zeroCreate<int> n
        let mutable k = 0
        while queue.Count > 0 do
            let i = queue.Dequeue()
            result[k] <- i
            k <- k + 1
            for p in snapshot.Parents[i] do
                indegree[p] <- indegree[p] - 1
                if indegree[p] = 0 then
                    queue.Enqueue(p, (snapshot.Generation[p], snapshot.CommitTime[p]))

        result

// --- Nhiệm vụ 4.2: Phân Bổ Làn Thu Gọn Trái (Left-compact Lane Allocation) ---

[<RequireQualifiedAccess>]
module Lanes =

    /// Phân bổ làn thu gọn trái cho từng commit theo thứ tự hiển thị.
    /// Trả về laneOf: int[] (chỉ số làn của từng commit theo index).
    ///
    /// Nguyên tắc:
    /// 1. Kế thừa làn: commit là cha mà một làn đang chờ sẽ đặt ngay trên làn đó.
    /// 2. Thu gọn trái: nhánh mới tái sử dụng làn trống đầu tiên bên trái;
    ///    chỉ cấp làn mới ở mép phải khi toàn bộ làn bên trái đều bận.
    /// 3. Đóng làn: commit gốc (không cha) hoặc nhánh nhập vào commit khác
    ///    sẽ giải phóng làn để nhánh dưới tái sử dụng.
    let assign (snapshot: GraphSnapshot) (order: int[]) : int[] =
        let n = snapshot.Commits.Length
        // active[l] = commit cha mà làn l đang chờ (hoặc -1 nếu làn trống).
        let active = ResizeArray<int>()
        let laneOf = Array.zeroCreate<int> n

        let firstEmpty () =
            let mutable found = -1
            let mutable i = 0
            while i < active.Count && found < 0 do
                if active[i] = -1 then found <- i
                i <- i + 1
            found

        for c in order do
            // Tập hợp các làn đang chờ commit c.
            let waiting = ResizeArray<int>()
            for i in 0 .. active.Count - 1 do
                if active[i] = c then waiting.Add i

            let lane =
                if waiting.Count > 0 then
                    // Thừa kế làn trái nhất; các làn còn lại nhập vào c -> giải phóng.
                    let inheritLane = waiting[0]
                    for i in 1 .. waiting.Count - 1 do
                        active[waiting[i]] <- -1
                    inheritLane
                else
                    let empty = firstEmpty ()
                    if empty >= 0 then
                        empty
                    else
                        let newLane = active.Count
                        active.Add(-1)
                        newLane

            laneOf[c] <- lane

            if snapshot.Parents[c].Length = 0 then
                // Commit gốc: giải phóng làn.
                active[lane] <- -1
            else
                // Cha thứ nhất kế thừa làn của c.
                active[lane] <- snapshot.Parents[c][0]
                // Các cha còn lại (merge/octopus) cấp làn trống hoặc làn mới.
                for pi in 1 .. snapshot.Parents[c].Length - 1 do
                    let p = snapshot.Parents[c][pi]
                    let empty = firstEmpty ()
                    if empty >= 0 then active[empty] <- p
                    else active.Add p

        laneOf

// --- Nhiệm vụ 4.3: Tính Toán Song Song Tọa Độ Hình Học SVG ---

[<RequireQualifiedAccess>]
module Geometry =

    /// Số màu sắc trong bảng màu nhánh (chuẩn giao diện GitLens).
    [<Literal>]
    let PaletteSize = 8

    /// Khoảng cách ngang giữa hai làn (pixel).
    let LaneWidth = 16.0
    /// Khoảng cách dọc giữa hai dòng commit (pixel).
    let RowHeight = 24.0
    /// Bán kính nút commit (pixel).
    let NodeRadius = 6.0
    /// Khoảng đệm mép đồ thị (pixel).
    let Margin = 10.0

    /// Thông tin hình học một nút commit.
    type Node = {
        /// Tọa độ tâm x (pixel).
        X: float
        /// Tọa độ tâm y (pixel).
        Y: float
        /// Bán kính hiển thị nút.
        Radius: float
        /// Chỉ số làn.
        Lane: int
        /// Chỉ số màu nhánh (0..7).
        Color: int
        /// Cờ commit gộp (merge, >= 2 cha).
        IsMerge: bool
        /// Cờ commit gốc (không cha).
        IsRoot: bool
    }

    /// Thông tin hình học một đường nối nhánh.
    type Path = {
        /// Chuỗi lệnh vẽ SVG (đường dẫn `d`).
        D: string
        /// Chỉ số màu nét vẽ.
        Color: int
        /// Độ dày nét vẽ.
        Width: float
    }

    /// Kết quả bố cục hình học phẳng, sẵn sàng cho Webview vẽ trực tiếp (Dumb Renderer).
    type Layout = {
        /// Mảng tọa độ các nút commit (theo index commit).
        Nodes: Node[]
        /// Mảng các đường nối nhánh.
        Paths: Path[]
        /// Cạnh (chỉ số commit con, cha) tương ứng từng phần tử của Paths.
        Edges: struct (int * int)[]
        /// Tổng số dòng hiển thị.
        RowCount: int
        /// Số làn tối đa được cấp phát.
        MaxLane: int
    }

    /// Số phần tử mỗi khối tính toán song song.
    [<Literal>]
    let private BatchSize = 1000

    let private centerX (lane: int) = Margin + float lane * LaneWidth
    let private centerY (row: int) = Margin + float row * RowHeight

    /// Màu nhánh ổn định theo làn: modulo luân phiên trong bảng 8 màu.
    let colorOfLane (lane: int) = lane % PaletteSize

    let private makeNode (isMerge: bool) (isRoot: bool) (lane: int) (row: int) : Node =
        { X = centerX lane
          Y = centerY row
          Radius = NodeRadius
          Lane = lane
          Color = colorOfLane lane
          IsMerge = isMerge
          IsRoot = isRoot }

    // Định dạng tọa độ SVG không dùng sprintf (%g) vì F# sinh MakeGenericMethod
    // qua phản chiếu, không tương thích Native AOT. Dùng ToString invariant thay thế.
    let private fmt (x: float) = x.ToString(System.Globalization.CultureInfo.InvariantCulture)

    let private makePath (child: Node) (parent: Node) : Path =
        let y0 = child.Y + NodeRadius
        let y1 = parent.Y - NodeRadius
        let d =
            if child.X = parent.X then
                // Cùng làn: đường thẳng đứng liền mạch.
                "M " + fmt child.X + " " + fmt y0 + " L " + fmt parent.X + " " + fmt y1
            else
                // Khác làn: đường cong Bezier bậc ba mượt mà (rẽ/sáp nhập nhánh).
                let ymid = (y0 + y1) / 2.0
                "M " + fmt child.X + " " + fmt y0
                + " C " + fmt child.X + " " + fmt ymid + ", "
                + fmt parent.X + " " + fmt ymid + ", "
                + fmt parent.X + " " + fmt y1
        { D = d
          Color = child.Color
          Width = 1.5 }

    /// Tính toán toàn bộ hình học: nút và đường nối, phân khối song song đa luồng.
    let compute (snapshot: GraphSnapshot) (order: int[]) (laneOf: int[]) : Layout =
        let n = snapshot.Commits.Length
        let row = Array.zeroCreate<int> n
        order |> Array.iteri (fun r c -> row[c] <- r)

        // Tọa độ nút tính song song theo khối.
        let nodes = Array.zeroCreate<Node> n
        Parallel.For(0, n, fun c ->
            nodes[c] <-
                makeNode
                    (snapshot.Parents[c].Length >= 2)
                    (snapshot.Parents[c].Length = 0)
                    laneOf[c]
                    row[c])
        |> ignore

        // Thu thập danh sách cạnh (con -> cha) trước, rồi tính đường nối song song.
        let edges = ResizeArray<struct (int * int)>()
        for c in 0 .. n - 1 do
            for p in snapshot.Parents[c] do
                edges.Add(struct (c, p))

        let paths = Array.zeroCreate<Path> edges.Count
        Parallel.For(0, edges.Count, fun k ->
            let struct (c, p) = edges[k]
            paths[k] <- makePath nodes[c] nodes[p])
        |> ignore

        let maxLane =
            if n = 0 then 0
            else nodes |> Array.maxBy (fun nd -> nd.Lane) |> fun nd -> nd.Lane

        { Nodes = nodes
          Paths = paths
          Edges = edges.ToArray()
          RowCount = n
          MaxLane = maxLane }

/// Điểm vào cấp cao: bố cục đồ thị hoàn chỉnh từ ảnh chụp đồ thị.
[<RequireQualifiedAccess>]
module Layout =

    /// Tính toán bố cục đồ thị (sắp xếp topo -> phân làn -> sinh hình học song song).
    let compute (snapshot: GraphSnapshot) : Geometry.Layout =
        let order = TopoSort.order snapshot
        let laneOf = Lanes.assign snapshot order
        Geometry.compute snapshot order laneOf
