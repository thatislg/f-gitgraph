import { computed, signal } from "@preact/signals";

import type {
  StagedFileRecord,
  UnstagedFileRecord,
  WorkspaceStatusResult
} from "@/backend/queries/workspaceStatus";
import type { StagingFile } from "@/webview/components/staging/StagingFileItem";
import { runAction } from "@/webview/lib/actions";

/**
 * Kho trạng thái tập trung của phân vùng Staging & Commit Composer, được mô hình hóa
 * theo kiến trúc Fine-Grained Reactive Signals. Toàn bộ dữ liệu và thao tác giao diện
 * đi qua các tín hiệu cơ sở và dẫn xuất tại đây; mọi hành động ghi đều được ủy thác
 * xuống Backend qua RPC (`runAction`) theo ranh giới an toàn 4 tầng.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md (Mục 4).
 */

// --- Tín hiệu cơ sở (Base Signals) ---

/** Danh sách tệp hiện nằm trong Staging Index. */
export const stagedFiles = signal<StagingFile[]>([]);
/** Danh sách tệp biến động chưa stage trên đĩa làm việc. */
export const unstagedFiles = signal<StagingFile[]>([]);

/** Chuỗi tiêu đề tóm tắt commit do người dùng nhập. */
export const commitSubject = signal("");
/** Chuỗi mô tả chi tiết mở rộng nhiều dòng. */
export const commitDescription = signal("");

/** Trạng thái bật/tắt chế độ sửa đổi commit gần nhất (amend). */
export const isAmend = signal(false);
/** Trạng thái bật/tắt cờ ký số điện tử GPG/SSH. */
export const isSign = signal(false);
/** Cờ bật khi tiến trình commit đang chạy ngầm, chống bấm đúp. */
export const isCommitting = signal(false);

/** Tiêu đề commit HEAD dùng để nạp sẵn khi bật Amend. */
export const headCommitSubject = signal("");
/** Mô tả commit HEAD dùng để nạp sẵn khi bật Amend. */
export const headCommitDescription = signal("");

/** Bản nháp người dùng được cất giữ tạm khi bật Amend. */
const draftSubject = signal("");
const draftDescription = signal("");

export type DiscardModalTarget = {
  isOpen: boolean;
  filePath?: string;
  isUntracked?: boolean;
  isAll?: boolean;
};

/** Trạng thái mở/đóng và tham số mục tiêu của hộp thoại cảnh báo Discard. */
export const discardModalTarget = signal<DiscardModalTarget>({ isOpen: false });

// --- Tín hiệu dẫn xuất (Computed Signals) ---

/** Số lượng tệp đã stage. */
export const stagedCount = computed(() => stagedFiles.value.length);

/** Số lượng tệp chưa stage. */
export const unstagedCount = computed(() => unstagedFiles.value.length);

/**
 * Điều kiện sẵn sàng commit theo bảng chân trị: tiêu đề khác rỗng và
 * (có tệp staged hoặc đang amend), đồng thời không đang bận thực thi.
 */
export const canCommit = computed(() => {
  if (isCommitting.value) {
    return false;
  }
  if (commitSubject.value.trim().length === 0) {
    return false;
  }
  return stagedCount.value > 0 || isAmend.value;
});

/** Mức cảnh báo màu của bộ đếm ký tự tiêu đề (≤50 xám, 51–72 hổ phách, >72 đỏ). */
export type SubjectCounterColor = "idle" | "warn" | "danger";

export const subjectCounterColor = computed<SubjectCounterColor>(() => {
  const length = commitSubject.value.length;
  if (length > 72) {
    return "danger";
  }
  if (length > 50) {
    return "warn";
  }
  return "idle";
});

/** Nhãn động trên nút commit ("Amend commit" hoặc "Commit N files"). */
export const commitButtonLabel = computed(() => {
  if (isAmend.value) {
    return "Amend commit";
  }
  const count = stagedCount.value;
  return `Commit ${count} ${count === 1 ? "file" : "files"}`;
});

// --- Hàm điều phối hành động (Store Action Dispatchers) ---

/** Chuẩn hóa bản ghi tệp từ Backend về hình dạng `StagingFile` dùng cho UI. */
function toStagingFile(record: {
  path: string;
  status: string;
  isUntracked?: boolean;
}): StagingFile {
  return {
    path: record.path,
    status: record.status as StagingFile["status"],
    isUntracked: record.isUntracked ?? false
  };
}

/** Nhận gói trạng thái từ Backend và cập nhật đồng thời danh sách staged/unstaged. */
export function loadStatus(status: WorkspaceStatusResult): void {
  stagedFiles.value = status.stagedFiles.map((file: StagedFileRecord) =>
    toStagingFile({ path: file.path, status: file.status })
  );
  unstagedFiles.value = status.unstagedFiles.map((file: UnstagedFileRecord) => toStagingFile(file));
}

export function stage(filePath: string): void {
  runAction({ command: "stageFile", filePath });
}

export function unstage(filePath: string): void {
  runAction({ command: "unstageFile", filePath });
}

/** Yêu cầu Backend mở tệp trong trình soạn thảo VS Code (không phải diff). */
export function openFile(filePath: string): void {
  runAction({ command: "openFile", filePath });
}

export function stageAll(): void {
  runAction({ command: "stageAll" });
}

export function unstageAll(): void {
  runAction({ command: "unstageAll" });
}

export function openDiscardModal(target: {
  filePath?: string;
  isUntracked?: boolean;
  isAll?: boolean;
}): void {
  discardModalTarget.value = { isOpen: true, ...target };
}

export function closeDiscardModal(): void {
  discardModalTarget.value = { isOpen: false };
}

/** Đọc mục tiêu từ `discardModalTarget`, gửi lệnh discard tương ứng rồi đóng modal. */
export function confirmDiscard(): void {
  const target = discardModalTarget.value;
  if (target.isAll) {
    runAction({ command: "discardAllChanges" });
  } else if (target.filePath !== undefined) {
    runAction({
      command: "discardFileChanges",
      filePath: target.filePath,
      isUntracked: target.isUntracked ?? false
    });
  }
  closeDiscardModal();
}

/**
 * Bật/tắt chế độ Amend: khi bật, cất bản nháp hiện tại và nạp tiêu đề/mô tả commit
 * HEAD vào ô soạn thảo; khi tắt, khôi phục lại bản nháp trước đó.
 */
export function setAmend(value: boolean): void {
  if (value === isAmend.value) {
    return;
  }

  if (value) {
    draftSubject.value = commitSubject.value;
    draftDescription.value = commitDescription.value;
    commitSubject.value = headCommitSubject.value;
    commitDescription.value = headCommitDescription.value;
  } else {
    commitSubject.value = draftSubject.value;
    commitDescription.value = draftDescription.value;
  }

  isAmend.value = value;
}

/** Gửi commit xuống Backend khi đủ điều kiện `canCommit`. */
export function commit(): void {
  if (!canCommit.value) {
    return;
  }

  isCommitting.value = true;
  runAction({
    command: "commitChanges",
    summary: commitSubject.value,
    description: commitDescription.value,
    amend: isAmend.value,
    sign: isSign.value
  });
}

/** Commit rồi tự động push lên nhánh theo dõi từ xa trong một bước duy nhất. */
export function commitAndPush(): void {
  if (!canCommit.value) {
    return;
  }

  isCommitting.value = true;
  runAction({
    command: "commitAndPush",
    summary: commitSubject.value,
    description: commitDescription.value,
    amend: isAmend.value,
    sign: isSign.value
  });
}
