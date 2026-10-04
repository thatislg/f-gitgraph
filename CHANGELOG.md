# Changelog

## [1.0.0] - 2026-10-05

### Added

- Native F# Ahead-Of-Time (Native AOT) core engine (`f-gitgraph-core`) for ultra-high-speed DAG computation.
- Full cross-platform support for **Windows (x64, arm64)**, **Linux (x64, arm64)**, and **macOS (Apple Silicon arm64, Intel x64)**.
- Automated file permission resolution (`chmod +x`) on Unix platforms for seamless zero-config startup.
- Memory-mapped `commit-graph` binary parser and in-process LibGit2 C-binding fallback.
- Binary MessagePack streaming IPC daemon via standard I/O (zero TCP/HTTP overhead).
- Modern Preact UI with hexagon SVG commit nodes, neon ambient glow, branch filtering, commit detail inspector, and 5x avatar zoom preview.
- Safe Git write operations (merge, branch, checkout, tag, commit actions) routed directly through native Git CLI (preserving SSH, GPG signing, and Git Credential Manager).
- Automated multi-platform CI/CD build matrix and VSIX release pipeline.

## [0.6.0] - 2026-08-25

### Added

- View for repositories without commits
- Faster tab restoration by retaining the webview context

### Changed

- Migrate the webview to Preact
- Improve long branch name display and emphasize the checked-out branch
- Deprecate the `fetchAvatars` setting

### Fixed

- Handle root commit actions correctly
- Avoid reloading a retained panel when it is restored
- Make repository watcher muting safe

## [0.5.0] - 2026-07-24

### Added

- Git Graph button in the Source Control view title
- Centralized logging with a dedicated "Git Graph" output channel

### Changed

- Optimize extension initialization logic
- Replace the "Locate HEAD" button with a highlighted HEAD commit row in the graph
- Status bar: add icons for the active and watching states
- Simplify localization to use English-string keys extracted with @vscode/l10n-dev

### Fixed

- Native browser context menu appearing over the graph in browser-based VS Code (vscode.dev / Codespaces)
- Header layout quirks around the refresh button

## [0.4.0] - 2026-04-10

### Added

- Full internationalization (i18n) support with multiple languages
- Language support: English (default), Simplified Chinese (简体中文), Traditional Chinese (繁體中文)

### Fixed

- Escape HTML in git output before rendering

## [0.3.0] - 2026-03-26

### Added

- Introduce gitClient based on simple-git
- Added a button to locate HEAD in the graph

### Changed

- Extract webview bridge
- Extract webview lifecycle

## [0.2.0] - 2026-03-17

### Added

- Add initial test suite and CI configuration

### Fixed

- Remove information message

## [0.1.1] - 2026-02-23

### Changed

- Migrate build system to esbuild and upgrade dependencies
- Add oxlint linter and oxfmt formatter

## [0.1.0] - 2026-02-18

Initial release

[Unreleased]: https://github.com/thatislg/f-gitgraph/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/thatislg/f-gitgraph/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/thatislg/f-gitgraph/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/thatislg/f-gitgraph/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/thatislg/f-gitgraph/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/thatislg/f-gitgraph/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/thatislg/f-gitgraph/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/thatislg/f-gitgraph/releases/tag/v0.1.0
