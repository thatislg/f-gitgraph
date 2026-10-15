# 05. Đặc Tả Giao Thức IPC & Truyền Dữ Liệu Dạng Luồng (Stdio Streaming Protocol)

Tài liệu này đặc tả chi tiết giao thức truyền thông nhị phân hai chiều giữa **VS Code Extension Host (Node.js)** và **nhân tính toán F# Native AOT (`f-gitgraph-core.exe`)** thông qua đường ống xuất nhập chuẩn (Stdio RPC), ứng dụng định dạng nhị phân MessagePack và cơ chế phân trang cửa sổ hiển thị ảo.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào đặc tả giao thức, cấu trúc gói tin và luồng trao đổi dữ liệu, không sử dụng mã nguồn mẫu.

---

## 1. Cơ Chế Quản Lý Vòng Đời Tiến Trình F# Sidecar (Process Lifecycle)

Nhân F# hoạt động dưới dạng một tiến trình chạy nền độc lập (Sidecar Process), được quản lý chặt chẽ bởi module điều phối TypeScript trong extension:

### 1.1. Khởi Tạo & Kết Nối Khi Mở Tiện Ích

- Khi người dùng mở bảng F-GitGraph trong VS Code:
  1. Tầng TypeScript xác định đường dẫn tuyệt đối đến file thực thi `f-gitgraph-core.exe` trong thư mục phân phối `bin/win-x64/`.
  2. Khởi chạy tiến trình con với cờ kết nối hai đường ống nhập chuẩn (`stdin`) và xuất chuẩn (`stdout`) ở chế độ luồng nhị phân (Binary Streams).
  3. Tiến trình F# sau khi khởi động sẽ gửi một thông điệp sẵn sàng (Ready Signal) đầu tiên. Extension nhận được tín hiệu này sẽ xác lập trạng thái kết nối thành công và bắt đầu gửi yêu cầu nạp dữ liệu.

### 1.2. Cơ Chế Giám Sát Nhịp Tim & Tự Phục Hồi (Heartbeat & Self-Healing)

- **Giám sát nhịp tim (Heartbeat Ping-Pong)**:
  - Định kỳ mỗi 10 giây, extension gửi một gói tin kiểm tra kết nối siêu nhỏ tới engine F#.
  - Engine F# phản hồi lại gói tin xác nhận trong vòng dưới 1 phần nghìn giây.
- **Tự phục hồi khi xảy ra sự cố**:
  - Nếu tiến trình F# bị người dùng tắt ngoài ý muốn từ Task Manager hoặc gặp lỗi bất thường của hệ điều hành:
    - Tầng TypeScript bắt sự kiện đóng luồng (Process Exit Event).
    - Tự động ghi nhật ký sự cố và ngay lập tức khởi động lại một tiến trình F# mới.
    - Tái thiết lập kết nối và tự động gửi lại yêu cầu nạp dữ liệu cho phạm vi dòng người dùng đang nhìn thấy trước đó, đảm bảo trải nghiệm của lập trình viên không bị gián đoạn.

### 1.3. Thu Hồi Tài Nguyên An Toàn Khi Đóng Tiện Ích

- Khi người dùng đóng tab F-GitGraph:
  - Tầng TypeScript gửi một thông điệp yêu cầu dừng làm việc an toàn (Shutdown Request).
  - Engine F# giải phóng toàn bộ các vùng nhớ ánh xạ (Memory-Mapped Files), đóng các con trỏ kết nối LibGit2 và thoát tiến trình sạch sẽ với mã thoát 0.
  - Đảm bảo không để lại bất kỳ tiến trình chạy ngầm mồ côi (Zombie Process) nào trên hệ điều hành Windows.

---

## 2. Đặc Tả Giao Thức Nhị Phân Siêu Nén Qua Đường Ống Stdio RPC

Để triệt tiêu hoàn toàn chi phí đóng gói chuỗi JSON khổng lồ (vốn làm đơ giao diện từ 1.2 đến 3 giây trong phiên bản cũ), hệ thống chuyển sang giao thức nhị phân hướng khung (Framed Binary Protocol):

### 2.1. Cấu Trúc Khung Gói Tin Nhị Phân (Packet Framing)

Mỗi thông điệp được gửi qua đường ống `stdin`/`stdout` đều có cấu trúc nhị phân chuẩn gồm 3 phần:

1. **Độ Dài Gói Tin (Payload Length - 4 bytes)**:
   - Một số nguyên 32-bit không dấu được ghi theo chuẩn thứ tự byte nhỏ trước (Little Endian).
   - Cho biết chính xác số lượng byte của phần dữ liệu phía sau, giúp bên nhận biết trước độ dài để gom đủ dữ liệu trước khi giải mã, tránh lỗi phân mảnh gói tin trên đường ống.
2. **Tiêu Đề Lệnh & Thứ Tự (Header - 5 bytes)**:
   - _Mã định danh thao tác (Opcode - 1 byte)_: Xác định loại yêu cầu hoặc phản hồi.
   - _Mã chuỗi yêu cầu (Sequence ID - 4 bytes)_: Số nguyên tuần tự để khớp chính xác câu trả lời với câu hỏi trong trường hợp có nhiều yêu cầu bất đồng bộ gửi cùng lúc.
3. **Phần Dữ Liệu Tải (Payload)**:
   - Nội dung dữ liệu thực tế được mã hóa theo chuẩn nhị phân **MessagePack**.
   - Chuẩn MessagePack có dung lượng nhỏ hơn từ 40% đến 60% so với chuỗi JSON tương đương và có tốc độ đóng gói/giải mã nhanh gấp từ 5 đến 10 lần.

### 2.2. Bảng Mã Định Danh Lệnh Trao Đổi (Opcodes)

| Mã Lệnh | Tên Thao Tác                           | Bên Gửi $\rightarrow$ Bên Nhận | Mục Đích Sử Dụng                                                                         |
| :-----: | :------------------------------------- | :----------------------------: | :--------------------------------------------------------------------------------------- |
| `0x01`  | **Khởi Tạo Kho (Initialize Repo)**     |  TypeScript $\rightarrow$ F#   | Gửi đường dẫn thư mục repository cần mở và các cấu hình hiển thị ban đầu.                |
| `0x02`  | **Khởi Tạo Thành Công (Init Success)** |  F# $\rightarrow$ TypeScript   | Báo cáo mở kho thành công, gửi tổng số lượng commit và danh sách các nhánh/thẻ ban đầu.  |
| `0x03`  | **Truy Vấn Khoảng Dòng (Query Range)** |  TypeScript $\rightarrow$ F#   | Yêu cầu lấy dữ liệu hình học cho một phạm vi commit từ dòng X đến dòng Y.                |
| `0x04`  | **Dữ Liệu Khoảng Dòng (Range Data)**   |  F# $\rightarrow$ TypeScript   | Trả về mảng commit đã tính toán sẵn tọa độ hình học cho khung nhìn được yêu cầu.         |
| `0x05`  | **Làm Mới Bộ Đệm (Invalidate Cache)**  |  TypeScript $\rightarrow$ F#   | Thông báo kho mã nguồn vừa có commit mới hoặc vừa chuyển nhánh, yêu cầu tính lại vi sai. |
| `0x06`  | **Kiểm Tra Nhịp Tim (Heartbeat Ping)** |  TypeScript $\rightarrow$ F#   | Kiểm tra tiến trình F# có còn phản hồi bình thường hay không.                            |
| `0x07`  | **Xác Nhận Nhịp Tim (Heartbeat Pong)** |  F# $\rightarrow$ TypeScript   | Phản hồi xác nhận tiến trình F# vẫn đang hoạt động tốt.                                  |
| `0xFF`  | **Báo Cáo Lỗi (Error Response)**       |  F# $\rightarrow$ TypeScript   | Trả về thông tin lỗi chi tiết theo bảng mã lỗi vét cạn khi thao tác thất bại.            |

---

## 3. Cơ Chế Phân Trang Cửa Sổ Ảo (Virtual Scrolling Window Streaming)

Một trong những sai lầm lớn nhất của các extension xem Git cũ là cố gắng gửi toàn bộ 50.000 commit vào bộ nhớ giao diện một lúc, làm tràn RAM trình duyệt và gây giật khung hình. Engine mới áp dụng cơ chế phân trang cửa sổ ảo tối ưu:

### 3.1. Nguyên Lý Khung Nhìn (Viewport Sliding Window)

- Màn hình máy tính thông thường chỉ hiển thị được khoảng từ 30 đến 50 dòng commit cùng một thời điểm.
- **Quy trình hoạt động**:
  1. Khi người dùng mở bảng Git Graph, Webview chỉ gửi yêu cầu lấy 50 dòng đầu tiên kèm một "Vùng đệm an toàn" (Overscan Buffer) gồm 100 dòng phía trên và 100 dòng phía dưới.
  2. Engine F# truy xuất cấu trúc đồ thị trong bộ nhớ native và stream trả về đúng 250 commit tương ứng kèm toàn bộ tọa độ nút và đường vẽ trong thời gian **dưới 5 phần nghìn giây**.
  3. Dung lượng dữ liệu truyền qua IPC cho mỗi lần cuộn chỉ vào khoảng vài chục Kilobytes, loại bỏ hoàn toàn hiện tượng nghẽn đường truyền.

### 3.2. Dự Đoán Hướng Cuộn & Nạp Trước (Prefetching)

- Khi người dùng cuộn chuột nhanh xuống phía dưới:
  - Tầng Webview tính toán vận tốc cuộn và chủ động gửi yêu cầu nạp trước cho các khối commit tiếp theo ngay trước khi người dùng cuộn tới.
  - Engine F# phản hồi gần như tức thì, đảm bảo khi các dòng commit mới lướt vào tầm mắt, dữ liệu hình học đã nằm sẵn trong bộ nhớ đệm của Webview, mang lại trải nghiệm cuộn trang mượt mà 60 khung hình/giây không tì vết.
