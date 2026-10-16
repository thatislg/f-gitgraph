import type { SimpleGit } from "simple-git";

import type { QueryResult } from "@/types";

const eolRegex = /\r\n|\r|\n/;

export type HeadCommitMessage = {
  subject: string;
  description: string;
};

/**
 * Đọc thông điệp của commit HEAD để nạp sẵn vào ô soạn thảo khi bật chế độ Amend.
 * Tiêu đề là dòng đầu tiên (`%s`), mô tả là phần thân còn lại (`%b`).
 */
export async function getHeadCommitMessage(git: SimpleGit): Promise<QueryResult<"headCommit">> {
  try {
    const stdout = await git.raw(["show", "--no-patch", "--format=%s%n%b", "HEAD"]);
    const normalized = stdout.replace(eolRegex, "\n").replace(/\n+$/, "");
    const newlineIndex = normalized.indexOf("\n");
    const subject = newlineIndex === -1 ? normalized : normalized.slice(0, newlineIndex);
    const description = newlineIndex === -1 ? "" : normalized.slice(newlineIndex + 1);
    return { headCommit: { subject, description } };
  } catch {
    return { headCommit: null };
  }
}
