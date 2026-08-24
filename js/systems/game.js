import { CONFIG, GRAZE_REWARD, actForWave } from '../core/config.js?v=20260824-7uzh';
import { GAME_STATES, GAME_MODES, GameState } from '../core/gameState.js?v=20260824-7uzh';
import { circleHit, circleNear } from '../core/collision.js?v=20260824-7uzh';
import { Player } from '../entities/player.js?v=20260824-7uzh';
import { BulletManager } from '../entities/bullet.js?v=20260824-7uzh';
import { Boss } from '../entities/boss.js?v=20260824-7uzh';
import { ParticleSystem } from '../rendering/particles.js?v=20260824-7uzh';
import { PatternLibrary } from '../patterns/patterns.js?v=20260824-7uzh';
import { WaveSystem } from './waveSystem.js?v=20260824-7uzh';
import { SkillSystem } from './skillSystem.js?v=20260824-7uzh';
import { LifeSystem } from './lifeSystem.js?v=20260824-7uzh';
import { DevMode } from './devMode.js?v=20260824-7uzh';
import { ItemSystem } from './itemSystem.js?v=20260824-7uzh';
import { SkinSystem } from './skinSystem.js?v=20260824-7uzh';

/** Converts a "#rrggbb" hex string to an "r,g,b" string for use in
 * rgba(...) fill styles (see Renderer.flash()). */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/**
 * Game is the top-level orchestrator: it owns all entities/systems and runs
 * the per-frame update loop. Gameplay rules that don't have an obvious home
 * elsewhere (bullet movement/collision, lasers, scoring) live directly on
 * this class.
 *
 * Frame flow: main.js calls `start()` once, which kicks off `loop()`, which
 * calls `update(dt)` then `draw()` every animation frame. `update()` is
 * split into small `updateX()` steps below, run in order — read them
 * top-to-bottom to follow one frame's worth of work.
 */
export class Game {
  constructor({ renderer, input, ui }) {
    this.renderer = renderer;
    this.input = input;
    this.ui = ui;

    this.state = new GameState();
    this.players = [new Player(1, CONFIG.player.color), new Player(2, CONFIG.player.p2Color)];
    this.player = this.players[0];

    this.bullets = new BulletManager();
    this.boss = new Boss();
    this.particles = new ParticleSystem();
    this.patterns = new PatternLibrary(this);
    this.waveSystem = new WaveSystem(this, this.patterns);
    this.skillSystem = new SkillSystem(this);
    this.lifeSystem = new LifeSystem(this);
    this.devMode = new DevMode(this);
    this.itemSystem = new ItemSystem(this);
    this.skinSystem = new SkinSystem({ ui });
    this.ui.setSkinSystem?.(this.skinSystem);
    // There is only one equip slot, so only P1 wears the equipped skin;
    // P2 stays on the default visual (see HANDOFF_LOG.md 2026-08-24) so the
    // two players stay distinguishable by their base P1/P2 colors in coop.
    this.players[0].skinVisual = this.skinSystem.buildVisual();
    for (let i = 1; i < this.players.length; i++) this.players[i].skinVisual = this.skinSystem.buildVisual('default');

    this.actionQueue = [];   // scheduled { time, fn } spawn callbacks, run when state.waveTime reaches `time`
    this.ringWarnings = [];  // telegraph rings shown before a `ring`/`bossRing` pattern fires
    this.lasers = [];        // active laser hazards (telegraph -> fire -> gone)
    this.skillEffects = [];  // transient visual effects spawned by SkillSystem
    this.scorePopups = [];   // floating "+N" text spawned on graze (see spawnScorePopup)
    this.pendingWaveBuilt = 0;

    // Bullet-density cleanup state. The cleanup system is deliberately small:
    // it only activates near the cap and removes low-risk bullets.
    this.bulletCleanupCooldown = 0;
    this.bulletCleanupUsedThisFrame = 0;

    this.lastTime = performance.now();

    this.bestTime = Number(localStorage.getItem(CONFIG.storage.bestTime) || 0);
    this.bestWave = Number(localStorage.getItem(CONFIG.storage.bestWave) || 0);
    this.bestScore = Number(localStorage.getItem(CONFIG.storage.bestScore) || 0);
    this.bestGraze = Number(localStorage.getItem(CONFIG.storage.bestGraze) || 0);
    this.ui.setBest(this.bestTime, this.bestWave, this.bestScore);

    input.onP1Action = () => this.skillSystem.use(this.players[0]);
    input.onP2Action = () => this.skillSystem.use(this.players[1]);
    input.onPause = () => this.togglePause();
    this.ui.setMenuHandler(() => this.backToMenu());
    this.ui.setResumeHandler(() => this.togglePause());
    this.ui.setResetBestHandler?.(() => this.resetBestStats());
    this.ui.setMouseSensitivityHandler?.((value) => this.input.setMouseSensitivity(value));
  }

  // --- Wave / bullet-cap helpers -------------------------------------------------

  isBossWave(n) {
    return n % 5 === 0;
  }

  queue(time, fn) {
    this.actionQueue.push({ time, fn });
  }

  /** Maximum simultaneous bullets allowed, based on wave number (see CONFIG.bullets). */
  bulletCap() {
    const n = this.state.wave;
    let cap;
    // W1-4 ("Bullet Hell" tier) get the raised capEarly. W5 (boss) is
    // deliberately split out to its own capW5 so it keeps its
    // pre-Bullet-Hell value instead of inheriting capEarly's increase.
    if (n >= 1 && n <= 4) cap = CONFIG.bullets.capEarly;
    else if (n === 5) cap = CONFIG.bullets.capW5;
    else if (n <= 10) cap = CONFIG.bullets.capMid;
    else if (n <= 15) cap = CONFIG.bullets.capHigh;
    else if (n <= 20) cap = CONFIG.bullets.capLate;
    else cap = CONFIG.bullets.capEndless;
    if (this.isBossWave(n)) cap += CONFIG.bullets.capBossBonus;
    return cap;
  }

  /**
   * True only for W1-4, the "Bullet Hell" tier. W5 is a boss wave (different
   * pattern set entirely via buildBoss()) and must keep the default cleanup
   * behavior, so it is deliberately excluded here. W5 also has its own
   * capW5 in bulletCap() now, separate from W1-4's capEarly.
   */
  isBulletHellWave() {
    const n = this.state.wave;
    return n >= 1 && n <= 4;
  }

  /** Cleanup tuning to use for the current wave (see CONFIG.bullets.bulletHell). */
  cleanupConfig() {
    return this.isBulletHellWave() ? CONFIG.bullets.bulletHell : CONFIG.bullets;
  }

  /**
   * Spawns a bullet while keeping the arena dense but playable.
   *
   * The old behavior simply stopped spawning at the hard cap. That meant
   * long-lived bullets could accumulate until the arena became permanently
   * saturated. Near the cap we now retire a very small number of low-risk
   * bullets first, while preserving bullets that are young, close to a player,
   * or on an obvious collision trajectory.
   */
  spawnBullet(...args) {
    const opts = args[6] || {};
    // A Moving Sweep is one structural wall represented by many bullets.
    // It must not be truncated by the normal projectile-density cap.
    if (opts.wall) {
      this.bullets.spawn(...args);
      return true;
    }

    const cap = this.bulletCap();
    const count = this.bullets.items.length;
    const density = count / Math.max(1, cap);
    const cleanupCfg = this.cleanupConfig();

    if (density >= cleanupCfg.cleanupStart) {
      const force = count >= cap;
      const canCleanup = force || this.bulletCleanupCooldown <= 0;

      if (canCleanup && this.bulletCleanupUsedThisFrame < cleanupCfg.cleanupPerFrame) {
        const removed = this.cleanupBulletsForCapacity(force ? 2 : 1, cleanupCfg);
        if (removed > 0) {
          this.bulletCleanupCooldown = cleanupCfg.cleanupCooldown;
        }
      }
    }

    if (this.bullets.items.length >= cap) return false;
    this.bullets.spawn(...args);
    return true;
  }

  /**
   * Removes only bullets that are relatively safe to retire. The score favors
   * old/far/edge-bound bullets and heavily penalizes bullets that are young,
   * special, close to a player, or moving toward a player.
   */
  cleanupBulletsForCapacity(maxRemove = 1, cleanupCfg = CONFIG.bullets) {
    if (!this.bullets.items.length || maxRemove <= 0) return 0;

    const players = this.activePlayers().filter(p => p.isAlive());
    if (!players.length) return 0;

    const candidates = [];

    for (let i = 0; i < this.bullets.items.length; i++) {
      const b = this.bullets.items[i];
      // Structural wall pieces are never candidates for capacity cleanup.
      if (b.wall) continue;
      let nearest = Infinity;
      let danger = 0;

      for (const p of players) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const dist = Math.hypot(dx, dy);
        nearest = Math.min(nearest, dist);

        // Predict the closest approach during the next ~1.2 seconds.
        // b.vx/b.vy are tuned in "pixels per frame at 60fps" units (see the
        // b.x += b.vx * dt * 60 movement step below), so the projection here
        // must divide by 60 to get a value of `t` in real seconds before it
        // is used again as `b.vx * t * 60`.
        const speedSq = b.vx * b.vx + b.vy * b.vy;
        if (speedSq > 0.12) {
          const t = Math.max(0, Math.min(1.2, (dx * b.vx + dy * b.vy) / (speedSq * 60)));
          const cx = b.x + b.vx * t * 60;
          const cy = b.y + b.vy * t * 60;
          const miss = Math.hypot(p.x - cx, p.y - cy);
          const hitRadius = p.r + b.r;
          if (miss < hitRadius + 28) {
            danger += Math.max(0, 70 - miss * 1.8);
          }
        }
      }

      // Never clean a bullet sitting directly on top of a player.
      if (nearest < 80) continue;

      const edgeDistance = Math.min(
        b.x,
        CONFIG.world.width - b.x,
        b.y,
        CONFIG.world.height - b.y
      );
      const edgeScore = Math.max(0, 1 - Math.max(0, edgeDistance) / 220) * 28;
      const ageScore = Math.min(b.age / 8, 1) * 34;
      const distanceScore = Math.min(nearest / 700, 1) * 30;
      const movingAwayScore = this.bulletMovingAwayScore(b, players);

      let score = ageScore + distanceScore + edgeScore + movingAwayScore - danger;

      // Special bullets can create important patterns, so keep them longer.
      // Wall bullets are structural: deleting individual pieces would create
      // fake holes in an otherwise continuous Moving Sweep.
      if (b.wall) score -= 60;
      if (b.splitter && !b.split) score -= 28;
      if (b.bounce && b.bounces < b.maxBounces) score -= 18;
      if (b.repulseT > 0) score -= 20;
      if (b.age < 0.45) score -= 36;

      candidates.push({ index: i, score });
    }

    candidates.sort((a, b) => b.score - a.score);

    // Pick the best candidates first, then remove by descending array index so
    // deleting one bullet cannot shift the index of another selected bullet.
    const selected = candidates.slice(0, Math.min(maxRemove, cleanupCfg.cleanupPerFrame));
    selected.sort((a, b) => b.index - a.index);

    let removed = 0;
    for (const candidate of selected) {
      if (this.bulletCleanupUsedThisFrame >= cleanupCfg.cleanupPerFrame) break;

      const bullet = this.bullets.items[candidate.index];
      if (!bullet) continue;

      this.particles.spawn(bullet.x, bullet.y, bullet.color, 2);
      this.bullets.remove(candidate.index);
      this.bulletCleanupUsedThisFrame++;
      removed++;
    }

    return removed;
  }

  /** Estimates whether a bullet is moving away from the nearest active player. */
  bulletMovingAwayScore(b, players) {
    let best = -Infinity;

    for (const p of players) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1) continue;

      const speed = Math.hypot(b.vx, b.vy);
      if (speed < 0.01) {
        best = Math.max(best, 0);
        continue;
      }

      const toward = (b.vx * dx + b.vy * dy) / (speed * dist);
      // toward = +1 means heading toward the player, -1 means away.
      best = Math.max(best, -toward * 18);
    }

    return best === -Infinity ? 0 : best;
  }

  /** Destroys all bullets within `radius` of (x, y), spawning small destruction particles. */
  removeBulletsInRadius(x, y, radius) {
    for (let i = this.bullets.items.length - 1; i >= 0; i--) {
      const b = this.bullets.items[i];
      if (Math.hypot(b.x - x, b.y - y) <= radius + b.r) {
        this.particles.spawn(b.x, b.y, b.color, 4);
        this.bullets.remove(i);
      }
    }
  }

  // --- Player / mode helpers -------------------------------------------------


  allPlayersDown() {
    return this.state.mode === GAME_MODES.SOLO ? this.players[0].down : this.players.every(p => p.down);
  }

  /** Players participating in the current mode who are still standing. */
  activePlayers() {
    return (this.state.mode === GAME_MODES.SOLO ? [this.players[0]] : this.players).filter(p => p.isAlive());
  }

  addSkillEffect(type, player, duration = 0.7, data = {}) {
    this.skillEffects.push({ type, x: player.x, y: player.y, color: player.color, t: 0, duration, ...data });
  }

  /**
   * Spawns a floating text popup at (x, y) — used for graze score gains and
   * item-pickup feedback. Pass `label` to show custom text (e.g. "+1 ชีวิต")
   * instead of the default "+N" score format.
   */
  spawnScorePopup(x, y, amount, color = '#7bed9f', label = null) {
    this.scorePopups.push({
      x,
      y,
      text: label ?? `+${Math.round(amount)}`,
      color,
      age: 0,
      duration: 0.85,
      life: 1,
    });
  }

  /** Ages out floating score popups, moving them upward and fading them (real time, unaffected by slow-mo/time-stop). */
  updateScorePopups(rawDt) {
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const p = this.scorePopups[i];
      p.age += rawDt;
      p.life = 1 - p.age / p.duration;
      if (p.life <= 0) this.scorePopups.splice(i, 1);
    }
  }

  // --- Lifecycle -------------------------------------------------

  reset(mode = GAME_MODES.SOLO, skill = 'pulse', skillP2 = 'pulse') {
    this.bullets.clear();
    this.ringWarnings = [];
    this.lasers = [];
    this.particles.clear();
    this.scorePopups.length = 0;
    this.actionQueue = [];
    this.skillEffects = [];
    this.bulletCleanupCooldown = 0;
    this.bulletCleanupUsedThisFrame = 0;
    this.itemSystem.clear();
    this.skinSystem.resetForNewRun();
    // Same one-equip-slot rule as the constructor: only P1 gets the
    // equipped skin, P2 always stays on the default visual.
    const equippedSkinVisual = this.skinSystem.buildVisual();
    const defaultSkinVisual = this.skinSystem.buildVisual('default');
    this.players.forEach((p, i) => { p.skinVisual = i === 0 ? equippedSkinVisual : defaultSkinVisual; });

    // Solo play should center the player. The 420/860 split is only
    // meaningful in COOP, where both players need distinct starting
    // spots; using it in SOLO put the player noticeably off-center,
    // which barely showed on a wide desktop canvas but put the player
    // near the left edge of the narrow slice of the world visible on
    // a portrait phone.
    if (mode === GAME_MODES.COOP) {
      this.players[0].reset(420, 360);
      this.players[1].reset(860, 360);
    } else {
      this.players[0].reset(640, 360);
      this.players[1].reset(860, 360);
    }
    this.players[1].down = mode === GAME_MODES.SOLO;

    this.boss.reset();
    this.state.reset();
    this.state.state = GAME_STATES.PLAYING;
    this.state.mode = mode;
    this.state.skill = skill;
    this.state.skillP2 = skillP2;

    this.startWave(1, true);
  }

  start(mode, skill, skillP2) {
    this.ui.hideOverlay();
    this.reset(mode, skill, skillP2);
    this.lastTime = performance.now();
    this.ensureLoop();
  }

  ensureLoop() {
    if (!this.loopRunning) {
      this.loopRunning = true;
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  togglePause() {
    if (this.state.state === GAME_STATES.PLAYING) {
      this.state.state = GAME_STATES.PAUSED;
      this.ui.showPause(true);
    } else if (this.state.state === GAME_STATES.PAUSED) {
      this.state.state = GAME_STATES.PLAYING;
      this.ui.showPause(false);
      this.lastTime = performance.now();
    }
  }

  /** Leaves the current run (from Pause or the game-over screen) and returns to the mode/skill menu. */
  backToMenu() {
    clearTimeout(this.state.gameOverTimer);
    this.state.state = GAME_STATES.MENU; // stops the render loop after this frame (see loop())
    this.ui.returnToMenu();
  }

  startWave(n, immediate = false) {
    if (!immediate) {
      this.beginWaveTransition(n);
      return;
    }

    this.state.waveTransition = 0;
    this.state.transitionWave = 0;
    this.state.wavePhase = 'active';
    this.state.wave = n;
    this.state.waveTime = 0;

    // Fresh "No Hit" tracking for this wave — both players, regardless of
    // mode, so a solo P2 slot or a revived coop player never carries a
    // stale flag into the new wave.
    this.players.forEach((p) => { p.tookHitThisWave = false; });

    this.ringWarnings = [];
    this.lasers = [];
    this.actionQueue = [];
    this.boss.active = false;
    this.ui.setBossVisible(false);
    this.itemSystem.clear();

    this.state.waveDuration = this.waveSystem.duration(n);
    const subtitle = this.isBossWave(n)
      ? this.waveSystem.buildBoss(n)
      : this.waveSystem.build(n);

    this.ui.setWave(n);
    this.ui.banner(n, subtitle, this.isBossWave(n));

    // Hold off on spawning (and any other scheduled pattern events, which
    // all flow through `queue(time, fn)` with times relative to wave start)
    // until the wave-announcement banner has fully faded. waveTime starts
    // negative and counts up to 0 over that wait, so every queued time
    // (which are all >= 0) fires only once the text is gone.
    this.state.waveTime = -(CONFIG.wave.bannerDisplayMs / 1000);

    if (this.isBossWave(n)) {
      this.boss.active = true;
      this.ui.setBossVisible(true);
      this.ui.setBossName(this.boss.name);
    }

    if (this.skinSystem && this.skinSystem.pendingToastForWave === n) {
      this.skinSystem.pendingToastForWave = null;
      this.queue(0, () => this.ui.showSkinRewardToast('REWARD', '+1 CASE'));
    }

    // Chapter-transition cue (user-requested follow-up to the act
    // theming): a brief full-screen flash tinted to the new act's
    // accent color, plus a shake burst, so a new story chapter reads as
    // "the world just changed" rather than only new banner text. Decays
    // the same way the existing damage flash/shake do — see draw().
    // Fires when the act actually changes — i.e. the wave right after a
    // boss is defeated (actForWave shifted the boundary there, see
    // config.js) — not when the boss wave itself starts. `n > 1` guards
    // the very first wave, where there's no previous act to transition
    // from.
    if (n > 1 && actForWave(n) !== actForWave(n - 1)) {
      this.state.actFlashColor = hexToRgb(CONFIG.actThemes[actForWave(n)].accent);
      this.state.actFlashAlpha = 1;
      this.state.shakeMag = Math.max(this.state.shakeMag, 14);
    }
  }

  beginWaveTransition(n, extraDelay = 0) {
    // Called only after the previous wave has fully drained.
    // When a "NO HIT" banner is being shown, wait exactly as long as that
    // banner stays on screen (extraDelay === CONFIG.noHit.displayMs/1000)
    // so the next "WAVE N" banner appears the instant it's gone — no
    // padding on top, which used to leave a blank, unexplained pause after
    // the banner faded. Only use the base wave.transition "beat" when
    // there's no banner at all to time against.
    this.state.wavePhase = 'transition';
    this.state.waveTransition = extraDelay > 0 ? extraDelay : CONFIG.wave.transition;
    this.state.transitionWave = n;
}

  startWaveEnding() {
    if (this.state.wavePhase !== 'active') return;

    // The configured duration is the SPAWN WINDOW.
    // Existing bullets/pattern effects are never deleted here.
    this.state.wavePhase = 'draining';
    this.actionQueue = [];
    this.ringWarnings = [];
    this.lasers = [];
    this.boss.active = false;
    this.ui.setBossVisible(false);
  }

  isWaveClear() {
    return (
      this.bullets.items.length === 0 &&
      this.ringWarnings.length === 0 &&
      this.lasers.length === 0
    );
  }

  hitPlayer(player) {
    if (player.devInvulnerable) return false;
    const result = this.lifeSystem.hit(player);
    // 'blocked' = a shield item charge absorbed it: bullet should still be
    // consumed (handled by callers checking truthiness), but it wasn't
    // real damage, so it shouldn't break a "No Hit" wave streak.
    if (result === true) player.tookHitThisWave = true;
    return !!result;
  }

  /** Score bonus for clearing wave `n` without taking a hit — grows with wave number. */
  noHitBonus(n) {
    return Math.round(
      CONFIG.noHit.base + CONFIG.noHit.perWaveAfterFirst * Math.max(0, n - 1),
    );
  }

  /**
   * Checked once per wave, right as it clears (before advancing to the next
   * wave / game over). Awards each player who took zero damage this wave
   * its own "No Hit" bonus — independent per player in coop — and shows a
   * banner if anyone qualified. Returns true if the banner was shown, so
   * the caller can hold off on the next wave's banner until it's done.
   */
  awardNoHitBonuses(waveNumber) {
    const bonus = this.noHitBonus(waveNumber);
    const eligible = (
      this.state.mode === GAME_MODES.SOLO ? [this.players[0]] : this.players
    ).filter((p) => p.isAlive() && !p.tookHitThisWave);
    if (eligible.length === 0) return false;

    for (const p of eligible) p.score += bonus;

    const labels =
      this.state.mode === GAME_MODES.COOP
        ? eligible.map((p) => (p === this.players[0] ? "P1" : "P2"))
        : [];
    this.ui.showNoHitBanner?.(labels, bonus);
    // Also pop a "+N" next to the SCORE stat itself, same as graze does
    // (ui.showScorePopup) — the big banner shows the bonus, but the HUD
    // number should get the same little "it just went up" feedback graze
    // gets. Sum across eligible players so the popup matches how much the
    // displayed team/solo score total actually just jumped by.
    this.ui.showScorePopup?.(bonus * eligible.length);
    return true;
  }

  resetBestStats() {
    this.bestTime = 0;
    this.bestWave = 0;
    this.bestScore = 0;
    this.bestGraze = 0;

    Object.values(CONFIG.storage).forEach((key) => localStorage.removeItem(key));
    this.ui.setBest(0, 0, 0);

    // Refresh the currently visible Game Over comparison immediately.
    // Values are arranged in four rows: time, wave, score, graze.
    const resetBtn = this.ui.resultScreen?.querySelector("#resetBestBtn");
    const bestValues = this.ui.resultScreen?.querySelectorAll(".run-value.run-best");
    if (bestValues?.length === 4) {
      bestValues[0].textContent = "0.0s";
      bestValues[1].textContent = "0";
      bestValues[2].textContent = "0";
      bestValues[3].textContent = "0";
    }
    if (resetBtn) {
      resetBtn.textContent = "Best ถูกรีเซ็ตแล้ว";
      resetBtn.disabled = true;
    }
  }

  gameOver() {
    if (this.state.state === GAME_STATES.GAME_OVER) return;
    this.state.state = GAME_STATES.GAME_OVER;
    this.state.shakeMag = 20;

    const s = this.state;
    const finalScore = Math.round(this.teamScore());

    const prevBestTime = this.bestTime;
    const prevBestWave = this.bestWave;
    const prevBestScore = this.bestScore;
    const prevBestGraze = this.bestGraze;

    if (s.elapsed > this.bestTime) { this.bestTime = s.elapsed; localStorage.setItem(CONFIG.storage.bestTime, String(s.elapsed)); }
    if (s.wave > this.bestWave) { this.bestWave = s.wave; localStorage.setItem(CONFIG.storage.bestWave, String(s.wave)); }
    if (finalScore > this.bestScore) { this.bestScore = finalScore; localStorage.setItem(CONFIG.storage.bestScore, String(finalScore)); }
    if (s.grazeCount > this.bestGraze) { this.bestGraze = s.grazeCount; localStorage.setItem(CONFIG.storage.bestGraze, String(s.grazeCount)); }
    this.ui.setBest(this.bestTime, this.bestWave, this.bestScore);

    clearTimeout(this.state.gameOverTimer);
    this.state.gameOverTimer = setTimeout(
      () => this.ui.showGameOver(s.elapsed, s.wave, s.grazeCount, this.state.mode, this.players, finalScore, prevBestScore, prevBestTime, prevBestWave, prevBestGraze),
      350
    );
  }

  teamScore() {
    return this.state.mode === GAME_MODES.SOLO ? this.players[0].score : this.players[0].score + this.players[1].score;
  }

  // --- Danger-assist (invisible "near miss" fairness helper) -------------------------------------------------

  /** True if spawning should briefly pause because a player is in a dense bullet cluster (wave 4+). */
  dangerAssistDelay() {
    return false;
  }

  /**
   * Gentle, invisible assistance: only activates from Wave 4 onward, or when
   * the arena is very crowded. It only touches bullets on a near-collision
   * trajectory, nudging them just enough to turn a hit into a near miss.
   */
  assistBullets(dt) {
    return;

  }

  // --- Per-frame update, split into ordered sub-steps -------------------------------------------------

  update(rawDt) {
    const s = this.state;

    this.bulletCleanupCooldown = Math.max(0, this.bulletCleanupCooldown - rawDt);
    this.bulletCleanupUsedThisFrame = 0;

    if (s.wavePhase === 'transition') {
      this.updatePlayers(0, rawDt);
      // The run clock (state.elapsed, shown on the HUD) must keep counting
      // through the wave/NO HIT banners same as it does at every other
      // moment of a run — a player's total time-survived shouldn't get a
      // free pause just because a banner is on screen. updateTimers() is
      // intentionally NOT called here (it also drives waveTime/shakeMag/
      // skill timers, which SHOULD hold during the transition), so bump
      // elapsed directly with the real (unscaled) frame time instead.
      s.elapsed += rawDt;
      s.waveTransition = Math.max(0, s.waveTransition - rawDt);
      this.particles.update(rawDt);
      this.updateScorePopups(rawDt);
      // Keep the HUD's score totals in sync during the banner too — this is
      // where the "No Hit" bonus (awarded the instant a wave clears, right
      // as this transition phase begins) needs to actually show up, not
      // wait for the next wave's spawning to resume.
      this.syncScoreDisplay();
      this.ui.update(s, this.players, this.state.mode);

      if (s.waveTransition <= 0) {
        this.startWave(s.transitionWave, true);
      }
      return;
    }

    const dt = this.updateTimers(rawDt);
    this.updateScore(dt);
    this.updatePlayers(dt, rawDt);
    this.updateBoss(dt);

    if (s.wavePhase === 'active') {
      this.runScheduledActions();
    }

    this.updateRingWarnings(dt);
    this.updateLasers(dt);

    // Duration ends only the spawning phase. Existing projectiles continue.
    if (s.wavePhase === 'active' && s.waveTime >= s.waveDuration) {
      this.startWaveEnding();
    }

    if (s.timeStopRemaining <= 0) {
      this.assistBullets(dt);
      this.updateBullets(dt);
    }

    // Do not start the next wave until every object from this wave has
    // naturally left/finished.
    if (s.wavePhase === 'draining' && this.isWaveClear()) {
      const clearedWave = s.wave;
      const showedNoHit = this.awardNoHitBonuses(clearedWave);
      this.skinSystem.awardCaseForWave(clearedWave);
      this.syncScoreDisplay();
      if (s.wave >= 20) {
        this.gameOver();
        return;
      }
      // If the No Hit banner is showing, hold the next wave's banner back
      // until it's fully done (see CONFIG.noHit.displayMs) so the two never
      // overlap — No Hit first, then WAVE X.
      this.beginWaveTransition(
        s.wave + 1,
        showedNoHit ? CONFIG.noHit.displayMs / 1000 : 0,
      );
      return;
    }

    this.itemSystem.update(dt);
    this.updateSkillEffects(rawDt);
    this.lifeSystem.updateRevive(dt);
    this.particles.update(rawDt);
    this.updateScorePopups(rawDt);
    this.devMode.update();
    this.ui.update(s, this.players, this.state.mode);
  }

  /** Advances time-based state (slow-mo/time-stop timers, elapsed/wave clocks, camera shake) and returns the scaled dt to use for gameplay. */
  updateTimers(rawDt) {
    const s = this.state;
    if (s.slowMoRemaining > 0) s.slowMoRemaining -= rawDt;
    if (s.timeStopRemaining > 0) s.timeStopRemaining -= rawDt;
    if (s.staticRemaining > 0) s.staticRemaining = Math.max(0, s.staticRemaining - rawDt);

    const scale = s.slowMoRemaining > 0 ? s.slowScale : 1;
    const dt = rawDt * scale;

    s.elapsed += dt;
    s.waveTime += dt;
    s.shakeMag = Math.max(0, s.shakeMag * Math.exp(-dt * 24));
    s.damageShake = Math.max(0, s.damageShake - rawDt);
    return dt;
  }

  updateScore(dt) {
    // waveTime is negative while the wave-announcement banner is still
    // showing (see startWave()) — nothing is spawned yet, so there's no
    // risk to reward. Hold ONLY the passive time-trickle score/combo decay
    // flat during that window rather than handing out free points for
    // waiting.
    //
    // NOTE: this must NOT early-return the whole function (that was the
    // bug) — item pickups (ItemSystem.collect()) and the "No Hit" wave-
    // clear bonus (awardNoHitBonuses()) both add directly to `player.score`
    // and can land while waveTime is negative (e.g. right as the next
    // wave's banner starts). The HUD only ever reads `state.teamScore`/
    // `state.score`/`state.grazeCount`/`state.combo` (see ui.js
    // updateScores()), so if syncScoreDisplay() below is skipped those
    // real gains become invisible until waveTime catches back up to >= 0 —
    // looking like the item/bonus "didn't add score" even though
    // player.score was actually correct the whole time.
    if (this.state.waveTime >= 0) {
      for (const p of this.activePlayers()) {
        p.score += 100 * dt;
        if (p.comboTimer > 0) {
          p.comboTimer -= dt;
          if (p.comboTimer <= 0) { p.comboTimer = 0; p.combo = 0; }
        }
      }
    }
    this.syncScoreDisplay();
  }

  /** Refreshes the HUD-facing score/graze/combo totals from each player's real state. Always safe to call — cheap, and idempotent if nothing changed. */
  syncScoreDisplay() {
    this.state.teamScore = this.teamScore();
    this.state.score = this.state.teamScore;
    this.state.grazeCount = this.players.reduce((sum, p) => sum + p.grazeCount, 0);
    this.state.combo = Math.max(this.players[0].combo, this.players[1].combo);
  }

  updatePlayers(dt, rawDt) {
    for (const p of this.players) p.tick(rawDt);

    // Player movement intentionally uses rawDt (not the slow-mo/time-stop
    // scaled `dt`). Previously this used `dt`, which meant activating the
    // Slow skill also crippled the player's own mouse/keyboard responsiveness
    // by the same factor as the bullets — largely canceling out the point of
    // a "bullet time" skill. Bullets/score/boss still use the scaled `dt`.
    // Skip until the player has actually moved the mouse/touched the
    // screen: input.p1.x/y start out as a 1280x720 screen-space
    // placeholder, which on a narrower mobile screen maps (via
    // worldPoint's clamp) to the right edge of the visible world --
    // pinning the player there before they've touched anything.
    if (this.input.p1.hasInput) {
      const target = this.renderer.worldPoint(this.input.p1.x, this.input.p1.y);
      if (this.players[0].isAlive()) this.players[0].updateMouse(target.x, target.y, rawDt, this.input.p1.isTouch, this.input.mouseSensitivity);
    }
    if (this.state.mode === GAME_MODES.COOP && this.players[1].isAlive()) {
      this.players[1].updateKeyboard(this.input.p2Direction(), rawDt);
    }
    const visibleBounds = this.renderer.visibleWorldBounds();
    for (const p of this.activePlayers()) p.clamp(CONFIG.world, visibleBounds);
  }

  updateBoss(dt) {
    if (!this.boss.active) return;
    const s = this.state;
    this.boss.y += (CONFIG.world.height * 0.22 - this.boss.y) * 0.03;
    this.boss.x = CONFIG.world.width / 2 + Math.sin(s.waveTime * 0.6) * CONFIG.world.width * 0.22;
    this.boss.hue += dt * 60;
    this.ui.setBossProgress(Math.max(0, Math.min(1, 1 - s.waveTime / s.waveDuration)) * 100);
  }

  /** Runs any queued pattern-spawn callbacks whose scheduled time has arrived. */
  runScheduledActions() {
    const waveTime = this.state.waveTime;
    for (let i = this.actionQueue.length - 1; i >= 0; i--) {
      if (this.actionQueue[i].time <= waveTime) {
        this.actionQueue[i].fn();
        this.actionQueue.splice(i, 1);
      }
    }
  }

  updateRingWarnings(dt) {
    for (let i = this.ringWarnings.length - 1; i >= 0; i--) {
      const w = this.ringWarnings[i];
      if (w.trackBoss) { w.x = this.boss.x; w.y = this.boss.y; }
      w.t += dt;
      if (w.t >= w.duration) this.ringWarnings.splice(i, 1);
    }
  }

  updateLasers(dt) {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const L = this.lasers[i];
      L.t += dt;
      if (L.state === 'telegraph' && L.t >= L.telegraphDur) { L.state = 'fire'; L.t = 0; }

      if (L.state === 'fire') {
        for (const p of this.activePlayers()) {
          if (!p.canBeHit()) continue;
          const hit = L.orientation === 'h'
            ? Math.abs(p.y - L.pos) < L.thickness / 2 + p.r
            : Math.abs(p.x - L.pos) < L.thickness / 2 + p.r;
          if (hit) this.hitPlayer(p);
        }
        if (L.t >= L.fireDur) this.lasers.splice(i, 1);
      }
    }
  }

  targetPlayerForBullet(x, y) {
    const alive = this.activePlayers().filter(p => p.isAlive());
    if (!alive.length) return null;
    return alive.reduce((best, p) => (
      Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best
    ), alive[0]);
  }

  /** Moves every bullet, handles wall-bouncing, splitter bullets, off-screen cleanup, and player collision/graze. */
  updateBullets(dt) {
    const s = this.state;
    for (let i = this.bullets.items.length - 1; i >= 0; i--) {
      const b = this.bullets.items[i];
      b.age += dt;

      // Fly-to-position: formation bullet spawned at boss, flying to its slot.
      // When it arrives it snaps in place (vx=vy=0); the pattern's fire
      // callback will release it later. While still flying, skip the
      // perimeterHold freeze so normal vx/vy movement applies.
      if (!b.flyToArrived) {
        const dx = b.flyToX - b.x;
        const dy = b.flyToY - b.y;
        const dist = Math.hypot(dx, dy);
        const step = b.flyToSpeed * dt * 60;
        if (dist <= step + 2) {
          // Snap to slot and hold still.
          b.x = b.flyToX;
          b.y = b.flyToY;
          b.vx = 0;
          b.vy = 0;
          b.flyToArrived = true;
        } else {
          // Still flying — steer toward target at flyToSpeed.
          b.vx = (dx / dist) * b.flyToSpeed;
          b.vy = (dy / dist) * b.flyToSpeed;
        }
        // Don't apply the hold-freeze while still in flight.
        // Fall through so normal vx/vy movement step runs below.
      }

      // Perimeter formation bullets stay frozen in their square position
      // until their individual release time. Then they lock onto the player
      // and leave the formation one by one.
      if (b.perimeterHold && !b.perimeterReleased) {
        // If still flying to position, skip freeze — handled above.
        if (!b.flyToArrived) {
          // (intentionally left empty — flyTo block already set velocity)
        } else if (b.age < b.releaseDelay) {
          b.vx = 0;
          b.vy = 0;
          continue;
        } else {
          const target = this.targetPlayerForBullet(b.x, b.y);
          if (target) {
            const angle = Math.atan2(target.y - b.y, target.x - b.x);
            b.vx = Math.cos(angle) * b.perimeterSpeed;
            b.vy = Math.sin(angle) * b.perimeterSpeed;
          }
          b.perimeterReleased = true;
        }
      }

      // Short continuation of the Repulse impulse so bullets visibly travel
      // away from the player for a few frames instead of instantly resuming
      // their old trajectory.
      if (b.repulseT > 0) {
        b.repulseT = Math.max(0, b.repulseT - dt);
        if (b.repulseStrength > 0) {
          const speed = Math.hypot(b.vx, b.vy) || 1;
          const nx = b.vx / speed;
          const ny = b.vy / speed;
          b.vx += nx * b.repulseStrength * dt * 60;
          b.vy += ny * b.repulseStrength * dt * 60;
        }
      }

      if (b.homing && b.homingStrength > 0 && b.age > 0.25) {
        const target = this.targetPlayerForBullet(b.x, b.y);
        if (target) {
          const speed = Math.hypot(b.vx, b.vy) || 1;
          const desired = Math.atan2(target.y - b.y, target.x - b.x);
          const current = Math.atan2(b.vy, b.vx);
          let delta = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
          delta = Math.max(-b.homingStrength, Math.min(b.homingStrength, delta));
          const next = current + delta;
          b.vx = Math.cos(next) * speed;
          b.vy = Math.sin(next) * speed;
        }
      }

      if (b.trajectory) {
        b.trajAge = (b.trajAge || 0) + dt;
        if (b.trajectory === 'sine') {
          b.x = (b.originX ?? b.x) + Math.sin(b.trajAge * b.frequency * Math.PI * 2) * b.amplitude;
        } else if (b.trajectory === 'accelerate') {
          b.vy += (b.dir || 1) * b.accel * dt * 60;
        } else if (b.trajectory === 'stopGo') {
          if (b.trajAge >= b.stopAfter && b.trajAge < b.stopAfter + b.pause) {
            b.vx = 0; b.vy = 0;
          } else if (b.trajAge >= b.stopAfter + b.pause && !b.resumed) {
            b.vy = (b.dir || 1) * b.resumeSpeed; b.resumed = true;
          }
        } else if (b.trajectory === 'reverse') {
          if (!b.reversed && b.trajAge >= b.reverseAfter) {
            b.vy = -(b.dir || 1) * Math.abs(b.vy); b.reversed = true;
          }
        } else if (b.trajectory === 'orbit') {
          b.angle += b.orbitSpeed * dt;
          b.x = b.centerX + Math.cos(b.angle) * b.radius;
          b.y = b.centerY + Math.sin(b.angle) * b.radius;
          b.skipNormalMove = true;
        } else if (b.trajectory === 'gravityWell') {
          const dx = (b.gravityX ?? 640) - b.x;
          const dy = (b.gravityY ?? 360) - b.y;
          const dist = Math.hypot(dx, dy) || 1;
          const strength = b.gravityStrength || 0;
          b.vx += (dx / dist) * strength * dt * 60;
          b.vy += (dy / dist) * strength * dt * 60;
          const maxSpeed = 7.0;
          const speed = Math.hypot(b.vx, b.vy);
          if (speed > maxSpeed) {
            b.vx *= maxSpeed / speed;
            b.vy *= maxSpeed / speed;
          }
        } else if (b.trajectory === 'gravityFlip') {
          if (!b.gravityFlipped && b.trajAge >= (b.flipAfter ?? 1.0)) {
            b.vy = -b.vy;
            b.gravityFlipped = true;
          }
        }
      }
      if (b.curve) {
        const speed = Math.hypot(b.vx, b.vy) || 1;
        const nx = -b.vy / speed, ny = b.vx / speed;
        b.vx += nx * b.curve * dt * 60;
        b.vy += ny * b.curve * dt * 60;
      }

      if (!b.skipNormalMove) {
        b.x += b.vx * dt * 60;
        b.y += b.vy * dt * 60;
      }
      b.skipNormalMove = false;

      if (b.bounce && b.bounces < b.maxBounces) {
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); b.bounces++; }
        else if (b.x > CONFIG.world.width - b.r) { b.x = CONFIG.world.width - b.r; b.vx = -Math.abs(b.vx); b.bounces++; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); b.bounces++; }
        else if (b.y > CONFIG.world.height - b.r) { b.y = CONFIG.world.height - b.r; b.vy = -Math.abs(b.vy); b.bounces++; }
      }

      // Homing bullets can follow the player indefinitely, so they need
      // an explicit lifetime. Remove them before they can stall wave draining.
      if (b.age >= b.maxAge) {
        this.particles.spawn(b.x, b.y, b.color, 4);
        this.bullets.remove(i);
        continue;
      }

      if (b.splitter && !b.split && b.age >= (b.splitDelay ?? 0.9)) {
        b.split = true;
        const base = Math.atan2(b.vy, b.vx);
        const speed = b.splitSpeed ?? (Math.hypot(b.vx, b.vy) * 0.9);
        const splitCount = b.splitCount ?? 6;
        for (let k = 0; k < splitCount; k++) {
          const angle = base + (Math.PI * 2 * k) / splitCount;
          this.spawnBullet(b.x, b.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 4, b.color);
        }
        this.particles.spawn(b.x, b.y, b.color, 10);
        this.bullets.remove(i);
        continue;
      }

      if (b.x < -80 || b.x > CONFIG.world.width + 80 || b.y < -80 || b.y > CONFIG.world.height + 80) {
        this.bullets.remove(i);
        continue;
      }

      for (const p of this.activePlayers()) {
        if (!p.isAlive() || !p.canBeHit()) continue;
        if (circleHit(b, p)) {
          // A bullet is consumed only when it actually deals damage.
          // This prevents the same projectile from hitting again after
          // the player's brief hit-invulnerability.
          const damaged = this.hitPlayer(p);
          if (damaged) {
            this.bullets.remove(i);
            this.particles.spawnBlood(b.x, b.y, 10, p.skinVisual?.deathEffect);
            break;
          }
        }
        if (!b.grazedBy && circleNear(b, p, 16)) {
          b.grazedBy = p.id;
          p.grazeCount++;
          p.combo++;
          p.comboTimer = GRAZE_REWARD.comboWindow;

          // Grazing is now an active resource:
          // the better the player maintains a close-call chain,
          // the faster the current skill comes back.
          const recovery =
            p.combo >= 20 ? GRAZE_REWARD.combo20 :
            p.combo >= 10 ? GRAZE_REWARD.combo10 :
            p.combo >= 5 ? GRAZE_REWARD.combo5 :
            GRAZE_REWARD.base;

          if (p.skillCooldown > 0) {
            // Graze can ONLY subtract time from the current cooldown.
            // It can never increase or reset the cooldown.
            // Total graze-driven reduction is capped per activation cycle
            // at GRAZE_REWARD.maxReduction of the skill's original cooldown.
            const budget = (p.skillBaseCooldown || 0) * GRAZE_REWARD.maxReduction;
            const allowed = Math.max(0, Math.min(recovery, budget - p.grazeCooldownReduced));
            p.skillCooldown = Math.max(0, p.skillCooldown - allowed);
            p.grazeCooldownReduced += allowed;
          }

          const mult = 1 + Math.min(p.combo, 10) * 0.12;
          const gained = 50 * mult;
          p.score += gained;
          s.shakeMag = 3;
          this.particles.spawn(b.x, b.y, p.color, 6);
          this.ui.showScorePopup?.(gained);
        }
      }
    }
  }

  updateSkillEffects(rawDt) {
    for (let i = this.skillEffects.length - 1; i >= 0; i--) {
      this.skillEffects[i].t += rawDt;
      if (this.skillEffects[i].t >= this.skillEffects[i].duration) this.skillEffects.splice(i, 1);
    }
  }

  // --- Render loop -------------------------------------------------

  draw() {
    const damageKick = this.state.damageShake > 0 ? 10 * (this.state.damageShake / 0.22) : 0;
    this.renderer.begin(Math.max(this.state.shakeMag, damageKick), this.state.wave);
    this.renderer.drawWorld(this);
    this.renderer.end();
    this.renderer.flash(this.state.flashAlpha);
    this.state.flashAlpha *= 0.9;
    this.renderer.flash(this.state.actFlashAlpha, this.state.actFlashColor);
    this.state.actFlashAlpha *= 0.9;
    this.renderer.drawLowLifeVignette(this.activePlayers());
    this.renderer.drawStatic(this.state.staticRemaining);
    this.renderer.drawSkillReadyPulse(this.state.skillReadyFlashAlpha);
    this.state.skillReadyFlashAlpha *= 0.9;
  }

  loop(now) {
    // The 0.05s ceiling below is the physics-safety cap the whole collision
    // model is built around (see updateBullets(): b.x += b.vx * dt * 60,
    // checked with a simple circleHit() — no swept/continuous collision).
    // Dev Mode SPEED (this.devMode.timeScale) must be applied BEFORE that
    // cap, not after: multiplying an already-capped dt by e.g. 3x lets the
    // effective step reach 0.15s on a slow/stuttering frame, which is large
    // enough for a fast bullet (or a keyboard-controlled player) to skip
    // past a collision radius in a single step — real, if narrow, bullet
    // tunneling. Scaling first means the final dt is clamped to the same
    // 0.05s ceiling the rest of the game already assumes is safe,
    // regardless of timeScale. At a steady frame rate this is a no-op (at
    // 60fps, 3x timeScale already lands almost exactly on 0.05s either
    // way) — it only changes behavior during a stutter/lag spike, which is
    // exactly when the old ordering could exceed the safe ceiling.
    const frameDt = (now - this.lastTime) / 1000;
    const raw = Math.min(frameDt * (this.devMode?.timeScale ?? 1), 0.05);
    this.lastTime = now;
    if (this.state.state === GAME_STATES.PLAYING) this.update(raw);
    this.draw();
    if (this.state.state !== GAME_STATES.MENU) requestAnimationFrame(this.loop.bind(this));
    else this.loopRunning = false;
  }
}
