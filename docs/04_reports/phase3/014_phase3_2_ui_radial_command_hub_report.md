# Báo Cáo Chặng 3.2.UI — Trạm Chỉ Huy Bánh Xe Lục Giác & Nâng Tầm Thẩm Mỹ Cyber-Lab

> **Mã báo cáo**: 014_phase3_2_ui_radial_command_hub_report
> **Giai đoạn**: Phase 3.2.UI — Cyber Hex-Wheel Command Hub
> **Nhóm việc liên quan**: Nhóm Việc 1 (Hình học lục giác & Component State 0/1), 2 (Kho `wheel.store.ts` & Lớp âm học), 3 (Component `HexWheelHub.tsx`), 4 (Tích hợp `GlobalToolbar.tsx`, phím tắt & cấu hình VS Code)
> **Ngày thực hiện**: 2026-10-20
> **Tài liệu thiết kế áp dụng**: [10_WheelConcepts.md](../../02_design/phase3/10_WheelConcepts.md)

---

## 1. Mục Tiêu & Phạm Vi

Thay thế dải 6 nút bấm phẳng trên `GlobalToolbar.tsx` bằng Trạm Chỉ Huy Bánh Xe Lục Giác Hướng Tâm (Cyber Hex-Wheel Command Hub) vòng đời 4 giai đoạn `State 0 → 1 → 2 → 3`, kế thừa 100% chức năng mạng/lưu trữ của Phase 3.2, bảo toàn hình học đồ thị DAG (Zero Layout Shift) và giữ nguyên chiều cao thanh đỉnh 40px.

---

## 2. Cấu Trúc Mã Nguồn Tác Động

| File                                                                                       | Nội dung                                                                                                                                                                                                                                                                    |
| :----------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/webview/utils/hexGeometry.ts`                                                         | Hàm `hexagonVertices`/`hexagonPoints`/`polarToCartesian`/`petalCenters`, hằng số `EMBLEM_RADIUS`(14)/`PETAL_RADIUS`(34)/`HUB_RADIUS`(38)/`ORBIT_DISTANCE`(76), bảng `PETAL_LAYOUT` 6 cánh hoa.                                                                              |
| `src/webview/lib/stores/wheel.store.ts`                                                    | Signals `wheelStage`/`activePetal`/`wheelStyle`/`wheelDisplayMode`/`floatingOrigin`/`isSecondaryMenuOpen`; computed `isWheelArmed`/`isWheelExpanded`/`activePetalTooltip`; dispatchers `armWheel`/`disarmWheel`/`openWheel`/`closeWheel`/`focusPetal`/`executePetalAction`. |
| `src/webview/lib/audio.ts`                                                                 | Bổ sung `playMicroHapticTick`(1400Hz/6ms), `playPetalHoverTick`(1600Hz/4ms), `playIrisShutterOpen`(380→760Hz), `playIrisShutterClose`(620→240Hz).                                                                                                                           |
| `src/webview/components/wheel/FGitGraphLogo.tsx`                                           | Vector F-GitGraph nhúng JSX (tương đương `resources/webview-icon.svg`, do gói webview không có loader SVG).                                                                                                                                                                 |
| `src/webview/components/wheel/HexagonShape.tsx`                                            | Polygon lục giác đỉnh nhọn SVG.                                                                                                                                                                                                                                             |
| `src/webview/components/wheel/HexWheelBrandEmblem.tsx`                                     | State 0 (28px) + chấm sáng nhịp thở ahead/behind.                                                                                                                                                                                                                           |
| `src/webview/components/wheel/HexagonPetal.tsx`                                            | Cánh hoa đơn lẻ (icon + nhãn + corner badge + dimming).                                                                                                                                                                                                                     |
| `src/webview/components/wheel/ContextualPill.tsx`                                          | Viên nang thông số nổi ở State 3.                                                                                                                                                                                                                                           |
| `src/webview/components/wheel/HexWheelHub.tsx`                                             | Trạm chỉ huy 7 nhân, vòng đời 4 giai đoạn, phím tắt Esc/Space, menu ngữ cảnh Pull/Push.                                                                                                                                                                                     |
| `src/webview/components/wheel/HexWheelDockTrigger.tsx`                                     | Nút kích hoạt buồng lái + chỉ báo `syncStatusText` + phím tắt `Alt+W`/`Ctrl+Space`.                                                                                                                                                                                         |
| `src/webview/components/wheel/petalMeta.tsx`                                               | Màu Neon Chromatic, tooltip và biểu tượng 6 cánh hoa.                                                                                                                                                                                                                       |
| `src/webview/components/toolbar/GlobalToolbar.tsx`                                         | Thay cụm trái 6 nút phẳng bằng `HexWheelDockTrigger`.                                                                                                                                                                                                                       |
| `src/types/config.ts` / `src/extension/config.ts` / `src/extension/handlers/initialize.ts` | Thêm kiểu `WheelStyle` và cấu hình `f-gitgraph.ui.wheelStyle`.                                                                                                                                                                                                              |
| `package.json` / `package.nls.json`                                                        | Khai báo cấu hình `f-gitgraph.ui.wheelStyle` (`chromatic`\|`monochromatic`).                                                                                                                                                                                                |
| `src/webview/styles.css`                                                                   | Keyframe `f-gitgraph-pip-breath` cho chấm sáng nhịp thở.                                                                                                                                                                                                                    |
| `tests/webview/geometry/hexGeometry.test.ts`                                               | 6 test hình học lục giác.                                                                                                                                                                                                                                                   |
| `tests/webview/stores/wheelStore.test.ts`                                                  | 9 test vòng đời store.                                                                                                                                                                                                                                                      |
| `tests/webview/components/HexWheelHub.test.ts`                                             | 6 test render 4 trạng thái + phím tắt + badge.                                                                                                                                                                                                                              |
| `tests/webview/components/toolbar/GlobalToolbar.test.ts`                                   | Cập nhật 6 test cho giao diện mới.                                                                                                                                                                                                                                          |

---

## 3. Kiểm Thử

| Hạng mục                                                 | Kết quả                                       |
| :------------------------------------------------------- | :-------------------------------------------- |
| `tests/webview/geometry/hexGeometry.test.ts`             | ✅ 6/6 pass                                   |
| `tests/webview/stores/wheelStore.test.ts`                | ✅ 9/9 pass                                   |
| `tests/webview/components/HexWheelHub.test.ts`           | ✅ 6/6 pass                                   |
| `tests/webview/components/toolbar/GlobalToolbar.test.ts` | ✅ 6/6 pass                                   |
| Toàn bộ project `backend`                                | ✅ 159/159 pass                               |
| Toàn bộ project `extension`                              | ✅ 29/29 pass                                 |
| Toàn bộ project `webview`                                | ✅ 262/262 pass (tăng +27 so với báo cáo 013) |
| Typecheck (`pnpm run typecheck`)                         | ✅ sạch (toàn workspace)                      |
| Lint (`pnpm run lint`)                                   | ✅ 0 error / 0 warning                        |
| Compile (`pnpm run compile`)                             | ✅ thành công                                 |

---

## 4. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động                                         | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt                               |  Phân Loại  | Nguyên Nhân Gốc                                                                             | Giải Pháp Đã Sửa                                                  | Kết Quả Sau Sửa |
| :-: | :------------: | :------------------------------------------------------- | :------------: | :-------------------------------------------------------- | :---------: | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------- | :-------------: |
|  1  |     Vòng 1     | `src/webview/components/wheel/HexWheelHub.tsx`           |   Typecheck    | `TS18048: 'center' is possibly 'undefined'`               | `[DEV_BUG]` | `noUncheckedIndexedAccess` bật, `centers[index]` trả `Point\|undefined`                     | Khẳng định `centers[index]!` (độ dài luôn khớp `PETAL_LAYOUT`)    | ✅ Đã khắc phục |
|  2  |     Vòng 1     | `src/webview/components/wheel/HexWheelHub.tsx`           |   Typecheck    | `TS2532: Object is possibly 'undefined'` (ContextualPill) | `[DEV_BUG]` | Truy cập `PETAL_LAYOUT[idx]`/`centers[idx]` không được thu hẹp từ `idx >= 0`                | Tách biến `activeCenter` + guard `!== undefined`, dùng `activeId` | ✅ Đã khắc phục |
|  3  |     Vòng 2     | `tests/webview/geometry/hexGeometry.test.ts`             |   Typecheck    | `TS2532: Object is possibly 'undefined'` (10 vị trí)      | `[DEV_BUG]` | `noUncheckedIndexedAccess` trên truy cập mảng trong test                                    | Thêm hậu tố `!` cho `vertices[i]`/`centers[i]`                    | ✅ Đã khắc phục |
|  4  |     Vòng 3     | `src/webview/components/toolbar/GlobalToolbar.tsx`       |      Lint      | `import-js(order)`                                        | `[DEV_BUG]` | Import `HexWheelDockTrigger` đặt sau `@/webview/constants`                                  | Di chuyển lên nhóm `components/wheel`                             | ✅ Đã khắc phục |
|  5  |     Vòng 3     | `src/webview/lib/stores/wheel.store.ts`                  |      Lint      | `import-js(order)`                                        | `[DEV_BUG]` | Import `actions` đặt sau `audio`                                                            | Đảo thứ tự `actions` trước `audio`                                | ✅ Đã khắc phục |
|  6  |     Vòng 3     | `src/webview/components/wheel/HexWheelHub.tsx`           |      Lint      | `consistent-function-scoping` (`handleContextMenu`)       | `[DEV_BUG]` | Hàm không đóng biến cha, gây tái tạo mỗi lần render                                         | Nâng lên phạm vi module                                           | ✅ Đã khắc phục |
|  7  |     Vòng 4     | `src/webview/components/wheel/HexWheelHub.tsx`           |      Lint      | `no-unused-vars` + `no-shadow` (trùng hàm)                | `[DEV_BUG]` | Chỉnh sửa bỏ sót, để lại bản khai báo trùng trong component                                 | Xóa bản khai báo bên trong, giữ bản module                        | ✅ Đã khắc phục |
|  8  |     Vòng 5     | `tests/webview/stores/wheelStore.test.ts`                |   Unit Test    | `runAction` không được gọi với `pull`                     | `[DEV_BUG]` | Cờ bận `isPushing` của `push` trước đó chặn `pull` (guard `isNetworkBusy`)                  | Reset cờ bận giữa các lời gọi `executePetalAction`                | ✅ Đã khắc phục |
|  9  |     Vòng 5     | `tests/webview/components/toolbar/GlobalToolbar.test.ts` |   Unit Test    | Kỳ vọng `"2 ahead, 1 behind"` sai thứ tự                  | `[DEV_BUG]` | Gán `ahead=1, behind=2` nhưng kỳ vọng chuỗi hoán đổi                                        | Sửa kỳ vọng thành `"1 ahead, 2 behind"`                           | ✅ Đã khắc phục |
| 10  |     Vòng 5     | `tests/webview/components/HexWheelHub.test.ts`           |   Unit Test    | Phím `Space` không mở bánh xe (flaky)                     | `[DEV_BUG]` | `useEffect` Preact đăng ký listener `document` bất đồng bộ, 50ms chưa đủ dưới tải song song | Tăng `flushEffects` lên 150ms (khớp quy ước repo)                 | ✅ Đã khắc phục |

### 4.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng                               |   Ký Hiệu    | Giá Trị Thực Tế | Ghi Chú / Đánh Giá                             |
| :---------------------------------------------- | :----------: | :-------------: | :--------------------------------------------- |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)**         |     $C$      |   **5 vòng**    | Typecheck×2 → Lint×2 → Test×1 → sạch           |
| **Tổng số lỗi kỹ thuật**                        | $E_{total}$  |   **10 lỗi**    | $E_{design} + E_{dev}$                         |
| **Số lỗi do Thiết Kế**                          | $E_{design}$ |    **0 lỗi**    | Đặc tả 10_WheelConcepts nhất quán ngay lần đầu |
| **Số lỗi do Triển Khai (Bug Dev)**              |  $E_{dev}$   |   **10 lỗi**    | 3 typecheck + 3 lint + 1 lint sót + 3 test     |
| **Số sự cố Môi Trường/Tool**                    |  $E_{env}$   |   **0 sự cố**   | —                                              |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)**       |  **$DDR$**   |    **0.0%**     | $\frac{0}{10} \times 100\%$                    |
| **TỶ LỆ BUG KHI DEV (IBR)**                     |  **$IBR$**   |   **100.0%**    | $\frac{10}{10} \times 100\%$                   |
| **TỶ LỆ ĐÚNG NGAY LẦN ĐẦU CỦA THIẾT KẾ (DFTR)** |  **$DFTR$**  |   **100.0%**    | Thiết kế không cần sửa đổi                     |

---

## 5. Ghi Chú Thiết Kế (Design Discrepancies)

1. **Nhúng vector thay vì import `.svg`**: Gói webview (`esbuild.js`) không có loader SVG, do đó vector `resources/webview-icon.svg` được tái hiện nguyên bản dưới dạng component JSX `FGitGraphLogo.tsx` thay vì import trực tiếp tệp.
2. **Phong cách State 1 (Iris 6 múi) được giản lược**: Hoạt ảnh phân rã màng trập 6 múi rẻ quạt được thay bằng hiệu ứng xoay 30° + cờ `data-armed`, đánh dấu affordance tương tác. Hoạt ảnh wedge đầy đủ được hoãn lại.
3. **Không gian tên cấu hình `ui.wheelStyle`**: Thiết kế chỉ định khóa `f-gitgraph.ui.wheelStyle` (không gian con `ui`) trong khi các khóa hiện tại đều phẳng; tuân thủ đúng hợp đồng thiết kế bằng khóa `ui.wheelStyle`.
4. **Đặt tên tệp test**: Tài liệu thiết kế đề cập `tests/webview/geometry/hexagon.test.ts` nhưng tài liệu tiến độ chốt `hexGeometry.test.ts`; triển khai theo tài liệu tiến độ (là danh mục đầu việc).

Vì toàn bộ điểm bất nhất trên là quyết định triển khai (không phải mâu thuẫn hợp đồng), không phát sinh `[DESIGN_DEFECT]`.

---

## 6. Kết Luận

| Tiêu chí                                                                      | Trạng thái |
| :---------------------------------------------------------------------------- | :--------: |
| Thư viện hình học lục giác `hexGeometry.ts`                                   |   ✅ Đạt   |
| Kho trạng thái `wheel.store.ts` (4 giai đoạn)                                 |   ✅ Đạt   |
| Lớp âm học vi mô (4 hiệu ứng mới)                                             |   ✅ Đạt   |
| Component `HexWheelHub`/`HexagonPetal`/`ContextualPill`/`HexWheelBrandEmblem` |   ✅ Đạt   |
| Tích hợp `HexWheelDockTrigger` thay dải nút phẳng                             |   ✅ Đạt   |
| Cấu hình `f-gitgraph.ui.wheelStyle`                                           |   ✅ Đạt   |
| Unit test (27 test mới/cập nhật)                                              |  ✅ 27/27  |
| Typecheck + lint + compile + test                                             |   ✅ Đạt   |
