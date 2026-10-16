# Hướng Dẫn Quản Lý Công Việc & Đồng Bộ Tiến Độ Bằng GitHub Issues & Projects

Tài liệu này hướng dẫn chi tiết quy trình vận hành, cách sắp xếp thứ tự (Sort), gom nhóm (Group) và cơ chế tự động đóng task bằng commit dành cho các thành viên và lập trình viên trong dự án **F-GitGraph**.

---

## 1. Mô Hình Quản Lý Phân Cấp (3-Tier Hierarchy)

Dự án áp dụng mô hình phân cấp 3 tầng chuẩn công nghiệp để vừa nắm bắt được bức tranh toàn cảnh, vừa theo dõi được tiến độ vi mô từng giờ:

```
[Milestone: Phase 3.1 - Staging Area & Commit Composer] (Thanh tiến độ % toàn chặng)
 │
 ├── [Epic 1: Backend & Mutator Engine #12]
 │    ├── #13: [Task 1.1] Git Version Probe & Cache
 │    ├── #14: [Task 1.2] Mutator stageFile & stageAll
 │    └── ... (#15 - #22)
 │
 ├── [Epic 2: UI Architecture & Commit Composer #23]
 │    ├── #24: [Task 2.1] CornerCrossFrame (+) đinh tán góc
 │    ├── #25: [Task 2.2] StagingFileItem huy hiệu vuông 18px
 │    └── ... (#26 - #35)
 │
 └── [Epic 3: DAG Integration & Real-time Watcher #36]
      ├── #37: [Task 3.1] Mở khóa click dòng UNCOMMITTED_CHANGES
      └── ... (#38 - #42)
```

1. **Tầng 1 - Cột Mốc (Milestone)**: Đại diện cho cả một Phase lớn (ví dụ `Phase 3.1`). Nơi GitHub tự động tính toán tổng tỷ lệ phần trăm hoàn thành của toàn chặng.
2. **Tầng 2 - Sử Thi (Epic Issue)**: Đại diện cho một phân hệ kiến trúc (Backend, UI, hoặc Integration). Mỗi Epic chứa một bảng checklist trực tiếp tới các task con.
3. **Tầng 3 - Công Việc Vi Mô (Atomic Task Issue)**: Mỗi đầu việc kỹ thuật cụ thể (1 hàm, 1 component, 1 test suite) là một thẻ công việc độc lập kéo dài từ 30 đến 90 phút.
   - **Bắt buộc chuẩn hóa định dạng Hộp Đen (Black-Box I/O)**:
     ```markdown
     ### Task X.Y: [Tiêu Đề Công Việc]

     - **Mục tiêu:** [Mô tả ngắn gọn kết quả cần đạt được]
     - **Input:** `param1: Type1`, `param2: Type2`
     - **Output:** `Result<SuccessType, ErrorType>`
     - **Thiết kế tham chiếu (Design Ref):** Mục X.Y trong `docs/02_design/...`
     ```
   - ⚠️ **Nguyên tắc**: Task nào **chưa có Input và Output cụ thể** là **chưa đủ độ chín để thực thi**. Phải làm rõ thiết kế trước khi đưa vào hàng đợi.

---

## 2. Hướng Dẫn Sắp Xếp Thứ Tự (Sort) & Gom Nhóm (Group) Trên GitHub

### 2.1. Cách Sắp Xếp Trên Bảng Quản Lý GitHub Projects (Khuyên Dùng)

Khi bạn mở bảng Kanban trên **GitHub Projects** (`https://github.com/thatislg/f-gitgraph/projects`):

#### Cách 1: Sắp xếp tự động theo thứ tự lộ trình (Sort by Title hoặc Number)

1. Trên thanh công cụ đỉnh của Project View, bấm vào nút **Sort** (hoặc biểu tượng mũi tên hai chiều).
2. Chọn trường để sort:
   - **Sort by `Title` $\rightarrow$ `Ascending (A-Z)`**: Vì toàn bộ các task con đã được đặt tên chuẩn mực dạng `[Task 1.1]`, `[Task 1.2]`, `[Task 2.1]`... nên khi chọn A-Z, bảng sẽ tự động sắp xếp chuẩn xác 100% theo đúng thứ tự logic cần lập trình.
   - **Sort by `Number` $\rightarrow$ `Ascending (Oldest)`**: Xếp theo số thứ tự của Issue từ nhỏ đến lớn (`#13` $\rightarrow$ `#14` $\rightarrow$ `#15`...), đúng theo thứ tự thời gian khởi tạo lộ trình.

#### Cách 2: Sắp xếp thủ công bằng chuột (Manual Drag & Drop)

- Bạn có thể bấm giữ chuột trái vào thẻ bất kỳ và kéo rê lên trên hoặc xuống dưới trong cùng một cột (`Todo`, `In Progress`, `Done`). GitHub Projects sẽ tự động lưu lại vị trí tùy biến này cho riêng bạn.

#### Cách 3: Gom nhóm theo Epic hoặc Milestone (Group by)

1. Bấm vào nút **Group** trên thanh công cụ của Project.
2. Chọn **Milestone** hoặc **Labels**: Bảng Kanban sẽ tự động chia thành các hàng ngang (Swimlanes), phân tách rõ ràng từng nhóm việc (Backend riêng, UI riêng).

---

### 2.2. Cách Sắp Xếp & Lọc Trong Tab "Issues" Của Repository

Khi xem danh sách thông thường tại tab `Issues`:

1. **Xem đúng theo thứ tự lộ trình từ đầu đến cuối**:
   - Bấm vào mục **Sort** ở góc trên bên phải danh sách $\rightarrow$ Chọn **Oldest** (tương đương lệnh `sort:created-asc`).
   - Danh sách sẽ hiện từ `#12` (Epic 1), `#13` (Task 1.1) dần tới `#42` (Task 3.6).
2. **Lọc chỉ xem các task của Phase 3.1**:
   - Dán chuỗi sau vào thanh tìm kiếm:
     ```
     is:issue is:open milestone:"Phase 3.1: Staging Area & Commit Composer" sort:created-asc
     ```
3. **Lọc chỉ xem các task của riêng Backend hoặc UI**:
   - Thêm `label:backend` hoặc `label:ui` vào thanh tìm kiếm.

---

## 3. Quy Trình Làm Việc Hàng Ngày (Core Dev Workflow - Closed-Loop SOP)

Toàn bộ quy trình tuân thủ đường ống khép kín của Software Architect:
$$\text{Yêu cầu Task} \;\xrightarrow{\text{I/O là gì?}}\; \text{Đối chiếu Thiết kế} \;\xrightarrow{\text{Đã đủ chưa?}}\; \text{Viết Test Cases} \;\xrightarrow{\text{MCP Tools}}\; \text{Code F\# / TS} \;\longrightarrow\; \text{Report}$$

### Bước 1: Chọn Task & Chuyển Trạng Thái

- Vào **GitHub Projects**, kéo thẻ task chuẩn bị làm (ví dụ `#13: [Task 1.1]`) từ cột `Todo` sang cột `In Progress`.
- Xác định mục tiêu, các tham số đầu vào (Input), kết quả mong muốn (Output) và liên kết `Design Ref`.

### Bước 2: Thẩm Định Thiết Kế (Design Verification Gate - Bắt Buộc)

Trước khi viết bất kỳ dòng test hay code nào, tự đối chiếu Thiết kế và trả lời **3 câu hỏi kiểm định**:

1. **Types Ready?** Đã có đủ Type để biểu diễn Input và Output trong `src/types/` hoặc F# types chưa?
2. **Edge Cases Covered?** Thiết kế đã xử lý hết các trường hợp biên (số âm, chuỗi rỗng, NUL byte, danh sách rỗng, lỗi mạng, lock file) chưa?
3. **Dependencies Exist?** Hệ thống hiện tại đã có sẵn các API/hàm phụ thuộc mà task này cần gọi chưa?

> ⛔ **NẾU CÒN THIẾU**: Dừng lại ngay! Báo cáo điểm thiếu của Thiết kế và đề xuất bổ sung vào file thiết kế trong `docs/02_design/`.  
> ✅ **NẾU ĐÃ ĐỦ**: Mới được phép chuyển sang Bước 3.

### Bước 3: Lập Trình Theo Chuẩn TDD (Test-Driven Development)

- **Quy tắc bất khả xâm phạm**:
  - Không bao giờ code nếu chưa có Test.
  - Không bao giờ viết Test nếu Thiết kế chưa rõ Input/Output.
  - Không bao giờ triển khai Task nếu Thiết kế chưa bao quát hết bài toán.
- Viết test suite tương ứng trước (Red), sau đó viết thân hàm để thỏa mãn chữ ký kiểu dữ liệu (Green), và chạy diagnostic gates (`typecheck`, `lint`, `compile`, `test`).

### Bước 4: Đóng Task Tự Động Bằng Lệnh Git Commit

Khi hoàn tất task và 100% test pass, thêm từ khóa `closes #<số_issue>` hoặc `fixes #<số_issue>` vào commit message:

```bash
git commit -m "feat(backend): implement git version probe and cache (closes #13)"
```

Khi bạn đẩy commit lên GitHub (`git push`):

1. Issue **`#13`** sẽ **tự động đóng (Closed)**.
2. Thẻ `#13` trên **GitHub Projects** tự động nhảy sang cột **Done**.
3. Trong **Epic #12**, dòng checklist `- [ ] #13` sẽ **tự động được gạch tick `[x]`**.
4. Thanh tiến độ trên **Milestone Phase 3.1** sẽ **tự động tăng thêm %**.

---

## 4. Bảng Tra Cứu Toàn Bộ Issues Phase 3.1 Hiện Tại

| Phân Vùng     | Mã Issue | Tiêu Đề Nhiệm Vụ                                                                                    |
| :------------ | :------: | :-------------------------------------------------------------------------------------------------- |
| **Milestone** |  **#1**  | **[Phase 3.1: Staging Area & Commit Composer](https://github.com/thatislg/f-gitgraph/milestone/1)** |
| **Epic 1**    | **#12**  | **[Epic 3.1 - Backend] Bộ Lệnh Staging, Bộ Phân Tích Trạng Thái & RPC**                             |
| Task con      |   #13    | `[Task 1.1]` Thăm dò phiên bản Git và lưu cache `canUseRestore`                                     |
| Task con      |   #14    | `[Task 1.2]` Lệnh `stageFile` và `stageAll`                                                         |
| Task con      |   #15    | `[Task 1.3]` Lệnh `unstageFile` và `unstageAll` (Fallback Git < 2.23)                               |
| Task con      |   #16    | `[Task 1.4]` Lệnh `discardFileChanges` và `discardAllChanges`                                       |
| Task con      |   #17    | `[Task 1.5]` Nâng cấp `commit` (Amend, Sign GPG, tách Summary/Description)                          |
| Task con      |   #18    | `[Task 1.6]` `workspaceStatus.ts`: Chạy porcelain v2 và bóc tách header nhánh                       |
| Task con      |   #19    | `[Task 1.7]` `workspaceStatus.ts`: Bóc tách record tệp & `WorkspaceStatusResult`                    |
| Task con      |   #20    | `[Task 1.8]` Khai báo types RPC và đăng ký Message Handlers                                         |
| Task con      |   #21    | `[Task 1.9]` Unit Test `GitCliMutator` với cả 2 phiên bản Git                                       |
| Task con      |   #22    | `[Task 1.10]` Unit Test `workspaceStatus` & `messageHandler`                                        |
| **Epic 2**    | **#23**  | **[Epic 3.1 - UI] Kiến Trúc Cyber-Lab, Khung Đinh Tán & Commit Composer**                           |
| Task con      |   #24    | `[Task 2.1]` `CornerCrossFrame.tsx` khung đinh tán góc `+` tím neon                                 |
| Task con      |   #25    | `[Task 2.2]` `StagingFileItem.tsx` huy hiệu vuông neon 18px & bố cục                                |
| Task con      |   #26    | `[Task 2.3]` `StagingFileItem.tsx` cơ chế hover-to-reveal & diff                                    |
| Task con      |   #27    | `[Task 2.4]` `DiscardConfirmModal.tsx` hộp thoại an toàn chống mất code                             |
| Task con      |   #28    | `[Task 2.5]` `StagingPanel.tsx` phân vùng Staged/Unstaged & bulk actions                            |
| Task con      |   #29    | `[Task 2.6]` `CommitComposer.tsx` input tiêu đề & bộ đếm 50 chars 3 màu                             |
| Task con      |   #30    | `[Task 2.7]` `CommitComposer.tsx` mô tả co giãn, Checkbox Amend & Sign                              |
| Task con      |   #31    | `[Task 2.8]` `CommitComposer.tsx` nút Commit, phím tắt & âm thanh chốt cơ khí                       |
| Task con      |   #32    | `[Task 2.9]` Preact Signals store trong `staging.store.ts`                                          |
| Task con      |   #33    | `[Task 2.10]` Container tích hợp toàn diện `StagingArea.tsx`                                        |
| Task con      |   #34    | `[Task 2.11]` Unit Test UI: `CornerCrossFrame`, `StagingFileItem`, `Modal`                          |
| Task con      |   #35    | `[Task 2.12]` Unit Test UI: `staging.store`, `CommitComposer`, `StagingPanel`                       |
| **Epic 3**    | **#36**  | **[Epic 3.1 - Integration] Ghép Nối Đồ Thị F# DAG, Watcher & E2E**                                  |
| Task con      |   #37    | `[Task 3.1]` Mở khóa click dòng `UNCOMMITTED_CHANGES` trên `CommitTable.tsx`                        |
| Task con      |   #38    | `[Task 3.2]` Kiểm soát bất biến hình học đồ thị DAG (zero layout shift)                             |
| Task con      |   #39    | `[Task 3.3]` Thuật toán Debounce 150ms trong `git-repo.watcher.ts`                                  |
| Task con      |   #40    | `[Task 3.4]` Đồng bộ thời gian thực từ Watcher sang Webview qua RPC                                 |
| Task con      |   #41    | `[Task 3.5]` Test tích hợp: Watcher debounce & CommitTable staging toggle                           |
| Task con      |   #42    | `[Task 3.6]` Kiểm thử E2E Core Dev Loop & an toàn dữ liệu tuyệt đối                                 |
