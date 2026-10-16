# Tiến Độ Chặng 3.3: Quản Lý Stash & So Sánh Vi Sai Đa Commit

Tài liệu này ghi nhận tổng quan mục tiêu, phân rã đầu việc chi tiết (Task Outlines), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 3.3: Quản lý Stash chuyên sâu & So sánh vi sai đa commit**.

> [!NOTE]
> **Hồ sơ thiết kế tham chiếu**:
>
> - [003_Gap_Analysis_And_Evolution_Blueprint.md (Mục 4.3: Quản lý Stash & Multi-Commit Diff)](../../01_investigation/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md).
> - [004_Design_System_And_Visual_Identity.md (Quy chuẩn bố cục Cyber-Lab & Đinh tán góc)](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md).
> - [docs/02_design/phase3/ (Mục lục hồ sơ thiết kế kỹ thuật Phase 3)](../../02_design/phase3/README.md).

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm Nhìn & Mục Tiêu Cốt Lõi

- **Mục tiêu**: Cung cấp công cụ quản lý các thay đổi mã nguồn tạm thời (Stash) toàn diện và trao quyền cho lập trình viên so sánh vi sai giữa bất kỳ 2 mốc lịch sử nào trên đồ thị, nâng cao khả năng phân tích và kiểm soát mã nguồn.
- **Trọng tâm kỹ thuật**:
  - **Quản lý Stash chuyên nghiệp**: Xem danh sách các bản lưu trữ tạm, xem trước danh sách tệp và diff bên trong bản stash mà không cần pop ra working tree; thực thi an toàn các lệnh Apply, Pop, Drop, hoặc trích xuất Stash thành nhánh mới.
  - **So sánh 2 commit bất kỳ (Multi-Commit Diff)**: Cho phép giữ phím `Ctrl` hoặc `Shift` chọn 2 node commit trên đồ thị DAG để xem toàn bộ danh sách tệp biến động giữa 2 phiên bản đó (`git diff A..B`).
  - **Stage từng khối mã (Partial Hunk Staging)**: Bổ sung khả năng chọn lọc từng đoạn code (hunk) trong tệp để stage hoặc discard, phục vụ việc phân tách commit sạch sẽ.

### 1.2. Trạng Thái Hiện Tại (Status)

- **Trạng thái**: Đang chờ kết quả từ Chặng 3.2 (Pending on Phase 3.2).
- **Tiến độ tổng thể**: 0% hoàn thành.

---

## 2. Phân Rã Đầu Việc & Nhiệm Vụ Con Chi Tiết (Detailed Task Outlines)

### 📋 Nhóm Việc 1: Mở Rộng Backend GitCliMutator Cho Thao Tác Stash

- [ ] **Nhiệm vụ 1.1: Hiện thực các lệnh Stash trong `GitCliMutator.ts`**
  - Hàm `stashPush(options: { message?: string; includeUntracked?: boolean; keepIndex?: boolean }): Promise<MutatorResult>`:
    - Thực thi `git stash push` với các cờ tương ứng (`-m`, `-u`, `--keep-index`).
  - Hàm `stashPop(index?: number): Promise<MutatorResult>`: Thực thi `git stash pop stash@{index}`.
  - Hàm `stashApply(index?: number): Promise<MutatorResult>`: Thực thi `git stash apply stash@{index}`.
  - Hàm `stashDrop(index: number): Promise<MutatorResult>`: Thực thi `git stash drop stash@{index}`.
  - Hàm `stashBranch(branchName: string, index: number): Promise<MutatorResult>`: Tạo nhánh mới từ stash.

- [ ] **Nhiệm vụ 1.2: Xây dựng truy vấn danh sách Stash & Chi tiết Diff**
  - Query `stashList`: Đọc `git stash list --pretty=format:...` để lấy danh sách: số thứ tự `index`, tên nhánh gốc, thông điệp stash, tác giả và thời gian tạo.
  - Query `stashDiff(index: number)`: Đọc danh sách tệp và diff bên trong bản stash qua `git stash show -p stash@{index}`.

---

### 📋 Nhóm Việc 2: Thiết Kế & Triển Khai Bảng Quản Lý Stash (Stash Inspector)

- [ ] **Nhiệm vụ 2.1: Xây dựng Component `StashManager.tsx`**
  - Hiển thị danh sách các bản stash trong kho theo thứ tự từ mới nhất (`stash@{0}`) đến cũ nhất.
  - Thẻ thông tin trực quan cho từng bản stash: Thông điệp mô tả, nhánh gốc được tạo, thời gian cách đây bao lâu.
  - Thanh tác vụ nhanh trên đầu: Nút `Stash Changes` (mở dialog nhập thông điệp và chọn cờ include untracked).

- [ ] **Nhiệm vụ 2.2: Tích hợp xem trước nội dung Stash (Stash Preview Drawer)**
  - Khi click vào một bản stash: Mở bảng xem trước danh sách tệp thay đổi bên trong (tương tự FileTree của commit).
  - Click vào từng tệp để mở `vscode.diff` xem sự khác biệt giữa bản stash và commit cha của nó mà không làm bẩn working tree.

- [ ] **Nhiệm vụ 2.3: Menu ngữ cảnh & Nút tác vụ an toàn**
  - Nút `Apply`: Áp dụng thay đổi vào working tree nhưng giữ lại bản stash.
  - Nút `Pop`: Áp dụng và tự động xóa khỏi danh sách stash.
  - Nút `Drop`: Xóa bản stash vĩnh viễn (kèm hộp thoại xác nhận cảnh báo).
  - Nút `Branch`: Nhập tên nhánh mới để checkout và bung stash vào nhánh đó.

---

### 📋 Nhóm Việc 3: So Sánh Vi Sai Giữa 2 Commit Bất Kỳ (Multi-Commit Diff)

- [ ] **Nhiệm vụ 3.1: Cơ chế chọn đa commit (Multi-Selection) trên `CommitTable.tsx`**
  - Lắng nghe sự kiện click chuột khi đang giữ phím `Ctrl` (hoặc `Cmd` trên macOS) hoặc `Shift`.
  - Giới hạn lựa chọn chính xác 2 commit: Commit A (Base) và Commit B (Target).
  - Tô viền highlight màu xanh neon kép bao quanh cả 2 dòng commit được chọn.

- [ ] **Nhiệm vụ 3.2: Bảng hiển thị vi sai đa commit `CompareCommitsInspector.tsx`**
  - Tự động gọi query `git diff --name-status hashA..hashB`.
  - Hiển thị thanh tóm lược đầu trang: _"Comparing {shortHashA} ↔ {shortHashB} ({count} files changed)"_.
  - Hiển thị cây tệp thay đổi (FileTree) giữa 2 mốc lịch sử.
  - Click vào tệp để mở màn hình Diff của VS Code hiển thị chính xác sự thay đổi giữa 2 commit đó.

---

### 📋 Nhóm Việc 4: Giao Diện Stage Từng Khối Mã (Partial Hunk Staging)

- [ ] **Nhiệm vụ 4.1: Xây dựng bộ phân tích cú pháp Git Diff (Diff Parser)**
  - Phân tích chuỗi unified diff thành các khối (Hunks), mỗi khối có header `@@ -start,len +start,len @@` và danh sách các dòng code thêm/bớt.

- [ ] **Nhiệm vụ 4.2: Tích hợp nút hành động trên từng Hunk trong Diff View**
  - Hiển thị nút "Stage Hunk" và "Discard Hunk" ở góc phải của mỗi header khối mã.
  - Khi bấm "Stage Hunk": Sinh patch tương ứng và gọi lệnh `git apply --cached` để chỉ đưa khối code đó vào index.
  - Khi bấm "Discard Hunk": Gọi `git apply --reverse` để hủy bỏ khối code đó trên working tree.

---

### 📋 Nhóm Việc 5: Kiểm Thử Nghiệm Thu & An Toàn Mã Nguồn

- [ ] **Nhiệm vụ 5.1: Unit Tests cho Stash Mutator & Multi-Diff Query**
  - Kiểm thử tạo stash, pop stash khi working tree có xung đột.
  - Kiểm thử so sánh vi sai giữa 2 commit không cùng một nhánh (cross-branch comparison).

- [ ] **Nhiệm vụ 5.2: Kiểm tra an toàn dữ liệu trên UI**
  - Thử nghiệm Drop stash: Đảm bảo người dùng phải bấm xác nhận trên hộp thoại trước khi xóa.
  - Thử nghiệm Partial Hunk Staging: Đảm bảo patch sinh ra áp dụng chuẩn xác, không làm sai lệch số dòng code còn lại.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. Người dùng có thể quản lý danh sách Stash trực quan, xem trước tệp/diff bên trong bản stash và thực hiện Pop/Apply/Drop an toàn.
2. Cho phép giữ `Ctrl` chọn 2 commit bất kỳ trên đồ thị để mở bảng so sánh vi sai toàn diện.
3. Tính năng Stage từng khối mã (Hunk Staging) hoạt động chính xác với `git apply --cached`.
4. Toàn bộ test suite Vitest mới đạt 100% pass, không phát sinh lỗi biên dịch.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-15**: Khởi tạo tài liệu tiến độ Chặng 3.3. Phân rã 5 nhóm việc kỹ thuật cho Quản lý Stash, So sánh 2 Commit và Partial Hunk Staging.
