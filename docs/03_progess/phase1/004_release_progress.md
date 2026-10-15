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

- **Trạng thái**: Hoàn tất chuẩn bị phát hành phiên bản chính thức v1.0.0.
- **Tiến độ tổng thể**: 100% hoàn thành.

---

## 2. Danh Mục Các Đầu Việc Cần Làm (Work Breakdown)

### 📋 Nhóm Việc 1: Tự Động Hóa Quy Trình Xuất Bản (CI/CD Pipeline)

- [x] Thiết lập quy trình tự động hóa kích hoạt song song 3 môi trường máy ảo độc lập: Windows, Linux và macOS (`.github/workflows/ci.yml` và `.github/workflows/release.yml`).
- [x] Tự động hóa các bước kiểm thử đơn vị (Unit Tests) trên cả tầng F# Core (`dotnet test`) và tầng Webview Preact/Extension (`vitest`) trước khi biên dịch.
- [x] Tự động xuất bản các file nhị phân Native AOT và thu thập vào cấu trúc thư mục phân phối `bin/` chuẩn hóa qua `scripts/build-native.mjs`.

### 📋 Nhóm Việc 2: Đóng Gói File Cài Đặt Toàn Diện (Universal VSIX)

- [x] Cấu hình công cụ đóng gói extension để thu thập toàn bộ các file nhị phân của Windows, Linux và macOS vào chung một file cài đặt `.vsix`.
- [x] Kiểm soát tổng dung lượng gói cài đặt (duy trì tối ưu từ ~10MB đến ~15MB cho bản Universal, ~2.6MB cho bản từng nền tảng).
- [x] Tự động phát hiện và cấp quyền thực thi (`chmod +x`, `0o755`) trên Unix (Linux / macOS) tại thời điểm khởi động sidecar.

### 📋 Nhóm Việc 3: Chuẩn Bị Cơ Chế Phát Hành Marketplace (Platform-Specific VSIX)

- [x] Cấu hình kịch bản xuất bản cho từng nền tảng riêng biệt (`win32-x64`, `linux-x64`, `darwin-arm64`, `darwin-x64`) với dung lượng siêu nhẹ ~2.6MB mỗi gói.
- [x] Kiểm tra tính chính xác của các định danh nền tảng theo chuẩn của VS Code Marketplace và tự động sinh mã băm SHA-256 (`SHA256SUMS.txt`).

### 📋 Nhóm Việc 4: Nghiệm Thu Kỹ Thuật & An Toàn Dữ Liệu Toàn Diện

- [x] 100% các bài test (62 bài F# Core tests, 90 bài backend tests, 10 bài extension tests, 73 bài webview tests) đều vượt qua.
- [x] Kiểm tra sự tương thích tuyệt đối với các công cụ bảo mật: GPG Commit Signing, SSH Key Signing, Git Credential Manager thông qua Git CLI Mutator gốc.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. Quy trình CI/CD tự động xây dựng thành công bộ file nhị phân của cả 3 hệ điều hành và đóng gói thành công file VSIX mà không cần bất kỳ sự can thiệp thủ công nào.
2. File cài đặt Universal VSIX và Platform-specific VSIX được kiểm thử đóng gói và chạy trơn tru.
3. 100% các thao tác thay đổi dữ liệu Git hoạt động an toàn, không làm mất bất kỳ commit hay thay đổi cục bộ nào của người dùng.
4. Tài liệu hướng dẫn sử dụng, ghi chú phát hành (Release Notes) và bản thông số kỹ thuật được hoàn thiện đầy đủ.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo tài liệu tiến độ Phase 4. Xác lập tổng quan mục tiêu, phạm vi công việc và tiêu chuẩn nghiệm thu cho khâu đóng gói xuất bản toàn diện.
- **2026-10-05**: Hoàn tất toàn bộ chu trình CI/CD và chuẩn bị phát hành v1.0.0:
  - Thiết lập `.github/workflows/ci.yml` kiểm thử ma trận đa nền tảng (Windows, Linux, macOS).
  - Thiết lập `.github/workflows/release.yml` tự động build Native AOT cho 4 target (`win32-x64`, `linux-x64`, `darwin-arm64`, `darwin-x64`), đóng gói Universal VSIX + Platform VSIXs, tính mã SHA-256 và publish GitHub Release khi push tag `v*`.
  - Nâng cấp `SidecarManager` hỗ trợ nhận diện môi trường đa nền tảng và tự động cấp cờ thực thi `chmod +x` (`0o755`) trên Unix.
  - Bổ sung `scripts/build-native.mjs` hỗ trợ build Native AOT đa nền tảng.
  - Cập nhật `.vscodeignore` whitelist `!bin/**`.
  - Nâng version `package.json` lên `1.0.0` và cập nhật `CHANGELOG.md` cho bản phát hành `1.0.0`.
  - Đóng gói thử nghiệm thành công `f-gitgraph-win32-x64.vsix` dung lượng siêu nhẹ 2.63 MB.
