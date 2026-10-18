# 08. Thiết Kế Thanh Tìm Kiếm, Lọc Commit & Điều Hướng Đồ Thị DAG (Search & Filter Design)

Tài liệu này đặc tả chi tiết kiến trúc tầng Giao diện (Webview UI), Component thanh tìm kiếm (`SearchFilterBar`), thuật toán bóc tách cú pháp bộ lọc (`searchQuery`), kho trạng thái phản ứng `search.store.ts` bằng Preact Signals, cơ chế Highlight nút đồ thị và cuộn mượt mà trên bảng ảo hóa Virtualized Table cho **Phase 3.2: Nhóm Việc 4 — Thanh Tìm Kiếm & Lọc Commit Nâng Cao**.

> [!NOTE]
> Mọi nội dung trong tài liệu này tuân thủ nguyên tắc: thiết kế bằng ngôn ngữ tự nhiên (**Design by Word**), tập trung vào giải thuật tìm kiếm chuỗi phi khóa, tương tác phím tắt toàn cục và điều hướng mượt mà; tuyệt đối không sử dụng mã nguồn mẫu dưới bất kỳ hình thức nào.
>
> 📌 **Truy vết tiến độ**: [Phase 3.2 Tiến Độ (Nhóm Việc 4)](../../03_progess/phase3/002_phase3_2_3pane_workspace.md#nhóm-việc-4-thanh-tìm-kiếm--lọc-commit-nâng-cao-search--filter-bar).

---

## 1. Tầm Nhìn, Mục Tiêu & Trải Nghiệm Người Dùng

### 1.1. Mục Tiêu Cốt Lõi
- Cung cấp công cụ tìm kiếm và định vị commit tức thời trên đồ thị DAG hàng chục nghìn node mà không gây giật lag hay treo luồng chính (Zero Frame Drop).
- Hỗ trợ tổ hợp phím tắt tiêu chuẩn toàn cầu `Ctrl + F` (hoặc `Cmd + F` trên macOS) để mở nhanh ô tìm kiếm từ bất kỳ vị trí nào trên màn hình.
- Phân tích cú pháp lọc thông minh: Tự động nhận diện từ khóa tự do trong Commit Message, hoặc lọc chính xác theo tiền tố tác giả (`author:`), mã băm (`hash:`).

### 1.2. Trải Nghiệm Điều Hướng & Highlight Trực Quan
- **Highlight phát quang**: Các nút lục giác `HexagonNode` và dòng commit thỏa mãn điều kiện tìm kiếm sẽ bừng sáng viền tím Neon `#a855f7`, các dòng không khớp sẽ hơi giảm độ tương phản để hướng sự chú ý của người dùng vào kết quả.
- **Cuộn mượt mà (Smooth Virtualized Scrolling)**: Tích hợp nút `Next (↓)` và `Previous (↑)` kèm bộ đếm `(X of Y)`. Khi bấm chuyển kết quả, bảng ảo hóa tự động tính toán chỉ số dòng và cuộn mượt đến đúng vị trí hiển thị của commit đó.

---

## 2. Đặc Tả Thuật Toán Phân Tích Cú Pháp Lọc & Bóc Tách

### 2.1. Cú Pháp Truy Vấn (Query Syntax)

1. **Tìm kiếm tự do (Free-text)**:
   - Khi người dùng gõ từ khóa thông thường (ví dụ: `fix auth bug`): So khớp không phân biệt hoa thường (Case-insensitive substring match) trong dòng tiêu đề `subject` và mô tả `description` của commit.
2. **Lọc theo tác giả (`author:<name_or_email>`)**:
   - Khi chuỗi tìm kiếm bắt đầu bằng tiền tố `author:` (ví dụ `author:Nam` hoặc `author:lmo@lab.vn`): Trích xuất phần sau dấu hai chấm và so khớp với trường tên tác giả (`authorName`) hoặc email (`authorEmail`).
3. **Lọc theo mã băm (`hash:<prefix>`)**:
   - Khi chuỗi tìm kiếm bắt đầu bằng `hash:` hoặc chuỗi hex 7–40 ký tự: So khớp tiền tố mã hash commit (`commitHash.startsWith(query)`).
4. **Kết hợp nhiều điều kiện**:
   - Tách chuỗi theo dấu cách: Các điều kiện kết nối với nhau bằng logic `AND` (tất cả các điều kiện đều phải thỏa mãn).

---

## 3. Đặc Tả Kiến Trúc Giao Diện & Component

### 3.1. Cấu Trúc Component `SearchFilterBar.tsx`

```
<SearchFilterBar> [Đặt nổi ở đỉnh bảng commit hoặc thanh Toolbar, có đinh tán góc]
  ├── <SearchInputWrapper>
  │     ├── <SearchIcon />
  │     ├── <SearchInputField placeholder="Find by message, author:name, hash:sha (Ctrl+F)" />
  │     └── <SearchClearButton visible={query !== ""} onClick={clearSearch} />
  │
  └── <SearchNavigationControls visible={totalMatches > 0}>
        ├── <SearchMatchCounter text="(3 of 12)" />
        ├── <NavButton direction="prev" icon="arrow-up" onClick={prevMatch} />
        ├── <NavButton direction="next" icon="arrow-down" onClick={nextMatch} />
        └── <SearchCloseButton icon="x" onClick={closeSearch} />
```

### 3.2. Bắt Phím Tắt Toàn Cục (Keyboard Shortcuts)
- **`Ctrl + F` / `Cmd + F`**: Mở thanh tìm kiếm (nếu đang đóng) và tự động `focus()` + `select()` toàn bộ văn bản trong ô input.
- **`Enter`**: Tự động chuyển tới kết quả kế tiếp (`nextMatch`).
- **`Shift + Enter`**: Chuyển ngược lại kết quả trước đó (`prevMatch`).
- **`Esc`**: Xóa kết quả tìm kiếm, đóng thanh tìm kiếm và trả tiêu điểm về bảng đồ thị DAG.

---

## 4. Quản Lý Trạng Thái Bằng Preact Signals (`search.store.ts`)

### 4.1. Danh Mục Tín Hiệu Cơ Sở (Base Signals)
- `searchQuery`: Chuỗi tìm kiếm hiện tại do người dùng nhập (chuỗi rỗng mặc định).
- `isSearchOpen`: Cờ hiển thị thanh tìm kiếm (boolean).
- `currentMatchIndex`: Chỉ số của kết quả đang được chọn trong danh sách kết quả khớp (bắt đầu từ 0).

### 4.2. Danh Mục Tín Hiệu Dẫn Xuất (Computed Signals)
- `matchingRowIndices`: Mảng chứa danh sách các chỉ số hàng (`rowIndex[]`) trong bảng ảo hóa thỏa mãn điều kiện lọc.
- `totalMatches`: Tổng số lượng commit khớp (`matchingRowIndices.length`).
- `activeCommitHash`: Mã hash của commit đang được focus hiện tại trong danh sách kết quả.
- `counterLabel`: Chuỗi định dạng hiển thị cho người dùng, ví dụ `"(3 of 12)"` hoặc `"No results"`.

### 4.3. Các Hàm Điều Phối Hành Động (Dispatchers)
- `openSearch()`: Đặt `isSearchOpen = true`.
- `closeSearch()`: Đặt `isSearchOpen = false`, làm sạch `searchQuery`.
- `setQuery(query: string)`: Cập nhật `searchQuery`, đặt lại `currentMatchIndex = 0`, kích hoạt tính toán lại danh sách khớp.
- `nextMatch()`: Tăng `currentMatchIndex` (xoay vòng về 0 khi vượt quá cuối mảng), kích hoạt hàm cuộn bảng ảo hóa.
- `prevMatch()`: Giảm `currentMatchIndex` (xoay vòng về cuối mảng khi nhỏ hơn 0), kích hoạt hàm cuộn bảng ảo hóa.

---

## 5. Tích Hợp Với Bảng Ảo Hóa Virtualized Table

- **Cơ chế cuộn mượt mà**:
  - Khi `currentMatchIndex` thay đổi, `search.store` phát tín hiệu tới bộ điều khiển cuộn của `CommitTable`.
  - Bộ điều khiển tính toán vị trí pixel $Y = \text{targetRowIndex} \times 24\text{px}$.
  - Gọi phương thức cuộn ảo hóa để đưa dòng commit vào chính giữa vùng nhìn (Viewport Center) với hiệu ứng chuyển động mượt.
- **Tương tác với dòng `UNCOMMITTED_CHANGES` (`*`)**:
  - Khi có dòng mầm `*` ở đỉnh bảng, thuật toán tìm kiếm tự động dịch chuyển chỉ số khớp thêm 1 đơn vị nếu dòng `*` đang hiển thị, bảo đảm chỉ số cuộn luôn khớp tuyệt đối với commit thực tế.

---

## 6. Ma Trận Kiểm Thử Đơn Vị Song Hành (Unit Testing Matrix)

| Tệp Kiểm Thử Độc Lập | Module Mục Tiêu | Kịch Bản Kiểm Thử Bắt Buộc |
| :--- | :--- | :--- |
| `tests/webview/components/search/SearchFilterBar.test.ts` | `SearchFilterBar.tsx` & `search.store.ts` | 1. Bấm `Ctrl + F` mở thanh tìm kiếm và nhận tiêu điểm.<br>2. Nhập từ khóa thông điệp: Lọc đúng danh sách commit chứa từ khóa.<br>3. Nhập `author:Nam`: Chỉ lọc các commit của tác giả Nam.<br>4. Nhập `hash:a1b2`: Lọc đúng commit có hash bắt đầu bằng tiền tố.<br>5. Bấm `Enter` và `Shift + Enter` xoay vòng chỉ số kết quả Next/Prev.<br>6. Phím `Esc` đóng thanh tìm kiếm và xóa bộ lọc. |
