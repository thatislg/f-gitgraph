import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { rpcNotify } from "@/extension/rpc/rpc-notify";
import {
  muteGitRepoWatcher,
  selectWatchedRepo,
  unmuteGitRepoWatcher,
  watchGitRepo
} from "@/extension/watchers/git-repo.watcher";

import { createdWatchers } from "@tests/extension/__mocks__/vscode";

const REPO = "/repo";

function currentWatcher() {
  const watcher = createdWatchers[createdWatchers.length - 1];
  if (watcher === undefined) {
    throw new Error("No file system watcher created");
  }
  return watcher;
}

describe("git-repo.watcher debounce & exclusion filter", () => {
  let disposable: ReturnType<typeof watchGitRepo>;
  let notifySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    notifySpy = vi.spyOn(rpcNotify, "notify").mockResolvedValue(undefined);
    disposable = watchGitRepo();
    selectWatchedRepo(REPO);
  });

  afterEach(() => {
    disposable.dispose();
    notifySpy.mockRestore();
    vi.useRealTimers();
    createdWatchers.length = 0;
  });

  it("collapses a burst of 100 events into a single repo.updated notification", () => {
    const watcher = currentWatcher();
    for (let i = 0; i < 100; i += 1) {
      watcher._fire("change", `${REPO}/src/file-${i}.ts`);
    }

    vi.advanceTimersByTime(149);
    expect(notifySpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith("repo.updated", { path: REPO });
  });

  it("ignores junk directories (node_modules) and .git/objects", () => {
    const watcher = currentWatcher();
    watcher._fire("change", `${REPO}/node_modules/pkg/index.js`);
    watcher._fire("change", `${REPO}/src/node_modules/pkg/index.js`);
    watcher._fire("change", `${REPO}/.git/objects/ab/cdef123`);
    watcher._fire("change", `${REPO}/dist/app.js`);
    watcher._fire("change", `${REPO}/src/.DS_Store`);

    vi.advanceTimersByTime(150);
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("still watches the whitelisted git index and working tree files", () => {
    const watcher = currentWatcher();
    watcher._fire("change", `${REPO}/.git/index`);
    watcher._fire("change", `${REPO}/src/app.ts`);

    vi.advanceTimersByTime(150);
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith("repo.updated", { path: REPO });
  });

  it("blocks events entirely while the mute gate is engaged", () => {
    const watcher = currentWatcher();
    muteGitRepoWatcher();
    watcher._fire("change", `${REPO}/src/app.ts`);

    vi.advanceTimersByTime(150);
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("keeps blocking events during the 1500ms cooling window after unmute", () => {
    const watcher = currentWatcher();
    muteGitRepoWatcher();
    unmuteGitRepoWatcher();

    watcher._fire("change", `${REPO}/src/app.ts`);
    vi.advanceTimersByTime(150);
    expect(notifySpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    watcher._fire("change", `${REPO}/src/app.ts`);
    vi.advanceTimersByTime(150);
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });
});
