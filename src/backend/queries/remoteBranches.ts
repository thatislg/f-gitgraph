import type { SimpleGit } from "simple-git";

import type { QueryResult } from "@/types";

type RemoteGroup = {
  name: string;
  branches: string[];
};

const REMOTE_PREFIX = "remotes/";

/** Nhóm danh sách nhánh remote phẳng (`remotes/<remote>/<branch>`) theo tên remote. */
function parseRemoteGroups(all: string[]): RemoteGroup[] {
  const groups = new Map<string, string[]>();

  for (const name of all) {
    if (!name.startsWith(REMOTE_PREFIX)) {
      continue;
    }
    const rest = name.slice(REMOTE_PREFIX.length);
    const slashIndex = rest.indexOf("/");
    if (slashIndex === -1) {
      continue;
    }
    const remoteName = rest.slice(0, slashIndex);
    const branchName = rest.slice(slashIndex + 1);
    // Bỏ qua mục symbolic `origin/HEAD -> origin/main` do simple-git liệt kê.
    if (branchName === "HEAD") {
      continue;
    }
    const list = groups.get(remoteName);
    if (list === undefined) {
      groups.set(remoteName, [branchName]);
    } else {
      list.push(branchName);
    }
  }

  return Array.from(groups, ([name, branches]) => ({ name, branches }));
}

/**
 * Nạp danh sách nhánh remote độc lập với cờ `showRemoteBranch`. Kết quả được nhóm theo
 * tên remote (ví dụ `origin`) để cung cấp cho phân vùng REMOTES của Sidebar, bảo đảm
 * cấu trúc máy chủ luôn hiển thị đầy đủ bất kể người dùng có bật/tắt bộ lọc nhánh remote
 * trên đồ thị DAG hay không.
 */
export async function remoteBranches(
  git: SimpleGit,
  repo: string
): Promise<QueryResult<"remoteBranches">> {
  try {
    const summary = await git.branch(["-r"]);
    return { repo, remotes: parseRemoteGroups(summary.all) };
  } catch {
    return { repo, remotes: [] };
  }
}
