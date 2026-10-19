import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { viewportWidth } from "@/webview/lib/stores/layout.store";

// Bố cục tổng thể 3 phân vùng của Workspace (Nhóm Việc 5): thanh công cụ đỉnh, cây điều
// hướng trái và bảng đồ thị DAG giữa. Khung giữa nhận `flex-1 min-w-0` để chiếm trọn phần
// chiều rộng còn lại sau Sidebar (khắc phục lỗi khối giữa bị dồn trái). Khung giữa được bọc
// trong `ResizeObserver` để theo dõi chiều rộng khả dụng và gom cụm sự kiện resize bằng
// `requestAnimationFrame`, cập nhật tín hiệu `viewportWidth` mà không gây giật khung hình.
// Tham khảo thiết kế:
// docs/02_design/phase3/09_Workspace_Layout_And_Responsive_3Pane_Design.md (Mục 2.1, 2.2).

type WorkspaceLayoutProps = {
  toolbar: ComponentChildren;
  sidebar: ComponentChildren;
  graph: ComponentChildren;
};

export function WorkspaceLayout({ toolbar, sidebar, graph }: WorkspaceLayoutProps) {
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = graphRef.current;
    if (element === null) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) {
        return;
      }

      // Gom cụm nhiều sự kiện resize liên tiếp trong cùng một khung hình.
      requestAnimationFrame(() => {
        viewportWidth.value = entry.contentRect.width;
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div data-workspace-layout class="flex min-h-screen flex-col">
      {toolbar}
      <div class="flex min-h-0 flex-1 flex-row">
        {sidebar}
        <div ref={graphRef} class="relative min-w-0 flex-1">
          {graph}
        </div>
      </div>
    </div>
  );
}
