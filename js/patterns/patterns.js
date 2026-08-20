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

  /**
   * Spawns a boss projectile from the visible core edge instead of the boss
   * center. The boss position remains the single source of truth, while the
   * projectile starts just outside the core along its travel direction.
   * This keeps the firing point visually aligned with the W5 boss artwork
   * and prevents bullets from appearing to originate inside/off-center.
   */
  spawnBossBullet(angle, speed, radius, color, opts = {}) {
    const boss = this.game.boss;
    const offset = boss.r + radius + 2;
    const x = boss.x + Math.cos(angle) * offset;
    const y = boss.y + Math.sin(angle) * offset;
    this.game.spawnBullet(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      radius,
      color,
      opts
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
    // W1-4 ("Bullet Hell") only: the safe wedge is a persistent open cone
    // from the center outward, so even a modest angular width reads as very
    // forgiving at range. Trim it slightly for these waves; every other
    // wave that calls ring() keeps the original 0.28 rad untouched, and the
    // gap stays telegraphed/deterministic either way (never RNG).
    const gapWidth = this.game.isBulletHellWave() ? 0.28 * 0.8 : 0.28;
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
    const segments = vertical ? 61 : 35;
    const worldDim = vertical ? WORLD.width : WORLD.height;
    const isBulletHell = this.game.isBulletHellWave();

    // W1-4 ("Bullet Hell") only: pre-compute exactly how many *consecutive*
    // segments to skip (see bulletHellGapSkip below). Every other wave that
    // calls wall() (W5 boss included, W6+) is completely untouched and
    // keeps the original float-threshold gap->segment conversion further
    // down in this function, unchanged.
    const bulletHellSkipCount = isBulletHell
      ? this.bulletHellGapSkip(gap, worldDim, segments)
      : null;

    this.game.queue(start, () => {
      const alive = this.game.activePlayers().filter(p => p.isAlive());
      const player = alive.length ? alive[0] : null;
      const playerT = player ? (vertical ? player.x / 1280 : player.y / 720) : 0.15 + Math.random() * 0.7;
      const gapPos = Math.max(0.08, Math.min(0.92, playerT));

      if (isBulletHell) {
        // Exact, index-based gap: pick the segment index nearest gapPos and
        // skip a *fixed* window of `bulletHellSkipCount` consecutive
        // segments centered on it. Unlike the float-threshold check below,
        // the number of segments skipped never depends on where gapPos
        // happens to fall relative to the segment grid, so the physical
        // corridor between the two flanking (rendered) bullets always
        // matches what bulletHellGapSkip() computed — i.e. what the player
        // SEES between the bullets is exactly what they can collide-free
        // fly through. See bulletHellGapSkip() for the pixel math.
        const k = bulletHellSkipCount;
        const segCount = segments - 1;
        let startIdx = Math.round(gapPos * segCount) - Math.floor((k - 1) / 2);
        let endIdx = startIdx + k - 1;
        if (startIdx < 0) { endIdx += -startIdx; startIdx = 0; }
        if (endIdx > segCount) { startIdx -= endIdx - segCount; endIdx = segCount; }
        startIdx = Math.max(0, startIdx);

        for (let i = 0; i < segments; i++) {
          if (i >= startIdx && i <= endIdx) continue; // skip the gap
          const t = i / segCount;
          if (vertical) this.game.spawnBullet(t * 1280, -20, 0, speed, 6, color);
          else this.game.spawnBullet(-20, t * 720, speed, 0, 6, color);
        }
        return;
      }

      // Original conversion — unchanged for every wave except W1-4 above.
      // The opening is intentionally only a little wider than the real player
      // collision. Dense segments make the corridor tight instead of creating
      // a large 'safe lane'.
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

  /**
   * W1-4 only (see wall() above). Returns the exact number of *consecutive*
   * wall segments to skip so the real, physical corridor between the two
   * bullets flanking the gap is guaranteed to be at least as wide as
   * intended — fixing the previous bug where the float-threshold skip test
   * in wall() could end up skipping only 1 segment (a ~42px rendered gap,
   * but only ~11px a player's CENTER could actually fit through) regardless
   * of the gap fraction requested, i.e. a gap that looked passable but
   * wasn't ("ช่องหลอก").
   *
   * The math is derived directly from the real collision check
   * (collision.js circleHit uses a.r + b.r):
   *   TOUCH_R = PLAYER_R (10, CONFIG.player.radius)
   *           + WALL_BULLET_R (6, the radius wall() spawns bullets with)
   * If two flanking bullets are `corridorPx` apart (center-to-center), the
   * player's center can only occupy the middle `corridorPx - 2*TOUCH_R` of
   * that span without touching either one — that's the real, "can-you-
   * actually-walk-through-it" gap.
   *
   * Skipping `k` consecutive segments (spaced `spacing` px apart) always
   * leaves the two nearest surviving bullets exactly `(k+1) * spacing`
   * apart, with no rounding/threshold ambiguity — so this picks the
   * smallest k whose corridor clears the target, guaranteeing the visible
   * gap and the passable gap are the same width every time.
   */
  bulletHellGapSkip(gap, worldDim, segments) {
    const PLAYER_R = 10;       // matches CONFIG.player.radius
    const WALL_BULLET_R = 6;   // matches the bullet radius spawned in wall()
    const TOUCH_R = PLAYER_R + WALL_BULLET_R;

    const spacing = worldDim / (segments - 1);
    const originalCorridorPx = (gap ?? 0) * worldDim + spacing;

    // Target real clearance for the player's CENTER (~30px — inside the
    // ~34-42px goal range once rounded up to the nearest whole segment
    // spacing below; the exact figure varies slightly with vertical vs.
    // horizontal spacing, which is expected and not forced further).
    // TIGHTEN_FACTOR keeps the corridor scaling down from each wave's
    // original (much wider, pre-Bullet-Hell) design value instead of every
    // gap value jumping straight to the same floor.
    const TARGET_PASSABLE_PX = 30;
    const MIN_CORRIDOR_PX = TARGET_PASSABLE_PX + 2 * TOUCH_R;
    const TIGHTEN_FACTOR = 0.65;

    const targetCorridorPx = Math.max(MIN_CORRIDOR_PX, originalCorridorPx * TIGHTEN_FACTOR);
    // (k+1) segment spacings must cover the target corridor; never fully
    // close the lane (k >= 1).
    return Math.max(1, Math.ceil(targetCorridorPx / spacing) - 1);
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
            ? { trajectory: 'orbit', centerX: 640, centerY: 360, angle: a, radius, orbitSpeed, splitter: true, splitDelay: 0.85, splitCount: 8, splitSpeed: 3.5, maxAge: 2.5 }
            : { trajectory: 'orbit', centerX: 640, centerY: 360, angle: a, radius, orbitSpeed, maxAge: 4.0 }
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


  /**
   * LEGACY — spawns splitter bullets directly beside the player, which is
   * unreadable and hard to dodge. Replaced by edgeSplitter() everywhere.
   * Kept here so old call sites don't silently break if referenced elsewhere.
   */
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

  /**
   * Fires splitter projectiles from a random screen edge aimed at the nearest
   * player (with a small random spread). Each bullet is large and visible, then
   * splits into a 8-way burst after a short travel time. Unlike explodeNearPlayer,
   * the player always has time to see the bullet coming from the edge and dodge.
   *
   * Parameters match the signature of aimed()/homing() for easy substitution:
   *   start    — wave time (s) to fire the first shot
   *   count    — total number of projectiles
   *   interval — seconds between each shot
   *   speed    — travel speed (world units/s / 60)
   *   color    — bullet color
   */
  edgeSplitter(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      const fire = () => {
        if (this.game.dangerAssistDelay()) {
          this.game.queue(this.game.state.waveTime + 0.10, fire);
          return;
        }
        const [x, y] = this.sideSpawn();
        const target = this.targetPlayer(x, y);
        // Small random spread so consecutive shots aren't perfectly stacked.
        const spread = -0.18 + Math.random() * 0.36;
        const angle = Math.atan2(target.y - y, target.x - x) + spread;
        this.game.spawnBullet(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          9, color,
          { splitter: true, splitDelay: 0.75, splitCount: 8 }
        );
      };
      this.game.queue(start + i * interval, fire);
    }
  }


  bossPerimeterCrossfire(start, duration, count, interval, speed, color) {
    // W10 SIGNATURE — reworked:
    // 1. Telegraph: rectangle outline appears ~1s before.
    // 2. Boss fires one bullet per slot in rapid succession; each flies to
    //    its position on the rectangle and snaps in place.
    // 3. After all bullets have had time to arrive, they ALL fire toward the
    //    player simultaneously (no staggered release).
    //
    // Parameters:
    //   count    — number of bullets that form the rectangle
    //   interval — hold time (s) after the last bullet arrives before firing
    //   speed    — bullet speed when fired (velocity units; actual = speed * 5)

    const spawnStep = 0.045;               // seconds between each boss shot
    const flySpeed  = 13;                  // velocity units → 780 px/s
    const flightBuf = 0.8;                 // buffer for last bullet to arrive
    const holdTime  = Math.max(0.6, interval); // wait in formation before firing

    // Absolute wave time when all formation bullets fire.
    const fireTime = start + (count - 1) * spawnStep + flightBuf + holdTime;

    // ── 1. Telegraph ────────────────────────────────────────────────────────
    this.game.queue(Math.max(0, start - 1.0), () => {
      const view = this.game.renderer?.visibleWorldBounds?.() || WORLD;
      const margin = 22;
      const L = view.left  + margin;
      const R = view.right  - margin;
      const T = view.top    + margin;
      const B = view.bottom - margin;
      const cx = (L + R) / 2;
      const cy = (T + B) / 2;

      // Show the rectangle outline as a ring-warning so players can read
      // where the formation will appear before bullets start flying.
      this.game.ringWarnings.push({
        shape: 'square', x: cx, y: cy,
        width: R - L, height: B - T,
        t: 0,
        // Duration covers the full spawn+flight window so the outline stays
        // visible until the last bullet is in position.
        duration: 1.0 + (count - 1) * spawnStep + flightBuf,
        color
      });
    });

    // ── 2. Calculate positions then queue one spawn per slot ─────────────────
    this.game.queue(start, () => {
      const view = this.game.renderer?.visibleWorldBounds?.() || WORLD;
      const margin = 22;
      const L = view.left  + margin;
      const R = view.right  - margin;
      const T = view.top    + margin;
      const B = view.bottom - margin;
      const W = R - L;
      const H = B - T;
      const perimeter = 2 * (W + H);

      // Distribute formation slots evenly around the rectangle perimeter.
      for (let k = 0; k < count; k++) {
        const d = (k / count) * perimeter;
        let fx, fy;
        if      (d < W)          { fx = L + d;              fy = T; }
        else if (d < W + H)      { fx = R;                  fy = T + (d - W); }
        else if (d < 2 * W + H)  { fx = R - (d - W - H);   fy = B; }
        else                     { fx = L;                  fy = B - (d - 2*W - H); }

        // Queue each bullet to spawn from the boss at its staggered time.
        const spawnAt = this.game.state.waveTime + k * spawnStep;
        this.game.queue(spawnAt, () => {
          this.game.bullets.spawn(
            this.game.boss.x, this.game.boss.y,
            0, 0,
            6, color,
            {
              maxAge: Math.max(12, duration + 6),
              perimeterBullet: true,
              perimeterReleased: false,
              flyToX: fx,
              flyToY: fy,
              flyToSpeed: flySpeed,
            }
          );
        });
      }
    });

    // ── 3. Fire signal — all arrived formation bullets shoot at once ──────────
    this.game.queue(fireTime, () => {
      for (const b of this.game.bullets.items) {
        if (!b.perimeterBullet || b.perimeterReleased) continue;
        // Snap any still-in-flight stragglers to their target position.
        if (!b.flyToArrived) {
          b.x = b.flyToX;
          b.y = b.flyToY;
          b.flyToArrived = true;
        }
        // Each bullet aims at the player's current position.
        const t = this.targetPlayer(b.x, b.y);
        const angle = Math.atan2(t.y - b.y, t.x - b.x);
        b.vx = Math.cos(angle) * (speed * 5);
        b.vy = Math.sin(angle) * (speed * 5);
        b.perimeterReleased = true;
      }
    });
  }
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
        this.spawnBossBullet(angle, speed, 5, color);
      }
    });
  }

  /** Boss spiral attack: a rotating multi-armed spiral centered on the boss. */
  bossSpiral(start, duration, arms, speed, color) {
    const warnDuration = 0.8;
    this.game.queue(Math.max(0, start - warnDuration), () => {
      this.game.ringWarnings.push({
        x: this.game.boss.x,
        y: this.game.boss.y,
        t: 0,
        duration: warnDuration,
        color,
        radius: 72,
        trackBoss: true
      });
    });

    const fireStart = start;
    const steps = Math.floor(duration * 20);
    for (let i = 0; i < steps; i++) {
      this.game.queue(fireStart + i * (duration / steps), () => {
        const baseAngle = i * 0.3;
        for (let a = 0; a < arms; a++) {
          const angle = baseAngle + (Math.PI * 2 * a) / arms;
          this.spawnBossBullet(angle, speed, 5, color);
        }
      });
    }
  }
  bossAimed(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const target = this.targetPlayer(this.game.boss.x, this.game.boss.y);
        const angle = Math.atan2(target.y - this.game.boss.y, target.x - this.game.boss.x) + (-0.15 + Math.random() * 0.3);
        this.spawnBossBullet(angle, speed, 7, color);
      });
    }
  }

  /** Boss homing shots: slow, readable tracking projectiles used in later bosses. */
  bossHoming(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const target = this.targetPlayer(this.game.boss.x, this.game.boss.y);
        const angle = Math.atan2(target.y - this.game.boss.y, target.x - this.game.boss.x);
        this.spawnBossBullet(angle, speed, 7, color, { homing: true, homingStrength: 0.018 });
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
    // Game never exposes `world`/`canvas` properties, so this always fell
    // through to the 1280x720 literals anyway. Use the same WORLD constant
    // already relied on elsewhere in this file (see sideSpawn/orbitBurst)
    // instead of dead optional-chaining onto properties that don't exist.
    const W = WORLD.width;
    const H = WORLD.height;
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
