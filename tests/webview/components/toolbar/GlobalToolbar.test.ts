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
    graph: await import("@/webview/lib/stores/graph-window.store")
  };
}

beforeAll(async () => {
  setupWebviewTest();
  ({ GlobalToolbar } = await import("@/webview/components/toolbar/GlobalToolbar"));
});

beforeEach(async () => {
  const { stores, sync, graph } = await loadStores();
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
});

afterEach(() => {
  render(null, container);
});

function renderToolbar() {
  container = document.createElement("div");
  render(h(GlobalToolbar, { repos }), container);
}

describe("GlobalToolbar", () => {
  it("renders the sync/stash cluster and workspace controls", () => {
    renderToolbar();

    expect(container.querySelector("button[aria-label='fetchAll']")).toBeTruthy();
    expect(container.querySelectorAll("[data-dropdown-primary]")).toHaveLength(2);
    expect(container.querySelector("button[aria-label='stash']")).toBeTruthy();
    expect(container.querySelector("button[aria-label='pop']")).toBeTruthy();
    expect(container.querySelector("button[aria-label='refresh']")).toBeTruthy();
    expect(container.querySelector("[data-detached-badge]")).toBeNull();
  });

  it("renders the repo selector when more than one repo is open", () => {
    renderToolbar();
    expect(container.textContent).toContain("repo:");
  });

  it("shows behind and ahead neon badges with the correct labels", async () => {
    const { sync } = await loadStores();
    sync.behindCount.value = 2;
    sync.aheadCount.value = 1;
    renderToolbar();

    const behind = container.querySelector("[data-sync-badge='behind']");
    const ahead = container.querySelector("[data-sync-badge='ahead']");
    expect(behind?.textContent).toBe("↓ 2");
    expect(ahead?.textContent).toBe("↑ 1");
    expect(behind?.getAttribute("style")).toContain("rgb(6, 182, 212)");
    expect(ahead?.getAttribute("style")).toContain("rgb(245, 158, 11)");
  });

  it("hides the badges when both counts are zero", () => {
    renderToolbar();
    expect(container.querySelector("[data-sync-badge]")).toBeNull();
  });

  it("renders the detached HEAD warning badge when detached", async () => {
    const { sync } = await loadStores();
    sync.isDetached.value = true;
    renderToolbar();

    expect(container.querySelector("[data-detached-badge]")?.textContent).toBe("detachedHead");
  });

  it("disables the action buttons while a network operation is busy", async () => {
    const { sync } = await loadStores();
    sync.isFetching.value = true;
    renderToolbar();

    const fetchButton = container.querySelector<HTMLButtonElement>("button[aria-label='fetchAll']");
    expect(fetchButton?.disabled).toBe(true);
  });
});
