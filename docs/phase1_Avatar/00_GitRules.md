# Quy tắc Quản lý Nhánh & Đồng bộ Git (Git Workflow Rules)

Tài liệu này quy định chiến lược phân nhánh, nguyên tắc đồng bộ từ upstream và quy trình làm việc chuẩn cho dự án **F-GitGraph** (fork của `thatislg`).

---

## 1. Cấu hình Remotes

Dự án duy trì 2 remote chính:

- **`origin`**: Kho fork cá nhân (`https://github.com/thatislg/f-gitgraph.git`). Nơi chúng ta lưu trữ toàn bộ code và nhánh tùy biến.
- **`upstream`**: Kho nguồn gốc (`https://github.com/asispts/f-gitgraph.git`). Nơi nhận các bản vá lỗi và tính năng mới từ tác giả gốc.

Kiểm tra cấu hình remotes:

```bash
git remote -v
# origin    https://github.com/thatislg/f-gitgraph.git (fetch & push)
# upstream  https://github.com/asispts/f-gitgraph.git (fetch)
```

Nếu chưa có remote `upstream`, thêm bằng lệnh:

```bash
git remote add upstream https://github.com/asispts/f-gitgraph.git
git remote set-url --push upstream DISABLED
```

---

## 2. Chiến lược Phân nhánh (Branching Strategy)

### 🌿 Nhánh `upstream-main` (Upstream Tracker - Clean Mirror)

- **Mục đích:** Chỉ phản chiếu chính xác trạng thái từ `upstream/main`.
- **Nguyên tắc:**
  - **TUYỆT ĐỐI KHÔNG** commit code tùy biến trực tiếp lên nhánh `upstream-main`.
  - Mọi cập nhật trên `upstream-main` đều phải đến từ `upstream/main` qua fast-forward merge.
  - Sau khi kéo cập nhật từ `upstream`, đẩy lên `origin/upstream-main` để lưu trữ bản sao upstream.

### 🚀 Nhánh `main` (Active Development & Release Branch)

- **Mục đích:** Nhánh chính thức chứa toàn bộ tính năng, tùy biến giao diện, tài liệu và mã nguồn phát hành của **F-GitGraph**.
- **Nguyên tắc:**
  - Toàn bộ commit tính năng, sửa đổi UI/UX, thêm tài liệu đều thực hiện hoặc merge vào đây.
  - Định kỳ được merge từ nhánh `upstream-main` mỗi khi `upstream` có thay đổi mới.
  - Đẩy code lên `origin/main` (nhánh mặc định của kho fork).

---

## 3. Quy trình Chuẩn Đồng bộ khi Upstream có Cập nhật

Thực hiện theo 5 bước sau mỗi khi phát hiện hoặc định kỳ đồng bộ từ upstream:

### Bước 1: Lưu trạng thái làm việc hiện tại trên `main`

Đảm bảo thư mục làm việc sạch sẽ trước khi chuyển nhánh:

```bash
# Kiểm tra trạng thái
git status

# Nếu có công việc đang dang dở chưa muốn commit:
git stash push -m "WIP on main before upstream sync"
```

### Bước 2: Chuyển sang `upstream-main` và kéo cập nhật từ `upstream`

```bash
# 1. Chuyển sang upstream-main
git switch upstream-main

# 2. Lấy dữ liệu mới nhất từ cả 2 remote
git fetch upstream
git fetch origin

# 3. Đồng bộ upstream-main từ upstream (Fast-Forward)
git merge upstream/main --ff-only

# 4. Đẩy cập nhật lên fork của chúng ta
git push origin upstream-main
```

### Bước 3: Chuyển về nhánh `main` và merge `upstream-main` vào

```bash
# 1. Chuyển lại về nhánh main
git switch main

# 2. Phục hồi công việc dang dở nếu trước đó có stash
git stash pop  # (chỉ chạy nếu ở Bước 1 có dùng git stash)

# 3. Merge nhánh upstream-main (vừa cập nhật) vào main
git merge upstream-main
```

### Bước 4: Giải quyết xung đột (Conflict Resolution - nếu có)

Nếu có xung đột xảy ra giữa code upstream và code tùy biến:

1. Mở các file bị conflict trong VS Code và chọn thay đổi phù hợp:
   - Ưu tiên giữ lại các đoạn code tính năng tùy biến của **F-GitGraph**.
   - Tiếp thu các cải tiến/sửa lỗi từ `upstream-main`.
2. Kiểm tra biên dịch và kiểm thử:
   ```bash
   pnpm run compile
   pnpm run typecheck
   pnpm vitest run tests/webview
   ```
3. Đánh dấu đã giải quyết và hoàn tất merge commit:
   ```bash
   git add .
   git commit -m "chore(sync): merge upstream/main into main"
   ```

### Bước 5: Đẩy code nhánh `main` lên GitHub

```bash
git push origin main
```

---

## 4. Tóm tắt Cheatsheet nhanh

```bash
# 1. Cập nhật upstream-main từ upstream
git switch upstream-main
git fetch upstream
git merge upstream/main --ff-only
git push origin upstream-main

# 2. Cập nhật main từ upstream-main
git switch main
git merge upstream-main

# 3. Kiểm tra & Đẩy lên origin
pnpm run compile
git push origin main
```

---

## 5. Quy tắc Commit trên nhánh `main`

Tuân thủ định dạng **Conventional Commits**:

- `feat(graph): ...` - Tính năng mới (ví dụ: lục giác, icon, giao diện).
- `fix(graph): ...` - Sửa lỗi.
- `docs: ...` - Thêm hoặc cập nhật tài liệu trong thư mục `docs/`.
- `chore(sync): ...` - Đồng bộ từ `upstream/main`.
- `test: ...` - Thêm hoặc bổ sung unit tests.
