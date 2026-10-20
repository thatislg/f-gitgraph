import * as fs from "node:fs";

import { simpleGit } from "simple-git";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { remoteBranches } from "@/backend/queries/remoteBranches";

import { git, makeRepo } from "@tests/backend/helpers";

let remoteRepo: string;
let repoWithRemote: string;
let repoWithoutRemote: string;
let originalLang: string | undefined;

beforeAll(() => {
  originalLang = process.env["LANG"];
  process.env["LANG"] = "en_US.UTF-8";

  remoteRepo = makeRepo();
  git(["branch", "feature/foo"], remoteRepo);
  git(["checkout", "-b", "topic/bar"], remoteRepo);

  repoWithRemote = makeRepo();
  git(["remote", "add", "origin", remoteRepo], repoWithRemote);
  git(["fetch", "origin"], repoWithRemote);

  repoWithoutRemote = makeRepo();
});

afterAll(() => {
  if (originalLang === undefined) {
    delete process.env["LANG"];
  } else {
    process.env["LANG"] = originalLang;
  }
  fs.rmSync(remoteRepo, { recursive: true, force: true });
  fs.rmSync(repoWithRemote, { recursive: true, force: true });
  fs.rmSync(repoWithoutRemote, { recursive: true, force: true });
});

describe("remoteBranches", () => {
  it("groups remote-tracking branches by remote name (regression: '-r' short names)", async () => {
    const result = await remoteBranches(simpleGit(repoWithRemote), repoWithRemote);
    expect(result.repo).toBe(repoWithRemote);

    const origin = result.remotes.find((group) => group.name === "origin");
    expect(origin).toBeDefined();
    expect(origin?.branches.toSorted()).toEqual(["feature/foo", "main", "topic/bar"]);
  });

  it("excludes local-only branches from the remote grouping", async () => {
    git(["branch", "local-only"], repoWithRemote);
    const result = await remoteBranches(simpleGit(repoWithRemote), repoWithRemote);
    const allBranches = result.remotes.flatMap((group) => group.branches);
    // Nhánh local-only không tồn tại trên remote phải bị loại khỏi phân vùng REMOTES.
    expect(allBranches).not.toContain("local-only");
  });

  it("returns an empty list for a repo with no remotes", async () => {
    const result = await remoteBranches(simpleGit(repoWithoutRemote), repoWithoutRemote);
    expect(result.remotes).toEqual([]);
  });
});
