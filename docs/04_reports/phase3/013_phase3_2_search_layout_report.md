# Báo Cáo Nhóm Việc 4 + 5 (Phase 3.2) — Thanh Tìm Kiếm & Lọc Commit + Bố Cục Responsive 3-Pane

> **Mã báo cáo**: 013_phase3_2_search_layout_report
> **Giai đoạn**: Phase 3.2 — Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục
> **Nhóm việc liên quan**: Nhóm Việc 4 (Search & Filter Bar) + Nhóm Việc 5 (Workspace Layout 3-Pane)
> **Nhiệm vụ**: 4.1 (search.store), 4.2 (SearchFilterBar), 4.3 (unit test), 5.1 (WorkspaceLayout), 5.2 (geometry test)
> **Ngày thực hiện**: 2026-10-19
> **Tài liệu thiết kế áp dụng**: [08_Search_Filter_And_DAG_Navigation_Design.md](../../02_design/phase3/08_Search_Filter_And_DAG_Navigation_Design.md) (v1.2.0), [09_Workspace_Layout_And_Responsive_3Pane_Design.md](../../02_design/phase3/09_Workspace_Layout_And_Responsive_3Pane_Design.md) (v1.1.0)

---

## 1. Mục Tiêu & Phạm Vi

Hoàn thiện hai nhóm việc khép kín chu kỳ Phase 3.2 theo chuẩn **Contract-First / Design-by-Word**:

1. **Nhóm Việc 4 — Thanh Tìm Kiếm & Lọc Commit Nâng Cao**: tích hợp bộ tìm kiếm tức thì trên dữ liệu commit đã nạp của Webview (không phát sinh RPC bổ sung), phím tắt toàn cục `Ctrl/Cmd+F`, điều hướng kết quả `Next/Prev`, bộ đếm kết quả và cuộn mượt căn giữa dòng khớp trên bảng ảo hóa `CommitTable`.
2. **Nhóm Việc 5 — Bố Cục Responsive 3-Pane & Nghiệm Thu Bất Biến Hình Học**: hợp nhất 3 phân vùng (Toolbar / Sidebar / Đồ thị DAG) vào `WorkspaceLayout`, theo dõi kích thước vùng đồ thị bằng `ResizeObserver` + `requestAnimationFrame`, khắc phục lỗi khối giữa bị dồn trái, và nghiệm thu cam kết **Zero Layout Shift** (sai số 0 pixel) khi Sidebar co giãn.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File | Nội dung |
| :--- | :--- |
| `src/webview/lib/stores/search.store.ts` | **Mới.** Kho trạng thái tìm kiếm: `parseSearchQuery` (thuần), `matchesCommit` (thuần, logic AND), 4 tín hiệu cơ sở + 5 tín hiệu dẫn xuất + `effect` auto-clamp, 6 dispatcher (`setQuery`/`nextMatch`/`prevMatch`/`openSearch`/`closeSearch`/`clearQuery`) + `dispatchScrollToRow`. |
| `src/webview/components/search/SearchFilterBar.tsx` | **Mới.** Thanh tìm kiếm nổi: bắt `Ctrl/Cmd+F` toàn cục, focus+select qua `requestAnimationFrame`, `Enter`/`Shift+Enter`/`Esc`, nút Clear/Prev/Next/Close, bộ đếm `counterText`. |
| `src/webview/lib/stores/layout.store.ts` | **Mới.** Tín hiệu `viewportWidth` (chiều rộng vùng đồ thị khả dụng). |
| `src/webview/components/layout/WorkspaceLayout.tsx` | **Mới.** Bố cục 3 phân vùng; khung giữa `flex-1 min-w-0` (fix lỗi dồn trái); `ResizeObserver` + `requestAnimationFrame` → `viewportWidth`. |
| `src/webview/App.tsx` | Refactor: bọc `WorkspaceLayout` (toolbar/sidebar/graph), đặt `SearchFilterBar` trong graph pane. |
| `src/webview/components/commit/CommitTable.tsx` | Thêm effect cuộn `scrollRequest` (căn giữa `rowIndex*ROW_HEIGHT - viewport/2 + ROW_HEIGHT/2`), tính `searchActive`/`matchingIndexSet`/`activeHash`, truyền `dimmed`/`activeMatch` xuống `CommitRow`. |
| `src/webview/components/commit/CommitRow.tsx` | Thêm props `dimmed`/`activeMatch` (optional): opacity 0.55 cho dòng không khớp, outline neon tím cho dòng khớp đang focus. |
| `tests/webview/lib/stores/search.store.test.ts` | **Mới.** 26 test (`parseSearchQuery`/`matchesCommit`/computed/dispatcher/clamping). |
| `tests/webview/components/search/SearchFilterBar.test.ts` | **Mới.** 10 test theo ma trận Mục 7. |
| `tests/webview/layout/WorkspaceLayout.test.ts` | **Mới.** 4 test (cấu trúc 3 phân vùng, flex-class, ResizeObserver, cleanup). |
| `tests/webview/layout/WorkspaceLayout.geometry.test.ts` | **Mới.** 2 test nghiệm thu bất biến hình học (Zero Layout Shift). |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 4.1 — `search.store.ts`

- **`parseSearchQuery(rawQuery)`**: bóc tách token `author:`/`hash:`/tự do, chuyển chữ thường, cắt khoảng trắng, bỏ token rỗng.
- **`matchesCommit(commit, tokens)`**: đối chiếu logic AND — `author` khớp chuỗi con tên/email, `hash` khớp tiền tố, `free` khớp chuỗi con subject+description (không phân biệt hoa thường).
- **Tín hiệu dẫn xuất**: `matchingRowIndices`, `totalMatches`, `activeCommitHash` (kẹp an toàn qua `clampIndex`), `counterText`, `hasActiveSearch` — vận hành trên `windowRows` (cửa sổ ảo hóa), bỏ qua dòng `metadata === undefined`.
- **`effect` auto-clamp**: khi dữ liệu commit biến động khiến `currentMatchIndex >= totalMatches`, tự kẹp về ranh giới hợp lệ (Mục 4.3.8).
- **`dispatchScrollToRow`**: phát `scrollRequest.value = { rowIndex, timestamp }` — timestamp mới mỗi lần gọi bảo đảm phản ứng ngay cả khi cùng dòng (trường hợp `totalMatches === 1`).

### 3.2. Nhiệm vụ 4.2 — `SearchFilterBar.tsx`

- `useEffect` đăng ký listener toàn cục `Ctrl/Cmd+F` → `openSearch()`.
- `useEffect` phản ứng `isSearchOpen`: trì hoãn focus+select sang `requestAnimationFrame` (DOM input mount kịp).
- Input `onInput` → `setQuery`; `onKeyDown` xử lý `Enter` (nextMatch), `Shift+Enter` (prevMatch), `Esc` (closeSearch).
- Nút `Clear` (clearQuery + giữ focus), `Prev`/`Next` (disabled khi `totalMatches === 0`), `Close`.

### 3.3. Nhiệm vụ 5.1 — `WorkspaceLayout.tsx`

- Cấu trúc `flex min-h-screen flex-col` → thân `flex min-h-0 flex-1 flex-row` với khung đồ thị `relative min-w-0 flex-1` — khung giữa chiếm trọn chiều rộng còn lại (khắc phục lỗi commit message bị dồn trái khi khởi động lần đầu).
- `ResizeObserver` gắn khung đồ thị, gom cụm sự kiện resize bằng `requestAnimationFrame` rồi gán `viewportWidth.value = entry.contentRect.width`; `disconnect()` khi unmount.

### 3.4. Nhiệm vụ 5.2 — Nghiệm thu bất biến hình học

- `WorkspaceLayout.geometry.test.ts` trích xuất `d` của đường nhánh Bézier + `points`/`transformOrigin` của nút lục giác qua 3 pha (220px → 380px → 0px), assert `toEqual` tuyệt đối — vì nhân F# Core render "dumb" (geometry là hàm thuần của dữ liệu `rows`/`paths`, độc lập chiều rộng viewport).

---

## 4. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `tests/webview/lib/stores/search.store.test.ts` | ✅ 26/26 pass |
| `tests/webview/components/search/SearchFilterBar.test.ts` | ✅ 10/10 pass |
| `tests/webview/layout/WorkspaceLayout.test.ts` | ✅ 4/4 pass |
| `tests/webview/layout/WorkspaceLayout.geometry.test.ts` | ✅ 2/2 pass |
| Toàn bộ project `backend` | ✅ 159/159 pass (không đổi) |
| Toàn bộ project `extension` | ✅ 29/29 pass (không đổi) |
| Toàn bộ project `webview` | ✅ 240/240 pass (tăng +42) |
| Typecheck (`pnpm run typecheck`) | ✅ sạch (toàn workspace) |
| Lint (`pnpm run lint`) | ✅ 0 error / 0 warning |
| Compile (`pnpm run compile`) | ✅ thành công |

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt | Phân Loại | Nguyên Nhân Gốc | Giải Pháp Đã Sửa | Kết Quả Sau Sửa |
| :-: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | Vòng 1 | `src/webview/components/commit/CommitTable.tsx` | Lint | `import-js(order): @/webview/lib/stores/graph-window.store should occur before search.store` | `[DEV_BUG]` | Thứ tự import sai chữ cái (`graph-window` < `search`) | Hoán đổi hai khối import | ✅ Đã khắc phục |
| 2 | Vòng 1 | `src/webview/App.tsx` | Lint | `import-js(order): ./components/layout/WorkspaceLayout before ./components/sidebar/SidebarNavigator` | `[DEV_BUG]` | Import `WorkspaceLayout` (layout) đặt sau `SidebarNavigator` (sidebar) | Sắp xếp lại theo chữ cái thư mục | ✅ Đã khắc phục |
| 3 | Vòng 1 | `src/webview/App.tsx` | Lint | `import-js(order): ./components/search/SearchFilterBar before ./components/sidebar/SidebarNavigator` | `[DEV_BUG]` | Import `SearchFilterBar` (search) đặt sau `SidebarNavigator` (sidebar) | Sắp xếp lại theo chữ cái thư mục | ✅ Đã khắc phục |
| 4 | Vòng 1 | `tests/webview/lib/stores/search.store.test.ts` | Typecheck | `TS2339: Property 'rowIndex' does not exist on type 'never'` (3 vị trí) | `[DEV_BUG]` | TS control-flow narrowing: sau `scrollRequest.value = null`, `?.rowIndex` bị thu hẹp về `never` | Thêm helper `scrollRow()` đọc qua hàm (tránh narrowing) | ✅ Đã khắc phục |
| 5 | Vòng 1 | `tests/webview/lib/stores/search.store.test.ts` | Test | `matchesCommit(author:Nam fix)` kỳ vọng true nhưng nhận false | `[DEV_BUG]` | Dữ liệu mock sai: subject/description không chứa chuỗi `"fix"` | Đổi điều kiện test sang `author:Nam login` (có trong subject) | ✅ Đã khắc phục |
| 6 | Vòng 1 | `tests/webview/lib/stores/search.store.test.ts` | Test | `dispatchScrollToRow` timestamp: `later.rowIndex` nhận 2 thay vì 0 | `[DEV_BUG]` | Logic test sai (nextMatch tăng chỉ số khiến rowIndex đổi) | Viết lại bằng 1 kết quả duy nhất + assert tham chiếu mới `not.toBe` | ✅ Đã khắc phục |
| 7 | Vòng 1 | `tests/webview/components/search/SearchFilterBar.test.ts` | Test | `Ctrl+F`/`Cmd+F` không mở thanh (isSearchOpen vẫn false) | `[DEV_BUG]` | Preact lập lịch `useEffect` bất đồng bộ; listener toàn cục chưa đăng ký khi dispatch | Bọc render trong `act()` từ `preact/test-utils` để flush effect đồng bộ | ✅ Đã khắc phục |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng | Ký Hiệu | Giá Trị Thực Tế | Ghi Chú / Đánh Giá |
| :--- | :---: | :---: | :--- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)** | $C$ | **2 vòng** | Vòng 1 (lint 3 + typecheck 1 + test 3) → Vòng 2 sạch |
| **Tổng số lỗi kỹ thuật** | $E_{total}$ | **7 lỗi** | $E_{design} + E_{dev}$ |
| **Số lỗi do Thiết Kế** | $E_{design}$ | **0 lỗi** | Thiết kế v1.2.0 (Design 08) & v1.1.0 (Design 09) đã chuẩn trước khi triển khai |
| **Số lỗi do Triển Khai (Bug Dev)** | $E_{dev}$ | **7 lỗi** | 3 import-order + 1 TS narrowing + 3 test data/logic/timing |
| **Số sự cố Môi Trường/Tool** | $E_{env}$ | **0 sự cố** | — |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** | **$DDR$** | **0.0%** | $\frac{0}{7} \times 100\%$ |
| **TỶ LỆ BUG KHI DEV (IBR)** | **$IBR$** | **100.0%** | $\frac{7}{7} \times 100\%$ |
| **Trạng thái cổng chẩn đoán cuối cùng** | - | **100% PASS** | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (backend 159 + extension 29 + webview 240): OK |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

1. **`WorkspaceLayout` được hiện thực ở dạng vỏ mỏng (thin shell)**: Design 09 Mục 2.1 liệt kê props `inspector`/`isSidebarCollapsed`/`sidebarWidth`, nhưng trong kiến trúc hiện tại, việc thu gọn Sidebar do `SidebarNavigator` (qua `sidebar.store`) tự quản, còn Inspector (Staging/Details) do `CommitTable` dựng overlay nổi — nên `WorkspaceLayout` chỉ cần `toolbar`/`sidebar`/`graph`. Không phát sinh thay đổi design (chỉ ghi nhận để đối chiếu), tầng bố cục vẫn đảm bảo đúng cam kết Zero Layout Shift.
2. **`viewportWidth` hiện được cập nhật nhưng chưa tiêu thụ**: tín hiệu đã sẵn sàng theo Design 09 Mục 5.1.2 để nối vào cột Subject (`--col-subject-width`) sau; phạm vi nhóm việc 5 hiện hoàn tất phần theo dõi kích thước + bất biến hình học.
3. **`scrollRequest` phi ghép nối**: `CommitTable` tiêu thụ qua `window.scrollTo` (body scroll) thay vì container ảo hóa riêng — khớp cơ chế cuộn hiện hữu của bảng (`window.scrollY`), đúng tinh thần decoupled scroll trong Design 08 Mục 4.3.7.

---

## 7. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| `search.store.ts` (parse + match + signals + dispatcher + clamping) | ✅ Đạt |
| `SearchFilterBar.tsx` (Ctrl/Cmd+F, Next/Prev, counter, clear/close) | ✅ Đạt |
| `WorkspaceLayout.tsx` (3 phân vùng + ResizeObserver + fix dồn trái) | ✅ Đạt |
| Highlight dimmed/activeMatch trên `CommitRow` + cuộn căn giữa `CommitTable` | ✅ Đạt |
| Unit test Nhóm 4 (26 + 10) + Nhóm 5 (4 + 2) | ✅ 42/42 |
| Typecheck + lint + compile + test | ✅ Đạt |
