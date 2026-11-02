// ============================================================================
// DAILY GAUNTLET — Shared Deterministic PRNG & Date Utilities
// ============================================================================

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seedInt) {
  let a = seedInt >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createPRNG(seedString) {
  return mulberry32(hashString(String(seedString)));
}

function seededShuffle(array, rng) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function formatDateYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYMD(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDayNumberForDate(dateStr) {
  const target = parseYMD(dateStr);
  const epoch = new Date(2025, 0, 1); // Jan 1, 2025 = #1
  const diffDays = Math.floor((target - epoch) / 86400000) + 1;
  return diffDays;
}

function formatShortDate(dateStr) {
  const todayStr = formatDateYMD(new Date());
  if (dateStr === todayStr) return 'Today';
  const d = parseYMD(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function shiftDateStr(dateStr, deltaDays) {
  const d = parseYMD(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return formatDateYMD(d);
}

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, {
    hashString,
    mulberry32,
    createPRNG,
    seededShuffle,
    formatDateYMD,
    parseYMD,
    getDayNumberForDate,
    formatShortDate,
    shiftDateStr
  });
}
