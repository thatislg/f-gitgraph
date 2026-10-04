import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";

import * as vscode from "vscode";

import { logger } from "@/extension/util/logger";
import type { CommitOrdering } from "@/types";

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

// Module điều phối vòng đời tiến trình F# sidecar (f-gitgraph-core) và máy khách
// RPC nhị phân qua đường ống stdin/stdout. Hỗ trợ đa nền tảng Windows, Linux, macOS.

const HEARTBEAT_INTERVAL_MS = 10_000;
const READY_TIMEOUT_MS = 5_000;

export interface PlatformBinaryInfo {
  directories: string[];
  executable: string;
  libgit2: string;
}

/**
 * Xác định tên thư mục và tên file nhị phân tương ứng với nền tảng & kiến trúc CPU hiện tại.
 */
export function getPlatformBinaryInfo(
  platform = process.platform,
  arch = process.arch
): PlatformBinaryInfo {
  const isWindows = platform === "win32";
  const isMac = platform === "darwin";
  const isLinux = platform === "linux";

  const exeName = isWindows ? "f-gitgraph-core.exe" : "f-gitgraph-core";
  let libName = "git2-5853918.dll";
  if (isLinux) {
    libName = "libgit2-5853918.so";
  } else if (isMac) {
    libName = "libgit2-5853918.dylib";
  }

  let directories: string[];
  if (isWindows) {
    directories = arch === "arm64" ? ["win-arm64", "win32-arm64"] : ["win-x64", "win32-x64"];
  } else if (isMac) {
    directories = arch === "arm64" ? ["osx-arm64", "darwin-arm64"] : ["osx-x64", "darwin-x64"];
  } else if (isLinux) {
    directories = arch === "arm64" ? ["linux-arm64"] : ["linux-x64"];
  } else {
    directories = [`${platform}-${arch}`];
  }

  return { directories, executable: exeName, libgit2: libName };
}

/**
 * Phân giải đường dẫn tuyệt đối tới nhị phân sidecar.
 * Tìm kiếm theo thứ tự: thư mục nền tảng (Universal/Platform VSIX), thư mục bin gốc,
 * hoặc fallback về đường dẫn mặc định của nền tảng hiện hành.
 */
export function resolveSidecarBinaryPath(context: vscode.ExtensionContext): string {
  const info = getPlatformBinaryInfo();

  // 1. Kiểm tra thư mục tương ứng nền tảng (VD: bin/win-x64, bin/linux-x64, bin/osx-arm64)
  for (const dir of info.directories) {
    const candidate = context.asAbsolutePath(`bin/${dir}/${info.executable}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 2. Kiểm tra trực tiếp tại bin/ (khi đóng gói phẳng cho 1 nền tảng duy nhất)
  const flatCandidate = context.asAbsolutePath(`bin/${info.executable}`);
  if (fs.existsSync(flatCandidate)) {
    return flatCandidate;
  }

  // 3. Fallback trả về vị trí chuẩn dự kiến
  return context.asAbsolutePath(`bin/${info.directories[0] ?? "win-x64"}/${info.executable}`);
}

/**
 * Phân giải đường dẫn tuyệt đối tới thư viện C gốc LibGit2.
 */
export function resolveSidecarLibGit2Path(context: vscode.ExtensionContext): string {
  const info = getPlatformBinaryInfo();

  for (const dir of info.directories) {
    const candidate = context.asAbsolutePath(`bin/${dir}/${info.libgit2}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const flatCandidate = context.asAbsolutePath(`bin/${info.libgit2}`);
  if (fs.existsSync(flatCandidate)) {
    return flatCandidate;
  }

  return context.asAbsolutePath(`bin/${info.directories[0] ?? "win-x64"}/${info.libgit2}`);
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
    if (!fs.existsSync(this.exePath)) {
      throw new Error(`Không tìm thấy file thực thi F# sidecar tại: ${this.exePath}`);
    }

    // Tự động cấp quyền thực thi (chmod +x) trên Unix (Linux / macOS) nếu thiếu cờ
    if (process.platform !== "win32") {
      try {
        const stat = fs.statSync(this.exePath);
        if ((stat.mode & 0o111) === 0) {
          fs.chmodSync(this.exePath, 0o755);
        }
      } catch (err) {
        logger.warn(
          `Không thể tự động cấp cờ thực thi (chmod +x) cho ${this.exePath}: ${String(err)}`
        );
      }
    }

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

  async initialize(
    repoPath: string,
    branch?: string,
    commitOrdering?: CommitOrdering
  ): Promise<InitSuccess> {
    const response = await this.request(
      Opcode.InitializeRepo,
      encodeInitRequest(repoPath, branch, commitOrdering)
    );
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
