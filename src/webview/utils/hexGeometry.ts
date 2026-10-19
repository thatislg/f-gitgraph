/**
 * Thư viện hình học lục giác đỉnh nhọn (Pointy-Topped Hexagon) cho trạm chỉ huy bánh
 * xe lục giác (Cyber Hex-Wheel Command Hub). Cung cấp tọa độ 6 đỉnh, tâm 6 cánh hoa và
 * các hằng số kích thước theo đúng đặc tả.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 3).
 */

export type Point = { x: number; y: number };

/** Định danh 6 tác vụ mạng/lưu trữ tương ứng với 6 cánh hoa. */
export type PetalActionId = "push" | "pull" | "fetch" | "pop" | "stash" | "refresh";

const SQRT3_OVER_2 = Math.sqrt(3) / 2;

/** Bán kính ngoại tiếp biểu tượng State 0 (chiều cao 28px). */
export const EMBLEM_RADIUS = 14;
/** Bán kính ngoại tiếp mỗi cánh hoa (State 2 & 3). */
export const PETAL_RADIUS = 34;
/** Bán kính ngoại tiếp Nhân trung tâm (State 2 & 3). */
export const HUB_RADIUS = 38;
/** Khoảng cách quỹ đạo từ tâm hub đến tâm mỗi cánh hoa. */
export const ORBIT_DISTANCE = 76;

/**
 * Tọa độ 6 đỉnh của lục giác đều đỉnh nhọn tâm `(0, 0)`, bán kính ngoại tiếp `radius`,
 * bắt đầu từ đỉnh Bắc (North) rồi tiến theo chiều kim đồng hồ.
 */
export function hexagonVertices(radius: number): Point[] {
  return [
    { x: 0, y: -radius },
    { x: radius * SQRT3_OVER_2, y: -radius / 2 },
    { x: radius * SQRT3_OVER_2, y: radius / 2 },
    { x: 0, y: radius },
    { x: -radius * SQRT3_OVER_2, y: radius / 2 },
    { x: -radius * SQRT3_OVER_2, y: -radius / 2 }
  ];
}

/** Chuỗi điểm SVG `"x,y x,y ..."` dùng cho thuộc tính `points` của `<polygon>`. */
export function hexagonPoints(radius: number, precision = 4): string {
  return hexagonVertices(radius)
    .map((point) => `${point.x.toFixed(precision)},${point.y.toFixed(precision)}`)
    .join(" ");
}

/**
 * Chuyển đổi tọa độ cực (góc tính theo độ, khoảng cách) sang tọa độ Descartes. Góc đo
 * theo chuẩn toán học (0° tại hướng +x, ngược chiều kim đồng hồ), đồng bộ với bảng góc
 * pha của 6 cánh hoa trong thiết kế.
 */
export function polarToCartesian(angleDegrees: number, distance: number): Point {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: distance * Math.cos(radians),
    y: distance * Math.sin(radians)
  };
}

export type PetalLayout = {
  id: PetalActionId;
  label: string;
  angleDegrees: number;
};

/** Bảng bố cục 6 cánh hoa: định danh, nhãn và góc pha theo đúng Mục 3.3. */
export const PETAL_LAYOUT: readonly PetalLayout[] = [
  { id: "push", label: "Push", angleDegrees: 270 },
  { id: "pull", label: "Pull", angleDegrees: 330 },
  { id: "fetch", label: "Fetch", angleDegrees: 30 },
  { id: "pop", label: "Pop", angleDegrees: 90 },
  { id: "stash", label: "Stash", angleDegrees: 150 },
  { id: "refresh", label: "Refresh", angleDegrees: 210 }
];

/** Tọa độ tâm (độ lệch từ tâm hub) của 6 cánh hoa theo thứ tự `PETAL_LAYOUT`. */
export function petalCenters(distance = ORBIT_DISTANCE): Point[] {
  return PETAL_LAYOUT.map((petal) => polarToCartesian(petal.angleDegrees, distance));
}
