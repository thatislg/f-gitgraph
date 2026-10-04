namespace NeoGitCore.Benchmark

// Khuôn đo đạc hiệu năng (Nhóm Việc 7): sinh đồ thị commit tổng hợp quy mô lớn
// và đo thời gian nạp + bố cục + vòng lặp IPC, cùng mức chiếm dụng RAM.
// Chạy qua: f-gitgraph-core.exe bench [--commits N]
// Tham khảo thiết kế:
// docs/02_design/001_windows/07_Benchmarking_And_Verification_Plan.md
//
// LƯU Ý AOT: không dùng printfn/sprintf có định dạng %f/%s kèm độ rộng vì F#
// sinh MakeGenericMethod qua phản chiếu (không tương thích Native AOT).
// Thay vào đó dùng Console.WriteLine + String.Format.

open System
open System.Diagnostics
open System.IO
open NeoGitCore.Domain
open NeoGitCore.Storage
open NeoGitCore.Graph
open NeoGitCore.Transport

[<RequireQualifiedAccess>]
module Synthetic =

    /// Sinh ảnh chụp đồ thị tổng hợp gồm N commit theo cấu trúc "hai đường ray":
    /// - Hai chuỗi nhánh A và B (commit chẵn thuộc A, lẻ thuộc B) tiến song song
    ///   từ một gốc chung, tạo ra làn phân kỳ thực sự (không phải cạnh thừa).
    /// - Mỗi 64 commit, một commit merge gộp tip hai đường, rồi fork lại.
    /// Đảm bảo MaxLane >= 1 để phủ đường dẫn phân làn + gộp nhánh khi đo.
    let snapshot (n: int) : GraphSnapshot =
        let commits = Array.zeroCreate<GitHash> n
        let parents = Array.zeroCreate<int[]> n
        let generation = Array.zeroCreate<uint32> n
        let commitTime = Array.zeroCreate<int64> n

        let mutable aTip = -1 // tip hiện tại của đường A
        let mutable bTip = -1 // tip hiện tại của đường B
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
                    // Merge commit: gộp tip hai đường, rồi hai đường chung một gốc.
                    let ps = [| aTip; bTip |]
                    aTip <- i
                    bTip <- i
                    mergePending <- false
                    ps
                elif i % 64 = 0 then
                    // Đánh dấu merge ở commit kế tiếp; commit này tiếp tục đường A.
                    aTip <- i
                    mergePending <- true
                    [| i - 1 |]
                elif i % 2 = 0 then
                    // Commit thuộc đường A: cha là tip A gần nhất.
                    let p = aTip
                    aTip <- i
                    [| p |]
                else
                    // Commit thuộc đường B: cha là tip B gần nhất.
                    let p = bTip
                    bTip <- i
                    [| p |]

        { Commits = commits
          Parents = parents
          Generation = generation
          CommitTime = commitTime }

[<RequireQualifiedAccess>]
module Bench =

    let private mb (bytes: int64) = float bytes / 1024.0 / 1024.0

    /// Đo thời gian thực thi một hành động, trả về (kết quả, số ms).
    let private measure (label: string) (f: unit -> 'a) : 'a * double =
        let sw = Stopwatch.StartNew()
        let result = f ()
        sw.Stop()
        Console.WriteLine(String.Format("  {0,-26} {1,10:F3} ms", label, sw.Elapsed.TotalMilliseconds))
        result, sw.Elapsed.TotalMilliseconds

    /// Đo riêng vòng khứ hồi IPC cho một truy vấn dải dòng (QueryRange -> RangeData)
    /// trên cửa sổ 100 dòng. Không bao gồm Init vì Init mã hóa toàn bộ danh sách commit
    /// (chi phí nạp kho một lần, không phải độ trễ cuộn trang).
    /// Đây là cận dưới thực tế của độ trễ Stdio RPC (chưa tính chi phí ống OS ~ µs).
    let private queryRoundtrip (state: Daemon.State) : double =
        let queryPayload =
            let w = MsgPack.Writer()
            MsgPack.writeMapHeader w 2
            MsgPack.writeString w "from"
            MsgPack.writeInt w 0L
            MsgPack.writeString w "to"
            MsgPack.writeInt w 99L
            w.ToArray()

        let n = state.Snapshot.Commits.Length
        let sw = Stopwatch.StartNew()

        // 1. Mã hóa khung QueryRange (phía TS).
        let _req = Frame.encode { Opcode = Opcode.QueryRange; Sequence = 1u; Payload = queryPayload }

        // 2. Giải mã yêu cầu (phía F#).
        let fromRow, toRow = Protocol.decodeQueryRange queryPayload
        let fromRow = max 0 fromRow
        let toRow = min (n - 1) toRow

        // 3. Cắt cửa sổ 100 dòng từ bố cục đã tính sẵn (phản chiếu nhánh QueryRange của daemon).
        let dy = float fromRow * Geometry.RowHeight
        let offsetNode (nd: Geometry.Node) = { nd with Y = nd.Y - dy }
        let nodes = [| for r in fromRow .. toRow -> offsetNode state.Layout.Nodes[state.Order[r]] |]
        let paths =
            state.Layout.Edges
            |> Array.mapi (fun k edge ->
                let struct (c, p) = edge
                if state.Row[c] <= toRow && state.Row[p] >= fromRow then
                    let path = state.Layout.Paths[k]
                    Some
                        { Protocol.D =
                            Geometry.renderPath
                                path.BendAtChildRow
                                (offsetNode state.Layout.Nodes[c])
                                (offsetNode state.Layout.Nodes[p])
                          Protocol.Color = path.Color }
                else
                    None)
            |> Array.choose id

        // 4. Mã hóa khung RangeData (phía F#).
        let payload = Protocol.encodeRangeData nodes paths
        let _resp = Frame.encode { Opcode = Opcode.RangeData; Sequence = 1u; Payload = payload }

        sw.Stop()
        sw.Elapsed.TotalMilliseconds

    /// Chạy toàn bộ khuôn đo đạc với N commit và in báo cáo.
    let run (n: int) =
        Console.WriteLine("======================================================")
        Console.WriteLine(" Benchmark: f-gitgraph-core (Native AOT)")
        Console.WriteLine(String.Format(" Commits    : {0}", n))
        Console.WriteLine("======================================================")

        // --- Dọn bộ nhớ để đo RAM nền chính xác ---
        GC.Collect()
        GC.WaitForPendingFinalizers()
        GC.Collect()
        let proc = Process.GetCurrentProcess()
        let baseWs = proc.WorkingSet64
        let baseGc = GC.GetTotalMemory(true)

        // --- Sinh đồ thị tổng hợp ---
        let snapshot = Synthetic.snapshot n

        // --- Các giai đoạn bố cục đồ thị ---
        let order, _ = measure "topo sort" (fun () -> TopoSort.order snapshot)
        let assign, _ = measure "lane allocation" (fun () -> Lanes.assignWithColor snapshot order)
        let layout, _ =
            measure "geometry (parallel)" (fun () -> Geometry.compute snapshot order assign.LaneOf assign.ColorOf)
        let _, _ = measure "layout (end-to-end)" (fun () -> Layout.compute snapshot)

        // --- RAM sau khi nạp + bố cục ---
        let afterWs = proc.WorkingSet64
        let afterGc = GC.GetTotalMemory(true)

        Console.WriteLine("------------------------------------------------------")
        Console.WriteLine(String.Format("  RAM process delta      {0,8:F2} MB", mb (afterWs - baseWs)))
        Console.WriteLine(String.Format("  RAM managed delta      {0,8:F2} MB", mb (afterGc - baseGc)))
        Console.WriteLine(String.Format("  Nodes                  {0}", layout.Nodes.Length))
        Console.WriteLine(String.Format("  Paths                  {0}", layout.Paths.Length))
        Console.WriteLine(String.Format("  Max lane               {0}", layout.MaxLane))
        Console.WriteLine(String.Format("  Row count              {0}", layout.RowCount))

        // --- Vòng khứ hồi IPC (cửa sổ 100 dòng) ---
        let state : Daemon.State =
            { RepoPath = "benchmark/repo"
              Branch = None
              Ordering = CommitOrdering.Topological
              Snapshot = snapshot
              Layout = layout
              Order = order
              Row =
                let row = Array.zeroCreate<int> snapshot.Commits.Length
                order |> Array.iteri (fun i c -> row[c] <- i)
                row
              Commits = order |> Array.map (fun c -> snapshot.Commits[c]) }

        let samples = Array.zeroCreate<double> 1000
        for i in 0 .. samples.Length - 1 do
            samples[i] <- queryRoundtrip state

        Array.sortInPlace samples
        let minIpc = samples[0]
        let maxIpc = samples[samples.Length - 1]
        let avgIpc = (samples |> Array.sum) / float samples.Length

        Console.WriteLine("------------------------------------------------------")
        Console.WriteLine("  IPC roundtrip (100 dòng)")
        Console.WriteLine(String.Format("    min                   {0,8:F3} ms", minIpc))
        Console.WriteLine(String.Format("    avg                   {0,8:F3} ms", avgIpc))
        Console.WriteLine(String.Format("    max                   {0,8:F3} ms", maxIpc))
        Console.WriteLine("======================================================")
