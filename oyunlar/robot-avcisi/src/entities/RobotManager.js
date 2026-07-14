import { GAME_CONFIG, ROBOT_TYPES } from "../config.js";

export class RobotManager {
  constructor(scene, factory, onRobotKilled) {
    this.scene = scene;
    this.factory = factory;
    this.onRobotKilled = onRobotKilled;
    this.robots = new Map();
    this.nextId = 1;
    this.wave = 1;
    this.hitCooldown = 0;
    this.materials = new Map();
  }

  spawnWave(room = this.wave, difficulty = {}) {
    const roomPlan = this.factory.getRoomRobotPlan(room);
    const plan = roomPlan.robotPlan;
    const spawnMultiplier = difficulty.spawnMultiplier || 1;
    const maxRobots = difficulty.maxRobots || 10;
    const count = Math.min(Math.max(1, Math.round((roomPlan.robotCountBase + room) * spawnMultiplier)), maxRobots);
    for (let i = 0; i < count; i += 1) {
      this.spawnRobot(plan[i % plan.length], this.factory.getRandomSpawn(room), difficulty);
    }
    this.wave = room + 1;
  }

  reset(difficulty = {}) {
    this.clear();
    this.nextId = 1;
    this.wave = 1;
    this.spawnWave(1, difficulty);
  }

  clear() {
    for (const robot of this.robots.values()) {
      this.disposeHealthBar(robot);
      for (const part of robot.parts || []) {
        if (!part.mesh.isDisposed()) part.mesh.dispose();
      }
      if (!robot.body.isDisposed()) robot.body.dispose();
    }
    this.robots.clear();
  }

  spawnRobot(typeKey, position, difficulty = {}, source = "room") {
    const type = ROBOT_TYPES[typeKey];
    const id = `robot_${this.nextId++}`;
    const bodyHeight = 1.05 * type.size;
    const legHeight = type.flying ? 0 : 0.28 * type.size;
    const body = BABYLON.MeshBuilder.CreateBox(id, {
      width: 0.62 * type.size,
      height: bodyHeight,
      depth: 0.48 * type.size
    }, this.scene);
    body.position = position.add(new BABYLON.Vector3(0, type.flying ? 1.55 : legHeight + bodyHeight / 2, 0));
    body.material = this.materialFor(typeKey, type.color);
    body.metadata = { robotId: id, robotPart: "govde" };
    body.checkCollisions = true;

    const head = BABYLON.MeshBuilder.CreateSphere(`${id}_head`, { diameter: 0.34 * type.size }, this.scene);
    head.parent = body;
    head.position = new BABYLON.Vector3(0, bodyHeight / 2 + 0.22 * type.size, 0);
    head.material = body.material;
    head.metadata = { robotId: id, robotPart: "bas" };

    const parts = [
      { name: "bas", mesh: head, threshold: 0.18, detached: false, effect: "vision" }
    ];

    for (const side of [-1, 1]) {
      const arm = BABYLON.MeshBuilder.CreateBox(`${id}_arm_${side}`, {
        width: 0.12 * type.size,
        height: 0.58 * type.size,
        depth: 0.12 * type.size
      }, this.scene);
      arm.parent = body;
      arm.position = new BABYLON.Vector3(side * 0.42 * type.size, 0.08 * type.size, 0);
      arm.rotation.z = side * 0.2;
      arm.material = body.material;
      arm.metadata = { robotId: id, robotPart: side < 0 ? "sol kol" : "sag kol" };
      parts.push({
        name: side < 0 ? "sol kol" : "sag kol",
        mesh: arm,
        threshold: side < 0 ? 0.78 : 0.58,
        detached: false,
        effect: "damage"
      });
    }

    if (!type.flying) {
      for (const x of [-0.18, 0.18]) {
        const leg = BABYLON.MeshBuilder.CreateBox(`${id}_leg_${x}`, {
          width: 0.12 * type.size,
          height: legHeight,
          depth: 0.14 * type.size
        }, this.scene);
        leg.parent = body;
        leg.position = new BABYLON.Vector3(x * type.size, -(bodyHeight / 2 + legHeight / 2), 0);
        leg.material = body.material;
        leg.metadata = { robotId: id, robotPart: x < 0 ? "sol bacak" : "sag bacak" };
        parts.push({
          name: x < 0 ? "sol bacak" : "sag bacak",
          mesh: leg,
          threshold: x < 0 ? 0.42 : 0.28,
          detached: false,
          effect: "speed"
        });
      }
    } else {
      for (const side of [-1, 1]) {
        const rotor = BABYLON.MeshBuilder.CreateTorus(`${id}_rotor_${side}`, {
          diameter: 0.36 * type.size,
          thickness: 0.035 * type.size
        }, this.scene);
        rotor.parent = body;
        rotor.position = new BABYLON.Vector3(side * 0.46 * type.size, 0.2 * type.size, 0);
        rotor.rotation.x = Math.PI / 2;
        rotor.material = body.material;
        rotor.metadata = { robotId: id, robotPart: side < 0 ? "sol pervane" : "sag pervane" };
        parts.push({
          name: side < 0 ? "sol pervane" : "sag pervane",
          mesh: rotor,
          threshold: side < 0 ? 0.62 : 0.38,
          detached: false,
          effect: "speed"
        });
      }
    }

    if (type.shield) {
      const shield = BABYLON.MeshBuilder.CreateTorus(`${id}_shield`, { diameter: 1.15 * type.size, thickness: 0.04 }, this.scene);
      shield.parent = body;
      shield.position = new BABYLON.Vector3(0, 0.12, -0.42 * type.size);
      shield.rotation.x = Math.PI / 2;
      shield.material = this.materialFor("shieldGlow", [0.5, 0.78, 1]);
      shield.metadata = { robotId: id };
    }

    const robot = {
      id,
      typeKey,
      label: type.label,
      body,
      hp: type.hp,
      maxHp: type.hp,
      speed: type.speed,
      damage: type.damage,
      scrap: type.scrap,
      baseHp: type.hp,
      baseSpeed: type.speed,
      baseDamage: type.damage,
      baseScrap: type.scrap,
      partsDrop: type.parts || 1,
      shield: type.shield || 0,
      flying: Boolean(type.flying),
      attackTimer: 0,
      parts,
      speedPenalty: 1,
      damagePenalty: 1,
      blind: false,
      source,
      baseY: body.position.y,
      outagePhase: Math.random() * Math.PI * 2,
      outageDamageMultiplier: 1,
      wanderTarget: position.clone(),
      nextWanderAt: 0
    };
    this.applyDifficultyToRobot(robot, difficulty);
    this.createHealthBar(robot, type.size);
    this.updateHealthBar(robot);
    this.robots.set(id, robot);
    return robot;
  }

  update(playerPosition, delta, options = {}) {
    const speedMultiplier = options.speedMultiplier || 1;
    const powerOutage = Boolean(options.powerOutage);
    const time = options.time || performance.now();
    for (const robot of this.robots.values()) {
      robot.outageDamageMultiplier = powerOutage ? GAME_CONFIG.power.robotDamageMultiplier : 1;
      const target = this.robotTarget(robot, playerPosition, time, powerOutage);
      const direction = target.subtract(robot.body.position);
      const distance = direction.length();
      if (distance > 1.25) {
        direction.normalize();
        this.applyOutageMovement(robot, direction, time, powerOutage);
        robot.body.moveWithCollisions(direction.scale(robot.speed * robot.speedPenalty * speedMultiplier * delta));
        robot.body.lookAt(new BABYLON.Vector3(playerPosition.x, robot.body.position.y, playerPosition.z));
      }
      this.updateFlyingHeight(robot, time, powerOutage, delta);
      robot.attackTimer = Math.max(0, robot.attackTimer - delta);
    }
  }

  robotTarget(robot, playerPosition, time, powerOutage) {
    if (robot.blind) {
      if (time > robot.nextWanderAt) {
        robot.nextWanderAt = time + 900;
        robot.wanderTarget = playerPosition.add(new BABYLON.Vector3(rand(-3.2, 3.2), 0, rand(-3.2, 3.2)));
      }
      const target = robot.wanderTarget.clone();
      target.y = robot.flying ? robot.body.position.y : robot.body.position.y;
      return target;
    }

    const target = playerPosition.clone();
    if (powerOutage && !robot.flying) {
      const side = Math.sin(time * 0.0035 + robot.outagePhase) * GAME_CONFIG.power.groundZigzagStrength;
      target.x += Math.cos(robot.outagePhase) * side;
      target.z += Math.sin(robot.outagePhase) * side;
    }
    target.y = robot.flying ? robot.body.position.y : robot.body.position.y;
    return target;
  }

  applyOutageMovement(robot, direction, time, powerOutage) {
    if (!powerOutage) return;
    const sideways = new BABYLON.Vector3(-direction.z, 0, direction.x);
    const wobble = Math.sin(time * 0.006 + robot.outagePhase);
    const strength = robot.flying ? 0.55 : GAME_CONFIG.power.groundZigzagStrength;
    direction.addInPlace(sideways.scale(wobble * strength));
    direction.normalize();
  }

  updateFlyingHeight(robot, time, powerOutage, delta) {
    if (!robot.flying) return;
    const normalY = robot.baseY;
    const outageY = normalY + Math.sin(time * 0.005 + robot.outagePhase) * GAME_CONFIG.power.droneHoverSwing;
    const targetY = powerOutage ? outageY : normalY;
    robot.body.position.y += (targetY - robot.body.position.y) * Math.min(1, 0.08 * delta);
  }

  getContactDamage(playerPosition) {
    let damage = 0;
    for (const robot of this.robots.values()) {
      const flatDistance = BABYLON.Vector3.Distance(
        new BABYLON.Vector3(robot.body.position.x, 0, robot.body.position.z),
        new BABYLON.Vector3(playerPosition.x, 0, playerPosition.z)
      );
      if (robot.typeKey === "boss" && flatDistance < 3.1 && robot.attackTimer <= 0) {
        damage += robot.damage * 1.35 * robot.damagePenalty * robot.outageDamageMultiplier;
        robot.attackTimer = 95;
        this.spawnBossShockwave(robot.body.position);
        continue;
      }
      if (flatDistance < 1.15 && robot.attackTimer <= 0) {
        damage += robot.damage * robot.damagePenalty * robot.outageDamageMultiplier;
        robot.attackTimer = 52;
      }
    }
    return damage;
  }

  damageRobot(id, damage, hitPart = "govde") {
    const robot = this.robots.get(id);
    if (!robot) return null;
    const partMultiplier = hitPart === "bas" ? 1.35 : hitPart.includes("kol") || hitPart.includes("bacak") || hitPart.includes("pervane") ? 1.12 : 1;
    const finalDamage = Math.max(1, damage * partMultiplier * (1 - robot.shield));
    robot.hp -= finalDamage;
    this.spawnDebris(robot.body.position, 2, robot.body.material);
    this.detachBrokenParts(robot, hitPart);
    if (robot.hp <= 0) {
      const position = robot.body.position.clone();
      this.factory.createScrap(position, robot.scrap);
      this.factory.createRobotParts(position, robot.partsDrop);
      this.spawnDebris(position, 8, robot.body.material);
      this.disposeHealthBar(robot);
      robot.body.dispose();
      this.robots.delete(id);
      this.onRobotKilled(robot);
      return robot;
    }
    this.updateHealthBar(robot);
    return robot;
  }

  damageRobotsInRadius(position, damage, radius, excludedId = null) {
    let damaged = 0;
    const targets = [...this.robots.values()];
    for (const robot of targets) {
      if (robot.id === excludedId || !this.robots.has(robot.id)) continue;
      const distance = BABYLON.Vector3.Distance(position, robot.body.position);
      if (distance > radius) continue;
      const falloff = 1 - distance / radius;
      this.damageRobot(robot.id, damage * Math.max(0.28, falloff), "govde");
      damaged += 1;
    }
    return damaged;
  }

  detachBrokenParts(robot, hitPart) {
    const healthRatio = Math.max(0, robot.hp / robot.maxHp);
    const candidates = robot.parts.filter((part) => !part.detached && (healthRatio <= part.threshold || part.name === hitPart));
    const part = candidates[0];
    if (!part) return;

    part.detached = true;
    this.applyPartLoss(robot, part);
    this.detachMesh(part.mesh);
    this.factory.createScrap(part.mesh.position, 1);
    this.factory.createRobotParts(part.mesh.position, 1);
  }

  applyPartLoss(robot, part) {
    if (part.effect === "speed") robot.speedPenalty = Math.max(0.42, robot.speedPenalty - 0.24);
    if (part.effect === "damage") robot.damagePenalty = Math.max(0.45, robot.damagePenalty - 0.22);
    if (part.effect === "vision") {
      robot.blind = true;
      robot.speedPenalty = Math.max(0.35, robot.speedPenalty - 0.18);
    }
  }

  detachMesh(mesh) {
    const absolutePosition = mesh.getAbsolutePosition().clone();
    const absoluteRotation = mesh.absoluteRotationQuaternion?.toEulerAngles() || mesh.rotation.clone();
    mesh.parent = null;
    mesh.position = absolutePosition.add(new BABYLON.Vector3(rand(-0.18, 0.18), rand(0.08, 0.24), rand(-0.18, 0.18)));
    mesh.rotation = absoluteRotation.add(new BABYLON.Vector3(rand(-0.8, 0.8), rand(-0.8, 0.8), rand(-0.8, 0.8)));
    mesh.metadata = { kind: "brokenRobotPart" };
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    setTimeout(() => {
      if (!mesh.isDisposed()) mesh.dispose();
    }, 4500);
  }

  count() {
    this.pruneInactive();
    return this.robots.size;
  }

  countRoomRobots() {
    this.pruneInactive();
    return this.roomRobots().length;
  }

  roomRobots() {
    return [...this.robots.values()].filter((robot) => this.isActiveRoomRobot(robot));
  }

  recallRoomRobotsNear(position, radius = 4.2) {
    const robots = this.roomRobots();
    for (let index = 0; index < robots.length; index += 1) {
      const robot = robots[index];
      const angle = -Math.PI / 2 + (index - (robots.length - 1) / 2) * 0.55;
      const target = new BABYLON.Vector3(
        clamp(position.x + Math.sin(angle) * radius, GAME_CONFIG.world.minX + 0.9, GAME_CONFIG.world.maxX - 0.9),
        robot.flying ? robot.baseY : robot.body.position.y,
        clamp(position.z + Math.cos(angle) * radius, GAME_CONFIG.world.minZ + 0.9, GAME_CONFIG.world.maxZ - 0.9)
      );
      robot.body.position.copyFrom(target);
      if (robot.flying) robot.baseY = target.y;
      robot.wanderTarget = target.clone();
      robot.nextWanderAt = 0;
    }
    return robots.length;
  }

  clearAlarmRobots() {
    let cleared = 0;
    for (const [id, robot] of [...this.robots.entries()]) {
      if (robot.source !== "alarm") continue;
      this.disposeHealthBar(robot);
      for (const part of robot.parts || []) {
        if (part.mesh && !part.mesh.isDisposed()) part.mesh.dispose();
      }
      if (robot.body && !robot.body.isDisposed()) robot.body.dispose();
      this.robots.delete(id);
      cleared += 1;
    }
    return cleared;
  }

  pruneInactive() {
    for (const [id, robot] of this.robots.entries()) {
      if (this.isActiveRobot(robot)) continue;
      this.disposeHealthBar(robot);
      for (const part of robot?.parts || []) {
        if (part.mesh && !part.mesh.isDisposed()) part.mesh.dispose();
      }
      if (robot?.body && !robot.body.isDisposed()) robot.body.dispose();
      this.robots.delete(id);
    }
  }

  isActiveRobot(robot) {
    const roomMargin = 0.08;
    return Boolean(
      robot
      && robot.hp > 0
      && robot.body
      && !robot.body.isDisposed()
      && robot.body.isEnabled()
      && Number.isFinite(robot.body.position.x)
      && Number.isFinite(robot.body.position.y)
      && Number.isFinite(robot.body.position.z)
      && robot.body.position.x >= GAME_CONFIG.world.minX - roomMargin
      && robot.body.position.x <= GAME_CONFIG.world.maxX + roomMargin
      && robot.body.position.z >= GAME_CONFIG.world.minZ - roomMargin
      && robot.body.position.z <= GAME_CONFIG.world.maxZ + roomMargin
    );
  }

  isActiveRoomRobot(robot) {
    return this.isActiveRobot(robot) && robot.source !== "alarm";
  }

  nearestRobot(position, range = Infinity) {
    this.pruneInactive();
    let nearest = null;
    let nearestDistance = range;
    for (const robot of this.robots.values()) {
      const distance = BABYLON.Vector3.Distance(position, robot.body.position);
      if (distance < nearestDistance) {
        nearest = robot;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  nearestRoomRobot(position, range = Infinity) {
    this.pruneInactive();
    let nearest = null;
    let nearestDistance = range;
    for (const robot of this.robots.values()) {
      if (!this.isActiveRoomRobot(robot)) continue;
      const distance = BABYLON.Vector3.Distance(position, robot.body.position);
      if (distance < nearestDistance) {
        nearest = robot;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  serializeRoomRobots() {
    this.pruneInactive();
    return this.serializeRobotsBySource((robot) => this.isActiveRoomRobot(robot));
  }

  serializeAlarmRobots() {
    this.pruneInactive();
    return this.serializeRobotsBySource((robot) => robot.source === "alarm");
  }

  serializeRobotsBySource(predicate) {
    return [...this.robots.values()]
      .filter(predicate)
      .map((robot) => ({
        typeKey: robot.typeKey,
        hpRatio: Math.max(0, Math.min(1, robot.hp / Math.max(1, robot.maxHp))),
        detachedParts: robot.parts.filter((part) => part.detached).map((part) => part.name),
        speedPenalty: robot.speedPenalty,
        damagePenalty: robot.damagePenalty,
        blind: robot.blind,
        source: robot.source,
        x: robot.body.position.x,
        y: robot.body.position.y,
        z: robot.body.position.z
      }));
  }

  loadRoomRobots(items = [], difficulty = {}) {
    this.clear();
    return this.loadRobotItems(items, difficulty, "room");
  }

  loadAlarmRobots(items = [], difficulty = {}) {
    return this.loadRobotItems(items, difficulty, "alarm");
  }

  loadRobotItems(items = [], difficulty = {}, source = "room") {
    let loaded = 0;
    for (const item of items) {
      if (!ROBOT_TYPES[item.typeKey]) continue;
      const robot = this.spawnRobot(item.typeKey, new BABYLON.Vector3(numberOr(item.x, 0), 0, numberOr(item.z, 0)), difficulty, source);
      if (!robot) continue;
      robot.body.position.set(numberOr(item.x, robot.body.position.x), numberOr(item.y, robot.body.position.y), numberOr(item.z, robot.body.position.z));
      if (robot.flying) robot.baseY = robot.body.position.y;
      const hpRatio = Math.max(0.05, Math.min(1, Number(item.hpRatio) || 1));
      robot.hp = Math.max(1, Math.round(robot.maxHp * hpRatio));
      this.loadDetachedParts(robot, item);
      this.updateHealthBar(robot);
      loaded += 1;
    }
    return loaded;
  }

  loadDetachedParts(robot, item = {}) {
    const detachedNames = new Set(Array.isArray(item.detachedParts) ? item.detachedParts : []);
    for (const part of robot.parts || []) {
      if (!detachedNames.has(part.name)) continue;
      part.detached = true;
      this.applyPartLoss(robot, part);
      if (part.mesh && !part.mesh.isDisposed()) part.mesh.dispose();
    }
    robot.speedPenalty = boundedNumber(item.speedPenalty, 0.1, 1, robot.speedPenalty);
    robot.damagePenalty = boundedNumber(item.damagePenalty, 0.1, 1, robot.damagePenalty);
    robot.blind = Boolean(item.blind || robot.blind);
  }

  behaviorSnapshot() {
    return [...this.robots.values()].map((robot) => ({
      id: robot.id,
      typeKey: robot.typeKey,
      flying: robot.flying,
      baseY: robot.baseY,
      y: robot.body.position.y,
      outageDamageMultiplier: robot.outageDamageMultiplier
    }));
  }

  applyDifficulty(difficulty = {}) {
    for (const robot of this.robots.values()) {
      this.applyDifficultyToRobot(robot, difficulty);
    }
  }

  applyDifficultyToRobot(robot, difficulty = {}) {
    const hpRatio = robot.maxHp > 0 ? Math.max(0, robot.hp / robot.maxHp) : 1;
    robot.maxHp = Math.max(1, Math.round(robot.baseHp * (difficulty.hpMultiplier || 1)));
    robot.hp = Math.max(1, Math.round(robot.maxHp * hpRatio));
    robot.speed = robot.baseSpeed * (difficulty.speedMultiplier || 1);
    robot.damage = robot.baseDamage * (difficulty.damageMultiplier || 1);
    robot.scrap = Math.max(1, Math.round(robot.baseScrap * (difficulty.scrapMultiplier || 1)));
    this.updateHealthBar(robot);
  }

  createHealthBar(robot, size = 1) {
    const width = 0.88 * Math.max(0.72, size);
    const y = 0.92 * Math.max(0.72, size);
    const back = BABYLON.MeshBuilder.CreatePlane(`${robot.id}_healthBack`, { width, height: 0.08 }, this.scene);
    back.parent = robot.body;
    back.position = new BABYLON.Vector3(0, y, 0);
    back.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    back.material = this.materialFor("healthBarBack", [0.08, 0.08, 0.08]);
    back.isPickable = false;
    back.metadata = { kind: "robotHealthBar" };

    const fill = BABYLON.MeshBuilder.CreatePlane(`${robot.id}_healthFill`, { width: width * 0.92, height: 0.045 }, this.scene);
    fill.parent = robot.body;
    fill.position = new BABYLON.Vector3(0, y, -0.01);
    fill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    fill.isPickable = false;
    fill.metadata = { kind: "robotHealthBar" };
    robot.healthBar = { back, fill, width: width * 0.92 };
  }

  updateHealthBar(robot) {
    if (!robot?.healthBar) return;
    const ratio = Math.max(0, Math.min(1, robot.hp / Math.max(1, robot.maxHp)));
    const fill = robot.healthBar.fill;
    fill.scaling.x = Math.max(0.03, ratio);
    fill.position.x = -robot.healthBar.width * (1 - ratio) * 0.5;
    if (ratio > 0.55) fill.material = this.materialFor("healthBarGood", [0.16, 0.9, 0.32]);
    else if (ratio > 0.25) fill.material = this.materialFor("healthBarWarn", [1, 0.68, 0.14]);
    else fill.material = this.materialFor("healthBarLow", [1, 0.14, 0.08]);
  }

  disposeHealthBar(robot) {
    if (!robot?.healthBar) return;
    for (const mesh of [robot.healthBar.back, robot.healthBar.fill]) {
      if (mesh && !mesh.isDisposed()) mesh.dispose();
    }
    robot.healthBar = null;
  }

  materialFor(key, color) {
    if (this.materials.has(key)) return this.materials.get(key);
    const mat = new BABYLON.StandardMaterial(`${key}Mat`, this.scene);
    mat.diffuseColor = new BABYLON.Color3(...color);
    mat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
    this.materials.set(key, mat);
    return mat;
  }

  spawnDebris(position, count, material) {
    for (let i = 0; i < count; i += 1) {
      const part = BABYLON.MeshBuilder.CreateBox(`debris_${Date.now()}_${i}`, { size: rand(0.08, 0.18) }, this.scene);
      part.position = position.add(new BABYLON.Vector3(rand(-0.4, 0.4), rand(0.1, 0.7), rand(-0.4, 0.4)));
      part.material = material;
      setTimeout(() => part.dispose(), 700);
    }
  }

  spawnBossShockwave(position) {
    const ring = BABYLON.MeshBuilder.CreateTorus(`bossShockwave_${Date.now()}`, {
      diameter: 0.8,
      thickness: 0.055,
      tessellation: 36
    }, this.scene);
    ring.position = new BABYLON.Vector3(position.x, 0.08, position.z);
    ring.rotation.x = Math.PI / 2;
    ring.material = this.materialFor("bossShockwave", [1, 0.22, 0.08]);
    ring.isPickable = false;

    const start = performance.now();
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min(1, (performance.now() - start) / 520);
      const scale = 1 + progress * 5.8;
      ring.scaling.set(scale, scale, scale);
      ring.position.y = 0.08 + progress * 0.04;
      if (progress >= 1) {
        this.scene.onBeforeRenderObservable.remove(observer);
        if (!ring.isDisposed()) ring.dispose();
      }
    });
  }
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function boundedNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
