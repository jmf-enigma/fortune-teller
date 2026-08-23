#!/usr/bin/env node
import { access, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const required = [
  ".github/workflows/ci.yml", ".gitignore", "SKILL.md", "README.md", "README.en.md", "LICENSE", "SECURITY.md", "THIRD_PARTY_NOTICES.md",
  "BENCHMARK.md", "CHANGELOG.md", "CONTRIBUTING.md", "docs/ARCHITECTURE.md", "docs/MODEL_TIERS.md",
  "docs/COMPETITOR_AUDIT.md", "docs/RELEASE_AUDIT.md", "docs/SCOPE.md",
  "agents/openai.yaml", "assets/README.md", "scripts/fortune-teller.mjs", "src/index.mjs",
  "schemas/calculation-result.schema.json", "schemas/request.schema.json", "schemas/reading.schema.json",
  "schemas/evidence-card.schema.json", "schemas/error.schema.json", "schemas/reading-validation-payload.schema.json",
  "test/contract.test.mjs",
];
const errors = [];
for (const path of required) {
  try { await access(join(root, path)); } catch { errors.push(`missing required file: ${path}`); }
}

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(path));
    else if (/\.(mjs|js)$/.test(entry.name)) result.push(path);
  }
  return result;
}

for (const directory of ["src", "scripts"]) {
  for (const path of await sourceFiles(join(root, directory))) {
    const text = await readFile(path, "utf8");
    if (
      /\bfetch\s*\(|https?\.request\s*\(|\baxios\b|\bWebSocket\b|\bEventSource\b/.test(text)
      || /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["'](?:node:)?(?:http|https|net|tls|dns|dgram)["']/.test(text)
    ) {
      errors.push(`network-capable source detected: ${path.slice(root.length + 1)}`);
    }
  }
}

try {
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
  const rootLockDependencies = lock.packages?.[""]?.dependencies || {};
  for (const [name, version] of Object.entries(manifest.dependencies || {})) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
      errors.push(`dependency ${name} is not pinned to one exact version`);
    }
    if (rootLockDependencies[name] !== version) {
      errors.push(`package-lock root dependency does not match ${name}@${version}`);
    }
  }
} catch (error) {
  errors.push(`cannot validate pinned dependencies: ${error.message}`);
}

for (const name of [
  "calculation-result.schema.json", "request.schema.json", "reading.schema.json", "evidence-card.schema.json",
  "error.schema.json", "reading-validation-payload.schema.json",
]) {
  try {
    const schema = JSON.parse(await readFile(join(root, "schemas", name), "utf8"));
    if (typeof schema.$id !== "string" || schema.$id.includes("example.invalid")) {
      errors.push(`schema ${name} has a missing or placeholder $id`);
    }
  }
  catch (error) { errors.push(`invalid or missing schema ${name}: ${error.message}`); }
}

try {
  const skill = await readFile(join(root, "SKILL.md"), "utf8");
  for (const match of skill.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split("#", 1)[0];
    if (!target || /^[a-z]+:/i.test(target) || target.startsWith("#")) continue;
    try { await access(join(root, target)); }
    catch { errors.push(`SKILL.md references a missing resource: ${target}`); }
  }
} catch (error) {
  errors.push(`cannot inspect SKILL.md links: ${error.message}`);
}

for (const path of ["scripts/fortune-teller.mjs", "scripts/doctor.mjs", "scripts/release-check.mjs", "scripts/package-skill.mjs"]) {
  try {
    const info = await stat(join(root, path));
    if (process.platform !== "win32" && (info.mode & 0o111) === 0) errors.push(`${path} is not executable`);
  } catch {
    // Missing files are reported by the required-file pass where applicable.
  }
}

try {
  const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
  const notices = await readFile(join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
  for (const [path, descriptor] of Object.entries(lock.packages || {})) {
    if (!path.startsWith("node_modules/") || !descriptor.version) continue;
    const packageName = path.slice("node_modules/".length);
    if (!descriptor.license) errors.push(`dependency ${packageName}@${descriptor.version} has no lockfile license`);
    if (!notices.includes(`\`${packageName}\``) || !notices.includes(descriptor.version)) {
      errors.push(`THIRD_PARTY_NOTICES.md does not inventory ${packageName}@${descriptor.version}`);
    }
  }
} catch (error) {
  errors.push(`cannot validate dependency notices: ${error.message}`);
}

process.stdout.write(`${JSON.stringify({ ok: errors.length === 0, errors }, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
