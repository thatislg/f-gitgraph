// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/webview/lib/actions", () => ({
  runAction: vi.fn()
}));

import { runAction } from "@/webview/lib/actions";
import { activeOperation, finishOperation } from "@/webview/lib/stores/loading.store";
import {
  aheadCount,
  behindCount,
  fetch,
  hasPendingSync,
  isDetached,
  isFetching,
  isNetworkBusy,
  isPulling,
  isPushing,
  isStashing,
  loadStashList,
  loadSyncStatus,
  loadTagList,
  pop,
  pull,
  push,
  stash,
  stashList,
  syncStatusText,
  tagList,
  upstreamBranch
} from "@/webview/lib/stores/sync.store";

function resetStore() {
  aheadCount.value = 0;
  behindCount.value = 0;
  upstreamBranch.value = null;
  isDetached.value = false;
  isFetching.value = false;
  isPulling.value = false;
  isPushing.value = false;
  isStashing.value = false;
  stashList.value = [];
  tagList.value = [];
  finishOperation();
}

describe("syncStore", () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(runAction).mockClear();
  });

  it("initializes with zero counts and idle flags", () => {
    expect(aheadCount.value).toBe(0);
    expect(behindCount.value).toBe(0);
    expect(upstreamBranch.value).toBeNull();
    expect(isDetached.value).toBe(false);
    expect(isFetching.value).toBe(false);
    expect(isPulling.value).toBe(false);
    expect(isPushing.value).toBe(false);
    expect(isStashing.value).toBe(false);
  });

  it("computes hasPendingSync from ahead/behind", () => {
    expect(hasPendingSync.value).toBe(false);
    aheadCount.value = 1;
    expect(hasPendingSync.value).toBe(true);
    aheadCount.value = 0;
    behindCount.value = 2;
    expect(hasPendingSync.value).toBe(true);
  });

  it("computes isNetworkBusy from any busy flag", () => {
    expect(isNetworkBusy.value).toBe(false);
    isFetching.value = true;
    expect(isNetworkBusy.value).toBe(true);
    isFetching.value = false;
    isStashing.value = true;
    expect(isNetworkBusy.value).toBe(true);
  });

  it("computes syncStatusText for all four states plus detached", () => {
    expect(syncStatusText.value).toBe("Up to date");

    aheadCount.value = 2;
    behindCount.value = 3;
    expect(syncStatusText.value).toBe("2 ahead, 3 behind");

    aheadCount.value = 0;
    expect(syncStatusText.value).toBe("3 commit(s) behind");

    behindCount.value = 0;
    aheadCount.value = 1;
    expect(syncStatusText.value).toBe("1 commit(s) ahead");

    isDetached.value = true;
    expect(syncStatusText.value).toBe("Detached HEAD");
  });

  it("loadSyncStatus assigns all base signals", () => {
    loadSyncStatus({ ahead: 1, behind: 2, upstream: "origin/main", isDetached: false });
    expect(aheadCount.value).toBe(1);
    expect(behindCount.value).toBe(2);
    expect(upstreamBranch.value).toBe("origin/main");
    expect(isDetached.value).toBe(false);
  });

  it("fetch sets isFetching and dispatches fetchAll", () => {
    fetch();
    expect(isFetching.value).toBe(true);
    expect(activeOperation.value?.kind).toBe("fetch");
    expect(runAction).toHaveBeenCalledWith({ command: "fetchAll", prune: true });
  });

  it("pull defaults to merge mode", () => {
    pull();
    expect(isPulling.value).toBe(true);
    expect(activeOperation.value?.kind).toBe("pull");
    expect(runAction).toHaveBeenCalledWith({ command: "pull", mode: "merge" });
  });

  it("push dispatches forceWithLease false by default", () => {
    push();
    expect(isPushing.value).toBe(true);
    expect(activeOperation.value?.kind).toBe("push");
    expect(runAction).toHaveBeenCalledWith({ command: "push", forceWithLease: false });
  });

  it("stash omits message when undefined and includes it when provided", () => {
    stash();
    expect(isStashing.value).toBe(true);
    expect(activeOperation.value?.kind).toBe("stash");
    expect(runAction).toHaveBeenCalledWith({ command: "stashSave", includeUntracked: false });

    vi.mocked(runAction).mockClear();
    isStashing.value = false;
    stash("wip", true);
    expect(runAction).toHaveBeenCalledWith({
      command: "stashSave",
      message: "wip",
      includeUntracked: true
    });
  });

  it("pop dispatches stashPop with the given index", () => {
    pop(1);
    expect(isStashing.value).toBe(true);
    expect(activeOperation.value?.kind).toBe("pop");
    expect(runAction).toHaveBeenCalledWith({ command: "stashPop", index: 1 });
  });

  it("loadStashList assigns the stash list", () => {
    loadStashList([{ index: 0, hash: "abc", message: "wip", date: "now" }]);
    expect(stashList.value).toEqual([{ index: 0, hash: "abc", message: "wip", date: "now" }]);
  });

  it("loadTagList assigns the tag list", () => {
    loadTagList(["v1.0.0", "v0.9.0"]);
    expect(tagList.value).toEqual(["v1.0.0", "v0.9.0"]);
  });

  it("blocks double invocation while a network action is busy", () => {
    push();
    push();
    expect(runAction).toHaveBeenCalledTimes(1);
  });
});
