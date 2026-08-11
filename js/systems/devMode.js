export class DevMode {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.god = false;
    this.hitbox = false;
    this.grazeDebug = false;
    this.panel = document.getElementById('devPanel');

    if (!this.panel) return;

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

      const key = e.key.toLowerCase();
      const actions = {
        r: 'restart',
        c: 'clear',
        g: 'god',
        e: 'ready',
        n: 'waveNext',
        b: 'boss'
      };

      if (actions[key]) {
        e.preventDefault();
        this.action(actions[key]);
      }
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
          <button data-dev="life">+ LIFE [L]</button>
          <button data-dev="kill">− LIFE [K]</button>
          <button data-dev="ready">SKILL READY [E]</button>
        </div>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">WAVE</div>
        <div class="dev-wave-row">
          <button data-dev="wavePrev" class="dev-wave-btn">◀ [M]</button>
          <div class="dev-wave-current">
            <span>WAVE</span>
            <strong id="devCurrentWave">1</strong>
          </div>
          <button data-dev="waveNext" class="dev-wave-btn">▶ [N]</button>
        </div>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">GAME</div>
        <div class="dev-row">
          <button data-dev="clear" class="dev-main-action">CLEAR BULLETS [C]</button>
          <button data-dev="boss">BOSS [B]</button>
          <button data-dev="restart" class="dev-danger">RESTART [R]</button>
        </div>
      </div>

      <div class="dev-section">
        <div class="dev-section-label">DEBUG</div>
        <div class="dev-row">
          <button data-dev="god" id="devGod">GOD: OFF [G]</button>
          <button data-dev="hitbox" id="devHitbox">HITBOX: OFF [H]</button>
          <button data-dev="graze" id="devGraze">GRAZE: OFF [J]</button>
        </div>
      </div>

      <div class="dev-status">
        <span>WAVE <b id="devCurrentWaveBottom">1</b></span>
        <span>•</span>
        <span>BULLETS <b id="devBulletCount">0/0</b></span>
        <span>•</span>
        <span>FPS <b id="devFps">60</b></span>
      </div>
    `;

    this.panel.querySelectorAll('[data-dev]').forEach(btn => {
      btn.addEventListener('click', () => this.action(btn.dataset.dev));
    });

    this.panel.querySelector('#devClose')?.addEventListener('click', () => this.toggle(false));
  }

  toggle(force) {
    this.enabled = typeof force === 'boolean' ? force : !this.enabled;
    this.panel?.classList.toggle('hidden', !this.enabled);

    const badge = document.getElementById('secret-dev-badge');
    if (badge) badge.style.display = this.enabled ? 'none' : 'block';
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
      g.players.forEach(p => { if (!p.down) p.lives = Math.min(3, p.lives + 1); });
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
      g.startWave(Math.max(5, Math.ceil(g.state.wave / 5) * 5));
    }

    if (type === 'waveNext') {
      g.startWave(g.state.wave + 1);
    }

    if (type === 'wavePrev') {
      const previous = Math.max(1, g.state.wave - 1);
      g.startWave(previous);
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

    if (type === 'hitbox') {
      this.hitbox = !this.hitbox;
      g.debugHitbox = this.hitbox;
      const btn = this.panel?.querySelector('#devHitbox');
      if (btn) btn.textContent = `HITBOX: ${this.hitbox ? 'ON' : 'OFF'}`;
    }

    if (type === 'graze') {
      this.grazeDebug = !this.grazeDebug;
      g.debugGraze = this.grazeDebug;
      const btn = this.panel?.querySelector('#devGraze');
      if (btn) btn.textContent = `GRAZE: ${this.grazeDebug ? 'ON' : 'OFF'}`;
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
