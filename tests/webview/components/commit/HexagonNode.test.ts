// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { GitCommitNode } from "@/backend/types";
import { setupWebviewTest } from "@tests/webview/test-utils";

let HexagonNode: typeof import("@/webview/components/commit/HexagonNode").HexagonNode;
let hexagonPoints: typeof import("@/webview/components/commit/HexagonNode").hexagonPoints;
let getCommitNodeType: typeof import("@/webview/components/commit/HexagonNode").getCommitNodeType;
let container: SVGSVGElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ HexagonNode, hexagonPoints, getCommitNodeType } = await import(
    "@/webview/components/commit/HexagonNode"
  ));
});

afterEach(() => {
  if (container) {
    render(null, container);
  }
});

describe("HexagonNode geometry and utils", () => {
  it("calculates pointy-topped hexagon points correctly", () => {
    const points = hexagonPoints(10, 20, 10, true);
    // Top point should have cx=10, cy=20-10=10
    // Bottom point should have cx=10, cy=20+10=30
    expect(points).toContain("10,10");
    expect(points).toContain("10,30");
  });

  it("calculates flat-topped hexagon points correctly", () => {
    const points = hexagonPoints(10, 20, 10, false);
    // Right point cx=10+10=20, cy=20
    // Left point cx=10-10=0, cy=20
    expect(points).toContain("20,20");
    expect(points).toContain("0,20");
  });

  it("identifies commit node types accurately", () => {
    const uncommittedNode: GitCommitNode = {
      hash: "*",
      parentHashes: [],
      author: "",
      email: "",
      date: 0,
      message: "",
      refs: []
    };
    expect(getCommitNodeType(uncommittedNode)).toBe("uncommitted");

    const mergeNode: GitCommitNode = {
      hash: "abc",
      parentHashes: ["p1", "p2"],
      author: "",
      email: "",
      date: 0,
      message: "",
      refs: []
    };
    expect(getCommitNodeType(mergeNode)).toBe("merge");

    const headNode: GitCommitNode = {
      hash: "def",
      parentHashes: ["p1"],
      author: "",
      email: "",
      date: 0,
      message: "",
      refs: []
    };
    expect(getCommitNodeType(headNode, { isCurrent: true })).toBe("head");

    const tagNode: GitCommitNode = {
      hash: "ghi",
      parentHashes: ["p1"],
      author: "",
      email: "",
      date: 0,
      message: "",
      refs: [{ hash: "ghi", name: "v1.0.0", type: "tag" }]
    };
    expect(getCommitNodeType(tagNode)).toBe("tag");

    const regularNode: GitCommitNode = {
      hash: "jkl",
      parentHashes: ["p1"],
      author: "",
      email: "",
      date: 0,
      message: "",
      refs: []
    };
    expect(getCommitNodeType(regularNode)).toBe("commit");
  });
});

describe("HexagonNode rendering", () => {
  it("renders hexagon polygons and inner icon for merge commit", () => {
    container = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    render(
      h(HexagonNode, {
        cx: 8,
        cy: 12,
        colour: "#0085d9",
        nodeType: "merge"
      }),
      container
    );

    const group = container.querySelector(".graph-node-hexagon");
    expect(group).not.toBeNull();
    expect(group?.getAttribute("data-node-type")).toBe("merge");

    const polygons = group?.querySelectorAll("polygon");
    // mask + background fill + top stroke
    expect(polygons?.length).toBe(3);
    expect(polygons?.[2]?.getAttribute("stroke")).toBe("#0085d9");

    const iconSvg = group?.querySelector("svg");
    expect(iconSvg).not.toBeNull();
    // Inner merge icon path exists
    const path = iconSvg?.querySelector("path");
    expect(path).not.toBeNull();
  });

  it("renders custom injected icon when provided", () => {
    container = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    render(
      h(HexagonNode, {
        cx: 8,
        cy: 12,
        colour: "#ff0000",
        nodeType: "commit",
        icon: h("circle", { id: "custom-avatar", r: 4, fill: "gold" })
      }),
      container
    );

    const customIcon = container.querySelector("#custom-avatar");
    expect(customIcon).not.toBeNull();
    expect(customIcon?.getAttribute("fill")).toBe("gold");
  });

  it("renders git account avatar image when avatarUrl is provided", () => {
    container = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    render(
      h(HexagonNode, {
        cx: 8,
        cy: 12,
        colour: "#0085d9",
        nodeType: "commit",
        author: "Alice",
        avatarUrl: "https://avatars.githubusercontent.com/u/12345?size=32"
      }),
      container
    );

    const avatarGroup = container.querySelector(".graph-node-avatar");
    expect(avatarGroup).not.toBeNull();

    // Check hexagon clipPath
    const clipPolygon = avatarGroup?.querySelector("clipPath polygon");
    expect(clipPolygon).not.toBeNull();

    const image = avatarGroup?.querySelector("image");
    expect(image).not.toBeNull();
    expect(image?.getAttribute("href")).toBe(
      "https://avatars.githubusercontent.com/u/12345?size=32"
    );
    expect(image?.getAttribute("clip-path")).toContain("url(#hex-avatar-");

    // Verify native white tooltip <title> tag is eliminated
    const title = container.querySelector("title");
    expect(title).toBeNull();
  });

  it("applies micro-interaction scale(1.15) on hover or selection", () => {
    container = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    // Normal state
    render(
      h(HexagonNode, {
        cx: 10,
        cy: 12,
        isHovered: false,
        isSelected: false
      }),
      container
    );
    let group = container.querySelector(".graph-node-hexagon") as SVGGElement | null;
    expect(group?.style.transform).toBe("scale(1)");
    expect(group?.style.transformOrigin).toBe("10px 12px");
    expect(group?.style.transition).toContain("transform 0.2s");

    // Hovered state
    render(
      h(HexagonNode, {
        cx: 10,
        cy: 12,
        isHovered: true,
        isSelected: false
      }),
      container
    );
    group = container.querySelector(".graph-node-hexagon") as SVGGElement | null;
    expect(group?.style.transform).toBe("scale(1.15)");
    expect(group?.classList.contains("is-active")).toBe(true);

    // Selected state
    render(
      h(HexagonNode, {
        cx: 10,
        cy: 12,
        isHovered: false,
        isSelected: true
      }),
      container
    );
    group = container.querySelector(".graph-node-hexagon") as SVGGElement | null;
    expect(group?.style.transform).toBe("scale(1.15)");
    expect(group?.classList.contains("is-active")).toBe(true);
  });
});
