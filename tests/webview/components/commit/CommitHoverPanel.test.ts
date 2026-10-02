// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GitCommitNode } from "@/backend/types";
import { setupWebviewTest } from "@tests/webview/test-utils";

let CommitHoverPanel: typeof import("@/webview/components/commit/CommitHoverPanel").CommitHoverPanel;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ CommitHoverPanel } = await import("@/webview/components/commit/CommitHoverPanel"));
});

afterEach(() => {
  if (container) {
    render(null, container);
  }
});

describe("CommitHoverPanel", () => {
  it("renders full commit message, author, date, and sha", () => {
    container = document.createElement("div");
    const commit: GitCommitNode = {
      hash: "1234567890abcdef1234567890abcdef12345678",
      parentHashes: [],
      author: "Linus Torvalds",
      email: "torvalds@example.com",
      date: 1700000000,
      message: "feat: full detailed commit message\n\nThis is a multiline commit message body.",
      refs: [{ hash: "1234567890abcdef1234567890abcdef12345678", name: "main", type: "head" }]
    };

    const dummyRect = {
      top: 100,
      bottom: 124,
      left: 100,
      right: 500,
      width: 400,
      height: 24,
      x: 100,
      y: 100,
      toJSON: () => {}
    } as DOMRect;

    render(
      h(CommitHoverPanel, {
        commit,
        anchorRect: dummyRect
      }),
      container
    );

    expect(container.textContent).toContain("Linus Torvalds");
    expect(container.textContent).toContain("torvalds@example.com");
    expect(container.textContent).toContain("1234567");
    expect(container.textContent).toContain("This is a multiline commit message body.");
    expect(container.textContent).toContain("main");
  });
});
