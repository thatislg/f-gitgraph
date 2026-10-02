# 08. Rich Commit Hover Panel & Avatar Deep Zoom Preview

Tài liệu này đặc tả thiết kế kỹ thuật cho 2 tính năng nâng cao trải nghiệm người dùng (UX) khi tương tác chuột (hover dwell):
1. **Rich Commit Hover Panel**: Hiển thị bảng nổi (floating popover) chứa toàn bộ commit message và thông tin chi tiết với màu nền chìm theo hệ thống khi giữ chuột tại dòng commit.
2. **Avatar Deep Zoom Preview**: Phóng to avatar lên gấp đôi (~2.2x, đạt đường kính ~44px kích thước thật) kèm nhãn tên tác giả và hiệu ứng neon lung linh khi giữ chuột tại chính icon avatar.

---

## 1. Tính năng 1: Rich Commit Hover Panel

### 1.1. Mục tiêu & Vấn đề giải quyết
- **Hiện trạng**: Mặc định trình duyệt hiển thị tooltip nhỏ màu trắng/xám đơn giản (`title={message}`). Để đọc toàn bộ commit message dài, người dùng buộc phải click chuột mở giao diện `CommitDetails` chiếm không gian bảng và đẩy các dòng bên dưới xuống.
- **Giải pháp**: Lấy cảm hứng từ GitLens Commit Hover Card:
  - Khi giữ chuột tại một dòng commit khoảng **550ms - 600ms**, xuất hiện một floating panel nổi phía trên/dưới dòng commit.
  - Tự động đóng khi chuột rời đi, nhưng nếu chuột di chuyển vào chính panel (để copy văn bản, click email) thì panel vẫn giữ mở.

### 1.2. Thiết kế Giao diện (UI/UX)
- **Màu nền**: Chìm xuống theo màu hệ thống (`bg-menu`, `text-menu-fg`, `border border-line`, `shadow-2xl`, `rounded-md`).
- **Nội dung hiển thị**:
  1. **Header**:
     - Avatar tác giả + Tên tác giả & Email.
     - Thời gian commit: Thời gian tương đối + Thời gian chi tiết (`getFullDate(date)`).
     - Commit SHA viết tắt (`abbrevCommit(hash)`).
     - Badges của các branch và tag liên quan.
  2. **Đường phân cách (Divider)**.
  3. **Message Body**:
     - Tiêu đề in đậm.
     - Toàn bộ nội dung message đầy đủ, giữ nguyên định dạng xuống dòng (`whitespace-pre-wrap font-sans text-xs/relaxed`), hỗ trợ cuộn nếu nội dung quá dài (`max-h-64 overflow-y-auto`).

### 1.3. Tính toán vị trí hiển thị (Positioning)
- Vị trí nổi tuyệt đối (`fixed z-50 pointer-events-auto`).
- Tọa độ $Y$: Nếu dòng commit nằm ở nửa trên màn hình $\rightarrow$ hiển thị bên dưới dòng commit ($y = \text{rowBottom} + 4\text{px}$). Nếu ở nửa dưới màn hình $\rightarrow$ hiển thị bên trên dòng commit ($y = \text{rowTop} - \text{panelHeight} - 4\text{px}$).
- Tọa độ $X$: Căn thẳng theo mép cột Description để người dùng dễ đọc nhất.

---

## 2. Tính năng 2: Avatar Deep Zoom Preview

### 2.1. Mục tiêu & Cơ chế tương tác
- Khi rê chuột nhanh qua dòng: icon chỉ phóng to nhẹ $1.15\times$ như hiện tại.
- Khi **giữ chuột (hover dwell $\ge 600\text{ms}$) tại chính icon avatar**:
  - Không chỉ zoom nhỏ mà kích hoạt chế độ **Deep Zoom (Avatar Preview)**:
    - Tỷ lệ zoom: **`scale(2.2)`** (từ $20\text{px}$ nở lên $\approx 44\text{px}$ kích thước thật của ảnh).
    - Hiệu ứng neon glow được tăng cường:
      `filter: drop-shadow(0 0 10px ${colour}) drop-shadow(0 0 4px #ffffff)`
    - Xuất hiện **Nhãn tên tác giả (Author Badge)** bo góc nổi ngay bên dưới avatar phóng to.
  - Khi rời chuột (`mouseLeave`): tự động thu nhỏ về trạng thái bình thường mượt mà với `transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)`.

### 2.2. Chi tiết kỹ thuật trên SVG HexagonNode
- Quản lý state `isDeepZoom` qua `useState` và `useRef` timer $600\text{ms}$.
- Khi `isDeepZoom === true`:
  - `transform: scale(2.2)`.
  - Render thêm thẻ `<g class="avatar-author-badge">`:
    - Thẻ `<rect>` nền `fill-editor` viền `${colour}`, đổ bóng `drop-shadow(0 2px 6px rgba(0,0,0,0.5))`.
    - Thẻ `<text>` hiển thị tên tác giả chữ nhỏ, rõ nét, căn giữa.

---

## 3. Tóm tắt danh sách tệp thay đổi

| Tệp tin | Nội dung thay đổi |
|---|---|
| `src/webview/components/commit/CommitHoverPanel.tsx` | Component mới: Popover hiển thị toàn bộ message commit và metadata chi tiết |
| `src/webview/components/commit/CommitRow.tsx` | Loại bỏ `title` mặc định, thêm callback truyền vị trí chuột khi hover dwell |
| `src/webview/components/commit/CommitTable.tsx` | Quản lý state timer và render `CommitHoverPanel` dạng floating popover |
| `src/webview/components/commit/HexagonNode.tsx` | Thêm timer deep zoom $600\text{ms}$, `scale(2.2)` và Author Badge nổi bên dưới |
| `tests/webview/components/commit/HexagonNode.test.ts` | Cập nhật kiểm tra deep zoom timer và author badge |
