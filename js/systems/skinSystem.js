import {
  DEFAULT_SKIN,
  RARITY_CONFIG,
  RARITY_ORDER,
  SKIN_BY_ID,
  SKINS,
  SKINS_BY_RARITY,
  TOTAL_RARITY_WEIGHT,
} from '../data/skins.js?v=20260824-3pa8';

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
  constructor({ ui = null } = {}) {
    this.ui = ui;
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

  exchangeRandomRarePlus(random = Math.random) {
    const cost = 100;
    if (this.data.scrap < cost) {
      warn('scrap exchange rejected: not enough scrap', { cost, scrap: this.data.scrap });
      return { ok: false, reason: 'not_enough_scrap' };
    }
    const pool = SKINS.filter((s) => ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(s.rarity) && !this.owns(s.id));
    if (!pool.length) {
      warn('scrap exchange rejected: no unowned Rare+ skins');
      return { ok: false, reason: 'no_unowned_rare_plus' };
    }
    this.data.scrap -= cost;
    const item = pool[Math.floor(random() * pool.length)];
    this.data.ownedSkins.push(item.id);
    this.save();
    log('scrap exchanged for random Rare+', { cost, skin: item.id, scrapRemaining: this.data.scrap });
    return { ok: true, item, duplicate: false, scrap: 0 };
  }

  exchangeChooseRare(id) {
    const cost = 500;
    const item = this.getSkin(id);
    if (this.data.scrap < cost) {
      warn('scrap exchange rejected: not enough scrap', { cost, scrap: this.data.scrap, skin: id });
      return { ok: false, reason: 'not_enough_scrap' };
    }
    if (!item || item.rarity !== 'Rare' || this.owns(id)) {
      warn('scrap exchange rejected: invalid Rare skin', { skin: id });
      return { ok: false, reason: 'invalid_skin' };
    }
    this.data.scrap -= cost;
    this.data.ownedSkins.push(id);
    this.save();
    log('scrap exchanged for chosen Rare', { cost, skin: id, scrapRemaining: this.data.scrap });
    return { ok: true, item };
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
