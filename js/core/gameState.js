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
    this.transitionWave = 0;
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
    this.gameOverTimer = null;
  }
  isPlaying() { return this.state === GAME_STATES.PLAYING; }
}
