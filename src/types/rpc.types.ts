import type { LocalizedStrings } from "@/extension/l10n/webviewL10n";
import type { GitCommitNode, GitRepo, RepoChange, RepoUpdate, WebviewConfig } from "@/types";

export type CommitOrdering = "topological" | "date";

export type WebviewInitialize = {
  l10n: LocalizedStrings;
  config: WebviewConfig;
};

export type ScanRepoResult = {
  repos: GitRepo[];
};

/** Tọa độ hình học một nút commit do nhân F# cung cấp. */
export type GraphNode = {
  x: number;
  y: number;
  lane: number;
  color: number;
  isMerge: boolean;
  isRoot: boolean;
};

/** Đường nối nhánh (lệnh vẽ SVG `d`) do nhân F# cung cấp. */
export type GraphPath = {
  d: string;
  color: number;
};

export type GraphLoadResult = {
  commitCount: number;
  maxLane: number;
  commits: string[];
};

/** Một dòng đồ thị đã gộp hình học F# với metadata commit, sẵn sàng cho Webview vẽ. */
export type GraphRow = {
  hash: string;
  metadata: GitCommitNode | undefined;
  x: number;
  y: number;
  lane: number;
  color: number;
  isMerge: boolean;
  isRoot: boolean;
};

export type GraphWindowResult = {
  from: number;
  rows: GraphRow[];
  paths: GraphPath[];
};

export type RpcMethodMap = {
  "clipboard.copy": {
    params: string;
    result: boolean;
  };
  "webview.initialize": {
    params: null;
    result: WebviewInitialize;
  };
  "git.init": {
    params: null;
    result: boolean;
  };
  "repo.scan": {
    params: null;
    result: ScanRepoResult;
  };
  "graph.load": {
    params: { repoPath: string; branch?: string | null; commitOrdering?: CommitOrdering | null };
    result: GraphLoadResult;
  };
  "graph.window": {
    params: { from: number; to: number };
    result: GraphWindowResult;
  };
};

export type RpcMethod = keyof RpcMethodMap;

export type RpcNotificationMap = {
  "repo.changed": RepoChange;
  "repo.rescan": null;
  "repo.updated": RepoUpdate;
};

export type RpcNotificationName = keyof RpcNotificationMap;

export type RpcNotification<N extends RpcNotificationName = RpcNotificationName> =
  N extends RpcNotificationName
    ? {
        kind: "rpc.notify";
        id: string;
        name: N;
        message: RpcNotificationMap[N];
      }
    : never;

export type RpcRequest<M extends RpcMethod = RpcMethod> = M extends RpcMethod
  ? {
      kind: "rpc.request";
      id: string;
      method: M;
      params: RpcMethodMap[M]["params"];
    }
  : never;

export type RpcResponse<M extends RpcMethod = RpcMethod> =
  | {
      kind: "rpc.response";
      id: string;
      success: true;
      result: RpcMethodMap[M]["result"];
    }
  | {
      kind: "rpc.response";
      id: string;
      success: false;
      error: string;
    };
