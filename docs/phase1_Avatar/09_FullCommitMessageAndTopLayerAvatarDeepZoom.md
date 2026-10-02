# 09. Full Commit Message & Top-Layer Avatar Deep Zoom (5x)

## 1. Overview & Context

Sau khi trải nghiệm hai tính năng mới (Rich Commit Hover Panel và Avatar Deep Zoom), người dùng đã phát hiện và yêu cầu cải tiến 2 vấn đề trọng tâm:

1. **Hiển thị toàn bộ nội dung Commit Message**:
   - Trước đây `git log` chỉ lấy `%s` (Subject / Tiêu đề commit).
   - Khi commit có phần thân mô tả chi tiết (Body / Description nhiều dòng), panel chỉ hiển thị dòng title tóm tắt.
   - **Yêu cầu**: Tải và hiển thị toàn bộ nội dung commit message (bao gồm cả Subject và Body đầy đủ với ngắt dòng nguyên bản, định dạng đẹp mắt như GitLens).

2. **Avatar Deep Zoom 5x trên Top Layer (Layer cao nhất)**:
   - **Lỗi layer & lề cột graph**:
     - Trước đây SVG node nằm bên trong `<div style={GRAPH_CLIP}>` với `overflow-hidden`, `width: var(--col-graph)` và `mask-image`. Khi zoom to, hình bị cắt xén ở 2 lề cột graph.
     - Cấu trúc `<table>` nằm sau container đồ thị khiến các ô `<td>`, viền bảng và text đè lên hình đang phóng to ("nhìn chỗ được chỗ ko").
     - Nhãn tác giả nằm bên trong `<g>` bị nhân tỷ lệ zoom khiến chữ to khổng lồ và trôi xa khỏi ảnh ("zoom lên mỗi nơi 1 cái, chữ và ảnh ko cùng tỷ lệ").
   - **Yêu cầu cải tiến**:
     - Đưa ảnh phóng to lên **Layer trên cùng tuyệt đối (`z-index: 60`, `fixed`)**, thoát khỏi hoàn toàn mọi container bị `overflow-hidden` hay `mask-image`.
     - Phóng to lên **5 lần ($5\times$)** so với kích thước mặc định ($R = 50\text{px}$, đường kính $100\text{px}$).
     - Sử dụng **ảnh có độ phân giải cao (`size = 256`)** để khi phóng to 5x ảnh sắc nét không bị vỡ hạt hay mờ.
     - Nhãn tên tác giả (Author Badge) được thiết kế tinh tế, kích thước chữ nhỏ gọn hài hòa với ảnh ($12\text{px}$), bám sát ngay dưới chân lục giác.
     - Giữ nguyên hiệu ứng ánh sáng **Neon Glow lung linh** theo màu nhánh.
     - Tự động kiểm tra mép màn hình (`viewport edge clamping`) để không bị che khi avatar nằm ở nhánh sát lề trái/phải.

---

## 2. Kiến trúc giải pháp (Architecture & Design)

### 2.1. Backend: Tải toàn bộ Message Commit (Subject + Body)
- Trong `src/backend/queries/loadCommits.ts`:
  - Thay vì dùng format `%s` kết hợp ngắt dòng thông thường (vốn sẽ làm vỡ dữ liệu nếu body có chứa ký tự `\n`), chúng ta sử dụng cặp ký tự phân tách chuyên biệt:
    - Phân tách commit: `const COMMIT_DELIMITER = "---COMMIT-END-NEO-GIT-GRAPH---"`
    - Phân tách trường: `const FIELD_DELIMITER = "---FIELD-SEP-NEO-GIT-GRAPH---"`
    - Định dạng format Git: `["%H", "%P", "%an", "%ae", dateField, "%s", "%b"].join(FIELD_DELIMITER) + COMMIT_DELIMITER`
  - Trường `message` lưu Subject (dùng cho hiển thị gọn 1 dòng trên danh sách commit).
  - Trường `body` lưu Body chi tiết nhiều dòng (dùng cho CommitHoverPanel và CommitDetails).
- Cập nhật kiểu dữ liệu `GitCommitNode` và `GitLogEntry`:
  ```typescript
  export type GitCommitNode = {
    hash: string;
    parentHashes: string[];
    author: string;
    email: string;
    date: number;
    message: string;
    body?: string;
    refs: GitRef[];
  };
  ```

### 2.2. Webview: Top-Layer AvatarZoomPreview Component
- Tách biệt hoàn toàn tính năng **Deep Zoom** ra khỏi SVG cây đồ thị:
  - `HexagonNode` trong cây đồ thị chỉ đóng vai trò kích hoạt: Khi người dùng rê chuột vào avatar và giữ $\ge 500\text{ms}$, sự kiện `onAvatarDwell` được kích hoạt mang theo tọa độ `DOMRect`, thông tin `commit`, màu sắc và tác giả.
  - `CommitTable` quản lý trạng thái `zoomedAvatar: ZoomedAvatarInfo | null`.
  - Component mới `AvatarZoomPreview` được render ở **mức root của `CommitTable`** với `position: fixed` và `z-index: 60`.

### 2.3. Chi tiết hình học & Tỷ lệ hiển thị 5x
1. **Lục giác 5x**:
   - Bán kính: $R = 50\text{px}$.
   - Chiều rộng: $w = 2 \times 50 \times \frac{\sqrt{3}}{2} \approx 86.6\text{px}$.
   - Chiều cao: $h = 100\text{px}$.
   - Đường viền: `strokeWidth = 3`, `stroke = colour`, `strokeLinejoin = round`.
   - Hiệu ứng Neon:
     ```css
     filter: drop-shadow(0 0 16px ${colour}) drop-shadow(0 0 6px ${colour}) drop-shadow(0 0 2px #ffffff);
     ```
2. **Độ nét ảnh (High-Resolution Avatar)**:
   - Truy vấn `getGitAccountAvatarUrl(commit.email, 256)`.
   - Ảnh gốc chất lượng 256px hiển thị trong khuôn khổ 100px sẽ đảm bảo cực kỳ mịn màng trên cả màn hình thông thường lẫn Retina / 4K.
3. **Nhãn tác giả (Author Badge)**:
   - Bám sát ngay dưới đỉnh chân lục giác (offset chỉ $3\text{px}$ từ đỉnh nhọn phía dưới, khắc phục khoảng trống SVG bằng `marginTop: -17px`).
   - Kích thước chữ thu gọn bằng 2/3 phiên bản ban đầu: `text-[8.5px] font-semibold leading-tight text-menu-fg`.
   - Kích thước badge: padding tinh gọn `px-2 py-[2px]`, viền mỏng $1\text{px}$ màu nhánh kèm viền sáng neon mờ.
   - Nền kính mờ: `rgba(15, 23, 42, 0.95)`, `backdrop-filter: blur(8px)`.
   - Cân đối thanh lịch và bám sát hoàn hảo vào khối lục giác $100\text{px}$.
4. **Không bị che lề trái/phải (`Viewport Edge Clamping`)**:
   - Tọa độ tâm `X` được giới hạn:
     ```typescript
     const minX = 55;
     const maxX = window.innerWidth - 55;
     const clampedX = Math.max(minX, Math.min(maxX, centerX));
     ```
   - Nhờ đó, ngay cả khi commit node nằm ở làn 0 (sát lề trái) hay cột graph bị co hẹp, ảnh phóng to và nhãn tên vẫn nằm trọn vẹn trong tầm nhìn của người dùng.

---

## 3. Danh sách tệp tin thay đổi
1. `src/backend/types/git.types.ts`: Bổ sung trường `body?: string`.
2. `src/backend/queries/loadCommits.ts`: Sử dụng `COMMIT_DELIMITER` và nạp `%s` + `%b`.
3. `src/webview/utils/avatar.ts`: Hỗ trợ kích thước ảnh 256px cho avatar nét cao.
4. `src/webview/components/commit/AvatarZoomPreview.tsx`: Component floating preview 5x trên top layer.
5. `src/webview/components/commit/HexagonNode.tsx`: Gửi sự kiện `onAvatarDwell` và `onAvatarLeave`.
6. `src/webview/components/commit/CommitGraph.tsx`: Chuyển tiếp callback avatar dwell/leave.
7. `src/webview/components/commit/CommitTable.tsx`: Quản lý `zoomedAvatar` và render `AvatarZoomPreview`.
8. `src/webview/components/commit/CommitHoverPanel.tsx`: Hiển thị đầy đủ Subject + Body đa dòng.
9. `tests/webview/components/commit/CommitHoverPanel.test.ts`: Bổ sung kiểm thử body commit đa dòng.
10. `tests/webview/components/commit/AvatarZoomPreview.test.ts`: Kiểm thử render avatar 5x và author badge.
