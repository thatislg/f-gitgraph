module Program

open System
open NeoGitCore.Domain
open NeoGitCore.Transport
open NeoGitCore.Benchmark

[<EntryPoint>]
let main argv =
    match argv with
    | [| "--version" |]
    | [| "-v" |] ->
        // Trả về mã định danh phiên bản phục vụ kiểm định trên môi trường sạch.
        Console.WriteLine(Version.Name + " " + Version.Current)
        0
    | [| "--ready" |]
    | [| "ping" |] ->
        // Phản hồi tức thời dùng để đo lường cold-start latency (mục tiêu < 5ms).
        Console.WriteLine("ready")
        0
    | [| "bench" |] ->
        // Đo đạc hiệu năng (Nhóm Việc 7) với 50.000 commit mặc định.
        Bench.run 50000
        0
    | [| "bench"; "--commits"; n |] ->
        // Đo đạc hiệu năng với số commit tùy chỉnh.
        match Int32.TryParse n with
        | true, count ->
            Bench.run count
            0
        | false, _ ->
            Console.Error.WriteLine("Số commit không hợp lệ: " + n)
            2
    | [| "serve" |]
    | [| "--serve" |]
    | [||] ->
        // Vòng lặp daemon sidecar: lắng nghe khung gói tin Stdio RPC trên stdin/stdout.
        Daemon.run (Console.OpenStandardInput()) (Console.OpenStandardOutput())
        0
    | _ ->
        Console.WriteLine(Version.Name + " " + Version.Current + " ready")
        0
