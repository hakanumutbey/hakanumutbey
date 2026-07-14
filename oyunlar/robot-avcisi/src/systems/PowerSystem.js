import { GAME_CONFIG } from "../config.js";

export class PowerSystem {
  constructor(factory, hud, audio) {
    this.factory = factory;
    this.hud = hud;
    this.audio = audio;
    this.outage = false;
    this.nextOutageAt = performance.now() + GAME_CONFIG.power.firstOutageMs;
    this.translate = null;
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  update(time, active) {
    this.outage = false;
    this.factory.setPowerOutage(false);
  }

  triggerOutage() {
    this.outage = false;
    this.factory.setPowerOutage(false);
    this.hud.addLog(this.t("logPowerStable"));
  }

  restore() {
    if (!this.outage) {
      this.factory.setPowerOutage(false);
      this.hud.addLog(this.t("logGeneratorChecked"));
      return true;
    }
    this.outage = false;
    this.nextOutageAt = performance.now() + GAME_CONFIG.power.outageEveryMs;
    this.factory.setPowerOutage(false);
    this.hud.addLog(this.t("logGeneratorRestored"));
    this.audio?.playPowerUp();
    return true;
  }

  robotSpeedMultiplier() {
    return 1;
  }

  label() {
    return this.t("powerOn");
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    logPowerStable: "Elektrik sistemi sabit. Kesinti yok.",
    logGeneratorChecked: "Jenerator kontrol edildi. Elektrik acik.",
    logGeneratorRestored: "Jenerator calisti. Elektrik geri geldi.",
    powerOn: "Acik"
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
