import type { LocalizedStrings } from "@/extension/l10n/webviewL10n";
import type { ActionResponse } from "@/types";
import { closeDialog, openErrorDialog, refresh } from "@/webview/lib/actions";

const ERROR_KEY: Record<ActionResponse["command"], keyof LocalizedStrings> = {
  addTag: "unableToAddTag",
  checkoutBranch: "unableToCheckoutBranch",
  checkoutCommit: "unableToCheckoutCommit",
  checkoutRemoteBranch: "unableToCheckoutRemoteBranch",
  cherrypickCommit: "unableToCherryPick",
  createBranch: "unableToCreateBranch",
  deleteBranch: "unableToDeleteBranch",
  deleteRemoteBranch: "unableToDeleteRemoteBranch",
  deleteTag: "unableToDeleteTag",
  mergeBranch: "unableToMergeBranch",
  mergeCommit: "unableToMergeCommit",
  pushTag: "unableToPushTag",
  renameBranch: "unableToRenameBranch",
  resetToCommit: "unableToReset",
  revertCommit: "unableToRevert",
  stageFile: "unableToStageFile",
  unstageFile: "unableToUnstageFile",
  stageAll: "unableToStageAll",
  unstageAll: "unableToUnstageAll",
  discardFileChanges: "unableToDiscardFileChanges",
  discardAllChanges: "unableToDiscardAllChanges",
  commitChanges: "unableToCommitChanges",
  commitAndPush: "unableToCommitAndPush",
  openFile: "unableToOpenFile",
  fetchAll: "unableToFetchAll",
  pull: "unableToPull",
  pullRemoteBranch: "unableToPullRemoteBranch",
  push: "unableToPush",
  stashSave: "unableToStashSave",
  stashPop: "unableToStashPop",
  stashDrop: "unableToStashDrop"
};

/** Every git command answers the same way, so one handler serves them all. */
export function handleActionResult(msg: ActionResponse) {
  if (msg.status === null) {
    closeDialog();
    refresh();
    return;
  }

  openErrorDialog(window.l10n[ERROR_KEY[msg.command]], msg.status);
}
