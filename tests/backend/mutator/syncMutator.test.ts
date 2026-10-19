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

/** Tạo một commit mới trên remote (qua một bản clone) rồi dọn dẹp. */
function commitToRemote(remote: string, file: string, content: string, message: string): void {
  const clone = track(fs.mkdtempSync(path.join(os.tmpdir(), "ngg-clone-")));
  cp.execFileSync("git", ["clone", remote, clone]);
  configure(clone);
  fs.writeFileSync(path.join(clone, file), content);
  gitOut(["add", file], clone);
  gitOut(["commit", "-m", message], clone);
  gitOut(["push"], clone);
}

/** Dựng kho cục bộ + remote bare, đẩy nhánh main lên upstream. */
function setupRemote(): { repo: string; remote: string; mutator: GitCliMutator } {
  const repo = track(makeRepo());
  const remote = makeBareRemote();
  gitOut(["remote", "add", "origin", remote], repo);
  gitOut(["push", "-u", "origin", "main"], repo);
  return { repo, remote, mutator: new GitCliMutator({ repoPath: repo }) };
}

describe("GitCliMutator sync & stash", () => {
  it("fetchAll succeeds with --prune against a local bare remote", async () => {
    const { mutator } = setupRemote();
    const result = await mutator.fetchAll(true);
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("pull('merge') integrates upstream commits", async () => {
    const { repo, remote, mutator } = setupRemote();
    commitToRemote(remote, "remote.txt", "remote content", "remote commit");

    const result = await mutator.pull("merge");
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(repo, "remote.txt"))).toBe(true);
  });

  it("pull('rebase') re-applies local commits on top of upstream", async () => {
    const { repo, remote, mutator } = setupRemote();

    // Commit cục bộ tạo nhánh phân kỳ.
    fs.writeFileSync(path.join(repo, "local.txt"), "local");
    gitOut(["add", "local.txt"], repo);
    gitOut(["commit", "-m", "local commit"], repo);

    // Commit mới trên remote.
    commitToRemote(remote, "remote.txt", "remote content", "remote commit");

    const result = await mutator.pull("rebase");
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(repo, "remote.txt"))).toBe(true);
    expect(fs.existsSync(path.join(repo, "local.txt"))).toBe(true);
  });

  it("pull('merge') reports conflict with a normalized English message", async () => {
    const { repo, remote, mutator } = setupRemote();

    // Sửa cùng tệp `f` ở cả local và remote với nội dung khác nhau.
    fs.writeFileSync(path.join(repo, "f"), "local content");
    gitOut(["add", "f"], repo);
    gitOut(["commit", "-m", "local change"], repo);

    commitToRemote(remote, "f", "remote content", "remote change");

    const result = await mutator.pull("merge");
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("Merge conflict detected");
  });

  it("push succeeds then force-with-lease protects against non-fast-forward", async () => {
    const { repo, remote, mutator } = setupRemote();

    // Push một commit mới thành công.
    fs.writeFileSync(path.join(repo, "push.txt"), "push");
    gitOut(["add", "push.txt"], repo);
    gitOut(["commit", "-m", "push commit"], repo);
    const pushed = await mutator.push();
    expect(pushed.ok).toBe(true);

    // Remote và local phân kỳ.
    commitToRemote(remote, "div.txt", "div", "remote diverged");
    fs.writeFileSync(path.join(repo, "local2.txt"), "local2");
    gitOut(["add", "local2.txt"], repo);
    gitOut(["commit", "-m", "local diverged"], repo);

    const rejected = await mutator.push({ forceWithLease: true });
    expect(rejected.ok).toBe(false);
    expect(rejected.stderr).toContain("Push rejected");
  });

  it("stashSave / stashPop / stashDrop round-trips tracked and untracked files", async () => {
    const { repo, mutator } = setupRemote();

    fs.writeFileSync(path.join(repo, "f"), "tracked change");
    fs.writeFileSync(path.join(repo, "untracked.txt"), "untracked");
    expect(gitOut(["status", "--porcelain"], repo).trim()).not.toBe("");

    const saved = await mutator.stashSave("test stash", true);
    expect(saved.ok).toBe(true);
    // Working tree sạch sau khi stash (kể cả untracked).
    expect(gitOut(["status", "--porcelain"], repo).trim()).toBe("");

    const popped = await mutator.stashPop(0);
    expect(popped.ok).toBe(true);
    expect(fs.readFileSync(path.join(repo, "f"), "utf8")).toBe("tracked change");
    expect(fs.readFileSync(path.join(repo, "untracked.txt"), "utf8")).toBe("untracked");
  });

  it("stashPop normalizes a missing stash entry into an English message", async () => {
    const { mutator } = setupRemote();
    const result = await mutator.stashPop(0);
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("does not exist or has already been dropped");
  });
});
