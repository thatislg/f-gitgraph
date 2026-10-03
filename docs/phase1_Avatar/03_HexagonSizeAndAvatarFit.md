# 03. Tối ưu kích thước Hexagon Node & Khắc phục khoảng đen Avatar

Tài liệu này mô tả chi tiết giải pháp giải quyết 2 vấn đề hiển thị của Commit Graph Node:

1. **Ảnh Avatar bị nhỏ hơn hình lục giác tạo ra khoảng đen ở các góc.**
2. **Chiều cao của hình lục giác quá nhỏ so với chiều cao dòng (`ROW_HEIGHT`).**

---

## 1. Vấn đề 1: Khắc phục khoảng đen xung quanh Avatar

### 1.1. Phân tích nguyên nhân

- Trước đây, `HexagonNode` sử dụng thẻ `<clipPath>` chứa một hình tròn `<circle cx={cx} cy={cy} r={radius - 1.8} />`.
- Tuy nhiên, khung bao bên ngoài lại là một hình lục giác đều (`<polygon>` với bán kính $r$).
- Sự không đồng nhất hình học giữa hình tròn nội tiếp (với bán kính bị trừ bớt $1.8\text{px}$) và hình lục giác bao ngoài khiến cho 6 góc đỉnh của lục giác bị hở nền editor (màu nền tối/đen của VS Code theme).
- Hậu quả: Avatar trông bị co cụm ở giữa và xuất hiện một vành đen lục giác dày bao quanh.

### 1.2. Giải pháp kỹ thuật

1. **Chuyển `clipPath` từ hình tròn sang chính hình lục giác**:
   ```tsx
   <clipPath id={clipId}>
     <polygon points={hexagonPoints(cx, cy, radius - 0.5, pointy)} />
   </clipPath>
   ```
   - Bán kính cắt $r - 0.5\text{px}$ để ảnh nằm khít sát phía trong đường viền nét vẽ (`strokeWidth = 1.5px` hoặc `2px`).
2. **Mở rộng phạm vi của thẻ `<image>`**:
   - Tọa độ: $x = cx - r$, $y = cy - r$.
   - Kích thước: $\text{width} = 2r$, $\text{height} = 2r$.
   - Áp dụng `preserveAspectRatio="xMidYMid slice"`.
   - Kết quả: Ảnh avatar lấp đầy 100% diện tích bên trong lòng lục giác.
3. **Thứ tự render (Z-index trong SVG)**:
   - Lớp 1: Background mask lục giác (`strokeWidth="2"` màu nền editor) để che các đường line nhánh chạy xuyên qua phía sau.
   - Lớp 2: Ảnh Avatar được cắt theo polygon lục giác (hoặc fallback semantic icon).
   - Lớp 3: Viền lục giác (`<polygon stroke={colour} fill="none" strokeWidth="1.5" />`) nằm **trên cùng** đè nhẹ lên mép ảnh avatar. Điều này tạo ra đường viền màu nhánh sắc nét ôm sát lấy khuôn mặt/avatar của tác giả.

---

## 2. Vấn đề 2: Tăng kích thước Hexagon xấp xỉ chiều cao 1 Line

### 2.1. Phân tích kích thước

- Chiều cao của mỗi hàng commit trong bảng: `ROW_HEIGHT = 24px` (định nghĩa tại `src/webview/constants.ts`).
- Trước đây: `HEXAGON_RADIUS = 7px`.
  - Chiều cao lục giác đỉnh nhọn (pointy-topped): $H = 2 \times r = 14\text{px}$.
  - Tỷ lệ chiều cao so với dòng: $14 / 24 \approx 58\%$ (nhìn khá bé, lọt thỏm trong hàng).
- **Mục tiêu**: Chiều cao hexagon xấp xỉ bằng chiều cao 1 line ($H \approx 24\text{px}$).

### 2.2. Tính toán thông số tối ưu

- Chọn bán kính lục giác: **`HEXAGON_RADIUS = 10.5px`** (hoặc `11px`).
  - Chiều cao đỉnh-tới-đỉnh: $H = 2 \times 10.5 = 21\text{px}$ (chiếm **87.5%** chiều cao dòng $24\text{px}$).
  - Khoảng cách an toàn mép trên và mép dưới: mỗi bên còn $1.5\text{px}$ (tổng khoảng cách giữa 2 đỉnh commit liền kề theo chiều dọc là $3\text{px}$), giúp các node không bị dính sát vào nhau và không đè lên đường kẻ phân cách dòng của bảng.
- Chiều rộng của lục giác pointy-topped:
  $$W = 2 \times r \times \sin(60^\circ) = 2 \times 10.5 \times \frac{\sqrt{3}}{2} \approx 18.2\text{px}$$
- **Đồng bộ khoảng cách các Lane trong Graph**:
  - Khi node to ra ($W \approx 18.2\text{px}$), khoảng cách lane cũ (`LANE_WIDTH = 16px`) sẽ khiến các đường branch chạy dọc kế bên nằm hơi sát mép node.
  - Tăng `LANE_WIDTH` từ `16px` lên **`20px`**.
  - Tăng `LANE_OFFSET` từ `8px` lên **`10px`** (tâm lane 0 tại $x = 10\text{px}$, node mở rộng sang hai bên $9.1\text{px}$ -> mép trái node cách lề $0.9\text{px}$, cực kỳ vừa vặn và cân đối).
  - Tăng kích thước icon fallback `HEXAGON_ICON_SIZE` từ `8.5px` lên **`13px`** để cân đối hoàn hảo với hexagon lớn khi không có avatar.

---

## 3. Tóm tắt các tệp thay đổi

| Tệp tin                                               | Thay đổi chính                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/webview/graph/constants.ts`                      | `HEXAGON_RADIUS = 10.5`, `HEXAGON_ICON_SIZE = 13`, `LANE_WIDTH = 20`, `LANE_OFFSET = 10`                          |
| `src/webview/components/commit/HexagonNode.tsx`       | ClipPath đổi thành lục giác (`polygon`), ảnh avatar phủ trọn vẹn, viền stroke vẽ đè lên trên cùng để viền sắc nét |
| `tests/webview/components/commit/HexagonNode.test.ts` | Cập nhật kiểm tra clipPath lục giác và kích thước                                                                 |
