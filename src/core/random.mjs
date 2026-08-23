import { createHash, randomBytes } from "node:crypto";

function digest(seed, counter, domain, profile) {
  return createHash("sha256")
    .update("fortune-teller-rng-v1\0")
    .update(String(domain))
    .update("\0")
    .update(String(profile))
    .update("\0")
    .update(String(seed))
    .update("\0")
    .update(String(counter))
    .digest();
}

export function createRandomSource(seed, { domain = "generic", profile = "default" } = {}) {
  if (seed === "") throw new TypeError("seed must not be an empty string");
  if (seed !== undefined && seed !== null && typeof seed !== "string") throw new TypeError("seed must be a string");
  const generated = seed === undefined || seed === null;
  const seedText = generated ? randomBytes(32).toString("base64url") : String(seed);
  let counter = 0;
  return {
    mode: generated ? "secure-random-generated" : "seeded-replay",
    seedWasGenerated: generated,
    domain,
    profile,
    seedCommitment: createHash("sha256")
      .update("fortune-teller-seed-commitment-v1\0")
      .update(domain)
      .update("\0")
      .update(profile)
      .update("\0")
      .update(seedText)
      .digest("hex"),
    replaySeed: seedText,
    get blocksUsed() {
      return counter;
    },
    bytes(length) {
      const chunks = [];
      let remaining = length;
      while (remaining > 0) {
        const chunk = digest(seedText, counter++, domain, profile);
        const take = Math.min(chunk.length, remaining);
        chunks.push(chunk.subarray(0, take));
        remaining -= take;
      }
      return Buffer.concat(chunks);
    },
  };
}

export function randomInt(source, maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x1_0000_0000) {
    throw new RangeError("maxExclusive must be a positive integer no greater than 2^32");
  }
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  while (true) {
    const value = source.bytes(4).readUInt32BE(0);
    if (value < limit) return value % maxExclusive;
  }
}

export function shuffle(source, values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(source, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
