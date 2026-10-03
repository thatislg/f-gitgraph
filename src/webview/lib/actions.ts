import { batch } from "@preact/signals";
import type { ComponentChildren } from "preact";

import type { ActionRequest, GitFileChange } from "@/types";
import {
  branchList,
  commitDetails,
  contextMenu,
  dialog,
  expandedCommit,
  headBranch,
  repoStates,
  selectedBranch,
  selectedRepo,
  showRemoteBranch
} from "@/webview/lib/stores";
import { graphWindowStore } from "@/webview/lib/stores/graph-window.store";
import { vscode } from "@/webview/lib/vscode";
import type {
  ActionCommand,
  CommitBranchType,
  ContextMenuEntry,
  DialogBody,
  DialogInput,
  DialogValues
} from "@/webview/types";

function requestBranches(repo: string) {
  vscode.postMessage({
    command: "loadBranches",
    repo,
    showRemoteBranches: showRemoteBranch.value,
    hard: true
  });
}

export function selectRepo(repo: string) {
  if (repo === selectedRepo.value) {
    return;
  }

  batch(() => {
    selectedRepo.value = repo;
    branchList.value = undefined;
    headBranch.value = null;
    selectedBranch.value = undefined;
    graphWindowStore.clear();
    closeCommitDetails();
  });

  vscode.postMessage({ command: "selectRepo", repo });
  requestBranches(repo);
  void graphWindowStore.loadGraph(repo);
}

export function selectBranch(branch: CommitBranchType) {
  if (branch === selectedBranch.value) {
    return;
  }

  batch(() => {
    selectedBranch.value = branch;
    closeCommitDetails();
  });

  const repo = selectedRepo.value;
  if (repo !== undefined) {
    void graphWindowStore.loadGraph(repo, branch);
  }
}

/** Resize the columns of the commit table, while the user drags a boundary. */
export function setColumnWidths(widths: Array<number>) {
  const repo = selectedRepo.value;
  if (repo === undefined) {
    return;
  }

  repoStates.value = {
    ...repoStates.value,
    [repo]: { ...repoStates.value[repo], columnWidths: widths }
  };
}

/** Resize the columns of the commit table, and keep the widths for the next session. */
export function saveColumnWidths(widths: Array<number>) {
  const repo = selectedRepo.value;
  if (repo === undefined) {
    return;
  }

  setColumnWidths(widths);
  const state = repoStates.value[repo];
  if (state === undefined) {
    return;
  }
  vscode.postMessage({
    command: "saveRepoState",
    repo,
    state
  });
}

export function setShowRemoteBranch(value: boolean) {
  if (value === showRemoteBranch.value) {
    return;
  }

  showRemoteBranch.value = value;

  const repo = selectedRepo.value;
  if (repo === undefined) {
    return;
  }

  requestBranches(repo);
  void graphWindowStore.loadGraph(repo, selectedBranch.value);
}

export function refresh() {
  const repo = selectedRepo.value;
  if (repo === undefined) {
    return;
  }

  requestBranches(repo);
  void graphWindowStore.loadGraph(repo, selectedBranch.value);
}

export function closeCommitDetails() {
  batch(() => {
    expandedCommit.value = null;
    commitDetails.value = null;
  });
}

/** Open the details view of a commit, or close it when it is already open. */
export function toggleCommitDetails(hash: string) {
  if (hash === expandedCommit.value) {
    closeCommitDetails();
    return;
  }

  const repo = selectedRepo.value;
  batch(() => {
    expandedCommit.value = hash;
    commitDetails.value = null;
  });

  if (repo === undefined) {
    return;
  }

  vscode.postMessage({ command: "commitDetails", repo, commitHash: hash });
}

/**
 * Open a context menu at the pointer. The default menu of the host is
 * suppressed, because browser-based VS Code draws it on top of ours.
 */
export function openContextMenu(
  event: MouseEvent,
  source: string,
  entries: Array<ContextMenuEntry>
) {
  event.preventDefault();
  event.stopPropagation();
  contextMenu.value = { x: event.clientX, y: event.clientY, entries, source };
}

export function closeContextMenu() {
  contextMenu.value = null;
}

/** Open a dialog. The context menu that asked for it closes. */
function openDialog(body: DialogBody) {
  batch(() => {
    contextMenu.value = null;
    dialog.value = { ...body, token: (dialog.value?.token ?? 0) + 1 };
  });
}

export function closeDialog() {
  dialog.value = null;
}

type FormDialog<T extends ReadonlyArray<DialogInput>> = {
  message: ComponentChildren;
  inputs: T;
  /** Label of the button that submits the form. */
  action: string;
  /** Context menu key of the element the dialog belongs to. */
  source: string | null;
  onSubmit: (values: DialogValues<T>) => void;
};

/**
 * Ask the user to fill in a form, or to confirm when `inputs` is empty.
 * The dialog fills one value per input, in order, so the tuple type holds.
 */
export function openFormDialog<const T extends ReadonlyArray<DialogInput>>({
  message,
  inputs,
  action,
  source,
  onSubmit
}: FormDialog<T>) {
  openDialog({
    kind: "form",
    message,
    inputs: [...inputs],
    action,
    onSubmit: onSubmit as (values: Array<string | boolean>) => void,
    source
  });
}

/** Report a command that failed. `reason` holds the output of git. */
export function openErrorDialog(message: string, reason: string | null = null) {
  openDialog({ kind: "error", message, reason });
}

/** Report a command that runs longer than the others. The response replaces it. */
export function openRunningDialog(message: string) {
  openDialog({ kind: "running", message });
}

/** Ask the editor to run a git command on the selected repo. */
export function runAction(command: ActionCommand) {
  const repo = selectedRepo.value;
  if (repo === undefined) {
    return;
  }

  vscode.postMessage({ ...command, repo } as ActionRequest);
}

/** Ask the editor to open the diff of a file of a commit. */
export function viewDiff(commitHash: string, file: GitFileChange) {
  const repo = selectedRepo.value;
  if (repo === undefined) {
    return;
  }

  vscode.postMessage({
    command: "viewDiff",
    repo,
    commitHash,
    oldFilePath: file.oldFilePath,
    newFilePath: file.newFilePath,
    type: file.type
  });
}
