# 13. Tinh chỉnh Tương tác Hover Cột Graph & Vùng Kích hoạt Commit Message Panel

## 1. Bối cảnh & Yêu cầu từ Người dùng

Qua quá trình kiểm tra thực tế, người dùng đưa ra 2 phản hồi tinh chỉnh cụ thể:

1. **Không hiện tên tác giả khi mouse over trong cột graph**:
   - Khi di chuột qua các node trong cột graph, do khoảng cách các commit liên tiếp khá gần nhau, nhãn tên tác giả nếu hiện liên tục trên hover sẽ gây rối mắt, che khuất và khó theo dõi cấu trúc nhánh.
   - Do đó: **Trong vùng cột graph, khi rê chuột (mouse over) tuyệt đối không hiện nhãn tên tác giả hay bất kỳ tooltip nào**.
   - **Phân biệt rõ với sự kiện Click**: Khi **click trực tiếp vào avatar**, chế độ **Click Deep Zoom (5x)** vẫn hiển thị ảnh phóng to và nhãn tên tác giả sắc nét bên dưới bình thường như thiết kế.

2. **Hạn chế vùng kích hoạt Commit Message Panel theo chuẩn GitLens**:
   - Khi rê chuột vào khu vực **cột graph** (cột 1 chứa các đường nhánh và node lục giác), **không kích hoạt** panel commit message (`CommitHoverPanel`). Nếu panel đang mở hoặc đang đếm thời gian chờ (dwell timer), lập tức hủy bỏ.
   - Panel commit message chỉ được phép kích hoạt sau khoảng thời gian dwell (550ms) **khi con trỏ chuột nằm trong phạm vi từ cột mô tả (Description) trở về mép phải của bảng** (bao gồm cột Date, Author, Commit SHA).

---

## 2. Thiết kế Kỹ thuật (Technical Implementation)

### 2.1. Tách biệt Vùng Sự kiện trong `CommitRow.tsx`

Bảng commit bao gồm 5 cột:

- Cột 1: Cột Graph (`<td class={CELL_CLASS} style={graphCellStyle}>`)
- Cột 2: Cột Description (`<td class={`${CELL_CLASS} w-full ...`}>`)
- Cột 3: Cột Date
- Cột 4: Cột Author
- Cột 5: Cột Commit SHA

Để đáp ứng hành vi GitLens:

1. **Tại `<tr>` (Toàn dòng)**:
   - `onMouseEnter`: Kích hoạt trạng thái hover của dòng (`isRowHovered = true`, `onHover?.(true)`). Giúp avatar phóng to 1.15x (Micro Hover Zoom) và dải sáng Neon Ambient xuất hiện.
   - `onMouseLeave`: Hủy trạng thái hover, dọn dẹp timer và đóng panel nếu có.
   - **Không** tự động khởi động `dwellTimer` ở cấp độ `<tr>` nữa.

2. **Tại Cột Graph (`<td>` đầu tiên)**:
   - `onMouseEnter={handleGraphCellMouseEnter}`:
     - Đặt cờ `isContentHovered.current = false`.
     - Xóa sạch `dwellTimer` nếu đang chạy.
     - Gọi `onHoverLeave?.()` để đóng ngay lập tức `CommitHoverPanel` nếu người dùng di chuyển từ vùng nội dung sang cột graph.
   - `onClick={handleGraphCellClick}`:
     - Kiểm tra nếu click trong bán kính avatar ($\pm 14\text{px}$ từ `avatarCx`), gọi `onAvatarClick` để mở 5x Click Deep Zoom.
     - Nếu click ra ngoài avatar trong cột graph, gọi `onSelect` để mở rộng chi tiết commit.

3. **Tại các Cột Nội dung (Cột 2, 3, 4, 5)**:
   - Gắn `onMouseEnter={startDwellTimer}` cho cả 4 ô `<td>`:
     - Khi con trỏ chuột di chuyển từ cột graph sang vùng nội dung (hoặc rê từ trên/dưới vào vùng nội dung), nếu `!isContentHovered.current`, đặt `isContentHovered.current = true` và bắt đầu đếm 550ms.
     - Sau 550ms dwell, phát sự kiện `onHoverDwell(commit, rowRect)` để mở `CommitHoverPanel`.
     - Khi di chuyển qua lại giữa các ô nội dung (ví dụ từ Description sang Date), cờ `isContentHovered.current` đã là `true` nên không bị reset timer một cách gián đoạn.

### 2.2. Loại bỏ Hover Author Badge trong `CommitTable.tsx`

- Đã gỡ bỏ signal `hoveredAvatar` và khối floating Author Badge trên hover khỏi `CommitTable.tsx`.
- Trạng thái rê chuột trong cột graph hoàn toàn sạch sẽ, chỉ giữ lại hiệu ứng phóng to mượt mà 1.15x của node lục giác và dải sáng Neon Ambient.
- Nhãn tên tác giả chỉ xuất hiện khi click mở **Click Deep Zoom (5x)** thông qua `<AvatarZoomPreview>`.

---

## 3. Danh sách Tệp tin Cập nhật

1. `src/webview/components/commit/CommitRow.tsx`:
   - Chuyển `startDwellTimer` sang các ô `<td>` nội dung (cột Description, Date, Author, Commit).
   - Thêm `handleGraphCellMouseEnter` hủy `dwellTimer` và đóng `CommitHoverPanel` khi chuột vào cột graph.
   - Bỏ `onAvatarHover`.
2. `src/webview/components/commit/CommitTable.tsx`:
   - Bỏ `hoveredAvatar` và khối HTML render nhãn tên tác giả khi hover.
   - Giữ nguyên `AvatarZoomPreview` khi click icon avatar.
3. `tests/webview/components/commit/CommitRow.test.ts`:
   - Bổ sung unit test kiểm tra `onHoverDwell` bị chặn khi ở cột graph và được kích hoạt khi ở cột nội dung.
4. `docs/README.md`: Cập nhật mục lục tài liệu.
