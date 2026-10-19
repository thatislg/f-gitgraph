import type { SimpleGit } from "simple-git";

import type { SyncStatusResult } from "@/types";

// Bộ truy vấn số đếm chênh lệch đồng bộ giữa HEAD và nhánh upstream theo dõi.
// Thực thi qua `SimpleGit.raw(...)` để kế thừa `gitPath` và không kéo Node.js runtime
// vào tầng Webview. Kiểu trả về `SyncStatusResult` định nghĩa tại `src/types/queries.ts`.
// Tham khảo thiết kế:
// docs/02_design/phase3/05_Sync_And_Stash_Backend_Mutator_Design.md (Mục 3.1).

/**
 * Bóc tách đầu ra `git rev-list --left-right --count HEAD...@{u}` dạng
 * `<left>\t<right>` thành cặp số đếm `ahead` (trái, commit cục bộ chưa push) và
 * `behind` (phải, commit remote chưa pull). Hàm thuần, kiểm thử độc lập bằng chuỗi.
 */
export function parseAheadBehind(stdout: string): { ahead: number; behind: number } {
  const tokens = stdout.trim().split(/\s+/);
  const ahead = Number.parseInt(tokens[0] ?? "", 10);
  const behind = Number.parseInt(tokens[1] ?? "", 10);
  return {
    ahead: Number.isFinite(ahead) ? ahead : 0,
    behind: Number.isFinite(behind) ? behind : 0
  };
}

/**
 * Xác định trạng thái đồng bộ theo thuật toán 3 bước:
 * 1. Kiểm tra Detached HEAD qua `git rev-parse --abbrev-ref HEAD`.
 * 2. Xác định nhánh upstream qua `git rev-parse --abbrev-ref --symbolic-full-name @{u}`.
 * 3. Đếm commit chênh lệch qua `git rev-list --left-right --count HEAD...@{u}`.
 * Mọi trường hợp thất bại đều fallback an toàn thay vì ném exception.
 */
export async function getSyncStatus(git: SimpleGit): Promise<SyncStatusResult> {
  const head = await git.raw(["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => "");
  if (head.trim() === "" || head.trim() === "HEAD") {
    return { isDetached: true, upstream: null, ahead: 0, behind: 0 };
  }

  const upstreamRaw = await git
    .raw(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
    .catch(() => "");
  if (upstreamRaw.trim() === "") {
    return { isDetached: false, upstream: null, ahead: 0, behind: 0 };
  }
  const upstream = upstreamRaw.trim();

  const countRaw = await git
    .raw(["rev-list", "--left-right", "--count", "HEAD...@{u}"])
    .catch(() => "");
  if (countRaw.trim() === "") {
    return { isDetached: false, upstream, ahead: 0, behind: 0 };
  }
  const { ahead, behind } = parseAheadBehind(countRaw);
  return { isDetached: false, upstream, ahead, behind };
}
