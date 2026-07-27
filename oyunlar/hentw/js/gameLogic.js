/**
 * HENTW pure game logic — WebGL-free, unit-testable.
 * Imported by main.js and by node:test.
 */

export const QUEST = {
  PICK_GUN: "pick_gun",
  TALK_ROBOT: "talk_robot",
  EXIT_ROCKET: "exit_rocket",
  EXPLORE: "explore",
  FIND_SPHERE: "find_sphere",
  DEFEAT_BOSS: "defeat_boss",
  PICK_SHINE: "pick_shine",
  FIND_CRATE: "find_crate",
  TABLET: "tablet",
  /** Tablet sinyaliyle gizli NASA rölesini bul */
  FIND_SIGNAL: "find_signal",
  /** Röleyi etkinleştir — eve dönüş ipucu */
  ACTIVATE_RELAY: "activate_relay",
  /** Jole onarım jeli al */
  GET_JOLE: "get_jole",
  /** Jole ile roketi tamir et */
  REPAIR_ROCKET: "repair_rocket",
  /** Kalkış / uzay / düşüş sinematikleri (otomatik) */
  FINALE: "finale",
  DONE: "done",
};

export const QUEST_LABELS = {
  [QUEST.PICK_GUN]: "Işın tabancasını al (E)",
  [QUEST.TALK_ROBOT]: "Hasarlı roketin içine gir · robotla konuş (H)",
  [QUEST.EXIT_ROCKET]: "Roketten çık · turuncu halkadan dışarı yürü",
  [QUEST.EXPLORE]: "Açık alanı keşfet · WASD ile yürü",
  [QUEST.FIND_SPHERE]: "Gizemli küreyi bul ve ateş et (sol tık)",
  [QUEST.DEFEAT_BOSS]: "İlk boss'u yen · sol tık ateş",
  [QUEST.PICK_SHINE]: "Işıltı Küresini topla (E)",
  [QUEST.FIND_CRATE]: "NASA acil kulesine git · E ile aç",
  [QUEST.TABLET]: "NASA Tableti aç (T) · Sinyal sekmesine bak",
  [QUEST.FIND_SIGNAL]: "Tabletteki sinyali takip et · mavi NASA rölesini bul",
  [QUEST.ACTIVATE_RELAY]: "NASA rölesine yaklaş · E ile etkinleştir",
  [QUEST.GET_JOLE]: "Pembe JOLE bidonunu al (E) — roket tamir jeli",
  [QUEST.REPAIR_ROCKET]: "Rokete git · E ile JOLE ile tamir et",
  [QUEST.FINALE]: "Kalkış! Dünya’ya doğru…",
  [QUEST.DONE]: "HENTW · Thank you for playing · Devamı HENTW 2'de",
};

/** Jole canister world position (near relay) */
export const JOLE_POS = { x: 18, z: 38 };

/** World position of post-tower NASA signal relay (XZ) */
export const SIGNAL_RELAY_POS = { x: 20, z: 40 };

/** Planet showcase cinematic cam keys — player must be hidden */
export const PLANET_CAMS = new Set(["space", "approach"]);

/**
 * @param {string} camKey
 * @returns {boolean}
 */
export function shouldHidePlayerForCam(camKey) {
  return PLANET_CAMS.has(camKey);
}

/**
 * Ordered quest graph transitions (event → next quest if current matches).
 * @type {Record<string, { from: string, to: string }>}
 */
export const QUEST_EVENTS = {
  picked_gun: { from: QUEST.PICK_GUN, to: QUEST.TALK_ROBOT },
  robot_broken: { from: QUEST.TALK_ROBOT, to: QUEST.EXIT_ROCKET },
  left_wreck: { from: QUEST.EXIT_ROCKET, to: QUEST.EXPLORE },
  explore_done: { from: QUEST.EXPLORE, to: QUEST.FIND_SPHERE },
  sphere_opened: { from: QUEST.FIND_SPHERE, to: QUEST.DEFEAT_BOSS },
  boss_defeated: { from: QUEST.DEFEAT_BOSS, to: QUEST.PICK_SHINE },
  shine_picked: { from: QUEST.PICK_SHINE, to: QUEST.FIND_CRATE },
  crate_looted: { from: QUEST.FIND_CRATE, to: QUEST.TABLET },
  tablet_opened: { from: QUEST.TABLET, to: QUEST.FIND_SIGNAL },
  signal_found: { from: QUEST.FIND_SIGNAL, to: QUEST.ACTIVATE_RELAY },
  relay_activated: { from: QUEST.ACTIVATE_RELAY, to: QUEST.GET_JOLE },
  jole_picked: { from: QUEST.GET_JOLE, to: QUEST.REPAIR_ROCKET },
  rocket_repaired: { from: QUEST.REPAIR_ROCKET, to: QUEST.FINALE },
  finale_done: { from: QUEST.FINALE, to: QUEST.DONE },
};

/**
 * Early-game flexible sync: gun and robot can be done in any order.
 * Only after BOTH are done do we leave the wreck phase.
 * @param {{ hasGun: boolean, robotBroken: boolean, quest: string }} s
 * @returns {string} corrected quest id
 */
export function syncEarlyQuest(s) {
  const hasGun = Boolean(s && s.hasGun);
  const robotBroken = Boolean(s && s.robotBroken);
  const q = s && s.quest;

  // Still in intro phase only
  const early = new Set([
    QUEST.PICK_GUN,
    QUEST.TALK_ROBOT,
    QUEST.EXIT_ROCKET,
  ]);
  if (q && !early.has(q) && q !== undefined) {
    // Already past early game — do not pull back
    if (
      q === QUEST.EXPLORE ||
      q === QUEST.FIND_SPHERE ||
      q === QUEST.DEFEAT_BOSS ||
      q === QUEST.PICK_SHINE ||
      q === QUEST.FIND_CRATE ||
      q === QUEST.TABLET ||
      q === QUEST.FIND_SIGNAL ||
      q === QUEST.ACTIVATE_RELAY ||
      q === QUEST.GET_JOLE ||
      q === QUEST.REPAIR_ROCKET ||
      q === QUEST.FINALE ||
      q === QUEST.DONE
    ) {
      return q;
    }
  }

  if (robotBroken && hasGun) return QUEST.EXIT_ROCKET;
  if (hasGun && !robotBroken) return QUEST.TALK_ROBOT;
  if (!hasGun && robotBroken) return QUEST.PICK_GUN; // still need gun
  return QUEST.PICK_GUN;
}

/**
 * Apply a named quest event. Returns next quest or current if event invalid.
 * @param {string} current
 * @param {string} event
 * @returns {string}
 */
export function advanceQuest(current, event) {
  const edge = QUEST_EVENTS[event];
  if (!edge) return current;
  if (current !== edge.from) return current;
  return edge.to;
}

/**
 * @param {number} ax
 * @param {number} az
 * @param {number} bx
 * @param {number} bz
 * @returns {number}
 */
export function distXZ(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.hypot(dx, dz);
}

/**
 * @param {number} dist
 * @param {number} range
 * @returns {boolean}
 */
export function canInteract(dist, range) {
  return dist >= 0 && dist < range;
}

/**
 * Boss combat state helper.
 * @param {{ hp: number, maxHp: number, alive: boolean }} boss
 * @param {number} damage
 * @returns {{ hp: number, maxHp: number, alive: boolean, justDefeated: boolean }}
 */
export function applyBossDamage(boss, damage) {
  if (!boss.alive) {
    return { ...boss, justDefeated: false };
  }
  const dmg = Math.max(0, Number(damage) || 0);
  const hp = Math.max(0, boss.hp - dmg);
  const alive = hp > 0;
  return {
    hp,
    maxHp: boss.maxHp,
    alive,
    justDefeated: boss.alive && !alive,
  };
}

/**
 * Simple boss chase AI tick (pure).
 * @param {{ x: number, z: number, speed: number }} boss
 * @param {{ x: number, z: number }} target
 * @param {number} dt
 * @returns {{ x: number, z: number, dist: number }}
 */
export function tickBossChase(boss, target, dt) {
  const dx = target.x - boss.x;
  const dz = target.z - boss.z;
  const dist = Math.hypot(dx, dz) || 1;
  const step = boss.speed * dt;
  if (dist <= 0.01) return { x: boss.x, z: boss.z, dist: 0 };
  const nx = boss.x + (dx / dist) * Math.min(step, dist);
  const nz = boss.z + (dz / dist) * Math.min(step, dist);
  return { x: nx, z: nz, dist: Math.hypot(target.x - nx, target.z - nz) };
}

/**
 * Sphere crack progress 0..1; opens when >= 1.
 * @param {number} progress
 * @param {number} hitAmount
 * @returns {{ progress: number, opened: boolean }}
 */
export function applySphereHit(progress, hitAmount) {
  const p = Math.min(1, Math.max(0, progress) + Math.max(0, hitAmount));
  return { progress: p, opened: p >= 1 };
}

/**
 * Tablet feature flags.
 * @param {{ hasShineOrb: boolean }} inv
 * @returns {{ map: boolean, signal: boolean, music: boolean }}
 */
export function tabletFeatures(inv) {
  return {
    map: true,
    signal: true,
    music: Boolean(inv && inv.hasShineOrb),
  };
}

/**
 * Crate loot contents (fixed).
 * @returns {{ food: boolean, powerOrb: boolean, tablet: boolean }}
 */
export function crateLoot() {
  return { food: true, powerOrb: true, tablet: true };
}

/**
 * Default boss factory.
 * @param {number} maxHp
 * @returns {{ hp: number, maxHp: number, alive: boolean }}
 */
export function createBoss(maxHp = 100) {
  const m = Math.max(1, maxHp);
  return { hp: m, maxHp: m, alive: true };
}


// ——— Shared HENTW series helpers (save / easy / collectibles / minimap) ———
export const SAVE_VERSION = 1;
export const SAVE_KEY = "hentw1_save";

/**
 * @param {{ quest: string, easyMode?: boolean, collectibles?: {id:string,taken:boolean}[], collectedCount?: number, playerHp?: number, extra?: object }} state
 */
export function encodeSave(state) {
  return JSON.stringify({
    v: SAVE_VERSION,
    quest: state.quest,
    easyMode: !!state.easyMode,
    collectibles: Array.isArray(state.collectibles) ? state.collectibles : [],
    collectedCount: Number(state.collectedCount) || 0,
    playerHp: typeof state.playerHp === "number" ? state.playerHp : 100,
    extra: state.extra && typeof state.extra === "object" ? state.extra : {},
  });
}

/** @param {string|null|undefined} raw */
export function decodeSave(raw) {
  if (raw == null || typeof raw !== "string" || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || o.v !== SAVE_VERSION || typeof o.quest !== "string") return null;
    return {
      quest: o.quest,
      easyMode: !!o.easyMode,
      collectibles: Array.isArray(o.collectibles) ? o.collectibles : [],
      collectedCount: Number(o.collectedCount) || 0,
      playerHp: typeof o.playerHp === "number" ? o.playerHp : 100,
      extra: o.extra && typeof o.extra === "object" ? o.extra : {},
    };
  } catch {
    return null;
  }
}

export function easyEnemyHpMult(easy) {
  return easy ? 0.55 : 1;
}
export function easyDamageTakenMult(easy) {
  return easy ? 0.5 : 1;
}
export function easyRunTimeMult(easy) {
  return easy ? 1.85 : 1;
}
export function easyPlayerDamageMult(easy) {
  return easy ? 1.55 : 1;
}
export function easyHideFillMult(easy) {
  return easy ? 1.7 : 1;
}

/** @param {string[]} ids */
export function createCollectibles(ids) {
  return (ids || []).map((id) => ({ id: String(id), taken: false }));
}

/**
 * @param {{id:string,taken:boolean}[]} list
 * @param {string} id
 */
export function collectItem(list, id) {
  if (!Array.isArray(list)) return [];
  return list.map((c) => (c.id === id ? { ...c, taken: true } : { ...c }));
}

/** @param {{id:string,taken:boolean}[]} list */
export function collectibleProgress(list) {
  const arr = Array.isArray(list) ? list : [];
  const total = arr.length;
  const got = arr.filter((c) => c.taken).length;
  return { got, total, complete: total > 0 && got >= total };
}

/**
 * World XZ → minimap pixel coords.
 * @param {number} wx
 * @param {number} wz
 * @param {{minX:number,maxX:number,minZ:number,maxZ:number}} bounds
 * @param {number} mapSize
 */
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

