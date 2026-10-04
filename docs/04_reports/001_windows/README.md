# Báo Cáo Nghiệm Thu & Đo Đạc: Phase 1 Windows Milestone

Thư mục này lưu trữ các báo cáo kỹ thuật, biên bản đo đạc hiệu năng và kết quả kiểm thử nghiệm thu chi tiết cho **Phase 1: Windows First Milestone** theo các tiêu chuẩn thiết kế đã xác lập tại [07_Benchmarking_And_Verification_Plan.md](../../02_design/001_windows/07_Benchmarking_And_Verification_Plan.md).

---

## Danh Mục Các Báo Cáo Dự Kiến Cần Thu Thập

1. **Báo Cáo Kiểm Định Tính Độc Lập Của File Nhị Phân Native AOT**:
   - Ghi nhận kết quả chạy thử nghiệm file `f-gitgraph-core.exe` trên môi trường máy ảo Windows 10/11 sạch (không có .NET SDK/Runtime).
   - Đo đạc dung lượng file nhị phân thực tế và thời gian phản hồi khởi động lạnh (< 5ms).

2. **Báo Cáo Đo Đạc Hiệu Năng So Sánh Định Lượng (Benchmark Report)**:
   - Bảng số liệu đo đạc trực tiếp giữa TypeScript cũ và F# Native AOT mới trên cùng một máy tính Windows:
     - Thời gian nạp ban đầu (Cold-load time) trên kho 1.000, 10.000 và 50.000 commits (mục tiêu: < 300ms).
     - Mức chiếm dụng bộ nhớ RAM đỉnh điểm (Peak RAM footprint, mục tiêu: < 100MB).
     - Tần số khung hình cuộn trang trên Webview (Scroll FPS, mục tiêu: ổn định 60 FPS).
     - Độ trễ truy vấn dải khung nhìn ảo qua Stdio RPC (mục tiêu: < 5ms).

3. **Báo Cáo Kiểm Thử So Sánh Tính Tương Đương Đồ Thị (Equivalence Test Report)**:
   - Biên bản đối chiếu kết quả sắp xếp topo, phân bổ làn đồ thị, màu sắc nhánh và các liên kết đường vẽ hình học giữa hai phiên bản thuật toán.
   - Xác nhận mức độ chính xác và tương đồng đạt 100%.

4. **Biên Bản Nghiệm Thu An Toàn Dữ Liệu Git (Git Safety Audit Report)**:
   - Ghi nhận kết quả kiểm thử toàn diện các lệnh ghi qua Git gốc (`git.exe`): tạo commit kèm chữ ký số GPG/SSH, tạo/xóa nhánh, sáp nhập (merge), rebase và xác thực đẩy code (push) qua Git Credential Manager trên Windows.
   - Xác nhận không có rủi ro mất mát dữ liệu hoặc phá vỡ chính sách bảo mật doanh nghiệp.

---

## Danh Mục Các Báo Cáo Điều Tra & Biên Bản Sự Cố

1. **[011_Webview_FSharp_Core_Migration_Investigation.md](011_Webview_FSharp_Core_Migration_Investigation.md)**:
   - Báo cáo điều tra sự cố tập trung (`REP-WIN-011`): Ghi nhận 4 lỗi cốt lõi (BUG-01 đến BUG-04) và 2 lỗi bổ trợ về hình học và hiển thị sau khi di trú sang nhân F# Core Engine.
2. **[012_Graph_Expansion_Defects_And_Overlay_Architecture_Issue.md](012_Graph_Expansion_Defects_And_Overlay_Architecture_Issue.md)**:
   - Báo cáo sự cố kỹ thuật & Đề xuất cải tiến kiến trúc (`ISSUE-WIN-012`): Chi tiết lỗi vùng expand (nhạt màu, thẳng đuột, hở chân), lỗi thuật toán dồn 1-2 màu, và đề xuất chuyển đổi sang cơ chế Layer hiển thị trên (Overlay / Inspector Panel) cùng đường nối vuông góc bo tròn theo chuẩn GitLens.
3. **[013_CommitOrdering_And_UIRefinements.md](013_CommitOrdering_And_UIRefinements.md)**:
   - Báo cáo kỹ thuật (`REP-WIN-013`): Tính năng Commit Ordering (Topological/Date) trên toàn pipeline (F# Core → RPC → Webview) và tinh chỉnh giao diện (gradient neon, viền panel, panel lật phía trên, avatar scale 1.2x).
4. **[014_PanelGap_Consistency_Fix.md](014_PanelGap_Consistency_Fix.md)**:
   - Báo cáo kỹ thuật (`REP-WIN-014`): Phân tích căn nguyên và khắc phục hiện tượng khoảng cách không đều giữa dòng commit và panel chi tiết (bổ sung hằng số `PANEL_GAP` áp dụng đồng nhất trong cả hai nhánh định vị panel).

