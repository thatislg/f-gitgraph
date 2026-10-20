import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";

import { Icon } from "@/webview/components/ui/Icons";

import { SyncBadge } from "./SyncBadge";

export type DropdownItem = {
  id: string;
  label: string;
  description: string;
  onSelect: () => void;
};

type ToolbarDropdownButtonProps = {
  icon: ComponentChildren;
  label: string;
  tooltip: string;
  badgeCount?: number;
  badgeDirection: "ahead" | "behind";
  isLoading: boolean;
  disabled: boolean;
  onPrimaryClick: () => void;
  menuItems: Array<DropdownItem>;
};

const TOGGLE_GRACE_MS = 16;

/**
 * Nút tác vụ chia đôi (Split Button) kèm menu thả xuống, tuân thủ WAI-ARIA Menu Button
 * Pattern: nửa chính thực thi hành động mặc định, nửa mũi tên bật/tắt menu. Bẫy chuột
 * (click-outside, anti-flapping) và bàn phím (xoay vòng kín) với cơ chế dọn dẹp listener.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/06_Global_Toolbar_And_Sync_Badge_Design.md (Mục 2.3 & 2.4).
 */
export function ToolbarDropdownButton({
  icon,
  label,
  tooltip,
  badgeCount = 0,
  badgeDirection,
  isLoading,
  disabled,
  onPrimaryClick,
  menuItems
}: ToolbarDropdownButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isTogglingRef = useRef(false);

  const id = useId();
  const menuId = `${id}-dropdown-menu`;
  const itemCount = menuItems.length;

  // Đăng ký bộ bẫy chuột/bàn phím/mất tiêu điểm khi menu mở, dọn dẹp ngay khi đóng.
  useEffect(() => {
    if (!isMenuOpen) {
      isTogglingRef.current = false;
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (isTogglingRef.current) {
        return;
      }
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };
    const handleWindowBlur = () => setIsMenuOpen(false);
    const handleWindowResize = () => setIsMenuOpen(false);

    document.addEventListener("mousedown", handleClickOutside, true);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("resize", handleWindowResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("resize", handleWindowResize);
      isTogglingRef.current = false;
    };
  }, [isMenuOpen]);

  // Tự đóng menu khi nút chuyển sang trạng thái bận hoặc bị vô hiệu hóa.
  useEffect(() => {
    if (disabled || isLoading) {
      setIsMenuOpen(false);
    }
  }, [disabled, isLoading]);

  function openMenu(initialIndex: number): void {
    isTogglingRef.current = true;
    setFocusedIndex(initialIndex);
    setIsMenuOpen(true);
    setTimeout(() => {
      isTogglingRef.current = false;
    }, TOGGLE_GRACE_MS);
  }

  function closeMenu(): void {
    setIsMenuOpen(false);
    triggerRef.current?.focus();
  }

  function selectItem(index: number): void {
    const item = menuItems[index];
    if (item === undefined) {
      return;
    }
    setIsMenuOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  }

  function onTriggerClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu(-1);
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent): void {
    if (!isMenuOpen) {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        openMenu(event.key === "ArrowUp" ? itemCount - 1 : 0);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((index) => (index + 1) % itemCount);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((index) => (index <= 0 ? itemCount - 1 : index - 1));
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (focusedIndex >= 0) {
          selectItem(focusedIndex);
        }
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        break;
      case "Tab":
        setIsMenuOpen(false);
        break;
    }
  }

  const ariaLabel = `More actions for ${label}`;

  return (
    <div ref={rootRef} class="relative inline-flex">
      <div class="flex items-stretch">
        <button
          type="button"
          data-dropdown-primary
          class="inline-flex cursor-pointer items-center gap-1 rounded-l-full border border-line bg-btn px-3 py-1 font-semibold not-disabled:hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-50"
          title={tooltip}
          disabled={disabled || isLoading}
          onClick={onPrimaryClick}
        >
          {isLoading ? (
            <span class="inline-flex animate-spin" aria-hidden="true">
              <Icon>
                <path
                  d="M8 1.5A6.5 6.5 0 1 1 1.5 8"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </Icon>
            </span>
          ) : (
            <Icon>{icon}</Icon>
          )}
          <span>{label}</span>
          <SyncBadge direction={badgeDirection} count={badgeCount} />
        </button>
        <button
          ref={triggerRef}
          type="button"
          data-dropdown-trigger
          class="inline-flex cursor-pointer items-center rounded-r-full border border-l-0 border-line bg-btn px-1.5 py-1 not-disabled:hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-50"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          aria-label={ariaLabel}
          aria-activedescendant={
            isMenuOpen && focusedIndex >= 0 ? `${id}-item-${focusedIndex}` : undefined
          }
          disabled={disabled || isLoading}
          onClick={onTriggerClick}
          onKeyDown={onTriggerKeyDown}
        >
          <Icon aria-hidden="true">
            <path d="M7.976 10.072L12.333 5.715L12.953 6.333L8.284 11H7.666L3 6.333L3.619 5.715L7.976 10.072Z" />
          </Icon>
        </button>
      </div>
      {isMenuOpen && (
        <div
          data-dropdown-menu
          id={menuId}
          role="menu"
          aria-orientation="vertical"
          tabIndex={-1}
          class="absolute top-full right-0 z-10 mt-1 flex min-w-full flex-col rounded-md border border-line bg-menu py-1 text-menu-fg shadow-md"
          onMouseLeave={() => setFocusedIndex(-1)}
        >
          {menuItems.map((item, index) => {
            const active = focusedIndex === index;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                id={`${id}-item-${index}`}
                data-dropdown-item={item.id}
                data-dropdown-item-index={index}
                title={item.description}
                class="cursor-pointer px-3 py-1 text-left"
                style={
                  active
                    ? {
                        backgroundColor: "rgba(168, 85, 247, 0.15)",
                        borderLeft: "2px solid #a855f7"
                      }
                    : undefined
                }
                onMouseEnter={() => setFocusedIndex(index)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectItem(index);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
