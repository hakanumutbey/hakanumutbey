import { GAME_CONFIG } from "../config.js";

export class HealthStationSystem {
  constructor(factory, hud) {
    this.factory = factory;
    this.hud = hud;
    this.maxCharges = GAME_CONFIG.healthStation.maxCharges;
    this.healAmount = GAME_CONFIG.healthStation.healAmount;
    this.cooldownUntil = 0;
    this.nextRechargeAt = 0;
    this.charges = this.maxCharges;
    this.translate = (key, replacements = {}) => fallbackText(key, replacements);
    this.updateVisual();
  }

  setTranslator(translate) {
    if (typeof translate === "function") this.translate = translate;
  }

  update(time) {
    if (this.charges < this.maxCharges && !this.nextRechargeAt) {
      this.nextRechargeAt = time + GAME_CONFIG.healthStation.rechargeMs;
    }
    if (this.charges < this.maxCharges && time >= this.nextRechargeAt) {
      this.charges += 1;
      this.nextRechargeAt = this.charges < this.maxCharges ? time + GAME_CONFIG.healthStation.rechargeMs : 0;
      this.hud.addLog(this.t("logHealthRecharged", { charges: this.charges, max: this.maxCharges }));
    }
    this.updateVisual(time);
  }

  tryUse(player, time = performance.now()) {
    if (player.hp >= GAME_CONFIG.player.hp) {
      this.hud.addLog(this.t("logHealthFull"));
      return false;
    }
    if (this.charges <= 0) {
      this.hud.addLog(this.t("logHealthCharging"));
      return false;
    }
    if (time < this.cooldownUntil) {
      this.hud.addLog(this.t("logHealthPreparing"));
      return false;
    }

    const before = player.hp;
    player.heal(this.healAmount);
    const healedAmount = Math.ceil(player.hp - before);
    this.charges -= 1;
    this.cooldownUntil = time + GAME_CONFIG.healthStation.useCooldownMs;
    if (this.charges < this.maxCharges && !this.nextRechargeAt) {
      this.nextRechargeAt = time + GAME_CONFIG.healthStation.rechargeMs;
    }
    this.showHealPulse(healedAmount);
    this.hud.addLog(this.t("logHealthUsed", { amount: healedAmount }));
    this.updateVisual(time);
    return true;
  }

  showHealPulse(amount) {
    if (amount <= 0) return;
    const scene = this.factory.scene;
    const center = this.factory.healthPosition.add(new BABYLON.Vector3(0, 0.95, -0.42));
    const ring = BABYLON.MeshBuilder.CreateTorus(`healthPulseRing_${Date.now()}`, { diameter: 1.05, thickness: 0.045, tessellation: 28 }, scene);
    ring.position = center;
    ring.rotation.x = Math.PI / 2;
    ring.material = this.factory.materials.health;
    ring.isPickable = false;

    const core = BABYLON.MeshBuilder.CreateSphere(`healthPulseCore_${Date.now()}`, { diameter: 0.22, segments: 12 }, scene);
    core.position = center;
    core.material = this.factory.materials.health;
    core.isPickable = false;

    const startedAt = performance.now();
    const observer = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / 420);
      const scale = 1 + progress * 0.9;
      ring.scaling.set(scale, scale, scale);
      core.scaling.set(1 - progress * 0.55, 1 - progress * 0.55, 1 - progress * 0.55);
      if (progress >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        if (!ring.isDisposed()) ring.dispose();
        if (!core.isDisposed()) core.dispose();
      }
    });
  }

  reset() {
    this.charges = this.maxCharges;
    this.cooldownUntil = 0;
    this.nextRechargeAt = 0;
    this.updateVisual();
  }

  serialize(time = performance.now()) {
    return {
      charges: this.charges,
      cooldownRemainingMs: Math.max(0, this.cooldownUntil - time),
      rechargeRemainingMs: this.nextRechargeAt ? Math.max(0, this.nextRechargeAt - time) : 0
    };
  }

  load(data = {}, time = performance.now()) {
    const charges = Number(data.charges);
    this.charges = Number.isFinite(charges) ? Math.max(0, Math.min(this.maxCharges, Math.round(charges))) : this.maxCharges;
    const cooldownRemaining = Math.max(0, Number(data.cooldownRemainingMs) || 0);
    const rechargeRemaining = Math.max(0, Number(data.rechargeRemainingMs) || 0);
    this.cooldownUntil = cooldownRemaining ? time + cooldownRemaining : 0;
    this.nextRechargeAt = this.charges < this.maxCharges ? time + (rechargeRemaining || GAME_CONFIG.healthStation.rechargeMs) : 0;
    this.updateVisual(time);
  }

  promptText(time = performance.now()) {
    if (this.charges <= 0) return this.t("healthPromptEmpty", { key: "E" });
    if (time < this.cooldownUntil) return this.t("healthPromptPreparing");
    return this.t("healthPromptReady", { key: "E", charges: this.charges, max: this.maxCharges });
  }

  updateVisual(time = performance.now()) {
    const ready = this.charges > 0 && time >= this.cooldownUntil;
    const cooldownProgress = this.cooldownUntil > time ? 0.45 : 1;
    this.factory.setHealthStationState({
      charges: this.charges,
      maxCharges: this.maxCharges,
      ready,
      cooldownProgress
    });
  }

  t(key, replacements = {}) {
    return this.translate(key, replacements);
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    logHealthRecharged: "Can istasyonu sarj oldu: {charges}/{max}.",
    logHealthFull: "Canin zaten dolu.",
    logHealthCharging: "Can istasyonu sarj bekliyor.",
    logHealthPreparing: "Can istasyonu tekrar hazirlaniyor.",
    logHealthUsed: "Can istasyonu kullanildi: +{amount} can.",
    healthPromptEmpty: "{key}: can istasyonu sarj bekliyor",
    healthPromptPreparing: "Can istasyonu hazirlaniyor",
    healthPromptReady: "{key}: can istasyonunu kullan ({charges}/{max})"
  }[key] || key;
  return String(text).replace(/\{(\w+)\}/g, (_, name) => replacements[name] ?? "");
}
