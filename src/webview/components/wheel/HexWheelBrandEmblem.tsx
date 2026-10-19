import { aheadCount, behindCount } from "@/webview/lib/stores/sync.store";
import { wheelStyle } from "@/webview/lib/stores/wheel.store";
import { EMBLEM_RADIUS } from "@/webview/utils/hexGeometry";

import { FGitGraphLogo } from "./FGitGraphLogo";
import { HexagonShape } from "./HexagonShape";
import { MONO_BASE_BORDER } from "./petalMeta";

type HexWheelBrandEmblemProps = {
  /** `true` ở State 1 (Armed): biểu tượng xoay nhẹ để báo hiệu khả năng tương tác. */
  armed?: boolean;
};

const EMBLEM_SIZE = EMBLEM_RADIUS * 2;

/**
 * Biểu tượng nghỉ State 0 của trạm chỉ huy: F-GitGraph Emblem cao đúng 28px trong khung
 * lục giác mỏng, kèm chấm sáng nhịp thở báo hiệu ahead/behind theo thời gian thực.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 4.1).
 */
export function HexWheelBrandEmblem({ armed = false }: HexWheelBrandEmblemProps) {
  const isMono = wheelStyle.value === "monochromatic";
  const borderColour = isMono ? MONO_BASE_BORDER : "rgba(168, 85, 247, 0.7)";

  const hasAhead = aheadCount.value > 0;
  const hasBehind = behindCount.value > 0;

  return (
    <span
      data-wheel-emblem
      data-armed={armed ? "true" : undefined}
      class="relative inline-flex select-none items-center justify-center"
      style={{
        width: EMBLEM_SIZE,
        height: EMBLEM_SIZE,
        transition: "transform 0.12s cubic-bezier(0.2, 0, 0, 1)",
        transform: armed ? "rotate(30deg)" : undefined
      }}
    >
      <HexagonShape
        radius={EMBLEM_RADIUS}
        stroke={borderColour}
        strokeWidth={1}
        style={{ position: "absolute", inset: 0 }}
      />
      <FGitGraphLogo size={16} />
      {hasAhead && (
        <span
          data-pip="ahead"
          class="pointer-events-none absolute"
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#f97316",
            boxShadow: "0 0 5px rgba(249, 115, 22, 0.8)",
            animation: "f-gitgraph-pip-breath 2.4s ease-in-out infinite"
          }}
        />
      )}
      {hasBehind && (
        <span
          data-pip="behind"
          class="pointer-events-none absolute"
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            top: 6,
            right: 2,
            backgroundColor: "#10b981",
            boxShadow: "0 0 5px rgba(16, 185, 129, 0.8)",
            animation: "f-gitgraph-pip-breath 2.4s ease-in-out infinite"
          }}
        />
      )}
    </span>
  );
}
