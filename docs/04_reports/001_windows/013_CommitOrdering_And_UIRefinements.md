# Báo Cáo Kỹ Thuật: Commit Ordering (Topological/Date) & Tinh Chỉnh Giao Diện Webview

- **Mã hồ sơ**: `REP-WIN-013`
- **Ngày lập**: 2026-10-05
- **Trạng thái**: Hoàn thành — kiểm định zero-regression (dotnet test 62/62, vitest backend 90/90 + extension 2/2 + webview 73/73, typecheck/lint 0 lỗi)
- **Tác động**: Nhân F# Core Engine (sắp xếp commit), tầng Extension Host & RPC (truyền tham số thứ tự), Webview Preact (giao diện chọn kiểu sắp xếp) và các hiệu ứng thị giác (gradient neon, viền panel, hành vi panel).

---

## 1. Tổng Quan & Bối Cảnh

Sau khi hoàn tất khắc phục 6 sự cố hiển thị đồ thị (Nhóm Việc 12) và chuyển đổi cơ chế hiển thị chi tiết commit sang **Overlay Inspector Panel**, hai nhu cầu tiếp theo được ghi nhận:

1. **Sắp xếp thứ tự commit (Commit Ordering)**: Người dùng cần chuyển đổi giữa hai chiến lược sắp xếp — **Topological** (mặc định, ưu tiên thế hệ rồi đến thời gian) và **Date** (ưu tiên thời gian commit muộn hơn) — tương tự hành vi của `git log --topo-order` và `git log --date-order`.
2. **Tinh chỉnh giao diện**: Hoàn thiện một số chi tiết thị giác và tương tác của dải neon ambient, viền khung panel chi tiết và hành vi panel khi chọn commit gần đáy danh sách.

Báo cáo này ghi nhận chi tiết thiết kế, phạm vi thay đổi và kết quả kiểm định của cả hai hạng mục trên.

---

## 2. Commit Ordering (Topological / Date)

### 2.1. Nhân F# Core Engine

Trước đây nhân F# chỉ hỗ trợ duy nhất sắp xếp topology với bộ so sánh ưu tiên cố định `(thế hệ, thời gian)`. Để hỗ trợ hai chiến lược, các thay đổi sau được thực hiện:

- **`src/core-engine/Graph/Graph.fs`**:
  - Thêm kiểu liệt kê `CommitOrdering` (`Topological` | `Date`) kèm hàm `ofString` chuyển chuỗi giao thức RPC (`"date"` → `Date`, còn lại → `Topological`).
  - Tách bộ so sánh ưu tiên thành `comparerFor ordering`: `Date` dùng max-heap theo `CommitTime` (vẫn giữ ràng buộc topo), `Topological` giữ nguyên max-heap theo `(Generation, CommitTime)`.
  - Đổi `TopoSort.order` → `TopoSort.orderWith ordering` (giữ `order` tương thích cũ), tương tự `Layout.compute` → `Layout.computeWith ordering`.

- **`src/core-engine/Storage/Storage.fs`** (đường dẫn fallback không dùng commit-graph):
  - Đổi nguồn thời gian từ **author time** sang **committer time** (commit date), khớp thứ tự mặc định của `git log` / Git History.
  - Tự tính **thế hệ topology (topological level)** cho mỗi commit (gốc = 1, con = 1 + max(thế hệ cha)) bằng thuật toán Kahn, vì đường fallback không có sẵn generation như commit-graph. Nếu để toàn 0, cả hai chiến lược đều suy biến về thứ tự theo thời gian.

- **`src/core-engine/Transport/Transport.fs`**: Luồn `CommitOrdering` xuyên suốt `decodeInitRequest`, `Daemon.State`, `loadRepo` và `runWith`; giải mã trường `commitOrdering` từ gói tin init.

- **`src/core-engine/Benchmark.fs`**: Bổ sung trường `Ordering` vào `State` mẫu để khớp chữ ký mới.

### 2.2. Extension Host & Giao Thức RPC

- **`src/types/rpc.types.ts`**: Khai báo `CommitOrdering = "topological" | "date"` và bổ sung `commitOrdering?` vào tham số `graph.load`.
- **`src/extension/sidecar/protocol.ts`**: `encodeInitRequest` mã hóa thêm khóa `commitOrdering` (bản đồ 1–3 khóa tùy tham số).
- **`src/extension/sidecar/sidecar-manager.ts`**, **`graph-data-bridge.ts`**, **`graph-bridge-service.ts`**: Truyền `commitOrdering` qua `initialize` → `loadGraph`.
- **`src/extension/handlers/graph.ts`**, **`rpc/handlers.ts`**: Tiếp nhận và định tuyến `commitOrdering` từ RPC.
- **`src/extension/l10n/webviewL10n.ts`**: Bổ sung nhãn `Commit Ordering`.

### 2.3. Webview Preact

- **`src/webview/lib/stores.ts`**: Thêm signal `commitOrdering` (mặc định `"topological"`).
- **`src/webview/lib/actions.ts`**: Thêm `selectCommitOrdering(value)` — chuyển kiểu sắp xếp và nạp lại đồ thị; cập nhật `selectRepo`/`selectBranch`/`setShowRemoteBranch`/`refresh` truyền `commitOrdering.value` vào `loadGraph`.
- **`src/webview/lib/stores/graph-window.store.ts`**: `loadGraph` chấp nhận và đóng gói `commitOrdering` vào yêu cầu RPC `graph.load`.
- **`src/webview/layout/MainHeader.tsx`**: Thêm dropdown **Topological / Date** trên thanh công cụ.

---

## 3. Tinh Chỉnh Giao Diện Webview

### 3.1. Gradient Neon xuất phát từ chính giữa nửa phải avatar

- **`src/webview/components/commit/CommitRow.tsx`**: Điểm bắt đầu dải neon ambient chuyển từ mép phải avatar (`avatarRightX`) sang **tâm của nửa phải avatar** (`avatarRightX - 5`). Avatar trải từ `avatarRightX - 20` đến `avatarRightX`, nửa phải là `[avatarRightX - 10, avatarRightX]`, tâm là `avatarRightX - 5`. Các điểm phai màu (`+25px`, `+60px`) dịch theo điểm gốc mới.

### 3.2. Viền neon cho panel chi tiết commit

- **`src/webview/components/commit/CommitDetails.tsx`**: Panel `CommitDetails` giờ có viền tím neon `#a855f7` + glow `box-shadow` đồng nhất với dòng commit đang chọn (trước đây chỉ dòng commit có viền). Panel vẫn bám sát ngay mép dưới dòng được chọn, không chèn đè lên dòng.

### 3.3. Panel lật phía trên khi gần đáy danh sách

- **`src/webview/components/commit/CommitTable.tsx`**: Khi dòng được chọn nằm quá gần đáy (không đủ `COMMIT_DETAILS_HEIGHT` chỗ trống phía dưới), panel chi tiết tự động **lật lên phía trên** dòng thay vì đè xuống che khuất các commit gốc cuối cùng. Hành vi đồng nhất với panel hover vốn đã áp dụng chiến lược tương tự.

### 3.4. Avatar hover scale 1.2x

- **`src/webview/components/commit/HexagonNode.tsx`**: Tăng hệ số micro-interaction hover/selected từ `scale(1.15)` lên `scale(1.2)` để avatar khi phóng to ôm khít đúng chiều cao dòng commit (24px), kèm cập nhật tài liệu chú thích.

---

## 4. Kiểm Định (Zero-Regression)

| Hạng mục kiểm định          |                              Kết quả                              |
| :-------------------------- | :---------------------------------------------------------------: |
| `dotnet test` (F# Core)     |                            62/62 pass                             |
| `vitest` — backend          |                            90/90 pass                             |
| `vitest` — extension        |                             2/2 pass                              |
| `vitest` — webview          |                            73/73 pass                             |
| `pnpm typecheck`            |                               0 lỗi                               |
| `pnpm lint`                 |                        0 lỗi / 0 cảnh báo                         |
| `pnpm run package:vsix:win` | Đóng gói thành công `f-gitgraph-win-x64.vsix` (2.63 MB, 20 files) |

Các test mới bổ sung:

- F# `GraphTests`: `date ordering differs from topological on branching history`.
- F# `TransportTests`: `protocol decodes init request with commit ordering`, gia cố kiểm thử luồng `commitOrdering` xuyên daemon.
- TS `protocol.test.ts`: `encodes init request with branch and commit ordering`.
- TS `graph-handler.test.ts`: cập nhật kỳ vọng tham số `loadGraph` với `commitOrdering`.
- Webview `CommitRow.test.ts`: cập nhật kỳ vọng gradient (điểm gốc `avatarRightX - 5`).
- Webview `HexagonNode.test.ts`: cập nhật kỳ vọng `scale(1.2)`.

---

## 5. Kết Luận

Hai hạng mục hoàn tất trọn vẹn: **Commit Ordering** cho phép người dùng chuyển đổi giữa sắp xếp topology và theo thời gian trên toàn bộ pipeline (F# Core → RPC → Extension → Webview), đồng thời các **tinh chỉnh giao diện** hoàn thiện tính nhất quán thị giác của dải neon, viền khung panel và hành vi panel chi tiết. Toàn bộ kiểm định đạt zero-regression và bản cài đặt thử nghiệm Windows đã được đóng gói thành công.
