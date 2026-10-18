# 09. Thiết Kế Bố Cục Co Giãn Responsive 3-Pane & Nghiệm Thu Bất Biến Hình Học (Workspace Layout Design)

Tài liệu này đặc tả chi tiết kiến trúc tầng Giao diện (Webview UI), Component khung bố cục tổng thể 3 phân vùng (`WorkspaceLayout`), cơ chế theo dõi kích thước động qua `ResizeObserver`, và cam kết bảo toàn bất biến hình học tuyệt đối (Zero Layout Shift) cho nhân đồ thị F# Core Engine trong **Phase 3.2: Nhóm Việc 5 — Bố Cục Co Giãn Responsive 3-Pane & Kiểm Thử Nghiệm Thu Hình Học**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào kiến trúc bố cục thích ứng, cam kết không làm sai lệch bất kỳ pixel tọa độ nào của nhân F# Core; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
>
> 📌 **Truy vết tiến độ**: [Phase 3.2 Tiến Độ (Nhóm Việc 5)](../../03_progess/phase3/002_phase3_2_3pane_workspace.md#nhóm-việc-5-bố-cục-co-giãn-responsive-3-pane--nghiệm-thu-bất-biến-hình-học).

---

## 1. Tầm Nhìn, Mục Tiêu & Cam Kết Bất Biến Hình Học

### 1.1. Mục Tiêu Cốt Lõi
- Hợp nhất 3 phân vùng chức năng độc lập thành một không gian làm việc gắn kết, linh hoạt và chuyên nghiệp:
  1. **Khung Trái (Left Pane)**: `<SidebarNavigator />` (Cây tài nguyên kho, độ rộng linh hoạt từ 160px đến 450px hoặc thu gọn 0px).
  2. **Khung Giữa (Center Pane)**: `<CommitTable />` (Bảng đồ thị commit DAG ảo hóa kết hợp SVG đường nhánh Bézier và nút lục giác `HexagonNode`).
  3. **Khung Phải / Khung Dưới (Right / Bottom Pane)**: `<StagingArea />` hoặc `<CommitDetails />` (Khu vực Staging hoặc chi tiết commit mở dạng Overlay nổi).

### 1.2. Cam Kết Bất Biến Hình Học Đồ Thị Tuyệt Đối (Zero Layout Shift)
- **Đúc kết từ Nguyên Tắc 3 của Phase 3.1**:
  - Việc mở rộng, thu hẹp hoặc đóng mở hoàn toàn Sidebar bên trái **chỉ được phép thay đổi chiều rộng phần nhìn (Viewport Width) của bảng ảo hóa**, tuyệt đối **không được phép làm thay đổi**:
    1. Tọa độ $Y$ của các dòng commit (chiều cao mỗi dòng cố định bất biến $24\text{px}$).
    2. Tọa độ tâm ($cx, cy$) và hình học 6 đỉnh của các nút lục giác `HexagonNode`.
    3. Đường cong SVG Bézier sinh ra từ nhân F# Core Solver (chuỗi thuộc tính `d`).
    4. Cấu trúc avatar clipPath và vầng neon ambient.
  - Mọi độ lệch hình học đo đạc được trước và sau khi tương tác co giãn phải bằng **0 pixel**.

---

## 2. Đặc Tả Kiến Trúc Bố Cục Responsive 3 Phân Vùng

### 2.1. Cấu Trúc Khung Bố Cục (Flexbox Layout Structure)

```
<WorkspaceLayout> [Toàn màn hình: 100vw x 100vh, Flex-column, Overflow hidden]
  ├── <GlobalToolbar /> [Đỉnh: Cố định 40px, viền dưới kỹ thuật]
  │
  └── <WorkspaceBody> [Phần thân: Flex-1, Flex-row, Chiếm toàn bộ không gian còn lại]
        ├── <SidebarContainer> [Trái: Width = sidebarWidth || 0px khi collapsed]
        │     └── <SidebarNavigator />
        │
        ├── <GraphMainContainer> [Giữa: Flex-1, Tích hợp ResizeObserver]
        │     ├── <SearchFilterBarContainer />
        │     └── <CommitTable /> [Bảng ảo hóa DAG]
        │
        └── <InspectorOverlayContainer> [Phải / Nổi: StagingArea hoặc CommitDetails]
```

### 2.2. Cơ Chế Điều Phối Không Gian & ResizeObserver

1. **Theo Dõi Kích Thước Bằng `ResizeObserver`**:
   - Gắn một `ResizeObserver` bao bọc thẻ cha của `<GraphMainContainer>`.
   - Khi người dùng kéo dãn Sidebar bên trái hoặc khi cửa sổ VS Code thay đổi kích thước:
     - `ResizeObserver` phát hiện sự biến động chiều ngang (`contentRect.width`).
     - Sử dụng `requestAnimationFrame` để gom cụm các sự kiện resize liên tục, tránh hiện tượng giật khung hình (frame stuttering).
     - Cập nhật tín hiệu `viewportWidth` của bảng ảo hóa để điều chỉnh chiều rộng cột thông điệp (Commit Subject Column).
2. **Cơ Chế Phân Phối Chiều Rộng Cột Bảng**:
   - Cột Đồ thị DAG (`--col-graph`): Chiều rộng bất biến, phụ thuộc số lượng lane của nhánh.
   - Cột Thời gian / Tác giả / Hash: Chiều rộng cố định theo token Cyber-Lab.
   - Cột Tiêu đề Commit (Subject): Nhận toàn bộ chiều rộng linh hoạt còn lại (`flex-grow: 1`), tích hợp cơ chế cắt ngắn văn bản (Ellipsis) khi bị thu hẹp.

---

## 3. Quản Lý Trạng Thái Bố Cục & Tương Thích Màn Hình

### 3.1. Các Tùy Biến Thích Ứng Màn Hình (Responsive Breakpoints)
- **Màn hình cực rộng (UltraWide > 1440px)**:
  - Sidebar mở đầy đủ ~260px.
  - Bảng DAG chiếm phần lớn không gian.
  - Inspector Panel có thể neo cố định dạng cột thứ 3 bên phải rộng 400px mà không cần che lấp đồ thị.
- **Màn hình máy tính chuẩn (Desktop 1024px – 1440px)**:
  - Sidebar mở tiêu chuẩn 220px.
  - Inspector mở dạng Overlay nổi có viền đinh tán chữ thập góc bừng sáng, che một phần bảng commit.
- **Màn hình hẹp / Laptop nhỏ (< 1024px)**:
  - Tự động kích hoạt trạng thái thu gọn Sidebar (`isCollapsed = true`), hiển thị nút mở nhanh trên Toolbar.

---

## 4. Ma Trận Kiểm Thử Nghiệm Thu Hình Học & Bố Cục

| Tệp Kiểm Thử Độc Lập | Module Mục Tiêu | Kịch Bản Kiểm Thử Bắt Buộc |
| :--- | :--- | :--- |
| `tests/webview/layout/WorkspaceLayout.geometry.test.ts` | `WorkspaceLayout.tsx` & `CommitTable.tsx` | **Kiểm định bất biến hình học tuyệt đối (Zero Layout Shift)**:<br>1. Snapshot tọa độ các nút `HexagonNode` và thuộc tính `d` của đường nhánh Bézier ở trạng thái Sidebar mặc định (220px).<br>2. Thay đổi độ rộng Sidebar lên 380px $\rightarrow$ Snapshot lại $\rightarrow$ So sánh `toEqual` xác nhận độ lệch bằng 0 pixel.<br>3. Thu gọn hoàn toàn Sidebar (0px) $\rightarrow$ Snapshot lại $\rightarrow$ So sánh `toEqual` xác nhận độ lệch bằng 0 pixel.<br>4. Xác nhận chiều cao từng dòng bảng luôn cố định 24px, không phát sinh giãn dòng. |
| `tests/webview/layout/WorkspaceLayout.test.ts` | `WorkspaceLayout.tsx` | 1. Render đầy đủ 3 phân vùng chính (Toolbar đỉnh, Sidebar trái, Bảng DAG giữa).<br>2. Thay đổi kích thước cửa sổ kích hoạt đúng `ResizeObserver` cập nhật bảng ảo hóa.<br>3. Phục hồi chính xác trạng thái kích thước đã lưu trong `localStorage`. |
