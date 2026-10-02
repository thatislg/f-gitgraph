import { describe, expect, it } from "vitest";

import { getGitAccountAvatarUrl, md5 } from "@/webview/utils/avatar";

describe("avatar utilities", () => {
  it("computes standard MD5 hashes accurately", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5("hello")).toBe("5d41402abc4b2a76b9719d911017c592");
    expect(md5("test@example.com")).toBe("55502f40dc8b7c769880b10874abc9d0");
  });

  it("resolves GitHub noreply emails to GitHub user avatars", () => {
    const urlWithId = getGitAccountAvatarUrl("123456+octocat@users.noreply.github.com", 32);
    expect(urlWithId).toBe("https://avatars.githubusercontent.com/u/123456?size=32");

    const urlWithLogin = getGitAccountAvatarUrl("octocat@users.noreply.github.com", 32);
    expect(urlWithLogin).toBe("https://avatars.githubusercontent.com/octocat?size=32");

    const officialNoReply = getGitAccountAvatarUrl("noreply@github.com");
    expect(officialNoReply).toContain("GitHub-Mark.png");
  });

  it("resolves regular emails to Gravatar with identicon fallback", () => {
    const gravatarUrl = getGitAccountAvatarUrl("test@example.com", 32);
    expect(gravatarUrl).toBe(
      "https://www.gravatar.com/avatar/55502f40dc8b7c769880b10874abc9d0?s=32&d=identicon"
    );
  });

  it("returns undefined for empty or synthetic uncommitted changes email", () => {
    expect(getGitAccountAvatarUrl("")).toBeUndefined();
    expect(getGitAccountAvatarUrl("*")).toBeUndefined();
    expect(getGitAccountAvatarUrl(undefined)).toBeUndefined();
  });
});
