import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {

  QUEST,
  advanceQuest,
  binaryMatches,
  nextHackStep,
  BINARY_PAPER,
  allDead,
  createFighter,
  applyDamage,
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

describe("long quest chain", () => {
  it("reaches done", () => {
    let q = QUEST.WAKE;
    const events = [
      "stood_up",
      "robot_talked",
      "at_color",
      "color_ok",
      "keycard_ok",
      "hide_ok",
      "run_ok",
      "fight_ok",
      "battery_ok",
      "color2_ok",
      "hide2_ok",
      "run2_ok",
      "pc_start",
      "hack_ok",
      "escaped",
    ];
    for (const ev of events) q = advanceQuest(q, ev);
    assert.equal(q, QUEST.DONE);
  });
});

describe("hack", () => {
  it("fail resets to 1", () => {
    assert.equal(nextHackStep(3, false), 1);
    assert.equal(binaryMatches(BINARY_PAPER), true);
  });
  it("combat", () => {
    const a = applyDamage(createFighter(10), 10);
    assert.equal(allDead([a]), true);
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

