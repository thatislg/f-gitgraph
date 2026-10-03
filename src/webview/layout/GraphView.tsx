import { CommitTable } from "@/webview/components/commit/CommitTable";
import { Loading } from "@/webview/components/ui/Loading";
import { commitHead, headBranch } from "@/webview/lib/stores";
import {
  isGraphInitialized,
  isGraphLoading,
  totalCommits
} from "@/webview/lib/stores/graph-window.store";
import { NoCommitsPage } from "@/webview/pages/NoCommitsPage";

export function GraphView() {
  if (!isGraphInitialized.value && isGraphLoading.value) {
    return (
      <main class="grid flex-1 place-items-center">
        <Loading />
      </main>
    );
  }

  if (isGraphInitialized.value && totalCommits.value === 0 && commitHead.value === null) {
    return <NoCommitsPage />;
  }

  return (
    <main class="relative">
      <CommitTable head={commitHead.value} headBranch={headBranch.value} />
    </main>
  );
}
