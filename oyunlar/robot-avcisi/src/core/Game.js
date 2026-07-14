import { GAME_CONFIG } from "../config.js";
import { Player } from "../entities/Player.js";
import { RobotManager } from "../entities/RobotManager.js";
import { Input } from "./Input.js";
import { FactoryScene } from "../world/FactoryScene.js";
import { Inventory } from "../systems/Inventory.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { CraftingSystem } from "../systems/CraftingSystem.js";
import { HelperRobotSystem } from "../systems/HelperRobotSystem.js";
import { AudioSystem } from "../systems/AudioSystem.js";
import { PartyClient } from "../systems/PartyClient.js";
import { FlashlightSystem } from "../systems/FlashlightSystem.js";
import { PowerSystem } from "../systems/PowerSystem.js";
import { QuestSystem } from "../systems/QuestSystem.js";
import { AchievementSystem } from "../systems/AchievementSystem.js";
import { CosmeticSystem } from "../systems/CosmeticSystem.js";
import { VoiceChatSystem } from "../systems/VoiceChatSystem.js";
import { PartyAvatarSystem } from "../systems/PartyAvatarSystem.js";
import { SecuritySystem } from "../systems/SecuritySystem.js";
import { SaveSystem } from "../systems/SaveSystem.js";
import { SettingsSystem } from "../systems/SettingsSystem.js";
import { HealthStationSystem } from "../systems/HealthStationSystem.js";
import { Hud } from "../ui/Hud.js";
import { MainMenu } from "../ui/MainMenu.js";
import { normalizeChatCommand } from "../utils/chatCommands.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.05, 0.07, 0.07, 1);
    this.hud = new Hud();
    this.input = new Input(canvas);
    this.inventory = new Inventory();
    this.factory = new FactoryScene(this.scene);
    this.factory.build();
    this.player = new Player(this.scene, canvas);
    this.settingsSystem = new SettingsSystem();
    this.settings = this.settingsSystem.load();
    this.audio = new AudioSystem(this.settings);
    this.robotManager = new RobotManager(this.scene, this.factory, (robot) => this.onRobotKilled(robot));
    this.combat = new CombatSystem(this.scene, this.player, this.robotManager, this.hud, this.audio, () => this.handleCombatExplosion());
    this.helperRobots = new HelperRobotSystem(this.scene, this.factory, this.inventory, this.robotManager, this.hud);
    this.crafting = new CraftingSystem(this.factory, this.inventory, this.combat, this.helperRobots, this.hud);
    this.flashlight = new FlashlightSystem(this.factory, this.inventory, this.hud);
    this.power = new PowerSystem(this.factory, this.hud, this.audio);
    this.healthStation = new HealthStationSystem(this.factory, this.hud);
    this.quest = new QuestSystem(this.hud);
    this.achievements = new AchievementSystem(this.hud);
    this.cosmetics = new CosmeticSystem(this.hud, this.player);
    this.party = new PartyClient(
      this.player,
      this.hud,
      (command, name) => this.handleChatCommand(command, name),
      () => this.room,
      () => this.partyLoadout(),
      () => this.partyEquipment()
    );
    this.voice = new VoiceChatSystem(this.party, this.hud, this.settings);
    this.party.attachVoice(this.voice);
    this.partyAvatars = new PartyAvatarSystem(this.scene, this.party);
    this.party.onRemoteCommand = (command, playerId, name) => this.handleRemoteChatCommand(command, playerId, name);
    this.security = new SecuritySystem(this.scene, this.factory, this.hud, (reason) => this.triggerAlarm(reason));
    this.saveSystem = new SaveSystem(this);
    this.menu = new MainMenu(this);
    this.healthStation.setTranslator((key, replacements) => this.t(key, replacements));
    this.crafting.setTranslator((key, replacements) => this.t(key, replacements));
    this.combat.setTranslator((key, replacements) => this.t(key, replacements));
    this.helperRobots.setTranslator((key, replacements) => this.t(key, replacements));
    this.flashlight.setTranslator((key, replacements) => this.t(key, replacements));
    this.power.setTranslator((key, replacements) => this.t(key, replacements));
    this.quest.setTranslator((key, replacements) => this.t(key, replacements));
    this.achievements.setTranslator((key, replacements) => this.t(key, replacements));
    this.cosmetics.setTranslator((key, replacements) => this.t(key, replacements));
    this.security.setTranslator((key, replacements) => this.t(key, replacements));
    this.saveSystem.setTranslator((key, replacements) => this.t(key, replacements));
    this.party.setTranslator((key, replacements) => this.t(key, replacements));
    this.voice.setTranslator((key, replacements) => this.t(key, replacements));
    this.alarm = false;
    this.alarmUntil = 0;
    this.nextAlarmReinforcementAt = 0;
    this.alarmReinforcementWaves = 0;
    this.lastBackpackFullLogAt = 0;
    this.partyStartHandled = false;
    this.lastQuestTarget = null;
    this.started = false;
    this.room = 1;
    this.roomCleared = false;
    this.factory.applyRoomLayout(this.room);
    this.robotManager.spawnWave(this.room, this.difficultyProfile());
    this.factory.setExitDoorOpen(false);
    this.bindEvents();
    this.cosmetics.update(this.player.kills);
    this.achievements.stats.kills = this.player.kills;
    this.achievements.stats.scrap = this.inventory.totalScrapCollected;
    this.achievements.render();
  }

  start() {
    this.engine.runRenderLoop(() => {
      const now = performance.now();
      if (this.settings.fpsLimit > 0 && this.lastFrameAt && now - this.lastFrameAt < 1000 / this.settings.fpsLimit) return;
      this.lastFrameAt = now;
      this.update();
      this.scene.render();
    });
    window.addEventListener("resize", () => this.engine.resize());
  }

  bindEvents() {
    this.canvas.addEventListener("click", () => {
      if (!this.hud.isComputerOpen()) {
        this.audio.unlock();
        this.started = true;
        this.canvas.requestPointerLock?.();
      }
    });
    window.addEventListener("pointerdown", (event) => {
      if (event.button === 0 && document.pointerLockElement === this.canvas && !this.hud.isComputerOpen()) {
        this.audio.unlock();
        this.combat.shoot();
      }
    });
  }

  update() {
    const delta = this.engine.getDeltaTime() / 16.67;
    const time = performance.now();
    this.player.update(this.input);
    this.factory.updateFlashlight(this.player.camera);
    this.updateQuestBeacon(time);
    this.factory.updateAlarmVisual(time);
    this.factory.updateLootPickups(time);
    this.factory.updateBatteryPickups(time);
    this.power.update(time, this.started);
    this.flashlight.update(delta, this.started);
    if (this.started) this.robotManager.update(this.player.position, delta, {
      speedMultiplier: this.power.robotSpeedMultiplier(),
      powerOutage: this.power.outage,
      time
    });
    this.party.update(time);
    this.syncPartyStart();
    this.voice.update(this.input);
    this.partyAvatars.update();
    this.helperRobots.update(delta);
    this.security.update(this.player, delta, this.started, this.alarm);
    this.healthStation.update(time);

    const collected = this.factory.collectNearbyScrap(this.player.position, this.inventory);
    if (collected > 0) {
      this.hud.addLog(this.t("logScrapCollected", { count: collected }));
      this.achievements.onScrapCollected(this.inventory.totalScrapCollected);
      this.audio.playPickup();
    }
    const collectedParts = this.factory.collectNearbyRobotParts(this.player.position, this.inventory);
    if (collectedParts > 0) {
      this.hud.addLog(this.t("logPartsCollected", { count: collectedParts }));
      this.audio.playPickup();
    }
    const blockedByFullBackpack = this.inventory.isFull() && (
      this.factory.hasNearbyBackpackLoot(this.player.position)
      || (this.inventory.battery >= GAME_CONFIG.player.batteryCapacity - 1 && this.factory.hasNearbyBatteryPickup(this.player.position))
    );
    if (blockedByFullBackpack && time - this.lastBackpackFullLogAt > 3500) {
      this.lastBackpackFullLogAt = time;
      this.hud.addLog(this.t("logBackpackFull"));
    }
    if (this.flashlight.collectBattery(this.player.position) > 0) this.audio.playPickup();

    const damage = this.started ? this.robotManager.getContactDamage(this.player.position) : 0;
    if (damage > 0 && this.player.takeDamage(damage)) {
      this.hud.addLog(this.t("logRespawned"));
      this.achievements.onDeath();
      this.player.respawn();
      this.inventory.scrap = Math.max(0, this.inventory.scrap - 3);
    }

    this.ensureRoomCleared({ save: true });

    if (this.input.consumeInteract()) this.handleInteract();
    if (this.input.consumePlace() && this.crafting.tryBuildHelper(this.player.position)) this.saveSystem.save();
    if (this.input.consumeCycleHelper() && this.crafting.cycleHelperType(this.player.position)) this.saveSystem.save();
    if (this.input.consumeCraftWeapon() && this.crafting.tryCraftWeapon(this.player.position)) this.saveSystem.save();
    if (this.input.consumeReclaimBench() && this.crafting.reclaimBench(this.player.position)) this.saveSystem.save();
    if (this.input.consumeDropItem()) this.dropBackpackItem();
    const weaponSlot = this.input.consumeWeaponSlot();
    if (weaponSlot) this.combat.selectWeaponSlot(weaponSlot);
    if (this.input.consumeFlashlightToggle()) this.flashlight.toggle();

    this.cosmetics.update(this.player.kills);
    this.updateAlarm(time);
    this.updateHud();
    this.saveSystem.update(time);
  }

  handleInteract() {
    const target = this.interactionTarget();
    if (target === "computer") {
      this.hud.openComputer();
      return;
    }
    if (target === "workbench") {
      if (this.crafting.tryUpgradeWeapon(this.player.position)) this.saveSystem.save();
      return;
    }
    if (target === "health") {
      if (this.healthStation.tryUse(this.player)) this.saveSystem.save();
      return;
    }
    if (target === "exitDoor") {
      this.tryNextRoom();
      return;
    }
    if (target === "generator") {
      if (this.power.restore()) {
        this.factory.setGeneratorActive(true);
        this.quest.onGeneratorStarted();
        this.saveSystem.save();
      } else this.hud.addLog(this.t("logGeneratorAlreadyOn"));
      return;
    }
    if (target === "controlRoom") {
      this.disableSecuritySystem();
      this.factory.setControlRoomCaptured(true);
      this.quest.onControlRoomCaptured();
      this.saveSystem.save();
    }
  }

  interactionTarget() {
    const position = this.player.position;
    const candidates = [
      { type: "computer", position: this.factory.computerPosition, range: 2.1 },
      { type: "workbench", position: this.factory.benchPosition, range: 2.2 },
      { type: "health", position: this.factory.healthPosition, range: 1.8 },
      { type: "exitDoor", position: this.factory.exitDoorPosition, range: 2.2 },
      { type: "generator", position: this.factory.generatorPosition, range: 2.1 },
      { type: "controlRoom", position: this.factory.controlRoomPosition, range: 2.2 }
    ];
    let nearest = null;
    for (const candidate of candidates) {
      if (!candidate.position) continue;
      const distance = BABYLON.Vector3.Distance(position, candidate.position);
      if (distance > candidate.range) continue;
      const score = this.interactionScore(candidate.position, distance);
      if (!nearest || score < nearest.score) nearest = { ...candidate, distance, score };
    }
    return nearest?.type || null;
  }

  interactionScore(targetPosition, distance) {
    const forward = this.player.camera.getForwardRay(1).direction.clone();
    forward.y = 0;
    const toTarget = targetPosition.subtract(this.player.position);
    toTarget.y = 0;
    if (forward.length() < 0.01 || toTarget.length() < 0.01) return distance;
    forward.normalize();
    toTarget.normalize();
    const facing = Math.max(0, BABYLON.Vector3.Dot(forward, toTarget));
    return distance + (1 - facing) * 0.85;
  }

  syncPartyStart() {
    if (!this.party.started || this.partyStartHandled) return;
    this.partyStartHandled = true;
    this.started = true;
    this.hud.closeComputer();
    this.menu.root.classList.add("hidden");
    this.player.camera.position.set(0, GAME_CONFIG.player.height, -8);
    this.audio.unlock();
    this.hud.addLog(this.t("logPartyStarted"));
    this.updateHud();
    this.saveSystem.save();
  }

  updateHud() {
    let prompt = this.started ? this.t("promptShoot") : this.t("startPrompt");
    let hasNearbyPrompt = false;
    const target = this.interactionTarget();
    if (target === "computer") {
      prompt = this.t("promptComputerOpen", { key: this.keyLabel("interact") });
      hasNearbyPrompt = true;
    } else if (target === "workbench") {
      prompt = this.t("promptWorkbench", {
        upgrade: this.keyLabel("interact"),
        craft: this.keyLabel("craftWeapon"),
        place: this.keyLabel("place"),
        helper: this.helperLabel(this.crafting.selectedHelperType),
        cycle: this.keyLabel("cycleHelper"),
        reclaim: this.keyLabel("reclaimBench"),
        status: this.crafting.benchStatusText()
      });
      hasNearbyPrompt = true;
    } else if (target === "health") {
      prompt = this.healthPrompt();
      hasNearbyPrompt = true;
    } else if (target === "exitDoor") {
      prompt = this.roomCleared
        ? this.t("promptNextRoom", { key: this.keyLabel("interact") })
        : this.t("logDoorLockedRemaining", { count: this.robotManager.countRoomRobots() });
      hasNearbyPrompt = true;
    } else if (target === "generator") {
      prompt = this.t("promptGenerator", { key: this.keyLabel("interact") });
      hasNearbyPrompt = true;
    } else if (target === "controlRoom") {
      prompt = this.t("promptControlRoom", { key: this.keyLabel("interact") });
      hasNearbyPrompt = true;
    }
    else if (this.started && !this.player.isSneaking && this.security.isNearActiveCamera(this.player.position)) {
      prompt = this.t("promptCameraSneak", { key: this.keyLabel("sneak") });
      hasNearbyPrompt = true;
    }
    else if (this.player.isSneaking) {
      prompt = this.t("promptSneak");
      hasNearbyPrompt = true;
    }
    if (!hasNearbyPrompt && document.pointerLockElement !== this.canvas && !this.hud.isComputerOpen()) prompt = this.t("promptPointer");

    this.hud.update({
      hp: this.player.hp,
      room: this.room,
      scrap: this.inventory.scrap,
      capacity: this.inventory.capacity,
      robotParts: this.inventory.robotParts,
      backpackUsed: this.inventory.usedSlots(),
      battery: this.inventory.battery,
      power: this.t("powerOn"),
      weapon: this.weaponLabel(),
      robots: this.robotManager.count(),
      quest: this.questText(),
      cosmetic: this.cosmeticLabel(),
      stealth: this.stealthLabel(),
      prompt,
      inventoryItems: this.inventoryHudItems()
    });
  }

  inventoryHudItems() {
    return [
      { kind: "scrap", label: this.t("inventoryScrap"), value: this.inventory.scrap },
      { kind: "parts", label: this.t("inventoryParts"), value: this.inventory.robotParts },
      { kind: "battery", label: this.t("inventoryBattery"), value: `${Math.ceil(this.inventory.battery)}%` },
      { kind: "battery", label: this.t("inventoryBatteryPack"), value: this.inventory.batteryPacks },
      { kind: "free", label: this.t("inventoryFree"), value: `${this.inventory.freeSlots()}/${this.inventory.capacity}` }
    ];
  }

  updateQuestBeacon(time) {
    const target = this.questBeaconTarget();
    this.factory.setQuestTarget(target);
    this.factory.updateQuestBeacon(time);
  }

  questBeaconTarget() {
    if (!this.started) return null;
    if (this.quest.activeId === "generator") return "generator";
    if (this.quest.activeId === "controlRoom") return "controlRoom";
    const remainingRoomRobots = this.robotManager.countRoomRobots();
    if (!this.roomCleared && remainingRoomRobots > 0 && remainingRoomRobots <= 2) {
      const robot = this.robotManager.nearestRoomRobot(this.player.position);
      if (robot) return { position: robot.body.position, offsetY: robot.flying ? 0.72 : 1.05 };
    }
    return null;
  }

  stealthLabel() {
    if (this.alarm) return this.t("stealthAlarm");
    if (this.security.detectionPercent() > 0) return this.t("stealthWatched", { percent: this.security.detectionPercent() });
    return this.player.isSneaking ? this.t("stealthHidden") : this.t("stealthNormal");
  }

  keyLabel(action) {
    return (this.input.keybinds[action] || "").toUpperCase();
  }

  updateAlarm(time) {
    if (this.roomCleared) {
      this.stopAlarmForClearedRoom();
      this.combat.shots = 0;
      return;
    }
    if (this.shouldTriggerShotAlarm()) {
      this.triggerAlarm(this.t("logTooManyShots"));
    }
    if (this.alarm && time > this.alarmUntil) {
      this.disableAlarm(this.t("logAlarmEnded"));
      return;
    }
    if (this.alarm) this.updateAlarmReinforcements(time);
  }

  handleCombatExplosion() {
    if (!GAME_CONFIG.alarm.explosionsTriggerAlarm) return;
    this.triggerAlarm(this.t("logExplosionAlarm"));
  }

  shouldTriggerShotAlarm() {
    return this.combat.shots >= GAME_CONFIG.alarm.shotsToTrigger;
  }

  triggerAlarm(reason) {
    if (this.alarm) return;
    const now = performance.now();
    this.activateAlarmState({
      alarmUntil: now + GAME_CONFIG.alarm.durationMs,
      nextAlarmReinforcementAt: now + GAME_CONFIG.alarm.reinforcementEveryMs,
      alarmReinforcementWaves: 0
    });
    this.quest.requireControlRoom();
    this.spawnAlarmReinforcements(GAME_CONFIG.alarm.initialReinforcements);
    this.hud.addLog(this.t("logAlarmTriggered", { reason }));
  }

  activateAlarmState({ alarmUntil, nextAlarmReinforcementAt, alarmReinforcementWaves = 0 }) {
    this.alarm = true;
    this.alarmUntil = Math.max(0, Number(alarmUntil) || 0);
    this.nextAlarmReinforcementAt = Math.max(0, Number(nextAlarmReinforcementAt) || 0);
    this.alarmReinforcementWaves = Math.max(0, Math.round(Number(alarmReinforcementWaves) || 0));
    this.factory.setAlarm(true);
    this.audio.startAlarm();
  }

  disableAlarm(message) {
    this.clearAlarmState({ resetShots: true });
    this.hud.addLog(message);
  }

  clearAlarmState(options = {}) {
    this.alarm = false;
    this.alarmUntil = 0;
    this.nextAlarmReinforcementAt = 0;
    this.alarmReinforcementWaves = 0;
    if (options.resetShots) this.combat.shots = 0;
    this.factory.setAlarm(false);
    this.audio.stopAlarm();
  }

  disableSecuritySystem() {
    const wasAlarmActive = this.alarm;
    if (wasAlarmActive) {
      this.disableAlarm(this.t("logControlAlarmOff"));
      const cleared = this.robotManager.clearAlarmRobots();
      if (cleared > 0) this.hud.addLog(this.t("logAlarmRobotsRetreated", { count: cleared }));
    }
    if (this.security.disabled) return;
    this.security.setDisabled(true);
    if (!wasAlarmActive) this.hud.addLog(this.t("logSecuritySystemDisabled"));
  }

  stopAlarmForClearedRoom() {
    if (!this.alarm) return;
    this.clearAlarmState();
  }

  updateAlarmReinforcements(time) {
    if (time < this.nextAlarmReinforcementAt) return;
    this.nextAlarmReinforcementAt = time + GAME_CONFIG.alarm.reinforcementEveryMs;
    if (this.alarmReinforcementWaves >= GAME_CONFIG.alarm.maxReinforcementWaves) return;
    const spawned = this.spawnAlarmReinforcements(GAME_CONFIG.alarm.reinforcementsPerWave);
    if (spawned > 0) this.alarmReinforcementWaves += 1;
  }

  spawnAlarmReinforcements(requestedCount) {
    const activeLimit = (this.difficultyProfile().maxRobots || 10) + GAME_CONFIG.alarm.extraActiveRobots;
    const freeSlots = Math.max(0, activeLimit - this.robotManager.count());
    const count = Math.min(requestedCount, freeSlots);
    if (count <= 0) return 0;

    for (let index = 0; index < count; index += 1) {
      const type = this.alarmRobotType(index);
      this.robotManager.spawnRobot(type, this.alarmSpawnPosition(index), this.difficultyProfile(), "alarm");
    }
    this.hud.addLog(this.t("logAlarmReinforcement", { count }));
    return count;
  }

  alarmRobotType(index) {
    const types = GAME_CONFIG.alarm.reinforcementTypes;
    return types[(this.alarmReinforcementWaves + index) % types.length] || "shield";
  }

  alarmSpawnPosition(index) {
    const angle = performance.now() * 0.0017 + index * 2.4;
    const distance = 4.8 + (index % 2) * 1.2;
    const x = clamp(this.player.position.x + Math.cos(angle) * distance, GAME_CONFIG.world.minX + 0.8, GAME_CONFIG.world.maxX - 0.8);
    const z = clamp(this.player.position.z + Math.sin(angle) * distance, GAME_CONFIG.world.minZ + 0.8, GAME_CONFIG.world.maxZ - 0.8);
    return new BABYLON.Vector3(x, 0, z);
  }

  tryNextRoom() {
    this.ensureRoomCleared({ save: true });
    if (!this.roomCleared) {
      const remainingBeforeRecall = this.robotManager.countRoomRobots();
      if (remainingBeforeRecall <= 3) this.robotManager.recallRoomRobotsNear(this.player.position);
      this.ensureRoomCleared({ save: true });
    }
    if (!this.roomCleared) {
      const remaining = this.robotManager.countRoomRobots();
      const nearest = this.robotManager.nearestRoomRobot(this.player.position);
      if (nearest) this.factory.setQuestTarget({ position: nearest.body.position, offsetY: nearest.flying ? 0.72 : 1.05 });
      this.hud.addLog(this.t("logDoorLockedRemaining", { count: remaining }));
      return;
    }
    this.room += 1;
    this.roomCleared = false;
    this.factory.applyRoomLayout(this.room);
    this.factory.setExitDoorOpen(false);
    this.player.camera.position.set(0, GAME_CONFIG.player.height, -8);
    this.helperRobots.moveAllNear(this.player.position);
    this.robotManager.spawnWave(this.room, this.difficultyProfile());
    this.achievements.startRoom();
    this.hud.addLog(this.t("logRoomStarted", { room: this.room, name: this.roomName(this.room) }));
    this.updateHud();
    this.saveSystem.save();
  }

  dropBackpackItem() {
    const position = this.backpackDropPosition();
    if (this.inventory.scrap > 0) {
      this.inventory.scrap -= 1;
      this.factory.createScrap(position, 1, { pickupDelayMs: 1000 });
      this.hud.addLog(this.t("logDroppedScrap"));
      this.saveSystem.save();
      return true;
    }
    if (this.inventory.robotParts > 0) {
      this.inventory.robotParts -= 1;
      this.factory.createRobotParts(position, 1, { pickupDelayMs: 1000 });
      this.hud.addLog(this.t("logDroppedPart"));
      this.saveSystem.save();
      return true;
    }
    if (this.inventory.batteryPacks > 0) {
      this.inventory.batteryPacks -= 1;
      this.factory.createBatteryPickup(position.add(new BABYLON.Vector3(0, 0.25, 0)), this.factory.batteries.length, { pickupDelayMs: 1000 });
      this.hud.addLog(this.t("logDroppedBattery"));
      this.saveSystem.save();
      return true;
    }
    this.hud.addLog(this.t("logDropNothing"));
    return false;
  }

  backpackDropPosition() {
    const direction = this.player.camera.getForwardRay(1).direction.clone();
    direction.y = 0;
    if (direction.length() < 0.01) direction.set(0, 0, 1);
    direction.normalize();
    const position = this.player.position.add(direction.scale(1.15));
    position.x = clamp(position.x, GAME_CONFIG.world.minX + 0.7, GAME_CONFIG.world.maxX - 0.7);
    position.y = 0;
    position.z = clamp(position.z, GAME_CONFIG.world.minZ + 0.7, GAME_CONFIG.world.maxZ - 0.7);
    return position;
  }

  ensureRoomCleared(options = {}) {
    if (this.roomCleared) {
      this.factory.setExitDoorOpen(true);
      return false;
    }
    this.robotManager.pruneInactive();
    if (this.robotManager.countRoomRobots() !== 0) return false;
    this.roomCleared = true;
    this.robotManager.clearAlarmRobots();
    this.stopAlarmForClearedRoom();
    this.combat.shots = 0;
    this.factory.setExitDoorOpen(true);
    this.hud.addLog(this.t("logRoomCleared"));
    this.achievements.onWaveCleared();
    if (options.save) this.saveSystem.save();
    return true;
  }

  resetNewGame() {
    this.saveSystem.clear();
    this.started = true;
    this.clearAlarmState({ resetShots: true });
    this.lastBackpackFullLogAt = 0;
    this.partyStartHandled = false;
    this.security.setDisabled(false);
    this.power.outage = false;
    this.power.nextOutageAt = performance.now() + GAME_CONFIG.power.firstOutageMs;
    this.factory.setPowerOutage(false);
    this.player.kills = 0;
    this.player.respawn();
    this.inventory.scrap = 0;
    this.inventory.battery = GAME_CONFIG.player.batteryCapacity;
    this.inventory.batteryPacks = 0;
    this.flashlight.reset();
    this.inventory.totalScrapCollected = 0;
    this.inventory.robotParts = 0;
    this.inventory.totalRobotPartsCollected = 0;
    this.combat.reset();
    this.room = 1;
    this.roomCleared = false;
    this.factory.applyRoomLayout(this.room);
    this.factory.setExitDoorOpen(false);
    this.factory.setGeneratorActive(false);
    this.factory.setControlRoomCaptured(false);
    this.quest.reset();
    this.achievements.reset();
    this.achievements.stats.kills = this.player.kills;
    this.achievements.stats.scrap = this.inventory.totalScrapCollected;
    this.achievements.render();
    this.cosmetics.reset();
    this.crafting.reset();
    this.healthStation.reset();
    this.helperRobots.reset();
    this.robotManager.reset(this.difficultyProfile());
    this.hud.addLog(this.t("logNewGame"));
    this.updateHud();
    this.saveSystem.save();
  }

  continueSavedGame() {
    if (!this.saveSystem.load()) {
      this.hud.addLog(this.t("logNoSave"));
      this.resetNewGame();
    }
  }

  onRobotKilled(robot) {
    this.player.kills += 1;
    this.quest.onRobotKilled();
    this.achievements.onRobotKilled(this.player, robot, { solo: this.party.isSolo() });
    this.hud.addLog(this.t("logRobotDestroyed", { robot: this.robotLabel(robot.typeKey) }));
    this.ensureRoomCleared({ save: true });
  }

  handleChatCommand(command, name) {
    const normalized = normalizeChatCommand(command);
    if (normalized === "/dans") {
      this.hud.addLog(this.t("logDance", { name }));
      this.partyAvatars.playLocalCommand(this.player.position, normalized);
      if (!this.settings.reduceShake) {
        this.player.camera.cameraRotation.z = 0.08;
        setTimeout(() => {
          this.player.camera.cameraRotation.z = 0;
        }, 550);
      }
      return;
    }
    if (normalized === "/cak" || normalized === "/çak") {
      const target = this.partyAvatars.playLocalCommand(this.player.position, normalized);
      this.hud.addLog(target?.player?.name ? this.t("logHighFive", { name, target: target.player.name }) : this.t("logNoHighFive"));
      this.combat.animateHammer();
      return;
    }
    if (normalized === "/sarilma" || normalized === "/sarılma") {
      const target = this.partyAvatars.playLocalCommand(this.player.position, normalized);
      this.hud.addLog(target?.player?.name ? this.t("logHug", { name, target: target.player.name }) : this.t("logNoHug"));
      if (target) this.player.heal(5);
      return;
    }
    if (normalized === "/olumsuzluk" || normalized === "/ölümsüzlük") {
      if (!GAME_CONFIG.development.testCommandsEnabled) {
        this.hud.addLog(this.t("logTestDisabled"));
        return;
      }
      this.player.hp = GAME_CONFIG.player.hp;
      this.hud.addLog(this.t("logTestHealed"));
      return;
    }
    this.hud.addLog(this.t("logUnknownCommand", { command }));
  }

  handleRemoteChatCommand(command, playerId, name) {
    const normalized = normalizeChatCommand(command);
    if (this.partyAvatars.playRemoteCommand(playerId, normalized)) {
      if (normalized === "/dans") this.hud.addLog(this.t("logDance", { name }));
      else if (normalized === "/cak" || normalized === "/çak") this.hud.addLog(this.t("logRemoteCommand", { name, command: "/çak" }));
      else if (normalized === "/sarilma" || normalized === "/sarılma") this.hud.addLog(this.t("logRemoteCommand", { name, command: "/sarılma" }));
      else this.hud.addLog(this.t("logRemoteCommand", { name, command }));
      return;
    }
    this.hud.addLog(this.t("logRemoteCommand", { name, command }));
  }

  difficultyProfile() {
    return GAME_CONFIG.difficulty[this.settings.difficulty] || GAME_CONFIG.difficulty.normal;
  }

  applyDifficultyToCurrentRobots() {
    this.robotManager.applyDifficulty(this.difficultyProfile());
    this.hud.addLog(this.t("logDifficultyApplied", { difficulty: this.difficultyProfile().label }));
  }

  partyLoadout() {
    return {
      weaponId: this.combat.activeWeaponId,
      upgradeLevel: this.combat.upgradeLevel
    };
  }

  partyEquipment() {
    return {
      flashlightOn: this.flashlight.enabled && this.inventory.battery > 0,
      battery: this.inventory.battery
    };
  }

  refreshLocalizedSystems() {
    this.achievements.render();
    this.cosmetics.render();
    this.cosmetics.applySelected();
  }

  t(key, replacements = {}) {
    const translator = this.localization || this.menu;
    return translator?.t ? translator.t(key, replacements) : key;
  }

  weaponLabel() {
    const weapon = this.combat.currentWeapon();
    const key = {
      pistol: "weaponPistol",
      scrapRifle: "weaponScrapRifle",
      ionBlaster: "weaponIonBlaster"
    }[weapon.id];
    const suffix = this.combat.upgradeLevel > 0 ? ` +${this.combat.upgradeLevel}` : "";
    return `${key ? this.t(key) : weapon.label}${suffix}`;
  }

  helperLabel(typeKey) {
    const key = { miner: "helperMiner", fighter: "helperFighter" }[typeKey];
    return key ? this.t(key) : this.crafting.selectedHelperLabel();
  }

  robotLabel(typeKey) {
    const key = {
      normal: "robotNormal",
      fast: "robotFast",
      shield: "robotShield",
      drone: "robotDrone",
      boss: "robotBoss"
    }[typeKey];
    return key ? this.t(key) : "Robot";
  }

  cosmeticLabel() {
    const key = {
      none: "none",
      cap: "cosmeticCap",
      helmet: "cosmeticHelmet",
      armor: "cosmeticArmor",
      robotSkin: "cosmeticRobotSkin"
    }[this.cosmetics.selectedId];
    return key ? this.t(key) : this.cosmetics.selected;
  }

  questText() {
    if (!this.quest.activeId) return this.t("questAllComplete");
    const quest = this.quest.getQuest(this.quest.activeId);
    const labelKey = {
      killRobots: "questKillRobots",
      generator: "questGenerator",
      controlRoom: "questControlRoom"
    }[quest?.id];
    return `${this.quest.progress[this.quest.activeId]}/${quest?.target || 1} ${labelKey ? this.t(labelKey) : quest?.label || ""}`;
  }

  roomName(roomNumber) {
    const id = this.factory.getRoomDefinitionId(roomNumber);
    const key = {
      lab: "roomLab",
      darkStorage: "roomDarkStorage",
      controlWing: "roomControlWing",
      bossBay: "roomBossBay"
    }[id];
    return key ? this.t(key) : this.factory.getRoomName(roomNumber);
  }

  healthPrompt() {
    const key = this.keyLabel("interact");
    if (this.healthStation.charges <= 0) return this.t("healthPromptEmpty", { key });
    if (performance.now() < this.healthStation.cooldownUntil) return this.t("healthPromptPreparing");
    return this.t("healthPromptReady", { key, charges: this.healthStation.charges, max: this.healthStation.maxCharges });
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
