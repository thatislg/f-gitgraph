// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupWebviewTest } from "@tests/webview/test-utils";

let StagingFileItem: typeof import("@/webview/components/staging/StagingFileItem").StagingFileItem;
type StagingFile = import("@/webview/components/staging/StagingFileItem").StagingFile;
type StagingFileItemProps =
  import("@/webview/components/staging/StagingFileItem").StagingFileItemProps;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ StagingFileItem } = await import("@/webview/components/staging/StagingFileItem"));
});

afterEach(() => {
  render(null, container);
});

function renderItem(file: StagingFile, props: Partial<StagingFileItemProps> = {}) {
  container = document.createElement("div");
  render(
    h(StagingFileItem, {
      file,
      isStaged: false,
      onStage: vi.fn(),
      onUnstage: vi.fn(),
      onDiscard: vi.fn(),
      onDiff: vi.fn(),
      ...props
    }),
    container
  );
}

describe("StagingFileItem", () => {
  it.each([
    ["A", "bg-badge-added"],
    ["M", "bg-badge-modified"],
    ["D", "bg-badge-deleted"],
    ["R", "bg-badge-renamed"],
    ["U", "bg-badge-untracked"]
  ] as const)(
    "renders the %s badge with the expected neon colour class",
    (status, expectedClass) => {
      const file: StagingFile = { path: "src/App.tsx", status, isUntracked: status === "U" };
      renderItem(file);

      const badge = container.querySelector("[data-badge]");
      expect(badge?.textContent).toBe(status);
      expect(badge?.classList.contains(expectedClass)).toBe(true);
    }
  );

  it("splits the path into a prominent file name and a muted folder path", () => {
    const file: StagingFile = { path: "src/webview/App.tsx", status: "M", isUntracked: false };
    renderItem(file);

    const item = container.querySelector("[data-file-item]");
    expect(item?.textContent).toContain("App.tsx");
    expect(item?.textContent).toContain("src/webview/");
  });

  it("keeps action buttons hidden by default and reveals them on hover", () => {
    const file: StagingFile = { path: "App.tsx", status: "M", isUntracked: false };
    renderItem(file);

    const actions = container.querySelector("[data-actions]");
    expect(actions?.classList.contains("opacity-0")).toBe(true);
    expect(actions?.classList.contains("group-hover:opacity-100")).toBe(true);
  });

  it("calls onStage when the stage button is clicked for an unstaged file", () => {
    const onStage = vi.fn();
    const file: StagingFile = { path: "App.tsx", status: "M", isUntracked: false };
    renderItem(file, { isStaged: false, onStage });

    container.querySelector<HTMLButtonElement>("[data-action='stage']")?.click();
    expect(onStage).toHaveBeenCalledWith("App.tsx");
  });

  it("calls onUnstage when the unstage button is clicked for a staged file", () => {
    const onUnstage = vi.fn();
    const file: StagingFile = { path: "App.tsx", status: "M", isUntracked: false };
    renderItem(file, { isStaged: true, onUnstage });

    container.querySelector<HTMLButtonElement>("[data-action='unstage']")?.click();
    expect(onUnstage).toHaveBeenCalledWith("App.tsx");
  });

  it("calls onDiscard with the untracked flag when the discard button is clicked", () => {
    const onDiscard = vi.fn();
    const file: StagingFile = { path: "new.ts", status: "U", isUntracked: true };
    renderItem(file, { isStaged: false, onDiscard });

    container.querySelector<HTMLButtonElement>("[data-action='discard']")?.click();
    expect(onDiscard).toHaveBeenCalledWith("new.ts", true);
  });

  it("calls onDiff when the row itself is clicked", () => {
    const onDiff = vi.fn();
    const file: StagingFile = { path: "src/App.tsx", status: "M", isUntracked: false };
    renderItem(file, { onDiff });

    const row = container.querySelector<HTMLElement>("[data-file-item]");
    row?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onDiff).toHaveBeenCalledWith("src/App.tsx");
  });
});
