import { CONFIG } from '../core/config.js';

const WAVE_COLORS = ['#ff5c5c', '#ff9f43', '#c56cf0', '#ff5cc0', '#54a0ff'];

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

  clear() { this.queue.length = 0; }

  duration(n) {
    if (this.game.isBossWave(n)) return 60;
    if (n <= 4) return 30;
    if (n <= 9) return 35;
    if (n <= 14) return 40;
    if (n <= 19) return 45;
    return 60;
  }

  color(n, offset = 0) {
    return WAVE_COLORS[(n + offset) % WAVE_COLORS.length];
  }


  build(n) {
    this.clear();
    this.game.zone = null;

    const speedTier = n <= 4 ? 1.0 : n <= 9 ? 1.08 : n <= 14 ? 1.16 : 1.25;
    const c1 = this.color(n);
    const c2 = this.color(n, 2);
    const c3 = this.color(n, 4);
    const labels = new Set();

    const aimed = (t, count, interval = 0.30, spd = 2.15, color = c1) => {
      this.p.aimed(t, Math.ceil(count * 1.7), interval, spd * speedTier, color);
      labels.add('AIMED');
    };
    const ring = (t, x = 640, y = 360, count = 28, spd = 2.25, color = c2) => {
      this.p.ring(t, x, y, Math.ceil(count * 1.7), spd * speedTier, color);
      labels.add('RING');
    };
    const wall = (t, spd = 2.45, color = c1, vertical = false, gap = null) => {
      this.p.wall(t, spd * speedTier, color, vertical, gap);
      labels.add('WALL');
    };
    const spiral = (t, len, arms = 3, spd = 1.9, color = c2) => {
      this.p.spiral(t, len, arms, spd * speedTier, color);
      labels.add('SPIRAL');
    };
    const cross = (t, count, spd = 2.45, color = c1) => {
      this.p.cross(t, Math.ceil(count * 1.7), spd * speedTier, color);
      labels.add('CROSS');
    };
    const laser = (t, count, interval = 0.9, color = c3) => {
      this.p.laserBarrage(t, Math.ceil(count * 1.35), interval, color);
      labels.add('LASER');
    };
    const homing = (t, count, interval = 0.45, spd = 1.85, color = c2) => {
      this.p.homing(t, Math.ceil(count * 1.7), interval, spd * speedTier, color);
      labels.add('HOMING');
    };
    const splitter = (t, count, interval = 0.8, spd = 1.95, color = c1) => {
      this.p.splitter(t, Math.ceil(count * 1.7), interval, spd * speedTier, color);
      labels.add('SPLITTER');
    };
    const bouncer = (t, count, interval = 0.72, spd = 2.0, color = c2) => {
      this.p.bouncer(t, Math.ceil(count * 1.7), interval, spd * speedTier, color);
      labels.add('BOUNCER');
    };

    // V1.7-style timed layering: multiple attack events are distributed
    // through each wave so the player must keep repositioning.
    switch (n) {
      case 1:
        aimed(0.0, 36, 0.30, 2.15);
        aimed(8.0, 30, 0.28, 2.20, c2);
        ring(15.0, 640, 360, 26, 2.25);
        aimed(22.0, 34, 0.27, 2.25, c1);
        wall(27.0, 2.35, c2, true, 0.09);
        break;
      case 2:
        aimed(0.0, 30, 0.28, 2.20);
        ring(5.0, 640, 360, 28, 2.25);
        aimed(10.0, 32, 0.27, 2.25, c2);
        wall(15.5, 2.4, c1, false, 0.09);
        ring(21.0, 640, 360, 30, 2.3, c2);
        aimed(26.0, 34, 0.25, 2.3);
        break;
      case 3:
        aimed(0.0, 32, 0.27, 2.25);
        ring(4.5, 640, 360, 30, 2.3);
        wall(8.0, 2.45, c1, true, 0.085);
        splitter(11.5, 6, 0.82, 1.95, c2);
        aimed(15.0, 34, 0.25, 2.3, c2);
        cross(18.5, 10, 2.45, c1);
        spiral(22.0, 6.5, 3, 1.9, c2);
        ring(25.5, 640, 360, 32, 2.35, c1);
        aimed(28.0, 36, 0.24, 2.35, c2);
        break;
      case 4:
        ring(0.8, 640, 360, 32, 2.35);
        aimed(3.0, 34, 0.25, 2.35, c1);
        wall(6.0, 2.5, c2, true, 0.08);
        splitter(9.0, 7, 0.75, 1.95, c1);
        spiral(12.0, 7.0, 3, 1.95, c2);
        cross(16.0, 11, 2.5, c1);
        ring(19.5, 640, 360, 34, 2.4, c2);
        laser(22.0, 3, 0.95, c3);
        wall(25.0, 2.55, c1, false, 0.075);
        aimed(27.0, 36, 0.24, 2.4, c2);
        spiral(29.0, 8.0, 4, 2.0, c1);
        break;
      case 6:
        wall(0.5, 2.5, c1, true, 0.08);
        aimed(2.0, 34, 0.25, 2.4, c2);
        ring(7.0, 640, 360, 34, 2.4, c1);
        wall(11.0, 2.55, c2, false, 0.075);
        cross(16.0, 12, 2.5, c1);
        aimed(22.0, 38, 0.23, 2.45, c2);
        ring(28.0, 640, 360, 36, 2.45, c1);
        break;
      case 7:
        aimed(0.0, 36, 0.24, 2.45);
        splitter(5.0, 8, 0.8, 1.95, c2);
        wall(9.0, 2.6, c1, false, 0.07);
        ring(13.0, 640, 360, 36, 2.45, c2);
        spiral(18.0, 9.0, 3, 2.0, c1);
        aimed(23.0, 40, 0.22, 2.5, c2);
        wall(29.0, 2.65, c1, true, 0.065);
        ring(33.0, 640, 360, 38, 2.5, c2);
        break;
      case 8:
        ring(1.0, 330, 220, 34, 2.45, c1);
        aimed(3.0, 38, 0.23, 2.5, c2);
        wall(7.0, 2.65, c1, true, 0.065);
        ring(12.0, 950, 500, 36, 2.5, c2);
        bouncer(16.0, 7, 0.7, 2.0, c1);
        aimed(21.0, 40, 0.21, 2.55, c2);
        wall(27.0, 2.7, c1, false, 0.06);
        ring(31.0, 640, 360, 38, 2.55, c1);
        break;
      case 9:
        aimed(0.0, 40, 0.22, 2.55);
        wall(4.0, 2.7, c2, true, 0.06);
        homing(7.0, 9, 0.42, 1.9, c1);
        ring(11.0, 640, 360, 38, 2.5, c2);
        wall(16.0, 2.75, c1, false, 0.055);
        homing(20.0, 10, 0.40, 1.95, c2);
        aimed(25.0, 42, 0.20, 2.6, c1);
        ring(30.0, 640, 360, 40, 2.55, c2);
        wall(33.0, 2.8, c1, true, 0.055);
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
        aimed(0.0, 44, 0.20, 2.65);
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
        homing(14.0, 13, 0.30, 2.05, c1);
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
        homing(11.0, 14, 0.30, 2.1, c1);
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

    return [...labels].join(' + ');
  }

  buildBoss(n) {
    this.clear();
    this.game.zone = null;
    const c1 = this.color(n, 0);
    const c2 = this.color(n, 2);
    const c3 = this.color(n, 4);

    this.game.boss.active = true;
    this.game.boss.x = 640;
    this.game.boss.y = -100;

    if (n === 5) {
      // No dead air: every phase overlaps the previous pressure.
      this.p.bossAimed(0, 34, 0.22, 2.45, c1);
      this.p.bossRing(3.5, 32, 2.5, c2);
      this.p.bossSpiral(7, 15, 3, 2.05, c3);
      this.p.bossAimed(13, 34, 0.20, 2.55, c1);
      this.p.bossRing(17, 34, 2.6, c2);
      this.p.bossSpiral(21, 16, 4, 2.10, c3);
      this.p.bossAimed(28, 38, 0.18, 2.65, c1);
      this.p.bossHoming(31, 14, 0.32, 1.95, c2);
      this.p.bossRing(35, 36, 2.7, c1);
      this.p.bossSpiral(39, 17, 4, 2.15, c3);
      this.p.bossAimed(46, 42, 0.17, 2.75, c2);
      this.p.bossRing(50, 38, 2.8, c1);
      this.p.bossHoming(54, 16, 0.28, 2.0, c3);
      this.p.bossSpiral(55, 5, 5, 2.2, c2);
      return 'AIMED + RING + SPIRAL + HOMING';
    }

    if (n === 10) {
      this.p.bossRing(1, 26, 2.45, c2);
      this.p.bossAimed(12, 22, 0.28, 2.45, c1);
      this.p.bossSpiral(22, 14, 3, 2.0, c3);
      this.p.bossHoming?.(31, 10, 0.45, 1.8, c1);
      this.p.bossRing(40, 28, 2.6, c2);
      this.p.bossSpiral(49, 10, 4, 2.15, c3);
      this.p.bossAimed(54, 24, 0.22, 2.65, c1);
      return 'RING + HOMING + SPIRAL';
    }

    if (n === 15) {
      this.p.bossSpiral(1, 14, 3, 2.0, c3);
      this.p.bossRing(10, 28, 2.55, c2);
      this.p.bossHoming?.(20, 12, 0.4, 1.95, c1);
      this.p.bossAimed(30, 24, 0.23, 2.65, c2);
      this.p.bossRing(39, 30, 2.7, c1);
      this.p.bossSpiral(47, 13, 4, 2.2, c3);
      this.p.bossHoming?.(53, 10, 0.35, 2.0, c2);
      return 'SPIRAL + HOMING + RING';
    }

    this.p.bossAimed(1, 26, 0.22, 2.7, c1);
    this.p.bossRing(10, 30, 2.65, c2);
    this.p.bossSpiral(19, 15, 4, 2.15, c3);
    this.p.bossHoming?.(29, 12, 0.36, 2.0, c1);
    this.p.bossRing(38, 32, 2.8, c2);
    this.p.bossSpiral(47, 13, 5, 2.25, c3);
    this.p.bossAimed(54, 28, 0.2, 2.85, c1);
    return 'AIMED + RING + HOMING + SPIRAL';
  }
}
