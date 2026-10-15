# 03. Tích Hợp Đồng Bộ Working Tree & File Watcher (Integration Design)

Tài liệu này đặc tả cơ chế tích hợp đồng bộ hai chiều giữa trạng thái tệp trong Working Tree với Đồ thị commit DAG, cơ chế mở bảng Staging khi click vào dòng "Uncommitted changes", và kiến trúc bộ giám sát tệp (File Watcher) với cơ chế Debounce chống quá tải cho **Milestone 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit**.

---

## 1. Nguyên Tắc Bất Biến: Bảo Toàn 100% Cấu Trúc Đồ Thị & Hexagon Node

> [!IMPORTANT]
> **Cam kết không phá vỡ hình học (Zero Geometric Distortion)**:
> - Nút lục giác `HexagonNode.tsx`, avatar clip-path, tương tác phóng to 1.15× / 5.0× và các đường cong rẽ nhánh Bézier do F# Core Engine tính toán **hoàn toàn không bị sửa đổi**.
> - Khối Staging Area & Commit Composer được tích hợp dưới dạng **Bảng điều khiển Inspector nổi (Overlay Inspector Panel)** thay thế cho Commit Details khi chọn dòng thay đổi chưa commit, bảo toàn 100% chiều cao các dòng và tọa độ của đồ thị DAG.

---

## 2. Cơ Chế Kết Nối Dòng "Uncommitted Changes" Trên Đồ Thị

Trong cấu trúc hiện tại của [src/webview/components/commit/CommitTable.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/CommitTable.tsx):
- Dòng thay đổi chưa commit được định danh bởi hằng số `UNCOMMITTED_CHANGES = "*"` ([constants.ts](file:///d:/Kojin/neo-git-graph/src/webview/constants.ts)).
- Trước đây, dòng này bị vô hiệu hóa sự kiện click (`onSelect = undefined`).

### 2.1. Thiết Kế Mới Cho `CommitTable.tsx`

Cho phép người dùng bấm click vào dòng `Uncommitted changes` để mở bảng Staging & Soạn thảo commit:

```tsx
// Trong src/webview/components/commit/CommitTable.tsx
<CommitRow
  commit={row.metadata}
  // ... các props khác giữ nguyên 100% ...
  onSelect={() => toggleCommitDetails(row.hash)} // Cho phép click cả dòng UNCOMMITTED_CHANGES!
/>
```

### 2.2. Điều Phối Hiển Thị Trong Bảng Inspector Nổi (Overlay Inspector Panel)

Khi một dòng được mở chi tiết:
- Nếu dòng được chọn là **một commit lịch sử bình thường** (`row.hash !== UNCOMMITTED_CHANGES`): Hiển thị bảng chi tiết commit [`<CommitDetails />`](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/CommitDetails.tsx) như hiện tại.
- Nếu dòng được chọn là **dòng thay đổi chưa commit** (`row.hash === UNCOMMITTED_CHANGES`): Hiển thị phân vùng **`<StagingArea />`** (gồm StagingPanel + CommitComposer được bọc trong khung đinh tán `CornerCrossFrame`).

```tsx
// Bố cục render Overlay Inspector trong CommitTable.tsx
{expandedRow !== -1 && (
  <div
    class="absolute right-0 z-10"
    style={`left: var(--col-graph); top: ${detailsPanelTop}px`}
  >
    {expandedHash === UNCOMMITTED_CHANGES ? (
      <StagingArea />
    ) : (
      <CommitDetails details={commitDetails.value} />
    )}
  </div>
)}
```

---

## 3. Kiến Trúc Bộ Giám Sát Tệp (File Watcher & Real-Time Sync)

Mã nguồn nằm trong [src/extension/watchers/git-repo.watcher.ts](file:///d:/Kojin/neo-git-graph/src/extension/watchers/git-repo.watcher.ts):

### 3.1. Các Vùng Giám Sát Cốt Lõi
Hệ thống sử dụng `vscode.workspace.createFileSystemWatcher` để theo dõi 3 vùng biến động:
1. **Chỉ mục Git (`.git/index`)**: Kích hoạt khi có lệnh stage/unstage tệp thực thi.
2. **Con trỏ nhánh & HEAD (`.git/HEAD`, `.git/refs/heads/**`)**: Kích hoạt khi có commit mới, chuyển nhánh hoặc rebase.
3. **Thư mục làm việc (Working Tree)**: Giám sát các tệp mã nguồn trong dự án (loại trừ các thư mục rác như `node_modules`, `.git`, `dist`, `bin`, `obj`).

### 3.2. Thuật Toán Debounce 150ms Chống Bão Sự Kiện (Anti-Event Storm)

Khi lập trình viên lưu nhiều tệp cùng lúc (Save All), thực hiện `npm install` hoặc chạy lệnh build sinh ra hàng nghìn tệp mới, File Watcher có thể bắn hàng trăm sự kiện trong vài phần nghìn giây.

Nếu truy vấn `git status` liên tục sẽ làm treo CPU và đơ giao diện. Vì vậy, hệ thống áp dụng cơ chế **Debounce 150ms**:

```typescript
// Cơ chế Debounce xử lý sự kiện trong git-repo.watcher.ts
let statusDebounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_INTERVAL_MS = 150;

function onFileEvent(uri: vscode.Uri) {
  // Lọc bỏ các thư mục không cần theo dõi
  if (isIgnoredPath(uri.fsPath)) return;

  if (statusDebounceTimer !== null) {
    clearTimeout(statusDebounceTimer);
  }

  statusDebounceTimer = setTimeout(async () => {
    statusDebounceTimer = null;
    // Bắn thông báo sang Webview để làm mới trạng thái Working Tree
    await notifyStatusChange();
  }, DEBOUNCE_INTERVAL_MS);
}
```

---

## 4. Vòng Lặp Trải Nghiệm Hoàn Chỉnh Của Lập Trình Viên (End-to-End Dev Loop)

Quy trình hoạt động liền mạch từ đầu đến cuối không cần rời khỏi F-GitGraph:

```
[1. Sửa mã nguồn trong IDE]
          │
          ▼ (File Watcher phát hiện sau 150ms)
[2. Đồ thị hiện dòng "Uncommitted changes (3)" với Hexagon nét đứt]
          │
          ▼ (Lập trình viên click vào dòng này)
[3. Mở khung Cyber-Lab Staging Area & Commit Composer]
          │
          ▼ (Rê chuột lên tệp, bấm nút "+" để Stage)
[4. Tệp chuyển lên danh mục Staged Changes]
          │
          ▼ (Nhập tiêu đề "feat: add staging area", đếm ký tự 32/50)
[5. Nhấn tổ hợp phím Ctrl + Enter]
          │
          ▼ (GitCliMutator gọi git commit an toàn qua Git CLI)
[6. Commit thành công: Âm thanh chốt cơ khí vang lên]
          │
          ▼ (F# Core nạp lại đồ thị DAG)
[7. Node lục giác commit mới xuất hiện trên đỉnh nhánh, bảng Staging đóng lại]
```

---

## 5. Kế Hoạch Kiểm Thử & Nghiệm Thu Tích Hợp

1. **Kiểm thử Đồng bộ Hình học (Geometry Invariance Test)**:
   - Mở và đóng bảng Staging Area nhiều lần.
   - Đảm bảo toàn bộ các đường cong SVG Bézier của các nhánh xung quanh không bị lệch dù chỉ 1 pixel.
2. **Kiểm thử Tải File Watcher (Stress Watcher Test)**:
   - Tạo đồng thời 100 tệp mới trong thư mục dự án.
   - Đảm bảo cơ chế Debounce 150ms chỉ kích hoạt đúng 1 lần truy vấn `workspaceStatus`, không làm nghẽn tiến trình VS Code.
3. **Kiểm thử Vòng Lặp Phím Tắt (Shortcut Flow Test)**:
   - Sửa tệp $\rightarrow$ Bấm `+` $\rightarrow$ Gõ tiêu đề $\rightarrow$ Nhấn `Ctrl + Enter` hoàn tất trong dưới 2 giây.
