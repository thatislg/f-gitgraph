# 11. Thiết Kế Bảng Xem Trước Danh Sách Commit Đồng Bộ (Sync Commit List Inspector Flyout)

Tài liệu này định hình cấu trúc sơ bộ và ranh giới kiến trúc cho giai đoạn tiếp theo của **Phase 3.2: Bảng Xem Trước & Kiểm Tra Danh Sách Commit Đồng Bộ (Sync Commit List Inspector Flyout)**, tích hợp trực tiếp vào buồng lái Bánh xe lục giác (Radial Command Hub) cho các tác vụ `PUSH` (outgoing commits) và `PULL` (incoming commits).

> [!NOTE]
> Tài liệu này được tách độc lập từ bản phác thảo ban đầu (Mục 12.2 trong `10_WheelConcepts.md`).
> Chi tiết đặc tả kỹ thuật chuyên sâu (giải thuật, tọa độ neo flyout, hợp đồng RPC và ma trận kiểm thử chi tiết) sẽ được hoàn thiện ở bước tiếp theo trước khi triển khai mã nguồn.

---

## 1. Tầm Nhìn & Mục Tiêu Nghiệp Vụ

1. **Minh bạch hóa dòng chảy commit (Transparency & Safety)**:
   - Thay vì bấm `Push` hoặc `Pull` một cách mù quáng, người dùng có thể xem trước danh sách các commit sắp được đẩy lên remote hoặc sắp được kéo về máy cục bộ.
   - Tránh các rủi ro đẩy nhầm commit nhạy cảm, commit chưa hoàn thiện, hoặc kéo về commit gây xung đột mà không hay biết.
2. **Kế thừa thẩm mỹ Cyber-Lab & Trải nghiệm Radial**:
   - Khung kiểm tra không phải là một hộp thoại modal che khuất màn hình truyền thống, mà là một **Ngăn kéo nổi hướng tâm (Radial Flyout Drawer)** trượt nhẹ từ mép ngoài của cánh hoa `PUSH` hoặc `PULL`.
   - Đóng khung bằng đinh tán góc `+` (`CornerCrossFrame`), nền kính mờ kỹ thuật (`backdrop-filter: blur(8px)`) và vầng quang phát sáng Neon đặc trưng.

---

## 2. Ranh Giới Kiến Trúc 4 Tầng (The 4-Tier Boundary)

1. **Tầng Webview UI (Preact & Signals)**:
   - Component `SyncCommitFlyout.tsx`: Bảng nổi hiển thị danh sách commit dạng cây hoặc danh sách thu gọn.
   - Tín hiệu phản ứng: `isFlyoutOpen`, `flyoutType: 'outgoing' | 'incoming'`, `inspectedCommits: Signal<CommitSummaryItem[]>`.
2. **Tầng Backend Extension Host (MessageHandler)**:
   - Điều phối truy vấn danh sách commit chênh lệch giữa local và remote qua RPC query `getSyncCommitList`.
3. **Tầng Safe Mutator & Query**:
   - Tận dụng `git log` có giới hạn hoặc Native Engine để truy xuất commit list:
     - Outgoing (Push): `git log @{u}..HEAD --oneline` (hoặc format JSON/NUL).
     - Incoming (Pull): `git log HEAD..@{u} --oneline` (sau khi `fetch`).
4. **Tầng Fast Layout / Engine**:
   - Tái sử dụng dữ liệu đồ thị DAG sẵn có trong bộ nhớ nếu các commit đã được nạp.

---

## 3. Khái Niệm Giao Diện & Dữ Liệu Hiển Thị

Mỗi mục commit trong bảng xem trước sẽ bao gồm:

- **Mã băm ngắn (Short Hash)**: 7 ký tự kèm màu sắc nhánh.
- **Tác giả & Avatar vi mô**: Tên người tạo commit.
- **Tiêu đề commit (Summary)**: Dòng thông điệp đầu tiên.
- **Thời gian tương đối**: (Ví dụ: `5m ago`, `2h ago`).
- **Nút thực thi xác nhận**: Cho phép kích hoạt `Push` hoặc `Pull` ngay trên chân bảng sau khi duyệt danh sách.

---

## 4. Đặc Tả Vị Trí Neo Hình Học Hướng Tâm (Radial Anchor Geometry)

Bảng xem trước được neo theo cạnh ngoài của cánh hoa `PUSH` hoặc `PULL`, không phải là hộp thoại modal che khuất màn hình. Toàn bộ tọa độ được tính từ trạm chỉ huy bánh xe (Wheel Cluster) đã định nghĩa ở Design 10 (Mục 3).

### 4.1. Hệ Tọa Độ & Các Hằng Số Hình Học Kế Thừa

- **Bán kính cánh hoa** `PETAL_RADIUS = 34` (đơn vị pixel).
- **Khoảng cách quỹ đạo** `ORBIT_DISTANCE = 76` (khoảng cách từ tâm hub đến tâm mỗi cánh hoa).
- **Bán kính ngoài cụm tổ ong** `HALF = ORBIT_DISTANCE + PETAL_RADIUS + GLOW_PADDING`, trong đó `GLOW_PADDING = 14` là vùng đệm phát sáng Neon.
- **Tâm cánh hoa** được xác định bằng phép biến đổi cực sang Descartes `polarToCartesian(angleDegrees, ORBIT_DISTANCE)` đối với mỗi góc pha.

### 4.2. Góc Pha & Vị Trí Cánh Hoa Nguồn

| Cánh Hoa            |   Góc Pha   | Vị Trí Tương Đối Tâm Hub               | Hướng Bung Flyout                      |
| :------------------ | :---------: | :------------------------------------- | :------------------------------------- |
| **PUSH** (outgoing) | $270^\circ$ | Trên đỉnh hub, tâm lệch $(0, -76)$     | Bay thẳng lên trên (căn giữa trục dọc) |
| **PULL** (incoming) | $330^\circ$ | Góc đông bắc, tâm lệch $(+65.82, -38)$ | Bay chéo sang góc đông bắc             |

### 4.3. Quy Tắc Neo Tọa Độ Flyout

1. **Khoảng dịch neo**: Điểm neo đặt tại mép ngoài vòng tròn ngoại tiếp cánh hoa, dịch thêm một khoảng đệm `FLYOUT_GAP = 12` pixel theo đúng phương bán kính hướng tâm (ra xa tâm hub) để flyout không che biểu tượng cánh hoa.
2. **Kích thước flyout**: Chiều rộng cố định `320px`, chiều cao tối đa `280px` (nội dung vượt quá sẽ cuộn bên trong, không thay đổi kích thước khung).
3. **Neo cho PUSH ($270^\circ$)**:
   - Flyout căn đáy dưới trùng với mép trên cánh hoa cộng khoảng đệm; tâm ngang của flyout trùng với trục dọc đi qua tâm cánh hoa PUSH.
   - Gốc biến đổi (`transform-origin`) đặt tại cạnh đáy giữa để hiệu ứng trượt mở theo phương từ dưới lên.
4. **Neo cho PULL ($330^\circ$)**:
   - Flyout căn cạnh trái trùng với mép phải cánh hoa cộng khoảng đệm; cạnh trên flyout căn gần mép trên cánh hoa để bay về phía đông bắc.
   - Gốc biến đổi đặt tại cạnh trái để hiệu ứng trượt mở theo phương từ phải sang trái.
5. **Bất biến Zero Layout Shift**: Flyout được định vị tuyệt đối (lớp overlay) bên trong cụm tổ ong và tuyệt đối không tham gia vào luồng layout của đồ thị DAG, thanh công cụ hay cánh hoa. Việc mở/đóng hoặc cuộn danh sách commit không làm xê dịch bất kỳ nút `HexagonNode` hay cánh hoa nào dù chỉ 1 pixel.

---

## 5. Đặc Tả Hợp Đồng Dữ Liệu & Truy Vấn RPC (`getSyncCommitList`)

Hợp đồng dữ liệu giao tiếp giữa Webview và Extension Host tuân thủ chuẩn Contract-First (Nguyên Tắc 1), định nghĩa kiểu trực tiếp tại `src/types/queries.ts` để tầng Webview import được mà không kéo theo Node.js runtime.

### 5.1. Bảng Từ Điển Dữ Liệu Bản Ghi Commit (`SyncCommitRecord`)

| Tên Thuộc Tính | Kiểu Dữ Liệu |            Ràng Buộc            | Mô Tả Ý Nghĩa                                               |
| :------------- | :----------- | :-----------------------------: | :---------------------------------------------------------- |
| `hash`         | string       | Chuỗi Hex SHA-1 đầy đủ 40 ký tự | Mã băm commit duy nhất, dùng cho đối chiếu và truy vết.     |
| `shortHash`    | string       |    Chuỗi Hex rút gọn 7 ký tự    | Mã băm ngắn hiển thị trên giao diện (Monospace).            |
| `author`       | string       |    Chuỗi UTF-8, có thể rỗng     | Tên hiển thị của tác giả commit.                            |
| `email`        | string       |    Chuỗi UTF-8, có thể rỗng     | Địa chỉ email tác giả (dùng cho avatar vi mô).              |
| `date`         | number       |    Số nguyên, mốc Unix giây     | Thời gian tác giả commit, dùng để tính thời gian tương đối. |
| `subject`      | string       |           Chuỗi UTF-8           | Dòng tiêu đề (dòng đầu tiên) của thông điệp commit.         |

### 5.2. Bảng Đặc Tả Hợp Đồng Query Request & Response

| Hạng Mục     | Cấu Trúc                                                                                                                                                          | Mô Tả Nghiệp Vụ                                                                                                                |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| **Request**  | `command: 'getSyncCommitList'`<br>`repo`: string (đường dẫn kho)<br>`mode`: `'outgoing' \| 'incoming' \| 'diverged'`                                              | Yêu cầu lấy danh sách commit chênh lệch cần đẩy (`outgoing`), cần kéo (`incoming`), hoặc cả hai phía khi phân kỳ (`diverged`). |
| **Response** | `mode`: `'outgoing' \| 'incoming' \| 'diverged'`<br>`commits`: `SyncCommitRecord[]`<br>`incomingCommits?`: `SyncCommitRecord[]`<br>`totalCount`: number ($\ge 0$) | Trả về danh sách commit; ở chế độ `diverged`, `commits` chứa outgoing và `incomingCommits` chứa danh sách remote bị lệch.      |

### 5.3. Phạm Vi Commit Chênh Lệch (Revision Range)

- **Outgoing (Push)**: Phạm vi `@{u}..HEAD` — các commit cục bộ chưa xuất hiện trên nhánh upstream theo dõi.
- **Incoming (Pull)**: Phạm vi `HEAD..@{u}` — các commit trên nhánh upstream theo dõi chưa được tích hợp vào HEAD.
- **Diverged (Phân kỳ)**: Truy vấn đồng thời cả 2 dải `@{u}..HEAD` (local ahead) và `HEAD..@{u}` (remote behind).
- **Không có upstream / Detached HEAD**: Lệnh Git thất bại, truy vấn fallback an toàn trả về danh sách rỗng thay vì ném ngoại lệ.

### 5.4. Quy Trình Xử Lý Thuật Toán Bóc Tách Byte NUL Chi Tiết

1. **Bước 1 (Thực thi lệnh Git)**:
   - Outgoing: `git log @{u}..HEAD --pretty=format:%H%x00%h%x00%an%x00%ae%x00%at%x00%s`.
   - Incoming: `git log HEAD..@{u} --pretty=format:%H%x00%h%x00%an%x00%ae%x00%at%x00%s`.
   - Diverged: Thực thi tuần tự hoặc song song cả hai lệnh trên qua `Promise.all`.
   - Thực thi qua `SimpleGit.raw(...)` để kế thừa `gitPath` và chống command injection bằng mảng chuỗi tham số.
2. **Bước 2 (Kiểm tra dữ liệu rỗng)**:
   - Nếu lệnh ném ngoại lệ hoặc `stdout` cắt khoảng trắng là rỗng: trả về `{ mode, commits: [], totalCount: 0 }`.
3. **Bước 3 (Bóc tách từng dòng qua byte NUL)** — hàm thuần `parseSyncCommitList(stdout)`:
   - Tách `stdout` thành mảng dòng bằng ký tự ngắt dòng `\n`.
   - Bỏ qua các dòng rỗng; mỗi dòng tách thành 6 trường phân cách bởi byte NUL theo thứ tự `hash`, `shortHash`, `author`, `email`, `date`, `subject`.
   - Ép kiểu `date` từ chuỗi sang số nguyên; trường hợp không hợp lệ gán `0`.
   - Bảo toàn nguyên vẹn dấu nháy kép, ký tự đặc biệt và Unicode tiếng Việt trong `author`/`subject` (byte NUL không thể xuất hiện trong thông điệp Git).
4. **Bước 4 (Trả kết quả chuẩn hóa)**: Trả về cấu trúc đồng bộ chuẩn hóa kèm số lượng bản ghi.

### 5.5. Trường Hợp Biên & Ranh Giới An Toàn

- **Danh sách rỗng** ($0$ commit): không hiển thị bảng trống trơ, thay vào đó hiển thị trạng thái rỗng (Empty State) có chủ đích.
- **Tiêu đề chứa dấu nháy kép hoặc xuống dòng**: `%s` chỉ giữ dòng tiêu đề đầu tiên; các ký tự đặc biệt được bảo toàn tuyệt đối nhờ phân tách NUL thay vì dấu phẩy/ống.
- **Số lượng commit rất lớn**: Thuật toán bóc tách một lần với độ phức tạp $O(N)$ tuyến tính, không nghẽn luồng IPC.

---

## 6. Đặc Tả Kho Trạng Thái Phản Ứng (Reactive Store)

Kho trạng thái `sync-inspector.store.ts` quản lý vòng đời mở/đóng và dữ liệu của flyout bằng Preact Signals.

### 6.1. Bảng Tín Hiệu & Trạng Thái

| Tín Hiệu                  | Kiểu Dữ Liệu                                     | Giá Trị Khởi Tạo | Mô Tả Ý Nghĩa                                                                    |
| :------------------------ | :----------------------------------------------- | :--------------: | :------------------------------------------------------------------------------- |
| `isInspectorOpen`         | `Signal<boolean>`                                |     `false`      | Cờ cho biết flyout đang mở hay đóng.                                             |
| `flyoutType`              | `Signal<'outgoing' \| 'incoming' \| 'diverged'>` |   `'outgoing'`   | Loại flyout đang hiển thị (outgoing = Push, incoming = Pull, diverged = cả hai). |
| `inspectedCommits`        | `Signal<SyncCommitRecord[]>`                     |       `[]`       | Danh sách commit outgoing đang được xem trước.                                   |
| `divergedIncomingCommits` | `Signal<SyncCommitRecord[]>`                     |       `[]`       | Danh sách commit incoming trên remote khi ở trạng thái phân kỳ `diverged`.       |
| `isLoading`               | `Signal<boolean>`                                |     `false`      | Cờ bận tải khi truy vấn RPC đang chạy.                                           |

### 6.2. Bảng Hàm Điều Phối (Store Action Dispatchers)

| Hàm                          | Tham Số                                        | Quy Trình Xử Lý                                                                                                                                                          |
| :--------------------------- | :--------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openInspector(mode)`        | `mode: 'outgoing' \| 'incoming' \| 'diverged'` | Gán `flyoutType = mode`, làm sạch danh sách commit cũ, bật `isInspectorOpen = true` và `isLoading = true`, rồi gửi RPC `getSyncCommitList` với `mode` tương ứng.         |
| `loadSyncCommitList(result)` | `{ mode, commits, incomingCommits? }`          | Chỉ chấp nhận phản hồi khi `result.mode` khớp `flyoutType` hiện tại; gán `inspectedCommits = commits`, gán `divergedIncomingCommits` nếu có, và tắt `isLoading = false`. |
| `closeInspector()`           | Không                                          | Đặt lại trạng thái sạch: `isInspectorOpen = false`, `isLoading = false`, `inspectedCommits = []`, `divergedIncomingCommits = []`.                                        |

### 6.3. Quy Tắc Tự Động Đóng

- Khi `closeWheel()` trong `wheel.store.ts` được gọi (bánh xe thu gọn về State 0), bắt buộc gọi kèm `closeInspector()` để flyout không bao giờ tồn tại độc lập khi bánh xe đã đóng.
- Khi đổi repository (`selectRepo`), flyout phải được đóng và dữ liệu cũ được xóa sạch.

---

## 7. Đặc Tả Luồng Tương Tác & Cơ Chế Xử Lý Lệch Commit (Divergence Resolution Flow)

Phần này trực tiếp giải quyết bài toán thực tế: **"Biết commit trên remote là rác do amend/sửa, muốn bỏ qua pull rác và ghi đè commit xịn lên remote mà không bị kẹt"**.

### 7.1. Ba Kịch Bản Hiển Thị Của Bảng Xem Trước

1. **Kịch bản 1: Chỉ có Outgoing (`aheadCount > 0`, `behindCount === 0`)**
   - Tiêu đề: `Outgoing Commits (N) → <upstream-branch>`.
   - Danh sách: Các commit cục bộ chuẩn bị đẩy lên.
   - Nút hành động: `[ Push Commits ]` (chạy `git push` thường).

2. **Kịch bản 2: Chỉ có Incoming (`behindCount > 0`, `aheadCount === 0`)**
   - Tiêu đề: `Incoming Commits (N) ← <upstream-branch>`.
   - Danh sách: Các commit trên remote chuẩn bị kéo về.
   - Nút hành động: `[ Pull (Merge) ]` và `[ Pull (Rebase) ]`.

3. **Kịch bản 3: Phân kỳ đối đầu (`aheadCount > 0` và `behindCount > 0`) — Cốt lõi của vấn đề Amend**
   - Xảy ra khi commit trên remote là bản cũ đã bị amend ở local.
   - Tiêu đề: `Branch Diverged (Ahead N, Behind M)`.
   - Bảng hiển thị 2 phân khu đối chiếu trực quan Cyber-Lab:
     - **Phân khu Local (Màu Cam Neon)**: `Local Commits (Will Replace Remote)` — chứa commit xịn mới của bạn.
     - **Phân khu Remote (Màu Xám / Đỏ gạch ngang)**: `Remote Commits (Will Be Overwritten)` — chứa commit rác cũ trên GitHub.
   - **Cơ chế 3 nút giải quyết phân kỳ dứt khoát tại chân bảng**:
     - 🚀 **`[ Replace Remote (Force Push with Lease) ]`**: Ghi đè an toàn commit mới lên remote và xóa sổ vĩnh viễn commit rác trên GitHub. Đây là hành động người dùng cần chọn khi cố tình sửa commit.
     - 🔄 **`[ Rebase on Remote ]`**: Kéo commit remote về và đặt commit local của bạn lên trên đỉnh.
     - 🔀 **`[ Merge Remote ]`**: Tạo commit hòa nhập hai nhánh.

### 7.2. Tương Tác Bàn Phím & Trợ Năng

1. **Phím `Esc` hai tầng**:
   - Lần 1 khi flyout đang mở: thu gọn flyout, bánh xe giữ nguyên State 2.
   - Lần 2 khi flyout đã đóng nhưng bánh xe vẫn bung: thu gọn bánh xe về State 0.
2. **Bấm chuột ra ngoài**: Nhấp vào lớp màn mờ (scrim) phía sau sẽ đóng flyout trước nếu đang mở, ngược lại đóng bánh xe.
3. **Chủ đề Dark & Light**: Outgoing viền Neon Cam `#f97316`, Incoming viền Neon Xanh lá `#10b981`, Diverged viền kép Cam/Đỏ kỹ thuật; Light Theme dùng phổ xanh lam blueprint mềm mại, không gây chói lóa.

---

## 8. Ma Trận Kiểm Thử Đơn Vị Song Hành & Kịch Bản E2E

### 8.1. Ma Trận Kiểm Thử Đơn Vị

| Tệp Kiểm Thử                                              | Module Mục Tiêu                                     | Kịch Bản Kiểm Thử Bắt Buộc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :-------------------------------------------------------- | :-------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/backend/queries/syncCommitList.test.ts`            | `src/backend/queries/syncCommitList.ts`             | 1. **Parser 1 commit**: bóc tách đúng 6 trường từ chuỗi NUL thành một `SyncCommitRecord`.<br>2. **Parser nhiều commit**: bảo toàn thứ tự và đủ số lượng bản ghi.<br>3. **Danh sách rỗng**: chuỗi rỗng/khoảng trắng trả về `[]`.<br>4. **Ký tự đặc biệt**: tiêu đề chứa dấu nháy kép, dấu hai chấm và Unicode tiếng Việt không gãy chuỗi.<br>5. **Phạm vi outgoing/incoming**: `syncRange('outgoing')` = `@{u}..HEAD`, `syncRange('incoming')` = `HEAD..@{u}`.<br>6. **Tích hợp repo thật**: tạo commit cục bộ → outgoing liệt kê đúng commit; tạo commit remote rồi fetch → incoming liệt kê đúng commit.<br>7. **Bẫy lỗi**: kho không có upstream trả về `commits: []` không ném ngoại lệ. |
| `tests/webview/stores/syncInspectorStore.test.ts`         | `src/webview/lib/stores/sync-inspector.store.ts`    | 1. **Khởi tạo**: `isInspectorOpen = false`, `inspectedCommits = []`.<br>2. **Mở flyout**: `openInspector('outgoing')` bật `isLoading = true` và gửi RPC.<br>3. **Nhận phản hồi**: `loadSyncCommitList` nạp commit, tắt `isLoading`.<br>4. **Chống phản hồi lỗi thời**: phản hồi khác `mode` bị bỏ qua.<br>5. **Đóng**: `closeInspector()` đặt lại trạng thái sạch.<br>6. **Tự động đóng**: gọi `closeWheel()` kéo theo flyout đóng.                                                                                                                                                                                                                                                         |
| `tests/webview/components/wheel/SyncCommitFlyout.test.ts` | `src/webview/components/wheel/SyncCommitFlyout.tsx` | 1. **Khung đinh tán**: render trong `CornerCrossFrame` có 4 đinh tán `+`.<br>2. **Tiêu đề động**: `Outgoing Commits (3)` hoặc `Incoming Commits (2)`.<br>3. **Trạng thái tải**: hiển thị Loading Skeleton khi `isLoading = true`.<br>4. **Trạng thái rỗng**: hiển thị Empty State khi không có commit.<br>5. **Nút xác nhận**: bấm `Push Now`/`Pull Now` kích hoạt hành động đồng bộ và đóng flyout.                                                                                                                                                                                                                                                                                        |

### 8.2. Kịch Bản E2E / Component Flow

1. Tạo một commit cục bộ → `aheadCount = 1`.
2. Mở bánh xe sang State 2.
3. Bấm biểu tượng xem trước trên cánh hoa Push → flyout hiển thị đúng commit vừa tạo.
4. Bấm `Push Now` → hoàn thành đồng bộ, flyout và bánh xe tự đóng.

---

## 9. Lịch Sử Sửa Đổi Thiết Kế (Revision History)

| Phiên Bản  |    Ngày    |     Phân Loại     |  Người Sửa   | Nội Dung Thay Đổi & Căn Nguyên Kỹ Thuật                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :--------: | :--------: | :---------------: | :----------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.0.0** | 2026-10-20 |      Tạo mới      | AI Architect | Khởi tạo bản phác thảo tầm nhìn, ranh giới kiến trúc 4 tầng và khái niệm giao diện cho Sync Commit List Inspector Flyout.                                                                                                                                                                                                                                                                                                                                                    |
| **v1.1.0** | 2026-10-20 | Hoàn thiện đặc tả | AI Architect | Hoàn thiện 3 đầu việc còn bỏ ngỏ ở Mục 4: đặc tả neo hình học hướng tâm ($270^\circ$/$330^\circ$), hợp đồng dữ liệu RPC `getSyncCommitList` (từ điển `SyncCommitRecord`, thuật toán bóc tách NUL, phạm vi `@{u}..HEAD`/`HEAD..@{u}`), đặc tả kho trạng thái phản ứng, luồng tương tác hai tầng `Esc` và ma trận kiểm thử song hành kèm kịch bản E2E. Đồng bộ tên tín hiệu chuẩn `isInspectorOpen`/`flyoutType`/`inspectedCommits`/`isLoading` thay cho bộ tên sơ bộ ban đầu. |
