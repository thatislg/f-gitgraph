# Phase 2 Investigation: Bản Điều Tra Kiến Trúc Đa Nền Tảng (Cross-Platform)

Tài liệu này nghiên cứu chi tiết cấu trúc ứng dụng, cơ chế biên dịch và cách thức đóng gói để **Neo Git Graph (với nhân F# Native AOT)** hoạt động trơn tru, hiệu năng cao và an toàn trên cả 3 hệ điều hành lớn: **Windows, Linux và macOS**.

> [!NOTE]
> Tài liệu này được biên soạn theo nguyên tắc thiết kế khái niệm thuần túy: mô tả kiến trúc, luồng hoạt động và quy trình bằng ngôn ngữ tự nhiên, không sử dụng mã nguồn mẫu.

---

## 1. Ma Trận Nền Tảng Mục Tiêu (Target Matrix)

| Hệ Điều Hành | Phiên Bản Hỗ Trợ | Kiến Trúc CPU | Mã Định Danh Runtime (.NET RID) | Tên File Nhị Phân Đầu Ra |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Windows 10, Windows 11+ | x64 (AMD64) | `win-x64` | `neo-git-core.exe` |
| **Windows** | Windows 11 on ARM | ARM64 | `win-arm64` | `neo-git-core.exe` |
| **Linux** | Ubuntu 20.04+, Fedora 38+, Debian 11+ | x64 (AMD64) | `linux-x64` | `neo-git-core` |
| **Linux** | Ubuntu/Debian on ARM, Raspberry Pi 4/5 | ARM64 (aarch64) | `linux-arm64` | `neo-git-core` |
| **macOS** | macOS 12 Monterey trở lên (M1/M2/M3/M4) | ARM64 (Apple Silicon) | `osx-arm64` | `neo-git-core` |
| **macOS** | macOS 11 Big Sur trở lên | x64 (Intel Mac) | `osx-x64` | `neo-git-core` |

---

## 2. Cấu Trúc Tổ Chức Thư Mục Ứng Dụng

Ứng dụng được phân định rõ ràng giữa tầng giao diện TypeScript/Preact và tầng tính toán nhị phân F#:

- **Thư mục cấu hình và mã nguồn mở rộng (`package.json`, `src/extension/`)**:
  - Đóng vai trò cầu nối nhẹ (Thin Client) chạy trên tiến trình Node.js của VS Code.
  - Chịu trách nhiệm đăng ký lệnh, quản lý cấu hình giao diện, tiếp nhận tương tác người dùng và điều phối tiến trình.
- **Thư mục giao diện Webview (`src/webview/`)**:
  - Kế thừa toàn bộ kết quả phát triển từ Phase 1 (các thành phần vẽ nút lục giác, hiệu ứng vầng sáng neon, xem trước avatar tác giả, panel chi tiết commit).
- **Thư mục mã nguồn nhân tính toán F# (`src/core-engine/`)**:
  - Chứa toàn bộ logic tính toán đồ thị, đọc cấu trúc git, phân tích cây nhánh và định dạng dữ liệu truyền tải.
- **Thư mục chứa các bản nhị phân độc lập (`bin/`)**:
  - Được chia thành các thư mục con tương ứng với từng hệ điều hành và kiến trúc chip: thư mục cho Windows 64-bit (`win-x64`), Windows ARM (`win-arm64`), Linux 64-bit (`linux-x64`), Linux ARM (`linux-arm64`), macOS chip Apple Silicon (`osx-arm64`) và macOS chip Intel (`osx-x64`).
  - Mỗi thư mục con chứa đúng một file thực thi duy nhất đã được biên dịch Native AOT (`neo-git-core.exe` trên Windows hoặc `neo-git-core` trên Unix).

---

## 3. Cơ Chế Phát Hiện & Nạp File Nhị Phân Khi Chạy (Platform Resolver)

Khi người dùng kích hoạt extension trên máy tính của mình, tầng điều phối TypeScript sẽ thực hiện quy trình 4 bước hoàn toàn tự động bằng lời mô tả như sau:

1. **Nhận diện Môi trường Hệ thống**:
   - Truy vấn thông tin hệ điều hành đang chạy (xác định xem máy là Windows, Linux hay macOS).
   - Truy vấn kiến trúc vi xử lý (xác định máy đang dùng chip x64 truyền thống hay kiến trúc ARM64).
2. **Ánh Xạ Sang Thư Mục Nhị Phân Tương Ứng**:
   - Dựa trên kết quả ở bước 1, chương trình đối chiếu với bảng mã định danh runtime để tìm đường dẫn tuyệt đối đến thư mục chứa file thực thi nằm trong gói extension.
   - Kiểm tra sự tồn tại vật lý của file thực thi trên ổ đĩa. Nếu không tìm thấy, hệ thống thông báo lỗi chi tiết đến người dùng kèm hướng dẫn xử lý.
3. **Kiểm Tra & Tự Động Cấp Quyền Thực Thi (Trên Linux và macOS)**:
   - Trên các hệ điều hành Unix, file thực thi cần có cờ quyền chạy (executable bit).
   - Module điều phối sẽ chủ động đọc thuộc tính phân quyền của file. Nếu cờ quyền chạy chưa được kích hoạt, chương trình tự động cấp quyền đọc và thực thi cho chủ sở hữu mà không cần người dùng phải mở terminal gõ lệnh thủ công.
4. **Khởi Tạo Tiến Trình Con Dưới Dạng Sidecar**:
   - Sau khi xác thực file nhị phân hợp lệ, extension tiến hành khởi chạy tiến trình nhân F# ở chế độ chạy nền, kết nối 2 luồng nhập xuất chuẩn để sẵn sàng trao đổi dữ liệu.

---

## 4. Những Thách Thức Kỹ Thuật Đa Nền Tảng & Giải Pháp

### 4.1. Đường Dẫn File & Phân Cách Thư Mục Giữa Các Hệ Điều Hành
- **Vấn đề thực tế**:
  - Windows sử dụng dấu gạch chéo ngược (`\`) và có ký tự phân vùng ổ đĩa (như `C:`, `D:`).
  - Linux và macOS sử dụng dấu gạch chéo xuôi (`/`) và bắt đầu từ thư mục gốc.
  - Định dạng nội bộ bên trong cơ sở dữ liệu Git (các object và cây ref) luôn luôn sử dụng dấu gạch chéo xuôi trên mọi hệ điều hành.
- **Giải pháp thiết kế**:
  - Tại tầng nhân F#, xây dựng một kiểu dữ liệu chuẩn hóa đường dẫn. Mọi đường dẫn từ hệ điều hành chuyển vào đều được chuyển đổi đồng nhất về dạng chuẩn hóa trước khi đưa vào thuật toán phân tích.

### 4.2. Bảo Vệ Quyền Thực Thi File Trên Hệ Thống Unix
- **Vấn đề thực tế**:
  - Khi đóng gói file cài đặt VSIX từ máy tính chạy Windows, các thuộc tính cờ quyền đặc thù của Unix (như cờ cho phép chạy file) thường bị lược bỏ.
  - Khi người dùng Ubuntu, Fedora hoặc macOS cài đặt file VSIX này, file nhị phân có nguy cơ bị hệ điều hành từ chối khởi chạy với thông báo từ chối quyền truy cập.
- **Giải pháp thiết kế**:
  - Tầng TypeScript luôn giữ vai trò bảo vệ: kiểm tra cờ phân quyền ngay trước thời điểm khởi tạo tiến trình con. Nếu thiếu cờ, nó lập tức cập nhật lại thuộc tính file theo chuẩn Unix an toàn.

### 4.3. Cơ Chế Kiểm Soát Ứng Dụng Trên macOS (Gatekeeper & Ký Số)
- **Vấn đề thực tế**:
  - Hệ điều hành macOS từ các phiên bản gần đây áp dụng cơ chế Gatekeeper rất nghiêm ngặt. Bất kỳ file thực thi nào tải từ internet hoặc không có chữ ký số của nhà phát triển được Apple chứng thực đều bị chặn khởi chạy và gán thuộc tính cách ly (quarantine).
- **Giải pháp thiết kế**:
  - Đối với các bản thử nghiệm nội bộ: Thực hiện quy trình ký số tạm thời (ad-hoc code signing) ngay trên môi trường build của macOS để hệ điều hành nhận diện file có cấu trúc hợp lệ.
  - Tầng TypeScript được trang bị logic kiểm tra và gỡ bỏ thuộc tính cách ly nếu file nhị phân nằm trong thư mục extension hợp lệ của người dùng.
  - Đối với bản phát hành thương mại lên Visual Studio Marketplace: Tích hợp chứng chỉ nhà phát triển chính thức vào quy trình xuất bản tự động.

### 4.4. Tính Tương Thích Thư Viện C-Runtime Trên Các Bản Phân Phối Linux
- **Vấn đề thực tế**:
  - Thế giới Linux rất đa dạng: Ubuntu và Debian sử dụng các chu kỳ phát hành thư viện chuẩn C (glibc) khác với Fedora hay Arch Linux.
  - Nếu file nhị phân được biên dịch trên một hệ thống có phiên bản glibc quá mới, người dùng sử dụng các bản Ubuntu phiên bản cũ (như Ubuntu 20.04 LTS) sẽ gặp lỗi thiếu phiên bản thư viện và không thể khởi động engine.
- **Giải pháp thiết kế**:
  - Quy định môi trường biên dịch tiêu chuẩn cho Linux luôn được thực hiện trên container chạy phiên bản Linux có glibc nền tảng ổn định nhất (tương đương chuẩn Ubuntu 20.04).
  - Các file nhị phân được biên dịch từ môi trường nền tảng này đảm bảo tương thích ngược 100% với các bản phân phối mới hơn như Ubuntu 22.04, Ubuntu 24.04, Fedora 38 trở lên hay Red Hat Enterprise Linux.

---

## 5. Chiến Lược Đóng Gói File Cài Đặt (VSIX Packaging Strategy)

Dự án đề xuất lộ trình đóng gói 2 giai đoạn:

### Giai đoạn Thử nghiệm & Phát triển: Gói Đa Năng Toàn Diện (Universal VSIX)
- **Cách thức thực hiện**: Đóng gói toàn bộ các file nhị phân của tất cả các hệ điều hành mục tiêu vào chung một file cài đặt `.vsix`.
- **Lợi ích**:
  - Người dùng hoặc người kiểm thử chỉ cần tải duy nhất một file để cài đặt trên bất kỳ thiết bị nào (laptop Windows, máy bàn Linux hoặc Macbook).
  - Quy trình phân phối qua các bản phát hành thử nghiệm rất gọn gàng.
- **Đánh giá kích thước**: Nhờ ưu thế tối ưu dung lượng của Native AOT (mỗi file nhị phân chỉ khoảng 6 đến 8 MB), tổng dung lượng gói cài đặt chỉ vào khoảng hơn 30 MB, hoàn toàn nằm trong mức tiêu chuẩn của các tiện ích mở rộng tương tự trong hệ sinh thái VS Code.

### Giai đoạn Phát hành Chính thức: Gói Chuyên Biệt Từng Nền Tảng (Platform-Specific VSIX)
- **Cách thức thực hiện**: Tận dụng cơ chế phân phối theo nền tảng của Visual Studio Marketplace. Mỗi hệ điều hành và kiến trúc chip được đóng gói thành một file cài đặt riêng biệt.
- **Lợi ích**:
  - Người dùng tải về đúng gói nhị phân tương thích với máy của mình.
  - Kích thước tải về đạt mức siêu nhỏ gọn (chỉ khoảng 8 MB), tiết kiệm tối đa băng thông và thời gian cài đặt.

---

## 6. Quy Trình Tự Động Hóa Xây Dựng Bản Dựng (CI/CD Pipeline)

Quy trình tích hợp và kiểm thử liên tục được thiết kế dựa trên hệ thống máy chủ tự động hóa:

1. **Khởi Động Đa Luồng Song Song (Build Matrix)**:
   - Hệ thống tự động kích hoạt đồng thời 3 môi trường thực thi độc lập: máy ảo chạy Windows mới nhất, máy ảo chạy Ubuntu phiên bản ổn định và máy ảo chạy macOS mới nhất.
2. **Thực Thi Biên Dịch Native AOT**:
   - Trên mỗi môi trường, hệ thống tải mã nguồn, thiết lập công cụ phát triển .NET, và gọi lệnh xuất bản Native AOT tự chứa (self-contained) tương ứng với từng kiến trúc CPU.
   - Đầu ra là các file nhị phân mã máy thuần túy, không chứa mã bytecode trung gian.
3. **Kiểm Tra Tính Toàn Vẹn & Thu Thập Sản Phẩm**:
   - Hệ thống kiểm tra dung lượng file, chạy thử nghiệm kiểm tra tính năng khởi động của từng file nhị phân.
   - Toàn bộ các file nhị phân sau khi đạt chuẩn kiểm thử sẽ được tập hợp về kho lưu trữ thành phẩm để chuẩn bị cho bước đóng gói extension.

---

## 7. Kết Luận Đánh Giá Khả Thi

- **Tính khả thi tuyệt đối**: Công nghệ F# kết hợp với .NET Native AOT đáp ứng hoàn hảo yêu cầu chạy đa nền tảng trên Windows 10/11, Linux (Ubuntu, Fedora) và macOS (cả chip Intel và Apple Silicon).
- **Trải nghiệm người dùng trong suốt**: Người dùng cuối không phải cài đặt bất kỳ thành phần phụ trợ nào (không cần cài .NET SDK, Mono hay Python). Mọi thao tác phát hiện hệ điều hành và phân quyền chạy đều được tầng giao diện xử lý tự động trong tích tắc.
