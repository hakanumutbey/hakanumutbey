/**
 * HENTW 3 — uzun kaçış + hackleme · seri sonu
 */

export const QUEST = {
  WAKE: "wake",
  TALK_ROBOT: "talk_robot",
  FOLLOW_DOOR: "follow_door",
  COLOR_PUZZLE: "color_puzzle",
  FIND_KEYCARD: "find_keycard",
  HIDE_GUARD: "hide_guard",
  RUN_GUARD: "run_guard",
  FIGHT_PATROL: "fight_patrol",
  FIND_BATTERY: "find_battery",
  COLOR2: "color2",
  HIDE2: "hide2",
  RUN2: "run2",
  REACH_PC: "reach_pc",
  HACK: "hack",
  ESCAPE: "escape",
  DONE: "done",
};

export const QUEST_LABELS = {
  [QUEST.WAKE]: "Ayağa kalk · hücreye bak",
  [QUEST.TALK_ROBOT]: "Robotla konuş (H)",
  [QUEST.FOLLOW_DOOR]: "Robotun gösterdiği kapıya git (sarı ok)",
  [QUEST.COLOR_PUZZLE]: "1. renk panelleri — doğru sıra",
  [QUEST.FIND_KEYCARD]: "Kırmızı anahtar kartını bul (E)",
  [QUEST.HIDE_GUARD]: "1. nöbetçi — yeşil bölgede saklan",
  [QUEST.RUN_GUARD]: "1. kaçış — kapıya koş!",
  [QUEST.FIGHT_PATROL]: "KRAXX devriyesi — sol tık ateş, hepsini yen",
  [QUEST.FIND_BATTERY]: "Robot bataryasını al (E) — mavi kutu",
  [QUEST.COLOR2]: "2. renk panelleri (farklı sıra)",
  [QUEST.HIDE2]: "2. nöbetçi — saklan",
  [QUEST.RUN2]: "2. kaçış — bilgisayar koridoruna koş!",
  [QUEST.REACH_PC]: "Ana bilgisayara git (E)",
  [QUEST.HACK]: "Hackleme 3 adım + 'Ben robot değilim'",
  [QUEST.ESCAPE]: "Kaçış gemisine bin · Dünya!",
  [QUEST.DONE]: "HENTW serisi sona erdi · Thanks you playing",
};

export const QUEST_EVENTS = {
  stood_up: { from: QUEST.WAKE, to: QUEST.TALK_ROBOT },
  robot_talked: { from: QUEST.TALK_ROBOT, to: QUEST.FOLLOW_DOOR },
  at_color: { from: QUEST.FOLLOW_DOOR, to: QUEST.COLOR_PUZZLE },
  color_ok: { from: QUEST.COLOR_PUZZLE, to: QUEST.FIND_KEYCARD },
  keycard_ok: { from: QUEST.FIND_KEYCARD, to: QUEST.HIDE_GUARD },
  hide_ok: { from: QUEST.HIDE_GUARD, to: QUEST.RUN_GUARD },
  run_ok: { from: QUEST.RUN_GUARD, to: QUEST.FIGHT_PATROL },
  fight_ok: { from: QUEST.FIGHT_PATROL, to: QUEST.FIND_BATTERY },
  battery_ok: { from: QUEST.FIND_BATTERY, to: QUEST.COLOR2 },
  color2_ok: { from: QUEST.COLOR2, to: QUEST.HIDE2 },
  hide2_ok: { from: QUEST.HIDE2, to: QUEST.RUN2 },
  run2_ok: { from: QUEST.RUN2, to: QUEST.REACH_PC },
  pc_start: { from: QUEST.REACH_PC, to: QUEST.HACK },
  hack_ok: { from: QUEST.HACK, to: QUEST.ESCAPE },
  escaped: { from: QUEST.ESCAPE, to: QUEST.DONE },
};

export const BINARY_PAPER = "10110";
export const HACK_LETTERS = ["H", "E", "N", "T", "W"];
export const COLOR_ORDER = ["blue", "green", "red", "yellow"];
export const COLOR_ORDER_2 = ["red", "yellow", "blue", "green"];

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

export function binaryMatches(input, paper = BINARY_PAPER) {
  return String(input).replace(/\s/g, "") === String(paper);
}

export function nextHackStep(step, success) {
  if (!success) return 1;
  if (step >= 4) return 5;
  return step + 1;
}

export function createFighter(maxHp = 35) {
  const m = Math.max(1, maxHp);
  return { hp: m, maxHp: m, alive: true };
}

export function applyDamage(f, dmg) {
  if (!f.alive) return { ...f, justDied: false };
  const hp = Math.max(0, f.hp - Math.max(0, dmg));
  const alive = hp > 0;
  return { hp, maxHp: f.maxHp, alive, justDied: f.alive && !alive };
}

export function allDead(list) {
  return list.length > 0 && list.every((f) => !f.alive);
}


// ——— Shared HENTW series helpers (save / easy / collectibles / minimap) ———
export const SAVE_VERSION = 1;
export const SAVE_KEY = "hentw3_save";

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

