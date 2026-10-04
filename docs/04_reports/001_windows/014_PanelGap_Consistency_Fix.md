# Báo Cáo Kỹ Thuật: Đồng Nhất Khoảng Cách Giữa Dòng Commit & Panel Chi Tiết

- **Mã hồ sơ**: `REP-WIN-014`
- **Ngày lập**: 2026-10-05
- **Trạng thái**: Hoàn thành — kiểm định zero-regression (vitest webview 21/21, typecheck/lint 0 lỗi, đóng gói VSIX thành công)
- **Tác động**: Webview Preact (`CommitTable.tsx`, `constants.ts`) — vị trí đặt panel chi tiết commit.

---

## 1. Tổng Quan & Bối Cảnh

Sau khi chuyển cơ chế hiển thị chi tiết commit sang **Overlay Inspector Panel** và bổ sung viền neon đồng nhất cho cả dòng commit lẫn panel (Báo cáo 013), người dùng kiểm thử thực tế phát hiện **khoảng cách giữa dòng commit được chọn và panel hiển thị không đều**: trong cùng một dải commit, có dòng cách nhau đúng `+1px` sạch sẽ, có dòng chỉ "không đè lên nhau" mà không xác định được quy luật.

Báo cáo này ghi nhận phân tích căn nguyên và biện pháp khắc phục triệt để.

---

## 2. Phân Tích Căn Nguyên

Kiểm tra mã hiện có cho thấy panel chi tiết **không hề có khoảng cách (gap) tường minh** — nó được đặt **flush (0px)** sát đúng mép dưới dòng được chọn:

```ts
const belowTop = TABLE_HEADER_HEIGHT + (from + expandedRow + 1) * ROW_HEIGHT; // = đúng đáy dòng
```

Khoảng cách "đúng +1px" mà người dùng thỉnh thoảng quan sát được thực chất là **hiệu ứng phụ (emergent)**, không phải thiết kế có chủ đích, sinh ra từ hai yếu tố:

1. **`outline-offset: -1.5px`** trên cả dòng commit lẫn panel: đường viền neon tím `#a855f7` bị lùi vào trong `1.5px` mỗi bên, tạo ra ~`3px` "khe" giữa hai đường neon khi hai khối đặt flush.
2. **`box-shadow: 0 0 10px ...`** (glow neon) loang ra ~`10px` ở mọi hướng, tràn vào khe nói trên.

Vì độ dày viền là `1.5px` (giá trị lẻ) và panel đặt flush đúng `0px`, kết quả phụ thuộc vào **anti-aliasing / căn pixel lẻ** của trình kết xuất. Hệ quả là cùng một logic định vị, các dòng khác nhau lại cho khoảng cách thị giác khác nhau (khe sạch vs. chỉ không đè nhau), không theo quy luật nào — điều này giải thích vì sao người dùng không thống kê được nguyên nhân cụ thể: nó nằm ở tầng render sub-pixel, không nằm trong logic bố cục.

---

## 3. Biện Pháp Khắc Phục

### 3.1. Hằng số khoảng cách tường minh

- **`src/webview/constants.ts`**: Bổ sung hằng số `PANEL_GAP = 4`, định nghĩa khoảng cách dọc cố định giữa dòng commit và panel sao cho hai đường viền neon nằm **sát nhau nhưng không chèn đè**, áp dụng đồng nhất cho mọi dòng.

### 3.2. Áp dụng nhất quán trong cả hai nhánh định vị

- **`src/webview/components/commit/CommitTable.tsx`**: Tái cấu trúc hàm tính `detailsPanelTop` thành các biến trung gian rõ ràng (`rowTop`, `rowBottom`) và áp dụng `PANEL_GAP` **tường minh** cho cả hai nhánh:
  - **Nhánh đặt dưới dòng**: `belowTop = rowBottom + PANEL_GAP`.
  - **Nhánh lật lên trên** (khi dòng quá gần đáy danh sách, không đủ `COMMIT_DETAILS_HEIGHT` chỗ trống phía dưới): `aboveTop = rowTop - COMMIT_DETAILS_HEIGHT - PANEL_GAP`.

Nhờ khoảng cách được tính bằng hằng số nguyên tường minh (thay vì phụ thuộc vào phép cộng `+1` row index rồi để border/glow tự tạo khe), mọi dòng commit giờ cho **cùng một khoảng cách thị giác** như nhau, triệt tiêu hiện tượng lệch giữa các line trong cùng dải commit.

Hành vi **lật panel phía trên khi gần đáy** (khắc phục lỗi "hộp đen che commit gốc" trước đây) được **bảo toàn nguyên vẹn** — chỉ bổ sung gap vào cả hai nhánh, không thay đổi logic lật.

---

## 4. Kiểm Định (Zero-Regression)

| Hạng mục kiểm định | Kết quả |
| :--- | :---: |
| `pnpm typecheck` | 0 lỗi |
| `pnpm lint` | 0 lỗi / 0 cảnh báo |
| `vitest` — webview `components/commit` | 21/21 pass |
| `pnpm run package:vsix:win` | Đóng gói thành công `f-gitgraph-win-x64.vsix` (2.63 MB, 20 files) |

Ghi chú: thay đổi nằm hoàn toàn trong tầng Webview, không đụng chạm tới hình học F# Core (`Graph.fs`, `Transport.fs`) nên đồ thị giữ nguyên 100% hình học.

---

## 5. Kết Luận

Căn nguyên lỗi là việc định vị panel **không có gap tường minh** khiến khoảng cách thị giác phát sinh ngẫu nhiên từ viền `1.5px` (lẻ) và glow `box-shadow` ở mức render sub-pixel. Biện pháp bổ sung hằng số `PANEL_GAP` và áp dụng đồng nhất trong cả hai nhánh định vị đã triệt tiêu hoàn toàn hiện tượng lệch khoảng cách giữa các dòng commit. Kiểm định đạt zero-regression và bản cài đặt thử nghiệm Windows đã được đóng gói thành công.
