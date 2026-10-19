import type { GitRepo } from "@/types";

import { SidebarNavigator } from "./components/sidebar/SidebarNavigator";
import { GlobalToolbar } from "./components/toolbar/GlobalToolbar";
import { ContextMenu } from "./components/ui/ContextMenu";
import { Dialog } from "./components/ui/Dialog";
import { ScrollShadow } from "./components/ui/ScrollShadow";
import { GraphView } from "./layout/GraphView";
import { branchList, headBranch } from "./lib/stores";
import { stagedCount, unstagedCount } from "./lib/stores/staging.store";
import { stashList } from "./lib/stores/sync.store";

export function App({ repos }: { repos: Array<GitRepo> }) {
  const branches = (branchList.value ?? []).map((name) => ({
    name,
    isHead: name === headBranch.value,
    aheadCount: 0,
    upstream: null
  }));

  return (
    <div class="flex min-h-screen flex-col">
      <GlobalToolbar repos={repos} />
      <div class="flex min-h-0 flex-1">
        <SidebarNavigator
          branches={branches}
          currentHead={headBranch.value}
          remotes={[]}
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
