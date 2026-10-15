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

### 📋 Nhóm Việc 1: Mở Rộng Backend GitCliMutator, Bộ Truy Vấn & RPC Protocol (Kèm Test Độc Lập)
*Tài liệu tham chiếu thiết kế*: [01_Staging_Backend_And_Mutator_Design.md](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md).

- [x] **Nhiệm vụ 1.1: Hiện thực cơ chế tương thích đa phiên bản Git & các lệnh Staging trong `src/extension/mutator/gitCliMutator.ts`** ([#1](https://github.com/thatislg/f-gitgraph/issues/1))
  - [x] **1.1.0**: Hiện thực hàm thăm dò phiên bản một lần `canUseRestore()`: Thực thi `git version`, bóc tách chỉ số Major/Minor (Git >= 2.23), lưu cờ `supportsRestore` vào in-memory cache để không tốn thêm tiến trình ở các lần gọi sau.
  - [x] **1.1.1**: Hiện thực hàm `stageFile(filePath: string)`: Gọi lệnh `git add -- <filePath>`, bảo đảm ký tự phân tách `--` luôn hiện diện để ngăn nhầm lẫn đường dẫn với nhánh. Tương thích 100% mọi phiên bản Git.
  - [x] **1.1.2**: Hiện thực hàm `unstageFile(filePath: string)`: Rẽ nhánh an toàn theo phiên bản Git:
    - Nếu Git hỗ trợ `restore` (Git >= 2.23): Gọi `git restore --staged -- <filePath>`.
    - Nếu Git cũ (Git < 2.23): Fallback gọi `git reset -- <filePath>` (an toàn cho cả tệp tracked lẫn untracked vừa add).
  - [x] **1.1.3**: Hiện thực hàm `stageAll()`: Gọi lệnh `git add -A` đưa toàn bộ tệp mới, tệp sửa đổi và tệp xóa vào chỉ mục. Tương thích 100% mọi phiên bản Git.
  - [x] **1.1.4**: Hiện thực hàm `unstageAll()`: Rẽ nhánh an toàn:
    - Nếu Git hỗ trợ `restore` (Git >= 2.23): Gọi `git restore --staged .`.
    - Nếu Git cũ (Git < 2.23): Fallback gọi `git reset`.
  - [x] **1.1.5**: Hiện thực hàm `discardFileChanges(filePath: string, isUntracked: boolean)`:
    - Nếu `isUntracked` là true: Gọi `git clean -f -- <filePath>` (tương thích mọi phiên bản Git).
    - Nếu `isUntracked` là false (tệp tracked): Rẽ nhánh:
      - Git >= 2.23: Gọi `git restore -- <filePath>`.
      - Git < 2.23: Fallback gọi `git checkout -- <filePath>`.
  - [x] **1.1.6**: Hiện thực hàm `discardAllChanges()`: Thực thi tuần tự 2 bước:
    - Bước 1: Rẽ nhánh khôi phục tệp tracked: gọi `git restore .` (Git >= 2.23) hoặc `git checkout -- .` (Git < 2.23). Dừng ngay nếu bước 1 thất bại.
    - Bước 2: Gọi `git clean -fd` xóa sạch tệp và thư mục chưa theo dõi.

- [x] **Nhiệm vụ 1.2: Nâng cấp hàm `commit` trong `src/extension/mutator/gitCliMutator.ts`** ([#2](https://github.com/thatislg/f-gitgraph/issues/2))
  - [x] **1.2.1**: Mở rộng tham số nhận diện cờ sửa đổi commit gần nhất `--amend` mà không tạo commit mới.
  - [x] **1.2.2**: Mở rộng tham số nhận diện cờ ký số bảo mật `-S` (GPG/SSH Commit Signing).
  - [x] **1.2.3**: Phân tách rõ ràng giữa dòng tiêu đề (Summary) và khối mô tả mở rộng (Description): Truyền 2 cờ `-m` độc lập vào tiến trình `git.exe` để Git tự động chèn dòng trống ngăn cách chuẩn quy ước.
  - [x] **1.2.4**: Bắt và chuẩn hóa các thông báo lỗi đặc thù: Xung đột khóa tệp `.git/index.lock`, lỗi thiếu danh tính tác giả (`user.name` / `user.email`).

- [ ] **Nhiệm vụ 1.3: Xây dựng bộ truy vấn trạng thái kho `src/backend/queries/workspaceStatus.ts`** ([#3](https://github.com/thatislg/f-gitgraph/issues/3))
  - [ ] **1.3.1**: Khởi tạo hàm thực thi `git status --porcelain=v2 --branch -uall -c core.quotepath=false` để lấy toàn bộ dữ liệu trạng thái phẳng UTF-8 không mã hóa octal.
  - [ ] **1.3.2**: Hiện thực bộ bóc tách các dòng header thông tin nhánh:
    - Bóc tách `# branch.head` lưu tên nhánh hiện tại.
    - Bóc tách `# branch.upstream` lưu tên nhánh từ xa đang theo dõi.
    - Bóc tách `# branch.ab +<ahead> -<behind>` lưu số lượng commit đi trước và đi sau.
  - [ ] **1.3.3**: Hiện thực bộ bóc tách dòng tệp chưa theo dõi: Nhận diện dòng bắt đầu bằng `? <path>`, tạo bản ghi tệp với mã `U` và cờ `isUntracked = true`.
  - [ ] **1.3.4**: Hiện thực bộ bóc tách dòng tệp biến động thông thường (bắt đầu bằng `1 <XY> ... <path>`):
    - Đánh giá ký tự `X` (Staged): Nếu khác dấu chấm `.`, đưa vào mảng `stagedFiles` với loại tương ứng (`A`, `M`, `D`).
    - Đánh giá ký tự `Y` (Unstaged): Nếu khác dấu chấm `.`, đưa vào mảng `unstagedFiles` với loại tương ứng (`M`, `D`).
  - [ ] **1.3.5**: Hiện thực bộ bóc tách dòng tệp đổi tên (bắt đầu bằng `2 <XY> ... <path>\t<oldPath>`): Đưa vào mảng `stagedFiles` với mã `R` và lưu kèm `oldPath`.
  - [ ] **1.3.6**: Tính toán cờ trạng thái kho sạch sẽ: Đặt `isClean = true` khi cả 2 danh sách đều rỗng.

- [ ] **Nhiệm vụ 1.4: Định nghĩa kiểu dữ liệu & Đăng ký Message Handlers** ([#4](https://github.com/thatislg/f-gitgraph/issues/4))
  - [ ] **1.4.1**: Cập nhật `src/types/actions.ts`: Khai báo các payload cho `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `discardAllChanges`, `commitChanges`.
  - [ ] **1.4.2**: Cập nhật `src/types/queries.ts`: Khai báo query payload cho `workspaceStatus` với cấu trúc `WorkspaceStatusResult`.
  - [ ] **1.4.3**: Cập nhật `src/extension/services/messageHandler.ts`: Đăng ký tiếp nhận và chuyển tiếp các action và query mới tới `GitCliMutator` và `workspaceStatus`.

- [ ] **Nhiệm vụ 1.5 (TEST NHÓM 1): Bộ Unit Tests Độc Lập Cho Tầng Backend** ([#5](https://github.com/thatislg/f-gitgraph/issues/5))
  - [ ] **1.5.1**: Tạo `tests/extension/mutator/stagingMutator.test.ts`:
    - Kiểm thử cơ chế `canUseRestore()`: Bóc tách chính xác phiên bản Git từ các chuỗi chuẩn (`git version 2.43.0`, `git version 2.22.0`, `git version 3.0.0`, `git version 1.8.3`), lưu cache sau lần gọi đầu tiên.
    - Kiểm thử `stageFile` gọi đúng lệnh `["add", "--", path]`.
    - Kiểm thử `unstageFile`: Gọi `restore --staged` khi Git >= 2.23 và gọi `reset --` khi Git < 2.23.
    - Kiểm thử `unstageAll`: Gọi `restore --staged .` khi Git >= 2.23 và gọi `reset` khi Git < 2.23.
    - Kiểm thử `discardFileChanges`: Gọi `clean -f` khi untracked; Gọi `restore` khi tracked trên Git >= 2.23; Gọi `checkout --` khi tracked trên Git < 2.23.
    - Kiểm thử `discardAllChanges`: Gọi `restore .` (hoặc `checkout -- .`) rồi gọi `clean -fd`.
    - Kiểm thử `commit` ghép nối đúng 2 cờ `-m` khi có description, truyền cờ `--amend`, truyền cờ `-S`.
    - Kiểm thử bắt và bóc tách lỗi khóa tệp `.git/index.lock` trả về lỗi thân thiện.
  - [ ] **1.5.2**: Tạo `tests/backend/queries/workspaceStatus.test.ts`:
    - Kiểm thử bóc tách chuỗi giả lập porcelain v2 chứa đầy đủ các trường hợp: tệp sửa đổi, tệp thêm mới, tệp xóa, tệp đổi tên, tệp chưa theo dõi.
    - Kiểm thử trích xuất thông tin header nhánh, upstream, số ahead/behind.
    - Kiểm thử xử lý tên tệp tiếng Việt có dấu và khoảng trắng không bị lỗi octal.
    - Kiểm thử cờ `isClean` bằng true khi đầu ra không có tệp nào.
  - [ ] **1.5.3**: Tạo `tests/extension/services/stagingMessageHandler.test.ts`:
    - Kiểm thử đăng ký đầy đủ các action type mới trong MessageHandler.
    - Kiểm thử gọi đúng hàm tương ứng trong Mutator khi nhận thông điệp từ Webview.

---

### 📋 Nhóm Việc 2: Triển Khai Các Khối Giao Diện Cơ Bản (UI Building Blocks Kèm Test Độc Lập) — Outline: [#6](https://github.com/thatislg/f-gitgraph/issues/6)
*Tài liệu tham chiếu thiết kế*: [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md).

- [ ] **Nhiệm vụ 2.1: Xây dựng khung kỹ thuật đinh tán góc `src/webview/components/ui/CornerCrossFrame.tsx`**
  - [ ] **2.1.1**: Định vị chính xác 4 ký tự chữ thập (`+`) tại 4 góc của khung viền (top-left, top-right, bottom-left, bottom-right).
  - [ ] **2.1.2**: Quản lý trạng thái bừng sáng của đinh tán: Mặc định xám mờ (độ mờ 50%), khi khung được kích hoạt hoặc focus thì bừng sáng tím Neon (`#a855f7`) ở độ mờ 100%.
  - [ ] **2.1.3**: Thiết lập tương thích hoàn hảo giữa 2 chế độ Dark Mode và Light Mode theo bảng token Cyber-Lab.

- [ ] **Nhiệm vụ 2.2: Xây dựng Component hiển thị dòng tệp `src/webview/components/staging/StagingFileItem.tsx`**
  - [ ] **2.2.1**: Thiết kế huy hiệu trạng thái vuông Neon kích thước chuẩn $18\text{px} \times 18\text{px}$:
    - `A` (Xanh lục neon `#10b981`), `M` (Vàng cam neon `#f59e0b`), `D` (Đỏ neon `#ef4444`), `R` (Tím neon `#a855f7`), `U` (Xám bạc `#94a3b8`).
  - [ ] **2.2.2**: Bố cục tên tệp tin nổi bật ở phía trước và đường dẫn thư mục phụ hiển thị mờ ở phía sau.
  - [ ] **2.2.3**: Hiện thực cơ chế *Hover-to-Reveal Actions* chống rối mắt:
    - Toàn bộ cụm nút hành động bên phải mặc định có độ mờ bằng 0 (`opacity-0`).
    - Chỉ hiển thị ở độ mờ 100% khi con trỏ chuột rê lên dòng tương ứng (`hover:opacity-100`).
  - [ ] **2.2.4**: Tích hợp các nút hành động theo loại tệp:
    - Với tệp Staged: Nút Unstage (`-`) và nút Discard (`↺`).
    - Với tệp Unstaged: Nút Stage (`+`) và nút Discard (`🗑`).
  - [ ] **2.2.5**: Tích hợp hành động xem so sánh vi sai: Nhấp đúp chuột (hoặc nhấp chọn) vào dòng tệp để gửi thông điệp yêu cầu mở màn hình so sánh `vscode.diff`.

- [ ] **Nhiệm vụ 2.3: Xây dựng hộp thoại xác nhận an toàn `src/webview/components/staging/DiscardConfirmModal.tsx`**
  - [ ] **2.3.1**: Thiết kế giao diện Modal nổi ở chính giữa màn hình, đóng khung trong `CornerCrossFrame` với đinh tán góc phát sáng màu đỏ cam cảnh báo.
  - [ ] **2.3.2**: Hiển thị thông điệp cảnh báo rõ ràng rằng thao tác hoàn tác sẽ xóa vĩnh viễn dữ liệu chưa commit và không thể phục hồi qua `git reflog`.
  - [ ] **2.3.3**: Cung cấp nút Hủy Bỏ (`Cancel`) ưu tiên (nhận phím tắt `Esc`) và nút Xác Nhận Hoàn Tác (`Discard`) màu đỏ cảnh báo.

- [ ] **Nhiệm vụ 2.4 (TEST NHÓM 2): Bộ Unit Tests Độc Lập Cho Từng Component UI Cơ Bản**
  - [ ] **2.4.1**: Tạo `tests/webview/components/ui/CornerCrossFrame.test.tsx`:
    - Kiểm thử render đúng 4 ký tự `+` tại 4 vị trí tuyệt đối ở 4 góc.
    - Kiểm thử chuyển đổi class màu sắc tím neon khi truyền prop `active=true` so với `active=false`.
    - Kiểm thử hiển thị trọn vẹn phần tử con (`children`) bên trong khung.
  - [ ] **2.4.2**: Tạo `tests/webview/components/staging/StagingFileItem.test.tsx`:
    - Kiểm thử hiển thị đúng mã chữ và màu nền huy hiệu vuông cho từng trạng thái (`A`, `M`, `D`, `R`, `U`).
    - Kiểm thử các nút tác vụ có class ẩn mặc định (`opacity-0`) và có class hover hiển thị (`hover:opacity-100`).
    - Kiểm thử nhấp chuột vào nút Stage gọi đúng callback `onStage`.
    - Kiểm thử nhấp chuột vào nút Unstage gọi đúng callback `onUnstage`.
    - Kiểm thử nhấp chuột vào nút Discard gọi đúng callback `onDiscard`.
    - Kiểm thử nhấp chuột vào tên tệp gọi đúng callback `onDiff`.
  - [ ] **2.4.3**: Tạo `tests/webview/components/staging/DiscardConfirmModal.test.tsx`:
    - Kiểm thử hiển thị đúng tên tệp trong thông điệp cảnh báo.
    - Kiểm thử nhấn phím `Esc` kích hoạt gọi callback `onCancel`.
    - Kiểm thử click nút Cancel kích hoạt gọi `onCancel`.
    - Kiểm thử click nút Discard kích hoạt gọi `onConfirm`.

---

### 📋 Nhóm Việc 3: Triển Khai Phân Vùng Staging, Composer & Quản Lý Trạng Thái (Kèm Test Độc Lập) — Outline: [#6](https://github.com/thatislg/f-gitgraph/issues/6)
*Tài liệu tham chiếu thiết kế*: [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md) và [005_Audio_Feedback_And_Sound_Design.md](../../01_investigation/phase3_Reborn/005_Audio_Feedback_And_Sound_Design.md).

- [ ] **Nhiệm vụ 3.1: Xây dựng bảng hiển thị tệp `src/webview/components/staging/StagingPanel.tsx`**
  - [ ] **3.1.1**: Phân chia giao diện thành 2 phân khu danh sách có tiêu đề rõ ràng: Phân khu "Staged Changes" ở trên và Phân khu "Changes (Unstaged)" ở dưới.
  - [ ] **3.1.2**: Hiển thị số lượng tệp tự động cập nhật bên cạnh mỗi tiêu đề (ví dụ: `Staged Changes (3)`).
  - [ ] **3.1.3**: Thanh tác vụ hàng loạt trên tiêu đề: Nút "Unstage All" (`-`) ở nhóm Staged; Nút "Stage All" (`+`) và "Discard All" (`↺`) ở nhóm Changes.
  - [ ] **3.1.4**: Trạng thái danh sách rỗng (Empty State): Hiển thị dòng chữ thông báo trang nhã khi không có tệp nào bị biến động.

- [ ] **Nhiệm vụ 3.2: Xây dựng bộ soạn thảo commit `src/webview/components/staging/CommitComposer.tsx`**
  - [ ] **3.2.1**: Ô nhập tiêu đề commit (Subject Input): Chiều cao chuẩn 34px kèm placeholder hướng dẫn phím tắt `(Ctrl+Enter to commit)`.
  - [ ] **3.2.2**: Bộ đếm 50 ký tự thông minh ở góc phải:
    - Từ 1 đến 50 ký tự: Chữ màu xám bạc kỹ thuật (Đạt chuẩn Git convention).
    - Từ 51 đến 72 ký tự: Chữ màu vàng hổ phách (Cảnh báo tiêu đề bắt đầu dài).
    - Trên 72 ký tự: Chữ màu đỏ hồng neon (Cảnh báo tiêu đề quá dài).
  - [ ] **3.2.3**: Ô nhập mô tả mở rộng (Body Input): Khung textarea tự động co giãn chiều cao linh hoạt theo nội dung (tối thiểu 60px, tối đa 160px kèm thanh cuộn mỏng).
  - [ ] **3.2.4**: Tùy chọn Checkbox "Amend previous commit": Tự động điền thông điệp của commit HEAD lên form khi tích chọn; khôi phục nội dung nháp khi bỏ tích.
  - [ ] **3.2.5**: Tùy chọn Checkbox "Sign commit (GPG/SSH)": Bật/tắt cờ ký số an toàn.
  - [ ] **3.2.6**: Nút hành động chính `Commit`:
    - Hiển thị động số lượng tệp staged sẽ commit (ví dụ: `Commit 2 files` hoặc `Amend commit`).
    - Nền tím Neon nổi bật, tự động bị vô hiệu hóa (disabled) khi chưa có tệp staged hoặc tiêu đề để trống.
  - [ ] **3.2.7**: Nút hành động phụ `Commit & Push`: Thực hiện commit xong tự động gọi lệnh push lên nhánh remote tracking.
  - [ ] **3.2.8**: Lắng nghe phím tắt toàn cục: Nhấn `Ctrl + Enter` (hoặc `Cmd + Enter` trên macOS) để commit tức thì từ bất kỳ ô nhập liệu nào.
  - [ ] **3.2.9**: Tích hợp âm thanh phản hồi vi mô: Kích hoạt âm thanh chốt cơ khí (Micro-acoustics mechanical click) khi commit thành công qua Web Audio API.

- [ ] **Nhiệm vụ 3.3: Quản lý trạng thái bằng Preact Signals trong `src/webview/lib/stores/staging.store.ts`**
  - [ ] **3.3.1**: Khởi tạo các tín hiệu cơ sở: `stagedFiles`, `unstagedFiles`, `commitSubject`, `commitDescription`, `isAmend`, `isSign`, `isCommitting`.
  - [ ] **3.3.2**: Khởi tạo tín hiệu dẫn xuất `canCommit`: Tự động tính toán trạng thái nút Commit có thể nhấn được hay không dựa trên điều kiện tệp và tiêu đề.
  - [ ] **3.3.3**: Hiện thực các hàm điều phối hành động giao diện: `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFile`, `commit`.

- [ ] **Nhiệm vụ 3.4: Xây dựng Container tích hợp `src/webview/components/staging/StagingArea.tsx`**
  - [ ] **3.4.1**: Tích hợp `StagingPanel` và `CommitComposer` thành một khối thống nhất, bọc toàn bộ bên trong `CornerCrossFrame`.
  - [ ] **3.4.2**: Quản lý trạng thái mở/đóng của `DiscardConfirmModal` một cách tập trung.

- [ ] **Nhiệm vụ 3.5 (TEST NHÓM 3): Bộ Unit Tests Độc Lập Cho Store & Bộ Soạn Thảo**
  - [ ] **3.5.1**: Tạo `tests/webview/lib/stores/staging.store.test.ts`:
    - Kiểm thử tín hiệu dẫn xuất `canCommit`: Trả về false khi `stagedFiles` rỗng và `isAmend` là false; Trả về false khi `commitSubject` rỗng; Trả về true khi có ít nhất 1 tệp staged và có tiêu đề.
    - Kiểm thử `canCommit` trả về true khi danh sách staged rỗng NHƯNG đang bật `isAmend = true` kèm có tiêu đề.
    - Kiểm thử cập nhật danh sách tệp khi nhận dữ liệu trạng thái mới từ Backend.
  - [ ] **3.5.2**: Tạo `tests/webview/components/staging/CommitComposer.test.tsx`:
    - Kiểm thử bộ đếm ký tự: Nhập chuỗi 30 ký tự -> kiểm tra hiển thị `(30/50)` và class chữ xám; Nhập chuỗi 60 ký tự -> kiểm tra hiển thị `(60/50)` và class chữ vàng; Nhập chuỗi 80 ký tự -> kiểm tra class chữ đỏ.
    - Kiểm thử nút Commit bị disabled khi ô tiêu đề rỗng.
    - Kiểm thử nút Commit hiển thị đúng số lượng tệp staged (ví dụ: `Commit 3 files`).
    - Kiểm thử nhấn tổ hợp phím `Ctrl + Enter` kích hoạt gọi hàm commit.
  - [ ] **3.5.3**: Tạo `tests/webview/components/staging/StagingPanel.test.tsx`:
    - Kiểm thử render đúng số lượng dòng tệp ở từng phân khu.
    - Kiểm thử click nút "Stage All" gọi đúng hành động stage toàn bộ.
    - Kiểm thử click nút "Unstage All" gọi đúng hành động unstage toàn bộ.
    - Kiểm thử hiển thị thông báo Empty State khi danh sách không có tệp nào.

---

### 📋 Nhóm Việc 4: Tích Hợp Đồ Thị DAG & Bộ Giám Sát Thời Gian Thực (Kèm Test Tích Hợp) — Outline: [#7](https://github.com/thatislg/f-gitgraph/issues/7)
*Tài liệu tham chiếu thiết kế*: [03_WorkingTree_Sync_And_Watcher_Integration.md](../../02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md).

- [ ] **Nhiệm vụ 4.1: Đồng bộ dòng Uncommitted Changes trên đồ thị `src/webview/components/commit/CommitTable.tsx`**
  - [ ] **4.1.1**: Mở khóa sự kiện click trên dòng có mã định danh `UNCOMMITTED_CHANGES` (`*`).
  - [ ] **4.1.2**: Điều phối bảng Inspector nổi:
    - Nếu dòng được chọn là một commit lịch sử thông thường: Render `<CommitDetails />`.
    - Nếu dòng được chọn là dòng `UNCOMMITTED_CHANGES`: Render `<StagingArea />`.
  - [ ] **4.1.3**: Đảm bảo 100% không làm lệch tọa độ hay chiều cao dòng của bảng commit, bảo toàn bất biến tuyệt đối các đường cong Bézier và avatar clipPath của nhân F# Core.

- [ ] **Nhiệm vụ 4.2: Tích hợp thuật toán Debounce 150ms vào `src/extension/watchers/git-repo.watcher.ts`**
  - [ ] **4.2.1**: Thiết lập bộ đếm thời gian Debounce 150ms cho các sự kiện biến động từ hệ thống tệp.
  - [ ] **4.2.2**: Lọc bỏ toàn bộ các thư mục rác (`node_modules`, `bin`, `obj`, `dist`, `.git/objects`).
  - [ ] **4.2.3**: Khi hết thời gian chờ 150ms ổn định, kích hoạt truy vấn `workspaceStatus` và phát thông báo cập nhật sang Webview để làm mới danh sách tệp biến động trong thời gian thực.

- [ ] **Nhiệm vụ 4.3 (TEST NHÓM 4): Bộ Kiểm Thử Tích Hợp Đồ Thị & File Watcher**
  - [ ] **4.3.1**: Tạo `tests/extension/watchers/gitRepoWatcher.debounce.test.ts`:
    - Kiểm thử bắn 10 sự kiện tệp liên tiếp trong vòng 50ms: Đảm bảo timer debounce gom lại và hàm truy vấn `workspaceStatus` chỉ được gọi đúng 1 lần duy nhất sau 150ms.
    - Kiểm thử các sự kiện thuộc thư mục bị loại trừ (`node_modules/...`) bị bỏ qua hoàn toàn, không kích hoạt timer.
  - [ ] **4.3.2**: Tạo `tests/webview/components/commit/CommitTable.staging.test.tsx`:
    - Kiểm thử click vào dòng `UNCOMMITTED_CHANGES` (`*`): Kiểm tra phần tử container hiển thị component `<StagingArea />` thay vì `<CommitDetails />`.
    - Kiểm thử click vào dòng commit thông thường: Kiểm tra phần tử container hiển thị `<CommitDetails />`.
    - Kiểm thử chiều cao dòng của CommitTable không bị xô lệch khi mở và đóng `<StagingArea />`.

---

### 📋 Nhóm Việc 5: Kiểm Thử Nghiệm Thu Tổng Hợp Toàn Quy Trình & An Toàn Dữ Liệu
*Tài liệu tham chiếu thiết kế*: Mục 5 trong cả 3 bản thiết kế kỹ thuật.

- [ ] **Nhiệm vụ 5.1: Kiểm thử End-to-End toàn diện vòng lặp phát triển**
  - [ ] **5.1.1**: Thử nghiệm quy trình khép kín: Sửa tệp trên đĩa $\rightarrow$ File Watcher phát hiện $\rightarrow$ Click dòng Uncommitted Changes mở Staging $\rightarrow$ Bấm nút `+` để Stage $\rightarrow$ Nhập tiêu đề commit $\rightarrow$ Bấm `Ctrl + Enter` $\rightarrow$ Đồ thị DAG nạp commit mới trên đỉnh nhánh.
  - [ ] **5.1.2**: Thử nghiệm quy trình Commit & Push: Nhập tiêu đề commit $\rightarrow$ Bấm `Commit & Push` $\rightarrow$ Kiểm tra commit thành công và tiến trình push được kích hoạt lên remote tracking branch.

- [ ] **Nhiệm vụ 5.2: Kiểm thử tính bất biến hình học (Geometry Invariance)**
  - [ ] **5.2.1**: Đo đạc tọa độ tâm nút và chuỗi đường cong Bézier SVG của đồ thị commit trước và sau khi mở/đóng Staging Area.
  - [ ] **5.2.2**: Tiêu chuẩn nghiệm thu: Sai lệch tọa độ hình học bằng 0 pixel tuyệt đối, không có hiện tượng giật layout (zero layout shift).

- [ ] **Nhiệm vụ 5.3: Kiểm định an toàn dữ liệu tuyệt đối**
  - [ ] **5.3.1**: Thử nghiệm Discard tệp: Đảm bảo không bao giờ thực thi lệnh xóa nếu người dùng chưa bấm nút xác nhận trên Modal cảnh báo.
  - [ ] **5.3.2**: Thử nghiệm Amend commit: Đảm bảo không làm mất commit khi chưa có staged changes.
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
