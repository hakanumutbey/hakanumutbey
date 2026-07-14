import { GAME_CONFIG } from "../config.js";

export class CosmeticSystem {
  constructor(hud, player) {
    this.hud = hud;
    this.player = player;
    this.translate = null;
    this.reset();
  }

  setTranslator(translate) {
    this.translate = translate;
    this.render();
    this.applySelected();
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  reset() {
    this.items = GAME_CONFIG.cosmetics.items;
    this.selectedId = this.items.find((item) => item.unlock.type === "starter")?.id || "none";
    this.unlocked = new Set(this.items.filter((item) => item.unlock.type === "starter").map((item) => item.id));
    this.applySelected();
    this.render();
  }

  update(playerKills) {
    for (const item of this.items) {
      if (item.unlock.type !== "kills" || playerKills < item.unlock.value || this.unlocked.has(item.id)) continue;
      this.unlocked.add(item.id);
      this.select(item.id);
      this.hud.addLog(this.t("logCosmeticUnlocked", { cosmetic: this.cosmeticLabel(item.id) }));
    }
    this.render();
  }

  select(id) {
    if (!this.unlocked.has(id)) return false;
    this.selectedId = id;
    this.applySelected();
    this.render();
    return true;
  }

  applySelected() {
    const item = this.selectedItem();
    this.selected = this.cosmeticLabel(item?.id || "none");
    this.player.applyCosmetic(item);
    this.hud.cosmetic.textContent = this.selected;
  }

  render() {
    const items = this.items.map((item) => ({ ...item, label: this.cosmeticLabel(item.id) }));
    this.hud.renderCosmetics(items, this.unlocked, this.selectedId, (id) => this.select(id), {
      locked: this.t("cosmeticLocked"),
      select: this.t("cosmeticSelect")
    });
  }

  cosmeticLabel(id) {
    const key = {
      none: "none",
      cap: "cosmeticCap",
      helmet: "cosmeticHelmet",
      armor: "cosmeticArmor",
      robotSkin: "cosmeticRobotSkin"
    }[id];
    const item = this.items.find((entry) => entry.id === id);
    return key ? this.t(key) : item?.label || GAME_CONFIG.cosmetics.starter;
  }

  selectedItem() {
    return this.items.find((item) => item.id === this.selectedId) || this.items[0];
  }

  load(selected, unlocked) {
    this.items = GAME_CONFIG.cosmetics.items;
    this.unlocked = new Set((Array.isArray(unlocked) ? unlocked : ["none"]).map((item) => this.resolveId(item)));
    this.unlocked.add("none");
    const selectedId = this.resolveId(selected);
    this.selectedId = this.unlocked.has(selectedId) ? selectedId : "none";
    this.applySelected();
    this.render();
  }

  resolveId(value) {
    if (this.items.some((item) => item.id === value)) return value;
    return this.items.find((item) => item.label === value)?.id || "none";
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    none: "Yok",
    cosmeticCap: "Hurda Sapkasi",
    cosmeticHelmet: "Robot Kaski",
    cosmeticArmor: "Robot Kostumu",
    cosmeticRobotSkin: "Neon Robot Gorunumu",
    cosmeticLocked: "kilitli",
    cosmeticSelect: "sec",
    logCosmeticUnlocked: "{cosmetic} kozmetigi acildi."
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
