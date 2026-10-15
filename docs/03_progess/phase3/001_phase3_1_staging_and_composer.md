# Tiến Độ Chặng 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)

Tài liệu này ghi nhận tổng quan mục tiêu, phân rã đầu việc chi tiết (Task Outlines), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 3.1: Xây dựng Khu vực Staging & Bộ soạn thảo Commit**.

> [!NOTE]
> **Tài liệu tham chiếu thiết kế**: [docs/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md](../../phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md) (Mục 4.1).

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm Nhìn & Mục Tiêu Cốt Lõi
- **Mục tiêu**: Khép kín vòng lặp làm việc cốt lõi của lập trình viên (Xem tệp thay đổi $\rightarrow$ Stage/Unstage $\rightarrow$ Soạn thảo thông điệp $\rightarrow$ Commit mã nguồn) ngay trên giao diện F-GitGraph, loại bỏ hoàn toàn sự phụ thuộc vào tab Source Control mặc định của VS Code.
- **Trọng tâm kỹ thuật**:
  - Tách bạch rõ ràng 2 danh mục: **Staged Changes** (sẵn sàng commit) và **Changes / Unstaged** (thay đổi trên working tree).
  - Tương tác nhanh: Stage All (`+`), Unstage All (`-`), Stage/Unstage từng tệp, Discard thay đổi (có dialog xác nhận an toàn).
  - Soạn thảo Commit chuyên nghiệp: Đếm ký tự tiêu đề (50 chars), khung mô tả chi tiết, tùy chọn Amend commit gần nhất, tùy chọn ký số GPG/SSH, nút "Commit" và "Commit & Push".
  - Giữ vững nguyên tắc an toàn: Mọi thao tác stage và commit được ủy thác cho Native Git CLI (`git.exe`).
  - **Bảo toàn bất biến 100%**: Tuyệt đối không can thiệp hay thay đổi `HexagonNode.tsx`, Avatar ClipPath, Zoom 5x, vầng sáng Neon Ambient hay thuật toán đồ thị F# hiện tại. Khu vực Staging và Commit Composer được xây dựng dưới dạng module mở rộng với khung đinh tán chữ thập góc (`+`) bao bọc bên ngoài.

### 1.2. Trạng Thái Hiện Tại (Status)
- **Trạng thái**: Sẵn sàng triển khai (Ready for Implementation).
- **Tiến độ tổng thể**: 0% hoàn thành.

---

## 2. Phân Rã Đầu Việc & Nhiệm Vụ Con Chi Tiết (Detailed Task Outlines)

### 📋 Nhóm Việc 1: Mở Rộng Backend GitCliMutator & Giao Thức RPC

- [ ] **Nhiệm vụ 1.1: Bổ sung các lệnh thao tác Staging vào `GitCliMutator.ts`**
  - Hiện thực hàm `stageFile(filePath: string): Promise<MutatorResult>` thực thi `git add -- <path>`.
  - Hiện thực hàm `unstageFile(filePath: string): Promise<MutatorResult>` thực thi `git restore --staged -- <path>`.
  - Hiện thực hàm `stageAll(): Promise<MutatorResult>` thực thi `git add -A`.
  - Hiện thực hàm `unstageAll(): Promise<MutatorResult>` thực thi `git restore --staged .`.
  - Hiện thực hàm `discardFileChanges(filePath: string): Promise<MutatorResult>` thực thi `git restore -- <path>` (với tệp tracked) hoặc `git clean -f -- <path>` (với tệp untracked).

- [ ] **Nhiệm vụ 1.2: Nâng cấp hàm `commit` trong `GitCliMutator.ts`**
  - Mở rộng tham số nhận diện cờ `--amend` để sửa đổi commit trước đó mà không tạo commit mới.
  - Hỗ trợ ký số `-S` (GPG/SSH signing) khi người dùng bật tùy chọn.
  - Tách biệt `summary` (dòng đầu) và `description` (nội dung body phân tách bởi dòng trống) theo chuẩn định dạng Git commit message.

- [ ] **Nhiệm vụ 1.3: Hiện thực truy vấn trạng thái Working Tree siêu tốc (`workspace.status`)**
  - Xây dựng query đọc `git status --porcelain=v2` để lấy danh sách tệp biến động chính xác:
    - Danh sách `stagedFiles`: Tệp đã add vào index (kèm loại thay đổi: A, M, D, R).
    - Danh sách `unstagedFiles`: Tệp sửa đổi trên working tree chưa add.
    - Danh sách `untrackedFiles`: Tệp mới chưa theo dõi.
  - Định nghĩa kiểu dữ liệu trong `src/types/actions.ts` và `src/types/rpc.types.ts`.

---

### 📋 Nhóm Việc 2: Thiết Kế & Triển Khai Giao Diện Staging Area

- [ ] **Nhiệm vụ 2.1: Xây dựng Component `StagingPanel.tsx`**
  - Bố trí 2 khu vực danh sách: **Staged Changes** (trên) và **Changes (Unstaged)** (dưới).
  - Hiển thị số lượng tệp trong từng nhóm (ví dụ: `Staged Changes (2)`, `Changes (5)`).
  - Thanh công cụ nhóm: Nút "Unstage All" (`-`), nút "Stage All" (`+`), nút "Discard All" (có cảnh báo).

- [ ] **Nhiệm vụ 2.2: Xây dựng Component `StagingFileItem.tsx`**
  - Hiển thị tên tệp và đường dẫn thư mục phụ mờ phía sau.
  - Badge trạng thái màu sắc rực rỡ chuẩn phong cách F-GitGraph:
    - `A` (Added): Xanh lục neon (`#10b981`)
    - `M` (Modified): Vàng neon (`#f59e0b`)
    - `D` (Deleted): Đỏ neon (`#ef4444`)
    - `R` (Renamed): Tím neon (`#a855f7`)
  - Nút tác vụ nhanh khi hover trên từng tệp:
    - Icon `+` (Stage file) đối với unstaged item.
    - Icon `-` (Unstage file) đối với staged item.
    - Icon thùng rác / hoàn tác (Discard changes) kèm dialog xác nhận.
  - Click vào tệp để mở xem Diff vi sai (`vscode.diff`) giữa Working Tree và Index.

---

### 📋 Nhóm Việc 3: Thiết Kế & Triển Khai Bộ Soạn Thảo Commit (Commit Composer)

- [ ] **Nhiệm vụ 3.1: Xây dựng Component `CommitComposer.tsx`**
  - Khung nhập Tiêu đề Commit (Subject):
    - Placeholder: *"Message (Ctrl+Enter to commit)"*.
    - Bộ đếm ký tự góc phải: Chữ trắng khi $\le 50$ ký tự, chữ vàng khi $51 - 72$ ký tự, chữ đỏ khi $> 72$ ký tự.
  - Khung nhập Mô tả mở rộng (Body/Description):
    - Hỗ trợ gõ nhiều dòng, tự động điều chỉnh chiều cao linh hoạt.
  - Tùy chọn Checkbox:
    - Checkbox *"Amend previous commit"*: Tự động nạp message của commit `HEAD` lên khung soạn thảo khi được tích chọn.
    - Checkbox *"Sign commit (GPG)"*: Bật/tắt cờ `-S`.

- [ ] **Nhiệm vụ 3.2: Các nút hành động chính & Phím tắt**
  - Nút chính `Commit`: Hiển thị số lượng tệp staged sẽ được commit (ví dụ: `Commit 3 files`). Bị vô hiệu hóa (disabled) khi danh sách staged rỗng hoặc tiêu đề commit để trống.
  - Nút phụ `Commit & Push`: Thực hiện commit xong tự động đẩy lên nhánh tracking trên remote.
  - Phím tắt tiện lợi: Hỗ trợ nhấn `Ctrl + Enter` (hoặc `Cmd + Enter` trên macOS) để kích hoạt commit tức thì từ bất kỳ ô nhập liệu nào.

---

### 📋 Nhóm Việc 4: Ghép Nối Trạng Thái Working Tree & File Watcher

- [ ] **Nhiệm vụ 4.1: Đồng bộ dòng "Uncommitted Changes" trên đồ thị**
  - Khi có tệp thay đổi trong Working Tree, đồ thị hiển thị dòng mầm `Uncommitted changes` trên đỉnh với node lục giác nét đứt.
  - Khi click chọn dòng `Uncommitted changes`, giao diện Inspector tự động chuyển sang hiển thị **Staging Area & Commit Composer**.

- [ ] **Nhiệm vụ 4.2: Lắng nghe File Watcher cập nhật vi sai theo thời gian thực**
  - Tích hợp sự kiện từ `git-repo.watcher.ts` để tự động làm mới danh sách staged/unstaged khi người dùng sửa file, lưu file hoặc chạy lệnh ngoài terminal.
  - Cơ chế Debounce (khoảng 150ms) để tránh nạp dữ liệu dồn dập khi lưu nhiều tệp cùng lúc.

---

### 📋 Nhóm Việc 5: Kiểm Thử Nghiệm Thu & An Toàn Dữ Liệu

- [ ] **Nhiệm vụ 5.1: Bộ Unit Tests cho Mutator & Queries**
  - Viết test suite Vitest kiểm thử toàn bộ các hàm mới trong `GitCliMutator.ts` (`stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `commit` amend/sign).
  - Kiểm thử parse đúng định dạng porcelain v2 cho các loại tệp (modified, added, deleted, renamed, untracked).

- [ ] **Nhiệm vụ 5.2: Kiểm thử an toàn dữ liệu trên UI**
  - Thử nghiệm Discard tệp: Đảm bảo hộp thoại xác nhận luôn xuất hiện cảnh báo không thể khôi phục trước khi thực thi.
  - Thử nghiệm Amend commit: Đảm bảo không làm mất commit khi chưa có staged changes.
  - Kiểm tra trạng thái phím tắt `Ctrl + Enter` mượt mà, không lag giật.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. Lập trình viên có thể thực hiện trọn vẹn quy trình: Sửa mã nguồn $\rightarrow$ Chọn stage từng tệp $\rightarrow$ Viết commit $\rightarrow$ Bấm Commit hoặc `Ctrl+Enter` ngay trên F-GitGraph mà không cần mở bất kỳ công cụ nào khác.
2. Danh sách Staged và Unstaged phản ánh chính xác 100% kết quả lệnh `git status`.
3. Hành động Discard thay đổi hoạt động an toàn, có hộp thoại xác nhận bảo vệ mã nguồn.
4. Tùy chọn Amend commit và Ký số (GPG/SSH) hoạt động chuẩn xác với Git gốc.
5. Bộ kiểm thử tự động Vitest đạt 100% pass, không có lỗi typecheck hoặc lint.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-15**: Khởi tạo tài liệu tiến độ Chặng 3.1. Phân rã chi tiết 5 nhóm việc kỹ thuật cho Khu vực Staging và Bộ soạn thảo Commit.
