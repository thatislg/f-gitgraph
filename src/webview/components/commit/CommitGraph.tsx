import type { ComponentChildren } from "preact";

import type { GitCommitNode, GraphPath, GraphRow } from "@/types";
import type { ZoomedAvatarInfo } from "@/webview/components/commit/AvatarZoomPreview";
import { getCommitNodeType, HexagonNode } from "@/webview/components/commit/HexagonNode";
import { GRAPH_PADDING, LANE_OFFSET, LANE_WIDTH, ROW_HEIGHT } from "@/webview/constants";
import { getGitAccountAvatarUrl } from "@/webview/utils/avatar";
import { branchColour, UNCOMMITTED_COLOUR } from "@/webview/utils/palette";

const SHADOW_CLASS = "fill-none stroke-editor/75 stroke-4";
const LINE_CLASS = "fill-none stroke-2";

export type GraphExpansion = {
  row: number;
  height: number;
};

/**
 * The branch lines and commit nodes, rendered directly from F# Core Engine geometry
 * (Dumb Renderer). No client-side layout math is performed.
 */
export function CommitGraph({
  rows,
  paths,
  maxLane = 0,
  expansion = null,
  hoveredRow,
  selectedRow,
  head,
  renderNodeIcon,
  onAvatarClick
}: {
  rows: Array<GraphRow>;
  paths: Array<GraphPath>;
  maxLane?: number;
  expansion?: GraphExpansion | null;
  hoveredRow?: number | null | undefined;
  selectedRow?: number | null | undefined;
  head?: string | null | undefined;
  /** Optional custom icon renderer to insert any icon into a commit node */
  renderNodeIcon?: (commit: GitCommitNode | undefined, row: GraphRow) => ComponentChildren;
  onAvatarClick?: ((info: ZoomedAvatarInfo) => void) | undefined;
}) {
  const width = Math.max(0, maxLane) * LANE_WIDTH + LANE_OFFSET * 2 + GRAPH_PADDING;
  const height = rows.length * ROW_HEIGHT + (expansion?.height ?? 0);

  return (
    <svg class="block overflow-visible" width={width} height={height} aria-hidden="true">
      {paths.map((path, index) => (
        <g key={index}>
          <path class={SHADOW_CLASS} d={path.d} />
          <path
            class={LINE_CLASS}
            d={path.d}
            stroke={branchColour(path.color) ?? UNCOMMITTED_COLOUR}
          />
        </g>
      ))}
      {rows.map((row, index) => {
        const colour = branchColour(row.color) ?? UNCOMMITTED_COLOUR;
        const commit = row.metadata;
        const isCurrent = head
          ? row.hash === head
          : Boolean(commit?.refs?.some((r) => r.type === "head"));
        const nodeType = getCommitNodeType(commit, {
          isCurrent,
          isCommitted: true,
          isMerge: row.isMerge
        });
        const avatarUrl = commit?.email ? getGitAccountAvatarUrl(commit.email) : undefined;
        const customIcon = renderNodeIcon?.(commit, row);
        const isHovered = hoveredRow === index;
        const isSelected = selectedRow === index;

        const expandOffset = expansion !== null && index > expansion.row ? expansion.height : 0;
        const cy = row.y + expandOffset;

        return (
          <HexagonNode
            key={row.hash || index}
            id={commit?.hash ?? row.hash ?? index}
            cx={row.x}
            cy={cy}
            colour={colour}
            isCurrent={isCurrent}
            isCommitted={true}
            nodeType={nodeType}
            avatarUrl={avatarUrl}
            author={commit?.author}
            isHovered={isHovered}
            isSelected={isSelected}
            icon={customIcon}
            onAvatarClick={(info) => {
              if (commit) {
                onAvatarClick?.({
                  commit,
                  anchorRect: info.rect,
                  colour: info.colour,
                  author: info.author,
                  nodeType: info.nodeType,
                  avatarUrl: info.avatarUrl
                });
              }
            }}
          />
        );
      })}
    </svg>
  );
}
