/**
 * RHGPO unit tests — load the shipped logic.js (not a reimplementation).
 * Run: node oyunlar/rhgpo/tests/logic.test.mjs
 *
 * logic.js is a browser-friendly UMD that attaches to globalThis.RHGPOLogic
 * (package.json may be "type":"module", so require() won't export the API).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const logicPath = join(__dirname, "../logic.js");
const code = readFileSync(logicPath, "utf8");
const sandbox = {
  module: { exports: {} },
  exports: {},
  globalThis: {},
  console,
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(code, sandbox, { filename: logicPath });
const L = sandbox.module.exports?.TOTAL_ROUNDS
  ? sandbox.module.exports
  : sandbox.RHGPOLogic || sandbox.globalThis.RHGPOLogic;

if (!L || typeof L.isDockReady !== "function") {
  console.error("Failed to load shipped logic.js from", logicPath);
  console.error("keys", L && Object.keys(L));
  process.exit(1);
}
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${err.message}`);
  }
}

console.log("RHGPO logic tests (shipped logic.js)\n");

// —— (a) dock-ready ——
const berth = { x: 980, y: 250, w: 170, h: 220 };

test("dock-ready true: in berth + slow + facing right", () => {
  assert.equal(
    L.isDockReady({
      shipX: 1000,
      shipY: 300,
      shipVx: 20,
      shipVy: 0,
      shipAngle: 0.1,
      dock: berth,
    }),
    true
  );
});

test("dock-ready false: outside berth", () => {
  assert.equal(
    L.isDockReady({
      shipX: 200,
      shipY: 300,
      shipVx: 0,
      shipVy: 0,
      shipAngle: 0,
      dock: berth,
    }),
    false
  );
});

test("dock-ready false: too fast", () => {
  assert.equal(
    L.isDockReady({
      shipX: 1000,
      shipY: 300,
      shipVx: L.DOCK_MAX_SPEED + 5,
      shipVy: 0,
      shipAngle: 0,
      dock: berth,
    }),
    false
  );
});

test("dock-ready false: bad facing angle", () => {
  assert.equal(
    L.isDockReady({
      shipX: 1000,
      shipY: 300,
      shipVx: 0,
      shipVy: 0,
      shipAngle: Math.PI, // facing left
      dock: berth,
    }),
    false
  );
});

// —— (b) rope order ——
test("rope order: wind +x → windward left → order [right, left]", () => {
  // Arrays from vm realm need host-side copy for deepStrictEqual.
  const order = Array.from(L.makeRopeOrder({ x: 1, y: 0 }));
  assert.deepEqual(order, ["right", "left"]);
  assert.equal(L.windwardSide({ x: 1, y: 0 }), "left");
});

test("rope order: wind -x → windward right → order [left, right]", () => {
  const order = Array.from(L.makeRopeOrder({ x: -1, y: 0 }));
  assert.deepEqual(order, ["left", "right"]);
});
test("wrong rope pull leaves stage unchanged", () => {
  const order = ["right", "left"];
  const r = L.applyRopePull(0, order, "left");
  assert.equal(r.correct, false);
  assert.equal(r.ropeStage, 0);
  assert.equal(r.engineReady, false);
});

test("two correct pulls set engine-ready", () => {
  const order = ["right", "left"];
  const r1 = L.applyRopePull(0, order, "right");
  assert.equal(r1.correct, true);
  assert.equal(r1.ropeStage, 1);
  assert.equal(r1.engineReady, false);
  const r2 = L.applyRopePull(r1.ropeStage, order, "left");
  assert.equal(r2.correct, true);
  assert.equal(r2.ropeStage, 2);
  assert.equal(r2.engineReady, true);
});

// —— (c) crash / energy lose / win / score ——
test("three tow-mode crashes (respecting cooldown) yield lost", () => {
  let s = {
    lastDamageAt: -Infinity,
    crashes: 0,
    energy: 100,
    mode: "tow",
  };
  const cooldown = L.DAMAGE_COOLDOWN_MS;
  for (let i = 0; i < 3; i += 1) {
    const now = i * (cooldown + 1);
    const r = L.applyCollisionDamage(s, now, 5, {
      cooldownMs: cooldown,
      maxCrashes: L.MAX_CRASHES,
    });
    assert.equal(r.applied, true, `crash ${i + 1} should apply`);
    s = {
      lastDamageAt: r.lastDamageAt,
      crashes: r.crashes,
      energy: r.energy,
      mode: "tow",
    };
    if (i < 2) assert.equal(r.lost, false);
    else assert.equal(r.lost, true);
  }
  assert.equal(s.crashes, 3);
});

test("damage within cooldown is ignored", () => {
  const s = {
    lastDamageAt: 1000,
    crashes: 0,
    energy: 100,
    mode: "tow",
  };
  const r = L.applyCollisionDamage(s, 1000 + 100, 10, {
    cooldownMs: L.DAMAGE_COOLDOWN_MS,
  });
  assert.equal(r.applied, false);
  assert.equal(r.crashes, 0);
});

test("energy ≤ 0 yields lost (isEnergyLost)", () => {
  assert.equal(L.isEnergyLost(0), true);
  assert.equal(L.isEnergyLost(-1), true);
  assert.equal(L.isEnergyLost(1), false);
});

test("energy drain damage to zero sets lost", () => {
  const r = L.applyCollisionDamage(
    { lastDamageAt: 0, crashes: 0, energy: 3, mode: "park" },
    5000,
    10
  );
  assert.equal(r.applied, true);
  assert.equal(r.energy, 0);
  assert.equal(r.lost, true);
});

test("completing round 5 yields won", () => {
  const r = L.completeRoundTransition(5, 500, 80, 30);
  assert.equal(r.won, true);
  assert.equal(r.nextRound, 6);
  assert.ok(r.score > 500);
  assert.ok(r.scoreDelta > 0);
});

test("completing round 1 does not yet win", () => {
  const r = L.completeRoundTransition(1, 0, 100, 10);
  assert.equal(r.won, false);
  assert.equal(r.nextRound, 2);
});

test("score increases on completeRound", () => {
  const before = 200;
  const r = L.completeRoundTransition(2, before, 90, 20);
  assert.ok(r.score > before);
  assert.equal(r.score, before + r.scoreDelta);
  assert.equal(r.scoreDelta, L.scoreForRoundComplete(2, 90, 20));
});

test("round modes alternate park / tow", () => {
  assert.equal(L.getRoundMode(1), "park");
  assert.equal(L.getRoundMode(2), "tow");
  assert.equal(L.getRoundMode(3), "park");
  assert.equal(L.getRoundMode(4), "tow");
  assert.equal(L.getRoundMode(5), "park");
});

test("constants frozen for skill gates", () => {
  assert.equal(L.TOTAL_ROUNDS, 5);
  assert.equal(L.MAX_CRASHES, 3);
  assert.equal(L.DOCK_MAX_SPEED, 110);
  assert.ok(L.DOCK_MAX_ANGLE < Math.PI / 2);
  assert.equal(L.DAMAGE_COOLDOWN_MS, 900);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
