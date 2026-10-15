# 08. Kế Hoạch Chuẩn Hóa Nhận Diện Thương Hiệu & Dọn Dẹp Tàn Dư (Rebranding & Identity Cleanup)

Tài liệu này đặc tả chi tiết kế hoạch thiết kế lại toàn bộ hệ thống nhận diện thương hiệu, làm mới tài liệu người dùng và dọn dẹp triệt để các chuỗi, tệp tin tàn dư của `neo-git-graph`, hoàn thiện diện mạo độc lập chuyên nghiệp cho sản phẩm **F-GitGraph**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào chiến lược nhận diện, cấu trúc tài nguyên, phạm vi dọn dẹp và tiêu chuẩn thẩm mỹ, không sử dụng mã nguồn mẫu.

---

## 1. Tầm Nhìn & Định Vị Thương Hiệu F-GitGraph

### 1.1. Bối Cảnh & Mục Tiêu

- **Bối cảnh**: Dự án khởi đầu từ việc kế thừa mã nguồn Git Graph và neo-git-graph. Tuy nhiên, sau các cải tiến vượt bậc ở Phase 1 (Giao diện nút lục giác SVG, vầng sáng neon ambient, xem trước avatar zoom 5x, panel commit message độc quyền và nhân tính toán F# Native AOT siêu tốc), sản phẩm đã trở thành một giải pháp hoàn toàn mới với kiến trúc vượt trội.
- **Mục tiêu**:
  - Xóa bỏ triệt để toàn bộ các tàn dư định danh cũ (`neo-git-graph`, `neo-git-core`), tránh gây hiểu lầm đây chỉ là một bản fork chắp vá.
  - Định vị **F-GitGraph** là công cụ trực quan hóa Git cao cấp, thế hệ mới dành riêng cho các kho mã nguồn quy mô lớn, kết hợp giữa tốc độ xử lý mã máy của F# và giao diện người dùng tương tác tinh tế.

---

## 2. Kế Hoạch Thiết Kế Lại Bộ Tài Nguyên Hình Ảnh (Brand Assets)

Bộ nhận diện hình ảnh đóng vai trò quyết định đến cảm nhận đầu tiên của người dùng khi duyệt trên Marketplace và sử dụng hàng ngày:

### 2.1. Biểu Tượng Extension Chính (`resources/icon.png`)

- **Hiện trạng**: Biểu tượng 3 nút tròn kết nối kiểu cổ điển từ năm 2019, không phản ánh được tính năng hiện đại của F-GitGraph.
- **Phương án thiết kế mới**:
  - Kích thước chuẩn hóa: 128x128 và 256x256 pixel định dạng PNG trong suốt (Alpha Channel).
  - Ý tưởng thiết kế: Kết hợp biểu tượng chữ cái **"F"** cách điệu (tượng trưng cho Fast / F# / Functional) lồng ghép mượt mà với cấu trúc phân nhánh cây đồ thị Git.
  - Ngôn ngữ thị giác: Sử dụng họa tiết nút lục giác (Hexagon) với bảng màu neon cyberpunk hoặc gradient công nghệ xanh dương - lục bảo ánh kim, đồng bộ 100% với giao diện bên trong Webview.

### 2.2. Bộ Biểu Tượng SVG Thanh Công Cụ & Tab Webview

- **Hiện trạng**: Các file `webview-icon.svg`, `webview-icon-dark.svg`, `webview-icon-light.svg` đang dùng đồ họa tròn phẳng cũ.
- **Phương án thiết kế mới**:
  - Chuyển đổi toàn bộ các nút tròn thành hình lục giác cân đối dạng vector SVG tối giản.
  - Tạo 2 biến thể màu sắc chuẩn hóa:
    - Biến thể màu rực rỡ (`webview-icon.svg`): Tương thích chế độ màu tab icon đa sắc.
    - Biến thể đơn sắc tương phản cao (`dark`/`light`): Tự động đảo màu theo nền giao diện VS Code của người dùng (nền tối sáng rõ nét, nền sáng chìm dịu mắt).

### 2.3. Ảnh Động Giới Thiệu Tính Năng (`resources/demo.gif`)

- **Hiện trạng**: File `demo.gif` đang ghi lại phiên bản Git Graph cũ kỹ từ nhiều năm trước.
- **Phương án thu hình mới**:
  - Ghi hình tương tác thực tế ở độ phân giải cao trên màn hình sắc nét:
    - Trải nghiệm mở kho Git 50.000 commit trong nháy mắt (< 300ms).
    - Cuộn trang mượt mà 60 FPS với các nút lục giác SVG.
    - Hiệu ứng vầng sáng neon ambient khi rê chuột qua các dòng commit.
    - Tương tác nhấp avatar zoom lớn 5x và panel xem trước nội dung commit message đầy đủ.

---

## 3. Kế Hoạch Làm Mới Toàn Diện Tài Liệu Người Dùng (Documentation)

### 3.1. Trang Giới Thiệu Chính ([README.md](../../../README.md))

- **Cấu trúc lại nội dung**:
  - **Tiêu đề & Khẩu hiệu**: Giới thiệu rõ ràng **F-GitGraph: High-Performance Git Graph with F# Native AOT Core & Cyberpunk Neon UI**.
  - **Điểm nhấn công nghệ (Key Highlights)**:
    - Kiến trúc nhân kép độc nhất: UI Preact siêu nhẹ kết hợp cùng nhân F# Native AOT không phụ thuộc runtime.
    - Tốc độ đọc trực tiếp qua LibGit2 và Memory-Mapped Commit-Graph (nhanh gấp 30-50 lần extension truyền thống).
    - Giao diện nút lục giác, hiệu ứng neon ambient và avatar preview 5x độc quyền.
    - Đảm bảo an toàn 100% cho mọi lệnh ghi Git qua Git CLI gốc (bảo toàn GPG/SSH và Git Credential Manager).
  - **Bảng cấu hình đầy đủ**: Liệt kê chi tiết toàn bộ các thiết lập `f-gitgraph.*`.
  - **Huy hiệu (Badges)**: Đồng bộ toàn bộ liên kết về kho mã nguồn `thatislg/f-gitgraph`.

### 3.2. Lịch Sử Phiên Bản ([CHANGELOG.md](../../../CHANGELOG.md))

- Thiết lập mốc phát hành phiên bản mới (ví dụ `v0.8.0` hoặc `v1.0.0-preview`):
  - Ghi nhận cột mốc chuyển mình lịch sử từ JavaScript/TypeScript thuần túy sang kiến trúc đa luồng F# Native AOT.
  - Tóm lược toàn bộ danh mục cải tiến thị giác và độ trễ phản hồi.

### 3.3. Các Tệp Bản Địa Hóa Ngôn Ngữ ([package.nls.json](../../../package.nls.json))

- Cập nhật mô tả lệnh và cấu hình trong `package.nls.json`, `package.nls.zh-cn.json`, `package.nls.zh-tw.json`:
  - Thay thế toàn bộ từ ngữ "Git Graph (git log)" cũ thành "F-GitGraph: View Graph History".
  - Bổ sung chú thích ngắn gọn, hiện đại, thân thiện với lập trình viên.

---

## 4. Kế Hoạch Rà Soát Sạch Tàn Dư Mã Nguồn & Metadata Gói

### 4.1. Chuẩn Hóa Thông Tin Nhà Phát Hành ([package.json](../../../package.json))

- Rà soát các trường metadata quan trọng:
  - `publisher`: Xác định định danh publisher chính thức `lmo-lab` trên Visual Studio Marketplace.
  - `author`: Cập nhật tác giả đại diện hiện tại.
  - `sponsor`: Điều chỉnh hoặc làm sạch các liên kết tài trợ cũ.

### 4.2. Dọn Dẹp Các Tệp Rác & Bộ Nhớ Đệm Sau Biên Dịch

- Xóa các thư mục build tạm thời, file nhị phân cũ mang tên `neo-git-core.*` còn sót trong thư mục `src/core-engine/bin/` và `src/core-engine/obj/`.
- Kiểm tra danh mục `.vscodeignore` để bảo đảm không đóng gói bất kỳ file tàn dư nào vào gói cài đặt VSIX.

---

## 5. Quy Trình Nghiệm Thu Nhận Diện Thương Hiệu (Verification)

1. **Kiểm Tra Trực Quan Biểu Tượng**:
   - Cài đặt gói `.vsix` vào VS Code, kiểm tra biểu tượng hiển thị rõ ràng, sắc nét trên thanh Activity Bar, Command Palette và danh sách Extensions Installed.
2. **Kiểm Tra Đồng Bộ Tài Liệu**:
   - Mở xem trước README trên VS Code: các huy hiệu hiển thị đúng trạng thái, các đường dẫn GitHub Repo, Issues, Releases hoạt động chính xác 100%.
3. **Kiểm Tra Không Còn Từ Khóa Cũ**:
   - Chạy lệnh tìm kiếm toàn cục trong thư mục làm việc, đảm bảo không còn chuỗi `neo-git-graph` hay `neo-git-core` nào xuất hiện trong các thành phần hiển thị tới người dùng cuối.
