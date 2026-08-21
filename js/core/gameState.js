export const GAME_STATES = Object.freeze({
  MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'game-over'
});

export const GAME_MODES = Object.freeze({ SOLO: 'solo', COOP: 'coop' });

export class GameState {
  constructor() { this.reset(); }
  reset() {
    this.state = GAME_STATES.MENU;
    this.mode = GAME_MODES.SOLO;
    this.skill = 'pulse';
    this.skillP2 = 'pulse';
    this.wave = 1;
    this.waveTime = 0;
    this.elapsed = 0;
    this.waveDuration = 30;
    this.waveTransition = 0;
    this.wavePhase = 'active'; // active -> draining -> transition
    this.transitionWave = 0;
    this.waveEnding = false;
    this.waveEndingTime = 0;
    this.waveEndingMax = 3.0;
    this.grazeCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.teamScore = 0;
    this.score = 0;
    this.slowMoRemaining = 0;
    this.slowScale = 0.28;
    this.timeStopRemaining = 0;
    this.shakeMag = 0; this.damageShake = 0;
    this.flashAlpha = 0;
    // Screen-static overlay, set by the Mystery Box item's "static" bad
    // outcome (see ItemSystem.collect() case 'mystery') — a few seconds of
    // visual noise over the playfield. Purely cosmetic; decays in
    // Game.updateTimers() and drawn in Game.draw() via renderer.drawStatic().
    this.staticRemaining = 0;
    // Chapter-transition flash (tinted to the new act's accent color),
    // set in Game.startWave() when a boss wave begins a new story act.
    // Decays the same way flashAlpha does — see Game.draw().
    this.actFlashAlpha = 0;
    this.actFlashColor = '255,92,92';
    // Screen-edge green pulse fired once when a player's skill goes from
    // cooldown to ready (see UI.pulseSkillReady()). The "READY" chip sits
    // in a top corner and is easy to miss once the screen is full of
    // bullets, so this adds a peripheral-vision cue that doesn't cover the
    // play area. Set to 1 on the transition, decays the same way
    // flashAlpha does — see Game.draw().
    this.skillReadyFlashAlpha = 0;
    clearTimeout(this.gameOverTimer);
    this.gameOverTimer = null;

  }
  isPlaying() { return this.state === GAME_STATES.PLAYING; }
}
