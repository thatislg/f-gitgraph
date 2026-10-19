/**
 * Bộ phản hồi âm thanh vi mô (Micro-Acoustics) cho Webview, tổng hợp sóng âm thuần
 * túy qua Web Audio API mà không nạp bất kỳ tệp âm thanh ngoài.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/04_Audio_Feedback_And_Sound_Design.md (Mục 2 & 3).
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 3.4).
 */

import { isAudioMuted } from "./stores/audio.store";

const COMMIT_FREQUENCIES = [1200, 850] as const;
const COMMIT_DURATION_SECONDS = 0.015;
const COMMIT_PEAK_GAIN = 0.6;

const PUSH_FREQUENCIES = [523.25, 783.99] as const; // Đô 5 & Sol 5 (quãng 5 đúng).
const PUSH_NOTE_OFFSET_SECONDS = 0.07;
const PUSH_DURATION_SECONDS = 0.19;
const PUSH_PEAK_GAIN = 0.6;

const PULL_START_FREQUENCY = 330;
const PULL_PEAK_FREQUENCY = 440;
const PULL_DURATION_SECONDS = 0.12;
const PULL_PEAK_GAIN = 0.5;

const SWITCH_START_FREQUENCY = 440;
const SWITCH_PEAK_FREQUENCY = 880;
const SWITCH_DURATION_SECONDS = 0.06;
const SWITCH_PEAK_GAIN = 0.35;

const TICK_FREQUENCY = 1200;
const TICK_DURATION_SECONDS = 0.015;
const TICK_PEAK_GAIN = 0.05;

const ERROR_FREQUENCY = 180;
const ERROR_DURATION_SECONDS = 0.18;
const ERROR_PEAK_GAIN = 0.3;

const SIDEBAR_COLLAPSE_START = 380;
const SIDEBAR_COLLAPSE_END = 220;
const SIDEBAR_EXPAND_START = 220;
const SIDEBAR_EXPAND_END = 380;
const SIDEBAR_TOGGLE_DURATION_SECONDS = 0.04;
const SIDEBAR_TOGGLE_PEAK_GAIN = 0.25;

const MICRO_HAPTIC_FREQUENCY = 1400;
const MICRO_HAPTIC_DURATION_SECONDS = 0.006;
const MICRO_HAPTIC_PEAK_GAIN = 0.08;

// --- Bản tổng hợp cũ (comment để dễ revert) ---
// const PETAL_HOVER_START_FREQUENCY = 2000;
// const PETAL_HOVER_END_FREQUENCY = 600;
// const PETAL_HOVER_DURATION_SECONDS = 0.014;
// const PETAL_HOVER_PEAK_GAIN = 0.3;

let wheelTurnAudio: HTMLAudioElement | null = null;

/**
 * Phát tiếng xoay bánh xe khi rê chuột qua một cánh hoa ở State 3.
 *
 * Bản cũ (tổng hợp sóng vuông) được comment lại để dễ revert:
 * ```ts
 * playFrequencySweep(
 *   PETAL_HOVER_START_FREQUENCY,
 *   PETAL_HOVER_END_FREQUENCY,
 *   PETAL_HOVER_DURATION_SECONDS,
 *   PETAL_HOVER_PEAK_GAIN,
 *   "square"
 * );
 * ```
 */
export function playPetalHoverTick(): void {
  if (isAudioMuted.value) {
    return;
  }

  const url = window.__WHEELTURN_AUDIO_URL__;
  if (url === undefined) {
    return;
  }
  if (wheelTurnAudio === null) {
    wheelTurnAudio = new Audio(url);
    wheelTurnAudio.preload = "auto";
  }
  wheelTurnAudio.currentTime = 0;
  void wheelTurnAudio.play().catch(() => {});
}

const IRIS_OPEN_START_FREQUENCY = 380;
const IRIS_OPEN_END_FREQUENCY = 760;
const IRIS_OPEN_DURATION_SECONDS = 0.07;
const IRIS_OPEN_PEAK_GAIN = 0.12;

const IRIS_CLOSE_START_FREQUENCY = 620;
const IRIS_CLOSE_END_FREQUENCY = 240;
const IRIS_CLOSE_DURATION_SECONDS = 0.055;
const IRIS_CLOSE_PEAK_GAIN = 0.12;

let sharedContext: AudioContext | null = null;

/**
 * Lấy `AudioContext` dùng chung duy nhất cho toàn bộ Webview. Việc tái sử dụng một
 * context (thay vì tạo mới mỗi lần phát) tránh chạm giới hạn số context đồng thời của
 * trình duyệt — nguyên nhân khiến âm thanh "lúc có lúc không" — đồng thời tự `resume()`
 * khi context đang bị tạm ngưng bởi chính sách autoplay.
 */
function getAudioContext(): AudioContext | null {
  const AudioContextCtor = window.AudioContext;
  if (AudioContextCtor === undefined) {
    return null;
  }
  if (sharedContext === null) {
    sharedContext = new AudioContextCtor();
  }
  if (sharedContext.state === "suspended") {
    void sharedContext.resume();
  }
  return sharedContext;
}

/**
 * Mở khóa chính sách autoplay: trình duyệt khởi tạo `AudioContext` ở trạng thái
 * `suspended` và chỉ cho phép `resume()` trong phạm vi một cử chỉ người dùng. Các âm
 * thanh hover (không phải cử chỉ) sẽ rớt nếu context chưa từng được resume. Đăng ký
 * listener một lần để khởi tạo/resume context ngay ở cử chỉ đầu tiên (click hoặc phím).
 */
function installAudioUnlock(): void {
  if (typeof document === "undefined") {
    return;
  }
  const unlock = () => {
    getAudioContext();
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}

installAudioUnlock();

/**
 * Bộ trợ giúp phát một nốt sine đơn giản lướt tần số từ `from` đến `to` trong `duration`
 * giây. Dùng chung cho các hiệu ứng vi mô ngắn (chốt công tắc, thu gọn sidebar, lỗi).
 */
function playFrequencySweep(
  from: number,
  to: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = "sine"
): void {
  if (isAudioMuted.value) {
    return;
  }
  const ctx = getAudioContext();
  if (ctx === null) {
    return;
  }

  const start = ctx.currentTime;
  const end = start + duration;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, end);

  gain.gain.setValueAtTime(peakGain, start);
  gain.gain.exponentialRampToValueAtTime(0.001, end);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(start);
  oscillator.stop(end);
}

/** Phát âm thanh chốt công tắc cơ học (440Hz → 880Hz) khi checkout nhánh thành công. */
export function playSwitch(): void {
  playFrequencySweep(SWITCH_START_FREQUENCY, SWITCH_PEAK_FREQUENCY, SWITCH_DURATION_SECONDS, SWITCH_PEAK_GAIN);
}

/** Phát âm thanh tích tắc vi mô 1200Hz (âm lượng nhỏ) khi định vị commit trên đồ thị. */
export function playTick(): void {
  playFrequencySweep(TICK_FREQUENCY, TICK_FREQUENCY, TICK_DURATION_SECONDS, TICK_PEAK_GAIN);
}

/** Phát âm thanh cảnh báo lỗi tần số thấp khi một tác vụ Git thất bại. */
export function playError(): void {
  playFrequencySweep(ERROR_FREQUENCY, ERROR_FREQUENCY, ERROR_DURATION_SECONDS, ERROR_PEAK_GAIN, "square");
}

/** Phát âm thanh lật trang tài liệu khi thao tác stash thành công. */
export function playStash(): void {
  playFrequencySweep(520, 680, 0.06, 0.2, "triangle");
}

/** Phát âm thanh chốt trượt giảm tần số (380Hz → 220Hz) khi thu gọn Sidebar. */
export function playSidebarCollapse(): void {
  playFrequencySweep(SIDEBAR_COLLAPSE_START, SIDEBAR_COLLAPSE_END, SIDEBAR_TOGGLE_DURATION_SECONDS, SIDEBAR_TOGGLE_PEAK_GAIN);
}

/** Phát âm thanh chốt trượt tăng tần số (220Hz → 380Hz) khi mở rộng Sidebar. */
export function playSidebarExpand(): void {
  playFrequencySweep(SIDEBAR_EXPAND_START, SIDEBAR_EXPAND_END, SIDEBAR_TOGGLE_DURATION_SECONDS, SIDEBAR_TOGGLE_PEAK_GAIN);
}

/**
 * Phát xung xúc giác vi mô siêu ngắn (6ms, 1400Hz) khi bánh xe chuyển State 0 → 1
 * (thức tỉnh màng trập), mang cảm giác chạm tay vào mặt kính bán dẫn.
 */
export function playMicroHapticTick(): void {
  playFrequencySweep(MICRO_HAPTIC_FREQUENCY, MICRO_HAPTIC_FREQUENCY, MICRO_HAPTIC_DURATION_SECONDS, MICRO_HAPTIC_PEAK_GAIN);
}

// --- Bản tổng hợp cũ (comment để dễ revert) ---
// export function playPetalHoverTick(): void {
//   playFrequencySweep(
//     PETAL_HOVER_START_FREQUENCY,
//     PETAL_HOVER_END_FREQUENCY,
//     PETAL_HOVER_DURATION_SECONDS,
//     PETAL_HOVER_PEAK_GAIN,
//     "square"
//   );
// }

/** Phát âm thanh quét tần số tăng (380Hz → 760Hz) khi bánh xe bung mở State 1 → 2. */
export function playIrisShutterOpen(): void {
  playFrequencySweep(IRIS_OPEN_START_FREQUENCY, IRIS_OPEN_END_FREQUENCY, IRIS_OPEN_DURATION_SECONDS, IRIS_OPEN_PEAK_GAIN);
}

/** Phát âm thanh quét tần số giảm (620Hz → 240Hz) khi bánh xe thu gọn về State 0. */
export function playIrisShutterClose(): void {
  playFrequencySweep(IRIS_CLOSE_START_FREQUENCY, IRIS_CLOSE_END_FREQUENCY, IRIS_CLOSE_DURATION_SECONDS, IRIS_CLOSE_PEAK_GAIN);
}

/**
 * Phát âm thanh chốt cơ khí (Mechanical latch click) khi commit thành công: hai bộ dao
 * động sóng sine tần số cao (1200Hz & 850Hz) với phong bì biên độ suy giảm lũy thừa
 * cực nhanh (15ms), mang lại cảm giác chốt khóa cơ học cao cấp.
 */
export function playCommitSound(): void {
  if (isAudioMuted.value) {
    return;
  }
  const ctx = getAudioContext();
  if (ctx === null) {
    return;
  }

  const start = ctx.currentTime;
  const end = start + COMMIT_DURATION_SECONDS;

  for (const frequency of COMMIT_FREQUENCIES) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(COMMIT_PEAK_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(0.001, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(start);
    oscillator.stop(end);
  }
}

/**
 * Phát âm thanh thăng hoa quãng 5 (Leica Push Success) khi push thành công: hai bộ dao
 * động sóng sine (Đô 5 & Sol 5) chồng lấn lệch pha 70ms, phong bì suy giảm mềm sau 190ms.
 */
export function playPushSuccessSound(): void {
  if (isAudioMuted.value) {
    return;
  }
  const ctx = getAudioContext();
  if (ctx === null) {
    return;
  }

  const start = ctx.currentTime;
  const end = start + PUSH_DURATION_SECONDS;

  PUSH_FREQUENCIES.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const noteStart = start + index * PUSH_NOTE_OFFSET_SECONDS;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, noteStart);

    gain.gain.setValueAtTime(0.001, noteStart);
    gain.gain.exponentialRampToValueAtTime(PUSH_PEAK_GAIN, noteStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(noteStart);
    oscillator.stop(end);
  });
}

/**
 * Phát âm thanh gợn sóng dữ liệu (Pull success) khi pull thành công: bộ dao động sóng
 * Triangle với quỹ đạo tần số trượt parabol 330Hz → 440Hz → 330Hz trong 120ms.
 */
export function playPullSuccessSound(): void {
  if (isAudioMuted.value) {
    return;
  }
  const ctx = getAudioContext();
  if (ctx === null) {
    return;
  }

  const start = ctx.currentTime;
  const end = start + PULL_DURATION_SECONDS;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(PULL_START_FREQUENCY, start);
  // Quỹ đạo parabol: lướt lên đỉnh giữa khoảng rồi trượt êm về tần số khởi điểm.
  oscillator.frequency.exponentialRampToValueAtTime(PULL_PEAK_FREQUENCY, start + PULL_DURATION_SECONDS / 2);
  oscillator.frequency.exponentialRampToValueAtTime(PULL_START_FREQUENCY, end);

  gain.gain.setValueAtTime(PULL_PEAK_GAIN, start);
  gain.gain.exponentialRampToValueAtTime(0.001, end);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(start);
  oscillator.stop(end);
}
