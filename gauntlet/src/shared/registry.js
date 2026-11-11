// ============================================================================
// DAILY GAUNTLET — Central Mini-Game Registry
// Each mini-game in src/games/<id>/game.js registers its metadata and mount fn
// ============================================================================

const MINI_GAME_SPECS = [];
const MINI_GAME_REGISTRY = {};

function registerMiniGame(spec) {
  if (!spec || !spec.id) {
    throw new Error('registerMiniGame requires a valid spec with an id');
  }
  const normalized = {
    id: spec.id,
    name: spec.name,
    shortName: spec.shortName || spec.name,
    emoji: spec.emoji || '🧩',
    mount: spec.mount
  };
  MINI_GAME_REGISTRY[normalized.id] = normalized;
  const existingIdx = MINI_GAME_SPECS.findIndex((s) => s.id === normalized.id);
  if (existingIdx !== -1) {
    MINI_GAME_SPECS[existingIdx] = normalized;
  } else {
    MINI_GAME_SPECS.push(normalized);
  }
  return normalized;
}

function getMiniGameSpec(id) {
  return MINI_GAME_REGISTRY[id] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    MINI_GAME_SPECS,
    MINI_GAME_REGISTRY,
    registerMiniGame,
    getMiniGameSpec
  });
}
