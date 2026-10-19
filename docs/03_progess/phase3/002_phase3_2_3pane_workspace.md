# Tiến Độ Chặng 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ

Tài liệu này ghi nhận tổng quan mục tiêu, danh mục tệp tin tác động, phân rã đầu việc chi tiết tích hợp kiểm thử song hành cho từng module độc lập (Test-Driven Task Breakdown), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 3.2: Xây dựng Kiến trúc 3-Pane Workspace & Thanh công cụ đồng bộ toàn cục**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế và theo dõi tiến độ bằng ngôn ngữ tự nhiên (**Design by Word**), mỗi nhóm nhiệm vụ độc lập bắt buộc phải có phần kiểm thử chuyên biệt đi kèm ngay trong nhóm đó; áp dụng triệt để 4 nguyên tắc phòng ngừa cốt tử đúc kết từ [Báo Cáo Tổng Hợp Đánh Giá Lỗi Kỹ Thuật Phase 3.1 (008_phase3_1_defect_synthesis_and_lessons_learned.md)](../../04_reports/phase3/008_phase3_1_defect_synthesis_and_lessons_learned.md).

---

## 📚 Hồ Sơ Thiết Kế Kỹ Thuật Tham Chiếu Trực Tiếp

Mọi công việc triển khai trong Chặng 3.2 bắt buộc đối soát và bám sát hệ thống 5 bản đặc tả thiết kế kỹ thuật sau:

1. **[05. Thiết Kế Backend Mutator Đồng Bộ, Quản Lý Stash & RPC Protocol](../../02_design/phase3/05_Sync_And_Stash_Backend_Mutator_Design.md)**:
   - Mở rộng `GitCliMutator.ts` (`fetchAll`, `pull`, `push`, `stashSave`, `stashPop`, `stashDrop`).
   - Bộ truy vấn số đếm đồng bộ `syncStatus.ts` (`git rev-list --left-right --count HEAD...@{u}`) và ngăn xếp lưu trữ `stashList.ts`.
   - Hợp đồng từ điển dữ liệu RPC trong `src/types/actions.ts` và `src/types/queries.ts` (Contract-First).
2. **[06. Thiết Kế Thanh Công Cụ Đỉnh Toàn Cục & Huy Hiệu Đồng Bộ](../../02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md)**:
   - Thiết kế `GlobalToolbar.tsx` thay thế `MainHeader.tsx`, tích hợp các nút tác vụ nhanh mạng và stash.
   - Huy hiệu số đếm phát sáng Neon `SyncBadge.tsx` (`↑ahead` / `↓behind`), dropdown menu tùy chọn.
   - Kho trạng thái phản ứng `sync.store.ts` và cam kết phản xạ đồng bộ Realtime State Guarantee qua `dispatcher.ts`.
3. **[07. Thiết Kế Cây Điều Hướng Left Sidebar Navigator](../../02_design/phase3/07_Sidebar_Navigator_Tree_Design.md)**:
   - Thiết kế cây điều hướng bên trái `SidebarNavigator.tsx` gồm 5 nhóm: Working Tree, Local Branches, Remotes, Tags, Stashes.
   - Nhánh `HEAD` active với viền tím Neon, huy hiệu số commit chưa push cạnh từng nhánh, double-click checkout nhánh.
   - Thanh Resizer kéo thả mượt mà (160px – 450px), nút thu gọn nhanh, lưu cấu hình vào `localStorage`.
4. **[08. Thiết Kế Thanh Tìm Kiếm, Lọc Commit & Điều Hướng Đồ Thị DAG](../../02_design/phase3/08_Search_Filter_And_DAG_Navigation_Design.md)**:
   - Thanh tìm kiếm commit `SearchFilterBar.tsx` kích hoạt bằng phím tắt toàn cục `Ctrl + F`.
   - Thuật toán bóc tách cú pháp lọc: Tìm kiếm tự do trong thông điệp, lọc theo tác giả `author:`, lọc theo mã băm `hash:`.
   - Highlight phát quang Neon trên đồ thị và cuộn mượt mà trên bảng ảo hóa Virtualized Table.
5. **[09. Thiết Kế Bố Cục Co Giãn Responsive 3-Pane & Nghiệm Thu Bất Biến Hình Học](../../02_design/phase3/09_Workspace_Layout_And_Responsive_3Pane_Design.md)**:
   - Khung bố cục tổng thể `WorkspaceLayout.tsx` ghép nối 3 phân vùng độc lập (Sidebar - DAG Table - Inspector).
   - Tích hợp `ResizeObserver` theo dõi kích thước động kết hợp `requestAnimationFrame`.
   - Kiểm định bất biến hình học tuyệt đối (Zero Layout Shift): Độ lệch tọa độ các nút `HexagonNode` và đường cong Bézier bằng 0 pixel khi co giãn hoặc đóng mở Sidebar.
6. **[008_phase3_1_defect_synthesis_and_lessons_learned.md (Bài học & 4 nguyên tắc phòng ngừa)](../../04_reports/phase3/008_phase3_1_defect_synthesis_and_lessons_learned.md)**:
   - 4 nguyên tắc phòng ngừa bắt buộc: Contract-First, Realtime State Guarantee, Zero Layout Shift, Kỷ luật kiểm thử.

---

## 1. Tổng Quan Giai Đoạn & Danh Mục Tệp Tin Tác Động

### 1.1. Tầm Nhìn & Mục Tiêu Cốt Lõi

- **Mục tiêu**: Nâng cấp giao diện hiển thị đơn lẻ của F-GitGraph thành một **Không gian làm việc 3 phân vùng (3-Pane Workspace)** chuẩn mực của các ứng dụng Git Client chuyên nghiệp (như Fork, GitKraken, Tower). Cung cấp cây điều hướng toàn diện (Branches, Remotes, Tags, Stashes, Working Tree) và thanh tác vụ đồng bộ toàn cục (`Fetch`, `Pull`, `Push`, `Stash`) với số đếm trực quan (`↑ahead` / `↓behind`).
- **Trạng thái hiện tại**: **Sẵn sàng triển khai mã nguồn** (Phase 3.1 đã nghiệm thu đạt chuẩn v1.1.0).
- **Tiến độ tổng thể**: 20% hoàn thành (Nhóm Việc 1 hoàn tất).

### 1.2. Bảng Kiểm Kê Tệp Tin Tác Động (Impacted Files Inventory)

| Phân Loại | Đường Dẫn Tệp Tin | Trách Nhiệm Kỹ Thuật Chính |
| :--- | :--- | :--- |
| **Backend Core** | `src/extension/mutator/gitCliMutator.ts` | Bổ sung: `fetchAll`, nâng cấp `pull(mode)`, `push(forceWithLease, remote, branch)`, `stashSave`, `stashPop`, `stashDrop`. |
| **Backend Query** | `src/backend/queries/syncStatus.ts` | Truy vấn số đếm chênh lệch `git rev-list --left-right --count HEAD...@{u}` (`ahead`, `behind`, `upstream`). |
| **Backend Query** | `src/backend/queries/stashList.ts` | Bóc tách danh sách ngăn xếp `git stash list --pretty=format:...` thành `StashRecord[]`. |
| **Backend Types** | `src/types/actions.ts` | Khai báo payload cho `fetchAll`, `pull`, `push`, `stashSave`, `stashPop`, `stashDrop`. |
| **Backend Types** | `src/types/queries.ts` | Khai báo query payload cho `syncStatus` và `stashList`. |
| **Backend IPC** | `src/extension/services/messageHandler.ts` | Đăng ký các action mutate mạng/stash và query sync/stash mới từ Webview. |
| **Backend Test** | `tests/backend/mutator/syncMutator.test.ts` | Unit test cho các phương thức mutator: `fetchAll`, `pull`, `push`, `stashSave`, `stashPop`. |
| **Backend Test** | `tests/backend/queries/syncStatus.test.ts` | Unit test bóc tách số đếm ahead/behind khi có upstream, không có upstream, hoặc detached HEAD. |
| **Backend Test** | `tests/backend/queries/stashList.test.ts` | Unit test bóc tách chuỗi stash list thành mảng đối tượng định kiểu. |
| **UI State** | `src/webview/lib/stores/sync.store.ts` | Quản lý trạng thái đồng bộ (`aheadCount`, `behindCount`, `upstreamBranch`, `isFetching`, `isPulling`, `isPushing`). |
| **UI State** | `src/webview/lib/stores/sidebar.store.ts` | Quản lý trạng thái cây điều hướng: đóng/mở sidebar, độ rộng (width), các node mở rộng (expanded sections). |
| **UI Component** | `src/webview/components/toolbar/GlobalToolbar.tsx` | Thanh công cụ đỉnh thay thế `MainHeader.tsx`: cụm nút Fetch/Pull/Push kèm badge đếm, nút Stash/Pop, nút Refresh. |
| **UI Component** | `src/webview/components/toolbar/SyncBadge.tsx` | Huy hiệu số lượng commit chưa đồng bộ (`Pull ↓ 2`, `Push ↑ 1`) phát sáng Neon theo ngữ cảnh. |
| **UI Component** | `src/webview/components/sidebar/SidebarNavigator.tsx` | Khung điều hướng bên trái có thanh resizer kéo dãn và nút thu gọn/mở rộng nhanh. |
| **UI Component** | `src/webview/components/sidebar/SidebarSection.tsx` | Khung phân nhóm có thể gập/mở (Collapsible Section) kèm nút tạo mới `+` và huy hiệu đếm. |
| **UI Component** | `src/webview/components/sidebar/SidebarItem.tsx` | Dòng hiển thị tệp Working Tree, nhánh (HEAD highlight), remote, tag, stash kèm context menu. |
| **UI Component** | `src/webview/components/search/SearchFilterBar.tsx` | Thanh tìm kiếm commit (`Ctrl + F`), hỗ trợ bộ lọc message/author/hash, nút chuyển hướng Next/Prev. |
| **UI Component** | `src/webview/components/layout/WorkspaceLayout.tsx` | Bố cục tổng thể 3 phân vùng co giãn linh hoạt, tích hợp `ResizeObserver` chống lệch đồ thị. |
| **UI Realtime** | `src/webview/lib/dispatcher.ts` | Đăng ký 100% action mạng/stash vào map `handlers` để kích hoạt `refresh()` và `refreshStatus()`. |
| **UI Test** | `tests/webview/lib/stores/sync.store.test.ts` | Unit test store tín hiệu `sync.store.ts` (tính toán nhãn nút, cập nhật trạng thái loading). |
| **UI Test** | `tests/webview/components/toolbar/GlobalToolbar.test.ts` | Unit test thanh công cụ: render nút, click gọi action, hiển thị badge ahead/behind. |
| **UI Test** | `tests/webview/components/sidebar/SidebarNavigator.test.ts` | Unit test render cây 5 nhóm, double-click checkout nhánh, nút toggle collapse. |
| **UI Test** | `tests/webview/components/search/SearchFilterBar.test.ts` | Unit test phím tắt `Ctrl + F`, lọc commit, đếm kết quả `(N of M)`. |
| **UI Integr. Test**| `tests/webview/layout/WorkspaceLayout.geometry.test.ts` | Kiểm thử bất biến hình học: Snapshot đường Bézier và tọa độ `HexagonNode` khi co giãn hoặc toggle Sidebar. |

---

## 2. Phân Rã Đầu Việc Chi Tiết Kèm Kiểm Thử Đồng Hành Từng Nhóm

---

### 📋 Nhóm Việc 1: Mở Rộng Backend Mutator, Bộ Truy Vấn & Hợp Đồng RPC (Contract-First)

_Tài liệu tham chiếu thiết kế_: [05_Sync_And_Stash_Backend_Mutator_Design.md](../../02_design/phase3/05_Sync_And_Stash_Backend_Mutator_Design.md).

_Mục tiêu_: Hoàn thiện toàn bộ các phương thức thực thi Git CLI gốc, bộ truy vấn số đếm đồng bộ và danh sách stash, đồng thời khai báo hợp đồng RPC trước khi dựng giao diện UI (tuân thủ **Nguyên Tắc 1**).

- [x] **Nhiệm vụ 1.1: Mở rộng các lệnh mạng & Stash trong `src/extension/mutator/gitCliMutator.ts`**
  - [x] **1.1.1**: Hiện thực hàm `fetchAll(prune = true)`: Thực thi `git fetch --all ${prune ? '--prune' : ''}`. Bọc qua `normalizeError()` để chuẩn hóa thông báo lỗi kết nối mạng.
  - [x] **1.1.2**: Nâng cấp hàm `pull(mode: 'merge' | 'rebase')`: Thực thi `git pull` hoặc `git pull --rebase`. Bắt và xử lý xung đột tự động (conflict detection).
  - [x] **1.1.3**: Nâng cấp hàm `push(options: { forceWithLease?: boolean; remote?: string; branch?: string })`: Hỗ trợ đẩy lên upstream mặc định hoặc chỉ định rõ remote/branch, hỗ trợ cờ an toàn `--force-with-lease`.
  - [x] **1.1.4**: Hiện thực hàm `stashSave(message?: string, includeUntracked = false)`: Thực thi `git stash push` kèm tham số `-u` (nếu có untracked) và `-m <message>`.
  - [x] **1.1.5**: Hiện thực hàm `stashPop(index = 0)`: Thực thi `git stash pop stash@{index}`.
  - [x] **1.1.6**: Hiện thực hàm `stashDrop(index = 0)`: Thực thi `git stash drop stash@{index}`.

- [x] **Nhiệm vụ 1.2: Xây dựng các bộ truy vấn Backend mới**
  - [x] **1.2.1**: Xây dựng `src/backend/queries/syncStatus.ts`:
    - Xác định tên upstream tracking branch của nhánh hiện tại qua `git rev-parse --abbrev-ref --symbolic-full-name @{u}`.
    - Thực thi `git rev-list --left-right --count HEAD...@{u}` để trích xuất chính xác 2 chỉ số: `ahead` (commit cục bộ chưa push) và `behind` (commit remote chưa pull).
    - Trả về `SyncStatusResult: { ahead: number; behind: number; upstream: string | null; isDetached: boolean }`.
  - [x] **1.2.2**: Xây dựng `src/backend/queries/stashList.ts`:
    - Thực thi `git stash list --pretty=format:%gd%x00%h%x00%gs%x00%cr` bóc tách bằng NUL-delimiter.
    - Trả về mảng `StashRecord: { index: number; hash: string; message: string; date: string }[]`.

- [x] **Nhiệm vụ 1.3: Khai báo Hợp đồng RPC & Đăng ký Message Handlers**
  - [x] **1.3.1**: Cập nhật `src/types/actions.ts`: Khai báo payload cho `fetchAll`, `pull`, `push`, `stashSave`, `stashPop`, `stashDrop`.
  - [x] **1.3.2**: Cập nhật `src/types/queries.ts`: Khai báo query payload cho `syncStatus` và `stashList`.
  - [x] **1.3.3**: Cập nhật `src/extension/services/messageHandler.ts`: Đăng ký tiếp nhận và định tuyến các action/query mới tới `GitCliMutator` và các hàm query tương ứng qua helper `runMutation`.

- [x] **Nhiệm vụ 1.4 (TEST NHÓM 1): Bộ Unit Tests Độc Lập Cho Tầng Backend**
  - [x] **1.4.1**: Tạo `tests/backend/mutator/syncMutator.test.ts`: Test các lệnh `fetchAll`, `pull`, `push`, `stashSave`, `stashPop`, `stashDrop` trên kho git thật giả lập.
  - [x] **1.4.2**: Tạo `tests/backend/queries/syncStatus.test.ts`: Test bóc tách ahead/behind khi có upstream, khi lệch commit, và khi không có remote.
  - [x] **1.4.3**: Tạo `tests/backend/queries/stashList.test.ts`: Test bóc tách danh sách stash với tiếng Việt unicode và ký tự đặc biệt.
  - [x] **1.4.4**: Tạo `tests/extension/services/syncMessageHandler.test.ts`: Test định tuyến RPC từ Webview xuống Mutator mạng/stash và các Query sync/stash.

---

### 📋 Nhóm Việc 2: Thiết Kế & Triển Khai Thanh Công Cụ Đỉnh Toàn Cục (Top Toolbar)

_Tài liệu tham chiếu thiết kế_: [06_Global_Toolbar_And_Sync_Badge_Design.md](../../02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md).

_Mục tiêu_: Thay thế `MainHeader.tsx` bằng `GlobalToolbar.tsx` mang phong cách Cyber-Lab, tích hợp các nút tác vụ nhanh và huy hiệu đồng bộ tự động cập nhật (tuân thủ **Nguyên Tắc 2: Realtime State Guarantee**).

- [ ] **Nhiệm vụ 2.1: Xây dựng Store quản lý đồng bộ `src/webview/lib/stores/sync.store.ts`**
  - [ ] **2.1.1**: Khởi tạo các tín hiệu Preact Signals: `aheadCount`, `behindCount`, `upstreamBranch`, `isFetching`, `isPulling`, `isPushing`.
  - [ ] **2.1.2**: Khởi tạo computed signals: `hasPendingSync`, `syncStatusText`, `pullButtonLabel`, `pushButtonLabel`.
  - [ ] **2.1.3**: Hiện thực các hàm điều phối hành động: `fetch()`, `pull()`, `push()`, `stash()`, `pop()`.

- [ ] **Nhiệm vụ 2.2: Xây dựng Component huy hiệu `src/webview/components/toolbar/SyncBadge.tsx`**
  - [ ] **2.2.1**: Thiết kế huy hiệu số đếm phát sáng Neon:
    - Trạng thái `behind > 0`: Huy hiệu màu xanh lơ Neon `#06b6d4` (`Pull ↓ N`).
    - Trạng thái `ahead > 0`: Huy hiệu màu hổ phách Neon `#f59e0b` (`Push ↑ N`).
    - Trạng thái đồng bộ sạch (`ahead == 0 && behind == 0`): Ẩn badge hoặc hiển thị icon checkmark xám nhẹ.

- [ ] **Nhiệm vụ 2.3: Xây dựng Component `src/webview/components/toolbar/GlobalToolbar.tsx`**
  - [ ] **2.3.1**: Đóng khung Toolbar trong phong cách Cyber-Lab chiều cao chuẩn 40px, viền dưới kỹ thuật, bọc trong `CornerCrossFrame` hoặc đường kẻ đinh tán tối giản.
  - [ ] **2.3.2**: Nhóm nút tác vụ mạng bên trái:
    - **Nút `Fetch All`**: Icon xoay đồng bộ, hiển thị spinner khi `isFetching`.
    - **Nút `Pull`**: Tích hợp `SyncBadge`, dropdown tùy chọn (`Pull (Merge)` / `Pull --rebase`).
    - **Nút `Push`**: Tích hợp `SyncBadge`, dropdown tùy chọn (`Push` / `Push with Lease`).
    - **Nút `Stash` & `Pop`**: Lưu nhanh hoặc khôi phục nhanh thay đổi tạm thời.
    - **Nút `Refresh`**: Kích hoạt làm mới toàn diện cả đồ thị, working tree và số đếm sync.
  - [ ] **2.3.3**: Nhóm thông tin kho bên phải: Tên repo hiện tại, tên branch hiện tại đang checkout (`HEAD`), nút ngắt/bật âm thanh vi mô (Audio toggle).

- [ ] **Nhiệm vụ 2.4: Đăng ký Router Realtime trong `src/webview/lib/dispatcher.ts`**
  - [ ] **2.4.1**: Đăng ký 100% action mạng (`fetchAll`, `pull`, `push`, `stashSave`, `stashPop`, `stashDrop`) vào map `handlers` trong `dispatcher.ts`.
  - [ ] **2.4.2**: Sau khi action hoàn tất thành công, tự động gọi `refresh()` (nạp lại đồ thị DAG), `refreshStatus()` (nạp lại Staging) và `refreshSyncStatus()` (cập nhật lại số đếm ahead/behind).

- [ ] **Nhiệm vụ 2.5 (TEST NHÓM 2): Bộ Unit Tests Cho Top Toolbar & Sync Store**
  - [ ] **2.5.1**: Tạo `tests/webview/lib/stores/sync.store.test.ts`: Test logic tính toán badge, chuyển đổi trạng thái loading khi gọi API.
  - [ ] **2.5.2**: Tạo `tests/webview/components/toolbar/GlobalToolbar.test.ts`: Test render thanh công cụ, hiển thị đúng huy hiệu `↑ahead` / `↓behind`, click nút phát đúng action RPC.

---

### 📋 Nhóm Việc 3: Thiết Kế & Triển Khai Cây Điều Hướng Left Sidebar Navigator

_Tài liệu tham chiếu thiết kế_: [07_Sidebar_Navigator_Tree_Design.md](../../02_design/phase3/07_Sidebar_Navigator_Tree_Design.md).

_Mục tiêu_: Xây dựng cây điều hướng bên trái bao quát toàn bộ tài nguyên của kho Git (Working Tree, Branches, Remotes, Tags, Stashes), hỗ trợ co giãn kích thước (Resizable) và thu gọn mượt mà.

- [ ] **Nhiệm vụ 3.1: Quản lý trạng thái Sidebar trong `src/webview/lib/stores/sidebar.store.ts`**
  - [ ] **3.1.1**: Tín hiệu cơ sở: `isCollapsed` (boolean), `sidebarWidth` (mặc định 220px, giới hạn từ 160px đến 450px), `expandedSections` (Set chứa id các nhóm đang mở).
  - [ ] **3.1.2**: Lưu trữ tự động `sidebarWidth` và `isCollapsed` vào `localStorage` của Webview để phục hồi nguyên vẹn khi người dùng khởi động lại VS Code.

- [ ] **Nhiệm vụ 3.2: Xây dựng các Component thành phần của Sidebar**
  - [ ] **3.2.1**: `src/webview/components/sidebar/SidebarSection.tsx`: Tiêu đề nhóm mang phong cách Monospace in hoa, mũi tên chevron gập mở, huy hiệu số lượng phần tử, nút tạo mới nhanh (`+` trên nhóm Branches).
  - [ ] **3.2.2**: `src/webview/components/sidebar/SidebarItem.tsx`: Dòng hiển thị từng phần tử:
    - **Mục Working Tree**: Hiển thị `Changes (N)` với huy hiệu biến động, click mở thẳng Staging Area.
    - **Mục Local Branches**: Icon nhánh, tên nhánh, viền tím neon và icon checkmark cho nhánh `HEAD`, huy hiệu số commit chưa push cạnh tên nhánh (ví dụ: `feature/xyz ↑2`).
    - **Mục Remotes**: Phân cấp theo remote (`origin`, `upstream`), bên trong chứa danh sách nhánh remote.
    - **Mục Tags**: Icon nhãn, tên tag.
    - **Mục Stashes**: Icon ngăn xếp, số thứ tự `stash@{N}` và nội dung tóm tắt.
  - [ ] **3.2.3**: `src/webview/components/sidebar/SidebarNavigator.tsx`: Container bao bọc toàn bộ cây điều hướng, thanh phân cách Resizer kéo thả chuột mượt mà, nút toggle collapse ở góc trên cùng.

- [ ] **Nhiệm vụ 3.3: Tích hợp hành động tương tác người dùng**
  - [ ] **3.3.1**: Double-click vào một nhánh cục bộ: Kích hoạt checkout nhánh đó ngay lập tức (`checkoutBranch`).
  - [ ] **3.3.2**: Click chuột phải trên nhánh/tag/stash: Mở Context Menu tương ứng đã hoàn thiện ở Phase 1.
  - [ ] **3.3.3**: Click vào một stash: Mở Inspector xem chi tiết các tệp trong bản lưu trữ tạm.

- [ ] **Nhiệm vụ 3.4 (TEST NHÓM 3): Bộ Unit Tests Cho Sidebar Navigator**
  - [ ] **3.4.1**: Tạo `tests/webview/lib/stores/sidebar.store.test.ts`: Test kéo dãn độ rộng, giới hạn min/max, toggle collapse và lưu localStorage.
  - [ ] **3.4.2**: Tạo `tests/webview/components/sidebar/SidebarNavigator.test.ts`: Test render cây 5 nhóm, double-click checkout, bấm `+` tạo nhánh.

---

### 📋 Nhóm Việc 4: Thanh Tìm Kiếm & Lọc Commit Nâng Cao (Search & Filter Bar)

_Tài liệu tham chiếu thiết kế_: [08_Search_Filter_And_DAG_Navigation_Design.md](../../02_design/phase3/08_Search_Filter_And_DAG_Navigation_Design.md).

_Mục tiêu_: Tích hợp bộ tìm kiếm và lọc commit tức thì ngay trên đồ thị DAG, hỗ trợ phím tắt toàn cục và highlight trực quan.

- [ ] **Nhiệm vụ 4.1: Xây dựng Store tìm kiếm `src/webview/lib/stores/search.store.ts`**
  - [ ] **4.1.1**: Tín hiệu cơ sở: `searchQuery`, `searchMode` (`all` | `message` | `author` | `hash`), `matchingCommitIndices`, `currentMatchIndex`.
  - [ ] **4.1.2**: Thuật toán tìm kiếm cục bộ siêu tốc trên danh sách commit hiện có:
    - Lọc theo cú pháp tiền tố: `author:Nam`, `hash:a1b2`, hoặc tìm kiếm tự do trong thông điệp.
    - Tính toán danh sách chỉ số dòng khớp và tổng số lượng kết quả.

- [ ] **Nhiệm vụ 4.2: Xây dựng Component `src/webview/components/search/SearchFilterBar.tsx`**
  - [ ] **4.2.1**: Ô nhập văn bản tìm kiếm đặt trên đỉnh bảng commit hoặc thanh Toolbar.
  - [ ] **4.2.2**: Bắt tổ hợp phím tắt toàn cục `Ctrl + F` (hoặc `Cmd + F` trên macOS) để tự động focus vào ô tìm kiếm; phím `Esc` để xóa tìm kiếm và đóng thanh lọc.
  - [ ] **4.2.3**: Bộ điều hướng kết quả: Nút `Next (↓)` / `Previous (↑)` kèm bộ đếm `(3 of 12)`.
  - [ ] **4.2.4**: Tự động cuộn mượt mà (Smooth scroll) đến dòng commit tương ứng trên bảng ảo hóa `CommitTable`.

- [ ] **Nhiệm vụ 4.3 (TEST NHÓM 4): Bộ Unit Tests Cho Search & Filter Bar**
  - [ ] **4.3.1**: Tạo `tests/webview/components/search/SearchFilterBar.test.ts`: Test phím tắt `Ctrl + F`, lọc commit theo author/hash/message, chuyển đổi kết quả Next/Prev.

---

### 📋 Nhóm Việc 5: Bố Cục Co Giãn Responsive 3-Pane & Nghiệm Thu Bất Biến Hình Học

_Tài liệu tham chiếu thiết kế_: [09_Workspace_Layout_And_Responsive_3Pane_Design.md](../../02_design/phase3/09_Workspace_Layout_And_Responsive_3Pane_Design.md).

_Mục tiêu_: Ghép nối toàn bộ hệ thống vào bố cục `WorkspaceLayout.tsx`, kiểm chứng tính bất biến hình học tuyệt đối (Zero Layout Shift) khi Sidebar co giãn hoặc ẩn hiện (tuân thủ **Nguyên Tắc 3**).

- [ ] **Nhiệm vụ 5.1: Xây dựng Container Bố Cục `src/webview/components/layout/WorkspaceLayout.tsx`**
  - [ ] **5.1.1**: Tổ chức cấu trúc Flexbox/Grid 3 phân vùng:
    - **Vùng 1 (Trái)**: `<SidebarNavigator />` (có thể thu gọn hoặc kéo dãn).
    - **Vùng 2 (Giữa)**: `<CommitTable />` (bảng đồ thị DAG ảo hóa).
    - **Vùng 3 (Phải hoặc Ngăn kéo dưới)**: `<StagingArea />` hoặc `<CommitDetails />`.
  - [ ] **5.1.2**: Tích hợp `ResizeObserver` bao bọc vùng đồ thị: Tự động cập nhật `viewportWidth` khi độ rộng Sidebar thay đổi mà không gây giật lag (sử dụng `requestAnimationFrame`).

- [ ] **Nhiệm vụ 5.2: Kiểm thử hồi quy giao diện & Nghiệm thu bất biến hình học (Zero Layout Shift)**
  - [ ] **5.2.1**: Tạo `tests/webview/layout/WorkspaceLayout.geometry.test.ts`:
    - Đo đạc và snapshot tọa độ nút lục giác `HexagonNode` và các đường cong SVG Bézier của F# Core trước và sau khi:
      1. Sidebar đang mở (220px).
      2. Kéo dãn Sidebar lên 350px.
      3. Thu gọn hoàn toàn Sidebar (Collapsed = 0px).
    - **Tiêu chuẩn bắt buộc**: Tọa độ $Y$ của các hàng, cấu trúc đường cong Bézier và avatar clipPath không được dịch chuyển hay biến dạng sai lệch dù chỉ 1 pixel.

---

## 3. Lộ Trình Triển Khai Tuần Tự Từng Bước Kèm Kiểm Thử (TDD Phasing Roadmap)

Toàn bộ quy trình lập trình được tiến hành theo thứ tự 5 bước khép kín chuẩn "Contract-First", viết code song hành với viết test và chạy test pass 100% trước khi chuyển bước:

```
[Bước 1: Nền Tảng Backend & RPC Contracts (Contract-First)]
 ├─ Mở rộng GitCliMutator.ts (fetchAll, pull, push, stashSave, stashPop, stashDrop)
 ├─ Hiện thực query syncStatus.ts & stashList.ts
 ├─ Khai báo Actions & Queries types trong src/types/
 ├─ Đăng ký messageHandler.ts
 └─ VIẾT VÀ CHẠY TEST: syncMutator.test.ts, syncStatus.test.ts, stashList.test.ts (PASS 100%)
       │
       ▼
[Bước 2: Thanh Công Cụ Đỉnh Toàn Cục & Đồng Bộ Realtime]
 ├─ Xây dựng sync.store.ts (Preact Signals)
 ├─ Xây dựng SyncBadge.tsx (Neon badge ↑ahead / ↓behind)
 ├─ Xây dựng GlobalToolbar.tsx (Fetch/Pull/Push/Stash)
 ├─ Đăng ký 100% action vào dispatcher.ts (Realtime State Guarantee)
 └─ VIẾT VÀ CHẠY TEST: sync.store.test.ts, GlobalToolbar.test.ts (PASS 100%)
       │
       ▼
[Bước 3: Cây Điều Hướng Left Sidebar Navigator]
 ├─ Xây dựng sidebar.store.ts (Width, collapse, localStorage)
 ├─ Xây dựng SidebarSection.tsx & SidebarItem.tsx
 ├─ Xây dựng SidebarNavigator.tsx (Resizable resizer)
 ├─ Kết nối double-click checkout & Context Menu Phase 1
 └─ VIẾT VÀ CHẠY TEST: sidebar.store.test.ts, SidebarNavigator.test.ts (PASS 100%)
       │
       ▼
[Bước 4: Thanh Tìm Kiếm & Lọc Commit Nâng Cao]
 ├─ Xây dựng search.store.ts (Message, Author, Hash)
 ├─ Xây dựng SearchFilterBar.tsx (Ctrl+F, Next/Prev, Smooth scroll)
 └─ VIẾT VÀ CHẠY TEST: SearchFilterBar.test.ts (PASS 100%)
       │
       ▼
[Bước 5: Bố Cục 3-Pane Responsive & Nghiệm Thu Hình Học]
 ├─ Xây dựng WorkspaceLayout.tsx (ResizeObserver)
 ├─ Đo đạc tính bất biến hình học khi co giãn Sidebar (Zero Layout Shift)
 └─ VIẾT VÀ CHẠY TEST: WorkspaceLayout.geometry.test.ts & Toàn bộ test suite (PASS 100%)
```

---

## 4. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. **Kiến trúc 3 phân vùng hoàn chỉnh**: Giao diện sở hữu đủ 3 phân vùng tiêu chuẩn: Sidebar Navigator (Trái), Đồ thị DAG ảo hóa (Giữa), và Staging/Inspector (Phải/Dưới).
2. **Đồng bộ mạng trung thực**: Các nút `Fetch All`, `Pull`, `Push` hoạt động chuẩn xác qua Git CLI gốc, hiển thị chính xác số lượng commit chênh lệch qua huy hiệu `↑ahead` / `↓behind`.
3. **Cây điều hướng đa năng**: Cây Sidebar thể hiện chính xác 100% cấu trúc Local Branches, Remotes, Tags, Stashes và Working Tree; double-click chuyển nhánh tức thì, lưu trạng thái co giãn vào LocalStorage.
4. **Tìm kiếm tức thì**: Thanh tìm kiếm `Ctrl + F` lọc nhanh commit theo Message, Author, Hash, có highlight và điều hướng chuyển dòng mượt mà.
5. **Bảo toàn hình học tuyệt đối (Zero Layout Shift)**: Mở, đóng hoặc kéo dãn Sidebar không làm xô lệch bất kỳ pixel tọa độ nào của các nút lục giác `HexagonNode` và đường cong Bézier nhân F# Core.
6. **Độ phủ kiểm thử tự động**: Toàn bộ các tệp test `*.test.ts` mới viết độc lập cho từng nhóm việc đều vượt qua 100% (Green), không có lỗi typecheck TypeScript, lint warning hay compile error.

---

## 5. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-15**: Khởi tạo tài liệu tiến độ Chặng 3.2.
- **2026-10-19**: Tái cấu trúc và nâng cấp toàn diện tài liệu tiến độ Chặng 3.2 theo các bài học và 4 nguyên tắc phòng ngừa đúc kết từ Báo cáo tổng kết Phase 3.1 (`008_phase3_1_defect_synthesis_and_lessons_learned.md`):
  - Chuyển đổi trật tự thực thi sang chuẩn **Contract-First**: Đưa Nhóm Việc 1 (Backend Mutator, Query & RPC Contracts) lên vị trí đầu tiên trước khi xây dựng UI.
  - Bổ sung bảng kiểm kê 24 tệp tin tác động trên toàn bộ hệ thống.
  - Tích hợp kiểm thử song hành cho từng nhóm nhiệm vụ riêng biệt với 8 tệp test `*.test.ts` chuẩn quy ước.
  - Bổ sung yêu cầu bảo toàn hình học F# Core với `ResizeObserver` và test snapshot Zero Layout Shift khi co giãn Sidebar.
  - **Cập nhật kiến trúc truy vấn Backend (`[DESIGN_DEFECT]`)**: Đồng bộ hóa toàn bộ hệ thống thiết kế từ Design 05 đến Design 09; chuyển đổi giải pháp truy vấn `getSyncStatus` và `getStashList` từ `child_process.spawn` tự phát sang `SimpleGit.raw(...)`, kế thừa `gitPath` tùy chỉnh và bảo vệ Webview khỏi ô nhiễm kiểu dữ liệu Node.js.
  - Cập nhật trạng thái Chặng 3.2: **Sẵn sàng triển khai mã nguồn**.
- **2026-10-19**: Hoàn tất **Nhóm Việc 1** (Contract-First Backend Sync & Stash). Xem báo cáo chi tiết [009_phase3_2_sync_stash_backend_report.md](../../04_reports/phase3/009_phase3_2_sync_stash_backend_report.md):
  - Mở rộng `GitCliMutator` (`fetchAll`, `pull`, `push`, `stashSave`, `stashPop`, `stashDrop`) + chuẩn hóa lỗi mạng/SSH.
  - Xây dựng 2 bộ truy vấn backend `syncStatus.ts` & `stashList.ts` (qua `SimpleGit.raw`).
  - Khai hợp đồng RPC (`src/types/actions.ts`, `src/types/queries.ts`) và đăng ký `messageHandler.ts`.
  - 26 unit test mới trên 4 tệp; 4 cổng chẩn đoán (typecheck/lint/compile/test) đạt 100% PASS.
  - Ghi nhận 2 `[DESIGN_DEFECT]` (spawn→SimpleGit, chuỗi lỗi stash), 2 `[DEV_BUG]`, 1 `[ENV_TOOL_ISSUE]`.
