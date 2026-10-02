# 06. Tinh chỉnh Neon Ambient Gradient & Viền Tím Flameshot cho Selected Commit

Tài liệu này đặc tả thiết kế kỹ thuật cải tiến 2 tính năng hiển thị cho dòng commit được chọn (`selected/active`):
1. **Tinh chỉnh phạm vi và chất màu của Ambient Gradient Highlight**: 
   - Từ mép trái tới sát mép bên phải avatar: giữ hoàn toàn trong suốt (`transparent`).
   - Gradient bắt đầu từ sát mép phải avatar và kết thúc tại mép phải của cột Graph (không lan sang cột Description).
   - Chất màu neon phát sáng lung linh hắt ra từ sau avatar theo chuẩn GitLens.
2. **Khung viền tím Flameshot lung linh (Flameshot Purple Glow Border)**:
   - Bao quanh toàn bộ dòng commit được chọn bằng viền tím đặc trưng của Flameshot (`#a855f7` / `#9d4edd`).
   - Kết hợp hiệu ứng đổ bóng phát sáng neon tỏa viền (`box-shadow` hai chiều outer và inset).

---

## 1. Yêu cầu 1: Tinh chỉnh Neon Ambient Gradient

### 1.1. Phạm vi hiển thị chính xác
- Trước đây: Gradient được đặt trên toàn bộ thẻ `<tr>`, bắt đầu từ $x = 0$ và lan sang các cột Description, Author.
- Yêu cầu mới:
  - **Khu vực lề trái đến mép phải avatar**: Giữ hoàn toàn trong suốt (`transparent 0px ... transparent ${avatarRightX}px`).
  - **Khu vực từ mép phải avatar đến hết cột Graph**: Dải màu neon bắt đầu hắt từ tọa độ $x = \text{avatarRightX}$ và dịu dần tới $100\%$ chiều rộng của cột Graph (`td:first-child`).
  - **Các cột phía sau (Description, Date, Author, SHA)**: Không bị dải gradient phủ lên, giữ độ tương phản văn bản cao nhất.

### 1.2. Công thức tọa độ mép phải Avatar
- Tọa độ tâm avatar: $cx = \text{laneX}(\text{vertex.x}) = \text{vertex.x} \times \text{LANE\_WIDTH} + \text{LANE\_OFFSET}$.
- Với $\text{LANE\_WIDTH} = 20\text{px}$, $\text{LANE\_OFFSET} = 16\text{px}$, bán kính ngang khi scale 1.15 là $10.5\text{px}$:
  $$\text{avatarRightX} = cx + 11\text{px}$$
- Ví dụ:
  - Lane 0: $cx = 16\text{px} \rightarrow \text{avatarRightX} = 27\text{px}$.
  - Lane 1: $cx = 36\text{px} \rightarrow \text{avatarRightX} = 47\text{px}$.

### 1.3. Phối màu ánh sáng Neon (Neon Shimmering Effect)
- Để tạo cảm giác ánh đèn neon phát sáng rực rỡ nhưng vẫn êm mắt:
  - Điểm khởi phát (ngay sau mép avatar): pha trộn màu nhánh với một chút ánh trắng nhẹ (`color-mix(in srgb, ${colour} 45%, #ffffff 15%)`) để tạo lõi phát quang neon (neon core).
  - Vùng tỏa sáng (neon glow falloff): chuyển tiếp sang `color-mix(in srgb, ${colour} 22%, transparent)`, rồi `color-mix(in srgb, ${colour} 6%, transparent)` và kết thúc tại `transparent 100%`.
- Kết hợp trên `HexagonNode`: Khi selected hoặc hovered, node được phủ hiệu ứng hào quang:
  `filter: drop-shadow(0 0 5px ${colour}) drop-shadow(0 0 2px ${colour});`

---

## 2. Yêu cầu 2: Khung viền tím Flameshot lung linh (Flameshot Purple Border)

### 2.1. Mã màu tím Flameshot
- Màu tím thương hiệu đặc trưng của Flameshot: **`#a855f7`** (Purple Neon) kết hợp viền ánh tím đậm **`#9333ea`**.

### 2.2. Kỹ thuật hiển thị viền toàn hàng (Row Outline & Glow)
- Áp dụng trên thẻ `<tr>` của commit được chọn:
  ```css
  outline: 1.5px solid #a855f7;
  outline-offset: -1.5px;
  box-shadow: 
    0 0 10px rgba(168, 85, 247, 0.45),
    inset 0 0 6px rgba(168, 85, 247, 0.2);
  z-index: 10;
  position: relative;
  ```
- **Hiệu ứng thị giác**:
  - Khung viền tím ôm trọn 4 cạnh của dòng commit với độ nét cao.
  - Vầng sáng tím (`box-shadow: 0 0 10px rgba(168, 85, 247, 0.45)`) tỏa nhẹ ra xung quanh dòng commit tạo hiệu ứng "lung linh" huyền ảo như viền chọn công cụ chụp màn hình Flameshot.

---

## 3. Tóm tắt danh sách tệp thay đổi

| Tệp tin | Nội dung thay đổi |
|---|---|
| `src/webview/components/commit/CommitTable.tsx` | Tính toán `avatarRightX` dựa trên `layout.vertices[index]` và truyền vào `CommitRow` |
| `src/webview/components/commit/CommitRow.tsx` | Áp dụng viền tím Flameshot neon glow cho `<tr>` và dải neon gradient hắt từ `avatarRightX` trên cột Graph `<td>` |
| `src/webview/components/commit/HexagonNode.tsx` | Thêm `filter: drop-shadow` neon glow cùng màu nhánh khi selected/hovered |
| `tests/webview/components/commit/CommitRow.test.ts` | Cập nhật kiểm tra viền tím Flameshot và gradient cột graph |
