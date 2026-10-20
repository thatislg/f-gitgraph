import { Icon } from "@/webview/components/ui/Icons";
import { aheadCount, behindCount } from "@/webview/lib/stores/sync.store";
import { executePetalAction, wheelStyle } from "@/webview/lib/stores/wheel.store";
import { EMBLEM_RADIUS, PETAL_LAYOUT, petalCenters } from "@/webview/utils/hexGeometry";

import { FGitGraphLogo } from "./FGitGraphLogo";
import { HexagonShape } from "./HexagonShape";
import { MONO_ACTIVE, MONO_BASE_BORDER, PETAL_COLORS, PETAL_ICONS } from "./petalMeta";

type HexWheelBrandEmblemProps = {
  /** `true` ở State 1 (Armed): biểu tượng xoay nhẹ và bao quanh bởi 6 icon tác vụ. */
  armed?: boolean;
};

const EMBLEM_SIZE = EMBLEM_RADIUS * 2;

/** Bán kính quỹ đạo (tâm emblem → tâm icon) của 6 icon chức năng ở State 1.
 *  Phải ≥ EMBLEM_RADIUS(14) + IRIS_NODE_RADIUS(13) = 27 để icon không chèn vào emblem. */
const IRIS_ORBIT = 30;
/** Bán kính node lục giác chứa icon ở State 1. */
const IRIS_NODE_RADIUS = 13;
/** Độ dịch xuống của toàn bộ emblem (kèm cụm icon) để tránh bị cắt phần trên. */
const IRIS_OFFSET_Y = 36;
/** Bán kính nền đục (backdrop) bao trùm cụm icon, che chữ đồng bộ phía sau. */
const IRIS_BACKDROP_RADIUS = IRIS_ORBIT + IRIS_NODE_RADIUS + 10;

/** Tọa độ tâm (độ lệch từ tâm emblem) của 6 icon tác vụ ở State 1. */
const irisCenters = petalCenters(IRIS_ORBIT);

/**
 * Biểu tượng nghỉ State 0 của trạm chỉ huy: F-GitGraph Emblem cao đúng 28px trong khung
 * lục giác mỏng, kèm chấm sáng nhịp thở báo hiệu ahead/behind theo thời gian thực.
 *
 * Ở State 1 (Armed), biểu tượng xoay nhẹ 30° và hiện 6 icon tác vụ (Push, Pull, Fetch,
 * Pop, Stash, Refresh) bao quanh, không kèm nhãn chữ. Mỗi icon nằm trong node lục giác
 * nhỏ mang đúng màu Neon của tác vụ tương lai. Nhấp chuột vào một icon vệ tinh sẽ chạy
 * ngay tác vụ Git tương ứng (Quick Mode) và thu gọn về State 0; nhấp vào logo trung tâm
 * sẽ mở Cockpit đầy đủ (State 2).
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 4.1 & 4.2).
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
        transform: armed ? `translateY(${IRIS_OFFSET_Y}px)` : undefined,
        zIndex: armed ? 50 : undefined
      }}
    >
      {armed && (
        <HexagonShape
          radius={IRIS_BACKDROP_RADIUS}
          fill="rgba(15, 23, 42, 0.95)"
          stroke={isMono ? MONO_ACTIVE : "rgba(168, 85, 247, 0.55)"}
          strokeWidth={1}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            filter: "drop-shadow(0 0 14px rgba(15, 23, 42, 0.9))",
            pointerEvents: "none"
          }}
        />
      )}
      {armed && (
        <div
          data-iris
          class="absolute inset-0"
          style={{ animation: "f-gitgraph-iris-arm 0.12s cubic-bezier(0.2, 0, 0, 1)" }}
        >
          {PETAL_LAYOUT.map((petal, index) => {
            const center = irisCenters[index]!;
            const color = isMono ? MONO_ACTIVE : PETAL_COLORS[petal.id];
            const nodeSize = IRIS_NODE_RADIUS * 2;
            return (
              <span
                key={petal.id}
                data-iris-icon={petal.id}
                role="button"
                tabIndex={0}
                aria-label={petal.label}
                class="absolute flex cursor-pointer items-center justify-center"
                style={{
                  left: EMBLEM_RADIUS + center.x - IRIS_NODE_RADIUS,
                  top: EMBLEM_RADIUS + center.y - IRIS_NODE_RADIUS,
                  width: nodeSize,
                  height: nodeSize,
                  color,
                  pointerEvents: "auto"
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  executePetalAction(petal.id);
                }}
              >
                <HexagonShape
                  radius={IRIS_NODE_RADIUS}
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`${color}26`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px ${color})`
                  }}
                />
                <Icon>{PETAL_ICONS[petal.id]}</Icon>
              </span>
            );
          })}
        </div>
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
