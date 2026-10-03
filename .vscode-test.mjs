import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "tests-e2e/out/**/*.test.js",
  workspaceFolder: ".",
  version: "stable"
});
