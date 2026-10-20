// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { refreshAfterCheckout } from "@/webview/lib/actions";
import { handleCheckoutBranch } from "@/webview/lib/handler/sidebar-action";
import { branchList, headBranch, selectedRepo } from "@/webview/lib/stores";
import { graphWindowStore } from "@/webview/lib/stores/graph-window.store";
import {
  checkoutBranchAction,
  checkoutRemoteBranchAsNewAction,
  isCheckingOut,
  previousHeadBranch
} from "@/webview/lib/stores/sidebar.store";
import { vscode } from "@/webview/lib/vscode";

import { setupWebviewTest } from "@tests/webview/test-utils";

function reset() {
  selectedRepo.value = "/repo";
  branchList.value = ["main"];
  headBranch.value = "main";
  isCheckingOut.value = false;
  previousHeadBranch.value = null;
}

beforeAll(() => {
  setupWebviewTest();
});

beforeEach(() => {
  reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BranchSwitchPerformance (6.2)", () => {
  it("cập nhật viền tím HEAD tức thì (< 16ms) khi checkout nhánh", () => {
    const start = performance.now();
    checkoutBranchAction("feature");
    const elapsed = performance.now() - start;

    expect(headBranch.value).toBe("feature");
    expect(previousHeadBranch.value).toBe("main");
    expect(elapsed).toBeLessThan(16);
  });

  it("phục hồi headBranch về nhánh cũ khi checkout thất bại", () => {
    checkoutBranchAction("feature");
    expect(headBranch.value).toBe("feature");

    handleCheckoutBranch({ command: "checkoutBranch", status: "checkout failed" });

    expect(headBranch.value).toBe("main");
    expect(isCheckingOut.value).toBe(false);
  });

  it("checkoutRemoteBranchAsNewAction phát checkoutRemoteBranch và cập nhật lạc quan", () => {
    const post = vi.spyOn(vscode, "postMessage");
    checkoutRemoteBranchAsNewAction("origin", "feat", "feat-local");

    expect(headBranch.value).toBe("feat-local");
    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "checkoutRemoteBranch",
        remote: "origin",
        branch: "feat",
        newLocalBranch: "feat-local"
      })
    );
  });

  it("refreshAfterCheckout chỉ gửi 3 truy vấn có mục tiêu (bỏ loadBranches/stashList/listTags)", () => {
    const post = vi.spyOn(vscode, "postMessage");
    vi.spyOn(graphWindowStore, "loadGraph").mockResolvedValue(undefined);

    refreshAfterCheckout();

    const commands = post.mock.calls.map((call) => (call[0] as { command: string }).command);
    expect(commands).toContain("workspaceStatus");
    expect(commands).toContain("syncStatus");
    expect(commands).not.toContain("loadBranches");
    expect(commands).not.toContain("stashList");
    expect(commands).not.toContain("listTags");
  });
});
