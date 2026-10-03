# Báo Cáo Dọn Dẹp Backend TypeScript Cũ & Tinh Giản Tài Nguyên (Nhóm Việc 9)

> **Mã báo cáo**: 009_Legacy_TS_Backend_Cleanup_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 9 — Dọn Dẹp Mã Nguồn Backend TypeScript Cũ & Tinh Giản Tài Nguyên Thừa
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [09_Legacy_TS_Backend_Cleanup.md](../../02_design/001_windows/09_Legacy_TS_Backend_Cleanup.md)

---

## 1. Mục Tiêu & Phạm Vi

Tinh giản hệ thống: di chuyển hệ thống kiểu dữ liệu về một nguồn chân lý duy nhất (`src/types/`), loại bỏ dead code truy vấn Git cũ bằng TypeScript và các tài nguyên ngoài phạm vi (Nix, localization tiếng Trung), đồng thời bảo đảm zero-regression.

---

## 2. Hạng Mục 1: Tinh Giản Tài Nguyên Ngoài Phạm Vi (Nhiệm vụ 9.1)

Xóa bỏ triệt để:

| Tài nguyên đã xóa                      | Lý do                                        |
| :------------------------------------- | :------------------------------------------- |
| `flake.nix`, `flake.lock`              | Không duy trì packaging Nix chuyên biệt      |
| `package.nls.zh-cn.json` / `.zh-tw.json` | Giao diện tập trung tiếng Anh chuẩn quốc tế |
| `l10n/bundle.l10n.zh-cn.json` / `.zh-tw.json` | Loại bỏ bản dịch máy không kiểm duyệt     |

Toàn bộ quy trình biên dịch kiểu tĩnh và đóng gói vẫn 0 lỗi sau khi xóa.

---

## 3. Hạng Mục 2: Di Chuyển Hệ Thống Kiểu Dữ Liệu (Nhiệm vụ 9.2)

Tái cấu trúc `src/types/` thành nguồn chân lý duy nhất (Single Source of Truth):

| File mới          | Nội dung                                                            |
| :---------------- | :------------------------------------------------------------------ |
| `src/types/git.ts`  | `GitCommitNode`, `GitRef`, `GitFileChange`, `GitCommitDetails`, `GitResetMode`, `DateType`, `GitFileChangeType`... |
| `src/types/actions.ts` | `ActionRequest`, `ActionResponse`, `ActionPayload`, `GitCommandStatus` |
| `src/types/queries.ts` | `QueryRequest`, `QueryResponse`, `QueryResult` (giao thức message legacy) |
| `src/types/repo.ts`    | `GitRepo`, `RepoChange`, `RepoUpdate` (đổi tên từ `git.types.ts`) |

- Cập nhật toàn bộ **35** câu lệnh import trong `src/`, `tests/`, `tests-ext/` từ `@/backend/types` → `@/types`.
- Xóa hoàn toàn thư mục `src/backend/types/`; tầng giao diện không còn phụ thuộc vào nó.

---

## 4. Hạng Mục 3: Thanh Lý Dead Code & Chuyển Giao Dịch Vụ (Nhiệm vụ 9.3)

### 4.1. Xóa bỏ khung kích hoạt cũ (`src/old-extension/` — dead code)

| File đã xóa           | Lý do                                                              |
| :-------------------- | :----------------------------------------------------------------- |
| `main.ts`, `initExtension.ts` | Đường dẫn kích hoạt cũ, đã thay bằng `src/main.ts` + `view-command.ts` |
| `watchForRepos.ts`, `maxDepthTracker.ts`, `statusBarItem.ts` | Thành phần watcher/statusbar cũ |
| `webviewHtml.ts`, `webviewPanel.ts` | Đã thay bằng `src/extension/html.ts` |
| `constant/const.ts`   | `EXTENSION_NAME` đã có tại `src/extension/constants.ts`            |

### 4.2. Xóa bỏ truy vấn repo cũ

| File đã xóa                          | Ghi chú                                      |
| :----------------------------------- | :------------------------------------------- |
| `src/backend/queries/repoSearch.ts`  | Quét repo cũ, đã có `handlers/scan-repo.ts`  |
| `src/backend/utils/repoSearch.ts`    | Hàm đệ quy `searchDirectoryForRepos`         |
| `src/backend/utils/nonce.ts`         | `crypto.randomBytes` đã dùng trực tiếp       |

### 4.3. Chuyển giao dịch vụ tiện ích

| Từ                              | Đến                                        |
| :------------------------------ | :----------------------------------------- |
| `src/backend/gitCliMutator.ts`  | `src/extension/mutator/gitCliMutator.ts`   |
| `src/old-extension/avatarManager.ts` | `src/extension/services/avatarManager.ts` |
| `src/old-extension/diffDocProvider.ts` | `src/extension/services/diffDocProvider.ts` |

---

## 5. Kiểm Định Không Suy Thoái (Nhiệm vụ 9.4)

| Bộ kiểm thử / công cụ                | Kết quả            |
| :----------------------------------- | :----------------: |
| `pnpm run typecheck` (5 project TS)  | ✅ 0 lỗi           |
| `pnpm run lint` (oxlint, 160 rules)  | ✅ 0 lỗi           |
| `vitest` backend + extension + webview| ✅ **174/174 pass** |
| `dotnet test f-gitgraph-core.sln`    | ✅ **56/56 pass**  |
| `pnpm run package` (esbuild production)| ✅ Đạt             |

> Ghi chú: hai file `repoSearch.test.ts` (backend/utils và backend/queries) thất bại sẵn từ trước — nay được xóa cùng với dead code tương ứng, bộ test hiện 100% xanh.

---

## 6. Hạn Chế & Ghi Chú (Quan Trọng)

Kế hoạch thiết kế Nhóm Việc 9 kỳ vọng xóa toàn bộ tầng truy vấn TS cũ và thư mục `src/old-extension/`. Tuy nhiên, ở trạng thái hiện tại:

- **`src/backend/queries/loadCommits.ts`, `loadBranches.ts`, `commitDetails.ts` vẫn đang được dùng** bởi `src/old-extension/messageHandler.ts` → `src/extension/legacy.ts` → `view-command.ts` → `src/main.ts` (điểm vào thật). Sidecar F# hiện chỉ cung cấp hình học đồ thị (`graph.load`/`graph.window`), **chưa** cung cấp metadata commit / danh sách nhánh / chi tiết commit — nên việc xóa ba module này sẽ làm hỏng extension.
- **`src/old-extension/` chưa thể xóa hoàn toàn**: các dịch vụ `config.ts`, `extensionState.ts`, `messageHandler.ts`, `repoManager.ts`, `webviewBridge.ts`, `l10n/webviewL10n.ts`, `utils/logger.ts` vẫn hoạt động (được `legacy.ts` sử dụng).

**Bước tiếp theo**: hoàn tất di trú Webview sang nguồn dữ liệu RPC (`graph.load` mở rộng trả metadata, `commitDetails`/`loadBranches` qua RPC), sau đó mới thanh lý triệt để các module truy vấn TS và thư mục `old-extension` còn lại.

---

## 7. Kết Luận

| Tiêu chí                                            | Trạng thái |
| :-------------------------------------------------- | :--------: |
| Xóa Nix + localization tiếng Trung                 |   ✅ Đạt   |
| `src/types/` là nguồn chân lý duy nhất             |   ✅ Đạt   |
| Loại bỏ dead code (khung kích hoạt cũ, repoSearch) |   ✅ Đạt   |
| Chuyển giao `GitCliMutator` / avatar / diffDoc     |   ✅ Đạt   |
| Zero-regression (typecheck/lint/test/build)        |   ✅ Đạt   |
| Xóa triệt để `old-extension` + truy vấn TS còn lại | ⏳ Phụ thuộc di trú RPC |
