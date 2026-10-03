import { useSignal } from "@preact/signals";
import { Fragment } from "preact";
import { useEffect, useMemo, useRef } from "preact/hooks";

import type { GitCommitNode } from "@/types";
import {
  AvatarZoomPreview,
  type ZoomedAvatarInfo
} from "@/webview/components/commit/AvatarZoomPreview";
import { CommitDetails } from "@/webview/components/commit/CommitDetails";
import { CommitGraph, type GraphExpansion } from "@/webview/components/commit/CommitGraph";
import { CommitHoverPanel } from "@/webview/components/commit/CommitHoverPanel";
import { CommitRow } from "@/webview/components/commit/CommitRow";
import type { ColumnResize } from "@/webview/components/commit/useColumnResize";
import { useColumnResize } from "@/webview/components/commit/useColumnResize";
import {
  COMMIT_DETAILS_HEIGHT,
  GRAPH_PADDING,
  LANE_OFFSET,
  LANE_WIDTH,
  ROW_HEIGHT,
  TABLE_HEADER_HEIGHT,
  UNCOMMITTED_CHANGES
} from "@/webview/constants";
import { toggleCommitDetails } from "@/webview/lib/actions";
import { columnWidths, commitDetails, expandedCommit } from "@/webview/lib/stores";
import {
  BUFFER_SIZE,
  graphWindowStore,
  maxLane,
  totalCommits,
  windowFrom,
  windowPaths,
  windowRows
} from "@/webview/lib/stores/graph-window.store";
import { branchColour, UNCOMMITTED_COLOUR } from "@/webview/utils/palette";

type CommitTableProps = {
  head: string | null;
  headBranch: string | null;
};

const HEADER_CLASS =
  "relative h-8 overflow-hidden border-b border-line px-3 text-left font-semibold" +
  " text-ellipsis whitespace-nowrap";

const HANDLE_CLASS = "absolute top-0 h-full w-1.5 cursor-col-resize";

/** Distance over which the graph fades out, where the column cuts it off. */
const GRAPH_FADE = 12;

/** Keep room for the graph, and for the column title when the graph is narrow. */
const MIN_GRAPH_COLUMN = 64;

function ResizeHandle({
  boundary,
  side,
  resize
}: {
  boundary: number;
  side: "left" | "right";
  resize: ColumnResize;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      tabIndex={side === "left" ? 0 : undefined}
      class={`${HANDLE_CLASS} ${side === "left" ? "left-0 border-l border-line-soft" : "right-0"}`}
      onMouseDown={(event) => resize.startResize(boundary, event)}
      onKeyDown={(event) => resize.nudge(boundary, event)}
    />
  );
}

export function CommitTable({ head, headBranch }: CommitTableProps) {
  const rows = windowRows.value;
  const paths = windowPaths.value;
  const from = windowFrom.value;
  const total = totalCommits.value;
  const maxL = maxLane.value;

  const graphColumn = Math.max(
    Math.max(0, maxL) * LANE_WIDTH + LANE_OFFSET * 2 + GRAPH_PADDING,
    MIN_GRAPH_COLUMN
  );
  const resize = useColumnResize(graphColumn);
  const sized = columnWidths.value !== null;

  const expandedHash = expandedCommit.value;
  const expandedRow = rows.findIndex((row) => row.hash === expandedHash);
  const expansion: GraphExpansion | null =
    expandedRow === -1 ? null : { row: expandedRow, height: COMMIT_DETAILS_HEIGHT };
  const isAnyExpanded = expandedCommit.value !== null;
  const hoveredRow = useSignal<number | null>(null);

  const hoverPopover = useSignal<{
    commit: GitCommitNode;
    anchorRect: DOMRect;
  } | null>(null);
  const hoverHideTimer = useRef<number | null>(null);

  const messages = useMemo(
    () => new Map(rows.map((row) => [row.hash, row.metadata?.message ?? ""])),
    [rows]
  );

  // Sync scroll position with virtual window loading
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const firstVisible = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
      const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT);
      const lastVisible = firstVisible + visibleCount;

      const currentFrom = windowFrom.value;
      const currentTo = currentFrom + windowRows.value.length;
      const count = totalCommits.value;

      if (
        (firstVisible < currentFrom + 20 && currentFrom > 0) ||
        (lastVisible > currentTo - 20 && currentTo < count)
      ) {
        const nextFrom = Math.max(0, firstVisible - BUFFER_SIZE);
        const nextTo = lastVisible + BUFFER_SIZE;
        void graphWindowStore.requestWindow(nextFrom, nextTo);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // If any commit is selected/expanded, immediately close and suppress hoverPopover
  useEffect(() => {
    if (isAnyExpanded) {
      hoverPopover.value = null;
    }
  }, [isAnyExpanded]);

  const zoomedAvatar = useSignal<ZoomedAvatarInfo | null>(null);

  const handleHoverDwell = (commit: GitCommitNode, rect: DOMRect) => {
    if (zoomedAvatar.value !== null || isAnyExpanded) {
      return;
    }
    if (hoverHideTimer.current !== null) {
      window.clearTimeout(hoverHideTimer.current);
      hoverHideTimer.current = null;
    }
    hoverPopover.value = { commit, anchorRect: rect };
  };

  const handleHoverLeave = () => {
    if (hoverHideTimer.current !== null) {
      window.clearTimeout(hoverHideTimer.current);
    }
    hoverHideTimer.current = window.setTimeout(() => {
      hoverPopover.value = null;
    }, 180);
  };

  const handlePanelMouseEnter = () => {
    if (hoverHideTimer.current !== null) {
      window.clearTimeout(hoverHideTimer.current);
      hoverHideTimer.current = null;
    }
  };

  const handlePanelMouseLeave = () => {
    hoverPopover.value = null;
  };

  const handleAvatarClick = (info: ZoomedAvatarInfo) => {
    if (zoomedAvatar.value?.commit.hash === info.commit.hash) {
      zoomedAvatar.value = null;
    } else {
      hoverPopover.value = null;
      zoomedAvatar.value = info;
    }
  };

  const titles = [
    window.l10n.graph,
    window.l10n.description,
    window.l10n.date,
    window.l10n.author,
    window.l10n.commit
  ];

  const topSpacer = from * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, (total - (from + rows.length)) * ROW_HEIGHT);

  const graphClip =
    `width: var(--col-graph); top: ${TABLE_HEADER_HEIGHT + topSpacer}px;` +
    ` mask-image: linear-gradient(to right, black calc(100% - ${GRAPH_FADE}px), transparent)`;

  return (
    <div class="relative" ref={resize.containerRef}>
      <div class="pointer-events-none absolute left-0 overflow-hidden" style={graphClip}>
        <CommitGraph
          rows={rows}
          paths={paths}
          maxLane={maxL}
          expansion={expansion}
          hoveredRow={hoveredRow.value}
          selectedRow={expandedRow}
          onAvatarClick={handleAvatarClick}
        />
      </div>
      <table
        class={`w-full cursor-default border-collapse text-ui select-none ${
          sized ? "table-fixed" : ""
        }`}
      >
        <colgroup>
          <col style="width: var(--col-graph)" />
          <col />
          <col style="width: var(--col-date)" />
          <col style="width: var(--col-author)" />
          <col style="width: var(--col-commit)" />
        </colgroup>
        <thead>
          <tr ref={resize.headRef} class={resize.resizing ? "cursor-col-resize" : ""}>
            {titles.map((title, index) => (
              <th key={title} class={HEADER_CLASS}>
                {index > 0 && <ResizeHandle boundary={index - 1} side="left" resize={resize} />}
                {title}
                {index < titles.length - 1 && (
                  <ResizeHandle boundary={index} side="right" resize={resize} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {topSpacer > 0 && <tr style={{ height: `${topSpacer}px` }} aria-hidden="true" />}
          {rows.map((row, index) => {
            const commit: GitCommitNode = row.metadata ?? {
              hash: row.hash,
              parentHashes: [],
              author: "",
              email: "",
              date: 0,
              message: row.hash,
              refs: []
            };
            const avatarRightX = row.x + 10;
            const colour = branchColour(row.color) ?? UNCOMMITTED_COLOUR;

            return (
              <Fragment key={row.hash || index}>
                <CommitRow
                  commit={commit}
                  isHead={row.hash === head}
                  headBranch={headBranch}
                  messages={messages}
                  colour={colour}
                  expanded={index === expandedRow}
                  isAnyExpanded={isAnyExpanded}
                  avatarRightX={avatarRightX}
                  onHover={(hovered) => {
                    hoveredRow.value = hovered ? index : null;
                  }}
                  onHoverDwell={handleHoverDwell}
                  onHoverLeave={handleHoverLeave}
                  onAvatarClick={handleAvatarClick}
                  onSelect={
                    row.hash === UNCOMMITTED_CHANGES
                      ? undefined
                      : () => toggleCommitDetails(row.hash)
                  }
                />
                {index === expandedRow && <CommitDetails details={commitDetails.value} />}
              </Fragment>
            );
          })}
          {bottomSpacer > 0 && <tr style={{ height: `${bottomSpacer}px` }} aria-hidden="true" />}
        </tbody>
      </table>

      {/* Floating rich commit hover panel */}
      {hoverPopover.value && !zoomedAvatar.value && !isAnyExpanded && (
        <CommitHoverPanel
          commit={hoverPopover.value.commit}
          anchorRect={hoverPopover.value.anchorRect}
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
        />
      )}

      {/* Floating 5x Avatar Deep Zoom Preview */}
      {zoomedAvatar.value && (
        <AvatarZoomPreview
          info={zoomedAvatar.value}
          onClose={() => {
            zoomedAvatar.value = null;
          }}
        />
      )}
    </div>
  );
}
