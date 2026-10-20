import { batch, computed, effect, signal } from "@preact/signals";

import type { GitCommitNode, GraphRow } from "@/types";
import { windowRows } from "@/webview/lib/stores/graph-window.store";

// Kho trạng thái tìm kiếm & lọc commit (Nhóm Việc 4). Vận hành hoàn toàn trên dữ liệu
// commit đã có sẵn trong Webview UI (không phát sinh RPC query bổ sung). Bộ phân tích cú
// pháp `parseSearchQuery` và bộ đối chiếu `matchesCommit` là hàm thuần, dễ kiểm thử đơn vị.
// Tham khảo thiết kế:
// docs/02_design/phase3/08_Search_Filter_And_DAG_Navigation_Design.md.

// --- Kiểu dữ liệu thuần (Pure Data Types) ---

export type SearchToken = {
  type: "author" | "hash" | "free";
  value: string;
};

/** Hình chiếu tối giản của một commit phục vụ đối chiếu tìm kiếm, độc lập với GraphRow. */
export type SearchableCommit = {
  hash: string;
  subject: string;
  description?: string | undefined;
  authorName: string;
  authorEmail?: string | undefined;
};

// --- Hàm thuần (Pure Functions) ---

/**
 * Bóc tách chuỗi tìm kiếm thô thành danh sách token `author:`/`hash:`/tự do. Các token
 * được phân tách bởi một hoặc nhiều khoảng trắng, giá trị đã chuyển chữ thường và cắt
 * khoảng trắng; token có giá trị rỗng bị bỏ qua.
 */
export function parseSearchQuery(rawQuery: string): SearchToken[] {
  const trimmed = rawQuery.trim();
  if (trimmed === "") {
    return [];
  }

  const tokens: SearchToken[] = [];
  for (const word of trimmed.split(/\s+/)) {
    if (word.startsWith("author:")) {
      const value = word.slice("author:".length).toLowerCase();
      if (value !== "") {
        tokens.push({ type: "author", value });
      }
    } else if (word.startsWith("hash:")) {
      const value = word.slice("hash:".length).toLowerCase();
      if (value !== "") {
        tokens.push({ type: "hash", value });
      }
    } else if (word !== "") {
      tokens.push({ type: "free", value: word.toLowerCase() });
    }
  }
  return tokens;
}

/**
 * Đối chiếu một commit với danh sách token theo logic AND: commit khớp khi thỏa mãn toàn
 * bộ token. Token `author` khớp chuỗi con trong tên/email tác giả, `hash` khớp tiền tố mã
 * băm, `free` khớp chuỗi con trong tiêu đề + mô tả (không phân biệt hoa thường).
 */
export function matchesCommit(commit: SearchableCommit, tokens: SearchToken[]): boolean {
  if (tokens.length === 0) {
    return true;
  }

  const searchableText = `${commit.subject} ${commit.description ?? ""}`.toLowerCase();
  const authorText = `${commit.authorName} ${commit.authorEmail ?? ""}`.toLowerCase();
  const hashText = commit.hash.toLowerCase();

  for (const token of tokens) {
    if (token.type === "author" && !authorText.includes(token.value)) {
      return false;
    }
    if (token.type === "hash" && !hashText.startsWith(token.value)) {
      return false;
    }
    if (token.type === "free" && !searchableText.includes(token.value)) {
      return false;
    }
  }
  return true;
}

// --- Tín hiệu cơ sở (Base Signals) ---

/** Chuỗi tìm kiếm hiện tại do người dùng nhập. */
export const searchQuery = signal<string>("");
/** Cờ đóng/mở thanh tìm kiếm nổi trên Webview UI. */
export const isSearchOpen = signal<boolean>(false);
/** Chỉ số (0-indexed) của kết quả đang được focus trong danh sách khớp. */
export const currentMatchIndex = signal<number>(0);
/** Yêu cầu cuộn bảng ảo hóa đến dòng chỉ định (timestamp bảo đảm luôn kích hoạt phản ứng). */
export const scrollRequest = signal<{ rowIndex: number; timestamp: number } | null>(null);

// --- Tín hiệu dẫn xuất (Computed Signals) ---

function toSearchableCommit(row: GraphRow): SearchableCommit {
  const meta: GitCommitNode | undefined = row.metadata;
  return {
    hash: row.hash,
    subject: meta?.message ?? "",
    description: meta?.body,
    authorName: meta?.author ?? "",
    authorEmail: meta?.email
  };
}

/** Chỉ số các dòng commit (trong cửa sổ ảo hóa) thỏa mãn điều kiện tìm kiếm. */
export const matchingRowIndices = computed<number[]>(() => {
  const tokens = parseSearchQuery(searchQuery.value);
  if (tokens.length === 0) {
    return [];
  }

  const indices: number[] = [];
  windowRows.value.forEach((row, index) => {
    if (row.metadata !== undefined && matchesCommit(toSearchableCommit(row), tokens)) {
      indices.push(index);
    }
  });
  return indices;
});

/** Tổng số commit khớp điều kiện tìm kiếm. */
export const totalMatches = computed<number>(() => matchingRowIndices.value.length);

/** Mã băm của commit đang được định vị (đã kẹp an toàn), hoặc `null` khi không có kết quả. */
export const activeCommitHash = computed<string | null>(() => {
  const indices = matchingRowIndices.value;
  if (indices.length === 0) {
    return null;
  }
  const safeIndex = clampIndex(currentMatchIndex.value, indices.length);
  const rowIndex = indices[safeIndex];
  return rowIndex === undefined ? null : (windowRows.value[rowIndex]?.hash ?? null);
});

/** Nhãn tiếng Anh hiển thị trên bộ đếm kết quả. */
export const counterText = computed<string>(() => {
  const total = totalMatches.value;
  if (total === 0) {
    return searchQuery.value.trim() === "" ? "" : "No matches";
  }
  const safeIndex = clampIndex(currentMatchIndex.value, total);
  return `(${safeIndex + 1} of ${total})`;
});

/** `true` khi có một bộ lọc tìm kiếm đang hiệu lực (dùng để làm mờ dòng không khớp). */
export const hasActiveSearch = computed<boolean>(
  () => parseSearchQuery(searchQuery.value).length > 0
);

// --- Cơ chế kẹp chỉ số tự động (Index Clamping & Mutation Sync) ---

effect(() => {
  const total = totalMatches.value;
  if (total === 0) {
    if (currentMatchIndex.value !== 0) {
      currentMatchIndex.value = 0;
    }
    return;
  }
  if (currentMatchIndex.value >= total) {
    currentMatchIndex.value = total - 1;
  }
});

// --- Hàm điều phối hành động (Store Action Dispatchers) ---

/** Phát lệnh cuộn phi ghép nối đến dòng chỉ định (timestamp mới mỗi lần gọi). */
function dispatchScrollToRow(rowIndex: number): void {
  scrollRequest.value = { rowIndex, timestamp: Date.now() };
}

/** Cập nhật chuỗi tìm kiếm, đặt lại chỉ số về 0 và tự cuộn đến kết quả đầu tiên. */
export function setQuery(query: string): void {
  if (query === searchQuery.value) {
    return;
  }

  batch(() => {
    searchQuery.value = query;
    currentMatchIndex.value = 0;
  });

  if (query.trim() === "" || totalMatches.value === 0) {
    return;
  }

  const firstRow = matchingRowIndices.value[0];
  if (firstRow !== undefined) {
    dispatchScrollToRow(firstRow);
  }
}

/** Chuyển tiêu điểm sang kết quả kế tiếp (xoay vòng tuần hoàn) và cuộn căn giữa. */
export function nextMatch(): void {
  const count = totalMatches.value;
  if (count === 0) {
    return;
  }
  if (count === 1) {
    const only = matchingRowIndices.value[0];
    if (only !== undefined) {
      dispatchScrollToRow(only);
    }
    return;
  }

  currentMatchIndex.value = (currentMatchIndex.value + 1) % count;
  const targetRow = matchingRowIndices.value[currentMatchIndex.value];
  if (targetRow !== undefined) {
    dispatchScrollToRow(targetRow);
  }
}

/** Chuyển tiêu điểm lùi lại kết quả trước đó (xoay vòng tuần hoàn ngược) và cuộn căn giữa. */
export function prevMatch(): void {
  const count = totalMatches.value;
  if (count === 0) {
    return;
  }
  if (count === 1) {
    const only = matchingRowIndices.value[0];
    if (only !== undefined) {
      dispatchScrollToRow(only);
    }
    return;
  }

  currentMatchIndex.value = (currentMatchIndex.value - 1 + count) % count;
  const targetRow = matchingRowIndices.value[currentMatchIndex.value];
  if (targetRow !== undefined) {
    dispatchScrollToRow(targetRow);
  }
}

/** Mở thanh tìm kiếm; tái căn giữa kết quả hiện có nếu đang lọc. Việc focus/select input
 *  được thực hiện bởi `SearchFilterBar` qua effect phản ứng khi `isSearchOpen` đổi trạng thái. */
export function openSearch(): void {
  isSearchOpen.value = true;

  if (totalMatches.value > 0) {
    const indices = matchingRowIndices.value;
    const targetRow = indices[clampIndex(currentMatchIndex.value, indices.length)];
    if (targetRow !== undefined) {
      dispatchScrollToRow(targetRow);
    }
  }
}

/** Đóng thanh tìm kiếm và làm sạch toàn bộ dữ liệu tìm kiếm. */
export function closeSearch(): void {
  batch(() => {
    searchQuery.value = "";
    currentMatchIndex.value = 0;
    isSearchOpen.value = false;
    scrollRequest.value = null;
  });
}

/** Xóa nhanh chuỗi tìm kiếm nhưng giữ thanh tìm kiếm mở (tiêu điểm do component duy trì). */
export function clearQuery(): void {
  batch(() => {
    searchQuery.value = "";
    currentMatchIndex.value = 0;
    scrollRequest.value = null;
  });
}

// --- Hỗ trợ nội bộ ---

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (!Number.isFinite(index) || index < 0) {
    return 0;
  }
  return Math.min(index, length - 1);
}
