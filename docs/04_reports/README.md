# 04. Báo Cáo Nghiệm Thu & Đo Đạc Hiệu Năng (Reports & Verification)

Thư mục này lưu trữ toàn bộ các biên bản kiểm thử, báo cáo đo đạc hiệu năng (Benchmarking Reports) và biên bản nghiệm thu kỹ thuật (Sign-off Reports) theo từng giai đoạn triển khai của dự án Neo Git Graph:
- Báo cáo đo đạc 4 chỉ số hiệu năng định lượng (thời gian nạp, RAM, FPS cuộn trang, độ trễ IPC).
- Báo cáo kiểm thử so sánh tính tương đương đồ thị 100% giữa thuật toán mới và phiên bản cũ.
- Báo cáo nghiệm thu an toàn dữ liệu đối với các thao tác Git mutation (commit, push, merge, rebase).
- Báo cáo đánh giá tương thích hệ điều hành và phần cứng đặc thù.

> [!NOTE]
> Mọi báo cáo trong thư mục này được biên soạn theo nguyên tắc: ghi nhận số liệu đo đạc thực tế, bảng đối chiếu định lượng và kết luận kỹ thuật rõ ràng, không sử dụng mã nguồn mẫu.

---

## Danh Mục Các Thư Mục Báo Cáo Theo Giai Đoạn

- **[001_windows: Báo Cáo Nghiệm Thu Phase 1 Windows](001_windows/README.md)**:
  Báo cáo đo đạc hiệu năng trên Windows 10/11, kiểm thử tương đương đồ thị, kiểm định độc lập Native AOT và nghiệm thu an toàn Git CLI.
- **[002_linux: Báo Cáo Nghiệm Thu Phase 2 Linux](002_linux/README.md)**:
  Báo cáo tương thích thư viện C (`glibc`) trên Ubuntu/Fedora, kiểm thử stress-test trên kho Linux kernel và nghiệm thu tự động cấp quyền `chmod +x`.
- **[003_macos: Báo Cáo Nghiệm Thu Phase 3 macOS](003_macos/README.md)**:
  Báo cáo tối ưu mã máy chip Apple Silicon (ARM64) và Intel, kiểm định vượt rào bảo mật Apple Gatekeeper và đo đạc hiển thị Retina 120Hz.
- **[004_release: Báo Cáo Nghiệm Thu Toàn Diện & Phát Hành](004_release/README.md)**:
  Báo cáo kiểm thử tự động hóa CI/CD, nghiệm thu gói cài đặt Universal VSIX và biên bản bàn giao sản phẩm đa nền tảng hoàn chỉnh.
