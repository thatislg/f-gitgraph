import { useLayoutEffect, useRef, useState } from "preact/hooks";

import type { GitCommitNode } from "@/backend/types";
import { abbrevCommit } from "@/backend/utils/string";
import { RefLabel } from "@/webview/components/commit/RefLabel";
import { getGitAccountAvatarUrl } from "@/webview/utils/avatar";
import { getCommitDate, getFullDate } from "@/webview/utils/date";

export type CommitHoverPanelProps = {
  commit: GitCommitNode;
  anchorRect: DOMRect;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

/**
 * GitLens-inspired floating rich commit hover card.
 * Displays the full commit message, author info, date, SHA, and refs
 * with a native VS Code system-matching theme background.
 */
export function CommitHoverPanel({
  commit,
  anchorRect,
  onMouseEnter,
  onMouseLeave
}: CommitHoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: anchorRect.bottom + 4,
    left: Math.max(16, anchorRect.left)
  });

  useLayoutEffect(() => {
    if (!panelRef.current) return;
    const panel = panelRef.current;
    const panelRect = panel.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Horizontal placement: keep within viewport bounds
    let left = anchorRect.left;
    if (left + panelRect.width > windowWidth - 16) {
      left = Math.max(16, windowWidth - panelRect.width - 16);
    }

    // Vertical placement: place below anchor, or above if close to bottom
    let top = anchorRect.bottom + 4;
    if (top + panelRect.height > windowHeight - 16 && anchorRect.top > panelRect.height + 8) {
      top = anchorRect.top - panelRect.height - 4;
    }

    setCoords({ top, left });
  }, [anchorRect]);

  const avatarUrl = getGitAccountAvatarUrl(commit.email, 40);
  const relativeDate = getCommitDate(commit.date);
  const fullDate = getFullDate(commit.date);

  return (
    <div
      ref={panelRef}
      class="fixed z-50 flex max-h-[85vh] w-[460px] max-w-[92vw] flex-col rounded-lg border border-line bg-menu text-menu-fg shadow-2xl outline-none"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.08)"
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header: Author, Date, SHA, Refs */}
      <div class="flex items-start gap-3 border-b border-line bg-btn/30 p-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={commit.author}
            class="size-8 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <div class="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-btn text-xs font-semibold">
            {commit.author.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate font-semibold text-editor-fg">{commit.author}</span>
            <span class="font-mono text-[11px] text-editor-fg/60">
              {abbrevCommit(commit.hash)}
            </span>
          </div>

          <div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-editor-fg/70">
            <span title={commit.email}>{commit.email}</span>
            <span>•</span>
            <span title={fullDate}>{relativeDate}</span>
          </div>

          {commit.refs.length > 0 && (
            <div class="mt-1.5 flex flex-wrap gap-1">
              {commit.refs.map((gitRef) => (
                <RefLabel key={`${gitRef.type}-${gitRef.name}`} gitRef={gitRef} active={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Body: Full commit message with formatting */}
      <div class="max-h-72 overflow-y-auto p-3.5 select-text">
        <p class="whitespace-pre-wrap font-sans text-xs/relaxed text-editor-fg">
          {commit.message}
        </p>
      </div>
    </div>
  );
}
