import { batch, signal } from "@preact/signals";

import type { GraphPath, GraphRow } from "@/types";
import { rpcClient } from "@/webview/lib/rpc/rpc-client";

// Quản lý cửa sổ ảo (Virtual Scrolling Window) cho đồ thị Git:
// Lưu trữ tập hợp các dòng và đường nối SVG trong tầm nhìn hiển thị (+ buffer),
// nạp vi sai qua RPC graph.load và graph.window tốc độ cao dưới 5ms.
// Tham khảo thiết kế:
// docs/02_design/001_windows/11_Webview_FSharp_Core_Migration.md (Nhiệm vụ 11.2).

export const BUFFER_SIZE = 50;

export const totalCommits = signal<number>(0);
export const maxLane = signal<number>(0);
export const commitHashes = signal<string[]>([]);

export const windowFrom = signal<number>(0);
export const windowRows = signal<GraphRow[]>([]);
export const windowPaths = signal<GraphPath[]>([]);

export const isGraphLoading = signal<boolean>(false);
export const isGraphInitialized = signal<boolean>(false);

let pendingWindowRequest: { from: number; to: number } | null = null;
let isFetchingWindow = false;

export const graphWindowStore = {
  async loadGraph(repoPath: string): Promise<void> {
    isGraphLoading.value = true;
    try {
      const result = await rpcClient.request("graph.load", { repoPath });
      batch(() => {
        totalCommits.value = result.commitCount;
        maxLane.value = result.maxLane;
        commitHashes.value = result.commits;
        isGraphInitialized.value = true;
      });

      if (result.commitCount > 0) {
        const initialTo = Math.min(BUFFER_SIZE * 2, result.commitCount - 1);
        await this.requestWindow(0, initialTo);
      } else {
        batch(() => {
          windowFrom.value = 0;
          windowRows.value = [];
          windowPaths.value = [];
        });
      }
    } finally {
      isGraphLoading.value = false;
    }
  },

  async requestWindow(from: number, to: number): Promise<void> {
    const clampedFrom = Math.max(0, from);
    const count = totalCommits.value;
    const clampedTo = count > 0 ? Math.min(count - 1, Math.max(clampedFrom, to)) : 0;

    if (count === 0) {
      return;
    }

    if (isFetchingWindow) {
      pendingWindowRequest = { from: clampedFrom, to: clampedTo };
      return;
    }

    isFetchingWindow = true;
    try {
      const result = await rpcClient.request("graph.window", {
        from: clampedFrom,
        to: clampedTo
      });

      batch(() => {
        windowFrom.value = result.from;
        windowRows.value = result.rows;
        windowPaths.value = result.paths;
      });
    } finally {
      isFetchingWindow = false;
      if (pendingWindowRequest !== null) {
        const next = pendingWindowRequest;
        pendingWindowRequest = null;
        void this.requestWindow(next.from, next.to);
      }
    }
  },

  clear(): void {
    batch(() => {
      totalCommits.value = 0;
      maxLane.value = 0;
      commitHashes.value = [];
      windowFrom.value = 0;
      windowRows.value = [];
      windowPaths.value = [];
      isGraphLoading.value = false;
      isGraphInitialized.value = false;
    });
  }
};
