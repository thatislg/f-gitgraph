# Tiến Độ Chặng 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)

Tài liệu này ghi nhận tổng quan mục tiêu, danh mục tệp tin tác động, phân rã đầu việc chi tiết tích hợp kiểm thử song hành cho từng module độc lập (Test-Driven Task Breakdown), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 3.1: Xây dựng Khu vực Staging & Bộ soạn thảo Commit**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế và theo dõi tiến độ bằng ngôn ngữ tự nhiên (**Design by Word**), mỗi nhóm nhiệm vụ độc lập bắt buộc phải có phần kiểm thử chuyên biệt đi kèm ngay trong nhóm đó; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.

---

## 📚 Hồ Sơ Thiết Kế Kỹ Thuật Tham Chiếu Trực Tiếp

Mọi công việc triển khai trong Chặng 3.1 bắt buộc đối soát và bám sát các bản đặc tả thiết kế sau:

1. **[01. Thiết Kế Tầng Backend & Mutator Cho Staging](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md)**:
   - Đặc tả bộ lệnh `GitCliMutator.ts` (`stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `commit`).
   - Thuật toán bóc tách cú pháp `git status --porcelain=v2 --branch -uall -c core.quotepath=false`.
   - Hợp đồng từ điển dữ liệu RPC trong `src/types/actions.ts` và `src/types/queries.ts`.
2. **[02. Thiết Kế Giao Diện Staging Area & Commit Composer](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md)**:
   - Đặc tả khung đinh tán chữ thập góc (`+`) `CornerCrossFrame.tsx` và cơ chế bừng sáng tím Neon khi focus.
   - Cơ chế Hover-to-Reveal Actions (ẩn các nút tác vụ trên dòng tệp, chỉ hiện khi rê chuột để chống rối mắt kiểu GitLens).
   - Quy chuẩn huy hiệu vuông Neon 18px (`A`, `M`, `D`, `R`, `U`), bộ đếm 50 chars chuyển 3 màu, phím tắt `Ctrl + Enter`.
   - Hộp thoại cảnh báo an toàn Discard Modal bảo vệ mã nguồn.
3. **[03. Tích Hợp Đồng Bộ Working Tree & File Watcher](../../02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md)**:
   - Cam kết bất biến hình học: Bảo toàn 100% `HexagonNode.tsx`, avatar clipPath, zoom 5x, vầng neon ambient, và thuật toán F# DAG.
   - Cơ chế bắt sự kiện click trên dòng `UNCOMMITTED_CHANGES` (`*`) trong `CommitTable.tsx` để mở `<StagingArea />` trong Overlay Inspector Panel.
   - Thuật toán Debounce 150ms chống bão sự kiện trong `git-repo.watcher.ts`.
4. **[004_Design_System_And_Visual_Identity.md](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md)**:
   - Hệ thống token màu sắc Cyber-Lab cho cả Dark Mode và Light Mode.
5. **[005_Audio_Feedback_And_Sound_Design.md](../../01_investigation/phase3_Reborn/005_Audio_Feedback_And_Sound_Design.md)**:
   - Đặc tả âm thanh chốt cơ khí vi mô khi commit thành công qua Web Audio API.

---

## 1. Tổng Quan Giai Đoạn & Danh Mục Tệp Tin Tác Động

### 1.1. Tầm Nhìn & Mục Tiêu Cốt Lõi
- **Mục tiêu**: Hoàn thiện vòng lặp phát triển cốt lõi của lập trình viên (Xem tệp thay đổi $\rightarrow$ Stage/Unstage $\rightarrow$ Soạn thảo thông điệp $\rightarrow$ Commit mã nguồn $\rightarrow$ Commit & Push) ngay trên F-GitGraph, loại bỏ sự phụ thuộc vào tab Source Control mặc định của VS Code.
- **Nguyên tắc triển khai độc lập kèm kiểm thử**: Mỗi module thành phần được phát triển và kiểm thử độc lập, có bộ test suite tương ứng xác nhận tính đúng đắn trước khi ghép nối vào hệ thống chung.
- **Tiến độ tổng thể**: 0% hoàn thành (Sẵn sàng triển khai mã nguồn).

### 1.2. Bảng Kiểm Kê Tệp Tin Tác Động (Impacted Files Inventory)

| Phân Loại | Đường Dẫn Tệp Tin | Trách Nhiệm Kỹ Thuật Chính |
| :--- | :--- | :--- |
| **Backend Core** | `src/extension/mutator/gitCliMutator.ts` | Bổ sung: `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, nâng cấp `commit`. |
| **Backend Query**| `src/backend/queries/workspaceStatus.ts` | Bóc tách `git status --porcelain=v2`, xuất cấu trúc `WorkspaceStatusResult`. |
| **Backend Types**| `src/types/actions.ts` | Bổ sung các kiểu action payloads cho thao tác staging và commit. |
| **Backend Types**| `src/types/queries.ts` | Bổ sung kiểu query payload cho `workspaceStatus`. |
| **Backend IPC**  | `src/extension/services/messageHandler.ts` | Đăng ký bộ xử lý action request và query request mới từ Webview. |
| **Backend Test** | `tests/extension/mutator/stagingMutator.test.ts` | Bộ unit test kiểm thử các phương thức staging và commit trong `GitCliMutator`. |
| **Backend Test** | `tests/backend/queries/workspaceStatus.test.ts` | Bộ unit test bóc tách chuỗi porcelain v2 (A, M, D, R, U, branch info, unicode). |
| **Backend Test** | `tests/extension/services/stagingMessageHandler.test.ts` | Bộ unit test kiểm thử điều phối thông điệp RPC qua `messageHandler`. |
| **UI Component** | `src/webview/components/ui/CornerCrossFrame.tsx` | Khung viền kỹ thuật mang 4 đinh tán chữ thập góc (`+`) với hiệu ứng bừng sáng focus. |
| **UI Component** | `src/webview/components/staging/StagingFileItem.tsx` | Dòng hiển thị tệp tin, badge vuông neon, tên tệp, đường dẫn mờ, hover-to-reveal actions. |
| **UI Component** | `src/webview/components/staging/DiscardConfirmModal.tsx` | Hộp thoại modal cảnh báo an toàn trước khi xóa vĩnh viễn tệp biến động. |
| **UI Component** | `src/webview/components/staging/StagingPanel.tsx` | Quản lý 2 phân nhóm Staged Changes và Changes (Unstaged), nút hành động hàng loạt. |
| **UI Component** | `src/webview/components/staging/CommitComposer.tsx` | Ô nhập tiêu đề, bộ đếm 50 chars, ô mô tả mở rộng, tùy chọn amend/sign, nút Commit & Push. |
| **UI Component** | `src/webview/components/staging/StagingArea.tsx` | Container bao bọc toàn bộ phân vùng Staging & Composer đặt trong `CornerCrossFrame`. |
| **UI State**     | `src/webview/lib/stores/staging.store.ts` | Quản lý toàn bộ trạng thái phản ứng bằng Preact Signals. |
| **UI Test**      | `tests/webview/components/ui/CornerCrossFrame.test.tsx` | Unit test render 4 đinh tán `+`, hiệu ứng chuyển đổi trạng thái active, và hỗ trợ theme. |
| **UI Test**      | `tests/webview/components/staging/StagingFileItem.test.tsx` | Unit test màu sắc badge A/M/D/R/U, hover-to-reveal nút bấm, sự kiện click diff/stage/discard. |
| **UI Test**      | `tests/webview/components/staging/DiscardConfirmModal.test.tsx`| Unit test hiển thị cảnh báo, phím tắt Esc hủy bỏ, xác nhận Discard. |
| **UI Test**      | `tests/webview/lib/stores/staging.store.test.ts` | Unit test logic tín hiệu `canCommit`, đồng bộ danh sách tệp, chuyển đổi cờ amend/sign. |
| **UI Test**      | `tests/webview/components/staging/CommitComposer.test.tsx` | Unit test bộ đếm 50 ký tự (trắng -> vàng -> đỏ), phím tắt `Ctrl + Enter`, trạng thái nút bấm. |
| **UI Test**      | `tests/webview/components/staging/StagingPanel.test.tsx` | Unit test render 2 phân nhóm, số lượng tệp đếm, nút Stage All, Unstage All, Discard All. |
| **Integration**  | `src/webview/components/commit/CommitTable.tsx` | Mở khóa click dòng `UNCOMMITTED_CHANGES` (`*`), hiển thị `<StagingArea />` trong Overlay Inspector. |
| **Integration**  | `src/extension/watchers/git-repo.watcher.ts` | Tích hợp thuật toán Debounce 150ms bắn thông báo cập nhật `workspaceStatus`. |
| **Integr. Test** | `tests/extension/watchers/gitRepoWatcher.debounce.test.ts` | Test cơ chế Debounce 150ms gom bão sự kiện thành đúng 1 lần gọi `workspaceStatus`. |
| **Integr. Test** | `tests/webview/components/commit/CommitTable.staging.test.tsx` | Test click chọn dòng `UNCOMMITTED_CHANGES` mở đúng `<StagingArea />` không làm lệch bảng DAG. |

---

## 2. Phân Rã Đầu Việc Chi Tiết Kèm Kiểm Thử Đồng Hành Từng Nhóm

---

### 📋 Nhóm Việc 1: Mở Rộng Backend GitCliMutator, Bộ Truy Vấn & RPC Protocol — [Epic #12](https://github.com/thatislg/f-gitgraph/issues/12)
*Tài liệu tham chiếu thiết kế*: [01_Staging_Backend_And_Mutator_Design.md](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md).

- [x] **Nhiệm vụ 1.1: Hiện thực cơ chế tương thích đa phiên bản Git & các lệnh Staging trong `src/extension/mutator/gitCliMutator.ts`**
  - [x] **1.1.0 ([#13](https://github.com/thatislg/f-gitgraph/issues/13))**: Hiện thực hàm thăm dò phiên bản một lần `canUseRestore()`: Thực thi `git version`, bóc tách chỉ số Major/Minor (Git >= 2.23), lưu cờ `supportsRestore` vào in-memory cache để không tốn thêm tiến trình ở các lần gọi sau.
  - [x] **1.1.1 & 1.1.3 ([#14](https://github.com/thatislg/f-gitgraph/issues/14))**: Hiện thực hàm `stageFile(filePath: string)` (`git add -- <filePath>`) và `stageAll()` (`git add -A`), bảo đảm ký tự phân tách `--` luôn hiện diện để ngăn nhầm lẫn đường dẫn với nhánh. Tương thích 100% mọi phiên bản Git.
  - [x] **1.1.2 & 1.1.4 ([#15](https://github.com/thatislg/f-gitgraph/issues/15))**: Hiện thực hàm `unstageFile(filePath: string)` và `unstageAll()`: Rẽ nhánh an toàn theo phiên bản Git (`git restore --staged` trên Git >= 2.23, fallback `git reset` trên Git < 2.23).
  - [x] **1.1.5 & 1.1.6 ([#16](https://github.com/thatislg/f-gitgraph/issues/16))**: Hiện thực hàm `discardFileChanges(filePath: string, isUntracked: boolean)` và `discardAllChanges()`: Xóa sạch tệp untracked bằng `git clean -f`, khôi phục tệp tracked bằng `git restore` (fallback `git checkout`).

- [x] **Nhiệm vụ 1.2 ([#17](https://github.com/thatislg/f-gitgraph/issues/17)): Nâng cấp hàm `commit` trong `src/extension/mutator/gitCliMutator.ts`**
  - [x] **1.2.1**: Mở rộng tham số nhận diện cờ sửa đổi commit gần nhất `--amend` mà không tạo commit mới.
  - [x] **1.2.2**: Mở rộng tham số nhận diện cờ ký số bảo mật `-S` (GPG/SSH Commit Signing).
  - [x] **1.2.3**: Phân tách rõ ràng giữa dòng tiêu đề (Summary) và khối mô tả mở rộng (Description): Truyền 2 cờ `-m` độc lập vào tiến trình `git.exe` để Git tự động chèn dòng trống ngăn cách chuẩn quy ước.
  - [x] **1.2.4**: Bắt và chuẩn hóa các thông báo lỗi đặc thù: Xung đột khóa tệp `.git/index.lock`, lỗi thiếu danh tính tác giả (`user.name` / `user.email`).

- [x] **Nhiệm vụ 1.3: Xây dựng bộ truy vấn trạng thái kho `src/backend/queries/workspaceStatus.ts`**
  - [x] **1.3.1 & 1.3.2 ([#18](https://github.com/thatislg/f-gitgraph/issues/18))**: Khởi tạo hàm thực thi `git status --porcelain=v2 --branch --untracked-files=all -c core.quotepath=false -z` và bóc tách header nhánh (`# branch.head`, `# branch.upstream`, `# branch.ab +ahead -behind`) theo máy trạng thái NUL-delimiter.
  - [x] **1.3.3 - 1.3.6 ([#19](https://github.com/thatislg/f-gitgraph/issues/19))**: Bóc tách tệp untracked (`? <path>`), ordinary changes (`1 <XY> ...`), tệp đổi tên hai phân đoạn NUL (`2 <XY> ... <path>\0<origPath>`), tệp xung đột (`u <XY> ...` vào `conflictedFiles`), xử lý trạng thái kép `MM`/`AM`/`AD`/`RM`/`RD`, tính cờ `isClean` và đóng gói `WorkspaceStatusResult`.

- [x] **Nhiệm vụ 1.4 ([#20](https://github.com/thatislg/f-gitgraph/issues/20)): Định nghĩa kiểu dữ liệu & Đăng ký Message Handlers**
  - [x] **1.4.1**: Cập nhật `src/types/actions.ts`: Khai báo các payload cho `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `discardAllChanges`, `commitChanges`.
  - [x] **1.4.2**: Cập nhật `src/types/queries.ts`: Khai báo query payload cho `workspaceStatus` với cấu trúc `WorkspaceStatusResult`.
  - [x] **1.4.3**: Cập nhật `src/extension/services/messageHandler.ts`: Đăng ký tiếp nhận và chuyển tiếp các action và query mới tới `GitCliMutator` và `workspaceStatus`.

- [x] **Nhiệm vụ 1.5 (TEST NHÓM 1): Bộ Unit Tests Độc Lập Cho Tầng Backend**
  - [x] **1.5.1 ([#21](https://github.com/thatislg/f-gitgraph/issues/21))**: Test cơ chế `canUseRestore()`, `stageFile`, `stageAll`, `unstageFile`, `unstageAll`, `discardFileChanges`, `discardAllChanges`, `commit` nâng cao với cả 2 nhánh Git phiên bản (>= 2.23 và < 2.23) — đã phủ trong `tests/backend/gitCliMutator.test.ts`.
  - [x] **1.5.2 & 1.5.3 ([#22](https://github.com/thatislg/f-gitgraph/issues/22))**: Tạo `tests/backend/queries/workspaceStatus.test.ts` (test bóc tách porcelain v2 NUL, tên tiếng Việt, xung đột, cờ isClean) và `tests/extension/services/stagingMessageHandler.test.ts` (test định tuyến RPC).

---

### 📋 Nhóm Việc 2: Triển Khai Các Khối Giao Diện Cơ Bản (UI Building Blocks) — [Epic #23](https://github.com/thatislg/f-gitgraph/issues/23)
*Tài liệu tham chiếu thiết kế*: [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md).

- [ ] **Nhiệm vụ 2.1 ([#24](https://github.com/thatislg/f-gitgraph/issues/24)): Xây dựng khung kỹ thuật đinh tán góc `src/webview/components/ui/CornerCrossFrame.tsx`**
  - [ ] **2.1.1**: Định vị chính xác 4 ký tự chữ thập (`+`) tại 4 góc của khung viền (top-left, top-right, bottom-left, bottom-right).
  - [ ] **2.1.2**: Quản lý trạng thái bừng sáng của đinh tán: Mặc định xám mờ (độ mờ 50%), khi khung được kích hoạt hoặc focus thì bừng sáng tím Neon (`#a855f7`) ở độ mờ 100%.
  - [ ] **2.1.3**: Thiết lập tương thích hoàn hảo giữa 2 chế độ Dark Mode và Light Mode theo bảng token Cyber-Lab.

- [ ] **Nhiệm vụ 2.2: Xây dựng Component hiển thị dòng tệp `src/webview/components/staging/StagingFileItem.tsx`**
  - [ ] **2.2.1 & 2.2.2 ([#25](https://github.com/thatislg/f-gitgraph/issues/25))**: Thiết kế huy hiệu trạng thái vuông Neon kích thước chuẩn $18\text{px} \times 18\text{px}$ (`A`, `M`, `D`, `R`, `U`), bố cục tên tệp nổi bật phía trước và đường dẫn phụ mờ phía sau.
  - [ ] **2.2.3 - 2.2.5 ([#26](https://github.com/thatislg/f-gitgraph/issues/26))**: Hiện thực cơ chế *Hover-to-Reveal Actions* (ẩn mặc định `opacity-0`, rê chuột hiện `hover:opacity-100`), tích hợp nút Stage/Unstage/Discard và nhấp chọn mở `vscode.diff`.

- [ ] **Nhiệm vụ 2.3 ([#27](https://github.com/thatislg/f-gitgraph/issues/27)): Xây dựng hộp thoại xác nhận an toàn `src/webview/components/staging/DiscardConfirmModal.tsx`**
  - [ ] **2.3.1**: Thiết kế giao diện Modal nổi ở chính giữa màn hình, đóng khung trong `CornerCrossFrame` với đinh tán góc phát sáng màu đỏ cam cảnh báo.
  - [ ] **2.3.2**: Hiển thị thông điệp cảnh báo rõ ràng rằng thao tác hoàn tác sẽ xóa vĩnh viễn dữ liệu chưa commit và không thể phục hồi qua `git reflog`.
  - [ ] **2.3.3**: Cung cấp nút Hủy Bỏ (`Cancel`) ưu tiên (nhận phím tắt `Esc`) và nút Xác Nhận Hoàn Tác (`Discard`) màu đỏ cảnh báo.

- [ ] **Nhiệm vụ 2.4 (TEST NHÓM 2) ([#34](https://github.com/thatislg/f-gitgraph/issues/34)): Bộ Unit Tests Độc Lập Cho Từng Component UI Cơ Bản**
  - [ ] **2.4.1**: Tạo `tests/webview/components/ui/CornerCrossFrame.test.tsx`: Test 4 ký tự đinh tán góc, active focus glow, hiển thị children.
  - [ ] **2.4.2**: Tạo `tests/webview/components/staging/StagingFileItem.test.tsx`: Test huy hiệu vuông màu neon, hover-to-reveal class, callback nút bấm.
  - [ ] **2.4.3**: Tạo `tests/webview/components/staging/DiscardConfirmModal.test.tsx`: Test thông điệp cảnh báo, phím `Esc` và click nút Cancel/Discard.

---

### 📋 Nhóm Việc 3: Triển Khai Phân Vùng Staging, Composer & Quản Lý Trạng Thái — [Epic #23](https://github.com/thatislg/f-gitgraph/issues/23)
*Tài liệu tham chiếu thiết kế*: [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md) và [005_Audio_Feedback_And_Sound_Design.md](../../01_investigation/phase3_Reborn/005_Audio_Feedback_And_Sound_Design.md).

- [ ] **Nhiệm vụ 3.1 ([#28](https://github.com/thatislg/f-gitgraph/issues/28)): Xây dựng bảng hiển thị tệp `src/webview/components/staging/StagingPanel.tsx`**
  - [ ] **3.1.1**: Phân chia giao diện thành 2 phân khu: "Staged Changes" và "Changes (Unstaged)".
  - [ ] **3.1.2**: Hiển thị số lượng tệp tự động cập nhật bên cạnh mỗi tiêu đề.
  - [ ] **3.1.3**: Thanh tác vụ hàng loạt trên tiêu đề: Nút "Unstage All" ở nhóm Staged; Nút "Stage All" và "Discard All" ở nhóm Changes.
  - [ ] **3.1.4**: Giao diện Empty State thông báo tinh tế khi không có tệp nào biến động.

- [ ] **Nhiệm vụ 3.2: Xây dựng bộ soạn thảo commit `src/webview/components/staging/CommitComposer.tsx`**
  - [ ] **3.2.1 & 3.2.2 ([#29](https://github.com/thatislg/f-gitgraph/issues/29))**: Ô nhập tiêu đề commit (Subject Input 34px) và bộ đếm 50 ký tự thông minh chuyển 3 mức màu (xám -> vàng -> đỏ).
  - [ ] **3.2.3 - 3.2.5 ([#30](https://github.com/thatislg/f-gitgraph/issues/30))**: Textarea mô tả chi tiết co giãn 60-160px, Checkbox Amend previous commit và Checkbox Sign commit (GPG/SSH).
  - [ ] **3.2.6 - 3.2.9 ([#31](https://github.com/thatislg/f-gitgraph/issues/31))**: Nút hành động chính `Commit` (hiển thị số lượng tệp staged, tím Neon), nút phụ `Commit & Push`, phím tắt `Ctrl + Enter` và âm thanh chốt cơ khí qua Web Audio API khi commit thành công.

- [ ] **Nhiệm vụ 3.3 ([#32](https://github.com/thatislg/f-gitgraph/issues/32)): Quản lý trạng thái bằng Preact Signals trong `src/webview/lib/stores/staging.store.ts`**
  - [ ] **3.3.1**: Khởi tạo các tín hiệu cơ sở: `stagedFiles`, `unstagedFiles`, `commitSubject`, `commitDescription`, `isAmend`, `isSign`, `isCommitting`.
  - [ ] **3.3.2**: Khởi tạo tín hiệu dẫn xuất `canCommit`: Tự động tính toán trạng thái nút Commit.
  - [ ] **3.3.3**: Hiện thực các hàm điều phối hành động giao diện: `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFile`, `commit`.

- [ ] **Nhiệm vụ 3.4 ([#33](https://github.com/thatislg/f-gitgraph/issues/33)): Xây dựng Container tích hợp `src/webview/components/staging/StagingArea.tsx`**
  - [ ] **3.4.1**: Tích hợp `StagingPanel` và `CommitComposer` thành một khối thống nhất, bọc toàn bộ bên trong `CornerCrossFrame`.
  - [ ] **3.4.2**: Quản lý trạng thái mở/đóng của `DiscardConfirmModal` một cách tập trung.

- [ ] **Nhiệm vụ 3.5 (TEST NHÓM 3) ([#35](https://github.com/thatislg/f-gitgraph/issues/35)): Bộ Unit Tests Độc Lập Cho Store & Bộ Soạn Thảo**
  - [ ] **3.5.1**: Tạo `tests/webview/lib/stores/staging.store.test.ts`: Test tín hiệu `canCommit`, amend commit khi danh sách rỗng, cập nhật tệp từ Backend.
  - [ ] **3.5.2**: Tạo `tests/webview/components/staging/CommitComposer.test.tsx`: Test bộ đếm 3 màu, disabled khi rỗng tiêu đề, phím `Ctrl + Enter`.
  - [ ] **3.5.3**: Tạo `tests/webview/components/staging/StagingPanel.test.tsx`: Test render tệp, click Stage All / Unstage All, Empty State.

---

### 📋 Nhóm Việc 4: Tích Hợp Đồ Thị DAG & Bộ Giám Sát Thời Gian Thực — [Epic #36](https://github.com/thatislg/f-gitgraph/issues/36)
*Tài liệu tham chiếu thiết kế*: [03_WorkingTree_Sync_And_Watcher_Integration.md](../../02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md).

- [ ] **Nhiệm vụ 4.1: Đồng bộ dòng Uncommitted Changes trên đồ thị `src/webview/components/commit/CommitTable.tsx`**
  - [ ] **4.1.1 & 4.1.2 ([#37](https://github.com/thatislg/f-gitgraph/issues/37))**: Mở khóa sự kiện click trên dòng `UNCOMMITTED_CHANGES` (`*`) và điều phối bảng Inspector nổi (`<StagingArea />` vs `<CommitDetails />`).
  - [ ] **4.1.3 ([#38](https://github.com/thatislg/f-gitgraph/issues/38))**: Bảo đảm 100% không làm lệch tọa độ hay chiều cao dòng của bảng commit, bảo toàn bất biến tuyệt đối các đường cong Bézier và avatar clipPath của nhân F# Core (zero layout shift).

- [ ] **Nhiệm vụ 4.2: Tích hợp File Watcher và đồng bộ thời gian thực trong `src/extension/watchers/git-repo.watcher.ts`**
  - [ ] **4.2.1 & 4.2.2 ([#39](https://github.com/thatislg/f-gitgraph/issues/39))**: Thiết lập bộ đếm thời gian Debounce 150ms cho các sự kiện biến động từ hệ thống tệp và lọc bỏ các thư mục rác (`node_modules`, `dist`, `.git/objects`).
  - [ ] **4.2.3 ([#40](https://github.com/thatislg/f-gitgraph/issues/40))**: Khi hết thời gian chờ 150ms ổn định, tự động kích hoạt truy vấn `workspaceStatus` và phát thông báo cập nhật sang Webview để làm mới danh sách tệp biến động.

- [ ] **Nhiệm vụ 4.3 (TEST NHÓM 4) ([#41](https://github.com/thatislg/f-gitgraph/issues/41)): Bộ Kiểm Thử Tích Hợp Đồ Thị & File Watcher**
  - [ ] **4.3.1**: Tạo `tests/extension/watchers/gitRepoWatcher.debounce.test.ts`: Test bắn 10 sự kiện tệp gom lại 1 lần sau 150ms, test bỏ qua thư mục rác.
  - [ ] **4.3.2**: Tạo `tests/webview/components/commit/CommitTable.staging.test.tsx`: Test click dòng `*` mở StagingArea, click commit thường mở CommitDetails, test không lệch chiều cao dòng.

---

### 📋 Nhóm Việc 5: Kiểm Thử Nghiệm Thu Tổng Hợp Toàn Quy Trình & An Toàn Dữ Liệu — [Epic #36](https://github.com/thatislg/f-gitgraph/issues/36)
*Tài liệu tham chiếu thiết kế*: Mục 5 trong cả 3 bản thiết kế kỹ thuật.

- [ ] **Nhiệm vụ 5.1 - 5.4 ([#42](https://github.com/thatislg/f-gitgraph/issues/42)): Bộ Kiểm Thử Nghiệm Thu Toàn Quy Trình (E2E & An Toàn Dữ Liệu)**
  - [ ] **5.1.1 & 5.1.2**: Thử nghiệm E2E chu trình phát triển: Sửa tệp -> Watcher -> Click WIP -> Stage -> Commit -> DAG nạp commit mới; Thử nghiệm Commit & Push.
  - [ ] **5.2.1 & 5.2.2**: Đo đạc độ lệch tọa độ hình học (zero layout shift bằng 0px) trước và sau khi mở Staging Area.
  - [ ] **5.3.1 - 5.3.3**: Kiểm định an toàn dữ liệu: Modal Discard ngăn xóa nhầm, an toàn Amend commit, xử lý xung đột tệp khóa `.git/index.lock`.
  - [ ] **5.4.1 & 5.4.2**: Kiểm tra hiển thị tương thích hoàn hảo trên cả Dark Theme và Light Theme.
  - [ ] **5.3.3**: Thử nghiệm xử lý xung đột tệp khóa `.git/index.lock` khi chạy song song với terminal: Đảm bảo hiển thị thông báo lỗi rõ ràng, không làm crash Webview.

- [ ] **Nhiệm vụ 5.4: Kiểm định tương thích hiển thị giao diện**
  - [ ] **5.4.1**: Kiểm tra hiển thị chuẩn sắc nét trên Dark Theme (nền tối, đinh tán tím Neon, badge tương phản cao).
  - [ ] **5.4.2**: Kiểm tra hiển thị chuẩn thanh lịch trên Light Theme (nền sáng, đinh tán tím đậm, chữ dễ đọc).

---

## 3. Lộ Trình Triển Khai Tuần Tự Từng Bước Kèm Kiểm Thử (TDD Phasing Roadmap)

Quá trình lập trình được tiến hành theo thứ tự 5 bước khép kín, mỗi bước đều viết mã nguồn kèm viết test và chạy test pass 100% trước khi chuyển sang bước tiếp theo:

```
[Bước 1: Nền Tảng Backend]
 ├─ Hiện thực GitCliMutator.ts & workspaceStatus.ts
 ├─ Khai báo Action & Query Types trong src/types/
 ├─ Đăng ký xử lý trong messageHandler.ts
 └─ VIẾT VÀ CHẠY TEST: stagingMutator.test.ts & workspaceStatus.test.ts (PASS 100%)
       │
       ▼
[Bước 2: Các Khối Giao Diện Cơ Bản]
 ├─ Xây dựng CornerCrossFrame.tsx (+)
 ├─ Xây dựng StagingFileItem.tsx (Neon badges + hover-to-reveal)
 ├─ Xây dựng DiscardConfirmModal.tsx (Hộp thoại an toàn)
 └─ VIẾT VÀ CHẠY TEST: CornerCrossFrame.test.tsx, StagingFileItem.test.tsx, DiscardConfirmModal.test.tsx (PASS 100%)
       │
       ▼
[Bước 3: Phân Vùng Staging & Soạn Thảo Commit]
 ├─ Xây dựng StagingPanel.tsx (Staged vs Changes)
 ├─ Xây dựng CommitComposer.tsx (Bộ đếm 50 chars, Amend, Sign, Ctrl+Enter, Audio)
 ├─ Xây dựng staging.store.ts (Preact Signals)
 ├─ Tích hợp StagingArea.tsx
 └─ VIẾT VÀ CHẠY TEST: staging.store.test.ts, CommitComposer.test.tsx, StagingPanel.test.tsx (PASS 100%)
       │
       ▼
[Bước 4: Ghép Nối Đồ Thị & File Watcher Thời Gian Thực]
 ├─ Mở khóa click UNCOMMITTED_CHANGES trong CommitTable.tsx
 ├─ Điều phối hiển thị StagingArea trong Overlay Inspector
 ├─ Cài đặt Debounce 150ms trong git-repo.watcher.ts
 └─ VIẾT VÀ CHẠY TEST: gitRepoWatcher.debounce.test.ts & CommitTable.staging.test.tsx (PASS 100%)
       │
       ▼
[Bước 5: Nghiệm Thu Hoàn Thành Toàn Diện]
 ├─ Chạy toàn bộ test suite (Toàn bộ 11 test files đạt trạng thái PASS)
 ├─ Đo đạc tính bất biến hình học (0 pixel sai lệch)
 └─ Kiểm thử End-to-End chu trình Dev Loop thực tế
```

---

## 4. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. **Khép kín vòng lặp dev**: Lập trình viên có thể xem thay đổi $\rightarrow$ bấm Stage $\rightarrow$ gõ commit $\rightarrow$ bấm Commit hoặc `Ctrl+Enter` ngay trên F-GitGraph mà không cần mở bất kỳ tab hay terminal nào khác.
2. **Đồng bộ trạng thái 100%**: Danh sách Staged và Unstaged khớp hoàn hảo với kết quả của lệnh `git status`.
3. **An toàn dữ liệu tuyệt đối**: Không bao giờ thực thi Discard nếu người dùng chưa xác nhận qua hộp thoại cảnh báo.
4. **Bảo toàn hình học đồ thị**: Đóng mở Staging Area không làm dịch chuyển hay biến dạng bất kỳ đường cong SVG nào của đồ thị commit.
5. **Độ phủ kiểm thử tự động**: Toàn bộ 11 test files mới viết độc lập cho từng module đều vượt qua 100% (Green), không có lỗi typecheck TypeScript hay lint warning nào.

---

## 5. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-15**: Khởi tạo tài liệu tiến độ Chặng 3.1.
- **2026-10-15**: Chi tiết hóa toàn diện tài liệu tiến độ Chặng 3.1: Bổ sung bảng kiểm kê 16 tệp tin tác động, phân rã 28 nhiệm vụ kỹ thuật con từng bước, gắn liên kết trực tiếp tới toàn bộ 5 tài liệu thiết kế.
- **2026-10-15**: Tích hợp các bộ kiểm thử độc lập cho từng nhóm nhiệm vụ riêng biệt (bổ sung 11 tệp unit/component/integration test tương ứng với từng tầng kỹ thuật), cập nhật lộ trình thực thi theo chuẩn TDD khép kín.
- **2026-10-15**: Hoàn thành Nhiệm vụ 1.1 (6 lệnh staging + cơ chế thăm dò phiên bản `canUseRestore` và fallback đa phiên bản Git) và Nhiệm vụ 1.2 (nâng cấp `commit` hỗ trợ `--amend`, `-S`, tách summary/description, chuẩn hóa lỗi `index.lock`/danh tính). Kiểm thử backend 11/11 pass. Báo cáo nghiệm thu: `docs/04_reports/phase3/001_phase3_1_staging_mutator_report.md`.
- **2026-10-15**: Hoàn thành lại Nhiệm vụ 1.3 theo thiết kế cập nhật (máy trạng thái NUL-delimiter, `--untracked-files=all -z`, `conflictedFiles`, trạng thái kép `MM`/`AM`/`AD`/`RM`/`RD`), Nhiệm vụ 1.4 (types RPC + message handlers) và Nhiệm vụ 1.5 (bộ test `workspaceStatus` + `stagingMessageHandler`). Kiểm thử `workspaceStatus` 20/20, `stagingMessageHandler` 5/5, typecheck + oxlint + oxfmt sạch.
