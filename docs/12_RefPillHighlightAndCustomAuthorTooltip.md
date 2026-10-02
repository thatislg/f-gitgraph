# 12. Highlight Màu cho Tag/Release Pill & Custom Author Tooltip

## 1. Bối cảnh & Yêu cầu cải tiến

Người dùng đã phát hiện hai vấn đề trải nghiệm liên quan đến tooltip mặc định và tương tác hover:

1. **Vấn đề 1: Tooltip mặc định nền trắng tại Tag / Release / Branch và thiếu màu highlight**:
   - Khi rê chuột vào commit có nhãn tag / release / branch, ngoài panel commit message GitLens nền chìm, trình duyệt vẫn hiển thị tooltip mặc định chữ đen trên nền trắng (`title={gitRef.name}`).
   - Cần **xóa bỏ hoàn toàn tooltip mặc định nền trắng** này.
   - Đồng thời, các huy hiệu Tag / Release / Branch hiện tại có màu xám đơn điệu. Cần **đánh màu highlight nổi bật** (lấy cảm hứng từ hệ thống Ref Pills của GitLens):
     - **Tag / Release (`type === "tag"`)**: Tông vàng hổ phách (Golden Amber) đặc trưng cho phiên bản phát hành (`bg-amber-500/15`, `border-amber-500/40`, chữ `text-amber-300`).
     - **Remote Branch (`type === "remote"`)**: Tông xanh lam (Sky Blue) đặc trưng cho nhánh từ xa (`bg-sky-500/15`, `border-sky-500/35`, chữ `text-sky-300`).
     - **Checked-out Branch (`active = true`)**: Tông neon theo màu nhánh đồ thị (`border-graph`, `bg-graph/15`, chữ đậm `text-graph-fg`).

2. **Vấn đề 2: Tooltip mặc định nền trắng tại Avatar Icon và mất hiệu ứng Zoom khi rê chuột vào Cột Graph**:
   - Khi rê chuột vào icon avatar, phần tử SVG `<title>{author}</title>` kích hoạt tooltip mặc định màu trắng của trình duyệt. Cần loại bỏ `<title>` và thay bằng **Author Badge tùy chỉnh** đã thiết kế (nền kính tối mờ `rgba(15, 23, 42, 0.95)`, viền neon 1px màu nhánh, chữ nhỏ `8.5px font-semibold text-menu-fg` bám sát chân lục giác).
   - Khi rê chuột trực tiếp vào khu vực cột graph hoặc avatar, hiệu ứng Micro Hover Zoom (1.15x) bị mất do ô `<td>` của cột graph trước đây có `pointer-events-none`, khiến trình duyệt kích hoạt sự kiện `mouseleave` của dòng commit.
   - Cần đảm bảo khi di chuyển chuột qua bất kỳ vị trí nào trong cột graph hoặc avatar, dòng commit vẫn giữ trọn vẹn trạng thái hover: **Avatar duy trì phóng to 1.15x** và **dải sáng Neon Ambient vẫn phát sáng liên tục**.

---

## 2. Thiết kế chi tiết (Technical Design)

### 2.1. Phối màu Ref Pills theo chuẩn GitLens trong `RefLabel.tsx`
Loại bỏ thuộc tính `title={gitRef.name}`. Phân loại màu sắc theo `gitRef.type` và `active`:

| Loại Ref | Kiểu hiển thị | Màu nền (Background) | Màu viền (Border) | Màu chữ & Icon | Hiệu ứng Hover |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tag / Release** (`tag`) | Huy hiệu phiên bản phát hành | `bg-amber-500/15` | `border-amber-500/40` | `text-amber-300 dark:text-amber-200` | `hover:bg-amber-500/25 hover:border-amber-400 hover:shadow-[0_0_8px_rgba(245,158,11,0.35)]` |
| **Remote Branch** (`remote`) | Huy hiệu nhánh từ xa | `bg-sky-500/15` | `border-sky-500/35` | `text-sky-300 dark:text-sky-200` | `hover:bg-sky-500/25 hover:border-sky-400 hover:shadow-[0_0_8px_rgba(14,165,233,0.35)]` |
| **Active Branch** (`head`, active) | Nhánh đang checkout | `bg-graph/15` | `border-graph` | `font-bold text-graph-fg` | `hover:bg-graph/25 hover:shadow-[0_0_8px_var(--color-graph)]` |
| **Other Branch** (`head`, inactive) | Nhánh local khác | `bg-editor-fg/10` | `border-editor-fg/20` | `text-editor-fg/90` | `hover:bg-editor-fg/20 hover:border-editor-fg/40` |

### 2.2. Custom Author Badge trên Avatar khi Hover
- Loại bỏ hoàn toàn `{author && <title>{author}</title>}` trong `HexagonNode.tsx` cũng như các thuộc tính `title` trong `CommitRow.tsx` và `CommitHoverPanel.tsx`.
- Khi người dùng rê chuột vào avatar trong cột graph:
  - `CommitRow.tsx` phát hiện con trỏ nằm trong phạm vi avatar ($\pm 14\text{px}$ quanh `avatarCx`) và phát sự kiện `onAvatarHover`.
  - `CommitTable.tsx` hiển thị **Author Badge nổi** (floating top-layer):
    - Tọa độ: căn giữa theo trục X của avatar, hiển thị ngay dưới avatar (`y = rect.bottom + 2px`).
    - Nền kính mờ Slate-900: `rgba(15, 23, 42, 0.95)` với `backdrop-filter: blur(6px)`.
    - Viền mỏng neon theo màu nhánh: `border: 1px solid ${colour}` kết hợp `boxShadow: 0 0 8px ${colour}50`.
    - Chữ: font sans `text-[8.5px] font-semibold text-menu-fg leading-none whitespace-nowrap`.
    - Không chặn chuột: `pointer-events-none select-none`, biến mất mượt mà khi chuột rời khỏi avatar.

### 2.3. Khắc phục mất hiệu ứng Zoom trên Cột Graph
- Trong `CommitRow.tsx`:
  - Bỏ `pointer-events-none` khỏi `<td class={CELL_CLASS}>` của cột graph.
  - Cột graph trở thành một phần tự nhiên của dòng `<tr>`. Khi con trỏ chuột di chuyển vào bất kỳ điểm nào của cột graph (kể cả ngay trên avatar), `<tr>` vẫn đang `:hover`, giữ nguyên:
    - `isRowHovered = true`
    - `hoveredRow.value = index`
    - `HexagonNode` duy trì Micro Hover Zoom `scale(1.15)`
    - Dải sáng Neon Ambient duy trì liên tục, không bị gián đoạn hay chập chờn.
  - Click trên cột graph:
    - Nếu click nằm trong phạm vi avatar ($\le 14\text{px}$ từ tâm avatar), kích hoạt sự kiện `onAvatarClick` để mở 5x Click Deep Zoom.
    - Nếu click vào khoảng trống khác trong cột graph, chọn/mở rộng dòng commit (`onSelect`).
  - Loại bỏ toàn bộ các thuộc tính `title` trên các ô `<td>` ngày tháng, tác giả và SHA để dẹp bỏ 100% tooltip trắng mặc định.

---

## 3. Danh sách tệp tin thay đổi
1. `src/webview/components/commit/RefLabel.tsx`: Bỏ `title`, thêm highlight màu sắc cho Tag, Prerelease, Remote, Head.
2. `src/webview/components/commit/HexagonNode.tsx`: Bỏ SVG `<title>`, đảm bảo scale mượt mà.
3. `src/webview/components/commit/CommitRow.tsx`: Giữ hover cho cột graph, phát hiện hover & click avatar, bỏ `title`.
4. `src/webview/components/commit/CommitTable.tsx`: Kết nối `onAvatarClick`, hiển thị floating custom Author Badge.
5. `src/webview/components/commit/CommitHoverPanel.tsx`: Bỏ `title` trên email và ngày giờ.
6. `tests/webview/components/commit/CommitRow.test.ts`: Cập nhật kiểm thử data-ref-name.
7. `tests/webview/components/commit/HexagonNode.test.ts`: Cập nhật kiểm thử loại bỏ native `<title>`.
8. `docs/README.md`: Cập nhật mục lục tài liệu.
