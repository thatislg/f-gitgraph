# Tiến Độ Phase 4: Unified Packaging & Release Milestone (Đóng Gói Toàn Diện & Tự Động Hóa CI/CD)

Tài liệu này ghi nhận tổng quan mục tiêu, phạm vi công việc, tiêu chuẩn nghiệm thu và nhật ký thực hiện chi tiết cho **Phase 4: Tự động hóa quy trình xuất bản đa nền tảng, đóng gói gói cài đặt toàn diện (VSIX) và nghiệm thu tổng thể**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào tiến độ và kiến trúc, không sử dụng mã nguồn mẫu.

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm nhìn & Mục tiêu Cốt lõi

- **Mục tiêu**: Hợp nhất toàn bộ thành quả của 3 giai đoạn trước (Windows, Linux, macOS) vào một quy trình tự động hóa xuất bản hoàn chỉnh, tạo ra file cài đặt VSIX duy nhất có khả năng hoạt động trên mọi máy tính của người dùng và hoàn tất nghiệm thu toàn diện sản phẩm.
- **Trọng tâm kỹ thuật**:
  - Thiết lập chu trình tích hợp và phân phối liên tục (CI/CD) kích hoạt tự động trên hệ thống máy chủ, biên dịch đồng thời mã máy Native AOT cho cả 3 hệ điều hành mỗi khi có mã nguồn mới.
  - Đóng gói bản cài đặt toàn diện (Universal VSIX) chứa sẵn đầy đủ các file nhị phân của mọi nền tảng, giúp người dùng trong nhóm chỉ cần cài duy nhất một file là sử dụng được ngay trên mọi thiết bị.
  - Chuẩn bị sẵn cơ chế đóng gói chuyên biệt từng hệ điều hành (Platform-specific VSIX) phục vụ phát hành chính thức lên kho Visual Studio Marketplace.
  - Tiến hành nghiệm thu toàn diện chu trình làm việc thực tế với Git, đảm bảo tính toàn vẹn 100% của dữ liệu mã nguồn.
  - _(Lưu ý: Bản đóng gói thử nghiệm cục bộ riêng cho từng hệ điều hành đã được thực hiện ở cuối mỗi Phase tương ứng, ví dụ Nhiệm vụ 7.3 của Phase 1 Windows. Phase 4 tập trung vào quy trình CI/CD tự động và hợp nhất phân phối toàn cầu)._

### 1.2. Trạng Thái Hiện Tại (Status)

- **Trạng thái**: Đang chờ kết quả từ Phase 3 (Pending on Phase 3 completion).
- **Tiến độ tổng thể**: 0% hoàn thành.

---

## 2. Danh Mục Các Đầu Việc Cần Làm (Work Breakdown)

### 📋 Nhóm Việc 1: Tự Động Hóa Quy Trình Xuất Bản (CI/CD Pipeline)

- [ ] Thiết lập quy trình tự động hóa kích hoạt song song 3 môi trường máy ảo độc lập: Windows, Linux và macOS.
- [ ] Tự động hóa các bước kiểm thử đơn vị (Unit Tests) trên cả tầng F# Core và tầng Webview Preact trước khi biên dịch.
- [ ] Tự động xuất bản các file nhị phân Native AOT và thu thập vào cấu trúc thư mục phân phối `bin/` chuẩn hóa.

### 📋 Nhóm Việc 2: Đóng Gói File Cài Đặt Toàn Diện (Universal VSIX)

- [ ] Cấu hình công cụ đóng gói extension để thu thập toàn bộ các file nhị phân của Windows, Linux và macOS vào chung một file cài đặt `.vsix`.
- [ ] Kiểm soát tổng dung lượng gói cài đặt (mục tiêu: duy trì ở mức tối ưu từ 30MB đến 35MB).
- [ ] Thử nghiệm cài đặt file VSIX trực tiếp trên các máy thật chạy hệ điều hành khác nhau (máy bàn Windows 11, laptop Ubuntu 22.04/24.04, máy tính Fedora 39/40, Macbook Pro chip M1/M2/M3).

### 📋 Nhóm Việc 3: Chuẩn Bị Cơ Chế Phát Hành Marketplace (Platform-Specific VSIX)

- [ ] Cấu hình kịch bản xuất bản cho từng nền tảng riêng biệt nhằm phục vụ người dùng trên Visual Studio Marketplace (giảm kích thước tải về xuống chỉ còn 8MB mỗi gói).
- [ ] Kiểm tra tính chính xác của các định danh nền tảng theo chuẩn của VS Code Marketplace.

### 📋 Nhóm Việc 4: Nghiệm Thu Kỹ Thuật & An Toàn Dữ Liệu Toàn Diện

- [ ] Thực hiện bài kiểm thử hồi quy đối với toàn bộ các thao tác ghi dữ liệu:
  - Tạo commit mới, gắn tag phiên bản.
  - Chuyển nhánh, tạo nhánh mới, xóa nhánh (xóa thường và ép xóa).
  - Sáp nhập nhánh (Merge), giải quyết xung đột (Conflict resolution).
  - Tái cơ cấu commit (Rebase), chọn lọc commit (Cherry-pick).
  - Đẩy mã nguồn lên máy chủ từ xa (Push), kéo cập nhật (Pull/Fetch).
- [ ] Kiểm tra sự tương thích tuyệt đối với các công cụ bảo mật: GPG Commit Signing, SSH Key Signing, Git Credential Manager, xác thực hai lớp (2FA) và đăng nhập đơn (SSO) doanh nghiệp.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. Quy trình CI/CD tự động xây dựng thành công bộ file nhị phân của cả 3 hệ điều hành và đóng gói thành công file VSIX mà không cần bất kỳ sự can thiệp thủ công nào.
2. File cài đặt Universal VSIX được kiểm thử thành công trên toàn bộ các môi trường máy thật của nhóm phát triển (Windows 10/11, Ubuntu, Fedora, macOS).
3. 100% các thao tác thay đổi dữ liệu Git hoạt động an toàn, không làm mất bất kỳ commit hay thay đổi cục bộ nào của người dùng.
4. Tài liệu hướng dẫn sử dụng, ghi chú phát hành (Release Notes) và bản thông số kỹ thuật được hoàn thiện đầy đủ.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo tài liệu tiến độ Phase 4. Xác lập tổng quan mục tiêu, phạm vi công việc và tiêu chuẩn nghiệm thu cho khâu đóng gói xuất bản toàn diện.
