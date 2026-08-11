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
  dash(c, fx, p, ease, fade) {
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(-i * 7, 0, 8 + i * 2, 0, Math.PI * 2);
      c.strokeStyle = fx.color;
      c.lineWidth = 3;
      c.globalAlpha = fade * (1 - i * 0.15);
      c.stroke();
    }
  },
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
    const r = 30 + fx.maxRadius * ease;
    c.globalAlpha = 0.25 * fade;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fillStyle = '#c56cf0';
    c.fill();
    c.globalAlpha = 0.8 * fade;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.strokeStyle = '#c56cf0';
    c.lineWidth = 3;
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + fx.t * 0.8;
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      c.stroke();
    }
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
    this.viewport = {
      width: w,
      height: h,
      scale,
      offsetX: (w - WORLD.width * scale) / 2,
      offsetY: (h - WORLD.height * scale) / 2
    };
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Converts a screen-space point (e.g. mouse/touch position) into world-space coordinates. */
  worldPoint(screenX, screenY) {
    return {
      x: (screenX - this.viewport.offsetX) / this.viewport.scale,
      y: (screenY - this.viewport.offsetY) / this.viewport.scale
    };
  }

  /** Starts a frame: clears the canvas and applies the viewport transform (plus camera shake). */
  begin(shake = 0) {
    const c = this.ctx, v = this.viewport;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    c.fillStyle = '#07070c';
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
    c.fillStyle = '#07070c';
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
    if (game.zone) this.drawZone(game.zone);
    for (const w of game.ringWarnings) this.drawWarning(w);
    for (const l of game.lasers) this.drawLaser(l);
    if (game.boss.active) this.drawBoss(game.boss);
    for (const b of game.bullets.items) this.drawBullet(b);
    for (const p of game.particles.items) this.drawParticle(p);
    for (const p of game.activePlayers()) this.drawPlayer(p);

    if (game.state.mode === 'coop') {
      for (const p of game.players) if (p.down) this.drawDownPlayer(p);
      for (const p of game.players) if (p.reviveProgress > 0) this.drawRevive(p);
    }

    for (const fx of game.skillEffects) this.drawSkillEffect(fx);
  }

  drawZone(z) {
    const c = this.ctx;
    c.save();
    // Fill everything outside the safe circle (evenodd rule) to show the danger area.
    c.beginPath();
    c.rect(-30, -30, 1340, 780);
    c.arc(z.cx, z.cy, z.curR, 0, Math.PI * 2, true);
    c.fillStyle = 'rgba(255,0,0,.12)';
    c.fill('evenodd');

    c.beginPath();
    c.arc(z.cx, z.cy, z.curR, 0, Math.PI * 2);
    c.strokeStyle = '#ff5c5c';
    c.setLineDash([8, 6]);
    c.lineWidth = 2;
    c.stroke();
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
    if (typeof w.gapAngle === 'number') {
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
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(b.x, b.y, b.r + k * 10 + Math.sin(performance.now() / 200 + k) * 4, 0, Math.PI * 2);
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

  flash(alpha) {
    if (alpha <= 0.01) return;
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = `rgba(255,0,0,${alpha * 0.4})`;
    c.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    c.restore();
  }
}
