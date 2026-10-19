import * as vscode from "vscode";

import { checkoutBranch, createBranch, deleteBranch, renameBranch } from "@/backend/actions/branch";
import {
  checkoutCommit,
  cherrypickCommit,
  resetToCommit,
  revertCommit
} from "@/backend/actions/commit";
import { mergeBranch, mergeCommit } from "@/backend/actions/merge";
import { addTag, deleteTag, pushTag } from "@/backend/actions/tag";
import type { GitClient } from "@/backend/gitClient";
import { commitDetails } from "@/backend/queries/commitDetails";
import { getHeadCommitMessage } from "@/backend/queries/headCommit";
import { loadBranches } from "@/backend/queries/loadBranches";
import { getStashList } from "@/backend/queries/stashList";
import { getSyncStatus } from "@/backend/queries/syncStatus";
import { getWorkspaceStatus } from "@/backend/queries/workspaceStatus";
import { abbrevCommit } from "@/backend/utils/string";
import type { Config } from "@/extension/config";
import type { GitCliMutator, MutatorResult } from "@/extension/mutator/gitCliMutator";
import { AvatarManager } from "@/extension/services/avatarManager";
import { encodeDiffDocUri } from "@/extension/services/diffDocProvider";
import { ExtensionState } from "@/extension/services/extensionState";
import { selectWatchedRepo } from "@/extension/watchers/git-repo.watcher";
import type { GitFileChangeType, RequestMessage, ResponseMessage } from "@/types";

import type { RepoManager } from "./repoManager";
import type { WebviewBridge } from "./webviewBridge";

function viewDiff(
  repo: string,
  commitHash: string,
  oldFilePath: string,
  newFilePath: string,
  type: GitFileChangeType
): Promise<boolean> {
  const abbrevHash = abbrevCommit(commitHash);
  const pathComponents = newFilePath.split("/");
  const title =
    pathComponents[pathComponents.length - 1] +
    " (" +
    (type === "A"
      ? vscode.l10n.t("Added in {0}", abbrevHash)
      : type === "D"
        ? vscode.l10n.t("Deleted in {0}", abbrevHash)
        : abbrevCommit(commitHash) + "^ ↔ " + abbrevCommit(commitHash)) +
    ")";
  return new Promise<boolean>((resolve) => {
    vscode.commands
      .executeCommand(
        "vscode.diff",
        encodeDiffDocUri(repo, oldFilePath, commitHash + "^"),
        encodeDiffDocUri(repo, newFilePath, commitHash),
        title,
        { preview: true }
      )
      .then(() => resolve(true))
      .then(() => resolve(false));
  });
}

/** Chuyển đổi kết quả `MutatorResult` thành lỗi ném ra để `registerAction` bắt được. */
async function runMutation(result: Promise<MutatorResult>): Promise<void> {
  const r = await result;
  if (!r.ok) {
    throw new Error(r.stderr || "Thao tác Git thất bại");
  }
}

export function registerMessageHandlers(
  bridge: WebviewBridge,
  deps: {
    config: Config;
    gitClient: GitClient;
    gitMutator: GitCliMutator;
    repoManager: RepoManager;
    extensionState: ExtensionState;
    avatarManager: AvatarManager;
  }
) {
  const { config, gitClient, gitMutator, repoManager, extensionState, avatarManager } = deps;

  let currentRepo: string | null = null;

  function setCurrentRepo(repo: string) {
    if (repo === currentRepo) {
      return;
    }
    currentRepo = repo;
    gitClient.setRepo(repo);
    gitMutator.setRepo(repo);
    extensionState.setLastActiveRepo(repo);
    selectWatchedRepo(repo);
  }

  function registerAction<T extends RequestMessage["command"]>(
    command: T,
    handler: (msg: Extract<RequestMessage, { command: T }>) => Promise<void>
  ) {
    bridge.onMessage(command, async (msg) => {
      let status: string | null = null;
      try {
        await handler(msg);
      } catch (e: unknown) {
        status = e instanceof Error ? e.message : String(e);
      }
      bridge.post({ command, status } as ResponseMessage);
    });
  }

  // --- Action handlers ---

  registerAction("addTag", (msg) => addTag(gitClient.getInstance(), msg));
  registerAction("deleteTag", (msg) => deleteTag(gitClient.getInstance(), msg));
  registerAction("pushTag", (msg) => pushTag(gitClient.getInstance(), msg));
  registerAction("createBranch", (msg) => createBranch(gitClient.getInstance(), msg));
  registerAction("deleteBranch", (msg) => deleteBranch(gitClient.getInstance(), msg));
  registerAction("renameBranch", (msg) => renameBranch(gitClient.getInstance(), msg));
  registerAction("checkoutBranch", (msg) => checkoutBranch(gitClient.getInstance(), msg));
  registerAction("checkoutCommit", (msg) => checkoutCommit(gitClient.getInstance(), msg));
  registerAction("cherrypickCommit", (msg) => cherrypickCommit(gitClient.getInstance(), msg));
  registerAction("revertCommit", (msg) => revertCommit(gitClient.getInstance(), msg));
  registerAction("resetToCommit", (msg) => resetToCommit(gitClient.getInstance(), msg));
  registerAction("mergeBranch", (msg) => mergeBranch(gitClient.getInstance(), msg));
  registerAction("mergeCommit", (msg) => mergeCommit(gitClient.getInstance(), msg));

  // --- Staging & Commit actions (ủy thác cho GitCliMutator) ---

  registerAction("stageFile", (msg) => runMutation(gitMutator.stageFile(msg.filePath)));
  registerAction("unstageFile", (msg) => runMutation(gitMutator.unstageFile(msg.filePath)));
  registerAction("stageAll", () => runMutation(gitMutator.stageAll()));
  registerAction("unstageAll", () => runMutation(gitMutator.unstageAll()));
  registerAction("discardFileChanges", (msg) =>
    runMutation(gitMutator.discardFileChanges(msg.filePath, msg.isUntracked))
  );
  registerAction("discardAllChanges", () => runMutation(gitMutator.discardAllChanges()));
  registerAction("commitChanges", (msg) =>
    runMutation(
      gitMutator.commit(msg.summary, {
        description: msg.description,
        amend: msg.amend,
        sign: msg.sign
      })
    )
  );
  registerAction("commitAndPush", (msg) =>
    runMutation(
      gitMutator.commitAndPush(msg.summary, {
        description: msg.description,
        amend: msg.amend,
        sign: msg.sign
      })
    )
  );
  registerAction("openFile", async (msg) => {
    const fileUri = vscode.Uri.joinPath(vscode.Uri.file(msg.repo), ...msg.filePath.split("/"));
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document, { preview: true });
  });

  // --- Sync & Stash actions (ủy thác cho GitCliMutator) ---

  registerAction("fetchAll", (msg) => runMutation(gitMutator.fetchAll(msg.prune)));
  registerAction("pull", (msg) => runMutation(gitMutator.pull(msg.mode)));
  registerAction("push", (msg) => runMutation(gitMutator.push(msg)));
  registerAction("stashSave", (msg) =>
    runMutation(gitMutator.stashSave(msg.message, msg.includeUntracked))
  );
  registerAction("stashPop", (msg) => runMutation(gitMutator.stashPop(msg.index)));
  registerAction("stashDrop", (msg) => runMutation(gitMutator.stashDrop(msg.index)));

  // --- Query handlers ---

  bridge.onMessage("loadBranches", async (msg) => {
    setCurrentRepo(msg.repo);
    bridge.post({
      command: "loadBranches",
      ...(await loadBranches(gitClient.getInstance(), {
        showRemoteBranches: msg.showRemoteBranches,
        hard: msg.hard,
        repo: msg.repo,
        gitPath: config.gitPath()
      }))
    });
  });

  bridge.onMessage("commitDetails", async (msg) => {
    bridge.post({
      command: "commitDetails",
      ...(await commitDetails(gitClient.getInstance(), {
        commitHash: msg.commitHash,
        dateType: config.dateType()
      }))
    });
  });

  bridge.onMessage("workspaceStatus", async (msg) => {
    setCurrentRepo(msg.repo);
    bridge.post({
      command: "workspaceStatus",
      ...(await getWorkspaceStatus(gitClient.getInstance()))
    });
  });

  bridge.onMessage("headCommit", async (msg) => {
    setCurrentRepo(msg.repo);
    bridge.post({
      command: "headCommit",
      ...(await getHeadCommitMessage(gitClient.getInstance()))
    });
  });

  bridge.onMessage("syncStatus", async (msg) => {
    setCurrentRepo(msg.repo);
    bridge.post({
      command: "syncStatus",
      ...(await getSyncStatus(gitClient.getInstance()))
    });
  });

  bridge.onMessage("stashList", async (msg) => {
    setCurrentRepo(msg.repo);
    bridge.post({
      command: "stashList",
      ...(await getStashList(gitClient.getInstance()))
    });
  });

  // --- Infrastructure handlers ---

  bridge.onMessage("selectRepo", (msg) => {
    setCurrentRepo(msg.repo);
  });

  bridge.onMessage("fetchAvatar", (msg) => {
    avatarManager.fetchAvatarImage(msg.email, msg.repo, msg.commits);
  });

  bridge.onMessage("saveRepoState", (msg) => {
    repoManager.setRepoState(msg.repo, msg.state);
  });

  bridge.onMessage("viewDiff", async (msg) => {
    bridge.post({
      command: "viewDiff",
      success: await viewDiff(msg.repo, msg.commitHash, msg.oldFilePath, msg.newFilePath, msg.type)
    });
  });

  return {
    onPanelShown: () => {
      currentRepo = null;
    }
  };
}
