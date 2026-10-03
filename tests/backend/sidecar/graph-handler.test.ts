import { beforeEach, describe, expect, it, vi } from "vitest";

import { graphLoad, graphWindow } from "@/extension/handlers/graph";
import { getSidecar } from "@/extension/sidecar/graph-service";
import type { InitSuccess, RangeData } from "@/extension/sidecar/protocol";

vi.mock("@/extension/sidecar/graph-service", () => ({
  getSidecar: vi.fn()
}));

const getSidecarMock = vi.mocked(getSidecar);

describe("graph RPC handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("graphLoad maps sidecar init into commit count, max lane and ordered hashes", async () => {
    const init: InitSuccess = {
      commitCount: 3,
      maxLane: 1,
      commits: ["aaa", "bbb", "ccc"]
    };
    getSidecarMock.mockReturnValue({
      initialize: vi.fn().mockResolvedValue(init)
    } as never);

    const result = await graphLoad({ repoPath: "/some/repo" });

    expect(result.commitCount).toBe(3);
    expect(result.maxLane).toBe(1);
    expect(result.commits).toEqual(["aaa", "bbb", "ccc"]);
  });

  it("graphWindow maps sidecar range into nodes and paths", async () => {
    const range: RangeData = {
      nodes: [{ x: 10, y: 24, lane: 0, color: 0, isMerge: false, isRoot: false }],
      paths: [{ d: "M 10 24 L 10 48", color: 0 }]
    };
    getSidecarMock.mockReturnValue({
      queryRange: vi.fn().mockResolvedValue(range)
    } as never);

    const result = await graphWindow({ from: 0, to: 0 });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.x).toBe(10);
    expect(result.nodes[0]!.lane).toBe(0);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]!.d).toBe("M 10 24 L 10 48");
  });

  it("graphLoad throws when the sidecar is not started", async () => {
    getSidecarMock.mockImplementation(() => {
      throw new Error("sidecar chưa được khởi động");
    });

    await expect(graphLoad({ repoPath: "/some/repo" })).rejects.toThrow(
      "sidecar chưa được khởi động"
    );
  });
});
