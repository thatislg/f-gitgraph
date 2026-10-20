// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { openContextMenu, runAction } from "@/webview/lib/actions";
import { handleRemoteBranches } from "@/webview/lib/handler/sync-query";
import { sidebarRemoteBranchMenu } from "@/webview/lib/menus";
import { remoteGroups, showRemoteBranch } from "@/webview/lib/stores";
import {
  ALL_SECTION_IDS,
  expandedSectionIds,
  isCheckingOut,
  isSidebarCollapsed,
  sidebarWidth
} from "@/webview/lib/stores/sidebar.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

vi.mock("@/webview/lib/actions", () => ({
  runAction: vi.fn(),
  toggleStaging: vi.fn(),
  openContextMenu: vi.fn()
}));

let SidebarNavigator: typeof import("@/webview/components/sidebar/SidebarNavigator").SidebarNavigator;
let container: HTMLDivElement;

const branches = [
  { name: "main", isHead: true, aheadCount: 0, upstream: null },
  { name: "feature/x", isHead: false, aheadCount: 0, upstream: null }
];

const remotes = [{ name: "origin", branches: ["main", "feat-login"] }];

function resetStore() {
  sidebarWidth.value = 220;
  isSidebarCollapsed.value = false;
  expandedSectionIds.value = new Set(ALL_SECTION_IDS);
  isCheckingOut.value = false;
  remoteGroups.value = [];
  showRemoteBranch.value = true;
}

function renderNavigator() {
  container = document.createElement("div");
  document.body.appendChild(container);
  render(
    h(SidebarNavigator, {
      branches,
      currentHead: "main",
      remotes,
      tags: [],
      stashes: [],
      unstagedCount: 0,
      stagedCount: 0
    }),
    container
  );
}

beforeAll(async () => {
  setupWebviewTest();
  ({ SidebarNavigator } = await import("@/webview/components/sidebar/SidebarNavigator"));
});

beforeEach(() => {
  resetStore();
  vi.mocked(runAction).mockClear();
  vi.mocked(openContextMenu).mockClear();
});

afterEach(() => {
  render(null, container);
  container.remove();
});

describe("RemoteBranchInteraction", () => {
  it("double-click nhánh remote phát checkoutBranch kèm remoteBranch", () => {
    renderNavigator();
    const remote = container.querySelector(
      '[data-item-id="remote:origin/feat-login"]'
    ) as HTMLElement;
    remote.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect(runAction).toHaveBeenCalledWith({
      command: "checkoutBranch",
      branchName: "feat-login",
      remoteBranch: "origin/feat-login"
    });
  });

  it("chuột phải vào nhánh remote mở context menu với nguồn và 3 mục tác vụ", () => {
    renderNavigator();
    const remote = container.querySelector(
      '[data-item-id="remote:origin/feat-login"]'
    ) as HTMLElement;
    remote.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 12, clientY: 34 })
    );

    expect(openContextMenu).toHaveBeenCalledTimes(1);
    const [event, source, entries] = vi.mocked(openContextMenu).mock.calls[0]!;
    expect(event).toBeInstanceOf(MouseEvent);
    expect(source).toBe("remote:origin/feat-login");
    expect(entries.filter((entry) => entry !== null)).toHaveLength(3);
  });

  it("sidebarRemoteBranchMenu trả về đủ 3 mục tác vụ (checkout, pull, delete)", () => {
    const entries = sidebarRemoteBranchMenu("origin", "feat-login");
    const actionable = entries.filter((entry) => entry !== null);
    expect(actionable).toHaveLength(3);
    expect(actionable[0]!.title).toBe("checkoutAsNewBranch");
    expect(actionable[1]!.title).toBe("pullIntoCurrentBranch");
    expect(actionable[2]!.title).toBe("deleteRemoteBranch");
  });

  it("remoteGroups nạp độc lập với cờ showRemoteBranch (6.1.3)", () => {
    showRemoteBranch.value = false;
    handleRemoteBranches({
      command: "remoteBranches",
      repo: "/repo",
      remotes: [{ name: "origin", branches: ["main", "feat"] }]
    });

    expect(remoteGroups.value).toEqual([{ name: "origin", branches: ["main", "feat"] }]);
  });
});
