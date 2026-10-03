# Báo Cáo Nghiệm Thu & Đo Đạc: Phase 3 macOS Milestone

Thư mục này lưu trữ các báo cáo kỹ thuật, biên bản đo đạc hiệu năng và kết quả kiểm thử nghiệm thu chi tiết cho **Phase 3: macOS Milestone (Apple Silicon M-series & Intel Mac)**.

---

## Danh Mục Các Báo Cáo Dự Kiến Cần Thu Thập

1. **Báo Cáo Nghiệm Thu Đa Kiến Trúc Chip (Apple Silicon vs Intel)**:
   - Ghi nhận kết quả chạy thử nghiệm bản nhị phân tối ưu hóa cho kiến trúc ARM64 (`osx-arm64`) trên dòng máy Mac dùng chip M1/M2/M3/M4.
   - Ghi nhận kết quả chạy thử nghiệm bản nhị phân Intel (`osx-x64`) trên dòng máy Mac dùng vi xử lý Intel.
   - So sánh thời gian xử lý và mức tiêu thụ điện năng/pin trên máy Mac.

2. **Báo Cáo Kiểm Định Vượt Rào Bảo Mật Apple Gatekeeper**:
   - Kiểm tra hành vi của hệ điều hành macOS Ventura, Sonoma và Sequoia khi nạp extension.
   - Xác nhận quy trình ký số tạm thời (ad-hoc code signing) và cơ chế tự động gỡ cờ cách ly (quarantine attribute) hoạt động thông suốt, không xuất hiện hộp thoại chặn của Gatekeeper.

3. **Báo Cáo Đánh Giá Trải Nghiệm Đồ Họa Retina & Tần Số Quét 120Hz (ProMotion)**:
   - Đo đạc độ sắc nét và tính toàn vẹn của các nút lục giác SVG clipPath, vầng sáng neon ambient trên màn hình Retina độ phân giải cao.
   - Đo đạc tần số khung hình cuộn trang và hiệu ứng phóng to avatar (deep zoom 5x) đạt chuẩn 120 FPS mượt mà.

4. **Biên Bản Nghiệm Thu Tương Thích Chu Trình Git Trên macOS**:
   - Kiểm thử các thao tác commit, ký số qua SSH/GPG Agent của macOS Keychain và các công cụ quản lý khóa bảo mật phần cứng.
