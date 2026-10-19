import type { GitRepo } from "@/types";
import { Button } from "@/webview/components/ui/Button";
import { Checkbox } from "@/webview/components/ui/Checkbox";
import { Dropdown } from "@/webview/components/ui/Dropdown";
import { Icon } from "@/webview/components/ui/Icons";
import { SHOW_ALL_BRANCHES } from "@/webview/constants";
import {
  refresh,
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
import {
  audioToggleTooltip,
  isAudioMuted,
  toggleAudio
} from "@/webview/lib/stores/audio.store";
import { isGraphInitialized, totalCommits } from "@/webview/lib/stores/graph-window.store";
import {
  isSidebarCollapsed,
  sidebarToggleTooltip,
  toggleSidebar
} from "@/webview/lib/stores/sidebar.store";
import {
  aheadCount,
  behindCount,
  isDetached,
  isFetching,
  isNetworkBusy,
  isPulling,
  isPushing,
  fetch as fetchAll,
  pull,
  push,
  stash,
  pop
} from "@/webview/lib/stores/sync.store";

import { ToolbarDropdownButton } from "./ToolbarDropdownButton";

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
 * Thanh công cụ đỉnh toàn cục thay thế `MainHeader`, mang phong cách Cyber-Lab. Ba cụm:
 * mạng & stash (trái), điều khiển workspace kế thừa (giữa), chỉ báo & tiện ích (phải).
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 2.1).
 */
export function GlobalToolbar({ repos }: { repos: Array<GitRepo> }) {
  const noCommits =
    isGraphInitialized.value && totalCommits.value === 0 && commitHead.value === null;

  const repoName = repos.find((repo) => repo.path === selectedRepo.value)?.name ?? "";

  return (
    <header class="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-3 py-1">
      {/* Cụm trái: mạng & stash */}
      <div class="flex items-center gap-1.5">
        <Button
          aria-label={window.l10n.fetchAll}
          title={window.l10n.tooltipFetchAll}
          disabled={isNetworkBusy.value}
          onClick={() => fetchAll()}
        >
          {isFetching.value ? (
            <span class="inline-flex animate-spin" aria-hidden="true">
              <Icon>
                <path d="M8 1.5A6.5 6.5 0 1 1 1.5 8" fill="none" stroke="currentColor" stroke-width="2" />
              </Icon>
            </span>
          ) : (
            <Icon>
              <path d="M8 1v6m0 0l2.5-2.5M8 7L5.5 4.5M2 11v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" fill="none" stroke="currentColor" stroke-width="1.5" />
            </Icon>
          )}
          {window.l10n.fetchAll}
        </Button>

        <ToolbarDropdownButton
          icon={
            <path d="M8 12L3 7l1.4-1.4L8 9.2 11.6 5.6 13 7z" fill="currentColor" />
          }
          label={window.l10n.pull}
          tooltip={window.l10n.tooltipPull}
          badgeCount={behindCount.value}
          badgeDirection="behind"
          isLoading={isPulling.value}
          disabled={isNetworkBusy.value}
          onPrimaryClick={() => pull("merge")}
          menuItems={[
            {
              id: "pull-merge",
              label: window.l10n.pullMerge,
              description: window.l10n.tooltipPullMerge,
              onSelect: () => pull("merge")
            },
            {
              id: "pull-rebase",
              label: window.l10n.pullRebase,
              description: window.l10n.tooltipPullRebase,
              onSelect: () => pull("rebase")
            }
          ]}
        />

        <ToolbarDropdownButton
          icon={
            <path d="M8 4l5 5-1.4 1.4L8 6.8 4.4 10.4 3 9z" fill="currentColor" />
          }
          label={window.l10n.push}
          tooltip={window.l10n.tooltipPush}
          badgeCount={aheadCount.value}
          badgeDirection="ahead"
          isLoading={isPushing.value}
          disabled={isNetworkBusy.value}
          onPrimaryClick={() => push()}
          menuItems={[
            {
              id: "push-standard",
              label: window.l10n.push,
              description: window.l10n.tooltipPushStandard,
              onSelect: () => push()
            },
            {
              id: "push-force",
              label: window.l10n.pushForce,
              description: window.l10n.tooltipPushForce,
              onSelect: () => push(true)
            }
          ]}
        />

        <span class="h-[18px] w-px bg-line" aria-hidden="true" />

        <Button
          aria-label={window.l10n.stash}
          title={window.l10n.tooltipStash}
          disabled={isNetworkBusy.value}
          onClick={() => stash()}
        >
          <Icon>
            <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2H2zM2 6v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M7 9h2" fill="none" stroke="currentColor" stroke-width="1.5" />
          </Icon>
          {window.l10n.stash}
        </Button>

        <Button
          aria-label={window.l10n.pop}
          title={window.l10n.tooltipPop}
          disabled={isNetworkBusy.value}
          onClick={() => pop()}
        >
          <Icon>
            <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2H2zM2 6v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M8 12V8m0 0l-1.5 1.5M8 8l1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
          </Icon>
          {window.l10n.pop}
        </Button>

        <span class="h-[18px] w-px bg-line" aria-hidden="true" />

        <Button aria-label={window.l10n.refresh} title={window.l10n.tooltipRefresh} onClick={refresh}>
          <Icon>
            <path d="M3 8C3 5.23858 5.23858 3 8 3C9.63527 3 11.0878 3.78495 12.0005 5H10C9.72386 5 9.5 5.22386 9.5 5.5C9.5 5.77614 9.72386 6 10 6H12.8904C12.8973 6.00014 12.9041 6.00014 12.911 6H13C13.2761 6 13.5 5.77614 13.5 5.5V2.5C13.5 2.22386 13.2761 2 13 2C12.7239 2 12.5 2.22386 12.5 2.5V4.03138C11.4009 2.78613 9.79253 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.1301 14 13.6999 11.6035 13.9756 8.54488C14.0003 8.26985 13.7975 8.0268 13.5225 8.00202C13.2474 7.97723 13.0044 8.1801 12.9796 8.45512C12.75 11.003 10.6079 13 8 13C5.23858 13 3 10.7614 3 8Z" />
          </Icon>
          {window.l10n.refresh}
        </Button>
      </div>

      {/* Cụm giữa: điều khiển workspace kế thừa MainHeader */}
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
              <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM8 4v8" fill="none" stroke="currentColor" stroke-width="1.5" />
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
                <path d="M13 6l4 4M17 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.5" />
              </>
            ) : (
              <path d="M3 6v4h3l4 3V3L6 6zM12.5 6.5a3 3 0 0 1 0 3M14.5 5a6 6 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.5" />
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
              <path d="M2 3h12v10H2zM13 3v10M9.5 6v4" fill="none" stroke="currentColor" stroke-width="1.5" />
            ) : (
              <path d="M2 3h12v10H2zM9 3v10" fill="none" stroke="currentColor" stroke-width="1.5" />
            )}
          </Icon>
        </Button>
      </div>
    </header>
  );
}
