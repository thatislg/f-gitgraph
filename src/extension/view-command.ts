import * as vscode from "vscode";

import { config } from "./config";
import { EXTENSION_NAME } from "./constants";
import { createWevbviewHtml } from "./html";
import { createMessageProtocol } from "./legacy";
import { initRpcNotify } from "./rpc/rpc-notify";
import { createRpcServer } from "./rpc/rpc-server";
import { disposeGraphService, startGraphService } from "./sidecar/graph-service";
import { initConfigWatcher } from "./watchers/config.watcher";
import { watchGitRepo } from "./watchers/git-repo.watcher";
import { watchGitDir } from "./watchers/git.watcher";

export function createViewCommand(ctx: vscode.ExtensionContext) {
  let currentPanel: vscode.WebviewPanel | undefined = undefined;
  const messageProtocol = createMessageProtocol(ctx);
  const rpcServer = createRpcServer();

  return () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.window.activeTextEditor?.viewColumn);
      return;
    }

    const webPanel = vscode.window.createWebviewPanel(
      "f-gitgraph",
      EXTENSION_NAME,
      vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(ctx.extensionUri, "media"),
          vscode.Uri.joinPath(ctx.extensionUri, "out")
        ]
      }
    );
    webPanel.iconPath =
      config.tabIconColourTheme() === "colour"
        ? vscode.Uri.joinPath(ctx.extensionUri, "resources", "webview-icon.svg")
        : {
            light: vscode.Uri.joinPath(ctx.extensionUri, "resources", "webview-icon-light.svg"),
            dark: vscode.Uri.joinPath(ctx.extensionUri, "resources", "webview-icon-dark.svg")
          };

    const messageProtocolAttachment = messageProtocol.attach(webPanel);
    const rpcListener = rpcServer.attach(webPanel.webview);
    const rpcNotifier = initRpcNotify(webPanel.webview);
    const configWatcher = initConfigWatcher();
    const gitDirWatcher = watchGitDir();
    const gitRepoWatcher = watchGitRepo();

    // Khởi động tiến trình F# sidecar (f-gitgraph-core.exe) phục vụ tính toán đồ thị.
    void startGraphService(ctx).catch(() => {
      // Lỗi đã được ghi log trong graph-service; đồ thị vẫn chạy bằng luồng TS cũ.
    });

    webPanel.webview.html = createWevbviewHtml(ctx, webPanel.webview);

    webPanel.onDidDispose(() => {
      disposeGraphService();
      messageProtocolAttachment.dispose();
      rpcListener.dispose();
      rpcNotifier.dispose();
      configWatcher.dispose();
      gitDirWatcher.dispose();
      gitRepoWatcher.dispose();
      currentPanel = undefined;
    });
    currentPanel = webPanel;
  };
}
