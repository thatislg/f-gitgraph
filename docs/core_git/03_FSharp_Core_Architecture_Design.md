# 03. Thiết Kế Kiến Trúc Nhân Core Git Bằng F# (.NET / Native AOT)

Tài liệu này đưa ra bản thiết kế chi tiết (Blueprints) cho việc hiện thực hóa nhân xử lý Git bằng **F#**. F# được lựa chọn nhờ sự kết hợp hoàn hảo giữa:
1. **Lập trình hàm (Functional Programming)**: Xử lý cây đồ thị bất biến (Immutable DAG) tự nhiên, an toàn, không có hiệu ứng phụ.
2. **Hệ thống kiểu dữ liệu tĩnh mạnh mẽ**: Discriminated Unions và Pattern Matching loại bỏ hoàn toàn các lỗi NullReferenceException hoặc unhandled error cases.
3. **Hiệu năng cấp hệ thống (Native Performance)**: Tận dụng .NET Runtime hiện đại với `Span<byte>`, `Memory<T>`, và khả năng biên dịch thẳng ra mã máy không cần runtime thông qua **.NET Native AOT**.

---

## 1. Kiến Trúc Phân Tầng Của Nhân F# (Layered Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VS Code Extension Host                          │
│        (TypeScript: Quản lý Lifecycle, Webview, Commands, Config)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC: Stdin/Stdout (MessagePack / JSON-RPC)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    F# Core Git Engine (.NET Native AOT)                │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Tầng Giao Tiếp (Transport Layer)                              │  │
│  │    - Request/Response Pipeline (System.IO.Pipelines)             │  │
│  │    - Streaming Data / Virtual Window Generator                   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ 2. Tầng Tính Toán Đồ Thị & Xếp Làn (Graph Topology Engine)       │  │
│  │    - Fast Topological Sort (Kahn / Tarjan Algorithm)             │  │
│  │    - Parallel Lane Allocation (Phân bổ cột nhánh song song)      │  │
│  │    - Vectorized Stroke Generator (Sinh tọa độ đường cong SVG)    │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ 3. Tầng Miền Nghiệp Vụ (Domain Model & Error Handling)           │  │
│  │    - Discriminated Unions mô hình hóa Git Objects & Errors       │  │
│  │    - Transaction / State Verification (Merge/Rebase In-flight)   │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ 4. Tầng Truy Cập Dữ Liệu Git (Git Storage Access Layer)          │  │
│  │    - Native LibGit2 P/Invoke (Trực tiếp đọc .git objects)        │  │
│  │    - Memory-Mapped Files (MMF) đọc commit-graph & packfile index │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mô Hình Hóa Dữ Liệu Bằng F# (Domain-Driven Types)

Hệ thống kiểu dữ liệu F# giúp mô hình hóa trạng thái Git một cách tự nhiên và đảm bảo tính đúng đắn khi biên dịch:

```fsharp
namespace NeoGitGraph.Core.Domain

open System

/// Hash SHA-1 (20 bytes) hoặc SHA-256 (32 bytes) của Git object
[<Struct>]
type GitHash = 
    private GitHash of string
    with
        static member Create (s: string) =
            if s.Length = 40 || s.Length = 64 then ValueSome (GitHash s)
            else ValueNone
        member this.Value = match this with GitHash v -> v
        member this.Abbreviated = (match this with GitHash v -> v).[0..6]

/// Phân loại trạng thái con trỏ HEAD
type HeadState =
    | AttachedToBranch of branchName: string * commit: GitHash
    | Detached of commit: GitHash

/// Phân loại nhánh và tham chiếu
type RefKind =
    | LocalBranch of isCheckedOut: bool
    | RemoteBranch of remoteName: string
    | ReleaseTag of version: string
    | PrereleaseTag of version: string * tag: string
    | PlainTag

type GitRef = {
    Name: string
    Hash: GitHash
    Kind: RefKind
}

/// Node commit trên đồ thị topo
type CommitNode = {
    Hash: GitHash
    Parents: GitHash list
    AuthorName: string
    AuthorEmail: string
    AuthorDate: DateTimeOffset
    CommitterName: string
    CommitDate: DateTimeOffset
    Subject: string
    Body: string option
    Refs: GitRef list
}

/// Trạng thái đang diễn ra trong kho mã nguồn
type InFlightState =
    | Clean
    | Merging of mergeHead: GitHash * message: string
    | Rebasing of currentStep: int * totalSteps: int * headName: string
    | CherryPicking of originalCommit: GitHash
    | Bisecting of badCommit: GitHash * goodCommits: GitHash list

/// Phân loại lỗi tường minh cho toàn bộ hệ thống
type GitEngineError =
    | RepositoryNotFound of path: string
    | FileLockConflict of lockFile: string * ageSeconds: float
    | BranchAlreadyExists of branchName: string
    | BranchNotMerged of branchName: string * unmergedCommitsCount: int
    | CheckoutConflict of dirtyFiles: string list
    | ShallowBoundaryMissing of parentHash: GitHash
    | ObjectCorrupted of hash: GitHash * details: string
    | GitNativeError of errorCode: int * message: string
```

---

## 3. Thuật Toán Xếp Làn Đồ Thị Topo Song Song (Parallel Lane Allocation)

Trong TypeScript, hàm `computeGraphLayout` chạy tuần tự trên luồng UI. Trong F#, chúng ta triển khai thuật toán tính toán đồ thị theo lô (Batched Layout Engine) tận dụng đa nhân CPU:

```fsharp
namespace NeoGitGraph.Core.Graph

open NeoGitGraph.Core.Domain

type LaneAssignment = {
    VertexIndex: int
    Lane: int
    ColourIndex: int
    IsMerge: bool
}

module TopoLayout =
    /// Tính toán phân bổ làn (Lane Allocation) cho danh sách commit
    let computeLanes (commits: ReadOnlyMemory<CommitNode>) : LaneAssignment array =
        let count = commits.Length
        let result = Array.zeroCreate<LaneAssignment> count
        
        // Quản lý active branches bằng bitmask hoặc slot mảng tái sử dụng (Zero-allocation)
        let activeLanes = System.Collections.Generic.List<GitHash option>()
        
        for i = 0 to count - 1 do
            let commit = commits.Span.[i]
            // Tìm kiếm lane trống hoặc lane đang trỏ tới commit hiện tại
            let allocatedLane = 
                match activeLanes.FindIndex(fun slot -> slot = Some commit.Hash) with
                | -1 -> 
                    // Cần mở lane mới hoặc tái sử dụng lane trống bên trái
                    let emptyIdx = activeLanes.FindIndex(Option.isNone)
                    if emptyIdx >= 0 then
                        activeLanes.[emptyIdx] <- Some commit.Hash
                        emptyIdx
                    else
                        activeLanes.Add(Some commit.Hash)
                        activeLanes.Count - 1
                | found -> found
                
            // Cập nhật vị trí các commit cha vào lane
            // ... (Xử lý gộp nhánh hoặc phân nhánh)
            
            result.[i] <- {
                VertexIndex = i
                Lane = allocatedLane
                ColourIndex = allocatedLane % 8
                IsMerge = commit.Parents.Length > 1
            }
            
        result
```

---

## 4. Tích Hợp Native LibGit2 & Truy Cập File Trực Tiếp

Thay vì gọi `git.exe` thông qua command line, nhân F# giao tiếp trực tiếp với thư viện C native `libgit2` (được tối ưu hóa bằng assembly C):
1. **Truy cập Commit-Graph File (`.git/objects/info/commit-graph`)**:
   - Git phiên bản 2.18+ hỗ trợ file nhị phân `commit-graph`.
   - F# dùng `MemoryMappedFile` nạp toàn bộ đồ thị commit vào RAM chỉ trong **1-2 milliseconds**.
   - Không cần duyệt các file object rời rạc, đọc trực tiếp offset parent và generation number của mọi commit.
2. **P/Invoke tới `libgit2` API**:
   - `git_repository_open`
   - `git_revwalk_new` $\rightarrow$ `git_revwalk_push_head` $\rightarrow$ `git_revwalk_next`
   - Đọc commit metadata dạng con trỏ bộ nhớ (raw pointer `char*`), copy thẳng vào .NET struct mà không phát sinh trung gian string trong heap.

---

## 5. Giao Thức IPC Siêu Tốc Giữa F# và TypeScript (Zero-Copy Streaming)

Để loại bỏ chi phí `JSON.stringify` / `JSON.parse`:
1. **Giao tiếp qua Stdin/Stdout**:
   - Node.js spawn file thực thi F# native `neo-git-core.exe` một lần duy nhất khi khởi động extension và giữ kết nối liên tục (Long-running Background Daemon).
2. **Khuôn dạng dữ liệu (Payload Protocol)**:
   - Sử dụng định dạng nhị phân **MessagePack** hoặc **FlatBuffers / Protocol Buffers**.
   - Bảng commit được phân trang ảo (Virtual Window Pagination): F# chỉ gửi về 500 commit đang nằm trong khung nhìn viewport kèm thông tin tọa độ đồ thị.
   - Khi người dùng cuộn (scroll), Webview gửi yêu cầu phạm vi dòng `[startRow, endRow]`, F# stream kết quả trả về trong **dưới 5 milliseconds**.

---

## 6. Lộ Trình Hiện Thực Hóa (Implementation Roadmap)

| Giai đoạn | Mục tiêu | Kết quả đầu ra |
| :--- | :--- | :--- |
| **Giai đoạn 1** | Xây dựng Solution F# và định nghĩa Domain Types | Thư mục `engine/` chứa `NeoGitGraph.Core.fsproj`, bộ unit test xUnit kiểm tra toàn bộ bảng mã lỗi và logic kiểu dữ liệu. |
| **Giai đoạn 2** | Tích hợp LibGit2 / Fast Packfile Reader | Module đọc log và branches với benchmark so sánh trực tiếp với `simple-git`. Đạt mốc < 50ms cho 20,000 commits. |
| **Giai đoạn 3** | Hiện thực thuật toán Topo & Phân bổ Lane | Thuật toán xếp nhánh song song trong F#, xuất mảng tọa độ đồ thị hoàn chỉnh. |
| **Giai đoạn 4** | Xây dựng Daemon IPC & Biên dịch Native AOT | Biên dịch `neo-git-core.exe` (kích thước ~8MB độc lập, không cần cài đặt .NET runtime), kết nối với VS Code extension qua named pipe hoặc stdio. |
| **Giai đoạn 5** | Ghép nối vào Webview & Virtual Scrolling | Webview Preact gọi thẳng engine F#, trải nghiệm cuộn và mở repository lớn mượt mà ở 60-120 FPS. |
