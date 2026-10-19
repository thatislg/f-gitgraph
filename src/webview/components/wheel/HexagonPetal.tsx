import type { ComponentChildren, CSSProperties } from "preact";

import { Icon } from "@/webview/components/ui/Icons";
import { PETAL_RADIUS } from "@/webview/utils/hexGeometry";
import type { PetalActionId } from "@/webview/utils/hexGeometry";

import { HexagonShape } from "./HexagonShape";

type HexagonPetalProps = {
  id: PetalActionId;
  label: string;
  color: string;
  icon: ComponentChildren;
  dimmed?: boolean;
  isActive?: boolean;
  badge?: { direction: "ahead" | "behind"; count: number } | null;
  style?: CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  onContextMenu?: (event: MouseEvent) => void;
};

/**
 * Cánh hoa lục giác đơn lẻ: khung lục giác phát quang Neon, biểu tượng, nhãn Monospace
 * và huy hiệu số đếm gắn góc. Hỗ trợ hiệu ứng hội tụ trường nét (dimming) ở State 3.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 4.3 & 4.4).
 */
export function HexagonPetal({
  id,
  label,
  color,
  icon,
  dimmed = false,
  isActive = false,
  badge = null,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onContextMenu
}: HexagonPetalProps) {
  const size = PETAL_RADIUS * 2;

  return (
    <div
      data-petal={id}
      role="button"
      tabIndex={0}
      class="absolute flex cursor-pointer items-center justify-center"
      style={{
        width: size,
        height: size,
        ...style,
        opacity: dimmed ? 0.28 : 1,
        filter: dimmed ? "saturate(0.5)" : undefined
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <HexagonShape
        radius={PETAL_RADIUS}
        stroke={color}
        strokeWidth={isActive ? 2 : 1.5}
        fill={isActive ? `${color}2e` : "none"}
        style={{
          position: "absolute",
          inset: 0,
          filter: isActive ? `drop-shadow(0px 0px 12px ${color})` : undefined
        }}
      />
      <span class="pointer-events-none flex flex-col items-center gap-0.5" style={{ color }}>
        <Icon>{icon}</Icon>
        <span class="font-mono text-[9px] font-bold leading-none">{label}</span>
      </span>
      {badge !== null && badge.count > 0 && (
        <span
          data-petal-badge={badge.direction}
          class="pointer-events-none absolute rounded-lg px-1 font-mono text-[9px] font-bold leading-none"
          style={{
            top: 4,
            right: 2,
            color: badge.direction === "behind" ? "#ffffff" : "#ffffff",
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`
          }}
        >
          {badge.direction === "behind" ? `↓ ${badge.count}` : `↑ ${badge.count}`}
        </span>
      )}
    </div>
  );
}
