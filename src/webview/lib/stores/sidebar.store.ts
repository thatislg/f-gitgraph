import { computed, signal } from "@preact/signals";

import { runAction, toggleStaging } from "@/webview/lib/actions";
import { playSidebarCollapse, playSidebarExpand, playTick } from "@/webview/lib/audio";
import { branchList, commitHead, headBranch } from "@/webview/lib/stores";
import { commitHashes } from "@/webview/lib/stores/graph-window.store";

/**
 * Kho trạng thái phản ứng của cây điều hướng Sidebar bên trái (Nhóm Việc 3). Quản lý
 * chiều rộng co giãn, trạng thái thu gọn, danh sách phân nhóm mở rộng, lựa chọn phần tử
 * và các tác vụ điều hướng (checkout, mở Working Tree, stash, tạo nhánh, định vị commit).
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/07_Sidebar_Navigator_Tree_Design.md (Mục 3).
 */

// --- Hằng số phòng vệ & ranh giới an toàn ---

export const MIN_SIDEBAR_WIDTH = 160;
export const MAX_SIDEBAR_WIDTH = 450;
export const DEFAULT_SIDEBAR_WIDTH = 220;

/** Các mã định danh hợp lệ của 5 phân nhóm tài nguyên Git. */
export const ALL_SECTION_IDS = ["working-tree", "branches", "remotes", "tags", "stashes"] as const;

const VALID_SECTION_IDS = new Set<string>(ALL_SECTION_IDS);

/** Không gian tên tiền tố hợp lệ của mã định danh phần tử trên cây. */
const VALID_ITEM_PREFIXES = ["working-tree:", "branch:", "remote:", "tag:", "stash:"] as const;

const STORAGE_WIDTH_KEY = "f-gitgraph.sidebar.width";
const STORAGE_COLLAPSED_KEY = "f-gitgraph.sidebar.collapsed";
const STORAGE_SECTIONS_KEY = "f-gitgraph.sidebar.sections";

// --- Tín hiệu cơ sở (Base Signals) ---

/** Chiều rộng thực tế của Sidebar (px), kẹp trong [160, 450]. */
export const sidebarWidth = signal<number>(DEFAULT_SIDEBAR_WIDTH);

/** Cờ trạng thái thu gọn Sidebar về 0px. */
export const isSidebarCollapsed = signal<boolean>(false);

/** Tập hợp mã định danh của các phân nhóm đang mở rộng. */
export const expandedSectionIds = signal<Set<string>>(new Set(ALL_SECTION_IDS));

/** Mã định danh của phần tử đang được chọn/giữ tiêu điểm, hoặc null. */
export const selectedItemId = signal<string | null>(null);

/** Cờ đánh dấu đang kéo chuột điều chỉnh kích thước. */
export const isResizing = signal<boolean>(false);

/** Cờ khóa tương tác khi đang gửi lệnh checkout nhánh. */
export const isCheckingOut = signal<boolean>(false);

/** Nhánh HEAD trước khi checkout lạc quan (dùng để phục hồi khi Git CLI thất bại). */
export const previousHeadBranch = signal<string | null>(null);

/** Cờ khóa tương tác khi đang thực thi thao tác stash. */
export const isStashOperating = signal<boolean>(false);

/** Cờ kích hoạt hiển thị modal tạo nhánh mới. */
export const isCreateBranchModalOpen = signal<boolean>(false);

/** Mã băm commit cơ sở dùng để tạo nhánh mới (null = lấy HEAD). */
export const branchCreationBaseCommit = signal<string | null>(null);

// --- Tín hiệu dẫn xuất (Computed Signals) ---

/** Chiều rộng hiển thị thực tế áp dụng lên CSS của container Sidebar. */
export const effectiveSidebarWidth = computed<number>(() =>
  isSidebarCollapsed.value ? 0 : sidebarWidth.value
);

/** Tooltip tiếng Anh hiển thị khi rê chuột qua nút chuyển đổi Sidebar. */
export const sidebarToggleTooltip = computed<string>(() =>
  isSidebarCollapsed.value ? "Expand sidebar navigator" : "Collapse sidebar navigator"
);

/** Trạng thái có ít nhất một phân nhóm đang mở. */
export const isAnySectionExpanded = computed<boolean>(() => expandedSectionIds.value.size > 0);

// --- Hàm điều phối hành động (Store Action Dispatchers) ---

/**
 * Cập nhật chiều rộng Sidebar, tách biệt cập nhật giao diện thời gian thực (kéo chuột,
 * `commitToStorage = false`) với ghi đĩa bền vững (`commitToStorage = true` khi nhả chuột).
 */
export function setSidebarWidth(width: number, commitToStorage = false): void {
  const safeWidth =
    typeof width === "number" && Number.isFinite(width) && !Number.isNaN(width)
      ? width
      : DEFAULT_SIDEBAR_WIDTH;
  const roundedWidth = Math.round(safeWidth);
  const clampedWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, roundedWidth));

  // Kéo chuột khi đang thu gọn sẽ tự mở lại Sidebar.
  if (isSidebarCollapsed.value) {
    isSidebarCollapsed.value = false;
  }

  if (sidebarWidth.value !== clampedWidth) {
    sidebarWidth.value = clampedWidth;
  }

  document.documentElement.style.setProperty("--sidebar-width", `${clampedWidth}px`);

  if (commitToStorage) {
    try {
      localStorage.setItem(STORAGE_WIDTH_KEY, String(clampedWidth));
    } catch {
      // Storage bị chặn (Sandbox/ẩn danh/QuotaExceeded): giữ giá trị trong RAM.
    }
  }
}

/** Đảo trạng thái thu gọn/mở rộng Sidebar, đồng bộ lưu trữ và phát tín hiệu tái bố cục. */
export function toggleSidebar(): void {
  if (isResizing.value) {
    return;
  }

  const nextState = !isSidebarCollapsed.value;
  isSidebarCollapsed.value = nextState;

  if (nextState) {
    playSidebarCollapse();
  } else {
    playSidebarExpand();
  }

  try {
    localStorage.setItem(STORAGE_COLLAPSED_KEY, String(nextState));
  } catch {
    // Storage bị chặn: giữ trạng thái trong RAM.
  }

  // Phát sự kiện resize sau 160ms để đồ thị DAG và bảng CommitTable tính lại chiều rộng.
  setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 160);
}

/** Đóng hoặc mở một phân nhóm accordion, tuần tự hóa danh sách nhóm mở vào localStorage. */
export function toggleSection(sectionId: string): void {
  if (typeof sectionId !== "string" || !VALID_SECTION_IDS.has(sectionId)) {
    return;
  }

  const nextSet = new Set(expandedSectionIds.value);
  if (nextSet.has(sectionId)) {
    nextSet.delete(sectionId);
  } else {
    nextSet.add(sectionId);
  }

  expandedSectionIds.value = nextSet;

  try {
    localStorage.setItem(STORAGE_SECTIONS_KEY, JSON.stringify(Array.from(nextSet)));
  } catch {
    // Storage bị chặn: giữ trạng thái trong RAM.
  }
}

/** Mở đồng loạt toàn bộ 5 phân nhóm tài nguyên Git. */
export function expandAllSections(): void {
  if (expandedSectionIds.value.size === ALL_SECTION_IDS.length) {
    return;
  }

  expandedSectionIds.value = new Set(ALL_SECTION_IDS);

  try {
    localStorage.setItem(STORAGE_SECTIONS_KEY, JSON.stringify([...ALL_SECTION_IDS]));
  } catch {
    // Storage bị chặn: giữ trạng thái trong RAM.
  }
}

/** Gập đồng loạt toàn bộ 5 phân nhóm về trạng thái tối giản. */
export function collapseAllSections(): void {
  expandedSectionIds.value = new Set<string>();

  try {
    localStorage.setItem(STORAGE_SECTIONS_KEY, "[]");
  } catch {
    // Storage bị chặn: giữ trạng thái trong RAM.
  }
}

/** Quản lý lựa chọn phần tử trên cây; áp dụng vạch sáng viền tím Neon và tự cuộn vào tầm nhìn. */
export function selectItem(itemId: string | null): void {
  if (itemId !== null) {
    const isValid = VALID_ITEM_PREFIXES.some((prefix) => itemId.startsWith(prefix));
    if (!isValid) {
      return;
    }
  }

  selectedItemId.value = itemId;

  if (itemId === null) {
    return;
  }

  // Đồng bộ aria-selected + cuộn mượt mà (best-effort, bỏ qua khi DOM chưa sẵn sàng).
  const target = document.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`);
  if (target !== null) {
    target.setAttribute("aria-selected", "true");
    // `scrollIntoView` không tồn tại trong môi trường thử nghiệm jsdom.
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
}

/**
 * Khôi phục trạng thái từ localStorage với cơ chế phòng vệ 4 tầng chống dữ liệu rác
 * (Defensive Hydration Pipeline). Gọi một lần khi Webview khởi động.
 */
export function initSidebarStore(): void {
  try {
    const storedWidth = localStorage.getItem(STORAGE_WIDTH_KEY);
    const parsedWidth = storedWidth === null ? NaN : Number.parseInt(storedWidth, 10);
    sidebarWidth.value =
      Number.isFinite(parsedWidth) && !Number.isNaN(parsedWidth)
        ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsedWidth))
        : DEFAULT_SIDEBAR_WIDTH;

    if (window.innerWidth < 600) {
      isSidebarCollapsed.value = true;
    } else {
      isSidebarCollapsed.value = localStorage.getItem(STORAGE_COLLAPSED_KEY) === "true";
    }

    const storedSections = localStorage.getItem(STORAGE_SECTIONS_KEY);
    if (storedSections !== null) {
      try {
        const parsed = JSON.parse(storedSections) as unknown;
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (id): id is string => typeof id === "string" && VALID_SECTION_IDS.has(id)
          );
          expandedSectionIds.value = new Set(filtered);
        } else {
          expandedSectionIds.value = new Set(ALL_SECTION_IDS);
        }
      } catch {
        expandedSectionIds.value = new Set(ALL_SECTION_IDS);
      }
    } else {
      expandedSectionIds.value = new Set(ALL_SECTION_IDS);
    }
  } catch {
    // Storage không khả dụng: dùng giá trị mặc định trong RAM.
    sidebarWidth.value = DEFAULT_SIDEBAR_WIDTH;
    isSidebarCollapsed.value = false;
    expandedSectionIds.value = new Set(ALL_SECTION_IDS);
  }
}

/**
 * Gửi lệnh checkout nhánh an toàn xuống Backend. Khóa Mutex chống spam lệnh và chặn
 * checkout nhánh hiện tại. Phản hồi được xử lý bởi handler `checkoutBranch` trong dispatcher.
 */
export function checkoutBranchAction(branchName: string): void {
  if (isCheckingOut.value) {
    return;
  }

  const trimmed = typeof branchName === "string" ? branchName.trim() : "";
  if (trimmed === "") {
    return;
  }

  if (trimmed === headBranch.value) {
    return;
  }

  isCheckingOut.value = true;
  // Phản xạ lạc quan 16ms: chuyển viền tím Neon sang nhánh mục tiêu ngay lập tức.
  previousHeadBranch.value = headBranch.value;
  headBranch.value = trimmed;
  runAction({ command: "checkoutBranch", branchName: trimmed, remoteBranch: null });
}

/**
 * Xử lý nhấp đúp vào nhánh remote: tạo local tracking branch và chuyển sang nó. Nếu nhánh
 * local cùng tên đã tồn tại thì chuyển thẳng sang nhánh local đó. Backend thực thi
 * `git checkout -b <branchName> --track <remoteName>/<branchName>` qua action `checkoutBranch`.
 */
export function checkoutRemoteBranchAction(remoteName: string, branchName: string): void {
  if (isCheckingOut.value) {
    return;
  }

  const remote = typeof remoteName === "string" ? remoteName.trim() : "";
  const branch = typeof branchName === "string" ? branchName.trim() : "";
  if (remote === "" || branch === "") {
    return;
  }

  // Nhánh local cùng tên đã tồn tại: chuyển thẳng sang nhánh local hiện có.
  if (branchListContains(branch)) {
    checkoutBranchAction(branch);
    return;
  }

  isCheckingOut.value = true;
  // Phản xạ lạc quan 16ms: chuyển viền tím Neon sang nhánh mục tiêu ngay lập tức.
  previousHeadBranch.value = headBranch.value;
  headBranch.value = branch;
  runAction({
    command: "checkoutBranch",
    branchName: branch,
    remoteBranch: `${remote}/${branch}`
  });
}

/**
 * Tạo nhánh cục bộ mới theo dõi nhánh remote (từ menu ngữ cảnh "Checkout as New Local
 * Branch..."). Backend thực thi `git checkout -b <newLocalBranch> --track <remote>/<branch>`
 * qua action `checkoutRemoteBranch`.
 */
export function checkoutRemoteBranchAsNewAction(
  remoteName: string,
  branchName: string,
  newLocalBranch: string
): void {
  if (isCheckingOut.value) {
    return;
  }

  const remote = typeof remoteName === "string" ? remoteName.trim() : "";
  const branch = typeof branchName === "string" ? branchName.trim() : "";
  const localBranch = typeof newLocalBranch === "string" ? newLocalBranch.trim() : "";
  if (remote === "" || branch === "" || localBranch === "") {
    return;
  }

  if (localBranch === headBranch.value) {
    return;
  }

  isCheckingOut.value = true;
  previousHeadBranch.value = headBranch.value;
  headBranch.value = localBranch;
  runAction({
    command: "checkoutRemoteBranch",
    remote,
    branch,
    newLocalBranch: localBranch
  });
}

/** Mở phân vùng Staging Area khi người dùng chọn mục `WORKING TREE -> Changes`. */
export function openWorkingTreeAction(): void {
  selectItem("working-tree:changes");

  if (!expandedSectionIds.value.has("working-tree")) {
    toggleSection("working-tree");
  }

  toggleStaging();
}

/**
 * Điều phối thao tác stash (`pop`/`drop`) từ menu ngữ cảnh. Khóa Mutex chống xung đột
 * tiến trình Git chạy song song. Phản hồi được xử lý bởi handler stash trong dispatcher.
 */
export function handleStashAction(index: number, mode: "pop" | "drop"): void {
  if (isStashOperating.value) {
    return;
  }
  if (typeof index !== "number" || index < 0 || !Number.isInteger(index)) {
    return;
  }

  isStashOperating.value = true;
  runAction(
    mode === "pop" ? { command: "stashPop", index } : { command: "stashDrop", index }
  );
}

/** Mở modal tạo nhánh mới từ commit cơ sở (mặc định HEAD). */
export function createBranchAction(baseCommit?: string): void {
  branchCreationBaseCommit.value = baseCommit ?? commitHead.value;
  isCreateBranchModalOpen.value = true;
}

/**
 * Kiểm tra hợp lệ tên nhánh theo quy tắc Git (`git check-ref-format` rút gọn) và không
 * trùng nhánh hiện có. Trả về `null` khi hợp lệ, ngược lại trả về thông báo lỗi tiếng Anh.
 */
export function validateBranchName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "") {
    return "Branch name cannot be empty.";
  }
  if (/\s/.test(trimmed)) {
    return "Branch name cannot contain whitespace.";
  }
  if (trimmed.startsWith("/") || trimmed.endsWith("/")) {
    return "Branch name cannot start or end with a slash.";
  }
  if (/\.\.|~|\^|:|\\|\?|\*|\[/.test(trimmed)) {
    return "Branch name contains an invalid character.";
  }
  if (branchListContains(trimmed)) {
    return `A branch named '${trimmed}' already exists.`;
  }
  return null;
}

/**
 * Định vị commit trên đồ thị DAG khi người dùng nhấp vào nhánh/tag/stash. Tìm chỉ số dòng
 * trong danh sách hash hiện có; phát tín hiệu cuộn và âm thanh tích tắc khi tìm thấy.
 */
export function locateCommitOnGraphAction(commitHash: string, itemId?: string): void {
  if (typeof commitHash !== "string" || commitHash.trim() === "") {
    return;
  }

  if (itemId !== undefined) {
    selectItem(itemId);
  }

  const hashes = commitHashes.value;
  const index = hashes.findIndex(
    (hash) => hash === commitHash || hash.startsWith(commitHash) || commitHash.startsWith(hash)
  );

  if (index >= 0) {
    playTick();
    window.dispatchEvent(
      new CustomEvent("scroll-to-commit", { detail: { index } })
    );
  }
}

// --- Hỗ trợ nội bộ ---

function branchListContains(name: string): boolean {
  return branchList.value?.includes(name) ?? false;
}
