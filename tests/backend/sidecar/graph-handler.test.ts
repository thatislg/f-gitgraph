import { beforeEach, describe, expect, it, vi } from "vitest";

import { graphLoad, graphWindow } from "@/extension/handlers/graph";
import { loadGraph, loadGraphWindow } from "@/extension/sidecar/graph-bridge-service";

vi.mock("@/extension/sidecar/graph-bridge-service", () => ({
  loadGraph: vi.fn(),
  loadGraphWindow: vi.fn()
}));

const loadGraphMock = vi.mocked(loadGraph);
const loadGraphWindowMock = vi.mocked(loadGraphWindow);

describe("graph RPC handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("graphLoad delegates to the graph bridge and returns init info", async () => {
    loadGraphMock.mockResolvedValue({ commitCount: 3, maxLane: 1, commits: ["aaa", "bbb", "ccc"] });

    const result = await graphLoad({ repoPath: "/some/repo" });

    expect(loadGraphMock).toHaveBeenCalledWith("/some/repo", undefined, undefined);
    expect(result.commitCount).toBe(3);
    expect(result.maxLane).toBe(1);
    expect(result.commits).toEqual(["aaa", "bbb", "ccc"]);
  });

  it("graphWindow delegates to the graph bridge and returns merged rows", async () => {
    loadGraphWindowMock.mockResolvedValue({
      from: 0,
      rows: [
        {
          hash: "aaa",
          metadata: undefined,
          x: 10,
          y: 24,
          lane: 0,
          color: 0,
          isMerge: false,
          isRoot: false
        }
      ],
      paths: [{ d: "M 10 24 L 10 48", color: 0 }]
    });

    const result = await graphWindow({ from: 0, to: 0 });

    expect(loadGraphWindowMock).toHaveBeenCalledWith(0, 0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.x).toBe(10);
    expect(result.rows[0]!.lane).toBe(0);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]!.d).toBe("M 10 24 L 10 48");
  });

  it("graphLoad propagates errors from the bridge", async () => {
    loadGraphMock.mockRejectedValue(new Error("sidecar chưa được khởi động"));

    await expect(graphLoad({ repoPath: "/some/repo" })).rejects.toThrow(
      "sidecar chưa được khởi động"
    );
  });
});
