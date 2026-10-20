import { signal } from "@preact/signals";

/**
 * Kho trạng thái cho thanh tải chặn toàn màn hình (Blocking Loading Bar). Mô hình hóa một
 * thao tác đơn lẻ đang chạy (`activeOperation`) kèm đồng hồ đếm giây (`elapsedSeconds`) để
 * phân biệt rõ "đang chạy" với "đã xong", đồng thời chặn toàn bộ tương tác khác trong lúc
 * thao tác mạng/stash đang thực thi (push, pull, fetch, stash, pop).
 *
 * Chỉ một thao tác được phép chạy tại một thời điểm (được bảo vệ bởi `isNetworkBusy` ở
 * `sync.store.ts`), nên một tín hiệu `activeOperation` đơn lẻ là đủ.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 3.1).
 */

/** Loại thao tác được theo dõi bởi thanh tải. */
export type OperationKind = "fetch" | "pull" | "push" | "stash" | "pop";

/** Thao tác đang chạy, hoặc `null` khi không có gì đang tải. */
export const activeOperation = signal<{ kind: OperationKind; startedAt: number } | null>(null);

/** Số giây đã trôi qua kể từ khi thao tác bắt đầu (tăng mỗi 100ms khi đang chạy). */
export const elapsedSeconds = signal(0);

let timerHandle: ReturnType<typeof setInterval> | null = null;

/** Bắt đầu một thao tác chặn: ghi lại nhãn + mốc thời gian và khởi động đồng hồ đếm giây. */
export function startOperation(kind: OperationKind): void {
  activeOperation.value = { kind, startedAt: Date.now() };
  elapsedSeconds.value = 0;

  if (timerHandle === null) {
    timerHandle = setInterval(() => {
      const operation = activeOperation.value;
      if (operation !== null) {
        elapsedSeconds.value = (Date.now() - operation.startedAt) / 1000;
      }
    }, 100);
  }
}

/** Kết thúc thao tác: xóa trạng thái và dừng đồng hồ để giải phóng interval. */
export function finishOperation(): void {
  activeOperation.value = null;
  elapsedSeconds.value = 0;

  if (timerHandle !== null) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}
