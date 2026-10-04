import { useEffect, useRef, useState } from "preact/hooks";

import { abbrevCommit } from "@/backend/utils/string";
import type { GitCommitNode, GitRef } from "@/types";
import type { ZoomedAvatarInfo } from "@/webview/components/commit/AvatarZoomPreview";
import { getCommitNodeType } from "@/webview/components/commit/HexagonNode";
import { RefLabel } from "@/webview/components/commit/RefLabel";
import { UNCOMMITTED_CHANGES } from "@/webview/constants";
import { openContextMenu } from "@/webview/lib/actions";
import type { CommitMessages } from "@/webview/lib/menus";
import { commitMenu, commitMenuSource } from "@/webview/lib/menus";
import { activeSource, uncommittedChanges } from "@/webview/lib/stores";
import { getGitAccountAvatarUrl } from "@/webview/utils/avatar";
import { getCommitDate } from "@/webview/utils/date";
import { format } from "@/webview/utils/format";

type CommitRowProps = {
  commit: GitCommitNode;
  isHead: boolean;
  headBranch: string | null;
  /** Commit messages by hash, so the menu can name the parents of a merge. */
  messages: CommitMessages;
  /** Colour of the graph branch this commit sits on. */
  colour: string | undefined;
  /** The details view of this commit is open. */
  expanded: boolean;
  /** Whether any commit details view is currently open in the table. */
  isAnyExpanded?: boolean | undefined;
  /** Open or close the details view. Absent for the uncommitted changes row. */
  onSelect: (() => void) | undefined;
  /** Callback fired when the row is hovered or unhovered */
  onHover?: ((hovered: boolean) => void) | undefined;
  /** X coordinate of the right edge of this row's commit avatar in the graph column */
  avatarRightX?: number | undefined;
  /** Callback fired after hovering for a dwell duration (550ms) */
  onHoverDwell?: ((commit: GitCommitNode, rect: DOMRect) => void) | undefined;
  /** Callback fired when hover ends */
  onHoverLeave?: (() => void) | undefined;
  /** Callback fired when clicking directly on the avatar node in the graph cell */
  onAvatarClick?: ((info: ZoomedAvatarInfo) => void) | undefined;
};

const CELL_CLASS = "h-6 overflow-hidden text-ellipsis whitespace-nowrap px-1 leading-6";

function isActiveRef(gitRef: GitRef, headBranch: string | null) {
  return gitRef.type === "head" && gitRef.name === headBranch;
}

/** The checked out branch is shown first, the remaining refs keep their order. */
function orderRefs(refs: Array<GitRef>, headBranch: string | null) {
  return refs.toSorted(
    (a, b) => Number(isActiveRef(b, headBranch)) - Number(isActiveRef(a, headBranch))
  );
}

/** One background per state. Two unprefixed `bg-*` classes would race on CSS order. */
function rowBackground(isHead: boolean, expanded: boolean, menuOpen: boolean) {
  if (expanded) {
    return "bg-row-selected hover:bg-row-selected-hover";
  }
  if (menuOpen) {
    return "bg-row-hover";
  }
  if (isHead) {
    return "bg-row-head hover:bg-row-hover";
  }
  return "hover:bg-row-hover";
}

function rowClass(isHead: boolean, expanded: boolean, selectable: boolean, menuOpen: boolean) {
  return [rowBackground(isHead, expanded, menuOpen), selectable ? "cursor-pointer" : ""]
    .filter(Boolean)
    .join(" ");
}

export function CommitRow({
  commit,
  isHead,
  headBranch,
  messages,
  colour,
  expanded,
  isAnyExpanded = false,
  onSelect,
  onHover,
  avatarRightX,
  onHoverDwell,
  onHoverLeave,
  onAvatarClick
}: CommitRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const dwellTimer = useRef<number | null>(null);
  const isContentHovered = useRef(false);
  const [isRowHovered, setIsRowHovered] = useState(false);

  useEffect(() => {
    if (isAnyExpanded && dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, [isAnyExpanded]);

  const uncommitted = commit.hash === UNCOMMITTED_CHANGES;
  const message = uncommitted
    ? format(window.l10n.uncommittedChanges, uncommittedChanges.value)
    : commit.message;
  const date = getCommitDate(commit.date);
  const source = commitMenuSource(commit.hash);
  const menuOpen = activeSource.value === source;
  const refs = orderRefs(commit.refs, headBranch);

  const branchColourVal = colour ?? "var(--color-graph, #0085d9)";
  const avatarCx = avatarRightX !== undefined ? avatarRightX - 10 : undefined;

  // Flameshot neon purple glowing border around the selected commit row
  const rowStyleString = [
    colour !== undefined ? `--color-graph: ${colour}` : "",
    expanded
      ? "outline: 1.5px solid #a855f7; outline-offset: -1.5px; box-shadow: 0 0 10px rgba(168, 85, 247, 0.45), inset 0 0 6px rgba(168, 85, 247, 0.2); position: relative; z-index: 5;"
      : ""
  ]
    .filter(Boolean)
    .join("; ");

  // Neon ambient light on the graph column: transparent up to the centre of the
  // avatar's right half, then a shimmering neon gradient fanning out to the right.
  const isNeonActive = (expanded || isRowHovered) && avatarRightX !== undefined;
  // The avatar spans roughly `[avatarRightX - 20, avatarRightX]`; its right half is
  // `[avatarRightX - 10, avatarRightX]`, whose centre is `avatarRightX - 5`.
  const neonStartX = avatarRightX !== undefined ? avatarRightX - 5 : 0;
  const graphCellStyle = isNeonActive
    ? expanded
      ? `background: linear-gradient(to right, transparent 0px, transparent ${neonStartX}px, color-mix(in srgb, ${branchColourVal} 45%, #ffffff 15%) ${neonStartX}px, color-mix(in srgb, ${branchColourVal} 22%, transparent) ${
          neonStartX + 25
        }px, color-mix(in srgb, ${branchColourVal} 6%, transparent) ${
          neonStartX + 60
        }px, transparent 100%); transition: background 0.15s ease-out;`
      : `background: linear-gradient(to right, transparent 0px, transparent ${neonStartX}px, color-mix(in srgb, ${branchColourVal} 35%, #ffffff 10%) ${neonStartX}px, color-mix(in srgb, ${branchColourVal} 18%, transparent) ${
          neonStartX + 25
        }px, color-mix(in srgb, ${branchColourVal} 5%, transparent) ${
          neonStartX + 60
        }px, transparent 100%); transition: background 0.15s ease-out;`
    : "transition: background 0.15s ease-out;";

  const startDwellTimer = () => {
    // If any commit details view is currently open, suppress all hover panels
    if (isAnyExpanded) {
      return;
    }
    if (!isContentHovered.current) {
      isContentHovered.current = true;
      if (dwellTimer.current !== null) {
        window.clearTimeout(dwellTimer.current);
      }
      dwellTimer.current = window.setTimeout(() => {
        if (rowRef.current && !uncommitted) {
          onHoverDwell?.(commit, rowRef.current.getBoundingClientRect());
        }
      }, 550);
    }
  };

  const handleGraphCellMouseEnter = () => {
    // Inside the graph column: do NOT show commit message panel
    isContentHovered.current = false;
    if (dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
    onHoverLeave?.();
  };

  const handleMouseEnter = () => {
    setIsRowHovered(true);
    onHover?.(true);
  };

  const handleMouseLeave = () => {
    setIsRowHovered(false);
    onHover?.(false);
    isContentHovered.current = false;
    if (dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
    onHoverLeave?.();
  };

  const handleGraphCellClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (avatarCx !== undefined && !uncommitted) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (Math.abs(clickX - avatarCx) <= 14) {
        onAvatarClick?.({
          commit,
          anchorRect: new DOMRect(rect.left + avatarCx - 10, rect.top + 2, 20, 20),
          colour: branchColourVal,
          author: commit.author,
          avatarUrl: commit.email ? getGitAccountAvatarUrl(commit.email) : undefined,
          nodeType: getCommitNodeType(commit, { isCurrent: isHead, isCommitted: !uncommitted })
        });
        return;
      }
    }
    onSelect?.();
  };

  return (
    <tr
      ref={rowRef}
      class={rowClass(isHead, expanded, onSelect !== undefined, menuOpen)}
      style={rowStyleString.length > 0 ? rowStyleString : undefined}
      onClick={onSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={
        uncommitted
          ? undefined
          : (event) => openContextMenu(event, source, commitMenu(commit, messages))
      }
    >
      <td
        class={CELL_CLASS}
        style={graphCellStyle}
        onClick={handleGraphCellClick}
        onMouseEnter={handleGraphCellMouseEnter}
      />
      <td
        class={`${CELL_CLASS} w-full max-w-0 pl-2.5 ${isHead ? "shadow-head" : ""}`}
        onMouseEnter={startDwellTimer}
      >
        <div class="flex min-w-0 items-center">
          {isHead && (
            <span class="mr-1.25 size-1.5 shrink-0 box-content rounded-full border-2 border-graph" />
          )}
          {refs.length > 0 && (
            <span class="flex min-w-0 max-w-1/2 shrink-0 overflow-hidden">
              {refs.map((gitRef) => (
                <RefLabel
                  key={`${gitRef.type}-${gitRef.name}`}
                  gitRef={gitRef}
                  active={isActiveRef(gitRef, headBranch)}
                />
              ))}
            </span>
          )}
          <span class="min-w-0 flex-1 truncate">
            {isHead || uncommitted ? <b>{message}</b> : message}
          </span>
        </div>
      </td>
      <td class={CELL_CLASS} onMouseEnter={startDwellTimer}>
        {date.value}
      </td>
      <td class={`${CELL_CLASS} max-w-31`} onMouseEnter={startDwellTimer}>
        {commit.author}
      </td>
      <td class={`${CELL_CLASS} font-mono`} onMouseEnter={startDwellTimer}>
        {abbrevCommit(commit.hash)}
      </td>
    </tr>
  );
}
