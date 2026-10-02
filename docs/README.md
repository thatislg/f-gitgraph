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
