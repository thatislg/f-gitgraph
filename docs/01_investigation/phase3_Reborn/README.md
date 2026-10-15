# Phase 3 Reborn: Khảo Sát Tính Năng & Lộ Trình Tiến Hóa F-GitGraph Thành Ứng Dụng Git UI Toàn Diện

> **Dự án**: F-GitGraph (Mã nguồn: `neo-git-graph`)  
> **Giai đoạn**: Phase 3 - Reborn  
> **Mục tiêu**: Điều tra toàn diện hệ thống tính năng Git, kiểm toán năng lực hiện có của FpGitGraph, và xây dựng bản thiết kế tiến hóa từ "Trình hiển thị đồ thị Git" (Git Graph Viewer) thành một "Ứng dụng Git hoàn chỉnh" (Full-Featured Git App UI).  
> **Trạng thái**: Hoàn thành nghiên cứu & điều tra kỹ thuật (Investigation Phase).

---

## 1. Bối Cảnh & Động Lực (Background & Mission)

Sau khi chuyển đổi thành công nhân tính toán sang **F# (.NET / Native AOT)** ở Phase 2, hệ thống đã chứng minh được sự ổn định vượt bậc, thời gian khởi động lạnh tức thời (< 5ms), khả năng xử lý đồ thị song song đa luồng CPU cho 50.000 – 100.000+ commits, và giao thức truyền nhị phân streaming MessagePack siêu nén.

Tuy nhiên, về mặt tính năng và trải nghiệm người dùng:
- **Hiện tại**: F-GitGraph chủ yếu đóng vai trò là một tiện ích mở rộng trực quan hóa lịch sử commit (Commit History & DAG Visualizer), kế thừa giao diện dòng commit và menu chuột phải truyền thống.
- **Tầm nhìn Phase 3 (Reborn)**: Nâng cấp F-GitGraph trở thành một **ứng dụng Git Client UI hoàn chỉnh (Full Git Desktop/Webview Workspace)**, cạnh tranh trực tiếp về mặt tính năng và trải nghiệm với các Git GUI hàng đầu thế giới như **Fork**, **GitKraken**, **Sublime Merge**, **Tower**, và **GitLens**, nhưng sở hữu lợi thế cốt lõi về **tốc độ xử lý F# Native AOT**, **hiệu ứng giao diện Neon Hexagon Avatar độc bản**, và **tính an toàn dữ liệu 100% qua Native Git CLI**.

---

## 2. Danh Mục Hồ Sơ Điều Tra (Investigation Documents)

Thư mục `docs/phase3_Reborn/` chứa 3 tài liệu nghiên cứu chuyên sâu:

```
docs/phase3_Reborn/
├── README.md                                      # Tổng quan, chỉ mục và tóm lược điều hành
├── 001_Git_Features_Comprehensive_Taxonomy.md     # Khảo sát toàn diện hệ sinh thái tính năng Git (CLI & GUI App)
├── 002_Fpgitgraph_Current_Capabilities_Audit.md   # Kiểm toán chi tiết hiện trạng năng lực của FpGitGraph
├── 003_Gap_Analysis_And_Evolution_Blueprint.md    # Ma trận phân tích độ lệch (Gap Analysis) & Lộ trình tiến hóa
├── 004_Design_System_And_Visual_Identity.md       # Hệ thống thiết kế Cyber-Lab & Nhận diện hình ảnh (Dark/Light & Corner Crosshairs)
└── 005_Audio_Feedback_And_Sound_Design.md         # [MỚI] Thiết kế phản hồi âm thanh vi mô (Cyber-Lab Micro-Acoustics)
```

> 🎯 **Bảng Nghiệm Thu Tập Trung**: Xem [Master Feature Checklist](../03_progess/phase3/FEATURE_CHECKLIST.md) để theo dõi và tích hoàn thành từng tính năng chi tiết.

### 📋 [001. Khảo Sát Toàn Diện Hệ Sinh Thái Tính Năng Git (Taxonomy)](001_Git_Features_Comprehensive_Taxonomy.md)
- Phân rã 12 trụ cột chức năng cốt lõi của Git CLI tiêu chuẩn (Khởi tạo, Staging, Commit, Branching, Tagging, Synchronization, Rebase/Merge, Stash, Conflict Resolution, Search, Submodules/Worktrees, Maintenance).
- Khảo sát các chuẩn mực thiết kế và tính năng "phải có" của các Git GUI hàng đầu thế giới (Fork, GitKraken, Sublime Merge, Tower).
- Định nghĩa "Bộ Tiêu Chuẩn Vàng" (Golden Standard) của một Git App UI hoàn chỉnh.

### 📋 [002. Kiểm Toán Chi Tiết Năng Lực Hiện Có Của FpGitGraph (Audit)](002_Fpgitgraph_Current_Capabilities_Audit.md)
- Rà soát từng tầng kiến trúc hiện tại:
  - **F# Native AOT Core Engine**: Đọc nhị phân `commit-graph`, LibGit2, Parallel DAG Solver, Stdio RPC Daemon.
  - **TypeScript Backend & Sidecar**: Quản lý vòng đời sidecar, `GitCliMutator` ghi an toàn, `AvatarManager` đa tầng cache, `git-repo.watcher`.
  - **Preact Webview UI**: Virtualized Commit Table, Hexagon Node, Micro Hover Zoom (1.15x), Click Deep Zoom (5.0x Top-Layer), Rich Hover Panel, Overlay Commit Details & FileTree, Context Menus.
- Bảng kiểm kê trạng thái 45 tính năng cụ thể (Hoàn thiện / Một phần / Chưa có).

### 📋 [003. Phân Tích Độ Lệch & Bản Thiết Kế Tiến Hóa Lên Full Git App (Blueprint)](003_Gap_Analysis_And_Evolution_Blueprint.md)
- Ma trận phân tích độ lệch (Gap Matrix): Chỉ rõ các khoảng cách lớn nhất (Thiếu Staging Area & Commit Composer, thiếu Global Sync Toolbar, thiếu Left Sidebar Navigator, thiếu Stash Manager, thiếu Visual Interactive Rebase).
- Mô hình kiến trúc không gian làm việc 3 phân vùng (3-Pane Workspace Architecture: Sidebar - Graph Canvas - Staging/Inspector).
- Phân định ranh giới kỹ thuật F# Core Engine (Read/Diff) vs Git CLI Mutator (Write).
- Lộ trình 4 bước phát triển Phase 3 (Phase 3.1: Staging & Commit Composer $\rightarrow$ Phase 3.2: 3-Pane Workspace & Sync $\rightarrow$ Phase 3.3: Stash & Multi-Commit Diff $\rightarrow$ Phase 3.4: Visual Interactive Rebase & Conflict Resolver).

### 📋 [004. Hệ Thống Thiết Kế & Nhận Diện Hình Ảnh (Design System)](004_Design_System_And_Visual_Identity.md)
- Định vị ngôn ngữ thiết kế **"Neo-Brutalist Cyber-Lab"**: Simple & Breatheable (gọn gàng, không ôm đồm gây rối mắt như GitLens) nhưng vẫn bắt mắt với các điểm nhấn công nghệ cao.
- Khung kỹ thuật với **Đinh tán chữ thập góc (`+` corner crosshairs)** lấy cảm hứng từ nhận diện LMO Lab cho các phân vùng làm việc.
- Hệ thống phối màu toàn diện cho cả **Dark Theme** và **Light Theme** (kết hợp các biến `--vscode-*` và các điểm nhấn Neon Emerald, Amber, Rose, Violet).
- Cam kết bảo tồn 100% Hexagon Node và nhân F# Core.
- Code mẫu Component `CornerCrossFrame.tsx` và utility CSS sẵn sàng áp dụng dần.

### 📋 [005. Thiết Kế Phản Hồi Âm Thanh & Sound FX (Audio Feedback)](005_Audio_Feedback_And_Sound_Design.md)
- Tầm nhìn phản hồi âm thanh vi mô **Cyber-Lab Micro-Acoustics** (tiếng chốt cơ khí khi commit, âm thăng hoa khi push, xung trầm cảnh báo xung đột).
- Nguyên tắc: Tùy chọn tắt/bật triệt để, âm lượng dịu nhẹ, không gây ức chế, không dùng file âm thanh ngoài ($0\text{KB}$ asset qua Web Audio API).
- Lộ trình: Kích hoạt hoàn thiện sau khi Phase 3.1 & 3.2 đi vào hoạt động ổn định.

---

## 3. Tóm Tắt Kết Quả Điều Tra & So Sánh Nhanh

| Nhóm Năng Lực Cốt Lõi | Git CLI / Standard App | F-GitGraph Hiện Tại | Đánh Giá & Khoảng Trống (Gap) |
| :--- | :---: | :---: | :--- |
| **Trực quan hóa Đồ thị Lịch sử (DAG)** | Rất mạnh | **Xuất sắc (Top 1% tốc độ)** | Đã vượt trội nhờ F# Native AOT, Hexagon Node, Avatar 5x Zoom, Neon Ambient. |
| **Duyệt Chi tiết Commit & File Diff** | Đầy đủ | **Khá tốt** | Đã có Overlay Inspector, FileTree, tích hợp `vscode.diff`. Thiếu so sánh giữa 2 commit bất kỳ. |
| **Thao tác Nhánh & Tag Cơ Bản** | Đầy đủ | **Khá tốt** | Đã có tạo, đổi tên, xóa branch; tạo, xóa, push tag; checkout, merge, cherry-pick, revert, reset. |
| **Khu Vực Staging (Stage / Unstage)** | Chuẩn mực bắt buộc | ❌ **Chưa có** | **Khoảng trống lớn nhất**. Chưa có UI stage/unstage file, stage từng hunk/line, discard thay đổi. |
| **Trình Soạn Thảo Commit (Composer)** | Chuẩn mực bắt buộc | ❌ **Chưa có** | Chưa có form viết commit message, amend commit, sign commit trực tiếp trên UI. |
| **Đồng Bộ Từ Xa (Fetch / Pull / Push)** | Chuẩn mực bắt buộc | ⚠️ **Sơ khai** | Mới có push tag. Chưa có toolbar Push/Pull/Fetch với số đếm `↑ahead` / `↓behind`. |
| **Điều Hướng Kho (Sidebar Tree)** | Chuẩn mực bắt buộc | ⚠️ **Sơ khai** | Hiện chỉ có Dropdown chọn Repo và Branch trên Header; thiếu Sidebar cây phân cấp chuyên nghiệp. |
| **Quản Lý Lưu Trữ Tạm (Stash)** | Đầy đủ | ❌ **Chưa có** | Chưa có UI Stash Save, Pop, Apply, Drop, List, Stash Diff. |
| **Viết Lại Lịch Sử Trực Quan (Rebase)** | Rất mạnh trên GUI | ❌ **Chưa có** | Chưa có Interactive Rebase UI (kéo thả, squash, fixup, reorder, reword trực quan). |
| **Giải Quyết Xung Đột (Conflict)** | Chuẩn mực GUI | ⚠️ **Phát hiện, chưa giải quyết** | F# Core đã phát hiện được In-Flight State (`rebase-merge`, `MERGE_HEAD`), nhưng chưa có UI Conflict Resolver. |
| **Tìm Kiếm & Lọc Commit (Search)** | Đầy đủ | ⚠️ **Chỉ lọc Branch** | Chưa có thanh search commit message, tác giả, commit hash, khoảng thời gian. |
