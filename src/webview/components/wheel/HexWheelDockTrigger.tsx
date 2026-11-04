import { syncStatusText } from "@/webview/lib/stores/sync.store";

import { HexWheelHub } from "./HexWheelHub";

/**
 * Nút kích hoạt buồng lái gắn cố định tại góc trái thanh công cụ đỉnh. Bao bọc
 * `HexWheelHub` (State 0 emblem) kèm chỉ báo trạng thái đồng bộ ngắn gọn.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 6).
 */
export function HexWheelDockTrigger() {
  return (
    <div class="flex items-center gap-2">
      <HexWheelHub />
      <span data-sync-status-text class="text-sm text-muted">
        {syncStatusText.value}
      </span>
    </div>
  );
}
