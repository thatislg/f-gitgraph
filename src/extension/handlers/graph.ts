import { loadGraph, loadGraphWindow } from "@/extension/sidecar/graph-bridge-service";
import type { GraphLoadResult, GraphWindowResult } from "@/types";

// RPC handler cho đồ thị: điều phối qua GraphDataBridge để gộp hình học F# (sidecar)
// với metadata commit (tác giả, tiêu đề, refs), trả về dữ liệu phẳng sẵn sàng cho Webview.

export async function graphLoad(params: { repoPath: string }): Promise<GraphLoadResult> {
  return loadGraph(params.repoPath);
}

export async function graphWindow(params: {
  from: number;
  to: number;
}): Promise<GraphWindowResult> {
  return loadGraphWindow(params.from, params.to);
}
