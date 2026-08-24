import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import { calculate } from "../src/index.mjs";

function trapNetworkApis() {
  const calls = [];
  const restorers = [];
  const replace = (object, key) => {
    const original = object[key];
    object[key] = (...args) => {
      calls.push(key);
      throw new Error(`NETWORK_API_TRAP:${key}:${typeof args[0]}`);
    };
    restorers.push(() => { object[key] = original; });
  };
  for (const [object, keys] of [
    [http, ["request", "get"]],
    [https, ["request", "get"]],
    [net, ["connect", "createConnection"]],
    [tls, ["connect"]],
    [dns, ["lookup", "resolve", "resolve4", "resolve6"]],
  ]) {
    for (const key of keys) replace(object, key);
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => {
    calls.push("fetch");
    throw new Error(`NETWORK_API_TRAP:fetch:${typeof args[0]}`);
  };
  restorers.push(() => { globalThis.fetch = originalFetch; });
  return { calls, restore: () => restorers.reverse().forEach((restore) => restore()) };
}

test("all shipped engines calculate while standard Node network APIs are trapped", () => {
  const trap = trapNetworkApis();
  try {
    const results = [
      calculate("bazi", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" }),
      calculate("ziwei", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "female" }),
      calculate("western", {
        date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", latitude: 31.23, longitude: 121.47,
      }),
      calculate("tarot", { question: "What should I examine?", seed: "offline-test" }),
      calculate("iching", { question: "What should I examine?", seed: "offline-test" }),
      calculate("meihua", { first_number: 17, second_number: 29 }),
    ];
    assert.deepEqual(results.map((result) => result.system), ["bazi", "ziwei", "western", "tarot", "iching", "meihua"]);
    assert.deepEqual(trap.calls, []);
  } finally {
    trap.restore();
  }
});
