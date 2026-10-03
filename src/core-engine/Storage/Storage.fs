namespace NeoGitCore.Storage

// Tầng truy cập dữ liệu Git tốc độ cao.
// Nội dung chi tiết (tích hợp LibGit2 C-binding in-process, Memory-Mapped Files
// đọc `commit-graph`, Zero-Allocation Span, giải mã UTF-8 tiếng Việt) sẽ được
// triển khai ở Nhóm Việc 3 (Fast Git Reader).
