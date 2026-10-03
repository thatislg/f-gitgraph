import * as vscode from "vscode";

import { gitClientFactory } from "@/backend/gitClient";
import { config } from "@/extension/config";
import { AvatarManager } from "@/extension/services/avatarManager";
import { DiffDocProvider } from "@/extension/services/diffDocProvider";
import { ExtensionState } from "@/extension/services/extensionState";
import { registerMessageHandlers } from "@/extension/services/messageHandler";
import { createRepoManager } from "@/extension/services/repoManager";
import { webviewBridgeFactory } from "@/extension/services/webviewBridge";
import type { WebviewBridge } from "@/extension/services/webviewBridge";

export function createMessageProtocol(ctx: vscode.ExtensionContext) {
  const extensionState = new ExtensionState(ctx);
  const avatarManager = new AvatarManager(config.gitPath, extensionState);
  const gitClient = gitClientFactory(extensionState.getLastActiveRepo() ?? "", config.gitPath());
  const repoManager = createRepoManager(extensionState, config);

  ctx.subscriptions.push(
    vscode.commands.registerCommand("f-gitgraph.clearAvatarCache", () => {
      avatarManager.clearCache();
    }),
    vscode.workspace.registerTextDocumentContentProvider(
      DiffDocProvider.scheme,
      new DiffDocProvider(gitClient.getInstance)
    )
  );

  return {
    attach(panel: vscode.WebviewPanel) {
      let isPanelVisible = panel.visible;
      let disposed = false;
      const bridge: WebviewBridge = webviewBridgeFactory(panel.webview);
      avatarManager.registerBridge(bridge.post);

      const { onPanelShown } = registerMessageHandlers(bridge, {
        config,
        gitClient,
        repoManager,
        extensionState,
        avatarManager
      });
      const viewStateListener = panel.onDidChangeViewState(() => {
        if (panel.visible === isPanelVisible) {
          return;
        }
        if (panel.visible) {
          onPanelShown();
          bridge.post({ command: "refresh" });
        }
        isPanelVisible = panel.visible;
      });

      return {
        dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
          bridge.dispose();
          viewStateListener.dispose();
          avatarManager.deregisterBridge();
        }
      };
    }
  };
}
