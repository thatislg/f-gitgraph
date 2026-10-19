import type { CSSProperties } from "preact";

import { hexagonPoints } from "@/webview/utils/hexGeometry";

type HexagonShapeProps = {
  radius: number;
  className?: string;
  strokeWidth?: number;
  fill?: string;
  stroke?: string;
  style?: CSSProperties;
};

/**
 * Lục giác đều đỉnh nhọn được vẽ dưới dạng SVG `<polygon>` trong hệ tọa độ gốc tại tâm.
 * Phần tử cha định vị SVG này bằng `transform`/`left`/`top` để tạo cụm tổ ong 7 nhân.
 */
export function HexagonShape({
  radius,
  className,
  strokeWidth = 1.5,
  fill = "none",
  stroke = "currentColor",
  style
}: HexagonShapeProps) {
  const size = radius * 2;
  const pad = strokeWidth + 1;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-radius - pad} ${-radius - pad} ${size + pad * 2} ${size + pad * 2}`}
      class={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points={hexagonPoints(radius)}
        fill={fill}
        stroke={stroke}
        stroke-width={strokeWidth}
        stroke-linejoin="round"
      />
    </svg>
  );
}
