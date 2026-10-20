import type { ResponseMessage } from "@/types";
import { remoteBranchesLoading, remoteGroups } from "@/webview/lib/stores";
import { loadSyncStatus, loadStashList, loadTagList } from "@/webview/lib/stores/sync.store";

type SyncStatusMessage = Extract<ResponseMessage, { command: "syncStatus" }>;
type StashListMessage = Extract<ResponseMessage, { command: "stashList" }>;
type TagListMessage = Extract<ResponseMessage, { command: "listTags" }>;
type RemoteBranchesMessage = Extract<ResponseMessage, { command: "remoteBranches" }>;

/** Xử lý phản hồi truy vấn `syncStatus`: nạp số đếm ahead/behind vào `sync.store`. */
export function handleSyncStatus(msg: SyncStatusMessage): void {
  loadSyncStatus(msg);
}

/** Xử lý phản hồi truy vấn `stashList`: nạp danh sách stash vào `sync.store`. */
export function handleStashList(msg: StashListMessage): void {
  loadStashList(msg.stashes);
}

/** Xử lý phản hồi truy vấn `listTags`: nạp danh sách release tags vào `sync.store`. */
export function handleTagList(msg: TagListMessage): void {
  loadTagList(msg.tags);
}

/** Xử lý phản hồi truy vấn `remoteBranches`: nạp danh sách nhánh remote nhóm theo tên. */
export function handleRemoteBranches(msg: RemoteBranchesMessage): void {
  remoteGroups.value = msg.remotes;
  remoteBranchesLoading.value = false;
}
