# Quy Chuẩn Thiết Kế Kỹ Thuật Chuẩn "Design by Word" (Technical Design Specification Rules)

> **Mã quy chuẩn**: RULE-TECHNICAL-DESIGN-BY-WORD  
> **Tài liệu gốc**: [.agents/rules/technical_design_specification.md](../../.agents/rules/technical_design_specification.md)  
> **Skill tương ứng**: [.agents/skills/technical-design-specification/SKILL.md](../../.agents/skills/technical-design-specification/SKILL.md)  
> **Áp dụng cho**: Toàn bộ các hồ sơ thiết kế kỹ thuật thuộc `docs/02_design/` (Phase 1, Phase 2, Phase 3 và các giai đoạn tiếp theo)  
> **Mục tiêu**: Chuẩn hóa 100% quy trình lập đặc tả thiết kế hệ thống do AI hoặc kỹ sư lập, nhằm triệt tiêu tối đa lỗi thiết kế (`[DESIGN_DEFECT]`), bảo đảm an toàn dữ liệu tuyệt đối, tính khả thi khi triển khai và sự đồng nhất trải nghiệm thị giác Cyber-Lab.

---

## 1. 7 Nguyên Tắc Bất Biến Trong Thiết Kế Kỹ Thuật (7 Invariant Design Principles)

### Nguyên Tắc 1: Triết Lý "Design by Word" Tuyệt Đối (No Code In Specs)
- **Đặc tả bằng ngôn ngữ tự nhiên**: Mọi tài liệu thiết kế phải tập trung giải thích kiến trúc phân tầng, ranh giới an toàn, hành vi nghiệp vụ, mô hình dữ liệu, sơ đồ tuần tự và tương tác người dùng bằng ngôn ngữ tự nhiên chuẩn xác, rõ ràng và mạch lạc.
- **Tuyệt đối cấm mã nguồn mẫu**: Không chèn code demo, code giả lập (pseudo-code) hay code copy-paste vào tài liệu thiết kế. Việc chèn code vụn vặt làm AI và lập trình viên sao chép máy móc, bỏ quên tư duy kiến trúc và làm tăng đột biến tỷ lệ lỗi `[DESIGN_DEFECT]`.

### Nguyên Tắc 2: Ranh Giới An Toàn 4 Tầng Xử Lý (4-Tier Safety Boundary)
Mọi thiết kế tính năng mới bắt buộc phải tuân thủ và xếp vào đúng 4 tầng sau, tuyệt đối không được phá vỡ ranh giới:
1. **Tầng Giao Diện Webview (Preact & Signals)**:
   - Chỉ chịu trách nhiệm kết xuất đồ họa và bắt sự kiện người dùng.
   - **Cấm hoàn toàn**: Không được gọi Node.js runtime, không truy cập hệ thống tệp (`fs`), không gọi tiến trình (`child_process`), không thực thi lệnh shell. Mọi nhu cầu tương tác kho mã nguồn phải gửi thông điệp yêu cầu (Action/Query Request) qua cầu nối `WebviewBridge`.
2. **Tầng Điều Phối Backend (VS Code Extension Host MessageHandler)**:
   - Tiếp nhận thông điệp RPC từ Webview, kiểm tra tính hợp lệ của tham số và ngữ cảnh kho hiện tại (`repoPath`).
   - Phân luồng: Chuyển truy vấn trạng thái sang bộ query, chuyển thao tác ghi sang `GitCliMutator`.
3. **Tầng Biến Đổi Dữ Liệu An Toàn (`GitCliMutator`)**:
   - Chịu trách nhiệm 100% thao tác ghi và thay đổi kho (stage, unstage, discard, commit, push, merge, rebase...).
   - **Bắt buộc ủy thác cho Git CLI gốc (`git.exe`)**: Không tự ý ghi trực tiếp vào thư mục `.git/` để bảo vệ chữ ký số (GPG/SSH), thông tin xác thực (Git Credential Manager) và các hook Git.
   - **Ký tự phân tách an toàn `--`**: Bắt buộc xuất hiện trong mọi lệnh có đường dẫn tệp (ví dụ `git add -- <path>`, `git restore -- <path>`) để ngăn chặn Command Injection và nhầm lẫn đường dẫn với tên nhánh.
   - **Cơ chế thăm dò phiên bản (Version Probe & Fallback)**: Với các lệnh phụ thuộc phiên bản Git mới (như `git restore` xuất hiện từ Git >= 2.23), thiết kế phải quy định cơ chế probe một lần và nhánh fallback về lệnh truyền thống (`git reset`, `git checkout`) cho Git cũ.
4. **Tầng Đọc Tốc Độ Cao & Bố Cục Đồ Thị (F# Core Engine & Queries)**:
   - Đọc dữ liệu nhanh, phi khóa (lock-free), sử dụng `git status --porcelain=v2 -z` bóc tách bằng máy trạng thái NUL-delimiter, giải thuật DAG song song không gây block luồng giao diện.

### Nguyên Tắc 3: Bảo Toàn Bất Biến Hình Học Đồ Thị 100% (Geometric Invariance)
- Tuyệt đối không thay đổi, can thiệp hay làm xô lệch các thành phần đồ thị cốt lõi đã hoàn thiện ở Phase 1: Nút lục giác `HexagonNode.tsx`, avatar clipPath, khả năng Zoom 5x, vầng phát quang Neon ambient gradient, và tọa độ tính toán từ F# DAG Solver.
- Mọi tính năng mở rộng mới (như Staging Area, Commit Composer, 3-Pane Workspace, Diff Panel) bắt buộc đóng vai trò là **Module Bao Bọc (Wrapper)**, **Thanh Điều Khiển Bên Cạnh (Side Panel)** hoặc **Bảng Lồng Ghép (Overlay Inspector Panel)**.

### Nguyên Tắc 4: Thẩm Mỹ Cyber-Lab & Chống Ô Nhiễm Thị Giác (Anti-Visual Pollution)
Mọi giao diện người dùng phải tuân thủ nghiêm ngặt ngôn ngữ thiết kế Cyber-Lab của LMO Lab:
- **Khung đinh tán chữ thập góc (`+`)**: Thành phần chứa (Container) phải lồng trong `CornerCrossFrame.tsx` với 4 ký tự `+` tại 4 góc vuông (dịch chuyển tọa độ âm -6px, phông Monospace đơn cách). Có 3 trạng thái phát quang: Idle (mờ 50%), Hover (mờ 80%), Active/Focus (bừng sáng Neon tím `#a855f7` với đổ bóng `drop-shadow(0 0 6px rgba(168,85,247,0.6))`).
- **Cơ Chế Hover-to-Reveal**: Cụm nút thao tác (Stage, Unstage, Discard, Diff) trên từng dòng tệp **phải ẩn hoàn toàn ở trạng thái tĩnh** (`opacity: 0`, `pointer-events: none`). Chỉ hiện mượt mà khi người dùng rê chuột (`opacity: 1`, transition 150ms `cubic-bezier(0.4, 0, 0.2, 1)`). Tuyệt đối không bày sẵn ma trận nút icon gây rối mắt như GitLens.
- **Huy hiệu trạng thái Neon chuẩn $18\text{px} \times 18\text{px}$**:
  - `A` (Added): Xanh lục Neon `#10b981`.
  - `M` (Modified): Vàng cam Neon `#f59e0b`.
  - `D` (Deleted): Đỏ tươi Neon `#ef4444`.
  - `R` (Renamed): Tím Neon `#a855f7`.
  - `U` (Untracked): Xanh lơ Neon `#06b6d4`.
- **Hệ màu Cyber-Lab 2 chế độ**:
  - Dark Mode: Nền `#0f172a`, viền `#334155`, chữ chính `#f8fafc`, chữ phụ `#94a3b8`.
  - Light Mode: Nền `#f8fafc`, viền `#cbd5e1`, chữ chính `#0f172a`, chữ phụ `#64748b`.

### Nguyên Tắc 5: Hợp Đồng Dữ Liệu RPC Định Kiểu Nghiêm Ngặt (Strict RPC Typing)
- Mọi tương tác giữa Webview và Extension Host phải có hợp đồng kiểu dữ liệu rõ ràng, đăng ký trong `src/types/actions.ts` hoặc `src/types/queries.ts`.
- Thiết kế phải đặc tả:
  1. Tên định danh thông điệp (Action/Query Name).
  2. Cấu trúc Payload gửi đi (bắt buộc chỉ rõ từng trường, kiểu dữ liệu, trường bắt buộc vs tùy chọn). Với payload rỗng, dùng kiểu `object`, không dùng `Record<string, never>`.
  3. Cấu trúc phản hồi (Result/Response Type).
  4. Các mã lỗi và thông điệp chuẩn hóa khi xảy ra sự cố (Error Handling).

### Nguyên Tắc 6: Ma Trận Kiểm Thử Đơn Vị Song Hành (Parallel Unit Testing Matrix)
- Không có thiết kế nào được coi là hoàn thiện nếu thiếu phần đặc tả kiểm thử.
- Mỗi bản thiết kế bắt buộc phải có một chương **Ma Trận Kiểm Thử Đơn Vị (Unit Testing Matrix)** liệt kê rõ:
  - Tên tệp test suite độc lập tương ứng (ví dụ `tests/webview/components/staging/StagingFileItem.test.tsx`).
  - Component hoặc hàm mục tiêu cần kiểm thử.
  - Danh sách kịch bản kiểm thử bắt buộc (kịch bản thành công, kịch bản lỗi, kịch bản biên/edge cases, phím tắt bàn phím, hỗ trợ đa theme Dark/Light).

### Nguyên Tắc 7: Quy Trình Hiệu Chỉnh Thiết Kế Khi Phát Hiện `[DESIGN_DEFECT]`
Khi quá trình triển khai hoặc kiểm thử phát hiện lỗi bắt nguồn từ thiết kế (`[DESIGN_DEFECT]` theo quy chuẩn [RULE-COMPILATION-DEFECT-TRACKING](../04_reports/RULES_COMPILATION_ERROR_TRACKING.md)), bắt buộc thực hiện 3 bước:
1. **Cập nhật trực tiếp bản thiết kế**: Mở file thiết kế liên quan trong `docs/02_design/`, sửa lại đặc tả cho đúng và khả thi.
2. **Ghi nhật ký thay đổi (Change Log)**: Ghi rõ tại đầu tệp thiết kế ngày giờ, lý do sửa đổi, vấn đề kỹ thuật đã phát hiện và phiên bản tài liệu.
3. **Đồng bộ hợp đồng**: Cập nhật đồng bộ các file kiểu dữ liệu (`src/types/`) và ma trận test trước khi viết lại mã nguồn.

---

## 2. Cấu Trúc Khung Mẫu Chuẩn Của Một Bản Thiết Kế (Specification Template)

Mọi tài liệu thiết kế mới (đặt trong `docs/02_design/phaseX/`) bắt buộc phải tuân theo cấu trúc 7 phần chuẩn sau:

```markdown
# [Mã Số]. [Tiêu Đề Bản Thiết Kế Kỹ Thuật] ([Tên Tiếng Anh])

Tài liệu này đặc tả chi tiết kiến trúc, luồng dữ liệu, hợp đồng giao tiếp và quy chuẩn giao diện cho [Tên Tính Năng / Milestone].

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào kiến trúc hệ thống, luồng dữ liệu, quy chuẩn an toàn và hành vi tương tác; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
>
> 📌 **GitHub Tracking**: [Epic #XX] - Liên kết các task con từ [#YY] đến [#ZZ].

---

## 1. Tầm Nhìn, Mục Tiêu & Ranh Giới An Toàn
- **1.1. Mục tiêu cốt lõi**: Nêu rõ bài toán cần giải quyết và giá trị mang lại.
- **1.2. Phân tách ranh giới an toàn 4 tầng**: Vẽ sơ đồ Mermaid luồng tương tác giữa Webview, Host, Mutator và Git CLI.
- **1.3. Cam kết bất biến**: Xác nhận các thành phần đồ thị cũ không bị ảnh hưởng.

---

## 2. Đặc Tả Nghiệp Vụ Tầng Backend & Mutator (Nếu có)
- **2.1. Danh mục các lệnh Git CLI**: Liệt kê tên hàm, lệnh Git gốc tương ứng, danh sách cờ, cờ an toàn `--`.
- **2.2. Chiến lược tương thích đa phiên bản**: Đặc tả quy tắc probe phiên bản Git và rẽ nhánh fallback.
- **2.3. Thuật toán bóc tách cú pháp**: Quy tắc phân tích chuỗi dữ liệu (porcelain v2, phân tách byte NUL, xử lý Unicode).

---

## 3. Hợp Đồng Từ Điển Dữ Liệu & Giao Thức RPC
- **3.1. Hợp đồng Action Requests**: Bảng mô tả chi tiết Action name, Payload structure, Validation rules.
- **3.2. Hợp đồng Query Requests**: Bảng mô tả Query name, Tham số truy vấn, Dữ liệu phản hồi.
- **3.3. Xử lý lỗi & Ngoại lệ chuẩn hóa**: Danh sách mã lỗi và giải pháp hiển thị thông báo.

---

## 4. Đặc Tả Kiến Trúc Tầng Giao Diện & Quản Lý Trạng Thái
- **4.1. Cây phân rã Component (Component Hierarchy)**: Liệt kê danh sách các Component từ vỏ bọc ngoài đến phần tử con sâu nhất.
- **4.2. Quản lý trạng thái bằng Preact Signals**: Danh mục tín hiệu gốc (`signal`), tín hiệu dẫn xuất (`computed`), và các hành động của Store (`store actions`).
- **4.3. Bắt sự kiện & Phím tắt (Keyboard Shortcuts)**: Danh sách tổ hợp phím tắt hỗ trợ cả Windows (`Ctrl`) và macOS (`Cmd`).

---

## 5. Quy Chuẩn Thẩm Mỹ Cyber-Lab & Tương Tác Vi Mô
- **5.1. Khung đinh tán chữ thập góc (`+`)**: Vị trí, kích thước, hiệu ứng bừng sáng 3 mức (Idle, Hover, Active/Focus).
- **5.2. Cơ chế Hover-to-Reveal Actions**: Mô tả thời gian trễ, hiệu ứng mờ dần, điều kiện kích hoạt.
- **5.3. Bảng Token màu sắc Cyber-Lab**: Bảng tra cứu mã màu HEX/HSL cho Dark Mode và Light Mode.
- **5.4. Âm thanh vi mô (Micro-Audio Feedback - Nếu có)**: Tần số Web Audio API, thời lượng miligiây, ngữ cảnh phát âm thanh.

---

## 6. Ma Trận Kiểm Thử Đơn Vị Song Hành (Unit Testing Matrix)
Bảng tổng hợp kịch bản kiểm thử bắt buộc:

| Tệp Kiểm Thử Độc Lập | Module / Component Mục Tiêu | Kịch Bản Kiểm Thử Bắt Buộc |
| :--- | :--- | :--- |
| `tests/.../ComponentA.test.tsx` | `ComponentA` | - Kịch bản render ban đầu.<br>- Kịch bản tương tác người dùng.<br>- Kịch bản lỗi / biên. |

---

## 7. Tiêu Chí Nghiệm Thu Kỹ Thuật (Acceptance Criteria)
Liệt kê các tiêu chuẩn định lượng bắt buộc để nghiệm thu bản thiết kế khi chuyển sang code:
- Độ trễ phản hồi UI < 200ms.
- 100% test suites trong ma trận kiểm thử đạt trạng thái PASS.
- Không phát sinh lỗi `[DESIGN_DEFECT]` chưa được ghi nhận và cập nhật.
```

---

## 3. Bảng Tiêu Chí Đánh Giá Chất Lượng Thiết Kế (Design Quality Gate)

Trước khi chuyển một bản thiết kế sang giai đoạn lập trình (Implementation), AI Thiết Kế hoặc Kỹ Sư phải tự kiểm tra theo Checklist 10 điểm sau:

| STT | Tiêu Chí Kiểm Tra (Checklist) | Yêu Cầu Đạt Chuẩn | Trạng Thái |
| :-: | :--- | :--- | :---: |
| 1 | **Không có code mẫu** | Toàn bộ tài liệu viết bằng ngôn ngữ tự nhiên, không có snippet code mẫu nào. | Đạt / Chưa |
| 2 | **Ranh giới Webview sạch** | Không yêu cầu Webview gọi bất kỳ API hệ điều hành hay module Node.js nào. | Đạt / Chưa |
| 3 | **Ủy thác Git CLI an toàn** | 100% lệnh ghi gọi qua `git.exe`, luôn có cờ `--`, không ghi trực tiếp `.git/`. | Đạt / Chưa |
| 4 | **Tương thích đa phiên bản** | Có cơ chế fallback cho các bản Git < 2.23 nếu dùng tính năng mới. | Đạt / Chưa |
| 5 | **Đầy đủ hợp đồng RPC** | Mọi action/query đều có bảng mô tả payload, response và mã lỗi rõ ràng. | Đạt / Chưa |
| 6 | **Tương thích Preact Signals**| Cấu trúc state phân định rõ tín hiệu gốc (`signal`) và tín hiệu tính toán (`computed`). | Đạt / Chưa |
| 7 | **Đồng bộ Token Cyber-Lab** | Màu sắc, badge, đinh tán góc `+` tuân thủ bảng mã Cyber-Lab cả Dark & Light mode. | Đạt / Chưa |
| 8 | **Hover-to-Reveal rõ ràng** | Các nút tác vụ phụ được quy định ẩn khi tĩnh, chỉ hiện khi rê chuột. | Đạt / Chưa |
| 9 | **Bảo toàn hình học SVG** | Tính năng mới không can thiệp vào kích thước, tọa độ các node đồ thị cũ. | Đạt / Chưa |
| 10 | **Có ma trận Unit Test** | Đã liệt kê chi tiết từng kịch bản kiểm thử cho từng component trong ma trận. | Đạt / Chưa |

*Chỉ khi đạt đủ 10/10 tiêu chí trên, tài liệu thiết kế mới được phê duyệt để bắt đầu triển khai mã nguồn.*
