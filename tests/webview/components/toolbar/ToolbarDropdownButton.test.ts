// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setupWebviewTest } from "@tests/webview/test-utils";

let ToolbarDropdownButton: typeof import("@/webview/components/toolbar/ToolbarDropdownButton").ToolbarDropdownButton;
let container: HTMLDivElement;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Preact chạy `useEffect` (đăng ký listener click-outside / blur) bất đồng bộ sau render.
// Cần chờ khoảng thời gian đủ lớn để listener được gắn, đồng thời vượt qua khoảng chống
// rung (anti-flapping) 16ms của nút, trước khi dispatch sự kiện kiểm chứng đóng menu.
const flushEffects = () => new Promise((resolve) => setTimeout(resolve, 150));

beforeAll(async () => {
  setupWebviewTest();
  ({ ToolbarDropdownButton } = await import("@/webview/components/toolbar/ToolbarDropdownButton"));
});

afterEach(() => {
  render(null, container);
});

function renderButton(props: Partial<Parameters<typeof ToolbarDropdownButton>[0]> = {}) {
  container = document.createElement("div");
  const onPrimaryClick = vi.fn();
  const onSelectA = vi.fn();
  const onSelectB = vi.fn();

  render(
    h(ToolbarDropdownButton, {
      icon: null,
      label: "Pull",
      tooltip: "tip",
      badgeCount: 0,
      badgeDirection: "behind",
      isLoading: false,
      disabled: false,
      onPrimaryClick,
      menuItems: [
        { id: "a", label: "A", description: "d", onSelect: onSelectA },
        { id: "b", label: "B", description: "d", onSelect: onSelectB }
      ],
      ...props
    }),
    container
  );

  return { onPrimaryClick, onSelectA, onSelectB };
}

function trigger(containerEl: HTMLDivElement): HTMLButtonElement {
  return containerEl.querySelector<HTMLButtonElement>("[data-dropdown-trigger]")!;
}

function primary(containerEl: HTMLDivElement): HTMLButtonElement {
  return containerEl.querySelector<HTMLButtonElement>("[data-dropdown-primary]")!;
}

function focusedIndex(containerEl: HTMLDivElement): number {
  const items = [...containerEl.querySelectorAll<HTMLElement>("[data-dropdown-item]")];
  return items.findIndex((item) => item.getAttribute("style")?.includes("rgba(168, 85, 247"));
}

async function pressKey(target: Element, key: string): Promise<void> {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await flush();
}

describe("ToolbarDropdownButton", () => {
  it("primary click triggers onPrimaryClick without opening the menu", () => {
    const { onPrimaryClick } = renderButton();
    primary(container).click();

    expect(onPrimaryClick).toHaveBeenCalled();
    expect(container.querySelector("[data-dropdown-menu]")).toBeNull();
  });

  it("arrow click opens and closes the menu", async () => {
    renderButton();
    trigger(container).click();
    await flush();
    expect(container.querySelector("[data-dropdown-menu]")).toBeTruthy();

    trigger(container).click();
    await flush();
    expect(container.querySelector("[data-dropdown-menu]")).toBeNull();
  });

  it("closes the menu on a click outside the component", async () => {
    renderButton();
    trigger(container).click();
    await flushEffects();
    expect(container.querySelector("[data-dropdown-menu]")).toBeTruthy();

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await flush();
    expect(container.querySelector("[data-dropdown-menu]")).toBeNull();
  });

  it("navigates items with ArrowDown and wraps around the list", async () => {
    renderButton();
    await pressKey(trigger(container), "ArrowDown");
    expect(focusedIndex(container)).toBe(0);

    await pressKey(trigger(container), "ArrowDown");
    expect(focusedIndex(container)).toBe(1);

    await pressKey(trigger(container), "ArrowDown");
    expect(focusedIndex(container)).toBe(0);
  });

  it("navigates items with ArrowUp, Home and End", async () => {
    renderButton();
    await pressKey(trigger(container), "ArrowDown");
    await pressKey(trigger(container), "ArrowUp");
    expect(focusedIndex(container)).toBe(1);

    await pressKey(trigger(container), "Home");
    expect(focusedIndex(container)).toBe(0);

    await pressKey(trigger(container), "End");
    expect(focusedIndex(container)).toBe(1);
  });

  it("activates the focused item with Enter and closes the menu", async () => {
    const { onSelectA } = renderButton();
    await pressKey(trigger(container), "ArrowDown");
    await pressKey(trigger(container), "Enter");

    expect(onSelectA).toHaveBeenCalled();
    expect(container.querySelector("[data-dropdown-menu]")).toBeNull();
  });

  it("closes the menu on Escape and on Tab", async () => {
    renderButton();
    trigger(container).click();
    await flush();
    expect(container.querySelector("[data-dropdown-menu]")).toBeTruthy();

    await pressKey(trigger(container), "Escape");
    expect(container.querySelector("[data-dropdown-menu]")).toBeNull();

    trigger(container).click();
    await flush();
    await pressKey(trigger(container), "Tab");
    expect(container.querySelector("[data-dropdown-menu]")).toBeNull();
  });

  it("closes the menu when the window loses focus", async () => {
    renderButton();
    trigger(container).click();
    await flushEffects();
    expect(container.querySelector("[data-dropdown-menu]")).toBeTruthy();

    window.dispatchEvent(new Event("blur"));
    await flush();
    expect(container.querySelector("[data-dropdown-menu]")).toBeNull();
  });
});
