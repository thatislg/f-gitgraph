# Tiến Độ Phase 1: Windows First Milestone (Xây Dựng Nền Móng Nhân F#)

Tài liệu này ghi nhận tổng quan mục tiêu, phạm vi công việc, tiêu chuẩn nghiệm thu và nhật ký thực hiện chi tiết cho **Phase 1: Xây dựng nền móng nhân F# Core Engine trên môi trường Windows**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào tiến độ và kiến trúc, không sử dụng mã nguồn mẫu.

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm nhìn & Mục tiêu Cốt lõi
- **Mục tiêu**: Xây dựng thành công bản nhị phân F# Native AOT đầu tiên (`neo-git-core.exe`) chạy độc lập trên Windows 10/11, thay thế toàn bộ tầng nạp dữ liệu và tính toán layout đơn luồng hiện tại của TypeScript.
- **Trọng tâm kỹ thuật**:
  - Giải quyết bài toán độ trễ spawn tiến trình `CreateProcessW` trên Windows bằng cách chạy in-process qua LibGit2 và Memory-Mapped File đọc file `commit-graph`.
  - Phân bổ làn đồ thị song song đa luồng CPU trên F#, tính toán sẵn toàn bộ tọa độ hình học trước khi chuyển sang giao diện.
  - Kết nối hoàn hảo với tầng giao diện Webview Preact đã xây dựng từ Phase 1 (các nút lục giác, vầng sáng neon ambient, xem trước avatar zoom 5x, panel commit message).
  - Bảo đảm an toàn tuyệt đối 100% cho các thao tác ghi (commit, push, pull, rebase...) bằng cách tiếp tục định tuyến qua Git gốc (`git.exe`).

### 1.2. Trạng Thái Hiện Tại (Status)
- **Trạng thái**: Đang trong giai đoạn chuẩn bị kỹ thuật (In Planning / Ready for Implementation).
- **Tiến độ tổng thể**: 0% hoàn thành (Chưa khởi tạo mã nguồn dự án F#).

---

## 2. Danh Mục Các Đầu Việc Cần Làm (Work Breakdown)

### 📋 Nhóm Việc 1: Khởi Tạo Dự Án F# & Cấu Hình Biên Dịch Native AOT
- [ ] Khởi tạo thư mục và solution F# độc lập trong cấu trúc dự án.
- [ ] Cấu hình xuất bản mã máy Native AOT cho Windows 64-bit (`win-x64`).
- [ ] Kiểm tra kích thước file thực thi đầu ra (mục tiêu: dưới 10MB) và tốc độ khởi động (mục tiêu: dưới 5 phần nghìn giây).

### 📋 Nhóm Việc 2: Xây Dựng Tầng Miền Nghiệp Vụ & Mô Hình Hóa Lỗi (Domain Model)
- [ ] Định nghĩa kiểu dữ liệu đại số cho các đối tượng Git: Mã băm SHA-1/SHA-256, tác giả, commit cha, các nhánh cục bộ, nhánh máy chủ, thẻ phát hành.
- [ ] Mô hình hóa các trạng thái đang diễn ra dở dang trong kho mã nguồn: Đang sáp nhập (Merge), Đang rebase, Đang cherry-pick, Đang bisect.
- [ ] Xây dựng bảng mã lỗi vét cạn: Xung đột file khóa `index.lock`, nhánh đã tồn tại, xóa nhánh chưa merge, xung đột tệp checkout.

### 📋 Nhóm Việc 3: Tầng Đọc Dữ Liệu Git Tốc Độ Cao Trên Windows
- [ ] Tích hợp thư viện C gốc LibGit2 để đọc lịch sử commit trực tiếp từ thư mục Git.
- [ ] Cài đặt module đọc trực tiếp file nhị phân `commit-graph` bằng cơ chế ánh xạ bộ nhớ (Memory-Mapped Files).
- [ ] Tối ưu hóa bộ nhớ: Sử dụng các vùng đệm liên tục để trích xuất thông tin commit mà không tạo rác cho bộ gom rác.

### 📋 Nhóm Việc 4: Thuật Toán Xếp Làn Đồ Thị Topo Song Song (Parallel DAG Solver)
- [ ] Chuyển đổi và tinh gọn thuật toán phân làn từ TypeScript sang F#.
- [ ] Cài đặt cơ chế phân phối tính toán song song đa luồng CPU theo từng lô commit.
- [ ] Tính sẵn toàn bộ tọa độ các nút, đường cong rẽ nhánh, đường sáp nhập và màu sắc tương ứng.

### 📋 Nhóm Việc 5: Giao Thức Giao Tiếp Nội Bộ (IPC Daemon & Streaming)
- [ ] Xây dựng cơ chế trao đổi thông điệp hai chiều giữa Extension Host (Node.js) và F# qua đường ống xuất nhập chuẩn (Stdio).
- [ ] Ứng dụng định dạng nhị phân siêu nén MessagePack để truyền dữ liệu đồ thị nhanh gấp nhiều lần so với chuỗi JSON.
- [ ] Hiện thực cơ chế phân trang cửa sổ ảo: Chỉ truyền tải đúng số lượng commit hiển thị trên màn hình kèm vùng đệm an toàn.

### 📋 Nhóm Việc 6: Ghép Nối Với Giao Diện Webview & Bảo Toàn Lệnh Ghi
- [ ] Kết nối dữ liệu từ engine F# vào tầng Webview Preact (Phase 1).
- [ ] Tách riêng luồng xử lý ghi: Ủy thác 100% các lệnh commit, push, pull, merge, rebase cho tiến trình `git.exe` gốc.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. File nhị phân `neo-git-core.exe` chạy độc lập hoàn toàn trên Windows 10 và Windows 11 mà không đòi hỏi cài đặt bất kỳ gói .NET runtime nào.
2. Thời gian nạp và tính toán đồ thị trên kho mã nguồn có 50.000 commits đạt mốc dưới **300 phần nghìn giây** (so với 8-15 giây của bản cũ).
3. Toàn bộ các tương tác giao diện từ Phase 1 (nút lục giác, hiệu ứng neon ambient khi hover/chọn, click avatar zoom 5x, panel commit message) hoạt động mượt mà ở tốc độ 60 khung hình/giây, con trỏ chuột không bị khựng đơ.
4. Mọi thao tác ghi (commit, push, tạo nhánh, xóa nhánh) kiểm thử thành công trên Windows, bảo toàn chữ ký số GPG/SSH và cơ chế xác thực tài khoản Git Credential Manager.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo cấu trúc tài liệu tiến độ Phase 1. Xác lập tổng quan mục tiêu, phạm vi đầu việc và tiêu chuẩn nghiệm thu cho môi trường Windows.
