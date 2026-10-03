/**
 * Pure JavaScript RFC 1321 MD5 implementation for Webview environment.
 * Zero external dependencies, fully compatible with strict TypeScript.
 */

const K = new Int32Array(64);
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
}

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

function rol(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}

function wordToHex(val: number): string {
  let out = "";
  for (let j = 0; j < 4; j++) {
    const byte = (val >>> (j * 8)) & 0xff;
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

export function md5(str: string): string {
  // 1. Convert string to UTF-8 byte array
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  // 2. Padding
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }

  // Append original length in bits as 64-bit integer (little endian)
  bytes.push(
    bitLength & 0xff,
    (bitLength >>> 8) & 0xff,
    (bitLength >>> 16) & 0xff,
    (bitLength >>> 24) & 0xff
  );
  const highBits = Math.floor(bitLength / 0x100000000);
  bytes.push(
    highBits & 0xff,
    (highBits >>> 8) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 24) & 0xff
  );

  // 3. Convert bytes to 32-bit words
  const words = new Int32Array(bytes.length / 4);
  for (let i = 0; i < bytes.length; i += 4) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const b3 = bytes[i + 3] ?? 0;
    words[i / 4] = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
  }

  // 4. Initial values (RFC 1321)
  let a = 0x67452301 | 0;
  let b = 0xefcdab89 | 0;
  let c = 0x98badcfe | 0;
  let d = 0x10325476 | 0;

  // 5. Process each 16-word block
  for (let block = 0; block < words.length; block += 16) {
    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (bb & cc) | (~bb & dd);
        g = i;
      } else if (i < 32) {
        f = (dd & bb) | (~dd & cc);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = bb ^ cc ^ dd;
        g = (3 * i + 5) % 16;
      } else {
        f = cc ^ (bb | ~dd);
        g = (7 * i) % 16;
      }

      const temp = dd;
      dd = cc;
      cc = bb;
      const wordG = words[block + g] ?? 0;
      const kVal = K[i] ?? 0;
      const sVal = S[i] ?? 0;
      const sum = (aa + f + kVal + wordG) | 0;
      bb = (bb + rol(sum, sVal)) | 0;
      aa = temp;
    }

    a = (a + aa) | 0;
    b = (b + bb) | 0;
    c = (c + cc) | 0;
    d = (d + dd) | 0;
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
}

const gitHubNoReplyRegex = /^(?:(\d+)\+)?([a-zA-Z\d-]{1,39})@users\.noreply\.(.*)$/i;
const avatarCache = new Map<string, string>();

/**
 * Resolves the Git account avatar URL for a commit author, matching GitLens strategy:
 * 1. GitHub noreply address: extracts GitHub user ID / login directly from avatars.githubusercontent.com
 * 2. Standard email address: resolves Gravatar URL with identicon fallback
 * @param email Author or committer email
 * @param size Desired pixel size of the avatar (default: 32)
 */
export function getGitAccountAvatarUrl(
  email: string | undefined,
  size: number = 32
): string | undefined {
  if (!email || email === "*") {
    return undefined;
  }

  const normalized = email.trim().toLowerCase();
  const cacheKey = `${normalized}:${size}`;
  const cached = avatarCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // 1. Check for noreply@github.com
  if (normalized === "noreply@github.com") {
    const url = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
    avatarCache.set(cacheKey, url);
    return url;
  }

  // 2. Check for GitHub noreply format: e.g. 12345+username@users.noreply.github.com or username@users.noreply.github.com
  const ghMatch = gitHubNoReplyRegex.exec(normalized);
  if (ghMatch) {
    const userId = ghMatch[1];
    const login = ghMatch[2];
    const url = userId
      ? `https://avatars.githubusercontent.com/u/${userId}?size=${size}`
      : `https://avatars.githubusercontent.com/${login ?? ""}?size=${size}`;
    avatarCache.set(cacheKey, url);
    return url;
  }

  // 3. Fallback to Gravatar with deterministic identicon
  const hash = md5(normalized);
  const url = `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  avatarCache.set(cacheKey, url);
  return url;
}
