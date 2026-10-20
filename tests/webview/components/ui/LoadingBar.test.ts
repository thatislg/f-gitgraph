// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { finishOperation, startOperation } from "@/webview/lib/stores/loading.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

let LoadingBar: typeof import("@/webview/components/ui/LoadingBar").LoadingBar;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ LoadingBar } = await import("@/webview/components/ui/LoadingBar"));
});

afterEach(() => {
  finishOperation();
  render(null, container);
});

describe("LoadingBar", () => {
  it("renders nothing when no operation is running", () => {
    container = document.createElement("div");
    render(h(LoadingBar, {}), container);
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("renders a blocking overlay with the operation label when running", () => {
    container = document.createElement("div");
    startOperation("fetch");
    render(h(LoadingBar, {}), container);
    const dialog = container.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.textContent).toContain("loadingFetch");
  });

  it("shows the elapsed time counter", () => {
    container = document.createElement("div");
    startOperation("push");
    render(h(LoadingBar, {}), container);
    expect(container.textContent).toContain("loadingElapsed");
  });
});
