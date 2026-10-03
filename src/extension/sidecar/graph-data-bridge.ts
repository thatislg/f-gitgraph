import { mergeGraphWindow, type GraphWindow, type MetadataProvider } from "./graph-merge";
import type { InitSuccess } from "./protocol";
import { SidecarManager } from "./sidecar-manager";

// Cầu nối dữ liệu: kết hợp hình học đồ thị từ engine F# (qua sidecar) với metadata
// commit (tác giả, tiêu đề, refs) để tạo cấu trúc sẵn sàng cho Webview vẽ trực tiếp.
// Tham khảo thiết kế:
// docs/02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md (Mục 1).

export class GraphDataBridge {
  private commitList: string[] = [];

  constructor(
    private readonly sidecar: SidecarManager,
    private readonly metadataProvider: MetadataProvider
  ) {}

  async initialize(repoPath: string, branch?: string): Promise<InitSuccess> {
    const init = await this.sidecar.initialize(repoPath, branch);
    this.commitList = init.commits;
    return init;
  }

  async invalidate(): Promise<InitSuccess> {
    const init = await this.sidecar.invalidate();
    this.commitList = init.commits;
    return init;
  }

  async loadWindow(from: number, to: number): Promise<GraphWindow> {
    const range = await this.sidecar.queryRange(from, to);
    const hashes = this.commitList.slice(from, to + 1);
    const metadata = await this.metadataProvider(hashes);
    const rows = mergeGraphWindow(this.commitList, metadata, range.nodes, from);
    return { from, rows, paths: range.paths };
  }
}
