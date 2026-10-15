# 02. Phân Loại & Bảng Tổng Hợp Lỗi Thao Tác Git (Error Taxonomy)

Khi xây dựng một công cụ hiển thị và thao tác Git đồ họa, các lỗi phát sinh không chỉ đơn thuần là lỗi cú pháp mà là các trạng thái nội tại phức tạp của hệ thống Git (Git Internal States) và hệ thống tập tin (File System).

Tài liệu này tổng hợp toàn bộ các nhóm lỗi thao tác Git thường gặp nhất, làm tiền đề để mô hình hóa kiểu dữ liệu lỗi (Domain Error Model) chặt chẽ trong nhân F#.

---

## 1. Nhóm Lỗi Xung Đột Hệ Thống Tập Tin & Khóa (File Locks & Concurrency)

| Mã lỗi định danh         | Thông báo thực tế từ Git CLI                                                        | Nguyên nhân gốc rễ                                                                                                             | Hướng xử lý bằng F# Core Engine                                                                                                                                                 |
| :----------------------- | :---------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`IndexLockExists`**    | `fatal: Unable to create '.git/index.lock': File exists.`                           | Một tiến trình Git khác (VS Code auto-fetch, Git CLI ngoài terminal, GitLens, background job) đang giữ file lock `index.lock`. | Kiểm tra timestamp của file lock. Nếu quá timeout (stale lock > 5s do tiến trình chết bất đắc kỳ tử), cung cấp tùy chọn xóa an toàn hoặc tự động retry với exponential backoff. |
| **`RefLockExists`**      | `fatal: cannot lock ref 'refs/heads/...': Unable to create '...lock': File exists.` | Đồng thời cập nhật hoặc tạo mới cùng một branch/tag trong khi một thao tác khác đang ghi.                                      | Mô hình hóa transaction trong F# bằng Actor Model (MailboxProcessor) để tuần tự hóa các thao tác ghi ref.                                                                       |
| **`FileInUseByProcess`** | `error: unable to unlink '...': Permission denied`                                  | Trên Windows, tiến trình Antivirus hoặc editor đang mở handle file khiến Git không thể checkout/revert/reset file đó.          | Bắt mã lỗi Win32 `ERROR_SHARING_VIOLATION` (0x20) để thông báo rõ ràng tên file đang bị khóa bởi tiến trình nào.                                                                |

---

## 2. Nhóm Lỗi Trạng Thái Repository Không Đồng Nhất (Repository In-Flight States)

Trong thực tế, người dùng thường mở đồ thị khi đang ở giữa một quá trình dở dang (Rebase, Merge, Cherry-pick). Hiện tại trong TypeScript, code thường giả định repository ở trạng thái bình thường (clean state).

| Mã lỗi định danh           | Dấu hiệu nhận biết trong thư mục `.git`                      | Mô tả tình huống & Nguy cơ                                                                                                 | Giải pháp trong F# Engine                                                                                               |
| :------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| **`MergeInProgress`**      | Tồn tại file `.git/MERGE_HEAD` và `.git/MERGE_MSG`           | Người dùng đang giải quyết conflict sau khi gõ `git merge`. Nếu thực hiện checkout/branch mới sẽ làm mất trạng thái merge. | Kiểm tra `MERGE_HEAD`. Hiển thị nhãn cảnh báo `[MERGING]` trên giao diện và chặn các thao tác checkout/reset nguy hiểm. |
| **`RebaseInProgress`**     | Tồn tại thư mục `.git/rebase-apply` hoặc `.git/rebase-merge` | Quá trình rebase đang tạm dừng tại một commit do conflict hoặc chỉnh sửa commit.                                           | Bóc tách commit đang rebase dở từ `rebase-merge/head-name` để hiển thị trực quan commit ảo trên đồ thị.                 |
| **`CherryPickInProgress`** | Tồn tại file `.git/CHERRY_PICK_HEAD`                         | Đang cherry-pick nhưng gặp conflict chưa commit.                                                                           | Cảnh báo trạng thái cherry-pick, cung cấp nút Continue / Abort trực tiếp.                                               |
| **`BisectInProgress`**     | Tồn tại file `.git/BISECT_LOG` hoặc `.git/BISECT_START`      | Đang trong phiên tìm bug bằng git bisect.                                                                                  | Đánh dấu các commit Good / Bad / Skip trực quan bằng màu riêng trên đồ thị F#.                                          |

---

## 3. Nhóm Lỗi Nhánh & Tham Chiếu (Branch & Ref Operation Errors)

| Thao tác                            | Lỗi thường gặp                 | Chi tiết lỗi                                                                                                                       | Cách bắt lỗi chính xác trong F#                                                                                                                                                                  |
| :---------------------------------- | :----------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Xóa Branch (`deleteBranch`)**     | `BranchNotFullyMerged`         | `error: The branch 'feature' is not fully merged.` Xảy ra khi xóa branch chưa được merge vào upstream.                             | Phân loại rõ giữa lệnh `git branch -d` và `git branch -D` (Force Delete). F# trả về `Result.Error (UnmergedBranch { CommitsAhead: n })` để UI hiển thị popup hỏi xác nhận ép xóa (Force Delete). |
| **Xóa Branch Đang Checkout**        | `CannotDeleteCheckedOutBranch` | `error: Cannot delete branch 'main' checked out at '...'`                                                                          | Kiểm tra trước khi xóa: nếu `branchName == currentHeadBranch` thì chặn ngay từ tầng Domain Logic, không cần tốn thời gian gọi Git.                                                               |
| **Đổi Tên Branch (`renameBranch`)** | `BranchAlreadyExists`          | `fatal: A branch named 'develop' already exists.`                                                                                  | Xác thực danh sách branch trong cache F# trước khi thực hiện rename.                                                                                                                             |
| **Checkout Nhánh**                  | `LocalChangesOverwritten`      | `error: Your local changes to the following files would be overwritten by checkout: ... Please commit your changes or stash them.` | Bóc tách danh sách file xung đột từ stdout và trả về mảng `ConflictedFiles: string list` cho UI để người dùng chọn Stash hoặc Discard.                                                           |

---

## 4. Nhóm Lỗi Cấu Trúc Đồ Thị & Repository Đặc Biệt (Graph & Topology Anomalies)

| Tình huống đặc biệt                                        | Hiện tượng trong TypeScript hiện tại                                                                                                                                                                                       | Cách khắc phục trong F# Core Engine                                                                                                                            |
| :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shallow Clone (`--depth n`)**                            | Lệnh `git log` chỉ lấy được các commit trong phạm vi depth. Commit cha cuối cùng không tồn tại hash trong bộ nhớ $\rightarrow$ Thuật toán `layout.ts` ném lỗi `Invalid graph vertex index` hoặc đứt đoạn nhánh bất thường. | Mô hình hóa commit cha dưới dạng kiểu `Parent = Known of Hash \| ShallowGraft of Hash`. Vẽ điểm ngắt đoạn (graft boundary) trực quan thay vì gây crash layout. |
| **Detached HEAD**                                          | `HEAD` trỏ trực tiếp vào một SHA commit thay vì một ref nhánh (`refs/heads/*`). Một số thao tác push/checkout branch ngầm hiểu bị thất bại.                                                                                | Định nghĩa `HeadTarget = BranchRef of string \| Detached of Hash`. Đồ thị tự động hiển thị huy hiệu `HEAD (detached at abc1234)`.                              |
| **Dangling Commits / Orphan Branches**                     | Commit gốc không có parent (Root commit thứ 2 do tạo repo bằng `--orphan`). Đồ thị hiện tại bị lỗi căn cột lane 0.                                                                                                         | Thuật toán đồ thị F# hỗ trợ đa gốc (Multi-root DAG Forest), phân phối lane song song chuẩn xác.                                                                |
| **Gắn Tag trên Commit đã bị xóa (Annotated Tag dangling)** | Ref tag trỏ tới một tag object mà commit gốc đã bị rebase/prune.                                                                                                                                                           | Dùng hàm `dereferenceTag` để kiểm tra tính toàn vẹn của commit đích trước khi hiển thị badge.                                                                  |

---

## 5. Nhóm Lỗi Hệ Thống Tệp Windows & Bảng Mã Ký Tự (Encoding & OS Specifics)

1. **Phân cách đường dẫn (Path Separator mismatch)**:
   - Trên Windows, Git CLI trả về đường dẫn dùng `/` (forward slash) trong khi Node.js path module dùng `\` (backslash).
   - Dẫn đến hàng loạt lỗi so khớp chuỗi sai lệch (như đã thấy trong các unit test `repoSearch.test.ts` ở các lần chạy trước).
   - Trong F#, chuẩn hóa đường dẫn ở tầng Domain: `type NormalizedPath = private NormalizedPath of string`.
2. **Encoding Tiếng Việt & Ký tự đặc biệt (UTF-8 vs UTF-16 vs CP1258)**:
   - Git commit message có thể chứa tiếng Việt có dấu, tiếng Nhật, tiếng Trung.
   - Khi chạy CLI trên Windows Command Prompt / PowerShell, nếu không đặt `core.quotepath = false` và `LC_ALL=C.UTF-8`, Git sẽ escape tên file tiếng Việt thành chuỗi bát phân: `"\341\272\243nh.png"`.
   - Node.js bóc tách chuỗi này rất dễ bị lỗi font hoặc hỏng ký tự.
   - Nhân F# đọc trực tiếp byte UTF-8 thô từ libgit2, giải mã sang chuỗi .NET UTF-16 chuẩn xác 100%.
3. **Phân biệt chữ hoa / chữ thường trên Windows (Case-Insensitive File System)**:
   - File hệ thống Windows là Case-Insensitive nhưng Case-Preserving.
   - Hai branch `Feature/Login` và `feature/login` trên Windows sẽ ghi đè lên cùng 1 file `.git/refs/heads/feature/login`.
   - Nhân F# sẽ chủ động phát hiện xung đột Case-Folding để cảnh báo người dùng trước khi gây hỏng file ref.
