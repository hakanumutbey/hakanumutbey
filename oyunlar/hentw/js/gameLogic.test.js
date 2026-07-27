/**
 * Real unit tests against shipped gameLogic.js (no oracle re-implementation).
 * Run: node --test hentw/js/gameLogic.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {

  QUEST,
  QUEST_LABELS,
  QUEST_EVENTS,
  advanceQuest,
  syncEarlyQuest,
  shouldHidePlayerForCam,
  canInteract,
  distXZ,
  applyBossDamage,
  tickBossChase,
  applySphereHit,
  tabletFeatures,
  crateLoot,
  createBoss,
  PLANET_CAMS,
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

describe("shouldHidePlayerForCam", () => {
  it("hides player on space and approach planet cams", () => {
    assert.equal(shouldHidePlayerForCam("space"), true);
    assert.equal(shouldHidePlayerForCam("approach"), true);
    assert.ok(PLANET_CAMS.has("space"));
  });
  it("shows player on crash/reveal/wake and unknown", () => {
    assert.equal(shouldHidePlayerForCam("black"), false);
    assert.equal(shouldHidePlayerForCam("reveal"), false);
    assert.equal(shouldHidePlayerForCam("wake"), false);
    assert.equal(shouldHidePlayerForCam("storm"), false);
  });
});

describe("advanceQuest graph", () => {
  it("walks full Bölüm-1 chain", () => {
    let q = QUEST.PICK_GUN;
    q = advanceQuest(q, "picked_gun");
    assert.equal(q, QUEST.TALK_ROBOT);
    q = advanceQuest(q, "robot_broken");
    assert.equal(q, QUEST.EXIT_ROCKET);
    q = advanceQuest(q, "left_wreck");
    assert.equal(q, QUEST.EXPLORE);
    q = advanceQuest(q, "explore_done");
    assert.equal(q, QUEST.FIND_SPHERE);
    q = advanceQuest(q, "sphere_opened");
    assert.equal(q, QUEST.DEFEAT_BOSS);
    q = advanceQuest(q, "boss_defeated");
    assert.equal(q, QUEST.PICK_SHINE);
    q = advanceQuest(q, "shine_picked");
    assert.equal(q, QUEST.FIND_CRATE);
    q = advanceQuest(q, "crate_looted");
    assert.equal(q, QUEST.TABLET);
    q = advanceQuest(q, "tablet_opened");
    assert.equal(q, QUEST.FIND_SIGNAL);
    q = advanceQuest(q, "signal_found");
    assert.equal(q, QUEST.ACTIVATE_RELAY);
    q = advanceQuest(q, "relay_activated");
    assert.equal(q, QUEST.GET_JOLE);
    q = advanceQuest(q, "jole_picked");
    assert.equal(q, QUEST.REPAIR_ROCKET);
    q = advanceQuest(q, "rocket_repaired");
    assert.equal(q, QUEST.FINALE);
    q = advanceQuest(q, "finale_done");
    assert.equal(q, QUEST.DONE);
  });

  it("ignores wrong-stage events", () => {
    assert.equal(advanceQuest(QUEST.PICK_GUN, "boss_defeated"), QUEST.PICK_GUN);
    assert.equal(advanceQuest(QUEST.FIND_SPHERE, "picked_gun"), QUEST.FIND_SPHERE);
  });

  it("unknown event leaves quest unchanged", () => {
    assert.equal(advanceQuest(QUEST.EXPLORE, "nope"), QUEST.EXPLORE);
  });

  it("every QUEST_EVENTS edge uses known quests", () => {
    const values = new Set(Object.values(QUEST));
    for (const [name, edge] of Object.entries(QUEST_EVENTS)) {
      assert.ok(values.has(edge.from), `${name} from`);
      assert.ok(values.has(edge.to), `${name} to`);
    }
  });

  it("labels exist for every quest id", () => {
    for (const id of Object.values(QUEST)) {
      assert.equal(typeof QUEST_LABELS[id], "string");
      assert.ok(QUEST_LABELS[id].length > 0);
    }
  });
});

describe("syncEarlyQuest any-order", () => {
  it("robot first then gun → exit_rocket", () => {
    let q = syncEarlyQuest({ hasGun: false, robotBroken: false, quest: QUEST.PICK_GUN });
    assert.equal(q, QUEST.PICK_GUN);
    q = syncEarlyQuest({ hasGun: false, robotBroken: true, quest: QUEST.PICK_GUN });
    assert.equal(q, QUEST.PICK_GUN); // still need gun
    q = syncEarlyQuest({ hasGun: true, robotBroken: true, quest: QUEST.PICK_GUN });
    assert.equal(q, QUEST.EXIT_ROCKET);
  });
  it("gun first then robot → talk then exit", () => {
    let q = syncEarlyQuest({ hasGun: true, robotBroken: false, quest: QUEST.PICK_GUN });
    assert.equal(q, QUEST.TALK_ROBOT);
    q = syncEarlyQuest({ hasGun: true, robotBroken: true, quest: QUEST.TALK_ROBOT });
    assert.equal(q, QUEST.EXIT_ROCKET);
  });
  it("does not regress late quests", () => {
    assert.equal(
      syncEarlyQuest({ hasGun: true, robotBroken: true, quest: QUEST.FIND_SPHERE }),
      QUEST.FIND_SPHERE
    );
  });
});

describe("canInteract / distXZ", () => {
  it("distXZ is Euclidean on XZ", () => {
    assert.equal(distXZ(0, 0, 3, 4), 5);
  });
  it("canInteract is strict less-than range", () => {
    assert.equal(canInteract(1.9, 2), true);
    assert.equal(canInteract(2, 2), false);
    assert.equal(canInteract(-1, 2), false);
  });
});

describe("boss combat", () => {
  it("createBoss starts full HP alive", () => {
    const b = createBoss(80);
    assert.equal(b.hp, 80);
    assert.equal(b.maxHp, 80);
    assert.equal(b.alive, true);
  });

  it("applyBossDamage reduces HP and flags defeat", () => {
    let b = createBoss(100);
    b = applyBossDamage(b, 40);
    assert.equal(b.hp, 60);
    assert.equal(b.alive, true);
    assert.equal(b.justDefeated, false);
    b = applyBossDamage(b, 100);
    assert.equal(b.hp, 0);
    assert.equal(b.alive, false);
    assert.equal(b.justDefeated, true);
    const again = applyBossDamage(b, 10);
    assert.equal(again.justDefeated, false);
    assert.equal(again.hp, 0);
  });

  it("tickBossChase moves toward target", () => {
    const moved = tickBossChase({ x: 0, z: 0, speed: 10 }, { x: 10, z: 0 }, 0.5);
    assert.ok(moved.x > 0);
    assert.ok(moved.x <= 5.01);
    assert.ok(moved.dist < 10);
  });
});

describe("sphere / crate / tablet", () => {
  it("sphere opens after enough hits", () => {
    let s = applySphereHit(0, 0.4);
    assert.equal(s.opened, false);
    s = applySphereHit(s.progress, 0.4);
    s = applySphereHit(s.progress, 0.3);
    assert.equal(s.opened, true);
    assert.equal(s.progress, 1);
  });

  it("crateLoot yields food, power orb, tablet", () => {
    const L = crateLoot();
    assert.equal(L.food, true);
    assert.equal(L.powerOrb, true);
    assert.equal(L.tablet, true);
  });

  it("tablet music only after Işıltı Küresi", () => {
    assert.deepEqual(tabletFeatures({ hasShineOrb: false }), {
      map: true,
      signal: true,
      music: false,
    });
    assert.deepEqual(tabletFeatures({ hasShineOrb: true }), {
      map: true,
      signal: true,
      music: true,
    });
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

