# Core Git Engine - Kiến Trúc & Kế Hoạch Chuyển Đổi Sang F#

## 1. Tầm nhìn & Động lực (Motivation)

Dự án **F-GitGraph** hiện tại sử dụng TypeScript cho toàn bộ kiến trúc (bao gồm Extension Host chạy trên Node.js và Webview UI chạy Preact). Khi làm việc với các kho mã nguồn (repository) vừa và nhỏ (< 5,000 commits), kiến trúc này hoạt động tương đối ổn định.

Tuy nhiên, khi kiểm thử trên các repository lớn của doanh nghiệp (từ 20,000 đến hơn 100,000 commits như Linux kernel, Chromium, monorepo nội bộ), nhân xử lý Git dựa trên TypeScript bộc lộ rõ những giới hạn cố hữu về hiệu năng:

1. **Chi phí khởi tạo Process trên Windows**: Thư viện `simple-git` gọi `git.exe` qua CLI, tạo ra hàng loạt tiến trình con với độ trễ từ 30ms - 100ms cho mỗi lệnh.
2. **Áp lực bộ nhớ & V8 Garbage Collection (GC)**: Việc đọc toàn bộ lịch sử git dưới dạng các chuỗi text khổng lồ và dùng `.split()` tạo ra hàng triệu đối tượng ngắn hạn, gây nghẽn GC kéo dài.
3. **Nghẽn IPC & UI Thread**: Thuật toán tính toán topo nhánh đồ thị (`computeGraphLayout`) hiện đang chạy đơn luồng trên UI Webview, làm đơ toàn bộ giao diện trong nhiều giây.

**Mục tiêu**: Xây dựng một nhân tính toán độc lập **Core Git Engine bằng F# (.NET / Native AOT)** để thay thế tầng backend Git của TypeScript. F# mang lại sức mạnh xử lý song song vượt trội, mô hình hóa kiểu dữ liệu chặt chẽ (Discriminated Unions), khả năng tương tác trực tiếp với native `libgit2` không qua CLI, và có thể biên dịch thành file thực thi native siêu nhẹ (Native AOT) với thời gian khởi động < 5ms.

---

## 2. So sánh Kiến trúc Tổng thể

```
[ HIỆN TẠI: TypeScript Full-stack ]
┌─────────────────────────┐          IPC (JSON)         ┌─────────────────────────┐
│     VS Code Webview     │ ◄─────────────────────────► │     Extension Host      │
│  (Preact + UI Layout)   │                             │   (Node.js + TypeScript)│
└─────────────────────────┘                             └────────────┬────────────┘
          ▲                                                          │ CLI spawn
          │ Đơn luồng (UI đơ khi tính layout)                        ▼
          └─────────────────────────────────────────────        git.exe process

[ TƯƠNG LAI: F# Native Core Engine ]
┌─────────────────────────┐          Giao thức nhị phân  ┌─────────────────────────┐
│     VS Code Webview     │ ◄───────────────────────────┤   F# Core Git Engine    │
│  (Chỉ vẽ SVG / Render)  │    (Zero-copy / Streaming)  │   (.NET / Native AOT)   │
└─────────────────────────┘                             └────────────┬────────────┘
                                                                     │ In-process native binding
                                                                     ▼
                                                                libgit2.dll / .so
                                                        (Đọc trực tiếp file .git pack)
```

| Tiêu chí so sánh                  | Nhân TypeScript hiện tại (Node.js)              | Nhân F# đề xuất (.NET / Native AOT)                              |
| :-------------------------------- | :---------------------------------------------- | :--------------------------------------------------------------- |
| **Giao tiếp Git**                 | `simple-git` spawn tiến trình `git.exe` qua CLI | Tích hợp trực tiếp `libgit2` (C-binding) hoặc memory-mapped file |
| **Chi phí Process (Windows)**     | Rất cao (~50ms/lần spawn, hàng trăm tiến trình) | Bằng 0 (chạy in-process trong cùng engine F#)                    |
| **Xử lý Bộ nhớ & Chuỗi**          | V8 Engine cấp phát chuỗi động, GC giật lag      | `Span<byte>`, `Memory<byte>`, Zero-allocation parsing            |
| **Tính toán Đồ thị Topo**         | Đơn luồng trên JavaScript Webview UI thread     | Đa luồng song song trên CPU (`Array.Parallel`, SIMD)             |
| **Mô hình hóa Lỗi (Errors)**      | Exception dạng string (`Error: fatal: ...`)     | Kiểu dữ liệu hàm `Result<'T, GitError>` bắt buộc xử lý vét cạn   |
| **Thời gian load 50,000 commits** | ~8 - 15 giây (kèm giật khung hình)              | **< 200 - 400 milliseconds**                                     |

---

## 3. Mục lục Tài liệu trong Thư mục `core_git/`

1. **[01. Phân tích Các Điểm Nghẽn Hiệu Năng trong TypeScript](01_TypeScript_Performance_Bottlenecks.md)**:
   - Chi tiết về chi phí spawn tiến trình trên Windows, áp lực cấp phát chuỗi V8, tắc nghẽn serialization IPC và tính toán layout trên UI thread.
2. **[02. Phân loại & Bảng Tổng hợp Lỗi Thao tác Git](02_Git_Operation_Errors_Taxonomy.md)**:
   - Danh mục đầy đủ các lỗi thực tế khi tương tác với Git: khóa file (`index.lock`), trạng thái trung gian (`REBASE_HEAD`, `MERGE_HEAD`), shallow clone, conflict, encoding tiếng Việt / Unicode, v.v.
3. **[03. Thiết kế Kiến trúc Nhân Core Git bằng F#](03_FSharp_Core_Architecture_Design.md)**:
   - Bản vẽ kiến trúc chi tiết bằng F#: Thiết kế kiểu dữ liệu Domain-Driven Design, tích hợp `libgit2`, thuật toán tính lane song song, giao thức IPC siêu tốc và lộ trình tích hợp vào Extension.
