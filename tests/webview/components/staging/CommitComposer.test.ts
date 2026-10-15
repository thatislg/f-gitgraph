// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
});
