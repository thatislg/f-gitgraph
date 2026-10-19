# Báo Cáo Nhóm Việc 1 (Phase 3.2) — Mở Rộng Backend Mutator, Bộ Truy Vấn Sync/Stash & Hợp Đồng RPC (Contract-First)

> **Mã báo cáo**: 009_phase3_2_sync_stash_backend_report
> **Giai đoạn**: Phase 3.2 — Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục
> **Nhóm việc liên quan**: Nhóm Việc 1 — Mở Rộng Backend Mutator, Bộ Truy Vấn & Hợp Đồng RPC (Contract-First)
> **Nhiệm vụ**: 1.1 (mở rộng `GitCliMutator` mạng & stash), 1.2 (bộ truy vấn `syncStatus`/`stashList`), 1.3 (khai hợp đồng RPC & đăng ký message handler), 1.4 (bộ unit test backend)
> **Ngày thực hiện**: 2026-10-19
> **Tài liệu thiết kế áp dụng**: [05_Sync_And_Stash_Backend_Mutator_Design.md](../../02_design/phase3/05_Sync_And_Stash_Backend_Mutator_Design.md)

---

## 1. Mục Tiêu & Phạm Vi

Hoàn thiện nền tảng backend cho thanh công cụ đồng bộ toàn cục (Top Toolbar) và cây điều hướng Stash của Phase 3.2, trước khi dựng bất kỳ giao diện UI nào (tuân thủ **Nguyên Tắc 1: Contract-First**). Cụ thể:

1. Mở rộng `GitCliMutator` với 6 thao tác mạng & stash: `fetchAll`, nâng cấp `pull`/`push`, `stashSave`, `stashPop`, `stashDrop`.
2. Xây dựng 2 bộ truy vấn backend thuần: `syncStatus` (đếm ahead/behind) và `stashList` (bóc tách ngăn xếp stash).
3. Khai báo hợp đồng RPC trong `src/types/` trước, sau đó đăng ký định tuyến trong `messageHandler.ts`.
4. Viết 4 tệp unit test độc lập trên kho Git thật giả lập.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File | Nội dung |
| :--- | :--- |
| `src/extension/mutator/gitCliMutator.ts` | Bổ sung `fetchAll`, nâng cấp `pull(mode)`/`push(options)`, thêm `stashSave`/`stashPop`/`stashDrop`; mở rộng `normalizeError` (lỗi mạng/SSH chuẩn Anh). |
| `src/backend/queries/syncStatus.ts` | Truy vấn `git rev-list --left-right --count HEAD...@{u}` qua `SimpleGit.raw`, export `parseAheadBehind` (thuần). |
| `src/backend/queries/stashList.ts` | Truy vấn `git stash list --pretty=format:%gd%x00%h%x00%gs%x00%cr`, export `parseStashList` (thuần). |
| `src/types/actions.ts` | Khai báo payload cho `fetchAll`, `pull`, `push`, `stashSave`, `stashPop`, `stashDrop`. |
| `src/types/queries.ts` | Khai báo query payload `syncStatus`/`stashList` cùng kiểu kết quả `SyncStatusResult`/`StashRecord`/`StashListResult`. |
| `src/extension/services/messageHandler.ts` | Đăng ký 6 action mutate + 2 query mới. |
| `src/extension/l10n/webviewL10n.ts` | Bổ sung 6 key lỗi nội địa hóa. |
| `src/webview/lib/handler/action-result.ts` | Bổ sung 6 entry vào `ERROR_KEY`. |
| `tests/backend/mutator/syncMutator.test.ts` | Unit test 6 lệnh mạng & stash (7 test). |
| `tests/backend/queries/syncStatus.test.ts` | Unit test bóc tách ahead/behind (8 test). |
| `tests/backend/queries/stashList.test.ts` | Unit test bóc tách danh sách stash (6 test). |
| `tests/extension/services/syncMessageHandler.test.ts` | Unit test định tuyến RPC (5 test). |
| `tests/backend/gitCliMutator.test.ts` | Sửa assertion `index.lock` sang chuỗi tiếng Anh. |
| `vitest.config.ts` | Bổ sung `testTimeout`/`hookTimeout` 30s cho project `backend`. |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 1.1 — Mở rộng `GitCliMutator`

| Phương thức | Lệnh Git gốc | Ghi chú an toàn |
| :--- | :--- | :--- |
| `fetchAll(prune = true)` | `git fetch --all [--prune]` | `--prune` dọn tracking branch đã bị xóa. |
| `pull(mode)` | `git pull --no-rebase` / `git pull --rebase` | Tự phát hiện xung đột (`CONFLICT`) và overwrite cục bộ. |
| `push(options)` | `git push [--force-with-lease] [-u] [remote branch]` | Hỗ trợ `--force-with-lease`, `-u`, chỉ định remote/branch; nhận diện `[rejected]`/`non-fast-forward`. |
| `stashSave(message?, includeUntracked)` | `git stash push [-u] [-m msg] --` | Ký tự `--` chặn nhầm đường dẫn; `-u` kèm untracked. |
| `stashPop(index = 0)` | `git stash pop stash@{index}` | Chuẩn hóa `index` (`Math.max(0, Math.floor)`). |
| `stashDrop(index = 0)` | `git stash drop stash@{index}` | Chuẩn hóa `index` tương tự. |

`normalizeError` được mở rộng thêm nhóm lỗi: kết nối mạng (`Could not resolve host`, `Failed to connect`, `Network is unreachable`, `Could not read from remote repository`), xác thực (`Permission denied (publickey)`, `Authentication failed`, `Invalid username or password`), và đổi chuỗi `index.lock` sang tiếng Anh chuẩn.

### 3.2. Nhiệm vụ 1.2 — Bộ truy vấn backend

- **`getSyncStatus(git: SimpleGit)`**: dùng `git.raw` xác định tên nhánh HEAD → upstream tracking (`@{u}`) → `rev-list --left-right --count HEAD...@{u}`. Trả về `{ ahead, behind, upstream, isDetached }`. Hàm thuần `parseAheadBehind` bóc tách 2 số đếm, rơi về `0` khi input rỗng/sai.
- **`getStashList(git: SimpleGit)`**: dùng `git.raw` với format NUL-delimiter, trả về `{ stashes: StashRecord[] }`. Hàm thuần `parseStashList` bảo toàn Unicode tiếng Việt và ký tự đặc biệt.

### 3.3. Nhiệm vụ 1.3 — Hợp đồng RPC & định tuyến

- `src/types/actions.ts`: `fetchAll { prune }`, `pull { mode }`, `push { forceWithLease?, remote?, branch?, setUpstream? }`, `stashSave { message?, includeUntracked }`, `stashPop { index }`, `stashDrop { index }`.
- `src/types/queries.ts`: `syncStatus` → `SyncStatusResult`, `stashList` → `StashListResult`; kiểu kết quả định vị tại đây để Webview import được (chuẩn Contract-First, tránh kéo Node type).
- `messageHandler.ts`: 6 action ủy thác cho `GitCliMutator` qua `runMutation`; 2 query gọi qua `gitClient.getInstance()`.

### 3.4. Nhiệm vụ 1.4 — Unit test (26 test mới)

- `syncMutator.test.ts` (7): `fetchAll --prune`, `pull merge/rebase`, xung đột merge chuẩn Anh, `push` + `force-with-lease`, round-trip stash tracked/untracked, stash lỗi thiếu entry.
- `syncStatus.test.ts` (8): `parseAheadBehind` + 6 trạng thái (clean/ahead/behind/phân kỳ/không tracking/detached).
- `stashList.test.ts` (6): `parseStashList` đơn/nhiều bản ghi, Unicode tiếng Việt, và truy vấn kho thật.
- `syncMessageHandler.test.ts` (5): định tuyến 6 action, `status: null` khi thành công, lỗi, định tuyến 2 query.

---

## 4. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `tests/backend/mutator/syncMutator.test.ts` | ✅ 7/7 pass |
| `tests/backend/queries/syncStatus.test.ts` | ✅ 8/8 pass |
| `tests/backend/queries/stashList.test.ts` | ✅ 6/6 pass |
| `tests/extension/services/syncMessageHandler.test.ts` | ✅ 5/5 pass |
| Toàn bộ project `backend` | ✅ 148/148 pass |
| Toàn bộ project `extension` | ✅ 27/27 pass |
| Toàn bộ project `webview` | ✅ 121/121 pass |
| Typecheck (`pnpm run typecheck`) | ✅ sạch (toàn workspace) |
| Lint (`pnpm run lint`) | ✅ 0 error / 0 warning |
| Compile (`pnpm run compile`) | ✅ thành công |

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt | Phân Loại | Nguyên Nhân Gốc | Giải Pháp Đã Sửa | Kết Quả Sau Sửa |
| :-: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | Vòng 1 | `docs/02_design/phase3/05_...md` | Typecheck | Bộ truy vấn dùng `child_process.spawn` → kéo `node:child_process`/`Buffer` vào `src/types/queries.ts` dùng chung với Webview (`types: []`) phá typecheck Webview | `[DESIGN_DEFECT]` | Thiết kế chọn `spawn` tự phát, bỏ qua ranh giới kiểu Node.js / Webview | Chuyển sang `SimpleGit.raw(...)`, kế thừa `gitPath`, định vị kiểu kết quả tại `src/types/queries.ts`; cập nhật thiết kế v1.1.0 | ✅ Đã khắc phục |
| 2 | Vòng 1 | `docs/02_design/phase3/05_...md` (Mục 2.5, 4) | Unit Test | Thiết kế ghi `is not a stash-like commit` nhưng Git 2.56.0 thực tế trả `stash@{N} is not a valid reference` khi chỉ số ngoài ngăn xếp | `[DESIGN_DEFECT]` | Chuỗi nhận diện lỗi stash trong thiết kế không khớp đầu ra Git thực | Bắt cả 3 chuỗi (`is not a valid reference` / `is not a stash-like commit` / `No stash entries found`); cập nhật thiết kế v1.2.0 | ✅ Đã khắc phục |
| 3 | Vòng 1 | `tests/backend/mutator/syncMutator.test.ts` | Unit Test | `git init --bare` mặc định `HEAD = master` (không tồn tại) → clone không checkout `main` | `[DEV_BUG]` | Bỏ qua nhánh khởi tạo của bare remote | Dùng `git init --bare --initial-branch=main` trong helper test | ✅ Đã khắc phục |
| 4 | Vòng 1 | `tests/backend/queries/syncStatus.test.ts` | Unit Test | Test `behind` đọc `@{u}` cục bộ nhưng chưa cập nhật tracking ref remote | `[DEV_BUG]` | `rev-list --left-right --count HEAD...@{u}` đọc ref cục bộ, cần `fetch` trước | Thêm `git fetch origin` trước khi assert `behind` | ✅ Đã khắc phục |
| 5 | Vòng 1 | `vitest.config.ts` | Unit Test | Test mạng/clone/push vượt ngưỡng `hookTimeout`/`testTimeout` mặc định 5s trên Windows | `[ENV_TOOL_ISSUE]` | Độ trễ `CreateProcess` khi spawn `git.exe` cold-start trên Windows | Nâng `testTimeout`/`hookTimeout` lên 30s cho project `backend` | ✅ Đã khắc phục (loại khỏi tỷ lệ) |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng | Ký Hiệu | Giá Trị Thực Tế | Ghi Chú / Đánh Giá |
| :--- | :---: | :---: | :--- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)** | $C$ | **2 vòng** | Vòng 1 (typecheck + test phát hiện 4 lỗi) → Vòng 2 (sửa + re-run đến sạch) |
| **Tổng số lỗi kỹ thuật** | $E_{total}$ | **4 lỗi** | $E_{design} + E_{dev}$ |
| **Số lỗi do Thiết Kế** | $E_{design}$ | **2 lỗi** | `spawn` → `SimpleGit`; chuỗi nhận diện lỗi stash |
| **Số lỗi do Triển Khai (Bug Dev)** | $E_{dev}$ | **2 lỗi** | Bare remote HEAD; thiếu `fetch` trước khi assert `behind` |
| **Số sự cố Môi Trường/Tool** | $E_{env}$ | **1 sự cố** | Windows `CreateProcess` chậm — loại trừ khỏi tỷ lệ |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** | **$DDR$** | **50.0%** | $\frac{2}{4} \times 100\%$ |
| **TỶ LỆ BUG KHI DEV (IBR)** | **$IBR$** | **50.0%** | $\frac{2}{4} \times 100\%$ |
| **Trạng thái cổng chẩn đoán cuối cùng** | - | **100% PASS** | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (backend+extension+webview): OK |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

1. **`[DESIGN_DEFECT]` — `spawn` → `SimpleGit` (v1.1.0)**: Thiết kế gốc chọn `child_process.spawn` tự phát cho 2 bộ truy vấn. Vì `src/types/queries.ts` được dùng chung với tầng Webview (tsconfig `types: []`, không có type Node.js), việc import `node:child_process`/`Buffer` làm ô nhiễm typecheck Webview và bỏ quên cấu hình `gitPath` tùy chỉnh. Đã chuyển sang `SimpleGit.raw(...)` — kế thừa `gitPath`, cách ly triệt để Node.js khỏi Webview, kiểu kết quả đặt tại `src/types/queries.ts`.
2. **`[DESIGN_DEFECT]` — chuỗi nhận diện lỗi stash (v1.2.0)**: Git CLI 2.56.0 trả `error: stash@{N} is not a valid reference` khi chỉ số stash vượt ngăn xếp; `is not a stash-like commit` chỉ xuất hiện khi truyền một tham chiếu không phải stash. Code bắt cả 3 chuỗi để chuẩn hóa thông điệp tiếng Anh.

---

## 7. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Mở rộng `GitCliMutator` (fetchAll/pull/push/stash) | ✅ Đạt |
| Bộ truy vấn `syncStatus`/`stashList` thuần | ✅ Đạt |
| Hợp đồng RPC Contract-First (`actions`/`queries`) | ✅ Đạt |
| Đăng ký `messageHandler` (6 action + 2 query) | ✅ Đạt |
| Unit test backend (26 test mới) | ✅ 26/26 |
| Typecheck + lint + compile | ✅ Đạt |
