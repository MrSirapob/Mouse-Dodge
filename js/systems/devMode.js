import { CONFIG } from '../core/config.js?v=20260821-hp8v';

export class DevMode {
  // Selectable game-speed levels for the SPEED panel (spec: "เร่งความเร็ว
  // แต่ละระดับเลือกได้" — a discrete, pick-one multiplier, not a slider).
  // Applied as a straight multiplier on the frame's raw dt in Game.loop(),
  // so it speeds up/slows down everything uniformly (movement, spawns,
  // timers, animation) — separate from the slow-mo skill's `slowScale`.
  static SPEED_LEVELS = {
    speedSlow: 0.5,
    speedNormal: 1,
    speedFast: 1.5,
    speedFaster: 2,
    speedFastest: 3,
  };

  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.god = false;
    this.timeScale = 1;
    this.panel = document.getElementById('devPanel');

    if (!this.panel) {
      // Fails silently on purpose only in the sense that the game keeps running —
      // but this means F2 / dev tools are dead until reload. Warn loudly so it's
      // never a silent mystery during development.
      console.warn('[DevMode] #devPanel not found in the DOM — Dev Mode is disabled for this session.');
      return;
    }

    this.renderPanel();

    window.addEventListener('keydown', e => {
      if (e.key === 'F2') {
        if (!window.devModeUnlocked) return;
        e.preventDefault();
        this.toggle();
        return;
      }

      if (!window.devModeUnlocked || !this.enabled) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      // Hotkeys for the actions actually used mid-test (per feedback: God,
      // Boss, wave skip/back, Heal, Speed). Player 1 is mouse-only and
      // clicking a panel button means dragging the cursor off wherever
      // you're testing — these let you fire the same actions without
      // moving the mouse at all. P2 uses WASD/Arrows/Space/Slash, so none
      // of these keys (including the number row) can collide.
      const HOTKEYS = {
        g: 'god',
        b: 'boss',
        h: 'life',
        '[': 'wavePrev',
        ']': 'waveNext',
        '1': 'speedSlow',
        '2': 'speedNormal',
        '3': 'speedFast',
        '4': 'speedFaster',
        '5': 'speedFastest',
      };

      const action = HOTKEYS[e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      this.action(action);
    });
  }

  renderPanel() {
    this.panel.innerHTML = `
      <div class="dev-title">
        <div>
          <span class="dev-dot"></span>
          <b>DEV MODE</b>
        </div>
        <button class="dev-close" id="devClose" type="button" aria-label="ปิด Dev Mode">×</button>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">PLAYER</div>
        <div class="dev-row">
          <button data-dev="life" title="Hotkey: H — revives if downed">+ LIFE (H)</button>
          <button data-dev="kill">− LIFE</button>
          <button data-dev="ready">SKILL READY</button>
        </div>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">WAVE</div>
        <div class="dev-wave-row">
          <button data-dev="wavePrev" class="dev-wave-btn" title="Hotkey: [">◀</button>
          <div class="dev-wave-current">
            <span>WAVE</span>
            <strong id="devCurrentWave">1</strong>
          </div>
          <button data-dev="waveNext" class="dev-wave-btn" title="Hotkey: ]">▶</button>
        </div>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">SPEED</div>
        <div class="dev-row" id="devSpeedRow">
          <button data-dev="speedSlow" class="dev-speed-btn" title="Hotkey: 1">0.5×</button>
          <button data-dev="speedNormal" class="dev-speed-btn" title="Hotkey: 2">1×</button>
          <button data-dev="speedFast" class="dev-speed-btn" title="Hotkey: 3">1.5×</button>
          <button data-dev="speedFaster" class="dev-speed-btn" title="Hotkey: 4">2×</button>
          <button data-dev="speedFastest" class="dev-speed-btn" title="Hotkey: 5">3×</button>
        </div>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">GAME</div>
        <div class="dev-row">
          <button data-dev="clear" class="dev-main-action">CLEAR BULLETS</button>
          <button data-dev="boss" title="Hotkey: B">BOSS (B)</button>
          <button data-dev="restart" class="dev-danger">RESTART</button>
        </div>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">DEBUG</div>
        <div class="dev-row">
          <button data-dev="god" id="devGod" title="Hotkey: G">GOD: OFF</button>
        </div>
      </div>

      <div class="dev-status">
        <span>WAVE <b id="devCurrentWaveBottom">1</b></span>
        <span>•</span>
        <span>BULLETS <b id="devBulletCount">0/0</b></span>
        <span>•</span>
        <span>SPEED <b id="devSpeedValue">1×</b></span>
        <span>•</span>
        <span>FPS <b id="devFps">60</b></span>
        <span>•</span>
        <span class="dev-hotkeys">G:GOD B:BOSS [ ]:WAVE H:HEAL 1-5:SPEED</span>
      </div>
    `;

    this.panel.querySelectorAll('[data-dev]').forEach(btn => {
      btn.addEventListener('click', () => this.action(btn.dataset.dev));
    });

    this.panel.querySelector('#devClose')?.addEventListener('click', () => this.toggle(false));
    this.updateSpeedButtons();
  }

  toggle(force) {
    this.enabled = typeof force === 'boolean' ? force : !this.enabled;
    this.panel?.classList.toggle('hidden', !this.enabled);

    const badge = document.getElementById('secret-dev-badge');
    if (badge) badge.style.display = this.enabled ? 'none' : 'block';
  }

  /** Highlights whichever SPEED button matches the current this.timeScale, and refreshes the status-bar readout. */
  updateSpeedButtons() {
    this.panel?.querySelectorAll('.dev-speed-btn').forEach(btn => {
      const level = DevMode.SPEED_LEVELS[btn.dataset.dev];
      btn.classList.toggle('active', level === this.timeScale);
    });
    const readout = document.getElementById('devSpeedValue');
    if (readout) {
      // 1.5 -> "1.5×", 2 -> "2×" (no trailing .0)
      readout.textContent = `${this.timeScale % 1 === 0 ? this.timeScale : this.timeScale.toFixed(1)}×`;
    }
  }

  update() {
    const wave = this.game.state?.wave ?? 1;
    const bulletCount = this.game.bullets.items.length;
    const cap = this.game.bulletCap();

    const waveEls = [
      document.getElementById('devCurrentWave'),
      document.getElementById('devCurrentWaveBottom')
    ];
    waveEls.forEach(el => { if (el) el.textContent = wave; });

    const bullets = document.getElementById('devBulletCount');
    if (bullets) bullets.textContent = `${bulletCount}/${cap}`;

    const fps = document.getElementById('devFps');
    if (fps) {
      const now = performance.now();
      if (!this._fpsLast) {
        this._fpsLast = now;
        this._fpsFrames = 0;
      }
      this._fpsFrames++;
      if (now - this._fpsLast >= 500) {
        this._fpsValue = Math.round(this._fpsFrames * 1000 / (now - this._fpsLast));
        this._fpsFrames = 0;
        this._fpsLast = now;
      }
      fps.textContent = this._fpsValue || 60;
    }
  }

  action(type) {
    const g = this.game;

    if (type === 'life') {
      // Previously a no-op on a downed player (guarded by `if (!p.down)`),
      // which is exactly the moment testers reach for Heal. Now it revives
      // first, then tops up — but ONLY for players that actually take part
      // in the current mode. In SOLO, `players[1].down` is permanently
      // `true` by design (see Game.reset(): `players[1].down = mode ===
      // SOLO`) to mark that slot as a non-participant, not as "downed
      // mid-run". Reviving it unconditionally would silently flip that
      // invariant and un-park a player that's never supposed to be alive
      // in SOLO. Mirror the same mode check `activePlayers()`/
      // `allPlayersDown()` already use elsewhere in game.js.
      const targets = g.state.mode === 'coop' ? g.players : [g.players[0]];
      targets.forEach(p => {
        if (p.down) {
          p.down = false;
          p.lives = 0;
          p.invulnerable = CONFIG.lives.respawnInvulnerability;
          p.reviveProgress = 0;
        }
        p.lives = Math.min(CONFIG.lives.max, p.lives + 1);
      });
    }

    if (type === 'kill') {
      g.players.forEach(p => { if (!p.down) p.lives = Math.max(0, p.lives - 1); });
    }

    if (type === 'ready') {
      g.players.forEach(p => p.skillCooldown = 0);
    }

    if (type === 'clear') {
      g.bullets.clear();
    }

    if (type === 'boss') {
      g.startWave(Math.max(5, Math.ceil(g.state.wave / 5) * 5), true);
    }

    if (type === 'waveNext') {
      g.startWave(g.state.wave + 1, true);
    }

    if (type === 'wavePrev') {
      const previous = Math.max(1, g.state.wave - 1);
      g.startWave(previous, true);
    }

    if (type === 'restart') {
      g.reset(g.state.mode, g.state.skill, g.state.skillP2);
    }

    if (type === 'god') {
      this.god = !this.god;
      g.players.forEach(p => p.devInvulnerable = this.god);
      const btn = this.panel?.querySelector('#devGod');
      if (btn) btn.textContent = `GOD: ${this.god ? 'ON' : 'OFF'}`;
    }

    // Each SPEED level gets its own `if (type === '...')` branch (rather
    // than a loop over DevMode.SPEED_LEVELS) so the dead-button static
    // check in tests/unit/devmode-docs.test.mjs can see every data-dev
    // value has a real handler.
    if (type === 'speedSlow') {
      this.timeScale = DevMode.SPEED_LEVELS.speedSlow;
      this.updateSpeedButtons();
    }

    if (type === 'speedNormal') {
      this.timeScale = DevMode.SPEED_LEVELS.speedNormal;
      this.updateSpeedButtons();
    }

    if (type === 'speedFast') {
      this.timeScale = DevMode.SPEED_LEVELS.speedFast;
      this.updateSpeedButtons();
    }

    if (type === 'speedFaster') {
      this.timeScale = DevMode.SPEED_LEVELS.speedFaster;
      this.updateSpeedButtons();
    }

    if (type === 'speedFastest') {
      this.timeScale = DevMode.SPEED_LEVELS.speedFastest;
      this.updateSpeedButtons();
    }
  }
}

// ===== SECRET DEV MODE UNLOCK =====
// Step 1: hold WAVE DODGE for 2 seconds.
// Step 2: tap the top-left corner 3 times.
// The sequence only unlocks F2; it does NOT open the Dev panel automatically.
(() => {
  const HOLD_MS = 2000;
  const TAP_COUNT = 3;
  const TAP_WINDOW_MS = 1800;
  const CORNER_SIZE = 72;

  let holdTimer = null;
  let holdingTitle = false;
  let step1Unlocked = false;
  let tapCount = 0;
  let tapTimer = null;
  let devUnlocked = false;

  const title = document.querySelector('h1');
  if (!title) return;

  const inTopLeftCorner = (x, y) => x >= 0 && y >= 0 && x <= CORNER_SIZE && y <= CORNER_SIZE;

  const getPoint = (e) => {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const showDevBadge = () => {
    let badge = document.getElementById('secret-dev-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'secret-dev-badge';
      badge.textContent = '🛠 DEV MODE';
      Object.assign(badge.style, {
        position: 'fixed',
        top: 'auto',
        left: '10px',
        bottom: '10px',
        zIndex: '99999',
        padding: '5px 8px',
        borderRadius: '7px',
        background: 'rgba(0,0,0,.72)',
        color: '#fff',
        font: '600 12px/1 system-ui,sans-serif',
        pointerEvents: 'none',
        userSelect: 'none'
      });
      document.body.appendChild(badge);
    }
  };

  const enableDev = () => {
    devUnlocked = true;
    window.devModeUnlocked = true;
    showDevBadge();
    window.dispatchEvent(new CustomEvent('secret-dev-unlocked'));
  };

  const resetTaps = () => {
    tapCount = 0;
    if (tapTimer) {
      clearTimeout(tapTimer);
      tapTimer = null;
    }
  };

  const beginTapWindow = () => {
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(resetTaps, TAP_WINDOW_MS);
  };

  const startTitleHold = () => {
    if (devUnlocked || step1Unlocked) return;
    holdingTitle = true;
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (!holdingTitle) return;
      step1Unlocked = true;
      tapCount = 0;
      beginTapWindow();
    }, HOLD_MS);
  };

  const cancelTitleHold = () => {
    holdingTitle = false;
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  title.addEventListener('pointerdown', startTitleHold);
  title.addEventListener('pointerup', cancelTitleHold);
  title.addEventListener('pointerleave', cancelTitleHold);
  title.addEventListener('pointercancel', cancelTitleHold);

  window.addEventListener('pointerdown', (e) => {
    if (!step1Unlocked || devUnlocked) return;
    const p = getPoint(e);
    if (!inTopLeftCorner(p.x, p.y)) {
      resetTaps();
      return;
    }

    if (!tapTimer) beginTapWindow();
    tapCount++;

    if (tapCount >= TAP_COUNT) {
      if (tapTimer) clearTimeout(tapTimer);
      tapTimer = null;
      enableDev();
    }
  }, true);

  // F2 is completely ignored until the two-step secret unlock is complete.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F2' && !devUnlocked) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
})();
