# 05. Ambient Gradient Highlight & Tối ưu Khoảng đệm Graph Node

Tài liệu này đặc tả thiết kế kỹ thuật cho 2 cải tiến giao diện Commit Graph:
1. **Hiệu ứng Ambient Gradient Highlight theo chiều ngang khi chọn (selected/active) một dòng commit.**
2. **Tối ưu khoảng đệm lề trái và phải của cột Graph để bảo vệ node lục giác khi scale(1.15).**

---

## 1. Hiệu ứng Ambient Gradient Highlight cho Selected Commit Row

### 1.1. Mục tiêu thiết kế
- Khi người dùng click chọn một dòng commit (`expanded === true`), toàn bộ hàng commit cần nhận diện trực quan rõ rệt nhưng vẫn giữ được độ tinh tế (premium & modern look).
- Thay vì chỉ dùng màu nền xám/xanh phẳng đơn điệu (`bg-row-selected`), ta áp dụng thêm lớp ánh sáng tỏa **Ambient Gradient Highlight** theo chiều ngang:
  - Xuất phát từ mép trái (khu vực icon commit node).
  - Sử dụng chính màu của nhánh Git chứa commit đó (`--color-graph` / `colour`).
  - Độ mờ khởi điểm dịu nhẹ: **khoảng 18% - 20% opacity** tại khu vực icon.
  - Lan tỏa và mờ dần về trong suốt (`transparent`) khi đọc văn bản sang phía bên phải.

### 1.2. Giải pháp kỹ thuật CSS / Preact
- Sử dụng hàm `color-mix(in srgb, ...)` chuẩn CSS hiện đại (hỗ trợ 100% trong VS Code Chromium):
  ```css
  background-image: linear-gradient(
    to right,
    color-mix(in srgb, var(--color-graph, #0085d9) 18%, transparent) 0%,
    color-mix(in srgb, var(--color-graph, #0085d9) 10%, transparent) 160px,
    color-mix(in srgb, var(--color-graph, #0085d9) 3%, transparent) 360px,
    transparent 600px
  );
  ```
- **Ưu điểm**:
  - Áp dụng qua `backgroundImage` nên lớp nền theme gốc (`bg-row-selected` của VS Code) vẫn làm nền tảng, không phá vỡ độ tương phản chữ trong cả Dark theme và Light theme.
  - Gradient chuyển màu mượt mà, tạo cảm giác node icon đang "phát sáng" hắt ánh sáng sang các cột bên cạnh.

---

## 2. Tối ưu Khoảng đệm Cột Graph (Tránh bị cắt mép khi Hover/Select Scale)

### 2.1. Phân tích nguyên nhân bị cắt mép
- Hiện tại:
  - Bán kính lục giác: $r = 10.5\text{px}$.
  - Bán kính phương ngang: $dx = 10.5 \times \frac{\sqrt{3}}{2} \approx 9.09\text{px}$.
  - Khi hover hoặc selected, hiệu ứng micro-interaction kích hoạt `scale(1.15)` khiến bán kính phương ngang tăng lên:
    $$dx_{\text{scale}} \approx 9.09 \times 1.15 \approx 10.46\text{px}$$
- **Vấn đề lề trái**:
  - Tâm lane 0 trước đây đặt tại `LANE_OFFSET = 10px`.
  - Mép trái của hexagon khi scale: $10 - 10.46 = -0.46\text{px}$ (vượt quá tọa độ 0 sang bên trái).
  - Kết quả: Khi rê chuột hoặc chọn, mép trái của lục giác chạm sát hoặc bị cắt mất một phần bởi container lề trái.
- **Vấn đề lề phải**:
  - Chiều rộng của Graph SVG trước đây tính bằng: `graphWidth = layout.lanes * LANE_WIDTH`.
  - Với 1 lane, $width = 20\text{px}$, tâm lane 0 tại $x = 10\text{px}$.
  - Khi scale 1.15, mép phải đạt $10 + 10.46 = 20.46\text{px} > 20\text{px}$, vượt ra ngoài chiều rộng SVG.
  - Kết quả: Mép phải của node ở lane cuối cùng cũng bị cắt lẹm.

### 2.2. Giải pháp kỹ thuật

1. **Tăng khoảng đệm lề trái (`LANE_OFFSET`)**:
   - Tăng `LANE_OFFSET` từ `10px` lên **`16px`** (trong `src/webview/graph/constants.ts`).
   - Tọa độ tâm lane 0: $x = 16\text{px}$.
   - Khi scale 1.15: Mép trái nằm tại $16 - 10.46 = 5.54\text{px} > 0$.
   - Luôn duy trì khoảng trống an toàn ít nhất **$5.5\text{px}$** ở lề trái, tuyệt đối không bị dính hay lẹm mép.

2. **Cân đối khoảng đệm lề phải (`graphWidth`)**:
   - Trong `src/webview/graph/utils.ts`, cập nhật công thức chiều rộng SVG để bổ sung khoảng đệm đối xứng ở cả hai bên:
     $$\text{graphWidth} = \max(0, \text{layout.lanes} - 1) \times \text{LANE\_WIDTH} + 2 \times \text{LANE\_OFFSET}$$
   - Tâm lane cuối cùng ($N-1$) nằm tại: $(N - 1) \times \text{LANE\_WIDTH} + \text{LANE\_OFFSET}$.
   - Khoảng cách từ tâm lane cuối cùng tới mép phải đồ thị luôn đúng bằng $\text{LANE\_OFFSET} = 16\text{px}$.
   - Khi scale 1.15: Mép phải vẫn còn dư $16 - 10.46 = 5.54\text{px}$ khoảng trống an toàn.
   - Thêm thuộc tính `overflow-visible` trên thẻ `<svg>` trong `CommitGraph.tsx` để bảo đảm render không bị clip.

3. **Khoảng cách đệm giữa cột Graph và các cột dữ liệu**:
   - Tăng `GRAPH_PADDING` từ `16px` lên **`20px`** để ngăn cách rõ ràng, tạo cảm giác thoáng đãng và thanh lịch.

---

## 3. Tóm tắt danh sách tệp thay đổi

| Tệp tin | Thay đổi chính |
|---|---|
| `src/webview/graph/constants.ts` | Tăng `LANE_OFFSET = 16`, `GRAPH_PADDING = 20` |
| `src/webview/graph/utils.ts` | Cập nhật `graphWidth(layout)` tính đủ khoảng đệm `2 * LANE_OFFSET` |
| `src/webview/components/commit/CommitRow.tsx` | Thêm `linear-gradient` Ambient Highlight màu nhánh với độ mờ 18% khi `expanded === true` |
| `src/webview/components/commit/CommitGraph.tsx` | Thêm `overflow-visible` cho SVG để bảo vệ mép node |
