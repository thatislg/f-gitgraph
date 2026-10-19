import type { GitRepo } from "@/types";

import {
  SidebarNavigator,
  type BranchItem,
  type RemoteGroup
} from "./components/sidebar/SidebarNavigator";
import { GlobalToolbar } from "./components/toolbar/GlobalToolbar";
import { ContextMenu } from "./components/ui/ContextMenu";
import { Dialog } from "./components/ui/Dialog";
import { ScrollShadow } from "./components/ui/ScrollShadow";
import { GraphView } from "./layout/GraphView";
import { branchList, headBranch } from "./lib/stores";
import { stagedCount, unstagedCount } from "./lib/stores/staging.store";
import { stashList } from "./lib/stores/sync.store";

const REMOTE_PREFIX = "remotes/";

/**
 * Tách mảng tên nhánh phẳng từ Backend (`branchList`) thành danh sách nhánh cục bộ và
 * cấu trúc nhóm remote. Nhánh remote mang tiền tố `remotes/<remote>/<branch>`; phần còn
 * lại là nhánh cục bộ. Khi `showRemoteBranch` tắt, Backend đã loại bỏ nhánh remote nên
 * mảng này không còn mục `remotes/` nào.
 */
function splitBranches(
  names: string[],
  currentHead: string | null
): { branches: BranchItem[]; remotes: RemoteGroup[] } {
  const branches: BranchItem[] = [];
  const remoteGroups = new Map<string, string[]>();

  for (const name of names) {
    if (name.startsWith(REMOTE_PREFIX)) {
      const rest = name.slice(REMOTE_PREFIX.length);
      const slashIndex = rest.indexOf("/");
      if (slashIndex === -1) {
        continue;
      }
      const remoteName = rest.slice(0, slashIndex);
      const branchName = rest.slice(slashIndex + 1);
      const group = remoteGroups.get(remoteName);
      if (group === undefined) {
        remoteGroups.set(remoteName, [branchName]);
      } else {
        group.push(branchName);
      }
    } else {
      branches.push({
        name,
        isHead: name === currentHead,
        aheadCount: 0,
        upstream: null
      });
    }
  }

  const remotes: RemoteGroup[] = Array.from(remoteGroups, ([name, remoteBranches]) => ({
    name,
    branches: remoteBranches
  }));

  return { branches, remotes };
}

export function App({ repos }: { repos: Array<GitRepo> }) {
  const { branches, remotes } = splitBranches(branchList.value ?? [], headBranch.value);

  return (
    <div class="flex min-h-screen flex-col">
      <GlobalToolbar repos={repos} />
      <div class="flex min-h-0 flex-1">
        <SidebarNavigator
          branches={branches}
          currentHead={headBranch.value}
          remotes={remotes}
          tags={[]}
          stashes={stashList.value}
          unstagedCount={unstagedCount.value}
          stagedCount={stagedCount.value}
        />
        <GraphView />
      </div>
      <ScrollShadow />
      <ContextMenu />
      <Dialog />
    </div>
  );
}
