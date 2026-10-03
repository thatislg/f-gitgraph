# Báo Cáo Ghép Nối Webview & Thực Thi Lệnh Ghi An Toàn (Nhóm Việc 6)

> **Mã báo cáo**: 006_Webview_Integration_Git_Mutator_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 6 — Ghép Nối Webview & Bảo Toàn Lệnh Ghi
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [06_Webview_Integration_And_Git_Mutator.md](../../02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md)

---

## 1. Mục Tiêu & Phạm Vi

Báo cáo này ghi nhận kết quả xây dựng ba hợp phần ghép nối giao diện và an toàn dữ liệu:

1. Cầu nối dữ liệu hình học từ engine F# vào tầng Webview (Dumb Renderer).
2. Module thực thi thao tác ghi an toàn qua Git CLI gốc (`GitCliMutator`).
3. Cơ chế phát hiện biến động và cập nhật vi sai.

---

## 2. Cấu Trúc Mã Nguồn

| File                                         | Nội dung                                                     |
| :------------------------------------------- | :----------------------------------------------------------- |
| `src/extension/sidecar/graph-merge.ts`       | Gộp hình học + metadata commit (hàm thuần, kiểm thử độc lập) |
| `src/extension/sidecar/graph-data-bridge.ts` | `GraphDataBridge` điều phối sidecar + metadata               |
| `src/backend/gitCliMutator.ts`               | `GitCliMutator` ủy thác lệnh ghi cho `git.exe`               |
| `src/extension/watchers/git-ref.watcher.ts`  | Theo dõi `.git/HEAD` + `.git/refs/**`                        |
| `src/extension/util/coalescer.ts`            | Cơ chế gom sự kiện (debounce)                                |

---

## 3. Cầu Nối Dữ Liệu Hình Học (Nhiệm vụ 6.1)

- **`mergeGraphWindow`**: gộp mảng hình học nút commit (tọa độ `x,y`, làn, màu, cờ merge/gốc) từ `Range Data` với metadata commit (tác giả, tiêu đề, refs) theo chỉ số dòng — tạo cấu trúc `GraphRow` sẵn sàng cho component vẽ trực tiếp, không cần chạy lại `computeGraphLayout`.
- **`GraphDataBridge`**: quản lý danh sách commit theo thứ tự hiển thị, cung cấp `initialize`/`invalidate`/`loadWindow(from,to)` — mỗi lần cuộn chỉ trả cửa sổ được yêu cầu kèm hình học đã tính sẵn từ engine F#.
- **Nguồn metadata**: được bơm vào qua `MetadataProvider` (tách rời) — tái sử dụng tầng metadata hiện có (`loadCommits`) hoặc bất kỳ nguồn nào.

---

## 4. Thực Thi Lệnh Ghi An Toàn (Nhiệm vụ 6.2)

- **Ranh giới an toàn tuyệt đối**: `GitCliMutator` ủy thác 100% thao tác ghi cho tiến trình `git.exe` (qua `spawn` trực tiếp, hỗ trợ `gitPath` tùy biến), giữ nguyên chữ ký số GPG/SSH, Git Credential Manager, git hooks, Git LFS và giải quyết xung đột.
- **Danh mục lệnh**: commit (kèm `-S`/`-a`), create/rename/delete branch (`-d` an toàn / `-D` ép xóa), checkout, merge (`--no-ff`), rebase (kèm `--continue`/`--abort`), cherry-pick, add tag (lightweight/annotated), push, pull (`--rebase`), fetch.
- **Kiểm soát an toàn**: tên nhánh/tag được kiểm tra qua `git check-ref-format` trước khi tạo/đổi tên; mỗi lệnh trả về `MutatorResult { ok, exitCode, stdout, stderr }` để giao diện phản ánh chính xác trạng thái.

---

## 5. Cập Nhật Vi Sai (Nhiệm vụ 6.3)

- **`watchGitRefs`**: thiết lập File Watcher cho `.git/HEAD` và `.git/refs/**`, phát hiện ngay chuyển nhánh, commit mới, tạo/xóa tag.
- **`createCoalescer`**: gom các sự kiện dồn dập (ví dụ rebase nhiều commit) thành một lần gọi `onChange` sau khoảng lặng **150ms** — điểm nối sẽ gọi `sidecar.invalidate()` để engine tính lại vi sai rồi stream lại cửa sổ đang hiển thị.

---

## 6. Kiểm Thử

| Hạng mục                                                 | Kết quả        |
| :------------------------------------------------------- | :------------- |
| `gitCliMutator.test.ts` (thao tác ghi trên kho Git thật) | 6/6 pass       |
| `graph-merge.test.ts` (gộp hình học + metadata)          | 2/2 pass       |
| `coalescer.test.ts` (debounce/coalescing, fake timers)   | 3/3 pass       |
| Tổng backend vitest (nhóm này)                           | **28/28 pass** |
| Typecheck + lint (oxlint) + format (oxfmt)               | ✅ Đạt         |

Ghi chú: hai file `repoSearch.test.ts` (backend/utils và backend/queries) thất bại sẵn từ trước, không liên quan Nhóm Việc 6.

---

## 7. Hạn Chế & Ghi Chú

- **6.1 chưa nối vào component Preact**: `GraphDataBridge` và `mergeGraphWindow` là cầu nối hoàn chỉnh, sẵn sàng; việc thay `computeGraphLayout` và nạp hình học vào `CommitGraph.tsx`/`HexagonNode.tsx` là bước di trú giao diện riêng, cần thực hiện cẩn trọng cùng bản di trú Webview tổng thể.
- **6.2 chưa gắn vào RPC**: `GitCliMutator` là module độc lập; việc định tuyến các lệnh ghi từ Webview qua RPC handler tới mutator sẽ hoàn tất khi ghép nối giao diện.
- **6.3 chưa nối `onChange` → `sidecar.invalidate()`**: điểm nối này nằm ở tầng điều phối extension (cùng lúc khởi tạo sidecar và watcher), phụ thuộc vòng đời Webview.

---

## 8. Kết Luận

| Tiêu chí                                | Trạng thái |
| :-------------------------------------- | :--------: |
| Cầu nối dữ liệu hình học (bridge)       |   ✅ Đạt   |
| Thực thi lệnh ghi an toàn qua `git.exe` |   ✅ Đạt   |
| File Watcher + debounce cập nhật vi sai |   ✅ Đạt   |
| Kiểm thử backend                        |  ✅ 28/28  |
| Typecheck + lint + format               |   ✅ Đạt   |
