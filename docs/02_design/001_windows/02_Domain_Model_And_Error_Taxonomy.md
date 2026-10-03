# 02. Thiết Kế Tầng Miền Nghiệp Vụ & Mô Hình Hóa Lỗi (Domain Model & Error Taxonomy)

Tài liệu này đặc tả chi tiết kiến trúc tầng miền nghiệp vụ (Domain Model) và hệ thống phân loại lỗi vét cạn (Error Taxonomy) bằng các kiểu dữ liệu đại số trong **F#**, đảm bảo tính đúng đắn tuyệt đối của dữ liệu và triệt tiêu hoàn toàn các lỗi sập chương trình không kiểm soát.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: mô tả bằng ngôn ngữ tự nhiên, tập trung vào mô hình hóa khái niệm và quy tắc logic nghiệp vụ, không sử dụng mã nguồn mẫu.

---

## 1. Mô Hình Hóa Các Thực Thể Cốt Lõi Của Git (Core Entities)

Thay vì sử dụng các kiểu chuỗi ký tự tự do (Stringly-Typed) hay các đối tượng lỏng lẻo dễ gây lỗi lúc chạy, tầng miền nghiệp vụ của F# định nghĩa các thực thể Git bằng các kiểu dữ liệu có cấu trúc bất biến:

### 1.1. Thực Thể Định Danh Mã Băm Git (GitHash)

- **Đặc điểm & Cấu trúc**:
  - Là kiểu dữ liệu giá trị bất biến, đại diện cho mã băm đối tượng của Git.
  - Hỗ trợ đồng thời cả hai chuẩn định dạng: chuẩn SHA-1 truyền thống gồm 40 ký tự thập lục phân và chuẩn SHA-256 hiện đại gồm 64 ký tự thập lục phân.
  - Quá trình khởi tạo luôn đi kèm cơ chế kiểm tra tính hợp lệ: chuỗi đầu vào phải đúng độ dài và chỉ chứa các ký tự hợp lệ (`0-9`, `a-f`, `A-F`), nếu không hợp lệ sẽ trả về trạng thái rỗng thay vì ném ngoại lệ.
- **Tối ưu hóa hiển thị**:
  - Tích hợp sẵn cơ chế trích xuất chuỗi viết tắt (thường là 7 ký tự đầu tiên) để hiển thị trên giao diện đồ thị mà không cần cấp phát thêm chuỗi mới trong bộ nhớ.
  - Hỗ trợ so sánh bằng trực tiếp và hàm băm tốc độ cao, cho phép sử dụng làm khóa tìm kiếm trong các bảng tra cứu với độ phức tạp tìm kiếm tức thời.

### 1.2. Thực Thể Tác Giả & Người Thực Hiện (Author & Committer)

- Đại diện cho thông tin người tạo ra sự thay đổi mã nguồn và người tạo commit:
  - **Tên tác giả**: Chuỗi văn bản đã được chuẩn hóa bảng mã UTF-8.
  - **Địa chỉ email**: Địa chỉ email của tác giả, dùng để băm mã MD5 lấy ảnh đại diện Gravatar.
  - **Thời điểm thực hiện**: Thời gian Unix nguyên bản kết hợp với độ lệch múi giờ địa phương, giúp hiển thị chính xác thời gian theo múi giờ của người xem hoặc múi giờ của người commit.

### 1.3. Thực Thể Nút Commit Trên Đồ Thị (CommitNode)

- Là đơn vị dữ liệu trung tâm của toàn bộ hệ thống đồ thị:
  - **Mã băm commit**: Định danh duy nhất của commit (`GitHash`).
  - **Danh sách commit cha (Parents)**: Một danh sách chứa các mã băm của commit cha trực tiếp. Cấu trúc danh sách này phản ánh chính xác cấu trúc phả hệ:
    - *Commit gốc (Root commit)*: Danh sách cha rỗng (0 commit cha).
    - *Commit thông thường*: Danh sách có đúng 1 commit cha.
    - *Commit sáp nhập (Merge commit)*: Danh sách có đúng 2 commit cha (nhánh chính và nhánh được merge).
    - *Commit sáp nhập đa nhánh (Octopus Merge)*: Danh sách có từ 3 commit cha trở lên.
  - **Thông tin người tạo & người commit**: Hai đối tượng Author và Committer riêng biệt.
  - **Nội dung thông điệp**: Phân tách rõ ràng giữa dòng tiêu đề tóm tắt (Subject) và phần nội dung mô tả chi tiết (Body) để phục vụ cho các component giao diện hiển thị phù hợp.
  - **Danh sách tham chiếu gắn kèm**: Tập hợp các nhánh và thẻ tag đang trỏ trực tiếp vào commit này.

### 1.4. Phân Loại Tham Chiếu & Nhánh (GitRef)

- Một commit có thể được gắn một hoặc nhiều tham chiếu. Tầng Domain phân loại các tham chiếu thành các nhóm nghiệp vụ rõ ràng:
  - **Nhánh cục bộ (Local Branch)**: Mang tên nhánh và cờ đánh dấu nhánh này có đang được người dùng checkout làm việc hiện tại hay không.
  - **Nhánh máy chủ từ xa (Remote Branch)**: Mang tên máy chủ (như `origin`, `upstream`) và tên nhánh tương ứng trên máy chủ.
  - **Thẻ phiên bản chính thức (Release Tag)**: Đại diện cho các mốc phiên bản ổn định (như `v1.0.0`, `v2.1.3`), được giao diện ưu tiên hiển thị với màu sắc nổi bật.
  - **Thẻ tiền phát hành (Prerelease Tag)**: Đại diện cho các bản thử nghiệm (như `v1.0.0-beta.1`, `v2.0.0-rc`), mang thông tin phiên bản và hậu tố định danh.
  - **Thẻ thông thường (Plain Tag)**: Các nhãn đánh dấu thông thường trong quá trình phát triển.
  - **Điểm lưu trữ tạm thời (Stash)**: Đại diện cho các thay đổi chưa commit được cất giữ tạm thời, mang chỉ số thứ tự stash.

---

## 2. Mô Hình Hóa Các Trạng Thái Dở Dang Của Kho Mã Nguồn (In-Flight States)

Trong thực tế làm việc hàng ngày, kho mã nguồn của lập trình viên thường xuyên rơi vào các trạng thái chuyển tiếp dở dang khi gặp xung đột. Hệ thống mô hình hóa các trạng thái này để hiển thị trực quan và khóa các thao tác nguy hiểm:

1. **Trạng Thái Sạch Bình Thường (Clean State)**:
   - Kho mã nguồn đang ở trạng thái ổn định, không có bất kỳ phiên merge, rebase hay cherry-pick nào đang diễn ra. Mọi thao tác tạo nhánh, chuyển nhánh đều được phép thực hiện tự do.
2. **Trạng Thái Đang Sáp Nhập Dở (Merging State)**:
   - Được nhận diện khi tệp `MERGE_HEAD` tồn tại trong thư mục Git.
   - Mang thông tin về mã băm của commit đang được gộp vào và thông điệp sáp nhập dở dang từ tệp `MERGE_MSG`.
   - *Quy tắc nghiệp vụ*: Giao diện hiển thị huy hiệu cảnh báo `[MERGING]`, kích hoạt các nút lệnh hoàn tất sáp nhập hoặc hủy bỏ sáp nhập (`abort`), đồng thời chặn các thao tác chuyển nhánh nguy hiểm có thể làm mất dữ liệu giải quyết conflict.
3. **Trạng Thái Đang Tái Cơ Cấu Dở (Rebasing State)**:
   - Được nhận diện khi tồn tại thư mục `rebase-merge` hoặc `rebase-apply`.
   - Mang thông tin chi tiết: số thứ tự bước rebase hiện tại, tổng số bước rebase, tên nhánh đang được rebase và mã băm commit đang dừng lại để chỉnh sửa.
   - *Quy tắc nghiệp vụ*: Hiển thị tiến trình trực quan dạng `Bước X trên Y`, cung cấp các nút chức năng tiếp tục (`continue`), bỏ qua (`skip`) hoặc hủy bỏ (`abort`).
4. **Trạng Thái Đang Chọn Lọc Commit Dở (Cherry-Picking State)**:
   - Được nhận diện khi tồn tại tệp `CHERRY_PICK_HEAD`.
   - Mang thông tin về commit nguyên bản đang được sao chép sang nhánh hiện tại.
5. **Trạng Thái Đang Tìm Lỗi Nhị Phân (Bisecting State)**:
   - Được nhận diện khi tồn tại tệp nhật ký `BISECT_LOG`.
   - Đọc danh sách các commit đã được kiểm tra để phân loại rõ ràng commit tốt (Good), commit phát sinh lỗi (Bad) và commit bỏ qua (Skip), hỗ trợ giao diện tô màu riêng biệt cho các commit này trên cây đồ thị.

---

## 3. Bảng Phân Loại Lỗi Hệ Thống Vét Cạn (Exhaustive Error Taxonomy)

Toàn bộ các sự cố kỹ thuật có thể xảy ra trong quá trình tương tác với hệ thống tệp và cơ sở dữ liệu Git được quy hoạch thành một bảng mã lỗi duy nhất:

| Định Danh Lỗi                          | Hoàn Cảnh Phát Sinh                                                                                                                             | Dữ Liệu Ngữ Cảnh Đi Kèm                                                                              | Hướng Xử Lý Khuyến Nghị                                                                                                                                                       |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kho Không Tồn Tại**            | Người dùng mở một thư mục không chứa dữ liệu Git hợp lệ.                                                                              | Đường dẫn thư mục được yêu cầu.                                                                 | Thông báo giao diện yêu cầu khởi tạo kho mới hoặc chọn đúng thư mục.                                                                                                  |
| **Xung Đột File Khóa**           | Tệp`.git/index.lock` đang tồn tại do một tiến trình Git khác đang ghi dữ liệu hoặc tiến trình cũ bị chết bất đắc kỳ tử.    | Tên tệp khóa, thời gian tồn tại tính bằng giây, mã tiến trình giữ khóa (nếu đọc được). | Nếu thời gian tồn tại dưới 5 giây: tự động thử lại sau khoảng nghỉ ngắn. Nếu trên 5 giây (khóa mồ côi): hiển thị nút cho phép người dùng xóa an toàn. |
| **Xung Đột Khóa Nhánh**         | Tệp khóa tham chiếu nhánh (ví dụ`.git/refs/heads/main.lock`) đang tồn tại.                                                              | Tên nhánh bị khóa.                                                                                     | Hàng đợi hóa thao tác ghi bằng cơ chế xử lý tuần tự (Actor Model) trong engine.                                                                                         |
| **Tên Nhánh Đã Tồn Tại**      | Người dùng cố gắng tạo hoặc đổi tên sang một nhánh đã có sẵn trong danh sách.                                                     | Tên nhánh bị trùng lặp.                                                                               | Báo lỗi ngay từ tầng Domain trước khi gọi tiến trình Git, đề xuất người dùng chọn tên khác.                                                                       |
| **Nhánh Chưa Được Sáp Nhập** | Người dùng yêu cầu xóa nhánh thường (`git branch -d`) nhưng nhánh này còn chứa các commit chưa được merge vào nhánh chính. | Tên nhánh, số lượng commit đi trước chưa được merge.                                           | Hiển thị hộp thoại cảnh báo kèm số lượng commit sẽ bị mất, cung cấp tùy chọn xác nhận ép xóa (`git branch -D`).                                               |
| **Xung Đột Tệp Khi Checkout**    | Chuyển nhánh khi đang có các thay đổi chưa commit xung đột với nhánh đích.                                                           | Danh sách đường dẫn các tệp tin đang bị xung đột cục bộ.                                      | Hiển thị bảng danh sách tệp xung đột, cung cấp tùy chọn cất giữ tạm (Stash changes) hoặc hủy bỏ thay đổi (Discard).                                               |
| **Điểm Cắt Bản Sao Nông**      | Kho mã nguồn được clone với tùy chọn giới hạn độ sâu (`--depth`), commit ở đáy không tìm thấy commit cha trong dữ liệu.     | Mã băm của commit cha bị thiếu.                                                                       | Xem đây là biên giới bản sao hợp lệ, hiển thị ký hiệu ngắt đoạn trực quan trên đồ thị thay vì báo lỗi hỏng đồ thị.                                       |
| **Đối Tượng Git Bị Hỏng**     | File nén trong thư mục object bị lỗi ổ đĩa hoặc hỏng checksum.                                                                           | Mã băm đối tượng bị lỗi, thông báo lỗi kỹ thuật.                                              | Báo lỗi dữ liệu bị hỏng và đề xuất người dùng chạy lệnh kiểm tra toàn vẹn (`git fsck`).                                                                         |
| **Lỗi Thư Viện C Gốc**          | Thư viện LibGit2 trả về mã lỗi native.                                                                                                       | Mã số lỗi nguyên bản và chuỗi mô tả từ thư viện C.                                             | Đóng gói thông báo chi tiết để phục vụ công tác điều tra nhật ký hệ thống.                                                                                        |

---

## 4. Nguyên Tắc Xử Lý Lỗi Vét Cạn (Exhaustive Pattern Matching)

- Mọi hàm chức năng trong toàn bộ nhân F# đều tuân thủ nguyên tắc lập trình hàm: không ném ngoại lệ (`throw Exception`) trong các tình huống nghiệp vụ thông thường.
- Kết quả của mọi thao tác đều được bọc trong kiểu dữ liệu kết quả chuẩn gồm hai trạng thái:
  1. **Thành công (Ok)**: Mang theo dữ liệu kết quả đã tính toán xong.
  2. **Thất bại (Error)**: Mang theo một trong các đối tượng lỗi được định nghĩa trong bảng phân loại lỗi ở Mục 3.
- Trình biên dịch F# bắt buộc người lập trình phải viết các nhánh so khớp mẫu (Pattern Matching) cho toàn bộ các trường hợp lỗi có thể xảy ra. Nếu bỏ sót bất kỳ trường hợp lỗi nào, trình biên dịch sẽ cảnh báo ngay lập tức, đảm bảo 100% các tình huống lỗi đều có kịch bản xử lý an toàn trước khi phần mềm được xuất bản.
