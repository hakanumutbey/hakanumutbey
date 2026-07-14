import { GAME_CONFIG } from "../config.js";

export class CraftingSystem {
  constructor(factory, inventory, combat, helperRobots, hud) {
    this.factory = factory;
    this.inventory = inventory;
    this.combat = combat;
    this.helperRobots = helperRobots;
    this.hud = hud;
    this.scrapOnBench = 0;
    this.robotPartsOnBench = 0;
    this.weaponScrapOnBench = 0;
    this.weaponPartsOnBench = 0;
    this.benchItems = [];
    this.helperTypes = Object.keys(GAME_CONFIG.helperRobots);
    this.selectedHelperType = this.helperTypes[0] || "miner";
    this.translate = null;
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  tryUpgradeWeapon(playerPosition) {
    if (!this.factory.isNearWorkbench(playerPosition)) return false;
    if (!this.inventory.removeScrap(1)) {
      this.hud.addLog(this.t("logNoScrap"));
      return true;
    }

    this.scrapOnBench += 1;
    this.renderBenchItems();
    this.combat.animateHammer();
    this.hud.addLog(this.t("logScrapOnBench", { count: this.scrapOnBench, target: this.upgradeScrapNeeded() }));

    if (this.isWeaponUpgradeReady()) {
      this.scrapOnBench = 0;
      this.renderBenchItems();
      this.combat.upgrade();
    }
    return true;
  }

  upgradeScrapNeeded() {
    return GAME_CONFIG.crafting.scrapPerUpgrade;
  }

  isWeaponUpgradeReady() {
    return this.scrapOnBench >= this.upgradeScrapNeeded();
  }

  tryBuildHelper(playerPosition) {
    if (!this.factory.isNearWorkbench(playerPosition)) return false;
    if (!this.inventory.removeRobotParts(1)) {
      this.hud.addLog(this.t("logNoParts"));
      return true;
    }

    this.robotPartsOnBench += 1;
    this.renderBenchItems();
    this.combat.animateHammer();
    this.hud.addLog(this.t("logPartOnBench", { count: this.robotPartsOnBench, target: this.helperPartsNeeded() }));

    if (this.isHelperBuildReady()) {
      this.robotPartsOnBench = 0;
      this.renderBenchItems();
      const typeKey = this.selectedHelperType;
      this.helperRobots.build(typeKey, this.factory.benchPosition.add(new BABYLON.Vector3(typeKey === "miner" ? -1.8 : 1.8, 0, 1.2)));
    }
    return true;
  }

  helperPartsNeeded() {
    return GAME_CONFIG.crafting.partsPerHelperRobot;
  }

  isHelperBuildReady() {
    return this.robotPartsOnBench >= this.helperPartsNeeded();
  }

  cycleHelperType(playerPosition) {
    if (!this.factory.isNearWorkbench(playerPosition)) return false;
    const currentIndex = Math.max(0, this.helperTypes.indexOf(this.selectedHelperType));
    this.selectedHelperType = this.helperTypes[(currentIndex + 1) % this.helperTypes.length] || this.selectedHelperType;
    this.hud.addLog(this.t("logHelperSelected", { helper: this.selectedHelperText() }));
    return true;
  }

  tryCraftWeapon(playerPosition) {
    if (!this.factory.isNearWorkbench(playerPosition)) return false;

    const weapon = this.combat.nextLockedWeapon();
    if (!weapon) {
      this.hud.addLog(this.t("logAllWeaponsCrafted"));
      return true;
    }

    const recipe = weapon.recipe || { scrap: 0, parts: 0 };
    if (this.weaponPartsOnBench < recipe.parts) {
      if (!this.inventory.removeRobotParts(1)) {
        this.hud.addLog(this.t("logWeaponNeedsParts", { weapon: this.weaponText(weapon) }));
        return true;
      }
      this.weaponPartsOnBench += 1;
      this.renderBenchItems();
      this.combat.animateHammer();
      this.logWeaponProgress(weapon, recipe);
      this.finishWeaponIfReady(weapon, recipe);
      return true;
    }

    if (this.weaponScrapOnBench < recipe.scrap) {
      if (!this.inventory.removeScrap(1)) {
        this.hud.addLog(this.t("logWeaponNeedsScrap", { weapon: this.weaponText(weapon) }));
        return true;
      }
      this.weaponScrapOnBench += 1;
      this.renderBenchItems();
      this.combat.animateHammer();
      this.logWeaponProgress(weapon, recipe);
      this.finishWeaponIfReady(weapon, recipe);
      return true;
    }

    this.finishWeaponIfReady(weapon, recipe);
    return true;
  }

  logWeaponProgress(weapon, recipe) {
    this.hud.addLog(
      this.t("logWeaponBenchProgress", {
        weapon: this.weaponText(weapon),
        parts: this.weaponPartsOnBench,
        partsTarget: recipe.parts,
        scrap: this.weaponScrapOnBench,
        scrapTarget: recipe.scrap
      })
    );
  }

  reclaimBench(playerPosition) {
    if (!this.factory.isNearWorkbench(playerPosition)) return false;

    const before = this.totalItemsOnBench();
    if (before === 0) {
      this.hud.addLog(this.t("logBenchEmpty"));
      return true;
    }

    const returnedScrap = this.returnScrapFromBench();
    const returnedParts = this.returnPartsFromBench();
    this.renderBenchItems();

    const after = this.totalItemsOnBench();
    if (returnedScrap + returnedParts === 0) {
      this.hud.addLog(this.t("logBenchReturnBlocked"));
      return true;
    }

    this.hud.addLog(this.t("logBenchReturned", { scrap: returnedScrap, parts: returnedParts }));
    if (after > 0) this.hud.addLog(this.t("logBenchStillHasItems", { count: after }));
    return true;
  }

  returnScrapFromBench() {
    let returned = 0;
    const upgradeScrap = this.inventory.returnScrap(this.scrapOnBench);
    this.scrapOnBench -= upgradeScrap;
    returned += upgradeScrap;

    const weaponScrap = this.inventory.returnScrap(this.weaponScrapOnBench);
    this.weaponScrapOnBench -= weaponScrap;
    returned += weaponScrap;
    return returned;
  }

  returnPartsFromBench() {
    let returned = 0;
    const helperParts = this.inventory.returnRobotParts(this.robotPartsOnBench);
    this.robotPartsOnBench -= helperParts;
    returned += helperParts;

    const weaponParts = this.inventory.returnRobotParts(this.weaponPartsOnBench);
    this.weaponPartsOnBench -= weaponParts;
    returned += weaponParts;
    return returned;
  }

  totalItemsOnBench() {
    return this.scrapOnBench + this.robotPartsOnBench + this.weaponScrapOnBench + this.weaponPartsOnBench;
  }

  benchStatusText() {
    const sections = [];
    if (this.scrapOnBench > 0) {
      sections.push(this.t("benchStatusUpgrade", {
        count: this.scrapOnBench,
        target: this.upgradeScrapNeeded()
      }));
    }
    if (this.robotPartsOnBench > 0) {
      sections.push(this.t("benchStatusHelper", {
        helper: this.selectedHelperText(),
        count: this.robotPartsOnBench,
        target: this.helperPartsNeeded()
      }));
    }
    if (this.weaponPartsOnBench > 0 || this.weaponScrapOnBench > 0) {
      const weapon = this.combat.nextLockedWeapon();
      const recipe = weapon?.recipe || { scrap: 0, parts: 0 };
      sections.push(this.t("benchStatusWeapon", {
        weapon: weapon ? this.weaponText(weapon) : this.t("benchStatusAllWeapons"),
        parts: this.weaponPartsOnBench,
        partsTarget: recipe.parts,
        scrap: this.weaponScrapOnBench,
        scrapTarget: recipe.scrap
      }));
    }
    return sections.length > 0 ? sections.join(" / ") : this.t("benchStatusEmpty");
  }

  finishWeaponIfReady(weapon, recipe) {
    if (this.weaponPartsOnBench < recipe.parts || this.weaponScrapOnBench < recipe.scrap) return false;
    this.weaponPartsOnBench = 0;
    this.weaponScrapOnBench = 0;
    this.renderBenchItems();
    this.combat.unlockWeapon(weapon.id);
    return true;
  }

  renderBenchItems() {
    this.clearBenchItems();
    const entries = [
      ...Array.from({ length: this.scrapOnBench }, () => "scrap"),
      ...Array.from({ length: this.robotPartsOnBench }, () => "helperPart"),
      ...Array.from({ length: this.weaponPartsOnBench }, () => "weaponPart"),
      ...Array.from({ length: this.weaponScrapOnBench }, () => "weaponScrap")
    ];

    entries.forEach((kind, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const position = this.factory.benchPosition.add(new BABYLON.Vector3(-0.95 + column * 0.34, 0.58, -0.36 + row * 0.24));
      const mesh = kind.includes("Part")
        ? BABYLON.MeshBuilder.CreateBox(`bench_${kind}_${index}`, { width: 0.22, height: 0.12, depth: 0.28 }, this.factory.scene)
        : BABYLON.MeshBuilder.CreatePolyhedron(`bench_${kind}_${index}`, { type: 2, size: 0.18 }, this.factory.scene);
      mesh.position = position;
      mesh.rotation = new BABYLON.Vector3(0.18 * row, 0.35 * column, 0.08 * index);
      mesh.material = kind.includes("Part") ? this.factory.materials.robotPart : this.factory.materials.scrap;
      mesh.isPickable = false;
      mesh.metadata = { kind: "benchCraftingItem" };
      this.benchItems.push(mesh);
    });
  }

  clearBenchItems() {
    for (const mesh of this.benchItems) {
      if (!mesh.isDisposed()) mesh.dispose();
    }
    this.benchItems = [];
  }

  selectedHelperLabel() {
    return GAME_CONFIG.helperRobots[this.selectedHelperType]?.label || "Yardimci robot";
  }

  selectedHelperText() {
    const key = { miner: "helperMiner", fighter: "helperFighter" }[this.selectedHelperType];
    return key ? this.t(key) : this.selectedHelperLabel();
  }

  weaponText(weapon) {
    const key = {
      pistol: "weaponPistol",
      scrapRifle: "weaponScrapRifle",
      ionBlaster: "weaponIonBlaster"
    }[weapon.id];
    return key ? this.t(key) : weapon.label;
  }

  reset() {
    this.scrapOnBench = 0;
    this.robotPartsOnBench = 0;
    this.weaponScrapOnBench = 0;
    this.weaponPartsOnBench = 0;
    this.selectedHelperType = this.helperTypes[0] || "miner";
    this.clearBenchItems();
  }

  serialize() {
    return {
      scrapOnBench: this.scrapOnBench,
      robotPartsOnBench: this.robotPartsOnBench,
      weaponScrapOnBench: this.weaponScrapOnBench,
      weaponPartsOnBench: this.weaponPartsOnBench,
      selectedHelperType: this.selectedHelperType
    };
  }

  load(data = {}) {
    const weapon = this.combat.nextLockedWeapon();
    const recipe = weapon?.recipe || { scrap: 0, parts: 0 };
    this.scrapOnBench = boundedBenchCount(data.scrapOnBench, this.upgradeScrapNeeded() - 1);
    this.robotPartsOnBench = boundedBenchCount(data.robotPartsOnBench, this.helperPartsNeeded() - 1);
    this.weaponScrapOnBench = boundedBenchCount(data.weaponScrapOnBench, recipe.scrap);
    this.weaponPartsOnBench = boundedBenchCount(data.weaponPartsOnBench, recipe.parts);
    if (!weapon) {
      this.weaponScrapOnBench = 0;
      this.weaponPartsOnBench = 0;
    } else if (this.weaponPartsOnBench >= recipe.parts && this.weaponScrapOnBench >= recipe.scrap) {
      this.combat.unlockWeapon(weapon.id, { silent: true });
      this.weaponScrapOnBench = 0;
      this.weaponPartsOnBench = 0;
    }
    if (GAME_CONFIG.helperRobots[data.selectedHelperType]) this.selectedHelperType = data.selectedHelperType;
    this.renderBenchItems();
  }
}

function nonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function boundedBenchCount(value, max) {
  const limit = Math.max(0, Math.floor(Number(max) || 0));
  return Math.min(limit, Math.floor(nonNegativeNumber(value)));
}

function fallbackText(key, replacements) {
  const text = {
    logNoScrap: "Sirt cantanda hurda yok.",
    logNoParts: "Sirt cantanda robot parcasi yok.",
    logScrapOnBench: "Tezgaha hurda koyuldu: {count}/{target}",
    logPartOnBench: "Tezgaha robot parcasi koyuldu: {count}/{target}",
    logHelperSelected: "Yardimci robot secildi: {helper}.",
    logAllWeaponsCrafted: "Tum silahlar uretildi.",
    logWeaponNeedsParts: "{weapon} icin robot parcasi lazim.",
    logWeaponNeedsScrap: "{weapon} icin hurda lazim.",
    logWeaponBenchProgress: "{weapon} tezgahi: parca {parts}/{partsTarget}, hurda {scrap}/{scrapTarget}",
    logBenchEmpty: "Tezgahta geri alinacak malzeme yok.",
    logBenchReturnBlocked: "Sirt cantasi dolu. Tezgahtaki malzemeler kaldi.",
    logBenchReturned: "Tezgahtan geri alindi: {scrap} hurda, {parts} parca.",
    logBenchStillHasItems: "Tezgahta {count} malzeme kaldi.",
    benchStatusEmpty: "Tezgah bos",
    benchStatusUpgrade: "Guc: {count}/{target} hurda",
    benchStatusHelper: "{helper}: {count}/{target} parca",
    benchStatusWeapon: "{weapon}: parca {parts}/{partsTarget}, hurda {scrap}/{scrapTarget}",
    benchStatusAllWeapons: "Tum silahlar"
  }[key] || key;

  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
