# ISSUE-001: Vitest `hookTimeout` 10s Bị Ngắt Khi Chạy `beforeAll` Khởi Tạo Kho Git Trên Windows

- **Mã sự cố**: `ISSUE-001`
- **Tiêu đề**: `[Test] Vitest hookTimeout 10s timeout trên Windows khi chạy beforeAll khởi tạo git repository (makeRepo)`
- **Trạng thái**: 🔴 **Chưa giải quyết (OPEN)**
- **Ngày ghi nhận**: 2026-10-15
- **Mức độ ảnh hưởng**: Thấp (Chỉ xuất hiện khi chạy test runner, **hoàn toàn 0% ảnh hưởng đến runtime extension**)
- **Module liên quan**: `vitest.config.ts`, `tests/backend/helpers.ts`, `tests/backend/*.test.ts`
- **GitHub Issue Link**: [#11](https://github.com/thatislg/f-gitgraph/issues/11)

---

## 1. Mô Tả Chi Tiết Hiện Tượng (Issue Description)

Khi thực thi chạy bộ kiểm thử backend (ví dụ: `npx vitest run tests/backend/gitCliMutator.test.ts`), Vitest thỉnh thoảng ngắt tiến trình và thông báo lỗi:

```
Error: Hook timed out in 10000ms: beforeAll
```

Lỗi này làm dừng toàn bộ suite kiểm thử trước khi bất kỳ bài test nào bên trong kịp chạy.

---

## 2. Phân Tích Nguyên Nhân Kỹ Thuật (Root Cause Analysis)

1. **Chuỗi Lệnh Spawn Dồn Dập Trong `beforeAll`**:
   - Trong hook `beforeAll` của các file test backend, hệ thống gọi hàm trợ giúp `makeRepo()` (trong `tests/backend/helpers.ts`) để tạo một kho Git tạm thời.
   - Hàm này phải gọi tuần tự từ 6 đến 7 lệnh `git.exe` thông qua `child_process.execFileSync`:
     - Bước 1: `git init -b main`
     - Bước 2: `git config user.email t@t.com`
     - Bước 3: `git config user.name T`
     - Bước 4: `git config commit.gpgsign false`
     - Bước 5: `git config tag.gpgsign false`
     - Bước 6: `git add .`
     - Bước 7: `git commit -m init`
2. **Chi Phí Khởi Động Tiến Trình Trên Hệ Điều Hành Windows**:
   - Trên Windows, việc tạo tiến trình mới (`CreateProcess`) tiêu tốn từ 30ms đến 80ms cho mỗi lần gọi `git.exe`.
   - Ngoài ra, việc tạo thư mục tạm trong `os.tmpdir()` kích hoạt cơ chế quét thời gian thực của phần mềm diệt virus (Windows Defender / Antivirus filter driver), đặc biệt là ở lần chạy đầu tiên (Cold Start).
   - Tổng thời gian thực thi của chuỗi 7 lệnh này có thể dao động từ 8 đến 12 giây trên các máy có tải hoặc ổ đĩa bận rộn.
3. **Giới Hạn Trần Mặc Định Của Vitest**:
   - Vitest thiết lập thời gian chờ tối đa cho các hook (`hookTimeout`) mặc định là **10.000ms (10 giây)**.
   - Do đó, khi `makeRepo()` chạy vượt quá 10 giây, Vitest lập tức phán đoán hook bị treo và hủy tiến trình.

---

## 3. Ranh Giới Đánh Giá Tác Động (Impact Assessment)

Cần phân định rạch ròi giữa môi trường Kiểm Thử (Test Environment) và môi trường Vận Hành Thực Tế (Production Runtime):

| Phạm Vi Đánh Giá                     |            Tác Động Thực Tế             | Diễn Giải Chi Tiết                                                                                                                       |
| :----------------------------------- | :-------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Sản phẩm xuất bản (VSIX Package)** |           ❌ **0% Ảnh hưởng**           | Vitest, tệp `vitest.config.ts` và toàn bộ thư mục `tests/` hoàn toàn bị loại trừ khi đóng gói extension bằng esbuild.                    |
| **Mã nguồn Runtime Extension**       |           ❌ **0% Ảnh hưởng**           | Tiến trình `git.exe` trong `GitCliMutator.ts` chạy độc lập qua Node.js stream, không phụ thuộc vào bất kỳ cơ chế timeout nào của Vitest. |
| **Tốc độ thực thi bài test**         |          ❌ **Không làm chậm**          | Test chạy xong trong bao nhiêu mili-giây thì trả kết quả bấy nhiêu; timeout chỉ là "mức trần bảo hiểm" để tránh bị ngắt sớm.             |
| **Độ tin cậy của test suite**        | ⚠️ **Gây báo lỗi giả (False Negative)** | Khiến lập trình viên tưởng rằng code backend bị lỗi trong khi thực tế chỉ là do hook khởi tạo bị ngắt bởi Vitest.                        |

---

## 4. Các Phương Án Xử Lý Đề Xuất (Proposed Solutions)

### Phương Án 1: Cấu hình `hookTimeout: 30000` trong `vitest.config.ts` (Khuyến nghị cao nhất)

- **Cách thực hiện**: Bổ sung `hookTimeout: 30000` (30 giây) và `testTimeout: 15000` (15 giây) vào cấu hình `test` của `vitest.config.ts`.
- **Ưu điểm**:
  - Giải quyết triệt để vấn đề báo lỗi giả trên Windows và CI/CD runner.
  - Đơn giản nhất, chuẩn hóa theo thông lệ của các dự án công cụ Git lớn (VS Code Git, GitLens).
- **Nhược điểm**: Nếu có bug làm treo hook thực sự thì phải chờ 30 giây mới nhận được thông báo fail.

### Phương Án 2: Tối ưu hóa số lần gọi Git trong `makeRepo()`

- **Cách thực hiện**: Thay vì gọi 4 lệnh `git config` độc lập, cấu hình trực tiếp thông qua biến môi trường hoặc cờ `-c`:
  - `git -c user.name=T -c user.email=t@t.com -c commit.gpgsign=false commit -m init`
  - Giảm số lần spawn tiến trình từ 7 lần xuống còn 3 lần (`init`, `add`, `commit`).
- **Ưu điểm**: Giảm thời gian chạy `makeRepo()` xuống dưới 3 giây.
- **Nhược điểm**: Chỉ áp dụng cho repo do test helper tạo ra, không bảo hiểm cho các test case nặng khác.

### Phương Án 3: Sử dụng cờ dòng lệnh thủ công

- **Cách thực hiện**: Chạy lệnh test kèm cờ: `npx vitest run --hookTimeout 30000`.
- **Ưu điểm**: Không cần sửa file cấu hình.
- **Nhược điểm**: Bất tiện vì phải nhớ gõ cờ mỗi khi chạy test ngoài terminal.

---

## 5. Trạng Thái & Lịch Sử Cập Nhật (Status Log)

- **2026-10-15**: Ghi nhận sự cố `ISSUE-001`. Tình trạng: **Chưa giải quyết (OPEN)**. Chờ quyết định áp dụng Phương án 1 vào `vitest.config.ts`.
