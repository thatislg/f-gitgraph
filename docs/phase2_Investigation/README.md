# Phase 2 Investigation: Nghiên Cứu Tái Thiết Kế Nhân Core Git Bằng F#

Thư mục này tập trung vào việc khảo sát kiến trúc, phân rã công việc và đánh giá an toàn kỹ thuật cho kế hoạch chuyển đổi tầng xử lý dữ liệu Git của Neo Git Graph sang **F# (.NET / Native AOT)**.

---

## Danh Mục Tài Liệu

- **[001. Tổng Quan & Phân Rã Đầu Việc Tái Thiết Kế (Overview)](001_Overview.md)**:
  - Triết lý phân định Read (F# Engine) vs Write (Native Git CLI).
  - Phân tích những gì tận dụng được từ Phase 1 và những gì cần đập đi xây lại.
  - Các nguyên tắc an toàn dữ liệu để bảo vệ commit, push, merge, rebase.
  - Danh mục chi tiết 7 mục đầu việc cần triển khai.

- **[002. Bản Điều Tra Kiến Trúc Đa Nền Tảng (Cross-Platform)](002_Multiplatform.md)**:
  - Hỗ trợ Windows 10/11+, Linux (Ubuntu, Fedora), macOS (Apple Silicon M-series & Intel).
  - Cấu trúc thư mục ứng dụng và module `PlatformResolver.ts`.
  - Chiến lược biên dịch .NET Native AOT (RIDs: `win-x64`, `linux-x64`, `osx-arm64`...).
  - Giải quyết phân quyền thực thi `chmod +x`, macOS Gatekeeper codesign, glibc compatibility.
  - Phương án đóng gói VSIX (Universal vs Platform-Specific) và CI/CD GitHub Actions matrix.

