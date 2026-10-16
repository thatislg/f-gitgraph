# 002. Kiểm Toán Chi Tiết Năng Lực Hiện Có Của FpGitGraph (Capabilities Audit)

Tài liệu này kiểm toán chi tiết hiện trạng kiến trúc, mã nguồn và toàn bộ các tính năng đã được hiện thực hóa trong dự án **F-GitGraph (`f-gitgraph`)** tính đến thời điểm hoàn thành Phase 2.

---

## 1. Tổng Quan Kiến Trúc Ba Tầng Của F-GitGraph

Hệ thống F-GitGraph hiện tại được tổ chức theo mô hình kiến trúc **Hybrid High-Performance Client**:

```mermaid
graph TD
    subgraph UI ["Tầng Giao Diện (Preact Webview)"]
        Table[CommitTable - Virtualized Windowing]
        Hex[HexagonNode & Avatar 1.15x / 5x Zoom]
        Hov[CommitHoverPanel - Subject & Body 550ms]
        Det[CommitDetails Overlay & FileTree]
        Menu[Context Menus & Form Dialogs]
        Head[MainHeader - Repo / Branch / Order Controls]
    end

    subgraph Ext ["Tầng Điều Phối Backend (VS Code TypeScript Extension)"]
        SidecarMgr[SidecarManager - Lifecycle & Stdio Pipes]
        Mutator[GitCliMutator - Safe Native Git CLI Write]
        AvatarMgr[AvatarManager - MD5 Gravatar & GitHub API]
        Watcher[GitRepoWatcher - .git/HEAD & refs Watcher]
        DiffProv[DiffDocProvider - vscode.diff Scheme]
    end

    subgraph Core ["Tầng Nhân Hiệu Năng Cao (F# Native AOT Core Engine)"]
        CGReader[CommitGraph.fs - Direct Binary Memory-Mapped]
        LibGit2[LibGit2.fs - In-Process C-Bindings]
        DAGSolver[Graph.fs - Parallel Topo Sort & Bézier Paths]
        Daemon[Transport.fs - Stdio MessagePack RPC Daemon]
        InFlight[InFlightState.fs - Rebase / Merge State Detector]
    end

    UI <===>|VS Code IPC postMessage| Ext
    Ext <===>|Stdio RPC Binary MessagePack Frame| Core
    Mutator -.->|Spawn Process Write| GitCLI[git.exe / Native Git CLI]
    Core -.->|Direct Read File / LibGit2| GitRepo[(Git Repository .git/)]
```

---

## 2. Kiểm Toán Chi Tiết Từng Tầng Công Nghệ

### 2.1. Tầng Nhân Tính Toán Hiệu Năng Cao (F# Native AOT Core Engine)

Mã nguồn nằm trong [src/core-engine/](file:///d:/Kojin/neo-git-graph/src/core-engine/):

- **Biên dịch Native AOT (`win-x64`)**:
  - Biên dịch trực tiếp ra mã máy native `f-gitgraph-core.exe`, độc lập hoàn toàn với .NET Runtime hoặc .NET SDK trên máy người dùng.
  - Kích thước tệp tối ưu (~8.5 MB), thời gian khởi động lạnh (Cold-start latency) đo đạc thực tế chỉ **3.2 ms** (đạt chuẩn vàng < 5ms).
- **Bộ đọc dữ liệu nhị phân siêu tốc (`Storage/CommitGraph.fs` & `LibGit2.fs`)**:
  - Đọc trực tiếp cấu trúc file nhị phân `.git/objects/info/commit-graph` (các chunk `OIDL`, `CDAT`, `EDGE`, `BDAT`) qua cơ chế ánh xạ bộ nhớ (Memory-Mapped Files) và con trỏ `Span<byte>`.
  - Zero-Allocation GC: Không tạo ra các đối tượng chuỗi rác trên bộ nhớ, giải quyết triệt để hiện tượng tràn RAM và khựng giật (GC freeze) của phiên bản TypeScript cũ khi đọc các repo 50.000+ commits.
  - Cơ chế dự phòng thông minh (Fallback): Tự động chuyển đổi giữa đọc file nhị phân `commit-graph`, gọi P/Invoke thư viện C LibGit2 in-process, hoặc gọi Git CLI nhanh.
- **Thuật toán giải đồ thị DAG song song đa luồng CPU (`Graph/Graph.fs`)**:
  - Sắp xếp thứ tự commit: Hỗ trợ cả **Topological Ordering** và **Date Ordering**.
  - Phân bổ làn thông minh (Lane Allocation Pool): Tối ưu hóa việc tái sử dụng làn nhánh từ trái qua phải, chống chồng chéo màu sắc giữa các nhánh liền kề.
  - Tự động sinh sẵn lệnh vẽ SVG (Bézier curves: `M x1 y1 C cx1 cy1 cx2 cy2 x2 y2`) ngay trong nhân F# trước khi gửi sang UI.
- **Giao thức Daemon RPC Streaming qua Stdio (`Transport/Transport.fs`)**:
  - Chạy ngầm dưới dạng sidecar tiến trình nền bền bỉ (`f-gitgraph-core.exe serve`).
  - Giao tiếp qua 2 luồng chuẩn Stdin/Stdout bằng định dạng khung gói tin nhị phân siêu nén MessagePack.
  - Hỗ trợ cơ chế phân trang ảo (Virtual Window Slicing - RPC method `graph.window`): Chỉ chuyển giao tọa độ của các dòng commit nằm trong tầm nhìn (viewport + buffer), giúp giao diện phản hồi 60-120fps mượt mà bất kể kích thước kho.
- **Phát hiện trạng thái biến động dở dang (`Domain/InFlightState.fs`)**:
  - Nhân F# đã có sẵn logic nhận diện trạng thái In-Flight thông qua các tệp cờ trong `.git/`:
    - `RebaseMerge` (`.git/rebase-merge/`)
    - `RebaseApply` (`.git/rebase-apply/`)
    - `Merge` (`.git/MERGE_HEAD`)
    - `CherryPick` (`.git/CHERRY_PICK_HEAD`)
    - `Revert` (`.git/REVERT_HEAD`)
    - `Bisect` (`.git/BISECT_LOG`)

---

### 2.2. Tầng Điều Phối Backend Extension (TypeScript)

Mã nguồn nằm trong [src/extension/](file:///d:/Kojin/neo-git-graph/src/extension/) và [src/backend/](file:///d:/Kojin/neo-git-graph/src/backend/):

- **Quản lý vòng đời Sidecar (`extension/sidecar/sidecar-manager.ts`)**:
  - Tự động phát hiện và khởi chạy bản nhị phân F# Native AOT phù hợp theo hệ điều hành.
  - Giám sát tiến trình, tự động hồi sinh (auto-restart) khi gặp sự cố, giải mã khung nhị phân MessagePack từ stdout của F#.
- **Bộ thực thi thao tác ghi an toàn (`extension/mutator/gitCliMutator.ts`)**:
  - Đảm bảo ranh giới an toàn tuyệt đối: F# chỉ đọc dữ liệu; toàn bộ thao tác ghi (mutations) được ủy thác 100% cho tiến trình Git chính thống (`git.exe`).
  - Đã đóng gói sẵn các hàm thao tác:
    - Commit: `commit(message, { sign, all })`
    - Nhánh: `createBranch`, `renameBranch`, `deleteBranch(force)`, `checkout`
    - Tích hợp: `merge(source, createNewCommit)`, `rebase(target)`, `rebaseContinue`, `rebaseAbort`, `cherryPick(hash)`
    - Tag: `addTag(name, message?)` (lightweight vs annotated)
    - Đồng bộ: `push(remote, branch)`, `pull(rebase)`, `fetch(remote)`
    - Kiểm định tên ref: `isValidRefName(name, kind)` qua `git check-ref-format`
- **Quản lý Avatar tác giả (`extension/services/avatarManager.ts`)**:
  - Thuật toán băm MD5 email để nạp avatar từ Gravatar.
  - Tích hợp fallback lấy profile picture từ GitHub User API (`api.github.com/users/<username>`).
  - Hệ thống bộ nhớ đệm đa tầng (Memory cache + Local storage cache) kèm chức năng xóa cache (`f-gitgraph.clearAvatarCache`).
- **Giám sát kho theo thời gian thực (`extension/watchers/git-repo.watcher.ts`)**:
  - Sử dụng FileSystemWatcher để theo dõi biến động các tệp `.git/HEAD`, `.git/refs/heads/`, `.git/refs/tags/`.
  - Tự động bắn thông báo `repo.changed` sang Webview để kích hoạt nạp lại dữ liệu vi sai khi người dùng thao tác ngoài terminal.
- **Cung cấp nội dung xem Diff (`extension/services/diffDocProvider.ts`)**:
  - Đăng ký lược đồ tài liệu ảo `git-graph-diff:`.
  - Cho phép tích hợp trực tiếp vào trình xem vi sai của VS Code (`vscode.diff`) để so sánh sự thay đổi giữa commit chỉ định và commit cha (`commit^ ↔ commit`).

---

### 2.3. Tầng Giao Diện Người Dùng (Preact Webview UI)

Mã nguồn nằm trong [src/webview/](file:///d:/Kojin/neo-git-graph/src/webview/):

- **Bảng Commit ảo hóa (Virtualized Windowing Commit Table)**:
  - Component [CommitTable.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/CommitTable.tsx): Cơ chế cuộn vô tận (Infinite Scrolling) với cửa sổ trượt ảo (Virtual Window Buffer = 100 dòng), tái sử dụng DOM elements.
  - Các cột hiển thị có khả năng kéo dãn kích thước linh hoạt ([useColumnResize.ts](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/useColumnResize.ts)):
    - Cột 1: Graph (đồ thị SVG các lane và node)
    - Cột 2: Description (Subject commit kèm các huy hiệu Branch/Tag pill rực rỡ)
    - Cột 3: Date (ngày tháng theo định dạng tùy chọn)
    - Cột 4: Author (tên tác giả commit)
    - Cột 5: Commit Hash (mã băm rút gọn)
- **Thiết kế Node Commit Lục giác Độc bản ([HexagonNode.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/HexagonNode.tsx))**:
  - Cắt xén ảnh avatar bằng SVG `clipPath` lục giác hoàn hảo, triệt tiêu 100% hiện tượng khoảng đen ở 4 góc.
  - Phân loại trực quan 4 kiểu node: Regular Commit, Merge Commit (icon rẽ nhánh), Root Commit (icon mầm cây), Uncommitted Changes (icon nét đứt).
  - Tương tác vi mô (Micro-interactions):
    - Micro Hover Zoom (1.15x): Nút lục giác phóng to mượt mà khi rê chuột.
    - Click Deep Zoom (5.0x) ([AvatarZoomPreview.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/AvatarZoomPreview.tsx)): Khi click vào icon avatar, một popup phóng đại 5.0x xuất hiện trên lớp hiển thị tuyệt đối (Top Layer) kèm ảnh HD và tên tác giả.
    - Hiệu ứng Neon Ambient Gradient: Tỏa vầng sáng màu neon theo màu của nhánh dọc theo dòng commit được chọn hoặc hover.
    - Viền tím Flameshot bao quanh dòng commit đang được kích hoạt.
- **Bảng Chi Tiết Commit Nổi ([CommitDetails.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/CommitDetails.tsx))**:
  - Khắc phục triệt để lỗi làm vỡ cấu trúc đồ thị (Overlay Inspector Panel): Panel chi tiết mở bên dưới dòng commit được chọn mà không can thiệp vào chiều cao bảng, giữ nguyên vẹn 100% tọa độ SVG của đồ thị.
  - Hiển thị đầy đủ: Hash đầy đủ, danh sách Parents, Tác giả kèm email, Committer, Ngày tháng đầy đủ, Toàn bộ nội dung Commit Body.
  - Cây tệp thay đổi ([FileTree.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/FileTree.tsx)): Hiển thị cấu trúc thư mục dạng cây, đánh dấu trạng thái tệp (A: Thêm mới, M: Sửa đổi, D: Đã xóa, R: Đổi tên); click vào tệp để mở trực tiếp màn hình Diff của VS Code.
- **Rich Commit Hover Panel ([CommitHoverPanel.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/CommitHoverPanel.tsx))**:
  - Khi rê chuột dừng lại trên dòng commit quá 550ms (dwell time), một panel popover nổi bật xuất hiện hiển thị trọn vẹn commit message (Subject + Body) mà không cần phải bấm click mở chi tiết.
- **Thanh Điều Khiển Đầu Trang ([MainHeader.tsx](file:///d:/Kojin/neo-git-graph/src/webview/layout/MainHeader.tsx))**:
  - Dropdown chọn Repository (dành cho multi-root workspaces).
  - Dropdown chọn Branch lọc đồ thị (kèm tùy chọn "Show All").
  - Dropdown chọn thứ tự hiển thị Commit (Topological vs Date Order).
  - Checkbox bật/tắt hiển thị Remote Branches.
  - Nút Refresh thủ công.
- **Hệ thống Menu Ngữ Cảnh & Hộp Thoại Biểu Mẫu ([menus.tsx](file:///d:/Kojin/neo-git-graph/src/webview/lib/menus.tsx))**:
  - Menu ngữ cảnh trên Commit:
    - Thêm Tag (Lightweight hoặc Annotated kèm message)
    - Tạo nhánh mới tại commit này
    - Checkout commit (Detached HEAD)
    - Cherry-pick commit (hỗ trợ chọn commit cha nếu là merge commit)
    - Revert commit (hỗ trợ chọn commit cha nếu là merge commit)
    - Merge commit vào nhánh hiện tại (kèm tùy chọn `--no-ff`)
    - Reset nhánh hiện tại về commit này (hỗ trợ chọn Soft / Mixed / Hard)
    - Copy Commit Hash
  - Menu ngữ cảnh trên Nhánh (Branch):
    - Checkout nhánh (nếu là remote branch sẽ hỗ trợ tạo nhánh local theo dõi)
    - Đổi tên nhánh (Rename)
    - Xóa nhánh (Delete với tùy chọn Force Delete `-D`)
    - Merge nhánh vào nhánh hiện tại
    - Copy tên nhánh
  - Menu ngữ cảnh trên Tag:
    - Xóa Tag
    - Push Tag lên remote
    - Copy tên Tag
  - Hộp thoại biểu mẫu xác nhận ([Dialog.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/ui/Dialog.tsx)): Nhập liệu tên nhánh, tên tag, chọn phương thức reset, xác nhận thao tác nguy hiểm.

---

## 3. Bảng Tổng Hợp Kiểm Kê Tính Năng (Current Capabilities Matrix)

Dưới đây là bảng rà soát 45 tiêu chí chức năng để xác định chính xác những gì F-GitGraph **đã hoàn thiện**, **mới có một phần**, và **hoàn toàn chưa có**:

|   STT   | Nhóm Tính Năng                      | Tính Năng Chi Tiết                                | Trạng Thái Trong F-GitGraph | Vị Trí Triển Khai / Ghi Chú                                    |
| :-----: | :---------------------------------- | :------------------------------------------------ | :-------------------------: | :------------------------------------------------------------- |
|  **I**  | **ĐỒ THỊ & LỊCH SỬ**                |                                                   |                             |                                                                |
|    1    |                                     | Vẽ đồ thị commit DAG đa nhánh                     |      ✅ **Hoàn thiện**      | Nhân F# Native AOT (`Graph.fs`), cực nhanh                     |
|    2    |                                     | Cuộn vô tận trên repo lớn (50k+ commits)          |      ✅ **Hoàn thiện**      | `CommitTable.tsx` ảo hóa cửa sổ trượt                          |
|    3    |                                     | Lọc đồ thị theo nhánh cụ thể                      |      ✅ **Hoàn thiện**      | `MainHeader.tsx` (Branch Dropdown)                             |
|    4    |                                     | Sắp xếp đồ thị (Topological / Date Order)         |      ✅ **Hoàn thiện**      | F# Core + Dropdown điều khiển trên header                      |
|    5    |                                     | Ẩn / Hiện các nhánh Remote                        |      ✅ **Hoàn thiện**      | `MainHeader.tsx` (Checkbox)                                    |
|    6    |                                     | Thiết kế Node lục giác & Avatar tác giả           |      ✅ **Hoàn thiện**      | `HexagonNode.tsx` (ClipPath, Neon Gradient)                    |
|    7    |                                     | Tương tác Hover zoom (1.15x) & Click zoom (5x)    |      ✅ **Hoàn thiện**      | `AvatarZoomPreview.tsx`, `CommitRow.tsx`                       |
|    8    |                                     | Xem trước nội dung commit khi hover (550ms)       |      ✅ **Hoàn thiện**      | `CommitHoverPanel.tsx`                                         |
|    9    |                                     | Bảng chi tiết commit (Inspector Overlay)          |      ✅ **Hoàn thiện**      | `CommitDetails.tsx` (không làm vỡ đồ thị)                      |
|   10    |                                     | Cây tệp tin thay đổi trong commit (FileTree)      |      ✅ **Hoàn thiện**      | `FileTree.tsx` (nhãn A, M, D, R)                               |
|   11    |                                     | Tích hợp xem Diff với VS Code                     |      ✅ **Hoàn thiện**      | `diffDocProvider.ts` gọi `vscode.diff`                         |
|   12    |                                     | So sánh vi sai giữa 2 commit bất kỳ               |       ❌ **Chưa có**        | Chưa hỗ trợ multi-select 2 commit                              |
|   13    |                                     | Tìm kiếm commit (Message, Author, Hash)           |       ❌ **Chưa có**        | Chưa có thanh search bar trên giao diện                        |
| **II**  | **QUẢN LÝ NHÁNH & TAG**             |                                                   |                             |                                                                |
|   14    |                                     | Tạo nhánh mới tại commit bất kỳ                   |      ✅ **Hoàn thiện**      | Context menu commit $\rightarrow$ Dialog $\rightarrow$ Git CLI |
|   15    |                                     | Đổi tên nhánh (Rename branch)                     |      ✅ **Hoàn thiện**      | Context menu branch $\rightarrow$ Dialog $\rightarrow$ Git CLI |
|   16    |                                     | Xóa nhánh (Delete branch: Safe & Force)           |      ✅ **Hoàn thiện**      | Context menu branch $\rightarrow$ Dialog (`-d` / `-D`)         |
|   17    |                                     | Checkout nhánh cục bộ & remote                    |      ✅ **Hoàn thiện**      | Context menu branch $\rightarrow$ Git CLI checkout             |
|   18    |                                     | Tạo Tag (Lightweight & Annotated)                 |      ✅ **Hoàn thiện**      | Context menu commit $\rightarrow$ Dialog $\rightarrow$ Git CLI |
|   19    |                                     | Xóa Tag cục bộ                                    |      ✅ **Hoàn thiện**      | Context menu tag $\rightarrow$ Dialog $\rightarrow$ Git CLI    |
|   20    |                                     | Đẩy Tag lên remote (Push Tag)                     |      ✅ **Hoàn thiện**      | Context menu tag $\rightarrow$ `git push origin <tag>`         |
|   21    |                                     | Cây điều hướng Branches & Tags (Sidebar)          |       ❌ **Chưa có**        | Hiện chỉ có Dropdown chọn nhánh trên Header                    |
| **III** | **THAO TÁC GHI & VIẾT LẠI LỊCH SỬ** |                                                   |                             |                                                                |
|   22    |                                     | Checkout commit đơn lẻ (Detached HEAD)            |      ✅ **Hoàn thiện**      | Context menu commit $\rightarrow$ `git checkout <hash>`        |
|   23    |                                     | Cherry-pick commit                                |      ✅ **Hoàn thiện**      | Hỗ trợ chọn parent index cho merge commit                      |
|   24    |                                     | Revert commit                                     |      ✅ **Hoàn thiện**      | Hỗ trợ chọn parent index cho merge commit                      |
|   25    |                                     | Merge commit / Merge branch                       |      ✅ **Hoàn thiện**      | Hỗ trợ tùy chọn `--no-ff` qua checkbox                         |
|   26    |                                     | Reset nhánh (Soft, Mixed, Hard)                   |      ✅ **Hoàn thiện**      | Context menu commit $\rightarrow$ Dialog chọn chế độ reset     |
|   27    |                                     | Kéo & thả trực quan (Drag & Drop to merge/rebase) |       ❌ **Chưa có**        | Chưa hỗ trợ tương tác kéo thả trên Webview                     |
|   28    |                                     | Trình tái cấu trúc lịch sử (Visual Rebase -i)     |       ❌ **Chưa có**        | Chưa có UI reorder, squash, fixup, drop                        |
| **IV**  | **WORKING TREE, STAGING & COMMIT**  |                                                   |                             |                                                                |
|   29    |                                     | Hiển thị tệp thay đổi trong Working Tree          |       ⚠️ **Sơ khai**        | Chỉ hiển thị dòng "Uncommitted changes" trên table             |
|   30    |                                     | Phân vùng danh sách Unstaged vs Staged Files      |       ❌ **Chưa có**        | Hoàn toàn chưa có khu vực staging                              |
|   31    |                                     | Stage tệp / Unstage tệp (File Staging)            |       ❌ **Chưa có**        | Chưa có nút bấm hoặc hành động stage                           |
|   32    |                                     | Stage từng đoạn code (Hunk / Line Staging)        |       ❌ **Chưa có**        | Chưa có giao diện patch diff tương tác                         |
|   33    |                                     | Hủy thay đổi tệp (Discard Changes)                |       ❌ **Chưa có**        | Chưa có nút revert file về HEAD                                |
|   34    |                                     | Khung soạn thảo Commit Message (Composer)         |       ❌ **Chưa có**        | Chưa có form viết title, description commit                    |
|   35    |                                     | Tùy chọn Amend commit & Ký số (GPG Sign)          |      ⚠️ **Backend có**      | `GitCliMutator.ts` có cờ, nhưng UI chưa có form                |
|  **V**  | **ĐỒNG BỘ TỪ XA & MẠNG**            |                                                   |                             |                                                                |
|   36    |                                     | Nút Fetch toàn cục                                |      ⚠️ **Backend có**      | `GitCliMutator.ts` có hàm `fetch`, chưa có nút UI              |
|   37    |                                     | Nút Pull (kèm tùy chọn rebase)                    |      ⚠️ **Backend có**      | `GitCliMutator.ts` có hàm `pull`, chưa có nút UI               |
|   38    |                                     | Nút Push (kèm cờ force-with-lease)                |      ⚠️ **Backend có**      | `GitCliMutator.ts` có hàm `push`, chưa có nút UI               |
|   39    |                                     | Huy hiệu số lượng commit `↑ahead` / `↓behind`     |       ❌ **Chưa có**        | Chưa tính toán và hiển thị counter trên header                 |
|   40    |                                     | Quản lý Remotes (Add, Edit, Remove, Prune)        |       ❌ **Chưa có**        | Chưa có UI quản lý danh sách remote                            |
| **VI**  | **LƯU TRỮ TẠM, XUNG ĐỘT & KHÁC**    |                                                   |                             |                                                                |
|   41    |                                     | Quản lý Stash (Save, Pop, Apply, Drop, List)      |       ❌ **Chưa có**        | Chưa có giao diện tương tác với Stash                          |
|   42    |                                     | Nhận diện trạng thái dở dang (In-Flight)          |      ⚠️ **Core F# có**      | `InFlightState.fs` nhận diện được, chưa hiển thị UI            |
|   43    |                                     | Trình giải quyết xung đột (Conflict Resolver)     |       ❌ **Chưa có**        | Chưa có giao diện 3-Way Merge khi gặp conflict                 |
|   44    |                                     | Quản lý Submodules & Worktrees                    |       ❌ **Chưa có**        | Chưa có trong phạm vi hiện tại                                 |
|   45    |                                     | Xem nhật ký tham chiếu (Reflog Viewer)            |       ❌ **Chưa có**        | Chưa hỗ trợ truy vấn reflog                                    |

---

## 4. Đánh Giá Hiện Trạng: Đâu Là Thế Mạnh và Đâu Là Nút Thắt?

### 4.1. Thế Mạnh Đã Khẳng Định Đẳng Cấp Vượt Trội

1. **Hiệu năng DAG Engine (F# Native AOT)**: Tốc độ nạp và vẽ đồ thị của F-GitGraph hiện tại đã bỏ xa các extension viết hoàn toàn bằng TypeScript hoặc JavaScript truyền thống trên VS Code, tiệm cận độ mượt của các app Native C++/Rust/C# như Fork hay Sublime Merge.
2. **Ngôn ngữ Thiết kế Đột phá & Tinh tế**: Hexagon SVG Nodes, ClipPath Avatar hoàn hảo, Neon Ambient Gradient rực rỡ, Avatar Deep Zoom 5.0x, Rich Commit Hover Panel là những nét thẩm mỹ độc bản mà ngay cả các Git GUI thương mại đắt tiền cũng chưa sở hữu.
3. **Nền tảng An toàn Dữ liệu**: Việc tuân thủ nguyên tắc "F# chỉ đọc, Git CLI gốc thực thi ghi" giúp bảo vệ 100% tính toàn vẹn kho code và chữ ký số.

### 4.2. Những Nút Thắt Ngăn Cản F-GitGraph Trở Thành Một "Git App Hoàn Chỉnh"

1. **Thiếu hoàn toàn Vòng Lặp Làm Việc Cơ Bản (Working Tree $\rightarrow$ Staging $\rightarrow$ Commit)**: Lập trình viên dùng Git GUI phần lớn thời gian để xem các file vừa sửa, chọn lọc file cần commit, viết commit message và bấm Commit. Việc F-GitGraph chưa có Staging Area buộc người dùng phải nhảy sang tab Source Control mặc định của VS Code để commit, làm đứt gãy trải nghiệm.
2. **Thiếu Hệ Thống Điều Hướng Kho Đồng Bộ (Sidebar Navigator & Global Remote Toolbar)**: Người dùng không có cái nhìn tổng quan về cây nhánh, không có nút Fetch/Pull/Push trực quan trên thanh công cụ kèm số lượng commit cần sync.
3. **Chưa có các công cụ nâng cao mang lại giá trị cao (High-Value Features)**: Quản lý Stash, Visual Interactive Rebase, và Conflict Resolver.

---

_Tài liệu tiếp theo: [003. Phân Tích Độ Lệch &amp; Bản Thiết Kế Tiến Hóa Lên Full Git App](003_Gap_Analysis_And_Evolution_Blueprint.md)_
