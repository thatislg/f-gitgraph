import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { simpleGit } from "simple-git";
import { afterAll, describe, expect, it } from "vitest";

import { getSyncStatus, parseAheadBehind } from "@/backend/queries/syncStatus";

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

function commitToRemote(remote: string, file: string, content: string, message: string): void {
  const clone = track(fs.mkdtempSync(path.join(os.tmpdir(), "ngg-clone-")));
  cp.execFileSync("git", ["clone", remote, clone]);
  configure(clone);
  fs.writeFileSync(path.join(clone, file), content);
  gitOut(["add", file], clone);
  gitOut(["commit", "-m", message], clone);
  gitOut(["push"], clone);
}

function setupRemote(): { repo: string; remote: string } {
  const repo = track(makeRepo());
  const remote = makeBareRemote();
  gitOut(["remote", "add", "origin", remote], repo);
  gitOut(["push", "-u", "origin", "main"], repo);
  return { repo, remote };
}

function localCommit(repo: string, file: string, content: string, message: string): void {
  fs.writeFileSync(path.join(repo, file), content);
  gitOut(["add", file], repo);
  gitOut(["commit", "-m", message], repo);
}

describe("parseAheadBehind", () => {
  it("parses left/right counts separated by tab or whitespace", () => {
    expect(parseAheadBehind("2\t3\n")).toEqual({ ahead: 2, behind: 3 });
    expect(parseAheadBehind("0\t0\n")).toEqual({ ahead: 0, behind: 0 });
    expect(parseAheadBehind("5 1\n")).toEqual({ ahead: 5, behind: 1 });
  });

  it("falls back to zero for empty or invalid input", () => {
    expect(parseAheadBehind("")).toEqual({ ahead: 0, behind: 0 });
    expect(parseAheadBehind("foo\tbar")).toEqual({ ahead: 0, behind: 0 });
  });
});

describe("getSyncStatus", () => {
  it("reports clean state when local matches upstream", async () => {
    const { repo } = setupRemote();
    const result = await getSyncStatus(simpleGit(repo));
    expect(result).toEqual({
      isDetached: false,
      upstream: "origin/main",
      ahead: 0,
      behind: 0
    });
  });

  it("reports ahead when local has unpushed commits", async () => {
    const { repo } = setupRemote();
    localCommit(repo, "a.txt", "a", "a");
    localCommit(repo, "b.txt", "b", "b");
    localCommit(repo, "c.txt", "c", "c");

    const result = await getSyncStatus(simpleGit(repo));
    expect(result.ahead).toBe(3);
    expect(result.behind).toBe(0);
    expect(result.upstream).toBe("origin/main");
  });

  it("reports behind when remote has new commits", async () => {
    const { repo, remote } = setupRemote();
    commitToRemote(remote, "r1.txt", "r1", "r1");
    commitToRemote(remote, "r2.txt", "r2", "r2");
    gitOut(["fetch", "origin"], repo);

    const result = await getSyncStatus(simpleGit(repo));
    expect(result.ahead).toBe(0);
    expect(result.behind).toBe(2);
  });

  it("reports both ahead and behind when histories diverge", async () => {
    const { repo, remote } = setupRemote();
    localCommit(repo, "a.txt", "a", "a");
    localCommit(repo, "b.txt", "b", "b");
    commitToRemote(remote, "r1.txt", "r1", "r1");
    commitToRemote(remote, "r2.txt", "r2", "r2");
    commitToRemote(remote, "r3.txt", "r3", "r3");
    gitOut(["fetch", "origin"], repo);

    const result = await getSyncStatus(simpleGit(repo));
    expect(result.ahead).toBe(2);
    expect(result.behind).toBe(3);
  });

  it("reports null upstream for a branch without tracking", async () => {
    const { repo } = setupRemote();
    gitOut(["checkout", "-b", "feature/untracked"], repo);

    const result = await getSyncStatus(simpleGit(repo));
    expect(result).toEqual({
      isDetached: false,
      upstream: null,
      ahead: 0,
      behind: 0
    });
  });

  it("reports detached HEAD state", async () => {
    const { repo } = setupRemote();
    const hash = gitOut(["rev-parse", "HEAD"], repo).trim();
    gitOut(["checkout", hash], repo);

    const result = await getSyncStatus(simpleGit(repo));
    expect(result.isDetached).toBe(true);
    expect(result.upstream).toBeNull();
  });
});
