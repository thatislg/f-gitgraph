# Tiến Độ Giai Đoạn 3.2.UI: Trạm Chỉ Huy Bánh Xe Lục Giác & Nâng Tầm Thẩm Mỹ Cyber-Lab

Tài liệu này ghi nhận tổng quan mục tiêu, danh mục tệp tin tác động, phân rã đầu việc chi tiết theo chuẩn kiểm thử song hành (Test-Driven Task Breakdown), và tiêu chuẩn nghiệm thu cho **Phase 3.2.UI: Hiện Thực Hóa Menu Bánh Xe Lục Giác Hướng Tâm (Cyber Hex-Wheel Command Hub)** theo chu trình 4 trạng thái khởi phát từ biểu tượng F-GitGraph (`State 0 → 1 → 2 → 3`).

> [!NOTE]
> Mọi nội dung trong tài liệu này bám sát bản đặc tả kỹ thuật chi tiết:
> 📌 **Tài liệu thiết kế trực tiếp**: [10. Thiết Kế Chi Tiết Cyber Hex-Wheel Command Hub & Trải Nghiệm Giao Diện Radial Đột Phá (10_WheelConcepts.md)](../../02_design/phase3/10_WheelConcepts.md).
>
> Áp dụng triệt để 4 nguyên tắc cốt tử: **Contract-First**, **Realtime State Guarantee**, **Zero Layout Shift (Kế thừa chiều cao 28px)**, và **Kỷ luật kiểm thử TDD**.

---

## 1. Bảng Kiểm Kê Tệp Tin Tác Động (Impacted Files Inventory)

| Phân Loại | Đường Dẫn Tệp Tin | Trách Nhiệm Kỹ Thuật Chính |
| :--- | :--- | :--- |
| **Tài nguyên có sẵn** | `resources/webview-icon.svg`<br>`resources/webview-icon-dark.svg`<br>`resources/webview-icon-light.svg` | Tái sử dụng trực tiếp làm biểu tượng cốt lõi cho State 0 (Emblem nghỉ $28\text{px}$) và Nhân trung tâm của State 2 & 3. |
| **Geometry Core** | `src/webview/utils/hexGeometry.ts` | Thuật toán tọa độ 6 đỉnh lục giác đều ($R=14\text{px}$ cho State 0 và $R=34\text{px}$ cho State 2) và tọa độ 6 cánh hoa ở khoảng cách quỹ đạo $D=76\text{px}$. |
| **Reactive Store** | `src/webview/lib/stores/wheel.store.ts` | Quản lý vòng đời `wheelStage: 0 | 1 | 2 | 3`, `activePetal`, `wheelStyle`, dispatch hành động mạng qua `sync.store.ts`. |
| **Webview UI** | `src/webview/components/wheel/HexWheelHub.tsx` | Component trạm chỉ huy trung tâm 7 nhân (Center Hub + 6 Hexagon Petals) kết nối lớp kính mờ. |
| **Webview UI** | `src/webview/components/wheel/HexWheelBrandEmblem.tsx` | Component State 0 (F-GitGraph Emblem $28\text{px} \times 28\text{px}$) với chấm sáng nhịp thở (Ambient Pip Dot). |
| **Webview UI** | `src/webview/components/wheel/HexagonPetal.tsx` | Component cánh hoa lục giác đơn lẻ, hỗ trợ icon SVG, nhãn, viền phát quang và corner badge. |
| **Webview UI** | `src/webview/components/wheel/HexWheelDockTrigger.tsx` | Nút kích hoạt buồng lái chuyển đổi linh hoạt `State 0 → State 1 → State 2` tại góc trái thanh đỉnh. |
| **Webview UI** | `src/webview/components/wheel/ContextualPill.tsx` | Viên nang thông số nổi Cyber-Lab hiển thị tooltip động bên cạnh cánh hoa được hover ở State 3. |
| **Toolbar Integration**| `src/webview/components/toolbar/GlobalToolbar.tsx` | Thay thế dải 6 nút bấm phẳng bằng `HexWheelDockTrigger` và chỉ báo trạng thái ngắn gọn, giữ nguyên chiều cao $40\text{px}$. |
| **Styling Tokens** | `src/webview/styles.css` | Khai báo các biến CSS token cho 2 phong cách thẩm mỹ: Chromatic Neon và Monochromatic Cyan. |
| **Configuration** | `package.json` | Khai báo cài đặt VS Code: `f-gitgraph.ui.wheelStyle` (`chromatic` \| `monochromatic`). |
| **Unit Test** | `tests/webview/geometry/hexGeometry.test.ts` | Kiểm thử độ chính xác số học của các đỉnh và khoảng cách quỹ đạo tổ ong. |
| **Unit Test** | `tests/webview/stores/wheelStore.test.ts` | Kiểm thử chuyển đổi 4 trạng thái `0 → 1 → 2 → 3`, làm mờ cánh hoa (dimming) và dispatch mutator. |
| **Unit Test** | `tests/webview/components/HexWheelHub.test.ts` | Kiểm thử render 4 trạng thái, hover interaction, phím tắt `Esc` / `Space` và tái sử dụng icon từ `resources/`. |

---

## 2. Kế Hoạch Phân Rã Đầu Việc Chi Tiết (Test-Driven Task Breakdown)

### 🧩 Nhóm Việc 1: Bộ Thư Viện Hình Học Lục Giác & Component Nguyên Tử State 0 / 1
- [x] **Task 1.1**: Viết Unit Test `tests/webview/geometry/hexGeometry.test.ts` kiểm thử:
  - Tọa độ 6 đỉnh lục giác đỉnh nhọn (Pointy-topped) với bán kính $R=14\text{px}$ (State 0: cao $28\text{px}$) và $R=34\text{px}, 38\text{px}$ (State 2 & 3).
  - Tọa độ tâm $(\Delta X, \Delta Y)$ của 6 cánh hoa ở góc $270^\circ, 330^\circ, 30^\circ, 90^\circ, 150^\circ, 210^\circ$.
- [x] **Task 1.2**: Triển khai `src/webview/utils/hexGeometry.ts` xuất khẩu các hàm hình học.
- [x] **Task 1.3**: Triển khai component `HexWheelBrandEmblem.tsx` (State 0: Biểu tượng F-GitGraph cao $28\text{px}$, nhúng vector từ `resources/webview-icon.svg` kèm chấm sáng thở `ahead`/`behind`).
- [x] **Task 1.4**: Triển khai component `HexagonShape.tsx` và `ContextualPill.tsx`.

### 🧩 Nhóm Việc 2: Kho Trạng Thái Phản Ứng `wheel.store.ts` & Lớp Âm Học
- [x] **Task 2.1**: Viết Unit Test `tests/webview/stores/wheelStore.test.ts` kiểm thử:
  - Chu trình chuyển đổi 4 trạng thái: `armWheel` ($0 \to 1$), `disarmWheel` ($1 \to 0$), `openWheel` ($1 \to 2$), `focusPetal` ($2 \to 3$), `closeWheel` ($2/3 \to 0$).
  - Tính toán tín hiệu dẫn xuất `isPetalDimmed(id)` khi ở State 3.
  - Kích hoạt đúng hàm mutator (`push`, `pull`, `fetch`, `stash`, `pop`, `refresh`) và tự động quay về State 0.
- [x] **Task 2.2**: Triển khai `src/webview/lib/stores/wheel.store.ts` kết nối trực tiếp với `sync.store.ts`.
- [x] **Task 2.3**: Tích hợp các tín hiệu âm thanh vi mô (`micro_haptic_tick`, `iris_shutter_open`, `iris_shutter_close`, `petal_hover_tick`) thông qua Web Audio Engine của `audio.store.ts`.

### 🧩 Nhóm Việc 3: Component Trạm Chỉ Huy `HexWheelHub.tsx` & Hoạt Ảnh Hướng Tâm
- [x] **Task 3.1**: Viết Unit Test `tests/webview/components/HexWheelHub.test.ts` kiểm thử:
  - Khởi tạo ở State 0 (F-GitGraph Emblem cao $28\text{px}$).
  - Di chuột vào chuyển sang State 1 (Armed Iris màng trập 6 múi vi mô).
  - Nhấp chuột bung nở sang State 2 (Expanded Honeycomb 7 nhân).
  - Tương tác di chuột State 3: Cánh hoa được chọn nhận quầng sáng Neon, 5 cánh hoa còn lại giảm độ mờ về $0.28$.
  - Hiển thị đúng màu sắc theo 2 theme: Neon Chromatic và Cyber Blue Monochromatic.
- [x] **Task 3.2**: Triển khai component `HexagonPetal.tsx` với biểu tượng SVG, nhãn Monospace và Corner Pip Badge (`↓ N`, `↑ N`).
- [x] **Task 3.3**: Triển khai component `HexWheelHub.tsx` hoàn chỉnh với lớp kính mờ `backdrop-filter: blur(6px)`.
- [x] **Task 3.4**: Bổ sung cơ chế bấm chuột phải (Right-Click) trên PULL và PUSH để chọn biến thể nâng cao (Merge vs Rebase, Standard vs Force with lease).

### 🧩 Nhóm Việc 4: Tích Hợp `GlobalToolbar.tsx`, Phím Tắt Buồng Lái & Bất Biến Hình Học
- [x] **Task 4.1**: Triển khai `HexWheelDockTrigger.tsx` gắn cố định tại góc trái thanh công cụ đỉnh `GlobalToolbar.tsx` với chiều cao đúng $28\text{px}$.
- [x] **Task 4.2**: Bổ sung phím tắt toàn cục `Alt + W` hoặc `Ctrl + Space` để mở Bánh xe ở chế độ Floating HUD tại vị trí con trỏ chuột.
- [x] **Task 4.3**: Bổ sung cấu hình VS Code trong `package.json` (`f-gitgraph.ui.wheelStyle`).
- [x] **Task 4.4**: Viết kiểm thử bảo đảm bất biến hình học đồ thị DAG (`Zero Layout Shift Guarantee`): Độ lệch tọa độ của các nút `HexagonNode` và đường cong Bézier luôn bằng 0 pixel khi mở/đóng bánh xe. Chiều cao của Toolbar giữ nguyên $40\text{px}$.
- [x] **Task 4.5**: Chạy toàn bộ kiểm tra chất lượng: `npm run typecheck`, `npm run lint`, và toàn bộ bộ test suite Vitest.


### 🧩 Nhóm Việc 5: Chuẩn Hóa Tương Tác Hai Tầng (Hướng B) & Khung Xem Trước Commit Đồng Bộ
- [ ] **Task 5.1**: Viết Unit Test bổ sung tại `tests/webview/components/HexWheelBrandEmblem.test.ts` và `tests/webview/components/HexWheelHub.test.ts` kiểm thử:
  - Nhấp chuột trái vào 6 icon lục giác vệ tinh nhỏ ở State 1 gọi trực tiếp `executePetalAction(id)` và co thẳng về State 0.
  - Nhấp chuột trái vào Logo F-GitGraph trung tâm ở State 1 gọi `openWheel()` để bung nở State 2 (Expanded Honeycomb Hub).
  - Kiểm tra tính cách ly vùng chạm (Hitbox Isolation) giữa Logo tâm ($14\text{px}$) và 6 vệ tinh ($13\text{px}$, khoảng cách đệm $3\text{px}$).
- [ ] **Task 5.2**: Nâng cấp component `HexWheelBrandEmblem.tsx` cho State 1:
  - Mở khóa tương tác chuột (`pointer-events: auto`) cho 6 icon lục giác nhỏ vệ tinh.
  - Gắn sự kiện `onClick` gọi thẳng `executePetalAction(petal.id)` kèm `e.stopPropagation()`.
  - Bổ sung hiệu ứng vi phát quang (Micro Neon Glow) khi hover icon nhỏ; loại bỏ hoàn toàn tooltip văn bản để giữ trải nghiệm thuần icon tối giản cho Pro Users.

- [ ] **Task 5.3**: Cập nhật cơ chế điều phối tại `HexWheelHub.tsx`:
  - Phân định rạch ròi: click vào Logo tâm mở State 2 (Expanded Honeycomb Hub), click vào icon vệ tinh chạy lệnh Git nhanh.
- [ ] **Task 5.4**: Chuẩn hóa ranh giới kỹ thuật cho phase riêng biệt tiếp theo:
  - Tách độc lập tính năng bảng xem trước danh sách commit đồng bộ sang tài liệu thiết kế riêng: `11_Sync_Commit_List_Inspector_Design.md` (chuẩn bị cho phase mở rộng sau Radial Command Hub).

- [ ] **Task 5.5**: Kiểm thử hồi quy và toàn vẹn chất lượng:
  - Chạy `npm run typecheck`, `oxlint`, và bộ kiểm thử Vitest bảo đảm không hồi quy và đạt 100% tiêu chí đỗ.

---

## 3. Tiêu Chuẩn Nghiệm Thu Chặng 3.2.UI (Definition of Done)

1. **Thẩm mỹ bứt phá & Công thái học vi mô**:
   - Ở trạng thái tĩnh (State 0): Là biểu tượng F-GitGraph độc bản, kích thước cao đúng $28\text{px}$, thẳng hàng hoàn hảo với các dropdown trên thanh công cụ, triệt tiêu hoàn toàn ô nhiễm thị giác.
   - Khi di chuột (State 1): Chuyển động màng trập 6 múi mượt mà trong $120\text{ms}$.
   - Khi nhấp chuột (State 2 & 3): Cụm tổ ong 7 nhân bung nở hướng tâm 60 FPS, hội tụ trường nét làm mờ nền ấn tượng.
2. **Kế thừa chức năng 100% (Zero Regression)**:
   - Toàn bộ 6 tác vụ mạng và lưu trữ hoạt động ổn định và chính xác như Phase 3.2.
   - Các huy hiệu số đếm chênh lệch `↑ahead` và `↓behind` phản xạ tức thời theo thời gian thực.
3. **Bảo toàn hình học đồ thị & Thanh công cụ (Zero Layout Shift)**:
   - Thanh công cụ đỉnh giữ vững chiều cao $40\text{px}$ (`min-h-10`).
   - Không có bất kỳ sự xô lệch nào trên cây đồ thị SVG và bảng commit khi đóng/mở menu.
4. **Kiểm thử tự động đạt 100% tỷ lệ đỗ**:
   - Tất cả các unit test mới cho hình học, store và component đều xanh (Pass).
5. **Tách bạch hoàn hảo tương tác hai tầng (Hướng B)**:
   - Người dùng có thể thực thi ngay tác vụ Git chỉ với 1 click tại State 1 (Quick Mode) hoặc click vào Logo tâm để mở Cockpit đầy đủ (State 2 & 3).

