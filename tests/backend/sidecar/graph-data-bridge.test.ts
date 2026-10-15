import { describe, expect, it, vi } from "vitest";

import type { WorkspaceStatusResult } from "@/backend/queries/workspaceStatus";
import { GraphDataBridge } from "@/extension/sidecar/graph-data-bridge";
import { UNCOMMITTED_CHANGES_HASH } from "@/extension/sidecar/graph-merge";
import type { SidecarManager } from "@/extension/sidecar/sidecar-manager";
import type { GitCommitNode } from "@/types";

function makeStatus(overrides: Partial<WorkspaceStatusResult> = {}): WorkspaceStatusResult {
  return {
    head: "aaa",
    ahead: 0,
    behind: 0,
    stagedFiles: [],
    unstagedFiles: [],
    conflictedFiles: [],
    isClean: true,
    ...overrides
  };
}

function makeNode(y: number, lane = 0): { x: number; y: number; lane: number; color: number; isMerge: boolean; isRoot: boolean } {
  return { x: 16 + lane * 20, y, lane, color: lane, isMerge: false, isRoot: false };
}

describe("GraphDataBridge uncommitted row", () => {
  it("prepends the uncommitted row and bumps the commit count on a dirty tree", async () => {
    const sidecar = {
      initialize: vi.fn().mockResolvedValue({
        commitCount: 2,
        maxLane: 0,
        commits: ["aaa", "bbb"]
      }),
      queryRange: vi.fn(),
      invalidate: vi.fn()
    } as unknown as SidecarManager;
    const metadata = vi.fn().mockResolvedValue(new Map<string, GitCommitNode>());
    const status = vi.fn().mockResolvedValue(makeStatus({ isClean: false }));

    const bridge = new GraphDataBridge(sidecar, metadata, status);
    const init = await bridge.initialize("/repo");

    expect(init.commitCount).toBe(3);
    expect(init.commits).toEqual([UNCOMMITTED_CHANGES_HASH, "aaa", "bbb"]);
  });

  it("does not prepend the uncommitted row on a clean tree", async () => {
    const sidecar = {
      initialize: vi.fn().mockResolvedValue({
        commitCount: 2,
        maxLane: 0,
        commits: ["aaa", "bbb"]
      }),
      queryRange: vi.fn(),
      invalidate: vi.fn()
    } as unknown as SidecarManager;
    const metadata = vi.fn().mockResolvedValue(new Map<string, GitCommitNode>());
    const status = vi.fn().mockResolvedValue(makeStatus({ isClean: true }));

    const bridge = new GraphDataBridge(sidecar, metadata, status);
    const init = await bridge.initialize("/repo");

    expect(init.commitCount).toBe(2);
    expect(init.commits).toEqual(["aaa", "bbb"]);
  });

  it("loads the uncommitted row at the top and shifts real commit geometry down", async () => {
    const sidecar = {
      initialize: vi.fn().mockResolvedValue({
        commitCount: 2,
        maxLane: 0,
        commits: ["aaa", "bbb"]
      }),
      queryRange: vi.fn().mockResolvedValue({
        nodes: [makeNode(12, 0), makeNode(36, 0)],
        paths: [{ d: "M 16 18 V 30", color: 0 }]
      }),
      invalidate: vi.fn()
    } as unknown as SidecarManager;
    const metadata = vi.fn().mockResolvedValue(new Map<string, GitCommitNode>());
    const status = vi.fn().mockResolvedValue(makeStatus({ isClean: false }));

    const bridge = new GraphDataBridge(sidecar, metadata, status);
    await bridge.initialize("/repo");

    const window = await bridge.loadWindow(0, 2);

    expect(window.rows).toHaveLength(3);
    expect(window.rows[0]!.hash).toBe(UNCOMMITTED_CHANGES_HASH);
    expect(window.rows[0]!.y).toBe(12);
    // Real commits shifted down by one row (ROW_HEIGHT = 24).
    expect(window.rows[1]!.hash).toBe("aaa");
    expect(window.rows[1]!.y).toBe(36);
    expect(window.rows[2]!.hash).toBe("bbb");
    expect(window.rows[2]!.y).toBe(60);
    // Branch line shifted down by one row too.
    expect(window.paths[0]!.d).toBe("M 16 42 V 54");
  });

  it("translates a non-zero window offset when the uncommitted row is present", async () => {
    const sidecar = {
      initialize: vi.fn().mockResolvedValue({
        commitCount: 3,
        maxLane: 0,
        commits: ["aaa", "bbb", "ccc"]
      }),
      queryRange: vi.fn().mockResolvedValue({
        nodes: [makeNode(12, 0), makeNode(36, 0)],
        paths: []
      }),
      invalidate: vi.fn()
    } as unknown as SidecarManager;
    const metadata = vi.fn().mockResolvedValue(new Map<string, GitCommitNode>());
    const status = vi.fn().mockResolvedValue(makeStatus({ isClean: false }));

    const bridge = new GraphDataBridge(sidecar, metadata, status);
    await bridge.initialize("/repo");

    // Webview window [1, 2] maps to real commits [0, 1], no star row.
    const window = await bridge.loadWindow(1, 2);

    expect(sidecar.queryRange).toHaveBeenCalledWith(0, 1);
    expect(window.rows).toHaveLength(2);
    expect(window.rows[0]!.hash).toBe("aaa");
    expect(window.rows[1]!.hash).toBe("bbb");
  });
});
