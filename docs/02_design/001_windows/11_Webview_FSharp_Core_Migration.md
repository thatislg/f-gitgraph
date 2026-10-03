# 11. Thiết Kế Di Trú Tầng Webview Sang Nhân F# Core Engine & Vận Hành Thực Tế (Webview F# Core Migration)

Tài liệu này đặc tả chi tiết thiết kế kỹ thuật đưa nhân **F# Core Engine Native AOT** (`f-gitgraph-core.exe`) vào vận hành thực tế 100% trong toàn bộ quy trình hiển thị đồ thị của F-GitGraph, thay thế triệt để luồng nạp và tính toán đơn luồng cũ bằng TypeScript trong Webview.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nghiêm ngặt nguyên tắc: **100% mô tả bằng ngôn ngữ tự nhiên**, tập trung vào kiến trúc điều phối, luồng truyền phát dữ liệu nhị phân, cấu trúc cửa sổ ảo và ranh giới trách nhiệm giữa F# và Preact Webview, tuyệt đối không sử dụng mã nguồn mẫu.

---

## 1. Bối Cảnh, Mục Tiêu & Yêu Cầu Cốt Lõi

### 1.1. Bối Cảnh Kỹ Thuật Hiện Trạng

1. **Nhân F# đã sẵn sàng nhưng đang ở chế độ chờ (Idle)**:
   - Các nhóm việc 1 đến 5 đã hoàn thành việc xây dựng file thực thi độc lập `f-gitgraph-core.exe` (Native AOT), tích hợp LibGit2 C-binding in-process, đọc file nhị phân `commit-graph`, thuật toán phân làn đồ thị song song đa luồng CPU và tiến trình Stdio IPC Daemon.
   - Khi mở extension, tiến trình F# đã được khởi động ngầm và duy trì nhịp tim (Heartbeat 10s), nhưng chưa thực sự được giao việc tính toán đồ thị chính thức cho người dùng.
2. **Webview vẫn đang chạy luồng TypeScript cũ**:
   - Webview Preact hiện tại vẫn đang gửi yêu cầu qua giao thức thông điệp cũ, gọi hàm trích xuất log bằng dòng lệnh và tự tính toán layout đơn luồng bằng JavaScript trong trình duyệt.
   - Điều này làm triệt tiêu ưu thế tốc độ vượt trội của nhân F# Native AOT trên các kho mã nguồn quy mô lớn (20.000 – 100.000+ commits).

### 1.2. Mục Tiêu Tối Thượng của Nhóm Việc 11

- **Đưa F# vào trung tâm vận hành thực tế**: Nhân F# Native AOT phải là nguồn tính toán duy nhất cung cấp cấu trúc topo, phân chia làn và tọa độ hình học phẳng cho Webview.
- **Biến Webview thành Dumb Renderer hoàn chỉnh**: Giải phóng hoàn toàn trình duyệt khỏi việc chạy các thuật toán đồ thị nặng nề, Webview chỉ tiếp nhận tọa độ có sẵn để render trực tiếp SVG các nút lục giác, vầng sáng neon và đường cong phân nhánh.
- **Cơ chế truyền phát cửa sổ ảo (Virtual Scrolling Window)**: Webview chỉ yêu cầu và nhận đúng khung commit nằm trong tầm nhìn hiển thị cộng thêm vùng đệm (buffer) thông qua RPC tốc độ dưới 5ms, bảo đảm tốc độ khung hình 60 FPS mượt mà.
- **Thanh lý triệt để luồng truy vấn cũ**: Cắt bỏ hoàn toàn các lệnh nạp commit cũ, hoàn tất mục tiêu dọn dẹp hệ thống không còn phụ thuộc vào backend TypeScript truy vấn Git.

---

## 2. Kiến Trúc Luồng Điều Phối Dữ Liệu (Data Pipeline Architecture)

### 2.1. Phân Định Ranh Giới Trách Nhiệm

1. **F# Core Engine (`f-gitgraph-core.exe`)**:
   - Quét cấu trúc DAG trực tiếp từ file nhị phân `.git/objects/info/commit-graph` hoặc LibGit2.
   - Sắp xếp thứ tự Topo Kahn ưu tiên thế hệ thời gian trên đa luồng CPU.
   - Phân bổ làn thu gọn về bên trái (Left-compact Lane Allocation) với thuật toán tái sử dụng làn.
   - Tính toán sẵn toàn bộ tọa độ tâm nút $(x, y)$, bán kính lục giác, chuỗi lệnh vẽ đường cong Bezier SVG cho các nhánh rẽ và điểm sáp nhập (Merge).
   - Truyền phát gói tin nhị phân siêu nén MessagePack qua đường ống Stdio RPC trong dưới 1ms.
2. **Extension Host (`GraphDataBridge` & RPC Server)**:
   - Đóng vai trò cầu nối điều phối: Gọi lệnh khởi tạo repo với F# sidecar.
   - Gộp dữ liệu hình học từ F# (vị trí, làn, đường nối) với dữ liệu metadata văn bản của commit (tên tác giả, email, ngày tháng, thông điệp tóm tắt, nhãn refs nhánh/tag) theo từng trang hiển thị.
   - Phản hồi dữ liệu cho Webview qua cổng giao tiếp RPC chuẩn hóa (`graph.load` và `graph.window`).
3. **Webview Preact (Giao diện người dùng)**:
   - Gửi yêu cầu nạp đồ thị khi mở kho mã nguồn hoặc khi người dùng cuộn trang.
   - Nhận mảng dữ liệu dòng phẳng đã có sẵn hình học, đưa thẳng vào các component giao diện Phase 1 (Nút lục giác `HexagonNode`, Vầng sáng `NeonAmbient`, Panel xem chi tiết `CommitHoverPanel`).
   - Tuyệt đối không chạy bất kỳ vòng lặp tính toán đồ thị nào trên luồng chính của trình duyệt.

### 2.2. Đặc Tả Giao Thức RPC Cho Đồ Thị

Toàn bộ giao tiếp giữa Webview và Extension Host được chuẩn hóa qua 3 phương thức RPC:

1. **Khởi tạo Đồ thị (`graph.load`)**:
   - _Tham số đầu vào_: Đường dẫn tuyệt đối của kho mã nguồn Git và cấu hình hiển thị (nhánh hiện tại hay toàn bộ nhánh).
   - _Hành vi_: Extension Host chuyển tiếp yêu cầu đến F# sidecar để nạp DAG, phân làn và tạo chỉ mục bộ nhớ cache.
   - _Kết quả trả về_: Tổng số lượng commit trong kho, số làn tối đa của đồ thị, danh sách mã băm commit theo thứ tự topo hiển thị, và khung dữ liệu cửa sổ đầu tiên.
2. **Truy vấn Cửa sổ Hiển thị (`graph.window`)**:
   - _Tham số đầu vào_: Chỉ số dòng bắt đầu (`from`) và chỉ số dòng kết thúc (`to`) tương ứng với vị trí thanh cuộn trên giao diện.
   - _Hành vi_: F# sidecar trích xuất lát cắt hình học từ cache nội bộ; Extension Host gộp metadata tương ứng và trả về gói dữ liệu phẳng.
   - _Kết quả trả về_: Mảng các dòng đồ thị sẵn sàng vẽ, kèm theo danh sách các đoạn đường nối SVG (Paths) đi qua phạm vi cửa sổ này.
3. **Cập nhật Vi sai Biến động Kho (`graph.invalidate`)**:
   - _Kích hoạt_: File Watcher phát hiện thay đổi trong `.git/HEAD` hoặc `.git/refs/**` (sau khi người dùng commit, checkout, pull, merge).
   - _Hành vi_: Gửi tín hiệu làm mới bộ nhớ đệm tới F# sidecar để tái tính toán đồ thị vi sai; Extension Host chủ động bắn sự kiện thông báo xuống Webview để kích hoạt nạp lại khung nhìn hiện hành.

---

## 3. Cơ Chế Chuyển Đổi Webview Thành "Dumb Renderer"

### 3.1. Thay Thế Hoàn Toàn Thuật Toán JavaScript Cũ

- **Hiện trạng cũ**: Webview lưu trữ một danh sách commit thô, mỗi lần nạp thêm dữ liệu lại phải kích hoạt hàm giải thuật đồ thị đơn luồng để tính lại toàn bộ tọa độ, gây ra hiện tượng giật khung hình và đóng băng UI khi danh sách commit dài.
- **Cơ chế mới**:
  - Loại bỏ hoàn toàn module tính toán đồ thị nội bộ trong Webview.
  - Component vẽ cột đồ thị (`CommitGraph`) chỉ đơn giản duyệt qua mảng dữ liệu hình học nhận được từ RPC `graph.window`:
    - Vẽ các thẻ đường dẫn `<path>` SVG dựa trên chuỗi lệnh vẽ Bezier có sẵn từ F#.
    - Đặt các component `<HexagonNode>` vào chính xác tọa độ tâm `(x, y)` được F# cấp phát.
    - Gắn màu sắc cố định theo chỉ số làn (`lane`) do F# quản lý.

### 3.2. Quản Lý Cuộn Trang Ảo (Virtual Scrolling Synchronization)

- Để tối ưu hóa bộ nhớ DOM trên các kho chứa hàng chục nghìn commit, Webview duy trì một khung nhìn ảo:
  - Chiều cao tổng thể của bảng danh sách được tính toán dựa trên tổng số commit do F# trả về nhân với chiều cao dòng cố định (24px).
  - Bộ theo dõi sự kiện cuộn (Scroll Listener) tính toán khoảng chỉ số dòng đang xuất hiện trên màn hình, tự động bổ sung vùng đệm an toàn phía trên và phía dưới (mỗi phía 50 – 100 dòng) để gọi RPC `graph.window`.
  - Nhờ độ trễ IPC của F# đạt dưới 1ms, dữ liệu luôn sẵn sàng trước khi mắt người dùng cuộn tới mép, loại bỏ hoàn toàn hiện tượng chớp nháy hoặc khoảng trống trắng.

---

## 4. Danh Mục Các Nhiệm Vụ Con Chi Tiết (Detailed Subtasks)

---

### 📋 Nhiệm vụ 11.1: Tích hợp Cầu Nối `GraphDataBridge` vào Luồng Điều Phối Extension Host

- Kết nối lớp `GraphDataBridge` vào vòng đời của Extension: Khởi tạo cầu nối khi mở tab F-GitGraph và giải phóng khi đóng tab.
- Xây dựng module trích xuất metadata nhanh (`MetadataProvider`): Đọc thông tin tác giả, email, ngày tháng, thông điệp commit từ Git để gộp đồng bộ với tọa độ hình học do F# sinh ra.
- Hoàn thiện bộ xử lý RPC `graph.load` và `graph.window` trong Extension Host, bảo đảm trả về cấu trúc dữ liệu phẳng hoàn chỉnh cho Webview.

---

### 📋 Nhiệm vụ 11.2: Tái Cấu Trúc Tầng Store & Hành Động Trong Webview Preact

- Thay thế toàn bộ logic phát yêu cầu `loadCommits` cũ trong module hành động giao diện bằng lệnh gọi RPC `rpcClient.request("graph.load")`.
- Xây dựng Store quản lý dữ liệu đồ thị theo cửa sổ ảo (`graph-window.store.ts`): Lưu trữ cửa sổ dòng hiện tại, trạng thái tải và danh sách đường nối SVG.
- Cập nhật cơ chế cuộn trang của Webview để kích hoạt gọi `graph.window` khi vị trí cuộn dịch chuyển ra ngoài phạm vi vùng đệm an toàn.

---

### 📋 Nhiệm vụ 11.3: Chuyển Đổi Component `CommitGraph` Sang Vẽ Trực Tiếp Tọa Độ F#

- Điều chỉnh component `CommitGraph.tsx` và `CommitRow.tsx`: Trực tiếp sử dụng thuộc tính tọa độ `(x, y)`, bán kính và đường vẽ SVG từ dữ liệu F#, xóa bỏ hoàn toàn việc gọi hàm tính layout JavaScript.
- Bảo tồn nguyên vẹn 100% các tính năng thị giác cao cấp từ Phase 1: Nút lục giác clipping avatar, vầng sáng neon ambient theo màu nhánh, viền tím tiêu điểm khi chọn dòng, tương tác rê chuột xem panel commit message và nhấp chuột phóng to avatar 5x.

---

### 📋 Nhiệm vụ 11.4: Tích Hợp Cơ Chế Cập Nhật Vi Sai & Đồng Bộ Hóa Watcher

- Nối sự kiện phát hiện biến động kho mã nguồn từ `git-ref.watcher` và `coalescer` vào hàm làm mới bộ nhớ đệm `sidecar.invalidate()`.
- Phát thông báo RPC từ Extension Host xuống Webview khi có commit mới hoặc khi chuyển nhánh, kích hoạt Webview tự động nạp lại cửa sổ hiện hành một cách mượt mà không làm mất vị trí cuộn của người dùng.

---

### 📋 Nhiệm vụ 11.5: Thanh Lý Triệt Để Luồng Truy Vấn TS Cũ & Kiểm Định Toàn Diện

- Xóa bỏ hoàn toàn mã nguồn truy vấn Git regex cũ bằng TypeScript (`src/backend/queries/loadCommits.ts`) và các thông điệp tiếp nhận tương ứng trong `messageHandler.ts`.
- Chạy toàn bộ các bài kiểm thử tự động (Unit Test, Integration Test, Typecheck, Lint) bảo đảm 0 lỗi biên dịch, 0 cảnh báo.
- Kiểm định thực tế trên kho mã nguồn quy mô lớn (50.000 commits): Xác nhận tiến trình `f-gitgraph-core.exe` vận hành thực tế, CPU đồ thị đạt tốc độ phản hồi tức thời dưới 300ms và mức tiêu thụ RAM ổn định.

---

## 5. Tiêu Chuẩn Nghiệm Thu Hoàn Thành (Definition of Done - DoD)

1. **F# Vận Hành Thực Tế 100%**: Khi mở F-GitGraph và cuộn đồ thị, tiến trình `f-gitgraph-core.exe` trực tiếp xử lý các yêu cầu tính toán hình học; không còn bất kỳ dòng code JavaScript nào trong Webview tự giải thuật toán layout.
2. **Hiệu Năng Đỉnh Cao**: Thời gian phản hồi từ lúc Webview yêu cầu nạp cửa sổ đến khi nhận được dữ liệu vẽ từ F# đạt mốc **dưới 5 mili-giây**.
3. **Bảo Tồn Thị Giác Phase 1**: Toàn bộ hệ thống nút lục giác, vầng sáng neon, hiệu ứng hover/selected và panel commit message hiển thị chuẩn xác từng pixel.
4. **Không Suy Thoái Chức Năng**: Các thao tác xem chi tiết commit, diff tệp tin, chuyển nhánh, tạo nhánh, merge nhánh vẫn vận hành hoàn hảo và an toàn.
5. **Mã Nguồn Tinh Gọn**: Loại bỏ dứt điểm module `loadCommits.ts` cũ, toàn bộ hệ thống đạt chuẩn kiến trúc Thin Client + Native Heavy Engine sạch sẽ.
