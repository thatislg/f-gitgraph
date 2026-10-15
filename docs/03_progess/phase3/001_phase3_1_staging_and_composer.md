# Tiến Độ Chặng 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)

Tài liệu này ghi nhận tổng quan mục tiêu, danh mục tệp tin tác động, phân rã đầu việc chi tiết (Granular Task Breakdown), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 3.1: Xây dựng Khu vực Staging & Bộ soạn thảo Commit**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế và theo dõi tiến độ bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào phân định trách nhiệm kỹ thuật, kiểm soát rủi ro và các mốc kiểm thử nghiệm thu; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.

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
- **Tiến độ tổng thể**: 0% hoàn thành (Sẵn sàng triển khai mã nguồn).

### 1.2. Bảng Kiểm Kê Tệp Tin Tác Động (Impacted Files Inventory)

| Phân Loại | Đường Dẫn Tệp Tin | Trách Nhiệm Kỹ Thuật Chính |
| :--- | :--- | :--- |
| **Tạo mới (Backend)** | `src/backend/queries/workspaceStatus.ts` | Bóc tách `git status --porcelain=v2`, xuất cấu trúc `WorkspaceStatusResult`. |
| **Tạo mới (UI)** | `src/webview/components/ui/CornerCrossFrame.tsx` | Khung viền kỹ thuật mang 4 đinh tán chữ thập góc (`+`) với hiệu ứng bừng sáng focus. |
| **Tạo mới (UI)** | `src/webview/components/staging/StagingFileItem.tsx` | Dòng hiển thị tệp tin, badge vuông neon, tên tệp, đường dẫn mờ, hover-to-reveal actions. |
| **Tạo mới (UI)** | `src/webview/components/staging/DiscardConfirmModal.tsx` | Hộp thoại modal cảnh báo an toàn trước khi xóa vĩnh viễn tệp biến động. |
| **Tạo mới (UI)** | `src/webview/components/staging/StagingPanel.tsx` | Quản lý 2 phân nhóm Staged Changes và Changes (Unstaged), nút hành động hàng loạt. |
| **Tạo mới (UI)** | `src/webview/components/staging/CommitComposer.tsx` | Ô nhập tiêu đề, bộ đếm 50 chars, ô mô tả mở rộng, tùy chọn amend/sign, nút Commit & Push. |
| **Tạo mới (UI)** | `src/webview/components/staging/StagingArea.tsx` | Container bao bọc toàn bộ phân vùng Staging & Composer đặt trong `CornerCrossFrame`. |
| **Tạo mới (State)** | `src/webview/lib/stores/staging.store.ts` | Quản lý toàn bộ trạng thái phản ứng bằng Preact Signals. |
| **Tạo mới (Test)** | `tests/unit/mutator/stagingMutator.test.ts` | Bộ kiểm thử tự động cho toàn bộ phương thức ghi mới trong `GitCliMutator`. |
| **Tạo mới (Test)** | `tests/unit/queries/workspaceStatus.test.ts` | Bộ kiểm thử tự động bóc tách các trường hợp porcelain v2 (A, M, D, R, U, branch info). |
| **Chỉnh sửa (Core)** | `src/extension/mutator/gitCliMutator.ts` | Bổ sung: `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, nâng cấp `commit`. |
| **Chỉnh sửa (Types)** | `src/types/actions.ts` | Bổ sung các kiểu action payloads cho thao tác staging và commit. |
| **Chỉnh sửa (Types)** | `src/types/queries.ts` | Bổ sung kiểu query payload cho `workspaceStatus`. |
| **Chỉnh sửa (IPC)** | `src/extension/services/messageHandler.ts` | Đăng ký bộ xử lý action request và query request mới từ Webview. |
| **Chỉnh sửa (UI)** | `src/webview/components/commit/CommitTable.tsx` | Mở khóa click dòng `UNCOMMITTED_CHANGES` (`*`), hiển thị `<StagingArea />` trong Overlay Inspector. |
| **Chỉnh sửa (Watch)**| `src/extension/watchers/git-repo.watcher.ts` | Tích hợp thuật toán Debounce 150ms bắn thông báo cập nhật `workspaceStatus`. |

---

## 2. Phân Rã Đầu Việc Chi Tiết Từng Bước (Detailed Implementation Tasks)

### 📋 Nhóm Việc 1: Mở Rộng Backend GitCliMutator, Bộ Truy Vấn & RPC Protocol
*Tài liệu tham chiếu thiết kế*: [01_Staging_Backend_And_Mutator_Design.md](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md).

- [ ] **Nhiệm vụ 1.1: Hiện thực các lệnh Staging trong `src/extension/mutator/gitCliMutator.ts`**
  - [ ] **1.1.1**: Hiện thực hàm `stageFile(filePath: string)`: Gọi lệnh `git add -- <filePath>`, bảo đảm ký tự phân tách `--` luôn hiện diện để ngăn nhầm lẫn đường dẫn với nhánh.
  - [ ] **1.1.2**: Hiện thực hàm `unstageFile(filePath: string)`: Gọi lệnh `git restore --staged -- <filePath>`. Xử lý an toàn cho cả tệp đã track lẫn tệp untracked mới add.
  - [ ] **1.1.3**: Hiện thực hàm `stageAll()`: Gọi lệnh `git add -A` để đưa toàn bộ tệp mới, tệp sửa đổi và tệp xóa trên toàn bộ kho vào chỉ mục.
  - [ ] **1.1.4**: Hiện thực hàm `unstageAll()`: Gọi lệnh `git restore --staged .` để rút sạch Staging Index về lại working tree.
  - [ ] **1.1.5**: Hiện thực hàm `discardFileChanges(filePath: string, isUntracked: boolean)`: Phân định rõ 2 nhánh logic:
    - Nếu `isUntracked` là true: Gọi `git clean -f -- <filePath>` để xóa tệp mới khỏi đĩa.
    - Nếu `isUntracked` là false: Gọi `git restore -- <filePath>` để khôi phục nội dung tệp từ index/HEAD.
  - [ ] **1.1.6**: Hiện thực hàm `discardAllChanges()`: Thực thi tuần tự 2 bước: bước 1 gọi `git restore .`, nếu thành công tiếp tục bước 2 gọi `git clean -fd`. Bắt lỗi và dừng ngay nếu bước 1 thất bại.

- [ ] **Nhiệm vụ 1.2: Nâng cấp hàm `commit` trong `src/extension/mutator/gitCliMutator.ts`**
  - [ ] **1.2.1**: Mở rộng tham số nhận diện cờ sửa đổi commit gần nhất `--amend` mà không tạo commit mới.
  - [ ] **1.2.2**: Mở rộng tham số nhận diện cờ ký số bảo mật `-S` (GPG/SSH Commit Signing).
  - [ ] **1.2.3**: Phân tách rõ ràng giữa dòng tiêu đề (Summary) và khối mô tả mở rộng (Description): Truyền 2 cờ `-m` độc lập vào tiến trình `git.exe` để Git tự động chèn dòng trống ngăn cách chuẩn quy ước.
  - [ ] **1.2.4**: Bắt và chuẩn hóa các thông báo lỗi đặc thù: Xung đột khóa tệp `.git/index.lock`, lỗi thiếu danh tính tác giả (`user.name` / `user.email`).

- [ ] **Nhiệm vụ 1.3: Xây dựng bộ truy vấn trạng thái kho `src/backend/queries/workspaceStatus.ts`**
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

- [ ] **Nhiệm vụ 1.4: Định nghĩa kiểu dữ liệu & Đăng ký Message Handlers**
  - [ ] **1.4.1**: Cập nhật `src/types/actions.ts`: Khai báo các payload cho `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `discardAllChanges`, `commitChanges`.
  - [ ] **1.4.2**: Cập nhật `src/types/queries.ts`: Khai báo query payload cho `workspaceStatus` với cấu trúc `WorkspaceStatusResult`.
  - [ ] **1.4.3**: Cập nhật `src/extension/services/messageHandler.ts`: Đăng ký tiếp nhận và chuyển tiếp các action và query mới tới `GitCliMutator` và `workspaceStatus`.

---

### 📋 Nhóm Việc 2: Triển Khai Các Khối Giao Diện Cơ Bản (UI Building Blocks)
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

---

### 📋 Nhóm Việc 3: Triển Khai Phân Vùng Staging, Composer & Quản Lý Trạng Thái
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

---

### 📋 Nhóm Việc 4: Tích Hợp Đồ Thị DAG & Bộ Giám Sát Thời Gian Thực (File Watcher)
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

---

### 📋 Nhóm Việc 5: Kiểm Thử Nghiệm Thu & Đảm Bảo An Toàn Dữ Liệu
*Tài liệu tham chiếu thiết kế*: Mục 5 trong cả 3 bản thiết kế kỹ thuật.

- [ ] **Nhiệm vụ 5.1: Xây dựng bộ Unit Tests tự động với Vitest**
  - [ ] **5.1.1**: Tạo `tests/unit/mutator/stagingMutator.test.ts`: Kiểm thử độc lập toàn bộ các hàm mới của `GitCliMutator` (`stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `commit` amend/sign).
  - [ ] **5.1.2**: Tạo `tests/unit/queries/workspaceStatus.test.ts`: Kiểm thử phân tích cú pháp chuỗi porcelain v2 với đầy đủ các kịch bản tệp sửa đổi, tệp thêm mới, tệp xóa, tệp đổi tên, tệp chưa theo dõi và tên tệp tiếng Việt có dấu.

- [ ] **Nhiệm vụ 5.2: Kiểm thử thủ công UI & An toàn dữ liệu**
  - [ ] **5.2.1**: Kiểm thử tính bất biến hình học: Đóng mở Staging Area nhiều lần, đo đạc đảm bảo sai lệch tọa độ các nút lục giác và đường cong Bézier bằng 0 pixel.
  - [ ] **5.2.2**: Kiểm thử độ an toàn của thao tác Discard: Đảm bảo hộp thoại cảnh báo luôn xuất hiện và phím `Esc` hủy bỏ thành công.
  - [ ] **5.2.3**: Kiểm thử tổ hợp phím tắt `Ctrl + Enter` mượt mà, phản hồi ngay lập tức dưới 200ms.
  - [ ] **5.2.4**: Kiểm thử giao diện trên cả 2 chủ đề Dark Mode và Light Mode.

---

## 3. Lộ Trình Triển Khai Tuần Tự Từng Bước (Implementation Roadmap)

Quá trình lập trình được tiến hành theo thứ tự 5 bước khép kín, bảo đảm mỗi bước đều có thể kiểm chứng độc lập trước khi sang bước tiếp theo:

```
[Bước 1: Nền Tảng Backend] 
 ├─ Mở rộng GitCliMutator.ts
 ├─ Xây dựng workspaceStatus.ts (porcelain v2)
 ├─ Định nghĩa Action & Query Types
 └─ Đăng ký messageHandler.ts & Viết Unit Tests
       │
       ▼
[Bước 2: Các Khối Giao Diện Cơ Bản]
 ├─ Xây dựng CornerCrossFrame.tsx (+)
 ├─ Xây dựng StagingFileItem.tsx (Neon badges + hover actions)
 └─ Xây dựng DiscardConfirmModal.tsx (Hộp thoại an toàn)
       │
       ▼
[Bước 3: Phân Vùng Staging & Soạn Thảo Commit]
 ├─ Xây dựng StagingPanel.tsx (Staged vs Changes)
 ├─ Xây dựng CommitComposer.tsx (Bộ đếm 50 chars, Amend, Sign, Ctrl+Enter)
 ├─ Tạo staging.store.ts (Preact Signals)
 └─ Tích hợp StagingArea.tsx
       │
       ▼
[Bước 4: Ghép Nối Đồ Thị & File Watcher Thời Gian Thực]
 ├─ Mở khóa click UNCOMMITTED_CHANGES trong CommitTable.tsx
 ├─ Tích hợp hiển thị StagingArea trong Overlay Inspector
 └─ Cài đặt Debounce 150ms trong git-repo.watcher.ts
       │
       ▼
[Bước 5: Nghiệm Thu Hoàn Thành Toàn Diện]
 ├─ Chạy toàn bộ test suite tự động
 ├─ Kiểm tra an toàn dữ liệu và phím tắt
 └─ Đo đạc bất biến hình học đồ thị DAG (0 pixel sai lệch)
```

---

## 4. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. **Khép kín vòng lặp dev**: Lập trình viên có thể xem thay đổi $\rightarrow$ bấm Stage $\rightarrow$ gõ commit $\rightarrow$ bấm Commit hoặc `Ctrl+Enter` ngay trên F-GitGraph mà không cần mở bất kỳ tab hay terminal nào khác.
2. **Đồng bộ trạng thái 100%**: Danh sách Staged và Unstaged khớp hoàn hảo với kết quả của lệnh `git status`.
3. **An toàn dữ liệu tuyệt đối**: Không bao giờ thực thi Discard nếu người dùng chưa xác nhận qua hộp thoại cảnh báo.
4. **Bảo toàn hình học đồ thị**: Đóng mở Staging Area không làm dịch chuyển hay biến dạng bất kỳ đường cong SVG nào của đồ thị commit.
5. **Chất lượng mã nguồn**: Toàn bộ unit tests đạt trạng thái pass 100%, không có lỗi typecheck TypeScript hay lint warning nào.

---

## 5. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-15**: Khởi tạo tài liệu tiến độ Chặng 3.1.
- **2026-10-15**: Chi tiết hóa toàn diện tài liệu tiến độ Chặng 3.1: Bổ sung bảng kiểm kê 16 tệp tin tác động, phân rã 28 nhiệm vụ kỹ thuật con từng bước, gắn liên kết trực tiếp tới toàn bộ 5 tài liệu thiết kế, thiết lập lộ trình thực thi 5 giai đoạn tuần tự và tiêu chuẩn nghiệm thu DoD.
