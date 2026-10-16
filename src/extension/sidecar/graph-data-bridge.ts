import type { WorkspaceStatusResult } from "@/backend/queries/workspaceStatus";
import type { CommitOrdering } from "@/types";

import {
  buildUncommittedRow,
  mergeGraphWindow,
  shiftPathD,
  ROW_HEIGHT,
  UNCOMMITTED_CHANGES_HASH,
  type GraphWindow,
  type MetadataProvider
} from "./graph-merge";
import type { InitSuccess, NodeGeometry, PathGeometry } from "./protocol";
import type { SidecarManager } from "./sidecar-manager";

// Cầu nối dữ liệu: kết hợp hình học đồ thị từ engine F# (qua sidecar) với metadata
// commit (tác giả, tiêu đề, refs) để tạo cấu trúc sẵn sàng cho Webview vẽ trực tiếp.
// Tham khảo thiết kế:
// docs/02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md (Mục 1).

export type StatusProvider = () => Promise<WorkspaceStatusResult>;

export class GraphDataBridge {
  private commitList: string[] = [];
  private hasUncommitted = false;

  constructor(
    private readonly sidecar: SidecarManager,
    private readonly metadataProvider: MetadataProvider,
    private readonly statusProvider: StatusProvider
  ) {}

  async initialize(
    repoPath: string,
    branch?: string,
    commitOrdering?: CommitOrdering
  ): Promise<InitSuccess> {
    const [init, status] = await Promise.all([
      this.sidecar.initialize(repoPath, branch, commitOrdering),
      this.statusProvider()
    ]);
    this.hasUncommitted = !status.isClean;
    this.commitList = this.buildCommitList(init.commits);
    return this.toInitSuccess(init);
  }

  async invalidate(): Promise<InitSuccess> {
    const [init, status] = await Promise.all([this.sidecar.invalidate(), this.statusProvider()]);
    this.hasUncommitted = !status.isClean;
    this.commitList = this.buildCommitList(init.commits);
    return this.toInitSuccess(init);
  }

  async loadWindow(from: number, to: number): Promise<GraphWindow> {
    // Webview đánh chỉ số bao gồm cả dòng `*` ở hàng 0. Nhân F# chỉ biết commit thật,
    // nên phải dịch lại chỉ số trước khi gọi sidecar và chèn dòng `*` + dời hình học.
    const star = this.hasUncommitted;
    const realFrom = star ? Math.max(0, from - 1) : from;
    const realTo = star ? to - 1 : to;

    let nodes: NodeGeometry[] = [];
    let paths: PathGeometry[] = [];
    if (realTo >= realFrom && realTo >= 0) {
      const range = await this.sidecar.queryRange(realFrom, realTo);
      nodes = range.nodes;
      paths = range.paths;
    }

    const realCommits = star ? this.commitList.slice(1) : this.commitList;
    const windowRealHashes = realCommits.slice(realFrom, realTo + 1);
    const metadata = await this.metadataProvider(windowRealHashes);

    const shiftY = star ? ROW_HEIGHT : 0;
    const realRows = mergeGraphWindow(realCommits, metadata, nodes, realFrom);
    if (shiftY !== 0) {
      for (const row of realRows) {
        row.y += shiftY;
      }
    }

    const rows = star && from === 0 ? [buildUncommittedRow(), ...realRows] : realRows;

    const shiftedPaths =
      shiftY === 0
        ? paths
        : paths.map((p) => ({
            d: shiftPathD(p.d, shiftY),
            color: p.color
          }));

    return { from, rows, paths: shiftedPaths };
  }

  private buildCommitList(realCommits: string[]): string[] {
    return this.hasUncommitted ? [UNCOMMITTED_CHANGES_HASH, ...realCommits] : realCommits;
  }

  private toInitSuccess(init: InitSuccess): InitSuccess {
    return {
      commitCount: this.commitList.length,
      maxLane: init.maxLane,
      commits: this.commitList
    };
  }
}
