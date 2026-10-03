namespace NeoGitCore.Domain

// Bảng phân loại lỗi hệ thống vét cạn (Exhaustive Error Taxonomy).
// Tham khảo tài liệu thiết kế:
// docs/02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md (Mục 3 & 4).

/// Bảng mã lỗi duy nhất bao quát toàn bộ sự cố kỹ thuật khi tương tác với hệ thống
/// tệp và cơ sở dữ liệu Git. Mọi hàm nghiệp vụ trong engine trả về
/// `Result<'T, GitError>` thay vì ném ngoại lệ.
[<RequireQualifiedAccess>]
type GitError =
    /// Thư mục được yêu cầu không chứa dữ liệu Git hợp lệ.
    | RepositoryNotFound of path: string
    /// Xung đột file khóa `.git/index.lock`.
    | IndexLockConflict of lockFile: string * lockAgeSeconds: int * holdingPid: int option
    /// Xung đột khóa tham chiếu nhánh (ví dụ `.git/refs/heads/main.lock`).
    | RefLockConflict of branchName: string
    /// Tên nhánh đã tồn tại trong kho.
    | BranchAlreadyExists of branchName: string
    /// Xóa nhánh chưa được sáp nhập vào nhánh chính.
    | BranchNotMerged of branchName: string * unmergedCommitCount: int
    /// Xung đột tệp tin khi chuyển nhánh do thay đổi cục bộ chưa commit.
    | CheckoutConflict of conflictingPaths: string list
    /// Biên giới bản sao nông (shallow clone) — thiếu commit cha.
    | ShallowCloneBoundary of missingParentHash: GitHash
    /// Đối tượng Git bị hỏng (lỗi ổ đĩa hoặc checksum).
    | CorruptGitObject of objectHash: GitHash * technicalMessage: string
    /// Lỗi trả về từ thư viện C gốc LibGit2.
    | NativeLibraryError of errorCode: int * description: string

[<RequireQualifiedAccess>]
module GitError =

    /// Chuỗi mô tả ngắn gọn phục vụ hiển thị giao diện và ghi nhật ký hệ thống.
    let describe (error: GitError) =
        match error with
        | GitError.RepositoryNotFound path ->
            "Không tìm thấy kho Git tại '" + path + "'."
        | GitError.IndexLockConflict (lockFile, age, pid) ->
            match pid with
            | Some p ->
                "Tệp khóa '" + lockFile + "' đang bị tiến trình " + string p
                + " giữ (đã tồn tại " + string age + " giây)."
            | None ->
                "Tệp khóa '" + lockFile + "' đang tồn tại (đã " + string age + " giây)."
        | GitError.RefLockConflict branch ->
            "Nhánh '" + branch + "' đang bị khóa bởi thao tác ghi khác."
        | GitError.BranchAlreadyExists branch ->
            "Nhánh '" + branch + "' đã tồn tại."
        | GitError.BranchNotMerged (branch, count) ->
            "Nhánh '" + branch + "' chưa được merge (còn " + string count + " commit)."
        | GitError.CheckoutConflict paths ->
            "Xung đột tệp tin khi chuyển nhánh: " + String.concat ", " paths + "."
        | GitError.ShallowCloneBoundary hash ->
            "Biên giới bản sao nông — thiếu commit cha " + GitHash.abbrev hash + "."
        | GitError.CorruptGitObject (hash, msg) ->
            "Đối tượng Git " + GitHash.abbrev hash + " bị hỏng: " + msg + "."
        | GitError.NativeLibraryError (code, desc) ->
            "Lỗi thư viện C gốc (" + string code + "): " + desc + "."
