#!/usr/bin/env node
import { access, lstat, readFile, readdir, stat } from "node:fs/promises";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const expectedReleaseFileCount = 118;
const expectedControlledRoots = [
  ".github", "agents", "assets", "docs", "references", "schemas", "scripts", "src", "test",
];
const required = [
  ".github/workflows/ci.yml", ".gitignore", "release-files.json", "package.json", "package-lock.json",
  "SKILL.md", "README.md", "README.en.md", "LICENSE", "SECURITY.md", "THIRD_PARTY_NOTICES.md",
  "BENCHMARK.md", "CHANGELOG.md", "CONTRIBUTING.md", "docs/ARCHITECTURE.md", "docs/MODEL_TIERS.md",
  "docs/COMPETITOR_AUDIT.md", "docs/PROFESSIONAL_COVERAGE.md", "docs/RELEASE_AUDIT.md", "docs/SCOPE.md",
  "agents/openai.yaml", "assets/README.md", "scripts/fortune-teller.mjs", "scripts/doctor.mjs",
  "scripts/package-skill.mjs", "scripts/release-check.mjs", "src/index.mjs",
  "src/core/adjudicate.mjs", "src/core/bazi-adjudicator.mjs", "src/core/blind-check.mjs", "src/core/calculation-verifier.mjs", "src/core/claim-semantics.mjs", "src/core/meaning-layer.mjs",
  "src/core/iching-adjudicator.mjs", "src/core/meihua-adjudicator.mjs", "src/core/method-router.mjs", "src/core/tarot-adjudicator.mjs", "src/core/western-adjudicator.mjs",
  "src/core/ziwei-adjudicator.mjs", "src/core/ziwei-reading-adjudicator.mjs", "src/data/bazi-adjudication-rulepack.mjs", "src/data/bazi-climate-rulepack.mjs",
  "src/data/iching-interpretation-rulepack.mjs", "src/data/meihua-interpretation-rulepack.mjs", "src/data/tarot-interpretation-rulepack.mjs", "src/data/western-interpretation-rulepack.mjs",
  "src/data/source-registry.mjs", "src/data/rule-registry.mjs",
  "src/data/meaning-registry.mjs", "src/data/ziwei-adjudication-rulepack.mjs", "src/data/ziwei-sanhe-rulepack.mjs",
  "src/data/interpretation-profile-registry.mjs", "references/accuracy-evaluation.md", "references/professional-reading.md",
  "references/systems/bazi-professional.md", "references/systems/ziwei-adjudication.md", "references/systems/ziwei-reading-map.md",
  "schemas/blind-check-input.schema.json", "schemas/blind-check-record.schema.json",
  "schemas/blind-check-adjudications.schema.json", "schemas/blind-check-score.schema.json",
  "schemas/calculation-result.schema.json", "schemas/request.schema.json", "schemas/reading.schema.json",
  "schemas/evidence-card.schema.json", "schemas/error.schema.json", "schemas/reading-validation-payload.schema.json",
  "test/adjudicate-v05.test.mjs", "test/bazi-adjudication-v04.test.mjs", "test/bazi-luck-cycles.test.mjs", "test/bazi-professional-v05.test.mjs", "test/blind-check.test.mjs", "test/claim-semantics.test.mjs",
  "test/contract.test.mjs", "test/interactive.test.mjs", "test/offline.test.mjs", "test/professional-v03.test.mjs",
  "test/iching-meihua-adjudicator-v05.test.mjs", "test/method-router-v05.test.mjs", "test/tarot-adjudicator-v05.test.mjs", "test/western-adjudicator-v05.test.mjs",
  "test/ziwei-adjudication-v04.test.mjs", "test/ziwei-phase-components.test.mjs", "test/ziwei-reading-adjudicator-v05.test.mjs",
];
const errors = [];
for (const path of required) {
  try { await access(join(root, path)); } catch { errors.push(`missing required file: ${path}`); }
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function releasePathIssue(value) {
  if (typeof value !== "string" || value.length === 0) return "must be a non-empty string";
  if (value.includes("\\") || /[\u0000-\u001f\u007f:*?"<>|]/u.test(value)) {
    return "contains a non-portable or unsafe character";
  }
  if (posix.isAbsolute(value) || value !== posix.normalize(value)) return "is not a normalized relative path";
  for (const segment of value.split("/")) {
    if (!segment || segment === "." || segment === ".." || /[ .]$/u.test(segment)) {
      return "contains an unsafe path segment";
    }
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(segment)) {
      return "contains a Windows-reserved path segment";
    }
  }
  return null;
}

try {
  const candidate = JSON.parse(await readFile(join(root, "release-files.json"), "utf8"));
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    errors.push("release-files.json must contain an object");
  } else {
    if (!arraysEqual(Object.keys(candidate).sort(), ["controlled_roots", "files", "version"])) {
      errors.push("release-files.json has an unexpected shape");
    }
    if (candidate.version !== 1) errors.push("release-files.json has an unsupported version");
    for (const [label, values] of [
      ["controlled_roots", candidate.controlled_roots],
      ["files", candidate.files],
    ]) {
      if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
        errors.push(`release ${label} must be an array of strings`);
        continue;
      }
      if (new Set(values).size !== values.length) errors.push(`release ${label} contains duplicate entries`);
      if (!arraysEqual(values, [...values].sort())) errors.push(`release ${label} must be sorted`);
    }
    if (Array.isArray(candidate.files) && candidate.files.length !== expectedReleaseFileCount) {
      errors.push(`release-files.json must list exactly ${expectedReleaseFileCount} files`);
    }

    if (Array.isArray(candidate.controlled_roots) && candidate.controlled_roots.every((value) => typeof value === "string")) {
      if (!arraysEqual(candidate.controlled_roots, expectedControlledRoots)) {
        errors.push("release controlled_roots do not match the release policy");
      }
      for (const controlledRoot of candidate.controlled_roots) {
        const issue = releasePathIssue(controlledRoot);
        if (issue) errors.push(`unsafe release controlled root ${JSON.stringify(controlledRoot)}: ${issue}`);
        if (controlledRoot.includes("/")) errors.push(`release controlled root must be top-level: ${controlledRoot}`);
      }
    }

    if (Array.isArray(candidate.files) && candidate.files.every((value) => typeof value === "string")) {
      const fileSet = new Set(candidate.files);
      const rootSet = new Set(expectedControlledRoots);
      const portableNames = new Map();
      const unsafeFiles = new Set();
      for (const file of candidate.files) {
        const issue = releasePathIssue(file);
        if (issue) {
          errors.push(`unsafe release file ${JSON.stringify(file)}: ${issue}`);
          unsafeFiles.add(file);
          continue;
        }
        if (file.includes("/") && !rootSet.has(file.split("/", 1)[0])) {
          errors.push(`release file is outside controlled roots: ${file}`);
        }
        const portableName = file.normalize("NFC").toLowerCase();
        const collision = portableNames.get(portableName);
        if (collision && collision !== file) errors.push(`release paths collide on portable filesystems: ${collision}, ${file}`);
        else portableNames.set(portableName, file);
      }
      if (!fileSet.has("release-files.json")) errors.push("release-files.json must include itself");
      for (const path of required) {
        if (!fileSet.has(path)) errors.push(`release manifest omits required file: ${path}`);
      }

      const expectedDirectories = new Set(expectedControlledRoots);
      for (const file of candidate.files) {
        if (unsafeFiles.has(file)) continue;
        const segments = file.split("/");
        for (let index = 1; index < segments.length; index += 1) {
          expectedDirectories.add(segments.slice(0, index).join("/"));
        }
      }
      async function auditControlledDirectory(relativePath) {
        let directoryInfo;
        try {
          directoryInfo = await lstat(join(root, relativePath));
        } catch {
          errors.push(`missing release controlled root: ${relativePath}`);
          return;
        }
        if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) {
          errors.push(`release controlled root is not a real directory: ${relativePath}`);
          return;
        }
        const entries = (await readdir(join(root, relativePath), { withFileTypes: true }))
          .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
        for (const entry of entries) {
          const child = `${relativePath}/${entry.name}`;
          const issue = releasePathIssue(child);
          if (issue) {
            errors.push(`unsafe release tree member ${JSON.stringify(child)}: ${issue}`);
            continue;
          }
          let info;
          try {
            info = await lstat(join(root, child));
          } catch {
            errors.push(`cannot inspect release tree member: ${child}`);
            continue;
          }
          if (info.isSymbolicLink()) errors.push(`release tree contains symbolic link: ${child}`);
          else if (info.isDirectory()) {
            if (!expectedDirectories.has(child)) errors.push(`unlisted directory in release tree: ${child}`);
            await auditControlledDirectory(child);
          } else if (info.isFile()) {
            if (!fileSet.has(child)) errors.push(`unlisted file in release tree: ${child}`);
          } else errors.push(`unsupported filesystem member in release tree: ${child}`);
        }
      }
      for (const controlledRoot of expectedControlledRoots) await auditControlledDirectory(controlledRoot);

      for (const file of candidate.files) {
        if (unsafeFiles.has(file)) continue;
        let info;
        try {
          info = await lstat(join(root, file));
        } catch {
          errors.push(`missing release file: ${file}`);
          continue;
        }
        if (info.isSymbolicLink()) errors.push(`release manifest member is a symbolic link: ${file}`);
        else if (!info.isFile()) errors.push(`release manifest member is not a regular file: ${file}`);
      }
    }
  }
} catch (error) {
  errors.push(`cannot validate release-files.json: ${error.message}`);
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
  if (!Array.isArray(manifest.files) || !manifest.files.includes("release-files.json")) {
    errors.push("package.json files does not include release-files.json");
  }
  if (manifest.version !== lock.version || manifest.version !== lock.packages?.[""]?.version) {
    errors.push("package.json and package-lock.json release versions do not match");
  }
  const resultSource = await readFile(join(root, "src/core/result.mjs"), "utf8");
  const engineVersion = resultSource.match(/ENGINE_VERSION\s*=\s*"([^"]+)"/)?.[1];
  if (engineVersion !== manifest.version) errors.push("ENGINE_VERSION does not match package.json version");
  for (const readmeName of ["README.md", "README.en.md"]) {
    const readme = await readFile(join(root, readmeName), "utf8");
    if (!readme.includes(`\`${manifest.version}\``)) errors.push(`${readmeName} does not name the current release version`);
  }
  const releaseAudit = await readFile(join(root, "docs/RELEASE_AUDIT.md"), "utf8");
  if (!releaseAudit.includes(`# Release Audit — ${manifest.version}`)) {
    errors.push("docs/RELEASE_AUDIT.md does not name the current release version");
  }
  const supportedSeries = manifest.version.split(".").slice(0, 2).join(".");
  const security = await readFile(join(root, "SECURITY.md"), "utf8");
  if (!security.includes(`\`${supportedSeries}.x\``)) {
    errors.push("SECURITY.md does not name the current supported release series");
  }
  const changelog = await readFile(join(root, "CHANGELOG.md"), "utf8");
  if (!changelog.includes(`## ${manifest.version} `)) {
    errors.push("CHANGELOG.md does not contain the current release heading");
  }
  const rootLockDependencies = lock.packages?.[""]?.dependencies || {};
  for (const [name, version] of Object.entries(manifest.dependencies || {})) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
      errors.push(`dependency ${name} is not pinned to one exact version`);
    }
    if (rootLockDependencies[name] !== version) {
      errors.push(`package-lock root dependency does not match ${name}@${version}`);
    }
  }
  const rootLockDevDependencies = lock.packages?.[""]?.devDependencies || {};
  for (const [name, version] of Object.entries(manifest.devDependencies || {})) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
      errors.push(`development dependency ${name} is not pinned to one exact version`);
    }
    if (rootLockDevDependencies[name] !== version) {
      errors.push(`package-lock root development dependency does not match ${name}@${version}`);
    }
  }
} catch (error) {
  errors.push(`cannot validate pinned dependencies: ${error.message}`);
}

try {
  const [{ SOURCES, SOURCE_VERIFICATION_NOTE }, { RULES }, { INTERPRETATION_PROFILES }] = await Promise.all([
    import(new URL("../src/data/source-registry.mjs", import.meta.url)),
    import(new URL("../src/data/rule-registry.mjs", import.meta.url)),
    import(new URL("../src/data/interpretation-profile-registry.mjs", import.meta.url)),
  ]);
  if (SOURCES.length !== 15) errors.push(`expected 15 registered sources, found ${SOURCES.length}`);
  if (RULES.length !== 36) errors.push(`expected 36 registered rules, found ${RULES.length}`);
  if (INTERPRETATION_PROFILES.length !== 6) {
    errors.push(`expected 6 registered interpretation profiles, found ${INTERPRETATION_PROFILES.length}`);
  }
  if (INTERPRETATION_PROFILES.some((profile) => profile.professional_label_allowed !== false)) {
    errors.push("interpretation profile permits an unearned professional label");
  }
  if (INTERPRETATION_PROFILES.some((profile) => profile.predictive_validity !== "not_established")) {
    errors.push("interpretation profile overstates predictive validity");
  }
  if (INTERPRETATION_PROFILES.some((profile) => profile.review_status !== "automated_fixture_reviewed")) {
    errors.push("interpretation profile overstates review status");
  }
  const rulePackHashes = INTERPRETATION_PROFILES.map((profile) => profile.rule_pack_hash);
  if (rulePackHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))) {
    errors.push("interpretation profile has an invalid rule-pack hash");
  }
  if (new Set(rulePackHashes).size !== rulePackHashes.length) {
    errors.push("interpretation profiles must have distinct rule-pack hashes");
  }
  if (!SOURCE_VERIFICATION_NOTE.includes("does not validate divinatory predictions")) {
    errors.push("source registry verification note lost its predictive-validity boundary");
  }
  const notices = await readFile(join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
  if (!notices.includes("contains 15 machine-readable source **records**")) {
    errors.push("THIRD_PARTY_NOTICES.md has a stale source-record count");
  }
  if (!notices.includes("The 36 machine-readable rules")) {
    errors.push("THIRD_PARTY_NOTICES.md has a stale rule count");
  }
  for (const source of SOURCES) {
    if (!notices.includes(`\`${source.id}\``)) {
      errors.push(`THIRD_PARTY_NOTICES.md omits registered source: ${source.id}`);
    }
  }
  const systemsWithSources = new Set(SOURCES.flatMap((source) => source.systems));
  const systemsWithRules = new Set(RULES.map((rule) => rule.system));
  for (const system of ["bazi", "ziwei", "western", "tarot", "iching", "meihua"]) {
    if (!systemsWithSources.has(system)) errors.push(`source registry does not cover shipped system ${system}`);
    if (!systemsWithRules.has(system)) errors.push(`rule registry does not cover shipped system ${system}`);
  }
} catch (error) {
  errors.push(`cannot validate professional registries: ${error.message}`);
}

for (const name of [
  "blind-check-input.schema.json", "blind-check-record.schema.json",
  "blind-check-adjudications.schema.json", "blind-check-score.schema.json",
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

try {
  const packageScript = await readFile(join(root, "scripts/package-skill.mjs"), "utf8");
  const packagedCount = Number(packageScript.match(/expectedReleaseFileCount\s*=\s*(\d+)/)?.[1]);
  if (packagedCount !== expectedReleaseFileCount) {
    errors.push(`package and verification scripts disagree on release file count: ${packagedCount || "missing"} vs ${expectedReleaseFileCount}`);
  }
} catch (error) {
  errors.push(`cannot inspect packaging policy: ${error.message}`);
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
