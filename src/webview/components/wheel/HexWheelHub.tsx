import type { CSSProperties } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { openContextMenu } from "@/webview/lib/actions";
import { aheadCount, behindCount, pull, push } from "@/webview/lib/stores/sync.store";
import {
  activePetal,
  activePetalTooltip,
  armWheel,
  closeWheel,
  executePetalAction,
  floatingOrigin,
  focusPetal,
  openWheel,
  wheelDisplayMode,
  wheelStage,
  wheelStyle
} from "@/webview/lib/stores/wheel.store";
import {
  EMBLEM_RADIUS,
  HUB_RADIUS,
  ORBIT_DISTANCE,
  PETAL_LAYOUT,
  PETAL_RADIUS,
  petalCenters
} from "@/webview/utils/hexGeometry";
import type { PetalActionId, Point } from "@/webview/utils/hexGeometry";

import { ContextualPill } from "./ContextualPill";
import { FGitGraphLogo } from "./FGitGraphLogo";
import { HexagonPetal } from "./HexagonPetal";
import { HexagonShape } from "./HexagonShape";
import { HexWheelBrandEmblem } from "./HexWheelBrandEmblem";
import { MONO_ACTIVE, MONO_BASE_BORDER, PETAL_COLORS, PETAL_ICONS } from "./petalMeta";

const GLOW_PADDING = 14;
const HALF = ORBIT_DISTANCE + PETAL_RADIUS + GLOW_PADDING;
const SIZE = HALF * 2;
const EMBLEM_SIZE = EMBLEM_RADIUS * 2;
/** Bán kính hoạt động tối đa bao gồm cả ContextualPill, dùng để chống tràn màn hình. */
const R_MAX = 160;
/** Khoảng cách từ mép cánh hoa đến viên nang ngữ cảnh. */
const PILL_GAP = 12;

type PillPlacement = "top" | "bottom" | "left" | "right";

/** Hướng bung viên nang ngữ cảnh theo từng cánh hoa (hướng tâm ra ngoài, tránh che biểu tượng khác). */
const PILL_PLACEMENT: Record<PetalActionId, PillPlacement> = {
  push: "top",
  pull: "right",
  fetch: "right",
  pop: "bottom",
  stash: "left",
  refresh: "left"
};

/** Tính vị trí tuyệt đối của viên nang ngữ cảnh theo hướng bung, căn giữa trên trục vuông góc. */
function pillStyle(center: Point, placement: PillPlacement): CSSProperties {
  switch (placement) {
    case "top":
      return {
        left: HALF + center.x,
        top: HALF + center.y - PETAL_RADIUS - PILL_GAP,
        transform: "translate(-50%, -100%)"
      };
    case "bottom":
      return {
        left: HALF + center.x,
        top: HALF + center.y + PETAL_RADIUS + PILL_GAP,
        transform: "translate(-50%, 0)"
      };
    case "left":
      return {
        left: HALF + center.x - PETAL_RADIUS - PILL_GAP,
        top: HALF + center.y,
        transform: "translate(-100%, -50%)"
      };
    case "right":
      return {
        left: HALF + center.x + PETAL_RADIUS + PILL_GAP,
        top: HALF + center.y,
        transform: "translateY(-50%)"
      };
  }
}

function petalBadge(id: PetalActionId): { direction: "ahead" | "behind"; count: number } | null {
  if (id === "push" && aheadCount.value > 0) {
    return { direction: "ahead", count: aheadCount.value };
  }
  if (id === "pull" && behindCount.value > 0) {
    return { direction: "behind", count: behindCount.value };
  }
  return null;
}

/** Giới hạn tâm bánh xe trong khung nhìn để bánh xe và viên nang không bị cắt mép. */
function clampOrigin(x: number, y: number): { x: number; y: number } {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  return {
    x: Math.max(R_MAX, Math.min(viewportWidth - R_MAX, x)),
    y: Math.max(R_MAX, Math.min(viewportHeight - R_MAX, y))
  };
}

/** Mở menu ngữ cảnh phân nhánh phụ khi bấm chuột phải lên cánh hoa Pull hoặc Push. */
function handleContextMenu(event: MouseEvent, id: PetalActionId) {
  if (id === "pull") {
    openContextMenu(event, "wheel-pull", [
      {
        title: "Pull (Merge)",
        onClick: () => {
          pull("merge");
          closeWheel();
        }
      },
      {
        title: "Pull (Rebase)",
        onClick: () => {
          pull("rebase");
          closeWheel();
        }
      }
    ]);
  } else if (id === "push") {
    openContextMenu(event, "wheel-push", [
      {
        title: "Push Standard",
        onClick: () => {
          push();
          closeWheel();
        }
      },
      {
        title: "Force Push (with lease)",
        onClick: () => {
          push(true);
          closeWheel();
        }
      }
    ]);
  }
}

/**
 * Trạm chỉ huy bánh xe lục giác 7 nhân: điều phối vòng đời 4 giai đoạn
 * `State 0 → 1 → 2 → 3`, hiệu ứng hội tụ trường nét, menu ngữ cảnh và phím tắt.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 4).
 */
export function HexWheelHub() {
  const dockRef = useRef<HTMLDivElement>(null);
  const stage = wheelStage.value;
  const expanded = stage >= 2;
  const isMono = wheelStyle.value === "monochromatic";
  const isFloating = wheelDisplayMode.value === "floating";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (wheelStage.value >= 2) {
          event.preventDefault();
          closeWheel();
        }
        return;
      }
      if (event.key === " " || event.key === "Spacebar") {
        if (wheelStage.value === 0 || wheelStage.value === 1) {
          event.preventDefault();
          openWheel();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const centers = petalCenters();
  const activeId = activePetal.value;

  const clusterPosition = (() => {
    const base = {
      width: SIZE,
      height: SIZE,
      position: "absolute" as const
    };
    if (isFloating) {
      const origin = clampOrigin(floatingOrigin.value.x, floatingOrigin.value.y);
      return { ...base, position: "fixed" as const, left: origin.x - HALF, top: origin.y - HALF };
    }
    // Chế độ docked: neo tâm bánh xe vào vị trí biểu tượng trên màn hình, nhưng kẹp vào
    // khung nhìn để toàn bộ cụm tổ ong luôn hiển thị đầy đủ (không bị cắt ở góc trái-trên).
    const rect = dockRef.current?.getBoundingClientRect();
    const anchor = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: EMBLEM_SIZE / 2, y: EMBLEM_SIZE / 2 };
    const origin = clampOrigin(anchor.x, anchor.y);
    return { ...base, position: "fixed" as const, left: origin.x - HALF, top: origin.y - HALF };
  })();

  const activeLayoutIndex = activeId === null ? -1 : PETAL_LAYOUT.findIndex((p) => p.id === activeId);
  const activeCenter = activeLayoutIndex >= 0 ? centers[activeLayoutIndex] : undefined;

  return (
    <div ref={dockRef} class="relative inline-flex items-center">
      <span
        data-wheel-trigger
        class="inline-flex"
        onMouseEnter={() => armWheel()}
      >
        <HexWheelBrandEmblem
          armed={stage === 1}
          onOpenWheel={() => {
            if (wheelStage.value === 1) {
              openWheel();
            }
          }}
        />
      </span>

      {expanded && (
        <>
          <div
            data-wheel-scrim
            class="fixed inset-0 z-[70]"
            style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(15, 23, 42, 0.45)" }}
            onClick={() => closeWheel()}
          />

          <div data-wheel-cluster class="z-[80]" style={clusterPosition}>
            <div
              data-wheel-hub
              class="absolute flex cursor-pointer items-center justify-center"
              style={{
                left: HALF - HUB_RADIUS,
                top: HALF - HUB_RADIUS,
                width: HUB_RADIUS * 2,
                height: HUB_RADIUS * 2
              }}
              onClick={() => closeWheel()}
            >
              <HexagonShape
                radius={HUB_RADIUS}
                stroke={isMono ? MONO_BASE_BORDER : "#06b6d4"}
                strokeWidth={2}
                style={{
                  position: "absolute",
                  inset: 0,
                  filter: "drop-shadow(0 0 10px rgba(6, 182, 212, 0.5))"
                }}
              />
              <FGitGraphLogo size={44} />
            </div>

            {PETAL_LAYOUT.map((layout, index) => {
              const center = centers[index]!;
              const id = layout.id;
              const isActive = activeId === id;
              const dimmed = activeId !== null && activeId !== id;
              const colour = isMono ? (isActive ? MONO_ACTIVE : MONO_BASE_BORDER) : PETAL_COLORS[id];

              return (
                <HexagonPetal
                  key={id}
                  id={id}
                  label={layout.label}
                  color={colour}
                  icon={PETAL_ICONS[id]}
                  dimmed={dimmed}
                  isActive={isActive}
                  badge={petalBadge(id)}
                  style={{
                    left: HALF + center.x - PETAL_RADIUS,
                    top: HALF + center.y - PETAL_RADIUS
                  }}
                  onMouseEnter={() => focusPetal(id)}
                  onMouseLeave={() => focusPetal(null)}
                  onClick={() => executePetalAction(id)}
                  onContextMenu={(event) => handleContextMenu(event, id)}
                />
              );
            })}

            {activeId !== null && activeCenter !== undefined && (
              <ContextualPill
                text={activePetalTooltip.value}
                color={isMono ? MONO_ACTIVE : PETAL_COLORS[activeId]}
                style={pillStyle(activeCenter, PILL_PLACEMENT[activeId])}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
