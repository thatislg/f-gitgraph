# Báo Cáo Nhóm Việc 2 (Phase 3.2) — Thanh Công Cụ Đỉnh Toàn Cục, Huy Hiệu Đồng Bộ & Kho Trạng Thái Realtime

> **Mã báo cáo**: 010_phase3_2_toolbar_report
> **Giai đoạn**: Phase 3.2 — Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục
> **Nhóm việc liên quan**: Nhóm Việc 2 — Thiết Kế & Triển Khai Thanh Công Cụ Đỉnh Toàn Cục (Top Toolbar)
> **Nhiệm vụ**: 2.1 (`sync.store.ts` + `audio.store.ts` + `sidebar.store.ts`), 2.2 (`SyncBadge.tsx`), 2.3 (`GlobalToolbar.tsx` + `ToolbarDropdownButton.tsx`), 2.4 (đăng ký router realtime + âm thanh), 2.5 (bộ unit test UI/store)
> **Ngày thực hiện**: 2026-10-19
> **Tài liệu thiết kế áp dụng**: [06_Global_Toolbar_And_Sync_Badge_Design.md](../../02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md) (v1.3.0)

---

## 1. Mục Tiêu & Phạm Vi

Thay thế `MainHeader.tsx` di sản bằng `GlobalToolbar.tsx` phong cách Cyber-Lab, tích hợp cụm tác vụ mạng/stash một chạm, huy hiệu đồng bộ phát quang Neon, và cơ chế làm mới 4 chiều thời gian thực qua `dispatcher.ts` (tuân thủ **Nguyên Tắc 2: Realtime State Guarantee**). Cụ thể:

1. Xây kho trạng thái phản ứng `sync.store.ts` (Preact Signals) quản lý số đếm ahead/behind, cờ bận mạng, danh sách stash và các hàm điều phối `fetch/pull/push/stash/pop`.
2. Xây kho tiện ích công thái học `audio.store.ts` (câm âm thanh) và `sidebar.store.ts` (thu gọn thanh điều hướng).
3. Xây `SyncBadge.tsx` (huy hiệu `↓ N` xanh lơ / `↑ N` hổ phách), `ToolbarDropdownButton.tsx` (Split Button WAI-ARIA), và `GlobalToolbar.tsx` (3 cụm điều khiển).
4. Mở rộng âm thanh vi mô (`playPushSuccessSound`/`playPullSuccessSound`), bộ phát lệnh `actions.ts`, handler & dispatcher mạng/stash, và khóa nội địa hóa.
5. Viết 5 tệp unit test độc lập (31 test mới) và chạy 4 cổng chẩn đoán đạt 100% PASS.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File                                                             | Nội dung                                                                                                                                                                                                                                                                                                             |
| :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/webview/lib/stores/sync.store.ts`                           | Signals `aheadCount`/`behindCount`/`upstreamBranch`/`isDetached`/`isFetching`/`isPulling`/`isPushing`/`isStashing`/`stashList`; computed `hasPendingSync`/`isNetworkBusy`/`syncStatusText`; dispatcher `loadSyncStatus`/`loadStashList`/`fetch`/`pull`/`push`/`stash`/`pop` (guard `isNetworkBusy` chống gọi trùng). |
| `src/webview/lib/stores/audio.store.ts`                          | `isAudioMuted` (đọc/ghi `localStorage` key `f-gitgraph.audioMuted`), `audioToggleTooltip`, `toggleAudio`.                                                                                                                                                                                                            |
| `src/webview/lib/stores/sidebar.store.ts`                        | `isSidebarCollapsed`, `sidebarToggleTooltip`, `toggleSidebar`.                                                                                                                                                                                                                                                       |
| `src/webview/lib/audio.ts`                                       | Bổ sung `playPushSuccessSound` (2 sine 523.25/783.99Hz lệch 70ms), `playPullSuccessSound` (triangle 330→440→330Hz); `playCommitSound` giờ kiểm `isAudioMuted`.                                                                                                                                                       |
| `src/webview/lib/actions.ts`                                     | Bổ sung `refreshSyncStatus(repo?)`, `refreshStashList(repo?)`.                                                                                                                                                                                                                                                       |
| `src/webview/lib/handler/sync-action.ts`                         | Handler 6 action mạng/stash: hạ cờ bận, mở lỗi, phát âm (push/pull), gọi `refresh()` + `refreshSyncStatus()` + `refreshStashList()`.                                                                                                                                                                                 |
| `src/webview/lib/handler/sync-query.ts`                          | `handleSyncStatus`, `handleStashList`.                                                                                                                                                                                                                                                                               |
| `src/webview/lib/dispatcher.ts`                                  | Đăng ký `fetchAll/pull/push/stashSave/stashPop/stashDrop → handleSyncAction`, `syncStatus → handleSyncStatus`, `stashList → handleStashList`.                                                                                                                                                                        |
| `src/extension/l10n/webviewL10n.ts`                              | Bổ sung ~20 key toolbar (`fetchAll`, `pull`, `push`, `stash`, `pop`, `detachedHead`, `tooltip*`...).                                                                                                                                                                                                                 |
| `src/webview/components/toolbar/SyncBadge.tsx`                   | Render `null` khi `count<=0`; capsule Neon với màu hex cố định (inline style theo thiết kế).                                                                                                                                                                                                                         |
| `src/webview/components/toolbar/ToolbarDropdownButton.tsx`       | Split Button WAI-ARIA (primary 75% / arrow 25%), click-outside capture, anti-flapping 16ms, keyboard xoay vòng modulo, `aria-activedescendant`, dọn listener, tự đóng khi `disabled/isLoading`.                                                                                                                      |
| `src/webview/components/toolbar/GlobalToolbar.tsx`               | 3 cụm: trái (Fetch/Pull/Push/Stash/Pop/Refresh), giữa (kế thừa 100% 4 điều khiển MainHeader), phải (repo+branch indicator / Detached HEAD badge, Audio toggle, Sidebar toggle).                                                                                                                                      |
| `src/webview/App.tsx`                                            | Thay `MainHeader` bằng `GlobalToolbar`.                                                                                                                                                                                                                                                                              |
| `src/webview/layout/MainHeader.tsx`                              | **Đã xóa** (component di sản được thay thế).                                                                                                                                                                                                                                                                         |
| `tests/webview/lib/stores/sync.store.test.ts`                    | Unit test sync store (12 test).                                                                                                                                                                                                                                                                                      |
| `tests/webview/lib/stores/audio.store.test.ts`                   | Unit test audio store (3 test).                                                                                                                                                                                                                                                                                      |
| `tests/webview/lib/stores/sidebar.store.test.ts`                 | Unit test sidebar store (2 test).                                                                                                                                                                                                                                                                                    |
| `tests/webview/components/toolbar/GlobalToolbar.test.ts`         | Unit test render toolbar (6 test).                                                                                                                                                                                                                                                                                   |
| `tests/webview/components/toolbar/ToolbarDropdownButton.test.ts` | Unit test split button (8 test).                                                                                                                                                                                                                                                                                     |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 2.1 — Kho trạng thái Realtime

- **`sync.store.ts`**: 9 tín hiệu cơ sở (5 trạng thái + 4 cờ bận + `stashList`), 3 tín hiệu dẫn xuất `hasPendingSync`/`isNetworkBusy`/`syncStatusText`. Mọi hàm điều phối (`fetch`/`pull`/`push`/`stash`/`pop`) đều có guard `isNetworkBusy` chống gọi trùng, sau đó đặt cờ bận và phát `runAction({ command })` xuống backend qua giao thức `vscode.postMessage` + `dispatcher`.
- **`audio.store.ts` / `sidebar.store.ts`**: hai kho tiện ích tối thiểu, mỗi kho một tín hiệu + tooltip + hàm toggle; `audio.store` lưu phục hồi trạng thái câm qua `localStorage`.

### 3.2. Nhiệm vụ 2.2 — `SyncBadge.tsx`

Huy hiệu số đếm chênh lệch commit, phát quang Neon theo ngữ cảnh: `behind` → xanh lơ (`#22d3ee`/`#06b6d4`), `ahead` → hổ phách (`#fbbf24`/`#f59e0b`). Khi `count <= 0`, component trả về `null` — huy hiệu biến mất hoàn toàn khỏi DOM.

### 3.3. Nhiệm vụ 2.3 — `ToolbarDropdownButton.tsx` & `GlobalToolbar.tsx`

- **`ToolbarDropdownButton.tsx`**: Split Button tuân thủ WAI-ARIA Menu Button Pattern. Nửa chính thực thi `onPrimaryClick` mặc định (không mở menu), nửa mũi tên bật/tắt menu. Bộ bẫy chuột/bàn phím đăng ký trong `useEffect` khi menu mở: click-outside (capture `mousedown`), anti-flapping 16ms chống mở/đóng ngay lập tức khi vừa bấm, xoay vòng kín `ArrowDown/Up/Home/End` modulo `N`, `Enter`/`Space` kích hoạt mục đang focus, `Escape`/`Tab` đóng menu, `window blur`/`resize` đóng menu; toàn bộ listener được dọn dẹp ngay khi đóng. Menu tự đóng khi `disabled`/`isLoading`.
- **`GlobalToolbar.tsx`**: 3 cụm — **Cụm trái** (tác vụ mạng/stash: Fetch All, Pull split, Push split, Stash, Pop, Refresh), **Cụm giữa** (kế thừa trọn vẹn 100% 4 điều khiển từ `MainHeader` nhằm **Zero Regression Guarantee**), **Cụm phải** (indicator repo+branch hoặc badge `Detached HEAD`, Audio toggle, Sidebar toggle).

### 3.4. Nhiệm vụ 2.4 — Đăng ký router realtime & âm thanh

- `dispatcher.ts` đăng ký 100% 6 action mạng/stash và 2 query `syncStatus`/`stashList`.
- `sync-action.ts` sau khi action thành công tự kích hoạt chuỗi làm mới 4 chiều: `refresh()` (đồ thị DAG) + `refreshStatus()` (working tree/staging) + `refreshSyncStatus()` (số đếm ahead/behind) + `refreshStashList()` (danh sách stash); đồng thời phát âm thành công cho push/pull (đều tôn trọng `isAudioMuted`).

### 3.5. Nhiệm vụ 2.5 — Unit test (31 test mới)

- `sync.store.test.ts` (12): computed `hasPendingSync`/`isNetworkBusy`/`syncStatusText`, guard chống gọi trùng, phát đúng command RPC.
- `audio.store.test.ts` (3): toggle câm, phục hồi từ `localStorage`.
- `sidebar.store.test.ts` (2): toggle thu gọn/mở rộng.
- `GlobalToolbar.test.ts` (6): render 3 cụm, huy hiệu `↓ 2`/`↑ 1`, ẩn huy hiệu khi count=0, badge `Detached HEAD`, vô hiệu hóa nút khi bận.
- `ToolbarDropdownButton.test.ts` (8): primary không mở menu, mở/đóng, click-outside, xoay vòng bàn phím, Enter kích hoạt, Escape/Tab, window blur.

---

## 4. Kiểm Thử

| Hạng mục                                                         | Kết quả                                       |
| :--------------------------------------------------------------- | :-------------------------------------------- |
| `tests/webview/lib/stores/sync.store.test.ts`                    | ✅ 12/12 pass                                 |
| `tests/webview/lib/stores/audio.store.test.ts`                   | ✅ 3/3 pass                                   |
| `tests/webview/lib/stores/sidebar.store.test.ts`                 | ✅ 2/2 pass                                   |
| `tests/webview/components/toolbar/GlobalToolbar.test.ts`         | ✅ 6/6 pass                                   |
| `tests/webview/components/toolbar/ToolbarDropdownButton.test.ts` | ✅ 8/8 pass                                   |
| Toàn bộ project `backend`                                        | ✅ 148/148 pass                               |
| Toàn bộ project `extension`                                      | ✅ 27/27 pass                                 |
| Toàn bộ project `webview`                                        | ✅ 152/152 pass (tăng +31 so với báo cáo 009) |
| Typecheck (`pnpm run typecheck`)                                 | ✅ sạch (toàn workspace)                      |
| Lint (`pnpm run lint`)                                           | ✅ 0 error / 0 warning                        |
| Compile (`pnpm run compile`)                                     | ✅ thành công                                 |

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động                                                 | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt                                                           |  Phân Loại  | Nguyên Nhân Gốc                                                                                                                                                     | Giải Pháp Đã Sửa                                                                          | Kết Quả Sau Sửa |
| :-: | :------------: | :--------------------------------------------------------------- | :------------: | :------------------------------------------------------------------------------------ | :---------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------- | :-------------: |
|  1  |     Vòng 1     | `tests/webview/components/toolbar/GlobalToolbar.test.ts`         |   Unit Test    | `AssertionError: expected ... to contain '#06b6d4'` (thực tế `rgb(6, 182, 212)`)      | `[DEV_BUG]` | jsdom tuần tự hóa màu hex `#06b6d4`/`#f59e0b` thành `rgb(...)` khi đọc `getAttribute("style")`                                                                      | Đổi assertion sang giá trị `rgb(6, 182, 212)` / `rgb(245, 158, 11)`                       | ✅ Đã khắc phục |
|  2  |     Vòng 1     | `tests/webview/components/toolbar/ToolbarDropdownButton.test.ts` |   Unit Test    | `AssertionError: expected <div role=menu> to be null` (click outside không đóng menu) | `[DEV_BUG]` | Listener click-outside do `useEffect` của Preact đăng ký bất đồng bộ sau render, chưa kịp gắn khi `await flush()` (0ms); đồng thời chưa vượt khoảng chống rung 16ms | Thêm helper `flushEffects()` chờ 150ms trước khi dispatch `mousedown`                     | ✅ Đã khắc phục |
|  3  |     Vòng 1     | `tests/webview/components/toolbar/ToolbarDropdownButton.test.ts` |   Unit Test    | `AssertionError: expected <div role=menu> to be null` (window blur không đóng menu)   | `[DEV_BUG]` | Listener `window blur` do `useEffect` của Preact chưa kịp đăng ký khi dispatch `blur`                                                                               | Thêm helper `flushEffects()` chờ 150ms trước khi dispatch `blur`                          | ✅ Đã khắc phục |
|  4  |     Vòng 2     | `tests/webview/components/toolbar/ToolbarDropdownButton.test.ts` |      Lint      | `eslint(no-shadow): 'container' is already declared in the upper scope`               | `[DEV_BUG]` | Tham số `container` trong 3 helper (`trigger`/`primary`/`focusedIndex`) che khuất biến module-level `container`                                                     | Đổi tên tham số sang `containerEl` (khớp quy ước repo: helper dùng biến module trực tiếp) | ✅ Đã khắc phục |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng                         |   Ký Hiệu    | Giá Trị Thực Tế | Ghi Chú / Đánh Giá                                                               |
| :---------------------------------------- | :----------: | :-------------: | :------------------------------------------------------------------------------- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)**   |     $C$      |   **2 vòng**    | Vòng 1 (test phát hiện 3 lỗi) → Vòng 2 (lint phát hiện 1 lỗi) → sạch             |
| **Tổng số lỗi kỹ thuật**                  | $E_{total}$  |    **4 lỗi**    | $E_{design} + E_{dev}$                                                           |
| **Số lỗi do Thiết Kế**                    | $E_{design}$ |    **0 lỗi**    | Thiết kế v1.3.0 đã đồng bộ trước khi triển khai                                  |
| **Số lỗi do Triển Khai (Bug Dev)**        |  $E_{dev}$   |    **4 lỗi**    | 3 lỗi timing/assertion test + 1 lỗi `no-shadow`                                  |
| **Số sự cố Môi Trường/Tool**              |  $E_{env}$   |   **0 sự cố**   | —                                                                                |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** |  **$DDR$**   |    **0.0%**     | $\frac{0}{4} \times 100\%$                                                       |
| **TỶ LỆ BUG KHI DEV (IBR)**               |  **$IBR$**   |   **100.0%**    | $\frac{4}{4} \times 100\%$                                                       |
| **Trạng thái cổng chẩn đoán cuối cùng**   |      -       |  **100% PASS**  | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (backend+extension+webview): OK |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

Trong giai đoạn rà soát thiết kế trước khi triển khai, tài liệu `06_Global_Toolbar_And_Sync_Badge_Design.md` đã trải qua các bản sửa đổi v1.1.0 → v1.3.0 để giải quyết 6 điểm bất nhất (được đóng góp và cập nhật bởi người dùng), trước khi bất kỳ dòng mã nào được viết:

1. **Chuẩn hóa giao thức RPC (v1.3.0)**: Loại bỏ envelope `WebviewBridge.postMessage({ type })` không khớp mã nguồn; chuyển sang `vscode.postMessage({ command })` + `dispatcher` (fire-and-forget như `refreshStatus`).
2. **Bổ sung chuỗi làm mới 4 chiều**: `refreshSyncStatus()`/`refreshStashList()` trong `actions.ts`; tự kích hoạt 4 chiều sau action mạng/stash.
3. **Đặc tả `audio.store.ts` & âm học vi mô**: `playPushSuccessSound` (quãng 5) và `playPullSuccessSound` (trượt parabol), đều kiểm `isAudioMuted`.
4. **Đặc tả `sidebar.store.ts`**: kho trạng thái thu gọn thanh điều hướng cây.
5. **Kế thừa 100% 4 điều khiển `MainHeader`** (Zero Regression Guarantee) + prop `repos: Array<GitRepo>`.
6. **Chuẩn hóa `syncStatusText` & tích hợp `isDetached`**: badge cảnh báo vàng `"Detached HEAD"` trên cụm phải.

Vì toàn bộ bất nhất thiết kế đã được xử lý **trước** khi viết mã, giai đoạn triển khai không phát sinh thêm `[DESIGN_DEFECT]` nào — thiết kế đạt độ chính xác ngay lần đầu (Design First-Time-Right) cho Nhóm Việc 2.

---

## 7. Kết Luận

| Tiêu chí                                                         | Trạng thái |
| :--------------------------------------------------------------- | :--------: |
| Kho trạng thái `sync.store.ts` (signals + computed + dispatcher) |   ✅ Đạt   |
| Kho tiện ích `audio.store.ts` & `sidebar.store.ts`               |   ✅ Đạt   |
| `SyncBadge.tsx` (Neon `↓ N`/`↑ N`, ẩn khi sạch)                  |   ✅ Đạt   |
| `ToolbarDropdownButton.tsx` (Split Button WAI-ARIA)              |   ✅ Đạt   |
| `GlobalToolbar.tsx` (3 cụm, kế thừa 100% MainHeader)             |   ✅ Đạt   |
| Đăng ký router realtime + âm thanh vi mô + l10n                  |   ✅ Đạt   |
| Unit test UI/store (31 test mới)                                 |  ✅ 31/31  |
| Thay thế & xóa `MainHeader.tsx`                                  |   ✅ Đạt   |
| Typecheck + lint + compile + test                                |   ✅ Đạt   |
