import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Scalar } from "@babylonjs/core/Maths/math.scalar.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { PointLight } from "@babylonjs/core/Lights/pointLight.js";
import { Ray } from "@babylonjs/core/Culling/ray.js";
import { Scene } from "@babylonjs/core/scene.js";
import "./styles.css";

const BABYLON = {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  PointLight,
  Ray,
  Scalar,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  UniversalCamera,
  Vector3,
};

const canvas = document.querySelector("#game");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");
const levelLabel = document.querySelector("#levelLabel");
const keyLabel = document.querySelector("#keyLabel");
const fartLabel = document.querySelector("#fartLabel");
const rewindLabel = document.querySelector("#rewindLabel");
const statusLabel = document.querySelector("#statusLabel");
const hintLabel = document.querySelector("#hintLabel");
const deviceChoices = document.querySelector("#deviceChoices");
const levelSelect = document.querySelector("#levelSelect");
const levelButton = document.querySelector("#levelButton");
const touchFartButton = document.querySelector("#touchFartButton");
const touchRewindButton = document.querySelector("#touchRewindButton");

const SAVE_KEY = "annemdenKacBabylonSaveV1";
const GRID_STEP = 0.5;
const MAX_LEVELS = 5;
const REWIND_SECONDS = 5.5;

const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
});
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.05, 0.07, 0.07, 1);
scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
scene.fogStart = 12;
scene.fogEnd = 42;
scene.fogColor = new BABYLON.Color3(0.08, 0.12, 0.12);

const camera = new BABYLON.UniversalCamera("playerCamera", new BABYLON.Vector3(0, 1.55, 0), scene);
camera.minZ = 0.05;
camera.maxZ = 90;
camera.fov = 1.2;

const player = {
  position: new BABYLON.Vector3(0, 1.55, 0),
  radius: 0.36,
  speed: 4.2,
  yaw: 0,
  pitch: -0.16,
};

const mother = {
  root: null,
  face: null,
  position: new BABYLON.Vector3(0, 0, 0),
  speed: 2,
  radius: 0.48,
  path: [],
  pathTimer: 0,
  fleeTimer: 0,
  talkTimer: 0,
  expression: "calm",
};

const save = applyRestoreParams(loadSave());
const pressed = new Set();
const touchMoves = new Set();
const levels = Array.from({ length: MAX_LEVELS }, (_, index) => createLevel(index));

let selectedInput = save.inputMode;
let selectedLevelIndex = Math.min(save.lastLevel, save.unlockedLevel);
let unlockedLevel = save.unlockedLevel;
let completedFinalLevel = save.completedFinalLevel;
let gameState = "intro";
let started = false;
let overlayAction = "start";
let levelIndex = selectedLevelIndex;
let timeInLevel = 0;
let keysFound = 0;
let fartCooldown = 0;
let rewindUsed = false;
let rewindTimer = 0;
let rewindSnapshots = [];
let kissTimer = 0;
let gridMin = -6;
let gridCount = 25;
let audioContext = null;

const colliders = [];
let levelNodes = [];
let keys = [];
let door = null;
let kissHearts = [];

const materials = createMaterials();

init();

function init() {
  buildLights();
  document.body.dataset.input = selectedInput || "keyboard";
  loadLevel(selectedLevelIndex);
  addEvents();
  showStartOverlay();
  resize();

  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    update(dt);
    scene.render();
  });
}

function createMaterials() {
  const make = (name, color, rough = 0.85) => {
    const mat = new BABYLON.StandardMaterial(name, scene);
    mat.diffuseColor = BABYLON.Color3.FromHexString(color);
    mat.specularColor = new BABYLON.Color3(1 - rough, 1 - rough, 1 - rough);
    return mat;
  };

  const face = new BABYLON.StandardMaterial("motherFacePhoto", scene);
  face.diffuseTexture = new BABYLON.Texture(`${import.meta.env.BASE_URL}mother-face.jpeg`, scene, false, true);
  face.diffuseTexture.hasAlpha = false;
  face.emissiveColor = new BABYLON.Color3(0.18, 0.18, 0.18);
  face.backFaceCulling = false;

  return {
    floor: make("floor", "#66736d"),
    wall: make("wall", "#d8cfbb"),
    trim: make("trim", "#7f5941"),
    table: make("table", "#a87945", 0.65),
    sofa: make("sofa", "#8d3d47"),
    shelf: make("shelf", "#455a62"),
    bed: make("bed", "#4a77a8"),
    body: make("motherBody", "#5c8f73"),
    skin: make("skin", "#f0bd91"),
    hair: make("hair", "#38251e"),
    black: make("black", "#111111"),
    mouth: make("mouth", "#d41442", 0.45),
    key: make("key", "#ffcf4a", 0.3),
    door: make("door", "#744529", 0.7),
    heart: make("heart", "#ff5c8b", 0.4),
    face,
  };
}

function createLevel(index) {
  const size = 13 + index * 2.7;
  const half = size / 2;
  const inner = half - 1.35;
  const keyCount = 3 + index;
  const walls = [
    [0, -half, size, 0.35],
    [0, half, size, 0.35],
    [-half, 0, 0.35, size],
    [half, 0, 0.35, size],
  ];

  addSplitVertical(walls, -half * 0.42, -inner, inner, -1.4 - index * 0.18, 2.8);
  addSplitVertical(walls, half * 0.35, -inner, inner, 1.1 + index * 0.22, 2.9);
  addSplitHorizontal(walls, -half * 0.25, -inner, inner, -2.0, 3.1);
  addSplitHorizontal(walls, half * 0.24, -inner, inner, 2.2, 2.9);
  if (index > 1) addSplitVertical(walls, 0, -inner, inner, 0.5, 3.5);

  const spots = [
    [-inner, inner],
    [inner - 2.2, inner - 2.3],
    [-inner, -inner],
    [inner, -inner],
    [0, inner],
    [-inner * 0.55, 0.35],
    [inner * 0.56, -0.45],
  ];

  return {
    name: `Seviye ${index + 1}`,
    size,
    keyCount,
    start: new BABYLON.Vector3(inner, 1.55, inner),
    yaw: -2.35,
    motherStart: new BABYLON.Vector3(-inner, 0, -inner),
    motherSpeed: 2.05 + index * 0.36,
    hearRange: 11 + index * 1.6,
    door: new BABYLON.Vector3(0, 1.1, -half + 0.32),
    walls,
    keys: spots.slice(0, keyCount).map(([x, z], spotIndex) => ({
      position: new BABYLON.Vector3(x, spotIndex === 1 ? 1.08 : 0.55, z),
    })),
    furniture: [
      [inner - 0.4, inner - 1.15, 1.6, 1.4, 0.55, "table"],
      [-inner + 0.7, 0.6, 1.9, 1.0, 0.6, "sofa"],
      [-inner + 1.0, -inner + 1.4, 1.2, 1.2, 1.0, "shelf"],
      [inner - 1.1, -inner + 1.6, 1.35, 1.75, 0.72, "bed"],
      [index > 2 ? 0 : inner * 0.2, index > 2 ? -inner * 0.55 : inner * 0.25, 1.25, 1.25, 0.9, "shelf"],
    ],
  };
}

function addSplitVertical(walls, x, zMin, zMax, gapCenter, gapSize) {
  const gapMin = gapCenter - gapSize / 2;
  const gapMax = gapCenter + gapSize / 2;
  addWallSegment(walls, x, (zMin + gapMin) / 2, 0.35, gapMin - zMin);
  addWallSegment(walls, x, (gapMax + zMax) / 2, 0.35, zMax - gapMax);
}

function addSplitHorizontal(walls, z, xMin, xMax, gapCenter, gapSize) {
  const gapMin = gapCenter - gapSize / 2;
  const gapMax = gapCenter + gapSize / 2;
  addWallSegment(walls, (xMin + gapMin) / 2, z, gapMin - xMin, 0.35);
  addWallSegment(walls, (gapMax + xMax) / 2, z, xMax - gapMax, 0.35);
}

function addWallSegment(walls, x, z, width, depth) {
  if (width < 0.8 && depth < 0.8) return;
  walls.push([x, z, width, depth]);
}

function buildLights() {
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.9;
  hemi.groundColor = new BABYLON.Color3(0.18, 0.22, 0.22);

  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.45, -0.9, -0.25), scene);
  sun.intensity = 1.1;
  sun.position = new BABYLON.Vector3(6, 9, 4);

  const playerLight = new BABYLON.PointLight("playerLight", new BABYLON.Vector3(0, 0, 0), scene);
  playerLight.intensity = 0.75;
  playerLight.range = 9;
  playerLight.parent = camera;
  playerLight.position = new BABYLON.Vector3(0, -0.2, 0.7);
}

function loadSave() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}");
    return {
      unlockedLevel: clampInt(parsed.unlockedLevel, 0, MAX_LEVELS - 1),
      lastLevel: clampInt(parsed.lastLevel, 0, MAX_LEVELS - 1),
      inputMode: parsed.inputMode === "touch" || parsed.inputMode === "keyboard" ? parsed.inputMode : "",
      completedFinalLevel: Boolean(parsed.completedFinalLevel),
    };
  } catch {
    return { unlockedLevel: 0, lastLevel: 0, inputMode: "", completedFinalLevel: false };
  }
}

function applyRestoreParams(currentSave) {
  const params = new URLSearchParams(window.location.search);
  const restoreLevel = params.get("restoreLevel");
  if (!restoreLevel) return currentSave;

  const restoredLevel = clampInt(restoreLevel, 1, MAX_LEVELS) - 1;
  const restoredSave = {
    ...currentSave,
    unlockedLevel: Math.max(currentSave.unlockedLevel, restoredLevel),
    lastLevel: restoredLevel,
    completedFinalLevel: currentSave.completedFinalLevel || restoredLevel >= MAX_LEVELS - 1,
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(restoredSave));
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
  return restoredSave;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function saveProgress() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    unlockedLevel,
    lastLevel: selectedLevelIndex,
    inputMode: selectedInput,
    completedFinalLevel,
  }));
}

function loadLevel(index) {
  clearLevel();
  levelIndex = index;
  selectedLevelIndex = index;
  keysFound = 0;
  timeInLevel = 0;
  fartCooldown = 0;
  rewindUsed = false;
  rewindSnapshots = [];
  rewindTimer = 0;
  kissTimer = 0;

  const config = levels[index];
  gridMin = -config.size / 2 + 0.55;
  gridCount = Math.round((config.size - 1.1) / GRID_STEP) + 1;

  player.position.copyFrom(config.start);
  player.yaw = config.yaw;
  player.pitch = -0.16;
  mother.position.copyFrom(config.motherStart);
  mother.speed = config.motherSpeed;
  mother.path = [];
  mother.pathTimer = 0;
  mother.fleeTimer = 0;
  mother.expression = "calm";

  buildHouse(config);
  buildMother();
  updateCamera();
  updateHud(`${config.keyCount} anahtari bul.`);
}

function clearLevel() {
  for (const node of levelNodes) node.dispose(false, true);
  for (const heart of kissHearts) heart.dispose(false, true);
  levelNodes = [];
  kissHearts = [];
  keys = [];
  door = null;
  colliders.length = 0;
  mother.root = null;
  mother.face = null;
}

function track(node) {
  levelNodes.push(node);
  return node;
}

function buildHouse(config) {
  const floor = track(BABYLON.MeshBuilder.CreateBox("floor", {
    width: config.size + 0.2,
    height: 0.12,
    depth: config.size + 0.2,
  }, scene));
  floor.position.y = -0.08;
  floor.material = materials.floor;

  const ceiling = track(BABYLON.MeshBuilder.CreateBox("ceiling", {
    width: config.size + 0.2,
    height: 0.12,
    depth: config.size + 0.2,
  }, scene));
  ceiling.position.y = 3.05;
  ceiling.material = materials.wall;

  for (const [x, z, width, depth] of config.walls) {
    const wall = track(BABYLON.MeshBuilder.CreateBox("wall", { width, height: 2.85, depth }, scene));
    wall.position.set(x, 1.36, z);
    wall.material = materials.wall;
    addCollider(x, z, width, depth);

    const trim = track(BABYLON.MeshBuilder.CreateBox("trim", { width: width + 0.04, height: 0.12, depth: depth + 0.04 }, scene));
    trim.position.set(x, 0.12, z);
    trim.material = materials.trim;
  }

  for (const [x, z, width, depth, height, type] of config.furniture) {
    buildFurniture(x, z, width, depth, height, type);
    addCollider(x, z, width, depth);
  }

  config.keys.forEach((keyData) => {
    const mesh = buildKey(keyData.position);
    keys.push({ mesh, found: false, baseY: keyData.position.y });
  });

  door = track(BABYLON.MeshBuilder.CreateBox("door", { width: 1.7, height: 2.2, depth: 0.16 }, scene));
  door.position.copyFrom(config.door);
  door.material = materials.door;

  const rug = track(BABYLON.MeshBuilder.CreateCylinder("rug", { diameter: 4.6, height: 0.025, tessellation: 48 }, scene));
  rug.position.set(0, 0.01, 0.2);
  rug.scaling.z = 0.62;
  rug.material = materials.sofa;

  const lamp = track(new BABYLON.PointLight("lamp", new BABYLON.Vector3(-1.5, 2.55, 1.5), scene));
  lamp.intensity = 0.55;
  lamp.range = 10;
}

function buildFurniture(x, z, width, depth, height, type) {
  const mesh = track(BABYLON.MeshBuilder.CreateBox(type, { width, height, depth }, scene));
  mesh.position.set(x, height / 2, z);
  mesh.material = materials[type] ?? materials.table;

  if (type === "table") {
    const top = track(BABYLON.MeshBuilder.CreateBox("tableTop", { width: width + 0.15, height: 0.12, depth: depth + 0.15 }, scene));
    top.position.set(x, height + 0.08, z);
    top.material = materials.table;
  }
}

function buildKey(position) {
  const root = track(new BABYLON.TransformNode("keyRoot", scene));
  root.position.copyFrom(position);

  const ring = BABYLON.MeshBuilder.CreateTorus("keyRing", { diameter: 0.36, thickness: 0.07, tessellation: 28 }, scene);
  ring.rotation.x = Math.PI / 2;
  ring.material = materials.key;
  ring.parent = root;

  const stem = BABYLON.MeshBuilder.CreateBox("keyStem", { width: 0.1, height: 0.08, depth: 0.48 }, scene);
  stem.position.z = 0.34;
  stem.material = materials.key;
  stem.parent = root;

  const tooth = BABYLON.MeshBuilder.CreateBox("keyTooth", { width: 0.22, height: 0.08, depth: 0.1 }, scene);
  tooth.position.set(0.06, 0, 0.58);
  tooth.material = materials.key;
  tooth.parent = root;

  const glow = new BABYLON.PointLight("keyGlow", new BABYLON.Vector3(0, 0.25, 0), scene);
  glow.parent = root;
  glow.intensity = 0.55;
  glow.range = 3;
  track(glow);
  return root;
}

function buildMother() {
  const root = track(new BABYLON.TransformNode("motherRoot", scene));
  root.position.copyFrom(mother.position);

  const body = BABYLON.MeshBuilder.CreateCapsule("motherBody", { radius: 0.36, height: 1.25, tessellation: 16 }, scene);
  body.position.y = 0.9;
  body.material = materials.body;
  body.parent = root;

  const head = BABYLON.MeshBuilder.CreateSphere("motherHead", { diameter: 0.58, segments: 18 }, scene);
  head.position.y = 1.66;
  head.material = materials.skin;
  head.parent = root;

  const hair = BABYLON.MeshBuilder.CreateSphere("motherHair", { diameter: 0.62, segments: 18 }, scene);
  hair.position.y = 1.79;
  hair.scaling.y = 0.45;
  hair.material = materials.hair;
  hair.parent = root;

  const facePhoto = BABYLON.MeshBuilder.CreatePlane("motherFacePhotoPanel", { width: 0.42, height: 0.56 }, scene);
  facePhoto.position.set(0, 1.66, 0.32);
  facePhoto.material = materials.face;
  facePhoto.parent = root;

  const leftBrow = BABYLON.MeshBuilder.CreateBox("leftBrow", { width: 0.14, height: 0.018, depth: 0.018 }, scene);
  const rightBrow = BABYLON.MeshBuilder.CreateBox("rightBrow", { width: 0.14, height: 0.018, depth: 0.018 }, scene);
  leftBrow.position.set(-0.1, 1.8, 0.345);
  rightBrow.position.set(0.1, 1.8, 0.345);
  leftBrow.material = materials.black;
  rightBrow.material = materials.black;
  leftBrow.parent = root;
  rightBrow.parent = root;

  const mouth = BABYLON.MeshBuilder.CreateTorus("mouth", { diameter: 0.13, thickness: 0.018, tessellation: 18 }, scene);
  mouth.position.set(0, 1.55, 0.355);
  mouth.scaling.set(1.3, 0.5, 1);
  mouth.material = materials.mouth;
  mouth.parent = root;

  const kiss = BABYLON.MeshBuilder.CreateTorus("kissMouth", { diameter: 0.26, thickness: 0.03, tessellation: 18 }, scene);
  kiss.position.set(0, 1.55, 0.39);
  kiss.scaling.x = 1.45;
  kiss.material = materials.mouth;
  kiss.setEnabled(false);
  kiss.parent = root;

  mother.root = root;
  mother.face = { facePhoto, leftBrow, rightBrow, mouth, kiss };
}

function addCollider(x, z, width, depth) {
  colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  });
}

function addEvents() {
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    pressed.add(event.code);
    if (event.code === "KeyV") triggerFart();
    if (event.code === "KeyT") triggerRewind();
    if (event.code === "KeyR" && gameState !== "playing") retryCurrentLevel();
  });
  window.addEventListener("keyup", (event) => pressed.delete(event.code));

  document.addEventListener("pointerlockchange", () => {
    if (!started || gameState !== "playing") return;
    hintLabel.textContent = document.pointerLockElement === canvas
      ? "Anahtarlari bul. V osuruk, T zaman gucu."
      : "Devam etmek icin ekrana tikla.";
  });

  canvas.addEventListener("click", () => {
    if (started && gameState === "playing" && selectedInput === "keyboard") canvas.requestPointerLock?.();
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas || gameState !== "playing") return;
    player.yaw += event.movementX * 0.0024;
    player.pitch = BABYLON.Scalar.Clamp(player.pitch + event.movementY * 0.0024, -1.1, 1.1);
  });

  canvas.addEventListener("touchmove", (event) => {
    if (gameState !== "playing") return;
    const touch = event.touches[0];
    if (touch && canvas.lastTouch) {
      player.yaw += (touch.clientX - canvas.lastTouch.x) * 0.006;
      player.pitch = BABYLON.Scalar.Clamp(player.pitch + (touch.clientY - canvas.lastTouch.y) * 0.006, -1.1, 1.1);
    }
    if (touch) canvas.lastTouch = { x: touch.clientX, y: touch.clientY };
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchend", () => {
    canvas.lastTouch = null;
  });

  deviceChoices.querySelectorAll("[data-device]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedInput = button.dataset.device;
      document.body.dataset.input = selectedInput;
      startButton.disabled = false;
      renderDeviceChoices();
      saveProgress();
    });
  });

  startButton.addEventListener("click", () => {
    if (overlayAction === "retry") retryCurrentLevel();
    else if (overlayAction === "next") startNextLevel();
    else startSelectedLevel();
  });

  levelButton.addEventListener("click", () => {
    gameState = "paused";
    showStartOverlay();
  });

  touchFartButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    triggerFart();
  });
  touchRewindButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    triggerRewind();
  });

  document.querySelectorAll("[data-move]").forEach((button) => {
    const move = button.dataset.move;
    button.addEventListener("pointerdown", () => touchMoves.add(move));
    button.addEventListener("pointerup", () => touchMoves.delete(move));
    button.addEventListener("pointercancel", () => touchMoves.delete(move));
    button.addEventListener("pointerleave", () => touchMoves.delete(move));
  });
}

function showStartOverlay() {
  overlayAction = "start";
  overlay.querySelector("h1").textContent = "Annemden Kac";
  overlay.querySelector("p").textContent = selectedInput
    ? completedFinalLevel
      ? "Babylon.js surumu. Zaman gucu acik."
      : "Babylon.js surumu. Zaman gucu 5. level bitince acilir."
    : "Once nasil oynayacagini sec, sonra acik levellerden birini baslat.";
  startButton.textContent = `${levels[selectedLevelIndex].name} Basla`;
  startButton.disabled = !selectedInput;
  deviceChoices.hidden = false;
  levelSelect.hidden = false;
  renderDeviceChoices();
  renderLevelSelect();
  overlay.hidden = false;
  document.exitPointerLock?.();
}

function renderDeviceChoices() {
  deviceChoices.querySelectorAll("[data-device]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.device === selectedInput);
  });
}

function renderLevelSelect() {
  levelSelect.innerHTML = "";
  levels.forEach((level, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${index + 1}`;
    button.disabled = index > unlockedLevel;
    button.classList.toggle("is-selected", index === selectedLevelIndex);
    button.addEventListener("click", () => {
      selectedLevelIndex = index;
      loadLevel(index);
      renderLevelSelect();
      startButton.textContent = `${level.name} Basla`;
      saveProgress();
    });
    levelSelect.append(button);
  });
}

function startSelectedLevel() {
  if (!selectedInput) return;
  started = true;
  gameState = "playing";
  overlay.hidden = true;
  loadLevel(selectedLevelIndex);
  saveProgress();
  ensureAudio();
  if (selectedInput === "keyboard") canvas.requestPointerLock?.();
}

function startNextLevel() {
  gameState = "playing";
  overlay.hidden = true;
  loadLevel(selectedLevelIndex);
  if (selectedInput === "keyboard") canvas.requestPointerLock?.();
}

function retryCurrentLevel() {
  gameState = "playing";
  overlay.hidden = true;
  loadLevel(levelIndex);
  if (selectedInput === "keyboard") canvas.requestPointerLock?.();
}

function showOverlay(title, text, buttonText, action = "start") {
  overlayAction = action;
  overlay.querySelector("h1").textContent = title;
  overlay.querySelector("p").textContent = text;
  startButton.textContent = buttonText;
  startButton.disabled = action === "start" && !selectedInput;
  deviceChoices.hidden = action !== "start";
  levelSelect.hidden = action !== "start";
  renderLevelSelect();
  overlay.hidden = false;
}

function update(dt) {
  updateTimers(dt);
  if (gameState === "playing") {
    timeInLevel += dt;
    updatePlayer(dt);
    updateMother(dt);
    updateKeys(dt);
    updateDoor();
    recordRewindSnapshot(dt);
  } else if (gameState === "kiss") {
    updateKiss(dt);
  }
  updateCamera();
}

function updateTimers(dt) {
  fartCooldown = Math.max(0, fartCooldown - dt);
  fartLabel.textContent = fartCooldown > 0 ? `Osuruk: ${Math.ceil(fartCooldown)}s` : "Osuruk: Hazir";
  rewindLabel.textContent = !completedFinalLevel
    ? "Zaman: Kilitli"
    : rewindUsed
      ? "Zaman: Kullanildi"
      : "Zaman: Hazir";
}

function updatePlayer(dt) {
  const forward = Number(pressed.has("KeyW") || pressed.has("ArrowUp") || touchMoves.has("forward"))
    - Number(pressed.has("KeyS") || pressed.has("ArrowDown") || touchMoves.has("backward"));
  const strafe = Number(pressed.has("KeyD") || pressed.has("ArrowRight") || touchMoves.has("right"))
    - Number(pressed.has("KeyA") || pressed.has("ArrowLeft") || touchMoves.has("left"));
  if (!forward && !strafe) return;

  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  const dx = (strafe * cos + forward * sin) * player.speed * dt;
  const dz = (forward * cos - strafe * sin) * player.speed * dt;
  moveActor(player.position, dx, dz, player.radius);
}

function updateMother(dt) {
  if (!mother.root) return;
  const distance = distance2D(mother.position, player.position);
  const config = levels[levelIndex];
  const seesPlayer = distance < config.hearRange && hasLineOfSight(mother.position, player.position);
  const hearsPlayer = distance < config.hearRange + 1.5 || timeInLevel > 0.45;
  mother.fleeTimer = Math.max(0, mother.fleeTimer - dt);

  let target;
  let speedBoost;
  let expression;
  if (mother.fleeTimer > 0) {
    target = getFleeTarget();
    speedBoost = 1.55;
    expression = "grossed";
  } else {
    target = hearsPlayer ? getMotherTarget(dt) : config.motherStart;
    speedBoost = seesPlayer ? 1.42 : hearsPlayer ? 1.1 : 0.55;
    expression = seesPlayer ? "angry" : hearsPlayer ? "talking" : "calm";
  }

  const direction = target.subtract(mother.position);
  direction.y = 0;
  if (direction.lengthSquared() > 0.02) {
    direction.normalize().scaleInPlace(mother.speed * speedBoost * dt);
    moveActor(mother.position, direction.x, direction.z, mother.radius);
  }

  mother.root.position.copyFrom(mother.position);
  mother.root.position.y = Math.sin(timeInLevel * 8) * 0.035;
  faceTarget(mother.root, player.position);
  updateMotherFace(expression, dt);
  maybeMotherSound(expression, dt);
  statusLabel.textContent = mother.fleeTimer > 0
    ? "Annen kaciyor!"
    : seesPlayer
      ? "Annen seni gordu!"
      : distance < 4
        ? "Annen cok yakin."
        : hearsPlayer
          ? "Annen seni ariyor."
          : "Ev sessiz.";

  if (distance < 0.78) startKiss();
}

function moveActor(position, dx, dz, radius) {
  const nextX = position.x + dx;
  if (!hitsCollider(nextX, position.z, radius)) position.x = nextX;
  const nextZ = position.z + dz;
  if (!hitsCollider(position.x, nextZ, radius)) position.z = nextZ;
}

function hitsCollider(x, z, radius) {
  return colliders.some((box) => (
    x + radius > box.minX
    && x - radius < box.maxX
    && z + radius > box.minZ
    && z - radius < box.maxZ
  ));
}

function getMotherTarget(dt) {
  mother.pathTimer -= dt;
  if (mother.pathTimer <= 0 || mother.path.length === 0) {
    mother.path = findPath(mother.position, player.position);
    mother.pathTimer = 0.22;
  }
  if (mother.path.length > 0) {
    const next = mother.path[0];
    if (distance2D(mother.position, next) < 0.34) mother.path.shift();
    if (mother.path[0]) return mother.path[0];
  }
  return player.position;
}

function getFleeTarget() {
  const away = mother.position.subtract(player.position);
  away.y = 0;
  if (away.lengthSquared() < 0.01) away.set(1, 0, 0);
  away.normalize().scaleInPlace(4.4);
  const half = levels[levelIndex].size / 2 - 1.2;
  return new BABYLON.Vector3(
    BABYLON.Scalar.Clamp(mother.position.x + away.x, -half, half),
    0,
    BABYLON.Scalar.Clamp(mother.position.z + away.z, -half, half),
  );
}

function findPath(from, to) {
  const start = worldToCell(from);
  const goal = worldToCell(to);
  if (!cellIsWalkable(goal.x, goal.z)) return [];
  const queue = [start];
  const cameFrom = new Map([[cellKey(start.x, start.z), null]]);
  const goalKey = cellKey(goal.x, goal.z);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (cellKey(current.x, current.z) === goalKey) break;
    for (const [dx, dz] of dirs) {
      const next = { x: current.x + dx, z: current.z + dz };
      const key = cellKey(next.x, next.z);
      if (cameFrom.has(key) || !cellIsWalkable(next.x, next.z)) continue;
      cameFrom.set(key, current);
      queue.push(next);
    }
  }

  if (!cameFrom.has(goalKey)) return [];
  const cells = [];
  let current = goal;
  while (current && cellKey(current.x, current.z) !== cellKey(start.x, start.z)) {
    cells.push(current);
    current = cameFrom.get(cellKey(current.x, current.z));
  }
  return cells.reverse().slice(0, 9).map((cell) => cellToWorld(cell.x, cell.z));
}

function worldToCell(position) {
  return {
    x: BABYLON.Scalar.Clamp(Math.round((position.x - gridMin) / GRID_STEP), 0, gridCount - 1),
    z: BABYLON.Scalar.Clamp(Math.round((position.z - gridMin) / GRID_STEP), 0, gridCount - 1),
  };
}

function cellToWorld(x, z) {
  return new BABYLON.Vector3(gridMin + x * GRID_STEP, 0, gridMin + z * GRID_STEP);
}

function cellIsWalkable(x, z) {
  if (x < 0 || z < 0 || x >= gridCount || z >= gridCount) return false;
  const point = cellToWorld(x, z);
  return !hitsCollider(point.x, point.z, mother.radius + 0.08);
}

function cellKey(x, z) {
  return `${x},${z}`;
}

function hasLineOfSight(from, to) {
  const origin = new BABYLON.Vector3(from.x, 0.9, from.z);
  const direction = new BABYLON.Vector3(to.x - from.x, 0, to.z - from.z);
  const distance = direction.length();
  if (distance <= 0.01) return true;
  direction.normalize();
  return !colliders.some((box) => {
    const min = new BABYLON.Vector3(box.minX, 0, box.minZ);
    const max = new BABYLON.Vector3(box.maxX, 2.5, box.maxZ);
    const hit = BABYLON.Ray.CreateNewFromTo(origin, origin.add(direction.scale(distance))).intersectsBoxMinMax(min, max);
    return hit;
  });
}

function updateKeys(dt) {
  const required = levels[levelIndex].keyCount;
  for (const key of keys) {
    if (key.found) continue;
    key.mesh.rotation.y += dt * 2.8;
    key.mesh.position.y = key.baseY + Math.sin(timeInLevel * 3 + key.mesh.position.x) * 0.08;
    if (distance2D(key.mesh.position, player.position) < 0.82) {
      key.found = true;
      key.mesh.setEnabled(false);
      keysFound += 1;
      updateHud(keysFound === required ? "Kapi acildi. Cikisa kos!" : "Anahtar bulundu.");
    }
  }
}

function updateDoor() {
  if (!door || keysFound < levels[levelIndex].keyCount) return;
  door.rotation.y = Math.sin(Math.min(timeInLevel, 1.6)) * 0.85;
  if (distance2D(door.position, player.position) < 1.25) nextLevel();
}

function nextLevel() {
  if (levelIndex >= levels.length - 1) {
    win();
    return;
  }
  unlockedLevel = Math.max(unlockedLevel, levelIndex + 1);
  selectedLevelIndex = levelIndex + 1;
  saveProgress();
  gameState = "level-complete";
  document.exitPointerLock?.();
  showOverlay("Seviye Gecti", "Yeni ev daha buyuk, daha cok anahtar var ve annen daha hizli.", "Sonraki Level", "next");
}

function win() {
  gameState = "won";
  unlockedLevel = levels.length - 1;
  completedFinalLevel = true;
  selectedLevelIndex = levelIndex;
  saveProgress();
  document.exitPointerLock?.();
  showOverlay("Kazandin!", "Butun leveller acildi. T ile her levelde bir kez zamani geri sarabilirsin.", `${levels[selectedLevelIndex].name} Basla`, "start");
}

function startKiss() {
  if (gameState !== "playing") return;
  gameState = "kiss";
  kissTimer = 0;
  document.exitPointerLock?.();
  playKissSound();
  createKissHearts();
  updateMotherFace("kiss", 0.016);
}

function updateKiss(dt) {
  kissTimer += dt;
  const direction = player.position.subtract(mother.position);
  direction.y = 0;
  if (direction.lengthSquared() > 0.01) {
    direction.normalize().scaleInPlace(dt * 1.55);
    mother.position.addInPlace(direction);
  }
  mother.root.position.copyFrom(mother.position);
  faceTarget(mother.root, player.position);
  updateMotherFace("kiss", dt);
  updateKissHearts(dt);
  statusLabel.textContent = "Opme animasyonu!";
  if (kissTimer > 1.85) lose();
}

function lose() {
  gameState = "lost";
  clearKissHearts();
  showOverlay("Yakalandin!", "Ayni levelden tekrar deneyeceksin.", "Ayni Leveli Dene", "retry");
}

function updateMotherFace(expression, dt) {
  if (!mother.face) return;
  mother.expression = expression;
  const { leftBrow, rightBrow, mouth, kiss } = mother.face;
  kiss.setEnabled(false);
  if (expression === "angry") {
    leftBrow.rotation.z = -0.45;
    rightBrow.rotation.z = 0.45;
    mouth.scaling.set(1.05, 0.32, 1);
  } else if (expression === "grossed") {
    leftBrow.rotation.z = 0.45;
    rightBrow.rotation.z = -0.45;
    mouth.scaling.set(0.75 + Math.sin(timeInLevel * 18) * 0.08, 1.0, 1);
  } else if (expression === "kiss") {
    leftBrow.rotation.z = 0;
    rightBrow.rotation.z = 0;
    mouth.scaling.set(0.65, 0.8, 1);
    kiss.setEnabled(true);
  } else if (expression === "talking") {
    leftBrow.rotation.z = Math.sin(timeInLevel * 7) * 0.12;
    rightBrow.rotation.z = -Math.sin(timeInLevel * 7) * 0.12;
    mouth.scaling.set(1.0, 0.35 + Math.abs(Math.sin(timeInLevel * 12)) * 0.55, 1);
  } else {
    leftBrow.rotation.z = 0;
    rightBrow.rotation.z = 0;
    mouth.scaling.set(1.15, 0.45, 1);
  }
  mouth.rotation.y = Math.sin(timeInLevel * 4) * 0.08 * dt * 60;
}

function maybeMotherSound(expression, dt) {
  if (expression !== "talking" && expression !== "angry") return;
  mother.talkTimer -= dt;
  if (mother.talkTimer > 0) return;
  mother.talkTimer = expression === "angry" ? 1.45 : 2.3;
  playMumble(expression === "angry");
}

function createKissHearts() {
  clearKissHearts();
  for (let i = 0; i < 8; i += 1) {
    const heart = BABYLON.MeshBuilder.CreateSphere("kissHeart", { diameter: 0.16, segments: 10 }, scene);
    heart.material = materials.heart;
    heart.position.set(
      player.position.x + (Math.random() - 0.5) * 1.1,
      player.position.y - 0.25 + Math.random() * 0.8,
      player.position.z + (Math.random() - 0.5) * 1.1,
    );
    heart.scaling.set(1, 0.8, 0.55);
    heart.metadata = { speed: 0.6 + Math.random() * 0.5 };
    kissHearts.push(heart);
  }
}

function updateKissHearts(dt) {
  kissHearts.forEach((heart, index) => {
    heart.position.y += heart.metadata.speed * dt;
    heart.rotation.y += dt * (2 + index * 0.1);
    if (heart.position.y > player.position.y + 1.1) heart.position.y = player.position.y - 0.35;
  });
}

function clearKissHearts() {
  for (const heart of kissHearts) heart.dispose();
  kissHearts = [];
}

function triggerFart() {
  if (gameState !== "playing" || fartCooldown > 0) return;
  ensureAudio();
  fartCooldown = 10;
  mother.fleeTimer = 3.6;
  mother.path = [];
  mother.pathTimer = 0;
  playFart();
  statusLabel.textContent = "Annen kaciyor!";
}

function recordRewindSnapshot(dt) {
  if (!completedFinalLevel || rewindUsed) return;
  rewindTimer -= dt;
  if (rewindTimer > 0) return;
  rewindTimer = 0.18;
  rewindSnapshots.push({
    timeInLevel,
    player: {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      yaw: player.yaw,
      pitch: player.pitch,
    },
    mother: {
      x: mother.position.x,
      z: mother.position.z,
      fleeTimer: mother.fleeTimer,
      talkTimer: mother.talkTimer,
      expression: mother.expression,
    },
    keysFound,
    keyStates: keys.map((key) => key.found),
    fartCooldown,
  });
  while (rewindSnapshots.length > Math.ceil(REWIND_SECONDS / 0.18)) rewindSnapshots.shift();
}

function triggerRewind() {
  if (gameState !== "playing") return;
  if (!completedFinalLevel) {
    statusLabel.textContent = "Zaman gucu 5. level bitince acilir.";
    return;
  }
  if (rewindUsed) {
    statusLabel.textContent = "Bu levelde zaman gucu kullanildi.";
    return;
  }
  if (rewindSnapshots.length < 4) {
    statusLabel.textContent = "Zaman gucu icin biraz bekle.";
    return;
  }
  const snapshot = rewindSnapshots[0];
  rewindUsed = true;
  rewindSnapshots = [];
  timeInLevel = snapshot.timeInLevel;
  player.position.set(snapshot.player.x, snapshot.player.y, snapshot.player.z);
  player.yaw = snapshot.player.yaw;
  player.pitch = snapshot.player.pitch;
  mother.position.set(snapshot.mother.x, 0, snapshot.mother.z);
  mother.fleeTimer = snapshot.mother.fleeTimer;
  mother.talkTimer = snapshot.mother.talkTimer;
  mother.expression = snapshot.mother.expression;
  mother.path = [];
  keysFound = snapshot.keysFound;
  snapshot.keyStates.forEach((found, index) => {
    if (!keys[index]) return;
    keys[index].found = found;
    keys[index].mesh.setEnabled(!found);
  });
  fartCooldown = snapshot.fartCooldown;
  updateHud("Zaman geri sarildi!");
  playRewindSound();
}

function updateCamera() {
  camera.position.copyFrom(player.position);
  camera.rotation.set(player.pitch, player.yaw, 0);
}

function updateHud(message) {
  levelLabel.textContent = levels[levelIndex].name;
  keyLabel.textContent = `Anahtar: ${keysFound}/${levels[levelIndex].keyCount}`;
  statusLabel.textContent = message;
  hintLabel.textContent = keysFound >= levels[levelIndex].keyCount
    ? "Kapi acildi. Kapiya git."
    : completedFinalLevel
      ? `${levels[levelIndex].keyCount} anahtari bul. V osuruk, T zaman geri sarma.`
      : `${levels[levelIndex].keyCount} anahtari bul. V ile anneni uzaklastir.`;
}

function faceTarget(node, target) {
  const dx = target.x - node.position.x;
  const dz = target.z - node.position.z;
  node.rotation.y = Math.atan2(dx, dz);
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function ensureAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
}

function playTone(frequency, start, duration, type = "sine", volume = 0.12) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + start);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + start);
  oscillator.stop(audioContext.currentTime + start + duration + 0.03);
}

function playFart() {
  playTone(74, 0, 0.28, "sawtooth", 0.16);
  playTone(53, 0.12, 0.36, "square", 0.1);
  playTone(92, 0.32, 0.18, "triangle", 0.09);
}

function playMumble(angry = false) {
  ensureAudio();
  const base = angry ? 190 : 145;
  playTone(base, 0, 0.12, "triangle", 0.07);
  playTone(base * 1.35, 0.13, 0.1, "triangle", 0.06);
  playTone(base * 0.85, 0.26, 0.16, "triangle", 0.07);
}

function playKissSound() {
  ensureAudio();
  playTone(520, 0, 0.08, "sine", 0.08);
  playTone(760, 0.08, 0.12, "sine", 0.1);
}

function playRewindSound() {
  ensureAudio();
  playTone(660, 0, 0.08, "triangle", 0.08);
  playTone(440, 0.08, 0.1, "triangle", 0.08);
  playTone(260, 0.18, 0.16, "triangle", 0.09);
}

function resize() {
  engine.resize();
  camera.fov = window.innerWidth < 600 ? 1.55 : 1.2;
}
