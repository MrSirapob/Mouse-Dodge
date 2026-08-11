import { CONFIG } from '../core/config.js';

// Rotating palette used to color-code each wave's bullet patterns.
const WAVE_COLORS = ['#ff5c5c', '#ff9f43', '#c56cf0', '#ff5cc0', '#54a0ff'];

/**
 * WaveSystem builds the list of scheduled bullet-pattern spawns for a given
 * wave number by calling into PatternLibrary (`this.p`). Each wave layers on
 * more pattern types as `n` increases (see the `if (n >= X)` blocks below),
 * and scales speed/density using `speedMult` / `densityMult`.
 *
 * To add a new pattern tier: add another `if (n >= N) { ... }` block that
 * queues patterns via `this.p.<pattern>(...)` and appends a Thai label to
 * `labels`. Nothing else needs to change.
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

  /** How long (seconds) a given wave lasts. */
  duration(n) {
    if (this.game.isBossWave(n)) {
      return Math.min(CONFIG.wave.bossBase + Math.floor(n / 5), CONFIG.wave.bossMax);
    }
    return Math.max(CONFIG.wave.baseDuration - Math.floor(n / 6), CONFIG.wave.minDuration);
  }

  /**
   * Builds a normal (non-boss) wave: schedules every pattern that should
   * fire during it and returns a Thai description string for the wave
   * banner (e.g. "ยิงเล็ง + ระเบิดวงแหวน").
   */
  build(n) {
    this.clear();

    const dur = this.duration(n);
    const diff = Math.min(n, 20);        // difficulty ramps up to a cap at wave 20
    const speedMult = 1 + diff * 0.1;    // bullets get faster with difficulty
    const densityMult = 1 + diff * 0.18; // bullet counts scale up with difficulty

    const colorA = WAVE_COLORS[n % WAVE_COLORS.length];
    const colorB = WAVE_COLORS[(n + 2) % WAVE_COLORS.length];

    const labels = [];

    // Always present: aimed shots from the screen edges, in three bursts.
    this.p.aimed(0, Math.floor(10 * densityMult), 0.35 / densityMult, 2.1 * speedMult, colorA);
    this.p.aimed(dur * 0.4, Math.floor(8 * densityMult), 0.35 / densityMult, 2.1 * speedMult, colorB);
    this.p.aimed(dur * 0.75, Math.floor(8 * densityMult), 0.35 / densityMult, 2.3 * speedMult, colorA);
    labels.push('กระสุนพิฆาตตามเงา');

    if (n >= 2) {
      this.p.ring(dur * 0.25, 640, 360, 14 + diff, 2.4 * speedMult, colorB);
      this.p.ring(dur * 0.65, 640, 360, 14 + diff, 2.4 * speedMult, colorA);
      labels.push('วงแหวนสะเทือนฟ้า');
    }

    if (n >= 3) {
      this.p.wall(dur * 0.35, 2.4 * speedMult, colorA, n % 2 === 0);
      this.p.wall(dur * 0.7, 2.5 * speedMult, colorB, n % 2 !== 0);
      labels.push('กำแพงผนึกนรก');
    }

    if (n >= 4) {
      this.p.spiral(0, dur * 0.34, 2, 1.7 * speedMult, colorB);
      this.p.spiral(dur * 0.58, dur * 0.30, 2, 1.8 * speedMult, colorA);
      labels.push('เกลียวคลั่งทลายสวรรค์');
    }

    if (n >= 6) {
      this.p.cross(dur * 0.3, 7 + diff, 2.5 * speedMult, colorA);
      this.p.cross(dur * 0.65, 7 + diff, 2.6 * speedMult, colorB);
      this.p.laserBarrage(dur * 0.15, 2 + Math.floor(diff / 4), 1.1, '#ff5cc0');
      this.p.laserBarrage(dur * 0.6, 2 + Math.floor(diff / 4), 1.1, '#54a0ff');
      labels.push('กางเขนฟ้าผ่า ลำแสงพิฆาต');
    }

    if (n >= 7) {
      this.p.wall(dur * 0.55, 2.7 * speedMult, colorB, n % 2 !== 0);
      this.p.wall(dur * 0.88, 2.8 * speedMult, colorA, n % 2 === 0);
      this.p.splitter(dur * 0.3, 4 + Math.floor(diff / 4), 0.9, 1.9 * speedMult, colorA);
      this.p.splitter(dur * 0.7, 4 + Math.floor(diff / 4), 0.9, 2 * speedMult, colorB);
      labels.push('กำแพงทมิฬ แยกร่างอสูร');
    }

    if (n >= 8) {
      // Random-ish burst positions within the arena (with margin).
      const spot1X = 160 + Math.random() * 960, spot1Y = 100 + Math.random() * 520;
      const spot2X = 160 + Math.random() * 960, spot2Y = 100 + Math.random() * 520;
      this.p.ring(dur * 0.45, spot1X, spot1Y, 16 + diff, 2.5 * speedMult, colorA);
      this.p.ring(dur * 0.82, spot2X, spot2Y, 16 + diff, 2.6 * speedMult, colorB);
      labels.push('วงแหวนหายนะจากฟากฟ้า');
    }

    if (n >= 9) {
      this.p.homing(dur * 0.2, 4 + Math.floor(diff / 2), 0.4, 1.6 * speedMult, colorB);
      this.p.homing(dur * 0.6, 4 + Math.floor(diff / 2), 0.4, 1.7 * speedMult, colorA);
      this.p.bouncer(dur * 0.25, 4 + Math.floor(diff / 4), 0.8, 2 * speedMult, colorB);
      this.p.bouncer(dur * 0.65, 4 + Math.floor(diff / 4), 0.8, 2.1 * speedMult, colorA);
      labels.push('เงามรณะ ไล่ล่าจนสิ้นทาง');
    }

    // Every 4th wave (after wave 1) adds a shrinking safe-zone hazard.
    this.game.zone = (n % 4 === 0 && n > 1)
      ? {
          cx: 640, cy: 360,
          startR: Math.hypot(1280, 720) / 1.3,
          minR: 110,
          t: 0,
          duration: dur * 0.85,
          grace: dur * 0.1
        }
      : null;

    return labels.join(' + ');
  }

  /**
   * Builds a boss wave: activates the boss and schedules its attack
   * patterns. Returns the Thai banner subtitle for boss waves.
   */
  buildBoss(n) {
    this.clear();
    this.game.zone = null;

    const diff = Math.min(n, 24);
    const speedMult = 1 + diff * 0.08;
    const dur = this.duration(n);
    const colorA = '#ff5c5c', colorB = '#ff9f43', colorC = '#c56cf0';

    this.game.boss.active = true;
    this.game.boss.x = 640;
    this.game.boss.y = -100;

    this.p.bossAimed(1, 10 + Math.floor(diff / 2), 0.38, 2 * speedMult, colorA);
    this.p.bossAimed(dur * 0.4, 8 + Math.floor(diff / 2), 0.32, 2.2 * speedMult, colorB);
    this.p.bossAimed(dur * 0.75, 10 + Math.floor(diff / 2), 0.3, 2.4 * speedMult, colorA);

    this.p.bossRing(dur * 0.2, 16 + diff, 2.2 * speedMult, colorB);
    this.p.bossRing(dur * 0.45, 18 + diff, 2.4 * speedMult, colorA);
    this.p.bossRing(dur * 0.7, 20 + diff, 2.5 * speedMult, colorC);
    this.p.bossRing(dur * 0.9, 18 + diff, 2.6 * speedMult, colorB);

    this.p.bossSpiral(dur * 0.1, dur * 0.3, 3 + Math.floor(diff / 4), 1.8 * speedMult, colorC);
    this.p.bossSpiral(dur * 0.5, dur * 0.4, 4 + Math.floor(diff / 4), 2 * speedMult, colorB);
    this.p.bossSpiral(dur * 0.8, dur * 0.18, 5 + Math.floor(diff / 4), 2.2 * speedMult, colorA);

    return 'BOSS: อาณัติแห่งหายนะ — จงดิ้นรนต่อหน้าความสิ้นหวัง!';
  }
}
