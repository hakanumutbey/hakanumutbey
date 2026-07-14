import "./styles.css";
import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  UniversalCamera,
  Vector3,
} from "@babylonjs/core";

const canvas = document.querySelector("#game");
const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true,
  antialias: true,
});

const ui = {
  money: document.querySelector("#money"),
  round: document.querySelector("#round"),
  damage: document.querySelector("#damage"),
  floor: document.querySelector("#floor"),
  speedLevel: document.querySelector("#speedLevel"),
  carCount: document.querySelector("#carCount"),
  status: document.querySelector("#status"),
  parkMeter: document.querySelector("#parkMeter"),
  owner: document.querySelector("#owner"),
  missionCar: document.querySelector("#missionCar"),
  missionText: document.querySelector("#missionText"),
  prompt: document.querySelector("#prompt"),
  shop: document.querySelector("#shop"),
  buySpeed: document.querySelector("#buySpeed"),
  buyFloor: document.querySelector("#buyFloor"),
  closeShop: document.querySelector("#closeShop"),
  shopInfo: document.querySelector("#shopInfo"),
};

const state = {
  money: 120,
  round: 1,
  damage: 0,
  mode: "foot",
  phase: "pickup",
  speed: 0,
  steering: 0,
  parkHold: 0,
  collisionCooldown: 0,
  messageTimer: 0,
  taskIndex: -1,
  vehicle: null,
  drivingCar: null,
  missionType: "park",
  targetSlot: null,
  playerYaw: 0,
  lookYaw: 0,
  lookPitch: 0,
  carLookYaw: 0,
  playerVelocityY: 0,
  playerGrounded: true,
  parkedSlot: null,
  parkedCars: [],
  unlockedFloors: 1,
  speedLevel: 0,
  shopOpen: false,
  keys: new Set(),
};

const music = {
  context: null,
  gain: null,
  timer: null,
  step: 0,
  started: false,
};

const CAR_SIZE = { width: 1.7, length: 3.3 };
const CAR_HITBOX = { width: 2.18, length: 3.18 };
const CAR_COLLIDER = { halfW: CAR_HITBOX.width / 2, halfD: CAR_HITBOX.length / 2 };
const LOT_LIMIT_X = 19.2;
const LOT_LIMIT_Z = 17.2;
const MAX_FORWARD = 8.5;
const MAX_REVERSE = -4.1;
const ACCELERATION = 12.5;
const BRAKE_FORCE = 18;
const FRICTION = 5.2;
const STEER_RATE = 2.7;
const PARK_SECONDS = 1.3;
const WALK_SPEED = 5.4;
const RUN_MULTIPLIER = 1.75;
const JUMP_FORCE = 6.2;
const GRAVITY = 18.5;
const ARRIVAL_INTERVAL_MS = 30000;
const OWNER_RETURN_MIN_MS = 5 * 60000;
const OWNER_RETURN_MAX_MS = 10 * 60000;
const MAX_VISIBLE_QUEUE = 3;
const LEVEL_HEIGHT = 3.3;
const MAX_FLOORS = 10;
const MAX_SPEED_LEVEL = 10;
const FLOOR_COSTS = Array.from({ length: MAX_FLOORS + 1 }, (_, index) => Math.round(220 + index * index * 55));
const SPEED_COSTS = Array.from({ length: MAX_SPEED_LEVEL }, (_, index) => Math.round(150 + index * index * 70));
const RAMP_CENTER_Z = -9.4;
const RAMP_Z_MIN = -13.85;
const RAMP_Z_MAX = -4.95;
const RAMP_ANGLE = Math.atan2(LEVEL_HEIGHT, RAMP_Z_MAX - RAMP_Z_MIN);

const scene = new Scene(engine);
scene.clearColor = new Color4(0.52, 0.78, 1, 1);

const camera = new UniversalCamera(
  "camera",
  new Vector3(0, 1.65, 0),
  scene,
);
camera.minZ = 0.05;
camera.fov = 1.08;
camera.speed = 0;
camera.inertia = 0.25;
camera.angularSensibility = 4500;
camera.keysUp = [];
camera.keysDown = [];
camera.keysLeft = [];
camera.keysRight = [];

const sun = new DirectionalLight("sun", new Vector3(-0.35, -1, -0.45), scene);
sun.position = new Vector3(18, 28, 14);
sun.intensity = 2.75;

const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
ambient.intensity = 0.82;
ambient.groundColor = new Color3(0.36, 0.42, 0.34);

const shadows = new ShadowGenerator(2048, sun);
shadows.useBlurExponentialShadowMap = true;
shadows.blurKernel = 22;

const baseOwnerNames = [
  "Mert", "Zeynep", "Deniz", "Elif", "Can", "Aylin", "Kerem", "Ece", "Bora", "Selin",
  "Arda", "Derya", "Kaan", "Mina", "Emir", "Lara", "Umut", "Seda", "Onur", "Nisa",
  "Baran", "İpek", "Tolga", "Cem", "Defne", "Yusuf", "Ada", "Eren", "Melis", "Ozan",
];

const ownerNames = Array.from({ length: 100 }, (_, index) => {
  const suffix = Math.floor(index / baseOwnerNames.length) + 1;
  return `${baseOwnerNames[index % baseOwnerNames.length]} ${suffix}`;
});

const ownerSymbols = ownerNames.map((owner, index) => ({
  owner,
  index,
  materialName: `ownerSymbol${index}`,
}));

const materials = createMaterials(scene);
const colliders = [];
const serviceCars = [];
const drivableCars = [];
const people = [];
const floorStructures = [];
let rampAccess = null;
let marketSeller = null;
const queueSpots = [
  { x: -5.8, z: 14.1, rot: -Math.PI / 2 },
  { x: -1.8, z: 14.1, rot: -Math.PI / 2 },
  { x: 2.2, z: 14.1, rot: -Math.PI / 2 },
];

const parkSlots = [
  { name: "kuzey mavi cep", x: -8.7, z: -6.2, rot: 0, color: materials.slotBlue },
  { name: "kuzey yeşil cep", x: -2.9, z: -6.2, rot: 0, color: materials.slotMint },
  { name: "kuzey sarı cep", x: 2.9, z: -6.2, rot: 0, color: materials.slotYellow },
  { name: "kuzey kırmızı cep", x: 8.7, z: -6.2, rot: 0, color: materials.slotRose },
  { name: "kuzey mor cep", x: 14.5, z: -6.2, rot: 0, color: materials.slotBlue },
  { name: "kuzey turuncu cep", x: -14.5, z: -6.2, rot: 0, color: materials.slotYellow },
  { name: "güney sarı cep", x: -8.7, z: 7.4, rot: Math.PI, color: materials.slotYellow },
  { name: "güney kırmızı cep", x: -2.9, z: 7.4, rot: Math.PI, color: materials.slotRose },
  { name: "güney mavi cep", x: 2.9, z: 7.4, rot: Math.PI, color: materials.slotBlue },
  { name: "güney yeşil cep", x: 8.7, z: 7.4, rot: Math.PI, color: materials.slotMint },
  { name: "güney mavi uzun cep", x: 14.5, z: 7.4, rot: Math.PI, color: materials.slotMint },
  { name: "güney sarı uzun cep", x: -14.5, z: 7.4, rot: Math.PI, color: materials.slotRose },
  { name: "batı cep", x: -15.8, z: 0.8, rot: Math.PI / 2, color: materials.slotMint },
  { name: "doğu cep", x: 15.8, z: 0.8, rot: -Math.PI / 2, color: materials.slotYellow },
];

const customerLines = [
  "Sahibi: Arabamı çizmeden al, boş gördüğün çizili yere bırak.",
  "Sahibi: Anahtar sende. Doğru araca bin, yanlış arabaya dokunma.",
  "Sahibi: Lütfen sakin sür. Çarparsan ücretten düşerim.",
  "Sahibi: Arabam hazır, park yerini sen seç.",
];

buildLot();
const player = createPlayer();
const targetMarker = createTargetMarker();
const carMarker = createCarMarker();
const selectedGlow = createSelectedGlow();
const customers = createCustomers();
createServiceCars();
placePlayerAtStart();
setPlayerBodyVisible(false);
assignNextTask();
updateShop();

window.addEventListener("keydown", (event) => {
  const handledCodes = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyM", "Digit1", "Digit2", "Escape", "Space", "ShiftLeft", "ShiftRight"];
  if (handledCodes.includes(event.code)) {
    event.preventDefault();
    startMusic();
    if (!state.shopOpen || ["KeyM", "Digit1", "Digit2"].includes(event.code)) {
      state.keys.add(event.code);
    }
  }

  if (event.code === "KeyM" && !event.repeat) {
    toggleShop();
  }

  if (event.code === "Escape" && state.shopOpen && !event.repeat) {
    closeShop();
  }

  if (state.shopOpen && event.code === "Digit1" && !event.repeat) {
    buySpeedUpgrade();
  }

  if (state.shopOpen && event.code === "Digit2" && !event.repeat) {
    buyNextFloor();
  }

  if (state.shopOpen && !["KeyM", "Digit1", "Digit2", "Escape"].includes(event.code)) {
    return;
  }

  if (event.code === "KeyE" && !event.repeat) {
    interact();
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

ui.buySpeed.addEventListener("click", buySpeedUpgrade);
ui.buyFloor.addEventListener("click", buyNextFloor);
ui.closeShop.addEventListener("click", closeShop);

canvas.addEventListener("click", (event) => {
  if (tryOpenShopFromSeller(event)) return;
  canvas.requestPointerLock?.();
});

window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;

  const sensitivity = 0.0022;
  state.lookPitch = clamp(state.lookPitch + event.movementY * sensitivity, -0.58, 0.58);

  if (state.mode === "driving") {
    state.carLookYaw = clamp(state.carLookYaw + event.movementX * sensitivity, -Math.PI, Math.PI);
  } else {
    state.lookYaw += event.movementX * sensitivity;
  }
});

window.addEventListener("resize", () => {
  engine.resize();
});

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.033);

  if (state.mode === "driving") {
    updateCar(dt);
  } else {
    updatePlayer(dt);
  }

  updatePushedCars(dt);
  resolveCarOverlaps();
  updatePeople(dt);
  updateParking(dt);
  updateCamera(dt);
  updateMarkers();
  updateTimers(dt);
});

engine.runRenderLoop(() => {
  scene.render();
});

function createMaterials(activeScene) {
  const make = (name, diffuse, specular = new Color3(0.12, 0.12, 0.12)) => {
    const mat = new StandardMaterial(name, activeScene);
    mat.diffuseColor = diffuse;
    mat.specularColor = specular;
    return mat;
  };

  const mats = {
    asphalt: make("asphalt", new Color3(0.14, 0.16, 0.15)),
    asphaltDark: make("asphaltDark", new Color3(0.09, 0.1, 0.095)),
    ramp: make("ramp", new Color3(0.32, 0.36, 0.34), new Color3(0.35, 0.38, 0.35)),
    line: make("line", new Color3(0.93, 0.88, 0.67)),
    curb: make("curb", new Color3(0.75, 0.78, 0.72)),
    grass: make("grass", new Color3(0.13, 0.29, 0.2)),
    wall: make("wall", new Color3(0.34, 0.36, 0.33)),
    whiteCar: make("whiteCar", new Color3(0.92, 0.93, 0.88), new Color3(0.7, 0.72, 0.68)),
    redCar: make("redCar", new Color3(0.86, 0.08, 0.06), new Color3(0.7, 0.46, 0.42)),
    blueCar: make("blueCar", new Color3(0.08, 0.2, 0.62), new Color3(0.38, 0.46, 0.72)),
    greenCar: make("greenCar", new Color3(0.12, 0.5, 0.36), new Color3(0.43, 0.62, 0.52)),
    yellowCar: make("yellowCar", new Color3(0.86, 0.63, 0.18), new Color3(0.63, 0.52, 0.34)),
    carTop: make("carTop", new Color3(0.95, 0.95, 0.9), new Color3(0.6, 0.6, 0.55)),
    glass: make("glass", new Color3(0.11, 0.23, 0.28), new Color3(0.7, 0.82, 0.88)),
    headlight: make("headlight", new Color3(1, 0.92, 0.58), new Color3(1, 0.92, 0.68)),
    tailLight: make("tailLight", new Color3(0.9, 0.05, 0.05), new Color3(0.7, 0.18, 0.16)),
    tire: make("tire", new Color3(0.018, 0.018, 0.017)),
    uniform: make("uniform", new Color3(0.08, 0.18, 0.2)),
    skin: make("skin", new Color3(0.72, 0.49, 0.35)),
    customer: make("customer", new Color3(0.46, 0.29, 0.65)),
    shopFront: make("shopFront", new Color3(0.26, 0.34, 0.33), new Color3(0.24, 0.28, 0.26)),
    shopAwning: make("shopAwning", new Color3(0.78, 0.2, 0.24), new Color3(0.45, 0.22, 0.2)),
    slotBlue: make("slotBlue", new Color3(0.1, 0.42, 0.88)),
    slotMint: make("slotMint", new Color3(0.13, 0.63, 0.46)),
    slotYellow: make("slotYellow", new Color3(0.92, 0.63, 0.13)),
    slotRose: make("slotRose", new Color3(0.82, 0.2, 0.34)),
    neon: make("neon", new Color3(0.45, 1, 0.72), new Color3(0.6, 1, 0.8)),
  };

  mats.glow = make("glow", new Color3(0.54, 1, 0.7), new Color3(0.7, 1, 0.85));
  mats.glow.emissiveColor = new Color3(0.34, 1, 0.68);
  mats.glow.alpha = 0.5;

  mats.warningGlow = make("warningGlow", new Color3(1, 0.82, 0.24), new Color3(1, 0.9, 0.45));
  mats.warningGlow.emissiveColor = new Color3(1, 0.72, 0.15);
  mats.warningGlow.alpha = 0.38;

  for (let index = 0; index < ownerNames.length; index += 1) {
    const color = Color3.FromHSV((index * 137.5) % 360, 0.78, 0.95);
    const mat = make(`ownerSymbol${index}`, color, Color3.White().scale(0.7));
    mat.emissiveColor = color.scale(0.52);
    mats[`ownerSymbol${index}`] = mat;
  }

  return mats;
}

function buildLot() {
  const ground = MeshBuilder.CreateBox("ground", { width: 39, height: 0.22, depth: 35 }, scene);
  ground.position.y = -0.11;
  ground.material = materials.asphalt;
  ground.receiveShadows = true;

  const grassLeft = MeshBuilder.CreateBox("grassLeft", { width: 6, height: 0.18, depth: 36 }, scene);
  grassLeft.position.set(-23, -0.08, 0);
  grassLeft.material = materials.grass;
  grassLeft.receiveShadows = true;

  const grassRight = grassLeft.clone("grassRight");
  grassRight.position.x = 23;
  grassRight.material = materials.grass;

  addBox("northWall", 0, 0.55, -18.1, 39.5, 1.1, 0.45, materials.wall, true);
  addBox("southWall", 0, 0.55, 18.1, 39.5, 1.1, 0.45, materials.wall, true);
  addBox("westWall", -19.75, 0.55, 0, 0.45, 1.1, 36, materials.wall, true);
  addBox("eastWall", 19.75, 0.55, 0, 0.45, 1.1, 36, materials.wall, true);

  createMultiLevelParking();
  createMarketStand();

  for (const x of [-17.4, -11.8, -5.8, 0, 5.8, 11.8, 17.4]) {
    const lamp = addBox(`lamp-${x}`, x, 2.2, 15.4, 0.24, 4.4, 0.24, materials.curb, true);
    const cap = MeshBuilder.CreateSphere(`lampCap-${x}`, { diameter: 0.56, segments: 16 }, scene);
    cap.position.set(x, 4.55, 15.4);
    cap.material = materials.neon;
    shadows.addShadowCaster(lamp);
    shadows.addShadowCaster(cap);
  }
}

function createMultiLevelParking() {
  for (let floor = 2; floor <= MAX_FLOORS; floor += 1) {
    const y = floorHeight(floor - 1);
    const meshes = [];
    const deck = MeshBuilder.CreateBox(`floor-${floor}-deck`, { width: 30, height: 0.28, depth: 10 }, scene);
    deck.position.set(0, y, -13.0);
    deck.material = materials.asphaltDark;
    deck.receiveShadows = true;
    shadows.addShadowCaster(deck);
    meshes.push(deck);

    for (const x of [-13, -6.5, 6.5]) {
      const pillar = addBox(`floor-${floor}-pillar-${x}`, x, y - LEVEL_HEIGHT / 2, -13, 0.5, LEVEL_HEIGHT, 0.5, materials.curb, true);
      const pillarCollider = colliders.find((collider) => collider.mesh === pillar);
      if (pillarCollider) {
        pillarCollider.halfH = (LEVEL_HEIGHT - 0.8) / 2;
        pillarCollider.yOffset = -0.4;
      }
      meshes.push(pillar);
      meshes.push(addLine(x, y + 0.18, -13, 0.16, 0.02, 8.2, materials.line));
    }

    for (const x of [-11.6, -5.8, 0, 5.8, 11.6]) {
      const upperLine = addLine(x, y + 0.18, -13, 0.12, 0.02, 8.4, materials.line);
      upperLine.receiveShadows = true;
      meshes.push(upperLine);
    }

    floorStructures.push({ floor, meshes });
  }

  const segments = [];
  for (let baseFloor = 0; baseFloor < MAX_FLOORS - 1; baseFloor += 1) {
    const baseY = floorHeight(baseFloor);
    const ramp = MeshBuilder.CreateBox(`rampSegment-${baseFloor}`, { width: 7, height: 0.24, depth: 9 }, scene);
    ramp.position.set(14.0, baseY + LEVEL_HEIGHT / 2, RAMP_CENTER_Z);
    ramp.rotation.x = RAMP_ANGLE;
    ramp.material = materials.ramp;
    ramp.receiveShadows = true;
    shadows.addShadowCaster(ramp);

    const edges = [10.6, 17.4].map((x) => {
      const edge = MeshBuilder.CreateBox(`rampEdge-${baseFloor}-${x}`, { width: 0.16, height: 0.06, depth: 8.8 }, scene);
      edge.position.set(x, baseY + LEVEL_HEIGHT / 2 + 0.17, RAMP_CENTER_Z);
      edge.rotation.x = RAMP_ANGLE;
      edge.material = materials.line;
      return edge;
    });

    const arrows = [-12.9, -10.9, -8.9].map((z) => {
      const arrow = MeshBuilder.CreateCylinder(`rampArrow-${baseFloor}-${z}`, {
        diameterTop: 0,
        diameterBottom: 0.72,
        height: 1.0,
        tessellation: 3,
      }, scene);
      arrow.position.set(14, baseY + rampRiseAtZ(z) + 0.28, z);
      arrow.rotation.x = Math.PI / 2 + RAMP_ANGLE;
      arrow.rotation.y = Math.PI / 6;
      arrow.material = materials.line;
      return arrow;
    });

    segments.push({ baseFloor, ramp, edges, arrows });
  }

  rampAccess = { segments };
  updateFloorAccess();
}

function createMarketStand() {
  const body = addBox("marketBuilding", -13.8, 1.55, 20.8, 6.2, 3.1, 2.4, materials.shopFront, false);
  const glass = addBox("marketGlass", -13.8, 1.42, 19.54, 4.9, 1.55, 0.08, materials.glass, false);
  const awning = addBox("marketAwning", -13.8, 2.48, 19.25, 5.8, 0.32, 0.9, materials.shopAwning, false);
  const counter = addBox("marketCounter", -13.8, 0.62, 19.25, 4.6, 0.42, 0.5, materials.carTop, false);
  const sign = MeshBuilder.CreateBox("marketSign", { width: 2.2, height: 0.52, depth: 0.12 }, scene);
  sign.position.set(-13.8, 3.38, 19.46);
  sign.material = materials.neon;
  shadows.addShadowCaster(body);
  shadows.addShadowCaster(glass);
  shadows.addShadowCaster(awning);
  shadows.addShadowCaster(counter);
  shadows.addShadowCaster(sign);

  marketSeller = createPersonModel("marketSeller", materials.customer);
  marketSeller.position.set(-13.8, 0, 17.15);
  marketSeller.rotation.y = Math.PI;
  for (const mesh of marketSeller.getChildMeshes()) {
    mesh.metadata = { marketSeller: true };
  }
}

function updateFloorAccess() {
  for (const structure of floorStructures) {
    const enabled = structure.floor <= state.unlockedFloors;
    for (const mesh of structure.meshes) {
      mesh.setEnabled(enabled);
    }
  }

  if (!rampAccess) return;

  for (const segment of rampAccess.segments) {
    const enabled = segment.baseFloor < state.unlockedFloors - 1;
    segment.ramp.setEnabled(enabled);
    for (const edge of segment.edges) {
      edge.setEnabled(enabled);
    }
    for (const arrow of segment.arrows) {
      arrow.setEnabled(enabled);
    }
  }
}

function tryOpenShopFromSeller(event) {
  if (state.shopOpen || !marketSeller) return false;

  const pick = scene.pick(event.clientX, event.clientY, (mesh) => Boolean(mesh.metadata?.marketSeller));
  if (!pick?.hit) return false;

  openShop();
  return true;
}

function toggleShop() {
  if (state.shopOpen) {
    closeShop();
  } else {
    openShop();
  }
}

function openShop() {
  state.shopOpen = true;
  document.exitPointerLock?.();
  state.keys.clear();
  updateShop();
  updateUi("Market açıldı: 1 hız, 2 kat, Esc çıkış");
}

function closeShop() {
  state.shopOpen = false;
  state.keys.clear();
  updateShop();
  updateUi("Market kapandı");
}

function buySpeedUpgrade() {
  if (state.speedLevel >= MAX_SPEED_LEVEL) {
    updateUi("Hız son seviyede");
    updateShop();
    return;
  }

  const cost = SPEED_COSTS[state.speedLevel];
  if (state.money < cost) {
    updateUi(`Hız için ₺${cost} lazım`);
    return;
  }

  state.money -= cost;
  state.speedLevel += 1;
  updateUi(`Hız yükseldi: seviye ${state.speedLevel + 1}`);
  updateShop();
}

function buyNextFloor() {
  if (state.unlockedFloors >= MAX_FLOORS) {
    updateUi("Bütün katlar açık");
    updateShop();
    return;
  }

  const nextFloor = state.unlockedFloors + 1;
  const cost = FLOOR_COSTS[nextFloor];
  if (state.money < cost) {
    updateUi(`${nextFloor}. kat için ₺${cost} lazım`);
    return;
  }

  state.money -= cost;
  state.unlockedFloors = nextFloor;
  updateFloorAccess();
  updateUi(`${nextFloor}. kat açıldı`);
  updateShop();
}

function updateShop() {
  ui.shop.classList.toggle("open", state.shopOpen);
  ui.floor.textContent = `${state.unlockedFloors}/${MAX_FLOORS}`;
  ui.speedLevel.textContent = String(state.speedLevel + 1);

  if (state.speedLevel >= MAX_SPEED_LEVEL) {
    ui.buySpeed.textContent = "1 Hız son";
    ui.buySpeed.disabled = true;
  } else {
    const speedCost = SPEED_COSTS[state.speedLevel];
    ui.buySpeed.textContent = `1 Hız al ₺${speedCost}`;
    ui.buySpeed.disabled = state.money < speedCost;
  }

  if (state.unlockedFloors >= MAX_FLOORS) {
    ui.buyFloor.textContent = "2 Kat son";
    ui.buyFloor.disabled = true;
  } else {
    const nextFloor = state.unlockedFloors + 1;
    const floorCost = FLOOR_COSTS[nextFloor];
    ui.buyFloor.textContent = `2 ${nextFloor}. kat ₺${floorCost}`;
    ui.buyFloor.disabled = state.money < floorCost;
  }

  ui.shopInfo.textContent = state.shopOpen
    ? `Açık kat: ${state.unlockedFloors}/${MAX_FLOORS} • Esc veya M ile çık`
    : "M veya satıcıya tıkla";
}

function createParkingSlot(slot) {
  const pad = MeshBuilder.CreateBox(`slot-${slot.x}-${slot.z}`, {
    width: 4.3,
    height: 0.035,
    depth: 5,
  }, scene);
  pad.position.set(slot.x, 0.016, slot.z);
  pad.rotation.y = slot.rot;
  pad.material = materials.asphaltDark;
  pad.receiveShadows = true;

  const front = addLine(slot.x, 0.04, slot.z - Math.cos(slot.rot) * 2.45, 4.3, 0.04, 0.16);
  front.rotation.y = slot.rot;
  const left = addLine(slot.x - 2.1, 0.04, slot.z, 0.16, 0.04, 5);
  left.rotation.y = slot.rot;
  const right = addLine(slot.x + 2.1, 0.04, slot.z, 0.16, 0.04, 5);
  right.rotation.y = slot.rot;

  const wash = MeshBuilder.CreateBox(`slotColor-${slot.x}-${slot.z}`, {
    width: 3.5,
    height: 0.02,
    depth: 4.2,
  }, scene);
  wash.position.set(slot.x, 0.053, slot.z);
  wash.rotation.y = slot.rot;
  wash.material = slot.color;
  wash.visibility = 0.22;
}

function addLine(x, y, z, width, height, depth, material = materials.line) {
  const mesh = MeshBuilder.CreateBox("line", { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  mesh.material = material;
  return mesh;
}

function addBox(name, x, y, z, width, height, depth, material, collides) {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  mesh.material = material;
  mesh.receiveShadows = true;
  shadows.addShadowCaster(mesh);

  if (collides) {
    colliders.push({
      mesh,
      halfW: width / 2,
      halfH: height / 2,
      halfD: depth / 2,
      padding: 0.04,
    });
  }

  return mesh;
}

function createPlayer() {
  const root = new TransformNode("player", scene);

  const body = MeshBuilder.CreateCylinder("playerBody", {
    diameterTop: 0.52,
    diameterBottom: 0.68,
    height: 1.15,
    tessellation: 16,
  }, scene);
  body.position.y = 0.76;
  body.material = materials.uniform;
  body.parent = root;

  const head = MeshBuilder.CreateSphere("playerHead", { diameter: 0.42, segments: 16 }, scene);
  head.position.y = 1.56;
  head.material = materials.skin;
  head.parent = root;

  for (const mesh of root.getChildMeshes()) {
    shadows.addShadowCaster(mesh);
  }

  return root;
}

function createCustomers() {
  return ownerSymbols.map((symbol, index) => {
    const lane = index % queueSpots.length;
    return createCustomer(symbol.owner, -17.2 + lane * 1.6, 14.6 + Math.floor(index / queueSpots.length) * 0.15, symbol);
  });
}

function createCustomer(name, x, z, symbol) {
  const root = new TransformNode("customer", scene);
  root.position.set(x, 0, z);

  const body = MeshBuilder.CreateCylinder("customerBody", {
    diameterTop: 0.5,
    diameterBottom: 0.62,
    height: 1.08,
    tessellation: 16,
  }, scene);
  body.position.y = 0.72;
  body.material = materials.customer;
  body.parent = root;

  const head = MeshBuilder.CreateSphere("customerHead", { diameter: 0.4, segments: 16 }, scene);
  head.position.y = 1.48;
  head.material = materials.skin;
  head.parent = root;

  createOwnerSymbol(`owner-${name}`, symbol, root, 2.22, 0.62);

  for (const mesh of root.getChildMeshes()) {
    shadows.addShadowCaster(mesh);
  }

  const person = {
    name,
    root,
    customer: true,
    active: false,
    ai: false,
    yelpCooldown: 0,
  };
  people.push(person);
  colliders.push({
    mesh: root,
    halfW: 0.46,
    halfH: 0.88,
    halfD: 0.46,
    yOffset: 0.82,
    padding: 0.05,
    person,
  });

  return root;
}

function createRandomPeople() {
  const specs = [
    { name: "Ali", x: -12.5, z: 12.5, target: { x: -14.4, z: 3.25 } },
    { name: "Ece", x: 11.8, z: 13.2, target: { x: 14.4, z: 3.4 } },
    { name: "Can", x: -3.5, z: 14.0, target: { x: -2.8, z: -2.4 } },
    { name: "Ayşe", x: 5.8, z: 13.7, target: { x: 8.7, z: 3.35 } },
    { name: "Kerem", x: 16.5, z: -4.4, target: { x: 16.0, z: 0.7 } },
  ];

  for (const spec of specs) {
    const root = createPersonModel(`person-${spec.name}`, materials.customer);
    root.position.set(spec.x, 0, spec.z);

    const person = {
      ...spec,
      root,
      active: true,
      ai: true,
      wait: Math.random() * 1.8,
      speed: 1.1 + Math.random() * 0.9,
      yelpCooldown: 0,
    };
    people.push(person);
    colliders.push({
      mesh: root,
      halfW: 0.42,
      halfH: 0.84,
      halfD: 0.42,
      yOffset: 0.78,
      padding: 0.05,
      person,
    });
  }
}

function createPersonModel(name, material) {
  const root = new TransformNode(name, scene);

  const body = MeshBuilder.CreateCylinder(`${name}-body`, {
    diameterTop: 0.48,
    diameterBottom: 0.6,
    height: 1.02,
    tessellation: 16,
  }, scene);
  body.position.y = 0.7;
  body.material = material;
  body.parent = root;

  const head = MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.38, segments: 16 }, scene);
  head.position.y = 1.42;
  head.material = materials.skin;
  head.parent = root;

  for (const mesh of root.getChildMeshes()) {
    shadows.addShadowCaster(mesh);
  }

  return root;
}

function createServiceCars() {
  const carTypes = ["Sedan", "Coupe", "SUV", "Hatchback", "Wagon"];
  const carColors = [
    ["Mavi", materials.blueCar],
    ["Kırmızı", materials.redCar],
    ["Yeşil", materials.greenCar],
    ["Sarı", materials.yellowCar],
    ["Beyaz", materials.whiteCar],
  ];
  const specs = ownerSymbols.map((symbol, index) => {
    const [colorName, material] = carColors[index % carColors.length];
    return {
      label: `${colorName} ${carTypes[index % carTypes.length]}`,
      plate: `${String(34 + (index % 47)).padStart(2, "0")} VL ${String(100 + index).padStart(3, "0")}`,
      owner: symbol.owner,
      material,
      pickup: queueSpots[index % queueSpots.length],
      symbol,
    };
  });

  const now = Date.now();

  for (const [index, spec] of specs.entries()) {
    const root = createCarModel(`service-${spec.plate}`, spec.material);
    root.position.set(spec.pickup.x, 0, spec.pickup.z);
    root.rotation.y = spec.pickup.rot;
    root.setEnabled(false);
    createOwnerSymbol(`car-${spec.plate}`, spec.symbol, root, 2.18, 0.78);

    const car = {
      ...spec,
      root,
      mission: true,
      parked: false,
      away: false,
      availableAt: now + index * ARRIVAL_INTERVAL_MS,
      returnReadyAt: Infinity,
    };
    serviceCars.push(car);
    drivableCars.push(car);
    colliders.push({
      mesh: root,
      halfW: CAR_COLLIDER.halfW,
      halfH: 0.85,
      halfD: CAR_COLLIDER.halfD,
      yOffset: 0.72,
      padding: 0.04,
      car,
      movable: true,
      velocity: new Vector3(0, 0, 0),
    });
  }
}

function createOwnerSymbol(name, symbol, parent, y, size) {
  if (!symbol) return null;

  const material = materials[symbol.materialName];
  const root = new TransformNode(`${name}-symbol`, scene);
  root.position.y = y;
  root.parent = parent;

  const coreType = symbol.index % 4;
  let core;
  if (coreType === 0) {
    core = MeshBuilder.CreateSphere(`${name}-core`, { diameter: size * 0.58, segments: 16 }, scene);
  } else if (coreType === 1) {
    core = MeshBuilder.CreateBox(`${name}-core`, {
      width: size * 0.56,
      height: size * 0.56,
      depth: size * 0.56,
    }, scene);
  } else if (coreType === 2) {
    core = MeshBuilder.CreateCylinder(`${name}-core`, {
      diameter: size * 0.58,
      height: size * 0.38,
      tessellation: 5 + (symbol.index % 3),
    }, scene);
    core.rotation.x = Math.PI / 2;
  } else {
    core = MeshBuilder.CreateTorus(`${name}-core`, {
      diameter: size * 0.58,
      thickness: size * 0.16,
      tessellation: 18,
    }, scene);
  }
  core.rotation.y = symbol.index * 0.41;
  core.material = material;
  core.parent = root;
  shadows.addShadowCaster(core);

  const pieceCount = 2 + (symbol.index % 3);
  for (let i = 0; i < pieceCount; i += 1) {
    const angle = symbol.index * 1.17 + i * ((Math.PI * 2) / pieceCount);
    const pieceSize = size * (0.2 + ((symbol.index + i) % 3) * 0.04);
    const piece = i % 2 === 0
      ? MeshBuilder.CreateSphere(`${name}-piece-${i}`, { diameter: pieceSize, segments: 10 }, scene)
      : MeshBuilder.CreateBox(`${name}-piece-${i}`, {
        width: pieceSize,
        height: pieceSize,
        depth: pieceSize,
      }, scene);
    piece.position.set(
      Math.cos(angle) * size * 0.45,
      Math.sin(angle * 1.7) * size * 0.2,
      Math.sin(angle) * size * 0.45,
    );
    piece.rotation.set(angle * 0.3, angle * 0.5, angle * 0.7);
    piece.material = material;
    piece.parent = root;
    shadows.addShadowCaster(piece);
  }

  return root;
}

function createCarModel(name, bodyMaterial) {
  const root = new TransformNode(name, scene);

  const body = MeshBuilder.CreateBox(`${name}-body`, {
    width: CAR_SIZE.width * 0.92,
    height: 0.42,
    depth: CAR_SIZE.length * 0.9,
  }, scene);
  body.position.y = 0.44;
  body.material = bodyMaterial;
  body.parent = root;

  const shell = MeshBuilder.CreateSphere(`${name}-shell`, { diameter: 1, segments: 24 }, scene);
  shell.scaling.set(0.9, 0.32, 1.64);
  shell.position.set(0, 0.68, 0.03);
  shell.material = bodyMaterial;
  shell.parent = root;

  const nose = MeshBuilder.CreateSphere(`${name}-nose`, { diameter: 1, segments: 20 }, scene);
  nose.scaling.set(0.78, 0.22, 0.62);
  nose.position.set(0, 0.62, -1.23);
  nose.material = bodyMaterial;
  nose.parent = root;

  const trunk = MeshBuilder.CreateSphere(`${name}-trunk`, { diameter: 1, segments: 20 }, scene);
  trunk.scaling.set(0.78, 0.22, 0.58);
  trunk.position.set(0, 0.62, 1.2);
  trunk.material = bodyMaterial;
  trunk.parent = root;

  const cabin = MeshBuilder.CreateSphere(`${name}-cabin`, { diameter: 1, segments: 20 }, scene);
  cabin.scaling.set(0.63, 0.34, 0.7);
  cabin.position.set(0, 1.02, 0.22);
  cabin.material = materials.glass;
  cabin.parent = root;

  const roof = MeshBuilder.CreateBox(`${name}-roof`, {
    width: 0.96,
    height: 0.08,
    depth: 0.74,
  }, scene);
  roof.position.set(0, 1.28, 0.24);
  roof.material = materials.carTop;
  roof.parent = root;

  const hoodStripe = MeshBuilder.CreateBox(`${name}-hood`, {
    width: 0.2,
    height: 0.035,
    depth: 0.86,
  }, scene);
  hoodStripe.position.set(0, 0.91, -0.92);
  hoodStripe.material = materials.carTop;
  hoodStripe.parent = root;

  for (const x of [-0.44, 0.44]) {
    const headlight = MeshBuilder.CreateSphere(`${name}-headlight`, { diameter: 0.18, segments: 10 }, scene);
    headlight.scaling.z = 0.45;
    headlight.position.set(x, 0.62, -1.63);
    headlight.material = materials.headlight;
    headlight.parent = root;

    const tail = MeshBuilder.CreateSphere(`${name}-tailLight`, { diameter: 0.16, segments: 10 }, scene);
    tail.scaling.z = 0.42;
    tail.position.set(x, 0.62, 1.57);
    tail.material = materials.tailLight;
    tail.parent = root;

    const fenderFront = MeshBuilder.CreateTorus(`${name}-frontFender`, {
      diameter: 0.64,
      thickness: 0.08,
      tessellation: 18,
    }, scene);
    fenderFront.position.set(x * 1.96, 0.37, -1.05);
    fenderFront.rotation.z = Math.PI / 2;
    fenderFront.material = bodyMaterial;
    fenderFront.parent = root;

    const fenderRear = fenderFront.clone(`${name}-rearFender`);
    fenderRear.position.z = 1.05;
    fenderRear.material = bodyMaterial;
    fenderRear.parent = root;
  }

  const wheelPositions = [
    [-0.95, 0.32, -1.05],
    [0.95, 0.32, -1.05],
    [-0.95, 0.32, 1.05],
    [0.95, 0.32, 1.05],
  ];

  for (const [x, y, z] of wheelPositions) {
    const wheel = MeshBuilder.CreateCylinder(`${name}-wheel`, {
      diameter: 0.52,
      height: 0.28,
      tessellation: 28,
    }, scene);
    wheel.position.set(x, y, z);
    wheel.rotation.z = Math.PI / 2;
    wheel.material = materials.tire;
    wheel.parent = root;

    const rim = MeshBuilder.CreateTorus(`${name}-rim`, {
      diameter: 0.32,
      thickness: 0.035,
      tessellation: 18,
    }, scene);
    rim.position.set(x + Math.sign(x) * 0.15, y, z);
    rim.rotation.z = Math.PI / 2;
    rim.material = materials.carTop;
    rim.parent = root;
  }

  for (const mesh of root.getChildMeshes()) {
    shadows.addShadowCaster(mesh);
  }

  return root;
}

function createStaticCar(x, z, rot, mat) {
  const root = createCarModel("parkedCar", mat);
  root.position.set(x, 0, z);
  root.rotation.y = rot;
  const car = {
    label: "Park Halindeki Araba",
    plate: "PARK",
    owner: "Otopark",
    material: mat,
    root,
    mission: false,
  };
  drivableCars.push(car);

  colliders.push({
    mesh: root,
    halfW: CAR_COLLIDER.halfW,
    halfH: 0.85,
    halfD: CAR_COLLIDER.halfD,
    yOffset: 0.72,
    padding: 0.04,
    car,
    movable: true,
    velocity: new Vector3(0, 0, 0),
  });

  return root;
}

function createTargetMarker() {
  const root = new TransformNode("targetMarker", scene);
  const base = MeshBuilder.CreateTorus("targetRing", {
    diameter: 3.8,
    thickness: 0.055,
    tessellation: 80,
  }, scene);
  base.rotation.x = Math.PI / 2;
  base.position.y = 0.12;
  base.material = materials.neon;
  base.parent = root;

  const arrow = MeshBuilder.CreateCylinder("targetArrow", {
    diameterTop: 0,
    diameterBottom: 0.72,
    height: 1.2,
    tessellation: 3,
  }, scene);
  arrow.position.set(0, 0.16, -1.95);
  arrow.rotation.x = Math.PI / 2;
  arrow.rotation.y = Math.PI / 6;
  arrow.material = materials.neon;
  arrow.parent = root;

  return root;
}

function createCarMarker() {
  const root = new TransformNode("carMarker", scene);
  const ring = MeshBuilder.CreateTorus("carMarkerRing", {
    diameter: 2.5,
    thickness: 0.06,
    tessellation: 64,
  }, scene);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.85;
  ring.material = materials.neon;
  ring.parent = root;

  const pointer = MeshBuilder.CreateCylinder("carMarkerPointer", {
    diameterTop: 0,
    diameterBottom: 0.46,
    height: 0.82,
    tessellation: 3,
  }, scene);
  pointer.position.y = 2.42;
  pointer.rotation.z = Math.PI;
  pointer.material = materials.neon;
  pointer.parent = root;

  return root;
}

function createSelectedGlow() {
  const root = new TransformNode("selectedGlow", scene);

  const underGlow = MeshBuilder.CreateTorus("selectedUnderGlow", {
    diameter: 3.2,
    thickness: 0.08,
    tessellation: 96,
  }, scene);
  underGlow.rotation.x = Math.PI / 2;
  underGlow.position.y = 0.08;
  underGlow.material = materials.glow;
  underGlow.parent = root;

  const aura = MeshBuilder.CreateBox("selectedAura", {
    width: 2.25,
    height: 0.08,
    depth: 3.9,
  }, scene);
  aura.position.y = 1.26;
  aura.material = materials.warningGlow;
  aura.parent = root;

  root.setEnabled(false);
  return root;
}

function placePlayerAtStart() {
  player.position.set(-11.5, 0, 8.7);
  state.playerYaw = Math.PI / 2;
  state.lookYaw = state.playerYaw;
  state.lookPitch = 0;
  player.rotation.y = state.playerYaw;
  camera.rotation.set(state.lookPitch, state.lookYaw, 0);
}

function assignNextTask() {
  if (state.mode === "driving") {
    window.setTimeout(assignNextTask, 1000);
    return;
  }

  const now = Date.now();
  refreshReturnedCars(now);
  const parked = serviceCars.filter((car) => car.parked && car.returnReadyAt <= now);
  let incoming = serviceCars.filter((car) => !car.parked && !car.away && car.availableAt <= now);
  if (parked.length === 0 && incoming.length === 0) {
    waitForNextTask(now);
    return;
  }
  const shouldReturn = parked.length > 0 && (incoming.length === 0 || Math.random() < 0.45);
  const selectedCar = shouldReturn
    ? parked[Math.floor(Math.random() * parked.length)]
    : incoming[0] ?? parked[0];
  const next = serviceCars.indexOf(selectedCar);
  state.taskIndex = next;
  state.vehicle = selectedCar;
  state.drivingCar = null;
  state.missionType = shouldReturn ? "return" : "park";
  state.targetSlot = chooseSlot();
  state.phase = "pickup";
  state.speed = 0;
  state.steering = 0;
  state.parkHold = 0;
  state.damage = 0;
  resetFallenPeople();

  const car = state.vehicle;
  arrangeIncomingQueue(car);

  car.root.setEnabled(true);

  const carCollider = colliders.find((collider) => collider.car === car);
  if (carCollider?.velocity) {
    carCollider.velocity.set(0, 0, 0);
  }

  targetMarker.setEnabled(false);
  carMarker.setEnabled(false);
  selectedGlow.setEnabled(false);
  customers.forEach((customer, index) => {
    const enabled = index === next;
    customer.setEnabled(enabled);
    const person = people.find((candidate) => candidate.root === customer);
    if (person) person.active = enabled;
    if (enabled) {
      const point = customerPointFor(car, state.missionType);
      customer.position.set(point.x, 0, point.z);
    }
  });

  updateMission();
  if (state.missionType === "park") {
    updateUi(`${car.owner}: Ben gidiyorum, arabamı otoparka bırak`);
  } else {
    updateUi(`${car.owner}: Arabamı getir, çıkacağım`);
  }
}

function waitForNextTask(now = Date.now()) {
  state.vehicle = null;
  state.drivingCar = null;
  state.phase = "waiting";
  state.missionType = "park";
  targetMarker.setEnabled(false);
  carMarker.setEnabled(false);
  selectedGlow.setEnabled(false);
  customers.forEach((customer) => customer.setEnabled(false));
  arrangeIncomingQueue(null);
  updateUi("Yeni araba bekleniyor");
  updateMission();

  const nextTimes = serviceCars
    .flatMap((car) => [car.availableAt, car.returnReadyAt])
    .filter((time) => Number.isFinite(time) && time > now);
  const nextTime = nextTimes.length ? Math.min(...nextTimes) : now + ARRIVAL_INTERVAL_MS;
  window.setTimeout(assignNextTask, Math.max(1000, nextTime - now + 250));
}

function arrangeIncomingQueue(priorityCar) {
  const now = Date.now();
  refreshReturnedCars(now);
  const incoming = serviceCars.filter((car) => (
    car !== state.drivingCar &&
    !car.parked &&
    !car.away &&
    car.availableAt <= now
  ));
  const ordered = priorityCar && priorityCar !== state.drivingCar && !priorityCar.parked
    ? [priorityCar, ...incoming.filter((car) => car !== priorityCar)]
    : incoming;
  const visibleQueue = ordered.slice(0, MAX_VISIBLE_QUEUE);

  for (const car of incoming) {
    if (!visibleQueue.includes(car) && car !== state.drivingCar) {
      car.root.setEnabled(false);
    }
  }

  visibleQueue.forEach((car, index) => {
    if (car === state.drivingCar) return;
    const spot = queueSpots[index % queueSpots.length];
    car.root.setEnabled(true);
    car.root.position.set(spot.x, 0, spot.z);
    car.root.rotation.y = spot.rot;
    const collider = colliders.find((candidate) => candidate.car === car);
    if (collider?.velocity) collider.velocity.set(0, 0, 0);
  });
}

function refreshReturnedCars(now = Date.now()) {
  for (const car of serviceCars) {
    if (car.away && car.availableAt <= now) {
      car.away = false;
    }
  }
}

function customerPointFor(car, missionType) {
  if (missionType === "return") {
    return { x: car.pickup.x, z: 15.8 };
  }

  return { x: car.pickup.x, z: 16.2 };
}

function resetFallenPeople() {
  for (const person of people) {
    if (!person.fallen) continue;
    person.fallen = false;
    person.root.rotation.z = 0;
    if (person.target) {
      person.ai = true;
      person.active = true;
      person.root.setEnabled(true);
    }
  }
}

function chooseSlot() {
  return parkSlots[Math.floor(Math.random() * parkSlots.length)];
}

function interact() {
  if (state.mode === "driving") {
    if (Math.abs(state.speed) > 0.7) {
      updateUi("İnmek için arabayı durdur");
      return;
    }

    if (state.missionType === "park" && state.phase === "park") {
      state.parkedSlot = { name: "seçtiğin yer" };
      finishParking(state.drivingCar);
    } else if (state.drivingCar === state.vehicle && state.missionType === "return" && state.phase === "return") {
      if (isNearActiveCustomer(state.vehicle.root.position, 4.2)) {
        finishReturn();
      }
    }

    exitVehicle();
    return;
  }

  const nearbyCar = findNearestDrivableCar();

  if (nearbyCar && state.phase !== "complete" && state.phase !== "failed") {
    enterVehicle(nearbyCar);
    return;
  }

  const customer = customers[state.taskIndex];
  if (customer && distance2D(player.position, customer.position) < 2.4) {
    updateUi(`${state.vehicle.owner}: ${state.vehicle.label}, plaka ${state.vehicle.plate}.`);
    return;
  }

  updateUi("Yakındaki arabaya E ile bin");
}

function enterVehicle(car) {
  state.mode = "driving";
  state.drivingCar = car;
  const isReturnCar = car === state.vehicle;
  if (state.phase === "pickup") {
    state.phase = state.missionType === "return" ? "return" : "park";
  }
  state.speed = 0;
  state.steering = 0;
  state.parkHold = 0;
  state.parkedSlot = null;
  state.carLookYaw = 0;
  state.lookPitch = 0;
  player.setEnabled(false);
  targetMarker.setEnabled(false);
  carMarker.setEnabled(false);
  selectedGlow.setEnabled(false);
  updateMission();
  if (state.missionType === "return" && isReturnCar) {
    updateUi(`${car.label} alındı. Sahibinin yanına götür`);
  } else if (state.missionType === "return") {
    updateUi(`${car.label} bu müşterinin arabası değil`);
  } else {
    updateUi(`${car.label} teslim alındı. İstediğin yere park et`);
  }
}

function isNearActiveCustomer(position, maxDistance) {
  const customer = customers[state.taskIndex];
  return customer && distance2D(position, customer.position) <= maxDistance;
}

function findNearestDrivableCar() {
  let nearest = null;
  let nearestDistance = 4.0;

  for (const car of drivableCars) {
    if (!car.root.isEnabled() || car.away) continue;
    const distance = distance2D(player.position, car.root.position);
    if (distance < nearestDistance) {
      nearest = car;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function exitVehicle() {
  const currentCar = state.drivingCar ?? state.vehicle;
  const car = currentCar.root;
  player.position.copyFrom(findExitPosition(car));
  state.playerYaw = car.rotation.y + Math.PI;
  state.lookYaw = state.playerYaw;
  state.lookPitch = 0;
  state.carLookYaw = 0;
  player.rotation.y = state.playerYaw;
  camera.rotation.set(state.lookPitch, state.lookYaw, 0);
  player.setEnabled(true);
  setPlayerBodyVisible(false);
  state.mode = "foot";
  state.drivingCar = null;
  state.speed = 0;
  state.steering = 0;
  state.keys.clear();

  if (currentCar.hideAfterExit) {
    currentCar.root.setEnabled(false);
    currentCar.hideAfterExit = false;
  }

  if (state.phase === "complete" || state.phase === "failed") {
    state.round += 1;
    assignNextTask();
    updateUi("Yeni müşteri geldi. Doğru arabaya yürüyüp E ile bin");
  } else {
    selectedGlow.setEnabled(false);
    carMarker.setEnabled(false);
    updateMission();
    updateUi("Arabadan indin. E ile tekrar binebilirsin");
  }
}

function findExitPosition(car) {
  const side = new Vector3(Math.cos(car.rotation.y), 0, -Math.sin(car.rotation.y));
  const front = frontVector(car.rotation.y);
  const directions = [
    side,
    side.scale(-1),
    front,
    front.scale(-1),
    side.add(front).normalize(),
    side.scale(-1).add(front).normalize(),
    side.add(front.scale(-1)).normalize(),
    side.scale(-1).add(front.scale(-1)).normalize(),
  ];

  for (const distance of [2.65, 3.25, 3.9, 4.6, 5.4, 6.3]) {
    for (const direction of directions) {
      const candidate = car.position.add(direction.scale(distance));
      candidate.x = clamp(candidate.x, -LOT_LIMIT_X + 0.7, LOT_LIMIT_X - 0.7);
      candidate.z = clamp(candidate.z, -LOT_LIMIT_Z + 0.7, LOT_LIMIT_Z - 0.7);
      candidate.y = heightAt(candidate.x, candidate.z, car.position.y);
      if (!isPlayerPositionBlocked(candidate, false)) {
        return candidate;
      }
    }
  }

  const fallbackDirections = [side, side.scale(-1), front, front.scale(-1)];
  for (const direction of fallbackDirections) {
    const fallback = car.position.add(direction.scale(7.2));
    fallback.x = clamp(fallback.x, -LOT_LIMIT_X + 0.7, LOT_LIMIT_X - 0.7);
    fallback.z = clamp(fallback.z, -LOT_LIMIT_Z + 0.7, LOT_LIMIT_Z - 0.7);
    fallback.y = heightAt(fallback.x, fallback.z, car.position.y);
    if (!isPlayerPositionBlocked(fallback, false)) {
      return fallback;
    }
  }

  const lastSafe = player.position.clone();
  lastSafe.y = heightAt(lastSafe.x, lastSafe.z, car.position.y);
  return lastSafe;
}

function setPlayerBodyVisible(visible) {
  for (const mesh of player.getChildMeshes()) {
    mesh.isVisible = visible;
  }
}

function updatePlayer(dt) {
  state.playerYaw = state.lookYaw;

  const x = (state.keys.has("KeyD") ? 1 : 0) - (state.keys.has("KeyA") ? 1 : 0);
  const z = (state.keys.has("KeyW") ? 1 : 0) - (state.keys.has("KeyS") ? 1 : 0);
  if (state.keys.has("Space") && state.playerGrounded) {
    state.playerVelocityY = JUMP_FORCE;
    state.playerGrounded = false;
  }

  state.playerVelocityY -= GRAVITY * dt;
  const previousY = player.position.y;
  player.position.y += state.playerVelocityY * dt;
  const groundY = heightAt(player.position.x, player.position.z, previousY);
  if (player.position.y <= groundY) {
    player.position.y = groundY;
    state.playerVelocityY = 0;
    state.playerGrounded = true;
  }

  if (x === 0 && z === 0) return;

  const previous = player.position.clone();
  const forward = new Vector3(Math.sin(state.playerYaw), 0, Math.cos(state.playerYaw));
  const right = new Vector3(Math.cos(state.playerYaw), 0, -Math.sin(state.playerYaw));
  const movement = forward.scale(z).add(right.scale(x));
  movement.normalize();
  const running = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight");
  const walkSpeed = WALK_SPEED * speedMultiplier() * (running ? RUN_MULTIPLIER : 1);
  player.position.addInPlace(movement.scale(walkSpeed * dt));
  player.position.x = clamp(player.position.x, -LOT_LIMIT_X, LOT_LIMIT_X);
  player.position.z = clamp(player.position.z, -LOT_LIMIT_Z, LOT_LIMIT_Z);
  player.position.y = Math.max(player.position.y, heightAt(player.position.x, player.position.z, previous.y));
  if (findPlayerBodyCollision()) {
    player.position.copyFrom(previous);
    state.playerVelocityY = 0;
  }
  player.rotation.y = state.playerYaw;
}

function updateCar(dt) {
  if (state.phase === "complete" || state.phase === "failed") {
    state.speed = approach(state.speed, 0, BRAKE_FORCE * dt);
    return;
  }

  if (!state.drivingCar) return;

  const forward = state.keys.has("KeyW");
  const reverse = state.keys.has("KeyS");
  const left = state.keys.has("KeyA");
  const right = state.keys.has("KeyD");
  const handBrake = state.keys.has("Space");

  const boost = speedMultiplier();
  if (forward) state.speed += ACCELERATION * boost * dt;
  if (reverse) state.speed -= ACCELERATION * boost * dt;
  if (!forward && !reverse) state.speed = approach(state.speed, 0, FRICTION * dt);
  if (handBrake) state.speed = approach(state.speed, 0, BRAKE_FORCE * dt);

  state.speed = clamp(state.speed, MAX_REVERSE * boost, MAX_FORWARD * boost);
  state.steering = approach(
    state.steering,
    (left ? 1 : 0) - (right ? 1 : 0),
    STEER_RATE * dt,
  );

  const car = state.drivingCar.root;
  const previous = car.position.clone();
  const previousRot = car.rotation.y;
  const steerStrength = state.steering * clamp(Math.abs(state.speed) / Math.abs(MAX_REVERSE * boost), 0, 1);
  car.rotation.y -= steerStrength * 1.85 * dt * Math.sign(state.speed || 1);

  car.position.addInPlace(frontVector(car.rotation.y).scale(state.speed * dt));
  car.position.y = heightAt(car.position.x, car.position.z, previous.y);

  const hit = findCollision();
  if (hit) {
    if (hit.person) {
      const previousBounds = carBounds(previous, previousRot);
      const alreadyTouching = intersectsCollider(previousBounds, hit);
      const carMovedIntoPerson = Math.abs(state.speed) > 0.25 && !alreadyTouching;
      if (carMovedIntoPerson) {
        knockDownPerson(hit.person, car.position);
        car.position.copyFrom(previous);
        car.rotation.y = previousRot;
        state.speed = 0;
        failMission(hit.person);
      } else {
        state.speed = approach(state.speed, 0, BRAKE_FORCE * dt);
      }
      return;
    }

    pushCollider(hit, car.position, state.speed);
    car.position.copyFrom(previous);
    car.rotation.y = previousRot;
    state.speed *= -0.28;
    penalizeCollision();
  }
}

function pushCollider(collider, sourcePosition, impactSpeed) {
  if (!collider.movable || !collider.velocity) return;

  const direction = collider.mesh.position.subtract(sourcePosition);
  direction.y = 0;

  if (direction.lengthSquared() < 0.001) {
    direction.copyFrom(frontVector(state.drivingCar.root.rotation.y));
  }

  direction.normalize();
  const force = clamp(Math.abs(impactSpeed) * 0.75 + 2.4, 2.2, 7.2);
  collider.velocity.addInPlace(direction.scale(force));
}

function updatePushedCars(dt) {
  for (const collider of colliders) {
    if (!collider.movable || !collider.velocity) continue;
    if (collider.velocity.lengthSquared() < 0.0004) {
      collider.velocity.set(0, 0, 0);
      continue;
    }

    const previousY = collider.mesh.position.y;
    collider.mesh.position.addInPlace(collider.velocity.scale(dt));
    collider.mesh.position.x = clamp(collider.mesh.position.x, -LOT_LIMIT_X, LOT_LIMIT_X);
    collider.mesh.position.z = clamp(collider.mesh.position.z, -LOT_LIMIT_Z, LOT_LIMIT_Z);
    if (collider.car) {
      collider.mesh.position.y = heightAt(collider.mesh.position.x, collider.mesh.position.z, previousY);
    }

    if (Math.abs(collider.mesh.position.x) >= LOT_LIMIT_X - 0.05) {
      collider.velocity.x *= -0.35;
    }

    if (collider.mesh.position.z <= -LOT_LIMIT_Z + 0.05 || collider.mesh.position.z >= LOT_LIMIT_Z - 0.05) {
      collider.velocity.z *= -0.35;
    }

    collider.velocity.scaleInPlace(Math.pow(0.08, dt));
  }
}

function resolveCarOverlaps() {
  const activeCars = drivableCars.filter((car) => car.root.isEnabled() && !car.away);

  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < activeCars.length; i += 1) {
      for (let j = i + 1; j < activeCars.length; j += 1) {
        const a = activeCars[i];
        const b = activeCars[j];
        if (a === state.drivingCar || b === state.drivingCar) continue;

        const aBounds = carBounds(a.root.position, a.root.rotation.y);
        const bBounds = carBounds(b.root.position, b.root.rotation.y);
        if (Math.abs(aBounds.y - bBounds.y) > aBounds.halfH + bBounds.halfH) continue;

        const dx = a.root.position.x - b.root.position.x;
        const dz = a.root.position.z - b.root.position.z;
        const overlapX = aBounds.halfW + bBounds.halfW + 0.12 - Math.abs(dx);
        const overlapZ = aBounds.halfD + bBounds.halfD + 0.12 - Math.abs(dz);
        if (overlapX <= 0 || overlapZ <= 0) continue;

        if (overlapX < overlapZ) {
          const push = (dx >= 0 ? 1 : -1) * overlapX * 0.52;
          moveSeparatedCar(a, push, 0);
          moveSeparatedCar(b, -push, 0);
        } else {
          const push = (dz >= 0 ? 1 : -1) * overlapZ * 0.52;
          moveSeparatedCar(a, 0, push);
          moveSeparatedCar(b, 0, -push);
        }
      }
    }
  }
}

function moveSeparatedCar(car, x, z) {
  const previousY = car.root.position.y;
  car.root.position.x = clamp(car.root.position.x + x, -LOT_LIMIT_X, LOT_LIMIT_X);
  car.root.position.z = clamp(car.root.position.z + z, -LOT_LIMIT_Z, LOT_LIMIT_Z);
  car.root.position.y = heightAt(car.root.position.x, car.root.position.z, previousY);

  const collider = colliders.find((candidate) => candidate.car === car);
  if (collider?.velocity) {
    collider.velocity.scaleInPlace(0.35);
  }
}

function updatePeople(dt) {
  for (const person of people) {
    person.yelpCooldown = Math.max(0, person.yelpCooldown - dt);
    if (person.fallen) continue;
    if (!person.active || !person.ai || !person.root.isEnabled()) continue;

    if (person.wait > 0) {
      person.wait -= dt;
      continue;
    }

    const toTarget = new Vector3(
      person.target.x - person.root.position.x,
      0,
      person.target.z - person.root.position.z,
    );
    const distance = toTarget.length();

    if (distance < 0.45) {
      person.root.setEnabled(false);
      person.active = false;
      person.wait = 4 + Math.random() * 5;
      window.setTimeout(() => {
        person.root.position.set(
          clamp(person.target.x + (Math.random() - 0.5) * 16, -LOT_LIMIT_X + 2, LOT_LIMIT_X - 2),
          0,
          LOT_LIMIT_Z - 2 - Math.random() * 3,
        );
        person.root.setEnabled(true);
        person.active = true;
      }, person.wait * 1000);
      continue;
    }

    toTarget.normalize();
    person.root.position.addInPlace(toTarget.scale(person.speed * dt));
    person.root.rotation.y = Math.atan2(toTarget.x, toTarget.z);
  }
}

function knockDownPerson(person, sourcePosition) {
  if (!person || person.fallen) return;

  person.fallen = true;
  person.active = false;
  person.ai = false;
  const away = person.root.position.subtract(sourcePosition);
  away.y = 0;
  if (away.lengthSquared() < 0.001) away.set(1, 0, 0);
  away.normalize();
  person.root.position.addInPlace(away.scale(0.65));
  person.root.rotation.z = Math.PI / 2;
  person.root.rotation.y = Math.atan2(away.x, away.z);
}

function frontVector(rot) {
  return new Vector3(-Math.sin(rot), 0, -Math.cos(rot));
}

function findCollision() {
  const car = state.drivingCar.root;
  const carAabb = carBounds(car.position, car.rotation.y);

  return colliders.find((collider) => {
    if (!collider.mesh.isEnabled()) return false;
    if (collider.car === state.drivingCar) return false;
    if (collider.person && (!collider.person.active || !collider.mesh.isEnabled())) return false;

    return intersectsCollider(carAabb, collider);
  });
}

function findPlayerBodyCollision() {
  return isPlayerPositionBlocked(player.position, true);
}

function isPlayerPositionBlocked(position, ignoreDrivingCar) {
  const bounds = playerBoundsAt(position);

  return colliders.find((collider) => {
    if (!collider.mesh.isEnabled()) return false;
    if (collider.person) return false;
    if (ignoreDrivingCar && collider.car === state.drivingCar) return false;

    return intersectsCollider(bounds, collider);
  });
}

function playerBoundsAt(position) {
  const bounds = {
    x: position.x,
    y: position.y + 0.86,
    z: position.z,
    halfW: 0.32,
    halfH: 0.86,
    halfD: 0.32,
  };

  return bounds;
}

function intersectsCollider(bounds, collider) {
  const p = collider.mesh.position;
  const halfW = collider.halfW + collider.padding;
  const halfH = collider.halfH ?? 1;
  const halfD = collider.halfD + collider.padding;
  const centerY = p.y + (collider.yOffset ?? 0);
  const verticalOverlap = bounds.halfH === undefined
    || Math.abs((bounds.y ?? 0) - centerY) < bounds.halfH + halfH;
  return (
    verticalOverlap &&
    Math.abs(bounds.x - p.x) < bounds.halfW + halfW &&
    Math.abs(bounds.z - p.z) < bounds.halfD + halfD
  );
}

function heightAt(x, z, currentY = 0) {
  const onRamp = x > 10.2 && x < 17.8 && z > RAMP_Z_MIN && z < RAMP_Z_MAX;
  if (onRamp) {
    return rampHeightAtZ(z, currentY);
  }

  const onUpperDeck = x > -15.2 && x < 15.2 && z > -18 && z < -8;
  if (!onUpperDeck) return 0;

  const nearestFloorIndex = clamp(Math.round(currentY / LEVEL_HEIGHT), 0, state.unlockedFloors - 1);
  const nearestHeight = floorHeight(nearestFloorIndex);
  if (nearestFloorIndex > 0 && currentY > nearestHeight - 0.95 && currentY < nearestHeight + 1.25) {
    return nearestHeight;
  }

  return 0;
}

function rampHeightAtZ(z, currentY = 0) {
  if (state.unlockedFloors <= 1) return 0;
  const rise = rampRiseAtZ(z);
  let bestHeight = 0;
  let bestDistance = Infinity;

  for (let baseFloor = 0; baseFloor < state.unlockedFloors - 1; baseFloor += 1) {
    const candidate = floorHeight(baseFloor) + rise;
    const distance = Math.abs(candidate - currentY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestHeight = candidate;
    }
  }

  return bestHeight;
}

function rampRiseAtZ(z) {
  const ratio = clamp((RAMP_Z_MAX - z) / (RAMP_Z_MAX - RAMP_Z_MIN), 0, 1);
  return ratio * LEVEL_HEIGHT;
}

function floorHeight(floorIndex) {
  return floorIndex * LEVEL_HEIGHT;
}

function carBounds(pos, rot) {
  const sin = Math.abs(Math.sin(rot));
  const cos = Math.abs(Math.cos(rot));
  return {
    x: pos.x,
    y: pos.y + 0.72,
    z: pos.z,
    halfW: (CAR_HITBOX.width * cos + CAR_HITBOX.length * sin) / 2,
    halfH: 0.85,
    halfD: (CAR_HITBOX.width * sin + CAR_HITBOX.length * cos) / 2,
  };
}

function penalizeCollision() {
  if (state.collisionCooldown > 0) return;

  state.money = Math.max(0, state.money - 20);
  state.damage += 1;
  state.collisionCooldown = 0.72;
  updateUi("Çarpışma: ₺20 kesildi");
}

function failMission(person) {
  if (state.phase === "failed") return;

  state.money = Math.max(0, state.money - 60);
  state.damage += 1;
  state.phase = "failed";
  state.speed = 0;
  state.parkHold = 0;
  ui.parkMeter.style.height = "0%";
  playAh();

  const name = person?.name ?? "Biri";
  const shout = name === "Mert" || name === "Zeynep" ? `${name}: Ah!` : "Ah!";
  updateMission();
  updateUi(`${shout} Görev başarısız. ₺60 kesildi. E ile arabadan in`);
}

function playAh() {
  startMusic();
  const ctx = music.context;
  if (!ctx || !music.gain) return;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.24);
  env.gain.setValueAtTime(0.001, now);
  env.gain.linearRampToValueAtTime(0.12, now + 0.025);
  env.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc.connect(env);
  env.connect(music.gain);
  osc.start(now);
  osc.stop(now + 0.3);
}

function updateParking(dt) {
  if (
    state.mode !== "driving" ||
    state.phase !== "park" ||
    state.missionType !== "park" ||
    !state.drivingCar
  ) {
    ui.parkMeter.style.height = "0%";
    return;
  }

  const parkedSlot = findParkedSlot();
  const parked = Boolean(parkedSlot);
  state.parkedSlot = parkedSlot;

  if (parked) {
    state.parkHold += dt;
  } else {
    state.parkHold = Math.max(0, state.parkHold - dt * 1.4);
  }

  ui.parkMeter.style.height = `${clamp((state.parkHold / PARK_SECONDS) * 100, 0, 100)}%`;

  if (state.parkHold >= PARK_SECONDS) {
    ui.parkMeter.style.height = "100%";
  }
}

function finishParking(car = state.drivingCar) {
  if (!car) return;
  const cleanBonus = state.damage === 0 ? 20 : 0;
  const payout = 55 + cleanBonus;
  const slotName = state.parkedSlot?.name ?? "park alanı";
  car.parked = true;
  car.parkedAt = car.root.position.clone();
  car.pendingPayout = payout;
  car.returnReadyAt = Date.now() + randomRange(OWNER_RETURN_MIN_MS, OWNER_RETURN_MAX_MS);
  if (!state.parkedCars.includes(car)) {
    state.parkedCars.push(car);
  }
  state.vehicle = car;
  state.taskIndex = serviceCars.indexOf(car);
  state.phase = "complete";
  state.parkHold = 0;
  state.speed = 0;
  targetMarker.setEnabled(false);
  selectedGlow.setEnabled(false);
  updateMission();
  updateUi(`${slotName} parkı tamamlandı. Para teslimde alınacak. E ile in`);
}

function finishReturn() {
  const cleanBonus = state.damage === 0 ? 25 : 0;
  const payout = (state.vehicle.pendingPayout ?? 55) + 70 + cleanBonus;
  state.vehicle.parked = false;
  state.vehicle.parkedAt = null;
  state.vehicle.pendingPayout = 0;
  state.vehicle.returnReadyAt = Infinity;
  state.vehicle.away = true;
  state.vehicle.availableAt = Date.now() + ARRIVAL_INTERVAL_MS;
  state.vehicle.hideAfterExit = true;
  state.parkedCars = state.parkedCars.filter((car) => car !== state.vehicle);
  state.money += payout;
  state.phase = "complete";
  state.parkHold = 0;
  state.speed = 0;
  targetMarker.setEnabled(false);
  selectedGlow.setEnabled(false);
  updateMission();
  updateUi(`${state.vehicle.owner} arabasını aldı: ₺${payout}. E ile in`);

  refreshReturnedCars();
}

function findParkedSlot() {
  const car = state.drivingCar.root;
  const speedOk = Math.abs(state.speed) < 0.55;
  if (!speedOk) return null;

  const insideLot =
    Math.abs(car.position.x) < LOT_LIMIT_X - 1.4 &&
    Math.abs(car.position.z) < LOT_LIMIT_Z - 1.4;

  return insideLot ? { name: "seçtiğin yer" } : null;
}

function updateCamera(dt) {
  const smoothing = 1 - Math.pow(0.0001, dt);

  if (state.mode === "driving") {
    const car = state.drivingCar.root;
    const orbitYaw = car.rotation.y + Math.PI + state.carLookYaw;
    const orbit = new Vector3(Math.sin(orbitYaw), 0, Math.cos(orbitYaw));
    const target = car.position.add(new Vector3(0, 1.05, 0));
    const distance = 7.2;
    const height = 3.1 + state.lookPitch * 1.4;
    const chasePosition = target.add(orbit.scale(distance)).add(new Vector3(0, height, 0));

    camera.position = Vector3.Lerp(camera.position, chasePosition, smoothing);
    camera.setTarget(target);
    return;
  }

  const footEye = player.position.add(new Vector3(0, 1.62, 0));
  camera.position = Vector3.Lerp(camera.position, footEye, smoothing);
  camera.rotation.x = state.lookPitch;
  camera.rotation.y = state.lookYaw;
  camera.rotation.z = 0;
}

function updateMarkers() {
  if (state.targetSlot && targetMarker.isEnabled()) {
    targetMarker.position.set(state.targetSlot.x, 0, state.targetSlot.z);
    targetMarker.rotation.y = state.targetSlot.rot + Math.sin(performance.now() * 0.003) * 0.035;
  }
}

function updateTimers(dt) {
  state.collisionCooldown = Math.max(0, state.collisionCooldown - dt);
  state.messageTimer = Math.max(0, state.messageTimer - dt);

  if (state.messageTimer > 0) return;

  if (state.mode === "foot" && state.phase === "pickup") {
    ui.status.textContent = state.missionType === "return"
      ? "Sahibin arabasını bul, E ile bin"
      : "Sıradaki arabaya yaklaş, E ile bin";
  } else if (state.mode === "driving" && state.phase === "park") {
    ui.status.textContent = "İstediğin yere bırak, E ile parkı tamamla";
  } else if (state.mode === "driving" && state.phase === "return") {
    ui.status.textContent = "Arabayı sahibinin yanına götür, E ile teslim et";
  } else if (state.phase === "complete") {
    ui.status.textContent = "E ile in, sonra yeni göreve geç";
  } else if (state.phase === "failed") {
    ui.status.textContent = "Görev başarısız. E ile in";
  }
}

function updateMission() {
  const car = state.vehicle;
  if (!car || !state.targetSlot) {
    ui.owner.textContent = "Vale";
    ui.missionCar.textContent = "Sıra bekleniyor";
    ui.missionText.textContent = "Yeni araba gelince sıraya girecek. Arabalar 30 saniyede bir gelir.";
    ui.prompt.textContent = "Shift: koş";
    return;
  }

  ui.owner.textContent = `${car.owner} söylüyor`;
  ui.missionCar.textContent = `${car.label} • ${car.plate}`;

  if (state.phase === "pickup") {
    if (state.missionType === "return") {
      ui.missionText.textContent = "Sahibi geri geldi. Park edilmiş bu arabayı alıp sahibinin yanına götür.";
    } else {
      ui.missionText.textContent = "Arabalar sırada bekliyor. Sıradaki arabaya binip otoparkta istediğin yere park et.";
    }
    ui.prompt.textContent = "E: arabaya bin";
  } else if (state.phase === "park") {
    ui.missionText.textContent = "İstediğin yerde, istediğin düzende dur. E ile inince park tamamlanır.";
    ui.prompt.textContent = "E: parkı tamamla";
  } else if (state.phase === "return") {
    ui.missionText.textContent = "Arabayı sahibinin yanına götür. Yakında durup E ile teslim et.";
    ui.prompt.textContent = "E: arabadan in";
  } else {
    ui.missionText.textContent = "Araç teslim edildi. Arabadan inince sıradaki müşteri yeni arabayı söyleyecek.";
    ui.prompt.textContent = "E: in ve yeni görev al";
  }

  if (state.phase === "failed") {
    ui.missionText.textContent = "Bir insana çarptın. Görev başarısız oldu; arabadan inince yeni görev başlayacak.";
    ui.prompt.textContent = "E: in ve yeni görev al";
  }
}

function updateUi(message) {
  ui.money.textContent = `₺${state.money}`;
  ui.round.textContent = String(state.round);
  ui.damage.textContent = String(state.damage);
  ui.carCount.textContent = `${activeCarCount()}/${serviceCars.length}`;
  ui.status.textContent = message;
  state.messageTimer = 2.2;
  updateShop();
}

function activeCarCount() {
  return serviceCars.filter((car) => car.root.isEnabled() && !car.away).length;
}

function startMusic() {
  if (music.started) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  music.context = new AudioContextClass();
  music.gain = music.context.createGain();
  music.gain.gain.value = 0.045;
  music.gain.connect(music.context.destination);
  music.started = true;

  const lead = [392, 494, 587, 494, 440, 523, 659, 523];
  const bass = [98, 98, 131, 131, 110, 110, 147, 147];

  const playStep = () => {
    if (!music.context || !music.gain) return;
    if (music.context.state === "suspended") {
      music.context.resume();
    }

    const index = music.step % lead.length;
    playTone(lead[index], 0.13, "square", 0.025);

    if (index % 2 === 0) {
      playTone(bass[index], 0.24, "triangle", 0.035);
    }

    music.step += 1;
  };

  playStep();
  music.timer = window.setInterval(playStep, 230);
}

function playTone(frequency, duration, type, volume) {
  const ctx = music.context;
  if (!ctx || !music.gain) return;

  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(volume, now + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(envelope);
  envelope.connect(music.gain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function speedMultiplier() {
  return 1 + state.speedLevel * 0.12;
}

function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return value;
}

function angleDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
