import { useRef } from "preact/hooks";

import type { StashRecord } from "@/types";
import { openContextMenu } from "@/webview/lib/actions";
import { sidebarRemoteBranchMenu } from "@/webview/lib/menus";
import { remoteBranchesLoading } from "@/webview/lib/stores";
import {
  checkoutBranchAction,
  checkoutRemoteBranchAction,
  createBranchAction,
  effectiveSidebarWidth,
  expandedSectionIds,
  isSidebarCollapsed,
  openWorkingTreeAction,
  selectItem,
  setSidebarWidth,
  sidebarToggleTooltip,
  toggleSection,
  toggleSidebar
} from "@/webview/lib/stores/sidebar.store";

import { SidebarItem } from "./SidebarItem";
import { SidebarResizer } from "./SidebarResizer";
import { SidebarSection } from "./SidebarSection";

/**
 * Phần tử nhánh cục bộ trong cây điều hướng Sidebar, kèm số đếm commit chưa push.
 * Được ánh xạ từ tín hiệu `branchList` (mảng tên nhánh) tại tầng `App.tsx`.
 */
export type BranchItem = {
  name: string;
  isHead: boolean;
  aheadCount: number;
  upstream: string | null;
};

/**
 * Nhóm remote theo tên (ví dụ `origin`) cùng danh sách nhánh theo dõi tương ứng.
 * Chưa có bộ truy vấn remote riêng nên thường nhận mảng rỗng cho đến Nhóm Việc 5.
 */
export type RemoteGroup = {
  name: string;
  branches: string[];
};

type SidebarNavigatorProps = {
  branches: BranchItem[];
  currentHead: string | null;
  remotes: RemoteGroup[];
  tags: string[];
  stashes: StashRecord[];
  unstagedCount: number;
  stagedCount: number;
};

/** Mã định danh dòng Working Tree hợp lệ cho hàm `selectItem`. */
const WORKING_TREE_ITEM_ID = "working-tree:changes";

/** Bộ chọn các phần tử có thể nhận tiêu điểm trong cây (tiêu đề nhóm + item con). */
const FOCUSABLE_SELECTOR = '[id^="section-header-"], [role="treeitem"]';

/**
 * Container bao bọc toàn bộ cây điều hướng Sidebar bên trái: tiêu đề `WORKSPACE`, nút
 * thu gọn, 5 phân nhóm tài nguyên Git và thanh phân cách co giãn. Cung cấp điều hướng
 * bàn phím WAI-ARIA Tree View (mũi tên 4 chiều, Home/End, Enter).
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/07_Sidebar_Navigator_Tree_Design.md (Mục 2.1 & 4.2).
 */
export function SidebarNavigator({
  branches,
  currentHead,
  remotes,
  tags,
  stashes,
  unstagedCount,
  stagedCount
}: SidebarNavigatorProps) {
  const treeRef = useRef<HTMLDivElement>(null);

  const totalChanges = unstagedCount + stagedCount;
  const remoteBranchCount = remotes.reduce((sum, group) => sum + group.branches.length, 0);

  function focusableNodes(): HTMLElement[] {
    return Array.from(treeRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const nodes = focusableNodes();
    if (nodes.length === 0) {
      return;
    }

    const active = document.activeElement as HTMLElement | null;
    const index = active === null ? -1 : nodes.indexOf(active);

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = index < 0 ? 0 : (index + 1) % nodes.length;
        nodes[next]?.focus();
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prev = index <= 0 ? nodes.length - 1 : index - 1;
        nodes[prev]?.focus();
        break;
      }
      case "Home": {
        event.preventDefault();
        nodes[0]?.focus();
        break;
      }
      case "End": {
        event.preventDefault();
        nodes[nodes.length - 1]?.focus();
        break;
      }
      case "ArrowRight":
      case "ArrowLeft": {
        if (active !== null && active.id.startsWith("section-header-")) {
          event.preventDefault();
          const sectionId = active.id.slice("section-header-".length);
          const isExpanded = expandedSectionIds.value.has(sectionId);
          if (
            (event.key === "ArrowRight" && !isExpanded) ||
            (event.key === "ArrowLeft" && isExpanded)
          ) {
            toggleSection(sectionId);
          }
        }
        break;
      }
      case "Enter": {
        if (active !== null && active.getAttribute("role") === "treeitem") {
          event.preventDefault();
          active.click();
        }
        break;
      }
      default:
        break;
    }
  }

  return (
    <div
      data-sidebar-navigator
      class="flex shrink-0 overflow-hidden"
      style={{
        width: `${effectiveSidebarWidth.value}px`,
        opacity: isSidebarCollapsed.value ? 0 : 1,
        pointerEvents: isSidebarCollapsed.value ? "none" : "auto",
        transition: "width 150ms ease-in-out, opacity 150ms ease-in-out"
      }}
    >
      <aside class="flex min-w-0 flex-1 flex-col border-r border-line">
        <header class="flex h-8 shrink-0 items-center justify-between gap-1 border-b border-line px-2">
          <span
            class="truncate font-mono text-[11px] font-bold tracking-widest text-[#94a3b8]"
            title="Repository resources explorer"
          >
            WORKSPACE
          </span>
          <button
            type="button"
            aria-label={sidebarToggleTooltip.value}
            title={sidebarToggleTooltip.value}
            class="cursor-pointer text-[#94a3b8] hover:text-[#e2e8f0]"
            onClick={toggleSidebar}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 3h12v10H2zM9 3v10M14 3v10" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </button>
        </header>

        <div
          role="tree"
          aria-label="Workspace resources explorer"
          class="flex-1 overflow-y-auto py-1"
          ref={treeRef}
          onKeyDown={handleKeyDown}
        >
          <SidebarSection
            id="working-tree"
            title="WORKING TREE"
            isExpanded={expandedSectionIds.value.has("working-tree")}
            badgeCount={totalChanges}
            onToggle={() => toggleSection("working-tree")}
          >
            <SidebarItem
              itemId={WORKING_TREE_ITEM_ID}
              type="working-tree"
              label={`Changes (${totalChanges})`}
              onClick={openWorkingTreeAction}
            />
          </SidebarSection>

          <SidebarSection
            id="branches"
            title="LOCAL BRANCHES"
            isExpanded={expandedSectionIds.value.has("branches")}
            badgeCount={branches.length}
            onToggle={() => toggleSection("branches")}
            actionIcon="+"
            onAction={createBranchAction}
          >
            {branches.map((branch) => (
              <SidebarItem
                key={branch.name}
                itemId={`branch:${branch.name}`}
                type="branch"
                label={branch.name}
                isHead={branch.isHead || branch.name === currentHead}
                aheadCount={branch.aheadCount}
                onClick={() => selectItem(`branch:${branch.name}`)}
                onDoubleClick={() => checkoutBranchAction(branch.name)}
              />
            ))}
          </SidebarSection>

          <SidebarSection
            id="remotes"
            title="REMOTES"
            isExpanded={expandedSectionIds.value.has("remotes")}
            badgeCount={remoteBranchCount}
            onToggle={() => toggleSection("remotes")}
          >
            {remoteBranchCount === 0 &&
              (remoteBranchesLoading.value ? (
                <span class="block truncate px-5 py-1 text-[11px] text-[#64748b]">
                  Loading remote branches…
                </span>
              ) : (
                <span class="block truncate px-5 py-1 text-[11px] text-[#64748b]">
                  No remote branches
                </span>
              ))}
            {remotes.map((group) =>
              group.branches.map((branch) => {
                const label = `${group.name}/${branch}`;
                return (
                  <SidebarItem
                    key={label}
                    itemId={`remote:${label}`}
                    type="remote-branch"
                    label={label}
                    onClick={() => selectItem(`remote:${label}`)}
                    onDoubleClick={() => checkoutRemoteBranchAction(group.name, branch)}
                    onContextMenu={(event) =>
                      openContextMenu(
                        event,
                        `remote:${label}`,
                        sidebarRemoteBranchMenu(group.name, branch)
                      )
                    }
                  />
                );
              })
            )}
          </SidebarSection>

          <SidebarSection
            id="tags"
            title="TAGS"
            isExpanded={expandedSectionIds.value.has("tags")}
            badgeCount={tags.length}
            onToggle={() => toggleSection("tags")}
          >
            {tags.length === 0 && (
              <span class="block truncate px-5 py-1 text-[11px] text-[#64748b]">No tags</span>
            )}
            {tags.map((tag) => (
              <SidebarItem
                key={tag}
                itemId={`tag:${tag}`}
                type="tag"
                label={tag}
                onClick={() => selectItem(`tag:${tag}`)}
              />
            ))}
          </SidebarSection>

          <SidebarSection
            id="stashes"
            title="STASHES"
            isExpanded={expandedSectionIds.value.has("stashes")}
            badgeCount={stashes.length}
            onToggle={() => toggleSection("stashes")}
          >
            {stashes.length === 0 && (
              <span class="block truncate px-5 py-1 text-[11px] text-[#64748b]">
                No stashes saved
              </span>
            )}
            {stashes.map((stash) => (
              <SidebarItem
                key={stash.index}
                itemId={`stash:${stash.index}`}
                type="stash"
                label={`stash@{${stash.index}}`}
                secondaryLabel={stash.message}
                onClick={() => selectItem(`stash:${stash.index}`)}
              />
            ))}
          </SidebarSection>
        </div>
      </aside>

      <SidebarResizer
        onResize={(width) => setSidebarWidth(width, false)}
        onResizeEnd={(width) => setSidebarWidth(width, true)}
      />
    </div>
  );
}
