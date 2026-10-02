# Tiến Độ Phase 2: Linux Milestone (Mở Rộng Hệ Sinh Thái Ubuntu & Fedora)

Tài liệu này ghi nhận tổng quan mục tiêu, phạm vi công việc, tiêu chuẩn nghiệm thu và nhật ký thực hiện chi tiết cho **Phase 2: Mở rộng nhân F# Core Engine sang hệ điều hành Linux (Ubuntu, Fedora, Debian)**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào tiến độ và kiến trúc, không sử dụng mã nguồn mẫu.

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm nhìn & Mục tiêu Cốt lõi
- **Mục tiêu**: Đưa bản nhị phân F# Native AOT (`neo-git-core`) sang hoạt động ổn định, hiệu năng cao trên các bản phân phối Linux phổ biến nhất của cộng đồng nhà phát triển (Ubuntu 20.04+, Fedora 38+, Debian 11+).
- **Trọng tâm kỹ thuật**:
  - Tận dụng toàn bộ mô hình dữ liệu (Domain Model) và thuật toán phân làn đồ thị đã hoàn thiện và kiểm chứng trên Windows ở Phase 1.
  - Giải quyết triệt để rào cản tương thích các phiên bản thư viện C chuẩn (`glibc`) giữa các bản phân phối Linux cũ và mới.
  - Cài đặt cơ chế kiểm tra và tự động cấp cờ thực thi (`chmod +x`) ngay từ tầng điều phối TypeScript, giúp người dùng cài extension là chạy ngay mà không gặp lỗi từ chối quyền truy cập.
  - Thực hiện bài kiểm tra tải giới hạn (stress-test) trên kho mã nguồn Linux kernel chính thống với hơn 1 triệu commit.

### 1.2. Trạng Thái Hiện Tại (Status)
- **Trạng thái**: Đang chờ kết quả từ Phase 1 (Pending on Phase 1 completion).
- **Tiến độ tổng thể**: 0% hoàn thành.

---

## 2. Danh Mục Các Đầu Việc Cần Làm (Work Breakdown)

### 📋 Nhóm Việc 1: Thiết Lập Môi Trường Biên Dịch Native AOT Chuẩn Cho Linux
- [ ] Cấu hình môi trường build Native AOT trên nền tảng container Linux có phiên bản thư viện `glibc` ổn định (chuẩn Ubuntu 20.04 LTS).
- [ ] Xuất bản file nhị phân mã máy `neo-git-core` cho kiến trúc x64 (`linux-x64`) và kiến trúc ARM64 (`linux-arm64`).
- [ ] Xác minh tính tương thích ngược của file nhị phân trên Ubuntu 22.04, Ubuntu 24.04, Debian 12 và Fedora 39/40 mà không phát sinh lỗi thiếu thư viện động.

### 📋 Nhóm Việc 2: Chuẩn Hóa Đường Dẫn & Hệ Thống Tệp Unix
- [ ] Kiểm tra cơ chế phân giải đường dẫn tuyệt đối và đường dẫn tương đối trên hệ thống tệp Linux.
- [ ] Đảm bảo việc quét và đọc các file tham chiếu trong thư mục Git xử lý chính xác tính năng phân biệt chữ hoa chữ thường (Case-Sensitivity) của Linux.

### 📋 Nhóm Việc 3: Tự Động Hóa Phân Quyền Thực Thi File Nhị Phân
- [ ] Tích hợp logic tự động kiểm tra cờ thực thi (`executable bit`) của file nhị phân tại thời điểm nạp extension trên Linux.
- [ ] Tự động cấp quyền chạy (`0755`) cho file nhị phân trong thư mục extension của người dùng nếu cờ quyền bị mất trong quá trình giải nén file cài đặt.

### 📋 Nhóm Việc 4: Kiểm Thử Cực Hạn (Stress-Testing Trên Kho Linux Kernel)
- [ ] Thử nghiệm nạp và phân tích đồ thị trên kho mã nguồn Linux kernel chính thống (quy mô trên 1.000.000 commits).
- [ ] Đo đạc mức độ chiếm dụng bộ nhớ RAM (mục tiêu: duy trì dưới 150MB trong suốt phiên làm việc).
- [ ] Đánh giá độ trễ phản hồi khi cuộn trang nhanh qua hàng nghìn commit.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. File nhị phân `neo-git-core` chạy mượt mà trên cả môi trường máy ảo Ubuntu LTS và Fedora mới nhất mà không yêu cầu cài đặt thêm gói phụ trợ.
2. Tiện ích mở rộng khởi động tức thì ngay sau khi cài đặt trên VS Code Linux, không xuất hiện bất kỳ cảnh báo lỗi từ chối quyền truy cập nào.
3. Nạp thành công kho mã nguồn quy mô cực lớn (trên 100.000 commits) với thời gian dưới 500 phần nghìn giây, thanh cuộn đạt độ mượt tối đa.
4. Mọi thao tác ghi dữ liệu (commit, push, pull, merge) trên Linux được kiểm tra toàn diện, bảo đảm an toàn dữ liệu và tuân thủ các git hook cục bộ của dự án.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo tài liệu tiến độ Phase 2. Xác lập tổng quan mục tiêu, phạm vi công việc và tiêu chuẩn nghiệm thu cho môi trường Linux.
