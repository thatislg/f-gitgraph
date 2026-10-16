import type { ComponentChildren } from "preact";

/**
 * Khung viền kỹ thuật mang 4 đinh tán chữ thập góc (`+`) theo phong cách Cyber-Lab.
 * Đinh tán là huy hiệu tròn với nền gradient tỏa từ tâm ký tự `+`, tâm đặt đúng giao điểm
 * 4 góc khung. Ở trạng thái nghỉ đinh tán nhỏ và mờ; khi rê chuột vào khung thì phóng to
 * nhẹ (zoom). Viền khung phát sáng Neon theo biến thể: tím (mặc định) hoặc đỏ (cảnh báo).
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
  { pos: "top-0 left-0", transform: "translate(-50%, -50%)" },
  { pos: "top-0 right-0", transform: "translate(50%, -50%)" },
  { pos: "bottom-0 left-0", transform: "translate(-50%, 50%)" },
  { pos: "bottom-0 right-0", transform: "translate(50%, 50%)" }
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
  const isWarning = tone === "warning";

  const colorVar =
    tone === "idle"
      ? "var(--color-cross-neon)"
      : tone === "active"
        ? "var(--color-cross-active)"
        : "var(--color-cross-warning)";

  const gradient = `radial-gradient(circle, ${colorVar} 0%, color-mix(in srgb, ${colorVar} 45%, transparent) 50%, transparent 75%)`;

  // Viền Neon đồng bộ với các panel khác (CommitDetails/CommitRow): tím cho khung thường,
  // đỏ cho modal cảnh báo. Màu tím là lựa chọn hài hòa với các component tím/đen bên trong.
  const borderClass = isWarning ? "border-cross-warning" : "border-cross-active";
  const borderGlow = isWarning
    ? "0 0 10px rgba(239, 68, 68, 0.45), inset 0 0 6px rgba(239, 68, 68, 0.2)"
    : "0 0 10px rgba(168, 85, 247, 0.45), inset 0 0 6px rgba(168, 85, 247, 0.2)";

  return (
    <div
      class={["group relative border", borderClass, className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-active={active}
      style={{ boxShadow: borderGlow }}
    >
      {CROSS_POSITIONS.map(({ pos, transform }) => (
        <span
          key={pos}
          data-cross
          class={`absolute ${pos} flex size-[16px] items-center justify-center rounded-full font-mono text-[14px] font-bold leading-none text-white select-none scale-90 opacity-75 transition-all duration-200 hover:scale-110 hover:opacity-100`}
          style={{ background: gradient, transform }}
        >
          +
        </span>
      ))}
      {children}
    </div>
  );
}
