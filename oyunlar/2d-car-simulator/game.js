/* 2D Car Simulator — cizgi ciz, araba kamyonete girsin! */
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const hudLevel = document.getElementById("hud-level");
const hudTries = document.getElementById("hud-tries");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const overlayButton = document.getElementById("overlay-button");
const resetButton = document.getElementById("reset");
const hint = document.getElementById("hint");

const GRAVITY = 0.35;
const CAR_SPEED = 2.4;
const MAX_LINE = 1300; // cizgi uzunluk limiti (px)
const SAVE_KEY = "car-sim2d-level";

// ---------- Bolumler ----------
// grounds: arabanin ustunde gidebildigi zemin bloklari (y = ust yuzey)
// walls: carpinca patlayan bloklar
// truck: bedX/bedY = acik kasanin sol-uSTu, bedW = kasa genisligi
const LEVELS = [
  {
    name: "Isinma Turu",
    carStart: { x: 70, y: 400 },
    grounds: [{ x: 0, y: 400, w: 820, h: 90 }],
    walls: [],
    truck: { bedX: 600, bedY: 352, bedW: 120 },
  },
  {
    name: "Bosluk Var",
    carStart: { x: 70, y: 400 },
    grounds: [
      { x: 0, y: 400, w: 420, h: 90 },
      { x: 500, y: 400, w: 320, h: 90 },
    ],
    walls: [],
    truck: { bedX: 640, bedY: 352, bedW: 120 },
  },
  {
    name: "Yuksek Kasa",
    carStart: { x: 70, y: 400 },
    grounds: [
      { x: 0, y: 400, w: 820, h: 90 },
      { x: 560, y: 320, w: 260, h: 80 },
    ],
    walls: [],
    truck: { bedX: 620, bedY: 272, bedW: 120 },
  },
  {
    name: "Merdiven Yol",
    carStart: { x: 60, y: 400 },
    grounds: [
      { x: 0, y: 400, w: 300, h: 90 },
      { x: 380, y: 380, w: 180, h: 110 },
      { x: 640, y: 360, w: 180, h: 130 },
    ],
    walls: [],
    truck: { bedX: 672, bedY: 312, bedW: 110 },
  },
  {
    name: "Duvar Engeli",
    carStart: { x: 70, y: 400 },
    grounds: [{ x: 0, y: 400, w: 820, h: 90 }],
    walls: [{ x: 380, y: 296, w: 40, h: 104 }],
    truck: { bedX: 620, bedY: 352, bedW: 120 },
  },
];

// ---------- Durum ----------
let levelIndex = Math.min(Number(localStorage.getItem(SAVE_KEY)) || 0, LEVELS.length - 1);
let tries = 1;
let mode = "menu"; // menu | draw | drive | won | lost
let line = []; // cizgi noktalari [{x,y}]
let lineLength = 0;
let drawing = false;
let car = null;
let confetti = [];

function level() {
  return LEVELS[levelIndex];
}

function resetCar() {
  car = {
    x: level().carStart.x,
    bottom: level().carStart.y,
    vy: 0,
    angle: 0,
    grounded: true,
  };
}

function updateHud() {
  hudLevel.textContent = `Bölüm ${levelIndex + 1}/${LEVELS.length}`;
  hudTries.textContent = `Deneme ${tries}`;
}

function showOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = buttonText;
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

function startLevel() {
  line = [];
  lineLength = 0;
  drawing = false;
  confetti = [];
  resetCar();
  updateHud();
  hideOverlay();
  mode = "draw";
  hint.textContent = "Basılı tut, çizgiyi çiz, bırak. Araba dümdüz gider!";
}

function retryLevel(reason) {
  mode = "lost";
  tone(160, 0.25);
  showOverlay("Olmadı!", reason || "Araba kamyonete ulaşamadı. Yeni bir çizgi dene!", "Tekrar Dene");
}

function winLevel() {
  mode = "won";
  tone(660, 0.12);
  setTimeout(() => tone(880, 0.2), 130);
  spawnConfetti();
  const last = levelIndex === LEVELS.length - 1;
  const unlocked = Math.min(levelIndex + 1, LEVELS.length - 1);
  localStorage.setItem(SAVE_KEY, String(Math.max(Number(localStorage.getItem(SAVE_KEY)) || 0, unlocked)));
  if (last) {
    showOverlay("Tebrikler!", "Bütün bölümleri bitirdin! Arabayı her kasaya soktun. 🏆", "Baştan Oyna");
  } else {
    showOverlay("Başardın!", `${level().name} bölümü bitti. Sıradaki bölüm seni bekliyor!`, "Sonraki Bölüm");
  }
}

// ---------- Ses ----------
let audioCtx = null;
function tone(freq, seconds) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = "square";
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + seconds);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + seconds);
  } catch {}
}

// ---------- Cizgi cizme ----------
function canvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener("pointerdown", (event) => {
  if (mode !== "draw") return;
  drawing = true;
  line = [canvasPos(event)];
  lineLength = 0;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing || mode !== "draw") return;
  const pos = canvasPos(event);
  const last = line[line.length - 1];
  const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
  if (dist < 5) return;
  lineLength += dist;
  line.push(pos);
  if (lineLength >= MAX_LINE) finishDrawing(); // cizgi bitti, araba gitsin
});

function finishDrawing() {
  if (!drawing) return;
  drawing = false;
  if (line.length < 2) {
    line = [];
    return;
  }
  mode = "drive";
  tone(440, 0.08);
  hint.textContent = "Araba gidiyor...";
}

canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", finishDrawing);

resetButton.addEventListener("click", () => {
  tries += 1;
  startLevel();
});

overlayButton.addEventListener("click", () => {
  if (mode === "won") {
    levelIndex = levelIndex === LEVELS.length - 1 ? 0 : levelIndex + 1;
    tries = 1;
  }
  startLevel();
});

// ---------- Fizik ----------
// Cizgi + zemin + kasa tabani: "yuzeyler". Araba nokta gibi dusunulur.
function surfaces() {
  const list = [];
  for (const g of level().grounds) {
    list.push({ x1: g.x, y1: g.y, x2: g.x + g.w, y2: g.y });
  }
  const t = level().truck;
  list.push({ x1: t.bedX, y1: t.bedY, x2: t.bedX + t.bedW, y2: t.bedY }); // kasa tabani
  for (let i = 0; i < line.length - 1; i++) {
    list.push({ x1: line[i].x, y1: line[i].y, x2: line[i + 1].x, y2: line[i + 1].y });
  }
  return list;
}

function stepCar() {
  const prevBottom = car.bottom;
  car.x += CAR_SPEED;
  car.vy += GRAVITY;
  car.bottom += car.vy;

  let landed = null;
  for (const s of surfaces()) {
    const minX = Math.min(s.x1, s.x2);
    const maxX = Math.max(s.x1, s.x2);
    if (car.x < minX || car.x > maxX || s.x1 === s.x2) continue;
    const t = (car.x - s.x1) / (s.x2 - s.x1);
    const surfaceY = s.y1 + (s.y2 - s.y1) * t;
    // yerdeyken: yuzeyi yokus yukari/asagi takip et (yapistir)
    // havadayken: sadece yukardan geliyorsa yuzeye in
    const stick = car.grounded && Math.abs(car.bottom - surfaceY) <= 10;
    const landing = !car.grounded && prevBottom <= surfaceY + 2 && car.bottom >= surfaceY;
    if (stick || landing) {
      if (!landed || surfaceY < landed.y) landed = { y: surfaceY, slope: (s.y2 - s.y1) / (s.x2 - s.x1) };
    }
  }

  if (landed) {
    car.bottom = landed.y;
    car.vy = 0;
    car.grounded = true;
    car.angle += (Math.atan(landed.slope) - car.angle) * 0.3;
  } else {
    car.grounded = false;
    car.angle *= 0.95;
  }

  // duvara / blogun yanina carpma
  for (const wall of level().walls) {
    if (
      car.x > wall.x + 2 &&
      car.x < wall.x + wall.w - 2 &&
      car.bottom > wall.y + 6 &&
      car.bottom < wall.y + wall.h
    ) {
      retryLevel("Araba duvara çarptı! Çizgiyi duvarın üstünden geçir.");
      return;
    }
  }

  // kasanin sag duvarina (kabine) carpma: kasa icinde degilken kasa yuksekliginde saga dayanirsa
  const t = level().truck;
  const inBedX = car.x > t.bedX && car.x < t.bedX + t.bedW;
  if (!inBedX && Math.abs(car.bottom - t.bedY) < 40 && car.x > t.bedX + t.bedW && car.x < t.bedX + t.bedW + 30) {
    retryLevel("Araba kamyonetin kapalı tarafına çarptı. Açık arkadan girmeli!");
    return;
  }

  // kazandi mi: kasanin icinde ve tabanda duruyor
  if (car.grounded && inBedX && Math.abs(car.bottom - t.bedY) < 4) {
    winLevel();
    return;
  }

  // dustu ya da ekrandan cikti
  if (car.bottom > H + 40) {
    retryLevel("Araba aşağı düştü! Çizginin ucu kasaya bakmalı.");
    return;
  }
  if (car.x > W + 30) {
    retryLevel("Araba kamyoneti geçti gitti! Çizgiyi kasanın içinde bitir.");
  }
}

// ---------- Cizim ----------
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0d1622");
  grad.addColorStop(1, "#0b0d10");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(53, 210, 255, 0.5)";
  for (const star of STARS) ctx.fillRect(star.x, star.y, 2, 2);
}

const STARS = Array.from({ length: 60 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H * 0.6,
}));

function drawGrounds() {
  for (const g of level().grounds) {
    ctx.fillStyle = "#1c2733";
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = "#35d2ff";
    ctx.fillRect(g.x, g.y, g.w, 4);
  }
  for (const wall of level().walls) {
    ctx.fillStyle = "#3a1c24";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "#ff4d5f";
    ctx.fillRect(wall.x, wall.y, wall.w, 4);
  }
}

function drawTruck() {
  const t = level().truck;
  const cabX = t.bedX + t.bedW;
  const groundY = t.bedY + 48;

  // kasa tabani
  ctx.fillStyle = "#8a6d1f";
  ctx.fillRect(t.bedX, t.bedY, t.bedW, 8);
  // kabin (sag taraf, kapali taraf)
  ctx.fillStyle = "#b892ff";
  ctx.fillRect(cabX, t.bedY - 26, 44, 74);
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(cabX + 6, t.bedY - 20, 26, 20); // cam
  // kabin onunden yere kadar govde
  ctx.fillStyle = "#8a6d1f";
  ctx.fillRect(cabX, t.bedY + 8, 44, groundY - t.bedY - 8);
  // kasa alti govde
  ctx.fillRect(t.bedX + 4, t.bedY + 8, t.bedW - 8, groundY - t.bedY - 26);
  // tekerlekler
  ctx.fillStyle = "#0b0d10";
  for (const wx of [t.bedX + 22, cabX + 24]) {
    ctx.beginPath();
    ctx.arc(wx, groundY - 8, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a5a5d";
    ctx.beginPath();
    ctx.arc(wx, groundY - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0d10";
  }
  // acik arka isareti (sol taraf acik!)
  ctx.fillStyle = "#8fff6a";
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("BURAYA", t.bedX + t.bedW / 2, t.bedY - 8);
  ctx.beginPath();
  ctx.moveTo(t.bedX - 4, t.bedY - 24);
  ctx.lineTo(t.bedX + 10, t.bedY - 14);
  ctx.lineTo(t.bedX - 4, t.bedY - 4);
  ctx.closePath();
  ctx.fill();
}

function drawCar() {
  if (!car) return;
  ctx.save();
  ctx.translate(car.x, car.bottom);
  ctx.rotate(car.angle);
  // govde
  ctx.fillStyle = "#35d2ff";
  ctx.fillRect(-17, -18, 34, 12);
  ctx.fillRect(-10, -26, 18, 10);
  // cam
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(-7, -24, 12, 7);
  // tekerlekler
  ctx.fillStyle = "#0b0d10";
  for (const wx of [-10, 10]) {
    ctx.beginPath();
    ctx.arc(wx, -4, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f7f4ea";
  for (const wx of [-10, 10]) {
    ctx.beginPath();
    ctx.arc(wx, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLine() {
  if (line.length < 2) return;
  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(255, 209, 102, 0.6)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(line[0].x, line[0].y);
  for (const p of line) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (drawing) {
    const left = Math.max(0, Math.round(MAX_LINE - lineLength));
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`Çizgi: ${left}`, 12, 24);
  }
}

function spawnConfetti() {
  const t = level().truck;
  confetti = Array.from({ length: 40 }, () => ({
    x: t.bedX + t.bedW / 2,
    y: t.bedY - 10,
    vx: (Math.random() - 0.5) * 6,
    vy: -Math.random() * 5 - 1,
    color: ["#35d2ff", "#8fff6a", "#ffd166", "#ff4d5f", "#b892ff"][Math.floor(Math.random() * 5)],
  }));
}

function drawConfetti() {
  for (const c of confetti) {
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.15;
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, 5, 5);
  }
  confetti = confetti.filter((c) => c.y < H + 20);
}

// ---------- Ana dongu ----------
function loop() {
  if (mode === "drive") stepCar();
  drawBackground();
  drawGrounds();
  drawTruck();
  drawLine();
  drawCar();
  drawConfetti();
  requestAnimationFrame(loop);
}

// ---------- Baslat ----------
updateHud();
resetCar();
showOverlay(
  "2D Car Simulator",
  "Basılı tutup çizgi çiz, bırak — araba kendisi dümdüz gider. " +
    "Çizgi yol olur: arabayı kamyonetin açık arkasına sok! Kaldığın bölümden devam edersin.",
  "Başla"
);
loop();
