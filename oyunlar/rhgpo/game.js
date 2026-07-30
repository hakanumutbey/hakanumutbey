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

const TOTAL_ROUNDS = 5;
const WORLD = { width: 1280, height: 720 };
const STORAGE_KEY = "hakorocks-rhgpo-high-score";
const WIND_NAMES = ["Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu", "Güney", "Güneybatı", "Batı", "Kuzeybatı"];
const ROUND_MODES = ["park", "tow"];
const DAMAGE_COOLDOWN_MS = 700;
const DOCK_MAX_SPEED = 90;
const DOCK_MAX_ANGLE = 0.55;

function readHighScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function writeHighScore(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // private mode / blocked storage
  }
}

const state = {
  phase: "menu",
  round: 1,
  mode: "park",
  score: 0,
  energy: 100,
  crashes: 0,
  ropeStage: 0,
  ropeOrder: [],
  engineReady: false,
  engineOn: false,
  highScore: readHighScore(),
  message: "Hazır olduğunda Başla'ya bas.",
  nextRoundAt: 0,
  boardingUntil: 0,
  danceUntil: 0,
  lastFrame: performance.now(),
  lastDamageAt: 0,
  worldScale: 1,
  time: 0,
  dockReady: false,
  particles: [],
  wake: [],
  wind: { x: 1, y: -0.4, strength: 26, timer: 0 },
  ship: {
    x: 180,
    y: 370,
    angle: 0,
    vx: 0,
    vy: 0,
    radius: 22,
  },
  dock: { x: 980, y: 250, w: 170, h: 220, angle: 0 },
  goal: { x: 1120, y: 340, r: 34 },
  obstacles: [],
  input: { left: false, right: false, forward: false, reverse: false, dock: false },
  gamepad: { left: false, right: false, forward: false, reverse: false, dock: false },
  touch: { active: null },
};

if (!canvas || !ctx || !startButton || !restartButton) {
  console.error("RHGPO: gerekli DOM elemanları bulunamadı.");
  if (statusLabel) statusLabel.textContent = "Oyun yüklenemedi. Sayfayı yenile.";
}

const keys = new Set();
const GAMEPAD_DEADZONE = 0.35;
const gamepadState = { buttons: new Set() };
const windVectors = [
  { x: 0, y: -1 },
  { x: 0.7, y: -0.7 },
  { x: 1, y: 0 },
  { x: 0.7, y: 0.7 },
  { x: 0, y: 1 },
  { x: -0.7, y: 0.7 },
  { x: -1, y: 0 },
  { x: -0.7, y: -0.7 },
];

if (canvas && ctx && startButton && restartButton) {
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", restartGame);
  canvas.addEventListener("click", () => {
    if (state.phase === "menu") startGame();
  });
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
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
  requestAnimationFrame(loop);
}

function startGame() {
  resetRun();
  state.phase = "boarding";
  state.message = "Gemimize bindin. Görev başlıyor.";
  state.boardingUntil = performance.now() + 900;
  renderHud();
}

function restartGame() {
  resetRun();
  state.phase = "menu";
  state.message = "Hazır olduğunda Başla'ya bas.";
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
  state.nextRoundAt = 0;
  state.boardingUntil = 0;
  state.danceUntil = 0;
  state.dockReady = false;
  state.particles = [];
  state.wake = [];
  state.obstacles = [];
  state.goal = { x: 1120, y: 340, r: 34 };
  resetShip();
}

function spawnRound(first = false) {
  resetShip();
  state.wind = makeWind(state.round);
  state.mode = getRoundMode(state.round);
  state.crashes = 0;
  state.ropeStage = 0;
  state.ropeOrder = [];
  state.engineReady = state.mode === "park";
  state.engineOn = state.mode === "park";
  state.dock = makeDock(state.round);
  state.goal = makeGoal(state.round);
  state.obstacles = makeObstacles(state.round);
  if (state.mode === "tow") {
    state.ropeOrder = makeRopeOrder(state.wind);
    state.message = first
      ? "Gemide halat sırası başladı. Önce diğer halatı, sonra rüzgar tarafını çek."
      : `Tur ${state.round}. Motor modunda halatları sırayla çek.`;
  } else {
    state.message = first
      ? "Rüzgar sertleşiyor. Limana doğru sür."
      : `Tur ${state.round}. Liman parkı başladı.`;
  }
  state.phase = "playing";
}

function resetShip() {
  state.ship.x = 180;
  state.ship.y = 370;
  state.ship.angle = 0;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.lastDamageAt = performance.now();
}

function makeDock(round) {
  const yOptions = [170, 250, 350, 430];
  const y = yOptions[(round - 1) % yOptions.length];
  return {
    x: 990,
    y,
    w: 160,
    h: 150,
    angle: 0,
  };
}

function makeGoal(round) {
  const yOptions = [170, 260, 360, 450];
  return {
    x: 1110,
    y: yOptions[(round - 1) % yOptions.length],
    r: 34,
  };
}

function makeWind(round) {
  const index = (round - 1) % windVectors.length;
  const base = windVectors[index];
  return {
    x: base.x,
    y: base.y,
    strength: 18 + round * 4,
    timer: 9 - Math.min(3, round * 0.35),
  };
}

function makeObstacles(round) {
  // Keep a clear corridor toward the dock/exit so the game stays playable.
  return [
    { x: 420 + round * 12, y: 210, r: 26, kind: "rock" },
    { x: 640, y: 520 - round * 4, r: 24, kind: "buoy" },
    { x: 860, y: 160 + round * 8, r: 24, kind: "rock" },
  ];
}

function getRoundMode(round) {
  return ROUND_MODES[(round - 1) % ROUND_MODES.length];
}

function makeRopeOrder(wind) {
  const windward = windwardSide(wind);
  const opposite = windward === "left" ? "right" : "left";
  return [opposite, windward];
}

function windwardSide(wind) {
  if (Math.abs(wind.x) >= Math.abs(wind.y)) {
    return wind.x >= 0 ? "left" : "right";
  }
  return wind.y >= 0 ? "left" : "right";
}

function handleKeyDown(event) {
  keys.add(event.code);
  syncKeys();
  if (state.phase === "menu" && (event.code === "Enter" || event.code === "Space")) {
    startGame();
    return;
  }
  if (state.phase !== "playing") return;

  if (state.mode === "tow") {
    // Halatlar bitmeden: Q sol, E sağ. Bitince: E / M motor aç-kapa.
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
    if (state.engineReady && (event.code === "KeyE" || event.code === "KeyM")) {
      if (!event.repeat) {
        event.preventDefault();
        toggleEngine();
      }
      return;
    }
  }

  if (state.mode !== "tow" && (event.code === "Space" || event.code === "KeyE")) {
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
  state.input.left = keys.has("ArrowLeft") || keys.has("KeyA") || state.touch.active === "left" || state.gamepad.left;
  state.input.right = keys.has("ArrowRight") || keys.has("KeyD") || state.touch.active === "right" || state.gamepad.right;
  state.input.forward = keys.has("ArrowUp") || keys.has("KeyW") || state.touch.active === "forward" || state.gamepad.forward;
  state.input.reverse = keys.has("ArrowDown") || keys.has("KeyS") || state.touch.active === "reverse" || state.gamepad.reverse;
  state.input.dock = state.mode !== "tow" && (keys.has("Space") || keys.has("KeyE") || state.touch.active === "dock" || state.gamepad.dock);
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
  state.touch.active = pressed ? action : state.touch.active === action ? null : state.touch.active;
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
    if (state.phase === "won" || state.phase === "lost") restartGame();
  }
  if (pressedOnce(nextButtons, "select") && state.phase !== "menu") restartGame();

  if (state.phase === "playing" && state.mode === "tow") {
    if (leftRope && pressedOnce(nextButtons, "left-rope")) pullRope("left");
    if (rightRope && pressedOnce(nextButtons, "right-rope")) pullRope("right");
    if ((primary && pressedOnce(nextButtons, "primary")) || (start && pressedOnce(nextButtons, "start")) || (rightTrigger && pressedOnce(nextButtons, "right-trigger"))) {
      toggleEngine();
    }
  }

  gamepadState.buttons = nextButtons;
  syncKeys();
}

function getPrimaryGamepad() {
  if (!navigator.getGamepads) return null;
  return Array.from(navigator.getGamepads()).find((gamepad) => gamepad?.connected) || null;
}

function pressedOnce(nextButtons, name) {
  return nextButtons.has(name) && !gamepadState.buttons.has(name);
}

function deadzone(value) {
  return Math.abs(value) >= GAMEPAD_DEADZONE ? value : 0;
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  state.time += dt;
  resizeCanvas();
  pollGamepadInput();

  if (state.phase === "boarding" && now >= state.boardingUntil) {
    spawnRound(true);
  } else if (state.phase === "playing") {
    updateWind(dt);
    updateShip(dt);
    updateWake(dt);
    if (state.mode === "tow") {
      checkTowGoal(now);
    } else {
      checkDock(now);
    }
    state.energy = Math.max(0, state.energy - dt * (0.7 + state.round * 0.1));
    if (state.energy <= 0) loseGame();
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

function updateWind(dt) {
  state.wind.timer -= dt;
  if (state.wind.timer <= 0) {
    const nextIndex = Math.floor(Math.random() * windVectors.length);
    const next = windVectors[nextIndex];
    state.wind.x = next.x;
    state.wind.y = next.y;
    state.wind.strength = 18 + state.round * 4 + Math.random() * 6;
    state.wind.timer = 8 - Math.min(3, state.round * 0.35) + Math.random() * 1.5;
    state.message = `Rüzgar değişti: ${WIND_NAMES[nextIndex]}.`;
  }
}

function pullRope(side) {
  if (state.mode !== "tow" || state.engineOn || state.phase !== "playing") return;
  const expected = state.ropeOrder[state.ropeStage];
  if (!expected) return;
  if (side !== expected) {
    state.message = "Yanlış halatı çektin. Sıralamayı baştan yap.";
    state.ropeStage = 0;
    return;
  }
  state.ropeStage += 1;
  if (state.ropeStage >= state.ropeOrder.length) {
    state.engineReady = true;
    state.message = "Halatlar tamam. E ile motoru aç / kapat.";
  } else {
    state.message = side === "left"
      ? "Sol halat çekildi. Şimdi rüzgar tarafını çek."
      : "Sağ halat çekildi. Şimdi rüzgar tarafını çek.";
  }
}

function startEngine() {
  toggleEngine(true);
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

function updateShip(dt) {
  const ship = state.ship;
  const turnSpeed = 2.8;
  const thrust = 260;
  const reverse = 150;
  const windForce = state.wind.strength;
  const drag = 0.982;
  const towMode = state.mode === "tow";
  const canDrive = !towMode || state.engineOn;

  if (canDrive) {
    if (state.input.left) ship.angle -= turnSpeed * dt;
    if (state.input.right) ship.angle += turnSpeed * dt;
  }

  const forwardX = Math.cos(ship.angle);
  const forwardY = Math.sin(ship.angle);
  if (canDrive && state.input.forward) {
    ship.vx += forwardX * thrust * dt;
    ship.vy += forwardY * thrust * dt;
    state.energy = Math.max(0, state.energy - dt * 1.4);
  }
  if (canDrive && state.input.reverse) {
    ship.vx -= forwardX * reverse * dt;
    ship.vy -= forwardY * reverse * dt;
    state.energy = Math.max(0, state.energy - dt * 0.8);
  }

  // Wind is a gentle push, not an unstoppable shove.
  const windScale = towMode && !state.engineOn ? 0.1 : 0.35;
  ship.vx += state.wind.x * windForce * windScale * dt;
  ship.vy += state.wind.y * windForce * windScale * dt;
  if (towMode && !state.engineOn) {
    ship.vx *= Math.pow(0.975, dt * 60);
    ship.vy *= Math.pow(0.975, dt * 60);
  }

  ship.vx *= Math.pow(drag, dt * 60);
  ship.vy *= Math.pow(drag, dt * 60);
  // Soft speed cap so docking stays possible.
  const speedNow = Math.hypot(ship.vx, ship.vy);
  const maxSpeed = towMode ? 320 : 280;
  if (speedNow > maxSpeed) {
    ship.vx = (ship.vx / speedNow) * maxSpeed;
    ship.vy = (ship.vy / speedNow) * maxSpeed;
  }

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  if (ship.x < 40 || ship.x > WORLD.width - 40) {
    ship.x = clamp(ship.x, 40, WORLD.width - 40);
    ship.vx *= -0.35;
    applyCollision("Sınır", towMode ? 12 : 3);
  }
  if (ship.y < 40 || ship.y > WORLD.height - 40) {
    ship.y = clamp(ship.y, 40, WORLD.height - 40);
    ship.vy *= -0.35;
    applyCollision("Sınır", towMode ? 12 : 3);
  }

  const obstacleHit = state.obstacles.find((obstacle) => distance(ship.x, ship.y, obstacle.x, obstacle.y) < obstacle.r + ship.radius);
  if (obstacleHit) {
    const dx = ship.x - obstacleHit.x;
    const dy = ship.y - obstacleHit.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    ship.x = obstacleHit.x + (dx / length) * (obstacleHit.r + ship.radius + 2);
    ship.y = obstacleHit.y + (dy / length) * (obstacleHit.r + ship.radius + 2);
    ship.vx *= -0.3;
    ship.vy *= -0.3;
    applyCollision(obstacleHit.kind === "buoy" ? "Şamandıra" : "Kaya", towMode ? 12 : 6);
  }
}

function canTakeDamage(now = performance.now()) {
  return now - state.lastDamageAt >= DAMAGE_COOLDOWN_MS;
}

function applyCollision(reason, energyLoss) {
  const now = performance.now();
  if (!canTakeDamage(now)) return;
  state.lastDamageAt = now;

  if (state.mode === "tow") {
    state.crashes += 1;
    state.energy = Math.max(0, state.energy - energyLoss);
    state.message = `${reason} çarpması! ${Math.max(0, 3 - state.crashes)} hak kaldı.`;
    spawnParticles(state.ship.x, state.ship.y, "#ff6b7a", 10);
    if (state.crashes >= 3) {
      loseGame();
      return;
    }
    // Soft reset: only bounce back a bit, don't teleport every time.
    state.ship.vx *= 0.2;
    state.ship.vy *= 0.2;
    return;
  }

  state.energy = Math.max(0, state.energy - energyLoss);
  state.message = `${reason}'a çarptın. Direksiyonu düzelt.`;
  spawnParticles(state.ship.x, state.ship.y, "#ffd166", 8);
}

function checkDock(now) {
  const ship = state.ship;
  const pad = 8;
  const inDock =
    ship.x > state.dock.x - pad &&
    ship.x < state.dock.x + state.dock.w + pad &&
    ship.y > state.dock.y - pad &&
    ship.y < state.dock.y + state.dock.h + pad;
  const speed = Math.hypot(ship.vx, ship.vy);
  const angleDiff = Math.abs(normalizeAngle(ship.angle));
  state.dockReady = inDock && speed < DOCK_MAX_SPEED && angleDiff < DOCK_MAX_ANGLE;

  if (state.dockReady && state.input.dock) {
    completeRound(now);
  } else if (inDock && !state.dockReady) {
    state.message = speed >= DOCK_MAX_SPEED
      ? "Çok hızlısın. Biraz yavaşla, sonra Space / E bas."
      : "Açıyı düzelt. Gemi sağa (limana) bakmalı.";
  } else if (state.dockReady) {
    state.message = "Liman hazır! Space veya E ile park et.";
  }
}

function checkTowGoal(now) {
  const ship = state.ship;
  const goalDistance = distance(ship.x, ship.y, state.goal.x, state.goal.y);
  if (state.engineOn && goalDistance < state.goal.r + ship.radius + 4) {
    completeRound(now, "tow");
  }
}

function completeRound(now, mode = state.mode) {
  const bonus = Math.round(state.energy) + Math.max(0, 90 - Math.round(Math.hypot(state.ship.vx, state.ship.vy)));
  state.score += 100 + bonus + state.round * 18;
  state.message = mode === "tow"
    ? `Tur ${state.round} tamamlandı. Motor modunda çıkışı geçtin.`
    : `Tur ${state.round} tamamlandı. Limana yanaştın.`;
  spawnParticles(state.ship.x, state.ship.y, mode === "tow" ? "#55d6ff" : "#96f06f", 22);
  state.round += 1;
  state.phase = "transition";
  state.dockReady = false;
  state.nextRoundAt = now + 1200;
  state.danceUntil = now + 1400;
  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }
}

function winGame() {
  state.phase = "won";
  state.message = "Beş tur tamamlandı. RHGPO kazandın!";
  spawnParticles(state.ship.x, state.ship.y, "#ffd166", 36);
  spawnParticles(WORLD.width / 2, WORLD.height / 2, "#96f06f", 28);
  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }
}

function loseGame() {
  state.phase = "lost";
  state.message = "Oyun bitti. Tekrar dene.";
  spawnParticles(state.ship.x, state.ship.y, "#ff6b7a", 18);
  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function renderHud() {
  setText(roundLabel, `${Math.min(state.round, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`);
  setText(modeLabel, state.mode === "tow" ? "Motor" : "Liman");
  setText(scoreLabel, String(state.score));
  setText(energyLabel, `${Math.round(state.energy)}%`);
  setText(windLabel, windName(state.wind.x, state.wind.y));
  setText(crashLabel, state.mode === "tow" ? `${state.crashes} / 3` : "Hazır");
  setText(speedLabel, `${Math.round(Math.hypot(state.ship.vx, state.ship.vy))} km/s`);
  setText(highScoreLabel, String(state.highScore));
  setText(bestScoreLabel, `En iyi skor: ${state.highScore}`);
  setText(statusLabel, state.message);
  if (towControls) towControls.hidden = state.phase !== "playing" || state.mode !== "tow";
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
              ? "Park hazır! Space veya E bas."
              : "WASD / ok tuşları ile sür, limana yanaş, Space veya E ile park et."
      : state.phase === "won"
        ? `Kazandın. En iyi skor: ${state.highScore}`
        : state.phase === "lost"
          ? `Kaybettin. En iyi skor: ${state.highScore}`
          : `En iyi skor: ${state.highScore}. Enter veya Başla ile başla.`;
}

function ropeHintText() {
  const expected = state.ropeOrder[state.ropeStage];
  if (!expected) return "Halatlar tamam. E ile motoru aç / kapat.";
  const label = expected === "left" ? "SOL" : "SAĞ";
  return `Adım ${state.ropeStage + 1}/2: ${label} halatı çek (Q = sol, E = sağ).`;
}

function draw() {
  if (!ctx || !canvas) return;
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / WORLD.width, canvas.height / WORLD.height) || 1;
    const offsetX = (canvas.width - WORLD.width * scale) / 2;
    const offsetY = (canvas.height - WORLD.height * scale) / 2;
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
    gradient.addColorStop(0, "#163a58");
    gradient.addColorStop(0.45, "#0b1a2c");
    gradient.addColorStop(1, "#05070b");
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = "#0b1a2c";
  }
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawWater() {
  ctx.save();
  // animated wave bands
  for (let i = 0; i < 8; i += 1) {
    const y = 80 + i * 80 + Math.sin(state.time * 1.4 + i) * 6;
    ctx.strokeStyle = `rgba(85, 214, 255, ${0.04 + (i % 2) * 0.03})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= WORLD.width; x += 24) {
      const waveY = y + Math.sin(state.time * 2 + x * 0.02 + i) * 8;
      if (x === 0) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 18; col += 1) {
      const x = col * 76 + (row % 2) * 20 + Math.sin(state.time + row) * 2;
      const y = row * 64 + Math.cos(state.time * 0.8 + col) * 2;
      ctx.beginPath();
      ctx.arc(x + 18, y + 18, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHarbor() {
  // distant pier wall on the right
  ctx.save();
  ctx.fillStyle = "rgba(28, 40, 54, 0.95)";
  ctx.fillRect(1180, 40, 120, WORLD.height - 80);
  ctx.fillStyle = "rgba(60, 78, 96, 0.7)";
  for (let y = 70; y < WORLD.height - 60; y += 48) {
    ctx.fillRect(1190, y, 18, 28);
    ctx.fillRect(1240, y + 10, 18, 28);
  }
  ctx.fillStyle = "rgba(255, 209, 102, 0.35)";
  ctx.fillRect(1180, 40, 8, WORLD.height - 80);
  ctx.restore();
}

function drawDock() {
  const ready = state.dockReady && state.mode === "park";
  const pulse = 0.55 + Math.sin(state.time * 6) * 0.25;
  ctx.save();
  // wooden pier base
  ctx.fillStyle = "rgba(92, 64, 42, 0.55)";
  ctx.fillRect(state.dock.x - 10, state.dock.y - 10, state.dock.w + 20, state.dock.h + 20);
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(120, 84, 52, 0.45)" : "rgba(78, 54, 34, 0.45)";
    ctx.fillRect(state.dock.x + i * (state.dock.w / 5), state.dock.y, state.dock.w / 5 - 2, state.dock.h);
  }
  // posts
  ctx.fillStyle = "rgba(40, 28, 18, 0.9)";
  [[0, 0], [state.dock.w, 0], [0, state.dock.h], [state.dock.w, state.dock.h]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(state.dock.x + px, state.dock.y + py, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = ready ? `rgba(150, 240, 111, ${0.18 + pulse * 0.12})` : "rgba(120, 194, 255, 0.12)";
  ctx.fillRect(state.dock.x - 18, state.dock.y - 18, state.dock.w + 36, state.dock.h + 36);
  ctx.strokeStyle = ready ? `rgba(150, 240, 111, ${0.75 + pulse * 0.2})` : "rgba(153, 240, 111, 0.55)";
  ctx.lineWidth = ready ? 6 : 4;
  ctx.strokeRect(state.dock.x, state.dock.y, state.dock.w, state.dock.h);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillText(ready ? "PARK ET!" : "LİMAN", state.dock.x + 36, state.dock.y + 36);
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
  ctx.strokeStyle = "rgba(85, 214, 255, 0.65)";
  ctx.lineWidth = 6;
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
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(obstacle.x - 6, obstacle.y - 6, obstacle.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawGoal() {
  const pulse = 10 + Math.sin(state.time * 4) * 5;
  ctx.save();
  ctx.fillStyle = "rgba(85, 214, 255, 0.12)";
  ctx.beginPath();
  ctx.arc(state.goal.x, state.goal.y, state.goal.r + 16 + pulse * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = state.engineOn ? "rgba(150, 240, 111, 0.95)" : "rgba(85, 214, 255, 0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.goal.x, state.goal.y, state.goal.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(state.goal.x, state.goal.y, state.goal.r + pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText("ÇIKIŞ", state.goal.x - 26, state.goal.y - 44);
  ctx.restore();
}

function drawRopes() {
  const ship = state.ship;
  const leftX = ship.x - 26;
  const rightX = ship.x + 26;
  const y = ship.y - 8;
  const windSide = windwardSide(state.wind);
  const expected = state.ropeOrder[state.ropeStage];
  const leftDone = state.ropeOrder.slice(0, state.ropeStage).includes("left") || (state.engineReady && state.ropeOrder.includes("left"));
  const rightDone = state.ropeOrder.slice(0, state.ropeStage).includes("right") || (state.engineReady && state.ropeOrder.includes("right"));
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = leftDone ? "rgba(150, 240, 111, 0.9)" : expected === "left" ? "rgba(255, 209, 102, 0.95)" : "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(leftX, y);
  ctx.lineTo(leftX - 60, y + (windSide === "left" ? -18 : 18));
  ctx.stroke();
  ctx.strokeStyle = rightDone ? "rgba(150, 240, 111, 0.9)" : expected === "right" ? "rgba(255, 209, 102, 0.95)" : "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(rightX, y);
  ctx.lineTo(rightX + 60, y + (windSide === "right" ? -18 : 18));
  ctx.stroke();
  ctx.font = "700 14px Inter, sans-serif";
  ctx.fillStyle = leftDone ? "#96f06f" : expected === "left" ? "#ffd166" : "rgba(255,255,255,0.7)";
  ctx.fillText(leftDone ? "Sol ✓" : expected === "left" ? "Sol ← şimdi" : "Sol halat", leftX - 88, y + 14);
  ctx.fillStyle = rightDone ? "#96f06f" : expected === "right" ? "#ffd166" : "rgba(255,255,255,0.7)";
  ctx.fillText(rightDone ? "Sağ ✓" : expected === "right" ? "Sağ → şimdi" : "Sağ halat", rightX + 10, y + 14);
  ctx.fillStyle = state.engineReady ? "#96f06f" : "rgba(255,255,255,0.85)";
  ctx.fillText(
    state.engineOn ? "Motor açık (E kapat)" : state.engineReady ? "Motor hazır (E aç)" : "Halat sırası",
    ship.x - 64,
    ship.y - 36,
  );
  ctx.restore();
}

function drawRopeChecklist() {
  const panelX = 24;
  const panelY = 120;
  ctx.save();
  ctx.fillStyle = "rgba(7, 12, 20, 0.72)";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  roundRect(panelX, panelY, 250, 118, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffd166";
  ctx.font = "800 16px Inter, sans-serif";
  ctx.fillText("HALAT SIRASI", panelX + 16, panelY + 28);
  state.ropeOrder.forEach((side, index) => {
    const done = index < state.ropeStage || state.engineReady;
    const current = index === state.ropeStage && !state.engineReady;
    const label = side === "left" ? "Sol halat" : "Sağ halat";
    const windMark = windwardSide(state.wind) === side ? " (rüzgar)" : "";
    ctx.fillStyle = done ? "#96f06f" : current ? "#55d6ff" : "rgba(255,255,255,0.65)";
    ctx.font = "700 15px Inter, sans-serif";
    ctx.fillText(`${done ? "✓" : current ? "→" : `${index + 1}.`} ${label}${windMark}`, panelX + 16, panelY + 56 + index * 26);
  });
  ctx.fillStyle = state.engineOn ? "#96f06f" : state.engineReady ? "#ffd166" : "rgba(255,255,255,0.5)";
  ctx.fillText(
    state.engineOn ? "✓ Motor açık — E kapat" : state.engineReady ? "→ Motor aç/kapa (E)" : "3. Motor (E)",
    panelX + 16,
    panelY + 108,
  );
  ctx.restore();
}

function drawWake() {
  for (const w of state.wake) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, w.life * 0.45);
    ctx.strokeStyle = "rgba(180, 230, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 1));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawShip() {
  const ship = state.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 16;
  // hull
  ctx.fillStyle = "#1a2738";
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.lineTo(-16, -18);
  ctx.lineTo(-28, 0);
  ctx.lineTo(-16, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // cabin
  ctx.fillStyle = "#0f1724";
  ctx.fillRect(-12, -14, 14, 12);
  ctx.fillStyle = "rgba(85, 214, 255, 0.65)";
  ctx.fillRect(-10, -12, 8, 6);
  // stripe
  ctx.strokeStyle = "rgba(255, 209, 102, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, -6);
  ctx.lineTo(-12, -6);
  ctx.moveTo(20, 6);
  ctx.lineTo(-12, 6);
  ctx.stroke();
  // mast
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.moveTo(-2, -24);
  ctx.lineTo(-2, 20);
  ctx.stroke();
  if (state.engineOn || state.mode === "park") {
    ctx.fillStyle = "rgba(85, 214, 255, 0.35)";
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(-40 - Math.sin(state.time * 12) * 3, -5);
    ctx.lineTo(-40 - Math.sin(state.time * 12) * 3, 5);
    ctx.closePath();
    ctx.fill();
  }
  drawCaptain(state.phase === "won" || state.danceUntil > performance.now() ? "dance" : "idle");
  ctx.restore();
}

function drawCaptain(mode = "idle") {
  const now = performance.now();
  const dance = mode === "dance";
  const bob = dance ? Math.sin(now / 90) * 5 : Math.sin(now / 500) * 1.2;
  const swing = dance ? Math.sin(now / 75) * 0.9 : 0;
  ctx.save();
  ctx.translate(2, -24 + bob);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.fillStyle = "rgba(255,209,102,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(-10 + swing * 5, 0);
  ctx.moveTo(0, 2);
  ctx.lineTo(10 - swing * 5, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(-7 + swing * 4, 22);
  ctx.moveTo(0, 10);
  ctx.lineTo(7 - swing * 4, 22);
  ctx.stroke();
  ctx.restore();
}

function drawOverlayText() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.fillText(`Tur: ${Math.min(state.round, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`, 24, 34);
  ctx.fillText(`Skor: ${state.score}`, 24, 62);
  ctx.fillText(`Enerji: ${Math.round(state.energy)}%`, 24, 90);
  if (state.phase === "won" || state.phase === "lost") {
    ctx.fillStyle = state.phase === "won" ? "#96f06f" : "#ff6b7a";
    ctx.font = "900 54px Inter, sans-serif";
    ctx.fillText(state.phase === "won" ? "KAZANDIN" : "BİTTİ", 430, 330);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "700 24px Inter, sans-serif";
    ctx.fillText("Yeniden Başlat ile tekrar dene.", 435, 370);
  } else if (state.phase === "menu") {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(300, 250, 680, 170, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 54px Inter, sans-serif";
    ctx.fillText("RHGPO", 520, 320);
    ctx.font = "700 22px Inter, sans-serif";
    ctx.fillText("Park et • Halatları çek • Motorla çık", 400, 360);
    ctx.fillStyle = "#ffd166";
    ctx.font = "700 18px Inter, sans-serif";
    ctx.fillText(`En iyi skor: ${state.highScore}`, 540, 396);
  } else if (state.phase === "boarding") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "900 46px Inter, sans-serif";
    ctx.fillText("Gemiye biniyor...", 430, 330);
    ctx.font = "700 22px Inter, sans-serif";
    ctx.fillText("Kaptan hazır. Görev başlıyor.", 440, 368);
  } else if (state.phase === "transition") {
    ctx.fillStyle = "rgba(150, 240, 111, 0.92)";
    ctx.font = "900 36px Inter, sans-serif";
    ctx.fillText("Tur tamam!", 530, 320);
  }
  ctx.restore();
}

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const cssWidth = rect.width || canvas.clientWidth || WORLD.width;
  const cssHeight = rect.height || canvas.clientHeight || Math.round(cssWidth * (WORLD.height / WORLD.width));
  const nextWidth = Math.max(1, Math.round(cssWidth * dpr));
  const nextHeight = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== nextWidth) canvas.width = nextWidth;
  if (canvas.height !== nextHeight) canvas.height = nextHeight;
  state.worldScale = Math.min(canvas.width / WORLD.width, canvas.height / WORLD.height);
}

function windName(x, y) {
  const angle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
  const index = Math.round(angle / (Math.PI / 4)) % 8;
  return WIND_NAMES[index];
}

function normalizeAngle(angle) {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}
