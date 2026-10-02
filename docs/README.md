# Neo Git Graph Documentation

Tài liệu kỹ thuật và kiến trúc cho dự án Neo Git Graph.

## Mục lục tài liệu

- [00. Quy tắc Git & Chiến lược Merge (Git Workflow Rules)](00_GitRules.md): Quy định luồng đồng bộ giữa `upstream` -> `main` -> `custom`.
- [01. Thiết kế Graph Node Lục giác & Hệ thống Icon](01_GraphNodeDesign.md): Tài liệu chi tiết về thiết kế node hình lục giác (Hexagon) và hệ thống biểu tượng (Icons) bên trong commit node lấy cảm hứng từ GitLens.
- [02. Thiết kế Tích hợp Git Account Avatar vào Hexagon Node](02_CommitAvatarDesign.md): Cơ chế băm MD5 chuẩn Gravatar và trích xuất GitHub avatar cho commit author.
