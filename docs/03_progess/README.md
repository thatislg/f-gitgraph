# 03. Nhật Ký Tiến Độ & Báo Cáo Thực Hiện (Progress & Worklogs)

Thư mục này ghi nhận toàn bộ tiến trình triển khai thực tế của dự án F-GitGraph theo từng giai đoạn phát triển chiến lược.

---

## 📌 Quy Trình & Hướng Dẫn Vận Hành

- **[000. Hướng Dẫn Quản Lý Công Việc & Đồng Bộ Tiến Độ Bằng GitHub Issues & Projects](000_huong_dan_quan_ly_task_github.md)**:
  - Hướng dẫn cấu trúc phân cấp: Milestone $\rightarrow$ Epics $\rightarrow$ Atomic Sub-tasks.
  - Hướng dẫn Sắp xếp (Sort) theo thứ tự lộ trình logic trên GitHub Projects và Issues.
  - Hướng dẫn quy trình tự động đóng task bằng lệnh commit `closes #<ID>`.

---

## 1. Danh Mục Các Giai Đoạn Phát Triển

### 📦 [Phase 1: Xây Dựng Nền Móng Nhân F# Core Engine (ĐÃ HOÀN THÀNH & ĐÓNG GÓI)](phase1/README.md)

Thư mục [`phase1/`](phase1/README.md) đóng gói toàn bộ hồ sơ tiến độ nền tảng ban đầu:

- **[001. Windows First Milestone](phase1/001_windows_progress.md)**: Xây dựng nền móng F# Native AOT, Domain Model, Fast Reader, Parallel DAG Solver, Stdio IPC, Webview Integration, Commit Ordering và tinh chỉnh UI (_Đã hoàn thành 100%_).
- **[002. Linux Milestone](phase1/002_linux_progress.md)**: Mở rộng sang Ubuntu/Fedora, tương thích `glibc` và tự cấp quyền `chmod +x` (_Đã đóng gói kế thừa_).
- **[003. macOS Milestone](phase1/003_macos_progress.md)**: Hoàn thiện trên Apple Silicon & Intel, xử lý Gatekeeper (_Đã đóng gói kế thừa_).
- **[004. Unified Packaging & Release Milestone](phase1/004_release_progress.md)**: Đóng gói Universal VSIX và CI/CD (_Đã đóng gói kế thừa_).

---

### 🚀 [Phase 3: Reborn — Tiến Hóa Thành Ứng Dụng Git UI Hoàn Chỉnh (ĐANG THỰC HIỆN)](phase3/README.md)

Thư mục [`phase3/`](phase3/README.md) theo dõi tiến độ chi tiết từng chặng nâng cấp F-GitGraph thành một **Full-Featured Git Client App UI**:

- **[Chặng 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)](phase3/001_phase3_1_staging_and_composer.md)**:
  - Danh sách Unstaged / Staged Files.
  - Stage, Unstage, Discard thay đổi tệp an toàn.
  - Bộ soạn thảo Commit Composer (Title 50-char counter, Body description, Amend toggle, Sign GPG/SSH).
  - Tích hợp File Watcher & Uncommitted changes.
- **[Chặng 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ](phase3/002_phase3_2_3pane_workspace.md)**:
  - Cây điều hướng Left Sidebar Navigator (Branches, Remotes, Tags, Stashes).
  - Thanh công cụ đỉnh Global Toolbar (Fetch, Pull, Push với huy hiệu `↑ahead` / `↓behind`).
  - Thanh tìm kiếm & lọc commit nâng cao (`Ctrl + F`).
  - Bố cục co giãn linh hoạt (Collapsible Sidebar & Dockable Inspector).
- **[Chặng 3.3: Quản Lý Stash & So Sánh Vi Sai Đa Commit](phase3/003_phase3_3_stash_and_multi_diff.md)**:
  - Bảng quản lý Stash chuyên sâu (Save, Pop, Apply, Drop, xem trước diff không cần pop).
  - So sánh vi sai giữa 2 commit bất kỳ (`Ctrl` chọn 2 nodes trên đồ thị).
  - Giao diện Stage từng khối mã (Partial Hunk Staging).
- **[Chặng 3.4: Tái Cấu Trúc Lịch Sử & Xử Lý Xung Đột Trực Quan](phase3/004_phase3_4_rebase_and_conflict.md)**:
  - Trình Visual Interactive Rebase Editor (Kéo thả reorder, Squash, Fixup, Reword, Drop).
  - Trình giải quyết xung đột 3 cột trực quan (In-Flight 3-Way Conflict Resolver).
  - Tương tác Kéo & Thả Git trực quan (Drag & Drop to Merge/Rebase/Cherry-pick).
