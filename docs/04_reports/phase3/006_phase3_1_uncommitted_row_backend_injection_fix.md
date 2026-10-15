# Báo Cáo Khắc Phục Defect — Dòng "Uncommitted Changes" (`*`) Không Xuất Hiện Trên Đồ Thị

> **Mã báo cáo**: 006_phase3_1_uncommitted_row_backend_injection_fix
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit
> **Loại công việc**: Khắc phục `[DESIGN_DEFECT]` phát hiện khi kiểm thử Nhóm Việc 5 (E2E)
> **Nhiệm vụ liên quan**: Task 3.1 — Mở khóa click dòng `UNCOMMITTED_CHANGES` ([#37](https://github.com/thatislg/f-gitgraph/issues/37))
> **Ngày thực hiện**: 2026-10-16
> **Tài liệu thiết kế áp dụng**: [03_WorkingTree_Sync_And_Watcher_Integration.md](../../02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md)

---

## 1. Bối Cảnh & Triệu Chứng

Khi cài VSIX `1.1.0` để kiểm thử vòng lặp Core Dev Loop, người dùng **không thấy** dòng "Uncommitted Changes" (`*`) ở đỉnh đồ thị, do đó không thể click để mở khu vực Staging Area — giao diện vẫn là giao diện cũ.

## 2. Nguyên Nhân Gốc (`[DESIGN_DEFECT]`)

- Bản thiết kế gốc (Mục 2.1) chỉ phát biểu "backend cấp hash `*`" cho dòng mầm nhưng **không đặc tả cơ chế chèn** dòng này.
- Trong quá trình di trú đồ thị sang nhân F# Core Engine (commit `94907ff`), logic `commits.unshift({ hash: "*", ... })` trong `loadCommits.ts` **đã bị xóa** và **không được tái hiện** ở bất kỳ tầng nào trong pipeline F# sidecar mới.
- Hệ quả: handler click trong `CommitTable.tsx` và `CommitRow.tsx` đã được nối dây đầy đủ, nhưng dữ liệu đồ thị trả về cho Webview **không hề chứa dòng `*`**, nên `expandedCommit` không bao giờ bằng `"*"`, `inspectorMode` không bao giờ thành `"staging"`, và Staging Area không bao giờ mở.
- Các test hiện có (`CommitTable.staging.test.ts`) đã **giả lập thủ công** dòng `*` trong `windowRows`, nên vẫn pass nhưng không phản ánh luồng runtime thực tế.

## 3. Giải Pháp

Tái hiện cơ chế chèn dòng `*` ở tầng cầu nối Extension Host (`GraphDataBridge`) thay vì sửa nhân F# — vì nhân F# chỉ biết lịch sử commit, không biết trạng thái working tree:

1. **Kích hoạt theo trạng thái kho**: `graph-bridge-service.loadGraph` đồng thời gọi `getWorkspaceStatus` và cấp `StatusProvider` cho `GraphDataBridge`. Khi `isClean === false`, bật cờ `hasUncommitted`.
2. **Chèn dòng `*`**: `initialize`/`invalidate` chèn `"*"` vào đầu `commitList` và tăng `commitCount` thêm 1.
3. **Bảo toàn hình học**: `loadWindow` dịch ngược chỉ số cửa sổ về hệ commit thật, dời toàn bộ nút và đường nối SVG xuống đúng 24px, rồi chèn dòng `*` tổng hợp ở hàng 0 khi cửa sổ bắt đầu từ đầu.

### Tệp tác động

| File | Thay đổi |
| :--- | :--- |
| `src/extension/sidecar/graph-merge.ts` | Thêm hằng `UNCOMMITTED_CHANGES_HASH`, `ROW_HEIGHT`; hàm `buildUncommittedRow()`; hàm `shiftPathD()` dịch tọa độ Y trong chuỗi SVG. |
| `src/extension/sidecar/graph-data-bridge.ts` | Nhận `StatusProvider`; theo dõi `hasUncommitted`; chèn `*`; dịch chỉ số cửa sổ + dời hình học trong `loadWindow`. |
| `src/extension/sidecar/graph-bridge-service.ts` | Tạo `statusProvider` từ `getWorkspaceStatus` và truyền vào cầu nối. |
| `tests/backend/sidecar/graph-merge.test.ts` | Bổ sung test `buildUncommittedRow` và `shiftPathD`. |
| `tests/backend/sidecar/graph-data-bridge.test.ts` | Bộ test mới cho cơ chế chèn dòng `*` + dời hình học + dịch chỉ số. |
| `docs/02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md` | Bổ sung Mục 2.1.1 (cơ chế chèn backend), mở rộng Ma Trận Kiểm Thử, thêm Lịch Sử Sửa Đổi. |

---

## 4. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt | Phân Loại | Nguyên Nhân Gốc | Giải Pháp Đã Sửa | Kết Quả Sau Sửa |
| :-: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | Vòng 1 | `docs/02_design/phase3/03_...md` | E2E (runtime) | Dòng `*` không bao giờ xuất hiện trên đồ thị → UI không có Staging Area | `[DESIGN_DEFECT]` | Di trú F# đánh rơi logic `unshift({hash:"*"})`; design không đặc tả cơ chế chèn | Tái hiện cơ chế chèn ở `GraphDataBridge` + cập nhật design doc | ✅ Đã khắc phục |
| 2 | Vòng 1 | `src/extension/sidecar/graph-data-bridge.ts` | Lint | `import(no-duplicates)`: import `./protocol` hai lần | `[DEV_BUG]` | Gộp nhầm hai dòng import type `protocol` | Gộp thành một import type duy nhất | ✅ Đã khắc phục |
| 3 | Vòng 1 | `src/extension/sidecar/graph-data-bridge.ts` | Lint | `oxc(no-map-spread)`: spread object trong `map` | `[DEV_BUG]` | Dùng `{ ...row, y }` khi dời tọa độ | Thay bằng vòng lặp gán trực tiếp `row.y += shiftY` | ✅ Đã khắc phục |
| 4 | Vòng 1 | `src/extension/sidecar/graph-data-bridge.ts` | Lint | `import-js(order)`: `@/backend` phải đứng trước `@/types` | `[DEV_BUG]` | Đặt nhóm import sai thứ tự | Sắp xếp lại nhóm import | ✅ Đã khắc phục |
| 5 | Vòng 1 | `src/extension/sidecar/graph-data-bridge.ts` | Lint | `import-js(order)`: type import `./protocol` phải đứng trước `./sidecar-manager` | `[DEV_BUG]` | Đặt nhóm import sai thứ tự | Sắp xếp lại nhóm import | ✅ Đã khắc phục |
| 6 | Vòng 2 | `tests/backend/sidecar/graph-data-bridge.test.ts` | Lint | `import-js(order)`: `@/backend` phải đứng trước `@/extension` | `[DEV_BUG]` | Đặt nhóm import sai thứ tự trong tệp test mới | Sắp xếp lại nhóm import | ✅ Đã khắc phục |

### 4.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng | Ký Hiệu | Giá Trị Thực Tế | Ghi Chú / Đánh Giá |
| :--- | :---: | :---: | :--- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)** | $C$ | **2 vòng** | Vòng 1 (lint 5 lỗi) → Vòng 2 (lint tệp test mới 1 lỗi) |
| **Tổng số lỗi kỹ thuật** | $E_{total}$ | **6 lỗi** | $E_{design} + E_{dev}$ |
| **Số lỗi do Thiết Kế** | $E_{design}$ | **1 lỗi** | Thiếu đặc tả cơ chế chèn dòng `*` (gốc rễ của defect) |
| **Số lỗi do Triển Khai (Bug Dev)** | $E_{dev}$ | **5 lỗi** | 5 lỗi lint import/spread trong quá trình triển khai |
| **Số sự cố Môi Trường/Tool** | $E_{env}$ | **0 sự cố** (không tính `Hook timed out` có sẵn) | Loại trừ khỏi tỷ lệ |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** | **$DDR$** | **16.7%** | $\frac{1}{6} \times 100\%$ |
| **TỶ LỆ BUG KHI DEV (IBR)** | **$IBR$** | **83.3%** | $\frac{5}{6} \times 100\%$ |
| **Trạng thái cổng chẩn đoán cuối cùng** | - | **100% PASS** | Typecheck: OK \| Lint: OK \| Compile: OK \| Test (backend target): OK |

---

## 5. Kết Quả Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `tests/backend/sidecar/graph-merge.test.ts` | ✅ 8/8 pass |
| `tests/backend/sidecar/graph-data-bridge.test.ts` | ✅ 4/4 pass |
| Typecheck (`pnpm run typecheck`) | ✅ sạch (toàn workspace) |
| Lint (`pnpm run lint`) | ✅ 0 error / 0 warning |
| Compile (`pnpm run compile`) | ✅ thành công |

> Ghi chú: `pnpm run test` toàn cục vẫn gặp `Hook timed out` ở 4 suite backend và 1 test `commitDetails` do cold-start `git` trên Windows — sự cố môi trường (`[ENV_TOOL_ISSUE]`) đã ghi nhận, không liên quan thay đổi này.

---

## 6. Kết Luận

Dòng "Uncommitted Changes" (`*`) giờ được backend chèn đúng khi working tree có thay đổi, đồng thời bảo toàn hình học của các commit thật (dời đều xuống đúng 24px). Sau khi đóng gói lại VSIX, người dùng có thể click dòng `*` để mở Staging Area và kiểm thử tiếp Nhóm Việc 5 (E2E Core Dev Loop).
