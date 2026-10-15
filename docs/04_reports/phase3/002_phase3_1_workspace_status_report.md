# Báo Cáo Nhiệm Vụ 1.3 → 1.5 — Bộ Truy Vấn Trạng Thái Kho, RPC & Kiểm Thử Backend

> **Mã báo cáo**: 002_phase3_1_workspace_status_report
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)
> **Nhóm việc liên quan**: Nhóm Việc 1 — Mở Rộng Backend GitCliMutator, Bộ Truy Vấn & RPC Protocol
> **Nhiệm vụ**: 1.3 (`workspaceStatus`), 1.4 (Types RPC & Message Handlers), 1.5 (Unit Tests)
> **Ngày thực hiện**: 2026-10-15
> **Tài liệu thiết kế áp dụng**: [01_Staging_Backend_And_Mutator_Design.md](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md)

---

## 1. Mục Tiêu & Phạm Vi

Hoàn thiện tầng đọc trạng thái kho làm việc (`workspaceStatus`) theo bản thiết kế cập nhật: chạy lệnh `git status` với định dạng porcelain v2 + phân tách NUL (`-z`), bóc tách bằng máy trạng thái NUL-delimiter, bổ sung danh sách tệp xung đột `conflictedFiles` và xử lý trạng thái kép. Đồng thời khai báo hợp đồng RPC định kiểu và đăng ký message handlers, rồi phủ unit test độc lập cho toàn bộ tầng backend.

Phạm vi gồm:

1. Nhiệm vụ 1.3: bộ truy vấn `workspaceStatus.ts` (lệnh 5 cờ, parser NUL, `conflictedFiles`, trạng thái kép).
2. Nhiệm vụ 1.4: khai báo types `actions.ts`/`queries.ts` và đăng ký handlers trong `messageHandler.ts`.
3. Nhiệm vụ 1.5: unit test `workspaceStatus` + `stagingMessageHandler`.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File | Nội dung |
| :--- | :--- |
| `src/backend/queries/workspaceStatus.ts` | Viết lại parser theo máy trạng thái NUL; thêm `ConflictedFileRecord`/`conflictedFiles`; câu lệnh `--untracked-files=all -z`. |
| `src/types/actions.ts` | Khai báo payload cho `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `discardAllChanges`, `commitChanges`. |
| `src/types/queries.ts` | Khai báo query payload `workspaceStatus` trả về `WorkspaceStatusResult`. |
| `src/extension/mutator/gitCliMutator.ts` | Bổ sung `setRepo(repoPath)` để đồng bộ kho khi chuyển repo. |
| `src/extension/services/messageHandler.ts` | Đăng ký 7 action staging/commit + query `workspaceStatus`. |
| `src/extension/legacy.ts` | Khởi tạo `GitCliMutator` và truyền `gitMutator` vào handler. |
| `tests/backend/queries/workspaceStatus.test.ts` | Unit test parser (porcelain v2 NUL, tên tiếng Việt, xung đột, trạng thái kép, isClean). |
| `tests/extension/services/stagingMessageHandler.test.ts` | Unit test định tuyến RPC (action → mutator, query → `getWorkspaceStatus`). |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 1.3 — Bộ Truy Vấn `workspaceStatus`

- **Câu lệnh**: `git -c core.quotepath=false status --porcelain=v2 --branch --untracked-files=all -z` (đủ 5 cờ tham số chiến lược theo Mục 3.1).
- **Parser NUL**: tách chuỗi đầu ra theo `\0`, duyệt token theo chỉ mục; bản ghi đổi tên/sao chép (loại `2`) đọc `origPath` từ token NUL kế tiếp.
- **5 loại bản ghi**: header `#` (branch.head/upstream/ab), loại `1` (ordinary), loại `2` (rename), loại `u` (unmerged → `conflictedFiles`), loại `?` (untracked), loại `!` (ignored, bỏ qua).
- **Trạng thái kép**: `MM`/`AM`/`AD`/`RM`/`RD` tách đôi vào cả `stagedFiles` lẫn `unstagedFiles`.
- **`isClean`**: `true` khi `stagedFiles`, `unstagedFiles` và `conflictedFiles` đều rỗng.

### 3.2. Nhiệm vụ 1.4 — Types RPC & Message Handlers

- Khai báo 7 action payload trong `src/types/actions.ts` (empty payload dùng `object`, không dùng `Record<string, never>`).
- Khai báo query `workspaceStatus` trong `src/types/queries.ts` trỏ tới `WorkspaceStatusResult`.
- `messageHandler.ts` dùng helper `runMutation` để chuẩn hóa kết quả `MutatorResult` thành lỗi ném ra cho `registerAction`.

### 3.3. Nhiệm vụ 1.5 — Unit Tests

- `workspaceStatus.test.ts`: 16 test parser thuần + 4 test tích hợp `getWorkspaceStatus` trên repo thật.
- `stagingMessageHandler.test.ts`: 5 test định tuyến (action thành công, action lỗi, query trả kết quả).
- Test mutator `GitCliMutator` (cơ chế `canUseRestore` + 6 lệnh staging + `commit`) đã được phủ từ Nhiệm vụ 1.1/1.2 trong `tests/backend/gitCliMutator.test.ts`.

---

## 4. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `tests/backend/queries/workspaceStatus.test.ts` | ✅ 20/20 pass |
| `tests/extension/services/stagingMessageHandler.test.ts` | ✅ 5/5 pass |
| Typecheck (`tsc -p . --noEmit`) | ✅ sạch |
| Lint (`oxlint`) | ✅ 0 warning / 0 error |
| Format (`oxfmt --check`) | ✅ sạch |

> Ghi chú: Khi chạy toàn bộ suite backend song song, `tests/backend/queries/loadBranches/list.test.ts` có thể gặp lỗi `Hook timed out` do cold-start `git` trên Windows (vấn đề đã ghi nhận ở `ISSUE-001`). Chạy riêng với `--hookTimeout 60000 --testTimeout 60000` thì 7/7 test pass; không liên quan đến thay đổi của nhiệm vụ này.

---

## 5. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Parser NUL-delimiter đúng bản thiết kế (Mục 3.4) | ✅ Đạt |
| `conflictedFiles` & trạng thái kép `MM`/`AM`/`AD`/`RM`/`RD` | ✅ Đạt |
| Types RPC & message handlers | ✅ Đạt |
| Unit test backend | ✅ 25/25 |
| Typecheck + lint + format | ✅ Đạt |
