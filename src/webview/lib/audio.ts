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

/**
 * Phát âm thanh chốt cơ khí (Mechanical latch click) khi commit thành công: hai bộ dao
 * động sóng sine tần số cao (1200Hz & 850Hz) với phong bì biên độ suy giảm lũy thừa
 * cực nhanh (15ms), mang lại cảm giác chốt khóa cơ học cao cấp.
 */
export function playCommitSound(): void {
  if (isAudioMuted.value) {
    return;
  }
  const AudioContextCtor = window.AudioContext;
  if (AudioContextCtor === undefined) {
    return;
  }

  const ctx = new AudioContextCtor();
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
  const AudioContextCtor = window.AudioContext;
  if (AudioContextCtor === undefined) {
    return;
  }

  const ctx = new AudioContextCtor();
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
  const AudioContextCtor = window.AudioContext;
  if (AudioContextCtor === undefined) {
    return;
  }

  const ctx = new AudioContextCtor();
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
