import type { ComponentChildren } from "preact";

/**
 * Khung phân nhóm có thể gập/mở (Collapsible Accordion) trong cây điều hướng Sidebar.
 * Tiêu đề in hoa kiểu Monospace, icon chevron xoay 90° khi mở, huy hiệu số lượng phần tử
 * và nút tác vụ vi mô (`+`) tùy chọn. Thân nhóm bị ẩn khỏi DOM khi gập lại.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/07_Sidebar_Navigator_Tree_Design.md (Mục 2.2).
 */
type SidebarSectionProps = {
  id: string;
  title: string;
  isExpanded: boolean;
  badgeCount?: number;
  onToggle: () => void;
  actionIcon?: string;
  onAction?: () => void;
  children: ComponentChildren;
};

export function SidebarSection({
  id,
  title,
  isExpanded,
  badgeCount,
  onToggle,
  actionIcon,
  onAction,
  children
}: SidebarSectionProps) {
  return (
    <section data-section-id={id}>
      <div
        id={`section-header-${id}`}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        class="flex h-6 cursor-pointer items-center gap-1 px-2 select-none"
        style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 700, color: "#94a3b8" }}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
          style={{
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 150ms ease-in-out"
          }}
        >
          <path d="M6 4l4 4-4 4V4z" />
        </svg>

        <span class="flex-1 truncate uppercase tracking-wide">{title}</span>

        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            class="rounded-full px-1 font-mono text-[10px] leading-none"
            style={{ color: "#cbd5e1", backgroundColor: "rgba(255, 255, 255, 0.08)" }}
          >
            {badgeCount}
          </span>
        )}

        {actionIcon !== undefined && (
          <button
            type="button"
            class="cursor-pointer px-0.5 leading-none text-[#94a3b8] hover:text-[#e2e8f0]"
            aria-label={`${title} action`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAction?.();
            }}
          >
            {actionIcon}
          </button>
        )}
      </div>

      {isExpanded && <div role="group">{children}</div>}
    </section>
  );
}
