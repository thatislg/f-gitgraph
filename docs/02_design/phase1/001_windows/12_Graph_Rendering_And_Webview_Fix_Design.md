# 12. Thiết Kế Kỹ Thuật Khắc Phục Sự Cố Hiển Thị Đồ Thị & Đồng Bộ Hình Học F# - Webview (Graph Rendering & Webview Fix Design)

Tài liệu này đặc tả chi tiết giải pháp thiết kế kỹ thuật nhằm khắc phục triệt để các sự cố hiển thị đồ thị và suy thoái giao diện đã được ghi nhận trong **Hồ sơ điều tra `REP-WIN-011`**, đưa hệ thống đồ thị F-GitGraph đạt trạng thái vận hành mượt mà, chính xác và đồng bộ hoàn hảo giữa nhân F# Core Engine Native AOT và tầng giao diện Preact Webview.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nghiêm ngặt nguyên tắc: **100% mô tả bằng ngôn ngữ tự nhiên**, tập trung vào kiến trúc giải thuật, quy chuẩn hình học, luồng xử lý trạng thái và tính tương thích thị giác, không sử dụng mã nguồn mẫu.

---

## 1. Mục Tiêu & Ranh Giới Thiết Kế

1. **Khắc phục triệt để 4 lỗi cốt lõi đã điều tra**:
   - **Sự cố xung đột màu sắc (`BUG-01`)**: Xây dựng cơ chế bảo toàn màu sắc theo nhánh và chống trùng màu giữa các làn kề nhau.
   - **Sự cố biến dạng và mất node khi mở chi tiết commit (`BUG-02`)**: Xây dựng thuật toán chuyển đổi hình học thích ứng cho đường nối SVG và vị trí các node khi hàng commit mở rộng panel chi tiết.
   - **Sự cố rò rỉ node và làn kéo dài dưới commit gốc (`BUG-03`)**: Thiết lập cơ chế đóng làn dứt khoát và giới hạn khung vẽ chính xác tại điểm kết thúc của đồ thị.
   - **Sự cố mất màu nền badge nhánh/tag (`BUG-04`)**: Chuẩn hóa hệ thống biến token màu trong cấu hình Tailwind CSS v4 để khôi phục lớp nền pill nổi bật.
2. **Khắc phục các sự cố hình học bổ trợ**:
   - **Sự cố mép cột graph (`BUG-05`)**: Đồng bộ hóa tuyệt đối các hằng số hình học giữa F# Core Engine và Webview Preact (`LaneWidth`, `Margin`, `GraphPadding`).
   - **Sự cố nạp avatar trong cửa sổ ảo (`BUG-06`)**: Đồng bộ hóa vòng đời nạp avatar với dải cửa sổ ảo của `graph-window.store.ts`.

---

## 2. Thiết Kế Thuật Toán Phân Bổ Màu Sắc Nhất Quán & Chống Trùng Màu (Khắc phục BUG-01)

### 2.1. Phân Tích Nguyên Nhân Kỹ Thuật

Ở phiên bản ban đầu, thuật toán F# gán màu bằng phép toán đơn giản `lane % PaletteSize` và cố định màu của đường nối SVG theo màu nút con (`child.Color`). Cách tiếp cận này dẫn tới:

- Khi một làn được giải phóng rồi tái sử dụng ngay lập tức cho một nhánh hoàn toàn mới, nhánh mới lại mang màu giống hệt nhánh vừa kết thúc.
- Hai làn nằm cạnh nhau có thể vô tình nhận cùng một màu hoặc các màu có tông gần nhau trong bảng 8 màu.
- Khi rẽ nhánh hoặc sáp nhập nhánh, đường nối cong lấy sai màu nguồn/đích, gây hiện tượng một đường nhánh đổi màu giữa chừng.

### 2.2. Giải Pháp Thiết Kế: Kế Thừa Màu Theo Dòng Dõi Nhánh (Branch Color Lineage)

1. **Khái niệm Định Danh Nhánh Ảo (Virtual Branch Identity)**:
   - Mỗi chuỗi commit đi qua đường cha thứ nhất (First-parent chain) được định nghĩa là một dòng dõi nhánh duy nhất.
   - Dòng dõi này được cấp phát một chỉ số màu cố định ngay khi nhánh xuất hiện và duy trì màu sắc đó xuyên suốt từ commit đầu tiên cho tới khi sáp nhập hoàn toàn hoặc chạm tới commit gốc.
2. **Quy Tắc Tránh Xung Đột Màu Cạnh Nhau (Adjacent Color Conflict Avoidance)**:
   - Khi cấp phát làn mới cho một nhánh phụ, thuật toán kiểm tra danh sách màu của các làn lân cận đang hoạt động (`lane - 1` và `lane + 1`).
   - Chọn chỉ số màu trong bảng màu sao cho:
     - Không trùng với màu của làn bên trái và bên phải.
     - Có khoảng cách chỉ số trong bảng màu lớn nhất để bảo đảm độ tương phản thị giác tối đa cho mắt người quan sát.
3. **Quy Tắc Gán Màu Cho Đường Nối (Path Edge Coloring)**:
   - **Đường thẳng đứng (Cùng làn)**: Mang màu của chính làn đó.
   - **Đường rẽ nhánh (Fork - từ nhánh cha tách ra nhánh con mới)**: Mang màu của nhánh con mới tạo.
   - **Đường sáp nhập (Merge-in - nhánh phụ nhập vào nhánh chính)**: Mang màu của nhánh phụ đang được sáp nhập, thể hiện luồng mã nguồn từ nhánh tính năng đổ vào nhánh chính.

---

## 3. Thiết Kế Cơ Chế Đồng Bộ Hình Học Khi Mở Rộng Dòng Commit (Khắc phục BUG-02)

### 3.1. Phân Tích Nguyên Nhân Kỹ Thuật

Khi người dùng chọn một commit, bảng HTML chèn thêm một hàng chi tiết panel có chiều cao cố định (~250px).

- **Lệch pha hai nơi tính tọa độ Y riêng rẽ**: Hiện tượng đường nối và node avatar được tính toán vị trí theo trục thẳng đứng tại hai luồng logic tách rời. Nếu một bên được cộng bù độ lệch dãn nở trong khi bên kia vẫn sử dụng công thức nhân chỉ số dòng với chiều cao hàng ban đầu, phần đường nối sẽ bị dời dịch trong khi avatar đứng yên tại chỗ cũ (hoặc ngược lại), tạo ra khoảng trống dị thường ngay trong vùng hiển thị panel chi tiết.
- **Biến dạng đường cong khi dãn khoảng cách**: Khi khoảng cách giữa hai commit bị kéo dãn thêm 250px, nếu giữ nguyên phép vẽ cong Bezier toàn phần, đường nối cong sẽ bị kéo dãn thành hình chữ S dài méo mó, phá vỡ tính liên tục và quy chuẩn thị giác của đồ thị.
- **Lệch pha trong layer avatar lồng nhau**: Node avatar được tạo bởi nhiều phần tử lồng nhau gồm nhóm thẻ SVG, vùng cắt mặt nạ đa giác clip-path, và thẻ nhúng ảnh đại diện. Nếu chỉ có một thuộc tính nhận tọa độ dãn nở còn vùng cắt clip-path hoặc điểm gốc biến đổi hình học transform-origin giữ nguyên tọa độ cũ, ảnh avatar sẽ bị cắt cụt, biến mất hoặc cố định tại tọa độ khởi tạo ban đầu.
- **Lệch pha chu kỳ hiển thị giữa các layer**: Sự thay đổi trạng thái mở rộng hàng nếu không kích hoạt cập nhật đồng thời cho cả layer đường nối bên dưới và layer node avatar bên trên sẽ gây ra độ trễ thị giác và hiện tượng rách hình.

### 3.2. Giải Pháp Thiết Kế: Quy Chuẩn Một Hàm Tọa Độ Duy Nhất & Hình Học Thích Ứng

1. **Nguyên Tắc Một Hàm Chuyển Đổi Tọa Độ Thẳng Đứng Duy Nhất (Single Source of Truth Coordinate Mapping)**:
   - Toàn bộ hệ thống Webview phải quy tụ việc tính toán tọa độ thẳng đứng Y về một hàm ánh xạ duy nhất.
   - Hàm này tiếp nhận chỉ số dòng cần tính, chiều cao cơ sở của một dòng, khoảng đệm lề trên, chỉ số dòng của commit đang mở rộng (nếu có), và chiều cao dãn nở của panel chi tiết.
   - **Quy tắc điều kiện nghiêm ngặt `row > e` (Lớn hơn, tuyệt đối không dùng Lớn hơn hoặc bằng)**:
     - Dòng của chính commit đang mở rộng ($row = e$) và toàn bộ các dòng phía trên nó ($row < e$) phải giữ nguyên tọa độ thẳng đứng ban đầu, đặt nút commit ngay tại mép trên của panel chi tiết.
     - Chỉ các dòng nằm hoàn toàn phía dưới dòng mở rộng ($row > e$) mới được cộng thêm chiều cao dãn nở của panel chi tiết.
   - Mọi thuộc tính hình học liên quan đến trục đứng gồm tọa độ tâm nút, tọa độ ảnh avatar, tọa độ đỉnh polygon lục giác, và điểm đầu/cuối của các đoạn đường nối bắt buộc phải được xuất phát từ hàm ánh xạ duy nhất này, loại bỏ hoàn toàn việc cộng bù trừ tự phát ở các component riêng lẻ.

2. **Quy Chuẩn Đoạn Thẳng Đứng Cho Đường Nối Đi Xuyên Panel Chi Tiết**:
   - Đối với các đường nhánh bắt đầu từ dòng phía trên hoặc bằng dòng mở rộng và kết thúc ở dòng phía dưới dòng mở rộng:
     - Đoạn đường từ commit con đến đáy của hàng commit mở rộng: Giữ nguyên hình học đường nối chuẩn.
     - **Đoạn đi xuyên qua toàn bộ chiều cao của panel chi tiết**: Bắt buộc phải là **đoạn thẳng đứng** chạy dọc theo trục hoành của chính làn đó, nghiêm cấm kéo dãn đường cong Bezier qua suốt chiều cao panel. Đoạn thẳng đứng này được hiển thị với độ mờ $30\% - 40\%$ để tạo hiệu ứng thẩm mỹ rằng đường nhánh đang chạy ngầm phía sau panel chi tiết.
     - Đoạn đường từ đáy panel chi tiết đến commit cha: Tiếp tục nối liền mạch với tọa độ đã được dịch chuyển theo hàm tọa độ chuẩn.

3. **Đồng Bộ Hóa Đa Tầng Cho Layer Avatar và Vùng Cắt Clip-Path**:
   - Toàn bộ các thành phần cấu thành một node lục giác avatar phải được cập nhật đồng bộ theo tọa độ tâm thẳng đứng mới:
     - Tọa độ đỉnh của đa giác lục giác nền và viền.
     - Tọa độ các đỉnh của đa giác nằm trong thẻ định nghĩa vùng cắt mặt nạ clip-path.
     - Tọa độ góc trên bên trái của thẻ nhúng ảnh đại diện (được tính bằng tọa độ tâm trừ đi bán kính node).
     - Điểm gốc biến đổi hình học transform-origin của nhóm phần tử SVG (để bảo đảm hiệu ứng phóng to hover/select 1.15x xoay quanh đúng tâm mới của node).

4. **Kích Hoạt Chu Trình Hiển Thị Đồng Thời Cho Cả Hai Layer**:
   - Trạng thái mở rộng commit phải đóng vai trò là phụ thuộc trực tiếp kích hoạt quá trình kết xuất lại đồng thời cho cả layer đường vẽ SVG lẫn layer node lục giác, bảo đảm hai layer luôn chuyển đổi vị trí trong cùng một khung hình hiển thị (frame), loại bỏ triệt để hiện tượng lệch pha thị giác.

5. **Đồng Bộ Hóa Cửa Sổ Ảo (Virtual Scrolling Compensation)**:
   - Khi có dòng mở rộng, chiều cao tổng thể của bảng và vị trí cuộn trang được bù thêm đúng chiều cao dãn nở của panel chi tiết.
   - Thuật toán ước lượng chỉ số dòng nhìn thấy trong cửa sổ ảo phải khấu trừ độ dãn nở này khi tính toán, bảo đảm Webview yêu cầu đầy đủ dải commit phía dưới từ F# Core Engine, không làm mất node ở đáy khung nhìn.

---

## 4. Thiết Kế Đồng Bộ Hệ Tọa Độ Y Theo Cửa Sổ Ảo & Khép Kín Đồ Thị Tại Commit Gốc (Khắc phục BUG-03)

### 4.1. Phân Tích Nguyên Nhân Kỹ Thuật

Hiện tượng xuất hiện node và các làn kéo dài dưới commit gốc bắt nguồn từ sự lệch pha hệ tọa độ giữa nhân F# và tầng Webview khi áp dụng cơ chế cửa sổ ảo (Virtual Scrolling Window):

- **Lệch gốc tọa độ Y (nguyên nhân cốt lõi)**: Nhân F# `Geometry.compute` sinh tọa độ Y **tuyệt đối** (`Margin + row * RowHeight`) trên toàn bộ đồ thị. Khi Webview yêu cầu một cửa sổ dòng `[from, to]`, tầng `QueryRange` trả về nguyên tọa độ tuyệt đối này, nhưng component `CommitGraph` lại vẽ vào một khung SVG được định vị tại `top = header + from * RowHeight` và có chiều cao `rows.length * RowHeight` (hệ tọa độ **cửa sổ**). Hệ quả: toàn bộ node và đường nối bị dịch xuống đúng `from * RowHeight` pixel, khiến khi cuộn xuống cuối danh sách, node của commit gốc cùng các line bị "tràn" xuống dưới đáy bảng.
- **Khung vẽ SVG chưa cắt đúng tại dòng cuối**: Chiều cao khung SVG cộng thêm `expansion.height` mà không cắt ngắn đúng tại dòng commit cuối cùng, để lộ phần đệm thừa phía dưới.

> Lưu ý: Thuật toán phân làn F# đã giải phóng làn đúng cách tại mỗi commit gốc (mảng `active` trống sau khi duyệt hết danh sách topo), kể cả kho đa gốc. Do đó hiện tượng "làn kéo dài dưới gốc" không xuất phát từ việc làn chưa được đóng, mà từ việc tọa độ Y tuyệt đối bị vẽ lệch trong hệ tọa độ cửa sổ.

### 4.2. Giải Pháp Thiết Kế: Dịch Gốc Tọa Độ Y Về Đầu Cửa Sổ Ảo

1. **Dịch Gốc Tọa Độ Y Về Đầu Cửa Sổ**:
   - Trong tầng `QueryRange` (`Transport.fs`), khi cắt cửa sổ `[fromRow, toRow]`, trừ mỗi tọa độ Y của node đi `dy = fromRow * RowHeight`.
   - Đối với đường nối, sinh lại chuỗi lệnh SVG `d` từ tọa độ node đã dịch (thay vì dùng chuỗi tuyệt đối tính sẵn), để đường nối nằm đúng trong khung SVG cửa sổ.
   - Bảo đảm không có node hay đường nối nào mang tọa độ vượt quá dòng cuối cùng của cửa sổ.
2. **Khép Kín Đồ Thị Tại Commit Gốc**:
   - Commit gốc (không cha) giải phóng làn ngay tại hàng tương ứng (đã có sẵn trong `Lanes.assign`); không sinh đường nối nào có điểm kết thúc vượt quá dòng của commit cuối cùng.
   - Với kho đa gốc (Multiple Roots / Orphan Branches), mỗi gốc tự đóng làn của chính nó ngay tại hàng chứa nó.
3. **Giới Hạn Khung Nhìn SVG Theo Dòng Thực Tế**:
   - Đặt thuộc tính cắt chiều cao (`clip-path` hoặc `max-height`) cho container chứa đồ thị SVG để bảo đảm không có bất kỳ pixel nào được kết xuất vượt quá dòng cuối cùng của bảng danh sách commit.

---

## 5. Thiết Kế Khôi Phục Hệ Thống Token Màu Nền Badge Ref Trong Tailwind CSS v4 (Khắc phục BUG-04)

### 5.1. Phân Tích Nguyên Nhân Kỹ Thuật

Trong cấu trúc mới của Tailwind CSS v4, cơ chế biên dịch class opacity (như `bg-editor-fg/10`, `border-editor-fg/20`) bắt buộc tên token màu phải được đăng ký tường minh trong directive `@theme`.

- Trong file stylesheet hiện tại, token `--color-editor-fg` và `--color-graph-fg` không hề tồn tại (chỉ có `--color-editor` và `--color-fg`).
- Trình biên dịch Tailwind v4 loại bỏ class không hợp lệ, khiến thuộc tính `background-color` không được áp dụng vào phần tử badge, dẫn tới việc badge bị mất nền và nhìn xuyên thấu xuống màu nền trang.

### 5.2. Giải Pháp Thiết Kế: Chuẩn Hóa Bảng Token Giao Diện

1. **Bổ Sung Đầy Đủ Token Màu Trong `@theme`**:
   - Đăng ký token `--color-editor-fg: var(--vscode-foreground)` đại diện cho màu chữ chính của editor.
   - Đăng ký token `--color-graph-fg: var(--vscode-editor-foreground, #FFFFFF)` đại diện cho chữ hiển thị trên nền đồ thị.
   - Bổ sung token `--color-badge-bg` với các giá trị sắc độ chuẩn cho từng loại ref (tag, local branch, remote branch).
2. **Đồng Bộ Quy Chuẩn Hiển Thị Badge Ref**:
   - **Local Branch (Active/HEAD)**: Nền phát sáng màu nhánh với độ mờ $15\%$, viền neon đậm, chữ sáng nổi bật, hiệu ứng đổ bóng phát quang ambient.
   - **Local Branch (Thường)**: Nền tối tương phản độ mờ $12\%$, viền mềm độ mờ $25\%$, chữ sáng dịu.
   - **Remote Branch**: Nền xanh lam công nghệ (Sky) độ mờ $15\%$, viền $35\%$.
   - **Tag phát hành**: Nền màu hổ phách (Amber/Orange) độ mờ $15\%$, icon thẻ tag bo góc tinh tế.

---

## 6. Thiết Kế Đồng Bộ Hằng Số Hình Học Giữa F# Core Và Webview (Khắc phục BUG-05 & BUG-06)

### 6.1. Đồng Bộ Hóa Hệ Tọa Độ Hình Học (Khắc phục BUG-05)

Để giải quyết triệt để hiện tượng node đồ thị và avatar bị dính sát mép cột ở cả hai bên trái và phải:

1. **Chuẩn Hóa Bộ Hằng Số Hình Học Độc Quyền F-GitGraph**:
   - **Khoảng cách giữa hai tâm làn (`LaneWidth`)**: Thiết lập cố định là **`20.0 px`** trên cả F# Core Engine và Webview constants (thay vì 16.0 px).
   - **Khoảng đệm an toàn lề trái (`LaneOffset` / `Margin`)**: Thiết lập cố định là **`16.0 px`** (thay vì 10.0 px).
     - Tọa độ tâm làn đầu tiên ($Lane = 0$): $X = 16.0\text{ px}$.
     - Khi rê chuột hoặc chọn dòng, nút lục giác phóng to tỷ lệ 1.15x (bán kính đạt $\approx 10.5\text{ px}$), mép trái của node nằm tại $16.0 - 10.5 = 5.5\text{ px} > 0$, bảo đảm luôn có khoảng trống an toàn $5.5\text{ px}$, không bao giờ chạm sát biên trái.
   - **Khoảng đệm an toàn lề phải (`GraphPadding`)**: Thiết lập cố định là **`20.0 px`**.
     - Chiều rộng tổng thể của cột đồ thị:
       $$\text{Width} = \max(0, \text{MaxLane}) \times 20\text{ px} + 2 \times 16\text{ px} + 20\text{ px}$$
     - Mép phải của node ở làn ngoài cùng luôn duy trì khoảng trống đệm an toàn tối thiểu $5.5\text{ px}$ trước khi bước sang mép cột tiếp theo.
   - **Chiều cao một dòng commit (`RowHeight`)**: Cố định là **`24.0 px`**.

### 6.2. Đồng Bộ Hóa Cơ Chế Tải Avatar Với Cửa Sổ Ảo (Khắc phục BUG-06)

1. **Nguyên Lý Nạp Avatar Theo Dải Cửa Sổ Ảo**:
   - Khi `graph-window.store.ts` nạp một khung commit từ chỉ số dòng $A$ đến $B$, toàn bộ danh sách địa chỉ email của các tác giả trong phạm vi này được gửi đồng thời tới bộ quản lý avatar (`AvatarManager`).
   - Sử dụng bộ nhớ đệm cache nhớ tạm thời (In-Memory Avatar Cache) trong Webview để lưu các URL avatar đã tạo từ hash email, bảo đảm khi cuộn trang lên xuống trong phạm vi đã xem, avatar hiển thị tức thì 100% không cần tính toán lại.

---

## 7. Bảng Kế Hoạch Triển Khai Chi Tiết Theo Module

|   Thứ Tự   | Hạng Mục Cần Sửa                      | Tệp Tin Tác Động                                             | Trách Nhiệm Kỹ Thuật                                                 |
| :--------: | :------------------------------------ | :----------------------------------------------------------- | :------------------------------------------------------------------- |
| **BƯỚC 1** | Khôi phục token màu badge ref         | `src/webview/styles.css`, `RefLabel.tsx`                     | Đăng ký biến màu `--color-editor-fg` và chuẩn hóa utility class.     |
| **BƯỚC 2** | Đồng bộ hằng số hình học F# & Webview | `src/core-engine/Graph/Graph.fs`, `src/webview/constants.ts` | Đồng bộ `LaneWidth = 20.0`, `Margin = 16.0`, `RowHeight = 24.0`.     |
| **BƯỚC 3** | Sửa thuật toán màu làn & khép làn F#  | `src/core-engine/Graph/Graph.fs`                             | Kế thừa màu nhánh, chống trùng màu kề cạnh, đóng làn khi hết commit. |
| **BƯỚC 4** | Xử lý biến đổi hình học khi mở commit | `src/webview/components/commit/CommitGraph.tsx`              | Biến đổi chuỗi lệnh SVG `path.d` thích ứng khi có `expansion`.       |
| **BƯỚC 5** | Đồng bộ hóa nạp avatar theo cửa sổ ảo | `src/webview/lib/stores/graph-window.store.ts`               | Gửi danh sách email/hash cần nạp đồng bộ theo dải khung nhìn.        |
| **BƯỚC 6** | Biên dịch kiểm thử & Nghiệm thu       | F# AOT build, Webview bundle, VSIX packaging                 | Chạy test, kiểm tra trực quan đa nhánh trên VS Code thực tế.         |

---

## 8. Tiêu Chuẩn Nghiệm Thu Sửa Lỗi (Acceptance Criteria)

1. **Màu sắc phân biệt rõ ràng 100%**: Các làn chạy song song kề nhau không bị trùng màu; màu của một nhánh giữ nguyên tính liên tục từ lúc rẽ đến lúc nhập; đường cong sáp nhập lấy đúng màu của nhánh phụ.
2. **Mở rộng commit hoàn hảo**: Khi click chọn commit mở panel chi tiết, các node phía dưới giữ nguyên vị trí trên làn; các đường nối đi xuyên qua panel chi tiết được vẽ liền mạch hoặc nét đứt mờ thẳng thớm, không bị kéo dãn chữ S hay đứt đoạn.
3. **Commit gốc sạch sẽ**: Bên dưới commit gốc không xuất hiện bất kỳ avatar, node lục giác hay đường nối thừa nào; đồ thị khép kín tuyệt đối.
4. **Badge ref đầy đủ màu nền**: Toàn bộ nhãn nhánh và tag hiển thị rõ khối màu nền sẫm, viền sắc nét, chữ sáng nổi bật trên mọi theme.
5. **Khoảng đệm an toàn**: Mép trái và mép phải của toàn bộ cột đồ thị luôn duy trì khoảng đệm an toàn tối thiểu 5.5px, không bị dính sát hay lẹm viền khi hover phóng to.
