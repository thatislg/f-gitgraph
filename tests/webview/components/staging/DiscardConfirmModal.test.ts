// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupWebviewTest } from "@tests/webview/test-utils";

let DiscardConfirmModal: typeof import("@/webview/components/staging/DiscardConfirmModal").DiscardConfirmModal;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ DiscardConfirmModal } = await import("@/webview/components/staging/DiscardConfirmModal"));
});

afterEach(() => {
  render(null, container);
});

function renderModal(
  props: {
    isOpen?: boolean;
    targetFile?: string | null;
    isAll?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  } = {}
) {
  container = document.createElement("div");
  render(
    h(DiscardConfirmModal, {
      isOpen: true,
      targetFile: null,
      isAll: false,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      ...props
    }),
    container
  );
}

describe("DiscardConfirmModal", () => {
  it("renders nothing when closed", () => {
    renderModal({ isOpen: false });
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });

  it("shows the target file name in the warning message", () => {
    renderModal({ targetFile: "src/app.ts", isAll: false });
    expect(container.textContent).toContain("src/app.ts");
  });

  it("shows the repository-wide warning when discarding all changes", () => {
    renderModal({ isAll: true, targetFile: null });
    expect(container.textContent).toContain("ALL uncommitted changes");
  });

  it("calls onCancel when the Escape key is pressed", async () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });

    // Wait for the effect that registers the document-level keydown listener.
    await new Promise((resolve) => setTimeout(resolve, 150));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the Cancel button is clicked", () => {
    const onCancel = vi.fn();
    renderModal({ onCancel });

    container.querySelector<HTMLButtonElement>("[data-action='cancel']")?.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when the Discard button is clicked", () => {
    const onConfirm = vi.fn();
    renderModal({ onConfirm });

    container.querySelector<HTMLButtonElement>("[data-action='confirm']")?.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
