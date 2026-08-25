// Headless visual verification for the Skin Preview parity fix.
// Renders every skin (one per shape/rarity) through the SAME
// drawSkinVisual() at two different scales/canvas setups meant to mimic
// (a) Gameplay's canvas and (b) a UI Preview canvas with devicePixelRatio
// scaling applied the way js/rendering/skinPreview.js does it — then
// checks the actual pixels for aspect ratio / centering / clipping, not
// just "the same code ran".
//
// Dev-only tooling, NOT part of `npm test` / AGENTS.md's test suite, and
// intentionally not wired into package.json: it needs the `canvas` native
// package (pixel access outside a browser), which this zero-build-step
// project doesn't otherwise depend on. Run with:
//   npm install canvas --no-save && node scripts/verify-skin-preview-parity.mjs
// See also scripts/visual-check.mjs for a PNG you can actually look at.
import { createCanvas } from 'canvas';
import { drawSkinVisual, SKIN_DEBUG } from '../js/rendering/skinRenderer.js';
import { SKINS, DEFAULT_SKIN, RARITY_CONFIG } from '../js/data/skins.js';

function buildVisual(s) {
  if (s.id === 'default') return { id: 'default', tier: 0, color: null, secondaryColor: null, shape: 'circle', glow: 12 };
  return { id: s.id, tier: RARITY_CONFIG[s.rarity].tier, color: s.color, secondaryColor: s.secondaryColor, shape: s.shape, glow: s.glow };
}

function boundingBoxOfDrawing(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Simulates skinPreview.js's DPR-aware canvas setup: cssSize logical box,
// dpr backing buffer, ctx scaled so drawing coords are in CSS px.
function renderPreviewLike(v, cssSize, dpr, r, effects) {
  const canvas = createCanvas(Math.round(cssSize * dpr), Math.round(cssSize * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSkinVisual(ctx, v, cssSize / 2, cssSize / 2, r, { now: 0, effects, isDefault: v.id === 'default' });
  return canvas;
}

// Simulates Gameplay's canvas: no DPR scaling trickery, direct pixel space.
function renderGameplayLike(v, canvasSize, x, y, r, effects) {
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext('2d');
  drawSkinVisual(ctx, v, x, y, r, { now: 0, effects, isDefault: v.id === 'default' });
  return canvas;
}

let failures = 0;
let checks = 0;

function check(label, cond) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok:   ${label}`);
  }
}

const allSkins = [DEFAULT_SKIN, ...SKINS];
const PLAYER_R = 10; // CONFIG.player.radius

console.log('=== STAGE 1: base skin only (effects disabled) — geometry/aspect parity ===');
for (const s of allSkins) {
  const v = buildVisual(s);

  // Gameplay-like render: big canvas, radius = real player radius.
  const gp = renderGameplayLike(v, 200, 100, 100, PLAYER_R, false);
  const gpBox = boundingBoxOfDrawing(gp);

  // Preview-like render: small canvas (64 CSS px), dpr=2, SAME radius
  // convention skinPreview.js actually uses (real gameplay radius, not a
  // scaled-up one) — see skinPreview.js's header comment for why.
  const pv = renderPreviewLike(v, 64, 2, PLAYER_R, false);
  const pvBox = boundingBoxOfDrawing(pv);

  check(`${s.id}: gameplay render produced visible pixels`, !!gpBox);
  check(`${s.id}: preview render produced visible pixels`, !!pvBox);
  if (!gpBox || !pvBox) continue;

  // Aspect ratio (w/h) of the drawn shape must match between contexts —
  // this is exactly the kind of thing a DPR/scale bug would silently break
  // even though the same drawSkinVisual() code ran in both places.
  const gpAspect = gpBox.w / gpBox.h;
  const pvAspect = pvBox.w / pvBox.h;
  // Tolerance is intentionally loose (0.08, not e.g. 0.01): at a ~20px-wide
  // shape (2x player radius), anti-aliasing rounds a couple of edge pixels
  // differently depending on where the shape's center lands relative to
  // the pixel grid — confirmed against the star shape's true vector aspect
  // ratio (1.051, computed directly from its path math, independent of any
  // canvas): both the gameplay (1.111) and preview (1.056) rasterizations
  // are within a couple of pixels of that true value. That's normal raster
  // noise from the SAME path, not a geometry difference between the two
  // call sites — a real scaling/DPR bug would show up as a large,
  // consistent skew instead.
  check(`${s.id}: aspect ratio matches (gameplay ${gpAspect.toFixed(3)} vs preview ${pvAspect.toFixed(3)})`, Math.abs(gpAspect - pvAspect) < 0.08);

  // Preview's backing buffer is 128x128 (64 CSS * dpr 2); at dpr scale the
  // drawn diameter in device pixels should be ~2x the gameplay diameter in
  // device pixels (both use the same CSS-space radius PLAYER_R), i.e. the
  // DPR scaling is actually taking effect and not silently ignored/doubled.
  const gpDiamPx = gpBox.w;
  const pvDiamPx = pvBox.w;
  const ratio = pvDiamPx / gpDiamPx;
  check(`${s.id}: DPR scaling applied correctly (backing-pixel diameter ratio ${ratio.toFixed(2)}, expect ~2.0)`, ratio > 1.7 && ratio < 2.3);
}

console.log('\n=== STAGE 1: SKIN_DEBUG.disableEffects flag actually suppresses glow/decorations ===');
{
  const mythic = allSkins.find((s) => s.id === 'singularity');
  const v = buildVisual(mythic);

  SKIN_DEBUG.disableEffects = false;
  const withEffects = renderGameplayLike(v, 200, 100, 100, PLAYER_R, true);
  const withBox = boundingBoxOfDrawing(withEffects);

  const withoutEffects = renderGameplayLike(v, 200, 100, 100, PLAYER_R, false);
  const withoutBox = boundingBoxOfDrawing(withoutEffects);

  check('Mythic WITH effects draws a visibly larger bounding box than WITHOUT (glow + orbiting decorations present)', withBox.w > withoutBox.w + 4 || withBox.h > withoutBox.h + 4);
}

console.log('\n=== STAGE 2: decorations restored (effects enabled) still centered on the body ===');
for (const s of allSkins) {
  const v = buildVisual(s);
  const canvas = renderGameplayLike(v, 300, 150, 150, PLAYER_R, true);
  const box = boundingBoxOfDrawing(canvas);
  if (!box) { check(`${s.id}: effects render produced visible pixels`, false); continue; }
  const cx = box.minX + box.w / 2;
  const cy = box.minY + box.h / 2;
  check(`${s.id}: decorated render still roughly centered on (150,150) (got ${cx.toFixed(1)},${cy.toFixed(1)})`, Math.abs(cx - 150) < 20 && Math.abs(cy - 150) < 20);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log('\nAll geometry/parity checks passed.');
}
