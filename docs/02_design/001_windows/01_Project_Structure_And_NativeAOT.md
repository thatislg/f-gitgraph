# 01. Thiết Kế Cấu Trúc Dự Án F# & Cấu Hình Biên Dịch Native AOT (Windows)

Tài liệu này đặc tả chi tiết kiến trúc tổ chức mã nguồn, phân tách module chức năng và cơ chế biên dịch xuất bản mã máy **Native AOT** trên môi trường Windows 64-bit cho nhân tính toán F-GitGraph.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào kiến trúc và cấu hình hệ thống, không sử dụng mã nguồn mẫu.

---

## 1. Tổ Chức Cấu Trúc Thư Mục & Phân Tách Trách Nhiệm

Dự án nhân F# được đặt hoàn toàn trong thư mục `src/core-engine/`, hoạt động độc lập và không phụ thuộc vào hệ sinh thái Node.js của extension:

- **Thư mục gốc của nhân F# (`src/core-engine/`)**:
  - Chứa tệp cấu hình dự án F# chính quy định các thuộc tính biên dịch Native AOT và các gói phụ thuộc tối thiểu cần thiết.
- **Tầng Miền Nghiệp Vụ (`src/core-engine/Domain/`)**:
  - Định nghĩa toàn bộ hệ thống kiểu dữ liệu bất biến: mã băm Git, thông tin tác giả, cấu trúc nút commit, các loại tham chiếu nhánh/thẻ, trạng thái đang diễn ra dở dang của kho mã nguồn và toàn bộ bảng phân loại lỗi hệ thống.
  - Tầng này hoàn toàn thuần túy (Pure Domain), không phụ thuộc vào bất kỳ thư viện ngoài nào, đóng vai trò là "ngôn ngữ chung" cho toàn bộ các tầng khác.
- **Tầng Truy Cập Dữ Liệu (`src/core-engine/Storage/`)**:
  - Chịu trách nhiệm đọc dữ liệu thô từ cơ sở dữ liệu nội bộ của Git: kết nối trực tiếp với thư viện C gốc LibGit2 và cơ chế ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) với file `commit-graph`.
  - Thực hiện giải mã chuỗi UTF-8 tiếng Việt và tối ưu hóa bộ nhớ không cấp phát rác (Zero-Allocation).
- **Tầng Giải Thuật Đồ Thị (`src/core-engine/Graph/`)**:
  - Chịu trách nhiệm thực thi thuật toán sắp xếp Topo (Topological Sort) cho phả hệ commit.
  - Phân bổ làn đồ thị thu gọn về bên trái (Left-compact Lane Allocation) và tính toán song song đa luồng CPU toàn bộ tọa độ hình học phẳng SVG (tâm nút, đường cong bezier, đường sáp nhập).
- **Tầng Giao Tiếp Vận Chuyển (`src/core-engine/Transport/`)**:
  - Quản lý kênh giao tiếp hai chiều với VS Code Extension Host qua đường ống xuất nhập chuẩn (Stdio RPC).
  - Đóng gói và giải nén các gói tin nhị phân siêu nén theo chuẩn MessagePack.
  - Quản lý cơ chế phân trang cửa sổ ảo (Virtual Scrolling Window) để stream dữ liệu theo khung nhìn hiển thị.
- **Điểm Khởi Chạy Chương Trình (`src/core-engine/Program.fs`)**:
  - Khởi tạo tiến trình, đăng ký cơ chế bắt lỗi toàn cục, thiết lập luồng xử lý xuất nhập và duy trì vòng lặp lắng nghe các yêu cầu từ extension.

---

## 2. Cơ Chế Biên Dịch Xuất Bản Native AOT Trên Windows

### 2.1. Nguyên Lý Hoạt Động Của Native AOT

- Trong mô hình .NET truyền thống, mã nguồn được biên dịch thành mã bytecode trung gian (CIL) và cần máy ảo Common Language Runtime (CLR) cùng trình biên dịch Just-In-Time (JIT) để dịch sang mã máy tại thời điểm chạy. Quá trình này đòi hỏi máy người dùng phải cài sẵn .NET Runtime và tốn thời gian khởi động JIT.
- **Mô hình Native AOT (Ahead-Of-Time)**:
  - Trình biên dịch mã máy tối ưu hóa trước toàn bộ mã nguồn F# cùng một tập hợp con tối thiểu của runtime .NET ngay trong quá trình build trên máy của nhà phát triển.
  - Kết hợp với bộ công cụ liên kết mã máy MSVC Linker của Windows để tạo ra một file thực thi định dạng PE (`f-gitgraph-core.exe`) thuần túy.
  - Khi người dùng chạy file này trên Windows, hệ điều hành nạp trực tiếp mã máy vào bộ nhớ và thực thi ngay lập tức, không qua bất kỳ lớp thông dịch hay JIT nào.

### 2.2. Các Thiết Lập Tối Ưu Hóa Biên Dịch Bắt Buộc

1. **Thiết lập Nền tảng Mục tiêu**:
   - Định danh hệ điều hành và kiến trúc: Windows 64-bit (`win-x64`).
   - Chế độ tự chứa toàn diện (Self-Contained): Nhúng toàn bộ các thành phần runtime cơ bản vào chính file thực thi.
2. **Kỹ Thuật Cắt Tỉa Mã Nguồn Tích Cực (Aggressive Trimming)**:
   - Trình phân tích tĩnh quét toàn bộ mã nguồn từ điểm khởi chạy và loại bỏ triệt để mọi lớp, hàm hoặc cấu trúc dữ liệu không bao giờ được gọi tới trong toàn bộ hệ thống thư viện chuẩn .NET.
   - Nhờ đó, kích thước file thực thi giảm từ hàng trăm MB xuống mức siêu nhỏ gọn.
3. **Tối Ưu Hóa Liên Kết Toàn Cục (Link Time Optimization - LTO)**:
   - Cho phép MSVC Linker tối ưu hóa mã máy xuyên suốt giữa các module và các hàm C native, nội suy (inlining) các hàm nhỏ để tối đa hóa tốc độ thực thi.
4. **Lược Bỏ Ký Hiệu Gỡ Lỗi (Symbol Stripping)**:
   - Loại bỏ toàn bộ bảng biểu tượng gỡ lỗi (PDB symbols) ra khỏi file nhị phân phát hành chính thức, giúp bảo mật cấu trúc nội bộ và giảm thêm dung lượng file.
5. **Cấu Hình Toàn Cầu Hóa Bất Biến (Invariant Globalization)**:
   - Vì nhân F# chủ yếu thao tác với mã băm SHA, đường dẫn file và chuỗi UTF-8, cấu hình toàn cầu hóa bất biến giúp cắt giảm các bảng tra cứu văn hóa quốc gia nặng nề của Windows, tiết kiệm thêm từ 3MB đến 5MB dung lượng.

---

## 3. Tối Ưu Hóa Kích Thước File & Độ Trễ Khởi Động Lạnh

### 3.1. Mục Tiêu Dung Lượng File (< 10MB)

- Nhờ áp dụng đồng thời kỹ thuật cắt tỉa mã nguồn và liên kết tĩnh, file `f-gitgraph-core.exe` đầu ra đạt kích thước nằm trong khoảng tối ưu **từ 6MB đến 9MB**.
- Mức dung lượng này hoàn toàn nhẹ nhàng, giúp gói cài đặt extension VSIX giữ được tính nhỏ gọn, thuận tiện cho việc chia sẻ và cài đặt nhanh chóng.

### 3.2. Mục Tiêu Độ Trễ Khởi Động Lạnh (< 5ms)

- Không có bước nạp JIT: Hệ điều hành Windows chỉ việc ánh xạ các trang mã máy từ ổ đĩa vào RAM và nhảy thẳng đến điểm nhập của chương trình.
- Cấu trúc vùng nhớ heap ban đầu được định lượng trước (Pre-sized Heap), tránh việc hệ điều hành phải cấp phát lại vùng nhớ liên tục trong giây đầu tiên.
- Kết quả kiểm thử kỳ vọng: Thời gian từ khi lệnh gọi tiến trình được phát ra từ Node.js đến khi F# gửi lại thông điệp sẵn sàng đầu tiên đạt **dưới 5 phần nghìn giây**.

---

## 4. Quy Trình Kiểm Định Tính Độc Lập Trên Môi Trường Windows Sạch

Để đảm bảo người dùng cuối cài extension là sử dụng được ngay mà không bao giờ gặp lỗi thiếu môi trường phụ trợ, quy trình kiểm định sau đây là bắt buộc:

1. **Chuẩn Bị Môi Trường Kiểm Thử**:
   - Sử dụng một máy ảo Windows 10 hoặc Windows 11 mới cài đặt nguyên bản (Clean Windows Environment), hoàn toàn không cài đặt Visual Studio, .NET SDK hay bất kỳ phiên bản .NET Framework/Runtime tùy biến nào.
2. **Kịch Bản Kiểm Tra Khởi Động Độc Lập**:
   - Sao chép trực tiếp file `f-gitgraph-core.exe` vào máy ảo sạch.
   - Chạy lệnh kiểm tra phiên bản hoặc lệnh phản hồi tức thời từ Command Prompt.
   - Tiêu chí đạt: File thực thi chạy thành công tức thì, trả về đúng mã định danh phiên bản và mã thoát 0 mà không đòi hỏi người dùng phải tải thêm bất kỳ gói cập nhật nào từ Microsoft.
3. **Kiểm Tra Tính Toàn Vẹn Của Các Thư Viện C Gốc**:
   - Sử dụng công cụ phân tích phụ thuộc để xác nhận file thực thi chỉ liên kết tới các thư viện DLL cốt lõi luôn có sẵn trong hệ điều hành Windows (`kernel32.dll`, `ntdll.dll`, `ucrtbase.dll`), không có bất kỳ liên kết thiếu nào.
