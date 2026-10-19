// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { setupWebviewTest } from "@tests/webview/test-utils";

let HexWheelHub: typeof import("@/webview/components/wheel/HexWheelHub").HexWheelHub;
let container: HTMLDivElement;

const flushEffects = () => new Promise((resolve) => setTimeout(resolve, 150));

async function loadStores() {
  return {
    wheel: await import("@/webview/lib/stores/wheel.store"),
    sync: await import("@/webview/lib/stores/sync.store")
  };
}

beforeAll(async () => {
  setupWebviewTest();
  ({ HexWheelHub } = await import("@/webview/components/wheel/HexWheelHub"));
});

beforeEach(async () => {
  const { wheel, sync } = await loadStores();
  wheel.wheelStage.value = 0;
  wheel.activePetal.value = null;
  wheel.wheelStyle.value = "chromatic";
  wheel.wheelDisplayMode.value = "docked";
  sync.aheadCount.value = 0;
  sync.behindCount.value = 0;
});

afterEach(() => {
  render(null, container);
});

function renderHub() {
  container = document.createElement("div");
  render(h(HexWheelHub, {}), container);
  return container;
}

describe("HexWheelHub", () => {
  it("renders State 0 with the F-GitGraph emblem and logo vector", () => {
    renderHub();

    expect(container.querySelector("[data-wheel-emblem]")).toBeTruthy();
    expect(container.querySelector("[data-wheel-emblem] svg")).toBeTruthy();
    expect(container.querySelector("[data-wheel-cluster]")).toBeNull();
  });

  it("arms (State 1) when the trigger is hovered", async () => {
    const { wheel } = await loadStores();
    renderHub();

    const trigger = container.querySelector("[data-wheel-trigger]");
    trigger?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await flushEffects();

    expect(wheel.wheelStage.value).toBe(1);
    expect(container.querySelector("[data-wheel-emblem][data-armed='true']")).toBeTruthy();
    expect(container.querySelector("[data-iris]")).toBeTruthy();
    expect(container.querySelectorAll("[data-iris-wedge]")).toHaveLength(6);
  });

  it("expands to State 2 with 7 hexagons on click", async () => {
    const { wheel } = await loadStores();
    renderHub();

    const trigger = container.querySelector("[data-wheel-trigger]");
    trigger?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await flushEffects();
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushEffects();

    expect(wheel.wheelStage.value).toBe(2);
    expect(container.querySelector("[data-wheel-cluster]")).toBeTruthy();
    expect(container.querySelector("[data-wheel-hub]")).toBeTruthy();
    expect(container.querySelectorAll("[data-petal]")).toHaveLength(6);
  });

  it("dims the 5 non-focused petals to 0.28 in State 3", async () => {
    const { wheel } = await loadStores();
    renderHub();

    wheel.openWheel();
    await flushEffects();
    wheel.focusPetal("pull");
    await flushEffects();

    expect(wheel.wheelStage.value).toBe(3);

    const pullPetal = container.querySelector<HTMLElement>("[data-petal='pull']");
    const pushPetal = container.querySelector<HTMLElement>("[data-petal='push']");
    expect(pullPetal?.style.opacity).toBe("1");
    expect(pushPetal?.style.opacity).toBe("0.28");

    expect(container.querySelector("[data-contextual-pill]")).toBeTruthy();
  });

  it("closes on Escape and opens on Space", async () => {
    const { wheel } = await loadStores();
    renderHub();
    await flushEffects();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await flushEffects();
    expect(wheel.wheelStage.value).toBe(2);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushEffects();
    expect(wheel.wheelStage.value).toBe(0);
  });

  it("shows ahead/behind corner badges on the push and pull petals", async () => {
    const { wheel, sync } = await loadStores();
    sync.aheadCount.value = 2;
    sync.behindCount.value = 3;
    renderHub();

    wheel.openWheel();
    await flushEffects();

    expect(container.querySelector("[data-petal='push'] [data-petal-badge='ahead']")?.textContent).toBe(
      "↑ 2"
    );
    expect(
      container.querySelector("[data-petal='pull'] [data-petal-badge='behind']")?.textContent
    ).toBe("↓ 3");
  });
});
