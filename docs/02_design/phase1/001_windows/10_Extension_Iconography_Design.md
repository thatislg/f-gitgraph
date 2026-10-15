# 10. Thiết Kế Hệ Thống Biểu Tượng & Bộ Nhận Diện Thị Giác F-GitGraph (Extension Iconography & Visual Assets)

Tài liệu này đặc tả chi tiết ý tưởng sáng tạo nghệ thuật, bảng kiểm kê số lượng icon cần thiết, quy chuẩn kích thước kỹ thuật và hướng dẫn triển khai bộ nhận diện đồ họa vector/raster cho extension **F-GitGraph**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào ý tưởng thị giác, hình học biểu tượng, danh mục thông số kỹ thuật và tính tương thích với hệ thống giao diện VS Code, không sử dụng mã nguồn mẫu.

---

## 1. Tầm Nhìn & Triết Lý Thiết Kế Biểu Tượng

Biểu tượng của F-GitGraph không đơn thuần là một hình ảnh đại diện, mà là lời khẳng định thị giác về bản sắc của sản phẩm:

- **Chữ cái "F"**: Tượng trưng cho **Fast** (Tốc độ đột phá của F# Native AOT), **Functional** (Kiến trúc lập trình hàm bất biến) và **Future** (Giao diện thế hệ mới).
- **Cấu trúc Đồ thị Git (Git Graph DAG)**: Tượng trưng cho bản chất trực quan hóa lịch sử phân nhánh, hòa trộn và phát triển mã nguồn.
- **Ngôn ngữ Hình học Lục giác (Hexagon & Cyberpunk Neon)**: Thống nhất với ngôn ngữ thiết kế nút lục giác SVG và vầng sáng neon ambient độc quyền bên trong Webview.

---

## 2. Các Ý Tưởng Thiết Kế Biểu Tượng Sáng Tạo (Design Concepts)

Dưới đây là 3 hướng ý tưởng thẩm mỹ được đề xuất để lựa chọn:

### 2.1. Ý Tưởng 1 (Đề Xuất Hàng Đầu): "Neon Hexagon & F-Branch" (Cyberpunk Modern)

- **Ý tưởng cốt lõi**:
  - Chữ cái **"F"** được tạo nên từ chính các đường phân nhánh Git (Branch Lanes) và nút đồ thị.
  - Thân đứng của chữ F là nhánh chính (Main/Trunk Branch), hai nét ngang của chữ F là hai nhánh tính năng (Feature Branches) uốn lượn mềm mại hoặc gấp góc công nghệ 45/60 độ.
  - Các điểm nút commit trên các nhánh được tạo hình bằng **khối lục giác (Hexagon)** phát quang viền kép thay vì hình tròn truyền thống.
- **Bảng màu chủ đạo**:
  - Nền: Đen kim loại sâu (Deep Obsidian/Carbon `#0B0F19`) với bo góc tròn squircle hiện đại.
  - Nhánh chính & Nút: Xanh Cyan Neon (`#00F0FF`) rực rỡ.
  - Nhánh ngang trên: Hồng cánh sen / Fuchsia Neon (`#FF007F`).
  - Nhánh ngang dưới: Tím Amber / Violet Gradient (`#7928CA`).
- **Điểm mạnh**:
  - Nhận diện tức thì: Người dùng nhìn thấy ngay cả chữ "F", cây đồ thị Git và phong cách lục giác neon.
  - Nổi bật vượt trội khi xuất hiện trên VS Code Marketplace và danh sách Extensions.

### 2.2. Ý Tưởng 2: "F# Monogram in Git Matrix" (Tech Precision Minimalist)

- **Ý tưởng cốt lõi**:
  - Dựa trên biểu tượng toán học / chevron hình thoi đối xứng của ngôn ngữ F# (Functional Diamond), nhưng các đỉnh góc nhọn được biến tấu thành các nút đồ thị Git liên kết với nhau bằng các cung mạng.
  - Phong cách phẳng tối giản (Flat Modern) với các nét hình học dứt khoát, thanh mảnh và chuẩn xác.
- **Bảng màu chủ đạo**:
  - Tông màu xanh lam công nghệ (Electric Royal Blue `#007ACC`) kết hợp xanh ngọc lục bảo (Emerald Green `#10B981`) trên nền trong suốt hoặc xám than chì (`#1E1E1E`).
- **Điểm mạnh**:
  - Thể hiện sự vững chãi, khoa học và bản sắc nhân F# mạnh mẽ.
  - Thích hợp với người dùng yêu thích phong cách tối giản thanh lịch.

### 2.3. Ý Tưởng 3: "Prism Convergence" (Lăng Kính Phân Tán Sắc)

- **Ý tưởng cốt lõi**:
  - Một tia sáng commit trắng đơn nhất đi vào một lăng kính lục giác hình chữ F, sau đó khúc xạ và tán sắc thành 3 luồng phân nhánh mang các dải màu quang phổ neon khác nhau.
- **Bảng màu chủ đạo**:
  - Hiệu ứng Gradient tán sắc từ Vàng chanh (`#FEE140`) sang Đỏ cam (`#FA709A`) và Tím lam (`#667EEA`).
- **Điểm mạnh**:
  - Tính ẩn dụ rất cao về hành động phân nhánh (Branching) và gộp nhánh (Merging) trong quản lý mã nguồn.

### 2.4. Quyết Định Thiết Kế Chính Thức (Design Decision Record - Phê Duyệt)

- **Phương án được lựa chọn**: **Ý Tưởng 1 ("Neon Hexagon & F-Branch" - Cyberpunk Modern)**.
- **Lý do lựa chọn**:
  - Tạo tính đồng nhất thị giác 100% với các nút lục giác và vầng sáng neon của giao diện Webview Preact đã xây dựng ở Phase 1.
  - Mang lại độ nhận diện thương hiệu tức thì trên Visual Studio Code Marketplace với chữ cái "F" phân nhánh đặc trưng.
- **Phạm vi số lượng phê duyệt**: Toàn bộ **7 tệp icon** được đặc tả tại Mục 3 dưới đây sẽ được tạo và tích hợp đầy đủ.

---

## 3. Bảng Kiểm Kê & Đặc Tả Số Lượng Icon Cần Thiết (Icon Inventory & Specs)

Hệ sinh thái VS Code Extension đòi hỏi các tệp icon ở nhiều vị trí, định dạng và chế độ hiển thị khác nhau. Dưới đây là danh mục chi tiết:

|  STT  | Tên Tệp / Vị Trí                              |     Định Dạng      |    Kích Thước Canvas     | Mục Đích Sử Dụng                       | Yêu Cầu Kỹ Thuật & Hiển Thị                                                                                                                                            |
| :---: | :-------------------------------------------- | :----------------: | :----------------------: | :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | `resources/icon.png`                          | **PNG-24** (Alpha) |     **128 x 128 px**     | **Icon chính của Extension**           | Hiển thị trên VS Code Marketplace, Extensions Viewlet, danh sách cài đặt. Nền squircle bo góc 22%, viền sắc nét, không bị vỡ hạt khi thu nhỏ 64px hay phóng lớn 256px. |
| **2** | `resources/icon-512.png` _(HiDPI Master)_     | **PNG-24** (Alpha) |     **512 x 512 px**     | **Bản gốc độ phân giải cao**           | Dùng làm ảnh nguồn xuất bản, hiển thị trên trang chi tiết web của Visual Studio Marketplace và GitHub README Hero.                                                     |
| **3** | `resources/webview-icon.svg`                  |   **Vector SVG**   | **24 x 24 px** (viewBox) | **Icon Tab Webview (Chế độ Màu)**      | Hiển thị trên tab editor của Webview khi cấu hình tab icon là "colour". Thể hiện các nút lục giác màu sắc tương phản cao.                                              |
| **4** | `resources/webview-icon-dark.svg`             |   **Vector SVG**   | **24 x 24 px** (viewBox) | **Icon Tab Webview (Dark Theme)**      | Hiển thị trên tab editor khi VS Code dùng theme nền tối và cấu hình là "grey". Màu sáng dịu (`#CCCCCC` hoặc `#E0E0E0`), nét thanh mảnh 1.5px.                          |
| **5** | `resources/webview-icon-light.svg`            |   **Vector SVG**   | **24 x 24 px** (viewBox) | **Icon Tab Webview (Light Theme)**     | Hiển thị trên tab editor khi VS Code dùng theme nền sáng và cấu hình là "grey". Màu xám tối tương phản (`#333333` hoặc `#424242`).                                     |
| **6** | `resources/activitybar-icon.svg` _(Dự phòng)_ |   **Vector SVG**   | **24 x 24 px** (viewBox) | **Icon Activity Bar / Side Bar**       | Dự phòng khi cấu hình F-GitGraph mở từ thanh Side Bar bên trái. Biểu tượng vector đơn sắc `currentColor`, vùng an toàn căn giữa 18x18 px, không viền ngoài.            |
| **7** | `resources/status-bar-icon.svg` _(Dự phòng)_  |   **Vector SVG**   | **16 x 16 px** (viewBox) | **Icon Thanh Trạng Thái (Status Bar)** | Dùng khi thay thế codicon mặc định `$(type-hierarchy)` trên thanh status bar góc dưới màn hình. Tối giản cực độ để nhìn rõ ở 16px.                                     |

---

## 4. Quy Chuẩn Kỹ Thuật Đồ Họa (Graphic Standards)

Để đảm bảo bộ icon hoạt động hoàn mỹ trên mọi màn hình từ màn 1080p đến 4K Retina:

1. **Vùng An Toàn (Safe Zone & Padding)**:
   - Với icon 24x24 px: Giữ khoảng đệm (padding) tối thiểu 2px xung quanh (nội dung chính nằm gọn trong vùng 20x20 px).
   - Với icon 128x128 px: Giữ khoảng đệm an toàn 12px xung quanh để tránh bị cắt góc khi VS Code hiển thị trong khung bo tròn.
2. **Quy Tắc Vector Hóa SVG**:
   - Sử dụng đường dẫn khép kín (`<path>`) và đa giác lục giác (`<polygon>`), tuyệt đối không dựa vào font chữ bên ngoài.
   - Mã màu SVG gọn gàng, hỗ trợ cả `fill` và `stroke`, tối ưu hóa dung lượng SVG dưới 2KB mỗi file.
3. **Tính Đọc Được Ở Kích Thước Nhỏ (Micro-scale Readability)**:
   - Biểu tượng tab (24x24 px) thường chỉ hiển thị ở kích thước thực tế ~16px trên thanh tab của VS Code. Do đó, các chi tiết phụ như chữ quá nhỏ hoặc nét mảnh < 1px phải được giản lược, tập trung vào hình khối lục giác và đường zíc-zắc đặc trưng của chữ F.
4. **Đồng Bộ Hoàn Toàn Với Bảng Màu UI Webview**:
   - Màu sắc icon phải tương ứng chuẩn xác với bảng màu nhánh mặc định của F-GitGraph (nhánh 0: Cyan, nhánh 1: Fuchsia, nhánh 2: Emerald Green).

---

## 5. Lộ Trình Triển Khai Nhóm Việc 10

- **Nhiệm vụ 10.1: Chốt Ý Tưởng & Phác Thảo Vector Mẫu**
  - Trình bày mẫu và chốt phương án ý tưởng (Ý tưởng 1: Cyberpunk Neon Hexagon).
  - Thiết kế cấu trúc hình học SVG gốc (Master Vector) tỷ lệ chuẩn 1:1.
- **Nhiệm vụ 10.2: Xuất Bản Trọn Bộ Icon Raster (PNG)**
  - Sinh file `resources/icon.png` (128x128 px) chuẩn nét, màu neon trên nền tối carbon.
  - Sinh file `resources/icon-512.png` chất lượng cao cho Marketplace & README.
- **Nhiệm vụ 10.3: Hoàn Thiện & Tối Ưu Hóa Bộ Icon Vector SVG**
  - Xây dựng `resources/webview-icon.svg` đa sắc với nút lục giác.
  - Xây dựng `resources/webview-icon-dark.svg` và `resources/webview-icon-light.svg` đơn sắc tối ưu tương phản.
  - Xây dựng icon phụ trợ `activitybar-icon.svg`.
- **Nhiệm vụ 10.4: Tích Hợp & Kiểm Định Trực Quan Trên Môi Trường VS Code**
  - Cập nhật cấu hình và nạp icon vào giao diện mở tab, thanh extension và bản build VSIX.
  - Kiểm tra thực tế hiển thị trên cả Dark Theme (Default Dark+) và Light Theme (Default Light+).
