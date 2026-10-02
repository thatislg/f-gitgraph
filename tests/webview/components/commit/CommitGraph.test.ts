// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GitCommitNode } from "@/backend/types";
import type { GraphLayout } from "@/webview/graph/types";
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

    const commits: GitCommitNode[] = [
      {
        hash: "commit-1",
        parentHashes: ["parent-1", "parent-2"], // merge
        author: "Alice",
        email: "alice@example.com",
        date: 1000,
        message: "Merge pull request",
        refs: []
      },
      {
        hash: "commit-2",
        parentHashes: ["parent-1"], // regular
        author: "Bob",
        email: "bob@example.com",
        date: 900,
        message: "Normal commit",
        refs: [{ hash: "commit-2", name: "v1.0", type: "tag" }]
      }
    ];

    const layout: GraphLayout = {
      branches: [
        {
          colour: 0,
          lines: [{ p1: { x: 0, y: 0 }, p2: { x: 0, y: 1 }, isCommitted: true, lockedFirst: false }]
        }
      ],
      vertices: [
        { x: 0, y: 0, colour: 0, isCommitted: true, isCurrent: false, isMerge: true },
        { x: 0, y: 1, colour: 0, isCommitted: true, isCurrent: false, isMerge: false }
      ],
      lanes: 1
    };

    render(
      h(CommitGraph, {
        layout,
        commits,
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

    const layout: GraphLayout = {
      branches: [],
      vertices: [{ x: 0, y: 0, colour: 1, isCommitted: true, isCurrent: true }],
      lanes: 1
    };

    render(
      h(CommitGraph, {
        layout,
        commits: [],
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
