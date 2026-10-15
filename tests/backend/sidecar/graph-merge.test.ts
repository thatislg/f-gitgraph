import { describe, expect, it } from "vitest";

import {
  buildUncommittedRow,
  mergeGraphWindow,
  shiftPathD,
  UNCOMMITTED_CHANGES_HASH
} from "@/extension/sidecar/graph-merge";
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

describe("buildUncommittedRow", () => {
  it("creates the synthetic uncommitted row at lane 0", () => {
    const row = buildUncommittedRow();
    expect(row.hash).toBe(UNCOMMITTED_CHANGES_HASH);
    expect(row.metadata?.hash).toBe(UNCOMMITTED_CHANGES_HASH);
    expect(row.lane).toBe(0);
    expect(row.color).toBe(0);
    expect(row.isMerge).toBe(false);
    expect(row.isRoot).toBe(false);
  });
});

describe("shiftPathD", () => {
  it("shifts y coordinates of a vertical path down", () => {
    const shifted = shiftPathD("M 16 18 V 42", 24);
    expect(shifted).toBe("M 16 42 V 66");
  });

  it("shifts y coordinates of an orthogonal bend-at-child path", () => {
    const shifted = shiftPathD("M 16 18 H 28 Q 36 18 36 24 V 42", 24);
    expect(shifted).toBe("M 16 42 H 28 Q 36 42 36 48 V 66");
  });

  it("shifts y coordinates of an orthogonal bend-at-parent path", () => {
    const shifted = shiftPathD("M 16 18 V 36 Q 16 42 22 42 H 36", 24);
    expect(shifted).toBe("M 16 42 V 60 Q 16 66 22 66 H 36");
  });

  it("returns the string unchanged for a zero offset", () => {
    expect(shiftPathD("M 16 18 V 42", 0)).toBe("M 16 18 V 42");
  });

  it("returns the string unchanged when empty", () => {
    expect(shiftPathD("", 24)).toBe("");
  });
});
