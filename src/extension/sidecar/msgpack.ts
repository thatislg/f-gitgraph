// Mã hóa / giải mã MessagePack (tập con), đồng bộ byte-for-byte với
// src/core-engine/Transport/Transport.fs (module MsgPack).

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export class MsgPackWriter {
  private buf: Uint8Array;
  private len = 0;

  constructor(initial = 256) {
    this.buf = new Uint8Array(initial);
  }

  private ensure(extra: number): void {
    if (this.len + extra <= this.buf.length) {
      return;
    }
    let capacity = this.buf.length * 2;
    while (capacity < this.len + extra) {
      capacity *= 2;
    }
    const next = new Uint8Array(capacity);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }

  byte(b: number): void {
    this.ensure(1);
    this.buf[this.len++] = b & 0xff;
  }

  bytes(bs: Uint8Array): void {
    this.ensure(bs.length);
    this.buf.set(bs, this.len);
    this.len += bs.length;
  }

  toUint8Array(): Uint8Array {
    return this.buf.slice(0, this.len);
  }
}

function writeU16(w: MsgPackWriter, v: number): void {
  w.byte(v >>> 8);
  w.byte(v);
}

function writeU32(w: MsgPackWriter, v: number): void {
  w.byte(v >>> 24);
  w.byte(v >>> 16);
  w.byte(v >>> 8);
  w.byte(v);
}

export function encodeNil(w: MsgPackWriter): void {
  w.byte(0xc0);
}

export function encodeBool(w: MsgPackWriter, b: boolean): void {
  w.byte(b ? 0xc3 : 0xc2);
}

export function encodeInt(w: MsgPackWriter, v: number): void {
  if (v >= 0) {
    if (v <= 0x7f) {
      w.byte(v);
    } else if (v <= 0xff) {
      w.byte(0xcc);
      w.byte(v);
    } else if (v <= 0xffff) {
      w.byte(0xcd);
      writeU16(w, v);
    } else {
      w.byte(0xce);
      writeU32(w, v);
    }
  } else if (v >= -32) {
    w.byte(v & 0xff);
  } else if (v >= -128) {
    w.byte(0xd0);
    w.byte(v & 0xff);
  } else if (v >= -32768) {
    w.byte(0xd1);
    writeU16(w, v & 0xffff);
  } else {
    w.byte(0xd2);
    writeU32(w, v >>> 0);
  }
}

export function encodeFloat64(w: MsgPackWriter, v: number): void {
  w.byte(0xcb);
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, v, false); // big-endian
  for (let i = 0; i < 8; i++) {
    w.byte(dv.getUint8(i));
  }
}

export function encodeString(w: MsgPackWriter, s: string): void {
  const bytes = textEncoder.encode(s);
  const len = bytes.length;
  if (len <= 31) {
    w.byte(0xa0 | len);
  } else if (len <= 0xff) {
    w.byte(0xd9);
    w.byte(len);
  } else if (len <= 0xffff) {
    w.byte(0xda);
    writeU16(w, len);
  } else {
    w.byte(0xdb);
    writeU32(w, len);
  }
  w.bytes(bytes);
}

export function encodeArrayHeader(w: MsgPackWriter, count: number): void {
  if (count <= 15) {
    w.byte(0x90 | count);
  } else if (count <= 0xffff) {
    w.byte(0xdc);
    writeU16(w, count);
  } else {
    w.byte(0xdd);
    writeU32(w, count);
  }
}

export function encodeMapHeader(w: MsgPackWriter, count: number): void {
  if (count <= 15) {
    w.byte(0x80 | count);
  } else if (count <= 0xffff) {
    w.byte(0xde);
    writeU16(w, count);
  } else {
    w.byte(0xdf);
    writeU32(w, count);
  }
}

export class MsgPackReader {
  private pos = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readByte(): number {
    if (this.pos >= this.bytes.length) {
      throw new Error("đọc quá giới hạn MessagePack");
    }
    return this.bytes[this.pos++]!;
  }

  readBytes(count: number): Uint8Array {
    if (this.pos + count > this.bytes.length) {
      throw new Error("đọc quá giới hạn MessagePack");
    }
    const result = this.bytes.subarray(this.pos, this.pos + count);
    this.pos += count;
    return result;
  }
}

function readU16(r: MsgPackReader): number {
  return (r.readByte() << 8) | r.readByte();
}

function readU32(r: MsgPackReader): number {
  return ((r.readByte() << 24) | (r.readByte() << 16) | (r.readByte() << 8) | r.readByte()) >>> 0;
}

export function readInt(r: MsgPackReader): number {
  const b = r.readByte();
  if (b <= 0x7f) {
    return b;
  }
  if (b >= 0xe0) {
    return b - 0x100; // negative fixint
  }
  switch (b) {
    case 0xcc:
      return r.readByte();
    case 0xcd:
      return readU16(r);
    case 0xce:
      return readU32(r);
    case 0xcf:
      throw new Error("uint64 không hỗ trợ");
    case 0xd0: {
      const v = r.readByte();
      return v >= 0x80 ? v - 0x100 : v;
    }
    case 0xd1: {
      const v = readU16(r);
      return v >= 0x8000 ? v - 0x10000 : v;
    }
    case 0xd2: {
      const v = readU32(r);
      return v >= 0x80000000 ? v - 0x100000000 : v;
    }
    case 0xd3:
      throw new Error("int64 không hỗ trợ");
    default:
      throw new Error("mã số nguyên MessagePack không hợp lệ");
  }
}

export function readFloat64(r: MsgPackReader): number {
  if (r.readByte() !== 0xcb) {
    throw new Error("mong đợi float64 trong MessagePack");
  }
  const dv = new DataView(new ArrayBuffer(8));
  for (let i = 0; i < 8; i++) {
    dv.setUint8(i, r.readByte());
  }
  return dv.getFloat64(0, false);
}

export function readBool(r: MsgPackReader): boolean {
  const b = r.readByte();
  if (b === 0xc2) {
    return false;
  }
  if (b === 0xc3) {
    return true;
  }
  throw new Error("mong đợi bool trong MessagePack");
}

export function readString(r: MsgPackReader): string {
  const b = r.readByte();
  let len: number;
  if (b >= 0xa0 && b <= 0xbf) {
    len = b & 0x1f;
  } else if (b === 0xd9) {
    len = r.readByte();
  } else if (b === 0xda) {
    len = readU16(r);
  } else if (b === 0xdb) {
    len = readU32(r);
  } else {
    throw new Error("mong đợi chuỗi trong MessagePack");
  }
  return textDecoder.decode(r.readBytes(len));
}

export function readArrayHeader(r: MsgPackReader): number {
  const b = r.readByte();
  if (b >= 0x90 && b <= 0x9f) {
    return b & 0x0f;
  }
  if (b === 0xdc) {
    return readU16(r);
  }
  if (b === 0xdd) {
    return readU32(r);
  }
  throw new Error("mong đợi mảng trong MessagePack");
}

export function readMapHeader(r: MsgPackReader): number {
  const b = r.readByte();
  if (b >= 0x80 && b <= 0x8f) {
    return b & 0x0f;
  }
  if (b === 0xde) {
    return readU16(r);
  }
  if (b === 0xdf) {
    return readU32(r);
  }
  throw new Error("mong đợi map trong MessagePack");
}
