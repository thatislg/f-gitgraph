// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { audioToggleTooltip, isAudioMuted, toggleAudio } from "@/webview/lib/stores/audio.store";

beforeEach(() => {
  localStorage.clear();
  isAudioMuted.value = false;
});

describe("audioStore", () => {
  it("initializes unmuted with the mute tooltip", () => {
    expect(isAudioMuted.value).toBe(false);
    expect(audioToggleTooltip.value).toBe("Mute audio feedback");
  });

  it("toggleAudio flips the state and persists it to localStorage", () => {
    toggleAudio();
    expect(isAudioMuted.value).toBe(true);
    expect(audioToggleTooltip.value).toBe("Unmute audio feedback");
    expect(localStorage.getItem("f-gitgraph.audioMuted")).toBe("true");

    toggleAudio();
    expect(isAudioMuted.value).toBe(false);
    expect(audioToggleTooltip.value).toBe("Mute audio feedback");
    expect(localStorage.getItem("f-gitgraph.audioMuted")).toBe("false");
  });
});

describe("audioStore persisted initialization", () => {
  it("starts muted when localStorage holds true", async () => {
    vi.resetModules();
    localStorage.setItem("f-gitgraph.audioMuted", "true");
    const mod = await import("@/webview/lib/stores/audio.store");
    expect(mod.isAudioMuted.value).toBe(true);
  });
});
