import type { GitCommitNode, GraphRow } from "@/types";

import type { NodeGeometry, PathGeometry } from "./protocol";

// Gộp hình học đồ thị từ engine F# với metadata commit. Tách riêng để kiểm thử
// thuần túy không phụ thuộc vscode.

// Hash tổng hợp mà backend cấp cho dòng "Uncommitted Changes" ở đỉnh đồ thị.
// Đồng bộ với UNCOMMITTED_CHANGES trong src/webview/constants.ts.
export const UNCOMMITTED_CHANGES_HASH = "*";

// Khoảng cách dọc giữa hai dòng commit (pixel), đồng bộ với Geometry.RowHeight
// trong nhân F# (src/core-engine/Graph/Graph.fs) và ROW_HEIGHT trong Webview.
export const ROW_HEIGHT = 24;

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

/** Dòng tổng hợp "Uncommitted Changes" đặt ở hàng 0 (làn 0, màu 0). */
export function buildUncommittedRow(): GraphRow {
  return {
    hash: UNCOMMITTED_CHANGES_HASH,
    // Cấp metadata tối thiểu có hash "*" để getCommitNodeType nhận diện đúng
    // nodeType "uncommitted" (biểu tượng bút chì) trong đồ thị.
    metadata: {
      hash: UNCOMMITTED_CHANGES_HASH,
      parentHashes: [],
      author: "",
      email: "",
      date: 0,
      message: "",
      refs: []
    },
    x: 16,
    y: ROW_HEIGHT / 2,
    lane: 0,
    color: 0,
    isMerge: false,
    isRoot: false
  };
}

/**
 * Dịch toàn bộ tọa độ Y trong chuỗi lệnh vẽ SVG `d` (do F# renderPath sinh) xuống
 * `dy` pixel. Chỉ các lệnh mang tọa độ dọc bị dịch: `M` (số thứ 2), `V` (số duy nhất)
 * và `Q` (số thứ 2 và thứ 4); `H` giữ nguyên vì chỉ chứa tọa độ ngang.
 *
 * Dùng để dời đường nối nhánh xuống đúng một dòng khi chèn dòng `*` ở đỉnh đồ thị,
 * giữ nguyên quan hệ hình học tương đối giữa các commit thật.
 */
export function shiftPathD(d: string, dy: number): string {
  if (dy === 0 || d === "") {
    return d;
  }
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:[eE][+-]?\d+)?/g);
  if (tokens === null) {
    return d;
  }

  const out: string[] = [];
  let command = "";
  let argIndex = 0;
  for (const token of tokens) {
    if (/[A-Za-z]/.test(token)) {
      command = token;
      argIndex = 0;
      out.push(token);
      continue;
    }

    const value = Number(token);
    const isY =
      command === "V" ||
      (command === "M" && argIndex === 1) ||
      (command === "Q" && (argIndex === 1 || argIndex === 3));
    out.push(String(value + (isY ? dy : 0)));
    argIndex += 1;
  }

  return out.join(" ");
}
