/**
 * HENTW PREMIUM — Sonsuz Uzay
 * Sonsuz hayatta kalma: malzeme topla, barınak inşa et, canavarlardan kaç ya da savaş.
 * Kamera: hafif yukarıdan takip · WASD hareket · BOŞLUK ateş · E topla · B inşa
 */
import * as THREE from "three";
import {
  ARENA_HALF,
  BUILDINGS,
  BUILD_ORDER,
  HEART_HP,
  PLAYER_MAX_HP,
  PLAYER_SPEED,
  MATERIALS,
  createInventory,
  addMaterial,
  canAfford,
  tryBuild,
  dangerLevel,
  spawnInterval,
  maxMonsters,
  monsterStats,
  waveNumber,
  waveBurstCount,
  computeScore,
  heartsFromHp,
  applyPlayerDamage,
  healTick,
  arenaClamp,
  pickNearest,
  distXZ,
  makeRng,
  worldToMinimap,
} from "./gameLogic.js";
import { createAudioBus, createParticleSystem, drawMinimap } from "./seriesFeatures.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const titleScreen = $("title-screen");
const uiEl = $("ui");
const endScreen = $("end-screen");
const heartsHud = $("hearts-hud");
const timeText = $("time-text");
const scoreText = $("score-text");
const dangerText = $("danger-text");
const matCrystalEl = $("mat-crystal");
const matMetalEl = $("mat-metal");
const minimapCanvas = $("minimap-canvas");
const easyBadge = $("easy-badge");
const waveBanner = $("wave-banner");
const promptEl = $("prompt");
const buildMenu = $("build-menu");
const toastEl = $("toast");
const easyModeCb = $("easy-mode");
const titleBest = $("title-best");
const titleBestVal = $("title-best-val");

const BEST_KEY = "hentwPremiumBest";
const MAP_BOUNDS = { minX: -ARENA_HALF, maxX: ARENA_HALF, minZ: -ARENA_HALF, maxZ: ARENA_HALF };
const MODE = { TITLE: "title", PLAY: "play", OVER: "over" };
const PICKUP_RANGE = 5;
const SHOOT_RANGE = 34;
const BULLET_SPEED = 26;
const MONSTER_ATTACK_RANGE = 1.8;
const BUILD_ATTACK_RANGE = 2.4;

const sfx = createAudioBus();
const keys = new Set();

const state = {
  mode: MODE.TITLE,
  easy: false,
  timeSec: 0,
  inv: createInventory(),
  collected: { kristal: 0, metal: 0 },
  kills: 0,
  hp: PLAYER_MAX_HP,
  invulnT: 0,
  shootCd: 0,
  facing: { x: 0, z: -1 },
  spawnT: 0,
  waveShown: 0,
  bannerT: 0,
  buildOpen: false,
  toastT: 0,
  hudT: 0,
  healFxT: 0,
  mouseFire: false,
  touchFire: false,
  trailT: 0,
  shakeT: 0,
};

// ---------- Three.js temel ----------
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
scene.background = new THREE.Color(0x060814);
scene.fog = new THREE.FogExp2(0x0a0e1e, 0.004);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(0, 22, 15);

scene.add(new THREE.AmbientLight(0x8899cc, 0.8));
const sunLight = new THREE.DirectionalLight(0xcfd8ff, 1.1);
sunLight.position.set(60, 120, 40);
scene.add(sunLight);
const playerLight = new THREE.PointLight(0x66ffee, 1.4, 26);
scene.add(playerLight);

// Yıldızlar
{
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1600 * 3);
  const srng = makeRng(777);
  for (let i = 0; i < 1600; i++) {
    const r = 420 + srng() * 380;
    const th = srng() * Math.PI * 2;
    const ph = Math.acos(2 * srng() - 1);
    starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    starPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.6 - 30;
    starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.6, sizeAttenuation: false })
    )
  );
}

// Zemin + ızgara
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
  new THREE.MeshStandardMaterial({ color: 0x151c33, roughness: 0.95, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const grid = new THREE.GridHelper(ARENA_HALF * 2, 40, 0x2a2a55, 0x151a35);
grid.position.y = 0.02;
scene.add(grid);

// Sınır halkası (yumuşak duvarın görünür işareti)
{
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * (ARENA_HALF - 2), 0.4, Math.sin(a) * (ARENA_HALF - 2)));
  }
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x8855ff, transparent: true, opacity: 0.5 })
  );
  scene.add(ring);
}

const particles = createParticleSystem(THREE, scene);

// ---------- Oyuncu gemisi ----------
const player = new THREE.Group();
{
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x66ffee, emissive: 0x1a554e, roughness: 0.4, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.7, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  player.add(body);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xbb88ff, emissive: 0x2a1650, roughness: 0.5, metalness: 0.5 });
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.5), wingMat);
    wing.position.set(s * 0.7, 0, 0.45);
    player.add(wing);
  }
  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8899ff, emissiveIntensity: 0.6 })
  );
  cockpit.position.set(0, 0.22, -0.15);
  player.add(cockpit);
}
player.position.set(0, 0.9, 0);
scene.add(player);

// ---------- Dünya: asteroitler + malzemeler ----------
const asteroids = [];
const resources = [];
let worldSeed = 1;

function randomSpot(rng, minR = 10) {
  for (let tries = 0; tries < 40; tries++) {
    const x = (rng() * 2 - 1) * (ARENA_HALF - 12);
    const z = (rng() * 2 - 1) * (ARENA_HALF - 12);
    if (distXZ(x, z, 0, 0) >= minR) return { x, z };
  }
  return { x: ARENA_HALF - 20, z: ARENA_HALF - 20 };
}

function makeCrystal() {
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7),
    new THREE.MeshStandardMaterial({
      color: 0xbb66ff, emissive: 0x7733cc, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.3,
    })
  );
  m.position.y = 0.9;
  return m;
}

function makeMetal() {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.9),
    new THREE.MeshStandardMaterial({
      color: 0xcc7733, emissive: 0x5a2d08, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.8,
    })
  );
  m.position.y = 0.55;
  return m;
}

function scatterWorld(seed) {
  for (const a of asteroids) scene.remove(a);
  for (const r of resources) scene.remove(r.mesh);
  asteroids.length = 0;
  resources.length = 0;
  const rng = makeRng(seed);
  for (let i = 0; i < 70; i++) {
    const s = 0.8 + rng() * 2.6;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(s),
      new THREE.MeshStandardMaterial({ color: 0x3a4055, roughness: 0.9, metalness: 0.2 })
    );
    const p = randomSpot(rng, 12);
    rock.position.set(p.x, s * 0.5, p.z);
    rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    scene.add(rock);
    asteroids.push(rock);
  }
  for (let i = 0; i < 26; i++) {
    // ilk 6 tanesi başlangıç noktasına yakın olsun — oyuncu hemen toplamaya başlasın
    const p =
      i < 6
        ? { x: Math.cos((i / 6) * Math.PI * 2) * (5 + rng() * 4), z: Math.sin((i / 6) * Math.PI * 2) * (5 + rng() * 4) }
        : randomSpot(rng, 9);
    const mesh = makeCrystal();
    mesh.position.set(p.x, 0.9, p.z);
    scene.add(mesh);
    resources.push({ type: MATERIALS.KRISTAL, mesh, x: p.x, z: p.z, taken: false, respawnT: 0 });
  }
  for (let i = 0; i < 26; i++) {
    const p =
      i < 6
        ? { x: Math.cos((i / 6) * Math.PI * 2 + 0.5) * (5 + rng() * 4), z: Math.sin((i / 6) * Math.PI * 2 + 0.5) * (5 + rng() * 4) }
        : randomSpot(rng, 9);
    const mesh = makeMetal();
    mesh.position.set(p.x, 0.55, p.z);
    scene.add(mesh);
    resources.push({ type: MATERIALS.METAL, mesh, x: p.x, z: p.z, taken: false, respawnT: 0 });
  }
}

// ---------- Canavarlar / yapılar / mermiler ----------
const monsters = [];
const buildings = [];
const bullets = [];

function makeMonsterMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xcc3355, emissive: 0x5a0d1e, emissiveIntensity: 0.7, roughness: 0.6 })
  );
  body.position.y = 0.9;
  g.add(body);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), eyeMat);
    eye.position.set(s * 0.3, 1.1, -0.62);
    g.add(eye);
  }
  for (let i = 0; i < 4; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0x881c30, roughness: 0.7 })
    );
    const a = (i / 4) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.55, 1.55, Math.sin(a) * 0.55);
    g.add(spike);
  }
  return g;
}

function makeBuildingMesh(id) {
  const g = new THREE.Group();
  if (id === "wall") {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(3, 2.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.6, metalness: 0.7 })
    );
    m.position.y = 1.1;
    g.add(m);
  } else if (id === "turret") {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.5, metalness: 0.8 })
    );
    base.position.y = 0.4;
    g.add(base);
    const head = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff9944, emissive: 0x7a3808, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.4 })
    );
    head.add(dome);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.9, roughness: 0.3 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.1, -0.8);
    head.add(barrel);
    head.position.y = 1.2;
    g.add(head);
    g.userData.head = head;
  } else {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x335544, roughness: 0.6, metalness: 0.5 })
    );
    base.position.y = 0.25;
    g.add(base);
    const cross = new THREE.Group();
    const cm = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x1a7a3a, emissiveIntensity: 0.9 });
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.3), cm);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.3), cm);
    cross.add(v, h);
    cross.position.y = 1.3;
    g.add(cross);
    g.userData.cross = cross;
  }
  return g;
}

function spawnMonster(burst = false) {
  const st = monsterStats(state.timeSec, state.easy);
  const a = Math.random() * Math.PI * 2;
  const dist = burst ? 30 + Math.random() * 15 : 45 + Math.random() * 25;
  let x = player.position.x + Math.cos(a) * dist;
  let z = player.position.z + Math.sin(a) * dist;
  const c = arenaClamp(x, z, ARENA_HALF, 10);
  x = c.x; z = c.z;
  const group = makeMonsterMesh();
  group.position.set(x, 0, z);
  scene.add(group);
  monsters.push({ group, x, z, hp: st.hp, maxHp: st.hp, speed: st.speed, attackCd: 0, bobT: Math.random() * 6 });
}

function fireBullet(fromX, fromZ, dirX, dirZ, dmg, color = 0x66ffee) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.position.set(fromX, 0.9, fromZ);
  scene.add(mesh);
  bullets.push({ mesh, vx: dirX * BULLET_SPEED, vz: dirZ * BULLET_SPEED, life: 1.6, dmg });
}

function playerShoot() {
  if (state.shootCd > 0) return;
  state.shootCd = 0.35;
  let dx = state.facing.x;
  let dz = state.facing.z;
  const px = player.position.x;
  const pz = player.position.z;
  const i = pickNearest(monsters, px, pz, SHOOT_RANGE);
  if (i >= 0) {
    dx = monsters[i].x - px;
    dz = monsters[i].z - pz;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
  }
  fireBullet(px + dx * 0.9, pz + dz * 0.9, dx, dz, 5);
  player.rotation.y = Math.atan2(dx, dz);
  sfx.shoot();
}

function placeBuilding(id) {
  const def = BUILDINGS[id];
  if (!def) return;
  const r = tryBuild(state.inv, id);
  if (!r.ok) {
    showToast(`Yetersiz malzeme! ${def.name} için ${def.cost.kristal}◆ kristal, ${def.cost.metal}▲ metal gerek.`);
    sfx.fail();
    return;
  }
  const bx = player.position.x + state.facing.x * 4.5;
  const bz = player.position.z + state.facing.z * 4.5;
  const c = arenaClamp(bx, bz, ARENA_HALF, 6);
  if (pickNearest(buildings, c.x, c.z, 3) >= 0) {
    showToast("Buraya inşa edilemez — başka yapı çok yakın!");
    sfx.fail();
    return;
  }
  state.inv = r.inventory;
  const group = makeBuildingMesh(id);
  group.position.set(c.x, 0, c.z);
  scene.add(group);
  buildings.push({ id, def, group, x: c.x, z: c.z, hp: def.hp, maxHp: def.hp, cd: 0 });
  particles.spawnSparks(c.x, 1, c.z, 0xbb88ff, 14);
  sfx.door();
  showToast(`${def.name} inşa edildi!`);
  updateHud();
}

function removeBuildingAt(i) {
  const b = buildings[i];
  particles.spawnBurst(b.x, 1, b.z, 0xffaa66, 18, 4);
  scene.remove(b.group);
  buildings.splice(i, 1);
  sfx.hit();
}

function killMonsterAt(i) {
  const m = monsters[i];
  particles.spawnBurst(m.x, 1, m.z, 0xff5577, 18, 4.5);
  scene.remove(m.group);
  monsters.splice(i, 1);
  state.kills++;
  sfx.hit();
}

// ---------- Oyun akışı ----------
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* yoksay */
  }
}

function resetGame() {
  for (const m of monsters) scene.remove(m.group);
  for (const b of buildings) scene.remove(b.group);
  for (const b of bullets) scene.remove(b.mesh);
  monsters.length = 0;
  buildings.length = 0;
  bullets.length = 0;
  worldSeed = (Date.now() % 100000) | 0 || 1;
  scatterWorld(worldSeed);
  player.position.set(0, 0.9, 0);
  player.rotation.y = 0;
  state.timeSec = 0;
  state.inv = createInventory();
  state.collected = { kristal: 0, metal: 0 };
  state.kills = 0;
  state.hp = PLAYER_MAX_HP;
  state.invulnT = 0;
  state.shootCd = 0;
  state.facing = { x: 0, z: -1 };
  state.spawnT = 2;
  state.waveShown = 0;
  state.bannerT = 0;
  state.toastT = 0;
  state.buildOpen = false;
  buildMenu.classList.add("hidden");
  waveBanner.classList.add("hidden");
  toastEl.classList.add("hidden");
}

function startGame() {
  state.easy = !!easyModeCb.checked;
  easyBadge.classList.toggle("hidden", !state.easy);
  resetGame();
  state.mode = MODE.PLAY;
  titleScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  uiEl.classList.remove("hidden");
  sfx.ui();
  updateHud();
}

function gameOver() {
  state.mode = MODE.OVER;
  const score = computeScore({
    timeSec: state.timeSec,
    kristal: state.collected.kristal,
    metal: state.collected.metal,
    kills: state.kills,
  });
  const best = loadBest();
  const isRecord = score > best;
  if (isRecord) saveBest(score);
  $("end-time").textContent = fmtTime(state.timeSec);
  $("end-kristal").textContent = String(state.collected.kristal);
  $("end-metal").textContent = String(state.collected.metal);
  $("end-kills").textContent = String(state.kills);
  $("end-score").textContent = String(score);
  $("end-best").textContent = String(Math.max(best, score));
  $("end-record").classList.toggle("hidden", !isRecord);
  uiEl.classList.add("hidden");
  endScreen.classList.remove("hidden");
  sfx.fail();
  setTimeout(() => sfx.win(), 400);
}

function showToast(msg, dur = 2.2) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  state.toastT = dur;
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ---------- Güncellemeler ----------
function updatePlayer(dt) {
  let ix = 0, iz = 0;
  if (keys.has("w")) iz -= 1;
  if (keys.has("s")) iz += 1;
  if (keys.has("a")) ix -= 1;
  if (keys.has("d")) ix += 1;
  // dokunmatik joystick vektörü
  ix += joyVec.x;
  iz += joyVec.z;
  if (ix || iz) {
    const len = Math.hypot(ix, iz) || 1;
    const nx = player.position.x + (ix / len) * PLAYER_SPEED * dt;
    const nz = player.position.z + (iz / len) * PLAYER_SPEED * dt;
    const c = arenaClamp(nx, nz);
    player.position.x = c.x;
    player.position.z = c.z;
    state.facing = { x: ix / len, z: iz / len };
    player.rotation.y = Math.atan2(state.facing.x, state.facing.z);
    // motor alevi: hareket halinde geminin arkasına hafif iz
    state.trailT -= dt;
    if (state.trailT <= 0) {
      state.trailT = 0.07;
      particles.spawnBurst(
        player.position.x - state.facing.x * 0.9,
        0.7,
        player.position.z - state.facing.z * 0.9,
        0x66ffee,
        2,
        1.4
      );
    }
  }
  player.position.y = 0.9 + Math.sin(clock.elapsedTime * 2.4) * 0.08;
  // hasar yanıp sönmesi
  state.invulnT = Math.max(0, state.invulnT - dt);
  player.visible = state.invulnT <= 0 || Math.floor(clock.elapsedTime * 12) % 2 === 0;
}

const _camTarget = new THREE.Vector3();
function updateCamera(dt) {
  _camTarget.set(player.position.x, 0, player.position.z);
  camera.position.lerp(
    new THREE.Vector3(player.position.x, 21, player.position.z + 14),
    0.08
  );
  // hasar sarsıntısı: kısa ve hafif (~0.2 sn)
  if (state.shakeT > 0) {
    state.shakeT -= dt;
    const mag = Math.max(0, state.shakeT) * 2.2;
    camera.position.x += (Math.random() - 0.5) * mag;
    camera.position.y += (Math.random() - 0.5) * mag * 0.5;
    camera.position.z += (Math.random() - 0.5) * mag;
  }
  camera.lookAt(_camTarget);
  playerLight.position.set(player.position.x, 3, player.position.z);
}

function updateResources(dt) {
  for (const r of resources) {
    if (r.taken) {
      r.respawnT -= dt;
      if (r.respawnT <= 0) {
        // yeniden doğma oyuncunun civarında olsun — dünya oyuncuyu beslemeye devam etsin
        const a = Math.random() * Math.PI * 2;
        const d = 18 + Math.random() * 20;
        const c = arenaClamp(
          player.position.x + Math.cos(a) * d,
          player.position.z + Math.sin(a) * d,
          ARENA_HALF, 10
        );
        r.x = c.x; r.z = c.z;
        r.mesh.position.set(c.x, r.mesh.position.y, c.z);
        r.mesh.visible = true;
        r.taken = false;
      }
      continue;
    }
    r.mesh.rotation.y += dt * 1.4;
    r.mesh.position.y = (r.type === MATERIALS.KRISTAL ? 0.9 : 0.55) + Math.sin(clock.elapsedTime * 2 + r.x) * 0.1;
  }
}

function tryPickup() {
  const px = player.position.x;
  const pz = player.position.z;
  let best = -1;
  let bestD = PICKUP_RANGE;
  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    if (r.taken) continue;
    const d = distXZ(r.x, r.z, px, pz);
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best < 0) return false;
  const r = resources[best];
  r.taken = true;
  r.respawnT = 22 + Math.random() * 12;
  r.mesh.visible = false;
  state.inv = addMaterial(state.inv, r.type, 1);
  state.collected[r.type]++;
  particles.spawnBurst(r.x, 1, r.z, r.type === MATERIALS.KRISTAL ? 0xbb66ff : 0xff9944, 12, 3);
  sfx.pickup();
  updateHud();
  return true;
}

function nearestResourceDist() {
  const px = player.position.x;
  const pz = player.position.z;
  let best = null;
  let bestD = PICKUP_RANGE;
  for (const r of resources) {
    if (r.taken) continue;
    const d = distXZ(r.x, r.z, px, pz);
    if (d < bestD) { bestD = d; best = r; }
  }
  return best;
}

function updateSpawning(dt) {
  // dalga kontrolü
  const wn = waveNumber(state.timeSec);
  if (wn > state.waveShown) {
    state.waveShown = wn;
    state.bannerT = 3;
    waveBanner.classList.remove("hidden");
    sfx.fail();
    const burst = waveBurstCount(state.timeSec);
    for (let i = 0; i < burst; i++) spawnMonster(true);
  }
  if (state.bannerT > 0) {
    state.bannerT -= dt;
    if (state.bannerT <= 0) waveBanner.classList.add("hidden");
  }
  // sürekli spawn
  state.spawnT -= dt;
  if (state.spawnT <= 0 && monsters.length < maxMonsters(state.timeSec, state.easy)) {
    spawnMonster();
    state.spawnT = spawnInterval(state.timeSec, state.easy);
  }
}

function updateMonsters(dt) {
  const px = player.position.x;
  const pz = player.position.z;
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    m.attackCd = Math.max(0, m.attackCd - dt);
    m.bobT += dt;
    // hedef: oyuncu mu, yapı mı?
    const pd = distXZ(m.x, m.z, px, pz);
    const bi = pickNearest(buildings, m.x, m.z);
    const bd = bi >= 0 ? distXZ(m.x, m.z, buildings[bi].x, buildings[bi].z) : Infinity;
    // kaçmak işe yarasın: oyuncudan çok uzaklaşan ve yapıya da uzak canavar pes eder
    if (pd > 95 && bd > 25) {
      scene.remove(m.group);
      monsters.splice(i, 1);
      continue;
    }
    let tx = px, tz = pz, targetPlayer = true;
    if (bi >= 0 && bd < pd - 4) {
      tx = buildings[bi].x; tz = buildings[bi].z; targetPlayer = false;
    }
    const dx = tx - m.x;
    const dz = tz - m.z;
    const len = Math.hypot(dx, dz) || 1;
    const attackRange = targetPlayer ? MONSTER_ATTACK_RANGE : BUILD_ATTACK_RANGE;
    if (len > attackRange) {
      m.x += (dx / len) * m.speed * dt;
      m.z += (dz / len) * m.speed * dt;
    } else if (m.attackCd <= 0) {
      m.attackCd = 1.0;
      if (targetPlayer) {
        if (state.invulnT <= 0) {
          state.hp = applyPlayerDamage(state.hp, HEART_HP);
          state.invulnT = 1.5;
          state.shakeT = 0.22;
          particles.spawnSparks(px, 1, pz, 0xff3355, 12);
          sfx.hit();
          updateHud();
          if (state.hp <= 0) { gameOver(); return; }
        }
      } else {
        buildings[bi].hp -= 10;
        particles.spawnSparks(buildings[bi].x, 1.2, buildings[bi].z, 0xffaa66, 8);
        if (buildings[bi].hp <= 0) removeBuildingAt(bi);
      }
    }
    m.group.position.set(m.x, Math.sin(m.bobT * 3) * 0.12, m.z);
    m.group.rotation.y = Math.atan2(dx, dz);
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.mesh.position.x += b.vx * dt;
    b.mesh.position.z += b.vz * dt;
    let dead = b.life <= 0;
    if (!dead) {
      const bx = b.mesh.position.x;
      const bz = b.mesh.position.z;
      const mi = pickNearest(monsters, bx, bz, 1.4);
      if (mi >= 0) {
        const m = monsters[mi];
        m.hp -= b.dmg;
        particles.spawnSparks(bx, 1, bz, 0xffee66, 6);
        if (m.hp <= 0) killMonsterAt(mi);
        else sfx.hit();
        dead = true;
      }
    }
    if (dead) {
      scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
      bullets.splice(i, 1);
    }
  }
}

function updateBuildings(dt) {
  for (const b of buildings) {
    if (b.id === "turret") {
      b.cd = Math.max(0, b.cd - dt);
      const mi = pickNearest(monsters, b.x, b.z, b.def.range);
      if (mi >= 0) {
        const m = monsters[mi];
        if (b.group.userData.head) {
          b.group.userData.head.rotation.y = Math.atan2(m.x - b.x, m.z - b.z);
        }
        if (b.cd <= 0) {
          b.cd = b.def.fireInterval;
          const dx = m.x - b.x;
          const dz = m.z - b.z;
          const len = Math.hypot(dx, dz) || 1;
          fireBullet(b.x, b.z, dx / len, dz / len, b.def.damage, 0xffaa44);
          sfx.shoot();
        }
      }
    } else if (b.id === "heal") {
      if (b.group.userData.cross) b.group.userData.cross.rotation.y += dt * 1.5;
      if (distXZ(player.position.x, player.position.z, b.x, b.z) < b.def.radius) {
        const before = state.hp;
        state.hp = healTick(state.hp, dt, b.def.healPerSec);
        if (state.hp > before) {
          state.healFxT -= dt;
          if (state.healFxT <= 0) {
            state.healFxT = 0.5;
            particles.spawnBurst(player.position.x, 1.2, player.position.z, 0x44ff88, 5, 2);
            updateHud();
          }
        }
      }
    }
  }
}

function updateHud() {
  const hearts = heartsFromHp(state.hp);
  heartsHud.textContent = "❤".repeat(hearts) + "🖤".repeat(Math.max(0, 3 - hearts));
  timeText.textContent = fmtTime(state.timeSec);
  scoreText.textContent = String(computeScore({
    timeSec: state.timeSec,
    kristal: state.collected.kristal,
    metal: state.collected.metal,
    kills: state.kills,
  }));
  dangerText.textContent = String(dangerLevel(state.timeSec));
  matCrystalEl.textContent = String(state.inv.kristal);
  matMetalEl.textContent = String(state.inv.metal);
  for (const id of BUILD_ORDER) {
    const row = $(`build-row-${id}`);
    if (row) row.classList.toggle("cant", !canAfford(state.inv, BUILDINGS[id].cost));
  }
}

function updateMinimap() {
  const px = player.position.x;
  const pz = player.position.z;
  const markers = [];
  for (const r of resources) {
    if (r.taken) continue;
    if (distXZ(r.x, r.z, px, pz) > 90) continue;
    markers.push({ x: r.x, z: r.z, r: 2.5, color: r.type === MATERIALS.KRISTAL ? "#c080ff" : "#ffb050" });
  }
  for (const b of buildings) markers.push({ x: b.x, z: b.z, r: 3, color: "#66ffcc" });
  for (const m of monsters) markers.push({ x: m.x, z: m.z, r: 3, color: "#ff5566" });
  drawMinimap(minimapCanvas, MAP_BOUNDS, worldToMinimap, { x: px, z: pz }, markers);
}

function updatePrompt() {
  const near = nearestResourceDist();
  if (near) {
    const label = near.type === MATERIALS.KRISTAL ? "KRİSTAL TOPLA ◆" : "METAL TOPLA ▲";
    promptEl.textContent = isTouch ? label : `E · ${label}`;
    promptEl.classList.remove("hidden");
  } else {
    promptEl.classList.add("hidden");
  }
}

function updatePlay(dt) {
  state.timeSec += dt;
  updatePlayer(dt);
  updateCamera(dt);
  state.shootCd = Math.max(0, state.shootCd - dt);
  if (state.mouseFire || state.touchFire) playerShoot();
  updateSpawning(dt);
  updateMonsters(dt);
  if (state.mode !== MODE.PLAY) return; // gameOver tetiklenmiş olabilir
  updateBullets(dt);
  updateBuildings(dt);
  updateResources(dt);
  updatePrompt();
  if (state.toastT > 0) {
    state.toastT -= dt;
    if (state.toastT <= 0) toastEl.classList.add("hidden");
  }
  state.hudT -= dt;
  if (state.hudT <= 0) {
    state.hudT = 0.25;
    updateHud();
    updateMinimap();
  }
}

// ---------- Girdi ----------
function toggleBuildMenu() {
  state.buildOpen = !state.buildOpen;
  buildMenu.classList.toggle("hidden", !state.buildOpen);
  sfx.click();
}

addEventListener("keydown", (e) => {
  const k = e.key === " " ? " " : e.key.toLowerCase();
  if (state.mode === MODE.PLAY) {
    if (k === " ") e.preventDefault();
    keys.add(k);
    if (k === "e") tryPickup();
    if (k === "b") toggleBuildMenu();
    if (k === "1") placeBuilding("wall");
    if (k === "2") placeBuilding("turret");
    if (k === "3") placeBuilding("heal");
  } else if (state.mode === MODE.TITLE && (k === "enter" || k === " ")) {
    startGame();
  } else if (state.mode === MODE.OVER && k === "enter") {
    startGame();
  }
});
addEventListener("keyup", (e) => {
  keys.delete(e.key === " " ? " " : e.key.toLowerCase());
});
addEventListener("blur", () => keys.clear());

// Ateş: fare SAĞ TIK (basılı tutunca sürekli ateş)
addEventListener("contextmenu", (e) => {
  if (state.mode === MODE.PLAY) e.preventDefault();
});
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 2 && state.mode === MODE.PLAY) state.mouseFire = true;
});
addEventListener("mouseup", (e) => {
  if (e.button === 2) state.mouseFire = false;
});

// İnşa menüsü satırları tıklanabilir/dokunulabilir — mobilde 1-2-3 tuşu yok
for (const id of BUILD_ORDER) {
  const row = $(`build-row-${id}`);
  if (row) {
    row.addEventListener("click", () => {
      if (state.mode === MODE.PLAY) placeBuilding(id);
    });
  }
}

// ---------- Dokunmatik kontroller (mobil) ----------
const joyVec = { x: 0, z: 0 };
const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
if (isTouch) {
  document.body.classList.add("touch");
  const buildLab = document.querySelector("#build-menu .lab");
  if (buildLab) buildLab.textContent = "İNŞA MENÜSÜ (İNŞA düğmesi ile kapat)";
  const joyZone = $("joy-zone");
  const joyBase = $("joy-base");
  const joyKnob = $("joy-knob");
  const btnFire = $("btn-fire");
  const JOY_R = 48;
  let joyId = null;
  let joyOX = 0;
  let joyOY = 0;

  function joyShow(x, y) {
    joyBase.style.left = `${x - 60}px`;
    joyBase.style.top = `${y - 60}px`;
    joyBase.classList.remove("hidden");
    joyKnob.style.left = `${x - 24}px`;
    joyKnob.style.top = `${y - 24}px`;
    joyKnob.classList.remove("hidden");
  }
  function joyHide() {
    joyBase.classList.add("hidden");
    joyKnob.classList.add("hidden");
    joyVec.x = 0;
    joyVec.z = 0;
  }
  function joyMove(t) {
    let dx = t.clientX - joyOX;
    let dy = t.clientY - joyOY;
    const len = Math.hypot(dx, dy);
    if (len > JOY_R) {
      dx = (dx / len) * JOY_R;
      dy = (dy / len) * JOY_R;
    }
    joyKnob.style.left = `${joyOX + dx - 24}px`;
    joyKnob.style.top = `${joyOY + dy - 24}px`;
    // ekran aşağı = +z (S yönü), ekran sağ = +x (D yönü)
    joyVec.x = dx / JOY_R;
    joyVec.z = dy / JOY_R;
  }

  joyZone.addEventListener("touchstart", (e) => {
    if (state.mode !== MODE.PLAY) return;
    e.preventDefault();
    if (joyId !== null) return;
    const t = e.changedTouches[0];
    joyId = t.identifier;
    joyOX = t.clientX;
    joyOY = t.clientY;
    joyShow(joyOX, joyOY);
  }, { passive: false });
  addEventListener("touchmove", (e) => {
    if (joyId === null) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) joyMove(t);
    }
  }, { passive: false });
  addEventListener("touchend", (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        joyId = null;
        joyHide();
      }
    }
  });
  addEventListener("touchcancel", () => {
    joyId = null;
    joyHide();
  });

  // ATEŞ düğmesi: basılı tutunca sürekli ateş
  btnFire.addEventListener("touchstart", (e) => {
    if (state.mode !== MODE.PLAY) return;
    e.preventDefault();
    state.touchFire = true;
  }, { passive: false });
  btnFire.addEventListener("touchend", (e) => {
    e.preventDefault();
    state.touchFire = false;
  }, { passive: false });
  btnFire.addEventListener("touchcancel", () => {
    state.touchFire = false;
  });
  // TOPLA / İNŞA düğmeleri: dokun = bir kez tetikle
  $("btn-e").addEventListener("touchstart", (e) => {
    if (state.mode !== MODE.PLAY) return;
    e.preventDefault();
    tryPickup();
  }, { passive: false });
  $("btn-b").addEventListener("touchstart", (e) => {
    if (state.mode !== MODE.PLAY) return;
    e.preventDefault();
    toggleBuildMenu();
  }, { passive: false });
}

$("btn-start").addEventListener("click", startGame);
$("btn-restart").addEventListener("click", startGame);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Başlangıç ----------
{
  const best = loadBest();
  if (best > 0) {
    titleBestVal.textContent = String(best);
    titleBest.classList.remove("hidden");
  }
}
scatterWorld(20260727);

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === MODE.PLAY) {
    updatePlay(dt);
  } else {
    // başlık / bitiş ekranında sakin arka plan dönüşü
    camera.position.x = Math.sin(clock.elapsedTime * 0.08) * 40;
    camera.position.z = Math.cos(clock.elapsedTime * 0.08) * 40;
    camera.position.y = 24;
    camera.lookAt(0, 0, 0);
    for (const r of resources) {
      if (!r.taken) r.mesh.rotation.y += dt * 0.8;
    }
  }
  particles.update(dt);
  renderer.render(scene, camera);
}
tick();
