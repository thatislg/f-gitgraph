import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";

import type { GitCommitNode } from "@/types";
import { UNCOMMITTED_CHANGES } from "@/webview/constants";
import { HEXAGON_ICON_SIZE, HEXAGON_RADIUS } from "@/webview/graph/constants";

export type CommitNodeType = "commit" | "merge" | "head" | "uncommitted" | "tag" | "stash";

/**
 * Calculates SVG polygon points for a regular hexagon.
 * @param cx Center X coordinate
 * @param cy Center Y coordinate
 * @param r Hexagon radius from center to vertices (default: HEXAGON_RADIUS = 7)
 * @param pointy If true (default), orient with points at top and bottom (aligns with vertical branch lines)
 */
export function hexagonPoints(
  cx: number,
  cy: number,
  r: number = HEXAGON_RADIUS,
  pointy = true
): string {
  if (pointy) {
    // Pointy-topped hexagon (top and bottom points align with vertical branch lines)
    const dx = r * 0.8660254; // r * Math.sin(Math.PI / 3)
    const dy = r * 0.5;
    return [
      `${cx},${cy - r}`,
      `${cx + dx},${cy - dy}`,
      `${cx + dx},${cy + dy}`,
      `${cx},${cy + r}`,
      `${cx - dx},${cy + dy}`,
      `${cx - dx},${cy - dy}`
    ].join(" ");
  }

  // Flat-topped hexagon (flat horizontal top and bottom)
  const dx = r * 0.5;
  const dy = r * 0.8660254;
  return [
    `${cx + r},${cy}`,
    `${cx + dx},${cy + dy}`,
    `${cx - dx},${cy + dy}`,
    `${cx - r},${cy}`,
    `${cx - dx},${cy - dy}`,
    `${cx + dx},${cy - dy}`
  ].join(" ");
}

/**
 * Determines the semantic node type based on commit information and vertex state,
 * matching GitLens convention.
 */
export function getCommitNodeType(
  commit?: GitCommitNode,
  vertex?: { isCurrent?: boolean; isCommitted?: boolean; isMerge?: boolean }
): CommitNodeType {
  if (commit?.hash === UNCOMMITTED_CHANGES || vertex?.isCommitted === false) {
    return "uncommitted";
  }
  if (vertex?.isMerge || (commit?.parentHashes && commit.parentHashes.length > 1)) {
    return "merge";
  }
  if (vertex?.isCurrent) {
    return "head";
  }
  if (commit?.refs?.some((ref) => ref.type === "tag")) {
    return "tag";
  }
  return "commit";
}

/* Built-in GitLens-style SVG icon paths (standard 16x16 coordinate space) */

export function MergeIconPath() {
  return (
    <path d="M11 6a3 3 0 1 0-2.83 2H7a1 1 0 0 1-1-1V5.83a3 3 0 1 0-2 0v4.34a3 3 0 1 0 2 0V9a3 3 0 0 0 3-3h1.17A3 3 0 0 0 11 6zM4 3a1 1 0 1 1-1 1 1 1 0 0 1 1-1zm0 10a1 1 0 1 1-1-1 1 1 0 0 1 1 1zm7-6a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" />
  );
}

export function HeadIconPath() {
  return <circle cx="8" cy="8" r="3.5" />;
}

export function TagIconPath() {
  return (
    <path d="M14.53 7.47l-5-5A1.5 1.5 0 0 0 8.47 2H3.5A1.5 1.5 0 0 0 2 3.5v4.97a1.5 1.5 0 0 0 .44 1.06l5 5a1.5 1.5 0 0 0 2.12 0l4.97-4.97a1.5 1.5 0 0 0 0-2.12zM3.5 5a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 3.5 5z" />
  );
}

export function UncommittedIconPath() {
  return (
    <path d="M13.23 1 15 2.77 4.77 13 1 15l2-3.77L13.23 1zm-1.06 2.12-8.5 8.5-.7 1.3 1.3-.7 8.5-8.5-.6-.6z" />
  );
}

export function CommitIconPath() {
  return <circle cx="8" cy="8" r="2" />;
}

export function StashIconPath() {
  return <path d="M2 3h12v2H2V3zm1 3h10v7H3V6zm2 2v1h6V8H5z" />;
}

export function renderDefaultIcon(type: CommitNodeType) {
  switch (type) {
    case "merge":
      return <MergeIconPath />;
    case "head":
      return <HeadIconPath />;
    case "tag":
      return <TagIconPath />;
    case "uncommitted":
      return <UncommittedIconPath />;
    case "stash":
      return <StashIconPath />;
    case "commit":
    default:
      return <CommitIconPath />;
  }
}

export type HexagonNodeProps = {
  cx: number;
  cy: number;
  colour?: string | undefined;
  radius?: number | undefined;
  isCurrent?: boolean | undefined;
  isCommitted?: boolean | undefined;
  nodeType?: CommitNodeType | undefined;
  /** URL of the commit author's git avatar */
  avatarUrl?: string | undefined;
  /** Name of the commit author for tooltip */
  author?: string | undefined;
  /** Unique ID for SVG clipping paths */
  id?: string | number | undefined;
  /** Whether the row corresponding to this node is hovered */
  isHovered?: boolean | undefined;
  /** Whether the row corresponding to this node is selected */
  isSelected?: boolean | undefined;
  /** Custom icon or element to insert inside the hexagon. If omitted, uses avatar or nodeType icon. */
  icon?: ComponentChildren;
  /** Whether to orient the hexagon pointy-topped (default: true). */
  pointy?: boolean | undefined;
  /** Callback fired when clicking directly on avatar */
  onAvatarClick?:
    | ((info: {
        rect: DOMRect;
        colour: string;
        author?: string | undefined;
        nodeType: CommitNodeType;
        avatarUrl?: string | undefined;
      }) => void)
    | undefined;
};

/**
 * A GitLens-inspired hexagonal graph node with an inner git avatar / icon.
 * Includes a background mask to cleanly hide branch lines passing behind it.
 * Features a smooth micro-interaction hover/selected scale(1.15) effect.
 */
export function HexagonNode({
  cx,
  cy,
  colour = "var(--color-graph)",
  radius = HEXAGON_RADIUS,
  isCurrent = false,
  isCommitted = true,
  nodeType = "commit",
  avatarUrl,
  author,
  id,
  isHovered = false,
  isSelected = false,
  icon,
  pointy = true,
  onAvatarClick
}: HexagonNodeProps) {
  const nodeRef = useRef<SVGGElement>(null);
  const iconSize = HEXAGON_ICON_SIZE;
  const iconOffset = iconSize / 2;
  // Sanitize ID for valid CSS/SVG url(#...) selector syntax
  const safeId = String(id ?? `${cx}-${cy}`).replace(/[^a-zA-Z0-9_-]/g, "_");
  const clipId = `hex-avatar-${safeId}`;
  const isScaled = isHovered || isSelected;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (nodeRef.current && onAvatarClick) {
      const rect = nodeRef.current.getBoundingClientRect();
      onAvatarClick({
        rect,
        colour,
        author,
        nodeType,
        avatarUrl
      });
    }
  };

  const currentScale = isScaled ? 1.15 : 1;
  const currentFilter = isScaled
    ? `drop-shadow(0 0 5px ${colour}) drop-shadow(0 0 2px ${colour})`
    : undefined;

  return (
    <g
      ref={nodeRef}
      class={`graph-node-hexagon pointer-events-auto cursor-pointer transition-transform duration-200 ease-out ${
        isScaled ? "is-active" : ""
      }`}
      data-node-type={nodeType}
      data-scaled={isScaled ? "true" : undefined}
      style={{
        transformOrigin: `${cx}px ${cy}px`,
        transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease-out",
        transform: `scale(${currentScale})`,
        filter: currentFilter
      }}
      onClick={handleClick}
    >
      {/* Background mask: hides branch line underneath node */}
      <polygon
        points={hexagonPoints(cx, cy, radius + 1, pointy)}
        class="fill-editor stroke-editor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Hexagon background fill */}
      <polygon
        points={hexagonPoints(cx, cy, radius, pointy)}
        class={isCurrent ? "fill-editor/40" : "fill-editor"}
        strokeLinejoin="round"
      />

      {/* Inner Content: custom icon > commit account avatar > default semantic icon */}
      {icon !== undefined ? (
        <g transform={`translate(${cx}, ${cy})`}>{icon}</g>
      ) : avatarUrl && isCommitted ? (
        <g class="graph-node-avatar">
          <defs>
            <clipPath id={clipId}>
              <polygon points={hexagonPoints(cx, cy, radius - 0.5, pointy)} />
            </clipPath>
          </defs>
          <polygon
            points={hexagonPoints(cx, cy, radius - 0.5, pointy)}
            fill={colour}
            opacity="0.25"
          />
          <image
            href={avatarUrl}
            x={cx - radius}
            y={cy - radius}
            width={radius * 2}
            height={radius * 2}
            clip-path={`url(#${clipId})`}
            clipPath={`url(#${clipId})`}
            style={{ clipPath: `url(#${clipId})` }}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      ) : (
        <svg
          x={cx - iconOffset}
          y={cy - iconOffset}
          width={iconSize}
          height={iconSize}
          viewBox="0 0 16 16"
          fill={colour}
          class="overflow-visible pointer-events-none"
        >
          {renderDefaultIcon(nodeType)}
        </svg>
      )}

      {/* Hexagon border stroke on top for crisp edge without black gaps */}
      <polygon
        points={hexagonPoints(cx, cy, radius, pointy)}
        fill="none"
        stroke={colour}
        strokeWidth={isCurrent ? "2" : "1.5"}
        strokeDasharray={isCommitted ? undefined : "2.5 1.5"}
        strokeLinejoin="round"
      />
    </g>
  );
}
