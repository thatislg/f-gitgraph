module CoreEngine.Tests.Utf8Tests

open System
open System.Text
open Xunit
open NeoGitCore.Storage

[<Fact>]
let ``hexEncode produces lowercase hex`` () =
    let bytes = "Hello"B
    Assert.Equal("48656c6c6f", Utf8.hexEncode (ReadOnlySpan<byte>(bytes)))

[<Fact>]
let ``hexDecode roundtrips hexEncode`` () =
    let original = "Hello"B
    let hex = Utf8.hexEncode (ReadOnlySpan<byte>(original))
    let decoded = Utf8.hexDecode hex
    Assert.Equal<byte>(original, decoded)

[<Fact>]
let ``decode handles Vietnamese UTF-8`` () =
    let bytes = Encoding.UTF8.GetBytes("Xin chào thế giới — Việt Nam")
    Assert.Equal("Xin chào thế giới — Việt Nam", Utf8.decode (ReadOnlySpan<byte>(bytes)))

[<Fact>]
let ``decode handles emoji`` () =
    let bytes = Encoding.UTF8.GetBytes("🚀 F-GitGraph")
    Assert.Equal("🚀 F-GitGraph", Utf8.decode (ReadOnlySpan<byte>(bytes)))
