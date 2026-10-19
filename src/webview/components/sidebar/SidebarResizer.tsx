import { useRef } from "preact/hooks";

import {
  isResizing,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  sidebarWidth
} from "@/webview/lib/stores/sidebar.store";

/**
 * Thanh phân cách dọc chịu trách nhiệm kéo dãn chiều rộng Sidebar bằng chuột. Bắt sự kiện
 * `mousedown`/`mousemove`/`mouseup` trên toàn cửa sổ, kẹp giá trị trong khoảng an toàn
 * [160, 450]px và chỉ báo hoàn tất (ghi lưu trữ) khi người dùng nhả chuột.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/07_Sidebar_Navigator_Tree_Design.md (Mục 2.4).
 */
type SidebarResizerProps = {
  onResize: (newWidth: number) => void;
  onResizeEnd: (finalWidth: number) => void;
};

export function SidebarResizer({ onResize, onResizeEnd }: SidebarResizerProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  function handleMouseMove(event: MouseEvent): void {
    const deltaX = event.clientX - startXRef.current;
    const candidateWidth = startWidthRef.current + deltaX;
    const clampedWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, candidateWidth));
    onResize(clampedWidth);
  }

  function handleMouseUp(event: MouseEvent): void {
    const deltaX = event.clientX - startXRef.current;
    const candidateWidth = startWidthRef.current + deltaX;
    const clampedWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, candidateWidth));

    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    isResizing.value = false;
    onResizeEnd(clampedWidth);
  }

  function handleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    startXRef.current = event.clientX;
    startWidthRef.current = sidebarWidth.value;
    isResizing.value = true;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      data-sidebar-resizer
      class="w-1 cursor-col-resize"
      style={{ backgroundColor: "transparent", flexShrink: 0 }}
      onMouseDown={handleMouseDown}
    />
  );
}
