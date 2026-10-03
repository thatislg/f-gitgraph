import { describe, expect, it } from "vitest";

import { mergeGraphWindow } from "@/extension/sidecar/graph-merge";
import type { GitCommitNode } from "@/types";

const node = (overrides: Partial<{ x: number; lane: number; color: number }> = {}) => ({
  x: overrides.x ?? 10,
  y: 24,
  lane: overrides.lane ?? 0,
  color: overrides.color ?? 0,
  isMerge: false,
  isRoot: false
});

describe("mergeGraphWindow", () => {
  it("merges geometry with metadata by row offset", () => {
    const commits = [
      "1111111111111111111111111111111111111111",
      "2222222222222222222222222222222222222222"
    ];
    const metadata = new Map<string, GitCommitNode>([
      [
        "1111111111111111111111111111111111111111",
        {
          hash: "1111111111111111111111111111111111111111",
          parentHashes: [],
          author: "An Nguyễn",
          email: "an@example.com",
          date: 100,
          message: "init",
          refs: []
        }
      ]
    ]);

    const rows = mergeGraphWindow(commits, metadata, [node(), node({ x: 26, lane: 1 })], 0);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.hash).toBe("1111111111111111111111111111111111111111");
    expect(rows[0]!.metadata?.author).toBe("An Nguyễn");
    expect(rows[0]!.x).toBe(10);
    expect(rows[1]!.hash).toBe("2222222222222222222222222222222222222222");
    expect(rows[1]!.metadata).toBeUndefined();
    expect(rows[1]!.lane).toBe(1);
  });

  it("offsets hashes by the window start row", () => {
    const commits = ["a", "b", "c", "d"];
    const rows = mergeGraphWindow(commits, new Map(), [node(), node()], 2);
    expect(rows[0]!.hash).toBe("c");
    expect(rows[1]!.hash).toBe("d");
  });
});
