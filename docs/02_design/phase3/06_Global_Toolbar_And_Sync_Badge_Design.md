# 06. Thiết Kế Thanh Công Cụ Đỉnh Toàn Cục & Huy Hiệu Đồng Bộ (Global Toolbar & Sync Badge Design)

Tài liệu này đặc tả chi tiết kiến trúc tầng Giao diện (Webview UI), các Component thành phần của thanh công cụ đỉnh (`GlobalToolbar`, `SyncBadge`), kho trạng thái phản ứng `sync.store.ts` bằng Preact Signals, và cơ chế tự động đồng bộ thời gian thực qua Dispatcher cho **Phase 3.2: Nhóm Việc 2 — Thiết Kế & Triển Khai Thanh Công Cụ Đỉnh Toàn Cục**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào kiến trúc hệ thống, quy chuẩn thẩm mỹ Cyber-Lab và bảo đảm phản xạ thời gian thực (**Realtime State Guarantee**); tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
>
> 📌 **Truy vết tiến độ**: [Phase 3.2 Tiến Độ (Nhóm Việc 2)](../../03_progess/phase3/002_phase3_2_3pane_workspace.md#nhóm-việc-2-thiết-kế--triển-khai-thanh-công-cụ-đỉnh-toàn-cục-top-toolbar).

---

## 1. Tầm Nhìn, Mục Tiêu & Trải Nghiệm Người Dùng

### 1.1. Mục Tiêu Cốt Lõi
- Thay thế hoàn toàn thanh tiêu đề cũ `MainHeader.tsx` bằng `GlobalToolbar.tsx` chuẩn mực của ứng dụng Git Client chuyên nghiệp (như Fork, GitKraken).
- Bố trí các nút tác vụ mạng thường dùng (`Fetch All`, `Pull`, `Push`, `Stash`, `Pop`, `Refresh`) ngay trong tầm với 1 click chuột.
- Hiển thị trực quan trạng thái chênh lệch commit giữa nhánh làm việc và máy chủ thông qua huy hiệu phát quang Neon phản xạ trung thực theo số đếm `↑ahead` / `↓behind`.

### 1.2. Cam Kết Phản Xạ Thời Gian Thực (Realtime State Guarantee)
- Đúc kết từ lỗi STT 18 của Phase 3.1: Mọi hành động kích hoạt từ Toolbar sau khi được Backend thực thi thành công **bắt buộc phải qua Router tập trung trong `dispatcher.ts`** để tự động kích hoạt chuỗi làm mới 3 chiều:
  1. `refresh()`: Nạp lại đồ thị DAG ảo hóa và các commit mới.
  2. `refreshStatus()`: Nạp lại trạng thái Working Tree và Staging Index.
  3. `refreshSyncStatus()`: Nạp lại số đếm ahead/behind để cập nhật huy hiệu nút bấm.

---

## 2. Đặc Tả Kiến Trúc Giao Diện & Phân Rã Component

### 2.1. Cây Phân Cấp Component (Component Hierarchy)

```
<GlobalToolbar> [Chiều cao chuẩn 40px, viền dưới kỹ thuật Cyber-Lab]
  ├── <ToolbarLeftGroup> [Cụm tác vụ mạng]
  │     ├── <ToolbarButton action="fetch" label="Fetch All" icon="cloud-download" />
  │     ├── <ToolbarDropdownButton action="pull" label="Pull" icon="arrow-down">
  │     │     ├── <SyncBadge direction="behind" count={behindCount} />
  │     │     └── <DropdownMenu> [Pull (Merge), Pull --rebase]
  │     ├── <ToolbarDropdownButton action="push" label="Push" icon="arrow-up">
  │     │     ├── <SyncBadge direction="ahead" count={aheadCount} />
  │     │     └── <DropdownMenu> [Push, Push with Lease]
  │     ├── <ToolbarDivider />
  │     ├── <ToolbarButton action="stash" label="Stash" icon="archive" />
  │     ├── <ToolbarButton action="pop" label="Pop" icon="archive-restore" />
  │     └── <ToolbarButton action="refresh" label="Refresh" icon="refresh-cw" />
  │
  └── <ToolbarRightGroup> [Thông tin kho & Tiện ích]
        ├── <RepoBranchIndicator repoName={repo} branchName={currentBranch} />
        ├── <AudioToggleSwitch isMuted={isMuted} />
        └── <SidebarToggleQuickButton isCollapsed={isSidebarCollapsed} />
```

### 2.2. Chi Tiết Các Khối Component

1. **`GlobalToolbar.tsx`**:
   - Vỏ bọc thanh công cụ trên đỉnh toàn cục, chiều cao cố định 40px.
   - Nền màu Cyber-Lab tối đậm `#0f172a` (Dark) / sáng nhẹ `#f8fafc` (Light), đường viền đáy 1px sắc nét màu `#334155` / `#cbd5e1`.
   - Bố cục Flexbox hai đầu (`justify-content: space-between`), căn giữa theo trục dọc, đệm lề ngang 12px.

2. **`SyncBadge.tsx`**:
   - Huy hiệu số đếm gắn kèm trực tiếp trên nút `Pull` và `Push`.
   - Kích thước: Chiều cao 16px, đệm lề ngang 6px, bo góc 8px dạng capsule.
   - Phông chữ: Monospace 10px đậm (`font-weight: 700`).
   - Phân cấp trạng thái màu Neon:
     - `direction === "behind"` (Cần kéo về): Nền xanh lơ nhạt, viền và chữ phát quang xanh lơ Neon `#06b6d4`.
     - `direction === "ahead"` (Cần đẩy lên): Nền vàng cam nhạt, viền và chữ phát quang hổ phách Neon `#f59e0b`.
     - Trạng thái `count === 0`: Huy hiệu tự động ẩn hoàn toàn để giữ giao diện thoáng mắt.

3. **Dropdown Menu Tùy Chọn Tác Vụ**:
   - Nút mũi tên chevron nhỏ tích hợp bên phải nút `Pull` và `Push`.
   - Khi nhấp chọn: Mở menu popup nổi có đinh tán chữ thập góc bừng sáng, cung cấp các tùy chọn chuyên sâu (Merge vs Rebase, Force with Lease).
   - Đóng tự động khi click ra ngoài (Click-Outside Handler) hoặc nhấn phím `Esc`.

---

## 3. Quản Lý Trạng Thái Bằng Preact Signals (`sync.store.ts`)

### 3.1. Danh Mục Tín Hiệu Cơ Sở (Base Signals)
- `aheadCount`: Số lượng commit cục bộ chưa đẩy lên remote (kiểu số nguyên, mặc định 0).
- `behindCount`: Số lượng commit trên remote chưa kéo về (kiểu số nguyên, mặc định 0).
- `upstreamBranch`: Tên nhánh upstream theo dõi (chuỗi ký tự hoặc null).
- `isFetching`: Cờ đánh dấu tiến trình fetch đang chạy (boolean).
- `isPulling`: Cờ đánh dấu tiến trình pull đang chạy (boolean).
- `isPushing`: Cờ đánh dấu tiến trình push đang chạy (boolean).

### 3.2. Danh Mục Tín Hiệu Dẫn Xuất (Computed Signals)
- `hasPendingSync`: Tự động bằng `true` khi `aheadCount > 0` hoặc `behindCount > 0`.
- `pullButtonLabel`: Trả về `"Pull"` khi `behindCount === 0`, hoặc `"Pull " + behindCount` khi có commit mới.
- `pushButtonLabel`: Trả về `"Push"` khi `aheadCount === 0`, hoặc `"Push " + aheadCount` khi có commit chờ đẩy.
- `isNetworkBusy`: Tự động bằng `true` khi một trong các cờ `isFetching`, `isPulling`, `isPushing` đang bật.

### 3.3. Các Hàm Điều Phối Hành Động (Dispatchers)
- `fetch(prune = true)`: Bật cờ loading, gửi action `fetchAll` qua bridge, bắt lỗi mạng.
- `pull(mode = 'merge')`: Bật cờ loading, gửi action `pull` qua bridge.
- `push(forceWithLease = false)`: Bật cờ loading, gửi action `push` qua bridge.
- `stash(message, includeUntracked)`: Gửi action `stashSave`.
- `pop(index = 0)`: Gửi action `stashPop`.
- `loadSyncStatus()`: Gửi query `syncStatus`, cập nhật các tín hiệu `aheadCount`, `behindCount`, `upstreamBranch`.

---

## 4. Quy Chuẩn Thẩm Mỹ Cyber-Lab & Tương Tác Vi Mô

- **Hiệu ứng nút bấm**: Nút ở trạng thái chờ có viền mờ 50%; khi rê chuột (Hover) viền bừng sáng nhẹ và nền sáng dần 10%; khi click có hiệu ứng lún nhẹ 1px mang lại cảm giác xúc giác cơ khí.
- **Trạng thái đang tải (Loading Spinner)**: Khi `isFetching`/`isPulling`/`isPushing` kích hoạt, icon nút bấm tự động thay thế bằng biểu tượng xoay mượt mà 360 độ, nút bị vô hiệu hóa tạm thời (`disabled`) để chống bão request.
- **Âm thanh phản hồi**:
  - Khi `push` thành công: Phát hợp âm thăng hoa quãng 5 vi mô qua Web Audio API (kế thừa thiết kế 04).
  - Khi có xung đột: Phát xung trầm cảnh báo.

---

## 5. Ma Trận Kiểm Thử Đơn Vị Song Hành (Unit Testing Matrix)

| Tệp Kiểm Thử Độc Lập | Module Mục Tiêu | Kịch Bản Kiểm Thử Bắt Buộc |
| :--- | :--- | :--- |
| `tests/webview/lib/stores/sync.store.test.ts` | `sync.store.ts` | 1. Cập nhật chính xác `aheadCount` và `behindCount` từ phản hồi query.<br>2. Tính toán đúng computed `hasPendingSync` và nhãn động của nút.<br>3. Bật/tắt cờ loading tương ứng khi thực thi các action mạng. |
| `tests/webview/components/toolbar/GlobalToolbar.test.ts` | `GlobalToolbar.tsx` | 1. Render đầy đủ cụm nút tác vụ mạng và thông tin kho.<br>2. Hiển thị đúng huy hiệu Neon `Pull ↓ 2` và `Push ↑ 1` khi có chênh lệch.<br>3. Ẩn huy hiệu khi kho đồng bộ sạch sẽ (`ahead = 0, behind = 0`).<br>4. Click các nút bấm phát chính xác các action RPC tương ứng.<br>5. Mở và đóng dropdown menu tùy chọn qua click và phím `Esc`. |
