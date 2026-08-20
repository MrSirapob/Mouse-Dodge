// tests/helpers/gameFactory.mjs
//
// Builds a REAL `Game` instance (js/systems/game.js) for headless testing —
// no reimplementation, no game-logic mocks. Game is constructed with
// dependency-injected `renderer` / `input` / `ui` objects (that's how
// js/main.js already wires it up for the browser), so tests supply minimal
// fakes for those three UI-facing collaborators only. Nothing about
// gameplay (waves, patterns, bullets, skills, items, scoring, collision) is
// faked — it's the genuine code from js/**.
//
// Game.js (via js/systems/devMode.js) also touches a few DOM/browser
// globals at import time and at construction time (document.getElementById,
// localStorage, performance.now). Node has none of these, so this module
// installs minimal shims before the first import of game.js. The shims are
// inert (return null / no-op) — they exist only so the real modules don't
// throw "document is not defined" in Node, not to fake any behavior the
// tests care about.

import { CONFIG } from '../../js/core/config.js?v=20260814w10final';

function installBrowserShims() {
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener() {},
        appendChild() {},
      }),
      body: { appendChild() {} },
      addEventListener() {},
    };
  }
  if (typeof globalThis.window === 'undefined') {
    // devMode.js's top-level IIFE bails out as soon as
    // document.querySelector('h1') returns null (see installBrowserShims
    // above), so `window` only needs to exist as an object — it is never
    // read from in that early-return path.
    globalThis.window = globalThis;
  }
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  }
  if (typeof globalThis.performance === 'undefined') {
    globalThis.performance = { now: () => Date.now() };
  }
  if (typeof globalThis.requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
  }
}

installBrowserShims();

/** Renderer stub: identity world/screen mapping, full-arena visible bounds. */
export function makeFakeRenderer() {
  return {
    worldPoint(x, y) {
      return { x, y };
    },
    visibleWorldBounds() {
      return { left: 0, right: CONFIG.world.width, top: 0, bottom: CONFIG.world.height };
    },
    begin() {},
    drawWorld() {},
    end() {},
    flash() {},
  };
}

/** Input stub: no live pointer/keyboard input unless a test sets p1/p2 fields. */
export function makeFakeInput() {
  return {
    p1: { x: CONFIG.world.width / 2, y: CONFIG.world.height / 2, hasInput: false, isTouch: false },
    p2: { x: CONFIG.world.width / 2, y: CONFIG.world.height / 2 },
    mouseSensitivity: 1,
    p2Direction() {
      return { x: 0, y: 0 };
    },
    setMouseSensitivity() {},
    onP1Action: null,
    onP2Action: null,
    onPause: null,
  };
}

/** UI stub: records nothing by default, but exposes `calls` for assertions that need it. */
export function makeFakeUI() {
  const calls = [];
  const record = (name) => (...args) => calls.push({ name, args });
  return {
    calls,
    setBest: record('setBest'),
    setMenuHandler: record('setMenuHandler'),
    setResetBestHandler: record('setResetBestHandler'),
    setMouseSensitivityHandler: record('setMouseSensitivityHandler'),
    hideOverlay: record('hideOverlay'),
    setWave: record('setWave'),
    banner: record('banner'),
    setBossVisible: record('setBossVisible'),
    setBossName: record('setBossName'),
    setBossProgress: record('setBossProgress'),
    update: record('update'),
    showScorePopup: record('showScorePopup'),
    showPause: record('showPause'),
    returnToMenu: record('returnToMenu'),
    showGameOver: record('showGameOver'),
    showNoHitBanner: record('showNoHitBanner'),
    flashSkill: record('flashSkill'),
    resultScreen: null,
  };
}

/** Creates a real Game with fake UI-facing collaborators. Resets the shimmed localStorage first so each test starts with a clean best-score/best-time slate (the shim is a module-level singleton shared across the whole test process). */
export async function createGame(overrides = {}) {
  if (globalThis.localStorage && typeof globalThis.localStorage.clear === 'function') {
    globalThis.localStorage.clear();
  }
  const { Game } = await import('../../js/systems/game.js?v=20260814w10final');
  const renderer = overrides.renderer || makeFakeRenderer();
  const input = overrides.input || makeFakeInput();
  const ui = overrides.ui || makeFakeUI();
  const game = new Game({ renderer, input, ui });
  return { game, renderer, input, ui };
}

/**
 * Resets the game and jumps straight to `wave`, skipping the wave-announce
 * banner delay (state.waveTime starts negative — see Game.startWave) so
 * tests don't need to burn simulated seconds waiting on it.
 */
export function jumpToWave(game, wave, { mode = 'solo', skill = 'pulse', skillP2 = 'pulse' } = {}) {
  game.reset(mode, skill, skillP2);
  game.startWave(wave, true);
  game.state.waveTime = 0;
  return game;
}

/** Advances the game by `steps` fixed-size ticks of `dt` seconds each (default 1/60s, i.e. 60fps). */
export function tick(game, steps = 1, dt = 1 / 60) {
  for (let i = 0; i < steps; i++) game.update(dt);
}
