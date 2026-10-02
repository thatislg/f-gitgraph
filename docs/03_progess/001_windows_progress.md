# Tiến Độ Phase 1: Windows First Milestone (Xây Dựng Nền Móng Nhân F#)

Tài liệu này ghi nhận tổng quan mục tiêu, phạm vi công việc chi tiết hóa từng nhiệm vụ con (subtasks), tiêu chuẩn nghiệm thu và nhật ký thực hiện cho **Phase 1: Xây dựng nền móng nhân F# Core Engine trên môi trường Windows**.

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
- **Trạng thái**: Đang trong giai đoạn chuẩn bị kỹ thuật (In Planning / Ready for Implementation).
- **Tiến độ tổng thể**: 0% hoàn thành (Chưa khởi tạo mã nguồn dự án F#).

---

## 2. Danh Mục Các Đầu Việc & Nhiệm Vụ Con Chi Tiết (Detailed Subtasks)

---

### 📋 Nhóm Việc 1: Khởi Tạo Dự Án F# & Cấu Hình Biên Dịch Native AOT

Mục tiêu của nhóm việc này là thiết lập nền móng dự án F# độc lập, có khả năng biên dịch thẳng ra một file thực thi mã máy duy nhất trên Windows mà không phụ thuộc vào .NET SDK hay Runtime bên ngoài.

- [ ] **Nhiệm vụ 1.1: Thiết lập cấu trúc dự án và phân chia module logic**
  - Khởi tạo thư mục mã nguồn `src/core-engine/` chứa dự án F# độc lập dưới dạng Console Application.
  - Phân chia các module chức năng riêng biệt: Module miền nghiệp vụ (`Domain`), Module truy cập lưu trữ (`Storage`), Module giải thuật đồ thị (`Graph`), Module giao tiếp nội bộ (`Transport`), và Module điều phối chính (`Program`).
  - Đảm bảo tính độc lập tuyệt đối giữa nhân tính toán F# và mã nguồn TypeScript của VS Code Extension.

- [ ] **Nhiệm vụ 1.2: Cấu hình xuất bản mã máy Native AOT cho Windows 64-bit (`win-x64`)**
  - Kích hoạt cơ chế biên dịch Native AOT trong tệp cấu hình dự án F# để loại bỏ mã bytecode trung gian, liên kết tĩnh toàn bộ runtime tối thiểu cần thiết vào file thực thi.
  - Thiết lập các cờ tối ưu hóa kích thước và hiệu năng: lược bỏ biểu tượng gỡ lỗi dư thừa (Symbol Stripping), tối ưu hóa liên kết toàn diện (Link Time Optimization - LTO).
  - Đảm bảo quy trình biên dịch tương thích với bộ công cụ xây dựng C++ tiêu chuẩn trên Windows (MSVC Build Tools).

- [ ] **Nhiệm vụ 1.3: Kiểm định tính độc lập và đo đạc benchmark khởi động trên Windows**
  - Kiểm tra file thực thi sinh ra (`neo-git-core.exe`) trên một môi trường Windows sạch (máy không cài đặt .NET SDK hoặc .NET Runtime) để xác nhận tính độc lập hoàn toàn.
  - Đo đạc thời gian khởi động lạnh (Cold-start latency) bằng lệnh kiểm tra phản hồi tức thời: mục tiêu đạt dưới 5 phần nghìn giây.
  - Kiểm tra dung lượng file thực thi độc lập đầu ra: mục tiêu nằm trong khoảng tối ưu từ 6MB đến 9MB.

---

### 📋 Nhóm Việc 2: Xây Dựng Tầng Miền Nghiệp Vụ & Mô Hình Hóa Lỗi (Domain Model)

Mục tiêu là mô hình hóa toàn bộ thế giới dữ liệu Git bằng hệ thống kiểu dữ liệu đại số tĩnh của F#, loại bỏ hoàn toàn các lỗi dữ liệu không hợp lệ hoặc lỗi thiếu trường thông tin.

- [ ] **Nhiệm vụ 2.1: Mô hình hóa các thực thể cốt lõi của Git (Core Entities)**
  - Định nghĩa kiểu dữ liệu mã băm Git bất biến: hỗ trợ đồng thời cả chuẩn SHA-1 truyền thống (40 ký tự hexa) và chuẩn SHA-256 hiện đại (64 ký tự hexa), tích hợp hàm sinh chuỗi viết tắt (7 ký tự) phục vụ hiển thị.
  - Định nghĩa thực thể tác giả (Author/Committer): bao gồm tên, địa chỉ email, nhãn thời gian Unix và độ lệch múi giờ địa phương.
  - Định nghĩa thực thể Commit: mã băm đối tượng, danh sách mã băm của các commit cha (xử lý chính xác trường hợp commit gốc không có cha, commit thông thường có 1 cha, commit gộp có 2 cha, và commit sáp nhập đa nhánh Octopus Merge có từ 3 cha trở lên), tiêu đề tóm tắt và nội dung chi tiết.
  - Định nghĩa thực thể tham chiếu Git (GitRef): phân loại rõ ràng nhánh cục bộ (ghi nhận cờ nhánh đang checkout), nhánh máy chủ từ xa, thẻ phát hành phiên bản chính thức (Release Tag), thẻ tiền phát hành (Prerelease Tag) và điểm lưu trữ tạm thời (Stash).

- [ ] **Nhiệm vụ 2.2: Mô hình hóa các trạng thái kho mã nguồn đang biến động dở dang (In-Flight States)**
  - Trạng thái sạch bình thường (Clean state).
  - Trạng thái đang sáp nhập dở (Merging): đọc và phân tích thông tin từ tệp `MERGE_HEAD` và `MERGE_MSG` trong thư mục Git để trích xuất commit đang merge và thông điệp xung đột.
  - Trạng thái đang rebase dở (Rebasing): kiểm tra thư mục `rebase-merge` hoặc `rebase-apply` để xác định bước hiện tại, tổng số bước và nhánh gốc đang rebase.
  - Trạng thái đang chọn lọc commit dở (Cherry-picking): kiểm tra tệp `CHERRY_PICK_HEAD`.
  - Trạng thái đang tìm lỗi nhị phân (Bisecting): đọc tệp nhật ký `BISECT_LOG` để đánh dấu các commit tốt, commit lỗi và commit bỏ qua.

- [ ] **Nhiệm vụ 2.3: Xây dựng bảng phân loại lỗi hệ thống vét cạn (Exhaustive Error Taxonomy)**
  - Định nghĩa kiểu lỗi bằng Discriminated Unions của F# bao quát toàn bộ các tình huống thất bại: không tìm thấy kho mã nguồn, xung đột file khóa `index.lock` (kèm thời gian tồn tại của khóa để phát hiện khóa mồ côi), tên nhánh đã tồn tại, xóa nhánh chưa merge, xung đột tệp tin khi chuyển nhánh, thiếu commit cha trong bản sao nông (shallow clone), đối tượng git bị hỏng hoặc lỗi từ thư viện C gốc.
  - Quy định toàn bộ hàm nghiệp vụ trong engine bắt buộc trả về kiểu kết quả `Result` (Thành công mang dữ liệu hoặc Thất bại mang mã lỗi chi tiết), loại trừ hoàn toàn việc văng ngoại lệ bất ngờ làm sập tiến trình.

---

### 📋 Nhóm Việc 3: Tầng Đọc Dữ Liệu Git Tốc Độ Cao Trên Windows (Fast Git Reader)

Mục tiêu là đọc toàn bộ lịch sử commit trực tiếp từ cơ sở dữ liệu nhị phân của Git trong thư mục `.git` mà không cần gọi tiến trình con dòng lệnh `git.exe`.

- [ ] **Nhiệm vụ 3.1: Tích hợp thư viện C gốc LibGit2 trên Windows**
  - Cấu hình liên kết thư viện mã máy LibGit2 (`libgit2.dll`) tương thích hoàn toàn với chế độ Native AOT trên Windows 64-bit.
  - Thiết lập giao diện gọi hàm trực tiếp (P/Invoke) an toàn cho các tác vụ: mở kho mã nguồn trên đĩa, khởi tạo bộ duyệt lịch sử commit (`git_revwalk`), nạp danh sách commit cha và trích xuất thông tin tác giả.

- [ ] **Nhiệm vụ 3.2: Module đọc trực tiếp file nhị phân Commit-Graph bằng ánh xạ bộ nhớ (Memory-Mapped Files)**
  - Phân tích cấu trúc bảng mục lục nhị phân của tệp `commit-graph` nằm trong thư mục `.git/objects/info/`.
  - Ứng dụng kỹ thuật ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) của Windows để nạp toàn bộ cấu trúc đồ thị hàng trăm nghìn commit vào không gian địa chỉ RAM trong thời gian từ 1 đến 2 phần nghìn giây.
  - Xây dựng cơ chế dự phòng tự động (Fallback): trong trường hợp kho mã nguồn cũ chưa được bật tính năng tạo file `commit-graph`, engine tự động chuyển sang đọc tuần tự qua LibGit2 mà không làm gián đoạn trải nghiệm người dùng.

- [ ] **Nhiệm vụ 3.3: Tối ưu hóa bộ nhớ Zero-Allocation & Xử lý mã hóa UTF-8 tiếng Việt**
  - Sử dụng các lát cắt bộ nhớ liên tục (`ReadOnlySpan<byte>`) để trích xuất các trường văn bản trực tiếp từ bộ đệm của LibGit2, không cấp phát chuỗi trung gian vào bộ nhớ heap thu gom rác.
  - Giải mã trực tiếp mảng byte UTF-8 thô sang chuỗi ký tự .NET đúng chuẩn, khắc phục triệt để lỗi hiển thị tiếng Việt có dấu bị mã hóa thành chuỗi bát phân (octal escape) thường gặp trên Git CLI Windows.

---

### 📋 Nhóm Việc 4: Thuật Toán Xếp Làn Đồ Thị Topo Song Song (Parallel DAG Solver)

Mục tiêu là đưa toàn bộ gánh nặng tính toán đồ thị phức tạp ra khỏi luồng giao diện của Webview, thực thi song song đa luồng trên CPU của engine F#.

- [ ] **Nhiệm vụ 4.1: Chuyển đổi và tinh gọn thuật toán sắp xếp Topo (Topological Sort)**
  - Hiện thực thuật toán sắp xếp topo dựa trên phả hệ cha-con và thứ tự thời gian tạo commit, đảm bảo commit con luôn xuất hiện phía trên commit cha.
  - Xử lý các tình huống đồ thị đặc biệt: bản sao nông (`--depth`) bị thiếu commit cha ở đáy, nhánh mồ côi (orphan branch), và kho mã nguồn có nhiều gốc độc lập (Multi-root DAG Forest).

- [ ] **Nhiệm vụ 4.2: Thuật toán phân bổ làn đồ thị thu gọn về bên trái (Left-compact Lane Allocation)**
  - Xây dựng cơ chế bể làn hoạt động (Lane Pool): khi duyệt qua từng commit, tìm kiếm làn đang trỏ tới commit đó để tiếp tục kéo dài làn.
  - Khi một nhánh mới được tách ra, engine tìm kiếm làn trống đầu tiên nằm ở bên trái để tái sử dụng, giúp đồ thị luôn thu gọn sát mép trái và không bị giãn rộng vô tận ra màn hình.
  - Gán chỉ số màu sắc cố định cho từng nhánh theo thuật toán modulo luân phiên, bảo đảm màu sắc của một nhánh giữ nguyên tính nhất quán trong suốt quá trình cuộn trang.

- [ ] **Nhiệm vụ 4.3: Tính toán song song đa luồng tọa độ hình học SVG**
  - Phân chia danh sách commit thành các khối (batches) và phân bổ tính toán song song trên nhiều lõi CPU của máy tính.
  - Tính toán sẵn toàn bộ tọa độ tâm nút lục giác (tọa độ x, y), các điểm nút giao nhau, đường cong bezier nối giữa commit cha và commit con, đường rẽ nhánh và đường sáp nhập.
  - Đóng gói dữ liệu hình học thành cấu trúc mảng phẳng, sẵn sàng để giao diện Webview chỉ việc vẽ trực tiếp (Dumb Renderer) mà không cần tính toán thêm bất kỳ phép topo nào.

---

### 📋 Nhóm Việc 5: Giao Thức Giao Tiếp Nội Bộ (IPC Daemon & Streaming)

Mục tiêu là xây dựng kênh truyền thông dữ liệu siêu tốc hai chiều giữa Extension Host (Node.js) và engine F# Native AOT, loại bỏ hoàn toàn độ trễ của chuỗi JSON.

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

Mục tiêu là kết nối dữ liệu từ engine F# mới vào giao diện Preact hiện tại, đồng thời bảo đảm an toàn dữ liệu 100% bằng cách ủy thác mọi thao tác ghi cho Git gốc.

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

Mục tiêu là kiểm chứng tính đúng đắn về mặt dữ liệu và chứng minh mức cải thiện hiệu năng vượt trội so với phiên bản cũ trên môi trường Windows.

- [ ] **Nhiệm vụ 7.1: Bộ kiểm thử so sánh tính tương đương đồ thị (Equivalence Testing)**
  - Xây dựng kịch bản kiểm thử tự động so sánh kết quả tính toán đồ thị giữa thuật toán F# mới và thuật toán TypeScript cũ trên các kho mã nguồn mẫu.
  - Xác nhận tính chính xác 100% về vị trí nút, thứ tự commit, màu sắc nhánh và các liên kết cha-con.

- [ ] **Nhiệm vụ 7.2: Đo đạc và lập báo cáo hiệu năng thực tế trên Windows**
  - Đo đạc thời gian nạp ban đầu (Cold-load time) trên kho mã nguồn có 50.000 commits: mục tiêu đạt dưới 300 phần nghìn giây.
  - Đo đạc mức độ chiếm dụng bộ nhớ RAM của tiến trình F#: mục tiêu duy trì dưới 100MB RAM.
  - Đo đạc tốc độ khung hình (FPS) khi cuộn nhanh qua hàng nghìn dòng commit trên Webview: mục tiêu đạt 60 khung hình/giây mượt mà, không có hiện tượng khựng chuột hay giật giao diện.

---

## 3. Tiêu Chuẩn Nghiệm Thu Hoàn Thành Toàn Diện (Definition of Done - DoD)

1. **Tính Độc Lập**: File nhị phân `neo-git-core.exe` chạy độc lập hoàn toàn trên Windows 10 và Windows 11 mà không đòi hỏi cài đặt bất kỳ gói .NET runtime nào.
2. **Hiệu Năng Vượt Trội**: Thời gian nạp và hiển thị toàn bộ đồ thị trên kho mã nguồn 50.000 commits đạt mốc **dưới 300 phần nghìn giây** (nhanh hơn từ 30 đến 50 lần so với phiên bản TypeScript cũ).
3. **Trải Nghiệm Giao Diện Tuyệt Hảo**: Toàn bộ các hiệu ứng thị giác và tương tác từ Phase 1 (nút lục giác SVG, vầng sáng neon ambient, click avatar zoom 5x, panel commit message) hoạt động mượt mà ở tốc độ 60 khung hình/giây, con trỏ chuột phản hồi tức thì.
4. **An Toàn Tuyệt Đối**: 100% các thao tác thay đổi dữ liệu (commit, push, pull, merge, rebase, branch) được kiểm thử thành công trên Windows, bảo toàn chữ ký số GPG/SSH và cơ chế xác thực tài khoản Git Credential Manager.

---

## 4. Nhật Ký Tiến Độ Triển Khai (Worklog & Activity Log)

- **2026-10-03**: Khởi tạo cấu trúc tài liệu tiến độ Phase 1. Xác lập tổng quan mục tiêu, phạm vi đầu việc và tiêu chuẩn nghiệm thu cho môi trường Windows.
- **2026-10-03**: Chi tiết hóa toàn bộ 7 nhóm công việc lớn thành 20 nhiệm vụ con (subtasks) cụ thể, xác định rõ mục tiêu kỹ thuật, luồng xử lý và tiêu chí hoàn thành cho từng nhiệm vụ.
