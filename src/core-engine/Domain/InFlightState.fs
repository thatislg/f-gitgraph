namespace NeoGitCore.Domain

// Các trạng thái biến động dở dang của kho mã nguồn (In-Flight States).
// Tham khảo tài liệu thiết kế:
// docs/02_design/001_windows/02_Domain_Model_And_Error_Taxonomy.md (Mục 2).

/// Thông tin trạng thái sáp nhập dở dang, đọc từ tệp MERGE_HEAD và MERGE_MSG.
type MergeState = {
    /// Mã băm của commit đang được gộp vào.
    MergeHead: GitHash
    /// Thông điệp sáp nhập dở dang.
    Message: string
}

/// Thông tin trạng thái rebase dở dang, đọc từ rebase-merge hoặc rebase-apply.
type RebaseState = {
    /// Số thứ tự bước rebase hiện tại.
    CurrentStep: int
    /// Tổng số bước rebase.
    TotalSteps: int
    /// Tên nhánh đang được rebase.
    Branch: string
    /// Mã băm commit đang dừng lại để chỉnh sửa.
    CurrentCommit: GitHash
}

/// Thông tin trạng thái cherry-pick dở dang, đọc từ tệp CHERRY_PICK_HEAD.
type CherryPickState = {
    /// Mã băm commit nguyên bản đang được sao chép sang nhánh hiện tại.
    CherryPickHead: GitHash
}

/// Thông tin trạng thái tìm lỗi nhị phân dở dang, đọc từ tệp BISECT_LOG.
type BisectState = {
    /// Các commit đã xác nhận tốt (good).
    Good: GitHash list
    /// Các commit phát sinh lỗi (bad).
    Bad: GitHash list
    /// Các commit bỏ qua (skip).
    Skipped: GitHash list
}

/// Trạng thái biến động dở dang tổng quát của kho mã nguồn.
[<RequireQualifiedAccess>]
type InFlightState =
    /// Trạng thái sạch, không có bất kỳ thao tác dở dang nào.
    | Clean
    /// Đang sáp nhập dở (merge).
    | Merging of MergeState
    /// Đang tái cơ cấu dở (rebase).
    | Rebasing of RebaseState
    /// Đang chọn lọc commit dở (cherry-pick).
    | CherryPicking of CherryPickState
    /// Đang tìm lỗi nhị phân dở (bisect).
    | Bisecting of BisectState
