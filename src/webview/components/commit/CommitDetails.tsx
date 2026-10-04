import type { ComponentChildren } from "preact";
import { useMemo } from "preact/hooks";

import type { GitCommitDetails } from "@/types";
import { FileTree } from "@/webview/components/commit/FileTree";
import { Icon } from "@/webview/components/ui/Icons";
import { Loading } from "@/webview/components/ui/Loading";
import { COMMIT_DETAILS_HEIGHT } from "@/webview/constants";
import { closeCommitDetails } from "@/webview/lib/actions";
import { getFullDate } from "@/webview/utils/date";
import { buildFileTree } from "@/webview/utils/fileTree";

/** Height of the line that closes the view off, in pixels. */
const SEPARATOR_HEIGHT = 2;

/** One "Label: {0}" row of the summary, with the label in bold. */
function DetailRow({ template, children }: { template: string; children: ComponentChildren }) {
  const [label, after = ""] = template.split("{0}");

  return (
    <div class="truncate">
      <b>{label}</b>
      {children}
      {after}
    </div>
  );
}

function Summary({ details }: { details: GitCommitDetails }) {
  return (
    <div class="w-9/20 shrink-0 overflow-auto border-x border-line p-2.5 select-text">
      <DetailRow template={window.l10n.detailCommit}>{details.hash}</DetailRow>
      <DetailRow template={window.l10n.detailParents}>{details.parents.join(", ")}</DetailRow>
      <DetailRow template={window.l10n.detailAuthor}>
        {details.author} &lt;
        <a class="text-inherit underline" href={`mailto:${encodeURIComponent(details.email)}`}>
          {details.email}
        </a>
        &gt;
      </DetailRow>
      <DetailRow template={window.l10n.detailDate}>{getFullDate(details.date)}</DetailRow>
      <DetailRow template={window.l10n.detailCommitter}>{details.committer}</DetailRow>
      <p class="mt-4 whitespace-pre-wrap">{details.body}</p>
    </div>
  );
}

/**
 * The details of one commit, rendered as a floating Overlay Inspector Panel by
 * `CommitTable` (see `BUG-EXPAND-01/02`). It no longer lives inside a table row,
 * so the commit table and the graph SVG keep their geometry 100% intact.
 */
export function CommitDetails({ details }: { details: GitCommitDetails | null }) {
  const nodes = useMemo(
    () => (details === null ? [] : buildFileTree(details.fileChanges)),
    [details]
  );

  return (
    <div
      class="relative bg-editor text-ui leading-4.5 whitespace-normal after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-line"
      style={`height: ${COMMIT_DETAILS_HEIGHT}px; outline: 1.5px solid #a855f7; outline-offset: -1.5px; box-shadow: 0 0 10px rgba(168, 85, 247, 0.45), inset 0 0 6px rgba(168, 85, 247, 0.2);`}
    >
      <div class="overflow-hidden" style={`height: ${COMMIT_DETAILS_HEIGHT - SEPARATOR_HEIGHT}px`}>
        {details === null ? (
          <Loading class="h-full" />
        ) : (
          <div class="flex h-full">
            <Summary details={details} />
            {/* The right margin keeps the scrollbar clear of the close button. */}
            <div class="mr-8 grow overflow-x-hidden overflow-y-scroll border-r border-line py-1">
              <FileTree nodes={nodes} commitHash={details.hash} />
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        class="absolute top-1 right-1 cursor-pointer opacity-60 hover:opacity-100"
        title={window.l10n.close}
        aria-label={window.l10n.close}
        onClick={closeCommitDetails}
      >
        <Icon class="size-6" viewBox="0 0 12 16">
          <path d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z" />
        </Icon>
      </button>
    </div>
  );
}
