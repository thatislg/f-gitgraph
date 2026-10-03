module CoreEngine.Tests.GraphTests

open Xunit
open NeoGitCore.Domain
open NeoGitCore.Storage
open NeoGitCore.Graph

// Kiểm thử tầng giải thuật đồ thị (Nhóm Việc 4): sắp xếp topo, phân làn thu gọn
// trái, và sinh hình học song song — bằng đồ thị tổng hợp không phụ thuộc Git CLI.

module private Graph =

    /// Dựng ảnh chụp đồ thị tổng hợp.
    /// commits: (hashHex40, parents(index), generation, commitTime).
    let snapshot (commits: (string * int list * uint32 * int64) array) : GraphSnapshot =
        let hashOf (s: string) = (GitHash.tryParse s).Value
        { Commits = commits |> Array.map (fun (h, _, _, _) -> hashOf h)
          Parents = commits |> Array.map (fun (_, p, _, _) -> List.toArray p)
          Generation = commits |> Array.map (fun (_, _, g, _) -> g)
          CommitTime = commits |> Array.map (fun (_, _, _, t) -> t) }

    /// Lấy chỉ số làn của từng commit theo thứ tự hiển thị (index -> (hash, lane)).
    let laneMap (s: GraphSnapshot) =
        let order = TopoSort.order s
        let laneOf = Lanes.assign s order
        order |> Array.map (fun c -> (GitHash.toString s.Commits[c], laneOf[c]))

let private h (n: int) = String.replicate 40 (string n).[0..0]

[<Fact>]
let ``topo sort puts child above parent`` () =
    // root <- child: child phải đứng trước root.
    let s = Graph.snapshot [| (h 1, [], 1u, 100L); (h 2, [ 0 ], 2u, 200L) |]
    let order = TopoSort.order s
    Assert.Equal<int>([| 1; 0 |], order)

[<Fact>]
let ``topo sort orders merge above both parents`` () =
    // root(0), a(1, parent 0), b(2, parent 0), merge(3, parents 1,2).
    let s =
        Graph.snapshot
            [| (h 1, [], 1u, 100L)
               (h 2, [ 0 ], 2u, 200L)
               (h 3, [ 0 ], 2u, 300L)
               (h 4, [ 1; 2 ], 3u, 400L) |]

    let order = TopoSort.order s
    // merge (3) đứng đầu, rồi hai cha, rồi root.
    Assert.Equal(3, order[0])
    Assert.Equal<int>([| 0 |], order[order.Length - 1 .. order.Length - 1])

[<Fact>]
let ``topo sort handles multi-root forest`` () =
    // Hai gốc độc lập, mỗi gốc có một con.
    let s =
        Graph.snapshot
            [| (h 1, [], 1u, 100L) // root A
               (h 2, [ 0 ], 2u, 200L) // con A
               (h 3, [], 1u, 150L) // root B (orphan)
               (h 4, [ 2 ], 3u, 250L) |] // con B

    let order = TopoSort.order s
    Assert.Equal(4, order.Length)
    // Mỗi commit con phải đứng trước cha của nó.
    let pos = order |> Array.mapi (fun i c -> (c, i)) |> dict
    Assert.True(pos[1] < pos[0]) // con A trước root A
    Assert.True(pos[3] < pos[2]) // con B trước root B

[<Fact>]
let ``topo sort tolerates unknown generation via commit time`` () =
    // Generation đều 0 (mô phỏng đường dẫn fallback): sắp xếp theo thời gian.
    let s =
        Graph.snapshot
            [| (h 1, [], 0u, 100L)
               (h 2, [ 0 ], 0u, 200L)
               (h 3, [ 0 ], 0u, 300L) |]

    let order = TopoSort.order s
    // Commit mới nhất (thời gian lớn nhất) đứng trước.
    Assert.Equal(2, order[0])
    Assert.Equal(0, order[order.Length - 1])

[<Fact>]
let ``lane allocation compacts merge to the left`` () =
    // root(0), a(1,parent0), b(2,parent0), merge(3, parents 1,2).
    let s =
        Graph.snapshot
            [| (h 1, [], 1u, 100L)
               (h 2, [ 0 ], 2u, 200L)
               (h 3, [ 0 ], 2u, 300L)
               (h 4, [ 1; 2 ], 3u, 400L) |]

    let lanes = Graph.laneMap s |> dict
    // merge ở làn 0, một nhánh kế thừa làn 0, nhánh còn lại làn 1, root về làn 0.
    Assert.Equal(0, lanes[h 4])
    Assert.Equal(0, lanes[h 2])
    Assert.Equal(1, lanes[h 3])
    Assert.Equal(0, lanes[h 1])

[<Fact>]
let ``lane allocation keeps linear history on single lane`` () =
    let s =
        Graph.snapshot
            [| (h 1, [], 1u, 100L)
               (h 2, [ 0 ], 2u, 200L)
               (h 3, [ 1 ], 3u, 300L)
               (h 4, [ 2 ], 4u, 400L) |]

    let lanes = Graph.laneMap s |> dict
    // Lịch sử tuyến tính: toàn bộ nằm trên làn 0.
    for (_, l) in Seq.ofArray (Graph.laneMap s) do
        Assert.Equal(0, l)

[<Fact>]
let ``geometry produces nodes and paths with stable colors`` () =
    let s =
        Graph.snapshot
            [| (h 1, [], 1u, 100L)
               (h 2, [ 0 ], 2u, 200L)
               (h 3, [ 0 ], 2u, 300L)
               (h 4, [ 1; 2 ], 3u, 400L) |]

    let layout = Layout.compute s
    Assert.Equal(4, layout.Nodes.Length)
    Assert.Equal(4, layout.RowCount)
    // 3 cạnh (a->root, b->root, merge->a, merge->b) = 4 đường nối.
    Assert.Equal(4, layout.Paths.Length)
    // Màu ổn định theo làn: làn 0 -> màu 0, làn 1 -> màu 1.
    let colors = layout.Nodes |> Array.map (fun nd -> nd.Color) |> Array.distinct
    Assert.Equal<int>([| 0; 1 |], Array.sort colors)
    // Merge commit được đánh dấu.
    let mergeNode = layout.Nodes |> Array.find (fun nd -> nd.IsMerge)
    Assert.True(mergeNode.IsMerge)
