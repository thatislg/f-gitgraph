import { CommitComposer } from "@/webview/components/staging/CommitComposer";
import { DiscardConfirmModal } from "@/webview/components/staging/DiscardConfirmModal";
import { StagingPanel } from "@/webview/components/staging/StagingPanel";
import { CornerCrossFrame } from "@/webview/components/ui/CornerCrossFrame";
import {
  closeDiscardModal,
  confirmDiscard,
  discardModalTarget,
  openDiscardModal,
  stage,
  stageAll,
  stagedFiles,
  unstage,
  unstageAll,
  unstagedFiles
} from "@/webview/lib/stores/staging.store";

/**
 * Container tích hợp `StagingPanel` và `CommitComposer` thành một khối thống nhất,
 * bọc trong `CornerCrossFrame`. Danh sách tệp cuộn độc lập, trong khi khối soạn thảo
 * commit (tiêu đề + mô tả + nút) được ghim cố định phía dưới, luôn hiển thị dù có
 * nhiều tệp biến động.
 *
 * Tham khảo thiết kế:
 * docs/02_design/phase3/02_Staging_UI_And_Composer_Component_Design.md (Mục 3.1).
 */

/** Chưa có truy vấn diff cho working-tree ở Nhóm Việc 3; mở diff sẽ được ghép nối sau. */
function noopDiff(_filePath: string): void {
  // Intentionally empty.
}

export function StagingArea() {
  const modal = discardModalTarget.value;

  return (
    <CornerCrossFrame class="h-full bg-menu p-3 text-menu-fg">
      <div class="flex h-full flex-col gap-3">
        <div class="min-h-0 flex-1 overflow-y-auto">
          <StagingPanel
            stagedFiles={stagedFiles.value}
            unstagedFiles={unstagedFiles.value}
            onStage={stage}
            onUnstage={unstage}
            onDiscard={(filePath, isUntracked) =>
              openDiscardModal({ filePath, isUntracked, isAll: false })
            }
            onDiff={noopDiff}
            onStageAll={stageAll}
            onUnstageAll={unstageAll}
            onDiscardAll={() => openDiscardModal({ isAll: true })}
          />
        </div>

        <div class="shrink-0 border-t border-line" />

        <CommitComposer />
      </div>

      <DiscardConfirmModal
        isOpen={modal.isOpen}
        targetFile={modal.filePath ?? null}
        isAll={modal.isAll ?? false}
        onConfirm={confirmDiscard}
        onCancel={closeDiscardModal}
      />
    </CornerCrossFrame>
  );
}
