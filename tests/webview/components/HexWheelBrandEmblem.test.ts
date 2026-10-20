// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/webview/lib/stores/wheel.store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/webview/lib/stores/wheel.store")>();
  return { ...actual, executePetalAction: vi.fn(), disarmWheel: vi.fn() };
});

import { disarmWheel, executePetalAction } from "@/webview/lib/stores/wheel.store";

let HexWheelBrandEmblem: typeof import("@/webview/components/wheel/HexWheelBrandEmblem").HexWheelBrandEmblem;
let container: HTMLDivElement;

beforeAll(async () => {
  ({ HexWheelBrandEmblem } = await import("@/webview/components/wheel/HexWheelBrandEmblem"));
});

afterEach(() => {
  if (container !== undefined) {
    render(null, container);
  }
  vi.clearAllMocks();
});

function renderEmblem(armed: boolean, onOpenWheel?: () => void): HTMLDivElement {
  container = document.createElement("div");
  render(h(HexWheelBrandEmblem, onOpenWheel ? { armed, onOpenWheel } : { armed }), container);
  return container;
}

function px(value: string | undefined): number {
  return Number.parseFloat(value ?? "0");
}

const PETAL_IDS = ["push", "pull", "fetch", "pop", "stash", "refresh"] as const;

describe("HexWheelBrandEmblem (State 1 Quick Mode)", () => {
  it("renders no satellite icons at rest (State 0)", () => {
    renderEmblem(false);
    expect(container.querySelector("[data-iris]")).toBeNull();
    expect(container.querySelectorAll("[data-iris-icon]")).toHaveLength(0);
  });

  it("renders 6 clickable satellite icons when armed (State 1)", () => {
    renderEmblem(true);
    expect(container.querySelector("[data-iris]")).toBeTruthy();
    expect(container.querySelectorAll("[data-iris-icon]")).toHaveLength(6);
  });

  it("runs the matching petal action when a satellite icon is clicked", () => {
    renderEmblem(true);
    const icon = container.querySelector("[data-iris-icon='push']");
    icon?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(executePetalAction).toHaveBeenCalledWith("push");
  });

  it("dispatches the correct action for every satellite icon", () => {
    renderEmblem(true);
    for (const id of PETAL_IDS) {
      const icon = container.querySelector(`[data-iris-icon='${id}']`);
      icon?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(executePetalAction).toHaveBeenCalledWith(id);
    }
    expect(executePetalAction).toHaveBeenCalledTimes(6);
  });

  it("exposes pointer events and a keyboard-accessible button role", () => {
    renderEmblem(true);
    const icon = container.querySelector<HTMLElement>("[data-iris-icon='push']");
    expect(icon?.getAttribute("role")).toBe("button");
    expect(icon?.getAttribute("tabindex")).toBe("0");
    expect(icon?.style.pointerEvents).toBe("auto");
  });

  it("opens the wheel when the center logo is clicked", () => {
    const onOpenWheel = vi.fn();
    renderEmblem(true, onOpenWheel);
    const center = container.querySelector("[data-wheel-center]");
    center?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onOpenWheel).toHaveBeenCalledTimes(1);
  });

  it("disarms only when the pointer leaves the outer hexagon region", () => {
    renderEmblem(true);
    const region = container.querySelector("[data-iris-region]");
    region?.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(disarmWheel).toHaveBeenCalledTimes(1);
  });

  it("keeps a 3px hitbox gap between the 14px logo and 13px satellites", () => {
    renderEmblem(true);
    const emblem = container.querySelector<HTMLElement>("[data-wheel-emblem]");
    const icon = container.querySelector<HTMLElement>("[data-iris-icon='push']");

    const emblemHalf = px(emblem?.style.width) / 2;
    const iconHalf = px(icon?.style.width) / 2;
    // Vệ tinh neo theo vùng hover `IRIS_REGION_SIZE` (tâm trùng tâm emblem):
    // `left = IRIS_BACKDROP_RADIUS + center - IRIS_NODE_RADIUS` nên tâm icon lệch đúng
    // `(left - (53 - 13), top - (53 - 13)) = (left - 40, top - 40)` so với tâm emblem.
    const centerX = px(icon?.style.left) - 40;
    const centerY = px(icon?.style.top) - 40;
    const distance = Math.hypot(centerX, centerY);
    const gap = distance - emblemHalf - iconHalf;

    expect(emblemHalf).toBeCloseTo(14, 2);
    expect(iconHalf).toBeCloseTo(13, 2);
    expect(distance).toBeCloseTo(30, 2);
    expect(gap).toBeCloseTo(3, 2);
  });
});
