# 14. Khóa Commit Message Panel Khi Đang Chọn Dòng Commit (Commit Details View)

## 1. Bối cảnh & Yêu cầu từ Người dùng

Trong hệ thống F-GitGraph, khi người dùng click chọn một dòng commit history:

- Dòng commit đó được mở rộng trực tiếp ngay tại vị trí dòng (inline expansion), mở ra một khoảng trống hiển thị khung chi tiết commit (`<CommitDetails details={...} />`) gồm thông tin tác giả, committer, SHA, hash commit cha, toàn bộ commit message và cây thay đổi file (file tree diff).
- **Vấn đề xung đột**: Nếu đồng thời cho phép hiển thị panel nổi `CommitHoverPanel` khi rê chuột qua dòng đó hoặc các dòng lân cận thì 2 panel hiển thị cùng một nội dung sẽ chèn đè lên nhau, làm rối giao diện và che khuất thông tin đang đọc.
- **Yêu cầu nâng cấp**:
  1. Khi **đang có bất kỳ một dòng commit nào được chọn để xem** (`expandedCommit.value !== null`):
     - **Khóa hoàn toàn panel commit message nổi**: Tất cả các dòng khác (dù nằm gần hay xa dòng đang chọn) cũng như chính dòng đang chọn **đều bị chặn không cho phép hiện `CommitHoverPanel`**.
     - Nếu panel nổi đang mở hoặc đang chờ timer dwell thì lập tức đóng ngay.
  2. **Giải phóng khóa**:
     - Chỉ khi người dùng click unselect dòng đang chọn (đóng vùng xem chi tiết commit), tính năng hover hiển thị `CommitHoverPanel` mới được mở lại bình thường cho các dòng.

---

## 2. Thiết kế Kỹ thuật (Technical Implementation)

### 2.1. Quản lý trạng thái tập trung trong `CommitTable.tsx`

1. **Kiểm tra trạng thái đang chọn**:
   ```ts
   const isAnyExpanded = expandedCommit.value !== null;
   ```
2. **Tự động đóng ngay lập tức khi commit được chọn**:
   ```ts
   useEffect(() => {
     if (isAnyExpanded) {
       hoverPopover.value = null;
     }
   }, [isAnyExpanded]);
   ```
3. **Chặn kích hoạt trong `handleHoverDwell`**:
   ```ts
   const handleHoverDwell = (commit: GitCommitNode, rect: DOMRect) => {
     if (zoomedAvatar.value !== null || isAnyExpanded) {
       return;
     }
     ...
     hoverPopover.value = { commit, anchorRect: rect };
   };
   ```
4. **Bảo vệ tại tầng JSX**:
   ```tsx
   {
     hoverPopover.value && !zoomedAvatar.value && !isAnyExpanded && (
       <CommitHoverPanel
         commit={hoverPopover.value.commit}
         anchorRect={hoverPopover.value.anchorRect}
         onMouseEnter={handlePanelMouseEnter}
         onMouseLeave={handlePanelMouseLeave}
       />
     );
   }
   ```
5. **Truyền thuộc tính `isAnyExpanded={isAnyExpanded}` xuống từng `CommitRow`**.

### 2.2. Ngăn chặn Dwell Timer tại tầng `CommitRow.tsx`

1. **Trong `startDwellTimer`**:
   ```ts
   const startDwellTimer = () => {
     if (isAnyExpanded) {
       return; // Không khởi động bộ đếm timer khi đang có commit được mở
     }
     ...
   };
   ```
2. **Dọn dẹp timer đang chờ nếu commit được chọn bất ngờ**:
   ```ts
   useEffect(() => {
     if (isAnyExpanded && dwellTimer.current !== null) {
       window.clearTimeout(dwellTimer.current);
       dwellTimer.current = null;
     }
   }, [isAnyExpanded]);
   ```

---

## 3. Trải nghiệm Người dùng (UX) Sau Cải tiến

| Trạng thái giao diện                                        | Rê chuột vào nội dung dòng (Description/Date/Author/SHA)                                                    | Rê chuột vào cột Graph                                                                | Click vào Avatar Lục giác                                                |
| :---------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **Không có dòng nào được chọn** (`expandedCommit === null`) | Sau 550ms: hiển thị `CommitHoverPanel` nền chìm sắc nét                                                     | Không hiện panel hover, không hiện nhãn tên tác giả, giữ scale 1.15x & neon highlight | Mở **Click Deep Zoom (5x)** kèm nhãn tên tác giả                         |
| **Có 1 dòng đang chọn để xem** (`expandedCommit !== null`)  | **Bị chặn hoàn toàn**: Không hiện `CommitHoverPanel` trên bất kỳ dòng nào (tránh chèn đè lên view chi tiết) | Không hiện panel hover, giữ scale 1.15x & neon highlight                              | Vẫn mở **Click Deep Zoom (5x)** bình thường nếu muốn xem cận cảnh avatar |
| **Click unselect để đóng chi tiết**                         | **Tự động mở khóa**: `CommitHoverPanel` hoạt động lại bình thường khi rê chuột                              | Hoạt động bình thường                                                                 | Hoạt động bình thường                                                    |

---

## 4. Danh sách Tệp tin Cập nhật

1. `src/webview/components/commit/CommitTable.tsx`: Thêm điều kiện `isAnyExpanded`, tự động ẩn và chặn `hoverPopover`.
2. `src/webview/components/commit/CommitRow.tsx`: Nhận prop `isAnyExpanded`, hủy và chặn khởi tạo `dwellTimer`.
3. `tests/webview/components/commit/CommitRow.test.ts`: Bổ sung unit test xác minh `onHoverDwell` bị chặn khi `isAnyExpanded = true`.
4. `docs/README.md`: Đăng ký tài liệu 14.
