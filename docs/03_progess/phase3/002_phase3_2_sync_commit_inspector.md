# Tiến Độ Giai Đoạn 3.2.SYNC: Bảng Xem Trước Danh Sách Commit Đồng Bộ (Sync Commit List Inspector Flyout)

Tài liệu này ghi nhận tổng quan mục tiêu, danh mục tệp tin tác động, phân rã đầu việc chi tiết theo chuẩn kiểm thử song hành (Test-Driven Task Breakdown), và tiêu chuẩn nghiệm thu cho **Phase 3.2.SYNC: Hiện Thực Hóa Ngăn Kéo Xem Trước Danh Sách Commit Đồng Bộ (Sync Commit List Inspector Flyout)**, tích hợp trực tiếp vào buồng lái Bánh xe lục giác (Radial Command Hub) cho các tác vụ `PUSH` (outgoing commits) và `PULL` (incoming commits).

> [!NOTE]
> Mọi nội dung trong tài liệu này bám sát bản đặc tả kỹ thuật trực tiếp:
> 📌 **Tài liệu thiết kế trực tiếp**: [11. Thiết Kế Bảng Xem Trước Danh Sách Commit Đồng Bộ (Sync Commit List Inspector Flyout)](../../02_design/phase3/11_Sync_Commit_List_Inspector_Design.md).
>
> Áp dụng triệt để 4 nguyên tắc cốt tử: **Contract-First**, **4-Tier Safety Boundary**, **Zero Layout Shift**, và **Kỷ luật kiểm thử TDD**.

---

## 1. Bảng Kiểm Kê Tệp Tin Tác Động (Impacted Files Inventory)

| Phân Loại             | Đường Dẫn Tệp Tin                                                                                 | Trách Nhiệm Kỹ Thuật Chính                                                                                             |
| :-------------------- | :------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| **Type Definition**   | `src/types/queries.ts`<br>`src/types/actions.ts`                                                  | Khai báo cấu trúc dữ liệu `SyncCommitRecord`, `SyncCommitListQuery`, `SyncCommitListResult`.                           |
| **Backend Query**     | `src/backend/queries/syncCommitList.ts`                                                           | Truy vấn danh sách commit chênh lệch qua `git log @{u}..HEAD` (outgoing) và `git log HEAD..@{u}` (incoming).           |
| **Extension Host**    | `src/extension/services/messageHandler.ts`                                                        | Định tuyến và xử lý RPC query `getSyncCommitList` gửi từ Webview.                                                      |
| **Reactive Store**    | `src/webview/lib/stores/sync-inspector.store.ts`                                                  | Quản lý trạng thái mở/đóng flyout, danh sách commit đang xem, loại hiển thị (`outgoing` \| `incoming`), và cờ bận tải. |
| **Webview Actions**   | `src/webview/lib/actions.ts`                                                                      | Bổ sung hàm dispatch RPC `requestSyncCommitList(type: 'outgoing'                                                       | 'incoming')`. |
| **Webview UI**        | `src/webview/components/wheel/SyncCommitFlyout.tsx`                                               | Khung ngăn kéo Cyber-Lab nổi đóng khung `CornerCrossFrame`, neo tọa độ theo cánh hoa PUSH/PULL.                        |
| **Webview UI**        | `src/webview/components/wheel/SyncCommitItem.tsx`                                                 | Từng dòng hiển thị commit (short hash, avatar/author, subject, relative time).                                         |
| **Wheel Integration** | `src/webview/components/wheel/HexWheelHub.tsx`<br>`src/webview/components/wheel/HexagonPetal.tsx` | Gắn sự kiện kích hoạt flyout từ cánh hoa `PUSH` (ahead > 0) và `PULL` (behind > 0) tại State 2/3.                      |
| **Styling Tokens**    | `src/webview/styles.css`                                                                          | Khai báo token hiệu ứng mờ nền kính, bóng đổ neon cho Flyout Inspector.                                                |
| **Unit Test**         | `tests/backend/queries/syncCommitList.test.ts`                                                    | Kiểm thử parser đầu ra `git log`, xử lý danh sách rỗng, ký tự đặc biệt trong commit message.                           |
| **Unit Test**         | `tests/webview/stores/syncInspectorStore.test.ts`                                                 | Kiểm thử chuyển đổi trạng thái mở/đóng, nạp dữ liệu commit, tự động đóng khi đổi repo hoặc đóng bánh xe.               |
| **Unit Test**         | `tests/webview/components/wheel/SyncCommitFlyout.test.ts`                                         | Kiểm thử render danh sách commit, định vị tọa độ neo, kích hoạt nút thực thi hành động đồng bộ.                        |

---

## 2. Kế Hoạch Phân Rã Đầu Việc Chi Tiết (Test-Driven Task Breakdown)

### 🧩 Nhóm Việc 1: Hợp Đồng Dữ Liệu & Bộ Truy Vấn Danh Sách Commit (Backend Query Tier)

- [ ] **Task 1.1**: Định nghĩa cấu trúc kiểu dữ liệu TypeScript trong `src/types/queries.ts` và `src/types/actions.ts`:
  - `SyncCommitRecord`: `{ hash: string; shortHash: string; author: string; email: string; date: number; subject: string }`.
  - `SyncCommitListQuery`: `{ command: 'getSyncCommitList'; mode: 'outgoing' | 'incoming' | 'diverged' }`.
  - `SyncCommitListResult`: `{ mode: 'outgoing' | 'incoming' | 'diverged'; commits: SyncCommitRecord[]; incomingCommits?: SyncCommitRecord[]; totalCount: number }`.
- [ ] **Task 1.2**: Viết Unit Test `tests/backend/queries/syncCommitList.test.ts` kiểm thử:
  - Phân tích chuỗi NUL-delimited của `git log` thành mảng `SyncCommitRecord[]`.
  - Xử lý biên: Danh sách rỗng ($0$ commit), commit có tiêu đề chứa dấu nháy kép, ký tự xuống dòng hoặc unicode tiếng Việt.
  - Phân định rõ chế độ `outgoing` (`@{u}..HEAD`), `incoming` (`HEAD..@{u}`), và `diverged` (lấy đồng thời cả hai dải).
- [ ] **Task 1.3**: Triển khai hàm truy vấn `getSyncCommitList(git: SimpleGit, mode: 'outgoing' | 'incoming' | 'diverged')` tại `src/backend/queries/syncCommitList.ts`.
- [ ] **Task 1.4**: Đăng ký xử lý RPC query `getSyncCommitList` trong `src/extension/services/messageHandler.ts`.

### 🧩 Nhóm Việc 2: Kho Trạng Thái Phản Ứng `sync-inspector.store.ts` (Reactive Store Tier)

- [ ] **Task 2.1**: Viết Unit Test `tests/webview/stores/syncInspectorStore.test.ts` kiểm thử:
  - Khởi tạo trạng thái ban đầu: `isInspectorOpen` là `false`, `inspectedCommits` và `divergedIncomingCommits` là mảng rỗng.
  - Kích hoạt `openInspector('diverged')`: Gửi yêu cầu RPC, chuyển `isLoading` sang `true`.
  - Nhận phản hồi `loadSyncCommitList`: Cập nhật mảng commit outgoing và incoming, tắt `isLoading`.
  - Kích hoạt `closeInspector()`: Đặt lại trạng thái sạch.
  - Tự động đóng inspector khi `closeWheel()` được gọi trong `wheel.store.ts`.
- [ ] **Task 2.2**: Triển khai kho trạng thái `src/webview/lib/stores/sync-inspector.store.ts` bằng Preact Signals hỗ trợ `divergedIncomingCommits`.
- [ ] **Task 2.3**: Bổ sung hàm gửi yêu cầu `requestSyncCommitList(mode)` trong `src/webview/lib/actions.ts` và hàm xử lý phản hồi trong `src/webview/lib/handler/sync-commit-list.ts`.

### 🧩 Nhóm Việc 3: Component Giao Diện Ngăn Kéo Hướng Tâm (Webview UI Tier)

- [ ] **Task 3.1**: Viết Unit Test `tests/webview/components/wheel/SyncCommitFlyout.test.ts` kiểm thử:
  - Render bảng nổi được bọc trong `CornerCrossFrame` với đinh tán góc `+`.
  - Hiển thị tiêu đề động (ví dụ: `Outgoing Commits (3)`, `Incoming Commits (2)`, hoặc `Branch Diverged (Ahead 1, Behind 1)`).
  - Ở chế độ `diverged`: Hiển thị 2 phân khu đối chiếu rõ ràng (Phân khu Local cam vs Phân khu Remote xám/đỏ gạch ngang).
  - Chân bảng hiển thị 3 nút giải quyết phân kỳ: `Replace Remote (Force Push with Lease)`, `Rebase on Remote`, và `Merge Remote`.
  - Trạng thái đang tải (Loading Skeleton) khi `isLoading` là `true`.
  - Bấm nút `Replace Remote` kích hoạt `push(true)` và tự động đóng flyout.

- [ ] **Task 3.2**: Triển khai component `SyncCommitItem.tsx` hiển thị từng dòng commit:
  - Mã băm ngắn (Monospace, màu sắc dịu), tên tác giả, tiêu đề commit và thời gian tương đối.
  - Hiệu ứng hover nổi bật từng dòng commit.
- [ ] **Task 3.3**: Triển khai component `SyncCommitFlyout.tsx`:
  - Lớp kính mờ `backdrop-filter: blur(8px)`, nền `rgba(15, 23, 42, 0.85)` cho Dark Theme.
  - Vị trí neo tọa độ tự động điều chỉnh theo cánh hoa `PUSH` ($270^\circ$, bay lên trên hoặc lệch góc) và `PULL` ($330^\circ$, bay sang góc đông bắc).
  - Giới hạn chiều cao tối đa `max-h-[280px]` kèm thanh cuộn mỏng Cyber-Lab (`custom-scrollbar`).

### 🧩 Nhóm Việc 4: Tích Hợp Buồng Lái Bánh Xe & Tương Tác Người Dùng (Integration Tier)

- [ ] **Task 4.1**: Tích hợp nút mở Flyout trên cánh hoa `PUSH` và `PULL` trong `HexagonPetal.tsx`:
  - Ở State 2 & 3: Khi có `aheadCount > 0` hoặc `behindCount > 0`, hiển thị icon xem trước (mắt kính / danh sách nhỏ) cạnh huy hiệu số đếm.
  - Nhấp chuột vào huy hiệu số đếm mở ngay bảng `SyncCommitFlyout`.
- [ ] **Task 4.2**: Cơ chế phím tắt & trợ năng:
  - Nhấn phím `Esc` khi Flyout đang mở: Thu gọn Flyout trước, bánh xe vẫn giữ State 2.
  - Nhấn `Esc` lần thứ 2: Thu gọn toàn bộ bánh xe về State 0.
  - Bấm chuột ra ngoài phạm vi Flyout: Tự động đóng Flyout.
- [ ] **Task 4.3**: Tích hợp hỗ trợ đa giao diện (Dark & Light Theme):
  - Dark Theme: Viền Neon Cam cho Outgoing (Push), Neon Xanh lá cho Incoming (Pull).
  - Light Theme: Tương phản kỹ thuật màu xanh lam blueprint mềm mại, không gây chói lóa.

### 🧩 Nhóm Việc 5: Kiểm Thử Toàn Diện, Hồi Quy & Nghiệm Thu (Quality & Verification Tier)

- [ ] **Task 5.1**: Kiểm thử bảo đảm bất biến hình học đồ thị DAG (`Zero Layout Shift Guarantee`):
  - Khẳng định 100% tọa độ các nút `HexagonNode` và các cánh hoa của bánh xe không bị xô lệch dù chỉ 1 pixel khi mở hoặc cuộn danh sách commit trong Flyout.
- [ ] **Task 5.2**: Viết kịch bản kiểm thử E2E / Component Flow:
  - Tạo commit cục bộ $\to$ aheadCount = 1 $\to$ mở State 2 $\to$ bấm xem danh sách $\to$ hiển thị đúng commit vừa tạo $\to$ bấm `Push Now` $\to$ hoàn thành đồng bộ.
- [ ] **Task 5.3**: Chạy toàn bộ bộ kiểm tra chất lượng của dự án:
  - `pnpm run typecheck` (không lỗi kiểu).
  - `pnpm run lint` (không vi phạm oxlint).
  - `pnpm run test` (100% test suites Vitest xanh).

---

## 3. Tiêu Chuẩn Nghiệm Thu Chặng 3.2.SYNC (Definition of Done)

1. **Trải nghiệm minh bạch & An toàn tuyệt đối**:
   - Người dùng xem được đầy đủ danh sách, tác giả và tiêu đề commit sắp Push hoặc Pull trước khi thực hiện.
   - Thao tác đồng bộ có thể kích hoạt trực tiếp từ chân bảng xem trước.
2. **Thẩm mỹ Cyber-Lab đồng nhất**:
   - Bảng nổi hướng tâm được đóng khung đinh tán `+`, lớp kính mờ xuyên thấu, đồng bộ hoàn hảo với ngôn ngữ thiết kế của Bánh xe lục giác.
3. **Bảo toàn hình học & Zero Layout Shift**:
   - Hoàn toàn không gây xô lệch thanh toolbar, buồng lái bánh xe hay đồ thị DAG.
4. **Chất lượng mã nguồn & TDD 100%**:
   - Đầy đủ Unit Test song hành cho parser backend, store phản ứng và UI flyout.
   - 100% bài test vượt qua thành công trước khi hoàn tất phase.
