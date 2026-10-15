# 06. Thiết Kế Ghép Nối Giao Diện Webview & Thực Thi Lệnh Ghi An Toàn (Webview Integration & Git Mutator)

Tài liệu này đặc tả chi tiết kiến trúc ghép nối dữ liệu hình học từ engine F# vào tầng giao diện Webview Preact (kế thừa trọn vẹn kết quả từ Phase 1), cơ chế ủy thác toàn bộ các thao tác ghi dữ liệu cho tiến trình Git gốc (`git.exe`) để bảo đảm an toàn dữ liệu 100%, và cơ chế cập nhật vi sai khi kho mã nguồn biến động.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào kiến trúc tích hợp giao diện, phân định ranh giới an toàn và luồng điều phối, không sử dụng mã nguồn mẫu.

---

## 1. Ghép Nối Dữ Liệu Hình Học Vào Tầng Giao Diện Webview (Phase 1 Integration)

Kiến trúc mới biến tầng Webview Preact thành một bộ hiển thị thuần túy (Dumb Renderer), giải phóng trình duyệt khỏi mọi gánh nặng tính toán đồ thị nặng nề:

### 1.1. Luồng Nhận Dữ Liệu Hình Học & Phân Phối Component

1. **Tiếp nhận gói dữ liệu từ Extension Host**:
   - Khi Webview nhận được gói tin dữ liệu chứa các dòng commit thuộc khung nhìn hiển thị từ engine F#, module quản lý trạng thái giao diện sẽ giải nén mảng dữ liệu hình học phẳng và phân phối trực tiếp cho các component giao diện đã xây dựng trong Phase 1.
2. **Hiển thị cột đồ thị commit ([CommitGraph.tsx](file:///d:/Kojin/f-gitgraph/src/webview/components/commit/CommitGraph.tsx))**:
   - Component vẽ trực tiếp các đường nhánh SVG dựa trên chuỗi lệnh vẽ Bezier có sẵn từ F# mà không cần chạy lại hàm `computeGraphLayout`.
   - Mỗi commit được render bằng component nút lục giác chuyên biệt.
3. **Hiển thị nút lục giác & Avatar tác giả ([HexagonNode.tsx](file:///d:/Kojin/f-gitgraph/src/webview/components/commit/HexagonNode.tsx))**:
   - Vẽ khung viền lục giác chuẩn xác bằng tọa độ tâm `(x, y)` và bán kính `R=10px`.
   - Cắt ảnh avatar đại diện tác giả khít hoàn hảo vào lòng lục giác thông qua định nghĩa SVG `clipPath`, loại bỏ hoàn toàn các khoảng đen ở góc.
   - Bảo toàn hiệu ứng phóng to vi mô (Micro Hover Zoom 1.15x) đạt chiều cao vừa vặn 23px bên trong dòng 24px khi người dùng rê chuột.

### 1.2. Bảo Toàn Toàn Bộ Các Tính Năng Giao Diện Phase 1

Toàn bộ phong cách thiết kế thẩm mỹ cao cấp đã được nghiệm thu trong Phase 1 được bảo tồn nguyên vẹn 100%:

- **Vầng sáng Neon Ambient Gradient**:
  - Xuất hiện dải sáng gradient mềm mại theo màu sắc của nhánh, kéo dài từ mép phải avatar tới hết cột graph khi một dòng commit được chọn hoặc khi rê chuột qua dòng đó.
- **Khung viền tím Flameshot bao quanh dòng được chọn**:
  - Dòng commit đang được chọn xem chi tiết được bọc bởi khung viền tím phát sáng đặc trưng, làm nổi bật trạng thái tiêu điểm.
- **Tương tác Phóng to Avatar Chi Tiết (Click Deep Zoom 5.0x)**:
  - Khi người dùng nhấp chuột vào icon avatar, avatar lập tức phóng to 5 lần lên lớp hiển thị trên cùng (Top Layer), đi kèm ảnh tác giả độ nét cao và nhãn tên tác giả được căn chỉnh hài hòa.
- **Panel hiển thị thông điệp Commit đầy đủ ([CommitHoverPanel.tsx](file:///d:/Kojin/f-gitgraph/src/webview/components/commit/CommitHoverPanel.tsx))**:
  - Panel nổi hiển thị trọn vẹn cả tiêu đề và nội dung chi tiết commit với màu nền chìm đồng bộ giao diện hệ thống.
  - Tuân thủ nghiêm ngặt các quy tắc tương tác: chỉ kích hoạt khi chuột nằm từ cột mô tả trở sang mép phải, không hiện trong phạm vi cột graph, và tự động bị khóa hoàn toàn khi đang có một commit mở xem chi tiết để tránh chèn đè nội dung.

---

## 2. Thiết Kế Module Thực Thi Lệnh Ghi An Toàn Qua Git Gốc (`GitCliMutator.ts`)

> [!IMPORTANT]
> **Ranh giới an toàn tối cao**:
>
> - **F# Core Engine chỉ đảm nhiệm ĐỌC & TÍNH TOÁN (Read Pipeline)**: Nạp commit, phân tích đồ thị, sinh tọa độ hình học. Tuyệt đối không can thiệp ghi đè hay sửa đổi cơ sở dữ liệu Git.
> - **Git CLI gốc (`git.exe`) đảm nhiệm THAY ĐỔI DỮ LIỆU (Write Pipeline)**: Ủy thác 100% các thao tác thay đổi trạng thái kho mã nguồn cho tiến trình Git chính thống của hệ điều hành.

### 2.1. Lý Do Kỹ Thuật Bắt Buộc Giữ Nguyên Git Gốc

1. **Bảo toàn cơ chế ký số commit (GPG / SSH Commit Signing)**:
   - Các lập trình viên chuyên nghiệp và doanh nghiệp luôn cấu hình ký số commit tự động thông qua khóa phần cứng YubiKey, 1Password Agent hoặc GPG Daemon.
   - Chỉ có chính tiến trình `git.exe` gốc mới có đầy đủ quyền hạn và cơ chế giao tiếp nội bộ với các tiến trình ký số bảo mật của hệ điều hành. Mọi nỗ lực tự viết lại lệnh commit bằng mã tự chế đều làm hỏng hoặc bỏ qua chữ ký số.
2. **Bảo toàn cơ chế xác thực tài khoản & 2FA (Git Credential Manager)**:
   - Khi đẩy code (`push`) hoặc kéo code (`pull`), Git cần tương tác với Git Credential Manager trên Windows để giải quyết mã xác thực hai lớp (2FA), mã token cá nhân hoặc chính sách đăng nhập đơn (SSO) của công ty.
3. **Tuân thủ hệ thống Git Hooks của dự án (`pre-commit`, `commit-msg`)**:
   - Các dự án thường cài đặt các công cụ quét bảo mật, linter tự động trong hook. Gọi `git.exe` bảo đảm toàn bộ các hook này được kích hoạt đúng quy định của dự án.
4. **Hỗ trợ tệp tin lớn (Git LFS) & Giải quyết xung đột 3 bên (3-Way Merge)**:
   - Git CLI tích hợp sẵn các bộ lọc filter driver cho Git LFS và các thuật toán giải quyết xung đột sáp nhập đã được kiểm chứng qua hàng chục năm.

### 2.2. Danh Mục Các Lệnh Ghi Được Định Tuyến Qua Git CLI

| Thao Tác Nghiệp Vụ          | Lệnh Git CLI Tương Ứng Được Gọi        | Tham Số & Biện Pháp Kiểm Soát An Toàn                                                          |
| :-------------------------- | :------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **Tạo Commit Mới**          | `git commit -m "..."`                  | Hỗ trợ tùy chọn ký số tự động (`-S`), kích hoạt đầy đủ các hook `pre-commit` và `commit-msg`.  |
| **Tạo Nhánh Mới**           | `git branch <tên_nhánh> <commit_hash>` | Kiểm tra tính hợp lệ của tên nhánh qua `git check-ref-format` trước khi gọi.                   |
| **Xóa Nhánh An Toàn**       | `git branch -d <tên_nhánh>`            | Chỉ cho phép xóa khi nhánh đã được merge đầy đủ vào upstream, ngăn ngừa mất mát mã nguồn.      |
| **Ép Xóa Nhánh**            | `git branch -D <tên_nhánh>`            | Yêu cầu người dùng xác nhận rõ ràng trên giao diện trước khi thực thi xóa cưỡng bức.           |
| **Chuyển Nhánh (Checkout)** | `git checkout <tên_nhánh>`             | Kiểm tra trước các thay đổi chưa lưu để cảnh báo người dùng tránh bị ghi đè dữ liệu.           |
| **Sáp Nhập Nhánh (Merge)**  | `git merge <nhánh_nguồn>`              | Tiếp nhận kết quả merge, nếu có conflict thì chuyển giao diện sang chế độ giải quyết conflict. |
| **Tái Cơ Cấu (Rebase)**     | `git rebase <nhánh_đích>`              | Hỗ trợ đầy đủ các lệnh tiếp tục (`--continue`), bỏ qua (`--skip`) hoặc hủy bỏ (`--abort`).     |
| **Chọn Lọc Commit**         | `git cherry-pick <commit_hash>`        | Sao chép commit được chỉ định vào nhánh hiện tại kèm kiểm tra xung đột.                        |
| **Gắn Thẻ Phiên Bản**       | `git tag -a <tên_tag> -m "..."`        | Hỗ trợ tạo Annotated Tag kèm thông điệp phát hành và chữ ký số.                                |
| **Đẩy Code Lên Máy Chủ**    | `git push <remote> <nhánh>`            | Kết nối với Git Credential Manager để xử lý xác thực bảo mật và quyền đẩy nhánh.               |
| **Kéo Dữ Liệu Mới**         | `git pull --rebase` hoặc `git fetch`   | Cập nhật các tham chiếu mới nhất từ máy chủ từ xa về máy cục bộ.                               |

---

## 3. Cơ Chế Phát Hiện Biến Động & Cập Nhật Vi Sai (Incremental Update)

Để đảm bảo đồ thị luôn phản ánh trạng thái mới nhất của kho mã nguồn ngay khi có thay đổi mà không phải quét lại toàn bộ lịch sử từ đầu:

### 3.1. Giám Sát Hệ Thống Tệp Thông Minh (Git File Watcher)

- Tầng TypeScript thiết lập bộ giám sát tệp tin chuyên biệt trong thư mục `.git/`:
  - Giám sát tệp `.git/HEAD` để phát hiện ngay lập tức khi người dùng chuyển đổi nhánh (Checkout).
  - Giám sát thư mục `.git/refs/heads/` để phát hiện khi có commit mới được thêm vào các nhánh cục bộ.
  - Giám sát thư mục `.git/refs/tags/` để phát hiện khi có thẻ tag mới được tạo hoặc bị xóa.
  - Giám sát các tệp trạng thái dở dang (`MERGE_HEAD`, `CHERRY_PICK_HEAD`, thư mục `rebase-merge`).

### 3.2. Cơ Chế Hàng Đợi Hoãn Xử Lý (Debounce & Coalescing)

- Khi người dùng thực hiện một thao tác phức tạp (như rebase qua 10 commit liên tiếp), hệ thống tệp có thể phát sinh hàng trăm sự kiện thay đổi trong vài phần nghìn giây.
- Module điều phối áp dụng cơ chế hoãn xử lý (Debounce khoảng 150ms): gom toàn bộ các sự kiện thay đổi diễn ra liên tiếp thành một thông báo duy nhất gửi tới engine F#.

### 3.3. Tính Toán Vi Sai Trong Engine F# (Incremental Recomputation)

1. Khi nhận lệnh làm mới bộ đệm (`InvalidateCache`), engine F# không đọc lại toàn bộ 50.000 commit.
2. Engine chỉ đọc lại con trỏ HEAD và các tham chiếu nhánh vừa thay đổi, kiểm tra phần commit mới được nối thêm vào đỉnh cây đồ thị.
3. Chỉ tính toán lại tọa độ các nút và đường vẽ cho vùng đồ thị bị ảnh hưởng, sau đó stream ngay lập tức phạm vi cập nhật cho Webview.
4. Giao diện được cập nhật tức thì trong nháy mắt mà người dùng không hề cảm nhận thấy bất kỳ sự gián đoạn hay tải lại toàn bộ trang nào.
