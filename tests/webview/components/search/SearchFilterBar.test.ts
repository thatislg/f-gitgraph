// @vitest-environment jsdom

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitCommitNode, GraphRow } from "@/types";
import { windowRows } from "@/webview/lib/stores/graph-window.store";
import {
  currentMatchIndex,
  isSearchOpen,
  scrollRequest,
  searchQuery,
  totalMatches
} from "@/webview/lib/stores/search.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

let SearchFilterBar: typeof import("@/webview/components/search/SearchFilterBar").SearchFilterBar;
let container: HTMLDivElement;

function makeCommit(overrides: Partial<GitCommitNode> & { hash: string }): GitCommitNode {
  return {
    parentHashes: [],
    author: "Nam Nguyen",
    email: "nam@example.com",
    date: 1_700_000_000,
    message: "feat: add login flow",
    refs: [],
    ...overrides
  };
}

function makeRow(commit: GitCommitNode, index = 0): GraphRow {
  return {
    hash: commit.hash,
    metadata: commit,
    x: 10,
    y: index * 24,
    lane: 0,
    color: 1,
    isMerge: false,
    isRoot: index === 0
  };
}

function resetStore(): void {
  searchQuery.value = "";
  isSearchOpen.value = false;
  currentMatchIndex.value = 0;
  scrollRequest.value = null;
  windowRows.value = [];
}

function renderBar(): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  render(h(SearchFilterBar, {}), container);
  return container;
}

beforeAll(async () => {
  setupWebviewTest();
  ({ SearchFilterBar } = await import("@/webview/components/search/SearchFilterBar"));
});

beforeEach(() => {
  vi.stubGlobal(
    "requestAnimationFrame",
    (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  resetStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
  render(null, container);
  container.remove();
});

describe("SearchFilterBar", () => {
  it("ẩn khi chưa mở (isSearchOpen=false)", () => {
    renderBar();
    expect(container.querySelector("[data-search-bar]")).toBeNull();
  });

  it("Ctrl+F mở thanh tìm kiếm qua phím tắt toàn cục", async () => {
    await act(() => {
      renderBar();
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true, cancelable: true })
    );

    expect(isSearchOpen.value).toBe(true);
  });

  it("Cmd+F (metaKey) cũng mở thanh tìm kiếm", async () => {
    await act(() => {
      renderBar();
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F", metaKey: true, bubbles: true, cancelable: true })
    );

    expect(isSearchOpen.value).toBe(true);
  });

  it("render thanh với placeholder và các nút điều khiển khi mở", () => {
    isSearchOpen.value = true;
    renderBar();

    expect(container.querySelector("[data-search-bar]")).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>("[data-search-input]")).not.toBeNull();
    expect(container.querySelector("[data-search-prev]")).not.toBeNull();
    expect(container.querySelector("[data-search-next]")).not.toBeNull();
    expect(container.querySelector("[data-search-close]")).not.toBeNull();
  });

  it("nhập vào input cập nhật searchQuery và lọc kết quả", () => {
    windowRows.value = [
      makeRow(makeCommit({ hash: "a1", message: "feat: login page" })),
      makeRow(makeCommit({ hash: "b2", message: "fix: bug" }), 1)
    ];
    isSearchOpen.value = true;
    renderBar();

    const input = container.querySelector<HTMLInputElement>("[data-search-input]")!;
    input.value = "login";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(searchQuery.value).toBe("login");
    expect(totalMatches.value).toBe(1);
  });

  it("Enter phát nextMatch, Shift+Enter phát prevMatch", () => {
    windowRows.value = [
      makeRow(makeCommit({ hash: "a1", message: "login" })),
      makeRow(makeCommit({ hash: "b2", message: "login" }), 1),
      makeRow(makeCommit({ hash: "c3", message: "login" }), 2)
    ];
    searchQuery.value = "login";
    isSearchOpen.value = true;
    renderBar();

    const input = container.querySelector<HTMLInputElement>("[data-search-input]")!;

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(currentMatchIndex.value).toBe(1);

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true })
    );
    expect(currentMatchIndex.value).toBe(0);
  });

  it("Esc đóng thanh tìm kiếm và làm sạch query", () => {
    searchQuery.value = "login";
    isSearchOpen.value = true;
    renderBar();

    const input = container.querySelector<HTMLInputElement>("[data-search-input]")!;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(isSearchOpen.value).toBe(false);
    expect(searchQuery.value).toBe("");
  });

  it("nút Clear xóa query nhưng giữ thanh mở", () => {
    searchQuery.value = "login";
    isSearchOpen.value = true;
    renderBar();

    const clear = container.querySelector<HTMLButtonElement>("[data-search-clear]")!;
    clear.click();

    expect(searchQuery.value).toBe("");
    expect(isSearchOpen.value).toBe(true);
  });

  it("nút Next/Prev bị vô hiệu khi không có kết quả", () => {
    searchQuery.value = "nonexistent";
    isSearchOpen.value = true;
    renderBar();

    expect(container.querySelector<HTMLButtonElement>("[data-search-next]")!.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>("[data-search-prev]")!.disabled).toBe(true);
  });

  it("hiển thị bộ đếm kết quả (1 of 2)", () => {
    windowRows.value = [
      makeRow(makeCommit({ hash: "a1", message: "login" })),
      makeRow(makeCommit({ hash: "b2", message: "login" }), 1)
    ];
    searchQuery.value = "login";
    isSearchOpen.value = true;
    renderBar();

    expect(container.querySelector("[data-search-counter]")!.textContent).toBe("(1 of 2)");
  });
});
