# 02. Tài Liệu Thiết Kế Kỹ Thuật (Technical Design)

Thư mục này lưu trữ các bản thiết kế chi tiết (Design Specifications) cho quá trình hiện thực hóa dự án F-GitGraph:

- Kiến trúc module và cấu trúc các tầng xử lý (Layered Architecture).
- Thiết kế mô hình dữ liệu (Domain Modeling) và xử lý lỗi.
- Đặc tả giao thức truyền thông liên tiến trình (IPC Protocol Specification).
- Thiết kế thuật toán tính toán đồ thị song song (Parallel Graph Topology Design).

---

## Danh Mục Các Giai Đoạn Thiết Kế

- **[001_windows: Thiết Kế Chi Tiết Phase 1 Windows Milestone](001_windows/README.md)**:
  Hệ thống 7 bản thiết kế chi tiết bao gồm: Cấu trúc dự án & Native AOT, Domain Model & Bảng mã lỗi, Fast Git Storage Reader, Parallel DAG Layout Solver, Giao thức IPC Stdio Streaming, Tích hợp Webview & Git Mutator, và Kế hoạch kiểm thử nghiệm thu.
