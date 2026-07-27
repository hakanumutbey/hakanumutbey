/**
 * HENTW — Bölüm 1 playable loop
 * Planet showcase (round Earth, player hidden) · quest chain · boss · tablet
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  QUEST,
  QUEST_LABELS,
  advanceQuest,
  syncEarlyQuest,
  shouldHidePlayerForCam,
  canInteract,
  distXZ as logicDistXZ,
  applyBossDamage,
  tickBossChase,
  applySphereHit,
  tabletFeatures,
  crateLoot,
  createBoss,
  SIGNAL_RELAY_POS,
  JOLE_POS,
  SAVE_KEY,
  encodeSave,
  decodeSave,
  easyEnemyHpMult,
  easyPlayerDamageMult,
  createCollectibles,
  collectItem,
  collectibleProgress,
  worldToMinimap,
} from "./gameLogic.js";
import { createAudioBus, createParticleSystem, drawMinimap } from "./seriesFeatures.js";

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const canvas = document.getElementById("game");
const uiEl = document.getElementById("ui");
const cinematicEl = document.getElementById("cinematic");
const cineContent = document.getElementById("cine-content");
const cineChapter = document.getElementById("cine-chapter");
const cineTitle = document.getElementById("cine-title");
const cineBody = document.getElementById("cine-body");
const cineFlash = document.getElementById("cine-flash");
const logoCard = document.getElementById("logo-card");
const wakeOverlay = document.getElementById("wake-overlay");
const impactFlash = document.getElementById("impact-flash");
const finaleOverlay = document.getElementById("finale-overlay");
const finaleTextEl = document.getElementById("finale-text");
const endScreen = document.getElementById("end-screen");
const crosshair = document.getElementById("crosshair");
const questTextEl = document.getElementById("quest-text");
const promptEl = document.getElementById("prompt");
const dialogueEl = document.getElementById("dialogue");
const dialogueSpeakerEl = document.getElementById("dialogue-speaker");
const dialogueTextEl = document.getElementById("dialogue-text");
const toastEl = document.getElementById("toast");
const dbgFps = document.getElementById("dbg-fps");
const dbgPos = document.getElementById("dbg-pos");
const dbgQuest = document.getElementById("dbg-quest");
const dbgGun = document.getElementById("dbg-gun");
const dbgMode = document.getElementById("dbg-mode");
const bossHud = document.getElementById("boss-hud");
const bossBar = document.getElementById("boss-bar");
const bossHpText = document.getElementById("boss-hp-text");
const invList = document.getElementById("inv-list");
const easyModeCb = document.getElementById("easy-mode");
const btnContinue = document.getElementById("btn-continue");
const collectCountEl = document.getElementById("collect-count");
const minimapCanvas = document.getElementById("minimap-canvas");
const easyBadge = document.getElementById("easy-badge");
const metaTitle = document.getElementById("meta-title");
const sfx = createAudioBus();
const tabletEl = document.getElementById("tablet");
const tabMusic = document.getElementById("tab-music");
const musicMsg = document.getElementById("music-msg");
const musicNote = document.getElementById("music-note");

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------
const STORY = [
  {
    chapter: "YIL 2026",
    title: "Görev Başlıyor",
    body: "NASA, HENTW adlı gizemli gezegene\nkeşif görevi düzenler.",
    cam: "space",
    duration: 4.5,
  },
  {
    chapter: "YAKLAŞMA",
    title: "Keşif Aracı",
    body: "Uzay aracı Dünya yörüngesinden ayrılır.\nHedef: HENTW…",
    cam: "approach",
    duration: 4.2,
  },
  {
    chapter: "FIRTINA",
    title: "Ani Kasırga",
    body: "Dev bir atmosferik kasırga oluşur.\nRoket kontrolden çıkar.",
    cam: "storm",
    duration: 3.6,
    flash: true,
  },
  {
    chapter: "ÇARPIŞMA",
    title: "…",
    body: "Her yer kararır.",
    cam: "black",
    duration: 2.2,
  },
  {
    chapter: "",
    title: "",
    body: "",
    cam: "reveal",
    duration: 7.0,
    logo: true,
  },
  {
    chapter: "UYANIŞ",
    title: "Arazi yükleniyor…",
    body: "Gözlerin ağır…\nYerde uyanıyorsun.",
    cam: "wake",
    duration: 3.0,
  },
];

const ROBOT_LINES = [
  { speaker: "NASA ROBOTU — HASARLI", text: "Dünyaya geri dönmenin bir yolu var…" },
  { speaker: "SEN", text: "Söyle." },
  { speaker: "NASA ROBOTU — HASARLI", text: "Söylüyorum…" },
  { speaker: "SEN (sinirli)", text: "E söylesene!" },
  {
    speaker: "NASA ROBOTU — HASARLI",
    text: "Sır şu ki—  …yukarıdan bir ses…",
    triggerMetal: true,
  },
];

const MODE = {
  CINEMATIC: "cinematic",
  WAKE: "wake",
  PLAY: "play",
  CUTSCENE: "cutscene",
  FINALE: "finale",
};

const INTERACT_RANGE = 2.1;
const SHOOT_RANGE = 28;
const PLAYER_SPEED = 5.4;

const keys = new Set();
const state = {
  mode: MODE.CINEMATIC,
  storyIndex: 0,
  storyTimer: 0,
  storyAdvanceReady: false,
  quest: QUEST.PICK_GUN,
  hasGun: false,
  dialogueOpen: false,
  dialogueLine: 0,
  robotTalked: false,
  robotBroken: false,
  toastTimer: 0,
  pointerLocked: false,
  wakeT: 0,
  playerStand: 0,
  cutsceneT: 0,
  metalImpactDone: false,
  openWorld: false,
  exitTutorialShown: false,
  outsideDetected: false,
  sphereProgress: 0,
  sphereOpened: false,
  sphereShattering: false,
  sphereShatterT: 0,
  boss: createBoss(100), // hp adjusted when spawned for easy mode
  bossActive: false,
  shineDropped: false,
  hasShineOrb: false,
  hasFood: false,
  hasPowerOrb: false,
  hasTablet: false,
  crateLooted: false,
  tabletOpen: false,
  relayFound: false,
  relayActivated: false,
  hasJole: false,
  rocketRepaired: false,
  finalePhase: "", // launch | space | hit | fall | crash | end
  finaleT: 0,
  finaleCaption: "",
  shootCooldown: 0,
  musicUnlocked: false,
  currentCam: "space",
  easyMode: false,
  collectibles: createCollectibles(["star1", "star2", "star3"]),
  collectedCount: 0,
};

const MAP_BOUNDS = { minX: -40, maxX: 40, minZ: -40, maxZ: 50 };
const STAR_SPOTS = [
  { id: "star1", x: 6, z: 10 },
  { id: "star2", x: -8, z: 22 },
  { id: "star3", x: 14, z: 32 },
];

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x081428);
scene.fog = new THREE.FogExp2(0x0c1a30, 0.02);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.08,
  500
);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.32,
  0.45,
  0.85
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x8ed8ff, 0x1a1020, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c8, 1.55);
sun.position.set(8, 14, 6);
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
scene.add(sun);
const FX = createParticleSystem(THREE, scene);

const cyanL = new THREE.PointLight(0x3de0ff, 1.0, 28, 2);
cyanL.position.set(-5, 3, -2);
scene.add(cyanL);
const violetL = new THREE.PointLight(0xa060ff, 0.65, 22, 2);
violetL.position.set(5, 2.4, 4);
scene.add(violetL);

const ROOM = { w: 18, d: 18, h: 5.5 };
const PLAYER_HALF = ROOM.w / 2 - 0.6;
const roomHideables = [];
const roomOpenables = [];
let vistaGroup = null;
let planetGroup = null;

// ---------------------------------------------------------------------------
// Earth-like planet (round globe for space/approach)
// ---------------------------------------------------------------------------
function makeEarthTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  // Ocean
  const g = ctx.createRadialGradient(size * 0.45, size * 0.4, 20, size * 0.5, size * 0.5, size * 0.55);
  g.addColorStop(0, "#1a6db5");
  g.addColorStop(0.5, "#0d4a8c");
  g.addColorStop(1, "#062a55");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Continents (soft blobs — Earth-from-space feel)
  const land = [
    [0.28, 0.42, 0.14, 0.2],
    [0.55, 0.38, 0.18, 0.22],
    [0.72, 0.55, 0.12, 0.16],
    [0.4, 0.62, 0.2, 0.12],
    [0.22, 0.7, 0.1, 0.1],
    [0.65, 0.28, 0.08, 0.1],
  ];
  for (const [ux, uy, rx, ry] of land) {
    ctx.fillStyle = `rgb(${40 + Math.random() * 40},${90 + Math.random() * 50},${35 + Math.random() * 30})`;
    ctx.beginPath();
    ctx.ellipse(ux * size, uy * size, rx * size, ry * size, Math.random(), 0, Math.PI * 2);
    ctx.fill();
  }
  // Clouds
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      20 + Math.random() * 50,
      8 + Math.random() * 18,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  // Polar ice
  ctx.fillStyle = "rgba(230,240,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.06, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.94, size * 0.2, size * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makePlanet() {
  const g = new THREE.Group();
  g.name = "earthPlanet";
  // Center of frame for cinematic orbit
  g.position.set(0, 0, -40);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(10, 64, 48),
    new THREE.MeshStandardMaterial({
      map: makeEarthTexture(),
      metalness: 0.08,
      roughness: 0.55,
      emissive: 0x041020,
      emissiveIntensity: 0.15,
    })
  );
  earth.castShadow = true;
  g.add(earth);

  // Atmosphere shell (round glow — Earth-from-space photo look)
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(10.6, 48, 32),
    new THREE.MeshBasicMaterial({
      color: 0x6ec8ff,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  g.add(atmo);

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(10.35, 48, 32),
    new THREE.MeshBasicMaterial({
      color: 0xb8e0ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  g.add(rim);

  // Bright sun-side light so globe reads as a sphere
  const sunL = new THREE.DirectionalLight(0xfff2dd, 2.4);
  sunL.position.set(40, 18, 30);
  g.add(sunL);
  const fillL = new THREE.DirectionalLight(0x4466aa, 0.55);
  fillL.position.set(-30, -10, -20);
  g.add(fillL);

  // Distant stars behind planet
  const starN = 400;
  const starPos = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const r = 80 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 40;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  g.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, sizeAttenuation: true })
    )
  );

  g.userData.earth = earth;
  g.visible = false;
  scene.add(g);
  return g;
}

// ---------------------------------------------------------------------------
// Room + vista
// ---------------------------------------------------------------------------
function makeRoom() {
  const floorTex = (() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#182640" : "#121e32";
        ctx.fillRect(x * 32, y * 32, 32, 32);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.w, ROOM.d),
    new THREE.MeshStandardMaterial({ map: floorTex, metalness: 0.4, roughness: 0.55 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  for (const [r, col] of [
    [6.2, 0x3de0ff],
    [7.4, 0x8b5cff],
  ]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.035, 10, 96),
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 1.4,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.03;
    scene.add(ring);
  }

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x0e1728,
    metalness: 0.35,
    roughness: 0.75,
  });
  const sides = [
    { id: "back", pos: [0, ROOM.h / 2, -ROOM.d / 2], size: [ROOM.w, ROOM.h, 0.35], openable: false },
    { id: "front", pos: [0, ROOM.h / 2, ROOM.d / 2], size: [ROOM.w, ROOM.h, 0.35], openable: true },
    { id: "left", pos: [-ROOM.w / 2, ROOM.h / 2, 0], size: [0.35, ROOM.h, ROOM.d], openable: true },
    { id: "right", pos: [ROOM.w / 2, ROOM.h / 2, 0], size: [0.35, ROOM.h, ROOM.d], openable: true },
  ];
  for (const s of sides) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(...s.size), wallMat);
    w.position.set(...s.pos);
    w.castShadow = true;
    w.receiveShadow = true;
    scene.add(w);
    if (s.openable) roomOpenables.push(w);
  }

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.w, ROOM.d),
    new THREE.MeshStandardMaterial({ color: 0x080e18 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM.h;
  scene.add(ceil);
  roomHideables.push(ceil);

  for (const [x, z] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
    [0, 0],
  ]) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0xaad8ff,
        emissive: 0x66aaff,
        emissiveIntensity: 1.8,
      })
    );
    lamp.position.set(x, ROOM.h - 0.06, z);
    scene.add(lamp);
    roomHideables.push(lamp);
  }

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.8, 0.1, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a2a40, metalness: 0.7, roughness: 0.3 })
  );
  pad.position.set(-3.2, 0.05, -2.8);
  pad.receiveShadow = true;
  scene.add(pad);
}

function makeVista() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(120, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.92 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  g.add(ground);

  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x243048,
    flatShading: true,
    roughness: 0.88,
  });
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2;
    const dist = 22 + (i % 5) * 10;
    const h = 5 + (i % 7) * 2;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(4 + (i % 4), h, 6), hillMat);
    hill.position.set(Math.cos(ang) * dist, h * 0.35, Math.sin(ang) * dist);
    g.add(hill);
  }
  // Uzak kaya işaretleri (mor küre DEĞİL — gizemli küre ile karışmasın)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.4;
    const dist = 48 + (i % 3) * 6;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.9 + (i % 3) * 0.3, 0),
      new THREE.MeshStandardMaterial({
        color: 0x2a3548,
        metalness: 0.2,
        roughness: 0.85,
        flatShading: true,
      })
    );
    rock.position.set(Math.cos(ang) * dist, 0.6, Math.sin(ang) * dist);
    // Gizemli küre bölgesinden uzak tut (x≈8,z≈22)
    if (Math.hypot(rock.position.x - 8, rock.position.z - 22) < 18) {
      rock.position.x += 25;
      rock.position.z += 15;
    }
    g.add(rock);
  }
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(140, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x0a1020, side: THREE.BackSide, fog: false })
  );
  g.add(sky);
  scene.add(g);
  return g;
}

function setVistaOpen(open) {
  for (const obj of roomHideables) obj.visible = !open;
  if (open) {
    scene.fog = new THREE.FogExp2(0x0c1a30, 0.012);
    scene.background = new THREE.Color(0x0a1528);
    hemi.intensity = 0.75;
    sun.intensity = 1.6;
  } else {
    scene.fog = new THREE.FogExp2(0x0a1528, 0.028);
    scene.background = new THREE.Color(0x060b14);
    hemi.intensity = 0.55;
    sun.intensity = 1.35;
  }
}

function setPlanetVisible(on) {
  if (planetGroup) planetGroup.visible = on;
  // Hide surface cast / player so only the round globe is in shot
  const surface = !on;
  if (rocket) rocket.visible = surface;
  if (robot) robot.group.visible = surface;
  if (gun) gun.visible = surface && !state.hasGun;
  if (player) player.group.visible = surface && !shouldHidePlayerForCam(state.currentCam);
  if (exitBeacon) exitBeacon.visible = surface && state.openWorld;
  if (exitArrow) exitArrow.visible = surface && state.openWorld;
  if (on) {
    scene.background = new THREE.Color(0x000510);
    scene.fog = null;
    hemi.intensity = 0.35;
    sun.intensity = 0.15;
    if (vistaGroup) vistaGroup.visible = false;
    for (const obj of roomHideables) obj.visible = false;
    for (const obj of roomOpenables) obj.visible = false;
  } else {
    sun.intensity = state.openWorld ? 1.6 : 1.35;
    if (vistaGroup) vistaGroup.visible = true;
    for (const obj of roomHideables) obj.visible = !state.openWorld;
    for (const obj of roomOpenables) obj.visible = !state.openWorld;
  }
}

makeRoom();
vistaGroup = makeVista();
planetGroup = makePlanet();

// Dust
const dust = (() => {
  const n = 350;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = Math.random() * 8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0x88ccee,
      size: 0.04,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(pts);
  return pts;
})();

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
function makeRocket() {
  const g = new THREE.Group();
  g.position.set(-3.2, 0, -3.0);
  const hull = new THREE.MeshStandardMaterial({
    color: 0xd0d8e4,
    metalness: 0.82,
    roughness: 0.28,
  });
  const scorched = new THREE.MeshStandardMaterial({ color: 0x5a5048, metalness: 0.55 });
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.1, 3.8),
    new THREE.MeshStandardMaterial({ color: 0x243044 })
  );
  floor.position.set(0, 0.06, 0.15);
  g.add(floor);
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.15, 4), hull);
  wallL.position.set(-1.25, 1.1, 0.05);
  g.add(wallL);
  const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.7, 2.8), scorched);
  wallR.position.set(1.25, 0.9, -0.25);
  g.add(wallR);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.15, 0.16), hull);
  back.position.set(0, 1.1, -1.8);
  g.add(back);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 2.5), hull);
  roof.position.set(-0.05, 2.2, -0.45);
  g.add(roof);
  const metal = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.95), scorched);
  metal.position.set(0.15, 2.05, -0.35);
  g.add(metal);
  g.userData.fallingMetal = metal;
  g.userData.metalStart = metal.position.clone();
  g.userData.metalEnd = new THREE.Vector3(0.05, 0.95, -0.55);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 1.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xe24a3a, metalness: 0.45 })
  );
  nose.position.set(0, 1.35, -2.65);
  nose.rotation.x = Math.PI / 2;
  g.add(nose);
  const cabin = new THREE.PointLight(0xff5533, 1.1, 6, 2);
  cabin.position.set(0, 1.5, -0.4);
  g.add(cabin);
  const emergency = new THREE.PointLight(0xff2200, 0.4, 4, 2);
  emergency.position.set(0.6, 1.8, 0.3);
  g.add(emergency);
  g.userData.emergency = emergency;
  const entrance = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.03, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8822, emissiveIntensity: 1.5 })
  );
  entrance.rotation.x = Math.PI / 2;
  entrance.position.set(0, 0.08, 2.2);
  g.add(entrance);
  scene.add(g);
  return g;
}

function makeGun() {
  const g = new THREE.Group();
  g.position.set(-2.35, 0.14, 0.55);
  g.name = "gun";
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.13, 0.17),
    new THREE.MeshStandardMaterial({ color: 0x1e2a38, metalness: 0.9 })
  );
  g.add(body);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.04, 0.45, 12),
    new THREE.MeshStandardMaterial({
      color: 0x3de0ff,
      emissive: 0x1ab0d0,
      emissiveIntensity: 1.4,
    })
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.42, 0.02, 0);
  g.add(barrel);
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.025, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0x3de0ff, emissive: 0x3de0ff, emissiveIntensity: 1.8 })
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.y = -0.08;
  g.add(marker);
  g.add(new THREE.PointLight(0x3de0ff, 1.2, 5, 2));
  scene.add(g);
  return g;
}

function makeRobot() {
  const g = new THREE.Group();
  g.position.set(-3.2, 0, -3.65);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9aa8ba, metalness: 0.75 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3a4458 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff5533,
    emissive: 0xff2200,
    emissiveIntensity: 2.2,
  });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.48), bodyMat);
  torso.position.y = 0.88;
  torso.rotation.z = 0.2;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.4), bodyMat);
  head.position.set(0.1, 1.55, 0);
  g.add(head);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 14), eyeMat);
  eye.position.set(0.22, 1.56, 0.18);
  g.add(eye);
  const spark = new THREE.PointLight(0xff4422, 0.9, 3.5, 2);
  spark.position.set(0.25, 1.35, 0.25);
  g.add(spark);
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.03, 8, 36),
    new THREE.MeshStandardMaterial({ color: 0xb07cff, emissive: 0x9040ff, emissiveIntensity: 1.5 })
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.y = 0.05;
  g.add(marker);
  scene.add(g);
  return { group: g, spark, eye };
}

function makeMysterySphere() {
  // Tüm eski "mysterySphere" kopyalarını temizle
  const toRemove = [];
  scene.traverse((o) => {
    if (o.name === "mysterySphere" || o.userData?.isMysterySphere) toRemove.push(o);
  });
  for (const o of toRemove) {
    if (o.parent) o.parent.remove(o);
    else scene.remove(o);
  }

  const g = new THREE.Group();
  g.name = "mysterySphere";
  g.userData.isMysterySphere = true;
  // Açık alanda tek konum — etrafı boş
  g.position.set(6, 1.55, 24);
  g.visible = false;

  // SADECE BİR küre mesh
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 48, 36),
    new THREE.MeshStandardMaterial({
      color: 0x6a30b0,
      emissive: 0x6622bb,
      emissiveIntensity: 1.0,
      metalness: 0.4,
      roughness: 0.25,
    })
  );
  body.name = "mysterySphereBody";
  g.add(body);

  // Çatlak: yüzey çizgileri (box yok — ekstra “küre” hissi vermesin)
  const crackLines = [];
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xfff6ff,
    transparent: true,
    opacity: 0,
  });
  for (let i = 0; i < 6; i++) {
    const pts = [];
    const a0 = (i / 6) * Math.PI * 2;
    for (let t = 0; t <= 12; t++) {
      const u = t / 12;
      const lat = (u - 0.5) * Math.PI * 0.95;
      const lon = a0 + Math.sin(u * 4) * 0.25;
      const r = 1.58;
      pts.push(
        new THREE.Vector3(
          r * Math.cos(lat) * Math.cos(lon),
          r * Math.sin(lat),
          r * Math.cos(lat) * Math.sin(lon)
        )
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, lineMat.clone());
    line.visible = false;
    g.add(line);
    crackLines.push(line);
  }

  // Kırık parçalar: düz paneller (küre değil)
  const shards = [];
  for (let i = 0; i < 10; i++) {
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0x8a55dd,
        emissive: 0x5533aa,
        emissiveIntensity: 1.0,
        metalness: 0.45,
        roughness: 0.35,
        transparent: true,
        opacity: 0.95,
      })
    );
    const ang = (i / 10) * Math.PI * 2;
    shard.visible = false;
    g.add(shard);
    shards.push({
      mesh: shard,
      vel: new THREE.Vector3(
        Math.cos(ang) * (6 + Math.random() * 3),
        3 + Math.random() * 3,
        Math.sin(ang) * (6 + Math.random() * 3)
      ),
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      ),
    });
  }

  const glow = new THREE.PointLight(0xaa66ff, 2.4, 16, 2);
  g.add(glow);

  // Düz yer diski (torus/ikinci küre yok)
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 32),
    new THREE.MeshBasicMaterial({
      color: 0x8844cc,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -1.54;
  g.add(pad);

  g.userData.core = body;
  g.userData.shell = body;
  g.userData.body = body;
  g.userData.cracks = crackLines;
  g.userData.shards = shards;
  g.userData.glow = glow;
  g.userData.ring = pad;
  g.userData.hitFlash = 0;
  scene.add(g);
  return g;
}

function makeBossMesh() {
  // Uzun kırmızı canavar — küre ile karışmasın
  const g = new THREE.Group();
  g.position.set(10, 0, 28);
  g.visible = false;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x6a1020,
    emissive: 0xaa1020,
    emissiveIntensity: 0.95,
    metalness: 0.45,
    roughness: 0.4,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.6, 6, 12), mat);
  body.position.y = 1.5;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), mat);
  head.position.y = 2.7;
  g.add(head);
  const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.55, 6), mat);
  hornL.position.set(-0.35, 3.2, 0);
  g.add(hornL);
  const hornR = hornL.clone();
  hornR.position.x = 0.35;
  g.add(hornR);
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffee44, emissive: 0xffaa00, emissiveIntensity: 2 })
  );
  eye.position.set(0, 2.75, 0.48);
  g.add(eye);
  g.add(new THREE.PointLight(0xff3344, 1.5, 10, 2));
  g.userData.body = body;
  scene.add(g);
  return g;
}

function makeShineOrb() {
  // Boss sonrası düşen Işıltı Küresi — büyük, sarı, net görünür
  const g = new THREE.Group();
  g.name = "shineOrb";
  g.position.set(10, 0.9, 28);
  g.visible = false;

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 18),
    new THREE.MeshStandardMaterial({
      color: 0xfff6aa,
      emissive: 0xffdd33,
      emissiveIntensity: 3.2,
      metalness: 0.3,
      roughness: 0.2,
    })
  );
  orb.position.y = 0.2;
  g.add(orb);

  // Dikey ışık sütunu
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.35, 4.5, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffee88,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = 2.2;
  g.add(beam);

  const light = new THREE.PointLight(0xffee66, 4, 18, 2);
  light.position.y = 1;
  g.add(light);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.06, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffee88,
      emissive: 0xffcc44,
      emissiveIntensity: 2.2,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);

  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(1.3, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  g.add(pad);

  g.userData.orb = orb;
  g.userData.beam = beam;
  scene.add(g);
  return g;
}

/**
 * NASA acil durum kulesi / beacon — yüksek, sarı ışıklı, uzaktan net görünür.
 */
function makeCrate() {
  const g = new THREE.Group();
  g.name = "nasaTower";
  g.position.set(2, 0, 20);
  g.visible = false;

  const metal = new THREE.MeshStandardMaterial({
    color: 0x3a4a60,
    metalness: 0.65,
    roughness: 0.35,
  });
  const orange = new THREE.MeshStandardMaterial({
    color: 0xe8a020,
    emissive: 0xaa6600,
    emissiveIntensity: 0.7,
    metalness: 0.4,
    roughness: 0.4,
  });
  const white = new THREE.MeshStandardMaterial({
    color: 0xf0f4f8,
    metalness: 0.2,
    roughness: 0.5,
  });

  // Kaide
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.35, 12), metal);
  base.position.y = 0.18;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // Gövde direk
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 5.2, 10), metal);
  pole.position.y = 2.9;
  pole.castShadow = true;
  g.add(pole);

  // Turuncu şeritler
  for (const y of [1.2, 2.4, 3.6, 4.8]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 10), orange);
    band.position.y = y;
    g.add(band);
  }

  // Üst platform + anten
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.6), metal);
  top.position.y = 5.6;
  top.castShadow = true;
  g.add(top);

  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({
      color: 0xc8d4e0,
      metalness: 0.8,
      roughness: 0.25,
      side: THREE.DoubleSide,
    })
  );
  dish.position.set(0.15, 6.0, 0);
  dish.rotation.x = -0.5;
  g.add(dish);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), metal);
  antenna.position.y = 6.5;
  g.add(antenna);

  // Yan acil kutu (tablet/yemek buradan alınır)
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 0.85), metal);
  box.position.set(1.15, 0.55, 0.2);
  box.castShadow = true;
  g.add(box);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.18, 0.88), orange);
  stripe.position.set(1.15, 0.75, 0.2);
  g.add(stripe);

  // NASA paneli
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.04), white);
  panel.position.set(1.15, 0.95, 0.65);
  g.add(panel);

  // Tepe uyarı ışığı
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      emissive: 0xffaa00,
      emissiveIntensity: 2.5,
    })
  );
  beacon.position.y = 7.3;
  g.add(beacon);
  const beaconLight = new THREE.PointLight(0xffcc44, 3.5, 22, 2);
  beaconLight.position.y = 7.3;
  g.add(beaconLight);
  g.userData.beaconLight = beaconLight;
  g.userData.beacon = beacon;

  // Yer halkası
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.08, 8, 40),
    new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      emissive: 0xffaa00,
      emissiveIntensity: 1.8,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);

  // Dikey ışık huzmesi (uzaktan bulunsun)
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.5, 8, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = 4;
  g.add(beam);
  g.userData.beam = beam;

  scene.add(g);
  return g;
}

/** Işıltı sonrası NASA kulesini spawn et */
function spawnNasaTower() {
  if (state.crateLooted) return;
  crate.visible = true;
  // Boss / ışıltı alanının yanında, net konum
  const sx = shineOrb.position.x || 10;
  const sz = shineOrb.position.z || 28;
  crate.position.set(sx - 5, 0, sz - 4);
  crate.traverse((c) => {
    if (c.isMesh || c.isLight) c.visible = true;
  });
  showToast("📡 NASA acil kulesi belirdi! Sarı ışığa git · E ile aç", 4.5);
}

/**
 * Gizli NASA sinyal rölesi — kule sonrası tablet sinyali buraya götürür.
 * Eve dönüş ipucu / Bölüm 1 final hedefi.
 */
/** Pembe JOLE onarım jeli bidonu */
function makeJoleCanister() {
  const g = new THREE.Group();
  g.name = "joleCan";
  g.position.set(JOLE_POS.x, 0, JOLE_POS.z);
  g.visible = false;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.4, 0.95, 12),
    new THREE.MeshStandardMaterial({
      color: 0xff66aa,
      emissive: 0xaa2266,
      emissiveIntensity: 0.7,
      metalness: 0.3,
      roughness: 0.4,
    })
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);

  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.15, 12),
    new THREE.MeshStandardMaterial({ color: 0xffe0f0, metalness: 0.5 })
  );
  lid.position.y = 1.1;
  g.add(lid);

  const label = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff88cc,
      emissiveIntensity: 0.3,
    })
  );
  label.position.set(0, 0.6, 0.38);
  g.add(label);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.05, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0xff88cc,
      emissive: 0xff44aa,
      emissiveIntensity: 1.6,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);

  const light = new THREE.PointLight(0xff66aa, 1.8, 10, 2);
  light.position.y = 1;
  g.add(light);

  scene.add(g);
  return g;
}

/** Uzaylı gemisi (finale saldırı) */
function makeAlienShip() {
  const g = new THREE.Group();
  g.visible = false;
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x44ff66,
      emissive: 0x118833,
      emissiveIntensity: 0.8,
      metalness: 0.6,
      roughness: 0.3,
    })
  );
  g.add(hull);
  const wingL = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.12, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x22aa44, metalness: 0.5 })
  );
  wingL.position.set(0, 0, 0);
  g.add(wingL);
  const glow = new THREE.PointLight(0x44ff66, 2, 15, 2);
  g.add(glow);
  scene.add(g);
  return g;
}

function makeSignalRelay() {
  const g = new THREE.Group();
  g.name = "signalRelay";
  g.position.set(SIGNAL_RELAY_POS.x, 0, SIGNAL_RELAY_POS.z);
  g.visible = false;

  const blue = new THREE.MeshStandardMaterial({
    color: 0x2a6ad4,
    emissive: 0x1040a0,
    emissiveIntensity: 0.6,
    metalness: 0.55,
    roughness: 0.35,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x8a96a8,
    metalness: 0.7,
    roughness: 0.3,
  });
  const cyan = new THREE.MeshStandardMaterial({
    color: 0x3de0ff,
    emissive: 0x1ab0d0,
    emissiveIntensity: 1.5,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 0.4, 12), metal);
  base.position.y = 0.2;
  base.castShadow = true;
  g.add(base);

  const core = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 1.4), blue);
  core.position.y = 1.5;
  core.castShadow = true;
  g.add(core);

  // Üç bacaklı anten
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 6), metal);
    leg.position.set(Math.cos(ang) * 0.9, 2.8, Math.sin(ang) * 0.9);
    leg.rotation.z = Math.cos(ang) * 0.25;
    leg.rotation.x = Math.sin(ang) * 0.25;
    g.add(leg);
  }

  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({
      color: 0xb0c4d8,
      metalness: 0.85,
      roughness: 0.2,
      side: THREE.DoubleSide,
    })
  );
  dish.position.set(0, 4.2, 0.2);
  dish.rotation.x = -0.85;
  g.add(dish);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), cyan);
  crystal.position.y = 3.4;
  g.add(crystal);
  g.userData.crystal = crystal;

  const light = new THREE.PointLight(0x3de0ff, 2.5, 20, 2);
  light.position.y = 3.5;
  g.add(light);
  g.userData.light = light;

  // Mavi yer halkası
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.08, 8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x3de0ff,
      emissive: 0x1ab0d0,
      emissiveIntensity: 1.6,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  g.add(ring);

  // Uzaktan görünen dikey huzme
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.6, 10, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x66ddff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beam.position.y = 5;
  g.add(beam);
  g.userData.beam = beam;

  // Aktif olunca açılan hologram paneli
  const holo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.2),
    new THREE.MeshBasicMaterial({
      color: 0x66ffcc,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
  );
  holo.position.set(0, 2.8, 1.2);
  g.add(holo);
  g.userData.holo = holo;

  scene.add(g);
  return g;
}

function makePlayer() {
  const g = new THREE.Group();
  g.position.set(0.8, 0, 2.2);
  const bodyRoot = new THREE.Group();
  g.add(bodyRoot);
  const suit = new THREE.MeshStandardMaterial({ color: 0xe8eef6, metalness: 0.4, roughness: 0.45 });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x2f78c4,
    metalness: 0.5,
    emissive: 0x0a2040,
    emissiveIntensity: 0.3,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 8, 16), suit);
  body.position.y = 0.88;
  body.castShadow = true;
  bodyRoot.add(body);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), suit);
  helmet.position.y = 1.58;
  bodyRoot.add(helmet);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.2), accent);
  pack.position.set(0, 0.98, -0.3);
  bodyRoot.add(pack);
  const heldGun = new THREE.Group();
  heldGun.visible = false;
  const hgBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.08, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1e2a38, metalness: 0.9 })
  );
  const hgBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.3, 10),
    new THREE.MeshStandardMaterial({
      color: 0x3de0ff,
      emissive: 0x1ab0d0,
      emissiveIntensity: 1.2,
    })
  );
  hgBarrel.rotation.z = Math.PI / 2;
  hgBarrel.position.set(0.26, 0, 0);
  heldGun.add(hgBody, hgBarrel);
  heldGun.position.set(0.38, 0.98, 0.28);
  bodyRoot.add(heldGun);
  bodyRoot.rotation.x = -Math.PI / 2 + 0.15;
  bodyRoot.position.y = 0.28;
  scene.add(g);
  return { group: g, bodyRoot, heldGun };
}

const rocket = makeRocket();
const gun = makeGun();
const robot = makeRobot();
const mysterySphere = makeMysterySphere();
const bossMesh = makeBossMesh();
const shineOrb = makeShineOrb();
const crate = makeCrate();
const signalRelay = makeSignalRelay();
const joleCan = makeJoleCanister();
const alienShip = makeAlienShip();
const player = makePlayer();

// Sinyal yön oku (HUD tarzı dünya oku)
const signalArrow = new THREE.Mesh(
  new THREE.ConeGeometry(0.35, 0.9, 8),
  new THREE.MeshStandardMaterial({
    color: 0x3de0ff,
    emissive: 0x1ab0d0,
    emissiveIntensity: 1.5,
  })
);
signalArrow.visible = false;
scene.add(signalArrow);

const exitBeacon = new THREE.Mesh(
  new THREE.TorusGeometry(0.7, 0.04, 8, 36),
  new THREE.MeshStandardMaterial({ color: 0x66ffaa, emissive: 0x33ff88, emissiveIntensity: 1.6 })
);
exitBeacon.rotation.x = Math.PI / 2;
exitBeacon.position.set(0, 0.08, ROOM.d / 2 - 1.2);
exitBeacon.visible = false;
scene.add(exitBeacon);

const exitArrow = new THREE.Mesh(
  new THREE.ConeGeometry(0.25, 0.55, 8),
  new THREE.MeshStandardMaterial({ color: 0x66ffaa, emissive: 0x22cc66, emissiveIntensity: 1.2 })
);
exitArrow.position.set(0, 1.2, ROOM.d / 2 - 1.2);
exitArrow.rotation.x = Math.PI;
exitArrow.visible = false;
scene.add(exitArrow);

// Projectiles (simple)
const bullets = [];

const camOrbit = {
  yaw: 0.35,
  pitch: 0.32,
  distance: 5.4,
  minPitch: -0.12,
  maxPitch: 0.9,
  sensitivity: 0.002,
};

const cineCam = {
  targetPos: new THREE.Vector3(),
  targetLook: new THREE.Vector3(),
  revealFrom: new THREE.Vector3(-2.5, 1.1, -1.2),
  revealTo: new THREE.Vector3(6, 22, 14),
  revealLookFrom: new THREE.Vector3(-3.2, 0.8, -3.0),
  revealLookTo: new THREE.Vector3(-8, 2, -18),
  revealT: 0,
  logoShown: false,
};

// ---------------------------------------------------------------------------
// Player visibility (planet cams hide astronaut)
// ---------------------------------------------------------------------------
function setPlayerVisible(v) {
  player.group.visible = v;
}

function applyCamPlayerVisibility(camKey) {
  state.currentCam = camKey;
  setPlayerVisible(!shouldHidePlayerForCam(camKey));
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function showToast(msg, duration = 2.4) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  state.toastTimer = duration;
}


// --- series features ---
const starMeshes = {};
function makeStarMesh(id, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffdd66, emissive: 0xffaa22, emissiveIntensity: 1.8 });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat);
  core.position.y = 1.15;
  g.add(core);
  g.userData.spin = core;
  scene.add(g);
  starMeshes[id] = g;
}
STAR_SPOTS.forEach((s) => makeStarMesh(s.id, s.x, s.z));
function refreshCollectHud() {
  const pr = collectibleProgress(state.collectibles);
  state.collectedCount = pr.got;
  if (collectCountEl) collectCountEl.textContent = String(pr.got);
  for (const c of state.collectibles) {
    if (starMeshes[c.id]) starMeshes[c.id].visible = !c.taken;
  }
}
function persistSave() {
  try {
    const pos = player?.group?.position || { x: 0, z: 0 };
    localStorage.setItem(SAVE_KEY, encodeSave({
      quest: state.quest,
      easyMode: state.easyMode,
      collectibles: state.collectibles,
      collectedCount: state.collectedCount,
      playerHp: 100,
      extra: {
        px: pos.x, pz: pos.z,
        hasGun: state.hasGun, hasShineOrb: state.hasShineOrb, hasTablet: state.hasTablet,
        hasJole: state.hasJole, openWorld: state.openWorld, robotBroken: state.robotBroken,
      },
    }));
  } catch (e) { console.warn(e); }
}
function tryLoadSave() {
  try { return decodeSave(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}
function updateMinimapHud() {
  if (!minimapCanvas || !player?.group) return;
  const markers = [{ x: SIGNAL_RELAY_POS.x, z: SIGNAL_RELAY_POS.z, color: "#66aaff", r: 5 }];
  for (const c of state.collectibles) {
    if (!c.taken) {
      const spot = STAR_SPOTS.find((s) => s.id === c.id);
      if (spot) markers.push({ x: spot.x, z: spot.z, color: "#ffdd66", r: 3 });
    }
  }
  const p = player.group.position;
  drawMinimap(minimapCanvas, MAP_BOUNDS, worldToMinimap, { x: p.x, z: p.z }, markers);
}
function tryCollectStars() {
  if (state.mode !== MODE.PLAY || state.dialogueOpen) return;
  if (!player?.group) return;
  const p = player.group.position;
  for (const spot of STAR_SPOTS) {
    const c = state.collectibles.find((x) => x.id === spot.id);
    if (!c || c.taken) continue;
    if (logicDistXZ(p.x, p.z, spot.x, spot.z) < 1.8) {
      state.collectibles = collectItem(state.collectibles, spot.id);
      if (typeof FX !== "undefined") FX.spawnBurst(spot.x, 1.1, spot.z, 0xffdd66, 14, 3);
      sfx.pickup();
      refreshCollectHud();
      const pr = collectibleProgress(state.collectibles);
      showToast(pr.complete ? "Tüm yıldızlar! ★★★" : `Yıldız ${pr.got}/3`, 2);
      persistSave();
    }
  }
}


function setQuest(q) {
  state.quest = q;
  questTextEl.textContent = QUEST_LABELS[q] || q;
  if (state.mode === MODE.PLAY || state.mode === MODE.WAKE) persistSave();
}

/**
 * Silah / robot sırası serbest — bayraklara göre erken görevi düzelt.
 * Geç oyun spawn'larını (ışıltı, kule, röle) asla erken açmaz.
 */
function syncEarlyGame(toastIfNeeded = true) {
  const prev = state.quest;
  const next = syncEarlyQuest({
    hasGun: state.hasGun,
    robotBroken: state.robotBroken,
    quest: state.quest,
  });
  if (next !== prev) {
    setQuest(next);
    if (toastIfNeeded) {
      if (next === QUEST.PICK_GUN && state.robotBroken) {
        showToast("Robot bozuldu! Önce yerdeki ışın tabancasını al (E)", 3.5);
      } else if (next === QUEST.TALK_ROBOT) {
        showToast("Şimdi roketin içindeki robotla konuş (H)", 3);
      } else if (next === QUEST.EXIT_ROCKET) {
        showToast("Roketten çık · turuncu/yeşil halkaya doğru yürü", 3.5);
        if (!state.openWorld) unlockOpenWorld();
        // Zaten dışarıdaysa hemen keşfe geç
        if (state.outsideDetected) applyEvent("left_wreck");
      }
    }
  }
  // Erken oyunda geç içerik kesinlikle kapalı
  if (
    state.quest === QUEST.PICK_GUN ||
    state.quest === QUEST.TALK_ROBOT ||
    state.quest === QUEST.EXIT_ROCKET ||
    state.quest === QUEST.EXPLORE
  ) {
    if (!state.shineDropped) shineOrb.visible = false;
    if (state.quest !== QUEST.FIND_CRATE && !state.crateLooted) {
      // kule sadece FIND_CRATE+ sonrası
    }
    if (
      state.quest === QUEST.PICK_GUN ||
      state.quest === QUEST.TALK_ROBOT ||
      state.quest === QUEST.EXIT_ROCKET
    ) {
      shineOrb.visible = false;
      if (!state.crateLooted) crate.visible = false;
      signalRelay.visible = false;
      signalArrow.visible = false;
      if (state.quest !== QUEST.FIND_SPHERE && state.quest !== QUEST.DEFEAT_BOSS) {
        mysterySphere.visible = false;
        bossMesh.visible = false;
      }
    }
  }
  return next;
}

function applyEvent(event) {
  const next = advanceQuest(state.quest, event);
  if (next !== state.quest) {
    setQuest(next);
    onQuestEnter(next);
  }
  // Early-game events may not match strict graph — sync flags
  if (event === "picked_gun" || event === "robot_broken") {
    syncEarlyGame(true);
  }
  return state.quest;
}

function onQuestEnter(q) {
  if (q === QUEST.FIND_SPHERE) {
    // Sahnede tek gizemli küre
    shineOrb.visible = false;
    bossMesh.visible = false;
    mysterySphere.visible = true;
    mysterySphere.position.set(6, 1.55, 24);
    state.sphereProgress = 0;
    state.sphereOpened = false;
    state.sphereShattering = false;
    state.sphereShatterT = 0;
    const ud = mysterySphere.userData;
    if (ud.body) {
      ud.body.visible = true;
      ud.body.material.emissiveIntensity = 1.0;
    }
    for (const c of ud.cracks || []) {
      c.visible = false;
      c.material.opacity = 0;
    }
    for (const s of ud.shards || []) s.mesh.visible = false;
    if (ud.ring) ud.ring.visible = true;
    showToast("Önde TEK gizemli küre · ateş et!", 3.5);
  }
  if (q === QUEST.DEFEAT_BOSS) {
    mysterySphere.visible = false;
    shineOrb.visible = false;
    spawnBoss();
  }
  if (q === QUEST.PICK_SHINE) {
    dropShineOrb();
  }
  if (q === QUEST.FIND_CRATE) {
    spawnNasaTower();
  }
  if (q === QUEST.TABLET) {
    showToast("📱 T ile tableti aç · Sinyal sekmesi yön gösterecek", 4);
  }
  if (q === QUEST.FIND_SIGNAL) {
    spawnSignalRelay();
    showToast("📡 Sinyal kilidi açıldı · mavi ışığa doğru yürü!", 4.5);
  }
  if (q === QUEST.ACTIVATE_RELAY) {
    showToast("Röleye yaklaş · E ile etkinleştir", 3.5);
  }
  if (q === QUEST.GET_JOLE) {
    spawnJole();
    showToast("Pembe JOLE jeli belirdi! Al ve roketi tamir et", 4.5);
  }
  if (q === QUEST.REPAIR_ROCKET) {
    showToast("Hasarlı rokete dön · E ile JOLE sür", 4);
  }
  if (q === QUEST.FINALE) {
    startFinale();
  }
  if (q === QUEST.DONE) {
    showEndScreen();
  }
}

function spawnJole() {
  joleCan.visible = true;
  joleCan.position.set(JOLE_POS.x, 0, JOLE_POS.z);
  joleCan.traverse((c) => {
    if (c.isMesh || c.isLight) c.visible = true;
  });
}

function setFinaleCaption(text, dim = false) {
  state.finaleCaption = text || "";
  if (!finaleOverlay || !finaleTextEl) return;
  if (!text) {
    finaleOverlay.classList.add("hidden");
    return;
  }
  finaleTextEl.textContent = text;
  finaleOverlay.classList.remove("hidden");
  finaleOverlay.classList.toggle("dim", dim);
}

function showEndScreen() {
  state.mode = MODE.FINALE;
  state.finalePhase = "end";
  uiEl.classList.add("hidden");
  crosshair.classList.add("hidden");
  tabletEl?.classList.add("hidden");
  setFinaleCaption("");
  if (endScreen) endScreen.classList.remove("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
  showToast("", 0);
}

function spawnSignalRelay() {
  signalRelay.visible = true;
  signalRelay.position.set(SIGNAL_RELAY_POS.x, 0, SIGNAL_RELAY_POS.z);
  signalRelay.traverse((c) => {
    if (c.isMesh || c.isLight) c.visible = true;
  });
  if (signalRelay.userData.holo) {
    signalRelay.userData.holo.material.opacity = 0;
  }
  signalArrow.visible = true;
  state.relayFound = false;
  state.relayActivated = false;
}

function updateInventoryUI() {
  const items = [];
  if (state.hasGun) items.push("🔫 Işın tabancası");
  if (state.hasFood) items.push("🍞 Yemek");
  if (state.hasPowerOrb) items.push("🔵 Güç Küresi");
  if (state.hasShineOrb) items.push("✨ Işıltı Küresi");
  if (state.hasTablet) items.push("📱 NASA Tableti");
  if (state.hasJole) items.push("🩷 JOLE jeli");
  invList.textContent = items.length ? items.join(" · ") : "—";
}

function updateBossHud() {
  if (!state.bossActive || !state.boss.alive) {
    bossHud.classList.add("hidden");
    return;
  }
  bossHud.classList.remove("hidden");
  const pct = (state.boss.hp / state.boss.maxHp) * 100;
  bossBar.style.width = `${pct}%`;
  bossHpText.textContent = `${Math.ceil(state.boss.hp)} / ${state.boss.maxHp}`;
}

function refreshTabletMusic() {
  const f = tabletFeatures({ hasShineOrb: state.hasShineOrb });
  state.musicUnlocked = f.music;
  if (tabMusic) tabMusic.disabled = !f.music;
  if (f.music) {
    musicMsg.textContent = "Müzik sistemi: AÇIK";
    musicNote.classList.remove("hidden");
  } else {
    musicMsg.textContent = "Işıltı Küresi gerekli…";
    musicNote.classList.add("hidden");
  }
}

/**
 * Draw live HENTW exploration map onto #map-canvas.
 * World XZ → canvas (top-down). Z grows downward on map (north = −Z up).
 */
function drawTabletMap() {
  const canvasEl = document.getElementById("map-canvas");
  if (!canvasEl) return;
  const ctx = canvasEl.getContext("2d");
  const W = canvasEl.width;
  const H = canvasEl.height;

  // World bounds covering crash pad + open area
  const world = { xMin: -20, xMax: 24, zMin: -12, zMax: 42 };
  const toMap = (x, z) => {
    const u = (x - world.xMin) / (world.xMax - world.xMin);
    const v = (z - world.zMin) / (world.zMax - world.zMin);
    return { x: u * (W - 24) + 12, y: v * (H - 24) + 12 };
  };

  // Background terrain
  ctx.fillStyle = "#071420";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 20, W * 0.5, H * 0.5, W * 0.7);
  grad.addColorStop(0, "#0e2a40");
  grad.addColorStop(1, "#050c14");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = "rgba(80, 160, 200, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * W;
    const y = (i / 8) * H;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Open-area tint (beyond room)
  const roomEdge = toMap(0, ROOM.d / 2);
  ctx.fillStyle = "rgba(40, 120, 80, 0.12)";
  ctx.fillRect(0, roomEdge.y, W, H - roomEdge.y);

  // Room footprint
  const r1 = toMap(-ROOM.w / 2, -ROOM.d / 2);
  const r2 = toMap(ROOM.w / 2, ROOM.d / 2);
  ctx.strokeStyle = "rgba(94, 231, 255, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(r1.x, r1.y, r2.x - r1.x, r2.y - r1.y);
  ctx.fillStyle = "rgba(94, 231, 255, 0.06)";
  ctx.fillRect(r1.x, r1.y, r2.x - r1.x, r2.y - r1.y);

  const drawLabel = (mx, my, text, color) => {
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, mx, my);
  };

  const drawMarker = (wx, wz, color, shape, label) => {
    const p = toMap(wx, wz);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    if (shape === "square") {
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeRect(-7, -7, 14, 14);
    } else if (shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    drawLabel(p.x, p.y + 18, label, color);
  };

  // Fixed points of interest
  drawMarker(rocket.position.x, rocket.position.z, "#ff8866", "square", "Roket");
  drawMarker(6, 24, "#cc88ff", "diamond", "Gizemli küre");
  drawMarker(crate.position.x, crate.position.z, "#ffcc44", "square", "NASA kule");
  if (
    signalRelay.visible ||
    state.quest === QUEST.FIND_SIGNAL ||
    state.quest === QUEST.ACTIVATE_RELAY ||
    state.quest === QUEST.GET_JOLE ||
    state.quest === QUEST.REPAIR_ROCKET
  ) {
    drawMarker(SIGNAL_RELAY_POS.x, SIGNAL_RELAY_POS.z, "#3de0ff", "diamond", "NASA röle");
  }
  if ((joleCan.visible || state.quest === QUEST.GET_JOLE) && !state.hasJole) {
    drawMarker(JOLE_POS.x, JOLE_POS.z, "#ff66aa", "diamond", "JOLE");
  }
  if (state.quest === QUEST.REPAIR_ROCKET || state.hasJole) {
    drawMarker(rocket.position.x, rocket.position.z, "#ff8866", "square", "Roket tamir");
  }

  // Player (you)
  const pp = toMap(player.group.position.x, player.group.position.z);
  ctx.save();
  ctx.translate(pp.x, pp.y);
  // pulse ring
  ctx.strokeStyle = "rgba(102, 255, 204, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12 + (Math.sin(clock.elapsedTime * 4) * 2), 0, Math.PI * 2);
  ctx.stroke();
  // facing arrow
  const yaw = player.group.rotation.y;
  ctx.rotate(yaw);
  ctx.fillStyle = "#66ffcc";
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(7, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  drawLabel(pp.x, pp.y + 22, "SEN", "#66ffcc");

  // Compass
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(W - 52, 8, 44, 44);
  ctx.fillStyle = "#8ec8e8";
  ctx.font = "bold 12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("K", W - 30, 26);
  ctx.font = "10px system-ui";
  ctx.fillText("N", W - 30, 42);

  // Frame
  ctx.strokeStyle = "rgba(94, 231, 255, 0.5)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
}

function refreshSignalPanel() {
  const panel = document.getElementById("tab-panel-signal");
  if (!panel) return;
  const unlocked =
    state.hasTablet &&
    (state.quest === QUEST.TABLET ||
      state.quest === QUEST.FIND_SIGNAL ||
      state.quest === QUEST.ACTIVATE_RELAY ||
      state.quest === QUEST.DONE ||
      state.crateLooted);
  const px = player.group.position.x;
  const pz = player.group.position.z;
  const dist = logicDistXZ(px, pz, SIGNAL_RELAY_POS.x, SIGNAL_RELAY_POS.z);
  const strength = unlocked ? Math.max(5, Math.min(99, Math.round(100 - dist * 1.8))) : 0;
  const bars = Math.round(strength / 10);
  const bar = "█".repeat(bars) + "░".repeat(10 - bars);

  let dirTxt = "—";
  if (unlocked) {
    const dx = SIGNAL_RELAY_POS.x - px;
    const dz = SIGNAL_RELAY_POS.z - pz;
    // map: -Z = kuzey (N)
    if (Math.abs(dx) > Math.abs(dz)) dirTxt = dx > 0 ? "DOĞU →" : "← BATI";
    else dirTxt = dz < 0 ? "KUZEY ↑" : "GÜNEY ↓";
    if (Math.abs(dx) > 3 && Math.abs(dz) > 3) {
      dirTxt =
        (dz < 0 ? "KUZEY" : "GÜNEY") + "-" + (dx > 0 ? "DOĞU" : "BATI");
    }
  }

  panel.innerHTML = unlocked
    ? `<p><strong>Sinyal tarayıcı: AÇIK</strong></p>
       <p class="signal-bar">${bar} %${strength}</p>
       <p>Kaynak yönü: <strong>${dirTxt}</strong></p>
       <p>Mesafe: ~${dist.toFixed(0)} m · mavi NASA rölesi</p>
       <p style="color:#8ec8e8;font-size:12px;margin-top:8px">Robotun sırrı: bu röle eve dönüş frekansını taşır.</p>`
    : `<p>Sinyal tarayıcı: kilitli</p>
       <p class="signal-bar">░░░░░░░░░░ %0</p>
       <p>Önce NASA acil kulesinden tablet al.</p>`;
}

function openTablet() {
  if (!state.hasTablet) {
    showToast("Önce NASA Tableti al (kuleyi E ile aç)", 2.5);
    return;
  }
  state.tabletOpen = true;
  tabletEl.classList.remove("hidden");

  // Kule sonrası: sinyal sekmesi öncelikli
  const preferSignal =
    state.quest === QUEST.TABLET ||
    state.quest === QUEST.FIND_SIGNAL ||
    state.quest === QUEST.ACTIVATE_RELAY;
  const tabName = preferSignal ? "signal" : "map";
  document.querySelectorAll("#tablet-tabs .tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tabName);
  });
  document.getElementById("tab-panel-map")?.classList.toggle("hidden", tabName !== "map");
  document.getElementById("tab-panel-signal")?.classList.toggle("hidden", tabName !== "signal");
  document.getElementById("tab-panel-music")?.classList.add("hidden");
  refreshTabletMusic();
  refreshSignalPanel();
  if (tabName === "map") drawTabletMap();
  applyEvent("tablet_opened"); // TABLET → FIND_SIGNAL
  if (document.pointerLockElement) document.exitPointerLock();
}

function closeTablet() {
  state.tabletOpen = false;
  tabletEl.classList.add("hidden");
}

// Tablet tabs
document.querySelectorAll("#tablet-tabs .tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    document.querySelectorAll("#tablet-tabs .tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.getElementById("tab-panel-map")?.classList.toggle("hidden", tab !== "map");
    document.getElementById("tab-panel-signal")?.classList.toggle("hidden", tab !== "signal");
    document.getElementById("tab-panel-music")?.classList.toggle("hidden", tab !== "music");
    if (tab === "map") drawTabletMap();
    if (tab === "signal") refreshSignalPanel();
  });
});
document.getElementById("tablet-close")?.addEventListener("click", closeTablet);

// ---------------------------------------------------------------------------
// Cinematic
// ---------------------------------------------------------------------------
function setCineTargets(key) {
  applyCamPlayerVisibility(key);
  setPlanetVisible(key === "space" || key === "approach");

  switch (key) {
    case "space":
      // Orbit Earth — player hidden, round globe
      cineCam.targetPos.set(0, 2, -12);
      cineCam.targetLook.set(0, 0, -40);
      bloom.strength = 0.45;
      setVistaOpen(false);
      if (vistaGroup) vistaGroup.visible = false;
      break;
    case "approach":
      cineCam.targetPos.set(8, 3, -18);
      cineCam.targetLook.set(0, 0, -40);
      bloom.strength = 0.4;
      setVistaOpen(false);
      if (vistaGroup) vistaGroup.visible = false;
      break;
    case "storm":
      setPlanetVisible(false);
      if (vistaGroup) vistaGroup.visible = true;
      cineCam.targetPos.set(4, 3, 5);
      cineCam.targetLook.set(-3, 1, -2);
      bloom.strength = 1.0;
      setVistaOpen(false);
      break;
    case "black":
      setPlanetVisible(false);
      if (vistaGroup) vistaGroup.visible = true;
      cineCam.targetPos.set(0, 2, 6);
      cineCam.targetLook.set(0, 0.5, 2);
      bloom.strength = 0.2;
      break;
    case "reveal":
      setPlanetVisible(false);
      if (vistaGroup) vistaGroup.visible = true;
      cineCam.revealT = 0;
      cineCam.logoShown = false;
      camera.position.copy(cineCam.revealFrom);
      bloom.strength = 0.7;
      setVistaOpen(true);
      break;
    case "wake":
      setPlanetVisible(false);
      if (vistaGroup) vistaGroup.visible = true;
      setPlayerVisible(true);
      cineCam.targetPos.set(2.2, 1.2, 4.2);
      cineCam.targetLook.set(0.8, 0.2, 2.2);
      bloom.strength = 0.45;
      setVistaOpen(false);
      break;
    default:
      setPlanetVisible(false);
  }
  if (key !== "reveal") {
    camera.position.copy(cineCam.targetPos);
  }
}

function showStoryBeat(i) {
  const beat = STORY[i];
  if (!beat) return;
  cineContent.classList.remove("show");
  logoCard.classList.add("hidden");
  logoCard.classList.remove("show");
  void cineContent.offsetWidth;
  cineChapter.textContent = beat.chapter || "";
  cineTitle.textContent = beat.title || "";
  cineBody.textContent = beat.body || "";
  setCineTargets(beat.cam);

  if (beat.cam === "black") {
    cinematicEl.classList.remove("scene-dim", "scene-clear");
    cinematicEl.style.background = "#000";
    cineContent.classList.remove("logo-mode");
  } else if (beat.cam === "reveal") {
    cinematicEl.classList.remove("scene-dim");
    cinematicEl.classList.add("scene-clear");
    cinematicEl.style.background = "transparent";
    cineContent.classList.add("logo-mode");
    logoCard.classList.remove("hidden");
  } else if (beat.cam === "space" || beat.cam === "approach") {
    // Let the round Earth show through (light UI only)
    cinematicEl.classList.remove("scene-dim");
    cinematicEl.classList.add("scene-clear");
    cinematicEl.style.background = "transparent";
    cineContent.classList.remove("logo-mode");
  } else {
    cinematicEl.classList.add("scene-dim");
    cinematicEl.classList.remove("scene-clear");
    cinematicEl.style.background = "";
    cineContent.classList.remove("logo-mode");
  }

  if (beat.flash) {
    cineFlash.classList.add("on");
    setTimeout(() => cineFlash.classList.remove("on"), 120);
  }
  if (!beat.logo) requestAnimationFrame(() => cineContent.classList.add("show"));
  state.storyTimer = 0;
  state.storyAdvanceReady = false;
}

function advanceStory() {
  if (state.mode !== MODE.CINEMATIC) return;
  state.storyIndex++;
  if (state.storyIndex >= STORY.length) {
    beginWake();
    return;
  }
  showStoryBeat(state.storyIndex);
}

function skipStory() {
  if (state.mode !== MODE.CINEMATIC) return;
  beginWake();
}

function beginWake() {
  state.mode = MODE.WAKE;
  state.wakeT = 0;
  setPlanetVisible(false);
  if (vistaGroup) vistaGroup.visible = true;
  setPlayerVisible(true);
  logoCard.classList.remove("show");
  logoCard.classList.add("hidden");
  setVistaOpen(false);
  cinematicEl.classList.add("fade-out");
  setTimeout(() => {
    cinematicEl.classList.add("hidden");
    cinematicEl.classList.remove("fade-out", "scene-clear");
  }, 700);
  wakeOverlay.classList.remove("hidden");
  wakeOverlay.classList.remove("fade");
  requestAnimationFrame(() => setTimeout(() => wakeOverlay.classList.add("fade"), 200));
  camera.position.set(1.6, 0.55, 3.1);
  camera.lookAt(0.8, 0.25, 2.2);
  bloom.strength = 0.5;
  if (dbgMode) dbgMode.textContent = MODE.WAKE;
}

function beginPlay() {
  state.mode = MODE.PLAY;
  state.playerStand = 1;
  player.bodyRoot.rotation.x = 0;
  player.bodyRoot.position.y = 0;
  setPlayerVisible(true);
  setPlanetVisible(false);
  if (planetGroup) planetGroup.visible = false;
  // Geç oyun objeleri — başlangıçta KAPALI (güç/ışıltı/kule/röle yok)
  mysterySphere.visible = false;
  shineOrb.visible = false;
  state.shineDropped = false;
  bossMesh.visible = false;
  state.bossActive = false;
  crate.visible = false;
  state.crateLooted = false;
  signalRelay.visible = false;
  signalArrow.visible = false;
  joleCan.visible = false;
  alienShip.visible = false;
  state.relayFound = false;
  state.relayActivated = false;
  state.hasJole = false;
  state.rocketRepaired = false;
  state.finalePhase = "";
  state.finaleT = 0;
  state.hasPowerOrb = false;
  state.hasFood = false;
  state.hasTablet = false;
  state.hasShineOrb = false;
  state.hasGun = false;
  state.robotBroken = false;
  state.robotTalked = false;
  state.dialogueLine = 0;
  gun.visible = true;
  player.heldGun.visible = false;
  dbgGun.textContent = "YOK";
  endScreen?.classList.add("hidden");
  finaleOverlay?.classList.add("hidden");

  wakeOverlay.classList.add("hidden");
  uiEl.classList.remove("hidden");
  crosshair.classList.remove("hidden");
  setQuest(QUEST.PICK_GUN);
  updateInventoryUI();
  showToast("1) Işın tabancası (E)  2) Robot (H) — sıra serbest", 4);
  bloom.strength = 0.55;
  if (dbgMode) dbgMode.textContent = MODE.PLAY;
}

// ---------------------------------------------------------------------------
// Interaction / combat
// ---------------------------------------------------------------------------
function worldDist(a, b) {
  return logicDistXZ(a.x, a.z, b.x, b.z);
}

function getNearbyInteract() {
  if (state.mode !== MODE.PLAY || state.dialogueOpen || state.tabletOpen) return null;
  const p = player.group.position;
  if (!state.hasGun && gun.visible && canInteract(worldDist(p, gun.position), INTERACT_RANGE)) {
    return { type: "gun", label: "[E] Işın tabancasını al" };
  }
  if (!state.robotBroken && canInteract(worldDist(p, robot.group.position), INTERACT_RANGE)) {
    return {
      type: "robot",
      label: state.robotTalked ? "[H] Konuşmaya devam" : "[H] Hasarlı robotla konuş",
    };
  }
  if (state.robotBroken && canInteract(worldDist(p, robot.group.position), INTERACT_RANGE)) {
    return { type: "robot_dead", label: "Robot tamamen bozulmuş…" };
  }
  if (
    state.shineDropped &&
    shineOrb.visible &&
    canInteract(worldDist(p, shineOrb.position), INTERACT_RANGE)
  ) {
    return { type: "shine", label: "[E] Işıltı Küresini topla" };
  }
  if (
    crate.visible &&
    !state.crateLooted &&
    canInteract(worldDist(p, crate.position), INTERACT_RANGE + 1.4)
  ) {
    return { type: "crate", label: "[E] NASA acil kulesini aç" };
  }
  if (
    signalRelay.visible &&
    !state.relayActivated &&
    canInteract(worldDist(p, signalRelay.position), INTERACT_RANGE + 1.8)
  ) {
    return {
      type: "relay",
      label: state.relayFound
        ? "[E] NASA rölesini etkinleştir"
        : "[E] NASA sinyal rölesine bağlan",
    };
  }
  if (
    joleCan.visible &&
    !state.hasJole &&
    canInteract(worldDist(p, joleCan.position), INTERACT_RANGE + 0.5)
  ) {
    return { type: "jole", label: "[E] JOLE onarım jelini al" };
  }
  if (
    state.hasJole &&
    !state.rocketRepaired &&
    (state.quest === QUEST.REPAIR_ROCKET || state.quest === QUEST.GET_JOLE) &&
    canInteract(worldDist(p, rocket.position), INTERACT_RANGE + 2.2)
  ) {
    return { type: "repair", label: "[E] JOLE ile roketi tamir et" };
  }
  return null;
}

function pickUpGun() {
  if (state.hasGun) return;
  state.hasGun = true;
  gun.visible = false;
  player.heldGun.visible = true;
  dbgGun.textContent = "VAR";
  updateInventoryUI();
  showToast("Işın tabancası alındı");
  // Sıra bağımsız: bayrak + sync (robot önce konuşulmuş olabilir)
  syncEarlyGame(true);
}

function showDialogueLine(i) {
  const line = ROBOT_LINES[i];
  if (!line) return;
  state.dialogueOpen = true;
  state.dialogueLine = i;
  dialogueEl.classList.remove("hidden");
  promptEl.classList.add("hidden");
  dialogueSpeakerEl.textContent = line.speaker;
  dialogueTextEl.textContent =
    line.text + (i < ROBOT_LINES.length - 1 ? "\n\n[H] devam" : "");
}

function openRobotDialogue() {
  // Silah şart değil — robot her zaman konuşulabilir (bozulmadıysa)
  if (state.robotBroken) {
    state.dialogueOpen = true;
    dialogueEl.classList.remove("hidden");
    dialogueSpeakerEl.textContent = "NASA ROBOTU — ÇEVRIMDIŞI";
    dialogueTextEl.textContent = state.hasGun
      ? "… … … (sır yarıda kaldı.) Roketten çık, araziyi keşfet."
      : "… … … Önce yerdeki ışın tabancasını al (E), sonra dışarı çık.";
    // Eğer silah da alındıysa görevi düzelt
    syncEarlyGame(false);
    return;
  }
  if (!state.robotTalked) {
    state.robotTalked = true;
    showDialogueLine(0);
  } else {
    showDialogueLine(Math.min(state.dialogueLine, ROBOT_LINES.length - 1));
  }
}

function advanceRobotDialogue() {
  if (!state.dialogueOpen || state.robotBroken) {
    closeDialogue();
    return;
  }
  const cur = ROBOT_LINES[state.dialogueLine];
  if (cur?.triggerMetal) {
    closeDialogue();
    startMetalCutscene();
    return;
  }
  const next = state.dialogueLine + 1;
  if (next >= ROBOT_LINES.length) {
    closeDialogue();
    return;
  }
  showDialogueLine(next);
}

function closeDialogue() {
  state.dialogueOpen = false;
  dialogueEl.classList.add("hidden");
}

function unlockOpenWorld() {
  if (state.openWorld) return;
  state.openWorld = true;
  for (const w of roomOpenables) w.visible = false;
  setVistaOpen(true);
  exitBeacon.visible = true;
  exitArrow.visible = true;
  // Asla ışıltı/güç/kule burada açılmaz
  shineOrb.visible = false;
  if (!state.crateLooted) crate.visible = false;
  signalRelay.visible = false;
  showToast("Duvar açıldı · dışarı çıkabilirsin", 3);
}

function startMetalCutscene() {
  // Geç spawn'lar kapalı kalsın
  shineOrb.visible = false;
  state.mode = MODE.CUTSCENE;
  state.cutsceneT = 0;
  state.metalImpactDone = false;
  if (dbgMode) dbgMode.textContent = MODE.CUTSCENE;
  const look = robot.group.position.clone();
  look.y += 1.1;
  camera.position.set(look.x + 1.8, 2.4, look.z + 2.4);
  camera.lookAt(look);
}

function finishMetalCutscene() {
  state.robotBroken = true;
  state.mode = MODE.PLAY;
  if (dbgMode) dbgMode.textContent = MODE.PLAY;
  robot.group.rotation.z = 1.15;
  robot.group.rotation.x = 0.25;
  robot.spark.intensity = 0.15;
  robot.eye.material.emissiveIntensity = 0.15;
  const metal = rocket.userData.fallingMetal;
  if (metal) {
    metal.position.copy(rocket.userData.metalEnd);
    metal.rotation.set(0.9, 0.4, 1.1);
  }
  // Geç objeler KESİNLİKLE kapalı (güç/ışıltı robot anında çıkmasın)
  shineOrb.visible = false;
  state.shineDropped = false;
  mysterySphere.visible = false;
  bossMesh.visible = false;
  if (!state.crateLooted) crate.visible = false;
  signalRelay.visible = false;

  unlockOpenWorld();
  // Sıra: silah yoksa PICK_GUN, varsa EXIT_ROCKET
  syncEarlyGame(true);
  if (state.hasGun) {
    showToast("Robot bozuldu! Roketten çık · keşfe başla", 4);
  } else {
    showToast("Robot bozuldu! Yerdeki ışın tabancasını al (E)", 4);
  }
}

function spawnBoss() {
  mysterySphere.visible = false;
  shineOrb.visible = false;
  state.boss = createBoss(Math.max(40, Math.round(80 * easyEnemyHpMult(state.easyMode))));
  state.bossActive = true;
  state.shineDropped = false;
  bossMesh.visible = true;
  bossMesh.position.set(10, 0, 28);
  updateBossHud();
  showToast("İlk boss! Sol tık ateş · yenince Işıltı Küresi düşer", 3.5);
}

/** Boss yenilince sarı Işıltı Küresi mutlaka düşer */
function dropShineOrb() {
  mysterySphere.visible = false;
  bossMesh.visible = false;
  state.shineDropped = true;
  state.hasShineOrb = false;

  // Boss'un olduğu yerde (veya varsayılan alanda)
  const bx = bossMesh.position.x || 10;
  const bz = bossMesh.position.z || 28;
  shineOrb.position.set(bx, 0.15, bz);
  shineOrb.visible = true;

  // Tüm çocuklar görünür
  shineOrb.traverse((c) => {
    if (c.isMesh || c.isLight) c.visible = true;
  });

  showToast("✨ Işıltı Küresi düştü! Yanına git · E ile al", 4.5);
}

/** Apply hit damage to gizemli küre — shows cracks, then shatters open */
function hitMysterySphere(amount) {
  if (state.sphereOpened || state.sphereShattering) return;
  if (!mysterySphere.visible) return;

  const prev = state.sphereProgress;
  const r = applySphereHit(state.sphereProgress, amount);
  state.sphereProgress = r.progress;
  const p = state.sphereProgress;
  const ud = mysterySphere.userData;
  const body = ud.body || ud.shell;

  ud.hitFlash = 0.18;
  if (body?.material) {
    body.material.emissiveIntensity = 0.9 + p * 2.4;
    body.material.color.setRGB(0.35 + p * 0.3, 0.16, 0.6 + p * 0.2);
  }
  if (ud.glow) ud.glow.intensity = 2.2 + p * 5;
  mysterySphere.scale.setScalar(1 + p * 0.1 + 0.05);

  // Reveal crack lines by progress
  const cracks = ud.cracks || [];
  const showCount = Math.min(cracks.length, Math.ceil(p * cracks.length));
  for (let i = 0; i < cracks.length; i++) {
    const c = cracks[i];
    if (i < showCount) {
      c.visible = true;
      c.material.opacity = 0.75 + p * 0.25;
    } else {
      c.visible = false;
    }
  }

  if (prev < 0.25 && p >= 0.25) showToast("Küre çatlıyor…", 1.6);
  if (prev < 0.55 && p >= 0.55) showToast("Çatlaklar büyüyor!", 1.6);
  if (prev < 0.85 && p >= 0.85) showToast("Neredeyse kırılıyor!", 1.6);

  if (r.opened) startSphereShatter();
}

function startSphereShatter() {
  if (state.sphereShattering) return;
  state.sphereOpened = true;
  state.sphereShattering = true;
  state.sphereShatterT = 0;
  const ud = mysterySphere.userData;

  if (ud.body) ud.body.visible = false;
  for (const c of ud.cracks || []) c.visible = false;
  if (ud.ring) ud.ring.visible = false;

  for (const s of ud.shards || []) {
    s.mesh.visible = true;
    s.mesh.position.set(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    );
  }

  if (impactFlash) {
    impactFlash.classList.remove("hidden");
    impactFlash.classList.add("on");
    setTimeout(() => {
      impactFlash.classList.remove("on");
      setTimeout(() => impactFlash.classList.add("hidden"), 80);
    }, 90);
  }

  if (ud.glow) ud.glow.intensity = 12;
  showToast("Gizemli küre çatladı!", 2.8);
  // Boss'u HEMEN çıkarma — küre tamamen bitince (çift “küre” hissi olmasın)
}

function updateSphereShatter(dt) {
  if (!state.sphereShattering) return;
  state.sphereShatterT += dt;
  const ud = mysterySphere.userData;
  const t = state.sphereShatterT;

  for (const s of ud.shards || []) {
    s.mesh.position.addScaledVector(s.vel, dt);
    s.vel.y -= 7 * dt;
    s.mesh.rotation.x += s.spin.x * dt;
    s.mesh.rotation.y += s.spin.y * dt;
    s.mesh.rotation.z += s.spin.z * dt;
    if (s.mesh.material.opacity !== undefined) {
      s.mesh.material.opacity = Math.max(0, 1 - t / 1.1);
    }
  }

  if (ud.glow) ud.glow.intensity = Math.max(0, 12 * (1 - t / 1.0));

  if (t >= 1.15) {
    state.sphereShattering = false;
    mysterySphere.visible = false;
    for (const s of ud.shards || []) s.mesh.visible = false;
    // Artık sahnede gizemli küre yok → boss gelsin
    if (state.quest === QUEST.FIND_SPHERE || state.quest === QUEST.DEFEAT_BOSS) {
      // FIND_SPHERE ise geç; DEFEAT_BOSS ise spawn zaten olmuş olabilir
      if (state.quest === QUEST.FIND_SPHERE) {
        applyEvent("sphere_opened");
      }
    }
  }
}

function tryShoot() {
  if (state.mode !== MODE.PLAY || !state.hasGun || state.dialogueOpen || state.tabletOpen) return;
  if (state.shootCooldown > 0) return;
  state.shootCooldown = 0.22;

  // Muzzle direction from camera look
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const origin = player.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
  const bolt = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x66ffff })
  );
  bolt.position.copy(origin);
  scene.add(bolt);
  bullets.push({ mesh: bolt, dir: dir.clone(), life: 1.2, speed: 38 });
  sfx.shoot();
  if (typeof FX !== "undefined") FX.spawnBurst(origin.x, origin.y, origin.z, 0x66ffff, 6, 2);

  // Sphere hits — cracks grow, then full shatter
  if (mysterySphere.visible && !state.sphereOpened && !state.sphereShattering) {
    const toS = mysterySphere.position.clone().sub(origin);
    const dist = toS.length();
    if (dist < SHOOT_RANGE && dir.dot(toS.normalize()) > 0.82) {
      hitMysterySphere(0.2);
    }
  }

  // Boss hits — daha affedici nişan
  if (state.bossActive && state.boss.alive && bossMesh.visible) {
    const bossCenter = bossMesh.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const toB = bossCenter.clone().sub(origin);
    const dist = toB.length() || 1;
    const aim = dir.dot(toB.clone().normalize());
    // Yakından veya kabaca nişan alınca vur
    const canHit = dist < SHOOT_RANGE && (aim > 0.55 || dist < 6);
    if (canHit) {
      const res = applyBossDamage(state.boss, Math.round(16 * easyPlayerDamageMult(state.easyMode)));
      state.boss = { hp: res.hp, maxHp: res.maxHp, alive: res.alive };
      updateBossHud();
      if (bossMesh.userData.body?.material) {
        bossMesh.userData.body.material.emissiveIntensity = 2.4;
      }
      // hasar flash
      bossMesh.scale.setScalar(1.08);
      setTimeout(() => bossMesh.scale.setScalar(1), 60);

      if (res.justDefeated || state.boss.hp <= 0) {
        onBossDefeated();
      }
    }
  }
}

function onBossDefeated() {
  if (!state.bossActive && state.shineDropped && shineOrb.visible) return;
  state.bossActive = false;
  state.boss.alive = false;
  state.boss.hp = 0;
  bossMesh.visible = false;
  updateBossHud();

  // Önce düşmanı düşür, quest'i ilerlet
  dropShineOrb();

  if (state.quest === QUEST.DEFEAT_BOSS) {
    applyEvent("boss_defeated"); // → PICK_SHINE (dropShineOrb zaten çağrıldı)
  } else if (state.quest !== QUEST.PICK_SHINE && state.quest !== QUEST.FIND_CRATE) {
    setQuest(QUEST.PICK_SHINE);
  }
  // applyEvent PICK_SHINE tekrar dropShineOrb çağırır — zararsız
}

function pickShine() {
  if (!shineOrb.visible && !state.shineDropped) return;
  shineOrb.visible = false;
  state.hasShineOrb = true;
  state.shineDropped = false;
  updateInventoryUI();
  refreshTabletMusic();
  applyEvent("shine_picked"); // → FIND_CRATE → spawnNasaTower
  // Quest zinciri bozulsa bile kule çıksın
  spawnNasaTower();
}

function openCrate() {
  if (state.crateLooted) return;
  if (!crate.visible) spawnNasaTower();
  const loot = crateLoot();
  state.crateLooted = true;
  state.hasFood = loot.food;
  state.hasPowerOrb = loot.powerOrb;
  state.hasTablet = loot.tablet;
  crate.visible = true;
  // Işık sönsün (açıldı)
  if (crate.userData.beaconLight) crate.userData.beaconLight.intensity = 0.4;
  if (crate.userData.beam) crate.userData.beam.material.opacity = 0.08;
  updateInventoryUI();
  showToast("🍞 Yemek · 🔵 Güç · 📱 Tablet alındı! T ile aç · sinyali takip et", 5);
  applyEvent("crate_looted"); // → TABLET
}

function activateRelay() {
  if (state.relayActivated) return;
  if (!signalRelay.visible) spawnSignalRelay();

  if (!state.relayFound) {
    state.relayFound = true;
    applyEvent("signal_found"); // FIND_SIGNAL → ACTIVATE_RELAY
    showToast("Röle bulundu! Tekrar E — etkinleştir", 3);
    return;
  }

  state.relayActivated = true;
  if (signalRelay.userData.holo) {
    signalRelay.userData.holo.material.opacity = 0.75;
  }
  if (signalRelay.userData.light) {
    signalRelay.userData.light.intensity = 6;
    signalRelay.userData.light.color.setHex(0x66ffcc);
  }
  if (signalRelay.userData.beam) {
    signalRelay.userData.beam.material.color.setHex(0x66ffcc);
    signalRelay.userData.beam.material.opacity = 0.55;
  }
  signalArrow.visible = false;
  showToast("Röle aktif! JOLE jeli ile roketi tamir edebilirsin", 4.5);
  applyEvent("relay_activated"); // → GET_JOLE
}

function pickJole() {
  if (state.hasJole) return;
  state.hasJole = true;
  joleCan.visible = false;
  updateInventoryUI();
  showToast("🩷 JOLE alındı! Rokete git ve E ile tamir et", 4);
  applyEvent("jole_picked"); // → REPAIR_ROCKET
}

function repairRocketWithJole() {
  if (!state.hasJole || state.rocketRepaired) return;
  state.rocketRepaired = true;

  // Görsel: roket pembe jole parıltısı + daha “sağlam”
  const jelly = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xff66aa,
      emissive: 0xff2288,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.55,
    })
  );
  jelly.position.set(0, 1.2, 0.3);
  rocket.add(jelly);
  rocket.userData.jelly = jelly;

  // Küçük yeşil “tamir OK” ışığı
  const ok = new THREE.PointLight(0x66ffaa, 2, 8, 2);
  ok.position.set(0, 2, 1);
  rocket.add(ok);

  showToast("Roket JOLE ile tamir edildi! Kalkış…", 3);
  applyEvent("rocket_repaired"); // → FINALE → startFinale
}

/**
 * Finale: kalkış → Dünya yolu → uzaylı ateşi → düşüş → credits
 */
function startFinale() {
  state.mode = MODE.FINALE;
  state.finalePhase = "launch";
  state.finaleT = 0;
  state.tabletOpen = false;
  tabletEl?.classList.add("hidden");
  uiEl.classList.add("hidden");
  crosshair.classList.add("hidden");
  promptEl.classList.add("hidden");
  if (document.pointerLockElement) document.exitPointerLock();

  // Oyuncu/yer gizli — sinema
  setPlayerVisible(false);
  player.group.visible = false;
  shineOrb.visible = false;
  bossMesh.visible = false;
  mysterySphere.visible = false;
  joleCan.visible = false;
  signalArrow.visible = false;
  alienShip.visible = false;

  setPlanetVisible(true);
  if (vistaGroup) vistaGroup.visible = false;
  setVistaOpen(false);

  // Roketi “kalkış” için ortaya al
  rocket.visible = true;
  rocket.position.set(0, 0, -8);
  rocket.rotation.set(0, 0, 0);
  rocket.scale.setScalar(1.15);

  setFinaleCaption("JOLE tuttu… Motorlar ısınıyor!\nDünya’ya doğru kalkış!");
  camera.position.set(6, 4, 6);
  camera.lookAt(0, 1, -8);
  bloom.strength = 0.7;
}

function updateFinale(dt) {
  state.finaleT += dt;
  const t = state.finaleT;
  const phase = state.finalePhase;

  if (phase === "launch") {
    // Roket yükselir
    const u = Math.min(1, t / 4.5);
    rocket.position.y = u * u * 28;
    rocket.position.z = -8 - u * 10;
    rocket.rotation.x = -u * 0.35;
    camera.position.set(8 + u * 4, 3 + u * 12, 10 - u * 5);
    camera.lookAt(rocket.position.x, rocket.position.y + 1, rocket.position.z);
    if (rocket.userData.jelly) {
      rocket.userData.jelly.material.emissiveIntensity = 1 + Math.sin(t * 8) * 0.5;
    }
    if (t > 4.8) {
      state.finalePhase = "space";
      state.finaleT = 0;
      setFinaleCaption("Dünya’ya yolculuk…\nSakin bir geçiş gibi görünüyor.");
      // Uzay sahnesi
      if (vistaGroup) vistaGroup.visible = false;
      setPlanetVisible(true);
      rocket.position.set(0, 0, 0);
      rocket.rotation.set(0, 0, Math.PI / 2);
      rocket.scale.setScalar(0.9);
      alienShip.visible = true;
      alienShip.position.set(18, 4, -6);
    }
    return;
  }

  if (phase === "space") {
    // Roket Dünya’ya doğru süzülür, uzaylı yaklaşır
    rocket.position.x = -2 + Math.sin(t * 0.4) * 0.3;
    rocket.position.y = Math.sin(t * 0.6) * 0.4;
    rocket.position.z = -t * 1.2;
    alienShip.position.x = 14 - t * 2.2;
    alienShip.position.y = 3 + Math.sin(t * 2) * 1.2;
    alienShip.position.z = -4 - t * 0.8;
    alienShip.lookAt(rocket.position);
    camera.position.set(-6, 3, 8);
    camera.lookAt(rocket.position.x, rocket.position.y, rocket.position.z - 2);
    if (planetGroup?.userData?.earth) {
      planetGroup.userData.earth.rotation.y += dt * 0.05;
    }
    if (t > 3.5) {
      state.finalePhase = "hit";
      state.finaleT = 0;
      setFinaleCaption("Kırmızı alarm!\nUzaylılar bizi vuruyor!");
    }
    return;
  }

  if (phase === "hit") {
    // Lazer vuruşları + sarsıntı
    if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) {
      if (impactFlash) {
        impactFlash.classList.remove("hidden");
        impactFlash.classList.add("on");
        setTimeout(() => {
          impactFlash.classList.remove("on");
          setTimeout(() => impactFlash.classList.add("hidden"), 40);
        }, 50);
      }
    }
    rocket.position.x += (Math.random() - 0.5) * 0.25;
    rocket.position.y += (Math.random() - 0.5) * 0.2;
    rocket.rotation.z += (Math.random() - 0.5) * 0.15;
    alienShip.position.x = 6 - t * 0.5;
    alienShip.lookAt(rocket.position);
    // Yeşil lazer çizgisi
    camera.position.set(-4 + Math.random() * 0.3, 2.5, 7);
    camera.lookAt(rocket.position);
    if (t > 2.8) {
      state.finalePhase = "fall";
      state.finaleT = 0;
      setFinaleCaption("Kontrol kaybedildi!\nBilinmeyen bir gezegene düşüyoruz…");
      alienShip.visible = false;
      setPlanetVisible(false);
      // Yeşil uzaylı gezegeni
      scene.background = new THREE.Color(0x041008);
      scene.fog = new THREE.FogExp2(0x0a2010, 0.02);
      if (vistaGroup) {
        vistaGroup.visible = true;
        // tint-ish: just show vista as "alien world"
      }
      rocket.position.set(0, 30, 10);
      rocket.rotation.set(1.2, 0.4, 0.8);
    }
    return;
  }

  if (phase === "fall") {
    const u = Math.min(1, t / 3.5);
    rocket.position.y = 30 - u * u * 30;
    rocket.position.x = Math.sin(t * 3) * 2;
    rocket.rotation.x += dt * 2;
    rocket.rotation.z += dt * 1.5;
    camera.position.set(8, 6 + (1 - u) * 10, 16);
    camera.lookAt(rocket.position);
    hemi.intensity = 0.4;
    sun.color.setHex(0x88ff99);
    sun.intensity = 1.1;
    if (t > 3.6) {
      state.finalePhase = "crash";
      state.finaleT = 0;
      rocket.position.set(2, 0.5, 8);
      rocket.rotation.set(0.4, 0.8, 1.1);
      if (impactFlash) {
        impactFlash.classList.remove("hidden");
        impactFlash.classList.add("on");
        setTimeout(() => {
          impactFlash.classList.remove("on");
          setTimeout(() => impactFlash.classList.add("hidden"), 120);
        }, 100);
      }
      setFinaleCaption("Uzaylı gezegenine iniş…\n(zorla)", true);
      camera.position.set(6, 3, 14);
      camera.lookAt(2, 1, 8);
    }
    return;
  }

  if (phase === "crash") {
    camera.position.lerp(new THREE.Vector3(5, 2.5, 12), 0.04);
    camera.lookAt(2, 0.8, 8);
    if (t > 3.2) {
      state.finalePhase = "end";
      applyEvent("finale_done"); // → DONE → showEndScreen
      setFinaleCaption("");
    }
    return;
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
function onAdvanceInput(e) {
  if (state.mode === MODE.CINEMATIC) {
    if (e.type === "keydown" && e.key === "Escape") {
      skipStory();
      return;
    }
    if (
      (e.type === "keydown" && (e.code === "Space" || e.key === "Enter")) ||
      e.type === "click"
    ) {
      e.preventDefault?.();
      advanceStory();
    }
  }
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);

  if (state.mode === MODE.CINEMATIC) {
    onAdvanceInput(e);
    return;
  }
  if (state.mode === MODE.CUTSCENE) return;

  if (state.tabletOpen) {
    if (k === "t" || k === "escape") {
      closeTablet();
      e.preventDefault();
    }
    return;
  }

  if (k === "escape") {
    if (state.dialogueOpen) {
      closeDialogue();
      e.preventDefault();
    }
    return;
  }

  if (state.mode !== MODE.PLAY) return;

  if (state.dialogueOpen) {
    if (k === "h" || k === " " || k === "enter") {
      e.preventDefault();
      advanceRobotDialogue();
    }
    return;
  }

  if (k === "e") {
    const near = getNearbyInteract();
    if (near?.type === "gun") pickUpGun();
    if (near?.type === "shine") pickShine();
    if (near?.type === "crate") openCrate();
    if (near?.type === "relay") activateRelay();
    if (near?.type === "jole") pickJole();
    if (near?.type === "repair") repairRocketWithJole();
  }
  if (k === "h") {
    const near = getNearbyInteract();
    if (near?.type === "robot") openRobotDialogue();
  }
  if (k === "t") {
    openTablet();
  }
});

window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
cinematicEl.addEventListener("click", (e) => onAdvanceInput(e));

canvas.addEventListener("click", () => {
  if (state.mode === MODE.PLAY && !state.pointerLocked && !state.tabletOpen) {
    canvas.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  state.pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", (e) => {
  if (!state.pointerLocked || state.mode !== MODE.PLAY || state.dialogueOpen) return;
  camOrbit.yaw -= e.movementX * camOrbit.sensitivity;
  camOrbit.pitch -= e.movementY * camOrbit.sensitivity;
  camOrbit.pitch = THREE.MathUtils.clamp(camOrbit.pitch, camOrbit.minPitch, camOrbit.maxPitch);
});

document.addEventListener("mousedown", (e) => {
  if (e.button === 0 && state.mode === MODE.PLAY && state.pointerLocked) {
    tryShoot();
  }
});

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
});

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let fpsAccum = 0;
let fpsFrames = 0;

function updateCinematic(dt) {
  const beat = STORY[state.storyIndex];
  if (!beat) return;
  state.storyTimer += dt;
  const t = clock.elapsedTime;

  if (beat.cam === "space" || beat.cam === "approach") {
    // Orbit round Earth; ensure player hidden
    setPlayerVisible(false);
    setPlanetVisible(true);
    if (planetGroup) {
      planetGroup.userData.earth.rotation.y = t * 0.12;
      const baseR = beat.cam === "space" ? 26 : 20;
      const ang = t * 0.18 + (beat.cam === "approach" ? 1.1 : 0.2);
      const elev = beat.cam === "space" ? 4 : 2.5;
      camera.position.set(
        Math.sin(ang) * baseR,
        elev + Math.sin(t * 0.25) * 1.2,
        -40 + Math.cos(ang) * baseR
      );
      camera.lookAt(0, 0, -40);
    }
    return;
  }

  if (beat.cam === "reveal") {
    cineCam.revealT = Math.min(1, cineCam.revealT + dt / 5.5);
    const u = cineCam.revealT;
    const s = u * u * (3 - 2 * u);
    const pos = new THREE.Vector3().lerpVectors(cineCam.revealFrom, cineCam.revealTo, s);
    pos.x += Math.sin(s * Math.PI) * 2.5;
    const look = new THREE.Vector3().lerpVectors(
      cineCam.revealLookFrom,
      cineCam.revealLookTo,
      s
    );
    camera.position.lerp(pos, 0.12);
    camera.lookAt(look);
    if (s > 0.35 && !cineCam.logoShown) {
      cineCam.logoShown = true;
      logoCard.classList.remove("hidden");
      requestAnimationFrame(() => logoCard.classList.add("show"));
    }
    if (state.storyTimer > beat.duration && !state.storyAdvanceReady) {
      state.storyAdvanceReady = true;
      advanceStory();
    }
    return;
  }

  camera.position.lerp(
    new THREE.Vector3(
      cineCam.targetPos.x + Math.sin(t * 0.35) * 0.35,
      cineCam.targetPos.y + Math.sin(t * 0.22) * 0.15,
      cineCam.targetPos.z + Math.cos(t * 0.3) * 0.25
    ),
    0.04
  );
  camera.lookAt(cineCam.targetLook);
  if (beat.cam === "storm") {
    camera.position.x += (Math.random() - 0.5) * 0.08;
  }
}

function updateWake(dt) {
  state.wakeT += dt;
  setPlayerVisible(true);
  const standStart = 1.8;
  const standDur = 2.4;
  if (state.wakeT < standStart) {
    const breathe = Math.sin(state.wakeT * 2) * 0.02;
    camera.position.set(1.55 + breathe, 0.45 + state.wakeT * 0.05, 3.05);
    camera.lookAt(0.8, 0.15 + state.wakeT * 0.05, 2.2);
  } else {
    const u = THREE.MathUtils.clamp((state.wakeT - standStart) / standDur, 0, 1);
    const s = u * u * (3 - 2 * u);
    player.bodyRoot.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2 + 0.15, 0, s);
    player.bodyRoot.position.y = THREE.MathUtils.lerp(0.28, 0, s);
    const from = new THREE.Vector3(1.55, 0.55, 3.05);
    const target = player.group.position.clone().add(new THREE.Vector3(0, 1.25, 0));
    const cp = Math.cos(camOrbit.pitch);
    const sp = Math.sin(camOrbit.pitch);
    const sy = Math.sin(camOrbit.yaw);
    const cy = Math.cos(camOrbit.yaw);
    const to = target
      .clone()
      .add(
        new THREE.Vector3(
          sy * cp * camOrbit.distance,
          sp * camOrbit.distance + 0.35,
          cy * cp * camOrbit.distance
        )
      );
    camera.position.lerpVectors(from, to, s);
    camera.lookAt(new THREE.Vector3().lerpVectors(new THREE.Vector3(0.8, 0.25, 2.2), target, s));
    if (u >= 1) beginPlay();
  }
}

function updateMetalCutscene(dt) {
  state.cutsceneT += dt;
  const t = state.cutsceneT;
  const metal = rocket.userData.fallingMetal;
  const look = robot.group.position.clone();
  look.y += 1.0;
  if (t < 0.55) {
    camera.position.x += (Math.random() - 0.5) * 0.06;
    camera.lookAt(look);
  }
  if (metal && t >= 0.55 && t < 1.4) {
    const u = THREE.MathUtils.clamp((t - 0.55) / 0.75, 0, 1);
    metal.position.lerpVectors(rocket.userData.metalStart, rocket.userData.metalEnd, u * u);
    camera.lookAt(look);
  }
  if (t >= 1.35 && t < 1.9) {
    if (!state.metalImpactDone) {
      state.metalImpactDone = true;
      if (impactFlash) {
        impactFlash.classList.remove("hidden");
        impactFlash.classList.add("on");
        setTimeout(() => {
          impactFlash.classList.remove("on");
          setTimeout(() => impactFlash.classList.add("hidden"), 100);
        }, 70);
      }
    }
    robot.group.rotation.z = THREE.MathUtils.lerp(0, 1.15, (t - 1.35) / 0.45);
  }
  if (t >= 2.6) finishMetalCutscene();
}

function getMoveBounds() {
  // Röle (x:20,z:40) erişilebilir olsun
  if (state.openWorld) return { x: 36, zMin: -PLAYER_HALF, zMax: 55 };
  return { x: PLAYER_HALF, zMin: -PLAYER_HALF, zMax: PLAYER_HALF };
}

function updatePlay(dt) {
  setPlayerVisible(true);
  state.shootCooldown = Math.max(0, state.shootCooldown - dt);

  if (!state.dialogueOpen && !state.tabletOpen) {
    let ix = 0;
    let iz = 0;
    if (keys.has("w") || keys.has("arrowup")) iz -= 1;
    if (keys.has("s") || keys.has("arrowdown")) iz += 1;
    if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
    if (keys.has("d") || keys.has("arrowright")) ix += 1;
    if (ix !== 0 || iz !== 0) {
      const sin = Math.sin(camOrbit.yaw);
      const cos = Math.cos(camOrbit.yaw);
      const mx = ix * cos + iz * sin;
      const mz = -ix * sin + iz * cos;
      const len = Math.hypot(mx, mz) || 1;
      const nx = (mx / len) * PLAYER_SPEED * dt;
      const nz = (mz / len) * PLAYER_SPEED * dt;
      const b = getMoveBounds();
      player.group.position.x = THREE.MathUtils.clamp(player.group.position.x + nx, -b.x, b.x);
      player.group.position.z = THREE.MathUtils.clamp(player.group.position.z + nz, b.zMin, b.zMax);
      player.group.rotation.y = Math.atan2(nx, nz);
    }
  }

  // Exit wreck detection (silah sonradan alınsa bile çalışsın)
  if (state.openWorld) {
    const p = player.group.position;
    const outside =
      (worldDist(p, rocket.position) > 4.5 || p.z > -0.5) &&
      p.z > ROOM.d / 2 - 2.5;
    if (outside) {
      if (!state.outsideDetected) {
        state.outsideDetected = true;
        if (!state.exitTutorialShown) {
          state.exitTutorialShown = true;
          showToast("WASD — Hareket Et · Fare — Bak", 4);
        }
      }
      // EXIT_ROCKET'a yeni geçmiş olabilir (robot→silah sırası)
      if (state.quest === QUEST.EXIT_ROCKET) {
        applyEvent("left_wreck");
      }
    }
  }

  // Explore → find sphere
  if (
    state.quest === QUEST.EXPLORE &&
    state.outsideDetected &&
    player.group.position.z > ROOM.d / 2 + 3
  ) {
    applyEvent("explore_done");
  }

  // Boss AI
  if (state.bossActive && state.boss.alive && bossMesh.visible) {
    const moved = tickBossChase(
      {
        x: bossMesh.position.x,
        z: bossMesh.position.z,
        speed: 3.2,
      },
      { x: player.group.position.x, z: player.group.position.z },
      dt
    );
    bossMesh.position.x = moved.x;
    bossMesh.position.z = moved.z;
    bossMesh.lookAt(player.group.position.x, 1, player.group.position.z);
    bossMesh.userData.body.rotation.y += dt * 1.5;
    bossMesh.userData.body.material.emissiveIntensity = 0.7 + Math.sin(clock.elapsedTime * 6) * 0.4;
  }

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
    if (b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }

  // Camera follow
  const target = player.group.position.clone();
  target.y += 1.25;
  const cp = Math.cos(camOrbit.pitch);
  const sp = Math.sin(camOrbit.pitch);
  const sy = Math.sin(camOrbit.yaw);
  const cy = Math.cos(camOrbit.yaw);
  const desired = target
    .clone()
    .add(
      new THREE.Vector3(
        sy * cp * camOrbit.distance,
        sp * camOrbit.distance + 0.4,
        cy * cp * camOrbit.distance
      )
    );
  const b = getMoveBounds();
  desired.x = THREE.MathUtils.clamp(desired.x, -b.x - 2, b.x + 2);
  desired.z = THREE.MathUtils.clamp(desired.z, b.zMin - 2, b.zMax + 2);
  desired.y = THREE.MathUtils.clamp(desired.y, 0.7, state.openWorld ? 20 : ROOM.h - 0.5);
  camera.position.lerp(desired, 0.16);
  camera.lookAt(target);

  if (!state.dialogueOpen && !state.tabletOpen) {
    const near = getNearbyInteract();
    if (near) {
      promptEl.textContent = near.label;
      promptEl.classList.remove("hidden");
    } else promptEl.classList.add("hidden");
  }

  if (exitArrow.visible) {
    exitArrow.position.y = 1.1 + Math.sin(clock.elapsedTime * 3) * 0.15;
  }
  if (mysterySphere.visible && !state.sphereShattering) {
    mysterySphere.rotation.y += dt * 0.55;
    // settle hit pulse scale
    const ud = mysterySphere.userData;
    if (ud.hitFlash > 0) {
      ud.hitFlash -= dt;
      const pulse = 1 + state.sphereProgress * 0.12 + ud.hitFlash * 0.8;
      mysterySphere.scale.setScalar(pulse);
    } else {
      mysterySphere.scale.setScalar(1 + state.sphereProgress * 0.12);
    }
  }
  updateSphereShatter(dt);
  if (shineOrb.visible) {
    const bob = 0.15 + Math.sin(clock.elapsedTime * 3) * 0.18;
    if (shineOrb.userData.orb) {
      shineOrb.userData.orb.position.y = 0.35 + bob;
      shineOrb.userData.orb.rotation.y += dt * 1.5;
    }
    if (shineOrb.userData.beam) {
      shineOrb.userData.beam.material.opacity = 0.25 + Math.sin(clock.elapsedTime * 4) * 0.12;
    }
    shineOrb.rotation.y += dt * 0.4;
  }

  // NASA kulesi flaş ışığı
  if (crate.visible && crate.userData.beaconLight && !state.crateLooted) {
    const pulse = 2.2 + Math.sin(clock.elapsedTime * 5) * 1.5;
    crate.userData.beaconLight.intensity = pulse;
    if (crate.userData.beacon) {
      crate.userData.beacon.material.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 5) * 1.2;
    }
    if (crate.userData.beam) {
      crate.userData.beam.material.opacity = 0.2 + Math.sin(clock.elapsedTime * 3) * 0.1;
    }
  }

  // Sinyal rölesi + yön oku
  if (signalRelay.visible) {
    if (signalRelay.userData.crystal) {
      signalRelay.userData.crystal.rotation.y += dt * 1.2;
      signalRelay.userData.crystal.position.y =
        3.4 + Math.sin(clock.elapsedTime * 2.5) * 0.15;
    }
    if (!state.relayActivated && signalRelay.userData.light) {
      signalRelay.userData.light.intensity =
        2 + Math.sin(clock.elapsedTime * 4) * 1.2;
    }
  }

  // Yön oku: oyuncunun biraz önünde, röleye bakar
  if (
    signalArrow.visible &&
    (state.quest === QUEST.FIND_SIGNAL || state.quest === QUEST.ACTIVATE_RELAY) &&
    !state.relayActivated
  ) {
    const px = player.group.position.x;
    const pz = player.group.position.z;
    const dx = SIGNAL_RELAY_POS.x - px;
    const dz = SIGNAL_RELAY_POS.z - pz;
    const dist = Math.hypot(dx, dz) || 1;
    // Ok oyuncunun üstünde / biraz ileride
    signalArrow.position.set(px, 2.4 + Math.sin(clock.elapsedTime * 3) * 0.15, pz);
    // Cone default points +Y; rotate to point horizontally toward target
    signalArrow.rotation.set(Math.PI / 2, 0, 0);
    signalArrow.rotation.z = Math.atan2(dx, dz);
    // scale pulse when close
    const s = dist < 12 ? 1.3 : 1;
    signalArrow.scale.setScalar(s);

    // Yaklaşınca otomatik "bulundu" (E hâlâ etkinleştirir)
    if (
      state.quest === QUEST.FIND_SIGNAL &&
      dist < 6 &&
      !state.relayFound
    ) {
      state.relayFound = true;
      applyEvent("signal_found");
      showToast("NASA rölesi menzilde! E ile etkinleştir", 3);
    }
  } else if (state.relayActivated) {
    signalArrow.visible = false;
  }

  // Tablet açıkken sinyal paneli canlı mesafe
  if (state.tabletOpen) {
    const sig = document.getElementById("tab-panel-signal");
    if (sig && !sig.classList.contains("hidden")) refreshSignalPanel();
  }

  // Live map while tablet map tab is open
  if (state.tabletOpen) {
    const mapPanel = document.getElementById("tab-panel-map");
    if (mapPanel && !mapPanel.classList.contains("hidden")) {
      drawTabletMap();
    }
  }
}

function updateEffects(t, dt) {
  dust.rotation.y = t * 0.02;
  if (gun.visible) {
    gun.rotation.y = t * 1.1;
    gun.position.y = 0.14 + Math.sin(t * 2.5) * 0.03;
  }
  if (!state.robotBroken) {
    robot.spark.intensity = 0.35 + Math.abs(Math.sin(t * 11)) * 0.9;
  }
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) toastEl.classList.add("hidden");
  }
}

function updateDebug(dt) {
  fpsFrames++;
  fpsAccum += dt;
  if (fpsAccum >= 0.4) {
    dbgFps.textContent = String(Math.round(fpsFrames / fpsAccum));
    fpsFrames = 0;
    fpsAccum = 0;
  }
  const p = player.group.position;
  dbgPos.textContent = `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
  dbgQuest.textContent = state.quest;
  if (dbgMode) dbgMode.textContent = state.mode;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (state.mode === MODE.CINEMATIC) updateCinematic(dt);
  else if (state.mode === MODE.WAKE) updateWake(dt);
  else if (state.mode === MODE.CUTSCENE) updateMetalCutscene(dt);
  else if (state.mode === MODE.FINALE) updateFinale(dt);
  else if (state.mode === MODE.PLAY) updatePlay(dt);
  if (state.mode !== MODE.FINALE) {
    updateEffects(t, dt);
  } else if (joleCan.visible === false && state.finalePhase !== "end") {
    // light dust still ok
  }
  if (state.mode === MODE.PLAY) {
    tryCollectStars();
    updateMinimapHud();
    for (const id of Object.keys(starMeshes)) {
      const g = starMeshes[id];
      if (g && g.visible && g.userData.spin) g.userData.spin.rotation.y += 0.03;
    }
  }
  if (typeof FX !== "undefined") FX.update(dt);
  updateDebug(dt);
  composer.render();
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

// Series meta: easy + continue
(function initSeriesMetaH1() {
  // Read easy when leaving cinematic - poll via cine skip also sets
  const applyEasy = () => {
    state.easyMode = !!(easyModeCb && easyModeCb.checked);
    if (easyBadge) easyBadge.classList.toggle("hidden", !state.easyMode);
  };
  easyModeCb?.addEventListener("change", () => { sfx.click(); applyEasy(); });
  // Hide meta when game leaves cinematic
  const obs = setInterval(() => {
    if (state.mode !== MODE.CINEMATIC && metaTitle) {
      metaTitle.classList.add("hidden");
      applyEasy();
      refreshCollectHud();
    }
  }, 400);
  setTimeout(() => clearInterval(obs), 120000);
  const saved = tryLoadSave();
  if (btnContinue && saved && saved.quest && saved.quest !== QUEST.DONE && saved.quest !== QUEST.PICK_GUN) {
    btnContinue.classList.remove("hidden");
  }
  btnContinue?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = tryLoadSave();
    if (!data) return;
    sfx.ui();
    state.easyMode = data.easyMode;
    if (easyModeCb) easyModeCb.checked = !!data.easyMode;
    if (easyBadge) easyBadge.classList.toggle("hidden", !state.easyMode);
    state.collectibles = data.collectibles?.length ? data.collectibles : createCollectibles(["star1","star2","star3"]);
    const ex = data.extra || {};
    state.hasGun = !!ex.hasGun;
    state.hasShineOrb = !!ex.hasShineOrb;
    state.hasTablet = !!ex.hasTablet;
    state.hasJole = !!ex.hasJole;
    state.openWorld = !!ex.openWorld;
    state.robotBroken = !!ex.robotBroken;
    if (metaTitle) metaTitle.classList.add("hidden");
    if (cinematicEl) cinematicEl.classList.add("hidden");
    if (uiEl) uiEl.classList.remove("hidden");
    state.mode = MODE.PLAY;
    setQuest(data.quest);
    if (player?.group && typeof ex.px === "number") {
      player.group.position.x = ex.px;
      player.group.position.z = ex.pz;
    }
    refreshCollectHud();
    showToast("Kayıt yüklendi", 2.5);
  });
})();


showStoryBeat(0);
if (dbgMode) dbgMode.textContent = MODE.CINEMATIC;
tick();

console.info(
  "%cHENTW Bölüm 1",
  "color:#3de0ff;font-weight:bold",
  "\nGezegen (yuvarlak Dünya) · oyuncu gizli · boss · tablet"
);

// Export for structural tests / debugging
export { state, shouldHidePlayerForCam, QUEST };
