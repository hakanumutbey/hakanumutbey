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
const STAR_KEY = "car-sim2d-stars"; // {bolumIndex: 1..3}
const BADGE_KEY = "car-sim2d-badges"; // [rozetId]

// ---------- Bolumler ----------
// 100 el yapimi bolum levels.js'de tanimli (game.js'den once yuklenir, LEVELS).
// 101. bolumden itibaren levelgen.js'deki prosedurel uretec devreye girer
// (tohum = bolum numarasi; cozulebilirlik solve ile gomulu, uzun dunyalar).
// Alanlar: grounds (zemin), walls (carpar), noZones (cizilmez), fans (yukari iter),
// movers (salinan engel), truck (kasa), lineLimit, worldW (uretilenlerde),
// solve (testin referans cizgisi; tek parca ya da parcali).

// Referans cozum cizgisi: duz rampa + duvar ustunden / bolge kenarindan
// sapmalar. Yildiz hesabinda "par" olarak kullanilir; otomatik test de ayni
// yolu oynadigi icin her bolumde 3 yildizin mumkun oldugu kanatlidir.
function referencePath(L) {
  const pts = [{ x: L.carStart.x, y: L.carStart.y }];
  const bedCX = L.truck.bedX + L.truck.bedW / 2;
  const rampY = (x) =>
    L.carStart.y + ((L.truck.bedY - L.carStart.y) * (x - L.carStart.x)) / (bedCX - L.carStart.x);
  const obstacles = [];
  for (const w of [...L.walls].sort((a, b) => a.x - b.x)) {
    if (rampY(w.x + w.w / 2) > w.y - 30) obstacles.push({ x: w.x, w: w.w, y: w.y - 35 });
  }
  for (const z of L.noZones || []) {
    if (z.y + z.h >= 400) obstacles.push({ x: z.x, w: z.w, y: z.y - 35 });
    else obstacles.push({ x: z.x, w: z.w, y: z.y + z.h + 35 });
  }
  obstacles.sort((a, b) => a.x - b.x);
  for (const o of obstacles) pts.push({ x: o.x - 15, y: o.y }, { x: o.x + o.w + 15, y: o.y });
  pts.push({ x: bedCX, y: L.truck.bedY });
  return pts;
}

// solve cizgisi tek parca (nokta dizisi) ya da parcali (parcalarin dizisi)
// olabilir — parcali cizgiler uretilen fan bolumlerinde kullanilir.
function solveStrokes(L) {
  const s = L.solve;
  if (!s) return [referencePath(L)];
  return Array.isArray(s[0]) ? s : [s];
}

function referenceLength(L) {
  let len = 0;
  for (const pts of solveStrokes(L)) {
    for (let i = 0; i < pts.length - 1; i++) {
      len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
  }
  return len;
}

// ---------- Durum ----------
let progress = Math.max(0, Number(localStorage.getItem(SAVE_KEY)) || 0); // bitirilen bolum sayisi (100'u asabilir: sonsuz mod)
let levelIndex = progress; // kaldigi bolumden devam
let tries = 1;
let mode = "menu"; // menu | draw | drive | paused | won | lost
let pausedFrom = null;
let lastFailReason = "";
let lastOverlay = { title: "", text: "" };
let line = []; // cizgi: ayri parcalar (stroke) listesi; her parca nokta dizisi
let lineLength = 0;
let drawing = false;
let penLifted = false; // cizilmez bolgede kalem kalkti mi
let driveFrame = 0; // surus basladigindan beri gecen kare (hareketli engeller icin)
let car = null;
let camX = 0; // kamera: dunyanin gorunen sol kenari (surus sirasinda arabayi izler)
let viewScale = 1; // cizim modunda tum dunya ekrana sigsin diye olcek (uzun bolumlerde <1)
let confetti = [];
let lastWinStars = 0;
let lastNewBadges = [];

// ---------- Yildizlar ve rozetler ----------
let starMap = {};
try { starMap = JSON.parse(localStorage.getItem(STAR_KEY)) || {}; } catch {}
let badges = [];
try { badges = JSON.parse(localStorage.getItem(BADGE_KEY)) || []; } catch {}

function totalStars() {
  return Object.values(starMap).reduce((sum, s) => sum + s, 0);
}

const BADGES = [
  { id: "first", icon: "🏁", name: "İlk Galibiyet", desc: "İlk bölümü bitir", test: () => progress >= 1 },
  { id: "ten", icon: "🔟", name: "Onluk", desc: "10 bölüm bitir", test: () => progress >= 10 },
  { id: "quarter", icon: "🌓", name: "Çeyrek Yol", desc: "25 bölüm bitir", test: () => progress >= 25 },
  { id: "half", icon: "🌗", name: "Yarı Yol", desc: "50 bölüm bitir", test: () => progress >= 50 },
  { id: "hundred", icon: "🏆", name: "Efsane", desc: "100 bölümün hepsini bitir", test: () => progress >= 100 },
  { id: "firsttry", icon: "⚡", name: "Tek Atış", desc: "Bir bölümü ilk denemede geç", test: () => tries === 1 },
  { id: "stars30", icon: "⭐", name: "Yıldız Avcısı", desc: "30 yıldız topla", test: () => totalStars() >= 30 },
  { id: "perfect10", icon: "🌟", name: "Kusursuz Sürücü", desc: "10 bölümü 3 yıldızla bitir", test: () => Object.values(starMap).filter((s) => s >= 3).length >= 10 },
];

// Kazanma sonrasi cagrilir; yeni kazanilan rozetleri dondurur
function checkBadges() {
  const fresh = [];
  for (const b of BADGES) {
    if (!badges.includes(b.id) && b.test()) {
      badges.push(b.id);
      fresh.push(b);
    }
  }
  if (fresh.length) localStorage.setItem(BADGE_KEY, JSON.stringify(badges));
  return fresh;
}

function level() {
  // 100 el yapimi bolumden sonra prosedurel uretec (levelgen.js) devralir
  return LEVELS[levelIndex] || generateLevel(levelIndex);
}

// Dunya genisligi: el yapimi bolumler tek ekran; uretilen bolumler 1600+ px.
function worldWidth() {
  const L = level();
  return (L && L.worldW) || W;
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
  hudLevel.textContent =
    levelIndex < LEVELS.length ? `Bölüm ${levelIndex + 1}/${LEVELS.length}` : `Bölüm ${levelIndex + 1}`;
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
      `${LEVELS.length} el yapımı bölüm var; onlar bitince bilgisayar sonsuza kadar yepyeni bölümler üretir. ` +
      `Kaldığın yerden devam edersin. (${progress} bölüm bitti)`,
    buttons: [
      { label: "Başla", onClick: () => { tries = 1; startLevel(); } },
      { label: "Bölüm Seç", secondary: true, onClick: showLevelSelect },
    ],
  });
}

function showWin() {
  const last = levelIndex === LEVELS.length - 1; // son el yapimi bolum
  const endless = levelIndex >= LEVELS.length; // uretilen bolum
  const starText = "★".repeat(lastWinStars) + "☆".repeat(3 - lastWinStars);
  const badgeText = lastNewBadges.length
    ? ` Yeni rozet: ${lastNewBadges.map((b) => `${b.icon} ${b.name}`).join(", ")}!`
    : "";
  renderOverlay({
    title: last ? "Tebrikler! 🏆" : "Başardın!",
    text: last
      ? `100 el yapımı bölümün hepsini bitirdin! Efsanesin! ${starText}${badgeText} ` +
        "Ama bitmedi: bundan sonra her seferinde bilgisayarın ürettiği yepyeni bölümler gelecek — sonsuza kadar!"
      : endless
        ? `${level().name} (Bölüm ${levelIndex + 1}) bitti — ${starText} Sıradaki bölüm yepyeni üretilecek!${badgeText}`
        : `${level().name} bölümü bitti — ${starText} Sıradaki bölüm seni bekliyor!${badgeText}`,
    buttons: [
      {
        label: "Sonraki Bölüm",
        onClick: () => {
          levelIndex += 1; // son el yapimi bolumden sonra uretec devralir
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
  stopEngine();
  const grid = document.createElement("div");
  grid.className = "level-grid";
  for (let i = 0; i < LEVELS.length; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    const s = starMap[i] || 0;
    btn.innerHTML = s > 0 ? `${i + 1}<small>${"★".repeat(s)}</small>` : String(i + 1);
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
  const badgeRow = document.createElement("div");
  badgeRow.className = "badge-row";
  for (const b of BADGES) {
    const box = document.createElement("div");
    box.className = "badge-box" + (badges.includes(b.id) ? "" : " locked");
    box.innerHTML = `<span class="badge-icon">${b.icon}</span><span>${b.name}<small>${b.desc}</small></span>`;
    badgeRow.appendChild(box);
  }
  const wrap = document.createElement("div");
  wrap.className = "select-wrap";
  wrap.appendChild(grid);
  wrap.appendChild(badgeRow);
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
    starMap = {};
    badges = [];
    localStorage.setItem(SAVE_KEY, "0");
    localStorage.setItem(STAR_KEY, "{}");
    localStorage.setItem(BADGE_KEY, "[]");
    updateHud();
    showLevelSelect();
  };
  // Sonsuz mod: uretilen bolumler secim izgarasina sigmaz; devam dugmesi yeterli.
  const buttons = [];
  if (progress >= LEVELS.length) {
    buttons.push({
      label: `∞ Sonsuz Mod: Bölüm ${progress + 1}'den devam`,
      onClick: () => {
        levelIndex = progress;
        tries = 1;
        startLevel();
      },
    });
  }
  buttons.push(
    { label: "← Geri", secondary: true, onClick: renderForMode },
    { label: "İlerlemeyi Sıfırla", secondary: true, onClick: resetProgress },
  );
  renderOverlay({
    title: "Bölüm Seç",
    text:
      progress >= LEVELS.length
        ? `100 el yapımı bölüm bitti, ${totalStars()} yıldızın var. Sonsuz modda Bölüm ${progress + 1}'desin — her bölüm yepyeni üretiliyor!`
        : `${progress}/${LEVELS.length} bölüm bitti, ${totalStars()} yıldız topladın.`,
    extra: wrap,
    buttons,
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
  driveFrame = 0;
  camX = 0;
  confetti = [];
  pausedFrom = null;
  stopEngine();
  resetCar();
  applyTheme();
  updateHud();
  hideOverlay();
  mode = "draw";
  if ((level().fans || []).length > 0) {
    hint.textContent = "Fanlar havadaki arabayı yukarı iter — çizgiyi erken bitirip rüzgâra bırak!";
  } else if ((level().movers || []).length > 0) {
    hint.textContent = "Turuncu engeller salınıyor — rotanı erişim yollarının dışından kur!";
  } else if ((level().noZones || []).length > 0) {
    hint.textContent = "Mor bölgeye çizgi çizemezsin — çizgiyi çevresinden geçir!";
  } else if (level().lineLimit) {
    hint.textContent = `Dikkat: bu bölümde mürekkep sınırlı (${level().lineLimit} birim)!`;
  } else {
    hint.textContent = "Basılı tut, çizgiyi çiz, bırak. Araba dümdüz gider!";
  }
}

function retryLevel(reason) {
  mode = "lost";
  stopEngine();
  lastFailReason = reason;
  tone(160, 0.25);
  showLost();
}

function winLevel() {
  mode = "won";
  stopEngine();
  tone(660, 0.12);
  setTimeout(() => tone(880, 0.2), 130);
  spawnConfetti();
  // yildiz: referans cizgiye yakinlik (3 yildiz her zaman mumkun, test dogrular)
  const ref = referenceLength(level());
  lastWinStars = lineLength <= ref * 1.08 ? 3 : lineLength <= ref * 1.3 ? 2 : 1;
  if ((starMap[levelIndex] || 0) < lastWinStars) {
    starMap[levelIndex] = lastWinStars;
    localStorage.setItem(STAR_KEY, JSON.stringify(starMap));
  }
  progress = Math.max(progress, levelIndex + 1);
  localStorage.setItem(SAVE_KEY, String(progress));
  lastNewBadges = checkBadges();
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

// ---------- Motor sesi (surus sirasinda) ----------
let engineOsc = null;
let engineGain = null;

function startEngine() {
  if (!musicOn || engineOsc) return;
  const ac = ensureAudio();
  if (!ac) return;
  try {
    engineOsc = ac.createOscillator();
    engineGain = ac.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = 68;
    engineGain.gain.value = 0.018;
    engineOsc.connect(engineGain).connect(ac.destination);
    engineOsc.start();
  } catch {}
}

function stopEngine() {
  try {
    if (engineOsc) engineOsc.stop();
  } catch {}
  engineOsc = null;
  engineGain = null;
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
  else {
    stopMusic();
    stopEngine();
  }
});

// Tarayici autoplay engeli: ses ancak ilk kullanici hareketinde acilir
document.addEventListener("pointerdown", () => {
  if (musicOn) startMusic();
}, { once: true });

// ---------- Cizgi cizme ----------
function canvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  // ekran -> dunya donusumu: cizim modunda olcek (uzun bolumler tum ekrana
  // sigar), surus sirasinda kamera kaymasi (camX) hesaba katilir.
  return {
    x: ((event.clientX - rect.left) / rect.width) * (W / viewScale) + camX,
    y: ((event.clientY - rect.top) / rect.height) * (H / viewScale),
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
  startEngine();
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
// Hareketli engelin o anki konumu (surus karesine bagli salinim)
function moverPos(m) {
  const off = Math.sin(driveFrame * m.speed + (m.phase || 0)) * m.range;
  return m.axis === "x" ? { ...m, x: m.x + off } : { ...m, y: m.y + off };
}

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
  driveFrame += 1;
  car.x += CAR_SPEED;
  car.vy += GRAVITY;
  car.bottom += car.vy;

  // fanlar: araba HAVADAYKEN yukari iter (cizgideyken etkilemez).
  // Yukselis hizi sinirli: araba fanin ust cizgisinde sakin bir sekilde suzulur.
  if (!car.grounded) {
    for (const f of level().fans || []) {
      if (car.x > f.x && car.x < f.x + f.w && car.bottom > f.y && car.bottom < f.y + f.h) {
        car.vy = Math.max(car.vy - f.lift, -1.3);
      }
    }
  }

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

  // hareketli engeller: surus baslayinca salinir (kare sayisina bagli, deterministik)
  for (const m of level().movers || []) {
    const p = moverPos(m);
    if (
      car.x > p.x + 2 &&
      car.x < p.x + p.w - 2 &&
      car.bottom > p.y + 6 &&
      car.bottom - 24 < p.y + p.h
    ) {
      retryLevel("Araba hareketli engele çarptı! Engel sürekli yer değiştiriyor — rotanı onun erişemeyeceği yerden kur.");
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

  // dustu ya da dunyanin sonundan cikti
  if (car.bottom > H + 40) {
    retryLevel("Araba aşağı düştü! Çizginin ucu kasaya bakmalı.");
    return;
  }
  if (car.x > worldWidth() + 30) {
    retryLevel("Araba kamyoneti geçti gitti! Çizgiyi kasanın içinde bitir.");
  }
}

// ---------- Temalar (her 10 bolumde bir palet) ----------
const THEMES = [
  { bg1: "#0d1622", bg2: "#0b0d10", ground: "#1c2733", edge: "#35d2ff", star: "rgba(53, 210, 255, 0.5)" }, // 1-10 neon gece
  { bg1: "#1a1026", bg2: "#0d0a12", ground: "#251a33", edge: "#b892ff", star: "rgba(184, 146, 255, 0.5)" }, // 11-20 mor sis
  { bg1: "#0d1f16", bg2: "#0a120d", ground: "#16301f", edge: "#8fff6a", star: "rgba(143, 255, 106, 0.45)" }, // 21-30 orman
  { bg1: "#241a08", bg2: "#120d06", ground: "#33270f", edge: "#ffd166", star: "rgba(255, 209, 102, 0.5)" }, // 31-40 col
  { bg1: "#260d0d", bg2: "#120909", ground: "#331616", edge: "#ff6a5c", star: "rgba(255, 106, 92, 0.5)" }, // 41-50 lav
  { bg1: "#0a1a24", bg2: "#081014", ground: "#122a38", edge: "#5cd6ff", star: "rgba(92, 214, 255, 0.5)" }, // 51-60 okyanus
  { bg1: "#1c0f1e", bg2: "#0e0910", ground: "#2b1730", edge: "#ff8fd0", star: "rgba(255, 143, 208, 0.5)" }, // 61-70 kozmik
  { bg1: "#101d0d", bg2: "#0a1008", ground: "#1b3013", edge: "#c0ff5c", star: "rgba(192, 255, 92, 0.5)" }, // 71-80 zehir
  { bg1: "#0d1a26", bg2: "#090d12", ground: "#14283c", edge: "#8fb8ff", star: "rgba(143, 184, 255, 0.5)" }, // 81-90 buz
  { bg1: "#1f1d0a", bg2: "#100f06", ground: "#302c10", edge: "#ffe45c", star: "rgba(255, 228, 92, 0.5)" }, // 91-100 altin
];

function theme() {
  return THEMES[Math.min(THEMES.length - 1, Math.floor(levelIndex / 10))];
}

function applyTheme() {
  try {
    document.documentElement.style.setProperty("--cyan", theme().edge);
  } catch {}
}

// ---------- Cizim ----------
function drawBackground() {
  const th = theme();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, th.bg1);
  grad.addColorStop(1, th.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = th.star;
  for (const star of STARS) ctx.fillRect(star.x, star.y, 2, 2);
}

const STARS = Array.from({ length: 60 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H * 0.6,
}));

function drawGrounds() {
  const th = theme();
  for (const g of level().grounds) {
    ctx.fillStyle = th.ground;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = th.edge;
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

// Fanlar: camgobegi yukari ok alani (havadaki arabayi yukari iter)
function drawFans() {
  for (const f of level().fans || []) {
    ctx.fillStyle = "rgba(92, 214, 255, 0.07)";
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.strokeStyle = "rgba(92, 214, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(92, 214, 255, 0.8)";
    for (let ay = f.y + f.h - 18; ay > f.y + 10; ay -= 26) {
      for (let ax = f.x + 16; ax < f.x + f.w - 8; ax += 30) {
        ctx.beginPath();
        ctx.moveTo(ax - 6, ay);
        ctx.lineTo(ax, ay - 8);
        ctx.lineTo(ax + 6, ay);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("FAN", f.x + f.w / 2, f.y + 14);
  }
}

// Hareketli engeller: turuncu seritli blok + salinim yolu (kesik cizgi)
function drawMovers() {
  for (const m of level().movers || []) {
    ctx.strokeStyle = "rgba(255, 166, 77, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (m.axis === "x") {
      ctx.moveTo(m.x - m.range + m.w / 2, m.y + m.h / 2);
      ctx.lineTo(m.x + m.range + m.w / 2, m.y + m.h / 2);
    } else {
      ctx.moveTo(m.x + m.w / 2, m.y - m.range + m.h / 2);
      ctx.lineTo(m.x + m.w / 2, m.y + m.range + m.h / 2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const p = moverPos(m);
    ctx.fillStyle = "#3a2a14";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#ffa64d";
    ctx.fillRect(p.x, p.y, p.w, 4);
    ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);
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
    ctx.lineWidth = 5 / viewScale; // uzaklasan kamerada da ayni gorunur kalinlik
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(255, 209, 102, 0.6)";
    ctx.shadowBlur = 8 / viewScale;
    for (const stroke of line) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const p of stroke) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
}

// Murekkep gostergesi: ekran uzayinda (kamera donusumunun disinda) cizilir
function drawInkHud() {
  if (!drawing) return;
  const left = Math.max(0, Math.round(lineLimit() - lineLength));
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 14px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`Çizgi: ${left}`, 12, 24);
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
  // Kamera: surus sirasinda arabayi yatay izler; diger modlarda (cizim dahil)
  // tum dunyayi ekrana sigdirir. El yapimi bolumlerde dunya = ekran oldugundan
  // ne kayma ne olcek degisir (worldWidth() = W, camX = 0, viewScale = 1).
  const ww = worldWidth();
  if (mode === "drive" && ww > W) {
    const target = Math.max(0, Math.min(car.x - W * 0.38, ww - W));
    camX += (target - camX) * 0.3;
    viewScale = 1;
  } else {
    camX = 0;
    viewScale = ww > W ? W / ww : 1;
  }
  drawBackground();
  ctx.save();
  ctx.scale(viewScale, viewScale);
  ctx.translate(-camX, 0);
  drawGrounds();
  drawNoZones();
  drawFans();
  drawMovers();
  drawTruck();
  drawLine();
  drawCar();
  drawConfetti();
  ctx.restore();
  drawInkHud();
  requestAnimationFrame(loop);
}

// ---------- Baslat ----------
updateMusicButton();
updateHud();
resetCar();
applyTheme();
showIntro();
loop();

// ---------- Test/debug kancasi (oyun etkilenmez) ----------
if (typeof window !== "undefined") {
  window.__carSim = {
    LEVELS,
    MAX_LINE,
    referencePath,
    referenceLength,
    worldWidth,
    generateLevel,
    genLevelSignature,
    genTooSimilar,
    genRebuildFresh,
    get mode() { return mode; },
    get levelIndex() { return levelIndex; },
    get car() { return car; },
    get lastOverlay() { return lastOverlay; },
    get starMap() { return starMap; },
    get badges() { return badges; },
    selectLevel(i) {
      levelIndex = Math.max(0, i); // 100'u asan numaralar uretece gider
      tries = 1;
      startLevel();
    },
    setLine(points) {
      // tek parca (nokta dizisi) ya da parcali cizgi (parca dizileri)
      const strokes = Array.isArray(points[0]) ? points : [points];
      line = strokes;
      lineLength = 0;
      for (const pts of strokes) {
        for (let i = 0; i < pts.length - 1; i++) {
          lineLength += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        }
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
