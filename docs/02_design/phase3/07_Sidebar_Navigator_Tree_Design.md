# 07. Thiết Kế Cây Điều Hướng Left Sidebar Navigator (Sidebar Navigator Tree Design)

Tài liệu này đặc tả chi tiết kiến trúc tầng Giao diện (Webview UI), các Component thành phần của thanh điều hướng bên trái (`SidebarNavigator`, `SidebarSection`, `SidebarItem`), cơ chế co giãn kích thước linh hoạt (Resizable Resizer), kho trạng thái `sidebar.store.ts` bằng Preact Signals, và các tương tác người dùng cho **Phase 3.2: Nhóm Việc 3 — Thiết Kế & Triển Khai Cây Điều Hướng Left Sidebar Navigator**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào cấu trúc cây dữ liệu phân cấp, trải nghiệm kéo dãn mượt mà và bảo lưu trạng thái người dùng; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
>
> 📌 **Truy vết tiến độ**: [Phase 3.2 Tiến Độ (Nhóm Việc 3)](../../03_progess/phase3/002_phase3_2_3pane_workspace.md#nhóm-việc-3-thiết-kế--triển-khai-cây-điều-hướng-left-sidebar-navigator).

---

## 1. Tầm Nhìn, Mục Tiêu & Trải Nghiệm Điều Hướng

### 1.1. Mục Tiêu Cốt Lõi
- Xây dựng thanh điều hướng cây phân cấp bên trái bao quát toàn bộ tài nguyên Git của kho mã nguồn trong một điểm nhìn duy nhất:
  1. **Working Tree**: Hiển thị số lượng tệp biến động, click mở thẳng Staging Area.
  2. **Local Branches**: Toàn bộ nhánh cục bộ, làm nổi bật nhánh `HEAD`, hiển thị số commit chưa push cạnh từng nhánh.
  3. **Remotes**: Cây phân cấp theo tên remote (`origin`, `upstream`), chứa các nhánh từ xa tương ứng.
  4. **Tags**: Danh sách các mốc phát hành (Release Tags).
  5. **Stashes**: Danh sách các bản cất giữ tạm thời.
- Hỗ trợ thao tác kéo dãn chiều rộng tự do với biên an toàn từ 160px đến 450px, nút thu gọn nhanh (Toggle Collapse) để giải phóng toàn bộ màn hình cho Đồ thị DAG khi cần tập trung.

### 1.2. Khả Năng Lưu Trữ Trạng Thái (State Persistence)
- Tự động ghi nhớ chiều rộng (`sidebarWidth`) và trạng thái đóng/mở (`isCollapsed`) vào `localStorage` của Webview.
- Khi người dùng khởi động lại VS Code hoặc chuyển đổi giữa các repository, cấu hình giao diện ưa thích được khôi phục nguyên vẹn ngay tức khắc.

---

## 2. Đặc Tả Kiến Trúc Giao Diện & Phân Rã Component

### 2.1. Cây Phân Cấp Component (Component Hierarchy)

```
<SidebarNavigator> [Độ rộng mặc định ~220px, Flex-column, viền phải phân cách]
  ├── <SidebarHeader> [Tiêu đề WORKSPACE & Nút thu gọn Toggle Collapse]
  │
  ├── <SidebarContent> [Cuộn dọc mỏng Cyber-Lab]
  │     ├── <SidebarSection id="working-tree" title="WORKING TREE">
  │     │     └── <SidebarItem type="working-tree" label="Changes" badgeCount={changesCount} />
  │     │
  │     ├── <SidebarSection id="branches" title="LOCAL BRANCHES" actionButton="+">
  │     │     ├── <SidebarItem type="branch" name="main" isHead={true} aheadCount={1} />
  │     │     └── <SidebarItem type="branch" name="feature/xyz" isHead={false} />
  │     │
  │     ├── <SidebarSection id="remotes" title="REMOTES">
  │     │     └── <SidebarRemoteGroup name="origin">
  │     │           ├── <SidebarItem type="remote-branch" name="origin/main" />
  │     │           └── <SidebarItem type="remote-branch" name="origin/feature/xyz" />
  │     │
  │     ├── <SidebarSection id="tags" title="TAGS">
  │     │     └── <SidebarItem type="tag" name="v1.0.0" />
  │     │
  │     └── <SidebarSection id="stashes" title="STASHES">
  │           └── <SidebarItem type="stash" index={0} message="WIP: auth flow" date="2h ago" />
  │
  └── <SidebarResizer> [Thanh phân cách 4px bắt sự kiện kéo thả chuột chuột trái]
```

### 2.2. Chi Tiết Các Khối Component

1. **`SidebarSection.tsx`**:
   - Khung phân nhóm có thể gập mở (Collapsible Accordion).
   - Dòng tiêu đề: Chữ Monospace in hoa cỡ 11px, màu xám kỹ thuật `#94a3b8` (Dark) / `#64748b` (Light).
   - Mũi tên Chevron bên trái: Xoay góc 90 độ mượt mà khi chuyển đổi giữa đóng và mở.
   - Nút tác vụ vi mô bên phải: Nút `+` trên nhóm Branches để mở hộp thoại tạo nhánh mới nhanh.
   - Huy hiệu tổng số phần tử bên cạnh tiêu đề nhóm.

2. **`SidebarItem.tsx`**:
   - Chiều cao dòng chuẩn 26px, căn chỉnh flexbox ngang, đệm lề trái phân cấp theo tầng thụt đầu dòng (indentation 12px/cấp).
   - **Nhánh `HEAD` hiện tại**: Nổi bật với đường viền trái tím Neon `#a855f7`, chữ in đậm màu sáng rõ `#f8fafc`, icon checkmark nhỏ xác nhận nhánh đang active.
   - **Huy hiệu số commit chưa push cạnh nhánh**: Nhãn nhỏ dạng `↑2` màu hổ phách Neon hiển thị phía sau tên nhánh để lập trình viên nhận biết nhánh nào cần push.
   - Hiệu ứng Hover: Nền sáng nhẹ 5% với đường viền bo góc 3px tinh tế.

3. **`SidebarResizer.tsx`**:
   - Thanh chia cắt đặt ở mép phải của Sidebar với chiều rộng ảo 4px.
   - Con trỏ chuột tự động đổi thành dạng `col-resize`.
   - Bắt sự kiện chuột `mousedown` toàn cục, theo dõi `mousemove` để tính toán độ dịch chuyển `clientX` và cập nhật trực tiếp tín hiệu `sidebarWidth`.
   - Khi thả chuột `mouseup`: Kết thúc thao tác kéo và ghi đè giá trị mới vào `localStorage`.

---

## 3. Quản Lý Trạng Thái Bằng Preact Signals (`sidebar.store.ts`)

### 3.1. Danh Mục Tín Hiệu Cơ Sở (Base Signals)
- `sidebarWidth`: Chiều rộng hiện tại của Sidebar tính theo pixel (mặc định 220, kẹp trong khoảng $[160, 450]$).
- `isCollapsed`: Cờ thu gọn Sidebar (boolean, mặc định `false`).
- `expandedSections`: Tập hợp (Set) lưu trữ mã định danh các section đang mở (ví dụ: `new Set(['working-tree', 'branches', 'remotes'])`).
- `selectedItemId`: Mã định danh của item đang được chọn/focus trong cây.

### 3.2. Các Hàm Điều Phối Hành Động (Dispatchers)
- `setSidebarWidth(width: number)`: Kẹp giá trị trong ngưỡng $[160, 450]$, cập nhật tín hiệu và ghi `localStorage`.
- `toggleCollapse()`: Đảo trạng thái `isCollapsed`, ghi `localStorage`.
- `toggleSection(sectionId: string)`: Thêm hoặc xóa `sectionId` khỏi `expandedSections`.
- `selectItem(itemId: string)`: Đặt item active.
- `initSidebarStore()`: Đọc `localStorage` khi khởi động Webview để phục hồi cấu hình đã lưu.

---

## 4. Đặc Tả Tương Tác Người Dùng & Điều Phối Hành Động

1. **Thao Tác Nhấp Đúp (Double-Click) Chuyển Nhánh**:
   - Nhấp đúp chuột trái vào một nhánh cục bộ trong mục `Local Branches`: Gửi ngay Action RPC `checkoutBranch` về Backend.
   - Nếu có thay đổi chưa commit xung đột: Backend trả về lỗi và Webview mở modal cảnh báo thông minh đề xuất Stash hoặc Discard.

2. **Thao Tác Chuột Phải (Context Menu)**:
   - Chuột phải vào nhánh cục bộ: Tận dụng trực tiếp hệ thống Context Menu đã hoàn thiện ở Phase 1 (`checkout`, `merge`, `rebase`, `rename`, `delete`).
   - Chuột phải vào remote branch: Menu `checkout as new local branch`, `merge into current`, `pull`.
   - Chuột phải vào stash: Menu `apply stash`, `pop stash`, `drop stash`.

3. **Nhấp Chọn Mục Working Tree**:
   - Nhấp chuột trái vào dòng `Changes (N)`: Tương đương với việc click vào dòng mầm `*` trên đồ thị DAG, tự động mở bảng Staging Area & Commit Composer ở phân vùng bên phải.

---

## 5. Ma Trận Kiểm Thử Đơn Vị Song Hành (Unit Testing Matrix)

| Tệp Kiểm Thử Độc Lập | Module Mục Tiêu | Kịch Bản Kiểm Thử Bắt Buộc |
| :--- | :--- | :--- |
| `tests/webview/lib/stores/sidebar.store.test.ts` | `sidebar.store.ts` | 1. Thay đổi độ rộng `sidebarWidth` đúng giới hạn min (160) và max (450).<br>2. Lưu và phục hồi thành công từ `localStorage`.<br>3. Bật/tắt trạng thái `isCollapsed` và đóng/mở section. |
| `tests/webview/components/sidebar/SidebarNavigator.test.ts` | `SidebarNavigator.tsx` | 1. Render đầy đủ 5 phân nhóm cây (Working Tree, Branches, Remotes, Tags, Stashes).<br>2. Nhánh HEAD hiển thị viền tím Neon và icon checkmark.<br>3. Double-click nhánh phát đúng action RPC `checkoutBranch`.<br>4. Click nút `+` kích hoạt tạo nhánh mới.<br>5. Resizer kéo chuột thay đổi style độ rộng của container. |
