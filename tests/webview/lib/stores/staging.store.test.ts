// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import type { WorkspaceStatusResult } from "@/backend/queries/workspaceStatus";
import { commitHead } from "@/webview/lib/stores";
import {
  amendDisabledReason,
  canAmend,
  canCommit,
  commitDescription,
  commitSubject,
  headCommitDescription,
  headCommitSubject,
  isAmend,
  isCommitting,
  loadHeadCommit,
  loadStatus,
  setAmend,
  stagedFiles,
  unstagedFiles
} from "@/webview/lib/stores/staging.store";
import { aheadCount, upstreamBranch } from "@/webview/lib/stores/sync.store";

function resetStore() {
  stagedFiles.value = [];
  unstagedFiles.value = [];
  commitSubject.value = "";
  commitDescription.value = "";
  isAmend.value = false;
  isCommitting.value = false;
  headCommitSubject.value = "";
  headCommitDescription.value = "";
  commitHead.value = null;
  upstreamBranch.value = null;
  aheadCount.value = 0;
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

  it("returns canCommit=true when amending with staged files and no message (--no-edit)", () => {
    stagedFiles.value = [{ path: "a.ts", status: "M", isUntracked: false }];
    commitSubject.value = "";
    isAmend.value = true;
    expect(canCommit.value).toBe(true);
  });

  it("returns canCommit=false when amending with no staged files and no message", () => {
    commitSubject.value = "";
    isAmend.value = true;
    expect(canCommit.value).toBe(false);
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
    commitHead.value = "abc123";
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

  it("setAmend(true) exits safely when the repo has no HEAD commit", () => {
    commitHead.value = null;
    commitSubject.value = "draft subject";
    commitDescription.value = "draft body";

    setAmend(true);
    expect(isAmend.value).toBe(false);
    expect(commitSubject.value).toBe("draft subject");
    expect(commitDescription.value).toBe("draft body");
  });

  it("setAmend(true) exits safely when the HEAD commit is already pushed to remote", () => {
    commitHead.value = "abc123";
    upstreamBranch.value = "origin/main";
    aheadCount.value = 0;
    commitSubject.value = "draft subject";

    setAmend(true);
    expect(isAmend.value).toBe(false);
    expect(commitSubject.value).toBe("draft subject");
  });

  it("loadHeadCommit populates HEAD fields and fills the composer while amend is on", () => {
    loadHeadCommit("HEAD subject", "HEAD body");
    expect(headCommitSubject.value).toBe("HEAD subject");
    expect(headCommitDescription.value).toBe("HEAD body");
    expect(commitSubject.value).toBe("");

    isAmend.value = true;
    loadHeadCommit("HEAD subject 2", "HEAD body 2");
    expect(commitSubject.value).toBe("HEAD subject 2");
    expect(commitDescription.value).toBe("HEAD body 2");
  });

  it("returns canAmend=false with no reason-free tooltip when there is no HEAD commit", () => {
    commitHead.value = null;
    expect(canAmend.value).toBe(false);
    expect(amendDisabledReason.value).toBe("Cannot amend: Repository has no commits yet");
  });

  it("returns canAmend=false when the HEAD commit is already pushed to remote", () => {
    commitHead.value = "abc123";
    upstreamBranch.value = "origin/main";
    aheadCount.value = 0;
    expect(canAmend.value).toBe(false);
    expect(amendDisabledReason.value).toBe(
      "Cannot amend: Latest commit has already been pushed to remote"
    );
  });

  it("returns canAmend=true when there are local commits ahead of remote", () => {
    commitHead.value = "abc123";
    upstreamBranch.value = "origin/main";
    aheadCount.value = 2;
    expect(canAmend.value).toBe(true);
    expect(amendDisabledReason.value).toBeUndefined();
  });

  it("returns canAmend=true when there is no remote tracking branch", () => {
    commitHead.value = "abc123";
    upstreamBranch.value = null;
    aheadCount.value = 0;
    expect(canAmend.value).toBe(true);
    expect(amendDisabledReason.value).toBeUndefined();
  });
});
