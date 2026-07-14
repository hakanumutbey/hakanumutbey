const BASE_ROOM_DATA = [
  {
    room: { w: 13.8, d: 7.2 },
    spawn: { x: -5.2, z: 0 },
    heal: { x: -0.8, z: 1.2 },
    enemies: [
      { x: 4.2, z: -1.2, hp: 4, speed: 2.0, size: 0.42 },
      { x: 5.3, z: 1.7, hp: 3, speed: 2.45, size: 0.34 },
    ],
  },
  {
    room: { w: 13.2, d: 7.7 },
    spawn: { x: -5.1, z: 0 },
    heal: { x: -0.2, z: -2.3 },
    enemies: [
      { x: 3.8, z: -2.3, hp: 4, speed: 2.22, size: 0.42 },
      { x: 5.1, z: 0, hp: 3, speed: 2.65, size: 0.34 },
      { x: 3.8, z: 2.3, hp: 4, speed: 2.22, size: 0.42 },
    ],
  },
  {
    room: { w: 14.6, d: 6.8 },
    spawn: { x: -5.8, z: 0 },
    heal: { x: -0.4, z: 2.3 },
    enemies: [
      { x: 3.2, z: -2.3, hp: 4, speed: 2.35, size: 0.42 },
      { x: 5.5, z: -0.9, hp: 3, speed: 2.8, size: 0.32 },
      { x: 5.5, z: 0.9, hp: 3, speed: 2.8, size: 0.32 },
      { x: 3.2, z: 2.3, hp: 4, speed: 2.35, size: 0.42 },
    ],
  },
  {
    room: { w: 12.6, d: 8.0 },
    spawn: { x: -4.9, z: 0 },
    heal: { x: -0.5, z: 0 },
    enemies: [
      { x: 2.9, z: -2.8, hp: 4, speed: 2.5, size: 0.42 },
      { x: 5.2, z: -0.9, hp: 4, speed: 2.72, size: 0.34 },
      { x: 5.2, z: 0.9, hp: 4, speed: 2.72, size: 0.34 },
      { x: 2.9, z: 2.8, hp: 6, speed: 2.0, size: 0.52 },
    ],
  },
  {
    room: { w: 14.4, d: 7.8 },
    spawn: { x: -5.9, z: 0 },
    heal: { x: -0.1, z: -2.9 },
    enemies: [
      { x: 3.1, z: -2.8, hp: 5, speed: 2.56, size: 0.43 },
      { x: 5.6, z: -1.3, hp: 4, speed: 2.95, size: 0.34 },
      { x: 5.3, z: 0, hp: 8, speed: 2.12, size: 0.6 },
      { x: 5.6, z: 1.3, hp: 4, speed: 2.95, size: 0.34 },
      { x: 3.1, z: 2.8, hp: 5, speed: 2.56, size: 0.43 },
    ],
  },
];

function createRoomSet(baseRooms, totalRooms) {
  const rooms = [];
  for (let i = 0; i < totalRooms; i += 1) {
    const base = baseRooms[i % baseRooms.length];
    const cycle = Math.floor(i / baseRooms.length);
    const roomScale = 1 + cycle * 0.035;
    const enemyBoost = 1 + cycle * 0.22;
    const room = {
      room: {
        w: Number((base.room.w * roomScale).toFixed(2)),
        d: Number((base.room.d * roomScale).toFixed(2)),
      },
      spawn: { ...base.spawn },
      heal: {
        x: Number((base.heal.x * Math.min(1.15, roomScale)).toFixed(2)),
        z: Number((base.heal.z * Math.min(1.15, roomScale)).toFixed(2)),
      },
      enemies: base.enemies.map((enemy, enemyIndex) => {
        const typeSeed = (i + enemyIndex) % 6;
        const type = typeSeed === 1 ? "fast" : typeSeed === 3 ? "ranged" : typeSeed === 5 ? "shielded" : "normal";
        return {
          x: Number((enemy.x + cycle * 0.2 * (enemyIndex % 2 === 0 ? -1 : 1)).toFixed(2)),
          z: Number((enemy.z + cycle * 0.16 * (enemyIndex % 3 === 0 ? 1 : -1)).toFixed(2)),
          hp: Math.ceil(enemy.hp + cycle * 2 + i * 0.15 + (type === "shielded" ? 2 : 0)),
          speed: Number((enemy.speed + cycle * 0.24 + enemyIndex * 0.02 + (type === "fast" ? 0.55 : 0)).toFixed(2)),
          size: Number(Math.min(0.68, enemy.size + cycle * 0.025 + (type === "shielded" ? 0.04 : 0)).toFixed(2)),
          type,
        };
      }),
    };

    if (cycle > 0) {
      room.enemies.push({
        x: Number((room.room.w / 2 - 2.2).toFixed(2)),
        z: Number(((cycle % 2 === 0 ? -1 : 1) * (room.room.d / 2 - 1.4)).toFixed(2)),
        hp: Math.ceil(3 * enemyBoost + i * 0.22),
        speed: Number((2.6 + cycle * 0.32).toFixed(2)),
        size: 0.34,
        type: "fast",
      });
    }

    if ((i + 1) % 5 === 0) {
      room.enemies.push({
        x: Number((room.room.w / 2 - 2.15).toFixed(2)),
        z: 0,
        hp: 14 + cycle * 5 + i,
        speed: Number((1.85 + cycle * 0.12).toFixed(2)),
        size: 0.86,
        boss: true,
      });
    }

    rooms.push(room);
  }
  return rooms;
}

const ROOM_DATA = createRoomSet(BASE_ROOM_DATA, 20);
const CHECKPOINT_INTERVAL = 2;
const SECRET_ROOM = {
  room: { w: 9.6, d: 6.2 },
  spawn: { x: -3.6, z: 0 },
  heal: { x: -1.2, z: 1.8 },
  enemies: [],
};
const SWORD_POWERS = ["fire", "ice", "lightning"];
const POWER_NAMES = {
  normal: "Normal",
  fire: "Ateş",
  ice: "Buz",
  lightning: "Yıldırım",
  orb: "Küre",
};

const INTRO_STORY = [
  {
    title: "Dünyanın En Güçlü Küresi",
    body: "Bir zamanlar dünyanın dengesini koruyan çok güçlü bir küre vardı. Zindanın sahibi bu küreyi çaldı, onu saklamak yerine kendi planları için kullanmaya karar verdi.",
  },
  {
    title: "Kırmızı Felaket",
    body: "Kötü planları için gereken karanlık sıvıyı kürenin içine koydu. Sonra küreyi yere fırlattı. Küre kırılınca ölüm ekranındaki kırmızı dalga gibi bir dalga büyüdü ve tüm dünyayı sardı.",
  },
  {
    title: "Ele Geçirilen Dünya",
    body: "Dalga insanları zindanın sahibinin askerlerine çevirdi. Şehirler, yollar ve ormanlar onun emrine girdi. Artık neredeyse bütün dünya onun zindanı gibi oldu.",
  },
  {
    title: "Kardeşimiz de İçeride",
    body: "Zindanın sahibi kardeşimizi de kaçırdı. Bu maceranın amacı sadece dünyayı kurtarmak değil; kardeşimizi de zindanın sonundan geri almak.",
  },
  {
    title: "Tek Çözüm",
    body: "Kurtuluş için zindanın en sonundaki küreye ulaşmak gerekiyor. O küre yere fırlatıldığında altın bir dalga yayılacak, insanları kurtaracak ve dünyayı eski haline döndürecek.",
  },
];

const FINAL_STORY = [
  {
    title: "Ateşin Kenarında",
    body: "Son odanın sonunda kardeşimizi görüyoruz. Onu ateşe atacaklar. Kahraman bunu görünce çok sinirleniyor.",
    variant: "victory",
  },
  {
    title: "Enerji Toplanıyor",
    body: "İçindeki bütün güç tek bir yuvarlak enerjiye dönüşüyor. Yuvarlak fırlıyor, bütün dünyayı kaplıyor ve geri geliyor.",
    variant: "victory",
  },
  {
    title: "Dev Yuvarlak",
    body: "Kahraman havaya uçup geri iniyor. Dev bir yuvarlak patlıyor; her şey savruluyor, binlerce bina yıkılıyor.",
    variant: "victory",
  },
  {
    title: "Mehmet'in Dönercisi",
    body: "Hatta 100 yıldır yıkılmayan, nesilden nesile aktarılan Mehmet'in Dönercisi bile yıkılıyor. Kral yere düşüp can veriyor.",
    variant: "victory",
  },
  {
    title: "Dünya Parti Yapıyor",
    body: "Herkes kurtulduğunu sanıp kutlama yapıyor. Kamera sessizce kralın olduğu yere dönüyor.",
    variant: "victory",
  },
  {
    title: "Siyah Gözler",
    body: "Kral gözlerini açıyor. Gözleri simsiyah; göz bebeklerinin yanındaki beyazlık bile siyah. Kamera göze yaklaşıyor.",
    variant: "story",
  },
  {
    title: "eşşiz zindan",
    body: " ",
    variant: "ending",
    action: "Oyun bitti",
  },
];

const PRISON_ROOM = {
  room: { w: 8.4, d: 10.8 },
  spawn: { x: 0, z: -4.1 },
  heal: { x: 0, z: -2.15 },
  enemies: [
    { x: -2.2, z: 0.4, hp: 6, speed: 2.75, size: 0.42 },
    { x: 2.2, z: 0.4, hp: 6, speed: 2.75, size: 0.42 },
    { x: 0, z: 2.05, hp: 10, speed: 2.25, size: 0.58 },
    { x: -1.55, z: 3.7, hp: 5, speed: 3.05, size: 0.32 },
    { x: 1.55, z: 3.7, hp: 5, speed: 3.05, size: 0.32 },
  ],
};

export class BabylonDungeonGame {
  constructor(canvas, hud) {
    if (!window.BABYLON) {
      throw new Error("Babylon.js yüklenemedi");
    }

    this.B = window.BABYLON;
    this.canvas = canvas;
    this.hud = hud;
    this.engine = new this.B.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });
    this.scene = this.createScene();
    this.keys = new Set();
    this.justPressed = new Set();
    this.gamepadButtons = new Set();
    this.gamepadPressed = new Set();
    this.gamepadMove = new this.B.Vector3(0, 0, 0);
    this.pointerWorld = new this.B.Vector3(1, 0, 0);
    this.roomIndex = 0;
    this.checkpointIndex = 0;
    this.maxHp = 5;
    this.hp = this.maxHp;
    this.debugImmortal = false;
    this.state = "playing";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.storyStep = 0;
    this.finalStep = 0;
    this.inPrison = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invulnerable = 0;
    this.damageFlash = 0;
    this.healFlash = 0;
    this.playerVelocity = new this.B.Vector3(0, 0, 0);
    this.facing = new this.B.Vector3(1, 0, 0);
    this.meshes = [];
    this.enemies = [];
    this.healPickup = null;
    this.chest = null;
    this.mapFragmentPickup = null;
    this.mapFragmentPickup = null;
    this.door = null;
    this.secretDoor = null;
    this.escapeDoor = null;
    this.shadowEye = null;
    this.shadowEvent = null;
    this.allySibling = null;
    this.allyCooldown = 0;
    this.victoryLight = null;
    this.storyFx = [];
    this.finalOrb = null;
    this.kingRoot = null;
    this.dungeonCore = null;
    this.prisonTrapSpawned = false;
    this.siblingRoot = null;
    this.firePit = null;
    this.energySphere = null;
    this.megaSphere = null;
    this.blackEye = null;
    this.finalBuildings = [];
    this.hazards = [];
    this.swordPower = "normal";
    this.rage = 0;
    this.maxRage = 100;
    this.rageWaveTimer = 0;
    this.mapFragments = 0;
    this.guaranteedSecretDoor = false;
    this.pendingUpgradeOptions = [];
    this.upgradeReturnState = "playing";
    this.speedBonus = 0;
    this.attackRangeBonus = 0;
    this.lightningExtraJumps = 0;
    this.shieldActive = 0;
    this.shieldCooldown = 0;
    this.inSecretRoom = false;
    this.secretReturnIndex = 0;
    this.escapeSibling = null;
    this.defaultCameraTarget = new this.B.Vector3(0, 0, 0);
    this.audioContext = null;
    this.musicGain = null;
    this.musicEnabled = true;
    this.musicStarted = false;
    this.musicMode = "";
    this.musicStep = 0;
    this.musicClock = 0;
    this.droneOsc = null;
    this.droneGain = null;

    this.bindInput();
    this.bindHudControls();
    this.createMaterials();
    this.createSharedMeshes();
    this.loadRoom(0, true);
    this.beginStory();
    this.updateHud();
  }

  start() {
    this.engine.runRenderLoop(() => {
      const dt = Math.min(0.08, this.engine.getDeltaTime() / 1000);
      this.update(dt);
      this.scene.render();
      this.justPressed.clear();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
      this.resizeCamera();
    });
  }

  createScene() {
    const B = this.B;
    const scene = new B.Scene(this.engine);
    scene.clearColor = new B.Color4(0.025, 0.03, 0.035, 1);
    scene.fogMode = B.Scene.FOGMODE_EXP2;
    scene.fogColor = new B.Color3(0.03, 0.035, 0.04);
    scene.fogDensity = 0.016;

    this.camera = new B.ArcRotateCamera("camera", -Math.PI / 2, 0.82, 18, new B.Vector3(0, 0, 0), scene);
    this.camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.detachControl();
    this.cameraZoom = 1;
    this.resizeCamera();

    const hemi = new B.HemisphericLight("hemi", new B.Vector3(0.2, 1, 0.25), scene);
    hemi.intensity = 0.44;
    hemi.groundColor = new B.Color3(0.08, 0.07, 0.06);

    this.keyLight = new B.DirectionalLight("key-light", new B.Vector3(-0.45, -1, 0.35), scene);
    this.keyLight.position = new B.Vector3(5, 9, -7);
    this.keyLight.intensity = 1.15;
    this.shadowGenerator = new B.ShadowGenerator(2048, this.keyLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 28;

    this.glow = new B.GlowLayer("glow", scene);
    this.glow.intensity = 0.62;
    return scene;
  }

  resizeCamera() {
    const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight());
    const viewHeight = 9.4 / (this.cameraZoom || 1);
    this.camera.orthoTop = viewHeight / 2;
    this.camera.orthoBottom = -viewHeight / 2;
    this.camera.orthoRight = (viewHeight * aspect) / 2;
    this.camera.orthoLeft = (-viewHeight * aspect) / 2;
  }

  createMaterials() {
    const B = this.B;
    const mat = (name, diffuse, emissive = new B.Color3(0, 0, 0), spec = 0.18) => {
      const material = new B.StandardMaterial(name, this.scene);
      material.diffuseColor = diffuse;
      material.emissiveColor = emissive;
      material.specularColor = new B.Color3(spec, spec, spec);
      return material;
    };

    this.materials = {
      floorA: mat("floor-a", new B.Color3(0.23, 0.25, 0.24), new B.Color3(0.015, 0.017, 0.016), 0.08),
      floorB: mat("floor-b", new B.Color3(0.17, 0.19, 0.19), new B.Color3(0.01, 0.012, 0.012), 0.06),
      wall: mat("wall", new B.Color3(0.19, 0.22, 0.21), new B.Color3(0.01, 0.012, 0.012), 0.08),
      wallTop: mat("wall-top", new B.Color3(0.34, 0.37, 0.34), new B.Color3(0.018, 0.016, 0.012), 0.1),
      prisonFloor: mat("prison-floor", new B.Color3(0.08, 0.09, 0.11), new B.Color3(0.005, 0.006, 0.008), 0.04),
      prisonTile: mat("prison-tile", new B.Color3(0.12, 0.13, 0.15), new B.Color3(0.008, 0.006, 0.01), 0.05),
      prisonWall: mat("prison-wall", new B.Color3(0.09, 0.1, 0.12), new B.Color3(0.012, 0.004, 0.006), 0.04),
      player: mat("player", new B.Color3(0.88, 0.63, 0.25), new B.Color3(0.08, 0.045, 0.01), 0.45),
      playerCape: mat("player-cape", new B.Color3(0.16, 0.27, 0.46), new B.Color3(0.02, 0.035, 0.08), 0.25),
      enemy: mat("enemy", new B.Color3(0.64, 0.12, 0.22), new B.Color3(0.09, 0.01, 0.018), 0.2),
      enemyHot: mat("enemy-hot", new B.Color3(1, 0.72, 0.42), new B.Color3(0.7, 0.25, 0.1), 0.4),
      corruption: mat("corruption", new B.Color3(0.82, 0.06, 0.12), new B.Color3(0.48, 0.02, 0.06), 0.15),
      gold: mat("gold", new B.Color3(0.92, 0.67, 0.23), new B.Color3(0.18, 0.09, 0.02), 0.55),
      heal: mat("heal", new B.Color3(0.3, 0.95, 0.52), new B.Color3(0.08, 0.42, 0.14), 0.3),
      attack: mat("attack", new B.Color3(1, 0.78, 0.32), new B.Color3(0.85, 0.5, 0.08), 0.1),
      fireSword: mat("fire-sword", new B.Color3(1, 0.34, 0.1), new B.Color3(0.72, 0.12, 0.02), 0.24),
      iceSword: mat("ice-sword", new B.Color3(0.38, 0.82, 1), new B.Color3(0.08, 0.32, 0.58), 0.3),
      lightningSword: mat("lightning-sword", new B.Color3(1, 0.94, 0.24), new B.Color3(0.9, 0.72, 0.06), 0.34),
      orbSword: mat("orb-sword", new B.Color3(1, 0.94, 0.58), new B.Color3(0.8, 0.46, 0.08), 0.5),
      chest: mat("chest", new B.Color3(0.5, 0.24, 0.09), new B.Color3(0.08, 0.03, 0.01), 0.26),
      map: mat("map-fragment", new B.Color3(0.55, 0.86, 0.72), new B.Color3(0.08, 0.28, 0.16), 0.2),
      shield: mat("shield", new B.Color3(0.36, 0.66, 1), new B.Color3(0.08, 0.28, 0.72), 0.18),
      warning: mat("warning", new B.Color3(1, 0.05, 0.08), new B.Color3(0.72, 0.02, 0.04), 0.06),
      victoryBeam: mat("victory-beam", new B.Color3(1, 0.86, 0.36), new B.Color3(0.7, 0.46, 0.08), 0.1),
      dark: mat("dark", new B.Color3(0.04, 0.045, 0.05), new B.Color3(0.01, 0, 0), 0.05),
    };

    this.materials.attack.alpha = 0.42;
    this.materials.heal.alpha = 0.88;
    this.materials.victoryBeam.alpha = 0.58;
    this.materials.corruption.alpha = 0.58;
    this.materials.warning.alpha = 0.36;
    this.materials.shield.alpha = 0.42;
  }

  createSharedMeshes() {
    const B = this.B;
    this.playerRoot = new B.TransformNode("player-root", this.scene);

    const body = B.MeshBuilder.CreateBox("player-body", { width: 0.46, height: 0.72, depth: 0.38 }, this.scene);
    body.position.y = 0.42;
    body.material = this.materials.player;
    body.parent = this.playerRoot;

    const head = B.MeshBuilder.CreateBox("player-head", { width: 0.34, height: 0.3, depth: 0.34 }, this.scene);
    head.position.y = 0.96;
    head.material = this.materials.player;
    head.parent = this.playerRoot;

    const cape = B.MeshBuilder.CreateBox("player-cape", { width: 0.32, height: 0.5, depth: 0.18 }, this.scene);
    cape.position.set(0, 0.42, -0.3);
    cape.material = this.materials.playerCape;
    cape.parent = this.playerRoot;

    const sword = B.MeshBuilder.CreateBox("player-sword", { width: 0.13, height: 0.13, depth: 0.86 }, this.scene);
    sword.position.set(0.28, 0.48, 0.48);
    sword.rotation.y = 0.08;
    sword.material = this.materials.gold;
    sword.parent = this.playerRoot;
    this.swordMesh = sword;

    this.shadowGenerator.addShadowCaster(body);
    this.shadowGenerator.addShadowCaster(head);
    this.shadowGenerator.addShadowCaster(cape);
    this.shadowGenerator.addShadowCaster(sword);
    this.playerMesh = this.playerRoot;

    this.attackMesh = B.MeshBuilder.CreateTorus("attack-arc", { diameter: 1.6, thickness: 0.06, tessellation: 48 }, this.scene);
    this.attackMesh.rotation.x = Math.PI / 2;
    this.attackMesh.position.y = 0.08;
    this.attackMesh.material = this.materials.attack;
    this.attackMesh.setEnabled(false);

    this.shieldMesh = B.MeshBuilder.CreateTorus("player-shield", { diameter: 1.28, thickness: 0.05, tessellation: 48 }, this.scene);
    this.shieldMesh.rotation.x = Math.PI / 2;
    this.shieldMesh.position.y = 0.55;
    this.shieldMesh.material = this.materials.shield;
    this.shieldMesh.parent = this.playerRoot;
    this.shieldMesh.setEnabled(false);
  }

  bindInput() {
    const bind = (target) => {
      target.addEventListener("keydown", (event) => {
        const keys = this.eventKeys(event);
        if (this.isGameKey(keys)) {
          event.preventDefault();
        }
        this.ensureMusicFromGesture();
        if (keys.includes("KeyF") || keys.includes("f")) {
          this.toggleFullscreen();
        }
        const alreadyDown = keys.some((key) => this.keys.has(key));
        keys.forEach((key) => this.keys.add(key));
        if (!alreadyDown) {
          keys.forEach((key) => this.justPressed.add(key));
        }
      });

      target.addEventListener("keyup", (event) => {
        const keys = this.eventKeys(event);
        if (this.isGameKey(keys)) {
          event.preventDefault();
        }
        keys.forEach((key) => this.keys.delete(key));
      });
    };

    bind(window);
    bind(this.canvas);

    this.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.focusCanvas();
      this.ensureMusicFromGesture();
      this.updatePointerWorld();
      this.justPressed.add("Pointer");
    });
    document.addEventListener("pointerdown", () => this.ensureMusicFromGesture());
    this.canvas.addEventListener("pointermove", () => this.updatePointerWorld());
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("blur", () => this.resetInput());
    window.addEventListener("focus", () => {
      this.resetInput();
      this.focusCanvas();
    });
    window.addEventListener("pagehide", () => this.resetInput());
    window.addEventListener("pageshow", () => {
      this.resetInput();
      this.focusCanvas();
    });
    document.addEventListener("visibilitychange", () => {
      this.resetInput();
      if (!document.hidden) {
        this.focusCanvas();
      }
    });
    this.focusCanvas();
  }

  bindHudControls() {
    this.musicButton = this.hud.querySelector("[data-music-toggle]");
    this.fullscreenButton = this.hud.querySelector("[data-fullscreen]");

    const handleMusic = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleMusic();
      this.focusCanvas();
    };
    this.musicButton?.addEventListener("pointerdown", handleMusic);

    const handleFullscreen = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggleFullscreen();
      this.focusCanvas();
    };
    this.fullscreenButton?.addEventListener("pointerdown", handleFullscreen);

    document.addEventListener("fullscreenchange", () => {
      this.updateFullscreenButton();
      this.engine.resize();
      this.resizeCamera();
    });
    this.updateMusicButton();
    this.updateFullscreenButton();
  }

  resetInput() {
    this.keys.clear();
    this.justPressed.clear();
  }

  focusCanvas() {
    if (document.activeElement !== this.canvas) {
      this.canvas.focus({ preventScroll: true });
    }
  }

  eventKeys(event) {
    return [event.code, event.key?.toLowerCase()].filter(Boolean);
  }

  isGameKey(keys) {
    return keys.some((key) => ["KeyW", "KeyA", "KeyS", "KeyD", "w", "a", "s", "d", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "arrowup", "arrowleft", "arrowdown", "arrowright", "Space", " ", "Enter", "enter", "Shift", "shift", "ShiftLeft", "ShiftRight", "Digit1", "Digit2", "Digit3", "1", "2", "3", "KeyE", "e", "KeyR", "r", "KeyO", "o", "KeyF", "f"].includes(key));
  }

  keyDown(...keys) {
    return keys.some((key) => this.keys.has(key));
  }

  pressed(...keys) {
    return keys.some((key) => this.justPressed.has(key)) || this.gamepadPressed.size > 0;
  }

  updateGamepadInput() {
    this.gamepadPressed.clear();
    this.gamepadMove.set(0, 0, 0);

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find(Boolean);
    if (!pad) {
      this.gamepadButtons.clear();
      return;
    }

    const deadZone = 0.22;
    let x = Math.abs(pad.axes[0] ?? 0) > deadZone ? pad.axes[0] : 0;
    let z = Math.abs(pad.axes[1] ?? 0) > deadZone ? -(pad.axes[1] ?? 0) : 0;

    const dpadLeft = pad.buttons[14]?.pressed;
    const dpadRight = pad.buttons[15]?.pressed;
    const dpadUp = pad.buttons[12]?.pressed;
    const dpadDown = pad.buttons[13]?.pressed;
    if (dpadLeft) x -= 1;
    if (dpadRight) x += 1;
    if (dpadUp) z += 1;
    if (dpadDown) z -= 1;

    this.gamepadMove.set(x, 0, z);
    if (this.gamepadMove.lengthSquared() > 1) {
      this.gamepadMove.normalize();
    }

    const activeButtons = new Set();
    [0, 1, 2, 3, 7, 9].forEach((index) => {
      if (pad.buttons[index]?.pressed) {
        activeButtons.add(`Gamepad${index}`);
      }
    });

    for (const button of activeButtons) {
      if (!this.gamepadButtons.has(button)) {
        this.gamepadPressed.add(button);
      }
    }

    this.gamepadButtons = activeButtons;
  }

  ensureAudio() {
    if (this.audioContext) {
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    this.audioContext = new AudioContextClass();
    this.musicGain = this.audioContext.createGain();
    this.musicGain.gain.value = 1.0;
    this.musicGain.connect(this.audioContext.destination);
  }

  ensureMusicFromGesture() {
    if (!this.musicEnabled) {
      return;
    }
    this.startMusic();
  }

  toggleMusic() {
    if (this.musicEnabled && !this.musicStarted) {
      this.startMusic();
      this.updateMusicButton();
      this.updateHud();
      return;
    }
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    this.updateMusicButton();
    this.updateHud();
  }

  startMusic() {
    this.ensureAudio();
    if (!this.audioContext || this.musicStarted) {
      return;
    }
    this.musicStarted = true;
    this.musicStep = 0;
    this.musicClock = 0;
    this.updateMusicMode();
    this.updateMusicButton();
    this.updateHud();
    this.audioContext.resume().then(() => {
      this.startDrone();
      this.playStartJingle();
      this.playMusicStep();
    }).catch(() => {});
  }

  stopMusic() {
    this.musicStarted = false;
    if (this.droneGain) {
      const now = this.audioContext?.currentTime ?? 0;
      this.droneGain.gain.setTargetAtTime(0.0001, now, 0.04);
    }
  }

  playStartJingle() {
    this.playTone(330, 0.16, 0.55, "triangle");
    window.setTimeout(() => this.playTone(392, 0.16, 0.5, "triangle"), 90);
    window.setTimeout(() => this.playTone(494, 0.22, 0.46, "sine"), 180);
  }

  startDrone() {
    if (!this.audioContext || !this.musicGain || this.droneOsc) {
      return;
    }
    const now = this.audioContext.currentTime;
    this.droneOsc = this.audioContext.createOscillator();
    this.droneGain = this.audioContext.createGain();
    this.droneOsc.type = "triangle";
    this.droneOsc.frequency.value = 82;
    this.droneGain.gain.setValueAtTime(0.0001, now);
    this.droneGain.gain.linearRampToValueAtTime(0.16, now + 0.25);
    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.musicGain);
    this.droneOsc.start(now);
  }

  updateMusic(dt) {
    if (!this.musicEnabled || !this.musicStarted || !this.audioContext) {
      return;
    }
    this.musicClock += dt;
    this.updateDrone();
    const intervalByMode = {
      story: 0.34,
      dungeon: 0.26,
      boss: 0.22,
      escape: 0.18,
      king: 0.2,
      final: 0.28,
      ending: 0.36,
      dead: 0.42,
    };
    this.updateMusicMode();
    const interval = intervalByMode[this.musicMode] ?? 0.28;
    if (this.musicClock >= interval) {
      this.musicClock = 0;
      this.playMusicStep();
    }
  }

  updateDrone() {
    if (!this.droneOsc || !this.droneGain || !this.audioContext) {
      return;
    }
    const baseByMode = {
      story: 73,
      dungeon: 82,
      boss: 65,
      escape: 98,
      king: 55,
      final: 110,
      ending: 98,
      dead: 49,
    };
    const now = this.audioContext.currentTime;
    this.droneOsc.frequency.setTargetAtTime(baseByMode[this.musicMode] ?? 82, now, 0.08);
    this.droneGain.gain.setTargetAtTime(this.musicEnabled && this.musicStarted ? 0.16 : 0.0001, now, 0.05);
  }

  updateMusicMode() {
    let mode = "dungeon";
    if (this.state === "story") {
      mode = "story";
    } else if (this.state === "escape") {
      mode = "escape";
    } else if (this.state === "king") {
      mode = "king";
    } else if (this.state === "complete") {
      mode = this.finalStep >= 5 ? "ending" : "final";
    } else if (this.state === "dead") {
      mode = "dead";
    } else if (this.enemies.some((enemy) => enemy.boss && !enemy.dead)) {
      mode = "boss";
    }
    if (mode !== this.musicMode) {
      this.musicMode = mode;
      this.musicStep = 0;
    }
  }

  playMusicStep() {
    if (!this.musicEnabled || !this.audioContext || !this.musicGain) {
      return;
    }
    this.updateMusicMode();
    const modeData = {
      story: { notes: [220, 0, 277, 0, 196, 0, 247, 0], bass: 55, wave: "sine", volume: 0.36 },
      dungeon: { notes: [164, 196, 220, 196, 146, 196, 220, 247], bass: 82, wave: "triangle", volume: 0.42 },
      boss: { notes: [130, 0, 174, 130, 0, 196, 174, 0], bass: 65, wave: "sawtooth", volume: 0.48 },
      escape: { notes: [247, 294, 330, 294, 247, 392, 330, 294], bass: 98, wave: "square", volume: 0.44 },
      king: { notes: [110, 146, 164, 220, 110, 196, 164, 146], bass: 55, wave: "sawtooth", volume: 0.52 },
      final: { notes: [330, 392, 494, 392, 330, 523, 494, 392], bass: 110, wave: "triangle", volume: 0.42 },
      ending: { notes: [196, 247, 330, 392, 330, 247, 196, 0], bass: 98, wave: "sine", volume: 0.32 },
      dead: { notes: [123, 0, 116, 0, 98, 0, 92, 0], bass: 49, wave: "sine", volume: 0.32 },
    }[this.musicMode] ?? { notes: [196], bass: 98, wave: "triangle", volume: 0.1 };

    const step = this.musicStep % modeData.notes.length;
    const note = modeData.notes[step];
    if (note) {
      this.playTone(note, 0.12, modeData.volume, modeData.wave);
      if (step % 4 === 0) {
        this.playTone(note * 2, 0.06, modeData.volume * 0.45, "sine");
      }
    }
    if (step % 4 === 0) {
      this.playTone(modeData.bass, 0.18, modeData.volume * 0.65, "triangle");
    }
    if ((this.musicMode === "boss" || this.musicMode === "king") && step % 4 === 0) {
      this.playNoise(0.025, modeData.volume * 0.45);
    }
    this.musicStep += 1;
  }

  playTone(frequency, duration, volume, type = "triangle") {
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoise(duration, volume) {
    const now = this.audioContext.currentTime;
    const bufferSize = Math.max(1, Math.floor(this.audioContext.sampleRate * duration));
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.musicGain);
    source.start(now);
  }

  updateMusicButton() {
    if (!this.musicButton) {
      return;
    }
    this.musicButton.textContent = this.musicEnabled
      ? this.musicStarted ? "Müzik açık" : "Müzik başlat"
      : "Müzik kapalı";
    this.musicButton.classList.toggle("active", this.musicEnabled);
  }

  async toggleFullscreen() {
    const shell = this.canvas.closest(".game-shell") ?? document.documentElement;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      // Fullscreen can be blocked by the browser if it was not triggered by a user action.
    }
  }

  updateFullscreenButton() {
    if (!this.fullscreenButton) {
      return;
    }
    const isFullscreen = Boolean(document.fullscreenElement);
    this.fullscreenButton.textContent = isFullscreen ? "Çık" : "Tam ekran";
    this.fullscreenButton.classList.toggle("active", isFullscreen);
  }

  updatePointerWorld() {
    const ray = this.scene.createPickingRay(this.scene.pointerX, this.scene.pointerY, this.B.Matrix.Identity(), this.camera);
    const distance = ray.intersectsPlane(new this.B.Plane(0, 1, 0, 0));
    if (distance !== null) {
      this.pointerWorld = ray.origin.add(ray.direction.scale(distance));
    }
  }

  loadRoom(index, restoreHp) {
    this.roomIndex = index;
    this.inPrison = false;
    this.inSecretRoom = false;
    this.room = ROOM_DATA[index];
    if (restoreHp) {
      this.hp = this.maxHp;
    }
    this.state = "playing";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invulnerable = 0;
    this.damageFlash = 0;
    this.healFlash = 0;
    this.disposeRoomMeshes();
    this.buildRoom();
    this.playerMesh.position.set(this.room.spawn.x, 0, this.room.spawn.z);
    this.playerMesh.rotation.set(0, 0, 0);
    this.playerMesh.scaling.set(1, 1, 1);
    this.playerMesh.setEnabled(true);
    this.facing.set(1, 0, 0);
    this.playerVelocity.set(0, 0, 0);
    this.createEnemies();
    this.createHealPickup();
    this.createRoomChest();
    this.createMapFragment();
    this.createKingShadowEvent();
    this.updateHud();
    this.showMessage("", "");
  }

  loadSecretRoom(returnIndex) {
    this.inSecretRoom = true;
    this.inPrison = false;
    this.secretReturnIndex = Math.min(returnIndex, ROOM_DATA.length - 1);
    this.room = SECRET_ROOM;
    this.state = "playing";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invulnerable = 0;
    this.damageFlash = 0;
    this.healFlash = 0;
    this.disposeRoomMeshes();
    this.buildRoom();
    this.playerMesh.position.set(this.room.spawn.x, 0, this.room.spawn.z);
    this.playerMesh.rotation.set(0, 0, 0);
    this.playerMesh.scaling.set(1, 1, 1);
    this.playerMesh.setEnabled(true);
    this.facing.set(1, 0, 0);
    this.playerVelocity.set(0, 0, 0);
    this.createHealPickup();
    this.createChest(0.1, 0, "secret");
    this.revealDoor();
    this.updateHud();
    this.showMessage("Gizli Sandık Odası", "Sandığı al, sonra kapıdan çık.", "story", "Space ile saldır, sandığa dokun");
  }

  loadKingBattle() {
    this.inSecretRoom = false;
    this.inPrison = false;
    this.room = { room: { w: 15.4, d: 8.8 }, spawn: { x: -6.0, z: 0 }, heal: { x: -3.0, z: 2.8 }, enemies: [] };
    this.state = "king";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invulnerable = 1.2;
    this.damageFlash = 0;
    this.healFlash = 0;
    this.hp = this.maxHp;
    this.disposeRoomMeshes();
    this.buildRoom();
    this.playerMesh.position.set(this.room.spawn.x, 0, this.room.spawn.z);
    this.playerMesh.rotation.set(0, 0, 0);
    this.playerMesh.scaling.set(1, 1, 1);
    this.playerMesh.setEnabled(true);
    this.facing.set(1, 0, 0);
    this.playerVelocity.set(0, 0, 0);
    this.createHealPickup();
    this.createEnemies([{
      x: 4.7,
      z: 0,
      hp: 42,
      speed: 1.72,
      size: 1.05,
      boss: true,
      king: true,
    }]);
    this.createAllySibling();
    this.updateHud();
    this.showMessage("Kral Geldi", "Kaçıştan sonra kral yolu kapattı. Şimdi savaşma zamanı!", "story", "Devam etmek için Space");
  }

  loadPrisonRoom() {
    this.roomIndex = ROOM_DATA.length;
    this.inPrison = true;
    this.room = PRISON_ROOM;
    this.hp = this.maxHp;
    this.state = "playing";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.invulnerable = 0;
    this.damageFlash = 0;
    this.healFlash = 0;
    this.disposeRoomMeshes();
    this.buildRoom();
    this.addPrisonRoomBars();
    this.playerMesh.position.set(this.room.spawn.x, 0, this.room.spawn.z);
    this.playerMesh.rotation.set(0, 0, 0);
    this.playerMesh.scaling.set(1, 1, 1);
    this.playerMesh.setEnabled(true);
    this.playerMesh.position.y = 0;
    this.facing.set(1, 0, 0);
    this.playerVelocity.set(0, 0, 0);
    this.createEnemies();
    this.createHealPickup();
    this.updateHud();
    this.showMessage("", "");
  }

  addPrisonRoomBars() {
    const B = this.B;
    const { w, d } = this.room.room;
    const addBox = (name, size, position, material = this.materials.dark, shadow = true) => {
      const mesh = this.keep(B.MeshBuilder.CreateBox(name, size, this.scene), shadow);
      mesh.position.set(position.x, position.y, position.z);
      mesh.material = material;
      return mesh;
    };

    addBox("prison-metal-walkway", { width: 2.05, height: 0.035, depth: d - 1.1 }, { x: 0, y: 0.025, z: 0 }, this.materials.dark, false);
    for (let i = 0; i < 9; i += 1) {
      addBox(`prison-walkway-rib-${i}`, { width: 2.2, height: 0.045, depth: 0.07 }, {
        x: 0,
        y: 0.065,
        z: -d / 2 + 0.9 + i * ((d - 1.8) / 8),
      }, this.materials.prisonWall, false);
    }

    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 1.12);
      addBox(`prison-side-back-wall-${side}`, { width: 0.18, height: 1.75, depth: d - 1.5 }, { x: side * (w / 2 - 0.78), y: 0.86, z: 0 }, this.materials.prisonWall);
      for (let cell = 0; cell < 3; cell += 1) {
        const z = -2.75 + cell * 2.45;
        addBox(`prison-cell-floor-${side}-${cell}`, { width: 1.62, height: 0.03, depth: 1.7 }, { x, y: 0.04, z }, this.materials.prisonTile, false);
        addBox(`prison-cell-bed-${side}-${cell}`, { width: 0.92, height: 0.16, depth: 0.36 }, { x: x + side * 0.1, y: 0.16, z: z - 0.46 }, this.materials.prisonWall);
        addBox(`prison-cell-divider-a-${side}-${cell}`, { width: 1.72, height: 1.45, depth: 0.1 }, { x, y: 0.72, z: z - 0.92 }, this.materials.dark);
        addBox(`prison-cell-divider-b-${side}-${cell}`, { width: 1.72, height: 1.45, depth: 0.1 }, { x, y: 0.72, z: z + 0.92 }, this.materials.dark);

        for (let barIndex = 0; barIndex < 4; barIndex += 1) {
          addBox(`prison-cell-front-bar-${side}-${cell}-${barIndex}`, { width: 0.075, height: 1.45, depth: 0.075 }, {
            x: side * 1.35,
            y: 0.74,
            z: z - 0.58 + barIndex * 0.38,
          }, this.materials.dark);
        }
        addBox(`prison-cell-front-rail-low-${side}-${cell}`, { width: 0.09, height: 0.08, depth: 1.52 }, { x: side * 1.35, y: 0.42, z }, this.materials.dark);
        addBox(`prison-cell-front-rail-high-${side}-${cell}`, { width: 0.09, height: 0.08, depth: 1.52 }, { x: side * 1.35, y: 1.12, z }, this.materials.dark);
      }
    }

    const gateZ = d / 2 - 0.72;
    addBox("prison-end-gate-top", { width: w - 1.2, height: 0.12, depth: 0.14 }, { x: 0, y: 1.52, z: gateZ }, this.materials.dark);
    addBox("prison-end-gate-bottom", { width: w - 1.2, height: 0.12, depth: 0.14 }, { x: 0, y: 0.42, z: gateZ }, this.materials.dark);
    for (let i = 0; i < 11; i += 1) {
      addBox(`prison-end-gate-bar-${i}`, { width: 0.08, height: 1.6, depth: 0.09 }, {
        x: -w / 2 + 0.9 + i * ((w - 1.8) / 10),
        y: 0.84,
        z: gateZ,
      }, this.materials.dark);
    }

    for (let i = 0; i < 7; i += 1) {
      const beam = addBox(`prison-ceiling-long-bar-${i}`, { width: 0.1, height: 0.1, depth: d - 0.8 }, {
        x: -w / 2 + 0.8 + i * ((w - 1.6) / 6),
        y: 1.82,
        z: 0,
      }, this.materials.dark);
      beam.rotation.z = i % 2 === 0 ? 0.04 : -0.04;
    }
    for (let i = 0; i < 5; i += 1) {
      addBox(`prison-ceiling-cross-bar-${i}`, { width: w - 1.1, height: 0.08, depth: 0.1 }, {
        x: 0,
        y: 1.9,
        z: -d / 2 + 1.1 + i * ((d - 2.2) / 4),
      }, this.materials.dark);
    }

    for (let i = 0; i < 8; i += 1) {
      const chain = addBox(`prison-hanging-chain-${i}`, { width: 0.08, height: 0.08, depth: 0.78 }, {
        x: -w / 2 + 0.75 + i * ((w - 1.5) / 7),
        y: 1.37,
        z: i % 2 === 0 ? -4.35 : 4.35,
      }, this.materials.dark);
      chain.rotation.x = Math.PI / 2;
      chain.rotation.z = 0.28 + i * 0.07;
    }

    const shard = addBox("prison-back-dark-core", { width: 0.42, height: 0.42, depth: 0.42 }, { x: 0, y: 1.1, z: d / 2 - 1.05 }, this.materials.corruption);
    shard.rotation.set(0.5, 0.8, 0.2);
    shard.metadata = { darkShard: true };

    const alarm = new B.PointLight("prison-red-alarm", new B.Vector3(0, 1.7, d / 2 - 1.0), this.scene);
    alarm.diffuse = new B.Color3(0.95, 0.05, 0.08);
    alarm.intensity = 1.1;
    alarm.range = 6.6;
    this.meshes.push(alarm);
  }

  disposeRoomMeshes() {
    for (const mesh of this.meshes) {
      mesh.dispose(false, true);
    }
    this.meshes = [];
    this.enemies = [];
    this.healPickup = null;
    this.chest = null;
    this.door = null;
    this.secretDoor = null;
    this.escapeDoor = null;
    this.shadowEye = null;
    this.shadowEvent = null;
    this.allySibling = null;
    this.allyCooldown = 0;
    this.victoryLight = null;
    this.finalOrb = null;
    this.kingRoot = null;
    this.dungeonCore = null;
    this.prisonTrapSpawned = false;
    this.siblingRoot = null;
    this.firePit = null;
    this.energySphere = null;
    this.megaSphere = null;
    this.blackEye = null;
    this.finalBuildings = [];
    this.hazards = [];
    this.escapeSibling = null;
  }

  keep(mesh, shadow = false) {
    this.meshes.push(mesh);
    if (shadow) {
      this.shadowGenerator.addShadowCaster(mesh);
    }
    return mesh;
  }

  buildRoom() {
    const B = this.B;
    const { w, d } = this.room.room;
    const floor = this.keep(B.MeshBuilder.CreateBox("floor", { width: w, height: 0.16, depth: d }, this.scene));
    floor.position.y = -0.08;
    floor.material = this.inPrison ? this.materials.prisonFloor : this.materials.floorA;
    floor.receiveShadows = true;

    const tileW = w / 9;
    const tileD = d / 5;
    for (let ix = 0; ix < 9; ix += 1) {
      for (let iz = 0; iz < 5; iz += 1) {
        const tile = this.keep(B.MeshBuilder.CreateBox("floor-tile", { width: tileW - 0.04, height: 0.018, depth: tileD - 0.04 }, this.scene));
        tile.position.set(-w / 2 + tileW * (ix + 0.5), 0.006, -d / 2 + tileD * (iz + 0.5));
        if (this.inPrison) {
          tile.material = (ix + iz) % 2 === 0 ? this.materials.prisonFloor : this.materials.prisonTile;
        } else {
          tile.material = (ix + iz + this.roomIndex) % 2 === 0 ? this.materials.floorA : this.materials.floorB;
        }
        tile.receiveShadows = true;
      }
    }

    this.createWall(0, -d / 2 - 0.28, w + 0.7, 0.55);
    this.createWall(0, d / 2 + 0.28, w + 0.7, 0.55);
    this.createWall(-w / 2 - 0.28, 0, 0.55, d + 0.7);
    this.createWall(w / 2 + 0.28, 0, 0.55, d + 0.7);

    for (const x of [-w / 2 + 1.05, w / 2 - 1.05]) {
      for (const z of [-d / 2 + 0.82, d / 2 - 0.82]) {
        const pillar = this.keep(B.MeshBuilder.CreateCylinder("pillar", { diameter: 0.42, height: 1.2, tessellation: 8 }, this.scene), true);
        pillar.position.set(x, 0.6, z);
        pillar.material = this.materials.wallTop;
        const torch = this.keep(B.MeshBuilder.CreateSphere("torch", { diameter: 0.16, segments: 12 }, this.scene));
        torch.position.set(x, 1.34, z);
        torch.material = this.inPrison ? this.materials.corruption : this.materials.gold;
        const light = new B.PointLight("torch-light", new B.Vector3(x, 1.5, z), this.scene);
        light.diffuse = this.inPrison ? new B.Color3(0.75, 0.08, 0.14) : new B.Color3(1, 0.52, 0.22);
        light.intensity = this.inPrison ? 0.55 : 0.35;
        light.range = this.inPrison ? 3.2 : 4;
        this.meshes.push(light);
      }
    }
  }

  createWall(x, z, w, d) {
    const wall = this.keep(this.B.MeshBuilder.CreateBox("wall", { width: w, height: 0.95, depth: d }, this.scene), true);
    wall.position.set(x, 0.47, z);
    wall.material = this.inPrison ? this.materials.prisonWall : this.materials.wall;
    return wall;
  }

  createEnemies(enemyData = this.room.enemies) {
    const B = this.B;
    this.enemies = enemyData.map((data, index) => {
      const root = new B.TransformNode(`enemy-${index}`, this.scene);
      root.position.set(data.x, 0, data.z);
      const bossScale = data.boss ? 1.18 : 1;

      const body = this.keep(B.MeshBuilder.CreateBox(`enemy-body-${index}`, {
        width: data.size * 1.45 * bossScale,
        height: data.size * 1.45 * bossScale,
        depth: data.size * 1.25 * bossScale,
      }, this.scene), true);
      body.position.y = data.size * 0.78 * bossScale;
      body.material = data.king ? this.materials.corruption : this.materials.enemy;
      body.parent = root;

      const head = this.keep(B.MeshBuilder.CreateBox(`enemy-head-${index}`, {
        width: data.size * 1.08 * bossScale,
        height: data.size * 0.78 * bossScale,
        depth: data.size * 0.95 * bossScale,
      }, this.scene), true);
      head.position.set(0, data.size * 1.63 * bossScale, -data.size * 0.05);
      head.material = data.king ? this.materials.corruption : this.materials.enemy;
      head.parent = root;

      const eyeA = this.keep(B.MeshBuilder.CreateBox(`enemy-eye-a-${index}`, {
        width: data.size * 0.18,
        height: data.size * 0.16,
        depth: data.size * 0.08,
      }, this.scene));
      eyeA.position.set(-data.size * 0.24, data.size * 1.72, -data.size * 0.55);
      eyeA.material = this.materials.enemyHot;
      eyeA.parent = root;

      const eyeB = this.keep(B.MeshBuilder.CreateBox(`enemy-eye-b-${index}`, {
        width: data.size * 0.18,
        height: data.size * 0.16,
        depth: data.size * 0.08,
      }, this.scene));
      eyeB.position.set(data.size * 0.24, data.size * 1.72, -data.size * 0.55);
      eyeB.material = this.materials.enemyHot;
      eyeB.parent = root;

      const hornA = this.keep(B.MeshBuilder.CreateBox(`enemy-horn-a-${index}`, {
        width: data.size * 0.18,
        height: data.size * 0.42,
        depth: data.size * 0.18,
      }, this.scene));
      hornA.position.set(-data.size * 0.33, data.size * 2.13, 0);
      hornA.rotation.z = 0.45;
      hornA.material = this.materials.enemyHot;
      hornA.parent = root;

      const hornB = this.keep(B.MeshBuilder.CreateBox(`enemy-horn-b-${index}`, {
        width: data.size * 0.18,
        height: data.size * 0.42,
        depth: data.size * 0.18,
      }, this.scene));
      hornB.position.set(data.size * 0.33, data.size * 2.13, 0);
      hornB.rotation.z = -0.45;
      hornB.material = this.materials.enemyHot;
      hornB.parent = root;

      if (data.boss) {
        const crown = this.keep(B.MeshBuilder.CreateBox(`enemy-boss-crown-${index}`, {
          width: data.size * 0.9,
          height: data.size * 0.18,
          depth: data.size * 0.7,
        }, this.scene), true);
        crown.position.set(0, data.size * 2.55 * bossScale, 0);
        crown.material = data.king ? this.materials.gold : this.materials.corruption;
        crown.parent = root;
      }

      return {
        root,
        body,
        hp: data.hp,
        maxHp: data.hp,
        speed: data.speed,
        radius: data.size,
        boss: Boolean(data.boss),
        king: Boolean(data.king),
        burn: 0,
        burnTick: 0,
        slow: 0,
        specialCooldown: data.boss ? 1.1 : 0,
        specialIndex: 0,
        knockback: new B.Vector3(0, 0, 0),
        flash: 0,
        dead: false,
      };
    });
  }

  createHealPickup() {
    const B = this.B;
    const data = this.room.heal;
    const root = new B.TransformNode("heal-pickup", this.scene);
    root.position.set(data.x, 0.1, data.z);
    const vertical = this.keep(B.MeshBuilder.CreateBox("heal-vertical", { width: 0.18, height: 0.18, depth: 0.72 }, this.scene));
    vertical.material = this.materials.heal;
    vertical.parent = root;
    const horizontal = this.keep(B.MeshBuilder.CreateBox("heal-horizontal", { width: 0.72, height: 0.18, depth: 0.18 }, this.scene));
    horizontal.material = this.materials.heal;
    horizontal.parent = root;
    this.healPickup = { root, radius: 0.55, active: true };
  }

  createRoomChest() {
    if (this.inPrison || this.inSecretRoom || (this.roomIndex + 1) % 3 !== 0) {
      return;
    }
    const x = -this.room.room.w / 2 + 1.45;
    const z = this.room.room.d / 2 - 1.25;
    this.createChest(x, z, "room");
  }

  createChest(x, z, kind) {
    const B = this.B;
    const root = new B.TransformNode(`chest-${kind}`, this.scene);
    root.position.set(x, 0.1, z);
    this.keep(root);

    const base = this.keep(B.MeshBuilder.CreateBox(`chest-base-${kind}`, { width: 0.72, height: 0.34, depth: 0.46 }, this.scene), true);
    base.position.y = 0.2;
    base.material = this.materials.chest;
    base.parent = root;

    const lid = this.keep(B.MeshBuilder.CreateBox(`chest-lid-${kind}`, { width: 0.78, height: 0.16, depth: 0.52 }, this.scene), true);
    lid.position.y = 0.47;
    lid.material = this.materials.gold;
    lid.parent = root;

    const glow = this.keep(B.MeshBuilder.CreateBox(`chest-glow-${kind}`, { width: 0.34, height: 0.08, depth: 0.1 }, this.scene));
    glow.position.set(0, 0.56, -0.28);
    glow.material = this.materials.lightningSword;
    glow.parent = root;
    glow.metadata = { chestGlow: true };

    this.chest = { root, radius: 0.72, active: true, kind };
  }

  createMapFragment() {
    if (this.inSecretRoom || this.inPrison || this.roomIndex % 4 !== 1) {
      return;
    }
    const B = this.B;
    const root = new B.TransformNode("map-fragment-root", this.scene);
    root.position.set(-this.room.room.w / 2 + 1.25, 0.12, -this.room.room.d / 2 + 1.15);
    this.keep(root);

    const piece = this.keep(B.MeshBuilder.CreateBox("map-fragment-piece", { width: 0.5, height: 0.05, depth: 0.34 }, this.scene));
    piece.position.y = 0.18;
    piece.rotation.y = 0.4;
    piece.material = this.materials.map;
    piece.parent = root;
    piece.metadata = { mapFragment: true };
    this.mapFragmentPickup = { root, radius: 0.56, active: true };
  }

  collectMapFragment() {
    if (!this.mapFragmentPickup?.active) {
      return;
    }
    this.mapFragments += 1;
    if (this.mapFragments >= 3) {
      this.guaranteedSecretDoor = true;
    }
    this.mapFragmentPickup.active = false;
    this.mapFragmentPickup.root.setEnabled(false);
    this.healFlash = 0.55;
    this.updateHud();
    if (this.mapFragments >= 3) {
      this.showMessage("Harita Tamamlandı", "Gizli odadaki sandık artık Küre Kılıcı'nı açabilir.", "victory", "Devam etmek için Space");
    }
  }

  collectChest() {
    if (!this.chest?.active) {
      return;
    }
    const wasSecret = this.chest.kind === "secret";
    this.chest.active = false;
    this.chest.root.setEnabled(false);
    this.healFlash = 0.85;
    if (wasSecret && this.mapFragments >= 3) {
      this.mapFragments = 0;
      this.guaranteedSecretDoor = false;
      this.setSwordPower("orb");
      this.hp = this.maxHp;
      this.rage = this.maxRage;
      this.updateHud();
      this.showMessage("Küre Kılıcı", "Ateş, buz ve yıldırım tek kılıçta birleşti. Öfke gücü de doldu!", "victory", "Devam etmek için Space");
      return;
    }

    this.pendingUpgradeOptions = this.createUpgradeOptions();
    this.upgradeReturnState = this.state;
    this.state = "upgrade";
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.updateHud();
    this.showUpgradeChoices();
  }

  createUpgradeOptions() {
    const offset = (this.roomIndex + Math.floor(performance.now() / 700)) % SWORD_POWERS.length;
    return [0, 1, 2].map((step) => SWORD_POWERS[(offset + step) % SWORD_POWERS.length]);
  }

  showUpgradeChoices() {
    const optionText = this.pendingUpgradeOptions
      .map((power, index) => `${index + 1}: ${POWER_NAMES[power]} Kılıcı`)
      .join("   ");
    this.showMessage("Sandık Seçimi", optionText, "victory", "1, 2 veya 3 ile kılıcını seç");
  }

  updateUpgradeChoice() {
    const keyMap = [
      ["Digit1", "1"],
      ["Digit2", "2"],
      ["Digit3", "3"],
    ];
    const choice = keyMap.findIndex((keys) => this.pressed(...keys));
    if (choice < 0 || !this.pendingUpgradeOptions[choice]) {
      return;
    }

    const power = this.pendingUpgradeOptions[choice];
    this.setSwordPower(power);
    this.hp = Math.min(this.maxHp, this.hp + 1);
    this.pendingUpgradeOptions = [];
    this.state = this.upgradeReturnState === "king" ? "king" : "playing";
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.updateHud();
    this.showMessage(`${POWER_NAMES[power]} Kılıcı`, "Seçimin sandıktan çıktı.", "victory", "Devam etmek için Space");
  }

  setSwordPower(power) {
    this.swordPower = power;
    const materialByPower = {
      fire: this.materials.fireSword,
      ice: this.materials.iceSword,
      lightning: this.materials.lightningSword,
      orb: this.materials.orbSword,
      normal: this.materials.gold,
    };
    this.swordMesh.material = materialByPower[power] ?? this.materials.gold;
    this.attackMesh.material = power === "normal" ? this.materials.attack : materialByPower[power];
    this.updateHud();
  }

  beginStory() {
    this.state = "story";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.storyStep = 0;
    this.spawnStoryFx();
    this.showStoryStep();
  }

  showStoryStep() {
    const page = INTRO_STORY[this.storyStep];
    const action = this.storyStep === INTRO_STORY.length - 1
      ? "Başlamak için Space, Enter veya tıkla"
      : "Devam etmek için Space, Enter veya tıkla";
    this.dialogStartedAt = performance.now();
    this.showMessage(page.title, page.body, "story", action);
  }

  advanceStory() {
    if (this.storyStep < INTRO_STORY.length - 1) {
      this.storyStep += 1;
      this.showStoryStep();
      return;
    }

    this.clearStoryFx();
    this.state = "playing";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.showMessage("", "");
  }

  spawnStoryFx() {
    const B = this.B;
    this.clearStoryFx();
    const origin = new B.Vector3(0, 0.08, 0);

    for (let i = 0; i < 4; i += 1) {
      const ring = B.MeshBuilder.CreateTorus(`story-red-wave-${i}`, { diameter: 0.9 + i * 0.5, thickness: 0.055, tessellation: 64 }, this.scene);
      ring.position.copyFrom(origin);
      ring.rotation.x = Math.PI / 2;
      ring.material = this.materials.corruption;
      ring.metadata = { storyWave: true, age: i * -0.42 };
      this.storyFx.push(ring);
    }

    const orb = B.MeshBuilder.CreateSphere("story-stolen-orb", { diameter: 0.48, segments: 24 }, this.scene);
    orb.position.set(0, 0.9, 0);
    orb.material = this.materials.corruption;
    orb.metadata = { storyOrb: true };
    this.storyFx.push(orb);
  }

  clearStoryFx() {
    for (const mesh of this.storyFx) {
      mesh.dispose(false, true);
    }
    this.storyFx = [];
  }

  revealDoor() {
    if (this.door) {
      return;
    }
    const B = this.B;
    const x = this.room.room.w / 2 - 0.35;
    const root = new B.TransformNode("door-root", this.scene);
    root.position.set(x, 0, 0);

    const portal = this.keep(B.MeshBuilder.CreateTorus("door-portal", { diameter: 1.55, thickness: 0.09, tessellation: 48 }, this.scene));
    portal.position.set(0, 0.72, 0);
    portal.rotation.x = Math.PI / 2;
    portal.material = this.materials.gold;
    portal.parent = root;

    const glow = this.keep(B.MeshBuilder.CreateDisc("door-glow", { radius: 0.67, tessellation: 48 }, this.scene));
    glow.position.set(-0.03, 0.72, 0);
    glow.rotation.y = Math.PI / 2;
    glow.material = this.materials.attack;
    glow.parent = root;
    this.door = { root, radius: 0.76 };
  }

  revealSecretDoor() {
    if (this.secretDoor || this.inSecretRoom || this.inPrison) {
      return;
    }
    if (![2, 6, 10, 14].includes(this.roomIndex)) {
      return;
    }
    const B = this.B;
    const x = this.room.room.w / 2 - 0.35;
    const z = -this.room.room.d / 2 + 1.45;
    const root = new B.TransformNode("secret-door-root", this.scene);
    root.position.set(x, 0, z);
    this.keep(root);

    const portal = this.keep(B.MeshBuilder.CreateTorus("secret-door-portal", { diameter: 1.25, thickness: 0.08, tessellation: 48 }, this.scene));
    portal.position.set(0, 0.68, 0);
    portal.rotation.x = Math.PI / 2;
    portal.material = this.materials.lightningSword;
    portal.parent = root;

    const core = this.keep(B.MeshBuilder.CreateBox("secret-door-core", { width: 0.5, height: 0.72, depth: 0.08 }, this.scene));
    core.position.set(-0.04, 0.68, 0);
    core.rotation.y = Math.PI / 2;
    core.material = this.materials.corruption;
    core.parent = root;
    this.secretDoor = { root, radius: 0.68 };
  }

  createKingShadowEvent() {
    if (this.inSecretRoom || this.inPrison || this.roomIndex === 0 || ![3, 8, 13, 18].includes(this.roomIndex)) {
      return;
    }

    const B = this.B;
    const root = new B.TransformNode("king-shadow-eye-root", this.scene);
    root.position.set(this.room.room.w / 2 - 1.5, 1.65, -this.room.room.d / 2 + 1.2);
    root.rotation.y = -0.55;
    root.metadata = { shadowEye: true };
    this.keep(root);

    const eye = this.keep(B.MeshBuilder.CreateBox("king-shadow-eye", { width: 0.92, height: 0.5, depth: 0.08 }, this.scene));
    eye.material = this.materials.dark;
    eye.parent = root;

    const pupil = this.keep(B.MeshBuilder.CreateBox("king-shadow-pupil", { width: 0.28, height: 0.28, depth: 0.1 }, this.scene));
    pupil.position.z = -0.05;
    pupil.material = this.materials.corruption;
    pupil.parent = root;

    this.shadowEye = root;
    this.shadowEvent = { timer: 1.6, waves: 0 };
  }

  createAllySibling() {
    const B = this.B;
    const root = new B.TransformNode("ally-sibling-root", this.scene);
    root.position.copyFrom(this.playerMesh.position.add(new B.Vector3(-0.75, 0, 0.45)));
    this.keep(root);

    const body = this.keep(B.MeshBuilder.CreateBox("ally-sibling-body", { width: 0.34, height: 0.5, depth: 0.28 }, this.scene), true);
    body.position.y = 0.31;
    body.material = this.materials.playerCape;
    body.parent = root;

    const head = this.keep(B.MeshBuilder.CreateBox("ally-sibling-head", { width: 0.24, height: 0.23, depth: 0.24 }, this.scene), true);
    head.position.y = 0.72;
    head.material = this.materials.player;
    head.parent = root;

    const glow = this.keep(B.MeshBuilder.CreateSphere("ally-sibling-light", { diameter: 0.22, segments: 16 }, this.scene));
    glow.position.set(0, 0.95, -0.12);
    glow.material = this.materials.iceSword;
    glow.parent = root;

    this.allySibling = root;
    this.allyCooldown = 0.8;
  }

  update(dt) {
    this.stateTime += dt;
    this.updateGamepadInput();
    this.updateMusic(dt);
    if (this.pressed("KeyO", "o")) {
      this.debugImmortal = !this.debugImmortal;
      this.damageFlash = this.debugImmortal ? 0 : this.damageFlash;
      this.healFlash = this.debugImmortal ? 0.9 : this.healFlash;
      this.updateHud();
    }
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.rageWaveTimer = Math.max(0, this.rageWaveTimer - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.6);
    this.healFlash = Math.max(0, this.healFlash - dt * 2.4);

    this.updateVisualEffects(dt);
    this.updateHazards(dt);

    if (this.state === "upgrade") {
      this.updateUpgradeChoice();
      return;
    }

    if (this.state === "story") {
      const canAdvance = performance.now() - this.dialogStartedAt > 350;
      if (canAdvance && this.pressed("Space", " ", "Enter", "enter", "Pointer")) {
        this.advanceStory();
      }
      return;
    }

    if (this.state === "dead") {
      const canRestart = performance.now() - this.stateStartedAt > 1100;
      if (canRestart && this.pressed("Space", " ", "Enter", "enter", "KeyR", "r", "Pointer")) {
        this.loadRoom(this.checkpointIndex, true);
      }
      return;
    }

    if (this.state === "complete") {
      const waitBeforeAdvance = this.finalStep === 5 ? 2600 : 350;
      const canAdvance = performance.now() - this.dialogStartedAt > waitBeforeAdvance;
      if (canAdvance && this.pressed("Space", " ", "Enter", "enter", "KeyR", "r", "Pointer")) {
        this.advanceFinalStory();
      }
      return;
    }

    if (this.state === "escape") {
      this.updatePlayer(dt);
      this.updateEscape(dt);
      return;
    }

    if (this.state === "king") {
      this.updatePlayer(dt);
      this.updateRageInput();
      this.updateAttack(dt);
      this.updateAllySibling(dt);
      this.updateEnemies(dt);
      this.updatePickupAndDoor();
      return;
    }

    this.updatePlayer(dt);
    this.updateRageInput();
    this.updateAttack(dt);
    this.updateKingShadowEvent(dt);
    this.updateEnemies(dt);
    this.updatePickupAndDoor();
  }

  updatePlayer(dt) {
    const axisX = (this.keyDown("KeyD", "d", "ArrowRight", "arrowright") ? 1 : 0) - (this.keyDown("KeyA", "a", "ArrowLeft", "arrowleft") ? 1 : 0);
    const axisZ = (this.keyDown("KeyW", "w", "ArrowUp", "arrowup") ? 1 : 0) - (this.keyDown("KeyS", "s", "ArrowDown", "arrowdown") ? 1 : 0);
    const move = new this.B.Vector3(axisX + this.gamepadMove.x, 0, axisZ + this.gamepadMove.z);
    if (move.lengthSquared() > 0) {
      move.normalize();
      this.facing.copyFrom(move);
    }

    const speed = 3.35;
    const position = this.playerMesh.position;
    position.addInPlace(move.scale(speed * dt));
    position.addInPlace(this.playerVelocity.scale(dt));
    this.playerVelocity.scaleInPlace(Math.pow(0.025, dt));

    const halfW = this.room.room.w / 2 - 0.45;
    const halfD = this.room.room.d / 2 - 0.45;
    position.x = Math.max(-halfW, Math.min(halfW, position.x));
    position.z = Math.max(-halfD, Math.min(halfD, position.z));

    const angle = Math.atan2(this.facing.x, this.facing.z);
    this.playerMesh.rotation.y = angle;
    this.playerMesh.setEnabled(this.invulnerable <= 0 || Math.floor(this.invulnerable * 12) % 2 === 0);
  }

  updateAttack() {
    if (!this.pressed("Space", " ", "Enter", "enter", "Pointer") || this.attackCooldown > 0) {
      return;
    }

    if (this.pressed("Pointer")) {
      const pointerDir = this.pointerWorld.subtract(this.playerMesh.position);
      pointerDir.y = 0;
      if (pointerDir.lengthSquared() > 0.01) {
        this.facing.copyFrom(pointerDir.normalize());
      }
    }

    this.attackCooldown = 0.35;
    this.attackTimer = 0.14;
    this.attackMesh.setEnabled(true);
    this.attackMesh.position.copyFrom(this.playerMesh.position.add(this.facing.scale(0.82)));
    this.attackMesh.position.y = 0.11;
    this.attackMesh.rotation.y = Math.atan2(this.facing.x, this.facing.z);

    for (const enemy of this.enemies) {
      if (enemy.dead) {
        continue;
      }
      const diff = enemy.root.position.subtract(this.playerMesh.position);
      diff.y = 0;
      const distance = diff.length();
      const angleDot = distance > 0 ? this.B.Vector3.Dot(diff.normalize(), this.facing) : 1;
      if (distance < 1.45 + enemy.radius && angleDot > 0.18) {
        const damage = this.swordPower === "normal" ? 1 : this.swordPower === "orb" ? 3 : 2;
        this.addRage(enemy.boss ? 12 : 8);
        this.hitEnemy(enemy, damage);
        enemy.knockback.addInPlace(this.facing.scale(4.8));

        if (this.swordPower === "fire" || this.swordPower === "orb") {
          enemy.burn = Math.max(enemy.burn, 3.0);
        }
        if (this.swordPower === "ice" || this.swordPower === "orb") {
          enemy.slow = Math.max(enemy.slow, 3.5);
        }
        if (this.swordPower === "lightning" || this.swordPower === "orb") {
          this.chainLightning(enemy);
        }
      }
    }
  }

  addRage(amount) {
    this.rage = Math.min(this.maxRage, this.rage + amount);
    this.updateHud();
  }

  updateRageInput() {
    if (this.pressed("KeyE", "e") && this.rage >= this.maxRage) {
      this.activateRageWave();
    }
  }

  activateRageWave() {
    this.rage = 0;
    this.rageWaveTimer = 0.55;
    this.healFlash = 0.9;
    this.updateHud();

    const origin = this.playerMesh.position.clone();
    origin.y = 0.08;
    const wave = this.keep(this.B.MeshBuilder.CreateTorus("rage-wave", { diameter: 0.85, thickness: 0.08, tessellation: 72 }, this.scene));
    wave.position.copyFrom(origin);
    wave.rotation.x = Math.PI / 2;
    wave.material = this.materials.orbSword;
    wave.metadata = { rageWave: true, age: 0 };

    for (const enemy of this.enemies) {
      if (enemy.dead) {
        continue;
      }
      const diff = enemy.root.position.subtract(this.playerMesh.position);
      diff.y = 0;
      const distance = diff.length();
      if (distance < 4.0 + enemy.radius) {
        const dir = distance > 0.01 ? diff.normalize() : new this.B.Vector3(1, 0, 0);
        this.hitEnemy(enemy, enemy.boss ? 3 : 4);
        enemy.knockback.addInPlace(dir.scale(enemy.boss ? 5.0 : 7.0));
        enemy.slow = Math.max(enemy.slow, 2.2);
        this.spawnStrikeFx(enemy.root.position, this.materials.orbSword);
      }
    }
  }

  hitEnemy(enemy, damage) {
    enemy.hp -= damage;
    enemy.flash = 0.2;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      enemy.root.setEnabled(false);
      this.addRage(enemy.boss ? 18 : 10);
      if (enemy.king) {
        this.complete();
      }
    }
  }

  chainLightning(sourceEnemy) {
    let jumps = 0;
    for (const enemy of this.enemies) {
      if (enemy === sourceEnemy || enemy.dead) {
        continue;
      }
      const distance = this.B.Vector3.Distance(enemy.root.position, sourceEnemy.root.position);
      if (distance < 3.2 && jumps < 2) {
        this.hitEnemy(enemy, 1);
        enemy.knockback.addInPlace(enemy.root.position.subtract(sourceEnemy.root.position).normalize().scale(2.2));
        this.spawnStrikeFx(enemy.root.position, this.materials.lightningSword);
        jumps += 1;
      }
    }
  }

  spawnStrikeFx(position, material) {
    const spark = this.keep(this.B.MeshBuilder.CreateBox("power-strike", { width: 0.16, height: 0.9, depth: 0.16 }, this.scene));
    spark.position.set(position.x, 0.55, position.z);
    spark.rotation.set(0.6, performance.now() / 180, 0.3);
    spark.material = material;
    spark.metadata = { strikeFx: true, age: 0 };
  }

  updateKingShadowEvent(dt) {
    if (!this.shadowEvent || !this.shadowEye || this.enemies.every((enemy) => enemy.dead)) {
      return;
    }

    this.shadowEvent.timer -= dt;
    if (this.shadowEvent.timer > 0) {
      return;
    }

    const wave = this.shadowEvent.waves;
    const offset = wave % 2 === 0 ? 1.2 : -1.2;
    const target = this.playerMesh.position.add(new this.B.Vector3(offset, 0, wave % 3 === 0 ? 0.8 : -0.8));
    target.x = Math.max(-this.room.room.w / 2 + 1.0, Math.min(this.room.room.w / 2 - 1.0, target.x));
    target.z = Math.max(-this.room.room.d / 2 + 1.0, Math.min(this.room.room.d / 2 - 1.0, target.z));
    this.spawnHazard(wave % 3 === 1 ? "jump" : "area", target, 0.95, 0.72, null);
    this.spawnStrikeFx(this.shadowEye.position, this.materials.corruption);
    this.shadowEvent.waves += 1;
    this.shadowEvent.timer = 2.2;

    if (this.shadowEvent.waves >= 4) {
      this.shadowEvent = null;
      this.shadowEye.setEnabled(false);
    }
  }

  updateAllySibling(dt) {
    if (!this.allySibling) {
      return;
    }

    this.allySibling.position.x += (this.playerMesh.position.x - 0.82 - this.allySibling.position.x) * 0.08;
    this.allySibling.position.z += (this.playerMesh.position.z + 0.48 - this.allySibling.position.z) * 0.08;
    this.allySibling.rotation.y = this.playerMesh.rotation.y;
    this.allyCooldown = Math.max(0, this.allyCooldown - dt);

    if (this.allyCooldown > 0) {
      return;
    }

    const target = this.enemies
      .filter((enemy) => !enemy.dead)
      .sort((a, b) => this.B.Vector3.Distance(a.root.position, this.allySibling.position) - this.B.Vector3.Distance(b.root.position, this.allySibling.position))[0];
    if (!target) {
      return;
    }

    this.allyCooldown = 1.8;
    target.slow = Math.max(target.slow, 2.6);
    this.hitEnemy(target, 1);
    this.spawnStrikeFx(target.root.position, this.materials.iceSword);

    const beam = this.keep(this.B.MeshBuilder.CreateBox("ally-freeze-beam", { width: 0.08, height: 0.08, depth: 1 }, this.scene));
    const from = this.allySibling.position.clone();
    const to = target.root.position.clone();
    const mid = from.add(to).scale(0.5);
    const length = this.B.Vector3.Distance(from, to);
    beam.position.set(mid.x, 0.72, mid.z);
    beam.scaling.z = Math.max(0.3, length);
    beam.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    beam.material = this.materials.iceSword;
    beam.metadata = { allyBeam: true, age: 0 };
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (enemy.dead) {
        continue;
      }

      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.burn = Math.max(0, enemy.burn - dt);
      enemy.slow = Math.max(0, enemy.slow - dt);
      enemy.body.material = enemy.flash > 0 || enemy.burn > 0 ? this.materials.enemyHot : enemy.slow > 0 ? this.materials.iceSword : enemy.king ? this.materials.corruption : this.materials.enemy;
      if (enemy.burn > 0) {
        enemy.burnTick += dt;
        if (enemy.burnTick > 0.62) {
          enemy.burnTick = 0;
          this.hitEnemy(enemy, 1);
          this.spawnStrikeFx(enemy.root.position, this.materials.fireSword);
        }
      }
      if (enemy.dead) {
        continue;
      }
      const dir = this.playerMesh.position.subtract(enemy.root.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist > 0.01) {
        dir.normalize();
        const slowMultiplier = enemy.slow > 0 ? 0.45 : 1;
        const bossCaution = enemy.boss && enemy.specialCooldown < 0.55 ? 0.35 : 1;
        enemy.root.position.addInPlace(dir.scale(enemy.speed * slowMultiplier * bossCaution * dt));
      }
      enemy.root.position.addInPlace(enemy.knockback.scale(dt));
      enemy.knockback.scaleInPlace(Math.pow(0.02, dt));
      enemy.root.rotation.y = Math.atan2(dir.x, dir.z);

      if (enemy.boss) {
        this.updateBossSpecial(enemy, dt);
      }

      if (dist < enemy.radius + 0.42 && this.invulnerable <= 0) {
        this.takeDamage(enemy);
      }
    }

    if (this.enemies.every((enemy) => enemy.dead)) {
      if (!this.inPrison && !this.inSecretRoom && this.state !== "king") {
        this.revealDoor();
        this.revealSecretDoor();
      }
    }
  }

  updateBossSpecial(enemy, dt) {
    enemy.specialCooldown -= dt;
    if (enemy.specialCooldown > 0) {
      return;
    }
    const attackType = enemy.king
      ? ["laser", "jump", "area"][enemy.specialIndex % 3]
      : ["area", "jump", "laser"][enemy.specialIndex % 3];
    enemy.specialIndex += 1;
    enemy.specialCooldown = enemy.king ? 2.0 : 2.6;

    if (attackType === "area") {
      this.spawnHazard("area", this.playerMesh.position.clone(), 1.25 + (enemy.king ? 0.3 : 0), 0.72, enemy);
    } else if (attackType === "laser") {
      this.spawnLaserHazard(enemy);
    } else {
      this.spawnHazard("jump", this.playerMesh.position.clone(), 1.05 + (enemy.king ? 0.25 : 0), 0.85, enemy);
    }
  }

  spawnHazard(type, position, radius, delay, enemy) {
    const marker = this.keep(this.B.MeshBuilder.CreateCylinder(`${type}-warning`, { diameter: radius * 2, height: 0.035, tessellation: 40 }, this.scene));
    marker.position.set(position.x, 0.035, position.z);
    marker.material = this.materials.warning;
    marker.metadata = { hazardMarker: true };
    this.hazards.push({ type, marker, position: position.clone(), radius, delay, age: 0, enemy, hit: false });
  }

  spawnLaserHazard(enemy) {
    const from = enemy.root.position.clone();
    const to = this.playerMesh.position.clone();
    const mid = from.add(to).scale(0.5);
    const length = this.B.Vector3.Distance(from, to);
    const laser = this.keep(this.B.MeshBuilder.CreateBox("laser-warning", { width: 0.18, height: 0.055, depth: Math.max(0.4, length) }, this.scene));
    laser.position.set(mid.x, 0.08, mid.z);
    laser.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    laser.material = this.materials.warning;
    laser.metadata = { hazardMarker: true };
    this.hazards.push({ type: "laser", marker: laser, from, to, radius: 0.36, delay: 0.58, age: 0, enemy, hit: false });
  }

  updateHazards(dt) {
    for (const hazard of this.hazards) {
      hazard.age += dt;
      const charge = Math.min(1, hazard.age / hazard.delay);
      hazard.marker.visibility = 0.22 + charge * 0.62;
      hazard.marker.scaling.y = 1;
      if (hazard.type !== "laser") {
        hazard.marker.scaling.x = 0.82 + Math.sin(hazard.age * 18) * 0.06;
        hazard.marker.scaling.z = hazard.marker.scaling.x;
      }
      if (!hazard.hit && hazard.age >= hazard.delay) {
        hazard.hit = true;
        if (hazard.type === "laser") {
          if (this.distanceToSegment(this.playerMesh.position, hazard.from, hazard.to) < hazard.radius + 0.38) {
            this.takeHazardDamage(hazard.position ?? hazard.from);
          }
        } else {
          if (this.B.Vector3.Distance(this.playerMesh.position, hazard.position) < hazard.radius + 0.42) {
            this.takeHazardDamage(hazard.position);
          }
          if (hazard.type === "jump" && hazard.enemy && !hazard.enemy.dead) {
            hazard.enemy.root.position.x = hazard.position.x;
            hazard.enemy.root.position.z = hazard.position.z;
            hazard.enemy.knockback.addInPlace(this.playerMesh.position.subtract(hazard.enemy.root.position).normalize().scale(-2.5));
          }
        }
        this.spawnStrikeFx(hazard.type === "laser" ? hazard.to : hazard.position, this.materials.warning);
      }
      if (hazard.age > hazard.delay + 0.35) {
        hazard.marker.dispose(false, true);
        hazard.done = true;
      }
    }
    this.hazards = this.hazards.filter((hazard) => !hazard.done);
  }

  distanceToSegment(point, start, end) {
    const ab = end.subtract(start);
    const ap = point.subtract(start);
    ab.y = 0;
    ap.y = 0;
    const lengthSq = Math.max(0.0001, ab.lengthSquared());
    const t = Math.max(0, Math.min(1, this.B.Vector3.Dot(ap, ab) / lengthSq));
    const closest = start.add(ab.scale(t));
    return this.B.Vector3.Distance(point, closest);
  }

  takeHazardDamage(fromPosition) {
    if (this.invulnerable > 0) {
      return;
    }
    this.takeDamage({ root: { position: fromPosition } });
  }

  takeDamage(enemy) {
    if (this.debugImmortal) {
      this.invulnerable = 0.35;
      this.healFlash = 0.45;
      return;
    }
    this.hp = Math.max(0, this.hp - 1);
    this.updateHud();
    this.invulnerable = 1.05;
    this.damageFlash = 0.82;
    const away = this.playerMesh.position.subtract(enemy.root.position);
    away.y = 0;
    if (away.lengthSquared() < 0.01) {
      away.set(-1, 0, 0);
    }
    away.normalize();
    this.playerVelocity.copyFrom(away.scale(7.2));

    if (this.hp <= 0) {
      this.die();
    }
  }

  updatePickupAndDoor() {
    if (this.chest?.active) {
      const chestDist = this.B.Vector3.Distance(this.playerMesh.position, this.chest.root.position);
      if (chestDist < this.chest.radius + 0.42) {
        this.collectChest();
        if (this.state === "upgrade") {
          return;
        }
      }
    }

    if (this.mapFragmentPickup?.active) {
      const mapDist = this.B.Vector3.Distance(this.playerMesh.position, this.mapFragmentPickup.root.position);
      if (mapDist < this.mapFragmentPickup.radius + 0.42) {
        this.collectMapFragment();
      }
    }

    if (this.healPickup?.active && this.hp < this.maxHp) {
      const dist = this.B.Vector3.Distance(this.playerMesh.position, this.healPickup.root.position);
      if (dist < this.healPickup.radius + 0.42) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.healPickup.active = false;
        this.healPickup.root.setEnabled(false);
        this.healFlash = 0.62;
        this.updateHud();
      }
    }

    if (this.secretDoor && this.B.Vector3.Distance(this.playerMesh.position, this.secretDoor.root.position) < this.secretDoor.radius + 0.38) {
      this.loadSecretRoom(this.roomIndex + 1);
      return;
    }

    if (this.door && this.B.Vector3.Distance(this.playerMesh.position, this.door.root.position) < this.door.radius + 0.38) {
      if (this.inSecretRoom) {
        this.loadRoom(this.secretReturnIndex, true);
        return;
      }

      if ((this.roomIndex + 1) % CHECKPOINT_INTERVAL === 0) {
        this.checkpointIndex = Math.min(this.roomIndex + 1, ROOM_DATA.length - 1);
      }

      if (this.roomIndex === ROOM_DATA.length - 1) {
        this.beginEscape();
      } else {
        const restoreHp = (this.roomIndex + 1) % CHECKPOINT_INTERVAL === 0;
        this.loadRoom(this.roomIndex + 1, restoreHp);
      }
    }
  }

  beginEscape() {
    this.state = "escape";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.invulnerable = 0.8;
    this.door?.root.setEnabled(false);
    this.door = null;
    this.createEscapeSibling();
    this.createEscapeDoor();
    this.showMessage("Kardeşimizi Kurtardık", "Şimdi kral gelmeden çıkışa koş!", "victory", "Çıkışa git");
    this.updateHud();
  }

  createEscapeSibling() {
    const B = this.B;
    const root = new B.TransformNode("escape-sibling-root", this.scene);
    root.position.copyFrom(this.playerMesh.position.add(new B.Vector3(-0.65, 0, 0.35)));
    this.keep(root);
    const body = this.keep(B.MeshBuilder.CreateBox("escape-sibling-body", { width: 0.32, height: 0.5, depth: 0.28 }, this.scene), true);
    body.position.y = 0.31;
    body.material = this.materials.playerCape;
    body.parent = root;
    const head = this.keep(B.MeshBuilder.CreateBox("escape-sibling-head", { width: 0.24, height: 0.23, depth: 0.24 }, this.scene), true);
    head.position.y = 0.72;
    head.material = this.materials.player;
    head.parent = root;
    this.escapeSibling = root;
  }

  createEscapeDoor() {
    const B = this.B;
    const root = new B.TransformNode("escape-door-root", this.scene);
    root.position.set(-this.room.room.w / 2 + 0.35, 0, 0);
    this.keep(root);
    const portal = this.keep(B.MeshBuilder.CreateTorus("escape-door-portal", { diameter: 1.6, thickness: 0.1, tessellation: 48 }, this.scene));
    portal.position.set(0, 0.72, 0);
    portal.rotation.x = Math.PI / 2;
    portal.material = this.materials.iceSword;
    portal.parent = root;
    this.escapeDoor = { root, radius: 0.82 };
  }

  updateEscape(dt) {
    if (this.escapeSibling) {
      this.escapeSibling.position.x += (this.playerMesh.position.x - 0.7 - this.escapeSibling.position.x) * 0.08;
      this.escapeSibling.position.z += (this.playerMesh.position.z + 0.35 - this.escapeSibling.position.z) * 0.08;
      this.escapeSibling.rotation.y = this.playerMesh.rotation.y;
    }
    if (this.escapeDoor) {
      this.escapeDoor.root.rotation.y += dt * 1.1;
      if (this.B.Vector3.Distance(this.playerMesh.position, this.escapeDoor.root.position) < this.escapeDoor.radius + 0.42) {
        this.loadKingBattle();
      }
    }
    if (this.stateTime > 1.0 && Math.floor(this.stateTime * 2) % 2 === 0 && this.hazards.length < 2) {
      const x = this.playerMesh.position.x + 1.5 + Math.sin(this.stateTime * 3) * 1.1;
      const z = this.playerMesh.position.z + Math.cos(this.stateTime * 2.1) * 1.2;
      this.spawnHazard("area", new this.B.Vector3(x, 0, z), 0.85, 0.75, null);
    }
  }

  die() {
    this.state = "dead";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.damageFlash = 1;
    this.playerVelocity.set(0, 0, 0);
    this.playerMesh.setEnabled(true);
    this.playerMesh.rotation.x = -0.86;
    this.playerMesh.rotation.z = 0.22;
    this.playerMesh.position.y = 0.1;
    this.playerMesh.scaling.y = 0.92;
    this.showMessage("Yere Düştün", "Sonum böyle mi olacaktı? Tekrar denemek için Space, Enter, R veya tıkla");
    this.spawnDeathFx();
  }

  complete() {
    this.state = "complete";
    this.stateTime = 0;
    this.stateStartedAt = performance.now();
    this.dialogStartedAt = performance.now();
    this.finalStep = 0;
    this.playerVelocity.set(0, 0, 0);
    this.invulnerable = 99;
    this.prisonTrapSpawned = false;
    this.cameraZoom = 1;
    this.resizeCamera();
    this.spawnVictoryFx();
    this.showFinalStep();
  }

  showFinalStep() {
    const page = FINAL_STORY[this.finalStep];
    const defaultAction = this.finalStep === FINAL_STORY.length - 1
      ? "Oyun bitti"
      : this.finalStep === 5
        ? "Göz yaklaşınca Space, Enter veya tıkla"
      : "Devam etmek için Space, Enter veya tıkla";
    this.dialogStartedAt = performance.now();
    this.showMessage(page.title, page.body, page.variant, page.action ?? defaultAction);
  }

  advanceFinalStory() {
    if (this.finalStep < FINAL_STORY.length - 1) {
      this.finalStep += 1;
      this.showFinalStep();
      return;
    }
  }

  spawnDeathFx() {
    const B = this.B;
    const origin = this.playerMesh.position.clone();
    for (let i = 0; i < 3; i += 1) {
      const ring = this.keep(B.MeshBuilder.CreateTorus(`death-ring-${i}`, { diameter: 0.8 + i * 0.36, thickness: 0.035, tessellation: 64 }, this.scene));
      ring.position.copyFrom(origin);
      ring.position.y = 0.12 + i * 0.05;
      ring.rotation.x = Math.PI / 2;
      ring.material = this.materials.enemyHot;
      ring.metadata = { deathRing: true, age: i * -0.12 };
    }
  }

  spawnVictoryFx() {
    const B = this.B;
    const origin = this.door?.root.position.clone() ?? this.playerMesh.position.clone();
    origin.y = 0;

    this.victoryLight = new B.PointLight("victory-light", new B.Vector3(origin.x, 2.2, origin.z), this.scene);
    this.victoryLight.diffuse = new B.Color3(1, 0.78, 0.28);
    this.victoryLight.intensity = 2.7;
    this.victoryLight.range = 12;
    this.meshes.push(this.victoryLight);

    this.finalOrb = this.keep(B.MeshBuilder.CreateSphere("final-world-orb", { diameter: 0.46, segments: 32 }, this.scene), true);
    this.finalOrb.position.copyFrom(this.playerMesh.position);
    this.finalOrb.position.y = 1.25;
    this.finalOrb.material = this.materials.gold;
    this.finalOrb.metadata = { finalOrb: true, origin: this.playerMesh.position.clone(), target: origin.clone() };

    for (let i = 0; i < 5; i += 1) {
      const root = new B.TransformNode(`victory-square-ring-${i}`, this.scene);
      root.position.copyFrom(origin);
      root.position.y = 0.08 + i * 0.018;
      root.metadata = { victoryRing: true, age: i * -0.16, base: 0.78 + i * 0.24 };
      this.keep(root);

      const side = 0.9 + i * 0.28;
      const thickness = 0.045;
      const pieces = [
        { x: 0, z: -side / 2, w: side, d: thickness },
        { x: 0, z: side / 2, w: side, d: thickness },
        { x: -side / 2, z: 0, w: thickness, d: side },
        { x: side / 2, z: 0, w: thickness, d: side },
      ];

      for (const [pieceIndex, piece] of pieces.entries()) {
        const mesh = this.keep(B.MeshBuilder.CreateBox(`victory-ring-${i}-${pieceIndex}`, {
          width: piece.w,
          height: 0.045,
          depth: piece.d,
        }, this.scene));
        mesh.position.set(piece.x, 0, piece.z);
        mesh.material = this.materials.gold;
        mesh.parent = root;
      }
    }

    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const radius = 0.6 + (i % 3) * 0.16;
      const shard = this.keep(B.MeshBuilder.CreateBox(`victory-shard-${i}`, {
        width: 0.16,
        height: 0.42 + (i % 2) * 0.18,
        depth: 0.16,
      }, this.scene), true);
      shard.position.set(origin.x + Math.cos(angle) * radius, 0.45 + i * 0.02, origin.z + Math.sin(angle) * radius);
      shard.rotation.set(0.4 + i * 0.07, angle, 0.2);
      shard.material = this.materials.gold;
      shard.metadata = { victoryShard: true, angle, speed: 0.9 + (i % 4) * 0.18, lift: 0.45 + i * 0.02 };
    }

    for (let i = 0; i < 4; i += 1) {
      const beam = this.keep(B.MeshBuilder.CreateBox(`victory-beam-${i}`, {
        width: 0.16,
        height: 6.2,
        depth: 0.5,
      }, this.scene));
      beam.position.set(origin.x, 3.1, origin.z);
      beam.rotation.y = (Math.PI / 4) * i;
      beam.material = this.materials.victoryBeam;
      beam.metadata = { victoryBeam: true, phase: i * 0.45 };
    }

    this.kingRoot = this.createKing(origin.x + 3.2, origin.z + 1.7);
    this.dungeonCore = this.keep(B.MeshBuilder.CreateBox("dungeon-collapse-core", {
      width: 0.76,
      height: 0.76,
      depth: 0.76,
    }, this.scene), true);
    this.dungeonCore.position.set(origin.x + 1.55, 0.55, origin.z);
    this.dungeonCore.rotation.y = 0.35;
    this.dungeonCore.material = this.materials.corruption;
    this.dungeonCore.metadata = { dungeonCore: true, origin: this.dungeonCore.position.clone() };

    this.createSiblingAndFire(origin);
    this.createWorldEndingObjects(origin);
  }

  createSiblingAndFire(origin) {
    const B = this.B;
    this.siblingRoot = new B.TransformNode("sibling-root", this.scene);
    this.siblingRoot.position.set(origin.x - 1.1, 0, origin.z - 1.3);
    this.siblingRoot.rotation.y = 0.8;
    this.siblingRoot.metadata = { sibling: true };
    this.keep(this.siblingRoot);

    const body = this.keep(B.MeshBuilder.CreateBox("sibling-body", { width: 0.34, height: 0.52, depth: 0.3 }, this.scene), true);
    body.position.y = 0.32;
    body.material = this.materials.playerCape;
    body.parent = this.siblingRoot;

    const head = this.keep(B.MeshBuilder.CreateBox("sibling-head", { width: 0.26, height: 0.24, depth: 0.26 }, this.scene), true);
    head.position.y = 0.74;
    head.material = this.materials.player;
    head.parent = this.siblingRoot;

    this.firePit = new B.TransformNode("fire-pit-root", this.scene);
    this.firePit.position.set(origin.x - 0.15, 0, origin.z - 1.35);
    this.firePit.metadata = { firePit: true };
    this.keep(this.firePit);

    for (let i = 0; i < 6; i += 1) {
      const flame = this.keep(B.MeshBuilder.CreateBox(`fire-flame-${i}`, {
        width: 0.12,
        height: 0.55 + (i % 2) * 0.16,
        depth: 0.12,
      }, this.scene));
      const angle = (Math.PI * 2 * i) / 6;
      flame.position.set(Math.cos(angle) * 0.28, 0.35, Math.sin(angle) * 0.28);
      flame.rotation.set(0.4, angle, 0.3);
      flame.material = i % 2 === 0 ? this.materials.corruption : this.materials.gold;
      flame.parent = this.firePit;
      flame.metadata = { flame: true, phase: i * 0.5 };
    }
  }

  createWorldEndingObjects(origin) {
    const B = this.B;
    this.energySphere = this.keep(B.MeshBuilder.CreateSphere("rage-energy-sphere", { diameter: 0.42, segments: 24 }, this.scene), true);
    this.energySphere.position.set(this.playerMesh.position.x, 1.25, this.playerMesh.position.z);
    this.energySphere.material = this.materials.gold;
    this.energySphere.metadata = { energySphere: true, origin: this.playerMesh.position.clone(), target: origin.clone() };

    this.megaSphere = this.keep(B.MeshBuilder.CreateSphere("world-covering-mega-sphere", { diameter: 1.1, segments: 32 }, this.scene));
    this.megaSphere.position.set(origin.x, 0.9, origin.z);
    this.megaSphere.material = this.materials.victoryBeam;
    this.megaSphere.visibility = 0;
    this.megaSphere.metadata = { megaSphere: true };

    const cityOriginX = origin.x - 2.6;
    for (let i = 0; i < 16; i += 1) {
      const building = this.keep(B.MeshBuilder.CreateBox(`collapsing-building-${i}`, {
        width: 0.28 + (i % 3) * 0.08,
        height: 0.75 + (i % 5) * 0.28,
        depth: 0.32,
      }, this.scene), true);
      building.position.set(cityOriginX + (i % 8) * 0.48, building.scaling.y * 0.4 + 0.4, origin.z + 2.2 + Math.floor(i / 8) * 0.55);
      building.material = this.materials.wallTop;
      building.metadata = { collapsingBuilding: true, index: i, baseY: building.position.y };
      this.finalBuildings.push(building);
    }

    const shop = this.keep(B.MeshBuilder.CreateBox("mehmetin-donercisi", {
      width: 1.35,
      height: 0.72,
      depth: 0.42,
    }, this.scene), true);
    shop.position.set(origin.x + 2.2, 0.36, origin.z + 2.35);
    shop.material = this.materials.gold;
    shop.metadata = { donerShop: true };
    this.finalBuildings.push(shop);

    this.blackEye = new B.TransformNode("black-eye-root", this.scene);
    this.blackEye.position.set(origin.x + 1.2, 1.12, origin.z + 0.6);
    this.blackEye.setEnabled(false);
    this.blackEye.metadata = { blackEye: true };
    this.keep(this.blackEye);

    const eyeWhite = this.keep(B.MeshBuilder.CreateBox("king-black-eye-whole", { width: 0.82, height: 0.46, depth: 0.08 }, this.scene));
    eyeWhite.material = this.materials.dark;
    eyeWhite.parent = this.blackEye;
    const pupil = this.keep(B.MeshBuilder.CreateBox("king-black-pupil", { width: 0.28, height: 0.28, depth: 0.1 }, this.scene));
    pupil.position.z = -0.04;
    pupil.material = this.materials.corruption;
    pupil.parent = this.blackEye;
  }

  createKing(x, z) {
    const B = this.B;
    const root = new B.TransformNode("king-root", this.scene);
    root.position.set(x, 0, z);
    root.rotation.y = -1.35;
    root.metadata = { king: true, start: new B.Vector3(x, 0, z) };
    this.keep(root);

    const body = this.keep(B.MeshBuilder.CreateBox("king-body", { width: 0.48, height: 0.76, depth: 0.38 }, this.scene), true);
    body.position.y = 0.44;
    body.material = this.materials.playerCape;
    body.parent = root;

    const head = this.keep(B.MeshBuilder.CreateBox("king-head", { width: 0.34, height: 0.3, depth: 0.34 }, this.scene), true);
    head.position.y = 0.98;
    head.material = this.materials.player;
    head.parent = root;

    const crown = this.keep(B.MeshBuilder.CreateBox("king-crown", { width: 0.44, height: 0.16, depth: 0.44 }, this.scene), true);
    crown.position.y = 1.2;
    crown.material = this.materials.gold;
    crown.parent = root;

    const cape = this.keep(B.MeshBuilder.CreateBox("king-cape", { width: 0.58, height: 0.72, depth: 0.14 }, this.scene), true);
    cape.position.set(0, 0.48, -0.34);
    cape.material = this.materials.corruption;
    cape.parent = root;

    return root;
  }

  updateVisualEffects(dt) {
    const t = performance.now() / 1000;
    if (this.healPickup?.active) {
      this.healPickup.root.rotation.y += dt * 2.7;
      this.healPickup.root.position.y = 0.16 + Math.sin(t * 4.3) * 0.07;
    }
    if (this.door) {
      this.door.root.rotation.y = Math.sin(t * 2.4) * 0.08;
    }
    if (this.secretDoor) {
      this.secretDoor.root.rotation.y += dt * 0.9;
    }
    if (this.chest?.active) {
      this.chest.root.rotation.y = Math.sin(t * 2.8) * 0.08;
    }
    if (this.shadowEye?.isEnabled()) {
      this.shadowEye.rotation.y = -0.55 + Math.sin(t * 3.4) * 0.12;
      const pulse = 1 + Math.sin(t * 5.2) * 0.06;
      this.shadowEye.scaling.set(pulse, pulse, pulse);
    }

    for (const mesh of this.storyFx) {
      if (mesh.metadata?.storyWave) {
        mesh.metadata.age += dt;
        const age = Math.max(0, mesh.metadata.age);
        const scale = 1 + age * 3.1;
        mesh.scaling.set(scale, scale, scale);
        mesh.visibility = Math.max(0.08, 1 - age * 0.48);
        if (age > 2.5) {
          mesh.metadata.age = -0.45;
          mesh.scaling.set(1, 1, 1);
          mesh.visibility = 1;
        }
      }
      if (mesh.metadata?.storyOrb) {
        mesh.rotation.y += dt * 2.2;
        mesh.position.y = 0.92 + Math.sin(t * 3) * 0.1;
      }
    }
    if (this.attackTimer <= 0) {
      this.attackMesh.setEnabled(false);
    } else {
      const scale = 1 + (0.14 - this.attackTimer) * 4;
      this.attackMesh.scaling.set(scale, scale, scale);
    }

    for (const mesh of this.meshes) {
      if (mesh.metadata?.deathRing) {
        mesh.metadata.age += dt;
        const age = mesh.metadata.age;
        const scale = 1 + Math.max(0, age) * 4.8;
        mesh.scaling.set(scale, scale, scale);
        mesh.visibility = Math.max(0, 1 - age * 1.4);
      }

      if (mesh.metadata?.victoryRing) {
        mesh.metadata.age += dt;
        const age = Math.max(0, mesh.metadata.age);
        const scale = mesh.metadata.base + age * 2.8;
        mesh.scaling.set(scale, 1, scale);
        mesh.rotation.y += dt * (0.45 + mesh.metadata.base * 0.12);
        mesh.getChildMeshes().forEach((child) => {
          child.visibility = Math.max(0, 1 - age * 0.48);
        });
      }

      if (mesh.metadata?.victoryShard) {
        mesh.rotation.y += dt * mesh.metadata.speed;
        mesh.position.y = mesh.metadata.lift + Math.sin(t * 4 + mesh.metadata.angle) * 0.18 + this.stateTime * 0.16;
        mesh.position.x += Math.cos(mesh.metadata.angle) * dt * 0.26;
        mesh.position.z += Math.sin(mesh.metadata.angle) * dt * 0.26;
      }

      if (mesh.metadata?.victoryBeam) {
        const pulse = 1 + Math.sin(t * 5.5 + mesh.metadata.phase) * 0.28;
        mesh.scaling.set(pulse, 1, 0.72 + pulse * 0.18);
        mesh.rotation.y += dt * 0.32;
        mesh.visibility = 0.34 + Math.sin(t * 4 + mesh.metadata.phase) * 0.12;
      }

      if (mesh.metadata?.dungeonCore) {
        const explode = Math.max(0, this.stateTime - 5.1);
        mesh.rotation.y += dt * (1.7 + explode);
        mesh.rotation.x += dt * 0.8;
        mesh.position.y = mesh.metadata.origin.y + Math.sin(t * 16) * Math.min(0.22, explode * 0.1);
        mesh.scaling.set(1 + explode * 0.22, 1 + explode * 0.22, 1 + explode * 0.22);
        mesh.visibility = Math.max(0.1, 1 - Math.max(0, explode - 1.4) * 0.42);
      }

      if (mesh.metadata?.prisonBar) {
        mesh.position.y += (mesh.metadata.targetY - mesh.position.y) * 0.16;
      }

      if (mesh.metadata?.darkShard) {
        mesh.rotation.y += dt * 3.4;
        mesh.rotation.x += dt * 1.7;
        mesh.position.y = 2.75 + Math.sin(t * 5) * 0.12;
      }

      if (mesh.metadata?.flame) {
        const pulse = 1 + Math.sin(t * 8 + mesh.metadata.phase) * 0.28;
        mesh.scaling.set(1, pulse, 1);
      }

      if (mesh.metadata?.chestGlow) {
        mesh.visibility = 0.55 + Math.sin(t * 8) * 0.22;
      }

      if (mesh.metadata?.strikeFx) {
        const strikeMetadata = mesh.metadata;
        strikeMetadata.age += dt;
        mesh.rotation.y += dt * 5;
        mesh.scaling.set(1, 1 + strikeMetadata.age * 1.8, 1);
        mesh.visibility = Math.max(0, 1 - strikeMetadata.age * 2.6);
        if (strikeMetadata.age > 0.5) {
          strikeMetadata.done = true;
          mesh.dispose(false, true);
        }
      }

      if (mesh.metadata?.rageWave) {
        mesh.metadata.age += dt;
        const age = mesh.metadata.age;
        const scale = 1 + age * 8.4;
        mesh.scaling.set(scale, scale, scale);
        mesh.visibility = Math.max(0, 0.9 - age * 1.8);
        if (age > 0.55) {
          mesh.metadata.done = true;
          mesh.dispose(false, true);
        }
      }

      if (mesh.metadata?.allyBeam) {
        mesh.metadata.age += dt;
        mesh.visibility = Math.max(0, 1 - mesh.metadata.age * 3.8);
        if (mesh.metadata.age > 0.28) {
          mesh.metadata.done = true;
          mesh.dispose(false, true);
        }
      }

      if (mesh.metadata?.energySphere) {
        const elapsed = (performance.now() - this.stateStartedAt) / 1000;
        const start = mesh.metadata.origin;
        const target = mesh.metadata.target;
        const travel = Math.min(1, Math.max(0, (elapsed - 0.8) / 2.1));
        const orbit = Math.sin(travel * Math.PI * 2) * 2.2;
        mesh.position.x = start.x + (target.x - start.x) * travel + orbit;
        mesh.position.z = start.z + (target.z - start.z) * travel + Math.cos(travel * Math.PI * 2) * 1.4;
        mesh.position.y = 1.1 + Math.sin(travel * Math.PI) * 2.8;
        mesh.rotation.y += dt * 5.5;
        mesh.rotation.x += dt * 3.8;
      }

      if (mesh.metadata?.megaSphere) {
        const elapsed = (performance.now() - this.stateStartedAt) / 1000;
        const grow = Math.min(1, Math.max(0, (elapsed - 2.5) / 1.2));
        const scale = 1 + grow * 6.2;
        const visibleForDestruction = this.finalStep <= 2 ? 1 : 0;
        mesh.scaling.set(scale, scale, scale);
        mesh.visibility += (grow * 0.18 * visibleForDestruction - mesh.visibility) * 0.12;
      }

      if (mesh.metadata?.collapsingBuilding) {
        const elapsed = (performance.now() - this.stateStartedAt) / 1000;
        const collapse = Math.min(1, Math.max(0, (elapsed - 3.2 - mesh.metadata.index * 0.04) / 1.0));
        mesh.rotation.z = collapse * (mesh.metadata.index % 2 === 0 ? -1.15 : 1.15);
        mesh.position.y = mesh.metadata.baseY - collapse * 0.45;
        mesh.visibility = Math.max(0.28, 1 - collapse * 0.45);
      }

      if (mesh.metadata?.donerShop) {
        const elapsed = (performance.now() - this.stateStartedAt) / 1000;
        const collapse = Math.min(1, Math.max(0, (elapsed - 4.0) / 1.0));
        mesh.rotation.z = collapse * -1.35;
        mesh.rotation.x = collapse * 0.55;
        mesh.position.y = 0.36 - collapse * 0.24;
      }
    }

    if (this.state === "dead") {
      const shake = Math.max(0, 0.18 - this.stateTime * 0.08);
      this.playerMesh.rotation.x += (-1.42 - this.playerMesh.rotation.x) * 0.18;
      this.playerMesh.rotation.z += (0.34 - this.playerMesh.rotation.z) * 0.14;
      this.playerMesh.position.y += (0.09 - this.playerMesh.position.y) * 0.2;
      this.playerMesh.scaling.y += (0.82 - this.playerMesh.scaling.y) * 0.24;
      this.camera.target.x = Math.sin(t * 38) * shake;
      this.camera.target.z = Math.cos(t * 33) * shake;
    } else if (this.state === "complete") {
      const portal = this.door?.root.position ?? this.playerMesh.position;
      const cinematic = Math.min(1, this.stateTime / 2.6);
      this.updateFinalStoryMotion(dt, portal);
      if (this.finalStep < 5) {
        if (Math.abs((this.cameraZoom || 1) - 1) > 0.01) {
          this.cameraZoom += (1 - this.cameraZoom) * 0.12;
          this.resizeCamera();
        }
        this.camera.target.x += (portal.x - this.camera.target.x) * 0.045;
        this.camera.target.z += (portal.z - this.camera.target.z) * 0.045;
        this.camera.beta += (0.64 - this.camera.beta) * 0.018;
      }
      this.glow.intensity = 0.7 + cinematic * 1.35 + Math.sin(t * 3.5) * 0.08;
      this.keyLight.intensity = 1.15 + cinematic * 1.8;
      if (this.victoryLight) {
        this.victoryLight.intensity = 1.8 + cinematic * 3.5 + Math.sin(t * 6) * 0.4;
      }
      if (this.finalStep < 5) {
        this.playerMesh.rotation.y += dt * 1.2;
        this.playerMesh.position.y = Math.min(1.25, this.playerMesh.position.y + dt * 0.52);
      }
    } else {
      if (Math.abs((this.cameraZoom || 1) - 1) > 0.01) {
        this.cameraZoom += (1 - this.cameraZoom) * 0.12;
        this.resizeCamera();
      }
      this.camera.target.x += (0 - this.camera.target.x) * 0.08;
      this.camera.target.z += (0 - this.camera.target.z) * 0.08;
      this.camera.beta += (0.82 - this.camera.beta) * 0.04;
      this.glow.intensity += (0.62 - this.glow.intensity) * 0.05;
      this.keyLight.intensity += (1.15 - this.keyLight.intensity) * 0.05;
    }

    this.scene.clearColor = new this.B.Color4(
      0.025 + this.damageFlash * 0.12,
      0.03 + this.healFlash * 0.08 + (this.state === "complete" ? 0.08 : 0),
      0.035 + (this.state === "complete" ? 0.035 : 0),
      1,
    );
  }

  updateFinalStoryMotion(dt, portal) {
    const elapsed = (performance.now() - this.stateStartedAt) / 1000;
    if (this.finalOrb) {
      const throwT = Math.min(1, elapsed / 1.1);
      const start = this.finalOrb.metadata.origin;
      const target = this.finalOrb.metadata.target;
      this.finalOrb.position.x = start.x + (target.x - start.x) * throwT;
      this.finalOrb.position.z = start.z + (target.z - start.z) * throwT;
      this.finalOrb.position.y = 1.2 + Math.sin(throwT * Math.PI) * 1.25 - throwT * 1.05;
      this.finalOrb.rotation.y += dt * 4.5;
      this.finalOrb.rotation.x += dt * 3.2;
      if (elapsed > 1.15) {
        this.finalOrb.position.y = 0.14 + Math.sin(performance.now() / 1000 * 8) * 0.035;
      }
    }

    if (this.kingRoot) {
      const runT = Math.min(1, Math.max(0, (elapsed - 3.4) / 1.5));
      const jumpT = Math.min(1, Math.max(0, (elapsed - 5.2) / 0.9));
      const start = this.kingRoot.metadata.start;
      const core = this.dungeonCore?.metadata?.origin ?? portal;
      this.kingRoot.position.x = start.x + (core.x - start.x) * runT;
      this.kingRoot.position.z = start.z + (core.z - start.z) * runT;
      this.kingRoot.position.y = Math.sin(jumpT * Math.PI) * 1.35;
      this.kingRoot.rotation.y = -1.35 + runT * 1.3 + jumpT * 1.6;
      this.kingRoot.rotation.x = jumpT * -0.75;
      if (this.finalStep >= 4) {
        this.kingRoot.position.y = 0.04;
        this.kingRoot.rotation.x += (1.25 - this.kingRoot.rotation.x) * 0.08;
        this.kingRoot.rotation.z += (0.35 - this.kingRoot.rotation.z) * 0.08;
      }
    }

    if (this.siblingRoot) {
      if (this.finalStep === 0) {
        this.siblingRoot.rotation.z = Math.sin(performance.now() / 1000 * 5) * 0.08;
      }
      if (this.finalStep >= 1) {
        this.siblingRoot.position.x += (this.playerMesh.position.x - 0.55 - this.siblingRoot.position.x) * 0.035;
        this.siblingRoot.position.z += (this.playerMesh.position.z - 0.2 - this.siblingRoot.position.z) * 0.035;
      }
    }

    if (this.blackEye) {
      if (this.finalStep >= 5) {
        this.blackEye.setEnabled(true);
        const eyeElapsed = (performance.now() - this.dialogStartedAt) / 1000;
        const zoomT = this.finalStep === 6 ? 1 : Math.min(1, eyeElapsed / 2.4);
        const smoothZoom = zoomT * zoomT * (3 - 2 * zoomT);
        const zoom = 1 + smoothZoom * 2.4;
        this.blackEye.scaling.set(zoom, zoom, zoom);
        this.camera.target.x += (this.blackEye.position.x - this.camera.target.x) * 0.12;
        this.camera.target.y += (this.blackEye.position.y - this.camera.target.y) * 0.08;
        this.camera.target.z += (this.blackEye.position.z - this.camera.target.z) * 0.12;
        this.camera.beta += (0.48 - this.camera.beta) * 0.03;
        this.cameraZoom = 1 + smoothZoom * 2.9;
        this.resizeCamera();
      } else {
        this.blackEye.setEnabled(false);
      }
    }

  }

  spawnPrisonTrap() {
    const B = this.B;
    this.prisonTrapSpawned = true;
    const center = this.playerMesh.position.clone();
    center.y = 0;
    const size = 1.55;

    for (let side = 0; side < 4; side += 1) {
      for (let i = -2; i <= 2; i += 1) {
        const bar = this.keep(B.MeshBuilder.CreateBox(`prison-bar-${side}-${i}`, {
          width: 0.08,
          height: 2.2,
          depth: 0.08,
        }, this.scene), true);
        const offset = i * 0.34;
        if (side < 2) {
          bar.position.set(center.x + offset, 1.1, center.z + (side === 0 ? -size : size));
        } else {
          bar.position.set(center.x + (side === 2 ? -size : size), 1.1, center.z + offset);
        }
        bar.material = this.materials.dark;
        bar.metadata = { prisonBar: true, targetY: bar.position.y };
        bar.position.y += 1.6 + Math.abs(i) * 0.12;
      }
    }

    const roof = this.keep(B.MeshBuilder.CreateBox("prison-roof", {
      width: size * 2.2,
      height: 0.12,
      depth: size * 2.2,
    }, this.scene), true);
    roof.position.set(center.x, 2.25, center.z);
    roof.material = this.materials.corruption;
    roof.metadata = { prisonBar: true, targetY: roof.position.y };
    roof.position.y += 1.2;

    const darkShard = this.keep(B.MeshBuilder.CreateBox("dark-power-shard", {
      width: 0.34,
      height: 0.34,
      depth: 0.34,
    }, this.scene), true);
    darkShard.position.set(center.x, 2.75, center.z);
    darkShard.rotation.set(0.4, 0.8, 0.2);
    darkShard.material = this.materials.corruption;
    darkShard.metadata = { darkShard: true };
  }

  updateHud() {
    const hearts = this.hud.querySelector("[data-hearts]");
    hearts.innerHTML = "";
    for (let i = 0; i < this.maxHp; i += 1) {
      const heart = document.createElement("span");
      heart.className = `heart${i < this.hp ? " full" : ""}`;
      hearts.appendChild(heart);
    }
    let roomText = `Oda ${this.roomIndex + 1}/${ROOM_DATA.length}`;
    if (this.inPrison) {
      roomText = "Gölge Hapishanesi";
    } else if (this.inSecretRoom) {
      roomText = "Gizli Sandık Odası";
    } else if (this.state === "escape") {
      roomText = "Kaçış";
    } else if (this.state === "king") {
      roomText = "Kral Savaşı";
    }
    this.hud.querySelector("[data-room]").textContent = roomText;
    const ragePercent = Math.round((this.rage / this.maxRage) * 100);
    const rageFill = this.hud.querySelector("[data-rage-fill]");
    const rageText = this.hud.querySelector("[data-rage-text]");
    const rageMeter = this.hud.querySelector(".rage-meter");
    if (rageFill) {
      rageFill.style.width = `${ragePercent}%`;
    }
    if (rageText) {
      rageText.textContent = this.rage >= this.maxRage ? "Öfke hazır: E" : `Öfke ${ragePercent}%`;
    }
    rageMeter?.classList.toggle("ready", this.rage >= this.maxRage);

    const hint = this.hud.querySelector("[data-hint]");
    if (hint) {
      const immortal = this.debugImmortal ? " - O: ölümsüzlük açık" : " - O: ölümsüzlük";
      const music = this.musicEnabled ? " - Müzik açık" : " - Müzik kapalı";
      const maps = this.mapFragments > 0 ? ` - Harita: ${this.mapFragments}/3` : "";
      hint.textContent = `WASD / gamepad - Space saldırı - E öfke - F tam ekran - Kılıç: ${POWER_NAMES[this.swordPower] ?? "Normal"}${maps}${immortal}${music}`;
    }
  }

  showMessage(title, body, variant = "", action = "") {
    this.hud.classList.toggle("show-message", Boolean(title));
    this.hud.classList.toggle("victory", variant === "victory");
    this.hud.classList.toggle("story", variant === "story");
    this.hud.classList.toggle("ending", variant === "ending");
    this.hud.querySelector("[data-message-title]").textContent = title;
    this.hud.querySelector("[data-message-body]").textContent = body;
    this.hud.querySelector("[data-message-action]").textContent = action;
  }
}
