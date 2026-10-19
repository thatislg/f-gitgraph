import * as fs from "node:fs";
import * as path from "node:path";

import { simpleGit } from "simple-git";
import { afterAll, describe, expect, it } from "vitest";

import { getStashList, parseStashList } from "@/backend/queries/stashList";

import { git, makeRepo } from "@tests/backend/helpers";

const tmpDirs: string[] = [];

function track(dir: string): string {
  tmpDirs.push(dir);
  return dir;
}

afterAll(() => {
  tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
});

describe("parseStashList", () => {
  it("parses a single stash record", () => {
    const result = parseStashList(
      "stash@{0}\x00abc1234\x00WIP on main: 1234567 init\x0010 minutes ago\n"
    );
    expect(result).toEqual([
      { index: 0, hash: "abc1234", message: "WIP on main: 1234567 init", date: "10 minutes ago" }
    ]);
  });

  it("parses multiple stashes preserving index order", () => {
    const result = parseStashList(
      "stash@{0}\x00aaa1111\x00message 0\x001 hour ago\n" +
        "stash@{1}\x00bbb2222\x00message 1\x002 hours ago\n" +
        "stash@{2}\x00ccc3333\x00message 2\x003 hours ago\n"
    );
    expect(result.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(result.map((s) => s.hash)).toEqual(["aaa1111", "bbb2222", "ccc3333"]);
    expect(result.map((s) => s.message)).toEqual(["message 0", "message 1", "message 2"]);
  });

  it("preserves Vietnamese unicode and special characters in the message", () => {
    const result = parseStashList(
      'stash@{0}\x00abc1234\x00stash tiếng Việt: "dấu nháy", dấu: hai chấm\x00vài giây trước\n'
    );
    expect(result[0]?.message).toBe('stash tiếng Việt: "dấu nháy", dấu: hai chấm');
    expect(result[0]?.date).toBe("vài giây trước");
  });

  it("returns an empty array for empty or whitespace-only input", () => {
    expect(parseStashList("")).toEqual([]);
    expect(parseStashList("  \n")).toEqual([]);
  });
});

describe("getStashList", () => {
  it("returns an empty list for a repo with no stashes", async () => {
    const repo = track(makeRepo());
    const result = await getStashList(simpleGit(repo));
    expect(result.stashes).toEqual([]);
  });

  it("parses a real stash entry with its message", async () => {
    const repo = track(makeRepo());
    fs.writeFileSync(path.join(repo, "f"), "changed");
    git(["stash", "push", "-m", "test stash"], repo);

    const result = await getStashList(simpleGit(repo));
    expect(result.stashes.length).toBe(1);
    expect(result.stashes[0]?.index).toBe(0);
    expect(result.stashes[0]?.message).toContain("test stash");
    expect(result.stashes[0]?.hash.length).toBeGreaterThan(0);
  });
});
