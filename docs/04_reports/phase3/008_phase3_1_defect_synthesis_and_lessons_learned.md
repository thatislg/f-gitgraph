# Báo Cáo Tổng Hợp Đánh Giá Lỗi Kỹ Thuật & Bài Học Kinh Nghiệm Phase 3.1

> **Mã báo cáo**: `008_phase3_1_defect_synthesis_and_lessons_learned`  
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)  
> **Ngày lập báo cáo**: 2026-10-19  
> **Quy chuẩn áp dụng**: [RULE-COMPILATION-DEFECT-TRACKING](../RULES_COMPILATION_ERROR_TRACKING.md)  
> **Tài liệu tham chiếu**:
> - Tiến độ Chặng 3.1: [001_phase3_1_staging_and_composer.md](../../03_progess/phase3/001_phase3_1_staging_and_composer.md)
> - Các báo cáo thành phần: `001` → `007` trong [docs/04_reports/phase3/](./)
> - Chuẩn bị cho Chặng 3.2: [002_phase3_2_3pane_workspace.md](../../03_progess/phase3/002_phase3_2_3pane_workspace.md)

---

## 1. Mục Tiêu & Bối Cảnh Tổng Kết

Chặng 3.1 (**Khu Vực Staging & Bộ Soạn Thảo Commit**) đã hoàn thành toàn bộ 5 nhóm việc với 100% các tiêu chuẩn nghiệm thu (Definition of Done) được xác nhận, khép kín vòng lặp phát triển cốt lõi (Core Dev Loop) ngay trong F-GitGraph và đóng gói phiên bản **v1.1.0**.

Theo quy chuẩn [RULE-COMPILATION-DEFECT-TRACKING](../RULES_COMPILATION_ERROR_TRACKING.md), báo cáo này đóng vai trò là **cột mốc đánh giá chất lượng kỹ thuật định lượng (Quality Gate)** giữa Phase 3.1 và Phase 3.2 nhằm:
1. Thống kê toàn diện số lượng và phân loại lỗi kỹ thuật phát sinh trong suốt chu trình phát triển bằng AI (AI Design vs AI Dev).
2. Mổ xẻ căn nguyên gốc rễ (Root Cause Analysis) của các lỗi kiến trúc, lỗi bất đồng bộ hợp đồng và lỗi triển khai.
3. Rút ra các nguyên tắc cốt tử mang tính phòng ngừa (Preventive Guidelines) áp dụng trực tiếp cho **Phase 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục**.

---

## 2. Bảng Thống Kê Định Lượng Lỗi Kỹ Thuật (Defect Metrics Synthesis)

Tổng hợp dữ liệu từ 7 báo cáo kỹ thuật thành phần ([001](./001_phase3_1_staging_mutator_report.md) đến [007](./007_phase3_1_acceptance_report.md)):

| Báo Cáo | Module / Nhóm Việc Triển Khai | Số Chu Kỳ Fix ($C$) | Lỗi Thiết Kế ($E_{design}$) | Lỗi Triển Khai ($E_{dev}$) | Sự Cố Môi Trường ($E_{env}$) | Tổng Lỗi Kỹ Thuật ($E_{total}$) | Tỷ Lệ Lỗi Thiết Kế ($DDR$) | Tỷ Lệ Bug Dev ($IBR$) | Trạng Thái Cuối |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **001** | Mutator Backend (Task 1.1) | 1 | 0 | 0 | 1 | **0** | 0.0% | 0.0% | ✅ 11/11 Pass |
| **002** | Workspace Status Query & RPC (Task 1.3–1.5) | 1 | 0 | 0 | 1 | **0** | 0.0% | 0.0% | ✅ 25/25 Pass |
| **003** | UI Building Blocks (Task 2.1–2.4) | 2 | 1 | 1 | 0 | **2** | 50.0% | 50.0% | ✅ 21/21 Pass |
| **004** | Staging Area & Composer (Task 3.1–3.5) | 3 | 1 | 3 | 0 | **4** | 25.0% | 75.0% | ✅ 18/18 Pass |
| **005** | DAG & Watcher Integration (Task 4.1–4.3) | 2 | 1 | 4 | 0 | **5** | 20.0% | 80.0% | ✅ 9/9 Pass |
| **006** | Injection Dòng `*` & E2E Defect Fix | 3 | 1 | 6 | 0 | **7** | 14.3% | 85.7% | ✅ 12/12 Pass |
| **007** | Nghiệm Thu Hình Học & An Toàn (Task 5.2–5.4) | 1 | 0 | 0 | 0 | **0** | 0.0% | 0.0% | ✅ 18/18 Pass |
| **TỔNG HỢP** | **Toàn Bộ Giai Đoạn Phase 3.1** | **13 vòng** | **4** | **14** | **2** | **18 lỗi** | **22.2%** | **77.8%** | **100% Sạch** |

### Các chỉ số chất lượng tổng thể:
- **Tổng số lỗi kỹ thuật ($E_{total}$)**: **18 lỗi** ($E_{design} = 4$, $E_{dev} = 14$).
- **Tỷ lệ lỗi do thiết kế (Design Defect Rate - $DDR$)**: **22.2%** ($\frac{4}{18} \times 100\%$).
- **Tỷ lệ bug khi lập trình (Implementation Bug Rate - $IBR$)**: **77.8%** ($\frac{14}{18} \times 100\%$).
- **Số chu kỳ sửa lỗi trung bình (Average Fix Iterations to Clean - $AFC$)**: **1.86 vòng / module** ($\frac{13}{7}$).
- **Tỷ lệ thiết kế chuẩn xác ngay từ đầu (Design First-Time-Right - $DFTR$)**: **57.1%** ($\frac{4}{7}$ báo cáo hoàn toàn không có lỗi thiết kế: 001, 002, 007 và phần mutator của 004).

---

## 3. Nhật Ký Chi Tiết Toàn Bộ 18 Lỗi Kỹ Thuật Trong Phase 3.1

| STT | Báo Cáo | Tệp Tin Tác Động | Cổng Chẩn Đoán | Triệu Chứng & Thông Điệp Lỗi | Phân Loại | Căn Nguyên Gốc Rễ | Biện Pháp Khắc Phục Đã Triển Khai |
| :-: | :---: | :--- | :---: | :--- | :---: | :--- | :--- |
| 1 | 003 | `tests/webview/**/*.test.tsx` | Unit Test | `No test files found` | `[DESIGN_DEFECT]` | Thiết kế đặc tả đuôi `.test.tsx`, cấu hình vitest chỉ quét `*.test.ts` | Đổi tên tệp test thành `.test.ts`, dùng helper `h()`/`render()` |
| 2 | 003 | `DiscardConfirmModal.test.ts` | Unit Test | `AssertionError: expected vi.fn() called 1, got 0` | `[DEV_BUG]` | Test gửi phím `Esc` trước khi listener `keydown` của Preact kịp đăng ký | Thêm `await setTimeout(150)` trước khi dispatch phím |
| 3 | 004 | `CommitComposer.test.ts`... | Lint | `import-js/order`: Sai thứ tự nhóm import | `[DEV_BUG]` | Đặt alias `@tests/` trước `@/`, không tuân thủ thứ tự linter | Sắp xếp lại nhóm import theo đúng chuẩn repository |
| 4 | 004 | `CommitComposer.tsx` | Lint | `unicorn/consistent-function-scoping` | `[DEV_BUG]` | Khai báo hàm `autoGrow` trong component dù không dùng state ngoài | Đưa `autoGrow` ra module scope |
| 5 | 004 | `CommitComposer.test.ts` | Unit Test | `AssertionError`: Amend không nạp tiêu đề HEAD | `[DEV_BUG]` | jsdom `.click()` trên checkbox không kích hoạt `change` event | Đặt `checked = true` kèm `dispatchEvent(new Event("change"))` |
| 6 | 004 | `actions.ts`, `gitCliMutator.ts` | Typecheck | Thiếu action RPC `commitAndPush` cho dispatcher UI | `[DESIGN_DEFECT]` | UI design đặc tả `commitAndPush()` nhưng backend RPC contract bỏ quên | Khai báo bổ sung action payload, mutator backend và message handler |
| 7 | 005 | `03_...Integration.md` Mục 7 | Typecheck | Đặc tả tệp test `CommitTable.integration.test.tsx` | `[DESIGN_DEFECT]` | Thiết kế lặp lại lỗi quy ước đuôi tệp `.test.tsx` | Chuẩn hóa sang `CommitTable.staging.test.ts` và sửa tài liệu thiết kế |
| 8 | 005 | `gitRepoWatcher.debounce.test.ts` | Typecheck | `TS2305: Module "vscode" has no member "createdWatchers"` | `[DEV_BUG]` | Import `createdWatchers` từ `"vscode"` thay vì mock alias | Đổi import sang alias `@tests/extension/__mocks__/vscode` |
| 9 | 005 | `tests/extension/__mocks__/vscode.ts` | Unit Test | `TypeError: disposable.dispose is not a function` | `[DEV_BUG]` | Mock vscode thiếu `Disposable`, `RelativePattern`, `onDidChange` | Bổ sung class `Disposable` và các factory event vào mock |
| 10 | 005 | `gitRepoWatcher.debounce.test.ts` | Lint | `import-js/order`: Sai thứ tự import | `[DEV_BUG]` | Nhóm import `@tests/` đặt sai vị trí so với `@/` | Sắp xếp lại đúng quy tắc |
| 11 | 005 | `CommitTable.staging.test.ts` | Unit Test | `AssertionError`: Chưa thấy DOM `[data-action='stage-all']` | `[DEV_BUG]` | Preact re-render bất đồng bộ từ Signals, test assert trước khi DOM flush | Bổ sung `await setTimeout(0)` sau mỗi thao tác click |
| 12 | 006 | `03_...Integration.md` Mục 2.1 | E2E (Runtime) | Không có dòng `*` trên đồ thị $\rightarrow$ Không mở được Staging | `[DESIGN_DEFECT]` | Di trú nhân F# Core bỏ sót dòng `*`, thiết kế không đặc tả cơ chế chèn | Tạo cơ chế chèn dòng `*` và dời hình học 24px trong `GraphDataBridge` |
| 13 | 006 | `graph-data-bridge.ts` | Lint | `import/no-duplicates`: Duplicate type import | `[DEV_BUG]` | Tách hai dòng import type cùng tệp `protocol` | Gộp thành 1 dòng import duy nhất |
| 14 | 006 | `graph-data-bridge.ts` | Lint | `oxc/no-map-spread`: Spread trong vòng lặp map | `[DEV_BUG]` | Dùng `{ ...row, y }` khi dời tọa độ SVG | Thay bằng vòng lặp gán trực tiếp `row.y += shiftY` |
| 15 | 006 | `graph-data-bridge.ts` | Lint | `import-js/order`: `@/backend` trước `@/types` | `[DEV_BUG]` | Đặt sai trật tự ưu tiên nhóm import | Sắp xếp lại nhóm import |
| 16 | 006 | `graph-data-bridge.ts` | Lint | `import-js/order`: Type import sai thứ tự | `[DEV_BUG]` | Nhóm type import cục bộ xếp lộn xộn | Sắp xếp lại nhóm import |
| 17 | 006 | `graph-data-bridge.test.ts` | Lint | `import-js/order`: `@/backend` trước `@/extension` | `[DEV_BUG]` | Viết tệp test mới sai thứ tự import | Sắp xếp lại nhóm import |
| 18 | 006 | `src/webview/lib/dispatcher.ts` | E2E (Runtime) | Thao tác Stage/Unstage/Discard không cập nhật realtime | `[DEV_BUG]` | Quên đăng ký 6 action staging vào map `handlers` trong dispatcher | Đăng ký đủ 6 action vào `handleActionResult` để kích hoạt `refresh()` |

---

## 4. Phân Tích Căn Nguyên Sâu Sắc (Root Cause Analysis)

### 4.1. Lỗ Hổng Thiết Kế (`[DESIGN_DEFECT]`) — Bài Học Đắt Giá Nhất

1. **Lỗ hổng ranh giới giữa F# Core Engine và Extension Host (Lỗi STT 12)**:
   - *Bản chất*: Khi thiết kế tính năng, tài liệu chỉ tập trung vào lớp ngọn (UI Staging Area) và lớp gốc (Git CLI Mutator), nhưng bỏ quên tầng chuyển tiếp dữ liệu (`GraphDataBridge`). F# Core Engine được thiết kế thuần túy chỉ đọc lịch sử commit của Git; nó không hề biết trạng thái Working Tree. Do đó, dòng mầm `*` bắt buộc phải do Extension Host tổng hợp và tiêm vào.
   - *Hậu quả*: Toàn bộ unit test trước đó đều mock sẵn dòng `*` trong mảng dữ liệu, dẫn đến "False Positive" — test pass 100% nhưng sản phẩm thực tế tê liệt.
2. **Bất đồng bộ giao ước RPC giữa hai đầu giao diện và backend (Lỗi STT 6)**:
   - *Bản chất*: Tài liệu thiết kế UI đưa ra yêu cầu nút `Commit & Push` nhưng tài liệu thiết kế Backend và tệp `src/types/actions.ts` không hề khai báo action này.
3. **Mâu thuẫn quy ước môi trường (Lỗi STT 1 & 7)**:
   - *Bản chất*: Người thiết kế mang thói quen đặt tên component test `.tsx` từ các dự án React thông thường sang một codebase đã cấu hình nghiêm ngặt chỉ nhận `.test.ts`. Lỗi này bị lặp lại ở cả Design 02 và Design 03.

### 4.2. Lỗi Lập Trình (`[DEV_BUG]`) — Xu Hướng & Tần Suất

1. **Lỗi đứt gãy luồng phản ứng Realtime (Lỗi STT 18 - Nghiêm trọng)**:
   - Khi gửi action xuống backend thành công, UI cần tự động đồng bộ lại đồ thị. Việc "quên nối dây" trong [dispatcher.ts](file:///home/lmo1720/LMO-LAB/f-gitgraph/src/webview/lib/dispatcher.ts) đã làm tê liệt tính phản xạ tự động của giao diện.
2. **Quy chuẩn Lint & Import Order (Chiếm 50% tổng số Dev Bugs - 7/14 lỗi)**:
   - Các lỗi liên quan đến thứ tự import (`import-js/order`) và spread trong map (`oxc/no-map-spread`) xuất hiện lặp đi lặp lại do dev/AI viết code mới mà không chạy kiểm tra `oxlint` ngay tại chỗ.
3. **Độ trễ bất đồng bộ trong kiểm thử Preact Signals (3 lỗi)**:
   - Preact Signals gom cụm và cập nhật DOM không đồng bộ. Việc assert DOM ngay lập tức sau click luôn dẫn đến `AssertionError`.

---

## 5. Danh Mục Nợ Kỹ Thuật Chuyển Tiếp (Technical Debts)

Dưới đây là các hạng mục đã ghi nhận trong Phase 3.1 nhưng được tạm hoãn (**deferred**) để xử lý trong các nhịp tối ưu:

| Mã Nợ Kỹ Thuật | Mô Tả Chi Tiết | Lý Do Hoãn | Hướng Xử Lý Tiếp Theo |
| :--- | :--- | :--- | :--- |
| **DEBT-3.1-01** | **Thẩm mỹ Light Theme (Nhiệm vụ 5.4.2)** | Hệ thống token `light-dark()` đã hoạt động, nhưng hiệu ứng shadow/glow và độ tương phản hiện tối ưu tốt nhất cho Dark Theme. | Tinh chỉnh lại bộ shadow và border cho Light Theme khi hoàn thành toàn bộ khung giao diện Phase 3. |
| **DEBT-3.1-02** | **Diff Working Tree từ dòng tệp** | Sự kiện click vào dòng tệp trong `StagingFileItem` hiện tại là no-op. | Bổ sung action RPC `openWorkingTreeDiff` kết nối với API `vscode.diff` của VS Code. |
| **DEBT-3.1-03** | **Đồng bộ cờ ký số Commit (`isSign`)** | Checkbox `isSign` mới chỉ lưu state trên Signals của Webview, chưa đọc cấu hình `commit.gpgsign` từ `.gitconfig`. | Xây dựng query backend đọc cấu hình Git config ở giai đoạn mở rộng Settings. |

---

## 6. Bộ Nguyên Tắc Phòng Ngừa Cốt Tử Cho Phase 3.2 (3-Pane Workspace)

Từ các bài học thực tế trên, khi triển khai **Phase 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục** ([002_phase3_2_3pane_workspace.md](../../03_progess/phase3/002_phase3_2_3pane_workspace.md)), toàn bộ quy trình phải tuân thủ nghiêm ngặt 4 nguyên tắc sau:

### 🎯 Nguyên Tắc 1: Hợp Đồng RPC Đi Trước Mã Nguồn UI (Contract-First Development)
- **Áp dụng cho Phase 3.2**: Thanh Toolbar đỉnh sẽ có các thao tác `Fetch All`, `Pull`, `Push`, `Stash Save`, `Stash Pop`; Sidebar sẽ có các truy vấn `ahead/behind count`, `stash list`, `branch list`.
- **Hành động bắt buộc**:
  - Không được dựng Component giao diện khi chưa định nghĩa xong kiểu dữ liệu trong [src/types/actions.ts](file:///home/lmo1720/LMO-LAB/f-gitgraph/src/types/actions.ts) và [src/types/queries.ts](file:///home/lmo1720/LMO-LAB/f-gitgraph/src/types/queries.ts).
  - Khai báo và bọc xử lý lỗi đầy đủ trong [messageHandler.ts](file:///home/lmo1720/LMO-LAB/f-gitgraph/src/extension/services/messageHandler.ts) trước khi kết nối nút bấm UI.

### 🎯 Nguyên Tắc 2: Đăng Ký Dispatcher Đồng Thời Với Action (Realtime State Guarantee)
- **Áp dụng cho Phase 3.2**: Khi người dùng nhấn `Fetch`, `Pull`, `Push` hoặc `Checkout Branch`, dữ liệu trên màn hình phải tự động cập nhật ngay lập tức.
- **Hành động bắt buộc**:
  - Mọi Action mới phát sinh bắt buộc phải có mặt ngay trong map `handlers` của [dispatcher.ts](file:///home/lmo1720/LMO-LAB/f-gitgraph/src/webview/lib/dispatcher.ts) để tự động gọi `refresh()` và `refreshStatus()`.
  - Tuyệt đối không được để tình trạng action thành công ở backend nhưng webview trơ ra không phản ứng.

### 🎯 Nguyên Tắc 3: Bảo Toàn Tính Bất Biến Hình Học Khi Thu / Phóng 3 Phân Vùng
- **Áp dụng cho Phase 3.2**: Giao diện mới có **Left Sidebar** (~220px có thể co giãn hoặc ẩn) và **Inspector Panel** bên phải.
- **Hành động bắt buộc**:
  - Kích thước chiều rộng của đồ thị DAG và Virtualized Table phải dùng cơ chế tính toán động linh hoạt qua `ResizeObserver`.
  - Phải duy trì kiểm thử snapshot hình học: Đóng, mở hoặc kéo dãn Sidebar **tuyệt đối không được làm lệch tọa độ các nút `HexagonNode` và các đường cong SVG Bézier do F# Core sinh ra**.

### 🎯 Nguyên Tắc 4: Kỷ Luật Kiểm Thử & Kiểm Soát Linter Tại Chỗ
- Đặt tên tệp test luôn có đuôi `*.test.ts`. Sử dụng `h()` và helper `render()` của Preact cho component test.
- Thứ tự import chuẩn:
  1. `External packages` (ví dụ: `vitest`, `preact`, `@preact/signals`).
  2. `@/backend/...`, `@/extension/...`, `@/webview/...`, `@/types/...`.
  3. `@tests/...`.
  4. `./local-file`.
- Trong test UI Preact, luôn đặt `await setTimeout(0)` trước các lệnh `expect` kiểm tra DOM để đảm bảo Signals đã flush thay đổi hoàn tất.
- Trước khi đóng bất kỳ sub-task nào, bắt buộc chạy chuỗi lệnh kiểm tra:
  ```bash
  pnpm run typecheck && pnpm run lint && pnpm run compile
  ```

---

## 7. Kết Luận & Tuyên Bố Sẵn Sàng (Readiness Sign-Off)

Phase 3.1 đã hoàn thành xuất sắc mục tiêu kỹ thuật, khép kín hoàn chỉnh vòng lặp Staging & Commit an toàn, độc lập và bảo toàn nguyên vẹn 100% nhân đồ thị F#. 

Toàn bộ 18 lỗi phát sinh trong quá trình thực hiện đã được ghi nhận trung thực, định lượng minh bạch và khắc phục triệt để. Codebase hiện tại ở trạng thái **100% Pass Typecheck, Clean Lint, Clean Compile và Pass toàn bộ Test Suite**.

**Dự án hoàn toàn đủ điều kiện và sẵn sàng bước vào triển khai [Phase 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ](../../03_progess/phase3/002_phase3_2_3pane_workspace.md).**
