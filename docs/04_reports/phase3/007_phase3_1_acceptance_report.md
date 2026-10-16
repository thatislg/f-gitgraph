# Báo Cáo Nhiệm Vụ 5.2, 5.3.3, 5.4.2 — Kiểm Thử Nghiệm Thu Tổng Hợp & An Toàn Dữ Liệu

> **Mã báo cáo**: 007_phase3_1_acceptance_report
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)
> **Nhóm việc liên quan**: Nhóm Việc 5 — Kiểm Thử Nghiệm Thu Tổng Hợp Toàn Quy Trình & An Toàn Dữ Liệu
> **Nhiệm vụ**: 5.2 (Bất biến hình học Zero Layout Shift), 5.3.3 (Xử lý xung đột `.git/index.lock`), 5.4.2 (Light Theme — nợ kỹ thuật)
> **Ngày thực hiện**: 2026-10-16
> **Tài liệu thiết kế áp dụng**: Mục 5 trong cả 3 bản thiết kế kỹ thuật (`02_Staging_UI_And_Composer_Component_Design.md`, `03_WorkingTree_Sync_And_Watcher_Integration.md`)
> **GitHub**: [#42](https://github.com/thatislg/f-gitgraph/issues/42)

---

## 1. Mục Tiêu & Phạm Vi

Khép kín nhóm nghiệm thu tổng hợp cho Chặng 3.1 bằng ba mũi kiểm định cuối cùng trước khi phát hành phiên bản 1.1.0:

1. **Nhiệm vụ 5.2** — Chứng minh tính bất biến hình học (Zero Layout Shift): đường cong Bézier và tọa độ nút lục giác do nhân F# Core sinh ra phải giống hệt từng pixel trước/trong/sau khi mở bảng Staging Area.
2. **Nhiệm vụ 5.3.3** — Chuẩn hóa xử lý xung đột tệp khóa `.git/index.lock` khi extension chạy song song với terminal: hiển thị thông báo lỗi rõ ràng, có gợi ý khắc phục, không làm crash Webview.
3. **Nhiệm vụ 5.4.2** — Kiểm định Light Theme; ghi nhận là nợ kỹ thuật (deferred) do hiệu ứng neon/glow hiện đang tinh chỉnh ưu tiên cho Dark Theme.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File | Nội dung |
| :--- | :--- |
| `src/extension/mutator/gitCliMutator.ts` | Bọc `normalizeError()` cho toàn bộ mutator ghi (stage/unstage/discard), không riêng `commit()` — chuẩn hóa lỗi `.git/index.lock` và lỗi danh tính. |
| `tests/backend/gitCliMutator.test.ts` | Bổ sung test chuẩn hóa lỗi `.git/index.lock` (giả lập tệp khóa thật trong `.git/`). |
| `tests/webview/components/commit/CommitTable.staging.test.ts` | Bổ sung test snapshot hình học F# (đường nhánh Bézier + tọa độ nút lục giác) trước/trong/sau khi mở Staging Area. |
| `docs/03_progess/phase3/001_phase3_1_staging_and_composer.md` | Đánh dấu hoàn thành 5.2, 5.3.3; đánh dấu 5.4.2 là nợ kỹ thuật deferred; bổ sung nhật ký Nhóm Việc 5. |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 5.2 — Bất biến hình học (Zero Layout Shift)

- Kiến trúc đã đảm bảo bất biến: `StagingArea` là overlay `<div class="absolute ...">` nằm sau `<table>`, không chèn thêm `<tr>`, không chạm vào `rows`/`paths` từ F# Core.
- Test mới snapshot hai lớp dữ liệu hình học thuần F#:
  - `branchD`: thuộc tính `d` của các đường nhánh Bézier (loại trừ icon nằm trong nút lục giác).
  - `nodePoints`: thuộc tính `points` của các đa giác lục giác (suy từ `cx`/`cy`).
- So sánh `toEqual` giữa ba trạng thái (trước → trong → sau) khi toggle Staging Area; kết quả đồng nhất, xác nhận độ lệch bằng 0 pixel.

### 3.2. Nhiệm vụ 5.3.3 — Xử lý xung đột `.git/index.lock`

- Trước đây `normalizeError()` chỉ áp dụng cho `commit()`, còn `stageFile`/`unstageFile`/`stageAll`/`unstageAll`/`discardFileChanges`/`discardAllChanges` gọi thẳng `this.run(...)` nên hiện raw `stderr` tiếng Anh.
- Giờ toàn bộ mutator ghi đều đi qua `normalizeError()`, trả về thông báo tiếng Việt: *"Kho mã nguồn đang bị khóa bởi một tiến trình Git khác. Vui lòng thử lại sau vài giây hoặc kiểm tra terminal"*.
- Webview không crash: `handleActionResult` đã mở `openErrorDialog` khi có lỗi.

### 3.3. Nhiệm vụ 5.4.2 — Light Theme (nợ kỹ thuật)

- Token màu đã dùng `light-dark(...)` cho badge/cross/counter, nhưng hiệu ứng neon/glow (`box-shadow` rgba tím, outline hardcode) đang tinh chỉnh ưu tiên Dark Theme nên hiển thị trên Light Theme khả dụng nhưng chưa thanh lịch.
- Ghi nhận là **nợ kỹ thuật (deferred)** trong checklist, sẽ xử lý ở nhịp sau.

---

## 4. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `tests/backend/gitCliMutator.test.ts` | ✅ 13/13 pass (bổ sung 1 test `.git/index.lock`) |
| `tests/webview/components/commit/CommitTable.staging.test.ts` | ✅ 5/5 pass (bổ sung 1 test hình học) |
| Toàn bộ project `extension` | ✅ 22/22 pass |
| Toàn bộ project `webview` | ✅ 121/121 pass |
| Typecheck (`pnpm run typecheck`) | ✅ sạch (toàn workspace) |
| Lint (`pnpm run lint`) | ✅ 0 error / 0 warning |
| Compile (`pnpm run compile`) | ✅ thành công |

> Ghi chú: `pnpm run test` toàn cục vẫn gặp `Hook timed out` ở một số suite backend (`loadBranches/list`…) do cold-start `git` trên Windows — sự cố môi trường đã ghi nhận tại `docs/05_issues/001_vitest_hook_timeout_windows.md`, không liên quan thay đổi này.

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

Không ghi nhận lỗi kỹ thuật nào ở Vòng 1: các thay đổi đều vượt qua typecheck, lint, compile và test ngay lần chạy đầu tiên.

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt | Phân Loại | Nguyên Nhân Gốc | Giải Pháp Đã Sửa | Kết Quả Sau Sửa |
| :-: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :---: |
| — | Vòng 1 | — | — | Không có lỗi | — | — | — | ✅ Sạch ngay vòng 1 |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng | Ký Hiệu | Giá Trị Thực Tế | Ghi Chú / Đánh Giá |
| :--- | :---: | :---: | :--- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)** | $C$ | **1 vòng** | Sạch ngay vòng 1, không cần vòng sửa thêm |
| **Tổng số lỗi kỹ thuật** | $E_{total}$ | **0 lỗi** | $E_{design} + E_{dev}$ |
| **Số lỗi do Thiết Kế** | $E_{design}$ | **0 lỗi** | — |
| **Số lỗi do Triển Khai (Bug Dev)** | $E_{dev}$ | **0 lỗi** | — |
| **Số sự cố Môi Trường/Tool** | $E_{env}$ | **0 sự cố** (không tính `Hook timed out` có sẵn) | Loại trừ khỏi tỷ lệ |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** | **$DDR$** | **0%** | $\frac{0}{0}$ → không xác định, xem như 0% (không có lỗi) |
| **TỶ LỆ BUG KHI DEV (IBR)** | **$IBR$** | **0%** | $\frac{0}{0}$ → không xác định, xem như 0% (không có lỗi) |
| **Trạng thái cổng chẩn đoán cuối cùng** | - | **100% PASS** | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (extension+webview): OK |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

1. **`5.4.2` Light Theme — nợ kỹ thuật**: không phải `[DESIGN_DEFECT]` (thiết kế không sai), mà là ưu tiên thẩm mỹ chưa hoàn thiện cho Light Theme. Đánh dấu deferred, không sửa thiết kế ở nhịp này.

---

## 7. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Bất biến hình học Zero Layout Shift (5.2.1 + 5.2.2) | ✅ Đạt |
| Xử lý `.git/index.lock` rõ ràng, không crash (5.3.3) | ✅ Đạt |
| Light Theme thanh lịch (5.4.2) | ⏸️ Nợ kỹ thuật (deferred) |
| Typecheck + lint + compile + test | ✅ Đạt |

Chặng 3.1 đã đủ điều kiện đóng gói và phát hành phiên bản **1.1.0**.
