// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/webview/lib/actions", () => ({
  runAction: vi.fn(),
  refresh: vi.fn()
}));

vi.mock("@/webview/lib/audio", () => ({
  playIrisShutterClose: vi.fn(),
  playIrisShutterOpen: vi.fn(),
  playMicroHapticTick: vi.fn(),
  playPetalHoverTick: vi.fn()
}));

import { refresh, runAction } from "@/webview/lib/actions";
import {
  playIrisShutterClose,
  playIrisShutterOpen,
  playMicroHapticTick,
  playPetalHoverTick
} from "@/webview/lib/audio";
import {
  aheadCount,
  behindCount,
  isFetching,
  isPulling,
  isPushing,
  isStashing
} from "@/webview/lib/stores/sync.store";
import {
  activePetal,
  activePetalTooltip,
  armWheel,
  closeWheel,
  disarmWheel,
  executePetalAction,
  focusPetal,
  isPetalDimmed,
  isWheelArmed,
  isWheelExpanded,
  openWheel,
  wheelStage
} from "@/webview/lib/stores/wheel.store";

function resetWheel() {
  wheelStage.value = 0;
  activePetal.value = null;
}

function resetSync() {
  aheadCount.value = 0;
  behindCount.value = 0;
  isFetching.value = false;
  isPulling.value = false;
  isPushing.value = false;
  isStashing.value = false;
}

describe("wheelStore", () => {
  beforeEach(() => {
    resetWheel();
    resetSync();
    vi.mocked(runAction).mockClear();
    vi.mocked(refresh).mockClear();
    vi.mocked(playMicroHapticTick).mockClear();
    vi.mocked(playIrisShutterOpen).mockClear();
    vi.mocked(playIrisShutterClose).mockClear();
    vi.mocked(playPetalHoverTick).mockClear();
  });

  it("initializes at State 0 with no active petal", () => {
    expect(wheelStage.value).toBe(0);
    expect(activePetal.value).toBeNull();
    expect(isWheelArmed.value).toBe(false);
    expect(isWheelExpanded.value).toBe(false);
  });

  it("transitions 0 → 1 → 2 → 3 through the full lifecycle", () => {
    armWheel();
    expect(wheelStage.value).toBe(1);
    expect(isWheelArmed.value).toBe(true);

    openWheel();
    expect(wheelStage.value).toBe(2);
    expect(isWheelExpanded.value).toBe(true);

    focusPetal("push");
    expect(wheelStage.value).toBe(3);
    expect(activePetal.value).toBe("push");
  });

  it("disarms 1 → 0 and only from the armed state", () => {
    armWheel();
    disarmWheel();
    expect(wheelStage.value).toBe(0);

    // disarm from State 0 is a no-op
    disarmWheel();
    expect(wheelStage.value).toBe(0);
  });

  it("plays the micro haptic tick on arm and iris shutter on open/close", () => {
    armWheel();
    expect(playMicroHapticTick).toHaveBeenCalledTimes(1);

    openWheel();
    expect(playIrisShutterOpen).toHaveBeenCalledTimes(1);

    closeWheel();
    expect(playIrisShutterClose).toHaveBeenCalledTimes(1);
  });

  it("focusPetal(null) returns to State 2 and clears the active petal", () => {
    openWheel();
    focusPetal("pull");
    expect(wheelStage.value).toBe(3);

    focusPetal(null);
    expect(wheelStage.value).toBe(2);
    expect(activePetal.value).toBeNull();
  });

  it("dims the non-active petals only in State 3", () => {
    openWheel();
    focusPetal("push");

    expect(isPetalDimmed("pull")).toBe(true);
    expect(isPetalDimmed("push")).toBe(false);

    focusPetal(null);
    expect(isPetalDimmed("pull")).toBe(false);
  });

  it("executes each petal action via the correct mutator and auto-collapses", () => {
    executePetalAction("push");
    expect(runAction).toHaveBeenCalledWith({ command: "push", forceWithLease: false });

    resetSync();
    executePetalAction("pull");
    expect(runAction).toHaveBeenCalledWith({ command: "pull", mode: "merge" });

    resetSync();
    executePetalAction("fetch");
    expect(runAction).toHaveBeenCalledWith({ command: "fetchAll", prune: true });

    resetSync();
    executePetalAction("stash");
    expect(runAction).toHaveBeenCalledWith({ command: "stashSave", includeUntracked: false });

    resetSync();
    executePetalAction("pop");
    expect(runAction).toHaveBeenCalledWith({ command: "stashPop", index: 0 });

    resetSync();
    executePetalAction("refresh");
    expect(refresh).toHaveBeenCalledTimes(1);

    expect(wheelStage.value).toBe(0);
  });

  it("computes the active petal tooltip from the sync store", () => {
    openWheel();
    behindCount.value = 3;
    focusPetal("pull");
    expect(activePetalTooltip.value).toBe("↓ 3 commits to pull");

    behindCount.value = 0;
    aheadCount.value = 2;
    focusPetal("push");
    expect(activePetalTooltip.value).toBe("↑ 2 commits to push");
  });

  it("closeWheel from an expanded state resets the active petal", () => {
    openWheel();
    focusPetal("fetch");
    closeWheel();

    expect(wheelStage.value).toBe(0);
    expect(activePetal.value).toBeNull();
  });
});
