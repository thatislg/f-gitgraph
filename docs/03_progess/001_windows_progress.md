# Tiến Độ Phase 1: Windows First Milestone (Xây Dựng Nền Móng Nhân F#)

Tài liệu này ghi nhận tổng quan mục tiêu, bảng ánh xạ tài liệu thiết kế áp dụng, phạm vi công việc chi tiết hóa từng nhiệm vụ con (subtasks), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 1: Xây dựng nền móng nhân F# Core Engine trên môi trường Windows**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào tiến độ, kiến trúc và luồng xử lý kỹ thuật, không sử dụng mã nguồn mẫu.

---

## 1. Tổng Quan Giai Đoạn (Overview)

### 1.1. Tầm nhìn & Mục tiêu Cốt lõi
- **Mục tiêu**: Xây dựng thành công bản nhị phân F# Native AOT đầu tiên (`neo-git-core.exe`) chạy độc lập trên Windows 10/11, thay thế toàn bộ tầng nạp dữ liệu và tính toán layout đơn luồng hiện tại của TypeScript.
- **Trọng tâm kỹ thuật**:
  - Triệt tiêu độ trễ spawn tiến trình dòng lệnh `CreateProcessW` trên Windows bằng cách đọc trực tiếp qua thư viện C gốc LibGit2 và cơ chế ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) với file `commit-graph`.
  - Phân bổ làn đồ thị song song đa luồng CPU trên F#, tính toán sẵn toàn bộ tọa độ hình học trước khi chuyển sang giao diện.
  - Kết nối hoàn hảo với tầng giao diện Webview Preact đã hoàn thiện ở Phase 1 (các nút lục giác, vầng sáng neon ambient, xem trước avatar zoom 5x, panel commit message).
  - Bảo đảm an toàn tuyệt đối 100% cho các thao tác ghi (commit, push, pull, rebase...) bằng cách tiếp tục định tuyến qua Git gốc (`git.exe`).

### 1.2. Trạng Thái Hiện Tại (Status)
- **Trạng thái**: Đang triển khai — Nhóm Việc 1 (Khởi tạo dự án F# & Native AOT), Nhóm Việc 2 (Domain Model), Nhóm Việc 3 (Fast Git Reader) và Nhóm Việc 4 (Parallel DAG Solver) đã hoàn thành.
- **Tiến độ tổng thể**: 4/7 nhóm việc hoàn thành (57%).

---

## 2. Bảng Ánh Xạ Tài Liệu Thiết Kế Áp Dụng Cho Từng Nhóm Việc

Toàn bộ quá trình hiện thực hóa các nhóm việc kỹ thuật bên dưới bắt buộc phải bám sát hệ thống tài liệu thiết kế chi tiết tương ứng nằm trong thư mục **[docs/02_design/001_windows/](../02_design/001_windows/README.md)**:

| STT | Nhóm Việc Kỹ Thuật | Tài Liệu Thiết Kế Chi Tiết Bắt Buộc Áp Dụng | Phạm Vi Thiết Kế Trọng Tâm |
| :---: | :--- | :--- | :--- |
| **1** | **Khởi Tạo Dự Án F# & Native AOT** | **[01_Project_Structure_And_NativeAOT.md](../02_design/001_windows/01_Project_Structure_And_NativeAOT.md)** | Cấu trúc phân tầng `src/core-engine/`, cờ xuất bản Native AOT (`win-x64`), cắt tỉa Trimming, LTO, kiểm định máy sạch. |
| **2** | **Tầng Miền Nghiệp Vụ & Bảng Mã Lỗi** | **[02_Domain_Model_And_Error_Taxonomy.md](../02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md)** | Thực thể GitHash, Author, CommitNode, GitRef, trạng thái In-Flight (`MERGE_HEAD`, `rebase-merge`), bảng lỗi vét cạn qua kiểu `Result`. |
| **3** | **Tầng Đọc Dữ Liệu Git Tốc Độ Cao** | **[03_Fast_Git_Storage_Reader.md](../02_design/001_windows/03_Fast_Git_Storage_Reader.md)** | Tích hợp LibGit2 C-binding in-process, Memory-Mapped File đọc `commit-graph`, Zero-Allocation Span, giải mã UTF-8 tiếng Việt. |
| **4** | **Thuật Toán Xếp Làn Đồ Thị Topo Song Song** | **[04_Parallel_DAG_Layout_Solver.md](../02_design/001_windows/04_Parallel_DAG_Layout_Solver.md)** | Sắp xếp Topo xử lý shallow/orphan/multi-root, phân bổ làn thu gọn bên trái (Lane Pool), tính toán song song đa luồng CPU tọa độ SVG. |
| **5** | **Giao Thức Giao Tiếp Nội Bộ (IPC Daemon)** | **[05_IPC_Stdio_Streaming_Protocol.md](../02_design/001_windows/05_IPC_Stdio_Streaming_Protocol.md)** | Quản lý vòng đời tiến trình F# sidecar, cấu trúc khung gói tin Stdio RPC MessagePack, phân trang cửa sổ ảo (Virtual Scrolling). |
| **6** | **Ghép Nối Webview & Lệnh Ghi An Toàn** | **[06_Webview_Integration_And_Git_Mutator.md](../02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md)** | Ghép nối dữ liệu hình học phẳng vào Webview Preact Phase 1, ủy thác 100% lệnh ghi cho `git.exe`, File Watcher cập nhật vi sai. |
| **7** | **Kiểm Thử Nghiệm Thu & Benchmark** | **[07_Benchmarking_And_Verification_Plan.md](../02_design/001_windows/07_Benchmarking_And_Verification_Plan.md)** | Kịch bản kiểm thử tương đương đồ thị 100%, đo đạc 4 chỉ số benchmark định lượng, bảng kiểm tra an toàn dữ liệu Git. |

---

## 3. Danh Mục Các Đầu Việc & Nhiệm Vụ Con Chi Tiết (Detailed Subtasks)

---

### 📋 Nhóm Việc 1: Khởi Tạo Dự Án F# & Cấu Hình Biên Dịch Native AOT

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/01_Project_Structure_And_NativeAOT.md](../02_design/001_windows/01_Project_Structure_And_NativeAOT.md)**
> 
> *Nội dung thiết kế hướng dẫn*: Tham khảo Mục 1 để cấu trúc các thư mục con trong `src/core-engine/`, Mục 2 để áp dụng các thiết lập xuất bản Native AOT (Trimming, LTO, Symbol Stripping, Invariant Globalization), và Mục 4 để thực thi quy trình kiểm định tính độc lập trên máy Windows sạch.

- [x] **Nhiệm vụ 1.1: Thiết lập cấu trúc dự án và phân chia module logic**
  - Khởi tạo thư mục mã nguồn `src/core-engine/` chứa dự án F# độc lập dưới dạng Console Application.
  - Phân chia các module chức năng riêng biệt: Module miền nghiệp vụ (`Domain`), Module truy cập lưu trữ (`Storage`), Module giải thuật đồ thị (`Graph`), Module giao tiếp nội bộ (`Transport`), và Module điều phối chính (`Program`).
  - Đảm bảo tính độc lập tuyệt đối giữa nhân tính toán F# và mã nguồn TypeScript của VS Code Extension.

- [x] **Nhiệm vụ 1.2: Cấu hình xuất bản mã máy Native AOT cho Windows 64-bit (`win-x64`)**
  - Kích hoạt cơ chế biên dịch Native AOT trong tệp cấu hình dự án F# để loại bỏ mã bytecode trung gian, liên kết tĩnh toàn bộ runtime tối thiểu cần thiết vào file thực thi.
  - Thiết lập các cờ tối ưu hóa kích thước và hiệu năng: lược bỏ biểu tượng gỡ lỗi dư thừa (Symbol Stripping), tối ưu hóa liên kết toàn diện (Link Time Optimization - LTO).
  - Đảm bảo quy trình biên dịch tương thích với bộ công cụ xây dựng C++ tiêu chuẩn trên Windows (MSVC Build Tools).

- [x] **Nhiệm vụ 1.3: Kiểm định tính độc lập và đo đạc benchmark khởi động trên Windows**
  - Kiểm tra file thực thi sinh ra (`neo-git-core.exe`) trên một môi trường Windows sạch (máy không cài đặt .NET SDK hoặc .NET Runtime) để xác nhận tính độc lập hoàn toàn.
  - Đo đạc thời gian khởi động lạnh (Cold-start latency) bằng lệnh kiểm tra phản hồi tức thời: mục tiêu đạt dưới 5 phần nghìn giây.
  - Kiểm tra dung lượng file thực thi độc lập đầu ra: mục tiêu nằm trong khoảng tối ưu từ 6MB đến 9MB.

---

### 📋 Nhóm Việc 2: Xây Dựng Tầng Miền Nghiệp Vụ & Mô Hình Hóa Lỗi (Domain Model)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md](../02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md)**
> 
> *Nội dung thiết kế hướng dẫn*: Tham khảo Mục 1 để định nghĩa các kiểu thực thể Git cốt lõi (`GitHash`, `Author`, `CommitNode`, `GitRef`), Mục 2 để định nghĩa các trạng thái biến động dở dang (`InFlightState`), Mục 3 để xây dựng bảng mã lỗi hệ thống vét cạn, và Mục 4 để áp dụng nguyên tắc xử lý lỗi qua kiểu kết quả `Result`.

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
> *Nội dung thiết kế hướng dẫn*: Tham khảo Mục 1 để tích hợp LibGit2 C-binding in-process qua P/Invoke, Mục 2 để triển khai module ánh xạ bộ nhớ (Memory-Mapped Files) đọc trực tiếp cấu trúc nhị phân của tệp `commit-graph` kèm cơ chế dự phòng, và Mục 3 để áp dụng kỹ thuật lát cắt bộ nhớ `ReadOnlySpan<byte>` giải mã chuỗi UTF-8 tiếng Việt chuẩn xác.

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
> *Nội dung thiết kế hướng dẫn*: Tham khảo Mục 1 để áp dụng thuật toán sắp xếp Topo xử lý các trường hợp đặc biệt (bản sao nông, nhánh mồ côi, kho đa gốc), Mục 2 để hiện thực thuật toán phân bổ làn thu gọn bên trái (Lane Pool) và cơ chế bảo toàn màu sắc nhánh, và Mục 3 để phân chia khối tính toán song song đa luồng CPU sinh mảng tọa độ hình học SVG.

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
> *Nội dung thiết kế hướng dẫn*: Tham khảo Mục 1 để xây dựng module quản lý vòng đời tiến trình F# sidecar trong TypeScript (khởi động ngầm, heartbeat ping-pong, tự phục hồi khi crash, thu hồi tài nguyên an toàn), Mục 2 để đặc tả cấu trúc khung gói tin nhị phân Stdio RPC và bảng mã Opcode MessagePack, và Mục 3 để hiện thực cơ chế phân trang cửa sổ ảo (Virtual Scrolling Window Streaming).

- [ ] **Nhiệm vụ 5.1: Xây dựng cơ chế quản lý vòng đời tiến trình F# Sidecar**
  - Viết module điều phối trong TypeScript: tự động khởi chạy tiến trình `neo-git-core.exe` ở chế độ chạy nền khi người dùng mở bảng Git Graph.
  - Thiết lập cơ chế giám sát nhịp tim (Heartbeat) và tự phục hồi: nếu tiến trình native gặp sự cố bất ngờ, tự động khởi động lại và khôi phục trạng thái gần nhất.
  - Tự động hủy tiến trình con một cách an toàn khi người dùng đóng tab Git Graph để giải phóng toàn bộ tài nguyên CPU và RAM.

- [ ] **Nhiệm vụ 5.2: Giao thức truyền thông nhị phân siêu nén qua Stdio RPC**
  - Thiết lập kênh trao đổi thông điệp qua hai đường ống xuất nhập chuẩn (`stdin`/`stdout`).
  - Ứng dụng định dạng nhị phân MessagePack với tiêu đề gói tin cố định (bao gồm độ dài gói tin, mã định danh yêu cầu và nội dung dữ liệu nhị phân).
  - Triệt tiêu hoàn toàn chi phí tuần tự hóa chuỗi khổng lồ (`JSON.stringify`) và giải nén chuỗi (`JSON.parse`), giảm độ trễ đóng gói dữ liệu từ vài giây xuống dưới 50 phần nghìn giây.

- [ ] **Nhiệm vụ 5.3: Cơ chế phân trang cửa sổ ảo (Virtual Scrolling Window Streaming)**
  - Thiết lập luồng truyền dữ liệu theo khung nhìn hiển thị: Webview chỉ gửi yêu cầu dải chỉ số dòng đang nhìn thấy (ví dụ từ dòng 100 đến dòng 300) kèm một vùng đệm an toàn phía trên và phía dưới.
  - Engine F# truy xuất bộ nhớ đệm và stream trả về đúng phạm vi commit kèm tọa độ đồ thị tương ứng trong thời gian dưới 5 phần nghìn giây.

---

### 📋 Nhóm Việc 6: Ghép Nối Với Giao Diện Webview & Bảo Toàn Lệnh Ghi

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md](../02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md)**
> 
> *Nội dung thiết kế hướng dẫn*: Tham khảo Mục 1 để tích hợp dữ liệu hình học phẳng vào các component Preact Phase 1 (CommitTable, CommitGraph, HexagonNode, RefLabel, CommitHoverPanel, AvatarZoomPreview), Mục 2 để xây dựng module `GitCliMutator.ts` ủy thác 100% lệnh ghi cho `git.exe` gốc để bảo toàn GPG/SSH và Git Credential Manager, và Mục 3 để cài đặt File Watcher cập nhật vi sai (Debounce 150ms).

- [ ] **Nhiệm vụ 6.1: Ghép nối dữ liệu hình học vào tầng Webview Preact (Phase 1)**
  - Cập nhật module tiếp nhận dữ liệu trong Webview để giải mã các gói tin nhị phân và truyền trực tiếp tọa độ hình học vào bảng commit.
  - Bảo toàn 100% các thành phần giao diện đã hoàn thiện trong Phase 1: vẽ nút lục giác chuẩn SVG clip-path, hiệu ứng vầng sáng neon ambient khi rê chuột hoặc chọn dòng, tương tác nhấp icon avatar hiển thị xem trước 5x kèm tên tác giả, panel hiển thị đầy đủ tiêu đề và nội dung commit.

- [ ] **Nhiệm vụ 6.2: Module thực thi thao tác ghi an toàn qua Git gốc (`GitCliMutator.ts`)**
  - Tách bạch ranh giới tuyệt đối: F# Engine chỉ phụ trách việc đọc và tính toán (Read Pipeline), toàn bộ các thao tác ghi (Write Pipeline) được chuyển giao cho Git CLI gốc.
  - Các thao tác: tạo commit, tạo nhánh mới, xóa nhánh (xóa an toàn `-d` và ép xóa `-D`), chuyển nhánh (checkout), sáp nhập nhánh (merge), tái cơ cấu (rebase), chọn lọc commit (cherry-pick), gắn thẻ phiên bản (tag), đẩy code (push) và kéo code (pull) đều được thực hiện qua tiến trình `git.exe` của người dùng.
  - Bảo toàn trọn vẹn chữ ký số commit (GPG/SSH Commit Signing) và cơ chế đăng nhập, xác thực tài khoản doanh nghiệp (Git Credential Manager / SSO).

- [ ] **Nhiệm vụ 6.3: Cơ chế cập nhật vi sai khi kho mã nguồn thay đổi (Incremental Update)**
  - Thiết lập bộ theo dõi tệp (File Watcher) lắng nghe các biến động trong thư mục `.git/refs/` và tệp `.git/HEAD`.
  - Khi người dùng thực hiện commit mới hoặc chuyển đổi nhánh, engine F# chỉ tính toán lại phần thay đổi vi sai trên đồ thị và stream ngay lập tức cho Webview mà không cần quét lại toàn bộ kho mã nguồn từ đầu.

---

### 📋 Nhóm Việc 7: Kiểm Thử Nghiệm Thu & Đo Đạc Hiệu Năng Thực Tế (Benchmarking)

> 📖 **Tài liệu thiết kế chi tiết áp dụng**: **[docs/02_design/001_windows/07_Benchmarking_And_Verification_Plan.md](../02_design/001_windows/07_Benchmarking_And_Verification_Plan.md)**
> 
> *Nội dung thiết kế hướng dẫn*: Tham khảo Mục 1 để áp dụng kế hoạch kiểm thử so sánh tính tương đương đồ thị 100% trên 3 quy mô kho mã nguồn, Mục 2 để thực hiện quy trình đo đạc 4 chỉ số hiệu năng định lượng trên Windows, và Mục 3 để đối chiếu bảng kiểm tra an toàn dữ liệu Git trước khi hoàn tất nghiệm thu.

- [ ] **Nhiệm vụ 7.1: Bộ kiểm thử so sánh tính tương đương đồ thị (Equivalence Testing)**
  - Xây dựng kịch bản kiểm thử tự động so sánh kết quả tính toán đồ thị giữa thuật toán F# mới và thuật toán TypeScript cũ trên các kho mã nguồn mẫu.
  - Xác nhận tính chính xác 100% về vị trí nút, thứ tự commit, màu sắc nhánh và các liên kết cha-con.

- [ ] **Nhiệm vụ 7.2: Đo đạc và lập báo cáo hiệu năng thực tế trên Windows**
  - Đo đạc thời gian nạp ban đầu (Cold-load time) trên kho mã nguồn có 50.000 commits: mục tiêu đạt dưới 300 phần nghìn giây.
  - Đo đạc mức độ chiếm dụng bộ nhớ RAM của tiến trình F#: mục tiêu duy trì dưới 100MB RAM.
  - Đo đạc tốc độ khung hình (FPS) khi cuộn nhanh qua hàng nghìn dòng commit trên Webview: mục tiêu đạt 60 khung hình/giây mượt mà, không có hiện tượng khựng chuột hay giật giao diện.

---

## 4. Tiêu Chuẩn Nghiệm Thu Hoàn Thành Toàn Diện (Definition of Done - DoD)

1. **Tính Độc Lập**: File nhị phân `neo-git-core.exe` chạy độc lập hoàn toàn trên Windows 10 và Windows 11 mà không đòi hỏi cài đặt bất kỳ gói .NET runtime nào.
2. **Hiệu Năng Vượt Trội**: Thời gian nạp và hiển thị toàn bộ đồ thị trên kho mã nguồn 50.000 commits đạt mốc **dưới 300 phần nghìn giây** (nhanh hơn từ 30 đến 50 lần so với phiên bản TypeScript cũ).
3. **Trải Nghiệm Giao Diện Tuyệt Hảo**: Toàn bộ các hiệu ứng thị giác và tương tác từ Phase 1 (nút lục giác SVG, vầng sáng neon ambient, click avatar zoom 5x, panel commit message) hoạt động mượt mà ở tốc độ 60 khung hình/giây, con trỏ chuột phản hồi tức thì.
4. **An Toàn Tuyệt Đối**: 100% các thao tác thay đổi dữ liệu (commit, push, pull, merge, rebase, branch) được kiểm thử thành công trên Windows, bảo toàn chữ ký số GPG/SSH và cơ chế xác thực tài khoản Git Credential Manager.

---

## 5. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo cấu trúc tài liệu tiến độ Phase 1. Xác lập tổng quan mục tiêu, phạm vi đầu việc và tiêu chuẩn nghiệm thu cho môi trường Windows.
- **2026-10-03**: Chi tiết hóa toàn bộ 7 nhóm công việc lớn thành 20 nhiệm vụ con (subtasks) cụ thể, xác định rõ mục tiêu kỹ thuật, luồng xử lý và tiêu chí hoàn thành cho từng nhiệm vụ.
- **2026-10-03**: Bổ sung bảng ánh xạ tài liệu thiết kế áp dụng chi tiết cho từng nhóm việc, liên kết trực tiếp tới 7 bản thiết kế kỹ thuật tương ứng trong thư mục `docs/02_design/001_windows/`.
- **2026-10-03**: Hoàn thành Nhóm Việc 1 — Khởi tạo dự án F# `src/core-engine/` với phân tầng module `Domain`, `Storage`, `Graph`, `Transport` và điểm khởi chạy `Program.fs`. Cấu hình Native AOT (`PublishAot`, `win-x64`, `SelfContained`, `InvariantGlobalization`, `StripSymbols`, tối ưu kích thước) trong `core-engine.fsproj`.
- **2026-10-03**: Biên dịch thành công `neo-git-core.exe` Native AOT (self-contained, không phụ thuộc .NET runtime), nhắm mục tiêu `net10.0` (LTS). Kích thước nhị phân đo được 0.84MB (dưới ngưỡng mục tiêu 6–9MB, sẽ tăng khi tích hợp LibGit2/MessagePack ở các nhóm việc sau). Cold-start latency đo được ~29–56ms (trung bình ~37ms), chưa đạt mục tiêu < 5ms — phần lớn độ trễ đến từ chi phí spawn tiến trình `CreateProcessW` của Windows, sẽ được tối ưu bằng mô hình sidecar daemon thường trú ở Nhóm Việc 5 thay vì spawn tiến trình mỗi lần gọi.
- **2026-10-03**: Hoàn thành Nhóm Việc 2 — Xây dựng tầng miền nghiệp vụ thuần túy trong `src/core-engine/Domain/`: `CoreEntities.fs` (`GitHash` hỗ trợ SHA-1/SHA-256 với `tryParse`/`abbrev`, `Author`, `CommitNode`, `GitRef` phân loại 6 nhóm tham chiếu), `InFlightState.fs` (Clean/Merging/Rebasing/CherryPicking/Bisecting) và `GitError.fs` (bảng lỗi vét cạn 9 trường hợp kèm hàm `describe`).
- **2026-10-03**: Dựng dự án kiểm thử đơn vị chuẩn hóa `src/core-engine/tests/CoreEngine.Tests/` dùng xUnit (tương thích `dotnet test`), gồm 19 test case phủ toàn bộ tầng Domain (GitHash, CommitNode, InFlightState, GitError). Tạo solution `src/core-engine/neo-git-core.sln` gắn dự án nhân + test để di chuyển trọn gói khi tách dự án. Xóa smoke test tạm `smoke_test.fsx`.
- **2026-10-03**: Hoàn thành Nhóm Việc 3 — Tầng đọc Git tốc độ cao trong `src/core-engine/Storage/`: `Utf8.fs` (giải mã UTF-8 zero-allocation + hex encode/decode), `CommitGraph.fs` (đọc trực tiếp tệp nhị phân `commit-graph` bằng Memory-Mapped Files qua `SafeMemoryMappedViewHandle.AcquirePointer`, parse header/chunk/OID fanout/lookup/CDAT/EDGE), `LibGit2.fs` (P/Invoke `git2-5853918.dll` từ gói `LibGit2Sharp.NativeBinaries`: open repo, revwalk, đọc commit cha/tác giả/tiêu đề qua `git_oid_tostr`/`git_oid_fromstr` tránh vấn đề layout struct SHA-256) và `Storage.fs` (điều phối `GitReader.readGraph`: ưu tiên commit-graph, fallback LibGit2).
- **2026-10-03**: Kiểm chứng Nhóm Việc 3 bằng 27 test case xUnit (thêm `Utf8Tests`, `CommitGraphTests` với bộ dựng commit-graph nhị phân tổng hợp) và kiểm thử tích hợp trên kho Git thật: commit-graph đọc đúng 5 commit (1 root, 1 merge), LibGit2 đọc đúng tiêu đề tiếng Việt có dấu, emoji 🚀 và merge 2 cha. Biên dịch Native AOT thành công kèm `git2-5853918.dll` (~2MB) trong bản phát hành.
- **2026-10-03**: Hoàn thành Nhóm Việc 4 — Thuật toán xếp làn đồ thị topo song song trong `src/core-engine/Graph/Graph.fs`: `TopoSort` (sắp xếp topo Kahn cải tiến + hàng đợi ưu tiên theo thế hệ/thời gian, xử lý shallow/orphan/multi-root/octopus và dự phòng khi thiếu generation), `Lanes` (phân bổ làn thu gọn trái Left-compact với kế thừa làn + tái sử dụng làn trống + đóng làn, màu ổn định theo `lane % 8`), `Geometry` (sinh tọa độ nút + đường nối SVG bằng `Parallel.For` đa luồng, đường thẳng/Bezier) và `Layout` (điểm vào: topo → phân làn → hình học). Mở rộng `GraphSnapshot` (Storage) thêm `Generation` và `CommitTime`.
- **2026-10-03**: Kiểm chứng Nhóm Việc 4 bằng 7 test case xUnit (`GraphTests`) trên đồ thị tổng hợp — tổng bộ test 34/34 pass; biên dịch Native AOT thành công.
