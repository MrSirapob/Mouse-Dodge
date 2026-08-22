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
   * Nudges a spawn point (x, y) outward so it stays at least `minDist` away
   * from every currently alive player, then clamps to the arena bounds.
   * Used by patterns whose spawn point is intentionally derived from a
   * player's own position (SHADOW family) or a fixed point players can end
   * up standing on top of (e.g. VOID center-bursts) — without this, those
   * patterns can spawn a bullet effectively on top of the player with zero
   * travel time to react. Preserves the pattern's original direction from
   * the player when possible; if the point exactly coincides with a player,
   * falls back to a fixed offset direction so the nudge is still visible.
   */
  enforceMinPlayerDistance(x, y, minDist = 110) {
    for (const p of this.game.activePlayers()) {
      if (!p.isAlive()) continue;
      let dx = x - p.x;
      let dy = y - p.y;
      let d = Math.hypot(dx, dy);
      if (d < minDist) {
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        const k = minDist / d;
        x = p.x + dx * k;
        y = p.y + dy * k;
      }
    }
    return [Math.max(18, Math.min(WORLD.width - 18, x)), Math.max(18, Math.min(WORLD.height - 18, y))];
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
  /**
   * Boss nova attack: `pulses` full-ring shockwaves fired outward from the
   * boss at evenly-spaced intervals across `duration`. Unlike bossSpiral()
   * (a single continuous stream of rotating arms), each pulse here is an
   * instantaneous, telegraphed full circle of `count` bullets — alternating
   * pulses are rotated by half a slice so consecutive rings don't share the
   * same "lane", and each successive pulse is fired a little faster than
   * the last (expanding-shockwave feel). Added so W10 has its own signature
   * sustained-pressure tool instead of reusing W5's bossSpiral() — see
   * waveSystem.js buildBoss() n===10 for why.
   */
  bossNova(start, duration, pulses, count, speed, color) {
    const warnDuration = 0.5;
    const pulseInterval = pulses > 1 ? duration / pulses : duration;

    for (let i = 0; i < pulses; i++) {
      const pulseStart = start + i * pulseInterval;
      const pulseSpeed = speed * (1 + i * 0.06);

      this.game.queue(Math.max(0, pulseStart - warnDuration), () => {
        this.game.ringWarnings.push({
          x: this.game.boss.x,
          y: this.game.boss.y,
          t: 0,
          duration: warnDuration,
          color,
          radius: 64,
          trackBoss: true
        });
      });

      this.game.queue(pulseStart, () => {
        const offset = (i % 2) * (Math.PI / count);
        for (let a = 0; a < count; a++) {
          const angle = offset + (Math.PI * 2 * a) / count;
          this.spawnBossBullet(angle, pulseSpeed, 5, color);
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
  // W11-15 NEW ACT PATTERNS
  // These patterns are intentionally different from the W1-10 toolkit:
  // VOID = attraction/black-hole geometry, GRAVITY = altered trajectories,
  // SHADOW = replay of recent player positions, COLLAPSE = shrinking lanes.
  // ================================================================

  // `x`/`y` are only the *fallback* anchor (used before any player exists).
  // The vortex is actually re-centered on the nearest player once when it
  // opens, so the swirl always sits somewhere the player has to deal with —
  // previously it sat at a fixed point unrelated to the player, and a player
  // who simply stayed away from that one spot never had to interact with it
  // at all.
  voidWell(start, count, interval, x, y, speed, pull, color) {
    let cx = x, cy = y, locked = false;
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        if (!locked) {
          locked = true;
          const target = this.targetPlayer(x, y);
          // Offset away from the arena center so the vortex forms just to
          // one side of the player (reactable) instead of on top of them.
          const ax = target.x - WORLD.width / 2, ay = target.y - WORLD.height / 2;
          const am = Math.hypot(ax, ay) || 1;
          [cx, cy] = this.enforceMinPlayerDistance(
            target.x + (ax / am) * 200, target.y + (ay / am) * 200, 150
          );
        }
        const a = (Math.PI * 2 * i) / Math.max(1, count);
        const r = 250 + (i % 3) * 70;
        const sx = cx + Math.cos(a) * r;
        const sy = cy + Math.sin(a) * r;
        const angle = Math.atan2(sy - cy, sx - cx);
        this.game.spawnBullet(sx, sy, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, color, {
          maxAge: 8, trajectory: 'gravityWell', gravityX: cx, gravityY: cy, gravityStrength: pull
        });
      });
    }
  }

  // Same fix as voidWell: each pulse re-centers on the nearest player (with
  // a short telegraph) instead of bursting at a fixed point the player can
  // just stand far away from.
  voidPulse(start, pulses, interval, x, y, count, speed, pull, color) {
    const warnDuration = 0.35;
    for (let p = 0; p < pulses; p++) {
      let px = x, py = y;
      this.game.queue(start + p * interval - warnDuration, () => {
        const target = this.targetPlayer(x, y);
        [px, py] = this.enforceMinPlayerDistance(target.x, target.y, 90);
        this.game.ringWarnings.push({ x: px, y: py, t: 0, duration: warnDuration, color, radius: 45 });
      });
      this.game.queue(start + p * interval, () => {
        for (let i = 0; i < count; i++) {
          const a = Math.PI * 2 * i / count + (p % 2) * Math.PI / count;
          const r = 45;
          const sx = px + Math.cos(a) * r;
          const sy = py + Math.sin(a) * r;
          this.game.spawnBullet(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, {
            maxAge: 8, trajectory: 'gravityWell', gravityX: px, gravityY: py, gravityStrength: pull
          });
        }
      });
    }
  }

  gravityRain(start, count, interval, speed, gx, gy, strength, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const x = 70 + ((i * 173) % 1140);
        const y = -20;
        const angle = Math.atan2(gy - y, gx - x);
        this.game.spawnBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, color, {
          maxAge: 8, trajectory: 'gravityWell', gravityX: gx, gravityY: gy, gravityStrength: strength
        });
      });
    }
  }

  gravityFlip(start, count, interval, speed, flipAfter, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const x = 60 + ((i * 197) % 1160);
        this.game.spawnBullet(x, -24, 0, speed, 5, color, {
          maxAge: 8, trajectory: 'gravityFlip', dir: 1, flipAfter
        });
      });
    }
  }

  gravityCross(start, bursts, interval, count, speed, strength, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const gx = b % 2 ? 980 : 300;
        const gy = b % 2 ? 500 : 220;
        for (let i = 0; i < count; i++) {
          const side = i % 4;
          let x, y;
          if (side === 0) { x = -20; y = 70 + (i * 83) % 580; }
          else if (side === 1) { x = 1300; y = 70 + (i * 97) % 580; }
          else if (side === 2) { x = 70 + (i * 113) % 1140; y = -20; }
          else { x = 70 + (i * 127) % 1140; y = 740; }
          const a = Math.atan2(gy - y, gx - x);
          this.game.spawnBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, {
            maxAge: 8, trajectory: 'gravityWell', gravityX: gx, gravityY: gy, gravityStrength: strength
          });
        }
      });
    }
  }

  shadowEcho(start, duration, interval, delaySteps, speed, color) {
    const steps = Math.floor(duration / interval);
    for (let i = 0; i < steps; i++) {
      this.game.queue(start + i * interval, () => {
        for (const p of this.game.activePlayers()) {
          const trail = p.trail || [];
          const idx = Math.max(0, trail.length - 1 - delaySteps);
          const pos = trail.length ? trail[idx] : { x: p.x, y: p.y };
          const a = Math.atan2(pos.y - WORLD.height / 2, pos.x - WORLD.width / 2);
          const [sx, sy] = this.enforceMinPlayerDistance(pos.x + Math.cos(a) * 110, pos.y + Math.sin(a) * 110, 110);
          const target = this.targetPlayer(sx, sy);
          const fireAngle = Math.atan2(target.y - sy, target.x - sx);
          this.game.spawnBullet(sx, sy, Math.cos(fireAngle) * speed, Math.sin(fireAngle) * speed, 5, color, { maxAge: 6 });
        }
      });
    }
  }

  shadowTrail(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        for (const p of this.game.activePlayers()) {
          const trail = p.trail || [];
          const pos = trail.length ? trail[Math.max(0, trail.length - 1 - (i % 10))] : { x: p.x, y: p.y };
          const a = (i % 2 ? Math.PI / 2 : -Math.PI / 2) + ((i % 5) - 2) * 0.08;
          const [sx, sy] = this.enforceMinPlayerDistance(pos.x + Math.cos(a) * 95, pos.y + Math.sin(a) * 95, 95);
          this.game.spawnBullet(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 6 });
        }
      });
    }
  }

  shadowCross(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        for (const p of this.game.activePlayers()) {
          const trail = p.trail || [];
          const pos = trail.length ? trail[Math.max(0, trail.length - 1 - ((i + 5) % 12))] : { x: p.x, y: p.y };
          const mirrorX = WORLD.width - pos.x;
          const mirrorY = WORLD.height - pos.y;
          const a = Math.atan2(mirrorY - pos.y, mirrorX - pos.x);
          const [sx, sy] = this.enforceMinPlayerDistance(pos.x + Math.cos(a) * 120, pos.y + Math.sin(a) * 120, 120);
          this.game.spawnBullet(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 6 });
        }
      });
    }
  }

  closingLanes(start, count, interval, speed, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const inset = 18 + i * 9;
        const gap = 90 - Math.min(45, i * 4);
        const mid = WORLD.height * (0.3 + (i % 5) * 0.1);
        for (let y = inset; y < WORLD.height - inset; y += 24) {
          if (Math.abs(y - mid) < gap) continue;
          this.game.spawnBullet(-10 - inset, y, speed, 0, 5, color, { maxAge: 2.8, wall: true });
          this.game.spawnBullet(WORLD.width + 10 + inset, y, -speed, 0, 5, color, { maxAge: 2.8, wall: true });
        }
      });
    }
  }

  collapseCross(start, pulses, interval, speed, color) {
    for (let i = 0; i < pulses; i++) {
      this.game.queue(start + i * interval, () => {
        const inset = 35 + i * 22;
        for (let x = inset; x <= WORLD.width - inset; x += 28) {
          this.game.spawnBullet(x, -10, 0, speed, 5, color, { maxAge: 2.8, wall: true });
          this.game.spawnBullet(x, WORLD.height + 10, 0, -speed, 5, color, { maxAge: 2.8, wall: true });
        }
        for (let y = inset; y <= WORLD.height - inset; y += 28) {
          this.game.spawnBullet(-10, y, speed, 0, 5, color, { maxAge: 2.8, wall: true });
          this.game.spawnBullet(WORLD.width + 10, y, -speed, 0, 5, color, { maxAge: 2.8, wall: true });
        }
      });
    }
  }

  movingSafeGap(start, count, interval, speed, color) {
    const gaps = [0.25, 0.48, 0.72, 0.38, 0.62, 0.82];
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        const gapX = WORLD.width * gaps[i % gaps.length];
        for (let y = 0; y <= WORLD.height; y += 24) {
          if (Math.abs(y - WORLD.height * 0.5) < 52) {
            const x = gapX + (y - WORLD.height * 0.5) * 0.35;
            this.game.spawnBullet(x, y, 0, speed, 5, color, { maxAge: 2.8, wall: true });
            continue;
          }
          this.game.spawnBullet(-8, y, speed, 0, 5, color, { maxAge: 2.8, wall: true });
        }
      });
    }
  }

  ritualRing(start, count, speed, gapAngle, color) {
    const warnDuration = 0.8;
    this.game.queue(Math.max(0, start - warnDuration), () => {
      this.game.ringWarnings.push({ x: this.game.boss?.x ?? WORLD.width/2, y: this.game.boss?.y ?? WORLD.height/2, t: 0, duration: warnDuration, color, radius: 86, trackBoss: true, gapAngle, gapWidth: 0.2 });
    });
    this.game.queue(start, () => {
      const cx = this.game.boss?.x ?? WORLD.width/2;
      const cy = this.game.boss?.y ?? WORLD.height/2;
      for (let i = 0; i < count; i++) {
        const a = Math.PI * 2 * i / count;
        const delta = Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle));
        if (Math.abs(delta) < 0.2) continue;
        this.spawnBossBullet(a, speed, 5, color);
      }
    });
  }

  ritualSeal(start, seals, interval, count, speed, color) {
    for (let s = 0; s < seals; s++) {
      this.game.queue(start + s * interval, () => {
        const a0 = s * Math.PI * 2 / seals;
        const x = WORLD.width/2 + Math.cos(a0) * 220;
        const y = WORLD.height/2 + Math.sin(a0) * 220;
        for (let i = 0; i < count; i++) {
          const a = a0 + (i - count/2) * 0.045;
          this.game.spawnBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 8 });
        }
      });
    }
  }

  // ================================================================
  // W11-15 SUPPORT PATTERNS — second pass: five distinct signatures per wave.
  // These deliberately do not reuse the W1-10 signature families.
  // ================================================================

  // Horizontal streams travel edge-to-edge, each locked to one lane height
  // (`cy`). The old lane heights only spanned 22%-76% of the arena height,
  // so the strip near the very top and very bottom wall was never in any
  // lane's path — camping right up against the top/bottom edge dodged this
  // pattern entirely regardless of anything else in the wave. Spreading
  // the lanes across 8%-92% (and scaling to however many bursts are passed
  // in, rather than a hardcoded 4) keeps that same near-the-wall strip
  // covered too.
  voidLane(start, bursts, interval, count, speed, color) {
    const laneSlots = Math.max(2, Math.min(bursts, 6));
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const cy = WORLD.height * (0.08 + (b % laneSlots) * (0.84 / (laneSlots - 1)));
        for (let i = 0; i < count; i++) {
          const y = cy + (i - count / 2) * 12;
          const x = i % 2 ? WORLD.width + 20 : -20;
          const dir = x < 0 ? 1 : -1;
          this.game.spawnBullet(x, y, dir * speed, 0, 5, color, {
            maxAge: 7, trajectory: 'gravityWell', gravityX: WORLD.width / 2, gravityY: cy, gravityStrength: 0.035
          });
        }
      });
    }
  }

  // A ring of bullets spawns on the arena rim around (x, y) and collapses
  // inward on that same point. If a player is standing near (x, y) when it
  // closes there was previously no gap anywhere in the ring — an
  // unavoidable hit. Telegraph the ring shortly before it fires and leave a
  // gap locked onto whichever direction the nearest player is standing in,
  // same contract as ring()/voidBlackout(), so there's always an open lane
  // out before the ring finishes closing.
  //
  // Reach: the old fixed 330px spawn radius only ever covered the middle
  // ~660x660 of a 1280x720 arena — a player standing anywhere near the
  // walls/corners was geometrically outside the ring's reach the entire
  // time, no dodging required (user-reported, "ออกไปขอบจอก็รอดสบายๆ").
  // Spawning on a radius that reaches past the arena's own corners means
  // every pulse sweeps the whole play space on its way in, corners
  // included, not just the center.
  voidCollapse(start, pulses, interval, count, speed, x, y, color) {
    const warnDuration = 0.6;
    const gapWidth = 0.5;
    const ringRadius = Math.hypot(WORLD.width, WORLD.height) / 2 + 40; // past every corner
    for (let p = 0; p < pulses; p++) {
      let gapAngle = 0;
      this.game.queue(start + p * interval - warnDuration, () => {
        const target = this.targetPlayer(x, y);
        gapAngle = Math.atan2(target.y - y, target.x - x);
        this.game.ringWarnings.push({ x, y, t: 0, duration: warnDuration, color, radius: ringRadius, gapAngle, gapWidth });
      });
      this.game.queue(start + p * interval, () => {
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 * i) / count + (p % 2) * 0.08;
          const delta = Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle));
          if (Math.abs(delta) < gapWidth) continue; // leave an escape lane toward the player
          const sx = x + Math.cos(a) * ringRadius;
          const sy = y + Math.sin(a) * ringRadius;
          const angle = Math.atan2(y - sy, x - sx);
          this.game.spawnBullet(sx, sy, Math.cos(angle) * speed, Math.sin(angle) * speed, 5, color, {
            maxAge: 8, trajectory: 'gravityWell', gravityX: x, gravityY: y, gravityStrength: 0.065
          });
        }
      });
    }
  }

  // Two streams converge from opposite origins toward the arena center.
  // The old fixed origins, (300,180)/(980,540), were interior quadrant
  // points, not the actual corners — a player parked in either of the
  // *other* two corners (or hugging a wall far from those two spots) was
  // never in either stream's path. Firing from the true corners instead,
  // and rotating which diagonal pair fires each burst, means every corner
  // gets swept by this pattern at some point instead of two of them being
  // permanently outside it.
  voidSplit(start, bursts, interval, count, speed, color) {
    const CORNERS = [
      [-20, -20], [WORLD.width + 20, -20],
      [WORLD.width + 20, WORLD.height + 20], [-20, WORLD.height + 20],
    ]; // TL, TR, BR, BL
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const centers = [CORNERS[b % 4], CORNERS[(b + 2) % 4]]; // opposite corners
        for (let c = 0; c < centers.length; c++) {
          const [x, y] = centers[c];
          for (let i = 0; i < count; i++) {
            const a = Math.atan2(WORLD.height / 2 - y, WORLD.width / 2 - x) + (i - count / 2) * 0.055;
            this.game.spawnBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, {
              maxAge: 7, trajectory: 'gravityWell', gravityX: WORLD.width / 2, gravityY: WORLD.height / 2, gravityStrength: 0.045
            });
          }
        }
      });
    }
  }

  voidBlackout(start, pulses, interval, count, speed, color) {
    // Rays originate at the exact arena center — if a player happens to be
    // standing there when this fires, an untelegraphed, un-aimed gap makes
    // it a coin-flip whether they're even facing the right way in time.
    // Telegraph it and lock the gap onto the nearest player's direction at
    // warning time, same contract as ring()/ritualRing().
    const warnDuration = 0.7;
    const cx = WORLD.width / 2, cy = WORLD.height / 2;
    for (let p = 0; p < pulses; p++) {
      let gap = (p % 4) * (Math.PI / 2);
      this.game.queue(start + p * interval - warnDuration, () => {
        const target = this.targetPlayer(cx, cy);
        gap = Math.atan2(target.y - cy, target.x - cx);
        this.game.ringWarnings.push({ x: cx, y: cy, t: 0, duration: warnDuration, color, radius: 90, gapAngle: gap, gapWidth: 0.32 });
      });
      this.game.queue(start + p * interval, () => {
        for (let i = 0; i < count; i++) {
          const a = Math.PI * 2 * i / count;
          const d = Math.atan2(Math.sin(a - gap), Math.cos(a - gap));
          if (Math.abs(d) < 0.32) continue;
          this.game.spawnBullet(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 7 });
        }
      });
    }
  }

  gravitySnap(start, bursts, interval, count, speed, flipAfter, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const y = b % 2 ? WORLD.height + 20 : -20;
        const dir = y < 0 ? 1 : -1;
        for (let i = 0; i < count; i++) {
          const x = 60 + ((i * 151 + b * 83) % 1160);
          this.game.spawnBullet(x, y, 0, dir * speed, 5, color, {
            maxAge: 8, trajectory: 'gravityFlip', flipAfter: flipAfter
          });
        }
      });
    }
  }

  gravityExchange(start, bursts, interval, count, speed, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        for (let i = 0; i < count; i++) {
          const fromTop = (i + b) % 2 === 0;
          const x = 40 + ((i * 97 + b * 61) % 1200);
          const y = fromTop ? -18 : WORLD.height + 18;
          const dir = fromTop ? 1 : -1;
          const gx = WORLD.width * (0.25 + ((i + b) % 3) * 0.25);
          this.game.spawnBullet(x, y, 0, dir * speed, 5, color, {
            maxAge: 8, trajectory: 'gravityWell', gravityX: gx, gravityY: WORLD.height / 2, gravityStrength: 0.075
          });
        }
      });
    }
  }

  gravitySnapLine(start, bursts, interval, count, speed, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const x = WORLD.width * (0.18 + (b % 5) * 0.16);
        for (let i = 0; i < count; i++) {
          const y = 40 + i * ((WORLD.height - 80) / Math.max(1, count - 1));
          const dir = i % 2 ? -1 : 1;
          this.game.spawnBullet(x, y, dir * speed, 0, 5, color, {
            maxAge: 8, trajectory: 'gravityFlip', flipAfter: 0.9 + (b % 3) * 0.25
          });
        }
      });
    }
  }

  gravityWellChain(start, bursts, interval, count, speed, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const gx = 180 + (b % 5) * 230;
        const gy = b % 2 ? 520 : 200;
        for (let i = 0; i < count; i++) {
          const y = 60 + (i * 113) % 600;
          const x = i % 2 ? WORLD.width + 20 : -20;
          const a = Math.atan2(gy - y, gx - x);
          this.game.spawnBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, {
            maxAge: 8, trajectory: 'gravityWell', gravityX: gx, gravityY: gy, gravityStrength: 0.06
          });
        }
      });
    }
  }

  shadowFreeze(start, pulses, interval, count, speed, color) {
    // Bursts outward from wherever the player was standing at telegraph
    // time — fair because the burst point is *locked in* when the warning
    // ring appears (not re-read at fire time), so moving away from that
    // marked spot during `warnDuration` genuinely dodges it, the same
    // contract ring()/ritualRing() already use for their telegraphs.
    const warnDuration = Math.min(0.45, interval * 0.5);
    for (let b = 0; b < pulses; b++) {
      const locked = new Map(); // playerId -> {x, y} captured at telegraph time
      this.game.queue(start + b * interval - warnDuration, () => {
        for (const p of this.game.players.filter(Boolean)) {
          if (!p.isAlive()) continue;
          locked.set(p.id, { x: p.x, y: p.y });
          this.game.ringWarnings.push({ x: p.x, y: p.y, t: 0, duration: warnDuration, color, radius: 46 });
        }
      });
      this.game.queue(start + b * interval, () => {
        for (const [, pos] of locked) {
          for (let i = 0; i < count; i++) {
            const a = Math.PI * 2 * i / count;
            this.game.spawnBullet(pos.x, pos.y, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 6 });
          }
        }
      });
    }
  }

  shadowChase(start, count, interval, speed, delay, color) {
    for (let i = 0; i < count; i++) {
      this.game.queue(start + i * interval, () => {
        for (const p of this.game.players.filter(Boolean)) {
          const trail = p.trail || [];
          const pos = trail.length ? trail[Math.max(0, trail.length - 1 - delay)] : { x: p.x, y: p.y };
          const target = this.targetPlayer(pos.x, pos.y);
          const a = Math.atan2(target.y - pos.y, target.x - pos.x);
          const [sx, sy] = this.enforceMinPlayerDistance(pos.x, pos.y, 100);
          this.game.spawnBullet(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 7 });
        }
      });
    }
  }

  shadowMemory(start, pulses, interval, count, speed, color) {
    for (let b = 0; b < pulses; b++) {
      this.game.queue(start + b * interval, () => {
        for (const p of this.game.players.filter(Boolean)) {
          const trail = p.trail || [];
          for (let i = 0; i < count; i++) {
            const pos = trail.length ? trail[Math.max(0, trail.length - 1 - ((b * 7 + i * 3) % Math.max(1, trail.length)))] : { x: p.x, y: p.y };
            const a = Math.atan2(p.y - pos.y, p.x - pos.x) + (i - count / 2) * 0.04;
            const [sx, sy] = this.enforceMinPlayerDistance(pos.x, pos.y, 100);
            this.game.spawnBullet(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 7 });
          }
        }
      });
    }
  }

  shadowMirror(start, pulses, interval, count, speed, color) {
    for (let b = 0; b < pulses; b++) {
      this.game.queue(start + b * interval, () => {
        for (const p of this.game.players.filter(Boolean)) {
          const mx = WORLD.width - p.x;
          const my = WORLD.height - p.y;
          for (let i = 0; i < count; i++) {
            const a = Math.atan2(my - WORLD.height / 2, mx - WORLD.width / 2) + (i - count / 2) * 0.055;
            this.game.spawnBullet(mx, my, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 7 });
          }
        }
      });
    }
  }

  collapseCurtain(start, bursts, interval, count, speed, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const gap = 100 - Math.min(45, b * 5);
        const mid = 120 + (b % 6) * 90;
        for (let i = 0; i < count; i++) {
          const y = 20 + (i * (WORLD.height - 40)) / Math.max(1, count - 1);
          if (Math.abs(y - mid) < gap) continue;
          const left = i % 2 === 0;
          const x = left ? -18 : WORLD.width + 18;
          this.game.spawnBullet(x, y, left ? speed : -speed, 0, 5, color, { maxAge: 7 });
        }
      });
    }
  }

  collapseCorners(start, bursts, interval, count, speed, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const corners = [[-20, -20], [WORLD.width + 20, -20], [-20, WORLD.height + 20], [WORLD.width + 20, WORLD.height + 20]];
        for (let c = 0; c < corners.length; c++) {
          const [x, y] = corners[c];
          for (let i = 0; i < count; i++) {
            const a = Math.atan2(WORLD.height / 2 - y, WORLD.width / 2 - x) + (i - count / 2) * 0.035;
            this.game.spawnBullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 5, color, { maxAge: 7 });
          }
        }
      });
    }
  }

  collapseCircle(start, pulses, interval, count, speed, color) {
    for (let p = 0; p < pulses; p++) {
      this.game.queue(start + p * interval, () => {
        const radius = 370 - p * 35;
        const cx = WORLD.width / 2, cy = WORLD.height / 2;
        for (let i = 0; i < count; i++) {
          const a = Math.PI * 2 * i / count;
          const x = cx + Math.cos(a) * radius;
          const y = cy + Math.sin(a) * radius;
          const inward = Math.atan2(cy - y, cx - x);
          this.game.spawnBullet(x, y, Math.cos(inward) * speed, Math.sin(inward) * speed, 5, color, { maxAge: 7 });
        }
      });
    }
  }

  collapseChambers(start, bursts, interval, count, speed, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const vertical = b % 2 === 0;
        for (let i = 0; i < count; i++) {
          if (vertical) {
            const x = 160 + (i % 7) * 160;
            const y = i % 2 ? -18 : WORLD.height + 18;
            this.game.spawnBullet(x, y, 0, y < 0 ? speed : -speed, 5, color, { maxAge: 7 });
          } else {
            const y = 100 + (i % 5) * 130;
            const x = i % 2 ? -18 : WORLD.width + 18;
            this.game.spawnBullet(x, y, x < 0 ? speed : -speed, 0, 5, color, { maxAge: 7 });
          }
        }
      });
    }
  }

  collapseSweep(start, bursts, interval, count, speed, color) {
    for (let b = 0; b < bursts; b++) {
      this.game.queue(start + b * interval, () => {
        const y = 80 + (b % 6) * 105;
        for (let i = 0; i < count; i++) {
          const x = i % 2 ? WORLD.width + 20 : -20;
          const dir = x < 0 ? 1 : -1;
          const vy = (i - count / 2) * 0.018;
          this.game.spawnBullet(x, y, dir * speed, vy, 5, color, { maxAge: 7 });
        }
      });
    }
  }

  judgmentLine(start, pulses, interval, count, speed, color) {
    for (let p = 0; p < pulses; p++) {
      this.game.queue(start + p * interval, () => {
        const vertical = p % 2 === 0;
        const lane = vertical ? 180 + (p % 4) * 250 : 110 + (p % 5) * 120;
        for (let i = 0; i < count; i++) {
          const t = i / Math.max(1, count - 1);
          const x = vertical ? lane : -18 + t * (WORLD.width + 36);
          const y = vertical ? -18 + t * (WORLD.height + 36) : lane;
          const vx = vertical ? 0 : (p % 2 ? -speed : speed);
          const vy = vertical ? (p % 3 ? -speed : speed) : 0;
          this.game.spawnBullet(x, y, vx, vy, 5, color, { maxAge: 7 });
        }
      });
    }
  }

  judgmentCross(start, pulses, interval, count, speed, color) {
    for (let p = 0; p < pulses; p++) {
      this.game.queue(start + p * interval, () => {
        const cx = WORLD.width / 2, cy = WORLD.height / 2;
        for (let i = 0; i < count; i++) {
          const a = (Math.PI * 2 * i) / count + (p % 2) * 0.08;
          const x = cx + Math.cos(a) * 620;
          const y = cy + Math.sin(a) * 360;
          this.spawnBossBullet(Math.atan2(cy - y, cx - x), speed, 5, color);
        }
      });
    }
  }

  ritualClock(start, pulses, interval, count, speed, color) {
    for (let p = 0; p < pulses; p++) {
      this.game.queue(start + p * interval, () => {
        const offset = p * 0.42;
        for (let i = 0; i < count; i++) {
          const a = Math.PI * 2 * i / count + offset;
          this.spawnBossBullet(a, speed + p * 0.04, 5, color);
        }
      });
    }
  }

  threeJudgments(start, cycles, interval, count, speed, color) {
    for (let c = 0; c < cycles; c++) {
      for (let phase = 0; phase < 3; phase++) {
        this.game.queue(start + (c * 3 + phase) * interval, () => {
          const target = this.targetPlayer(WORLD.width / 2, WORLD.height / 2);
          const base = Math.atan2(target.y - WORLD.height / 2, target.x - WORLD.width / 2);
          for (let i = 0; i < count; i++) {
            const a = base + (i - count / 2) * 0.045 + phase * 0.55;
            this.spawnBossBullet(a, speed + phase * 0.08, 5, color);
          }
        });
      }
    }
  }

  finalEclipse(start, count, speed, color) {
    this.game.queue(start, () => {
      const gap = Math.PI / 4;
      for (let i = 0; i < count; i++) {
        const a = Math.PI * 2 * i / count;
        const d = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(d) < gap) continue;
        this.spawnBossBullet(a, speed, 5, color);
      }
    });
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
