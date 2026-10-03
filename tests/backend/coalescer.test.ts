import { afterEach, describe, expect, it, vi } from "vitest";

import { createCoalescer } from "@/extension/util/coalescer";

afterEach(() => {
  vi.useRealTimers();
});

describe("createCoalescer", () => {
  it("calls the callback once after the delay for multiple triggers", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const coalescer = createCoalescer(150, callback);

    coalescer.trigger();
    coalescer.trigger();
    coalescer.trigger();

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(callback).toHaveBeenCalledTimes(1);
    coalescer.dispose();
  });

  it("restarts the delay on each trigger", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const coalescer = createCoalescer(150, callback);

    coalescer.trigger();
    vi.advanceTimersByTime(100);
    coalescer.trigger();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledTimes(1);
    coalescer.dispose();
  });

  it("does not fire after dispose", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const coalescer = createCoalescer(150, callback);

    coalescer.trigger();
    coalescer.dispose();
    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();
  });
});
