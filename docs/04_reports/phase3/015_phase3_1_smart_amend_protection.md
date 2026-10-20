# Báo Cáo Khắc Phục Defect — Cơ Chế Kiểm Soát An Toàn Khi Kích Hoạt Chế Độ Amend (Smart Amend Protection)

> **Mã báo cáo**: 015_phase3_1_smart_amend_protection
> **Giai đoạn**: Phase 3.1 — Khu Vực Staging & Bộ Soạn Thảo Commit
> **Loại công việc**: Khắc phục `[DESIGN_DEFECT]` — Thiếu cơ chế kiểm soát an toàn khi kích hoạt chế độ Amend
> **Nhiệm vụ liên quan**: Task 2.7 — `CommitComposer.tsx` mô tả co giãn, Amend & Sign ([#30](https://github.com/thatislg/f-gitgraph/issues/30))
> **Ngày thực hiện**: 2026-10-20
> **Tài liệu thiết kế áp dụng**: [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md)

---

## 1. Bối Cảnh & Triệu Chứng

Bản thiết kế gốc cho phép người dùng tích chọn "Amend previous commit" bất kể trạng thái kho. Trên thực tế, chế độ Amend chỉ an toàn khi kho **đã có commit** và commit HEAD **chưa bị đẩy lên remote**; nếu không, lệnh `git commit --amend` sẽ crash dòng lệnh (kho chưa có commit) hoặc tạo phân nhánh "1 ahead, 1 behind" (commit HEAD đã push).

## 2. Nguyên Nhân Gốc (`[DESIGN_DEFECT]`)

- Thiết kế gốc (Mục 3.3.4 & 4.2) đặc tả checkbox Amend chỉ với hành vi nạp/khôi phục nội dung commit HEAD, **thiếu** cơ chế chặn cứng (Hard Block) và trạng thái vô hiệu hóa điều kiện theo `commitHead`, `upstreamBranch`, `aheadCount`.
- Hệ quả: `setAmend(true)` và checkbox Amend không có bất kỳ ràng buộc an toàn nào, mở đường cho thao tác Amend ngoài luồng gây hỏng lịch sử.

## 3. Giải Pháp

Triển khai kiến trúc **Smart Amend Protection (Hướng 1: Hard Block)** theo đặc tả cập nhật tại Mục 4.2 & 4.3:

1. **Hai tín hiệu dẫn xuất phản ứng** trong `staging.store.ts`:
   - `canAmend: Computed<boolean>` — `commitHead !== null && !(upstreamBranch !== null && aheadCount === 0)`.
   - `amendDisabledReason: Computed<string | undefined>` — chuỗi lý do vô hiệu hóa (tooltip).
2. **Chặn cứng trong `setAmend(value)`** — nếu `value === true` nhưng `canAmend === false`, thoát an toàn.
3. **Checkbox Amend trong `CommitComposer.tsx`** — gán `disabled={!canAmend}` và `title={amendDisabledReason}`.

### Tệp tác động

| File                                                      | Thay đổi                                                               |
| :-------------------------------------------------------- | :--------------------------------------------------------------------- |
| `src/webview/lib/stores/staging.store.ts`                 | Bổ sung `canAmend`, `amendDisabledReason`; chặn cứng trong `setAmend`. |
| `src/webview/components/staging/CommitComposer.tsx`       | Gán `disabled` + `title` cho checkbox Amend.                           |
| `tests/webview/lib/stores/staging.store.test.ts`          | 4 test `canAmend`/`amendDisabledReason` + 2 test chặn `setAmend`.      |
| `tests/webview/components/staging/CommitComposer.test.ts` | 3 test trạng thái disabled/tooltip checkbox Amend.                     |

---

## 4. Nhật Ký Lỗi Biên Dịch & Chẩn Đoán (Compilation & Diagnostic Error Log)

| STT | Chu Kỳ (Cycle) | Tệp Tin Tác Động                                          | Cổng Phát Hiện | Mã Lỗi / Thông Điệp Tóm Tắt                                      |  Phân Loại  | Nguyên Nhân Gốc            | Giải Pháp Đã Sửa        | Kết Quả Sau Sửa |
| :-: | :------------: | :-------------------------------------------------------- | :------------- | :--------------------------------------------------------------- | :---------: | :------------------------- | :---------------------- | :-------------: |
|  1  |     Vòng 1     | `tests/webview/lib/stores/staging.store.test.ts`          | Lint           | `import-js(order)`: `staging.store` phải đứng trước `sync.store` | `[DEV_BUG]` | Đặt nhóm import sai thứ tự | Sắp xếp lại nhóm import | ✅ Đã khắc phục |
|  2  |     Vòng 1     | `tests/webview/components/staging/CommitComposer.test.ts` | Lint           | `import-js(order)`: `staging.store` phải đứng trước `sync.store` | `[DEV_BUG]` | Đặt nhóm import sai thứ tự | Sắp xếp lại nhóm import | ✅ Đã khắc phục |

### 4.1. Bảng Thống Kê Định Lượng (Defect & Reliability Metrics)

| Chỉ Số Định Lượng                         |   Ký Hiệu    | Giá Trị Thực Tế | Ghi Chú / Đánh Giá                                      |
| :---------------------------------------- | :----------: | :-------------: | :------------------------------------------------------ |
| **Tổng số chu kỳ sửa lỗi (Fix Cycles)**   |     $C$      |   **2 vòng**    | Vòng 1 (lint 2 lỗi) → Vòng 2 (sạch)                     |
| **Tổng số lỗi kỹ thuật**                  | $E_{total}$  |    **2 lỗi**    | $E_{design} + E_{dev}$                                  |
| **Số lỗi do Thiết Kế**                    | $E_{design}$ |    **0 lỗi**    | Thiết kế đã được cập nhật sẵn (Design-First-Time-Right) |
| **Số lỗi do Triển Khai (Bug Dev)**        |  $E_{dev}$   |    **2 lỗi**    | 2 lỗi import order trong tệp test mới                   |
| **Số sự cố Môi Trường/Tool**              |  $E_{env}$   |   **0 sự cố**   | Loại trừ khỏi tỷ lệ                                     |
| **TỶ LỆ LỖI PHẢI SỬA CỦA THIẾT KẾ (DDR)** |  **$DDR$**   |     **0%**      | $\frac{0}{2} \times 100\%$                              |
| **TỶ LỆ BUG KHI DEV (IBR)**               |  **$IBR$**   |    **100%**     | $\frac{2}{2} \times 100\%$                              |
| **Trạng thái cổng chẩn đoán cuối cùng**   |      -       |  **100% PASS**  | Typecheck: OK \| Lint: OK \| Compile: OK \| Test: OK    |

---

## 5. Kết Quả Kiểm Thử

| Hạng mục                                                  | Kết quả                  |
| :-------------------------------------------------------- | :----------------------- |
| `tests/webview/lib/stores/staging.store.test.ts`          | ✅ 16/16 pass            |
| `tests/webview/components/staging/CommitComposer.test.ts` | ✅ 8/8 pass              |
| `pnpm run test` (backend + extension + webview)           | ✅ 459/459 pass          |
| Typecheck (`pnpm run typecheck`)                          | ✅ sạch (toàn workspace) |
| Lint (`pnpm run lint`)                                    | ✅ 0 error / 0 warning   |
| Compile (`pnpm run compile`)                              | ✅ thành công            |

---

## 6. Kết Luận

Checkbox "Amend previous commit" giờ bị vô hiệu hóa kèm tooltip giải thích khi kho chưa có commit (`commitHead === null`) hoặc khi commit HEAD đã được đẩy lên remote (`upstreamBranch !== null && aheadCount === 0`), đồng thời `setAmend(true)` chặn cứng kích hoạt ngoài luồng. Điều này phòng ngừa triệt để lỗi phân nhánh "1 ahead, 1 behind" và lỗi crash dòng lệnh Git CLI.
