# Phase 1: Hồ Sơ Thiết Kế Kỹ Thuật Nền Tảng (Đã Hoàn Thành & Đóng Gói)

Thư mục này đóng gói toàn bộ hệ thống tài liệu thiết kế chi tiết (Design Specifications) cho **Phase 1: Xây dựng nền móng nhân F# Core Engine (.NET Native AOT) trên Windows**.

---

## Danh Mục Hồ Sơ Thiết Kế Phase 1

- **[Thư mục 001_windows (Hệ thống 12 bản thiết kế chi tiết)](001_windows/README.md)**:
  - `01_Project_Structure_And_NativeAOT.md`: Cấu trúc dự án F# và thiết lập xuất bản Native AOT (`win-x64`).
  - `02_Domain_Model_And_Error_Taxonomy.md`: Mô hình miền nghiệp vụ Git và phân loại mã lỗi hệ thống.
  - `03_Fast_Git_Storage_Reader.md`: Đọc dữ liệu nhị phân `commit-graph` qua Memory-Mapped Files & LibGit2.
  - `04_Parallel_DAG_Layout_Solver.md`: Giải thuật sắp xếp topo và phân bổ làn nhánh song song đa luồng CPU.
  - `05_IPC_Stdio_Streaming_Protocol.md`: Giao thức IPC Stdio Daemon MessagePack streaming.
  - `06_Webview_Integration_And_Git_Mutator.md`: Ghép nối dữ liệu Webview và ủy thác thao tác ghi qua Native Git CLI.
  - `07_Benchmarking_And_Verification_Plan.md`: Kế hoạch đo đạc benchmark và kiểm thử tương đương đồ thị.
  - `08_Rebranding_And_Identity_Cleanup.md`: Chuẩn hóa nhận diện thương hiệu F-GitGraph.
  - `09_Legacy_TS_Backend_Cleanup.md`: Dọn dẹp tầng backend TS cũ và tối ưu tài nguyên.
  - `10_Extension_Iconography_Design.md`: Thiết kế hệ thống biểu tượng và icon F-GitGraph.
  - `11_Webview_FSharp_Core_Migration.md`: Di trú toàn diện Webview sang nạp dữ liệu từ nhân F# Core.
  - `12_Graph_Rendering_And_Webview_Fix_Design.md`: Khắc phục sự cố đồ thị, đồng bộ hình học và bổ sung Commit Ordering (Topological/Date).
- **[002_Publish.md](002_Publish.md)**: Hướng dẫn quy trình đóng gói và xuất bản Extension.
