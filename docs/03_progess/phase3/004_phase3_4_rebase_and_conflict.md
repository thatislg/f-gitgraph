# Tiến Độ Chặng 3.4: Tái Cấu Trúc Lịch Sử & Xử Lý Xung Đột Trực Quan

Tài liệu này ghi nhận tổng quan mục tiêu, phân rã đầu việc chi tiết (Task Outlines), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 3.4: Tái cấu trúc lịch sử (Visual Interactive Rebase) & Trình giải quyết xung đột trực quan (Conflict Resolver)**.

> [!NOTE]
> **Hồ sơ thiết kế tham chiếu**:
>
> - [003_Gap_Analysis_And_Evolution_Blueprint.md (Mục 4.4: Rebase & Conflict Resolver)](../../01_investigation/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md).
> - [004_Design_System_And_Visual_Identity.md (Quy chuẩn bố cục Cyber-Lab & Đinh tán góc)](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md).
> - [docs/02_design/phase3/ (Mục lục hồ sơ thiết kế kỹ thuật Phase 3)](../../02_design/phase3/README.md).

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm Nhìn & Mục Tiêu Cốt Lõi

- **Mục tiêu**: Đưa F-GitGraph bước vào nhóm các ứng dụng Git cao cấp nhất thế giới bằng việc trang bị 2 tính năng "vũ khí tối thượng" (Killer Features): **Trình tái cấu trúc lịch sử trực quan (Visual Interactive Rebase)** và **Trình giải quyết xung đột 3 chiều (3-Way Merge Conflict Resolver)**.
- **Trọng tâm kỹ thuật**:
  - **Visual Interactive Rebase**: Thay thế hoàn toàn quy trình chỉnh sửa file text khô khan của `git rebase -i` bằng bảng điều khiển trực quan: Kéo thả chuột đổi thứ tự commit, bấm nút chọn tác vụ `Pick`, `Squash`, `Fixup`, `Reword`, `Drop`, chỉnh sửa commit message trực tiếp trên form và thực thi an toàn qua Git CLI.
  - **In-Flight Conflict Resolver**: Tận dụng nhân F# Core (`InFlightState.fs`) để phát hiện ngay lập tức khi kho rơi vào trạng thái conflict; hiển thị banner cảnh báo rực rỡ đầu trang, cung cấp giao diện 3 cột trực quan (`Ours` $\leftrightarrow$ `Result` $\leftrightarrow$ `Theirs`) kèm nút chọn nhanh "Accept Ours", "Accept Theirs", "Accept Both".
  - **Tương tác Kéo & Thả (Drag & Drop)**: Cho phép kéo một nhánh thả vào một nhánh khác để kích hoạt Merge/Rebase, hoặc kéo một commit thả vào nhánh để Cherry-pick.

### 1.2. Trạng Thái Hiện Tại (Status)

- **Trạng thái**: Đang chờ kết quả từ Chặng 3.3 (Pending on Phase 3.3).
- **Tiến độ tổng thể**: 0% hoàn thành.

---

## 2. Phân Rã Đầu Việc & Nhiệm Vụ Con Chi Tiết (Detailed Task Outlines)

### 📋 Nhóm Việc 1: Thiết Kế & Triển Khai Trình Visual Interactive Rebase Editor

- [ ] **Nhiệm vụ 1.1: Khởi tạo Component `InteractiveRebaseModal.tsx`**
  - Mở bảng hộp thoại toàn màn hình (Modal/Fullscreen Overlay) khi người dùng chọn tác vụ _"Rebase children of {hash} interactively..."_.
  - Nạp danh sách toàn bộ các commit nằm giữa điểm rebase (base) và `HEAD`.
  - Bảng danh sách commit hỗ trợ kéo thả đổi thứ tự dòng (Drag & Drop Reordering).

- [ ] **Nhiệm vụ 1.2: Triển khai các nút bấm hành động trên từng Commit**
  - Nút chuyển trạng thái có màu sắc và icon trực quan:
    - `Pick` (Xanh lục): Giữ nguyên commit.
    - `Reword` (Xanh dương): Sửa đổi thông điệp commit (mở ô input tại chỗ để sửa).
    - `Squash` (Vàng cam): Gộp commit vào commit liền kề trước đó kèm ghép nối thông điệp.
    - `Fixup` (Vàng nhạt): Gộp commit vào commit trước nhưng bỏ qua thông điệp.
    - `Drop` (Đỏ neon): Xóa bỏ commit khỏi lịch sử.
  - Tự động kiểm tra tính hợp lệ: Không cho phép đặt commit đầu tiên ở trạng thái `Squash` hoặc `Fixup`.

- [ ] **Nhiệm vụ 1.3: Trình điều khiển kịch bản Rebase phía Backend (`RebaseScriptDriver.ts`)**
  - Thiết lập biến môi trường `GIT_SEQUENCE_EDITOR` trỏ tới script trung gian tự động ghi tệp `git-rebase-todo` theo đúng cấu hình người dùng đã sắp đặt trên UI.
  - Gọi thực thi `git rebase -i <base>` an toàn qua Native Git CLI.

---

### 📋 Nhóm Việc 2: Trình Giải Quyết Xung Đột Trực Quan (In-Flight Conflict Resolver)

- [ ] **Nhiệm vụ 2.1: Hiển thị Banner cảnh báo trạng thái biến động dở dang**
  - Nhận diện trạng thái từ nhân F# Core (`InFlightState.fs`):
    - Khi có `.git/rebase-merge/` hoặc `.git/rebase-apply/`: Banner vàng neon _"Rebase in progress - Conflicts detected"_.
    - Khi có `.git/MERGE_HEAD`: Banner tím neon _"Merge in progress - Conflicts detected"_.
  - Các nút điều khiển luồng toàn cục ngay trên banner:
    - Nút `Continue`: Tiếp tục rebase/merge sau khi đã resolve hết xung đột.
    - Nút `Skip`: Bỏ qua commit hiện tại (khi rebase).
    - Nút `Abort`: Hủy bỏ hoàn toàn thao tác, hoàn tác kho về trạng thái an toàn trước khi rebase/merge.

- [ ] **Nhiệm vụ 2.2: Xây dựng Giao diện 3 Cột `ConflictResolverView.tsx`**
  - Bố trí 3 cột so sánh trực quan:
    - Cột Trái (`Current / Ours`): Đoạn code của nhánh hiện tại.
    - Cột Giữa (`Result`): Khung soạn thảo mã nguồn kết quả cuối cùng.
    - Cột Phải (`Incoming / Theirs`): Đoạn code từ nhánh đang kéo vào.
  - Nút bấm nhanh trên từng vùng xung đột:
    - `Accept Current`: Chọn code nhánh hiện tại.
    - `Accept Incoming`: Chọn code nhánh kéo vào.
    - `Accept Both`: Ghép cả 2 đoạn code.
  - Khi người dùng bấm lưu: Tự động xóa các marker conflict (`<<<<<<<`, `=======`, `>>>>>>>`) và tự động gọi `git add <file>` để đánh dấu đã resolve.

---

### 📋 Nhóm Việc 3: Tương Tác Kéo & Thả Git Trực Quan (Drag & Drop Operations)

- [ ] **Nhiệm vụ 3.1: Tích hợp HTML5 Drag and Drop API trên Webview**
  - Gắn thuộc tính `draggable` trên các Ref Pill (nhánh) và Commit Nodes.
  - Thêm hiệu ứng hình ảnh vầng sáng neon khi rê một item lên vùng có thể thả (Drop Target).

- [ ] **Nhiệm vụ 3.2: Xử lý các kịch bản thả chuột (Drop Handlers)**
  - Kéo **Nhánh A** thả vào **Nhánh B**:
    - Hiển thị Action Popup: _"Merge {Branch A} into {Branch B}"_ hoặc _"Rebase {Branch A} onto {Branch B}"_.
  - Kéo **Commit X** thả vào **Nhánh hiện tại**:
    - Hiển thị Action Popup: _"Cherry-pick commit {shortHash} onto {currentBranch}"_.

---

### 📋 Nhóm Việc 4: Kiểm Thử Cực Hạn & Nghiệm Thu An Toàn Dữ Liệu

- [ ] **Nhiệm vụ 4.1: Kịch bản thử nghiệm Interactive Rebase phức tạp**
  - Thử nghiệm reorder và squash chuỗi 10 commits liên tiếp.
  - Đảm bảo toàn bộ chữ ký số, author date và commit message được bảo toàn chuẩn xác.

- [ ] **Nhiệm vụ 4.2: Kịch bản thử nghiệm xung đột và hoàn tác (Conflict & Abort)**
  - Tạo xung đột giả lập giữa 2 nhánh: Kiểm tra banner xuất hiện tức thời.
  - Kiểm tra nút `Abort Rebase`: Đảm bảo kho quay về trạng thái ban đầu sạch sẽ 100%, không để lại file rác trong `.git/`.
  - Kiểm thử giải quyết xung đột qua 3-way view: Đảm bảo mã nguồn sau khi resolve biên dịch và chạy đúng logic.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. Người dùng có thể thực hiện Interactive Rebase trực quan trên giao diện: đổi thứ tự commit, squash, fixup, reword, drop mượt mà không cần dùng lệnh terminal.
2. Trình giải quyết xung đột (Conflict Resolver) tự động kích hoạt khi có conflict, cung cấp giao diện 3 cột và các nút Accept trực quan.
3. Các nút điều khiển luồng `Continue`, `Skip`, `Abort` hoạt động an toàn tuyệt đối.
4. Thao tác Kéo & Thả (Drag & Drop) hoạt động trơn tru với phản hồi hình ảnh sinh động.
5. Đạt 100% pass trên toàn bộ test suite tự động, không phát sinh bất kỳ lỗi rò rỉ bộ nhớ hoặc lỗi giao diện nào.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-15**: Khởi tạo tài liệu tiến độ Chặng 3.4. Phân rã 4 nhóm việc kỹ thuật cho Visual Interactive Rebase, 3-Way Conflict Resolver và Drag & Drop Git Operations.
