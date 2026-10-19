import type { SimpleGit } from "simple-git";

import type { ListTagsInput, TagListResult } from "@/types";

// Bộ truy vấn danh sách release tags. Thực thi qua `SimpleGit.raw(...)` và bóc tách từng
// dòng tên tag thành mảng chuỗi `string[]`.
// Kiểu trả về `TagListResult` định nghĩa tại `src/types/queries.ts`.
// Tham khảo thiết kế:
// docs/02_design/phase3/05_Sync_And_Stash_Backend_Mutator_Design.md (Mục 3.3).

/**
 * Bóc tách đầu ra `git tag --list` thành mảng tên tag. Mỗi tag nằm trên một dòng; các
 * dòng rỗng bị bỏ qua, tên tag được cắt khoảng trắng đầu cuối và bảo toàn nguyên vẹn
 * Unicode tiếng Việt cùng các ký tự hợp lệ theo `git check-ref-format` (`/`, `-`, `.`, `+`).
 * Hàm thuần, tương thích ngắt dòng đa nền tảng (Windows `\r\n` và Unix `\n`).
 */
export function parseTagList(stdout: string): string[] {
  const tags: string[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const tag = line.trim();
    if (tag === "") {
      continue;
    }
    tags.push(tag);
  }
  return tags;
}

/**
 * Thực thi `git tag --list --sort=-creatordate` (mặc định, mốc mới nhất lên đầu) hoặc
 * `git tag --list` (khi `sort === "name"`, Git tự xếp theo refname A-Z) rồi bóc tách.
 * Danh sách rỗng hoặc lệnh thất bại đều trả về `{ tags: [] }`.
 */
export async function listTags(git: SimpleGit, input?: ListTagsInput): Promise<TagListResult> {
  const args =
    input?.sort === "name" ? ["tag", "--list"] : ["tag", "--list", "--sort=-creatordate"];
  const stdout = await git.raw(args).catch(() => "");
  if (stdout.trim() === "") {
    return { tags: [] };
  }
  return { tags: parseTagList(stdout) };
}
