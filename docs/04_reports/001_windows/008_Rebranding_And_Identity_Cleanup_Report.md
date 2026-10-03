# Báo Cáo Chuẩn Hóa Nhận Diện Thương Hiệu & Dọn Dẹp Tàn Dư (Nhóm Việc 8)

> **Mã báo cáo**: 008_Rebranding_And_Identity_Cleanup_Report
> **Giai đoạn**: Phase 1 — Windows First Milestone
> **Nhóm việc liên quan**: Nhóm Việc 8 — Dọn Dẹp Tàn Dư & Chuẩn Hóa Nhận Diện Thương Hiệu
> **Ngày thực hiện**: 2026-10-03
> **Tài liệu thiết kế áp dụng**: [08_Rebranding_And_Identity_Cleanup.md](../../02_design/001_windows/08_Rebranding_And_Identity_Cleanup.md)

---

## 1. Mục Tiêu & Phạm Vi

Xóa bỏ triệt để tàn dư định danh cũ (`neo-git-graph`, `neo-git-core`) và hoàn thiện diện mạo nhận diện thương hiệu **F-GitGraph** trên toàn bộ mã nguồn, metadata gói và tài liệu người dùng.

---

## 2. Kết Quả Rà Soát Tàn Dư Định Danh Cũ (Nhiệm vụ 8.3)

Thực hiện quét toàn cục chuỗi `neo-git` trên kho mã nguồn:

| Thành phần                    | Trạng thái | Ghi chú                                                          |
| :---------------------------- | :--------: | :--------------------------------------------------------------- |
| Mã nguồn TypeScript/F#        |  ✅ Sạch   | Không còn `neo-git-graph`/`neo-git-core` trong `src/`/`tests/`   |
| `package.json` (metadata)     |   ✅ Đạt   | `name`, `displayName`, command, cấu hình `f-gitgraph.*` đồng bộ  |
| `README.md`                   |   ✅ Đạt   | Đã làm mới nội dung thương hiệu F-GitGraph                       |
| `package.nls.json`            |   ✅ Đạt   | Mô tả lệnh/cấu hình chuyển sang F-GitGraph                       |
| `CHANGELOG.md`                |   ✅ Sửa   | Link lịch sử `asispts/neo-git-graph` → `thatislg/f-gitgraph`     |
| Tệp nhị phân `neo-git-core.*` |  ✅ Sạch   | `src/core-engine/bin/` và `obj/` không còn artifact tên cũ       |
| Tài liệu `docs/` (mô tả)      |   ℹ️ Giữ   | Cụm từ cũ chỉ còn trong văn bản mô tả việc dọn dẹp (có chủ đích) |

---

## 3. Metadata Gói & Nhà Phát Hành (Nhiệm vụ 8.3)

- `publisher`: `lmo-lab`, `author`: "LMO-LAB" (`lnllnl01111@gmail.com`); `sponsor` đã gỡ bỏ liên kết tài trợ cũ.
- `repository`/`homepage`/`bugs` trỏ về `https://github.com/thatislg/f-gitgraph`.
- Đồng bộ `LICENSE` (bản quyền `2026-present LMO-LAB`), `.github/CODEOWNERS` và `.github/FUNDING.yml` về định danh LMO-LAB.

---

## 4. Làm Mới Tài Liệu Người Dùng (Nhiệm vụ 8.2)

- **`README.md`**: viết lại hoàn toàn theo nhận diện F-GitGraph — loại bỏ khung "fork of Git Graph", thay bằng mục "About" giới thiệu nhân F# Native AOT, bảng so sánh kiến trúc trước/sau, roadmap Windows → Linux → macOS → Release, và thông tin tác giả LMO-LAB.
- **`CHANGELOG.md`**: thiết lập mốc `[Unreleased]` ghi nhận sự ra đời của F-GitGraph (nhân F# Native AOT, LibGit2 in-process, DAG song song, IPC daemon, UI lục giác neon); đồng bộ toàn bộ link lịch sử sang `thatislg/f-gitgraph`.
- **`package.nls.json`**: chuẩn hóa câu từ mô tả lệnh/cấu hình theo thương hiệu F-GitGraph; loại bỏ bản tiếng Trung (xem Nhóm Việc 9).

---

## 5. Đóng Gói Kiểm Chứng (Nhiệm vụ 8.4)

| Hạng mục                                | Kết quả  |
| :-------------------------------------- | :------: |
| `pnpm run typecheck` (5 project TS)     | ✅ 0 lỗi |
| `pnpm run lint` (oxlint, 160 rules)     | ✅ 0 lỗi |
| `pnpm run package` (esbuild production) |  ✅ Đạt  |
| `dotnet test f-gitgraph-core.sln`       | ✅ 56/56 |

> Việc đóng gói bản `.vsix` cuối cùng (`f-gitgraph-win-x64.vsix`) và kiểm tra trực quan icon/tên trên trình quản lý Extension của VS Code do người dùng thực hiện trên máy thật.

---

## 6. Hạn Chế & Ghi Chú

- **Nhiệm vụ 8.1 (bộ tài nguyên hình ảnh)**: thiết kế lại `icon.png`, bộ SVG Webview Tab và `demo.gif` là công việc đồ họa thủ công, được chuyển giao cho **Nhóm Việc 10 — Hệ Thống Biểu Tượng & Icon F-GitGraph** (đã có tài liệu thiết kế riêng).

---

## 7. Kết Luận

| Tiêu chí                                    | Trạng thái |
| :------------------------------------------ | :--------: |
| Không còn tàn dư `neo-git-*` trong mã nguồn |   ✅ Đạt   |
| Metadata gói & tài liệu đồng bộ F-GitGraph  |   ✅ Đạt   |
| Đóng gói build không lỗi                    |   ✅ Đạt   |
| Bộ tài nguyên hình ảnh (icon/demo.gif)      | ⏳ Nhóm 10 |
