# Thiết kế Graph Node Lục giác (Hexagon) & Hệ thống Icon (GitLens-style)

Tài liệu này mô tả chi tiết kiến trúc, thuật toán vẽ hình học và cách mở rộng hệ thống commit node hình lục giác trong F-GitGraph.

---

## 1. Tổng quan kiến trúc

Trong biểu đồ Git Graph, mỗi commit được biểu diễn bằng một điểm nút (node) nằm trên các làn (lanes) và hàng (rows):

- Trước đây: Được vẽ bằng thẻ `<circle>` đơn giản với bán kính cố định (`VERTEX_RADIUS = 4`).
- Hiện tại: Được chuyển đổi sang component [`HexagonNode`](file:///d:/Kojin/f-gitgraph/src/webview/components/commit/HexagonNode.tsx) dạng hình lục giác đều, có nền che đường nhánh phía sau và chèn icon trạng thái commit ở giữa tương tự GitLens.

### Các thành phần chính:

- **[`HexagonNode`](file:///d:/Kojin/f-gitgraph/src/webview/components/commit/HexagonNode.tsx):** Component SVG render hình lục giác và icon bên trong.
- **[`CommitGraph`](file:///d:/Kojin/f-gitgraph/src/webview/components/commit/CommitGraph.tsx):** Component bao bọc, nhận danh sách `layout` và `commits`, tính toán trạng thái ngữ nghĩa của từng commit và gọi `<HexagonNode>`.
- **[`src/webview/graph/constants.ts`](file:///d:/Kojin/f-gitgraph/src/webview/graph/constants.ts):** Chứa các hằng số kích thước hình học.

---

## 2. Thông số hình học (Geometry & Metrics)

Bảng thông số kích thước:

| Hằng số             | Giá trị | Ý nghĩa                                           |
| ------------------- | ------- | ------------------------------------------------- |
| `LANE_WIDTH`        | `16px`  | Khoảng cách chiều rộng giữa 2 làn nhánh song song |
| `LANE_OFFSET`       | `8px`   | Khoảng cách từ mép trái tới tâm làn đầu tiên      |
| `ROW_HEIGHT`        | `24px`  | Chiều cao của một hàng commit trong bảng          |
| `HEXAGON_RADIUS`    | `7px`   | Bán kính từ tâm tới các đỉnh của hình lục giác    |
| `HEXAGON_ICON_SIZE` | `8.5px` | Kích thước khung SVG icon bên trong lục giác      |

### Định hướng Pointy-topped:

Lục giác được vẽ theo dạng **Pointy-topped** (đỉnh nhọn hướng thẳng lên trên và xuống dưới):

- Điểm đỉnh trên: `(cx, cy - R)`
- Điểm đỉnh dưới: `(cx, cy + R)`
- Hai đỉnh này nằm chính xác trên đường trục dọc `X = cx`, khớp hoàn hảo với các đoạn nhánh Git dọc chạy vào và đi ra khỏi commit.
- Chiều ngang lục giác: $2 \times R \times \cos(30^\circ) \approx 12.12\text{px}$, nằm gọn trong độ rộng làn `16px` với lề đệm an toàn `~2px` ở mỗi bên, không bị chạm vào làn bên cạnh.

---

## 3. Cấu trúc lớp vẽ (Layering)

Để đảm bảo các đường kẻ nhánh đi qua phía sau không đè lên icon, mỗi node được vẽ thành 3 lớp tuần tự:

1. **Lớp mặt nạ (Background Mask):** Polygon lục giác có kích thước `radius + 1`, viền và nền mang màu nền editor (`fill-editor stroke-editor`). Lớp này che hoàn toàn đường nhánh chạy ngầm phía sau.
2. **Lớp viền lục giác (Foreground Hexagon):** Polygon lục giác có bán kính `radius`, viền theo màu nhánh commit (`stroke={colour}`), bo góc tròn mịn (`strokeLinejoin="round"`). Nếu là thay đổi chưa commit (`isCommitted === false`), viền sẽ là nét đứt (`strokeDasharray="2.5 1.5"`).
3. **Lớp Icon (Inner Icon):** Nằm chính giữa tại tọa độ `(cx, cy)`, kích thước `8.5px x 8.5px`.

---

## 4. Các loại Icon ngữ nghĩa mặc định (GitLens-style)

Hàm `getCommitNodeType(commit, vertex)` tự động phân loại commit:

| Loại (`nodeType`) | Điều kiện nhận diện                              | Ý nghĩa & Biểu tượng                                         |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| `merge`           | `commit.parentHashes.length > 1`                 | Commit gộp nhánh: biểu tượng Git merge (2 nhánh chập vào 1). |
| `head`            | `vertex.isCurrent === true`                      | Commit HEAD hiện tại: chấm tròn nổi bật `r=3.5`.             |
| `uncommitted`     | `commit.hash === "*"` hoặc `!vertex.isCommitted` | Thay đổi chưa commit: biểu tượng cây bút / chỉnh sửa.        |
| `tag`             | `commit.refs.some(r => r.type === "tag")`        | Commit có gắn tag: biểu tượng thẻ tag.                       |
| `commit`          | Mặc định                                         | Commit thông thường: chấm tròn tinh gọn `r=2`.               |
| `stash`           | Commit kiểu stash                                | Biểu tượng gói lưu trữ stash.                                |

---

## 5. Hướng dẫn mở rộng hoặc chèn Icon tùy biến

### Cách 1: Chèn icon trực tiếp qua prop `icon` của `HexagonNode`

Bạn có thể truyền bất kỳ phần tử JSX/SVG nào vào prop `icon`:

```tsx
<HexagonNode
  cx={laneX(vertex.x)}
  cy={rowY(vertex.y)}
  colour="#0085d9"
  icon={<circle cx="0" cy="0" r="3" fill="#ffffff" />}
/>
```

### Cách 2: Tùy biến icon ở tầng `CommitGraph` qua `renderNodeIcon`

Trong component cha (ví dụ `CommitTable`), có thể truyền prop `renderNodeIcon`:

```tsx
<CommitGraph
  layout={layout}
  commits={commits}
  expansion={expansion}
  renderNodeIcon={(commit, vertex) => {
    if (commit?.author === "Special User") {
      // Chèn icon hoặc avatar đặc biệt
      return <image href="..." width="8" height="8" x="-4" y="-4" />;
    }
    // Trả về undefined để dùng icon mặc định
    return undefined;
  }}
/>
```

### Cách 3: Thêm loại icon mới vào `HexagonNode.tsx`

1. Mở file [`HexagonNode.tsx`](file:///d:/Kojin/f-gitgraph/src/webview/components/commit/HexagonNode.tsx).
2. Bổ sung kiểu vào `CommitNodeType`.
3. Định nghĩa path SVG dạng 16x16 (ví dụ `CustomIconPath()`).
4. Thêm case tương ứng trong hàm `renderDefaultIcon(type)`.
