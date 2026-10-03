# Báo Cáo Thuật Toán Xếp Làn Đồ Thị Topo Song Song (Nhóm Việc 4)

> **Mã báo cáo**: 004_Parallel_DAG_Solver_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 4 — Thuật Toán Xếp Làn Đồ Thị Topo Song Song
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [04_Parallel_DAG_Layout_Solver.md](../../02_design/001_windows/04_Parallel_DAG_Layout_Solver.md)

---

## 1. Mục Tiêu & Phạm Vi

Báo cáo này ghi nhận kết quả xây dựng tầng giải thuật đồ thị (tầng Graph), chuyển đổi ảnh chụp đồ thị commit thành dữ liệu hình học phẳng sẵn sàng cho Webview vẽ trực tiếp (Dumb Renderer). Tầng Graph gồm ba hợp phần theo đúng thiết kế:

1. Sắp xếp Topo xử lý các trường hợp đồ thị đặc biệt.
2. Phân bổ làn thu gọn về bên trái (Left-compact Lane Allocation).
3. Tính toán song song đa luồng tọa độ hình học SVG.

---

## 2. Cấu Trúc Mã Nguồn

Toàn bộ tầng Graph nằm trong `src/core-engine/Graph/Graph.fs` (thay thế phần khai báo trống trước đây).

| Module | Nội dung |
| :--- | :--- |
| `TopoSort` | Sắp xếp topo bằng thuật toán Kahn + hàng đợi ưu tiên |
| `Lanes` | Phân bổ làn thu gọn trái (Lane Pool) |
| `Geometry` | Sinh tọa độ nút + đường nối SVG song song đa luồng |
| `Layout` | Điểm vào cấp cao: topo → phân làn → sinh hình học |

Đồng thời mở rộng `GraphSnapshot` (tầng Storage) với hai trường `Generation` và `CommitTime` để tầng Graph có dữ liệu sắp xếp ưu tiên.

---

## 3. Sắp Xếp Topo (Nhiệm vụ 4.1)

- **Thuật toán**: Kahn cải tiến kết hợp hàng đợi ưu tiên (max-heap). Nút có bậc vào bằng 0 (commit mới nhất của mỗi nhánh — "tip") được đưa vào hàng đợi; mỗi lần lấy ra theo ưu tiên **thế hệ cao trước, thời gian tạo muộn trước**, sau đó giảm bậc vào của các commit cha. Đảm bảo bất biến *commit con luôn đứng trên commit cha* với độ phức tạp tuyến tính-logarit.
- **Xử lý trường hợp đặc biệt**:
  - **Bản sao nông**: cha bị thiếu đã được tầng Storage lược bỏ trước khi vào Graph — xem là biên giới hợp lệ.
  - **Nhánh mồ côi / Kho đa gốc (Forest)**: nhiều nút "tip" độc lập được xử lý đồng thời qua hàng đợi, không gây lỗi.
  - **Octopus merge**: chỉ phụ thuộc quan hệ cha-con, không phụ thuộc số lượng cha.
- **Dự phòng khi thiếu generation**: đường dẫn fallback LibGit2 không có generation number (giá trị 0), thuật toán tự chuyển sang sắp xếp theo thời gian tạo commit — vẫn bảo toàn bất biến cha-con nhờ Kahn.

---

## 4. Phân Bổ Làn Thu Gọn Trái (Nhiệm vụ 4.2)

- **Bể làn hoạt động (Lane Pool)**: mỗi làn ghi nhớ commit cha mà nó đang chờ (`active[l]`). Khi xét một commit:
  1. *Kế thừa làn*: commit là cha mà một làn đang chờ sẽ đặt ngay trên làn trái nhất đang chờ nó.
  2. *Thu gọn trái*: nhánh mới tái sử dụng làn trống đầu tiên bên trái; chỉ cấp làn mới ở mép phải khi toàn bộ làn bên trái đều bận.
  3. *Đóng làn*: commit gốc (không cha) hoặc nhánh nhập vào commit khác sẽ giải phóng làn để nhánh dưới tái sử dụng.
- **Bảo toàn màu sắc nhánh**: màu gán theo chỉ số làn theo modulo 8 (`lane % 8`). Do cơ chế kế thừa làn, một nhánh giữ nguyên làn (và màu) xuyên suốt từ commit đầu đến điểm nhập vào nhánh khác — không đổi màu đột ngột khi cuộn trang.

---

## 5. Tính Toán Song Song Tọa Độ SVG (Nhiệm vụ 4.3)

- **Phân khối song song**: danh sách commit và danh sách cạnh được tính bằng `Parallel.For` trên toàn bộ nhân CPU; cấu trúc chia khối theo `BatchSize = 1000` đã được khai báo làm điểm mở rộng khi tải tính toán tăng.
- **Dữ liệu hình học đầu ra** (mảng phẳng, chỉ-vẽ):
  - `Node`: tọa độ tâm `(x, y)` pixel, bán kính, chỉ số làn, chỉ số màu, cờ merge/gốc.
  - `Path`: chuỗi lệnh vẽ SVG (`d`), màu nét, độ dày. Cùng làn là đường thẳng đứng; khác làn là đường cong Bezier bậc ba mượt mà.
- **Webview chỉ vẽ**: không còn bất kỳ phép toán phân làn hay duyệt đồ thị nào ở phía giao diện.

---

## 6. Kiểm Thử

| Hạng mục | Kết quả |
| :--- | :--- |
| `GraphTests` (topo + phân làn + hình học, đồ thị tổng hợp) | 7/7 pass |
| Tổng bộ test (Domain + Storage + Graph) | **34/34 pass** |
| Biên dịch Native AOT kèm `git2-*.dll` | ✅ Đạt |

Các kịch bản kiểm thử bao phủ: thứ tự cha-con, merge trên hai cha, kho đa gốc (forest), dự phòng thiếu generation, thu gọn làn trái khi merge, lịch sử tuyến tính một làn, và tính ổn định màu + cờ merge trong hình học.

---

## 7. Hạn Chế & Ghi Chú

- **Generation từ `GDA2`**: tầng Graph sử dụng generation đọc từ chunk `CDAT` (đã nêu ở báo cáo 003). Khi bổ sung chunk `GDA2` (corrected commit date), thứ tự ưu tiên topo sẽ chính xác hơn với lịch sử có rebase.
- **Đo đạc định lượng**: kiểm chứng tương đương đồ thị 100% với thuật toán TypeScript và đo thời gian/luồng (đa nhân) vẫn thuộc Nhóm Việc 7 theo `07_Benchmarking_And_Verification_Plan.md`.
- **Tham số hình học** (`LaneWidth`, `RowHeight`, `NodeRadius`) là hằng số tạm; sẽ tinh chỉnh theo thiết kế giao diện khi ghép Webview (Nhóm Việc 6).

---

## 8. Kết Luận

| Tiêu chí | Trạng thái |
| :--- | :---: |
| Sắp xếp topo + xử lý đồ thị đặc biệt | ✅ Đạt |
| Phân bổ làn thu gọn trái + màu ổn định | ✅ Đạt |
| Tính toán song song tọa độ SVG | ✅ Đạt |
| Kiểm thử đơn vị | ✅ 34/34 |
| Biên dịch Native AOT | ✅ Đạt |
