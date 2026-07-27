/**
 * HENTW 2 — KRYNN senaryo + savaş mantığı
 */

export const QUEST = {
  WAKE: "wake",
  EMPTY_JOLE: "empty_jole",
  BROKEN_TABLET: "broken_tablet",
  FIND_CARD: "find_card",
  INSERT_CARD: "insert_card",
  ROBOT_CHOICE: "robot_choice",
  EXPLORE: "explore",
  /** KRAXX devriyesi — birkaç uzaylı */
  FIGHT_PATROL: "fight_patrol",
  CASTLE_GATE: "castle_gate",
  RESCUE: "rescue",
  FREE_ZIX: "free_zix",
  /** Kale içinde muhafızlar */
  FIGHT_GUARDS: "fight_guards",
  GET_CRYSTAL1: "get_crystal1",
  PORTAL: "portal",
  PLANET2: "planet2",
  /** LUMINA muhafızları */
  FIGHT_LUMINA: "fight_lumina",
  GET_CRYSTAL2: "get_crystal2",
  GO_HOME: "go_home",
  DONE: "done",
};

export const QUEST_LABELS = {
  [QUEST.WAKE]: "Ayağa kalk · KRYNN'e bak",
  [QUEST.EMPTY_JOLE]: "Boş JOLE kutusuna bak (E)",
  [QUEST.BROKEN_TABLET]: "Tableti incele (E) — kırık",
  [QUEST.FIND_CARD]: "Cebindeki kartı çıkar (E)",
  [QUEST.INSERT_CARD]: "Kartı hasarlı robota tak (E)",
  [QUEST.ROBOT_CHOICE]: "Seçim yap: Terk et veya Arkadaş ol",
  [QUEST.EXPLORE]: "KRAXX Kalesi yönüne ilerle (kuzey)",
  [QUEST.FIGHT_PATROL]: "KRAXX devriyesi! Sol tık ateş · hepsini yen",
  [QUEST.CASTLE_GATE]: "Kale kapısına yaklaş",
  [QUEST.RESCUE]: "Kurtarma sahnesi…",
  [QUEST.FREE_ZIX]: "ZIX'i kafesten kurtar (E)",
  [QUEST.FIGHT_GUARDS]: "Kale muhafızlarını yen · sol tık",
  [QUEST.GET_CRYSTAL1]: "KRYNN Kristali'ni al (E)",
  [QUEST.PORTAL]: "Portala gir (E) → LUMINA",
  [QUEST.PLANET2]: "LUMINA'da ilerle",
  [QUEST.FIGHT_LUMINA]: "LUMINA muhafızları! Sol tık ateş",
  [QUEST.GET_CRYSTAL2]: "LUMINA Kristali'ni al (E)",
  [QUEST.GO_HOME]: "İki kristalle Dünya portalına gir (E)",
  [QUEST.DONE]: "HENTW 2 · Thanks you playing · Devamı HENTW 3'te",
};

export const QUEST_EVENTS = {
  stood_up: { from: QUEST.WAKE, to: QUEST.EMPTY_JOLE },
  saw_jole: { from: QUEST.EMPTY_JOLE, to: QUEST.BROKEN_TABLET },
  tablet_broke: { from: QUEST.BROKEN_TABLET, to: QUEST.FIND_CARD },
  card_found: { from: QUEST.FIND_CARD, to: QUEST.INSERT_CARD },
  card_inserted: { from: QUEST.INSERT_CARD, to: QUEST.ROBOT_CHOICE },
  chose_friend: { from: QUEST.ROBOT_CHOICE, to: QUEST.EXPLORE },
  chose_abandon: { from: QUEST.ROBOT_CHOICE, to: QUEST.EXPLORE },
  patrol_start: { from: QUEST.EXPLORE, to: QUEST.FIGHT_PATROL },
  patrol_won: { from: QUEST.FIGHT_PATROL, to: QUEST.CASTLE_GATE },
  rescue_done: { from: QUEST.CASTLE_GATE, to: QUEST.FREE_ZIX },
  zix_freed: { from: QUEST.FREE_ZIX, to: QUEST.FIGHT_GUARDS },
  guards_won: { from: QUEST.FIGHT_GUARDS, to: QUEST.GET_CRYSTAL1 },
  crystal1: { from: QUEST.GET_CRYSTAL1, to: QUEST.PORTAL },
  entered_portal: { from: QUEST.PORTAL, to: QUEST.PLANET2 },
  lumina_ambush: { from: QUEST.PLANET2, to: QUEST.FIGHT_LUMINA },
  lumina_won: { from: QUEST.FIGHT_LUMINA, to: QUEST.GET_CRYSTAL2 },
  crystal2: { from: QUEST.GET_CRYSTAL2, to: QUEST.GO_HOME },
  went_home: { from: QUEST.GO_HOME, to: QUEST.DONE },
};

export const POS = {
  emptyJole: { x: 1.2, z: 0.5 },
  tablet: { x: 0.3, z: 1.5 },
  robot: { x: -2.5, z: -1.2 },
  patrolCenter: { x: 6, z: 12 },
  castleGate: { x: 14, z: 20 },
  zixCage: { x: 16, z: 24 },
  crystal1: { x: 18, z: 26 },
  portal: { x: 20, z: 22 },
  crystal2: { x: 0, z: 8 },
  homePortal: { x: -4, z: 10 },
};

export function advanceQuest(current, event) {
  const edge = QUEST_EVENTS[event];
  if (!edge) return current;
  if (current !== edge.from) return current;
  return edge.to;
}

export function distXZ(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function canInteract(dist, range) {
  return dist >= 0 && dist < range;
}

/** @returns {{ hp: number, maxHp: number, alive: boolean }} */
export function createFighter(maxHp = 40) {
  const m = Math.max(1, maxHp);
  return { hp: m, maxHp: m, alive: true };
}

export function applyDamage(fighter, dmg) {
  if (!fighter.alive) return { ...fighter, justDied: false };
  const hp = Math.max(0, fighter.hp - Math.max(0, dmg));
  const alive = hp > 0;
  return {
    hp,
    maxHp: fighter.maxHp,
    alive,
    justDied: fighter.alive && !alive,
  };
}

export function allDead(list) {
  return list.length > 0 && list.every((f) => !f.alive);
}


// ——— Shared HENTW series helpers (save / easy / collectibles / minimap) ———
export const SAVE_VERSION = 1;
export const SAVE_KEY = "hentw2_save";

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

