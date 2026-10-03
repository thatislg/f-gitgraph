# Báo Cáo Tầng Đọc Dữ Liệu Git Tốc Độ Cao (Nhóm Việc 3)

> **Mã báo cáo**: 003_Fast_Git_Reader_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 3 — Tầng Đọc Dữ Liệu Git Tốc Độ Cao Trên Windows
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [03_Fast_Git_Storage_Reader.md](../../02_design/001_windows/03_Fast_Git_Storage_Reader.md)

---

## 1. Mục Tiêu & Phạm Vi

Báo cáo này ghi nhận kết quả xây dựng tầng đọc dữ liệu Git tốc độ cao, thay thế hoàn toàn việc gọi tiến trình `git.exe` (30–80ms/lần) bằng hai cơ chế nội tiến trình:

- Tích hợp thư viện C gốc **LibGit2** in-process qua P/Invoke.
- Đọc trực tiếp file nhị phân **`commit-graph`** bằng **Memory-Mapped Files**.
- Tối ưu bộ nhớ **Zero-Allocation** và giải mã **UTF-8 tiếng Việt** chuẩn xác.

---

## 2. Cấu Trúc Mã Nguồn

Toàn bộ tầng Storage nằm trong `src/core-engine/Storage/`:

| File             | Nội dung                                                 |
| :--------------- | :------------------------------------------------------- |
| `Utf8.fs`        | Giải mã UTF-8 (span) + hex encode/decode zero-allocation |
| `CommitGraph.fs` | Parser commit-graph bằng Memory-Mapped Files             |
| `LibGit2.fs`     | P/Invoke LibGit2 + wrapper `GitRepository`               |
| `Storage.fs`     | Điều phối `GitReader.readGraph` (fast path + fallback)   |

Thứ tự biên dịch: `Utf8.fs → CommitGraph.fs → LibGit2.fs → Storage.fs`.

---

## 3. Tích Hợp LibGit2 (Nhiệm vụ 3.1)

- **Thư viện native**: `git2-5853918.dll` từ gói NuGet `LibGit2Sharp.NativeBinaries` 2.0.324 (RID `win-x64`), được copy vào bản phát hành Native AOT.
- **Cơ chế gọi**: `[<DllImport>]` CallingConvention Cdecl, bao bọc các hàm cốt lõi:
  - Mở/đóng kho: `git_repository_open` / `git_repository_free`.
  - Bộ duyệt lịch sử: `git_revwalk_new` / `git_revwalk_push_head` / `git_revwalk_next` / `git_revwalk_free`.
  - Trích xuất commit: `git_commit_lookup` / `git_commit_parentcount` / `git_commit_parent_id` / `git_commit_author` / `git_commit_committer` / `git_commit_summary` / `git_commit_body`.
- **Kỹ thuật tránh vấn đề layout `git_oid` (SHA-1 vs SHA-256)**: sử dụng `git_oid_fromstr` / `git_oid_tostr` để chuyển đổi qua chuỗi hex thay vì đọc trực tiếp byte trong struct — tránh lỗi kích thước struct thay đổi giữa các phiên bản LibGit2.
- **Đọc `git_signature`**: dùng `Marshal.ReadIntPtr` / `ReadInt64` / `ReadInt32` (thân thiện AOT, không qua `PtrToStructure`).
- **Quản lý tài nguyên**: `GitRepository` triển khai `IDisposable`, tự giải phóng handle khi kết thúc.

---

## 4. Đọc Commit-Graph Bằng Memory-Mapped Files (Nhiệm vụ 3.2)

- **Cơ chế**: `MemoryMappedFile.CreateFromFile` + `CreateViewAccessor` + `SafeMemoryMappedViewHandle.AcquirePointer` để có con trỏ trực tiếp tới vùng nhớ đã ánh xạ, tạo `ReadOnlySpan<byte>` phủ toàn bộ file mà không sao chép trung gian.
- **Phân tích cấu trúc nhị phân** (version 1, SHA-1/SHA-256):
  - Header `CGPH` + version + hash version + số chunk.
  - Bảng mục lục chunk (12 byte/dòng: 4 byte id + 8 byte offset).
  - Chunk `OIDF` (fanout 256 phần tử) → số lượng commit N.
  - Chunk `OIDL` (N mã băm, 20/32 byte mỗi mã).
  - Chunk `CDAT` (N dòng, mỗi dòng `hashLen + 16` byte): tree OID + 2 vị trí cha + generation + commit time.
  - Chunk `EDGE` (danh sách cha mở rộng, cho octopus merge ≥ 3 cha).
- **Xử lý phả hệ**: 0 cha (root), 1 cha, 2 cha (merge), ≥ 3 cha (octopus — đọc ngược danh sách EDGE, cờ MSB báo kết thúc).
- **Cơ chế dự phòng**: `GitReader.readGraph` ưu tiên commit-graph; nếu không tồn tại/hỏng thì chuyển sang LibGit2 revwalk trong suốt.

---

## 5. Zero-Allocation & UTF-8 (Nhiệm vụ 3.3)

- `Utf8.decode` dùng `Encoding.UTF8.GetString(ReadOnlySpan<byte>)` — không qua mã hóa trung gian, khắc phục lỗi tiếng Việt bị mã hóa octal trên Git CLI Windows.
- `Utf8.hexEncode` dùng `Convert.ToHexStringLower`; `Utf8.hexDecode` dùng `Convert.FromHexString`.
- Toàn bộ phân tích commit-graph thao tác trực tiếp trên `ReadOnlySpan<byte>` của vùng nhớ ánh xạ, không cấp phát mảng trung gian.

---

## 6. Kiểm Thử

| Hạng mục                                                                        | Kết quả        |
| :------------------------------------------------------------------------------ | :------------- |
| `Utf8Tests` (hex, UTF-8 tiếng Việt, emoji)                                      | 4/4 pass       |
| `CommitGraphTests` (builder nhị phân tổng hợp: root/child/merge/corrupt/absent) | 4/4 pass       |
| Tổng bộ test (Domain + Storage)                                                 | **27/27 pass** |

### Kiểm thử tích hợp trên kho Git thật

Tạo kho với 5 commit (gồm 1 root, 1 merge, tiếng Việt có dấu, emoji), sinh `commit-graph` bằng `git commit-graph write`:

| Tiêu chí                            | Kết quả |
| :---------------------------------- | :-----: |
| Commit-graph đọc đúng 5 commit      |   ✅    |
| Nhận diện 1 root / 1 merge          |   ✅    |
| LibGit2 walk được 5 commit          |   ✅    |
| Tiêu đề tiếng Việt "Khởi tạo dự án" |   ✅    |
| Tên tác giả "An Nguyễn" (UTF-8)     |   ✅    |
| Emoji 🚀 hiển thị nguyên bản        |   ✅    |
| Merge commit có 2 cha               |   ✅    |

---

## 7. Hạn Chế & Ghi Chú

- **Generation number**: tệp commit-graph mới dùng chunk `GDA2` để lưu "corrected commit date"; parser hiện đọc generation từ chunk `CDAT` (định dạng v1). Topo (mã băm + quan hệ cha) đọc đầy đủ và chính xác; generation từ `GDA2` sẽ bổ sung ở Nhóm Việc 4 khi cần duyệt topo tối ưu.
- **Phạm vi revwalk**: `WalkHead()` hiện duyệt từ HEAD; duyệt đa nhánh (push toàn bộ refs) sẽ mở rộng khi ghép nối Webview (Nhóm Việc 6).
- **Đo đạc hiệu năng định lượng** (cold-load < 300ms trên 50.000 commit) thuộc Nhóm Việc 7.

---

## 8. Kết Luận

| Tiêu chí                                  |        Trạng thái        |
| :---------------------------------------- | :----------------------: |
| Tích hợp LibGit2 in-process               |          ✅ Đạt          |
| Đọc commit-graph bằng Memory-Mapped Files |          ✅ Đạt          |
| Cơ chế fallback LibGit2                   |          ✅ Đạt          |
| Zero-Allocation + UTF-8 tiếng Việt        |          ✅ Đạt          |
| Kiểm thử đơn vị + tích hợp                | ✅ 27/27 + tích hợp thật |
| Biên dịch Native AOT kèm `git2-*.dll`     |          ✅ Đạt          |
