# Báo Cáo Bổ Sung Nhóm Việc 1 (Phase 3.2) — Truy Vấn `listTags` & Phân Nhóm TAGS

> **Mã báo cáo**: 012_phase3_2_tags_report
> **Giai đoạn**: Phase 3.2 — Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục
> **Nhóm việc liên quan**: Nhóm Việc 1 (bổ sung) — Mở Rộng Backend Query & Hợp Đồng RPC
> **Nhiệm vụ**: 1.2.3 (`listTags.ts`), 1.3.2 (types), 1.3.3 (messageHandler), 1.4.5 (unit test)
> **Ngày thực hiện**: 2026-10-19
> **Tài liệu thiết kế áp dụng**: [05_Sync_And_Stash_Backend_Mutator_Design.md](../../02_design/phase3/05_Sync_And_Stash_Backend_Mutator_Design.md) (v1.3.0), [07_Sidebar_Navigator_Tree_Design.md](../../02_design/phase3/07_Sidebar_Navigator_Tree_Design.md)

---

## 1. Mục Tiêu & Phạm Vi

Lấp lỗ hổng thiết kế được phát hiện khi khảo sát giao diện: phân nhóm **TAGS** trên cây điều hướng Sidebar Navigator trống do **thiếu nguồn dữ liệu backend** — Design 05 chỉ đặc tả `syncStatus` + `stashList`, không có query `listTags`, dẫn tới `App.tsx` phải truyền cứng `tags={[]}`.

Phạm vi công việc (theo chuẩn **Contract-First / Design-by-Word** — đặc tả được bổ sung trước ở commit `fad232c`):

1. Khai báo kiểu hợp đồng `ListTagsInput` + `TagListResult` tại `src/types/queries.ts`.
2. Xây dựng query backend `src/backend/queries/listTags.ts` (`parseTagList` thuần + `listTags` qua `SimpleGit.raw`).
3. Đăng ký query handler `listTags` trong `messageHandler.ts`.
4. Đồng bộ chuỗi Webview: `refreshTags()` → tín hiệu `tagList` → handler `handleTagList` → dispatcher → nối `App.tsx`.
5. Viết 3 tệp unit test (14 test mới) và chạy 4 cổng chẩn đoán đạt 100% PASS.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File | Nội dung |
| :--- | :--- |
| `src/types/queries.ts` | Bổ sung `ListTagsInput` (`sort?: "creatordate" \| "name"`), `TagListResult` (`{ tags: string[] }`) và mục `listTags` trong `QueryPayloads` (request `{ repo, sort? }`, response `TagListResult`). |
| `src/backend/queries/listTags.ts` | `parseTagList(stdout)` thuần (split `\r?\n`, trim, bỏ dòng rỗng, bảo toàn Unicode/ký tự đặc biệt) + `listTags(git, input?)` qua `SimpleGit.raw(["tag", "--list", "--sort=-creatordate"])`, fallback `{ tags: [] }` khi rỗng/lỗi. |
| `src/extension/services/messageHandler.ts` | Import `listTags`; đăng ký `bridge.onMessage("listTags", ...)` truyền `{ sort: msg.sort }` khi có. |
| `src/webview/lib/actions.ts` | Bổ sung `refreshTags(repo?)`; gọi trong `selectRepo` và `refresh` (sau khi thêm/xóa tag qua `handleActionResult`). |
| `src/webview/lib/stores/sync.store.ts` | Bổ sung tín hiệu `tagList` + hàm nạp `loadTagList(tags)`. |
| `src/webview/lib/handler/sync-query.ts` | Bổ sung `handleTagList` nạp `msg.tags` vào `sync.store`. |
| `src/webview/lib/dispatcher.ts` | Đăng ký `listTags → handleTagList`. |
| `src/webview/App.tsx` | Đổi `tags={[]}` → `tags={tagList.value}`. |
| `tests/backend/queries/listTags.test.ts` | Unit test backend (11 test). |
| `tests/extension/services/syncMessageHandler.test.ts` | Bổ sung 2 test định tuyến query `listTags`. |
| `tests/webview/lib/stores/sync.store.test.ts` | Bổ sung 1 test `loadTagList`. |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 1.2.3 — Query backend `listTags.ts`

- **`parseTagList(stdout: string): string[]`**: tách theo regex ngắt dòng đa nền tảng `\r?\n`, `trim()` từng dòng, bỏ dòng rỗng, bảo toàn tag phân cấp (`release/v1.0.0`), ký tự đặc biệt (`v1.0.0+build123`, `v1.0.0-rc.1`).
- **`listTags(git: SimpleGit, input?: ListTagsInput): Promise<TagListResult>`**: `sort === "name"` → `["tag", "--list"]` (Git tự xếp refname A-Z); mặc định → `["tag", "--list", "--sort=-creatordate"]`. Bọc `.catch(() => "")` và trả `{ tags: [] }` khi stdout rỗng hoặc lệnh thất bại (thư mục không phải Git repo).

### 3.2. Nhiệm vụ 1.3.2 / 1.3.3 — Hợp đồng RPC & Message Handler

- `TagListResult`/`ListTagsInput` định vị trực tiếp tại `src/types/queries.ts` (Contract-First, tự lan qua `export * from "./queries"`).
- `messageHandler.ts` định tuyến `listTags` sang `listTags(gitClient.getInstance(), msg.sort === undefined ? undefined : { sort: msg.sort })` (tránh `exactOptionalPropertyTypes` khi `sort` vắng mặt).

### 3.3. Đồng bộ Webview

- `refreshTags(repo?)` được gọi trong `selectRepo` (nạp ngay khi chọn repo) và `refresh` (sau khi `addTag`/`deleteTag` thành công qua `handleActionResult`), đảm bảo phân nhóm TAGS luôn phản xạ thời gian thực.
- Phản hồi đi qua `handleTagList` → `loadTagList` → `tagList` signal → `App.tsx` `tags={tagList.value}`.

### 3.4. Nhiệm vụ 1.4.5 — Unit test (14 test mới)

- `listTags.test.ts` (11): `parseTagList` 6 case (đơn/multiple/rỗng/CRLF+hierarchical+đặc biệt) + `listTags` 5 case (repo không tag, creatordate newest-first, sort name A-Z, lightweight+annotated, fallback thư mục không phải Git repo).
- `syncMessageHandler.test.ts` (+2): định tuyến `listTags` qua SimpleGit + truyền `sort` thành `["tag", "--list"]`.
- `sync.store.test.ts` (+1): `loadTagList` gán `tagList`.

---

## 4. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `tests/backend/queries/listTags.test.ts` | ✅ 11/11 pass |
| `tests/extension/services/syncMessageHandler.test.ts` | ✅ 7/7 pass (tăng +2) |
| `tests/webview/lib/stores/sync.store.test.ts` | ✅ 13/13 pass (tăng +1) |
| Toàn bộ project `backend` | ✅ 159/159 pass (tăng +11) |
| Toàn bộ project `extension` | ✅ 29/29 pass (tăng +2) |
| Toàn bộ project `webview` | ✅ 198/198 pass (tăng +1) |
| Typecheck (`pnpm run typecheck`) | ✅ sạch (toàn workspace) |
| Lint (`pnpm run lint`) | ✅ 0 error / 0 warning |
| Compile (`pnpm run compile`) | ✅ thành công |

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt | Phân Loại | Nguyên Nhân Gốc | Giải Pháp Đã Sửa | Kết Quả Sau Sửa |
| :-: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | Vòng 1 | `src/extension/services/messageHandler.ts` | Lint | `import-js(order): @/backend/queries/listTags should occur before @/backend/queries/loadBranches` | `[DEV_BUG]` | Import `listTags` đặt sau `loadBranches` (sai thứ tự chữ cái: `listTags` < `loadBranches`) | Hoán đổi thứ tự hai dòng import | ✅ Đã khắc phục |
| 2 | Vòng 1 | `tests/backend/queries/listTags.test.ts` | Lint | `unicorn(no-array-sort): Use Array#toSorted() instead of Array#sort()` | `[DEV_BUG]` | Dùng `Array#sort()` biến đổi mảng gốc trong assertion test tag lightweight/annotated | Thay bằng `toSorted()` trả mảng mới | ✅ Đã khắc phục |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng | Ký Hiệu | Giá Trị Thực Tế | Ghi Chú / Đánh Giá |
| :--- | :---: | :---: | :--- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)** | $C$ | **2 vòng** | Vòng 1 (lint 2) → Vòng 2 sạch |
| **Tổng số lỗi kỹ thuật** | $E_{total}$ | **2 lỗi** | $E_{design} + E_{dev}$ |
| **Số lỗi do Thiết Kế** | $E_{design}$ | **0 lỗi** | Thiết kế v1.3.0 đã bổ sung trước khi triển khai |
| **Số lỗi do Triển Khai (Bug Dev)** | $E_{dev}$ | **2 lỗi** | 1 import-order + 1 `no-array-sort` |
| **Số sự cố Môi Trường/Tool** | $E_{env}$ | **0 sự cố** | — |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** | **$DDR$** | **0.0%** | $\frac{0}{2} \times 100\%$ |
| **TỶ LỆ BUG KHI DEV (IBR)** | **$IBR$** | **100.0%** | $\frac{2}{2} \times 100\%$ |
| **Trạng thái cổng chẩn đoán cuối cùng** | - | **100% PASS** | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (backend 159 + extension 29 + webview 198): OK |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

1. **`ListTagsInput` chưa được định vị rõ trong đặc tả**: Design 05 Mục 3.3 nhắc tới kiểu `ListTagsInput` nhưng không chỉ nơi khai báo. Đã đặt cạnh `TagListResult` tại `src/types/queries.ts` (đồng bộ chuẩn "định vị kiểu hợp đồng tại `queries.ts`"), không phát sinh thay đổi design.
2. **Nhánh `sort === "name"` dùng `["tag", "--list"]`** (không `--sort=refname`): Git mặc định đã xếp theo refname A-Z, nên đặc tả gọn và đúng; giữ nguyên theo thiết kế.
3. **`stashApply` không tồn tại** (đã ghi nhận ở báo cáo 011): không liên quan tới `listTags`, chỉ nêu để đối chiếu.

---

## 7. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| `ListTagsInput` / `TagListResult` (Contract-First) | ✅ Đạt |
| `src/backend/queries/listTags.ts` (`parseTagList` + `listTags`) | ✅ Đạt |
| Đăng ký query handler `listTags` trong `messageHandler.ts` | ✅ Đạt |
| Chuỗi Webview `refreshTags` → `tagList` → `handleTagList` → dispatcher | ✅ Đạt |
| Nối `App.tsx` `tags={tagList.value}` | ✅ Đạt |
| Unit test backend (11) + extension (2) + webview (1) | ✅ 14/14 |
| Typecheck + lint + compile + test | ✅ Đạt |
