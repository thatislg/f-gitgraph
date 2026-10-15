# 05. Theo Dõi Sự Cố & Vấn Đề Kỹ Thuật (Issues Tracking)

Thư mục này ghi nhận toàn bộ các vấn đề kỹ thuật, lỗi phát sinh, rủi ro tương thích và sự cố trong quá trình phát triển dự án F-GitGraph, phục vụ việc đối soát nội bộ và đồng bộ lên **GitHub Issues** của kho mã nguồn.

---

## 📋 Danh Mục Trạng Thái Sự Cố (Issues Dashboard)

| Mã Issue | Tiêu Đề Sự Cố | Module Tác Động | Mức Độ | Trạng Thái | GitHub Issue Link |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **[ISSUE-001](001_vitest_hook_timeout_windows.md)** | Vitest hookTimeout 10s bị ngắt khi chạy `beforeAll` khởi tạo kho Git (`makeRepo`) trên Windows | `Test Runner / Backend Tests` | Thấp (Chỉ ảnh hưởng test) | 🔴 **Chưa giải quyết (OPEN)** | *Chờ đồng bộ* |

---

## 🔄 Hướng Dẫn Đồng Bộ Issues Từ Local Lên GitHub Issues

Bạn có thể đưa trực tiếp các file báo cáo Markdown trong thư mục này lên **GitHub Issues** (`thatislg/f-gitgraph`) bằng 2 cách tiện lợi:

### Cách 1: Sử Dụng GitHub CLI (`gh`) (Khuyến nghị)
1. Cài đặt GitHub CLI trên Windows bằng lệnh PowerShell:
   ```powershell
   winget install --id GitHub.cli
   ```
2. Đăng nhập tài khoản GitHub một lần duy nhất:
   ```powershell
   gh auth login
   ```
3. Đẩy issue lên GitHub chỉ với một dòng lệnh:
   ```powershell
   gh issue create --title "[Test] Vitest hookTimeout 10s trên Windows khi chạy beforeAll" --body-file "docs/05_issues/001_vitest_hook_timeout_windows.md"
   ```

### Cách 2: Sử Dụng GitHub Personal Access Token (PAT) & REST API
Nếu không muốn cài đặt thêm GitHub CLI, có thể sử dụng GitHub REST API để gửi nội dung tệp Markdown trực tiếp lên kho mã nguồn thông qua endpoint:
- `POST https://api.github.com/repos/thatislg/f-gitgraph/issues`
- Header: `Authorization: Bearer <GITHUB_TOKEN>`
- Body: `{ "title": "...", "body": "<nội_dung_markdown>" }`
