# Neo Git Graph Documentation

Tài liệu kỹ thuật và kiến trúc cho dự án Neo Git Graph.

## Mục lục tài liệu

### 🎨 Phase 1: Avatar, Hexagon Node, Hover & Commit Message Panel
Thư mục [`docs/phase1_Avatar/`](phase1_Avatar/README.md) tổng hợp toàn bộ các nghiên cứu, thiết kế và triển khai giao diện Neo Git Graph giai đoạn 1:

- **[00. Quy tắc Git & Chiến lược Merge (Git Workflow Rules)](phase1_Avatar/00_GitRules.md)**: Quy định luồng đồng bộ giữa `upstream` -> `main` -> `custom`.
- **[01. Thiết kế Graph Node Lục giác & Hệ thống Icon](phase1_Avatar/01_GraphNodeDesign.md)**: Thiết kế node lục giác (Hexagon) và hệ thống biểu tượng (Icons) bên trong commit node.
- **[02. Thiết kế Tích hợp Git Account Avatar vào Hexagon Node](phase1_Avatar/02_CommitAvatarDesign.md)**: Cơ chế băm MD5 Gravatar và trích xuất GitHub avatar cho commit author.
- **[03. Tối ưu kích thước Hexagon Node & Khắc phục khoảng đen Avatar](phase1_Avatar/03_HexagonSizeAndAvatarFit.md)**: Khắc phục khoảng đen ở các góc bằng Hexagon ClipPath và mở rộng kích thước xấp xỉ 24px.
- **[04. Chuẩn hóa SVG Clipping Lục giác & Micro-interaction Hover Scale](phase1_Avatar/04_HexagonClippingAndMicroInteractions.md)**: Ẩn hoàn toàn phần thừa của ảnh avatar bằng SVG clip-path và micro-interaction hover/selected scale (1.15x).
- **[05. Ambient Gradient Highlight & Tối ưu Khoảng đệm Graph Node](phase1_Avatar/05_AmbientHighlightAndGraphMargins.md)**: Hiệu ứng hửng sáng gradient theo màu nhánh khi chọn commit và mở rộng khoảng đệm lề.
- **[06. Tinh chỉnh Neon Ambient Gradient & Viền Tím Flameshot cho Selected Commit](phase1_Avatar/06_NeonAmbientAndFlameshotBorder.md)**: Tinh chỉnh dải neon gradient từ mép phải avatar và viền tím Flameshot bao quanh dòng được chọn.
- **[07. Tối ưu Kích thước Hexagon Mặc định & Zoom Khít Chiều cao Dòng](phase1_Avatar/07_HexagonLineFitScaling.md)**: Điều chỉnh bán kính mặc định R=10px để khi hover/selected zoom lên (scale 1.15) đạt chiều cao 23px vừa khít dòng 24px.
- **[08. Rich Commit Hover Panel & Avatar Deep Zoom Preview](phase1_Avatar/08_RichCommitHoverAndAvatarDeepZoom.md)**: Panel nổi hiển thị toàn bộ commit message màu nền chìm và preview avatar 2.2x.
- **[09. Full Commit Message & Top-Layer Avatar Deep Zoom (5x)](phase1_Avatar/09_FullCommitMessageAndTopLayerAvatarDeepZoom.md)**: Tải toàn bộ message commit (Subject + Body) và Avatar Deep Zoom 5x trên Top Layer tuyệt đối kèm ảnh HD và nhãn tên tác giả.
- **[10. Chuẩn hóa Tên gọi Tương tác Avatar & Click Deep Zoom](phase1_Avatar/10_AvatarInteractionNamingAndClickDeepZoom.md)**: Chuẩn hóa Micro Hover Zoom (1.15x) và Click Deep Zoom (5.0x), kích hoạt 5x bằng click icon avatar.
- **[11. Hover Neon Ambient Highlight trên Cột Graph](phase1_Avatar/11_HoverNeonAmbientHighlight.md)**: Mở rộng hiệu ứng Neon Ambient sang các dòng khi rê chuột (mouse move over) chưa chọn.
- **[12. Highlight Màu cho Tag/Release Pill & Custom Author Tooltip](phase1_Avatar/12_RefPillHighlightAndCustomAuthorTooltip.md)**: Xóa bỏ tooltip mặc định nền trắng, highlight màu rực rỡ cho Tag/Release và Remote branch.
- **[13. Tinh chỉnh Tương tác Hover Cột Graph & Vùng Kích hoạt Commit Message Panel](phase1_Avatar/13_GraphColumnHoverBehaviorAndMessagePanelTrigger.md)**: Không hiện nhãn tên khi hover trong cột graph, chỉ kích hoạt Commit Message Panel từ cột mô tả trở sang phải.
- **[14. Khóa Commit Message Panel Khi Đang Chọn Dòng Commit](phase1_Avatar/14_SuppressCommitMessagePanelWhenCommitSelected.md)**: Khóa và chặn hiển thị commit message panel trên toàn bộ các dòng khi đang có 1 commit mở xem chi tiết.

---

## Nghiên cứu & Thiết kế Nhân Core Git Engine (F#)

Thư mục [`docs/core_git/`](core_git/README.md) tập trung nghiên cứu, tổng hợp các lỗi thao tác Git và thiết kế chuyển đổi tầng nhân (Core Engine) từ TypeScript sang **F# (.NET / Native AOT)** để xử lý các repository quy mô lớn (20.000 - 100.000+ commits).

- **[Core Git Overview & Architecture Comparison](core_git/README.md)**: Tổng quan, động lực chuyển đổi và bảng so sánh hiệu năng giữa TypeScript và F#.
- **[01. Phân tích Các Điểm Nghẽn Hiệu Năng trong TypeScript](core_git/01_TypeScript_Performance_Bottlenecks.md)**: Mổ xẻ chi tiết overhead spawn process trên Windows, V8 GC thrashing, nghẽn IPC JSON và layout đơn luồng.
- **[02. Phân loại & Bảng Tổng hợp Lỗi Thao tác Git](core_git/02_Git_Operation_Errors_Taxonomy.md)**: Danh mục các lỗi git thực tế (file locks, in-flight states, shallow clones, detached HEAD, path length, UTF-8 encoding).
- **[03. Thiết kế Kiến trúc Nhân Core Git bằng F#](core_git/03_FSharp_Core_Architecture_Design.md)**: Thiết kế kiểu dữ liệu F# Domain-Driven, tích hợp LibGit2 / Native AOT, thuật toán tính lane song song và giao thức streaming IPC.

---

### 🔬 Phase 2: Investigation & F# Migration Blueprint
Thư mục [`docs/phase2_Investigation/`](phase2_Investigation/README.md) chứa các bản điều tra chi tiết và kế hoạch tái thiết kế Neo Git Graph với nhân F#:

- **[001. Tổng Quan & Phân Rã Đầu Việc Tái Thiết Kế (Overview)](phase2_Investigation/001_Overview.md)**:
  Phân tích triết lý Read (F# Engine) vs Write (Native Git CLI), ranh giới giữ lại vs đập đi xây lại, đảm bảo an toàn cho commit/push, và bảng phân rã 7 mục đầu việc cần triển khai.
- **[002. Bản Điều Tra Kiến Trúc Đa Nền Tảng (Cross-Platform)](phase2_Investigation/002_Multiplatform.md)**:
  Cấu trúc ứng dụng và chiến lược chạy đa nền tảng (Windows 10/11, Linux Ubuntu/Fedora, macOS Apple Silicon/Intel) với F# Native AOT và Universal VSIX.
- **[003. Lộ Trình Phát Triển Đa Nền Tảng (Windows -> Linux -> macOS)](phase2_Investigation/003_Roadmap.md)**:
  Chiến lược ưu tiên thực thi dứt điểm Windows trước, kế thừa sang Linux và hoàn thiện trên macOS; phân rã 4 giai đoạn và tiêu chuẩn nghiệm thu (DoD).

---

### 📐 Thiết Kế Kỹ Thuật & Nhật Ký Tiến Độ

- **[02. Thiết Kế Kỹ Thuật (Design Specifications)](02_design/README.md)**:
  - **[001_windows](02_design/001_windows/README.md)**: Hệ thống 7 bản thiết kế chi tiết cho Phase 1 Windows (Cấu trúc & Native AOT, Domain Model & Bảng mã lỗi, Fast Reader, Parallel Layout, Stdio IPC, Webview & Mutator, Benchmark Plan).
- **[03. Nhật Ký Tiến Độ (Progress & Worklogs)](03_progess/README.md)**: Thư mục theo dõi tiến độ phát triển chi tiết cho 4 giai đoạn (001_windows, 002_linux, 003_macos, 004_release).
- **[04. Báo Cáo Nghiệm Thu & Đo Đạc (Reports & Verification)](04_reports/README.md)**:
  - **[001_windows](04_reports/001_windows/README.md)**: Báo cáo đo đạc hiệu năng, kiểm thử tương đương đồ thị và an toàn dữ liệu trên Windows.
  - **[002_linux](04_reports/002_linux/README.md)**: Báo cáo tương thích `glibc`, kiểm thử stress-test kho Linux kernel và tự cấp quyền `chmod +x`.
  - **[003_macos](04_reports/003_macos/README.md)**: Báo cáo tối ưu mã máy ARM64/Intel, kiểm định Gatekeeper và hiển thị Retina 120Hz.
  - **[004_release](04_reports/004_release/README.md)**: Báo cáo tự động hóa CI/CD, kiểm định Universal VSIX và biên bản bàn giao tổng thể.






