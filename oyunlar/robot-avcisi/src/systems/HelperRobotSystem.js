import { GAME_CONFIG } from "../config.js";

export class HelperRobotSystem {
  constructor(scene, factory, inventory, robotManager, hud) {
    this.scene = scene;
    this.factory = factory;
    this.inventory = inventory;
    this.robotManager = robotManager;
    this.hud = hud;
    this.helpers = [];
    this.nextId = 1;
    this.materials = new Map();
    this.translate = null;
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  build(typeKey, position, options = {}) {
    const type = GAME_CONFIG.helperRobots[typeKey];
    if (!type) return null;

    const body = BABYLON.MeshBuilder.CreateBox(`helper_${this.nextId++}_${typeKey}`, {
      width: 0.48,
      height: 0.66,
      depth: 0.42
    }, this.scene);
    body.position = position.clone();
    body.position.y = 0.55;
    body.material = this.materialFor(typeKey, type.color);
    body.checkCollisions = true;

    const head = BABYLON.MeshBuilder.CreateBox(`${body.name}_head`, { width: 0.36, height: 0.26, depth: 0.32 }, this.scene);
    head.parent = body;
    head.position = new BABYLON.Vector3(0, 0.46, 0);
    head.material = body.material;

    const lamp = BABYLON.MeshBuilder.CreateSphere(`${body.name}_lamp`, { diameter: 0.12 }, this.scene);
    lamp.parent = body;
    lamp.position = new BABYLON.Vector3(0, 0.48, -0.18);
    lamp.material = this.materialFor(`${typeKey}_lamp`, typeKey === "miner" ? [1, 0.95, 0.2] : [0.2, 0.95, 1]);

    const helper = {
      id: body.name,
      typeKey,
      label: type.label,
      body,
      parts: [head, lamp],
      cooldown: Math.max(0, Number(options.cooldown) || 0)
    };
    this.helpers.push(helper);
    if (!options.silent) this.hud.addLog(this.t("logHelperBuilt", { helper: this.helperText(typeKey, type.label) }));
    return helper;
  }

  update(delta) {
    for (const helper of this.helpers) {
      helper.cooldown = Math.max(0, helper.cooldown - this.scene.getEngine().getDeltaTime());
      if (helper.typeKey === "miner") this.updateMiner(helper, delta);
      if (helper.typeKey === "fighter") this.updateFighter(helper, delta);
    }
  }

  updateMiner(helper, delta) {
    const type = GAME_CONFIG.helperRobots.miner;
    const target = nearestMesh(helper.body.position, [...this.factory.scrap, ...this.factory.robotParts], type.range);
    if (!target) return;

    moveToward(helper.body, target.position, type.speed * delta);
    const collectedScrap = this.factory.collectScrapAt(helper.body.position, this.inventory, 0.8);
    const collectedParts = this.factory.collectRobotPartsAt(helper.body.position, this.inventory, 0.8);
    if (collectedScrap > 0) this.hud.addLog(this.t("logMinerCollected", { count: collectedScrap }));
    if (collectedParts > 0) this.hud.addLog(this.t("logMinerPartsCollected", { count: collectedParts }));
  }

  updateFighter(helper, delta) {
    const type = GAME_CONFIG.helperRobots.fighter;
    const target = this.robotManager.nearestRobot(helper.body.position, type.range);
    if (!target) return;

    moveToward(helper.body, target.body.position, type.speed * delta);
    helper.body.lookAt(new BABYLON.Vector3(target.body.position.x, helper.body.position.y, target.body.position.z));
    if (BABYLON.Vector3.Distance(helper.body.position, target.body.position) < 4 && helper.cooldown <= 0) {
      this.robotManager.damageRobot(target.id, type.damage, "govde");
      this.showFighterShot(helper, target);
      this.hud.addLog(this.t("logFighterShot"));
      helper.cooldown = type.attackCooldown;
    }
  }

  showFighterShot(helper, target) {
    const from = helper.body.position.add(new BABYLON.Vector3(0, 0.42, 0));
    const to = target.body.position.add(new BABYLON.Vector3(0, 0.28, 0));
    const beam = BABYLON.MeshBuilder.CreateLines(`helperFighterShot_${Date.now()}`, { points: [from, to] }, this.scene);
    beam.color = new BABYLON.Color3(0.28, 0.92, 1);
    beam.isPickable = false;

    const impact = BABYLON.MeshBuilder.CreateSphere(`helperFighterImpact_${Date.now()}`, { diameter: 0.18, segments: 10 }, this.scene);
    impact.position = to;
    impact.material = this.materialFor("fighter_impact", [0.2, 0.95, 1]);
    impact.isPickable = false;

    setTimeout(() => {
      if (!beam.isDisposed()) beam.dispose();
      if (!impact.isDisposed()) impact.dispose();
    }, 140);
  }

  clear() {
    for (const helper of this.helpers) {
      for (const part of helper.parts) {
        if (!part.isDisposed()) part.dispose();
      }
      if (!helper.body.isDisposed()) helper.body.dispose();
    }
    this.helpers = [];
  }

  moveAllNear(position) {
    const offsets = [
      new BABYLON.Vector3(-1.25, 0, 1.1),
      new BABYLON.Vector3(1.25, 0, 1.1),
      new BABYLON.Vector3(-1.7, 0, 2),
      new BABYLON.Vector3(1.7, 0, 2)
    ];
    this.helpers.forEach((helper, index) => {
      const offset = offsets[index % offsets.length];
      helper.body.position = position.add(offset);
      helper.body.position.x = clamp(helper.body.position.x, GAME_CONFIG.world.minX + 0.8, GAME_CONFIG.world.maxX - 0.8);
      helper.body.position.y = 0.55;
      helper.body.position.z = clamp(helper.body.position.z, GAME_CONFIG.world.minZ + 0.8, GAME_CONFIG.world.maxZ - 0.8);
      helper.cooldown = 0;
    });
  }

  reset() {
    this.clear();
    this.nextId = 1;
  }

  serialize() {
    return this.helpers.map((helper) => ({
      typeKey: helper.typeKey,
      x: helper.body.position.x,
      y: helper.body.position.y,
      z: helper.body.position.z,
      cooldown: helper.cooldown
    }));
  }

  load(items = []) {
    this.clear();
    this.nextId = 1;
    for (const item of items) {
      if (!GAME_CONFIG.helperRobots[item.typeKey]) continue;
      this.build(
        item.typeKey,
        new BABYLON.Vector3(numberOr(item.x, 0), numberOr(item.y, 0.55), numberOr(item.z, -5)),
        { cooldown: numberOr(item.cooldown, 0), silent: true }
      );
    }
  }

  countByType(typeKey) {
    return this.helpers.filter((helper) => helper.typeKey === typeKey).length;
  }

  materialFor(key, color) {
    if (this.materials.has(key)) return this.materials.get(key);
    const material = new BABYLON.StandardMaterial(`helper_${key}Mat`, this.scene);
    material.diffuseColor = new BABYLON.Color3(...color);
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    this.materials.set(key, material);
    return material;
  }

  helperText(typeKey, fallback) {
    const key = { miner: "helperMiner", fighter: "helperFighter" }[typeKey];
    return key ? this.t(key) : fallback;
  }
}

function nearestMesh(position, meshes, range) {
  let nearest = null;
  let nearestDistance = range;
  for (const mesh of meshes) {
    const distance = BABYLON.Vector3.Distance(position, mesh.position);
    if (distance < nearestDistance) {
      nearest = mesh;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function moveToward(mesh, target, step) {
  const direction = target.subtract(mesh.position);
  direction.y = 0;
  if (direction.length() < 0.12) return;
  direction.normalize();
  mesh.moveWithCollisions(direction.scale(step));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fallbackText(key, replacements = {}) {
  const text = {
    helperMiner: "Madenci robot",
    helperFighter: "Savasci robot",
    logHelperBuilt: "{helper} uretildi.",
    logMinerCollected: "Madenci robot {count} hurda topladi.",
    logMinerPartsCollected: "Madenci robot {count} parca topladi.",
    logFighterShot: "Savasci robot hedefe ates etti."
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
