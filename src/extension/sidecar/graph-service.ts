import * as vscode from "vscode";

import { logger } from "@/extension/util/logger";

import { SidecarManager } from "./sidecar-manager";

// Dịch vụ quản lý vòng đời tiến trình F# sidecar dùng chung cho các RPC handler.
// Khởi tạo một lần khi mở panel đồ thị, thu hồi tài nguyên khi đóng panel.

let instance: SidecarManager | undefined;
let startPromise: Promise<void> | undefined;

/** Khởi động sidecar (nếu chưa chạy) và lưu lại thể hiện dùng chung. */
export async function startGraphService(ctx: vscode.ExtensionContext): Promise<void> {
  if (instance !== undefined) {
    return;
  }

  const sidecar = SidecarManager.create(ctx);
  instance = sidecar;
  startPromise = sidecar
    .start()
    .then(() => {
      logger.info("f-gitgraph-core sidecar đã sẵn sàng");
    })
    .catch((err: unknown) => {
      logger.error(
        `Không thể khởi động f-gitgraph-core sidecar: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      instance = undefined;
      throw err;
    });

  await startPromise;
}

/** Thu hồi tài nguyên sidecar. */
export function disposeGraphService(): void {
  instance?.dispose();
  instance = undefined;
  startPromise = undefined;
}

/** Lấy thể hiện sidecar đang chạy (ném lỗi nếu chưa khởi động). */
export function getSidecar(): SidecarManager {
  if (instance === undefined) {
    throw new Error("sidecar chưa được khởi động");
  }
  return instance;
}
