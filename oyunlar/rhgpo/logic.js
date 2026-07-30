/**
 * RHGPO pure game logic — no DOM, no canvas.
 * Browser: attaches to globalThis.RHGPOLogic
 * Node: module.exports
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RHGPOLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TOTAL_ROUNDS = 5;
  const MAX_CRASHES = 3;
  const DAMAGE_COOLDOWN_MS = 900;
  const DOCK_MAX_SPEED = 110;
  const DOCK_MAX_ANGLE = 0.72;
  const DOCK_PAD = 12;
  const WORLD = { width: 1280, height: 720 };
  const STORAGE_KEY = "hakorocks-rhgpo-high-score";
  const ROUND_MODES = ["park", "tow"];
  const WIND_LABELS = [
    "Kuzey",
    "Kuzeydoğu",
    "Doğu",
    "Güneydoğu",
    "Güney",
    "Güneybatı",
    "Batı",
    "Kuzeybatı",
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  /** Normalize angle to [-PI, PI]. */
  function normalizeAngle(angle) {
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function getRoundMode(round) {
    return ROUND_MODES[(round - 1) % ROUND_MODES.length];
  }

  /**
   * Windward side of the ship relative to screen:
   * wind pushing from +x hits the left side of the ship (facing right).
   */
  function windwardSide(wind) {
    if (Math.abs(wind.x) >= Math.abs(wind.y)) {
      return wind.x >= 0 ? "left" : "right";
    }
    return wind.y >= 0 ? "left" : "right";
  }

  /**
   * Rope order: opposite side first, windward last.
   * @returns {Array<"left"|"right">}
   */
  function makeRopeOrder(wind) {
    const windward = windwardSide(wind);
    const opposite = windward === "left" ? "right" : "left";
    return [opposite, windward];
  }

  /**
   * Dock-ready when inside berth, slow enough, and facing the berth (right ≈ 0 rad).
   */
  function isDockReady(params) {
    const {
      shipX,
      shipY,
      shipVx = 0,
      shipVy = 0,
      shipAngle = 0,
      dock,
      maxSpeed = DOCK_MAX_SPEED,
      maxAngle = DOCK_MAX_ANGLE,
      pad = DOCK_PAD,
    } = params;

    if (!dock) return false;

    const inDock =
      shipX > dock.x - pad &&
      shipX < dock.x + dock.w + pad &&
      shipY > dock.y - pad &&
      shipY < dock.y + dock.h + pad;

    const speed = Math.hypot(shipVx, shipVy);
    const angleDiff = Math.abs(normalizeAngle(shipAngle));

    return inDock && speed < maxSpeed && angleDiff < maxAngle;
  }

  /**
   * Apply one rope pull. Wrong side leaves stage unchanged.
   * @returns {{ ropeStage: number, engineReady: boolean, correct: boolean, expected: string|null }}
   */
  function applyRopePull(ropeStage, ropeOrder, side) {
    const order = Array.isArray(ropeOrder) ? ropeOrder : [];
    const stage = Number(ropeStage) || 0;
    const expected = order[stage] || null;

    if (!expected) {
      return {
        ropeStage: stage,
        engineReady: stage >= order.length && order.length > 0,
        correct: false,
        expected: null,
      };
    }

    if (side !== expected) {
      return {
        ropeStage: stage,
        engineReady: false,
        correct: false,
        expected,
      };
    }

    const nextStage = stage + 1;
    const engineReady = nextStage >= order.length;
    return {
      ropeStage: nextStage,
      engineReady,
      correct: true,
      expected,
    };
  }

  /**
   * Collision damage with cooldown. In tow mode, counts toward crash limit.
   * @param {{ lastDamageAt: number, crashes: number, energy: number, mode: string }} state
   * @param {number} now
   * @param {number} energyLoss
   * @param {{ cooldownMs?: number, maxCrashes?: number }} [opts]
   * @returns {{ applied: boolean, lastDamageAt: number, crashes: number, energy: number, lost: boolean }}
   */
  function applyCollisionDamage(state, now, energyLoss, opts = {}) {
    const cooldownMs = opts.cooldownMs ?? DAMAGE_COOLDOWN_MS;
    const maxCrashes = opts.maxCrashes ?? MAX_CRASHES;
    const lastDamageAt = state.lastDamageAt ?? 0;

    if (now - lastDamageAt < cooldownMs) {
      return {
        applied: false,
        lastDamageAt,
        crashes: state.crashes ?? 0,
        energy: state.energy ?? 100,
        lost: false,
      };
    }

    let crashes = state.crashes ?? 0;
    let energy = Math.max(0, (state.energy ?? 100) - energyLoss);
    let lost = false;

    if (state.mode === "tow") {
      crashes += 1;
      if (crashes >= maxCrashes) lost = true;
    }

    if (energy <= 0) lost = true;

    return {
      applied: true,
      lastDamageAt: now,
      crashes,
      energy,
      lost,
    };
  }

  function isEnergyLost(energy) {
    return energy <= 0;
  }

  /**
   * Score bump when a round is completed.
   */
  function scoreForRoundComplete(round, energy, speed) {
    const bonus = Math.round(energy) + Math.max(0, 90 - Math.round(speed));
    return 100 + bonus + round * 18;
  }

  /**
   * After completing a round, advance. Returns win when finished round was TOTAL_ROUNDS.
   * @returns {{ nextRound: number, won: boolean, scoreDelta: number, score: number }}
   */
  function completeRoundTransition(round, score, energy, speed) {
    const scoreDelta = scoreForRoundComplete(round, energy, speed);
    const nextScore = score + scoreDelta;
    const nextRound = round + 1;
    const won = round >= TOTAL_ROUNDS;
    return {
      nextRound,
      won,
      scoreDelta,
      score: nextScore,
    };
  }

  function windName(x, y) {
    const angle = Math.atan2(y, x);
    // Map from vector angle to compass (N = -PI/2 in canvas coords where +y is down... use simple)
    const deg = ((Math.atan2(-y, x) * 180) / Math.PI + 360) % 360;
    const index = Math.round(deg / 45) % 8;
    return WIND_LABELS[index] || "Rüzgar";
  }

  function makeWindForRound(round, windVectors) {
    const vectors =
      windVectors ||
      [
        { x: 0, y: -1 },
        { x: 0.7, y: -0.7 },
        { x: 1, y: 0 },
        { x: 0.7, y: 0.7 },
        { x: 0, y: 1 },
        { x: -0.7, y: 0.7 },
        { x: -1, y: 0 },
        { x: -0.7, y: -0.7 },
      ];
    const index = (round - 1) % vectors.length;
    const base = vectors[index];
    return {
      x: base.x,
      y: base.y,
      strength: 12 + round * 2.5,
      timer: 10 - Math.min(3, round * 0.3),
      name: WIND_LABELS[index],
    };
  }

  function makeDock(round) {
    const yOptions = [180, 250, 340, 420];
    const y = yOptions[(round - 1) % yOptions.length];
    return { x: 980, y, w: 170, h: 220, angle: 0 };
  }

  function makeGoal(round) {
    const yOptions = [170, 260, 360, 450];
    return {
      x: 180,
      y: yOptions[(round - 1) % yOptions.length],
      r: 42,
    };
  }

  function makeObstacles(round) {
    return [
      { x: 400 + round * 8, y: 150, r: 20, kind: "rock" },
      { x: 700, y: 560 - round * 2, r: 18, kind: "buoy" },
      { x: 520, y: 380, r: 16, kind: "rock" },
    ];
  }

  return {
    TOTAL_ROUNDS,
    MAX_CRASHES,
    DAMAGE_COOLDOWN_MS,
    DOCK_MAX_SPEED,
    DOCK_MAX_ANGLE,
    DOCK_PAD,
    WORLD,
    STORAGE_KEY,
    ROUND_MODES,
    WIND_LABELS,
    clamp,
    distance,
    normalizeAngle,
    getRoundMode,
    windwardSide,
    makeRopeOrder,
    isDockReady,
    applyRopePull,
    applyCollisionDamage,
    isEnergyLost,
    scoreForRoundComplete,
    completeRoundTransition,
    windName,
    makeWindForRound,
    makeDock,
    makeGoal,
    makeObstacles,
  };
});
