import { useEffect, useRef } from "preact/hooks";

import { Icon } from "@/webview/components/ui/Icons";
import {
  clearQuery,
  closeSearch,
  counterText,
  isSearchOpen,
  nextMatch,
  openSearch,
  prevMatch,
  searchQuery,
  setQuery,
  totalMatches
} from "@/webview/lib/stores/search.store";

/**
 * Thanh tìm kiếm & lọc commit nổi, mang phong cách Cyber-Lab. Vận hành trực tiếp trên
 * kho trạng thái `search.store.ts`: bắt phím tắt toàn cục `Ctrl/Cmd + F` để mở, `Enter`/
 * `Shift + Enter` để chuyển kết quả, `Esc` để đóng; đồng bộ bộ đếm kết quả và điều phối
 * cuộn bảng ảo hóa thông qua tín hiệu `scrollRequest`.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/08_Search_Filter_And_DAG_Navigation_Design.md (Mục 3).
 */

export function SearchFilterBar() {
  const inputRef = useRef<HTMLInputElement>(null);

  // Bắt phím tắt toàn cục Ctrl/Cmd + F ở bất kỳ vị trí nào trên Webview.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openSearch();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Khi thanh tìm kiếm vừa mở, chờ nhịp render DOM kế tiếp rồi focus + bôi đen toàn bộ.
  useEffect(() => {
    if (!isSearchOpen.value) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isSearchOpen.value]);

  if (!isSearchOpen.value) {
    return null;
  }

  const query = searchQuery.value;
  const hasQuery = query.length > 0;

  return (
    <div
      data-search-bar
      class="absolute right-4 top-3 z-50 flex items-center gap-1 rounded-md border border-cross-active bg-menu px-2 py-1.5 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
    >
      <Icon class="shrink-0 text-muted">
        <path
          d="M6.5 1a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM15 15l-4.5-4.5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </Icon>

      <input
        ref={inputRef}
        type="text"
        data-search-input
        class="w-56 bg-transparent text-[13px] text-input-fg placeholder:text-muted focus:outline-none"
        placeholder="Find by message, author:name, hash:sha (Ctrl+F)"
        value={query}
        onInput={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.shiftKey) {
            event.preventDefault();
            prevMatch();
          } else if (event.key === "Enter") {
            event.preventDefault();
            nextMatch();
          } else if (event.key === "Escape") {
            event.preventDefault();
            closeSearch();
          }
        }}
      />

      <span data-search-counter class="shrink-0 font-mono text-[11px] text-muted">
        {counterText.value}
      </span>

      {hasQuery && (
        <button
          type="button"
          data-search-clear
          class="cursor-pointer text-muted hover:text-[#e2e8f0]"
          title="Clear search (Esc)"
          onClick={() => {
            clearQuery();
            inputRef.current?.focus();
          }}
        >
          <Icon>
            <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" />
          </Icon>
        </button>
      )}

      <button
        type="button"
        data-search-prev
        class="cursor-pointer text-muted hover:text-[#e2e8f0] disabled:opacity-40"
        title="Previous match (Shift+Enter)"
        disabled={totalMatches.value === 0}
        onClick={prevMatch}
      >
        <Icon>
          <path d="M8 5l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.5" />
        </Icon>
      </button>

      <button
        type="button"
        data-search-next
        class="cursor-pointer text-muted hover:text-[#e2e8f0] disabled:opacity-40"
        title="Next match (Enter)"
        disabled={totalMatches.value === 0}
        onClick={nextMatch}
      >
        <Icon>
          <path d="M8 11l3-3-3-3" fill="none" stroke="currentColor" stroke-width="1.5" />
        </Icon>
      </button>

      <button
        type="button"
        data-search-close
        class="cursor-pointer text-muted hover:text-[#e2e8f0]"
        title="Close search bar (Esc)"
        onClick={closeSearch}
      >
        <Icon>
          <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.5" />
        </Icon>
      </button>
    </div>
  );
}
