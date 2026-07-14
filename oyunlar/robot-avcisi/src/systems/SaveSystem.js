const SAVE_KEY = "robotAvcisi.save.v1";

export class SaveSystem {
  constructor(game) {
    this.game = game;
    this.lastSaveAt = 0;
    this.intervalMs = 3000;
    this.translate = null;
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  update(time) {
    if (!this.game.started || time - this.lastSaveAt < this.intervalMs) return;
    this.lastSaveAt = time;
    this.save();
  }

  hasSave() {
    return Boolean(localStorage.getItem(SAVE_KEY));
  }

  save() {
    const game = this.game;
    const payload = {
      room: game.room,
      roomCleared: game.roomCleared,
      player: {
        hp: game.player.hp,
        kills: game.player.kills,
        x: game.player.position.x,
        y: game.player.position.y,
        z: game.player.position.z,
        rx: game.player.camera.rotation.x,
        ry: game.player.camera.rotation.y,
        rz: game.player.camera.rotation.z
      },
      inventory: {
        scrap: game.inventory.scrap,
        battery: game.inventory.battery,
        batteryPacks: game.inventory.batteryPacks,
        totalScrapCollected: game.inventory.totalScrapCollected,
        robotParts: game.inventory.robotParts,
        totalRobotPartsCollected: game.inventory.totalRobotPartsCollected
      },
      combat: {
        ...game.combat.serialize(),
        damage: game.combat.damage,
        weaponName: game.combat.weaponName
      },
      crafting: game.crafting.serialize(),
      power: {
        outage: game.power.outage
      },
      alarm: {
        active: game.alarm,
        remainingMs: game.alarm ? Math.max(0, game.alarmUntil - performance.now()) : 0,
        nextReinforcementMs: game.alarm ? Math.max(0, game.nextAlarmReinforcementAt - performance.now()) : 0,
        reinforcementWaves: game.alarmReinforcementWaves
      },
      flashlight: game.flashlight.serialize(),
      security: game.security.serialize(),
      healthStation: game.healthStation.serialize(),
      cosmetic: {
        selectedId: game.cosmetics.selectedId,
        unlocked: [...game.cosmetics.unlocked]
      },
      quest: {
        activeId: game.quest.activeId,
        progress: game.quest.progress,
        completed: [...game.quest.completed]
      },
      achievements: game.achievements.serialize(),
      helperRobots: game.helperRobots.serialize(),
      robots: {
        room: game.robotManager.serializeRoomRobots(),
        alarm: game.robotManager.serializeAlarmRobots()
      },
      pickups: game.factory.serializePickups(),
      savedAt: Date.now()
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      localStorage.removeItem(SAVE_KEY);
      return false;
    }

    const game = this.game;
    game.started = true;
    game.clearAlarmState({ resetShots: true });
    game.room = numberOr(data.room, 1);
    game.roomCleared = Boolean(data.roomCleared);
    game.factory.applyRoomLayout(game.room);
    game.factory.setExitDoorOpen(game.roomCleared);
    if (data.pickups) game.factory.loadPickups(data.pickups);

    game.player.hp = numberOr(data.player?.hp, 100);
    game.player.kills = numberOr(data.player?.kills, 0);
    game.player.camera.position.set(
      numberOr(data.player?.x, 0),
      numberOr(data.player?.y, 1.7),
      numberOr(data.player?.z, -8)
    );
    game.player.camera.rotation.set(
      numberOr(data.player?.rx, game.player.camera.rotation.x),
      numberOr(data.player?.ry, game.player.camera.rotation.y),
      numberOr(data.player?.rz, 0)
    );

    game.inventory.scrap = numberOr(data.inventory?.scrap, 0);
    game.inventory.battery = numberOr(data.inventory?.battery, 100);
    game.inventory.batteryPacks = numberOr(data.inventory?.batteryPacks, 0);
    game.inventory.totalScrapCollected = numberOr(data.inventory?.totalScrapCollected, game.inventory.scrap);
    game.inventory.robotParts = numberOr(data.inventory?.robotParts, 0);
    game.inventory.totalRobotPartsCollected = numberOr(data.inventory?.totalRobotPartsCollected, game.inventory.robotParts);
    game.inventory.clampToCapacity();

    game.combat.load(data.combat || {});
    game.crafting.load(data.crafting || {});

    game.power.outage = false;
    game.factory.setPowerOutage(game.power.outage);
    game.flashlight.load(data.flashlight || {});
    game.healthStation.load(data.healthStation || {});

    if (data.cosmetic) {
      game.cosmetics.load(data.cosmetic.selectedId || data.cosmetic.selected, data.cosmetic.unlocked);
    }

    if (data.quest) {
      const activeId = data.quest.activeId;
      game.quest.activeId = activeId === null || game.quest.getQuest(activeId) ? activeId : game.quest.activeId;
      game.quest.progress = { ...game.quest.progress, ...data.quest.progress };
      game.quest.completed = new Set((Array.isArray(data.quest.completed) ? data.quest.completed : []).filter((id) => game.quest.getQuest(id)));
      game.quest.reconcileProgress();
    }
    game.factory.setGeneratorActive(game.quest.completed.has("generator") || game.quest.progress.generator >= 1);
    game.factory.setControlRoomCaptured(game.quest.completed.has("controlRoom") || game.quest.progress.controlRoom >= 1);

    game.security.load({
      ...(data.security || {}),
      disabled: Boolean(data.security?.disabled || game.quest.completed.has("controlRoom"))
    });

    if (data.achievements) {
      game.achievements.load(data.achievements.deaths, data.achievements.unlocked, data.achievements.stats, data.achievements.roomDeaths);
    }
    game.achievements.stats.kills = Math.max(game.achievements.stats.kills, game.player.kills);
    game.achievements.stats.scrap = Math.max(game.achievements.stats.scrap, game.inventory.totalScrapCollected);
    game.achievements.reconcileUnlocked();
    game.achievements.render();

    game.helperRobots.load(Array.isArray(data.helperRobots) ? data.helperRobots : []);

    game.robotManager.clear();
    if (!game.roomCleared) {
      const savedRoomRobots = data.robots?.room;
      if (Array.isArray(savedRoomRobots)) {
        const loadedRobots = game.robotManager.loadRoomRobots(savedRoomRobots, game.difficultyProfile());
        if (loadedRobots === 0) {
          game.roomCleared = true;
          game.factory.setExitDoorOpen(true);
          game.stopAlarmForClearedRoom();
          game.achievements.onWaveCleared();
        }
      } else {
        game.robotManager.spawnWave(game.room, game.difficultyProfile());
      }
    }
    this.loadAlarmState(data.alarm, data.robots?.alarm);
    game.ensureRoomCleared({ save: false });
    game.hud.addLog(this.t("logSaveLoaded"));
    return true;
  }

  loadAlarmState(data = {}, alarmRobots = []) {
    const game = this.game;
    const now = performance.now();
    const remainingMs = Math.max(0, numberOr(data?.remainingMs, 0));
    const active = Boolean(data?.active && remainingMs > 0 && !game.roomCleared);
    if (!active) {
      game.clearAlarmState();
      return;
    }

    game.activateAlarmState({
      alarmUntil: now + remainingMs,
      nextAlarmReinforcementAt: now + Math.max(0, numberOr(data?.nextReinforcementMs, 0)),
      alarmReinforcementWaves: numberOr(data?.reinforcementWaves, 0)
    });
    game.quest.requireControlRoom();
    if (Array.isArray(alarmRobots)) game.robotManager.loadAlarmRobots(alarmRobots, game.difficultyProfile());
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function fallbackText(key, replacements = {}) {
  const text = {
    logSaveLoaded: "Kayit yuklendi."
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
