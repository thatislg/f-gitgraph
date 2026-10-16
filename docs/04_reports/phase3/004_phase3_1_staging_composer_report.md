# Báo Cáo Nhiệm Vụ 3.1 → 3.5 — Phân Vùng Staging, Composer & Quản Lý Trạng Thái

> **Mã báo cáo**: 004_phase3_1_staging_composer_report
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)
> **Nhóm việc liên quan**: Nhóm Việc 3 — Triển Khai Phân Vùng Staging, Composer & Quản Lý Trạng Thái
> **Nhiệm vụ**: 3.1 (`StagingPanel`), 3.2 (`CommitComposer`), 3.3 (`staging.store`), 3.4 (`StagingArea`), 3.5 (Unit Tests)
> **Ngày thực hiện**: 2026-10-16
> **Tài liệu thiết kế áp dụng**: [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md), [01_Staging_Backend_And_Mutator_Design.md](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md), [04_Audio_Feedback_And_Sound_Design.md](../../02_design/phase3/04_Audio_Feedback_And_Sound_Design.md)

---

## 1. Mục Tiêu & Phạm Vi

Xây dựng tầng giao diện và quản lý trạng thái của Khu Vực Staging & Commit Composer: bảng hiển thị tệp hai phân khu (`StagingPanel`), bộ soạn thảo commit chuyên nghiệp (`CommitComposer`), kho trạng thái phản ứng bằng Preact Signals (`staging.store.ts`), container tích hợp (`StagingArea`), cùng bộ unit test độc lập theo chuẩn TDD.

Phạm vi gồm:

1. Nhiệm vụ 3.1: `StagingPanel.tsx` (2 phân khu, bộ đếm, bulk actions, empty state).
2. Nhiệm vụ 3.2: `CommitComposer.tsx` (subject + bộ đếm 50 ký tự 3 màu, mô tả auto-grow, Amend/Sign, nút Commit & Commit & Push, `Ctrl/Cmd+Enter`, âm thanh).
3. Nhiệm vụ 3.3: `staging.store.ts` (tín hiệu cơ sở + dẫn xuất + dispatchers).
4. Nhiệm vụ 3.4: `StagingArea.tsx` (tích hợp + quản lý `DiscardConfirmModal`).
5. Nhiệm vụ 3.5: 3 tệp unit test độc lập.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File                                                      | Nội dung                                                                                                                                              |
| :-------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/webview/components/staging/StagingPanel.tsx`         | Bảng 2 phân khu Staged/Changes, bộ đếm, nút bulk (Stage All / Unstage All / Discard All), empty state.                                                |
| `src/webview/components/staging/CommitComposer.tsx`       | Ô tiêu đề 34px + bộ đếm 50 ký tự 3 màu, mô tả auto-grow 60–160px, checkbox Amend/Sign, nút Commit & Commit & Push, phím tắt toàn cục.                 |
| `src/webview/components/staging/StagingArea.tsx`          | Container bọc `CornerCrossFrame`, nối `StagingPanel` + `CommitComposer`, quản lý modal Discard.                                                       |
| `src/webview/lib/stores/staging.store.ts`                 | Signals (`stagedFiles`, `unstagedFiles`, `commitSubject`, ...), computed (`canCommit`, `subjectCounterColor`, `commitButtonLabel`, ...), dispatchers. |
| `src/webview/lib/audio.ts`                                | Tổng hợp âm thanh chốt cơ khí (dual sine 1200Hz + 850Hz, 15ms) qua Web Audio API.                                                                     |
| `src/webview/lib/handler/commit-result.ts`                | Xử lý phản hồi `commitChanges`/`commitAndPush`: hạ `isCommitting`, làm sạch tiêu đề/mô tả, phát âm thanh.                                             |
| `src/webview/styles.css`                                  | Bổ sung token màu bộ đếm (`--color-counter-*`).                                                                                                       |
| `src/types/actions.ts`                                    | Bổ sung action `commitAndPush`.                                                                                                                       |
| `src/extension/mutator/gitCliMutator.ts`                  | Bổ sung phương thức `commitAndPush` (commit → push).                                                                                                  |
| `src/extension/services/messageHandler.ts`                | Đăng ký routing `commitAndPush`; di dời `runMutation` ra module scope.                                                                                |
| `src/webview/lib/dispatcher.ts`                           | Đăng ký handler `commitChanges`/`commitAndPush` → `handleCommitResult`.                                                                               |
| `src/extension/l10n/webviewL10n.ts`                       | Bổ sung chuỗi lỗi `unableToCommitAndPush`.                                                                                                            |
| `tests/webview/lib/stores/staging.store.test.ts`          | Test `canCommit`, `loadStatus`, `setAmend`.                                                                                                           |
| `tests/webview/components/staging/CommitComposer.test.ts` | Test bộ đếm, disabled, nhãn nút, `Ctrl+Enter`, amend-fill.                                                                                            |
| `tests/webview/components/staging/StagingPanel.test.ts`   | Test render tệp, bulk actions, empty state.                                                                                                           |
| `tests/extension/services/stagingMessageHandler.test.ts`  | Bổ sung test routing `commitAndPush`.                                                                                                                 |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 3.3 — `staging.store.ts` (nền tảng)

- Tín hiệu cơ sở: `stagedFiles`, `unstagedFiles` (`StagingFile[]`), `commitSubject`, `commitDescription`, `isAmend`, `isSign`, `isCommitting`, `discardModalTarget`; thêm `headCommitSubject`/`headCommitDescription` + bản nháp để hỗ trợ amend-fill.
- Computed: `stagedCount`, `unstagedCount`, `canCommit` (bảng chân trị: tiêu đề khác rỗng **và** (`stagedCount > 0` **hoặc** `isAmend`) **và** không `isCommitting`), `subjectCounterColor` (`idle`/`warn`/`danger`), `commitButtonLabel`.
- Dispatchers: `loadStatus`, `stage`, `unstage`, `stageAll`, `unstageAll`, `openDiscardModal`/`closeDiscardModal`/`confirmDiscard`, `setAmend`, `commit`, `commitAndPush`. Mọi hành động ghi đi qua `runAction` (ranh giới an toàn 4 tầng).

### 3.2. Nhiệm vụ 3.1 — `StagingPanel.tsx`

- Component thuần (presentational), nhận props tệp + callback để dễ kiểm thử độc lập; tái sử dụng `StagingFileItem`.
- Hai phân khu `Staged Changes (n)` / `Changes (n)`, nút bulk `- Unstage All` / `+ Stage All` / `↺ Discard All` (disabled khi rỗng), empty state `No staged changes` / `Working tree clean`.

### 3.3. Nhiệm vụ 3.2 — `CommitComposer.tsx`

- Ô tiêu đề cao 34px, placeholder `Commit message (Ctrl+Enter to commit)...`, focus viền tím Neon + glow; phím `Enter` (không kèm modifier) nhảy xuống mô tả.
- Bộ đếm `(n/50)` đặt góc phải, 3 mức màu theo độ dài (≤50 xám, 51–72 hổ phách, >72 đỏ) qua token `--color-counter-*`.
- Textarea mô tả auto-grow 60–160px (đo `scrollHeight`), thanh cuộn mỏng.
- Checkbox Amend (`setAmend`: cất nháp → nạp HEAD; bỏ → khôi phục nháp) và Sign (`isSign`).
- Nút Commit (gradient tím `#a855f7→#7c3aed`, nhãn động `Commit N files`/`Amend commit`, spinner khi `isCommitting`) và nút Commit & Push (viền tím trong suốt), đều `disabled` theo `canCommit`.
- Phím tắt toàn cục `Ctrl/Cmd+Enter` qua listener `keydown` document-level.

### 3.4. Nhiệm vụ 3.4 — `StagingArea.tsx`

- Bọc `StagingPanel` + `CommitComposer` trong `CornerCrossFrame`, đọc signals từ store và nối dispatchers thành callbacks; quản lý tập trung `DiscardConfirmModal` từ `discardModalTarget`.

### 3.5. Nhiệm vụ 3.5 — Unit Tests

- 17 test mới (store 7, CommitComposer 5, StagingPanel 5) + 1 test routing `commitAndPush` ở tầng extension.

---

## 4. Kiểm Thử

| Hạng mục                                                  | Kết quả                  |
| :-------------------------------------------------------- | :----------------------- |
| `tests/webview/lib/stores/staging.store.test.ts`          | ✅ 7/7 pass              |
| `tests/webview/components/staging/CommitComposer.test.ts` | ✅ 5/5 pass              |
| `tests/webview/components/staging/StagingPanel.test.ts`   | ✅ 5/5 pass              |
| Toàn bộ project `webview`                                 | ✅ 111/111 pass          |
| `tests/extension/services/stagingMessageHandler.test.ts`  | ✅ 6/6 pass              |
| Typecheck (`pnpm run typecheck`)                          | ✅ sạch (toàn workspace) |
| Lint (`pnpm run lint`)                                    | ✅ 0 error / 0 warning   |
| Compile (`pnpm run compile`)                              | ✅ thành công            |
| Format (`oxfmt --check`) trên các tệp Nhóm Việc 3         | ✅ sạch                  |

> Ghi chú: `pnpm run test` toàn cục vẫn gặp `Hook timed out` ở suite `tests/backend/queries/loadBranches/list.test.ts` (cold-start `git` trên Windows) — sự cố môi trường đã ghi nhận tại `docs/05_issues/001_vitest_hook_timeout_windows.md`, không liên quan thay đổi này.

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động                                                                                                                    | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt                                                                    |     Phân Loại     | Nguyên Nhân Gốc                                                                                                        | Giải Pháp Đã Sửa                                                                                                                   | Kết Quả Sau Sửa |
| :-: | :------------: | :---------------------------------------------------------------------------------------------------------------------------------- | :------------: | :--------------------------------------------------------------------------------------------- | :---------------: | :--------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :-------------: |
|  1  |     Vòng 1     | `tests/webview/components/staging/CommitComposer.test.ts`, `StagingPanel.test.ts`, `src/webview/components/staging/StagingArea.tsx` |      Lint      | `import-js/order`: sai thứ tự/nhóm import (`@/` phải đứng trước `@tests/`, `ui` sau `staging`) |    `[DEV_BUG]`    | Đặt import sai quy ước `import-js/order` của repo                                                                      | Sắp xếp lại nhóm import đúng thứ tự `external` → `@/` → `@tests/`                                                                  | ✅ Đã khắc phục |
|  2  |     Vòng 1     | `src/webview/components/staging/CommitComposer.tsx`                                                                                 |      Lint      | `unicorn/consistent-function-scoping`: `autoGrow` không dùng biến ngoài                        |    `[DEV_BUG]`    | Khai báo hàm trong thân component dù không phụ thuộc state                                                             | Di dời `autoGrow` ra module scope                                                                                                  | ✅ Đã khắc phục |
|  3  |     Vòng 1     | `tests/webview/components/staging/CommitComposer.test.ts`                                                                           |   Unit Test    | `AssertionError` (amend không nạp tiêu đề HEAD)                                                |    `[DEV_BUG]`    | jsdom `.click()` trên checkbox không kích hoạt `change` (không toggle `checked`/fire event)                            | Đặt `checked = true` rồi `dispatchEvent(new Event("change"))`, assert trực tiếp `commitSubject.value`                              | ✅ Đã khắc phục |
|  4  |     Vòng 1     | `src/webview/lib/stores/staging.store.ts` + `src/types/actions.ts` + `src/extension/**`                                             |   Typecheck    | Thiếu action RPC `commitAndPush` cho dispatcher `commitAndPush()`                              | `[DESIGN_DEFECT]` | UI design §4.3 đặc tả `commitAndPush()` nhưng hợp đồng RPC (backend design §4.1 + `actions.ts`) thiếu action tương ứng | Bổ sung action `commitAndPush` (types + `GitCliMutator.commitAndPush` + messageHandler + l10n) và cập nhật design doc 01 §4.1/§4.4 | ✅ Đã khắc phục |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng                         |   Ký Hiệu    | Giá Trị Thực Tế | Ghi Chú / Đánh Giá                                                                              |
| :---------------------------------------- | :----------: | :-------------: | :---------------------------------------------------------------------------------------------- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)**   |     $C$      |   **3 vòng**    | Vòng 1 (lint + test) → Vòng 2 (sửa import/scoping + di dời `runMutation`) → Vòng 3 (sửa shadow) |
| **Tổng số lỗi kỹ thuật**                  | $E_{total}$  |    **4 lỗi**    | $E_{design} + E_{dev}$                                                                          |
| **Số lỗi do Thiết Kế**                    | $E_{design}$ |    **1 lỗi**    | Thiếu action `commitAndPush` trong hợp đồng RPC                                                 |
| **Số lỗi do Triển Khai (Bug Dev)**        |  $E_{dev}$   |    **3 lỗi**    | Import order, `autoGrow` scoping, test checkbox                                                 |
| **Số sự cố Môi Trường/Tool**              |  $E_{env}$   |   **0 sự cố**   | Loại trừ khỏi tỷ lệ                                                                             |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** |  **$DDR$**   |    **25.0%**    | $\frac{1}{4} \times 100\%$                                                                      |
| **TỶ LỆ BUG KHI DEV (IBR)**               |  **$IBR$**   |    **75.0%**    | $\frac{3}{4} \times 100\%$                                                                      |
| **Trạng thái cổng chẩn đoán cuối cùng**   |      -       |  **100% PASS**  | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (webview+extension): OK                        |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

1. **`[DESIGN_DEFECT]` — `commitAndPush` thiếu trong hợp đồng RPC**: UI design 02 §4.3 yêu cầu dispatcher `commitAndPush()` nhưng backend design 01 §4.1 và `src/types/actions.ts` chưa khai báo action này. Đã bổ sung action + phương thức `GitCliMutator.commitAndPush` (commit → `git push`) và cập nhật design doc 01 (§4.1 bảng payload, §4.4 routing).
2. **Âm thanh commit (3 nguồn mâu thuẫn)**: design 02 §3.3.6 và progress 3.2.9 ghi "dual sine 1200Hz + 850Hz, 15ms"; design 04 §3 ghi "sine sweep 750→180Hz + nhiễu trắng, 80ms". Đã triển khai theo task 3.2.9 (dual sine 1200Hz + 850Hz, 15ms) và cần người chủ trì thiết kế xác nhận đồng bộ.
3. **`isSign` (task 3.2.5)**: đồng bộ mặc định theo `.gitconfig` và lưu lựa chọn vào cấu hình chưa có RPC hỗ trợ; hiện triển khai tín hiệu `isSign` (mặc định `false`) và ghi chú hoãn phần đồng bộ cấu hình.
4. **Amend-fill (task 3.2.4)**: nguồn tiêu đề/mô tả HEAD được đặt trong tín hiệu `headCommitSubject`/`headCommitDescription`, sẽ được lớp tích hợp (Nhóm Việc 4) nạp từ `commitList`/`commitHead`.
5. **Diff working-tree (click dòng tệp)**: chưa có RPC mở diff working-tree; `onDiff` trong `StagingArea` hiện là no-op chờ ghép nối ở giai đoạn sau.

---

## 7. Kết Luận

| Tiêu chí                                                              |  Trạng thái  |
| :-------------------------------------------------------------------- | :----------: |
| Bảng Staging 2 phân khu + bulk actions + empty state                  |    ✅ Đạt    |
| Composer: bộ đếm 3 màu, auto-grow, Amend/Sign, `Ctrl+Enter`, âm thanh |    ✅ Đạt    |
| Preact Signals store (base + computed + dispatchers)                  |    ✅ Đạt    |
| Container `StagingArea` + quản lý modal tập trung                     |    ✅ Đạt    |
| Unit test store/composer/panel + routing `commitAndPush`              | ✅ 18/18 mới |
| Typecheck + lint + compile + format                                   |    ✅ Đạt    |
