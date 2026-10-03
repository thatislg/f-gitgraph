import * as vscode from "vscode";

import { createCoalescer } from "@/extension/util/coalescer";

// Bộ theo dõi biến động tham chiếu Git (`.git/HEAD` và `.git/refs/**`) để phát hiện
// ngay lập tức khi chuyển nhánh, thêm commit mới hay tạo/xóa tag. Áp dụng cơ chế hoãn
// xử lý (debounce 150ms) gom các sự kiện liên tiếp thành một thông báo duy nhất.
// Tham khảo thiết kế:
// docs/02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md (Mục 3).

export const GIT_REF_DEBOUNCE_MS = 150;

export function watchGitRefs(
  repoPath: string,
  onChange: () => void | Promise<void>
): vscode.Disposable {
  const headWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(repoPath, ".git/HEAD")
  );
  const refsWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(repoPath, ".git/refs/**")
  );

  const coalescer = createCoalescer(GIT_REF_DEBOUNCE_MS, onChange);

  const listeners = [
    headWatcher.onDidChange(() => coalescer.trigger()),
    headWatcher.onDidCreate(() => coalescer.trigger()),
    headWatcher.onDidDelete(() => coalescer.trigger()),
    refsWatcher.onDidChange(() => coalescer.trigger()),
    refsWatcher.onDidCreate(() => coalescer.trigger()),
    refsWatcher.onDidDelete(() => coalescer.trigger())
  ];

  return vscode.Disposable.from(headWatcher, refsWatcher, ...listeners, coalescer);
}
