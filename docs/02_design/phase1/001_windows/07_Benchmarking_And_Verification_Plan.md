# 07. Kế Hoạch Đo Đạc Hiệu Năng & Kiểm Thử Nghiệm Thu (Benchmarking & Verification Plan)

Tài liệu này đặc tả chi tiết phương pháp kiểm thử so sánh tính tương đương đồ thị 100% giữa thuật toán F# mới và thuật toán TypeScript cũ, quy trình đo đạc các chỉ số hiệu năng then chốt trên môi trường Windows, và bảng kiểm tra an toàn dữ liệu toàn diện cho các thao tác Git.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào phương pháp đo đạc, tiêu chí định lượng và kịch bản kiểm thử, không sử dụng mã nguồn mẫu.

---

## 1. Kế Hoạch Kiểm Thử So Sánh Tính Tương Đương Đồ Thị (Equivalence Testing)

Trước khi thay thế hoàn toàn tầng tính toán đồ thị của TypeScript bằng engine F#, hệ thống phải vượt qua bài kiểm tra tính tương đương tuyệt đối về mặt cấu trúc và hình học:

### 1.1. Các Tiêu Chí So Sánh Bắt Buộc

Khi nạp cùng một kho mã nguồn ở cùng một trạng thái commit:

1. **Thứ Tự Dòng Commit (Row Sequence)**:
   - Danh sách commit được sắp xếp bởi engine F# phải trùng khớp 100% về thứ tự thời gian và phả hệ với kết quả của thuật toán sắp xếp cũ.
2. **Chỉ Số Làn & Cấu Trúc Nhánh (Lane Allocation)**:
   - Các commit thuộc cùng một nhánh phải được phân bổ vào cùng một chỉ số làn tương ứng.
   - Vị trí các nút giao phân nhánh và điểm sáp nhập nhánh phải trùng khớp hoàn toàn về mặt logic liên kết.
3. **Màu Sắc Nhánh (Color Consistency)**:
   - Bảng chỉ số màu được gán cho các nhánh phải đảm bảo tính tương đồng, không làm thay đổi trực quan thói quen nhận diện màu sắc của người dùng.
4. **Các Đoạn Nối Đồ Thị (Path Geometry)**:
   - Điểm neo xuất phát, điểm neo kết thúc và hướng uốn cong của các đường rẽ nhánh, đường gộp nhánh phải ăn khớp chính xác với vị trí các nút lục giác.

### 1.2. Môi Trường Kho Mã Nguồn Kiểm Thử Mẫu

Kiểm thử tự động được thực hiện trên 3 quy mô kho mã nguồn tiêu chuẩn:

- **Kho nhỏ (Dưới 1.000 commits)**: Kiểm tra các tình huống phân nhánh đơn giản, kiểm tra tốc độ phản hồi tức thời.
- **Kho trung bình (Khoảng 10.000 commits)**: Kiểm tra các tình huống có nhiều nhánh đan xen phức tạp, nhiều commit merge và tag phát hành.
- **Kho lớn của doanh nghiệp (Từ 50.000 đến 100.000 commits)**: Kiểm tra khả năng chịu tải, đo đạc mức độ tối ưu hóa bộ nhớ và độ ổn định của giao thức Stdio streaming.

---

## 2. Phương Pháp Đo Đạc & Tiêu Chuẩn Hiệu Năng Trên Windows (Benchmarking)

Hệ thống thiết lập 4 chỉ số đo đạc hiệu năng định lượng, so sánh trực tiếp giữa phiên bản TypeScript cũ và nhân F# Native AOT mới trên cùng một máy tính Windows:

### 2.1. Chỉ Số 1: Thời Gian Nạp Ban Đầu (Cold-Load Time)

- **Định nghĩa**: Khoảng thời gian tính từ lúc người dùng nhấp mở tab F-GitGraph trong VS Code cho đến khi toàn bộ các nút lục giác của trang đầu tiên được vẽ hoàn chỉnh trên màn hình.
- **Hiện trạng bản cũ (TypeScript)**: Tốn từ **8 đến 15 giây** trên kho 50.000 commits (do phải gọi tiến trình CLI `git log`, cắt chuỗi hàng trăm MB và tính toán layout đơn luồng trên UI).
- **Mục tiêu nghiệm thu bản mới (F# Native AOT)**: Đạt mốc **dưới 300 phần nghìn giây** (nhanh hơn từ 30 đến 50 lần).

### 2.2. Chỉ Số 2: Mức Chiếm Dụng Bộ Nhớ RAM (Peak Memory Footprint)

- **Định nghĩa**: Dung lượng bộ nhớ RAM tối đa mà tiến trình con tiêu thụ trong suốt quá trình nạp và phân tích kho mã nguồn 50.000 commits.
- **Hiện trạng bản cũ (Node.js)**: Tiêu tốn từ **350MB đến 600MB RAM** do V8 phải cấp phát hàng trăm nghìn đối tượng chuỗi và đối tượng JavaScript ngắn hạn.
- **Mục tiêu nghiệm thu bản mới (F#)**: Duy trì ở mức **dưới 100MB RAM** nhờ kỹ thuật lát cắt bộ nhớ liên tục (Zero-Allocation Span) và cấu trúc dữ liệu nhị phân nhỏ gọn.

### 2.3. Chỉ Số 3: Độ Mượt Cuộn Trang & Tần Số Khung Hình (Scroll FPS)

- **Định nghĩa**: Tần số khung hình hiển thị (Frames Per Second) khi người dùng dùng chuột cuộn liên tục qua hàng nghìn dòng commit.
- **Hiện trạng bản cũ**: Thường xuyên bị tụt khung hình xuống 10-15 FPS hoặc đơ chuột hoàn toàn từ 1 đến 2 giây mỗi khi cuộn qua vùng có nhiều nhánh phức tạp.
- **Mục tiêu nghiệm thu bản mới**: Đạt mức **60 FPS ổn định**, độ trễ cuộn trang bằng 0, không có hiện tượng giật khung hình hay khựng con trỏ chuột.

### 2.4. Chỉ Số 4: Độ Trễ Truy Vấn Khung Nhìn Ảo (IPC Roundtrip Latency)

- **Định nghĩa**: Thời gian từ khi Webview gửi yêu cầu dải dòng mới qua Stdio RPC cho đến khi nhận lại toàn bộ mảng dữ liệu tọa độ đã tính sẵn từ engine F#.
- **Mục tiêu nghiệm thu**: Đạt mức **dưới 5 phần nghìn giây** cho mỗi gói dữ liệu 100 dòng commit.

---

## 3. Bảng Kiểm Tra An Toàn Dữ Liệu Toàn Diện (Git Mutation Safety Checklist)

Trước khi nghiệm thu giai đoạn phát triển trên Windows, toàn bộ các thao tác ghi dữ liệu bắt buộc phải vượt qua 100% các tiêu chí trong bảng kiểm tra sau:

| Thao Tác Nghiệp Vụ           | Kịch Bản Kiểm Thử Cụ Thể                                                                                       | Tiêu Chuẩn Đạt Yêu Cầu                                                                                                                                         |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ký Số Commit**             | Tạo một commit mới trên kho mã nguồn có cấu hình ký số bằng khóa GPG hoặc SSH Agent.                           | Commit được tạo thành công, lệnh `git verify-commit` báo hợp lệ 100%, huy hiệu Verified hiển thị chính xác trên GitHub.                                        |
| **Tạo Nhánh Mới**            | Tạo nhánh mới từ dòng commit đang chọn trên giao diện.                                                         | Nhánh mới xuất hiện tức thì trên đồ thị tại đúng commit được chỉ định, tệp `.git/refs/heads/` được cập nhật chính xác.                                         |
| **Xóa Nhánh An Toàn**        | Yêu cầu xóa một nhánh chưa được merge vào nhánh chính.                                                         | Hệ thống chặn lệnh xóa an toàn (`-d`), hiển thị cảnh báo số lượng commit sẽ bị mất và yêu cầu xác nhận trước khi cho phép ép xóa (`-D`).                       |
| **Chuyển Nhánh (Checkout)**  | Chuyển đổi qua lại giữa các nhánh khi thư mục làm việc đang sạch và khi đang có thay đổi chưa lưu.             | Khi sạch: chuyển nhánh tức thì trong dưới 200ms. Khi có thay đổi xung đột: hiển thị cảnh báo và danh sách tệp xung đột, không làm mất mã nguồn của người dùng. |
| **Sáp Nhập Nhánh (Merge)**   | Thực hiện sáp nhập một nhánh tính năng vào nhánh chính (cả trường hợp Fast-Forward và trường hợp 3-Way Merge). | Đồ thị hiển thị chính xác commit merge mới với 2 commit cha, đường nhánh kết nối mượt mà vào nhánh chính.                                                      |
| **Tái Cơ Cấu (Rebase)**      | Thực hiện rebase nhánh tính năng lên đầu nhánh chính.                                                          | Lịch sử commit được tái cơ cấu chuẩn xác, các trạng thái rebase dở dang hiển thị tiến trình rõ ràng cho người dùng.                                            |
| **Xác Thực Đẩy Code (Push)** | Đẩy commit mới lên máy chủ GitHub/GitLab sử dụng tài khoản có bảo mật 2 lớp (2FA) hoặc SSO doanh nghiệp.       | Git Credential Manager trên Windows tự động xử lý xác thực thông suốt, mã nguồn được đẩy lên máy chủ thành công mà không phát sinh lỗi quyền hạn.              |

---

## 4. Biên Bản & Báo Cáo Nghiệm Thu

- Toàn bộ kết quả kiểm thử tương đương và bảng số liệu đo đạc benchmark thực tế trên máy tính Windows sẽ được ghi chép và lưu trữ trong tài liệu báo cáo tiến độ tương ứng tại [001_windows_progress.md](file:///d:/Kojin/f-gitgraph/docs/03_progess/001_windows_progress.md).
- Chỉ khi tất cả các tiêu chí hiệu năng và tiêu chuẩn an toàn dữ liệu trong tài liệu này đạt 100%, giai đoạn Phase 1 Windows mới được coi là hoàn thành chính thức để chuyển giao sang Phase 2 Linux.
