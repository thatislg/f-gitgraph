namespace NeoGitCore.Storage

open System
open System.Runtime.InteropServices
open NeoGitCore.Domain

// Tích hợp thư viện C gốc LibGit2 in-process qua P/Invoke.
// Tham khảo thiết kế:
// docs/02_design/001_windows/03_Fast_Git_Storage_Reader.md (Mục 1).

[<RequireQualifiedAccess>]
module private Native =

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_libgit2_init()

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_repository_open(nativeint& outRepo, [<MarshalAs(UnmanagedType.LPUTF8Str)>] string path)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern void git_repository_free(nativeint repo)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_revwalk_new(nativeint& outWalk, nativeint repo)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern void git_revwalk_free(nativeint walk)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_revwalk_push_head(nativeint walk)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_revwalk_push_glob(nativeint walk, [<MarshalAs(UnmanagedType.LPUTF8Str)>] string glob)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_revwalk_push(nativeint walk, nativeint id)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_revparse_single(nativeint& outObject, nativeint repo, [<MarshalAs(UnmanagedType.LPUTF8Str)>] string spec)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern nativeint git_object_id(nativeint obj)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern void git_object_free(nativeint obj)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_revwalk_next(nativeint outOid, nativeint walk)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_oid_fromstr(nativeint outOid, [<MarshalAs(UnmanagedType.LPUTF8Str)>] string str)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_oid_tostr(nativeint outStr, nativeint n, nativeint id)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern int git_commit_lookup(nativeint& outCommit, nativeint repo, nativeint id)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern void git_commit_free(nativeint commit)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern uint32 git_commit_parentcount(nativeint commit)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern nativeint git_commit_parent_id(nativeint commit, uint32 n)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern nativeint git_commit_author(nativeint commit)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern nativeint git_commit_committer(nativeint commit)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern nativeint git_commit_summary(nativeint commit)

    [<DllImport("git2-5853918", CallingConvention = CallingConvention.Cdecl)>]
    extern nativeint git_commit_body(nativeint commit)

/// Hàm trợ giúp nội bộ (pinning, đọc OID, đọc chữ ký, đọc commit).
module private Helpers =

    /// Kích thước đệm đủ chứa cấu trúc `git_oid` (bao gồm phần mở rộng SHA-256).
    let gitOidMaxSize = 40

    /// Kích thước đệm chuỗi hex đủ cho SHA-256 (64 ký tự + ký tự null).
    let oidHexSize = 65

    /// Gọi một hàm với con trỏ pinned tới mảng byte, tự giải phóng khi xong.
    let withPinned (arr: byte[]) (f: nativeint -> 'T) : 'T =
        let handle = GCHandle.Alloc(arr, GCHandleType.Pinned)
        try
            f (handle.AddrOfPinnedObject())
        finally
            handle.Free()

    /// Đọc chuỗi UTF-8 từ con trỏ native, an toàn với con trỏ null.
    let readUtf8 (ptr: nativeint) : string =
        if ptr = 0n then
            ""
        else
            match Marshal.PtrToStringUTF8(ptr) with
            | null -> ""
            | s -> s

    /// Chuyển con trỏ `git_oid` sang GitHash (qua chuỗi hex).
    let readOidHex (oidPtr: nativeint) : GitHash =
        withPinned (Array.zeroCreate<byte> oidHexSize) (fun buf ->
            Native.git_oid_tostr(buf, nativeint oidHexSize, oidPtr) |> ignore
            let hex = readUtf8 buf
            match GitHash.tryParse hex with
            | Some h -> h
            | None -> failwith "mã băm Git không hợp lệ")

    /// Đọc cấu trúc `git_signature` sang Author bằng Marshal.Read* (thân thiện AOT).
    /// Bố cục: name (ptr), email (ptr), when.time (int64), when.offset (int32).
    let readSignature (ptr: nativeint) : Author =
        let ptrSize = IntPtr.Size
        let name = Marshal.ReadIntPtr(ptr, 0)
        let email = Marshal.ReadIntPtr(ptr, ptrSize)
        let time = Marshal.ReadInt64(ptr, 2 * ptrSize)
        let offset = Marshal.ReadInt32(ptr, 2 * ptrSize + 8)
        { Name = readUtf8 name
          Email = readUtf8 email
          Timestamp = time
          TimezoneOffsetMinutes = offset }

    /// Đọc toàn bộ thông tin commit từ handle native.
    let readCommit (commit: nativeint) (hash: GitHash) : CommitNode =
        let author = readSignature (Native.git_commit_author(commit))
        let committer = readSignature (Native.git_commit_committer(commit))
        let subject = readUtf8 (Native.git_commit_summary(commit))
        let body = readUtf8 (Native.git_commit_body(commit))

        let parentCount = int (Native.git_commit_parentcount(commit))
        let parents = ResizeArray<GitHash>(parentCount)
        for i in 0 .. parentCount - 1 do
            let pId = Native.git_commit_parent_id(commit, uint32 i)
            parents.Add(readOidHex pId)

        { Hash = hash
          Parents = List.ofSeq parents
          Author = author
          Committer = committer
          Subject = subject
          Body = body
          Refs = [] }

/// Gói gọn handle kho mã nguồn LibGit2, tự thu hồi tài nguyên khi kết thúc.
type GitRepository internal (handle: nativeint) =

    let mutable disposed = false

    /// Duyệt lịch sử commit theo nhánh yêu cầu, trả về danh sách mã băm theo thứ tự topo.
    /// `None` (hoặc `Some "*"`) duyệt toàn bộ nhánh; `Some tênNhánh` duyệt riêng một nhánh.
    member _.Walk(branch: string option) : Result<GitHash list, GitError> =
        let mutable walk = 0n
        let r = Native.git_revwalk_new(&walk, handle)
        if r < 0 then
            Error(GitError.NativeLibraryError(r, "git_revwalk_new"))
        else
            try
                let pushResult =
                    match branch with
                    | Some name when name <> "*" ->
                        // Nhánh cụ thể: giải mã shorthand ("main", "origin/main", ...)
                        // sang tip qua git_revparse_single, rồi đẩy OID vào bộ duyệt.
                        // (git_revwalk_push_ref đòi tên ref đầy đủ nên không dùng cho shorthand.)
                        let mutable obj = 0n
                        let rr = Native.git_revparse_single(&obj, handle, name)
                        if rr < 0 then
                            Error(GitError.NativeLibraryError(rr, "git_revparse_single: " + name))
                        else
                            try
                                Native.git_revwalk_push(walk, Native.git_object_id obj) |> ignore
                                Ok()
                            finally
                                Native.git_object_free(obj)
                    | _ ->
                        // Toàn bộ nhánh: HEAD + mọi nhánh local và remote.
                        Native.git_revwalk_push_head(walk) |> ignore
                        Native.git_revwalk_push_glob(walk, "refs/heads/*") |> ignore
                        Native.git_revwalk_push_glob(walk, "refs/remotes/*") |> ignore
                        Ok()

                match pushResult with
                | Error e -> Error e
                | Ok () ->
                    Helpers.withPinned (Array.zeroCreate<byte> Helpers.gitOidMaxSize) (fun oidBuf ->
                        let mutable hashes = []
                        let mutable continueLoop = true
                        while continueLoop do
                            let next = Native.git_revwalk_next(oidBuf, walk)
                            if next = 0 then
                                hashes <- Helpers.readOidHex oidBuf :: hashes
                            else
                                continueLoop <- false
                        Ok(List.rev hashes))
            finally
                Native.git_revwalk_free(walk)

    /// Đọc thông tin đầy đủ của một commit (cha, tác giả, tiêu đề, nội dung).
    member _.ReadCommit(hash: GitHash) : Result<CommitNode, GitError> =
        Helpers.withPinned (Array.zeroCreate<byte> Helpers.gitOidMaxSize) (fun oidBuf ->
            let r = Native.git_oid_fromstr(oidBuf, GitHash.toString hash)
            if r < 0 then
                Error(GitError.NativeLibraryError(r, "git_oid_fromstr"))
            else
                let mutable commit = 0n
                let r2 = Native.git_commit_lookup(&commit, handle, oidBuf)
                if r2 < 0 then
                    Error(GitError.NativeLibraryError(r2, "git_commit_lookup"))
                else
                    try
                        Ok(Helpers.readCommit commit hash)
                    finally
                        Native.git_commit_free(commit))

    interface IDisposable with
        member _.Dispose() =
            if not disposed then
                Native.git_repository_free(handle)
                disposed <- true

/// Quản lý vòng đời của LibGit2.
[<RequireQualifiedAccess>]
module LibGit2 =

    let private initOnce =
        lazy
            (Native.git_libgit2_init() |> ignore)

    /// Mở kho mã nguồn tại đường dẫn cho trước.
    let openRepository (path: string) : Result<GitRepository, GitError> =
        initOnce.Force()
        let mutable repo = 0n
        let r = Native.git_repository_open(&repo, path)
        if r < 0 then
            Error(GitError.RepositoryNotFound path)
        else
            Ok(new GitRepository(repo))
