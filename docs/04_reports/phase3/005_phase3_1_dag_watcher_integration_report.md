# Báo Cáo Nhiệm Vụ 4.1 → 4.3 — Tích Hợp Đồ Thị DAG & File Watcher Thời Gian Thực

> **Mã báo cáo**: 005_phase3_1_dag_watcher_integration_report
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)
> **Nhóm việc liên quan**: Nhóm Việc 4 — Tích Hợp Đồ Thị DAG & Bộ Giám Sát Thời Gian Thực
> **Nhiệm vụ**: 4.1 (Mở khóa click dòng `UNCOMMITTED_CHANGES` + điều phối Inspector), 4.2 (Debounce 150ms + bộ lọc + đồng bộ RPC), 4.3 (Test tích hợp)
> **Ngày thực hiện**: 2026-10-16
> **Tài liệu thiết kế áp dụng**: [03_WorkingTree_Sync_And_Watcher_Integration.md](../../02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md)
> **GitHub**: [#37](https://github.com/thatislg/f-gitgraph/issues/37), [#38](https://github.com/thatislg/f-gitgraph/issues/38), [#39](https://github.com/thatislg/f-gitgraph/issues/39), [#40](https://github.com/thatislg/f-gitgraph/issues/40), [#41](https://github.com/thatislg/f-gitgraph/issues/41)

---

## 1. Mục Tiêu & Phạm Vi

Khép kín vòng lặp Core Dev Loop bằng cách nối dòng mầm `UNCOMMITTED_CHANGES` (`*`) với phân vùng Staging Area qua khung Inspector nổi tuyệt đối (bảo toàn hình học 0px), đồng thời biến `git-repo.watcher.ts` thành hệ thần kinh thời gian thực với Debounce 150ms, bộ lọc thư mục rác và đồng bộ trạng thái kho về Webview.

Phạm vi gồm:

1. Nhiệm vụ 4.1: Mở khóa click dòng `*`, điều phối `StagingArea` vs `CommitDetails`, cam kết zero layout shift.
2. Nhiệm vụ 4.2: Debounce 150ms, bộ lọc thư mục rác, đồng bộ Watcher → Webview qua RPC.
3. Nhiệm vụ 4.3: 2 bộ test tích hợp (watcher debounce + CommitTable staging).

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File                                                          | Nội dung                                                                                                                                                |
| :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/webview/lib/stores.ts`                                   | Bổ sung computed `inspectorMode` (`none`/`staging`/`commit-details`) dùng chung tín hiệu `expandedCommit`.                                              |
| `src/webview/lib/actions.ts`                                  | Bổ sung `toggleStaging()`, `refreshStatus()`; tích hợp `refreshStatus()` vào `refresh()`.                                                               |
| `src/webview/components/commit/CommitTable.tsx`               | Bỏ điều kiện `undefined` trên `onSelect`; điều phối overlay `StagingArea` vs `CommitDetails` theo `inspectorMode`; overlay `z-40` + `overflow-y: auto`. |
| `src/webview/constants.ts`                                    | Bổ sung `STAGING_AREA_HEIGHT`.                                                                                                                          |
| `src/webview/lib/handler/workspace-status.ts`                 | Handler phản hồi `workspaceStatus`: nạp `stagingStore` + cập nhật `uncommittedChanges`.                                                                 |
| `src/webview/lib/dispatcher.ts`                               | Đăng ký handler `workspaceStatus`.                                                                                                                      |
| `src/extension/watchers/git-repo.watcher.ts`                  | Debounce `250ms → 150ms`; bổ sung bộ lọc thư mục rác/tệp tạm.                                                                                           |
| `tests/extension/__mocks__/vscode.ts`                         | Bổ sung `RelativePattern`/`Disposable`/`onDidChange`/`onDidDelete`/`createdWatchers` cho test watcher.                                                  |
| `tests/extension/watchers/gitRepoWatcher.debounce.test.ts`    | Test debounce, bộ lọc, mute gate, cooling window.                                                                                                       |
| `tests/webview/components/commit/CommitTable.staging.test.ts` | Test mở StagingArea/CommitDetails, chuyển mode, zero layout shift.                                                                                      |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 4.1 — Mở khóa dòng `*` & điều phối Inspector

- Bỏ hoàn toàn điều kiện gán `undefined` cho `onSelect` ở dòng `UNCOMMITTED_CHANGES`; thay bằng `toggleStaging()` (dòng `*`) hoặc `toggleCommitDetails(hash)` (commit lịch sử).
- `inspectorMode` (computed) dùng chung `expandedCommit` làm nguồn chân trị: `"*"` → `staging`, SHA → `commit-details`, `null` → `none`. Điều này cho phép `closeCommitDetails()` (Esc/đóng nút) đóng cả hai chế độ.
- Khung overlay là `position: absolute` (`z-40`), `left: var(--col-graph)`, `top` neo dưới dòng chọn với logic lật lên trên khi không đủ chỗ; `StagingArea` bọc trong khối `overflow-y: auto` cao `STAGING_AREA_HEIGHT` để cuộn nội bộ, không làm giãn dòng bảng commit.

### 3.2. Nhiệm vụ 4.2 — File Watcher & đồng bộ thời gian thực

- Hạ `REFRESH_DELAY` từ `250` xuống `150` ms.
- Bộ lọc loại trừ: `node_modules`, `vendor`, `packages`, `bin`, `obj`, `dist`, `out`, `target`, `.vs`, `.cache`, `.tmp`, `.DS_Store`, `Thumbs.db`, `*.tmp`; giữ nguyên whitelist `.git` (`HEAD`, `config`, `index`, `packed-refs`, `refs/*`) và loại trừ `.git/objects`, `.git/logs`, `.git/hooks`.
- Đồng bộ: sau khoảng lặng 150ms watcher phát `repo.updated` → Webview `refresh()` (nạp lại đồ thị) + `refreshStatus()` (truy vấn `workspaceStatus` để cập nhật `stagingStore` và `uncommittedChanges`). `toggleStaging()` cũng gọi `refreshStatus()` để nạp danh sách tệp ngay khi mở bảng.

### 3.3. Nhiệm vụ 4.3 — Test tích hợp

- Watcher: 5 test (gom 100 sự kiện → 1 thông báo; lọc thư mục rác; whitelist `.git/index` + working tree; mute gate; cooling window 1500ms).
- CommitTable: 4 test (click `*` mở StagingArea; click commit mở CommitDetails; chuyển mode trơn tru; số dòng bảng không đổi khi overlay mở).

---

## 4. Kiểm Thử

| Hạng mục                                                      | Kết quả                                                        |
| :------------------------------------------------------------ | :------------------------------------------------------------- |
| `tests/extension/watchers/gitRepoWatcher.debounce.test.ts`    | ✅ 5/5 pass                                                    |
| `tests/webview/components/commit/CommitTable.staging.test.ts` | ✅ 4/4 pass                                                    |
| Toàn bộ project `extension`                                   | ✅ 21/21 pass                                                  |
| Toàn bộ project `webview`                                     | ✅ 115/115 pass                                                |
| Toàn bộ project `backend`                                     | ✅ 100 pass / 15 skip (4 suite `Hook timed out` — xem ghi chú) |
| Typecheck (`pnpm run typecheck`)                              | ✅ sạch (toàn workspace)                                       |
| Lint (`pnpm run lint`)                                        | ✅ 0 error / 0 warning                                         |
| Compile (`pnpm run compile`)                                  | ✅ thành công                                                  |
| Format (`oxfmt --check`) trên các tệp Nhóm Việc 4             | ✅ sạch                                                        |

> Ghi chú: `pnpm run test` toàn cục vẫn gặp `Hook timed out` ở 4 suite backend (`getRemoteUrl`, `mergeBranch`, `tag/push`, `loadBranches/list`) do cold-start `git` trên Windows — sự cố môi trường đã ghi nhận tại `docs/05_issues/001_vitest_hook_timeout_windows.md`, không liên quan thay đổi này.

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động                                              | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt                                                                            |     Phân Loại     | Nguyên Nhân Gốc                                                           | Giải Pháp Đã Sửa                                                                                                  | Kết Quả Sau Sửa |
| :-: | :------------: | :------------------------------------------------------------ | :------------: | :----------------------------------------------------------------------------------------------------- | :---------------: | :------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- | :-------------: |
|  1  |     Vòng 1     | `docs/02_design/phase3/03_...md` (Mục 7)                      |   Typecheck    | Test component `CommitTable` đặc tả đuôi `.test.tsx` nhưng `vitest.config.ts` chỉ thu thập `*.test.ts` | `[DESIGN_DEFECT]` | Đuôi tệp test sai so với bộ thu thập vitest                               | Dùng `.test.ts` + `h()`/`render()`; cập nhật Mục 7 và bổ sung Lịch Sử Hiệu Chỉnh                                  | ✅ Đã khắc phục |
|  2  |     Vòng 1     | `tests/extension/watchers/gitRepoWatcher.debounce.test.ts`    |   Typecheck    | `TS2305: Module "vscode" has no exported member "createdWatchers"`                                     |    `[DEV_BUG]`    | Import `createdWatchers` từ `"vscode"` (type thật) thay vì đường dẫn mock | Import qua alias `@tests/extension/__mocks__/vscode`                                                              | ✅ Đã khắc phục |
|  3  |     Vòng 1     | `tests/extension/__mocks__/vscode.ts`                         |   Unit Test    | `TypeError: disposable.dispose is not a function`; thiếu `RelativePattern`/`onDidChange`/`onDidDelete` |    `[DEV_BUG]`    | Mock `vscode` chưa hỗ trợ đủ API dùng bởi watcher                         | Bổ sung class `Disposable` (có `dispose`), `RelativePattern`, `onDidChange`/`onDidDelete`, mảng `createdWatchers` | ✅ Đã khắc phục |
|  4  |     Vòng 1     | `tests/extension/watchers/gitRepoWatcher.debounce.test.ts`    |      Lint      | `import-js/order`: `@tests/...` phải đứng sau `@/...`                                                  |    `[DEV_BUG]`    | Đặt nhóm import sai thứ tự quy ước                                        | Sắp xếp lại nhóm import                                                                                           | ✅ Đã khắc phục |
|  5  |     Vòng 1     | `tests/webview/components/commit/CommitTable.staging.test.ts` |   Unit Test    | `AssertionError` (DOM chưa có `[data-action='stage-all']`) dù `inspectorMode` đã `staging`             |    `[DEV_BUG]`    | Preact re-render do tín hiệu là bất đồng bộ, assert DOM trước khi flush   | Chờ `await setTimeout(0)` sau mỗi lần click trước khi assert                                                      | ✅ Đã khắc phục |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng                         |   Ký Hiệu    |                 Giá Trị Thực Tế                  | Ghi Chú / Đánh Giá                                                        |
| :---------------------------------------- | :----------: | :----------------------------------------------: | :------------------------------------------------------------------------ |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)**   |     $C$      |                    **2 vòng**                    | Vòng 1 (typecheck + test + lint) → Vòng 2 (sửa mock, import, async flush) |
| **Tổng số lỗi kỹ thuật**                  | $E_{total}$  |                    **5 lỗi**                     | $E_{design} + E_{dev}$                                                    |
| **Số lỗi do Thiết Kế**                    | $E_{design}$ |                    **1 lỗi**                     | Đuôi `.test.tsx` sai với bộ thu thập vitest                               |
| **Số lỗi do Triển Khai (Bug Dev)**        |  $E_{dev}$   |                    **4 lỗi**                     | Import sai nguồn, mock `vscode` thiếu API, import order, async flush      |
| **Số sự cố Môi Trường/Tool**              |  $E_{env}$   | **0 sự cố** (không tính `Hook timed out` có sẵn) | Loại trừ khỏi tỷ lệ                                                       |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** |  **$DDR$**   |                    **20.0%**                     | $\frac{1}{5} \times 100\%$                                                |
| **TỶ LỆ BUG KHI DEV (IBR)**               |  **$IBR$**   |                    **80.0%**                     | $\frac{4}{5} \times 100\%$                                                |
| **Trạng thái cổng chẩn đoán cuối cùng**   |      -       |                  **100% PASS**                   | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (extension+webview): OK  |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

1. **`[DESIGN_DEFECT]` — đuôi tệp test**: design 03 Mục 7 đặc tả `CommitTable.integration.test.tsx`, nhưng `vitest.config.ts` chỉ thu thập `tests/webview/**/*.test.ts`. Đã chuẩn hóa thành `CommitTable.staging.test.ts` (dùng `h()`/`render()` thay JSX) và cập nhật Mục 7 + Lịch Sử Hiệu Chỉnh.
2. **Đồng bộ trạng thái (Task 4.2.3)**: thiết kế Mục 4.1 mô tả hai sự kiện `repo.updated` (nạp đồ thị) và `workspace.statusChanged` (đẩy kết quả trạng thái). Đã triển khai theo mô hình kéo đã nêu trong hợp đồng `repo.updated` — watcher phát `repo.updated`, Webview tự `refresh()` + `refreshStatus()` (truy vấn `workspaceStatus`). Sự kiện đẩy `workspace.statusChanged` (mang trọn `WorkspaceStatusResult`) chưa được tạo để tránh kéo `gitClient` vào watcher; sẽ cân nhắc ở Nhóm Việc 5 nếu cần đẩy chủ động.
3. **Diff working-tree**: `onDiff` trong `StagingArea` vẫn là no-op (chưa có action `openFileDiff`), ghi chú hoãn như Nhóm Việc 3.

---

## 7. Kết Luận

| Tiêu chí                                                | Trạng thái |
| :------------------------------------------------------ | :--------: |
| Click dòng `*` mở StagingArea (không còn `undefined`)   |   ✅ Đạt   |
| Điều phối Inspector `StagingArea` vs `CommitDetails`    |   ✅ Đạt   |
| Zero layout shift (overlay absolute, số dòng không đổi) |   ✅ Đạt   |
| Debounce 150ms + bộ lọc thư mục rác                     |   ✅ Đạt   |
| Đồng bộ Watcher → Webview (refresh + refreshStatus)     |   ✅ Đạt   |
| Test watcher + CommitTable                              | ✅ 9/9 mới |
| Typecheck + lint + compile + format                     |   ✅ Đạt   |
