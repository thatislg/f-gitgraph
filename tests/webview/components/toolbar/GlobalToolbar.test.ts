// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { setupWebviewTest } from "@tests/webview/test-utils";

let GlobalToolbar: typeof import("@/webview/components/toolbar/GlobalToolbar").GlobalToolbar;
let container: HTMLDivElement;

const repos = [
  { name: "repo-a", path: "/repo-a", root: "/repo-a" },
  { name: "repo-b", path: "/repo-b", root: "/repo-b" }
];

async function loadStores() {
  return {
    stores: await import("@/webview/lib/stores"),
    sync: await import("@/webview/lib/stores/sync.store"),
    graph: await import("@/webview/lib/stores/graph-window.store"),
    wheel: await import("@/webview/lib/stores/wheel.store")
  };
}

beforeAll(async () => {
  setupWebviewTest();
  ({ GlobalToolbar } = await import("@/webview/components/toolbar/GlobalToolbar"));
});

beforeEach(async () => {
  const { stores, sync, graph, wheel } = await loadStores();
  stores.selectedRepo.value = "/repo-a";
  stores.headBranch.value = "main";
  stores.branchList.value = ["main", "feature/x"];
  stores.selectedBranch.value = undefined;
  stores.commitOrdering.value = "topological";
  stores.showRemoteBranch.value = true;
  stores.commitHead.value = "abc123";
  graph.totalCommits.value = 5;
  graph.isGraphInitialized.value = true;

  sync.aheadCount.value = 0;
  sync.behindCount.value = 0;
  sync.isDetached.value = false;
  sync.isFetching.value = false;
  sync.isPulling.value = false;
  sync.isPushing.value = false;
  sync.isStashing.value = false;

  wheel.wheelStage.value = 0;
  wheel.activePetal.value = null;
});

afterEach(() => {
  render(null, container);
});

function renderToolbar() {
  container = document.createElement("div");
  render(h(GlobalToolbar, { repos }), container);
}

describe("GlobalToolbar", () => {
  it("renders the wheel command hub trigger and the workspace controls", () => {
    renderToolbar();

    expect(container.querySelector("[data-wheel-trigger]")).toBeTruthy();
    expect(container.querySelector("[data-wheel-emblem]")).toBeTruthy();
    expect(container.querySelector("[data-sync-status-text]")).toBeTruthy();
    expect(container.querySelector("[data-detached-badge]")).toBeNull();
  });

  it("renders the repo selector when more than one repo is open", () => {
    renderToolbar();
    expect(container.textContent).toContain("repo:");
  });

  it("shows the live sync status text reflecting ahead/behind counts", async () => {
    const { sync } = await loadStores();
    sync.behindCount.value = 2;
    sync.aheadCount.value = 1;
    renderToolbar();

    expect(container.querySelector("[data-sync-status-text]")?.textContent).toBe(
      "1 ahead, 2 behind"
    );
  });

  it("reports 'Up to date' when both counts are zero", () => {
    renderToolbar();
    expect(container.querySelector("[data-sync-status-text]")?.textContent).toBe("Up to date");
  });

  it("renders the detached HEAD warning badge when detached", async () => {
    const { sync } = await loadStores();
    sync.isDetached.value = true;
    renderToolbar();

    expect(container.querySelector("[data-detached-badge]")?.textContent).toBe("detachedHead");
  });

  it("renders the branch, ordering and remote controls when the repo has commits", () => {
    renderToolbar();

    expect(container.textContent).toContain("branch:");
    expect(container.textContent).toContain("commitOrdering:");
    expect(container.textContent).toContain("showRemoteBranches");
  });
});
