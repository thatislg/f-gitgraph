import type { ResponseMessage } from "@/types";
import { loadSyncStatus, loadStashList } from "@/webview/lib/stores/sync.store";

type SyncStatusMessage = Extract<ResponseMessage, { command: "syncStatus" }>;
type StashListMessage = Extract<ResponseMessage, { command: "stashList" }>;

/** Xử lý phản hồi truy vấn `syncStatus`: nạp số đếm ahead/behind vào `sync.store`. */
export function handleSyncStatus(msg: SyncStatusMessage): void {
  loadSyncStatus(msg);
}

/** Xử lý phản hồi truy vấn `stashList`: nạp danh sách stash vào `sync.store`. */
export function handleStashList(msg: StashListMessage): void {
  loadStashList(msg.stashes);
}
