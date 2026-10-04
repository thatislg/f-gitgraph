import { copyToClipboard } from "@/extension/handlers/clipboard";
import { graphLoad, graphWindow } from "@/extension/handlers/graph";
import { webviewInitialize } from "@/extension/handlers/initialize";
import { initializeRepo } from "@/extension/handlers/initialize-repo";
import { scanRepos } from "@/extension/handlers/scan-repo";
import type { CommitOrdering, RpcMethod, RpcMethodMap } from "@/types";

type RpcHandlers = {
  [M in RpcMethod]: (
    params: unknown
  ) => RpcMethodMap[M]["result"] | Promise<RpcMethodMap[M]["result"]>;
};

export const rpcHandlers = {
  "clipboard.copy": async (params: unknown) => copyToClipboard(params),
  "webview.initialize": async () => webviewInitialize(),
  "git.init": () => initializeRepo(),
  "repo.scan": () => scanRepos(),
  "graph.load": (params: unknown) =>
    graphLoad(
      params as { repoPath: string; branch?: string | null; commitOrdering?: CommitOrdering | null }
    ),
  "graph.window": (params: unknown) => graphWindow(params as { from: number; to: number })
} satisfies RpcHandlers;
