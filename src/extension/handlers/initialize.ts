import * as vscode from "vscode";

import { config } from "@/extension/config";
import { getWebviewLocalizedStrings } from "@/extension/l10n/webviewL10n";
import type { WebviewConfig, WebviewInitialize } from "@/types";

export async function webviewInitialize(): Promise<WebviewInitialize> {
  const webviewConfig: WebviewConfig = {
    autoCenterCommitDetailsView: config.autoCenterCommitDetailsView(),
    dateFormat: config.dateFormat(),
    fetchAvatars: config.fetchAvatars(),
    graphColours: config.graphColours(),
    graphStyle: config.graphStyle(),
    initialLoadCommits: config.initialLoadCommits(),
    loadMoreCommits: config.loadMoreCommits(),
    locale: vscode.env.language,
    showCurrentBranchByDefault: config.showCurrentBranchByDefault()
  };

  return {
    l10n: getWebviewLocalizedStrings(),
    config: webviewConfig
  };
}
