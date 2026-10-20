import type { ResponseMessage } from "@/types";
import { openErrorDialog, refreshAfterCheckout } from "@/webview/lib/actions";
import { playError, playStash, playSwitch } from "@/webview/lib/audio";
import { headBranch } from "@/webview/lib/stores";
import {
  isCheckingOut,
  isStashOperating,
  previousHeadBranch
} from "@/webview/lib/stores/sidebar.store";

import { handleSyncAction } from "./sync-action";

type CheckoutBranchMessage = Extract<ResponseMessage, { command: "checkoutBranch" }>;
type CheckoutRemoteBranchMessage = Extract<ResponseMessage, { command: "checkoutRemoteBranch" }>;
type SidebarStashMessage = Extract<ResponseMessage, { command: "stashPop" | "stashDrop" }>;

/**
 * Hoàn tất một chu kỳ checkout khởi phát từ Sidebar: giải phóng khóa Mutex, phát âm thanh
 * thành công/lỗi, làm mới có mục tiêu (`refreshAfterCheckout`) khi thành công và phục hồi
 * nhánh HEAD cũ (Rollback) khi thất bại.
 */
function finishCheckout(status: string | null, errorMessage: string): void {
  isCheckingOut.value = false;

  if (status === null) {
    playSwitch();
    refreshAfterCheckout();
  } else {
    playError();
    // Phục hồi trạng thái lạc quan: đưa viền tím Neon trở về nhánh HEAD cũ.
    headBranch.value = previousHeadBranch.value;
    openErrorDialog(errorMessage, status);
  }
}

/**
 * Xử lý phản hồi checkout nhánh khởi phát từ cây điều hướng Sidebar: giải phóng khóa
 * Mutex, phát âm thanh thành công/lỗi, làm mới có mục tiêu khi thành công và phục hồi
 * nhánh HEAD cũ khi thất bại.
 */
export function handleCheckoutBranch(msg: CheckoutBranchMessage): void {
  finishCheckout(msg.status, window.l10n.unableToCheckoutBranch);
}

/**
 * Xử lý phản hồi checkout nhánh remote thành nhánh cục bộ mới (menu ngữ cảnh), đồng bộ
 * hành vi với `handleCheckoutBranch` (lạc quan + phục hồi + làm mới có mục tiêu).
 */
export function handleCheckoutRemoteBranch(msg: CheckoutRemoteBranchMessage): void {
  finishCheckout(msg.status, window.l10n.unableToCheckoutRemoteBranch);
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
