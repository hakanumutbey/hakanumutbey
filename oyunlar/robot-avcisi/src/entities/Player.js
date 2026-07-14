import { GAME_CONFIG } from "../config.js";

export class Player {
  constructor(scene, canvas) {
    this.scene = scene;
    this.canvas = canvas;
    this.hp = GAME_CONFIG.player.hp;
    this.kills = 0;
    this.isSneaking = false;
    this.cosmeticId = "none";
    this.cameraSensitivity = 1800;
    this.invertY = false;

    this.camera = new BABYLON.UniversalCamera("playerCamera", new BABYLON.Vector3(0, GAME_CONFIG.player.height, -8), scene);
    this.camera.attachControl(canvas, true);
    this.camera.minZ = 0.08;
    this.camera.speed = GAME_CONFIG.player.speed;
    this.camera.angularSensibility = 1800;
    this.camera.keysUp = [87];
    this.camera.keysDown = [83];
    this.camera.keysLeft = [65];
    this.camera.keysRight = [68];
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.ellipsoid = new BABYLON.Vector3(0.45, 0.85, 0.45);
    scene.activeCamera = this.camera;
    canvas.addEventListener("pointermove", (event) => this.correctInvertedY(event));
    this.cosmeticMeshes = [];
    this.cosmeticMaterials = new Map();
  }

  setLookSettings(sensitivity = this.cameraSensitivity, invertY = this.invertY) {
    this.cameraSensitivity = Math.max(1, Number(sensitivity) || 1800);
    this.invertY = Boolean(invertY);
    this.camera.angularSensibility = this.cameraSensitivity;
    const mouseInput = this.camera.inputs?.attached?.mouse;
    if (mouseInput) mouseInput.angularSensibility = this.cameraSensitivity;
  }

  correctInvertedY(event) {
    if (!this.invertY || document.pointerLockElement !== this.canvas) return;
    const sensitivity = Math.max(1, Math.abs(this.cameraSensitivity));
    this.camera.cameraRotation.x -= (2 * Number(event.movementY || 0)) / sensitivity;
  }

  update(input) {
    this.isSneaking = input.isActionDown?.("sneak") || input.isDown("control") || input.isDown("ctrl");
    this.camera.speed = this.currentSpeed(input);
    this.camera.position.x = clamp(this.camera.position.x, GAME_CONFIG.world.minX, GAME_CONFIG.world.maxX);
    this.camera.position.z = clamp(this.camera.position.z, GAME_CONFIG.world.minZ, GAME_CONFIG.world.maxZ);
    this.camera.position.y = this.isSneaking ? GAME_CONFIG.player.sneakHeight : GAME_CONFIG.player.height;
    this.camera.cameraDirection.y = 0;
  }

  currentSpeed(input) {
    if (this.isSneaking) return GAME_CONFIG.player.sneakSpeed;
    return input.isDown("shift") ? GAME_CONFIG.player.sprintSpeed : GAME_CONFIG.player.speed;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(GAME_CONFIG.player.hp, this.hp + amount);
  }

  respawn() {
    this.hp = GAME_CONFIG.player.hp;
    this.isSneaking = false;
    this.camera.position.set(0, GAME_CONFIG.player.height, -8);
  }

  applyCosmetic(item) {
    this.clearCosmetic();
    this.cosmeticId = item?.id || "none";
    if (!item || item.kind === "none") return;
    if (item.kind === "hat") this.createHat(item);
    if (item.kind === "helmet") this.createHelmet(item);
    if (item.kind === "armor") this.createArmor(item);
    if (item.kind === "robotSkin") this.createRobotSkin(item);
  }

  clearCosmetic() {
    for (const mesh of this.cosmeticMeshes) {
      if (!mesh.isDisposed()) mesh.dispose();
    }
    this.cosmeticMeshes = [];
  }

  createHat(item) {
    const brim = BABYLON.MeshBuilder.CreateBox("playerCosmeticHatBrim", { width: 0.52, height: 0.035, depth: 0.28 }, this.scene);
    this.attachFirstPersonCosmetic(brim, new BABYLON.Vector3(-0.52, -0.62, 0.86), this.cosmeticMaterial(item));

    const top = BABYLON.MeshBuilder.CreateCylinder("playerCosmeticHatTop", { diameter: 0.24, height: 0.16, tessellation: 18 }, this.scene);
    this.attachFirstPersonCosmetic(top, new BABYLON.Vector3(-0.52, -0.54, 0.86), brim.material);
    this.cosmeticMeshes.push(brim, top);
  }

  createHelmet(item) {
    const shell = BABYLON.MeshBuilder.CreateSphere("playerCosmeticHelmet", { diameter: 0.42, segments: 18 }, this.scene);
    this.attachFirstPersonCosmetic(shell, new BABYLON.Vector3(-0.52, -0.52, 0.9), this.cosmeticMaterial(item));
    shell.scaling.y = 0.55;

    const visor = BABYLON.MeshBuilder.CreateBox("playerCosmeticHelmetVisor", { width: 0.34, height: 0.08, depth: 0.03 }, this.scene);
    this.attachFirstPersonCosmetic(visor, new BABYLON.Vector3(-0.52, -0.5, 0.86), this.cosmeticMaterial({ id: `${item.id}_visor`, color: [0.04, 0.16, 0.22] }));
    this.cosmeticMeshes.push(shell, visor);
  }

  createArmor(item) {
    const chest = BABYLON.MeshBuilder.CreateBox("playerCosmeticArmorChest", { width: 0.7, height: 0.42, depth: 0.16 }, this.scene);
    this.attachFirstPersonCosmetic(chest, new BABYLON.Vector3(-0.54, -0.64, 0.9), this.cosmeticMaterial(item));

    const core = BABYLON.MeshBuilder.CreateSphere("playerCosmeticArmorCore", { diameter: 0.14, segments: 12 }, this.scene);
    this.attachFirstPersonCosmetic(core, new BABYLON.Vector3(-0.54, -0.58, 0.84), this.cosmeticMaterial({ id: `${item.id}_core`, color: [0.2, 1, 0.8] }));
    this.cosmeticMeshes.push(chest, core);
  }

  createRobotSkin(item) {
    const faceplate = BABYLON.MeshBuilder.CreateBox("playerCosmeticRobotFaceplate", { width: 0.46, height: 0.18, depth: 0.035 }, this.scene);
    this.attachFirstPersonCosmetic(faceplate, new BABYLON.Vector3(-0.52, -0.52, 0.88), this.cosmeticMaterial(item));

    const leftAntenna = BABYLON.MeshBuilder.CreateCylinder("playerCosmeticRobotAntennaL", { diameter: 0.035, height: 0.34, tessellation: 10 }, this.scene);
    this.attachFirstPersonCosmetic(leftAntenna, new BABYLON.Vector3(-0.67, -0.43, 0.92), faceplate.material);
    leftAntenna.rotation.z = -0.18;

    const rightAntenna = BABYLON.MeshBuilder.CreateCylinder("playerCosmeticRobotAntennaR", { diameter: 0.035, height: 0.34, tessellation: 10 }, this.scene);
    this.attachFirstPersonCosmetic(rightAntenna, new BABYLON.Vector3(-0.39, -0.43, 0.92), faceplate.material);
    rightAntenna.rotation.z = 0.18;

    const chestCore = BABYLON.MeshBuilder.CreateSphere("playerCosmeticRobotCore", { diameter: 0.16, segments: 12 }, this.scene);
    this.attachFirstPersonCosmetic(chestCore, new BABYLON.Vector3(-0.54, -0.62, 0.86), this.cosmeticMaterial({ id: `${item.id}_core`, color: [1, 0.55, 0.18] }));
    this.cosmeticMeshes.push(faceplate, leftAntenna, rightAntenna, chestCore);
  }

  attachFirstPersonCosmetic(mesh, position, material) {
    mesh.parent = this.camera;
    mesh.position = position;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = { kind: "playerCosmetic", cosmeticId: this.cosmeticId };
  }

  cosmeticMaterial(item) {
    if (this.cosmeticMaterials.has(item.id)) return this.cosmeticMaterials.get(item.id);
    const material = new BABYLON.StandardMaterial(`playerCosmetic_${item.id}Mat`, this.scene);
    material.diffuseColor = new BABYLON.Color3(...(item.color || [1, 1, 1]));
    material.emissiveColor = new BABYLON.Color3(...(item.color || [1, 1, 1])).scale(0.12);
    material.specularColor = new BABYLON.Color3(0.12, 0.12, 0.12);
    this.cosmeticMaterials.set(item.id, material);
    return material;
  }

  get position() {
    return this.camera.position;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
