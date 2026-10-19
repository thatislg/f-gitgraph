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

export type PushOptions = {
  forceWithLease?: boolean;
  remote?: string;
  branch?: string;
  setUpstream?: boolean;
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
    const { stdout, stderr } = result;
    const output = stdout + "\n" + stderr;

    // Lỗi kết nối mạng tới remote (fetch/pull/push).
    if (
      output.includes("Could not resolve host") ||
      output.includes("Failed to connect") ||
      output.includes("Network is unreachable") ||
      output.includes("Could not read from remote repository")
    ) {
      return {
        ...result,
        stderr:
          "Unable to connect to the remote Git server. Please check your internet connection or remote URL."
      };
    }

    // Lỗi xác thực SSH/HTTPS bị remote từ chối.
    if (
      output.includes("Permission denied (publickey)") ||
      output.includes("Authentication failed") ||
      output.includes("Invalid username or password")
    ) {
      return {
        ...result,
        stderr: "Git authentication failed. Please verify your SSH key or Personal Access Token."
      };
    }

    if (
      stderr.includes("index.lock") ||
      stderr.includes("Another git process seems to be running")
    ) {
      return {
        ...result,
        stderr:
          "The repository is locked by another Git process. Please wait a few seconds or check your terminal."
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

  /** Tải toàn bộ commit/branch/tag từ mọi remote; `--prune` dọn tracking branch đã bị xóa. */
  async fetchAll(prune = true): Promise<MutatorResult> {
    const args = ["fetch", "--all"];
    if (prune) {
      args.push("--prune");
    }
    return this.normalizeError(await this.run(args));
  }

  /** Kéo thay đổi từ upstream theo chiến lược merge hoặc rebase, tự phát hiện xung đột. */
  async pull(mode: "merge" | "rebase"): Promise<MutatorResult> {
    const args = mode === "rebase" ? ["pull", "--rebase"] : ["pull", "--no-rebase"];
    const result = await this.run(args);
    if (!result.ok) {
      const output = result.stdout + "\n" + result.stderr;
      if (output.includes("CONFLICT")) {
        return this.normalizeError({
          ...result,
          stderr:
            mode === "rebase"
              ? "Rebase conflict detected. Please resolve conflicts or abort the rebase."
              : "Merge conflict detected. Please resolve conflicts in your working tree."
        });
      }
      if (output.includes("Your local changes to the following files would be overwritten")) {
        return this.normalizeError({
          ...result,
          stderr:
            "Your local changes would be overwritten by pull. Please commit or stash your changes before pulling."
        });
      }
    }
    return this.normalizeError(result);
  }

  /** Đẩy commit lên remote; hỗ trợ `--force-with-lease`, `-u` và chỉ định remote/branch đích. */
  async push(options: PushOptions = {}): Promise<MutatorResult> {
    const args = ["push"];
    if (options.forceWithLease) {
      args.push("--force-with-lease");
    }
    if (options.setUpstream) {
      args.push("-u");
    }
    if (options.remote !== undefined && options.branch !== undefined) {
      if (!(await this.isValidRefName(options.branch, "branch"))) {
        return { ...INVALID_REF, stderr: `Invalid branch name: ${options.branch}` };
      }
      args.push(options.remote, options.branch);
    }
    const result = await this.run(args);
    if (!result.ok) {
      const output = result.stdout + "\n" + result.stderr;
      if (output.includes("[rejected]") || output.includes("non-fast-forward")) {
        return this.normalizeError({
          ...result,
          stderr:
            "Push rejected: the remote branch contains work that you do not have locally. Please pull before pushing."
        });
      }
    }
    return this.normalizeError(result);
  }

  /** Lưu nhanh thay đổi vào ngăn xếp stash; `-u` kèm cả tệp untracked, `-m` gán thông điệp. */
  async stashSave(message?: string, includeUntracked = false): Promise<MutatorResult> {
    const args = ["stash", "push"];
    if (includeUntracked) {
      args.push("-u");
    }
    if (message !== undefined && message.trim().length > 0) {
      args.push("-m", message.trim());
    }
    args.push("--");
    return this.normalizeError(await this.run(args));
  }

  /** Khôi phục bản stash tại `stash@{index}` và xóa nó khỏi ngăn xếp. */
  async stashPop(index = 0): Promise<MutatorResult> {
    const validIndex = Math.max(0, Math.floor(index));
    const target = `stash@{${validIndex}}`;
    const result = await this.run(["stash", "pop", target]);
    if (!result.ok) {
      const output = result.stdout + "\n" + result.stderr;
      if (
        output.includes("is not a stash-like commit") ||
        output.includes("is not a valid reference") ||
        output.includes("No stash entries found")
      ) {
        return this.normalizeError({
          ...result,
          stderr: `Stash entry '${target}' does not exist or has already been dropped.`
        });
      }
      if (output.includes("CONFLICT")) {
        return this.normalizeError({
          ...result,
          stderr: "Conflict encountered while applying stash. Stash entry was preserved."
        });
      }
    }
    return this.normalizeError(result);
  }

  /** Xóa bỏ vĩnh viễn bản stash tại `stash@{index}`. */
  async stashDrop(index = 0): Promise<MutatorResult> {
    const validIndex = Math.max(0, Math.floor(index));
    return this.normalizeError(await this.run(["stash", "drop", `stash@{${validIndex}}`]));
  }
}
