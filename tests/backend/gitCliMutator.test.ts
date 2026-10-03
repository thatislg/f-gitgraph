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
});
