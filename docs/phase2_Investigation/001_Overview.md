# Phase 2 Investigation: Bản Điều Tra Tái Thiết Kế F-GitGraph Bằng F#

Tài liệu này phân tích toàn diện lộ trình chuyển đổi và tối ưu hóa **F-GitGraph** sang kiến trúc mới với nhân tính toán hiệu năng cao bằng **F# (.NET / Native AOT)**.

---

## 1. Triết Lý & Nguyên Tắc Cốt Lõi

> [!IMPORTANT]
> **Nguyên tắc Vàng**:
>
> - **F# đảm nhiệm ĐỌC & TÍNH TOÁN (Read-Heavy & Graph Computing)**: Tốc độ tối đa, xử lý song song đa luồng, zero-allocation cho các repo từ 20.000 đến 100.000+ commits.
> - **Git gốc (`git.exe`) đảm nhiệm THAY ĐỔI DỮ LIỆU (Write & Mutations)**: Giữ nguyên 100% cơ chế gọi Git CLI cho các lệnh commit, push, pull, rebase... để bảo đảm tính toàn vẹn và an toàn tuyệt đối.

---

## 2. Phân Tích Hiện Trạng: Giữ Lại Gì và Đập Đi Xây Lại Gì?

### 2.1. Những Gì TẬN DỤNG ĐƯỢC (Tái sử dụng 100%)

Không cần viết lại toàn bộ extension từ con số 0. Những phần sau đã hoàn thiện rất tốt và cần được giữ lại:

1. **Toàn bộ tầng Giao diện Webview Phase 1**:
   - Các component Preact: `HexagonNode.tsx`, `RefLabel.tsx`, `CommitHoverPanel.tsx`, `AvatarZoomPreview.tsx`.
   - Cơ chế băm MD5 Gravatar, avatar caching và trích xuất GitHub profile.
   - Toàn bộ phong cách thiết kế: SVG Hexagon clipping, Neon Ambient Gradient, viền tím Flameshot, Micro Hover Zoom (1.15x) và Click Deep Zoom (5.0x).
2. **VS Code Extension Shell & Integration (Thin Client)**:
   - File cấu hình `package.json` (Commands, Views, Menus, Configuration Schema, Keybindings).
   - Tầng đăng ký Webview View Provider, xử lý theme VS Code (Dark, Light, High Contrast).
   - Tầng gửi nhận thông điệp qua lại giữa Webview và Extension Host (`postMessage`).
3. **Bộ Unit Tests cho Webview UI**:
   - Toàn bộ các test suite Vitest trong `tests/webview/components/` đã được viết kỹ lưỡng để kiểm thử hành vi UI.

---

### 2.2. Những Phần BẮT BUỘC GIỮ NGUYÊN GIT GỐC (`git.exe`)

> [!CAUTION]
> **Tuyệt đối KHÔNG tự viết lại các thao tác ghi (Git Mutations) bằng C#/F# tự chế hoặc LibGit2**.
> Việc thay đổi lịch sử Git phải luôn được ủy thác cho chính tiến trình `git.exe` của người dùng.

Các lệnh Git sau đây **BẮT BUỘC giữ nguyên qua Native Git CLI**:

- `git commit`
- `git push`, `git pull`, `git fetch`
- `git merge`, `git rebase`, `git cherry-pick`, `git revert`
- `git stash push`, `git stash pop`
- `git branch -d`, `git branch -D`
- `git reset --soft / --mixed / --hard`

**Lý do an toàn kỹ thuật**:

1. **Bảo mật & Ký số (GPG / SSH Commit Signing)**: Người dùng thường cấu hình khóa GPG/SSH phần cứng (YubiKey) hoặc 1Password/GPG Agent để ký commit. Tự viết lại sẽ làm hỏng hoặc bỏ qua chữ ký số.
2. **Xác thực danh tính & 2FA (Git Credential Manager / OAuth)**: Lệnh `push` / `pull` cần Git Credential Manager hoặc GitHub CLI (`gh`) để giải quyết MFA/Token/SSO doanh nghiệp.
3. **Git Hooks của dự án (`pre-commit`, `commit-msg`, `husky`)**: Các công ty cài đặt linter, scanner bảo mật trong hook. Bỏ qua hook của git gốc sẽ vi phạm chính sách mã nguồn của doanh nghiệp.
4. **Git LFS (Large File Storage)**: Quản lý file nhị phân lớn đòi hỏi filter driver của Git CLI.
5. **Merge Drivers & Xử lý Conflict phức tạp**: Thuật toán 3-way merge của Git gốc (ort, recursive) đã được kiểm nghiệm qua hàng chục năm.

---

### 2.3. Những Gì SẼ ĐẬP ĐI XÂY LẠI Bằng F#

Đây chính là các nút thắt cổ chai làm chậm hệ thống hiện nay:

1. **Tầng đọc Lịch sử & Phân tích Git Log (`loadCommits.ts`)**:
   - _Hiện tại_: Gọi `git log --format=...`, nhận chuỗi text hàng chục MB rồi split theo dòng trong JavaScript V8 -> Gây gián đoạn GC và ăn RAM khủng khiếp.
   - _F# thay thế_: Đọc trực tiếp định dạng nhị phân Git `commit-graph` hoặc memory-mapped file với `Span<byte>` (Zero Allocation).
2. **Thuật toán Phân nhánh Đồ thị Topo (`layout.ts`)**:
   - _Hiện tại_: Chạy đơn luồng trên JavaScript Webview, tính toán lane từng commit một làm treo UI khi repo có 50.000+ commits.
   - _F# thay thế_: Parallel Graph Solver đa luồng bằng F#, tính toán toàn bộ vị trí node, đường rẽ nhánh (curves), merge lines trên các luồng CPU song song (`Array.Parallel`).
3. **Giao thức Truyền Dữ liệu IPC (JSON -> Streaming Binary/MessagePack)**:
   - _Hiện tại_: Parse/Stringify mảng JSON hàng chục nghìn đối tượng qua VS Code IPC tốn 1 - 3 giây.
   - _F# thay thế_: Gửi dữ liệu đã được tính sẵn tọa độ theo dạng nhị phân siêu nén (MessagePack hoặc FlatBuffers) theo từng trang (Virtual Scrolling Pages) đến Webview.
4. **Quản lý Bộ Nhớ Đệm Đồ Thị (DAG Graph Cache)**:
   - Lưu trữ cấu trúc cây commit đã tính toán trong bộ nhớ native của engine F#, chỉ tính lại (incremental recompute) khi có HEAD hoặc Ref thay đổi.

---

## 3. Danh Mục Các Mục Cần Phải Làm (Action Items Breakdown)

Dưới đây là danh sách phân rã toàn bộ các đầu việc kỹ thuật cần triển khai:

### 📋 Mục 1: Khởi Tạo F# Engine & Cấu Hình Native AOT

- [ ] Tạo solution F# độc lập: `src/core-engine/NeoGitGraph.Core.fsproj`.
- [ ] Cấu hình biên dịch **Native AOT** (`PublishAot=true`):
  - Xuất ra 1 file nhị phân native duy nhất (`f-gitgraph-core.exe` trên Windows, `f-gitgraph-core` trên Linux/macOS).
  - Không đòi hỏi người dùng phải cài .NET SDK hay Runtime.
  - Tối ưu kích thước file (< 10MB) và thời gian khởi động (< 5ms).

### 📋 Mục 2: Thiết Kế Domain Model & Khái Niệm Bằng F#

- [ ] Định nghĩa các kiểu dữ liệu cốt lõi (Algebraic Data Types):
  - `CommitHash`, `Author`, `CommitInfo`, `GitRef` (Branch, Tag, Remote, Stash).
  - `GraphNode`, `GraphLane`, `GraphPath` (tọa độ vẽ SVG x, y, màu lane).
- [ ] Định nghĩa mã lỗi vét cạn bằng Discriminated Unions:
  - `GitError`: `RepositoryNotFound`, `LockFileActive`, `InFlightRebase`, `CorruptObject`, `NativeException`.

### 📋 Mục 3: Xây Dựng Tầng Đọc Git Siêu Tốc (Fast Git Reader)

- [ ] Tích hợp `libgit2` (hoặc module đọc trực tiếp `.git/objects/pack` và `.git/objects/info/commit-graph`).
- [ ] Cài đặt Zero-Allocation parser sử dụng `ReadOnlySpan<byte>` để trích xuất commit info mà không tạo rác cho GC.
- [ ] Cơ chế Watcher phát hiện thay đổi trong `.git/refs/` và `.git/HEAD` để cập nhật dữ liệu vi sai (incremental update).

### 📋 Mục 4: Cài Đặt Thuật Toán Topo Graph Layout Song Song (Parallel DAG Solver)

- [ ] Chuyển thuật toán tính lane từ TypeScript (`src/webview/graph/layout.ts`) sang F#.
- [ ] Tối ưu hóa thuật toán phân phối luồng bằng `Array.Parallel` / `Parallel.ForEach`.
- [ ] Tính sẵn toàn bộ tọa độ node, đường cong bezier, màu nhánh trước khi gửi cho Webview, biến Webview thành **tầng Dumb Renderer (chỉ vẽ, không tính)**.

### 📋 Mục 5: Thiết Kế Giao Thức IPC Siêu Tốc (Sidecar Daemon RPC)

- [ ] Xây dựng cơ chế giao tiếp giữa VS Code Extension (Node.js) và F# Engine qua `stdio` (Standard I/O) hoặc Named Pipes.
- [ ] Áp dụng chuẩn mã hóa nhị phân MessagePack hoặc Protobuf để truyền dữ liệu đồ thị nhanh gấp 10 lần so với JSON thuần.
- [ ] Hỗ trợ phân trang ảo (Virtual Window Streaming): Engine chỉ gửi đúng số commit trong viewport hiển thị + buffer 200 dòng, không đẩy toàn bộ 100.000 commit vào DOM một lúc.

### 📋 Mục 6: Tích Hợp Thin TypeScript Client Trong Extension

- [ ] Viết module quản lý vòng đời tiến trình F# sidecar trong Extension:
  - Tự động khởi động tiến trình F# khi mở F-GitGraph.
  - Tự động kill tiến trình khi đóng tab.
  - Quản lý fallback an toàn nếu tiến trình native gặp sự cố.
- [ ] Điều hướng các lệnh ghi (Commit, Push, Branch...) thẳng sang module `GitCliMutationExecutor.ts` sử dụng `git.exe` gốc.

### 📋 Mục 7: Đánh Giá & Benchmark So Sánh

- [ ] Xây dựng kịch bản benchmark tự động đo đạc trên 3 kích thước repo:
  - Repo nhỏ: < 1.000 commits.
  - Repo trung bình: 10.000 commits.
  - Repo lớn: 50.000 - 100.000+ commits (Linux kernel clone).
- [ ] Đo đạc 4 chỉ số: Thời gian nạp ban đầu (Cold load time), Mức tiêu thụ RAM (Peak Memory), Độ trễ cuộn (FPS / Scroll latency), và Tỷ lệ an toàn khi thực thi Git mutations (100% pass).

---

## 4. Sơ Đồ Kiến Trúc Hỗn Hợp Đề Xuất (Hybrid Engine Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VS CODE WEBVIEW (PREACT)                        │
│   (TẬN DỤNG 100% Phase 1: Hexagon Node, Neon Ambient, Avatar Zoom)     │
│       - Chỉ làm nhiệm vụ DUMB RENDERER (vẽ SVG theo tọa độ có sẵn)     │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ PostMessage (View data)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    VS CODE EXTENSION HOST (NODE.JS)                    │
│   (TẬN DỤNG Cấu hình, Menus, Commands, VS Code Window API)            │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
               │ [ READ / GRAPH PIPELINE ]                │ [ WRITE / MUTATION PIPELINE ]
               │ Giao thức Stdio / MessagePack            │ Spawn CLI git.exe an toàn
               ▼                                          ▼
┌───────────────────────────────┐              ┌────────────────────────┐
│     F# CORE ENGINE (AOT)      │              │    NATIVE GIT CLI      │
│  - Zero-alloc commit parser   │              │       (git.exe)        │
│  - LibGit2 / commit-graph file│              │  - git commit          │
│  - Parallel DAG Layout Solver │              │  - git push / git pull │
│  - Incremental Graph Cache    │              │  - git merge / rebase  │
│  - Virtual Paging Streamer    │              │  - GPG/SSH key signing │
│  => TỐC ĐỘ XỬ LÝ SIÊU TỐC     │              │  => AN TOÀN TUYỆT ĐỐI  │
└───────────────────────────────┘              └────────────────────────┘
```
