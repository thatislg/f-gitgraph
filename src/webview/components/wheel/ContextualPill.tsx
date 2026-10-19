import type { CSSProperties } from "preact";

type ContextualPillProps = {
  text: string | null;
  color: string;
  style?: CSSProperties;
};

/**
 * Viên nang thông số nổi (Capsule Pill) hiển thị thông tin ngữ cảnh chi tiết bên cạnh
 * cánh hoa đang hover ở State 3. Không render khi `text` rỗng.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 4.4).
 */
export function ContextualPill({ text, color, style }: ContextualPillProps) {
  if (text === null) {
    return null;
  }

  return (
    <div
      data-contextual-pill
      class="pointer-events-none absolute z-20 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold"
      style={{
        ...style,
        color,
        borderColor: color,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        boxShadow: `0 0 10px ${color}`
      }}
    >
      {text}
    </div>
  );
}
