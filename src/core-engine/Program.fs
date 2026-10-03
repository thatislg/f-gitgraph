module Program

open System
open NeoGitCore.Domain
open NeoGitCore.Transport

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
    | [| "serve" |]
    | [| "--serve" |]
    | [||] ->
        // Vòng lặp daemon sidecar: lắng nghe khung gói tin Stdio RPC trên stdin/stdout.
        Daemon.run (Console.OpenStandardInput()) (Console.OpenStandardOutput())
        0
    | _ ->
        Console.WriteLine(Version.Name + " " + Version.Current + " ready")
        0
