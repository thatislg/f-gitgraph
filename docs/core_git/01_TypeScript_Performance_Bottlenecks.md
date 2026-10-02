# 01. Phân Tích Các Điểm Nghẽn Hiệu Năng Trong Nhân TypeScript

Tài liệu này đi sâu vào giải phẫu kỹ thuật các nguyên nhân khiến backend TypeScript (`simple-git` + Node.js) bị suy giảm hiệu năng nghiêm trọng khi tải và xử lý các Git repository quy mô lớn.

> [!NOTE]
> Tài liệu này được biên soạn theo nguyên tắc thiết kế khái niệm thuần túy: mô tả kiến trúc, luồng hoạt động và quy trình bằng ngôn ngữ tự nhiên, không sử dụng mã nguồn mẫu.

---

## 1. Chi phí Khởi tạo Tiến trình con trên Windows (`CreateProcess` Latency)

### Hiện trạng trong TypeScript
Trong module kết nối Git của dự án, hệ thống đang sử dụng thư viện `simple-git` để bọc bên ngoài file thực thi dòng lệnh của Git. Mỗi thao tác lấy dữ liệu thực chất là việc Node.js gọi hàm khởi tạo tiến trình con (`child_process.spawn`) để thực thi file `git.exe` độc lập:

- **Khi mở bảng hiển thị commit**:
  1. Khởi tạo một tiến trình con thứ nhất để lấy danh sách các tham chiếu (`show-ref`).
  2. Khởi tạo một tiến trình con thứ hai để lấy toàn bộ lịch sử commit (`log`).
  3. Khởi tạo một tiến trình con thứ ba để đọc trạng thái thay đổi tệp (`status`).
- **Khi người dùng nhấp vào một commit để xem chi tiết**:
  1. Khởi tạo một tiến trình con để đọc thông tin tóm tắt commit (`show`).
  2. Khởi tạo một tiến trình con tiếp theo để kiểm tra danh sách file thêm/sửa/xóa (`diff-tree`).
  3. Khởi tạo thêm một tiến trình con để thống kê số dòng mã thay đổi (`numstat`).

### Vấn đề kỹ thuật
- Khác với hệ điều hành Linux (sử dụng cơ chế nhân bản tiến trình `fork` và sao chép khi ghi cực kỳ nhẹ nhàng), trên Windows hệ điều hành phải cấp phát một handle tiến trình mới thông qua lệnh gọi hệ thống Win32 `CreateProcessW`. Quá trình này phải nạp lại toàn bộ các thư viện liên kết động của Git, khởi tạo heap bộ nhớ, thiết lập môi trường bảo mật và cấu hình các đường ống dữ liệu vào ra.
- Độ trễ trung bình của mỗi lần khởi chạy một tiến trình dòng lệnh trên Windows dao động từ **30ms đến 80ms**.
- Khi người dùng thực hiện nhiều thao tác liên tiếp (chẳng hạn chuyển đổi qua lại giữa các nhánh hoặc cuộn tìm kiếm), hàng chục tiến trình `git.exe` được sinh ra và tiêu hủy liên tục, làm CPU Windows tăng vọt do chi phí chuyển đổi ngữ cảnh (context switching overhead).

---

## 2. Áp lực Cấp phát Bộ nhớ Chuỗi & V8 Garbage Collection Thrashing

### Hiện trạng trong module nạp commit
Trong module nạp commit của dự án, dữ liệu từ đầu ra chuẩn của Git được đọc về dưới dạng một chuỗi văn bản khổng lồ, sau đó chương trình dùng các ký tự phân cách để cắt chuỗi liên tiếp:
- Cắt chuỗi toàn bộ log thành một danh sách các khối commit riêng biệt.
- Với mỗi khối commit, tiếp tục cắt chuỗi nhỏ hơn để tách các trường thông tin: mã băm, danh sách commit cha, tác giả, email, ngày giờ, tiêu đề và nội dung.

### Hậu quả bộ nhớ
1. **Toàn bộ đầu ra là một chuỗi nguyên khối khổng lồ**:
   - Với repository có 50.000 commit, chuỗi log trả về từ Git có thể vượt quá **150MB đến 300MB**.
   - Trong engine V8 của Node.js, chuỗi lớn hơn một ngưỡng nhất định sẽ bị đẩy vào vùng nhớ đối tượng lớn (Large Object Space) hoặc đòi hỏi không gian bộ nhớ heap liên tục rất lớn.
2. **Cơn bão cấp phát đối tượng ngắn hạn (Allocation Storm)**:
   - Thao tác cắt chuỗi đầu tiên tạo ra một mảng chứa 50.000 chuỗi con.
   - Mỗi chuỗi con lại tiếp tục bị cắt nhỏ thành 6 đến 8 chuỗi con nữa, tạo ra hơn **400.000 chuỗi mới** chỉ trong vài phần nghìn giây.
   - Sau đó hệ thống lại tiếp tục bóc tách và tạo thêm 50.000 đối tượng đại diện cho commit.
3. **Hiện tượng đóng băng để dọn rác (V8 GC Pause / Stop-the-world)**:
   - Bộ gom rác của V8 buộc phải kích hoạt chu kỳ thu gom toàn diện (Full GC) để giải phóng hàng trăm nghìn chuỗi tạm thời vừa bị hủy bỏ.
   - Trong suốt thời gian thu gom rác, toàn bộ luồng xử lý của Extension Host bị **đóng băng từ 800ms đến 2.5 giây**.

---

## 3. Nghẽn Tuần tự hóa Dữ liệu Giữa Extension Host và Webview

Trong kiến trúc của VS Code:
- Extension Host (chạy trên Node.js) và Webview (chạy trên môi trường Chromium Renderer) là hai tiến trình hoàn toàn độc lập, giao tiếp với nhau thông qua cơ chế gửi nhận thông điệp dựa trên định dạng chuỗi JSON.
- **Chi phí đóng gói và giải nén khổng lồ**:
  - Khi gửi một mảng 50.000 commit sang giao diện, Node.js phải tuần tự hóa toàn bộ 50.000 đối tượng thành một chuỗi JSON khổng lồ (dung lượng khoảng 40MB).
  - Webview Chromium sau khi nhận được chuỗi này tiếp tục phải chạy hàm giải nén chuỗi JSON để tái tạo lại 50.000 đối tượng trên luồng giao diện.
  - Riêng thao tác đóng gói và giải nén dữ liệu qua lại này đã tiêu tốn từ **1.2 đến 3 giây**, làm chậm đáng kể thời gian phản hồi ban đầu.

---

## 4. Thuật toán Đồ thị Topo Chạy Đơn luồng trên Giao Diện Webview

### Hiện trạng
- Toàn bộ thuật toán xây dựng đồ thị, phân luồng nhánh (Lane Assignment) và giải quyết các nút giao phân nhánh hiện đang được thực thi trực tiếp trên luồng chính (Main Thread) của Webview UI.
- Thuật toán có độ phức tạp tỷ lệ thuận với tích của số lượng commit nhân với số lượng nhánh song song.

### Điểm nghẽn
- Khi repository có cấu trúc phân nhánh phức tạp (như Linux kernel hay các monorepo lớn), hàm tính toán đồ thị ngốn từ **2 đến 5 giây CPU đơn luồng**.
- Trong suốt khoảng thời gian tính toán này, giao diện người dùng bị đơ cứng hoàn toàn: con trỏ chuột không phản hồi, thanh cuộn bị khựng lại, không thể bấm chọn bất kỳ nút nào và mọi hiệu ứng chuyển động đều bị tê liệt.

---

## 5. Tổng kết Bảng So Sánh Thời Gian Thực Thi (Benchmark Dự Kiến)

| Tác vụ trên Repo 50.000 Commits | Nhân TypeScript (Hiện tại) | Nhân F# Native Engine (Mục tiêu) | Mức cải thiện dự kiến |
| :--- | :--- | :--- | :--- |
| **Đọc dữ liệu thô từ Git** | 3.200 ms (gọi tiến trình CLI + cắt chuỗi) | **45 ms** (đọc trực tiếp file nhị phân qua LibGit2) | **Nhanh hơn ~70 lần** |
| **Bóc tách cấu trúc dữ liệu** | 1.800 ms (tạo 400.000 chuỗi trong V8) | **12 ms** (Zero-allocation trên bộ nhớ native) | **Nhanh hơn ~150 lần** |
| **Tính toán Topo & Phân làn nhánh** | 2.400 ms (chạy đơn luồng trên UI JavaScript) | **35 ms** (tính toán song song đa luồng CPU trên F#) | **Nhanh hơn ~68 lần** |
| **Thời gian truyền dữ liệu sang UI** | 1.500 ms (đóng gói và giải nén chuỗi JSON) | **80 ms** (truyền nhị phân và phân trang cửa sổ ảo) | **Nhanh hơn ~18 lần** |
| **Tổng thời gian sẵn sàng hiển thị** | **~8.900 ms (~9 giây)** | **< 200 ms (0.2 giây)** | **Nhanh hơn 45 lần** |
