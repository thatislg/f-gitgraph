import { aheadCount, behindCount } from "@/webview/lib/stores/sync.store";
import { wheelStyle } from "@/webview/lib/stores/wheel.store";
import { EMBLEM_RADIUS, PETAL_LAYOUT } from "@/webview/utils/hexGeometry";

import { FGitGraphLogo } from "./FGitGraphLogo";
import { HexagonShape } from "./HexagonShape";
import { MONO_ACTIVE, MONO_BASE_BORDER, PETAL_COLORS } from "./petalMeta";

type HexWheelBrandEmblemProps = {
  /** `true` ở State 1 (Armed): biểu tượng xoay nhẹ và phân rã thành 6 múi rẻ quạt. */
  armed?: boolean;
};

const EMBLEM_SIZE = EMBLEM_RADIUS * 2;

/** Bán kính ngoài của vành 6 múi rẻ quạt ở State 1 (tổng đường kính 36px). */
const IRIS_OUTER = 18;
/** Bán kính trong của vành múi rẻ quạt (bám sát viền biểu tượng 14px). */
const IRIS_INNER = EMBLEM_RADIUS;
/** Khe hở góc (độ) giữa hai múi rẻ quạt liền kề để đọc rõ 6 múi riêng biệt. */
const IRIS_GAP_DEG = 6;

/**
 * Sinh đường path SVG cho một múi rẻ quạt vành khuyên (annular sector) tâm `(0, 0)`,
 * góc tâm `centerDeg`, nửa cung `halfSpanDeg`, bán kính trong `r1` và ngoài `r2`.
 */
function annularSectorPath(centerDeg: number, halfSpanDeg: number, r1: number, r2: number): string {
  const a1 = (centerDeg - halfSpanDeg) * (Math.PI / 180);
  const a2 = (centerDeg + halfSpanDeg) * (Math.PI / 180);
  const o1 = polarPoint(r2, a1);
  const o2 = polarPoint(r2, a2);
  const i2 = polarPoint(r1, a2);
  const i1 = polarPoint(r1, a1);
  const sweep = a2 - a1 > Math.PI ? 1 : 0;
  return [
    `M ${f3(o1.x)} ${f3(o1.y)}`,
    `A ${f3(r2)} ${f3(r2)} 0 ${sweep} 1 ${f3(o2.x)} ${f3(o2.y)}`,
    `L ${f3(i2.x)} ${f3(i2.y)}`,
    `A ${f3(r1)} ${f3(r1)} 0 ${sweep} 0 ${f3(i1.x)} ${f3(i1.y)}`,
    "Z"
  ].join(" ");
}

function polarPoint(radius: number, angle: number): { x: number; y: number } {
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

function f3(n: number): string {
  return n.toFixed(3);
}

/**
 * Biểu tượng nghỉ State 0 của trạm chỉ huy: F-GitGraph Emblem cao đúng 28px trong khung
 * lục giác mỏng, kèm chấm sáng nhịp thở báo hiệu ahead/behind theo thời gian thực.
 *
 * Ở State 1 (Armed), biểu tượng xoay nhẹ 30° và phân rã thành 6 múi rẻ quạt lục giác với
 * vạch màu Neon vi mô tương ứng từng tác vụ tương lai (Cam Push, Xanh Pull, Xanh lơ Fetch,
 * Hồng Pop, Tím Stash, Vàng Refresh).
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 4.1 & 4.2).
 */
export function HexWheelBrandEmblem({ armed = false }: HexWheelBrandEmblemProps) {
  const isMono = wheelStyle.value === "monochromatic";
  const borderColour = isMono ? MONO_BASE_BORDER : "rgba(168, 85, 247, 0.7)";

  const hasAhead = aheadCount.value > 0;
  const hasBehind = behindCount.value > 0;

  const halfSpanDeg = 30 - IRIS_GAP_DEG / 2;
  const irisSize = IRIS_OUTER * 2;

  return (
    <span
      data-wheel-emblem
      data-armed={armed ? "true" : undefined}
      class="relative inline-flex select-none items-center justify-center"
      style={{ width: EMBLEM_SIZE, height: EMBLEM_SIZE }}
    >
      {armed && (
        <svg
          data-iris
          width={irisSize}
          height={irisSize}
          viewBox={`${-IRIS_OUTER} ${-IRIS_OUTER} ${irisSize} ${irisSize}`}
          class="pointer-events-none absolute"
          style={{
            left: (EMBLEM_SIZE - irisSize) / 2,
            top: (EMBLEM_SIZE - irisSize) / 2,
            animation: "f-gitgraph-iris-arm 0.12s cubic-bezier(0.2, 0, 0, 1)"
          }}
          aria-hidden="true"
          focusable="false"
        >
          {PETAL_LAYOUT.map((petal) => {
            const color = isMono ? MONO_ACTIVE : PETAL_COLORS[petal.id];
            return (
              <path
                key={petal.id}
                data-iris-wedge={petal.id}
                d={annularSectorPath(petal.angleDegrees, halfSpanDeg, IRIS_INNER, IRIS_OUTER)}
                fill={color}
                fill-opacity="0.35"
                stroke={color}
                stroke-width="1"
              />
            );
          })}
        </svg>
      )}

      <span
        class="relative inline-flex items-center justify-center"
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
      </span>

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
