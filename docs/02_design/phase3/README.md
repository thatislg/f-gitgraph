# Phase 3: Hồ Sơ Thiết Kế Kỹ Thuật Reborn (Design Specifications)

Thư mục này lưu trữ toàn bộ hệ thống tài liệu thiết kế kỹ thuật chi tiết (Design Specifications) cho **Phase 3: Reborn — Tiến hóa F-GitGraph thành Ứng dụng Git UI Toàn diện (Full-Featured Git Client App UI)**.

> [!IMPORTANT]
> **Quy chuẩn thiết kế áp dụng**: Toàn bộ hồ sơ thiết kế Phase 3 bắt buộc tuân thủ chặt chẽ [Quy Chuẩn Thiết Kế Kỹ Thuật "Design by Word" (RULES_DESIGN_SPECIFICATION.md)](../RULES_DESIGN_SPECIFICATION.md):
>
> - **Thiết kế bằng ngôn ngữ tự nhiên (Design by Word)**: Toàn bộ hệ thống tài liệu thiết kế được đặc tả bằng ngôn ngữ tự nhiên, tập trung vào kiến trúc hệ thống, ranh giới an toàn, bảng từ điển dữ liệu, sơ đồ tuần tự và quy chuẩn thẩm mỹ; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
> - **An toàn dữ liệu tuyệt đối**: F# Core Engine đọc trạng thái nhanh; 100% thao tác thay đổi trạng thái kho (stage, unstage, commit, push...) được ủy thác cho Native Git CLI (`git.exe`).
> - **Bảo toàn bất biến 100%**: Tuyệt đối không thay đổi hay làm xô lệch cấu trúc `HexagonNode.tsx`, avatar clip-path, zoom 5x, vầng neon ambient, hay thuật toán đồ thị F# đã hoàn thiện ở Phase 1. Các tính năng mới đóng vai trò là module bao bọc (Wrapper) bên ngoài.
> - **Ngôn ngữ thẩm mỹ Cyber-Lab**: Khung kỹ thuật với **đinh tán chữ thập góc (`+`)** chuẩn LMO Lab, tối giản (Simple), thoáng mắt, hover-to-reveal (tránh rối mắt như GitLens) nhưng vẫn bắt mắt với các điểm nhấn Neon sắc nét.
> - **Chất lượng trước khi Dev**: Đạt 10/10 tiêu chí tại Bảng Tiêu Chí Đánh Giá Chất Lượng Thiết Kế (Design Quality Gate Checklist).

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

4. **[04. Thiết Kế Phản Hồi Âm Thanh & Âm Học Vi Mô Cyber-Lab (04_Audio_Feedback_And_Sound_Design.md)](04_Audio_Feedback_And_Sound_Design.md)**:
   - Kiến trúc bộ tổng hợp sóng âm vi mô không tệp tin ngoại vi (Zero-Asset Overhead Web Audio Engine) cư trú thuần túy trong Webview UI.
   - Bản đồ sự kiện âm thanh "xúc giác kỹ thuật số": Chốt cơ khí Leica (`commit.success`), hợp âm thăng hoa quãng 5 (`push.success`), gắp vật lý (`file.stage`), và xung trầm ấm (`conflict.detected`).
   - Cài đặt VS Code (`f-gitgraph.soundEffects.enabled`, `f-gitgraph.soundEffects.volume`), nút ngắt âm nhanh trên UI và cơ chế chống ô nhiễm âm thanh (Cooldown 120ms, Polyphony limit = 2).

---

### 📦 Giai Đoạn 3.2: Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ Toàn Cục

5. **[05. Thiết Kế Backend Mutator Đồng Bộ, Quản Lý Stash & RPC Protocol (05_Sync_And_Stash_Backend_Mutator_Design.md)](05_Sync_And_Stash_Backend_Mutator_Design.md)**:
   - Mở rộng `GitCliMutator.ts` hỗ trợ: `fetchAll(prune)`, `pull(mode)`, `push(forceWithLease, remote, branch)`, `stashSave`, `stashPop`, `stashDrop`.
   - Bộ truy vấn số đếm đồng bộ `syncStatus.ts` (`git rev-list --left-right --count HEAD...@{u}`) và ngăn xếp lưu trữ `stashList.ts`.
   - Khai báo kiểu Action/Query RPC đầy đủ trong `src/types/actions.ts` và `src/types/queries.ts` (Contract-First).

6. **[06. Thiết Kế Thanh Công Cụ Đỉnh Toàn Cục & Huy Hiệu Đồng Bộ (06_Global_Toolbar_And_Sync_Badge_Design.md)](06_Global_Toolbar_And_Sync_Badge_Design.md)**:
   - Thiết kế `GlobalToolbar.tsx` thay thế `MainHeader.tsx`, tích hợp các nút tác vụ nhanh mạng và stash.
   - Huy hiệu số đếm phát sáng Neon `SyncBadge.tsx` (`↑ahead` / `↓behind`), dropdown menu tùy chọn.
   - Kho trạng thái phản ứng `sync.store.ts` và cam kết phản xạ đồng bộ Realtime State Guarantee qua `dispatcher.ts`.

7. **[07. Thiết Kế Cây Điều Hướng Left Sidebar Navigator (07_Sidebar_Navigator_Tree_Design.md)](07_Sidebar_Navigator_Tree_Design.md)**:
   - Thiết kế cây điều hướng bên trái `SidebarNavigator.tsx` gồm 5 nhóm: Working Tree, Local Branches, Remotes, Tags, Stashes.
   - Nhánh `HEAD` active với viền tím Neon, huy hiệu số commit chưa push cạnh từng nhánh, double-click checkout nhánh.
   - Thanh Resizer kéo thả mượt mà (160px – 450px), nút thu gọn nhanh, lưu cấu hình vào `localStorage`.

8. **[08. Thiết Kế Thanh Tìm Kiếm, Lọc Commit & Điều Hướng Đồ Thị DAG (08_Search_Filter_And_DAG_Navigation_Design.md)](08_Search_Filter_And_DAG_Navigation_Design.md)**:
   - Thanh tìm kiếm commit `SearchFilterBar.tsx` kích hoạt bằng phím tắt toàn cục `Ctrl + F`.
   - Thuật toán bóc tách cú pháp lọc: Tìm kiếm tự do trong thông điệp, lọc theo tác giả `author:`, lọc theo mã băm `hash:`.
   - Highlight phát quang Neon trên đồ thị và cuộn mượt mà trên bảng ảo hóa Virtualized Table.

9. **[09. Thiết Kế Bố Cục Co Giãn Responsive 3-Pane & Nghiệm Thu Bất Biến Hình Học (09_Workspace_Layout_And_Responsive_3Pane_Design.md)](09_Workspace_Layout_And_Responsive_3Pane_Design.md)**:
   - Khung bố cục tổng thể `WorkspaceLayout.tsx` ghép nối 3 phân vùng độc lập (Sidebar - DAG Table - Inspector).
   - Tích hợp `ResizeObserver` theo dõi kích thước động kết hợp `requestAnimationFrame`.
   - Kiểm định bất biến hình học tuyệt đối (Zero Layout Shift): Độ lệch tọa độ các nút `HexagonNode` và đường cong Bézier bằng 0 pixel khi co giãn hoặc đóng mở Sidebar.

---

### 🚀 Giai Đoạn 3.2.UI: Đột Phá Giao Diện Bánh Xe Lục Giác & Nâng Tầm Thẩm Mỹ Cyber-Lab

10. **[10. Thiết Kế Chi Tiết Cyber Hex-Wheel Command Hub & Trải Nghiệm Giao Diện Radial Đột Phá (10_WheelConcepts.md)](10_WheelConcepts.md)**:
    - Hiện thực hóa Concept Menu Bánh xe Lục giác hướng tâm (`Git Radial Menu Concept`) lấy cảm hứng từ `Concept1_Color.jpg` và `Concept2_Color.jpg`.
    - Kiến trúc 3 trạng thái tương tác hoàn chỉnh: State 1 (Collapsed Segmented Emblem), State 2 (Expanded 7-Hex Honeycomb Cluster), State 3 (Depth of Field Focus & Contextual Floating Pill).
    - Hỗ trợ 2 phong cách thẩm mỹ: Neon Chromatic (Đa sắc bán dẫn) và Cyber Blue Monochromatic (Đơn sắc kỹ thuật cao) với bộ token phát quang Neon sắc nét.
    - Kho trạng thái phản ứng `wheel.store.ts` bằng Preact Signals, liên kết 100% với `sync.store.ts`, bảo đảm nguyên tắc Zero Layout Shift đối với đồ thị DAG.

