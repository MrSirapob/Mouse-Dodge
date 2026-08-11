const WORLD = { width: 1280, height: 720 };

/**
 * PatternLibrary contains one method per bullet-attack "shape" (aimed shots,
 * rings, walls, spirals, etc). Every method schedules future bullet spawns
 * via `this.game.queue(time, fn)` — it does not spawn bullets immediately.
 *
 * WaveSystem composes these into full waves. To add a brand-new pattern:
 *   1. Add a method here that calls `this.game.queue(...)` and eventually
 *      `this.game.spawnBullet(...)`.
 *   2. Call it from WaveSystem.build()/buildBoss().
 */
export class PatternLibrary {
  constructor(game) {
    this.game = game;
  }

  /** Finds the nearest alive player to a point (falls back to player 1). */
  targetPlayer(x, y) {
    const alive = this.game.activePlayers().filter(p => p.isAlive());
    if (!alive.length) return this.game.players[0];
    return alive.reduce(
      (best, p) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best),
      alive[0]
    );
  }

  /** Picks a random point just outside one of the four arena edges. */
  sideSpawn() {
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return [Math.random() * WORLD.width, -20];                 // top
    if (side === 1) return [WORLD.width + 20, Math.random() * WORLD.height];   // right
    if (side === 2) return [Math.random() * WORLD.width, WORLD.height + 20];   // bottom
    return [-20, Math.random() * WORLD.height];                               // left
  }

  /** Bullets fired from the arena edges toward the nearest player, with slight spread. */
  aimed(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      const fire = () => {
        if (this.game.dangerAssistDelay()) {
          this.game.queue(this.game.state.waveTime + 0.10, fire);
          return;
        }
        const [x, y] = this.sideSpawn();
        const target = this.targetPlayer(x, y);
        const angle = Math.atan2(target.y - y, target.x - x) + (-0.3 + Math.random() * 0.6);
        this.game.spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 4 + Math.random() * 2, color);
      };
      this.game.queue(start + i * interval, fire);
    }
  }

  /** A ring of bullets exploding outward from (x, y), with a gap aimed at the player. */
  ring(start, x, y, count, speed, color) {
    const warnDuration = 0.95;
    const gapWidth = 0.34;
    let gapAngle = 0;

    // Lock the gap angle at telegraph time so the warning always matches
    // where the bullets actually spawn.
    this.game.queue(start - warnDuration, () => {
      const target = this.targetPlayer(x, y);
      gapAngle = Math.atan2(target.y - y, target.x - x);
      this.game.ringWarnings.push({ x, y, t: 0, duration: warnDuration, color, radius: 60, gapAngle, gapWidth });
    });

    this.game.queue(start, () => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const delta = Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle));
        if (Math.abs(delta) < gapWidth) continue; // skip bullets inside the gap
        this.game.spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, color);
      }
    });
  }

  /** A rotating multi-armed spiral of bullets from a fixed center point. */
  spiral(start, duration, arms, speed, color, cx = 640, cy = 360) {
    const steps = Math.floor(duration * 10);
    const interval = duration / Math.max(steps, 1);

    for (let i = 0; i < steps; i++) {
      const fire = () => {
        if (this.game.zone) {
          // Pause spiral emission while the shrinking safe-zone hazard is active.
          this.game.queue(this.game.state.waveTime + 0.12, fire);
          return;
        }
        const baseAngle = i * 0.25;
        for (let a = 0; a < arms; a++) {
          const angle = baseAngle + (Math.PI * 2 * a) / arms;
          this.game.spawnBullet(cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, color);
        }
      };
      this.game.queue(start + i * interval, fire);
    }
  }

  /** A wall of bullets from one edge, with a gap positioned near the player's lane. */
  wall(start, speed, color, vertical) {
    this.game.queue(start, () => {
      const alive = this.game.activePlayers().filter(p => p.isAlive());
      const player = alive.length ? alive[0] : null;
      const playerT = player ? (vertical ? player.x / 1280 : player.y / 720) : 0.15 + Math.random() * 0.7;
      const gap = Math.max(0.14, Math.min(0.86, playerT));
      const gapSize = 0.20;
      const segments = 22;

      for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        if (Math.abs(t - gap) < gapSize / 2) continue; // skip the gap
        if (vertical) this.game.spawnBullet(t * 1280, -20, 0, speed, 6, color);
        else this.game.spawnBullet(-20, t * 720, speed, 0, 6, color);
      }
    });
  }

  /** Bullets fired diagonally in from the top and left edges. */
  cross(start, count, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * 0.15, () => {
        this.game.spawnBullet(-20, Math.random() * 720, speed, -0.5 + Math.random(), 5, color);
        this.game.spawnBullet(Math.random() * 1280, -20, -0.5 + Math.random(), speed, 5, color);
      });
    }
  }

  /** Slow bullets that continuously steer toward their target. */
  homing(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      const fire = () => {
        if (this.game.dangerAssistDelay()) {
          this.game.queue(this.game.state.waveTime + 0.10, fire);
          return;
        }
        const [x, y] = this.sideSpawn();
        const target = this.targetPlayer(x, y);
        const angle = Math.atan2(target.y - y, target.x - x);
        this.game.spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 8, color);
      };
      this.game.queue(start + i * interval, fire);
    }
  }

  /** Bullets that split into a 6-way burst partway through their flight (see Game.update). */
  splitter(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      const fire = () => {
        if (this.game.dangerAssistDelay()) {
          this.game.queue(this.game.state.waveTime + 0.12, fire);
          return;
        }
        const [x, y] = this.sideSpawn();
        const target = this.targetPlayer(x, y);
        const angle = Math.atan2(target.y - y, target.x - x);
        this.game.spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 10, color, { splitter: true });
      };
      this.game.queue(start + i * interval, fire);
    }
  }

  /** Bullets that bounce off the arena walls a limited number of times. */
  bouncer(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const side = Math.floor(Math.random() * 4);
        let x, y, angle;
        if (side === 0) { x = Math.random() * 1280; y = -20; angle = 0.2 + Math.random() * 0.6; }
        else if (side === 1) { x = 1300; y = Math.random() * 720; angle = 0.7 + Math.random() * 0.6; }
        else if (side === 2) { x = Math.random() * 1280; y = 740; angle = 1.2 + Math.random() * 0.6; }
        else { x = -20; y = Math.random() * 720; angle = -0.3 + Math.random() * 0.6; }
        this.game.spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 6, color, { bounce: true, maxBounces: 3 });
      });
    }
  }

  /** A single telegraphed laser beam (horizontal or vertical) across the arena. */
  laser(start, color) {
    this.game.queue(start, () => {
      const orientation = Math.random() < 0.5 ? 'h' : 'v';
      const pos = orientation === 'h' ? 0.15 * 720 + Math.random() * 0.7 * 720 : 0.15 * 1280 + Math.random() * 0.7 * 1280;
      this.game.lasers.push({ orientation, pos, state: 'telegraph', t: 0, telegraphDur: 0.65, fireDur: 0.3, color, thickness: 10 });
    });
  }

  /** A series of lasers fired one after another. */
  laserBarrage(start, count, interval, color) {
    for (let i = 0; i < count; i++) this.laser(start + i * interval, color);
  }

  // --- Boss-only variants: same shapes, but centered on the boss position. ---

  /** Boss ring attack: bullets explode outward from the boss, with a gap aimed at the player. */
  bossRing(start, count, speed, color) {
    const warnDuration = 1.1;
    const gapWidth = 0.26;
    let gapAngle = 0;

    // Lock the gap angle at telegraph time so it can't move before firing.
    this.game.queue(start - warnDuration, () => {
      const target = this.targetPlayer(this.game.boss.x, this.game.boss.y);
      gapAngle = Math.atan2(target.y - this.game.boss.y, target.x - this.game.boss.x);
      this.game.ringWarnings.push({
        x: this.game.boss.x, y: this.game.boss.y, t: 0, duration: warnDuration,
        color, radius: 80, trackBoss: true, gapAngle, gapWidth
      });
    });

    this.game.queue(start, () => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const delta = Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle));
        if (Math.abs(delta) < gapWidth) continue;
        this.game.spawnBullet(this.game.boss.x, this.game.boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, color);
      }
    });
  }

  /** Boss spiral attack: a rotating multi-armed spiral centered on the boss. */
  bossSpiral(start, duration, arms, speed, color) {
    const steps = Math.floor(duration * 20);
    for (let i = 0; i < steps; i++) {
      this.game.queue(start + i * (duration / steps), () => {
        const baseAngle = i * 0.3;
        for (let a = 0; a < arms; a++) {
          const angle = baseAngle + (Math.PI * 2 * a) / arms;
          this.game.spawnBullet(this.game.boss.x, this.game.boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, color);
        }
      });
    }
  }

  /** Boss aimed attack: shots from the boss toward the nearest player. */
  bossAimed(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const target = this.targetPlayer(this.game.boss.x, this.game.boss.y);
        const angle = Math.atan2(target.y - this.game.boss.y, target.x - this.game.boss.x) + (-0.15 + Math.random() * 0.3);
        this.game.spawnBullet(this.game.boss.x, this.game.boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 7, color);
      });
    }
  }
}
