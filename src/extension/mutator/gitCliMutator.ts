import { spawn } from "node:child_process";

// Module thực thi thao tác ghi an toàn qua Git CLI gốc (`git.exe`).
// Ranh giới an toàn: F# Core Engine chỉ đọc & tính toán; toàn bộ thao tác thay đổi
// trạng thái kho được ủy thác 100% cho tiến trình Git chính thống để bảo toàn chữ ký
// số (GPG/SSH), Git Credential Manager, git hooks, Git LFS và giải quyết xung đột.
// Tham khảo thiết kế:
// docs/02_design/001_windows/06_Webview_Integration_And_Git_Mutator.md (Mục 2).

export type MutatorOptions = {
  repoPath: string;
  gitPath?: string;
};

export type MutatorResult = {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

const INVALID_REF: MutatorResult = {
  ok: false,
  exitCode: null,
  stdout: "",
  stderr: ""
};

export class GitCliMutator {
  constructor(private readonly options: MutatorOptions) {}

  /** Cập nhật đường dẫn kho làm việc khi người dùng chuyển sang kho khác. */
  setRepo(repoPath: string): void {
    this.options.repoPath = repoPath;
  }

  private get gitPath(): string {
    return this.options.gitPath ?? "git";
  }

  /** Chạy một lệnh git trong thư mục kho, thu thập stdout/stderr và mã thoát. */
  private run(args: string[]): Promise<MutatorResult> {
    return new Promise((resolve) => {
      const child = spawn(this.gitPath, args, { cwd: this.options.repoPath });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", (err) => {
        resolve({ ok: false, exitCode: null, stdout, stderr: err.message });
      });
      child.on("close", (exitCode) => {
        resolve({ ok: exitCode === 0, exitCode, stdout, stderr });
      });
    });
  }

  /** Kiểm tra tên nhánh/tag hợp lệ trước khi gọi thao tác tạo/đổi tên. */
  async isValidRefName(name: string, kind: "branch" | "tag"): Promise<boolean> {
    const args =
      kind === "branch"
        ? ["check-ref-format", "--branch", name]
        : ["check-ref-format", `refs/tags/${name}`];
    const result = await this.run(args);
    return result.ok;
  }

  private supportsRestore: boolean | null = null;

  /**
   * Thăm dò phiên bản Git 1 lần duy nhất để kiểm tra hỗ trợ `git restore` (từ Git 2.23.0 trở lên).
   * Cache kết quả in-memory để không spawn thêm tiến trình ở các lần gọi sau.
   */
  async canUseRestore(): Promise<boolean> {
    if (this.supportsRestore !== null) {
      return this.supportsRestore;
    }
    const { stdout } = await this.run(["version"]);
    const m = stdout.match(/^git version (\d+)\.(\d+)/);
    this.supportsRestore =
      m !== null && (Number(m[1]) > 2 || (Number(m[1]) === 2 && Number(m[2]) >= 23));
    return this.supportsRestore;
  }

  /**
   * Chuẩn hóa các thông báo lỗi đặc thù của Git thành thông điệp thân thiện cho người dùng.
   * Nhận diện xung đột khóa `.git/index.lock` và lỗi thiếu danh tính tác giả (user.name/user.email).
   */
  private normalizeError(result: MutatorResult): MutatorResult {
    if (result.ok) {
      return result;
    }
    const { stderr } = result;
    if (stderr.includes("index.lock")) {
      return {
        ...result,
        stderr:
          "Kho mã nguồn đang bị khóa bởi một tiến trình Git khác. Vui lòng thử lại sau vài giây hoặc kiểm tra terminal"
      };
    }
    if (
      stderr.includes("Please tell me who you are") ||
      stderr.includes("unable to auto-detect email address")
    ) {
      return {
        ...result,
        stderr:
          "Chưa cấu hình danh tính tác giả (user.name / user.email). Vui lòng cấu hình trước khi commit"
      };
    }
    return result;
  }

  async commit(
    message: string,
    options: {
      sign?: boolean;
      all?: boolean;
      amend?: boolean;
      description?: string;
    } = {}
  ): Promise<MutatorResult> {
    const args = ["commit"];
    const hasMessage = message.trim().length > 0;
    if (hasMessage) {
      args.push("-m", message);
      if (options.description && options.description.trim().length > 0) {
        args.push("-m", options.description.trim());
      }
    }
    if (options.amend) {
      args.push("--amend");
      // Giữ nguyên message cũ khi amend mà không nhập tiêu đề mới (gộp thêm file).
      if (!hasMessage) {
        args.push("--no-edit");
      }
    }
    if (options.sign) {
      args.push("-S");
    }
    if (options.all) {
      args.push("-a");
    }
    return this.normalizeError(await this.run(args));
  }

  /**
   * Commit rồi tự động push nhánh hiện tại lên nhánh theo dõi từ xa (upstream) trong
   * một bước duy nhất. `git push` không tham số đẩy nhánh hiện tại theo cấu hình
   * `push.default` (mặc định `simple`).
   */
  async commitAndPush(
    message: string,
    options: {
      sign?: boolean;
      amend?: boolean;
      description?: string;
    } = {}
  ): Promise<MutatorResult> {
    const commitResult = await this.commit(message, options);
    if (!commitResult.ok) {
      return commitResult;
    }
    return this.run(["push"]);
  }

  /** Đưa một tệp vào Staging Index; `--` ngăn nhầm lẫn đường dẫn với nhánh/cờ (tương thích mọi bản Git). */
  async stageFile(filePath: string): Promise<MutatorResult> {
    return this.normalizeError(await this.run(["add", "--", filePath]));
  }

  /** Rút một tệp khỏi Staging Index; tự động fallback `git reset --` trên Git < 2.23. */
  async unstageFile(filePath: string): Promise<MutatorResult> {
    if (await this.canUseRestore()) {
      return this.normalizeError(await this.run(["restore", "--staged", "--", filePath]));
    }
    return this.normalizeError(await this.run(["reset", "--", filePath]));
  }

  /** Đưa toàn bộ tệp mới, sửa đổi và bị xóa vào Staging Index (tương thích mọi bản Git). */
  async stageAll(): Promise<MutatorResult> {
    return this.normalizeError(await this.run(["add", "-A"]));
  }

  /** Rút toàn bộ tệp khỏi Staging Index về lại working tree; fallback `git reset` trên Git < 2.23. */
  async unstageAll(): Promise<MutatorResult> {
    if (await this.canUseRestore()) {
      return this.normalizeError(await this.run(["restore", "--staged", "."]));
    }
    return this.normalizeError(await this.run(["reset"]));
  }

  /** Hoàn tác thay đổi một tệp: untracked -> clean -f, tracked -> restore (hoặc fallback checkout). */
  async discardFileChanges(filePath: string, isUntracked: boolean): Promise<MutatorResult> {
    if (isUntracked) {
      return this.normalizeError(await this.run(["clean", "-f", "--", filePath]));
    }
    if (await this.canUseRestore()) {
      return this.normalizeError(await this.run(["restore", "--", filePath]));
    }
    return this.normalizeError(await this.run(["checkout", "--", filePath]));
  }

  /** Làm sạch toàn bộ working tree; fallback `git checkout -- .` trên Git < 2.23, sau đó clean -fd. */
  async discardAllChanges(): Promise<MutatorResult> {
    const restore = (await this.canUseRestore())
      ? await this.run(["restore", "."])
      : await this.run(["checkout", "--", "."]);
    if (!restore.ok) {
      return this.normalizeError(restore);
    }
    return this.normalizeError(await this.run(["clean", "-fd"]));
  }

  async createBranch(name: string, commitHash: string): Promise<MutatorResult> {
    if (!(await this.isValidRefName(name, "branch"))) {
      return { ...INVALID_REF, stderr: `tên nhánh không hợp lệ: ${name}` };
    }
    return this.run(["branch", name, commitHash]);
  }

  async renameBranch(oldName: string, newName: string): Promise<MutatorResult> {
    if (!(await this.isValidRefName(newName, "branch"))) {
      return { ...INVALID_REF, stderr: `tên nhánh không hợp lệ: ${newName}` };
    }
    return this.run(["branch", "-m", oldName, newName]);
  }

  /** Xóa an toàn (`-d`) hoặc ép xóa (`-D`) nhánh. */
  async deleteBranch(name: string, force = false): Promise<MutatorResult> {
    return this.run(["branch", force ? "-D" : "-d", name]);
  }

  async checkout(name: string): Promise<MutatorResult> {
    return this.run(["checkout", name]);
  }

  async merge(source: string, createNewCommit = true): Promise<MutatorResult> {
    const args = ["merge", source];
    if (createNewCommit) {
      args.push("--no-ff");
    }
    return this.run(args);
  }

  async rebase(target: string): Promise<MutatorResult> {
    return this.run(["rebase", target]);
  }

  async rebaseContinue(): Promise<MutatorResult> {
    return this.run(["rebase", "--continue"]);
  }

  async rebaseAbort(): Promise<MutatorResult> {
    return this.run(["rebase", "--abort"]);
  }

  async cherryPick(commitHash: string): Promise<MutatorResult> {
    return this.run(["cherry-pick", commitHash]);
  }

  /** Tạo tag: lightweight khi không truyền message, annotated khi có message. */
  async addTag(name: string, message?: string): Promise<MutatorResult> {
    if (!(await this.isValidRefName(name, "tag"))) {
      return { ...INVALID_REF, stderr: `tên tag không hợp lệ: ${name}` };
    }
    if (message === undefined) {
      return this.run(["tag", name]);
    }
    return this.run(["tag", "-a", name, "-m", message]);
  }

  async push(remote = "origin", branch: string): Promise<MutatorResult> {
    return this.run(["push", remote, branch]);
  }

  async pull(rebase = false): Promise<MutatorResult> {
    return this.run(rebase ? ["pull", "--rebase"] : ["pull"]);
  }

  async fetch(remote = "origin"): Promise<MutatorResult> {
    return this.run(["fetch", remote]);
  }
}
