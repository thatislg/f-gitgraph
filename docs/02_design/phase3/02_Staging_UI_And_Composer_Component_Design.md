# 02. Thiết Kế Giao Diện Staging Area & Commit Composer (UI Component Architecture & Visual Specifications)

Tài liệu này đặc tả chi tiết kiến trúc tầng Giao diện Webview, hệ thống cấu trúc thành phần giao diện, ngôn ngữ thẩm mỹ kỹ thuật số Cyber-Lab với đinh tán chữ thập góc (`+`), và các quy tắc tương tác người dùng phục vụ cho **Milestone 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào kiến trúc giao diện, quy chuẩn thẩm mỹ, hành vi thị giác và luồng trải nghiệm người dùng; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
>
> 📌 **GitHub Tracking**: [Epic #23 - Cyber-Lab UI & Commit Composer](https://github.com/thatislg/f-gitgraph/issues/23) (Gồm 12 tasks con: [#24](https://github.com/thatislg/f-gitgraph/issues/24) đến [#35](https://github.com/thatislg/f-gitgraph/issues/35))

---

## 1. Cấu Trúc Phân Cấp & Trách Nhiệm Từng Thành Phần Giao Diện

Khu vực Staging và Soạn thảo Commit được phân rã thành các thành phần giao diện độc lập, có trách nhiệm rõ ràng:

1. **Khung Bao Bọc Chính (`StagingArea`)**:
   - Đóng vai trò là thùng chứa cấp cao nhất (Container), tích hợp hai phân vùng: Bảng hiển thị danh sách tệp (`StagingPanel`) ở nửa trên và Khung soạn thảo commit (`CommitComposer`) ở nửa dưới.
   - Đảm bảo toàn bộ phân vùng nằm gọn trong khung nhìn và tự động phân bổ tỷ lệ chiều cao hợp lý.
2. **Khung Kỹ Thuật Đinh Tán Chữ Thập Góc (`CornerCrossFrame`)**:
   - Thành phần khung bọc đa dụng (Wrapper Component) mang tính biểu tượng của phong cách Cyber-Lab.
   - Chịu trách nhiệm render đường viền kỹ thuật mỏng và bốn đinh tán chữ thập (`+`) tại bốn góc của khung.
   - Quản lý hiệu ứng chuyển đổi trạng thái màu sắc của đinh tán khi người dùng tương tác vào vùng làm việc.
3. **Bảng Danh Sách Tệp Biến Động (`StagingPanel`)**:
   - Quản lý và hiển thị hai phân nhóm tệp riêng biệt: Nhóm các tệp đã đưa vào Staging (Staged Changes) và Nhóm các tệp thay đổi trên đĩa làm việc (Changes / Unstaged).
   - Hiển thị thanh tiêu đề nhóm, số lượng tệp biến động trong từng nhóm, và các nút thao tác hàng loạt (Stage All, Unstage All, Discard All).
4. **Dòng Hiển Thị Chi Tiết Tệp Tin (`StagingFileItem`)**:
   - Biểu diễn một tệp tin cụ thể trong danh sách.
   - Bao gồm: Huy hiệu trạng thái vuông Neon, tên tệp nổi bật, đường dẫn thư mục phụ mờ phía sau, và cụm nút thao tác nhanh ẩn/hiện theo con trỏ chuột.
5. **Bộ Soạn Thảo Commit Chuyên Nghiệp (`CommitComposer`)**:
   - Cung cấp ô nhập tiêu đề commit một dòng kèm bộ đếm ký tự 50 chars thông minh.
   - Cung cấp khung nhập nội dung mô tả mở rộng nhiều dòng với khả năng tự động co giãn chiều cao.
   - Quản lý các tùy chọn nâng cao: Sửa đổi commit gần nhất (Amend) và Ký số bảo mật (GPG/SSH).
   - Điều phối các nút hành động chính (Commit, Commit & Push) và lắng nghe tổ hợp phím tắt toàn cục.

---

## 2. Ngôn Ngữ Thẩm Mỹ Cyber-Lab & Thiết Kế Đinh Tán Chữ Thập Góc (`+`)

Kế thừa và chuẩn hóa trực tiếp từ quy chuẩn thiết kế hệ thống tại [004_Design_System_And_Visual_Identity.md](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md):

### 2.1. Quy Chuẩn Đinh Tán Chữ Thập Góc (`CornerCrossFrame`)

Toàn bộ khối làm việc Staging và Bộ soạn thảo Commit được bao bọc bên trong khung viền kỹ thuật mang bốn đinh tán chữ thập góc:

1. **Vị Trí Tọa Độ & Cấu Trúc Đinh Tán**:
   - Bốn ký tự chữ thập (`+`) được đặt chính xác tại bốn đỉnh góc vuông của khung hình chữ nhật: góc trên-trái, góc trên-phải, góc dưới-trái và góc dưới-phải.
   - Ký tự sử dụng phông chữ đơn khoảng cách (Monospace font), kích thước chữ nhỏ gọn, chiều cao dòng cân đối, và đặt chế độ không cho phép người dùng bôi đen chọn văn bản (`user-select: none`).
   - Tọa độ tâm của ký tự `+` trùng khít với điểm giao nhau của đường viền ngang và đường viền dọc ở mỗi góc.
2. **Hiệu Ứng Bừng Sáng Chuyển Đổi Trạng Thái (Active Focus Glow)**:
   - **Trạng thái Chờ / Nghỉ (Idle State)**: Khi người dùng chưa tương tác hoặc đang tập trung vào vùng đồ thị commit, bốn đinh tán góc hiển thị ở tông màu xám kỹ thuật trầm với độ mờ 50%. Khi rê chuột qua khung, độ mờ tăng nhẹ lên 80% tạo cảm giác phản hồi cơ học.
   - **Trạng thái Tiêu Điểm / Kích Hoạt (Focused / Active State)**: Khi người dùng nhấp chuột vào bất kỳ vị trí nào bên trong khung hoặc trỏ con trỏ vào ô soạn thảo commit, cả bốn đinh tán góc lập tức bừng sáng với sắc tím Neon (`#a855f7`) rực rỡ ở độ sáng 100%. Hiệu ứng này tạo ra một "hộp kỹ thuật số" nổi bật, định vị rõ ràng vùng làm việc đang hoạt động của lập trình viên.
3. **Quy Chuẩn Đồng Bộ Chế Độ Tối & Sáng (Dark & Light Theme Harmony)**:
   - *Giao diện Tối (Dark Theme)*: Nền khung màu xám than bán trong suốt (`rgba(24, 24, 27, 0.4)`), viền mỏng xám chì ánh kim (`rgba(63, 63, 70, 0.6)`), đinh tán phát sáng tím Neon rực rỡ.
   - *Giao diện Sáng (Light Theme)*: Nền khung màu trắng sứ bán trong suốt (`rgba(255, 255, 255, 0.8)`), viền mỏng xám bạc thanh lịch (`rgba(228, 228, 231, 0.8)`), đinh tán phát sáng tím thẫm công nghệ (`#7c3aed`).

### 2.2. Triết Lý Tránh Rối Mắt Của GitLens: Cơ Chế "Hover-to-Reveal Actions"

1. **Phân Tích Nhược Điểm Thị Giác Của GitLens**:
   - Trong các công cụ truyền thống như GitLens, trên mỗi dòng tệp tin luôn hiển thị thường trực hàng loạt biểu tượng tác vụ nhỏ (nút mở tệp, nút xem diff, nút stage, nút revert, nút stash...). Khi danh sách có hàng chục tệp thay đổi, giao diện biến thành một ma trận icon dày đặc, gây mệt mỏi thị giác và làm phân tán sự tập trung của lập trình viên.
2. **Giải Pháp Thanh Thoát & Trật Tự Của F-GitGraph**:
   - Ở trạng thái bình thường, mỗi dòng tệp chỉ hiển thị duy nhất hai yếu tố thị giác: Huy hiệu vuông trạng thái màu sắc và Tên tệp tin kèm đường dẫn mờ.
   - Toàn bộ các nút tác vụ thao tác nhanh (nút Stage, nút Unstage, nút Discard) được ẩn hoàn toàn (độ mờ bằng 0).
   - Chỉ khi lập trình viên rê con trỏ chuột lên đúng dòng tệp đó, cụm nút tác vụ tương ứng mới hiện ra mượt mà ở mép phải của dòng.
   - Nhờ đó, bảng danh sách luôn giữ được vẻ đẹp phẳng phiu, sạch sẽ, thoáng đãng, mang lại trải nghiệm làm việc thư thái và hiện đại.

---

## 3. Đặc Tả Chi Tiết Từng Khối Giao Diện & Bố Cục Không Gian

### 3.1. Bố Cục Tổng Thể Vùng Làm Việc (ASCII Wireframe Mockup)

```
+──────────────────────────────────────────────────────────────────────────+
│ + STAGING & COMMIT WORKSPACE                                           + │
│                                                                          │
│ 📝 STAGED CHANGES (2)                                   [- Unstage All]  │
│  ├─ [M] App.tsx                 src/webview/                  [ - | ↺ ]  │
│  └─ [A] StorageReader.fs        src/core-engine/Storage/      [ - | ↺ ]  │
│                                                                          │
│ 📁 CHANGES (3)                                          [+ Stage All]    │
│  ├─ [M] gitCliMutator.ts        src/extension/mutator/        [ + | 🗑 ]  │
│  ├─ [D] oldRenderer.ts          src/legacy/                   [ + | 🗑 ]  │
│  └─ [U] soundEngine.ts          src/audio/                    [ + | 🗑 ]  │
│                                                                          │
│ ──────────────────────────────────────────────────────────────────────── │
│ ✍️ COMMIT COMPOSER                                                       │
│ ┌──────────────────────────────────────────────────────────┬───────────┐ │
│ │ Commit message (Ctrl+Enter to commit)...                 │  (34/50)  │ │
│ ├──────────────────────────────────────────────────────────┴───────────┤ │
│ │ Optional extended description (Markdown supported)...                │ │
│ │                                                                      │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ [ ] Amend previous commit         [x] Sign commit (GPG)                  │
│                                                                          │
│ [ Button: Commit 2 files ]                      [ Button: Commit & Push] │
│ +                                                                      + │
+──────────────────────────────────────────────────────────────────────────+
```

### 3.2. Đặc Tả Bảng Danh Sách Tệp (`StagingPanel` & `StagingFileItem`)

1. **Thanh Tiêu Đề Phân Nhóm**:
   - Nhóm 1: **Staged Changes** (Các thay đổi đã sẵn sàng commit). Bên phải tiêu đề có nút hành động "Unstage All" mang ký hiệu `-`.
   - Nhóm 2: **Changes** (Các thay đổi chưa đưa vào Staging trên thư mục làm việc). Bên phải tiêu đề có nút hành động "Stage All" mang ký hiệu `+`, và nút hành động "Discard All" mang ký hiệu `↺`.
   - Số lượng tệp trong từng nhóm được hiển thị trong dấu ngoặc đơn cạnh tiêu đề (ví dụ: `Staged Changes (2)`).
2. **Quy Chuẩn Huy Hiệu Trạng Thái Vuông Neon ($18\text{px} \times 18\text{px}$)**:
   - Kích thước: Khung vuông cạnh 18px, bo góc nhẹ vi mô 3px.
   - Phông chữ: Chữ in hoa đơn sắc, căn giữa hoàn hảo, độ dày nét đậm (Bold).
   - Bảng quy định mã màu sắc chuẩn:
     - **Mã `A` (Added - Tệp mới thêm)**: Nền xanh lục Neon dịu mắt, chữ trắng phát quang.
     - **Mã `M` (Modified - Tệp sửa đổi)**: Nền vàng cam Neon, chữ trắng sắc nét.
     - **Mã `D` (Deleted - Tệp đã xóa)**: Nền đỏ hồng Neon, chữ trắng cảnh báo.
     - **Mã `R` (Renamed - Tệp đổi tên)**: Nền tím Neon công nghệ, chữ trắng hiện đại.
     - **Mã `U` (Untracked - Tệp chưa theo dõi)**: Nền xám bạc kỹ thuật, chữ trắng trung tính.
3. **Cấu Trúc Tên Tệp & Đường Dẫn Thư Mục**:
   - Tên tệp tin (ví dụ: `App.tsx`): Hiển thị ở màu chữ nổi bật, phông chữ chuẩn giao diện.
   - Đường dẫn thư mục tương đối (ví dụ: `src/webview/`): Hiển thị mờ phía sau tên tệp với tông xám mờ và kích thước chữ nhỏ hơn một bậc, giúp nhận diện vị trí tệp mà không lấn át tên tệp chính.
4. **Tương Tác Xem So Sánh Vi Sai (Diff View)**:
   - Khi người dùng nhấp đúp (Double Click) hoặc nhấp chuột vào tên tệp tin: Hệ thống tự động kích hoạt bộ so sánh vi sai của trình biên dịch (lệnh `vscode.diff`), mở ra tab so sánh hai cột giữa nội dung trên đĩa làm việc với nội dung trong Staging Index (hoặc giữa Staging Index với commit HEAD).

### 3.3. Đặc Tả Bộ Soạn Thảo Commit (`CommitComposer`)

1. **Khung Nhập Tiêu Đề Commit (Subject Input)**:
   - Ô nhập dữ liệu một dòng, chiều cao chuẩn 34px, có placeholder hướng dẫn: *"Commit message (Ctrl+Enter to commit)..."*.
   - **Bộ Đếm Ký Tự Thông Minh 50 Ký Tự (Smart Character Counter)**:
     - Nằm cố định ở góc trên bên phải của ô nhập liệu.
     - Hiển thị theo định dạng tỷ lệ: `(ký_tự_hiện_tại / 50)`.
     - *Quy tắc chuyển màu cảnh báo*:
       - Từ 1 đến 50 ký tự: Chữ màu xám bạc kỹ thuật mờ, thông báo độ dài đạt chuẩn quy ước Git convention.
       - Từ 51 đến 72 ký tự: Tự động chuyển sang màu vàng hổ phách, phát tín hiệu cảnh báo tiêu đề bắt đầu dài và có thể bị ngắt dòng trong một số công cụ log dòng lệnh.
       - Trên 72 ký tự: Tự động chuyển sang màu đỏ hồng Neon cảnh báo, nhắc nhở lập trình viên nên rút gọn tiêu đề và chuyển các nội dung giải thích chi tiết xuống khung mô tả mở rộng bên dưới.
2. **Khung Nhập Mô Tả Mở Rộng (Body / Description Input)**:
   - Ô nhập văn bản nhiều dòng (Textarea) phục vụ việc giải thích chi tiết lý do thay đổi mã nguồn hoặc liệt kê danh sách các tác vụ con.
   - Hỗ trợ định dạng văn bản Markdown chuẩn.
   - Chiều cao tự động co giãn linh hoạt theo lượng văn bản người dùng gõ vào: chiều cao tối thiểu 60px khi rỗng, chiều cao tối đa 160px kèm thanh cuộn mỏng kỹ thuật số khi nội dung dài.
3. **Các Tùy Chọn Mở Rộng Nâng Cao**:
   - **Tùy chọn "Amend previous commit"**:
     - Khi lập trình viên tích chọn vào ô này: Hệ thống tự động gửi yêu cầu lên Backend để lấy thông điệp của commit trên đỉnh `HEAD` hiện tại và điền sẵn vào ô tiêu đề cũng như khung mô tả, giúp người dùng dễ dàng chỉnh sửa mà không cần gõ lại từ đầu.
     - Khi bỏ tích: Hệ thống khôi phục lại nội dung nháp người dùng đang soạn thảo dở trước đó.
   - **Tùy chọn "Sign commit (GPG/SSH)"**:
     - Cho phép bật/tắt cờ ký số điện tử cho lần commit này. Trạng thái mặc định được tự động đồng bộ theo cấu hình Git toàn cục của lập trình viên.
4. **Cụm Nút Hành Động Thực Thi**:
   - **Nút Hành Động Chính (`Commit`)**:
     - Nền màu tím Neon đặc trưng của F-GitGraph, chữ trắng in đậm, hiệu ứng bóng mờ phát sáng lan tỏa khi hover.
     - Nhãn nút hiển thị động số lượng tệp sẽ được ghi nhận vào commit (ví dụ: `Commit 2 files` hoặc `Amend commit`).
     - *Điều kiện vô hiệu hóa (Disabled State)*: Nút bị làm mờ và không thể nhấn khi danh sách Staged rỗng (ngoại trừ trường hợp đang bật Amend) HOẶC ô tiêu đề commit đang để trống HOẶC tiến trình commit đang chạy dở dở.
   - **Nút Hành Động Kép (`Commit & Push`)**:
     - Nút phụ nằm cạnh nút chính, cho phép thực hiện chuỗi hai hành động: ghi commit vào kho cục bộ và tự động đẩy commit lên nhánh theo dõi trên máy chủ từ xa (Remote Tracking Branch) chỉ với một cú nhấp chuột.
   - **Phím Tắt Kích Hoạt Nhanh Toàn Cục**:
     - Lập trình viên có thể nhấn tổ hợp phím `Ctrl + Enter` (trên Windows/Linux) hoặc `Cmd + Enter` (trên macOS) từ bất kỳ ô nhập liệu nào để kích hoạt hành động commit ngay lập tức mà không cần nhấc tay khỏi bàn phím.

---

## 4. Mô Hình Quản Lý Trạng Thái Giao Diện (State Management Model)

Trạng thái vùng làm việc Staging được quản lý tập trung theo mô hình phản ứng dữ liệu (Reactive Signals Architecture):

### 4.1. Danh Sách Các Tín Hiệu Trạng Thái Cơ Sở (Base Signals)

1. **Tín hiệu danh sách tệp Staged**: Lưu trữ mảng các bản ghi tệp hiện đang nằm trong Staging Index. Tự động cập nhật khi có lệnh stage/unstage thành công hoặc khi File Watcher báo biến động.
2. **Tín hiệu danh sách tệp Unstaged**: Lưu trữ mảng các bản ghi tệp thay đổi trên đĩa làm việc chưa đưa vào Staging.
3. **Tín hiệu tiêu đề commit**: Lưu trữ chuỗi ký tự tiêu đề do người dùng nhập.
4. **Tín hiệu mô tả commit**: Lưu trữ chuỗi văn bản mô tả mở rộng nhiều dòng.
5. **Tín hiệu trạng thái Amend**: Giá trị logic ghi nhận việc người dùng có đang bật chế độ sửa đổi commit trước hay không.
6. **Tín hiệu trạng thái Ký số**: Giá trị logic ghi nhận tùy chọn ký số GPG/SSH.
7. **Tín hiệu trạng thái Đang thực thi (Is Committing)**: Giá trị logic bật lên khi tiến trình commit bắt đầu chạy và tắt đi khi kết thúc, dùng để hiển thị biểu tượng quay vòng tải dữ liệu và khóa nút bấm tránh người dùng nhấn đúp nhiều lần.

### 4.2. Tín Hiệu Dẫn Xuất Tính Toán (Computed Signals)

1. **Điều kiện sẵn sàng Commit**:
   - Giá trị logic được tính toán tự động: Chỉ trả về `true` khi thỏa mãn đồng thời ba điều kiện:
     - Danh sách tệp Staged có ít nhất một tệp (hoặc chế độ Amend đang được kích hoạt).
     - Ô tiêu đề commit có ít nhất một ký tự khác khoảng trắng.
     - Tiến trình commit hiện không ở trạng thái đang bận thực thi.
2. **Trạng thái màu sắc của bộ đếm ký tự**:
   - Tự động suy biến mã màu dựa trên độ dài của chuỗi tiêu đề commit: trả về mã màu xám khi độ dài dưới 51, mã màu vàng khi độ dài từ 51 đến 72, và mã màu đỏ khi độ dài vượt quá 72.

---

## 5. Quy Trình Xác Nhận An Toàn Khi Hoàn Tác (Discard Confirmation Flow)

> [!CAUTION]
> Thao tác hoàn tác thay đổi (`git restore` hoặc `git clean`) sẽ xóa bỏ vĩnh viễn toàn bộ các dòng mã nguồn chưa commit khỏi đĩa cứng. Dữ liệu này không nằm trong lịch sử Git nên không thể khôi phục qua `git reflog`.

Để bảo vệ an toàn tối đa cho mã nguồn của lập trình viên, hệ thống áp dụng quy trình xác nhận nghiêm ngặt:

1. **Kích Hoạt Hộp Thoại Cảnh Báo An Toàn (Safety Modal)**:
   - Khi người dùng bấm vào nút Discard trên bất kỳ tệp tin nào (hoặc bấm nút Discard All trên thanh tiêu đề nhóm): Thao tác ghi lệnh **không bao giờ được gửi đi ngay lập tức**.
   - Một hộp thoại cảnh báo dạng Modal xuất hiện nổi bật ở chính giữa màn hình làm việc, bao bọc trong khung viền kỹ thuật số với bốn đinh tán chữ thập góc phát sáng màu đỏ cam cảnh báo.
2. **Cấu Trúc Nội Dung Hộp Thoại Cảnh Báo**:
   - **Tiêu đề cảnh báo**: *"Discard Changes?"* kèm biểu tượng cảnh báo hình tam giác màu đỏ.
   - **Thông điệp giải thích rõ ràng**:
     - Nếu hoàn tác một tệp: *"Are you sure you want to discard all uncommitted changes in '{tên_tệp}'? This operation is permanent and cannot be undone."*
     - Nếu hoàn tác toàn bộ: *"Are you sure you want to discard ALL changes in working directory? All untracked files will be permanently deleted."*
3. **Cụm Nút Phản Hồi Trực Quan**:
   - **Nút Hủy Bỏ (`Cancel`)**: Nằm ở vị trí ưu tiên đầu tiên, nhận phím tắt `Esc` để đóng hộp thoại an toàn mà không làm thay đổi bất kỳ tệp nào.
   - **Nút Xác Nhận Hoàn Tác (`Discard`)**: Nền màu đỏ Neon cảnh báo, chỉ khi người dùng chủ động nhấp chuột vào nút này thì thông điệp yêu cầu thực thi lệnh mới được gửi sang tầng Backend.
