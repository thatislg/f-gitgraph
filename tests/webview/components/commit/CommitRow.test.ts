// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GitCommitNode } from "@/backend/types";

import { setupWebviewTest } from "@tests/webview/test-utils";

let CommitRow: typeof import("@/webview/components/commit/CommitRow").CommitRow;
let container: HTMLTableSectionElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ CommitRow } = await import("@/webview/components/commit/CommitRow"));
});

afterEach(() => {
  render(null, container);
});

describe("CommitRow", () => {
  it("reserves description space and exposes truncated content", () => {
    const branch = "feature/a-very-long-branch-name";
    const message = "Commit message after the branch label";
    const commit: GitCommitNode = {
      hash: "abc123456789",
      parentHashes: [],
      author: "Author",
      email: "author@example.com",
      date: 0,
      message,
      refs: [{ hash: "abc123456789", name: branch, type: "head" }]
    };
    container = document.createElement("tbody");

    render(
      h(CommitRow, {
        commit,
        isHead: false,
        headBranch: null,
        messages: new Map(),
        colour: undefined,
        expanded: false,
        onSelect: undefined
      }),
      container
    );

    const description = container.querySelector("td:nth-child(2)");
    const refRegion = description?.querySelector(":scope > div > span:first-child");
    const messageRegion = description?.querySelector(":scope > div > span:last-child");

    expect(refRegion?.classList.contains("max-w-1/2")).toBe(true);
    expect(refRegion?.querySelector("[title]")?.getAttribute("title")).toBe(branch);
    expect(messageRegion?.classList.contains("flex-1")).toBe(true);
    expect(messageRegion?.textContent).toBe(message);
  });

  it("applies Flameshot purple glowing border and neon ambient gradient when selected", () => {
    const commit: GitCommitNode = {
      hash: "def456",
      parentHashes: [],
      author: "Author",
      email: "author@example.com",
      date: 0,
      message: "Test message",
      refs: []
    };
    container = document.createElement("tbody");

    render(
      h(CommitRow, {
        commit,
        isHead: false,
        headBranch: null,
        messages: new Map(),
        colour: "#ff5500",
        expanded: true,
        avatarRightX: 27,
        onSelect: () => {}
      }),
      container
    );

    const row = container.querySelector("tr");
    expect(row).not.toBeNull();
    const style = row?.getAttribute("style") ?? "";
    expect(style).toContain("--color-graph: #ff5500");
    // Flameshot glowing purple border
    expect(style).toContain("outline: 1.5px solid #a855f7");
    expect(style).toContain("box-shadow: 0 0 10px rgba(168, 85, 247, 0.45)");

    // Neon gradient on graph cell starting from avatar right edge (27px)
    const graphCell = container.querySelector("td:first-child");
    const graphCellStyle = graphCell?.getAttribute("style") ?? "";
    expect(graphCellStyle).toContain("linear-gradient");
    expect(graphCellStyle).toContain("transparent 27px");
    expect(graphCellStyle).toMatch(/(#ff5500|255, 85, 0)/);
  });
});
