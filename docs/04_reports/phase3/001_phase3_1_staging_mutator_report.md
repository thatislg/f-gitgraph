# Báo Cáo Nhiệm Vụ 1.1 — Hiện Thực Các Lệnh Staging Trong `GitCliMutator`

> **Mã báo cáo**: 001_phase3_1_staging_mutator_report
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)
> **Nhóm việc liên quan**: Nhóm Việc 1 — Mở Rộng Backend GitCliMutator, Bộ Truy Vấn & RPC Protocol
> **Nhiệm vụ**: 1.1 — Hiện thực các lệnh Staging trong `src/extension/mutator/gitCliMutator.ts`
> **Ngày thực hiện**: 2026-10-15
> **Tài liệu thiết kế áp dụng**: [01_Staging_Backend_And_Mutator_Design.md](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md)

---

## 1. Mục Tiêu & Phạm Vi

Bổ sung sáu phương thức thao tác vùng nhớ đệm Staging vào `GitCliMutator`, hoàn thiện nền tảng backend cho vòng lặp phát triển cốt lõi (Xem thay đổi → Stage/Unstage → Commit), đồng thời trang bị cơ chế tương thích đa phiên bản Git (probe + fallback) để vận hành ổn định trên mọi môi trường và mọi bản Git.

Phạm vi nhiệm vụ này gồm:

1. Sáu lệnh staging: `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `discardAllChanges`.
2. Chiến lược tương thích đa phiên bản Git thông qua cơ chế thăm dò `git version` một lần và rẽ nhánh fallback (mục 2.2 trong thiết kế).

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File | Nội dung |
| :--- | :--- |
| `src/extension/mutator/gitCliMutator.ts` | Bổ sung 6 phương thức staging + `supportsRestore`/`canUseRestore()` cho cơ chế probe phiên bản. |
| `tests/backend/gitCliMutator.test.ts` | Bổ sung các test xác nhận hành vi stage/unstage/discard và probe phiên bản. |

---

## 3. Chi Tiết Triển Khai

### 3.1. Sáu Lệnh Staging (Nhiệm vụ 1.1.1 → 1.1.6)

| Phương thức | Lệnh Git gốc | Ghi chú an toàn |
| :--- | :--- | :--- |
| `stageFile(filePath)` | `git add -- <filePath>` | Ký tự `--` bắt buộc để ngăn nhầm đường dẫn với nhánh/cờ. |
| `unstageFile(filePath)` | `git restore --staged -- <filePath>` | Fallback `git reset -- <filePath>` trên Git < 2.23. |
| `stageAll()` | `git add -A` | Bao phủ toàn bộ cây thư mục, không cần fallback. |
| `unstageAll()` | `git restore --staged .` | Fallback `git reset` trên Git < 2.23. |
| `discardFileChanges(filePath, isUntracked)` | untracked → `git clean -f -- <filePath>`; tracked → `git restore -- <filePath>` | Fallback tracked → `git checkout -- <filePath>`. |
| `discardAllChanges()` | Bước 1 `git restore .` → Bước 2 `git clean -fd` | Fallback bước 1 → `git checkout -- .`; dừng ngay nếu bước 1 thất bại. |

### 3.2. Chiến Lược Tương Thích Đa Phiên Bản Git (Mục 2.2)

- **Thăm dò một lần**: `canUseRestore()` thực thi `git version`, bóc tách Major/Minor bằng regex `^git version (\d+)\.(\d+)`.
- **Quy tắc**: `supportsRestore = true` khi `Major > 2` hoặc `(Major == 2 && Minor >= 23)`; ngược lại `false`.
- **Bộ nhớ đệm**: kết quả lưu trong `supportsRestore` (in-memory), các lần gọi sau không spawn thêm tiến trình.
- **Fallback an toàn**: nếu `git version` thất bại (stdout rỗng), regex không khớp → `supportsRestore = false` → tự rơi về `reset`/`checkout` (luôn tồn tại trên mọi bản Git).
- `stageFile`/`stageAll` dùng `git add` nên không cần fallback.

---

## 4. Kiểm Thử

Chạy lệnh: `pnpm exec vitest run --project backend tests/backend/gitCliMutator.test.ts --hookTimeout 60000 --testTimeout 60000`.

| Hạng mục | Kết quả |
| :--- | :--- |
| `probes Git version and caches canUseRestore` | ✅ pass |
| `stages and unstages a specific file` | ✅ pass |
| `stages all and unstages all files` | ✅ pass |
| `discards changes in a tracked file and cleans untracked file` | ✅ pass |
| Các test nền tảng còn lại (branch/tag/checkout/commit) | ✅ pass |
| **Tổng cộng** | **11/11 pass** |

> Ghi chú: lần chạy đầu gặp lỗi `Hook timed out in 10000ms` do `beforeAll` (`makeRepo`) vượt ngưỡng hook timeout mặc định 10s ở trạng thái cold-start trên Windows (độ trễ `CreateProcess` khi spawn `git.exe`). Khi nâng `--hookTimeout 60000`, toàn bộ 11 test pass trong ~1.6s. Không thay đổi cấu hình `vitest.config.ts`.

---

## 5. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Hiện thực 6 lệnh staging | ✅ Đạt |
| Ký tự `--` an toàn chống nhầm đường dẫn/nhánh | ✅ Đạt |
| Chiến lược probe + fallback đa phiên bản Git | ✅ Đạt |
| Tương thích đa nền tảng (Windows/macOS/Linux) | ✅ Đạt |
| Kiểm thử backend | ✅ 11/11 |
| Typecheck (không lỗi/warning) | ✅ Đạt |
