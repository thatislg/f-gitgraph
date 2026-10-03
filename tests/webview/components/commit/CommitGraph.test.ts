// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GraphPath, GraphRow } from "@/types";

import { setupWebviewTest } from "@tests/webview/test-utils";

let CommitGraph: typeof import("@/webview/components/commit/CommitGraph").CommitGraph;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ CommitGraph } = await import("@/webview/components/commit/CommitGraph"));
});

afterEach(() => {
  if (container) {
    render(null, container);
  }
});

describe("CommitGraph", () => {
  it("renders hexagonal commit nodes with semantic icons", () => {
    container = document.createElement("div");

    const rows: GraphRow[] = [
      {
        hash: "commit-1",
        metadata: {
          hash: "commit-1",
          parentHashes: ["parent-1", "parent-2"],
          author: "Alice",
          email: "alice@example.com",
          date: 1000,
          message: "Merge pull request",
          refs: []
        },
        x: 10,
        y: 12,
        lane: 0,
        color: 0,
        isMerge: true,
        isRoot: false
      },
      {
        hash: "commit-2",
        metadata: {
          hash: "commit-2",
          parentHashes: ["parent-1"],
          author: "Bob",
          email: "bob@example.com",
          date: 900,
          message: "Normal commit",
          refs: [{ hash: "commit-2", name: "v1.0", type: "tag" }]
        },
        x: 10,
        y: 36,
        lane: 0,
        color: 0,
        isMerge: false,
        isRoot: false
      }
    ];

    const paths: GraphPath[] = [{ d: "M 10 18 L 10 30", color: 0 }];

    render(
      h(CommitGraph, {
        rows,
        paths,
        maxLane: 1,
        expansion: null
      }),
      container
    );

    const nodes = container.querySelectorAll(".graph-node-hexagon");
    expect(nodes.length).toBe(2);

    // First node is merge commit
    expect(nodes[0]?.getAttribute("data-node-type")).toBe("merge");
    // Second node has tag
    expect(nodes[1]?.getAttribute("data-node-type")).toBe("tag");
  });

  it("supports custom icon injection via renderNodeIcon prop", () => {
    container = document.createElement("div");

    const rows: GraphRow[] = [
      {
        hash: "commit-1",
        metadata: {
          hash: "commit-1",
          parentHashes: [],
          author: "Alice",
          email: "alice@example.com",
          date: 1000,
          message: "Root commit",
          refs: [{ hash: "commit-1", name: "main", type: "head" }]
        },
        x: 10,
        y: 12,
        lane: 0,
        color: 1,
        isMerge: false,
        isRoot: true
      }
    ];

    render(
      h(CommitGraph, {
        rows,
        paths: [],
        maxLane: 1,
        expansion: null,
        renderNodeIcon: () => h("text", { id: "custom-glyph" }, "★")
      }),
      container
    );

    const glyph = container.querySelector("#custom-glyph");
    expect(glyph).not.toBeNull();
    expect(glyph?.textContent).toBe("★");
  });
});
