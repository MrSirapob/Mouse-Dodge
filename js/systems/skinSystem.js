import {
  DEFAULT_SKIN,
  RARITY_CONFIG,
  RARITY_ORDER,
  SKIN_BY_ID,
  SKINS,
  SKINS_BY_RARITY,
  TOTAL_RARITY_WEIGHT,
} from '../data/skins.js?v=20260829-kt89';

const STORAGE_KEY = 'waveDodgeSkinData';
const SAVE_VERSION = 1;
const LOG_PREFIX = '[SkinSystem]';

function log(event, details = null) {
  if (details == null) console.log(`${LOG_PREFIX} ${event}`);
  else console.log(`${LOG_PREFIX} ${event}`, details);
}

function warn(event, details = null) {
  if (details == null) console.warn(`${LOG_PREFIX} ${event}`);
  else console.warn(`${LOG_PREFIX} ${event}`, details);
}

function safeInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export class SkinSystem {
  constructor({ ui = null, onEquip = null } = {}) {
    this.ui = ui;
    // Called with the newly-equipped skin id whenever equip() succeeds, so
    // whoever owns the live Player entity (Game) can refresh its skinVisual
    // immediately instead of waiting for the next reset()/wave start — see
    // HANDOFF_LOG.md 2026-08-24 for the bug this closes (skin selector
    // showed the new skin instantly, but the actual in-run character kept
    // rendering the old one until a run restart).
    this.onEquip = onEquip;
    this.rewardedWaves = new Set();
    this.data = this.load();
    log('initialized', {
      equippedSkin: this.data.equippedSkin,
      ownedSkins: this.data.ownedSkins.length,
      cases: this.data.cases,
      scrap: this.data.scrap,
    });
  }

  load() {
    const fallback = { version: SAVE_VERSION, ownedSkins: ['default'], equippedSkin: 'default', cases: 0, scrap: 0 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        log('load: no save found, using defaults');
        return fallback;
      }
      const parsed = JSON.parse(raw);
      const owned = Array.isArray(parsed?.ownedSkins)
        ? [...new Set(parsed.ownedSkins.filter((id) => typeof id === 'string' && SKIN_BY_ID[id]))]
        : ['default'];
      if (!owned.includes('default')) owned.unshift('default');
      const equipped = typeof parsed?.equippedSkin === 'string' && owned.includes(parsed.equippedSkin)
        ? parsed.equippedSkin
        : 'default';
      return {
        version: SAVE_VERSION,
        ownedSkins: owned,
        equippedSkin: equipped,
        cases: safeInt(parsed?.cases),
        scrap: safeInt(parsed?.scrap),
      };
    } catch (error) {
      warn('load: invalid/corrupt save, using defaults', error);
      return fallback;
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      warn('save: localStorage unavailable', error);
    }
  }

  resetForNewRun() {
    this.rewardedWaves.clear();
    this.pendingToastForWave = null;
    log('new run: wave reward tracking reset');
  }

  getSkin(id) { return SKIN_BY_ID[id] || DEFAULT_SKIN; }
  getEquipped() { return this.getSkin(this.data.equippedSkin); }
  owns(id) { return this.data.ownedSkins.includes(id); }

  equip(id) {
    if (!this.owns(id)) {
      warn('equip rejected: skin not owned', { id });
      return false;
    }
    const previous = this.data.equippedSkin;
    this.data.equippedSkin = id;
    this.save();
    log('skin equipped', { previous, equipped: id });
    this.onEquip?.(id);
    return true;
  }

  addCases(amount = 1) {
    const n = safeInt(amount);
    if (!n) {
      warn('addCases ignored: invalid amount', { amount });
      return false;
    }
    this.data.cases += n;
    this.save();
    log('cases added', { amount: n, cases: this.data.cases });
    return true;
  }

  rollRarity(random = Math.random) {
    let r = random() * TOTAL_RARITY_WEIGHT;
    for (const rarity of RARITY_ORDER) {
      r -= RARITY_CONFIG[rarity].weight;
      if (r < 0) return rarity;
    }
    return RARITY_ORDER[RARITY_ORDER.length - 1];
  }

  consumeCase(random = Math.random) {
    if (this.data.cases <= 0) {
      warn('consume case rejected: no cases');
      return { ok: false, reason: 'no_cases' };
    }
    const casesBefore = this.data.cases;
    this.data.cases -= 1;
    const rarity = this.rollRarity(random);
    this.save();
    log('case consumed', {
      casesBefore,
      casesAfter: this.data.cases,
      rarity
    });
    return { ok: true, rarity, cases: this.data.cases };
  }

  awardSkin(skinId) {
    const item = SKINS.find(s => s.id === skinId);
    if (!item) {
      warn('award skin rejected: invalid skin id', { skinId });
      return { ok: false, reason: 'invalid_skin' };
    }
    let duplicate = false;
    let scrap = 0;
    if (this.owns(item.id)) {
      duplicate = true;
      scrap = RARITY_CONFIG[item.rarity].scrap;
      this.data.scrap += scrap;
    } else {
      this.data.ownedSkins.push(item.id);
    }
    this.save();
    log('skin awarded', {
      skin: item.id,
      duplicate,
      scrapGained: scrap,
      totalScrap: this.data.scrap,
    });
    return { ok: true, item, rarity: item.rarity, duplicate, scrap, cases: this.data.cases, totalScrap: this.data.scrap };
  }

  awardCaseForWave(wave) {
    const n = Number(wave);
    if (![5, 10, 15, 20].includes(n)) return false;
    if (this.rewardedWaves.has(n)) {
      warn('wave case reward blocked: already rewarded this run', { wave: n });
      return false;
    }
    this.rewardedWaves.add(n);
    this.addCases(1);
    
    if (n === 20) {
      this.ui?.showSkinRewardToast?.('REWARD', '+1 CASE');
    } else {
      this.pendingToastForWave = n + 1;
    }
    
    log('wave case reward granted', { wave: n, cases: this.data.cases });
    return true;
  }

  // CS:GO-style weighted rarity roll: each rarity tier keeps its own
  // RARITY_CONFIG odds (Rare far more likely than Mythic). Used both for the
  // spin's actual result and to populate filler slots in the visual reel.
  rollWeightedRarity(rarities, random = Math.random) {
    let totalWeight = 0;
    for (const r of rarities) totalWeight += RARITY_CONFIG[r].weight;
    let roll = random() * totalWeight;
    for (const r of rarities) {
      roll -= RARITY_CONFIG[r].weight;
      if (roll < 0) return r;
    }
    return rarities[rarities.length - 1];
  }

  // Phase 1 of the scrap-100 exchange: deduct scrap and roll only the
  // *rarity tier* (CS:GO odds, restricted to Rare/Epic/Legendary/Mythic
  // tiers that still have an unowned skin). The UI spins a reel against
  // this rarity and calls finalizeExchangeRarePlus() with whatever item
  // the reel actually lands on — mirrors consumeCase()/awardSkin() below.
  beginExchangeRarePlus(random = Math.random) {
    const cost = 100;
    if (this.data.scrap < cost) {
      warn('scrap exchange rejected: not enough scrap', { cost, scrap: this.data.scrap });
      return { ok: false, reason: 'not_enough_scrap' };
    }
    const eligibleRarities = ['Rare', 'Epic', 'Legendary', 'Mythic']
      .filter((r) => SKINS_BY_RARITY[r].some((s) => !this.owns(s.id)));
    if (!eligibleRarities.length) {
      warn('scrap exchange rejected: no unowned Rare+ skins');
      return { ok: false, reason: 'no_unowned_rare_plus' };
    }
    const rarity = this.rollWeightedRarity(eligibleRarities, random);
    this.data.scrap -= cost;
    this.save();
    log('scrap exchange started: CS:GO-style rarity roll', { cost, rarity, scrapRemaining: this.data.scrap });
    return { ok: true, rarity };
  }

  // Phase 2: apply whatever unowned skin the reel landed on. Refunds the
  // scrap if the id is somehow invalid/already-owned (shouldn't happen —
  // the reel is only ever populated from unowned Rare+ skins — but a
  // refund keeps a stray bug from just eating the player's scrap).
  finalizeExchangeRarePlus(skinId) {
    const item = SKINS.find((s) => s.id === skinId);
    if (!item || !['Rare', 'Epic', 'Legendary', 'Mythic'].includes(item.rarity) || this.owns(item.id)) {
      warn('exchange finalize rejected: invalid/owned skin, refunding scrap', { skinId });
      this.data.scrap += 100;
      this.save();
      return { ok: false, reason: 'invalid_skin' };
    }
    this.data.ownedSkins.push(item.id);
    this.save();
    log('scrap exchanged for random Rare+', { skin: item.id, rarity: item.rarity, scrapRemaining: this.data.scrap });
    return { ok: true, item, duplicate: false, scrap: 0 };
  }

  buildVisual(id = this.data.equippedSkin) {
    const s = this.getSkin(id);
    if (s.id === 'default') return { id: 'default', tier: 0, color: null, secondaryColor: null, shape: 'circle', glow: 12, trail: 'default', particle: false, deathEffect: 'default' };
    return {
      id: s.id,
      tier: RARITY_CONFIG[s.rarity].tier,
      color: s.color,
      secondaryColor: s.secondaryColor,
      shape: s.shape,
      glow: s.glow,
      trail: s.trail,
      particle: s.particle,
      deathEffect: s.deathEffect,
    };
  }

  snapshot() {
    return { ...this.data, ownedSkins: [...this.data.ownedSkins] };
  }
}

export { STORAGE_KEY as SKIN_STORAGE_KEY };
