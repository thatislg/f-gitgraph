import type { LocalizedStrings } from "@/extension/l10n/webviewL10n";
import type { ActionResponse } from "@/types";
import {
  closeDialog,
  openErrorDialog,
  refresh,
  refreshStashList,
  refreshSyncStatus
} from "@/webview/lib/actions";
import { playPullSuccessSound, playPushSuccessSound } from "@/webview/lib/audio";
import { isFetching, isPulling, isPushing, isStashing } from "@/webview/lib/stores/sync.store";

type SyncActionCommand =
  | "fetchAll"
  | "pull"
  | "push"
  | "stashSave"
  | "stashPop"
  | "stashDrop";

type SyncActionResponse = Extract<ActionResponse, { command: SyncActionCommand }>;

const ERROR_KEY: Record<SyncActionCommand, keyof LocalizedStrings> = {
  fetchAll: "unableToFetchAll",
  pull: "unableToPull",
  push: "unableToPush",
  stashSave: "unableToStashSave",
  stashPop: "unableToStashPop",
  stashDrop: "unableToStashDrop"
};

/** Hạ cờ bận tương ứng với từng action mạng/stash. */
function releaseBusyFlag(command: SyncActionCommand): void {
  switch (command) {
    case "fetchAll":
      isFetching.value = false;
      break;
    case "pull":
      isPulling.value = false;
      break;
    case "push":
      isPushing.value = false;
      break;
    case "stashSave":
    case "stashPop":
    case "stashDrop":
      isStashing.value = false;
      break;
  }
}

/**
 * Xử lý phản hồi 6 action mạng/stash: giải phóng cờ bận, mở hộp thoại lỗi khi thất
 * bại; khi thành công, phát âm thanh vi mô tương ứng và kích hoạt chuỗi làm mới 4
 * chiều (đồ thị DAG, working tree, số đếm sync, danh sách stash).
 */
export function handleSyncAction(msg: SyncActionResponse): void {
  releaseBusyFlag(msg.command);

  if (msg.status !== null) {
    openErrorDialog(window.l10n[ERROR_KEY[msg.command]], msg.status);
    return;
  }

  if (msg.command === "push") {
    playPushSuccessSound();
  } else if (msg.command === "pull") {
    playPullSuccessSound();
  }

  closeDialog();
  // `refresh()` đã bao gồm nạp nhánh + `refreshStatus()` (working tree) + nạp đồ thị DAG.
  refresh();
  refreshSyncStatus();
  refreshStashList();
}
