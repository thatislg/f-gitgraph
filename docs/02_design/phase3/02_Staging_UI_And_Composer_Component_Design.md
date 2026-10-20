# 02. Thiết Kế Giao Diện Staging Area & Commit Composer (UI Component Architecture & Visual Specifications)

Tài liệu này đặc tả chi tiết kiến trúc tầng Giao diện Webview, hệ thống cấu trúc thành phần giao diện, ngôn ngữ thẩm mỹ kỹ thuật số Cyber-Lab với đinh tán chữ thập góc (`+`), và các quy tắc tương tác người dùng phục vụ cho **Milestone 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào kiến trúc giao diện, quy chuẩn thẩm mỹ, hành vi thị giác và luồng trải nghiệm người dùng; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
>
> 📌 **GitHub Tracking**: [Epic #23 - Cyber-Lab UI &amp; Commit Composer](https://github.com/thatislg/f-gitgraph/issues/23) (Gồm 12 tasks con: [#24](https://github.com/thatislg/f-gitgraph/issues/24) đến [#35](https://github.com/thatislg/f-gitgraph/issues/35))

---

## 1. Cấu Trúc Phân Cấp & Ranh Giới Trách Nhiệm Từng Thành Phần (Component Tree & Contracts)

Giao diện Staging và Bộ soạn thảo Commit được tổ chức theo cấu trúc phân cấp dạng cây (Component Tree) độc lập, bảo đảm nguyên tắc đơn trách nhiệm (Single Responsibility Principle) và khả năng tái sử dụng cao trong toàn bộ Webview:

```
[OverlayInspectorPanel (Bảng Inspector Nổi)]
               │
               ▼
 ┌────────────────────────────────────────────────────────┐
 │ <CornerCrossFrame> (Khung viền đinh tán góc Cyber-Lab) │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
            <StagingArea> (Container Điều Phối Chính)
             ├── <StagingPanel> (Bảng Danh Sách Tệp Biến Động)
             │    ├── Header "Staged Changes (N)" + Nút "Unstage All"
             │    │    └── Danh sách <StagingFileItem (Staged)>
             │    ├── Header "Changes (N)" + Nút "Stage All" & "Discard All"
             │    │    └── Danh sách <StagingFileItem (Unstaged)>
             │    └── <EmptyState> (Hiển thị khi kho sạch sẽ)
             │
             ├── Divider Kỹ Thuật Số (Đường phân cách mỏng 1px)
             │
             └── <CommitComposer> (Khung Soạn Thảo Commit)
                  ├── Ô nhập tiêu đề (Subject) + Bộ đếm thông minh (50 chars)
                  ├── Textarea mô tả chi tiết (Tự co giãn 60px - 160px)
                  ├── Nhóm Checkbox (Amend Commit, Sign GPG/SSH)
                  ├── Cụm nút hành động (Commit chính & Commit & Push)
                  └── Bộ phát âm thanh vi mô (Micro-Acoustics Sound Engine)

 [Lớp Modal Phủ Độc Lập - Khi kích hoạt thao tác hoàn tác]
 <DiscardConfirmModal> bọc trong <CornerCrossFrame (Viền đinh tán đỏ cảnh báo)>
```

### 1.1. Bảng Hợp Đồng Tham Số & Hành Vi Của Từng Component

Mọi component đều trao đổi dữ liệu thông qua hợp đồng tham số (Props & Callbacks) chặt chẽ:

| Tên Component         | Tệp Tin Hiện Thực                                        | Tham Số Đầu Vào (Props/Inputs)                                                                                        | Tác Vụ Phản Hồi (Callbacks/Events)                                                                                             | Trách Nhiệm Nghiệp Vụ Chính                                                                                                                         |
| :-------------------- | :------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CornerCrossFrame`    | `src/webview/components/ui/CornerCrossFrame.tsx`         | - `active`: Logic (bừng sáng đinh tán)- `variant`: Phân loại (`purple` \| `red`)- `children`: Nội dung bọc bên trong  | _(Không có)_                                                                                                                   | Render khung viền mỏng và 4 đinh tán chữ thập góc (`+`), quản lý hiệu ứng phát quang bừng sáng theo trạng thái tiêu điểm.                           |
| `StagingFileItem`     | `src/webview/components/staging/StagingFileItem.tsx`     | - `file`: Bản ghi tệp biến động- `isStaged`: Logic (thuộc phân khu nào)                                               | - `onStage(filePath)`- `onUnstage(filePath)`- `onDiscard(filePath, isUntracked)`- `onDiff(filePath)`                           | Hiển thị 1 dòng tệp: huy hiệu vuông Neon, tên tệp nổi bật, đường dẫn phụ mờ, cụm nút hover-to-reveal và xử lý click xem Diff.                       |
| `StagingPanel`        | `src/webview/components/staging/StagingPanel.tsx`        | Đọc dữ liệu từ `stagingStore`: `stagedFiles`, `unstagedFiles`                                                         | - `onStageAll()`- `onUnstageAll()`- `onDiscardAll()`                                                                           | Quản lý 2 phân khu danh sách tệp, tiêu đề nhóm kèm bộ đếm số lượng, các nút thao tác hàng loạt và giao diện Empty State.                            |
| `CommitComposer`      | `src/webview/components/staging/CommitComposer.tsx`      | Đọc dữ liệu từ `stagingStore`: `commitSubject`, `commitDescription`, `isAmend`, `isSign`, `canCommit`, `isCommitting` | - `onCommit()`- `onCommitAndPush()`- `onSubjectChange(text)`- `onDescriptionChange(text)`- `onToggleAmend()`- `onToggleSign()` | Quản lý ô nhập tiêu đề kèm bộ đếm 50 ký tự 3 mức màu, khung textarea mô tả tự co giãn, các checkbox nâng cao, nút commit động và phím tắt toàn cục. |
| `DiscardConfirmModal` | `src/webview/components/staging/DiscardConfirmModal.tsx` | - `isOpen`: Logic hiển thị- `targetFile`: Tên tệp cần hủy (nếu có)- `isAll`: Logic hủy toàn bộ kho                    | - `onConfirm()`- `onCancel()`                                                                                                  | Hộp thoại modal cảnh báo an toàn chống mất mã nguồn, bọc trong đinh tán đỏ cảnh báo, bắt phím `Esc` và bẫy focus bàn phím an toàn.                  |
| `StagingArea`         | `src/webview/components/staging/StagingArea.tsx`         | _(Không có tham số ngoài)_                                                                                            | Tự động kết nối với WebviewBridge                                                                                              | Thùng chứa tích hợp cao nhất, bọc toàn bộ khối StagingPanel và CommitComposer bên trong `CornerCrossFrame`.                                         |

---

## 2. Ngôn Ngữ Thẩm Mỹ Cyber-Lab, Bảng Token Màu Sắc & Hiệu Ứng Vi Mô

Thiết kế kế thừa triết lý Cyber-Lab của F-GitGraph: kết hợp giữa tính cơ học chuẩn xác của phần cứng phòng thí nghiệm với sự thanh lịch của giao diện kỹ thuật số hiện đại.

### 2.1. Quy Chuẩn Đinh Tán Chữ Thập Góc (`CornerCrossFrame`)

1. **Vị Trí Tọa Độ & Cấu Trúc Đinh Tán**:
   - Bốn ký tự chữ thập (`+`) được đặt tại đúng 4 góc vuông của khung chữ nhật.
   - Sử dụng phông chữ đơn khoảng cách (Monospace font: `JetBrains Mono`, `Fira Code`, hoặc phông mặc định của VS Code), kích thước chữ chính xác **11px**, chiều cao dòng bằng 1.
   - Vị trí định vị tuyệt đối (Absolute Positioning) với độ lệch tọa độ: lùi ra ngoài đúng **6px** theo cả hai trục ngang và dọc (`top: -6px`, `left: -6px` cho góc trên-trái). Nhờ đó, tâm của ký tự `+` trùng khít hoàn hảo với giao điểm của hai đường viền khung.
   - Thuộc tính bắt buộc: `user-select: none` và `pointer-events: none` để đinh tán không cản trở thao tác bấm chuột hoặc bôi đen văn bản bên trong.
2. **Quy Chuẩn Chuyển Đổi Trạng Thái Phát Quang (Glow States)**:
   - **Trạng thái Chờ (Idle State)**: Khi người dùng đang tương tác với vùng đồ thị hoặc các thành phần khác, 4 đinh tán góc hiển thị ở tông màu xám kỹ thuật mờ (độ mờ 50%).
   - **Trạng thái Rê Chuột (Hover State)**: Khi con trỏ chuột di chuyển vào vùng khung, độ mờ tăng mượt mà lên 80% trong thời gian 150ms.
   - **Trạng thái Tiêu Điểm / Kích Hoạt (Focused / Active State)**: Khi người dùng nhấp chuột vào bên trong khung hoặc đặt con trỏ vào ô soạn thảo commit, cả 4 đinh tán góc lập tức bừng sáng với sắc tím Neon (`#a855f7`) ở độ sáng 100%, đồng thời kích hoạt hiệu ứng đổ bóng phát quang lan tỏa (`filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))`).
3. **Bảng Token Màu Sắc Kỹ Thuật (Design Tokens)**:

| Yếu Tố Thị Giác            | Chế Độ Tối (Dark Theme Token)                        | Chế Độ Sáng (Light Theme Token)                           |
| :------------------------- | :--------------------------------------------------- | :-------------------------------------------------------- |
| Nền Khung Làm Việc         | `rgba(24, 24, 27, 0.45)` (Xám than bán trong suốt)   | `rgba(255, 255, 255, 0.85)` (Trắng sứ bán trong suốt)     |
| Viền Mỏng Khung Bọc        | `1px solid rgba(63, 63, 70, 0.5)` (Xám chì kim loại) | `1px solid rgba(228, 228, 231, 0.8)` (Xám bạc thanh lịch) |
| Đinh Tán Trạng Thái Idle   | `#71717a` ở độ mờ 50%                                | `#a1a1aa` ở độ mờ 50%                                     |
| Đinh Tán Active (Tím Neon) | `#a855f7` kèm vầng sáng tỏa 6px tím                  | `#7c3aed` kèm vầng sáng tỏa 4px tím thẫm                  |
| Đinh Tán Cảnh Báo (Modal)  | `#ef4444` kèm vầng sáng tỏa 6px đỏ                   | `#dc2626` kèm vầng sáng tỏa 4px đỏ thẫm                   |

---

### 2.2. Triết Lý Tránh Rối Mắt Của GitLens: Cơ Chế "Hover-to-Reveal Actions"

1. **Vấn Đề Gây Mệt Mỏi Thị Giác Trong Các Extension Truyền Thống**:
   - Khi bảng tệp có 20-30 tệp biến động, nếu dòng nào cũng hiện đầy đủ các nút (Stage, Diff, Discard), giao diện sẽ tràn ngập hàng chục icon dày đặc, gây nhiễu loạn thị giác và làm giảm sự tập trung vào nội dung mã nguồn.
2. **Giải Pháp "Hover-to-Reveal" Của F-GitGraph**:
   - Ở trạng thái bình thường (mặc định): Mỗi dòng tệp chỉ hiển thị 2 thành phần duy nhất: Huy hiệu trạng thái chữ cái vuông và Tên tệp tin kèm đường dẫn phụ mờ. Cụm nút tác vụ ở mép phải có độ mờ bằng 0 (`opacity: 0`).
   - Khi con trỏ chuột rê lên dòng tương ứng: Cụm nút tác vụ chuyển đổi độ mờ từ 0 lên 100% (`opacity: 1`) mượt mà qua chuyển động chuyển tiếp vi mô (Transition: `opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)`).
   - Quy cách nút thao tác nhanh: Kích thước chuẩn **22px x 22px**, bo góc vi mô **3px**, căn giữa hoàn hảo. Khi rê chuột lên nút, nền nút chuyển sang tông màu xám mờ bán trong suốt (`rgba(255, 255, 255, 0.08)` trên nền tối), tạo phản hồi cơ học chính xác.

---

### 2.3. Quy Chuẩn Huy Hiệu Vuông Trạng Thái Neon ($18\text{px} \times 18\text{px}$)

Mỗi tệp tin biến động được định danh bằng một huy hiệu hình vuông chuẩn xác nằm ở đầu dòng:

- **Kích thước**: Đúng $18\text{px} \times 18\text{px}$, bo góc nhẹ vi mô 3px (`border-radius: 3px`).
- **Phông chữ**: Ký tự đơn khoảng cách in hoa (Monospace), kích thước chữ **10px**, độ dày nét chữ đậm (`font-weight: 700`), căn giữa tuyệt đối theo cả hai chiều ngang và dọc.
- **Bảng Ánh Xạ Màu Sắc Huy Hiệu**:

|  Ký Tự  | Trạng Thái Nghiệp Vụ                 | Màu Nền Chế Độ Tối (Dark)      | Màu Nền Chế Độ Sáng (Light) |      Màu Chữ      |
| :-----: | :----------------------------------- | :----------------------------- | :-------------------------- | :---------------: |
| **`A`** | Added (Tệp mới thêm vào Staging)     | `#10b981` (Xanh lục Neon)      | `#059669` (Xanh lục ngọc)   | Trắng (`#ffffff`) |
| **`M`** | Modified (Tệp có sửa đổi nội dung)   | `#f59e0b` (Vàng hổ phách Neon) | `#d97706` (Vàng cam đậm)    | Trắng (`#ffffff`) |
| **`D`** | Deleted (Tệp bị xóa bỏ)              | `#ef4444` (Đỏ Neon cảnh báo)   | `#dc2626` (Đỏ thẫm)         | Trắng (`#ffffff`) |
| **`R`** | Renamed (Tệp được đổi tên/di chuyển) | `#a855f7` (Tím Neon công nghệ) | `#9333ea` (Tím đậm)         | Trắng (`#ffffff`) |
| **`U`** | Untracked (Tệp mới chưa theo dõi)    | `#64748b` (Xám chì kỹ thuật)   | `#475569` (Xám đen)         | Trắng (`#ffffff`) |

---

## 3. Đặc Tả Bố Cục Không Gian & Chi Tiết Từng Khối Giao Diện

### 3.1. Bố Cục Tổng Thể Vùng Làm Việc (ASCII Wireframe Chi Tiết)

```
+──────────────────────────────────────────────────────────────────────────+
│ + STAGING & COMMIT WORKSPACE                                           + │
│                                                                          │
│ 📝 STAGED CHANGES (2)                                   [- Unstage All]  │
│  ├─ [M] App.tsx                 src/webview/                  [ - | ↺ ]  │
│  └─ [A] StorageReader.fs        src/core-engine/Storage/      [ - | ↺ ]  │
│                                                                          │
│ 📁 CHANGES (3)                                          [+ Stage All]    │
│  ├─ [M] gitCliMutator.ts        src/extension/mutator/        [ + | 🗑 ]  │
│  ├─ [D] oldRenderer.ts          src/legacy/                   [ + | 🗑 ]  │
│  └─ [U] soundEngine.ts          src/audio/                    [ + | 🗑 ]  │
│                                                                          │
│ ──────────────────────────────────────────────────────────────────────── │
│ ✍️ COMMIT COMPOSER                                                       │
│ ┌──────────────────────────────────────────────────────────┬───────────┐ │
│ │ Commit message (Ctrl+Enter to commit)...                 │  (34/50)  │ │
│ ├──────────────────────────────────────────────────────────┴───────────┤ │
│ │ Optional extended description (Markdown supported)...                │ │
│ │                                                                      │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ [ ] Amend previous commit         [x] Sign commit (GPG)                  │
│                                                                          │
│ [ Button: Commit 2 files ]                      [ Button: Commit & Push] │
│ +                                                                      + │
+──────────────────────────────────────────────────────────────────────────+
```

---

### 3.2. Bảng Hiển Thị Tệp Biến Động (`StagingPanel` & `StagingFileItem`)

1. **Cấu Trúc Hàng Tệp Tin (`StagingFileItem`)**:
   - Chiều cao dòng tệp: Chuẩn **28px**, lề trong (padding) `2px 8px`.
   - Bố cục hàng theo chiều ngang (Flex Row):
     - Bên trái: Huy hiệu vuông $18\text{px} \times 18\text{px}$ cố định, cách lề phải 8px.
     - Ở giữa (Vùng tên tệp & đường dẫn):
       - Tên tệp tin (ví dụ: `App.tsx`): Kích thước chữ `13px`, trọng số nét chữ trung bình (`font-medium`), màu chữ sáng chính.
       - Đường dẫn thư mục phụ (ví dụ: `src/webview/`): Đặt ngay sau tên tệp, kích thước chữ `11px`, phông chữ monospace, màu chữ xám mờ (độ mờ 60%). Khi chiều ngang bảng bị co hẹp, áp dụng cơ chế tự động cắt ngắn bằng dấu ba chấm (`text-overflow: ellipsis`) lên đường dẫn phụ trước, ưu tiên giữ trọn vẹn tên tệp tin chính.
     - Bên phải (Cụm nút tác vụ Hover-to-Reveal):
       - _Đối với tệp Staged_: Nút Unstage (`-`) có chú thích tooltip _"Unstage changes"_; nút Discard (`↺`) có tooltip _"Discard changes"_.
       - _Đối với tệp Unstaged_: Nút Stage (`+`) có tooltip _"Stage changes"_; nút Discard (`🗑` cho tệp Untracked hoặc `↺` cho tệp Modified/Deleted) có tooltip _"Discard changes"_.
2. **Tương Tác Xem So Sánh Vi Sai (Diff View)**:
   - Khi lập trình viên nhấp chuột đơn hoặc nhấp đúp vào bất kỳ vị trí nào trên dòng tệp (ngoại trừ cụm nút thao tác bên phải): Hệ thống phát tín hiệu yêu cầu mở màn hình so sánh vi sai của VS Code (`vscode.diff`).
   - Màn hình diff mở ra tab so sánh hai cột chuẩn giữa phiên bản làm việc hiện tại và phiên bản trong chỉ mục Staging Index (hoặc giữa Staging Index với commit HEAD).
3. **Thanh Tiêu Đề Phân Khu & Thao Tác Hàng Loạt (Bulk Actions)**:
   - Phân khu trên: Tiêu đề `"STAGED CHANGES"` kèm huy hiệu tròn hiển thị số lượng tệp hiện có. Mép phải chứa nút văn bản hành động `"Unstage All"` (mang biểu tượng `-`).
   - Phân khu dưới: Tiêu đề `"CHANGES"` kèm số lượng tệp biến động. Mép phải chứa nút `"Stage All"` (biểu tượng `+`) và nút `"Discard All"` (biểu tượng `↺`).
   - Trạng thái trống (Empty State): Khi một phân khu không có tệp nào, hiển thị một dòng thông báo tinh tế ở tông xám mờ: _"No staged changes"_ hoặc _"Working tree clean"_.

---

### 3.3. Bộ Soạn Thảo Commit Chuyên Nghiệp (`CommitComposer`)

1. **Khung Nhập Tiêu Đề Commit (Subject Input)**:
   - Ô nhập văn bản một dòng, chiều cao chuẩn **34px**, lề trong `6px 10px`, bo góc nhẹ 4px.
   - Placeholder gợi ý phím tắt trực quan: _"Commit message (Ctrl+Enter to commit)..."_.
   - Viền khung bình thường là xám mỏng kim loại; khi người dùng nhấp tiêu điểm vào ô nhập (Focus), viền chuyển sang màu tím Neon (`#a855f7`) kèm vầng phát quang mềm mại xung quanh (`box-shadow: 0 0 6px rgba(168, 85, 247, 0.4)`).
2. **Bộ Đếm 50 Ký Tự Thông Minh (Smart 50-Char Counter)**:
   - Đặt cố định ở góc trên bên phải của ô nhập tiêu đề, định dạng hiển thị: `(độ_dài / 50)`.
   - **Quy tắc chuyển đổi 3 mức màu cảnh báo**:
     - _Từ 0 đến 50 ký tự_: Chữ màu xám bạc kỹ thuật mờ (`#71717a` trên Dark / `#a1a1aa` trên Light). Đạt chuẩn quy ước quốc tế về độ dài tóm tắt commit của Git.
     - _Từ 51 đến 72 ký tự_: Tự động đổi sang màu vàng hổ phách (`#f59e0b` trên Dark / `#d97706` trên Light). Cảnh báo tiêu đề bắt đầu dài và có nguy cơ bị cắt ngắn trong một số trình xem log git dòng lệnh.
     - _Vượt quá 72 ký tự_: Tự động đổi sang màu đỏ hồng Neon (`#ef4444` trên Dark / `#dc2626` trên Light). Cảnh báo nghiêm khắc rằng tiêu đề quá dài, nhắc nhở lập trình viên rút ngắn tóm tắt và đưa các chi tiết xuống ô mô tả bên dưới.
3. **Khung Nhập Mô Tả Mở Rộng Nhiều Dòng (Extended Body Textarea)**:
   - Ô nhập văn bản nhiều dòng phục vụ giải thích ngữ cảnh, danh sách thay đổi hoặc tài liệu tham khảo (hỗ trợ định dạng văn bản Markdown chuẩn).
   - **Cơ chế tự động co giãn chiều cao (Auto-Grow Textarea)**:
     - Chiều cao tối thiểu khi rỗng hoặc gõ 1-2 dòng: **60px**.
     - Khi nội dung dài ra: Chiều cao tự động dãn theo nội dung văn bản cho đến ngưỡng tối đa **160px**.
     - Khi vượt quá 160px: Khóa chiều cao cố định và xuất hiện thanh cuộn mỏng kỹ thuật số (độ rộng thanh cuộn 4px, màu xám than bán trong suốt) để không chiếm dụng diện tích của các thành phần khác.
4. **Nhóm Tùy Chọn Nâng Cao (Checkboxes)**:
   - Thiết kế Checkbox Cyber hình vuông kích thước **14px x 14px**, bo góc vi mô 2px. Khi được tích chọn, hiển thị dấu kiểm màu tím Neon sắc nét trên nền tối.
   - **Tùy chọn "Amend previous commit"**:
     - Khi lập trình viên tích chọn: Hệ thống tự động gửi yêu cầu lên Backend lấy thông điệp của commit đỉnh HEAD điền sẵn vào ô tiêu đề và mô tả.
     - Khi bỏ tích: Khôi phục lại nội dung nháp người dùng đang soạn thảo dở trước đó.
   - **Tùy chọn "Sign commit (GPG/SSH)"**:
     - Bật/tắt cờ ký số an toàn. Trạng thái mặc định được đồng bộ tự động theo cấu hình toàn cục `.gitconfig`.
5. **Cụm Nút Hành Động Thực Thi & Phím Tắt Toàn Cục**:
   - **Nút Hành Động Chính (`Commit`)**:
     - Chiều cao chuẩn 32px, nền dải màu tím Neon công nghệ (`linear-gradient(135deg, #a855f7, #7c3aed)`), chữ trắng in đậm (`font-semibold`).
     - Khi rê chuột qua: Tăng cường độ phát sáng vầng hào quang (`box-shadow: 0 0 12px rgba(168, 85, 247, 0.5)`).
     - Khi bấm chuột xuống: Thu nhỏ nhẹ tỷ lệ 0.98 tạo cảm giác phản hồi cơ học chính xác.
     - Nhãn nút hiển thị động số lượng tệp sẽ commit: `Commit 3 files` (hoặc `Amend commit`).
     - _Trạng thái vô hiệu hóa (Disabled State)_: Bị mờ đi ở độ mờ 40%, con trỏ chuột hiển thị biểu tượng cấm (`cursor: not-allowed`), không phản hồi click khi chưa đủ điều kiện.
   - **Nút Hành Động Kép (`Commit & Push`)**:
     - Nút phụ nằm cạnh nút chính, nền trong suốt, viền mỏng tím Neon. Thực hiện ghi commit vào kho cục bộ và tự động gọi lệnh push lên remote tracking branch.
   - **Phím Tắt Kích Hoạt Toàn Cục**:
     - Lắng nghe sự kiện bàn phím trên toàn bộ phân vùng soạn thảo: Nhấn tổ hợp phím **`Ctrl + Enter`** (trên Windows và Linux) hoặc **`Cmd + Enter`** (trên macOS) để kích hoạt commit tức thì.
6. **Bộ Phản Hồi Âm Thanh Vi Mô (Micro-Acoustics Sound Feedback)**:
   - Khi commit thành công, kích hoạt âm thanh chốt cơ khí (Mechanical latch click) thông qua Web Audio API không cần nạp tệp âm thanh ngoài.
   - Tạo bởi 2 bộ dao động sóng sine tần số cao (khoảng 1200Hz và 850Hz) kèm phong bì biên độ suy giảm lũy thừa cực nhanh (15 mili-giây), mang lại cảm giác chốt khóa cơ học cao cấp, thỏa mãn thính giác của lập trình viên.

---

## 4. Kiến Trúc Quản Lý Trạng Thái Bằng Preact Signals (`staging.store.ts`)

Toàn bộ dữ liệu của phân vùng Staging được quản lý tập trung theo mô hình phản ứng dữ liệu (Fine-Grained Reactive Signals) trong module `src/webview/lib/stores/staging.store.ts`:

### 4.1. Bảng Danh Mục Tín Hiệu Cơ Sở (Base Signals)

| Tên Tín Hiệu (Signal) | Kiểu Dữ Liệu                                                                             | Giá Trị Mặc Định    | Mục Đích Lưu Trữ                                                                            |
| :-------------------- | :--------------------------------------------------------------------------------------- | :------------------ | :------------------------------------------------------------------------------------------ |
| `stagedFiles`         | `Signal<StagedFileRecord[]>`                                                             | `[]` (Mảng rỗng)    | Danh sách các tệp hiện đang nằm trong Staging Index.                                        |
| `unstagedFiles`       | `Signal<UnstagedFileRecord[]>`                                                           | `[]` (Mảng rỗng)    | Danh sách các tệp biến động chưa đưa vào Staging trên đĩa làm việc.                         |
| `commitSubject`       | `Signal<string>`                                                                         | `""` (Chuỗi rỗng)   | Chuỗi tiêu đề tóm tắt commit do người dùng nhập.                                            |
| `commitDescription`   | `Signal<string>`                                                                         | `""` (Chuỗi rỗng)   | Chuỗi mô tả chi tiết mở rộng nhiều dòng.                                                    |
| `isAmend`             | `Signal<boolean>`                                                                        | `false`             | Trạng thái bật/tắt chế độ sửa đổi commit gần nhất.                                          |
| `isSign`              | `Signal<boolean>`                                                                        | `false`             | Trạng thái bật/tắt cờ ký số điện tử GPG/SSH.                                                |
| `isCommitting`        | `Signal<boolean>`                                                                        | `false`             | Cờ bật lên khi tiến trình commit đang chạy ngầm, dùng để vô hiệu hóa nút bấm chống bấm đúp. |
| `discardModalTarget`  | `Signal<{ isOpen: boolean, filePath?: string, isUntracked?: boolean, isAll?: boolean }>` | `{ isOpen: false }` | Quản lý trạng thái mở/đóng và tham số mục tiêu của hộp thoại cảnh báo an toàn Discard.      |

---

### 4.2. Bảng Chân Trị Tín Hiệu Dẫn Xuất (Computed Signals)

Các giá trị dẫn xuất tự động tính toán lại tức thì khi các tín hiệu cơ sở biến động:

1. **Điều Kiện Sẵn Sàng Commit (`canCommit: Computed<boolean>`)**:
   Bảng chân trị quyết định trạng thái bật/tắt nút bấm Commit:

| Điều Kiện Số Lượng Tệp Staged | Độ Dài Tiêu Đề (`commitSubject`) | Cờ Chế Độ `isAmend` | Cờ `isCommitting` | Giá Trị `canCommit` | Trạng Thái Nút Bấm                        |
| :---------------------------: | :------------------------------: | :-----------------: | :---------------: | :-----------------: | :---------------------------------------- |
|           $> 0$ tệp           |       Có ký tự (khác rỗng)       |       `false`       |      `false`      |     **`true`**      | **Sẵn sàng bấm được**                     |
|           $> 0$ tệp           |               Rỗng               |       Bất kỳ        |      `false`      |     **`false`**     | Vô hiệu hóa (Thiếu tiêu đề)               |
|           $= 0$ tệp           |             Có ký tự             |       `false`       |      `false`      |     **`false`**     | Vô hiệu hóa (Chưa stage tệp nào)          |
|         **$= 0$ tệp**         |           **Có ký tự**           |     **`true`**      |    **`false`**    |     **`true`**      | **Sẵn sàng (Amend không cần staged mới)** |
|            Bất kỳ             |              Bất kỳ              |       Bất kỳ        |      `true`       |     **`false`**     | Vô hiệu hóa (Đang bận thực thi)           |

2. **Các Tín Hiệu Tính Toán Khác**:
   - `stagedCount: Computed<number>`: Trả về `stagedFiles.value.length`.
   - `unstagedCount: Computed<number>`: Trả về `unstagedFiles.value.length`.
   - `subjectCounterColor: Computed<string>`: Trả về mã màu cảnh báo dựa trên độ dài chuỗi tiêu đề (Xám nếu $\le 50$, Vàng nếu $51 - 72$, Đỏ nếu $> 72$).
   - `commitButtonLabel: Computed<string>`: Trả về chuỗi hiển thị động trên nút chính (ví dụ: _"Amend commit"_ khi `isAmend` bật, hoặc _"Commit 3 files"_ khi có 3 tệp staged).
   - `canAmend: Computed<boolean>`: Điều kiện logic cho phép bật/tắt chế độ Amend, trả về `true` khi `commitHead !== null && !(upstreamBranch !== null && aheadCount === 0)`.
   - `amendDisabledReason: Computed<string | undefined>`: Chuỗi thông điệp giải thích lý do vô hiệu hóa checkbox Amend để gán vào thuộc tính `title` (tooltip) của phần tử DOM.

3. **Bảng Chân Trị Trạng Thái An Toàn Của Chế Độ Amend (`canAmend`)**:

| `commitHead` (Hash HEAD) | `upstreamBranch` (Nhánh Remote) | `aheadCount` (Số commit chưa push) | Giá Trị `canAmend` | Trạng Thái Checkbox & Chú Thích Tooltip (`title`)                                        |
| :----------------------: | :-----------------------------: | :--------------------------------: | :----------------: | :--------------------------------------------------------------------------------------- |
|         `null`           |             Bất kỳ              |               Bất kỳ               |    **`false`**     | **Vô hiệu hóa (`disabled`)**: _"Cannot amend: Repository has no commits yet"_            |
|       Có mã băm SHA      |           Khác `null`           |               $= 0$                |    **`false`**     | **Vô hiệu hóa (`disabled`)**: _"Cannot amend: Latest commit has already been pushed to remote"_ |
|       Có mã băm SHA      |           Khác `null`           |               $> 0$                |     **`true`**     | **Kích hoạt (Bình thường)**: Cho phép Amend an toàn vì có commit cục bộ chưa push        |
|       Có mã băm SHA      |             `null`              |               Bất kỳ               |     **`true`**     | **Kích hoạt (Bình thường)**: Cho phép Amend an toàn vì chưa có upstream remote           |

---

### 4.3. Danh Mục Các Hàm Điều Phối Hành Động Của Store (Store Action Dispatchers)

Mọi tương tác từ UI đều thông qua các hàm hành động tập trung trong Store để gửi thông điệp xuống Backend qua WebviewBridge:

- `loadStatus(statusResult)`: Nhận gói `WorkspaceStatusResult` từ Backend và cập nhật đồng thời cả hai tín hiệu `stagedFiles` và `unstagedFiles`.
- `stage(filePath)`: Gửi thông điệp `stageFile` kèm đường dẫn tệp.
- `unstage(filePath)`: Gửi thông điệp `unstageFile` kèm đường dẫn tệp.
- `stageAll()`: Gửi thông điệp `stageAll`.
- `unstageAll()`: Gửi thông điệp `unstageAll`.
- `openDiscardModal(filePath, isUntracked, isAll)`: Cập nhật `discardModalTarget.value = { isOpen: true, filePath, isUntracked, isAll }`.
- `closeDiscardModal()`: Đặt lại `discardModalTarget.value = { isOpen: false }`.
- `confirmDiscard()`: Đọc tham số từ `discardModalTarget`, gửi thông điệp `discardFileChanges` hoặc `discardAllChanges` tương ứng xuống Backend, sau đó đóng modal.
- `commit()`: Kiểm tra `canCommit.value === true`, đặt `isCommitting.value = true`, gửi thông điệp `commitChanges` với 4 tham số (tiêu đề, mô tả, amend, sign). Khi nhận phản hồi thành công, làm sạch tiêu đề và mô tả, phát âm thanh vi mô, và đặt lại `isCommitting.value = false`.
- `commitAndPush()`: Tương tự hàm commit, sau khi hoàn tất tự động kích hoạt thêm lệnh push lên remote tracking branch.
- `setAmend(value: boolean)`: Đổi trạng thái `isAmend`. Nếu `value === true` nhưng `canAmend.value === false`, hàm lập tức thoát an toàn để ngăn chặn kích hoạt ngoài luồng. Khi bật hợp lệ: lưu bản nháp hiện tại và nạp thông điệp commit HEAD; khi tắt: hoàn trả bản nháp.

---

## 5. Quy Trình Xác Nhận An Toàn Khi Hoàn Tác (`DiscardConfirmModal.tsx`)

> [!CAUTION]
> Thao tác hoàn tác thay đổi (`git restore` hoặc `git clean`) sẽ xóa vĩnh viễn dữ liệu chưa commit khỏi đĩa cứng và **không thể phục hồi qua `git reflog`**.

Để bảo vệ an toàn tối đa cho mã nguồn của lập trình viên, hệ thống áp dụng cơ chế bẫy an toàn 3 lớp:

```
[Bấm nút Discard trên dòng tệp hoặc Discard All]
                       │
                       ▼
 ┌─────────────────────────────────────────────────────────┐
 │ Hiển thị <DiscardConfirmModal>                          │
 │ (Khung CornerCrossFrame với 4 đinh tán ĐỎ cảnh báo)     │
 │ ├─ Tiêu đề cảnh báo nguy hiểm hình tam giác đỏ          │
 │ ├─ Tên tệp tin cần xóa được in đậm rõ ràng              │
 │ ├─ Thông điệp: "Permanent data loss. Cannot be undone." │
 │ ├─ [Nút Cancel] (Ưu tiên tiêu điểm mặc định - Phím Esc) │
 │ └─ [Nút Discard] (Nền đỏ cảnh báo)                      │
 └─────────────────────────┬───────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
       [Bấm Cancel / Esc]        [Bấm Discard]
             │                           │
             ▼                           ▼
    (Đóng Modal an toàn,         (Gửi lệnh xóa xuống
     không chạm vào đĩa)          Backend GitCliMutator)
```

1. **Lớp 1: Khung Viền Đinh Tán Đỏ Cảnh Báo (`variant: 'red'`)**:
   - Khi Modal mở ra, toàn bộ màn hình phía sau bị phủ một lớp màn mờ bán trong suốt (`rgba(0, 0, 0, 0.65)` kèm hiệu ứng làm mờ nền `backdrop-filter: blur(2px)`).
   - Hộp thoại nổi bật ở chính giữa màn hình, bọc trong `CornerCrossFrame` với 4 đinh tán góc phát sáng sắc đỏ cảnh báo rực rỡ (`#ef4444` kèm hào quang đỏ), ngay lập tức đánh thức sự chú ý của người dùng về hành động nguy hiểm.
2. **Lớp 2: Kiểm Soát Bàn Phím Toàn Diện (Keyboard Trapping & Safety Defaults)**:
   - **Phím `Esc`**: Lập tức đóng Modal an toàn mà không thực hiện bất kỳ hành động nào.
   - **Tiêu điểm mặc định (Default Focus)**: Khi hộp thoại mở ra, tiêu điểm tự động rơi vào **Nút Cancel** (thay vì nút Discard). Nếu người dùng vô tình bấm phím `Enter` hoặc phím cách (Space), hành động được kích hoạt là **Hủy Bỏ (Cancel)**, loại trừ triệt để nguy cơ xóa nhầm mã nguồn do lỡ tay nhấn phím.
3. **Lớp 3: Xác Nhận Rõ Ràng Phạm Vi Xóa Dữ Liệu**:
   - Nếu hoàn tác một tệp đơn lẻ: Hộp thoại hiển thị chính xác tên tệp tin và đường dẫn thư mục cần xóa: _"Are you sure you want to discard all changes in 'src/app.ts'?"_.
   - Nếu hoàn tác toàn bộ kho (Discard All): Hộp thoại hiển thị thông điệp cảnh báo cấp độ cao nhất: _"Are you sure you want to discard ALL uncommitted changes in the repository? All untracked files will be permanently deleted."_.

---

## 6. Chiến Lược Kiểm Thử Giao Diện & Tiêu Chuẩn Nghiệm Thu UI Component

Để đảm bảo tầng UI hoạt động ổn định và chính xác tuyệt đối trước khi tích hợp vào đồ thị DAG, hệ thống thiết lập bộ kiểm thử độc lập cho từng component:

### 6.1. Ma Trận Kiểm Thử Đơn Vị (UI Unit Testing Matrix)

| Tệp Kiểm Thử Độc Lập           | Component Mục Tiêu    | Các Kịch Bản Kiểm Thử Bắt Buộc                                                                                                                                                                                                                                                                                                                                     |
| :----------------------------- | :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CornerCrossFrame.test.tsx`    | `CornerCrossFrame`    | - Render đúng 4 ký tự `+` tại 4 góc vuông.- Chuyển đổi đúng class màu sắc tím neon khi `active = true` so với `active = false`.- Render màu đỏ cảnh báo khi `variant = 'red'`.- Hiển thị trọn vẹn phần tử con `children`.                                                                                                                                          |
| `StagingFileItem.test.tsx`     | `StagingFileItem`     | - Hiển thị đúng màu nền và ký tự huy hiệu vuông cho cả 5 mã (`A`, `M`, `D`, `R`, `U`).- Cụm nút tác vụ có class ẩn mặc định (`opacity-0`) và class hiển thị khi hover.- Click nút `+` gọi đúng callback `onStage`.- Click nút `-` gọi đúng callback `onUnstage`.- Click nút Discard gọi đúng `onDiscard`.- Click dòng tệp gọi đúng `onDiff`.                       |
| `DiscardConfirmModal.test.tsx` | `DiscardConfirmModal` | - Hiển thị đúng tên tệp trong nội dung cảnh báo.- Nhấn phím `Esc` kích hoạt gọi `onCancel`.- Click nút Cancel kích hoạt gọi `onCancel`.- Click nút Discard kích hoạt gọi `onConfirm`.                                                                                                                                                                              |
| `StagingPanel.test.tsx`        | `StagingPanel`        | - Render đúng số lượng dòng tệp ở cả 2 phân khu Staged và Unstaged.- Click nút "Stage All" gọi đúng hành động stage toàn bộ.- Click nút "Unstage All" gọi đúng hành động unstage toàn bộ.- Hiển thị đúng thông báo Empty State khi danh sách không có tệp biến động.                                                                                               |
| `CommitComposer.test.tsx`      | `CommitComposer`      | - Bộ đếm ký tự hiển thị đúng định dạng `(30/50)` và đổi màu chuẩn xác qua 3 ngưỡng (xám $\rightarrow$ vàng $\rightarrow$ đỏ).- Nút Commit bị disabled khi ô tiêu đề rỗng.- Nút Commit hiển thị đúng số lượng tệp staged (ví dụ: `Commit 3 files`).- Nhấn tổ hợp phím `Ctrl + Enter` kích hoạt gọi hàm commit.- Tích chọn Amend tự động điền nội dung commit trước.- Checkbox Amend bị `disabled` và hiển thị đúng tooltip khi `canAmend = false`.- Checkbox Amend được kích hoạt khi `canAmend = true`. |
| `staging.store.test.ts`        | `stagingStore`        | - Tín hiệu `canCommit` trả về `false` khi danh sách staged rỗng và `isAmend` là `false`.- Tín hiệu `canCommit` trả về `true` khi danh sách staged rỗng NHƯNG `isAmend` là `true` kèm tiêu đề hợp lệ.- Tín hiệu `canCommit` trả về `false` khi `commitSubject` rỗng.- Cập nhật chính xác danh sách tệp khi nhận dữ liệu từ `loadStatus`.- Tín hiệu `canAmend` trả về `false` khi `commitHead === null`.- Tín hiệu `canAmend` trả về `false` khi `upstreamBranch !== null && aheadCount === 0`.- Tín hiệu `canAmend` trả về `true` khi `aheadCount > 0` hoặc chưa có remote tracking. |

---

### 6.2. Tiêu Chuẩn Nghiệm Thu Giao Diện (UI Definition of Done)

1. **Hiển Thị Tương Thích Hoàn Hảo**: Giao diện đạt độ tương phản chuẩn WCAG 2.1 AA trên cả hai chế độ Dark Mode và Light Mode của VS Code.
2. **Không Rối Mắt**: Không hiển thị thường trực ma trận icon tác vụ; cơ chế hover-to-reveal hoạt động mượt mà không gây giật layout.
3. **Phím Tắt Tiện Lợi**: Lập trình viên có thể hoàn thành toàn bộ chu trình soạn thảo và commit chỉ bằng bàn phím (`Ctrl + Enter` để commit, `Esc` để hủy modal).
4. **Độ Phủ Kiểm Thử**: Toàn bộ 6 tệp test component và store đạt trạng thái PASS 100% trên Vitest.

---

## 7. Lịch Sử Chỉnh Sửa & Khắc Phục Khiếm Khuyết Thiết Kế (Revision History)

- **2026-10-15**: Khởi tạo bản đặc tả thiết kế giao diện Staging & Commit Composer.
- **2026-10-20**: Khắc phục `[DESIGN_DEFECT]` — Thiếu cơ chế kiểm soát an toàn khi kích hoạt chế độ Amend:
  - Bổ sung đặc tả kiến trúc **Smart Amend Protection (Hướng 1: Hard Block)** tại Mục 3.3.4 và Mục 4.2.
  - Tích hợp 2 tín hiệu dẫn xuất phản ứng: `canAmend` và `amendDisabledReason` liên kết chặt chẽ với trạng thái `commitHead`, `upstreamBranch` và `aheadCount` của Git Graph.
  - Vô hiệu hóa checkbox Amend khi kho chưa có commit hoặc khi commit HEAD đã được đẩy lên Remote, phòng ngừa triệt để lỗi phân nhánh 1 ahead, 1 behind và lỗi crash dòng lệnh Git CLI.
  - Mở rộng ma trận kiểm thử song hành tại Mục 6.1.
