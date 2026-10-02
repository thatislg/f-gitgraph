import type { ComponentChildren } from "preact";

import type { GitCommitNode } from "@/backend/types";
import { getCommitNodeType, HexagonNode } from "@/webview/components/commit/HexagonNode";
import { branchColour, UNCOMMITTED_COLOUR } from "@/webview/graph/palette";
import { branchStrokes } from "@/webview/graph/strokes";
import type { GraphExpansion, GraphLayout, GraphVertex } from "@/webview/graph/types";
import { expandOffset, graphHeight, graphWidth, laneX, rowY } from "@/webview/graph/utils";
import { getWebviewConfig } from "@/webview/lib/webview-config";
import { getGitAccountAvatarUrl } from "@/webview/utils/avatar";

const SHADOW_CLASS = "fill-none stroke-editor/75 stroke-4";
const LINE_CLASS = "fill-none stroke-2";

/**
 * The branch lines and commit nodes, drawn behind the first column of the commit
 * table. The table rows set the scale: a row is `ROW_HEIGHT` high.
 * The commit nodes are drawn as hexagons with GitLens-style semantic icons
 * (merge, head, uncommitted, tag, commit).
 */
export function CommitGraph({
  layout,
  commits,
  expansion,
  hoveredRow,
  selectedRow,
  renderNodeIcon
}: {
  layout: GraphLayout;
  commits?: Array<GitCommitNode>;
  expansion: GraphExpansion | null;
  hoveredRow?: number | null;
  selectedRow?: number | null;
  /** Optional custom icon renderer to insert any icon into a commit node */
  renderNodeIcon?: (
    commit: GitCommitNode | undefined,
    vertex: GraphVertex
  ) => ComponentChildren;
}) {
  const angular = getWebviewConfig().graphStyle === "angular";
  const strokes = layout.branches.flatMap((branch) => branchStrokes(branch, angular, expansion));

  return (
    <svg
      class="block overflow-visible"
      width={graphWidth(layout)}
      height={graphHeight(layout, expansion)}
      aria-hidden="true"
    >
      {strokes.map((stroke, index) => (
        <g key={index}>
          <path class={SHADOW_CLASS} d={stroke.path} />
          <path
            class={LINE_CLASS}
            d={stroke.path}
            stroke={stroke.isCommitted ? branchColour(stroke.colour) : UNCOMMITTED_COLOUR}
          />
        </g>
      ))}
      {layout.vertices.map((vertex) => {
        const colour = vertex.isCommitted ? branchColour(vertex.colour) : UNCOMMITTED_COLOUR;
        const commit = commits?.[vertex.y];
        const nodeType = getCommitNodeType(commit, vertex);
        const avatarUrl = commit?.email ? getGitAccountAvatarUrl(commit.email) : undefined;
        const customIcon = renderNodeIcon?.(commit, vertex);
        const isHovered = hoveredRow === vertex.y;
        const isSelected = selectedRow === vertex.y;

        return (
          <HexagonNode
            key={vertex.y}
            id={commit?.hash ?? vertex.y}
            cx={laneX(vertex.x)}
            cy={rowY(vertex.y) + expandOffset(vertex.y, expansion)}
            colour={colour}
            isCurrent={vertex.isCurrent}
            isCommitted={vertex.isCommitted}
            nodeType={nodeType}
            avatarUrl={avatarUrl}
            author={commit?.author}
            isHovered={isHovered}
            isSelected={isSelected}
            icon={customIcon}
          />
        );
      })}
    </svg>
  );
}
