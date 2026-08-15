"use strict";

// ---------------------------------------------------------------------------
// Hakorocks Şehri (yaris-sehri) — çok oyunculu araba oyunu istemcisi
// Modlar: Açık Dünya, Dereceli Yarış, Tek Mod (akrobasi), Öğretici
// Sunucu yoksa açık dünya tek kişilik + botlarla çalışır.
// ---------------------------------------------------------------------------

const CITY_SIZE = 3000;
const ROAD_STEP = 300;
const ROAD_HALF = 45;
const CAR_RADIUS = 14;
const CP_RADIUS = 85;

const COLORS = ["#ff5b6e", "#4ea3ff", "#69d18b", "#ffd166", "#b67dff", "#ff9f43", "#34d1bf", "#ff8fd6", "#e8eef6"];

// Araba kataloğu (server.mjs'deki YARIS_CARS ile aynı — fiyat doğrulaması sunucuda)
const CARS = [
  { id: "minik", name: "Minik", price: 0, maxSpeed: 400, accel: 280, grip: 2.4, color: "#4ea3ff", desc: "Şehirde başlamak için birebir." },
  { id: "serit", name: "Şerit", price: 80, maxSpeed: 440, accel: 310, grip: 2.55, color: "#69d18b", desc: "Biraz daha hızlı, biraz daha kıvrak." },
  { id: "pars", name: "Pars", price: 160, maxSpeed: 480, accel: 340, grip: 2.7, color: "#ff9f43", desc: "Virajlarda güven verir." },
  { id: "seytan", name: "Şeytan", price: 280, maxSpeed: 520, accel: 375, grip: 2.85, color: "#ff5b6e", desc: "Kırmızı yıldırım." },
  { id: "firtina", name: "Fırtına", price: 430, maxSpeed: 565, accel: 415, grip: 3.0, color: "#b67dff", desc: "Fırtına gibi eser." },
  { id: "efsane", name: "Efsane", price: 650, maxSpeed: 610, accel: 455, grip: 3.2, color: "#ffd166", desc: "Şehrin en hızlı efsanesi!" },
];

const LOCAL_RACE_ROUTE = [
  { x: 300, y: 300 },
  { x: 1500, y: 300 },
  { x: 2700, y: 300 },
  { x: 2700, y: 1500 },
  { x: 2700, y: 2700 },
  { x: 1500, y: 2700 },
  { x: 300, y: 2700 },
  { x: 300, y: 1500 },
];
const LOCAL_TT_ROUTE = [
  { x: 1500, y: 2700 },
  { x: 2100, y: 2700 },
  { x: 2700, y: 2700 },
  { x: 2700, y: 2100 },
  { x: 2100, y: 2100 },
  { x: 1500, y: 2100 },
];
const LOCAL_ZONES = {
  race: { x: 120, y: 120, w: 360, h: 360 },
  tt: { x: 1320, y: 2520, w: 360, h: 360 },
};

const MAPS = {
  city: { w: CITY_SIZE, h: CITY_SIZE, spawn: { x: 1500, y: 1500, angle: -Math.PI / 2 } },
  stunt: { w: 2400, h: 1600, spawn: { x: 200, y: 800, angle: 0 } },
  tutorial: { w: 1400, h: 900, spawn: { x: 200, y: 200, angle: 0 } },
};

// Tek Mod akrobasi haritası: rampalar ve halkalar
const STUNT_RAMPS = [
  { x: 500, y: 400, w: 80, h: 70, until: 0 },
  { x: 500, y: 1100, w: 80, h: 70, until: 0 },
  { x: 1300, y: 750, w: 80, h: 70, until: 0 },
  { x: 1900, y: 300, w: 80, h: 70, until: 0 },
  { x: 1900, y: 1250, w: 80, h: 70, until: 0 },
];
const STUNT_RINGS = [
  { x: 800, y: 435, r: 60, until: 0 },
  { x: 800, y: 1135, r: 60, until: 0 },
  { x: 1600, y: 785, r: 60, until: 0 },
  { x: 2150, y: 335, r: 60, until: 0 },
  { x: 2150, y: 1285, r: 60, until: 0 },
];

// Öğretici haritası
const TUT_CHECKPOINT = { x: 900, y: 250, r: 70 };
const TUT_RAMP = { x: 1080, y: 480, w: 80, h: 70, until: 0 };
const TUT_FINISH = { x: 450, y: 700, r: 70 };

const SESSION_KEY = "hakorocks-session-id";
const TOKEN_KEY = "hakorocks-auth-token";
const NICK_KEY = "yaris-sehri-nickname";
const GUEST_PROFILE_KEY = "yaris-sehri-guest-profile-v1";
const TT_LOCAL_KEY = "yaris-sehri-tt-scores";

// ---------------------------------------------------------------------------
// Şehir haritası üretimi (sabit tohumlu — her istemcide aynı)
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rectsOverlap(a, b, pad = 0) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function buildCityMap() {
  const rng = mulberry32(20260815);
  const buildings = [];
  const parks = [];
  const blockSize = ROAD_STEP - ROAD_HALF * 2 - 20;
  for (let bi = 0; bi < 9; bi += 1) {
    for (let bj = 0; bj < 9; bj += 1) {
      const x0 = bi * ROAD_STEP + ROAD_HALF + 10;
      const y0 = bj * ROAD_STEP + ROAD_HALF + 10;
      const block = { x: x0, y: y0, w: blockSize, h: blockSize };
      if (rectsOverlap(block, LOCAL_ZONES.race, 40) || rectsOverlap(block, LOCAL_ZONES.tt, 40)) continue;
      if (rng() < 0.26) {
        const trees = [];
        const treeCount = 5 + Math.floor(rng() * 5);
        for (let t = 0; t < treeCount; t += 1) {
          trees.push({
            x: x0 + 20 + rng() * (blockSize - 40),
            y: y0 + 20 + rng() * (blockSize - 40),
            r: 9 + rng() * 9,
          });
        }
        parks.push({ x: x0, y: y0, w: blockSize, h: blockSize, trees });
        continue;
      }
      const cell = blockSize / 2;
      for (let ci = 0; ci < 2; ci += 1) {
        for (let cj = 0; cj < 2; cj += 1) {
          if (rng() < 0.16) continue;
          buildings.push({
            x: x0 + ci * cell + 8 + rng() * 12,
            y: y0 + cj * cell + 8 + rng() * 12,
            w: cell - 24 - rng() * 18,
            h: cell - 24 - rng() * 18,
            shade: rng(),
          });
        }
      }
    }
  }
  return { buildings, parks };
}

const cityMap = buildCityMap();

// ---------------------------------------------------------------------------
// Durum
// ---------------------------------------------------------------------------

function defaultProfile() {
  return { gold: 0, cars: ["minik"], selectedCar: "minik", rating: 100, tutorialDone: false, ttBestMs: 0, stuntBest: 0 };
}

const state = {
  screen: "splash", // splash | menu | modes | gallery | game
  mode: "", // open | ranked | stunt | tutorial
  map: "city",
  online: false,
  joined: false,
  ranked: false,
  selfId: "",
  worldId: "",
  partyCode: "",
  nickname: localStorage.getItem(NICK_KEY) || "",
  profile: defaultProfile(),
  routes: { race: LOCAL_RACE_ROUTE, tt: LOCAL_TT_ROUTE },
  zones: LOCAL_ZONES,
  remotes: new Map(),
  bots: [],
  joinMode: "public",
  joinCode: "",
  reconnectTimer: null,
  raceJoinSent: false,
  raceRewardApplied: false,
  queueStartedAt: 0,
};

const car = {
  x: 1500,
  y: 1500,
  angle: -Math.PI / 2,
  speed: 0,
  air: 0,
  airTime: 0,
  airDist: 0,
  vx: 0,
  vy: 0,
};

const race = {
  phase: "idle",
  lobby: [],
  lobbyDeadline: 0,
  startsAt: 0,
  endsAt: 0,
  progress: [],
  results: [],
  nextCp: 1,
  finished: false,
  startedAt: 0,
};

const tt = {
  running: false,
  next: 0,
  startAt: 0,
  scores: loadLocalTtScores(),
  cooldownUntil: 0,
  lastTime: 0,
};

const stunt = {
  score: 0,
  lastFlush: 0,
};

const tutorial = {
  step: 0, // 0: sürüş, 1: checkpoint, 2: rampa, 3: bitiş
  done: false,
};

const input = { gas: false, brake: false, left: false, right: false };
const cam = { x: 0, y: 0 };

let socket = null;
let account = null;

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const hud = document.querySelector("#hud");
const hudStatus = document.querySelector("#hud-status");
const hudPlayers = document.querySelector("#hud-players");
const hudParty = document.querySelector("#hud-party");
const hudGold = document.querySelector("#hud-gold");
const hudEvent = document.querySelector("#hud-event");
const hudSpeed = document.querySelector("#hud-speed");
const banner = document.querySelector("#banner");
const racePanel = document.querySelector("#racePanel");
const raceInfo = document.querySelector("#raceInfo");
const raceLobbyList = document.querySelector("#raceLobbyList");
const raceLeaveBtn = document.querySelector("#raceLeaveBtn");
const ttPanel = document.querySelector("#ttPanel");
const ttInfo = document.querySelector("#ttInfo");
const ttScoresEl = document.querySelector("#ttScores");
const resultsPanel = document.querySelector("#resultsPanel");
const raceResults = document.querySelector("#raceResults");
const raceReward = document.querySelector("#raceReward");
const tutorialPanel = document.querySelector("#tutorialPanel");
const tutorialStepEl = document.querySelector("#tutorialStep");
const tutorialDots = document.querySelector("#tutorialDots");
const stuntPanel = document.querySelector("#stuntPanel");
const stuntScoreEl = document.querySelector("#stuntScore");
const stuntBestEl = document.querySelector("#stuntBest");
const countdownEl = document.querySelector("#countdown");
const scorePop = document.querySelector("#scorePop");
const touchControls = document.querySelector("#touchControls");
const menuError = document.querySelector("#menuError");

const screens = {
  splash: document.querySelector("#splash"),
  menu: document.querySelector("#menu"),
  modes: document.querySelector("#modeSelect"),
  gallery: document.querySelector("#galleryScreen"),
  tutorialDone: document.querySelector("#tutorialDoneScreen"),
};

function showScreen(name) {
  state.screen = name;
  for (const [key, el] of Object.entries(screens)) {
    el.hidden = key !== name;
  }
  hud.hidden = name !== "game";
  if (name === "game") {
    if (matchMedia("(pointer: coarse)").matches || "ontouchstart" in window) {
      touchControls.hidden = false;
    }
  } else {
    touchControls.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSessionId() {
  const current = localStorage.getItem(SESSION_KEY);
  if (current) return current;
  const next = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(SESSION_KEY, next);
  return next;
}

const sessionId = getSessionId();

function formatTime(ms) {
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = (total % 60).toFixed(1).padStart(4, "0");
  return minutes > 0 ? `${minutes}:${seconds}` : `${seconds} sn`;
}

function inZone(x, y, zone, pad = 0) {
  return x >= zone.x - pad && x <= zone.x + zone.w + pad && y >= zone.y - pad && y <= zone.y + zone.h + pad;
}

function currentMapSize() {
  return MAPS[state.map] || MAPS.city;
}

function onRoad(x, y) {
  if (state.map !== "city") return true; // akrobasi/öğretici haritası düz zemin
  const mx = ((x % ROAD_STEP) + ROAD_STEP) % ROAD_STEP;
  const my = ((y % ROAD_STEP) + ROAD_STEP) % ROAD_STEP;
  const near = (m) => m <= ROAD_HALF + 6 || m >= ROAD_STEP - ROAD_HALF - 6;
  if (near(mx) || near(my)) return true;
  return inZone(x, y, state.zones.race, 24) || inZone(x, y, state.zones.tt, 24);
}

function hitBuilding(nx, ny) {
  if (state.map !== "city") return null;
  for (const b of cityMap.buildings) {
    if (nx > b.x - CAR_RADIUS && nx < b.x + b.w + CAR_RADIUS && ny > b.y - CAR_RADIUS && ny < b.y + b.h + CAR_RADIUS) {
      return b;
    }
  }
  return null;
}

function loadLocalTtScores() {
  try {
    const list = JSON.parse(localStorage.getItem(TT_LOCAL_KEY) || "[]");
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveLocalTtScore(nickname, timeMs) {
  tt.scores = [...tt.scores, { nickname, timeMs }]
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, 5);
  try {
    localStorage.setItem(TT_LOCAL_KEY, JSON.stringify(tt.scores));
  } catch {}
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function carStats() {
  return CARS.find((item) => item.id === state.profile.selectedCar) || CARS[0];
}

// ---------------------------------------------------------------------------
// Profil: hesap (sunucu) veya misafir (localStorage)
// ---------------------------------------------------------------------------

function normalizeProfile(value) {
  const base = defaultProfile();
  if (!value || typeof value !== "object") return base;
  const cars = Array.isArray(value.cars) ? value.cars.filter((id) => CARS.some((c) => c.id === id)) : [];
  if (!cars.includes("minik")) cars.unshift("minik");
  return {
    gold: clamp(Math.floor(Number(value.gold) || 0), 0, 1000000),
    cars: [...new Set(cars)],
    selectedCar: cars.includes(value.selectedCar) ? value.selectedCar : "minik",
    rating: clamp(Math.floor(Number(value.rating) || 100), 0, 100000),
    tutorialDone: Boolean(value.tutorialDone),
    ttBestMs: Math.floor(Number(value.ttBestMs) || 0),
    stuntBest: Math.floor(Number(value.stuntBest) || 0),
  };
}

function applyProfile(profile) {
  if (!profile) return;
  state.profile = normalizeProfile(profile);
  refreshGoldDisplays();
}

function refreshGoldDisplays() {
  hudGold.textContent = `🪙 ${state.profile.gold}`;
  document.querySelector("#modeGold").textContent = `🪙 ${state.profile.gold}`;
  document.querySelector("#galleryGold").textContent = `🪙 ${state.profile.gold}`;
  document.querySelector("#modeRating").textContent = `Puan: ${state.profile.rating}`;
  const stats = carStats();
  document.querySelector("#modeCar").textContent = `Araba: ${stats.name}`;
}

function loadGuestProfile() {
  try {
    applyProfile(JSON.parse(localStorage.getItem(GUEST_PROFILE_KEY) || "null"));
  } catch {}
}

function saveGuestProfile() {
  try {
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(state.profile));
  } catch {}
}

async function fetchProfile() {
  if (!account) {
    loadGuestProfile();
    return;
  }
  try {
    const authToken = localStorage.getItem(TOKEN_KEY) || "";
    const response = await fetch(`/api/yaris-sehri/profile?sessionId=${encodeURIComponent(sessionId)}&authToken=${encodeURIComponent(authToken)}`);
    if (!response.ok) throw new Error("profile");
    const data = await response.json();
    applyProfile(data.profile);
  } catch {
    showBanner("Profil yüklenemedi — çevrimdışı görünüyorsun.");
    setTimeout(() => showBanner(""), 3000);
  }
}

async function postProfileAction(path, body) {
  if (!account) return null;
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, authToken: localStorage.getItem(TOKEN_KEY) || "", ...body }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.message || "İşlem başarısız." };
    }
    if (data.profile) applyProfile(data.profile);
    return data;
  } catch {
    return { error: "Sunucuya ulaşılamadı." };
  }
}

// ---------------------------------------------------------------------------
// Giriş akışı: resume -> kayıt/giriş -> misafir
// ---------------------------------------------------------------------------

async function tryResume() {
  const authToken = localStorage.getItem(TOKEN_KEY);
  if (!authToken || location.protocol === "file:") return false;
  try {
    const response = await fetch("/api/auth/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, authToken }),
    });
    if (!response.ok) return false;
    const data = await response.json();
    if (!data.account) return false;
    account = data.account;
    if (data.authToken) localStorage.setItem(TOKEN_KEY, data.authToken);
    state.nickname = account.nickname || state.nickname;
    return true;
  } catch {
    return false;
  }
}

async function submitAuth(path, body) {
  const authError = document.querySelector("#authError");
  authError.textContent = "";
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...body }),
    });
    const data = await response.json();
    if (!response.ok) {
      authError.textContent = data.message || "İşlem başarısız.";
      return false;
    }
    account = data.account;
    if (data.authToken) localStorage.setItem(TOKEN_KEY, data.authToken);
    state.nickname = account.nickname || state.nickname;
    await fetchProfile();
    afterLogin();
    return true;
  } catch {
    authError.textContent = "Sunucuya ulaşılamadı. Misafir olarak devam edebilirsin.";
    return false;
  }
}

function bindAuthUI() {
  const showRegisterBtn = document.querySelector("#showRegisterBtn");
  const showLoginBtn = document.querySelector("#showLoginBtn");
  const showGuestBtn = document.querySelector("#showGuestBtn");
  const registerForm = document.querySelector("#registerForm");
  const loginForm = document.querySelector("#loginForm");
  const guestBox = document.querySelector("#guestBox");

  showRegisterBtn.addEventListener("click", () => {
    registerForm.hidden = false;
    loginForm.hidden = true;
    guestBox.hidden = true;
    showRegisterBtn.hidden = true;
    document.querySelector("#regName").focus();
  });
  showLoginBtn.addEventListener("click", () => {
    loginForm.hidden = false;
    registerForm.hidden = true;
    guestBox.hidden = true;
    showRegisterBtn.hidden = false;
    document.querySelector("#loginName").focus();
  });
  showGuestBtn.addEventListener("click", () => {
    guestBox.hidden = false;
    registerForm.hidden = true;
    loginForm.hidden = true;
    showRegisterBtn.hidden = false;
    document.querySelector("#guestNickname").value = state.nickname;
    document.querySelector("#guestNickname").focus();
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAuth("/api/auth/register", {
      name: document.querySelector("#regName").value.trim(),
      nickname: document.querySelector("#regNickname").value.trim(),
      password: document.querySelector("#regPassword").value,
    });
  });
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAuth("/api/auth/login", {
      name: document.querySelector("#loginName").value.trim(),
      password: document.querySelector("#loginPassword").value,
    });
  });
  document.querySelector("#guestSave").addEventListener("click", () => {
    const nick = document.querySelector("#guestNickname").value.trim().slice(0, 24);
    if (nick.length < 2) {
      document.querySelector("#authError").textContent = "Takma ad en az 2 karakter olmalı.";
      return;
    }
    state.nickname = nick;
    localStorage.setItem(NICK_KEY, nick);
    account = null;
    localStorage.removeItem(TOKEN_KEY);
    loadGuestProfile();
    afterLogin();
  });
}

function afterLogin() {
  updateModeSelect();
  if (!state.profile.tutorialDone) {
    startGame("tutorial");
    return;
  }
  showScreen("modes");
}

function updateModeSelect() {
  const name = account ? account.name : state.nickname;
  document.querySelector("#modeGreeting").textContent = `Hoş geldin, ${name}!`;
  document.querySelector("#guestWarning").hidden = Boolean(account);
  refreshGoldDisplays();
}

// ---------------------------------------------------------------------------
// Mod seçimi + galeri
// ---------------------------------------------------------------------------

function bindModeUI() {
  const openWorldBox = document.querySelector("#openWorldBox");
  const rankedBox = document.querySelector("#rankedBox");

  document.querySelector("#modeOpenBtn").addEventListener("click", () => {
    openWorldBox.hidden = !openWorldBox.hidden;
    rankedBox.hidden = true;
  });
  document.querySelector("#publicBtn").addEventListener("click", () => startGame("open", { joinMode: "public" }));
  document.querySelector("#partyCreateBtn").addEventListener("click", () => startGame("open", { joinMode: "party-create" }));
  document.querySelector("#partyJoinBtn").addEventListener("click", () => {
    const code = document.querySelector("#partyCodeInput").value.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      menuError.textContent = "Parti kodu 6 haneli olmalı.";
      return;
    }
    startGame("open", { joinMode: "party-join", joinCode: code });
  });

  document.querySelector("#modeRankedBtn").addEventListener("click", () => {
    menuError.textContent = "";
    if (location.protocol === "file:") {
      menuError.textContent = "Dereceli yarış için sunucu bağlantısı gerekli.";
      return;
    }
    openWorldBox.hidden = true;
    rankedBox.hidden = false;
    state.queueStartedAt = Date.now();
    document.querySelector("#rankedStatus").textContent = "Rakip aranıyor… (0 sn)";
    connectRanked();
  });
  document.querySelector("#rankedCancelBtn").addEventListener("click", () => {
    sendWs({ type: "ranked-leave" });
    try {
      socket?.close();
    } catch {}
    socket = null;
    rankedBox.hidden = true;
    document.querySelector("#rankedStatus").textContent = "Rakip aranıyor…";
  });

  document.querySelector("#modeStuntBtn").addEventListener("click", () => startGame("stunt"));
  document.querySelector("#galleryBtn").addEventListener("click", () => {
    renderGallery();
    showScreen("gallery");
  });
  document.querySelector("#galleryBackBtn").addEventListener("click", () => showScreen("modes"));
  document.querySelector("#tutorialReplayBtn").addEventListener("click", () => startGame("tutorial"));
  document.querySelector("#tutorialFinishBtn").addEventListener("click", () => {
    showScreen("modes");
    updateModeSelect();
  });

  document.querySelector("#menuExitBtn").addEventListener("click", () => exitToModes());
  raceLeaveBtn.addEventListener("click", () => {
    sendWs({ type: "race-leave" });
    racePanel.hidden = true;
  });

  // Kuyruk süresi göstergesi
  setInterval(() => {
    if (!rankedBox.hidden && state.queueStartedAt) {
      const secs = Math.floor((Date.now() - state.queueStartedAt) / 1000);
      document.querySelector("#rankedStatus").textContent = `Rakip aranıyor… (${secs} sn) · 20 sn dolarsa botlarla yarışırsın`;
    }
  }, 1000);
}

function renderGallery() {
  const grid = document.querySelector("#carGrid");
  const galleryError = document.querySelector("#galleryError");
  galleryError.textContent = "";
  refreshGoldDisplays();
  grid.innerHTML = "";
  for (const carItem of CARS) {
    const owned = state.profile.cars.includes(carItem.id);
    const selected = state.profile.selectedCar === carItem.id;
    const card = document.createElement("div");
    card.className = "car-card" + (selected ? " selected" : "");
    card.innerHTML = `
      <div class="car-name" style="color:${carItem.color}">${carItem.name}</div>
      <div class="stat-label">Hız</div><div class="stat-bar"><i style="width:${Math.round((carItem.maxSpeed / 610) * 100)}%"></i></div>
      <div class="stat-label">Kalkış</div><div class="stat-bar"><i style="width:${Math.round((carItem.accel / 455) * 100)}%"></i></div>
      <div class="stat-label">Yol Tutuş</div><div class="stat-bar"><i style="width:${Math.round((carItem.grip / 3.2) * 100)}%"></i></div>
      <div class="car-price">${owned ? "Garajında" : `🪙 ${carItem.price}`}</div>
    `;
    const btn = document.createElement("button");
    btn.type = "button";
    if (owned) {
      btn.textContent = selected ? "Seçili ✓" : "Bu Arabayı Seç";
      btn.disabled = selected;
      btn.addEventListener("click", () => selectCar(carItem.id));
    } else {
      btn.textContent = `Satın Al — 🪙${carItem.price}`;
      btn.disabled = state.profile.gold < carItem.price;
      btn.addEventListener("click", () => buyCar(carItem.id));
    }
    card.appendChild(btn);
    grid.appendChild(card);
  }
}

async function buyCar(carId) {
  const galleryError = document.querySelector("#galleryError");
  galleryError.textContent = "";
  if (account) {
    const result = await postProfileAction("/api/yaris-sehri/buy-car", { carId });
    if (result?.error) {
      galleryError.textContent = result.error;
      return;
    }
  } else {
    const carItem = CARS.find((item) => item.id === carId);
    if (!carItem || state.profile.gold < carItem.price || state.profile.cars.includes(carId)) return;
    state.profile.gold -= carItem.price;
    state.profile.cars.push(carId);
    state.profile.selectedCar = carId;
    saveGuestProfile();
  }
  renderGallery();
}

async function selectCar(carId) {
  if (account) {
    const result = await postProfileAction("/api/yaris-sehri/select-car", { carId });
    if (result?.error) {
      document.querySelector("#galleryError").textContent = result.error;
      return;
    }
  } else if (state.profile.cars.includes(carId)) {
    state.profile.selectedCar = carId;
    saveGuestProfile();
  }
  renderGallery();
}

// ---------------------------------------------------------------------------
// Mod başlatma / çıkış
// ---------------------------------------------------------------------------

function startGame(mode, opts = {}) {
  menuError.textContent = "";
  state.mode = mode;
  state.map = mode === "stunt" ? "stunt" : mode === "tutorial" ? "tutorial" : "city";
  const spawn = MAPS[state.map].spawn;
  car.x = spawn.x;
  car.y = spawn.y;
  car.angle = spawn.angle;
  car.speed = 0;
  car.air = 0;
  car.airDist = 0;
  resetRace();
  tt.running = false;
  tutorialPanel.hidden = true;
  stuntPanel.hidden = true;
  state.raceRewardApplied = false;

  if (mode === "tutorial") {
    tutorial.step = 0;
    tutorial.done = false;
    TUT_RAMP.until = 0;
    tutorialPanel.hidden = false;
    updateTutorialPanel();
    state.online = false;
    updateStatusDot();
  } else if (mode === "stunt") {
    stunt.score = 0;
    stunt.lastFlush = 0;
    for (const ramp of STUNT_RAMPS) ramp.until = 0;
    for (const ring of STUNT_RINGS) ring.until = 0;
    stuntPanel.hidden = false;
    stuntScoreEl.textContent = "0";
    stuntBestEl.textContent = String(state.profile.stuntBest);
    state.online = false;
    updateStatusDot();
  } else if (mode === "open") {
    state.joinMode = opts.joinMode || "public";
    state.joinCode = opts.joinCode || "";
    connectOpenWorld();
  }

  showScreen("game");
}

function exitToModes(note = "") {
  if (state.mode === "stunt") flushStuntScore(true);
  sendWs({ type: "leave" });
  sendWs({ type: "ranked-leave" });
  try {
    socket?.close();
  } catch {}
  socket = null;
  clearTimeout(state.reconnectTimer);
  state.online = false;
  state.joined = false;
  state.ranked = false;
  state.mode = "";
  state.remotes.clear();
  state.bots = [];
  resetRace();
  tt.running = false;
  tutorialPanel.hidden = true;
  stuntPanel.hidden = true;
  racePanel.hidden = true;
  ttPanel.hidden = true;
  resultsPanel.hidden = true;
  countdownEl.hidden = true;
  showBanner("");
  if (note) menuError.textContent = note;
  updateModeSelect();
  showScreen("modes");
}

// ---------------------------------------------------------------------------
// Ağ
// ---------------------------------------------------------------------------

function sendWs(payload) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function selectedCarColor() {
  return carStats().color;
}

function connectOpenWorld() {
  clearTimeout(state.reconnectTimer);
  if (location.protocol === "file:") {
    goOffline();
    return;
  }
  try {
    socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/yaris-sehri`);
  } catch {
    goOffline();
    return;
  }
  bindSocket({ purpose: "open" });
}

function connectRanked() {
  clearTimeout(state.reconnectTimer);
  try {
    socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/yaris-sehri`);
  } catch {
    menuError.textContent = "Sunucuya bağlanılamadı, dereceli şu an oynanamaz.";
    document.querySelector("#rankedBox").hidden = true;
    return;
  }
  bindSocket({ purpose: "ranked" });
}

function bindSocket({ purpose }) {
  let joinedOnce = false;
  socket.addEventListener("open", () => {
    if (purpose === "ranked") {
      sendWs({ type: "ranked-queue", sessionId, nickname: state.nickname, color: selectedCarColor() });
    } else {
      sendWs({
        type: "join",
        sessionId,
        nickname: state.nickname,
        color: selectedCarColor(),
        mode: state.joinMode,
        code: state.joinCode,
      });
    }
  });
  socket.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === "joined") joinedOnce = true;
    handleServerMessage(message);
  });
  const onLost = () => {
    if (state.screen !== "game" && purpose !== "ranked") return;
    if (purpose === "ranked" && !joinedOnce) {
      document.querySelector("#rankedBox").hidden = true;
      menuError.textContent = "Sunucuya bağlanılamadı, dereceli şu an oynanamaz.";
      return;
    }
    if (purpose === "ranked" && state.mode === "ranked") {
      exitToModes("Bağlantı koptu, maç bitti.");
      return;
    }
    if (joinedOnce && state.mode === "open") {
      state.online = false;
      updateStatusDot();
      showBanner("Bağlantı koptu — yeniden bağlanılıyor…");
      state.reconnectTimer = setTimeout(connectOpenWorld, 3000);
    } else if (state.mode === "open" && !state.online) {
      goOffline();
    }
  };
  socket.addEventListener("error", onLost);
  socket.addEventListener("close", onLost);
}

function goOffline() {
  state.online = false;
  state.joined = false;
  state.partyCode = "";
  updateStatusDot();
  showBanner("Sunucuya bağlanılamadı — tek kişilik mod (botlar yarışıyor)");
  spawnBots();
  hudParty.hidden = true;
}

function showBanner(text) {
  banner.textContent = text;
  banner.hidden = !text;
}

function updateStatusDot() {
  hudStatus.classList.toggle("online", state.online);
  hudStatus.classList.toggle("offline", !state.online);
  hudStatus.title = state.online ? "Çevrimiçi" : "Çevrimdışı";
}

function handleServerMessage(message) {
  switch (message.type) {
    case "joined": {
      state.online = true;
      state.joined = true;
      state.selfId = message.selfId;
      state.worldId = message.worldId;
      state.partyCode = message.partyCode || "";
      state.ranked = Boolean(message.ranked);
      if (message.routes?.race?.length) state.routes.race = message.routes.race;
      if (message.routes?.tt?.length) state.routes.tt = message.routes.tt;
      if (message.zones?.race) state.zones = message.zones;
      if (message.profile) applyProfile(message.profile);
      state.remotes.clear();
      state.bots = [];
      for (const player of message.players || []) {
        if (player.id !== state.selfId) upsertRemote(player);
      }
      tt.scores = message.ttScores?.length ? message.ttScores : tt.scores;
      applyRaceState(message.race);
      showBanner("");
      updateStatusDot();
      if (state.ranked) {
        // Dereceli maç bulundu: oyun ekranına geç.
        state.mode = "ranked";
        state.map = "city";
        document.querySelector("#rankedBox").hidden = true;
        const spawn = MAPS.city.spawn;
        car.x = spawn.x;
        car.y = spawn.y;
        car.speed = 0;
        showScreen("game");
      }
      if (state.partyCode) {
        hudParty.textContent = `Parti kodu: ${state.partyCode}`;
        hudParty.hidden = false;
      } else {
        hudParty.hidden = true;
      }
      break;
    }
    case "state": {
      const seen = new Set();
      for (const player of message.players || []) {
        if (player.id === state.selfId) continue;
        seen.add(player.id);
        upsertRemote(player);
      }
      for (const id of [...state.remotes.keys()]) {
        if (!seen.has(id)) state.remotes.delete(id);
      }
      break;
    }
    case "profile":
      applyProfile(message.profile);
      break;
    case "ranked-queued":
      break;
    case "ranked-end":
      exitToModes("Dereceli maç bitti! Puanların hesabına işlendi.");
      break;
    case "race-lobby":
      applyRaceState(message.race);
      break;
    case "race-countdown": {
      applyRaceState(message.race);
      if (isInRace()) teleportToRaceGrid();
      break;
    }
    case "race-start": {
      applyRaceState(message.race);
      if (isInRace()) {
        race.nextCp = 1;
        race.finished = false;
        race.startedAt = performance.now();
        state.raceRewardApplied = false;
      }
      break;
    }
    case "race-progress":
      applyRaceState(message.race);
      break;
    case "race-finish":
      applyRaceState(message.race);
      applyRaceRewards();
      showRaceResults();
      break;
    case "race-reset":
      resetRace();
      break;
    case "tt-scores":
      tt.scores = message.scores || [];
      renderTtScores();
      break;
    case "tt-reward":
      applyTtReward(message);
      break;
    case "yaris-error":
      showBanner(message.message || "Bir hata oluştu.");
      setTimeout(() => showBanner(""), 2500);
      break;
    default:
      break;
  }
}

function upsertRemote(player) {
  const existing = state.remotes.get(player.id);
  if (existing) {
    existing.tx = player.x;
    existing.ty = player.y;
    existing.ta = player.a;
    existing.nickname = player.nickname;
    existing.color = player.color;
  } else {
    state.remotes.set(player.id, {
      x: player.x,
      y: player.y,
      a: player.a,
      tx: player.x,
      ty: player.y,
      ta: player.a,
      nickname: player.nickname,
      color: player.color,
    });
  }
}

// Konum yayını ~10Hz
setInterval(() => {
  if (!state.online || !state.joined || state.screen !== "game") return;
  sendWs({ type: "pos", x: Math.round(car.x), y: Math.round(car.y), a: Number(car.angle.toFixed(3)), s: Math.round(Math.abs(car.speed)) });
}, 100);

window.addEventListener("beforeunload", () => {
  try {
    sendWs({ type: "leave" });
    sendWs({ type: "ranked-leave" });
  } catch {}
});

// ---------------------------------------------------------------------------
// Yarış akışı (açık dünya + dereceli ortak)
// ---------------------------------------------------------------------------

function isInRace() {
  return state.joined && race.lobby.some((p) => p.id === state.selfId);
}

function applyRaceState(serverRace) {
  if (!serverRace) return;
  race.phase = serverRace.state || "idle";
  race.lobby = serverRace.lobby || [];
  race.lobbyDeadline = serverRace.lobbyDeadline || 0;
  race.startsAt = serverRace.startsAt || 0;
  race.endsAt = serverRace.endsAt || 0;
  race.progress = serverRace.progress || [];
  race.results = serverRace.results || [];
  if (serverRace.route?.length) state.routes.race = serverRace.route;
  updateRacePanel();
}

function resetRace() {
  race.phase = "idle";
  race.lobby = [];
  race.progress = [];
  race.results = [];
  race.nextCp = 1;
  race.finished = false;
  state.raceJoinSent = false;
  racePanel.hidden = true;
  resultsPanel.hidden = true;
  countdownEl.hidden = true;
}

function teleportToRaceGrid() {
  const route = state.routes.race;
  const start = route[0];
  const next = route[1];
  const dirAngle = Math.atan2(next.y - start.y, next.x - start.x);
  const index = Math.max(0, race.lobby.findIndex((p) => p.id === state.selfId));
  const back = 60 + Math.floor(index / 2) * 46;
  const side = (index % 2 === 0 ? -1 : 1) * 24;
  car.x = start.x - Math.cos(dirAngle) * back + Math.cos(dirAngle + Math.PI / 2) * side;
  car.y = start.y - Math.sin(dirAngle) * back + Math.sin(dirAngle + Math.PI / 2) * side;
  car.angle = dirAngle;
  car.speed = 0;
  car.air = 0;
}

function updateRacePanel() {
  if (!state.joined || state.ranked) {
    if (state.ranked) racePanel.hidden = true;
    else if (!state.joined) racePanel.hidden = true;
  }
  if (state.ranked) return;
  const meIn = isInRace();
  if (race.phase === "lobby" && meIn) {
    racePanel.hidden = false;
    raceLobbyList.innerHTML = race.lobby
      .map((p) => `<li><span style="color:${p.color}">●</span> ${escapeHtml(p.nickname)}</li>`)
      .join("");
    raceInfo.textContent = `${race.lobby.length}/5 sürücü toplandı`;
  } else if (race.phase === "lobby" && race.lobby.length > 0) {
    racePanel.hidden = false;
    raceLobbyList.innerHTML = "";
    raceInfo.textContent = "Yarış lobisi doluyor… Yarış Alanı'na girerek katıl!";
  } else if (race.phase !== "lobby") {
    racePanel.hidden = true;
  }
}

function applyRaceRewards() {
  // Hesaplı oyuncuların altını/puanı sunucu yazdı; misafirler yerel olarak ekler.
  if (account || state.raceRewardApplied) return;
  const mine = race.results.find((item) => item.id === state.selfId);
  if (!mine || !mine.goldEarned) return;
  state.raceRewardApplied = true;
  state.profile.gold += mine.goldEarned;
  state.profile.rating = Math.max(0, state.profile.rating + (mine.ratingDelta || 0));
  saveGuestProfile();
  refreshGoldDisplays();
}

function showRaceResults() {
  resultsPanel.hidden = false;
  countdownEl.hidden = true;
  raceResults.innerHTML = race.results
    .map((item, index) => {
      const me = item.id === state.selfId ? " me" : "";
      const time = item.timeMs > 0 ? formatTime(item.timeMs) : "bitiremedi";
      const reward = item.goldEarned ? ` · 🪙${item.goldEarned} +${item.ratingDelta || 0} puan` : "";
      const botTag = item.bot ? " 🤖" : "";
      return `<li class="${me.trim()}">${index + 1}. <span style="color:${item.color}">●</span> ${escapeHtml(item.nickname)}${botTag} — ${time}${reward}</li>`;
    })
    .join("");
  const mine = race.results.find((item) => item.id === state.selfId);
  if (mine?.goldEarned) {
    const total = mine.newGold != null ? ` (toplam 🪙${mine.newGold}, puan ${mine.newRating})` : "";
    raceReward.textContent = `Kazandın: 🪙${mine.goldEarned} · +${mine.ratingDelta || 0} puan${total}`;
  } else {
    raceReward.textContent = "";
  }
}

function raceTick() {
  if (!state.joined || state.mode === "stunt" || state.mode === "tutorial") return;
  const now = Date.now();
  if (race.phase === "countdown" && isInRace()) {
    const left = Math.ceil((race.startsAt - now) / 1000);
    countdownEl.hidden = false;
    countdownEl.textContent = left > 0 ? String(left) : "BAŞLA!";
  } else if (race.phase === "running" && race.startedAt && performance.now() - race.startedAt < 900 && isInRace()) {
    countdownEl.hidden = false;
    countdownEl.textContent = "BAŞLA!";
  } else if (race.phase !== "countdown") {
    countdownEl.hidden = true;
  }

  // Açık dünya: yarış alanına giriş/çıkış (derecelide lobi yok)
  if (!state.ranked && (race.phase === "idle" || race.phase === "lobby")) {
    const inside = inZone(car.x, car.y, state.zones.race);
    if (inside && !isInRace() && !state.raceJoinSent) {
      state.raceJoinSent = true;
      sendWs({ type: "race-join" });
      setTimeout(() => {
        state.raceJoinSent = false;
      }, 1000);
    } else if (!inside && isInRace() && race.phase === "lobby") {
      sendWs({ type: "race-leave" });
    }
  }

  if (race.phase === "running" && isInRace() && !race.finished) {
    const route = state.routes.race;
    const target = race.nextCp >= route.length ? route[0] : route[race.nextCp];
    if (Math.hypot(car.x - target.x, car.y - target.y) < CP_RADIUS) {
      if (race.nextCp >= route.length) {
        race.finished = true;
        sendWs({ type: "race-checkpoint", index: 0 });
      } else {
        sendWs({ type: "race-checkpoint", index: race.nextCp });
        race.nextCp += 1;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Zamana karşı (açık dünya)
// ---------------------------------------------------------------------------

function ttTick(nowMs) {
  if (state.mode !== "open") {
    ttPanel.hidden = true;
    return;
  }
  const route = state.routes.tt;
  const inside = inZone(car.x, car.y, state.zones.tt, 60);
  ttPanel.hidden = !inside && !tt.running;
  if (inside || tt.running) renderTtScores();

  const start = route[0];
  const nearStart = Math.hypot(car.x - start.x, car.y - start.y) < CP_RADIUS;

  if (!tt.running) {
    if (nearStart && nowMs > tt.cooldownUntil && car.speed > 30) {
      tt.running = true;
      tt.next = 1;
      tt.startAt = nowMs;
      ttInfo.textContent = "Süre işliyor! Checkpoint'leri sırayla geç.";
    } else if (inside) {
      ttInfo.textContent = "Start çizgisinden hızla geçince süre başlar! Bitirince 🪙10, rekor kırarsan 🪙20.";
    }
    return;
  }

  if (tt.next >= route.length) {
    if (nearStart && nowMs > tt.cooldownUntil) {
      const timeMs = Math.round(nowMs - tt.startAt);
      tt.lastTime = timeMs;
      tt.running = false;
      tt.cooldownUntil = nowMs + 4000;
      if (state.online) {
        sendWs({ type: "tt-finish", timeMs });
      } else {
        // Çevrimdışı: yerel ödül + rekor
        let gold = 10;
        if (!state.profile.ttBestMs || timeMs < state.profile.ttBestMs) {
          state.profile.ttBestMs = timeMs;
          gold += 10;
        }
        state.profile.gold += gold;
        if (!account) saveGuestProfile();
        refreshGoldDisplays();
        saveLocalTtScore(state.nickname || "Misafir", timeMs);
        renderTtScores();
        showScorePop(`+${gold} 🪙`);
      }
      ttInfo.textContent = `Süren: ${formatTime(timeMs)}!`;
      return;
    }
  } else {
    const cp = route[tt.next];
    if (Math.hypot(car.x - cp.x, car.y - cp.y) < CP_RADIUS) {
      tt.next += 1;
      if (tt.next >= route.length) tt.cooldownUntil = 0;
    }
  }
  ttInfo.textContent = `Checkpoint ${tt.next}/${route.length} · ${formatTime(nowMs - tt.startAt)}`;
}

function applyTtReward(message) {
  // Hesaplıysa profil sunucudan geldi; misafirse altını yerel ekle.
  if (!account && message.gold) {
    let gold = message.gold;
    if (!state.profile.ttBestMs || message.timeMs < state.profile.ttBestMs) {
      state.profile.ttBestMs = message.timeMs;
      gold += 10;
    }
    state.profile.gold += gold;
    saveGuestProfile();
    refreshGoldDisplays();
    showScorePop(`+${gold} 🪙`);
  } else if (message.record) {
    showScorePop("Yeni rekor! +20 🪙");
  } else {
    showScorePop("+10 🪙");
  }
}

function renderTtScores() {
  ttScoresEl.innerHTML = tt.scores.length
    ? tt.scores.map((s) => `<li>${escapeHtml(s.nickname)} — ${formatTime(s.timeMs)}</li>`).join("")
    : "<li>Henüz rekor yok</li>";
}

// ---------------------------------------------------------------------------
// Öğretici
// ---------------------------------------------------------------------------

const TUTORIAL_STEPS = [
  "Adım 1/4: ▲ (W) ile gaz ver, ◀ ▶ (A/D) ile dön. Biraz hızlan!",
  "Adım 2/4: Parlayan checkpoint halkasından geç!",
  "Adım 3/4: Rampaya hızla gir ve uç!",
  "Adım 4/4: BİTİŞ halkasına ulaş!",
];

function updateTutorialPanel() {
  tutorialStepEl.textContent = TUTORIAL_STEPS[tutorial.step] || "";
  tutorialDots.innerHTML = TUTORIAL_STEPS.map((_, i) => `<span class="${i < tutorial.step ? "done" : ""}"></span>`).join("");
}

function tutorialTick() {
  if (state.mode !== "tutorial" || tutorial.done) return;
  if (tutorial.step === 0 && Math.abs(car.speed) > 150) {
    tutorial.step = 1;
    updateTutorialPanel();
    showScorePop("Harika!");
  } else if (tutorial.step === 1 && Math.hypot(car.x - TUT_CHECKPOINT.x, car.y - TUT_CHECKPOINT.y) < TUT_CHECKPOINT.r) {
    tutorial.step = 2;
    updateTutorialPanel();
    showScorePop("Checkpoint geçildi!");
  } else if (tutorial.step === 2 && car.airDist > 60) {
    tutorial.step = 3;
    updateTutorialPanel();
    showScorePop("Uçtun!");
  } else if (tutorial.step === 3 && Math.hypot(car.x - TUT_FINISH.x, car.y - TUT_FINISH.y) < TUT_FINISH.r) {
    tutorial.done = true;
    completeTutorial();
  }
}

async function completeTutorial() {
  if (account) {
    const result = await postProfileAction("/api/yaris-sehri/tutorial-done", {});
    if (result?.error) showBanner(result.error);
  } else if (!state.profile.tutorialDone) {
    state.profile.tutorialDone = true;
    state.profile.gold += 20;
    saveGuestProfile();
  }
  refreshGoldDisplays();
  showScreen("tutorialDone");
}

// ---------------------------------------------------------------------------
// Tek Mod (akrobasi)
// ---------------------------------------------------------------------------

function addStuntScore(points, label) {
  stunt.score += points;
  stuntScoreEl.textContent = String(stunt.score);
  showScorePop(label || `+${points}`);
  if (stunt.score > state.profile.stuntBest) {
    stuntBestEl.textContent = String(stunt.score);
  }
  // 10 sn'de bir rekor kaydı
  const now = Date.now();
  if (now - stunt.lastFlush > 10000) {
    stunt.lastFlush = now;
    flushStuntScore(false);
  }
}

async function flushStuntScore(final) {
  const score = stunt.score;
  if (score <= 0) return;
  if (account) {
    const result = await postProfileAction("/api/yaris-sehri/stunt-score", { score });
    if (result?.goldEarned > 0) showScorePop(`Rekor! +${result.goldEarned} 🪙`);
  } else if (score > state.profile.stuntBest) {
    const goldEarned = Math.floor(score / 100) - Math.floor(state.profile.stuntBest / 100);
    state.profile.stuntBest = score;
    state.profile.gold += goldEarned;
    saveGuestProfile();
    refreshGoldDisplays();
    if (goldEarned > 0 && final) showScorePop(`Rekor! +${goldEarned} 🪙`);
  }
}

function stuntTick(nowMs) {
  if (state.mode !== "stunt") return;
  // Halkalar: havada geçiş
  if (car.air > 0) {
    for (const ring of STUNT_RINGS) {
      if (nowMs > ring.until && Math.hypot(car.x - ring.x, car.y - ring.y) < ring.r) {
        ring.until = nowMs + 30000;
        addStuntScore(100, "+100 Halka!");
      }
    }
  }
}

function onLanding() {
  if (car.airDist > 80) {
    const points = Math.round(car.airDist / 20);
    if (state.mode === "stunt") {
      addStuntScore(points, `+${points} Uçuş!`);
    } else if (state.mode === "tutorial") {
      showScorePop("Süper uçuş!");
    }
  }
  car.airDist = 0;
}

// ---------------------------------------------------------------------------
// Çevrimdışı botlar (açık dünya)
// ---------------------------------------------------------------------------

function spawnBots() {
  const names = ["Bot Efe", "Bot Zeynep", "Bot Can", "Bot Mert"];
  const route = LOCAL_RACE_ROUTE;
  state.bots = names.map((name, i) => ({
    nickname: name,
    color: COLORS[(i + 3) % COLORS.length],
    x: route[i % route.length].x,
    y: route[i % route.length].y,
    angle: 0,
    speed: 0,
    wp: (i + 1) % route.length,
    topSpeed: 170 + i * 22,
  }));
}

function updateBots(dt) {
  const route = LOCAL_RACE_ROUTE;
  for (const bot of state.bots) {
    const target = route[bot.wp];
    const want = Math.atan2(target.y - bot.y, target.x - bot.x);
    let diff = want - bot.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    bot.angle += clamp(diff, -2.2 * dt, 2.2 * dt);
    bot.speed += (bot.topSpeed - bot.speed) * 0.8 * dt;
    bot.x += Math.cos(bot.angle) * bot.speed * dt;
    bot.y += Math.sin(bot.angle) * bot.speed * dt;
    if (Math.hypot(bot.x - target.x, bot.y - target.y) < 70) {
      bot.wp = (bot.wp + 1) % route.length;
    }
  }
}

// ---------------------------------------------------------------------------
// Girdi: klavye + dokunmatik
// ---------------------------------------------------------------------------

const KEYMAP = {
  ArrowUp: "gas",
  KeyW: "gas",
  ArrowDown: "brake",
  KeyS: "brake",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

window.addEventListener("keydown", (event) => {
  const key = KEYMAP[event.code];
  if (!key) return;
  input[key] = true;
  if (state.screen === "game") event.preventDefault();
});
window.addEventListener("keyup", (event) => {
  const key = KEYMAP[event.code];
  if (key) input[key] = false;
});

function bindTouchButton(id, key) {
  const el = document.querySelector(id);
  const press = (event) => {
    event.preventDefault();
    input[key] = true;
  };
  const release = (event) => {
    event.preventDefault();
    input[key] = false;
  };
  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);
}

// ---------------------------------------------------------------------------
// Fizik
// ---------------------------------------------------------------------------

function updateCar(dt) {
  const mapSize = currentMapSize();

  // Havada: düz uçuş, direksiyon/gaz etkisiz
  if (car.air > 0) {
    car.air -= dt;
    car.x = clamp(car.x + car.vx * dt, 20, mapSize.w - 20);
    car.y = clamp(car.y + car.vy * dt, 20, mapSize.h - 20);
    car.airDist += Math.hypot(car.vx, car.vy) * dt;
    car.speed = Math.hypot(car.vx, car.vy);
    if (car.air <= 0) {
      car.air = 0;
      car.speed *= 0.82; // inişte hız kaybı
      onLanding();
    }
    return;
  }

  const stats = carStats();
  const offroad = !onRoad(car.x, car.y);
  const maxSpeed = stats.maxSpeed * (offroad ? 0.45 : 1);
  if (input.gas) {
    car.speed += stats.accel * dt;
  } else if (input.brake) {
    car.speed -= car.speed > 5 ? 380 * dt : 160 * dt;
  } else {
    car.speed -= car.speed * 1.3 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed -= car.speed * 0.35 * dt;
  car.speed = clamp(car.speed, -140, maxSpeed);

  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const steerPower = stats.grip * Math.min(1, Math.abs(car.speed) / 110);
  car.angle += steer * steerPower * dt * (car.speed < 0 ? -1 : 1);

  const nx = clamp(car.x + Math.cos(car.angle) * car.speed * dt, 20, mapSize.w - 20);
  const ny = clamp(car.y + Math.sin(car.angle) * car.speed * dt, 20, mapSize.h - 20);

  if (!hitBuilding(nx, car.y)) {
    car.x = nx;
  } else {
    car.speed *= 0.55;
  }
  if (!hitBuilding(car.x, ny)) {
    car.y = ny;
  } else {
    car.speed *= 0.55;
  }

  // Rampa kontrolü
  const nowMs = performance.now();
  const ramps = state.map === "stunt" ? STUNT_RAMPS : state.map === "tutorial" ? [TUT_RAMP] : [];
  if (car.speed > 200) {
    for (const ramp of ramps) {
      if (nowMs < ramp.until) continue;
      if (car.x > ramp.x && car.x < ramp.x + ramp.w && car.y > ramp.y && car.y < ramp.y + ramp.h) {
        ramp.until = nowMs + 1500;
        car.airTime = 0.4 + car.speed / 650;
        car.air = car.airTime;
        car.airDist = 0;
        car.vx = Math.cos(car.angle) * car.speed;
        car.vy = Math.sin(car.angle) * car.speed;
        showScorePop("Uçuş!");
        break;
      }
    }
  }
}

function updateRemotes(dt) {
  const t = Math.min(1, dt * 9);
  for (const remote of state.remotes.values()) {
    remote.x += (remote.tx - remote.x) * t;
    remote.y += (remote.ty - remote.y) * t;
    let diff = remote.ta - remote.a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    remote.a += diff * t;
  }
}

// ---------------------------------------------------------------------------
// Çizim
// ---------------------------------------------------------------------------

function resizeCanvas() {
  canvas.width = Math.floor(innerWidth * devicePixelRatio);
  canvas.height = Math.floor(innerHeight * devicePixelRatio);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updateCamera() {
  const vw = innerWidth;
  const vh = innerHeight;
  const mapSize = currentMapSize();
  cam.x = vw >= mapSize.w ? -(vw - mapSize.w) / 2 : clamp(car.x - vw / 2, 0, mapSize.w - vw);
  cam.y = vh >= mapSize.h ? -(vh - mapSize.h) / 2 : clamp(car.y - vh / 2, 0, mapSize.h - vh);
}

function draw() {
  const vw = innerWidth;
  const vh = innerHeight;
  ctx.fillStyle = "#0d141a";
  ctx.fillRect(0, 0, vw, vh);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  if (state.map === "city") {
    drawCityGround();
    drawZones();
    drawRoads();
    drawCheckpoints();
  } else {
    drawStuntGround();
    drawRamps();
    drawRings();
    if (state.map === "tutorial") drawTutorialMarkers();
  }

  for (const bot of state.bots) drawCar(bot.x, bot.y, bot.angle, bot.color, bot.nickname, false, 0);
  for (const remote of state.remotes.values()) drawCar(remote.x, remote.y, remote.a, remote.color, remote.nickname, false, 0);
  const airProgress = car.airTime > 0 && car.air > 0 ? 1 - car.air / car.airTime : 0;
  drawCar(car.x, car.y, car.angle, selectedCarColor(), state.nickname, true, car.air > 0 ? airProgress : 0);

  ctx.restore();
  drawMinimap(vw, vh);
  drawTargetArrow(vw, vh);
}

function drawCityGround() {
  ctx.fillStyle = "#101a14";
  ctx.fillRect(0, 0, CITY_SIZE, CITY_SIZE);
  for (const park of cityMap.parks) {
    ctx.fillStyle = "#16351f";
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = "rgba(105, 209, 139, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(park.x, park.y, park.w, park.h);
    for (const tree of park.trees) {
      ctx.fillStyle = "#1f5a2e";
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2f7d40";
      ctx.beginPath();
      ctx.arc(tree.x - tree.r * 0.25, tree.y - tree.r * 0.25, tree.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const b of cityMap.buildings) {
    ctx.fillStyle = b.shade > 0.5 ? "#232c3d" : "#1c2431";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = `rgba(53, 210, 255, ${0.14 + b.shade * 0.2})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
}

function drawRoads() {
  ctx.fillStyle = "#232b38";
  const lines = Math.round(CITY_SIZE / ROAD_STEP);
  for (let k = 0; k <= lines; k += 1) {
    ctx.fillRect(k * ROAD_STEP - ROAD_HALF, 0, ROAD_HALF * 2, CITY_SIZE);
    ctx.fillRect(0, k * ROAD_STEP - ROAD_HALF, CITY_SIZE, ROAD_HALF * 2);
  }
  ctx.strokeStyle = "rgba(255, 209, 102, 0.35)";
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (let k = 0; k <= lines; k += 1) {
    ctx.beginPath();
    ctx.moveTo(k * ROAD_STEP, 0);
    ctx.lineTo(k * ROAD_STEP, CITY_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, k * ROAD_STEP);
    ctx.lineTo(CITY_SIZE, k * ROAD_STEP);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawZones() {
  const pulse = 0.55 + Math.sin(performance.now() / 350) * 0.2;
  const raceZone = state.zones.race;
  ctx.fillStyle = `rgba(53, 210, 255, ${0.10 * pulse})`;
  ctx.fillRect(raceZone.x, raceZone.y, raceZone.w, raceZone.h);
  ctx.strokeStyle = `rgba(53, 210, 255, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(raceZone.x, raceZone.y, raceZone.w, raceZone.h);
  ctx.setLineDash([]);
  drawZoneLabel(raceZone, "YARIŞ ALANI", "#35d2ff");

  const ttZone = state.zones.tt;
  ctx.fillStyle = `rgba(255, 209, 102, ${0.10 * pulse})`;
  ctx.fillRect(ttZone.x, ttZone.y, ttZone.w, ttZone.h);
  ctx.strokeStyle = `rgba(255, 209, 102, ${pulse})`;
  ctx.strokeRect(ttZone.x, ttZone.y, ttZone.w, ttZone.h);
  drawZoneLabel(ttZone, "ZAMANA KARŞI", "#ffd166");
}

function drawZoneLabel(zone, text, color) {
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillText(text, zone.x + zone.w / 2, zone.y + zone.h / 2);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}

function drawCheckpoints() {
  if (race.phase === "running" || race.phase === "countdown") {
    const route = state.routes.race;
    for (let i = 0; i < route.length; i += 1) {
      const isNext = isInRace() && !race.finished && (race.nextCp >= route.length ? 0 : race.nextCp) === i;
      drawCheckpointRing(route[i], i === 0, isNext, "#35d2ff");
    }
  }
  if (tt.running || inZone(car.x, car.y, state.zones.tt, 120)) {
    const route = state.routes.tt;
    for (let i = 0; i < route.length; i += 1) {
      const isNext = tt.running && (tt.next >= route.length ? 0 : tt.next) === i;
      drawCheckpointRing(route[i], i === 0, isNext, "#ffd166");
    }
  }
}

function drawCheckpointRing(cp, isStart, isNext, color) {
  const pulse = isNext ? 1 + Math.sin(performance.now() / 180) * 0.12 : 1;
  ctx.save();
  ctx.globalAlpha = isNext ? 0.95 : 0.28;
  ctx.strokeStyle = isStart ? "#ffffff" : color;
  ctx.lineWidth = isNext ? 6 : 3;
  ctx.beginPath();
  ctx.arc(cp.x, cp.y, CP_RADIUS * 0.55 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  if (isStart) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let s = -2; s <= 2; s += 1) {
      ctx.fillRect(cp.x - 8, cp.y + s * 16 - 6, 16, 7);
    }
  }
  if (isNext) {
    ctx.fillStyle = color;
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isStart ? "BİTİŞ" : "CP", cp.x, cp.y - CP_RADIUS * 0.6);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

function drawStuntGround() {
  const mapSize = currentMapSize();
  ctx.fillStyle = state.map === "tutorial" ? "#14201a" : "#17131f";
  ctx.fillRect(0, 0, mapSize.w, mapSize.h);
  // Izgara deseni
  ctx.strokeStyle = "rgba(53, 210, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= mapSize.w; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, mapSize.h);
    ctx.stroke();
  }
  for (let y = 0; y <= mapSize.h; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(mapSize.w, y);
    ctx.stroke();
  }
  // Kenar çiti
  ctx.strokeStyle = "rgba(255, 91, 110, 0.6)";
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 14]);
  ctx.strokeRect(10, 10, mapSize.w - 20, mapSize.h - 20);
  ctx.setLineDash([]);
}

function drawRamps() {
  const ramps = state.map === "stunt" ? STUNT_RAMPS : state.map === "tutorial" ? [TUT_RAMP] : [];
  for (const ramp of ramps) {
    ctx.fillStyle = "#3d2b12";
    ctx.fillRect(ramp.x, ramp.y, ramp.w, ramp.h);
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3;
    ctx.strokeRect(ramp.x, ramp.y, ramp.w, ramp.h);
    ctx.fillStyle = "rgba(255, 209, 102, 0.8)";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(ramp.x + 12 + i * 22, ramp.y + ramp.h - 12);
      ctx.lineTo(ramp.x + 22 + i * 22, ramp.y + 14);
      ctx.lineTo(ramp.x + 32 + i * 22, ramp.y + ramp.h - 12);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRings() {
  if (state.map !== "stunt") return;
  const nowMs = performance.now();
  for (const ring of STUNT_RINGS) {
    const active = nowMs > ring.until;
    ctx.save();
    ctx.globalAlpha = active ? 0.9 : 0.2;
    ctx.strokeStyle = "#ff8fd6";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    if (active) {
      ctx.fillStyle = "#ff8fd6";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+100", ring.x, ring.y - ring.r - 8);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }
}

function drawTutorialMarkers() {
  if (state.mode !== "tutorial" || tutorial.done) return;
  if (tutorial.step === 1) {
    drawCheckpointRing(TUT_CHECKPOINT, false, true, "#35d2ff");
  } else if (tutorial.step === 3) {
    drawCheckpointRing(TUT_FINISH, true, true, "#69d18b");
  }
}

function drawCar(x, y, angle, color, nickname, isSelf, airProgress) {
  const scale = airProgress > 0 ? 1 + Math.sin(airProgress * Math.PI) * 0.35 : 1;
  ctx.save();
  ctx.translate(x, y);
  // Gölge (havada kayar)
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  const shadowOff = airProgress * 22;
  ctx.fillRect(-19 + shadowOff, -11 + shadowOff, 38, 22);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-18, -10, 36, 20, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(10, 16, 24, 0.85)";
  ctx.beginPath();
  ctx.roundRect(-2, -7, 12, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#fff6c9";
  ctx.fillRect(15, -8, 3, 4);
  ctx.fillRect(15, 4, 3, 4);
  ctx.restore();

  if (nickname) {
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText(nickname, x, y - 24 * scale);
    ctx.fillStyle = isSelf ? "#ffd166" : "#f7f4ea";
    ctx.fillText(nickname, x, y - 24 * scale);
    ctx.textAlign = "left";
  }
}

function drawMinimap(vw, vh) {
  if (state.screen !== "game") return;
  const mapSize = currentMapSize();
  const size = Math.min(150, vw * 0.28);
  const scale = size / Math.max(mapSize.w, mapSize.h);
  const ox = vw - size - 12;
  const oy = vh - size - 12;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(10, 14, 20, 0.8)";
  ctx.fillRect(ox, oy, size, size);
  ctx.strokeStyle = "rgba(53, 210, 255, 0.4)";
  ctx.strokeRect(ox, oy, size, size);
  if (state.map === "city") {
    ctx.fillStyle = "rgba(53, 210, 255, 0.5)";
    ctx.fillRect(ox + state.zones.race.x * scale, oy + state.zones.race.y * scale, state.zones.race.w * scale, state.zones.race.h * scale);
    ctx.fillStyle = "rgba(255, 209, 102, 0.5)";
    ctx.fillRect(ox + state.zones.tt.x * scale, oy + state.zones.tt.y * scale, state.zones.tt.w * scale, state.zones.tt.h * scale);
  }
  for (const remote of state.remotes.values()) {
    ctx.fillStyle = remote.color;
    ctx.fillRect(ox + remote.x * scale - 1.5, oy + remote.y * scale - 1.5, 3, 3);
  }
  for (const bot of state.bots) {
    ctx.fillStyle = bot.color;
    ctx.fillRect(ox + bot.x * scale - 1.5, oy + bot.y * scale - 1.5, 3, 3);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(ox + car.x * scale - 2, oy + car.y * scale - 2, 4, 4);
  ctx.restore();
}

function drawTargetArrow(vw, vh) {
  let target = null;
  let color = "#35d2ff";
  if (race.phase === "running" && isInRace() && !race.finished) {
    const route = state.routes.race;
    target = race.nextCp >= route.length ? route[0] : route[race.nextCp];
  } else if (tt.running) {
    const route = state.routes.tt;
    target = tt.next >= route.length ? route[0] : route[tt.next];
    color = "#ffd166";
  } else if (state.mode === "tutorial" && !tutorial.done) {
    if (tutorial.step === 1) target = TUT_CHECKPOINT;
    else if (tutorial.step === 2) target = { x: TUT_RAMP.x + TUT_RAMP.w / 2, y: TUT_RAMP.y + TUT_RAMP.h / 2 };
    else if (tutorial.step === 3) target = TUT_FINISH;
    color = "#69d18b";
  }
  if (!target) return;
  const sx = target.x - cam.x;
  const sy = target.y - cam.y;
  const onScreen = sx > 40 && sx < vw - 40 && sy > 40 && sy < vh - 40;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (onScreen) {
    const bx = car.x - cam.x;
    const by = car.y - cam.y;
    const ang = Math.atan2(sy - by, sx - bx);
    ctx.translate(bx + Math.cos(ang) * 42, by + Math.sin(ang) * 42 - 26);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
  } else {
    const cx = vw / 2;
    const cy = vh / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const ex = clamp(cx + Math.cos(ang) * (Math.min(vw, vh) / 2 - 50), 40, vw - 40);
    const ey = clamp(cy + Math.sin(ang) * (Math.min(vw, vh) / 2 - 50), 60, vh - 40);
    ctx.translate(ex, ey);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function showScorePop(text) {
  scorePop.textContent = text;
  scorePop.hidden = false;
  clearTimeout(showScorePop.timer);
  showScorePop.timer = setTimeout(() => {
    scorePop.hidden = true;
  }, 1400);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function updateHud(nowMs) {
  hudSpeed.textContent = `${Math.round(Math.abs(car.speed) * 0.55)} km/s`;
  const driverCount = 1 + state.remotes.size + state.bots.length;
  hudPlayers.textContent =
    state.mode === "stunt" ? "Tek Mod" : state.mode === "tutorial" ? "Öğretici" : state.online ? `${driverCount} sürücü çevrimiçi` : `${driverCount} sürücü (yerel)`;

  if (race.phase === "lobby" && isInRace()) {
    const left = Math.max(0, Math.ceil((race.lobbyDeadline - Date.now()) / 1000));
    hudEvent.textContent = `Yarış lobisi ${race.lobby.length}/5 · ${left} sn`;
  } else if (race.phase === "countdown" && isInRace()) {
    hudEvent.textContent = "Yarış başlıyor!";
  } else if (race.phase === "running" && isInRace()) {
    const route = state.routes.race;
    hudEvent.textContent = race.finished
      ? "Bitirdin! Diğerleri bekleniyor…"
      : `Checkpoint ${race.nextCp}/${route.length} · ${formatTime(nowMs - race.startedAt)}`;
  } else if (tt.running) {
    hudEvent.textContent = `Zamana karşı · ${formatTime(nowMs - tt.startAt)}`;
  } else {
    hudEvent.textContent = "";
  }
}

// ---------------------------------------------------------------------------
// Ana döngü
// ---------------------------------------------------------------------------

let lastFrame = performance.now();

function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastFrame) / 1000);
  lastFrame = nowMs;

  if (state.screen === "game") {
    updateCar(dt);
    updateRemotes(dt);
    updateBots(dt);
    raceTick();
    ttTick(nowMs);
    tutorialTick();
    stuntTick(nowMs);
    updateCamera();
    updateHud(nowMs);
    draw();
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Başlat
// ---------------------------------------------------------------------------

async function init() {
  showScreen("splash");
  bindAuthUI();
  bindModeUI();
  bindTouchButton("#touchGas", "gas");
  bindTouchButton("#touchBrake", "brake");
  bindTouchButton("#touchLeft", "left");
  bindTouchButton("#touchRight", "right");
  updateStatusDot();
  requestAnimationFrame(frame);

  const resumed = await tryResume();
  if (resumed) {
    await fetchProfile();
    afterLogin();
    return;
  }
  // Hesap bulunamadı: kayıt/misafir ekranı (metinler index.html'de AYNEN tanımlı)
  showScreen("menu");
}

init();
