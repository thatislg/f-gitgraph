import type { ComponentChildren } from "preact";

/**
 * Khung viền kỹ thuật mang 4 đinh tán chữ thập góc (`+`) theo phong cách Cyber-Lab.
 * Đinh tán được đặt lệch 6px ra ngoài mỗi góc để tâm ký tự trùng khớp giao điểm hai
 * đường viền. Trạng thái bừng sáng được điều khiển bởi `active` và `variant`.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md (Mục 2.1).
 */
export type CornerCrossVariant = "purple" | "red";

export type CornerCrossFrameProps = {
  children?: ComponentChildren;
  /** Bừng sáng tím Neon khi vùng làm việc đang được kích hoạt/tập trung. */
  active?: boolean;
  /** `red` dùng cho modal cảnh báo nguy hiểm (Discard), mặc định `purple`. */
  variant?: CornerCrossVariant;
  class?: string;
};

const CROSS_POSITIONS = [
  "-top-1.5 -left-1.5",
  "-top-1.5 -right-1.5",
  "-bottom-1.5 -left-1.5",
  "-bottom-1.5 -right-1.5"
] as const;

function crossTone(variant: CornerCrossVariant, active: boolean): "idle" | "active" | "warning" {
  return variant === "red" ? "warning" : active ? "active" : "idle";
}

export function CornerCrossFrame({
  children,
  active = false,
  variant = "purple",
  class: className
}: CornerCrossFrameProps) {
  const tone = crossTone(variant, active);

  const toneClass =
    tone === "idle"
      ? "text-cross-idle opacity-50 group-hover:opacity-80"
      : tone === "active"
        ? "text-cross-active opacity-100"
        : "text-cross-warning opacity-100";

  const glow =
    tone === "active"
      ? "drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))"
      : tone === "warning"
        ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))"
        : undefined;

  return (
    <div
      class={["group relative", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-active={active}
    >
      {CROSS_POSITIONS.map((position) => (
        <span
          key={position}
          data-cross
          class={`absolute ${position} font-mono text-[11px] leading-none select-none pointer-events-none ${toneClass}`}
          {...(glow === undefined ? {} : { style: { filter: glow } })}
        >
          +
        </span>
      ))}
      {children}
    </div>
  );
}
