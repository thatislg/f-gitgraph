namespace NeoGitCore.Domain

// Tầng miền nghiệp vụ thuần túy (Pure Domain): không phụ thuộc thư viện ngoài.
// Các thực thể cốt lõi nằm ở CoreEntities.fs, trạng thái in-flight ở
// InFlightState.fs và bảng lỗi vét cạn ở GitError.fs.

/// Định danh sản phẩm và phiên bản của nhân F# Core Engine.
module Version =

    /// Tên định danh sản phẩm (trùng với tên file thực thi `f-gitgraph-core.exe`).
    [<Literal>]
    let Name = "f-gitgraph-core"

    /// Phiên bản hiện tại của nhân tính toán F#.
    [<Literal>]
    let Current = "0.1.0"
