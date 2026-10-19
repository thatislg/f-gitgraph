// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { GraphPath, GraphRow } from "@/types";
import { viewportWidth } from "@/webview/lib/stores/layout.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

let CommitGraph: typeof import("@/webview/components/commit/CommitGraph").CommitGraph;
let container: HTMLDivElement;

const rows: GraphRow[] = [
  {
    hash: "commit-1",
    metadata: {
      hash: "commit-1",
      parentHashes: ["parent-1"],
      author: "Alice",
      email: "alice@example.com",
      date: 1000,
      message: "feat: login",
      refs: []
    },
    x: 10,
    y: 12,
    lane: 0,
    color: 1,
    isMerge: false,
    isRoot: true
  },
  {
    hash: "commit-2",
    metadata: {
      hash: "commit-2",
      parentHashes: ["commit-1"],
      author: "Bob",
      email: "bob@example.com",
      date: 2000,
      message: "fix: bug",
      refs: [{ hash: "commit-2", name: "main", type: "head" }]
    },
    x: 10,
    y: 36,
    lane: 0,
    color: 1,
    isMerge: false,
    isRoot: false
  }
];

const paths: GraphPath[] = [{ d: "M 10 18 L 10 30 C 10 34 10 34 10 36", color: 1 }];

interface GeometrySnapshot {
  branchPaths: string[];
  hexagonPoints: string[];
  nodeOrigins: string[];
}

/** Trích xuất dữ liệu hình học trọn vẹn từ DOM (đường nhánh Bézier + nút lục giác). */
function snapshotGeometry(): GeometrySnapshot {
  const branchPaths = Array.from(container.querySelectorAll<SVGPathElement>("svg path[d]")).map(
    (el) => el.getAttribute("d") ?? ""
  );

  const hexagonPoints = Array.from(
    container.querySelectorAll<SVGPolygonElement>(".graph-node-hexagon polygon")
  ).map((el) => el.getAttribute("points") ?? "");

  const nodeOrigins = Array.from(container.querySelectorAll<SVGGElement>(".graph-node-hexagon")).map(
    (el) => el.getAttribute("style") ?? ""
  );

  return { branchPaths, hexagonPoints, nodeOrigins };
}

function renderGraph(): void {
  container = document.createElement("div");
  document.body.appendChild(container);
  render(h(CommitGraph, { rows, paths, maxLane: 1 }), container);
}

beforeAll(async () => {
  setupWebviewTest();
  ({ CommitGraph } = await import("@/webview/components/commit/CommitGraph"));
});

beforeEach(() => {
  viewportWidth.value = 0;
});

afterEach(() => {
  render(null, container);
  container.remove();
});

describe("WorkspaceLayout.geometry — Zero Layout Shift", () => {
  it("đường nhánh Bézier và tọa độ nút lục giác không dịch chuyển khi Sidebar co giãn", () => {
    // Pha 1: Sidebar ở độ rộng mặc định 220px.
    viewportWidth.value = 220;
    renderGraph();
    const phase1 = snapshotGeometry();
    render(null, container);
    container.remove();

    // Pha 2: Sidebar kéo dãn lên 380px.
    viewportWidth.value = 380;
    renderGraph();
    const phase2 = snapshotGeometry();
    render(null, container);
    container.remove();

    // Pha 3: Sidebar thu gọn hoàn toàn về 0px.
    viewportWidth.value = 0;
    renderGraph();
    const phase3 = snapshotGeometry();

    expect(phase1.branchPaths.length).toBeGreaterThan(0);
    expect(phase1.hexagonPoints.length).toBeGreaterThan(0);

    expect(phase2.branchPaths).toEqual(phase1.branchPaths);
    expect(phase3.branchPaths).toEqual(phase1.branchPaths);

    expect(phase2.hexagonPoints).toEqual(phase1.hexagonPoints);
    expect(phase3.hexagonPoints).toEqual(phase1.hexagonPoints);

    expect(phase2.nodeOrigins).toEqual(phase1.nodeOrigins);
    expect(phase3.nodeOrigins).toEqual(phase1.nodeOrigins);
  });

  it("đường nhánh Bézier khớp chính xác dữ liệu F# Core (không biến dạng)", () => {
    renderGraph();

    const d = container.querySelector<SVGPathElement>("svg path[d]");
    expect(d).not.toBeNull();
    // Đường nhánh được render nguyên vẹn từ thuộc tính `d` do F# Core sinh ra.
    expect(d?.getAttribute("d")).toBe(paths[0]!.d);
  });
});
