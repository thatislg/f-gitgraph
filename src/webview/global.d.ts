declare module "*.css";

declare function acquireVsCodeApi(): {
  getState(): unknown;
  setState(state: unknown): void;
  postMessage(message: import("@/types").RequestMessage | import("@/types").RpcRequest): void;
};

interface Window {
  l10n: import("@/extension/l10n/webviewL10n").LocalizedStrings;
  /** URI (webview) của tệp âm thanh xoay bánh xe, do extension host inject vào HTML. */
  __WHEELTURN_AUDIO_URL__?: string;
}
