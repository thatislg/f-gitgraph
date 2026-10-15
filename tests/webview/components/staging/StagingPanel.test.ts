// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { StagingFile } from "@/webview/components/staging/StagingFileItem";

import { setupWebviewTest } from "@tests/webview/test-utils";

let StagingPanel: typeof import("@/webview/components/staging/StagingPanel").StagingPanel;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ StagingPanel } = await import("@/webview/components/staging/StagingPanel"));
});

afterEach(() => {
  render(null, container);
});

function makeFile(path: string, status: StagingFile["status"] = "M"): StagingFile {
  return { path, status, isUntracked: status === "U" };
}

function renderPanel(
  props: Partial<import("@/webview/components/staging/StagingPanel").StagingPanelProps> = {}
) {
  container = document.createElement("div");
  render(
    h(StagingPanel, {
      stagedFiles: [],
      unstagedFiles: [],
      onStage: vi.fn(),
      onUnstage: vi.fn(),
      onDiscard: vi.fn(),
      onDiff: vi.fn(),
      onStageAll: vi.fn(),
      onUnstageAll: vi.fn(),
      onDiscardAll: vi.fn(),
      ...props
    }),
    container
  );
}

describe("StagingPanel", () => {
  it("renders the expected number of rows in both groups", () => {
    renderPanel({
      stagedFiles: [makeFile("src/a.ts", "A"), makeFile("src/b.ts", "M")],
      unstagedFiles: [makeFile("src/c.ts"), makeFile("src/d.ts"), makeFile("src/e.ts", "U")]
    });

    expect(container.querySelectorAll("[data-file-item][data-staged='true']").length).toBe(2);
    expect(container.querySelectorAll("[data-file-item][data-staged='false']").length).toBe(3);
  });

  it("calls onStageAll when the Stage All button is clicked", () => {
    const onStageAll = vi.fn();
    renderPanel({ unstagedFiles: [makeFile("src/a.ts")], onStageAll });

    container.querySelector<HTMLButtonElement>("[data-action='stage-all']")?.click();
    expect(onStageAll).toHaveBeenCalledTimes(1);
  });

  it("calls onUnstageAll when the Unstage All button is clicked", () => {
    const onUnstageAll = vi.fn();
    renderPanel({ stagedFiles: [makeFile("src/a.ts", "A")], onUnstageAll });

    container.querySelector<HTMLButtonElement>("[data-action='unstage-all']")?.click();
    expect(onUnstageAll).toHaveBeenCalledTimes(1);
  });

  it("calls onDiscardAll when the Discard All button is clicked", () => {
    const onDiscardAll = vi.fn();
    renderPanel({ unstagedFiles: [makeFile("src/a.ts")], onDiscardAll });

    container.querySelector<HTMLButtonElement>("[data-action='discard-all']")?.click();
    expect(onDiscardAll).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state message when there are no changes", () => {
    renderPanel();

    expect(container.querySelector("[data-empty='staged']")?.textContent).toContain(
      "No staged changes"
    );
    expect(container.querySelector("[data-empty='unstaged']")?.textContent).toContain(
      "Working tree clean"
    );
  });
});
