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

export const SKINS = Object.freeze([
  skin('mint', 'Mint Pulse', 'Common', 'circle', '#2ecc9d', '#c8ffe8', 0, 'none', 'none', 'burst'),
  skin('ember', 'Ember', 'Common', 'circle', '#ff7b54', '#ffd166', 0, 'none', 'none', 'burst'),
  skin('azure', 'Azure', 'Common', 'diamond', '#5dade2', '#d6f4ff', 0, 'none', 'none', 'burst'),
  skin('violet', 'Violet', 'Common', 'diamond', '#9b7bff', '#e3d9ff', 0, 'none', 'none', 'burst'),
  skin('sun', 'Sun Core', 'Common', 'hex', '#ffd166', '#fff4b8', 0, 'none', 'none', 'burst'),
  skin('rose', 'Rose', 'Common', 'hex', '#ff6b9d', '#ffd1e1', 0, 'none', 'none', 'burst'),

  skin('frost', 'Frost', 'Uncommon', 'circle', '#8ee7ff', '#e9fcff', 5, 'soft', 'none', 'burst'),
  skin('toxic', 'Toxic', 'Uncommon', 'diamond', '#9cff57', '#e7ffc9', 5, 'soft', 'none', 'burst'),
  skin('plasma', 'Plasma', 'Uncommon', 'hex', '#ff9f43', '#ffe0b2', 6, 'soft', 'none', 'burst'),
  skin('sakura', 'Sakura', 'Uncommon', 'diamond', '#ff8fbd', '#ffe1ee', 6, 'soft', 'none', 'burst'),
  skin('ocean', 'Ocean', 'Uncommon', 'hex', '#38d9ff', '#d4f8ff', 6, 'soft', 'none', 'burst'),

  skin('cyber', 'Cyber', 'Rare', 'hex', '#00e5ff', '#ffffff', 10, 'line', 'spark', 'ring'),
  skin('void', 'Void', 'Rare', 'circle', '#8f6bff', '#d8cfff', 12, 'line', 'spark', 'ring'),
  skin('inferno', 'Inferno', 'Rare', 'diamond', '#ff4d4d', '#ffd166', 12, 'line', 'spark', 'ring'),
  skin('aurora', 'Aurora', 'Rare', 'hex', '#69f0ae', '#7cddff', 10, 'line', 'spark', 'ring'),

  skin('glitch', 'Glitch', 'Epic', 'square', '#f15cff', '#63f3ff', 16, 'glitch', 'spark', 'glitch'),
  skin('starfall', 'Starfall', 'Epic', 'diamond', '#fff1a8', '#b8a1ff', 18, 'star', 'star', 'ring'),
  skin('prism', 'Prism', 'Epic', 'hex', '#ffffff', '#ff8bd1', 18, 'rainbow', 'star', 'prism'),

  skin('celestial', 'Celestial', 'Legendary', 'star', '#fff6cf', '#ffd93d', 26, 'orbit', 'star', 'nova'),
  skin('singularity', 'Singularity', 'Mythic', 'void', '#d8c7ff', '#7c4dff', 34, 'blackhole', 'void', 'singularity'),

  // --- High-tier additions ---
  skin('bloodmoon', 'Blood Moon', 'Epic', 'circle', '#ff2e2e', '#1a0000', 18, 'rainbow', 'star', 'ring'),
  skin('venomshard', 'Venomshard', 'Epic', 'diamond', '#7cff3d', '#0b3d0b', 18, 'glitch', 'spark', 'glitch'),
  skin('deepweb', 'Deep Web', 'Epic', 'square', '#00c2ff', '#001a2e', 16, 'glitch', 'spark', 'glitch'),

  skin('phoenixflare', 'Phoenix Flare', 'Legendary', 'star', '#ff9f43', '#ff2e2e', 28, 'orbit', 'star', 'nova'),
  skin('glacialcrown', 'Glacial Crown', 'Legendary', 'hex', '#bdf3ff', '#5dade2', 27, 'orbit', 'star', 'ring'),
  skin('shadowmonarch', 'Shadow Monarch', 'Legendary', 'star', '#3a2a5c', '#8f6bff', 27, 'orbit', 'spark', 'nova'),
  skin('solarforge', 'Solar Forge', 'Legendary', 'hex', '#ffd93d', '#ff7b00', 28, 'orbit', 'star', 'nova'),

  skin('voidreaper', 'Void Reaper', 'Mythic', 'void', '#1a0033', '#c77dff', 34, 'blackhole', 'void', 'singularity'),
  skin('chronoshift', 'Chronoshift', 'Mythic', 'void', '#00fff2', '#0a1e3f', 34, 'blackhole', 'star', 'prism'),
  skin('astralsovereign', 'Astral Sovereign', 'Mythic', 'star', '#ffffff', '#ffd166', 36, 'rainbow', 'star', 'prism'),
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
