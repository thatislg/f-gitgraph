// Giao thức Stdio RPC: mã định danh lệnh, khung gói tin nhị phân và lược đồ
// thông điệp. Đồng bộ với src/core-engine/Transport/Transport.fs.

import {
  MsgPackReader,
  MsgPackWriter,
  encodeArrayHeader,
  encodeBool,
  encodeFloat64,
  encodeInt,
  encodeMapHeader,
  encodeString,
  readArrayHeader,
  readBool,
  readFloat64,
  readInt,
  readMapHeader,
  readString
} from "./msgpack";

export const Opcode = {
  Ready: 0x00,
  InitializeRepo: 0x01,
  InitSuccess: 0x02,
  QueryRange: 0x03,
  RangeData: 0x04,
  InvalidateCache: 0x05,
  HeartbeatPing: 0x06,
  HeartbeatPong: 0x07,
  Error: 0xff
} as const;

export type OpcodeValue = (typeof Opcode)[keyof typeof Opcode];

export type Frame = {
  opcode: number;
  sequence: number;
  payload: Uint8Array;
};

const HEADER_SIZE = 5;

// --- Khung gói tin (Framing) ---

export function encodeFrame(frame: Frame): Uint8Array {
  const bodyLength = HEADER_SIZE + frame.payload.length;
  const output = new Uint8Array(4 + bodyLength);
  const view = new DataView(output.buffer);
  view.setUint32(0, bodyLength, true); // little-endian
  output[4] = frame.opcode;
  view.setUint32(5, frame.sequence, true);
  output.set(frame.payload, 9);
  return output;
}

export function tryDecodeFrame(bytes: Uint8Array): Frame | null {
  if (bytes.length < 4) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const bodyLength = view.getUint32(0, true);
  if (bodyLength < HEADER_SIZE) {
    throw new Error("độ dài khung gói tin không hợp lệ");
  }
  if (bytes.length < 4 + bodyLength) {
    return null;
  }
  return {
    opcode: bytes[4]!,
    sequence: view.getUint32(5, true),
    payload: bytes.slice(9, 4 + bodyLength)
  };
}

// --- Lược đồ thông điệp ---

export function encodeInitRequest(
  repoPath: string,
  branch?: string,
  commitOrdering?: string
): Uint8Array {
  const w = new MsgPackWriter();
  const keyCount = 1 + (branch !== undefined ? 1 : 0) + (commitOrdering !== undefined ? 1 : 0);
  encodeMapHeader(w, keyCount);
  encodeString(w, "repoPath");
  encodeString(w, repoPath);
  if (branch !== undefined) {
    encodeString(w, "branch");
    encodeString(w, branch);
  }
  if (commitOrdering !== undefined) {
    encodeString(w, "commitOrdering");
    encodeString(w, commitOrdering);
  }
  return w.toUint8Array();
}

export function encodeQueryRange(from: number, to: number): Uint8Array {
  const w = new MsgPackWriter();
  encodeMapHeader(w, 2);
  encodeString(w, "from");
  encodeInt(w, from);
  encodeString(w, "to");
  encodeInt(w, to);
  return w.toUint8Array();
}

export type InitSuccess = {
  commitCount: number;
  maxLane: number;
  commits: string[];
};

export function decodeInitSuccess(payload: Uint8Array): InitSuccess {
  const r = new MsgPackReader(payload);
  const count = readMapHeader(r);
  let commitCount = 0;
  let maxLane = 0;
  let commits: string[] = [];
  for (let i = 0; i < count; i++) {
    const key = readString(r);
    if (key === "commitCount") {
      commitCount = readInt(r);
    } else if (key === "maxLane") {
      maxLane = readInt(r);
    } else if (key === "commits") {
      const n = readArrayHeader(r);
      commits = Array.from({ length: n }, () => "");
      for (let j = 0; j < n; j++) {
        commits[j] = readString(r);
      }
    } else {
      throw new Error(`khóa không mong đợi trong init success: ${key}`);
    }
  }
  return { commitCount, maxLane, commits };
}

export type NodeGeometry = {
  x: number;
  y: number;
  lane: number;
  color: number;
  isMerge: boolean;
  isRoot: boolean;
};

export type PathGeometry = {
  d: string;
  color: number;
};

export type RangeData = {
  nodes: NodeGeometry[];
  paths: PathGeometry[];
};

export function decodeRangeData(payload: Uint8Array): RangeData {
  const r = new MsgPackReader(payload);
  const count = readMapHeader(r);
  let nodes: NodeGeometry[] = [];
  let paths: PathGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const key = readString(r);
    if (key === "nodes") {
      const n = readArrayHeader(r);
      nodes = Array.from({ length: n }, () => ({
        x: 0,
        y: 0,
        lane: 0,
        color: 0,
        isMerge: false,
        isRoot: false
      }));
      for (let j = 0; j < n; j++) {
        readArrayHeader(r); // 6 phần tử
        nodes[j] = {
          x: readFloat64(r),
          y: readFloat64(r),
          lane: readInt(r),
          color: readInt(r),
          isMerge: readBool(r),
          isRoot: readBool(r)
        };
      }
    } else if (key === "paths") {
      const n = readArrayHeader(r);
      paths = Array.from({ length: n }, () => ({ d: "", color: 0 }));
      for (let j = 0; j < n; j++) {
        readArrayHeader(r); // 2 phần tử
        paths[j] = {
          d: readString(r),
          color: readInt(r)
        };
      }
    } else {
      throw new Error(`khóa không mong đợi trong range data: ${key}`);
    }
  }
  return { nodes, paths };
}

export type ErrorPayload = {
  code: number;
  message: string;
};

export function decodeError(payload: Uint8Array): ErrorPayload {
  const r = new MsgPackReader(payload);
  const count = readMapHeader(r);
  let code = 0;
  let message = "";
  for (let i = 0; i < count; i++) {
    const key = readString(r);
    if (key === "code") {
      code = readInt(r);
    } else if (key === "message") {
      message = readString(r);
    } else {
      throw new Error(`khóa không mong đợi trong error: ${key}`);
    }
  }
  return { code, message };
}

export { encodeArrayHeader, encodeBool, encodeFloat64, encodeInt, encodeMapHeader, encodeString };
