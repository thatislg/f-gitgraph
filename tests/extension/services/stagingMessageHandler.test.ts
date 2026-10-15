import { describe, expect, it, vi } from "vitest";

import type { GitClient } from "@/backend/gitClient";
import type { Config } from "@/extension/config";
import type { GitCliMutator, MutatorResult } from "@/extension/mutator/gitCliMutator";
import { registerMessageHandlers } from "@/extension/services/messageHandler";
import { webviewBridgeFactory } from "@/extension/services/webviewBridge";
import type { RequestMessage } from "@/types";

const OK: MutatorResult = { ok: true, exitCode: 0, stdout: "", stderr: "" };

/** Dựng một bridge thật (mock Webview) cùng bộ dependencies giả lập tối thiểu. */
function setup() {
  let receiveMessage: ((message: RequestMessage) => Promise<void>) | undefined;
  const post = vi.fn();
  const webview = {
    onDidReceiveMessage: vi.fn((handler: (message: RequestMessage) => Promise<void>) => {
      receiveMessage = handler;
      return { dispose: vi.fn() };
    }),
    postMessage: post
  };
  const bridge = webviewBridgeFactory(webview as unknown as import("vscode").Webview);

  const mutator = {
    stageFile: vi.fn().mockResolvedValue(OK),
    unstageFile: vi.fn().mockResolvedValue(OK),
    stageAll: vi.fn().mockResolvedValue(OK),
    unstageAll: vi.fn().mockResolvedValue(OK),
    discardFileChanges: vi.fn().mockResolvedValue(OK),
    discardAllChanges: vi.fn().mockResolvedValue(OK),
    commit: vi.fn().mockResolvedValue(OK),
    commitAndPush: vi.fn().mockResolvedValue(OK),
    setRepo: vi.fn()
  } as unknown as GitCliMutator;

  const gitClient = {
    getInstance: vi.fn(),
    setRepo: vi.fn()
  } as unknown as GitClient;

  const deps = {
    config: { gitPath: () => "git", dateType: () => "Author Date" } as unknown as Config,
    gitClient,
    gitMutator: mutator,
    repoManager: { setRepoState: vi.fn() },
    extensionState: { setLastActiveRepo: vi.fn(), getLastActiveRepo: vi.fn() },
    avatarManager: { fetchAvatarImage: vi.fn() }
  } as unknown as Parameters<typeof registerMessageHandlers>[1];

  registerMessageHandlers(bridge, deps);

  return {
    post,
    mutator,
    gitClient,
    deps,
    receive: (message: RequestMessage) => receiveMessage!(message)
  };
}

describe("registerMessageHandlers (staging & commit routing)", () => {
  it("routes stageFile to the mutator and posts a null status on success", async () => {
    const { post, mutator, receive } = setup();

    await receive({ command: "stageFile", repo: "/repo", filePath: "src/a.ts" });

    expect(mutator.stageFile).toHaveBeenCalledWith("src/a.ts");
    expect(post).toHaveBeenCalledWith({ command: "stageFile", status: null });
  });

  it("routes unstageFile, stageAll, unstageAll, and discard actions", async () => {
    const { mutator, receive } = setup();

    await receive({ command: "unstageFile", repo: "/repo", filePath: "src/a.ts" });
    await receive({ command: "stageAll", repo: "/repo" });
    await receive({ command: "unstageAll", repo: "/repo" });
    await receive({
      command: "discardFileChanges",
      repo: "/repo",
      filePath: "src/a.ts",
      isUntracked: false
    });
    await receive({ command: "discardAllChanges", repo: "/repo" });

    expect(mutator.unstageFile).toHaveBeenCalledWith("src/a.ts");
    expect(mutator.stageAll).toHaveBeenCalledOnce();
    expect(mutator.unstageAll).toHaveBeenCalledOnce();
    expect(mutator.discardFileChanges).toHaveBeenCalledWith("src/a.ts", false);
    expect(mutator.discardAllChanges).toHaveBeenCalledOnce();
  });

  it("routes commitChanges to mutator.commit with all options", async () => {
    const { mutator, receive } = setup();

    await receive({
      command: "commitChanges",
      repo: "/repo",
      summary: "title",
      description: "body",
      amend: true,
      sign: false
    });

    expect(mutator.commit).toHaveBeenCalledWith("title", {
      description: "body",
      amend: true,
      sign: false
    });
  });

  it("routes commitAndPush to mutator.commitAndPush with all options", async () => {
    const { mutator, receive } = setup();

    await receive({
      command: "commitAndPush",
      repo: "/repo",
      summary: "title",
      description: "body",
      amend: false,
      sign: true
    });

    expect(mutator.commitAndPush).toHaveBeenCalledWith("title", {
      description: "body",
      amend: false,
      sign: true
    });
  });

  it("posts the error message when an action fails", async () => {
    const { post, mutator, receive } = setup();
    (mutator.stageFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      exitCode: 128,
      stdout: "",
      stderr: "boom"
    });

    await receive({ command: "stageFile", repo: "/repo", filePath: "src/a.ts" });

    expect(post).toHaveBeenCalledWith({ command: "stageFile", status: "boom" });
  });

  it("routes workspaceStatus query to getWorkspaceStatus and posts the result", async () => {
    const { post, gitClient, receive } = setup();
    (gitClient.getInstance as ReturnType<typeof vi.fn>).mockReturnValue({
      raw: vi
        .fn()
        .mockResolvedValue(
          "# branch.head main\0# branch.upstream origin/main\0# branch.ab +1 -2\0? new.txt\0"
        )
    });

    await receive({ command: "workspaceStatus", repo: "/repo" });

    expect(post).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "workspaceStatus",
        head: "main",
        upstream: "origin/main",
        ahead: 1,
        behind: 2,
        stagedFiles: [],
        isClean: false
      })
    );
    expect(gitClient.setRepo).toHaveBeenCalledWith("/repo");
  });
});
