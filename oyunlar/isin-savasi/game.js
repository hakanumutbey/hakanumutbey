"use strict";

// ================== Kayıt / Ekonomi ==================
const SAVE_KEY = "hakorocks-isin-savasi-save-v1";

const CHARACTERS = [
  { name: "Asker", color: "#5eead4", price: 0 },
  { name: "Gölge", color: "#4b5578", price: 500 },
  { name: "Alev", color: "#ff5b3a", price: 900 },
  { name: "Buz", color: "#9adcff", price: 1400 },
  { name: "Zehir", color: "#8ee83f", price: 2000 },
  { name: "Gece", color: "#7c5bff", price: 2600 },
  { name: "Altın", color: "#ffd166", price: 3200 },
  { name: "Robot", color: "#c0c8d8", price: 4000 },
  { name: "Şimşek", color: "#ffe93f", price: 5000 },
  { name: "Kral", color: "#ff8fd6", price: 6500 },
];

const CODES = {
  ISIN2026: { coins: 2000, text: "+2000 coin" },
  ARENAX5: { coins: 5000, text: "+5000 coin" },
  SIMSEK9: { char: 8, text: "Şimşek karakteri" },
};

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === "object") {
      return {
        coins: Math.max(0, Math.floor(Number(raw.coins)) || 0),
        owned: Array.isArray(raw.owned) && raw.owned.length ? raw.owned.filter((c) => c >= 0 && c < 10) : [0],
        char: Number.isInteger(raw.char) && raw.char >= 0 && raw.char < 10 ? raw.char : 0,
        name: typeof raw.name === "string" ? raw.name.slice(0, 14) : "",
        used: Array.isArray(raw.used) ? raw.used : [],
      };
    }
  } catch { /* yoksay */ }
  return { coins: 0, owned: [0], char: 0, name: "", used: [] };
}

let save = loadSave();
if (!save.owned.includes(save.char)) save.char = 0;

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

// ================== Ses ==================
let audioCtx = null;
function audio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* yok */ }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, dur, type = "square", vol = 0.08, slide = 0) {
  const ctx = audio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

const sfx = {
  click: () => beep(660, 0.06, "square", 0.05),
  shoot: () => beep(880, 0.09, "sawtooth", 0.05, -500),
  hit: () => beep(300, 0.08, "square", 0.07, -120),
  hurt: () => beep(180, 0.15, "sawtooth", 0.09, -80),
  die: () => beep(220, 0.4, "sawtooth", 0.1, -180),
  respawn: () => beep(440, 0.2, "sine", 0.09, 440),
  buy: () => { beep(520, 0.08, "sine", 0.08); setTimeout(() => beep(780, 0.12, "sine", 0.08), 90); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, "sine", 0.09), i * 130)); },
  lose: () => { [400, 320, 240].forEach((f, i) => setTimeout(() => beep(f, 0.22, "sawtooth", 0.08), i * 160)); },
};

// ================== Yardımcılar ==================
const $ = (id) => document.getElementById(id);

let toastTimer = 0;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 2200);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
}

// ================== Karakter çizimi ==================
function shadeColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

function drawCharacter(ctx, charIdx, x, y, r, angle, teamColor) {
  const def = CHARACTERS[charIdx] || CHARACTERS[0];
  ctx.save();
  ctx.translate(x, y);

  if (teamColor) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Işın tabancası
  ctx.rotate(angle);
  ctx.fillStyle = "#1c2333";
  ctx.strokeStyle = shadeColor(def.color, 40);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(r * 0.3, -r * 0.18, r * 1.25, r * 0.36, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 1.55, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.rotate(-angle);

  // Gövde
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = def.color;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = shadeColor(def.color, -70);
  ctx.stroke();

  // Desen: karakter numarasına göre
  const pattern = charIdx % 4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  if (pattern === 1) {
    for (let i = -2; i <= 2; i += 1) ctx.fillRect(-r, i * r * 0.4, r * 2, r * 0.14);
  } else if (pattern === 2) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 3) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
    ctx.lineWidth = r * 0.16;
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.stroke();
  }
  ctx.restore();

  // Vizör
  ctx.save();
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(r * 0.32, 0, r * 0.34, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.fillStyle = "rgba(10,14,26,0.85)";
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ================== Menü ==================
function renderMenu() {
  $("menu-coins").textContent = save.coins;
  $("menu-char-name").textContent = CHARACTERS[save.char].name;
  const canvas = $("menu-char-canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCharacter(ctx, save.char, 90, 90, 52, -Math.PI / 6);
}

function renderChars() {
  $("chars-coins").textContent = save.coins;
  const grid = $("char-grid");
  grid.innerHTML = "";
  CHARACTERS.forEach((def, idx) => {
    const owned = save.owned.includes(idx);
    const selected = save.char === idx;
    const card = document.createElement("div");
    card.className = "char-card" + (selected ? " selected" : "");
    const canvas = document.createElement("canvas");
    canvas.width = 72;
    canvas.height = 72;
    drawCharacter(canvas.getContext("2d"), idx, 36, 36, 24, -Math.PI / 6);
    const name = document.createElement("div");
    name.className = "char-name";
    name.textContent = def.name;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    if (owned) {
      btn.textContent = selected ? "SEÇİLİ" : "SEÇ";
      btn.disabled = selected;
      btn.onclick = () => {
        save.char = idx;
        persist();
        sfx.click();
        renderChars();
        renderMenu();
      };
    } else {
      btn.innerHTML = `AL · <span class="price">🪙${def.price}</span>`;
      btn.disabled = save.coins < def.price;
      btn.onclick = () => {
        if (save.coins < def.price) return;
        save.coins -= def.price;
        save.owned.push(idx);
        save.char = idx;
        persist();
        sfx.buy();
        toast(`${def.name} açıldı!`);
        renderChars();
        renderMenu();
      };
    }
    card.append(canvas, name, btn);
    grid.appendChild(card);
  });
}

// ================== Ağ ==================
const net = {
  ws: null,
  id: "",
  code: "",
  hostId: "",
  isPublic: false,
  mode: "solo",
  phase: "lobby",
  players: [],
};

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/isin-savasi`;
}

function netSend(obj) {
  if (net.ws && net.ws.readyState === WebSocket.OPEN) net.ws.send(JSON.stringify(obj));
}

function connectNet(action) {
  if (net.ws) try { net.ws.close(); } catch { /* yoksay */ }
  net.ws = new WebSocket(wsUrl());
  net.ws.onopen = () => {
    netSend({ ...action, name: currentName(), char: save.char });
  };
  net.ws.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    handleNetMessage(msg);
  };
  net.ws.onclose = () => {
    if (game.active) {
      quitMatch(false);
      showScreen("menu");
      toast("Bağlantı koptu");
    } else if (net.code) {
      net.code = "";
      showScreen("menu");
      toast("Bağlantı koptu");
    }
  };
  net.ws.onerror = () => {
    showPartyError("Sunucuya bağlanılamadı.");
  };
}

function currentName() {
  return ($("name-input").value || "").trim().slice(0, 14) || "Oyuncu";
}

function handleNetMessage(msg) {
  switch (msg.type) {
    case "joined":
      net.id = msg.id;
      net.code = msg.code;
      net.isPublic = !!msg.public;
      $("lobby-title").textContent = net.isPublic ? "Hızlı Maç" : "Party Odası";
      $("lobby-code").textContent = msg.code;
      showScreen("lobby");
      break;
    case "state":
      net.hostId = msg.host;
      net.mode = msg.mode;
      net.phase = msg.phase;
      net.players = msg.players || [];
      renderLobby();
      break;
    case "host":
      net.hostId = msg.id;
      renderLobby();
      break;
    case "start":
      startMatch(msg);
      break;
    case "pos": matchOnPos(msg); break;
    case "shoot": matchOnShoot(msg); break;
    case "hp": matchOnHp(msg); break;
    case "die": matchOnDie(msg); break;
    case "lives": matchOnLives(msg); break;
    case "respawn": matchOnRespawn(msg); break;
    case "player-left": matchOnPlayerLeft(msg); break;
    case "end": matchOnEnd(msg); break;
    case "error": {
      const texts = {
        "room-not-found": "Oda bulunamadı. Kodu kontrol et.",
        "room-full": "Oda dolu (10 kişi).",
        "game-started": "Bu odada maç çoktan başladı.",
        "not-enough-players": "Başlatmak için en az 2 oyuncu gerekli.",
      };
      const text = texts[msg.code] || "Bir hata oldu.";
      if ($("screen-party").classList.contains("active")) showPartyError(text);
      else toast(text);
      break;
    }
    default:
      break;
  }
}

function showPartyError(text) {
  $("party-error").textContent = text;
  setTimeout(() => { $("party-error").textContent = ""; }, 3000);
}

// ================== Lobi ==================
function renderLobby() {
  const list = $("player-list");
  list.innerHTML = "";
  net.players.forEach((p) => {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = CHARACTERS[p.char]?.color || "#fff";
    const name = document.createElement("span");
    name.textContent = p.name + (p.id === net.id ? " (sen)" : "");
    const tag = document.createElement("span");
    tag.className = "tag";
    if (net.mode === "team" && p.team) {
      tag.textContent = p.team + " Takımı";
      tag.classList.add("team-" + p.team.toLowerCase());
    }
    if (p.id === net.hostId) {
      tag.textContent = (tag.textContent ? tag.textContent + " · " : "") + "Kurucu";
      tag.classList.add("host");
    }
    li.append(dot, name, tag);
    list.appendChild(li);
  });
  $("lobby-count").textContent = net.players.length;

  const isHost = net.hostId === net.id;
  $("btn-mode-solo").classList.toggle("selected", net.mode === "solo");
  $("btn-mode-team").classList.toggle("selected", net.mode === "team");
  $("btn-mode-solo").classList.toggle("locked", !isHost);
  $("btn-mode-team").classList.toggle("locked", !isHost);
  $("team-buttons").classList.toggle("visible", net.mode === "team");

  const me = net.players.find((p) => p.id === net.id);
  $("btn-team-a").classList.toggle("selected", me?.team === "A");
  $("btn-team-b").classList.toggle("selected", me?.team === "B");

  const startBtn = $("btn-start");
  startBtn.style.display = isHost ? "" : "none";
  startBtn.disabled = net.players.length < 2;
  $("lobby-note").textContent = isHost
    ? (net.players.length < 2 ? "Başlatmak için en az 2 oyuncu gerekli." : "Hazır olunca başlat!")
    : "Kurucu maçı başlatacak...";
}

$("btn-mode-solo").onclick = () => { netSend({ type: "mode", mode: "solo" }); sfx.click(); };
$("btn-mode-team").onclick = () => { netSend({ type: "mode", mode: "team" }); sfx.click(); };
$("btn-team-a").onclick = () => { netSend({ type: "team", team: "A" }); sfx.click(); };
$("btn-team-b").onclick = () => { netSend({ type: "team", team: "B" }); sfx.click(); };
$("btn-start").onclick = () => { netSend({ type: "start" }); sfx.click(); };
$("btn-lobby-leave").onclick = () => {
  netSend({ type: "leave" });
  net.code = "";
  if (net.ws) try { net.ws.close(); } catch { /* yoksay */ }
  net.ws = null;
  showScreen("menu");
};
$("lobby-code").onclick = () => {
  const code = $("lobby-code").textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
  toast("Kod kopyalandı: " + code);
};

// ================== Menü düğmeleri ==================
$("btn-play").onclick = () => {
  save.name = currentName();
  persist();
  sfx.click();
  connectNet({ type: "quick" });
};
$("btn-party").onclick = () => { sfx.click(); showScreen("party"); };
$("btn-party-back").onclick = () => { sfx.click(); showScreen("menu"); };
$("btn-create-room").onclick = () => {
  save.name = currentName();
  persist();
  sfx.click();
  connectNet({ type: "create" });
};
$("btn-join-room").onclick = () => {
  const code = $("join-code-input").value.trim().toUpperCase();
  if (!code) { showPartyError("Önce bir kod yaz."); return; }
  save.name = currentName();
  persist();
  sfx.click();
  connectNet({ type: "join", code });
};
$("btn-chars").onclick = () => { sfx.click(); renderChars(); showScreen("chars"); };
$("btn-chars-back").onclick = () => { sfx.click(); showScreen("menu"); };
$("btn-code").onclick = () => { sfx.click(); showScreen("code"); };
$("btn-code-back").onclick = () => { sfx.click(); showScreen("menu"); };
$("btn-redeem").onclick = () => {
  const code = $("code-input").value.trim().toUpperCase();
  const msg = $("code-message");
  const reward = CODES[code];
  if (!reward) {
    msg.textContent = "Bu kod geçersiz.";
    return;
  }
  if (save.used.includes(code)) {
    msg.textContent = "Bu kodu zaten kullandın.";
    return;
  }
  save.used.push(code);
  if (reward.coins) save.coins += reward.coins;
  if (reward.char !== undefined && !save.owned.includes(reward.char)) save.owned.push(reward.char);
  persist();
  sfx.buy();
  msg.textContent = "";
  toast(`Kod çalıştı: ${reward.text}!`);
  $("code-input").value = "";
  renderMenu();
};

$("name-input").value = save.name;
$("name-input").addEventListener("input", () => {
  save.name = currentName();
  persist();
});

// ================== Harita ==================
const WORLD = { w: 2600, h: 1900 };
const PLAYER_R = 16;
const PLAYER_SPEED = 245;
const FIRE_INTERVAL = 130;
const RAY_RANGE = 800;
const RAY_DMG = 10;
const SHIELD_MS = 2000;

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMap(seed) {
  const rnd = mulberry32(seed);
  const walls = [
    { x: 0, y: 0, w: WORLD.w, h: 36 },
    { x: 0, y: WORLD.h - 36, w: WORLD.w, h: 36 },
    { x: 0, y: 0, w: 36, h: WORLD.h },
    { x: WORLD.w - 36, y: 0, w: 36, h: WORLD.h },
  ];
  // Sol yarıya üret, sağa aynala (adil harita)
  for (let i = 0; i < 11; i += 1) {
    const w = 80 + rnd() * 140;
    const h = 80 + rnd() * 140;
    const x = 240 + rnd() * (WORLD.w / 2 - 340 - w);
    const y = 120 + rnd() * (WORLD.h - 240 - h);
    walls.push({ x, y, w, h });
    walls.push({ x: WORLD.w - x - w, y, w, h });
  }
  const cw = 70 + rnd() * 60;
  walls.push({ x: WORLD.w / 2 - cw / 2, y: 140 + rnd() * 220, w: cw, h: cw });
  walls.push({ x: WORLD.w / 2 - cw / 2, y: WORLD.h - 140 - rnd() * 220 - cw, w: cw, h: cw });
  return walls;
}

function circleHitsWalls(walls, x, y, r) {
  for (const wl of walls) {
    const cx = Math.max(wl.x, Math.min(x, wl.x + wl.w));
    const cy = Math.max(wl.y, Math.min(y, wl.y + wl.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function findFreeSpot(walls, x, y) {
  if (!circleHitsWalls(walls, x, y, PLAYER_R + 4)) return { x, y };
  for (let radius = 40; radius <= 360; radius += 40) {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const nx = Math.max(60, Math.min(WORLD.w - 60, x + Math.cos(a) * radius));
      const ny = Math.max(60, Math.min(WORLD.h - 60, y + Math.sin(a) * radius));
      if (!circleHitsWalls(walls, nx, ny, PLAYER_R + 4)) return { x: nx, y: ny };
    }
  }
  return { x: WORLD.w / 2, y: WORLD.h / 2 };
}

function teamSpawn(team, idx) {
  const baseX = team === "A" ? 150 : WORLD.w - 150;
  const offsets = [
    { x: 0, y: 0 }, { x: 0, y: -70 }, { x: 0, y: 70 },
    { x: 0, y: -140 }, { x: 0, y: 140 },
  ];
  const off = offsets[idx % offsets.length];
  return { x: baseX, y: WORLD.h / 2 + off.y };
}

function soloSpawn(seed, idx, total) {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const offset = rnd() * Math.PI * 2;
  const a = offset + (idx / Math.max(1, total)) * Math.PI * 2;
  return {
    x: WORLD.w / 2 + Math.cos(a) * 1000,
    y: WORLD.h / 2 + Math.sin(a) * 720,
  };
}

// ================== Maç durumu ==================
const game = {
  active: false,
  mode: "solo",
  myId: "",
  players: new Map(),
  walls: [],
  keys: {},
  mouse: { x: 0, y: 0, down: false, yaw: 0, pitch: 0 },
  touchMode: false,
  lastPosAt: 0,
  lastFireAt: 0,
  beams: [],
  particles: [],
  kills: 0,
  lives: { A: 0, B: 0 },
  spectateId: "",
  ended: false,
  pendingMyDeath: false,
  respawnAt: 0,
  hurtFlashAt: 0,
  lastFrame: 0,
};

const canvas = () => $("game-canvas");

// ---- 3D (Babylon) ----
const S3D = 1 / 40; // dunya birimi -> metre
const WALL_H = 2.7;
let bEngine = null;
let bScene = null;
let bCamera = null;
let bPointerLocked = false;
const bMatCache = new Map();
const bMeshes = new Map(); // id -> { root, legL, legR, armL, armR, labelTex, label, shield, bob }

window.addEventListener("resize", () => {
  if (bEngine) bEngine.resize();
});

function startMatch(msg) {
  game.active = true;
  game.mode = msg.mode;
  game.myId = net.id;
  game.walls = buildMap(msg.seed);
  game.players = new Map();
  game.beams = [];
  game.particles = [];
  game.kills = 0;
  game.lives = msg.lives || { A: 0, B: 0 };
  game.ended = false;
  game.pendingMyDeath = false;
  game.spectateId = "";

  const teamCounters = { A: 0, B: 0 };
  msg.players.forEach((p, index) => {
    let spot;
    if (msg.mode === "team") {
      spot = teamSpawn(p.team, teamCounters[p.team] || 0);
      teamCounters[p.team] = (teamCounters[p.team] || 0) + 1;
    } else {
      spot = soloSpawn(msg.seed, index, msg.players.length);
    }
    spot = findFreeSpot(game.walls, spot.x, spot.y);
    game.players.set(p.id, {
      id: p.id,
      name: p.name,
      char: p.char,
      team: p.team,
      spawnTeamIdx: (teamCounters[p.team] || 1) - 1,
      x: spot.x, y: spot.y, a: p.team === "B" ? Math.PI : 0,
      rx: spot.x, ry: spot.y, ra: 0,
      hp: 100, alive: true,
      shieldUntil: performance.now() + SHIELD_MS,
    });
  });

  showScreen("match");
  init3D();
  $("match-end").classList.remove("visible");
  $("respawn-overlay").classList.remove("visible");
  $("killfeed").innerHTML = "";
  $("hud-lives").classList.toggle("visible", game.mode === "team");
  updateLivesHud();
  game.lastFrame = performance.now();
  requestAnimationFrame(matchLoop);
}

function me() {
  return game.players.get(game.myId);
}

function isEnemy(ent) {
  const m = me();
  if (!m || !ent || ent.id === m.id) return false;
  if (game.mode === "team") return ent.team !== m.team;
  return true;
}

function teamColor(team) {
  return team === "A" ? "#ff5b6e" : team === "B" ? "#4ea3ff" : "";
}

// ================== Girdi ==================
window.addEventListener("keydown", (e) => {
  if (!game.active) return;
  game.keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  game.keys[e.code] = false;
});
function tryPointerLock() {
  const c = canvas();
  if (game.touchMode || bPointerLocked || !c.requestPointerLock) return;
  try {
    const p = c.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch { /* yoksay */ }
}

window.addEventListener("mousemove", (e) => {
  game.mouse.x = e.clientX;
  game.mouse.y = e.clientY;
  if (bPointerLocked) {
    game.mouse.yaw -= e.movementX * 0.0026;
    game.mouse.pitch = Math.max(-1, Math.min(1, game.mouse.pitch + e.movementY * 0.0022));
  }
});
window.addEventListener("mousedown", (e) => {
  if (!game.active) return;
  if (e.target === canvas()) game.mouse.down = true;
  tryPointerLock();
});
window.addEventListener("click", () => {
  if (game.active) tryPointerLock();
});
window.addEventListener("mouseup", () => {
  game.mouse.down = false;
});
document.addEventListener("pointerlockchange", () => {
  bPointerLocked = document.pointerLockElement === canvas();
  $("lock-hint").classList.toggle("visible", game.active && !bPointerLocked && !game.touchMode);
});
window.addEventListener("touchstart", () => {
  game.touchMode = true;
  $("lock-hint").classList.remove("visible");
}, { passive: true });

// ================== Işın / çarpışma ==================
function rayWallDist(x, y, dx, dy, maxDist) {
  let best = maxDist;
  for (const wl of game.walls) {
    let tmin = 0;
    let tmax = best;
    let ok = true;
    for (const [p, d, lo, hi] of [[x, dx, wl.x, wl.x + wl.w], [y, dy, wl.y, wl.y + wl.h]]) {
      if (Math.abs(d) < 1e-9) {
        if (p < lo || p > hi) { ok = false; break; }
      } else {
        let t1 = (lo - p) / d;
        let t2 = (hi - p) / d;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) { ok = false; break; }
      }
    }
    if (ok && tmin > 0 && tmin < best) best = tmin;
  }
  return best;
}

function rayHit(fromId, x, y, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const wallDist = rayWallDist(x, y, dx, dy, RAY_RANGE);
  let best = wallDist;
  let victim = null;
  for (const ent of game.players.values()) {
    if (!ent.alive || ent.id === fromId) continue;
    const ox = ent.rx - x;
    const oy = ent.ry - y;
    const t = ox * dx + oy * dy;
    if (t < 0 || t > best) continue;
    const px = x + dx * t;
    const py = y + dy * t;
    const ddx = ent.rx - px;
    const ddy = ent.ry - py;
    if (ddx * ddx + ddy * ddy <= (PLAYER_R + 3) * (PLAYER_R + 3)) {
      best = t;
      victim = ent;
    }
  }
  return { dist: best, victim, x: x + dx * best, y: y + dy * best };
}

function losClear(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  return rayWallDist(x1, y1, dx / dist, dy / dist, dist) >= dist - 1;
}

function fireRay(ent) {
  const now = performance.now();
  const hit = rayHit(ent.id, ent.x, ent.y, ent.a);
  const sx = ent.x + Math.cos(ent.a) * (PLAYER_R + 6);
  const sy = ent.y + Math.sin(ent.a) * (PLAYER_R + 6);
  game.beams.push({
    x1: sx, y1: sy, x2: hit.x, y2: hit.y,
    color: CHARACTERS[ent.char]?.color || "#fff",
    until: now + 130,
  });
  spawnParticles(hit.x, hit.y, hit.victim ? "#ffd166" : "#5eead4", 6);
  sfx.shoot();
  if (hit.victim && isEnemy(hit.victim) && now >= hit.victim.shieldUntil) {
    netSend({ type: "hit", target: hit.victim.id, dmg: RAY_DMG });
    sfx.hit();
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 160;
    game.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      color,
      until: performance.now() + 300 + Math.random() * 300,
      size: 2 + Math.random() * 3,
    });
  }
}

// ================== Ağ olayları (maç) ==================
function matchOnPos(msg) {
  const ent = game.players.get(msg.id);
  if (!ent || msg.id === game.myId) return;
  ent.x = msg.x;
  ent.y = msg.y;
  ent.a = msg.a;
}

function matchOnShoot(msg) {
  if (!game.active || msg.id === game.myId) return;
  const ent = game.players.get(msg.id);
  if (!ent || !ent.alive) return;
  const hit = rayHit(msg.id, msg.x, msg.y, msg.a);
  game.beams.push({
    x1: msg.x + Math.cos(msg.a) * (PLAYER_R + 6),
    y1: msg.y + Math.sin(msg.a) * (PLAYER_R + 6),
    x2: hit.x, y2: hit.y,
    color: CHARACTERS[ent.char]?.color || "#fff",
    until: performance.now() + 130,
  });
}

function matchOnHp(msg) {
  const ent = game.players.get(msg.id);
  if (!ent) return;
  ent.hp = msg.hp;
  drawPlayerLabel(ent);
  if (msg.id === game.myId) {
    game.hurtFlashAt = performance.now();
    sfx.hurt();
  }
}

function killfeedAdd(text) {
  const feed = $("killfeed");
  const div = document.createElement("div");
  div.textContent = text;
  feed.prepend(div);
  while (feed.children.length > 5) feed.lastChild.remove();
  setTimeout(() => div.remove(), 4500);
}

function matchOnDie(msg) {
  const ent = game.players.get(msg.id);
  if (!ent) return;
  ent.alive = false;
  ent.hp = 0;
  spawnParticles(ent.rx, ent.ry, CHARACTERS[ent.char]?.color || "#fff", 22);
  const killer = game.players.get(msg.by);
  killfeedAdd(killer ? `⚡ ${killer.name} → ${ent.name}` : `${ent.name} oyundan çıktı`);
  if (msg.by === game.myId) {
    game.kills += 1;
    toast("⚡ Av! +" + 40 + " coin maç sonunda");
  }
  if (msg.id === game.myId) {
    sfx.die();
    if (game.mode === "team") {
      game.pendingMyDeath = true;
      setTimeout(() => {
        if (game.pendingMyDeath && !me()?.alive && game.active && !game.ended) {
          startSpectate();
        }
      }, 500);
    } else {
      startSpectate();
    }
  }
  updateAliveHud();
}

function matchOnLives(msg) {
  game.lives = msg.lives;
  updateLivesHud();
  const m = me();
  if (m && game.pendingMyDeath && !m.alive && game.active && !game.ended) {
    game.pendingMyDeath = false;
    game.respawnAt = performance.now() + 3000;
    $("respawn-text").textContent = "Yeniden doğuyorsun...";
    $("respawn-overlay").classList.add("visible");
  }
}

function matchOnRespawn(msg) {
  const ent = game.players.get(msg.id);
  if (!ent) return;
  const spot = findFreeSpot(game.walls, ...Object.values(teamSpawn(ent.team, ent.spawnTeamIdx)));
  ent.x = spot.x;
  ent.y = spot.y;
  ent.rx = spot.x;
  ent.ry = spot.y;
  ent.hp = msg.hp;
  ent.alive = true;
  drawPlayerLabel(ent);
  ent.shieldUntil = performance.now() + SHIELD_MS;
  spawnParticles(spot.x, spot.y, "#5eead4", 16);
  if (msg.id === game.myId) {
    game.pendingMyDeath = false;
    $("respawn-overlay").classList.remove("visible");
    sfx.respawn();
  }
  updateAliveHud();
}

function matchOnPlayerLeft(msg) {
  const ent = game.players.get(msg.id);
  if (ent && !game.active) return;
  if (ent) game.players.delete(msg.id);
  if (game.spectateId === msg.id) game.spectateId = "";
  updateAliveHud();
}

function startSpectate() {
  $("respawn-text").textContent = "Elendin! Maçı izliyorsun...";
  $("respawn-overlay").classList.add("visible");
  const next = [...game.players.values()].find((p) => p.alive && p.id !== game.myId);
  game.spectateId = next?.id || "";
}

function matchOnEnd(msg) {
  if (!game.active || game.ended) return;
  game.ended = true;
  game.pendingMyDeath = false;
  $("respawn-overlay").classList.remove("visible");

  const m = me();
  let won = false;
  let draw = false;
  let title = "";
  let detail = "";
  if (msg.aborted) {
    title = "Maç Durduruldu";
    detail = "Kurucu maçı bitirdi.";
  } else if (msg.mode === "team" || game.mode === "team") {
    if (!msg.winnerTeam) {
      draw = true;
      title = "Berabere!";
      detail = "İki takım da ayakta kalamadı.";
    } else {
      won = m && m.team === msg.winnerTeam;
      title = won ? "TAKIMIN KAZANDI!" : "Takımın Kaybetti";
      detail = `${msg.winnerTeam} Takımı arenaya hükmetti.`;
    }
  } else {
    won = msg.winner === game.myId;
    title = won ? "KAZANDIN!" : "Kaybettin";
    detail = msg.winnerName ? `${msg.winnerName} sona kalan oldu.` : "Kimse sağ kalamadı.";
  }

  const coinParts = [["Katılım", 20], [`Av x${game.kills}`, game.kills * 40]];
  if (won) coinParts.push(["Galibiyet", 200]);
  if (draw) coinParts.push(["Beraberlik", 60]);
  const total = coinParts.reduce((s, [, v]) => s + v, 0);
  save.coins += total;
  persist();

  $("end-title").textContent = title;
  $("end-title").classList.toggle("lose", !won && !draw && !msg.aborted);
  $("end-detail").textContent = detail;
  $("end-coins").innerHTML =
    coinParts.filter(([, v]) => v > 0).map(([k, v]) => `<div>${k}: 🪙${v}</div>`).join("") +
    `<div><b>Toplam: 🪙${total}</b></div>`;
  $("match-end").classList.add("visible");
  if (won) sfx.win(); else if (!draw) sfx.lose();
  renderMenu();
}

function quitMatch(sendLeave = true) {
  game.active = false;
  game.players.clear();
  dispose3D();
  if (sendLeave) {
    netSend({ type: "leave" });
    net.code = "";
    if (net.ws) try { net.ws.close(); } catch { /* yoksay */ }
    net.ws = null;
    showScreen("menu");
  }
}

$("btn-quit-match").onclick = () => { quitMatch(true); };
$("btn-end-lobby").onclick = () => {
  game.active = false;
  game.players.clear();
  dispose3D();
  $("match-end").classList.remove("visible");
  showScreen("lobby");
};

// ================== HUD ==================
function updateLivesHud() {
  $("lives-a").textContent = game.lives.A;
  $("lives-b").textContent = game.lives.B;
}

function updateAliveHud() {
  const alive = [...game.players.values()].filter((p) => p.alive).length;
  $("hud-alive").textContent = `🧍 ${alive}`;
}

// ================== Maç döngüsü ==================
function matchLoop(now) {
  if (!game.active) return;
  const dt = Math.min(0.05, (now - game.lastFrame) / 1000);
  game.lastFrame = now;

  const m = me();

  // --- Hareket + nişan ---
  if (m && m.alive && !game.ended) {
    // Nişan once: hareket kamera yonune gore
    if (game.touchMode) {
      let best = null;
      let bestD = 700;
      for (const ent of game.players.values()) {
        if (!isEnemy(ent) || !ent.alive || now < ent.shieldUntil) continue;
        const d = Math.hypot(ent.rx - m.x, ent.ry - m.y);
        if (d < bestD && losClear(m.x, m.y, ent.rx, ent.ry)) {
          best = ent;
          bestD = d;
        }
      }
      if (best) m.a = Math.atan2(best.ry - m.y, best.rx - m.x);
      game.mouse.yaw = 0;
    } else {
      m.a += game.mouse.yaw;
      game.mouse.yaw = 0;
    }

    let fwd = 0;
    let str = 0;
    if (game.keys.KeyW || game.keys.ArrowUp) fwd += 1;
    if (game.keys.KeyS || game.keys.ArrowDown) fwd -= 1;
    if (game.keys.KeyD || game.keys.ArrowRight) str += 1;
    if (game.keys.KeyA || game.keys.ArrowLeft) str -= 1;
    if (fwd || str) {
      const dxA = Math.cos(m.a);
      const dyA = Math.sin(m.a);
      const dxR = -Math.sin(m.a);
      const dyR = Math.cos(m.a);
      let vx = dxA * fwd + dxR * str;
      let vy = dyA * fwd + dyR * str;
      const len = Math.hypot(vx, vy);
      vx = (vx / len) * PLAYER_SPEED * dt;
      vy = (vy / len) * PLAYER_SPEED * dt;
      if (!circleHitsWalls(game.walls, m.x + vx, m.y, PLAYER_R)) m.x += vx;
      if (!circleHitsWalls(game.walls, m.x, m.y + vy, PLAYER_R)) m.y += vy;
      m.x = Math.max(PLAYER_R, Math.min(WORLD.w - PLAYER_R, m.x));
      m.y = Math.max(PLAYER_R, Math.min(WORLD.h - PLAYER_R, m.y));
    }

    // --- Konum gönder ---
    if (now - game.lastPosAt > 60) {
      game.lastPosAt = now;
      netSend({ type: "pos", x: Math.round(m.x), y: Math.round(m.y), a: Math.round(m.a * 100) / 100 });
    }

    // --- Ateş ---
    if ((game.mouse.down || game.keys.Space) && now - game.lastFireAt > FIRE_INTERVAL) {
      game.lastFireAt = now;
      fireRay(m);
    }

    m.rx = m.x;
    m.ry = m.y;
    m.ra = m.a;
  }

  // Uzaktaki oyuncuları yumuşat
  for (const ent of game.players.values()) {
    if (ent.id === game.myId) continue;
    ent.rx += (ent.x - ent.rx) * Math.min(1, dt * 14);
    ent.ry += (ent.y - ent.ry) * Math.min(1, dt * 14);
    ent.ra = ent.a;
  }

  // Respawn geri sayımı
  if ($("respawn-overlay").classList.contains("visible") && game.respawnAt > now) {
    const left = Math.ceil((game.respawnAt - now) / 1000);
    $("respawn-text").textContent = `Yeniden doğuyorsun... ${left}`;
  }

  render3D(now, dt);
  requestAnimationFrame(matchLoop);
}

// ================== 3D Sahne ==================
function bMat(color, emissive = 0) {
  const key = color + "|" + emissive;
  if (bMatCache.has(key)) return bMatCache.get(key);
  const mat = new BABYLON.StandardMaterial("m" + key, bScene);
  const c = BABYLON.Color3.FromHexString(color);
  mat.diffuseColor = c;
  mat.emissiveColor = c.scale(emissive);
  mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.08);
  bMatCache.set(key, mat);
  return mat;
}

function makeTextPlane(name, width, height, draw) {
  const tex = new BABYLON.DynamicTexture("dt_" + name, { width: 256, height: 96 }, bScene, true);
  tex.hasAlpha = true;
  const mat = new BABYLON.StandardMaterial("mt_" + name, bScene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  const plane = BABYLON.MeshBuilder.CreatePlane("pl_" + name, { width, height }, bScene);
  plane.material = mat;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  draw(tex);
  return { plane, tex };
}

function drawPlayerLabel(ent) {
  const rec = bMeshes.get(ent.id);
  if (!rec) return;
  const tex = rec.labelTex;
  const ctx2 = tex.getContext();
  ctx2.clearRect(0, 0, 256, 96);
  ctx2.font = "bold 30px sans-serif";
  ctx2.textAlign = "center";
  ctx2.fillStyle = "rgba(0,0,0,0.55)";
  ctx2.fillText(ent.name, 129, 35);
  ctx2.fillStyle = ent.id === game.myId ? "#5eead4" : (game.mode === "team" ? teamColor(ent.team) || "#fff" : "#fff");
  ctx2.fillText(ent.name, 128, 34);
  ctx2.fillStyle = "rgba(0,0,0,0.6)";
  ctx2.fillRect(48, 52, 160, 16);
  ctx2.fillStyle = ent.hp > 40 ? "#5eead4" : "#ff5b6e";
  ctx2.fillRect(50, 54, 156 * Math.max(0, ent.hp) / 100, 12);
  tex.update();
}

function buildHumanMesh(ent) {
  const def = CHARACTERS[ent.char] || CHARACTERS[0];
  const mainColor = game.mode === "team" ? teamColor(ent.team) || def.color : def.color;
  const dark = shadeColor(def.color, -60);
  const root = new BABYLON.TransformNode("p_" + ent.id, bScene);

  const legL = BABYLON.MeshBuilder.CreateBox("ll", { width: 0.2, height: 0.5, depth: 0.22 }, bScene);
  legL.material = bMat(dark);
  legL.position.set(-0.13, 0.25, 0);
  legL.parent = root;
  const legR = legL.clone("lr");
  legR.position.x = 0.13;
  legR.parent = root;

  const torso = BABYLON.MeshBuilder.CreateBox("t", { width: 0.56, height: 0.62, depth: 0.32 }, bScene);
  torso.material = bMat(mainColor);
  torso.position.set(0, 0.81, 0);
  torso.parent = root;

  const head = BABYLON.MeshBuilder.CreateBox("h", { width: 0.36, height: 0.36, depth: 0.36 }, bScene);
  head.material = bMat("#e8b98a");
  head.position.set(0, 1.33, 0);
  head.parent = root;

  const visor = BABYLON.MeshBuilder.CreateBox("v", { width: 0.28, height: 0.1, depth: 0.06 }, bScene);
  visor.material = bMat("#10162a", 0.4);
  visor.position.set(0, 1.36, 0.18);
  visor.parent = root;

  const armL = BABYLON.MeshBuilder.CreateBox("al", { width: 0.15, height: 0.5, depth: 0.15 }, bScene);
  armL.material = bMat(dark);
  armL.position.set(-0.37, 0.85, 0);
  armL.parent = root;
  const armR = armL.clone("ar");
  armR.position.x = 0.37;
  armR.parent = root;

  const gun = BABYLON.MeshBuilder.CreateBox("g", { width: 0.09, height: 0.09, depth: 0.6 }, bScene);
  gun.material = bMat("#1c2333");
  gun.position.set(0.37, 0.92, 0.32);
  gun.parent = root;
  const tip = BABYLON.MeshBuilder.CreateBox("gt", { width: 0.11, height: 0.11, depth: 0.1 }, bScene);
  tip.material = bMat(def.color, 0.9);
  tip.position.set(0.37, 0.92, 0.62);
  tip.parent = root;

  const { plane: label, tex: labelTex } = makeTextPlane("n_" + ent.id, 1.9, 0.7, () => {});
  label.position.set(0, 2.05, 0);
  label.parent = root;

  const shield = BABYLON.MeshBuilder.CreateSphere("s", { diameter: 2.1, segments: 8 }, bScene);
  const shieldMat = new BABYLON.StandardMaterial("sm", bScene);
  shieldMat.emissiveColor = BABYLON.Color3.FromHexString("#5eead4");
  shieldMat.alpha = 0.22;
  shield.material = shieldMat;
  shield.position.set(0, 0.95, 0);
  shield.parent = root;

  bMeshes.set(ent.id, { root, legL, legR, armL, armR, label, labelTex, shield, bob: 0, lastX: ent.rx, lastZ: ent.ry });
  drawPlayerLabel(ent);
}

function spawnBeam3D(beam) {
  const x1 = beam.x1 * S3D;
  const z1 = beam.y1 * S3D;
  const x2 = beam.x2 * S3D;
  const z2 = beam.y2 * S3D;
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.05) return;
  const angleY = Math.atan2(x2 - x1, z2 - z1);
  const outer = BABYLON.MeshBuilder.CreateBox("bm", { width: 0.14, height: 0.14, depth: len }, bScene);
  outer.material = bMat(beam.color, 0.9);
  outer.position.set((x1 + x2) / 2, 1.02, (z1 + z2) / 2);
  outer.rotation.y = angleY;
  const inner = BABYLON.MeshBuilder.CreateBox("bi", { width: 0.05, height: 0.05, depth: len }, bScene);
  inner.material = bMat("#ffffff", 1);
  inner.position.copyFrom(outer.position);
  inner.rotation.y = angleY;
  beam.mesh3d = [outer, inner];
}

function spawnParticleMesh(p) {
  const mesh = BABYLON.MeshBuilder.CreateBox("pt", { size: p.size * 0.05 }, bScene);
  mesh.material = bMat(p.color, 0.8);
  p.h = 0.5 + Math.random() * 0.9;
  p.vh = 0.5 + Math.random() * 1.5;
  mesh.position.set(p.x * S3D, p.h, p.y * S3D);
  p.mesh3d = mesh;
}

function init3D() {
  if (typeof BABYLON === "undefined") {
    setTimeout(init3D, 250);
    return;
  }
  dispose3D();
  const c = canvas();
  bEngine = new BABYLON.Engine(c, true, { stencil: false });
  bScene = new BABYLON.Scene(bEngine);
  bScene.clearColor = new BABYLON.Color4(0.02, 0.03, 0.07, 1);
  bScene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  bScene.fogDensity = 0.01;
  bScene.fogColor = new BABYLON.Color3(0.02, 0.03, 0.07);

  bCamera = new BABYLON.FreeCamera("cam", new BABYLON.Vector3(0, 4, -5), bScene);

  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), bScene);
  hemi.intensity = 1.1;
  hemi.groundColor = new BABYLON.Color3(0.25, 0.3, 0.48);
  const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.4, -1, 0.3), bScene);
  dir.intensity = 0.65;

  // Zemin
  const ground = BABYLON.MeshBuilder.CreateGround("gr", { width: WORLD.w * S3D, height: WORLD.h * S3D }, bScene);
  ground.material = bMat("#121a30");
  ground.position.set(WORLD.w * S3D / 2, 0, WORLD.h * S3D / 2);

  // Duvarlar
  for (const wl of game.walls) {
    const box = BABYLON.MeshBuilder.CreateBox("w", { width: wl.w * S3D, height: WALL_H, depth: wl.h * S3D }, bScene);
    box.material = bMat("#1d2642");
    box.position.set((wl.x + wl.w / 2) * S3D, WALL_H / 2, (wl.y + wl.h / 2) * S3D);
    const strip = BABYLON.MeshBuilder.CreateBox("ws", { width: wl.w * S3D, height: 0.06, depth: wl.h * S3D }, bScene);
    strip.material = bMat("#7c9eff", 0.7);
    strip.position.set(box.position.x, WALL_H + 0.03, box.position.z);
  }

  // Üs bölgeleri (takım modu)
  if (game.mode === "team") {
    for (const team of ["A", "B"]) {
      const spot = teamSpawn(team, 0);
      const color = teamColor(team);
      const disc = BABYLON.MeshBuilder.CreateDisc("d_" + team, { radius: 150 * S3D, tessellation: 40 }, bScene);
      const dm = new BABYLON.StandardMaterial("dm_" + team, bScene);
      dm.emissiveColor = BABYLON.Color3.FromHexString(color);
      dm.alpha = 0.3;
      disc.material = dm;
      disc.rotation.x = Math.PI / 2;
      disc.position.set(spot.x * S3D, 0.02, spot.y * S3D);
      const { plane: tag, tex } = makeTextPlane("tag_" + team, 1.5, 0.56, (t) => {
        t.drawText(team + " ÜSSÜ", null, 62, "bold 40px sans-serif", color, "transparent", true);
      });
      tag.position.set(spot.x * S3D, 4.6, spot.y * S3D);
    }
  }

  // Oyuncular
  for (const ent of game.players.values()) buildHumanMesh(ent);

  $("lock-hint").classList.toggle("visible", !game.touchMode && !bPointerLocked);
  bEngine.resize();
}

function dispose3D() {
  bMeshes.clear();
  bMatCache.clear();
  if (bEngine) {
    try { bEngine.dispose(); } catch { /* yoksay */ }
  }
  bEngine = null;
  bScene = null;
  bCamera = null;
  if (document.pointerLockElement) document.exitPointerLock?.();
}

function render3D(now, dt) {
  if (!bScene || !bEngine) return;
  const m = me();

  // Oyuncu kuklalarini guncelle
  for (const ent of game.players.values()) {
    const rec = bMeshes.get(ent.id);
    if (!rec) continue;
    rec.root.setEnabled(ent.alive && ent.id !== game.myId);
    if (!ent.alive) continue;
    rec.root.position.set(ent.rx * S3D, 0, ent.ry * S3D);
    rec.root.rotation.y = Math.PI / 2 - (ent.ra || 0);
    rec.shield.setEnabled(now < ent.shieldUntil);

    // Yurume animasyonu
    const dx = ent.rx * S3D - rec.lastX;
    const dz = ent.ry * S3D - rec.lastZ;
    const speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);
    rec.lastX = ent.rx * S3D;
    rec.lastZ = ent.ry * S3D;
    if (speed > 0.3) rec.bob += dt * 9;
    const swing = speed > 0.3 ? Math.sin(rec.bob) * 0.55 : 0;
    rec.legL.rotation.x = swing;
    rec.legR.rotation.x = -swing;
    rec.armL.rotation.x = -swing * 0.7;
    rec.armR.rotation.x = swing * 0.7;
  }

  // Isinlar
  for (const beam of game.beams) {
    if (!beam.mesh3d) spawnBeam3D(beam);
    if (beam.mesh3d) {
      const alpha = Math.max(0, (beam.until - now) / 130);
      for (const mesh of beam.mesh3d) mesh.visibility = alpha;
    }
  }
  for (const beam of game.beams) {
    if (now > beam.until && beam.mesh3d) {
      for (const mesh of beam.mesh3d) mesh.dispose();
      beam.mesh3d = null;
    }
  }
  game.beams = game.beams.filter((b) => now <= b.until);

  // Parcaciklar
  for (const p of game.particles) {
    if (!p.mesh3d) spawnParticleMesh(p);
    p.x += p.vx * 0.016;
    p.y += p.vy * 0.016;
    p.h += p.vh * 0.016;
    p.vh -= 3 * 0.016;
    p.mesh3d.position.set(p.x * S3D, Math.max(0.05, p.h), p.y * S3D);
    p.mesh3d.visibility = Math.max(0, (p.until - now) / 500);
  }
  for (const p of game.particles) {
    if (now > p.until && p.mesh3d) {
      p.mesh3d.dispose();
      p.mesh3d = null;
    }
  }
  game.particles = game.particles.filter((p) => now <= p.until);

  // Kamera: canliysam kendi gozumden, elendiysem izledigimin arkasindan
  let target = m;
  if ((!target || !target.alive) && game.spectateId) {
    target = game.players.get(game.spectateId) || target;
  }
  if (!target || !target.alive) {
    target = [...game.players.values()].find((p) => p.alive) || target;
  }
  if (target) {
    const a = target.ra || 0;
    const px = target.rx * S3D;
    const pz = target.ry * S3D;
    if (target.id === game.myId && target.alive) {
      bCamera.position.set(px, 1.55, pz);
      bCamera.setTarget(new BABYLON.Vector3(
        px + Math.cos(a) * 3,
        1.55 - game.mouse.pitch * 2.5,
        pz + Math.sin(a) * 3
      ));
    } else {
      const cx = px - Math.cos(a) * 4.8;
      const cz = pz - Math.sin(a) * 4.8;
      bCamera.position.x += (cx - bCamera.position.x) * Math.min(1, dt * 10);
      bCamera.position.y += (3.2 - bCamera.position.y) * Math.min(1, dt * 10);
      bCamera.position.z += (cz - bCamera.position.z) * Math.min(1, dt * 10);
      bCamera.setTarget(new BABYLON.Vector3(px + Math.cos(a) * 3, 1.1, pz + Math.sin(a) * 3));
    }
  }

  // Hasar flasi + HUD
  $("damage-flash").style.opacity = now - game.hurtFlashAt < 160 ? "1" : "0";
  if (m) {
    $("hp-fill").style.width = Math.max(0, m.hp) + "%";
    $("hud-name").textContent = m.name + (game.mode === "team" ? ` · ${m.team} Takımı` : "");
  }

  bScene.render();
}

// ================== Başlat ==================
renderMenu();
