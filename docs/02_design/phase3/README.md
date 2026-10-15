# Phase 3: Hồ Sơ Thiết Kế Kỹ Thuật Reborn (Design Specifications)

Thư mục này lưu trữ toàn bộ hệ thống tài liệu thiết kế kỹ thuật chi tiết (Design Specifications) cho **Phase 3: Reborn — Tiến hóa F-GitGraph thành Ứng dụng Git UI Toàn diện (Full-Featured Git Client App UI)**.

> [!IMPORTANT]
> **Nguyên tắc thiết kế cốt lõi**:
> - **Thiết kế bằng ngôn ngữ tự nhiên (Design by Word)**: Toàn bộ hệ thống tài liệu thiết kế được đặc tả bằng ngôn ngữ tự nhiên, tập trung vào kiến trúc hệ thống, ranh giới an toàn, bảng từ điển dữ liệu, sơ đồ tuần tự và quy chuẩn thẩm mỹ; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
> - **An toàn dữ liệu tuyệt đối**: F# Core Engine đọc trạng thái nhanh; 100% thao tác thay đổi trạng thái kho (stage, unstage, commit, push...) được ủy thác cho Native Git CLI (`git.exe`).
> - **Bảo toàn bất biến 100%**: Tuyệt đối không thay đổi hay làm xô lệch cấu trúc `HexagonNode.tsx`, avatar clip-path, zoom 5x, vầng neon ambient, hay thuật toán đồ thị F# đã hoàn thiện ở Phase 1. Các tính năng mới đóng vai trò là module bao bọc (Wrapper) bên ngoài.
> - **Ngôn ngữ thẩm mỹ Cyber-Lab**: Khung kỹ thuật với **đinh tán chữ thập góc (`+`)** chuẩn LMO Lab, tối giản (Simple), thoáng mắt, hover-to-reveal (tránh rối mắt như GitLens) nhưng vẫn bắt mắt với các điểm nhấn Neon sắc nét.

---

## Danh Mục Các Bản Thiết Kế Chi Tiết

### 📦 Giai Đoạn 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)

1. **[01. Thiết Kế Tầng Backend & Mutator Cho Staging (01_Staging_Backend_And_Mutator_Design.md)](01_Staging_Backend_And_Mutator_Design.md)**:
   - Mở rộng `GitCliMutator.ts` hỗ trợ các lệnh: `stageFile`, `unstageFile`, `stageAll`, `unstageAll`, `discardFileChanges`, `commit(amend, sign)`.
   - Chiến lược thăm dò phiên bản một lần (One-Time Version Probe) và rẽ nhánh Fallback lệnh cổ điển (`git reset`, `git checkout`) cho các bản Git < 2.23 (trước khi có `git restore`).
   - Thuật toán phân tích cú pháp `git status --porcelain=v2` thành mô hình dữ liệu `WorkspaceStatusResult`.
   - Cấu trúc giao thức RPC và các thông điệp trao đổi qua `WebviewBridge`.

2. **[02. Thiết Kế Giao Diện Staging Area & Commit Composer (02_Staging_UI_And_Composer_Component_Design.md)](02_Staging_UI_And_Composer_Component_Design.md)**:
   - Thiết kế các component: `StagingPanel.tsx`, `StagingFileItem.tsx`, `CommitComposer.tsx`.
   - Tích hợp khung đinh tán chữ thập góc (`+`) `CornerCrossFrame.tsx` và cơ chế hover-to-reveal actions chống rối mắt.
   - Bộ đếm ký tự tiêu đề 50 chars, phím tắt `Ctrl + Enter`, và hộp thoại xác nhận Discard an toàn.

3. **[03. Tích Hợp Đồng Bộ Working Tree & File Watcher (03_WorkingTree_Sync_And_Watcher_Integration.md)](03_WorkingTree_Sync_And_Watcher_Integration.md)**:
   - Cơ chế click chọn dòng "Uncommitted changes" trên đồ thị để mở Staging Area & Composer mà không phá vỡ hình học SVG.
   - Tích hợp bộ lắng nghe sự kiện `git-repo.watcher.ts` với cơ chế Debounce 150ms chống quá tải khi lưu nhiều tệp.
