"use strict";

// ---------------------------------------------------------------------------
// Hakorocks Şehri (yaris-sehri) — 3D çok oyunculu araba oyunu (Three.js)
// Modlar: Açık Dünya, Dereceli Yarış, Tek Mod (akrobasi), Öğretici
// Sunucu yoksa açık dünya tek kişilik + botlarla çalışır.
// Koordinat notu: sunucu 2D (x, y) gönderir; 3D sahnede zemin düzlemi (x, z),
// y = yükseklik. Dönüşüm: sunucu y -> istemci z, sunucu h -> istemci y.
// ---------------------------------------------------------------------------

import * as THREE from "three";

window.__yarisBooted = true;

const CITY_SIZE = 6000;
const ROAD_STEP = 600;
const ROAD_HALF = 60;
const CP_RADIUS = 85;
const GRAVITY = 1500;

// Araba kataloğu (server.mjs'deki YARIS_CARS ile aynı — fiyat doğrulaması sunucuda)
const CARS = [
  { id: "minik", name: "Minik", price: 0, maxSpeed: 560, accel: 390, grip: 2.4, color: "#4ea3ff", desc: "Şehirde başlamak için birebir.", body: { len: 8.5, wid: 4.2, hei: 1.7, cab: 1.5, spoiler: false } },
  { id: "serit", name: "Şerit", price: 80, maxSpeed: 620, accel: 435, grip: 2.55, color: "#69d18b", desc: "Biraz daha hızlı, biraz daha kıvrak.", body: { len: 9, wid: 4.2, hei: 1.6, cab: 1.4, spoiler: false } },
  { id: "pars", name: "Pars", price: 160, maxSpeed: 680, accel: 480, grip: 2.7, color: "#ff9f43", desc: "Virajlarda güven verir.", body: { len: 9.5, wid: 4.4, hei: 1.5, cab: 1.3, spoiler: true } },
  { id: "seytan", name: "Şeytan", price: 280, maxSpeed: 740, accel: 530, grip: 2.85, color: "#ff5b6e", desc: "Kırmızı yıldırım.", body: { len: 10, wid: 4.4, hei: 1.4, cab: 1.2, spoiler: true } },
  { id: "firtina", name: "Fırtına", price: 430, maxSpeed: 800, accel: 585, grip: 3.0, color: "#b67dff", desc: "Fırtına gibi eser.", body: { len: 10.5, wid: 4.6, hei: 1.3, cab: 1.1, spoiler: true } },
  { id: "efsane", name: "Efsane", price: 650, maxSpeed: 860, accel: 640, grip: 3.2, color: "#ffd166", desc: "Şehrin en hızlı efsanesi!", body: { len: 11, wid: 4.8, hei: 1.2, cab: 1.0, spoiler: true } },
];

// Yerel kopya rotalar (sunucu joined'da gönderir; çevrimdışı modda bunlar kullanılır)
const LOCAL_RACE_ROUTE = [
  { x: 600, z: 600 },
  { x: 3000, z: 600 },
  { x: 5400, z: 600 },
  { x: 5400, z: 3000 },
  { x: 5400, z: 5400 },
  { x: 3000, z: 5400 },
  { x: 600, z: 5400 },
  { x: 600, z: 3000 },
];
const LOCAL_TT_ROUTE = [
  { x: 3000, z: 5400 },
  { x: 4200, z: 5400 },
  { x: 5400, z: 5400 },
  { x: 5400, z: 4200 },
  { x: 4200, z: 4200 },
  { x: 3000, z: 4200 },
];
const LOCAL_ZONES = {
  race: { x: 240, z: 240, w: 720, h: 720 },
  tt: { x: 2640, z: 5040, w: 720, h: 720 },
};

const MAPS = {
  city: { w: CITY_SIZE, h: CITY_SIZE, spawn: { x: 3000, z: 3000, angle: -Math.PI / 2 } },
  stunt: { w: 3600, h: 2400, spawn: { x: 250, z: 1200, angle: 0 } },
  tutorial: { w: 2000, h: 1300, spawn: { x: 250, z: 250, angle: 0 } },
  ice: { w: 2400, h: 2400, spawn: { x: 1200, z: 1200, angle: 0 } },
};

// Buzlu Zemin: 30x30 karo pisti (merkezde), altı su
const ICE = {
  tiles: 30,
  tileSize: 60,
  origin: 300, // pist 300..2100 arası
  graceMs: 1000, // ilk basıştan itibaren korumalı süre
  crackMs: 700, // aynı karoda iki çatlak arası en az süre
};

// Tek Mod akrobasi haritası: rampalar (dikdörtgen taban) ve halkalar (3D konum)
const STUNT_RAMPS = [
  { x: 600, z: 500, w: 110, h: 90, dir: 0, until: 0 },
  { x: 600, z: 1800, w: 110, h: 90, dir: 0, until: 0 },
  { x: 1800, z: 1150, w: 110, h: 90, dir: 0, until: 0 },
  { x: 2900, z: 450, w: 110, h: 90, dir: 0, until: 0 },
  { x: 2900, z: 1950, w: 110, h: 90, dir: 0, until: 0 },
];
const STUNT_RINGS = [
  { x: 850, z: 545, h: 26, r: 42, until: 0 },
  { x: 850, z: 1845, h: 26, r: 42, until: 0 },
  { x: 2050, z: 1195, h: 26, r: 42, until: 0 },
  { x: 3150, z: 495, h: 26, r: 42, until: 0 },
  { x: 3150, z: 1995, h: 26, r: 42, until: 0 },
];

// Öğretici haritası
const TUT_CHECKPOINT = { x: 1250, z: 350, r: 70 };
const TUT_RAMP = { x: 1550, z: 650, w: 110, h: 90, dir: 0, until: 0 };
const TUT_FINISH = { x: 600, z: 1000, r: 70 };

const SESSION_KEY = "hakorocks-session-id";
const TOKEN_KEY = "hakorocks-auth-token";
const NICK_KEY = "yaris-sehri-nickname";
const GUEST_PROFILE_KEY = "yaris-sehri-guest-profile-v1";
const TT_LOCAL_KEY = "yaris-sehri-tt-scores";

// ---------------------------------------------------------------------------
// Şehir verisi üretimi (sabit tohumlu — her istemcide aynı)
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
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.z < b.z + b.h + pad && a.z + a.h + pad > b.z;
}

// Şehir bölgeleri: merkez (yüksek renkli), konut (alçak), endüstriyel (depo+vinç),
// park/gölet, meydan (saat kulesi), stadyum, liman (doğu kenarı su + iskele).
function districtOf(bi, bj) {
  if (bi === 4 && bj === 4) return "plaza";
  if (bi === 2 && bj === 6) return "stadium";
  if (bi >= 6 && bj <= 2) return "industrial";
  const dist = Math.max(Math.abs(bi - 4), Math.abs(bj - 4));
  if (dist <= 1) return "downtown";
  return "residential";
}

function buildCityData() {
  const rng = mulberry32(20260815);
  const buildings = [];
  const parks = [];
  const cranes = [];
  const landmarks = [];
  const blockSize = ROAD_STEP - ROAD_HALF * 2 - 30; // 450
  for (let bi = 0; bi < 9; bi += 1) {
    for (let bj = 0; bj < 9; bj += 1) {
      const x0 = bi * ROAD_STEP + ROAD_HALF + 15;
      const z0 = bj * ROAD_STEP + ROAD_HALF + 15;
      const block = { x: x0, z: z0, w: blockSize, h: blockSize };
      if (rectsOverlap(block, LOCAL_ZONES.race, 60) || rectsOverlap(block, LOCAL_ZONES.tt, 60)) continue;
      const district = districtOf(bi, bj);

      if (district === "plaza") {
        // Saat kulesi meydanı: açık alan + simge kule
        landmarks.push({ kind: "clockTower", x: x0 + blockSize / 2, z: z0 + blockSize / 2 });
        parks.push({ x: x0, z: z0, w: blockSize, h: blockSize, trees: [], plaza: true });
        continue;
      }
      if (district === "stadium") {
        landmarks.push({ kind: "stadium", x: x0 + blockSize / 2, z: z0 + blockSize / 2 });
        continue;
      }
      if (district === "residential" && rng() < 0.3) {
        // Park (bazısında gölet)
        const trees = [];
        const treeCount = 8 + Math.floor(rng() * 7);
        for (let t = 0; t < treeCount; t += 1) {
          trees.push({
            x: x0 + 40 + rng() * (blockSize - 80),
            z: z0 + 40 + rng() * (blockSize - 80),
            s: 8 + rng() * 8,
          });
        }
        const park = { x: x0, z: z0, w: blockSize, h: blockSize, trees };
        if (rng() < 0.4) {
          park.pond = { x: x0 + blockSize / 2, z: z0 + blockSize / 2, r: 60 + rng() * 40 };
        }
        parks.push(park);
        continue;
      }

      const cell = blockSize / 2;
      for (let ci = 0; ci < 2; ci += 1) {
        for (let cj = 0; cj < 2; cj += 1) {
          const skipChance = district === "downtown" ? 0.08 : 0.16;
          if (rng() < skipChance) continue;
          const bx = x0 + ci * cell + 20 + rng() * 24;
          const bz = z0 + cj * cell + 20 + rng() * 24;
          if (district === "downtown") {
            // Yüksek, renkli binalar
            buildings.push({
              x: bx, z: bz,
              w: cell - 60 - rng() * 30,
              h: cell - 60 - rng() * 30,
              height: 130 + rng() * 140,
              hue: 0.52 + rng() * 0.35,
              sat: 0.45 + rng() * 0.3,
              light: 0.3 + rng() * 0.2,
            });
          } else if (district === "industrial") {
            // Alçak geniş depolar
            buildings.push({
              x: bx - 10, z: bz - 10,
              w: cell - 40,
              h: cell - 40,
              height: 24 + rng() * 24,
              hue: 0.08,
              sat: 0.06 + rng() * 0.08,
              light: 0.22 + rng() * 0.1,
            });
          } else {
            // Konut: alçak, sıcak renkli evler
            buildings.push({
              x: bx + 10, z: bz + 10,
              w: cell - 90 - rng() * 30,
              h: cell - 90 - rng() * 30,
              height: 14 + rng() * 18,
              hue: 0.05 + rng() * 0.08,
              sat: 0.3 + rng() * 0.2,
              light: 0.3 + rng() * 0.15,
            });
          }
        }
      }
      if (district === "industrial" && rng() < 0.5) {
        cranes.push({ x: x0 + 60 + rng() * (blockSize - 120), z: z0 + 60 + rng() * (blockSize - 120) });
      }
    }
  }
  return { buildings, parks, cranes, landmarks };
}

const cityData = buildCityData();

// ---------------------------------------------------------------------------
// Durum
// ---------------------------------------------------------------------------

function defaultProfile() {
  return { gold: 0, cars: ["minik"], selectedCar: "minik", rating: 100, tutorialDone: false, ttBestMs: 0, stuntBest: 0, iceBest: 0 };
}

const state = {
  screen: "splash",
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
  remotes: new Map(), // id -> {x,z,h,a,tx,tz,th,ta,nickname,color,mesh,tag}
  bots: [],
  joinMode: "public",
  joinCode: "",
  reconnectTimer: null,
  raceJoinSent: false,
  raceRewardApplied: false,
  queueStartedAt: 0,
  lowQuality: false,
  pointerLocked: false,
  camYawOffset: 0,
};

const car = {
  x: 3000,
  z: 3000,
  h: 0,
  vh: 0,
  angle: -Math.PI / 2,
  speed: 0,
  airDist: 0,
  vx: 0,
  vz: 0,
  falling: false,
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

const stunt = { score: 0, lastFlush: 0 };
const tutorial = { step: 0, done: false };
const ice = { tiles: [], broken: 0, deaths: 0, survivedMs: 0, lastTick: 0, lastFlush: 0, fallingTiles: [] };
const input = { gas: false, brake: false, left: false, right: false };

let socket = null;
let account = null;

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

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
const icePanel = document.querySelector("#icePanel");
const stuntScoreEl = document.querySelector("#stuntScore");
const stuntBestEl = document.querySelector("#stuntBest");
const countdownEl = document.querySelector("#countdown");
const scorePop = document.querySelector("#scorePop");
const touchControls = document.querySelector("#touchControls");
const menuError = document.querySelector("#menuError");
const minimap = document.querySelector("#minimap");
const minimapCtx = minimap.getContext("2d");

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
  minimap.hidden = name !== "game";
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

function inZone(x, z, zone, pad = 0) {
  return x >= zone.x - pad && x <= zone.x + zone.w + pad && z >= zone.z - pad && z <= zone.z + zone.h + pad;
}

function currentMapSize() {
  return MAPS[state.map] || MAPS.city;
}

function onRoad(x, z) {
  if (state.map !== "city") return true;
  const mx = ((x % ROAD_STEP) + ROAD_STEP) % ROAD_STEP;
  const mz = ((z % ROAD_STEP) + ROAD_STEP) % ROAD_STEP;
  const near = (m) => m <= ROAD_HALF + 8 || m >= ROAD_STEP - ROAD_HALF - 8;
  if (near(mx) || near(mz)) return true;
  return inZone(x, z, state.zones.race, 40) || inZone(x, z, state.zones.tt, 40);
}

function hitBuilding(nx, nz) {
  if (state.map !== "city" || car.h > 4) return null; // havada bina çarpışması yok
  const r = 5;
  for (const b of cityData.buildings) {
    if (nx > b.x - r && nx < b.x + b.w + r && nz > b.z - r && nz < b.z + b.h + r) {
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

// Sunucu (x, y) zemin koordinatını istemci (x, z) biçimine çevirir.
function convertRoute(route) {
  return Array.isArray(route) ? route.map((p) => ({ x: p.x, z: p.y })) : [];
}

function convertZones(zones) {
  if (!zones?.race || !zones?.tt) return null;
  return {
    race: { x: zones.race.x, z: zones.race.y, w: zones.race.w, h: zones.race.h },
    tt: { x: zones.tt.x, z: zones.tt.y, w: zones.tt.w, h: zones.tt.h },
  };
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
    iceBest: Math.floor(Number(value.iceBest) || 0),
  };
}

function applyProfile(profile) {
  if (!profile) return;
  const previousCar = state.profile.selectedCar;
  state.profile = normalizeProfile(profile);
  refreshGoldDisplays();
  if (state.profile.selectedCar !== previousCar) rebuildSelfCar();
}

function refreshGoldDisplays() {
  hudGold.textContent = `🪙 ${state.profile.gold}`;
  document.querySelector("#modeGold").textContent = `🪙 ${state.profile.gold}`;
  document.querySelector("#galleryGold").textContent = `🪙 ${state.profile.gold}`;
  document.querySelector("#modeRating").textContent = `Puan: ${state.profile.rating}`;
  document.querySelector("#modeCar").textContent = `Araba: ${carStats().name}`;
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
// Three.js: renderer, sahneler, kamera
// ---------------------------------------------------------------------------

const SKY_COLOR = 0x22344e;
const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.5, 3200);

const FOG_NEAR = 350;
const FOG_FAR = 1500;
const FOG_NEAR_LOW = 220;
const FOG_FAR_LOW = 900;

function resizeRenderer() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resizeRenderer);
resizeRenderer();

function makeBaseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);
  const hemi = new THREE.HemisphereLight(0xb8d4ff, 0x2a3018, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.1);
  sun.position.set(0.4, 1, 0.25);
  scene.add(sun);
  return scene;
}

function applyFog(scene) {
  if (!scene?.fog) return;
  scene.fog.near = state.lowQuality ? FOG_NEAR_LOW : FOG_NEAR;
  scene.fog.far = state.lowQuality ? FOG_FAR_LOW : FOG_FAR;
}

// --- Şehir sahnesi ---------------------------------------------------------

function buildCityScene() {
  const scene = makeBaseScene();
  const refs = { rings: { race: [], tt: [] } };
  const half = CITY_SIZE / 2;

  // Zemin
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SIZE, CITY_SIZE),
    new THREE.MeshLambertMaterial({ color: 0x16351f }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(half, 0, half);
  scene.add(ground);

  // Yollar (uzun ince kutular) + orta çizgiler
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x232b38 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x8a7a3a });
  const roadGeoH = new THREE.BoxGeometry(CITY_SIZE, 0.3, ROAD_HALF * 2);
  const roadGeoV = new THREE.BoxGeometry(ROAD_HALF * 2, 0.3, CITY_SIZE);
  const lineGeoH = new THREE.BoxGeometry(CITY_SIZE, 0.35, 2);
  const lineGeoV = new THREE.BoxGeometry(2, 0.35, CITY_SIZE);
  for (let k = 0; k <= CITY_SIZE / ROAD_STEP; k += 1) {
    const roadH = new THREE.Mesh(roadGeoH, roadMat);
    roadH.position.set(half, 0.15, k * ROAD_STEP);
    scene.add(roadH);
    const roadV = new THREE.Mesh(roadGeoV, roadMat);
    roadV.position.set(k * ROAD_STEP, 0.15, half);
    scene.add(roadV);
    const lineH = new THREE.Mesh(lineGeoH, lineMat);
    lineH.position.set(half, 0.22, k * ROAD_STEP);
    scene.add(lineH);
    const lineV = new THREE.Mesh(lineGeoV, lineMat);
    lineV.position.set(k * ROAD_STEP, 0.22, half);
    scene.add(lineV);
  }

  // Parklar / meydan (yeşil zemin + gölet + koni ağaçlar, instanced)
  const parkMat = new THREE.MeshLambertMaterial({ color: 0x1d4a29 });
  const plazaMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  const pondMat = new THREE.MeshLambertMaterial({ color: 0x1b4d6e });
  const treeItems = [];
  for (const park of cityData.parks) {
    const parkMesh = new THREE.Mesh(
      new THREE.BoxGeometry(park.w, 0.4, park.h),
      park.plaza ? plazaMat : parkMat,
    );
    parkMesh.position.set(park.x + park.w / 2, 0.2, park.z + park.h / 2);
    scene.add(parkMesh);
    if (park.pond) {
      const pond = new THREE.Mesh(new THREE.CircleGeometry(park.pond.r, 20), pondMat);
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(park.pond.x, 0.45, park.pond.z);
      scene.add(pond);
    }
    treeItems.push(...park.trees);
  }
  const treeGeo = new THREE.ConeGeometry(1, 2.6, 6);
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x2f7d40 });
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, Math.max(1, treeItems.length));
  const dummy = new THREE.Object3D();
  treeItems.forEach((tree, i) => {
    dummy.position.set(tree.x, tree.s * 1.3, tree.z);
    dummy.scale.set(tree.s, tree.s, tree.s);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  });
  scene.add(trees);

  // Binalar (InstancedMesh + bölgeye göre renk varyasyonu)
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const buildingMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const buildingMesh = new THREE.InstancedMesh(boxGeo, buildingMat, Math.max(1, cityData.buildings.length));
  const color = new THREE.Color();
  cityData.buildings.forEach((b, i) => {
    dummy.position.set(b.x + b.w / 2, b.height / 2, b.z + b.h / 2);
    dummy.scale.set(b.w, b.height, b.h);
    dummy.rotation.y = 0;
    dummy.updateMatrix();
    buildingMesh.setMatrixAt(i, dummy.matrix);
    color.setHSL(b.hue, b.sat, b.light);
    buildingMesh.setColorAt(i, color);
  });
  scene.add(buildingMesh);

  // Liman: doğu kenarı su + iskeleler + rıhtım
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SIZE - 5460, CITY_SIZE),
    new THREE.MeshLambertMaterial({ color: 0x1b4d6e }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(5460 + (CITY_SIZE - 5460) / 2, 0.12, half);
  scene.add(water);
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x4a4238 });
  for (const pierZ of [800, 2200, 3600, 5000]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(320, 4, 46), dockMat);
    pier.position.set(5460 + 160, 2, pierZ);
    scene.add(pier);
  }

  // Endüstriyel vinçler (süs)
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xc2703a });
  for (const crane of cityData.cranes) {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(6, 90, 6), craneMat);
    mast.position.set(crane.x, 45, crane.z);
    scene.add(mast);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(70, 5, 5), craneMat);
    arm.position.set(crane.x + 26, 88, crane.z);
    scene.add(arm);
  }

  // Simge yapılar: saat kulesi + stadyum
  for (const landmark of cityData.landmarks) {
    if (landmark.kind === "clockTower") {
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(34, 150, 34),
        new THREE.MeshLambertMaterial({ color: 0x8a7a5a }),
      );
      tower.position.set(landmark.x, 75, landmark.z);
      scene.add(tower);
      const clock = new THREE.Mesh(
        new THREE.CylinderGeometry(16, 16, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd166 }),
      );
      clock.rotation.x = Math.PI / 2;
      clock.position.set(landmark.x, 128, landmark.z + 18);
      scene.add(clock);
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(24, 30, 4),
        new THREE.MeshLambertMaterial({ color: 0x5a4a2a }),
      );
      top.position.set(landmark.x, 165, landmark.z);
      scene.add(top);
      const label = makeTextSprite("SAAT KULESİ", 0xffd166);
      label.position.set(landmark.x, 195, landmark.z);
      scene.add(label);
    } else if (landmark.kind === "stadium") {
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(170, 185, 42, 24),
        new THREE.MeshLambertMaterial({ color: 0xd8dce4 }),
      );
      bowl.position.set(landmark.x, 21, landmark.z);
      scene.add(bowl);
      const field = new THREE.Mesh(
        new THREE.CircleGeometry(150, 24),
        new THREE.MeshLambertMaterial({ color: 0x2f7d40 }),
      );
      field.rotation.x = -Math.PI / 2;
      field.position.set(landmark.x, 42.5, landmark.z);
      scene.add(field);
      const label = makeTextSprite("STADYUM", 0x69d18b);
      label.position.set(landmark.x, 75, landmark.z);
      scene.add(label);
    }
  }

  // Kaldırımlar: yol kenarlarında açık gri şeritler (instanced)
  const curbGeo = new THREE.BoxGeometry(1, 0.5, 1);
  const curbMat = new THREE.MeshLambertMaterial({ color: 0x39424f });
  const curbCount = (CITY_SIZE / ROAD_STEP + 1) * 4;
  const curbs = new THREE.InstancedMesh(curbGeo, curbMat, curbCount);
  let curbIndex = 0;
  for (let k = 0; k <= CITY_SIZE / ROAD_STEP; k += 1) {
    for (const off of [-ROAD_HALF - 7, ROAD_HALF + 7]) {
      dummy.scale.set(CITY_SIZE, 1, 12);
      dummy.position.set(half, 0.25, k * ROAD_STEP + off);
      dummy.updateMatrix();
      curbs.setMatrixAt(curbIndex++, dummy.matrix);
      dummy.scale.set(12, 1, CITY_SIZE);
      dummy.position.set(k * ROAD_STEP + off, 0.25, half);
      dummy.updateMatrix();
      curbs.setMatrixAt(curbIndex++, dummy.matrix);
    }
  }
  scene.add(curbs);

  // Sokak lambaları (kavşaklarda küçük ışıklı direkler)
  const lampGeo = new THREE.CylinderGeometry(0.5, 0.5, 14, 5);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x3a4252 });
  const lampBulbGeo = new THREE.SphereGeometry(1.4, 6, 5);
  const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const lampPositions = [];
  for (let i = 1; i < CITY_SIZE / ROAD_STEP; i += 2) {
    for (let j = 1; j < CITY_SIZE / ROAD_STEP; j += 2) {
      lampPositions.push([i * ROAD_STEP + ROAD_HALF + 6, j * ROAD_STEP + ROAD_HALF + 6]);
    }
  }
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampPositions.length);
  const bulbs = new THREE.InstancedMesh(lampBulbGeo, lampBulbMat, lampPositions.length);
  lampPositions.forEach(([lx, lz], i) => {
    dummy.scale.set(1, 1, 1);
    dummy.position.set(lx, 7, lz);
    dummy.updateMatrix();
    lamps.setMatrixAt(i, dummy.matrix);
    dummy.position.set(lx, 14.5, lz);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  });
  scene.add(lamps);
  scene.add(bulbs);

  // Etkinlik bölgeleri (yanıp sönen zemin + kenar çizgisi + etiket)
  refs.raceZone = addZoneMesh(scene, state.zones.race, 0x35d2ff, "YARIŞ ALANI");
  refs.ttZone = addZoneMesh(scene, state.zones.tt, 0xffd166, "ZAMANA KARŞI");

  // Checkpoint halkaları (yarış + TT rotaları)
  refs.rings.race = state.routes.race.map((p, i) => addRing(scene, p.x, 0, p.z, 45, i === 0 ? 0xffffff : 0x35d2ff));
  refs.rings.tt = state.routes.tt.map((p, i) => addRing(scene, p.x, 0, p.z, 45, i === 0 ? 0xffffff : 0xffd166));

  return { scene, refs };
}

function addZoneMesh(scene, zone, colorHex, label) {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(zone.w, zone.h),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(zone.x + zone.w / 2, 0.5, zone.z + zone.h / 2);
  group.add(floor);

  const borderGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(zone.x, 1, zone.z),
    new THREE.Vector3(zone.x + zone.w, 1, zone.z),
    new THREE.Vector3(zone.x + zone.w, 1, zone.z + zone.h),
    new THREE.Vector3(zone.x, 1, zone.z + zone.h),
    new THREE.Vector3(zone.x, 1, zone.z),
  ]);
  const border = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: colorHex }));
  group.add(border);

  const labelSprite = makeTextSprite(label, colorHex);
  labelSprite.position.set(zone.x + zone.w / 2, 30, zone.z + zone.h / 2);
  group.add(labelSprite);
  scene.add(group);
  return group;
}

function makeTextSprite(text, colorHex) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  g.font = "bold 64px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "#000";
  g.shadowBlur = 16;
  g.fillStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
  g.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(90, 22.5, 1);
  return sprite;
}

function addRing(scene, x, h, z, radius, colorHex) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 3, 8, 24),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 }),
  );
  ring.position.set(x, h + radius + 4, z);
  ring.visible = false;
  scene.add(ring);
  return ring;
}

// --- Akrobasi ve öğretici sahneleri ----------------------------------------

function buildFlatScene(mapKey, groundColor) {
  const scene = makeBaseScene();
  const refs = { rings: [] };
  const mapSize = MAPS[mapKey];
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(mapSize.w, mapSize.h),
    new THREE.MeshLambertMaterial({ color: groundColor }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(mapSize.w / 2, 0, mapSize.h / 2);
  scene.add(ground);

  // Kenar çiti
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0xff5b6e });
  const fenceGeoH = new THREE.BoxGeometry(mapSize.w, 6, 2);
  const fenceGeoV = new THREE.BoxGeometry(2, 6, mapSize.h);
  for (const [geo, x, z] of [
    [fenceGeoH, mapSize.w / 2, 6],
    [fenceGeoH, mapSize.w / 2, mapSize.h - 6],
    [fenceGeoV, 6, mapSize.h / 2],
    [fenceGeoV, mapSize.w - 6, mapSize.h / 2],
  ]) {
    const fence = new THREE.Mesh(geo, fenceMat);
    fence.position.set(x, 3, z);
    scene.add(fence);
  }
  return { scene, refs };
}

function makeRampMesh(ramp) {
  // Takla rampası: +x yönünde yükselen kama
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  const w = ramp.w;
  const h = ramp.h;
  const height = 26;
  // Kama prizması (taban x-z, yükseklik y, +x ucunda tepe)
  const vertices = new Float32Array([
    0, 0, 0, w, height, 0, w, 0, 0, // yan yüz A
    0, 0, h, w, height, h, 0, 0, 0, // taban kenarı
    0, 0, h, w, 0, h, w, height, h, // yan yüz B
    w, 0, 0, w, height, 0, w, height, h, // arka dik yüz
    w, 0, 0, w, height, h, w, 0, h,
    0, 0, 0, 0, 0, h, w, 0, h, // taban
    0, 0, 0, w, 0, h, w, 0, 0,
  ]);
  geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x8a6a2a }));
  group.add(mesh);
  // Eğim yüzeyi şeridi (neon)
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.hypot(w, height) - 4, h * 0.35),
    new THREE.MeshBasicMaterial({ color: 0xffd166 }),
  );
  stripe.position.set(w / 2, height / 2 + 0.4, h / 2);
  stripe.rotation.x = -Math.PI / 2;
  stripe.rotation.z = -Math.atan2(height, w);
  // Eğim yüzeyine yasla
  stripe.rotation.order = "ZYX";
  stripe.rotation.set(-Math.PI / 2, Math.atan2(height, w), 0);
  stripe.position.y = height / 2 + 0.6;
  group.add(stripe);
  group.position.set(ramp.x, 0, ramp.z);
  return group;
}

function buildStuntScene() {
  const { scene, refs } = buildFlatScene("stunt", 0x1d1830);
  for (const ramp of STUNT_RAMPS) scene.add(makeRampMesh(ramp));
  refs.stuntRings = STUNT_RINGS.map((ring) => {
    const mesh = addRing(scene, ring.x, ring.h, ring.z, ring.r, 0xff8fd6);
    mesh.visible = true;
    return mesh;
  });
  return { scene, refs };
}

function buildTutorialScene() {
  const { scene, refs } = buildFlatScene("tutorial", 0x16301f);
  scene.add(makeRampMesh(TUT_RAMP));
  refs.tutCheckpoint = addRing(scene, TUT_CHECKPOINT.x, 0, TUT_CHECKPOINT.z, 45, 0x35d2ff);
  refs.tutFinish = addRing(scene, TUT_FINISH.x, 0, TUT_FINISH.z, 45, 0x69d18b);
  const label = makeTextSprite("ÖĞRETİCİ", 0xffd166);
  label.position.set(MAPS.tutorial.w / 2, 40, 120);
  scene.add(label);
  return { scene, refs };
}

// --- Buzlu Zemin sahnesi ----------------------------------------------------

const ICE_TILE_COLORS = [0xcfeaff, 0x8fc8ee, 0x4a90b8]; // hp 3, 2, 1

function buildIceScene() {
  const scene = makeBaseScene();
  scene.background = new THREE.Color(0x0e2030);
  scene.fog = new THREE.Fog(0x0e2030, FOG_NEAR, FOG_FAR);
  const refs = { tiles: null };

  // Su (pistin altı/çevresi)
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(MAPS.ice.w, MAPS.ice.h),
    new THREE.MeshLambertMaterial({ color: 0x0e3a5c }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(MAPS.ice.w / 2, -30, MAPS.ice.h / 2);
  scene.add(water);

  // Karolar: InstancedMesh 30x30
  const tileGeo = new THREE.BoxGeometry(ICE.tileSize - 3, 6, ICE.tileSize - 3);
  const tileMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const count = ICE.tiles * ICE.tiles;
  const mesh = new THREE.InstancedMesh(tileGeo, tileMat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const tile = ice.tiles[i];
    dummy.position.set(tile.cx, -3, tile.cz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHex(ICE_TILE_COLORS[0]);
    mesh.setColorAt(i, color);
  }
  scene.add(mesh);
  refs.tiles = mesh;

  const label = makeTextSprite("BUZLU ZEMİN", 0x8cd8ff);
  label.position.set(MAPS.ice.w / 2, 50, ICE.origin - 120);
  scene.add(label);
  return { scene, refs };
}

function resetIceTiles() {
  ice.tiles = [];
  for (let i = 0; i < ICE.tiles; i += 1) {
    for (let j = 0; j < ICE.tiles; j += 1) {
      ice.tiles.push({
        i,
        j,
        cx: ICE.origin + i * ICE.tileSize + ICE.tileSize / 2,
        cz: ICE.origin + j * ICE.tileSize + ICE.tileSize / 2,
        hp: 3,
        firstTouchedAt: 0,
        lastCrackAt: 0,
        falling: false,
        fallen: false,
        yOff: 0,
      });
    }
  }
  ice.broken = 0;
  ice.deaths = 0;
  ice.survivedMs = 0;
  ice.lastTick = 0;
  ice.lastFlush = 0;
  ice.fallingTiles = [];
}

function iceTileAt(x, z) {
  const i = Math.floor((x - ICE.origin) / ICE.tileSize);
  const j = Math.floor((z - ICE.origin) / ICE.tileSize);
  if (i < 0 || j < 0 || i >= ICE.tiles || j >= ICE.tiles) return null;
  return ice.tiles[i * ICE.tiles + j];
}

function updateIceTileMesh(tile) {
  const mesh = active?.refs?.tiles;
  if (!mesh) return;
  const dummy = new THREE.Object3D();
  const index = tile.i * ICE.tiles + tile.j;
  if (tile.fallen || tile.yOff < -60) {
    dummy.scale.set(0.001, 0.001, 0.001);
    dummy.position.set(tile.cx, -100, tile.cz);
  } else {
    dummy.position.set(tile.cx, -3 + tile.yOff, tile.cz);
    dummy.scale.set(1, 1, 1);
  }
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;
  const color = new THREE.Color();
  color.setHex(ICE_TILE_COLORS[clamp(3 - Math.max(tile.hp, 1), 0, 2)]);
  mesh.setColorAt(index, color);
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// --- Sahne önbelleği ve aktif sahne ----------------------------------------

const sceneCache = {};
let active = null; // { scene, refs }

function setActiveMap(mapKey) {
  if (!sceneCache[mapKey]) {
    if (mapKey === "city") sceneCache.city = buildCityScene();
    else if (mapKey === "stunt") sceneCache.stunt = buildStuntScene();
    else if (mapKey === "ice") sceneCache.ice = buildIceScene();
    else sceneCache.tutorial = buildTutorialScene();
  }
  active = sceneCache[mapKey];
  applyFog(active.scene);
  // Araba meshleri aktif sahneye taşınır
  if (selfCar.mesh) active.scene.add(selfCar.mesh);
  if (selfCar.shadow) active.scene.add(selfCar.shadow);
  if (selfCar.tag) active.scene.add(selfCar.tag);
  for (const remote of state.remotes.values()) attachRemoteMeshes(remote);
  for (const bot of state.bots) attachBotMeshes(bot);
}

// --- Araba modelleri --------------------------------------------------------

function buildCarMesh(carId, colorHex) {
  const stats = CARS.find((item) => item.id === carId) || CARS[0];
  const body = stats.body;
  const group = new THREE.Group();
  const mainColor = new THREE.Color(colorHex || stats.color);

  const bodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(body.len, body.hei, body.wid),
    new THREE.MeshLambertMaterial({ color: mainColor }),
  );
  bodyMesh.position.y = 1.3;
  group.add(bodyMesh);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(body.len * 0.45, body.cab, body.wid * 0.8),
    new THREE.MeshLambertMaterial({ color: 0x11161f }),
  );
  cabin.position.set(-body.len * 0.05, 1.3 + body.hei / 2 + body.cab / 2, 0);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.7, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x15181d });
  const wx = body.len / 2 - 1.4;
  const wz = body.wid / 2;
  for (const [px, pz] of [
    [wx, wz],
    [wx, -wz],
    [-wx, wz],
    [-wx, -wz],
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(px, 0.9, pz);
    group.add(wheel);
  }

  if (body.spoiler) {
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.25, body.wid * 0.9),
      new THREE.MeshLambertMaterial({ color: mainColor }),
    );
    spoiler.position.set(-body.len / 2 + 0.4, 2.6, 0);
    group.add(spoiler);
  }

  // Farlar
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const pz of [body.wid / 3, -body.wid / 3]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.8), lightMat);
    lamp.position.set(body.len / 2 + 0.05, 1.2, pz);
    group.add(lamp);
  }
  return group;
}

function makeNameTag(nickname, isSelf) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const g = c.getContext("2d");
  g.font = "bold 34px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 6;
  g.strokeStyle = "rgba(0,0,0,0.8)";
  g.strokeText(nickname, 128, 32);
  g.fillStyle = isSelf ? "#ffd166" : "#f7f4ea";
  g.fillText(nickname, 128, 32);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }),
  );
  sprite.scale.set(20, 5, 1);
  return sprite;
}

function makeBlobShadow() {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

const selfCar = { mesh: null, tag: null, shadow: null, carId: "" };

function rebuildSelfCar() {
  const carId = state.profile.selectedCar;
  if (selfCar.carId === carId && selfCar.mesh) return;
  if (selfCar.mesh) {
    selfCar.mesh.parent?.remove(selfCar.mesh);
    selfCar.tag?.parent?.remove(selfCar.tag);
    selfCar.shadow?.parent?.remove(selfCar.shadow);
  }
  selfCar.carId = carId;
  selfCar.mesh = buildCarMesh(carId, carStats().color);
  selfCar.tag = makeNameTag(state.nickname || "Ben", true);
  selfCar.shadow = makeBlobShadow();
  if (active) {
    active.scene.add(selfCar.mesh);
    active.scene.add(selfCar.tag);
    active.scene.add(selfCar.shadow);
  }
}

function attachRemoteMeshes(remote) {
  if (!remote.mesh) {
    remote.mesh = buildCarMesh(remote.carId || "minik", remote.color);
    remote.tag = makeNameTag(remote.nickname, false);
    remote.shadow = makeBlobShadow();
  }
  active.scene.add(remote.mesh);
  active.scene.add(remote.tag);
  active.scene.add(remote.shadow);
}

function removeRemoteMeshes(remote) {
  remote.mesh?.parent?.remove(remote.mesh);
  remote.tag?.parent?.remove(remote.tag);
  remote.shadow?.parent?.remove(remote.shadow);
  remote.mesh = null;
  remote.tag = null;
  remote.shadow = null;
}

function attachBotMeshes(bot) {
  if (!bot.mesh) {
    bot.mesh = buildCarMesh("minik", bot.color);
    bot.tag = makeNameTag(bot.nickname, false);
    bot.shadow = makeBlobShadow();
  }
  active.scene.add(bot.mesh);
  active.scene.add(bot.tag);
  active.scene.add(bot.shadow);
}

function removeBotMeshes() {
  for (const bot of state.bots) {
    bot.mesh?.parent?.remove(bot.mesh);
    bot.tag?.parent?.remove(bot.tag);
    bot.shadow?.parent?.remove(bot.shadow);
    bot.mesh = null;
    bot.tag = null;
    bot.shadow = null;
  }
}

// --- Kamera -----------------------------------------------------------------

const camPos = new THREE.Vector3(3000, 60, 2900);
const camTarget = new THREE.Vector3(3000, 0, 3000);

function updateCamera3D(dt) {
  // Kilit yoksa kamera yumuşakça arabanın arkasına döner
  if (!state.pointerLocked && state.camYawOffset !== 0) {
    state.camYawOffset *= Math.max(0, 1 - 4 * dt);
    if (Math.abs(state.camYawOffset) < 0.01) state.camYawOffset = 0;
  }
  const viewAngle = car.angle + state.camYawOffset;
  const fx = Math.cos(viewAngle);
  const fz = Math.sin(viewAngle);
  const dist = 26 + Math.abs(car.speed) * 0.014;
  const height = 13 + Math.max(0, car.h) * 0.5;
  const wantX = car.x - fx * dist;
  const wantZ = car.z - fz * dist;
  const wantY = Math.max(0, car.h) + height;
  const t = 1 - Math.exp(-6 * dt);
  camPos.x += (wantX - camPos.x) * t;
  camPos.y += (wantY - camPos.y) * t;
  camPos.z += (wantZ - camPos.z) * t;
  camera.position.copy(camPos);
  camTarget.set(car.x + fx * 16, Math.max(0, car.h) + 3, car.z + fz * 16);
  camera.lookAt(camTarget);
}

// --- Otomatik kalite düşürme -------------------------------------------------

let fpsAccum = 0;
let fpsFrames = 0;
let fpsWindowStart = performance.now();

function autoQuality(nowMs) {
  fpsFrames += 1;
  if (state.lowQuality) return;
  if (nowMs - fpsWindowStart >= 2500) {
    const fps = fpsFrames / ((nowMs - fpsWindowStart) / 1000);
    fpsFrames = 0;
    fpsWindowStart = nowMs;
    fpsAccum = fps;
    if (fps > 0 && fps < 42) {
      state.lowQuality = true;
      renderer.setPixelRatio(1);
      for (const entry of Object.values(sceneCache)) applyFog(entry.scene);
      console.info("[yaris-sehri] düşük fps algılandı, kalite düşürüldü");
    }
  }
}

// --- Minimap (2D overlay) ---------------------------------------------------

let minimapLastDraw = 0;

function drawMinimap(nowMs) {
  if (state.screen !== "game" || nowMs - minimapLastDraw < 200) return;
  minimapLastDraw = nowMs;
  const mapSize = currentMapSize();
  const scale = minimap.width / Math.max(mapSize.w, mapSize.h);
  const g = minimapCtx;
  g.clearRect(0, 0, minimap.width, minimap.height);
  g.fillStyle = "rgba(10,14,20,0.9)";
  g.fillRect(0, 0, minimap.width, minimap.height);
  if (state.map === "city") {
    // Bölgeler kabaca renkli
    const block = 600 * scale;
    for (let bi = 0; bi < 9; bi += 1) {
      for (let bj = 0; bj < 9; bj += 1) {
        const district = districtOf(bi, bj);
        g.fillStyle = {
          downtown: "rgba(90,130,200,0.35)",
          residential: "rgba(140,110,70,0.3)",
          industrial: "rgba(120,120,130,0.3)",
          plaza: "rgba(255,209,102,0.4)",
          stadium: "rgba(105,209,139,0.4)",
        }[district] || "rgba(60,80,60,0.3)";
        g.fillRect((bi * 600 + 75) * scale, (bj * 600 + 75) * scale, block - 75 * scale, block - 75 * scale);
      }
    }
    // Liman (doğu kenarı su)
    g.fillStyle = "rgba(60,140,190,0.5)";
    g.fillRect(5460 * scale, 0, (CITY_SIZE - 5460) * scale, CITY_SIZE * scale);
    g.fillStyle = "rgba(53,210,255,0.5)";
    g.fillRect(state.zones.race.x * scale, state.zones.race.z * scale, state.zones.race.w * scale, state.zones.race.h * scale);
    g.fillStyle = "rgba(255,209,102,0.5)";
    g.fillRect(state.zones.tt.x * scale, state.zones.tt.z * scale, state.zones.tt.w * scale, state.zones.tt.h * scale);
  } else if (state.map === "ice") {
    g.fillStyle = "rgba(30,80,120,0.6)";
    g.fillRect(0, 0, minimap.width, minimap.height);
    g.fillStyle = "rgba(190,230,255,0.8)";
    g.fillRect(ICE.origin * scale, ICE.origin * scale, ICE.tiles * ICE.tileSize * scale, ICE.tiles * ICE.tileSize * scale);
    // Kırılan karolar koyu görünür
    g.fillStyle = "rgba(14,58,92,0.9)";
    for (const tile of ice.tiles) {
      if (tile.fallen || tile.falling) {
        g.fillRect((tile.cx - 30) * scale, (tile.cz - 30) * scale, 60 * scale, 60 * scale);
      }
    }
  }
  for (const remote of state.remotes.values()) {
    g.fillStyle = remote.color;
    g.fillRect(remote.x * scale - 1.5, remote.z * scale - 1.5, 3, 3);
  }
  for (const bot of state.bots) {
    g.fillStyle = bot.color;
    g.fillRect(bot.x * scale - 1.5, bot.z * scale - 1.5, 3, 3);
  }
  g.fillStyle = "#ffffff";
  g.fillRect(car.x * scale - 2, car.z * scale - 2, 4, 4);
}

// ---------------------------------------------------------------------------
// Giriş akışı: resume -> kayıt/giriş -> misafir
// ---------------------------------------------------------------------------

async function tryResume() {
  // Dönüş: "ok" | "no-account" | "network-error"
  // "no-account" SADECE sunucu kesin 401 döndüğünde; ağ hatası hesap yok demek değildir.
  const authToken = localStorage.getItem(TOKEN_KEY);
  if (!authToken || location.protocol === "file:") return "no-account";
  try {
    const response = await fetch("/api/auth/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, authToken }),
    });
    if (!response.ok) return "no-account";
    const data = await response.json();
    if (!data.account) return "no-account";
    account = data.account;
    if (data.authToken) localStorage.setItem(TOKEN_KEY, data.authToken);
    state.nickname = account.nickname || state.nickname;
    return "ok";
  } catch {
    return "network-error";
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
    // DİKKAT: authToken bilerek silinmiyor — kayıtlı hesap bir sonraki açılışta
    // yine resume edilebilsin (misafir geçici moddur, hesabı unutturmaz).
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
  document.querySelector("#modeIceBtn").addEventListener("click", () => startGame("ice"));
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
    countdownEl.hidden = true;
  });

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
      <div class="stat-label">Hız</div><div class="stat-bar"><i style="width:${Math.round((carItem.maxSpeed / 860) * 100)}%"></i></div>
      <div class="stat-label">Kalkış</div><div class="stat-bar"><i style="width:${Math.round((carItem.accel / 640) * 100)}%"></i></div>
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
  state.map = mode === "stunt" ? "stunt" : mode === "tutorial" ? "tutorial" : mode === "ice" ? "ice" : "city";
  const spawn = MAPS[state.map].spawn;
  car.x = spawn.x;
  car.z = spawn.z;
  car.h = 0;
  car.vh = 0;
  car.vx = 0;
  car.vz = 0;
  car.falling = false;
  car.angle = spawn.angle;
  car.speed = 0;
  car.airDist = 0;
  camPos.set(car.x - Math.cos(car.angle) * 26, 40, car.z - Math.sin(car.angle) * 26);
  resetRace();
  tt.running = false;
  tutorialPanel.hidden = true;
  stuntPanel.hidden = true;
  icePanel.hidden = true;
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
  } else if (mode === "ice") {
    resetIceTiles();
    state.online = false;
    updateStatusDot();
  } else if (mode === "open") {
    state.joinMode = opts.joinMode || "public";
    state.joinCode = opts.joinCode || "";
    connectOpenWorld();
  }

  rebuildSelfCar();
  setActiveMap(state.map);
  if (mode === "ice") for (const tile of ice.tiles) updateIceTileMesh(tile);
  showScreen("game");
  // Her modda fare kilidi: mod butonu tıklaması kullanıcı hareketi sayılır.
  // (Öğretici ilk girişte async akıştan gelir; reddedilirse canvas'a tıklayınca kilitlenir.)
  requestGamePointerLock();
  clearTimeout(startGame.hintTimer);
  showBanner("🖱️ Fare kilitlendi — kamerayı fareyle çevir, ESC ile çık");
  startGame.hintTimer = setTimeout(() => showBanner(""), 3500);
}

function requestGamePointerLock() {
  try {
    canvas.requestPointerLock?.();
  } catch {}
}

function exitToModes(note = "") {
  if (state.mode === "stunt") flushStuntScore(true);
  if (state.mode === "ice") flushIceScore(true);
  try {
    document.exitPointerLock?.();
  } catch {}
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
  for (const remote of state.remotes.values()) removeRemoteMeshes(remote);
  state.remotes.clear();
  removeBotMeshes();
  state.bots = [];
  resetRace();
  tt.running = false;
  tutorialPanel.hidden = true;
  stuntPanel.hidden = true;
  icePanel.hidden = true;
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
      if (message.routes?.race?.length) state.routes.race = convertRoute(message.routes.race);
      if (message.routes?.tt?.length) state.routes.tt = convertRoute(message.routes.tt);
      const zones = convertZones(message.zones);
      if (zones) state.zones = zones;
      if (message.profile) applyProfile(message.profile);
      for (const remote of state.remotes.values()) removeRemoteMeshes(remote);
      state.remotes.clear();
      removeBotMeshes();
      state.bots = [];
      for (const player of message.players || []) {
        if (player.id !== state.selfId) upsertRemote(player);
      }
      tt.scores = message.ttScores?.length ? message.ttScores : tt.scores;
      applyRaceState(message.race);
      showBanner("");
      updateStatusDot();
      if (state.ranked) {
        state.mode = "ranked";
        state.map = "city";
        document.querySelector("#rankedBox").hidden = true;
        const spawn = MAPS.city.spawn;
        car.x = spawn.x;
        car.z = spawn.z;
        car.h = 0;
        car.speed = 0;
        rebuildSelfCar();
        setActiveMap("city");
        showScreen("game");
        // Dereceli maç async bulunur; kilit reddedilirse canvas tıklaması yeterli.
        requestGamePointerLock();
        clearTimeout(startGame.hintTimer);
        showBanner("🖱️ Fare kilitlendiyse kamerayı fareyle çevir; değilse ekrana tıkla. ESC ile çıkılır.");
        startGame.hintTimer = setTimeout(() => showBanner(""), 3500);
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
        if (!seen.has(id)) {
          removeRemoteMeshes(state.remotes.get(id));
          state.remotes.delete(id);
        }
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
    existing.tz = player.y;
    existing.th = player.h || 0;
    existing.ta = player.a;
    existing.nickname = player.nickname;
    existing.color = player.color;
  } else {
    const remote = {
      x: player.x,
      z: player.y,
      h: player.h || 0,
      a: player.a,
      tx: player.x,
      tz: player.y,
      th: player.h || 0,
      ta: player.a,
      nickname: player.nickname,
      color: player.color,
      mesh: null,
      tag: null,
      shadow: null,
    };
    state.remotes.set(player.id, remote);
    if (active) attachRemoteMeshes(remote);
  }
}

// Konum yayını ~10Hz (3D: yükseklik h alanı da gönderilir)
setInterval(() => {
  if (!state.online || !state.joined || state.screen !== "game") return;
  sendWs({
    type: "pos",
    x: Math.round(car.x),
    y: Math.round(car.z),
    h: Math.round(car.h * 10) / 10,
    a: Number(car.angle.toFixed(3)),
    s: Math.round(Math.abs(car.speed)),
  });
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
  if (serverRace.route?.length) state.routes.race = convertRoute(serverRace.route);
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
  const dirAngle = Math.atan2(next.z - start.z, next.x - start.x);
  const index = Math.max(0, race.lobby.findIndex((p) => p.id === state.selfId));
  const back = 60 + Math.floor(index / 2) * 50;
  const side = (index % 2 === 0 ? -1 : 1) * 30;
  car.x = start.x - Math.cos(dirAngle) * back + Math.cos(dirAngle + Math.PI / 2) * side;
  car.z = start.z - Math.sin(dirAngle) * back + Math.sin(dirAngle + Math.PI / 2) * side;
  car.angle = dirAngle;
  car.speed = 0;
  car.h = 0;
  car.vh = 0;
}

function updateRacePanel() {
  if (state.ranked) {
    racePanel.hidden = true;
    return;
  }
  if (!state.joined) {
    racePanel.hidden = true;
    return;
  }
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
  if (!state.joined || state.mode === "stunt" || state.mode === "tutorial" || state.mode === "ice") {
    countdownEl.hidden = true;
    return;
  }
  const now = Date.now();

  // Geri sayım overlay'i: yalnızca gerçekten countdown/race-start anında görünür,
  // diğer TÜM durumlarda gizlenir (yarış sonrası takılma hatası düzeltmesi).
  const inCountdown = race.phase === "countdown" && isInRace();
  const justStarted =
    race.phase === "running" && isInRace() && race.startedAt && performance.now() - race.startedAt < 900;
  if (inCountdown) {
    const left = Math.ceil((race.startsAt - now) / 1000);
    countdownEl.hidden = false;
    countdownEl.textContent = left > 0 ? String(left) : "BAŞLA!";
  } else if (justStarted) {
    countdownEl.hidden = false;
    countdownEl.textContent = "BAŞLA!";
    // Güvenlik: "BAŞLA!" en geç 1.5 sn sonra kendini gizlesin.
    clearTimeout(raceTick.hideTimer);
    raceTick.hideTimer = setTimeout(() => {
      countdownEl.hidden = true;
    }, 1500);
  } else {
    countdownEl.hidden = true;
  }

  if (!state.ranked && (race.phase === "idle" || race.phase === "lobby")) {
    const inside = inZone(car.x, car.z, state.zones.race);
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
    if (Math.hypot(car.x - target.x, car.z - target.z) < CP_RADIUS) {
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

function tryStartTimeTrial() {
  // TT artık F tuşuyla başlar; otomatik başlama yok.
  if (state.mode !== "open" || tt.running) return;
  const nowMs = performance.now();
  if (nowMs <= tt.cooldownUntil) return;
  if (!inZone(car.x, car.z, state.zones.tt, 100)) return;
  tt.running = true;
  tt.next = 1;
  tt.startAt = nowMs;
  ttInfo.textContent = "Süre işliyor! Checkpoint'leri sırayla geç.";
  // Fare kilidi kullanıcı hareketi (F tuşu) içinde istenmeli; reddedilirse TT yine de sürer.
  try {
    canvas.requestPointerLock?.();
  } catch {}
}

function ttTick(nowMs) {
  if (state.mode !== "open") {
    ttPanel.hidden = true;
    return;
  }
  const route = state.routes.tt;
  const inside = inZone(car.x, car.z, state.zones.tt, 100);
  ttPanel.hidden = !inside && !tt.running;
  if (inside || tt.running) renderTtScores();

  const start = route[0];
  const nearStart = Math.hypot(car.x - start.x, car.z - start.z) < CP_RADIUS;

  if (!tt.running) {
    if (inside) {
      ttInfo.textContent = "Başlamak için F'ye bas! Bitirince 🪙10, rekor kırarsan 🪙20. (F fare kilidini de açar, ESC ile çıkılır)";
    }
    return;
  }

  if (tt.next >= route.length) {
    if (nearStart && nowMs > tt.cooldownUntil) {
      const timeMs = Math.round(nowMs - tt.startAt);
      tt.lastTime = timeMs;
      tt.running = false;
      tt.cooldownUntil = nowMs + 4000;
      try {
        document.exitPointerLock?.();
      } catch {}
      if (state.online) {
        sendWs({ type: "tt-finish", timeMs });
      } else {
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
    if (Math.hypot(car.x - cp.x, car.z - cp.z) < CP_RADIUS) {
      tt.next += 1;
      if (tt.next >= route.length) tt.cooldownUntil = 0;
    }
  }
  ttInfo.textContent = `Checkpoint ${tt.next}/${route.length} · ${formatTime(nowMs - tt.startAt)}`;
}

function applyTtReward(message) {
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
  if (tutorial.step === 0 && Math.abs(car.speed) > 200) {
    tutorial.step = 1;
    updateTutorialPanel();
    showScorePop("Harika!");
  } else if (tutorial.step === 1 && Math.hypot(car.x - TUT_CHECKPOINT.x, car.z - TUT_CHECKPOINT.z) < TUT_CHECKPOINT.r) {
    tutorial.step = 2;
    updateTutorialPanel();
    showScorePop("Checkpoint geçildi!");
  } else if (tutorial.step === 2 && car.airDist > 80) {
    tutorial.step = 3;
    updateTutorialPanel();
    showScorePop("Uçtun!");
  } else if (tutorial.step === 3 && Math.hypot(car.x - TUT_FINISH.x, car.z - TUT_FINISH.z) < TUT_FINISH.r) {
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
  if (car.h > 3) {
    for (const ring of STUNT_RINGS) {
      if (nowMs <= ring.until) continue;
      const dist = Math.hypot(car.x - ring.x, car.z - ring.z, car.h + 2 - ring.h);
      if (dist < ring.r) {
        ring.until = nowMs + 30000;
        addStuntScore(100, "+100 Halka!");
      }
    }
  }
}

function onLanding() {
  if (car.airDist > 100) {
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
  removeBotMeshes();
  state.bots = names.map((name, i) => ({
    nickname: name,
    color: ["#69d18b", "#ff9f43", "#b67dff", "#ff8fd6"][i % 4],
    x: route[i % route.length].x,
    z: route[i % route.length].z,
    angle: 0,
    speed: 0,
    wp: (i + 1) % route.length,
    topSpeed: 240 + i * 30,
    mesh: null,
    tag: null,
    shadow: null,
  }));
  if (active) for (const bot of state.bots) attachBotMeshes(bot);
}

function updateBots(dt) {
  const route = LOCAL_RACE_ROUTE;
  for (const bot of state.bots) {
    const target = route[bot.wp];
    const want = Math.atan2(target.z - bot.z, target.x - bot.x);
    let diff = want - bot.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    bot.angle += clamp(diff, -2.2 * dt, 2.2 * dt);
    bot.speed += (bot.topSpeed - bot.speed) * 0.8 * dt;
    bot.x += Math.cos(bot.angle) * bot.speed * dt;
    bot.z += Math.sin(bot.angle) * bot.speed * dt;
    if (Math.hypot(bot.x - target.x, bot.z - target.z) < 100) {
      bot.wp = (bot.wp + 1) % route.length;
    }
    if (bot.mesh) {
      bot.mesh.position.set(bot.x, 0, bot.z);
      bot.mesh.rotation.y = -bot.angle;
      bot.tag.position.set(bot.x, 7, bot.z);
      bot.shadow.position.set(bot.x, 0.06, bot.z);
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

// Odak kaybında basılı kalan tuşları sıfırla (WASD takılma hatası).
// Not: e.code kullanılıyor (KeyW/KeyA...), Türkçe klavye düzeninden etkilenmez.
function resetInput() {
  input.gas = false;
  input.brake = false;
  input.left = false;
  input.right = false;
}

window.addEventListener("blur", resetInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetInput();
});
window.addEventListener("focus", resetInput);
document.addEventListener("pointerlockchange", () => {
  state.pointerLocked = document.pointerLockElement === canvas;
  if (!state.pointerLocked) resetInput();
});

window.addEventListener("keydown", (event) => {
  // TT: bölgedeyken F ile başlat + fare kilidi iste
  if (event.code === "KeyF" && state.screen === "game" && state.mode === "open") {
    tryStartTimeTrial();
    return;
  }
  const key = KEYMAP[event.code];
  if (!key) return;
  input[key] = true;
  if (state.screen === "game") event.preventDefault();
});
window.addEventListener("keyup", (event) => {
  const key = KEYMAP[event.code];
  if (key) input[key] = false;
});

// Fare kilidi aktifken yatay fare hareketi kamerayı çevirir (mouse-look) — tüm modlarda
document.addEventListener("mousemove", (event) => {
  if (!state.pointerLocked || state.screen !== "game") return;
  state.camYawOffset = clamp(state.camYawOffset + (event.movementX || 0) * 0.004, -Math.PI, Math.PI);
});

// Kilit reddedildiyse/koptuysa: oyun ekranına tıklayınca tekrar kilitlenir
canvas.addEventListener("click", () => {
  if (state.screen === "game" && !state.pointerLocked) requestGamePointerLock();
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
// 3D fizik
// ---------------------------------------------------------------------------

function updateCar(dt) {
  if (state.map === "ice") {
    updateCarIce(dt);
    return;
  }
  const mapSize = currentMapSize();

  // Havada: balistik uçuş
  if (car.h > 0 || car.vh > 0) {
    car.h += car.vh * dt;
    car.vh -= GRAVITY * dt;
    // Havada hafif direksiyon
    const airSteer = ((input.left ? -1 : 0) + (input.right ? 1 : 0)) * 0.35;
    if (airSteer) {
      car.angle += airSteer * dt;
      const spd = Math.hypot(car.vx, car.vz);
      car.vx = Math.cos(car.angle) * spd;
      car.vz = Math.sin(car.angle) * spd;
    }
    car.x = clamp(car.x + car.vx * dt, 20, mapSize.w - 20);
    car.z = clamp(car.z + car.vz * dt, 20, mapSize.h - 20);
    car.airDist += Math.hypot(car.vx, car.vz) * dt;
    if (car.h <= 0) {
      car.h = 0;
      car.vh = 0;
      car.speed = Math.hypot(car.vx, car.vz) * 0.88;
      car.angle = Math.atan2(car.vz, car.vx);
      onLanding();
    }
    return;
  }

  const stats = carStats();
  const offroad = !onRoad(car.x, car.z);
  const maxSpeed = stats.maxSpeed * (offroad ? 0.45 : 1);
  if (input.gas) {
    car.speed += stats.accel * dt;
  } else if (input.brake) {
    car.speed -= car.speed > 5 ? 530 * dt : 220 * dt;
  } else {
    car.speed -= car.speed * 1.3 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  car.speed -= car.speed * 0.35 * dt;
  car.speed = clamp(car.speed, -200, maxSpeed);

  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const steerPower = stats.grip * Math.min(1, Math.abs(car.speed) / 150);
  car.angle += steer * steerPower * dt * (car.speed < 0 ? -1 : 1);

  const nx = clamp(car.x + Math.cos(car.angle) * car.speed * dt, 20, mapSize.w - 20);
  const nz = clamp(car.z + Math.sin(car.angle) * car.speed * dt, 20, mapSize.h - 20);

  if (!hitBuilding(nx, car.z)) {
    car.x = nx;
  } else {
    car.speed *= 0.55;
  }
  if (!hitBuilding(car.x, nz)) {
    car.z = nz;
  } else {
    car.speed *= 0.55;
  }

  // Rampa kontrolü: taban alanına hızla giriş = fırlatma
  const nowMs = performance.now();
  const ramps = state.map === "stunt" ? STUNT_RAMPS : state.map === "tutorial" ? [TUT_RAMP] : [];
  if (car.speed > 300) {
    for (const ramp of ramps) {
      if (nowMs < ramp.until) continue;
      if (car.x > ramp.x - 10 && car.x < ramp.x + ramp.w + 10 && car.z > ramp.z - 10 && car.z < ramp.z + ramp.h + 10) {
        ramp.until = nowMs + 1500;
        car.vh = car.speed * 0.45;
        car.vx = Math.cos(car.angle) * car.speed;
        car.vz = Math.sin(car.angle) * car.speed;
        car.h = 0.1;
        car.airDist = 0;
        showScorePop("Uçuş!");
        break;
      }
    }
  }
}

// Buzlu Zemin: kaygan fizik (hız vektörü açıya yavaş oturur = drift)
function updateCarIce(dt) {
  const mapSize = MAPS.ice;

  if (car.falling) {
    car.vh -= GRAVITY * dt;
    car.h += car.vh * dt;
    car.x += car.vx * dt;
    car.z += car.vz * dt;
    if (car.h < -90) iceDeath();
    return;
  }

  const stats = carStats();
  const spd = Math.hypot(car.vx, car.vz);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  // Buzda direksiyon hız vektörünü değil araba açısını döndürür; hız vektörü kayar
  car.angle += steer * stats.grip * 1.15 * Math.min(1, spd / 150) * dt;

  let thrust = 0;
  if (input.gas) thrust = stats.accel * 0.8;
  else if (input.brake) thrust = spd > 20 ? -stats.accel * 0.9 : -stats.accel * 0.35;
  car.vx += Math.cos(car.angle) * thrust * dt;
  car.vz += Math.sin(car.angle) * thrust * dt;

  // Çok düşük sürtünme (kaygan buz)
  car.vx *= 1 - 0.18 * dt;
  car.vz *= 1 - 0.18 * dt;
  const maxSpeed = stats.maxSpeed * 0.9;
  const ns = Math.hypot(car.vx, car.vz);
  if (ns > maxSpeed) {
    car.vx *= maxSpeed / ns;
    car.vz *= maxSpeed / ns;
  }
  car.x = clamp(car.x + car.vx * dt, 20, mapSize.w - 20);
  car.z = clamp(car.z + car.vz * dt, 20, mapSize.h - 20);
  car.speed = ns;

  // Kırık karo / pist dışı = düşüş
  const tile = iceTileAt(car.x, car.z);
  if (!tile || tile.fallen) {
    car.falling = true;
    car.vh = 0;
    showScorePop(tile ? "Buz kırıldı!" : "Suya düştün!");
  }
}

function iceDeath() {
  ice.deaths += 1;
  showScorePop("Düştün! Yeniden doğdun.");
  // Respawn: düşmemiş en yakın karoya
  const spawn = MAPS.ice.spawn;
  let best = null;
  let bestDist = Infinity;
  for (const tile of ice.tiles) {
    if (tile.fallen || tile.falling || tile.hp <= 0) continue;
    const d = Math.hypot(tile.cx - spawn.x, tile.cz - spawn.z);
    if (d < bestDist) {
      bestDist = d;
      best = tile;
    }
  }
  car.x = best ? best.cx : spawn.x;
  car.z = best ? best.cz : spawn.z;
  car.h = 0;
  car.vh = 0;
  car.vx = 0;
  car.vz = 0;
  car.speed = 0;
  car.falling = false;
  car.angle = 0;
}

function iceScore() {
  return Math.max(0, Math.floor(ice.survivedMs / 100) + ice.broken * 25 + Math.max(0, 200 - ice.deaths * 50));
}

function iceTick(nowMs, dt) {
  if (state.mode !== "ice") {
    icePanel.hidden = true;
    return;
  }
  icePanel.hidden = false;

  // Hayatta kalma süresi (düşerken işlemez)
  if (ice.lastTick && !car.falling) ice.survivedMs += nowMs - ice.lastTick;
  ice.lastTick = nowMs;

  // Karo çatlama: ilk basıştan 1 sn sonra, üstünde durdukça çatlar
  const tile = iceTileAt(car.x, car.z);
  if (tile && !tile.fallen && !tile.falling && !car.falling) {
    if (!tile.firstTouchedAt) {
      tile.firstTouchedAt = nowMs;
    } else if (nowMs - tile.firstTouchedAt > ICE.graceMs && nowMs - tile.lastCrackAt > ICE.crackMs) {
      tile.lastCrackAt = nowMs;
      tile.hp -= 1;
      if (tile.hp <= 0) {
        tile.falling = true;
        ice.broken += 1;
        ice.fallingTiles.push(tile);
        showScorePop("Buz kırıldı!");
      }
      updateIceTileMesh(tile);
    }
  }

  // Düşen karoların animasyonu
  for (let k = ice.fallingTiles.length - 1; k >= 0; k -= 1) {
    const t = ice.fallingTiles[k];
    t.yOff -= 260 * dt;
    if (t.yOff < -70) {
      t.fallen = true;
      ice.fallingTiles.splice(k, 1);
    }
    updateIceTileMesh(t);
  }

  // Panel + skor
  const score = iceScore();
  document.querySelector("#iceScore").textContent = String(score);
  document.querySelector("#iceBest").textContent = String(Math.max(state.profile.iceBest, score));
  document.querySelector("#iceTime").textContent = `${Math.floor(ice.survivedMs / 1000)} sn`;
  document.querySelector("#iceBroken").textContent = String(ice.broken);
  document.querySelector("#iceDeaths").textContent = String(ice.deaths);

  // Rekor kaydı: 10 sn'de bir
  if (nowMs - ice.lastFlush > 10000) {
    ice.lastFlush = nowMs;
    flushIceScore(false);
  }
}

async function flushIceScore(final) {
  const score = iceScore();
  if (score <= 0) return;
  if (account) {
    const result = await postProfileAction("/api/yaris-sehri/ice-score", { score, deaths: ice.deaths });
    if (result?.goldEarned > 0) showScorePop(`Buz rekoru! +${result.goldEarned} 🪙`);
  } else if (score > state.profile.iceBest) {
    const goldEarned = Math.floor(score / 150) - Math.floor(state.profile.iceBest / 150);
    state.profile.iceBest = score;
    state.profile.gold += goldEarned;
    saveGuestProfile();
    refreshGoldDisplays();
    if (goldEarned > 0 && final) showScorePop(`Buz rekoru! +${goldEarned} 🪙`);
  }
}

function updateRemotes(dt) {  const t = Math.min(1, dt * 9);
  for (const remote of state.remotes.values()) {
    remote.x += (remote.tx - remote.x) * t;
    remote.z += (remote.tz - remote.z) * t;
    remote.h += (remote.th - remote.h) * t;
    let diff = remote.ta - remote.a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    remote.a += diff * t;
    if (remote.mesh) {
      remote.mesh.position.set(remote.x, remote.h, remote.z);
      remote.mesh.rotation.y = -remote.a;
      remote.tag.position.set(remote.x, remote.h + 7, remote.z);
      remote.shadow.position.set(remote.x, 0.06, remote.z);
      remote.shadow.material.opacity = clamp(0.4 - remote.h * 0.004, 0.08, 0.4);
    }
  }
}

// ---------------------------------------------------------------------------
// Halka / etiket görünürlükleri
// ---------------------------------------------------------------------------

function updateRingVisibility(nowMs) {
  if (!active) return;
  const refs = active.refs;
  if (state.map === "city" && refs.rings) {
    const raceRoute = state.routes.race;
    const raceActive = race.phase === "running" || race.phase === "countdown";
    refs.rings.race.forEach((ring, i) => {
      ring.visible = raceActive && i < raceRoute.length;
      const isNext = raceActive && isInRace() && !race.finished && (race.nextCp >= raceRoute.length ? 0 : race.nextCp) === i;
      ring.material.opacity = isNext ? 0.95 : 0.3;
      ring.scale.setScalar(isNext ? 1 + Math.sin(nowMs / 180) * 0.08 : 1);
      if (isNext) ring.rotation.z += 0.02;
    });
    const ttRoute = state.routes.tt;
    const ttNear = inZone(car.x, car.z, state.zones.tt, 200);
    refs.rings.tt.forEach((ring, i) => {
      ring.visible = (tt.running || ttNear) && i < ttRoute.length;
      const isNext = tt.running && (tt.next >= ttRoute.length ? 0 : tt.next) === i;
      ring.material.opacity = isNext ? 0.95 : 0.3;
      ring.scale.setScalar(isNext ? 1 + Math.sin(nowMs / 180) * 0.08 : 1);
    });
    // Bölge zeminleri nabız
    for (const group of [refs.raceZone, refs.ttZone]) {
      if (group?.children[0]) {
        group.children[0].material.opacity = 0.08 + Math.sin(nowMs / 350) * 0.05;
      }
    }
  } else if (state.map === "stunt" && refs.stuntRings) {
    refs.stuntRings.forEach((mesh, i) => {
      const ringData = STUNT_RINGS[i];
      const activeRing = nowMs > ringData.until;
      mesh.material.opacity = activeRing ? 0.9 : 0.2;
      if (activeRing) mesh.rotation.z += 0.015;
    });
  } else if (state.map === "tutorial") {
    if (refs.tutCheckpoint) {
      refs.tutCheckpoint.visible = state.mode === "tutorial" && !tutorial.done && tutorial.step === 1;
      refs.tutCheckpoint.material.opacity = 0.95;
    }
    if (refs.tutFinish) {
      refs.tutFinish.visible = state.mode === "tutorial" && !tutorial.done && tutorial.step === 3;
      refs.tutFinish.material.opacity = 0.95;
    }
  }
}

function syncSelfCar() {
  if (!selfCar.mesh) return;
  selfCar.mesh.position.set(car.x, car.h, car.z);
  selfCar.mesh.rotation.y = -car.angle;
  // Havada hafif yunuslama
  selfCar.mesh.rotation.z = car.vh !== 0 ? clamp(-car.vh * 0.0008, -0.3, 0.3) : 0;
  selfCar.tag.position.set(car.x, car.h + 7, car.z);
  selfCar.shadow.position.set(car.x, 0.06, car.z);
  selfCar.shadow.material.opacity = clamp(0.4 - car.h * 0.004, 0.08, 0.4);
  selfCar.shadow.scale.setScalar(1 + car.h * 0.01);
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function updateHud(nowMs) {
  hudSpeed.textContent = `${Math.round(Math.abs(car.speed) * 0.36)} km/s`;
  const driverCount = 1 + state.remotes.size + state.bots.length;
  hudPlayers.textContent =
    state.mode === "stunt"
      ? "Tek Mod"
      : state.mode === "ice"
        ? "Buzlu Zemin"
        : state.mode === "tutorial"
          ? "Öğretici"
          : state.online
            ? `${driverCount} sürücü çevrimiçi`
            : `${driverCount} sürücü (yerel)`;

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

function showScorePop(text) {
  scorePop.textContent = text;
  scorePop.hidden = false;
  clearTimeout(showScorePop.timer);
  showScorePop.timer = setTimeout(() => {
    scorePop.hidden = true;
  }, 1400);
}

// ---------------------------------------------------------------------------
// Ana döngü
// ---------------------------------------------------------------------------

let lastFrame = performance.now();

function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastFrame) / 1000);
  lastFrame = nowMs;

  if (state.screen === "game" && active) {
    updateCar(dt);
    updateRemotes(dt);
    updateBots(dt);
    raceTick();
    ttTick(nowMs);
    tutorialTick();
    stuntTick(nowMs);
    iceTick(nowMs, dt);
    syncSelfCar();
    updateRingVisibility(nowMs);
    updateCamera3D(dt);
    updateHud(nowMs);
    drawMinimap(nowMs);
    autoQuality(nowMs);
    renderer.render(active.scene, camera);
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
  document.querySelector("#retryResumeBtn").addEventListener("click", () => resumeAndEnter());
  requestAnimationFrame(frame);
  await resumeAndEnter();
}

async function resumeAndEnter() {
  const splashText = document.querySelector("#splashText");
  const splashSpinner = document.querySelector("#splashSpinner");
  const retryBtn = document.querySelector("#retryResumeBtn");
  showScreen("splash");
  splashText.textContent = "Hakorocks Studios hesabı ile giriş yapılıyor...";
  splashSpinner.style.display = "";
  retryBtn.hidden = true;

  const result = await tryResume();
  if (result === "ok") {
    await fetchProfile();
    afterLogin();
    return;
  }
  if (result === "network-error") {
    // Geçici sorun: "hesabınız yok" DEME, tekrar deneme sun.
    splashText.textContent = "Sunucuya bağlanılamadı. İnternetini kontrol edip tekrar dene.";
    splashSpinner.style.display = "none";
    retryBtn.hidden = false;
    return;
  }
  // Hesap gerçekten yok: kayıt/misafir ekranı (metinler index.html'de AYNEN tanımlı)
  showScreen("menu");
}

init();
