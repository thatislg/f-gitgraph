import { simpleGit, type SimpleGit } from "simple-git";

import { getCommitMetadata } from "@/backend/queries/commitMetadata";
import { config } from "@/extension/config";
import { getSidecar } from "@/extension/sidecar/graph-service";

import { GraphDataBridge } from "./graph-data-bridge";
import type { GraphWindow, MetadataProvider } from "./graph-merge";
import type { InitSuccess } from "./protocol";

// Dịch vụ cầu nối dữ liệu đồ thị: quản lý vòng đời GraphDataBridge gắn với thể hiện
// sidecar đang chạy, bơm MetadataProvider đọc metadata commit từ Git để gộp với hình
// học F#. Khởi tạo khi Webview nạp một kho, dùng chung cho các RPC graph.load/graph.window.

let bridge: GraphDataBridge | undefined;

/** Nạp đồ thị cho một kho, trả về tổng số commit, số làn và danh sách hash theo thứ tự topo. */
export async function loadGraph(repo: string): Promise<InitSuccess> {
  const git: SimpleGit = simpleGit({
    baseDir: repo,
    binary: config.gitPath(),
    maxConcurrentProcesses: 6,
    trimmed: false
  });
  const metadataProvider: MetadataProvider = (hashes) =>
    getCommitMetadata(git, hashes, config.dateType(), true);

  bridge = new GraphDataBridge(getSidecar(), metadataProvider);
  return bridge.initialize(repo);
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

/** Giải phóng cầu nối khi đóng panel. */
export function disposeGraphBridge(): void {
  bridge = undefined;
}
