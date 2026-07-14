import { chatCommandEmote } from "../utils/chatCommands.js";
import { normalizePartyCosmeticId, normalizePartyUpgradeLevel, normalizePartyWeaponId, partyWeaponColor } from "../utils/partyLoadout.js";
import {
  normalizePartyBattery,
  normalizePartyFlashlight,
  normalizePartyHp,
  normalizePartyRoom,
  normalizePartyX,
  normalizePartyY,
  normalizePartyYaw,
  normalizePartyZ
} from "../utils/partyState.js";

export class PartyAvatarSystem {
  constructor(scene, partyClient) {
    this.scene = scene;
    this.party = partyClient;
    this.avatars = new Map();
    this.localEffects = [];
    this.materials = this.createMaterials();
  }

  update() {
    const currentRoom = this.party.currentRoom();
    for (const [id, player] of this.party.otherPlayers) {
      if (this.remotePlayerRoom(player) !== currentRoom) {
        if (this.avatars.has(id)) this.removeAvatar(id);
        continue;
      }
      const avatar = this.avatars.get(id) || this.createAvatar(id, player.name);
      const target = this.remotePlayerPosition(player);
      avatar.root.position = BABYLON.Vector3.Lerp(avatar.root.position, target, 0.22);
      avatar.root.rotation.y = lerpAngle(avatar.root.rotation.y, normalizePartyYaw(player.yaw, avatar.root.rotation.y), 0.28);
      this.updateEmote(avatar);
      if (avatar.nameText.text !== player.name) {
        avatar.nameText.text = player.name;
        avatar.nameText.draw();
      }
      this.updateHealthBar(avatar, player.hp);
      this.updateCosmetic(avatar, player.cosmeticId);
      this.updateSneakPose(avatar, player.sneaking);
      this.updateWeapon(avatar, player.weaponId, player.upgradeLevel);
      this.updateFlashlight(avatar, player.flashlightOn, player.battery);
    }

    for (const id of [...this.avatars.keys()]) {
      const player = this.party.otherPlayers.get(id);
      if (!player || this.remotePlayerRoom(player) !== currentRoom) this.removeAvatar(id);
    }

    this.updateLocalEffects();
  }

  remotePlayerRoom(player) {
    return normalizePartyRoom(player?.room);
  }

  remotePlayerPosition(player) {
    return new BABYLON.Vector3(
      normalizePartyX(player?.x),
      normalizePartyY(player?.y) - 0.85,
      normalizePartyZ(player?.z)
    );
  }

  createAvatar(id, name) {
    const root = new BABYLON.TransformNode(`partyAvatar_${id}`, this.scene);

    const body = BABYLON.MeshBuilder.CreateCapsule(`partyAvatarBody_${id}`, {
      height: 1.55,
      radius: 0.28
    }, this.scene);
    body.parent = root;
    body.position.y = 0.78;
    body.material = this.materials.body;

    const head = BABYLON.MeshBuilder.CreateSphere(`partyAvatarHead_${id}`, { diameter: 0.34 }, this.scene);
    head.parent = root;
    head.position.y = 1.72;
    head.material = this.materials.head;

    const visor = BABYLON.MeshBuilder.CreateBox(`partyAvatarVisor_${id}`, { width: 0.28, height: 0.08, depth: 0.035 }, this.scene);
    visor.parent = root;
    visor.position = new BABYLON.Vector3(0, 1.73, 0.19);
    visor.material = this.materials.visor;

    const directionMarker = BABYLON.MeshBuilder.CreateBox(`partyAvatarDirection_${id}`, { width: 0.12, height: 0.1, depth: 0.36 }, this.scene);
    directionMarker.parent = root;
    directionMarker.position = new BABYLON.Vector3(0, 1.08, 0.43);
    directionMarker.material = this.materials.direction;

    const flashlightLamp = BABYLON.MeshBuilder.CreateSphere(`partyAvatarFlashlightLamp_${id}`, { diameter: 0.12, segments: 12 }, this.scene);
    flashlightLamp.parent = root;
    flashlightLamp.position = new BABYLON.Vector3(0, 1.58, 0.27);
    flashlightLamp.material = this.materials.flashlightOff;

    const flashlightCone = BABYLON.MeshBuilder.CreateCylinder(`partyAvatarFlashlightCone_${id}`, {
      diameterTop: 0.12,
      diameterBottom: 1.4,
      height: 2.8,
      tessellation: 24
    }, this.scene);
    flashlightCone.parent = root;
    flashlightCone.position = new BABYLON.Vector3(0, 1.48, 1.62);
    flashlightCone.rotation.x = Math.PI / 2;
    flashlightCone.material = this.materials.flashlightCone;
    flashlightCone.isPickable = false;
    flashlightCone.setEnabled(false);

    const cosmeticRoot = new BABYLON.TransformNode(`partyAvatarCosmeticRoot_${id}`, this.scene);
    cosmeticRoot.parent = root;

    const weaponRoot = new BABYLON.TransformNode(`partyAvatarWeaponRoot_${id}`, this.scene);
    weaponRoot.parent = root;
    weaponRoot.position = new BABYLON.Vector3(0.42, 1.04, 0.34);
    weaponRoot.rotation = new BABYLON.Vector3(0.12, -0.18, -0.26);

    const plane = BABYLON.MeshBuilder.CreatePlane(`partyAvatarName_${id}`, { width: 1.6, height: 0.34 }, this.scene);
    plane.parent = root;
    plane.position.y = 2.12;
    const texture = new BABYLON.DynamicTexture(`partyAvatarNameTexture_${id}`, { width: 256, height: 64 }, this.scene);
    const mat = new BABYLON.StandardMaterial(`partyAvatarNameMat_${id}`, this.scene);
    mat.diffuseTexture = texture;
    mat.emissiveColor = new BABYLON.Color3(0.9, 1, 0.95);
    mat.opacityTexture = texture;
    plane.material = mat;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const nameText = {
      text: name,
      draw() {
        texture.clear();
        texture.drawText(this.text, 12, 42, "bold 28px Arial", "white", "transparent", true);
      }
    };
    nameText.draw();

    const healthBack = BABYLON.MeshBuilder.CreatePlane(`partyAvatarHealthBack_${id}`, { width: 1.08, height: 0.13 }, this.scene);
    healthBack.parent = root;
    healthBack.position.y = 2.38;
    healthBack.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    healthBack.material = this.materials.healthBack;

    const healthFill = BABYLON.MeshBuilder.CreatePlane(`partyAvatarHealthFill_${id}`, { width: 1, height: 0.08 }, this.scene);
    healthFill.parent = root;
    healthFill.position.y = 2.38;
    healthFill.position.z = -0.01;
    healthFill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    healthFill.material = this.materials.healthGood;

    this.avatars.set(id, {
      root,
      body,
      head,
      visor,
      directionMarker,
      flashlightLamp,
      flashlightCone,
      namePlane: plane,
      nameText,
      texture,
      healthBack,
      healthFill,
      cosmeticRoot,
      weaponRoot,
      weaponId: "",
      weaponUpgradeLevel: 0,
      weaponMeshes: [],
      flashlightOn: false,
      battery: 100,
      cosmeticId: "",
      cosmeticMeshes: [],
      emote: null,
      emoteUntil: 0,
      effectMeshes: []
    });
    this.updateHealthBar(this.avatars.get(id), 100);
    return this.avatars.get(id);
  }

  playRemoteCommand(playerId, command) {
    const emote = chatCommandEmote(command);
    if (!emote) return false;
    let avatar = this.avatars.get(playerId);
    if (!avatar) {
      const player = this.party.otherPlayers.get(playerId);
      if (!player || this.remotePlayerRoom(player) !== this.party.currentRoom()) return false;
      avatar = this.createAvatar(playerId, player.name);
      avatar.root.position = this.remotePlayerPosition(player);
      avatar.root.rotation.y = normalizePartyYaw(player.yaw);
      this.updateHealthBar(avatar, player.hp);
      this.updateCosmetic(avatar, player.cosmeticId);
      this.updateSneakPose(avatar, player.sneaking);
      this.updateWeapon(avatar, player.weaponId, player.upgradeLevel);
      this.updateFlashlight(avatar, player.flashlightOn, player.battery);
    }
    avatar.emote = emote;
    avatar.emoteUntil = performance.now() + 1200;
    this.clearAvatarEffects(avatar);
    if (emote === "highFive") this.createHighFiveEffect(avatar.root.position, avatar);
    if (emote === "hug") this.createHugEffect(avatar.root.position, avatar);
    return true;
  }

  playLocalCommand(position, command) {
    const emote = chatCommandEmote(command);
    if (!emote) return false;
    if (emote === "dance") {
      this.localEffects.push(this.createPulse(position, this.materials.dance, 900));
      return true;
    }
    if (emote === "highFive") return this.playNearestInteraction(position, emote);
    if (emote === "hug") return this.playNearestInteraction(position, emote);
    return true;
  }

  playNearestInteraction(position, emote) {
    const nearest = this.nearestAvatar(position, 3.2);
    if (!nearest) {
      const material = emote === "highFive" ? this.materials.highFive : this.materials.hug;
      this.localEffects.push(this.createPulse(position, material, 800));
      return null;
    }

    nearest.avatar.emote = emote;
    nearest.avatar.emoteUntil = performance.now() + 1200;
    this.clearAvatarEffects(nearest.avatar);
    if (emote === "highFive") {
      this.createHighFiveEffect(nearest.avatar.root.position, nearest.avatar);
      this.localEffects.push(this.createLineEffect(position, nearest.avatar.root.position, this.materials.highFive, 650));
    }
    if (emote === "hug") {
      this.createHugEffect(nearest.avatar.root.position, nearest.avatar);
      this.localEffects.push(this.createLineEffect(position, nearest.avatar.root.position, this.materials.hug, 900));
    }
    return nearest;
  }

  nearestAvatar(position, range = Infinity) {
    let nearest = null;
    let nearestDistance = range;
    for (const [id, avatar] of this.avatars) {
      const distance = BABYLON.Vector3.Distance(
        new BABYLON.Vector3(position.x, 0, position.z),
        new BABYLON.Vector3(avatar.root.position.x, 0, avatar.root.position.z)
      );
      if (distance < nearestDistance) {
        nearest = { id, avatar, distance, player: this.party.otherPlayers.get(id) };
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  updateEmote(avatar) {
    if (!avatar.emote) return;
    const now = performance.now();
    if (now > avatar.emoteUntil) {
      avatar.emote = null;
      avatar.root.rotation.z = 0;
      avatar.body.scaling.y = 1;
      this.clearAvatarEffects(avatar);
      return;
    }

    const t = now / 110;
    if (avatar.emote === "dance") {
      avatar.root.rotation.z = Math.sin(t) * 0.28;
      avatar.body.scaling.y = 1 + Math.sin(t * 1.8) * 0.08;
      return;
    }
    if (avatar.emote === "highFive") {
      avatar.body.scaling.y = 1 + Math.abs(Math.sin(t)) * 0.12;
      return;
    }
    if (avatar.emote === "hug") {
      avatar.root.rotation.z = Math.sin(t * 0.6) * 0.12;
    }
  }

  updateHealthBar(avatar, hpValue) {
    const hp = normalizePartyHp(hpValue);
    const ratio = hp / 100;
    avatar.healthFill.scaling.x = Math.max(0.02, ratio);
    avatar.healthFill.position.x = -0.5 * (1 - ratio);
    avatar.healthFill.material = ratio > 0.55 ? this.materials.healthGood : ratio > 0.28 ? this.materials.healthWarn : this.materials.healthLow;
  }

  updateSneakPose(avatar, sneaking = false) {
    const amount = sneaking ? 1 : 0;
    avatar.sneakAmount = lerp(avatar.sneakAmount || 0, amount, 0.32);
    const crouch = avatar.sneakAmount;
    avatar.body.scaling.y = 1 - crouch * 0.28;
    avatar.body.position.y = 0.78 - crouch * 0.12;
    avatar.head.position.y = 1.72 - crouch * 0.34;
    avatar.visor.position.y = 1.73 - crouch * 0.34;
    avatar.directionMarker.position.y = 1.08 - crouch * 0.18;
    avatar.flashlightLamp.position.y = 1.58 - crouch * 0.34;
    avatar.flashlightCone.position.y = 1.48 - crouch * 0.34;
    avatar.namePlane.position.y = 2.12 - crouch * 0.36;
    avatar.healthBack.position.y = 2.38 - crouch * 0.36;
    avatar.healthFill.position.y = 2.38 - crouch * 0.36;
    avatar.cosmeticRoot.position.y = -crouch * 0.34;
    avatar.weaponRoot.position.y = 1.04 - crouch * 0.18;
  }

  updateWeapon(avatar, weaponId = "pistol", upgradeLevel = 0) {
    const id = normalizePartyWeaponId(weaponId);
    const level = normalizePartyUpgradeLevel(upgradeLevel);
    if (avatar.weaponId === id && avatar.weaponUpgradeLevel === level) return;
    this.clearWeapon(avatar);
    avatar.weaponId = id;
    avatar.weaponUpgradeLevel = level;
    this.createWeapon(avatar, id, level);
  }

  updateFlashlight(avatar, flashlightOn = false, batteryValue = 100) {
    const battery = normalizePartyBattery(batteryValue, 0);
    const enabled = normalizePartyFlashlight(flashlightOn, battery);
    if (avatar.flashlightOn === enabled && avatar.battery === battery) return;
    avatar.flashlightOn = enabled;
    avatar.battery = battery;
    avatar.flashlightLamp.material = enabled
      ? battery > 25 ? this.materials.flashlightOn : this.materials.flashlightLow
      : this.materials.flashlightOff;
    avatar.flashlightCone.setEnabled(enabled);
    if (enabled) {
      avatar.flashlightCone.scaling.set(1, battery > 25 ? 1 : 0.72, 1);
      avatar.flashlightCone.material.alpha = battery > 25 ? 0.2 : 0.12;
    }
  }

  createWeapon(avatar, weaponId, upgradeLevel) {
    const color = partyWeaponColor(weaponId);
    const material = this.weaponMaterial(weaponId, upgradeLevel, color);
    const grip = BABYLON.MeshBuilder.CreateBox(`partyWeaponGrip_${Date.now()}`, { width: 0.09, height: 0.28, depth: 0.11 }, this.scene);
    grip.parent = avatar.weaponRoot;
    grip.position = new BABYLON.Vector3(0, -0.08, 0);
    grip.rotation.x = 0.18;
    grip.material = material;

    const barrel = BABYLON.MeshBuilder.CreateBox(`partyWeaponBarrel_${Date.now()}`, {
      width: weaponId === "scrapRifle" ? 0.18 : 0.13,
      height: 0.1,
      depth: weaponId === "ionBlaster" ? 0.72 : weaponId === "scrapRifle" ? 0.64 : 0.44
    }, this.scene);
    barrel.parent = avatar.weaponRoot;
    barrel.position = new BABYLON.Vector3(0, 0.05, 0.24);
    barrel.material = material;
    avatar.weaponMeshes.push(grip, barrel);

    if (weaponId === "ionBlaster" || upgradeLevel > 0) {
      const core = BABYLON.MeshBuilder.CreateSphere(`partyWeaponCore_${Date.now()}`, { diameter: 0.14 + Math.min(0.08, upgradeLevel * 0.012), segments: 12 }, this.scene);
      core.parent = avatar.weaponRoot;
      core.position = new BABYLON.Vector3(0, 0.06, 0.02);
      core.material = this.materials.weaponCore;
      avatar.weaponMeshes.push(core);
    }
  }

  weaponMaterial(weaponId, upgradeLevel, color) {
    const key = `${weaponId}_${upgradeLevel > 0 ? "upgraded" : "base"}`;
    if (!this.materials.weapons.has(key)) {
      const material = new BABYLON.StandardMaterial(`partyWeapon_${key}Mat`, this.scene);
      material.diffuseColor = new BABYLON.Color3(...color);
      material.emissiveColor = new BABYLON.Color3(...color).scale(upgradeLevel > 0 ? 0.18 : 0.08);
      material.specularColor = new BABYLON.Color3(0.16, 0.16, 0.16);
      this.materials.weapons.set(key, material);
    }
    return this.materials.weapons.get(key);
  }

  updateCosmetic(avatar, cosmeticId = "none") {
    const id = normalizePartyCosmeticId(cosmeticId);
    if (avatar.cosmeticId === id) return;
    this.clearCosmetic(avatar);
    avatar.cosmeticId = id;
    if (id === "cap") this.createCap(avatar);
    if (id === "helmet") this.createHelmet(avatar);
    if (id === "armor") this.createArmor(avatar);
    if (id === "robotSkin") this.createRobotSkin(avatar);
  }

  createCap(avatar) {
    const brim = BABYLON.MeshBuilder.CreateBox(`partyCosmeticCapBrim_${Date.now()}`, { width: 0.58, height: 0.045, depth: 0.32 }, this.scene);
    brim.parent = avatar.cosmeticRoot;
    brim.position = new BABYLON.Vector3(0, 1.93, 0.04);
    brim.material = this.materials.cap;

    const top = BABYLON.MeshBuilder.CreateCylinder(`partyCosmeticCapTop_${Date.now()}`, { diameter: 0.3, height: 0.18, tessellation: 18 }, this.scene);
    top.parent = avatar.cosmeticRoot;
    top.position = new BABYLON.Vector3(0, 2.04, 0);
    top.material = this.materials.cap;
    avatar.cosmeticMeshes.push(brim, top);
  }

  createHelmet(avatar) {
    const shell = BABYLON.MeshBuilder.CreateSphere(`partyCosmeticHelmet_${Date.now()}`, { diameter: 0.5, segments: 18 }, this.scene);
    shell.parent = avatar.cosmeticRoot;
    shell.position = new BABYLON.Vector3(0, 1.76, 0);
    shell.scaling.y = 0.62;
    shell.material = this.materials.helmet;

    const visor = BABYLON.MeshBuilder.CreateBox(`partyCosmeticHelmetVisor_${Date.now()}`, { width: 0.34, height: 0.09, depth: 0.04 }, this.scene);
    visor.parent = avatar.cosmeticRoot;
    visor.position = new BABYLON.Vector3(0, 1.76, 0.25);
    visor.material = this.materials.helmetVisor;
    avatar.cosmeticMeshes.push(shell, visor);
  }

  createArmor(avatar) {
    const chest = BABYLON.MeshBuilder.CreateBox(`partyCosmeticArmor_${Date.now()}`, { width: 0.76, height: 0.46, depth: 0.22 }, this.scene);
    chest.parent = avatar.cosmeticRoot;
    chest.position = new BABYLON.Vector3(0, 1.05, 0.03);
    chest.material = this.materials.armor;

    const core = BABYLON.MeshBuilder.CreateSphere(`partyCosmeticArmorCore_${Date.now()}`, { diameter: 0.14, segments: 12 }, this.scene);
    core.parent = avatar.cosmeticRoot;
    core.position = new BABYLON.Vector3(0, 1.08, 0.16);
    core.material = this.materials.armorCore;
    avatar.cosmeticMeshes.push(chest, core);
  }

  createRobotSkin(avatar) {
    const faceplate = BABYLON.MeshBuilder.CreateBox(`partyCosmeticRobotFace_${Date.now()}`, { width: 0.42, height: 0.18, depth: 0.05 }, this.scene);
    faceplate.parent = avatar.cosmeticRoot;
    faceplate.position = new BABYLON.Vector3(0, 1.77, 0.25);
    faceplate.material = this.materials.robotSkin;

    const leftAntenna = BABYLON.MeshBuilder.CreateCylinder(`partyCosmeticRobotAntennaL_${Date.now()}`, { diameter: 0.035, height: 0.34, tessellation: 10 }, this.scene);
    leftAntenna.parent = avatar.cosmeticRoot;
    leftAntenna.position = new BABYLON.Vector3(-0.18, 2.03, 0.02);
    leftAntenna.rotation.z = -0.18;
    leftAntenna.material = this.materials.robotSkin;

    const rightAntenna = BABYLON.MeshBuilder.CreateCylinder(`partyCosmeticRobotAntennaR_${Date.now()}`, { diameter: 0.035, height: 0.34, tessellation: 10 }, this.scene);
    rightAntenna.parent = avatar.cosmeticRoot;
    rightAntenna.position = new BABYLON.Vector3(0.18, 2.03, 0.02);
    rightAntenna.rotation.z = 0.18;
    rightAntenna.material = this.materials.robotSkin;

    const chestCore = BABYLON.MeshBuilder.CreateSphere(`partyCosmeticRobotCore_${Date.now()}`, { diameter: 0.16, segments: 12 }, this.scene);
    chestCore.parent = avatar.cosmeticRoot;
    chestCore.position = new BABYLON.Vector3(0, 1.08, 0.16);
    chestCore.material = this.materials.robotSkinCore;
    avatar.cosmeticMeshes.push(faceplate, leftAntenna, rightAntenna, chestCore);
  }

  createHighFiveEffect(position, avatar) {
    const spark = BABYLON.MeshBuilder.CreateSphere(`partyHighFive_${Date.now()}`, { diameter: 0.34, segments: 12 }, this.scene);
    spark.parent = avatar.root;
    spark.position = new BABYLON.Vector3(0.46, 1.5, -0.18);
    spark.material = this.materials.highFive;
    avatar.effectMeshes.push(spark);
  }

  createHugEffect(position, avatar) {
    const ring = BABYLON.MeshBuilder.CreateTorus(`partyHug_${Date.now()}`, { diameter: 1.05, thickness: 0.04 }, this.scene);
    ring.parent = avatar.root;
    ring.position = new BABYLON.Vector3(0, 1.0, 0);
    ring.rotation.x = Math.PI / 2;
    ring.material = this.materials.hug;
    avatar.effectMeshes.push(ring);
  }

  createPulse(position, material, duration) {
    const ring = BABYLON.MeshBuilder.CreateTorus(`localEmote_${Date.now()}`, { diameter: 0.75, thickness: 0.035 }, this.scene);
    ring.position = new BABYLON.Vector3(position.x, 0.12, position.z);
    ring.rotation.x = Math.PI / 2;
    ring.material = material;
    return { mesh: ring, createdAt: performance.now(), duration };
  }

  createLineEffect(from, to, material, duration) {
    const mid = BABYLON.Vector3.Center(from, to);
    const distance = BABYLON.Vector3.Distance(
      new BABYLON.Vector3(from.x, 0, from.z),
      new BABYLON.Vector3(to.x, 0, to.z)
    );
    const beam = BABYLON.MeshBuilder.CreateBox(`localInteraction_${Date.now()}`, {
      width: 0.08,
      height: 0.08,
      depth: Math.max(0.2, distance)
    }, this.scene);
    beam.position = new BABYLON.Vector3(mid.x, 1.1, mid.z);
    beam.lookAt(new BABYLON.Vector3(to.x, 1.1, to.z));
    beam.material = material;
    return { mesh: beam, createdAt: performance.now(), duration };
  }

  updateLocalEffects() {
    const now = performance.now();
    for (const effect of [...this.localEffects]) {
      const age = now - effect.createdAt;
      if (age > effect.duration) {
        effect.mesh.dispose();
        this.localEffects = this.localEffects.filter((item) => item !== effect);
        continue;
      }
      const scale = 1 + age / effect.duration;
      effect.mesh.scaling.set(scale, scale, scale);
    }
  }

  removeAvatar(id) {
    const avatar = this.avatars.get(id);
    if (!avatar) return;
    avatar.root.dispose();
    avatar.texture.dispose();
    this.clearAvatarEffects(avatar);
    this.clearCosmetic(avatar);
    this.clearWeapon(avatar);
    this.avatars.delete(id);
  }

  clearAvatarEffects(avatar) {
    for (const mesh of avatar.effectMeshes || []) {
      if (!mesh.isDisposed()) mesh.dispose();
    }
    avatar.effectMeshes = [];
  }

  clearCosmetic(avatar) {
    for (const mesh of avatar.cosmeticMeshes || []) {
      if (!mesh.isDisposed()) mesh.dispose();
    }
    avatar.cosmeticMeshes = [];
  }

  clearWeapon(avatar) {
    for (const mesh of avatar.weaponMeshes || []) {
      if (!mesh.isDisposed()) mesh.dispose();
    }
    avatar.weaponMeshes = [];
  }

  createMaterials() {
    const body = new BABYLON.StandardMaterial("partyAvatarBodyMat", this.scene);
    body.diffuseColor = new BABYLON.Color3(0.7, 0.32, 0.86);
    const head = new BABYLON.StandardMaterial("partyAvatarHeadMat", this.scene);
    head.diffuseColor = new BABYLON.Color3(0.92, 0.76, 0.56);
    const visor = emissive("partyAvatarVisorMat", [0.12, 0.95, 1], this.scene);
    const direction = emissive("partyAvatarDirectionMat", [1, 0.72, 0.22], this.scene);
    const flashlightOn = emissive("partyFlashlightOnMat", [1, 0.95, 0.62], this.scene);
    const flashlightLow = emissive("partyFlashlightLowMat", [1, 0.46, 0.18], this.scene);
    const flashlightOff = emissive("partyFlashlightOffMat", [0.12, 0.13, 0.12], this.scene);
    const flashlightCone = emissive("partyFlashlightConeMat", [1, 0.92, 0.58], this.scene);
    flashlightCone.alpha = 0.2;
    const dance = emissive("partyDanceMat", [0.4, 1, 0.7], this.scene);
    const highFive = emissive("partyHighFiveMat", [1, 0.9, 0.2], this.scene);
    const hug = emissive("partyHugMat", [1, 0.45, 0.78], this.scene);
    const healthBack = emissive("partyHealthBackMat", [0.08, 0.1, 0.12], this.scene);
    healthBack.alpha = 0.8;
    const healthGood = emissive("partyHealthGoodMat", [0.18, 1, 0.42], this.scene);
    const healthWarn = emissive("partyHealthWarnMat", [1, 0.72, 0.18], this.scene);
    const healthLow = emissive("partyHealthLowMat", [1, 0.2, 0.16], this.scene);
    const cap = emissive("partyCosmeticCapMat", [0.95, 0.78, 0.24], this.scene);
    const helmet = emissive("partyCosmeticHelmetMat", [0.42, 0.86, 1], this.scene);
    const helmetVisor = emissive("partyCosmeticHelmetVisorMat", [0.04, 0.16, 0.22], this.scene);
    const armor = emissive("partyCosmeticArmorMat", [0.72, 0.42, 1], this.scene);
    const armorCore = emissive("partyCosmeticArmorCoreMat", [0.2, 1, 0.8], this.scene);
    const robotSkin = emissive("partyCosmeticRobotSkinMat", [0.2, 0.95, 1], this.scene);
    const robotSkinCore = emissive("partyCosmeticRobotSkinCoreMat", [1, 0.55, 0.18], this.scene);
    const weaponCore = emissive("partyWeaponCoreMat", [0.2, 0.95, 1], this.scene);
    const weapons = new Map();
    return {
      body,
      head,
      visor,
      direction,
      flashlightOn,
      flashlightLow,
      flashlightOff,
      flashlightCone,
      dance,
      highFive,
      hug,
      healthBack,
      healthGood,
      healthWarn,
      healthLow,
      cap,
      helmet,
      helmetVisor,
      armor,
      armorCore,
      robotSkin,
      robotSkinCore,
      weaponCore,
      weapons
    };
  }
}

function lerpAngle(from, to, amount) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * amount;
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function emissive(name, color, scene) {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = new BABYLON.Color3(...color);
  material.emissiveColor = new BABYLON.Color3(...color).scale(0.4);
  return material;
}
