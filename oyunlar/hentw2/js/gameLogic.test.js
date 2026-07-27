import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {

  QUEST,
  QUEST_LABELS,
  advanceQuest,
  createFighter,
  applyDamage,
  allDead,
  encodeSave,
  decodeSave,
  easyEnemyHpMult,
  easyDamageTakenMult,
  easyRunTimeMult,
  easyPlayerDamageMult,
  easyHideFillMult,
  createCollectibles,
  collectItem,
  collectibleProgress,
  worldToMinimap,
  SAVE_KEY,
} from "./gameLogic.js";

describe("quest with fights", () => {
  it("patrol and guards in chain", () => {
    let q = QUEST.EXPLORE;
    q = advanceQuest(q, "patrol_start");
    assert.equal(q, QUEST.FIGHT_PATROL);
    q = advanceQuest(q, "patrol_won");
    assert.equal(q, QUEST.CASTLE_GATE);
    q = QUEST.FREE_ZIX;
    q = advanceQuest(q, "zix_freed");
    assert.equal(q, QUEST.FIGHT_GUARDS);
    q = advanceQuest(q, "guards_won");
    assert.equal(q, QUEST.GET_CRYSTAL1);
    q = advanceQuest(q, "crystal1");
    q = advanceQuest(q, "entered_portal");
    assert.equal(q, QUEST.PLANET2);
    q = advanceQuest(q, "lumina_ambush");
    assert.equal(q, QUEST.FIGHT_LUMINA);
    q = advanceQuest(q, "lumina_won");
    assert.equal(q, QUEST.GET_CRYSTAL2);
  });

  it("labels", () => {
    for (const id of Object.values(QUEST)) assert.ok(QUEST_LABELS[id]);
  });
});

describe("combat helpers", () => {
  it("damage and allDead", () => {
    let a = createFighter(30);
    a = applyDamage(a, 10);
    assert.equal(a.hp, 20);
    assert.equal(a.alive, true);
    a = applyDamage(a, 100);
    assert.equal(a.justDied, true);
    assert.equal(allDead([a, applyDamage(createFighter(5), 5)]), true);
  });
});


describe("shared series helpers", () => {
  it("save round-trip", () => {
    const raw = encodeSave({
      quest: "wake",
      easyMode: true,
      collectibles: [{ id: "s1", taken: true }, { id: "s2", taken: false }],
      collectedCount: 1,
      playerHp: 77,
      extra: { foo: 1 },
    });
    const d = decodeSave(raw);
    assert.ok(d);
    assert.equal(d.quest, "wake");
    assert.equal(d.easyMode, true);
    assert.equal(d.collectedCount, 1);
    assert.equal(d.playerHp, 77);
    assert.equal(d.collectibles[0].taken, true);
    assert.equal(d.extra.foo, 1);
    assert.equal(decodeSave(null), null);
    assert.equal(decodeSave("{"), null);
    assert.equal(decodeSave('{"v":99,"quest":"x"}'), null);
  });

  it("easy mode knobs", () => {
    assert.ok(easyEnemyHpMult(true) < easyEnemyHpMult(false));
    assert.ok(easyDamageTakenMult(true) < easyDamageTakenMult(false));
    assert.ok(easyRunTimeMult(true) > easyRunTimeMult(false));
    assert.ok(easyPlayerDamageMult(true) > easyPlayerDamageMult(false));
    assert.ok(easyHideFillMult(true) > easyHideFillMult(false));
  });

  it("collectibles progress", () => {
    let list = createCollectibles(["a", "b", "c"]);
    assert.deepEqual(collectibleProgress(list), { got: 0, total: 3, complete: false });
    list = collectItem(list, "b");
    assert.equal(collectibleProgress(list).got, 1);
    list = collectItem(list, "a");
    list = collectItem(list, "c");
    assert.equal(collectibleProgress(list).complete, true);
  });

  it("minimap mapping", () => {
    const b = { minX: -5, maxX: 5, minZ: 0, maxZ: 100 };
    const mid = worldToMinimap(0, 50, b, 100);
    assert.ok(Math.abs(mid.x - 50) < 0.01);
    assert.ok(Math.abs(mid.y - 50) < 0.01);
    const edge = worldToMinimap(-5, 0, b, 100);
    assert.equal(edge.x, 0);
    assert.equal(edge.y, 0);
  });

  it("SAVE_KEY namespaced", () => {
    assert.ok(typeof SAVE_KEY === "string" && SAVE_KEY.length > 0);
  });
});

