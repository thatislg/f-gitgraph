# Báo Cáo Sự Cố Kỹ Thuật: Biến Dạng Đồ Thị Khi Mở Rộng Dòng & Xung Đột Bảng Màu Nhánh

- **Mã hồ sơ**: `ISSUE-WIN-012`
- **Ngày lập**: 2026-10-04
- **Trạng thái**: `BUG-COLOR-01` đã khắc phục (round-robin trong `Graph.fs`); `BUG-EXPAND-01/02` đã khắc phục bằng kiến trúc Overlay Inspector Panel; Orthogonal Rounded Routing là tùy chọn thẩm mỹ chưa triển khai
- **Tác động**: Trải nghiệm giao diện Webview Preact, thuật toán phân bổ màu sắc F# Core Engine và kiến trúc hiển thị chi tiết commit.

---

## 1. Tổng Quan & Bối Cảnh

Sau khi hoàn tất bước đầu tích hợp F# Core Engine vào Webview, qua quá trình kiểm thử thực tế với kho mã nguồn phức tạp (nhiều nhánh tính năng, nhiều commit merge và commit song song), người dùng tiếp tục ghi nhận hai nhóm sự cố nghiêm trọng ảnh hưởng trực tiếp tới tính toàn vẹn hình học và độ trực quan của đồ thị commit:

1. **Sự cố khi mở rộng (expand) dòng commit message**: Đường nối graph trong vùng mở rộng bị nhạt màu bất thường, biến dạng từ cong vẹo sang thẳng đuột, mất liên kết nguồn-đích và bị hở chân từ dưới đi lên.
2. **Sự cố phân bổ màu sắc làn đồ thị**: Kho mã nguồn có rất nhiều nhánh song song độc lập, nhưng đồ thị chỉ hiển thị luẩn quẩn từ 1 đến 2 màu sắc, làm mất hoàn toàn khả năng phân biệt nhánh của người dùng.
3. **Đề xuất bước ngoặt về kiến trúc từ người dùng**: Tham khảo các công cụ Git tiêu chuẩn và GitLens để chuyển đổi cơ chế hiển thị chi tiết commit từ **dãn nở dòng nội dòng (In-row DOM Expansion)** sang **Layer hiển thị độc lập phía trên (Overlay / Inspector Panel Layer)** kết hợp với chuẩn đường nối vuông góc bo góc tròn (Orthogonal Rounded Routing).

---

## 2. Chi Tiết Sự Cố 1: Lỗi Biến Dạng Đường Nối & Mất Kết Nối Khi Mở Rộng Dòng Commit (`BUG-EXPAND-01`)

### 2.1. Hiện Tượng Quan Sát Được Thực Tế

Khi người dùng nhấp chọn vào một dòng commit trong bảng danh sách để xem chi tiết thông điệp commit (`CommitDetails`):

1. **Line graph trong vùng mở rộng tự nhiên bị nhạt màu**:
   - Các đường nhánh đi ngang qua vùng panel chi tiết bị giảm độ mờ (opacity) đột ngột, trở nên mờ nhạt so với các đoạn đường phía trên và phía dưới, gây cảm giác đồ thị bị đứt quãng hoặc bị lỗi kết xuất.
2. **Đường nối bị thẳng đuột và mất định hướng nối**:
   - Khi chưa mở rộng hàng, các đường rẽ nhánh (fork) hoặc sáp nhập (merge) hiển thị đường cong.
   - Nhưng khi mở rộng hàng, đoạn đường đi xuyên qua panel chi tiết bị ép thành một đường thẳng đứng thẳng đuột, không còn thể hiện được nhánh này đang chuẩn bị rẽ sang làn nào hoặc xuất phát từ đâu.
3. **Bị hở chân từ dưới đi lên (Dangling Bottom Gap)**:
   - Điểm cuối của đoạn đường thẳng đứng phía trên không khớp với điểm đầu của đoạn đường cong phía dưới.
   - Xuất hiện một khoảng hở chân (khoảng trống đứt gãy giữa hai làn $X_0$ và $X_1$ tại chân panel chi tiết).
   - Khi đóng hàng (collapse), đồ thị lập tức hoàn lại trạng thái bình thường liền mạch.

### 2.2. Phân Tích Căn Nguyên Kỹ Thuật

Qua rà soát mã nguồn tại [CommitGraph.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/CommitGraph.tsx):

```tsx
// src/webview/components/commit/CommitGraph.tsx
function transformPathD(d: string, splitTop: number, height: number): PathSegment[] {
  // ...
  const x0 = p.x0;
  const x1 = p.x1;
  return [
    { d: renderPath(x0, p.y0, x0, splitTop) },
    { d: renderPath(x0, splitTop, x0, splitBottom), faint: true }, // [1] Ép opacity 0.35 làm nhạt màu
    { d: renderPath(x1, splitBottom, x1, p.y1 + height) } // [2] Bắt đầu tại x1, tạo khoảng đứt gãy x0 -> x1!
  ];
}
```

1. **Nguyên nhân làm nhạt màu**: Thuộc tính `faint: true` gắn với cấu hình `opacity={segment.faint ? 0.35 : undefined}` trong thẻ `<g>` của SVG đã làm giảm độ tương phản của nét vẽ xuống còn 35%.
2. **Nguyên nhân hở chân và thẳng đuột**:
   - Hàm `transformPathD` chia đường nối thành 3 đoạn: đoạn trên chạy từ $(x_0, y_0)$ đến $(x_0, splitTop)$, đoạn giữa chạy từ $(x_0, splitTop)$ đến $(x_0, splitBottom)$, và đoạn dưới bắt đầu từ $(x_1, splitBottom)$ đến $(x_1, y_1 + height)$.
   - Nếu đường nối là đường đổi làn (rẽ nhánh hoặc merge giữa hai làn khác nhau: $x_0 \neq x_1$), đoạn giữa kết thúc tại tọa độ ngang $x_0$, trong khi đoạn dưới lại bắt đầu tại tọa độ ngang $x_1$.
   - **Khoảng cách ngang giữa $x_0$ và $x_1$ hoàn toàn không có đường nối nào kết nối lại**, tạo ra một vết đứt gãy hở chân trắng trợn ở đáy panel chi tiết!

---

## 3. Kiến Trúc Tham Chiếu & Định Hướng Đổi Mới Toàn Diện

### 3.1. Hạn Chế Cốt Tử Của Cơ Chế Dãn Nở Nội Dòng (In-row Table Expansion)

Cơ chế chèn một hàng `<tr>` có chiều cao lớn (~250px) vào giữa bảng danh sách commit để hiển thị chi tiết (In-row Expansion) bộc lộ hàng loạt nhược điểm kiến trúc cố hữu:

- **Xung đột mô hình hình học**: Đồ thị commit là một hệ trục tọa độ liên tục tính theo từng hàng cố định (`ROW_HEIGHT = 24px`). Việc dãn nở đột ngột một hàng làm gãy cấu trúc không gian của đồ thị SVG.
- **Rủi ro tính toán lại phức tạp**: Đòi hỏi phải tịnh tiến $Y$, cắt xẻ chuỗi lệnh SVG `path.d`, bù trừ dãn nở vào thuật toán ảo hóa cuộn trang (`Virtual Scrolling`), dễ dẫn tới hiện tượng mất node hoặc lệch pha avatar clip-path.
- **Thẩm mỹ kém**: Đoạn đồ thị kéo dài lê thê qua panel chi tiết gây rối mắt và làm loãng ngữ cảnh lịch sử commit.

### 3.2. Giải Pháp Đột Phá: Chuyển Sang Cơ Chế Layer Hiển Thị Trên (Overlay / Inspector Panel Layer)

Tham khảo trực tiếp kiến trúc của **GitLens** và các công cụ quản lý Git chuyên nghiệp:

- Khi người dùng nhấp chọn một dòng commit:
  - **Giữ nguyên 100% cấu trúc của bảng commit và đồ thị SVG**: Bảng danh sách commit hoàn toàn KHÔNG chèn thêm hàng dãn nở, KHÔNG thay đổi chiều cao của bất kỳ hàng nào.
  - Toàn bộ đồ thị commit giữ nguyên vẹn tọa độ hình học, đường nối liền mạch, không bị đứt nét, không bị cong méo, không bị hở chân.
  - Thông tin chi tiết commit (`CommitDetails`: Commit info, Parents, Author, Committer, Changed Files tree) được kết xuất trên một **Layer hiển thị phía trên (Overlay Inspector Panel)**:
    - **Tùy chọn A (Bottom Sheet / Docked Panel)**: Panel cố định ở nửa dưới khung nhìn với thanh chia kích thước có thể kéo thả (Resize Splitter).
    - **Tùy chọn B (Side Inspector Drawer)**: Panel trượt ra từ cạnh phải của khung nhìn (tương tự giao diện GitLens / GitHub PR Review).
    - **Tùy chọn C (Floating Modal / Popover Inspector)**: Panel nổi có bóng đổ hiện đại hiển thị ngay phía dưới dòng được chọn mà không đẩy các dòng khác xuống.

### 3.3. Quy Chuẩn Đường Nối Vuông Góc Bo Góc Tròn (Orthogonal Rounded Routing)

- Thay vì các đường cong Bezier bậc ba tự do uốn lượn dễ bị biến dạng:
- Áp dụng triệt để phong cách hình học GitLens:
  - Đường chạy dọc trên cùng một làn: Đường thẳng đứng $100\%$.
  - Đường chuyển làn (Fork / Merge): Đi thẳng đứng từ nút con $\rightarrow$ bẻ góc $90^\circ$ có bo tròn bán kính mượt mà (fillet radius $4\text{px} - 6\text{px}$) $\rightarrow$ đi ngang sang làn đích $\rightarrow$ bẻ góc $90^\circ$ bo tròn $\rightarrow$ tiếp tục đi thẳng đứng về nút cha.
  - Loại bỏ hoàn toàn các đường xiên chéo tự do, mang lại diện mạo kỹ thuật sắc sảo, ngăn nắp và chuyên nghiệp.

---

## 4. Chi Tiết Sự Cố 2: Thuật Toán Màu Nhánh Bị Dồn Vào 1 Đến 2 Màu (`BUG-COLOR-01`)

### 4.1. Hiện Tượng Quan Sát Được Thực Tế

- Trên một kho mã nguồn có cấu trúc phức tạp với hàng chục nhánh `feature/*`, `bugfix/*` và nhiều lần sáp nhập:
- Khi hiển thị trên đồ thị, hầu hết tất cả các đường nhánh song song và nút commit chỉ mang **1 đến 2 màu duy nhất** (ví dụ: toàn bộ đồ thị ngập tràn màu xanh lá và màu cam, các màu xanh dương, tím, vàng, đỏ, ngọc lam hoàn toàn không xuất hiện).
- Các nhánh đứng cạnh nhau bị trùng màu, khiến người dùng không thể phân biệt ranh giới giữa các luồng phát triển khác nhau.

### 4.2. Phân Tích Căn Nguyên Kỹ Thuật Trong F# Core

Qua rà soát thuật toán phân làn và gán màu trong [Graph.fs](file:///d:/Kojin/neo-git-graph/src/core-engine/Graph/Graph.fs):

```fsharp
// src/core-engine/Graph/Graph.fs
let colorOfLane (lane: int) = lane % PaletteSize

// Trong Lanes.assign:
let empty = firstEmpty ()
if empty >= 0 then empty
else
    let newLane = active.Count
    active.Add(-1)
    newLane
```

1. **Cơ chế tái sử dụng làn thu gọn trái quá sớm (Aggressive Left-Compact Reuse)**:
   - Thuật toán luôn ưu tiên chọn làn trống có chỉ số nhỏ nhất (`firstEmpty ()`).
   - Khi một nhánh phụ kết thúc, làn 0 hoặc làn 1 ngay lập tức bị bỏ trống và được cấp phát lại ngay cho nhánh kế tiếp.
   - Dẫn tới việc đại đa số các nhánh trong lịch sử chỉ luân phiên chiếm dụng làn 0 và làn 1.
2. **Gán màu phụ thuộc thuần túy vào chỉ số làn (`lane % 8`)**:
   - Vì các nhánh hầu như chỉ nằm ở làn 0 và làn 1, công thức `lane % 8` chỉ sinh ra màu `0` và màu `1`!
   - Sáu màu còn lại trong bảng 8 màu hoàn toàn không có cơ hội được sử dụng.
3. **Thiếu định danh màu theo Nhánh Logic (Branch Color Persistence)**:
   - Màu sắc không được gắn kết với định danh của nhánh (hoặc commit khởi tạo nhánh), mà chỉ gắn tạm bợ với vị trí cột địa lý của làn.

### 4.3. Giải Pháp Thiết Kế Khắc Phục

1. **Phân bổ màu theo Định Danh Nhánh (Branch-based Hashing / Palette Cycling)**:
   - Khi một nhánh mới xuất hiện (một nhánh con tách ra từ nhánh chính), cấp phát một chỉ số màu mới thông qua cơ chế xoay vòng bảng màu (`colorIndex = (lastAssignedColor + 1) % PaletteSize`) hoặc băm mã commit khởi tạo nhánh (`hash % PaletteSize`).
   - Duy trì màu sắc này xuyên suốt toàn bộ chuỗi commit thuộc dòng dõi của nhánh đó, bất kể nhánh đó được xếp vào làn số mấy.
2. **Kiểm tra độ tương phản giữa các làn lân cận**:
   - Khi hai nhánh chạy song song trên hai làn kề nhau (`lane` và `lane + 1`), nếu phát hiện chúng có màu trùng nhau hoặc quá gần tông màu, tiến hành dịch chuyển màu của nhánh phụ sang một màu có độ tương phản tối đa.

> [!NOTE]
> **Đã triển khai (2026-10-04)**: Căn nguyên thực tế không còn là `lane % 8` (code cũ) mà là thuật toán `pickColor` chọn màu "xa nhất so với làn kề" một cách tất định — vì mọi nhánh con đều tách từ nhánh chính (luôn màu 0 ở làn 0) nên chúng đồng loạt nhận cùng một màu xa nhất. Đã thay bằng **xoay vòng bảng màu round-robin** (`colorCursor`) kết hợp bỏ qua màu trùng làn trái/phải trong `Lanes.assignWithColor`. Test hồi quy 57/57 pass.

---

## 5. Bảng Tổng Hợp Vấn Đề & Phương Án Đề Xuất

| Mã Sự Cố          | Mô Tả Hiện Tượng                                                           | Căn Nguyên Kỹ Thuật                                                                                    | Phương Án Khắc Phục Khuyến Nghị                                                                                                      |
| :---------------- | :------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **BUG-EXPAND-01** | Line mờ nhạt (opacity 35%), thẳng đuột và hở chân tại đáy panel khi expand | `faint: true` giảm opacity; `transformPathD` thiếu đoạn chuyển làn giữa $x_0$ và $x_1$ ở `splitBottom` | **Chuyển sang cơ chế Layer hiển thị trên (Overlay Panel)** để không dãn nở đồ thị; hoặc sửa triệt để thuật toán hình học chuyển làn. |
| **BUG-EXPAND-02** | Đường cong Bezier kéo dãn méo mó, đường nối không vuông vức                | Dùng đường cong Bezier bậc 3 tự do cho cả đoạn dài                                                     | **Áp dụng chuẩn GitLens Orthogonal Routing**: Nối bằng đường vuông góc bo tròn bán kính fillet ($4\text{px} - 6\text{px}$).          |
| **BUG-COLOR-01**  | Hàng chục nhánh nhưng chỉ có 1-2 màu lặp đi lặp lại                        | Thuật toán thu gọn làn tái sử dụng làn 0, 1 quá mức; màu tính theo `lane % 8` nên chỉ ra màu 0 và 1    | **Tách độc lập gán màu khỏi chỉ số làn**: Gán màu theo định danh nhánh (xoay vòng bảng màu + chống trùng màu kề cạnh).               |

---

## 6. Kế Hoạch Triển Khai Tiếp Theo

1. **Giai đoạn 1: Sửa dứt điểm thuật toán phân bổ màu trong F# Core (`BUG-COLOR-01`)** — ✅ **Hoàn thành**:
   - Cải tiến `Lanes.assignWithColor` trong `src/core-engine/Graph/Graph.fs` sang cơ chế xoay vòng bảng màu round-robin, đảm bảo khai thác đồng đều toàn bộ 8 màu của bảng màu.
2. **Giai đoạn 2: Tái cấu trúc cơ chế hiển thị chi tiết Commit sang Layer Hiển Thị Trên (Overlay / Inspector Panel)** — ✅ **Hoàn thành**:
   - `CommitDetails` chuyển từ hàng `<tr>` nội dòng thành một panel `position: absolute` nổi phía dưới dòng được chọn (không chèn vào bảng, không đẩy các dòng khác xuống).
   - `CommitGraph` và `CommitTable` loại bỏ hoàn toàn logic biến đổi hình học `transformPathD`/`expandOffset`/bù trừ cuộn ảo; đồ thị SVG giữ nguyên 100% hình học, triệt tiêu lỗi nhạt màu, thẳng đuột và hở chân.
3. **Giai đoạn 3: Chuẩn hóa đường vẽ Orthogonal Rounded Routing** (tùy chọn, chưa triển khai):
   - Nâng cấp bộ sinh đường nối SVG sang phong cách đường vuông góc bo góc tròn hiện đại, tạo nên diện mạo đồ thị chuyên nghiệp hàng đầu.
