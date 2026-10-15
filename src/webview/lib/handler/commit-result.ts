import type { LocalizedStrings } from "@/extension/l10n/webviewL10n";
import type { ActionResponse } from "@/types";
import { closeDialog, openErrorDialog, refresh } from "@/webview/lib/actions";
import { playCommitSound } from "@/webview/lib/audio";
import { commitDescription, commitSubject, isCommitting } from "@/webview/lib/stores/staging.store";

const ERROR_KEY: Record<"commitChanges" | "commitAndPush", keyof LocalizedStrings> = {
  commitChanges: "unableToCommitChanges",
  commitAndPush: "unableToCommitAndPush"
};

type CommitResponse = Extract<ActionResponse, { command: "commitChanges" | "commitAndPush" }>;

/**
 * Xử lý phản hồi commit (và commit & push): hạ cờ `isCommitting`, làm sạch tiêu đề/mô
 * tả và phát âm thanh chốt cơ khí khi thành công; hiển thị lỗi khi thất bại.
 */
export function handleCommitResult(msg: CommitResponse): void {
  isCommitting.value = false;

  if (msg.status === null) {
    commitSubject.value = "";
    commitDescription.value = "";
    playCommitSound();
    closeDialog();
    refresh();
    return;
  }

  openErrorDialog(window.l10n[ERROR_KEY[msg.command]], msg.status);
}
