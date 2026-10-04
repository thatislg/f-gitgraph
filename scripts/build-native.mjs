#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cross-platform build script for F# Native AOT core engine (f-gitgraph-core)
 * Supports Windows, Linux, and macOS across x64 and arm64 architectures.
 *
 * Usage:
 *   node scripts/build-native.mjs [--rid <rid>] [--configuration <Release|Debug>]
 *
 * Examples:
 *   node scripts/build-native.mjs
 *   node scripts/build-native.mjs --rid linux-x64
 *   node scripts/build-native.mjs --rid osx-arm64
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const coreEngineDir = path.join(repoRoot, "src", "core-engine");

// Parse arguments
const args = process.argv.slice(2);
let configuration = "Release";
let rid = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--configuration" || args[i] === "-c") {
    configuration = args[++i] || "Release";
  } else if (args[i] === "--rid" || args[i] === "-r") {
    rid = args[++i] || "";
  }
}

// Auto-detect RID if not provided
if (!rid) {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") {
    rid = arch === "arm64" ? "win-arm64" : "win-x64";
  } else if (platform === "linux") {
    rid = arch === "arm64" ? "linux-arm64" : "linux-x64";
  } else if (platform === "darwin") {
    rid = arch === "arm64" ? "osx-arm64" : "osx-x64";
  } else {
    console.error(`[build-native] Unsupported platform: ${platform} (${arch})`);
    process.exit(1);
  }
}

console.log(`==> [build-native] Target RID: ${rid}, Configuration: ${configuration}`);

const publishDir = path.join(coreEngineDir, "bin", configuration, "net10.0", rid, "publish");
const targetDir = path.join(repoRoot, "bin", rid);

// Execute dotnet publish
const dotnetArgs = [
  "publish",
  "core-engine.fsproj",
  "-c",
  configuration,
  "-r",
  rid,
  "--nologo",
  "-v",
  "minimal"
];

console.log(`==> [build-native] Running: dotnet ${dotnetArgs.join(" ")} in ${coreEngineDir}`);
const res = spawnSync("dotnet", dotnetArgs, {
  cwd: coreEngineDir,
  stdio: "inherit",
  shell: false
});

if (res.status !== 0) {
  console.error(`[build-native] dotnet publish failed with exit code ${res.status}`);
  process.exit(res.status ?? 1);
}

if (!fs.existsSync(publishDir)) {
  console.error(`[build-native] Publish directory not found: ${publishDir}`);
  process.exit(1);
}

// Locate output files
const isWindows = rid.startsWith("win");
const isMac = rid.startsWith("osx");
const isLinux = rid.startsWith("linux");

const exeName = isWindows ? "f-gitgraph-core.exe" : "f-gitgraph-core";
const exeSourcePath = path.join(publishDir, exeName);

if (!fs.existsSync(exeSourcePath)) {
  console.error(`[build-native] Main executable not found: ${exeSourcePath}`);
  process.exit(1);
}

// Find LibGit2 native library
const files = fs.readdirSync(publishDir);
let libgit2Name = "";
if (isWindows) {
  libgit2Name = files.find((f) => f.startsWith("git2") && f.endsWith(".dll")) || "git2-5853918.dll";
} else if (isLinux) {
  libgit2Name = files.find((f) => f.includes("git2") && f.endsWith(".so")) || "libgit2-5853918.so";
} else if (isMac) {
  libgit2Name =
    files.find((f) => f.includes("git2") && f.endsWith(".dylib")) || "libgit2-5853918.dylib";
}

const libgit2SourcePath = path.join(publishDir, libgit2Name);

fs.mkdirSync(targetDir, { recursive: true });

// Copy executable
const exeDestPath = path.join(targetDir, exeName);
fs.copyFileSync(exeSourcePath, exeDestPath);
if (!isWindows) {
  fs.chmodSync(exeDestPath, 0o755);
}

// Copy LibGit2 if present
let hasLibGit2 = false;
if (fs.existsSync(libgit2SourcePath)) {
  const libgit2DestPath = path.join(targetDir, libgit2Name);
  fs.copyFileSync(libgit2SourcePath, libgit2DestPath);
  hasLibGit2 = true;
}

const exeStat = fs.statSync(exeDestPath);
const exeSizeKiB = (exeStat.size / 1024).toFixed(1);

console.log(`==> [build-native] Success! Output placed in: ${targetDir}`);
console.log(`    Executable: ${exeName} (${exeSizeKiB} KiB)`);
if (hasLibGit2) {
  const libStat = fs.statSync(path.join(targetDir, libgit2Name));
  const libSizeKiB = (libStat.size / 1024).toFixed(1);
  console.log(`    LibGit2:    ${libgit2Name} (${libSizeKiB} KiB)`);
}
