import { useEffect, useRef } from "preact/hooks";

import { syncStatusText } from "@/webview/lib/stores/sync.store";
import { openWheel } from "@/webview/lib/stores/wheel.store";

import { HexWheelHub } from "./HexWheelHub";

/**
 * Nút kích hoạt buồng lái gắn cố định tại góc trái thanh công cụ đỉnh. Bao bọc
 * `HexWheelHub` (State 0 emblem) kèm chỉ báo trạng thái đồng bộ ngắn gọn, đồng thời đăng
 * ký phím tắt toàn cục `Alt + W` / `Ctrl + Space` để triệu hồi Bánh xe ở chế độ Floating HUD.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 6).
 */
export function HexWheelDockTrigger() {
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      lastMouse.current = { x: event.clientX, y: event.clientY };
    }
    function onKeyDown(event: KeyboardEvent) {
      const isAltW = event.altKey && event.key.toLowerCase() === "w";
      const isCtrlSpace = event.ctrlKey && event.key === " ";
      if (isAltW || isCtrlSpace) {
        event.preventDefault();
        openWheel({ x: lastMouse.current.x, y: lastMouse.current.y });
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div class="flex items-center gap-2">
      <HexWheelHub />
      <span data-sync-status-text class="text-sm text-muted">
        {syncStatusText.value}
      </span>
    </div>
  );
}
