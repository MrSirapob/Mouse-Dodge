import { CONFIG, actForWave } from "../core/config.js?v=20260821-xdqs";

/**
 * ========================= PATTERN GUIDE FOR AI =========================
 *
 * IMPORTANT:
 * - The helper function name is the source of truth for gameplay behavior.
 * - The Thai name in labels.add(...) is ONLY a display/lore name.
 * - Do not infer mechanics from the display name.
 *
 * NORMAL PATTERNS:
 *
 * AIMED    = projectiles aimed directly at the player's current position.
 * RING     = projectiles fired outward in a circular/ring formation.
 * WALL     = a moving wall/line of projectiles with a gap; `vertical`
 *            controls orientation and `gap` controls the opening.
 * SPIRAL   = rotating/spiral projectile pattern; `arms` controls spiral arms.
 * CROSS    = projectiles fired in a four-direction cross formation.
 * LASER    = a timed barrage of laser attacks; `interval` controls spacing.
 * HOMING   = projectiles that track/follow the player.
 * SPLITTER = projectiles that split into additional projectiles.
 * BOUNCER  = projectiles that bounce/reflect and can change direction.
 *
 * BOSS PATTERNS:
 *
 * bossAimed  = Boss version of AIMED; targets the player.
 * bossRing   = Boss version of RING; circular spread.
 * bossSpiral = Boss version of SPIRAL; rotating spiral spread.
 * bossHoming = Boss version of HOMING; tracking projectiles.
 *
 * DESIGN RULE FOR FUTURE AI:
 * - When reading a wave, identify the mechanic from the helper call itself:
 *   aimed -> AIMED
 *   ring -> RING
 *   wall -> WALL
 *   spiral -> SPIRAL
 *   cross -> CROSS
 *   laser -> LASER
 *   homing -> HOMING
 *   splitter -> SPLITTER
 *   bouncer -> BOUNCER
 * - Keep this mapping intact when editing or adding waves.
 * - The dramatic Thai labels are presentation/lore only.
 * - Boss patterns are intentionally layered with little dead air.
 * =========================================================================
 */

/**
 * WaveSystem owns the actual encounter design. Normal waves deliberately reuse
 * familiar patterns in different combinations; bosses are where the special
 * gimmicks and phase changes live.
 */
export class WaveSystem {
  constructor(game, patterns) {
    this.game = game;
    this.p = patterns;
    this.queue = [];
  }

  clear() {
    this.queue.length = 0;
  }

  duration(n) {
    if (this.game.isBossWave(n)) return 60;
    if (n === 1) return 20;
    if (n === 2) return 23;
    if (n === 3) return 26;
    if (n === 4) return 29;
    if (n <= 9) return 40;
    if (n <= 14) return 40;
    if (n <= 19) return 45;
    return 60;
  }

  // Bullet colors come from the wave's narrative act (see CONFIG.actThemes
  // / actForWave in config.js) — W1-4 mortal-world colors, then a new
  // palette every boss wave (5/10/15/20) as the story escalates. Same
  // 5-color cycling as before, just sourced per-act instead of one fixed
  // list, so every existing `color(n, offset)` call site is unaffected.
  color(n, offset = 0) {
    const palette = CONFIG.actThemes[actForWave(n)].colors;
    return palette[(n + offset) % palette.length];
  }

  build(n) {
    this.clear();

    const speedTier = n <= 4 ? 1.0 : n <= 9 ? 1.08 : n <= 14 ? 1.16 : 1.25;
    const c1 = this.color(n);
    const c2 = this.color(n, 2);
    const c3 = this.color(n, 4);
    const labels = new Set();

    // Wave 1-4 tuning pass: AIM count down further (0.8 -> 0.64, i.e. an
    // additional ~20% cut on top of the earlier ~20% cut, ~36% total off
    // the original), AIM speed up ~8% (within the requested 5-10% band).
    // Only the AIMED pattern is touched; other patterns on W1-4 and every
    // pattern on W5+ are unaffected.
    // Follow-up (2026-08-20): W3-4 specifically felt like they still had
    // too much AIM, so they get one more 20% cut on top of the shared
    // W1-4 0.64 multiplier (0.64 * 0.8 = 0.512, ~49% off the original
    // count). W1-2 stay at the existing 0.64.
    const aimCountMult = n <= 2 ? 0.64 : n <= 4 ? 0.64 * 0.8 : 1.0;
    const aimSpeedMult = n <= 4 ? 1.08 : 1.0;

    // Per-wave bullet-count scaling (2026-08-20): W1 fires 30% fewer
    // bullets across all count-based patterns, W2 fires 20% fewer.
    // Wall and spiral have no discrete bullet count so they're unaffected.
    // W3+ remain at 1.0 (unchanged).
    const waveCountMult = n === 1 ? 0.70 : n === 2 ? 0.80 : 1.0;

    const aimed = (t, count, interval = 0.3, spd = 2.15, color = c1) => {
      this.p.aimed(
        t,
        Math.ceil(count * waveCountMult * 1.7 * aimCountMult),
        interval,
        spd * speedTier * aimSpeedMult,
        color,
      );
      labels.add("คำพิพากษาแห่งผู้ไร้ทางรอด");
    };

    const ring = (t, x = 640, y = 360, count = 28, spd = 2.25, color = c2) => {
      this.p.ring(t, x, y, Math.ceil(count * waveCountMult * 1.7), spd * speedTier, color);
      labels.add("วงแหวนกลืนกินสรรพสิ่ง");
    };

    const wall = (t, spd = 2.45, color = c1, vertical = false, gap = null) => {
      // wall has no discrete bullet count — waveCountMult deliberately not applied.
      this.p.wall(t, spd * speedTier, color, vertical, gap);
      labels.add("กำแพงทมิฬปิดฟากสวรรค์");
    };

    const spiral = (t, len, arms = 3, spd = 1.9, color = c2) => {
      // spiral uses len/arms (not a bullet count) — waveCountMult not applied.
      this.p.spiral(t, len, arms, spd * speedTier, color);
      labels.add("มหาวังวนกลืนกินดวงวิญญาณ");
    };

    const cross = (t, count, spd = 2.45, color = c1) => {
      this.p.cross(t, Math.ceil(count * waveCountMult * 1.7), spd * speedTier, color);
      labels.add("กางเขนประหารสี่ทิศ");
    };

    const laser = (t, count, interval = 0.9, color = c3) => {
      this.p.laserBarrage(t, Math.ceil(count * waveCountMult * 1.35), interval, color);
      labels.add("มหาลำแสงพิพากษาเหนือปฐพี");
    };

    const homing = (t, count, interval = 0.45, spd = 1.85, color = c2) => {
      this.p.homing(
        t,
        Math.ceil(count * waveCountMult * 1.7),
        interval,
        spd * speedTier,
        color,
      );
      labels.add("เหล่าวิญญาณอาฆาตผู้ไม่เคยพลาดเป้า");
    };

    const splitter = (t, count, interval = 0.8, spd = 1.95, color = c1) => {
      this.p.splitter(
        t,
        Math.ceil(count * waveCountMult * 1.7),
        interval,
        spd * speedTier,
        color,
      );
      labels.add("การกำเนิดแห่งหายนะไร้ที่สิ้นสุด");
    };

    const bouncer = (t, count, interval = 0.72, spd = 2.0, color = c2) => {
      this.p.bouncer(
        t,
        Math.ceil(count * waveCountMult * 1.7),
        interval,
        spd * speedTier,
        color,
      );
      labels.add("เศษซากแห่งกาลเวลาตามล่าผู้มีชีวิต");
    };

    // V1.7-style timed layering: multiple attack events are distributed
    // through each wave so the player must keep repositioning.
    switch (n) {
      case 1:
        // W1 — "Bullet Hell" opening, round 2 tuning. The first pass (aimed/
        // ring/wall only, layers starting every 3-5s) still read as too calm.
        // Now: overlap starts at t=0 (aimed+ring fire almost together), the
        // gap between layers is cut to ~1.5-2s everywhere, cross/splitter are
        // folded in early (previously W2/W3-only) to raise the ceiling, and
        // intervals/counts are pushed further (0.16→0.09-0.11, 46→50-54).
        aimed(0.0, 46, 0.11, 2.6, c1);
        ring(0.6, 640, 360, 40, 2.6, c2);
        aimed(2.5, 42, 0.11, 2.65, c2);
        wall(4.5, 2.75, c1, true, 0.075);
        ring(6.0, 300, 220, 42, 2.65, c1);
        cross(7.5, 12, 2.7, c2);
        aimed(9.0, 46, 0.1, 2.7, c1);
        wall(11.0, 2.8, c2, false, 0.07);
        ring(12.5, 980, 500, 44, 2.7, c2);
        splitter(14.0, 8, 0.5, 2.15, c1);
        aimed(15.5, 48, 0.1, 2.75, c2);
        wall(17.5, 2.85, c1, true, 0.065);
        ring(19.0, 640, 200, 44, 2.75, c1);
        cross(20.5, 13, 2.8, c2);
        aimed(22.0, 50, 0.09, 2.8, c1);
        wall(24.0, 2.9, c2, false, 0.06);
        ring(25.5, 340, 500, 46, 2.8, c2);
        aimed(27.0, 50, 0.09, 2.85, c1);
        break;
      case 2:
        // W2 — Heavy Bullet Hell. Re-tuned to sit clearly above the new W1
        // (which now also uses cross/splitter): every count/speed is a step
        // higher and intervals a step lower than W1's equivalents, plus a
        // splitter layer is added so W2 keeps escalating rather than tying.
        aimed(0.0, 44, 0.12, 2.6, c1);
        ring(0.6, 640, 360, 42, 2.62, c2);
        aimed(2.5, 42, 0.11, 2.65, c2);
        wall(4.5, 2.78, c1, false, 0.07);
        ring(6.0, 340, 200, 44, 2.68, c1);
        cross(7.5, 13, 2.7, c2);
        aimed(9.0, 46, 0.11, 2.72, c1);
        splitter(10.5, 8, 0.48, 2.2, c2);
        wall(12.5, 2.82, c2, true, 0.065);
        ring(14.0, 960, 520, 44, 2.72, c2);
        aimed(15.5, 46, 0.1, 2.76, c1);
        cross(17.5, 14, 2.78, c2);
        wall(19.5, 2.85, c1, false, 0.06);
        ring(21.0, 640, 200, 46, 2.78, c2);
        aimed(22.5, 48, 0.1, 2.8, c1);
        splitter(24.5, 9, 0.45, 2.25, c2);
        wall(26.5, 2.9, c2, true, 0.055);
        ring(28.0, 300, 500, 48, 2.82, c1);
        break;
      case 3:
        // W3 — Extreme Bullet Hell. Re-tuned one notch above the new W2 to
        // preserve W1<W2<W3<W4 (every count/speed higher, interval/gap lower
        // than W2's equivalents). Splitter/cross/spiral overlap directly.
        aimed(0.0, 46, 0.11, 2.75, c1);
        ring(1.0, 640, 360, 42, 2.75, c2);
        wall(3.0, 2.9, c1, true, 0.062);
        splitter(5.0, 10, 0.48, 2.3, c2);
        aimed(7.0, 48, 0.1, 2.8, c2);
        cross(9.5, 15, 2.85, c1);
        ring(11.0, 300, 500, 46, 2.8, c1);
        spiral(12.5, 6.5, 4, 2.3, c2);
        aimed(15.0, 50, 0.1, 2.85, c2);
        wall(17.0, 2.95, c2, false, 0.055);
        splitter(18.5, 11, 0.42, 2.35, c1);
        ring(20.0, 980, 220, 48, 2.85, c2);
        cross(21.5, 16, 2.9, c1);
        spiral(23.0, 7.0, 4, 2.35, c1);
        aimed(25.0, 52, 0.09, 2.9, c2);
        ring(27.0, 640, 360, 50, 2.9, c1);
        wall(28.5, 3.0, c2, true, 0.05);
        break;
      case 4:
        // W4 — Brutal Bullet Hell, the climax before the W5 boss. Re-tuned
        // one notch above the new W3 for the same ordering reason. Every
        // pattern in the W1-4 toolkit (including laser) is layered with
        // almost no dead air; gaps stay above the historical minimums
        // already proven safe on later waves (see W16-19/default below).
        ring(0.0, 640, 360, 48, 2.9, c1);
        aimed(0.8, 48, 0.09, 2.95, c2);
        wall(2.5, 3.0, c2, true, 0.05);
        splitter(4.0, 11, 0.42, 2.4, c1);
        spiral(5.5, 6.5, 4, 2.4, c2);
        cross(7.0, 16, 2.95, c1);
        ring(8.5, 300, 220, 50, 2.9, c2);
        laser(10.0, 5, 0.6, c3);
        aimed(11.0, 50, 0.09, 3.0, c1);
        wall(13.0, 3.05, c1, false, 0.045);
        spiral(14.5, 7.0, 4, 2.45, c1);
        splitter(16.0, 12, 0.4, 2.45, c2);
        cross(17.5, 17, 3.0, c2);
        ring(19.0, 980, 500, 52, 2.95, c1);
        aimed(20.5, 52, 0.08, 3.05, c2);
        laser(22.0, 6, 0.55, c3);
        wall(23.5, 3.1, c2, true, 0.045);
        spiral(25.0, 8.0, 5, 2.5, c1);
        ring(26.5, 640, 360, 54, 3.0, c2);
        aimed(28.0, 54, 0.08, 3.1, c1);
        break;
      case 6:
        // W6 — dense new gameplay set.
        // Every pattern here is called directly on `this.p` (machineGunTop,
        // crossfire, delayedBurst, movingSweep, ricochetField) instead of
        // going through the wrapped closures above (aimed/ring/wall/...),
        // so none of the usual labels.add(...) calls happen — that left the
        // wave banner subtitle blank for W6 (flagged as a WARN by
        // tests/unit/wave.test.mjs). Fixed by giving this pattern set its
        // own banner label, consistent with every other wave tier.
        labels.add("สายฝนเหล็กไร้ความปรานี");

        // Machine Gun: speed 10, tightly packed with a small controlled spread.
        this.p.machineGunTop(0.30, 220, 0.045, 10.0, 40, c1);

        // Diagonal Rain removed.
        this.p.crossfire(10.5, 7, 0.82, 12, 2.55, c1);
        this.p.delayedBurst(15.5, 8, 0.72, 1.35, 12, 2.35, c2);

        // Moving Sweep: map-sized synchronized wall with one tight opening.
        this.p.movingSweep(20.5, 6, 1.05, 2.65, c1, true);

        this.p.aimed(27.0, 600, 0.055, 3.0, c2);
        this.p.ricochetField(33.0, 300, 0.08, 2.5, c1);

        this.p.movingSweep(39.0, 4, 0.95, 2.7, c1, false);
        break;
      case 7:
        // W7 — sine, curve, stop/go, acceleration and bounce.
        aimed(0.0, 50, 0.18, 5.3);
        this.p.sineRain(3.0, 26, 0.16, 4.4, 120, 0.72, c2, true);
        wall(7.0, 11.0, c1, false, 0.07);
        wall(8.8, 10.0, c2, true, 0.08);
        this.p.curvingSplit(10.0, 14, 0.45, 4.3, c2);
        this.p.edgeSplitter(13.0, 7, 0.35, 4.0, c3);
        bouncer(14.0, 16, 0.42, 4.4, c1);
        this.p.stopAndGo(18.0, 20, 0.22, 5.4, 1.8, 0.55, c2, true);
        spiral(23.0, 8.5, 4, 4.4, c1);
        this.p.accelerateRain(28.0, 22, 0.18, 1.6, 1.8, c3, false);
        cross(32.0, 16, 5.5, c2);
        laser(35.0, 6, 0.55, c3);
        break;

      case 8:
        // W8 — orbit, acceleration, reversal and sine trajectories.
        this.p.orbitBurst(0.0, 32, 0.12, 92, 4.0, 0.9, c1);
        ring(3.0, 330, 220, 44, 2.65, c2);
        this.p.accelerateRain(6.0, 24, 0.17, 0.7, 2.0, c1, true);
        wall(10.0, 5.6, c2, true, 0.065);
        wall(11.7, 5.2, c1, false, 0.075);
        this.p.reverseRain(13.0, 22, 0.2, 2.45, 4.8, c3, true);
        spiral(17.0, 9.0, 5, 2.2, c1);
        this.p.sineRain(22.0, 28, 0.14, 2.35, 145, 0.85, c2, false);
        bouncer(26.0, 16, 0.38, 2.3, c1);
        this.p.curvingSplit(30.0, 16, 0.38, 2.25, c3);
        this.p.edgeSplitter(33.0, 8, 0.3, 4.2, c2);
        aimed(34.0, 54, 0.14, 2.9, c1);
        laser(37.0, 7, 0.5, c3);
        break;
      case 9:
        // W9 — reverse, curve, sine, orbit, split and accelerating fire.
        laser(0.5, 6, 0.58, c3);
        this.p.curvingSplit(2.0, 18, 0.32, 4.6, c1);
        this.p.sineRain(5.0, 30, 0.13, 4.9, 160, 0.9, c2, true);
        wall(9.0, 5.7, c1, true, 0.055);
        wall(10.8, 5.4, c2, false, 0.065);
        wall(12.6, 5.2, c1, true, 0.07);
        this.p.reverseRain(12.0, 26, 0.17, 5.2, 2.2, c2, false);
        this.p.orbitBurst(16.0, 22, 0.16, 120, 2.2, 1.8, c1);
        this.p.edgeSplitter(19.0, 9, 0.28, 4.5, c3);
        splitter(20.0, 12, 0.42, 4.4, c2);
        ring(23.0, 640, 360, 50, 5.6, c2);
        this.p.accelerateRain(27.0, 26, 0.14, 1.6, 2.2, c3, true);
        bouncer(31.0, 18, 0.34, 4.7, c1);
        this.p.stopAndGo(34.0, 24, 0.17, 5.8, 1.25, 0.45, c2, false);
        aimed(37.0, 56, 0.12, 6, c1);
        laser(39.0, 6, 0.5, c3);
        break;

      case 11:
        cross(0.0, 13, 2.55, c1);
        wall(4.0, 2.75, c2, true, 0.055);
        aimed(7.0, 42, 0.21, 2.6, c1);
        ring(12.0, 640, 360, 40, 2.55, c2);
        splitter(17.0, 8, 0.75, 2.0, c1);
        wall(22.0, 2.8, c2, false, 0.05);
        homing(27.0, 10, 0.38, 1.95, c1);
        spiral(32.0, 10.0, 4, 2.0, c2);
        aimed(37.0, 44, 0.19, 2.65, c1);
        break;
      case 12:
        aimed(0.0, 44, 0.2, 2.65);
        wall(4.0, 2.8, c1, false, 0.05);
        spiral(8.0, 10.0, 4, 2.0, c2);
        homing(12.0, 10, 0.38, 2.0, c1);
        ring(17.0, 640, 360, 42, 2.6, c2);
        laser(22.0, 5, 0.85, c3);
        wall(27.0, 2.85, c1, true, 0.05);
        aimed(32.0, 46, 0.18, 2.7, c2);
        ring(37.0, 640, 360, 44, 2.65, c1);
        break;
      case 13:
        wall(0.5, 2.85, c1, true, 0.05);
        aimed(2.0, 44, 0.19, 2.7, c2);
        splitter(6.0, 10, 0.7, 2.05, c1);
        spiral(11.0, 11.0, 4, 2.05, c2);
        cross(16.0, 14, 2.65, c1);
        ring(21.0, 640, 360, 44, 2.65, c2);
        homing(26.0, 11, 0.35, 2.0, c1);
        wall(31.0, 2.9, c2, false, 0.045);
        aimed(36.0, 48, 0.17, 2.75, c1);
        break;
      case 14:
        ring(0.5, 360, 360, 44, 2.65, c1);
        wall(4.0, 2.9, c2, true, 0.045);
        homing(7.0, 12, 0.34, 2.0, c1);
        laser(11.0, 6, 0.8, c3);
        spiral(15.0, 11.0, 4, 2.1, c2);
        wall(20.0, 2.95, c1, false, 0.04);
        bouncer(24.0, 9, 0.62, 2.1, c2);
        ring(29.0, 920, 380, 46, 2.7, c1);
        aimed(34.0, 50, 0.17, 2.8, c2);
        wall(38.0, 3.0, c1, true, 0.04);
        break;

      case 16:
        aimed(0.0, 50, 0.17, 2.75);
        wall(4.0, 2.95, c2, true, 0.04);
        ring(7.0, 640, 360, 48, 2.7, c1);
        homing(10.0, 12, 0.32, 2.05, c2);
        spiral(15.0, 11.0, 4, 2.1, c1);
        wall(20.0, 3.0, c2, false, 0.04);
        splitter(23.0, 10, 0.65, 2.1, c1);
        laser(28.0, 7, 0.75, c3);
        aimed(34.0, 52, 0.16, 2.85, c2);
        ring(40.0, 640, 360, 50, 2.75, c1);
        wall(43.0, 3.05, c1, true, 0.035);
        break;
      case 17:
        ring(0.5, 640, 360, 50, 2.75, c1);
        aimed(2.0, 52, 0.16, 2.8, c2);
        bouncer(6.0, 10, 0.6, 2.1, c1);
        wall(10.0, 3.0, c2, false, 0.035);
        homing(14.0, 13, 0.3, 2.05, c1);
        spiral(19.0, 12.0, 5, 2.15, c2);
        ring(25.0, 400, 500, 52, 2.8, c1);
        wall(30.0, 3.05, c2, true, 0.035);
        aimed(34.0, 54, 0.15, 2.9, c1);
        laser(39.0, 8, 0.7, c3);
        wall(43.0, 3.1, c1, false, 0.03);
        break;
      case 18:
        aimed(0.0, 54, 0.15, 2.85);
        spiral(4.0, 12.0, 5, 2.15, c1);
        wall(7.0, 3.05, c2, true, 0.03);
        homing(11.0, 14, 0.3, 2.1, c1);
        splitter(15.0, 11, 0.62, 2.1, c2);
        ring(20.0, 640, 360, 54, 2.85, c1);
        bouncer(24.0, 11, 0.58, 2.15, c2);
        wall(29.0, 3.1, c1, false, 0.03);
        laser(32.0, 8, 0.7, c3);
        aimed(37.0, 56, 0.14, 2.95, c2);
        ring(42.0, 640, 360, 56, 2.9, c1);
        break;
      case 19:
        ring(0.5, 640, 360, 56, 2.85, c1);
        wall(4.0, 3.1, c2, true, 0.03);
        aimed(6.0, 56, 0.14, 2.9, c1);
        homing(10.0, 15, 0.28, 2.1, c2);
        spiral(14.0, 12.0, 5, 2.2, c1);
        splitter(18.0, 12, 0.58, 2.15, c2);
        wall(23.0, 3.15, c1, false, 0.028);
        bouncer(27.0, 12, 0.55, 2.15, c2);
        ring(31.0, 360, 220, 58, 2.9, c1);
        laser(34.0, 9, 0.65, c3);
        aimed(37.0, 58, 0.13, 3.0, c2);
        wall(42.0, 3.2, c1, true, 0.028);
        break;
      default:
        aimed(0, 54, 0.15, 2.9);
        ring(6, 640, 360, 56, 2.9, c2);
        wall(12, 3.15, c1, true, 0.028);
        homing(16, 14, 0.3, 2.1, c2);
        spiral(22, 12, 5, 2.2, c1);
        wall(30, 3.2, c2, false, 0.025);
        aimed(36, 60, 0.13, 3.0, c1);
        break;
    }

    return [...labels].join(" + ");
  }

  buildBoss(n) {
    this.clear();
    const c1 = this.color(n, 0);
    const c2 = this.color(n, 2);
    const c3 = this.color(n, 4);

    this.game.boss.active = true;
    this.game.boss.wave = n;
    this.game.boss.x = 640;
    this.game.boss.y = -100;
    // See CONFIG.bossNames (js/core/config.js) to change what shows above
    // the boss HP bar — this is the only place that needs editing.
    this.game.boss.name = CONFIG.bossNames[n] ?? CONFIG.bossNames.default;

    if (n === 5) {
      // No dead air: every phase overlaps the previous pressure.
      this.p.bossAimed(0, 34, 0.22, 2.45, c1);
      this.p.bossRing(3.5, 32, 2.5, c2);
      this.p.bossSpiral(7, 15, 3, 2.05, c3);
      this.p.bossAimed(13, 34, 0.2, 2.55, c1);
      this.p.bossRing(17, 34, 2.6, c2);
      this.p.bossSpiral(21, 16, 4, 2.1, c3);
      this.p.bossAimed(28, 38, 0.18, 2.65, c1);
      this.p.bossHoming(31, 14, 0.32, 1.95, c2);
      this.p.bossRing(35, 36, 2.7, c1);
      this.p.bossSpiral(39, 17, 4, 2.15, c3);
      this.p.bossAimed(46, 42, 0.17, 2.75, c2);
      this.p.bossRing(50, 38, 2.8, c1);
      this.p.bossHoming(54, 16, 0.28, 2.0, c3);
      this.p.bossSpiral(55, 5, 5, 2.2, c2);
      return "「บทที่หนึ่ง : ผู้ต้องห้ามตื่นจากนิทรา」";
    }
    if (n === 10) {
      // W10 BOSS — five phases.
      // Perimeter Formation is intentionally SOLO during its windows:
      // no Ring/Aimed/Homing/etc. is layered on top of it.
      //
      // Density pass (user-requested, "อัดเพิ่ม W10 เพราะเพื่อนเทสแล้วบอกว่า
      // W10 ง่ายกว่า W5"): simulateWave(10) showed W10 averaging only ~53
      // active bullets (peak 155/420, 37% density) versus W5's ~262 average
      // (peak 340/340, 100% density, 511 dropped spawns) — W10 was the
      // least dense wave of W1-10 despite being the second boss. Root cause:
      // W10 never used bossSpiral() at all, which is W5's main sustained-
      // pressure tool (a fixed 20 steps/sec regardless of `duration`, so
      // `arms` bullets/0.05s = arms*20 bullets/sec — e.g. 3 arms = 60/s).
      // Added 4 bossSpiral bursts below, each timed to run in the
      // "connective tissue" between/before the solo Perimeter windows
      // (never overlapping a Perimeter telegraph-to-fire window) so the
      // SOLO design intent for the signature formations is preserved.

      // PHASE 1 — THE GAZE
      this.p.bossAimed(0.0, 28, 0.22, 3.0, c1);
      this.p.bossRing(3.0, 54, 2.8, c2);
      // Density pass: ambient spiral under the Phase 1 background, ends at
      // 6.0 — well clear of the Perimeter telegraph starting at 8.0.
      this.p.bossSpiral(1.0, 5.0, 3, 2.0, c2);
      this.p.bossAimed(7.0, 30, 0.18, 3.2, c1);

      // PHASE 1 SIGNATURE: perimeter formation only.
      this.p.bossPerimeterCrossfire(9.0, 3.5, 30, 0.55, 2.1, c3);

      // PHASE 2
      this.p.bossRing(13.0, 62, 2.9, c2);
      // Density pass: short spiral burst, ends at 15.5 — before the Phase 2
      // Perimeter telegraph starts at 16.0.
      this.p.bossSpiral(13.5, 2.0, 2, 2.15, c3);
      this.p.edgeSplitter(15.0, 10, 0.32, 3.8, c3);

      // PHASE 2 SIGNATURE: perimeter formation only.
      this.p.bossPerimeterCrossfire(17.0, 5.0, 32, 0.48, 2.3, c1);

      // PHASE 3
      // reverseAfter bumped 1.45 -> 4.2 (same bug/fix as W8/W9 Session 12/13,
      // see CHANGELOG): at the old value bullets only traveled
      // 1.45*2.8*60 = 243.6px (~34% of the 720px arena) before reversing.
      // 4.2 -> 705.6px (~95%, matching the W8/W9 fix ratio).
      this.p.reverseRain(25.0, 22, 0.18, 2.8, 4.2, c1, true);
      this.p.bossHoming(27.0, 18, 0.32, 2.4, c2);

      // PHASE 3 SIGNATURE: perimeter formation only.
      this.p.bossPerimeterCrossfire(29.0, 5.0, 34, 0.42, 2.5, c3);
      // Same fix as above: 1.35 -> 3.95 (old: 1.35*2.9*60 = 234.9px, ~33%
      // of arena; new: 687.3px, ~95%).
      this.p.reverseRain(35.0, 24, 0.16, 2.9, 3.95, c1, false);

      // PHASE 4 — machine gun + moving sweep.
      this.p.machineGunTop(38.0, 52, 0.09, 5.2, 0.7, c1);
      // Density pass: this is the wave's busiest stretch already (machine
      // gun + moving sweep + edge splitter + ring) — layering the biggest
      // spiral burst here (6s, 3 arms) matches W5's "no dead air, every
      // phase overlaps the previous pressure" philosophy for its own
      // busiest stretch.
      this.p.bossSpiral(39.0, 6.0, 3, 2.2, c2);
      this.p.movingSweep(41.0, 2, 0.0, 2.8, c2);
      this.p.machineGunTop(44.0, 58, 0.075, 5.5, 0.8, c1);
      this.p.edgeSplitter(47.0, 8, 0.3, 4.1, c3);
      this.p.bossRing(48.0, 58, 3.0, c2);

      // PHASE 5 — final perimeter formation, again SOLO.
      this.p.sineRain(50.0, 28, 0.13, 3.0, 145, 0.82, c3, true);
      this.p.bossPerimeterCrossfire(52.0, 5.0, 36, 0.36, 2.8, c1);
      // Density pass: closing spiral burst after the Phase 5 Perimeter
      // fires (~55.0) through the final bossHoming, ending at 58.0 —
      // inside the 60s wave so it still fully resolves.
      this.p.bossSpiral(55.0, 3.0, 2, 2.25, c3);
      this.p.bossHoming(58.0, 18, 0.24, 2.55, c2);

      return "「บทที่สอง : เมื่อสวรรค์ถูกลากลงจากบัลลังก์」";
    }

    if (n === 15) {
      this.p.bossSpiral(1, 14, 3, 2.0, c3);
      this.p.bossRing(10, 28, 2.55, c2);
      this.p.bossHoming(20, 12, 0.4, 1.95, c1);
      this.p.bossAimed(30, 24, 0.23, 2.65, c2);
      this.p.bossRing(39, 30, 2.7, c1);
      this.p.bossSpiral(47, 13, 4, 2.2, c3);
      this.p.bossHoming(53, 10, 0.35, 2.0, c2);
      return "「บทที่สาม : พิธีกรรมคืนโลกสู่ความว่างเปล่า」";
    }

    this.p.bossAimed(1, 26, 0.22, 2.7, c1);
    this.p.bossRing(10, 30, 2.65, c2);
    this.p.bossSpiral(19, 15, 4, 2.15, c3);
    this.p.bossHoming(29, 12, 0.36, 2.0, c1);
    this.p.bossRing(38, 32, 2.8, c2);
    this.p.bossSpiral(47, 13, 5, 2.25, c3);
    this.p.bossAimed(54, 28, 0.2, 2.85, c1);
    return "「บทสุดท้าย : เมื่อแม้แต่ความว่างเปล่าก็ถึงกาลอวสาน」";
  }
}
