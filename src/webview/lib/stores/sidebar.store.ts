import { computed, signal } from "@preact/signals";

/**
 * Kho trạng thái thu gọn/mở rộng của cây điều hướng Sidebar bên trái. Cấu trúc tối
 * thiểu phục vụ nút Sidebar Quick Toggle trên thanh công cụ đỉnh, sẵn sàng bàn giao
 * mở rộng cho Nhóm Việc 3 (Sidebar Navigator đầy đủ).
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 3.5).
 */

/** Trạng thái thu gọn của cây điều hướng Sidebar bên trái. */
export const isSidebarCollapsed = signal(false);

/** Tooltip tiếng Anh hiển thị khi rê chuột qua nút chuyển đổi Sidebar. */
export const sidebarToggleTooltip = computed(() =>
  isSidebarCollapsed.value ? "Expand sidebar navigator" : "Collapse sidebar navigator"
);

/** Đảo trạng thái mở/đóng của Sidebar. */
export function toggleSidebar(): void {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}
