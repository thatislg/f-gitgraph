namespace NeoGitCore.Transport

// Tầng giao tiếp vận chuyển nội bộ: mã hóa nhị phân MessagePack, khung gói tin
// Stdio RPC và vòng lặp daemon sidecar.
// Tham khảo thiết kế:
// docs/02_design/001_windows/05_IPC_Stdio_Streaming_Protocol.md

open System
open System.IO
open System.Buffers.Binary
open System.Text
open NeoGitCore.Domain
open NeoGitCore.Storage
open NeoGitCore.Graph

// --- Mã hóa / giải mã MessagePack (tập con, không phụ thuộc thư viện, AOT-safe) ---

[<RequireQualifiedAccess>]
module MsgPack =

    /// Bộ đệm ghi MessagePack.
    type Writer() =
        let buffer = ResizeArray<byte>()
        member _.WriteByte(b: byte) = buffer.Add b
        member _.ToArray() = buffer.ToArray()
        member _.Count = buffer.Count

    /// Bộ đọc MessagePack trên mảng byte.
    type Reader(bytes: byte[]) =
        let mutable pos = 0
        member _.ReadByte() =
            if pos >= bytes.Length then failwith "đọc quá giới hạn MessagePack"
            let b = bytes[pos]
            pos <- pos + 1
            b
        member _.ReadBytes(count: int) : byte[] =
            if pos + count > bytes.Length then failwith "đọc quá giới hạn MessagePack"
            let result = Array.zeroCreate<byte> count
            Array.Copy(bytes, pos, result, 0, count)
            pos <- pos + count
            result
        member _.Remaining = bytes.Length - pos

    // --- Ghi số nguyên big-endian ---

    let private writeU16 (w: Writer) (v: uint16) =
        w.WriteByte(byte (v >>> 8))
        w.WriteByte(byte v)

    let private writeU32 (w: Writer) (v: uint32) =
        w.WriteByte(byte (v >>> 24))
        w.WriteByte(byte (v >>> 16))
        w.WriteByte(byte (v >>> 8))
        w.WriteByte(byte v)

    let private writeU64 (w: Writer) (v: uint64) =
        for shift in [ 56; 48; 40; 32; 24; 16; 8; 0 ] do
            w.WriteByte(byte (v >>> shift))

    // --- Các hàm ghi (Writer) ---

    let writeNil (w: Writer) = w.WriteByte 0xc0uy

    let writeBool (w: Writer) (b: bool) =
        w.WriteByte(if b then 0xc3uy else 0xc2uy)

    let writeUInt (w: Writer) (v: uint64) =
        if v <= 0x7fUL then w.WriteByte(byte v)
        elif v <= 0xffUL then
            w.WriteByte 0xccuy
            w.WriteByte(byte v)
        elif v <= 0xffffUL then
            w.WriteByte 0xcduy
            writeU16 w (uint16 v)
        elif v <= 0xffffffffUL then
            w.WriteByte 0xceuy
            writeU32 w (uint32 v)
        else
            w.WriteByte 0xcfuy
            writeU64 w v

    let writeInt (w: Writer) (v: int64) =
        if v >= 0L then writeUInt w (uint64 v)
        elif v >= -32L then w.WriteByte(byte v)
        elif v >= int64 SByte.MinValue then
            w.WriteByte 0xd0uy
            w.WriteByte(byte (sbyte v))
        elif v >= int64 Int16.MinValue then
            w.WriteByte 0xd1uy
            writeU16 w (uint16 (int16 v))
        elif v >= int64 Int32.MinValue then
            w.WriteByte 0xd2uy
            writeU32 w (uint32 (int32 v))
        else
            w.WriteByte 0xd3uy
            writeU64 w (uint64 v)

    let writeFloat64 (w: Writer) (v: float) =
        w.WriteByte 0xcBuy
        writeU64 w (uint64 (BitConverter.DoubleToInt64Bits v))

    let writeString (w: Writer) (s: string) =
        let bytes = Encoding.UTF8.GetBytes s
        let len = bytes.Length
        if len <= 31 then w.WriteByte(byte (0xa0 ||| len))
        elif len <= 0xff then
            w.WriteByte 0xd9uy
            w.WriteByte(byte len)
        elif len <= 0xffff then
            w.WriteByte 0xdauy
            writeU16 w (uint16 len)
        else
            w.WriteByte 0xdBuy
            writeU32 w (uint32 len)
        for b in bytes do
            w.WriteByte b

    let writeArrayHeader (w: Writer) (count: int) =
        if count <= 15 then w.WriteByte(byte (0x90 ||| count))
        elif count <= 0xffff then
            w.WriteByte 0xdcuy
            writeU16 w (uint16 count)
        else
            w.WriteByte 0xdduy
            writeU32 w (uint32 count)

    let writeMapHeader (w: Writer) (count: int) =
        if count <= 15 then w.WriteByte(byte (0x80 ||| count))
        elif count <= 0xffff then
            w.WriteByte 0xdeuy
            writeU16 w (uint16 count)
        else
            w.WriteByte 0xdfuy
            writeU32 w (uint32 count)

    // --- Các hàm đọc (Reader) ---

    let private readU16 (r: Reader) =
        (uint16 (r.ReadByte()) <<< 8) ||| uint16 (r.ReadByte())

    let private readU32 (r: Reader) =
        (uint32 (r.ReadByte()) <<< 24)
        ||| (uint32 (r.ReadByte()) <<< 16)
        ||| (uint32 (r.ReadByte()) <<< 8)
        ||| uint32 (r.ReadByte())

    let private readU64 (r: Reader) =
        let mutable acc = 0UL
        for _ in 1 .. 8 do
            acc <- (acc <<< 8) ||| uint64 (r.ReadByte())
        acc

    let readNil (r: Reader) =
        if r.ReadByte() <> 0xc0uy then failwith "mong đợi nil trong MessagePack"

    let readBool (r: Reader) =
        match r.ReadByte() with
        | 0xc2uy -> false
        | 0xc3uy -> true
        | _ -> failwith "mong đợi bool trong MessagePack"

    /// Đọc số nguyên (mọi định dạng) sang int64.
    let readInt (r: Reader) : int64 =
        let b = r.ReadByte()
        if b <= 0x7fuy then int64 b
        elif b >= 0xe0uy then int64 (sbyte b)
        else
            match b with
            | 0xccuy -> int64 (r.ReadByte())
            | 0xcduy -> int64 (readU16 r)
            | 0xceuy -> int64 (readU32 r)
            | 0xcfuy -> int64 (readU64 r)
            | 0xd0uy -> int64 (sbyte (r.ReadByte()))
            | 0xd1uy -> int64 (int16 (readU16 r))
            | 0xd2uy -> int64 (int32 (readU32 r))
            | 0xd3uy -> int64 (readU64 r)
            | _ -> failwith "mã số nguyên MessagePack không hợp lệ"

    let readFloat64 (r: Reader) : float =
        if r.ReadByte() <> 0xcBuy then failwith "mong đợi float64 trong MessagePack"
        BitConverter.Int64BitsToDouble(int64 (readU64 r))

    let readString (r: Reader) : string =
        let b = r.ReadByte()
        let len =
            if b >= 0xa0uy && b <= 0xbfuy then int (b &&& 0x1fuy)
            elif b = 0xd9uy then int (r.ReadByte())
            elif b = 0xdauy then int (readU16 r)
            elif b = 0xdBuy then int (readU32 r)
            else failwith "mong đợi chuỗi trong MessagePack"
        Encoding.UTF8.GetString(r.ReadBytes len)

    let readArrayHeader (r: Reader) : int =
        let b = r.ReadByte()
        if b >= 0x90uy && b <= 0x9fuy then int (b &&& 0x0fuy)
        elif b = 0xdcuy then int (readU16 r)
        elif b = 0xdduy then int (readU32 r)
        else failwith "mong đợi mảng trong MessagePack"

    let readMapHeader (r: Reader) : int =
        let b = r.ReadByte()
        if b >= 0x80uy && b <= 0x8fuy then int (b &&& 0x0fuy)
        elif b = 0xdeuy then int (readU16 r)
        elif b = 0xdfuy then int (readU32 r)
        else failwith "mong đợi map trong MessagePack"

// --- Mã định danh lệnh trao đổi (Opcodes) ---

[<RequireQualifiedAccess>]
module Opcode =

    /// Tín hiệu sẵn sàng, gửi ngay khi daemon khởi động (F# -> TS).
    let Ready = 0x00uy
    /// Khởi tạo kho (TS -> F#).
    let InitializeRepo = 0x01uy
    /// Khởi tạo thành công (F# -> TS).
    let InitSuccess = 0x02uy
    /// Truy vấn khoảng dòng (TS -> F#).
    let QueryRange = 0x03uy
    /// Dữ liệu khoảng dòng (F# -> TS).
    let RangeData = 0x04uy
    /// Làm mới bộ đệm (TS -> F#).
    let InvalidateCache = 0x05uy
    /// Kiểm tra nhịp tim (TS -> F#).
    let HeartbeatPing = 0x06uy
    /// Xác nhận nhịp tim (F# -> TS).
    let HeartbeatPong = 0x07uy
    /// Báo cáo lỗi (F# -> TS).
    let Error = 0xFFuy

// --- Khung gói tin nhị phân (Framing) ---

/// Khung gói tin: [độ dài u32 LE][opcode u8][seq u32 LE][payload MessagePack].
type Frame = {
    Opcode: byte
    Sequence: uint32
    Payload: byte[]
}

[<RequireQualifiedAccess>]
module Frame =

    /// Kích thước phần tiêu đề (opcode 1 byte + seq 4 byte).
    let private headerSize = 5

    /// Mã hóa khung gói tin sang mảng byte (độ dài tính cả tiêu đề lẫn payload).
    let encode (frame: Frame) : byte[] =
        let bodyLength = headerSize + frame.Payload.Length
        let output = Array.zeroCreate<byte> (4 + bodyLength)
        BinaryPrimitives.WriteUInt32LittleEndian(output.AsSpan(0, 4), uint32 bodyLength)
        output[4] <- frame.Opcode
        BinaryPrimitives.WriteUInt32LittleEndian(output.AsSpan(5, 4), frame.Sequence)
        Array.Copy(frame.Payload, 0, output, 9, frame.Payload.Length)
        output

    /// Đọc một khung gói tin từ luồng; trả về None khi hết luồng (EOF).
    let read (input: Stream) : Frame option =
        let readExact (count: int) : byte[] option =
            let buf = Array.zeroCreate<byte> count
            let mutable read = 0
            let mutable ok = true
            while ok && read < count do
                let n = input.Read(buf, read, count - read)
                if n = 0 then ok <- false
                else read <- read + n
            if ok then Some buf else None

        match readExact 4 with
        | None -> None
        | Some lenBytes ->
            let bodyLength = int (BinaryPrimitives.ReadUInt32LittleEndian(lenBytes.AsSpan()))
            if bodyLength < headerSize then failwith "độ dài khung gói tin không hợp lệ"
            match readExact bodyLength with
            | None -> failwith "luồng đóng giữa chừng khi đọc khung gói tin"
            | Some body ->
                let opcode = body[0]
                let sequence = BinaryPrimitives.ReadUInt32LittleEndian(body.AsSpan(1, 4))
                let payload = Array.zeroCreate<byte> (bodyLength - headerSize)
                Array.Copy(body, headerSize, payload, 0, payload.Length)
                Some { Opcode = opcode; Sequence = sequence; Payload = payload }

// --- Lược đồ thông điệp (Message Schemas) ---

[<RequireQualifiedAccess>]
module Protocol =

    // --- Giải mã yêu cầu (TS -> F#) ---

    let decodeInitRequest (payload: byte[]) : string * string option =
        let r = MsgPack.Reader(payload)
        let n = MsgPack.readMapHeader r
        let mutable repoPath = ""
        let mutable branch = None
        for _ in 1 .. n do
            match MsgPack.readString r with
            | "repoPath" -> repoPath <- MsgPack.readString r
            | "branch" -> branch <- Some(MsgPack.readString r)
            | _ -> failwith "khóa không mong đợi trong init request"
        repoPath, branch

    let decodeQueryRange (payload: byte[]) : int * int =
        let r = MsgPack.Reader(payload)
        let n = MsgPack.readMapHeader r
        let mutable fromRow = 0
        let mutable toRow = 0
        for _ in 1 .. n do
            match MsgPack.readString r with
            | "from" -> fromRow <- int (MsgPack.readInt r)
            | "to" -> toRow <- int (MsgPack.readInt r)
            | _ -> failwith "khóa không mong đợi trong query range"
        fromRow, toRow

    // --- Mã hóa phản hồi (F# -> TS) ---

    let encodeInitSuccess (commitCount: int) (maxLane: int) (commits: GitHash[]) : byte[] =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 3
        MsgPack.writeString w "commitCount"
        MsgPack.writeInt w (int64 commitCount)
        MsgPack.writeString w "maxLane"
        MsgPack.writeInt w (int64 maxLane)
        MsgPack.writeString w "commits"
        MsgPack.writeArrayHeader w commits.Length
        for h in commits do
            MsgPack.writeString w (GitHash.toString h)
        w.ToArray()

    /// Đường nối đã mã hóa lệnh vẽ SVG `d`, sẵn sàng gửi sang Webview.
    type PathEmit = {
        /// Chuỗi lệnh vẽ SVG (đường dẫn `d`) với tọa độ Y tương đối theo cửa sổ.
        D: string
        /// Chỉ số màu nét vẽ.
        Color: int
    }

    let encodeRangeData (nodes: Geometry.Node[]) (paths: PathEmit[]) : byte[] =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 2
        MsgPack.writeString w "nodes"
        MsgPack.writeArrayHeader w nodes.Length
        for nd in nodes do
            MsgPack.writeArrayHeader w 6
            MsgPack.writeFloat64 w nd.X
            MsgPack.writeFloat64 w nd.Y
            MsgPack.writeInt w (int64 nd.Lane)
            MsgPack.writeInt w (int64 nd.Color)
            MsgPack.writeBool w nd.IsMerge
            MsgPack.writeBool w nd.IsRoot
        MsgPack.writeString w "paths"
        MsgPack.writeArrayHeader w paths.Length
        for p in paths do
            MsgPack.writeArrayHeader w 2
            MsgPack.writeString w p.D
            MsgPack.writeInt w (int64 p.Color)
        w.ToArray()

    let encodeError (code: int) (message: string) : byte[] =
        let w = MsgPack.Writer()
        MsgPack.writeMapHeader w 2
        MsgPack.writeString w "code"
        MsgPack.writeInt w (int64 code)
        MsgPack.writeString w "message"
        MsgPack.writeString w message
        w.ToArray()

// --- Vòng lặp daemon (Daemon Loop) ---

[<RequireQualifiedAccess>]
module Daemon =

    /// Trạng thái bộ đệm của daemon: ảnh chụp đồ thị + bố cục đã tính.
    type State = {
        /// Đường dẫn kho đang mở (để tái nạp khi làm mới bộ đệm).
        RepoPath: string
        /// Nhánh đang hiển thị: `None`/`Some "*"` = toàn bộ, `Some tên` = riêng một nhánh.
        Branch: string option
        Snapshot: GraphSnapshot
        Layout: Geometry.Layout
        /// Thứ tự hiển thị (index commit theo dòng).
        Order: int[]
        /// Ánh xạ index commit -> dòng.
        Row: int[]
        /// Danh sách mã băm commit theo thứ tự hiển thị.
        Commits: GitHash[]
    }

    /// Nạp kho mã nguồn và tính bố cục đồ thị.
    let loadRepo (path: string) (branch: string option) : Result<State, GitError> =
        match GitReader.readGraph path branch with
        | Error e -> Error e
        | Ok snap ->
            let layout = Layout.compute snap
            let order = TopoSort.order snap
            let row = Array.zeroCreate<int> snap.Commits.Length
            order |> Array.iteri (fun i c -> row[c] <- i)
            let commits = order |> Array.map (fun c -> snap.Commits[c])
            Ok
                { RepoPath = path
                  Branch = branch
                  Snapshot = snap
                  Layout = layout
                  Order = order
                  Row = row
                  Commits = commits }

    /// Chạy vòng lặp daemon với bộ nạp kho tùy chỉnh (dùng cho kiểm thử).
    let runWith (loader: string -> string option -> Result<State, GitError>) (input: Stream) (output: Stream) : unit =
        let writeFrame (opcode: byte) (sequence: uint32) (payload: byte[]) =
            let bytes = Frame.encode { Opcode = opcode; Sequence = sequence; Payload = payload }
            output.Write(bytes, 0, bytes.Length)
            output.Flush()

        // Tín hiệu sẵn sàng đầu tiên.
        writeFrame Opcode.Ready 0u [||]

        let mutable state: State option = None
        let mutable running = true

        while running do
            match Frame.read input with
            | None -> running <- false
            | Some frame ->
                try
                    if frame.Opcode = Opcode.InitializeRepo then
                        let path, branch = Protocol.decodeInitRequest frame.Payload
                        match loader path branch with
                        | Error e ->
                            writeFrame Opcode.Error frame.Sequence (Protocol.encodeError 1 (GitError.describe e))
                        | Ok s ->
                            state <- Some s
                            writeFrame
                                Opcode.InitSuccess
                                frame.Sequence
                                (Protocol.encodeInitSuccess s.Snapshot.Commits.Length s.Layout.MaxLane s.Commits)

                    elif frame.Opcode = Opcode.QueryRange then
                        match state with
                        | None -> writeFrame Opcode.Error frame.Sequence (Protocol.encodeError 2 "chưa khởi tạo kho")
                        | Some s ->
                            let fromRow, toRow = Protocol.decodeQueryRange frame.Payload
                            let n = s.Snapshot.Commits.Length
                            let fromRow = max 0 fromRow
                            let toRow = min (n - 1) toRow

                            let nodes =
                                if fromRow <= toRow then
                                    [| for r in fromRow .. toRow -> s.Layout.Nodes[s.Order[r]] |]
                                else
                                    [||]

                            // Dịch gốc tọa độ Y về đầu cửa sổ ảo để Webview vẽ trực tiếp
                            // trong hệ tọa độ cửa sổ (khắc phục BUG-02/BUG-03: node/line lệch
                            // vị trí khi cuộn).
                            let dy = float fromRow * Geometry.RowHeight
                            let offsetNode (nd: Geometry.Node) = { nd with Y = nd.Y - dy }

                            let nodes = nodes |> Array.map offsetNode

                            // Đường nối hiển thị nếu cắt khoảng dòng [fromRow, toRow]:
                            // con nằm trên hoặc ngang đáy cửa sổ và cha nằm dưới hoặc ngang đỉnh cửa sổ.
                            let paths =
                                s.Layout.Edges
                                |> Array.mapi (fun k edge ->
                                    let struct (c, p) = edge
                                    if s.Row[c] <= toRow && s.Row[p] >= fromRow then
                                        let path = s.Layout.Paths[k]
                                        Some
                                            { Protocol.D =
                                                Geometry.renderPath
                                                    path.BendAtChildRow
                                                    (offsetNode s.Layout.Nodes[c])
                                                    (offsetNode s.Layout.Nodes[p])
                                              Protocol.Color = path.Color }
                                    else
                                        None)
                                |> Array.choose id

                            writeFrame Opcode.RangeData frame.Sequence (Protocol.encodeRangeData nodes paths)

                    elif frame.Opcode = Opcode.InvalidateCache then
                        // Tính lại vi sai: đọc lại kho và trả Init Success với số liệu mới.
                        match state with
                        | None -> writeFrame Opcode.Error frame.Sequence (Protocol.encodeError 2 "chưa khởi tạo kho")
                        | Some prev ->
                            match loader prev.RepoPath prev.Branch with
                            | Error e ->
                                writeFrame Opcode.Error frame.Sequence (Protocol.encodeError 1 (GitError.describe e))
                            | Ok s ->
                                state <- Some s
                                writeFrame
                                    Opcode.InitSuccess
                                    frame.Sequence
                                    (Protocol.encodeInitSuccess s.Snapshot.Commits.Length s.Layout.MaxLane s.Commits)

                    elif frame.Opcode = Opcode.HeartbeatPing then
                        writeFrame Opcode.HeartbeatPong frame.Sequence [||]

                    else
                        writeFrame
                            Opcode.Error
                            frame.Sequence
                            (Protocol.encodeError 3 ("opcode không hỗ trợ: " + string frame.Opcode))

                with ex ->
                    writeFrame Opcode.Error frame.Sequence (Protocol.encodeError 4 ex.Message)

    /// Chạy vòng lặp daemon với bộ nạp kho thật, cho tới khi luồng vào đóng.
    let run (input: Stream) (output: Stream) : unit = runWith loadRepo input output
