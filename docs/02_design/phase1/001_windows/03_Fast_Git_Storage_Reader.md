# 03. Thiết Kế Tầng Đọc Dữ Liệu Git Tốc Độ Cao (Fast Git Storage Reader)

Tài liệu này đặc tả chi tiết kiến trúc tầng đọc dữ liệu Git tốc độ cao trên Windows, tích hợp thư viện C gốc LibGit2 và cơ chế ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) với định dạng nhị phân `commit-graph`, thay thế hoàn toàn việc gọi tiến trình dòng lệnh CLI chậm chạp.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào kiến trúc bộ nhớ, định dạng nhị phân và luồng xử lý kỹ thuật, không sử dụng mã nguồn mẫu.

---

## 1. Kiến Trúc Tích Hợp Thư Viện C Gốc LibGit2 Trên Windows

### 1.1. So Sánh Với Cách Tiếp Cận Cũ

- **Cách tiếp cận cũ (TypeScript + CLI spawn)**: Mỗi lần truy vấn thông tin, Node.js phải gọi lệnh hệ thống tạo tiến trình mới (`git.exe`). Trên Windows, mỗi lần tạo tiến trình tiêu tốn từ 30ms đến 80ms, nạp lại hàng chục DLL và cấp phát lại vùng nhớ. Khi mở một repository, hàng chục tiến trình được tạo và tiêu hủy liên tục, gây nghẽn CPU và giật lag hệ thống.
- **Cách tiếp cận mới (F# + In-Process Native LibGit2)**:
  - Nhân F# liên kết trực tiếp với thư viện mã máy C `libgit2.dll` trong cùng một không gian tiến trình (In-Process).
  - Mọi thao tác truy vấn dữ liệu được thực thi thông qua các lời gọi hàm C trực tiếp với chi phí chuyển giao gần như bằng 0 (dưới một phần triệu giây cho mỗi lời gọi).
  - Dữ liệu thô từ cơ sở dữ liệu Git được nạp thẳng vào bộ nhớ của engine mà không phải trải qua các bước trung gian của dòng lệnh.

### 1.2. Cơ Chế Gọi Hàm Native An Toàn (P/Invoke)

- Tầng Storage của F# thiết lập một lớp giao tiếp gọi hàm native an toàn, bao bọc các hàm cốt lõi của LibGit2:
  1. **Khởi tạo và giải phóng tài nguyên kho mã nguồn**: Mở kết nối đến thư mục kho mã nguồn trên đĩa, quản lý con trỏ bộ nhớ gốc và bảo đảm tự động thu hồi tài nguyên ngay khi hoàn tất.
  2. **Bộ duyệt lịch sử commit (Revision Walker)**: Khởi tạo tiến trình duyệt đồ thị commit theo thứ tự topo thời gian, đẩy các con trỏ HEAD hoặc con trỏ nhánh vào bộ duyệt và duyệt tuần tự các commit kế tiếp bằng con trỏ bộ nhớ native.
  3. **Trích xuất thông tin đối tượng commit**: Đọc trực tiếp các trường thông tin: mã băm SHA, danh sách con trỏ tới các commit cha, tên tác giả, email, ngày giờ và chuỗi thông điệp.

---

## 2. Đọc Trực Tiếp File Nhị Phân Commit-Graph Bằng Ánh Xạ Bộ Nhớ

Đối với các kho mã nguồn hiện đại và quy mô lớn, Git hỗ trợ một cấu trúc dữ liệu nhị phân chuyên dụng có tên là `commit-graph`, lưu trữ tại đường dẫn `.git/objects/info/commit-graph`.

### 2.1. Cấu Trúc File Nhị Phân Commit-Graph

Tệp này tổ chức đồ thị commit thành các khối dữ liệu nhị phân có kích thước cố định, cho phép tra cứu tức thời:

- **Phần đầu tệp (Header)**: Chứa 4 byte chữ ký nhận diện, mã phiên bản định dạng, loại thuật toán băm (SHA-1 hoặc SHA-256) và số lượng các bảng dữ liệu bên trong.
- **Bảng phân bố OID (OID Fanout Table)**: Bảng gồm 256 phần tử, giúp thu hẹp phạm vi tìm kiếm mã băm commit theo byte đầu tiên với độ phức tạp cực nhỏ.
- **Bảng danh sách OID (OID Lookup Table)**: Danh sách toàn bộ các mã băm commit được sắp xếp theo thứ tự từ điển, cho phép tìm kiếm nhị phân commit trong thời gian vài micro giây.
- **Bảng dữ liệu Commit (Commit Data Chunk)**: Chứa thông tin cố định của từng commit (vị trí cây mã nguồn, generation number phục vụ duyệt topo nhanh, và vị trí các commit cha).
- **Bảng danh sách commit cha mở rộng (Extra Edge List)**: Dành riêng cho các commit sáp nhập đa nhánh (Octopus Merge có từ 3 commit cha trở lên).

### 2.2. Kỹ Thuật Ánh Xạ Bộ Nhớ Trực Tiếp (Memory-Mapped Files)

- Thay vì mở file và đọc từng byte vào RAM qua các hàm đọc ghi tệp thông thường, engine F# sử dụng API ánh xạ bộ nhớ trực tiếp của hệ điều hành Windows:
  - Hệ điều hành ánh xạ toàn bộ tệp nhị phân trên đĩa vào không gian địa chỉ ảo của tiến trình F#.
  - Quá trình nạp một tệp `commit-graph` chứa 100.000 commit diễn ra **gần như tức thì (từ 1 đến 2 phần nghìn giây)** vì dữ liệu chỉ thực sự được nạp từ đĩa vào RAM khi CPU truy cập tới địa chỉ tương ứng (cơ chế phân trang theo yêu cầu của hệ điều hành).
  - Thuật toán duyệt phả hệ commit đọc trực tiếp generation number và offset của commit cha thông qua các con trỏ bộ nhớ native mà không phải giải nén bất kỳ file đối tượng nén nào trong thư mục `.git/objects/`.

### 2.3. Cơ Chế Dự Phòng Tự Động (Fallback Strategy)

- Nếu kho mã nguồn của người dùng chưa bật tính năng tạo file `commit-graph` (thường gặp ở các repo cũ hoặc repo tạo bằng các công cụ bên thứ ba):
  - Tầng Storage tự động phát hiện sự vắng mặt của tệp này và chuyển giao nhiệm vụ đọc dữ liệu sang bộ duyệt lịch sử của LibGit2 một cách trong suốt.
  - Đồng thời, engine có thể phát tín hiệu gợi ý chạy tác vụ tạo ngầm file `commit-graph` để tăng tốc độ cho các lần mở tiếp theo.

---

## 3. Tối Ưu Hóa Bộ Nhớ Zero-Allocation & Bảng Mã UTF-8 Tiếng Việt

Một trong những nguyên nhân lớn nhất khiến bản TypeScript cũ bị giật lag là việc cấp phát hàng triệu chuỗi ngắn hạn vào bộ nhớ thu gom rác (GC Allocation Storm). Tầng Storage mới của F# loại bỏ hoàn toàn vấn đề này:

### 3.1. Kỹ Thuật Lát Cắt Bộ Nhớ Liên Tục (Zero-Allocation Span)

- Thay vì sao chép từng mảng byte từ LibGit2 sang chuỗi mới trên bộ nhớ heap của .NET, engine sử dụng các cấu trúc con trỏ an toàn dạng lát cắt bộ nhớ liên tục (`ReadOnlySpan<byte>`):
  - Các thao tác tìm kiếm ký tự phân cách, trích xuất độ dài tiêu đề commit, phân tích múi giờ được thực hiện trực tiếp trên mảng byte thô nằm trong bộ đệm của LibGit2.
  - Không tạo ra bất kỳ đối tượng trung gian nào cho bộ gom rác trong suốt quá trình phân tích hàng chục nghìn commit.
  - Nhờ đó, bộ gom rác của .NET hầu như không phải hoạt động, loại bỏ hoàn toàn các đợt đóng băng ứng dụng (GC Pauses) thường thấy ở JavaScript V8.

### 3.2. Giải Mã Chuỗi UTF-8 Tiếng Việt & Ký Tự Quốc Tế Chuẩn Xác

- **Vấn đề trên Windows CLI**:
  - Khi gọi lệnh Git qua dòng lệnh Command Prompt hoặc PowerShell trên Windows, nếu không được cấu hình cẩn thận, Git sẽ tự động mã hóa các ký tự tiếng Việt có dấu và ký tự Unicode thành chuỗi thoát bát phân (ví dụ: `\341\272\243nh.png`). Khi Node.js đọc lại các chuỗi này, tên file và thông điệp commit rất dễ bị lỗi font hoặc hiển thị thành các ký tự rác.
- **Giải pháp trên F# Storage**:
  - LibGit2 và tệp nhị phân lưu trữ trực tiếp các byte UTF-8 thô nguyên bản của tác giả.
  - Tầng Storage của F# đọc trực tiếp luồng byte này và giải mã thẳng sang chuỗi Unicode của .NET bằng bộ giải mã UTF-8 chuẩn xác.
  - Đảm bảo 100% các thông điệp commit tiếng Việt có dấu, tiếng Nhật, tiếng Trung và các biểu tượng cảm xúc (emoji) hiển thị sắc nét, nguyên bản và không bao giờ bị lỗi font.
