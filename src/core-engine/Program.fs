module Program

open System
open NeoGitCore.Domain

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
    | _ ->
        // Vòng lặp lắng nghe yêu cầu qua Stdio RPC sẽ được bổ sung ở Nhóm Việc 5.
        Console.WriteLine(Version.Name + " " + Version.Current + " ready")
        0
