# 11. Thiết Kế Bảng Xem Trước Danh Sách Commit Đồng Bộ (Sync Commit List Inspector Flyout)

Tài liệu này định hình cấu trúc sơ bộ và ranh giới kiến trúc cho giai đoạn tiếp theo của **Phase 3.2: Bảng Xem Trước & Kiểm Tra Danh Sách Commit Đồng Bộ (Sync Commit List Inspector Flyout)**, tích hợp trực tiếp vào buồng lái Bánh xe lục giác (Radial Command Hub) cho các tác vụ `PUSH` (outgoing commits) và `PULL` (incoming commits).

> [!NOTE]
> Tài liệu này được tách độc lập từ bản phác thảo ban đầu (Mục 12.2 trong `10_WheelConcepts.md`).
> Chi tiết đặc tả kỹ thuật chuyên sâu (giải thuật, tọa độ neo flyout, hợp đồng RPC và ma trận kiểm thử chi tiết) sẽ được hoàn thiện ở bước tiếp theo trước khi triển khai mã nguồn.

---

## 1. Tầm Nhìn & Mục Tiêu Nghiệp Vụ

1. **Minh bạch hóa dòng chảy commit (Transparency & Safety)**:
   - Thay vì bấm `Push` hoặc `Pull` một cách mù quáng, người dùng có thể xem trước danh sách các commit sắp được đẩy lên remote hoặc sắp được kéo về máy cục bộ.
   - Tránh các rủi ro đẩy nhầm commit nhạy cảm, commit chưa hoàn thiện, hoặc kéo về commit gây xung đột mà không hay biết.
2. **Kế thừa thẩm mỹ Cyber-Lab & Trải nghiệm Radial**:
   - Khung kiểm tra không phải là một hộp thoại modal che khuất màn hình truyền thống, mà là một **Ngăn kéo nổi hướng tâm (Radial Flyout Drawer)** trượt nhẹ từ mép ngoài của cánh hoa `PUSH` hoặc `PULL`.
   - Đóng khung bằng đinh tán góc `+` (`CornerCrossFrame`), nền kính mờ kỹ thuật (`backdrop-filter: blur(8px)`) và vầng quang phát sáng Neon đặc trưng.

---

## 2. Ranh Giới Kiến Trúc 4 Tầng (The 4-Tier Boundary)

1. **Tầng Webview UI (Preact & Signals)**:
   - Component `SyncCommitFlyout.tsx`: Bảng nổi hiển thị danh sách commit dạng cây hoặc danh sách thu gọn.
   - Tín hiệu phản ứng: `isFlyoutOpen`, `flyoutType: 'outgoing' | 'incoming'`, `inspectedCommits: Signal<CommitSummaryItem[]>`.
2. **Tầng Backend Extension Host (MessageHandler)**:
   - Điều phối truy vấn danh sách commit chênh lệch giữa local và remote qua RPC query `getSyncCommitList`.
3. **Tầng Safe Mutator & Query**:
   - Tận dụng `git log` có giới hạn hoặc Native Engine để truy xuất commit list:
     - Outgoing (Push): `git log @{u}..HEAD --oneline` (hoặc format JSON/NUL).
     - Incoming (Pull): `git log HEAD..@{u} --oneline` (sau khi `fetch`).
4. **Tầng Fast Layout / Engine**:
   - Tái sử dụng dữ liệu đồ thị DAG sẵn có trong bộ nhớ nếu các commit đã được nạp.

---

## 3. Khái Niệm Giao Diện & Dữ Liệu Hiển Thị

Mỗi mục commit trong bảng xem trước sẽ bao gồm:
- **Mã băm ngắn (Short Hash)**: 7 ký tự kèm màu sắc nhánh.
- **Tác giả & Avatar vi mô**: Tên người tạo commit.
- **Tiêu đề commit (Summary)**: Dòng thông điệp đầu tiên.
- **Thời gian tương đối**: (Ví dụ: `5m ago`, `2h ago`).
- **Nút thực thi xác nhận**: Cho phép kích hoạt `Push` hoặc `Pull` ngay trên chân bảng sau khi duyệt danh sách.

---

## 4. Kế Hoạch Triển Khai Chi Tiết (Sẽ Hoàn Thiện Sau)

- [ ] Phác thảo chi tiết vị trí neo hình học theo các góc hướng tâm ($270^\circ$ cho Push, $330^\circ$ cho Pull).
- [ ] Đặc tả hợp đồng dữ liệu RPC truy vấn danh sách commit (`getSyncCommitList`).
- [ ] Bổ sung ma trận kiểm thử đơn vị song hành và kịch bản E2E.
