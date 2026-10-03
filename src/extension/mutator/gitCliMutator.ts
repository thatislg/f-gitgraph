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

  async commit(
    message: string,
    options: { sign?: boolean; all?: boolean } = {}
  ): Promise<MutatorResult> {
    const args = ["commit", "-m", message];
    if (options.sign) {
      args.push("-S");
    }
    if (options.all) {
      args.push("-a");
    }
    return this.run(args);
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
