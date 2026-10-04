import { describe, expect, it } from "vitest";
import type * as vscode from "vscode";

import {
  getPlatformBinaryInfo,
  resolveSidecarBinaryPath,
  resolveSidecarLibGit2Path
} from "@/extension/sidecar/sidecar-manager";

describe("sidecar platform resolver", () => {
  it("resolves correct executable and library for Windows x64", () => {
    const info = getPlatformBinaryInfo("win32", "x64");
    expect(info.executable).toBe("f-gitgraph-core.exe");
    expect(info.libgit2).toBe("git2-5853918.dll");
    expect(info.directories).toContain("win-x64");
  });

  it("resolves correct executable and library for Windows arm64", () => {
    const info = getPlatformBinaryInfo("win32", "arm64");
    expect(info.executable).toBe("f-gitgraph-core.exe");
    expect(info.libgit2).toBe("git2-5853918.dll");
    expect(info.directories).toContain("win-arm64");
  });

  it("resolves correct executable and library for Linux x64", () => {
    const info = getPlatformBinaryInfo("linux", "x64");
    expect(info.executable).toBe("f-gitgraph-core");
    expect(info.libgit2).toBe("libgit2-5853918.so");
    expect(info.directories).toContain("linux-x64");
  });

  it("resolves correct executable and library for Linux arm64", () => {
    const info = getPlatformBinaryInfo("linux", "arm64");
    expect(info.executable).toBe("f-gitgraph-core");
    expect(info.libgit2).toBe("libgit2-5853918.so");
    expect(info.directories).toContain("linux-arm64");
  });

  it("resolves correct executable and library for macOS Apple Silicon (arm64)", () => {
    const info = getPlatformBinaryInfo("darwin", "arm64");
    expect(info.executable).toBe("f-gitgraph-core");
    expect(info.libgit2).toBe("libgit2-5853918.dylib");
    expect(info.directories).toContain("osx-arm64");
  });

  it("resolves correct executable and library for macOS Intel (x64)", () => {
    const info = getPlatformBinaryInfo("darwin", "x64");
    expect(info.executable).toBe("f-gitgraph-core");
    expect(info.libgit2).toBe("libgit2-5853918.dylib");
    expect(info.directories).toContain("osx-x64");
  });

  it("resolves binary path using extension context", () => {
    const mockContext = {
      asAbsolutePath: (rel: string) => `/mock/extension/${rel}`
    } as unknown as vscode.ExtensionContext;

    const path = resolveSidecarBinaryPath(mockContext);
    expect(path).toContain("f-gitgraph-core");
  });

  it("resolves libgit2 path using extension context", () => {
    const mockContext = {
      asAbsolutePath: (rel: string) => `/mock/extension/${rel}`
    } as unknown as vscode.ExtensionContext;

    const path = resolveSidecarLibGit2Path(mockContext);
    expect(path).toContain("git2");
  });
});
