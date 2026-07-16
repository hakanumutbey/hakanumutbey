const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const roundLabel = document.querySelector("#roundLabel");
const scoreLabel = document.querySelector("#scoreLabel");
const modeLabel = document.querySelector("#modeLabel");
const energyLabel = document.querySelector("#energyLabel");
const windLabel = document.querySelector("#windLabel");
const crashLabel = document.querySelector("#crashLabel");
const speedLabel = document.querySelector("#speedLabel");
const statusLabel = document.querySelector("#statusLabel");
const hintLabel = document.querySelector("#hintLabel");
const towControls = document.querySelector("[data-tow-controls]");

const TOTAL_ROUNDS = 5;
const WORLD = { width: 1280, height: 720 };
const STORAGE_KEY = "hakorocks-rhgpo-high-score";
const WIND_NAMES = ["Kuzey", "Kuzeydoğu", "Doğu", "Güneydoğu", "Güney", "Güneybatı", "Batı", "Kuzeybatı"];
const ROUND_MODES = ["park", "tow"];

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
  highScore: Number(localStorage.getItem(STORAGE_KEY) || 0),
  message: "Hazır olduğunda Başla'ya bas.",
  nextRoundAt: 0,
  boardingUntil: 0,
  danceUntil: 0,
  lastFrame: performance.now(),
  worldScale: 1,
  wind: { x: 1, y: -0.4, strength: 32, timer: 0 },
  ship: {
    x: 180,
    y: 370,
    angle: -0.12,
    vx: 0,
    vy: 0,
    radius: 22,
  },
  dock: { x: 980, y: 250, w: 170, h: 220, angle: 0 },
  goal: { x: 1120, y: 340, r: 34 },
  obstacles: [],
  input: { left: false, right: false, forward: false, reverse: false, dock: false },
  touch: { active: null },
};

const keys = new Set();
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

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("blur", resetInput);
window.addEventListener("pagehide", resetInput);

document.querySelectorAll("[data-action]").forEach((button) => {
  const action = button.dataset.action;
  button.addEventListener("pointerdown", () => setTouch(action, true));
  button.addEventListener("pointerup", () => setTouch(action, false));
  button.addEventListener("pointerleave", () => setTouch(action, false));
  button.addEventListener("pointercancel", () => setTouch(action, false));
});

resizeCanvas();
renderHud();
requestAnimationFrame(loop);

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
  state.ship.angle = -0.12;
  state.ship.vx = 0;
  state.ship.vy = 0;
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
    strength: 28 + round * 7,
    timer: 8 - Math.min(4, round * 0.45),
  };
}

function makeObstacles(round) {
  return [
    { x: 430 + round * 18, y: 280, r: 30 },
    { x: 650, y: 500 - round * 6, r: 28 },
    { x: 820, y: 180 + round * 12, r: 26 },
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

  if (state.mode === "tow" && !state.engineOn) {
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
    if (event.code === "KeyM") {
      event.preventDefault();
      startEngine();
      return;
    }
  }

  if (state.mode === "tow" && event.code === "KeyM") {
    event.preventDefault();
    startEngine();
    return;
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
  state.input.left = keys.has("ArrowLeft") || keys.has("KeyA");
  state.input.right = keys.has("ArrowRight") || keys.has("KeyD");
  state.input.forward = keys.has("ArrowUp") || keys.has("KeyW");
  state.input.reverse = keys.has("ArrowDown") || keys.has("KeyS");
}

function setTouch(action, pressed) {
  state.touch.active = pressed ? action : null;
  if (action === "left") state.input.left = pressed;
  if (action === "right") state.input.right = pressed;
  if (action === "forward") state.input.forward = pressed;
  if (action === "reverse") state.input.reverse = pressed;
  if (action === "dock") state.input.dock = pressed && state.mode !== "tow";
  if (!pressed) return;
  if (action === "rope-left") pullRope("left");
  if (action === "rope-right") pullRope("right");
  if (action === "engine") startEngine();
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastFrame) / 1000);
  state.lastFrame = now;

  if (state.phase === "boarding" && now >= state.boardingUntil) {
    spawnRound(true);
  } else if (state.phase === "playing") {
    updateWind(dt);
    updateShip(dt);
    if (state.mode === "tow") {
      checkTowGoal(now);
    } else {
      checkDock(now);
    }
    state.energy = Math.max(0, state.energy - dt * (1.6 + state.round * 0.18));
    if (state.energy <= 0) loseGame();
  } else if (state.phase === "transition" && now >= state.nextRoundAt) {
    if (state.round > TOTAL_ROUNDS) {
      winGame();
    } else {
      spawnRound();
    }
  }

  draw();
  renderHud();
  requestAnimationFrame(loop);
}

function updateWind(dt) {
  state.wind.timer -= dt;
  if (state.wind.timer <= 0) {
    const nextIndex = Math.floor(Math.random() * windVectors.length);
    const next = windVectors[nextIndex];
    state.wind.x = next.x;
    state.wind.y = next.y;
    state.wind.strength = 28 + state.round * 7 + Math.random() * 8;
    state.wind.timer = 7.5 - Math.min(4, state.round * 0.45) + Math.random() * 1.5;
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
    state.message = "Halatlar tamam. Motoru çalıştırabilirsin.";
  } else {
    state.message = side === "left"
      ? "Sol halat çekildi. Şimdi rüzgar tarafını çek."
      : "Sağ halat çekildi. Şimdi rüzgar tarafını çek.";
  }
}

function startEngine() {
  if (state.mode !== "tow" || !state.engineReady || state.engineOn || state.phase !== "playing") return;
  state.engineOn = true;
  state.message = "Motor çalıştı. Çıkışa doğru ilerle.";
}

function updateShip(dt) {
  const ship = state.ship;
  const turnSpeed = 2.4;
  const thrust = 240;
  const reverse = 128;
  const windForce = state.wind.strength;
  const drag = 0.985;
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
    state.energy = Math.max(0, state.energy - dt * 2.5);
  }
  if (canDrive && state.input.reverse) {
    ship.vx -= forwardX * reverse * dt;
    ship.vy -= forwardY * reverse * dt;
    state.energy = Math.max(0, state.energy - dt * 1.3);
  }

  if (towMode && !state.engineOn) {
    ship.vx += state.wind.x * windForce * dt * 0.12;
    ship.vy += state.wind.y * windForce * dt * 0.12;
    ship.vx *= Math.pow(0.98, dt * 60);
    ship.vy *= Math.pow(0.98, dt * 60);
  } else {
    ship.vx += state.wind.x * windForce * dt;
    ship.vy += state.wind.y * windForce * dt;
  }
  ship.vx *= Math.pow(drag, dt * 60);
  ship.vy *= Math.pow(drag, dt * 60);
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  if (ship.x < 40 || ship.x > WORLD.width - 40) {
    ship.x = clamp(ship.x, 40, WORLD.width - 40);
    ship.vx *= -0.35;
    if (towMode) registerCrash("Sınır");
    else state.energy = Math.max(0, state.energy - 4);
  }
  if (ship.y < 40 || ship.y > WORLD.height - 40) {
    ship.y = clamp(ship.y, 40, WORLD.height - 40);
    ship.vy *= -0.35;
    if (towMode) registerCrash("Sınır");
    else state.energy = Math.max(0, state.energy - 4);
  }

  const obstacleHit = state.obstacles.find((obstacle) => distance(ship.x, ship.y, obstacle.x, obstacle.y) < obstacle.r + ship.radius);
  if (obstacleHit) {
    const dx = ship.x - obstacleHit.x;
    const dy = ship.y - obstacleHit.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    ship.x = obstacleHit.x + (dx / length) * (obstacleHit.r + ship.radius + 1);
    ship.y = obstacleHit.y + (dy / length) * (obstacleHit.r + ship.radius + 1);
    ship.vx *= -0.25;
    ship.vy *= -0.25;
    if (towMode) {
      registerCrash("Kaya");
    } else {
      state.energy = Math.max(0, state.energy - 8);
      state.message = "Kayaya dokundun. Direksiyonu düzelt.";
    }
  }

}

function registerCrash(reason) {
  state.crashes += 1;
  state.energy = Math.max(0, state.energy - 12);
  state.message = `${reason} çarpması oldu. ${3 - state.crashes} hak kaldı.`;
  resetShip();
  if (state.crashes >= 3) {
    loseGame();
  }
}

function checkDock(now) {
  const ship = state.ship;
  const inDock = ship.x > state.dock.x && ship.x < state.dock.x + state.dock.w && ship.y > state.dock.y && ship.y < state.dock.y + state.dock.h;
  const speed = Math.hypot(ship.vx, ship.vy);
  const angleDiff = Math.abs(normalizeAngle(ship.angle));
  if (inDock && speed < 62 && angleDiff < 0.35 && state.input.dock) {
    completeRound(now);
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
  state.round += 1;
  state.phase = "transition";
  state.nextRoundAt = now + 1200;
  state.danceUntil = now + 1400;
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.highScore));
  }
}

function winGame() {
  state.phase = "won";
  state.message = "Beş tur tamamlandı. RHGPO kazandın.";
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.highScore));
  }
}

function loseGame() {
  state.phase = "lost";
  state.message = "Oyun bitti. Tekrar dene.";
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.highScore));
  }
}

function renderHud() {
  roundLabel.textContent = `${Math.min(state.round, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`;
  modeLabel.textContent = state.mode === "tow" ? "Motor" : "Liman";
  scoreLabel.textContent = String(state.score);
  energyLabel.textContent = `${Math.round(state.energy)}%`;
  windLabel.textContent = windName(state.wind.x, state.wind.y);
  crashLabel.textContent = state.mode === "tow" ? `${state.crashes} / 3` : "Hazır";
  speedLabel.textContent = `${Math.round(Math.hypot(state.ship.vx, state.ship.vy))} km/s`;
  statusLabel.textContent = state.message;
  if (towControls) towControls.hidden = state.phase !== "playing" || state.mode !== "tow";
  hintLabel.textContent =
    state.phase === "boarding"
      ? "Gemimize bindin. Biraz bekle."
      : state.phase === "playing"
        ? state.mode === "tow" && !state.engineOn
          ? `Önce diğer halatı, sonra ${windwardSide(state.wind) === "left" ? "sol" : "sağ"} halatı çek. Sonra motoru çalıştır.`
          : state.mode === "tow"
            ? "Motor açık. Rotayı temiz tut ve çıkışa git."
            : "WASD / ok tuşları ile sür, Space veya E ile park et."
      : state.phase === "won"
        ? `Kazandın. En iyi skor: ${state.highScore}`
        : state.phase === "lost"
          ? `Kaybettin. En iyi skor: ${state.highScore}`
          : `En iyi skor: ${state.highScore}`;
}

function draw() {
  const scale = Math.min(canvas.width / WORLD.width, canvas.height / WORLD.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawBackground();
  drawWater();
  if (state.mode === "tow") drawGoal();
  drawDock();
  drawWind();
  drawObstacles();
  if (state.mode === "tow") drawRopes();
  drawShip();
  drawOverlayText();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, "#13324f");
  gradient.addColorStop(0.55, "#091322");
  gradient.addColorStop(1, "#05070b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawWater() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 18; col += 1) {
      const x = col * 76 + (row % 2) * 20;
      const y = row * 64;
      ctx.beginPath();
      ctx.arc(x + 18, y + 18, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawDock() {
  ctx.save();
  ctx.fillStyle = "rgba(120, 194, 255, 0.12)";
  ctx.fillRect(state.dock.x - 18, state.dock.y - 18, state.dock.w + 36, state.dock.h + 36);
  ctx.strokeStyle = "rgba(153, 240, 111, 0.65)";
  ctx.lineWidth = 4;
  ctx.strokeRect(state.dock.x, state.dock.y, state.dock.w, state.dock.h);
  ctx.fillStyle = "rgba(153, 240, 111, 0.14)";
  ctx.fillRect(state.dock.x + 18, state.dock.y + 18, state.dock.w - 36, state.dock.h - 36);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 22px Inter, sans-serif";
  ctx.fillText("LİMAN", state.dock.x + 40, state.dock.y + 36);
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
    ctx.fillStyle = "rgba(150, 94, 53, 0.9)";
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 209, 102, 0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

function drawGoal() {
  ctx.save();
  ctx.fillStyle = "rgba(85, 214, 255, 0.12)";
  ctx.beginPath();
  ctx.arc(state.goal.x, state.goal.y, state.goal.r + 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(85, 214, 255, 0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.goal.x, state.goal.y, state.goal.r, 0, Math.PI * 2);
  ctx.stroke();
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
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(leftX, y);
  ctx.lineTo(leftX - 60, y + (windSide === "left" ? -18 : 18));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rightX, y);
  ctx.lineTo(rightX + 60, y + (windSide === "right" ? -18 : 18));
  ctx.stroke();
  ctx.fillStyle = state.ropeStage > 0 ? "#96f06f" : "#ffd166";
  ctx.font = "700 14px Inter, sans-serif";
  ctx.fillText("Sol halat", leftX - 76, y + 14);
  ctx.fillText("Sağ halat", rightX + 10, y + 14);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(state.engineReady ? "Motor hazır" : "Halat sırası", ship.x - 48, ship.y - 34);
  ctx.restore();
}

function drawShip() {
  const ship = state.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#0f1724";
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-18, -16);
  ctx.lineTo(-24, 0);
  ctx.lineTo(-18, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(85, 214, 255, 0.35)";
  ctx.beginPath();
  ctx.arc(-8, 0, 10, 0, Math.PI * 2);
  ctx.fill();
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
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "900 54px Inter, sans-serif";
    ctx.fillText("RHGPO", 520, 330);
    ctx.font = "700 24px Inter, sans-serif";
    ctx.fillText("Park modu + motor modu, tek liman savaşı.", 390, 372);
  } else if (state.phase === "boarding") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "900 46px Inter, sans-serif";
    ctx.fillText("Gemiye biniyor...", 430, 330);
    ctx.font = "700 22px Inter, sans-serif";
    ctx.fillText("Kaptan hazır. Görev başlıyor.", 440, 368);
  }
  ctx.restore();
}

function resizeCanvas() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
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
