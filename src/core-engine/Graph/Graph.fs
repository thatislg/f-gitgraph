namespace NeoGitCore.Graph

// Tầng giải thuật đồ thị: sắp xếp Topo, phân bổ làn thu gọn trái (Lane Pool),
// tính toán song song đa luồng tọa độ hình học SVG.
// Tham khảo thiết kế:
// docs/02_design/001_windows/04_Parallel_DAG_Layout_Solver.md
// docs/02_design/001_windows/12_Graph_Rendering_And_Webview_Fix_Design.md

open System
open System.Collections.Generic
open System.Threading.Tasks
open NeoGitCore.Domain
open NeoGitCore.Storage

/// Số màu sắc trong bảng màu nhánh (chuẩn giao diện GitLens).
[<RequireQualifiedAccess>]
module BranchColor =

    [<Literal>]
    let PaletteSize = 8

/// Chiến lược sắp xếp thứ tự commit hiển thị.
[<RequireQualifiedAccess>]
type CommitOrdering =
    /// Sắp xếp topology (mặc định): ưu tiên thế hệ rồi đến commit time.
    | Topological
    /// Sắp xếp theo thời gian commit (date-order): ưu tiên commit time muộn hơn.
    | Date

    /// Chuyển chuỗi giao thức (RPC) sang kiểu liệt kê; mặc định Topological.
    static member ofString (value: string) : CommitOrdering =
        if value.ToLowerInvariant() = "date" then Date else Topological

// --- Nhiệm vụ 4.1: Sắp Xếp Topo ---

[<RequireQualifiedAccess>]
module TopoSort =

    /// Bộ so sánh ưu tiên dạng max-heap cho từng chiến lược sắp xếp commit.
    let private comparerFor (ordering: CommitOrdering) =
        match ordering with
        | CommitOrdering.Date ->
            // Date-order: ưu tiên commit time muộn hơn trước (vẫn giữ ràng buộc topo).
            Comparer.Create(fun (_: uint32, t1: int64) (_: uint32, t2: int64) -> compare t2 t1)
        | CommitOrdering.Topological ->
            // Topo-order: ưu tiên thế hệ cao hơn trước, rồi đến thời gian tạo muộn hơn.
            Comparer.Create(fun (g1: uint32, t1: int64) (g2: uint32, t2: int64) ->
                let c = compare g2 g1
                if c <> 0 then c else compare t2 t1)

    /// Sắp xếp topo dùng thuật toán Kahn cải tiến + hàng đợi ưu tiên theo chiến lược.
    /// Trả về mảng chỉ số (index vào Commits) theo thứ tự hiển thị: commit con
    /// (mới hơn) luôn đứng trước commit cha (cũ hơn).
    ///
    /// Xử lý đầy đủ các trường hợp đặc biệt:
    /// - Bản sao nông (shallow): cha bị thiếu đã được tầng Storage lược bỏ.
    /// - Nhánh mồ côi / kho đa gốc: nhiều nút không có con (tip) được xử lý song song.
    /// - Octopus merge: chỉ cần quan hệ cha-con, không phụ thuộc số lượng cha.
    let orderWith (ordering: CommitOrdering) (snapshot: GraphSnapshot) : int[] =
        let n = snapshot.Commits.Length

        // indegree[i] = số lượng commit con đang trỏ tới commit i (chưa được đặt).
        // Nút có indegree = 0 là "tip" (commit mới nhất của mỗi nhánh).
        let indegree = Array.zeroCreate<int> n
        for i in 0 .. n - 1 do
            for p in snapshot.Parents[i] do
                indegree[p] <- indegree[p] + 1

        let queue = PriorityQueue<int, uint32 * int64>(comparerFor ordering)
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

    /// Sắp xếp topo mặc định (Topological) — giữ tương thích các chỗ gọi hiện hữu.
    let order (snapshot: GraphSnapshot) : int[] = orderWith CommitOrdering.Topological snapshot

// --- Nhiệm vụ 4.2 + 12.3: Phân Bổ Làn Thu Gọn Trái & Kế Thừa Màu Nhánh ---

[<RequireQualifiedAccess>]
module Lanes =

    /// Kết quả phân bổ làn: chỉ số làn và chỉ số màu của từng commit (theo index).
    type Assignment = {
        /// Chỉ số làn của từng commit theo index.
        LaneOf: int[]
        /// Chỉ số màu nhánh (0..PaletteSize-1) của từng commit theo index.
        ColorOf: int[]
    }

    /// Phân bổ làn thu gọn trái kèm kế thừa màu theo dòng dõi nhánh (First-parent chain).
    ///
    /// Nguyên tắc làn:
    /// 1. Kế thừa làn: commit là cha mà một làn đang chờ sẽ đặt ngay trên làn đó.
    /// 2. Thu gọn trái: nhánh mới tái sử dụng làn trống đầu tiên bên trái;
    ///    chỉ cấp làn mới ở mép phải khi toàn bộ làn bên trái đều bận.
    /// 3. Đóng làn: commit gốc (không cha) giải phóng làn để nhánh dưới tái sử dụng.
    ///
    /// Nguyên tắc màu (khắc phục BUG-01):
    /// - Mỗi dòng dõi nhánh (chuỗi commit theo cha thứ nhất) được cấp một màu cố định
    ///   từ lúc rẽ nhánh tới lúc sáp nhập hoặc chạm gốc.
    /// - Khi cấp làn mới cho nhánh phụ, chọn màu có khoảng cách lớn nhất trong bảng
    ///   màu so với màu của hai làn lân cận (lane - 1, lane + 1) để chống trùng màu.
    let private compute (snapshot: GraphSnapshot) (order: int[]) : Assignment =
        let n = snapshot.Commits.Length
        // active[l] = commit cha mà làn l đang chờ (hoặc -1 nếu làn trống).
        let active = ResizeArray<int>()
        // laneColor[l] = màu nhánh đang chạy trên làn l (hoặc -1 nếu làn trống).
        let laneColor = ResizeArray<int>()
        let laneOf = Array.zeroCreate<int> n
        let colorOf = Array.zeroCreate<int> n
        // Con trỏ xoay vòng bảng màu (round-robin) cho các nhánh mới (BUG-COLOR-01):
        // bảo đảm mỗi nhánh con tách ra nhận một màu khác nhau, khai thác đều cả 8
        // màu thay vì dồn về một màu duy nhất như thuật toán "khoảng cách lớn nhất".
        let mutable colorCursor = 0

        let firstEmpty () =
            let mutable found = -1
            let mutable i = 0
            while i < active.Count && found < 0 do
                if active[i] = -1 then found <- i
                i <- i + 1
            found

        // Chọn màu cho một làn mới (khắc phục BUG-COLOR-01): xoay vòng bảng màu
        // round-robin và tránh toàn bộ màu đang được các làn song song sử dụng.
        // Điều này bảo đảm bất biến: tại mọi thời điểm, các làn đang hoạt động
        // luôn mang các màu phân biệt, không bao giờ có hai làn kề trùng màu.
        let pickColor () =
            let used = HashSet<int>()
            for i in 0 .. laneColor.Count - 1 do
                if laneColor[i] >= 0 then
                    used.Add laneColor[i] |> ignore

            let mutable c = colorCursor
            let mutable attempts = 0
            while attempts < BranchColor.PaletteSize && used.Contains c do
                c <- (c + 1) % BranchColor.PaletteSize
                attempts <- attempts + 1

            colorCursor <- (c + 1) % BranchColor.PaletteSize
            c

        for c in order do
            // Tập hợp các làn đang chờ commit c.
            let waiting = ResizeArray<int>()
            for i in 0 .. active.Count - 1 do
                if active[i] = c then waiting.Add i

            let lane =
                if waiting.Count > 0 then
                    // Kế thừa làn trái nhất; các làn còn lại nhập vào c -> giải phóng.
                    let inheritLane = waiting[0]
                    for i in 1 .. waiting.Count - 1 do
                        active[waiting[i]] <- -1
                        laneColor[waiting[i]] <- -1
                    inheritLane
                else
                    let empty = firstEmpty ()
                    if empty >= 0 then
                        empty
                    else
                        let newLane = active.Count
                        active.Add(-1)
                        laneColor.Add(-1)
                        newLane

            laneOf[c] <- lane

            if waiting.Count > 0 then
                // Tiếp nối dòng dõi có sẵn: kế thừa màu nhánh của làn.
                colorOf[c] <- laneColor[lane]
            else
                // Nhánh mới xuất hiện: cấp màu mới tránh trùng mọi làn đang hoạt động.
                let col = pickColor ()
                laneColor[lane] <- col
                colorOf[c] <- col

            if snapshot.Parents[c].Length = 0 then
                // Commit gốc: giải phóng làn.
                active[lane] <- -1
                laneColor[lane] <- -1
            else
                // Cha thứ nhất kế thừa làn và màu của c.
                active[lane] <- snapshot.Parents[c][0]
                // Các cha còn lại (merge/octopus) bắt đầu nhánh phụ mới:
                // cấp làn trống/làn mới và màu mới tránh trùng làn kề.
                for pi in 1 .. snapshot.Parents[c].Length - 1 do
                    let p = snapshot.Parents[c][pi]
                    let empty = firstEmpty ()
                    if empty >= 0 then
                        active[empty] <- p
                        laneColor[empty] <- pickColor ()
                    else
                        active.Add p
                        laneColor.Add(pickColor ())

        { LaneOf = laneOf; ColorOf = colorOf }

    /// Chỉ số làn của từng commit (theo index), không kèm màu.
    let assign (snapshot: GraphSnapshot) (order: int[]) : int[] =
        (compute snapshot order).LaneOf

    /// Chỉ số làn và màu nhánh của từng commit (theo index).
    let assignWithColor (snapshot: GraphSnapshot) (order: int[]) : Assignment =
        compute snapshot order

// --- Nhiệm vụ 4.3 + 12.2/12.3/12.5: Tính Toán Song Song Tọa Độ Hình Học SVG ---

[<RequireQualifiedAccess>]
module Geometry =

    /// Số màu sắc trong bảng màu nhánh (chuẩn giao diện GitLens).
    [<Literal>]
    let PaletteSize = BranchColor.PaletteSize

    /// Khoảng cách ngang giữa hai làn (pixel).
    let LaneWidth = 20.0
    /// Khoảng cách dọc giữa hai dòng commit (pixel).
    let RowHeight = 24.0
    /// Bán kính nút commit (pixel).
    let NodeRadius = 6.0
    /// Khoảng đệm mép đồ thị (pixel).
    let Margin = 16.0

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

    /// Thông tin hình học một đường nối nhánh (dạng cấu trúc, chưa mã hóa chuỗi SVG).
    type Path = {
        /// Chỉ số commit con (đầu trên của đường nối).
        Child: int
        /// Chỉ số commit cha (đầu dưới của đường nối).
        Parent: int
        /// Chỉ số màu nét vẽ.
        Color: int
        /// Độ dày nét vẽ.
        Width: float
        /// Cờ chọn chỗ ngoặt cho đường vuông góc: `true` ngoặt tại hàng của con
        /// (merge-in), `false` ngoặt tại hàng của cha (fork).
        BendAtChildRow: bool
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
    // Tâm dọc = nửa chiều cao hàng (để nút đồng tâm với dòng commit).
    let private centerY (row: int) = RowHeight / 2.0 + float row * RowHeight

    let private makeNode (isMerge: bool) (isRoot: bool) (lane: int) (color: int) (row: int) : Node =
        { X = centerX lane
          Y = centerY row
          Radius = NodeRadius
          Lane = lane
          Color = color
          IsMerge = isMerge
          IsRoot = isRoot }

    // Định dạng tọa độ SVG không dùng sprintf (%g) vì F# sinh MakeGenericMethod
    // qua phản chiếu, không tương thích Native AOT. Dùng ToString invariant thay thế.
    let private fmt (x: float) = x.ToString(System.Globalization.CultureInfo.InvariantCulture)

    /// Bán kính bo góc cho đường nối vuông góc (px), chuẩn giao diện GitLens.
    let private CornerRadius = 6.0

    /// Sinh chuỗi lệnh vẽ SVG `d` cho đường nối giữa hai nút (đã đặt tọa độ).
    /// Cùng làn: đường thẳng đứng; khác làn: đường vuông góc bo tròn (orthogonal
    /// rounded routing) như GitLens thay vì đường xiên/Bezier.
    let renderPath (bendAtChildRow: bool) (child: Node) (parent: Node) : string =
        let x1 = child.X
        let y0 = child.Y + NodeRadius
        let x2 = parent.X
        let y1 = parent.Y - NodeRadius
        if x1 = x2 then
            "M " + fmt x1 + " " + fmt y0 + " V " + fmt y1
        else
            let dir = if x2 > x1 then 1.0 else -1.0
            let r = min CornerRadius (min (abs (x2 - x1)) ((y1 - y0) / 2.0))
            if bendAtChildRow then
                // Ngoặt tại hàng của con: đi ngang trước, rồi xuống thẳng theo lane cha.
                "M " + fmt x1 + " " + fmt y0
                + " H " + fmt (x2 - dir * r)
                + " Q " + fmt x2 + " " + fmt y0 + ", " + fmt x2 + " " + fmt (y0 + r)
                + " V " + fmt y1
            else
                // Ngoặt tại hàng của cha: xuống thẳng theo lane con, rồi rẽ ngang vào cha.
                "M " + fmt x1 + " " + fmt y0
                + " V " + fmt (y1 - r)
                + " Q " + fmt x1 + " " + fmt y1 + ", " + fmt (x1 + dir * r) + " " + fmt y1
                + " H " + fmt x2

    /// Tính toán toàn bộ hình học: nút và đường nối, phân khối song song đa luồng.
    let compute (snapshot: GraphSnapshot) (order: int[]) (laneOf: int[]) (colorOf: int[]) : Layout =
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
                    colorOf[c]
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
            let child = nodes[c]
            let parent = nodes[p]
            // Quy tắc gán màu đường nối (khắc phục BUG-01):
            // - Đường thẳng đứng (cùng làn): màu của làn (màu con = màu cha).
            // - Đường sáp nhập (merge-in): con là merge và cha là cha phụ -> màu nhánh phụ (cha).
            // - Đường rẽ nhánh (fork): còn lại -> màu nhánh con mới tạo.
            let isMergeChild = snapshot.Parents[c].Length >= 2
            // Chỗ ngoặt (orthogonal routing): cạnh merge sang cha phụ ngoặt tại hàng
            // của con; cạnh tách nhánh (fork) ngoặt tại hàng của cha.
            let bendAtChildRow = child.Lane <> parent.Lane && isMergeChild
            let color =
                if child.Lane <> parent.Lane && isMergeChild then parent.Color
                else child.Color

            paths[k] <-
                { Child = c
                  Parent = p
                  Color = color
                  Width = 1.5
                  BendAtChildRow = bendAtChildRow })
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

    /// Tính toán bố cục đồ thị theo chiến lược sắp xếp (topo -> phân làn -> hình học).
    let computeWith (ordering: CommitOrdering) (snapshot: GraphSnapshot) : Geometry.Layout =
        let order = TopoSort.orderWith ordering snapshot
        let assign = Lanes.assignWithColor snapshot order
        Geometry.compute snapshot order assign.LaneOf assign.ColorOf

    /// Tính toán bố cục đồ thị mặc định (Topological) — giữ tương thích các chỗ gọi.
    let compute (snapshot: GraphSnapshot) : Geometry.Layout =
        computeWith CommitOrdering.Topological snapshot
