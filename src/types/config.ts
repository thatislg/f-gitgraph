export type DateFormat = "Date & Time" | "Date Only" | "Relative";
export type GraphStyle = "rounded" | "angular";
export type WheelStyle = "chromatic" | "monochromatic";

export type WebviewConfig = Readonly<{
  autoCenterCommitDetailsView: boolean;
  dateFormat: DateFormat;
  fetchAvatars: boolean;
  graphColours: readonly string[];
  graphStyle: GraphStyle;
  initialLoadCommits: number;
  loadMoreCommits: number;
  /** VS Code display language (vscode.env.language), used for Intl date formatting */
  locale: string;
  showCurrentBranchByDefault: boolean;
  /** Phong cách thẩm mỹ của trạm chỉ huy bánh xe lục giác. */
  wheelStyle: WheelStyle;
}>;
