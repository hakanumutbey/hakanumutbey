/**
 * Vespera — saf görev / dünya / savaş / kayıt mantığı.
 * Klasik <script> ile yüklenir; module/require gerekmez.
 */
(function (root) {
  const PLANET = { w: 3200, h: 2400 };
  const SAVE_KEY = "hakorocks-vespera-save-v1";
  const PLAYER_R = 16;
  const INTERACT_R = 42;

  const REGIONS = [
    { id: "dusus-vadisi", name: "Düşüş Vadisi", x: 0, y: 0, w: 800, h: 800, unlockAt: 0, ground: "#2a1c28", accent: "#ff8a5b" },
    { id: "cam-orman", name: "Cam Orman", x: 800, y: 0, w: 800, h: 800, unlockAt: 2, ground: "#14302c", accent: "#5dffc8" },
    { id: "pasli-istasyon", name: "Paslı İstasyon", x: 1600, y: 0, w: 800, h: 900, unlockAt: 3, ground: "#2a2218", accent: "#e09a4a" },
    { id: "buz-yariklari", name: "Buz Yarıkları", x: 0, y: 800, w: 1000, h: 800, unlockAt: 4, ground: "#152033", accent: "#9fd6ff" },
    { id: "kizil-plato", name: "Kızıl Plato", x: 1000, y: 800, w: 1200, h: 800, unlockAt: 5, ground: "#3a1614", accent: "#ff5b4a" },
    { id: "sessiz-krater", name: "Sessiz Krater", x: 2200, y: 800, w: 1000, h: 900, unlockAt: 6, ground: "#1a1424", accent: "#c48cff" },
    { id: "golge-kent", name: "Gölge Kent", x: 0, y: 1600, w: 1600, h: 800, unlockAt: 7, ground: "#121018", accent: "#6d7dff" },
    { id: "cekirdek-kapi", name: "Çekirdek Kapısı", x: 1600, y: 1600, w: 1600, h: 800, unlockAt: 8, ground: "#220814", accent: "#ff4d6d" },
  ];

  const ITEMS = [
    { id: "beacon-1", beat: "beacons", x: 220, y: 520, name: "İşaret parçası A" },
    { id: "beacon-2", beat: "beacons", x: 520, y: 260, name: "İşaret parçası B" },
    { id: "beacon-3", beat: "beacons", x: 640, y: 620, name: "İşaret parçası C" },
    { id: "cell-1", beat: "cells", x: 1760, y: 220, name: "Güç hücresi 1" },
    { id: "cell-2", beat: "cells", x: 2040, y: 480, name: "Güç hücresi 2" },
    { id: "cell-3", beat: "cells", x: 2260, y: 180, name: "Güç hücresi 3" },
    { id: "cooler", beat: "cooler", x: 420, y: 1180, name: "Soğutucu çekirdek" },
    { id: "scan", beat: "scan", x: 1680, y: 1220, name: "Plato tarama kaydı" },
    { id: "key-1", beat: "keys", x: 280, y: 1880, name: "Gölge anahtarı 1" },
    { id: "key-2", beat: "keys", x: 720, y: 2100, name: "Gölge anahtarı 2" },
    { id: "key-3", beat: "keys", x: 1280, y: 1760, name: "Gölge anahtarı 3" },
  ];

  const NPCS = [
    { id: "kaia", name: "KAIA", x: 180, y: 390, role: "radio" },
    { id: "mira", name: "Mira", x: 1120, y: 340, role: "ally" },
    { id: "arsiv", name: "Koloni arşivi", x: 2620, y: 1240, role: "object" },
    { id: "mira-core", name: "Mira / Çekirdek", x: 2480, y: 2040, role: "boss" },
  ];

  const HAZARDS = [
    { id: "dust-1", x: 480, y: 400, r: 28, dmg: 6, fromBeat: 1 },
    { id: "dust-2", x: 1880, y: 360, r: 30, dmg: 8, fromBeat: 3 },
    { id: "ice-1", x: 260, y: 1080, r: 26, dmg: 7, fromBeat: 4 },
    { id: "shadow-1", x: 900, y: 1960, r: 32, dmg: 10, fromBeat: 7 },
    { id: "core-ring", x: 2480, y: 2040, r: 46, dmg: 12, fromBeat: 8 },
  ];

  const BEATS = [
    {
      id: "wake",
      title: "Uyanış",
      type: "talk",
      npcId: "kaia",
      regionId: "dusus-vadisi",
      objective: "Düşen roketin yanında KAIA ile konuş.",
      rescue: true,
    },
    {
      id: "beacons",
      title: "İşaret parçaları",
      type: "collect",
      itemIds: ["beacon-1", "beacon-2", "beacon-3"],
      regionId: "dusus-vadisi",
      objective: "Vadide üç işaret parçasını topla; kurtarma sinyalini kur.",
      rescue: true,
    },
    {
      id: "meet-mira",
      title: "Camdaki yabancı",
      type: "talk",
      npcId: "mira",
      regionId: "cam-orman",
      objective: "Cam Orman'da Mira ile konuş. Sana yardım edeceğini söylüyor.",
      rescue: true,
    },
    {
      id: "cells",
      title: "Paslı güç",
      type: "collect",
      itemIds: ["cell-1", "cell-2", "cell-3"],
      regionId: "pasli-istasyon",
      objective: "Paslı İstasyon'dan üç güç hücresi çıkar.",
      rescue: true,
    },
    {
      id: "cooler",
      title: "Buz altı",
      type: "collect",
      itemIds: ["cooler"],
      regionId: "buz-yariklari",
      objective: "Buz Yarıkları'ndan soğutucu çekirdeği al.",
      rescue: true,
    },
    {
      id: "scan",
      title: "Kızıl tarama",
      type: "collect",
      itemIds: ["scan"],
      regionId: "kizil-plato",
      objective: "Kızıl Plato'da tarama kaydını tamamla.",
      rescue: true,
    },
    {
      id: "archive",
      title: "Sessiz kayıt",
      type: "event",
      eventId: "open-archive",
      regionId: "sessiz-krater",
      objective: "Sessiz Krater'deki koloni arşivini aç.",
      rescue: true,
    },
    {
      id: "keys",
      title: "Gölge kilitleri",
      type: "collect",
      itemIds: ["key-1", "key-2", "key-3"],
      regionId: "golge-kent",
      objective: "Mira çekirdeği uyandırıyor. Gölge Kent'ten üç kilidi topla.",
      rescue: false,
    },
    {
      id: "boss",
      title: "Çekirdek",
      type: "boss",
      npcId: "mira-core",
      regionId: "cekirdek-kapi",
      objective: "Mira'yı durdur ve gezegen çekirdeğini kapat.",
      rescue: false,
    },
    {
      id: "done",
      title: "Sessizlik",
      type: "done",
      regionId: "cekirdek-kapi",
      objective: "Vespera durdu. Eve dönüş yolu açık.",
      rescue: false,
    },
  ];

  function createState() {
    return {
      x: 200,
      y: 400,
      hp: 100,
      maxHp: 100,
      beatIndex: 0,
      collected: {},
      talked: {},
      events: {},
      twist: false,
      miraRole: "ally",
      bossHp: 180,
      bossMaxHp: 180,
      outcome: "playing",
      facing: 1,
      iFrames: 0,
    };
  }

  function cloneState(state) {
    return restore(snapshot(state));
  }

  function getCurrentBeat(state) {
    const index = clamp(state.beatIndex, 0, BEATS.length - 1);
    return BEATS[index];
  }

  function getObjective(state) {
    return getCurrentBeat(state).objective;
  }

  function getRegion(id) {
    return REGIONS.find((region) => region.id === id) || null;
  }

  function regionAt(x, y) {
    return REGIONS.find((region) => x >= region.x && y >= region.y && x < region.x + region.w && y < region.y + region.h) || null;
  }

  function isRegionUnlocked(state, regionId) {
    const region = getRegion(regionId);
    if (!region) return false;
    return state.beatIndex >= region.unlockAt;
  }

  function getMiraRole(state) {
    return state.miraRole;
  }

  function getOutcome(state) {
    return state.outcome;
  }

  function isWon(state) {
    return state.outcome === "won";
  }

  function isLost(state) {
    return state.outcome === "lost";
  }

  function collectedCount(state, itemIds) {
    return itemIds.filter((id) => state.collected[id]).length;
  }

  function maybeAdvance(state) {
    if (state.outcome !== "playing") return state;
    const beat = getCurrentBeat(state);
    if (beat.type === "talk" && state.talked[beat.npcId]) {
      state.beatIndex += 1;
    } else if (beat.type === "collect" && collectedCount(state, beat.itemIds) >= beat.itemIds.length) {
      state.beatIndex += 1;
    } else if (beat.type === "event" && state.events[beat.eventId]) {
      state.beatIndex += 1;
    } else if (beat.type === "boss" && state.bossHp <= 0) {
      state.beatIndex += 1;
      state.outcome = "won";
    }
    return state;
  }

  function talkTo(state, npcId) {
    if (state.outcome !== "playing") return { ok: false, reason: "ended" };
    const beat = getCurrentBeat(state);
    const npc = NPCS.find((item) => item.id === npcId);
    if (!npc) return { ok: false, reason: "missing" };
    if (!within(state.x, state.y, npc.x, npc.y, INTERACT_R + 80)) {
      return { ok: false, reason: "far" };
    }
    if (beat.type === "talk" && beat.npcId === npcId) {
      state.talked[npcId] = true;
      maybeAdvance(state);
      return { ok: true, kind: "talk", npcId };
    }
    if (beat.type === "event" && npcId === "arsiv") {
      return triggerEvent(state, beat.eventId);
    }
    return { ok: false, reason: "not-now" };
  }

  function collectItem(state, itemId) {
    if (state.outcome !== "playing") return { ok: false, reason: "ended" };
    const item = ITEMS.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, reason: "missing" };
    const beat = getCurrentBeat(state);
    if (beat.type !== "collect" || !beat.itemIds.includes(itemId)) {
      return { ok: false, reason: "not-now" };
    }
    if (state.collected[itemId]) return { ok: false, reason: "have" };
    if (!within(state.x, state.y, item.x, item.y, INTERACT_R + 80)) {
      return { ok: false, reason: "far" };
    }
    state.collected[itemId] = true;
    const before = beat.id;
    maybeAdvance(state);
    return { ok: true, kind: "collect", itemId, progressed: getCurrentBeat(state).id !== before };
  }

  function triggerEvent(state, eventId) {
    if (state.outcome !== "playing") return { ok: false, reason: "ended" };
    const beat = getCurrentBeat(state);
    if (beat.type !== "event" || beat.eventId !== eventId) {
      return { ok: false, reason: "not-now" };
    }
    state.events[eventId] = true;
    applyTwist(state);
    maybeAdvance(state);
    return { ok: true, kind: "event", eventId, twist: state.twist };
  }

  function applyTwist(state) {
    const beforeRole = state.miraRole;
    const beforeGoal = getObjective(state);
    state.twist = true;
    state.miraRole = "enemy";
    return {
      flipped: state.miraRole !== beforeRole,
      goalChanged: getObjective(state) !== beforeGoal || state.twist,
    };
  }

  function tryMove(state, dx, dy) {
    if (state.outcome !== "playing") return state;
    const nx = clamp(state.x + dx, 24, PLANET.w - 24);
    const ny = clamp(state.y + dy, 24, PLANET.h - 24);
    const nextRegion = regionAt(nx, ny);
    if (nextRegion && !isRegionUnlocked(state, nextRegion.id)) {
      return state;
    }
    if (dx !== 0) state.facing = dx > 0 ? 1 : -1;
    state.x = nx;
    state.y = ny;
    return state;
  }

  function overlapCircles(ax, ay, ar, bx, by, br) {
    const dx = ax - bx;
    const dy = ay - by;
    const r = ar + br;
    return dx * dx + dy * dy <= r * r;
  }

  function within(ax, ay, bx, by, r) {
    return overlapCircles(ax, ay, 0, bx, by, r);
  }

  function applyPlayerDamage(state, amount) {
    if (state.outcome !== "playing") return state;
    const hit = Math.max(0, Number(amount) || 0);
    if (hit <= 0) return state;
    if (state.iFrames > 0) return state;
    state.hp -= hit;
    state.iFrames = 18;
    if (state.hp <= 0) {
      state.hp = 0;
      state.outcome = "lost";
    }
    return state;
  }

  function applyBossDamage(state, amount) {
    if (state.outcome !== "playing") return state;
    const beat = getCurrentBeat(state);
    if (beat.type !== "boss") return state;
    const hit = Math.max(0, Number(amount) || 0);
    if (hit <= 0) return state;
    state.bossHp = Math.max(0, state.bossHp - hit);
    maybeAdvance(state);
    return state;
  }

  function resolveHazardHit(state, hazard) {
    if (!hazard) return state;
    if (state.beatIndex < (hazard.fromBeat || 0)) return state;
    if (!overlapCircles(state.x, state.y, PLAYER_R, hazard.x, hazard.y, hazard.r)) return state;
    return applyPlayerDamage(state, hazard.dmg);
  }

  function tickIFrames(state) {
    if (state.iFrames > 0) state.iFrames -= 1;
    return state;
  }

  function nearbyInteract(state) {
    const beat = getCurrentBeat(state);
    if (beat.type === "talk" || (beat.type === "event" && beat.eventId === "open-archive")) {
      const npcId = beat.npcId || "arsiv";
      const npc = NPCS.find((item) => item.id === npcId);
      if (npc && within(state.x, state.y, npc.x, npc.y, INTERACT_R)) return { kind: "npc", target: npc };
    }
    if (beat.type === "collect") {
      const item = ITEMS.find((entry) => beat.itemIds.includes(entry.id) && !state.collected[entry.id] && within(state.x, state.y, entry.x, entry.y, INTERACT_R));
      if (item) return { kind: "item", target: item };
    }
    if (beat.type === "boss") {
      const boss = NPCS.find((item) => item.id === "mira-core");
      if (boss && within(state.x, state.y, boss.x, boss.y, 70)) return { kind: "boss", target: boss };
    }
    return null;
  }

  function interact(state) {
    const near = nearbyInteract(state);
    if (!near) return { ok: false, reason: "none" };
    if (near.kind === "npc") return talkTo(state, near.target.id);
    if (near.kind === "item") return collectItem(state, near.target.id);
    if (near.kind === "boss") {
      applyBossDamage(state, 14);
      return { ok: true, kind: "boss-hit" };
    }
    return { ok: false, reason: "none" };
  }

  function snapshot(state) {
    return {
      x: state.x,
      y: state.y,
      hp: state.hp,
      maxHp: state.maxHp,
      beatIndex: state.beatIndex,
      collected: { ...state.collected },
      talked: { ...state.talked },
      events: { ...state.events },
      twist: state.twist,
      miraRole: state.miraRole,
      bossHp: state.bossHp,
      bossMaxHp: state.bossMaxHp,
      outcome: state.outcome,
      facing: state.facing,
      iFrames: 0,
    };
  }

  function restore(data) {
    const state = createState();
    if (!data || typeof data !== "object") return state;
    state.x = Number(data.x) || state.x;
    state.y = Number(data.y) || state.y;
    state.hp = Number(data.hp);
    if (!Number.isFinite(state.hp)) state.hp = 100;
    state.maxHp = Number(data.maxHp) || 100;
    state.beatIndex = clamp(Number(data.beatIndex) || 0, 0, BEATS.length - 1);
    state.collected = data.collected && typeof data.collected === "object" ? { ...data.collected } : {};
    state.talked = data.talked && typeof data.talked === "object" ? { ...data.talked } : {};
    state.events = data.events && typeof data.events === "object" ? { ...data.events } : {};
    state.twist = Boolean(data.twist);
    state.miraRole = data.miraRole === "enemy" ? "enemy" : "ally";
    state.bossHp = Number.isFinite(Number(data.bossHp)) ? Number(data.bossHp) : 180;
    state.bossMaxHp = Number(data.bossMaxHp) || 180;
    state.outcome = data.outcome === "won" || data.outcome === "lost" ? data.outcome : "playing";
    state.facing = data.facing === -1 ? -1 : 1;
    return state;
  }

  function readRawSave(storage) {
    if (!storage || typeof storage.getItem !== "function") return null;
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  function isPlayableSave(data) {
    return Boolean(data && data.outcome !== "lost" && data.outcome !== "won" && Number(data.hp) > 0);
  }

  function nudgeOffHazards(state) {
    for (const hazard of HAZARDS) {
      if (state.beatIndex < (hazard.fromBeat || 0)) continue;
      if (!overlapCircles(state.x, state.y, PLAYER_R, hazard.x, hazard.y, hazard.r + 10)) continue;
      state.x = clamp(hazard.x + hazard.r + PLAYER_R + 28, 24, PLANET.w - 24);
      state.y = clamp(hazard.y, 24, PLANET.h - 24);
    }
    return state;
  }

  function reviveState(state) {
    if (!state || state.outcome === "won") return state;
    if (state.outcome === "lost" || state.hp <= 0) {
      state.hp = state.maxHp > 0 ? state.maxHp : 100;
      state.outcome = "playing";
      state.iFrames = 30;
      nudgeOffHazards(state);
    }
    return state;
  }

  function prepareContinue(state) {
    return reviveState(state);
  }

  function saveTo(state, storage) {
    if (!storage || typeof storage.setItem !== "function") return false;
    if (state.outcome === "lost" || state.hp <= 0) {
      const existing = readRawSave(storage);
      if (isPlayableSave(existing)) return true;
      const revived = reviveState(cloneState(state));
      storage.setItem(SAVE_KEY, JSON.stringify(snapshot(revived)));
      return true;
    }
    storage.setItem(SAVE_KEY, JSON.stringify(snapshot(state)));
    return true;
  }

  function loadFrom(storage) {
    const data = readRawSave(storage);
    if (!data) return null;
    return prepareContinue(restore(data));
  }

  function hasSave(storage) {
    return Boolean(storage && storage.getItem && storage.getItem(SAVE_KEY));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const api = {
    PLANET,
    SAVE_KEY,
    PLAYER_R,
    INTERACT_R,
    REGIONS,
    ITEMS,
    NPCS,
    HAZARDS,
    BEATS,
    createState,
    cloneState,
    getCurrentBeat,
    getObjective,
    getRegion,
    regionAt,
    isRegionUnlocked,
    getMiraRole,
    getOutcome,
    isWon,
    isLost,
    collectedCount,
    talkTo,
    collectItem,
    triggerEvent,
    applyTwist,
    tryMove,
    overlapCircles,
    applyPlayerDamage,
    applyBossDamage,
    resolveHazardHit,
    tickIFrames,
    nearbyInteract,
    interact,
    snapshot,
    restore,
    reviveState,
    prepareContinue,
    saveTo,
    loadFrom,
    hasSave,
  };

  root.Vespera = api;
})(typeof window !== "undefined" ? window : globalThis);
