namespace NeoGitCore.Storage

open System
open System.Text

/// Hỗ trợ giải mã chuỗi UTF-8 và chuyển đổi hex với chi phí cấp phát tối thiểu.
/// Tham khảo thiết kế:
/// docs/02_design/001_windows/03_Fast_Git_Storage_Reader.md (Mục 3).
[<RequireQualifiedAccess>]
module Utf8 =

    /// Giải mã lát cắt byte UTF-8 thô sang chuỗi .NET đúng chuẩn, không qua bảng mã
    /// trung gian (khắc phục lỗi tiếng Việt bị mã hóa octal trên Git CLI Windows).
    let decode (bytes: ReadOnlySpan<byte>) : string =
        Encoding.UTF8.GetString(bytes)

    /// Mã hóa các byte thành chuỗi hex thường (dùng cho mã băm SHA của Git).
    let hexEncode (bytes: ReadOnlySpan<byte>) : string =
        Convert.ToHexStringLower(bytes)

    /// Giải mã chuỗi hex thành mảng byte (dùng khi cần truyền mã băm sang LibGit2).
    let hexDecode (hex: string) : byte[] =
        Convert.FromHexString(hex)
