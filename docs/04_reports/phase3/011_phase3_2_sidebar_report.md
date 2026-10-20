# Báo Cáo Nhóm Việc 3 (Phase 3.2) — Cây Điều Hướng Left Sidebar Navigator

> **Mã báo cáo**: 011_phase3_2_sidebar_report
> **Giai đoạn**: Phase 3.2 — Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục
> **Nhóm việc liên quan**: Nhóm Việc 3 — Thiết Kế & Triển Khai Cây Điều Hướng Left Sidebar Navigator
> **Nhiệm vụ**: 3.1 (`sidebar.store.ts`), 3.2 (`SidebarSection.tsx`/`SidebarItem.tsx`/`SidebarNavigator.tsx`/`SidebarResizer.tsx`), 3.3 (tích hợp hành động checkout/stash/tạo nhánh), 3.4 (bộ unit test store & component)
> **Ngày thực hiện**: 2026-10-19
> **Tài liệu thiết kế áp dụng**: [07_Sidebar_Navigator_Tree_Design.md](../../02_design/phase3/07_Sidebar_Navigator_Tree_Design.md) (v1.3.0)

---

## 1. Mục Tiêu & Phạm Vi

Xây dựng cây điều hướng bên trái bao quát toàn bộ tài nguyên kho Git (Working Tree, Local Branches, Remotes, Tags, Stashes), hỗ trợ co giãn kích thước (Resizable) và thu gọn mượt mà, đồng thời tích hợp 12 hàm điều phối trạng thái theo kiến trúc Fine-Grained Reactive Signals. Cụ thể:

1. Xây `sidebar.store.ts` với 9 tín hiệu cơ sở, 3 tín hiệu dẫn xuất và 12 hàm điều phối (width/clamp, toggle, section, selection, hydration phòng vệ, checkout, working tree, stash, tạo nhánh, định vị commit).
2. Xây 4 component: `SidebarSection.tsx` (accordion), `SidebarItem.tsx` (dòng item + highlight HEAD), `SidebarNavigator.tsx` (container + WAI-ARIA tree nav), `SidebarResizer.tsx` (kéo dãn chuột).
3. Mở rộng âm thanh vi mô, handler & dispatcher cho `checkoutBranch`/`stashPop`/`stashDrop` khởi phát từ Sidebar.
4. Tích hợp `SidebarNavigator` vào `App.tsx` cạnh trái `GraphView`.
5. Viết 2 tệp unit test (47 test mới) và chạy 4 cổng chẩn đoán đạt 100% PASS.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File                                                        | Nội dung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :---------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/webview/lib/stores/sidebar.store.ts`                   | 9 base signals (`sidebarWidth`/`isSidebarCollapsed`/`expandedSectionIds`/`selectedItemId`/`isResizing`/`isCheckingOut`/`isStashOperating`/`isCreateBranchModalOpen`/`branchCreationBaseCommit`); 3 computed (`effectiveSidebarWidth`/`sidebarToggleTooltip`/`isAnySectionExpanded`); 12 dispatcher (`setSidebarWidth`/`toggleSidebar`/`toggleSection`/`expandAllSections`/`collapseAllSections`/`selectItem`/`initSidebarStore`/`checkoutBranchAction`/`openWorkingTreeAction`/`handleStashAction`/`createBranchAction`/`validateBranchName`/`locateCommitOnGraphAction`). Kẹp `[160, 450]`px, lưu `localStorage` phòng vệ 4 tầng. |
| `src/webview/lib/handler/sidebar-action.ts`                 | `handleCheckoutBranch` (giải mutex + `playSwitch`/`playError`), `handleSidebarStash` (giải mutex + `playStash`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `src/webview/lib/dispatcher.ts`                             | Đổi `checkoutBranch → handleCheckoutBranch`, `stashPop`/`stashDrop → handleSidebarStash`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/webview/lib/audio.ts`                                  | Bổ sung `playSwitch`/`playTick`/`playError`/`playStash`/`playSidebarCollapse`/`playSidebarExpand` + helper `playFrequencySweep` (đều tôn trọng `isAudioMuted`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/webview/components/sidebar/SidebarSection.tsx`         | Accordion: chevron xoay 90°, badge đếm, nút `+` (stopPropagation).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/webview/components/sidebar/SidebarItem.tsx`            | Item: highlight HEAD (`#a855f7` + checkmark), `↑N` hổ phách, `aria-selected`, `tabIndex=-1` cho điều hướng bàn phím.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `src/webview/components/sidebar/SidebarNavigator.tsx`       | Container: header `WORKSPACE` + nút thu gọn, 5 `SidebarSection`, `SidebarResizer`, WAI-ARIA tree keyboard (Arrow 4 chiều/Home/End/Enter).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/webview/components/sidebar/SidebarResizer.tsx`         | Kéo dãn `mousedown`/`mousemove`/`mouseup`, kẹp `[160, 450]`, ghi đĩa tại `mouseup`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/webview/App.tsx`                                       | Tích hợp `<SidebarNavigator />` cạnh trái `GraphView`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tests/webview/lib/stores/sidebar.store.test.ts`            | Unit test store (37 test).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `tests/webview/components/sidebar/SidebarNavigator.test.ts` | Unit test component (10 test).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 3.1 — Kho trạng thái Sidebar

`sidebar.store.ts` hiện thực đầy đủ 12 hàm điều phối theo Mục 3.2 của Design 07 v1.3.0:

- **`setSidebarWidth(width, commitToStorage)`**: tách cập nhật UI thời gian thực (kéo chuột) khỏi ghi đĩa; kẹp `[160, 450]`px, xử lý `NaN`/âm về mặc định; đồng bộ biến CSS `--sidebar-width`.
- **`toggleSidebar`**: bẫy `isResizing`, phát âm thu gọn/mở, lưu boolean, phát `resize` sau 160ms.
- **`toggleSection`/`expandAllSections`/`collapseAllSections`**: quản lý `expandedSectionIds`, tuần tự hóa JSON vào `localStorage`.
- **`selectItem`**: xác thực tiền tố hợp lệ (`working-tree:`/`branch:`/`remote:`/`tag:`/`stash:`), đồng bộ `aria-selected` + cuộn (guard `scrollIntoView`).
- **`initSidebarStore`**: khôi phục phòng vệ 4 tầng (giá trị rác/`NaN`/JSON hỏng → fallback mặc định).
- **`checkoutBranchAction`**: khóa mutex `isCheckingOut`, chặn checkout HEAD hiện tại, phát RPC `checkoutBranch { branchName, remoteBranch: null }`.
- **`handleStashAction`**: hỗ trợ `pop`/`drop`, khóa mutex `isStashOperating`, chặn index âm/không nguyên.
- **`createBranchAction`**: mở modal + đặt `branchCreationBaseCommit` (mặc định HEAD).
- **`validateBranchName`**: quy tắc `git check-ref-format` rút gọn (khoảng trắng, `..`, `~`, `^`, `:`, `\`, `?`, `*`, `[`, trùng nhánh).
- **`locateCommitOnGraphAction`**: khớp hash trong `commitHashes`, phát CustomEvent `scroll-to-commit` + `playTick`.

### 3.2. Nhiệm vụ 3.2 — Component thành phần

- **`SidebarSection.tsx`**: tiêu đề Monospace in hoa, chevron xoay 90° 150ms, huy hiệu đếm, nút tác vụ `+` (stopPropagation chống gập nhóm); thân nhóm ẩn khỏi DOM khi gập.
- **`SidebarItem.tsx`**: viền trái tím Neon `#a855f7` + checkmark cho nhánh HEAD, nhãn `↑N` hổ phách (`#fbbf24`), `aria-selected`, `tabIndex=-1` phục vụ điều hướng bàn phím.
- **`SidebarNavigator.tsx`**: header `WORKSPACE` + nút thu gọn; 5 phân nhóm; điều hướng bàn phím WAI-ARIA Tree View (ArrowDown/Up di chuyển tiêu điểm, ArrowRight/Left mở/gập section, Enter kích hoạt item, Home/End nhảy đầu/cuối); `SidebarResizer` ở mép phải.
- **`SidebarResizer.tsx`**: giải thuật kéo dãn 3 bước chuẩn design; kẹp `[160, 450]`, chỉ ghi `localStorage` tại `mouseup`.

### 3.3. Nhiệm vụ 3.3 — Tích hợp hành động

- Double-click nhánh → `checkoutBranchAction(name)`; click `+` → `createBranchAction()`; click `Changes` → `openWorkingTreeAction()` (mở Staging Area qua `toggleStaging()`).
- `dispatcher.ts` định tuyến `checkoutBranch`/`stashPop`/`stashDrop` sang handler Sidebar (giải mutex + phát âm + ủy chuỗi làm mới).

### 3.4. Nhiệm vụ 3.4 — Unit test (47 test mới)

- `sidebar.store.test.ts` (37): kẹp ranh giới, tách UI/storage, toggle+resize 160ms, section expand/collapse, prefix validation, hydration phòng vệ, storage sandbox, mutex checkout, stash pop/drop, tạo nhánh, validate tên nhánh, mở working tree, định vị commit.
- `SidebarNavigator.test.ts` (10): render 5 nhóm, HEAD highlight, `↑2`, `Changes (3)`, double-click checkout, nút `+`, resizer drag, ArrowRight/Left, Enter, ArrowDown.

---

## 4. Kiểm Thử

| Hạng mục                                                    | Kết quả                                       |
| :---------------------------------------------------------- | :-------------------------------------------- |
| `tests/webview/lib/stores/sidebar.store.test.ts`            | ✅ 37/37 pass                                 |
| `tests/webview/components/sidebar/SidebarNavigator.test.ts` | ✅ 10/10 pass                                 |
| Toàn bộ project `backend`                                   | ✅ 148/148 pass                               |
| Toàn bộ project `extension`                                 | ✅ 27/27 pass                                 |
| Toàn bộ project `webview`                                   | ✅ 197/197 pass (tăng +45 so với báo cáo 010) |
| Typecheck (`pnpm run typecheck`)                            | ✅ sạch (toàn workspace)                      |
| Lint (`pnpm run lint`)                                      | ✅ 0 error / 0 warning                        |
| Compile (`pnpm run compile`)                                | ✅ thành công                                 |

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động                                            | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt                                                           |  Phân Loại  | Nguyên Nhân Gốc                                                                                               | Giải Pháp Đã Sửa                                                   | Kết Quả Sau Sửa |
| :-: | :------------: | :---------------------------------------------------------- | :------------: | :------------------------------------------------------------------------------------ | :---------: | :------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------- | :-------------: |
|  1  |     Vòng 1     | `src/webview/lib/stores/sidebar.store.ts`                   |      Lint      | `import-js(order): @/webview/lib/actions should occur before @/webview/lib/audio`     | `[DEV_BUG]` | Thứ tự import `audio` đặt trước `actions` (sai thứ tự chữ cái)                                                | Hoán đổi vị trí hai dòng import                                    | ✅ Đã khắc phục |
|  2  |     Vòng 1     | `src/webview/lib/handler/sidebar-action.ts`                 |      Lint      | `import-js(order): no empty line within import group`                                 | `[DEV_BUG]` | Dòng trống thừa giữa `@/types` và `@/webview/lib/audio` (cùng nhóm `@/**`)                                    | Xóa dòng trống                                                     | ✅ Đã khắc phục |
|  3  |     Vòng 1     | `tests/webview/lib/stores/sidebar.store.test.ts`            |      Lint      | `import-js(order): sidebar.store should occur after stores/graph-window.store`        | `[DEV_BUG]` | Sắp xếp import `sidebar.store` trước `stores`/`graph-window.store`                                            | Đổi thứ tự theo alphabetize                                        | ✅ Đã khắc phục |
|  4  |     Vòng 1     | `tests/webview/components/sidebar/SidebarNavigator.test.ts` |      Lint      | `import-js(order): sidebar.store should occur after stores`                           | `[DEV_BUG]` | Import `sidebar.store` đặt trước `stores`                                                                     | Đổi thứ tự theo alphabetize                                        | ✅ Đã khắc phục |
|  5  |     Vòng 1     | `tests/webview/components/sidebar/SidebarNavigator.test.ts` |      Lint      | `import-js(order): @tests/webview/test-utils should occur after @/webview/lib/stores` | `[DEV_BUG]` | pathGroup `@tests/**` (position after) đặt trước `@/**`                                                       | Đưa `@tests` xuống sau `@/**`                                      | ✅ Đã khắc phục |
|  6  |     Vòng 1     | `tests/webview/components/sidebar/SidebarNavigator.test.ts` |   Unit Test    | `AssertionError: expected false to be true` (ArrowRight không mở section)             | `[DEV_BUG]` | `container` render rời khỏi `document.body` → jsdom không cập nhật `document.activeElement` khi gọi `focus()` | `appendChild(container)` vào `document.body` trước khi render      | ✅ Đã khắc phục |
|  7  |     Vòng 1     | `tests/webview/components/sidebar/SidebarNavigator.test.ts` |   Unit Test    | `TypeError: target.scrollIntoView is not a function` (lỗi chưa bắt)                   | `[DEV_BUG]` | `selectItem` gọi `scrollIntoView` không guard; jsdom không hiện thực API này                                  | Guard `typeof target.scrollIntoView === "function"` trước khi cuộn | ✅ Đã khắc phục |
|  8  |     Vòng 1     | `tests/webview/components/sidebar/SidebarNavigator.test.ts` |   Unit Test    | `AssertionError: expected '' to be 'section-header-branches'` (ArrowDown)             | `[DEV_BUG]` | Assertion kỳ vọng sai phần tử kế tiếp (thực tế là item `Changes` chứ không phải header `branches`)            | Sửa assertion thành `data-item-id="working-tree:changes"`          | ✅ Đã khắc phục |
|  9  |     Vòng 2     | `tests/webview/components/sidebar/SidebarNavigator.test.ts` |      Lint      | `import-js(order): at least one empty line between import groups`                     | `[DEV_BUG]` | `newlines-between: always` đòi dòng trống giữa nhóm `@/**` và `@tests/**` sau khi sắp xếp lại                 | Chèn dòng trống trước import `@tests`                              | ✅ Đã khắc phục |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng                         |   Ký Hiệu    | Giá Trị Thực Tế | Ghi Chú / Đánh Giá                                                                              |
| :---------------------------------------- | :----------: | :-------------: | :---------------------------------------------------------------------------------------------- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)**   |     $C$      |   **3 vòng**    | Vòng 1 (lint 5 + test 3) → Vòng 2 (lint 1) → Vòng 3 sạch                                        |
| **Tổng số lỗi kỹ thuật**                  | $E_{total}$  |    **9 lỗi**    | $E_{design} + E_{dev}$                                                                          |
| **Số lỗi do Thiết Kế**                    | $E_{design}$ |    **0 lỗi**    | Thiết kế v1.3.0 đã đồng bộ trước khi triển khai                                                 |
| **Số lỗi do Triển Khai (Bug Dev)**        |  $E_{dev}$   |    **9 lỗi**    | 6 lỗi import-order + 1 lỗi focus test + 1 lỗi guard `scrollIntoView` + 1 lỗi assertion          |
| **Số sự cố Môi Trường/Tool**              |  $E_{env}$   |   **0 sự cố**   | —                                                                                               |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** |  **$DDR$**   |    **0.0%**     | $\frac{0}{9} \times 100\%$                                                                      |
| **TỶ LỆ BUG KHI DEV (IBR)**               |  **$IBR$**   |   **100.0%**    | $\frac{9}{9} \times 100\%$                                                                      |
| **Trạng thái cổng chẩn đoán cuối cùng**   |      -       |  **100% PASS**  | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (backend 148 + extension 27 + webview 197): OK |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

Trong quá trình rà soát trước triển khai, các bất nhất giữa Design 07 và hợp đồng RPC thực tế đã được xử lý **trước** khi viết mã (kế thừa nguyên trạng từ tầng Backend ở Nhóm Việc 1 — không phát sinh `[DESIGN_DEFECT]`):

1. **`checkoutBranch` payload**: Backend `src/types/actions.ts` dùng `{ branchName, remoteBranch: string | null }` (KHÔNG phải `{ branch }`). Mã dùng `runAction({ command: "checkoutBranch", branchName, remoteBranch: null })`.
2. **`createBranch` payload**: Backend dùng `{ commitHash, branchName }` (KHÔNG có `checkout`/`baseCommit`/`sanitizedName`). `createBranchAction` chỉ mở modal + đặt `branchCreationBaseCommit`, không gửi RPC trực tiếp (modal xử lý ở component — hiện defer).
3. **`stashApply` không tồn tại**: `actions.ts` chỉ có `stashPop`/`stashDrop`; `handleStashAction` chỉ hỗ trợ `"pop" | "drop"`.
4. **Không có `inspectorMode` ghi được / `scrollToCommitRow` / `highlightedCommitHash` / `currentHeadCommitHash`**: thay bằng `toggleStaging()` cho `openWorkingTreeAction`, và CustomEvent `scroll-to-commit` + `commitHashes` cho `locateCommitOnGraphAction`.
5. **`remotes`/`tags` chưa có bộ truy vấn riêng**: `App.tsx` truyền mảng rỗng placeholder (hoàn thiện ở Nhóm Việc 5).

---

## 7. Kết Luận

| Tiêu chí                                                        | Trạng thái |
| :-------------------------------------------------------------- | :--------: |
| `sidebar.store.ts` (9 signals + 3 computed + 12 dispatcher)     |   ✅ Đạt   |
| `SidebarSection.tsx` / `SidebarItem.tsx` / `SidebarResizer.tsx` |   ✅ Đạt   |
| `SidebarNavigator.tsx` (header + 5 nhóm + WAI-ARIA tree nav)    |   ✅ Đạt   |
| Mở rộng âm thanh + handler/dispatcher checkout/stash            |   ✅ Đạt   |
| Tích hợp `SidebarNavigator` vào `App.tsx`                       |   ✅ Đạt   |
| Unit test store (37) + component (10)                           |  ✅ 47/47  |
| Typecheck + lint + compile + test                               |   ✅ Đạt   |
