# Báo Cáo Thiết Kế Hệ Thống Biểu Tượng & Bộ Nhận Diện Thị Giác (Nhóm Việc 10)

> **Mã báo cáo**: 010_Extension_Iconography_Report  
> **Giai đoạn**: Phase 1 — Windows First Milestone  
> **Nhóm việc liên quan**: Nhóm Việc 10 — Thiết Kế Hệ Thống Biểu Tượng & Icon F-GitGraph  
> **Ngày thực hiện**: 2026-10-03  
> **Tài liệu thiết kế áp dụng**: [10_Extension_Iconography_Design.md](../../02_design/001_windows/10_Extension_Iconography_Design.md)  

---

## 1. Mục Tiêu & Phương Án Thiết Kế Thị Giác (Nhiệm vụ 10.1)

Nhằm thiết lập nhận diện thương hiệu trực quan chuyên nghiệp, đồng bộ hoàn toàn với giao diện Webview Preact hiện đại (nút lục giác SVG, vầng sáng neon ambient) của F-GitGraph, dự án đã chính thức lựa chọn và triển khai phương án:

- **Ý tưởng chủ đạo**: **"Neon Hexagon & F-Branch" (Cyberpunk Modern)**
- **Đặc trưng thị giác**:
  - Trục thân chính (Trunk) màu Cyan Neon (`#00F0FF`).
  - Nhánh rẽ phía trên (Upper branch) màu Fuchsia Neon (`#FF007F`).
  - Nhánh rẽ phía dưới (Lower branch) màu Violet Neon (`#A855F7`).
  - Các nút commit hình khối lục giác (Hexagon nodes) đồng bộ 100% với component `HexagonNode.tsx` trên giao diện đồ thị Webview.
  - Tổng thể tạo hình thành chữ cái **"F"** phân nhánh sống động, thể hiện rõ nét bản sắc cốt lõi: **F# Native AOT + Git Graph**.

---

## 2. Danh Mục 7 Tệp Tài Nguyên & Đặc Tả Kỹ Thuật (Nhiệm vụ 10.2 & 10.3)

Toàn bộ 7 tệp icon theo đúng bảng kiểm kê thiết kế đã được xây dựng và xuất bản hoàn chỉnh trong thư mục `resources/`:

| STT | Tên Tệp | Định Dạng | Kích Thước | Vị Trí / Mục Đích Sử Dụng | Quy Chuẩn Kỹ Thuật |
| :-: | :--- | :-: | :-: | :--- | :--- |
| **1** | [resources/icon.png](../../../resources/icon.png) | **PNG-24** (Alpha) | **128 x 128 px** | **Icon chính của Extension** trên VS Code Marketplace & Extensions Panel | Nền squircle bo góc carbon tối (`#0B0F19`), viền ngoài 3px, chữ F nhánh neon Cyan và Fuchsia, padding an toàn 12px, chống vỡ hạt khi co giãn. |
| **2** | [resources/icon-512.png](../../../resources/icon-512.png) | **PNG-24** (Alpha) | **512 x 512 px** | **Bản vẽ Master HiDPI** phục vụ Marketplace Web Page & GitHub README Hero | Xuất bản với độ mịn cao nhất (HighQualityBicubic, AntiAlias), hiệu ứng glow ambient đa lớp. |
| **3** | [resources/webview-icon.svg](../../../resources/webview-icon.svg) | **Vector SVG** | **24 x 24 px** | **Icon Tab Webview** khi cấu hình `f-gitgraph.tabIconColourTheme = "colour"` | Biến thể đa sắc rực rỡ với các nút lục giác viền Cyan, Fuchsia, Violet tương phản cao. |
| **4** | [resources/webview-icon-dark.svg](../../../resources/webview-icon-dark.svg) | **Vector SVG** | **24 x 24 px** | **Icon Tab Webview** khi cấu hình `tabIconColourTheme = "grey"` trên Dark Theme | Biến thể đơn sắc sáng tương phản cao (`#E0E0E0`), nét thanh mảnh 1.8px/1.2px, nền lục giác tối `#1E1E1E`. |
| **5** | [resources/webview-icon-light.svg](../../../resources/webview-icon-light.svg) | **Vector SVG** | **24 x 24 px** | **Icon Tab Webview** khi cấu hình `tabIconColourTheme = "grey"` trên Light Theme | Biến thể đơn sắc tối tương phản cao (`#333333`), nét thanh mảnh, nền lục giác sáng `#FFFFFF`. |
| **6** | [resources/activitybar-icon.svg](../../../resources/activitybar-icon.svg) | **Vector SVG** | **24 x 24 px** | **Icon thanh Activity Bar / Side Bar** bên trái | Vector đơn sắc chuẩn VS Code sử dụng `stroke="currentColor"`, `fill="currentColor"`, tự động thích ứng hoàn hảo với mọi chủ đề màu VS Code. |
| **7** | [resources/status-bar-icon.svg](../../../resources/status-bar-icon.svg) | **Vector SVG** | **16 x 16 px** | **Icon thanh Trạng Thái (Status Bar)** ở góc dưới màn hình | Tối giản vi mô (Micro-scale) với nét vẽ 1.5px và các nút lục giác 0.9px, bảo đảm độ rõ ràng khi hiển thị ở kích thước 16px. |

---

## 3. Công Cụ & Kịch Bản Tạo Icon Tự Động (Automation Generator)

Để đảm bảo tính tái lập 100% mà không đòi hỏi cài đặt các phần mềm đồ họa bên thứ ba phức tạp, dự án đã xây dựng kịch bản PowerShell:

- **Đường dẫn**: [scripts/generate-icons.ps1](../../../scripts/generate-icons.ps1)
- **Công nghệ**: Sử dụng thư viện đồ họa thuần Windows `.NET` (`System.Drawing`) với các chế độ kết xuất đồ họa cao cấp nhất:
  - `SmoothingMode = AntiAlias`
  - `InterpolationMode = HighQualityBicubic`
  - `PixelOffsetMode = HighQuality`
- **Chức năng**:
  1. Vẽ nền squircle carbon tối với độ dốc tuyến tính (`LinearGradientBrush`).
  2. Vẽ hiệu ứng ánh sáng phát quang neon (`glowPen` 48px Alpha).
  3. Vẽ đường cong Bezier mềm mại cho các nhánh rẽ Git.
  4. Vẽ 4 nút lục giác toán học chuẩn xác với tâm lõi commit.
  5. Xuất bản `icon-512.png` và thu nhỏ sắc nét thành `icon.png` 128x128 px.

---

## 4. Tích Hợp Hệ Thống & Đóng Gói VSIX (Nhiệm vụ 10.4)

### 4.1 Cấu Hình Trong Manifest & Codebase

1. **Manifest [package.json](../../../package.json)**:
   - Khai báo trường `"icon": "resources/icon.png"` ở cấp root của manifest, phục vụ hiển thị trên Extensions Panel và Marketplace.
   - Khai báo icon chế độ sáng/tối cho lệnh `f-gitgraph.view`:
     ```json
     "icon": {
       "light": "resources/webview-icon-light.svg",
       "dark": "resources/webview-icon-dark.svg"
     }
     ```
2. **Module Điều Phối Webview [src/extension/view-command.ts](../../../src/extension/view-command.ts)**:
   - Tự động phát hiện cấu hình `config.tabIconColourTheme()`:
     - Nếu `"colour"`: Nạp [resources/webview-icon.svg](../../../resources/webview-icon.svg).
     - Nếu `"grey"`: Nạp cặp icon thích ứng theme: [resources/webview-icon-light.svg](../../../resources/webview-icon-light.svg) (Light) và [resources/webview-icon-dark.svg](../../../resources/webview-icon-dark.svg) (Dark).
3. **Quy Tắc Đóng Gói [.vscodeignore](../../../.vscodeignore)**:
   - Bổ sung quy tắc whitelist toàn diện cho toàn bộ 7 tệp tài nguyên:
     ```gitignore
     !resources/icon.png
     !resources/icon-512.png
     !resources/webview-icon.svg
     !resources/webview-icon-dark.svg
     !resources/webview-icon-light.svg
     !resources/activitybar-icon.svg
     !resources/status-bar-icon.svg
     ```

### 4.2 Kiểm Chứng Đóng Gói Gói Cài Đặt VSIX

Chạy lệnh đóng gói thực tế bằng `@vscode/vsce`:
```powershell
npx vsce package --no-dependencies --out f-gitgraph-win-x64.vsix
```

**Kết quả xác nhận**:
- Toàn bộ 7 file icon được đóng gói chuẩn xác vào thư mục `extension/resources/` của tệp `f-gitgraph-win-x64.vsix`.
- Dung lượng gói VSIX: **2.61 MB** (gồm nhân F# Native AOT, LibGit2 DLL, Webview bundle và bộ icon đầy đủ).

---

## 5. Kết Quả Kiểm Thử Chất Lượng (Quality Verification)

| Hạng mục kiểm tra | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| **Kiểm tra kiểu tĩnh (Typecheck)** | ✅ Đạt | `tsc` 5 project đều đạt 0 lỗi |
| **Kiểm tra cú pháp linter (Oxlint)** | ✅ Đạt | 160 rules, 157 files, 0 warnings, 0 errors |
| **Kiểm thử Webview (Vitest)** | ✅ Đạt | 14 test files, 73/73 tests passed |
| **Kiểm thử Extension (Vitest)** | ✅ Đạt | 1 test file, 2/2 tests passed |
| **Kiểm thử Backend Mutator & RPC (Vitest)** | ✅ Đạt | Toàn bộ các bài kiểm tra logic đều pass |
| **Kiểm thử F# Core Engine (xUnit)** | ✅ Đạt | 56/56 tests passed (299ms) |
| **Độ toàn vẹn tài nguyên đồ họa** | ✅ Đạt | Kích thước, màu sắc và độ trong suốt Alpha đáp ứng 100% tiêu chuẩn VS Code |

---

## 6. Kết Luận

Nhóm Việc 10 đã được **hoàn thành 100%**, mang lại cho **F-GitGraph** một diện mạo nhận diện thương hiệu độc đáo, đậm chất kỹ thuật hiện đại và đồng bộ tuyệt đối với giao diện đồ thị Webview.
