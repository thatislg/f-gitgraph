import type { SimpleGit } from "simple-git";

import type { StashListResult, StashRecord } from "@/types";

// Bộ truy vấn danh sách ngăn xếp stash. Thực thi qua `SimpleGit.raw(...)` và bóc tách
// luồng byte phân tách bằng NUL (`%x00`) thành mảng `StashRecord`.
// Kiểu trả về `StashListResult` định nghĩa tại `src/types/queries.ts`.
// Tham khảo thiết kế:
// docs/02_design/phase3/05_Sync_And_Stash_Backend_Mutator_Design.md (Mục 3.2).

/**
 * Bóc tách đầu ra `git stash list --pretty=format:%gd%x00%h%x00%gs%x00%cr` thành
 * mảng `StashRecord`. Mỗi bản ghi nằm trên một dòng, các trường trong dòng được phân
 * tách bằng byte NUL. Hàm thuần, bảo toàn Unicode tiếng Việt và ký tự đặc biệt.
 */
export function parseStashList(stdout: string): StashRecord[] {
  const stashes: StashRecord[] = [];
  const lines = stdout.split("\n");

  lines.forEach((line, lineIndex) => {
    if (line.trim() === "") {
      return;
    }
    const tokens = line.split("\0");
    const ref = tokens[0] ?? "";
    const indexMatch = /^stash@\{(\d+)\}$/.exec(ref);
    const parsedIndex = indexMatch !== null ? Number.parseInt(indexMatch[1] ?? "", 10) : lineIndex;

    stashes.push({
      index: Number.isFinite(parsedIndex) ? parsedIndex : lineIndex,
      hash: (tokens[1] ?? "").trim(),
      message: (tokens[2] ?? "").trim(),
      date: (tokens[3] ?? "").trim()
    });
  });

  return stashes;
}

/**
 * Thực thi `git stash list --pretty=format:%gd%x00%h%x00%gs%x00%cr` rồi bóc tách.
 * Danh sách rỗng hoặc lệnh thất bại đều trả về mảng rỗng `{ stashes: [] }`.
 */
export async function getStashList(git: SimpleGit): Promise<StashListResult> {
  const stdout = await git
    .raw(["stash", "list", "--pretty=format:%gd%x00%h%x00%gs%x00%cr"])
    .catch(() => "");
  if (stdout.trim() === "") {
    return { stashes: [] };
  }
  return { stashes: parseStashList(stdout) };
}
