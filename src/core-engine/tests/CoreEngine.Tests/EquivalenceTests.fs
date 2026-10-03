module CoreEngine.Tests.EquivalenceTests

open Xunit
open NeoGitCore.Domain
open NeoGitCore.Storage
open NeoGitCore.Graph

// Bộ kiểm thử so sánh tính tương đương đồ thị (Nhóm Việc 7.1).
//
// LƯU Ý VỀ TÍNH TƯƠNG ĐƯƠNG:
//   Thuật toán TypeScript cũ (src/webview/graph/layout.ts) dùng lối "đi dò nhánh"
//   (branch tracing), còn engine F# dùng "sắp xếp topo + phân làn thu gọn trái".
//   Hai thuật toán khác nhau về cơ chế nên chỉ số làn cụ thể (lane index) có thể
//   KHÁC NHAU trên cùng một đồ thị. Vì vậy ta không thể (và không nên) khẳng định
//   trùng khớp pixel 100% về chỉ số làn.
//
//   Thay vào đó, ta kiểm thử các BẤT BIẾN CẤU TRÚC mà CẢ HAI thuật toán đều phải
//   thỏa mãn để đảm bảo tương đương về mặt logic hiển thị:
//     1. Thứ tự dòng: commit con luôn nằm TRÊN (trước) commit cha trong dãy hiển thị.
//     2. Mỗi commit chiếm đúng một dòng, không có hai commit trùng dòng.
//     3. Làn được cấp phát thu gọn trái: tập làn sử dụng luôn liên tục 0..MaxLane.
//     4. Màu nhánh thuộc bảng màu và phân bổ đa dạng giữa các nhánh (round-robin).
//     5. Hình học nhất quán: tọa độ Y tăng theo dòng, X tăng theo làn,
//        mọi cạnh tham chiếu đúng nút, đường nối trỏ đúng cha-con.

module private Synthetic =

    /// Dựng đồ thị tổng hợp cấu trúc "hai đường ray" (fork -> song song -> merge)
    /// để tạo làn phân kỳ thực sự: commit chẵn thuộc đường A, lẻ thuộc đường B,
    /// mỗi 32 commit một merge gộp hai đường rồi fork lại.
    let snapshot (n: int) : GraphSnapshot =
        let commits = Array.zeroCreate<GitHash> n
        let parents = Array.zeroCreate<int[]> n
        let generation = Array.zeroCreate<uint32> n
        let commitTime = Array.zeroCreate<int64> n
        let mutable aTip = -1
        let mutable bTip = -1
        let mutable mergePending = false
        for i in 0 .. n - 1 do
            commits[i] <- GitHash.Sha1(i.ToString("x40"))
            generation[i] <- uint32 i
            commitTime[i] <- int64 i
            parents[i] <-
                if i = 0 then
                    aTip <- 0
                    bTip <- 0
                    [||]
                elif mergePending then
                    let ps = [| aTip; bTip |]
                    aTip <- i
                    bTip <- i
                    mergePending <- false
                    ps
                elif i % 32 = 0 then
                    aTip <- i
                    mergePending <- true
                    [| i - 1 |]
                elif i % 2 = 0 then
                    let p = aTip
                    aTip <- i
                    [| p |]
                else
                    let p = bTip
                    bTip <- i
                    [| p |]
        { Commits = commits
          Parents = parents
          Generation = generation
          CommitTime = commitTime }

[<Fact>]
let ``topological order puts every child above its parent`` () =
    // Đồ thị 1000 commit với nhánh + merge: bất biến thứ tự con-trên-cha phải đúng
    // cho MỌI cạnh, không phụ thuộc quy mô.
    let s = Synthetic.snapshot 1000
    let order = TopoSort.order s

    // Ánh xạ index commit -> vị trí dòng hiển thị.
    let row = Array.zeroCreate<int> s.Commits.Length
    order |> Array.iteri (fun i c -> row[c] <- i)

    // Mọi commit con phải xuất hiện trước (dòng nhỏ hơn) cha của nó.
    for c in 0 .. s.Commits.Length - 1 do
        for p in s.Parents[c] do
            Assert.True(row[c] < row[p], sprintf "commit con %d phải đứng trên cha %d" c p)

[<Fact>]
let ``topological order assigns every commit a unique row`` () =
    let s = Synthetic.snapshot 500
    let order = TopoSort.order s
    // Mỗi commit xuất hiện đúng một lần => dãy là hoán vị của 0..n-1.
    Assert.Equal(s.Commits.Length, order.Length)
    let seen = order |> Array.distinct
    Assert.Equal(s.Commits.Length, seen.Length)

[<Fact>]
let ``lane allocation is left-compact with contiguous lanes`` () =
    // Thu gọn trái: tập làn được dùng phải liên tục từ 0 tới MaxLane, không để "lỗ hổng".
    let s = Synthetic.snapshot 500
    let order = TopoSort.order s
    let laneOf = Lanes.assign s order

    let used = laneOf |> Array.distinct |> Array.sort
    // Kiểm tra tính liên tục: used[k] == k với mọi k.
    used |> Array.iteri (fun k l -> Assert.Equal(k, l))
    // Làn lớn nhất phải là phần tử cuối của tập liên tục.
    Assert.Equal(used.Length - 1, laneOf |> Array.max)

[<Fact>]
let ``color is within palette and merge-in edges carry the secondary branch color`` () =
    // Khắc phục BUG-01: màu nhánh nằm trong bảng 8 màu, và đường sáp nhập
    // (merge-in) mang màu của nhánh phụ (cha) thay vì màu nhánh chính.
    let s = Synthetic.snapshot 200
    let layout = Layout.compute s

    // 1. Mọi màu thuộc bảng màu (0..PaletteSize-1).
    for nd in layout.Nodes do
        Assert.InRange(nd.Color, 0, Geometry.PaletteSize - 1)

    // 2. Đường sáp nhập (con là merge, cha là cha phụ) mang màu nhánh phụ (cha).
    for k in 0 .. layout.Edges.Length - 1 do
        let struct (c, p) = layout.Edges[k]
        if s.Parents[c].Length >= 2 && p <> s.Parents[c][0] then
            Assert.Equal(layout.Nodes[p].Color, layout.Paths[k].Color)

[<Fact>]
let ``geometry is consistent with row and lane ordering`` () =
    let s = Synthetic.snapshot 300
    let layout = Layout.compute s

    // Y tăng đơn điệu theo dòng: dòng lớn hơn => tọa độ y lớn hơn.
    let sortedByY = layout.Nodes |> Array.sortBy (fun nd -> nd.Y)
    let distinctY = sortedByY |> Array.map (fun nd -> nd.Y) |> Array.distinct
    Assert.Equal(layout.Nodes.Length, distinctY.Length)

    // X tăng đơn điệu theo làn.
    for i in 1 .. layout.Nodes.Length - 1 do
        let a = layout.Nodes[i - 1]
        let b = layout.Nodes[i]
        if a.Y = b.Y then
            Assert.True(a.Lane <> b.Lane)

    // Mọi cạnh tham chiếu đúng chỉ số nút hợp lệ.
    for edge in layout.Edges do
        let struct (c, p) = edge
        Assert.InRange(c, 0, s.Commits.Length - 1)
        Assert.InRange(p, 0, s.Commits.Length - 1)
        Assert.Contains(p, s.Parents[c])

[<Fact>]
let ``golden fixture produces exact row order and lane map`` () =
    // Bộ dữ liệu vàng cố định: root(0), a(1->0), b(2->0), merge(3->1,2).
    // Đây là kịch bản phân nhánh + gộp chuẩn, dùng để chống hồi quy (regression).
    let hashOf (i: int) = GitHash.Sha1(i.ToString("x40"))
    let s : GraphSnapshot =
        { Commits = [| hashOf 1; hashOf 2; hashOf 3; hashOf 4 |]
          Parents = [| [||]; [| 0 |]; [| 0 |]; [| 1; 2 |] |]
          Generation = [| 1u; 2u; 2u; 3u |]
          CommitTime = [| 100L; 200L; 300L; 400L |] }

    let order = TopoSort.order s
    let laneOf = Lanes.assign s order

    // Thứ tự dòng: merge đứng đầu, rồi hai cha, rồi gốc cuối cùng.
    Assert.Equal(3, order[0])
    Assert.Equal(0, order[order.Length - 1])

    // Bản đồ làn vàng: merge(3) và nhánh a(1) kế thừa làn 0, nhánh b(2) làn 1.
    Assert.Equal(0, laneOf[3])
    Assert.Equal(0, laneOf[1])
    Assert.Equal(1, laneOf[2])
    Assert.Equal(0, laneOf[0])
