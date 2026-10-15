import * as fs from "node:fs";

import { simpleGit } from "simple-git";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getWorkspaceStatus,
  parseWorkspaceStatus,
  type WorkspaceStatusResult
} from "@/backend/queries/workspaceStatus";

import { git, makeRepo } from "@tests/backend/helpers";

const H = "0123456789abcdef0123456789abcdef01234567";
const Z = "0000000000000000000000000000000000000000";

/** Nối các bản ghi bằng byte NUL, mô phỏng đầu ra thô của `git status ... -z`. */
function nul(...records: string[]): string {
  return records.join("\0");
}

/** Bản ghi header nhánh hoàn chỉnh (oid + head + upstream + ab). */
const HEADERS = nul(
  `# branch.oid ${H}`,
  "# branch.head main",
  "# branch.upstream origin/main",
  "# branch.ab +2 -1"
);

describe("parseWorkspaceStatus", () => {
  it("parses branch headers", () => {
    const result = parseWorkspaceStatus(HEADERS);
    expect(result.head).toBe("main");
    expect(result.upstream).toBe("origin/main");
    expect(result.ahead).toBe(2);
    expect(result.behind).toBe(1);
    expect(result.stagedFiles).toEqual([]);
    expect(result.unstagedFiles).toEqual([]);
    expect(result.conflictedFiles).toEqual([]);
    expect(result.isClean).toBe(true);
  });

  it("marks a repo clean when only headers exist", () => {
    const result = parseWorkspaceStatus(nul("# branch.head main"));
    expect(result.isClean).toBe(true);
  });

  it("leaves upstream undefined when the header is absent", () => {
    const result = parseWorkspaceStatus(nul("# branch.head main"));
    expect(result.upstream).toBeUndefined();
    expect(result.ahead).toBe(0);
    expect(result.behind).toBe(0);
  });

  it("treats (initial) and (detached) markers as opaque head/oid values", () => {
    const result = parseWorkspaceStatus(nul("# branch.oid (initial)", "# branch.head (detached)"));
    expect(result.head).toBe("(detached)");
    expect(result.isClean).toBe(true);
  });

  it("parses a staged modified entry (M.)", () => {
    const result = parseWorkspaceStatus(
      nul(HEADERS, `1 M. N... 100644 100644 100644 ${H} ${H} src/a.ts`)
    );
    expect(result.stagedFiles).toEqual([{ path: "src/a.ts", status: "M" }]);
    expect(result.unstagedFiles).toEqual([]);
    expect(result.isClean).toBe(false);
  });

  it("parses an unstaged modified entry (.M)", () => {
    const result = parseWorkspaceStatus(
      nul(HEADERS, `1 .M N... 100644 100644 100644 ${H} ${H} src/a.ts`)
    );
    expect(result.stagedFiles).toEqual([]);
    expect(result.unstagedFiles).toEqual([{ path: "src/a.ts", status: "M", isUntracked: false }]);
  });

  it("splits a dual modified entry (MM) into both lists", () => {
    const result = parseWorkspaceStatus(
      nul(HEADERS, `1 MM N... 100644 100644 100644 ${H} ${H} src/a.ts`)
    );
    expect(result.stagedFiles).toEqual([{ path: "src/a.ts", status: "M" }]);
    expect(result.unstagedFiles).toEqual([{ path: "src/a.ts", status: "M", isUntracked: false }]);
  });

  it("parses staged added (A.) and dual added+modified (AM)", () => {
    const result = parseWorkspaceStatus(
      nul(
        HEADERS,
        `1 A. N... 000000 100644 100644 ${Z} ${H} new.ts`,
        `1 AM N... 000000 100644 100644 ${Z} ${H} am.ts`
      )
    );
    expect(result.stagedFiles).toEqual([
      { path: "new.ts", status: "A" },
      { path: "am.ts", status: "A" }
    ]);
    expect(result.unstagedFiles).toEqual([{ path: "am.ts", status: "M", isUntracked: false }]);
  });

  it("parses staged delete (D.) and unstaged delete (.D)", () => {
    const result = parseWorkspaceStatus(
      nul(
        HEADERS,
        `1 D. N... 100644 000000 000000 ${H} ${Z} gone.ts`,
        `1 .D N... 100644 100644 000000 ${H} ${H} deleted.ts`
      )
    );
    expect(result.stagedFiles).toEqual([{ path: "gone.ts", status: "D" }]);
    expect(result.unstagedFiles).toEqual([{ path: "deleted.ts", status: "D", isUntracked: false }]);
  });

  it("parses a rename (R.) with oldPath from the second NUL segment", () => {
    const result = parseWorkspaceStatus(
      nul(HEADERS, `2 R. N... 100644 100644 100644 ${H} ${H} R100 new/name.ts`, "old/name.ts")
    );
    expect(result.stagedFiles).toEqual([
      { path: "new/name.ts", status: "R", oldPath: "old/name.ts" }
    ]);
    expect(result.unstagedFiles).toEqual([]);
  });

  it("splits a dual renamed+modified entry (RM) into both lists", () => {
    const result = parseWorkspaceStatus(
      nul(HEADERS, `2 RM N... 100644 100644 100644 ${H} ${H} R92 new/name.ts`, "old/name.ts")
    );
    expect(result.stagedFiles).toEqual([
      { path: "new/name.ts", status: "R", oldPath: "old/name.ts" }
    ]);
    expect(result.unstagedFiles).toEqual([
      { path: "new/name.ts", status: "M", isUntracked: false }
    ]);
  });

  it("parses an untracked file (?) with isUntracked true", () => {
    const result = parseWorkspaceStatus(nul(HEADERS, "? untracked.txt"));
    expect(result.unstagedFiles).toEqual([
      { path: "untracked.txt", status: "U", isUntracked: true }
    ]);
  });

  it("routes conflict records (UU/AA/UD/DU) into conflictedFiles", () => {
    const conflict = (xy: string, name: string) =>
      `u ${xy} N... 100644 100644 100644 100644 ${H} ${H} ${H} ${name}`;
    const result = parseWorkspaceStatus(
      nul(
        HEADERS,
        conflict("UU", "a.txt"),
        conflict("AA", "b.txt"),
        conflict("UD", "c.txt"),
        conflict("DU", "d.txt")
      )
    );
    expect(result.conflictedFiles).toEqual([
      { path: "a.txt" },
      { path: "b.txt" },
      { path: "c.txt" },
      { path: "d.txt" }
    ]);
    expect(result.stagedFiles).toEqual([]);
    expect(result.unstagedFiles).toEqual([]);
    expect(result.isClean).toBe(false);
  });

  it("ignores ignored-file records (!)", () => {
    const result = parseWorkspaceStatus(nul(HEADERS, "! node_modules/"));
    expect(result.stagedFiles).toEqual([]);
    expect(result.unstagedFiles).toEqual([]);
    expect(result.isClean).toBe(true);
  });

  it("preserves filenames containing spaces and Vietnamese diacritics", () => {
    const result = parseWorkspaceStatus(
      nul(HEADERS, `1 .M N... 100644 100644 100644 ${H} ${H} đường dẫn có khoảng trắng.ts`)
    );
    expect(result.unstagedFiles).toEqual([
      { path: "đường dẫn có khoảng trắng.ts", status: "M", isUntracked: false }
    ]);
  });

  it("skips empty tokens produced by trailing NUL", () => {
    const result = parseWorkspaceStatus(
      nul(HEADERS, `1 M. N... 100644 100644 100644 ${H} ${H} a.ts`) + "\0"
    );
    expect(result.stagedFiles).toEqual([{ path: "a.ts", status: "M" }]);
  });
});

describe("getWorkspaceStatus", () => {
  let repo: string;

  beforeAll(() => {
    repo = makeRepo();
  });

  afterAll(() => {
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it("returns a clean snapshot for a freshly-created repo", async () => {
    const result = await getWorkspaceStatus(simpleGit(repo));
    expect(result.head).toBe("main");
    expect(result.upstream).toBeUndefined();
    expect(result.stagedFiles).toEqual([]);
    expect(result.unstagedFiles).toEqual([]);
    expect(result.conflictedFiles).toEqual([]);
    expect(result.isClean).toBe(true);
  });

  it("detects staged and untracked files via the real git command", async () => {
    fs.writeFileSync(`${repo}/staged.txt`, "content");
    git(["add", "staged.txt"], repo);

    fs.writeFileSync(`${repo}/untracked.txt`, "content");

    const result = await getWorkspaceStatus(simpleGit(repo));
    expect(result.stagedFiles).toEqual([{ path: "staged.txt", status: "A" }]);
    expect(result.unstagedFiles).toEqual([
      { path: "untracked.txt", status: "U", isUntracked: true }
    ]);
    expect(result.isClean).toBe(false);
  });

  it("reports a modified tracked file as unstaged", async () => {
    fs.writeFileSync(`${repo}/f`, "modified");
    const result = await getWorkspaceStatus(simpleGit(repo));
    expect(result.unstagedFiles).toContainEqual({
      path: "f",
      status: "M",
      isUntracked: false
    });
  });

  it("keeps shape stable for an empty string (command failure)", () => {
    const result = parseWorkspaceStatus("");
    const expected: WorkspaceStatusResult = {
      head: "",
      ahead: 0,
      behind: 0,
      stagedFiles: [],
      unstagedFiles: [],
      conflictedFiles: [],
      isClean: true
    };
    expect(result).toEqual(expected);
  });
});
