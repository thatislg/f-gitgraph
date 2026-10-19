import { computed, signal } from "@preact/signals";

/**
 * Kho trạng thái âm thanh phản hồi vi mô (Micro-Acoustics) của thanh công cụ đỉnh.
 * Quản lý trạng thái câm (Mute) toàn cục và đồng bộ bền vững vào `localStorage`.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 3.4).
 */

const STORAGE_KEY = "f-gitgraph.audioMuted";

/** Đọc trạng thái câm ban đầu từ `localStorage`, an toàn trong môi trường headless. */
function readInitialMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Trạng thái tắt/bật toàn bộ âm thanh phản hồi vi mô. */
export const isAudioMuted = signal(readInitialMuted());

/** Tooltip tiếng Anh hiển thị khi rê chuột qua nút chuyển đổi âm thanh. */
export const audioToggleTooltip = computed(() =>
  isAudioMuted.value ? "Unmute audio feedback" : "Mute audio feedback"
);

/** Đảo trạng thái câm và ghi bền vững vào `localStorage`. */
export function toggleAudio(): void {
  isAudioMuted.value = !isAudioMuted.value;
  try {
    localStorage.setItem(STORAGE_KEY, String(isAudioMuted.value));
  } catch {
    // Bỏ qua khi không truy cập được `localStorage` (môi trường headless).
  }
}
