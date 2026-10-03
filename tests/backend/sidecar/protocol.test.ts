import { describe, expect, it } from "vitest";

import {
  MsgPackWriter,
  encodeArrayHeader,
  encodeBool,
  encodeFloat64,
  encodeInt,
  encodeMapHeader,
  encodeString
} from "@/extension/sidecar/msgpack";
import {
  Opcode,
  decodeError,
  decodeInitSuccess,
  decodeRangeData,
  encodeFrame,
  encodeInitRequest,
  encodeQueryRange,
  tryDecodeFrame
} from "@/extension/sidecar/protocol";

describe("framing", () => {
  it("encodes ping with empty payload", () => {
    const frame = { opcode: Opcode.HeartbeatPing, sequence: 1, payload: new Uint8Array(0) };
    expect(Array.from(encodeFrame(frame))).toEqual([
      0x05, 0x00, 0x00, 0x00, 0x06, 0x01, 0x00, 0x00, 0x00
    ]);
  });

  it("round-trips through tryDecodeFrame", () => {
    const frame = { opcode: Opcode.RangeData, sequence: 42, payload: new Uint8Array([1, 2, 3]) };
    const decoded = tryDecodeFrame(encodeFrame(frame));
    expect(decoded).not.toBeNull();
    expect(decoded!.opcode).toBe(Opcode.RangeData);
    expect(decoded!.sequence).toBe(42);
    expect(Array.from(decoded!.payload)).toEqual([1, 2, 3]);
  });

  it("returns null for incomplete frame", () => {
    const frame = { opcode: Opcode.RangeData, sequence: 1, payload: new Uint8Array([1, 2, 3]) };
    expect(tryDecodeFrame(encodeFrame(frame).slice(0, 5))).toBeNull();
  });
});

describe("message schemas", () => {
  it("encodes init request", () => {
    // map(1) -> "repoPath" -> "some/repo".
    const expected = [
      0x81, 0xa8, 0x72, 0x65, 0x70, 0x6f, 0x50, 0x61, 0x74, 0x68, 0xa9, 0x73, 0x6f, 0x6d, 0x65,
      0x2f, 0x72, 0x65, 0x70, 0x6f
    ];
    expect(Array.from(encodeInitRequest("some/repo"))).toEqual(expected);
  });

  it("encodes query range", () => {
    // map(2) -> "from" 100, "to" 300.
    expect(Array.from(encodeQueryRange(100, 300))).toEqual([
      0x82, 0xa4, 0x66, 0x72, 0x6f, 0x6d, 0x64, 0xa2, 0x74, 0x6f, 0xcd, 0x01, 0x2c
    ]);
  });

  it("decodes init success", () => {
    const w = new MsgPackWriter();
    encodeMapHeader(w, 3);
    encodeString(w, "commitCount");
    encodeInt(w, 3);
    encodeString(w, "maxLane");
    encodeInt(w, 1);
    encodeString(w, "commits");
    encodeArrayHeader(w, 2);
    encodeString(w, "1111111111111111111111111111111111111111");
    encodeString(w, "2222222222222222222222222222222222222222");

    const result = decodeInitSuccess(w.toUint8Array());
    expect(result.commitCount).toBe(3);
    expect(result.maxLane).toBe(1);
    expect(result.commits).toHaveLength(2);
    expect(result.commits[0]).toBe("1111111111111111111111111111111111111111");
  });

  it("decodes error", () => {
    const w = new MsgPackWriter();
    encodeMapHeader(w, 2);
    encodeString(w, "code");
    encodeInt(w, 2);
    encodeString(w, "message");
    encodeString(w, "chưa khởi tạo kho");

    const result = decodeError(w.toUint8Array());
    expect(result.code).toBe(2);
    expect(result.message).toBe("chưa khởi tạo kho");
  });

  it("decodes range data", () => {
    const w = new MsgPackWriter();
    encodeMapHeader(w, 2);

    encodeString(w, "nodes");
    encodeArrayHeader(w, 1);
    encodeArrayHeader(w, 6);
    encodeFloat64(w, 10);
    encodeFloat64(w, 24);
    encodeInt(w, 0);
    encodeInt(w, 1);
    encodeBool(w, false);
    encodeBool(w, false);

    encodeString(w, "paths");
    encodeArrayHeader(w, 1);
    encodeArrayHeader(w, 2);
    encodeString(w, "M 10 24 L 10 48");
    encodeInt(w, 1);

    const result = decodeRangeData(w.toUint8Array());
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.x).toBe(10);
    expect(result.nodes[0]!.lane).toBe(0);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]!.color).toBe(1);
  });
});
