# 03. Nhật Ký Tiến Độ & Báo Cáo Thực Hiện (Progress & Worklogs)

Thư mục này ghi nhận toàn bộ tiến trình triển khai thực tế của dự án Neo Git Graph:
- Nhật ký thực hiện theo từng chặng (Milestone Tracking: Windows -> Linux -> macOS).
- Báo cáo kết quả kiểm thử và benchmark đo đạc hiệu năng thực tế.
- Biên bản nghiệm thu theo từng tiêu chí kỹ thuật (Definition of Done - DoD).
- Ghi nhận các vấn đề phát sinh (Issue log) và giải pháp khắc phục.

---

## Danh Mục Tiến Độ 4 Giai Đoạn Dự Kiến

- **[Phase 1: Windows First Milestone](phase1_windows/progress.md)**:
  Xây dựng nền móng nhân F# Core Engine trên môi trường Windows (Domain Model, Fast Reader, Parallel Layout Solver, Stdio IPC, nghiệm thu an toàn lệnh ghi).
- **[Phase 2: Linux Milestone](phase2_linux/progress.md)**:
  Mở rộng nhân F# Core sang hệ điều hành Linux (Ubuntu, Fedora, Debian), giải quyết tương thích `glibc`, tự động cấp quyền `chmod +x` và stress-test trên kho Linux kernel.
- **[Phase 3: macOS Milestone](phase3_macos/progress.md)**:
  Hoàn thiện nhân F# trên macOS (Apple Silicon M-series ARM64 & Intel x64), xử lý rào cản bảo mật Apple Gatekeeper, kiểm thử hiển thị mượt mà trên màn hình Retina 120Hz.
- **[Phase 4: Unified Packaging & Release Milestone](phase4_release/progress.md)**:
  Tự động hóa CI/CD xuất bản đa nền tảng, đóng gói gói cài đặt toàn diện Universal VSIX (~30-35MB) và nghiệm thu an toàn 100% cho mọi thao tác Git.

