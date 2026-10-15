# Phase 1: Xây Dựng Nền Móng Nhân F# Core Engine (Đã Hoàn Thành)

Thư mục này đóng gói toàn bộ tài liệu nhật ký tiến độ thực hiện của **Phase 1: Xây dựng nền móng nhân F# Core Engine (.NET Native AOT) đa nền tảng** cho F-GitGraph.

> [!NOTE]
> Toàn bộ các nhóm việc kỹ thuật cốt lõi trên Windows (từ Nhóm Việc 1 đến Nhóm Việc 12, bao gồm cả Commit Ordering Topological/Date, Overlay Inspector, và Avatar Zoom) đã được nghiệm thu hoàn thành 100%, kiểm thử zero-regression (dotnet test 62/62, vitest 165/165, typecheck/lint 0 lỗi) và đóng gói VSIX thành công.

---

## Danh Mục Hồ Sơ Tiến Độ Phase 1

- **[001. Windows First Milestone](001_windows_progress.md)**:
  - Khởi tạo dự án F# & Native AOT (`win-x64`).
  - Thiết kế Domain Model & Error Taxonomy.
  - Tầng đọc dữ liệu nhị phân siêu tốc (`commit-graph` Memory-Mapped & LibGit2).
  - Thuật toán phân làn đồ thị DAG song song đa luồng CPU.
  - Giao thức IPC Stdio Daemon MessagePack streaming.
  - Tích hợp Webview Dumb Renderer & GitCliMutator an toàn 100%.
  - Benchmark & Đo đạc kiểm thử tương đương.
  - Rebranding, dọn dẹp backend TS cũ và iconography.
  - Khắc phục sự cố đồ thị, đồng bộ hình học và bổ sung Commit Ordering (Topological/Date).
  - *Trạng thái*: **100% Hoàn thành (Completed)**.

- **[002. Linux Milestone](002_linux_progress.md)**:
  - Mở rộng nhân F# sang Ubuntu, Fedora, Debian (`linux-x64`, `linux-arm64`).
  - Tương thích `glibc`, tự động cấp quyền `chmod +x` và stress-test Linux kernel.
  - *Trạng thái*: **Đã đóng gói kế thừa (Packaged)**.

- **[003. macOS Milestone](003_macos_progress.md)**:
  - Hoàn thiện nhân F# trên Apple Silicon M-series (`osx-arm64`) & Intel (`osx-x64`).
  - Xử lý Apple Gatekeeper codesign và kiểm thử Retina 120Hz.
  - *Trạng thái*: **Đã đóng gói kế thừa (Packaged)**.

- **[004. Unified Packaging & Release Milestone](004_release_progress.md)**:
  - Tự động hóa CI/CD xuất bản đa nền tảng và đóng gói Universal VSIX.
  - *Trạng thái*: **Đã đóng gói kế thừa (Packaged)**.
