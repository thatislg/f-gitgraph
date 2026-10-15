# Phase 2 Investigation: Lộ Trình Phát Triển Đa Nền Tảng (Windows -> Linux -> macOS)

Tài liệu này xác lập lộ trình phát triển kỹ thuật (Roadmap) từng bước cho việc xây dựng nhân tính toán Git bằng **F# (.NET / Native AOT)**, với chiến lược ưu tiên thực thi dứt điểm theo thứ tự nền tảng: **Windows trước $\rightarrow$ Linux thứ hai $\rightarrow$ macOS hoàn thiện cuối cùng**.

> [!NOTE]
> Tài liệu này được biên soạn theo nguyên tắc thiết kế khái niệm thuần túy: mô tả quy trình, mục tiêu, rủi ro và tiêu chí nghiệm thu bằng ngôn ngữ tự nhiên, không sử dụng mã nguồn mẫu.

---

## 1. Cơ Sở Lựa Chọn Thứ Tự Triển Khai (Platform Prioritization Strategy)

Thứ tự ưu tiên **Windows $\rightarrow$ Linux $\rightarrow$ macOS** được xây dựng dựa trên các luận cứ kỹ thuật thực tế:

1. **Ưu tiên số 1: Windows (Nền tảng khởi đầu then chốt)**
   - _Nguyên nhân_: Windows là môi trường làm việc chính hiện tại của nhóm phát triển. Đồng thời, Windows cũng là nơi bộc lộ rõ nhất các điểm nghẽn hiệu năng của TypeScript (chi phí gọi tiến trình con `CreateProcess` rất đắt đỏ, hiện tượng khóa file `index.lock`, xung đột dấu gạch chéo đường dẫn, lỗi mã hóa UTF-8 tiếng Việt).
   - _Chiến lược_: Nếu nhân F# giải quyết triệt để được các thách thức phức tạp nhất trên Windows, toàn bộ mô hình dữ liệu (Domain Model) và thuật toán phân làn đồ thị coi như đã hoàn thành 80% khối lượng kỹ thuật cốt lõi.
2. **Ưu tiên số 2: Linux (Nền tảng chuẩn mực hiệu năng cao)**
   - _Nguyên nhân_: Linux là môi trường quê hương của Git, có hệ thống quản lý tiến trình và bộ nhớ ảo cực kỳ nhanh. Khi nhân F# đã chạy vững trên Windows, việc đưa sang Linux (Ubuntu, Fedora) sẽ giúp kiểm thử hiệu năng cực hạn trên các kho mã nguồn khổng lồ (như Linux kernel với hàng triệu commit).
   - _Trọng tâm giải quyết_: Bài toán tương thích các phiên bản thư viện chuẩn C (`glibc`) giữa các bản phân phối Linux khác nhau và cơ chế phân quyền thực thi file.
3. **Ưu tiên số 3: macOS (Nền tảng hoàn thiện & trải nghiệm cao cấp)**
   - _Nguyên nhân_: macOS chia sẻ chung nền tảng Unix với Linux, do đó logic đọc dữ liệu và thuật toán đồ thị sẽ thừa hưởng trọn vẹn từ giai đoạn Linux mà không cần viết lại.
   - _Trọng tâm giải quyết_: Các rào cản đặc thù riêng của hệ sinh thái Apple: hỗ trợ kiến trúc chip Apple Silicon (ARM64), cơ chế bảo mật Gatekeeper, gỡ cờ cách ly file và quy trình ký số ứng dụng.

---

## 2. Chi Tiết Lộ Trình 4 Giai Đoạn Triển Khai

```
┌────────────────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: Windows First Milestone (Xây dựng nền móng nhân F#)       │
│   - Hoàn thiện Domain Model, Fast Reader, Parallel Layout trên Windows │
│   - Kết nối IPC Stdio với Extension Host & Webview UI Phase 1          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Kế thừa thuật toán & Domain
┌───────────────────────────────────▼────────────────────────────────────┐
│ GIAI ĐOẠN 2: Linux Milestone (Mở rộng sang Ubuntu / Fedora)           │
│   - Biên dịch Native AOT trên Linux, xử lý tương thích glibc           │
│   - Stress-test cực hạn với kho mã nguồn hàng triệu commits            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Kế thừa kiến trúc Unix
┌───────────────────────────────────▼────────────────────────────────────┐
│ GIAI ĐOẠN 3: macOS Milestone (Apple Silicon M-series & Intel)          │
│   - Tối ưu hóa mã máy ARM64, giải quyết Apple Gatekeeper               │
│   - Kiểm thử hiển thị mượt mà trên màn hình Retina                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Đóng gói đa nền tảng
┌───────────────────────────────────▼────────────────────────────────────┐
│ GIAI ĐOẠN 4: Unified Packaging & Release (VSIX & CI/CD tự động)        │
│   - Tích hợp CI/CD tự động build đồng thời 3 hệ điều hành              │
│   - Xuất bản Universal VSIX & nghiệm thu an toàn 100% cho lệnh ghi     │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 🚀 Giai Đoạn 1: Windows First Milestone (Trọng Tâm Ban Đầu)

- **Mục tiêu cốt lõi**:
  - Xây dựng hoàn chỉnh bản nhị phân F# Native AOT đầu tiên chạy độc lập trên Windows (`f-gitgraph-core.exe`).
  - Thay thế hoàn toàn tầng đọc log chậm chạp của TypeScript trên môi trường Windows.
  - Kết nối thành công với giao diện Webview Preact đã xây dựng ở Phase 1.
- **Các đầu việc cụ thể**:
  1. _Khởi tạo Solution & Kiến trúc F#_: Thiết lập dự án F#, định nghĩa toàn bộ hệ thống kiểu dữ liệu đại số cho Git Object (Commit, Branch, Tag, Author) và bảng phân loại lỗi vét cạn.
  2. _Cài đặt Tầng Đọc Dữ Liệu Tốc Độ Cao trên Windows_: Tích hợp thư viện C gốc LibGit2 và cơ chế ánh xạ bộ nhớ trực tiếp (Memory-Mapped Files) để đọc file nhị phân `commit-graph`, bỏ qua hoàn toàn việc gọi tiến trình `git.exe` cho tác vụ đọc.
  3. _Hiện thực Thuật toán Xếp Làn Đồ Thị Topo Song Song_: Chuyển đổi logic tính lane từ JavaScript sang F#, phân bổ tính toán trên nhiều luồng CPU.
  4. _Xây dựng Cơ chế Giao Tiếp Nội Bộ (IPC Daemon)_: Thiết lập kênh trao đổi thông điệp qua đường ống xuất nhập chuẩn (Stdio) sử dụng định dạng nhị phân siêu nén MessagePack và phân trang cửa sổ hiển thị ảo.
  5. _Đảm bảo An Toàn Cho Các Lệnh Ghi_: Định tuyến toàn bộ thao tác commit, push, pull, branch sang tiến trình `git.exe` gốc để bảo toàn chữ ký số GPG/SSH và xác thực tài khoản.
- **Tiêu chí nghiệm thu hoàn thành (DoD)**:
  - File nhị phân `f-gitgraph-core.exe` chạy độc lập trên Windows 10/11 mà không đòi hỏi máy phải cài bất kỳ runtime .NET nào.
  - Tốc độ nạp kho mã nguồn 50.000 commits trên Windows đạt mốc dưới 300 phần nghìn giây.
  - Giao diện Webview hiển thị đầy đủ các nút lục giác, hiệu ứng neon ambient, panel thông điệp commit và avatar zoom mà không bị khựng đơ chuột.

---

### 🐧 Giai Đoạn 2: Linux Milestone (Mở Rộng Hệ Sinh Thái Ubuntu & Fedora)

- **Mục tiêu cốt lõi**:
  - Đưa nhân F# Native AOT sang hoạt động ổn định trên các hệ điều hành Linux thông dụng nhất (Ubuntu 20.04+, Fedora 38+, Debian 11+).
  - Khai thác tối đa hiệu năng I/O của Linux để thử nghiệm trên các repository quy mô khổng lồ.
- **Các đầu việc cụ thể**:
  1. _Thiết lập Môi Trường Biên Dịch Chuẩn_: Cấu hình môi trường build Native AOT trên container Linux nền tảng nhằm bảo đảm tính tương thích ngược với các phiên bản thư viện C (`glibc`) cũ và mới.
  2. _Chuẩn Hóa Đường Dẫn & Hệ Thống Tệp Unix_: Kiểm tra tính toàn vẹn của việc đọc file trong thư mục `.git` trên Linux (vốn phân biệt nghiêm ngặt chữ hoa chữ thường - Case-Sensitive).
  3. _Cơ chế Tự Cấp Quyền Chạy Tự Động_: Tầng TypeScript trong extension tự động kiểm tra và cấp quyền thực thi file (`chmod +x`) ngay khi nạp extension trên Linux, loại bỏ hoàn toàn nguy cơ người dùng gặp lỗi bị từ chối quyền truy cập.
  4. _Kiểm Thử Hiệu Năng Giới Hạn (Stress-Testing)_: Thử nghiệm nạp và cuộn đồ thị trên kho mã nguồn Linux kernel chính thống (hơn 1 triệu commit). Đánh giá mức độ chiếm dụng bộ nhớ RAM và độ mượt mà của thanh cuộn.
- **Tiêu chí nghiệm thu hoàn thành (DoD)**:
  - File nhị phân `f-gitgraph-core` chạy trơn tru trên cả máy ảo Ubuntu LTS và Fedora mới nhất mà không báo lỗi thiếu thư viện động.
  - Khởi chạy mượt mà ngay sau khi cài đặt extension mà không yêu cầu người dùng gõ lệnh cấp quyền trong terminal.
  - Mở thành công kho mã nguồn quy mô cực lớn mà bộ nhớ RAM tiêu thụ của tiến trình nhân duy trì dưới 150MB.

---

### 🍎 Giai Đoạn 3: macOS Milestone (Apple Silicon & Intel Mac)

- **Mục tiêu cốt lõi**:
  - Hoàn thiện bản nhị phân mã máy tối ưu hóa cho kiến trúc vi xử lý Apple Silicon (ARM64: M1/M2/M3/M4) và máy Mac dùng chip Intel (x64).
  - Vượt qua toàn bộ các rào cản kiểm soát bảo mật khắt khe của hệ điều hành macOS (Gatekeeper).
- **Các đầu việc cụ thể**:
  1. _Biên Dịch Native AOT Đa Kiến Trúc Chip_: Xuất bản 2 biến thể file nhị phân riêng biệt: một bản tối ưu cho kiến trúc tập lệnh ARM64 của Apple Silicon và một bản cho vi xử lý Intel 64-bit.
  2. _Giải Quyết Rào Cản Apple Gatekeeper_:
     - Tích hợp quy trình ký số tạm thời (ad-hoc code signing) để định dạng file nhị phân đáp ứng đầy đủ yêu cầu cấu trúc của Apple.
     - Cài đặt cơ chế kiểm tra và tự động gỡ bỏ thuộc tính cách ly tệp (quarantine attribute) nếu hệ điều hành tự động đánh dấu cách ly khi giải nén tiện ích mở rộng.
  3. _Kiểm Thử Trải Nghiệm & Hiển Thị Đồ Họa_: Thử nghiệm thực tế trên macOS Ventura, Sonoma và Sequoia. Đảm bảo toàn bộ các thành phần đồ họa SVG (đường cong bezier, vầng sáng neon, avatar độ nét cao) hiển thị sắc nét trên màn hình Retina mà không bị răng cưa.
- **Tiêu chí nghiệm thu hoàn thành (DoD)**:
  - Extension khởi chạy tức thì trên máy Mac chạy chip Apple Silicon mà không xuất hiện cảnh báo bị hệ điều hành chặn từ Gatekeeper.
  - Hiệu ứng cuộn và phóng to avatar đạt tần số quét khung hình tối đa của màn hình ProMotion (120Hz).

---

### 📦 Giai Đoạn 4: Unified Packaging & Release Milestone (Đóng Gói & Nghiệm Thu Toàn Diện)

- **Mục tiêu cốt lõi**:
  - Xây dựng hệ thống tự động hóa build đồng thời cả 3 nền tảng mỗi khi có thay đổi mã nguồn.
  - Đóng gói sản phẩm thành file cài đặt VSIX duy nhất có khả năng chạy trên mọi môi trường.
  - Kiểm thử nghiệm thu an toàn tuyệt đối cho toàn bộ các thao tác ghi dữ liệu.
- **Các đầu việc cụ thể**:
  1. _Tự Động Hóa Quy Trình Xuất Bản (CI/CD Pipeline)_: Cấu hình quy trình tự động kích hoạt máy ảo Windows, Linux và macOS song song để biên dịch ra đầy đủ các file nhị phân và thu thập vào thư mục phân phối `bin/`.
  2. _Đóng Gói Bản Cài Đặt Toàn Diện (Universal VSIX)_: Đóng gói toàn bộ các file nhị phân cùng mã nguồn mở rộng thành một file `.vsix` hoàn chỉnh phục vụ cài đặt thử nghiệm trực tiếp.
  3. _Nghiệm Thu Toàn Bộ Chu Trình Thao Tác Git_:
     - Kiểm thử độc lập trên cả Windows, Linux và macOS đối với toàn bộ các thao tác ghi: tạo commit, chuyển nhánh, xóa nhánh, gộp nhánh (merge), rebase, gắn thẻ tag và đẩy code lên server (push).
     - Xác nhận chữ ký số commit (GPG/SSH) và cơ chế xác thực tài khoản doanh nghiệp (Git Credential Manager) được bảo toàn 100%.
- **Tiêu chí nghiệm thu hoàn thành (DoD)**:
  - Bản cài đặt VSIX duy nhất có thể cài đặt và chạy hoàn hảo trên bất kỳ máy tính nào của nhóm phát triển (dù là máy bàn Windows, laptop Linux hay Macbook).
  - Không phát sinh bất kỳ lỗi dữ liệu hay xung đột file nào trong suốt chu trình làm việc hàng ngày của lập trình viên.

---

## 3. Bảng Tổng Hợp Kế Hoạch & Rủi Ro Từng Chặng

| Chặng           | Nền Tảng Trọng Tâm                 | Rủi Ro Kỹ Thuật Tiềm Ẩn                                                      | Biện Pháp Phòng Ngừa & Kiểm Soát                                                                                              |
| :-------------- | :--------------------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Giai đoạn 1** | **Windows** (win-x64, win-arm64)   | Xung đột file khóa `index.lock` và dấu phân cách đường dẫn ngược.            | Xây dựng bộ chuẩn hóa đường dẫn ở tầng Domain và áp dụng cơ chế retry thông minh có kiểm tra thời gian tồn tại của file khóa. |
| **Giai đoạn 2** | **Linux** (linux-x64, linux-arm64) | Khác biệt phiên bản `glibc` giữa các distro và thiếu quyền thực thi `chmod`. | Biên dịch trên môi trường glibc nền tảng ổn định và trang bị cơ chế tự động cấp cờ thực thi ngay từ tầng điều phối.           |
| **Giai đoạn 3** | **macOS** (osx-arm64, osx-x64)     | Hệ điều hành kích hoạt Gatekeeper chặn file nhị phân chưa ký số Apple.       | Áp dụng quy trình ký số tạm thời ad-hoc và tự động gỡ bỏ cờ cách ly tệp trong thư mục extension hợp lệ.                       |
| **Giai đoạn 4** | **Cả 3 Nền Tảng**                  | Dung lượng file cài đặt VSIX bị phình to nếu chứa nhiều file nhị phân.       | Tối ưu hóa các cờ biên dịch của Native AOT để cắt giảm dung lượng mỗi file thực thi xuống mức tối thiểu (dưới 8MB).           |
