module CoreEngine.Tests.CommitNodeTests

open Xunit
open NeoGitCore.Domain

let private hash =
    (GitHash.tryParse "0123456789abcdef0123456789abcdef01234567").Value

let private author =
    { Name = "An"
      Email = "an@example.com"
      Timestamp = 0L
      TimezoneOffsetMinutes = 420 }

let private makeNode parents refs =
    { Hash = hash
      Parents = parents
      Author = author
      Committer = author
      Subject = "subject"
      Body = "body"
      Refs = refs }

[<Fact>]
let ``root commit has zero parents`` () =
    let node = makeNode [] []
    Assert.Empty(node.Parents)

[<Fact>]
let ``regular commit has one parent`` () =
    let p1 = (GitHash.tryParse "1111111111111111111111111111111111111111").Value
    let node = makeNode [ p1 ] []
    Assert.Equal(1, node.Parents.Length)

[<Fact>]
let ``merge commit has two parents`` () =
    let p1 = (GitHash.tryParse "1111111111111111111111111111111111111111").Value
    let p2 = (GitHash.tryParse "2222222222222222222222222222222222222222").Value
    let node = makeNode [ p1; p2 ] []
    Assert.Equal(2, node.Parents.Length)

[<Fact>]
let ``local branch carries checkout flag`` () =
    let node = makeNode [] [ GitRef.LocalBranch("main", true) ]
    match node.Refs.Head with
    | GitRef.LocalBranch(name, checkedOut) ->
        Assert.Equal("main", name)
        Assert.True(checkedOut)
    | _ -> failwith "expected local branch"

[<Fact>]
let ``release tag is classified correctly`` () =
    let node = makeNode [] [ GitRef.ReleaseTag "v1.0.0" ]
    match node.Refs.Head with
    | GitRef.ReleaseTag version -> Assert.Equal("v1.0.0", version)
    | _ -> failwith "expected release tag"
