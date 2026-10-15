import type { ResponseMessage } from "@/types";

import { handleActionResult } from "./handler/action-result";
import { handleCommitDetails } from "./handler/commit-details";
import { handleCommitResult } from "./handler/commit-result";
import { handleLoadBranches } from "./handler/load-branches";
import { handleRefresh } from "./handler/refresh";
import { handleViewDiff } from "./handler/view-diff";
import { handleWorkspaceStatus } from "./handler/workspace-status";

type Command = ResponseMessage["command"];

type Handlers = {
  [C in Command]?: (msg: Extract<ResponseMessage, { command: C }>) => void;
};

const handlers: Handlers = {
  addTag: handleActionResult,
  checkoutBranch: handleActionResult,
  checkoutCommit: handleActionResult,
  cherrypickCommit: handleActionResult,
  createBranch: handleActionResult,
  deleteBranch: handleActionResult,
  deleteTag: handleActionResult,
  mergeBranch: handleActionResult,
  mergeCommit: handleActionResult,
  pushTag: handleActionResult,
  renameBranch: handleActionResult,
  resetToCommit: handleActionResult,
  revertCommit: handleActionResult,
  stageFile: handleActionResult,
  unstageFile: handleActionResult,
  stageAll: handleActionResult,
  unstageAll: handleActionResult,
  discardFileChanges: handleActionResult,
  discardAllChanges: handleActionResult,
  commitDetails: handleCommitDetails,
  commitChanges: handleCommitResult,
  commitAndPush: handleCommitResult,
  loadBranches: handleLoadBranches,
  refresh: handleRefresh,
  viewDiff: handleViewDiff,
  workspaceStatus: handleWorkspaceStatus
};

export function initDispatcher() {
  window.addEventListener("message", (e: MessageEvent<unknown>) => {
    if (!isResponseMessage(e.data)) {
      return;
    }
    dispatch(e.data);
  });
}

function isResponseMessage(message: unknown): message is ResponseMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "command" in message &&
    typeof message.command === "string"
  );
}

function dispatch(msg: ResponseMessage): void {
  const handle = handlers[msg.command] as ((m: ResponseMessage) => void) | undefined;

  if (handle === undefined) {
    // eslint-disable-next-line no-console
    console.warn("no handler for", msg.command);
    return;
  }

  handle(msg);
}
