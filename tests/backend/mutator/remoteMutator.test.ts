import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { GitCliMutator } from "@/extension/mutator/gitCliMutator";

import { makeRepo } from "@tests/backend/helpers";

const tmpDirs: string[] = [];

function track(dir: string): string {
  tmpDirs.push(dir);
  return dir;
}

afterAll(() => {
  tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
});

function makeBareRemote(): string {
  const dir = track(fs.mkdtempSync(path.join(os.tmpdir(), "ngg-remote-")));
  cp.execFileSync("git", ["init", "--bare", "--initial-branch=main"], { cwd: dir });
  return dir;
}

function gitOut(args: string[], cwd: string): string {
  return cp.execFileSync("git", args, { cwd, encoding: "utf8" });
}

function configure(dir: string): void {
  gitOut(["config", "user.email", "t@t.com"], dir);
  gitOut(["config", "user.name", "T"], dir);
  gitOut(["config", "commit.gpgsign", "false"], dir);
}

/** Dựng kho cục bộ + remote bare, đẩy nhánh main lên upstream. */
function setupRemote(): { repo: string; remote: string; mutator: GitCliMutator } {
  const repo = track(makeRepo());
  const remote = makeBareRemote();
  gitOut(["remote", "add", "origin", remote], repo);
  gitOut(["push", "-u", "origin", "main"], repo);
  return { repo, remote, mutator: new GitCliMutator({ repoPath: repo }) };
}

/** Tạo một nhánh mới trên remote (qua một bản clone) rồi dọn dẹp. */
function commitBranchToRemote(
  remote: string,
  branch: string,
  file: string,
  content: string,
  message: string
): void {
  const clone = track(fs.mkdtempSync(path.join(os.tmpdir(), "ngg-clone-")));
  cp.execFileSync("git", ["clone", remote, clone]);
  configure(clone);
  gitOut(["checkout", "-b", branch], clone);
  fs.writeFileSync(path.join(clone, file), content);
  gitOut(["add", file], clone);
  gitOut(["commit", "-m", message], clone);
  gitOut(["push", "-u", "origin", branch], clone);
}

describe("GitCliMutator remote branches", () => {
  it("checkoutRemoteBranch creates a local tracking branch from remote", async () => {
    const { repo, remote, mutator } = setupRemote();
    commitBranchToRemote(remote, "feature", "f.txt", "feature content", "feature commit");

    await mutator.fetchAll(true);
    const result = await mutator.checkoutRemoteBranch("origin", "feature", "feature-local");

    expect(result.ok).toBe(true);
    expect(gitOut(["branch"], repo)).toContain("feature-local");
    expect(fs.readFileSync(path.join(repo, "f.txt"), "utf8")).toBe("feature content");
  });

  it("checkoutRemoteBranch rejects an invalid local branch name", async () => {
    const { mutator } = setupRemote();
    const result = await mutator.checkoutRemoteBranch("origin", "main", "bad name");
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("tên nhánh không hợp lệ");
  });

  it("pullRemote pulls a specific remote branch into the current branch", async () => {
    const { repo, remote, mutator } = setupRemote();
    commitBranchToRemote(remote, "feature", "f.txt", "feature content", "feature commit");

    const result = await mutator.pullRemote("origin", "feature");

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(repo, "f.txt"))).toBe(true);
  });

  it("deleteRemoteBranch permanently removes the branch from the remote", async () => {
    const { repo, remote, mutator } = setupRemote();
    commitBranchToRemote(remote, "feature", "f.txt", "x", "feature commit");

    const result = await mutator.deleteRemoteBranch("origin", "feature");

    expect(result.ok).toBe(true);
    expect(gitOut(["ls-remote", "--heads", remote], repo)).not.toContain("feature");
  });
});
