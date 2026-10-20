import type { GitRepo } from "@/types";

import { WorkspaceLayout } from "./components/layout/WorkspaceLayout";
import { SearchFilterBar } from "./components/search/SearchFilterBar";
import { SidebarNavigator, type BranchItem } from "./components/sidebar/SidebarNavigator";
import { GlobalToolbar } from "./components/toolbar/GlobalToolbar";
import { ContextMenu } from "./components/ui/ContextMenu";
import { Dialog } from "./components/ui/Dialog";
import { LoadingBar } from "./components/ui/LoadingBar";
import { ScrollShadow } from "./components/ui/ScrollShadow";
import { GraphView } from "./layout/GraphView";
import { branchList, headBranch, remoteGroups } from "./lib/stores";
import { stagedCount, unstagedCount } from "./lib/stores/staging.store";
import { stashList, tagList } from "./lib/stores/sync.store";

const REMOTE_PREFIX = "remotes/";

/**
 * Tách mảng tên nhánh phẳng từ Backend (`branchList`) thành danh sách nhánh cục bộ.
 * Nhánh remote mang tiền tố `remotes/<remote>/<branch>` và bị loại bỏ tại đây vì phân
 * vùng REMOTES của Sidebar được cung cấp độc lập bởi tín hiệu `remoteGroups` (truy vấn
 * `remoteBranches`), không phụ thuộc cờ `showRemoteBranch`.
 */
function splitLocalBranches(names: string[], currentHead: string | null): BranchItem[] {
  const branches: BranchItem[] = [];

  for (const name of names) {
    if (name.startsWith(REMOTE_PREFIX)) {
      continue;
    }
    branches.push({
      name,
      isHead: name === currentHead,
      aheadCount: 0,
      upstream: null
    });
  }

  return branches;
}

export function App({ repos }: { repos: Array<GitRepo> }) {
  const branches = splitLocalBranches(branchList.value ?? [], headBranch.value);

  return (
    <>
      <WorkspaceLayout
        toolbar={<GlobalToolbar repos={repos} />}
        sidebar={
          <SidebarNavigator
            branches={branches}
            currentHead={headBranch.value}
            remotes={remoteGroups.value}
            tags={tagList.value}
            stashes={stashList.value}
            unstagedCount={unstagedCount.value}
            stagedCount={stagedCount.value}
          />
        }
        graph={
          <>
            <GraphView />
            <SearchFilterBar />
          </>
        }
      />
      <ScrollShadow />
      <ContextMenu />
      <Dialog />
      <LoadingBar />
    </>
  );
}
