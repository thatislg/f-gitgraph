# Thiết Kế Kỹ Thuật Chi Tiết: Phase 1 Windows Milestone

Thư mục này chứa toàn bộ hệ thống các bản thiết kế kỹ thuật chi tiết (Design Specifications) phục vụ cho quá trình hiện thực hóa **Phase 1: Xây dựng nền móng nhân F# Core Engine trên môi trường Windows** theo kế hoạch tại [001_windows_progress.md](file:///d:/Kojin/f-gitgraph/docs/03_progess/001_windows_progress.md).

> [!NOTE]
> Mọi tài liệu thiết kế trong thư mục này được biên soạn nghiêm ngặt theo nguyên tắc: **100% mô tả bằng ngôn ngữ tự nhiên**, tập trung vào kiến trúc hệ thống, cấu trúc dữ liệu, luồng giải thuật và đặc tả giao thức, tuyệt đối không sử dụng mã nguồn mẫu.

---

## Danh Mục Các Bản Thiết Kế Chi Tiết

1. **[01_Project_Structure_And_NativeAOT.md](01_Project_Structure_And_NativeAOT.md)**:
   - Bản thiết kế cấu trúc solution F# độc lập, phân chia các tầng module (`Domain`, `Storage`, `Graph`, `Transport`, `Program`).
   - Cấu hình xuất bản mã máy Native AOT cho Windows 64-bit (`win-x64`), kỹ thuật tối ưu dung lượng file (< 10MB) và độ trễ khởi động lạnh (< 5ms).

2. **[02_Domain_Model_And_Error_Taxonomy.md](02_Domain_Model_And_Error_Taxonomy.md)**:
   - Mô hình hóa thực thể cốt lõi Git: Mã băm SHA-1/SHA-256 bất biến, Tác giả kèm múi giờ, Commit Node, Phân loại tham chiếu nhánh và thẻ phát hành.
   - Mô hình hóa các trạng thái dở dang (In-Flight States): Sáp nhập dở (Merging), Rebase dở, Cherry-pick dở, Bisect dở.
   - Bảng phân loại lỗi hệ thống vét cạn và nguyên tắc xử lý lỗi qua kiểu kết quả `Result`.

3. **[03_Fast_Git_Storage_Reader.md](03_Fast_Git_Storage_Reader.md)**:
   - Thiết kế tầng giao tiếp thư viện C gốc LibGit2 trên Windows không qua tiến trình CLI.
   - Cơ chế ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) đọc file nhị phân `commit-graph` trong 1-2ms kèm cơ chế dự phòng tự động.
   - Kỹ thuật tối ưu hóa bộ nhớ Zero-Allocation và giải mã chuỗi UTF-8 tiếng Việt chính xác 100%.

4. **[04_Parallel_DAG_Layout_Solver.md](04_Parallel_DAG_Layout_Solver.md)**:
   - Thiết kế thuật toán sắp xếp Topo (Kahn / Tarjan) và xử lý các trường hợp đặc biệt (shallow clone, orphan branch, multi-root).
   - Thuật toán phân bổ làn đồ thị thu gọn về bên trái (Left-compact Lane Allocation) với bể làn tái sử dụng và bảo toàn màu sắc nhánh.
   - Cơ chế phân lô tính toán song song đa luồng CPU và sinh dữ liệu tọa độ hình học phẳng sẵn sàng để Webview vẽ ngay.

5. **[05_IPC_Stdio_Streaming_Protocol.md](05_IPC_Stdio_Streaming_Protocol.md)**:
   - Thiết kế cơ chế quản lý vòng đời tiến trình F# sidecar trong TypeScript (khởi động ngầm, tự phục hồi, thu hồi tài nguyên).
   - Đặc tả giao thức truyền thông nhị phân MessagePack qua đường ống Stdio RPC, triệt tiêu chi phí tuần tự hóa chuỗi JSON.
   - Cơ chế phân trang cửa sổ ảo (Virtual Scrolling Window Streaming) đáp ứng dữ liệu theo khung nhìn trong dưới 5ms.

6. **[06_Webview_Integration_And_Git_Mutator.md](06_Webview_Integration_And_Git_Mutator.md)**:
   - Thiết kế ghép nối dữ liệu hình học F# vào giao diện Webview Preact (Phase 1), bảo toàn 100% các thành phần UI đã hoàn thiện.
   - Thiết kế module thực thi thao tác ghi an toàn (`GitCliMutator.ts`): ủy thác 100% các lệnh commit, push, pull, merge, rebase cho Git CLI gốc để bảo toàn chữ ký số GPG/SSH và Git Credential Manager.
   - Thiết kế cơ chế File Watcher phát hiện biến động và cập nhật vi sai (Incremental Update).

7. **[07_Benchmarking_And_Verification_Plan.md](07_Benchmarking_And_Verification_Plan.md)**:
   - Kế hoạch kiểm thử so sánh tính tương đương đồ thị 100% giữa thuật toán F# và TypeScript.
   - Phương pháp đo đạc và tiêu chí nghiệm thu 3 chỉ số then chốt trên Windows (thời gian nạp ban đầu, mức chiếm RAM, độ mượt khung hình).
