# 11. Hover Neon Ambient Highlight trên Cột Graph

## 1. Bối cảnh & Yêu cầu

Trong phiên bản trước (Tài liệu 06), hiệu ứng **Neon Ambient Highlight** (dải sáng neon lung linh xuất phát từ mép phải avatar kéo sang hết cột graph) chỉ xuất hiện khi dòng commit được bấm chọn (`selected / expanded`).

Đối với các dòng chưa được chọn, khi người dùng rê chuột qua (`mouse move over`), dòng chỉ có hiệu ứng sáng nền nhẹ mặc định (`hover:bg-table-hover`), thiếu đi độ sinh động và cảm giác neon đặc trưng.

**Yêu cầu mới**:

- Bổ sung hiệu ứng **Neon Ambient Highlight** khi **rê chuột (`mouse move over`)** qua bất kỳ dòng commit nào (kể cả dòng chưa được chọn).
- Giữ nguyên các đặc tính hình học đã thiết lập:
  - Vùng bên trái avatar tới mép phải avatar: hoàn toàn trong suốt (`transparent`).
  - Dải sáng neon xuất phát từ sát mép phải avatar (`avatarRightX`) kéo sang mép phải cột graph.
  - Phối màu neon lung linh hắt ra theo màu nhánh của commit tương ứng (`color-mix`).
  - Khi rời chuột khỏi dòng, hiệu ứng chuyển đổi mượt mà (`transition: background 0.15s ease-out`).
- **Phân biệt giữa Hover và Selected**:
  - Khi dòng được **click chọn (`selected`)**: Hiển thị Neon Ambient với cường độ cao nhất (`45%` lõi neon + `15%` ánh trắng) kết hợp khung viền tím Flameshot (`#a855f7`).
  - Khi dòng được **rê chuột qua (`hover`)**: Hiển thị Neon Ambient với sắc độ êm dịu, tinh tế (`35%` màu nhánh + `10%` ánh trắng) hòa cùng nền hover của dòng.

---

## 2. Thiết kế chi tiết (Technical Implementation)

### 2.1. Quản lý trạng thái Hover tại dòng commit

Trong component `CommitRow.tsx`:

- Quản lý trạng thái hover cục bộ: `const [isRowHovered, setIsRowHovered] = useState(false);`.
- Khi `handleMouseEnter`: cập nhật `setIsRowHovered(true)` và gọi callback `onHover?.(true)`.
- Khi `handleMouseLeave`: cập nhật `setIsRowHovered(false)` và gọi callback `onHover?.(false)`.

### 2.2. Công thức phối màu dải sáng Neon theo trạng thái

- **Trường hợp 1: Dòng được click chọn (`expanded = true`)**:

  ```css
  background: linear-gradient(
    to right,
    transparent 0px,
    transparent ${avatarRightX}px,
    color-mix(in srgb, ${branchColourVal} 45%, #ffffff 15%) ${avatarRightX}px,
    color-mix(in srgb, ${branchColourVal} 22%, transparent) ${avatarRightX + 25}px,
    color-mix(in srgb, ${branchColourVal} 6%, transparent) ${avatarRightX + 60}px,
    transparent 100%
  );
  ```

- **Trường hợp 2: Dòng được rê chuột (`isRowHovered = true`, `expanded = false`)**:

  ```css
  background: linear-gradient(
    to right,
    transparent 0px,
    transparent ${avatarRightX}px,
    color-mix(in srgb, ${branchColourVal} 35%, #ffffff 10%) ${avatarRightX}px,
    color-mix(in srgb, ${branchColourVal} 18%, transparent) ${avatarRightX + 25}px,
    color-mix(in srgb, ${branchColourVal} 5%, transparent) ${avatarRightX + 60}px,
    transparent 100%
  );
  ```

- **Transition mượt mà**:
  Thêm `transition: background 0.15s ease-out` vào ô `<td>` của cột graph để khi di chuyển chuột qua các dòng liên tiếp, dải sáng neon chuyển động êm dịu, không giật cục.

---

## 3. Danh sách tệp tin thay đổi

1. `src/webview/components/commit/CommitRow.tsx`: Tích hợp trạng thái `isRowHovered`, áp dụng gradient neon ambient cho cả hover và selected.
2. `tests/webview/components/commit/CommitRow.test.ts`: Bổ sung kiểm thử unit test cho hiệu ứng neon khi hover.
3. `docs/README.md`: Cập nhật mục lục tài liệu.
