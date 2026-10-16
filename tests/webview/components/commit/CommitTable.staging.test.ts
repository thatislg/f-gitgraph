// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { GraphRow } from "@/types";
import { UNCOMMITTED_CHANGES } from "@/webview/constants";
import { commitDetails, expandedCommit, inspectorMode } from "@/webview/lib/stores";
import {
  maxLane,
  totalCommits,
  windowFrom,
  windowPaths,
  windowRows
} from "@/webview/lib/stores/graph-window.store";
import { stagedFiles, unstagedFiles } from "@/webview/lib/stores/staging.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

let CommitTable: typeof import("@/webview/components/commit/CommitTable").CommitTable;
let container: HTMLDivElement;

const uncommittedRow: GraphRow = {
  hash: UNCOMMITTED_CHANGES,
  metadata: undefined,
  x: 20,
  y: 0,
  lane: 0,
  color: 0,
  isMerge: false,
  isRoot: false
};

const commitRow: GraphRow = {
  hash: "abc123",
  metadata: {
    hash: "abc123",
    parentHashes: [],
    author: "Alice",
    email: "alice@example.com",
    date: 1_700_000_000_000,
    message: "feat: add DAG engine",
    refs: []
  },
  x: 20,
  y: 24,
  lane: 0,
  color: 1,
  isMerge: false,
  isRoot: false
};

function renderTable() {
  container = document.createElement("div");
  render(h(CommitTable, { head: "abc123", headBranch: "main" }), container);
}

/** Click a table row and flush Preact's pending re-render. */
async function clickRow(index: number) {
  const rows = container.querySelectorAll("tbody tr");
  rows[index]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeAll(async () => {
  setupWebviewTest();
  ({ CommitTable } = await import("@/webview/components/commit/CommitTable"));
});

beforeEach(() => {
  windowFrom.value = 0;
  totalCommits.value = 2;
  maxLane.value = 0;
  windowRows.value = [uncommittedRow, commitRow];
  windowPaths.value = [];
  expandedCommit.value = null;
  commitDetails.value = null;
  stagedFiles.value = [];
  unstagedFiles.value = [];
});

afterEach(() => {
  render(null, container);
});

describe("CommitTable staging integration", () => {
  it("opens the Staging Area when the uncommitted changes row is clicked", async () => {
    renderTable();

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    await clickRow(0);

    expect(inspectorMode.value).toBe("staging");
    // StagingPanel actions prove StagingArea mounted.
    expect(container.querySelector("[data-action='stage-all']")).not.toBeNull();
  });

  it("opens Commit Details when a regular commit row is clicked", async () => {
    renderTable();

    await clickRow(1);

    expect(inspectorMode.value).toBe("commit-details");
    // StagingArea must not be present; CommitDetails renders a loading status.
    expect(container.querySelector("[data-action='stage-all']")).toBeNull();
    expect(container.querySelector("[role='status']")).not.toBeNull();
  });

  it("switches smoothly from staging back to commit details", async () => {
    renderTable();

    await clickRow(0);
    expect(inspectorMode.value).toBe("staging");

    await clickRow(1);
    expect(inspectorMode.value).toBe("commit-details");
    expect(container.querySelector("[data-action='stage-all']")).toBeNull();

    await clickRow(0);
    expect(inspectorMode.value).toBe("staging");
    expect(container.querySelector("[data-action='stage-all']")).not.toBeNull();
  });

  it("keeps the table row count unchanged (zero layout shift) when the overlay opens", async () => {
    renderTable();
    expect(container.querySelectorAll("tbody tr").length).toBe(2);

    await clickRow(0);

    // The overlay is an absolutely-positioned <div>, never a new <tr>, so the
    // commit table geometry stays intact.
    expect(container.querySelectorAll("tbody tr").length).toBe(2);
    const overlay = container.querySelector("[data-action='stage-all']")?.closest("div.absolute");
    expect(overlay).not.toBeNull();
  });

  it("preserves F# graph geometry (branch paths & node centers) across staging toggle", async () => {
    // Đưa một đường nhánh Bézier cố định từ nhân F# vào cửa sổ đồ thị.
    windowPaths.value = [{ d: "M20 0 C 20 12, 12 12, 12 24", color: 0 }];

    renderTable();

    const snapshot = () => {
      const graphSvg = container.querySelector("svg.block.overflow-visible");
      // Đường nhánh Bézier do F# cung cấp (loại trừ icon nằm trong nút lục giác).
      const branchD = Array.from(graphSvg?.querySelectorAll("path") ?? [])
        .filter((p) => !p.closest(".graph-node-hexagon"))
        .map((p) => p.getAttribute("d"));
      // Tọa độ các đỉnh lục giác (suy từ cx/cy của F#), bất biến với trạng thái chọn/hover.
      const nodePoints = Array.from(container.querySelectorAll(".graph-node-hexagon polygon")).map(
        (p) => p.getAttribute("points")
      );
      return { branchD, nodePoints };
    };

    const before = snapshot();
    await clickRow(0); // mở Staging Area
    const during = snapshot();
    await clickRow(0); // đóng Staging Area
    const after = snapshot();

    // Hình học F# (đường nhánh + tọa độ nút) phải bất biến ở cả ba trạng thái.
    expect(during).toEqual(before);
    expect(after).toEqual(before);
    expect(before.branchD).toContain("M20 0 C 20 12, 12 12, 12 24");
  });
});
