import type { ComponentChildren } from "preact";

import type { PetalActionId } from "@/webview/utils/hexGeometry";

/**
 * Metadata trực quan cho 6 cánh hoa: màu viền Neon (Chromatic), nhãn, tooltip tĩnh và
 * biểu tượng SVG. Phong cách Monochromatic chỉ dùng một accent Laser Cyan duy nhất.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 5).
 */

export const MONO_ACTIVE = "#22d3ee";
export const MONO_BASE_BORDER = "#475569";

/** Màu viền Neon Chromatic cho từng cánh hoa. */
export const PETAL_COLORS: Record<PetalActionId, string> = {
  push: "#f97316",
  pull: "#10b981",
  fetch: "#06b6d4",
  pop: "#ec4899",
  stash: "#a855f7",
  refresh: "#eab308"
};

/** Tooltip tĩnh (tiếng Anh) dùng cho thuộc tính `title` của mỗi cánh hoa. */
export const PETAL_TOOLTIPS: Record<PetalActionId, string> = {
  push: "Push commits to upstream",
  pull: "Pull commits from upstream",
  fetch: "Fetch all remotes",
  pop: "Apply and drop latest stash",
  stash: "Save uncommitted changes to stash stack",
  refresh: "Reload commit DAG & graph view"
};

/** Biểu tượng SVG 16x16 cho từng cánh hoa, kế thừa `currentColor`. */
export const PETAL_ICONS: Record<PetalActionId, ComponentChildren> = {
  push: <path d="M8 4l5 5-1.4 1.4L8 6.8 4.4 10.4 3 9z" fill="currentColor" />,
  pull: <path d="M8 12L3 7l1.4-1.4L8 9.2 11.6 5.6 13 7z" fill="currentColor" />,
  fetch: (
    <path d="M8 1.5A6.5 6.5 0 1 1 1.5 8" fill="none" stroke="currentColor" stroke-width="1.5" />
  ),
  pop: (
    <path
      d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2H2zM2 6v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M8 12V8m0 0l-1.5 1.5M8 8l1.5 1.5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    />
  ),
  stash: (
    <path
      d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2H2zM2 6v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M7 9h2"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    />
  ),
  refresh: (
    <path d="M3 8C3 5.23858 5.23858 3 8 3C9.63527 3 11.0878 3.78495 12.0005 5H10C9.72386 5 9.5 5.22386 9.5 5.5C9.5 5.77614 9.72386 6 10 6H12.8904C12.8973 6.00014 12.9041 6.00014 12.911 6H13C13.2761 6 13.5 5.77614 13.5 5.5V2.5C13.5 2.22386 13.2761 2 13 2C12.7239 2 12.5 2.22386 12.5 2.5V4.03138C11.4009 2.78613 9.79253 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.1301 14 13.6999 11.6035 13.9756 8.54488C14.0003 8.26985 13.7975 8.0268 13.5225 8.00202C13.2474 7.97723 13.0044 8.1801 12.9796 8.45512C12.75 11.003 10.6079 13 8 13C5.23858 13 3 10.7614 3 8Z" />
  )
};
