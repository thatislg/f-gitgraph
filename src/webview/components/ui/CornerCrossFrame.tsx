import type { ComponentChildren } from "preact";

/**
 * Khung viền kỹ thuật mang 4 đinh tán chữ thập góc (`+`) theo phong cách Cyber-Lab.
 * Đinh tán nằm đúng tại 4 góc khung, mỗi đinh tán là một huy hiệu vuông Neon phát quang
 * chứa ký tự `+` trắng đậm để nổi bật trên nền tối. Màu nền huy hiệu chuyển theo trạng
 * thái: xanh lá Neon (idle), tím Neon (active), đỏ (cảnh báo).
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
  "top-0 left-0",
  "top-0 right-0",
  "bottom-0 left-0",
  "bottom-0 right-0"
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

  const plateClass =
    tone === "idle"
      ? "bg-cross-neon"
      : tone === "active"
        ? "bg-cross-active"
        : "bg-cross-warning";

  const glow =
    tone === "active"
      ? "drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))"
      : tone === "warning"
        ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))"
        : "drop-shadow(0 0 6px rgba(16, 185, 129, 0.8))";

  return (
    <div
      class={["group relative border border-line", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-active={active}
    >
      {CROSS_POSITIONS.map((position) => (
        <span
          key={position}
          data-cross
          class={`absolute ${position} flex size-[18px] items-center justify-center rounded-[2px] font-mono text-[14px] font-bold leading-none text-white select-none pointer-events-none ${plateClass}`}
          style={{ filter: glow }}
        >
          +
        </span>
      ))}
      {children}
    </div>
  );
}
