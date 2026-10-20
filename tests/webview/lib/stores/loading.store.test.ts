// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  activeOperation,
  elapsedSeconds,
  finishOperation,
  startOperation
} from "@/webview/lib/stores/loading.store";

beforeEach(() => {
  finishOperation();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("loadingStore", () => {
  it("starts idle with no active operation", () => {
    expect(activeOperation.value).toBeNull();
    expect(elapsedSeconds.value).toBe(0);
  });

  it("startOperation records the operation kind and resets the timer", () => {
    elapsedSeconds.value = 42;
    startOperation("fetch");
    expect(activeOperation.value?.kind).toBe("fetch");
    expect(elapsedSeconds.value).toBe(0);
  });

  it("finishOperation clears the operation and timer", () => {
    startOperation("push");
    finishOperation();
    expect(activeOperation.value).toBeNull();
    expect(elapsedSeconds.value).toBe(0);
  });

  it("tracks elapsed seconds while an operation is running", () => {
    vi.useFakeTimers();
    startOperation("pull");
    vi.advanceTimersByTime(500);
    expect(elapsedSeconds.value).toBeCloseTo(0.5, 1);
    finishOperation();
  });

  it("stops ticking after the operation finishes", () => {
    vi.useFakeTimers();
    startOperation("stash");
    vi.advanceTimersByTime(200);
    finishOperation();
    vi.advanceTimersByTime(1000);
    expect(elapsedSeconds.value).toBe(0);
  });
});
