// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GitCommitNode } from "@/backend/types";
import { setupWebviewTest } from "@tests/webview/test-utils";

let AvatarZoomPreview: typeof import("@/webview/components/commit/AvatarZoomPreview").AvatarZoomPreview;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ AvatarZoomPreview } = await import("@/webview/components/commit/AvatarZoomPreview"));
});

afterEach(() => {
  if (container) {
    render(null, container);
  }
});

describe("AvatarZoomPreview", () => {
  const dummyCommit: GitCommitNode = {
    hash: "1234567890abcdef1234567890abcdef12345678",
    parentHashes: [],
    author: "Ada Lovelace",
    email: "ada@example.com",
    date: 1700000000,
    message: "feat: first computer algorithm",
    refs: []
  };

  const dummyRect = {
    top: 200,
    bottom: 224,
    left: 40,
    right: 64,
    width: 24,
    height: 24,
    x: 40,
    y: 200,
    toJSON: () => {}
  } as DOMRect;

  it("renders 5x hexagon and author badge", () => {
    container = document.createElement("div");
    render(
      h(AvatarZoomPreview, {
        info: {
          commit: dummyCommit,
          anchorRect: dummyRect,
          colour: "#0085d9",
          author: "Ada Lovelace",
          nodeType: "commit"
        }
      }),
      container
    );

    // Should contain the author text in badge
    expect(container.textContent).toContain("Ada Lovelace");

    // Should render SVG with width 140
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("140");

    // Should have top layer fixed position
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("fixed");
    expect(wrapper.className).toContain("z-[60]");
  });

  it("renders semantic icon when no avatar image", () => {
    container = document.createElement("div");
    render(
      h(AvatarZoomPreview, {
        info: {
          commit: { ...dummyCommit, email: "" },
          anchorRect: dummyRect,
          colour: "#10b981",
          author: "Merge Author",
          nodeType: "merge"
        }
      }),
      container
    );

    expect(container.textContent).toContain("Merge Author");
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});
