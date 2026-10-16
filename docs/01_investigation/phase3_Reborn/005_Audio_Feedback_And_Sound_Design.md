# 005. Thiết Kế Phản Hồi Âm Thanh & Sound FX (Audio Feedback & Sound Design)

> **Dự án**: F-GitGraph Reborn  
> **Ngôn ngữ âm thanh**: **"Cyber-Lab Micro-Acoustics"** — Phản hồi âm thanh vi mô tinh tế, dịu tai, đậm chất xúc giác cơ khí công nghệ cao (Tactile & High-Tech Lab Instrument).  
> **Trạng thái**: Đã được chuẩn hóa thành tài liệu thiết kế kỹ thuật chính thức tại: [docs/02_design/phase3/04_Audio_Feedback_And_Sound_Design.md](../../02_design/phase3/04_Audio_Feedback_And_Sound_Design.md) (tuân thủ triết lý Design by Word, Zero Code Samples).

---

## 1. Tầm Nhìn & Triết Lý Âm Thanh: "Xúc Giác Kỹ Thuật Số" (Digital Tactility)

Trong trải nghiệm người dùng hiện đại (được tiên phong bởi các công cụ như Linear, Raycast, Teenage Engineering, và các bàn phím cơ high-end), **âm thanh phản hồi vi mô (micro-audio feedback)** mang lại cảm giác thỏa mãn và tin cậy cực lớn khi hoàn thành một tác vụ:

- Khi lập trình viên gõ `Ctrl+Enter` commit thành công: Một tiếng chốt cơ khí êm ái vang lên xác nhận mã nguồn đã được bảo vệ vào lịch sử Git.
- Khi đẩy code lên server (`git push`) thành công: Một âm sắc thanh thoát báo hiệu công việc đã được đồng bộ với đội ngũ.
- Khi gặp xung đột (Merge Conflict): Một tiếng xung cảnh báo tần số thấp (low-frequency pulse) nhắc nhở nhẹ nhàng thay vì những tiếng còi chói gắt giật mình.

---

## 2. Các Nguyên Tắc Thiết Kế Bất Khả Xâm Phạm (Non-Negotiable Principles)

1. **Quyền Kiểm Soát Thuộc Về Người Dùng (Mặc định & Tùy chọn Tắt/Bật)**:
   - Âm thanh là tính năng mang tính cảm xúc cao, một số lập trình viên thích tĩnh lặng tuyệt đối. Vì vậy:
     - Cung cấp cài đặt master: `f-gitgraph.soundEffects.enabled` (cho phép bật/tắt toàn bộ).
     - Thanh trượt âm lượng: `f-gitgraph.soundEffects.volume` (mặc định $30\% - 40\%$, dịu nhẹ vừa đủ nghe).
     - Phím tắt bật/tắt nhanh âm thanh ngay trên giao diện.
2. **Tinh Tế & Không Gây Ức Chế (Subtle, Calming & Non-Intrusive)**:
   - Tuyệt đối không dùng âm thanh 8-bit game chói tai, không dùng tiếng còi báo động gây giật mình.
   - Thời lượng mỗi âm thanh cực ngắn: từ $50\text{ms}$ đến $250\text{ms}$.
   - Tần số âm thanh được cắt gọt mượt mà (Low-pass filter), độ suy hao mềm mại (smooth exponential decay).
3. **Hiệu Năng & Trọng Lượng Bằng 0 (Zero Asset Overhead via Web Audio API)**:
   - Không nạp các file `.mp3` hay `.wav` nặng nề làm phình to gói cài đặt VSIX.
   - Sử dụng trực tiếp **Web Audio API** của trình duyệt/Webview để tổng hợp sóng âm theo công thức toán học (`OscillatorNode`, `GainNode`, `BiquadFilterNode`):
     - Dung lượng mã nguồn: $< 5\text{KB}$ code JavaScript.
     - Độ trễ kích hoạt: $0\text{ms}$ (tức thời, không cần chờ nạp file qua mạng).

---

## 3. Bản Đồ Các Sự Kiện Âm Thanh (Soundscape Events Mapping)

| Sự Kiện Git / Tương Tác       | Tên Sound Event     | Cảm Giác Âm Thanh (Acoustic Persona)             |     Thời Lượng      | Mô Tả Kỹ Thuật Tổng Hợp                                                                                                                                         |
| :---------------------------- | :------------------ | :----------------------------------------------- | :-----------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Commit Thành Công**         | `commit.success`    | Tiếng chốt cơ khí của máy ảnh Leica / Lẫy cơ khí | $\sim 80\text{ms}$  | Sóng Sine tần số $800\text{Hz} \rightarrow 200\text{Hz}$ kết hợp White Noise burst nhẹ ($10\text{ms}$) mô phỏng tiếng click vật lý.                             |
| **Push Hoàn Tất**             | `push.success`      | Âm thăng hoa nhẹ nhàng (Ascending Shimmer)       | $\sim 180\text{ms}$ | Hai nốt nhạc thăng hoa cách nhau quãng 5 ($523\text{Hz} \rightarrow 784\text{Hz}$ - C5 $\rightarrow$ G5), tạo cảm giác nhẹ nhõm khi code đã lên remote an toàn. |
| **Pull / Fetch Dữ Liệu**      | `pull.sync`         | Tiếng xung sóng dữ liệu (Data Ripple)            | $\sim 120\text{ms}$ | Sóng Triangle tần số trung tính trượt êm ái.                                                                                                                    |
| **Chuyển Nhánh (Checkout)**   | `branch.checkout`   | Tiếng công tắc cơ học (Mechanical Toggle Switch) | $\sim 45\text{ms}$  | Tiếng click dứt khoát, thanh gọn.                                                                                                                               |
| **Cất Stash (Stash Save)**    | `stash.store`       | Tiếng trượt đóng ngăn kéo kim loại êm ái         | $\sim 150\text{ms}$ | Sweep âm tần thấp đi xuống ($400\text{Hz} \rightarrow 150\text{Hz}$) với low-pass filter.                                                                       |
| **Bung Stash (Stash Pop)**    | `stash.pop`         | Tiếng mở lẫy kim loại                            | $\sim 150\text{ms}$ | Sweep âm đi lên ($200\text{Hz} \rightarrow 500\text{Hz}$).                                                                                                      |
| **Xung Đột (Conflict Alert)** | `conflict.detected` | Xung trầm nhắc nhở (Warm Low-Frequency Pulse)    | $\sim 250\text{ms}$ | Hợp âm trầm ấm ($130\text{Hz}$ và $196\text{Hz}$), cảnh báo vừa đủ nhưng không làm giật mình.                                                                   |
| **Stage / Unstage Tệp**       | `file.stage`        | Tiếng gắp vật lý vi mô (Micro Snap)              | $\sim 30\text{ms}$  | Click siêu ngắn tần số cao tạo phản hồi xúc giác khi nhấp chuột.                                                                                                |

---

## 4. Nguyên Lý Kỹ Thuật Tổng Hợp Âm Thanh Web Audio API (Chuẩn Hóa Design by Word)

> [!IMPORTANT]
> **Tuân thủ quy chuẩn RULE-TECHNICAL-DESIGN-BY-WORD**: Đoạn mã nháp (Draft Code) trước đây đã được gỡ bỏ hoàn toàn khỏi tài liệu. Toàn bộ giải thuật tổng hợp âm thanh được mô hình hóa bằng nguyên lý kỹ thuật và toán học sóng âm:

1. **Khởi Tạo Lười & Cơ Chế Phục Hồi Ngữ Cảnh (Lazy AudioContext & Resume)**:
   - Ngữ cảnh `AudioContext` không được tạo sẵn mà chỉ khởi tạo khi nhận cử chỉ tương tác đầu tiên của người dùng trên Webview nhằm tuân thủ chính sách Autoplay Policy của trình duyệt.
   - Khi trạng thái ngữ cảnh bị tạm đình chỉ (`state === "suspended"`), hệ thống chủ động gọi phương thức kích hoạt lại (`resume`) trước khi kết nối các nút dao động.
2. **Cấu Trúc Điều Biến Tần Số & Phong Bì Biên Độ (Frequency & Gain Modulation)**:
   - Thay vì nạp tệp âm thanh ghi sẵn, âm thanh được tạo ra bằng các nút dao động sóng Sine và sóng Triangle kết hợp bộ lọc thông thấp (`BiquadFilterNode`).
   - Đường cong biên độ sử dụng hàm số mũ (`exponentialRampToValueAtTime`) đưa âm lượng về mức cận 0 ($0.001$) trong thời lượng từ $25\text{ms}$ đến $190\text{ms}$, triệt tiêu hoàn toàn tiếng nổ lách tách do ngắt sóng đột ngột.
3. **Đặc Tả Chi Tiết Từng Âm Thanh**:
   - Vui lòng xem bản thiết kế kỹ thuật chuẩn hóa đầy đủ tại: [04. Thiết Kế Phản Hồi Âm Thanh & Âm Học Vi Mô Cyber-Lab](../../02_design/phase3/04_Audio_Feedback_And_Sound_Design.md).

---

## 5. Lộ Trình Triển Khai

1. **Khởi tạo và Thử nghiệm Nội bộ**: Sau khi hoàn thành xong giao diện và logic của Phase 3.1 (Staging & Commit Composer) và 3.2 (Toolbar đồng bộ).
2. **Tích hợp Tùy chọn Cài đặt**: Bổ sung `f-gitgraph.soundEffects.enabled` vào cấu hình `package.json`.
3. **Kiểm tra Phản hồi**: Tinh chỉnh tần số và âm lượng để đảm bảo trải nghiệm xúc giác đem lại cảm giác tự hào và thích thú cho lập trình viên mỗi lần commit và push code.
