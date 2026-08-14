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
    const gapWidth = 0.28;
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
    // Telegraph first: the warning is visible before the spiral releases.
    // Reuses the game's existing warning renderer so it stays consistent
    // with Ring/Laser telegraphs.
    const warningDuration = 0.9;
    this.game.queue(start, () => {
      this.game.ringWarnings.push({
        x: cx,
        y: cy,
        radius: 58,
        color,
        t: 0,
        duration: warningDuration,
      });
    });

    const fireStart = start + warningDuration;
    const steps = Math.floor(duration * 10);
    const interval = duration / Math.max(steps, 1);

    for (let i = 0; i < steps; i++) {
      const fire = () => {
        const baseAngle = i * 0.25;
        for (let a = 0; a < arms; a++) {
          const angle = baseAngle + (Math.PI * 2 * a) / arms;
          this.game.spawnBullet(
            cx, cy,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            5,
            color
          );
        }
      };
      this.game.queue(fireStart + i * interval, fire);
    }
  }
  wall(start, speed, color, vertical, gap = null) {
    this.game.queue(start, () => {
      const alive = this.game.activePlayers().filter(p => p.isAlive());
      const player = alive.length ? alive[0] : null;
      const playerT = player ? (vertical ? player.x / 1280 : player.y / 720) : 0.15 + Math.random() * 0.7;
      const gapPos = Math.max(0.08, Math.min(0.92, playerT));
      // The opening is intentionally only a little wider than the real player
      // collision. Dense segments make the corridor tight instead of creating
      // a large 'safe lane'.
      const segments = vertical ? 61 : 35;
      // `gap` is a fraction of the wall span. Convert it to a segment count
      // so values such as 0.06 consistently create a real player-sized route.
      const gapSize = gap != null
        ? Math.max(2 / segments, gap * segments)
        : 2;

      for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        if (Math.abs(t - gapPos) < gapSize / 2 / segments) continue; // skip the gap
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


  // --- Trajectory variants ----------------------------------------------------
  // Reusable flight-path modifiers for Bullet Hell variety.
  sineRain(start, count, interval, speed, amplitude, frequency, color, fromTop = true) {
    for (let i = 0; i < count; i++) this.game.queue(start + i * interval, () => {
      const x0 = (i / Math.max(1, count - 1)) * 1280;
      const y0 = fromTop ? -18 : 738, dir = fromTop ? 1 : -1;
      this.game.spawnBullet(x0, y0, 0, dir * speed, 5, color,
        { trajectory: 'sine', originX: x0, amplitude, frequency, dir });
    });
  }

  accelerateRain(start, count, interval, startSpeed, accel, color, fromTop = true) {
    for (let i = 0; i < count; i++) this.game.queue(start + i * interval, () => {
      const x = Math.random() * 1280, y = fromTop ? -18 : 738, dir = fromTop ? 1 : -1;
      this.game.spawnBullet(x, y, 0, dir * startSpeed, 5, color,
        { trajectory: 'accelerate', accel, dir });
    });
  }

  stopAndGo(start, count, interval, speed, stopAfter, pause, color, fromTop = true) {
    for (let i = 0; i < count; i++) this.game.queue(start + i * interval, () => {
      const x = Math.random() * 1280, y = fromTop ? -18 : 738, dir = fromTop ? 1 : -1;
      this.game.spawnBullet(x, y, 0, dir * speed, 5, color,
        { trajectory: 'stopGo', stopAfter, pause, dir, resumeSpeed: speed });
    });
  }

  reverseRain(start, count, interval, speed, reverseAfter, color, fromTop = true) {
    for (let i = 0; i < count; i++) this.game.queue(start + i * interval, () => {
      const x = Math.random() * 1280, y = fromTop ? -18 : 738, dir = fromTop ? 1 : -1;
      this.game.spawnBullet(x, y, 0, dir * speed, 5, color,
        { trajectory: 'reverse', reverseAfter, dir });
    });
  }

  orbitBurst(start, count, interval, radius, orbitSpeed, releaseSpeed, color, split = true) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const a = (Math.PI * 2 * i) / Math.max(1, count);
        this.game.spawnBullet(
          640 + Math.cos(a) * radius,
          360 + Math.sin(a) * radius,
          Math.cos(a) * releaseSpeed,
          Math.sin(a) * releaseSpeed,
          5,
          color,
          split
            ? { trajectory: 'orbit', centerX: 640, centerY: 360, angle: a, radius, orbitSpeed, splitter: true, splitDelay: 0.85, splitCount: 8 }
            : { trajectory: 'orbit', centerX: 640, centerY: 360, angle: a, radius, orbitSpeed }
        );
      });
    }
  }
  curvingSplit(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) this.game.queue(start + i * interval, () => {
      const x = i % 2 === 0 ? -18 : 1298;
      const y = 70 + (i / Math.max(1, count - 1)) * 580;
      const target = this.targetPlayer(x, y);
      const angle = Math.atan2(target.y - y, target.x - x);
      this.game.spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 8, color,
        { splitter: true, curve: 0.004 * (i % 2 ? -1 : 1) });
    });
  }


  explodeNearPlayer(start, count, interval, radius, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const p = this.targetPlayer(640, 360);
        const a = (Math.PI * 2 * i) / Math.max(1, count);
        const r = radius + ((i * 17) % 31);
        const x = Math.max(18, Math.min(1262, p.x + Math.cos(a) * r));
        const y = Math.max(18, Math.min(702, p.y + Math.sin(a) * r));
        const angle = a + Math.PI + ((i % 3) - 1) * 0.18;
        this.game.spawnBullet(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          6, color,
          { splitter: true, splitDelay: 0.65, splitCount: 6 }
        );
      });
    }
  }

  // --- Boss-only variants: same shapes, but centered on the boss position. ---

  /** Boss ring attack: bullets explode outward from the boss, with a gap aimed at the player. */
  bossRing(start, count, speed, color) {
    const warnDuration = 1.1;
    const gapWidth = 0.22;
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

  /** Boss homing shots: slow, readable tracking projectiles used in later bosses. */
  bossHoming(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const target = this.targetPlayer(this.game.boss.x, this.game.boss.y);
        const angle = Math.atan2(target.y - this.game.boss.y, target.x - this.game.boss.x);
        this.game.spawnBullet(this.game.boss.x, this.game.boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 7, color, { homing: true, homingStrength: 0.018 });
      });
    }
  }
  // ================================================================
  // W6 NEW PATTERNS
  //
  // 1. machineGunTop  = rapid top-down aimed stream ("someone firing a gun")
  // 2. diagonalRain   = dense diagonal full-screen projectile field
  // 3. crossfire      = alternating left/right crossing volleys
  // 4. delayedBurst   = delayed warning points that explode outward later
  // 5. movingSweep    = repeated dense horizontal sweeps with moving gaps
  // 6. ricochetField  = bullets enter from edges and bounce back into arena
  //
  // W6 intentionally uses these as the main gameplay language. Existing
  // patterns are only used sparingly as connective pressure.
  // ================================================================

  machineGunTop(start, shots, interval, speed, spread, color) {
    const offsets = [-32, -20, -8, 8, 20, 32];
    for (let i = 0; i < shots; i++) {
      this.game.queue(start + i * interval, () => {
        const target = this.targetPlayer(640, 0);
        // Tight deterministic spread: still reads as one machine-gun stream,
        // but is no longer a perfectly straight laser line.
        const offset = offsets[i % offsets.length];
        const x = target.x + offset;
        const y = -24;
        const angle = Math.atan2(target.y - y, target.x - x);

        this.game.spawnBullet(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          5, color,
          { maxAge: 8 }
        );
      });
    }
  }

  diagonalRain(start, volleys, interval, count, speed, color, reverse = false) {
    for (let i = 0; i < volleys; i++) {
      this.game.queue(start + i * interval, () => {
        const offset = ((i * 0.17) % 1.0) * 260;
        for (let k = 0; k < count; k++) {
          const x = ((k / Math.max(1, count - 1)) * 1280 + offset) % 1280;
          const y = reverse ? 740 : -20;
          const vx = reverse ? -speed : speed;
          const vy = reverse ? -speed * 0.28 : speed * 0.28;
          this.game.spawnBullet(x, y, vx, vy, 5, color, { maxAge: 7 });
        }
      });
    }
  }

  crossfire(start, bursts, interval, count, speed, color) {
    for (let i = 0; i < bursts; i++) {
      this.game.queue(start + i * interval, () => {
        const shift = ((i % 4) - 1.5) * 0.08;

        // Cover the entire 720px map height. The safe route is created by
        // the crossing geometry itself, not by leaving empty top/bottom zones.
        const laneSpan = 720;
        const laneInset = 18;

        for (let k = 0; k < count; k++) {
          const t = k / Math.max(1, count - 1);
          const y = laneInset + t * (laneSpan - laneInset * 2);
          const leftAngle = shift + 0.05;
          const rightAngle = Math.PI - shift - 0.05;

          this.game.spawnBullet(
            -24, y,
            Math.cos(leftAngle) * speed,
            Math.sin(leftAngle) * speed,
            5, color,
            { maxAge: 11 }
          );

          this.game.spawnBullet(
            1304, y,
            Math.cos(rightAngle) * speed,
            Math.sin(rightAngle) * speed,
            5, color,
            { maxAge: 11 }
          );
        }
      });
    }
  }

  delayedBurst(start, count, interval, delay, shards, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const x = 120 + ((i * 233) % 1040);
        const y = 80 + ((i * 149) % 560);

        // Telegraph marker is represented by a tiny stationary bullet.
        // It expires before the actual burst.
        this.game.spawnBullet(x, y, 0, 0, 4, color, { maxAge: delay });

        this.game.queue(this.game.state.waveTime + delay, () => {
          for (let k = 0; k < shards; k++) {
            const a = Math.PI * 2 * k / shards;
            this.game.spawnBullet(
              x, y,
              Math.cos(a) * speed,
              Math.sin(a) * speed,
              5, color, { maxAge: 6 }
            );
          }
        });
      });
    }
  }

  movingSweep(start, count, interval, speed, color, vertical = false) {
    const W = this.game.world?.width ?? this.game.canvas?.width ?? 1280;
    const H = this.game.world?.height ?? this.game.canvas?.height ?? 720;
    const playerRadius = this.game.activePlayers?.()[0]?.r ?? 10;
    const wallRadius = 6;
    // Slightly wider than the real collision diameter, but still a tight lane.
    const gapSize = playerRadius * 2 + wallRadius * 2 + 6;

    const gapRatios = vertical
      ? [0.25, 0.50, 0.75, 0.35, 0.65, 0.45]
      : [0.30, 0.58, 0.76, 0.42, 0.68, 0.52];

    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const ratio = gapRatios[i % gapRatios.length];
        const span = vertical ? W : H;
        const gapCenter = Math.max(
          gapSize / 2 + 2,
          Math.min(span - gapSize / 2 - 2, span * ratio)
        );

        // Adjacent pieces overlap slightly, so there are no accidental holes.
        const spacing = wallRadius * 2.35;
        const segments = Math.ceil(span / spacing) + 1;

        for (let k = 0; k < segments; k++) {
          const along = Math.min(span, k * spacing);
          if (Math.abs(along - gapCenter) <= gapSize / 2) continue;

          if (vertical) {
            this.game.spawnBullet(
              along, -wallRadius,
              0, speed,
              wallRadius, color,
              { maxAge: 7, wall: true }
            );
          } else {
            this.game.spawnBullet(
              -wallRadius, along,
              speed, 0,
              wallRadius, color,
              { maxAge: 7, wall: true }
            );
          }
        }
      });
    }
  }

  ricochetField(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const side = i % 4;
        let x, y, angle;

        if (side === 0) {
          x = -20; y = 80 + (i * 137) % 560;
          angle = -0.15 + (i % 7) * 0.06;
        } else if (side === 1) {
          x = 1300; y = 80 + (i * 173) % 560;
          angle = Math.PI + 0.15 - (i % 7) * 0.06;
        } else if (side === 2) {
          x = 100 + (i * 197) % 1080; y = -20;
          angle = Math.PI / 2 + (-0.45 + (i % 7) * 0.15);
        } else {
          x = 100 + (i * 211) % 1080; y = 740;
          angle = -Math.PI / 2 + (-0.45 + (i % 7) * 0.15);
        }

        this.game.spawnBullet(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          5, color,
          { bounce: true, maxBounces: 2, maxAge: 8 }
        );
      });
    }
  }


}
