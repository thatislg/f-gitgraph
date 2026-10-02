# Neo Git Graph Documentation

Tài liệu kỹ thuật và kiến trúc cho dự án Neo Git Graph.

## Mục lục tài liệu

- [00. Quy tắc Git & Chiến lược Merge (Git Workflow Rules)](00_GitRules.md): Quy định luồng đồng bộ giữa `upstream` -> `main` -> `custom`.
- [01. Thiết kế Graph Node Lục giác & Hệ thống Icon](01_GraphNodeDesign.md): Tài liệu chi tiết về thiết kế node hình lục giác (Hexagon) và hệ thống biểu tượng (Icons) bên trong commit node lấy cảm hứng từ GitLens.
- [02. Thiết kế Tích hợp Git Account Avatar vào Hexagon Node](02_CommitAvatarDesign.md): Cơ chế băm MD5 chuẩn Gravatar và trích xuất GitHub avatar cho commit author.
- [03. Tối ưu kích thước Hexagon Node & Khắc phục khoảng đen Avatar](03_HexagonSizeAndAvatarFit.md): Khắc phục khoảng đen ở các góc bằng Hexagon ClipPath và mở rộng kích thước Hexagon xấp xỉ chiều cao 1 dòng (24px).
- [04. Chuẩn hóa SVG Clipping Lục giác & Micro-interaction Hover Scale](04_HexagonClippingAndMicroInteractions.md): Ẩn hoàn toàn phần thừa của ảnh avatar bằng chuẩn SVG clip-path và thêm hiệu ứng micro-interaction hover/selected scale(1.15) mượt mà.
- [05. Ambient Gradient Highlight & Tối ưu Khoảng đệm Graph Node](05_AmbientHighlightAndGraphMargins.md): Hiệu ứng hửng sáng gradient theo màu nhánh khi chọn commit và mở rộng khoảng đệm lề trái/phải để bảo vệ node khi phóng to.
- [06. Tinh chỉnh Neon Ambient Gradient & Viền Tím Flameshot cho Selected Commit](06_NeonAmbientAndFlameshotBorder.md): Tinh chỉnh dải neon gradient chỉ xuất hiện từ mép phải avatar tới hết cột graph và bọc khung viền tím Flameshot lung linh bao quanh dòng commit được chọn.
- [07. Tối ưu Kích thước Hexagon Mặc định & Zoom Khít Chiều cao Dòng](07_HexagonLineFitScaling.md): Điều chỉnh bán kính mặc định R=10px để khi hover/selected zoom lên (scale 1.15) đạt chiều cao 23px vừa khít hoàn hảo bên trong dòng 24px.
- [08. Rich Commit Hover Panel & Avatar Deep Zoom Preview](08_RichCommitHoverAndAvatarDeepZoom.md): Panel nổi hiển thị toàn bộ commit message màu nền chìm hệ thống và phóng to avatar 2.2x kèm tên tác giả khi giữ chuột.
- [09. Full Commit Message & Top-Layer Avatar Deep Zoom (5x)](09_FullCommitMessageAndTopLayerAvatarDeepZoom.md): Tải toàn bộ message commit (Subject + Body) và hiển thị Avatar Deep Zoom 5x trên Top Layer tuyệt đối kèm ảnh độ nét cao và nhãn tên tác giả hài hòa.
- [10. Chuẩn hóa Tên gọi Tương tác Avatar & Click Deep Zoom](10_AvatarInteractionNamingAndClickDeepZoom.md): Chuẩn hóa tên gọi Micro Hover Zoom (1.15x) và Click Deep Zoom (5.0x), chuyển sự kiện kích hoạt 5x sang click chuột vào icon avatar.
- [11. Hover Neon Ambient Highlight trên Cột Graph](11_HoverNeonAmbientHighlight.md): Mở rộng hiệu ứng Neon Ambient sang các dòng khi rê chuột (mouse move over) chưa chọn.
- [12. Highlight Màu cho Tag/Release Pill & Custom Author Tooltip](12_RefPillHighlightAndCustomAuthorTooltip.md): Xóa bỏ toàn bộ tooltip mặc định nền trắng, highlight màu rực rỡ cho Tag/Release và Remote branch, duy trì hover scale trên cột graph.
- [13. Tinh chỉnh Tương tác Hover Cột Graph & Vùng Kích hoạt Commit Message Panel](13_GraphColumnHoverBehaviorAndMessagePanelTrigger.md): Không hiện nhãn tên khi hover trong cột graph, giữ nguyên tên khi click icon 5x, chỉ kích hoạt Commit Message Panel từ cột mô tả trở sang phải.
- [14. Khóa Commit Message Panel Khi Đang Chọn Dòng Commit](14_SuppressCommitMessagePanelWhenCommitSelected.md): Khóa và chặn hiển thị commit message panel trên toàn bộ các dòng khi đang có 1 commit mở xem chi tiết, tự động mở khóa khi unselect.

---

## Nghiên cứu & Thiết kế Nhân Core Git Engine (F#)

Thư mục [`docs/core_git/`](core_git/README.md) tập trung nghiên cứu, tổng hợp các lỗi thao tác Git và thiết kế chuyển đổi tầng nhân (Core Engine) từ TypeScript sang **F# (.NET / Native AOT)** để xử lý các repository quy mô lớn (20.000 - 100.000+ commits).

- **[Core Git Overview & Architecture Comparison](core_git/README.md)**: Tổng quan, động lực chuyển đổi và bảng so sánh hiệu năng giữa TypeScript và F#.
- **[01. Phân tích Các Điểm Nghẽn Hiệu Năng trong TypeScript](core_git/01_TypeScript_Performance_Bottlenecks.md)**: Mổ xẻ chi tiết overhead spawn process trên Windows, V8 GC thrashing, nghẽn IPC JSON và layout đơn luồng.
- **[02. Phân loại & Bảng Tổng hợp Lỗi Thao tác Git](core_git/02_Git_Operation_Errors_Taxonomy.md)**: Danh mục các lỗi git thực tế (file locks, in-flight states, shallow clones, detached HEAD, path length, UTF-8 encoding).
- **[03. Thiết kế Kiến trúc Nhân Core Git bằng F#](core_git/03_FSharp_Core_Architecture_Design.md)**: Thiết kế kiểu dữ liệu F# Domain-Driven, tích hợp LibGit2 / Native AOT, thuật toán tính lane song song và giao thức streaming IPC.
