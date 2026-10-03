import type { GitCommitNode } from "@/backend/types";

import type { NodeGeometry, PathGeometry } from "./protocol";

// Gộp hình học đồ thị từ engine F# với metadata commit. Tách riêng để kiểm thử
// thuần túy không phụ thuộc vscode.

export type GraphRow = {
  hash: string;
  metadata: GitCommitNode | undefined;
  x: number;
  y: number;
  lane: number;
  color: number;
  isMerge: boolean;
  isRoot: boolean;
};

export type GraphWindow = {
  from: number;
  rows: GraphRow[];
  paths: PathGeometry[];
};

export type MetadataProvider = (hashes: string[]) => Promise<ReadonlyMap<string, GitCommitNode>>;

/** Gộp hình học của một cửa sổ với metadata commit theo chỉ số dòng. */
export function mergeGraphWindow(
  commits: string[],
  metadata: ReadonlyMap<string, GitCommitNode>,
  nodes: NodeGeometry[],
  from: number
): GraphRow[] {
  return nodes.map((node, index) => {
    const hash = commits[from + index] ?? "";
    return {
      hash,
      metadata: hash === "" ? undefined : metadata.get(hash),
      x: node.x,
      y: node.y,
      lane: node.lane,
      color: node.color,
      isMerge: node.isMerge,
      isRoot: node.isRoot
    };
  });
}
