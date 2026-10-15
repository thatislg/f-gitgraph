# 02. Thiết Kế Giao Diện Staging Area & Commit Composer (UI Component Design)

Tài liệu này đặc tả chi tiết kiến trúc tầng Giao diện Webview (Preact / TailwindCSS), hệ thống component, ngôn ngữ thẩm mỹ Cyber-Lab với đinh tán chữ thập góc (`+`), và các luồng tương tác người dùng cho **Milestone 3.1: Khu Vực Staging & Bộ Soạn Thảo Commit**.

---

## 1. Cấu Trúc Cây Thành Phần Giao Diện (Component Hierarchy)

Khu vực Staging và Soạn thảo Commit được tổ chức theo cấu trúc module rõ ràng, độc lập và dễ tái sử dụng:

```
src/webview/components/staging/
├── StagingArea.tsx                # Container chính bao bọc toàn bộ phân vùng Staging & Composer
├── StagingPanel.tsx               # Bảng hiển thị 2 danh sách Staged Changes và Changes (Unstaged)
├── StagingFileItem.tsx            # Dòng hiển thị từng tệp tin kèm badge trạng thái và hover actions
├── CommitComposer.tsx             # Khung soạn thảo commit, bộ đếm 50 chars, tùy chọn amend/sign
└── CornerCrossFrame.tsx           # Component khung kỹ thuật số với 4 đinh tán chữ thập (+) góc
```

---

## 2. Ngôn Ngữ Thiết Kế Cyber-Lab & Đinh Tán Chữ Thập Góc (`+`)

Kế thừa trực tiếp quy chuẩn từ tài liệu [004_Design_System_And_Visual_Identity.md](../../phase3_Reborn/004_Design_System_And_Visual_Identity.md):

### 2.1. Component Khung Viền Kỹ Thuật Số: `CornerCrossFrame.tsx`

Toàn bộ khối Staging và Composer được đóng khung bởi `CornerCrossFrame`:
- **Đinh tán chữ thập (`+`)**: Đặt chính xác tại 4 góc của khung hình chữ nhật.
- **Tương tác thông minh**:
  - Khi khung đang ở trạng thái bình thường (Idle): Ký hiệu `+` hiển thị màu xám mờ kỹ thuật (`opacity-50`).
  - Khi người dùng click vào vùng làm việc hoặc focus vào ô nhập liệu: 4 đinh tán góc tự động bừng sáng với sắc tím Neon (`#a855f7`), tạo hiệu ứng định vị thị giác tinh tế.

```tsx
// src/webview/components/ui/CornerCrossFrame.tsx
import type { ComponentChildren } from "preact";

type CornerCrossFrameProps = {
  children: ComponentChildren;
  class?: string;
  active?: boolean;
};

export function CornerCrossFrame({ children, class = "", active = false }: CornerCrossFrameProps) {
  const crossColor = active 
    ? "text-purple-400 opacity-100" 
    : "text-zinc-500 opacity-50 group-hover:opacity-80 transition-opacity";

  return (
    <div class={`relative border border-zinc-700/60 bg-zinc-900/40 ${class}`}>
      {/* 4 Đinh tán chữ thập góc (+) */}
      <span class={`absolute -top-1.5 -left-1.5 text-xs font-mono select-none pointer-events-none leading-none ${crossColor}`}>+</span>
      <span class={`absolute -top-1.5 -right-1.5 text-xs font-mono select-none pointer-events-none leading-none ${crossColor}`}>+</span>
      <span class={`absolute -bottom-1.5 -left-1.5 text-xs font-mono select-none pointer-events-none leading-none ${crossColor}`}>+</span>
      <span class={`absolute -bottom-1.5 -right-1.5 text-xs font-mono select-none pointer-events-none leading-none ${crossColor}`}>+</span>

      {children}
    </div>
  );
}
```

### 2.2. Khắc Phục Nhược Điểm Rối Mắt Của GitLens: "Hover-to-Reveal Actions"
- Trên mỗi dòng tệp:
  - Tên tệp và thư mục phụ hiển thị rõ ràng, thoáng mắt.
  - Các nút tác vụ nhanh (Stage `+`, Unstage `-`, Discard ↺) **được ẩn mặc định** (`opacity-0`) và **chỉ hiện ra khi rê chuột lên dòng đó** (`hover:opacity-100`).
  - Nhờ đó, danh sách gồm hàng chục tệp thay đổi trông vẫn phẳng phiu, sạch sẽ và trật tự, không bị rối mắt bởi hàng trăm icon chen chúc như GitLens.

---

## 3. Đặc Tả Chi Tiết Từng Thành Phần

### 3.1. Bảng Hiển Thị Tệp: `StagingPanel.tsx` & `StagingFileItem.tsx`

```
+──────────────────────────────────────────────────────────────────────────+
│ 📝 STAGED CHANGES (2)                                   [- Unstage All]  │
│  ├─ [M] src/webview/App.tsx                             [ - | ↺ ]        │
│  └─ [A] src/core-engine/Storage.fs                      [ - | ↺ ]        │
│                                                                          │
│ 📁 CHANGES (3)                                          [+ Stage All]    │
│  ├─ [M] src/extension/mutator.ts                        [ + | 🗑 ]        │
│  ├─ [D] src/old-code.ts                                 [ + | 🗑 ]        │
│  └─ [U] src/new-experiment.ts                           [ + | 🗑 ]        │
+──────────────────────────────────────────────────────────────────────────+
```

1. **Badge Trạng Thái Vuông Neon ($18\text{px} \times 18\text{px}$)**:
   - `A` (Added): Xanh lục neon `#10b981` (Dark) / `#059669` (Light)
   - `M` (Modified): Vàng cam neon `#f59e0b` (Dark) / `#d97706` (Light)
   - `D` (Deleted): Đỏ hồng neon `#ef4444` (Dark) / `#dc2626` (Light)
   - `R` (Renamed): Tím neon `#a855f7` (Dark) / `#7c3aed` (Light)
   - `U` (Untracked): Xám bạc neon `#94a3b8`
2. **Cấu trúc Dòng Tệp (`StagingFileItem`)**:
   - Bên trái: Badge trạng thái + Tên tệp nổi bật (ví dụ `App.tsx`) + Đường dẫn thư mục phụ mờ phía sau (`src/webview/`).
   - Bên phải: Cụm nút tác vụ chỉ hiện khi hover:
     - Nút Stage (`+`) hoặc Unstage (`-`).
     - Nút Discard (`↺` hoặc `🗑`): Khi click sẽ mở Modal cảnh báo xác nhận.
3. **Tương Tác Xem Diff Vi Sai**:
   - Double-click hoặc click vào tên tệp: Tự động kích hoạt gọi `vscode.diff` để so sánh tệp giữa Working Tree và Index.

---

### 3.2. Bộ Soạn Thảo Commit: `CommitComposer.tsx`

```
+──────────────────────────────────────────────────────────────────────────+
│ ✍️ COMMIT COMPOSER                                                       │
│ ┌──────────────────────────────────────────────────────────┐             │
│ │ Summary message (Required)...                     (42/50)│             │
│ ├──────────────────────────────────────────────────────────┤             │
│ │ Extended description (Optional)...                       │             │
│ │                                                          │             │
│ └──────────────────────────────────────────────────────────┘             │
│ [x] Amend previous commit        [x] Sign commit (GPG)                   │
│                                                                          │
│ [ Button: Commit 2 files (Ctrl+Enter) ]         [ Button: Commit & Push] │
+──────────────────────────────────────────────────────────────────────────+
```

1. **Ô Nhập Tiêu Đề Commit (Subject)**:
   - Chiều cao dòng chuẩn 32px, phông chữ sắc nét.
   - **Bộ đếm ký tự thông minh ở góc phải**:
     - $\le 50$ ký tự: Chữ xám mờ (`text-zinc-400`), báo hiệu độ dài chuẩn mực của Git convention.
     - $51 - 72$ ký tự: Chuyển sang màu vàng hổ phách (`text-amber-400`), cảnh báo tiêu đề bắt đầu dài.
     - $> 72$ ký tự: Chuyển sang màu đỏ neon (`text-rose-500`), cảnh báo tiêu đề quá dài có thể bị cắt ngắn khi xem log.
2. **Ô Nhập Mô Tả Mở Rộng (Body / Description)**:
   - Textarea hỗ trợ nhập liệu nhiều dòng, tự động điều chỉnh chiều cao theo nội dung (tối thiểu 60px, tối đa 160px có scrollbar).
3. **Các Tùy Chọn Checkbox**:
   - **Amend previous commit**: Khi người dùng tích chọn, hệ thống tự động nạp toàn bộ commit message của `HEAD` lên 2 ô nhập liệu để người dùng sửa đổi.
   - **Sign commit (GPG)**: Tích chọn để tự động gắn cờ `-S` khi thực thi lệnh commit.
4. **Các Nút Hành Động**:
   - **Nút `Commit`**:
     - Nền tím Neon `#a855f7`, chữ trắng, hiệu ứng chuyển màu rực rỡ khi hover.
     - Hiển thị số lượng tệp staged sẽ được commit: `Commit 2 files`.
     - Trạng thái vô hiệu hóa (disabled): Khi danh sách Staged rỗng HOẶC ô tiêu đề commit để trống.
   - **Nút `Commit & Push`**:
     - Thực hiện commit xong tự động đẩy lên nhánh tracking trên remote.
   - **Phím tắt**:
     - Hỗ trợ nhấn `Ctrl + Enter` (hoặc `Cmd + Enter` trên macOS) từ bất kỳ ô nhập liệu nào để kích hoạt commit tức thì.

---

## 4. Quản Lý Trạng Thái Bằng Preact Signals

Toàn bộ trạng thái của Staging Area và Commit Composer được quản lý tập trung qua Signal trong `src/webview/lib/stores/staging.store.ts`:

```typescript
import { signal, computed } from "@preact/signals";
import type { StagedFile, UnstagedFile } from "@/types";

export const stagedFiles = signal<StagedFile[]>([]);
export const unstagedFiles = signal<UnstagedFile[]>([]);
export const commitSubject = signal<string>("");
export const commitDescription = signal<string>("");
export const isAmend = signal<boolean>(false);
export const isSign = signal<boolean>(false);
export const isCommitting = signal<boolean>(false);

/** Tự động kiểm tra điều kiện nút Commit có thể bấm được hay không */
export const canCommit = computed(() => {
  const hasFiles = stagedFiles.value.length > 0 || isAmend.value;
  const hasSubject = commitSubject.value.trim().length > 0;
  return hasFiles && hasSubject && !isCommitting.value;
});
```

---

## 5. Hộp Thoại Cảnh Báo An Toàn Khi Hoàn Tác (Discard Confirmation Modal)

> [!CAUTION]
> Thao tác `git restore` sẽ xóa vĩnh viễn các thay đổi chưa commit trên đĩa cứng và không thể khôi phục qua `git reflog`.

- Khi bấm vào nút Discard trên bất kỳ tệp nào:
  - Một hộp thoại Modal xuất hiện ở giữa màn hình đóng khung đinh tán chữ thập góc `+`.
  - Tiêu đề cảnh báo: *"Discard Changes?"*
  - Nội dung: *"Are you sure you want to discard changes in {filePath}? This action cannot be undone."*
  - Nút bấm:
    - `Cancel` (Phím `Esc`)
    - `Discard` (Màu đỏ neon cảnh báo)
