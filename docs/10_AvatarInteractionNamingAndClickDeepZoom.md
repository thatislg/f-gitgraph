# 10. Avatar Interaction Naming & Click Deep Zoom

## 1. Bối cảnh & Yêu cầu thay đổi

Trong phiên bản trước, việc phóng to avatar 5x được kích hoạt thông qua thời gian giữ chuột (dwell time $\ge 500\text{ms}$). Tuy nhiên, trong quá trình thao tác thực tế, người dùng nhận thấy:
- Rê chuột qua lại dễ vô tình kích hoạt phóng to to gấp 5 lần khi dừng chuột đọc commit, gây che khuất các thông tin xung quanh.
- Người dùng chỉ muốn khi **click chuột vào icon avatar** thì mới mở phóng to 5x kèm tên tác giả, còn khi **rê chuột (mouse over)** thì chỉ giữ hiệu ứng zoom nhẹ như ban đầu.
- Cần đặt tên chuẩn hóa cho 2 kiểu zoom để dễ dàng trao đổi và lưu trữ trong tài liệu kỹ thuật của dự án.

---

## 2. Chuẩn hóa thuật ngữ cho 2 kiểu Zoom (Naming Conventions)

Để thống nhất trong mã nguồn và tài liệu kiến trúc, 2 kiểu zoom được định danh như sau:

| Tên chuẩn (English) | Tên tiếng Việt | Tỷ lệ Scale | Hành động kích hoạt (Trigger) | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Micro Hover Zoom** *(Hover Scale)* | Zoom vi tương tác khi rê chuột | **`1.15x`** | Rê chuột (`mouseenter` / `hover`) hoặc dòng được chọn (`selected`) | Phản hồi thị giác tức thì, nhận diện vị trí con trỏ chuột trong cây đồ thị mà không làm che khuất các dòng khác. |
| **Click Deep Zoom** *(Avatar Inspect Zoom)* | Zoom sâu chi tiết khi bấm chuột | **`5.0x`** | Bấm chuột trái (`click`) trực tiếp vào icon lục giác | Xem ảnh avatar gốc độ nét cao ($100\text{px}$) kèm nhãn tên tác giả, hiệu ứng neon rực rỡ trên layer trên cùng (`z-index: 60`). |

---

## 3. Thiết kế luồng tương tác (Interaction Design)

### 3.1. Hành vi Micro Hover Zoom (Rê chuột)
- Khi người dùng di chuột qua avatar trong cây đồ thị:
  - Chỉ kích hoạt hiệu ứng biến đổi `scale(1.15)` với viền neon nhẹ.
  - **Loại bỏ hoàn toàn timer giữ chuột** tự động bung 5x khi rê chuột.
  - Hover trên dòng commit vẫn giữ chức năng mở GitLens Hover Panel nếu giữ chuột trên phần nội dung commit.

### 3.2. Hành vi Click Deep Zoom (Bấm chuột)
- Khi người dùng click chuột trực tiếp vào icon lục giác:
  - Bắt sự kiện `onClick` trên `<HexagonNode>` và gọi `e.stopPropagation()` để không làm kích hoạt đóng/mở chi tiết commit của dòng (`toggleCommitDetails`).
  - Kích hoạt trạng thái `zoomedAvatar` hiển thị component `AvatarZoomPreview` trên layer cao nhất (`z-index: 60`).
  - Nếu click lại vào chính icon đó khi đang mở $\rightarrow$ Tắt (toggle off).
- **Cơ chế đóng Click Deep Zoom**:
  1. Click vào bất kỳ vị trí nào bên ngoài (click outside).
  2. Click trực tiếp vào ảnh đang phóng to hoặc nhãn tên.
  3. Nhấn phím `Escape`.

---

## 4. Danh sách tệp tin thay đổi
1. `src/webview/components/commit/HexagonNode.tsx`: Thay thế `onAvatarDwell` bằng `onAvatarClick(e)`. Loại bỏ hover timer 500ms.
2. `src/webview/components/commit/CommitGraph.tsx`: Tiếp nhận `onAvatarClick` và chuyển tiếp cho `HexagonNode`.
3. `src/webview/components/commit/CommitTable.tsx`: Quản lý mở/tắt `zoomedAvatar` theo sự kiện click.
4. `src/webview/components/commit/AvatarZoomPreview.tsx`: Bổ sung cơ chế đóng qua click outside, phím Escape và prop `onClose`.
5. `tests/webview/components/commit/AvatarZoomPreview.test.ts`: Cập nhật kiểm thử đóng/mở.
6. `docs/README.md`: Cập nhật mục lục tài liệu.
