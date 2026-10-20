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
    fetchAll: vi.fn().mockResolvedValue(OK),
    pull: vi.fn().mockResolvedValue(OK),
    push: vi.fn().mockResolvedValue(OK),
    stashSave: vi.fn().mockResolvedValue(OK),
    stashPop: vi.fn().mockResolvedValue(OK),
    stashDrop: vi.fn().mockResolvedValue(OK),
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
    receive: (message: RequestMessage) => receiveMessage!(message)
  };
}

describe("registerMessageHandlers (sync & stash routing)", () => {
  it("routes fetchAll, pull, push, stashSave, stashPop, stashDrop to the mutator", async () => {
    const { mutator, receive } = setup();

    await receive({ command: "fetchAll", repo: "/repo", prune: true });
    await receive({ command: "pull", repo: "/repo", mode: "rebase" });
    await receive({
      command: "push",
      repo: "/repo",
      forceWithLease: true,
      remote: "origin",
      branch: "main",
      setUpstream: false
    });
    await receive({ command: "stashSave", repo: "/repo", message: "wip", includeUntracked: true });
    await receive({ command: "stashPop", repo: "/repo", index: 1 });
    await receive({ command: "stashDrop", repo: "/repo", index: 0 });

    expect(mutator.fetchAll).toHaveBeenCalledWith(true);
    expect(mutator.pull).toHaveBeenCalledWith("rebase");
    expect(mutator.push).toHaveBeenCalledWith(
      expect.objectContaining({
        forceWithLease: true,
        remote: "origin",
        branch: "main",
        setUpstream: false
      })
    );
    expect(mutator.stashSave).toHaveBeenCalledWith("wip", true);
    expect(mutator.stashPop).toHaveBeenCalledWith(1);
    expect(mutator.stashDrop).toHaveBeenCalledWith(0);
  });

  it("posts a null status on successful action", async () => {
    const { post, receive } = setup();
    await receive({ command: "fetchAll", repo: "/repo", prune: false });
    expect(post).toHaveBeenCalledWith({ command: "fetchAll", status: null });
  });

  it("posts the error message when a mutator action fails", async () => {
    const { post, mutator, receive } = setup();
    (mutator.push as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      exitCode: 128,
      stdout: "",
      stderr: "Push rejected"
    });

    await receive({ command: "push", repo: "/repo" });
    expect(post).toHaveBeenCalledWith({ command: "push", status: "Push rejected" });
  });

  it("routes syncStatus query through the SimpleGit instance", async () => {
    const { post, gitClient, receive } = setup();
    (gitClient.getInstance as ReturnType<typeof vi.fn>).mockReturnValue({
      raw: vi.fn((args: string[]) => {
        const joined = args.join(" ");
        if (joined === "rev-parse --abbrev-ref HEAD") {
          return Promise.resolve("main\n");
        }
        if (joined === "rev-parse --abbrev-ref --symbolic-full-name @{u}") {
          return Promise.resolve("origin/main\n");
        }
        if (joined === "rev-list --left-right --count HEAD...@{u}") {
          return Promise.resolve("1\t2\n");
        }
        return Promise.resolve("");
      })
    });

    await receive({ command: "syncStatus", repo: "/repo" });

    expect(post).toHaveBeenCalledWith({
      command: "syncStatus",
      isDetached: false,
      upstream: "origin/main",
      ahead: 1,
      behind: 2
    });
    expect(gitClient.setRepo).toHaveBeenCalledWith("/repo");
  });

  it("routes stashList query through the SimpleGit instance", async () => {
    const { post, gitClient, receive } = setup();
    (gitClient.getInstance as ReturnType<typeof vi.fn>).mockReturnValue({
      raw: vi.fn(() => Promise.resolve("stash@{0}\x00abc1234\x00test stash\x0010 minutes ago\n"))
    });

    await receive({ command: "stashList", repo: "/repo" });

    expect(post).toHaveBeenCalledWith({
      command: "stashList",
      stashes: [{ index: 0, hash: "abc1234", message: "test stash", date: "10 minutes ago" }]
    });
  });

  it("routes listTags query through the SimpleGit instance", async () => {
    const { post, gitClient, receive } = setup();
    (gitClient.getInstance as ReturnType<typeof vi.fn>).mockReturnValue({
      raw: vi.fn(() => Promise.resolve("v1.0.0\nv0.1.0\n"))
    });

    await receive({ command: "listTags", repo: "/repo" });

    expect(post).toHaveBeenCalledWith({
      command: "listTags",
      tags: ["v1.0.0", "v0.1.0"]
    });
  });

  it("passes the sort option through to the listTags query", async () => {
    const { gitClient, receive } = setup();
    const raw = vi.fn(() => Promise.resolve(""));
    (gitClient.getInstance as ReturnType<typeof vi.fn>).mockReturnValue({ raw });

    await receive({ command: "listTags", repo: "/repo", sort: "name" });
    expect(raw).toHaveBeenCalledWith(["tag", "--list"]);
  });
});
