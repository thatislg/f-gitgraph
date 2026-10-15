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
});
