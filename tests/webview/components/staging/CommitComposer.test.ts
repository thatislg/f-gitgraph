// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { commitHead } from "@/webview/lib/stores";
import {
  commitDescription,
  commitSubject,
  headCommitDescription,
  headCommitSubject,
  isAmend,
  isCommitting,
  isSign,
  stagedFiles
} from "@/webview/lib/stores/staging.store";
import { aheadCount, upstreamBranch } from "@/webview/lib/stores/sync.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

let CommitComposer: typeof import("@/webview/components/staging/CommitComposer").CommitComposer;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ CommitComposer } = await import("@/webview/components/staging/CommitComposer"));
});

function resetStore() {
  stagedFiles.value = [];
  commitSubject.value = "";
  commitDescription.value = "";
  isAmend.value = false;
  isSign.value = false;
  isCommitting.value = false;
  headCommitSubject.value = "";
  headCommitDescription.value = "";
  commitHead.value = null;
  upstreamBranch.value = null;
  aheadCount.value = 0;
}

beforeEach(resetStore);

afterEach(() => {
  render(null, container);
});

function renderComposer() {
  container = document.createElement("div");
  render(h(CommitComposer, {}), container);
}

function stageFiles(count: number) {
  stagedFiles.value = Array.from({ length: count }, (_, index) => ({
    path: `src/file${index}.ts`,
    status: "M" as const,
    isUntracked: false
  }));
}

describe("CommitComposer", () => {
  it("renders the 50-char counter and switches tone through three thresholds", () => {
    commitSubject.value = "a".repeat(30);
    renderComposer();
    expect(container.querySelector("[data-counter]")?.textContent).toBe("(30/50)");
    expect(container.querySelector("[data-counter]")?.getAttribute("data-counter-tone")).toBe(
      "idle"
    );

    commitSubject.value = "a".repeat(60);
    renderComposer();
    expect(container.querySelector("[data-counter]")?.getAttribute("data-counter-tone")).toBe(
      "warn"
    );

    commitSubject.value = "a".repeat(80);
    renderComposer();
    expect(container.querySelector("[data-counter]")?.getAttribute("data-counter-tone")).toBe(
      "danger"
    );
  });

  it("disables the Commit button when the subject is empty", () => {
    stageFiles(1);
    commitSubject.value = "";
    renderComposer();

    const button = container.querySelector<HTMLButtonElement>("[data-action='commit']");
    expect(button?.disabled).toBe(true);
  });

  it("shows the staged file count in the Commit button label", () => {
    stageFiles(3);
    commitSubject.value = "feat: add feature";
    renderComposer();

    const button = container.querySelector<HTMLButtonElement>("[data-action='commit']");
    expect(button?.getAttribute("data-button-label")).toBe("Commit 3 files");
    expect(button?.textContent).toContain("Commit 3 files");
  });

  it("triggers a commit when Ctrl+Enter is pressed", async () => {
    stageFiles(1);
    commitSubject.value = "feat: add feature";
    renderComposer();

    // Wait for the effect that registers the document-level keydown listener.
    await new Promise((resolve) => setTimeout(resolve, 150));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }));
    expect(isCommitting.value).toBe(true);
  });

  it("fills the subject from the HEAD commit when Amend is enabled", () => {
    commitHead.value = "abc123";
    commitSubject.value = "draft subject";
    headCommitSubject.value = "previous subject";
    headCommitDescription.value = "previous body";
    renderComposer();

    const amend = container.querySelector<HTMLInputElement>("[data-amend-checkbox]");
    expect(amend).not.toBeNull();
    amend!.checked = true;
    amend!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(commitSubject.value).toBe("previous subject");
    expect(commitDescription.value).toBe("previous body");
  });

  it("disables the Amend checkbox and shows a tooltip when there is no HEAD commit", () => {
    commitHead.value = null;
    renderComposer();

    const amend = container.querySelector<HTMLInputElement>("[data-amend-checkbox]");
    expect(amend?.disabled).toBe(true);
    expect(amend?.getAttribute("title")).toBe("Cannot amend: Repository has no commits yet");
  });

  it("disables the Amend checkbox and shows a tooltip when HEAD is already pushed", () => {
    commitHead.value = "abc123";
    upstreamBranch.value = "origin/main";
    aheadCount.value = 0;
    renderComposer();

    const amend = container.querySelector<HTMLInputElement>("[data-amend-checkbox]");
    expect(amend?.disabled).toBe(true);
    expect(amend?.getAttribute("title")).toBe(
      "Cannot amend: Latest commit has already been pushed to remote"
    );
  });

  it("enables the Amend checkbox without a tooltip when amend is allowed", () => {
    commitHead.value = "abc123";
    upstreamBranch.value = null;
    renderComposer();

    const amend = container.querySelector<HTMLInputElement>("[data-amend-checkbox]");
    expect(amend?.disabled).toBe(false);
    expect(amend?.hasAttribute("title")).toBe(false);
  });
});
