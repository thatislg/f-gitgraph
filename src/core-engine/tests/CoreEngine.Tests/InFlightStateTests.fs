module CoreEngine.Tests.InFlightStateTests

open Xunit
open NeoGitCore.Domain

let private hash =
    (GitHash.tryParse "0123456789abcdef0123456789abcdef01234567").Value

[<Fact>]
let ``merging state carries merge head`` () =
    let state = InFlightState.Merging { MergeHead = hash; Message = "merge x" }
    match state with
    | InFlightState.Merging m ->
        Assert.Equal(hash, m.MergeHead)
        Assert.Equal("merge x", m.Message)
    | _ -> failwith "expected merging state"

[<Fact>]
let ``rebasing state carries step and branch`` () =
    let state =
        InFlightState.Rebasing
            { CurrentStep = 2
              TotalSteps = 5
              Branch = "feature"
              CurrentCommit = hash }

    match state with
    | InFlightState.Rebasing r ->
        Assert.Equal(2, r.CurrentStep)
        Assert.Equal(5, r.TotalSteps)
        Assert.Equal("feature", r.Branch)
    | _ -> failwith "expected rebasing state"

[<Fact>]
let ``bisecting state classifies good bad skipped`` () =
    let good = (GitHash.tryParse "1111111111111111111111111111111111111111").Value
    let bad = (GitHash.tryParse "2222222222222222222222222222222222222222").Value

    let state = InFlightState.Bisecting { Good = [ good ]; Bad = [ bad ]; Skipped = [] }

    match state with
    | InFlightState.Bisecting b ->
        Assert.Equal(1, b.Good.Length)
        Assert.Equal(1, b.Bad.Length)
        Assert.Empty(b.Skipped)
    | _ -> failwith "expected bisecting state"

[<Fact>]
let ``clean state is the default`` () =
    Assert.Equal(InFlightState.Clean, InFlightState.Clean)
