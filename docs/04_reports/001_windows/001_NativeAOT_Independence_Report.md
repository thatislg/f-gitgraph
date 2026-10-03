# Báo Cáo Kiểm Định Tính Độc Lập File Nhị Phân Native AOT (Nhóm Việc 1)

> **Mã báo cáo**: 001_NativeAOT_Independence_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 1 — Khởi Tạo Dự Án F# & Cấu Hình Biên Dịch Native AOT
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [01_Project_Structure_And_NativeAOT.md](../../02_design/001_windows/01_Project_Structure_And_NativeAOT.md)

---

## 1. Mục Tiêu Báo Cáo

Báo cáo này ghi nhận kết quả kiểm định tính độc lập của file nhị phân `f-gitgraph-core.exe` được biên dịch bằng cơ chế **Native AOT** trên môi trường Windows, bao gồm:

- Xác nhận file thực thi chạy độc lập hoàn toàn, không phụ thuộc .NET SDK/Runtime.
- Đo đạc dung lượng file nhị phân thực tế.
- Đo đạc thời gian phản hồi khởi động lạnh (cold-start latency).
- Kiểm tra tính toàn vẹn liên kết với các thư viện hệ thống.

---

## 2. Môi Trường Biên Dịch & Cấu Hình Áp Dụng

| Hạng mục                          | Giá trị                              |
| :-------------------------------- | :----------------------------------- |
| Hệ điều hành biên dịch            | Windows (64-bit)                     |
| .NET SDK                          | 10.0.401                             |
| Framework mục tiêu                | `net10.0` (LTS)                      |
| Runtime Identifier                | `win-x64`                            |
| Bộ công cụ C++ (MSVC Build Tools) | 14.50.35717                          |
| Dự án                             | `src/core-engine/core-engine.fsproj` |

### Các thiết lập Native AOT đã kích hoạt

| Thiết lập                                              | Giá trị | Mục đích                                |
| :----------------------------------------------------- | :------ | :-------------------------------------- |
| `PublishAot`                                           | `true`  | Biên dịch trước mã máy, loại bỏ CIL/JIT |
| `SelfContained`                                        | `true`  | Tự chứa runtime tối thiểu               |
| `PublishTrimmed`                                       | `true`  | Cắt tỉa mã nguồn tích cực               |
| `InvariantGlobalization`                               | `true`  | Loại bỏ bảng tra cứu văn hóa            |
| `StripSymbols`                                         | `true`  | Lược bỏ biểu tượng gỡ lỗi khỏi nhị phân |
| `OptimizationPreference` / `IlcOptimizationPreference` | `Size`  | Tối ưu hóa kích thước                   |
| `IlcGenerateStackTraceData`                            | `false` | Không phát sinh dữ liệu stack trace     |
| `IlcFoldIdenticalMethodBodies`                         | `true`  | Hợp nhất thân phương thức trùng lặp     |

---

## 3. Kết Quả Đo Đạc Dung Lượng File Nhị Phân

| Hạng mục                                           | Kích thước (bytes) | Kích thước (đọc được) |
| :------------------------------------------------- | -----------------: | :-------------------- |
| `f-gitgraph-core.exe`                                 |            862.720 | ~0,84 MB (842 KiB)    |
| `f-gitgraph-core.pdb` (biểu tượng gỡ lỗi, tách riêng) |          5.795.840 | ~5,53 MB              |

**Đánh giá so với mục tiêu**:

- Mục tiêu thiết kế: **từ 6MB đến 9MB**.
- Kết quả hiện tại: **~0,84 MB** — thấp hơn nhiều so với cận dưới mục tiêu.
- **Giải thích**: nhân F# ở Nhóm Việc 1 mới chỉ chứa điểm khởi chạy tối thiểu (`Program.fs`) và các module rỗng đánh dấu cấu trúc. Dung lượng sẽ tăng đáng kể khi tích hợp LibGit2, bộ giải mã MessagePack và thuật toán đồ thị ở các nhóm việc tiếp theo. Kết quả 0,84 MB cho thấy nền tảng AOT hoạt động đúng như kỳ vọng về khả năng nén kích thước.

---

## 4. Kết Quả Đo Đạc Thời Gian Khởi Động Lạnh (Cold-start Latency)

Phương pháp đo: lặp 20 lần lệnh `ping` (phản hồi tức thời), đo bằng `System.Diagnostics.Stopwatch`. Kịch bản đo có thể tái hiện bằng script **[measure_cold_start.ps1](./measure_cold_start.ps1)** (tự tìm file `f-gitgraph-core.exe` trong bản phát hành, chạy: `powershell -NoProfile -ExecutionPolicy Bypass -File measure_cold_start.ps1`).

| Chỉ số           |   Giá trị |
| :--------------- | --------: |
| Số lần đo        |        20 |
| Tối thiểu (min)  | 29,141 ms |
| Trung bình (avg) | 37,473 ms |
| Tối đa (max)     | 56,525 ms |

**Đánh giá so với mục tiêu**:

- Mục tiêu thiết kế: **< 5ms**.
- Kết quả: **~29–56 ms** — **CHƯA ĐẠT** mục tiêu.
- **Phân tích nguyên nhân**: độ trễ đo được chủ yếu đến từ chi phí tạo tiến trình `CreateProcessW` của Windows (khoảng 20–40 ms mỗi lần spawn), không phải từ thời gian nạp mã máy của nhân F#. Với mô hình spawn tiến trình mỗi lần gọi, mục tiêu < 5 ms là không khả thi về mặt bản chất.
- **Giải pháp định hướng**: chuyển sang mô hình **sidecar daemon thường trú** (spawn một lần duy nhất, giao tiếp qua Stdio RPC), sẽ được triển khai tại Nhóm Việc 5 — giúp triệt tiêu hoàn toàn độ trễ spawn tiến trình.

---

## 5. Kiểm Định Tính Độc Lập (Không Phụ Thuộc .NET Runtime)

### 5.1. Kiểm tra cấu trúc thư mục phát hành

Thư mục `bin/Release/net10.0/win-x64/publish/` chỉ chứa duy nhất:

- `f-gitgraph-core.exe` (file thực thi mã máy thuần túy)
- `f-gitgraph-core.pdb` (biểu tượng gỡ lỗi, tách riêng, không nằm trong file `.exe`)

**Không tồn tại** bất kỳ DLL runtime .NET nào (`coreclr.dll`, `System.Private.CoreLib.dll`, ...) trong thư mục phát hành — xác nhận tính tự chứa (self-contained) của nhị phân AOT.

### 5.2. Kiểm tra lệnh phản hồi tức thời

| Lệnh                         | Kết quả đầu ra       | Mã thoát |
| :--------------------------- | :------------------- | :------: |
| `f-gitgraph-core.exe --version` | `f-gitgraph-core 0.1.0` |    0     |
| `f-gitgraph-core.exe ping`      | `ready`              |    0     |

### 5.3. Hạn chế cần bổ sung

- **Chưa thực hiện** kiểm định trên máy ảo Windows sạch (không cài .NET SDK/Runtime) do giới hạn môi trường. Tính độc lập hiện được khẳng định gián tiếp qua cấu trúc nhị phân AOT tự chứa (Mục 5.1).
- **Khuyến nghị**: trước khi nghiệm thu chính thức, cần sao chép `f-gitgraph-core.exe` vào máy ảo Windows 10/11 nguyên bản và chạy lệnh `--version` để xác nhận mã thoát 0 mà không yêu cầu cài đặt gì thêm.

---

## 6. Kết Luận

| Tiêu chí                           |    Trạng thái    | Ghi chú                                                  |
| :--------------------------------- | :--------------: | :------------------------------------------------------- |
| Khởi tạo dự án F# phân tầng module |      ✅ Đạt      | `Domain` / `Storage` / `Graph` / `Transport` / `Program` |
| Biên dịch Native AOT thành công    |      ✅ Đạt      | Sinh mã máy qua MSVC Build Tools 14.50                   |
| Tính độc lập (self-contained)      |      ✅ Đạt      | Không có DLL runtime .NET trong bản phát hành            |
| Kích thước nhị phân 6–9 MB         |  ⚠️ Dưới ngưỡng  | 0,84 MB — sẽ tăng khi bổ sung tính năng                  |
| Cold-start < 5 ms                  |   ❌ Chưa đạt    | ~37 ms, do chi phí spawn tiến trình Windows              |
| Kiểm định trên máy Windows sạch    | ⏳ Chờ thực hiện | Cần máy ảo nguyên bản                                    |

**Nhận định tổng thể**: Nền móng dự án F# Native AOT đã được thiết lập thành công và biên dịch ra nhị phân mã máy độc lập đúng kỳ vọng. Hai điểm cần theo dõi tiếp là (1) cold-start < 5 ms chỉ khả thi với mô hình daemon thường trú ở Nhóm Việc 5, và (2) kiểm định thực tế trên máy Windows sạch trước khi nghiệm thu.
