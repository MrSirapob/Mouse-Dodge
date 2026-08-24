// tests/unit/skin-collection-progress.test.mjs
//
// Regression coverage for the Skin Collection screen's two additions:
//   1. Collection Progress (overall "N / total COLLECTED" + per-rarity
//      breakdown), computed from SKINS (the real catalog) vs the real
//      SkinSystem-owned skin list — never hardcoded.
//   2. Missing Skin / Silhouette — a LOCKED card must render a silhouette
//      placeholder (no real shape/color) while still showing its rarity;
//      an OWNED card must still render the real skin visual exactly as
//      before.
//
// This calls the real UI.prototype.renderSkinScreen against a minimal fake
// `this` (fake DOM elements that just capture innerHTML/textContent) so the
// actual production code path is exercised without needing a full DOM/
// browser environment for the rest of the UI class.

import { TestSuite, assert, assertEqual } from '../helpers/assertions.mjs';
import { UI } from '../../js/ui/ui.js?v=20260824-75fj';
import { SkinSystem } from '../../js/systems/skinSystem.js?v=20260824-75fj';
import { SKINS } from '../../js/data/skins.js?v=20260824-75fj';

/** Minimal localStorage shim so a real SkinSystem can load()/save() in Node. */
function makeMemoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

/** Fake element: just enough to satisfy renderSkinScreen's DOM touches. */
function fakeEl() {
  return {
    _innerHTML: '',
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = v; },
    textContent: '',
    disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    querySelectorAll: () => [],
  };
}

/** Builds a fake `this` for UI.prototype.renderSkinScreen.call(fakeCtx),
 * backed by a real SkinSystem so ownedSkins/equippedSkin/scrap/cases are
 * the genuine SkinSystem data model, not reimplemented. */
function makeRenderCtx() {
  globalThis.localStorage = makeMemoryStorage();
  const skinSystem = new SkinSystem({ ui: null });
  return {
    skinSystem,
    skinGrid: fakeEl(),
    skinCollectionProgress: fakeEl(),
    skinCaseCount: fakeEl(),
    skinScrapCount: fakeEl(),
    exchangeRarePlusBtn: fakeEl(),
    openSkinCaseBtn: fakeEl(),
    exchangeRarePlusConfirmRow: fakeEl(),
    skinCaseBusy: false,
    cancelExchangeRarePlus: UI.prototype.cancelExchangeRarePlus,
  };
}

export async function run() {
  const s = new TestSuite('SKIN COLLECTION PROGRESS + SILHOUETTE');
  const totalSkins = SKINS.length; // real catalog size — never hardcoded in the test either

  s.test('0 owned: progress reads "0 / total COLLECTED" and every card is locked', () => {
    const ctx = makeRenderCtx();
    UI.prototype.renderSkinScreen.call(ctx);
    assert(ctx.skinCollectionProgress.innerHTML.includes(`0 / ${totalSkins} COLLECTED`), 'headline should show 0 owned out of the real catalog total', {
      likely: 'js/ui/ui.js renderSkinScreen() collection-progress block',
    });
    assert(!ctx.skinCollectionProgress.innerHTML.includes('COLLECTION COMPLETE'), '0/total should not claim collection complete');
    const lockedCount = (ctx.skinGrid.innerHTML.match(/class="skin-card locked/g) || []).length;
    assertEqual(lockedCount, totalSkins, 'every real (non-default) skin should render as a locked card at 0 owned', {
      likely: 'js/ui/ui.js renderSkinScreen() card markup',
    });
  });

  s.test('partial ownership: progress count matches actual ownedSkins, owned cards show the real visual, locked cards show a silhouette', () => {
    const ctx = makeRenderCtx();
    // Own a known slice directly via the real ownedSkins array (SkinSystem's
    // actual storage), not a reimplemented count.
    const ownedIds = SKINS.slice(0, 5).map((s2) => s2.id);
    ctx.skinSystem.data.ownedSkins.push(...ownedIds);
    UI.prototype.renderSkinScreen.call(ctx);

    assert(ctx.skinCollectionProgress.innerHTML.includes(`5 / ${totalSkins} COLLECTED`), 'headline should reflect the real 5-owned count', {
      likely: 'js/ui/ui.js renderSkinScreen() collection-progress block',
    });

    const ownedSkin = SKINS[0];
    const lockedSkin = SKINS.find((s2) => !ownedIds.includes(s2.id));
    const ownedCardMatch = ctx.skinGrid.innerHTML.match(new RegExp(`data-skin-id="${ownedSkin.id}"[\\s\\S]*?</button>`));
    const lockedCardMatch = ctx.skinGrid.innerHTML.match(new RegExp(`data-skin-id="${lockedSkin.id}"[\\s\\S]*?</button>`));
    assert(!!ownedCardMatch, 'owned card markup should exist');
    assert(!!lockedCardMatch, 'locked card markup should exist');

    assert(ownedCardMatch[0].includes(`skin-shape-${ownedSkin.shape}`), 'an OWNED card should still render the real skin-shape glyph, unchanged', {
      likely: 'js/ui/ui.js renderSkinScreen() previewInner for owned cards',
    });
    assert(ownedCardMatch[0].includes(`--skin:${ownedSkin.color}`), 'an OWNED card should still carry its real --skin color variable, unchanged', {
      likely: 'js/ui/ui.js renderSkinScreen() previewStyle for owned cards',
    });

    assert(lockedCardMatch[0].includes('skin-silhouette'), 'a LOCKED card should render the silhouette placeholder, not the real shape', {
      likely: 'js/ui/ui.js renderSkinScreen() previewInner for locked cards',
    });
    assert(!lockedCardMatch[0].includes(`skin-shape-${lockedSkin.shape}`), 'a LOCKED card must NOT reveal the real skin-shape glyph before it is unlocked', {
      likely: 'js/ui/ui.js renderSkinScreen() previewInner for locked cards',
    });
    assert(!lockedCardMatch[0].includes(`--skin:${lockedSkin.color}`), 'a LOCKED card must NOT reveal the real skin color before it is unlocked', {
      likely: 'js/ui/ui.js renderSkinScreen() previewStyle for locked cards',
    });
    assert(lockedCardMatch[0].includes(`rarity-${lockedSkin.rarity.toLowerCase()}`), 'a LOCKED card should still show its real rarity class (border/label), just not the exact visual', {
      likely: 'js/ui/ui.js renderSkinScreen() card markup',
    });
  });

  s.test('full ownership: progress reads "total / total COLLECTED" and shows COLLECTION COMPLETE', () => {
    const ctx = makeRenderCtx();
    ctx.skinSystem.data.ownedSkins.push(...SKINS.map((s2) => s2.id));
    UI.prototype.renderSkinScreen.call(ctx);
    assert(ctx.skinCollectionProgress.innerHTML.includes(`${totalSkins} / ${totalSkins} COLLECTED`), 'headline should show every real skin owned', {
      likely: 'js/ui/ui.js renderSkinScreen() collection-progress block',
    });
    assert(ctx.skinCollectionProgress.innerHTML.includes('COLLECTION COMPLETE'), 'full ownership should show the COLLECTION COMPLETE status', {
      likely: 'js/ui/ui.js renderSkinScreen() collection-progress block',
    });
    const lockedCount = (ctx.skinGrid.innerHTML.match(/class="skin-card locked/g) || []).length;
    assertEqual(lockedCount, 0, 'no card should be locked once every skin is owned', {
      likely: 'js/ui/ui.js renderSkinScreen() card markup',
    });
  });

  s.test('progress updates immediately after a new skin is awarded (awardSkin), no reload needed', () => {
    const ctx = makeRenderCtx();
    UI.prototype.renderSkinScreen.call(ctx);
    assert(ctx.skinCollectionProgress.innerHTML.includes(`0 / ${totalSkins} COLLECTED`), 'sanity check: starts at 0 owned', {
      likely: 'test setup',
    });

    ctx.skinSystem.awardSkin(SKINS[0].id);
    UI.prototype.renderSkinScreen.call(ctx);

    assert(ctx.skinCollectionProgress.innerHTML.includes(`1 / ${totalSkins} COLLECTED`), 're-rendering after awardSkin() should bump the progress count, driven by the real SkinSystem state', {
      likely: 'js/ui/ui.js renderSkinScreen() collection-progress block',
    });
  });

  s.test('per-rarity breakdown shows every real rarity tier with correct owned/total counts', () => {
    const ctx = makeRenderCtx();
    const rareSkins = SKINS.filter((s2) => s2.rarity === 'Rare');
    ctx.skinSystem.data.ownedSkins.push(rareSkins[0].id);
    UI.prototype.renderSkinScreen.call(ctx);
    assert(ctx.skinCollectionProgress.innerHTML.includes(`>1 / ${rareSkins.length}<`), 'Rare row should show 1 owned out of the real Rare-tier count', {
      likely: 'js/ui/ui.js renderSkinScreen() rarityRows',
    });
    const commonSkins = SKINS.filter((s2) => s2.rarity === 'Common');
    assert(ctx.skinCollectionProgress.innerHTML.includes(`>0 / ${commonSkins.length}<`), 'Common row should show 0 owned out of the real Common-tier count', {
      likely: 'js/ui/ui.js renderSkinScreen() rarityRows',
    });
  });

  return s;
}
