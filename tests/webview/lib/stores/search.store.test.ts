// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import type { GitCommitNode, GraphRow } from "@/types";
import { windowRows } from "@/webview/lib/stores/graph-window.store";
import {
  activeCommitHash,
  clearQuery,
  closeSearch,
  counterText,
  currentMatchIndex,
  hasActiveSearch,
  isSearchOpen,
  matchingRowIndices,
  matchesCommit,
  nextMatch,
  openSearch,
  parseSearchQuery,
  prevMatch,
  scrollRequest,
  searchQuery,
  setQuery,
  totalMatches,
  type SearchableCommit
} from "@/webview/lib/stores/search.store";

function makeCommit(overrides: Partial<GitCommitNode> & { hash: string }): GitCommitNode {
  return {
    parentHashes: [],
    author: "Nam Nguyen",
    email: "nam@example.com",
    date: 1_700_000_000,
    message: "feat: add login flow",
    refs: [],
    ...overrides
  };
}

function makeRow(commit: GitCommitNode, index = 0): GraphRow {
  return {
    hash: commit.hash,
    metadata: commit,
    x: 10,
    y: index * 24,
    lane: 0,
    color: 1,
    isMerge: false,
    isRoot: index === 0
  };
}

function resetStore(): void {
  searchQuery.value = "";
  isSearchOpen.value = false;
  currentMatchIndex.value = 0;
  scrollRequest.value = null;
  windowRows.value = [];
}

/** Đọc rowIndex của yêu cầu cuộn hiện tại (tránh TS narrowing sau khi gán null). */
function scrollRow(): number | undefined {
  return scrollRequest.value?.rowIndex;
}

describe("parseSearchQuery", () => {
  it("trả về mảng rỗng cho chuỗi rỗng hoặc chỉ khoảng trắng", () => {
    expect(parseSearchQuery("")).toEqual([]);
    expect(parseSearchQuery("   ")).toEqual([]);
  });

  it("bóc tách token author/hash/free, chuyển chữ thường và bỏ qua token rỗng", () => {
    expect(parseSearchQuery("author:Nam hash:a1b2 fix")).toEqual([
      { type: "author", value: "nam" },
      { type: "hash", value: "a1b2" },
      { type: "free", value: "fix" }
    ]);
  });

  it("bỏ qua token author:/hash: không có giá trị", () => {
    expect(parseSearchQuery("author: hash: login")).toEqual([{ type: "free", value: "login" }]);
  });
});

describe("matchesCommit", () => {
  const commit: SearchableCommit = {
    hash: "a1b2c3d4",
    subject: "feat: add login flow",
    description: "support email auth",
    authorName: "Nam Nguyen",
    authorEmail: "nam@example.com"
  };

  it("trả về true khi không có token", () => {
    expect(matchesCommit(commit, [])).toBe(true);
  });

  it("khớp chuỗi con trong subject + description (không phân biệt hoa thường)", () => {
    expect(matchesCommit(commit, parseSearchQuery("LOGIN"))).toBe(true);
    expect(matchesCommit(commit, parseSearchQuery("email auth"))).toBe(true);
    expect(matchesCommit(commit, parseSearchQuery("oauth"))).toBe(false);
  });

  it("khớp author theo tên hoặc email", () => {
    expect(matchesCommit(commit, parseSearchQuery("author:Nam"))).toBe(true);
    expect(matchesCommit(commit, parseSearchQuery("author:example.com"))).toBe(true);
    expect(matchesCommit(commit, parseSearchQuery("author:Tuan"))).toBe(false);
  });

  it("khớp hash theo tiền tố", () => {
    expect(matchesCommit(commit, parseSearchQuery("hash:a1b2"))).toBe(true);
    expect(matchesCommit(commit, parseSearchQuery("hash:a1b2c3"))).toBe(true);
    expect(matchesCommit(commit, parseSearchQuery("hash:ffff"))).toBe(false);
  });

  it("khớp nhiều điều kiện theo logic AND", () => {
    expect(matchesCommit(commit, parseSearchQuery("author:Nam login"))).toBe(true);
    expect(matchesCommit(commit, parseSearchQuery("author:Nam oauth"))).toBe(false);
  });
});

describe("search.store computed signals", () => {
  beforeEach(() => {
    resetStore();
  });

  it("matchingRowIndices trả rỗng khi không có query", () => {
    windowRows.value = [makeRow(makeCommit({ hash: "a1" }))];
    expect(matchingRowIndices.value).toEqual([]);
    expect(totalMatches.value).toBe(0);
  });

  it("lọc đúng chỉ số dòng khớp theo message", () => {
    windowRows.value = [
      makeRow(makeCommit({ hash: "a1", message: "feat: login page" })),
      makeRow(makeCommit({ hash: "b2", message: "fix: bug" }), 1),
      makeRow(makeCommit({ hash: "c3", message: "chore: login cleanup" }), 2)
    ];
    searchQuery.value = "login";

    expect(matchingRowIndices.value).toEqual([0, 2]);
    expect(totalMatches.value).toBe(2);
    expect(hasActiveSearch.value).toBe(true);
  });

  it("bỏ qua các dòng không có metadata", () => {
    windowRows.value = [
      makeRow(makeCommit({ hash: "a1", message: "login" })),
      {
        hash: "ghost",
        metadata: undefined,
        x: 0,
        y: 24,
        lane: 0,
        color: 0,
        isMerge: false,
        isRoot: false
      }
    ];
    searchQuery.value = "login";

    expect(matchingRowIndices.value).toEqual([0]);
  });

  it("activeCommitHash trả null khi không có kết quả", () => {
    expect(activeCommitHash.value).toBeNull();
  });

  it("counterText hiển thị No matches khi có query nhưng không khớp", () => {
    searchQuery.value = "zzz";
    expect(counterText.value).toBe("No matches");
  });

  it("counterText trả rỗng khi query trống", () => {
    expect(counterText.value).toBe("");
  });
});

describe("search.store dispatchers", () => {
  beforeEach(() => {
    resetStore();
    windowRows.value = [
      makeRow(makeCommit({ hash: "a1", message: "feat: login page" })),
      makeRow(makeCommit({ hash: "b2", message: "feat: login api" }), 1),
      makeRow(makeCommit({ hash: "c3", message: "feat: login tests" }), 2)
    ];
  });

  it("setQuery early-return khi chuỗi trùng hiện tại", () => {
    const before = scrollRequest.value;
    searchQuery.value = "login";
    currentMatchIndex.value = 1;
    setQuery("login");

    expect(currentMatchIndex.value).toBe(1);
    expect(scrollRequest.value).toBe(before);
  });

  it("setQuery đặt lại chỉ số 0 và phát cuộn đến kết quả đầu tiên", () => {
    setQuery("login");

    expect(searchQuery.value).toBe("login");
    expect(currentMatchIndex.value).toBe(0);
    expect(scrollRow()).toBe(0);
  });

  it("setQuery không phát cuộn khi query trống hoặc không khớp", () => {
    scrollRequest.value = null;
    setQuery("   ");
    expect(scrollRequest.value).toBeNull();

    setQuery("nonexistent");
    expect(scrollRequest.value).toBeNull();
  });

  it("nextMatch xoay vòng tuần hoàn và phát cuộn đúng dòng", () => {
    setQuery("login");
    expect(currentMatchIndex.value).toBe(0);

    nextMatch();
    expect(currentMatchIndex.value).toBe(1);
    expect(scrollRow()).toBe(1);

    nextMatch();
    expect(currentMatchIndex.value).toBe(2);

    nextMatch();
    expect(currentMatchIndex.value).toBe(0);
  });

  it("prevMatch xoay vòng ngược an toàn không âm", () => {
    setQuery("login");
    prevMatch();
    expect(currentMatchIndex.value).toBe(2);
    prevMatch();
    expect(currentMatchIndex.value).toBe(1);
  });

  it("next/prev với 1 kết quả duy nhất giữ chỉ số 0 và vẫn phát cuộn", () => {
    windowRows.value = [makeRow(makeCommit({ hash: "only", message: "login" }))];
    setQuery("login");

    scrollRequest.value = null;
    nextMatch();
    expect(currentMatchIndex.value).toBe(0);
    expect(scrollRow()).toBe(0);

    scrollRequest.value = null;
    prevMatch();
    expect(currentMatchIndex.value).toBe(0);
    expect(scrollRow()).toBe(0);
  });

  it("nextMatch/prevMatch no-op khi không có kết quả", () => {
    searchQuery.value = "nonexistent";
    scrollRequest.value = null;
    nextMatch();
    prevMatch();
    expect(scrollRequest.value).toBeNull();
    expect(currentMatchIndex.value).toBe(0);
  });

  it("openSearch bật cờ và tái căn giữa kết quả hiện có", () => {
    setQuery("login");
    currentMatchIndex.value = 1;
    isSearchOpen.value = false;

    scrollRequest.value = null;
    openSearch();

    expect(isSearchOpen.value).toBe(true);
    expect(scrollRow()).toBe(1);
  });

  it("closeSearch làm sạch toàn bộ trạng thái", () => {
    setQuery("login");
    currentMatchIndex.value = 1;
    closeSearch();

    expect(isSearchOpen.value).toBe(false);
    expect(searchQuery.value).toBe("");
    expect(currentMatchIndex.value).toBe(0);
    expect(scrollRequest.value).toBeNull();
  });

  it("clearQuery xóa query nhưng giữ thanh tìm kiếm mở", () => {
    setQuery("login");
    isSearchOpen.value = true;
    clearQuery();

    expect(searchQuery.value).toBe("");
    expect(currentMatchIndex.value).toBe(0);
    expect(scrollRequest.value).toBeNull();
    expect(isSearchOpen.value).toBe(true);
  });

  it("dispatchScrollToRow tạo đối tượng mới mỗi lần gọi (cùng dòng)", () => {
    windowRows.value = [makeRow(makeCommit({ hash: "only", message: "login" }))];
    setQuery("login");
    const first = scrollRequest.value;

    nextMatch();
    const later = scrollRequest.value;

    expect(later?.rowIndex).toBe(0);
    expect(later).not.toBe(first);
  });
});

describe("search.store index clamping", () => {
  beforeEach(() => {
    resetStore();
  });

  it("activeCommitHash & counterText tự kẹp chỉ số khi dữ liệu giảm", () => {
    windowRows.value = [
      makeRow(makeCommit({ hash: "a1", message: "login" })),
      makeRow(makeCommit({ hash: "b2", message: "login" }), 1),
      makeRow(makeCommit({ hash: "c3", message: "login" }), 2)
    ];
    setQuery("login");
    currentMatchIndex.value = 2;

    // Thu hẹp dữ liệu chỉ còn 1 kết quả -> chỉ số 2 vượt biên.
    windowRows.value = [makeRow(makeCommit({ hash: "a1", message: "login" }))];

    expect(activeCommitHash.value).toBe("a1");
    expect(counterText.value).toBe("(1 of 1)");
  });
});
