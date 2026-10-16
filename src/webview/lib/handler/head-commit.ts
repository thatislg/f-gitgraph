import type { ResponseMessage } from "@/types";
import { loadHeadCommit } from "@/webview/lib/stores/staging.store";

type HeadCommitMessage = Extract<ResponseMessage, { command: "headCommit" }>;

/**
 * Xử lý phản hồi truy vấn `headCommit`: nạp tiêu đề và mô tả của commit HEAD vào
 * kho trạng thái để `setAmend(true)` có dữ liệu điền sẵn vào ô soạn thảo.
 */
export function handleHeadCommit(msg: HeadCommitMessage): void {
  if (msg.headCommit === null) {
    return;
  }
  loadHeadCommit(msg.headCommit.subject, msg.headCommit.description);
}
