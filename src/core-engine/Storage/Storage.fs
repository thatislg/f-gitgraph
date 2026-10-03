namespace NeoGitCore.Storage

open System
open System.IO
open System.Collections.Generic
open NeoGitCore.Domain

// Điều phối tầng đọc dữ liệu Git: ưu tiên đường dẫn nhanh (commit-graph),
// tự động chuyển sang LibGit2 khi không có commit-graph (fallback).

/// Ảnh chụp đồ thị commit (topo): danh sách commit + quan hệ cha theo vị trí.
type GraphSnapshot = {
    /// Mã băm các commit.
    Commits: GitHash[]
    /// Với mỗi commit, vị trí (index trong Commits) của các commit cha.
    Parents: int[][]
    /// Thế hệ topo của từng commit (0 = chưa biết, từ đường dẫn fallback LibGit2).
    Generation: uint32[]
    /// Thời gian tạo commit (giây kể từ epoch), dùng làm khóa sắp xếp phụ.
    CommitTime: int64[]
}

[<RequireQualifiedAccess>]
module GitReader =

    let private commitGraphRelativePath =
        Path.Combine(".git", "objects", "info", "commit-graph")

    /// Đọc đồ thị commit của kho mã nguồn.
    /// `branch = None` (hoặc `Some "*"`) hiển thị toàn bộ nhánh (commit-graph nhanh);
    /// `branch = Some tênNhánh` chỉ hiển thị lịch sử nhánh đó (LibGit2 revwalk theo tip).
    let readGraph (repoPath: string) (branch: string option) : Result<GraphSnapshot, GitError> =
        // Dựng ảnh chụp đồ thị từ danh sách mã băm đã duyệt (revwalk LibGit2).
        let buildFromHashes (repo: GitRepository) (hashes: GitHash list) : Result<GraphSnapshot, GitError> =
            let indexMap = Dictionary<GitHash, int>()
            hashes |> List.iteri (fun i h -> indexMap[h] <- i)

            let commits = List.toArray hashes
            let parents = Array.zeroCreate<int[]> commits.Length
            let commitTime = Array.zeroCreate<int64> commits.Length
            for i in 0 .. commits.Length - 1 do
                match repo.ReadCommit commits[i] with
                | Ok node ->
                    commitTime[i] <- node.Author.Timestamp
                    // Bỏ qua commit cha không nằm trong phạm vi duyệt (biên giới bản sao nông).
                    parents[i] <-
                        node.Parents
                        |> List.choose (fun p ->
                            match indexMap.TryGetValue p with
                            | true, j -> Some j
                            | false, _ -> None)
                        |> List.toArray
                | Error _ ->
                    parents[i] <- [||]

            Ok
                { Commits = commits
                  Parents = parents
                  Generation = Array.zeroCreate commits.Length
                  CommitTime = commitTime }

        match branch with
        | Some name when name <> "*" ->
            // Nhánh cụ thể: commit-graph là toàn cục (mọi commit), không lọc theo nhánh
            // được, nên bắt buộc dùng LibGit2 revwalk theo đúng tip của nhánh.
            match LibGit2.openRepository repoPath with
            | Error e -> Error e
            | Ok repo ->
                use _repo = repo
                match repo.Walk branch with
                | Error e -> Error e
                | Ok hashes -> buildFromHashes repo hashes
        | _ ->
            // Toàn bộ nhánh: ưu tiên commit-graph (Memory-Mapped, ~1-2ms), fallback LibGit2.
            let commitGraphPath = Path.Combine(repoPath, commitGraphRelativePath)

            match CommitGraph.tryRead commitGraphPath with
            | Some data ->
                Ok
                    { Commits = data.Commits
                      Parents = data.Parents
                      Generation = data.Generation
                      CommitTime = data.CommitTime |> Array.map int64 }
            | None ->
                match LibGit2.openRepository repoPath with
                | Error e -> Error e
                | Ok repo ->
                    use _repo = repo
                    match repo.Walk None with
                    | Error e -> Error e
                    | Ok hashes -> buildFromHashes repo hashes
