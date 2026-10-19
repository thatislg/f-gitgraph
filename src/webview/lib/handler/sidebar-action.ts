import type { ResponseMessage } from "@/types";
import { playError, playStash, playSwitch } from "@/webview/lib/audio";
import { isCheckingOut, isStashOperating } from "@/webview/lib/stores/sidebar.store";

import { handleActionResult } from "./action-result";
import { handleSyncAction } from "./sync-action";

type CheckoutBranchMessage = Extract<ResponseMessage, { command: "checkoutBranch" }>;
type SidebarStashMessage = Extract<ResponseMessage, { command: "stashPop" | "stashDrop" }>;

/**
 * Xử lý phản hồi checkout nhánh khởi phát từ cây điều hướng Sidebar: giải phóng khóa
 * Mutex, phát âm thanh thành công/lỗi, sau đó ủy thác chuẩn hóa lỗi và làm mới đồ thị
 * cho bộ xử lý kết quả dùng chung.
 */
export function handleCheckoutBranch(msg: CheckoutBranchMessage): void {
  isCheckingOut.value = false;

  if (msg.status === null) {
    playSwitch();
  } else {
    playError();
  }

  handleActionResult(msg);
}

/**
 * Xử lý phản hồi thao tác stash (`pop`/`drop`) khởi phát từ Sidebar: giải phóng khóa
 * Mutex, phát âm thanh lật trang khi thành công, rồi ủy thác chuỗi làm mới 4 chiều và
 * giải phóng cờ bận của `sync.store` cho bộ xử lý stash dùng chung.
 */
export function handleSidebarStash(msg: SidebarStashMessage): void {
  isStashOperating.value = false;

  if (msg.status === null) {
    playStash();
  }

  handleSyncAction(msg);
}
