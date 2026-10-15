# Tiến Độ Phase 3: macOS Milestone (Apple Silicon & Intel Mac)

Tài liệu này ghi nhận tổng quan mục tiêu, phạm vi công việc, tiêu chuẩn nghiệm thu và nhật ký thực hiện chi tiết cho **Phase 3: Hoàn thiện nhân F# Core Engine trên hệ điều hành macOS (Apple Silicon và Intel)**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào tiến độ và kiến trúc, không sử dụng mã nguồn mẫu.

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm nhìn & Mục tiêu Cốt lõi

- **Mục tiêu**: Đưa bản nhị phân F# Native AOT (`f-gitgraph-core`) hoạt động mượt mà, ổn định trên hệ điều hành macOS, hỗ trợ toàn diện cả dòng chip Apple Silicon (M1/M2/M3/M4) và dòng máy Mac dùng vi xử lý Intel.
- **Trọng tâm kỹ thuật**:
  - Kế thừa toàn vẹn kiến trúc Unix và thuật toán đồ thị đã được tôi luyện qua Phase 1 (Windows) và Phase 2 (Linux).
  - Vượt qua các rào cản bảo mật nghiêm ngặt của Apple (cơ chế Gatekeeper và thuộc tính cách ly tệp khi tải về từ internet).
  - Tối ưu hóa mã máy cho tập lệnh ARM64 của Apple Silicon để đạt hiệu suất tính toán tối đa và tiết kiệm pin.
  - Đảm bảo hiển thị đồ họa SVG (đường cong phân nhánh, vầng sáng neon, avatar độ nét cao) sắc nét tuyệt đối trên màn hình Retina với tần số quét 120Hz (ProMotion).

### 1.2. Trạng Thái Hiện Tại (Status)

- **Trạng thái**: Đang chờ kết quả từ Phase 2 (Pending on Phase 2 completion).
- **Tiến độ tổng thể**: 0% hoàn thành.

---

## 2. Danh Mục Các Đầu Việc Cần Làm (Work Breakdown)

### 📋 Nhóm Việc 1: Biên Dịch Native AOT Cho Kiến Trúc Chip Apple

- [ ] Cấu hình xuất bản mã máy Native AOT cho kiến trúc Apple Silicon (`osx-arm64`).
- [ ] Cấu hình xuất bản mã máy Native AOT cho kiến trúc Intel Mac (`osx-x64`).
- [ ] Kiểm tra tính toàn vẹn và dung lượng file nhị phân độc lập trên macOS (mục tiêu: dưới 8MB mỗi file).

### 📋 Nhóm Việc 2: Giải Quyết Rào Cản Bảo Mật Apple Gatekeeper

- [ ] Tích hợp quy trình ký số tạm thời (ad-hoc code signing) ngay trong khâu xuất bản file nhị phân macOS.
- [ ] Cài đặt cơ chế kiểm tra và tự động gỡ bỏ thuộc tính cách ly tệp (quarantine attribute) từ tầng điều phối TypeScript của tiện ích mở rộng.
- [ ] Kiểm tra việc khởi chạy tiến trình nhân trên các phiên bản macOS hiện đại (macOS Ventura, Sonoma, Sequoia) mà không xuất hiện hộp thoại cảnh báo nhà phát triển không xác định.

### 📋 Nhóm Việc 3: Kiểm Thử Hiển Thị & Trải Nghiệm Đồ Họa Cao Cấp

- [ ] Kiểm tra độ sắc nét của đồ thị commit trên màn hình độ phân giải cao Retina Display, bảo đảm không có hiện tượng mờ ảnh hoặc răng cưa ở các nút lục giác.
- [ ] Kiểm tra độ mượt mà của thao tác cuộn trang và hiệu ứng phóng to avatar (deep zoom 5x) ở tần số quét khung hình 120Hz.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. File nhị phân `f-gitgraph-core` khởi chạy tức thì trên cả Macbook chạy chip Apple Silicon (M-series) và máy Mac chạy chip Intel mà không bị Gatekeeper ngăn chặn.
2. Tốc độ nạp và hiển thị đồ thị trên kho mã nguồn 50.000 commits đạt mốc dưới 200 phần nghìn giây.
3. Toàn bộ hiệu ứng thị giác (vầng sáng neon, đường nét lục giác, viền tím bao quanh dòng commit được chọn) hiển thị hoàn hảo trên giao diện macOS (hỗ trợ cả giao diện nền tối Dark Mode và giao diện sáng Light Mode của hệ thống).
4. Thao tác ký commit bằng khóa phần cứng (YubiKey/GPG/SSH Agent) trên macOS hoạt động trơn tru qua luồng điều phối của Git gốc.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo tài liệu tiến độ Phase 3. Xác lập tổng quan mục tiêu, phạm vi công việc và tiêu chuẩn nghiệm thu cho môi trường macOS.
