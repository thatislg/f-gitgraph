import type { SimpleGit } from "simple-git";

// Bộ truy vấn trạng thái kho làm việc: chạy `git status --porcelain=v2` và bóc tách
// dữ liệu phẳng thành cấu trúc có thứ tự, phân định rõ tệp đã stage và chưa stage.
// Tham khảo thiết kế:
// docs/02_design/phase3/01_Staging_Backend_And_Mutator_Design.md (Mục 3 & 4).

export type StagedFileStatus = "A" | "M" | "D" | "R";
export type UnstagedFileStatus = "M" | "D" | "U";

export type StagedFileRecord = {
  path: string;
  status: StagedFileStatus;
  oldPath?: string;
};

export type UnstagedFileRecord = {
  path: string;
  status: UnstagedFileStatus;
  isUntracked: boolean;
};

export type WorkspaceStatusResult = {
  head: string;
  upstream: string;
  ahead: number;
  behind: number;
  stagedFiles: StagedFileRecord[];
  unstagedFiles: UnstagedFileRecord[];
  isClean: boolean;
};

const eolRegex = /\r\n|\r|\n/;

/**
 * Bóc tách chuỗi đầu ra `git status --porcelain=v2 --branch -uall -c core.quotepath=false`
 * thành cấu trúc `WorkspaceStatusResult`. Hàm thuần, không phụ thuộc Git CLI nên có thể
 * kiểm thử độc lập bằng chuỗi giả lập.
 */
export function parseWorkspaceStatus(stdout: string): WorkspaceStatusResult {
  const stagedFiles: StagedFileRecord[] = [];
  const unstagedFiles: UnstagedFileRecord[] = [];
  let head = "";
  let upstream = "";
  let ahead = 0;
  let behind = 0;

  for (const rawLine of stdout.split(eolRegex)) {
    if (!rawLine) {
      continue;
    }

    if (rawLine.startsWith("# branch.head ")) {
      head = rawLine.slice("# branch.head ".length);
    } else if (rawLine.startsWith("# branch.upstream ")) {
      upstream = rawLine.slice("# branch.upstream ".length);
    } else if (rawLine.startsWith("# branch.ab ")) {
      const match = rawLine.match(/\+(\d+) -(\d+)/);
      if (match) {
        ahead = Number(match[1]);
        behind = Number(match[2]);
      }
    } else if (rawLine.startsWith("? ")) {
      unstagedFiles.push({
        path: rawLine.slice(2),
        status: "U",
        isUntracked: true
      });
    } else if (rawLine.startsWith("1 ")) {
      // `1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>` — path có thể chứa khoảng trắng.
      const parts = rawLine.split(" ");
      const xy = parts[1] ?? "";
      const path = parts.slice(8).join(" ");
      const x = xy[0];
      const y = xy[1];
      if (x === "A" || x === "M" || x === "D") {
        stagedFiles.push({ path, status: x });
      }
      if (y === "M" || y === "D") {
        unstagedFiles.push({ path, status: y, isUntracked: false });
      }
    } else if (rawLine.startsWith("2 ")) {
      // `2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path>\t<origPath>`.
      const pathAndOrig = rawLine.split(" ").slice(9).join(" ");
      const tabIndex = pathAndOrig.indexOf("\t");
      const path = tabIndex === -1 ? pathAndOrig : pathAndOrig.slice(0, tabIndex);
      if (tabIndex === -1) {
        stagedFiles.push({ path, status: "R" });
      } else {
        stagedFiles.push({ path, status: "R", oldPath: pathAndOrig.slice(tabIndex + 1) });
      }
    }
  }

  return {
    head,
    upstream,
    ahead,
    behind,
    stagedFiles,
    unstagedFiles,
    isClean: stagedFiles.length === 0 && unstagedFiles.length === 0
  };
}

/**
 * Thực thi `git status --porcelain=v2` để lấy ảnh chụp trạng thái kho rồi bóc tách.
 * `-c core.quotepath=false` giữ tên tệp tiếng Việt/ký tự đặc biệt dưới dạng UTF-8 thuần,
 * tránh mã hóa octal.
 */
export async function getWorkspaceStatus(git: SimpleGit): Promise<WorkspaceStatusResult> {
  const stdout = await git
    .raw(["-c", "core.quotepath=false", "status", "--porcelain=v2", "--branch", "-uall"])
    .catch(() => "");
  return parseWorkspaceStatus(stdout);
}
