#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, posix } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const output = join(dist, "fortune-teller-skill.zip");
const checksumOutput = join(dist, "SHA256SUMS");
const releaseManifestPath = join(root, "release-files.json");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const expectedReleaseFileCount = 125;
const expectedControlledRoots = [
  ".github", "agents", "assets", "docs", "references", "schemas", "scripts", "src", "test",
];

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertSortedUnique(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate entries`);
  if (!arraysEqual(values, [...values].sort())) throw new Error(`${label} must be sorted`);
}

function assertSafeRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  if (value.includes("\\") || /[\u0000-\u001f\u007f:*?"<>|]/u.test(value)) {
    throw new Error(`${label} contains a non-portable or unsafe character: ${JSON.stringify(value)}`);
  }
  if (posix.isAbsolute(value) || value !== posix.normalize(value)) {
    throw new Error(`${label} must be a normalized relative path: ${JSON.stringify(value)}`);
  }
  const segments = value.split("/");
  for (const segment of segments) {
    if (!segment || segment === "." || segment === ".." || /[ .]$/u.test(segment)) {
      throw new Error(`${label} contains an unsafe path segment: ${JSON.stringify(value)}`);
    }
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(segment)) {
      throw new Error(`${label} contains a Windows-reserved path segment: ${JSON.stringify(value)}`);
    }
  }
}

async function loadReleaseManifest() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(releaseManifestPath, "utf8"));
  } catch (error) {
    throw new Error(`cannot read release-files.json: ${error.message}`);
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("release-files.json must contain an object");
  }
  if (!arraysEqual(Object.keys(manifest).sort(), ["controlled_roots", "files", "version"])) {
    throw new Error("release-files.json has an unexpected shape");
  }
  if (manifest.version !== 1) throw new Error("release-files.json has an unsupported version");
  assertSortedUnique(manifest.controlled_roots, "release controlled_roots");
  assertSortedUnique(manifest.files, "release files");
  if (manifest.files.length !== expectedReleaseFileCount) {
    throw new Error(`release-files.json must list exactly ${expectedReleaseFileCount} files`);
  }
  if (!arraysEqual(manifest.controlled_roots, expectedControlledRoots)) {
    throw new Error("release-files.json controlled_roots do not match the release policy");
  }
  for (const controlledRoot of manifest.controlled_roots) {
    assertSafeRelativePath(controlledRoot, "release controlled root");
    if (controlledRoot.includes("/")) throw new Error(`controlled root must be top-level: ${controlledRoot}`);
  }
  const rootSet = new Set(manifest.controlled_roots);
  const portableNames = new Map();
  for (const file of manifest.files) {
    assertSafeRelativePath(file, "release file");
    if (file.includes("/") && !rootSet.has(file.split("/", 1)[0])) {
      throw new Error(`release file is outside controlled roots: ${file}`);
    }
    const portableName = file.normalize("NFC").toLowerCase();
    if (portableNames.has(portableName)) {
      throw new Error(`release files collide on portable filesystems: ${portableNames.get(portableName)}, ${file}`);
    }
    portableNames.set(portableName, file);
  }
  if (!manifest.files.includes("release-files.json")) {
    throw new Error("release-files.json must include itself");
  }
  return manifest;
}

async function auditReleaseTree(manifest) {
  const fileSet = new Set(manifest.files);
  const expectedDirectories = new Set(manifest.controlled_roots);
  for (const file of manifest.files) {
    const segments = file.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      expectedDirectories.add(segments.slice(0, index).join("/"));
    }
  }

  async function auditDirectory(relativePath) {
    const directoryInfo = await lstat(join(root, relativePath));
    if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) {
      throw new Error(`release controlled root is not a real directory: ${relativePath}`);
    }
    const entries = (await readdir(join(root, relativePath), { withFileTypes: true }))
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const child = `${relativePath}/${entry.name}`;
      assertSafeRelativePath(child, "release tree member");
      const info = await lstat(join(root, child));
      if (info.isSymbolicLink()) throw new Error(`refusing to package symbolic link: ${child}`);
      if (info.isDirectory()) {
        if (!expectedDirectories.has(child)) throw new Error(`unlisted directory in release tree: ${child}`);
        await auditDirectory(child);
      } else if (info.isFile()) {
        if (!fileSet.has(child)) throw new Error(`unlisted file in release tree: ${child}`);
      } else {
        throw new Error(`unsupported filesystem member in release tree: ${child}`);
      }
    }
  }

  for (const controlledRoot of manifest.controlled_roots) await auditDirectory(controlledRoot);
  for (const file of manifest.files) {
    let info;
    try {
      info = await lstat(join(root, file));
    } catch {
      throw new Error(`missing release file: ${file}`);
    }
    if (info.isSymbolicLink()) throw new Error(`refusing to package symbolic link: ${file}`);
    if (!info.isFile()) throw new Error(`release manifest member is not a regular file: ${file}`);
  }
}

await mkdir(dist, { recursive: true });
await Promise.all([rm(output, { force: true }), rm(checksumOutput, { force: true })]);
const manifest = await loadReleaseManifest();
await auditReleaseTree(manifest);

const check = spawnSync(npm, ["run", "check"], { cwd: root, stdio: "inherit" });
if (check.error) throw check.error;
if (check.status !== 0) process.exit(check.status ?? 1);

// Re-audit after checks so a generated or replaced file cannot enter the archive unnoticed.
await auditReleaseTree(manifest);
const result = spawnSync("zip", ["-X", "-q", output, ...manifest.files], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) {
  await rm(output, { force: true });
  process.exit(result.status ?? 1);
}

try {
  const checksum = createHash("sha256").update(await readFile(output)).digest("hex");
  await writeFile(checksumOutput, `${checksum}  fortune-teller-skill.zip\n`, "utf8");
} catch (error) {
  await Promise.all([rm(output, { force: true }), rm(checksumOutput, { force: true })]);
  throw error;
}
process.stdout.write(`${output}\n${checksumOutput}\n`);
