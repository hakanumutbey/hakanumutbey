import { getRoomDefinition } from "./RoomDefinitions.js";

export class FactoryScene {
  constructor(scene) {
    this.scene = scene;
    this.scrap = [];
    this.computerPosition = new BABYLON.Vector3(-6.8, 1, -5.8);
    this.benchPosition = new BABYLON.Vector3(4.8, 0.9, -5.8);
    this.healthPosition = new BABYLON.Vector3(-7, 0.9, 5.4);
    this.exitDoorPosition = new BABYLON.Vector3(0, 1, 8.72);
    this.generatorPosition = new BABYLON.Vector3(7.2, 0.9, 5.8);
    this.controlRoomPosition = new BABYLON.Vector3(3.4, 0.9, 5.2);
    this.batteries = [];
    this.dynamicProps = [];
    this.powerLights = [];
    this.alarmBeacons = [];
    this.alarmActive = false;
    this.robotParts = [];
    this.materials = this.createMaterials();
  }

  build() {
    this.scene.gravity = new BABYLON.Vector3(0, -0.018, 0);
    this.scene.collisionsEnabled = true;

    this.hemi = new BABYLON.HemisphericLight("softLight", new BABYLON.Vector3(0.3, 1, 0.4), this.scene);
    this.hemi.intensity = 0.46;

    this.alarmLight = new BABYLON.PointLight("alarmLight", new BABYLON.Vector3(0, 5, 0), this.scene);
    this.alarmLight.diffuse = new BABYLON.Color3(1, 0.18, 0.12);
    this.alarmLight.intensity = 0;

    this.flashlight = new BABYLON.SpotLight(
      "flashlight",
      new BABYLON.Vector3(0, 0, 0),
      new BABYLON.Vector3(0, 0, 1),
      Math.PI / 4,
      2,
      this.scene
    );
    this.flashlight.diffuse = new BABYLON.Color3(0.92, 0.96, 0.82);
    this.flashlight.intensity = 1.4;

    this.createRoom();
    this.createAlarmBeacons();
    this.createComputer();
    this.createWorkbench();
    this.createHealthStation();
    this.createExitDoor();
    this.createGenerator();
    this.createControlRoom();
    this.createQuestBeacon();
    this.applyRoomLayout(1);
  }

  updateFlashlight(camera) {
    this.flashlight.position.copyFrom(camera.position);
    this.flashlight.direction = camera.getForwardRay(1).direction;
  }

  updateQuestBeacon(time = performance.now()) {
    if (!this.questBeaconRoot?.isEnabled()) return;
    const pulse = 0.82 + Math.sin(time * 0.006) * 0.18;
    this.questBeaconRing.scaling.set(pulse, pulse, pulse);
    this.questBeaconRing.rotation.y += 0.025;
    this.questBeaconLight.intensity = 0.55 + pulse * 0.25;
  }

  updateBatteryPickups(time = performance.now()) {
    for (const battery of this.batteries) {
      if (battery.isDisposed()) continue;
      const baseY = Number.isFinite(battery.metadata?.baseY) ? battery.metadata.baseY : battery.position.y;
      const phase = battery.metadata?.phase || 0;
      const pulse = 0.5 + Math.sin(time * 0.007 + phase) * 0.5;
      battery.position.y = baseY + Math.sin(time * 0.004 + phase) * 0.08;
      battery.rotation.y += 0.035;
      battery.rotation.x = Math.sin(time * 0.003 + phase) * 0.18;
      if (battery.metadata?.halo) {
        battery.metadata.halo.scaling.setAll(0.86 + pulse * 0.18);
        battery.metadata.halo.rotation.z += 0.03;
      }
      if (battery.metadata?.light) battery.metadata.light.intensity = 0.26 + pulse * 0.36;
    }
  }

  updateLootPickups(time = performance.now()) {
    for (const scrap of this.scrap) {
      if (scrap.isDisposed()) continue;
      const baseY = Number.isFinite(scrap.metadata?.baseY) ? scrap.metadata.baseY : scrap.position.y;
      const phase = scrap.metadata?.phase || 0;
      scrap.position.y = baseY + Math.sin(time * 0.0045 + phase) * 0.045;
      scrap.rotation.y += 0.022;
      scrap.rotation.z += 0.014;
    }

    for (const part of this.robotParts) {
      if (part.isDisposed()) continue;
      const baseY = Number.isFinite(part.metadata?.baseY) ? part.metadata.baseY : part.position.y;
      const phase = part.metadata?.phase || 0;
      part.position.y = baseY + Math.sin(time * 0.0038 + phase) * 0.04;
      part.rotation.y += 0.018;
      part.rotation.x = (part.metadata?.baseRotationX || 0) + Math.sin(time * 0.003 + phase) * 0.16;
    }
  }

  setAlarm(active) {
    this.alarmActive = Boolean(active);
    this.alarmLight.intensity = this.alarmActive ? 1.8 : 0;
    for (const beacon of this.alarmBeacons) {
      beacon.body.material = this.alarmActive ? this.materials.alarmBeaconActive : this.materials.alarmBeaconIdle;
      beacon.body.scaling.setAll(1);
      beacon.halo.setEnabled(this.alarmActive);
      beacon.light.intensity = this.alarmActive ? 0.9 : 0;
    }
  }

  updateAlarmVisual(time = performance.now()) {
    if (!this.alarmActive) return;
    const basePulse = 0.5 + Math.sin(time * 0.009) * 0.5;
    this.alarmLight.intensity = 0.8 + basePulse * 1.35;
    for (const beacon of this.alarmBeacons) {
      const pulse = 0.5 + Math.sin(time * 0.012 + beacon.phase) * 0.5;
      beacon.body.scaling.setAll(1 + pulse * 0.16);
      beacon.halo.scaling.setAll(0.72 + pulse * 0.46);
      beacon.halo.rotation.z += 0.035;
      beacon.light.intensity = 0.35 + pulse * 1.25;
    }
  }

  setPowerOutage(active) {
    const ambient = this.currentRoomDefinition?.ambientIntensity ?? 0.46;
    this.hemi.intensity = active ? Math.min(0.12, ambient * 0.45) : ambient;
    const base = this.currentRoomDefinition?.lightIntensity || 0.75;
    for (const light of this.powerLights) light.intensity = active ? 0.08 : base;
  }

  applyRoomLayout(roomNumber) {
    this.currentRoomDefinition = getRoomDefinition(roomNumber);
    this.clearDynamicRoomObjects();
    this.floor.material.diffuseColor = new BABYLON.Color3(...this.currentRoomDefinition.floorColor);
    for (const wall of this.walls) wall.material.diffuseColor = new BABYLON.Color3(...this.currentRoomDefinition.wallColor);
    this.hemi.intensity = this.currentRoomDefinition.ambientIntensity ?? 0.46;
    for (const light of this.powerLights) {
      light.diffuse = new BABYLON.Color3(...this.currentRoomDefinition.lightColor);
      light.intensity = this.currentRoomDefinition.lightIntensity;
    }
    this.createProps(this.currentRoomDefinition.props);
    this.createBatteryPickups(this.currentRoomDefinition.batteries);
  }

  clearDynamicRoomObjects() {
    for (const mesh of [...this.dynamicProps, ...this.batteries, ...this.scrap, ...this.robotParts]) {
      this.disposePickupMesh(mesh);
    }
    this.dynamicProps = [];
    this.batteries = [];
    this.scrap = [];
    this.robotParts = [];
  }

  clearPickups() {
    for (const mesh of [...this.batteries, ...this.scrap, ...this.robotParts]) {
      this.disposePickupMesh(mesh);
    }
    this.batteries = [];
    this.scrap = [];
    this.robotParts = [];
  }

  isNearComputer(position) {
    return BABYLON.Vector3.Distance(position, this.computerPosition) < 2.1;
  }

  isNearWorkbench(position) {
    return BABYLON.Vector3.Distance(position, this.benchPosition) < 2.2;
  }

  isNearHealth(position) {
    return BABYLON.Vector3.Distance(position, this.healthPosition) < 1.8;
  }

  isNearExitDoor(position) {
    return BABYLON.Vector3.Distance(position, this.exitDoorPosition) < 2.2;
  }

  setExitDoorOpen(open) {
    if (!this.exitDoor) return;
    this.exitDoor.material = open ? this.materials.doorOpen : this.materials.doorLocked;
    this.exitDoor.position.y = open ? 2.4 : 1.45;
  }

  isNearGenerator(position) {
    return BABYLON.Vector3.Distance(position, this.generatorPosition) < 2.1;
  }

  isNearControlRoom(position) {
    return BABYLON.Vector3.Distance(position, this.controlRoomPosition) < 2.2;
  }

  setQuestTarget(target) {
    const fixedPosition = {
      generator: this.generatorPosition,
      controlRoom: this.controlRoomPosition
    }[target];
    const dynamicPosition = target?.position;
    const position = fixedPosition || dynamicPosition;
    if (!this.questBeaconRoot) return;
    if (!position) {
      this.questBeaconRoot.setEnabled(false);
      return;
    }
    const offsetY = Number.isFinite(Number(target?.offsetY)) ? Number(target.offsetY) : 1.55;
    this.questBeaconRoot.position = position.add(new BABYLON.Vector3(0, offsetY, 0));
    this.questBeaconRoot.setEnabled(true);
  }

  createScrap(position, amount = 1, options = {}) {
    for (let i = 0; i < amount; i += 1) {
      const pickupPosition = position.add(new BABYLON.Vector3(rand(-0.65, 0.65), 0.25, rand(-0.65, 0.65)));
      this.createScrapPickup(pickupPosition, 1, options);
    }
  }

  createScrapPickup(position, value = 1, options = {}) {
    const mesh = BABYLON.MeshBuilder.CreatePolyhedron(`scrap_${Date.now()}_${this.scrap.length}`, { type: 2, size: 0.22 }, this.scene);
    mesh.position = position.clone();
    mesh.material = this.materials.scrap;
    mesh.metadata = {
      kind: "scrap",
      value,
      baseY: mesh.position.y,
      phase: Math.random() * Math.PI * 2,
      pickupAt: pickupTimeFromOptions(options)
    };
    this.scrap.push(mesh);
    return mesh;
  }

  collectNearbyScrap(position, inventory) {
    return this.collectScrapAt(position, inventory, 1.25);
  }

  collectScrapAt(position, inventory, radius = 1.25) {
    let collected = 0;
    for (const mesh of [...this.scrap]) {
      if (!isPickupReady(mesh)) continue;
      if (flatDistance(position, mesh.position) < radius) {
        const added = inventory.addScrap(mesh.metadata.value);
        if (added > 0) {
          collected += added;
          if (consumePickupValue(mesh, added) <= 0) {
            mesh.dispose();
            this.scrap = this.scrap.filter((item) => item !== mesh);
          }
        }
      }
    }
    return collected;
  }

  createRobotParts(position, amount = 1, options = {}) {
    for (let i = 0; i < amount; i += 1) {
      const pickupPosition = position.add(new BABYLON.Vector3(rand(-0.7, 0.7), 0.22, rand(-0.7, 0.7)));
      const rotation = new BABYLON.Vector3(rand(-0.3, 0.3), rand(0, Math.PI), rand(-0.3, 0.3));
      this.createRobotPartPickup(pickupPosition, 1, { ...options, rotation });
    }
  }

  createRobotPartPickup(position, value = 1, options = {}) {
    const mesh = BABYLON.MeshBuilder.CreateBox(`robotPart_${Date.now()}_${this.robotParts.length}`, { width: 0.26, height: 0.18, depth: 0.32 }, this.scene);
    mesh.position = position.clone();
    mesh.rotation = options.rotation?.clone?.() || new BABYLON.Vector3(0, rand(0, Math.PI), 0);
    mesh.material = this.materials.robotPart;
    mesh.metadata = {
      kind: "robotPart",
      value,
      baseY: mesh.position.y,
      baseRotationX: mesh.rotation.x,
      phase: Math.random() * Math.PI * 2,
      pickupAt: pickupTimeFromOptions(options)
    };
    this.robotParts.push(mesh);
    return mesh;
  }

  collectNearbyRobotParts(position, inventory) {
    return this.collectRobotPartsAt(position, inventory, 1.2);
  }

  collectRobotPartsAt(position, inventory, radius = 1.2) {
    let collected = 0;
    for (const mesh of [...this.robotParts]) {
      if (!isPickupReady(mesh)) continue;
      if (flatDistance(position, mesh.position) < radius) {
        const added = inventory.addRobotParts(mesh.metadata.value);
        if (added > 0) {
          collected += added;
          if (consumePickupValue(mesh, added) <= 0) {
            mesh.dispose();
            this.robotParts = this.robotParts.filter((item) => item !== mesh);
          }
        }
      }
    }
    return collected;
  }

  hasNearbyBackpackLoot(position, radius = 1.25) {
    return [...this.scrap, ...this.robotParts].some((mesh) => isPickupReady(mesh) && flatDistance(position, mesh.position) < radius);
  }

  hasNearbyBatteryPickup(position, radius = 1.25) {
    return this.batteries.some((mesh) => isPickupReady(mesh) && flatDistance(position, mesh.position) < radius);
  }

  collectNearbyBattery(position, inventory, rechargeAmount) {
    const collected = { count: 0, charged: 0, stored: 0 };
    for (const mesh of [...this.batteries]) {
      if (!isPickupReady(mesh)) continue;
      if (flatDistance(position, mesh.position) < 1.25) {
        const result = inventory.collectBattery(rechargeAmount);
        if (result.charged > 0 || result.stored > 0) {
          collected.count += 1;
          collected.charged += result.charged;
          collected.stored += result.stored;
          this.disposePickupMesh(mesh);
          this.batteries = this.batteries.filter((item) => item !== mesh);
        }
      }
    }
    return collected;
  }

  serializePickups() {
    const serializeMesh = (mesh) => ({
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
      value: mesh.metadata?.value || 1,
      pickupRemainingMs: pickupRemainingMs(mesh)
    });
    return {
      scrap: this.scrap.filter((mesh) => !mesh.isDisposed()).map(serializeMesh),
      robotParts: this.robotParts.filter((mesh) => !mesh.isDisposed()).map((mesh) => ({
        ...serializeMesh(mesh),
        rx: mesh.rotation.x,
        ry: mesh.rotation.y,
        rz: mesh.rotation.z
      })),
      batteries: this.batteries.filter((mesh) => !mesh.isDisposed()).map((mesh) => ({
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
        pickupRemainingMs: pickupRemainingMs(mesh)
      }))
    };
  }

  loadPickups(data = {}) {
    this.clearPickups();
    for (const item of Array.isArray(data.scrap) ? data.scrap : []) {
      this.createScrapPickup(vectorFromItem(item, 0.25), numberOr(item.value, 1), { pickupDelayMs: numberOr(item.pickupRemainingMs, 0) });
    }
    for (const item of Array.isArray(data.robotParts) ? data.robotParts : []) {
      this.createRobotPartPickup(vectorFromItem(item, 0.22), numberOr(item.value, 1), {
        pickupDelayMs: numberOr(item.pickupRemainingMs, 0),
        rotation: new BABYLON.Vector3(numberOr(item.rx, 0), numberOr(item.ry, 0), numberOr(item.rz, 0))
      });
    }
    (Array.isArray(data.batteries) ? data.batteries : []).forEach((item, index) => {
      this.createBatteryPickup(vectorFromItem(item, 0.25), index, { pickupDelayMs: numberOr(item.pickupRemainingMs, 0) });
    });
  }

  createMaterials() {
    const make = (name, color) => {
      const mat = new BABYLON.StandardMaterial(name, this.scene);
      mat.diffuseColor = new BABYLON.Color3(...color);
      mat.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
      return mat;
    };
    const emissive = (name, color) => {
      const mat = make(name, color);
      mat.emissiveColor = new BABYLON.Color3(...color).scale(0.72);
      return mat;
    };
    const materials = {
      floor: make("floorMat", [0.12, 0.16, 0.15]),
      wall: make("wallMat", [0.32, 0.39, 0.36]),
      trim: make("trimMat", [0.12, 0.22, 0.18]),
      screen: make("screenMat", [0.1, 0.78, 0.42]),
      bench: make("benchMat", [0.37, 0.34, 0.28]),
      scrap: make("scrapMat", [0.58, 0.72, 0.84]),
      robotPart: make("robotPartMat", [0.86, 0.86, 0.92]),
      health: make("healthMat", [0.1, 0.72, 0.34]),
      healthCooldown: make("healthCooldownMat", [0.95, 0.68, 0.16]),
      healthEmpty: make("healthEmptyMat", [0.35, 0.08, 0.08]),
      battery: make("batteryMat", [0.95, 0.78, 0.2]),
      batteryGlow: emissive("batteryGlowMat", [1, 0.78, 0.18]),
      questBeacon: emissive("questBeaconMat", [0.16, 0.88, 1]),
      alarmBeaconIdle: make("alarmBeaconIdleMat", [0.16, 0.06, 0.05]),
      alarmBeaconActive: emissive("alarmBeaconActiveMat", [1, 0.12, 0.08]),
      alarmHalo: emissive("alarmHaloMat", [1, 0.08, 0.04]),
      generator: make("generatorMat", [0.24, 0.28, 0.32]),
      generatorActive: emissive("generatorActiveMat", [0.16, 0.76, 0.52]),
      generatorCoilActive: emissive("generatorCoilActiveMat", [0.22, 0.95, 1]),
      control: make("controlMat", [0.12, 0.3, 0.58]),
      controlActive: emissive("controlActiveMat", [0.16, 0.72, 0.95]),
      controlScreenActive: emissive("controlScreenActiveMat", [0.28, 1, 0.68]),
      doorLocked: make("doorLockedMat", [0.62, 0.1, 0.08]),
      doorOpen: make("doorOpenMat", [0.1, 0.65, 0.28])
    };
    materials.alarmHalo.alpha = 0.34;
    materials.batteryGlow.alpha = 0.32;
    return materials;
  }

  createRoom() {
    this.floor = BABYLON.MeshBuilder.CreateGround("factoryFloor", { width: 22, height: 18 }, this.scene);
    this.floor.material = this.materials.floor;
    this.floor.checkCollisions = true;
    this.walls = [];

    const walls = [
      { name: "northWall", pos: [0, 1.8, 9], scale: [22, 3.6, 0.4] },
      { name: "southWall", pos: [0, 1.8, -9], scale: [22, 3.6, 0.4] },
      { name: "westWall", pos: [-11, 1.8, 0], scale: [0.4, 3.6, 18] },
      { name: "eastWall", pos: [11, 1.8, 0], scale: [0.4, 3.6, 18] }
    ];

    for (const wall of walls) {
      const mesh = BABYLON.MeshBuilder.CreateBox(wall.name, { width: wall.scale[0], height: wall.scale[1], depth: wall.scale[2] }, this.scene);
      mesh.position.set(...wall.pos);
      mesh.material = this.materials.wall;
      mesh.checkCollisions = true;
      this.walls.push(mesh);
    }

    for (let x = -8; x <= 8; x += 4) {
      const beam = BABYLON.MeshBuilder.CreateBox(`ceilingBeam_${x}`, { width: 0.18, height: 0.18, depth: 17 }, this.scene);
      beam.position.set(x, 3.45, 0);
      beam.material = this.materials.trim;

      const light = new BABYLON.PointLight(`ceilingLight_${x}`, new BABYLON.Vector3(x, 3.15, 0), this.scene);
      light.diffuse = new BABYLON.Color3(0.78, 0.95, 0.84);
      light.intensity = 0.75;
      light.range = 7;
      this.powerLights.push(light);
    }
  }

  createAlarmBeacons() {
    const spots = [
      [-8.8, 3.12, -6.8],
      [8.8, 3.12, -6.8],
      [-8.8, 3.12, 6.8],
      [8.8, 3.12, 6.8]
    ];

    spots.forEach((spot, index) => {
      const body = BABYLON.MeshBuilder.CreateCylinder(`alarmBeacon_${index}`, {
        diameter: 0.34,
        height: 0.22,
        tessellation: 18
      }, this.scene);
      body.position.set(...spot);
      body.material = this.materials.alarmBeaconIdle;
      body.isPickable = false;

      const halo = BABYLON.MeshBuilder.CreateTorus(`alarmBeaconHalo_${index}`, {
        diameter: 0.74,
        thickness: 0.035,
        tessellation: 28
      }, this.scene);
      halo.position = body.position.add(new BABYLON.Vector3(0, -0.05, 0));
      halo.rotation.x = Math.PI / 2;
      halo.material = this.materials.alarmHalo;
      halo.isPickable = false;
      halo.setEnabled(false);

      const light = new BABYLON.PointLight(`alarmBeaconLight_${index}`, body.position.add(new BABYLON.Vector3(0, -0.25, 0)), this.scene);
      light.diffuse = new BABYLON.Color3(1, 0.08, 0.04);
      light.range = 5.2;
      light.intensity = 0;

      this.alarmBeacons.push({ body, halo, light, phase: index * 1.4 });
    });
  }

  createComputer() {
    const base = BABYLON.MeshBuilder.CreateBox("partyComputerBase", { width: 1.6, height: 0.9, depth: 0.7 }, this.scene);
    base.position = new BABYLON.Vector3(-6.8, 0.45, -6.1);
    base.material = this.materials.trim;
    base.checkCollisions = true;

    const screen = BABYLON.MeshBuilder.CreateBox("partyComputerScreen", { width: 1.35, height: 0.82, depth: 0.08 }, this.scene);
    screen.position = this.computerPosition;
    screen.rotation.x = -0.18;
    screen.material = this.materials.screen;
    screen.metadata = { kind: "computer" };

    const markerLight = new BABYLON.PointLight("partyComputerMarkerLight", this.computerPosition.add(new BABYLON.Vector3(0, 1.15, 0)), this.scene);
    markerLight.diffuse = new BABYLON.Color3(0.2, 1, 0.52);
    markerLight.intensity = 0.75;
    markerLight.range = 4.5;

    const sign = BABYLON.MeshBuilder.CreatePlane("partyComputerSign", { width: 1.8, height: 0.42 }, this.scene);
    sign.position = this.computerPosition.add(new BABYLON.Vector3(0, 1.12, -0.08));
    sign.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const texture = new BABYLON.DynamicTexture("partyComputerSignTexture", { width: 512, height: 128 }, this.scene);
    texture.drawText("PARTI PC", 84, 82, "bold 52px Arial", "#d9ffe6", "rgba(0, 40, 20, 0.8)", true);
    const signMaterial = new BABYLON.StandardMaterial("partyComputerSignMat", this.scene);
    signMaterial.diffuseTexture = texture;
    signMaterial.emissiveColor = new BABYLON.Color3(0.36, 1, 0.56);
    signMaterial.opacityTexture = texture;
    sign.material = signMaterial;
  }

  createWorkbench() {
    const bench = BABYLON.MeshBuilder.CreateBox("craftingBench", { width: 2.8, height: 0.85, depth: 1.2 }, this.scene);
    bench.position = this.benchPosition;
    bench.material = this.materials.bench;
    bench.checkCollisions = true;

    const anvil = BABYLON.MeshBuilder.CreateBox("anvil", { width: 0.8, height: 0.3, depth: 0.55 }, this.scene);
    anvil.position = this.benchPosition.add(new BABYLON.Vector3(0.4, 0.6, 0));
    anvil.material = this.materials.wall;
  }

  createHealthStation() {
    const station = BABYLON.MeshBuilder.CreateBox("healthStation", { width: 1, height: 1.6, depth: 0.55 }, this.scene);
    station.position = this.healthPosition;
    station.material = this.materials.trim;
    station.checkCollisions = true;

    this.healthStationScreen = BABYLON.MeshBuilder.CreateBox("healthStationScreen", { width: 0.68, height: 0.46, depth: 0.04 }, this.scene);
    this.healthStationScreen.position = this.healthPosition.add(new BABYLON.Vector3(0, 0.22, -0.3));
    this.healthStationScreen.material = this.materials.health;

    const crossVertical = BABYLON.MeshBuilder.CreateBox("healthStationCrossV", { width: 0.12, height: 0.44, depth: 0.05 }, this.scene);
    crossVertical.position = this.healthPosition.add(new BABYLON.Vector3(0, 0.22, -0.34));
    crossVertical.material = this.materials.health;

    const crossHorizontal = BABYLON.MeshBuilder.CreateBox("healthStationCrossH", { width: 0.42, height: 0.12, depth: 0.05 }, this.scene);
    crossHorizontal.position = this.healthPosition.add(new BABYLON.Vector3(0, 0.22, -0.35));
    crossHorizontal.material = this.materials.health;

    this.healthStationChargeBar = BABYLON.MeshBuilder.CreateBox("healthStationChargeBar", { width: 0.78, height: 0.08, depth: 0.05 }, this.scene);
    this.healthStationChargeBar.position = this.healthPosition.add(new BABYLON.Vector3(0, -0.48, -0.34));
    this.healthStationChargeBar.material = this.materials.health;

    this.healthStationLight = new BABYLON.PointLight("healthStationLight", this.healthPosition.add(new BABYLON.Vector3(0, 0.9, -0.4)), this.scene);
    this.healthStationLight.diffuse = new BABYLON.Color3(0.2, 1, 0.48);
    this.healthStationLight.intensity = 0.65;
    this.healthStationLight.range = 3.5;
  }

  setHealthStationState(state = {}) {
    if (!this.healthStationScreen || !this.healthStationChargeBar || !this.healthStationLight) return;
    const charges = Math.max(0, Number(state.charges) || 0);
    const maxCharges = Math.max(1, Number(state.maxCharges) || 1);
    const ratio = Math.max(0.08, Math.min(1, charges / maxCharges));
    const material = charges <= 0 ? this.materials.healthEmpty : state.ready ? this.materials.health : this.materials.healthCooldown;
    this.healthStationScreen.material = material;
    this.healthStationChargeBar.material = material;
    this.healthStationChargeBar.scaling.x = ratio;
    this.healthStationLight.diffuse = charges <= 0 ? new BABYLON.Color3(1, 0.14, 0.12) : state.ready ? new BABYLON.Color3(0.2, 1, 0.48) : new BABYLON.Color3(1, 0.62, 0.18);
    this.healthStationLight.intensity = charges <= 0 ? 0.14 : state.ready ? 0.72 : 0.38;
  }

  createExitDoor() {
    this.exitDoor = BABYLON.MeshBuilder.CreateBox("exitDoor", { width: 2.8, height: 2.5, depth: 0.22 }, this.scene);
    this.exitDoor.position = new BABYLON.Vector3(0, 1.45, 8.76);
    this.exitDoor.material = this.materials.doorLocked;

    const frame = BABYLON.MeshBuilder.CreateBox("exitDoorFrame", { width: 3.2, height: 2.9, depth: 0.18 }, this.scene);
    frame.position = new BABYLON.Vector3(0, 1.55, 8.9);
    frame.material = this.materials.trim;
    frame.checkCollisions = false;
  }

  createGenerator() {
    this.generator = BABYLON.MeshBuilder.CreateBox("generator", { width: 1.6, height: 1.55, depth: 1.1 }, this.scene);
    this.generator.position = this.generatorPosition;
    this.generator.material = this.materials.generator;
    this.generator.checkCollisions = true;

    this.generatorCoil = BABYLON.MeshBuilder.CreateTorus("generatorCoil", { diameter: 0.9, thickness: 0.08 }, this.scene);
    this.generatorCoil.position = this.generatorPosition.add(new BABYLON.Vector3(0, 0.15, -0.58));
    this.generatorCoil.rotation.x = Math.PI / 2;
    this.generatorCoil.material = this.materials.battery;

    this.generatorLight = new BABYLON.PointLight("generatorActiveLight", this.generatorPosition.add(new BABYLON.Vector3(0, 1.1, -0.25)), this.scene);
    this.generatorLight.diffuse = new BABYLON.Color3(0.24, 0.95, 1);
    this.generatorLight.range = 4.2;
    this.generatorLight.intensity = 0;
  }

  setGeneratorActive(active) {
    if (!this.generator || !this.generatorCoil || !this.generatorLight) return;
    this.generator.material = active ? this.materials.generatorActive : this.materials.generator;
    this.generatorCoil.material = active ? this.materials.generatorCoilActive : this.materials.battery;
    this.generatorLight.intensity = active ? 0.85 : 0;
  }

  createControlRoom() {
    this.controlRoomConsole = BABYLON.MeshBuilder.CreateBox("controlRoomConsole", { width: 2.2, height: 0.8, depth: 0.8 }, this.scene);
    this.controlRoomConsole.position = this.controlRoomPosition;
    this.controlRoomConsole.material = this.materials.control;
    this.controlRoomConsole.checkCollisions = true;

    this.controlRoomScreen = BABYLON.MeshBuilder.CreateBox("controlRoomScreen", { width: 1.45, height: 0.55, depth: 0.08 }, this.scene);
    this.controlRoomScreen.position = this.controlRoomPosition.add(new BABYLON.Vector3(0, 0.65, -0.43));
    this.controlRoomScreen.material = this.materials.screen;

    this.controlRoomLight = new BABYLON.PointLight("controlRoomCapturedLight", this.controlRoomPosition.add(new BABYLON.Vector3(0, 1.45, -0.35)), this.scene);
    this.controlRoomLight.diffuse = new BABYLON.Color3(0.28, 1, 0.68);
    this.controlRoomLight.range = 4.5;
    this.controlRoomLight.intensity = 0;
  }

  setControlRoomCaptured(captured) {
    if (!this.controlRoomConsole || !this.controlRoomScreen || !this.controlRoomLight) return;
    this.controlRoomConsole.material = captured ? this.materials.controlActive : this.materials.control;
    this.controlRoomScreen.material = captured ? this.materials.controlScreenActive : this.materials.screen;
    this.controlRoomLight.intensity = captured ? 0.8 : 0;
  }

  createQuestBeacon() {
    const root = new BABYLON.TransformNode("questBeaconRoot", this.scene);
    const ring = BABYLON.MeshBuilder.CreateTorus("questBeaconRing", { diameter: 1.25, thickness: 0.045, tessellation: 32 }, this.scene);
    ring.parent = root;
    ring.rotation.x = Math.PI / 2;
    ring.material = this.materials.questBeacon;

    const core = BABYLON.MeshBuilder.CreateSphere("questBeaconCore", { diameter: 0.2, segments: 16 }, this.scene);
    core.parent = root;
    core.material = this.materials.questBeacon;

    const light = new BABYLON.PointLight("questBeaconLight", new BABYLON.Vector3(0, 0, 0), this.scene);
    light.parent = root;
    light.diffuse = new BABYLON.Color3(0.2, 0.95, 1);
    light.range = 4;
    light.intensity = 0.7;

    this.questBeaconRoot = root;
    this.questBeaconRing = ring;
    this.questBeaconLight = light;
    this.questBeaconRoot.setEnabled(false);
  }

  createBatteryPickups(spots) {
    spots.forEach((spot, index) => {
      this.createBatteryPickup(new BABYLON.Vector3(...spot), index);
    });
  }

  createBatteryPickup(position, index = this.batteries.length, options = {}) {
    const battery = BABYLON.MeshBuilder.CreateCylinder(`batteryPickup_${Date.now()}_${index}`, { height: 0.42, diameter: 0.22 }, this.scene);
    battery.position = position.clone();
    battery.rotation.z = Math.PI / 2;
    battery.material = this.materials.battery;

    const halo = BABYLON.MeshBuilder.CreateTorus(`batteryPickupHalo_${Date.now()}_${index}`, {
      diameter: 0.58,
      thickness: 0.025,
      tessellation: 24
    }, this.scene);
    halo.parent = battery;
    halo.rotation.x = Math.PI / 2;
    halo.material = this.materials.batteryGlow;

    const light = new BABYLON.PointLight(`batteryPickupLight_${Date.now()}_${index}`, battery.position.clone(), this.scene);
    light.parent = battery;
    light.diffuse = new BABYLON.Color3(1, 0.78, 0.18);
    light.range = 2.4;
    light.intensity = 0.4;

    battery.metadata = {
      kind: "battery",
      baseY: battery.position.y,
      phase: index * 1.7,
      pickupAt: pickupTimeFromOptions(options),
      halo,
      light
    };
    this.batteries.push(battery);
    return battery;
  }

  disposePickupMesh(mesh) {
    if (!mesh || mesh.isDisposed()) return;
    if (mesh.metadata?.light) mesh.metadata.light.dispose();
    if (mesh.metadata?.halo && !mesh.metadata.halo.isDisposed()) mesh.metadata.halo.dispose();
    mesh.dispose();
  }

  createProps(props) {
    props.forEach((prop, index) => {
      let mesh;
      if (prop.type === "barrel") {
        mesh = BABYLON.MeshBuilder.CreateCylinder(`roomBarrel_${index}`, { height: 1.05, diameter: 0.6 }, this.scene);
        mesh.position.set(prop.x, 0.52, prop.z);
      } else if (prop.type === "console") {
        mesh = BABYLON.MeshBuilder.CreateBox(`roomConsole_${index}`, { width: prop.w, height: 0.85, depth: prop.d }, this.scene);
        mesh.position.set(prop.x, 0.42, prop.z);
        mesh.material = this.materials.control;
      } else if (prop.type === "lowWall") {
        mesh = BABYLON.MeshBuilder.CreateBox(`roomLowWall_${index}`, { width: prop.w, height: 0.95, depth: prop.d }, this.scene);
        mesh.position.set(prop.x, 0.47, prop.z);
      } else {
        mesh = BABYLON.MeshBuilder.CreateBox(`roomCrate_${index}`, { width: prop.w, height: 1.1, depth: prop.d }, this.scene);
        mesh.position.set(prop.x, 0.55, prop.z);
      }
      if (!mesh.material) mesh.material = this.materials.trim;
      mesh.checkCollisions = true;
      this.dynamicProps.push(mesh);
    });
  }

  getRoomRobotPlan(roomNumber) {
    const definition = getRoomDefinition(roomNumber);
    return {
      robotPlan: definition.robotPlan,
      robotCountBase: definition.robotCountBase,
      spawnZones: definition.spawnZones
    };
  }

  getRoomName(roomNumber) {
    return getRoomDefinition(roomNumber).name;
  }

  getRoomDefinitionId(roomNumber) {
    return getRoomDefinition(roomNumber).id;
  }

  getRandomSpawn(roomNumber) {
    const zones = getRoomDefinition(roomNumber).spawnZones;
    const zone = zones[Math.floor(Math.random() * zones.length)];
    return new BABYLON.Vector3(rand(zone.minX, zone.maxX), 0, rand(zone.minZ, zone.maxZ));
  }
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function flatDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function pickupTimeFromOptions(options = {}) {
  const delay = Number(options.pickupDelayMs) || 0;
  return delay > 0 ? performance.now() + delay : 0;
}

function isPickupReady(mesh) {
  return !mesh.metadata?.pickupAt || performance.now() >= mesh.metadata.pickupAt;
}

function pickupRemainingMs(mesh) {
  return mesh.metadata?.pickupAt ? Math.max(0, Math.round(mesh.metadata.pickupAt - performance.now())) : 0;
}

function consumePickupValue(mesh, amount) {
  const remaining = Math.max(0, numberOr(mesh.metadata?.value, 1) - amount);
  mesh.metadata.value = remaining;
  return remaining;
}

function vectorFromItem(item, fallbackY) {
  return new BABYLON.Vector3(numberOr(item.x, 0), numberOr(item.y, fallbackY), numberOr(item.z, 0));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
