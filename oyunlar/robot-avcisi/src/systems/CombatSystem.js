import { GAME_CONFIG } from "../config.js";

export class CombatSystem {
  constructor(scene, player, robotManager, hud, audio, onExplosion = null) {
    this.scene = scene;
    this.player = player;
    this.robotManager = robotManager;
    this.hud = hud;
    this.audio = audio;
    this.onExplosion = onExplosion;
    this.weapons = GAME_CONFIG.weapons;
    this.unlockedWeaponIds = new Set(this.weapons.filter((weapon) => weapon.starter).map((weapon) => weapon.id));
    this.activeWeaponId = this.weapons[0].id;
    this.upgradeLevel = 0;
    this.lastShot = 0;
    this.shots = 0;
    this.hammerAnimationTimer = null;
    this.translate = null;
    this.createWeaponModel();
    this.createHammerModel();
    this.applyWeaponAppearance();
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  shoot() {
    const now = performance.now();
    const weapon = this.currentWeapon();
    if (now - this.lastShot < weapon.fireCooldownMs) return;
    this.lastShot = now;
    this.shots += 1;
    this.animateRecoil();
    this.audio?.playShot();

    const ray = this.player.camera.getForwardRay(weapon.range);
    const hit = this.scene.pickWithRay(ray, (mesh) => Boolean(mesh.metadata?.robotId));
    if (!hit?.pickedMesh) {
      this.hud.addLog(this.t("logBulletMissed"));
      return;
    }

    const robotId = hit.pickedMesh.metadata.robotId;
    const hitPart = hit.pickedMesh.metadata.robotPart || "govde";
    const explosionPoint = hit.pickedPoint?.clone() || hit.pickedMesh.getAbsolutePosition().clone();
    const robot = this.robotManager.damageRobot(robotId, this.damage, hitPart);
    this.audio?.playHit();
    if (robot) this.hud.addLog(this.t("logRobotPartHit", { robot: this.robotText(robot.typeKey, robot.label), part: this.partText(hitPart) }));
    if (weapon.splashRadius) this.explode(explosionPoint, weapon, robotId);
  }

  upgrade() {
    this.upgradeLevel += 1;
    this.hud.addLog(this.t("logWeaponUpgraded", { weapon: this.weaponText(this.currentWeapon()), level: this.upgradeLevel }));
    this.audio?.playCraft();
  }

  get damage() {
    return this.currentWeapon().damage + this.upgradeLevel * GAME_CONFIG.crafting.damagePerUpgrade;
  }

  set damage(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    this.upgradeLevel = Math.max(0, Math.round((number - GAME_CONFIG.combat.baseDamage) / GAME_CONFIG.crafting.damagePerUpgrade));
  }

  get weaponName() {
    const suffix = this.upgradeLevel > 0 ? ` +${this.upgradeLevel}` : "";
    return `${this.weaponText(this.currentWeapon())}${suffix}`;
  }

  set weaponName(value) {
    if (typeof value !== "string") return;
    const match = this.weapons.find((weapon) => weapon.label === value || value.startsWith(weapon.label));
    if (!match) return;
    this.unlockedWeaponIds.add(match.id);
    this.activeWeaponId = match.id;
    this.applyWeaponAppearance();
  }

  currentWeapon() {
    return this.weapons.find((weapon) => weapon.id === this.activeWeaponId) || this.weapons[0];
  }

  nextLockedWeapon() {
    return this.weapons.find((weapon) => !weapon.starter && !this.unlockedWeaponIds.has(weapon.id));
  }

  unlockWeapon(id, options = {}) {
    const weapon = this.weapons.find((item) => item.id === id);
    if (!weapon || this.unlockedWeaponIds.has(id)) return false;
    this.unlockedWeaponIds.add(id);
    this.activeWeaponId = id;
    this.applyWeaponAppearance();
    if (!options.silent) {
      this.hud.addLog(this.t("logWeaponCrafted", { weapon: this.weaponText(weapon) }));
      this.audio?.playCraft();
    }
    return true;
  }

  selectWeaponSlot(slot) {
    const weapon = this.weapons.find((item) => item.slot === slot);
    if (!weapon || !this.unlockedWeaponIds.has(weapon.id)) {
      this.hud.addLog(this.t("logWeaponSlotLocked", { slot }));
      return false;
    }
    this.activeWeaponId = weapon.id;
    this.applyWeaponAppearance();
    this.hud.addLog(this.t("logWeaponSelected", { weapon: this.weaponName }));
    return true;
  }

  createWeaponModel() {
    const grip = BABYLON.MeshBuilder.CreateBox("weaponGrip", { width: 0.12, height: 0.34, depth: 0.16 }, this.scene);
    grip.parent = this.player.camera;
    grip.position = new BABYLON.Vector3(0.45, -0.38, 0.72);
    grip.rotation.x = 0.25;

    const barrel = BABYLON.MeshBuilder.CreateBox("weaponBarrel", { width: 0.18, height: 0.14, depth: 0.72 }, this.scene);
    barrel.parent = this.player.camera;
    barrel.position = new BABYLON.Vector3(0.42, -0.28, 1.05);

    const mat = new BABYLON.StandardMaterial("weaponMat", this.scene);
    this.weaponMaterial = mat;
    grip.material = mat;
    barrel.material = mat;
    this.weaponMeshes = [grip, barrel];
  }

  createHammerModel() {
    const root = new BABYLON.TransformNode("craftHammerRoot", this.scene);
    root.parent = this.player.camera;
    root.position = new BABYLON.Vector3(-0.42, -0.32, 0.78);
    root.rotation = new BABYLON.Vector3(0.75, -0.18, -0.35);

    const handle = BABYLON.MeshBuilder.CreateBox("craftHammerHandle", { width: 0.08, height: 0.48, depth: 0.08 }, this.scene);
    handle.parent = root;
    handle.position = new BABYLON.Vector3(0, -0.12, 0);

    const head = BABYLON.MeshBuilder.CreateBox("craftHammerHead", { width: 0.42, height: 0.14, depth: 0.16 }, this.scene);
    head.parent = root;
    head.position = new BABYLON.Vector3(0, 0.18, 0);

    const handleMat = new BABYLON.StandardMaterial("craftHammerHandleMat", this.scene);
    handleMat.diffuseColor = new BABYLON.Color3(0.38, 0.22, 0.12);
    const headMat = new BABYLON.StandardMaterial("craftHammerHeadMat", this.scene);
    headMat.diffuseColor = new BABYLON.Color3(0.62, 0.66, 0.68);
    handle.material = handleMat;
    head.material = headMat;
    root.setEnabled(false);

    this.hammerRoot = root;
    this.hammerMeshes = [handle, head];
    this.hammerRestRotation = root.rotation.clone();
  }

  applyWeaponAppearance() {
    if (!this.weaponMaterial) return;
    const weapon = this.currentWeapon();
    const color = weapon.color || [0.18, 0.2, 0.19];
    this.weaponMaterial.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
    const barrel = this.weaponMeshes?.[1];
    if (barrel) {
      barrel.scaling.z = weapon.id === "ionBlaster" ? 1.18 : weapon.id === "scrapRifle" ? 1.05 : 1;
      barrel.scaling.x = weapon.id === "scrapRifle" ? 1.18 : 1;
    }
  }

  animateRecoil() {
    for (const mesh of this.weaponMeshes) {
      mesh.position.z -= 0.08;
      setTimeout(() => {
        if (!mesh.isDisposed()) mesh.position.z += 0.08;
      }, 80);
    }
  }

  animateHammer() {
    this.audio?.playCraft();
    if (!this.hammerRoot) return;

    clearTimeout(this.hammerAnimationTimer);
    this.setWeaponVisible(false);
    this.hammerRoot.setEnabled(true);
    this.hammerRoot.rotation.copyFrom(this.hammerRestRotation);
    this.hammerRoot.rotation.x = this.hammerRestRotation.x + 0.55;
    const start = performance.now();
    const duration = 360;

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      const strike = progress < 0.48 ? progress / 0.48 : 1 - (progress - 0.48) / 0.52;
      this.hammerRoot.rotation.x = this.hammerRestRotation.x + 0.55 - strike * 1.32;
      this.hammerRoot.rotation.z = this.hammerRestRotation.z + strike * 0.28;
      this.hammerRoot.position.y = -0.32 - Math.max(0, strike) * 0.1;
      if (progress >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        this.hammerRoot.rotation.copyFrom(this.hammerRestRotation);
        this.hammerRoot.position.y = -0.32;
      }
    });

    this.hammerAnimationTimer = setTimeout(() => {
      if (this.hammerRoot && !this.hammerRoot.isDisposed()) {
        this.hammerRoot.setEnabled(false);
      }
      this.setWeaponVisible(true);
    }, duration + 90);
  }

  isHammerVisible() {
    return Boolean(this.hammerRoot?.isEnabled());
  }

  hammerSnapshot() {
    if (!this.hammerRoot) return null;
    return {
      visible: this.hammerRoot.isEnabled(),
      x: Number(this.hammerRoot.rotation.x.toFixed(3)),
      y: Number(this.hammerRoot.position.y.toFixed(3)),
      meshes: this.hammerMeshes?.length || 0
    };
  }

  setWeaponVisible(visible) {
    for (const mesh of this.weaponMeshes || []) {
      mesh.setEnabled(visible);
    }
  }

  explode(position, weapon, directRobotId) {
    const radius = weapon.splashRadius;
    const splashDamage = this.damage * (weapon.splashDamageMultiplier || 0.5);
    const damaged = this.robotManager.damageRobotsInRadius(position, splashDamage, radius, directRobotId);
    this.spawnExplosion(position, radius);
    this.hud.addLog(this.t("logExplosionWave", { count: damaged }));
    this.onExplosion?.({ weapon, position, damaged });
  }

  weaponText(weapon) {
    const key = {
      pistol: "weaponPistol",
      scrapRifle: "weaponScrapRifle",
      ionBlaster: "weaponIonBlaster"
    }[weapon.id];
    return key ? this.t(key) : weapon.label;
  }

  robotText(typeKey, fallback) {
    const key = {
      normal: "robotNormal",
      fast: "robotFast",
      shield: "robotShield",
      drone: "robotDrone",
      boss: "robotBoss"
    }[typeKey];
    return key ? this.t(key) : fallback;
  }

  partText(part) {
    const key = {
      govde: "partBody",
      bas: "partHead",
      "sol kol": "partLeftArm",
      "sag kol": "partRightArm",
      "sol bacak": "partLeftLeg",
      "sag bacak": "partRightLeg",
      "sol pervane": "partLeftRotor",
      "sag pervane": "partRightRotor"
    }[part];
    return key ? this.t(key) : part;
  }

  spawnExplosion(position, radius) {
    const sphere = BABYLON.MeshBuilder.CreateSphere(`ionExplosion_${Date.now()}`, { diameter: radius * 2, segments: 16 }, this.scene);
    sphere.position = position;
    sphere.isPickable = false;
    const mat = new BABYLON.StandardMaterial(`ionExplosionMat_${Date.now()}`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.2, 0.72, 1);
    mat.emissiveColor = new BABYLON.Color3(0.12, 0.48, 0.8);
    mat.alpha = 0.28;
    sphere.material = mat;
    let scale = 0.08;
    sphere.scaling.setAll(scale);
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      scale += 0.12;
      sphere.scaling.setAll(Math.min(1, scale));
      mat.alpha = Math.max(0, mat.alpha - 0.025);
      if (scale >= 1 || mat.alpha <= 0) {
        this.scene.onBeforeRenderObservable.remove(observer);
        sphere.dispose();
        mat.dispose();
      }
    });
  }

  serialize() {
    return {
      activeWeaponId: this.activeWeaponId,
      unlockedWeaponIds: [...this.unlockedWeaponIds],
      upgradeLevel: this.upgradeLevel,
      shots: this.shots
    };
  }

  load(data = {}) {
    if (Array.isArray(data.unlockedWeaponIds)) {
      this.unlockedWeaponIds = new Set(data.unlockedWeaponIds.filter((id) => this.weapons.some((weapon) => weapon.id === id)));
    }
    this.unlockedWeaponIds.add(this.weapons[0].id);
    if (this.unlockedWeaponIds.has(data.activeWeaponId)) this.activeWeaponId = data.activeWeaponId;
    else if (typeof data.weaponName === "string") this.weaponName = data.weaponName;
    this.upgradeLevel = Math.max(0, Number.isFinite(Number(data.upgradeLevel)) ? Number(data.upgradeLevel) : this.upgradeLevel);
    if (Number.isFinite(Number(data.damage)) && !Number.isFinite(Number(data.upgradeLevel))) this.damage = Number(data.damage);
    this.shots = Math.max(0, Number.isFinite(Number(data.shots)) ? Number(data.shots) : 0);
    this.applyWeaponAppearance();
  }

  reset() {
    this.unlockedWeaponIds = new Set(this.weapons.filter((weapon) => weapon.starter).map((weapon) => weapon.id));
    this.activeWeaponId = this.weapons[0].id;
    this.upgradeLevel = 0;
    this.shots = 0;
    this.lastShot = 0;
    this.applyWeaponAppearance();
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    logBulletMissed: "Mermi duvara carpti.",
    logRobotPartHit: "{robot} {part} parcasi vuruldu.",
    logWeaponUpgraded: "Silah guclendi: {weapon} +{level}",
    logWeaponCrafted: "Yeni silah yapildi: {weapon}",
    logWeaponSlotLocked: "{slot}. silah henuz uretilmedi.",
    logWeaponSelected: "Silah secildi: {weapon}",
    logExplosionWave: "Patlama dalgasi {count} robota ulasti.",
    robotNormal: "Normal robot",
    robotFast: "Hizli robot",
    robotShield: "Kalkanli robot",
    robotDrone: "Ucan drone",
    robotBoss: "Dev boss robot",
    partBody: "govde",
    partHead: "bas",
    partLeftArm: "sol kol",
    partRightArm: "sag kol",
    partLeftLeg: "sol bacak",
    partRightLeg: "sag bacak",
    partLeftRotor: "sol pervane",
    partRightRotor: "sag pervane"
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
