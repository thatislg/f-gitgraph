import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { simpleGit } from "simple-git";
import { afterAll, describe, expect, it } from "vitest";

import { listTags, parseTagList } from "@/backend/queries/listTags";

import { git, makeRepo } from "@tests/backend/helpers";

const tmpDirs: string[] = [];

function track(dir: string): string {
  tmpDirs.push(dir);
  return dir;
}

afterAll(() => {
  tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
});

describe("parseTagList", () => {
  it("parses a single tag", () => {
    expect(parseTagList("v1.0.0\n")).toEqual(["v1.0.0"]);
  });

  it("parses multiple tags preserving order", () => {
    expect(parseTagList("v1.1.0\nv1.0.0\nv0.9.0\n")).toEqual(["v1.1.0", "v1.0.0", "v0.9.0"]);
  });

  it("skips empty lines and trims surrounding whitespace", () => {
    expect(parseTagList("v1.0.0\n\n  v0.9.0  \n\n")).toEqual(["v1.0.0", "v0.9.0"]);
  });

  it("handles Windows CRLF and Unix LF line endings", () => {
    expect(parseTagList("v1.0.0\r\nv0.9.0\nv0.8.0")).toEqual(["v1.0.0", "v0.9.0", "v0.8.0"]);
  });

  it("preserves hierarchical and special-character tags", () => {
    expect(
      parseTagList("release/v1.0.0\nv1.0.0+build123\nv1.0.0-rc.1\nbuild/2026-10-19\n")
    ).toEqual(["release/v1.0.0", "v1.0.0+build123", "v1.0.0-rc.1", "build/2026-10-19"]);
  });

  it("returns an empty array for empty or whitespace-only input", () => {
    expect(parseTagList("")).toEqual([]);
    expect(parseTagList("  \n")).toEqual([]);
  });
});

describe("listTags", () => {
  it("returns an empty list for a repo with no tags", async () => {
    const repo = track(makeRepo());
    const result = await listTags(simpleGit(repo));
    expect(result.tags).toEqual([]);
  });

  it("lists tags sorted by creatordate (newest first)", async () => {
    const repo = track(makeRepo());
    git(["commit", "--amend", "--no-edit", "--date", "2026-01-01T00:00:00Z"], repo, {
      GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z"
    });
    git(["tag", "v0.1.0"], repo); // points to the initial commit (Jan 1)
    fs.writeFileSync(path.join(repo, "f2"), "y");
    git(["add", "."], repo);
    git(["commit", "-m", "second", "--date", "2026-01-02T00:00:00Z"], repo, {
      GIT_COMMITTER_DATE: "2026-01-02T00:00:00Z"
    });
    git(["tag", "v1.0.0"], repo); // points to the newer commit (Jan 2)

    const result = await listTags(simpleGit(repo));
    expect(result.tags[0]).toBe("v1.0.0");
    expect(result.tags).toContain("v0.1.0");
  });

  it("sorts tags alphabetically when sort = 'name'", async () => {
    const repo = track(makeRepo());
    git(["tag", "v1.0.0"], repo);
    git(["tag", "v0.1.0"], repo);
    git(["tag", "v0.2.0"], repo);

    const result = await listTags(simpleGit(repo), { sort: "name" });
    expect(result.tags).toEqual(["v0.1.0", "v0.2.0", "v1.0.0"]);
  });

  it("lists both lightweight and annotated tags", async () => {
    const repo = track(makeRepo());
    git(["tag", "lightweight"], repo);
    git(["tag", "-a", "annotated", "-m", "release note"], repo);

    const result = await listTags(simpleGit(repo));
    expect(result.tags.toSorted()).toEqual(["annotated", "lightweight"]);
  });

  it("falls back to an empty list when the directory is not a git repo", async () => {
    const dir = track(fs.mkdtempSync(path.join(os.tmpdir(), "ngg-notag-")));
    const result = await listTags(simpleGit(dir));
    expect(result.tags).toEqual([]);
  });
});
