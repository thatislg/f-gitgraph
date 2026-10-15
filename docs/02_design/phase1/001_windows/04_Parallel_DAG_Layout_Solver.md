# 04. Thiết Kế Thuật Toán Xếp Làn Đồ Thị Topo Song Song (Parallel DAG Layout Solver)

Tài liệu này đặc tả chi tiết thuật toán sắp xếp topo, cơ chế phân bổ làn đồ thị thu gọn về bên trái (Left-compact Lane Allocation) và giải thuật tính toán song song đa luồng CPU để sinh dữ liệu tọa độ hình học phẳng SVG trên engine F#.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào thuật toán, cấu trúc hình học và luồng xử lý song song, không sử dụng mã nguồn mẫu.

---

## 1. Thuật Toán Sắp Xếp Topo & Xử Lý Các Trường Hợp Đồ Thị Đặc Biệt

### 1.1. Mục Tiêu Của Sắp Xếp Topo (Topological Sort)

- Đồ thị Git là một đồ thị có hướng không chu trình (Directed Acyclic Graph - DAG). Trong đó, các commit mới luôn trỏ ngược về các commit cha trong quá khứ.
- **Quy tắc hiển thị**:
  1. Commit con (mới hơn) bắt buộc phải luôn luôn nằm ở các dòng phía trên commit cha (cũ hơn).
  2. Các commit cùng thế hệ được sắp xếp ưu tiên theo thời gian tạo commit để người dùng theo dõi mạch phát triển tự nhiên.
- **Giải thuật sắp xếp**:
  - Engine F# sử dụng thuật toán sắp xếp topo cải tiến kết hợp giữa thế hệ commit (Generation Number từ file `commit-graph`) và cấu trúc hàng đợi ưu tiên theo thời gian.
  - Nhờ generation number có sẵn, engine có thể xác định ngay lập tức commit nào thuộc thế hệ cao hơn mà không cần duyệt đệ quy ngược toàn bộ cây phả hệ, giảm độ phức tạp thuật toán xuống mức tuyến tính.

### 1.2. Xử Lý Các Trường Hợp Dị Thường Trong Cấu Trúc Đồ Thị

- **Bản sao nông (Shallow Clone với tham số `--depth`)**:
  - _Hiện tượng_: Người dùng chỉ clone 50 commit gần nhất, commit ở đáy danh sách sẽ tham chiếu tới một mã băm commit cha không hề tồn tại trong cơ sở dữ liệu cục bộ.
  - _Giải pháp_: Thuật toán phát hiện mã băm cha bị thiếu và đánh dấu đây là một "Điểm ngắt đoạn ghép nối" (Graft Boundary). Đồ thị vẫn tiếp tục vẽ bình thường và hiển thị một biểu tượng ngắt đoạn mờ dần ở đáy nhánh thay vì ném lỗi làm sập toàn bộ cây đồ thị.
- **Nhánh mồ côi (Orphan Branch) & Kho Đa Gốc (Multi-Root DAG Forest)**:
  - _Hiện tượng_: Người dùng tạo một nhánh mới hoàn toàn không kế thừa lịch sử cũ (`git checkout --orphan`), hoặc một repository được gộp từ nhiều dự án khác nhau sẽ có từ hai commit gốc trở lên.
  - _Giải pháp_: Thuật toán coi toàn bộ kho mã nguồn là một "Khu rừng đồ thị" (Forest). Mỗi cây con độc lập được cấp phát các làn riêng biệt, phân bố mượt mà song song với các nhánh khác mà không bị đè lên làn số 0.
- **Sáp nhập đa nhánh (Octopus Merge)**:
  - Khi một commit sáp nhập từ 3 nhánh trở lên cùng lúc, thuật toán tính toán tạo ra các đường nhánh cong tỏa ra đồng thời tới tất cả các commit cha, duy trì tính đối xứng và rõ ràng về mặt thị giác.

---

## 2. Thuật Toán Phân Bổ Làn Đồ Thị Thu Gọn Về Bên Trái (Left-Compact Lane Allocation)

Mục tiêu cốt lõi của việc xếp làn là làm cho các nhánh commit hiển thị rõ ràng, dễ nhìn, các đường nhánh không bị cắt nhau hỗn loạn và toàn bộ đồ thị luôn được thu gọn tối đa về phía lề trái.

### 2.1. Cơ Chế Bể Làn Hoạt Động (Lane Pool Management)

Thuật toán duyệt qua danh sách commit từ trên xuống dưới (từ mới nhất đến cũ nhất) và quản lý một danh sách các "Làn đang hoạt động":

1. **Tìm kiếm Làn Kế Thừa**:
   - Khi xét một commit, engine kiểm tra xem có làn nào trong bể làn đang chờ commit này hay không (tức là commit này chính là commit cha mà một commit con ở phía trên đang trỏ tới).
   - Nếu tìm thấy, commit sẽ được đặt ngay trên làn đó để tạo thành một đường thẳng liên tục của nhánh.
2. **Thu Gọn Về Bên Trái Khi Mở Nhánh Mới**:
   - Nếu commit hiện tại mở ra một nhánh mới hoặc không có làn nào chờ nó, engine sẽ quét từ trái sang phải trong bể làn để tìm **vị trí làn trống đầu tiên**.
   - Nếu tìm thấy vị trí trống (do một nhánh khác vừa kết thúc ở phía trên), vị trí đó sẽ được tái sử dụng ngay lập tức.
   - Chỉ khi toàn bộ các làn bên trái đều đang bận, engine mới cấp phát thêm một làn mới ở mép ngoài cùng bên phải.
   - Nhờ cơ chế này, đồ thị luôn có xu hướng "co cụm" về phía bên trái màn hình, dành tối đa không gian chiều ngang cho cột thông điệp commit và tên tác giả.
3. **Đóng Làn & Giải Phóng Vị Trí**:
   - Khi một commit gốc (không còn commit cha nào nữa) được xử lý, làn tương ứng sẽ được đánh dấu là trống để các nhánh phía dưới tái sử dụng.

### 2.2. Cơ Chế Bảo Toàn Màu Sắc Nhánh Nhất Quán (Color Stability)

- Giao diện sử dụng một bảng màu gồm 8 màu sắc tương phản cao (chuẩn giao diện GitLens).
- Thuật toán gán chỉ số màu cho nhánh dựa trên sự kết hợp giữa chỉ số làn và mã định danh duy nhất của nhánh tại thời điểm sinh ra.
- **Bảo toàn màu sắc khi cuộn trang**: Khi người dùng cuộn chuột lên xuống, một nhánh commit luôn giữ nguyên đúng một màu sắc duy nhất xuyên suốt từ commit đầu tiên đến commit cuối cùng của nhánh đó, tuyệt đối không có hiện tượng màu sắc bị đổi đột ngột giữa chừng.

---

## 3. Tính Toán Song Song Đa Luồng Tọa Độ Hình Học SVG (Parallel Coordinate Generation)

### 3.1. Phân Chia Tính Toán Đa Luồng Trên CPU

- Thay vì để một luồng giao diện duy nhất vừa phải chạy mã JavaScript vừa phải tính tọa độ từng nút một, engine F# phân chia mảng danh sách commit thành các khối dữ liệu độc lập (ví dụ mỗi khối gồm 1.000 commit).
- Các khối này được phân bổ song song cho toàn bộ các nhân CPU có sẵn của máy tính (tận dụng công nghệ xử lý song song đa lõi hiện đại của .NET).
- Mỗi luồng CPU độc lập tính toán các thông số hình học cho khối commit của mình:
  - Tọa độ tâm hình học `(x, y)` của nút lục giác.
  - Điểm neo xuất phát và điểm neo kết thúc của các đường nối giữa commit con và commit cha.
  - Các tham số điều khiển của đường cong Bezier bậc ba để tạo ra các đoạn uốn cong mượt mà khi rẽ nhánh hoặc sáp nhập nhánh.

### 3.2. Cấu Trúc Dữ Liệu Hình Học Đầu Ra Dành Cho Webview (Dumb Renderer)

Kết quả trả về của engine F# là một mảng dữ liệu hình học phẳng thuần túy, bao gồm:

1. **Thông tin Nút Commit (Node Geometry)**:
   - Tọa độ tâm `x`, `y` tính bằng pixel.
   - Bán kính hiển thị và chỉ số làn của nút.
   - Chỉ số màu sắc nhánh.
   - Cờ đánh dấu loại commit (commit thường, commit gộp, hay commit có tag phát hành).
2. **Thông tin Các Đường Nối Nhánh (Path Geometry)**:
   - Chuỗi định dạng đường vẽ SVG chuẩn (chứa các lệnh di chuyển, vẽ đoạn thẳng và vẽ đường cong Bezier).
   - Màu sắc của nét vẽ và độ dày nét vẽ tương ứng.
3. **Lợi ích kiến trúc**:
   - Tầng Webview Preact biến thành một **tầng chỉ vẽ thuần túy (Dumb Renderer)**.
   - Webview chỉ việc lấy dữ liệu tọa độ có sẵn và đưa trực tiếp vào thẻ SVG của trình duyệt mà không cần phải thực hiện bất kỳ phép toán phân làn hay duyệt đồ thị nào.
   - Giao diện đạt độ phản hồi tức thì, loại bỏ 100% hiện tượng đơ chuột khi làm việc với các kho mã nguồn khổng lồ.
