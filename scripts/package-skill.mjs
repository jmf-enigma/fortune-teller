#!/usr/bin/env node
import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const output = join(dist, "fortune-teller-skill.zip");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const check = spawnSync(npm, ["run", "check"], { cwd: root, stdio: "inherit" });
if (check.error) throw check.error;
if (check.status !== 0) process.exit(check.status ?? 1);
await mkdir(dist, { recursive: true });
await rm(output, { force: true });
const includes = [
  ".github", ".gitignore", "SKILL.md", "agents", "assets", "docs", "references", "schemas", "scripts", "src", "test",
  "package.json", "package-lock.json", "README.md", "README.en.md", "BENCHMARK.md", "CHANGELOG.md",
  "CONTRIBUTING.md", "LICENSE", "SECURITY.md", "THIRD_PARTY_NOTICES.md",
];
const result = spawnSync("zip", ["-q", "-r", output, ...includes], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
process.stdout.write(`${output}\n`);
