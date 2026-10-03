import { describe, expect, it } from "vitest";

import {
  MsgPackReader,
  MsgPackWriter,
  encodeArrayHeader,
  encodeBool,
  encodeFloat64,
  encodeInt,
  encodeMapHeader,
  encodeNil,
  encodeString,
  readArrayHeader,
  readBool,
  readFloat64,
  readInt,
  readMapHeader,
  readString
} from "@/extension/sidecar/msgpack";

const bytes = (w: MsgPackWriter): number[] => Array.from(w.toUint8Array());

describe("msgpack encoding (đồng bộ với F#)", () => {
  it("encodes positive fixint", () => {
    const w = new MsgPackWriter();
    encodeInt(w, 42);
    expect(bytes(w)).toEqual([0x2a]);
  });

  it("encodes negative fixint", () => {
    const w = new MsgPackWriter();
    encodeInt(w, -1);
    expect(bytes(w)).toEqual([0xff]);
  });

  it("encodes uint16 and uint32", () => {
    const w = new MsgPackWriter();
    encodeInt(w, 1000);
    expect(bytes(w)).toEqual([0xcd, 0x03, 0xe8]);

    const w2 = new MsgPackWriter();
    encodeInt(w2, 100000);
    expect(bytes(w2)).toEqual([0xce, 0x00, 0x01, 0x86, 0xa0]);
  });

  it("encodes fixstr", () => {
    const w = new MsgPackWriter();
    encodeString(w, "ready");
    expect(bytes(w)).toEqual([0xa5, 0x72, 0x65, 0x61, 0x64, 0x79]);
  });

  it("encodes bool and nil", () => {
    const w = new MsgPackWriter();
    encodeBool(w, true);
    expect(bytes(w)).toEqual([0xc3]);

    const w2 = new MsgPackWriter();
    encodeNil(w2);
    expect(bytes(w2)).toEqual([0xc0]);
  });

  it("encodes float64", () => {
    const w = new MsgPackWriter();
    encodeFloat64(w, 1.5);
    expect(bytes(w)).toEqual([0xcb, 0x3f, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  });

  it("round-trips int string bool", () => {
    const w = new MsgPackWriter();
    encodeInt(w, 123456);
    encodeString(w, "tiếng Việt 🚀");
    encodeBool(w, false);
    const r = new MsgPackReader(w.toUint8Array());
    expect(readInt(r)).toBe(123456);
    expect(readString(r)).toBe("tiếng Việt 🚀");
    expect(readBool(r)).toBe(false);
  });

  it("round-trips array header and float", () => {
    const w = new MsgPackWriter();
    encodeArrayHeader(w, 20);
    encodeFloat64(w, -2.5);
    const r = new MsgPackReader(w.toUint8Array());
    expect(readArrayHeader(r)).toBe(20);
    expect(readFloat64(r)).toBe(-2.5);
  });

  it("round-trips map header", () => {
    const w = new MsgPackWriter();
    encodeMapHeader(w, 3);
    const r = new MsgPackReader(w.toUint8Array());
    expect(readMapHeader(r)).toBe(3);
  });
});
