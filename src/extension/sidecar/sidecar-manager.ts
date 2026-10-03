import { spawn, type ChildProcess } from "node:child_process";

import * as vscode from "vscode";

import { logger } from "@/extension/util/logger";

import {
  Opcode,
  decodeError,
  decodeInitSuccess,
  decodeRangeData,
  encodeFrame,
  encodeInitRequest,
  encodeQueryRange,
  tryDecodeFrame,
  type Frame,
  type InitSuccess,
  type RangeData
} from "./protocol";

// Module điều phối vòng đời tiến trình F# sidecar (f-gitgraph-core.exe) và máy khách
// RPC nhị phân qua đường ống stdin/stdout. Tham khảo thiết kế:
// docs/02_design/001_windows/05_IPC_Stdio_Streaming_Protocol.md (Mục 1 & 2).

const HEARTBEAT_INTERVAL_MS = 10_000;
const READY_TIMEOUT_MS = 5_000;

/// Tên nhị phân sidecar (Nhân F# Native AOT) và thư viện C gốc LibGit2.
const SIDECAR_EXECUTABLE = "f-gitgraph-core.exe";
const SIDECAR_LIBGIT2 = "git2-5853918.dll";

/**
 * Phân giải đường dẫn tuyệt đối tới nhị phân sidecar trong thư mục phân phối nội
 * bộ `bin/win-x64/`. Dùng `context.asAbsolutePath` để hoạt động đúng cả trong môi
 * trường phát triển (F5 Extension Host) lẫn môi trường đã cài từ gói VSIX.
 */
export function resolveSidecarBinaryPath(context: vscode.ExtensionContext): string {
  return context.asAbsolutePath(`bin/win-x64/${SIDECAR_EXECUTABLE}`);
}

/**
 * Phân giải đường dẫn tuyệt đối tới thư viện C gốc LibGit2. Đặt cạnh nhị phân trong
 * cùng thư mục `bin/win-x64/` để P/Invoke của nhân F# nạp được qua tên file.
 */
export function resolveSidecarLibGit2Path(context: vscode.ExtensionContext): string {
  return context.asAbsolutePath(`bin/win-x64/${SIDECAR_LIBGIT2}`);
}

type PendingRequest = {
  resolve: (frame: Frame) => void;
  reject: (error: Error) => void;
};

export class SidecarManager implements vscode.Disposable {
  private child: ChildProcess | undefined;
  private buffer = new Uint8Array(0);
  private sequence = 0;
  private pending = new Map<number, PendingRequest>();
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private disposed = false;

  private readyResolve: (() => void) | undefined;
  private readyTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly exePath: string) {}

  /** Tạo trình quản lý sidecar trỏ tới nhị phân trong thư mục phân phối nội bộ. */
  static create(context: vscode.ExtensionContext): SidecarManager {
    return new SidecarManager(resolveSidecarBinaryPath(context));
  }

  async start(): Promise<void> {
    const ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyTimer = setTimeout(() => {
        reject(new Error("hết thời gian chờ tín hiệu sẵn sàng từ f-gitgraph-core"));
      }, READY_TIMEOUT_MS);
    });

    this.child = spawn(this.exePath, ["serve"], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    this.child.stdout?.on("data", (chunk: Buffer) => this.onData(new Uint8Array(chunk)));
    this.child.stderr?.on("data", (chunk: Buffer) =>
      logger.debug(`f-gitgraph-core stderr: ${chunk.toString()}`)
    );
    this.child.on("exit", (code) => this.onExit(code));

    await ready;

    // Giám sát nhịp tim định kỳ.
    this.heartbeatTimer = setInterval(() => {
      void this.heartbeat().catch((err) => logger.warn(`Heartbeat thất bại: ${err.message}`));
    }, HEARTBEAT_INTERVAL_MS);
  }

  async initialize(repoPath: string): Promise<InitSuccess> {
    const response = await this.request(Opcode.InitializeRepo, encodeInitRequest(repoPath));
    return decodeInitSuccess(response.payload);
  }

  async queryRange(from: number, to: number): Promise<RangeData> {
    const response = await this.request(Opcode.QueryRange, encodeQueryRange(from, to));
    return decodeRangeData(response.payload);
  }

  async invalidate(): Promise<InitSuccess> {
    const response = await this.request(Opcode.InvalidateCache, new Uint8Array(0));
    return decodeInitSuccess(response.payload);
  }

  async heartbeat(): Promise<void> {
    const response = await this.request(Opcode.HeartbeatPing, new Uint8Array(0));
    if (response.opcode !== Opcode.HeartbeatPong) {
      throw new Error(`phản hồi nhịp tim bất thường: ${response.opcode}`);
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    this.rejectAll(new Error("sidecar đã bị hủy"));
    this.child?.kill();
    this.child = undefined;
  }

  private request(opcode: number, payload: Uint8Array): Promise<Frame> {
    const child = this.child;
    if (child === undefined || child.stdin === null) {
      return Promise.reject(new Error("sidecar chưa được khởi động"));
    }

    const sequence = this.sequence++;
    const promise = new Promise<Frame>((resolve, reject) => {
      this.pending.set(sequence, { resolve, reject });
    });

    child.stdin.write(Buffer.from(encodeFrame({ opcode, sequence, payload })));
    return promise;
  }

  private onData(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.buffer.length + chunk.length);
    merged.set(this.buffer);
    merged.set(chunk, this.buffer.length);
    this.buffer = merged;

    while (true) {
      const frame = tryDecodeFrame(this.buffer);
      if (frame === null) {
        break;
      }
      // Tổng kích thước khung = 4 (độ dài) + 5 (tiêu đề) + payload.
      this.buffer = this.buffer.slice(9 + frame.payload.length);
      this.onFrame(frame);
    }
  }

  private onFrame(frame: Frame): void {
    if (frame.opcode === Opcode.Ready) {
      if (this.readyResolve !== undefined) {
        if (this.readyTimer !== undefined) {
          clearTimeout(this.readyTimer);
          this.readyTimer = undefined;
        }
        this.readyResolve();
        this.readyResolve = undefined;
      }
      return;
    }

    if (frame.opcode === Opcode.Error) {
      const pending = this.pending.get(frame.sequence);
      if (pending !== undefined) {
        this.pending.delete(frame.sequence);
        const err = decodeError(frame.payload);
        pending.reject(new Error(`f-gitgraph-core (${err.code}): ${err.message}`));
      }
      return;
    }

    const pending = this.pending.get(frame.sequence);
    if (pending !== undefined) {
      this.pending.delete(frame.sequence);
      pending.resolve(frame);
    }
  }

  private onExit(code: number | null): void {
    this.child = undefined;
    this.rejectAll(new Error(`sidecar đã thoát với mã ${code ?? "không xác định"}`));
    if (this.disposed) {
      return;
    }
    // Tự phục hồi: khởi động lại tiến trình và tái lập kết nối.
    logger.warn(`f-gitgraph-core thoát bất ngờ (${code}); khởi động lại...`);
    void this.start().catch((err) =>
      logger.error(`Không thể khởi động lại sidecar: ${err.message}`)
    );
  }

  private rejectAll(error: Error): void {
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}
