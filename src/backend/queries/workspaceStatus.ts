import type { SimpleGit } from "simple-git";

// Bộ truy vấn trạng thái kho làm việc: chạy
// `git status --porcelain=v2 --branch --untracked-files=all -c core.quotepath=false -z`
// và bóc tách luồng byte phân tách bằng NUL thành cấu trúc có thứ tự, phân định rõ tệp
// đã stage, chưa stage và đang xung đột.
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

export type ConflictedFileRecord = {
  path: string;
};

export type WorkspaceStatusResult = {
  head: string;
  upstream?: string;
  ahead: number;
  behind: number;
  stagedFiles: StagedFileRecord[];
  unstagedFiles: UnstagedFileRecord[];
  conflictedFiles: ConflictedFileRecord[];
  isClean: boolean;
};

/** Trích xuất đường dẫn từ token sau khi loại bỏ `fieldCount` trường cố định đầu tiên. */
function extractPath(parts: string[], fieldCount: number): string {
  return parts.slice(fieldCount).join(" ");
}

/**
 * Bóc tách chuỗi đầu ra `git status --porcelain=v2 --branch --untracked-files=all -z`
 * thành cấu trúc `WorkspaceStatusResult`. Hàm thuần, không phụ thuộc Git CLI nên có thể
 * kiểm thử độc lập bằng chuỗi giả lập.
 *
 * Luồng byte được phân tách bằng ký tự NUL (`\0`). Bản ghi đổi tên/sao chép (loại `2`)
 * chiếm hai phân đoạn NUL liên tiếp nên máy trạng thái duyệt token theo chỉ mục để đọc
 * đúng `origPath`.
 */
export function parseWorkspaceStatus(stdout: string): WorkspaceStatusResult {
  const stagedFiles: StagedFileRecord[] = [];
  const unstagedFiles: UnstagedFileRecord[] = [];
  const conflictedFiles: ConflictedFileRecord[] = [];
  let head = "";
  let upstream: string | undefined;
  let ahead = 0;
  let behind = 0;

  const tokens = stdout.split("\0");
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index] ?? "";

    if (token === "") {
      index += 1;
      continue;
    }

    const first = token[0];

    // 1. Siêu dữ liệu nhánh (bắt đầu bằng `#`).
    if (first === "#") {
      const parts = token.split(" ");
      const key = parts[1];
      if (key === "branch.head") {
        head = parts.slice(2).join(" ");
      } else if (key === "branch.upstream") {
        upstream = parts.slice(2).join(" ");
      } else if (key === "branch.ab") {
        const plus = parts[2];
        const minus = parts[3];
        if (plus !== undefined && plus.startsWith("+")) {
          ahead = Number(plus.slice(1)) || 0;
        }
        if (minus !== undefined && minus.startsWith("-")) {
          behind = Number(minus.slice(1)) || 0;
        }
      }
      index += 1;
      continue;
    }

    // 2. Tệp biến động thông thường: `1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>`.
    if (first === "1") {
      const parts = token.split(" ");
      const xy = parts[1] ?? "";
      const path = extractPath(parts, 8);
      const x = xy[0];
      const y = xy[1];
      if (x !== undefined && x !== ".") {
        stagedFiles.push({ path, status: x as StagedFileStatus });
      }
      if (y !== undefined && y !== ".") {
        unstagedFiles.push({ path, status: y as UnstagedFileStatus, isUntracked: false });
      }
      index += 1;
      continue;
    }

    // 3. Tệp đổi tên/sao chép: `2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <Xscore> <path>`
    //    theo sau là token NUL chứa `origPath`.
    if (first === "2") {
      const parts = token.split(" ");
      const xy = parts[1] ?? "";
      const path = extractPath(parts, 9);
      const origPath = tokens[index + 1] ?? "";
      const x = xy[0];
      const y = xy[1];
      if (x !== undefined && x !== ".") {
        stagedFiles.push({ path, status: "R", oldPath: origPath });
      }
      if (y !== undefined && y !== ".") {
        unstagedFiles.push({ path, status: y as UnstagedFileStatus, isUntracked: false });
      }
      index += 2;
      continue;
    }

    // 4. Tệp xung đột chưa hợp nhất: `u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>`.
    if (first === "u") {
      const parts = token.split(" ");
      const path = extractPath(parts, 10);
      conflictedFiles.push({ path });
      index += 1;
      continue;
    }

    // 5. Tệp chưa theo dõi: `? <path>`.
    if (first === "?") {
      const path = token.slice(2);
      unstagedFiles.push({ path, status: "U", isUntracked: true });
      index += 1;
      continue;
    }

    // 6. Tệp bị bỏ qua (`! <path>`) và mọi bản ghi không nhận diện được — bỏ qua.
    index += 1;
  }

  return {
    head,
    ...(upstream !== undefined ? { upstream } : {}),
    ahead,
    behind,
    stagedFiles,
    unstagedFiles,
    conflictedFiles,
    isClean: stagedFiles.length === 0 && unstagedFiles.length === 0 && conflictedFiles.length === 0
  };
}

/**
 * Thực thi `git status --porcelain=v2 --branch --untracked-files=all -z` để lấy ảnh chụp
 * trạng thái kho rồi bóc tách. `-c core.quotepath=false` giữ tên tệp tiếng Việt/ký tự đặc
 * biệt dưới dạng UTF-8 thuần, tránh mã hóa octal; `-z` phân tách bản ghi bằng NUL để bảo
 * toàn tên tệp chứa ký tự xuống dòng/tab.
 */
export async function getWorkspaceStatus(git: SimpleGit): Promise<WorkspaceStatusResult> {
  const stdout = await git
    .raw([
      "-c",
      "core.quotepath=false",
      "status",
      "--porcelain=v2",
      "--branch",
      "--untracked-files=all",
      "-z"
    ])
    .catch(() => "");
  return parseWorkspaceStatus(stdout);
}
