import { useState } from "preact/hooks";

import { StagingFileItem, type StagingFile } from "@/webview/components/staging/StagingFileItem";
import { StagingFileTree } from "@/webview/components/staging/StagingFileTree";
import { Icon } from "@/webview/components/ui/Icons";

/**
 * Bảng hiển thị tệp biến động, chia thành hai phân khu "Staged Changes" và
 * "Changes (Unstaged)", kèm thanh thao tác hàng loạt, khả năng thu gọn/mở rộng
 * từng phân khu, thanh công cụ chuyển đổi chế độ xem "List/Tree" và trạng thái trống.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md (Mục 3.2).
 */

export type StagingPanelProps = {
  stagedFiles: StagingFile[];
  unstagedFiles: StagingFile[];
  onStage: (filePath: string) => void;
  onUnstage: (filePath: string) => void;
  onDiscard: (filePath: string, isUntracked: boolean) => void;
  onDiff: (filePath: string) => void;
  onOpenFile: (filePath: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onDiscardAll: () => void;
};

const HEADER_CLASS =
  "flex h-7 shrink-0 items-center justify-between px-2 font-semibold uppercase tracking-wide text-[11px] opacity-80";

const TOGGLE_CLASS =
  "flex items-center gap-1 text-[11px] font-semibold normal-case tracking-normal text-left hover:opacity-100 focus:outline-1 focus:outline-focus";

const BULK_BUTTON_CLASS =
  "rounded-full border border-line bg-btn px-2 py-0.5 text-[11px] font-semibold normal-case tracking-normal hover:bg-btn-hover focus:outline-1 focus:outline-focus";

const EMPTY_CLASS = "px-2 py-2 text-[12px] opacity-50";

const TOOLBAR_BUTTON_CLASS =
  "flex size-[22px] shrink-0 items-center justify-center rounded-[3px] text-[13px] leading-none transition-colors duration-150 hover:bg-btn-hover focus:outline-1 focus:outline-focus";

type ViewMode = "list" | "tree";

export function StagingPanel({
  stagedFiles,
  unstagedFiles,
  onStage,
  onUnstage,
  onDiscard,
  onDiff,
  onOpenFile,
  onStageAll,
  onUnstageAll,
  onDiscardAll
}: StagingPanelProps) {
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const showAsTree = viewMode === "tree";

  return (
    <div class="flex flex-col gap-1">
      <div class="flex h-7 shrink-0 items-center justify-end px-2">
        <button
          type="button"
          class={TOOLBAR_BUTTON_CLASS}
          title={showAsTree ? "Show files as list" : "Show files as tree"}
          aria-label={showAsTree ? "Show files as list" : "Show files as tree"}
          aria-pressed={showAsTree}
          data-action="toggle-view"
          data-view-mode={viewMode}
          onClick={() => setViewMode((value) => (value === "list" ? "tree" : "list"))}
        >
          {showAsTree ? (
            <Icon class="size-3.5 fill-fg">
              <path d="M2 2h12v2H2zM2 7h12v2H2zM2 12h12v2H2z" />
            </Icon>
          ) : (
            <Icon class="size-3.5 fill-fg">
              <path d="M2 3h4l1.5 2H14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
            </Icon>
          )}
        </button>
      </div>

      <div class="flex flex-col">
        <div class={HEADER_CLASS} data-panel="staged">
          <button
            type="button"
            class={TOGGLE_CLASS}
            data-toggle="staged"
            onClick={() => setStagedOpen((value) => !value)}
          >
            <span data-chevron aria-hidden="true">
              {stagedOpen ? "▾" : "▸"}
            </span>
            <span data-count>Staged Changes ({stagedFiles.length})</span>
          </button>
          <button
            type="button"
            class={BULK_BUTTON_CLASS}
            data-action="unstage-all"
            disabled={stagedFiles.length === 0}
            onClick={onUnstageAll}
          >
            - Unstage All
          </button>
        </div>
        {stagedOpen &&
          (stagedFiles.length === 0 ? (
            <div class={EMPTY_CLASS} data-empty="staged">
              No staged changes
            </div>
          ) : showAsTree ? (
            <div data-list="staged">
              <StagingFileTree
                files={stagedFiles}
                isStaged
                onStage={onStage}
                onUnstage={onUnstage}
                onDiscard={onDiscard}
                onDiff={onDiff}
                onOpenFile={onOpenFile}
              />
            </div>
          ) : (
            <div data-list="staged">
              {stagedFiles.map((file) => (
                <StagingFileItem
                  key={file.path}
                  file={file}
                  isStaged
                  onStage={onStage}
                  onUnstage={onUnstage}
                  onDiscard={onDiscard}
                  onDiff={onDiff}
                  onOpenFile={onOpenFile}
                />
              ))}
            </div>
          ))}
      </div>

      <div class="flex flex-col">
        <div class={HEADER_CLASS} data-panel="unstaged">
          <button
            type="button"
            class={TOGGLE_CLASS}
            data-toggle="unstaged"
            onClick={() => setUnstagedOpen((value) => !value)}
          >
            <span data-chevron aria-hidden="true">
              {unstagedOpen ? "▾" : "▸"}
            </span>
            <span data-count>Changes ({unstagedFiles.length})</span>
          </button>
          <span class="flex items-center gap-1">
            <button
              type="button"
              class={BULK_BUTTON_CLASS}
              data-action="stage-all"
              disabled={unstagedFiles.length === 0}
              onClick={onStageAll}
            >
              + Stage All
            </button>
            <button
              type="button"
              class={BULK_BUTTON_CLASS}
              data-action="discard-all"
              disabled={unstagedFiles.length === 0}
              onClick={onDiscardAll}
            >
              ↺ Discard All
            </button>
          </span>
        </div>
        {unstagedOpen &&
          (unstagedFiles.length === 0 ? (
            <div class={EMPTY_CLASS} data-empty="unstaged">
              Working tree clean
            </div>
          ) : showAsTree ? (
            <div data-list="unstaged">
              <StagingFileTree
                files={unstagedFiles}
                isStaged={false}
                onStage={onStage}
                onUnstage={onUnstage}
                onDiscard={onDiscard}
                onDiff={onDiff}
                onOpenFile={onOpenFile}
              />
            </div>
          ) : (
            <div data-list="unstaged">
              {unstagedFiles.map((file) => (
                <StagingFileItem
                  key={file.path}
                  file={file}
                  isStaged={false}
                  onStage={onStage}
                  onUnstage={onUnstage}
                  onDiscard={onDiscard}
                  onDiff={onDiff}
                  onOpenFile={onOpenFile}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
