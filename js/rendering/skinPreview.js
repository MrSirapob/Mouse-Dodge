/**
 * Mounts a real <canvas> Skin Preview (Skin Collection grid, Case Reel,
 * Case Result, Default card) so it draws through the exact same
 * `drawSkinVisual()` Gameplay uses (see ./skinRenderer.js) — no separate
 * CSS-shape preview implementation.
 *
 * Why the radius is CONFIG.player.radius, not "however big the icon box
 * is": drawSkinVisual's rarity decorations (sparkles/stars/diamonds/
 * shards/comets, see skinRenderer.js's drawSkinDecorations) are placed at
 * fixed pixel offsets from the body radius (r+6, r+9, r+16, ...), the same
 * way Gameplay draws them around the real player. Scaling `r` up to fill
 * whatever box a particular preview happens to be in would change how
 * those offsets read relative to the body — a subtly different (bigger or
 * smaller relative to the body) look than Gameplay's, exactly the kind of
 * "looks like it should be identical but isn't" mismatch this fix exists to
 * remove. Using the real gameplay radius instead means Preview draws the
 * literal same numbers as Gameplay, just inside a smaller/larger canvas —
 * "physically smaller because it's UI" (per the fix spec) without ever
 * touching the geometry itself.
 *
 * Every preview icon's outer wrapper (.skin-preview / .skin-reel-item /
 * .skin-result-card .skin-preview) is already sized well beyond the old
 * inner .skin-shape box specifically so glow/decorations have room to
 * breathe — the canvas now simply fills that same outer wrapper instead of
 * the smaller inner box, using the same margin that was always there.
 */

import { CONFIG } from '../core/config.js?v=20260825-mx43';
import { drawSkinVisual } from './skinRenderer.js?v=20260825-mx43';

const PREVIEW_RADIUS = CONFIG.player.radius;

// Canvases whose skin is tier>=3 (has orbiting decorations) get a live
// rAF loop so they animate the same way Gameplay does. Everything else
// (Common/Uncommon/Default, and every Case Reel slot — there can be
// dozens on screen while it spins) is drawn once and left static; a
// static reel slot still shows the correct base skin geometry, which is
// what Stage 1 of this fix is actually about.
const animatedCanvases = new Set();
let rafHandle = null;

function tick(now) {
  for (const canvas of animatedCanvases) {
    if (!canvas.isConnected) { animatedCanvases.delete(canvas); continue; }
    paint(canvas, now);
  }
  rafHandle = animatedCanvases.size ? requestAnimationFrame(tick) : null;
}

function ensureLoop() {
  if (rafHandle == null && animatedCanvases.size) rafHandle = requestAnimationFrame(tick);
}

function paint(canvas, now = performance.now()) {
  const v = canvas._skinVisual;
  if (!v) return;

  // Resize the backing pixel buffer to match CSS size * devicePixelRatio.
  // Skipping this (or getting it wrong) is the single most common way a
  // canvas icon ends up blurry or mis-scaled vs. a canvas that fills the
  // whole game viewport — see the fix spec's "Verify Stage 1" checklist.
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || parseFloat(getComputedStyle(canvas).width) || 64;
  const cssH = canvas.clientHeight || parseFloat(getComputedStyle(canvas).height) || 64;
  const pxW = Math.max(1, Math.round(cssW * dpr));
  const pxH = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  drawSkinVisual(ctx, v, cssW / 2, cssH / 2, PREVIEW_RADIUS, { now });
}

/**
 * Mount a single preview canvas for one skin's visual data.
 * `animate: true` opts this canvas into the shared rAF loop (used for the
 * Skin Collection grid and Case Result — surfaces that stay on screen long
 * enough for a Rare+ skin's decorations to actually be seen orbiting).
 */
export function mountSkinCanvas(canvas, skinVisual, { animate = false } = {}) {
  canvas._skinVisual = skinVisual;
  paint(canvas, performance.now());
  const tier = skinVisual?.tier || 0;
  const wantsAnimation = animate && skinVisual && skinVisual.id !== 'default' && tier >= 3;
  if (wantsAnimation) {
    animatedCanvases.add(canvas);
    ensureLoop();
  } else {
    animatedCanvases.delete(canvas);
  }
}

/**
 * Finds every `canvas.skin-canvas[data-skin-id]` under `root` and mounts
 * it, resolving the skin id through `skinSystem.buildVisual()` — the same
 * visual-data builder SkinSystem already hands Gameplay's Player.
 */
export function mountSkinCanvases(root, skinSystem, { animate = false } = {}) {
  root.querySelectorAll('canvas.skin-canvas[data-skin-id]').forEach((canvas) => {
    const v = skinSystem.buildVisual(canvas.dataset.skinId);
    mountSkinCanvas(canvas, v, { animate });
  });
}
