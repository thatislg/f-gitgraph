type SyncBadgeProps = {
  direction: "ahead" | "behind";
  count: number;
};

/**
 * Huy hiệu số đếm commit chênh lệch gắn cạnh nút Pull/Push, phát quang Neon theo ngữ
 * cảnh. Ẩn hoàn toàn khỏi DOM khi `count <= 0`.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 2.2).
 */
export function SyncBadge({ direction, count }: SyncBadgeProps) {
  if (count <= 0) {
    return null;
  }

  const isBehind = direction === "behind";
  const label = isBehind ? `↓ ${count}` : `↑ ${count}`;

  const style = {
    color: isBehind ? "#22d3ee" : "#fbbf24",
    borderColor: isBehind ? "#06b6d4" : "#f59e0b",
    backgroundColor: isBehind ? "rgba(6, 182, 212, 0.15)" : "rgba(245, 158, 11, 0.15)",
    boxShadow: isBehind
      ? "0 0 6px rgba(6, 182, 212, 0.4)"
      : "0 0 6px rgba(245, 158, 11, 0.4)"
  };

  return (
    <span
      data-sync-badge={direction}
      style={style}
      class="inline-flex h-4 items-center rounded-lg border px-1.5 font-mono text-[10px] font-bold leading-none"
    >
      {label}
    </span>
  );
}
