/* 2D Car Simulator — cizgi ciz, araba kamyonete girsin! 100 bolum! */
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const hudLevel = document.getElementById("hud-level");
const hudTries = document.getElementById("hud-tries");
const overlay = document.getElementById("overlay");
const overlayContent = document.getElementById("overlay-content");
const musicToggle = document.getElementById("music-toggle");
const menuButton = document.getElementById("menu-button");
const resetButton = document.getElementById("reset");
const hint = document.getElementById("hint");

const GRAVITY = 0.35;
const CAR_SPEED = 2.4;
const MAX_LINE = 1300; // cizgi uzunluk limiti (px)
const SAVE_KEY = "car-sim2d-level"; // bitirilen bolum sayisi (0..100)
const MUSIC_KEY = "car-sim2d-music";

// ---------- Bolumler ----------
// grounds: arabanin ustunde gidebildigi zemin bloklari (y = ust yuzey)
// walls: carpinca patlayan bloklar
// truck: bedX/bedY = acik kasanin sol-ustu, bedW = kasa genisligi
const HANDMADE_LEVELS = [
  {
    name: "Isinma Turu",
    carStart: { x: 70, y: 400 },
    grounds: [{ x: 0, y: 400, w: 820, h: 90 }],
    walls: [],
    noZones: [],
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
    noZones: [],
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
    noZones: [],
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
    noZones: [],
    truck: { bedX: 672, bedY: 312, bedW: 110 },
  },
  {
    name: "Duvar Engeli",
    carStart: { x: 70, y: 400 },
    grounds: [{ x: 0, y: 400, w: 820, h: 90 }],
    walls: [{ x: 380, y: 296, w: 40, h: 104 }],
    noZones: [],
    truck: { bedX: 620, bedY: 352, bedW: 120 },
  },
  {
    // Cizilmez bolge ogreticisi: tavan blogu duz rampayi kapatir,
    // oyuncu alttan gidip son anda yuksek kasaya tirmanmak zorunda.
    name: "Alçaktan Geçiş",
    carStart: { x: 70, y: 400 },
    grounds: [{ x: 0, y: 400, w: 820, h: 90 }],
    walls: [],
    noZones: [{ x: 280, y: 0, w: 340, h: 350 }],
    truck: { bedX: 650, bedY: 330, bedW: 105 },
  },
];

// Deterministik rastgele sayi ureteci (her bolum hep ayni olsun diye)
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAME_PRE = ["Sessiz", "Çılgın", "Dar", "Uzun", "Kıvrımlı", "Yüksek", "Gece", "Turbo", "Riskli", "Kolay Görünümlü", "Sinsi", "Hızlı"];
const NAME_SUF = ["Yokuş", "Geçit", "Köprü", "Tırmanış", "Vadi", "Duvar", "Atlama", "Parkur", "Rampa", "Viraj", "Zıplama", "İniş"];

// 7-100 arasi bolumler: giderek zorlasan prosedürel uretim.
// Kurallar: baslangictan kasaya her zaman gecerli bir cizgi var (duvarlarin
// ustunden, cizilmez bolgelerin altindan); cizilmez bolge rampayi kapatir ama
// alttan en az 40px'lik koridor birakir; test bunu dogrular.
function generateLevel(num) {
  const rng = mulberry32(num * 7919);
  const t = (num - 7) / 93; // 0..1 zorluk

  const carStart = { x: 60 + Math.floor(rng() * 30), y: 400 };

  const bedW = 100 + Math.floor(rng() * 30);
  const bedX = 590 + Math.floor(rng() * (750 - bedW - 590));
  const liftMax = 20 + t * 150;
  const bedY = 352 - Math.floor(rng() * liftMax);
  const truck = { bedX, bedY, bedW };

  // rampa (baslangic -> kasa ortasi duz cizgisi) verilen x'te y
  const bedCX = bedX + bedW / 2;
  const rampY = (x) => carStart.y + ((bedY - carStart.y) * (x - carStart.x)) / (bedCX - carStart.x);

  const grounds = [];
  const startW = 300 + Math.floor(rng() * 120);
  const flat = bedY + 48 >= 396;
  if (flat) {
    if (rng() < 0.5) {
      grounds.push({ x: 0, y: 400, w: 820, h: 90 });
    } else {
      const gapW = 60 + Math.floor(rng() * (60 + t * 80));
      grounds.push({ x: 0, y: 400, w: startW, h: 90 });
      grounds.push({ x: startW + gapW, y: 400, w: 820 - startW - gapW, h: 90 });
    }
  } else {
    grounds.push({ x: 0, y: 400, w: startW, h: 90 });
    // kamyonetin altindaki yuksek platform
    const platTop = bedY + 48;
    grounds.push({ x: bedX - 60, y: platTop, w: 820 - (bedX - 60), h: 400 - platTop + 90 });
    // arada 0-2 orta platform; rampanin en az 25px altinda kalmali
    const midCount = Math.floor(rng() * (1 + t * 2));
    let px = startW + 40;
    for (let i = 0; i < midCount; i++) {
      const pw = 90 + Math.floor(rng() * 120);
      if (px + pw > bedX - 120) break;
      const minY = rampY(px + pw) + 25;
      if (minY < 380) {
        const py = Math.floor(minY + rng() * (400 - minY));
        grounds.push({ x: px, y: py, w: pw, h: 400 - py + 90 });
      }
      px += pw + 60 + Math.floor(rng() * 80);
    }
  }

  // cizilmez bolge: 12. bolumden itibaren. Yuksek kasali bolumlerde tavan
  // blogu rampayi kapatir (alttan 40px+ koridor kalir); duz bolumlerde yerden
  // yukselen blok cikar (ustunden asilmali). Iki tur de cizimi de engeller.
  const noZones = [];
  if (num >= 12 && rng() < 0.35 + t * 0.25) {
    const zw = 100 + Math.floor(rng() * 80);
    const zx = 250 + Math.floor(rng() * Math.max(1, bedX - 180 - zw - 250));
    const minDepth = Math.ceil(rampY(zx + zw)) + 15; // tavan rampayi gercekten kapatsin
    if (minDepth <= 345) {
      const depth = Math.min(360, minDepth + Math.floor(rng() * Math.max(1, 346 - minDepth)));
      noZones.push({ x: zx, y: 0, w: zw, h: depth });
    } else {
      const pw = 60 + Math.floor(rng() * 50);
      const px2 = 250 + Math.floor(rng() * Math.max(1, bedX - 140 - pw - 250));
      const top = 240 + Math.floor(rng() * 80);
      noZones.push({ x: px2, y: top, w: pw, h: 490 - top });
    }
  }

  // duvarlar: rampayi kesiyorsa ustunden gecilecek kadar pay birak;
  // cizilmez bolgeye 110px'den fazla yaklasamaz (S-kivrimi icin yer kalsin)
  const walls = [];
  const wallCount = rng() < 0.25 - t * 0.2 ? 0 : 1 + Math.floor(rng() * Math.min(3, 1 + t * 3));
  let wx = 230;
  for (let i = 0; i < wallCount; i++) {
    const ww = 30 + Math.floor(rng() * 20);
    const maxX = bedX - 140;
    wx += Math.floor(rng() * 60);
    if (wx + ww > maxX) break;
    const zone = noZones[0];
    if (zone && wx < zone.x + zone.w + 110 && wx + ww > zone.x - 110) {
      wx += ww + 130;
      continue; // bolgeye cok yakin duvar: atla
    }
    const wh = 40 + Math.floor(rng() * (50 + t * 70));
    walls.push({ x: wx, y: 400 - wh, w: ww, h: wh });
    wx += ww + 130;
  }

  // ileri bolumlerde bazen murekkep limiti: savurgan rampa yetmez
  let lineLimit = 0; // 0 = standart limit (MAX_LINE)
  if (num >= 35 && rng() < 0.3) {
    lineLimit = 900 + Math.floor(rng() * 150);
  }

  const name = `${NAME_PRE[Math.floor(rng() * NAME_PRE.length)]} ${NAME_SUF[Math.floor(rng() * NAME_SUF.length)]}`;
  return { name, carStart, grounds, walls, noZones, lineLimit, truck };
}

const LEVELS = [...HANDMADE_LEVELS];
for (let num = 7; num <= 100; num++) LEVELS.push(generateLevel(num));

// ---------- Durum ----------
let progress = Math.min(Number(localStorage.getItem(SAVE_KEY)) || 0, LEVELS.length);
let levelIndex = Math.min(progress, LEVELS.length - 1);
let tries = 1;
let mode = "menu"; // menu | draw | drive | paused | won | lost
let pausedFrom = null;
let lastFailReason = "";
let lastOverlay = { title: "", text: "" };
let line = []; // cizgi: ayri parcalar (stroke) listesi; her parca nokta dizisi
let lineLength = 0;
let drawing = false;
let penLifted = false; // cizilmez bolgede kalem kalkti mi
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

// ---------- Overlay (menu ekranlari) ----------
function renderOverlay({ title, text, extra = null, buttons = [] }) {
  overlayContent.replaceChildren();
  if (title) {
    const h = document.createElement("h2");
    h.textContent = title;
    overlayContent.appendChild(h);
  }
  if (text) {
    const p = document.createElement("p");
    p.textContent = text;
    overlayContent.appendChild(p);
  }
  if (extra) overlayContent.appendChild(extra);
  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = b.label;
    if (b.secondary) btn.classList.add("secondary");
    btn.addEventListener("click", b.onClick);
    overlayContent.appendChild(btn);
  }
  lastOverlay = { title: title || "", text: text || "" };
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

function showIntro() {
  renderOverlay({
    title: "2D Car Simulator",
    text:
      "Basılı tutup çizgi çiz, bırak — araba kendisi dümdüz gider. " +
      "Çizgi yol olur: arabayı kamyonetin açık arkasına sok! " +
      `100 bölüm var, kaldığın yerden devam edersin. (${progress}/${LEVELS.length} bitti)`,
    buttons: [
      { label: "Başla", onClick: () => { tries = 1; startLevel(); } },
      { label: "Bölüm Seç", secondary: true, onClick: showLevelSelect },
    ],
  });
}

function showWin() {
  const last = levelIndex === LEVELS.length - 1;
  renderOverlay({
    title: last ? "Tebrikler! 🏆" : "Başardın!",
    text: last
      ? "100 bölümün hepsini bitirdin! Arabayı her kasaya soktun. Efsanesin!"
      : `${level().name} bölümü bitti. Sıradaki bölüm seni bekliyor!`,
    buttons: [
      {
        label: last ? "Baştan Oyna" : "Sonraki Bölüm",
        onClick: () => {
          levelIndex = last ? 0 : levelIndex + 1;
          tries = 1;
          startLevel();
        },
      },
      { label: "Bölüm Seç", secondary: true, onClick: showLevelSelect },
    ],
  });
}

function showLost() {
  renderOverlay({
    title: "Olmadı!",
    text: lastFailReason || "Araba kamyonete ulaşamadı. Yeni bir çizgi dene!",
    buttons: [
      { label: "Tekrar Dene", onClick: () => startLevel() },
      { label: "Bölüm Seç", secondary: true, onClick: showLevelSelect },
    ],
  });
}

function showLevelSelect() {
  if (mode === "draw" || mode === "drive") {
    pausedFrom = mode;
    mode = "paused";
  }
  const grid = document.createElement("div");
  grid.className = "level-grid";
  for (let i = 0; i < LEVELS.length; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(i + 1);
    if (i < progress) btn.classList.add("done");
    if (i > progress) {
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        levelIndex = i;
        tries = 1;
        startLevel();
      });
    }
    grid.appendChild(btn);
  }
  let resetArmed = false;
  const resetProgress = (event) => {
    if (!resetArmed) {
      resetArmed = true;
      event.currentTarget.textContent = "Emin misin? Bir daha tıkla";
      return;
    }
    progress = 0;
    levelIndex = 0;
    tries = 1;
    localStorage.setItem(SAVE_KEY, "0");
    updateHud();
    showLevelSelect();
  };
  renderOverlay({
    title: "Bölüm Seç",
    text:
      progress >= LEVELS.length
        ? "Bütün bölümler açık! İstediğini tekrar oyna."
        : `${progress}/${LEVELS.length} bölüm bitti. Yeşiller biten, maviler açık bölümler.`,
    extra: grid,
    buttons: [
      { label: "← Geri", secondary: true, onClick: renderForMode },
      { label: "İlerlemeyi Sıfırla", secondary: true, onClick: resetProgress },
    ],
  });
}

// O anki modun gerektirdigi ekrani goster (menu donuslerinde)
function renderForMode() {
  if (mode === "paused") {
    mode = pausedFrom || "draw";
    pausedFrom = null;
    hideOverlay();
  } else if (mode === "won") {
    showWin();
  } else if (mode === "lost") {
    showLost();
  } else if (mode === "menu") {
    showIntro();
  } else {
    hideOverlay();
  }
}

function startLevel() {
  line = [];
  lineLength = 0;
  drawing = false;
  penLifted = false;
  confetti = [];
  pausedFrom = null;
  resetCar();
  updateHud();
  hideOverlay();
  mode = "draw";
  if ((level().noZones || []).length > 0) {
    hint.textContent = "Mor bölgeye çizgi çizemezsin — çizgiyi çevresinden geçir!";
  } else if (level().lineLimit) {
    hint.textContent = `Dikkat: bu bölümde mürekkep sınırlı (${level().lineLimit} birim)!`;
  } else {
    hint.textContent = "Basılı tut, çizgiyi çiz, bırak. Araba dümdüz gider!";
  }
}

function retryLevel(reason) {
  mode = "lost";
  lastFailReason = reason;
  tone(160, 0.25);
  showLost();
}

function winLevel() {
  mode = "won";
  tone(660, 0.12);
  setTimeout(() => tone(880, 0.2), 130);
  spawnConfetti();
  progress = Math.max(progress, levelIndex + 1);
  localStorage.setItem(SAVE_KEY, String(progress));
  showWin();
}

// ---------- Ses ----------
let audioCtx = null;
function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.resume) audioCtx.resume();
  } catch {}
  return audioCtx;
}

function tone(freq, seconds) {
  try {
    const ac = ensureAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = freq;
    osc.type = "square";
    gain.gain.setValueAtTime(0.06, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + seconds);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + seconds);
  } catch {}
}

// ---------- Muzik (WebAudio chiptune dongusu) ----------
let musicOn = localStorage.getItem(MUSIC_KEY) !== "off";
let musicTimer = null;
let musicStep = 0;
let nextNoteTime = 0;

// midi nota numarasi -> frekans
function mf(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
const MELODY = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 81, 84, 83, 79, 81, 0].map((m) => (m ? mf(m) : 0));
const BASSLINE = [48, 43, 45, 43, 41, 43, 48, 43].map(mf);
const STEP_DUR = 60 / 138 / 2; // 138 bpm'de sekizlik notalar

function blip(freq, when, dur, type, vol) {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(when);
    osc.stop(when + dur);
  } catch {}
}

function scheduleMusic() {
  if (!audioCtx) return;
  while (nextNoteTime < audioCtx.currentTime + 0.12) {
    const mel = MELODY[musicStep % MELODY.length];
    if (mel) blip(mel, nextNoteTime, STEP_DUR * 0.9, "square", 0.03);
    if (musicStep % 2 === 0) {
      const bass = BASSLINE[(musicStep / 2) % BASSLINE.length];
      blip(bass, nextNoteTime, STEP_DUR * 1.8, "triangle", 0.045);
    }
    nextNoteTime += STEP_DUR;
    musicStep++;
  }
}

function startMusic() {
  if (musicTimer || !ensureAudio()) return;
  nextNoteTime = audioCtx.currentTime + 0.1;
  musicTimer = setInterval(scheduleMusic, 40);
}

function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

function updateMusicButton() {
  musicToggle.textContent = musicOn ? "🎵" : "🔇";
  musicToggle.classList.toggle("off", !musicOn);
}

musicToggle.addEventListener("click", () => {
  musicOn = !musicOn;
  localStorage.setItem(MUSIC_KEY, musicOn ? "on" : "off");
  updateMusicButton();
  if (musicOn) startMusic();
  else stopMusic();
});

// Tarayici autoplay engeli: ses ancak ilk kullanici hareketinde acilir
document.addEventListener("pointerdown", () => {
  if (musicOn) startMusic();
}, { once: true });

// ---------- Cizgi cizme ----------
function canvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function lineLimit() {
  return level().lineLimit || MAX_LINE;
}

// Nokta cizilmez bolgede mi? (kalem kalinligi kadar pay birak)
function inNoZone(p) {
  for (const z of level().noZones || []) {
    if (p.x > z.x - 4 && p.x < z.x + z.w + 4 && p.y > z.y - 4 && p.y < z.y + z.h + 4) return true;
  }
  return false;
}

canvas.addEventListener("pointerdown", (event) => {
  if (mode !== "draw") return;
  const pos = canvasPos(event);
  if (inNoZone(pos)) return; // bolge icinden cizim baslayamaz
  drawing = true;
  penLifted = false;
  line = [[pos]];
  lineLength = 0;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing || mode !== "draw") return;
  const pos = canvasPos(event);
  if (inNoZone(pos)) {
    penLifted = true; // bolgede kalem kalkar, cizgide bosluk olusur
    return;
  }
  let stroke = line[line.length - 1];
  if (penLifted || !stroke) {
    stroke = [pos]; // bolgeden cikinca yeni parca baslar
    line.push(stroke);
    penLifted = false;
    return;
  }
  const last = stroke[stroke.length - 1];
  const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
  if (dist < 5) return;
  lineLength += dist;
  stroke.push(pos);
  if (lineLength >= lineLimit()) finishDrawing(); // murekkep bitti, araba gitsin
});

function finishDrawing() {
  if (!drawing) return;
  drawing = false;
  const total = line.reduce((sum, stroke) => sum + stroke.length, 0);
  if (total < 2) {
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

menuButton.addEventListener("click", showLevelSelect);

// ---------- Fizik ----------
// Cizgi + zemin + kasa tabani: "yuzeyler". Araba nokta gibi dusunulur.
function surfaces() {
  const list = [];
  for (const g of level().grounds) {
    list.push({ x1: g.x, y1: g.y, x2: g.x + g.w, y2: g.y });
  }
  const t = level().truck;
  list.push({ x1: t.bedX, y1: t.bedY, x2: t.bedX + t.bedW, y2: t.bedY }); // kasa tabani
  for (const stroke of line) {
    for (let i = 0; i < stroke.length - 1; i++) {
      list.push({ x1: stroke[i].x, y1: stroke[i].y, x2: stroke[i + 1].x, y2: stroke[i + 1].y });
    }
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

  // duvara / blogun yanina carpma (araba govdesi ~24px yuksekliginde, sadece taban noktasi degil)
  for (const wall of level().walls) {
    if (
      car.x > wall.x + 2 &&
      car.x < wall.x + wall.w - 2 &&
      car.bottom > wall.y + 6 &&
      car.bottom - 24 < wall.y + wall.h
    ) {
      retryLevel("Araba duvara çarptı! Çizgiyi duvarın üstünden geçir.");
      return;
    }
  }

  // cizilmez bolgeler arabayi engellemez; sadece icine cizgi cizilemez

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

// Cizilmez bolgeler: mor tarali alan + etiket
function drawNoZones() {
  for (const z of level().noZones || []) {
    ctx.fillStyle = "rgba(184, 146, 255, 0.10)";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(z.x, z.y, z.w, z.h);
    ctx.clip();
    ctx.strokeStyle = "rgba(184, 146, 255, 0.35)";
    ctx.lineWidth = 2;
    for (let d = -z.h; d < z.w; d += 14) {
      ctx.beginPath();
      ctx.moveTo(z.x + d, z.y + z.h);
      ctx.lineTo(z.x + d + z.h, z.y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "#b892ff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.setLineDash([]);
    ctx.fillStyle = "#b892ff";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("ÇİZİLMEZ", z.x + z.w / 2, Math.min(z.y + z.h - 8, z.y + 16));
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
  const hasPoints = line.some((stroke) => stroke.length > 1);
  if (hasPoints) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(255, 209, 102, 0.6)";
    ctx.shadowBlur = 8;
    for (const stroke of line) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const p of stroke) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  if (drawing) {
    const left = Math.max(0, Math.round(lineLimit() - lineLength));
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
  drawNoZones();
  drawTruck();
  drawLine();
  drawCar();
  drawConfetti();
  requestAnimationFrame(loop);
}

// ---------- Baslat ----------
updateMusicButton();
updateHud();
resetCar();
showIntro();
loop();

// ---------- Test/debug kancasi (oyun etkilenmez) ----------
if (typeof window !== "undefined") {
  window.__carSim = {
    LEVELS,
    MAX_LINE,
    get mode() { return mode; },
    get levelIndex() { return levelIndex; },
    get car() { return car; },
    get lastOverlay() { return lastOverlay; },
    selectLevel(i) {
      levelIndex = Math.max(0, Math.min(i, LEVELS.length - 1));
      tries = 1;
      startLevel();
    },
    setLine(points) {
      line = [points];
      lineLength = 0;
      for (let i = 0; i < points.length - 1; i++) {
        lineLength += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
      }
      drawing = false;
      penLifted = false;
      mode = "drive";
    },
    step() {
      if (mode === "drive") stepCar();
    },
  };
}
