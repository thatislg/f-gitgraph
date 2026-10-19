// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/webview/lib/actions", () => ({
  runAction: vi.fn(),
  toggleStaging: vi.fn()
}));

import { runAction, toggleStaging } from "@/webview/lib/actions";
import { branchList, commitHead, headBranch } from "@/webview/lib/stores";
import { commitHashes } from "@/webview/lib/stores/graph-window.store";
import {
  ALL_SECTION_IDS,
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  branchCreationBaseCommit,
  checkoutBranchAction,
  collapseAllSections,
  createBranchAction,
  effectiveSidebarWidth,
  expandAllSections,
  expandedSectionIds,
  handleStashAction,
  initSidebarStore,
  isCheckingOut,
  isCreateBranchModalOpen,
  isResizing,
  isSidebarCollapsed,
  isStashOperating,
  locateCommitOnGraphAction,
  openWorkingTreeAction,
  selectItem,
  selectedItemId,
  setSidebarWidth,
  sidebarWidth,
  toggleSection,
  toggleSidebar,
  validateBranchName
} from "@/webview/lib/stores/sidebar.store";

function resetStore() {
  sidebarWidth.value = DEFAULT_SIDEBAR_WIDTH;
  isSidebarCollapsed.value = false;
  expandedSectionIds.value = new Set(ALL_SECTION_IDS);
  selectedItemId.value = null;
  isResizing.value = false;
  isCheckingOut.value = false;
  isStashOperating.value = false;
  isCreateBranchModalOpen.value = false;
  branchCreationBaseCommit.value = null;
  branchList.value = undefined;
  commitHead.value = null;
  headBranch.value = null;
  commitHashes.value = [];
  localStorage.clear();
  document.documentElement.style.removeProperty("--sidebar-width");
}

describe("sidebarStore", () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(runAction).mockClear();
    vi.mocked(toggleStaging).mockClear();
  });

  describe("khởi tạo & ranh giới an toàn", () => {
    it("khởi tạo chiều rộng mặc định 220px", () => {
      expect(sidebarWidth.value).toBe(DEFAULT_SIDEBAR_WIDTH);
      expect(effectiveSidebarWidth.value).toBe(220);
    });

    it("kẹp giá trị ngoài khoảng [160, 450] về ranh giới", () => {
      setSidebarWidth(100);
      expect(sidebarWidth.value).toBe(MIN_SIDEBAR_WIDTH);

      setSidebarWidth(600);
      expect(sidebarWidth.value).toBe(MAX_SIDEBAR_WIDTH);

      setSidebarWidth(-10);
      expect(sidebarWidth.value).toBe(MIN_SIDEBAR_WIDTH);

      setSidebarWidth(Number.NaN);
      expect(sidebarWidth.value).toBe(DEFAULT_SIDEBAR_WIDTH);
    });
  });

  describe("tách biệt cập nhật UI vs lưu trữ đĩa", () => {
    it("commitToStorage=false không ghi localStorage nhưng cập nhật CSS", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      setSidebarWidth(300, false);

      expect(sidebarWidth.value).toBe(300);
      expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("300px");
      expect(setItem).not.toHaveBeenCalled();
      setItem.mockRestore();
    });

    it("commitToStorage=true ghi chính xác vào localStorage", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      setSidebarWidth(320, true);

      expect(setItem).toHaveBeenCalledWith("f-gitgraph.sidebar.width", "320");
      setItem.mockRestore();
    });
  });

  describe("toggle sidebar & bẫy reflow", () => {
    it("đảo trạng thái thu gọn và lưu boolean", () => {
      toggleSidebar();
      expect(isSidebarCollapsed.value).toBe(true);
      expect(localStorage.getItem("f-gitgraph.sidebar.collapsed")).toBe("true");
      expect(effectiveSidebarWidth.value).toBe(0);

      toggleSidebar();
      expect(isSidebarCollapsed.value).toBe(false);
    });

    it("phát sự kiện resize sau 160ms", () => {
      vi.useFakeTimers();
      const dispatch = vi.spyOn(window, "dispatchEvent");
      toggleSidebar();
      vi.advanceTimersByTime(160);
      expect(dispatch).toHaveBeenCalledWith(expect.any(Event));
      vi.useRealTimers();
      dispatch.mockRestore();
    });

    it("không thu gọn khi đang kéo chuột (isResizing)", () => {
      isResizing.value = true;
      toggleSidebar();
      expect(isSidebarCollapsed.value).toBe(false);
    });
  });

  describe("đóng/mở section & mở/gập toàn bộ", () => {
    it("toggleSection thêm/xóa đúng sectionId", () => {
      toggleSection("tags");
      expect(expandedSectionIds.value.has("tags")).toBe(false);

      toggleSection("tags");
      expect(expandedSectionIds.value.has("tags")).toBe(true);
    });

    it("từ chối sectionId không hợp lệ", () => {
      toggleSection("nonsense");
      expect(expandedSectionIds.value.size).toBe(5);
    });

    it("expandAllSections mở đủ 5 nhóm", () => {
      collapseAllSections();
      expandAllSections();
      expect(expandedSectionIds.value.size).toBe(5);
    });

    it("collapseAllSections gập toàn bộ về rỗng", () => {
      collapseAllSections();
      expect(expandedSectionIds.value.size).toBe(0);
    });
  });

  describe("lựa chọn item & kiểm tra tiền tố", () => {
    it.each([
      "working-tree:changes",
      "branch:main",
      "remote:origin/main",
      "tag:v1.0.0",
      "stash:0"
    ])("chấp nhận tiền tố hợp lệ %s", (itemId) => {
      selectItem(itemId);
      expect(selectedItemId.value).toBe(itemId);
    });

    it("từ chối tiền tố không hợp lệ", () => {
      selectItem("bogus:item");
      expect(selectedItemId.value).toBeNull();
    });

    it("selectItem(null) xóa lựa chọn", () => {
      selectItem("branch:main");
      selectItem(null);
      expect(selectedItemId.value).toBeNull();
    });
  });

  describe("khôi phục phòng vệ (Defensive Hydration)", () => {
    it("khôi phục giá trị hợp lệ từ localStorage", () => {
      localStorage.setItem("f-gitgraph.sidebar.width", "300");
      localStorage.setItem("f-gitgraph.sidebar.collapsed", "true");
      localStorage.setItem("f-gitgraph.sidebar.sections", JSON.stringify(["branches"]));

      initSidebarStore();
      expect(sidebarWidth.value).toBe(300);
      expect(isSidebarCollapsed.value).toBe(true);
      expect(expandedSectionIds.value.has("branches")).toBe(true);
      expect(expandedSectionIds.value.has("tags")).toBe(false);
    });

    it("fallback an toàn khi localStorage chứa chuỗi rác", () => {
      localStorage.setItem("f-gitgraph.sidebar.width", "garbage");
      localStorage.setItem("f-gitgraph.sidebar.sections", "{not json");

      initSidebarStore();
      expect(sidebarWidth.value).toBe(DEFAULT_SIDEBAR_WIDTH);
      expect(expandedSectionIds.value.size).toBe(5);
    });
  });

  describe("bẫy lỗi Storage Sandbox", () => {
    it("không ném lỗi khi localStorage.setItem ném QuotaExceededError", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });

      expect(() => {
        setSidebarWidth(280, true);
        toggleSidebar();
        toggleSection("tags");
      }).not.toThrow();
    });
  });

  describe("khóa mutex checkout & bẫy xung đột working tree", () => {
    it("bật cờ isCheckingOut và phát đúng payload RPC", () => {
      headBranch.value = "main";
      checkoutBranchAction("feature/x");

      expect(isCheckingOut.value).toBe(true);
      expect(runAction).toHaveBeenCalledWith({
        command: "checkoutBranch",
        branchName: "feature/x",
        remoteBranch: null
      });
    });

    it("chặn gọi lần 2 liên tiếp (mutex)", () => {
      headBranch.value = "main";
      checkoutBranchAction("feature/x");
      checkoutBranchAction("feature/y");
      expect(runAction).toHaveBeenCalledTimes(1);
    });

    it("chặn checkout nhánh HEAD hiện tại", () => {
      headBranch.value = "main";
      checkoutBranchAction("main");
      expect(runAction).not.toHaveBeenCalled();
    });

    it("chặn tên nhánh rỗng sau khi trim", () => {
      headBranch.value = "main";
      checkoutBranchAction("   ");
      expect(runAction).not.toHaveBeenCalled();
    });
  });

  describe("điều phối stash pop/drop", () => {
    it("pop phát stashPop với index", () => {
      handleStashAction(0, "pop");
      expect(isStashOperating.value).toBe(true);
      expect(runAction).toHaveBeenCalledWith({ command: "stashPop", index: 0 });
    });

    it("drop phát stashDrop với index", () => {
      handleStashAction(2, "drop");
      expect(runAction).toHaveBeenCalledWith({ command: "stashDrop", index: 2 });
    });

    it("chặn index âm và không nguyên", () => {
      handleStashAction(-1, "pop");
      handleStashAction(1.5, "pop");
      expect(runAction).not.toHaveBeenCalled();
    });
  });

  describe("tạo nhánh mới", () => {
    it("mở modal và đặt commit cơ sở mặc định HEAD", () => {
      commitHead.value = "abc123";
      createBranchAction();

      expect(isCreateBranchModalOpen.value).toBe(true);
      expect(branchCreationBaseCommit.value).toBe("abc123");
    });

    it("dùng baseCommit tùy chỉnh khi được cung cấp", () => {
      createBranchAction("def456");
      expect(branchCreationBaseCommit.value).toBe("def456");
    });
  });

  describe("linting tên nhánh Git", () => {
    it("từ chối tên rỗng và chứa khoảng trắng", () => {
      expect(validateBranchName("  ")).toContain("empty");
      expect(validateBranchName("feat ure")).toContain("whitespace");
    });

    it("từ chối ký tự đặc biệt và dấu chấm kép", () => {
      expect(validateBranchName("a..b")).toContain("invalid character");
      expect(validateBranchName("a~b")).toContain("invalid character");
      expect(validateBranchName("a^b")).toContain("invalid character");
    });

    it("từ chối nhánh trùng đã tồn tại", () => {
      branchList.value = ["main", "dev"];
      expect(validateBranchName("main")).toContain("already exists");
    });

    it("chấp nhận tên nhánh hợp lệ", () => {
      branchList.value = ["main"];
      expect(validateBranchName("feature/xyz")).toBeNull();
    });
  });

  describe("mở working tree & định vị commit", () => {
    it("openWorkingTreeAction gọi toggleStaging", () => {
      openWorkingTreeAction();
      expect(toggleStaging).toHaveBeenCalledTimes(1);
      expect(selectedItemId.value).toBe("working-tree:changes");
    });

    it("locateCommitOnGraphAction phát scroll-to-commit khi khớp hash", () => {
      commitHashes.value = ["a1b2c3", "d4e5f6"];
      const dispatch = vi.spyOn(window, "dispatchEvent");

      locateCommitOnGraphAction("a1b2c3");

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "scroll-to-commit", detail: { index: 0 } })
      );
      dispatch.mockRestore();
    });

    it("locateCommitOnGraphAction bỏ qua hash rỗng", () => {
      const dispatch = vi.spyOn(window, "dispatchEvent");
      locateCommitOnGraphAction("  ");
      expect(dispatch).not.toHaveBeenCalled();
      dispatch.mockRestore();
    });
  });
});
