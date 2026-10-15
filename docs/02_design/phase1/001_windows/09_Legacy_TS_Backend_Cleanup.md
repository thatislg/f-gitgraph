# 09. Kế Hoạch Dọn Dẹp Mã Nguồn Backend TypeScript Cũ & Tinh Giản Tài Nguyên (Legacy TS Backend Cleanup & Resource Pruning)

Tài liệu này đặc tả chi tiết kế hoạch loại bỏ toàn bộ các module logic truy vấn Git cũ bằng TypeScript, tách biệt hệ thống kiểu dữ liệu độc lập, tinh giản cấu trúc thư mục và dọn dẹp các tài nguyên không dùng (Nix, gói ngôn ngữ tiếng Trung), củng cố vị thế nhân F# Native AOT làm trái tim tính toán duy nhất của **F-GitGraph**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào kiến trúc phân rã, lộ trình di chuyển kiểu dữ liệu, tiêu chí dọn dẹp và bảo đảm an toàn hệ thống, không sử dụng mã nguồn mẫu.

---

## 1. Bối Cảnh & Mục Tiêu Kỹ Thuật

### 1.1. Bối Cảnh Lịch Sử & Hiện Trạng

- **Trước đây**: Extension kế thừa từ Git Graph nguyên bản, toàn bộ tác vụ đọc Git log, phân tích cú pháp bằng Regex thô, tính toán topological sort, phân làn đồ thị đều được viết bằng TypeScript đơn luồng trong `src/backend/queries/` và `src/old-extension/`. Cơ chế này gây nghẽn UI nghiêm trọng trên kho mã nguồn lớn và tạo ra độ trễ nặng nề trên Windows.
- **Hiện tại**: Nhóm Việc 1 đến Nhóm Việc 7 đã xây dựng thành công nhân **F# Native AOT** (`f-gitgraph-core.exe`), đọc trực tiếp qua Memory-Mapped `commit-graph` và LibGit2 C-binding in-process, tính toán phân làn đa luồng CPU và truyền phát dữ liệu qua daemon Stdio RPC MessagePack siêu tốc.
- **Tồn tại kỹ thuật**:
  - Mã nguồn TypeScript cũ trong `src/backend/queries/` và một phần `src/old-extension/` đã trở thành dead code hoặc mã thừa thãi.
  - Tầng giao diện Webview Preact vẫn còn phụ thuộc vào một số định nghĩa kiểu (interface types) nằm rải rác bên trong thư mục `src/backend/types/`.
  - Dự án còn chứa các tệp cấu hình môi trường Nix (`flake.nix`, `flake.lock`) và các tệp bản địa hóa tiếng Trung (`package.nls.zh-cn.json`, `package.nls.zh-tw.json`, `l10n/bundle.l10n.zh-cn.json`, `l10n/bundle.l10n.zh-tw.json`) không nằm trong định hướng phát triển của sản phẩm.

### 1.2. Mục Tiêu Trọng Tâm của Nhóm Việc 9

1. **Loại bỏ tài nguyên ngoài phạm vi**: Xóa bỏ triệt để cấu hình Nix và các tệp localization tiếng Trung, tập trung vào bản tiếng Anh chuẩn quốc tế.
2. **Cách ly & Chuẩn hóa Hệ thống Kiểu Dữ Liệu**: Di chuyển toàn bộ các interface/type chia sẻ giữa Webview và Extension sang thư mục `src/types/` thuần túy, giải phóng hoàn toàn sự phụ thuộc vào `src/backend/types/`.
3. **Thanh lý Dead Code Backend TypeScript**: Loại bỏ các module truy vấn Git cũ (`src/backend/queries/loadCommits.ts`, `commitDetails.ts`, v.v.), hợp nhất các dịch vụ tiện ích còn cần (Avatar Manager, Diff Document Provider) sang tầng `src/extension/` hiện đại.
4. **Bảo đảm Không Suy Thoái (Zero-Regression)**: Toàn bộ quá trình dọn dẹp phải vượt qua 100% các bài kiểm thử unit test, kiểm tra kiểu tĩnh (typecheck) và build đóng gói mà không phát sinh bất kỳ lỗi biên dịch nào.

---

## 2. Kế Hoạch Chi Tiết Từng Hạng Mục Dọn Dẹp

### 2.1. Hạng Mục 1: Tinh Giản Tài Nguyên Ngoài Phạm Vi (Nix & Localization Tiếng Trung)

- **Tài nguyên Nix**:
  - Xóa bỏ `flake.nix` và `flake.lock`.
  - Lý do: F-GitGraph ưu tiên Windows Native AOT trước mắt, sau đó mở rộng sang Linux/macOS qua CI/CD chuẩn đa nền tảng, không duy trì packaging Nix chuyên biệt để tránh gánh nặng bảo trì.
- **Tài nguyên Tiếng Trung**:
  - Xóa bỏ `package.nls.zh-cn.json` và `package.nls.zh-tw.json`.
  - Xóa bỏ `l10n/bundle.l10n.zh-cn.json` và `l10n/bundle.l10n.zh-tw.json`.
  - Lý do: Định hướng sản phẩm tập trung giao diện tiếng Anh chuẩn mực, tránh việc duy trì các bản dịch máy không được kiểm duyệt gây sai lệch thuật ngữ kỹ thuật.

### 2.2. Hạng Mục 2: Di Chuyển & Chuẩn Hóa Kiểu Dữ Liệu (Domain Types Migration)

- **Hiện trạng phụ thuộc**:
  - Giao diện Webview và tầng Extension hiện import các kiểu như `GitCommitNode`, `GitRef`, `GitFileChange`, `GitCommitDetails`, `GitResetMode`, `ActionRequest`, `ActionResponse` từ `@/backend/types`.
- **Giải pháp kiến trúc**:
  - Tái cấu trúc thư mục `src/types/`:
    - `src/types/git.ts`: Định nghĩa các cấu trúc dữ liệu Git cốt lõi (Commit, Ref, FileChange, CommitDetails).
    - `src/types/actions.ts`: Định nghĩa các cấu trúc yêu cầu và phản hồi cho các hành động Git (Branch, Tag, Commit, Merge, Reset).
  - Cập nhật toàn bộ các câu lệnh import trong `src/webview/` và `src/extension/` sang `@/types` tương ứng.
  - Sau khi di chuyển đầy đủ, tiến hành giải phóng thư mục `src/backend/types/`.

### 2.3. Hạng Mục 3: Thanh Lý Backend TypeScript Cũ & Chuyển Giao Dịch Vụ

- **Thanh lý Tầng Truy Vấn Cũ (`src/backend/queries/`)**:
  - Xóa bỏ các tệp thực thi dòng lệnh Git regex cũ: `loadCommits.ts`, `loadBranches.ts`, `commitDetails.ts`, `repoSearch.ts`.
  - Toàn bộ việc đọc và dựng đồ thị đã do nhân F# Native AOT đảm nhiệm; việc quét kho mã nguồn trong workspace đã có `src/extension/handlers/scan-repo.ts` hiện đại.
- **Dọn dẹp & Tinh gọn Khung Extension Cũ (`src/old-extension/`)**:
  - Rà soát các thành phần:
    - `initExtension.ts`, `main.ts`, `webviewHtml.ts`, `webviewPanel.ts`: Các tệp này là tàn dư từ phiên bản trước, đã được viết lại hoàn toàn trong `src/extension/view-command.ts`, `src/extension/html.ts`, `src/main.ts`.
    - `avatarManager.ts`, `diffDocProvider.ts`: Chuyển giao trực tiếp vào thư mục `src/extension/services/` hoặc tích hợp vào hệ thống dịch vụ mới.
  - Xóa bỏ thư mục `src/old-extension/` sau khi hoàn tất chuyển giao.
- **Tập trung Tầng Thao Tác Ghi An Toàn (`GitCliMutator`)**:
  - Giữ vững nguyên tắc an toàn dữ liệu: `GitCliMutator` tiếp tục ủy thác 100% lệnh ghi Git qua `git.exe` để bảo toàn chữ ký số và Git Credential Manager, nhưng được tổ chức ngăn nắp trong `src/extension/mutator/`.

### 2.4. Hạng Mục 4: Kiểm Thử Nghiệm Thu & Đóng Gói

- Chạy toàn bộ bộ test tự động:
  - Kiểm tra kiểu tĩnh: `pnpm run typecheck`
  - Linting: `pnpm run lint` (oxlint)
  - Unit tests: `pnpm run test` (vitest)
  - F# tests: `dotnet test src/core-engine/f-gitgraph-core.sln`
- Đóng gói thử nghiệm cục bộ: `pnpm run package` và `scripts/build-native-win.ps1` để đảm bảo gói VSIX sạch sẽ, không thừa thãi tệp dead code và có dung lượng tối ưu nhất.

---

## 3. Tiêu Chuẩn Nghiệm Thu Nhóm Việc 9

1. **Không còn tệp thừa**: Toàn bộ tệp Nix, NLS tiếng Trung và thư mục `src/backend/queries/` được xóa sạch khỏi kho mã nguồn.
2. **Phân tầng kiểu dữ liệu rõ ràng**: Thư mục `src/types/` là nguồn chân lý duy nhất (Single Source of Truth) cho các định nghĩa dữ liệu giữa Webview, Extension và F# Core.
3. **Zero Regression**: Toàn bộ tính năng đồ thị, quét kho, avatar và các thao tác Git hoạt động trơn tru không lỗi.
