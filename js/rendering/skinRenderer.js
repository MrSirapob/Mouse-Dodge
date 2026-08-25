/**
 * Single source of truth for how a skin actually looks: body shape,
 * primary/secondary color, stroke, and the rarity-tier orbiting
 * decorations (sparkles/stars/diamonds/shards/comets). Gameplay
 * (Renderer.drawPlayer, in ./renderer.js) and every UI Preview (Skin
 * Collection grid, Case Reel, Case Result, Default card — all mounted via
 * ../rendering/skinPreview.js) call the SAME `drawSkinVisual()` here.
 *
 * Do NOT re-implement any of this in CSS or in a second "preview-only"
 * drawing path. If Preview and Gameplay ever look different again, the bug
 * is either (a) something calling a different function than this one, or
 * (b) a scaling/DPR/canvas-size difference in whatever set up the ctx
 * before calling in — it is never a second copy of this logic, because
 * there isn't one.
 *
 * STAGE-1/STAGE-2 debug flag: see SKIN_DEBUG below.
 */

export const SKIN_DEBUG = {
  // Temporary debug switch (kept intentionally, not a one-off hack):
  // when true, every skin renders as its BASE body only — shape, primary/
  // secondary color, stroke, internal detail — with glow, trail, particles,
  // and every rarity decoration forced off. Flip to true to re-verify that
  // Gameplay and every Preview render byte-for-byte identical geometry
  // before trusting any change made to the effects layer below. Default is
  // false (effects on) — this is the normal, shipped state.
  disableEffects: false,
};

/**
 * Draws only the skin's own body: shape + primary/secondary fill + stroke +
 * the tier>=2 inner secondary-color detail. This part is NEVER gated by
 * `effects` — it's the skin itself, not an external effect — only the glow
 * (shadowBlur) is.
 *
 * ctx is expected to already be in the coordinate space the caller wants
 * (x, y) drawn in; this function does its own save/translate/restore so it
 * never leaks state onto the caller's ctx.
 */
export function drawSkinBody(ctx, v, x, y, r, { now = performance.now(), effects = !SKIN_DEBUG.disableEffects, isDefault } = {}) {
  const resolvedIsDefault = isDefault ?? (!v || v.id === 'default');
  const primary = v?.color || '#4ecdc4';
  const secondary = v?.secondaryColor || '#ffffff';
  const tier = v?.tier || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = primary;
  if (effects) {
    ctx.shadowColor = primary;
    ctx.shadowBlur = resolvedIsDefault ? 12 : Math.min(30, 8 + (v?.glow || 0));
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;

  ctx.beginPath();
  switch (v?.shape || 'circle') {
    case 'diamond':
      ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); break;
    case 'square': {
      // Half-width r/sqrt(2) puts the square's corners exactly on the r
      // boundary (same as every other shape's outer extent) instead of
      // poking past it.
      const hw = r * Math.SQRT1_2;
      ctx.rect(-hw, -hw, hw * 2, hw * 2);
      break;
    }
    case 'hex':
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = Math.cos(a) * r; const py = Math.sin(a) * r; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); break;
    case 'star':
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? r * 0.46 : r; const px = Math.cos(a) * rr; const py = Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); break;
    case 'void':
      ctx.arc(0, 0, r, 0, Math.PI * 2); break;
    default:
      ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!resolvedIsDefault && tier >= 2) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42 + Math.sin(now / 100) * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = secondary;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.stroke();
  ctx.restore();

  return { primary, secondary, tier, isDefault: resolvedIsDefault };
}

/** Small 4-point sparkle (✦-style), used for Rare+ skin decorations. */
export function drawSparkle(ctx, x, y, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size); ctx.lineTo(x + size * 0.28, y - size * 0.28);
  ctx.lineTo(x + size, y); ctx.lineTo(x + size * 0.28, y + size * 0.28);
  ctx.lineTo(x, y + size); ctx.lineTo(x - size * 0.28, y + size * 0.28);
  ctx.lineTo(x - size, y); ctx.lineTo(x - size * 0.28, y - size * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Small 5-point star, used for Epic+ skin decorations. */
export function drawStarPoint(ctx, x, y, size, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? size * 0.42 : size;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Small diamond / crystal shard point, used for Legendary+ decorations. */
export function drawDiamondPoint(ctx, x, y, size, color, alpha = 1, rotation = 0) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size); ctx.lineTo(size * 0.6, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Small angular lightning/crystal shard, used for Legendary+ decorations. */
export function drawShardPoint(ctx, x, y, size, color, alpha = 1, angle = 0) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size); ctx.lineTo(size * 0.35, size * 0.6); ctx.lineTo(-size * 0.35, size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Tiny drifting comet streak, used for Legendary skin decorations. */
export function drawComet(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI);
  const grad = ctx.createLinearGradient(0, 0, 10, 0);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}

/**
 * Rarity-scaled *external* skin decorations: a handful of small sparkle /
 * star / diamond / shard / comet accents orbiting just outside the main
 * body, centered on (x, y) with the body's own radius `r`. Intentionally
 * never a filled circle or continuous ring around the character — that
 * would read as an enlarged silhouette rather than a decoration.
 */
export function drawSkinDecorations(ctx, v, x, y, r, now = performance.now()) {
  const tier = v?.tier || 0;
  if (!v || v.id === 'default' || tier < 3) return;
  const primary = v.color || '#4ecdc4';
  const secondary = v.secondaryColor || '#ffffff';

  if (tier === 3) {
    const count = 2;
    for (let i = 0; i < count; i++) {
      const a = now / 1400 + (i * Math.PI * 2) / count;
      const rr = r + 6;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      const twinkle = 0.35 + 0.35 * Math.sin(now / 260 + i * 2);
      drawSparkle(ctx, px, py, 2.2, primary, twinkle);
    }
    return;
  }

  if (tier === 4) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const a = now / 1000 + (i * Math.PI * 2) / count;
      const rr = r + 7 + Math.sin(now / 200 + i) * 1.5;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      const twinkle = 0.5 + 0.4 * Math.sin(now / 180 + i * 2);
      if (i % 2 === 0) drawStarPoint(ctx, px, py, 3, secondary, twinkle);
      else drawSparkle(ctx, px, py, 2.6, primary, twinkle);
    }
    return;
  }

  if (tier === 5) {
    const count = 4;
    for (let i = 0; i < count; i++) {
      const a = now / 850 + (i * Math.PI * 2) / count;
      const rr = r + 9 + Math.sin(now / 260 + i) * 2;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      const twinkle = 0.55 + 0.4 * Math.sin(now / 150 + i * 2);
      if (i % 2 === 0) drawDiamondPoint(ctx, px, py, 3.4, secondary, twinkle, a);
      else drawShardPoint(ctx, px, py, 4, primary, twinkle, a);
    }
    const ca = now / 650;
    const cr = r + 14;
    drawComet(ctx, x + Math.cos(ca) * cr, y + Math.sin(ca) * cr, ca, primary);
    return;
  }

  // tier >= 6 (Mythic): the full ensemble across two orbits spinning in
  // opposite directions.
  const inner = 4, outer = 3;
  for (let i = 0; i < inner; i++) {
    const a = now / 800 + (i * Math.PI * 2) / inner;
    const rr = r + 8 + Math.sin(now / 220 + i) * 2;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    const twinkle = 0.55 + 0.4 * Math.sin(now / 140 + i * 2);
    const kind = i % 3;
    if (kind === 0) drawStarPoint(ctx, px, py, 3.4, secondary, twinkle);
    else if (kind === 1) drawDiamondPoint(ctx, px, py, 3, primary, twinkle, a);
    else drawSparkle(ctx, px, py, 2.6, secondary, twinkle);
  }
  for (let i = 0; i < outer; i++) {
    const a = -now / 620 + (i * Math.PI * 2) / outer;
    const rr = r + 16 + Math.sin(now / 300 + i) * 3;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    drawShardPoint(ctx, px, py, 4.2, primary, 0.75, a);
  }
}

/**
 * Top-level entry point: body + (if enabled) rarity decorations. This is
 * the ONE function Gameplay and every Preview should call to draw a skin.
 *
 * @param ctx CanvasRenderingContext2D, already sized/DPR-scaled by the
 *   caller so that (x, y, r) are meaningful coordinates in that ctx.
 * @param v the skin's visual data (SkinSystem.buildVisual() result).
 * @param x, y center to draw at, in ctx's current coordinate space.
 * @param r body radius — Gameplay passes p.r; Previews should also pass a
 *   real radius (see ../rendering/skinPreview.js) rather than inventing a
 *   separate scale so geometry/proportions stay identical everywhere.
 */
export function drawSkinVisual(ctx, v, x, y, r, opts = {}) {
  const effects = opts.effects ?? !SKIN_DEBUG.disableEffects;
  const now = opts.now ?? performance.now();
  const meta = drawSkinBody(ctx, v, x, y, r, { now, effects, isDefault: opts.isDefault });
  if (effects && !meta.isDefault && meta.tier >= 3) {
    drawSkinDecorations(ctx, v, x, y, r, now);
  }
  return meta;
}
