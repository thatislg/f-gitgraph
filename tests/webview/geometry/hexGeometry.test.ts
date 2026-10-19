import { describe, expect, it } from "vitest";

import {
  EMBLEM_RADIUS,
  HUB_RADIUS,
  ORBIT_DISTANCE,
  PETAL_LAYOUT,
  PETAL_RADIUS,
  hexagonVertices,
  petalCenters
} from "@/webview/utils/hexGeometry";

const SQRT3_OVER_2 = Math.sqrt(3) / 2;

describe("hexGeometry", () => {
  it("computes 6 pointy-topped vertices for the State 0 emblem (R=14)", () => {
    const vertices = hexagonVertices(EMBLEM_RADIUS);
    expect(vertices).toHaveLength(6);

    expect(vertices[0]!.x).toBeCloseTo(0, 4);
    expect(vertices[0]!.y).toBeCloseTo(-14, 4);

    expect(vertices[1]!.x).toBeCloseTo(14 * SQRT3_OVER_2, 4);
    expect(vertices[1]!.y).toBeCloseTo(-7, 4);

    expect(vertices[3]!.x).toBeCloseTo(0, 4);
    expect(vertices[3]!.y).toBeCloseTo(14, 4);
  });

  it("produces a State 0 height of exactly 28px", () => {
    const ys = hexagonVertices(EMBLEM_RADIUS).map((v) => v.y);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(height).toBeCloseTo(28, 4);
  });

  it("is symmetric across both vertical and horizontal axes", () => {
    const vertices = hexagonVertices(PETAL_RADIUS);
    const sumX = vertices.reduce((acc, v) => acc + v.x, 0);
    const sumY = vertices.reduce((acc, v) => acc + v.y, 0);

    expect(sumX).toBeCloseTo(0, 4);
    expect(sumY).toBeCloseTo(0, 4);
  });

  it("yields only finite coordinates for all radii (14, 34, 38)", () => {
    for (const radius of [EMBLEM_RADIUS, PETAL_RADIUS, HUB_RADIUS]) {
      for (const vertex of hexagonVertices(radius)) {
        expect(Number.isFinite(vertex.x)).toBe(true);
        expect(Number.isFinite(vertex.y)).toBe(true);
      }
    }
  });

  it("positions the 6 petals at exactly the orbit distance of 76px", () => {
    const centers = petalCenters();
    expect(centers).toHaveLength(6);

    for (const center of centers) {
      expect(Math.hypot(center.x, center.y)).toBeCloseTo(ORBIT_DISTANCE, 4);
    }
  });

  it("orders petals push→refresh and anchors push at North, pop at South", () => {
    expect(PETAL_LAYOUT.map((p) => p.id)).toEqual([
      "push",
      "pull",
      "fetch",
      "pop",
      "stash",
      "refresh"
    ]);

    const centers = petalCenters();
    expect(centers[0]!.x).toBeCloseTo(0, 4);
    expect(centers[0]!.y).toBeCloseTo(-76, 4);
    expect(centers[3]!.x).toBeCloseTo(0, 4);
    expect(centers[3]!.y).toBeCloseTo(76, 4);
  });
});
