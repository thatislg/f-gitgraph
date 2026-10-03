import type { SimpleGit } from "simple-git";

import type { DateType, GitCommitNode, GitRef, GitRefData } from "@/types";

const eolRegex = /\r\n|\r|\n/g;
const gitLogSeparator = "XX7Nal-YARtTpjCikii9nJxER19D6diSyk-AWkPb";
const gitCommitSeparator = "YY9Commit-ZBpUq8vT7wL2kM4nE3xR1d-S5hJa";

/** Đọc refs (head/tag/remote) của kho, phục vụ gộp nhãn nhánh/tag vào từng commit. */
async function getRefs(git: SimpleGit, showRemoteBranches: boolean): Promise<GitRefData> {
  try {
    const args = ["show-ref"];
    if (!showRemoteBranches) {
      args.push("--heads", "--tags");
    }
    args.push("-d", "--head");
    const stdout = await git.raw(args);
    const refData: GitRefData = { head: null, refs: [] };
    const lines = stdout.split(eolRegex);
    for (const line of lines.slice(0, -1)) {
      const parts = line.split(" ");
      if (parts.length < 2) {
        continue;
      }
      const hash = parts.shift()!;
      const ref = parts.join(" ");
      if (ref.startsWith("refs/heads/")) {
        refData.refs.push({ hash, name: ref.substring(11), type: "head" });
      } else if (ref.startsWith("refs/tags/")) {
        refData.refs.push({
          hash,
          name: ref.endsWith("^{}") ? ref.substring(10, ref.length - 3) : ref.substring(10),
          type: "tag"
        });
      } else if (ref.startsWith("refs/remotes/")) {
        refData.refs.push({ hash, name: ref.substring(13), type: "remote" });
      } else if (ref === "HEAD") {
        refData.head = hash;
      }
    }
    return refData;
  } catch {
    return { head: null, refs: [] };
  }
}

/**
 * Trích xuất metadata (tác giả, email, ngày tháng, thông điệp, refs) cho một tập
 * hợp mã băm commit cụ thể, dùng để gộp với hình học từ nhân F#. Không đi theo
 * lịch sử (--no-walk) nên chỉ đọc đúng các commit được yêu cầu trong cửa sổ hiển thị.
 */
export async function getCommitMetadata(
  git: SimpleGit,
  hashes: string[],
  dateType: DateType,
  showRemoteBranches: boolean
): Promise<ReadonlyMap<string, GitCommitNode>> {
  if (hashes.length === 0) {
    return new Map();
  }

  const dateField = dateType === "Author Date" ? "%at" : "%ct";
  const format =
    ["%H", "%P", "%an", "%ae", dateField, "%s", "%b"].join(gitLogSeparator) + gitCommitSeparator;

  const [stdout, refData] = await Promise.all([
    git.raw(["log", "--no-walk", `--format=${format}`, ...hashes]).catch(() => ""),
    getRefs(git, showRemoteBranches)
  ]);

  const nodes = new Map<string, GitCommitNode>();
  for (const chunk of stdout.split(gitCommitSeparator)) {
    const trimmed = chunk.trim();
    if (!trimmed) {
      continue;
    }
    const parts = trimmed.split(gitLogSeparator);
    if (parts.length < 6) {
      continue;
    }
    const [hash, parents, author, email, date, message, ...bodyParts] = parts;
    if (
      hash === undefined ||
      parents === undefined ||
      author === undefined ||
      email === undefined ||
      date === undefined ||
      message === undefined
    ) {
      continue;
    }
    const body = bodyParts.join(gitLogSeparator).trim();
    nodes.set(hash, {
      hash,
      parentHashes: parents ? parents.split(" ") : [],
      author,
      email,
      date: parseInt(date),
      message,
      body: body || undefined,
      refs: []
    });
  }

  for (const ref of refData.refs) {
    const node = nodes.get(ref.hash);
    if (node !== undefined) {
      node.refs.push(ref as GitRef);
    }
  }

  return nodes;
}
