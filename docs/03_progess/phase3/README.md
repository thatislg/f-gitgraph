# Phase 3 Reborn: Nhật Ký Tiến Độ & Theo Dõi Triển Khai (Progress Tracking)

Thư mục này ghi nhận toàn bộ tiến trình triển khai thực tế của **Phase 3: Reborn — Tiến hóa F-GitGraph thành Ứng dụng Git UI Toàn diện (Full-Featured Git Client App UI)**.

> [!IMPORTANT]
> **Định hướng chiến lược**:
> Kế thừa trọn vẹn nền tảng nhân **F# Native AOT Core Engine** siêu tốc độ và hệ thống thẩm mỹ Neon Hexagon Avatar độc bản đã hoàn thành ở Phase 1 và Phase 2. Phase 3 tập trung xây dựng toàn diện không gian làm việc (Workspace), quy trình Staging, bộ soạn thảo Commit, điều hướng 3-Pane, đồng bộ từ xa, quản lý Stash, Visual Interactive Rebase và xử lý xung đột.
>
> 🎯 **Bảng Nghiệm Thu Tính Năng Tập Trung**: Toàn bộ 60 tính năng người dùng cuối được theo dõi và đánh dấu `[x]` tại **[FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md)**.

---

## 📚 Hồ Sơ Thiết Kế Kỹ Thuật Tham Chiếu (Design Specifications)

Mọi hoạt động triển khai trong Phase 3 bắt buộc bám sát hệ thống tài liệu thiết kế chuẩn đã được phê duyệt:

### 1. Hồ Sơ Thiết Kế Chuyên Biệt Từng Giai Đoạn (Phase 3 Design Specs)

- **[docs/02_design/phase3/README.md](../../02_design/phase3/README.md)**: Mục lục trung tâm hồ sơ thiết kế kỹ thuật Phase 3.
  - **[01. Thiết Kế Tầng Backend & Mutator Cho Staging](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md)**: Đặc tả kiến trúc Backend, mở rộng bộ lệnh `GitCliMutator`, thuật toán phân tích `git status --porcelain=v2`, và từ điển dữ liệu RPC.
  - **[02. Thiết Kế Giao Diện Staging Area & Commit Composer](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md)**: Đặc tả cấu trúc cây component, khung đinh tán chữ thập góc (`+`) `CornerCrossFrame`, cơ chế hover-to-reveal chống rối mắt, huy hiệu trạng thái Neon, bộ đếm 50 chars và quy trình an toàn Discard.
  - **[03. Tích Hợp Đồng Bộ Working Tree & File Watcher](../../02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md)**: Cam kết bất biến hình học đồ thị (Zero Geometric Distortion), mở khóa dòng `UNCOMMITTED_CHANGES` (`*`), và thuật toán Debounce 150ms chống bão sự kiện.

### 2. Hồ Sơ Định Hướng Chiến Lược & Thẩm Mỹ (Blueprints & Visual Identity)

- **[001_Git_Features_Comprehensive_Taxonomy.md](../../01_investigation/phase3_Reborn/001_Git_Features_Comprehensive_Taxonomy.md)**: Bảng phân loại 12 trụ cột Git CLI và năng lực GUI client.
- **[002_Fpgitgraph_Current_Capabilities_Audit.md](../../01_investigation/phase3_Reborn/002_Fpgitgraph_Current_Capabilities_Audit.md)**: Kiểm toán 45 tiêu chí năng lực hiện tại của F-GitGraph.
- **[003_Gap_Analysis_And_Evolution_Blueprint.md](../../01_investigation/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md)**: Ma trận khoảng cách và lộ trình tiến hóa 4 giai đoạn (3.1 đến 3.4).
- **[004_Design_System_And_Visual_Identity.md](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md)**: Quy chuẩn thiết kế Cyber-Lab, đinh tán chữ thập góc (`+`), bảng màu Neon và nguyên tắc bất biến đồ thị.
- **[005_Audio_Feedback_And_Sound_Design.md](../../01_investigation/phase3_Reborn/005_Audio_Feedback_And_Sound_Design.md)**: Thiết kế phản hồi âm thanh vi mô Web Audio API (không tệp tài nguyên, siêu nhẹ).

---

## 1. Bảng Tổng Quan Trạng Thái 4 Giai Đoạn (Milestones Dashboard)

|  Chặng  | Tên Giai Đoạn & Trọng Tâm Kỹ Thuật                                                                                                                                                                                                                                                                 | Tài Liệu Tiến Độ Chi Tiết                                                        | Tài Liệu Thiết Kế Trực Tiếp                                                                                                                                                                                                                                                                                                                                             |                    Trạng Thái                    | Tiến Độ (%) |
| :-----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------: | :---------: |
| **3.1** | **Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)**<br>• Danh sách Unstaged / Staged Files<br>• Stage/Unstage/Discard tệp<br>• Commit Composer (Title, Body, Amend, Sign)<br>• Mở rộng GitCliMutator & RPC workspace.status                                                                  | **[001_phase3_1_staging_and_composer.md](001_phase3_1_staging_and_composer.md)** | • [01_Staging_Backend_And_Mutator_Design.md](../../02_design/phase3/01_Staging_Backend_And_Mutator_Design.md)<br>• [02_Staging_UI_And_Composer_Component_Design.md](../../02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md)<br>• [03_WorkingTree_Sync_And_Watcher_Integration.md](../../02_design/phase3/03_WorkingTree_Sync_And_Watcher_Integration.md) | 🟢 Hoàn thành (5.4.2 Light Theme là nợ kỹ thuật) |    100%     |
| **3.2** | **Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ**<br>• Left Sidebar Navigator (Branches, Remotes, Tags, Stashes)<br>• Top Toolbar (Fetch, Pull, Push kèm số đếm `↑` / `↓`)<br>• Thanh tìm kiếm & lọc commit (Message, Author, Hash)<br>• Bố cục co giãn Responsive (Sidebar & Inspector Dock) | **[002_phase3_2_3pane_workspace.md](002_phase3_2_3pane_workspace.md)**           | • [003_Gap_Analysis_And_Evolution_Blueprint.md (Mục 4.2)](../../01_investigation/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md)<br>• [004_Design_System_And_Visual_Identity.md](../../01_investigation/phase3_Reborn/004_Design_System_And_Visual_Identity.md)                                                                                              |                 🟡 Đang triển khai (3/5 nhóm)                 |     60%     |
| **3.3** | **Quản Lý Stash & So Sánh Vi Sai Đa Commit**<br>• Bảng quản lý Stash (Save, Pop, Apply, Drop, Diff View)<br>• So sánh vi sai giữa 2 commit bất kỳ (`Ctrl` chọn 2 nodes)<br>• Giao diện Stage từng đoạn mã (Partial Hunk Staging)                                                                   | **[003_phase3_3_stash_and_multi_diff.md](003_phase3_3_stash_and_multi_diff.md)** | • [003_Gap_Analysis_And_Evolution_Blueprint.md (Mục 4.3)](../../01_investigation/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md)                                                                                                                                                                                                                             |                 ⚪ Chờ Chặng 3.2                 |     0%      |
| **3.4** | **Tái Cấu Trúc Lịch Sử & Xử Lý Xung Đột Trực Quan**<br>• Trình Visual Interactive Rebase Editor (Kéo thả, Squash, Fixup)<br>• Trình giải quyết xung đột 3 cột (In-Flight 3-Way Conflict Resolver)<br>• Tương tác Kéo & Thả Git trực quan (Drag & Drop)                                             | **[004_phase3_4_rebase_and_conflict.md](004_phase3_4_rebase_and_conflict.md)**   | • [003_Gap_Analysis_And_Evolution_Blueprint.md (Mục 4.4)](../../01_investigation/phase3_Reborn/003_Gap_Analysis_And_Evolution_Blueprint.md)                                                                                                                                                                                                                             |                 ⚪ Chờ Chặng 3.3                 |     0%      |

---

## 2. Tiêu Chuẩn Nghiệm Thu Chung Cho Phase 3 (General Definition of Done)

1. **Hiệu năng không suy giảm (Zero Performance Regression)**:
   - Thời gian khởi động lạnh (Cold-start latency) giữ vững dưới 5ms.
   - Thao tác chuyển đổi giữa xem Commit History và Staging Area phản hồi tức thời (< 16ms, 60fps).
2. **An toàn dữ liệu tuyệt đối (100% Data Safety)**:
   - Toàn bộ thao tác thay đổi trạng thái kho (Stage, Unstage, Discard, Commit, Push, Pull, Rebase) bắt buộc thực thi qua Native Git CLI (`git.exe`).
   - Tuyệt đối không làm mất mã nguồn của người dùng khi Discard hoặc Reset (phải luôn có hộp thoại xác nhận).
3. **Thẩm mỹ nhất quán (Design Aesthetic Cohesion)**:
   - Giữ vững phong cách thiết kế đặc trưng của F-GitGraph: Neon Ambient Gradient, viền tím Flameshot, Hexagon Nodes, nhãn Badge rực rỡ và chuyển động micro-interaction mượt mà.
4. **Kiểm thử tự động phủ kín**:
   - Mọi API mutator và RPC mới đều phải có Unit Test Vitest tương ứng.
   - Kiểm tra `typecheck` và `lint` không phát sinh bất kỳ cảnh báo nào.
