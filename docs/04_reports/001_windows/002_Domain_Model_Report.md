# Báo Cáo Tầng Miền Nghiệp Vụ & Bảng Lỗi (Nhóm Việc 2)

> **Mã báo cáo**: 002_Domain_Model_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 2 — Xây Dựng Tầng Miền Nghiệp Vụ & Mô Hình Hóa Lỗi
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [02_Domain_Model_And_Error_Taxonomy.md](../../02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md)

---

## 1. Mục Tiêu & Phạm Vi

Báo cáo này ghi nhận kết quả xây dựng tầng miền nghiệp vụ thuần túy (Pure Domain) bằng F#, bao gồm:

- Mô hình hóa các thực thể cốt lõi của Git (`GitHash`, `Author`, `CommitNode`, `GitRef`).
- Mô hình hóa các trạng thái biến động dở dang của kho mã nguồn (`InFlightState`).
- Xây dựng bảng phân loại lỗi hệ thống vét cạn (`GitError`) theo nguyên tắc `Result`.
- Dựng dự án kiểm thử đơn vị chuẩn hóa (xUnit) phủ toàn bộ tầng Domain.

---

## 2. Cấu Trúc Mã Nguồn

Toàn bộ tầng Domain nằm trong `src/core-engine/Domain/`, tách theo trách nhiệm:

| File                      | Nội dung                                                                        |
| :------------------------ | :------------------------------------------------------------------------------ |
| `Domain/Domain.fs`        | Định danh sản phẩm & phiên bản (`Version`)                                      |
| `Domain/CoreEntities.fs`  | `GitHash`, `Author`, `CommitNode`, `GitRef`                                     |
| `Domain/InFlightState.fs` | `InFlightState` + `MergeState`, `RebaseState`, `CherryPickState`, `BisectState` |
| `Domain/GitError.fs`      | `GitError` (9 trường hợp) + `GitError.describe`                                 |

Thứ tự biên dịch F# tuân theo chiều phụ thuộc: `Domain.fs → CoreEntities.fs → InFlightState.fs → GitError.fs`.

---

## 3. Các Thực Thể Cốt Lõi (Core Entities)

### 3.1. GitHash

- Kiểu **struct DU** (`[<Struct; RequireQualifiedAccess>]`) bất biến, hai trường hợp: `Sha1 of string` (40 hex) và `Sha256 of string` (64 hex).
- `GitHash.tryParse : string -> GitHash option`: kiểm tra độ dài + ký tự hex hợp lệ, trả về `None` thay vì ném ngoại lệ.
- `GitHash.abbrev`: sinh chuỗi viết tắt 7 ký tự phục vụ hiển thị.
- `GitHash.length` / `GitHash.toString`: hỗ trợ tra cứu và hiển thị đầy đủ.

### 3.2. Author & Committer

- Dùng chung kiểu `Author` với 4 trường: `Name`, `Email`, `Timestamp` (Unix giây `int64`), `TimezoneOffsetMinutes` (phút).
- Dùng `int64` cho thời gian thay vì `DateTime` nhằm tránh phụ thuộc globalization (dự án đã bật `InvariantGlobalization`).

### 3.3. CommitNode

- `Hash: GitHash`, `Parents: GitHash list` (mô hình đủ 0/1/2/3+ commit cha), `Author`, `Committer`, `Subject`, `Body`, `Refs: GitRef list`.

### 3.4. GitRef

Phân loại 6 nhóm tham chiếu: `LocalBranch` (kèm cờ checkout), `RemoteBranch`, `ReleaseTag`, `PrereleaseTag`, `PlainTag`, `Stash`.

---

## 4. Trạng Thái Dở Dang (In-Flight States)

`InFlightState` gồm 5 trường hợp: `Clean`, `Merging`, `Rebasing`, `CherryPicking`, `Bisecting`, mỗi trường hợp mang đầy đủ dữ liệu ngữ cảnh đặc tả trong Mục 2 của tài liệu thiết kế.

---

## 5. Bảng Phân Loại Lỗi (Error Taxonomy)

`GitError` là Discriminated Union gồm **9 trường hợp**:

| Trường hợp             | Dữ liệu ngữ cảnh                              |
| :--------------------- | :-------------------------------------------- |
| `RepositoryNotFound`   | đường dẫn thư mục                             |
| `IndexLockConflict`    | tên file khóa, tuổi khóa (giây), PID giữ khóa |
| `RefLockConflict`      | tên nhánh bị khóa                             |
| `BranchAlreadyExists`  | tên nhánh trùng                               |
| `BranchNotMerged`      | tên nhánh, số commit chưa merge               |
| `CheckoutConflict`     | danh sách đường dẫn xung đột                  |
| `ShallowCloneBoundary` | mã băm commit cha bị thiếu                    |
| `CorruptGitObject`     | mã băm đối tượng, thông báo kỹ thuật          |
| `NativeLibraryError`   | mã lỗi native, mô tả                          |

Kèm hàm `GitError.describe : GitError -> string` sinh chuỗi mô tả cho giao diện và nhật ký. Toàn bộ hàm nghiệp vụ trả về `Result<'T, GitError>` (kiểu `Result` chuẩn F#), không ném ngoại lệ.

---

## 6. Kiểm Thử Đơn Vị (xUnit)

Dự án test đặt tại `src/core-engine/tests/CoreEngine.Tests/`, gắn vào solution `src/core-engine/f-gitgraph-core.sln`.

| Bộ test              | Số case | Phạm vi                                                          |
| :------------------- | ------: | :--------------------------------------------------------------- |
| `GitHashTests`       |       6 | parse SHA-1/SHA-256, từ chối độ dài/ký tự sai, abbrev, roundtrip |
| `CommitNodeTests`    |       5 | số commit cha (0/1/2), cờ checkout, phân loại tag                |
| `InFlightStateTests` |       4 | merging, rebasing, bisecting, clean                              |
| `GitErrorTests`      |       4 | mô tả lỗi repository/branch/lock/native                          |
| **Tổng**             |  **19** |                                                                  |

Kết quả chạy `dotnet test src/core-engine/f-gitgraph-core.sln`:

```text
Passed!  - Failed: 0, Passed: 19, Skipped: 0, Total: 19
```

---

## 7. Kết Luận

| Tiêu chí                          |  Trạng thái   |
| :-------------------------------- | :-----------: |
| Mô hình hóa thực thể cốt lõi      |    ✅ Đạt     |
| Mô hình hóa trạng thái in-flight  |    ✅ Đạt     |
| Bảng lỗi vét cạn (9 trường hợp)   |    ✅ Đạt     |
| Nguyên tắc `Result` thay ngoại lệ |    ✅ Đạt     |
| Kiểm thử đơn vị chuẩn hóa         | ✅ 19/19 pass |
| Biên dịch Native AOT              | ✅ thành công |

Tầng Domain thuần túy, không phụ thuộc thư viện ngoài, đóng vai trò "ngôn ngữ chung" cho các tầng Storage, Graph và Transport ở các nhóm việc tiếp theo.
