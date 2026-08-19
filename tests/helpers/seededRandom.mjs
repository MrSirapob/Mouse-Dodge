// tests/helpers/seededRandom.mjs
//
// The game uses plain Math.random() throughout (spawn positions, sideSpawn,
// item drops, bouncer directions, etc). To get deterministic simulations
// (see AGENTS.md / npm test §11: "today and tomorrow must produce the same
// result"), tests temporarily replace the global Math.random with a seeded
// PRNG for the duration of a simulation, then restore the original.
//
// mulberry32 — small, fast, good-enough statistical quality for test fixtures.

let originalRandom = null;
let depth = 0;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Replaces Math.random with a seeded, deterministic generator. Nestable. */
export function installSeededRandom(seed = 1) {
  if (depth === 0) originalRandom = Math.random;
  depth++;
  Math.random = mulberry32(seed);
}

/** Restores the original Math.random. Must be paired 1:1 with installSeededRandom. */
export function restoreRandom() {
  depth = Math.max(0, depth - 1);
  if (depth === 0 && originalRandom) {
    Math.random = originalRandom;
    originalRandom = null;
  }
}

/**
 * Runs fn() with a seeded Math.random, always restoring afterward (even on
 * throw). SYNC ONLY — if fn is (or calls) an async function, its `await`
 * points run after this returns, by which time Math.random has already been
 * restored to the original. Use withSeededRandomAsync for anything async.
 */
export function withSeededRandom(seed, fn) {
  installSeededRandom(seed);
  try {
    return fn();
  } finally {
    restoreRandom();
  }
}

/** Async version of withSeededRandom. */
export async function withSeededRandomAsync(seed, fn) {
  installSeededRandom(seed);
  try {
    return await fn();
  } finally {
    restoreRandom();
  }
}
