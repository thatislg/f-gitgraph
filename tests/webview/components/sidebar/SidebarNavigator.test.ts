// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { runAction, toggleStaging } from "@/webview/lib/actions";
import { branchList, headBranch } from "@/webview/lib/stores";
import {
  ALL_SECTION_IDS,
  DEFAULT_SIDEBAR_WIDTH,
  expandedSectionIds,
  isCheckingOut,
  isCreateBranchModalOpen,
  isSidebarCollapsed,
  selectedItemId,
  sidebarWidth
} from "@/webview/lib/stores/sidebar.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

vi.mock("@/webview/lib/actions", () => ({
  runAction: vi.fn(),
  toggleStaging: vi.fn()
}));

let SidebarNavigator: typeof import("@/webview/components/sidebar/SidebarNavigator").SidebarNavigator;
let container: HTMLDivElement;

const branches = [
  { name: "main", isHead: true, aheadCount: 0, upstream: null },
  { name: "feature/x", isHead: false, aheadCount: 2, upstream: null }
];

const stashes = [{ index: 0, hash: "abc123", message: "WIP auth flow", date: "2 minutes ago" }];

function resetStore() {
  sidebarWidth.value = DEFAULT_SIDEBAR_WIDTH;
  isSidebarCollapsed.value = false;
  expandedSectionIds.value = new Set(ALL_SECTION_IDS);
  isCheckingOut.value = false;
  isCreateBranchModalOpen.value = false;
  selectedItemId.value = null;
  branchList.value = undefined;
  headBranch.value = "main";
  localStorage.clear();
}

function renderNavigator(overrides: Partial<Parameters<typeof SidebarNavigator>[0]> = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  render(
    h(SidebarNavigator, {
      branches,
      currentHead: "main",
      remotes: [],
      tags: [],
      stashes,
      unstagedCount: 2,
      stagedCount: 1,
      ...overrides
    }),
    container
  );
}

function dispatchKey(element: HTMLElement, key: string): void {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

beforeAll(async () => {
  setupWebviewTest();
  ({ SidebarNavigator } = await import("@/webview/components/sidebar/SidebarNavigator"));
});

beforeEach(() => {
  resetStore();
  vi.mocked(runAction).mockClear();
  vi.mocked(toggleStaging).mockClear();
});

afterEach(() => {
  render(null, container);
  container.remove();
});

describe("SidebarNavigator", () => {
  it("render đầy đủ 5 tiêu đề phân nhóm", () => {
    renderNavigator();
    const titles = ["WORKING TREE", "LOCAL BRANCHES", "REMOTES", "TAGS", "STASHES"];
    for (const title of titles) {
      expect(container.textContent).toContain(title);
    }
    expect(container.querySelectorAll("section")).toHaveLength(5);
  });

  it("đánh dấu nhánh HEAD bằng chữ in đậm + viền trái, phần tử được chọn bằng checkmark", () => {
    renderNavigator();
    const head = container.querySelector('[data-item-id="branch:main"]');
    const feature = container.querySelector('[data-item-id="branch:feature/x"]');

    // Nhánh HEAD in đậm nhưng không mang checkmark (chưa có lựa chọn nào).
    expect(head?.getAttribute("style")).toContain("font-weight: 700");
    expect(head?.querySelectorAll("svg").length).toBe(1);
    expect(feature?.querySelectorAll("svg").length).toBe(1);
  });

  it("chọn một item sẽ gắn checkmark (single-selection), item khác không có", () => {
    selectedItemId.value = "branch:feature/x";
    renderNavigator();

    const feature = container.querySelector('[data-item-id="branch:feature/x"]');
    const head = container.querySelector('[data-item-id="branch:main"]');

    expect(feature?.querySelectorAll("svg").length).toBe(2);
    expect(head?.querySelectorAll("svg").length).toBe(1);
  });

  it("hiển thị số commit chưa push ↑2 màu hổ phách", () => {
    renderNavigator();
    const ahead = container.querySelector('[data-ahead-count="2"]');
    expect(ahead?.textContent).toBe("↑2");
    expect(ahead?.getAttribute("style")).toContain("rgb(251, 191, 36)");
  });

  it("hiển thị dòng Working Tree Changes (N) với tổng staged + unstaged", () => {
    renderNavigator();
    const changes = container.querySelector('[data-item-id="working-tree:changes"]');
    expect(changes?.textContent).toContain("Changes (3)");
  });

  it("double-click nhánh phát Action RPC checkoutBranch", () => {
    renderNavigator();
    const feature = container.querySelector('[data-item-id="branch:feature/x"]') as HTMLElement;
    feature.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect(runAction).toHaveBeenCalledWith({
      command: "checkoutBranch",
      branchName: "feature/x",
      remoteBranch: null
    });
  });

  it("double-click nhánh remote phát checkoutBranch kèm remoteBranch", () => {
    renderNavigator({ remotes: [{ name: "origin", branches: ["feat-login"] }] });
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

  it("bấm nút + mở modal tạo nhánh mới", () => {
    renderNavigator();
    const addButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="LOCAL BRANCHES action"]'
    );
    addButton?.click();

    expect(isCreateBranchModalOpen.value).toBe(true);
  });

  it("resizer kéo dãn cập nhật chiều rộng và chỉ ghi localStorage khi mouseup", () => {
    renderNavigator();
    const resizer = container.querySelector<HTMLElement>("[data-sidebar-resizer]") as HTMLElement;
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    resizer.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 220 }));
    expect(setItem).not.toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 270 }));
    expect(sidebarWidth.value).toBe(270);

    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 270 }));
    expect(setItem).toHaveBeenCalledWith("f-gitgraph.sidebar.width", "270");
    setItem.mockRestore();
  });

  it("ArrowRight mở section đang gập, ArrowLeft gập section đang mở", () => {
    expandedSectionIds.value = new Set(["working-tree", "branches", "remotes", "stashes"]);
    renderNavigator();

    const tagsHeader = container.querySelector<HTMLElement>("#section-header-tags") as HTMLElement;
    tagsHeader.focus();
    dispatchKey(tagsHeader, "ArrowRight");
    expect(expandedSectionIds.value.has("tags")).toBe(true);

    dispatchKey(tagsHeader, "ArrowLeft");
    expect(expandedSectionIds.value.has("tags")).toBe(false);
  });

  it("Enter trên dòng Changes mở Staging Area", () => {
    renderNavigator();
    const changes = container.querySelector<HTMLElement>(
      '[data-item-id="working-tree:changes"]'
    ) as HTMLElement;
    changes.focus();
    dispatchKey(changes, "Enter");

    expect(toggleStaging).toHaveBeenCalledTimes(1);
  });

  it("ArrowDown di chuyển tiêu điểm xuống phần tử kế tiếp", () => {
    renderNavigator();
    const first = container.querySelector<HTMLElement>(
      "#section-header-working-tree"
    ) as HTMLElement;
    first.focus();
    dispatchKey(first, "ArrowDown");

    expect(document.activeElement?.getAttribute("data-item-id")).toBe("working-tree:changes");
  });
});
