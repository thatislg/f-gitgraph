# Báo Cáo Nghiệm Thu & Đo Đạc: Phase 2 Linux Milestone

Thư mục này lưu trữ các báo cáo kỹ thuật, biên bản đo đạc hiệu năng và kết quả kiểm thử nghiệm thu chi tiết cho **Phase 2: Linux Milestone (Ubuntu, Fedora, Debian)**.

---

## Danh Mục Các Báo Cáo Dự Kiến Cần Thu Thập

1. **Báo Cáo Kiểm Định Tính Tương Thích Thư Viện C (`glibc`)**:
   - Ghi nhận kết quả chạy thử nghiệm file nhị phân `neo-git-core` trên các bản phân phối Linux phổ biến:
     - Ubuntu 20.04 LTS (glibc 2.31)
     - Ubuntu 22.04 LTS (glibc 2.35)
     - Ubuntu 24.04 LTS (glibc 2.39)
     - Debian 11 / Debian 12
     - Fedora 38 / 39 / 40
   - Xác nhận file thực thi nhị phân không phát sinh lỗi thiếu thư viện động (`GLIBC not found`).

2. **Báo Cáo Nghiệm Thu Cơ Chế Tự Cấp Quyền Thực Thi (`chmod +x`)**:
   - Kiểm tra hành vi của extension khi giải nén từ file VSIX trên Linux: xác nhận tầng TypeScript tự động phát hiện và cấp quyền thực thi `0755` thành công mà không yêu cầu người dùng gõ lệnh terminal thủ công.

3. **Báo Cáo Kiểm Thử Tải Cực Hạn Trên Kho Mã Nguồn Linux Kernel (Stress-Test Report)**:
   - Đo đạc thời gian nạp và phân tích đồ thị trên kho mã nguồn Linux kernel chính thống (quy mô trên 1.000.000 commits).
   - Đánh giá mức độ tiêu thụ bộ nhớ RAM (mục tiêu: duy trì dưới 150MB).
   - Đo đạc độ mượt mà khi cuộn trang nhanh qua hàng nghìn commit.

4. **Biên Bản Nghiệm Thu An Toàn Chu Trình Git Trên Linux**:
   - Kiểm thử các thao tác ghi dữ liệu, tương thích với hệ thống tệp phân biệt chữ hoa chữ thường (Case-Sensitive) và các git hook cục bộ của dự án trên Linux.
