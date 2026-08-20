import { ITEM_COLORS } from '../systems/itemSystem.js?v=20260820-xx1g';
import { CONFIG, actForWave } from '../core/config.js?v=20260820-xx1g';

/**
 * One draw function per item type, keyed by `item.type` (mirrors the
 * SKILL_EFFECT_DRAWERS pattern above). Each receives the canvas context
 * (already translated to the item's bob position, with fill/stroke color
 * pre-set to that item's color) and `s`, a half-size to draw within.
 * To add a new item icon: add an entry here whose key matches the `type`
 * used in ItemSystem.collect().
 */
const ITEM_ICON_DRAWERS = {
  heart(c, s) {
    const w = s * 1.7;
    const h = s * 1.6;
    const topCurveHeight = h * 0.3;
    const y = -h / 2;
    c.beginPath();
    c.moveTo(0, y + topCurveHeight);
    c.bezierCurveTo(0, y, -w / 2, y, -w / 2, y + topCurveHeight);
    c.bezierCurveTo(-w / 2, y + (h + topCurveHeight) / 2, 0, y + (h + topCurveHeight) / 2, 0, y + h);
    c.bezierCurveTo(0, y + (h + topCurveHeight) / 2, w / 2, y + (h + topCurveHeight) / 2, w / 2, y + topCurveHeight);
    c.bezierCurveTo(w / 2, y, 0, y, 0, y + topCurveHeight);
    c.closePath();
    c.fill();
  },
  energy(c, s) {
    // Lightning bolt.
    c.beginPath();
    c.moveTo(-s * 0.35, -s);
    c.lineTo(s * 0.5, -s * 0.15);
    c.lineTo(0, -s * 0.15);
    c.lineTo(s * 0.35, s);
    c.lineTo(-s * 0.5, s * 0.15);
    c.lineTo(0, s * 0.15);
    c.closePath();
    c.fill();
  },
  shield(c, s) {
    // Shield outline: flat-ish top, curved point at the bottom.
    c.beginPath();
    c.moveTo(0, -s);
    c.lineTo(s, -s * 0.4);
    c.lineTo(s * 0.7, s * 0.5);
    c.quadraticCurveTo(s * 0.35, s * 1.05, 0, s * 1.2);
    c.quadraticCurveTo(-s * 0.35, s * 1.05, -s * 0.7, s * 0.5);
    c.lineTo(-s, -s * 0.4);
    c.closePath();
    c.stroke();
  },
  score(c, s) {
    // Gem/diamond with a couple of facet lines for sparkle.
    c.beginPath();
    c.moveTo(0, -s);
    c.lineTo(s, -s * 0.15);
    c.lineTo(0, s);
    c.lineTo(-s, -s * 0.15);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(-s, -s * 0.15);
    c.lineTo(s, -s * 0.15);
    c.moveTo(0, -s);
    c.lineTo(0, s);
    c.globalAlpha *= 0.5;
    c.stroke();
  }
};

const WORLD = { width: 1280, height: 720 };

/**
 * One draw function per skill-effect type, keyed by `fx.type` (see
 * Game.addSkillEffect / SkillSystem). Each receives:
 *   c     - the canvas context, already translated to the effect's (x, y)
 *           with globalCompositeOperation = 'lighter'
 *   fx     - the effect object ({ color, t, duration, maxRadius, ... })
 *   p     - progress from 0 to 1 (fx.t / fx.duration)
 *   ease  - eased progress (1 - (1-p)^3), useful for radius growth
 *   fade  - 1 - p, useful for alpha fade-out
 *
 * To add a visual for a new skill: add a new `type: (c, fx, p, ease, fade) => {...}`
 * entry here and make sure SkillSystem calls `addSkillEffect('type', ...)`.
 */
const SKILL_EFFECT_DRAWERS = {
  pulse(c, fx, p, ease, fade) {
    const r = fx.maxRadius * ease;
    c.globalAlpha = fade;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.strokeStyle = fx.color;
    c.lineWidth = 8 * (1 - p) + 2;
    c.shadowColor = fx.color;
    c.shadowBlur = 24;
    c.stroke();
    c.beginPath();
    c.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    c.strokeStyle = '#fff';
    c.lineWidth = 2;
    c.stroke();
  },
  shield(c, fx, p, ease, fade) {
    const r = 20 + 12 * Math.sin(fx.t * 12);
    c.globalAlpha = 0.35 + 0.5 * fade;
    c.beginPath();
    c.arc(0, 0, r + 8, 0, Math.PI * 2);
    c.strokeStyle = '#7bed9f';
    c.lineWidth = 3;
    c.shadowColor = '#7bed9f';
    c.shadowBlur = 18;
    c.stroke();
  },
  slow(c, fx, p, ease, fade) {
    const r = 20 + fx.maxRadius * ease;
    c.globalAlpha = 0.18 * fade;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = '#54a0ff';
    c.fill();
    c.globalAlpha = 0.7 * fade;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.strokeStyle = '#54a0ff';
    c.lineWidth = 2;
    c.setLineDash([8, 10]);
    c.stroke();
    c.setLineDash([]);
  },
  nova(c, fx, p, ease, fade) {
    const r = fx.maxRadius * ease;
    c.globalAlpha = 0.85 * fade;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.strokeStyle = fx.color;
    c.lineWidth = 9 * (1 - p) + 2;
    c.shadowColor = fx.color;
    c.shadowBlur = 30;
    c.stroke();
    c.globalAlpha = 0.25 * fade;
    c.beginPath();
    c.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    c.fillStyle = fx.color;
    c.fill();
    for (let i = 0; i < 14; i++) {
      const a = (i * Math.PI * 2) / 14 + fx.t * 3;
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45);
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      c.stroke();
    }
  },
  timestop(c, fx, p, ease, fade) {
    // Mystical time-stop magic circle: layered rings, rotating segments,
    // radial glyphs and a bright core. The design is original, but aims for
    // the dramatic sorcerer-style magic-circle feeling.
    const r = 28 + fx.maxRadius * ease;
    const spin = fx.t * 0.9;
    const pulse = 1 + Math.sin(fx.t * 10) * 0.025;
    const outer = r * pulse;

    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // Soft magical aura.
    const glow = c.createRadialGradient(0, 0, 0, 0, 0, outer);
    glow.addColorStop(0, 'rgba(255,255,255,0.34)');
    glow.addColorStop(0.28, 'rgba(198,108,240,0.18)');
    glow.addColorStop(0.72, 'rgba(111,76,255,0.08)');
    glow.addColorStop(1, 'rgba(111,76,255,0)');
    c.globalAlpha = fade;
    c.fillStyle = glow;
    c.beginPath();
    c.arc(0, 0, outer, 0, Math.PI * 2);
    c.fill();

    // Main concentric rings.
    const rings = [0.38, 0.56, 0.72, 0.9, 1];
    rings.forEach((ratio, index) => {
      c.beginPath();
      c.arc(0, 0, outer * ratio, 0, Math.PI * 2);
      c.globalAlpha = fade * (index === rings.length - 1 ? 0.95 : 0.58);
      c.strokeStyle = index % 2 ? '#b98cff' : '#e5c7ff';
      c.lineWidth = index === rings.length - 1 ? 2.5 : 1.4;
      c.shadowColor = '#9b6cff';
      c.shadowBlur = index === rings.length - 1 ? 16 : 8;
      c.stroke();
    });

    // Rotating segmented outer ring.
    c.save();
    c.rotate(spin);
    c.globalAlpha = fade * 0.9;
    c.strokeStyle = '#d8b4ff';
    c.shadowColor = '#9b6cff';
    c.shadowBlur = 14;
    for (let i = 0; i < 24; i++) {
      const a0 = (i * Math.PI * 2) / 24 + 0.035;
      const a1 = a0 + Math.PI / 30;
      c.beginPath();
      c.arc(0, 0, outer * 0.96, a0, a1);
      c.lineWidth = i % 3 === 0 ? 3 : 1.2;
      c.stroke();
    }
    c.restore();

    // Radial glyph spokes / runic geometry.
    c.save();
    c.rotate(-spin * 0.65);
    const glyphCount = 12;
    for (let i = 0; i < glyphCount; i++) {
      const a = (i * Math.PI * 2) / glyphCount;
      const inner = outer * 0.58;
      const mid = outer * 0.69;
      const tip = outer * 0.84;
      const side = 0.045;
      const cx = Math.cos(a) * mid;
      const cy = Math.sin(a) * mid;

      c.globalAlpha = fade * 0.82;
      c.strokeStyle = '#f0dcff';
      c.lineWidth = 1.5;
      c.shadowColor = '#b26cff';
      c.shadowBlur = 9;

      // Diamond / eye-shaped glyph.
      c.beginPath();
      c.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      c.lineTo(Math.cos(a + side) * mid, Math.sin(a + side) * mid);
      c.lineTo(Math.cos(a) * tip, Math.sin(a) * tip);
      c.lineTo(Math.cos(a - side) * mid, Math.sin(a - side) * mid);
      c.closePath();
      c.stroke();

      // Small rune marks between the diamonds.
      c.beginPath();
      c.moveTo(cx - Math.sin(a) * 7, cy + Math.cos(a) * 7);
      c.lineTo(cx + Math.sin(a) * 7, cy - Math.cos(a) * 7);
      c.stroke();
    }
    c.restore();

    // Four cardinal markers make the circle read clearly at a glance.
    c.globalAlpha = fade * 0.95;
    c.strokeStyle = '#ffffff';
    c.shadowColor = '#c38aff';
    c.shadowBlur = 18;
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const x1 = Math.cos(a) * outer * 0.72;
      const y1 = Math.sin(a) * outer * 0.72;
      const x2 = Math.cos(a) * outer * 0.86;
      const y2 = Math.sin(a) * outer * 0.86;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
    }

    // Central time sigil.
    const coreR = outer * 0.25;
    c.globalAlpha = fade * 0.28;
    c.fillStyle = '#c56cf0';
    c.beginPath();
    c.arc(0, 0, coreR, 0, Math.PI * 2);
    c.fill();

    c.globalAlpha = fade * 0.95;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.shadowColor = '#c56cf0';
    c.shadowBlur = 22;
    c.beginPath();
    c.arc(0, 0, coreR, 0, Math.PI * 2);
    c.stroke();

    // Clock-like inner marks reinforce the time-stop theme.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + spin;
      c.beginPath();
      c.moveTo(Math.cos(a) * coreR * 0.55, Math.sin(a) * coreR * 0.55);
      c.lineTo(Math.cos(a) * coreR * 0.82, Math.sin(a) * coreR * 0.82);
      c.stroke();
    }

    // Bright center flash during activation.
    const flash = Math.max(0, 1 - p * 5);
    if (flash > 0) {
      c.globalAlpha = flash * 0.85;
      c.fillStyle = '#ffffff';
      c.shadowColor = '#d7a8ff';
      c.shadowBlur = 28;
      c.beginPath();
      c.arc(0, 0, 5 + flash * 10, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  },
  heal(c, fx, p, ease, fade) {
    c.globalAlpha = fade;
    c.strokeStyle = '#7bed9f';
    c.fillStyle = '#7bed9f';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, 10 + fx.maxRadius * ease, 0, Math.PI * 2);
    c.stroke();
    c.font = 'bold 28px system-ui';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('+♥', 0, -20 - ease * 18);
  },
  repulse(c, fx, p, ease, fade) {
    const r = 20 + fx.maxRadius * ease;
    c.globalAlpha = fade;
    c.strokeStyle = '#ffd166';
    c.shadowColor = '#ffd166';
    c.shadowBlur = 24;

    // Expanding shockwave.
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.lineWidth = 8 * (1 - p) + 2;
    c.stroke();

    // Directional arrows make it visually obvious that the effect pushes OUT.
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      const inner = r * 0.72;
      const outer = r + 14;
      const x1 = Math.cos(a) * inner, y1 = Math.sin(a) * inner;
      const x2 = Math.cos(a) * outer, y2 = Math.sin(a) * outer;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
      const side = 5;
      c.beginPath();
      c.moveTo(x2, y2);
      c.lineTo(x2 - Math.cos(a - 0.45) * side, y2 - Math.sin(a - 0.45) * side);
      c.moveTo(x2, y2);
      c.lineTo(x2 - Math.cos(a + 0.45) * side, y2 - Math.sin(a + 0.45) * side);
      c.stroke();
    }
    c.shadowBlur = 0;
  },
  phase(c, fx, p, ease, fade) {
    const r = 18 + fx.maxRadius * ease;
    c.globalAlpha = 0.3 + 0.45 * Math.abs(Math.sin(fx.t * 10));
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.strokeStyle = '#c56cf0';
    c.lineWidth = 4;
    c.shadowColor = '#c56cf0';
    c.shadowBlur = 24;
    c.stroke();
    c.beginPath();
    c.arc(0, 0, r + 8, 0, Math.PI * 2);
    c.setLineDash([3, 7]);
    c.stroke();
    c.setLineDash([]);
  }
};

/**
 * Renderer draws the game world to a <canvas> every frame. It scales/letterboxes
 * the fixed 1280x720 world to fill whatever the actual canvas size is
 * (see `resize()` / `worldPoint()`), and exposes one `drawX(thing)` method
 * per entity/effect type, all called from `drawWorld(game)`.
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewport = { width: 1, height: 1, scale: 1, offsetX: 0, offsetY: 0 };
    this.resize();
  }

  /** Recomputes canvas pixel size and the world->screen scale/offset ("cover" scaling, no letterbox bars). */
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.max(1, Math.round(w));
    this.canvas.height = Math.max(1, Math.round(h));

    const scale = Math.max(w / WORLD.width, h / WORLD.height);
    const offsetX = (w - WORLD.width * scale) / 2;
    const offsetY = (h - WORLD.height * scale) / 2;

    this.viewport = {
      width: w,
      height: h,
      scale,
      offsetX,
      offsetY
    };

    // With cover-scaling, portrait phones show only a slice of the 1280px
    // world horizontally. Keep gameplay boundaries aligned with what the
    // player can actually see instead of allowing the player to run into
    // the cropped-off part of the world.
    const left = Math.max(0, -offsetX / scale);
    const right = Math.min(WORLD.width, (w - offsetX) / scale);
    const top = Math.max(0, -offsetY / scale);
    const bottom = Math.min(WORLD.height, (h - offsetY) / scale);

    this.viewport.visibleWorld = {
      left,
      right,
      top,
      bottom
    };

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Returns the world-space rectangle currently visible on screen. */
  visibleWorldBounds() {
    return this.viewport.visibleWorld || {
      left: 0,
      right: WORLD.width,
      top: 0,
      bottom: WORLD.height
    };
  }

  /** Converts a screen-space point (e.g. mouse/touch position) into world-space coordinates. */
  worldPoint(screenX, screenY) {
    const v = this.viewport;
    const p = {
      x: (screenX - v.offsetX) / v.scale,
      y: (screenY - v.offsetY) / v.scale
    };
    const b = this.visibleWorldBounds();

    return {
      x: Math.max(b.left, Math.min(b.right, p.x)),
      y: Math.max(b.top, Math.min(b.bottom, p.y))
    };
  }

  /**
   * Starts a frame: clears the canvas and applies the viewport transform
   * (plus camera shake). `wave` picks the background color for the
   * current narrative act (CONFIG.actThemes via actForWave) — stored on
   * `this.bg` so drawGrid() (called later this same frame from
   * drawWorld()) repaints the world-space background with the same color
   * instead of the old hardcoded one.
   */
  begin(shake = 0, wave = 0) {
    const c = this.ctx, v = this.viewport;
    this.bg = CONFIG.actThemes[actForWave(wave)].bg;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    c.fillStyle = this.bg;
    c.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    c.save();

    const pulse = Math.sin(performance.now() * 0.09) * 0.72;
    const shakeX = pulse * shake;
    const shakeY = Math.cos(performance.now() * 0.11) * 0.48 * shake;
    c.translate(v.offsetX + shakeX, v.offsetY + shakeY);
    c.scale(v.scale, v.scale);
  }

  end() {
    this.ctx.restore();
  }

  drawGrid() {
    const c = this.ctx;
    c.fillStyle = this.bg || CONFIG.actThemes[0].bg;
    c.fillRect(0, 0, WORLD.width, WORLD.height);
    c.strokeStyle = 'rgba(255,255,255,.03)';
    c.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += 40) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, WORLD.height);
      c.stroke();
    }
    for (let y = 0; y <= WORLD.height; y += 40) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(WORLD.width, y);
      c.stroke();
    }
  }

  /** Draws every layer of the world in back-to-front order. */
  drawWorld(game) {
    this.drawGrid();
    for (const w of game.ringWarnings) this.drawWarning(w);
    for (const l of game.lasers) this.drawLaser(l);
    if (game.boss.active) this.drawBoss(game.boss);
    for (const item of game.itemSystem.items) this.drawItem(item);
    for (const b of game.bullets.items) this.drawBullet(b);
    for (const p of game.particles.items) this.drawParticle(p);
    for (const p of game.activePlayers()) this.drawPlayer(p);

    if (game.state.mode === 'coop') {
      for (const p of game.players) if (p.down) this.drawDownPlayer(p);
      for (const p of game.players) if (p.reviveProgress > 0) this.drawRevive(p);
    }

    for (const fx of game.skillEffects) this.drawSkillEffect(fx);
    for (const p of game.scorePopups) this.drawScorePopup(p);
  }

  /** Draws a drop-item pickup: a glowing dark disc with a type icon inside, bobbing gently, and blinking just before it despawns. */
  drawItem(item) {
    const color = ITEM_COLORS[item.type] || '#fff';
    const remaining = item.ttl - item.age;
    if (remaining < 2.5 && Math.floor(item.age * 8) % 2 === 0) return;

    const c = this.ctx;
    const bobY = Math.sin(item.bob * 2.4) * 3;
    const pulse = 0.75 + Math.sin(item.bob * 3) * 0.25;

    c.save();
    c.translate(item.x, item.y + bobY);

    c.globalAlpha = 0.32 * pulse;
    c.shadowColor = color;
    c.shadowBlur = 20;
    c.beginPath();
    c.arc(0, 0, item.r + 10, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();

    c.globalAlpha = 1;
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(0, 0, item.r, 0, Math.PI * 2);
    c.fillStyle = 'rgba(10,10,18,.88)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = color;
    c.stroke();

    c.shadowBlur = 0;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    const s = item.r * 0.55;
    const drawIcon = ITEM_ICON_DRAWERS[item.type] || ITEM_ICON_DRAWERS.score;
    drawIcon(c, s);

    c.restore();
  }

  /** Draws a floating text popup (graze score / item pickup feedback), rising and fading out. */
  drawScorePopup(p) {
    const c = this.ctx;
    if (p.life <= 0) return;
    const riseY = (1 - p.life) * -34;

    c.save();
    c.globalAlpha = Math.max(0, p.life);
    c.font = 'bold 16px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = p.color;
    c.shadowColor = p.color;
    c.shadowBlur = 8;
    c.fillText(p.text, p.x, p.y + riseY);
    c.restore();
  }

  drawWarning(w) {
    const c = this.ctx;
    const p = w.t / w.duration;
    const alpha = (1 - p * 0.3) * (0.6 + 0.4 * Math.sin(performance.now() / 80));
    const r = w.radius * (0.4 + p * 0.6);

    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = w.color;
    c.shadowColor = w.color;
    c.shadowBlur = 18;
    c.lineWidth = 3;

    c.beginPath();
    if (w.shape === 'square') {
      const halfW = w.width * (0.55 + p * 0.45);
      const halfH = w.height * (0.55 + p * 0.45);
      c.rect(w.x - halfW, w.y - halfH, halfW * 2, halfH * 2);
    } else if (typeof w.gapAngle === 'number') {
      const gap = w.gapWidth || 0.3;
      c.arc(w.x, w.y, r, w.gapAngle + gap, w.gapAngle + Math.PI * 2 - gap);
    } else {
      c.arc(w.x, w.y, r, 0, Math.PI * 2);
    }
    c.stroke();
    c.shadowBlur = 0;

    c.font = 'bold 18px system-ui';
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('!', w.x, w.y);
    c.restore();
  }

  drawLaser(l) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = l.state === 'telegraph' ? 'rgba(255,92,204,.4)' : l.color;
    c.lineWidth = l.state === 'telegraph' ? 2 : l.thickness;
    if (l.state === 'fire') {
      c.shadowColor = l.color;
      c.shadowBlur = 20;
    } else {
      c.setLineDash([10, 8]);
    }

    c.beginPath();
    if (l.orientation === 'h') {
      c.moveTo(0, l.pos);
      c.lineTo(WORLD.width, l.pos);
    } else {
      c.moveTo(l.pos, 0);
      c.lineTo(l.pos, WORLD.height);
    }
    c.stroke();
    c.restore();
  }

  drawBoss(b) {
    const c = this.ctx;
    const now = performance.now();
    const t = now / 1000;

    // W5 — "ผู้ตื่นจากผนึก"
    // W10 — "ผู้กลืนกินดวงดาร"
    // Both keep the gameplay core anchored to b.r. The extra geometry is
    // visual-only and never changes the boss hitbox or bullet origin.

    if (b.wave === 5) {
      const coreR = b.r;
      const outerR = b.r + 14;
      const runeDistance = b.r + 18;

      // Forbidden seal.
      c.save();
      c.translate(b.x, b.y);
      c.rotate(t * 0.35);
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i;
        const x = Math.cos(a) * outerR;
        const y = Math.sin(a) * outerR;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.strokeStyle = `hsla(${b.hue},80%,65%,0.55)`;
      c.lineWidth = 2;
      c.shadowColor = `hsl(${b.hue},80%,60%)`;
      c.shadowBlur = 12;
      c.stroke();
      c.restore();

      // Four rune fragments.
      c.save();
      c.translate(b.x, b.y);
      c.rotate(-t * 0.8);
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 / 4) * i;
        const x = Math.cos(a) * runeDistance;
        const y = Math.sin(a) * runeDistance;
        c.save();
        c.translate(x, y);
        c.rotate(t * 1.2 + i);
        c.beginPath();
        c.moveTo(0, -6);
        c.lineTo(5, 0);
        c.lineTo(0, 6);
        c.lineTo(-5, 0);
        c.closePath();
        c.fillStyle = `hsla(${(b.hue + 35) % 360},85%,65%,0.85)`;
        c.shadowColor = c.fillStyle;
        c.shadowBlur = 10;
        c.fill();
        c.beginPath();
        c.moveTo(-2, 0);
        c.lineTo(2, 0);
        c.moveTo(0, -2);
        c.lineTo(0, 2);
        c.strokeStyle = `hsla(${b.hue},100%,85%,0.9)`;
        c.lineWidth = 1.5;
        c.stroke();
        c.restore();
      }
      c.restore();

      // Rotating ring.
      c.save();
      c.translate(b.x, b.y);
      c.rotate(t * 0.55);
      c.beginPath();
      c.arc(0, 0, outerR, 0, Math.PI * 2);
      c.strokeStyle = `hsla(${(b.hue + 20) % 360},90%,70%,0.8)`;
      c.lineWidth = 3;
      c.setLineDash([12, 8]);
      c.shadowColor = `hsl(${b.hue},90%,60%)`;
      c.shadowBlur = 14;
      c.stroke();
      c.restore();

      // Core remains exactly b.r so collision and visual center agree.
      c.save();
      c.beginPath();
      c.arc(b.x, b.y, coreR + 5, 0, Math.PI * 2);
      c.fillStyle = `hsla(${b.hue},90%,60%,0.18)`;
      c.shadowColor = `hsl(${b.hue},90%,60%)`;
      c.shadowBlur = 35;
      c.fill();

      c.beginPath();
      c.arc(b.x, b.y, coreR, 0, Math.PI * 2);
      c.fillStyle = `hsl(${b.hue % 360},70%,48%)`;
      c.shadowColor = `hsl(${b.hue % 360},90%,60%)`;
      c.shadowBlur = 24;
      c.fill();

      c.beginPath();
      c.arc(b.x, b.y, b.r * 0.58, 0, Math.PI * 2);
      c.strokeStyle = `hsla(${(b.hue + 45) % 360},100%,85%,0.8)`;
      c.lineWidth = 2;
      c.stroke();

      c.beginPath();
      c.arc(b.x, b.y, b.r * 0.22, 0, Math.PI * 2);
      c.fillStyle = '#ffffff';
      c.shadowColor = '#ffffff';
      c.shadowBlur = 12;
      c.fill();
      c.restore();
      return;
    }

    if (b.wave === 10) {
      // W10 — "ผู้กลืนกินดวงดาร"
      // A dark core with two counter-rotating orbital rings. The rings are
      // intentionally compact so the gameplay core remains visually clear.
      const coreR = b.r;
      const ringA = b.r + 10;
      const ringB = b.r + 17;
      const pulse = 1 + Math.sin(t * 2.4) * 0.035;

      // Faint gravitational aura.
      c.save();
      c.beginPath();
      c.arc(b.x, b.y, coreR + 9 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
      c.fillStyle = `hsla(${b.hue},75%,45%,0.10)`;
      c.shadowColor = `hsl(${b.hue},85%,55%)`;
      c.shadowBlur = 28;
      c.fill();
      c.restore();

      // Orbiting ring A.
      c.save();
      c.translate(b.x, b.y);
      c.rotate(t * 0.75);
      c.scale(1, 0.42);
      c.beginPath();
      c.arc(0, 0, ringA, 0, Math.PI * 2);
      c.strokeStyle = `hsla(${b.hue},90%,70%,0.85)`;
      c.lineWidth = 3;
      c.shadowColor = `hsl(${b.hue},90%,60%)`;
      c.shadowBlur = 12;
      c.stroke();
      c.restore();

      // Orbiting ring B, opposite direction, with broken segments.
      c.save();
      c.translate(b.x, b.y);
      c.rotate(-t * 0.48);
      c.scale(1, 0.28);
      c.beginPath();
      for (let i = 0; i < 3; i++) {
        const a0 = i * (Math.PI * 2 / 3) + 0.12;
        const a1 = a0 + 0.95;
        c.arc(0, 0, ringB, a0, a1);
      }
      c.strokeStyle = `hsla(${(b.hue + 45) % 360},95%,75%,0.9)`;
      c.lineWidth = 4;
      c.shadowColor = `hsl(${(b.hue + 45) % 360},90%,65%)`;
      c.shadowBlur = 14;
      c.stroke();
      c.restore();

      // Small "stars" orbiting the core.
      c.save();
      c.translate(b.x, b.y);
      c.rotate(t * 0.32);
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 / 6) * i;
        const d = b.r + 25 + Math.sin(t * 1.7 + i) * 3;
        const x = Math.cos(a) * d;
        const y = Math.sin(a) * d;
        c.beginPath();
        c.arc(x, y, 2.2, 0, Math.PI * 2);
        c.fillStyle = `hsla(${(b.hue + 70) % 360},100%,85%,0.9)`;
        c.shadowColor = c.fillStyle;
        c.shadowBlur = 8;
        c.fill();
      }
      c.restore();

      // Dark gravitational core. Keep gameplay radius exactly b.r.
      c.save();
      c.beginPath();
      c.arc(b.x, b.y, coreR + 4 * pulse, 0, Math.PI * 2);
      c.fillStyle = `hsla(${b.hue},85%,45%,0.18)`;
      c.shadowColor = `hsl(${b.hue},90%,55%)`;
      c.shadowBlur = 30;
      c.fill();

      c.beginPath();
      c.arc(b.x, b.y, coreR, 0, Math.PI * 2);
      c.fillStyle = '#090914';
      c.shadowColor = `hsl(${b.hue},90%,60%)`;
      c.shadowBlur = 22;
      c.fill();

      c.beginPath();
      c.arc(b.x, b.y, coreR * 0.76, 0, Math.PI * 2);
      c.strokeStyle = `hsla(${(b.hue + 45) % 360},95%,72%,0.9)`;
      c.lineWidth = 2.5;
      c.stroke();

      c.beginPath();
      c.arc(b.x, b.y, coreR * 0.18, 0, Math.PI * 2);
      c.fillStyle = '#ffffff';
      c.shadowColor = '#ffffff';
      c.shadowBlur = 10;
      c.fill();
      c.restore();
      return;
    }

    // Existing visual for W15/W20 and any future boss without a custom visual.
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(
        b.x,
        b.y,
        b.r + k * 10 + Math.sin(now / 200 + k) * 4,
        0,
        Math.PI * 2
      );
      c.strokeStyle = `hsla(${(b.hue + k * 40) % 360},80%,60%,${0.5 - k * 0.12})`;
      c.lineWidth = 3;
      c.stroke();
    }
    c.beginPath();
    c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    c.fillStyle = `hsl(${b.hue % 360},70%,55%)`;
    c.shadowColor = c.fillStyle;
    c.shadowBlur = 20;
    c.fill();
    c.shadowBlur = 0;
  }

  drawBullet(b) {
    const c = this.ctx;
    c.beginPath();
    c.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    c.fillStyle = b.color;
    c.shadowColor = b.color;
    c.shadowBlur = 8;
    c.fill();
    c.shadowBlur = 0;
  }

  drawParticle(p) {
    const c = this.ctx;
    c.globalAlpha = Math.max(p.life, 0);
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fillStyle = p.color;
    c.fill();
    c.globalAlpha = 1;
  }

  drawDownPlayer(p) {
    const c = this.ctx;
    c.save();
    const pulse = 1 + Math.sin(performance.now() / 180) * 0.045;

    // Downed state: player remains visible and subdued, without a death-style X/skull marker.
    c.globalAlpha = 0.22;
    c.beginPath();
    c.arc(p.x, p.y, (p.r + 13) * pulse, 0, Math.PI * 2);
    c.fillStyle = '#ffd166';
    c.fill();

    c.globalAlpha = 0.72;
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fillStyle = p.color;
    c.fill();

    c.globalAlpha = 0.95;
    c.beginPath();
    c.arc(p.x, p.y, p.r + 9, 0, Math.PI * 2);
    c.setLineDash([7, 5]);
    c.strokeStyle = '#ffd166';
    c.lineWidth = 3;
    c.stroke();
    c.setLineDash([]);

    c.beginPath();
    c.moveTo(p.x - 7, p.y);
    c.lineTo(p.x + 7, p.y);
    c.strokeStyle = 'rgba(255,255,255,.8)';
    c.lineWidth = 2;
    c.stroke();

    c.font = '900 14px system-ui';
    c.fillStyle = '#ffd166';
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.shadowColor = '#000';
    c.shadowBlur = 6;
    c.fillText(`P${p.id} DOWN`, p.x, p.y - p.r - 16);

    c.font = '800 10px system-ui';
    c.fillStyle = '#fff';
    c.textBaseline = 'top';
    c.fillText(p.reviveProgress > 0 ? 'REVIVING…' : 'WAITING FOR REVIVE', p.x, p.y + p.r + 14);
    c.shadowBlur = 0;
    c.restore();
  }

  drawRevive(p) {
    const c = this.ctx;
    const pct = Math.min(p.reviveProgress / 2, 1);
    c.save();
    c.beginPath();
    c.arc(p.x, p.y, p.r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    c.strokeStyle = '#7bed9f';
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }

  drawPlayer(p) {
    const c = this.ctx;

    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i], a = i / p.trail.length;
      c.beginPath();
      c.arc(t.x, t.y, p.r * a * 0.8, 0, Math.PI * 2);
      c.fillStyle = `rgba(78,205,196,${a * 0.3})`;
      c.fill();
    }

    if (p.invulnerable > 0) {
      const blink = Math.floor(performance.now() / 90) % 2 === 0;
      if (blink) {
        c.beginPath();
        c.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(255,255,255,.55)';
        c.lineWidth = 2;
        c.stroke();
      }
    }

    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fillStyle = p.color;
    c.shadowColor = p.color;
    c.shadowBlur = 12;
    c.fill();
    c.shadowBlur = 0;

    if (p.hitFlash > 0) {
      const k = p.hitFlash / 0.30;
      c.save();
      c.globalAlpha = 0.78 * k;
      c.beginPath();
      c.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2);
      c.strokeStyle = '#ff5c5c';
      c.lineWidth = 2.5;
      c.shadowColor = '#ff5c5c';
      c.shadowBlur = 7;
      c.stroke();
      c.shadowBlur = 0;
      c.restore();
    }

    if (p.shieldTimer > 0) {
      c.beginPath();
      c.arc(p.x, p.y, p.r + 10 + Math.sin(performance.now() / 100) * 2, 0, Math.PI * 2);
      c.strokeStyle = '#7bed9f';
      c.lineWidth = 2;
      c.stroke();
    }

    c.lineWidth = 2;
    c.strokeStyle = '#fff';
    c.stroke();
  }

  /** Looks up and runs the matching entry in SKILL_EFFECT_DRAWERS for fx.type. */
  drawSkillEffect(fx) {
    const draw = SKILL_EFFECT_DRAWERS[fx.type];
    if (!draw) return;

    const c = this.ctx;
    const p = Math.min(fx.t / fx.duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const fade = 1 - p;

    c.save();
    c.globalCompositeOperation = 'lighter';
    c.translate(fx.x, fx.y);
    draw(c, fx, p, ease, fade);
    c.restore();
  }

  /** Draws a floating "+N" graze-score callout: rises, grows in slightly, then fades. */
  drawScorePopup(p) {
    const c = this.ctx;
    const life = Math.max(0, Math.min(1, p.life));
    const rise = (1 - life) * 38;
    const popIn = Math.min(1, (1 - life) * 6);
    const scale = 0.7 + popIn * 0.4;

    c.save();
    c.globalAlpha = Math.min(1, life * 1.4);
    c.translate(p.x, p.y - rise);
    c.scale(scale, scale);
    c.font = '900 16px system-ui';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(0,0,0,.55)';
    c.strokeText(p.text, 0, 0);
    c.shadowColor = p.color;
    c.shadowBlur = 10;
    c.fillStyle = p.color;
    c.fillText(p.text, 0, 0);
    c.restore();
  }

  flash(alpha) {
    if (alpha <= 0.01) return;
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = `rgba(255,0,0,${alpha * 0.4})`;
    c.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    c.restore();
  }

  /**
   * Screen-edge red vignette that beats like a heartbeat while any active
   * player is down to their last life. Purely visual — reads player state,
   * never touches it. Screen-space overlay, same pattern as flash().
   */
  drawLowLifeVignette(players) {
    const critical = players.some((p) => p.isAlive() && p.lives === 1);
    if (!critical) return;

    const c = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Two-beat heartbeat cadence ("ba-bump ... pause") repeating every 1.1s,
    // built from two narrow gaussian pulses rather than a plain sine so it
    // reads as a heartbeat instead of a smooth breathing glow.
    const t = (performance.now() / 1000) % 1.1;
    const beat = Math.max(
      Math.exp(-((t - 0.0) ** 2) / 0.0025),
      Math.exp(-((t - 0.18) ** 2) / 0.0025)
    );
    const alpha = 0.10 + beat * 0.30;

    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const grad = c.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.32,
      w / 2, h / 2, Math.max(w, h) * 0.72
    );
    grad.addColorStop(0, 'rgba(200,0,0,0)');
    grad.addColorStop(1, `rgba(200,0,0,${alpha})`);
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    c.restore();
  }
}
