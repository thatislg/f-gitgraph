// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import type { WorkspaceStatusResult } from "@/backend/queries/workspaceStatus";
import {
  canCommit,
  commitDescription,
  commitSubject,
  headCommitDescription,
  headCommitSubject,
  isAmend,
  isCommitting,
  loadStatus,
  setAmend,
  stagedFiles,
  unstagedFiles
} from "@/webview/lib/stores/staging.store";

function resetStore() {
  stagedFiles.value = [];
  unstagedFiles.value = [];
  commitSubject.value = "";
  commitDescription.value = "";
  isAmend.value = false;
  isCommitting.value = false;
  headCommitSubject.value = "";
  headCommitDescription.value = "";
}

describe("stagingStore", () => {
  beforeEach(resetStore);

  it("returns canCommit=false when there are no staged files and amend is off", () => {
    commitSubject.value = "feat: add feature";
    expect(canCommit.value).toBe(false);
  });

  it("returns canCommit=true when staged is empty but amend is on with a valid subject", () => {
    commitSubject.value = "amend commit";
    isAmend.value = true;
    expect(canCommit.value).toBe(true);
  });

  it("returns canCommit=false when the subject is empty", () => {
    stagedFiles.value = [{ path: "a.ts", status: "M", isUntracked: false }];
    commitSubject.value = "";
    expect(canCommit.value).toBe(false);
  });

  it("returns canCommit=true with staged files, a subject and amend off", () => {
    stagedFiles.value = [{ path: "a.ts", status: "M", isUntracked: false }];
    commitSubject.value = "feat";
    expect(canCommit.value).toBe(true);
  });

  it("returns canCommit=false while a commit is in progress", () => {
    stagedFiles.value = [{ path: "a.ts", status: "M", isUntracked: false }];
    commitSubject.value = "feat";
    isCommitting.value = true;
    expect(canCommit.value).toBe(false);
  });

  it("loadStatus maps backend records into staged and unstaged file lists", () => {
    const status: WorkspaceStatusResult = {
      head: "main",
      ahead: 0,
      behind: 0,
      stagedFiles: [{ path: "src/a.ts", status: "A" }],
      unstagedFiles: [
        { path: "src/b.ts", status: "M", isUntracked: false },
        { path: "src/new.ts", status: "U", isUntracked: true }
      ],
      conflictedFiles: [],
      isClean: false
    };

    loadStatus(status);

    expect(stagedFiles.value).toEqual([{ path: "src/a.ts", status: "A", isUntracked: false }]);
    expect(unstagedFiles.value).toEqual([
      { path: "src/b.ts", status: "M", isUntracked: false },
      { path: "src/new.ts", status: "U", isUntracked: true }
    ]);
  });

  it("setAmend stashes the draft and loads HEAD content, restoring on disable", () => {
    commitSubject.value = "draft subject";
    commitDescription.value = "draft body";
    headCommitSubject.value = "HEAD subject";
    headCommitDescription.value = "HEAD body";

    setAmend(true);
    expect(commitSubject.value).toBe("HEAD subject");
    expect(commitDescription.value).toBe("HEAD body");
    expect(isAmend.value).toBe(true);

    setAmend(false);
    expect(commitSubject.value).toBe("draft subject");
    expect(commitDescription.value).toBe("draft body");
    expect(isAmend.value).toBe(false);
  });
});
