import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GitCliMutator } from "@/extension/mutator/gitCliMutator";

import { makeRepo } from "@tests/backend/helpers";

let repo: string;
let mutator: GitCliMutator;

beforeAll(() => {
  repo = makeRepo();
  mutator = new GitCliMutator({ repoPath: repo });
});

afterAll(() => {
  fs.rmSync(repo, { recursive: true, force: true });
});

function gitOut(args: string[]): string {
  return cp.execFileSync("git", args, { cwd: repo, encoding: "utf8" });
}

function branches(): string[] {
  return gitOut(["branch", "--format=%(refname:short)"])
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

describe("GitCliMutator", () => {
  it("validates branch names", async () => {
    expect(await mutator.isValidRefName("feature/x", "branch")).toBe(true);
    expect(await mutator.isValidRefName("bad name", "branch")).toBe(false);
    expect(await mutator.isValidRefName("bad..name", "branch")).toBe(false);
  });

  it("creates and deletes a branch", async () => {
    const created = await mutator.createBranch("feature/one", "HEAD");
    expect(created.ok).toBe(true);
    expect(branches()).toContain("feature/one");

    const deleted = await mutator.deleteBranch("feature/one");
    expect(deleted.ok).toBe(true);
    expect(branches()).not.toContain("feature/one");
  });

  it("rejects creating a branch with an invalid name", async () => {
    const result = await mutator.createBranch("not a valid branch", "HEAD");
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("tên nhánh không hợp lệ");
  });

  it("commits a new change", async () => {
    fs.writeFileSync(path.join(repo, "f"), "changed");
    gitOut(["add", "."]);
    const result = await mutator.commit("thêm thay đổi", { sign: false });
    expect(result.ok).toBe(true);
  });

  it("creates an annotated tag", async () => {
    const result = await mutator.addTag("v1.0.0", "phát hành v1");
    expect(result.ok).toBe(true);
    const tags = gitOut(["tag", "--list"]).trim().split("\n");
    expect(tags).toContain("v1.0.0");
  });

  it("checks out a branch", async () => {
    await mutator.createBranch("feature/two", "HEAD");
    const result = await mutator.checkout("feature/two");
    expect(result.ok).toBe(true);
    expect(gitOut(["branch", "--show-current"]).trim()).toBe("feature/two");
  });

  it("probes Git version and caches canUseRestore", async () => {
    const supports = await mutator.canUseRestore();
    expect(typeof supports).toBe("boolean");
    // Lần gọi thứ hai dùng cache
    expect(await mutator.canUseRestore()).toBe(supports);
  });

  it("stages and unstages a specific file", async () => {
    const filePath = "stage_test.txt";
    fs.writeFileSync(path.join(repo, filePath), "test content");

    // Stage tệp
    const stageRes = await mutator.stageFile(filePath);
    expect(stageRes.ok).toBe(true);
    expect(gitOut(["status", "--porcelain"])).toContain("A  stage_test.txt");

    // Unstage tệp
    const unstageRes = await mutator.unstageFile(filePath);
    expect(unstageRes.ok).toBe(true);
    expect(gitOut(["status", "--porcelain"])).toContain("?? stage_test.txt");

    // Dọn dẹp
    fs.rmSync(path.join(repo, filePath));
  });

  it("stages all and unstages all files", async () => {
    const file1 = "all_test_1.txt";
    const file2 = "all_test_2.txt";
    fs.writeFileSync(path.join(repo, file1), "content 1");
    fs.writeFileSync(path.join(repo, file2), "content 2");

    // Stage all
    const stageAllRes = await mutator.stageAll();
    expect(stageAllRes.ok).toBe(true);
    const statusStaged = gitOut(["status", "--porcelain"]);
    expect(statusStaged).toContain("A  all_test_1.txt");
    expect(statusStaged).toContain("A  all_test_2.txt");

    // Unstage all
    const unstageAllRes = await mutator.unstageAll();
    expect(unstageAllRes.ok).toBe(true);
    const statusUnstaged = gitOut(["status", "--porcelain"]);
    expect(statusUnstaged).toContain("?? all_test_1.txt");
    expect(statusUnstaged).toContain("?? all_test_2.txt");

    // Dọn dẹp
    fs.rmSync(path.join(repo, file1));
    fs.rmSync(path.join(repo, file2));
  });

  it("discards changes in a tracked file and cleans untracked file", async () => {
    // 1. Untracked file
    const untracked = "untracked_to_clean.txt";
    fs.writeFileSync(path.join(repo, untracked), "untracked");
    expect(fs.existsSync(path.join(repo, untracked))).toBe(true);
    const cleanRes = await mutator.discardFileChanges(untracked, true);
    expect(cleanRes.ok).toBe(true);
    expect(fs.existsSync(path.join(repo, untracked))).toBe(false);

    // 2. Tracked file
    fs.writeFileSync(path.join(repo, "f"), "original");
    gitOut(["add", "f"]);
    gitOut(["commit", "-m", "commit f original"]);

    fs.writeFileSync(path.join(repo, "f"), "modified content");
    expect(fs.readFileSync(path.join(repo, "f"), "utf8")).toBe("modified content");

    const discardRes = await mutator.discardFileChanges("f", false);
    expect(discardRes.ok).toBe(true);
    expect(fs.readFileSync(path.join(repo, "f"), "utf8")).toBe("original");
  });

  it("commits with description and supports amend", async () => {
    fs.writeFileSync(path.join(repo, "f"), "amend content");
    await mutator.stageFile("f");

    const commitRes = await mutator.commit("initial title", {
      description: "detailed body line 1\nline 2"
    });
    expect(commitRes.ok).toBe(true);

    const logMsg = gitOut(["log", "-1", "--pretty=%B"]).trim();
    expect(logMsg).toContain("initial title");
    expect(logMsg).toContain("detailed body line 1");

    // Amend commit message
    const amendRes = await mutator.commit("amended title", {
      amend: true,
      description: "amended body"
    });
    expect(amendRes.ok).toBe(true);

    const amendedLog = gitOut(["log", "-1", "--pretty=%B"]).trim();
    expect(amendedLog).toContain("amended title");
    expect(amendedLog).toContain("amended body");
    expect(amendedLog).not.toContain("initial title");
  });
});
