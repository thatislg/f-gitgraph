import type { WorkspaceStatusResult } from "@/backend/queries/workspaceStatus";

import type { GitCommitDetails } from "./git";

// Các kiểu trả về của truy vấn đồng bộ & stash được định nghĩa trực tiếp tại
// `src/types/queries.ts` theo chuẩn Contract-First (Nguyên Tắc 1). Tầng Webview phải
// import được các kiểu này mà không kéo theo thư viện Node.js (Zero Node.js Runtime).

export type SyncStatusResult = {
  ahead: number;
  behind: number;
  upstream: string | null;
  isDetached: boolean;
};

export type StashRecord = {
  index: number;
  hash: string;
  message: string;
  date: string;
};

export type StashListResult = {
  stashes: StashRecord[];
};

export type ListTagsInput = {
  sort?: "creatordate" | "name";
};

export type TagListResult = {
  tags: string[];
};

type QueryPayloads = {
  commitDetails: {
    request: { repo: string; commitHash: string };
    response: { commitDetails: GitCommitDetails | null };
  };
  loadBranches: {
    request: { repo: string; showRemoteBranches: boolean; hard: boolean };
    response: {
      repo: string;
      branches: string[];
      head: string | null;
      hard: boolean;
      isRepo: boolean;
    };
  };
  remoteBranches: {
    request: { repo: string };
    response: { repo: string; remotes: Array<{ name: string; branches: string[] }> };
  };
  workspaceStatus: {
    request: { repo: string };
    response: WorkspaceStatusResult;
  };
  headCommit: {
    request: { repo: string };
    response: { headCommit: { subject: string; description: string } | null };
  };
  syncStatus: {
    request: { repo: string };
    response: SyncStatusResult;
  };
  stashList: {
    request: { repo: string };
    response: StashListResult;
  };
  listTags: {
    request: { repo: string; sort?: "creatordate" | "name" };
    response: TagListResult;
  };
};

export type QueryRequest = {
  [K in keyof QueryPayloads]: { command: K } & QueryPayloads[K]["request"];
}[keyof QueryPayloads];

export type QueryResponse = {
  [K in keyof QueryPayloads]: { command: K } & QueryPayloads[K]["response"];
}[keyof QueryPayloads];

export type QueryResult<T extends keyof QueryPayloads> = QueryPayloads[T]["response"];
