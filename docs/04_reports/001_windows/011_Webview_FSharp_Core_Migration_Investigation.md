# 011. Hồ Sơ Điều Tra Sự Cố & Lỗi Hiển Thị Đồ Thị (Phase 1 - Nhóm Việc 11: Di Trú Webview Sang F# Core Engine)

- **Mã báo cáo**: `REP-WIN-011`
- **Hạng mục**: Nhóm Việc 11 — Di trú Webview sang nhân F# Core Engine & Vận hành thực tế
- **Trạng thái**: 🟡 Đang điều tra (Under Investigation)
- **Ngày khởi tạo**: 2026-10-04
- **Người thực hiện**: Đội ngũ phát triển F-GitGraph (LMO-LAB)

---

## 1. Bối Cảnh & Mục Tiêu Điều Tra

Sau khi triển khai Nhiệm vụ 11.1 và tích hợp cầu nối `GraphDataBridge`, di chuyển dữ liệu hình học phẳng từ F# Native AOT (`f-gitgraph-core.exe`) xuống Webview Preact (thay thế thuật toán layout cũ bằng TypeScript) và dọn dẹp các tệp truy vấn cũ, hệ thống đã chạy được end-to-end. Tuy nhiên, khi kiểm thử thực tế trên kho mã nguồn có cấu trúc phân nhánh phức tạp, giao diện Webview xuất hiện một số hiện tượng suy thoái (regressions) về màu sắc đường vẽ, liên kết đồ thị, khoảng đệm cột và tải avatar.

Tài liệu này đóng vai trò là **Hồ sơ điều tra sự cố tập trung**, ghi nhận chi tiết từng lỗi, lưu vết các giả thuyết kỹ thuật, đối chiếu mã nguồn giữa hai phiên bản (TypeScript cũ vs F# Native AOT mới), và đề xuất kế hoạch khắc phục triệt để.

---

## 2. Bảng Theo Dõi Tổng Hợp Các Lỗi Ghi Nhận

| Mã Lỗi | Tên Lỗi / Sự Cố | Phân Vùng Ảnh Hưởng | Mức Độ | Trạng Thái |
| :---: | :--- | :--- | :---: | :---: |
| **BUG-01** | Màu của các line (lane) trong đồ thị commit bị xung đột, đổi màu giữa chừng | `src/core-engine/Graph/Graph.fs` | Cao | Đã tiếp nhận chi tiết |
| **BUG-02** | Avatar/Node biến mất trong vùng mở của commit được chọn, line đứt & cong kéo giãn | `CommitGraph.tsx`, `CommitTable.tsx` | Cao | Đã tiếp nhận chi tiết |
| **BUG-03** | Commit gốc ("Initial from origin") nhưng phía dưới vẫn có nhiều avatar/node và lane kéo dài | `Graph.fs`, `CommitGraph.tsx`, `CommitTable.tsx` | Cao | Đã tiếp nhận chi tiết |
| **BUG-04** | Badge nhánh/ref mất màu nền sau khi sửa màu (trở về trong suốt) | `RefLabel.tsx`, `styles.css` | Trung bình | Đã tiếp nhận chi tiết |
| **BUG-05** | Node đồ thị và avatar bị sát mép cột graph ở cả hai bên trái và phải | `CommitGraph.tsx`, `Graph.fs` (Margin/Offset) | Trung bình | Chờ bổ sung mô tả |
| **BUG-06** | Cuộn trang ảo (Virtual Scrolling) khiến nhiều avatar commit không được nạp | `src/webview/`, `avatarManager.ts` | Trung bình | Chờ bổ sung mô tả |

---

## 3. Chi Tiết Lỗi 1: Màu Của Các Line (Lane) Trong Đồ Thị Commit Bị Xung Đột (BUG-01)

### 3.1. Bối cảnh
Phần vẽ đồ thị commit được viết lại từ TypeScript sang F#. Ảnh chụp thực tế ghi nhận một đoạn đồ thị của repo có nhiều nhánh `feature/*` và `change_request/*`, với nhiều lần merge pull request và merge branch.

### 3.2. Hiện tượng quan sát được
1. **Nhiều lane đứng cạnh nhau có màu giống hoặc rất gần nhau:** Ở cột bên trái, các đường dọc chạy song song (xanh lá, cam, vàng, đỏ, tím, xanh dương) đôi khi trùng màu giữa các nhánh khác nhau. Mắt người không phân biệt được đâu là nhánh nào.
2. **Màu không ổn định theo nhánh:** Một line đổi màu giữa chừng, thường ở các điểm rẽ nhánh hoặc merge (đường cong nối sang lane khác). Cùng một nhánh nhưng đoạn trên và đoạn dưới mang màu khác nhau.
3. **Màu của line nối và màu của node không khớp:** Các đường cong tại điểm merge/fork lấy màu của lane khác với lane chứa commit. Các node (hình lục giác) cũng có viền, nền và họa tiết (chấm, sọc, lưới) khác nhau, nên khó biết node thuộc lane nào.
4. **Vùng nhiều nhánh đan xen thì lỗi nặng hơn:** Ở các cụm commit `Feature_Commit_A`, `Feature_Commit_B` và các merge PR `#PR_01`, `#PR_02`, `#PR_03`, `#PR_04`, `#PR_05`, nhiều line cắt nhau và cùng lúc xuất hiện nhiều màu tranh chấp.

### 3.3. Kết quả mong đợi
- Mỗi lane/nhánh có một màu riêng, giữ nguyên từ lúc tách ra đến lúc merge.
- Các lane liền kề không được trùng màu.
- Line nối khi merge/fork lấy màu của lane nguồn hoặc lane đích theo một quy tắc nhất quán.

### 3.4. Kết quả thực tế
Màu bị gán lại hoặc bị trùng giữa các line, nên các line trông như "đấu màu" với nhau và đồ thị khó đọc.

### 3.5. Giả thuyết cần kiểm tra
- **Quy tắc gán màu theo làn**: Cách gán màu theo chỉ số lane (`index % số màu`) ở bản F# khác bản TS, ví dụ khi lane được giải phóng rồi tái sử dụng ngay lập tức cho nhánh khác.
- **Thứ tự xử lý parent**: Thứ tự xử lý parent (first parent so với các parent còn lại) khác nhau, làm màu bị gán sai lane kế thừa.
- **Lưu vết trạng thái màu**: Màu bị tính lại độc lập theo từng hàng/nút thay vì lưu vết liên tục theo định danh nhánh (branch lifecycle) xuyên suốt các hàng.
- **Tính bất biến & Truyền trạng thái**: Khác biệt về kiểu dữ liệu (mutable trong TS so với immutable trong F#). Trạng thái màu có thể không được truyền sang hàng kế tiếp khi cập nhật đồ thị.
- **Quy tắc chọn màu đường nối**: Quy tắc chọn màu cho đường nối merge/fork (`makePath`) trong F# đang cố định `Color = child.Color`, chưa phân biệt rõ chiều merge-in vs fork-out như thuật toán gốc.

### 3.6. Đoạn mã nguồn liên quan ở bản F# (`src/core-engine/Graph/Graph.fs`)

```fsharp
// Gán làn trong F# (Graph.fs):
let lane =
    if waiting.Count > 0 then
        let inheritLane = waiting[0]
        for i in 1 .. waiting.Count - 1 do
            active[waiting[i]] <- -1
        inheritLane
    else
        let empty = firstEmpty ()
        if empty >= 0 then empty
        else
            let newLane = active.Count
            active.Add(-1)
            newLane

laneOf[c] <- lane

if snapshot.Parents[c].Length = 0 then
    active[lane] <- -1
else
    active[lane] <- snapshot.Parents[c][0]
    for pi in 1 .. snapshot.Parents[c].Length - 1 do
        let p = snapshot.Parents[c][pi]
        let empty = firstEmpty ()
        if empty >= 0 then active[empty] <- p
        else active.Add p

// Tính màu trong F# (Graph.fs):
let colorOfLane (lane: int) = lane % PaletteSize

// Nét vẽ đường nối trong F# (Graph.fs):
let private makePath (child: Node) (parent: Node) : Path =
    ...
    { D = d
      Color = child.Color   // Đang gán cứng theo màu nút con
      Width = 1.5 }
```

### 3.7. Cách tái hiện đề xuất
Dùng kho mã nguồn có nhiều nhánh feature được merge xen kẽ (tương tự đoạn commit trong ảnh mô tả). Chạy đối chiếu giữa thuật toán phân làn cũ và F# Core trên cùng tập lịch sử để so sánh màu từng hàng.

---

## 4. Chi Tiết Lỗi 2: Avatar/Node Biến Mất Trong Vùng Mở Của Commit Được Chọn (BUG-02)

### 4.1. Bối cảnh
Cùng đồ thị commit đã viết lại sang F#. Lỗi chỉ xảy ra khi người dùng chọn (click) một commit và hàng đó mở ra vùng chi tiết (Commit, Parents, Author, Date, Committer, cây file thay đổi như `schema.sql +104 | -131`).

### 4.2. Hiện tượng quan sát được
- **Trạng thái bình thường (ảnh 1, chưa chọn):** Mọi commit đều có node/avatar hình lục giác nằm đúng trên lane của nó. Các line nối liền mạch giữa các node.
- **Trạng thái lỗi (ảnh 2, đã chọn commit `Feature_Commit_A`, hash `a1b2c3d...`):**
  1. **Node biến mất trong vùng mở:** Trong khoảng chiều cao của panel chi tiết, cột đồ thị không còn avatar nào. Các node ở phía trên và phía dưới panel vẫn hiển thị bình thường.
  2. **Line bị đổi kiểu thành nét đứt:** Ở vùng này, nhiều lane dọc (xanh lá, cam, đỏ, tím, xanh dương) chuyển thành nét đứt, hoặc vẽ liền không đều. Chúng không còn là các line liền mạch như ở ngoài vùng mở.
  3. **Các đường cong bị kéo giãn:** Các line xanh lá và tím, vốn là đường rẽ nhánh/merge ngắn, bị kéo thành đường cong chữ S dài trải suốt chiều cao panel. Điểm đầu và điểm cuối của chúng cách xa nhau hơn so với khi chưa mở.
  4. **Node của commit được chọn vẫn có hiệu ứng highlight** (viền sáng màu teal) ở hàng trên cùng của vùng mở, nhưng các node nằm trong vùng bên dưới thì không xuất hiện.

### 4.3. Kết quả mong đợi
- Chọn commit chỉ làm giãn hàng ra để chứa panel chi tiết.
- Các node vẫn nằm đúng vị trí trên lane tương ứng với các hàng tiếp theo bên dưới.
- Các line đi xuyên qua vùng mở thì liền mạch và thẳng, đồng bộ về kiểu nét với phần còn lại (hoặc theo quy chuẩn thị giác thống nhất).

### 4.4. Kết quả thực tế
Trong vùng mở, node không được vẽ, line chuyển sang nét đứt, và các đường cong bị kéo giãn. Đồ thị mất tính liên tục về mặt thị giác.

### 4.5. Lưu ý khi điều tra
Bản thân panel không phải là một hàng commit, nên việc không có node ngay trong vùng panel có thể là hành vi chủ ý. Nét đứt cũng có thể là quy ước hiển thị "line đi xuyên qua vùng mở". Cần so với bản TS để xác định phần nào là lỗi:
- Nếu bản TS cũng có nét đứt nhưng giữ nguyên các node của những hàng không bị panel che, thì lỗi là node bị mất.
- Nếu các node sau khi mở bị đẩy xuống ngoài vùng nhìn thấy hoặc bị cắt, thì lỗi nằm ở việc tính lại vị trí.

### 4.6. Phân tích Căn nguyên Kỹ thuật & Các Lưu ý Trọng yếu
1. **Lệch pha hai nơi tính tọa độ Y riêng rẽ (Desynchronized Y Coordinate Mapping):**
   - Hiện tượng đường nối (`path`) và nút avatar (`node`) được tính toán vị trí Y tại hai nơi độc lập nhau: Nếu đường nối được cộng thêm độ lệch dãn nở (`expansion offset`) trong khi node/avatar lại được tính cố định theo tọa độ ban đầu `row * rowHeight` (hoặc ngược lại), phần đường nối sẽ bị đẩy dời xuống phía dưới trong khi avatar vẫn đứng yên ở vị trí cũ, tạo ra một khoảng trống rỗng kỳ dị ngay trong vùng panel chi tiết.
   - **Giải pháp căn cơ**: Gom toàn bộ phép chuyển đổi từ chỉ số dòng (`row index`) sang tọa độ thẳng đứng ($Y$) về **một hàm chuyển đổi duy nhất (Single Source of Truth)**. Cả điểm đầu/cuối của các đoạn đường nối và tọa độ tâm `cy` của toàn bộ node/avatar đều phải đi qua hàm này, tuyệt đối không tự ý cộng bù trừ phân tán ở các component riêng lẻ.

2. **Quy tắc điều kiện dãn nở `row > e` (Lớn hơn, tuyệt đối không dùng Lớn hơn hoặc bằng):**
   - Khi commit tại dòng $e$ được mở rộng, node của chính commit $e$ đó phải giữ nguyên tọa độ $Y$ ban đầu ở mép trên cùng của panel chi tiết.
   - Chỉ các commit và các mốc tọa độ nằm ở phía dưới ($row > e$) mới được cộng bù thêm chiều cao dãn nở của panel chi tiết.

3. **Biến dạng đường cong Bezier khi đi xuyên qua vùng mở rộng:**
   - Nếu một đoạn nối đi từ dòng $\le e$ xuống dòng $> e$, điểm cuối của nó bị dịch chuyển xuống dưới một khoảng lớn (~250px).
   - Nếu giữ nguyên công thức vẽ cong Bezier toàn phần, đường cong sẽ bị kéo giãn thành hình chữ S dài méo mó, biến dạng rất xấu.
   - **Yêu cầu kỹ thuật**: Bắt buộc phải tách đường nối này thành các phân đoạn, trong đó phần đi xuyên qua chiều cao của panel chi tiết phải là **đoạn thẳng đứng** theo trục làn ($X$), không được vẽ cong Bezier qua suốt chiều cao panel.

4. **Avatar nằm ở layer riêng với `clipPath` và `transform`:**
   - Node avatar được kết xuất trong một nhóm SVG `<g>` riêng, chứa thẻ `<image>` lồng bên trong thẻ `<clipPath>` hình lục giác polygon và có thuộc tính `transform-origin: cx cy`.
   - Nếu vị trí `cy` thay đổi khi mở rộng hàng nhưng tọa độ của thẻ `<image>` (`y = cy - radius`), định nghĩa tọa độ điểm trong `<clipPath>`, hoặc `transform-origin` của thẻ `<g>` không được tính toán lại đồng bộ, avatar sẽ đứng im tại chỗ cũ hoặc bị biến mất do lệch khỏi vùng cắt clip-path.

5. **Kích hoạt Re-render đồng bộ cả hai layer khi toggle expand:**
   - Khi trạng thái commit mở rộng (`ExpandedIndex` / `expansion`) thay đổi, chu trình phản ứng của giao diện phải kích hoạt re-render đồng bộ cho cả layer đường vẽ SVG lẫn layer node/avatar lục giác, tránh tình trạng một layer cập nhật trước còn một layer giữ nguyên trạng thái cũ.

### 4.7. Đoạn mã nguồn liên quan trong Webview

```tsx
// src/webview/components/commit/CommitGraph.tsx:
// 1. Phép biến đổi đường nối SVG khi có hàng mở rộng:
function transformPathD(d: string, splitTop: number, height: number): PathSegment[] {
  // Cần bảo đảm điểm đầu/cuối và đoạn cắt xuyên qua panel tuân thủ đúng hàm tọa độ Y duy nhất
}

// 2. Tọa độ Y của Node lục giác:
const expandOffset = expansion !== null && index > expansion.row ? expansion.height : 0;
const cy = row.y + expandOffset;

// 3. src/webview/components/commit/HexagonNode.tsx:
// Avatar phụ thuộc vào clipPath id="hex-avatar-{safeId}" và image y={cy - radius}
<image href={avatarUrl} x={cx - radius} y={cy - radius} clipPath={`url(#${clipId})`} />
```

### 4.8. Cách tái hiện
Mở đồ thị tại một đoạn có nhiều lane song song và nhiều node, click vào một commit bất kỳ (ví dụ `Feature_Commit_A`) để mở panel chi tiết. Quan sát cột đồ thị trong vùng panel, rồi so sánh với bản TS trên cùng commit.

---

## 5. Chi Tiết Lỗi 3: Commit Gốc ("Initial from origin") Nhưng Phía Dưới Vẫn Có Nhiều Avatar (BUG-03)

### 5.1. Bối cảnh
Commit `Initial from origin` (hash `0xROOT_A`, ngày May 13, 2025, tác giả `Author_A`) là commit đầu tiên của repo. Ô `Parents:` trong panel chi tiết để trống, xác nhận đây là root commit. Danh sách commit sắp xếp từ mới đến cũ, nên không thể có commit nào cũ hơn nằm bên dưới nó.

### 5.2. Hiện tượng quan sát được
1. **Có node/avatar xuất hiện bên dưới root commit:** Khi chọn dòng `Initial from origin` và mở panel chi tiết, cột đồ thị bên trái trong vùng panel vẫn hiện nhiều node (hình lục giác với nhiều kiểu: trắng, xám, xanh lá có họa tiết, đỏ/hồng). Chúng nằm rải ở nhiều lane, kể cả những node sát đáy vùng hiển thị.
2. **Các lane không kết thúc tại root commit:** Nhiều line (xanh lá, cam, đỏ, tím, xanh dương, teal) vẫn kéo dài xuống dưới điểm của root commit. Một số cong và hội tụ về phía bên trái ở đáy, như thể còn các commit cũ hơn để nối vào.
3. **Hàng root commit tự nó trông bình thường:** Node của nó được tô sáng, và dòng được chọn có viền tím. Vấn đề chỉ nằm ở phần đồ thị phía dưới nó.

### 5.3. Kết quả mong đợi
Root commit là điểm kết thúc của toàn bộ đồ thị. Mọi lane đều phải khép lại tại hoặc trước hàng này. Bên dưới nó không có node nào, nên vùng đồ thị trong panel phải để trống hoặc chỉ có line đi xuyên qua nếu còn lane chưa khép.

### 5.4. Kết quả thực tế
Vùng bên dưới root commit vẫn có node và line như thể danh sách còn tiếp tục. Điều này mâu thuẫn với việc commit này không có parent.

### 5.5. Mối liên hệ với Lỗi 2
Ở Lỗi 2, node biến mất trong vùng mở. Ở Lỗi 3, node lại xuất hiện trong vùng mở ở cuối danh sách. Hai lỗi có chung nguồn gốc: **Vị trí node và line không được tính lại đúng khi hàng được mở rộng**. Ở Lỗi 3, các node xuất hiện trong vùng panel có thể chính là các node của những hàng khác bị dịch chuyển sai tọa độ, hoặc do cơ chế tính cửa sổ/bộ đệm SVG không đồng bộ với chiều cao thực tế của bảng.

### 5.6. Giả thuyết cần kiểm tra
- **Phân trang & Cờ kết thúc dữ liệu**: Danh sách commit đã được tải theo trang (phân trang cửa sổ ảo), nên đồ thị vẫn giả định còn commit tiếp theo và vẽ các lane đang mở. Cần kiểm tra cờ "hết dữ liệu" khi tới root commit.
- **Xử lý lane còn mở khi hết commit**: Khi tới root commit (parents rỗng), các lane đang chờ parent chưa được đóng lại. Cách xử lý "lane còn mở nhưng hết commit" ở bản F# có thể khác bản TS.
- **Node bị vẽ lại với tọa độ Y bị lệch**: Node của các hàng trước bị vẽ lại với tọa độ Y bị lệch sau khi hàng được mở rộng, nên xuất hiện sai chỗ trong vùng panel.
- **Tàn dư render (Ghost rendering / Cache)**: Lớp vẽ cũ chưa bị xóa khi chiều cao vùng hiển thị thay đổi, nên còn sót node từ lần vẽ trước.
- **Kích thước Canvas/SVG thừa**: Chiều cao SVG của đồ thị (`rows.length * ROW_HEIGHT + expansion.height`) lớn hơn số hàng thực tế, nên vùng thừa được vẽ bằng dữ liệu mảng chưa xóa sạch.

### 5.7. Đoạn mã nguồn liên quan ở bản F# (`src/core-engine/Graph/Graph.fs`)

```fsharp
// Đoạn xử lý commit gốc và đóng làn trong F# (Graph.fs):
if snapshot.Parents[c].Length = 0 then
    // Commit gốc: giải phóng làn hiện hành.
    active[lane] <- -1
else
    // Cha thứ nhất kế thừa làn của c.
    active[lane] <- snapshot.Parents[c][0]
    // Các cha còn lại cấp làn mới.
    for pi in 1 .. snapshot.Parents[c].Length - 1 do
        let p = snapshot.Parents[c][pi]
        let empty = firstEmpty ()
        if empty >= 0 then active[empty] <- p
        else active.Add p

// Chú ý: Nếu trong mảng 'active' vẫn còn các làn khác (chờ các nhánh độc lập khác chưa tới root),
// các làn đó vẫn tiếp tục duy trì và đường nối Paths vẫn kéo dài xuống dưới!
```

### 5.8. Cách tái hiện
Cuộn xuống cuối danh sách của repo trong ảnh, click vào `Initial from origin`, rồi quan sát cột đồ thị bên dưới hàng này. Thử thêm trường hợp không chọn commit nào để xem node bên dưới root commit có xuất hiện sẵn hay chỉ khi mở panel.

---

---

## 6. Chi Tiết Lỗi 4: Badge Nhánh/Ref Mất Màu Nền Sau Khi Sửa Màu (BUG-04)

### 6.1. Bối cảnh
Lỗi nằm ở cột Description, ở các nhãn (badge/pill) hiển thị tên nhánh và tag gắn vào commit, ví dụ `Branch_A/main`, `origin/Branch_B/main`, `origin/Branch_C/develop`. Lỗi rõ nhất ở các commit merge (như PR merge `#PR_01`, `#PR_02`) và ở dòng có nhiều ref xếp cạnh nhau.

### 6.2. Hiện tượng quan sát được
1. **Nền của badge bị mất:** Bên trong badge, màu nền giống hệt màu nền của dòng/trang (xanh navy tối), không còn là một khối màu riêng. Badge chỉ nhận ra được nhờ viền và chữ.
2. **Viền vẫn sẫm đúng như trước:** Phần border vẫn giữ màu tối, nên trông như khung rỗng.
3. **Icon nhánh vẫn có nền xanh dương sáng:** Chỉ phần nền của toàn badge bị mất, không phải toàn bộ style.
4. **Dòng có nhiều ref** (các badge rút gọn `o...`, `ori...`) cũng bị tương tự. Các ô nhãn này nhìn như những khung viền liền nhau trên nền phẳng.

### 6.3. Kết quả mong đợi
Mỗi badge có nền sẫm (như trước khi sửa), viền sẫm và chữ sáng, nổi lên khỏi nền dòng.

### 6.4. Kết quả thực tế
Nền badge trả về màu nền trang, tức là hoạt động như `transparent` hoặc bị bỏ qua. Chỉ còn viền.

### 6.5. Giả thuyết cần kiểm tra
- Thuộc tính bị đổi tên hoặc gán nhầm, ví dụ ghi vào `border-color` nhưng không còn ghi `background` hoặc `background-color`.
- Định dạng màu sai sau khi sinh từ F#: thiếu `#`, độ dài hex không hợp lệ, hoặc nhầm thứ tự kênh alpha (`#RRGGBBAA` so với `#AARRGGBB`). Trình duyệt bỏ qua giá trị không hợp lệ, nên rơi về nền mặc định.
- Màu nền được tạo từ màu nhánh với độ trong suốt (alpha/opacity). Giá trị alpha bằng 0 hoặc bị tính sai làm nền trong suốt hoàn toàn.
- Dùng biến CSS (`var(--...)`) chưa được định nghĩa, nên giá trị rơi về mặc định (không có nền).
- Phép "làm sẫm màu" (darken) trả về giá trị rỗng hoặc NaN trong bản F#, trong khi bản TS tính đúng.
- Chuỗi style bị cắt hoặc ghi đè do thứ tự thuộc tính trong chuỗi `style` inline.

### 6.6. Đối chiếu mã nguồn & Phát hiện nguyên nhân cốt lõi

Khi kiểm tra [RefLabel.tsx](file:///d:/Kojin/neo-git-graph/src/webview/components/commit/RefLabel.tsx):
```tsx
// src/webview/components/commit/RefLabel.tsx: dòng 58-60
const pillTheme =
  gitRef.type === "tag"
    ? ...
    : gitRef.type === "remote"
      ? "bg-sky-500/15 border-sky-500/35 text-sky-300 dark:text-sky-200 ..."
      : active
        ? "bg-graph/15 border-graph font-bold text-graph-fg ..."
        : "bg-editor-fg/10 border-editor-fg/20 text-editor-fg/90 hover:bg-editor-fg/20 hover:border-editor-fg/40";
```

Đối chiếu với định nghĩa `@theme` trong [styles.css](file:///d:/Kojin/neo-git-graph/src/webview/styles.css):
```css
/* src/webview/styles.css */
@theme {
  --color-fg: var(--vscode-foreground);
  --color-editor: var(--vscode-editor-background);
  --color-graph: var(--vscode-focusBorder);
  /* KHÔNG HỀ CÓ định nghĩa --color-editor-fg hay --color-graph-fg */
}
```

> [!CAUTION]
> **Phát hiện quan trọng**: Trong Tailwind CSS v4, utility class `bg-editor-fg/10` đòi hỏi biến token màu `--color-editor-fg` phải được khai báo trong `@theme`. Do trong `styles.css` chỉ có `--color-editor` và `--color-fg`, nên token `editor-fg` hoàn toàn không tồn tại. Tailwind v4 bỏ qua class này, dẫn đến `background-color` không được sinh ra, làm cho **nền của badge rơi về `transparent` (màu nền trang)**! Tương tự, `text-graph-fg` cũng là token chưa được định nghĩa.

### 6.7. Cách tái hiện
Mở đồ thị tại đoạn có commit merge mang nhiều ref (đầu danh sách trong ảnh) và quan sát màu nền của badge. Dùng DevTools kiểm tra phần tử badge, xem giá trị `background` / `background-color` đang được tính ra.

---

## 7. Chi Tiết Lỗi 5: Node Đồ Thị & Avatar Bị Dính Sát Mép Cột Trái/Phải (BUG-05)

*(Khung chờ tiếp nhận - Sẽ cập nhật chi tiết khi có bản mô tả tiếp theo)*

- **Bối cảnh**:
- **Hiện tượng**:
- **Kết quả mong đợi**:
- **Kết quả thực tế**:
- **Giả thuyết sơ bộ**:
  - Ở Phase Avatar trước đây, dự án đã điều chỉnh `LANE_OFFSET = 16px`, `GRAPH_PADDING = 20px` và công thức `graphWidth = Math.max(0, layout.lanes - 1) * LANE_WIDTH + LANE_OFFSET * 2`.
  - Trong F# `Graph.fs`, các hằng số đang dùng: `Margin = 10.0`, `LaneWidth = 16.0`, lệch với chuẩn của Webview Preact dẫn tới mép trái và mép phải bị co lại, dính sát biên cột.

---

## 8. Chi Tiết Lỗi 6: Cuộn Trang Ảo Khiến Nhiều Avatar Không Được Nạp (BUG-06)

*(Khung chờ tiếp nhận - Sẽ cập nhật chi tiết khi có bản mô tả tiếp theo)*

- **Bối cảnh**:
- **Hiện tượng**:
- **Kết quả mong đợi**:
- **Kết quả thực tế**:
- **Giả thuyết sơ bộ**:
  - `AvatarManager` nhận hash/email nhưng cơ chế lazy-load / intersection observer bị lệch offset khi áp dụng Virtual Scrolling Window (`graph-window.store.ts`).
  - Webview chỉ nạp metadata theo cửa sổ ảo 50–100 dòng khiến hàng nằm ngoài buffer bị thiếu dữ liệu avatar hoặc cache bị reset khi cuộn nhanh.

---

## 9. Kế Hoạch Phối Hợp & Các Bước Tiếp Theo
1. Tiếp tục ghi nhận các mô tả chi tiết còn lại (BUG-05, BUG-06).
2. Xây dựng ma trận phân tích so sánh toàn diện giữa kiến trúc F# Native AOT và Webview Preact.
3. Đề xuất phương án sửa chữa đồng bộ triệt để cho toàn bộ 6 lỗi.
