import { useEffect, useState } from "preact/hooks";

import { Icon } from "@/webview/components/ui/Icons";
import { playPetalHoverTick } from "@/webview/lib/audio";
import { aheadCount, behindCount } from "@/webview/lib/stores/sync.store";
import { disarmWheel, executePetalAction, wheelStyle } from "@/webview/lib/stores/wheel.store";
import { EMBLEM_RADIUS, PETAL_LAYOUT, petalCenters } from "@/webview/utils/hexGeometry";
import type { PetalActionId } from "@/webview/utils/hexGeometry";

import { FGitGraphLogo } from "./FGitGraphLogo";
import { HexagonShape } from "./HexagonShape";
import { MONO_ACTIVE, MONO_BASE_BORDER, PETAL_COLORS, PETAL_ICONS } from "./petalMeta";

type HexWheelBrandEmblemProps = {
  /** `true` ở State 1 (Armed): biểu tượng xoay nhẹ và bao quanh bởi 6 icon tác vụ. */
  armed?: boolean;
  /** Gọi khi nhấp vào logo F-GitGraph trung tâm để mở Cockpit đầy đủ (State 2). */
  onOpenWheel?: () => void;
};

const EMBLEM_SIZE = EMBLEM_RADIUS * 2;

/** Bán kính quỹ đạo (tâm emblem → tâm icon) của 6 icon chức năng ở State 1.
 *  Phải ≥ EMBLEM_RADIUS(14) + IRIS_NODE_RADIUS(13) = 27 để icon không chèn vào emblem. */
const IRIS_ORBIT = 30;
/** Bán kính node lục giác chứa icon ở State 1. */
const IRIS_NODE_RADIUS = 13;
/** Độ dịch xuống của toàn bộ emblem (kèm cụm icon) để tránh bị cắt phần trên. */
const IRIS_OFFSET_Y = 36;
/** Bán kính nền đục (backdrop) bao trùm cụm icon, che chữ đồng bộ phía sau. */
const IRIS_BACKDROP_RADIUS = IRIS_ORBIT + IRIS_NODE_RADIUS + 10;
/** Kích thước vùng hover bao phủ toàn bộ hexagon ngoài cùng (đường kính ngoại tiếp). */
const IRIS_REGION_SIZE = IRIS_BACKDROP_RADIUS * 2;

/** Tọa độ tâm (độ lệch từ tâm emblem) của 6 icon tác vụ ở State 1. */
const irisCenters = petalCenters(IRIS_ORBIT);

/**
 * Biểu tượng nghỉ State 0 của trạm chỉ huy: F-GitGraph Emblem cao đúng 28px trong khung
 * lục giác mỏng, kèm chấm sáng nhịp thở báo hiệu ahead/behind theo thời gian thực.
 *
 * Ở State 1 (Armed), biểu tượng xoay nhẹ 30° và hiện 6 icon tác vụ (Push, Pull, Fetch,
 * Pop, Stash, Refresh) bao quanh, không kèm nhãn chữ. Mỗi icon nằm trong node lục giác
 * nhỏ mang đúng màu Neon của tác vụ tương lai. Nhấp chuột vào một icon vệ tinh sẽ chạy
 * ngay tác vụ Git tương ứng (Quick Mode) và thu gọn về State 0; nhấp vào logo trung tâm
 * sẽ mở Cockpit đầy đủ (State 2).
 *
 * Vùng hover bao phủ toàn bộ hexagon ngoài cùng (`IRIS_REGION_SIZE`) chịu trách nhiệm
 * giữ trạng thái Armed: chỉ khi con trỏ rời hẳn khỏi hexagon bao quanh mới `disarmWheel()`,
 * triệt tiêu hiện tượng tự thoát State 1 khi đang di chuột bên trong vùng hiển thị. Logo
 * trung tâm nằm *bên trong* vùng này (không phải sibling) để việc rê từ vệ tinh vào logo
 * không kích hoạt `mouseleave` làm tắt State 1 — đây là cách duy nhất để chuyển sang
 * State 2 bằng cú nhấp vào logo.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/10_WheelConcepts.md (Mục 4.1 & 4.2).
 */
export function HexWheelBrandEmblem({ armed = false, onOpenWheel }: HexWheelBrandEmblemProps) {
  const isMono = wheelStyle.value === "monochromatic";
  const borderColour = isMono ? MONO_BASE_BORDER : "rgba(168, 85, 247, 0.7)";
  /** Phần tử đang nhận hover ở State 1 (`petal` hoặc `"center"`); dùng để làm mờ
   *  các phần tử còn lại theo hiệu ứng hội tụ trường nét giống State 2/3. */
  const [hoveredId, setHoveredId] = useState<PetalActionId | "center" | null>(null);

  useEffect(() => {
    if (!armed) {
      setHoveredId(null);
    }
  }, [armed]);

  const hasAhead = aheadCount.value > 0;
  const hasBehind = behindCount.value > 0;

  return (
    <span
      data-wheel-emblem
      data-armed={armed ? "true" : undefined}
      class="relative inline-flex select-none items-center justify-center"
      style={{
        width: EMBLEM_SIZE,
        height: EMBLEM_SIZE,
        transition: "transform 0.12s cubic-bezier(0.2, 0, 0, 1)",
        transform: armed ? `translateY(${IRIS_OFFSET_Y}px)` : undefined,
        zIndex: armed ? 50 : undefined
      }}
    >
      <div
        data-iris-region
        class="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: IRIS_REGION_SIZE,
          height: IRIS_REGION_SIZE,
          transform: "translate(-50%, -50%)",
          // Ở State 0 vùng này trong suốt và không chặn tương tác với nội dung phía sau;
          // chỉ ở State 1 mới bắt sự kiện chuột để giữ trạng thái Armed.
          pointerEvents: armed ? "auto" : "none"
        }}
        onMouseLeave={() => {
          setHoveredId(null);
          disarmWheel();
        }}
      >
        {armed && (
          <>
            <HexagonShape
              radius={IRIS_BACKDROP_RADIUS}
              fill="rgba(15, 23, 42, 0.95)"
              stroke={isMono ? MONO_ACTIVE : "rgba(168, 85, 247, 0.55)"}
              strokeWidth={1}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                filter: "drop-shadow(0 0 14px rgba(15, 23, 42, 0.9))",
                pointerEvents: "none"
              }}
            />
            <div
              data-iris
              class="absolute inset-0"
              style={{ animation: "f-gitgraph-iris-arm 0.12s cubic-bezier(0.2, 0, 0, 1)" }}
            >
              {PETAL_LAYOUT.map((petal, index) => {
                const center = irisCenters[index]!;
                const color = isMono ? MONO_ACTIVE : PETAL_COLORS[petal.id];
                const nodeSize = IRIS_NODE_RADIUS * 2;
                const dimmed = hoveredId !== null && hoveredId !== petal.id;
                return (
                  <span
                    key={petal.id}
                    data-iris-icon={petal.id}
                    role="button"
                    tabIndex={0}
                    aria-label={petal.label}
                    class="absolute flex cursor-pointer items-center justify-center"
                    style={{
                      left: IRIS_BACKDROP_RADIUS + center.x - IRIS_NODE_RADIUS,
                      top: IRIS_BACKDROP_RADIUS + center.y - IRIS_NODE_RADIUS,
                      width: nodeSize,
                      height: nodeSize,
                      color,
                      pointerEvents: "auto",
                      opacity: dimmed ? 0.28 : 1,
                      filter: dimmed ? "saturate(0.5)" : undefined
                    }}
                    onMouseEnter={() => {
                      setHoveredId(petal.id);
                      playPetalHoverTick();
                    }}
                    onMouseLeave={() =>
                      setHoveredId((current) => (current === petal.id ? null : current))
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      executePetalAction(petal.id);
                    }}
                  >
                    <HexagonShape
                      radius={IRIS_NODE_RADIUS}
                      stroke={color}
                      strokeWidth={1.5}
                      fill={`${color}26`}
                      style={{
                        position: "absolute",
                        inset: 0,
                        filter: `drop-shadow(0 0 2px ${color})`
                      }}
                    />
                    <Icon>{PETAL_ICONS[petal.id]}</Icon>
                  </span>
                );
              })}
            </div>
          </>
        )}

        <span
          data-wheel-center
          role="button"
          tabIndex={0}
          aria-label="Open command hub"
          class="absolute flex cursor-pointer items-center justify-center"
          style={{
            left: "50%",
            top: "50%",
            width: EMBLEM_SIZE,
            height: EMBLEM_SIZE,
            transform: armed ? "translate(-50%, -50%) rotate(30deg)" : "translate(-50%, -50%)",
            transition: "transform 0.12s cubic-bezier(0.2, 0, 0, 1)"
          }}
          onClick={() => onOpenWheel?.()}
          onMouseEnter={() => setHoveredId("center")}
          onMouseLeave={() => setHoveredId(null)}
        >
          <HexagonShape
            radius={EMBLEM_RADIUS}
            stroke={borderColour}
            strokeWidth={1}
            style={{ position: "absolute", inset: 0 }}
          />
          <FGitGraphLogo size={16} />
        </span>
      </div>

      {hasAhead && (
        <span
          data-pip="ahead"
          class="pointer-events-none absolute"
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#f97316",
            boxShadow: "0 0 5px rgba(249, 115, 22, 0.8)",
            animation: "f-gitgraph-pip-breath 2.4s ease-in-out infinite"
          }}
        />
      )}
      {hasBehind && (
        <span
          data-pip="behind"
          class="pointer-events-none absolute"
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            top: 6,
            right: 2,
            backgroundColor: "#10b981",
            boxShadow: "0 0 5px rgba(16, 185, 129, 0.8)",
            animation: "f-gitgraph-pip-breath 2.4s ease-in-out infinite"
          }}
        />
      )}
    </span>
  );
}
