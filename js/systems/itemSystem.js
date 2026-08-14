import { CONFIG } from '../core/config.js';

export const ITEM_COLORS = {
  heart: '#ff5c8a',
  energy: '#ffd166',
  shield: '#7bed9f',
  score: '#54a0ff'
};

/**
 * ItemSystem periodically drops a pickup somewhere on the map while a wave
 * is active. Pickups sit still, bob gently, and disappear on their own if
 * nobody walks over them in time (`CONFIG.items.ttl`).
 *
 * Types:
 *  - heart  : restores 1 life (falls back to bonus score if already at max)
 *  - energy : instantly clears the current skill cooldown
 *  - shield : grants a few seconds of shield (same as the Shield skill)
 *  - score  : flat bonus score
 */
export class ItemSystem {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.spawnTimer = 0;
  }

  /** Wipes all pickups and rolls a fresh spawn delay. Called on reset/new wave. */
  clear() {
    this.items.length = 0;
    this.spawnTimer = this.rollSpawnDelay();
  }

  rollSpawnDelay() {
    const cfg = CONFIG.items;
    return cfg.spawnMin + Math.random() * (cfg.spawnMax - cfg.spawnMin);
  }

  pickType() {
    const cfg = CONFIG.items;
    const weights = { ...cfg.weights };
    const players = this.game.activePlayers();
    if (players.some((p) => p.lives < CONFIG.lives.max)) {
      weights.heart += cfg.heartWeightBoost;
    }

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (const type of Object.keys(weights)) {
      if (roll < weights[type]) return type;
      roll -= weights[type];
    }
    return 'score';
  }

  /** Finds a spot away from the edges and away from players, retrying a few times. */
  findSpawnPoint() {
    const world = CONFIG.world;
    const margin = 70;
    const players = this.game.players;

    for (let attempt = 0; attempt < 8; attempt++) {
      const x = margin + Math.random() * (world.width - margin * 2);
      const y = margin + Math.random() * (world.height - margin * 2);
      const tooClose = players.some((p) => Math.hypot(p.x - x, p.y - y) < 110);
      if (!tooClose) return { x, y };
    }
    return { x: world.width / 2, y: world.height / 2 };
  }

  trySpawn() {
    const cfg = CONFIG.items;
    if (this.items.length >= cfg.maxActive) return;

    const { x, y } = this.findSpawnPoint();
    this.items.push({
      x,
      y,
      type: this.pickType(),
      r: cfg.radius,
      age: 0,
      ttl: cfg.ttl,
      bob: Math.random() * Math.PI * 2
    });
  }

  update(dt) {
    // Only spawn/tick while a wave is actively spawning threats; pickups
    // already on the field simply hold still during transitions.
    if (this.game.state.wavePhase !== 'active') return;

    const cfg = CONFIG.items;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.trySpawn();
      this.spawnTimer = this.rollSpawnDelay();
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.age += dt;
      item.bob += dt;

      if (item.age >= item.ttl) {
        this.items.splice(i, 1);
        continue;
      }

      for (const p of this.game.activePlayers()) {
        const dx = p.x - item.x;
        const dy = p.y - item.y;
        const rr = p.r + item.r + cfg.pickupPadding;
        if (dx * dx + dy * dy <= rr * rr) {
          this.collect(item, p);
          this.items.splice(i, 1);
          break;
        }
      }
    }
  }

  collect(item, player) {
    const game = this.game;
    const cfg = CONFIG.items;
    const color = ITEM_COLORS[item.type] || '#fff';

    game.particles.spawn(item.x, item.y, color, 22);
    game.state.shakeMag = Math.max(game.state.shakeMag, 3);

    switch (item.type) {
      case 'heart':
        if (player.lives < CONFIG.lives.max) {
          player.lives = Math.min(CONFIG.lives.max, player.lives + 1);
          player.invulnerable = Math.max(player.invulnerable, 0.35);
          game.addSkillEffect('heal', player, 0.9, { maxRadius: 58 });
          game.spawnScorePopup(item.x, item.y, 0, color, '+1 ชีวิต');
        } else {
          player.score += cfg.scoreValue;
          game.spawnScorePopup(item.x, item.y, cfg.scoreValue, color);
        }
        break;
      case 'energy':
        player.skillCooldown = 0;
        game.spawnScorePopup(item.x, item.y, 0, color, 'สกิลพร้อม!');
        break;
      case 'shield':
        player.shieldTimer = Math.max(player.shieldTimer, cfg.shieldDuration);
        game.addSkillEffect('shield', player, cfg.shieldDuration, { maxRadius: 32 });
        game.spawnScorePopup(item.x, item.y, 0, color, 'โล่!');
        break;
      case 'score':
      default:
        player.score += cfg.scoreValue;
        game.spawnScorePopup(item.x, item.y, cfg.scoreValue, color);
        break;
    }
  }
}
