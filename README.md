<div align="center">
  <img src="./resources/icon.png" height="128"/>
  <samp>
    <h1>F-GitGraph</h1>
    <h3>High-performance Git history visualization for VS Code, powered by an F# Native AOT core.</h3>
  </samp>
</div>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/thatislg/f-gitgraph" alt="License"></a>
  <a href="https://github.com/thatislg/f-gitgraph/releases"><img alt="GitHub release" src="https://img.shields.io/github/v/release/thatislg/f-gitgraph"></a>
</p>

<p>&nbsp;</p>

## About

**F-GitGraph** is a next-generation Git history visualizer built for large repositories. It combines a lightweight Preact webview with a native **F# Native AOT core engine** (`f-gitgraph-core.exe`) that reads Git data directly and computes the graph layout in parallel — no dependency on a .NET runtime, and dramatically faster than the previous single-threaded TypeScript implementation.

Maintained and published by **LMO-LAB**.

## Key Highlights

- **Dual-core architecture** — a lightweight Preact UI drives a self-contained F# Native AOT engine that runs directly on the metal.
- **Direct Git access** — reads the binary `commit-graph` through memory-mapped files and the in-process LibGit2 C binding, 30–50× faster than shelling out to the Git CLI.
- **Parallel DAG layout** — sorts commits and allocates graph lanes across multiple CPU threads, pre-computing SVG geometry before the UI renders.
- **Streaming IPC** — a stdio RPC daemon with a binary MessagePack protocol answers windowed queries in under 5 ms for silky virtual scrolling.
- **Signature-safe writes** — every mutating operation (commit, branch, merge, rebase, cherry-pick, tag, push, pull) is delegated to the native `git.exe`, preserving GPG/SSH signing and Git Credential Manager.
- **Modern neon UI** — hexagon SVG commit nodes, ambient neon glow, 5× avatar zoom preview, and a full commit-message panel.

## Features

- **Graph view** — branches, tags, and uncommitted changes in a single hexagonal graph.
- **Commit details** — click a commit to inspect the message, changed files, and diffs.
- **Branch actions** — create, checkout, rename, delete, and merge.
- **Tag actions** — create, delete, and push tags.
- **Commit actions** — checkout, cherry-pick, revert, and reset.
- **Avatar preview** — hover-to-zoom avatar preview (fetching avatars is deprecated in v0.6.0).
- **Multi-repo** — work with several repositories in one workspace.

## Architecture

The original Git Graph extension parsed `git log` output with regular expressions and computed the graph layout in a single JavaScript thread — a bottleneck on large repositories. F-GitGraph replaces that entire read-and-layout pipeline with a native engine:

| Concern                    | Before (TypeScript)                    | After (F# Native AOT)                              |
| :------------------------- | :------------------------------------- | :------------------------------------------------- |
| Read commits / refs        | `git log` + regex parsing (spawn)      | Memory-mapped `commit-graph` + LibGit2 in-process  |
| Topological sort           | Single-threaded JS                     | Parallel Kahn sort with priority queue             |
| Lane allocation            | Single-threaded JS                     | Left-compact lane pool, multi-threaded             |
| Geometry generation        | JS at render time                      | Pre-computed SVG in `Parallel.For`                  |
| Transport                  | JSON `postMessage`                     | Binary MessagePack over stdio RPC daemon            |

Mutating operations intentionally remain on the Git CLI to guarantee signature and credential safety.

## Roadmap

The engine ships platform-by-platform, starting on Windows and expanding to a universal release:

- **Phase 1 — Windows** *(in progress)*: F# Native AOT core, domain model, fast Git reader, parallel layout solver, stdio IPC, benchmarking, and VSIX packaging.
- **Phase 2 — Linux**: port the core to Ubuntu/Fedora/Debian, resolve `glibc` compatibility, and stress-test against the Linux kernel repository.
- **Phase 3 — macOS**: Apple Silicon (M-series ARM64) and Intel x64, Gatekeeper handling, and Retina display verification.
- **Phase 4 — Release**: multi-platform CI/CD and a universal VSIX bundling all native binaries.

## Installation

Search for `f-gitgraph` in the Extensions view, or install from:

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=lmo-lab.f-gitgraph)
- [Open VSX Registry](https://open-vsx.org/extension/lmo-lab/f-gitgraph)

## Configuration

All settings use the `f-gitgraph` prefix.

| Setting                       | Default         | Description                                                            |
| ----------------------------- | --------------- | ---------------------------------------------------------------------- |
| `autoCenterCommitDetailsView` | `true`          | Center commit details when opened                                      |
| `dateFormat`                  | `"Date & Time"` | `"Date & Time"`, `"Date Only"`, or `"Relative"`                        |
| `dateType`                    | `"Author Date"` | `"Author Date"` or `"Commit Date"`                                     |
| `fetchAvatars`                | `false`         | Fetch avatars (sends email to external services); deprecated in v0.6.0 |
| `graphColours`                | 12 defaults     | Colors for graph lines                                                 |
| `graphStyle`                  | `"rounded"`     | `"rounded"` or `"angular"`                                             |
| `initialLoadCommits`          | `300`           | Commits to load on open                                                |
| `loadMoreCommits`             | `100`           | Commits to load on demand                                              |
| `maxDepthOfRepoSearch`        | `0`             | Folder depth for repo search                                           |
| `showCurrentBranchByDefault`  | `false`         | Show only current branch on open                                       |
| `showUncommittedChanges`      | `true`          | Show uncommitted changes node                                          |
| `tabIconColourTheme`          | `"colour"`      | `"colour"` or `"grey"`                                                 |

## Contributing

Please use [Issues](https://github.com/thatislg/f-gitgraph/issues) for bug reports, feature requests, and discussion. See the [Roadmap](#roadmap) for the current direction.

## License

MIT — see [LICENSE](LICENSE).

> F-GitGraph builds on the MIT-licensed Git Graph codebase (Copyright © 2019 mhutchie). It is maintained and published by LMO-LAB.
