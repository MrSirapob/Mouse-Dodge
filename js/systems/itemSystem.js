import { CONFIG } from '../core/config.js?v=20260821-hp8v';

export const ITEM_COLORS = {
  heart: '#ff5c8a',
  energy: '#ffd166',
  shield: '#7bed9f',
  score: '#54a0ff',
  mystery: '#a29bfe'
};

/**
 * ItemSystem periodically drops a pickup somewhere on the map while a wave
 * is actively spawning. Pickups stay live (bobbing, aging, and collectible)
 * through the 'draining' tail of a wave too, and disappear on their own if
 * nobody walks over them in time (`CONFIG.items.ttl`). They only pause
 * during the 'transition' banner, when players are frozen as well.
 *
 * Types:
 *  - heart   : restores 1 life (falls back to bonus score if already at max)
 *  - energy  : instantly clears the current skill cooldown
 *  - shield  : grants a few seconds of shield (same as the Shield skill)
 *  - score   : flat bonus score
 *  - mystery : 50/50 gamble — good outcome (heal/energy/shield/big score,
 *              picked uniformly among those 4) or bad outcome (temporary
 *              hitbox growth, control slow, skill cooldown reset, or a
 *              screen-static overlay, picked uniformly among those 4).
 *              See collect() below; bad outcomes are always non-lethal.
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
    // Pickups only truly freeze during 'transition' (the wave-announcement
    // banner), where players themselves are frozen (updatePlayers(0, ...))
    // and couldn't reach an item anyway. During 'draining' the wave has
    // simply stopped spawning new threats — players are still moving and
    // dodging, so existing items must keep aging and stay collectible or
    // they silently become unpickable until itemSystem.clear() wipes them.
    const phase = this.game.state.wavePhase;
    if (phase === 'transition') return;

    const cfg = CONFIG.items;
    if (phase === 'active') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.trySpawn();
        this.spawnTimer = this.rollSpawnDelay();
      }
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
          // Already at max lives: no score fallback (score item is the only
          // thing that should award score) — just a "wasted" pickup with a
          // neutral popup so it's clear something happened.
          game.spawnScorePopup(item.x, item.y, 0, color, 'เต็มแล้ว!');
        }
        break;
      case 'energy':
        player.skillCooldown = 0;
        game.spawnScorePopup(item.x, item.y, 0, color, 'สกิลพร้อม!');
        break;
      case 'shield':
        player.shieldCharges = Math.min(cfg.shieldMaxCharges, player.shieldCharges + cfg.shieldHits);
        game.addSkillEffect('shield', player, 0.6, { maxRadius: 32 });
        game.spawnScorePopup(item.x, item.y, 0, color, 'โล่!');
        break;
      case 'score':
        player.score += cfg.scoreValue;
        game.spawnScorePopup(item.x, item.y, cfg.scoreValue, color);
        break;
      case 'mystery':
        this.resolveMysteryBox(item, player);
        break;
      default:
        player.score += cfg.scoreValue;
        game.spawnScorePopup(item.x, item.y, cfg.scoreValue, color);
        break;
    }
  }

  /**
   * Mystery Box resolution (user-requested "50/50 balanced" gamble item):
   * a hard 50/50 roll picks the good/bad side first — independent of
   * `CONFIG.items.weights`, which only controls how often a Mystery Box
   * itself appears, not what it does once opened — then a second, equally
   * weighted roll (25% each) picks one of that side's 4 sub-effects. See
   * `CONFIG.items.mystery` for every magnitude/duration used below.
   */
  resolveMysteryBox(item, player) {
    const game = this.game;
    const cfg = CONFIG.items;
    const mcfg = cfg.mystery;
    const good = Math.random() < 0.5;
    const color = ITEM_COLORS.mystery;

    game.particles.spawn(item.x, item.y, color, 30);
    game.state.shakeMag = Math.max(game.state.shakeMag, good ? 4 : 6);

    if (good) {
      const roll = Math.floor(Math.random() * 4);
      if (roll === 0) {
        if (player.lives < CONFIG.lives.max) {
          player.lives = Math.min(CONFIG.lives.max, player.lives + 1);
          player.invulnerable = Math.max(player.invulnerable, 0.35);
          game.addSkillEffect('heal', player, 0.9, { maxRadius: 58 });
          game.spawnScorePopup(item.x, item.y, 0, color, '🎁 +1 ชีวิต!');
        } else {
          game.spawnScorePopup(item.x, item.y, 0, color, '🎁 เต็มแล้ว!');
        }
      } else if (roll === 1) {
        player.skillCooldown = 0;
        game.spawnScorePopup(item.x, item.y, 0, color, '🎁 สกิลพร้อม!');
      } else if (roll === 2) {
        player.shieldCharges = Math.min(cfg.shieldMaxCharges, player.shieldCharges + cfg.shieldHits);
        game.addSkillEffect('shield', player, 0.6, { maxRadius: 32 });
        game.spawnScorePopup(item.x, item.y, 0, color, '🎁 โล่!');
      } else {
        const bonus = cfg.scoreValue * mcfg.scoreMultiplier;
        player.score += bonus;
        game.spawnScorePopup(item.x, item.y, bonus, color, '🎁');
      }
      return;
    }

    const roll = Math.floor(Math.random() * 4);
    if (roll === 0) {
      player.r = player.baseR * mcfg.hitboxScale;
      player.hitboxTimer = mcfg.hitboxDuration;
      game.spawnScorePopup(item.x, item.y, 0, color, '💀 ตัวใหญ่ขึ้น!');
    } else if (roll === 1) {
      player.controlDebuffMult = mcfg.controlDebuffMult;
      player.controlDebuffTimer = mcfg.controlDebuffDuration;
      game.spawnScorePopup(item.x, item.y, 0, color, '💀 ควบคุมหน่วง!');
    } else if (roll === 2) {
      if (player.skillBaseCooldown > 0) player.skillCooldown = player.skillBaseCooldown;
      game.spawnScorePopup(item.x, item.y, 0, color, '💀 คูลดาวน์เต็ม!');
    } else {
      game.state.staticRemaining = Math.max(game.state.staticRemaining, mcfg.staticDuration);
      game.spawnScorePopup(item.x, item.y, 0, color, '💀 สัญญาณรบกวน!');
    }
  }
}
