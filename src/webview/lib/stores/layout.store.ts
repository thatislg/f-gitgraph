import { signal } from "@preact/signals";

// Kho trạng thái bố cục 3-Pane (Nhóm Việc 5). Theo dõi chiều rộng vùng hiển thị khả dụng
// của bảng đồ thị DAG, do `WorkspaceLayout` cập nhật thông qua `ResizeObserver` kết hợp
// đệm khung hình `requestAnimationFrame` (chống Render Thrashing khi kéo Sidebar).
// Tham khảo thiết kế:
// docs/02_design/phase3/09_Workspace_Layout_And_Responsive_3Pane_Design.md.

/** Chiều rộng hiện tại (px) của vùng hiển thị bảng đồ thị DAG (Center Pane). */
export const viewportWidth = signal<number>(0);
