import { computed, signal } from "@preact/signals";

import type { StashRecord, SyncStatusResult } from "@/types";
import { runAction } from "@/webview/lib/actions";
import { startOperation } from "@/webview/lib/stores/loading.store";

/**
 * Kho trạng thái đồng bộ mạng (Sync) của thanh công cụ đỉnh, mô hình hóa theo kiến
 * trúc Fine-Grained Reactive Signals. Toàn bộ số đếm ahead/behind và cờ bận được quản
 * lý tại đây; các thao tác ghi được ủy thác xuống Backend qua RPC (`runAction`).
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 3).
 */

// --- Tín hiệu cơ sở (Base Signals) ---

/** Số commit cục bộ đã commit nhưng chưa đẩy lên remote. */
export const aheadCount = signal(0);
/** Số commit trên remote chưa kéo về working tree. */
export const behindCount = signal(0);
/** Tên nhánh remote tracking tương ứng (ví dụ `"origin/main"`). */
export const upstreamBranch = signal<string | null>(null);
/** Cờ đánh dấu kho đang ở trạng thái Detached HEAD. */
export const isDetached = signal(false);

/** Cờ đánh dấu tiến trình `fetchAll` đang chạy ngầm. */
export const isFetching = signal(false);
/** Cờ đánh dấu tiến trình `pull` đang chạy ngầm. */
export const isPulling = signal(false);
/** Cờ đánh dấu tiến trình `push` đang chạy ngầm. */
export const isPushing = signal(false);
/** Cờ đánh dấu tiến trình `stashSave` hoặc `stashPop` đang chạy. */
export const isStashing = signal(false);

/** Danh sách bản ghi stash (tiêu thụ bởi cây điều hướng Sidebar ở Nhóm Việc 3). */
export const stashList = signal<StashRecord[]>([]);

/** Danh sách release tags (tiêu thụ bởi phân nhóm TAGS trong cây điều hướng Sidebar). */
export const tagList = signal<string[]>([]);

// --- Tín hiệu dẫn xuất (Computed Signals) ---

/** `true` khi kho có commit lệch cần đồng bộ (ahead hoặc behind lớn hơn 0). */
export const hasPendingSync = computed(() => aheadCount.value > 0 || behindCount.value > 0);

/** `true` khi có bất kỳ tác vụ mạng/lưu trữ nào đang thực thi. */
export const isNetworkBusy = computed(
  () => isFetching.value || isPulling.value || isPushing.value || isStashing.value
);

/** Chuỗi thông báo trạng thái tóm tắt tiếng Anh. */
export const syncStatusText = computed(() => {
  if (isDetached.value) {
    return "Detached HEAD";
  }
  if (behindCount.value > 0 && aheadCount.value > 0) {
    return `${aheadCount.value} ahead, ${behindCount.value} behind`;
  }
  if (behindCount.value > 0) {
    return `${behindCount.value} commit(s) behind`;
  }
  if (aheadCount.value > 0) {
    return `${aheadCount.value} commit(s) ahead`;
  }
  return "Up to date";
});

// --- Hàm điều phối hành động (Store Action Dispatchers) ---

/** Nạp kết quả truy vấn `syncStatus` vào các tín hiệu cơ sở. */
export function loadSyncStatus(msg: SyncStatusResult): void {
  aheadCount.value = msg.ahead;
  behindCount.value = msg.behind;
  upstreamBranch.value = msg.upstream;
  isDetached.value = msg.isDetached;
}

/** Nạp danh sách stash từ phản hồi truy vấn `stashList`. */
export function loadStashList(stashes: StashRecord[]): void {
  stashList.value = stashes;
}

/** Nạp danh sách release tags từ phản hồi truy vấn `listTags`. */
export function loadTagList(tags: string[]): void {
  tagList.value = tags;
}

/** Phát lệnh `fetchAll`; chống gọi trùng lặp khi đang bận. */
export function fetch(prune = true): void {
  if (isNetworkBusy.value) {
    return;
  }
  isFetching.value = true;
  startOperation("fetch");
  runAction({ command: "fetchAll", prune });
}

/** Phát lệnh `pull` theo chiến lược merge hoặc rebase. */
export function pull(mode: "merge" | "rebase" = "merge"): void {
  if (isNetworkBusy.value) {
    return;
  }
  isPulling.value = true;
  startOperation("pull");
  runAction({ command: "pull", mode });
}

/** Phát lệnh `push`; `forceWithLease` kích hoạt cờ an toàn `--force-with-lease`. */
export function push(forceWithLease = false): void {
  if (isNetworkBusy.value) {
    return;
  }
  isPushing.value = true;
  startOperation("push");
  runAction({ command: "push", forceWithLease });
}

/** Phát lệnh `stashSave`; `includeUntracked` kèm cả tệp chưa theo dõi. */
export function stash(message?: string, includeUntracked = false): void {
  if (isNetworkBusy.value) {
    return;
  }
  isStashing.value = true;
  startOperation("stash");
  runAction(
    message !== undefined
      ? { command: "stashSave", message, includeUntracked }
      : { command: "stashSave", includeUntracked }
  );
}

/** Phát lệnh `stashPop` khôi phục bản stash tại `stash@{index}`. */
export function pop(index = 0): void {
  if (isNetworkBusy.value) {
    return;
  }
  isStashing.value = true;
  startOperation("pop");
  runAction({ command: "stashPop", index });
}
