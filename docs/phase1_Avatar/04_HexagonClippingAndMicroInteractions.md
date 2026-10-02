# 04. Chuẩn hóa SVG Clipping Lục giác & Micro-interaction Hover Scale

Tài liệu này đặc tả chi tiết giải pháp cho 2 yêu cầu:
1. **Khắc phục triệt để lỗi ảnh Avatar tràn ra ngoài hình lục giác (ẩn phần thừa bằng chuẩn SVG Clip-Path).**
2. **Triển khai hiệu ứng micro-interaction phóng to (hover / selected scale 1.15) mượt mà cho icon commit trong Git History.**

---

## 1. Yêu cầu 1: Ẩn phần thừa của Avatar bằng SVG Clipping chuẩn

### 1.1. Phân tích nguyên nhân ảnh bị tràn ra ngoài lục giác
- Trong React/Preact JSX, khi viết `clipPath="url(#id)"`, Preact sẽ render thuộc tính dưới dạng `clipPath` (camelCase) thay vì `clip-path` (kebab-case) theo chuẩn SVG Presentation Attribute.
- Trình duyệt Chromium (nhân của VS Code Webview) chỉ diễn giải thuộc tính `clip-path` hoặc CSS style property `clip-path: url(#id)`. Khi chỉ có `clipPath`, trình duyệt bỏ qua việc cắt clip, khiến ảnh `<image>` hiển thị đầy đủ hình chữ nhật/vuông, 4 góc vuông của ảnh tràn ra ngoài 6 cạnh của lục giác.
- Ngoài ra, định danh `clipId` nếu chứa ký tự đặc biệt (như `*` của uncommitted changes) sẽ khiến bộ chọn `url(#...)` bị vô hiệu hóa.

### 1.2. Giải pháp kỹ thuật
1. **Sanitize `clipId`**:
   - Sử dụng định danh an toàn: `hex-avatar-${String(id ?? `${cx}-${cy}`).replace(/[^a-zA-Z0-9_-]/g, "_")}`.
2. **Khai báo kép cả thuộc tính `clip-path` và CSS inline `style.clipPath`**:
   ```tsx
   <defs>
     <clipPath id={clipId}>
       <polygon points={hexagonPoints(cx, cy, radius - 0.5, pointy)} />
     </clipPath>
   </defs>
   <image
     href={avatarUrl}
     x={cx - radius}
     y={cy - radius}
     width={radius * 2}
     height={radius * 2}
     clip-path={`url(#${clipId})`}
     style={{ clipPath: `url(#${clipId})` }}
     preserveAspectRatio="xMidYMid slice"
   />
   ```
3. **Cấu trúc Layer chuẩn**:
   - **Layer dưới (Mask & Fill)**: `polygon` mask che branch line phía sau + nền `fill-editor`.
   - **Layer giữa (Nội dung Avatar)**: `<image>` được cắt chính xác theo polygon lục giác, 100% phần thừa bên ngoài bị ẩn đi.
   - **Layer trên cùng (Border Stroke)**: `polygon` với `fill="none"` và `stroke={colour}` bao quanh ôm sát mép avatar, tạo viền sắc nét.

---

## 2. Yêu cầu 2: Hiệu ứng Micro-interaction Hover / Selected Scale

### 2.1. Yêu cầu thiết kế
- Khi người dùng rê chuột (hover) hoặc chọn (selected) vào dòng commit trong danh sách Git History, icon tương ứng sẽ:
  - Phóng to nhẹ 15% (`scale(1.15)`).
  - Chuyển động mượt mà: `transition: transform 0.15s ease-out`.
  - Tâm phóng to giữ nguyên ở chính giữa icon: `transform-origin: center` (tọa độ `${cx}px ${cy}px`).

### 2.2. Cơ chế truyền trạng thái (Hover & Selection State Binding)
1. **State tại `CommitTable`**:
   - Sử dụng signal `hoveredRow = useSignal<number | null>(null)` để theo dõi hàng đang được hover.
   - Sử dụng `expandedRow` để theo dõi hàng đang được chọn (selected).
2. **Sự kiện trên `CommitRow`**:
   - Bắt sự kiện `onMouseEnter` / `onMouseLeave` trên thẻ `<tr>` của từng commit row để cập nhật `hoveredRow.value`.
3. **Truyền xuống `CommitGraph` & `HexagonNode`**:
   - `CommitGraph` nhận `hoveredRow` và `selectedRow`.
   - Đối với mỗi vertex: `isHovered = hoveredRow === vertex.y`, `isSelected = selectedRow === vertex.y`.
   - `HexagonNode` nhận `isHovered` và `isSelected`.
4. **Style Animation trên `HexagonNode`**:
   ```tsx
   const isScaled = isHovered || isSelected;
   <g
     class="graph-node-hexagon transition-transform duration-150 ease-out"
     style={{
       transformOrigin: `${cx}px ${cy}px`,
       transform: isScaled ? "scale(1.15)" : "scale(1)"
     }}
   >
   ```
   - Đồng thời kích hoạt `pointer-events-auto` trên chính node lục giác để hover trực tiếp trên canvas graph cũng kích hoạt scale.

---

## 3. Danh sách tệp triển khai
- `src/webview/components/commit/HexagonNode.tsx`: Thêm `clip-path` chuẩn, props `isHovered`, `isSelected`, áp dụng animation transform scale.
- `src/webview/components/commit/CommitGraph.tsx`: Nhận và truyền `hoveredRow`, `selectedRow` xuống từng `HexagonNode`.
- `src/webview/components/commit/CommitTable.tsx`: Theo dõi `hoveredRow` signal và truyền xuống `CommitGraph`.
- `src/webview/components/commit/CommitRow.tsx`: Kích hoạt callback `onHover(true/false)`.
- `tests/webview/components/commit/HexagonNode.test.ts`: Bộ kiểm thử kiểm tra clip-path và scale transform.
