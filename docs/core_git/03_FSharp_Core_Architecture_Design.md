# 03. Thiết Kế Kiến Trúc Nhân Core Git Bằng F# (.NET / Native AOT)

Tài liệu này đưa ra bản thiết kế chi tiết (Blueprints) cho việc hiện thực hóa nhân xử lý Git bằng **F#**. F# được lựa chọn nhờ sự kết hợp hoàn hảo giữa:
1. **Lập trình hàm (Functional Programming)**: Xử lý cây đồ thị bất biến (Immutable DAG) tự nhiên, an toàn, không có hiệu ứng phụ.
2. **Hệ thống kiểu dữ liệu tĩnh mạnh mẽ**: Discriminated Unions và Pattern Matching loại bỏ hoàn toàn các lỗi NullReferenceException hoặc unhandled error cases.
3. **Hiệu năng cấp hệ thống (Native Performance)**: Tận dụng .NET Runtime hiện đại với các cấu trúc bộ nhớ liền kề không cấp phát rác, và khả năng biên dịch thẳng ra mã máy không cần runtime thông qua **.NET Native AOT**.

> [!NOTE]
> Tài liệu này được biên soạn theo nguyên tắc thiết kế khái niệm thuần túy: mô tả kiến trúc, luồng hoạt động và quy trình bằng ngôn ngữ tự nhiên, không sử dụng mã nguồn mẫu.

---

## 1. Kiến Trúc Phân Tầng Của Nhân F# (Layered Architecture)

Hệ thống được chia thành 4 tầng tính toán chuyên biệt:

1. **Tầng Giao Tiếp Vận Chuyển (Transport & Streaming Layer)**:
   - Tiếp nhận các yêu cầu truy vấn dữ liệu từ VS Code Extension Host thông qua đường ống xuất nhập chuẩn hoặc cơ chế giao tiếp tiến trình nội bộ.
   - Quản lý cơ chế phân trang cửa sổ ảo (Virtual Scrolling Window), chỉ đóng gói và truyền tải đúng phạm vi commit đang hiển thị trên màn hình người dùng cùng một khoảng đệm an toàn.
2. **Tầng Tính Toán Đồ Thị & Xếp Làn (Graph Topology Engine)**:
   - Áp dụng các thuật toán sắp xếp topo hiệu năng cao để xác định thứ tự thời gian và phả hệ chính xác giữa các nhánh commit.
   - Phân bổ làn đồ thị (Lane Allocation) và tính toán trước toàn bộ tọa độ các nút, đường cong rẽ nhánh, đường sáp nhập để chuyển giao cho Webview dưới dạng dữ liệu hình học sẵn sàng vẽ.
3. **Tầng Miền Nghiệp Vụ & Mô Hình Hóa Lỗi (Domain Model & Error Handling)**:
   - Đại diện chính xác các thực thể Git: mã băm đối tượng, tác giả, cây nhánh, thẻ phát hành và các trạng thái đang biến động dở dang.
   - Toàn bộ các khả năng lỗi phát sinh từ hệ thống tệp và tiến trình Git được phân loại tường minh thành các trường hợp nghiệp vụ bắt buộc phải xử lý vét cạn.
4. **Tầng Truy Cập Dữ Liệu Git (Git Storage Access Layer)**:
   - Sử dụng thư viện C gốc (LibGit2) hoặc cơ chế ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) để đọc các file nhị phân trong thư mục Git mà không cần thông qua tiến trình ngoài dòng lệnh.

---

## 2. Mô Hình Hóa Miền Nghiệp Vụ Bằng F# (Domain-Driven Design)

Thay vì dùng các cấu trúc dữ liệu lỏng lẻo hay chuỗi text tự do, tầng Domain của F# mô hình hóa chặt chẽ các khái niệm Git bằng hệ thống kiểu dữ liệu đại số:

- **Định Danh Mã Băm Git (Git Hash)**:
  - Được đóng gói dưới dạng kiểu giá trị có cấu trúc bất biến, hỗ trợ cả chuẩn SHA-1 (40 ký tự) truyền thống và SHA-256 (64 ký tự) của các phiên bản Git mới.
  - Tích hợp sẵn cơ chế trích xuất chuỗi viết tắt (7 ký tự) phục vụ hiển thị trực quan mà không tạo rác bộ nhớ.
- **Trạng Thái Con Trỏ HEAD**:
  - Được phân tách thành hai trạng thái riêng biệt: Đang gắn vào một nhánh cụ thể (kèm tên nhánh và commit đích) hoặc Đang tách rời độc lập (Detached HEAD trỏ thẳng vào mã băm commit).
- **Phân Loại Tham Chiếu & Nhánh (Ref Kinds)**:
  - Phân loại rõ ràng giữa nhánh cục bộ (ghi nhận cờ nhánh đang được checkout), nhánh remote trên máy chủ, thẻ phiên bản phát hành chính thức (Release Tag), thẻ tiền phát hành (Prerelease Tag) và thẻ thông thường.
- **Nút Commit Trên Đồ Thị (Commit Node)**:
  - Chứa đầy đủ thông tin: mã băm commit, danh sách các commit cha, tên và email tác giả, thời điểm tạo commit, tên người commit, tiêu đề tóm tắt, nội dung chi tiết và danh sách các thẻ/nhánh gắn trên commit đó.
- **Trạng Thái Dở Dang Của Kho Mã Nguồn (In-Flight States)**:
  - Nhận diện các trạng thái đặc biệt: Trạng thái sạch bình thường, Đang sáp nhập dở (kèm thông tin commit đang merge), Đang rebase dở (kèm bước hiện tại và tổng số bước), Đang cherry-pick dở hoặc Đang trong phiên tìm lỗi bisect.
- **Mô Hình Lỗi Hệ Thống Tường Minh (Git Engine Errors)**:
  - Liệt kê toàn bộ các tình huống thất bại có thể xảy ra: không tìm thấy kho mã nguồn, xung đột file khóa (kèm thời gian tồn tại của khóa), tên nhánh đã tồn tại, xóa nhánh chưa merge, xung đột tệp khi checkout, thiếu commit cha trong bản sao nông (shallow clone), đối tượng git bị hỏng hoặc lỗi từ thư viện C gốc.

---

## 3. Thuật Toán Xếp Làn Đồ Thị Topo Song Song (Parallel Lane Allocation)

### Hạn chế của giải pháp hiện tại:
Thuật toán hiện nay trong TypeScript phải duyệt tuần tự từng commit một trên luồng xử lý giao diện của trình duyệt, làm đơ toàn bộ các thao tác cuộn và nhấp chuột khi số lượng commit vượt quá ngưỡng vài chục nghìn.

### Nguyên lý giải pháp trong F#:
1. **Tổ chức Bộ Đệm Làn Tái Sử Dụng (Zero-Allocation Lane Pool)**:
   - F# duy trì một danh sách các làn đang hoạt động trong bộ nhớ native.
   - Khi duyệt qua danh sách commit theo thứ tự topo thời gian, engine tìm kiếm làn hiện tại đang trỏ tới commit đó. Nếu tìm thấy, commit sẽ tiếp tục nằm trên làn đó.
   - Nếu commit mở ra một nhánh mới, engine tìm kiếm làn trống đầu tiên ở bên trái để tái sử dụng, giúp đồ thị luôn thu gọn về phía bên trái và không bị giãn rộng vô tận ra màn hình.
2. **Tính Toán Song Song Theo Khối (Batched Parallel Execution)**:
   - Các phép tính toán tọa độ SVG (điểm bắt đầu, điểm kết thúc, đường cong bezier, màu sắc làn) của từng đoạn nhánh được phân bổ song song trên các luồng CPU của máy tính.
   - Kết quả trả về là một mảng cấu trúc hình học hoàn chỉnh, sẵn sàng để giao diện hiển thị ngay lập tức mà không cần tính toán thêm bất kỳ phép topo nào.

---

## 4. Tích Hợp Native LibGit2 & Truy Cập File Bộ Nhớ Trực Tiếp

Thay vì gọi tiến trình dòng lệnh `git.exe` làm tiêu tốn từ 30ms đến 80ms cho mỗi lượt truy vấn, nhân F# tương tác trực tiếp với dữ liệu lưu trữ:

1. **Đọc File Nhị Phân Commit-Graph Bằng Ánh Xạ Bộ Nhớ (Memory-Mapped Files)**:
   - Git phiên bản hiện đại lưu trữ cấu trúc đồ thị cây commit dưới dạng file nhị phân `commit-graph`.
   - Engine F# sử dụng kỹ thuật ánh xạ bộ nhớ trực tiếp để nạp toàn bộ đồ thị hàng trăm nghìn commit vào RAM chỉ trong khoảng từ 1 đến 2 phần nghìn giây.
   - Cơ chế này cho phép đọc trực tiếp generation number và offset của các commit cha mà không cần quét từng file đối tượng rời rạc trên đĩa.
2. **Giao Tiếp Trực Tiếp Với Thư Viện C Gốc (LibGit2)**:
   - Gọi trực tiếp các hàm duyệt lịch sử commit từ thư viện mã máy C đã được tối ưu hóa.
   - Dữ liệu metadata (tác giả, ngày giờ, thông điệp) được đọc thẳng từ con trỏ bộ nhớ native vào các cấu trúc dữ liệu của engine mà không phải tạo ra hàng triệu chuỗi string trung gian trên bộ nhớ thu gom rác.

---

## 5. Giao Thức IPC Siêu Tốc Giữa F# và TypeScript (Zero-Copy Streaming)

Để loại bỏ hoàn toàn chi phí đóng gói chuỗi JSON cồng kềnh:

1. **Duy Trì Tiến Trình Daemon Dài Hạn**:
   - Tầng TypeScript khởi động file thực thi F# Native AOT một lần duy nhất khi mở giao diện đồ thị và duy trì kết nối liên tục suốt phiên làm việc.
2. **Giao Thức Truyền Tải Dạng Nhị Phân Siêu Nén**:
   - Sử dụng chuẩn mã hóa nhị phân MessagePack hoặc FlatBuffers thay cho chuỗi JSON thuần. Tốc độ đóng gói và giải nén nhị phân nhanh gấp từ 5 đến 10 lần so với JSON.
3. **Phân Trang Khung Nhìn Ảo (Virtual Window Streaming)**:
   - Engine không bao giờ gửi toàn bộ 50.000 hoặc 100.000 commit vào giao diện một lúc.
   - Engine chỉ gửi về đúng số lượng commit nằm vừa trong màn hình hiển thị của người dùng (kèm một vùng đệm an toàn khoảng vài trăm dòng).
   - Khi người dùng cuộn chuột đến đâu, giao diện gửi yêu cầu khoảng dòng hiển thị và engine stream dữ liệu đã tính sẵn về trong vòng chưa đầy 5 phần nghìn giây.

---

## 6. Lộ Trình Hiện Thực Hóa Từng Bước

| Giai đoạn | Mục Tiêu Kỹ Thuật | Kết Quả Nghiệm Thu |
| :--- | :--- | :--- |
| **Giai đoạn 1** | Xây dựng Dự án F# & Định nghĩa Toàn bộ Domain Types | Hoàn thiện cấu trúc dự án F#, cài đặt bộ kiểm thử tự động kiểm tra tính đúng đắn của toàn bộ mô hình dữ liệu và bảng phân loại lỗi. |
| **Giai đoạn 2** | Tích hợp Bộ Đọc Dữ Liệu Git Tốc Độ Cao | Hoàn thiện module đọc log và cây nhánh qua LibGit2/commit-graph, đạt tốc độ nạp dữ liệu dưới 50ms cho kho chứa 20.000 commits. |
| **Giai đoạn 3** | Cài đặt Thuật Toán Xếp Làn Đồ Thị Song Song | Hoàn thiện bộ thuật toán tính toán phân làn và tọa độ hình học đồ thị song song đa luồng. |
| **Giai đoạn 4** | Xây dựng Giao Thức IPC & Biên Dịch Native AOT | Xuất bản file nhị phân độc lập siêu nhẹ (~8MB), kết nối trơn tru với Extension Host qua đường ống xuất nhập chuẩn. |
| **Giai đoạn 5** | Tích hợp Hoàn Chỉnh Với Giao Diện Webview | Kết nối với tầng giao diện Preact Phase 1, đạt độ mượt mà tuyệt đối 60-120 khung hình/giây trên các kho mã nguồn khổng lồ. |
