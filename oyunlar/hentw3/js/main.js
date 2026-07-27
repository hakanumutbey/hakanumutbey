/**
 * HENTW 3 — esir gemisi (temiz tek dosya)
 * Kamera: sol tık kilidi / sağ tık basılı / ok tuşları
 */
import * as THREE from "three";
import {
  QUEST,
  QUEST_LABELS,
  advanceQuest,
  distXZ,
  COLOR_ORDER,
  COLOR_ORDER_2,
  HACK_LETTERS,
  BINARY_PAPER,
  binaryMatches,
  nextHackStep,
  createFighter,
  applyDamage,
  allDead,
  SAVE_KEY,
  encodeSave,
  decodeSave,
  easyEnemyHpMult,
  easyDamageTakenMult,
  easyRunTimeMult,
  easyPlayerDamageMult,
  easyHideFillMult,
  createCollectibles,
  collectItem,
  collectibleProgress,
  worldToMinimap,
} from "./gameLogic.js";
import { createAudioBus, drawMinimap } from "./seriesFeatures.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const titleScreen = $("title-screen");
const uiEl = $("ui");
const questTextEl = $("quest-text");
const promptEl = $("prompt");
const dialogueEl = $("dialogue");
const dSpeaker = $("d-speaker");
const dText = $("d-text");
const toastEl = $("toast");
const wakeOverlay = $("wake-overlay");
const storyOverlay = $("story-overlay");
const storyText = $("story-text");
const endScreen = $("end-screen");
const colorUi = $("color-ui");
const colorButtons = $("color-buttons");
const colorOrderLabel = $("color-order-label");
const colorStatus = $("color-status");
const hideUi = $("hide-ui");
const hideBar = $("hide-bar");
const hideStatus = $("hide-status");
const runUi = $("run-ui");
const runBar = $("run-bar");
const hackUi = $("hack-ui");
const hackStepLabel = $("hack-step-label");
const hackBody = $("hack-body");
const hackFail = $("hack-fail");
const paperNote = $("paper-note");
const paperBinary = $("paper-binary");
const helpEl = $("help");
const interactBtn = $("interact-btn");
const easyModeCb = $("easy-mode");
const btnContinue = $("btn-continue");
const collectCountEl = $("collect-count");
const minimapCanvas = $("minimap-canvas");
const easyBadge = $("easy-badge");
const endStarsEl = $("end-stars");
const sfx = createAudioBus();
const MAP_BOUNDS = { minX: -5.5, maxX: 5.5, minZ: -4, maxZ: 50 };
const STAR_SPOTS = [
  { id: "star1", x: -2.5, z: 12 },
  { id: "star2", x: 2.8, z: 24 },
  { id: "star3", x: -2.2, z: 36 },
];


// combat hud inject
let combatHud = $("combat-hud");
if (!combatHud && uiEl) {
  combatHud = document.createElement("div");
  combatHud.id = "combat-hud";
  combatHud.className = "hidden";
  combatHud.innerHTML =
    '<div class="lab">SAVAŞ</div><div>Can: <span id="hp-text">100</span></div><div id="hp-bar-wrap"><div id="hp-bar"></div></div><div>Düşman: <span id="enemy-count">0</span></div>';
  uiEl.appendChild(combatHud);
}
const hpText = $("hp-text");
const hpBar = $("hp-bar");
const enemyCountEl = $("enemy-count");

if (helpEl) {
  helpEl.textContent =
    "WASD · bak: sağ tık/ok · ATEŞ: boşluk/sol tık · E · H";
}

const MODE = {
  TITLE: "title",
  WAKE: "wake",
  PLAY: "play",
  COLOR: "color",
  HIDE: "hide",
  RUN: "run",
  HACK: "hack",
  ESCAPE: "escape",
  CUTSCENE: "cutscene",
  END: "end",
};

const SPEED = 7.2; // daha hızlı yürüme
const R = 2.8;
const RUN_MAX_T = 22; // koşu süresi bol (eskiden 8.5)
const keys = new Set();

// Kısa koridor — çocuk yetişsin (eski z mesafeleri çok uzundu)
const POS = {
  robot: { x: 1.2, z: -0.5 },
  colorDoor: { x: 0, z: 8 },
  keycard: { x: -3, z: 11 },
  hide1: { x: 2.2, z: 14 }, // yeşil saklan — yakında
  run1: { x: 0, z: 18 }, // koşu hedefi kısa
  fight: { x: 0, z: 22 },
  battery: { x: -2.2, z: 26 },
  color2: { x: 0, z: 30 },
  hide2: { x: 2.2, z: 34 },
  run2: { x: 0, z: 38 }, // bilgisayara yakın
  pc: { x: 0, z: 41 },
  escape: { x: 0, z: 46 },
};

const state = {
  mode: MODE.TITLE,
  quest: QUEST.WAKE,
  dialogueOpen: false,
  dialogueAfter: null,
  toastT: 0,
  pointer: false,
  rmbLook: false,
  wakeT: 0,
  colorProgress: 0,
  colorWhich: 1,
  colorLocked: true,
  colorOrder: null,
  colorCountdown: null,
  hideProgress: 0,
  hideWhich: 1,
  runT: 0,
  runWhich: 1,
  hackStep: 1,
  hackLetterI: 0,
  hackTime: 1,
  hackMaxTime: 999,
  escapeT: 0,
  hasKeycard: false,
  hasBattery: false,
  canShoot: false,
  playerHp: 100,
  playerMaxHp: 100,
  shootCd: 0,
  hitCd: 0,
  combat: false,
  hackFailing: false,
  pcAutoT: 0,
  nearAction: null,
  easyMode: false,
  collectibles: createCollectibles(["star1", "star2", "star3"]),
  collectedCount: 0,
  saveLoaded: false,
  cutT: 0,
  cutDur: 0,
  cutOnDone: null,
  cutUpdate: null,
  cutResumeMode: "play",
};

const enemies = [];
const bullets = [];
const particles = [];

// ---------- Three.js ----------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141c32);
scene.fog = new THREE.FogExp2(0x1c2840, 0.008);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 200);
// Bloom kapalı: 30+ light + UnrealBloomPass donmaya yol açıyordu

scene.add(new THREE.AmbientLight(0xd0e0ff, 1.15));
scene.add(new THREE.HemisphereLight(0xf0f6ff, 0x3a4058, 1.35));
const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(8, 16, 10);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xaaccff, 0.55);
fill.position.set(-10, 5, -6);
scene.add(fill);
// Sadece birkaç koridor ışığı (eskiden ~30 PointLight FPS'i öldürüyordu)
const corridorLights = [];
for (const z of [5, 20, 36, 52, 70, 84]) {
  const pl = new THREE.PointLight(0xccddff, 1.4, 22, 1.6);
  pl.position.set(0, 3.2, z);
  scene.add(pl);
  corridorLights.push(pl);
}
const redAlert = new THREE.PointLight(0xff6688, 1.1, 28, 1.5);
redAlert.position.set(0, 3, 20);
scene.add(redAlert);
const playerLight = new THREE.PointLight(0xfff2e0, 2.0, 14, 1.5);
scene.add(playerLight);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(11, 0.2, 100),
  new THREE.MeshStandardMaterial({ color: 0x3e4a68, metalness: 0.45, roughness: 0.42, emissive: 0x0a1020, emissiveIntensity: 0.15 })
);
floor.position.set(0, -0.1, 40);
floor.receiveShadow = true;
scene.add(floor);

function wall(x, z, w, d) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, 4.2, d),
    new THREE.MeshStandardMaterial({ color: 0x2a3448, metalness: 0.3, roughness: 0.65 })
  );
  m.position.set(x, 2.1, z);
  scene.add(m);
}
wall(-5.5, 40, 0.4, 100);
wall(5.5, 40, 0.4, 100);

// Sadece emissive şeritler — ekstra PointLight yok
for (let z = 0; z < 90; z += 4) {
  const isRed = z % 12 === 0;
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.1, 0.5),
    new THREE.MeshStandardMaterial({
      color: isRed ? 0xff8899 : 0xaad4ff,
      emissive: isRed ? 0xff4466 : 0x66aaff,
      emissiveIntensity: 1.8,
    })
  );
  strip.position.set(0, 3.9, z);
  scene.add(strip);
}

{
  const cell = new THREE.Group();
  cell.position.set(0, 0, -2);
  for (let i = -3; i <= 3; i++) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6),
      new THREE.MeshStandardMaterial({ color: 0xa0b0c0, metalness: 0.8 })
    );
    bar.position.set(i * 0.55, 1.6, 0);
    cell.add(bar);
  }
  scene.add(cell);
}

function ring(col, em) {
  const r = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.05, 8, 28),
    new THREE.MeshStandardMaterial({ color: col, emissive: em, emissiveIntensity: 1.5 })
  );
  r.rotation.x = Math.PI / 2;
  r.position.y = 0.05;
  return r;
}

function makeRobot() {
  const g = new THREE.Group();
  g.position.set(POS.robot.x, 0, POS.robot.z);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9aa8ba, metalness: 0.65 });
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.4), mat);
  t.position.y = 0.95;
  g.add(t);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.34), mat);
  h.position.y = 1.5;
  g.add(h);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0x5ee7ff,
      emissive: 0x1188aa,
      emissiveIntensity: 1.5,
    })
  );
  eye.position.set(0, 1.5, 0.18);
  g.add(eye);
  g.add(ring(0xb07cff, 0x6030aa));
  scene.add(g);
  return g;
}

function makeDoor(z) {
  const g = new THREE.Group();
  g.position.set(0, 0, z);
  const d = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 3.1, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x3a4060, metalness: 0.5 })
  );
  d.position.y = 1.55;
  g.add(d);
  g.userData.door = d;
  [
    [0x3d8bff, -0.7],
    [0x44dd77, -0.25],
    [0xff4455, 0.25],
    [0xffdd44, 0.7],
  ].forEach(([c, x]) => {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.1),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7 })
    );
    p.position.set(x, 2.3, 0.2);
    g.add(p);
  });
  g.add(ring(0x8866ff, 0x5533aa));
  scene.add(g);
  return g;
}

function makePickup(x, z, color, em) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.4, 0.75),
    new THREE.MeshStandardMaterial({
      color,
      emissive: em,
      emissiveIntensity: 1.6,
      metalness: 0.4,
    })
  );
  box.position.y = 0.3;
  g.add(box);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: em, emissiveIntensity: 2.5 })
  );
  beacon.position.y = 1.1;
  g.add(beacon);
  g.userData.beacon = beacon;
  g.add(ring(color, em));
  // Işık yok — emissive kutu yeter (performans)
  scene.add(g);
  return g;
}

function makePC() {
  const g = new THREE.Group();
  g.position.set(POS.pc.x, 0, POS.pc.z);

  // Masa
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.15, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x3a3a4a, metalness: 0.5 })
  );
  desk.position.y = 1.0;
  g.add(desk);

  // Monitör çerçevesi
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.2, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.6 })
  );
  frame.position.set(0, 1.8, -0.35);
  g.add(frame);

  // Mavi ekran = bilgisayar (hata değil!) — üstünde HACK yazısı
  const canvas2d = document.createElement("canvas");
  canvas2d.width = 256;
  canvas2d.height = 160;
  const ctx = canvas2d.getContext("2d");
  ctx.fillStyle = "#1a6adb";
  ctx.fillRect(0, 0, 256, 160);
  ctx.fillStyle = "#7ec8ff";
  ctx.font = "bold 42px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HACK", 128, 70);
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#cfe9ff";
  ctx.fillText("E / yaklas", 128, 110);
  const screenTex = new THREE.CanvasTexture(canvas2d);
  const mon = new THREE.Mesh(
    new THREE.PlaneGeometry(1.45, 0.95),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  mon.position.set(0, 1.8, -0.24);
  g.add(mon);

  // Parlak mavi ışık — uzaktan görünsün
  const glow = new THREE.PointLight(0x4488ff, 2.2, 14, 1.5);
  glow.position.set(0, 2.2, 0.5);
  g.add(glow);

  // Üstte zıplayan ok / etiket küresi
  const tag = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      emissive: 0x2288ff,
      emissiveIntensity: 2.2,
    })
  );
  tag.position.set(0, 3.1, 0);
  g.add(tag);
  g.userData.tag = tag;

  // Klavye
  const kb = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.06, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x222230 })
  );
  kb.position.set(0, 1.1, 0.25);
  g.add(kb);

  // Kâğıt (binary ipucu)
  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xf5e6c8, side: THREE.DoubleSide })
  );
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0.85, 1.09, 0.3);
  g.add(paper);

  g.add(ring(0x66aaff, 0x2266aa));
  scene.add(g);
  return g;
}

function makeEscape() {
  const g = new THREE.Group();
  g.position.set(POS.escape.x, 0, POS.escape.z);
  g.visible = false;
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.15, 24),
    new THREE.MeshStandardMaterial({ color: 0x3a5070, metalness: 0.6 })
  );
  pad.position.y = 0.08;
  g.add(pad);
  const ship = new THREE.Mesh(
    new THREE.ConeGeometry(1, 2.6, 10),
    new THREE.MeshStandardMaterial({ color: 0xd0d8e4, metalness: 0.75 })
  );
  ship.position.y = 1.5;
  ship.rotation.x = Math.PI;
  g.add(ship);
  g.add(ring(0x66ffaa, 0x33cc88));
  scene.add(g);
  return g;
}

function makeFoe(x, z, color = 0x33aa44, hp = 34) {
  hp = Math.max(8, Math.round(hp * easyEnemyHpMult(state.easyMode)));
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 5, 10), mat);
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), mat);
  head.position.y = 1.7;
  g.add(head);
  scene.add(g);
  return { mesh: g, fighter: createFighter(hp), speed: 2.5 + Math.random() * 0.6, body };
}

const robot = makeRobot();
const colorDoor = makeDoor(POS.colorDoor.z);
const colorDoor2 = makeDoor(POS.color2.z);
const keycard = makePickup(POS.keycard.x, POS.keycard.z, 0xff4455, 0xaa1122);
const battery = makePickup(POS.battery.x, POS.battery.z, 0x44aaff, 0x2266aa);
battery.visible = false;
const pc = makePC();
const escapePad = makeEscape();

// Büyük yeşil saklanma bölgesi
const hideZone = new THREE.Mesh(
  new THREE.CylinderGeometry(2.4, 2.4, 0.12, 28),
  new THREE.MeshStandardMaterial({
    color: 0x22aa55,
    emissive: 0x118833,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.65,
  })
);
hideZone.position.set(POS.hide1.x, 0.05, POS.hide1.z);
hideZone.visible = false;
scene.add(hideZone);

// Koşu hedefi (sarı daire) — nereye koşulacağı net
const runZone = new THREE.Mesh(
  new THREE.CylinderGeometry(2.2, 2.2, 0.1, 24),
  new THREE.MeshStandardMaterial({
    color: 0xffcc44,
    emissive: 0xffaa00,
    emissiveIntensity: 1.3,
    transparent: true,
    opacity: 0.55,
  })
);
runZone.visible = false;
scene.add(runZone);

const guard = new THREE.Group();
guard.visible = false;
{
  const mat = new THREE.MeshStandardMaterial({
    color: 0x33aa44,
    emissive: 0x116622,
    emissiveIntensity: 0.45,
  });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.6, 5, 10), mat);
  b.position.y = 1;
  guard.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), mat);
  h.position.y = 1.75;
  guard.add(h);
}
scene.add(guard);

const doorArrow = new THREE.Mesh(
  new THREE.ConeGeometry(0.32, 0.75, 8),
  new THREE.MeshStandardMaterial({
    color: 0xffcc44,
    emissive: 0xffaa00,
    emissiveIntensity: 1.5,
  })
);
doorArrow.rotation.x = Math.PI;
doorArrow.visible = false;
scene.add(doorArrow);

const player = new THREE.Group();
player.position.set(0, 0, 1);
const bodyRoot = new THREE.Group();
player.add(bodyRoot);
{
  const suit = new THREE.MeshStandardMaterial({ color: 0xeef2f6, metalness: 0.35 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 6, 12), suit);
  body.position.y = 0.85;
  bodyRoot.add(body);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), suit);
  helm.position.y = 1.5;
  bodyRoot.add(helm);
  bodyRoot.rotation.x = -Math.PI / 2 + 0.15;
  bodyRoot.position.y = 0.28;
}
scene.add(player);

const camOrbit = {
  yaw: 0,
  pitch: 0.28,
  distance: 5.2,
  minPitch: -0.2,
  maxPitch: 0.95,
  sensitivity: 0.0024,
};

// Kamera için yeniden kullanılan vektörler (her karede clone = GC takılması)
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();

const clock = new THREE.Clock();

// ---------- Parçacıklar ----------
function spawnBurst(x, y, z, color = 0x66ffcc, count = 14, speed = 3.5) {
  // Performans: çok birikmesin
  if (particles.length > 180) {
    const kill = particles.length - 140;
    for (let k = 0; k < kill; k++) {
      const old = particles.shift();
      if (!old) break;
      scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      old.mesh.material.dispose();
    }
  }
  const n = Math.min(22, count);
  for (let i = 0; i < n; i++) {
    const size = 0.05 + Math.random() * 0.08;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 5, 5),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      })
    );
    mesh.position.set(x, y, z);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * speed,
      Math.random() * speed * 0.95,
      (Math.random() - 0.5) * speed
    );
    const life = 0.35 + Math.random() * 0.55;
    scene.add(mesh);
    particles.push({ mesh, vel, life, maxLife: life, grav: 5 + Math.random() * 4 });
  }
}

function spawnSparks(x, y, z, color = 0xffcc66, count = 10) {
  spawnBurst(x, y, z, color, count, 5);
}

function spawnMuzzle(x, y, z, dir) {
  spawnBurst(x + dir.x * 0.4, y, z + dir.z * 0.4, 0x88ffdd, 8, 2.5);
  spawnBurst(x, y, z, 0xffffff, 4, 1.2);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.vel.y -= p.grav * dt;
    p.mesh.position.x += p.vel.x * dt;
    p.mesh.position.y += p.vel.y * dt;
    p.mesh.position.z += p.vel.z * dt;
    const t = Math.max(0, p.life / p.maxLife);
    p.mesh.material.opacity = t;
    const s = 0.35 + t * 0.9;
    p.mesh.scale.set(s, s, s);
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}

// ---------- Kısa ara sahneler ----------
function playCutscene({ duration = 2.8, text = "", resumeMode = MODE.PLAY, update = null, onDone = null }) {
  if (document.pointerLockElement) {
    try {
      document.exitPointerLock();
    } catch (_) {}
  }
  state.mode = MODE.CUTSCENE;
  state.cutT = 0;
  state.cutDur = Math.max(0.8, duration);
  state.cutUpdate = update;
  state.cutOnDone = onDone;
  state.cutResumeMode = resumeMode;
  state.dialogueOpen = false;
  dialogueEl?.classList.add("hidden");
  if (text && storyText && storyOverlay) {
    storyText.textContent = text;
    storyOverlay.classList.remove("hidden");
  }
  if (uiEl) uiEl.classList.add("hidden");
  hideAllMinigames();
  if (interactBtn) interactBtn.classList.add("hidden");
}

function skipCutscene() {
  if (state.mode !== MODE.CUTSCENE) return;
  state.cutT = state.cutDur;
}

function updateCutscene(dt) {
  state.cutT += dt;
  const u = Math.min(1, state.cutT / state.cutDur);
  if (typeof state.cutUpdate === "function") {
    try {
      state.cutUpdate(state.cutT, u);
    } catch (err) {
      console.error("cutscene", err);
    }
  }
  if (u >= 1) {
    storyOverlay?.classList.add("hidden");
    const done = state.cutOnDone;
    const resume = state.cutResumeMode || MODE.PLAY;
    state.cutOnDone = null;
    state.cutUpdate = null;
    state.mode = resume;
    if (resume === MODE.PLAY && uiEl) uiEl.classList.remove("hidden");
    if (done) {
      try {
        done();
      } catch (err) {
        console.error("cutscene done", err);
      }
    }
  }
}


// Koleksiyon yıldızları
const starMeshes = {};
function makeStarMesh(id, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffdd66,
    emissive: 0xffaa22,
    emissiveIntensity: 1.8,
    metalness: 0.4,
    roughness: 0.35,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat);
  core.position.y = 1.1;
  g.add(core);
  g.userData.spin = core;
  scene.add(g);
  starMeshes[id] = g;
  return g;
}
STAR_SPOTS.forEach((s) => makeStarMesh(s.id, s.x, s.z));

function refreshCollectHud() {
  const pr = collectibleProgress(state.collectibles);
  state.collectedCount = pr.got;
  if (collectCountEl) collectCountEl.textContent = String(pr.got);
  for (const c of state.collectibles) {
    if (starMeshes[c.id]) starMeshes[c.id].visible = !c.taken;
  }
  if (endStarsEl) {
    endStarsEl.textContent = "★ ".repeat(pr.got).trim() || "☆ ☆ ☆";
  }
}

function persistSave() {
  try {
    const raw = encodeSave({
      quest: state.quest,
      easyMode: state.easyMode,
      collectibles: state.collectibles,
      collectedCount: state.collectedCount,
      playerHp: state.playerHp,
      extra: {
        px: player.position.x,
        pz: player.position.z,
        hasKeycard: state.hasKeycard,
        hasBattery: state.hasBattery,
      },
    });
    localStorage.setItem(SAVE_KEY, raw);
  } catch (e) {
    console.warn("save fail", e);
  }
}

function tryLoadSave() {
  try {
    return decodeSave(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

function updateMinimapHud() {
  if (!minimapCanvas || !player) return;
  const markers = [];
  // objective: PC or door or escape
  if (state.quest === QUEST.REACH_PC || state.quest === QUEST.HACK) {
    markers.push({ x: POS.pc.x, z: POS.pc.z, color: "#66aaff", r: 5 });
  } else if (state.quest === QUEST.ESCAPE) {
    markers.push({ x: POS.escape.x, z: POS.escape.z, color: "#66ffaa", r: 5 });
  } else if (state.quest === QUEST.FOLLOW_DOOR || state.quest === QUEST.COLOR_PUZZLE) {
    markers.push({ x: POS.colorDoor.x, z: POS.colorDoor.z, color: "#ffcc44", r: 5 });
  } else if (state.quest === QUEST.FIND_KEYCARD) {
    markers.push({ x: POS.keycard.x, z: POS.keycard.z, color: "#ff4455", r: 5 });
  } else if (state.quest === QUEST.FIND_BATTERY) {
    markers.push({ x: POS.battery.x, z: POS.battery.z, color: "#44aaff", r: 5 });
  } else {
    markers.push({ x: POS.pc.x, z: POS.pc.z, color: "#8899aa", r: 3 });
  }
  for (const c of state.collectibles) {
    if (!c.taken) {
      const spot = STAR_SPOTS.find((s) => s.id === c.id);
      if (spot) markers.push({ x: spot.x, z: spot.z, color: "#ffdd66", r: 3 });
    }
  }
  drawMinimap(
    minimapCanvas,
    MAP_BOUNDS,
    worldToMinimap,
    { x: player.position.x, z: player.position.z },
    markers
  );
}

function tryCollectStars() {
  if (state.mode !== MODE.PLAY || state.dialogueOpen) return;
  for (const spot of STAR_SPOTS) {
    const c = state.collectibles.find((x) => x.id === spot.id);
    if (!c || c.taken) continue;
    const d = distXZ(player.position.x, player.position.z, spot.x, spot.z);
    if (d < 1.6) {
      state.collectibles = collectItem(state.collectibles, spot.id);
      spawnBurst(spot.x, 1.1, spot.z, 0xffdd66, 14, 3);
      sfx.pickup();
      refreshCollectHud();
      const pr = collectibleProgress(state.collectibles);
      toast(pr.complete ? "Tüm yıldızlar! ★★★" : `Yıldız ${pr.got}/3`, 2);
      persistSave();
    }
  }
}


// ---------- UI helpers ----------
function setQuest(q) {
  state.quest = q;
  if (questTextEl) questTextEl.textContent = QUEST_LABELS[q] || q;
  if (state.mode !== MODE.TITLE && state.mode !== MODE.WAKE) persistSave();
}

function applyEvent(ev) {
  const n = advanceQuest(state.quest, ev);
  if (n !== state.quest) {
    setQuest(n);
    onQuest(n);
  }
}

function toast(msg, d = 2.8) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  state.toastT = d;
}

function story(msg, sec = 3) {
  if (!storyText || !storyOverlay) return;
  storyText.textContent = msg;
  storyOverlay.classList.remove("hidden");
  setTimeout(() => storyOverlay.classList.add("hidden"), sec * 1000);
}

function openDialogue(speaker, text, after = null) {
  state.dialogueOpen = true;
  state.dialogueAfter = after;
  dialogueEl.classList.remove("hidden");
  promptEl.classList.add("hidden");
  dSpeaker.textContent = speaker;
  dText.textContent = text;
  if (document.pointerLockElement) document.exitPointerLock();
}

function closeDialogue() {
  if (!state.dialogueOpen) return;
  state.dialogueOpen = false;
  dialogueEl.classList.add("hidden");
  const cb = state.dialogueAfter;
  state.dialogueAfter = null;
  if (cb) {
    try {
      cb();
    } catch (err) {
      console.error("dialogue after", err);
    }
  }
}

function hideAllMinigames() {
  colorUi?.classList.add("hidden");
  hideUi?.classList.add("hidden");
  runUi?.classList.add("hidden");
  hackUi?.classList.add("hidden");
}

function clearEnemies() {
  for (const e of enemies) scene.remove(e.mesh);
  enemies.length = 0;
  for (const b of bullets) scene.remove(b.mesh);
  bullets.length = 0;
  state.combat = false;
  combatHud?.classList.add("hidden");
}

function updateCombatHud() {
  const alive = enemies.filter((e) => e.fighter.alive).length;
  if (state.combat && alive > 0) combatHud?.classList.remove("hidden");
  else combatHud?.classList.add("hidden");
  if (hpText) hpText.textContent = String(Math.ceil(state.playerHp));
  if (hpBar) hpBar.style.width = `${(state.playerHp / state.playerMaxHp) * 100}%`;
  if (enemyCountEl) enemyCountEl.textContent = String(alive);
}

function checkCombatWin() {
  if (!state.combat) return;
  if (!allDead(enemies.map((e) => e.fighter))) return;
  state.combat = false;
  updateCombatHud();
  if (interactBtn) interactBtn.classList.add("hidden");
  if (state.quest === QUEST.FIGHT_PATROL) {
    const cx = POS.fight.x;
    const cz = POS.fight.z;
    spawnBurst(cx, 1.2, cz, 0xffcc44, 22, 4);
    spawnBurst(cx, 1.5, cz, 0x66ffaa, 16, 3);
    playCutscene({
      duration: 2.6,
      text: "Devriye düştü!\nKıvılcımlar… koridor açıldı.\n\nRobot: “Batarya! Hızlı!”",
      resumeMode: MODE.PLAY,
      update: (_t, u) => {
        camera.position.set(3 + u, 3.2, cz + 6 - u * 2);
        camera.lookAt(cx, 1.2, cz);
        if (Math.random() < 0.2) spawnSparks(cx + (Math.random() - 0.5), 1, cz, 0xffaa44, 3);
      },
      onDone: () => {
        applyEvent("fight_ok");
        battery.visible = true;
        battery.position.set(POS.battery.x, 0, POS.battery.z);
        spawnBurst(POS.battery.x, 0.8, POS.battery.z, 0x44aaff, 12, 2);
        toast("Mavi batarya · E veya tıkla", 3);
        if (uiEl) uiEl.classList.remove("hidden");
      },
    });
  }
}

function spawnPatrol() {
  clearEnemies();
  const c = POS.fight;
  // 2 zayıf düşman — çocuk bitsin
  [
    [c.x - 1.8, c.z + 0.5],
    [c.x + 1.8, c.z + 0.5],
  ].forEach(([x, z]) => enemies.push(makeFoe(x, z, 0x33aa44, 20)));
  state.combat = true;
  state.canShoot = true;
  state.shootCd = 0;
  updateCombatHud();
  // Oyuncuyu savaş alanına koy
  player.position.set(c.x, 0, c.z - 4);
  toast("ATEŞ: Boşluk veya sol tık  ·  düşmana bak", 4);
  if (interactBtn) {
    interactBtn.textContent = "BOŞLUK · ATEŞ";
    interactBtn.classList.remove("hidden");
  }
}

function getAimDir() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  if (dir.lengthSq() < 0.0001) {
    // Kameradan bakış bozuksa oyuncunun baktığı yön
    dir.set(Math.sin(camOrbit.yaw + Math.PI), 0, Math.cos(camOrbit.yaw + Math.PI));
  }
  dir.normalize();
  return dir;
}

function tryShoot() {
  if (state.mode !== MODE.PLAY || !state.combat || state.dialogueOpen) return false;
  if (!state.canShoot) return false;
  if (state.shootCd > 0) return false;
  state.shootCd = 0.15;
  const dir = getAimDir();
  const origin = new THREE.Vector3(
    player.position.x,
    player.position.y + 1.15,
    player.position.z
  );
  const bolt = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x66ffcc })
  );
  bolt.position.copy(origin);
  scene.add(bolt);
  bullets.push({ mesh: bolt, dir: dir.clone(), life: 1.2, speed: 42 });
  spawnMuzzle(origin.x, origin.y, origin.z, dir);
  sfx.shoot();

  // Anında isabet: geniş koni (neredeyse öndeki her şey)
  let hitAny = false;
  for (const e of enemies) {
    if (!e.fighter.alive) continue;
    const toE = new THREE.Vector3(
      e.mesh.position.x - origin.x,
      0,
      e.mesh.position.z - origin.z
    );
    const dist = toE.length();
    if (dist < 0.01 || dist > 25) continue;
    toE.multiplyScalar(1 / dist);
    // 0.25 ≈ ~75° yarı açı — kolay isabet
    if (dir.dot(toE) > 0.25) {
      e.fighter = applyDamage(e.fighter, Math.round(25 * easyPlayerDamageMult(state.easyMode)));
      e.body.material.emissiveIntensity = 1.6;
      hitAny = true;
      spawnBurst(e.mesh.position.x, 1.2, e.mesh.position.z, 0x66ff88, 10, 3);
      sfx.hit();
      if (!e.fighter.alive) {
        spawnBurst(e.mesh.position.x, 1.4, e.mesh.position.z, 0xffaa44, 18, 4.5);
        e.mesh.visible = false;
      }
    }
  }
  // Hiç isabet yoksa: en yakın düşmana vur (çocuk dostu)
  if (!hitAny) {
    let best = null;
    let bestD = 12;
    for (const e of enemies) {
      if (!e.fighter.alive) continue;
      const d = distXZ(player.position.x, player.position.z, e.mesh.position.x, e.mesh.position.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) {
      best.fighter = applyDamage(best.fighter, Math.round(25 * easyPlayerDamageMult(state.easyMode)));
      best.body.material.emissiveIntensity = 1.6;
      spawnBurst(best.mesh.position.x, 1.2, best.mesh.position.z, 0x66ff88, 10, 3);
      if (!best.fighter.alive) {
        spawnBurst(best.mesh.position.x, 1.4, best.mesh.position.z, 0xffaa44, 18, 4.5);
        best.mesh.visible = false;
      }
    }
  }
  checkCombatWin();
  updateCombatHud();
  return true;
}

function updateEnemies(dt) {
  if (!state.combat) return;
  state.hitCd = Math.max(0, state.hitCd - dt);
  for (const e of enemies) {
    if (!e.fighter.alive) continue;
    const dx = player.position.x - e.mesh.position.x;
    const dz = player.position.z - e.mesh.position.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > 1.25) {
      e.mesh.position.x += (dx / d) * e.speed * dt;
      e.mesh.position.z += (dz / d) * e.speed * dt;
    }
    e.mesh.lookAt(player.position.x, 1, player.position.z);
    if (d < 1.45 && state.hitCd <= 0) {
      state.playerHp = Math.max(0, state.playerHp - Math.round(9 * easyDamageTakenMult(state.easyMode)));
      state.hitCd = 0.65;
      updateCombatHud();
      if (state.playerHp <= 0) {
        state.playerHp = 55;
        player.position.set(0, 0, Math.max(2, player.position.z - 8));
        toast("Yaralandın! Geri çekildin…", 2.5);
      }
    }
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
    // Mermi çarpışması
    for (const e of enemies) {
      if (!e.fighter.alive) continue;
      const d = distXZ(b.mesh.position.x, b.mesh.position.z, e.mesh.position.x, e.mesh.position.z);
      if (d < 0.7) {
        e.fighter = applyDamage(e.fighter, Math.round(25 * easyPlayerDamageMult(state.easyMode)));
        e.body.material.emissiveIntensity = 1.6;
        spawnBurst(e.mesh.position.x, 1.2, e.mesh.position.z, 0x88ffcc, 8, 2.5);
        if (!e.fighter.alive) {
          spawnBurst(e.mesh.position.x, 1.4, e.mesh.position.z, 0xffaa44, 16, 4);
          e.mesh.visible = false;
        }
        b.life = 0;
        break;
      }
    }
    if (b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }
  checkCombatWin();
}

function onQuest(q) {
  doorArrow.visible = q === QUEST.FOLLOW_DOOR || q === QUEST.COLOR_PUZZLE;
  if (doorArrow.visible) {
    doorArrow.position.set(POS.colorDoor.x, 2.9, POS.colorDoor.z - 1.2);
  }
  hideZone.visible = q === QUEST.HIDE_GUARD || q === QUEST.HIDE2;
  guard.visible =
    q === QUEST.HIDE_GUARD ||
    q === QUEST.RUN_GUARD ||
    q === QUEST.HIDE2 ||
    q === QUEST.RUN2;
  escapePad.visible = q === QUEST.ESCAPE;

  if (q === QUEST.FOLLOW_DOOR) toast("Sarı oka / kapıya git · fare ile bak");
  if (q === QUEST.COLOR_PUZZLE) startColorPuzzle(1);
  if (q === QUEST.FIND_KEYCARD) {
    keycard.visible = true;
    keycard.position.set(POS.keycard.x, 0, POS.keycard.z);
    toast("Kırmızı anahtar: kapıdan çık · SOLA (kırmızı kutu)", 4.5);
  }
  if (q === QUEST.HIDE_GUARD) startHide(1);
  if (q === QUEST.RUN_GUARD) startRun(1);
  if (q === QUEST.FIGHT_PATROL) spawnPatrol();
  if (q === QUEST.FIND_BATTERY) {
    battery.visible = true;
    toast("Mavi batarya kutusunu al");
  }
  if (q === QUEST.COLOR2) startColorPuzzle(2);
  if (q === QUEST.HIDE2) startHide(2);
  if (q === QUEST.RUN2) startRun(2);
  if (q === QUEST.REACH_PC) {
    toast("İleri · mavi HACK ekranı (hata değil!) · yaklaş veya HACKLE", 5);
    doorArrow.visible = true;
    doorArrow.position.set(POS.pc.x, 2.9, POS.pc.z - 1.5);
    if (pc.userData.tag) pc.userData.tag.visible = true;
  }
  if (q === QUEST.HACK) startHack();
  if (q === QUEST.ESCAPE) {
    escapePad.visible = true;
    doorArrow.visible = true;
    doorArrow.position.set(POS.escape.x, 2.9, POS.escape.z - 1.2);
    spawnBurst(POS.escape.x, 1, POS.escape.z, 0x66ffaa, 18, 3);
    toast("Kaçış gemisi! E ile bin", 3);
  }
  if (q === QUEST.DONE) showEnd();
}

// Color puzzle — 5s preview, no click
function startColorPuzzle(which) {
  state.mode = MODE.COLOR;
  state.colorWhich = which;
  state.colorProgress = 0;
  state.colorLocked = true;
  hideAllMinigames();
  colorUi.classList.remove("hidden");
  if (document.pointerLockElement) document.exitPointerLock();

  const order = which === 1 ? COLOR_ORDER : COLOR_ORDER_2;
  state.colorOrder = order;
  const names = { blue: "Mavi", green: "Yeşil", red: "Kırmızı", yellow: "Sarı" };

  colorButtons.innerHTML = "";
  ["red", "blue", "yellow", "green"].forEach((c) => {
    const b = document.createElement("button");
    b.className = `color-btn ${c}`;
    b.textContent = names[c];
    b.type = "button";
    b.disabled = true;
    b.style.opacity = "0.45";
    b.style.pointerEvents = "none";
    b.addEventListener("click", () => onColorPress(c, order));
    colorButtons.appendChild(b);
  });

  let left = 5;
  colorOrderLabel.textContent = order.map((c) => names[c]).join(" → ");
  colorOrderLabel.style.opacity = "1";
  colorStatus.textContent = `Sırayı ezberle! (${left})`;

  if (state.colorCountdown) clearInterval(state.colorCountdown);
  state.colorCountdown = setInterval(() => {
    left -= 1;
    if (left > 0) {
      colorStatus.textContent = `Sırayı ezberle! (${left})`;
    } else {
      clearInterval(state.colorCountdown);
      state.colorCountdown = null;
      colorOrderLabel.textContent = "??? → ??? → ??? → ???";
      colorStatus.textContent = "Şimdi sırayla bas!";
      state.colorLocked = false;
      colorButtons.querySelectorAll("button").forEach((b) => {
        b.disabled = false;
        b.style.opacity = "1";
        b.style.pointerEvents = "auto";
      });
    }
  }, 1000);
}

function onColorPress(c, order) {
  if (state.colorLocked) return;
  const ord = order || state.colorOrder || COLOR_ORDER;
  if (c === ord[state.colorProgress]) {
    state.colorProgress++;
    colorStatus.textContent = `İyi (${state.colorProgress}/${ord.length})`;
    if (state.colorProgress >= ord.length) {
      colorStatus.textContent = "Açıldı!";
      state.colorLocked = true;
      setTimeout(() => {
        hideAllMinigames();
        const which = state.colorWhich;
        const door = which === 1 ? colorDoor : colorDoor2;
        const dz = door.position.z;
        door.userData.door.position.x = 2.8;
        spawnSparks(0, 1.8, dz, 0x88aaff, 16);
        sfx.door();
        spawnBurst(0, 1.5, dz, 0xff6688, 12, 3);
        playCutscene({
          duration: 2.4,
          text:
            which === 1
              ? "Renk paneli… tık.\nKapı gıcırtıyla açılır.\n\n“Kart sola — kırmızı kutu!”"
              : "İkinci kapı açıldı.\nKoridor derinleşiyor…",
          resumeMode: MODE.PLAY,
          update: (_t, u) => {
            camera.position.set(2.2, 2.8 + u * 0.4, dz + 5 - u);
            camera.lookAt(0, 1.5, dz);
            if (Math.random() < 0.15) spawnSparks((Math.random() - 0.5) * 2, 1.6, dz, 0xaaccff, 2);
          },
          onDone: () => {
            if (which === 1) applyEvent("color_ok");
            else applyEvent("color2_ok");
            if (uiEl) uiEl.classList.remove("hidden");
          },
        });
      }, 350);
    }
  } else {
    state.colorProgress = 0;
    colorStatus.textContent = "Yanlış! Sıra tekrar gösterilecek…";
    state.colorLocked = true;
    colorButtons.querySelectorAll("button").forEach((b) => {
      b.disabled = true;
      b.style.opacity = "0.45";
      b.style.pointerEvents = "none";
    });
    const names = { blue: "Mavi", green: "Yeşil", red: "Kırmızı", yellow: "Sarı" };
    let left = 5;
    colorOrderLabel.textContent = ord.map((x) => names[x]).join(" → ");
    colorOrderLabel.style.opacity = "1";
    if (state.colorCountdown) clearInterval(state.colorCountdown);
    state.colorCountdown = setInterval(() => {
      left -= 1;
      if (left > 0) colorStatus.textContent = `Sırayı ezberle! (${left})`;
      else {
        clearInterval(state.colorCountdown);
        state.colorCountdown = null;
        colorOrderLabel.textContent = "??? → ??? → ??? → ???";
        colorStatus.textContent = "Şimdi sırayla bas!";
        state.colorLocked = false;
        colorButtons.querySelectorAll("button").forEach((b) => {
          b.disabled = false;
          b.style.opacity = "1";
          b.style.pointerEvents = "auto";
        });
      }
    }, 1000);
  }
}

function startHide(which) {
  state.mode = MODE.HIDE;
  state.hideWhich = which;
  state.hideProgress = 0;
  hideAllMinigames();
  hideUi.classList.remove("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
  runZone.visible = false;
  const z = which === 1 ? POS.hide1 : POS.hide2;
  // Oyuncunun hemen yanında yeşil — uzakta aramasın
  const near = {
    x: THREE.MathUtils.clamp(player.position.x + 1.2, -3.5, 3.5),
    z: player.position.z + 2.5,
  };
  POS._hideActive = near;
  hideZone.position.set(near.x, 0.05, near.z);
  hideZone.visible = true;
  guard.visible = true;
  guard.position.set(near.x - 3.5, 0, near.z + 1);
  if (hideStatus) hideStatus.textContent = "Yakındaki YEŞİL daireye gir · bekle";
  toast("Yeşil daireye gir!", 2);
}

function updateHide(dt) {
  updatePlayerMove(dt * 1.15);
  updateCamera();
  const z = POS._hideActive || (state.hideWhich === 1 ? POS.hide1 : POS.hide2);
  const d = distXZ(player.position.x, player.position.z, z.x, z.z);
  // Büyük yarıçap + hızlı dolma
  if (d < 2.6) {
    state.hideProgress = Math.min(1, state.hideProgress + (dt / 1.6) * easyHideFillMult(state.easyMode));
    if (hideStatus) hideStatus.textContent = "Saklandın… az kaldı";
  } else {
    state.hideProgress = Math.max(0, state.hideProgress - dt * 0.2);
    if (hideStatus) hideStatus.textContent = "YEŞİL daireye gir!";
  }
  if (hideBar) hideBar.style.width = `${state.hideProgress * 100}%`;
  guard.position.z = z.z + Math.sin(clock.elapsedTime * 0.7) * 2.2;
  guard.position.x = z.x - 3 + Math.cos(clock.elapsedTime * 0.5) * 0.8;
  if (state.hideProgress >= 1) {
    hideAllMinigames();
    hideZone.visible = false;
    state.mode = MODE.PLAY;
    if (state.hideWhich === 1) applyEvent("hide_ok");
    else applyEvent("hide2_ok");
    toast("Şimdi SARI daireye koş!", 2);
  }
}

function startRun(which) {
  state.mode = MODE.RUN;
  state.runWhich = which;
  state.runT = 0;
  hideAllMinigames();
  runUi.classList.remove("hidden");
  guard.visible = true;
  hideZone.visible = false;
  // Hedef: kısa mesafe ileri (run2 = bilgisayara bitişik)
  const base = which === 1 ? POS.run1 : POS.run2;
  const target = {
    x: 0,
    z: Math.min(base.z, player.position.z + 5.5),
  };
  if (which === 2) {
    // 2. koşu: doğrudan bilgisayara
    target.x = POS.pc.x;
    target.z = POS.pc.z;
  }
  POS._runActive = target;
  runZone.position.set(target.x, 0.05, target.z);
  runZone.visible = true;
  doorArrow.visible = true;
  doorArrow.position.set(target.x, 2.8, target.z - 0.8);
  toast(which === 2 ? "SARI daire = bilgisayar · koş!" : "SARI daireye koş!", 2.5);
}

function updateRun(dt) {
  const maxT = RUN_MAX_T * easyRunTimeMult(state.easyMode);
  state.runT += dt;
  if (runBar) runBar.style.width = `${Math.min(1, state.runT / maxT) * 100}%`;
  // Koşuda daha hızlı
  updatePlayerMove(dt * 1.55);
  updateCamera();
  // Nöbetçi yavaş (yetişmesin)
  guard.position.x += (player.position.x - guard.position.x) * 0.7 * dt;
  guard.position.z += (player.position.z - guard.position.z) * 0.7 * dt;
  const target = POS._runActive || (state.runWhich === 1 ? POS.run1 : POS.run2);
  if (runZone.visible) {
    runZone.position.y = 0.05 + Math.sin(clock.elapsedTime * 4) * 0.03;
  }
  if (distXZ(player.position.x, player.position.z, target.x, target.z) < 3.2) {
    hideAllMinigames();
    guard.visible = false;
    runZone.visible = false;
    state.mode = MODE.PLAY;
    if (state.runWhich === 1) {
      applyEvent("run_ok");
      toast("Devriyeye hazır ol!", 2);
    } else {
      applyEvent("run2_ok");
      toast("Bilgisayar burada · HACKLE!", 3);
      // Direkt bilgisayar yanına koy
      player.position.set(POS.pc.x, 0, POS.pc.z - 1.5);
    }
    return;
  }
  // Süre dolsa bile: eğer yarı yoldan fazlaysa BAŞARILI say
  if (state.runT >= maxT) {
    const startZ = state.runWhich === 1 ? POS.hide1.z : POS.hide2.z;
    const progress = (player.position.z - startZ) / Math.max(1, target.z - startZ);
    if (progress > 0.45 || player.position.z >= target.z - 4) {
      hideAllMinigames();
      guard.visible = false;
      runZone.visible = false;
      state.mode = MODE.PLAY;
      if (state.runWhich === 1) applyEvent("run_ok");
      else {
        applyEvent("run2_ok");
        player.position.set(POS.pc.x, 0, POS.pc.z - 1.5);
      }
      toast("Yetiştin!", 2);
      return;
    }
    // Gerçek fail: az geri al, tekrar saklan (çok cezalandırma)
    hideAllMinigames();
    runZone.visible = false;
    state.mode = MODE.PLAY;
    player.position.z = Math.max(player.position.z - 2, startZ - 1);
    if (state.runWhich === 1) {
      setQuest(QUEST.HIDE_GUARD);
      onQuest(QUEST.HIDE_GUARD);
    } else {
      setQuest(QUEST.HIDE2);
      onQuest(QUEST.HIDE2);
    }
    toast("Biraz daha hızlı · tekrar yeşil!", 2.5);
  }
}

function startHack() {
  // Direkt panel — diyalog + süre yok (çocuk için; eskiden "çalışmıyor" hissi veriyordu)
  try {
    state.mode = MODE.HACK;
    state.dialogueOpen = false;
    dialogueEl?.classList.add("hidden");
    state.dialogueAfter = null;
    hideAllMinigames();
    if (document.pointerLockElement) document.exitPointerLock();
    if (interactBtn) interactBtn.classList.add("hidden");
    if (!hackUi || !hackBody) {
      console.error("hack UI yok");
      alert("Hack ekranı yüklenemedi — sayfayı Cmd+Shift+R ile yenile");
      state.mode = MODE.PLAY;
      return;
    }
    hackUi.classList.remove("hidden");
    toast("Hack başladı · düğmelere tıkla!", 2.5);
    beginHackStep(1);
  } catch (err) {
    console.error("startHack", err);
    alert("Hack hatası: " + err.message);
    state.mode = MODE.PLAY;
  }
}

function makeHackBtn(label, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "hack-btn";
  b.textContent = label;
  b.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (state.hackFailing) return;
    onClick(b, ev);
  });
  return b;
}

function beginHackStep(step) {
  state.hackStep = step;
  state.hackFailing = false;
  if (hackFail) hackFail.classList.add("hidden");
  if (paperNote) paperNote.classList.add("hidden");
  if (!hackBody) return;
  hackBody.innerHTML = "";
  state.hackLetterI = 0;

  if (step === 1) {
    // 4 düğme — 12 çoktu, süre de yok
    if (hackStepLabel) hackStepLabel.textContent = "Adım 1/4 — 4 düğmenin hepsine bas";
    const labels = ["A1", "B2", "C3", "D4"];
    const pressed = new Set();
    labels.forEach((lab) => {
      hackBody.appendChild(
        makeHackBtn(lab, (b) => {
          if (pressed.has(lab)) return;
          pressed.add(lab);
          b.style.background = "#1a4030";
          b.style.borderColor = "#4f8";
          if (pressed.size >= labels.length) succeedHackStep();
        })
      );
    });
  } else if (step === 2) {
    if (hackStepLabel) hackStepLabel.textContent = "Adım 2/4 — Büyük harfe bas (H → E → N → T → W)";
    const show = document.createElement("div");
    show.id = "hack-letter-show";
    show.textContent = HACK_LETTERS[0];
    hackBody.appendChild(show);
    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;justify-content:center;width:100%";
    const letters = [...new Set([...HACK_LETTERS, "X", "Q", "Z", "M", "P"])];
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    letters.forEach((L) => {
      row.appendChild(
        makeHackBtn(L, () => {
          if (L === HACK_LETTERS[state.hackLetterI]) {
            state.hackLetterI++;
            if (state.hackLetterI >= HACK_LETTERS.length) succeedHackStep();
            else show.textContent = HACK_LETTERS[state.hackLetterI];
          } else {
            softHackFail("Yanlış harf — tekrar dene");
          }
        })
      );
    });
    hackBody.appendChild(row);
  } else if (step === 3) {
    if (hackStepLabel) hackStepLabel.textContent = "Adım 3/4 — Kâğıttaki sayıyı yaz";
    if (paperNote) paperNote.classList.remove("hidden");
    if (paperBinary) paperBinary.textContent = BINARY_PAPER;
    const inp = document.createElement("input");
    inp.id = "binary-input";
    inp.type = "text";
    inp.inputMode = "numeric";
    inp.placeholder = BINARY_PAPER;
    inp.autocomplete = "off";
    inp.spellcheck = false;
    hackBody.appendChild(inp);
    const check = () => {
      if (binaryMatches(inp.value)) succeedHackStep();
      else softHackFail("Yanlış — kâğıttaki gibi yaz: " + BINARY_PAPER);
    };
    hackBody.appendChild(
      makeHackBtn("ONAYLA", () => check())
    );
    // Hazır cevap düğmesi (çocuk için)
    hackBody.appendChild(
      makeHackBtn("KÂĞIDI YAZ", () => {
        inp.value = BINARY_PAPER;
        succeedHackStep();
      })
    );
    inp.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        check();
      }
    });
    inp.addEventListener("keyup", (e) => e.stopPropagation());
    setTimeout(() => {
      try {
        inp.focus();
      } catch (_) {}
    }, 50);
  } else if (step === 4) {
    if (hackStepLabel) hackStepLabel.textContent = "Son adım — kutuyu işaretle";
    if (paperNote) paperNote.classList.add("hidden");
    const row = document.createElement("div");
    row.id = "captcha-row";
    row.innerHTML =
      '<input type="checkbox" id="not-robot" /><label for="not-robot">Ben robot değilim</label>';
    hackBody.appendChild(row);
    hackBody.appendChild(
      makeHackBtn("GÖNDER", () => {
        const cb = document.getElementById("not-robot");
        if (cb?.checked) succeedHackStep();
        else softHackFail("Önce kutuyu işaretle!");
      })
    );
  }
}

function softHackFail(msg) {
  if (hackFail) {
    hackFail.textContent = msg;
    hackFail.classList.remove("hidden");
  }
  sfx.fail();
  toast(msg, 2);
  // Adıma 1'e atma — sadece uyar; yanlış harfte adım 2'de kal
}

function failHack() {
  // Eski zaman aşımı yolu — artık süre yok; sadece adım 1'e yumuşak dönüş
  if (state.hackFailing) return;
  state.hackFailing = true;
  softHackFail("Tekrar dene — adım 1");
  setTimeout(() => {
    state.hackFailing = false;
    beginHackStep(1);
  }, 500);
}

function succeedHackStep() {
  const next = nextHackStep(state.hackStep, true);
  if (next >= 5) {
    hideAllMinigames();
    spawnBurst(POS.pc.x, 1.8, POS.pc.z, 0x66ffcc, 20, 4);
    spawnSparks(POS.pc.x, 2, POS.pc.z, 0xffffff, 12);
    openDialogue(
      "ROBOT",
      "…Aslında robotlar o kutuyu işaretleyebilir.\n\nBen üşendim. Yalan söyledim.\n\nAma sen efsanevdin. Hadi eve — Dünya'ya!",
      () => {
        playCutscene({
          duration: 3.0,
          text: "Sistemler… YEŞİL.\nKapılar açılıyor.\nKaçış gemisi uyanıyor.",
          resumeMode: MODE.PLAY,
          update: (_t, u) => {
            camera.position.set(2 + u * 2, 3 + u, POS.pc.z + 4);
            camera.lookAt(POS.escape.x, 1.5, POS.escape.z);
            if (Math.random() < 0.25)
              spawnBurst(POS.escape.x, 0.5 + u * 2, POS.escape.z, 0x66ffaa, 4, 2);
          },
          onDone: () => {
            state.mode = MODE.PLAY;
            applyEvent("hack_ok");
            if (uiEl) uiEl.classList.remove("hidden");
            toast("Kaçış gemisine koş!", 3);
          },
        });
      }
    );
    return;
  }
  spawnSparks(0, 2, 0, 0x88ffaa, 6);
  toast("İyi! Sonraki adım…", 1.2);
  beginHackStep(next);
}

function updateHack(_dt) {
  // Süre yok — sadece panel açık kalsın
}

function showEnd() {
  sfx.win();
  refreshCollectHud();
  try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
  state.mode = MODE.END;
  uiEl.classList.add("hidden");
  hideAllMinigames();
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      spawnBurst(
        (Math.random() - 0.5) * 6,
        1 + Math.random() * 3,
        POS.escape.z + Math.random() * 4,
        [0xff6688, 0x66ffcc, 0xffcc44, 0x88aaff][i % 4],
        14,
        3
      );
    }, i * 180);
  }
  endScreen.classList.remove("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
}

function startGame(fromSave = false) {
  try {
    sfx.ui();
    state.easyMode = !!(easyModeCb && easyModeCb.checked);
    if (easyBadge) {
      if (state.easyMode) easyBadge.classList.remove("hidden");
      else easyBadge.classList.add("hidden");
    }
    titleScreen.classList.add("hidden");
    state.mode = MODE.WAKE;
    state.wakeT = 0;
    wakeOverlay.classList.remove("hidden", "fade");
    requestAnimationFrame(() => setTimeout(() => wakeOverlay.classList.add("fade"), 200));
    setQuest(QUEST.WAKE);
    // Uyanış parçacıkları (toz / kıvılcım)
    for (let i = 0; i < 3; i++) {
      setTimeout(() => spawnBurst(0, 0.6 + i * 0.3, 1, 0xaaccff, 8, 1.2), i * 200);
    }
    story(
      "Gözlerin ağır…\nDemir… soğuk…\nPencerede yıldızlar.\n\nKRAXX esir gemisi.\nBizi kaçırdılar.",
      3.5
    );
  } catch (err) {
    console.error(err);
    alert("Oyun başlatılamadı: " + err.message);
  }
}

function beginPlay() {
  state.mode = MODE.PLAY;
  bodyRoot.rotation.x = 0;
  bodyRoot.position.y = 0;
  wakeOverlay.classList.add("hidden");
  uiEl.classList.remove("hidden");
  refreshCollectHud();
  if (state.saveLoaded) {
    state.saveLoaded = false;
    toast(state.easyMode ? "Devam · KOLAY mod" : "Devam · kayıt yüklendi", 3);
    persistSave();
    return;
  }
  applyEvent("stood_up");
  toast("WASD · ATEŞ: boşluk · ★ yıldızlar · harita sağ alt", 4.5);
  persistSave();
}

function wdist(a, o) {
  return distXZ(a.x, a.z, o.x, o.z);
}

function getNear() {
  if (state.mode !== MODE.PLAY || state.dialogueOpen) return null;
  const p = player.position;
  const q = state.quest;
  if (q === QUEST.TALK_ROBOT && wdist(p, robot.position) < R + 0.5)
    return { t: "robot", l: "Robotla konuş", btn: "H · ROBOT" };
  if (
    (q === QUEST.FOLLOW_DOOR || q === QUEST.COLOR_PUZZLE) &&
    wdist(p, colorDoor.position) < R + 1.0
  )
    return { t: "color", l: "Renk panelleri", btn: "E · RENK" };
  if (q === QUEST.FIND_KEYCARD && keycard.visible && wdist(p, keycard.position) < R + 0.5)
    return { t: "key", l: "Anahtar kartı al", btn: "E · KART AL" };
  if (q === QUEST.FIND_BATTERY && battery.visible && wdist(p, battery.position) < R + 0.5)
    return { t: "bat", l: "Batarya al", btn: "E · BATARYA" };
  if (q === QUEST.COLOR2 && wdist(p, colorDoor2.position) < R + 1.0)
    return { t: "color2", l: "2. renk panelleri", btn: "E · RENK 2" };
  // PC: geniş alan + z eşiği (koridor sonu)
  if (
    q === QUEST.REACH_PC &&
    (wdist(p, pc.position) < R + 3.5 || (p.z > POS.pc.z - 4 && Math.abs(p.x) < 4.5))
  )
    return { t: "pc", l: "Ana bilgisayarı hackle", btn: "HACKLE!" };
  if (q === QUEST.ESCAPE && escapePad.visible && wdist(p, escapePad.position) < R + 1.8)
    return { t: "ship", l: "Kaçış gemisine bin", btn: "E · DÜNYA!" };
  return null;
}

function setInteractUI(n) {
  state.nearAction = n;
  if (n) {
    if (promptEl) {
      promptEl.textContent = n.l + "  ·  alttaki sarı düğme";
      promptEl.classList.remove("hidden");
    }
    if (interactBtn) {
      interactBtn.textContent = n.btn || "E · ETKİLEŞİM";
      interactBtn.classList.remove("hidden");
    }
  } else {
    if (promptEl) promptEl.classList.add("hidden");
    if (interactBtn) interactBtn.classList.add("hidden");
  }
}

function doNear(t) {
  if (!t) return;
  if (t === "robot") {
    openDialogue(
      "ROBOT",
      "Uyku modu değil.\nBizi kaçırdılar. Batarya %12.\n\nŞu kapıdan git (sarı ok).\nUzun yol: renk, kart, saklan, koş, savaş…\nSonra hackleme — sen yapacaksın.\nBen haritayım, sen bacaklarsın.",
      () => {
        applyEvent("robot_talked");
        doorArrow.visible = true;
        doorArrow.position.set(POS.colorDoor.x, 2.9, POS.colorDoor.z - 1.2);
      }
    );
    return;
  }
  if (t === "color") {
    applyEvent("at_color");
    return;
  }
  if (t === "key") {
    state.hasKeycard = true;
    keycard.visible = false;
    spawnBurst(keycard.position.x, 0.8, keycard.position.z, 0xff4455, 16, 3);
    toast("Anahtar kartı!");
    applyEvent("keycard_ok");
    return;
  }
  if (t === "bat") {
    state.hasBattery = true;
    battery.visible = false;
    spawnBurst(battery.position.x, 0.8, battery.position.z, 0x44aaff, 16, 3);
    toast("Batarya · Robot %100");
    applyEvent("battery_ok");
    return;
  }
  if (t === "color2") {
    startColorPuzzle(2);
    return;
  }
  if (t === "pc") {
    doorArrow.visible = false;
    setInteractUI(null);
    // pc_start → onQuest(HACK) → startHack
    applyEvent("pc_start");
    // Eğer görev zaten HACK ise (çift tık) yine aç
    if (state.quest === QUEST.HACK && state.mode !== MODE.HACK) startHack();
    // applyEvent sonrası quest HACK olur ve startHack çağrılır; garanti:
    if (state.mode !== MODE.HACK && state.quest === QUEST.HACK) startHack();
    return;
  }
  if (t === "ship") {
    spawnBurst(POS.escape.x, 1, POS.escape.z, 0x66ffaa, 20, 4);
    playCutscene({
      duration: 2.2,
      text: "Kemerler…\nMotor ısınır…\n“Dünya’ya!”",
      resumeMode: MODE.ESCAPE,
      update: (_t, u) => {
        camera.position.set(4, 2.5 + u, POS.escape.z + 5);
        camera.lookAt(0, 1.5 + u, POS.escape.z);
        if (Math.random() < 0.3) spawnSparks(0, 0.5, POS.escape.z, 0xff8844, 4);
      },
      onDone: () => {
        state.mode = MODE.ESCAPE;
        state.escapeT = 0;
        uiEl.classList.add("hidden");
        story("Motorlar…\nYıldızlar…\nDünya mavi…\n\nEve dönüş.\nSeri sona eriyor.", 4);
      },
    });
  }
}

function updatePlayerMove(dt) {
  if (state.dialogueOpen) return;
  if (keys.has("arrowleft")) camOrbit.yaw += 1.8 * dt;
  if (keys.has("arrowright")) camOrbit.yaw -= 1.8 * dt;
  if (keys.has("arrowup"))
    camOrbit.pitch = Math.min(camOrbit.maxPitch, camOrbit.pitch + 1.2 * dt);
  if (keys.has("arrowdown"))
    camOrbit.pitch = Math.max(camOrbit.minPitch, camOrbit.pitch - 1.2 * dt);

  let ix = 0,
    iz = 0;
  if (keys.has("w")) iz -= 1;
  if (keys.has("s")) iz += 1;
  if (keys.has("a")) ix -= 1;
  if (keys.has("d")) ix += 1;
  if (!ix && !iz) return;
  const sin = Math.sin(camOrbit.yaw);
  const cos = Math.cos(camOrbit.yaw);
  const mx = ix * cos + iz * sin;
  const mz = -ix * sin + iz * cos;
  const len = Math.hypot(mx, mz) || 1;
  player.position.x = THREE.MathUtils.clamp(
    player.position.x + (mx / len) * SPEED * dt,
    -4.5,
    4.5
  );
  player.position.z = THREE.MathUtils.clamp(
    player.position.z + (mz / len) * SPEED * dt,
    -3,
    88
  );
  player.rotation.y = Math.atan2(mx, mz);
}

function updateCamera() {
  _camTarget.set(player.position.x, player.position.y + 1.25, player.position.z);
  const cp = Math.cos(camOrbit.pitch);
  const sp = Math.sin(camOrbit.pitch);
  const sy = Math.sin(camOrbit.yaw);
  const cy = Math.cos(camOrbit.yaw);
  _camDesired.set(
    _camTarget.x + sy * cp * camOrbit.distance,
    Math.max(0.65, _camTarget.y + sp * camOrbit.distance + 0.4),
    _camTarget.z + cy * cp * camOrbit.distance
  );
  camera.position.lerp(_camDesired, 0.18);
  camera.lookAt(_camTarget);
  playerLight.position.set(player.position.x, player.position.y + 2.5, player.position.z);
}

function updatePlay(dt) {
  updatePlayerMove(dt);
  updateCamera();
  state.shootCd = Math.max(0, state.shootCd - dt);
  updateEnemies(dt);

  if (state.quest !== QUEST.WAKE && state.quest !== QUEST.TALK_ROBOT) {
    const tx = player.position.x - 1.1;
    const tz = player.position.z - 1.3;
    robot.position.x += (tx - robot.position.x) * 2.2 * dt;
    robot.position.z += (tz - robot.position.z) * 2.2 * dt;
  }
  if (doorArrow.visible) {
    doorArrow.position.y = 2.7 + Math.sin(clock.elapsedTime * 3) * 0.15;
  }
  if (keycard.visible && keycard.userData.beacon) {
    keycard.userData.beacon.position.y = 1.0 + Math.sin(clock.elapsedTime * 4) * 0.2;
    keycard.rotation.y += dt;
  }
  if (battery.visible && battery.userData.beacon) {
    battery.userData.beacon.position.y = 1.0 + Math.sin(clock.elapsedTime * 4) * 0.2;
    battery.rotation.y += dt;
  }
  // Mavi bilgisayar etiketi zıplasın
  if (pc.userData.tag && state.quest === QUEST.REACH_PC) {
    pc.userData.tag.position.y = 3.1 + Math.sin(clock.elapsedTime * 3.5) * 0.25;
    pc.userData.tag.visible = true;
  } else if (pc.userData.tag) {
    pc.userData.tag.visible = state.quest === QUEST.HACK ? false : pc.userData.tag.visible;
    if (state.quest !== QUEST.REACH_PC && state.quest !== QUEST.HACK) {
      // erken görevlerde de hafif görünsün (koridor sonu hedefi)
      pc.userData.tag.visible = true;
      pc.userData.tag.position.y = 3.1 + Math.sin(clock.elapsedTime * 2) * 0.12;
    }
  }
  if (!state.dialogueOpen) {
    if (state.combat) {
      // Savaşta sarı düğme = ATEŞ
      if (promptEl) {
        promptEl.textContent = "ATEŞ: Boşluk veya sol tık (veya sarı düğme)";
        promptEl.classList.remove("hidden");
      }
      if (interactBtn) {
        interactBtn.textContent = "ATEŞ!";
        interactBtn.classList.remove("hidden");
      }
      state.nearAction = { t: "_shoot", l: "Ateş", btn: "ATEŞ!" };
    } else {
      const n = getNear();
      setInteractUI(n);
      // Bilgisayara yaklaşınca ~0.6 sn sonra otomatik hack
      if (n?.t === "pc") {
        state.pcAutoT += dt;
        if (state.pcAutoT > 0.6) {
          state.pcAutoT = 0;
          doNear("pc");
        }
      } else {
        state.pcAutoT = 0;
      }
    }
  } else {
    setInteractUI(null);
  }
  tryCollectStars();
  updateMinimapHud();
  // yıldız dönüşü
  for (const id of Object.keys(starMeshes)) {
    const g = starMeshes[id];
    if (g && g.visible && g.userData.spin) g.userData.spin.rotation.y += 0.03;
  }
  redAlert.intensity = 0.7 + Math.sin(clock.elapsedTime * 2) * 0.5;
}

function updateWake(dt) {
  state.wakeT += dt;
  if (state.wakeT < 1.8) {
    camera.position.set(1.3, 0.55, 2.6);
    camera.lookAt(0, 0.35, 1);
  } else {
    const u = THREE.MathUtils.clamp((state.wakeT - 1.8) / 2.2, 0, 1);
    const s = u * u * (3 - 2 * u);
    bodyRoot.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2 + 0.15, 0, s);
    bodyRoot.position.y = THREE.MathUtils.lerp(0.28, 0, s);
    _camTarget.set(player.position.x, player.position.y + 1.2, player.position.z);
    camera.position.set(
      THREE.MathUtils.lerp(1.3, player.position.x + 2, s),
      THREE.MathUtils.lerp(0.6, player.position.y + 2.2, s),
      THREE.MathUtils.lerp(2.9, player.position.z + 4, s)
    );
    camera.lookAt(_camTarget);
    if (u >= 1) beginPlay();
  }
}

// Kaçış sinematiği için basit “Dünya”
let earthMesh = null;
function ensureEarth() {
  if (earthMesh) return earthMesh;
  earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0x2a6adb,
      emissive: 0x113366,
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.7,
    })
  );
  // yeşil kıtalar (basit lekeler)
  const land = new THREE.Mesh(
    new THREE.SphereGeometry(2.42, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x33aa55,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    })
  );
  earthMesh.add(land);
  earthMesh.position.set(-6, 8, POS.escape.z + 18);
  earthMesh.visible = false;
  scene.add(earthMesh);
  return earthMesh;
}

function updateEscape(dt) {
  state.escapeT += dt;
  const earth = ensureEarth();
  earth.visible = true;
  // Gemi yükselir, kamera geri çekilir, Dünya yaklaşır
  const u = Math.min(1, state.escapeT / 5.2);
  escapePad.position.y = Math.min(28, state.escapeT * 5.2);
  camera.position.set(6 + u * 4, 3.5 + u * 6, POS.escape.z + 8 + u * 6);
  camera.lookAt(0, 2 + escapePad.position.y * 0.3, POS.escape.z);
  earth.position.set(-4 - u * 2, 6 + u * 4, POS.escape.z + 16 - u * 4);
  earth.rotation.y += dt * 0.35;
  // Motor alevi + yıldız parçacıkları
  if (Math.random() < 0.55) {
    spawnBurst(
      escapePad.position.x + (Math.random() - 0.5),
      escapePad.position.y - 0.3,
      escapePad.position.z,
      Math.random() > 0.5 ? 0xff8844 : 0x66aaff,
      5,
      2.5
    );
  }
  if (Math.random() < 0.3) {
    spawnBurst(
      (Math.random() - 0.5) * 10,
      2 + Math.random() * 8,
      POS.escape.z + 5 + Math.random() * 10,
      0xffffff,
      2,
      0.6
    );
  }
  if (state.escapeT > 5.0) {
    storyOverlay.classList.add("hidden");
    applyEvent("escaped");
  }
}

// ---- Input (once) ----
const btnStart = document.getElementById("btn-start");
if (btnStart) {
  btnStart.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startGame();
  });
} else {
  console.error("btn-start bulunamadı");
}

// Title screen click anywhere also starts (fallback)
titleScreen?.addEventListener("click", (e) => {
  if (state.mode !== MODE.TITLE) return;
  if (e.target.closest("button") || e.target.id === "btn-start") return;
  // optional: don't start on random click, only button
});

window.addEventListener("keydown", (e) => {
  // Caps Lock'tan bağımsız: e.code kullan (KeyW / KeyE …)
  const code = e.code;
  const moveMap = {
    KeyW: "w",
    KeyA: "a",
    KeyS: "s",
    KeyD: "d",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
  };
  if (moveMap[code]) keys.add(moveMap[code]);
  // Eski yol (yedek)
  const k = (e.key || "").toLowerCase();
  if ("wasd".includes(k)) keys.add(k);

  if (state.mode === MODE.TITLE && (code === "Enter" || code === "Space")) {
    e.preventDefault();
    startGame();
    return;
  }
  if (state.mode === MODE.END) return;
  // Ara sahne atla
  if (state.mode === MODE.CUTSCENE && (code === "Space" || code === "Enter" || code === "Escape")) {
    e.preventDefault();
    skipCutscene();
    return;
  }
  if (
    state.dialogueOpen &&
    (code === "KeyH" || code === "Escape" || code === "Space" || code === "Enter")
  ) {
    e.preventDefault();
    closeDialogue();
    return;
  }
  if (code.startsWith("Arrow")) {
    if (state.mode === MODE.PLAY || state.mode === MODE.HIDE || state.mode === MODE.RUN)
      e.preventDefault();
  }
  if (state.mode !== MODE.PLAY) return;
  // ATEŞ: Boşluk (diyalog kapalıyken)
  if (code === "Space" && state.combat && !state.dialogueOpen) {
    e.preventDefault();
    tryShoot();
    return;
  }
  // E / F / Enter — Caps Lock fark etmez
  if (code === "KeyE" || code === "KeyF" || code === "Enter") {
    const n = getNear();
    if (n && n.t !== "robot") {
      e.preventDefault();
      doNear(n.t);
    }
  }
  if (code === "KeyH") {
    const n = getNear();
    if (n?.t === "robot") doNear("robot");
  }
});
window.addEventListener("keyup", (e) => {
  const code = e.code;
  const moveMap = {
    KeyW: "w",
    KeyA: "a",
    KeyS: "s",
    KeyD: "d",
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
  };
  if (moveMap[code]) keys.delete(moveMap[code]);
  const k = (e.key || "").toLowerCase();
  if ("wasd".includes(k)) keys.delete(k);
});

// Sarı büyük düğme — savaşta ATEŞ, değilse etkileşim
if (interactBtn) {
  interactBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.mode === MODE.PLAY && state.combat && !state.dialogueOpen) {
      tryShoot();
      return;
    }
    const n = state.nearAction || getNear();
    if (!n) return;
    if (n.t === "robot") doNear("robot");
    else doNear(n.t);
  });
}

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 2) {
    state.rmbLook = true;
    e.preventDefault();
  }
  if (e.button === 0) {
    if (state.mode === MODE.PLAY && !state.dialogueOpen) {
      // Savaşta: her sol tık ATEŞ (fare kilidi şart değil!)
      if (state.combat) {
        tryShoot();
        if (!state.pointer) {
          try {
            canvas.requestPointerLock();
          } catch (_) {}
        }
        return;
      }
      const n = getNear();
      if (n && n.t !== "robot") {
        doNear(n.t);
        return;
      }
      if (!state.pointer) {
        try {
          canvas.requestPointerLock();
        } catch (_) {}
        toast("Fare kilidi · bakmak için hareket ettir", 2);
      }
    } else if (
      (state.mode === MODE.RUN || state.mode === MODE.HIDE) &&
      !state.dialogueOpen
    ) {
      if (!state.pointer) {
        try {
          canvas.requestPointerLock();
        } catch (_) {}
      }
    }
  }
});
canvas.addEventListener("mouseup", (e) => {
  if (e.button === 2) state.rmbLook = false;
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("pointerlockchange", () => {
  state.pointer = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (e) => {
  if (state.dialogueOpen) return;
  if (state.mode !== MODE.PLAY && state.mode !== MODE.RUN && state.mode !== MODE.HIDE)
    return;
  if (!(state.pointer || state.rmbLook)) return;
  camOrbit.yaw -= e.movementX * camOrbit.sensitivity;
  camOrbit.pitch = THREE.MathUtils.clamp(
    camOrbit.pitch - e.movementY * camOrbit.sensitivity,
    camOrbit.minPitch,
    camOrbit.maxPitch
  );
});
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Diyalog: tıkla / dokun → devam (çocuklar için)
dialogueEl?.addEventListener("click", () => {
  if (state.dialogueOpen) closeDialogue();
});
// Ara sahne: tıkla = atla
storyOverlay?.addEventListener("click", () => {
  if (state.mode === MODE.CUTSCENE) skipCutscene();
});

function tick() {
  requestAnimationFrame(tick);
  try {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (state.mode === MODE.WAKE) updateWake(dt);
    else if (state.mode === MODE.PLAY) updatePlay(dt);
    else if (state.mode === MODE.HIDE) updateHide(dt);
    else if (state.mode === MODE.RUN) updateRun(dt);
    else if (state.mode === MODE.HACK) updateHack(dt);
    else if (state.mode === MODE.ESCAPE) updateEscape(dt);
    else if (state.mode === MODE.CUTSCENE) updateCutscene(dt);
    else if (state.mode === MODE.COLOR) {
      const z = state.colorWhich === 1 ? POS.colorDoor.z : POS.color2.z;
      camera.position.lerp(_camDesired.set(2.5, 3.2, z + 5), 0.05);
      camera.lookAt(0, 1.6, z);
    }
    updateParticles(dt);
    if (state.toastT > 0) {
      state.toastT -= dt;
      if (state.toastT <= 0) toastEl.classList.add("hidden");
    }
    renderer.render(scene, camera);
  } catch (err) {
    console.error("tick", err);
  }
}

// Fix: updateHide/Run still need to be the ones defined - they are above
// But I may have left updateHide referencing startHide - good

// Wire start button robustly
function wireStart() {
  const btn = document.getElementById("btn-start");
  if (!btn) {
    console.error("BAŞLA butonu yok");
    return;
  }
  btn.onclick = (e) => {
    e.preventDefault();
    startGame();
  };
  console.info("BAŞLA butonu bağlandı");
}
wireStart();

// Save / continue / easy UI
(function initSeriesMeta() {
  const saved = tryLoadSave();
  if (btnContinue) {
    if (saved && saved.quest && saved.quest !== QUEST.DONE && saved.quest !== QUEST.WAKE) {
      btnContinue.classList.remove("hidden");
    }
    btnContinue.addEventListener("click", (e) => {
      e.preventDefault();
      const data = tryLoadSave();
      if (!data) {
        toast("Kayıt yok");
        return;
      }
      sfx.ui();
      state.easyMode = data.easyMode;
      if (easyModeCb) easyModeCb.checked = !!data.easyMode;
      if (easyBadge) {
        if (state.easyMode) easyBadge.classList.remove("hidden");
        else easyBadge.classList.add("hidden");
      }
      state.collectibles = data.collectibles?.length
        ? data.collectibles
        : createCollectibles(["star1", "star2", "star3"]);
      state.collectedCount = data.collectedCount || 0;
      state.playerHp = data.playerHp || 100;
      state.hasKeycard = !!(data.extra && data.extra.hasKeycard);
      state.hasBattery = !!(data.extra && data.extra.hasBattery);
      state.saveLoaded = true;
      titleScreen.classList.add("hidden");
      state.mode = MODE.WAKE;
      state.wakeT = 2.5; // skip most of wake
      wakeOverlay.classList.add("hidden", "fade");
      setQuest(data.quest);
      if (data.extra && typeof data.extra.px === "number") {
        player.position.x = data.extra.px;
        player.position.z = data.extra.pz;
      }
      // restore visibility of key items roughly
      if (state.hasKeycard) keycard.visible = false;
      if (state.hasBattery) battery.visible = false;
      refreshCollectHud();
      // jump into play after short frame
      setTimeout(() => {
        beginPlay();
        // re-apply quest side effects lightly
        onQuest(state.quest);
      }, 100);
    });
  }
  if (easyModeCb) {
    easyModeCb.addEventListener("change", () => sfx.click());
  }
})();

setQuest(QUEST.WAKE);
tick();
console.info("%cHENTW 3 hazır", "color:#ff6688;font-weight:bold");
