import { ACHIEVEMENTS } from "../config.js";

export class AchievementSystem {
  constructor(hud) {
    this.hud = hud;
    this.translate = null;
    this.reset();
  }

  setTranslator(translate) {
    this.translate = translate;
    this.render();
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  reset() {
    this.unlocked = new Set();
    this.deaths = 0;
    this.roomDeaths = 0;
    this.stats = {
      kills: 0,
      scrap: 0,
      noDeathRooms: 0,
      soloBoss: 0
    };
    this.render();
  }

  onDeath() {
    this.deaths += 1;
    this.roomDeaths += 1;
    this.render();
  }

  onRobotKilled(player, robot, options = {}) {
    this.stats.kills = player.kills;
    if (robot.typeKey === "boss" && options.solo) {
      this.stats.soloBoss = 1;
    }
    this.reconcileUnlocked();
    this.render();
  }

  startRoom() {
    this.roomDeaths = 0;
    this.render();
  }

  onScrapCollected(totalScrap) {
    this.stats.scrap = totalScrap;
    this.reconcileUnlocked();
    this.render();
  }

  onWaveCleared() {
    if (this.roomDeaths === 0) {
      this.stats.noDeathRooms += 1;
      this.reconcileUnlocked();
    }
    this.render();
  }

  unlock(id) {
    if (this.unlocked.has(id)) return;
    const achievement = this.get(id);
    if (!achievement) return;
    this.unlocked.add(id);
    this.hud.addLog(this.t("logAchievementUnlocked", { achievement: this.achievementLabel(id) }));
    this.render();
  }

  load(deaths, unlocked, stats = {}, roomDeaths = 0) {
    this.deaths = nonNegativeInteger(deaths);
    this.roomDeaths = nonNegativeInteger(roomDeaths);
    this.unlocked = new Set((Array.isArray(unlocked) ? unlocked : []).map((item) => this.resolveId(item)).filter(Boolean));
    this.stats = {
      kills: nonNegativeInteger(stats.kills),
      scrap: nonNegativeInteger(stats.scrap),
      noDeathRooms: nonNegativeInteger(stats.noDeathRooms),
      soloBoss: nonNegativeInteger(stats.soloBoss)
    };
    this.reconcileUnlocked();
    this.render();
  }

  reconcileUnlocked() {
    if (this.stats.kills >= 100) this.unlock("robot100");
    if (this.stats.scrap >= 1000) this.unlock("scrap1000");
    if (this.stats.noDeathRooms >= 1) this.unlock("noDeathRoom");
    if (this.stats.soloBoss >= 1) this.unlock("soloBoss");
  }

  serialize() {
    return {
      deaths: this.deaths,
      roomDeaths: this.roomDeaths,
      unlocked: [...this.unlocked],
      stats: { ...this.stats }
    };
  }

  render() {
    this.hud.renderAchievements(ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      label: this.achievementLabel(achievement.id),
      progress: this.progressFor(achievement.id),
      unlocked: this.unlocked.has(achievement.id)
    })), { unlocked: this.t("achievementUnlocked") });
  }

  achievementLabel(id) {
    const key = {
      robot100: "achievementRobot100",
      noDeathRoom: "achievementNoDeathRoom",
      scrap1000: "achievementScrap1000",
      soloBoss: "achievementSoloBoss"
    }[id];
    return key ? this.t(key) : this.get(id)?.label || id;
  }

  progressFor(id) {
    if (id === "robot100") return this.stats.kills;
    if (id === "scrap1000") return this.stats.scrap;
    if (id === "noDeathRoom") return this.stats.noDeathRooms;
    if (id === "soloBoss") return this.stats.soloBoss;
    return 0;
  }

  get(id) {
    return ACHIEVEMENTS.find((achievement) => achievement.id === id);
  }

  resolveId(value) {
    if (this.get(value)) return value;
    return ACHIEVEMENTS.find((achievement) => achievement.label === value)?.id;
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    achievementRobot100: "100 robot yok et",
    achievementNoDeathRoom: "Hic olmeden bolumu bitir",
    achievementScrap1000: "1000 hurda topla",
    achievementSoloBoss: "Boss'u tek basina yen",
    achievementUnlocked: "Acildi",
    logAchievementUnlocked: "Basarim acildi: {achievement}"
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}
