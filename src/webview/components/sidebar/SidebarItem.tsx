import { selectedItemId } from "@/webview/lib/stores/sidebar.store";

/**
 * Dòng hiển thị một phần tử riêng lẻ trong cây điều hướng Sidebar. Làm nổi bật nhánh
 * HEAD đang checkout bằng chữ in đậm + viền trái tím Neon `#a855f7`, hiển thị số commit
 * chưa push `↑N` màu hổ phách, và đánh dấu phần tử đang được chọn (single-selection)
 * bằng icon checkmark — áp dụng đồng nhất cho local branch, remote branch, tag và stash.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/07_Sidebar_Navigator_Tree_Design.md (Mục 2.3).
 */
type SidebarItemType = "working-tree" | "branch" | "remote-branch" | "tag" | "stash";

type SidebarItemProps = {
  itemId: string;
  type: SidebarItemType;
  label: string;
  isHead?: boolean;
  aheadCount?: number;
  secondaryLabel?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (event: MouseEvent) => void;
};

const TYPE_ICON_PATHS: Record<SidebarItemType, string> = {
  "working-tree": "M3 3h4l2 2h4v8H3V3z",
  branch: "M5 2v12M5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM11 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 8H5",
  "remote-branch": "M5 2v12M5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM11 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 8H5",
  tag: "M8 2l6 6-6 6-6-6V2h6zM7 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  stash: "M3 3h10v4H3V3zM3 7h10v6H3V7z"
};

export function SidebarItem({
  itemId,
  type,
  label,
  isHead = false,
  aheadCount = 0,
  secondaryLabel,
  onClick,
  onDoubleClick,
  onContextMenu
}: SidebarItemProps) {
  const isSelected = selectedItemId.value === itemId;

  const baseStyle = {
    height: "22px",
    cursor: "pointer",
    color: isHead ? "#f8fafc" : "#cbd5e1",
    fontWeight: isHead ? 700 : 400,
    backgroundColor: isHead
      ? "rgba(168, 85, 247, 0.1)"
      : isSelected
        ? "rgba(168, 85, 247, 0.12)"
        : "transparent",
    borderLeft: isHead
      ? "3px solid #a855f7"
      : isSelected
        ? "3px solid #a855f7"
        : "3px solid transparent",
    paddingLeft: isHead || isSelected ? "17px" : "20px"
  };

  return (
    <div
      data-item-id={itemId}
      data-item-type={type}
      role="treeitem"
      tabIndex={-1}
      aria-selected={isSelected || undefined}
      class="flex items-center gap-1.5 pr-2 hover:bg-[rgba(255,255,255,0.05)]"
      style={baseStyle}
      onClick={onClick}
      onDblClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d={TYPE_ICON_PATHS[type]} stroke="currentColor" stroke-width="1.5" />
      </svg>

      <span class="flex-1 truncate">{label}</span>

      {isSelected && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ color: "#a855f7" }}
        >
          <path d="M4 8l2.5 2.5L12 5" stroke="currentColor" stroke-width="1.5" />
        </svg>
      )}

      {aheadCount > 0 && (
        <span
          class="font-mono text-[10px] font-bold leading-none"
          style={{ color: "#fbbf24" }}
          data-ahead-count={aheadCount}
        >
          ↑{aheadCount}
        </span>
      )}

      {secondaryLabel !== undefined && (
        <span class="truncate text-[10px]" style={{ color: "#64748b" }}>
          {secondaryLabel}
        </span>
      )}
    </div>
  );
}
