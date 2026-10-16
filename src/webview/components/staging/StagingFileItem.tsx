/**
 * Dòng hiển thị một tệp biến động trong khu vực Staging: huy hiệu vuông Neon,
 * tên tệp nổi bật, đường dẫn thư mục phụ mờ, và cụm nút tác vụ Hover-to-Reveal.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md (Mục 2.2 & 3.2).
 */

export type StagingFileStatus = "A" | "M" | "D" | "R" | "U";

export type StagingFile = {
  path: string;
  status: StagingFileStatus;
  isUntracked: boolean;
};

export type StagingFileItemProps = {
  file: StagingFile;
  isStaged: boolean;
  onStage: (filePath: string) => void;
  onUnstage: (filePath: string) => void;
  onDiscard: (filePath: string, isUntracked: boolean) => void;
  onDiff: (filePath: string) => void;
  onOpenFile: (filePath: string) => void;
};

const BADGE_CLASS: Record<StagingFileStatus, string> = {
  A: "bg-badge-added",
  M: "bg-badge-modified",
  D: "bg-badge-deleted",
  R: "bg-badge-renamed",
  U: "bg-badge-untracked"
};

const ACTION_BUTTON_CLASS = [
  "flex size-[22px] shrink-0 items-center justify-center rounded-[3px]",
  "text-[13px] leading-none transition-colors duration-150",
  "hover:bg-btn-hover focus:outline-1 focus:outline-focus"
].join(" ");

function splitPath(path: string): { fileName: string; folderPath: string } {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash < 0) {
    return { fileName: path, folderPath: "" };
  }
  return { fileName: path.slice(lastSlash + 1), folderPath: path.slice(0, lastSlash + 1) };
}

export function StagingFileItem({
  file,
  isStaged,
  onStage,
  onUnstage,
  onDiscard,
  onDiff,
  onOpenFile
}: StagingFileItemProps) {
  const { fileName, folderPath } = splitPath(file.path);
  const discardIcon = file.isUntracked ? "🗑" : "↺";

  return (
    <div
      class="group flex h-7 cursor-pointer items-center gap-2 px-2 py-0.5 select-none hover:bg-row-hover"
      data-file-item
      data-status={file.status}
      data-staged={isStaged}
      onClick={() => onDiff(file.path)}
    >
      <span
        class={`flex size-[18px] shrink-0 items-center justify-center rounded-[3px] font-mono text-[10px] font-bold text-white ${BADGE_CLASS[file.status]}`}
        data-badge
      >
        {file.status}
      </span>

      <span class="flex min-w-0 flex-1 items-baseline gap-1">
        <span class="shrink-0 text-[13px] font-medium">{fileName}</span>
        {folderPath !== "" && (
          <span class="truncate font-mono text-[11px] opacity-60">{folderPath}</span>
        )}
      </span>

      <span
        class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        data-actions
      >
        <button
          type="button"
          class={ACTION_BUTTON_CLASS}
          title="Open file"
          data-action="open-file"
          onClick={(event) => {
            event.stopPropagation();
            onOpenFile(file.path);
          }}
        >
          📄
        </button>
        {isStaged ? (
          <>
            <button
              type="button"
              class={ACTION_BUTTON_CLASS}
              title="Unstage changes"
              data-action="unstage"
              onClick={(event) => {
                event.stopPropagation();
                onUnstage(file.path);
              }}
            >
              -
            </button>
            <button
              type="button"
              class={ACTION_BUTTON_CLASS}
              title="Discard changes"
              data-action="discard"
              onClick={(event) => {
                event.stopPropagation();
                onDiscard(file.path, file.isUntracked);
              }}
            >
              ↺
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              class={ACTION_BUTTON_CLASS}
              title="Stage changes"
              data-action="stage"
              onClick={(event) => {
                event.stopPropagation();
                onStage(file.path);
              }}
            >
              +
            </button>
            <button
              type="button"
              class={ACTION_BUTTON_CLASS}
              title="Discard changes"
              data-action="discard"
              onClick={(event) => {
                event.stopPropagation();
                onDiscard(file.path, file.isUntracked);
              }}
            >
              {discardIcon}
            </button>
          </>
        )}
      </span>
    </div>
  );
}
