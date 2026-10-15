# F-GitGraph Documentation

Tài liệu kỹ thuật và kiến trúc cho dự án F-GitGraph.

## Mục lục tài liệu

### 🔬 [01. Hồ Sơ Khảo Sát & Phân Tích Kỹ Thuật (Investigation & Audits)](01_investigation/README.md)
Thư mục [`docs/01_investigation/`](01_investigation/README.md) tổng hợp toàn bộ các nghiên cứu, kiểm toán và phân tích kỹ thuật:
- **[phase3_Reborn/](01_investigation/phase3_Reborn/README.md)**: Khảo sát 12 trụ cột Git CLI, kiểm toán 45 tiêu chí năng lực F-GitGraph, bản thiết kế tiến hóa Blueprint, hệ thống thẩm mỹ Cyber-Lab và âm thanh vi mô.
- **[phase2_Investigation/](01_investigation/phase2_Investigation/README.md)**: Khảo sát kiến trúc đa nền tảng (Windows, Linux, macOS).
- **[phase1_Avatar/](01_investigation/phase1_Avatar/README.md)**: Nghiên cứu nút lục giác Hexagon, Avatar ClipPath, Zoom 5x, và Neon Ambient Gradient.
- **[core_git/](01_investigation/core_git/README.md)**: Nghiên cứu điểm nghẽn hiệu năng của TypeScript và kiến trúc F# Native AOT Core.

---

### 📐 [02. Thiết Kế Kỹ Thuật (Design Specifications)](02_design/README.md)
Thư mục [`docs/02_design/`](02_design/README.md) lưu trữ các bản thiết kế chi tiết (Design Specifications) chuẩn Design by Word:
- **[Phase 1: Hồ Sơ Thiết Kế Nền Tảng F# Core Engine (Đã Hoàn Thành & Đóng Gói)](02_design/phase1/README.md)**: Hệ thống 12 bản thiết kế chi tiết về kiến trúc Native AOT, DAG layout solver, Stdio streaming và quy trình xuất bản VSIX.
- **[Phase 3: Hồ Sơ Thiết Kế Kỹ Thuật Reborn (Đang Thực Hiện)](02_design/phase3/README.md)**:
  - **[01. Thiết Kế Tầng Backend & Mutator Cho Staging](02_design/phase3/01_Staging_Backend_And_Mutator_Design.md)**: Mở rộng `GitCliMutator.ts`, bộ phân tích cú pháp `git status --porcelain=v2`, và hệ thống kiểu dữ liệu RPC.
  - **[02. Thiết Kế Giao Diện Staging Area & Commit Composer](02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md)**: Cấu trúc component, khung đinh tán chữ thập góc (`+`) `CornerCrossFrame.tsx`, cơ chế hover-to-reveal chống rối mắt, huy hiệu trạng thái Neon và bộ đếm 50 chars.
  - **[03. Tích Hợp Đồng Bộ Working Tree & File Watcher](02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md)**: Cơ chế kết nối dòng "Uncommitted changes" với Staging Inspector mà không phá vỡ hình học SVG, và thuật toán Debounce 150ms chống bão sự kiện.

---

### 📋 [03. Nhật Ký Tiến Độ (Progress & Worklogs)](03_progess/README.md)
Thư mục [`docs/03_progess/`](03_progess/README.md) theo dõi tiến độ thực tế theo từng giai đoạn:
- **[Phase 1: Tiến Độ Nhân F# Core Engine Đa Nền Tảng (Đã Hoàn Thành)](03_progess/phase1/README.md)**: Windows, Linux, macOS và Release VSIX.
- **[Phase 3: Tiến Độ Reborn Full Git App (Đang Triển Khai)](03_progess/phase3/README.md)**:
  - **[Chặng 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit](03_progess/phase3/001_phase3_1_staging_and_composer.md)**: Chi tiết bảng kiểm kê 16 tệp tin tác động, phân rã 28 nhiệm vụ kỹ thuật con, gắn hồ sơ thiết kế tham chiếu trực tiếp.
  - **[Chặng 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Toàn Cục](03_progess/phase3/002_phase3_2_3pane_workspace.md)**.
  - **[Chặng 3.3: Quản Lý Stash & So Sánh Vi Sai Đa Commit](03_progess/phase3/003_phase3_3_stash_and_multi_diff.md)**.
  - **[Chặng 3.4: Tái Cấu Trúc Lịch Sử & Xử Lý Xung Đột Trực Quan](03_progess/phase3/004_phase3_4_rebase_and_conflict.md)**.
  - **[Bảng Kiểm Kê & Nghiệm Thu 60 Tính Năng Tập Trung (FEATURE_CHECKLIST.md)](03_progess/phase3/FEATURE_CHECKLIST.md)**.

---

### 📊 [04. Báo Cáo Nghiệm Thu & Đo Đạc (Reports & Verification)](04_reports/README.md)
- **[Quy Chuẩn Đo Đạc & Báo Cáo Lỗi Biên Dịch](04_reports/RULES_COMPILATION_ERROR_TRACKING.md)**: Quy chuẩn ghi vết lỗi biên dịch 4 cổng, phân loại `[DESIGN_DEFECT]` vs `[DEV_BUG]` và công thức đo lường tỷ lệ chất lượng thiết kế vs lập trình khi dùng AI.
- **[phase3](04_reports/phase3/)**: Báo cáo tiến độ, đo đạc và nghiệm thu Phase 3 (Reborn).
- **[001_windows](04_reports/001_windows/README.md)**: Báo cáo đo đạc hiệu năng, kiểm thử tương đương đồ thị và an toàn dữ liệu trên Windows.
- **[002_linux](04_reports/002_linux/README.md)**: Báo cáo tương thích `glibc`, kiểm thử stress-test kho Linux kernel và tự cấp quyền `chmod +x`.
- **[003_macos](04_reports/003_macos/README.md)**: Báo cáo tối ưu mã máy ARM64/Intel, kiểm định Gatekeeper và hiển thị Retina 120Hz.
- **[004_release](04_reports/004_release/README.md)**: Báo cáo tự động hóa CI/CD, kiểm định Universal VSIX và biên bản bàn giao tổng thể.


---

### 🐛 [05. Theo Dõi Sự Cố & Vấn Đề Kỹ Thuật (Issues Tracking)](05_issues/README.md)
Thư mục [`docs/05_issues/`](05_issues/README.md) ghi nhận toàn bộ các vấn đề kỹ thuật phát sinh, lỗi môi trường và rủi ro tương thích phục vụ đối soát và đồng bộ lên GitHub Issues:
- **[ISSUE-001: Vitest hookTimeout 10s trên Windows](05_issues/001_vitest_hook_timeout_windows.md)**: Hiện tượng ngắt hook `beforeAll` do chi phí spawn 7 lệnh Git trong `makeRepo()` trên Windows, phân tích ranh giới ảnh hưởng và 3 phương án xử lý đề xuất.
