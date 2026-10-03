import { simpleGit, type SimpleGit } from "simple-git";
import * as vscode from "vscode";

import { getCommitMetadata } from "@/backend/queries/commitMetadata";
import { config } from "@/extension/config";
import { rpcNotify } from "@/extension/rpc/rpc-notify";
import { getSidecar } from "@/extension/sidecar/graph-service";
import { logger } from "@/extension/util/logger";
import { watchGitRefs } from "@/extension/watchers/git-ref.watcher";

import { GraphDataBridge } from "./graph-data-bridge";
import type { GraphWindow, MetadataProvider } from "./graph-merge";
import type { InitSuccess } from "./protocol";

// Dịch vụ cầu nối dữ liệu đồ thị: quản lý vòng đời GraphDataBridge gắn với thể hiện
// sidecar đang chạy, bơm MetadataProvider đọc metadata commit từ Git để gộp với hình
// học F#. Tự động theo dõi biến động refs (.git/HEAD, refs) để làm mới vi sai qua invalidate.

let bridge: GraphDataBridge | undefined;
let currentRepo: string | undefined;
let refWatcher: vscode.Disposable | undefined;

/** Nạp đồ thị cho một kho, trả về tổng số commit, số làn và danh sách hash theo thứ tự topo. */
export async function loadGraph(repo: string): Promise<InitSuccess> {
  if (currentRepo !== repo) {
    refWatcher?.dispose();
    refWatcher = undefined;
    currentRepo = repo;
  }

  const git: SimpleGit = simpleGit({
    baseDir: repo,
    binary: config.gitPath(),
    maxConcurrentProcesses: 6,
    trimmed: false
  });
  const metadataProvider: MetadataProvider = (hashes) =>
    getCommitMetadata(git, hashes, config.dateType(), true);

  bridge = new GraphDataBridge(getSidecar(), metadataProvider);
  const result = await bridge.initialize(repo);

  if (refWatcher === undefined) {
    refWatcher = watchGitRefs(repo, async () => {
      try {
        logger.debug(`Git refs changed for ${repo}, invalidating graph`);
        await invalidateGraph();
        await rpcNotify.notify("repo.updated", { path: repo });
      } catch (error) {
        logger.error(`Failed to invalidate graph on ref change: ${String(error)}`);
      }
    });
  }

  return result;
}

/** Trả về một cửa sổ dòng đã gộp hình học F# với metadata commit. */
export async function loadGraphWindow(from: number, to: number): Promise<GraphWindow> {
  if (bridge === undefined) {
    throw new Error("đồ thị chưa được nạp");
  }
  return bridge.loadWindow(from, to);
}

/** Làm mới bộ nhớ đệm đồ thị sau khi kho biến động, trả về trạng thái mới. */
export async function invalidateGraph(): Promise<InitSuccess> {
  if (bridge === undefined) {
    throw new Error("đồ thị chưa được nạp");
  }
  return bridge.invalidate();
}

/** Giải phóng cầu nối và watcher khi đóng panel hoặc đổi kho. */
export function disposeGraphBridge(): void {
  refWatcher?.dispose();
  refWatcher = undefined;
  bridge = undefined;
  currentRepo = undefined;
}
