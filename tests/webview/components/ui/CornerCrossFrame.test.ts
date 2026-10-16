// @vitest-environment jsdom

import { h, render } from "preact";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { setupWebviewTest } from "@tests/webview/test-utils";

let CornerCrossFrame: typeof import("@/webview/components/ui/CornerCrossFrame").CornerCrossFrame;
let container: HTMLDivElement;

beforeAll(async () => {
  setupWebviewTest();
  ({ CornerCrossFrame } = await import("@/webview/components/ui/CornerCrossFrame"));
});

afterEach(() => {
  render(null, container);
});

describe("CornerCrossFrame", () => {
  it("renders exactly four corner cross rivets", () => {
    container = document.createElement("div");
    render(h(CornerCrossFrame, {}), container);
    expect(container.querySelectorAll("[data-cross]")).toHaveLength(4);
  });

  it("renders children inside the frame", () => {
    container = document.createElement("div");
    render(h(CornerCrossFrame, { children: h("span", { id: "child" }, "content") }), container);
    expect(container.querySelector("#child")?.textContent).toBe("content");
  });

  it("uses the green neon plate by default and the active purple neon plate when active", () => {
    container = document.createElement("div");
    render(h(CornerCrossFrame, {}), container);
    const idleCross = container.querySelector("[data-cross]");
    expect(idleCross?.classList.contains("bg-cross-neon")).toBe(true);
    expect(idleCross?.getAttribute("style")).toContain("drop-shadow");

    container = document.createElement("div");
    render(h(CornerCrossFrame, { active: true }), container);
    const activeCross = container.querySelector("[data-cross]");
    expect(activeCross?.classList.contains("bg-cross-active")).toBe(true);
    expect(activeCross?.getAttribute("style")).toContain("drop-shadow");
  });

  it("uses the warning red plate when the variant is red", () => {
    container = document.createElement("div");
    render(h(CornerCrossFrame, { variant: "red" }), container);
    const cross = container.querySelector("[data-cross]");
    expect(cross?.classList.contains("bg-cross-warning")).toBe(true);
    expect(cross?.getAttribute("style")).toContain("drop-shadow");
  });
});
