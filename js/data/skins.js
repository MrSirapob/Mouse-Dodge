export const SKIN_RARITIES = Object.freeze({
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
  MYTHIC: 'Mythic',
});

export const RARITY_CONFIG = Object.freeze({
  Common: { weight: 55, scrap: 10, tier: 1 },
  Uncommon: { weight: 25, scrap: 15, tier: 2 },
  Rare: { weight: 12, scrap: 25, tier: 3 },
  Epic: { weight: 6, scrap: 50, tier: 4 },
  Legendary: { weight: 1.8, scrap: 100, tier: 5 },
  Mythic: { weight: 0.2, scrap: 250, tier: 6 },
});

const skin = (id, name, rarity, shape, color, secondaryColor, glow, trail, particle, deathEffect) => ({
  id, name, rarity, shape, color, secondaryColor, glow, trail, particle, deathEffect,
});

export const DEFAULT_SKIN = Object.freeze({
  id: 'default', name: 'Default', rarity: 'Default', shape: 'circle',
  color: null, secondaryColor: null, glow: false, trail: false, particle: false, deathEffect: 'default',
});

// Rarity assignment below is ranked purely by how "เท่/สวย" (cool/beautiful)
// each skin's color theme reads — plain single-hue pastels sit in Common,
// richer contrast + thematic palettes climb toward Mythic. See
// CHANGELOG.md for the re-rank pass and which skins swapped tiers.
export const SKINS = Object.freeze([
  // --- Common: plain single-hue pastel gradients ---
  skin('sun', 'Sun Core', 'Common', 'hex', '#ffd166', '#fff4b8', 0, 'none', 'none', 'burst'),
  skin('azure', 'Azure', 'Common', 'diamond', '#5dade2', '#d6f4ff', 0, 'none', 'none', 'burst'),
  skin('violet', 'Violet', 'Common', 'diamond', '#9b7bff', '#e3d9ff', 0, 'none', 'none', 'burst'),
  skin('rose', 'Rose', 'Common', 'hex', '#ff6b9d', '#ffd1e1', 0, 'none', 'none', 'burst'),
  skin('mint', 'Mint Pulse', 'Common', 'circle', '#2ecc9d', '#c8ffe8', 0, 'none', 'none', 'burst'),
  skin('ember', 'Ember', 'Common', 'circle', '#ff7b54', '#ffd166', 0, 'none', 'none', 'burst'),

  // --- Uncommon: soft glow, a bit more vivid/thematic ---
  skin('frost', 'Frost', 'Uncommon', 'circle', '#8ee7ff', '#e9fcff', 5, 'soft', 'none', 'burst'),
  skin('toxic', 'Toxic', 'Uncommon', 'diamond', '#9cff57', '#e7ffc9', 5, 'soft', 'none', 'burst'),
  skin('plasma', 'Plasma', 'Uncommon', 'hex', '#ff9f43', '#ffe0b2', 6, 'soft', 'none', 'burst'),
  skin('sakura', 'Sakura', 'Uncommon', 'diamond', '#ff8fbd', '#ffe1ee', 6, 'soft', 'none', 'burst'),
  skin('ocean', 'Ocean', 'Uncommon', 'hex', '#38d9ff', '#d4f8ff', 6, 'soft', 'none', 'burst'),

  // --- Rare: stronger contrast pairs, moody/fiery/toxic themes ---
  skin('venomshard', 'Venomshard', 'Rare', 'diamond', '#7cff3d', '#0b3d0b', 12, 'line', 'spark', 'ring'),
  skin('cyber', 'Cyber', 'Rare', 'hex', '#00e5ff', '#ffffff', 10, 'line', 'spark', 'ring'),
  skin('void', 'Void', 'Rare', 'circle', '#8f6bff', '#d8cfff', 12, 'line', 'spark', 'ring'),
  skin('inferno', 'Inferno', 'Rare', 'diamond', '#ff4d4d', '#ffd166', 12, 'line', 'spark', 'ring'),

  // --- Epic: hacker/glitch/nature palettes with real visual flair ---
  skin('deepweb', 'Deep Web', 'Epic', 'square', '#00c2ff', '#001a2e', 16, 'glitch', 'spark', 'glitch'),
  skin('glacialcrown', 'Glacial Crown', 'Epic', 'hex', '#bdf3ff', '#5dade2', 18, 'star', 'star', 'ring'),
  skin('aurora', 'Aurora', 'Epic', 'hex', '#69f0ae', '#7cddff', 18, 'rainbow', 'star', 'prism'),
  skin('glitch', 'Glitch', 'Epic', 'square', '#f15cff', '#63f3ff', 16, 'glitch', 'spark', 'glitch'),
  skin('starfall', 'Starfall', 'Epic', 'diamond', '#fff1a8', '#b8a1ff', 18, 'star', 'star', 'ring'),
  skin('bloodmoon', 'Blood Moon', 'Epic', 'circle', '#ff2e2e', '#1a0000', 18, 'rainbow', 'star', 'ring'),

  // --- Legendary: bold two-tone palettes, no repeated hue family, each
  //     paired with a shape that hasn't already been used at this tier so
  //     every Legendary reads as its own distinct silhouette + color ---
  skin('prism', 'Prism', 'Legendary', 'hex', '#eafcff', '#ff2fe0', 28, 'orbit', 'star', 'prism'),
  skin('celestial', 'Celestial', 'Legendary', 'star', '#fff8e1', '#ffb300', 27, 'orbit', 'star', 'nova'),
  skin('solarforge', 'Solar Forge', 'Legendary', 'diamond', '#ff8c00', '#d7263d', 28, 'orbit', 'star', 'nova'),
  skin('phoenixflare', 'Phoenix Flare', 'Legendary', 'square', '#ff3d00', '#ffea00', 28, 'orbit', 'star', 'nova'),
  skin('shadowmonarch', 'Shadow Monarch', 'Legendary', 'circle', '#120021', '#c026ff', 27, 'orbit', 'spark', 'nova'),

  // --- Mythic: darkest darks / brightest brights, high-saturation accent
  //     against a near-black or near-white base so each reads as
  //     unmistakably the top of the pyramid, no two sharing a shape ---
  skin('singularity', 'Singularity', 'Mythic', 'void', '#ece3ff', '#5b21b6', 34, 'blackhole', 'void', 'singularity'),
  skin('chronoshift', 'Chronoshift', 'Mythic', 'diamond', '#00e5ff', '#050a24', 34, 'blackhole', 'star', 'prism'),
  skin('voidreaper', 'Void Reaper', 'Mythic', 'circle', '#0d0016', '#f000ff', 34, 'blackhole', 'void', 'singularity'),
  skin('astralsovereign', 'Astral Sovereign', 'Mythic', 'star', '#ffffff', '#635bff', 36, 'rainbow', 'star', 'prism'),
]);

export const SKIN_BY_ID = Object.freeze(
  Object.fromEntries([DEFAULT_SKIN, ...SKINS].map((s) => [s.id, s])),
);

export const SKINS_BY_RARITY = Object.freeze(
  Object.fromEntries(Object.keys(RARITY_CONFIG).map((rarity) => [
    rarity, SKINS.filter((s) => s.rarity === rarity),
  ])),
);

export const RARITY_ORDER = Object.freeze(Object.keys(RARITY_CONFIG));
export const TOTAL_RARITY_WEIGHT = Object.values(RARITY_CONFIG).reduce((sum, r) => sum + r.weight, 0);
