# Bảng Kiểm Kê & Nghiệm Thu Tính Năng Phase 3 Reborn (Master Feature Checklist)

Tài liệu này là **Bảng Điều Khiển Trung Tâm (Single Source of Truth)** liệt kê toàn bộ các tính năng người dùng cuối (User-Facing Features) của Phase 3 Reborn. 

> [!TIP]
> **Quy ước sử dụng**:
> - Bảng này hoàn toàn độc lập với các checklist đầu việc kỹ thuật (tasks) nằm trong từng file tiến độ `001_phase3_1_...`.
> - Khi một tính năng được hoàn thành và nghiệm thu hoạt động trơn tru trên giao diện, đánh dấu `[x]` kèm ngày hoàn thành.
> - Bảng giúp lập trình viên và người dùng có cái nhìn bao quát 100% về độ sẵn sàng phát hành của sản phẩm mà không cần mở từng tệp chi tiết.
> - **Tài liệu thiết kế tham chiếu**: Xem toàn bộ bản thiết kế kỹ thuật tại [docs/02_design/phase3/](../../02_design/phase3/README.md) và thiết kế giao diện tại [004_Design_System_And_Visual_Identity.md](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md).

---

## 📊 Tổng Hợp Tỉ Lệ Hoàn Thành Tính Năng

- **Tổng số tính năng quy hoạch**: 60 tính năng
- **Đã hoàn thành**: 0 / 60 (0%)
- **Đang triển khai**: Chặng 3.1 (Staging & Commit Composer)

---

## 1. Module Staging Area & Working Tree (Milestone 3.1)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 1.1 | [ ] | **Danh mục Staged Changes** | Hiển thị danh sách các tệp đã đưa vào index kèm số lượng đếm `Staged Changes (N)`. | |
| 1.2 | [ ] | **Danh mục Changes (Unstaged)** | Hiển thị danh sách các tệp sửa đổi trên working tree chưa đưa vào index. | |
| 1.3 | [ ] | **Danh mục Untracked Files** | Nhận diện và liệt kê các tệp mới tạo chưa được Git theo dõi. | |
| 1.4 | [ ] | **Badge trạng thái màu Neon** | Hiển thị badge vuông sắc nét: `A` (Xanh lục), `M` (Vàng), `D` (Đỏ), `R` (Tím). | |
| 1.5 | [ ] | **Nút Stage Tệp (`+`)** | Icon `+` xuất hiện khi hover lên tệp unstaged; click để chuyển tệp lên Staged. | |
| 1.6 | [ ] | **Nút Unstage Tệp (`-`)** | Icon `-` xuất hiện khi hover lên tệp staged; click để rút tệp về Changes. | |
| 1.7 | [ ] | **Nút Stage All (`+`)** | Đưa toàn bộ các tệp thay đổi vào index với một cú nhấp chuột (`git add -A`). | |
| 1.8 | [ ] | **Nút Unstage All (`-`)** | Rút toàn bộ tệp staged về working tree (`git restore --staged .`). | |
| 1.9 | [ ] | **Nút Discard Changes (Hoàn tác)** | Hoàn tác tệp về trạng thái commit gần nhất; luôn bật hộp thoại xác nhận bảo vệ mã nguồn. | |
| 1.10| [ ] | **Nút Discard All Changes** | Hoàn tác toàn bộ tệp unstaged kèm cảnh báo nguy hiểm cấp cao. | |
| 1.11| [ ] | **Click Tệp Xem Diff Vi Sai** | Nhấp chuột vào bất kỳ tệp nào trong Staging để mở trực tiếp màn hình `vscode.diff`. | |
| 1.12| [ ] | **Tự động làm mới theo File Watcher**| Danh sách Staged/Unstaged tự động cập nhật khi người dùng sửa hoặc lưu file trong IDE. | |

---

## 2. Module Commit Composer (Bộ Soạn Thảo Commit) (Milestone 3.1)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 2.1 | [ ] | **Khung nhập Tiêu đề (Subject)** | Ô input nhập dòng tiêu đề commit với placeholder trực quan. | |
| 2.2 | [ ] | **Bộ đếm ký tự 50 chars thông minh**| Hiển thị góc phải: Trắng ($\le 50$), Vàng ($51 - 72$), Đỏ ($> 72$ chars). | |
| 2.3 | [ ] | **Khung nhập Mô tả mở rộng (Body)**| Textarea nhập nội dung chi tiết nhiều dòng, tự động co dãn chiều cao. | |
| 2.4 | [ ] | **Checkbox "Amend previous commit"**| Tích chọn để tự nạp commit message cũ lên và sửa đổi commit `HEAD`. | |
| 2.5 | [ ] | **Checkbox "Sign commit (GPG)"** | Bật/tắt cờ ký số mật mã `-S` cho commit. | |
| 2.6 | [ ] | **Nút bấm chính "Commit"** | Hiển thị số lượng tệp sẽ commit (vd: `Commit 3 files`); tự vô hiệu khi chưa có staged. | |
| 2.7 | [ ] | **Nút phụ "Commit & Push"** | Tự động commit và đẩy thẳng lên remote tracking branch sau khi commit thành công. | |
| 2.8 | [ ] | **Phím tắt `Ctrl + Enter`** | Nhấn `Ctrl + Enter` (hoặc `Cmd + Enter`) từ bất kỳ ô nhập liệu nào để commit tức thì. | |

---

## 3. Module Left Sidebar Navigator (Cây Điều Hướng) (Milestone 3.2)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 3.1 | [ ] | **Khung viền Sidebar co giãn** | Thanh điều hướng bên trái có thể kéo dãn kích thước hoặc thu gọn (collapse). | |
| 3.2 | [ ] | **Mục Working Tree Status** | Hiển thị số lượng tệp đang sửa đổi (`Changes: N`); click mở ngay Staging Area. | |
| 3.3 | [ ] | **Cây Nhánh Cục Bộ (Local Branches)**| Liệt kê đầy đủ các nhánh local; đánh dấu nổi bật nhánh đang checkout (`HEAD`). | |
| 3.4 | [ ] | **Huy hiệu Đồng bộ trên Nhánh** | Hiển thị số đếm `↑ahead` / `↓behind` ngay cạnh tên nhánh cục bộ. | |
| 3.5 | [ ] | **Cây Nhánh Từ Xa (Remotes)** | Cây phân cấp theo từng remote (`origin`, `upstream`) và các nhánh remote tương ứng. | |
| 3.6 | [ ] | **Danh sách Tags** | Danh mục toàn bộ các release tag trong kho. | |
| 3.7 | [ ] | **Danh sách Stashes** | Danh mục các bản lưu trữ tạm thời trong ngăn xếp. | |
| 3.8 | [ ] | **Double-click Checkout Nhánh** | Bấm đúp chuột vào bất kỳ nhánh nào để chuyển nhánh tức thì. | |
| 3.9 | [ ] | **Menu ngữ cảnh đầy đủ trên Sidebar**| Chuột phải trên nhánh/tag mở menu thao tác (Merge, Rebase, Rename, Delete, Push). | |

---

## 4. Module Top Global Toolbar & Đồng Bộ Từ Xa (Milestone 3.2)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 4.1 | [ ] | **Thanh Toolbar đinh tán góc** | Đóng khung kỹ thuật số với 4 đinh tán `+` ở 4 góc, tối giản và thanh lịch. | |
| 4.2 | [ ] | **Nút Fetch All** | Tải toàn bộ cập nhật mới nhất từ mọi remote server (`git fetch --all --prune`). | |
| 4.3 | [ ] | **Nút Pull với số đếm `↓behind`** | Hiển thị nhãn cảnh báo (vd: `Pull ↓ 2`); kèm dropdown chọn `Pull --rebase`. | |
| 4.4 | [ ] | **Nút Push với số đếm `↑ahead`** | Hiển thị số commit cần đẩy (vd: `Push ↑ 1`); kèm dropdown chọn `Push with Lease`. | |
| 4.5 | [ ] | **Nút Quick Stash & Quick Pop** | Lưu nhanh thay đổi tạm hoặc bung nhanh bản stash gần nhất. | |
| 4.6 | [ ] | **Nút Refresh Thủ Công** | Kích hoạt quét lại toàn bộ kho và nạp lại đồ thị tức thì. | |

---

## 5. Module Search & Filter Bar (Tìm Kiếm Lịch Sử) (Milestone 3.2)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 5.1 | [ ] | **Phím tắt kích hoạt `Ctrl + F`** | Nhấn `Ctrl + F` để mở ngay thanh tìm kiếm trên Toolbar. | |
| 5.2 | [ ] | **Tìm theo Thông điệp Commit** | Lọc và highlight tức thì các commit có tiêu đề hoặc body khớp từ khóa. | |
| 5.3 | [ ] | **Tìm theo Tên / Email Tác giả** | Hỗ trợ lọc theo cú pháp `author:Tên`. | |
| 5.4 | [ ] | **Tìm theo Commit Hash** | Nhập mã băm commit rút gọn hoặc đầy đủ để tìm chính xác node. | |
| 5.5 | [ ] | **Điều hướng kết quả tìm kiếm** | Nút `Next (↓)` / `Prev (↑)` kèm bộ đếm `(3 of 15)`; tự động cuộn mượt đến dòng commit. | |

---

## 6. Module Stash Inspector (Quản Lý Lưu Trữ Tạm) (Milestone 3.3)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 6.1 | [ ] | **Giao diện Danh sách Stash** | Xem danh sách stash với thông điệp, nhánh nguồn và thời gian tạo rõ ràng. | |
| 6.2 | [ ] | **Xem trước nội dung Stash (Preview)**| Click vào stash để xem danh sách tệp thay đổi và diff mà không cần pop ra working tree. | |
| 6.3 | [ ] | **Hộp thoại Stash Changes** | Tạo bản stash mới kèm ô nhập thông điệp và tùy chọn include untracked files. | |
| 6.4 | [ ] | **Nút Apply Stash** | Áp dụng thay đổi vào working tree nhưng vẫn giữ nguyên bản stash. | |
| 6.5 | [ ] | **Nút Pop Stash** | Áp dụng thay đổi và tự động xóa bản stash khỏi ngăn xếp. | |
| 6.6 | [ ] | **Nút Drop Stash** | Xóa bản stash vĩnh viễn (kèm hộp thoại xác nhận cảnh báo). | |
| 6.7 | [ ] | **Nút Stash to New Branch** | Tạo nhánh mới trực tiếp từ bản stash và bung code vào nhánh đó. | |

---

## 7. Module Multi-Commit Diff Comparison (So Sánh Đa Commit) (Milestone 3.3)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 7.1 | [ ] | **Chọn 2 Commit bằng `Ctrl` / `Shift`**| Giữ phím `Ctrl` hoặc `Shift` click chọn 2 commit bất kỳ trên đồ thị DAG. | |
| 7.2 | [ ] | **Viền sáng chọn kép (Dual Neon Halo)**| Tô viền sáng xanh neon nổi bật bao quanh cả 2 commit đang được chọn so sánh. | |
| 7.3 | [ ] | **Bảng Compare Commits Drawer** | Hiển thị tiêu đề so sánh `HashA ↔ HashB` kèm số lượng tệp chênh lệch. | |
| 7.4 | [ ] | **Cây tệp vi sai đa commit** | Liệt kê toàn bộ các tệp thay đổi giữa 2 snapshot; click để mở `vscode.diff`. | |

---

## 8. Module Partial Hunk Staging (Stage Từng Khối Mã) (Milestone 3.3)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 8.1 | [ ] | **Phân tách Hunk trong Diff View**| Phân tích unified diff thành các khối mã độc lập (Hunks). | |
| 8.2 | [ ] | **Nút "Stage Hunk"** | Bấm nút trên từng khối mã để chỉ đưa khối code đó vào Staging Index. | |
| 8.3 | [ ] | **Nút "Discard Hunk"** | Bấm nút để hủy bỏ riêng khối mã đó trên working tree mà không ảnh hưởng code khác. | |

---

## 9. Module Visual Interactive Rebase Editor (Milestone 3.4)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 9.1 | [ ] | **Bảng Modal Interactive Rebase** | Mở bảng điều khiển trực quan khi chọn *"Rebase children interactively..."*. | |
| 9.2 | [ ] | **Kéo thả đổi thứ tự Commit** | Kéo thả chuột trực tiếp các dòng commit để thay đổi trình tự áp dụng lịch sử. | |
| 9.3 | [ ] | **Nút chuyển trạng thái `Pick`** | Giữ nguyên commit (Màu xanh lục). | |
| 9.4 | [ ] | **Nút chuyển trạng thái `Reword`** | Sửa đổi commit message trực tiếp trên ô nhập liệu tại chỗ. | |
| 9.5 | [ ] | **Nút chuyển trạng thái `Squash`** | Gom commit vào commit liền trước kèm nối thông điệp (Màu cam). | |
| 9.6 | [ ] | **Nút chuyển trạng thái `Fixup`** | Gom commit vào commit liền trước và bỏ qua thông điệp cũ. | |
| 9.7 | [ ] | **Nút chuyển trạng thái `Drop`** | Xóa bỏ hoàn toàn commit khỏi lịch sử (Màu đỏ neon). | |
| 9.8 | [ ] | **Thực thi Rebase an toàn** | Tự động sinh `git-rebase-todo` và kích hoạt `git rebase -i` qua Native Git CLI. | |

---

## 10. Module In-Flight Conflict Resolver (Giải Quyết Xung Đột) (Milestone 3.4)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 10.1| [ ] | **Banner Cảnh Báo In-Flight State**| Tự động hiện banner rực rỡ khi phát hiện repo đang rebase-merge hoặc merge-conflict. | |
| 10.2| [ ] | **Nút điều khiển luồng: Continue** | Tiếp tục chu trình rebase/merge sau khi xung đột đã được giải quyết xong. | |
| 10.3| [ ] | **Nút điều khiển luồng: Abort** | Hủy bỏ hoàn toàn thao tác, hoàn tác repo về trạng thái sạch sẽ trước khi xung đột. | |
| 10.4| [ ] | **Giao diện 3 Cột Conflict Resolver**| Cột Trái (`Current/Ours`) $\leftrightarrow$ Cột Giữa (`Result`) $\leftrightarrow$ Cột Phải (`Incoming/Theirs`). | |
| 10.5| [ ] | **Nút giải quyết nhanh: Accept** | Nút bấm "Accept Current", "Accept Incoming", "Accept Both" cho từng đoạn xung đột. | |
| 10.6| [ ] | **Tự động Stage sau khi Resolve** | Khi lưu tệp đã resolve hết conflict markers, tự động gọi `git add` đánh dấu hoàn tất. | |

---

## 11. Module Drag & Drop Git Interactions (Kéo & Thả) (Milestone 3.4)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 11.1| [ ] | **Kéo Branch thả vào Branch** | Hiện Action Popup lựa chọn: *"Merge {Branch A} into {Branch B}"* hoặc *Rebase*. | |
| 11.2| [ ] | **Kéo Commit thả vào Branch** | Hiện Action Popup: *"Cherry-pick commit {hash} onto {branch}"*. | |
| 11.3| [ ] | **Hiệu ứng vầng sáng Drop Target**| Vầng sáng neon xuất hiện tại vị trí con trỏ khi rê một item lên vùng có thể thả chuột. | |

---

## 12. Module Phản Hồi Âm Thanh (Audio Feedback & Sound FX) (Sau Khởi Động)

| STT | Trạng Thái | Tính Năng Người Dùng (Feature) | Mô Tả & Tiêu Chí Nghiệm Thu | Ngày Hoàn Thành |
| :---: | :---: | :--- | :--- | :---: |
| 12.1| [ ] | **Cài đặt Bật/Tắt & Âm Lượng** | Setting `f-gitgraph.soundEffects.enabled` và slider `soundEffects.volume`. | |
| 12.2| [ ] | **Âm thanh Commit Thành Công** | Tiếng chốt cơ khí êm ái ($\sim 80\text{ms}$) khi gõ commit hoặc bấm `Ctrl+Enter`. | |
| 12.3| [ ] | **Âm thanh Push Thành Công** | Âm thăng hoa thanh thoát ($\sim 180\text{ms}$) khi code đã lên server an toàn. | |
| 12.4| [ ] | **Âm thanh Cảnh Báo Xung Đột** | Xung trầm ấm nhắc nhở nhẹ nhàng ($\sim 250\text{ms}$), không gây giật mình. | |
| 12.5| [ ] | **Âm thanh Chuyển Nhánh / Stash** | Tiếng lẫy công tắc cơ khí siêu ngắn khi checkout hoặc cất stash. | |
| 12.6| [ ] | **Zero-Asset Web Audio Engine** | Tổng hợp âm thanh toán học thuần túy qua Web Audio API, $0\text{KB}$ file nhị phân ngoài. | |
