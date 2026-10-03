import { getSidecar } from "@/extension/sidecar/graph-service";
import type { GraphLoadResult, GraphWindowResult } from "@/types";

// RPC handler cho đồ thị: đọc thứ tự commit + hình học từ nhân F# qua sidecar.
// Metadata (tác giả, tiêu đề, refs) sẽ được gộp ở tầng cầu nối dữ liệu khi Webview
// chuyển sang dùng hình học F# thay cho computeGraphLayout cũ.

export async function graphLoad(params: { repoPath: string }): Promise<GraphLoadResult> {
  const init = await getSidecar().initialize(params.repoPath);
  return {
    commitCount: init.commitCount,
    maxLane: init.maxLane,
    commits: init.commits
  };
}

export async function graphWindow(params: {
  from: number;
  to: number;
}): Promise<GraphWindowResult> {
  const range = await getSidecar().queryRange(params.from, params.to);
  return { nodes: range.nodes, paths: range.paths };
}
