module CoreEngine.Tests.TransportTests

open System.IO
open Xunit
open NeoGitCore.Domain
open NeoGitCore.Storage
open NeoGitCore.Graph
open NeoGitCore.Transport

// Kiểm thử tầng giao tiếp vận chuyển (Nhóm Việc 5): mã hóa MessagePack, khung gói
// tin Stdio RPC, lược đồ thông điệp và vòng lặp daemon — không phụ thuộc Git CLI.

let private hash (c: string) = (GitHash.tryParse (String.replicate 40 c)).Value

// --- MessagePack ---

[<Fact>]
let ``msgpack encodes positive fixint`` () =
    let w = MsgPack.Writer()
    MsgPack.writeInt w 42L
    Assert.Equal<byte[]>([| 0x2auy |], w.ToArray())

[<Fact>]
let ``msgpack encodes negative fixint`` () =
    let w = MsgPack.Writer()
    MsgPack.writeInt w -1L
    Assert.Equal<byte[]>([| 0xffuy |], w.ToArray())

[<Fact>]
let ``msgpack encodes uint16 and uint32`` () =
    let w = MsgPack.Writer()
    MsgPack.writeInt w 1000L
    Assert.Equal<byte[]>([| 0xcduy; 0x03uy; 0xe8uy |], w.ToArray())

    let w2 = MsgPack.Writer()
    MsgPack.writeInt w2 100000L
    Assert.Equal<byte[]>([| 0xceuy; 0x00uy; 0x01uy; 0x86uy; 0xa0uy |], w2.ToArray())

[<Fact>]
let ``msgpack encodes fixstr`` () =
    let w = MsgPack.Writer()
    MsgPack.writeString w "ready"
    let expected = [| 0xa5uy; 0x72uy; 0x65uy; 0x61uy; 0x64uy; 0x79uy |]
    Assert.Equal<byte[]>(expected, w.ToArray())

[<Fact>]
let ``msgpack encodes bool and nil`` () =
    let w1 = MsgPack.Writer()
    MsgPack.writeBool w1 true
    Assert.Equal<byte[]>([| 0xc3uy |], w1.ToArray())

    let w2 = MsgPack.Writer()
    MsgPack.writeNil w2
    Assert.Equal<byte[]>([| 0xc0uy |], w2.ToArray())

[<Fact>]
let ``msgpack encodes float64`` () =
    let w = MsgPack.Writer()
    MsgPack.writeFloat64 w 1.5
    let expected = [| 0xcBuy; 0x3fuy; 0xf8uy; 0x00uy; 0x00uy; 0x00uy; 0x00uy; 0x00uy; 0x00uy |]
    Assert.Equal<byte[]>(expected, w.ToArray())

[<Fact>]
let ``msgpack round-trips int string bool`` () =
    let w = MsgPack.Writer()
    MsgPack.writeInt w 123456L
    MsgPack.writeString w "tiếng Việt 🚀"
    MsgPack.writeBool w false
    let r = MsgPack.Reader(w.ToArray())
    Assert.Equal(123456L, MsgPack.readInt r)
    Assert.Equal("tiếng Việt 🚀", MsgPack.readString r)
    Assert.False(MsgPack.readBool r)

[<Fact>]
let ``msgpack round-trips array header and float`` () =
    let w = MsgPack.Writer()
    MsgPack.writeArrayHeader w 20
    MsgPack.writeFloat64 w -2.5
    let r = MsgPack.Reader(w.ToArray())
    Assert.Equal(20, MsgPack.readArrayHeader r)
    Assert.Equal(-2.5, MsgPack.readFloat64 r)

// --- Khung gói tin (Framing) ---

[<Fact>]
let ``frame encodes ping with empty payload`` () =
    let f = { Opcode = Opcode.HeartbeatPing; Sequence = 1u; Payload = [||] }
    // length = 5 (LE), opcode 0x06, seq 1 (LE).
    let expected = [| 0x05uy; 0x00uy; 0x00uy; 0x00uy; 0x06uy; 0x01uy; 0x00uy; 0x00uy; 0x00uy |]
    Assert.Equal<byte[]>(expected, Frame.encode f)

[<Fact>]
let ``frame round-trips through stream`` () =
    let f = { Opcode = Opcode.RangeData; Sequence = 42u; Payload = [| 1uy; 2uy; 3uy |] }
    use ms = new MemoryStream(Frame.encode f)
    match Frame.read ms with
    | Some g ->
        Assert.Equal(f.Opcode, g.Opcode)
        Assert.Equal(f.Sequence, g.Sequence)
        Assert.Equal<byte[]>(f.Payload, g.Payload)
    | None -> failwith "phải đọc được khung gói tin"

[<Fact>]
let ``frame read returns None at EOF`` () =
    use ms = new MemoryStream([||])
    Assert.True((Frame.read ms).IsNone)

// --- Lược đồ thông điệp ---

[<Fact>]
let ``protocol decodes init request`` () =
    let w = MsgPack.Writer()
    MsgPack.writeMapHeader w 1
    MsgPack.writeString w "repoPath"
    MsgPack.writeString w "some/repo"
    Assert.Equal("some/repo", Protocol.decodeInitRequest (w.ToArray()))

[<Fact>]
let ``protocol decodes query range`` () =
    let w = MsgPack.Writer()
    MsgPack.writeMapHeader w 2
    MsgPack.writeString w "from"
    MsgPack.writeInt w 100L
    MsgPack.writeString w "to"
    MsgPack.writeInt w 300L
    let fromRow, toRow = Protocol.decodeQueryRange (w.ToArray())
    Assert.Equal(100, fromRow)
    Assert.Equal(300, toRow)

// --- Vòng lặp daemon ---

let private makeState (snapshot: GraphSnapshot) : Daemon.State =
    let layout = Layout.compute snapshot
    let order = TopoSort.order snapshot
    let row = Array.zeroCreate<int> snapshot.Commits.Length
    order |> Array.iteri (fun i c -> row[c] <- i)
    let commits = order |> Array.map (fun c -> snapshot.Commits[c])
    { RepoPath = "some/repo"
      Snapshot = snapshot
      Layout = layout
      Order = order
      Row = row
      Commits = commits }

let private runDaemon (loader: string -> Result<Daemon.State, GitError>) (frames: Frame[]) : Frame[] =
    use input = new MemoryStream()
    for f in frames do
        let b = Frame.encode f
        input.Write(b, 0, b.Length)
    input.Position <- 0L

    use output = new MemoryStream()
    Daemon.runWith loader input output
    output.Position <- 0L

    let responses = ResizeArray<Frame>()
    let mutable continueLoop = true
    while continueLoop do
        match Frame.read output with
        | Some f -> responses.Add f
        | None -> continueLoop <- false
    responses.ToArray()

[<Fact>]
let ``daemon serves ready init query and heartbeat`` () =
    // Lịch sử tuyến tính 3 commit: root <- child <- grandchild.
    let snapshot : GraphSnapshot =
        { Commits = [| hash "1"; hash "2"; hash "3" |]
          Parents = [| [||]; [| 0 |]; [| 1 |] |]
          Generation = [| 1u; 2u; 3u |]
          CommitTime = [| 100L; 200L; 300L |] }

    let state = makeState snapshot
    let loader (_path: string) = Ok state

    let initPayload =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 1
        MsgPack.writeString w "repoPath"
        MsgPack.writeString w "some/repo"
        w.ToArray()

    let queryPayload =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 2
        MsgPack.writeString w "from"
        MsgPack.writeInt w 0L
        MsgPack.writeString w "to"
        MsgPack.writeInt w 2L
        w.ToArray()

    let frames =
        [| { Opcode = Opcode.InitializeRepo; Sequence = 1u; Payload = initPayload }
           { Opcode = Opcode.QueryRange; Sequence = 2u; Payload = queryPayload }
           { Opcode = Opcode.HeartbeatPing; Sequence = 3u; Payload = [||] } |]

    let responses = runDaemon loader frames

    Assert.Equal(4, responses.Length)
    Assert.Equal(Opcode.Ready, responses[0].Opcode)
    Assert.Equal(Opcode.InitSuccess, responses[1].Opcode)
    Assert.Equal(Opcode.RangeData, responses[2].Opcode)
    Assert.Equal(Opcode.HeartbeatPong, responses[3].Opcode)

[<Fact>]
let ``daemon reports error for query before init`` () =
    let loader (_path: string) = failwith "không nên được gọi"
    let queryPayload =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 2
        MsgPack.writeString w "from"
        MsgPack.writeInt w 0L
        MsgPack.writeString w "to"
        MsgPack.writeInt w 10L
        w.ToArray()

    let responses =
        runDaemon loader [| { Opcode = Opcode.QueryRange; Sequence = 1u; Payload = queryPayload } |]

    Assert.Equal(2, responses.Length)
    Assert.Equal(Opcode.Ready, responses[0].Opcode)
    Assert.Equal(Opcode.Error, responses[1].Opcode)

[<Fact>]
let ``daemon range data contains expected node and path counts`` () =
    // Merge: root(0), a(1->0), b(2->0), merge(3->1,2).
    let snapshot : GraphSnapshot =
        { Commits = [| hash "1"; hash "2"; hash "3"; hash "4" |]
          Parents = [| [||]; [| 0 |]; [| 0 |]; [| 1; 2 |] |]
          Generation = [| 1u; 2u; 2u; 3u |]
          CommitTime = [| 100L; 200L; 300L; 400L |] }

    let loader (_path: string) = Ok(makeState snapshot)

    let queryPayload =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 2
        MsgPack.writeString w "from"
        MsgPack.writeInt w 0L
        MsgPack.writeString w "to"
        MsgPack.writeInt w 3L
        w.ToArray()

    let initPayload =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 1
        MsgPack.writeString w "repoPath"
        MsgPack.writeString w "some/repo"
        w.ToArray()

    let responses =
        runDaemon
            loader
            [| { Opcode = Opcode.InitializeRepo; Sequence = 0u; Payload = initPayload }
               { Opcode = Opcode.QueryRange; Sequence = 1u; Payload = queryPayload } |]

    // Giải mã Range Data: map { nodes, paths }.
    let r = MsgPack.Reader(responses[2].Payload)
    MsgPack.readMapHeader r |> ignore
    Assert.Equal("nodes", MsgPack.readString r)
    let nodeCount = MsgPack.readArrayHeader r
    Assert.Equal(4, nodeCount)
    // Bỏ qua các nút (mỗi nút là mảng 6 phần tử).
    for _ in 1 .. nodeCount do
        MsgPack.readArrayHeader r |> ignore
        MsgPack.readFloat64 r |> ignore
        MsgPack.readFloat64 r |> ignore
        MsgPack.readInt r |> ignore
        MsgPack.readInt r |> ignore
        MsgPack.readBool r |> ignore
        MsgPack.readBool r |> ignore

    Assert.Equal("paths", MsgPack.readString r)
    // 4 cạnh (a->root, b->root, merge->a, merge->b).
    let pathCount = MsgPack.readArrayHeader r
    Assert.Equal(4, pathCount)
