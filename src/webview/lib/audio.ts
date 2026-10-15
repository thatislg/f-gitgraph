/**
 * Bộ phản hồi âm thanh vi mô (Micro-Acoustics) cho Webview, tổng hợp sóng âm thuần
 * túy qua Web Audio API mà không nạp bất kỳ tệp âm thanh ngoài.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/04_Audio_Feedback_And_Sound_Design.md (Mục 2 & 3).
 */

const COMMIT_FREQUENCIES = [1200, 850] as const;
const COMMIT_DURATION_SECONDS = 0.015;
const COMMIT_PEAK_GAIN = 0.6;

/**
 * Phát âm thanh chốt cơ khí (Mechanical latch click) khi commit thành công: hai bộ dao
 * động sóng sine tần số cao (1200Hz & 850Hz) với phong bì biên độ suy giảm lũy thừa
 * cực nhanh (15ms), mang lại cảm giác chốt khóa cơ học cao cấp.
 */
export function playCommitSound(): void {
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
