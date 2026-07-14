import { GAME_CONFIG } from "../config.js";

export class FlashlightSystem {
  constructor(factory, inventory, hud) {
    this.factory = factory;
    this.inventory = inventory;
    this.hud = hud;
    this.enabled = true;
    this.lowBatteryWarned = false;
    this.translate = null;
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  toggle() {
    if (this.inventory.battery <= 0) {
      const loaded = this.inventory.useBatteryPack(GAME_CONFIG.flashlight.rechargePerBattery);
      if (loaded <= 0) {
        this.enabled = false;
        this.applyLight();
        this.hud.addLog(this.t("logFlashlightBatteryEmpty"));
        return;
      }
      this.lowBatteryWarned = false;
      this.enabled = true;
      this.applyLight();
      this.hud.addLog(this.t("logBatteryAutoLoaded"));
      this.hud.addLog(this.t("logFlashlightOn"));
      return;
    }
    this.enabled = !this.enabled;
    this.applyLight();
    this.hud.addLog(this.enabled ? this.t("logFlashlightOn") : this.t("logFlashlightOff"));
  }

  update(delta, active) {
    if (this.enabled && active) {
      this.inventory.drainBattery((GAME_CONFIG.flashlight.drainPerSecond * delta) / 60);
      if (this.inventory.battery <= 0) {
        const loaded = this.inventory.useBatteryPack(GAME_CONFIG.flashlight.rechargePerBattery);
        this.lowBatteryWarned = false;
        if (loaded > 0) {
          this.enabled = true;
          this.hud.addLog(this.t("logBatteryAutoLoaded"));
        } else {
          this.enabled = false;
          this.hud.addLog(this.t("logFlashlightBatteryEmptyFind"));
        }
      } else if (this.inventory.battery <= 20 && !this.lowBatteryWarned) {
        this.lowBatteryWarned = true;
        this.hud.addLog(this.t("logFlashlightBatteryLow"));
      }
    }

    this.applyLight();
  }

  collectBattery(playerPosition) {
    const collected = this.factory.collectNearbyBattery(
      playerPosition,
      this.inventory,
      GAME_CONFIG.flashlight.rechargePerBattery
    );
    if (collected.count > 0) {
      this.lowBatteryWarned = false;
      if (collected.stored > 0) this.hud.addLog(this.t("logBatteryStored", { count: collected.stored }));
      else this.hud.addLog(this.t("logBatteryFound"));
    }
    return collected.count;
  }

  applyLight() {
    if (!this.enabled || this.inventory.battery <= 0) {
      this.factory.flashlight.intensity = 0;
      return;
    }
    const ratio = Math.max(0, Math.min(1, this.inventory.battery / GAME_CONFIG.player.batteryCapacity));
    const lowBattery = ratio <= 0.2;
    this.factory.flashlight.intensity = lowBattery ? 0.45 + ratio * 2.4 : 1.4;
    this.factory.flashlight.diffuse = lowBattery
      ? new BABYLON.Color3(1, 0.62, 0.32)
      : new BABYLON.Color3(0.92, 0.96, 0.82);
  }

  reset() {
    this.enabled = true;
    this.lowBatteryWarned = false;
    this.applyLight();
  }

  serialize() {
    return {
      enabled: this.enabled,
      lowBatteryWarned: this.lowBatteryWarned
    };
  }

  load(data = {}) {
    this.enabled = data.enabled !== false && this.inventory.battery > 0;
    this.lowBatteryWarned = Boolean(data.lowBatteryWarned);
    this.applyLight();
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    logFlashlightBatteryEmpty: "Fenerin pili bitti.",
    logFlashlightOn: "Fener acildi.",
    logFlashlightOff: "Fener kapandi.",
    logFlashlightBatteryLow: "Fener pili azaldi.",
    logFlashlightBatteryEmptyFind: "Fenerin pili bitti. Yeni pil bul.",
    logBatteryFound: "Fener pili bulundu.",
    logBatteryStored: "Yedek pil cantaya eklendi: {count}.",
    logBatteryAutoLoaded: "Yedek pil takildi."
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
