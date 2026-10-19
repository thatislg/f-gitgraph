import { computed, signal } from "@preact/signals";

import type { WheelStyle } from "@/types";
import { refresh } from "@/webview/lib/actions";
import {
  playIrisShutterClose,
  playIrisShutterOpen,
  playMicroHapticTick,
  playPetalHoverTick
} from "@/webview/lib/audio";
import {
  aheadCount,
  behindCount,
  fetch as fetchAll,
  pop,
  pull,
  push,
  stash
} from "@/webview/lib/stores/sync.store";
import type { PetalActionId } from "@/webview/utils/hexGeometry";

/**
 * Kho trạng thái phản ứng của trạm chỉ huy bánh xe lục giác, mô hình hóa vòng đời 4
 * giai đoạn `State 0 → 1 → 2 → 3` bằng Preact Signals và ủy thác hành động mạng về
 * `sync.store.ts`.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 7).
 */

export type WheelStage = 0 | 1 | 2 | 3;
export type WheelDisplayMode = "docked" | "floating";

/** Trạng thái vòng đời 4 giai đoạn của bánh xe điều khiển. */
export const wheelStage = signal<WheelStage>(0);
/** Định danh cánh hoa đang nhận tiêu điểm hover, hoặc `null`. */
export const activePetal = signal<PetalActionId | null>(null);
/** Phong cách thẩm mỹ hiển thị (đọc từ cấu hình người dùng). */
export const wheelStyle = signal<WheelStyle>("chromatic");
/** Chế độ hiển thị của bánh xe: gắn thanh đỉnh hoặc nổi tại con trỏ. */
export const wheelDisplayMode = signal<WheelDisplayMode>("docked");
/** Tọa độ điểm neo tâm bánh xe khi ở chế độ Floating HUD. */
export const floatingOrigin = signal<{ x: number; y: number }>({ x: 0, y: 0 });
/** Đánh dấu menu ngữ cảnh phân nhánh (Pull/Push) đang mở. */
export const isSecondaryMenuOpen = signal(false);

// --- Tín hiệu dẫn xuất (Computed Signals) ---

/** `true` khi bánh xe đang ở trạng thái Armed (State 1). */
export const isWheelArmed = computed(() => wheelStage.value === 1);

/** `true` khi bánh xe đang bung mở (State 2 hoặc State 3). */
export const isWheelExpanded = computed(() => wheelStage.value >= 2);

/**
 * `true` khi cánh hoa `id` bị giảm độ mờ bởi hiệu ứng hội tụ trường nét: chỉ xảy ra ở
 * State 3 khi một cánh hoa khác đang được hover.
 */
export function isPetalDimmed(id: PetalActionId): boolean {
  return wheelStage.value === 3 && activePetal.value !== null && activePetal.value !== id;
}

/** Trích xuất chuỗi thông báo ngữ cảnh chi tiết cho cánh hoa đang active. */
export const activePetalTooltip = computed<string | null>(() => {
  switch (activePetal.value) {
    case "pull":
      return behindCount.value > 0
        ? `↓ ${behindCount.value} commit${behindCount.value === 1 ? "" : "s"} to pull`
        : "Working tree up to date";
    case "push":
      return aheadCount.value > 0
        ? `↑ ${aheadCount.value} commit${aheadCount.value === 1 ? "" : "s"} to push`
        : "Nothing to push";
    case "fetch":
      return "Fetch all remotes";
    case "stash":
      return "Save uncommitted changes to stash stack";
    case "pop":
      return "Apply and drop latest stash@{0}";
    case "refresh":
      return "Reload commit DAG & graph view";
    default:
      return null;
  }
});

// --- Bộ điều phối hành động (Action Dispatchers) ---

/** Chuyển `wheelStage` từ 0 sang 1, phát xung xúc giác vi mô. */
export function armWheel(): void {
  if (wheelStage.value !== 0) {
    return;
  }
  wheelStage.value = 1;
  playMicroHapticTick();
}

/** Chuyển `wheelStage` từ 1 về 0 khi chuột rời khỏi vùng kích hoạt. */
export function disarmWheel(): void {
  if (wheelStage.value !== 1) {
    return;
  }
  wheelStage.value = 0;
}

/** Bung mở bánh xe sang State 2, thiết lập tọa độ neo và phát âm thanh mở màng trập. */
export function openWheel(origin?: { x: number; y: number }): void {
  if (origin !== undefined) {
    wheelDisplayMode.value = "floating";
    floatingOrigin.value = origin;
  } else {
    wheelDisplayMode.value = "docked";
  }
  activePetal.value = null;
  isSecondaryMenuOpen.value = false;
  wheelStage.value = 2;
  playIrisShutterOpen();
}

/** Thu gọn bánh xe về State 0, dọn tiêu điểm và menu ngữ cảnh, phát âm thanh đóng. */
export function closeWheel(): void {
  if (wheelStage.value === 0) {
    return;
  }
  activePetal.value = null;
  isSecondaryMenuOpen.value = false;
  wheelStage.value = 0;
  playIrisShutterClose();
}

/**
 * Đặt tiêu điểm vào một cánh hoa (State 3) hoặc trả về State 2 khi rê ra khoảng trống.
 */
export function focusPetal(id: PetalActionId | null): void {
  if (id !== null) {
    if (wheelStage.value !== 2 && wheelStage.value !== 3) {
      return;
    }
    wheelStage.value = 3;
    activePetal.value = id;
    playPetalHoverTick();
  } else {
    wheelStage.value = 2;
    activePetal.value = null;
  }
}

/** Thực thi tác vụ Git tương ứng rồi tự động thu gọn bánh xe về State 0. */
export function executePetalAction(id: PetalActionId): void {
  switch (id) {
    case "push":
      push();
      break;
    case "pull":
      pull("merge");
      break;
    case "fetch":
      fetchAll(true);
      break;
    case "stash":
      stash();
      break;
    case "pop":
      pop();
      break;
    case "refresh":
      refresh();
      break;
  }
  closeWheel();
}
