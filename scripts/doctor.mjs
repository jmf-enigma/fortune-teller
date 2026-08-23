#!/usr/bin/env node

const major = Number(process.versions.node.split(".")[0]);
const checks = [];
checks.push({ check: "node>=20", ok: major >= 20, observed: process.versions.node });

let calculate;
try {
  ({ calculate } = await import("../src/index.mjs"));
  checks.push({ check: "dependencies-load", ok: true });
} catch (error) {
  checks.push({
    check: "dependencies-load",
    ok: false,
    cause: error?.code || error?.name || "unknown",
    guidance: "run npm ci --ignore-scripts in the Skill directory",
  });
}

try {
  if (!calculate) throw new Error("calculation engines unavailable");
  const first = calculate("iching", { question: "doctor self-check", seed: "doctor-v1" });
  const second = calculate("iching", { question: "doctor self-check", seed: "doctor-v1" });
  checks.push({
    check: "deterministic-engine",
    ok: first.reproducibility_hash === second.reproducibility_hash && first.facts_hash === second.facts_hash,
    hash: first.reproducibility_hash,
  });
} catch (error) {
  checks.push({ check: "deterministic-engine", ok: false, error: error.message });
}

try {
  if (!calculate) throw new Error("calculation engines unavailable");
  const result = calculate("bazi", { date: "2005-12-23", time: "08:37", timezone: "Asia/Shanghai" });
  checks.push({ check: "calendar-engine", ok: result.facts.pillars.map((item) => item.stem_branch).join(" ") === "乙酉 戊子 辛巳 壬辰" });
} catch (error) {
  checks.push({ check: "calendar-engine", ok: false, error: error.message });
}

const ok = checks.every((item) => item.ok);
process.stdout.write(`${JSON.stringify({ ok, checks }, null, 2)}\n`);
if (!ok) process.exitCode = 1;
