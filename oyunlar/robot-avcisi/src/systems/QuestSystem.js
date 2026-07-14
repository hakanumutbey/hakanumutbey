import { QUESTS } from "../config.js";

export class QuestSystem {
  constructor(hud) {
    this.hud = hud;
    this.translate = null;
    this.reset();
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  reset() {
    this.activeId = QUESTS.killRobots.id;
    this.progress = {
      [QUESTS.killRobots.id]: 0,
      [QUESTS.generator.id]: 0,
      [QUESTS.controlRoom.id]: 0
    };
    this.completed = new Set();
  }

  onRobotKilled() {
    this.progress.killRobots += 1;
    this.reconcileProgress();
  }

  onGeneratorStarted() {
    this.progress.generator = 1;
    this.reconcileProgress();
  }

  onControlRoomCaptured() {
    this.progress.controlRoom = 1;
    this.reconcileProgress();
  }

  requireGenerator() {
    if (!this.completed.has(QUESTS.generator.id)) this.activeId = QUESTS.generator.id;
  }

  requireControlRoom() {
    if (!this.completed.has(QUESTS.controlRoom.id)) this.activeId = QUESTS.controlRoom.id;
  }

  complete(id) {
    if (this.completed.has(id)) return;
    this.completed.add(id);
    this.hud.addLog(this.t("logQuestCompleted", { quest: this.questLabel(id) }));
    if (id === QUESTS.killRobots.id) this.activeId = QUESTS.generator.id;
    if (id === QUESTS.generator.id) this.activeId = QUESTS.controlRoom.id;
    if (id === QUESTS.controlRoom.id) this.activeId = null;
  }

  reconcileProgress() {
    this.normalizeProgress();
    if (this.activeId && this.completed.has(this.activeId)) this.activeId = this.nextIncompleteQuestId();
    if (!this.activeId) this.activeId = this.nextIncompleteQuestId();

    let guard = 0;
    while (this.activeId && this.isTargetReached(this.activeId) && guard < 4) {
      this.complete(this.activeId);
      if (this.activeId && this.completed.has(this.activeId)) this.activeId = this.nextIncompleteQuestId();
      guard += 1;
    }
  }

  normalizeProgress() {
    for (const quest of this.questSequence()) {
      const value = Number(this.progress[quest.id]);
      this.progress[quest.id] = Number.isFinite(value) ? Math.max(0, value) : 0;
    }
  }

  isTargetReached(id) {
    const quest = this.getQuest(id);
    return Boolean(quest && this.progress[id] >= quest.target);
  }

  nextIncompleteQuestId() {
    return this.questSequence().find((quest) => !this.completed.has(quest.id))?.id || null;
  }

  questSequence() {
    return [QUESTS.killRobots, QUESTS.generator, QUESTS.controlRoom];
  }

  currentText() {
    if (!this.activeId) return this.t("questAllComplete");
    const quest = this.getQuest(this.activeId);
    return `${this.progress[this.activeId]}/${quest.target} ${this.questLabel(this.activeId)}`;
  }

  getQuest(id) {
    return Object.values(QUESTS).find((quest) => quest.id === id);
  }

  questLabel(id) {
    const key = {
      killRobots: "questKillRobots",
      generator: "questGenerator",
      controlRoom: "questControlRoom"
    }[id];
    return key ? this.t(key) : this.getQuest(id)?.label || id;
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    questKillRobots: "5 robotu yok et",
    questGenerator: "Jeneratoru calistir",
    questControlRoom: "Kontrol odasini ele gecir",
    questAllComplete: "Tum gorevler tamamlandi",
    logQuestCompleted: "Gorev tamamlandi: {quest}"
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}
