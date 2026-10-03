module CoreEngine.Tests.GitHashTests

open Xunit
open NeoGitCore.Domain

let private sha1Hex = "0123456789abcdef0123456789abcdef01234567"

let private sha256Hex =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

[<Fact>]
let ``tryParse accepts 40-char SHA-1`` () =
    let h = GitHash.tryParse sha1Hex
    Assert.True(h.IsSome)
    Assert.Equal(40, GitHash.length h.Value)

[<Fact>]
let ``tryParse accepts 64-char SHA-256`` () =
    let h = GitHash.tryParse sha256Hex
    Assert.True(h.IsSome)
    Assert.Equal(64, GitHash.length h.Value)

[<Fact>]
let ``tryParse rejects wrong length`` () =
    Assert.True((GitHash.tryParse "abc123").IsNone)

[<Fact>]
let ``tryParse rejects non-hex characters`` () =
    let invalid = String.replicate 40 "z"
    Assert.True((GitHash.tryParse invalid).IsNone)

[<Fact>]
let ``abbrev returns first 7 characters`` () =
    let h = GitHash.tryParse sha1Hex
    Assert.Equal("0123456", GitHash.abbrev h.Value)

[<Fact>]
let ``toString roundtrips original hex`` () =
    let h = GitHash.tryParse sha1Hex
    Assert.Equal(sha1Hex, GitHash.toString h.Value)
