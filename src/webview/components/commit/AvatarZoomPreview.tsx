import { useEffect, useRef, useState } from "preact/hooks";

import type { GitCommitNode } from "@/types";
import {
  type CommitNodeType,
  hexagonPoints,
  renderDefaultIcon
} from "@/webview/components/commit/HexagonNode";
import { getGitAccountAvatarUrl } from "@/webview/utils/avatar";

export type ZoomedAvatarInfo = {
  commit: GitCommitNode;
  anchorRect: DOMRect;
  colour: string;
  avatarUrl?: string | undefined;
  author?: string | undefined;
  nodeType?: CommitNodeType | undefined;
};

export type AvatarZoomPreviewProps = {
  info: ZoomedAvatarInfo;
  onClose?: (() => void) | undefined;
};

const ZOOM_RADIUS = 50; // 5x scale of 10px
const SVG_SIZE = 140;
const CENTER = SVG_SIZE / 2;

/**
 * Top-layer floating 5x Avatar Zoom preview with neon glow and crisp author badge.
 * Placed in fixed positioning to bypass all container clipping and table stacking contexts.
 */
export function AvatarZoomPreview({ info, onClose }: AvatarZoomPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const { commit, anchorRect, colour, author, nodeType = "commit" } = info;
  // High-resolution avatar: size=256 ensures crystal clear quality when zoomed 5x
  const highResAvatarUrl = commit.email
    ? getGitAccountAvatarUrl(commit.email, 256)
    : info.avatarUrl;

  const [coords, setCoords] = useState<{ left: number; top: number }>({
    left: anchorRect.left + anchorRect.width / 2,
    top: anchorRect.top + anchorRect.height / 2
  });

  useEffect(() => {
    const origCenterX = anchorRect.left + anchorRect.width / 2;
    const origCenterY = anchorRect.top + anchorRect.height / 2;

    const halfWidth = SVG_SIZE / 2;
    const clampedX = Math.max(
      halfWidth + 12,
      Math.min(window.innerWidth - halfWidth - 12, origCenterX)
    );
    const clampedY = Math.max(halfWidth + 12, Math.min(window.innerHeight - 120, origCenterY));

    setCoords({ left: clampedX, top: clampedY });
  }, [anchorRect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  const clipId = `zoomed-avatar-clip-${commit.hash.slice(0, 10)}`;

  return (
    <div
      ref={previewRef}
      class="fixed z-[60] flex flex-col items-center select-none pointer-events-auto cursor-pointer transition-transform duration-200 ease-out"
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        transform: "translate(-50%, -50%)",
        animation: "avatarZoomIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
      }}
      onClick={() => onClose?.()}
    >
      {/* 5x Hexagon SVG with Neon Glow */}
      <svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        class="overflow-visible"
        style={{
          filter: `drop-shadow(0 0 16px ${colour}) drop-shadow(0 0 6px ${colour}) drop-shadow(0 0 2px #ffffff)`
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <polygon points={hexagonPoints(CENTER, CENTER, ZOOM_RADIUS - 0.5, true)} />
          </clipPath>
        </defs>

        {/* Background mask to guarantee opacity */}
        <polygon
          points={hexagonPoints(CENTER, CENTER, ZOOM_RADIUS + 1, true)}
          class="fill-editor stroke-editor"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Backdrop color */}
        <polygon
          points={hexagonPoints(CENTER, CENTER, ZOOM_RADIUS, true)}
          fill={colour}
          opacity="0.25"
        />

        {/* Avatar or Semantic Icon */}
        {highResAvatarUrl ? (
          <image
            href={highResAvatarUrl}
            x={CENTER - ZOOM_RADIUS}
            y={CENTER - ZOOM_RADIUS}
            width={ZOOM_RADIUS * 2}
            height={ZOOM_RADIUS * 2}
            clip-path={`url(#${clipId})`}
            clipPath={`url(#${clipId})`}
            style={{ clipPath: `url(#${clipId})` }}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <g transform={`translate(${CENTER - 25}, ${CENTER - 25}) scale(3.125)`} fill={colour}>
            {renderDefaultIcon(nodeType)}
          </g>
        )}

        {/* Hexagon Border Stroke */}
        <polygon
          points={hexagonPoints(CENTER, CENTER, ZOOM_RADIUS, true)}
          fill="none"
          stroke={colour}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>

      {/* Author Name Badge tightly attached below hexagon */}
      {author && (
        <div
          class="flex max-w-[200px] items-center gap-1 rounded-full px-2 py-[2px] text-[8.5px] font-semibold leading-none text-menu-fg"
          style={{
            marginTop: "-16px",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            border: `1px solid ${colour}`,
            boxShadow: `0 0 8px ${colour}50, 0 3px 8px rgba(0, 0, 0, 0.75)`,
            backdropFilter: "blur(8px)"
          }}
        >
          <span class="truncate">{author}</span>
        </div>
      )}
    </div>
  );
}
