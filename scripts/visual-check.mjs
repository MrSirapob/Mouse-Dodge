// Manual visual sanity render (not part of npm test) — top row mimics a
// Gameplay-scale draw, bottom row mimics a Preview-scale draw, both via the
// exact same drawSkinVisual() call with the same radius. Output written to
// scripts/parity-check.png for a human to eyeball. Requires `npm install
// canvas --no-save` (devDependency-style, not committed to package.json).
import { createCanvas } from 'canvas';
import fs from 'node:fs';
import { drawSkinVisual } from '../js/rendering/skinRenderer.js';
import { SKINS, RARITY_CONFIG } from '../js/data/skins.js';

function buildVisual(s) {
  return { id: s.id, tier: RARITY_CONFIG[s.rarity].tier, color: s.color, secondaryColor: s.secondaryColor, shape: s.shape, glow: s.glow };
}

const picks = ['void', 'cyber', 'glitch', 'celestial', 'singularity'];
const canvas = createCanvas(900, 300);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, 900, 300);

picks.forEach((id, i) => {
  const s = SKINS.find((x) => x.id === id);
  const v = buildVisual(s);
  drawSkinVisual(ctx, v, 90 + i * 170, 70, 12, { now: 500 });
  drawSkinVisual(ctx, v, 90 + i * 170, 220, 12, { now: 500 });
});

fs.writeFileSync(new URL('./parity-check.png', import.meta.url), canvas.toBuffer('image/png'));
console.log('wrote scripts/parity-check.png');
