export type FsHandler = (uri: { fsPath: string }) => void;

export type MockFileSystemWatcher = {
  onDidCreate: (fn: FsHandler) => { dispose: () => void };
  onDidChange: (fn: FsHandler) => { dispose: () => void };
  onDidDelete: (fn: FsHandler) => { dispose: () => void };
  dispose: () => void;
  /** Tiện ích cho test: bắn sự kiện giả lập vào handler đã đăng ký. */
  _fire: (event: "create" | "change" | "del", fsPath: string) => void;
};

/** Danh sách watcher đã tạo để test có thể kích hoạt sự kiện tệp giả lập. */
export const createdWatchers: MockFileSystemWatcher[] = [];

export const workspace = {
  getConfiguration: () => ({ get: (_key: string, def: unknown) => def }),
  workspaceFolders: undefined,
  createFileSystemWatcher: () => {
    const handlers: Partial<Record<"create" | "change" | "del", FsHandler>> = {};
    const watcher: MockFileSystemWatcher = {
      onDidCreate: (fn) => {
        handlers.create = fn;
        return { dispose: () => {} };
      },
      onDidChange: (fn) => {
        handlers.change = fn;
        return { dispose: () => {} };
      },
      onDidDelete: (fn) => {
        handlers.del = fn;
        return { dispose: () => {} };
      },
      dispose: () => {},
      _fire: (event, fsPath) => handlers[event]?.({ fsPath })
    };
    createdWatchers.push(watcher);
    return watcher;
  },
  onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
  onDidChangeConfiguration: () => ({ dispose: () => {} })
};

export class RelativePattern {
  constructor(
    public base: string,
    public pattern: string
  ) {}
}

export const Uri = {
  file: (p: string) => ({ fsPath: p }),
  joinPath: (...parts: string[]) => parts.join("/")
};

export class Disposable {
  constructor(private readonly callback?: () => void) {}
  dispose() {
    this.callback?.();
  }
}

export const commands = {
  registerCommand: () => ({ dispose: () => {} })
};

export const window = {
  showErrorMessage: () => Promise.resolve(undefined),
  createOutputChannel: () => ({})
};
