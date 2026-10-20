import type { GitRepo } from "@/types";
import { Button } from "@/webview/components/ui/Button";
import { Checkbox } from "@/webview/components/ui/Checkbox";
import { Dropdown } from "@/webview/components/ui/Dropdown";
import { Icon } from "@/webview/components/ui/Icons";
import { HexWheelDockTrigger } from "@/webview/components/wheel/HexWheelDockTrigger";
import { SHOW_ALL_BRANCHES } from "@/webview/constants";
import {
  selectBranch,
  selectCommitOrdering,
  selectRepo,
  setShowRemoteBranch
} from "@/webview/lib/actions";
import {
  branchList,
  commitHead,
  commitOrdering,
  headBranch,
  selectedBranch,
  selectedRepo,
  showRemoteBranch
} from "@/webview/lib/stores";
import { audioToggleTooltip, isAudioMuted, toggleAudio } from "@/webview/lib/stores/audio.store";
import { isGraphInitialized, totalCommits } from "@/webview/lib/stores/graph-window.store";
import {
  isSidebarCollapsed,
  sidebarToggleTooltip,
  toggleSidebar
} from "@/webview/lib/stores/sidebar.store";
import { isDetached, isNetworkBusy } from "@/webview/lib/stores/sync.store";

function repoOption(repo: GitRepo) {
  return { label: repo.name, value: repo.path };
}

function branchOption(value: string) {
  return { label: value.startsWith("remotes/") ? value.slice(8) : value, value };
}

const commitOrderingOptions = [
  { label: "Topological", value: "topological" },
  { label: "Date", value: "date" }
] as const;

/**
 * Thanh công cụ đỉnh toàn cục thay thế `MainHeader`, mang phong cách Cyber-Lab. Cụm trái
 * là Trạm Chỉ Huy Bánh Xe Lục Giác (`HexWheelDockTrigger`) thay cho dải nút phẳng, cụm
 * giữa kế thừa các điều khiển workspace, cụm phải chứa chỉ báo & tiện ích.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 2.1).
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 6.1).
 */
export function GlobalToolbar({ repos }: { repos: Array<GitRepo> }) {
  const noCommits =
    isGraphInitialized.value && totalCommits.value === 0 && commitHead.value === null;

  const repoName = repos.find((repo) => repo.path === selectedRepo.value)?.name ?? "";

  return (
    <header class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 py-1">
      {/* Cụm trái: điều khiển workspace kế thừa MainHeader */}
      {(repos.length > 1 || !noCommits) && (
        <div class="flex flex-wrap items-center gap-4">
          {repos.length > 1 && (
            <Dropdown
              label={window.l10n.repo}
              class="max-w-48"
              options={repos.map(repoOption)}
              value={selectedRepo.value}
              onChange={selectRepo}
              disabled={isNetworkBusy.value}
            />
          )}
          {!noCommits && (
            <>
              <Dropdown
                label={window.l10n.branch}
                class="max-w-64"
                options={[
                  { label: window.l10n.showAll, value: SHOW_ALL_BRANCHES },
                  ...(branchList.value ?? []).map(branchOption)
                ]}
                value={selectedBranch.value}
                onChange={selectBranch}
                disabled={branchList.value === undefined}
              />
              <Dropdown
                label={window.l10n.commitOrdering}
                class="max-w-40"
                options={commitOrderingOptions.map((option) => ({
                  label: option.label,
                  value: option.value
                }))}
                value={commitOrdering.value}
                onChange={selectCommitOrdering}
              />
              <Checkbox
                label={window.l10n.showRemoteBranches}
                checked={showRemoteBranch.value}
                onInput={(e) => setShowRemoteBranch(e.currentTarget.checked)}
              />
            </>
          )}
        </div>
      )}

      {/* Cụm giữa: Trạm chỉ huy bánh xe lục giác */}
      <div class="flex items-center gap-1.5">
        <HexWheelDockTrigger />
      </div>

      {/* Cụm phải: chỉ báo & tiện ích */}
      <div class="flex items-center gap-2">
        {isDetached.value ? (
          <span
            data-detached-badge
            class="inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold text-[#fbbf24]"
            style={{ borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.15)" }}
            title={window.l10n.detachedHead}
          >
            {window.l10n.detachedHead}
          </span>
        ) : (
          <span class="inline-flex items-center gap-1.5 text-sm text-muted" title={repoName}>
            <Icon>
              <path
                d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM8 4v8"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </Icon>
            <span class="max-w-32 truncate">{repoName}</span>
            <span class="font-semibold text-[#a855f7]">{headBranch.value ?? ""}</span>
          </span>
        )}

        <Button
          aria-label={audioToggleTooltip.value}
          title={audioToggleTooltip.value}
          onClick={toggleAudio}
        >
          <Icon>
            {isAudioMuted.value ? (
              <>
                <path d="M3 6v4h3l4 3V3L6 6z" fill="currentColor" />
                <path
                  d="M13 6l4 4M17 6l-4 4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </>
            ) : (
              <path
                d="M3 6v4h3l4 3V3L6 6zM12.5 6.5a3 3 0 0 1 0 3M14.5 5a6 6 0 0 1 0 6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
            )}
          </Icon>
        </Button>

        <Button
          aria-label={sidebarToggleTooltip.value}
          title={sidebarToggleTooltip.value}
          onClick={toggleSidebar}
        >
          <Icon>
            {isSidebarCollapsed.value ? (
              <path
                d="M2 3h12v10H2zM13 3v10M9.5 6v4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
            ) : (
              <path d="M2 3h12v10H2zM9 3v10" fill="none" stroke="currentColor" stroke-width="1.5" />
            )}
          </Icon>
        </Button>
      </div>
    </header>
  );
}
