import type { ResponseMessage } from "@/types";
import { uncommittedChanges } from "@/webview/lib/stores";
import { loadStatus } from "@/webview/lib/stores/staging.store";

type WorkspaceStatusMessage = Extract<ResponseMessage, { command: "workspaceStatus" }>;

/**
 * Xử lý phản hồi truy vấn `workspaceStatus`: nạp danh sách tệp staged/unstaged vào
 * `stagingStore` và cập nhật bộ đếm `uncommittedChanges` để dòng mầm hiển thị đúng số
 * lượng tệp biến động trên đồ thị.
 */
export function handleWorkspaceStatus(msg: WorkspaceStatusMessage): void {
  loadStatus(msg);
  uncommittedChanges.value = msg.stagedFiles.length + msg.unstagedFiles.length;
}
