# Tiến Độ Phase 1: Windows First Milestone (Xây Dựng Nền Móng Nhân F#)

Tài liệu này ghi nhận tổng quan mục tiêu, bảng ánh xạ tài liệu thiết kế áp dụng, phạm vi công việc chi tiết hóa từng nhiệm vụ con (subtasks), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 1: Xây dựng nền móng nhân F# Core Engine trên môi trường Windows**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào tiến độ, kiến trúc và luồng xử lý kỹ thuật, không sử dụng mã nguồn mẫu.

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm nhìn & Mục tiêu Cốt lõi

- **Mục tiêu**: Xây dựng thành công bản nhị phân F# Native AOT đầu tiên (`f-gitgraph-core.exe`) chạy độc lập trên Windows 10/11, thay thế toàn bộ tầng nạp dữ liệu và tính toán layout đơn luồng hiện tại của TypeScript.
- **Trọng tâm kỹ thuật**:
  - Triệt tiêu độ trễ spawn tiến trình dòng lệnh `CreateProcessW` trên Windows bằng cách đọc trực tiếp qua thư viện C gốc LibGit2 và cơ chế ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) với file `commit-graph`.
  - Phân bổ làn đồ thị song song đa luồng CPU trên F#, tính toán sẵn toàn bộ tọa độ hình học trước khi chuyển sang giao diện.
  - Kết nối hoàn hảo với tầng giao diện Webview Preact đã hoàn thiện ở Phase 1 (các nút lục giác, vầng sáng neon ambient, xem trước avatar zoom 5x, panel commit message).
  - Bảo đảm an toàn tuyệt đối 100% cho các thao tác ghi (commit, push, pull, rebase...) bằng cách tiếp tục định tuyến qua Git gốc (`git.exe`).

### 1.2. Trạng Thái Hiện Tại (Status)

- **Trạng thái**: Nhóm Việc 1 đến 10 đã hoàn thành 100%; Nhóm Việc 11 (Di trú Webview sang nhân F# Core Engine) đã hoàn thành nối dây và dọn dẹp backend cũ; Nhóm Việc 12 (Khắc phục sự cố hiển thị đồ thị & đồng bộ hình học F# - Webview) chính thức được kích hoạt để giải quyết triệt để 6 lỗi thực tế theo Báo cáo điều tra `REP-WIN-011` và Bản thiết kế 12.
- **Tiến độ tổng thể**: 10/12 nhóm việc hoàn thành. Nhóm Việc 11 và Nhóm Việc 12 đang được triển khai sửa chữa và kiểm định đồng bộ trước khi đánh dấu hoàn tất.

---

## 2. Bảng Ánh Xạ Tài Liệu Thiết Kế Áp Dụng Cho Từng Nhóm Việc

Toàn bộ quá trình hiện thực hóa các nhóm việc kỹ thuật bên dưới bắt buộc phải bám sát hệ thống tài liệu thiết kế chi tiết tương ứng nằm trong thư mục **[docs/02_design/001_windows/](../02_design/001_windows/README.md)**:

|  STT   | Nhóm Việc Kỹ Thuật                                    | Tài Liệu Thiết Kế Chi Tiết Bắt Buộc Áp Dụng                                                                         | Phạm Vi Thiết Kế Trọng Tâm                                                                                                                                                  |
| :----: | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | **Khởi Tạo Dự Án F# & Native AOT**                    | **[01_Project_Structure_And_NativeAOT.md](../02_design/001_windows/01_Project_Structure_And_NativeAOT.md)**         | Cấu trúc phân tầng `src/core-engine/`, cờ xuất bản Native AOT (`win-x64`), cắt tỉa Trimming, LTO, kiểm định máy sạch.                                                       |
| **2**  | **Tầng Miền Nghiệp Vụ & Bảng Mã Lỗi**                 | **[02_Domain_Model_And_Error_Taxonomy.md](../02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md)**         | Thực thể GitHash, Author, CommitNode, GitRef, trạng thái In-Flight (`MERGE_HEAD`, `rebase-merge`), bảng lỗi vét cạn qua kiểu `Result`.                                      |
| **3**  | **Tầng Đọc Dữ Liệu Git Tốc Độ Cao**                   | **[03_Fast_Git_Storage_Reader.md](../02_design/001_windows/03_Fast_Git_Storage_Reader.md)**                         | Tích hợp LibGit2 C-binding in-process, Memory-Mapped File đọc `commit-graph`, Zero-Allocation Span, giải mã UTF-8 tiếng Việt.                                               |
| **4**  | **Thuật Toán Xếp Làn Đồ Thị Topo Song Song**          | **[04_Parallel_DAG_Layout_Solver.md](../02_design/001_windows/04_Parallel_DAG_Layout_Solver.md)**                   | Sắp xếp Topo xử lý shallow/orphan/multi-root, phân bổ làn thu gọn bên trái (Lane Pool), tính toán song song đa luồng CPU tọa độ SVG.                                        |
| **5**  | **Giao Thức Giao Tiếp Nội Bộ (IPC Daemon)**           | **[05_IPC_Stdio_Streaming_Protocol.md](../02_design/001_windows/05_IPC_Stdio_Streaming_Protocol.md)**               | Quản lý vòng đời tiến trình F# sidecar, cấu trúc khung gói tin Stdio RPC MessagePack, phân trang cửa sổ ảo (Virtual Scrolling).                                             |
| **6**  | **Ghép Nối Webview & Lệnh Ghi An Toàn**               | **[06_Webview_Integration_And_Git_Mutator.md](../02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md)** | Ghép nối dữ liệu hình học phẳng vào Webview Preact Phase 1, ủy thác 100% lệnh ghi cho `git.exe`, File Watcher cập nhật vi sai.                                              |
| **7**  | **Kiểm Thử Nghiệm Thu & Benchmark**                   | **[07_Benchmarking_And_Verification_Plan.md](../02_design/001_windows/07_Benchmarking_And_Verification_Plan.md)**   | Kịch bản kiểm thử tương đương đồ thị 100%, đo đạc 4 chỉ số benchmark định lượng, bảng kiểm tra an toàn dữ liệu Git, đóng gói VSIX Windows.                                  |
| **8**  | **Dọn Dẹp Tàn Dư & Chuẩn Hóa Nhận Diện Thương Hiệu**  | **[08_Rebranding_And_Identity_Cleanup.md](../02_design/001_windows/08_Rebranding_And_Identity_Cleanup.md)**         | Tái thiết kế tài liệu README/CHANGELOG/NLS, dọn sạch metadata và tệp tàn dư.                                                                                                |
| **9**  | **Dọn Dẹp Backend TS Cũ & Tinh Giản Tài Nguyên Thừa** | **[09_Legacy_TS_Backend_Cleanup.md](../02_design/001_windows/09_Legacy_TS_Backend_Cleanup.md)**                     | Xóa bỏ Nix và localization tiếng Trung; di chuyển domain types sang `src/types/`; xóa bỏ tầng truy vấn Git regex cũ bằng TS (`src/backend/queries/`, `src/old-extension/`). |
| **10** | **Thiết Kế Hệ Thống Biểu Tượng & Icon F-GitGraph**    | **[10_Extension_Iconography_Design.md](../02_design/001_windows/10_Extension_Iconography_Design.md)**               | Ý tưởng sáng tạo F-Branch & Neon Hexagon, bảng kiểm kê 7 vị trí icon (128x128 PNG, 512x512 Master, SVG Webview Tab, Activity Bar, Status Bar).                              |
| **11** | **Di Trú Webview Sang Nhân F# Core Engine**           | **[11_Webview_FSharp_Core_Migration.md](../02_design/001_windows/11_Webview_FSharp_Core_Migration.md)**             | Đưa F# vào vận hành thực tế 100%, Webview Dumb Renderer, nạp đồ thị qua RPC `graph.load`/`graph.window`, xóa `loadCommits` cũ.                                              |
| **12** | **Khắc Phục Sự Cố Đồ Thị & Đồng Bộ Hình Học**         | **[12_Graph_Rendering_And_Webview_Fix_Design.md](../02_design/001_windows/12_Graph_Rendering_And_Webview_Fix_Design.md)** | Khắc phục 6 sự cố hiển thị đồ thị và suy thoái giao diện: chống trùng màu làn, dãn nở khi mở commit, khép làn root commit, token badge ref và đồng bộ mép cột.             |

---

## 3. Danh Mục Các Đầu Việc & Nhiệm Vụ Con Chi Tiết (Detailed Subtasks)

---

### 📋 Nhóm Việc 1: Khởi Tạo Dự Án F# & Cấu Hình Biên Dịch Native AOT

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/01_Project_Structure_And_NativeAOT.md](../02_design/001_windows/01_Project_Structure_And_NativeAOT.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để cấu trúc các thư mục con trong `src/core-engine/`, Mục 2 để áp dụng các thiết lập xuất bản Native AOT (Trimming, LTO, Symbol Stripping, Invariant Globalization), và Mục 4 để thực thi quy trình kiểm định tính độc lập trên máy Windows sạch.

- [x] **Nhiệm vụ 1.1: Thiết lập cấu trúc dự án và phân chia module logic**
  - Khởi tạo thư mục mã nguồn `src/core-engine/` chứa dự án F# độc lập dưới dạng Console Application.
  - Phân chia các module chức năng riêng biệt: Module miền nghiệp vụ (`Domain`), Module truy cập lưu trữ (`Storage`), Module giải thuật đồ thị (`Graph`), Module giao tiếp nội bộ (`Transport`), và Module điều phối chính (`Program`).
  - Đảm bảo tính độc lập tuyệt đối giữa nhân tính toán F# và mã nguồn TypeScript của VS Code Extension.

- [x] **Nhiệm vụ 1.2: Cấu hình xuất bản mã máy Native AOT cho Windows 64-bit (`win-x64`)**
  - Kích hoạt cơ chế biên dịch Native AOT trong tệp cấu hình dự án F# để loại bỏ mã bytecode trung gian, liên kết tĩnh toàn bộ runtime tối thiểu cần thiết vào file thực thi.
  - Thiết lập các cờ tối ưu hóa kích thước và hiệu năng: lược bỏ biểu tượng gỡ lỗi dư thừa (Symbol Stripping), tối ưu hóa liên kết toàn diện (Link Time Optimization - LTO).
  - Đảm bảo quy trình biên dịch tương thích với bộ công cụ xây dựng C++ tiêu chuẩn trên Windows (MSVC Build Tools).

- [x] **Nhiệm vụ 1.3: Kiểm định tính độc lập và đo đạc benchmark khởi động trên Windows**
  - Kiểm tra file thực thi sinh ra (`f-gitgraph-core.exe`) trên một môi trường Windows sạch (máy không cài đặt .NET SDK hoặc .NET Runtime) để xác nhận tính độc lập hoàn toàn.
  - Đo đạc thời gian khởi động lạnh (Cold-start latency) bằng lệnh kiểm tra phản hồi tức thời: mục tiêu đạt dưới 5 phần nghìn giây.
  - Kiểm tra dung lượng file thực thi độc lập đầu ra: mục tiêu nằm trong khoảng tối ưu từ 6MB đến 9MB.

---

### 📋 Nhóm Việc 2: Xây Dựng Tầng Miền Nghiệp Vụ & Mô Hình Hóa Lỗi (Domain Model)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md](../02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để định nghĩa các kiểu thực thể Git cốt lõi (`GitHash`, `Author`, `CommitNode`, `GitRef`), Mục 2 để định nghĩa các trạng thái biến động dở dang (`InFlightState`), Mục 3 để xây dựng bảng mã lỗi hệ thống vét cạn, và Mục 4 để áp dụng nguyên tắc xử lý lỗi qua kiểu kết quả `Result`.

- [x] **Nhiệm vụ 2.1: Mô hình hóa các thực thể cốt lõi của Git (Core Entities)**
  - Định nghĩa kiểu dữ liệu mã băm Git bất biến: hỗ trợ đồng thời cả chuẩn SHA-1 truyền thống (40 ký tự hexa) và chuẩn SHA-256 hiện đại (64 ký tự hexa), tích hợp hàm sinh chuỗi viết tắt (7 ký tự) phục vụ hiển thị.
  - Định nghĩa thực thể tác giả (Author/Committer): bao gồm tên, địa chỉ email, nhãn thời gian Unix và độ lệch múi giờ địa phương.
  - Định nghĩa thực thể Commit: mã băm đối tượng, danh sách mã băm của các commit cha (xử lý chính xác trường hợp commit gốc không có cha, commit thông thường có 1 cha, commit gộp có 2 cha, và commit sáp nhập đa nhánh Octopus Merge có từ 3 cha trở lên), tiêu đề tóm tắt và nội dung chi tiết.
  - Định nghĩa thực thể tham chiếu Git (GitRef): phân loại rõ ràng nhánh cục bộ (ghi nhận cờ nhánh đang checkout), nhánh máy chủ từ xa, thẻ phát hành phiên bản chính thức (Release Tag), thẻ tiền phát hành (Prerelease Tag) và điểm lưu trữ tạm thời (Stash).

- [x] **Nhiệm vụ 2.2: Mô hình hóa các trạng thái kho mã nguồn đang biến động dở dang (In-Flight States)**
  - Trạng thái sạch bình thường (Clean state).
  - Trạng thái đang sáp nhập dở (Merging): đọc và phân tích thông tin từ tệp `MERGE_HEAD` và `MERGE_MSG` trong thư mục Git để trích xuất commit đang merge và thông điệp xung đột.
  - Trạng thái đang rebase dở (Rebasing): kiểm tra thư mục `rebase-merge` hoặc `rebase-apply` để xác định bước hiện tại, tổng số bước và nhánh gốc đang rebase.
  - Trạng thái đang chọn lọc commit dở (Cherry-picking): kiểm tra tệp `CHERRY_PICK_HEAD`.
  - Trạng thái đang tìm lỗi nhị phân (Bisecting): đọc tệp nhật ký `BISECT_LOG` để đánh dấu các commit tốt, commit lỗi và commit bỏ qua.

- [x] **Nhiệm vụ 2.3: Xây dựng bảng phân loại lỗi hệ thống vét cạn (Exhaustive Error Taxonomy)**
  - Định nghĩa kiểu lỗi bằng Discriminated Unions của F# bao quát toàn bộ các tình huống thất bại: không tìm thấy kho mã nguồn, xung đột file khóa `index.lock` (kèm thời gian tồn tại của khóa để phát hiện khóa mồ côi), tên nhánh đã tồn tại, xóa nhánh chưa merge, xung đột tệp tin khi chuyển nhánh, thiếu commit cha trong bản sao nông (shallow clone), đối tượng git bị hỏng hoặc lỗi từ thư viện C gốc.
  - Quy định toàn bộ hàm nghiệp vụ trong engine bắt buộc trả về kiểu kết quả `Result` (Thành công mang dữ liệu hoặc Thất bại mang mã lỗi chi tiết), loại trừ hoàn toàn việc văng ngoại lệ bất ngờ làm sập tiến trình.

---

### 📋 Nhóm Việc 3: Tầng Đọc Dữ Liệu Git Tốc Độ Cao Trên Windows (Fast Git Reader)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/03_Fast_Git_Storage_Reader.md](../02_design/001_windows/03_Fast_Git_Storage_Reader.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để tích hợp LibGit2 C-binding in-process qua P/Invoke, Mục 2 để triển khai module ánh xạ bộ nhớ (Memory-Mapped Files) đọc trực tiếp cấu trúc nhị phân của tệp `commit-graph` kèm cơ chế dự phòng, và Mục 3 để áp dụng kỹ thuật lát cắt bộ nhớ `ReadOnlySpan<byte>` giải mã chuỗi UTF-8 tiếng Việt chuẩn xác.

- [x] **Nhiệm vụ 3.1: Tích hợp thư viện C gốc LibGit2 trên Windows**
  - Cấu hình liên kết thư viện mã máy LibGit2 (`libgit2.dll`) tương thích hoàn toàn với chế độ Native AOT trên Windows 64-bit.
  - Thiết lập giao diện gọi hàm trực tiếp (P/Invoke) an toàn cho các tác vụ: mở kho mã nguồn trên đĩa, khởi tạo bộ duyệt lịch sử commit (`git_revwalk`), nạp danh sách commit cha và trích xuất thông tin tác giả.

- [x] **Nhiệm vụ 3.2: Module đọc trực tiếp file nhị phân Commit-Graph bằng ánh xạ bộ nhớ (Memory-Mapped Files)**
  - Phân tích cấu trúc bảng mục lục nhị phân của tệp `commit-graph` nằm trong thư mục `.git/objects/info/`.
  - Ứng dụng kỹ thuật ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) của Windows để nạp toàn bộ cấu trúc đồ thị hàng trăm nghìn commit vào không gian địa chỉ RAM trong thời gian từ 1 đến 2 phần nghìn giây.
  - Xây dựng cơ chế dự phòng tự động (Fallback): trong trường hợp kho mã nguồn cũ chưa được bật tính năng tạo file `commit-graph`, engine tự động chuyển sang đọc tuần tự qua LibGit2 mà không làm gián đoạn trải nghiệm người dùng.

- [x] **Nhiệm vụ 3.3: Tối ưu hóa bộ nhớ Zero-Allocation & Xử lý mã hóa UTF-8 tiếng Việt**
  - Sử dụng các lát cắt bộ nhớ liên tục (`ReadOnlySpan<byte>`) để trích xuất các trường văn bản trực tiếp từ bộ đệm của LibGit2, không cấp phát chuỗi trung gian vào bộ nhớ heap thu gom rác.
  - Giải mã trực tiếp mảng byte UTF-8 thô sang chuỗi ký tự .NET đúng chuẩn, khắc phục triệt để lỗi hiển thị tiếng Việt có dấu bị mã hóa thành chuỗi bát phân (octal escape) thường gặp trên Git CLI Windows.

---

### 📋 Nhóm Việc 4: Thuật Toán Xếp Làn Đồ Thị Topo Song Song (Parallel DAG Solver)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/04_Parallel_DAG_Layout_Solver.md](../02_design/001_windows/04_Parallel_DAG_Layout_Solver.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để áp dụng thuật toán sắp xếp Topo xử lý các trường hợp đặc biệt (bản sao nông, nhánh mồ côi, kho đa gốc), Mục 2 để hiện thực thuật toán phân bổ làn thu gọn bên trái (Lane Pool) và cơ chế bảo toàn màu sắc nhánh, và Mục 3 để phân chia khối tính toán song song đa luồng CPU sinh mảng tọa độ hình học SVG.

- [x] **Nhiệm vụ 4.1: Chuyển đổi và tinh gọn thuật toán sắp xếp Topo (Topological Sort)**
  - Hiện thực thuật toán sắp xếp topo dựa trên phả hệ cha-con và thứ tự thời gian tạo commit, đảm bảo commit con luôn xuất hiện phía trên commit cha.
  - Xử lý các tình huống đồ thị đặc biệt: bản sao nông (`--depth`) bị thiếu commit cha ở đáy, nhánh mồ côi (orphan branch), và kho mã nguồn có nhiều gốc độc lập (Multi-root DAG Forest).

- [x] **Nhiệm vụ 4.2: Thuật toán phân bổ làn đồ thị thu gọn về bên trái (Left-compact Lane Allocation)**
  - Xây dựng cơ chế bể làn hoạt động (Lane Pool): khi duyệt qua từng commit, tìm kiếm làn đang trỏ tới commit đó để tiếp tục kéo dài làn.
  - Khi một nhánh mới được tách ra, engine tìm kiếm làn trống đầu tiên nằm ở bên trái để tái sử dụng, giúp đồ thị luôn thu gọn sát mép trái và không bị giãn rộng vô tận ra màn hình.
  - Gán chỉ số màu sắc cố định cho từng nhánh theo thuật toán modulo luân phiên, bảo đảm màu sắc của một nhánh giữ nguyên tính nhất quán trong suốt quá trình cuộn trang.

- [x] **Nhiệm vụ 4.3: Tính toán song song đa luồng tọa độ hình học SVG**
  - Phân chia danh sách commit thành các khối (batches) và phân bổ tính toán song song trên nhiều lõi CPU của máy tính.
  - Tính toán sẵn toàn bộ tọa độ tâm nút lục giác (tọa độ x, y), các điểm nút giao nhau, đường cong bezier nối giữa commit cha và commit con, đường rẽ nhánh và đường sáp nhập.
  - Đóng gói dữ liệu hình học thành cấu trúc mảng phẳng, sẵn sàng để giao diện Webview chỉ việc vẽ trực tiếp (Dumb Renderer) mà không cần tính toán thêm bất kỳ phép topo nào.

---

### 📋 Nhóm Việc 5: Giao Thức Giao Tiếp Nội Bộ (IPC Daemon & Streaming)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/05_IPC_Stdio_Streaming_Protocol.md](../02_design/001_windows/05_IPC_Stdio_Streaming_Protocol.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để xây dựng module quản lý vòng đời tiến trình F# sidecar trong TypeScript (khởi động ngầm, heartbeat ping-pong, tự phục hồi khi crash, thu hồi tài nguyên an toàn), Mục 2 để đặc tả cấu trúc khung gói tin nhị phân Stdio RPC và bảng mã Opcode MessagePack, và Mục 3 để hiện thực cơ chế phân trang cửa sổ ảo (Virtual Scrolling Window Streaming).

- [x] **Nhiệm vụ 5.1: Xây dựng cơ chế quản lý vòng đời tiến trình F# Sidecar**
  - Viết module điều phối trong TypeScript: tự động khởi chạy tiến trình `f-gitgraph-core.exe` ở chế độ chạy nền khi người dùng mở bảng Git Graph.
  - Thiết lập cơ chế giám sát nhịp tim (Heartbeat) và tự phục hồi: nếu tiến trình native gặp sự cố bất ngờ, tự động khởi động lại và khôi phục trạng thái gần nhất.
  - Tự động hủy tiến trình con một cách an toàn khi người dùng đóng tab Git Graph để giải phóng toàn bộ tài nguyên CPU và RAM.

- [x] **Nhiệm vụ 5.2: Giao thức truyền thông nhị phân siêu nén qua Stdio RPC**
  - Thiết lập kênh trao đổi thông điệp qua hai đường ống xuất nhập chuẩn (`stdin`/`stdout`).
  - Ứng dụng định dạng nhị phân MessagePack với tiêu đề gói tin cố định (bao gồm độ dài gói tin, mã định danh yêu cầu và nội dung dữ liệu nhị phân).
  - Triệt tiêu hoàn toàn chi phí tuần tự hóa chuỗi khổng lồ (`JSON.stringify`) và giải nén chuỗi (`JSON.parse`), giảm độ trễ đóng gói dữ liệu từ vài giây xuống dưới 50 phần nghìn giây.

- [x] **Nhiệm vụ 5.3: Cơ chế phân trang cửa sổ ảo (Virtual Scrolling Window Streaming)**
  - Thiết lập luồng truyền dữ liệu theo khung nhìn hiển thị: Webview chỉ gửi yêu cầu dải chỉ số dòng đang nhìn thấy (ví dụ từ dòng 100 đến dòng 300) kèm một vùng đệm an toàn phía trên và phía dưới.
  - Engine F# truy xuất bộ nhớ đệm và stream trả về đúng phạm vi commit kèm tọa độ đồ thị tương ứng trong thời gian dưới 5 phần nghìn giây.

---

### 📋 Nhóm Việc 6: Ghép Nối Với Giao Diện Webview & Bảo Toàn Lệnh Ghi

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md](../02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để tích hợp dữ liệu hình học phẳng vào các component Preact Phase 1 (CommitTable, CommitGraph, HexagonNode, RefLabel, CommitHoverPanel, AvatarZoomPreview), Mục 2 để xây dựng module `GitCliMutator.ts` ủy thác 100% lệnh ghi cho `git.exe` gốc để bảo toàn GPG/SSH và Git Credential Manager, và Mục 3 để cài đặt File Watcher cập nhật vi sai (Debounce 150ms).

- [x] **Nhiệm vụ 6.1: Ghép nối dữ liệu hình học vào tầng Webview Preact (Phase 1)**
  - Cập nhật module tiếp nhận dữ liệu trong Webview để giải mã các gói tin nhị phân và truyền trực tiếp tọa độ hình học vào bảng commit.
  - Bảo toàn 100% các thành phần giao diện đã hoàn thiện trong Phase 1: vẽ nút lục giác chuẩn SVG clip-path, hiệu ứng vầng sáng neon ambient khi rê chuột hoặc chọn dòng, tương tác nhấp icon avatar hiển thị xem trước 5x kèm tên tác giả, panel hiển thị đầy đủ tiêu đề và nội dung commit.

- [x] **Nhiệm vụ 6.2: Module thực thi thao tác ghi an toàn qua Git gốc (`GitCliMutator.ts`)**
  - Tách bạch ranh giới tuyệt đối: F# Engine chỉ phụ trách việc đọc và tính toán (Read Pipeline), toàn bộ các thao tác ghi (Write Pipeline) được chuyển giao cho Git CLI gốc.
  - Các thao tác: tạo commit, tạo nhánh mới, xóa nhánh (xóa an toàn `-d` và ép xóa `-D`), chuyển nhánh (checkout), sáp nhập nhánh (merge), tái cơ cấu (rebase), chọn lọc commit (cherry-pick), gắn thẻ phiên bản (tag), đẩy code (push) và kéo code (pull) đều được thực hiện qua tiến trình `git.exe` của người dùng.
  - Bảo toàn trọn vẹn chữ ký số commit (GPG/SSH Commit Signing) và cơ chế đăng nhập, xác thực tài khoản doanh nghiệp (Git Credential Manager / SSO).

- [x] **Nhiệm vụ 6.3: Cơ chế cập nhật vi sai khi kho mã nguồn thay đổi (Incremental Update)**
  - Thiết lập bộ theo dõi tệp (File Watcher) lắng nghe các biến động trong thư mục `.git/refs/` và tệp `.git/HEAD`.
  - Khi người dùng thực hiện commit mới hoặc chuyển đổi nhánh, engine F# chỉ tính toán lại phần thay đổi vi sai trên đồ thị và stream ngay lập tức cho Webview mà không cần quét lại toàn bộ kho mã nguồn từ đầu.

---

### 📋 Nhóm Việc 7: Kiểm Thử Nghiệm Thu & Đo Đạc Hiệu Năng Thực Tế (Benchmarking)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/07_Benchmarking_And_Verification_Plan.md](../02_design/001_windows/07_Benchmarking_And_Verification_Plan.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để áp dụng kế hoạch kiểm thử so sánh tính tương đương đồ thị 100% trên 3 quy mô kho mã nguồn, Mục 2 để thực hiện quy trình đo đạc 4 chỉ số hiệu năng định lượng trên Windows, và Mục 3 để đối chiếu bảng kiểm tra an toàn dữ liệu Git trước khi hoàn tất nghiệm thu.

- [x] **Nhiệm vụ 7.1: Bộ kiểm thử so sánh tính tương đương đồ thị (Equivalence Testing)**
  - Xây dựng kịch bản kiểm thử tự động so sánh kết quả tính toán đồ thị giữa thuật toán F# mới và thuật toán TypeScript cũ trên các kho mã nguồn mẫu.
  - Xác nhận tính chính xác 100% về vị trí nút, thứ tự commit, màu sắc nhánh và các liên kết cha-con.

- [x] **Nhiệm vụ 7.2: Đo đạc và lập báo cáo hiệu năng thực tế trên Windows**
  - Đo đạc thời gian nạp ban đầu (Cold-load time) trên kho mã nguồn có 50.000 commits: mục tiêu đạt dưới 300 phần nghìn giây.
  - Đo đạc mức độ chiếm dụng bộ nhớ RAM của tiến trình F#: mục tiêu duy trì dưới 100MB RAM.
  - Đo đạc tốc độ khung hình (FPS) khi cuộn nhanh qua hàng nghìn dòng commit trên Webview: mục tiêu đạt 60 khung hình/giây mượt mà, không có hiện tượng khựng chuột hay giật giao diện.

- [x] **Nhiệm vụ 7.3: Đóng gói bản cài đặt thử nghiệm Windows VSIX (Local Windows Packaging & Testing)**
  - Thu thập file thực thi `f-gitgraph-core.exe` Native AOT và thư viện C gốc `git2-5853918.dll` vào thư mục phân phối nội bộ của extension (`bin/win-x64/`).
  - Cập nhật cơ chế phân giải đường dẫn sidecar (`SidecarManager`) nhận diện chính xác vị trí binary thông qua `context.asAbsolutePath(...)` trong cả môi trường phát triển (F5 Extension Host) lẫn môi trường chạy thực tế từ gói VSIX.
  - Cấu hình danh mục tệp trong `.vscodeignore` để đưa thư mục `bin/win-x64/` vào gói cài đặt VSIX, tránh việc bị loại bỏ khi đóng gói.
  - Thiết lập kịch bản lệnh đóng gói (`package:vsix:win`) bằng `@vscode/vsce`, tạo ra file `.vsix` hoàn chỉnh dành riêng cho Windows 64-bit và tiến hành cài đặt kiểm thử thực tế (`code --install-extension`) trước khi kết thúc Phase 1.

---

### 📋 Nhóm Việc 8: Dọn Dẹp Tàn Dư & Chuẩn Hóa Nhận Diện Thương Hiệu (Rebranding & Identity Cleanup)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/08_Rebranding_And_Identity_Cleanup.md](../02_design/001_windows/08_Rebranding_And_Identity_Cleanup.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 1 để nắm rõ định vị thương hiệu F-GitGraph, Mục 2 để tái thiết kế bộ tài nguyên hình ảnh (Icon chính, Webview SVG, Dark/Light, Demo GIF), Mục 3 để làm mới toàn diện tài liệu người dùng (README, CHANGELOG, NLS), Mục 4 để rà soát sạch tàn dư mã nguồn & metadata gói, và Mục 5 để nghiệm thu diện mạo nhận diện trên VS Code.

- [ ] **Nhiệm vụ 8.1: Thiết kế lại bộ nhận diện hình ảnh & Biểu tượng Extension (Iconography & Brand Assets)**
  - Thiết kế lại biểu tượng chính của extension (`resources/icon.png`, kích thước chuẩn 128x128 / 256x256) mang phong cách riêng của **F-GitGraph** (kết hợp chữ "F" hiện đại, làn đồ thị và họa tiết lục giác neon ambient).
  - Cập nhật bộ vector SVG cho Webview Tab Icon (`resources/webview-icon.svg`, `resources/webview-icon-dark.svg`, `resources/webview-icon-light.svg`) theo phong cách lục giác phẳng, hỗ trợ hiển thị tương phản cao trên cả theme Dark và Light.
  - Lên phương án chụp lại/tạo mới ảnh động demo (`resources/demo.gif`) phản ánh đúng các tính năng giao diện đột phá mới: nút lục giác SVG, hiệu ứng vầng sáng neon ambient, xem trước avatar zoom 5x, panel commit message.

- [x] **Nhiệm vụ 8.2: Làm mới toàn diện tài liệu người dùng & Thông tin gói (Documentation & Package Metadata)**
  - Cập nhật toàn bộ nội dung [README.md](../../../README.md): viết lại phần giới thiệu làm nổi bật kiến trúc nhân kép (TypeScript UI + F# Native AOT Core siêu tốc), loại bỏ thông tin cũ của repo tiền nhiệm, bổ sung hướng dẫn tính năng mới và bảng cấu hình `f-gitgraph.*`.
  - Cập nhật [CHANGELOG.md](../../../CHANGELOG.md): thiết lập mốc phiên bản mới ghi nhận sự ra đời của **F-GitGraph**, tổng hợp toàn bộ các cải tiến vượt bậc về hiệu năng và giao diện.
  - Chuẩn hóa các tệp bản địa hóa giao diện ([package.nls.json](../../../package.nls.json), `package.nls.zh-cn.json`, `package.nls.zh-tw.json`): rà soát và điều chỉnh câu từ mô tả tính năng cho chính xác với thương hiệu F-GitGraph.

- [x] **Nhiệm vụ 8.3: Rà soát & Loại bỏ triệt để chuỗi nội bộ, bản quyền và metadata cũ**
  - Rà soát thông tin `publisher`, `author`, `sponsor` trong [package.json](../../../package.json) để đảm bảo tính nhất quán với định danh phát hành `lmo-lab`.
  - Dọn dẹp các tệp build tạm, artifact cũ mang tên `neo-git-*` trên đĩa.
  - Kiểm tra toàn bộ mã nguồn để đảm bảo không còn chuỗi User-Agent, Scheme hay Telemetry cũ nào của neo-git-graph còn sót lại.

- [x] **Nhiệm vụ 8.4: Đóng gói lại bản cài đặt VSIX với nhận diện thương hiệu hoàn chỉnh**
  - Thực hiện build lại bản nhị phân F# Native AOT và xuất bản gói cài đặt VSIX mới (`f-gitgraph-win-x64.vsix`).
  - Kiểm tra hiển thị icon, tên extension và tài liệu README ngay trên trình quản lý Extension của VS Code khi cài đặt file VSIX.

---

### 📋 Nhóm Việc 9: Dọn Dẹp Mã Nguồn Backend TypeScript Cũ & Tinh Giản Tài Nguyên Thừa

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/09_Legacy_TS_Backend_Cleanup.md](../02_design/001_windows/09_Legacy_TS_Backend_Cleanup.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 2.1 để thực thi thanh lý tài nguyên Nix và localization tiếng Trung, Mục 2.2 để thực hiện lộ trình di chuyển kiểu dữ liệu sang `src/types/`, Mục 2.3 để loại bỏ tầng truy vấn Git regex cũ bằng TS (`src/backend/queries/` và `src/old-extension/`), và Mục 2.4 để kiểm định toàn diện zero-regression.

- [x] **Nhiệm vụ 9.1: Loại bỏ tài nguyên thừa ngoài phạm vi (Nix & Localization tiếng Trung)**
  - Xóa bỏ triệt để các tệp cấu hình đóng gói Nix không sử dụng: `flake.nix` và `flake.lock`.
  - Xóa bỏ các gói bản địa hóa tiếng Trung không nằm trong định hướng phát triển: `package.nls.zh-cn.json`, `package.nls.zh-tw.json`, `l10n/bundle.l10n.zh-cn.json`, `l10n/bundle.l10n.zh-tw.json`.
  - Xác minh toàn bộ quy trình biên dịch kiểm tra kiểu tĩnh và đóng gói vẫn duy trì trạng thái 0 lỗi.

- [x] **Nhiệm vụ 9.2: Di chuyển & chuẩn hóa Hệ thống Kiểu Dữ Liệu (Domain Types Migration)**
  - Tái cấu trúc thư mục `src/types/` thành nguồn chân lý duy nhất (Single Source of Truth) cho các thực thể Git (`GitCommitNode`, `GitRef`, `GitFileChange`, `GitCommitDetails`, `GitResetMode`) và các thông điệp hành động (`ActionRequest`, `ActionResponse`).
  - Cập nhật toàn bộ các câu lệnh import trong `src/webview/` và `src/extension/` trỏ trực tiếp vào `@/types`.
  - Giải phóng hoàn toàn sự phụ thuộc của tầng giao diện vào thư mục `src/backend/types/`.

- [x] **Nhiệm vụ 9.3: Thanh lý tầng truy vấn Git TS cũ & hợp nhất dịch vụ tiện ích**
  - Xóa bỏ các module truy vấn Git regex bằng dòng lệnh cũ trong `src/backend/queries/` (`loadCommits.ts`, `loadBranches.ts`, `commitDetails.ts`, `repoSearch.ts`) vốn đã được thay thế hoàn toàn bởi F# Native AOT (`Storage` & `Graph`).
  - Rà soát `src/old-extension/`: chuyển giao các dịch vụ còn cần thiết (Avatar Manager, Diff Document Provider) sang tầng `src/extension/` hiện đại và xóa bỏ các tệp dead code thừa (`initExtension.ts`, `main.ts`, `webviewHtml.ts`, `webviewPanel.ts`...).
  - Đảm bảo `GitCliMutator` an toàn tiếp tục quản lý các thao tác ghi Git trong cấu trúc thư mục mới.

- [x] **Nhiệm vụ 9.4: Kiểm định toàn diện không suy thoái (Zero-Regression Verification)**
  - Chạy toàn bộ bộ test tự động (`pnpm run test`, `dotnet test`, `pnpm run typecheck`, `pnpm run lint`).
  - Đóng gói thử nghiệm cục bộ và xác minh extension hoạt động trơn tru, không còn bất kỳ dấu vết nào của backend TS cũ.

---

### 📋 Nhóm Việc 10: Thiết Kế Hệ Thống Biểu Tượng & Icon F-GitGraph

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/10_Extension_Iconography_Design.md](../02_design/001_windows/10_Extension_Iconography_Design.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 2 để áp dụng ý tưởng thiết kế "Neon Hexagon & F-Branch" (Cyberpunk Modern), Mục 3 để đối chiếu bảng kiểm kê 7 vị trí icon cần thiết (128x128 PNG, 512x512 Master, SVG Webview Tab đa sắc/đơn sắc Dark-Light, Activity Bar SVG), và Mục 4 để tuân thủ quy chuẩn kỹ thuật đồ họa vector/raster.

- [x] **Nhiệm vụ 10.1: Chốt ý tưởng thiết kế thị giác & cấu trúc hình học SVG gốc**
  - Đã chốt chính thức phong cách thị giác chủ đạo: **Ý Tưởng 1 ("Neon Hexagon & F-Branch" - Cyberpunk Modern)** kết hợp chữ "F" phân nhánh Git với các nút commit hình khối lục giác phát sáng neon.
  - Phê duyệt bảng kiểm kê 7 vị trí icon cần thiết (128x128 PNG, 512x512 Master, SVG Webview Tab đa sắc / Dark / Light, Activity Bar, Status Bar) và quy chuẩn kỹ thuật an toàn hiển thị.

- [x] **Nhiệm vụ 10.2: Xuất bản trọn bộ Icon Raster (PNG) cho Marketplace & Extension Details**
  - Tạo `resources/icon.png` (128x128 px): Nền squircle bo góc carbon tối (`#0B0F19`), chữ F nhánh neon Cyan (`#00F0FF`) và Fuchsia (`#FF007F`), khoảng đệm an toàn 12px.
  - Tạo `resources/icon-512.png` (512x512 px master): Bản vẽ độ phân giải cao phục vụ trang hiển thị Marketplace trên trình duyệt web và ảnh banner README.

- [x] **Nhiệm vụ 10.3: Hoàn thiện & tối ưu hóa bộ Icon Vector SVG cho VS Code Tab & Sidebar**
  - Thiết kế `resources/webview-icon.svg` (24x24 px): Biến thể đa sắc với các nút lục giác màu neon dành cho tab editor.
  - Thiết kế `resources/webview-icon-dark.svg` (24x24 px): Biến thể đơn sắc sáng tương phản cao (`#E0E0E0`) dành cho VS Code Dark Theme.
  - Thiết kế `resources/webview-icon-light.svg` (24x24 px): Biến thể đơn sắc tối (`#333333`) dành cho VS Code Light Theme.
  - Thiết kế dự phòng `resources/activitybar-icon.svg` (24x24 px): Icon đơn sắc `currentColor` cho thanh Activity Bar bên trái.
  - Thiết kế dự phòng `resources/status-bar-icon.svg` (16x16 px): Icon đơn sắc `currentColor` cho thanh Status Bar góc dưới màn hình.

- [x] **Nhiệm vụ 10.4: Tích hợp vào hệ thống đóng gói & kiểm thử hiển thị đa Theme**
  - Tích hợp các icon mới vào `package.json`, `view-command.ts` và quy trình đóng gói VSIX.
  - Kiểm tra thực tế trên VS Code: hiển thị tab bar, icon trong danh sách extension, và hiển thị chuẩn xác khi chuyển đổi qua lại giữa Dark+ và Light+.

---

### 📋 Nhóm Việc 11: Di Trú Tầng Webview Sang Nhân F# Core Engine & Vận Hành Thực Tế

> 📖 **Tài liệu thiết kế chi tiết áp dụng**:
> - Thiết kế di trú tổng thể: **[docs/02_design/001_windows/11_Webview_FSharp_Core_Migration.md](../02_design/001_windows/11_Webview_FSharp_Core_Migration.md)**
> - Thiết kế khắc phục sự cố & đồng bộ hình học: **[docs/02_design/001_windows/12_Graph_Rendering_And_Webview_Fix_Design.md](../02_design/001_windows/12_Graph_Rendering_And_Webview_Fix_Design.md)**
> - Hồ sơ điều tra sự cố tập trung: **[docs/04_reports/001_windows/011_Webview_FSharp_Core_Migration_Investigation.md](../04_reports/001_windows/011_Webview_FSharp_Core_Migration_Investigation.md)**
>
> _Trạng thái kiểm định_: 🟡 **Đang khắc phục sự cố (Chưa hoàn thành)**. Mặc dù mã nguồn kết nối sơ bộ đã hoàn thành, quá trình chạy thực tế ghi nhận 4 lỗi hiển thị nghiêm trọng (xung đột màu làn, biến dạng khi mở commit, rò rỉ dưới root commit, mất màu nền badge ref) cùng 2 lỗi hình học bổ trợ (sát mép cột graph, nạp avatar). Toàn bộ Nhóm Việc 11 chưa thể nghiệm thu cho tới khi các lỗi được sửa chữa và kiểm định đạt 100%.

- [x] **Nhiệm vụ 11.1: Tích hợp Cầu Nối `GraphDataBridge` vào Luồng Điều Phối Extension Host**
  - Khởi tạo và quản lý vòng đời `GraphDataBridge` trong Extension Host, kết nối trực tiếp với thể hiện `SidecarManager` đang chạy.
  - Xây dựng module trích xuất metadata nhanh (`MetadataProvider`) để gộp thông tin commit (tác giả, ngày tháng, thông điệp, nhãn nhánh/tag) với dữ liệu hình học phẳng từ F#.
  - Hoàn thiện bộ xử lý RPC `graph.load` và `graph.window` trong Extension Host, trả về dữ liệu chuẩn cho Webview.

- [ ] **Nhiệm vụ 11.2: Tái Cấu Trúc Tầng Store & Hành Động Trong Webview Preact**
  - Thay thế toàn bộ logic phát yêu cầu `loadCommits` cũ trong Webview bằng lệnh gọi RPC `rpcClient.request("graph.load")`.
  - Xây dựng Store quản lý dữ liệu đồ thị theo cửa sổ ảo (`graph-window.store.ts`): Lưu trữ danh sách dòng hiển thị, trạng thái tải và danh sách đường nối SVG.
  - Cập nhật cơ chế cuộn trang của Webview để kích hoạt gọi RPC `graph.window` khi người dùng cuộn ra ngoài phạm vi vùng đệm an toàn.
  - _Tồn đọng cần xử lý_: Bổ sung cơ chế bù trừ dãn nở (`expansion offset`) vào phép tính dải cửa sổ ảo để không làm mất các dòng commit phía dưới khi mở panel chi tiết.

- [ ] **Nhiệm vụ 11.3: Chuyển Đổi Component `CommitGraph` Sang Vẽ Trực Tiếp Tọa Độ F#**
  - Điều chỉnh component `CommitGraph.tsx` và `CommitRow.tsx`: Trực tiếp sử dụng thuộc tính tọa độ `(x, y)`, bán kính và đường vẽ SVG từ dữ liệu F#, loại bỏ hoàn toàn việc chạy hàm tính layout JavaScript cũ.
  - Bảo tồn nguyên vẹn 100% các tính năng thị giác Phase 1: Nút lục giác clipping avatar, vầng sáng neon ambient, viền tím tiêu điểm khi chọn commit, panel commit message và avatar zoom 5x.
  - _Tồn đọng cần xử lý_: Sửa thuật toán phân bổ màu sắc F# chống trùng màu làn kề nhau (`BUG-01`), biến đổi chuỗi lệnh vẽ SVG `path.d` thích ứng khi mở rộng dòng commit (`BUG-02`), khép làn dứt khoát tại root commit (`BUG-03`), khôi phục token màu badge ref trong CSS Tailwind v4 (`BUG-04`), và đồng bộ hằng số hình học mép cột graph `LaneWidth = 20px`, `Margin = 16px` (`BUG-05`).

- [ ] **Nhiệm vụ 11.5: Thanh Lý Triệt Để Luồng Truy Vấn TS Cũ & Kiểm Định Ban Đầu**
  - Xóa bỏ hoàn toàn mã nguồn truy vấn Git regex cũ bằng TypeScript (`src/backend/queries/loadCommits.ts`) và các thông điệp tiếp nhận tương ứng trong `messageHandler.ts`.
  - Chạy toàn bộ các bài kiểm thử tự động (Unit Test, Integration Test, Typecheck, Lint) bảo đảm 0 lỗi biên dịch, 0 cảnh báo.
  - _Đánh giá thực tế_: Quá trình chạy thử nghiệm ban đầu bộc lộ các suy thoái giao diện và xung đột màu sắc, do đó toàn bộ các tồn đọng hiển thị được tách thành Nhóm Việc 12 để giải quyết triệt để.

---

### 📋 Nhóm Việc 12: Khắc Phục Sự Cố Hiển Thị Đồ Thị & Đồng Bộ Hình Học F# - Webview

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/12_Graph_Rendering_And_Webview_Fix_Design.md](../02_design/001_windows/12_Graph_Rendering_And_Webview_Fix_Design.md)**
>
> _Nội dung thiết kế hướng dẫn_: Tham khảo Mục 2 để áp dụng thuật toán kế thừa màu nhánh và chống trùng màu kề cạnh, Mục 3 để thực hiện chuyển đổi hình học thích ứng khi mở commit details, Mục 4 để đồng bộ hệ tọa độ Y theo cửa sổ ảo và khép kín đồ thị tại commit gốc, Mục 5 để bổ sung token màu badge ref trong Tailwind v4, Mục 6 để đồng bộ hằng số hình học mép cột và nạp avatar cửa sổ ảo, và Mục 7 để thực hiện đầy đủ 7 nhiệm vụ con bên dưới.

- [x] **Nhiệm vụ 12.1: Khôi phục Token Màu Nền Badge Nhánh/Tag trong Tailwind CSS v4 (`BUG-04`)**
  - Khai báo bổ sung `--color-editor-fg: var(--vscode-foreground)` và `--color-graph-fg: var(--vscode-editor-foreground, #FFFFFF)` vào directive `@theme` trong `src/webview/styles.css`.
  - Chuẩn hóa các class tiện ích trong `src/webview/components/commit/RefLabel.tsx`, bảo đảm badge hiển thị khối nền sẫm độ mờ $12\% - 15\%$ và viền sắc nét, loại bỏ hiện tượng nền trong suốt nhìn xuyên thấu trang.

- [x] **Nhiệm vụ 12.2: Đồng bộ Hằng số Hình học & Khoảng đệm An toàn Mép Cột Graph (`BUG-05`)**
  - Đồng bộ hằng số hình học trong F# Core `src/core-engine/Graph/Graph.fs`: Nâng `LaneWidth` lên **`20.0 px`** (thay vì 16.0 px) và `Margin` lên **`16.0 px`** (thay vì 10.0 px).
  - Khớp nối chuẩn xác với `LANE_WIDTH = 20`, `LANE_OFFSET = 16`, `GRAPH_PADDING = 20` trong `src/webview/constants.ts` và công thức tính chiều rộng cột, duy trì khoảng đệm an toàn tối thiểu $5.5\text{ px}$ ở cả hai mép trái và phải khi phóng to node 1.15x.

- [x] **Nhiệm vụ 12.3: Tối ưu Thuật toán Phân bổ Màu sắc Làn & Chống Trùng Màu Nhánh trong F# Core (`BUG-01`)**
  - Cải tiến hàm phân bổ làn `Lanes.assign` và gán màu: Duy trì định danh màu ổn định theo chuỗi commit cha thứ nhất (First-parent chain) từ lúc rẽ nhánh đến lúc sáp nhập.
  - Cài đặt giải thuật chống trùng màu kề cạnh: Khi cấp làn mới, kiểm tra màu của các làn lân cận (`lane - 1`, `lane + 1`) để chọn màu trong bảng palette có khoảng cách lớn nhất.
  - Sửa hàm sinh đường nối `makePath`: Gán đúng màu của nhánh con cho đường rẽ nhánh (Fork) và màu của nhánh phụ cho đường sáp nhập (Merge-in).

- [x] **Nhiệm vụ 12.4: Cơ chế Chuyển đổi Hình học Thích ứng khi Mở rộng Commit trong Webview (`BUG-02`)**
  - Quy chuẩn một hàm ánh xạ tọa độ thẳng đứng duy nhất (`rowY`): Gom toàn bộ phép tính chuyển đổi từ chỉ số dòng sang tọa độ $Y$ cho cả hai đầu đường nối (`y0`, `y1`) lẫn tâm nút lục giác (`cy`) và ảnh avatar, triệt tiêu hiện tượng lệch pha tính toán $Y$ ở hai nơi độc lập.
  - Áp dụng nghiêm ngặt quy tắc dãn nở `row > e` (Lớn hơn, tuyệt đối không dùng Lớn hơn hoặc bằng): Node của chính commit đang mở tại dòng $e$ giữ nguyên vị trí ở mép trên panel, chỉ các node và mốc nối phía dưới mới được cộng bù chiều cao dãn nở $H$.
  - Tách đoạn thẳng đứng khi đi xuyên qua panel chi tiết: Nghiêm cấm kéo dãn cong Bezier cả đoạn; tách đường nối thành 3 phân đoạn và kết xuất đoạn chạy xuyên qua panel dưới dạng đường thẳng đứng mờ nghệ thuật ($30\% - 40\%$) theo đúng trục hoành của làn.
  - Đồng bộ hóa đa tầng layer avatar: Tọa độ ảnh đại diện `<image>` (`y = cy - radius`), vùng cắt mặt nạ đa giác `<clipPath>` và điểm gốc biến đổi `transformOrigin` của thẻ `<g>` phải cùng cập nhật theo `cy` mới; kích hoạt re-render đồng thời cho cả layer đường vẽ SVG và layer node lục giác khi toggle mở rộng.
  - Bù trừ độ dãn nở chiều cao vào công thức cuộn trang ảo trong `src/webview/lib/stores/graph-window.store.ts` để các node phía dưới không bị đẩy ra ngoài khung nhìn.

- [x] **Nhiệm vụ 12.5: Đồng bộ Hệ tọa độ Y Theo Cửa Sổ Ảo & Khép Kín Đồ Thị Tại Commit Gốc (`BUG-03`)**
  - Dịch gốc tọa độ Y về đầu cửa sổ ảo trong F# `Transport.fs` (khắc phục nguyên nhân gốc): tầng `QueryRange` trừ `dy = fromRow * RowHeight` cho mỗi node và sinh lại chuỗi lệnh SVG `d` của đường nối từ tọa độ đã dịch, để không còn node/line bị vẽ lệch xuống dưới commit gốc khi cuộn.
  - Giữ nguyên cơ chế giải phóng làn tại commit gốc (đã có sẵn trong `Lanes.assign`), bảo đảm không sinh đường nối nào vượt quá dòng commit cuối cùng; giới hạn khung SVG khớp đúng dòng cuối cùng của bảng danh sách commit.

- [x] **Nhiệm vụ 12.6: Tối ưu Cơ chế Nạp Avatar Đồng bộ với Dải Cửa Sổ Ảo (`BUG-06`)**
  - Kết nối bộ nạp avatar trong Webview với sự kiện thay đổi cửa sổ ảo của `graph-window.store.ts`: Tự động nạp đồng bộ danh sách email/avatar của toàn bộ dải commit trong tầm nhìn và vùng đệm buffer.
  - Tối ưu bộ nhớ cache avatar nội bộ để loại bỏ hiện tượng nhấp nháy hoặc không nạp avatar khi cuộn trang nhanh.

- [x] **Nhiệm vụ 12.7: Kiểm định Toàn diện Zero-Regression & Nghiệm thu Thực tế trên VS Code**
  - Chạy toàn bộ các bài kiểm thử tự động (`pnpm run test`, `dotnet test`, `pnpm run typecheck`, `pnpm run lint`).
  - Đóng gói bản cài đặt thử nghiệm Windows VSIX mới (`f-gitgraph-win-x64.vsix`) và cài đặt trực tiếp trên môi trường VS Code.
  - Kiểm tra trực quan trên kho mã nguồn thực tế có cấu trúc phân nhánh phức tạp, nghiệm thu đạt 100% tiêu chí: màu phân biệt rõ, mở rộng không đứt nét, commit gốc khép kín, badge ref đầy đủ nền và mép cột thông thoáng.

---

## 4. Tiêu Chuẩn Nghiệm Thu Hoàn Thành Toàn Diện (Definition of Done - DoD)

1. **Tính Độc Lập**: File nhị phân `f-gitgraph-core.exe` chạy độc lập hoàn toàn trên Windows 10 và Windows 11 mà không đòi hỏi cài đặt bất kỳ gói .NET runtime nào.
2. **Hiệu Năng Vượt Trội**: Thời gian nạp và hiển thị toàn bộ đồ thị trên kho mã nguồn 50.000 commits đạt mốc **dưới 300 phần nghìn giây** (nhanh hơn từ 30 đến 50 lần so với phiên bản TypeScript cũ).
3. **Trải Nghiệm Giao Diện Tuyệt Hảo**: Toàn bộ các hiệu ứng thị giác và tương tác từ Phase 1 (nút lục giác SVG, vầng sáng neon ambient, click avatar zoom 5x, panel commit message) hoạt động mượt mà ở tốc độ 60 khung hình/giây, con trỏ chuột phản hồi tức thì.
4. **An Toàn Tuyệt Đối**: 100% các thao tác thay đổi dữ liệu (commit, push, pull, merge, rebase, branch) được kiểm thử thành công trên Windows, bảo toàn chữ ký số GPG/SSH và cơ chế xác thực tài khoản Git Credential Manager.
5. **Đóng Gói Thử Nghiệm Thành Công**: Bản cài đặt extension Windows VSIX được đóng gói hoàn chỉnh, nhúng sẵn nhân F# Native AOT, cài đặt và vận hành mượt mà trên môi trường VS Code thực tế của máy Windows sạch.
6. **Chuẩn Hóa Nhận Diện Thương Hiệu 100%**: Toàn bộ tài liệu giới thiệu (README, CHANGELOG, NLS), metadata gói (package.json) và chuỗi nội bộ phản ánh nhất quán, chuyên nghiệp thương hiệu **F-GitGraph**, sạch hoàn toàn các tàn dư định danh cũ.
7. **Tinh Gọn Hệ Thống & Loại Bỏ Backend TS Cũ**: Toàn bộ dead code truy vấn Git regex cũ bằng TS (`src/backend/queries/`), cấu hình Nix và tệp localization tiếng Trung được loại bỏ sạch sẽ; hệ thống kiểu dữ liệu độc lập tại `src/types/`; duy trì 100% test pass.
8. **Hệ Thống Biểu Tượng Nhận Diện Hoàn Chỉnh**: Bộ icon mới (128x128 PNG, 512x512 Master, SVG Webview Tab đa sắc / Dark / Light, Activity Bar) được tích hợp trọn vẹn, hiển thị sắc nét và ấn tượng trên mọi kích thước và chủ đề màu sắc của VS Code.
9. **Khắc Phục Toàn Diện Sự Cố Hiển Thị Đồ Thị**: Đạt 100% tiêu chí nghiệm thu tại Bản thiết kế 12, giải quyết dứt điểm các lỗi xung đột màu, dãn nở khi mở commit, rò rỉ commit gốc và mất nền badge ref.

---

## 5. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo cấu trúc tài liệu tiến độ Phase 1. Xác lập tổng quan mục tiêu, phạm vi đầu việc và tiêu chuẩn nghiệm thu cho môi trường Windows.
- **2026-10-03**: Chi tiết hóa toàn bộ 7 nhóm công việc lớn thành 20 nhiệm vụ con (subtasks) cụ thể, xác định rõ mục tiêu kỹ thuật, luồng xử lý và tiêu chí hoàn thành cho từng nhiệm vụ.
- **2026-10-03**: Bổ sung bảng ánh xạ tài liệu thiết kế áp dụng chi tiết cho từng nhóm việc, liên kết trực tiếp tới 7 bản thiết kế kỹ thuật tương ứng trong thư mục `docs/02_design/001_windows/`.
- **2026-10-03**: Hoàn thành Nhóm Việc 1 — Khởi tạo dự án F# `src/core-engine/` với phân tầng module `Domain`, `Storage`, `Graph`, `Transport` và điểm khởi chạy `Program.fs`. Cấu hình Native AOT (`PublishAot`, `win-x64`, `SelfContained`, `InvariantGlobalization`, `StripSymbols`, tối ưu kích thước) trong `core-engine.fsproj`.
- **2026-10-03**: Biên dịch thành công `f-gitgraph-core.exe` Native AOT (self-contained, không phụ thuộc .NET runtime), nhắm mục tiêu `net10.0` (LTS). Kích thước nhị phân đo được 0.84MB (dưới ngưỡng mục tiêu 6–9MB, sẽ tăng khi tích hợp LibGit2/MessagePack ở các nhóm việc sau). Cold-start latency đo được ~29–56ms (trung bình ~37ms), chưa đạt mục tiêu < 5ms — phần lớn độ trễ đến từ chi phí spawn tiến trình `CreateProcessW` của Windows, sẽ được tối ưu bằng mô hình sidecar daemon thường trú ở Nhóm Việc 5 thay vì spawn tiến trình mỗi lần gọi.
- **2026-10-03**: Hoàn thành Nhóm Việc 2 — Xây dựng tầng miền nghiệp vụ thuần túy trong `src/core-engine/Domain/`: `CoreEntities.fs` (`GitHash` hỗ trợ SHA-1/SHA-256 với `tryParse`/`abbrev`, `Author`, `CommitNode`, `GitRef` phân loại 6 nhóm tham chiếu), `InFlightState.fs` (Clean/Merging/Rebasing/CherryPicking/Bisecting) và `GitError.fs` (bảng lỗi vét cạn 9 trường hợp kèm hàm `describe`).
- **2026-10-03**: Dựng dự án kiểm thử đơn vị chuẩn hóa `src/core-engine/tests/CoreEngine.Tests/` dùng xUnit (tương thích `dotnet test`), gồm 19 test case phủ toàn bộ tầng Domain (GitHash, CommitNode, InFlightState, GitError). Tạo solution `src/core-engine/f-gitgraph-core.sln` gắn dự án nhân + test để di chuyển trọn gói khi tách dự án. Xóa smoke test tạm `smoke_test.fsx`.
- **2026-10-03**: Hoàn thành Nhóm Việc 3 — Tầng đọc Git tốc độ cao trong `src/core-engine/Storage/`: `Utf8.fs` (giải mã UTF-8 zero-allocation + hex encode/decode), `CommitGraph.fs` (đọc trực tiếp tệp nhị phân `commit-graph` bằng Memory-Mapped Files qua `SafeMemoryMappedViewHandle.AcquirePointer`, parse header/chunk/OID fanout/lookup/CDAT/EDGE), `LibGit2.fs` (P/Invoke `git2-5853918.dll` từ gói `LibGit2Sharp.NativeBinaries`: open repo, revwalk, đọc commit cha/tác giả/tiêu đề qua `git_oid_tostr`/`git_oid_fromstr` tránh vấn đề layout struct SHA-256) và `Storage.fs` (điều phối `GitReader.readGraph`: ưu tiên commit-graph, fallback LibGit2).
- **2026-10-03**: Kiểm chứng Nhóm Việc 3 bằng 27 test case xUnit (thêm `Utf8Tests`, `CommitGraphTests` với bộ dựng commit-graph nhị phân tổng hợp) và kiểm thử tích hợp trên kho Git thật: commit-graph đọc đúng 5 commit (1 root, 1 merge), LibGit2 đọc đúng tiêu đề tiếng Việt có dấu, emoji 🚀 và merge 2 cha. Biên dịch Native AOT thành công kèm `git2-5853918.dll` (~2MB) trong bản phát hành.
- **2026-10-03**: Hoàn thành Nhóm Việc 4 — Thuật toán xếp làn đồ thị topo song song trong `src/core-engine/Graph/Graph.fs`: `TopoSort` (sắp xếp topo Kahn cải tiến + hàng đợi ưu tiên theo thế hệ/thời gian, xử lý shallow/orphan/multi-root/octopus và dự phòng khi thiếu generation), `Lanes` (phân bổ làn thu gọn trái Left-compact với kế thừa làn + tái sử dụng làn trống + đóng làn, màu ổn định theo `lane % 8`), `Geometry` (sinh tọa độ nút + đường nối SVG bằng `Parallel.For` đa luồng, đường thẳng/Bezier) và `Layout` (điểm vào: topo → phân làn → hình học). Mở rộng `GraphSnapshot` (Storage) thêm `Generation` và `CommitTime`.
- **2026-10-03**: Kiểm chứng Nhóm Việc 4 bằng 7 test case xUnit (`GraphTests`) trên đồ thị tổng hợp — tổng bộ test 34/34 pass; biên dịch Native AOT thành công.
- **2026-10-03**: Hoàn thành Nhóm Việc 5 — Giao thức giao tiếp nội bộ: phía F# xây dựng `src/core-engine/Transport/Transport.fs` (MessagePack codec tự viết không thư viện + AOT-safe, khung gói tin `[độ dài u32 LE][opcode][seq][payload]`, bảng opcode 9 lệnh gồm Ready/Init/Query Range/Heartbeat/Error, và vòng lặp daemon `runWith` tích hợp Storage + Graph); `Program.fs` thêm chế độ `serve`. Phía TypeScript xây dựng `src/extension/sidecar/` (`msgpack.ts` đồng bộ byte với F#, `protocol.ts`, `sidecar-manager.ts` quản lý vòng đời: khởi động, heartbeat 10s, tự phục hồi khi thoát, thu hồi tài nguyên). Mở rộng `Geometry.Layout` thêm `Edges` để lọc đường nối theo cửa sổ ảo.
- **2026-10-03**: Kiểm chứng Nhóm Việc 5 bằng 16 test xUnit (`TransportTests`) + 17 test vitest (`msgpack.test.ts`, `protocol.test.ts`) với vector byte chia sẻ hai bên — tổng F# 50/50 pass, TS 17/17 pass; typecheck/lint/format sạch; smoke test daemon trên bản AOT (Ready + Pong) thành công.
- **2026-10-03**: Hoàn thành Nhóm Việc 6 — Ghép nối Webview & lệnh ghi an toàn: phía TypeScript xây dựng `graph-merge.ts` + `graph-data-bridge.ts` (cầu nối hình học F# với metadata commit, `mergeGraphWindow`/`GraphDataBridge`), `gitCliMutator.ts` (module `GitCliMutator` ủy thác 100% lệnh ghi cho `git.exe` qua `spawn`, kiểm tra `check-ref-format`, đầy đủ commit/branch/checkout/merge/rebase/cherry-pick/tag/push/pull/fetch), `git-ref.watcher.ts` (theo dõi `.git/HEAD` + `.git/refs/**`) và `coalescer.ts` (gom sự kiện debounce 150ms).
- **2026-10-03**: Kiểm chứng Nhóm Việc 6 bằng 28 test vitest (`gitCliMutator` trên kho Git thật, `graph-merge`, `coalescer` fake timers) — tổng backend 28/28 pass; typecheck/lint/format sạch.
- **2026-10-03**: Bổ sung Nhiệm vụ 7.3 vào Nhóm Việc 7: Đóng gói bản cài đặt thử nghiệm Windows VSIX (Local Packaging & Testing) nhằm hoàn tất điều kiện nghiệm thu thực tế trên máy Windows sạch mà không cần chờ tới Phase 4.
- **2026-10-03**: Đổi tên toàn hệ thống sang `F-GitGraph`: package `f-gitgraph`, nhân F# `f-gitgraph-core` (`AssemblyName` + `Version.Name`), solution `f-gitgraph-core.sln`, command/cấu hình `f-gitgraph.*`, sidecar `f-gitgraph-core.exe`; đồng bộ toàn bộ tài liệu `docs/`.
- **2026-10-03**: Hoàn thành Nhiệm vụ 7.1 — Kiểm thử tương đương đồ thị: thêm `EquivalenceTests.fs` (6 test) xác minh các bất biến cấu trúc (thứ tự dòng con-trên-cha, tính duy nhất dòng, phân làn thu gọn trái liên tục, màu ổn định `lane % 8`, hình học nhất quán, golden fixture) trên đồ thị tổng hợp 200–1000 commit với nhánh + merge thật. Ghi nhận trung thực rằng chỉ số làn cụ thể có thể khác thuật toán TS (branch tracing vs topo + thu gọn trái) nên nghiệm thu theo bất biến cấu trúc. Tổng F# 56/56 pass.
- **2026-10-03**: Hoàn thành Nhiệm vụ 7.2 — Đo đạc hiệu năng: thêm `Benchmark.fs` + lệnh `f-gitgraph-core bench` sinh đồ thị tổng hợp 50.000 commit. Kết quả trên bản Native AOT: bố cục toàn phần ~51.7ms (mục tiêu <300ms), RAM managed 17.7MB (mục tiêu <100MB), IPC roundtrip 100 dòng trung bình 0.43ms (mục tiêu <5ms). Phát hiện và sửa lỗi tiềm ẩn AOT: `sprintf %g` trong `Geometry.makePath` ném `NotSupportedException` (MakeGenericMethod) — thay bằng `ToString(CultureInfo.InvariantCulture)` + `Console.WriteLine`/`String.Format`.
- **2026-10-03**: Hoàn thành Nhiệm vụ 7.3 — Đóng gói Windows VSIX: thêm `scripts/build-native-win.ps1` (publish AOT + chép `f-gitgraph-core.exe`/`git2-5853918.dll` vào `bin/win-x64/`), bổ sung `resolveSidecarBinaryPath`/`SidecarManager.create` dùng `context.asAbsolutePath`, whitelist `!bin/win-x64/` trong `.vscodeignore`, và lệnh `package:vsix:win`. Đóng gói thành công `f-gitgraph-win-x64.vsix` (21 file, 2.59MB) nhúng đủ binary + dll.
- **2026-10-03**: Bổ sung Nhóm Việc 8: Dọn dẹp tàn dư & Chuẩn hóa nhận diện thương hiệu F-GitGraph (kế hoạch chi tiết tại [08_Rebranding_And_Identity_Cleanup.md](../02_design/001_windows/08_Rebranding_And_Identity_Cleanup.md)) nhằm xóa bỏ hoàn toàn các tàn dư định danh cũ và nâng tầm nhận diện sản phẩm chuyên nghiệp.
- **2026-10-03**: Bổ sung Nhóm Việc 9: Dọn dẹp mã nguồn Backend TS cũ & Tinh giản tài nguyên thừa (kế hoạch chi tiết tại [09_Legacy_TS_Backend_Cleanup.md](../02_design/001_windows/09_Legacy_TS_Backend_Cleanup.md)). Hoàn thành Nhiệm vụ 9.1: Xóa bỏ toàn bộ tệp Nix (`flake.nix`, `flake.lock`) và localization tiếng Trung (`package.nls.zh-cn.json`, `package.nls.zh-tw.json`, `bundle.l10n.zh-cn.json`, `bundle.l10n.zh-tw.json`); toàn bộ các bài test, typecheck, linting và build đóng gói đạt 100% 0 cảnh báo, 0 lỗi.
- **2026-10-03**: Bổ sung Nhóm Việc 10: Thiết kế hệ thống biểu tượng & icon F-GitGraph (kế hoạch chi tiết tại [10_Extension_Iconography_Design.md](../02_design/001_windows/10_Extension_Iconography_Design.md)), xác lập 3 ý tưởng sáng tạo nghệ thuật ("Neon Hexagon & F-Branch", "F# Monogram in Git Matrix", "Prism Convergence"), quy chuẩn kỹ thuật và kiểm kê 7 vị trí icon cần thiết cho hệ sinh thái VS Code.
- **2026-10-03**: Hoàn thành Nhiệm vụ 10.1 — Phê duyệt chính thức hướng thiết kế **Ý Tưởng 1 ("Neon Hexagon & F-Branch" - Cyberpunk Modern)** và chốt danh mục 7 tệp icon cần thiết; sẵn sàng bước sang thiết kế đồ họa vector và xuất bản ảnh raster.
- **2026-10-03**: Hoàn thành Nhóm Việc 8 — Chuẩn hóa nhận diện thương hiệu: quét sạch toàn bộ tàn dư `neo-git-*` khỏi mã nguồn và tài liệu người dùng (chỉ còn trong văn bản mô tả việc dọn dẹp), làm mới `CHANGELOG.md` (mốc `[Unreleased]` ghi nhận F-GitGraph + đồng bộ link `thatislg/f-gitgraph`), viết lại `README.md` theo nhận diện F-GitGraph (loại bỏ khung "fork", bổ sung kiến trúc F# và roadmap Windows → Linux → macOS → Release), xác minh `publisher`/`author`/`sponsor` thành `lmo-lab`/LMO-LAB (`lnllnl01111@gmail.com`), và đóng gói build 0 lỗi. Nhiệm vụ 8.1 (bộ tài nguyên hình ảnh) chuyển giao cho Nhóm Việc 10.
- **2026-10-03**: Hoàn thành Nhóm Việc 9 — Dọn dẹp Backend TS cũ: (1) xóa Nix + localization tiếng Trung; (2) di chuyển toàn bộ kiểu dữ liệu sang `src/types/` (`git.ts`, `actions.ts`, `queries.ts`, `repo.ts`) và cập nhật 35 import `@/backend/types` → `@/types`, xóa `src/backend/types/`; (3) xóa dead code khung kích hoạt cũ (`old-extension/main.ts`, `initExtension.ts`, `watchForRepos.ts`, `webviewHtml.ts`, `webviewPanel.ts`, `maxDepthTracker.ts`, `statusBarItem.ts`, `constant/`) cùng `backend/queries/repoSearch.ts`, `utils/repoSearch.ts`, `utils/nonce.ts` và test tương ứng; (4) chuyển `GitCliMutator` → `src/extension/mutator/`, `avatarManager`/`diffDocProvider` → `src/extension/services/`. Kiểm định zero-regression: typecheck/lint/format 0 lỗi, vitest 174/174, F# 56/56. Ghi chú: `loadCommits`/`loadBranches`/`commitDetails` và các dịch vụ `old-extension` còn lại vẫn hoạt động (sidecar F# chưa cung cấp metadata commit/nhánh/chi tiết) — xem Báo cáo 009.
- **2026-10-03**: Thanh lý triệt để thư mục `src/old-extension/` (bổ sung Nhóm Việc 9): chuyển các dịch vụ còn hoạt động sang `src/extension/services/` (`extensionState.ts`, `repoManager.ts`, `webviewBridge.ts`, `messageHandler.ts`), gộp hai config trùng lặp `extConfig` + `config` thành một `src/extension/config.ts` duy nhất, chuyển `l10n/webviewL10n.ts` → `src/extension/l10n/`, xóa `utils/logger.ts` (`legacyLogger` đã chết) và `tsconfig.json` rỗng cũ. Đồng thời chuẩn hóa tên thư mục kiểm thử: `tests/old-extension/` → `tests/extension/`, `tests-ext/` → `tests-e2e/` (cập nhật `vitest.config.ts`, `.vscode-test.mjs`, `.oxlintrc.json`, `package.json`, `tests/tsconfig.json`, sửa import `tests-e2e/repoManager.test.ts`). Zero-regression: typecheck/lint 0 lỗi, vitest 174/174.
- **2026-10-03**: Hoàn thành Nhiệm vụ 11.1 — Tích hợp `GraphDataBridge` vào luồng điều phối Extension Host: thêm `src/backend/queries/commitMetadata.ts` (`getCommitMetadata` đọc tác giả/email/ngày/thông điệp/refs cho tập hash bằng `git log --no-walk`, không duyệt lịch sử), thêm `src/extension/sidecar/graph-bridge-service.ts` (singleton `loadGraph`/`loadGraphWindow`/`invalidateGraph` gắn `MetadataProvider` với `SidecarManager`), mở rộng `GraphDataBridge.initialize/invalidate` trả về `InitSuccess` đầy đủ, và định tuyến RPC `graph.load`/`graph.window` qua cầu nối trả về `GraphWindowResult` đã gộp hình học F# + metadata (`GraphRow`). Cập nhật `src/types/rpc.types.ts` (thêm `GraphRow`, đổi `GraphWindowResult` thành `{ from, rows, paths }`). Kiểm định: typecheck/lint 0 lỗi, 22 test sidecar pass. Ghi chú quan trọng cho 11.3: hệ tọa độ F# (`LaneWidth=16`, `Margin=10`) lệch với Webview (`LANE_WIDTH=20`, `LANE_OFFSET=16`) — cần đồng bộ hằng số hình học trước khi chuyển `CommitGraph` sang vẽ trực tiếp tọa độ F#.
- **2026-10-03**: Hoàn thành Nhóm Việc 10 — Thiết kế hệ thống biểu tượng & icon F-GitGraph: (1) triển khai phương án Ý Tưởng 1 ("Neon Hexagon & F-Branch" - Cyberpunk Modern); (2) xuất bản đủ 7 tệp icon: `icon.png` (128x128 PNG), `icon-512.png` (512x512 Master PNG), `webview-icon.svg` (đa sắc colour mode), `webview-icon-dark.svg` (đơn sắc sáng Dark theme), `webview-icon-light.svg` (đơn sắc tối Light theme), `activitybar-icon.svg` (currentColor cho Sidebar), và `status-bar-icon.svg` (16x16 px micro icon); (3) viết kịch bản tự động `scripts/generate-icons.ps1` bằng `System.Drawing` kết xuất PNG chất lượng cao; (4) tích hợp `"icon": "resources/icon.png"` trong `package.json`, cập nhật whitelist `.vscodeignore` và đóng gói thử nghiệm VSIX (`f-gitgraph-win-x64.vsix`, 20 files, 2.61 MB) nhúng toàn vẹn 7 tệp icon; hoàn tất báo cáo chi tiết [010_Extension_Iconography_Report.md](../04_reports/001_windows/010_Extension_Iconography_Report.md).
- **2026-10-04**: Điều tra sự cố hiển thị đồ thị và suy thoái giao diện trong Webview sau khi di trú F# Core: (1) tiếp nhận phản ánh thực tế từ người dùng và mở cuộc điều tra kỹ thuật sâu, xác định 4 lỗi cốt lõi (BUG-01: các line cạnh nhau trùng màu / đổi màu giữa chừng; BUG-02: avatar/node biến mất trong vùng mở của commit được chọn và line bị đứt/cong kéo dãn; BUG-03: commit gốc có node và line kéo dài phía dưới; BUG-04: badge nhánh/tag mất màu nền do thiếu token trong Tailwind CSS v4) và 2 lỗi hình học bổ trợ (BUG-05: node sát mép cột; BUG-06: tải avatar trong cửa sổ ảo); (2) thiết lập Hồ sơ điều tra sự cố tập trung [011_Webview_FSharp_Core_Migration_Investigation.md](../04_reports/001_windows/011_Webview_FSharp_Core_Migration_Investigation.md) (mã báo cáo `REP-WIN-011`, ẩn danh hóa toàn bộ định danh thực tế thành Branch_A, Branch_B, Author_A...); (3) ban hành Tài liệu thiết kế kỹ thuật khắc phục toàn diện [12_Graph_Rendering_And_Webview_Fix_Design.md](../02_design/001_windows/12_Graph_Rendering_And_Webview_Fix_Design.md); (4) **bảo lưu trạng thái Nhóm Việc 11 (Chưa hoàn thành)**, không đánh dấu hoàn tất cho tới khi toàn bộ 6 lỗi trên được khắc phục và kiểm định thực tế đạt 100% tiêu chí nghiệm thu.
- **2026-10-04**: Hoàn thành Nhóm Việc 12 — Khắc phục toàn diện 6 sự cố hiển thị đồ thị & đồng bộ hình học F#–Webview: (1) **BUG-04** khôi phục token màu `--color-editor-fg`/`--color-graph-fg` trong `@theme` của `src/webview/styles.css`, badge ref hiển thị lại khối nền sẫm; (2) **BUG-05** đồng bộ hằng số hình học `LaneWidth = 20.0`, `Margin = 16.0` trong `Graph.fs` khớp `LANE_WIDTH = 20`, `LANE_OFFSET = 16` trong `constants.ts`; (3) **BUG-01** tái cấu trúc `Lanes` (`assign`/`assignWithColor`) áp dụng kế thừa màu theo dòng dõi nhánh + chống trùng màu làn kề (chọn màu khoảng cách lớn nhất trên vòng bảng màu) và gán màu đường nối đúng hướng fork/merge-in; (4) **BUG-02** nâng cấp `CommitGraph.tsx` biến đổi chuỗi lệnh SVG `path.d` thích ứng theo dòng mở rộng (giữ nguyên phía trên, tịnh tiến Y phía dưới, tách đoạn xuyên panel thành đường đứng mờ 35%) kèm bù trừ độ dãn nở vào công thức cuộn ảo trong `CommitTable.tsx`; (5) **BUG-03** khép làn dứt khoát tại commit gốc và dịch gốc tọa độ Y về đầu cửa sổ ảo trong `Transport.fs` (hết hiện tượng node/line rò rỉ dưới commit gốc khi cuộn); (6) **BUG-06** nạp trước avatar theo dải cửa sổ ảo trong `graph-window.store.ts`. Kiểm định: `dotnet test` 56/56 pass, biên dịch Native AOT thành công (smoke test `bench` 1000 commit đạt MaxLane=1, IPC roundtrip ~0.08ms), `pnpm typecheck`/`lint` 0 lỗi, vitest webview 73/73 + extension 2/2 pass.
- **2026-10-04**: Tiếp nhận phản hồi thực tế mới từ người dùng và thiết lập Biên bản sự cố kỹ thuật [012_Graph_Expansion_Defects_And_Overlay_Architecture_Issue.md](../04_reports/001_windows/012_Graph_Expansion_Defects_And_Overlay_Architecture_Issue.md) (mã `ISSUE-WIN-012`): (1) Phân tích hiện tượng đoạn đường trong vùng expand bị nhạt màu (opacity 35%), thẳng đuột và hở chân tại đáy panel chi tiết do thiếu đoạn nối ngang $x_0 \to x_1$; (2) Phân tích căn nguyên thuật toán phân màu F# Core dồn vào 1-2 màu do tái sử dụng làn 0, 1 quá mức kết hợp `lane % 8`; (3) Tiếp thu định hướng kiến trúc đột phá từ người dùng: học tập Git/GitLens chuyển đổi cơ chế hiển thị chi tiết commit sang Layer hiển thị độc lập phía trên (Overlay / Inspector Panel) để triệt tiêu bài toán dãn nở bảng, đồng thời áp dụng chuẩn đường nối vuông góc bo tròn (Orthogonal Rounded Routing).
- **2026-10-04**: Khắc phục `BUG-COLOR-01` (đồ thị dồn 1-2 màu) trong `src/core-engine/Graph/Graph.fs`: thay thuật toán chọn màu tất định "khoảng cách lớn nhất so với làn kề" (khiến mọi nhánh con tách từ cùng nhánh cha đều mang cùng một màu) bằng cơ chế **xoay vòng bảng màu round-robin** (`colorCursor`) kết hợp bỏ qua màu trùng làn trái/phải; mỗi nhánh mới nhận màu kế tiếp trên vòng 8 màu, khai thác đồng đều toàn bộ bảng màu. Bổ sung test hồi quy `sequential feature branches receive distinct round-robin colors` (đồ thị 3 nhánh feature fork-merge kế tiếp). Kiểm định: `dotnet test` 57/57 pass.
- **2026-10-04**: Khắc phục triệt để `BUG-COLOR-01` (lẫn màu làn kề) — nâng cấp `pickColor` trong `Graph.fs` sang **né toàn bộ màu đang được mọi làn song song sử dụng** (thay vì chỉ né 2 làn kề), bảo đảm bất biến: tại mọi thời điểm các làn hoạt động luôn mang màu phân biệt. Thêm test `parallel branches active simultaneously receive distinct colors` (octopus merge 4 nhánh). Kiểm định: `dotnet test` 58/58 pass.
- **2026-10-04**: Khắc phục `BUG-EXPAND-01/02` (biến dạng đồ thị khi mở rộng dòng) bằng kiến trúc **Overlay Inspector Panel** theo phong cách GitLens: (1) `CommitGraph.tsx` loại bỏ hoàn toàn logic biến đổi hình học `transformPathD`/`parsePath`/`expandOffset`, đồ thị SVG giữ nguyên 100% hình học; (2) `CommitDetails.tsx` chuyển từ hàng `<tr>` nội dòng thành panel `position: absolute` nổi; (3) `CommitTable.tsx` loại bỏ cơ chế dãn nở bảng và bù trừ cuộn ảo, render `CommitDetails` thành layer nổi phía dưới dòng được chọn (không đẩy các dòng khác). Triệt tiêu vĩnh viễn lỗi nhạt màu (opacity 35%), đường thẳng đuột và hở chân tại đáy panel. Kiểm định: `pnpm typecheck`/`lint` 0 lỗi, vitest webview 73/73 pass. Orthogonal Rounded Routing để lại là tùy chọn thẩm mỹ tiếp theo.


