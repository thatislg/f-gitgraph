# Phase 3 Reborn: Nhật Ký Tiến Độ & Theo Dõi Triển Khai (Progress Tracking)

Thư mục này ghi nhận toàn bộ tiến trình triển khai thực tế của **Phase 3: Reborn — Tiến hóa F-GitGraph thành Ứng dụng Git UI Toàn diện (Full-Featured Git Client App UI)**.

> [!IMPORTANT]
> **Định hướng chiến lược**:
> Kế thừa trọn vẹn nền tảng nhân **F# Native AOT Core Engine** siêu tốc độ và hệ thống thẩm mỹ Neon Hexagon Avatar độc bản đã hoàn thành ở Phase 1 và Phase 2. Phase 3 tập trung xây dựng toàn diện không gian làm việc (Workspace), quy trình Staging, bộ soạn thảo Commit, điều hướng 3-Pane, đồng bộ từ xa, quản lý Stash, Visual Interactive Rebase và xử lý xung đột.
>
> 🎯 **Bảng Nghiệm Thu Tính Năng Tập Trung**: Toàn bộ 60 tính năng người dùng cuối được theo dõi và đánh dấu `[x]` tại **[FEATURE_CHECKLIST.md](FEATURE_CHECKLIST.md)**.

---

## 1. Bảng Tổng Quan Trạng Thái 4 Giai Đoạn (Milestones Dashboard)

| Chặng | Tên Giai Đoạn & Trọng Tâm Kỹ Thuật | Tài Liệu Tiến Độ Chi Tiết | Trạng Thái | Tiến Độ (%) |
| :---: | :--- | :--- | :---: | :---: |
| **3.1** | **Khu Vực Staging & Bộ Soạn Thảo Commit (Core Dev Loop)**<br>• Danh sách Unstaged / Staged Files<br>• Stage/Unstage/Discard tệp<br>• Commit Composer (Title, Body, Amend, Sign)<br>• Mở rộng GitCliMutator & RPC workspace.status | **[001_phase3_1_staging_and_composer.md](001_phase3_1_staging_and_composer.md)** | 🟡 Sẵn sàng triển khai | 0% |
| **3.2** | **Kiến Trúc 3-Pane Workspace & Thanh Công Cụ Đồng Bộ**<br>• Left Sidebar Navigator (Branches, Remotes, Tags, Stashes)<br>• Top Toolbar (Fetch, Pull, Push kèm số đếm `↑` / `↓`)<br>• Thanh tìm kiếm & lọc commit (Message, Author, Hash)<br>• Bố cục co giãn Responsive (Sidebar & Inspector Dock) | **[002_phase3_2_3pane_workspace.md](002_phase3_2_3pane_workspace.md)** | ⚪ Chờ Chặng 3.1 | 0% |
| **3.3** | **Quản Lý Stash & So Sánh Vi Sai Đa Commit**<br>• Bảng quản lý Stash (Save, Pop, Apply, Drop, Diff View)<br>• So sánh vi sai giữa 2 commit bất kỳ (`Ctrl` chọn 2 nodes)<br>• Giao diện Stage từng đoạn mã (Partial Hunk Staging) | **[003_phase3_3_stash_and_multi_diff.md](003_phase3_3_stash_and_multi_diff.md)** | ⚪ Chờ Chặng 3.2 | 0% |
| **3.4** | **Tái Cấu Trúc Lịch Sử & Xử Lý Xung Đột Trực Quan**<br>• Trình Visual Interactive Rebase Editor (Kéo thả, Squash, Fixup)<br>• Trình giải quyết xung đột 3 cột (In-Flight 3-Way Conflict Resolver)<br>• Tương tác Kéo & Thả Git trực quan (Drag & Drop) | **[004_phase3_4_rebase_and_conflict.md](004_phase3_4_rebase_and_conflict.md)** | ⚪ Chờ Chặng 3.3 | 0% |

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
