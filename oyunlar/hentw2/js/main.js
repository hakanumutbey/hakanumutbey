/**
 * HENTW 2 — KRYNN (senaryo tam demo)
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
  distXZ,
  canInteract,
  POS,
  createFighter,
  applyDamage,
  allDead,
  SAVE_KEY,
  encodeSave,
  decodeSave,
  easyEnemyHpMult,
  easyDamageTakenMult,
  easyPlayerDamageMult,
  createCollectibles,
  collectItem,
  collectibleProgress,
  worldToMinimap,
} from "./gameLogic.js";
import { createAudioBus, createParticleSystem, drawMinimap } from "./seriesFeatures.js";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const titleScreen = $("title-screen");
const uiEl = $("ui");
const questTextEl = $("quest-text");
const invList = $("inv-list");
const promptEl = $("prompt");
const dialogueEl = $("dialogue");
const dSpeaker = $("d-speaker");
const dText = $("d-text");
const choicesEl = $("choices");
const toastEl = $("toast");
const wakeOverlay = $("wake-overlay");
const storyOverlay = $("story-overlay");
const storyText = $("story-text");
const endScreen = $("end-screen");
const hurtVig = $("hurt-vignette");
const combatHud = $("combat-hud");
const hpText = $("hp-text");
const hpBar = $("hp-bar");
const enemyCountEl = $("enemy-count");
const easyModeCb = $("easy-mode");
const btnContinue = $("btn-continue");
const collectCountEl = $("collect-count");
const minimapCanvas = $("minimap-canvas");
const easyBadge = $("easy-badge");
const sfx = createAudioBus();

const MODE = { TITLE: "title", WAKE: "wake", PLAY: "play", CUT: "cut", END: "end" };
const R = 2.3;
const SPEED = 5.5;
const SHOOT_RANGE = 22;
const keys = new Set();

const state = {
  mode: MODE.TITLE,
  quest: QUEST.WAKE,
  friend: null, // true | false | null
  hasCard: false,
  robotAwake: false,
  robotFollow: false,
  hasCrystal1: false,
  hasCrystal2: false,
  zixFreed: false,
  dialogueOpen: false,
  dialogueQueue: [],
  dialogueAfter: null,
  toastT: 0,
  pointer: false,
  wakeT: 0,
  cutT: 0,
  cutKind: "",
  planet: "krynn", // krynn | lumina
  hurt: 0,
  playerHp: 100,
  playerMaxHp: 100,
  shootCd: 0,
  hitCd: 0,
  combat: false,
  canShoot: false, // robot uyandıktan sonra
  easyMode: false,
  collectibles: createCollectibles(["star1", "star2", "star3"]),
  collectedCount: 0,
  saveLoaded: false,
};

const MAP_BOUNDS = { minX: -30, maxX: 32, minZ: -30, maxZ: 40 };
const STAR_SPOTS = [
  { id: "star1", x: 4, z: 8 },
  { id: "star2", x: 12, z: 18 },
  { id: "star3", x: 20, z: 28 },
];

/** @type {{ mesh: THREE.Group, fighter: {hp,maxHp,alive}, speed: number }[]} */
const enemies = [];
const bullets = [];

// ----- three -----
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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 200);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// Hafif bloom (donma riski düşük)
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.4, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x88ffaa, 0x1a1008, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xddffcc, 1.15);
sun.position.set(12, 18, 8);
scene.add(sun);
const FX = createParticleSystem(THREE, scene);

function setPlanetTheme(name) {
  state.planet = name;
  if (name === "krynn") {
    scene.background = new THREE.Color(0x0c2218);
    scene.fog = new THREE.FogExp2(0x123020, 0.014);
    hemi.color.setHex(0xa8ffcc);
    hemi.intensity = 0.95;
    sun.color.setHex(0xeeffdd);
    sun.intensity = 1.35;
  } else {
    scene.background = new THREE.Color(0x181028);
    scene.fog = new THREE.FogExp2(0x221438, 0.012);
    hemi.color.setHex(0xddaaff);
    hemi.intensity = 0.95;
    sun.color.setHex(0xffccee);
    sun.intensity = 1.3;
  }
}
setPlanetTheme("krynn");

// ground + props
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(90, 64),
  new THREE.MeshStandardMaterial({ color: 0x1a3a28, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
scene.add(new THREE.GridHelper(50, 25, 0x2a6040, 0x1a4028));

for (let i = 0; i < 16; i++) {
  const ang = (i / 16) * Math.PI * 2;
  const dist = 20 + (i % 4) * 5;
  const h = 4 + (i % 3) * 2;
  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(3.5, h, 6),
    new THREE.MeshStandardMaterial({ color: 0x245038, flatShading: true })
  );
  hill.position.set(Math.cos(ang) * dist, h * 0.35, Math.sin(ang) * dist);
  scene.add(hill);
}

function markerRing(color, emissive) {
  const r = new THREE.Mesh(
    new THREE.TorusGeometry(0.65, 0.045, 8, 28),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1.4 })
  );
  r.rotation.x = Math.PI / 2;
  r.position.y = 0.05;
  return r;
}

// Rocket wreck
const rocket = new THREE.Group();
rocket.position.set(-1.5, 0, -2.5);
{
  const b = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 2.6, 10),
    new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.7 })
  );
  b.position.set(0, 0.9, 0);
  b.rotation.set(0.35, 0, 0.95);
  b.castShadow = true;
  rocket.add(b);
}
scene.add(rocket);

// Empty JOLE
const emptyJole = new THREE.Group();
emptyJole.position.set(POS.emptyJole.x, 0, POS.emptyJole.z);
{
  const c = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x884466, metalness: 0.3, roughness: 0.7 })
  );
  c.position.y = 0.2;
  c.rotation.z = 1.2;
  emptyJole.add(c);
  emptyJole.add(markerRing(0xaa6688, 0x662244));
}
scene.add(emptyJole);

// Broken tablet
const tablet = new THREE.Group();
tablet.position.set(POS.tablet.x, 0, POS.tablet.z);
{
  const p = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.06, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x222830, metalness: 0.6 })
  );
  p.position.y = 0.05;
  p.rotation.y = 0.4;
  tablet.add(p);
  const crack = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.02, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x88ccff })
  );
  crack.position.set(0, 0.09, 0);
  crack.rotation.z = 0.5;
  tablet.add(crack);
  tablet.add(markerRing(0x6688aa, 0x224466));
}
scene.add(tablet);

// Sleep robot
const sleepRobot = new THREE.Group();
sleepRobot.position.set(POS.robot.x, 0, POS.robot.z);
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a96a8, metalness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.45), mat);
  torso.position.set(0.1, 0.7, 0);
  torso.rotation.z = 0.9;
  sleepRobot.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.36), mat);
  head.position.set(0.45, 1.15, 0);
  sleepRobot.add(head);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x111111 })
  );
  eye.position.set(0.55, 1.18, 0.15);
  sleepRobot.add(eye);
  sleepRobot.userData.eye = eye;
  sleepRobot.add(markerRing(0xb07cff, 0x6030aa));
}
scene.add(sleepRobot);

// Enemy robot (castle)
const enemyBot = new THREE.Group();
enemyBot.position.set(POS.castleGate.x - 1, 0, POS.castleGate.z - 1);
enemyBot.visible = false;
{
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a1020,
    emissive: 0x880000,
    emissiveIntensity: 0.6,
  });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.1, 6, 10), mat);
  b.position.y = 1.2;
  enemyBot.add(b);
  enemyBot.add(new THREE.PointLight(0xff2200, 1.2, 8));
}
scene.add(enemyBot);

// Castle
const castle = new THREE.Group();
castle.position.set(POS.castleGate.x, 0, POS.castleGate.z + 4);
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a2030, metalness: 0.4, roughness: 0.6 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 1.2), mat);
  wall.position.y = 3;
  castle.add(wall);
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 9, 2.5), mat);
  t1.position.set(-6, 4.5, 0);
  castle.add(t1);
  const t2 = t1.clone();
  t2.position.x = 6;
  castle.add(t2);
  const gate = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 4, 0.4),
    new THREE.MeshStandardMaterial({
      color: 0x881122,
      emissive: 0x440000,
      emissiveIntensity: 0.8,
    })
  );
  gate.position.set(0, 2, 0.8);
  castle.add(gate);
  castle.add(new THREE.PointLight(0xff3344, 1.5, 16));
}
scene.add(castle);

// ZIX cage
const zixCage = new THREE.Group();
zixCage.position.set(POS.zixCage.x, 0, POS.zixCage.z);
{
  const bars = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.7 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), bars);
    bar.position.set(Math.cos(a) * 1.1, 1.2, Math.sin(a) * 1.1);
    zixCage.add(bar);
  }
  const top = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 8, 20), bars);
  top.rotation.x = Math.PI / 2;
  top.position.y = 2.4;
  zixCage.add(top);
  // ZIX inside
  const zix = new THREE.Group();
  const zm = new THREE.MeshStandardMaterial({
    color: 0x44dd66,
    emissive: 0x118833,
    emissiveIntensity: 0.4,
  });
  const zb = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 8), zm);
  zb.position.y = 0.85;
  zix.add(zb);
  const zh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), zm);
  zh.position.y = 1.5;
  zix.add(zh);
  zixCage.add(zix);
  zixCage.userData.zix = zix;
  zixCage.add(markerRing(0x66ffaa, 0x33cc88));
}
scene.add(zixCage);

// Crystal 1 KRYNN
const crystal1 = new THREE.Group();
crystal1.position.set(POS.crystal1.x, 0, POS.crystal1.z);
{
  const c = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({
      color: 0x66ffcc,
      emissive: 0x22aa88,
      emissiveIntensity: 1.6,
    })
  );
  c.position.y = 1.1;
  crystal1.add(c);
  crystal1.userData.mesh = c;
  crystal1.add(new THREE.PointLight(0x66ffcc, 2, 12));
  crystal1.add(markerRing(0x66ffcc, 0x22aa88));
}
scene.add(crystal1);

// Portal
const portal = new THREE.Group();
portal.position.set(POS.portal.x, 0, POS.portal.z);
{
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.12, 12, 40),
    new THREE.MeshStandardMaterial({
      color: 0x8866ff,
      emissive: 0x5533cc,
      emissiveIntensity: 1.5,
    })
  );
  ring.position.y = 1.8;
  portal.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 32),
    new THREE.MeshBasicMaterial({
      color: 0xaa88ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
  );
  disc.position.y = 1.8;
  portal.add(disc);
  portal.userData.disc = disc;
  portal.add(new THREE.PointLight(0xaa66ff, 2, 14));
}
scene.add(portal);

// LUMINA props (hidden until planet2)
const crystal2 = new THREE.Group();
crystal2.position.set(POS.crystal2.x, 0, POS.crystal2.z);
crystal2.visible = false;
{
  const c = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.75, 0),
    new THREE.MeshStandardMaterial({
      color: 0xff88dd,
      emissive: 0xaa2288,
      emissiveIntensity: 1.8,
    })
  );
  c.position.y = 1.2;
  crystal2.add(c);
  crystal2.userData.mesh = c;
  crystal2.add(new THREE.PointLight(0xff66cc, 2.5, 14));
  crystal2.add(markerRing(0xff88cc, 0xaa2266));
}
scene.add(crystal2);

const homePortal = new THREE.Group();
homePortal.position.set(POS.homePortal.x, 0, POS.homePortal.z);
homePortal.visible = false;
{
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.14, 12, 40),
    new THREE.MeshStandardMaterial({
      color: 0x66aaff,
      emissive: 0x2266cc,
      emissiveIntensity: 1.6,
    })
  );
  ring.position.y = 1.9;
  homePortal.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  disc.position.y = 1.9;
  homePortal.add(disc);
  homePortal.add(new THREE.PointLight(0x66aaff, 2.5, 14));
}
scene.add(homePortal);

// Player
const player = new THREE.Group();
player.position.set(0, 0, 2);
const bodyRoot = new THREE.Group();
player.add(bodyRoot);
{
  const suit = new THREE.MeshStandardMaterial({ color: 0xe8eef0, metalness: 0.35 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 6, 12), suit);
  body.position.y = 0.85;
  body.castShadow = true;
  bodyRoot.add(body);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), suit);
  helm.position.y = 1.5;
  bodyRoot.add(helm);
  bodyRoot.rotation.x = -Math.PI / 2 + 0.15;
  bodyRoot.position.y = 0.28;
}
scene.add(player);

// Companion robot (follows when friend)
const companion = new THREE.Group();
companion.visible = false;
{
  const mat = new THREE.MeshStandardMaterial({ color: 0x9aa8ba, metalness: 0.65 });
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.4), mat);
  t.position.y = 0.9;
  companion.add(t);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.32), mat);
  h.position.y = 1.45;
  companion.add(h);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0x5ee7ff,
      emissive: 0x1188aa,
      emissiveIntensity: 1.5,
    })
  );
  eye.position.set(0, 1.45, 0.18);
  companion.add(eye);
}
scene.add(companion);

/** KRAXX / LUMINA savaşçısı uzaylı */
function makeFoe(x, z, color = 0x33aa44, hp = 35) {
  hp = Math.max(8, Math.round(hp * easyEnemyHpMult(state.easyMode)));
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    metalness: 0.35,
    roughness: 0.45,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 5, 10), mat);
  body.position.y = 0.95;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), mat);
  head.position.y = 1.7;
  g.add(head);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.5,
    })
  );
  eye.position.set(0, 1.75, 0.28);
  g.add(eye);
  // silah kolu
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
  );
  arm.position.set(0.35, 1.05, 0.25);
  g.add(arm);
  scene.add(g);
  return {
    mesh: g,
    fighter: createFighter(hp),
    speed: 2.4 + Math.random() * 0.8,
    body,
  };
}

function clearEnemies() {
  for (const e of enemies) scene.remove(e.mesh);
  enemies.length = 0;
  for (const b of bullets) scene.remove(b.mesh);
  bullets.length = 0;
}

function spawnPatrol() {
  clearEnemies();
  const c = POS.patrolCenter;
  const spots = [
    [c.x - 3, c.z],
    [c.x + 2, c.z + 2],
    [c.x, c.z - 2.5],
    [c.x + 3.5, c.z + 1],
  ];
  for (const [x, z] of spots) {
    enemies.push(makeFoe(x, z, 0x2a8844, 32));
  }
  state.combat = true;
  state.canShoot = true;
  updateCombatHud();
  toast("KRAXX devriyesi! Sol tık ile ateş et!", 3.5);
}

function spawnGuards() {
  clearEnemies();
  const spots = [
    [POS.crystal1.x - 2, POS.crystal1.z - 1],
    [POS.crystal1.x + 1.5, POS.crystal1.z - 2],
    [POS.zixCage.x + 2, POS.zixCage.z + 1],
  ];
  for (const [x, z] of spots) {
    enemies.push(makeFoe(x, z, 0x884422, 40));
  }
  state.combat = true;
  updateCombatHud();
  toast("Kale muhafızları!", 2.5);
}

function spawnLuminaFoes() {
  clearEnemies();
  const spots = [
    [2, 4],
    [-2, 5],
    [1, 7],
  ];
  for (const [x, z] of spots) {
    enemies.push(makeFoe(x, z, 0xaa44cc, 38));
  }
  state.combat = true;
  updateCombatHud();
  toast("LUMINA muhafızları!", 2.5);
}

function updateCombatHud() {
  if (!combatHud) return;
  const alive = enemies.filter((e) => e.fighter.alive).length;
  if (state.combat && alive > 0) {
    combatHud.classList.remove("hidden");
  } else if (!state.combat) {
    combatHud.classList.add("hidden");
  } else {
    combatHud.classList.add("hidden");
  }
  if (hpText) hpText.textContent = String(Math.ceil(state.playerHp));
  if (hpBar)
    hpBar.style.width = `${Math.max(0, (state.playerHp / state.playerMaxHp) * 100)}%`;
  if (enemyCountEl) enemyCountEl.textContent = String(alive);
}

function tryShoot() {
  if (state.mode !== MODE.PLAY || state.dialogueOpen) return;
  if (!choicesEl.classList.contains("hidden")) return;
  if (state.shootCd > 0) return;
  const fighting =
    state.quest === QUEST.FIGHT_PATROL ||
    state.quest === QUEST.FIGHT_GUARDS ||
    state.quest === QUEST.FIGHT_LUMINA;
  if (!fighting) return;
  state.shootCd = 0.22;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();
  const origin = player.position.clone().add(new THREE.Vector3(0, 1.15, 0));
  const bolt = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x66ffcc })
  );
  bolt.position.copy(origin);
  scene.add(bolt);
  bullets.push({ mesh: bolt, dir: dir.clone(), life: 1.1, speed: 36 });
  sfx.shoot();
  FX.spawnBurst(origin.x, origin.y, origin.z, 0x88ffdd, 6, 2);

  // hit scan enemies
  for (const e of enemies) {
    if (!e.fighter.alive) continue;
    const toE = e.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)).sub(origin);
    const dist = toE.length();
    if (dist < SHOOT_RANGE && dir.dot(toE.normalize()) > 0.55) {
      e.fighter = applyDamage(e.fighter, Math.round(14 * easyPlayerDamageMult(state.easyMode)));
      e.body.material.emissiveIntensity = 1.2;
      sfx.hit();
      FX.spawnBurst(e.mesh.position.x, 1.2, e.mesh.position.z, 0x66ff88, 10, 3);
      if (e.fighter.justDied || !e.fighter.alive) {
        FX.spawnBurst(e.mesh.position.x, 1.4, e.mesh.position.z, 0xffaa44, 16, 4);
        e.mesh.visible = false;
        e.fighter.alive = false;
      }
    }
  }
  checkWaveClear();
  updateCombatHud();
}

function checkWaveClear() {
  if (!enemies.length) return;
  if (!allDead(enemies.map((e) => e.fighter))) return;
  state.combat = false;
  updateCombatHud();
  FX.spawnBurst(player.position.x, 1.5, player.position.z, 0xffcc44, 18, 3.5);
  sfx.win();
  if (state.quest === QUEST.FIGHT_PATROL) {
    story("Devriye düştü.\nKale ışıkları yaklaşıyor…", 2.2);
    toast("Devriye temizlendi! Kaleye ilerle", 3);
    applyEvent("patrol_won");
  } else if (state.quest === QUEST.FIGHT_GUARDS) {
    story("Muhafızlar devrildi.\nKristal odası açık.", 2.2);
    toast("Muhafızlar yenildi! Kristali al", 3);
    applyEvent("guards_won");
  } else if (state.quest === QUEST.FIGHT_LUMINA) {
    story("LUMINA sessizleşti.\nKristali al.", 2.2);
    toast("Yol açık! LUMINA Kristali", 3);
    applyEvent("lumina_won");
  }
}

function updateEnemies(dt) {
  if (!state.combat) return;
  state.hitCd = Math.max(0, state.hitCd - dt);
  for (const e of enemies) {
    if (!e.fighter.alive) continue;
    const dx = player.position.x - e.mesh.position.x;
    const dz = player.position.z - e.mesh.position.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > 1.3) {
      e.mesh.position.x += (dx / d) * e.speed * dt;
      e.mesh.position.z += (dz / d) * e.speed * dt;
    }
    e.mesh.lookAt(player.position.x, 1, player.position.z);
    e.body.material.emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 5) * 0.15;
    // melee
    if (d < 1.5 && state.hitCd <= 0 && state.mode === MODE.PLAY) {
      state.playerHp = Math.max(0, state.playerHp - Math.round(8 * easyDamageTakenMult(state.easyMode)));
      state.hitCd = 0.7;
      hurtVig.classList.remove("hidden");
      setTimeout(() => hurtVig.classList.add("hidden"), 200);
      updateCombatHud();
      if (state.playerHp <= 0) {
        state.playerHp = state.playerMaxHp * 0.5;
        player.position.set(0, 0, 2);
        toast("Yaralandın! Roket yanına ışınlandın…", 3);
        // if in combat keep fighting
      }
    }
  }
  // bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.mesh.position.addScaledVector(b.dir, b.speed * dt);
    if (b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }
}

const camOrbit = {
  yaw: 0.25,
  pitch: 0.32,
  distance: 5.3,
  minPitch: -0.1,
  maxPitch: 0.85,
  sensitivity: 0.002,
};


// --- series: stars, save, minimap ---
const starMeshes = {};
function makeStarMesh(id, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffdd66, emissive: 0xffaa22, emissiveIntensity: 1.8, metalness: 0.4, roughness: 0.35,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat);
  core.position.y = 1.1;
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
    localStorage.setItem(SAVE_KEY, encodeSave({
      quest: state.quest,
      easyMode: state.easyMode,
      collectibles: state.collectibles,
      collectedCount: state.collectedCount,
      playerHp: state.playerHp,
      extra: {
        px: player.position.x, pz: player.position.z,
        friend: state.friend, hasCard: state.hasCard, robotAwake: state.robotAwake,
        hasCrystal1: state.hasCrystal1, hasCrystal2: state.hasCrystal2,
        planet: state.planet, canShoot: state.canShoot, robotFollow: state.robotFollow,
      },
    }));
  } catch (e) { console.warn(e); }
}
function tryLoadSave() {
  try { return decodeSave(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}
function updateMinimapHud() {
  if (!minimapCanvas) return;
  const markers = [{ x: POS.castleGate.x, z: POS.castleGate.z, color: "#ff6688", r: 5 }];
  if (state.planet === "lumina") markers[0] = { x: POS.crystal2.x, z: POS.crystal2.z, color: "#cc88ff", r: 5 };
  for (const c of state.collectibles) {
    if (!c.taken) {
      const spot = STAR_SPOTS.find((s) => s.id === c.id);
      if (spot) markers.push({ x: spot.x, z: spot.z, color: "#ffdd66", r: 3 });
    }
  }
  drawMinimap(minimapCanvas, MAP_BOUNDS, worldToMinimap, { x: player.position.x, z: player.position.z }, markers);
}
function tryCollectStars() {
  if (state.mode !== MODE.PLAY || state.dialogueOpen) return;
  for (const spot of STAR_SPOTS) {
    const c = state.collectibles.find((x) => x.id === spot.id);
    if (!c || c.taken) continue;
    if (distXZ(player.position.x, player.position.z, spot.x, spot.z) < 1.7) {
      state.collectibles = collectItem(state.collectibles, spot.id);
      FX.spawnBurst(spot.x, 1.1, spot.z, 0xffdd66, 14, 3);
      sfx.pickup();
      refreshCollectHud();
      const pr = collectibleProgress(state.collectibles);
      toast(pr.complete ? "Tüm yıldızlar! ★★★" : `Yıldız ${pr.got}/3`, 2);
      persistSave();
    }
  }
}


// ----- UI helpers -----
function setQuest(q) {
  state.quest = q;
  questTextEl.textContent = QUEST_LABELS[q] || q;
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
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  state.toastT = d;
}

function inv() {
  const a = [];
  if (state.hasCard) a.push("💾 Kart");
  if (state.robotAwake) a.push(state.friend ? "🤖 Robot (dost)" : "🤖 Robot (?)");
  if (tabletBroken) a.push("📱❌ Kırık tablet");
  if (state.hasCrystal1) a.push("💎 KRYNN Kristali");
  if (state.hasCrystal2) a.push("💎 LUMINA Kristali");
  invList.textContent = a.length ? a.join(" · ") : "—";
}
let tabletBroken = false;
let sawEmptyJole = false;

function story(msg, sec = 3) {
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
}

function closeDialogue() {
  state.dialogueOpen = false;
  dialogueEl.classList.add("hidden");
  const cb = state.dialogueAfter;
  state.dialogueAfter = null;
  if (cb) cb();
}

function showChoices() {
  choicesEl.classList.remove("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
}

function hideChoices() {
  choicesEl.classList.add("hidden");
}

function onQuest(q) {
  if (q === QUEST.EMPTY_JOLE) toast("Yerde ezik bir JOLE kutusu var…");
  if (q === QUEST.BROKEN_TABLET) toast("Tabletin yerde çatlamış");
  if (q === QUEST.FIND_CARD) toast("Cebinde bir şey var…");
  if (q === QUEST.INSERT_CARD) toast("Kartı robota tak");
  if (q === QUEST.EXPLORE) {
    toast(
      state.friend
        ? "Takım AÇIK · Kuzeye ilerle · yolda savaş var!"
        : "Kuzeye ilerle · KRAXX devriyesi yakında!",
      3.5
    );
    companion.visible = !!state.friend;
    state.robotFollow = !!state.friend;
    state.canShoot = true;
  }
  if (q === QUEST.FIGHT_PATROL) {
    spawnPatrol();
  }
  if (q === QUEST.CASTLE_GATE) {
    // kısa nefes — kapıya yürü, yaklaşınca cut
    toast("Kale kapısı önünde… dikkatli ol", 2.5);
  }
  if (q === QUEST.FREE_ZIX) toast("Kafesteki ZIX'i kurtar!");
  if (q === QUEST.FIGHT_GUARDS) spawnGuards();
  if (q === QUEST.GET_CRYSTAL1) toast("KRYNN Kristali parlıyor");
  if (q === QUEST.PORTAL) toast("Portal açık · E ile gir");
  if (q === QUEST.PLANET2) goLumina();
  if (q === QUEST.FIGHT_LUMINA) spawnLuminaFoes();
  if (q === QUEST.GET_CRYSTAL2) toast("LUMINA Kristali burada");
  if (q === QUEST.GO_HOME) {
    homePortal.visible = true;
    toast("İki kristal! Dünya portalına gir");
  }
  if (q === QUEST.DONE) showEnd();
}

function goLumina() {
  state.planet = "lumina";
  setPlanetTheme("lumina");
  clearEnemies();
  castle.visible = false;
  zixCage.visible = false;
  crystal1.visible = false;
  portal.visible = false;
  rocket.visible = false;
  emptyJole.visible = false;
  tablet.visible = false;
  sleepRobot.visible = false;
  enemyBot.visible = false;
  ground.material.color.setHex(0x2a1840);
  crystal2.visible = true;
  homePortal.visible = false;
  player.position.set(0, 0, 0);
  companion.position.set(-1, 0, -1);
  story("LUMINA\nKristal gezegeni…\nDikkat: muhafızlar!", 3);
  // kısa keşif sonra ambush
  setTimeout(() => {
    if (state.quest === QUEST.PLANET2) applyEvent("lumina_ambush");
  }, 2500);
}

function showEnd() {
  state.mode = MODE.END;
  uiEl.classList.add("hidden");
  endScreen.classList.remove("hidden");
  storyOverlay.classList.add("hidden");
  if (document.pointerLockElement) document.exitPointerLock();
}

// Rescue cutscenes
function startRescueCut() {
  state.mode = MODE.CUT;
  state.cutT = 0;
  state.cutKind = state.friend ? "friend_hurt" : "abandon_choke";
  enemyBot.visible = true;
  enemyBot.position.set(
    player.position.x + 1.2,
    0,
    player.position.z + 1.5
  );
  if (document.pointerLockElement) document.exitPointerLock();
  hurtVig.classList.remove("hidden");
  if (state.friend) {
    story("KRAXX koruma robotu!\nAğır yaralandın…", 2.2);
  } else {
    story("Bir robot boğazını sıkıyor!\n…", 2.2);
  }
}

function updateCut(dt) {
  state.cutT += dt;
  const t = state.cutT;
  enemyBot.lookAt(player.position.x, 1, player.position.z);

  if (state.cutKind === "friend_hurt") {
    hurtVig.style.opacity = String(0.4 + Math.sin(t * 6) * 0.2);
    state.hurt = 1;
    // companion runs in
    if (t > 1.2) {
      companion.visible = true;
      companion.position.lerp(
        new THREE.Vector3(enemyBot.position.x - 0.8, 0, enemyBot.position.z - 0.5),
        0.08
      );
    }
    if (t > 2.8) {
      enemyBot.position.x += dt * 8;
      enemyBot.rotation.z += dt * 3;
    }
    if (t > 3.8) {
      enemyBot.visible = false;
      state.hurt = 0;
      hurtVig.classList.add("hidden");
      openDialogue(
        "ROBOT",
        "Hayır hayır — uyku yok, yardım var!\nGördün mü? Arkadaş olmak işe yarıyor.\nBir daha kanama. Lütfen.",
        () => {
          state.mode = MODE.PLAY;
          state.friend = true;
          state.robotFollow = true;
          setQuest(QUEST.FREE_ZIX);
          onQuest(QUEST.FREE_ZIX);
          toast("ZIX'i kurtar · kafes (E)");
        }
      );
      state.cutKind = "";
    }
  }

  if (state.cutKind === "abandon_choke") {
    hurtVig.style.opacity = String(0.55 + Math.sin(t * 8) * 0.25);
    camera.position.lerp(
      new THREE.Vector3(
        player.position.x + 0.3,
        1.4,
        player.position.z + 0.8
      ),
      0.1
    );
    camera.lookAt(player.position.x, 1.3, player.position.z);
    if (t > 1.5) {
      companion.visible = true;
      companion.position.lerp(
        new THREE.Vector3(enemyBot.position.x - 1, 0, enemyBot.position.z),
        0.1
      );
    }
    if (t > 2.6) {
      enemyBot.position.y += dt * 2;
      enemyBot.rotation.x += dt * 4;
    }
    if (t > 3.6) {
      enemyBot.visible = false;
      hurtVig.classList.add("hidden");
      openDialogue(
        "ROBOT",
        "Uyku modundan çıktım.\nÇünkü… arkadaşımı boğazlayan biri varmış.\n\nBir daha beni terk etme.\nLütfen.",
        () => {
          openDialogue("SEN", "…Tamam. Bu sefer beraber.", () => {
            state.mode = MODE.PLAY;
            state.friend = true;
            state.robotFollow = true;
            companion.visible = true;
            setQuest(QUEST.FREE_ZIX);
            onQuest(QUEST.FREE_ZIX);
            toast("ZIX'i kurtar");
          });
        }
      );
      state.cutKind = "";
    }
  }
}

// Interact
function wdist(p, o) {
  return distXZ(p.x, p.z, o.x, o.z);
}

function getNear() {
  if (state.mode !== MODE.PLAY || state.dialogueOpen || !choicesEl.classList.contains("hidden"))
    return null;
  const p = player.position;
  const q = state.quest;

  if (q === QUEST.EMPTY_JOLE && canInteract(wdist(p, emptyJole.position), R))
    return { t: "jole", l: "[E] Boş JOLE kutusuna bak" };
  if (q === QUEST.BROKEN_TABLET && canInteract(wdist(p, tablet.position), R))
    return { t: "tablet", l: "[E] Tableti incele" };
  if (q === QUEST.FIND_CARD)
    return { t: "card", l: "[E] Cebinden kartı çıkar" };
  if (
    q === QUEST.INSERT_CARD &&
    canInteract(wdist(p, sleepRobot.position), R + 0.5)
  )
    return { t: "insert", l: "[E] Kartı robota tak" };
  if (q === QUEST.FREE_ZIX && !state.zixFreed && canInteract(wdist(p, zixCage.position), R + 0.8))
    return { t: "zix", l: "[E] ZIX'i kurtar" };
  if (
    q === QUEST.GET_CRYSTAL1 &&
    !state.hasCrystal1 &&
    canInteract(wdist(p, crystal1.position), R)
  )
    return { t: "c1", l: "[E] KRYNN Kristali'ni al" };
  if (q === QUEST.PORTAL && canInteract(wdist(p, portal.position), R + 0.8))
    return { t: "portal", l: "[E] Portala gir → LUMINA" };
  if (
    q === QUEST.GET_CRYSTAL2 &&
    !state.hasCrystal2 &&
    crystal2.visible &&
    canInteract(wdist(p, crystal2.position), R)
  )
    return { t: "c2", l: "[E] LUMINA Kristali'ni al" };
  if (
    q === QUEST.GO_HOME &&
    homePortal.visible &&
    canInteract(wdist(p, homePortal.position), R + 0.8)
  )
    return { t: "home", l: "[E] Dünya'ya dön" };
  return null;
}

function doInteract(t) {
  if (t === "jole") {
    sawEmptyJole = true;
    openDialogue(
      "SEN",
      "Boş JOLE kutusu…\nSon damla da bitmiş.\nRoket ölü. Ben… yalnızım.",
      () => applyEvent("saw_jole")
    );
  }
  if (t === "tablet") {
    tabletBroken = true;
    inv();
    openDialogue(
      "NASA TABLET",
      "Sis… tem… KRY—\n*çssszt*\n[BAĞLANTI KESİLDİ]",
      () => {
        story("Tablet kırıldı.\nHarita yok. Sinyal yok.", 2.5);
        applyEvent("tablet_broke");
      }
    );
  }
  if (t === "card") {
    state.hasCard = true;
    inv();
    openDialogue(
      "KART",
      "NASA yedek çekirdek kartı.\nÜzerinde: HENTW-RB-01\n\nKısa bir flaş: metal… robot… saldırı…",
      () => applyEvent("card_found")
    );
  }
  if (t === "insert") {
    state.robotAwake = true;
    sleepRobot.userData.eye.material.emissive.setHex(0x1188aa);
    sleepRobot.userData.eye.material.emissiveIntensity = 1.5;
    inv();
    openDialogue(
      "NASA ROBOTU",
      "…sistem… yeniden…\n\nAaa. Merhaba.\n\nBen bozulmadım ki.\nÇok uykum gelmişti, uyku moduna aldım.\n\nNiye üstüme metal attınız?",
      () => {
        openDialogue(
          "SEN",
          "UYKU MODU MU?! Tüm gezegeni dolaştık!",
          () => {
            applyEvent("card_inserted");
            showChoices();
          }
        );
      }
    );
  }
  if (t === "zix") {
    state.zixFreed = true;
    zixCage.userData.zix.position.x = 1.5;
    openDialogue(
      "ZIX",
      "Teşekkürler yıldız-yolcusu!\nKRAXX beni kilitledi…\n\nKristali koruyan muhafızlar var — yen onları!\nSonra KRYNN Kristali, portal, LUMINA, Dünya!",
      () => applyEvent("zix_freed")
    );
  }
  if (t === "c1") {
    state.hasCrystal1 = true;
    crystal1.visible = false;
    inv();
    toast("KRYNN Kristali alındı!");
    applyEvent("crystal1");
  }
  if (t === "portal") {
    applyEvent("entered_portal");
  }
  if (t === "c2") {
    state.hasCrystal2 = true;
    crystal2.visible = false;
    inv();
    toast("LUMINA Kristali alındı!");
    applyEvent("crystal2");
  }
  if (t === "home") {
    story("İki kristal birleşiyor…\nDünya'ya yol açık!", 3);
    setTimeout(() => applyEvent("went_home"), 2800);
  }
}

// Input
$("btn-start")?.addEventListener("click", startGame);
document.querySelectorAll("#choices button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const c = btn.dataset.choice;
    hideChoices();
    if (c === "friend") {
      state.friend = true;
      openDialogue(
        "ROBOT",
        "Evet! Takım modu: AÇIK.\nBen haritayım, sen bacaklarsın.\nAma yavaş yürü — az önce 1 oyun uyudum.",
        () => applyEvent("chose_friend")
      );
    } else {
      state.friend = false;
      openDialogue(
        "ROBOT",
        "…anlaşıldı.\nUyku moduna… şaka yapmıyorum,\nbu sefer gerçekten kapanabilirim.\nİyi şanslar, astronot.",
        () => {
          companion.visible = false;
          state.robotFollow = false;
          applyEvent("chose_abandon");
        }
      );
    }
  });
});

function startGame() {
  sfx.ui();
  state.easyMode = !!(easyModeCb && easyModeCb.checked);
  if (easyBadge) easyBadge.classList.toggle("hidden", !state.easyMode);
  titleScreen.classList.add("hidden");
  state.mode = MODE.WAKE;
  state.wakeT = 0;
  wakeOverlay.classList.remove("hidden", "fade");
  requestAnimationFrame(() => setTimeout(() => wakeOverlay.classList.add("fade"), 200));
  setQuest(QUEST.WAKE);
  FX.spawnBurst(0, 0.8, 1, 0x88ffaa, 10, 1.5);
  story("Gözlerin ağır…\nMotorlar sustu.\nBurası… HENTW değil.\n\nBurası KRYNN.", 4);
}

function beginPlay() {
  state.mode = MODE.PLAY;
  bodyRoot.rotation.x = 0;
  bodyRoot.position.y = 0;
  wakeOverlay.classList.add("hidden");
  uiEl.classList.remove("hidden");
  refreshCollectHud();
  applyEvent("stood_up");
  toast("WASD · fare · E · ★ yıldız · harita sağ alt", 3);
  persistSave();
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (state.mode === MODE.TITLE && (e.code === "Enter" || e.code === "Space")) {
    e.preventDefault();
    startGame();
    return;
  }
  if (state.mode === MODE.END) return;
  if (state.dialogueOpen && (k === "h" || k === "escape" || e.code === "Space" || e.code === "Enter")) {
    e.preventDefault();
    closeDialogue();
    return;
  }
  if (state.mode !== MODE.PLAY) return;
  if (k === "e") {
    const n = getNear();
    if (n) doInteract(n.t);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
canvas.addEventListener("click", () => {
  if (state.mode === MODE.PLAY && !state.pointer && choicesEl.classList.contains("hidden"))
    canvas.requestPointerLock();
});
document.addEventListener("mousedown", (e) => {
  if (e.button === 0 && state.pointer && state.mode === MODE.PLAY) tryShoot();
});
document.addEventListener("pointerlockchange", () => {
  state.pointer = document.pointerLockElement === canvas;
});
document.addEventListener("mousemove", (e) => {
  if (!state.pointer || state.mode !== MODE.PLAY || state.dialogueOpen) return;
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
  composer.setSize(innerWidth, innerHeight);
});

// Loop
const clock = new THREE.Clock();

function updateWake(dt) {
  state.wakeT += dt;
  if (state.wakeT < 1.8) {
    camera.position.set(1.4, 0.45 + state.wakeT * 0.05, 3);
    camera.lookAt(0, 0.2, 2);
  } else {
    const u = THREE.MathUtils.clamp((state.wakeT - 1.8) / 2.2, 0, 1);
    const s = u * u * (3 - 2 * u);
    bodyRoot.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2 + 0.15, 0, s);
    bodyRoot.position.y = THREE.MathUtils.lerp(0.28, 0, s);
    const target = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const from = new THREE.Vector3(1.4, 0.55, 3);
    const cp = Math.cos(camOrbit.pitch),
      sp = Math.sin(camOrbit.pitch);
    const sy = Math.sin(camOrbit.yaw),
      cy = Math.cos(camOrbit.yaw);
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
    camera.lookAt(new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0.25, 2), target, s));
    if (u >= 1) beginPlay();
  }
}

function updatePlay(dt) {
  if (!state.dialogueOpen && choicesEl.classList.contains("hidden")) {
    let ix = 0,
      iz = 0;
    if (keys.has("w") || keys.has("arrowup")) iz -= 1;
    if (keys.has("s") || keys.has("arrowdown")) iz += 1;
    if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
    if (keys.has("d") || keys.has("arrowright")) ix += 1;
    if (ix || iz) {
      const sin = Math.sin(camOrbit.yaw),
        cos = Math.cos(camOrbit.yaw);
      const mx = ix * cos + iz * sin;
      const mz = -ix * sin + iz * cos;
      const len = Math.hypot(mx, mz) || 1;
      const slow = state.hurt ? 0.45 : 1;
      player.position.x = THREE.MathUtils.clamp(
        player.position.x + (mx / len) * SPEED * slow * dt,
        -30,
        32
      );
      player.position.z = THREE.MathUtils.clamp(
        player.position.z + (mz / len) * SPEED * slow * dt,
        -30,
        40
      );
      player.rotation.y = Math.atan2(mx, mz);
    }
  }

  // Companion follow
  if (state.robotFollow && companion.visible) {
    const tx = player.position.x - Math.sin(player.rotation.y) * 1.4;
    const tz = player.position.z - Math.cos(player.rotation.y) * 1.4;
    companion.position.x += (tx - companion.position.x) * 3 * dt;
    companion.position.z += (tz - companion.position.z) * 3 * dt;
    companion.lookAt(player.position.x, 1, player.position.z);
  }

  // Devriye savaşı tetik (kuzeye yürüyünce)
  if (state.quest === QUEST.EXPLORE) {
    if (wdist(player.position, { x: POS.patrolCenter.x, z: POS.patrolCenter.z }) < 7) {
      applyEvent("patrol_start");
    }
  }

  // Kale kapısı — devriye bitince
  if (state.quest === QUEST.CASTLE_GATE) {
    if (wdist(player.position, { x: POS.castleGate.x, z: POS.castleGate.z }) < 5.5) {
      startRescueCut();
    }
  }

  state.shootCd = Math.max(0, state.shootCd - dt);
  updateEnemies(dt);

  // Cam
  const target = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  const cp = Math.cos(camOrbit.pitch),
    sp = Math.sin(camOrbit.pitch);
  const sy = Math.sin(camOrbit.yaw),
    cy = Math.cos(camOrbit.yaw);
  const desired = target
    .clone()
    .add(
      new THREE.Vector3(
        sy * cp * camOrbit.distance,
        sp * camOrbit.distance + 0.4,
        cy * cp * camOrbit.distance
      )
    );
  desired.y = Math.max(0.7, desired.y);
  camera.position.lerp(desired, 0.15);
  camera.lookAt(target);

  // Prompt
  if (!state.dialogueOpen && choicesEl.classList.contains("hidden")) {
    const n = getNear();
    if (n) {
      promptEl.textContent = n.l;
      promptEl.classList.remove("hidden");
    } else promptEl.classList.add("hidden");
  }

  // FX
  if (crystal1.visible && crystal1.userData.mesh)
    crystal1.userData.mesh.rotation.y += dt;
  if (crystal2.visible && crystal2.userData.mesh)
    crystal2.userData.mesh.rotation.y += dt;
  if (portal.userData.disc) portal.userData.disc.rotation.z += dt * 0.5;
  tryCollectStars();
  updateMinimapHud();
  for (const id of Object.keys(starMeshes)) {
    const g = starMeshes[id];
    if (g && g.visible && g.userData.spin) g.userData.spin.rotation.y += 0.03;
  }
}

function tick() {
  requestAnimationFrame(tick);
  try {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (state.mode === MODE.WAKE) updateWake(dt);
    else if (state.mode === MODE.CUT) updateCut(dt);
    else if (state.mode === MODE.PLAY) updatePlay(dt);

    if (state.toastT > 0) {
      state.toastT -= dt;
      if (state.toastT <= 0) toastEl.classList.add("hidden");
    }
    FX.update(dt);
    composer.render();
  } catch (err) {
    console.error("tick", err);
  }
}

// Continue / easy UI
(function initSaveUi() {
  const saved = tryLoadSave();
  if (btnContinue && saved && saved.quest && saved.quest !== QUEST.DONE && saved.quest !== QUEST.WAKE) {
    btnContinue.classList.remove("hidden");
  }
  if (btnContinue) {
    btnContinue.addEventListener("click", () => {
      const data = tryLoadSave();
      if (!data) return;
      sfx.ui();
      state.easyMode = data.easyMode;
      if (easyModeCb) easyModeCb.checked = !!data.easyMode;
      if (easyBadge) easyBadge.classList.toggle("hidden", !state.easyMode);
      state.collectibles = data.collectibles?.length ? data.collectibles : createCollectibles(["star1","star2","star3"]);
      state.playerHp = data.playerHp || 100;
      const ex = data.extra || {};
      state.friend = ex.friend ?? null;
      state.hasCard = !!ex.hasCard;
      state.robotAwake = !!ex.robotAwake;
      state.hasCrystal1 = !!ex.hasCrystal1;
      state.hasCrystal2 = !!ex.hasCrystal2;
      state.canShoot = !!ex.canShoot;
      state.robotFollow = !!ex.robotFollow;
      if (ex.planet) setPlanetTheme(ex.planet);
      titleScreen.classList.add("hidden");
      wakeOverlay.classList.add("hidden");
      uiEl.classList.remove("hidden");
      state.mode = MODE.PLAY;
      setQuest(data.quest);
      if (typeof ex.px === "number") {
        player.position.x = ex.px;
        player.position.z = ex.pz;
      }
      refreshCollectHud();
      inv();
      onQuest(state.quest);
      toast("Kayıt yüklendi", 2.5);
    });
  }
})();

setQuest(QUEST.WAKE);
refreshCollectHud();
tick();
console.info("%cHENTW 2 · KRYNN", "color:#44ff88;font-weight:bold");
