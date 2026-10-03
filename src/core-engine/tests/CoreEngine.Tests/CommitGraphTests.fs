module CoreEngine.Tests.CommitGraphTests

open System
open System.Buffers.Binary
open System.Collections.Generic
open System.IO
open System.Text
open Xunit
open NeoGitCore.Domain
open NeoGitCore.Storage

// Bộ dựng tệp commit-graph nhị phân tổng hợp (version 1, SHA-1) phục vụ kiểm thử
// parser mà không cần phụ thuộc git CLI.

module private Builder =

    let private hashLen = 20

    let private writeU32 (b: ResizeArray<byte>) (v: uint32) =
        let arr = Array.zeroCreate<byte> 4
        BinaryPrimitives.WriteUInt32BigEndian(arr.AsSpan(), v)
        b.AddRange arr

    let private writeU64 (b: ResizeArray<byte>) (v: uint64) =
        let arr = Array.zeroCreate<byte> 8
        BinaryPrimitives.WriteUInt64BigEndian(arr.AsSpan(), v)
        b.AddRange arr

    let private writeAscii (b: ResizeArray<byte>) (s: string) =
        b.AddRange(Encoding.ASCII.GetBytes s)

    /// commits: (hashHex40, parentHashes, generation, commitTime)
    let build (commits: (string * string list * uint32 * uint32) array) : byte[] =
        let n = commits.Length
        let sorted = commits |> Array.sortBy (fun (h, _, _, _) -> h)

        let indexOf = Dictionary<string, int>()
        sorted |> Array.iteri (fun i (h, _, _, _) -> indexOf[h] <- i)

        let numChunks = 4
        let headerSize = 8
        let chunkTableSize = (numChunks + 1) * 12
        let oidfSize = 256 * 4
        let oidlSize = n * hashLen
        let cdatSize = n * (hashLen + 16)
        let edgeSize = 0

        let oidfOffset = headerSize + chunkTableSize
        let oidlOffset = oidfOffset + oidfSize
        let cdatOffset = oidlOffset + oidlSize
        let edgeOffset = cdatOffset + cdatSize
        let totalSize = edgeOffset + edgeSize

        let b = ResizeArray<byte>()

        // Header.
        writeAscii b "CGPH"
        b.Add 1uy // version
        b.Add 1uy // hash version (SHA-1)
        b.Add(byte numChunks)
        b.Add 0uy // base graphs

        // Chunk lookup table.
        writeAscii b "OIDF"
        writeU64 b (uint64 oidfOffset)
        writeAscii b "OIDL"
        writeU64 b (uint64 oidlOffset)
        writeAscii b "CDAT"
        writeU64 b (uint64 cdatOffset)
        writeAscii b "EDGE"
        writeU64 b (uint64 edgeOffset)
        writeU32 b 0u
        writeU64 b (uint64 totalSize)

        // OID Fanout: 256 phần tử (đếm dồn theo byte đầu).
        let firstByte (h: string) = int (Convert.FromHexString(h)[0])
        for i in 0 .. 255 do
            let cnt =
                sorted
                |> Array.sumBy (fun (h, _, _, _) -> if firstByte h <= i then 1 else 0)
            writeU32 b (uint32 cnt)

        // OID Lookup.
        for (h, _, _, _) in sorted do
            b.AddRange(Convert.FromHexString h)

        // Commit Data.
        for (h, parents, gen, time) in sorted do
            b.AddRange(Array.zeroCreate<byte> hashLen) // tree OID (không dùng)
            let p1 = if parents.Length >= 1 then uint32 indexOf[parents[0]] else 0x70000000u
            let p2 = if parents.Length >= 2 then uint32 indexOf[parents[1]] else 0x70000000u
            writeU32 b p1
            writeU32 b p2
            writeU32 b gen
            writeU32 b time

        b.ToArray()

let private root = "1111111111111111111111111111111111111111"
let private child = "2222222222222222222222222222222222222222"
let private merge = "3333333333333333333333333333333333333333"

let private withTempGraph (bytes: byte[]) (test: string -> unit) =
    let path = Path.Combine(Path.GetTempPath(), "commit-graph-test-" + Guid.NewGuid().ToString("N"))
    File.WriteAllBytes(path, bytes)
    try
        test path
    finally
        File.Delete path

[<Fact>]
let ``parses root and child commits`` () =
    let bytes =
        Builder.build [| (root, [], 1u, 100u); (child, [ root ], 2u, 200u) |]

    withTempGraph bytes (fun path ->
        match CommitGraph.tryRead path with
        | Some data ->
            Assert.Equal(2, data.Commits.Length)
            // Sắp xếp từ điển: root (0x11...) trước, child (0x22...) sau.
            Assert.Equal(root, GitHash.toString data.Commits[0])
            Assert.Empty(data.Parents[0])
            Assert.Equal(child, GitHash.toString data.Commits[1])
            Assert.Equal<int>([| 0 |], data.Parents[1])
        | None -> failwith "phải phân tích được commit-graph")

[<Fact>]
let ``parses merge commit with two parents`` () =
    let bytes =
        Builder.build
            [| (root, [], 1u, 100u)
               (child, [ root ], 2u, 200u)
               (merge, [ root; child ], 3u, 300u) |]

    withTempGraph bytes (fun path ->
        match CommitGraph.tryRead path with
        | Some data ->
            Assert.Equal(3, data.Commits.Length)
            Assert.Equal(merge, GitHash.toString data.Commits[2])
            Assert.Equal<int>([| 0; 1 |], data.Parents[2])
        | None -> failwith "phải phân tích được commit-graph")

[<Fact>]
let ``returns None for non-existent file`` () =
    Assert.True((CommitGraph.tryRead "không-tồn-tại-commit-graph").IsNone)

[<Fact>]
let ``returns None for corrupt file`` () =
    withTempGraph "not-a-commit-graph"B (fun path ->
        Assert.True((CommitGraph.tryRead path).IsNone))
