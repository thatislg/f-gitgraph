namespace NeoGitCore.Domain

// Các thực thể cốt lõi của Git: GitHash, Author, CommitNode, GitRef.
// Tham khảo tài liệu thiết kế:
// docs/02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md (Mục 1).

open System

/// Mã băm đối tượng Git, hỗ trợ đồng thời hai chuẩn:
/// SHA-1 (40 ký tự hex) và SHA-256 (64 ký tự hex).
/// Là kiểu giá trị bất biến, dùng được làm khóa tìm kiếm tốc độ cao.
[<Struct; RequireQualifiedAccess>]
type GitHash =
    /// Chuẩn SHA-1 truyền thống (40 ký tự hex).
    | Sha1 of string
    /// Chuẩn SHA-256 hiện đại (64 ký tự hex).
    | Sha256 of string

[<RequireQualifiedAccess>]
module GitHash =

    /// Độ dài mã băm SHA-1 (40 ký tự hex).
    [<Literal>]
    let Sha1Length = 40

    /// Độ dài mã băm SHA-256 (64 ký tự hex).
    [<Literal>]
    let Sha256Length = 64

    /// Độ dài chuỗi viết tắt mặc định hiển thị trên giao diện đồ thị.
    [<Literal>]
    let AbbrevLength = 7

    let private isHex (c: char) =
        (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')

    let private isValidHex (s: string) =
        let mutable ok = s.Length > 0
        for i in 0 .. s.Length - 1 do
            if not (isHex s[i]) then ok <- false
        ok

    /// Tạo GitHash từ chuỗi hex. Trả về None (thay vì ném ngoại lệ) nếu
    /// độ dài không đúng hoặc chứa ký tự không hợp lệ.
    let tryParse (s: string) : GitHash option =
        if s.Length = Sha1Length && isValidHex s then Some(GitHash.Sha1 s)
        elif s.Length = Sha256Length && isValidHex s then Some(GitHash.Sha256 s)
        else None

    /// Chuyển GitHash về chuỗi hex đầy đủ.
    let toString (hash: GitHash) =
        match hash with
        | GitHash.Sha1 s
        | GitHash.Sha256 s -> s

    /// Chuỗi viết tắt (mặc định 7 ký tự đầu) phục vụ hiển thị.
    let abbrev (hash: GitHash) =
        let s = toString hash
        s.Substring(0, min AbbrevLength s.Length)

    /// Độ dài mã băm (40 cho SHA-1, 64 cho SHA-256).
    let length (hash: GitHash) =
        match hash with
        | GitHash.Sha1 _ -> Sha1Length
        | GitHash.Sha256 _ -> Sha256Length

/// Thông tin tác giả / người thực hiện commit (Author & Committer dùng chung kiểu).
type Author = {
    /// Tên tác giả, chuẩn hóa bảng mã UTF-8.
    Name: string
    /// Địa chỉ email (dùng để sinh ảnh đại diện Gravatar qua MD5).
    Email: string
    /// Thời gian Unix nguyên bản (giây kể từ epoch).
    Timestamp: int64
    /// Độ lệch múi giờ địa phương so với UTC, tính bằng phút (ví dụ +420 = UTC+7).
    TimezoneOffsetMinutes: int
}

/// Phân loại tham chiếu Git gắn vào commit.
[<RequireQualifiedAccess>]
type GitRef =
    /// Nhánh cục bộ, kèm cờ nhánh này có đang được checkout hay không.
    | LocalBranch of name: string * isCheckedOut: bool
    /// Nhánh máy chủ từ xa (tên remote + tên nhánh).
    | RemoteBranch of remote: string * name: string
    /// Thẻ phiên bản chính thức (ví dụ "v1.0.0").
    | ReleaseTag of version: string
    /// Thẻ tiền phát hành, mang phiên bản và hậu tố định danh (ví dụ "v1.0.0-beta.1").
    | PrereleaseTag of version: string * suffix: string
    /// Thẻ thông thường trong quá trình phát triển.
    | PlainTag of name: string
    /// Điểm lưu trữ tạm thời (stash), kèm chỉ số thứ tự.
    | Stash of index: int

/// Nút commit trên đồ thị — đơn vị dữ liệu trung tâm của toàn hệ thống.
type CommitNode = {
    /// Mã băm định danh duy nhất của commit.
    Hash: GitHash
    /// Danh sách commit cha trực tiếp (0 = gốc, 1 = thường, 2 = merge, 3+ = octopus).
    Parents: GitHash list
    /// Tác giả tạo ra sự thay đổi mã nguồn.
    Author: Author
    /// Người thực hiện commit (committer).
    Committer: Author
    /// Dòng tiêu đề tóm tắt (Subject).
    Subject: string
    /// Phần nội dung mô tả chi tiết (Body).
    Body: string
    /// Tập hợp các tham chiếu (nhánh/thẻ/stash) đang trỏ trực tiếp vào commit này.
    Refs: GitRef list
}
