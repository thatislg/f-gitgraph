// @vitest-environment jsdom

import { h, render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { viewportWidth } from "@/webview/lib/stores/layout.store";

import { setupWebviewTest } from "@tests/webview/test-utils";

let WorkspaceLayout: typeof import("@/webview/components/layout/WorkspaceLayout").WorkspaceLayout;
let container: HTMLDivElement;

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}

  trigger(width: number): void {
    this.callback(
      [{ contentRect: { width } as DOMRectReadOnly } as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
}

function renderLayout(): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  render(
    h(WorkspaceLayout, {
      toolbar: h("div", { "data-test-toolbar": "" }, "toolbar"),
      sidebar: h("div", { "data-test-sidebar": "" }, "sidebar"),
      graph: h("div", { "data-test-graph": "" }, "graph")
    }),
    container
  );
  return container;
}

beforeAll(async () => {
  setupWebviewTest();
  ({ WorkspaceLayout } = await import("@/webview/components/layout/WorkspaceLayout"));
});

beforeEach(() => {
  MockResizeObserver.instances = [];
  viewportWidth.value = 0;
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  vi.stubGlobal(
    "requestAnimationFrame",
    (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  render(null, container);
  container.remove();
});

describe("WorkspaceLayout", () => {
  it("render đầy đủ 3 phân vùng: Toolbar đỉnh, Sidebar trái, Bảng DAG giữa", () => {
    renderLayout();

    expect(container.querySelector("[data-workspace-layout]")).not.toBeNull();
    expect(container.querySelector("[data-test-toolbar]")).not.toBeNull();
    expect(container.querySelector("[data-test-sidebar]")).not.toBeNull();
    expect(container.querySelector("[data-test-graph]")).not.toBeNull();
  });

  it("khung đồ thị nhận flex-1 min-w-0 để chiếm trọn chiều rộng còn lại (fix lỗi dồn trái)", () => {
    renderLayout();

    const graphPane = container.querySelector<HTMLElement>("[data-test-graph]")!.parentElement!;
    expect(graphPane.className).toContain("flex-1");
    expect(graphPane.className).toContain("min-w-0");
  });

  it("ResizeObserver cập nhật viewportWidth khi khung đồ thị thay đổi kích thước", async () => {
    await act(() => {
      renderLayout();
    });

    const observer = MockResizeObserver.instances[0]!;
    observer.trigger(800);
    expect(viewportWidth.value).toBe(800);

    observer.trigger(1200);
    expect(viewportWidth.value).toBe(1200);
  });

  it("gỡ đăng ký ResizeObserver khi unmount (không rò rỉ bộ nhớ)", async () => {
    const disconnect = vi.spyOn(MockResizeObserver.prototype, "disconnect");

    await act(() => {
      renderLayout();
    });
    expect(MockResizeObserver.instances.length).toBe(1);

    render(null, container);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
