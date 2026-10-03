# 07. Tối ưu Kích thước Hexagon Mặc định & Zoom Khít Chiều cao Dòng

Tài liệu này đặc tả thiết kế kỹ thuật tinh chỉnh kích thước của Commit Graph Node:

1. **Kích thước mặc định nhỏ hơn chiều cao dòng một chút (tạo khoảng hở thanh thoát).**
2. **Kích thước khi zoom (hover / selected) vừa bằng chiều cao của một dòng (`ROW_HEIGHT = 24px`), không bị vượt ra ngoài dòng.**

---

## 1. Phân tích Hình học & Tỷ lệ Zoom

### 1.1. Hiện trạng trước điều chỉnh

- Chiều cao dòng: $\text{ROW\_HEIGHT} = 24\text{px}$.
- Trước đây: `HEXAGON_RADIUS = 10.5px`.
  - Chiều cao mặc định: $H = 2 \times 10.5 = 21\text{px}$.
  - Khi zoom với `scale(1.15)`:
    $$H_{\text{zoom}} = 21 \times 1.15 = 24.15\text{px} > 24\text{px}$$
  - Hậu quả: Khi rê chuột (mouse over) hoặc chọn (select), đỉnh trên và đỉnh dưới của lục giác nở ra vượt quá chiều cao $24\text{px}$ của hàng, chạm/lấn sang đường phân cách giữa hai hàng commit.

### 1.2. Tính toán kích thước tối ưu

- **Mục tiêu**:
  - Trạng thái nghỉ (mặc định): nhỏ hơn chiều cao dòng $24\text{px}$ một khoảng vừa đủ để tạo độ thoáng.
  - Trạng thái zoom (hover / selected): nở to lên vừa bằng chiều cao $23\text{px} \sim 24\text{px}$ của dòng.

- **Thông số mới được lựa chọn**:
  - **Bán kính lục giác mặc định**: **`HEXAGON_RADIUS = 10px`** (hoặc $H = 20\text{px}$).
    - Tỷ lệ so với dòng: $20 / 24 \approx 83.3\%$.
    - Khoảng cách an toàn trên và dưới: $2\text{px}$ ở mép trên và $2\text{px}$ ở mép dưới.
  - **Tỷ lệ phóng to khi hover/selected**: **`scale(1.15)`**.
    - Chiều cao khi zoom:
      $$H_{\text{zoom}} = 20\text{px} \times 1.15 = 23\text{px} \approx 24\text{px}$$
    - Chừa đúng $0.5\text{px}$ ở đỉnh trên và $0.5\text{px}$ ở đỉnh dưới, ôm khít bên trong dòng commit mà không bị tràn ra ngoài hay đè lên viền phân cách dòng.
  - **Bán kính phương ngang**:
    - Mặc định: $dx = 10 \times \frac{\sqrt{3}}{2} \approx 8.66\text{px}$.
    - Khi zoom: $dx_{\text{zoom}} = 8.66 \times 1.15 \approx 9.96\text{px} \approx 10\text{px}$.
  - **Mép phải của avatar (`avatarRightX`)**:
    - $\text{avatarRightX} = \text{laneX}(\text{vertex.x}) + 10\text{px}$ (với lane 0: $16 + 10 = 26\text{px}$).
  - **Kích thước icon fallback**: **`HEXAGON_ICON_SIZE = 12px`**.

---

## 2. Tóm tắt danh sách tệp thay đổi

| Tệp tin                                               | Nội dung thay đổi                                        |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `src/webview/graph/constants.ts`                      | Cập nhật `HEXAGON_RADIUS = 10`, `HEXAGON_ICON_SIZE = 12` |
| `src/webview/components/commit/CommitTable.tsx`       | Cập nhật `avatarRightX = laneX(vertex.x) + 10`           |
| `tests/webview/components/commit/HexagonNode.test.ts` | Cập nhật assertions nếu có liên quan đến radius          |
| `tests/webview/components/commit/CommitRow.test.ts`   | Cập nhật assertion `avatarRightX: 26`                    |
