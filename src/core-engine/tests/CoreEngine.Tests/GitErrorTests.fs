module CoreEngine.Tests.GitErrorTests

open Xunit
open NeoGitCore.Domain

[<Fact>]
let ``describe repository not found includes path`` () =
    let msg = GitError.describe (GitError.RepositoryNotFound "/repo")
    Assert.Contains("/repo", msg)

[<Fact>]
let ``describe branch not merged includes branch and count`` () =
    let msg = GitError.describe (GitError.BranchNotMerged("feature", 3))
    Assert.Contains("feature", msg)
    Assert.Contains("3", msg)

[<Fact>]
let ``describe index lock without pid omits process`` () =
    let msg = GitError.describe (GitError.IndexLockConflict("index.lock", 10, None))
    Assert.Contains("index.lock", msg)
    Assert.Contains("10", msg)

[<Fact>]
let ``describe native library error includes code`` () =
    let msg = GitError.describe (GitError.NativeLibraryError(-3, "not found"))
    Assert.Contains("-3", msg)
    Assert.Contains("not found", msg)
