// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  isSidebarCollapsed,
  sidebarToggleTooltip,
  toggleSidebar
} from "@/webview/lib/stores/sidebar.store";

beforeEach(() => {
  isSidebarCollapsed.value = false;
});

describe("sidebarStore", () => {
  it("initializes expanded with the collapse tooltip", () => {
    expect(isSidebarCollapsed.value).toBe(false);
    expect(sidebarToggleTooltip.value).toBe("Collapse sidebar navigator");
  });

  it("toggleSidebar flips the collapsed state", () => {
    toggleSidebar();
    expect(isSidebarCollapsed.value).toBe(true);
    expect(sidebarToggleTooltip.value).toBe("Expand sidebar navigator");

    toggleSidebar();
    expect(isSidebarCollapsed.value).toBe(false);
    expect(sidebarToggleTooltip.value).toBe("Collapse sidebar navigator");
  });
});
