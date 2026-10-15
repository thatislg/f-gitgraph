import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

import { CornerCrossFrame } from "@/webview/components/ui/CornerCrossFrame";

/**
 * Hộp thoại cảnh báo an toàn trước khi xóa vĩnh viễn dữ liệu chưa commit.
 * Bọc trong `CornerCrossFrame` đinh tán đỏ cảnh báo, ưu tiên tiêu điểm nút Cancel
 * và bẫy phím `Esc` để tránh xóa nhầm mã nguồn.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md (Mục 5).
 */

export type DiscardConfirmModalProps = {
  isOpen: boolean;
  /** Tên tệp cần hủy (khi hủy một tệp), hoặc `null` khi hủy toàn bộ kho. */
  targetFile: string | null;
  isAll: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const FOCUSABLE = "button:not([disabled])";

function trapTab(panel: HTMLElement, event: KeyboardEvent) {
  const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (items.length === 0) {
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];
  if (first === undefined || last === undefined) {
    return;
  }

  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function DiscardConfirmModal({
  isOpen,
  targetFile,
  isAll,
  onConfirm,
  onCancel
}: DiscardConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const message = isAll
    ? "Are you sure you want to discard ALL uncommitted changes in the repository? All untracked files will be permanently deleted."
    : `Are you sure you want to discard all changes in '${targetFile ?? ""}'?`;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        class="fixed inset-0 bg-black/65"
        style={{ backdropFilter: "blur(2px)" }}
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        class="relative z-10 w-dialog"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Tab" && panelRef.current !== null) {
            trapTab(panelRef.current, event);
          }
        }}
      >
        <CornerCrossFrame variant="red" class="bg-menu p-4 text-menu-fg">
          <div class="text-center">
            <p class="font-semibold text-cross-warning">⚠ Permanent data loss. Cannot be undone.</p>
            <p class="mt-2 whitespace-pre-wrap">{message}</p>
            <div class="mt-4 flex justify-center gap-3">
              <button
                ref={cancelRef}
                type="button"
                class="rounded-full border border-line bg-btn px-4 py-1 font-semibold focus:outline-1 focus:outline-focus hover:bg-btn-hover"
                data-action="cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-full border border-transparent bg-cross-warning px-4 py-1 font-semibold text-white focus:outline-1 focus:outline-focus"
                data-action="confirm"
                onClick={onConfirm}
              >
                Discard
              </button>
            </div>
          </div>
        </CornerCrossFrame>
      </div>
    </div>
  );
}
