import { BUILD_VERSION } from './buildVersion.js';

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export const UPDATE_STATES = Object.freeze({
  NONE: 'none',
  AVAILABLE: 'available',
});

export class UpdateChecker {
  constructor({ getGameState, onSafePoint }) {
    this.getGameState = getGameState;
    this.onSafePoint = onSafePoint;
    this.state = UPDATE_STATES.NONE;
    this.remoteVersion = null;
    this.timer = null;

    const params = new URLSearchParams(window.location.search);
    this.testMode = params.get('testUpdate') === '1';

    // Test mode deliberately simulates an update without touching GitHub.
    if (this.testMode) {
      this.state = UPDATE_STATES.AVAILABLE;
      this.remoteVersion = 'TEST-NEW-VERSION';
    }

    this.check();
    this.timer = window.setInterval(() => this.check(), CHECK_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.check();
    });
  }

  async check() {
    if (this.testMode) {
      this.state = UPDATE_STATES.AVAILABLE;
      this.remoteVersion = 'TEST-NEW-VERSION';
      this.tryShowAtSafePoint();
      return;
    }

    try {
      const response = await fetch(`./version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) return;

      const data = await response.json();
      const remote = String(data.version || '').trim();
      if (!remote || remote === BUILD_VERSION) return;

      this.state = UPDATE_STATES.AVAILABLE;
      this.remoteVersion = remote;
      this.tryShowAtSafePoint();
    } catch {
      // Offline / local file / temporary network failure:
      // silently keep playing. The next scheduled check will retry.
    }
  }

  tryShowAtSafePoint() {
    const state = this.getGameState?.();
    if (state === 'paused' || state === 'game-over') {
      this.onSafePoint?.(this.remoteVersion);
    }
  }

  notifySafePoint(state) {
    if (this.state !== UPDATE_STATES.AVAILABLE) return;
    if (state === 'paused' || state === 'game-over') {
      this.onSafePoint?.(this.remoteVersion);
    }
  }

  destroy() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }
}
