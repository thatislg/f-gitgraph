# Báo Cáo Nhiệm Vụ 2.1 → 2.4 — Các Khối Giao Diện Cơ Bản (UI Building Blocks)

> **Mã báo cáo**: 003_phase3_1_ui_building_blocks_report
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)
> **Nhóm việc liên quan**: Nhóm Việc 2 — Triển Khai Các Khối Giao Diện Cơ Bản (UI Building Blocks)
> **Nhiệm vụ**: 2.1 (`CornerCrossFrame`), 2.2 (`StagingFileItem`), 2.3 (`DiscardConfirmModal`), 2.4 (Unit Tests)
> **Ngày thực hiện**: 2026-10-15
> **Tài liệu thiết kế áp dụng**: [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md)

---

## 1. Mục Tiêu & Phạm Vi

Xây dựng ba khối giao diện cơ bản (UI Building Blocks) cho khu vực Staging, tuân thủ ngôn ngữ thẩm mỹ Cyber-Lab: khung viền đinh tán chữ thập góc (`CornerCrossFrame`), dòng hiển thị tệp biến động với huy hiệu Neon và cơ chế Hover-to-Reveal (`StagingFileItem`), và hộp thoại cảnh báo an toàn (`DiscardConfirmModal`). Đi kèm bộ unit test độc lập cho từng component theo chuẩn TDD.

Phạm vi gồm:

1. Nhiệm vụ 2.1: `CornerCrossFrame.tsx` (4 đinh tán `+`, 3 trạng thái phát quang, tương thích Dark/Light).
2. Nhiệm vụ 2.2: `StagingFileItem.tsx` (huy hiệu vuông Neon 18px, phân cấp tên tệp/đường dẫn, hover-to-reveal actions).
3. Nhiệm vụ 2.3: `DiscardConfirmModal.tsx` (backdrop mờ, đinh tán đỏ cảnh báo, bẫy phím `Esc`/focus).
4. Nhiệm vụ 2.4: 3 tệp unit test độc lập cho từng component.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File | Nội dung |
| :--- | :--- |
| `src/webview/components/ui/CornerCrossFrame.tsx` | Khung viền đinh tán góc với `active`/`variant` (`purple`/`red`), 4 ký tự `+` đặt lệch -6px, glow tím Neon khi focus. |
| `src/webview/components/staging/StagingFileItem.tsx` | Dòng tệp: huy hiệu `A/M/D/R/U` 18px, tên tệp nổi bật + đường dẫn mờ, cụm nút hover-to-reveal (Stage/Unstage/Discard) và click mở Diff. |
| `src/webview/components/staging/DiscardConfirmModal.tsx` | Modal xác nhận hủy, bọc trong `CornerCrossFrame variant="red"`, mặc định focus Cancel, `Esc` hủy. |
| `src/webview/styles.css` | Bổ sung design token màu Neon badge (`--color-badge-*`) và đinh tán (`--color-cross-*`) dùng `light-dark()`. |
| `tests/webview/components/ui/CornerCrossFrame.test.ts` | Test 4 đinh tán, trạng thái idle/active/warning, children. |
| `tests/webview/components/staging/StagingFileItem.test.ts` | Test 5 huy hiệu màu, hover-to-reveal, callback stage/unstage/discard/diff. |
| `tests/webview/components/staging/DiscardConfirmModal.test.ts` | Test tên tệp cảnh báo, `Esc`/Cancel/Discard. |

---

## 3. Chi Tiết Triển Khai

### 3.1. Nhiệm vụ 2.1 — `CornerCrossFrame`

- 4 ký tự `+` định vị tuyệt đối tại 4 góc với độ lệch `-6px` (`-top-1.5 -left-1.5`, ...), font monospace 11px, `line-height: 1`, `user-select: none`, `pointer-events: none`.
- 3 trạng thái phát quang: Idle (xám `--color-cross-idle`, opacity 50%, hover 80%), Active (tím Neon `--color-cross-active`, glow `drop-shadow(0 0 6px rgba(168,85,247,0.6))`), Warning (đỏ `--color-cross-warning` cho `variant="red"`).
- Tương thích Dark/Light qua token `light-dark(...)` trong `@theme` (Tím Neon `#a855f7`/`#7c3aed`, đỏ `#ef4444`/`#dc2626`).

### 3.2. Nhiệm vụ 2.2 — `StagingFileItem`

- Huy hiệu vuông 18px×18px, `border-radius: 3px`, monospace 10px `font-weight: 700`, chữ trắng trên nền Neon theo mã trạng thái: `A` xanh lục, `M` hổ phách, `D` đỏ, `R` tím, `U` xám.
- Phân cấp Typography: tên tệp 13px `font-medium` (không bị cắt) + đường dẫn thư mục 11px monospace mờ 60% (truncate khi hẹp).
- Hover-to-Reveal: cụm nút `opacity-0` mặc định, `group-hover:opacity-100` với transition 150ms; nút Stage `+`/Unstage `-`/Discard (`🗑` cho untracked, `↺` cho tracked), mỗi nút `stopPropagation`; click dòng mở `onDiff`.

### 3.3. Nhiệm vụ 2.3 — `DiscardConfirmModal`

- Backdrop `bg-black/65` + `backdrop-filter: blur(2px)`, hộp thoại giữa màn hình bọc `CornerCrossFrame variant="red"`.
- Mặc định focus nút Cancel (`useLayoutEffect`), phím `Esc` gọi `onCancel` (listener toàn cục), bẫy `Tab` trong modal.
- Thông điệp phân biệt hủy 1 tệp (chứa tên tệp) vs hủy toàn bộ kho.

### 3.4. Nhiệm vụ 2.4 — Unit Tests

- 21 test mới (CornerCrossFrame 4, StagingFileItem 11, DiscardConfirmModal 6).

---

## 4. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `tests/webview/components/ui/CornerCrossFrame.test.ts` | ✅ 4/4 pass |
| `tests/webview/components/staging/StagingFileItem.test.ts` | ✅ 11/11 pass |
| `tests/webview/components/staging/DiscardConfirmModal.test.ts` | ✅ 6/6 pass |
| Typecheck (`pnpm run typecheck`) | ✅ sạch (toàn workspace) |
| Lint (`oxlint`) trên các tệp Nhóm Việc 2 | ✅ 0 error / 0 warning |
| Compile (`node esbuild.js`) | ✅ thành công |
| Format (`oxfmt --check`) trên các tệp Nhóm Việc 2 | ✅ sạch |

> Ghi chú: `pnpm run lint` toàn cục vẫn còn 2 lỗi `oxlint` nằm ngoài phạm vi Nhóm Việc 2 (xem Mục 6). `pnpm run test` toàn cục gặp `Hook timed out` ở vài suite backend do cold-start `git` trên Windows (đã ghi nhận tại `docs/05_issues/001_vitest_hook_timeout_windows.md`), không liên quan tới thay đổi này.

---

## 5. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt | Phân Loại | Nguyên Nhân Gốc | Giải Pháp Đã Sửa | Kết Quả Sau Sửa |
| :-: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | Vòng 1 | `tests/webview/components/**/*.test.tsx` | Unit Test | `No test files found` (vitest không nhận diện tệp `.test.tsx`) | `[DESIGN_DEFECT]` | Tài liệu thiết kế (progress 2.4.x & design 02 §6.1) đặt tên `.test.tsx`, trong khi quy ước repo + `vitest.config.ts`/`tsconfig` chỉ nhận `*.test.ts` | Đổi tên 3 tệp test sang `.test.ts` (khớp quy ước repo) | ✅ Đã khắc phục |
| 2 | Vòng 2 | `tests/webview/components/staging/DiscardConfirmModal.test.ts` | Unit Test | `AssertionError: expected "vi.fn()" to be called 1 times, but got 0` (Esc) | `[DEV_BUG]` | Test gửi phím `Esc` đồng bộ trước khi `useEffect` của Preact đăng ký listener `keydown` | Thêm `await setTimeout(150)` trước khi dispatch để listener kịp đăng ký | ✅ Đã khắc phục |

### 5.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng | Ký Hiệu | Giá Trị Thực Tế | Ghi Chú / Đánh Giá |
| :--- | :---: | :---: | :--- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)** | $C$ | **2 vòng** | Vòng 1 (1 lỗi) → Vòng 2 (1 lỗi) → Sạch lỗi |
| **Tổng số lỗi kỹ thuật** | $E_{total}$ | **2 lỗi** | $E_{design} + E_{dev}$ |
| **Số lỗi do Thiết Kế** | $E_{design}$ | **1 lỗi** | Đặt tên tệp test sai quy ước repo |
| **Số lỗi do Triển Khai (Bug Dev)** | $E_{dev}$ | **1 lỗi** | Test chưa chờ hiệu ứng async |
| **Số sự cố Môi Trường/Tool** | $E_{env}$ | **0 sự cố** | Loại trừ khỏi tỷ lệ |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** | **$DDR$** | **50.0%** | $\frac{1}{2} \times 100\%$ |
| **TỶ LỆ BUG KHI DEV (IBR)** | **$IBR$** | **50.0%** | $\frac{1}{2} \times 100\%$ |
| **Trạng thái cổng chẩn đoán cuối cùng** | - | **100% PASS** | Typecheck: OK \| Lint (scope 2): OK \| Compile: OK \| Test: OK |

---

## 6. Ghi Chú Thiết Kế (Design Discrepancies)

1. **`[DESIGN_DEFECT]` — Màu huy hiệu `U` (Untracked)**: progress doc 2.2.1 ghi xanh lơ `#06b6d4`, nhưng design doc 02 §2.3 ghi xám chì `#64748b` (Dark) / `#475569` (Light). Đã triển khai theo design doc 02 (xám).
2. **`[DESIGN_DEFECT]` — Kiểu huy hiệu**: progress doc 2.2.1 mô tả "nền nhạt + viền và chữ Neon", trong khi design doc 02 §2.3 (và design system 004) quy định "nền Neon đặc + chữ trắng". Đã triển khai theo design doc 02 (nền Neon + chữ trắng).

> Hai mâu thuẫn trên không gây lỗi biên dịch nhưng cần người chủ trì thiết kế xác nhận để đồng bộ lại progress doc cho nhất quán.

3. **Lint ngoài phạm vi (Nhóm Việc 1)**: `src/extension/services/messageHandler.ts` (`runMutation` — `unicorn/consistent-function-scoping`) và `src/types/queries.ts` (thiếu dòng trống giữa nhóm import) còn 2 lỗi `oxlint` thuộc Nhóm Việc 1, không phải thay đổi của Nhóm Việc 2.

---

## 7. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Khung đinh tán góc 4 trạng thái phát quang | ✅ Đạt |
| Huy hiệu Neon 5 trạng thái (A/M/D/R/U) + hover-to-reveal | ✅ Đạt |
| Modal an toàn với focus trap + `Esc` | ✅ Đạt |
| Unit test 3 component | ✅ 21/21 |
| Typecheck + lint (scope 2) + compile + format | ✅ Đạt |
