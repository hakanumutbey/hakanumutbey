/**
 * RHGPO — Rüzgarlı Havada Gemi Park Etme Oyunu
 * Shell: DOM + canvas + input. Core rules live in logic.js (RHGPOLogic).
 */
(function () {
  "use strict";

  const L = globalThis.RHGPOLogic;
  if (!L) {
    console.error("RHGPO: logic.js yüklenmedi (RHGPOLogic yok).");
    return;
  }

  const {
    TOTAL_ROUNDS,
    MAX_CRASHES,
    DAMAGE_COOLDOWN_MS,
    DOCK_MAX_SPEED,
    WORLD,
    STORAGE_KEY,
    clamp,
    distance,
    normalizeAngle,
    getRoundMode,
    makeRopeOrder,
    isDockReady,
    applyRopePull,
    applyCollisionDamage,
    isEnergyLost,
    mayCompleteRound,
    mayApplyLose,
    applyEnergyDrainWhilePlaying,
    completeRoundTransition,
    windName,
    makeWindForRound,
    makeDock,
    makeGoal,
    makeObstacles,
  } = L;

  const canvas = document.querySelector("#gameCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const startButton = document.querySelector("#startButton");
  const restartButton = document.querySelector("#restartButton");
  const roundLabel = document.querySelector("#roundLabel");
  const scoreLabel = document.querySelector("#scoreLabel");
  const modeLabel = document.querySelector("#modeLabel");
  const energyLabel = document.querySelector("#energyLabel");
  const windLabel = document.querySelector("#windLabel");
  const crashLabel = document.querySelector("#crashLabel");
  const speedLabel = document.querySelector("#speedLabel");
  const highScoreLabel = document.querySelector("#highScoreLabel");
  const bestScoreLabel = document.querySelector("#bestScoreLabel");
  const statusLabel = document.querySelector("#statusLabel");
  const hintLabel = document.querySelector("#hintLabel");
  const towControls = document.querySelector("[data-tow-controls]");

  const GAMEPAD_DEADZONE = 0.35;
  const WIND_VECTORS = [
    { x: 0, y: -1 },
    { x: 0.7, y: -0.7 },
    { x: 1, y: 0 },
    { x: 0.7, y: 0.7 },
    { x: 0, y: 1 },
    { x: -0.7, y: 0.7 },
    { x: -1, y: 0 },
    { x: -0.7, y: -0.7 },
  ];

  function readHighScore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  function writeHighScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(value))));
    } catch {
      /* private mode */
    }
  }

  const state = {
    phase: "menu", // menu | boarding | playing | transition | won | lost
    round: 1,
    mode: "park",
    score: 0,
    energy: 100,
    crashes: 0,
    ropeStage: 0,
    ropeOrder: [],
    engineReady: false,
    engineOn: false,
    dockReady: false,
    highScore: readHighScore(),
    message: "Hazır olduğunda Başla'ya bas.",
    lastFrame: performance.now(),
    lastDamageAt: -Infinity,
    boardingUntil: 0,
    nextRoundAt: 0,
    danceUntil: 0,
    time: 0,
    worldScale: 1,
    wind: { x: 1, y: -0.4, strength: 22, timer: 10, name: "Kuzeydoğu" },
    ship: {
      x: 220,
      y: 360,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: 22,
    },
    dock: makeDock(1),
    goal: makeGoal(1),
    obstacles: makeObstacles(1),
    particles: [],
    wake: [],
    input: {
      left: false,
      right: false,
      forward: false,
      reverse: false,
      dock: false,
    },
    gamepad: {
      left: false,
      right: false,
      forward: false,
      reverse: false,
      dock: false,
    },
    touch: { active: null },
  };

  const keys = new Set();
  const gamepadState = { buttons: new Set() };

  // —— Bootstrap ——
  if (startButton) startButton.addEventListener("click", startGame);
  if (restartButton) restartButton.addEventListener("click", restartGame);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("load", resizeCanvas);
  window.addEventListener("blur", resetInput);
  window.addEventListener("pagehide", resetInput);
  window.addEventListener("gamepaddisconnected", () => {
    resetGamepadInput();
    syncKeys();
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    const down = (event) => {
      event.preventDefault();
      setTouch(action, true);
    };
    const up = (event) => {
      event.preventDefault();
      setTouch(action, false);
    };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointerleave", up);
    button.addEventListener("pointercancel", up);
  });

  resizeCanvas();
  renderHud();
  draw();
  requestAnimationFrame(loop);

  // Expose for launch/smoke tests
  globalThis.RHGPO = {
    getState: () => state,
    startGame,
    restartGame,
    isDockReady: (p) => isDockReady(p),
    logic: L,
  };

  // —— Lifecycle ——
  function startGame() {
    if (state.phase === "playing" || state.phase === "boarding") return;
    resetRun();
    state.phase = "boarding";
    state.boardingUntil = performance.now() + 900;
    state.message = "Gemimize biniyorsun…";
    spawnParticles(state.ship.x, state.ship.y, "#55d6ff", 16);
  }

  function restartGame() {
    resetRun();
    state.phase = "menu";
    state.message = "Hazır olduğunda Başla'ya bas.";
    resetShip();
    draw();
    renderHud();
  }

  function resetRun() {
    state.round = 1;
    state.mode = "park";
    state.score = 0;
    state.energy = 100;
    state.crashes = 0;
    state.ropeStage = 0;
    state.ropeOrder = [];
    state.engineReady = false;
    state.engineOn = false;
    state.dockReady = false;
    state.lastDamageAt = -Infinity;
    state.particles = [];
    state.wake = [];
    resetShip();
    resetInput();
  }

  function spawnRound() {
    state.phase = "playing";
    state.wind = makeWindForRound(state.round, WIND_VECTORS);
    state.mode = getRoundMode(state.round);
    state.crashes = 0;
    state.ropeStage = 0;
    state.ropeOrder = [];
    state.engineReady = state.mode === "park";
    state.engineOn = state.mode === "park";
    state.dockReady = false;
    state.dock = makeDock(state.round);
    state.goal = makeGoal(state.round);
    state.obstacles = makeObstacles(state.round);
    resetShip();

    if (state.mode === "tow") {
      state.ropeOrder = makeRopeOrder(state.wind);
      state.message = `Tur ${state.round}. Motor: halatları sırayla çek (önce rüzgarın tersi).`;
    } else {
      state.message =
        state.round === 1
          ? "Rüzgarlı limana yanaş. Yavaşla, açıyı tut, Space / E ile park et."
          : `Tur ${state.round}. Rüzgarlı park — yavaşla ve Space / E bas.`;
    }
  }

  function resetShip() {
    state.ship.x = 220;
    state.ship.y = 360;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.angle = 0;
  }

  // —— Input ——
  function handleKeyDown(event) {
    keys.add(event.code);
    syncKeys();

    if (state.phase === "menu" && (event.code === "Enter" || event.code === "Space")) {
      event.preventDefault();
      startGame();
      return;
    }
    if ((state.phase === "won" || state.phase === "lost") && event.code === "Enter") {
      event.preventDefault();
      restartGame();
      startGame();
      return;
    }
    if (state.phase !== "playing") return;

    if (state.mode === "tow") {
      if (!state.engineReady && !state.engineOn) {
        if (event.code === "KeyQ") {
          event.preventDefault();
          pullRope("left");
          return;
        }
        if (event.code === "KeyE") {
          event.preventDefault();
          pullRope("right");
          return;
        }
      }
      if (
        state.engineReady &&
        (event.code === "KeyE" || event.code === "KeyM" || event.code === "Space")
      ) {
        if (!event.repeat) {
          event.preventDefault();
          toggleEngine();
        }
        return;
      }
    }

    if (
      state.mode !== "tow" &&
      (event.code === "Space" || event.code === "KeyE")
    ) {
      event.preventDefault();
      state.input.dock = true;
    }
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
    syncKeys();
    if (state.mode !== "tow" && (event.code === "Space" || event.code === "KeyE")) {
      state.input.dock = false;
    }
  }

  function syncKeys() {
    state.input.left =
      keys.has("ArrowLeft") ||
      keys.has("KeyA") ||
      state.touch.active === "left" ||
      state.gamepad.left;
    state.input.right =
      keys.has("ArrowRight") ||
      keys.has("KeyD") ||
      state.touch.active === "right" ||
      state.gamepad.right;
    state.input.forward =
      keys.has("ArrowUp") ||
      keys.has("KeyW") ||
      state.touch.active === "forward" ||
      state.gamepad.forward;
    state.input.reverse =
      keys.has("ArrowDown") ||
      keys.has("KeyS") ||
      state.touch.active === "reverse" ||
      state.gamepad.reverse;
    state.input.dock =
      state.mode !== "tow" &&
      (keys.has("Space") ||
        keys.has("KeyE") ||
        state.touch.active === "dock" ||
        state.gamepad.dock);
  }

  function resetInput() {
    keys.clear();
    resetGamepadInput();
    state.touch.active = null;
    syncKeys();
  }

  function resetGamepadInput() {
    gamepadState.buttons = new Set();
    state.gamepad.left = false;
    state.gamepad.right = false;
    state.gamepad.forward = false;
    state.gamepad.reverse = false;
    state.gamepad.dock = false;
  }

  function setTouch(action, pressed) {
    state.touch.active = pressed
      ? action
      : state.touch.active === action
        ? null
        : state.touch.active;
    if (action === "left") state.input.left = pressed;
    if (action === "right") state.input.right = pressed;
    if (action === "forward") state.input.forward = pressed;
    if (action === "reverse") state.input.reverse = pressed;
    if (action === "dock") state.input.dock = pressed && state.mode !== "tow";
    syncKeys();
    if (!pressed) return;
    if (action === "rope-left") pullRope("left");
    if (action === "rope-right") pullRope("right");
    if (action === "engine") toggleEngine();
  }

  function pollGamepadInput() {
    const gamepad = getPrimaryGamepad();
    if (!gamepad) {
      if (gamepadState.buttons.size || Object.values(state.gamepad).some(Boolean)) {
        resetGamepadInput();
        syncKeys();
      }
      return;
    }

    const nextButtons = new Set();
    const button = (index, name) => {
      const control = gamepad.buttons[index];
      const pressed = Boolean(control?.pressed || control?.value > 0.6);
      if (pressed) nextButtons.add(name);
      return pressed;
    };

    const primary = button(0, "primary");
    button(1, "secondary");
    const leftRope = button(2, "left-rope") || button(4, "left-rope");
    const rightRope = button(3, "right-rope") || button(5, "right-rope");
    const rightTrigger = button(7, "right-trigger");
    button(8, "select");
    const start = button(9, "start");
    const dpadUp = button(12, "dpad-up");
    const dpadDown = button(13, "dpad-down");
    const dpadLeft = button(14, "dpad-left");
    const dpadRight = button(15, "dpad-right");
    const axisX = deadzone(gamepad.axes[0] || 0);
    const axisY = deadzone(gamepad.axes[1] || 0);

    state.gamepad.left = axisX < 0 || dpadLeft;
    state.gamepad.right = axisX > 0 || dpadRight;
    state.gamepad.forward = axisY < 0 || dpadUp;
    state.gamepad.reverse = axisY > 0 || dpadDown;
    state.gamepad.dock = primary || rightTrigger;

    if (pressedOnce(nextButtons, "primary") || pressedOnce(nextButtons, "start")) {
      if (state.phase === "menu") startGame();
      if (state.phase === "won" || state.phase === "lost") {
        restartGame();
        startGame();
      }
    }
    if (pressedOnce(nextButtons, "select") && state.phase !== "menu") restartGame();

    if (state.phase === "playing" && state.mode === "tow") {
      if (leftRope && pressedOnce(nextButtons, "left-rope")) pullRope("left");
      if (rightRope && pressedOnce(nextButtons, "right-rope")) pullRope("right");
      if (
        (primary && pressedOnce(nextButtons, "primary")) ||
        (start && pressedOnce(nextButtons, "start")) ||
        (rightTrigger && pressedOnce(nextButtons, "right-trigger"))
      ) {
        toggleEngine();
      }
    }

    gamepadState.buttons = nextButtons;
    syncKeys();
  }

  function getPrimaryGamepad() {
    if (!navigator.getGamepads) return null;
    return Array.from(navigator.getGamepads()).find((g) => g?.connected) || null;
  }

  function pressedOnce(nextButtons, name) {
    return nextButtons.has(name) && !gamepadState.buttons.has(name);
  }

  function deadzone(value) {
    return Math.abs(value) >= GAMEPAD_DEADZONE ? value : 0;
  }

  // —— Loop ——
  function loop(now) {
    const dt = Math.min(0.033, (now - state.lastFrame) / 1000);
    state.lastFrame = now;
    state.time += dt;
    resizeCanvas();
    pollGamepadInput();

    if (state.phase === "boarding" && now >= state.boardingUntil) {
      spawnRound();
    } else if (state.phase === "playing") {
      updateWind(dt);
      updateShip(dt);
      updateWake(dt);
      // Crash/energy inside updateShip may have already set phase to lost — do not complete a round after that.
      if (state.phase === "playing") {
        if (state.mode === "tow") {
          checkTowGoal(now);
        } else {
          checkDock(now);
        }
      }
      // Energy only drains while still playing (skip after same-frame completeRound → transition).
      if (state.phase === "playing") {
        const drain = applyEnergyDrainWhilePlaying(
          state.phase,
          state.energy,
          dt,
          0.25 + state.round * 0.05
        );
        state.energy = drain.energy;
        if (drain.lost) loseGame();
      }
    } else if (state.phase === "transition" && now >= state.nextRoundAt) {
      if (state.round > TOTAL_ROUNDS) {
        winGame();
      } else {
        spawnRound();
      }
    }

    updateParticles(dt);
    draw();
    renderHud();
    requestAnimationFrame(loop);
  }

  // —— Gameplay rules ——
  function pullRope(side) {
    if (state.mode !== "tow" || state.engineOn || state.phase !== "playing") return;
    const result = applyRopePull(state.ropeStage, state.ropeOrder, side);
    if (!result.expected) return;
    if (!result.correct) {
      const want = result.expected === "left" ? "SOL (Q)" : "SAĞ (E)";
      state.message = `Yanlış halat! Şimdi ${want} çek.`;
      return;
    }
    state.ropeStage = result.ropeStage;
    state.engineReady = result.engineReady;
    if (result.engineReady) {
      state.message = "Halatlar tamam! E veya Space ile motoru AÇ.";
    } else {
      const next = state.ropeOrder[state.ropeStage];
      state.message =
        next === "left"
          ? "İyi! Şimdi SOL (Q) halatı çek."
          : "İyi! Şimdi SAĞ (E) halatı çek.";
    }
  }

  function toggleEngine(forceOn = false) {
    if (state.mode !== "tow" || !state.engineReady || state.phase !== "playing") return;
    if (forceOn === true) {
      if (state.engineOn) return;
      state.engineOn = true;
      state.message = "Motor çalıştı. Çıkışa git. E ile kapatabilirsin.";
      return;
    }
    state.engineOn = !state.engineOn;
    state.message = state.engineOn
      ? "Motor açık. Çıkışa doğru ilerle. E ile kapat."
      : "Motor kapalı. Gemi süzülür. E ile tekrar aç.";
  }

  function updateWind(dt) {
    state.wind.timer -= dt;
    if (state.wind.timer <= 0) {
      const nextIndex = Math.floor(Math.random() * WIND_VECTORS.length);
      const next = WIND_VECTORS[nextIndex];
      state.wind.x = next.x;
      state.wind.y = next.y;
      state.wind.strength = 12 + state.round * 2.5 + Math.random() * 4;
      state.wind.timer = 9 - Math.min(2.5, state.round * 0.3) + Math.random() * 1.5;
      state.wind.name = windName(next.x, next.y);
      // Rope order stays fixed for the tow round once set (fairness).
      state.message = `Rüzgar değişti: ${state.wind.name}.`;
    }
  }

  function updateShip(dt) {
    const ship = state.ship;
    const turnSpeed = 3.2;
    const thrust = 280;
    const reverse = 170;
    const windForce = state.wind.strength;
    const drag = 0.978;
    const towMode = state.mode === "tow";
    const canDrive = !towMode || state.engineOn;
    const steer = canDrive ? turnSpeed : turnSpeed * 0.45;

    if (state.input.left) ship.angle -= steer * dt;
    if (state.input.right) ship.angle += steer * dt;

    const forwardX = Math.cos(ship.angle);
    const forwardY = Math.sin(ship.angle);
    if (canDrive && state.input.forward) {
      ship.vx += forwardX * thrust * dt;
      ship.vy += forwardY * thrust * dt;
      state.energy = Math.max(0, state.energy - dt * 0.9);
    }
    if (canDrive && state.input.reverse) {
      ship.vx -= forwardX * reverse * dt;
      ship.vy -= forwardY * reverse * dt;
      state.energy = Math.max(0, state.energy - dt * 0.5);
    }

    // Ruzgar etkisi: surus halinde ~0.7, motor kapali cekide ~0.45
    // (onceki 0.22 / 0.06 degerleri ruzgari neredeyse hissedilmez yapiyordu).
    const windScale = towMode && !state.engineOn ? 0.45 : 0.7;
    ship.vx += state.wind.x * windForce * windScale * dt;
    ship.vy += state.wind.y * windForce * windScale * dt;
    if (towMode && !state.engineOn) {
      ship.vx *= Math.pow(0.97, dt * 60);
      ship.vy *= Math.pow(0.97, dt * 60);
    }

    ship.vx *= Math.pow(drag, dt * 60);
    ship.vy *= Math.pow(drag, dt * 60);

    const speedNow = Math.hypot(ship.vx, ship.vy);
    const maxSpeed = towMode ? 300 : 260;
    if (speedNow > maxSpeed) {
      ship.vx = (ship.vx / speedNow) * maxSpeed;
      ship.vy = (ship.vy / speedNow) * maxSpeed;
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    if (ship.x < 40 || ship.x > WORLD.width - 40) {
      ship.x = clamp(ship.x, 40, WORLD.width - 40);
      ship.vx *= -0.25;
      applyCollision("Sınır", towMode ? 6 : 1);
    }
    if (ship.y < 40 || ship.y > WORLD.height - 40) {
      ship.y = clamp(ship.y, 40, WORLD.height - 40);
      ship.vy *= -0.25;
      applyCollision("Sınır", towMode ? 6 : 1);
    }

    const obstacleHit = state.obstacles.find(
      (o) => distance(ship.x, ship.y, o.x, o.y) < o.r + ship.radius
    );
    if (obstacleHit) {
      const dx = ship.x - obstacleHit.x;
      const dy = ship.y - obstacleHit.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      ship.x = obstacleHit.x + (dx / length) * (obstacleHit.r + ship.radius + 2);
      ship.y = obstacleHit.y + (dy / length) * (obstacleHit.r + ship.radius + 2);
      ship.vx *= -0.25;
      ship.vy *= -0.25;
      applyCollision(
        obstacleHit.kind === "buoy" ? "Şamandıra" : "Kaya",
        towMode ? 8 : 3
      );
    }
  }

  function applyCollision(reason, energyLoss) {
    if (state.phase !== "playing") return;
    const now = performance.now();
    const result = applyCollisionDamage(
      {
        lastDamageAt: state.lastDamageAt,
        crashes: state.crashes,
        energy: state.energy,
        mode: state.mode,
      },
      now,
      energyLoss,
      { cooldownMs: DAMAGE_COOLDOWN_MS, maxCrashes: MAX_CRASHES }
    );
    if (!result.applied) return;

    state.lastDamageAt = result.lastDamageAt;
    state.crashes = result.crashes;
    state.energy = result.energy;

    if (state.mode === "tow") {
      state.message = `${reason} çarpması! ${Math.max(0, MAX_CRASHES - state.crashes)} hak kaldı.`;
      spawnParticles(state.ship.x, state.ship.y, "#ff6b7a", 10);
      state.ship.vx *= 0.2;
      state.ship.vy *= 0.2;
      if (result.lost) {
        loseGame();
        return;
      }
      return;
    }

    state.message = `${reason}'a çarptın. Direksiyonu düzelt.`;
    spawnParticles(state.ship.x, state.ship.y, "#ffd166", 8);
    if (result.lost) loseGame();
  }

  function checkDock(now) {
    if (state.phase !== "playing" || state.mode === "tow") return;
    const ship = state.ship;
    state.dockReady = isDockReady({
      shipX: ship.x,
      shipY: ship.y,
      shipVx: ship.vx,
      shipVy: ship.vy,
      shipAngle: ship.angle,
      dock: state.dock,
    });

    if (state.dockReady && state.input.dock) {
      completeRound(now);
      return;
    }

    const pad = 12;
    const inDock =
      ship.x > state.dock.x - pad &&
      ship.x < state.dock.x + state.dock.w + pad &&
      ship.y > state.dock.y - pad &&
      ship.y < state.dock.y + state.dock.h + pad;
    const speed = Math.hypot(ship.vx, ship.vy);

    if (inDock && !state.dockReady) {
      state.message =
        speed >= DOCK_MAX_SPEED
          ? "Rüzgara karşı yavaşla — liman yeşile dönsün, sonra Space / E."
          : "Burnu limana (sağa →) çevir. Rüzgarı hesaba kat.";
    } else if (state.dockReady) {
      state.message = "Güzel yanaşma! Space veya E ile park et.";
    }
  }

  function checkTowGoal() {
    if (state.phase !== "playing" || state.mode !== "tow") return;
    const ship = state.ship;
    const goalDistance = distance(ship.x, ship.y, state.goal.x, state.goal.y);
    if (state.engineOn && goalDistance < state.goal.r + ship.radius + 4) {
      completeRound(performance.now(), "tow");
    }
  }

  function completeRound(now, mode = state.mode) {
    if (!mayCompleteRound(state.phase)) return;
    const speed = Math.hypot(state.ship.vx, state.ship.vy);
    const result = completeRoundTransition(
      state.round,
      state.score,
      state.energy,
      speed,
      state.phase
    );
    if (!result) return;
    state.score = result.score;
    state.message =
      mode === "tow"
        ? `Tur ${state.round} tamamlandı. Motor modunda çıkışı geçtin.`
        : `Tur ${state.round} tamamlandı. Limana yanaştın.`;
    spawnParticles(
      state.ship.x,
      state.ship.y,
      mode === "tow" ? "#55d6ff" : "#96f06f",
      22
    );
    state.round = result.nextRound;
    state.phase = result.phase; // "transition"
    state.dockReady = false;
    state.nextRoundAt = now + 1200;
    state.danceUntil = now + 1400;
    maybeSaveHighScore();
  }

  function winGame() {
    if (state.phase === "won" || state.phase === "lost") return;
    state.phase = "won";
    state.message = "Beş tur tamamlandı. RHGPO kazandın!";
    spawnParticles(state.ship.x, state.ship.y, "#ffd166", 36);
    spawnParticles(WORLD.width / 2, WORLD.height / 2, "#96f06f", 28);
    maybeSaveHighScore();
  }

  function loseGame() {
    // Only lose while actively playing — never clobber transition/won after a finish.
    if (!mayApplyLose(state.phase)) return;
    state.phase = "lost";
    state.message = "Oyun bitti. Tekrar dene.";
    spawnParticles(state.ship.x, state.ship.y, "#ff6b7a", 18);
    maybeSaveHighScore();
  }

  function maybeSaveHighScore() {
    if (state.score > state.highScore) {
      state.highScore = state.score;
      writeHighScore(state.highScore);
    }
  }

  // —— FX ——
  function spawnParticles(x, y, color, count = 14) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      const life = 0.5 + Math.random() * 0.55;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  function updateParticles(dt) {
    state.particles = state.particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vy: p.vy + 30 * dt,
        life: p.life - dt,
      }))
      .filter((p) => p.life > 0);
  }

  function updateWake(dt) {
    const speed = Math.hypot(state.ship.vx, state.ship.vy);
    if (speed > 18 && state.phase === "playing") {
      const backX = state.ship.x - Math.cos(state.ship.angle) * 22;
      const backY = state.ship.y - Math.sin(state.ship.angle) * 22;
      state.wake.push({ x: backX, y: backY, life: 0.7, r: 4 + speed * 0.03 });
    }
    state.wake = state.wake
      .map((w) => ({ ...w, life: w.life - dt, r: w.r + dt * 12 }))
      .filter((w) => w.life > 0)
      .slice(-40);
  }

  // —— HUD ——
  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function ropeHintText() {
    const expected = state.ropeOrder[state.ropeStage];
    if (!expected) return "Halatlar tamam. E veya Space ile motoru AÇ / KAPAT.";
    const label = expected === "left" ? "SOL (Q)" : "SAĞ (E)";
    return `Adım ${state.ropeStage + 1}/2: ${label} halatı çek.`;
  }

  function renderHud() {
    setText(roundLabel, `${Math.min(state.round, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`);
    setText(modeLabel, state.mode === "tow" ? "Motor" : "Liman");
    setText(scoreLabel, String(state.score));
    setText(energyLabel, `${Math.round(state.energy)}%`);
    setText(windLabel, state.wind.name || windName(state.wind.x, state.wind.y));
    setText(
      crashLabel,
      state.mode === "tow" ? `${state.crashes} / ${MAX_CRASHES}` : "Hazır"
    );
    setText(
      speedLabel,
      `${Math.round(Math.hypot(state.ship.vx, state.ship.vy))} km/s`
    );
    setText(highScoreLabel, String(state.highScore));
    setText(bestScoreLabel, `En iyi skor: ${state.highScore}`);
    setText(statusLabel, state.message);
    if (towControls) {
      towControls.hidden = state.phase !== "playing" || state.mode !== "tow";
    }
    if (!hintLabel) return;
    hintLabel.textContent =
      state.phase === "boarding"
        ? "Gemimize bindin. Biraz bekle."
        : state.phase === "playing"
          ? state.mode === "tow" && !state.engineOn
            ? ropeHintText()
            : state.mode === "tow"
              ? "Motor açık. Rotayı temiz tut ve mavi çıkışa git."
              : state.dockReady
                ? "Rüzgara karşı hazır — Space veya E ile park et!"
                : "WASD ile rüzgarlı limana yanaş; yeşil olunca Space / E ile park et."
          : state.phase === "won"
            ? `Kazandın. En iyi skor: ${state.highScore}`
            : state.phase === "lost"
              ? `Kaybettin. En iyi skor: ${state.highScore}`
              : `En iyi skor: ${state.highScore}. Enter veya Başla ile başla.`;
  }

  // —— Canvas ——
  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.round(rect.width * dpr));
    const h = Math.max(180, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function draw() {
    if (!ctx || !canvas) return;
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const screenSky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (screenSky && typeof screenSky.addColorStop === "function") {
        screenSky.addColorStop(0, "#1d4f78");
        screenSky.addColorStop(0.5, "#134066");
        screenSky.addColorStop(1, "#0a2438");
        ctx.fillStyle = screenSky;
      } else {
        ctx.fillStyle = "#134066";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / WORLD.width;
      const scaleY = canvas.height / WORLD.height;
      const scale = Math.min(scaleX, scaleY) || 1;
      const offsetX = (canvas.width - WORLD.width * scale) / 2;
      const offsetY = (canvas.height - WORLD.height * scale) / 2;
      state.worldScale = scale;
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

      drawBackground();
      drawWater();
      drawHarbor();
      if (state.mode === "tow") drawGoal();
      drawDock();
      drawWind();
      drawObstacles();
      drawWake();
      if (state.mode === "tow") drawRopes();
      drawShip();
      drawParticles();
      if (state.mode === "tow" && state.phase === "playing") drawRopeChecklist();
      drawOverlayText();
    } catch (error) {
      console.error("RHGPO çizim hatası:", error);
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    if (gradient && typeof gradient.addColorStop === "function") {
      gradient.addColorStop(0, "#2a6a9a");
      gradient.addColorStop(0.4, "#1a4f7a");
      gradient.addColorStop(1, "#0e2f4a");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = "#1a4f7a";
    }
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  function drawWater() {
    ctx.save();
    for (let i = 0; i < 8; i += 1) {
      const y = 80 + i * 80 + Math.sin(state.time * 1.4 + i) * 6;
      ctx.strokeStyle = `rgba(140, 230, 255, ${0.12 + (i % 2) * 0.06})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= WORLD.width; x += 24) {
        const waveY = y + Math.sin(state.time * 2 + x * 0.02 + i) * 8;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 18; col += 1) {
        const x = col * 76 + (row % 2) * 20 + Math.sin(state.time + row) * 2;
        const y = row * 64 + Math.cos(state.time * 0.8 + col) * 2;
        ctx.beginPath();
        ctx.arc(x + 18, y + 18, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHarbor() {
    ctx.save();
    ctx.fillStyle = "rgba(70, 90, 110, 0.98)";
    ctx.fillRect(1180, 40, 120, WORLD.height - 80);
    ctx.fillStyle = "rgba(120, 145, 170, 0.85)";
    for (let y = 70; y < WORLD.height - 60; y += 48) {
      ctx.fillRect(1190, y, 18, 28);
      ctx.fillRect(1240, y + 10, 18, 28);
    }
    ctx.fillStyle = "rgba(255, 209, 102, 0.75)";
    ctx.fillRect(1180, 40, 10, WORLD.height - 80);
    ctx.restore();
  }

  function drawDock() {
    const ready = state.dockReady && state.mode === "park";
    const pulse = 0.55 + Math.sin(state.time * 6) * 0.25;
    ctx.save();
    ctx.fillStyle = "rgba(160, 110, 60, 0.92)";
    ctx.fillRect(state.dock.x - 10, state.dock.y - 10, state.dock.w + 20, state.dock.h + 20);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle =
        i % 2 === 0 ? "rgba(190, 130, 70, 0.95)" : "rgba(130, 85, 45, 0.95)";
      ctx.fillRect(
        state.dock.x + i * (state.dock.w / 5),
        state.dock.y,
        state.dock.w / 5 - 2,
        state.dock.h
      );
    }
    ctx.fillStyle = "rgba(60, 40, 22, 0.95)";
    [
      [0, 0],
      [state.dock.w, 0],
      [0, state.dock.h],
      [state.dock.w, state.dock.h],
    ].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(state.dock.x + px, state.dock.y + py, 10, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = ready
      ? `rgba(150, 240, 111, ${0.28 + pulse * 0.18})`
      : "rgba(120, 210, 255, 0.22)";
    ctx.fillRect(state.dock.x - 18, state.dock.y - 18, state.dock.w + 36, state.dock.h + 36);
    ctx.strokeStyle = ready
      ? `rgba(150, 240, 111, ${0.9 + pulse * 0.1})`
      : "rgba(180, 255, 140, 0.95)";
    ctx.lineWidth = ready ? 8 : 6;
    ctx.strokeRect(state.dock.x, state.dock.y, state.dock.w, state.dock.h);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px Inter, sans-serif";
    ctx.fillText(ready ? "PARK ET!" : "LİMAN", state.dock.x + 48, state.dock.y + 42);
    ctx.restore();
  }

  function drawWind() {
    const centerX = 180;
    const centerY = 110;
    const len = 92 + state.wind.strength;
    const angle = Math.atan2(state.wind.y, state.wind.x);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(140, 240, 255, 0.95)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-len * 0.4, 0);
    ctx.lineTo(len * 0.35, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.2, -12);
    ctx.lineTo(len * 0.35, 0);
    ctx.lineTo(len * 0.2, 12);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "700 18px Inter, sans-serif";
    ctx.fillText("RÜZGAR", -70, -24);
    ctx.restore();
  }

  function drawObstacles() {
    for (const obstacle of state.obstacles) {
      ctx.save();
      if (obstacle.kind === "buoy") {
        ctx.fillStyle = "rgba(220, 60, 70, 0.95)";
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.r * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(obstacle.x - 3, obstacle.y - obstacle.r - 8, 6, obstacle.r + 4);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(96, 78, 62, 0.95)";
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y - obstacle.r);
        ctx.lineTo(obstacle.x + obstacle.r * 0.9, obstacle.y - obstacle.r * 0.2);
        ctx.lineTo(obstacle.x + obstacle.r * 0.7, obstacle.y + obstacle.r * 0.8);
        ctx.lineTo(obstacle.x - obstacle.r * 0.75, obstacle.y + obstacle.r * 0.7);
        ctx.lineTo(obstacle.x - obstacle.r * 0.95, obstacle.y - obstacle.r * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 209, 102, 0.28)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawGoal() {
    const g = state.goal;
    const pulse = 0.5 + Math.sin(state.time * 4) * 0.2;
    ctx.save();
    ctx.fillStyle = `rgba(85, 214, 255, ${0.25 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(85, 214, 255, 0.95)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ÇIKIŞ", g.x, g.y + 6);
    ctx.textAlign = "start";
    ctx.restore();
  }

  function drawRopes() {
    if (state.engineOn) return;
    const ship = state.ship;
    const pierX = 1180;
    const leftY = ship.y - 18;
    const rightY = ship.y + 18;
    const stagesDone = state.ropeStage;
    ctx.save();
    // left rope
    ctx.strokeStyle =
      stagesDone >= 1 && state.ropeOrder[0] === "left"
        ? "rgba(150, 240, 111, 0.9)"
        : stagesDone >= 2 && state.ropeOrder[1] === "left"
          ? "rgba(150, 240, 111, 0.9)"
          : "rgba(255, 209, 102, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ship.x + 10, leftY);
    ctx.lineTo(pierX, leftY);
    ctx.stroke();
    // right rope
    ctx.strokeStyle =
      stagesDone >= 1 && state.ropeOrder[0] === "right"
        ? "rgba(150, 240, 111, 0.9)"
        : stagesDone >= 2 && state.ropeOrder[1] === "right"
          ? "rgba(150, 240, 111, 0.9)"
          : "rgba(255, 180, 100, 0.75)";
    ctx.beginPath();
    ctx.moveTo(ship.x + 10, rightY);
    ctx.lineTo(pierX, rightY);
    ctx.stroke();
    ctx.restore();
  }

  function drawRopeChecklist() {
    ctx.save();
    ctx.fillStyle = "rgba(7, 10, 16, 0.72)";
    ctx.fillRect(40, WORLD.height - 120, 320, 90);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(40, WORLD.height - 120, 320, 90);
    ctx.fillStyle = "#fff";
    ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText("Halat sırası", 56, WORLD.height - 92);
    state.ropeOrder.forEach((side, i) => {
      const done = i < state.ropeStage;
      const current = i === state.ropeStage && !state.engineReady;
      const label = side === "left" ? "SOL (Q)" : "SAĞ (E)";
      ctx.fillStyle = done
        ? "#96f06f"
        : current
          ? "#ffd166"
          : "rgba(255,255,255,0.55)";
      ctx.fillText(
        `${i + 1}. ${label}${done ? " ✓" : current ? " ←" : ""}`,
        56,
        WORLD.height - 62 + i * 22
      );
    });
    if (state.engineReady) {
      ctx.fillStyle = "#55d6ff";
      ctx.fillText(
        state.engineOn ? "Motor AÇIK" : "E / Space → Motor",
        200,
        WORLD.height - 50
      );
    }
    ctx.restore();
  }

  function drawWake() {
    ctx.save();
    for (const w of state.wake) {
      ctx.fillStyle = `rgba(200, 240, 255, ${0.18 * (w.life / 0.7)})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawShip() {
    const ship = state.ship;
    const dance =
      state.phase === "transition" && performance.now() < state.danceUntil
        ? Math.sin(state.time * 18) * 0.12
        : 0;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle + dance);

    // hull — bright so ship never disappears into water
    ctx.fillStyle = "#e8f0f8";
    ctx.strokeStyle = "#1a3048";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(12, -14);
    ctx.lineTo(-22, -12);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-22, 12);
    ctx.lineTo(12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // cabin
    ctx.fillStyle = "#3d7ea6";
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-4, -5, 8, 6);

    // bow accent
    ctx.fillStyle = "#ff6b7a";
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(16, -6);
    ctx.lineTo(16, 6);
    ctx.closePath();
    ctx.fill();

    // mast
    ctx.strokeStyle = "rgba(40, 50, 60, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -26);
    ctx.stroke();
    ctx.fillStyle = "rgba(150, 240, 111, 0.85)";
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(14, -18);
    ctx.lineTo(0, -14);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const p of state.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawOverlayText() {
    if (state.phase === "menu") {
      ctx.save();
      ctx.fillStyle = "rgba(7, 10, 16, 0.55)";
      ctx.fillRect(WORLD.width / 2 - 260, WORLD.height / 2 - 70, 520, 140);
      ctx.fillStyle = "#fff";
      ctx.font = "900 36px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RHGPO", WORLD.width / 2, WORLD.height / 2 - 18);
      ctx.font = "600 18px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(
        "Başla veya Enter — limana park et, sonra motor!",
        WORLD.width / 2,
        WORLD.height / 2 + 22
      );
      ctx.textAlign = "start";
      ctx.restore();
    } else if (state.phase === "won" || state.phase === "lost") {
      ctx.save();
      ctx.fillStyle = "rgba(7, 10, 16, 0.62)";
      ctx.fillRect(WORLD.width / 2 - 240, WORLD.height / 2 - 60, 480, 120);
      ctx.fillStyle = state.phase === "won" ? "#96f06f" : "#ff6b7a";
      ctx.font = "900 32px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        state.phase === "won" ? "KAZANDIN!" : "OYUN BİTTİ",
        WORLD.width / 2,
        WORLD.height / 2 - 8
      );
      ctx.fillStyle = "#fff";
      ctx.font = "600 16px Inter, sans-serif";
      ctx.fillText(
        `Skor: ${state.score} · Enter / Yeniden Başlat`,
        WORLD.width / 2,
        WORLD.height / 2 + 28
      );
      ctx.textAlign = "start";
      ctx.restore();
    }
  }
})();
