namespace NeoGitCore.Storage

// Truy cập con trỏ unsafe để tạo ReadOnlySpan từ Memory-Mapped View.
#nowarn "9"

open System
open System.IO
open System.IO.MemoryMappedFiles
open System.Buffers.Binary
open Microsoft.FSharp.NativeInterop
open NeoGitCore.Domain

// Đọc trực tiếp cấu trúc nhị phân của tệp `commit-graph` (.git/objects/info/commit-graph)
// bằng cơ chế ánh xạ bộ nhớ (Memory-Mapped Files), không giải nén đối tượng Git.
// Tham khảo thiết kế:
// docs/02_design/001_windows/03_Fast_Git_Storage_Reader.md (Mục 2).

/// Dữ liệu đồ thị commit trích xuất từ tệp nhị phân commit-graph.
type CommitGraphData = {
    /// Mã băm các commit, theo thứ tự trong OID Lookup Table.
    Commits: GitHash[]
    /// Với mỗi commit, danh sách vị trí (index trong Commits) của các commit cha.
    Parents: int[][]
    /// Generation number từng commit (hỗ trợ duyệt topo nhanh).
    Generation: uint32[]
    /// Thời gian commit (giây kể từ epoch).
    CommitTime: uint32[]
}

[<RequireQualifiedAccess>]
module CommitGraph =

    // --- Định dạng nhị phân commit-graph (version 1, SHA-1/SHA-256) ---

    /// Giá trị đặc biệt biểu thị "không có commit cha".
    let private noParent = 0x70000000u

    /// Cờ báo "có commit cha mở rộng" (octopus merge) ở vị trí parent thứ hai.
    let private extraEdgeFlag = 0x80000000u

    let private oidFanoutId = [| 0x4Fuy; 0x49uy; 0x44uy; 0x46uy |] // "OIDF"
    let private oidLookupId = [| 0x4Fuy; 0x49uy; 0x44uy; 0x4Cuy |] // "OIDL"
    let private commitDataId = [| 0x43uy; 0x44uy; 0x41uy; 0x54uy |] // "CDAT"
    let private extraEdgeId = [| 0x45uy; 0x44uy; 0x47uy; 0x45uy |] // "EDGE"

    let private readU32 (span: ReadOnlySpan<byte>) (offset: int) : uint32 =
        BinaryPrimitives.ReadUInt32BigEndian(span.Slice(offset, 4))

    let private readI64 (span: ReadOnlySpan<byte>) (offset: int) : int64 =
        BinaryPrimitives.ReadInt64BigEndian(span.Slice(offset, 8))

    let private isChunkId (span: ReadOnlySpan<byte>) (offset: int) (id: byte[]) =
        span[offset] = id[0] && span[offset + 1] = id[1]
        && span[offset + 2] = id[2] && span[offset + 3] = id[3]

    /// Giải mã danh sách commit cha từ hai vị trí cha (và danh sách cạnh mở rộng nếu có).
    let private resolveParents
        (span: ReadOnlySpan<byte>)
        (extraEdgeOffset: int)
        (p1: uint32)
        (p2: uint32)
        : int[] =
        if p1 = noParent then
            // Commit gốc (root): không có cha.
            [||]
        elif p2 = noParent then
            // Commit thông thường: 1 cha.
            [| int p1 |]
        elif (p2 &&& extraEdgeFlag) = 0u then
            // Commit gộp (merge): 2 cha.
            [| int p1; int p2 |]
        else
            // Commit sáp nhập đa nhánh (octopus): đọc danh sách cạnh mở rộng.
            // Các cha phụ được lưu theo thứ tự ngược; dùng prepend để đảo về đúng thứ tự.
            let mutable idx = int (p2 &&& 0x7FFFFFFFu)
            let mutable extras = []
            let mutable doneLoop = false
            while not doneLoop do
                let v = readU32 span (extraEdgeOffset + idx * 4)
                extras <- int (v &&& 0x7FFFFFFFu) :: extras
                if (v &&& extraEdgeFlag) <> 0u then
                    doneLoop <- true
                else
                    idx <- idx + 1
            (int p1 :: extras) |> List.toArray

    /// Phân tích toàn bộ cấu trúc nhị phân từ lát cắt bộ nhớ đã ánh xạ.
    let private parse (span: ReadOnlySpan<byte>) : CommitGraphData =
        // Header 8 byte: "CGPH" + version + hashVersion + numChunks + numBaseGraphs.
        let isSignature =
            span[0] = 0x43uy && span[1] = 0x47uy && span[2] = 0x50uy && span[3] = 0x48uy
        if span.Length < 8 || not isSignature then
            failwith "sai chữ ký commit-graph"

        let hashVersion = span[5]
        let numChunks = int span[6]
        let hashLen = if hashVersion = 2uy then 32 else 20

        // Bảng mục lục chunk: (numChunks + 1) dòng, mỗi dòng 12 byte (4 id + 8 offset).
        let mutable oidFanoutOffset = -1
        let mutable oidLookupOffset = -1
        let mutable commitDataOffset = -1
        let mutable extraEdgeOffset = -1
        for i in 0 .. numChunks do
            let entryOffset = 8 + i * 12
            let chunkOffset = int (readI64 span (entryOffset + 4))
            if isChunkId span entryOffset oidFanoutId then oidFanoutOffset <- chunkOffset
            elif isChunkId span entryOffset oidLookupId then oidLookupOffset <- chunkOffset
            elif isChunkId span entryOffset commitDataId then commitDataOffset <- chunkOffset
            elif isChunkId span entryOffset extraEdgeId then extraEdgeOffset <- chunkOffset

        // Số lượng commit N = giá trị cuối của bảng fanout (256 phần tử).
        let n = int (readU32 span (oidFanoutOffset + 255 * 4))

        let commits = Array.zeroCreate<GitHash> n
        let parents = Array.zeroCreate<int[]> n
        let generation = Array.zeroCreate<uint32> n
        let commitTime = Array.zeroCreate<uint32> n

        // OID Lookup Table: N mã băm, mỗi mã dài hashLen byte.
        for i in 0 .. n - 1 do
            let hex = Utf8.hexEncode (span.Slice(oidLookupOffset + i * hashLen, hashLen))
            commits[i] <-
                match GitHash.tryParse hex with
                | Some h -> h
                | None -> failwith "mã băm không hợp lệ trong commit-graph"

        // Commit Data Chunk: N dòng, mỗi dòng (hashLen + 16) byte.
        for i in 0 .. n - 1 do
            let baseOffset = commitDataOffset + i * (hashLen + 16)
            let p1 = readU32 span (baseOffset + hashLen)
            let p2 = readU32 span (baseOffset + hashLen + 4)
            generation[i] <- readU32 span (baseOffset + hashLen + 8)
            commitTime[i] <- readU32 span (baseOffset + hashLen + 12)
            parents[i] <- resolveParents span extraEdgeOffset p1 p2

        { Commits = commits
          Parents = parents
          Generation = generation
          CommitTime = commitTime }

    /// Mở và đọc tệp commit-graph. Trả về None nếu tệp không tồn tại, sai định dạng
    /// hoặc bị hỏng — tầng Storage sẽ tự chuyển sang LibGit2 (fallback).
    let tryRead (path: string) : CommitGraphData option =
        if not (File.Exists path) then
            None
        else
            try
                use mmf =
                    MemoryMappedFile.CreateFromFile(path, FileMode.Open, null, 0L, MemoryMappedFileAccess.Read)
                use accessor = mmf.CreateViewAccessor(0L, 0L, MemoryMappedFileAccess.Read)
                let handle = accessor.SafeMemoryMappedViewHandle
                let mutable ptr = NativePtr.ofNativeInt<byte> 0n
                handle.AcquirePointer(&ptr)
                try
                    // Truy cập trực tiếp vùng nhớ đã ánh xạ, không cấp phát bản sao trung gian.
                    let length = int accessor.Capacity
                    let span = ReadOnlySpan<byte>(NativePtr.toVoidPtr ptr, length)
                    Some(parse span)
                finally
                    handle.ReleasePointer()
            with _ ->
                None
