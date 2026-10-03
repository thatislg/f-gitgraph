# Báo Cáo Giao Thức Giao Tiếp Nội Bộ (Nhóm Việc 5)

> **Mã báo cáo**: 005_IPC_Daemon_Streaming_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 5 — Giao Thức Giao Tiếp Nội Bộ (IPC Daemon & Streaming)
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [05_IPC_Stdio_Streaming_Protocol.md](../../02_design/001_windows/05_IPC_Stdio_Streaming_Protocol.md)

---

## 1. Mục Tiêu & Phạm Vi

Báo cáo này ghi nhận kết quả xây dựng giao thức giao tiếp nhị phân hai chiều giữa **VS Code Extension Host (Node.js)** và **nhân F# Native AOT (`neo-git-core.exe`)** qua đường ống xuất nhập chuẩn (Stdio RPC), áp dụng định dạng nhị phân MessagePack và cơ chế phân trang cửa sổ ảo. Gồm ba hợp phần:

1. Quản lý vòng đời tiến trình F# sidecar (TypeScript).
2. Giao thức truyền thông nhị phân qua Stdio RPC (F# + TypeScript).
3. Cơ chế phân trang cửa sổ ảo (Virtual Scrolling).

---

## 2. Cấu Trúc Mã Nguồn

| Bên | File | Nội dung |
| :--- | :--- | :--- |
| F# | `src/core-engine/Transport/Transport.fs` | MessagePack codec, khung gói tin, opcode, daemon loop |
| F# | `src/core-engine/Program.fs` | Chế độ `serve` (daemon) |
| TS | `src/extension/sidecar/msgpack.ts` | MessagePack codec (đồng bộ byte với F#) |
| TS | `src/extension/sidecar/protocol.ts` | Opcode, khung gói tin, lược đồ thông điệp |
| TS | `src/extension/sidecar/sidecar-manager.ts` | Quản lý vòng đời + máy khách RPC |

Đồng thời mở rộng `Geometry.Layout` (Nhóm Việc 4) thêm trường `Edges` để daemon lọc đường nối theo cửa sổ hiển thị.

---

## 3. Quản Lý Vòng Đời Sidecar (Nhiệm vụ 5.1)

- **Khởi động**: `SidecarManager.start()` khởi chạy `neo-git-core.exe serve`, kết nối hai đường ống stdin/stdout ở chế độ nhị phân, chờ tín hiệu **Ready** đầu tiên (opcode `0x00`) trong vòng 5 giây.
- **Giám sát nhịp tim**: định kỳ 10 giây gửi Heartbeat Ping (`0x06`), engine đáp Heartbeat Pong (`0x07`).
- **Tự phục hồi**: bắt sự kiện thoát tiến trình (`exit`), ghi nhật ký và khởi động lại sidecar, tái lập handshake Ready.
- **Thu hồi tài nguyên**: `dispose()` hủy tiến trình con, dọn bộ đếm thời gian và từ chối mọi yêu cầu đang chờ — không để lại tiến trình mồ côi.

---

## 4. Giao Thức Nhị Phân Stdio RPC (Nhiệm vụ 5.2)

- **Khung gói tin** (framed binary): `[độ dài u32 LE][opcode u8][seq u32 LE][payload MessagePack]`, độ dài bao trùm tiêu đề lẫn payload để bên nhận gom đủ dữ liệu trước khi giải mã, tránh lỗi phân mảnh.
- **MessagePack**: tự triển khai tập con (nil, bool, int, float64, string, array, map) **không phụ thuộc thư viện**, AOT-safe ở F# và đồng bộ byte-for-byte với TypeScript.
- **Bảng opcode** (mở rộng `0x00 Ready` so với thiết kế để hiện thực tín hiệu sẵn sàng):

| Mã | Thao tác | Hướng |
| :---: | :--- | :---: |
| `0x00` | Ready | F# → TS |
| `0x01` | Initialize Repo | TS → F# |
| `0x02` | Init Success | F# → TS |
| `0x03` | Query Range | TS → F# |
| `0x04` | Range Data | F# → TS |
| `0x05` | Invalidate Cache | TS → F# |
| `0x06` | Heartbeat Ping | TS → F# |
| `0x07` | Heartbeat Pong | F# → TS |
| `0xFF` | Error | F# → TS |

---

## 5. Phân Trang Cửa Sổ Ảo (Nhiệm vụ 5.3)

- **Truy vấn khoảng dòng**: Webview gửi `Query Range { from, to }`; engine trả `Range Data { nodes, paths }` chỉ cho phạm vi được yêu cầu kèm vùng đệm an toàn.
- **Lọc đường nối theo cửa sổ**: một đường nối được trả về khi cắt cửa sổ `[from, to]` (con nằm trên/ngang đáy và cha nằm dưới/ngang đỉnh), nhờ trường `Edges` đi kèm `Paths`.
- **Bộ nhớ đệm tính sẵn**: daemon nạp đồ thị + bố cục một lần, mỗi lần cuộn chỉ trả mảng hình học tương ứng — không tính lại topo hay phân làn.

---

## 6. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| F# `TransportTests` (MessagePack, khung gói tin, lược đồ, daemon) | 16/16 pass |
| TS `msgpack.test.ts` + `protocol.test.ts` | 17/17 pass |
| Tổng F# (Domain + Storage + Graph + Transport) | **50/50 pass** |
| Typecheck + lint (oxlint) + format (oxfmt) | ✅ Đạt |
| Biên dịch Native AOT | ✅ Đạt |
| Smoke test daemon trên bản AOT (Ready + Pong) | ✅ Đạt |

Vector byte kiểm thử chia sẻ giữa hai bên (fixint, uint16/32, fixstr, float64, khung ping) bảo đảm tính tương thích nhị phân F# ↔ TypeScript.

---

## 7. Hạn Chế & Ghi Chú

- **Chưa ghép nối vào Webview**: `SidecarManager` là module hoàn chỉnh, độc lập; việc gắn vào luồng dữ liệu Webview Preact thuộc Nhóm Việc 6 (Ghép nối Webview).
- **Metadata commit**: `Range Data` hiện chỉ trả hình học (tọa độ nút + đường nối) và danh sách mã băm theo thứ tự; tiêu đề/tác giả/tham chiếu sẽ bổ sung ở Nhóm Việc 6.
- **MessagePack subset**: hỗ trợ số nguyên đến int32/uint32 (đủ cho số lượng commit, làn, màu); int64/uint64 chưa cần thiết.
- **Đo đạc định lượng** (độ trễ IPC < 5ms, cold-load < 300ms) thuộc Nhóm Việc 7.

---

## 8. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Quản lý vòng đời sidecar + heartbeat + tự phục hồi | ✅ Đạt |
| Giao thức nhị phân Stdio RPC + MessagePack | ✅ Đạt |
| Phân trang cửa sổ ảo | ✅ Đạt |
| Kiểm thử F# + TS | ✅ 50/50 + 17/17 |
| Biên dịch Native AOT | ✅ Đạt |
