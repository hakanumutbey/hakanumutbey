/**
 * HENTW PREMIUM — Sonsuz Uzay · saf oyun mantığı (DOM'suz, test edilebilir)
 * Sonsuz hayatta kalma: malzeme topla, barınak inşa et, canavarlardan kaç ya da savaş.
 */

// ——— Harita ———
export const ARENA_HALF = 200; // 400x400 birim alan
export const WALL_MARGIN = 4; // yumuşak duvar payı

// ——— Oyuncu ———
export const PLAYER_MAX_HP = 60; // 3 kalp
export const HEART_HP = 20; // 1 kalp = 20 can
export const PLAYER_SPEED = 8.5;

// ——— Malzemeler ———
export const MATERIALS = { KRISTAL: "kristal", METAL: "metal" };

// ——— Yapılar (barınak) ———
export const BUILDINGS = {
  wall: {
    id: "wall",
    name: "DUVAR",
    cost: { kristal: 2, metal: 3 },
    hp: 45,
    desc: "Canavarları durdurur",
  },
  turret: {
    id: "turret",
    name: "TARET",
    cost: { kristal: 3, metal: 5 },
    hp: 30,
    range: 16,
    damage: 4,
    fireInterval: 0.9,
    desc: "Otomatik ateş eder",
  },
  heal: {
    id: "heal",
    name: "CAN İSTASYONU",
    cost: { kristal: 5, metal: 3 },
    hp: 25,
    radius: 6,
    healPerSec: 4,
    desc: "Yakında durunca kalp doldurur",
  },
};
export const BUILD_ORDER = ["wall", "turret", "heal"]; // 1-2-3 tuşları

// ——— Envanter ———
export function createInventory(kristal = 0, metal = 0) {
  return { kristal: Math.max(0, kristal | 0), metal: Math.max(0, metal | 0) };
}

export function addMaterial(inv, type, n = 1) {
  const next = { ...inv };
  next[type] = Math.max(0, (next[type] || 0) + n);
  return next;
}

export function canAfford(inv, cost) {
  if (!inv || !cost) return false;
  return Object.keys(cost).every((k) => (inv[k] || 0) >= cost[k]);
}

/**
 * İnşa denemesi. Yeterli malzeme varsa maliyeti düşer, yoksa reddeder.
 * @returns {{ok:boolean, inventory:object, reason:string|null}}
 */
export function tryBuild(inv, buildingId) {
  const def = BUILDINGS[buildingId];
  if (!def) return { ok: false, inventory: { ...inv }, reason: "bilinmeyen" };
  if (!canAfford(inv, def.cost)) {
    return { ok: false, inventory: { ...inv }, reason: "malzeme" };
  }
  const next = { ...inv };
  for (const k of Object.keys(def.cost)) next[k] -= def.cost[k];
  return { ok: true, inventory: next, reason: null };
}

// ——— Tehlike / spawn ölçekleme (süre → zorluk) ———
export function dangerLevel(tSec) {
  const t = Math.max(0, Number(tSec) || 0);
  return Math.min(10, 1 + Math.floor(t / 50));
}

/** Canavar spawn aralığı (saniye) — tehlike arttıkça kısalır, asla 3 sn altına inmez. */
export function spawnInterval(tSec, easy = false) {
  const base = Math.max(3, 9 - dangerLevel(tSec) * 0.6);
  return easy ? base * 1.6 : base;
}

/** Aynı anda haritada olabilecek canavar sayısı — zamanla artar. */
export function maxMonsters(tSec, easy = false) {
  const cap = Math.min(18, 3 + dangerLevel(tSec) * 2);
  return Math.max(1, Math.floor(easy ? cap * 0.6 : cap));
}

/** Canavar gücü — zamanla artar ama oyuncudan (8.5) hep yavaş kalır: kaçmak hep mümkün. */
export function monsterStats(tSec, easy = false) {
  const d = dangerLevel(tSec);
  let hp = 10 + d * 4;
  let speed = Math.min(6.5, 3.2 + d * 0.35);
  if (easy) {
    hp = Math.round(hp * 0.7);
    speed = speed * 0.8;
  }
  return { hp, speed, damage: HEART_HP }; // vuruş başına 1 kalp
}

// ——— Saldırı dalgası ———
export const WAVE_PERIOD = 60; // saniyede bir dalga

/** t anında kaçıncı dalga (0 = henüz dalga yok). */
export function waveNumber(tSec) {
  return Math.floor(Math.max(0, tSec) / WAVE_PERIOD);
}

/** Dalga başına ekstra spawn olan canavar sayısı. */
export function waveBurstCount(tSec) {
  return Math.min(10, 2 + dangerLevel(tSec));
}

// ——— Skor ———
export function computeScore({ timeSec = 0, kristal = 0, metal = 0, kills = 0 } = {}) {
  return (
    Math.floor(Math.max(0, timeSec)) +
    Math.max(0, kristal) * 5 +
    Math.max(0, metal) * 3 +
    Math.max(0, kills) * 10
  );
}

// ——— Can / kalp kuralları ———
export function heartsFromHp(hp, maxHp = PLAYER_MAX_HP) {
  const clamped = Math.max(0, Math.min(maxHp, hp));
  return Math.ceil(clamped / HEART_HP);
}

export function applyPlayerDamage(hp, dmg) {
  return Math.max(0, hp - Math.max(0, dmg));
}

/** Can istasyonu: yavaşça doldurur, asla maksimumu aşmaz. */
export function healTick(hp, dt, rate = BUILDINGS.heal.healPerSec, maxHp = PLAYER_MAX_HP) {
  return Math.min(maxHp, Math.max(0, hp) + Math.max(0, rate) * Math.max(0, dt));
}

// ——— Harita sınırı: yumuşak duvar ———
export function arenaClamp(x, z, half = ARENA_HALF, margin = WALL_MARGIN) {
  const lim = half - margin;
  const cx = Math.max(-lim, Math.min(lim, x));
  const cz = Math.max(-lim, Math.min(lim, z));
  return { x: cx, z: cz, pushed: cx !== x || cz !== z };
}

// ——— Yardımcılar ———
export function distXZ(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

/** {x,z} taşıyan listede (x,z) noktasına en yakın elemanın indeksi; boşsa -1. */
export function pickNearest(items, x, z, maxDist = Infinity) {
  let best = -1;
  let bestD = maxDist;
  for (let i = 0; i < (items ? items.length : 0); i++) {
    const it = items[i];
    if (!it) continue;
    const d = distXZ(it.x, it.z, x, z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Seed'li rastgele (mulberry32) — prosedürel harita tekrar üretilebilir olsun. */
export function makeRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** World XZ → minimap piksel koordinatı. */
export function worldToMinimap(wx, wz, bounds, mapSize = 100) {
  const w = Math.max(1e-6, bounds.maxX - bounds.minX);
  const d = Math.max(1e-6, bounds.maxZ - bounds.minZ);
  const u = (wx - bounds.minX) / w;
  const v = (wz - bounds.minZ) / d;
  const size = Math.max(1, mapSize);
  return {
    x: Math.max(0, Math.min(1, u)) * size,
    y: Math.max(0, Math.min(1, v)) * size,
  };
}
