# Tiến Độ Chặng 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ

Tài liệu này ghi nhận tổng quan mục tiêu, phân rã đầu việc chi tiết (Task Outlines), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 3.2: Xây dựng Kiến trúc 3-Pane Workspace & Thanh công cụ đồng bộ toàn cục**.

> [!NOTE]
> **Hồ sơ thiết kế tham chiếu**:
>
> - [003_Gap_Analysis_And_Evolution_Blueprint.md (Mục 4.2: Kiến trúc 3-Pane Workspace)](../../01_investigation/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md).
> - [004_Design_System_And_Visual_Identity.md (Quy chuẩn bố cục Cyber-Lab & Đinh tán góc)](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md).
> - [docs/02_design/phase3/ (Mục lục hồ sơ thiết kế kỹ thuật Phase 3)](../../02_design/phase3/README.md).

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm Nhìn & Mục Tiêu Cốt Lõi

- **Mục tiêu**: Nâng cấp giao diện hiển thị đơn lẻ thành một **Không gian làm việc 3 phân vùng (3-Pane Workspace)** chuẩn mực của các ứng dụng Git Client chuyên nghiệp (như Fork, GitKraken, Tower), mang lại cái nhìn toàn cảnh về tài nguyên kho và khả năng đồng bộ từ xa với số đếm trực quan.
- **Trọng tâm kỹ thuật**:
  - **Left Sidebar Navigator**: Cây điều hướng bao quát Working Tree, Nhánh cục bộ (Local Branches), Nhánh từ xa (Remote Branches), Nhãn phiên bản (Tags) và Ngăn xếp tạm (Stashes).
  - **Top Global Toolbar**: Thanh công cụ đỉnh tích hợp các nút tác vụ nhanh `Fetch`, `Pull`, `Push` kèm huy hiệu số lượng commit chưa đồng bộ (`↑ahead` / `↓behind`).
  - **Search & Filter Bar**: Tìm kiếm và lọc nhanh commit theo thông điệp (Message), tên tác giả (Author), mã băm (Hash).
  - **Khả năng co giãn linh hoạt (Responsive & Collapsible)**: Sidebar có thể thu gọn vào lề; Inspector có thể neo dạng cột bên phải hoặc ngăn kéo bên dưới.

### 1.2. Trạng Thái Hiện Tại (Status)

- **Trạng thái**: Đang chờ kết quả từ Chặng 3.1 (Pending on Phase 3.1).
- **Tiến độ tổng thể**: 0% hoàn thành.

---

## 2. Phân Rã Đầu Việc & Nhiệm Vụ Con Chi Tiết (Detailed Task Outlines)

### 📋 Nhóm Việc 1: Thiết Kế & Triển Khai Cây Điều Hướng Left Sidebar Navigator

- [ ] **Nhiệm vụ 1.1: Khởi tạo Component `SidebarNavigator.tsx`**
  - Xây dựng thanh điều hướng bên trái có độ rộng mặc định ~220px, có đường biên phân cách cho phép kéo dãn kích thước (resizable).
  - Nút thu gọn / mở rộng nhanh (Toggle Collapse) để giải phóng toàn bộ không gian cho Đồ thị khi cần thiết.

- [ ] **Nhiệm vụ 1.2: Triển khai các nhóm cây phân cấp (Tree Hierarchy)**
  - **Mục `Working Tree`**: Hiển thị số lượng tệp đang sửa đổi (`Changes: N`). Click vào đây để mở ngay Staging Area & Commit Composer ở bảng phải.
  - **Mục `Local Branches`**: Danh sách toàn bộ các nhánh cục bộ.
    - Đánh dấu nổi bật nhánh đang checkout (`HEAD`) bằng icon checkmark và viền tím neon.
    - Hiển thị huy hiệu số commit chưa push/pull cạnh từng nhánh (ví dụ: `main ↑1`).
  - **Mục `Remotes`**: Phân cấp theo tên remote (`origin`, `upstream`), bên trong chứa danh sách các nhánh remote tương ứng.
  - **Mục `Tags`**: Danh sách toàn bộ các tag đã đánh dấu trong kho.
  - **Mục `Stashes`**: Danh sách các bản lưu trữ tạm.

- [ ] **Nhiệm vụ 1.3: Tích hợp hành động tương tác trên cây Sidebar**
  - Double-click vào một nhánh: Tự động kích hoạt checkout nhánh đó.
  - Chuột phải vào nhánh/tag: Tận dụng trực tiếp hệ thống Context Menu đã hoàn thiện ở Phase 1 (`localBranchMenu`, `remoteBranchMenu`, `tagMenu`).
  - Nút tạo mới nhanh (`+`) trên tiêu đề từng nhóm (ví dụ: bấm `+` trên nhóm Branches để tạo nhánh mới).

---

### 📋 Nhóm Việc 2: Thiết Kế & Triển Khai Thanh Công Cụ Đỉnh Toàn Cục (Top Toolbar)

- [ ] **Nhiệm vụ 2.1: Xây dựng Component `GlobalToolbar.tsx` thay thế `MainHeader.tsx` cũ**
  - Bố trí các nút bấm tác vụ nhanh với biểu tượng trực quan:
    - **Nút `Fetch All`**: Tải dữ liệu mới từ mọi remote (`git fetch --all --prune`).
    - **Nút `Pull`**: Kéo dữ liệu về nhánh hiện tại (kèm nút mũi tên nhỏ mở dropdown chọn `Pull (Merge)` hoặc `Pull --rebase`).
    - **Nút `Push`**: Đẩy các commit cục bộ lên server (kèm dropdown chọn `Push with Lease` hoặc `Push to...`).
    - **Nút `Stash` & `Pop`**: Lưu nhanh hoặc khôi phục nhanh thay đổi tạm thời.
    - **Nút `Refresh`**: Làm mới dữ liệu toàn diện.

- [ ] **Nhiệm vụ 2.2: Tích hợp huy hiệu số đếm đồng bộ trực quan (Sync Badges)**
  - Hiển thị nhãn cảnh báo ngay trên nút:
    - `Pull ↓ 2`: Cảnh báo có 2 commit mới trên server cần kéo về.
    - `Push ↑ 1`: Cảnh báo có 1 commit cục bộ cần đẩy lên server.
  - Khi kho đã đồng bộ hoàn toàn: Nút hiển thị trạng thái bình thường (Up-to-date).

---

### 📋 Nhóm Việc 3: Hiện Thực Bộ Đếm Đồng Bộ Từ Xa Siêu Tốc (Ahead / Behind Counter)

- [ ] **Nhiệm vụ 3.1: Mở rộng truy vấn `git rev-list --count` hoặc LibGit2**
  - Xây dựng query tính toán nhanh số lượng commit chênh lệch giữa nhánh cục bộ và nhánh upstream tương ứng:
    - `aheadCount`: Số commit thuộc `HEAD` nhưng chưa có trên `@{u}`.
    - `behindCount`: Số commit thuộc `@{u}` nhưng chưa có trên `HEAD`.
  - Lưu trữ vào State Store của Webview (`syncStatusStore.ts`).

- [ ] **Nhiệm vụ 3.2: Tự động cập nhật sau mỗi thao tác mạng**
  - Tự động kích hoạt đếm lại sau khi lệnh `fetch`, `pull`, `push` hoặc `commit` thực thi thành công.

---

### 📋 Nhóm Việc 4: Thanh Tìm Kiếm & Lọc Commit Nâng Cao (Search & Filter Bar)

- [ ] **Nhiệm vụ 4.1: Xây dựng Component `SearchFilterBar.tsx`**
  - Hộp nhập văn bản tìm kiếm đặt ngay trên thanh công cụ đỉnh.
  - Hỗ trợ phím tắt kích hoạt tức thời `Ctrl + F` (hoặc `Cmd + F`).
  - Chế độ tìm kiếm linh hoạt:
    - Tìm kiếm theo thông điệp commit (Commit Message / Subject).
    - Tìm kiếm theo tên hoặc email tác giả (`author:Nam`).
    - Tìm kiếm theo mã băm commit (`hash:a1b2c3d`).

- [ ] **Nhiệm vụ 4.2: Cơ chế Highlight & Cuộn Đến Kết Quả trên Đồ Thị DAG**
  - Tự động highlight làm nổi bật các node commit và dòng bảng khớp với từ khóa tìm kiếm.
  - Nút mũi tên chuyển hướng kết quả: `Next (↓)` / `Previous (↑)` kèm bộ đếm `(3 of 12)`.
  - Cuộn mượt mà (Smooth scroll) đến dòng commit tương ứng trên bảng ảo hóa.

---

### 📋 Nhóm Việc 5: Bố Cục Co Giãn Responsive & Kiểm Thử Nghiệm Thu

- [ ] **Nhiệm vụ 5.1: Xây dựng Layout Container 3 Phân Vùng**
  - Ghép nối đồng bộ: `SidebarNavigator` (Trái) + `CommitTable` (Giữa) + `Staging/CommitDetails Pane` (Phải hoặc Dưới).
  - Lưu trạng thái kích thước và trạng thái đóng/mở của các phân vùng vào LocalStorage để giữ nguyên trải nghiệm khi người dùng khởi động lại VS Code.

- [ ] **Nhiệm vụ 5.2: Kiểm thử hồi quy giao diện (Zero Regression Test)**
  - Đảm bảo bảng đồ thị ảo hóa vẫn cuộn mượt 60fps khi Sidebar mở hoặc đóng.
  - Kiểm tra tính tương thích trên các kích thước màn hình khác nhau (từ màn hình laptop nhỏ 13-inch đến màn hình siêu rộng UltraWide 34-inch).

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. Giao diện F-GitGraph sở hữu đầy đủ 3 phân vùng tiêu chuẩn: Sidebar Navigator bên trái, Đồ thị DAG ở giữa, và Inspector bên phải.
2. Cây Sidebar thể hiện chính xác 100% cấu trúc nhánh, tag, stash của kho, double-click chuyển nhánh tức thì.
3. Các nút `Fetch`, `Pull`, `Push` hoạt động chuẩn xác qua Git CLI gốc, hiển thị huy hiệu `↑ahead` / `↓behind` trung thực.
4. Thanh tìm kiếm `Ctrl + F` tìm kiếm tức thời trên đồ thị, có highlight và điều hướng chuyển dòng mượt mà.
5. Kiểm thử Vitest đạt 100% pass, không phát sinh lỗi layout hoặc suy thoái hiệu năng.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-15**: Khởi tạo tài liệu tiến độ Chặng 3.2. Phân rã 5 nhóm việc kỹ thuật cho Kiến trúc 3-Pane Workspace, Cây điều hướng và Thanh công cụ đồng bộ.
