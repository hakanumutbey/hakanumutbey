// Vespera — sevk edilen görev/dünya/savaş/kayıt birimleri.
// Çalıştır: node oyunlar/vespera/vespera.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { strict as assert } from "node:assert";

const here = dirname(fileURLToPath(import.meta.url));
const logicSrc = readFileSync(join(here, "logic.js"), "utf8");

function loadVespera() {
  const windowObj = {};
  const sandbox = { window: windowObj };
  vm.createContext(sandbox);
  vm.runInContext(logicSrc, sandbox, { filename: "logic.js" });
  const api = sandbox.window.Vespera;
  if (!api) throw new Error("window.Vespera kurulamadı");
  return api;
}

function goTo(V, state, x, y) {
  state.x = x;
  state.y = y;
}

function playBeat(V, state, beat) {
  if (beat.type === "talk") {
    const npc = V.NPCS.find((item) => item.id === beat.npcId);
    goTo(V, state, npc.x, npc.y);
    const result = V.talkTo(state, beat.npcId);
    assert.equal(result.ok, true, `talk ${beat.npcId} başarısız: ${result.reason}`);
    return result;
  }
  if (beat.type === "collect") {
    for (const itemId of beat.itemIds) {
      const item = V.ITEMS.find((entry) => entry.id === itemId);
      goTo(V, state, item.x, item.y);
      const result = V.collectItem(state, itemId);
      assert.equal(result.ok, true, `collect ${itemId} başarısız: ${result.reason}`);
    }
    return { ok: true };
  }
  if (beat.type === "event") {
    const npc = V.NPCS.find((item) => item.id === "arsiv");
    goTo(V, state, npc.x, npc.y);
    const result = V.triggerEvent(state, beat.eventId);
    assert.equal(result.ok, true, `event ${beat.eventId} başarısız: ${result.reason}`);
    return result;
  }
  if (beat.type === "boss") {
    const boss = V.NPCS.find((item) => item.id === beat.npcId);
    goTo(V, state, boss.x, boss.y);
    while (V.getOutcome(state) === "playing" && V.getCurrentBeat(state).type === "boss") {
      V.applyBossDamage(state, 40);
    }
    return { ok: true };
  }
  return { ok: false };
}

const V = loadVespera();

const namedRegions = V.REGIONS.filter((region) => region.name && region.id);
assert.ok(namedRegions.length > 1, "birden fazla adlı bölge olmalı");
assert.equal(new Set(namedRegions.map((region) => region.id)).size, namedRegions.length);

const storyBeats = V.BEATS.filter((beat) => beat.type !== "done");
assert.ok(storyBeats.length > 1, "arka arkaya zorunlu vuruş olmalı");
const types = new Set(storyBeats.map((beat) => beat.type));
assert.ok(types.has("collect") && types.has("talk") && (types.has("event") || types.has("boss")));

const start = V.createState();
const first = V.getCurrentBeat(start);
assert.ok(first.id);
const firstRegion = V.regionAt(start.x, start.y);
assert.ok(firstRegion && firstRegion.name);

// (b) parça toplanınca ilerleme değişir
const collectBeat = storyBeats.find((beat) => beat.type === "collect");
assert.ok(collectBeat, "toplama vuruşu yok");
const walker = V.createState();
for (const beat of storyBeats) {
  if (beat.id === collectBeat.id) break;
  playBeat(V, walker, beat);
}
assert.equal(V.getCurrentBeat(walker).id, collectBeat.id);
const firstItem = collectBeat.itemIds[0];
const item = V.ITEMS.find((entry) => entry.id === firstItem);
const had = V.collectedCount(walker, collectBeat.itemIds);
goTo(V, walker, item.x, item.y);
const collected = V.collectItem(walker, firstItem);
assert.equal(collected.ok, true);
assert.ok(V.collectedCount(walker, collectBeat.itemIds) > had);
if (collectBeat.itemIds.length === 1) {
  assert.notEqual(V.getCurrentBeat(walker).id, collectBeat.id);
} else {
  assert.equal(V.getCurrentBeat(walker).id, collectBeat.id);
  for (const restId of collectBeat.itemIds.slice(1)) {
    const rest = V.ITEMS.find((entry) => entry.id === restId);
    goTo(V, walker, rest.x, rest.y);
    assert.equal(V.collectItem(walker, restId).ok, true);
  }
  assert.notEqual(V.getCurrentBeat(walker).id, collectBeat.id);
}

// (a) ana yol: sıralı vuruşlar ilerler
const path = V.createState();
const seen = [];
for (const beat of storyBeats) {
  assert.equal(V.getCurrentBeat(path).id, beat.id, "sıra bozuldu");
  seen.push(beat.id);
  if (beat.type === "boss") break;
  playBeat(V, path, beat);
}
assert.ok(seen.length > 1);

// (c) ters köşe: hedef veya NPC rolü değişir
const twistState = V.createState();
const eventBeat = storyBeats.find((beat) => beat.type === "event");
assert.ok(eventBeat, "ters köşe olayı yok");
for (const beat of storyBeats) {
  if (beat.id === eventBeat.id) break;
  playBeat(V, twistState, beat);
}
const roleBefore = V.getMiraRole(twistState);
const goalBefore = V.getObjective(twistState);
const twistResult = playBeat(V, twistState, eventBeat);
assert.equal(twistResult.ok, true);
const roleAfter = V.getMiraRole(twistState);
const goalAfter = V.getObjective(twistState);
assert.ok(roleAfter !== roleBefore || goalAfter !== goalBefore, "ters köşe hedefi veya rolü değiştirmedi");
assert.ok(twistState.twist);

// (d) kayıt round-trip yarıdaki durumu geri yükler
const mid = V.createState();
let played = 0;
for (const beat of storyBeats) {
  playBeat(V, mid, beat);
  played += 1;
  if (played >= 3) break;
}
goTo(V, mid, 910, 410);
const storage = new Map();
const mem = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
};
assert.equal(V.saveTo(mid, mem), true);
const loaded = V.loadFrom(mem);
assert.ok(loaded, "kayıt yüklenmedi");
const snap = V.snapshot(mid);
assert.equal(loaded.beatIndex, snap.beatIndex);
assert.equal(loaded.x, snap.x);
assert.equal(loaded.y, snap.y);
assert.equal(loaded.twist, snap.twist);
assert.equal(loaded.miraRole, snap.miraRole);
assert.deepEqual(loaded.collected, snap.collected);
assert.equal(V.getCurrentBeat(loaded).id, V.getCurrentBeat(mid).id);

// (e) hasar kaybettirir, boss yenilince kazanılır
const doomed = V.createState();
V.applyPlayerDamage(doomed, doomed.hp);
assert.equal(V.isLost(doomed), true);

const deathStore = new Map();
const deathMem = {
  getItem: (key) => (deathStore.has(key) ? deathStore.get(key) : null),
  setItem: (key, value) => deathStore.set(key, String(value)),
};
assert.equal(V.saveTo(doomed, deathMem), true);
const afterDeath = JSON.parse(deathMem.getItem(V.SAVE_KEY));
assert.ok(Number(afterDeath.hp) > 0, "ölüm kaydı canı 0 bırakmamalı");
assert.notEqual(afterDeath.outcome, "lost", "ölüm kaydı lost olarak kalmamalı");
const continued = V.loadFrom(deathMem);
assert.ok(continued, "devam kaydı yok");
const playable = V.prepareContinue(continued);
assert.equal(V.getOutcome(playable), "playing");
assert.ok(playable.hp > 0, "devam ederken can 0");
assert.equal(V.isLost(playable), false);
assert.equal(V.getOutcome(doomed), "lost");

const prior = V.createState();
prior.x = 333;
prior.hp = 72;
const priorStore = new Map();
const priorMem = {
  getItem: (key) => (priorStore.has(key) ? priorStore.get(key) : null),
  setItem: (key, value) => priorStore.set(key, String(value)),
};
assert.equal(V.saveTo(prior, priorMem), true);
const deadAfter = V.createState();
deadAfter.x = 500;
V.applyPlayerDamage(deadAfter, deadAfter.hp);
assert.equal(V.saveTo(deadAfter, priorMem), true);
const kept = V.loadFrom(priorMem);
assert.equal(V.getOutcome(kept), "playing");
assert.ok(kept.hp > 0);
assert.equal(kept.x, prior.x);

const hero = V.createState();
for (const beat of storyBeats) {
  if (beat.type === "boss") {
    playBeat(V, hero, beat);
    break;
  }
  playBeat(V, hero, beat);
}
assert.equal(V.isWon(hero), true);
assert.equal(V.getOutcome(hero), "won");

// kilitli bölgeye girilemez
const locked = V.createState();
const later = V.REGIONS.find((region) => region.unlockAt > locked.beatIndex);
assert.ok(later);
const ox = locked.x;
const oy = locked.y;
V.tryMove(locked, later.x + 40 - locked.x, later.y + 40 - locked.y);
const still = V.regionAt(locked.x, locked.y);
assert.ok(!still || still.id !== later.id || (locked.x === ox && locked.y === oy));

console.log("vespera unit ok", {
  regions: namedRegions.length,
  beats: storyBeats.length,
  twist: `${roleBefore}->${roleAfter}`,
  saveBeat: snap.beatIndex,
});
