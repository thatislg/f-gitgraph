# 02. Tài Liệu Thiết Kế Kỹ Thuật (Technical Design)

Thư mục này lưu trữ các bản thiết kế chi tiết (Design Specifications) cho quá trình hiện thực hóa dự án F-GitGraph theo từng giai đoạn phát triển:

- Kiến trúc module và cấu trúc các tầng xử lý (Layered Architecture).
- Thiết kế mô hình dữ liệu (Domain Modeling) và xử lý lỗi.
- Đặc tả giao thức truyền thông liên tiến trình (IPC Protocol Specification).
- Thiết kế thuật toán tính toán đồ thị song song (Parallel Graph Topology Design).

---

## Danh Mục Các Giai Đoạn Thiết Kế

### 📐 [Quy Chuẩn Thiết Kế Kỹ Thuật "Design by Word" (RULES_DESIGN_SPECIFICATION.md)](RULES_DESIGN_SPECIFICATION.md)

Quy chuẩn bắt buộc cho mọi hồ sơ thiết kế: 7 nguyên tắc bất biến (Design by Word, ranh giới an toàn 4 tầng, bảo toàn hình học SVG, thẩm mỹ Cyber-Lab, hợp đồng RPC định kiểu, ma trận test song hành, quy trình xử lý `[DESIGN_DEFECT]`), cấu trúc khung mẫu chuẩn 7 phần và Checklist 10 điểm kiểm định chất lượng thiết kế.

---

### 📦 [Phase 1: Hồ Sơ Thiết Kế Nền Tảng F# Core Engine (ĐÃ HOÀN THÀNH & ĐÓNG GÓI)](phase1/README.md)

Thư mục [`phase1/`](phase1/README.md) đóng gói 12 bản thiết kế chi tiết ban đầu:

- **[Thư mục 001_windows](phase1/001_windows/README.md)**: Hệ thống 12 bản thiết kế chi tiết bao gồm: Cấu trúc dự án & Native AOT, Domain Model & Bảng mã lỗi, Fast Git Storage Reader, Parallel DAG Layout Solver, Giao thức IPC Stdio Streaming, Tích hợp Webview & Git Mutator, Benchmark Plan, Dọn dẹp TS cũ, Iconography, và Khắc phục sự cố đồ thị.
- **[002_Publish.md](phase1/002_Publish.md)**: Quy trình đóng gói và xuất bản VSIX.

---

### 🚀 [Phase 3: Hồ Sơ Thiết Kế Kỹ Thuật Reborn (ĐANG THỰC HIỆN)](phase3/README.md)

Thư mục [`phase3/`](phase3/README.md) lưu trữ các tài liệu thiết kế phục vụ tiến trình nâng cấp F-GitGraph thành một **Full-Featured Git Client App UI**:

- **[01. Thiết Kế Tầng Backend & Mutator Cho Staging](phase3/01_Staging_Backend_And_Mutator_Design.md)**: Mở rộng `GitCliMutator.ts` cho các lệnh stage/unstage/discard/commit, bộ phân tích cú pháp `git status --porcelain=v2`, và hệ thống kiểu dữ liệu RPC.
- **[02. Thiết Kế Giao Diện Staging Area & Commit Composer](phase3/02_Staging_UI_And_Composer_Component_Design.md)**: Hệ thống component `StagingPanel.tsx`, `CommitComposer.tsx` lồng trong khung đinh tán chữ thập góc (`+`) `CornerCrossFrame.tsx`, badges trạng thái Neon A/M/D/R và cơ chế hover-to-reveal chống rối mắt.
- **[03. Tích Hợp Đồng Bộ Working Tree & File Watcher](phase3/03_WorkingTree_Sync_And_Watcher_Integration.md)**: Cơ chế kết nối dòng "Uncommitted changes" với Staging Inspector mà không phá vỡ đồ thị, và thuật toán Debounce 150ms chống quá tải File Watcher.
