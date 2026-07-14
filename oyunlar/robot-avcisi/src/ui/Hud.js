export class Hud {
  constructor() {
    this.hp = document.querySelector("#hpText");
    this.room = document.querySelector("#roomText");
    this.scrap = document.querySelector("#scrapText");
    this.robotParts = document.querySelector("#robotPartText");
    this.backpack = document.querySelector("#backpackText");
    this.backpackItems = document.querySelector("#backpackItems");
    this.battery = document.querySelector("#batteryText");
    this.power = document.querySelector("#powerText");
    this.weapon = document.querySelector("#weaponText");
    this.robot = document.querySelector("#robotText");
    this.quest = document.querySelector("#questText");
    this.cosmetic = document.querySelector("#cosmeticText");
    this.stealth = document.querySelector("#stealthText");
    this.cosmeticButtons = document.querySelector("#cosmeticButtons");
    this.achievementList = document.querySelector("#achievementList");
    this.prompt = document.querySelector("#promptText");
    this.log = document.querySelector("#eventLog");
    this.computer = document.querySelector("#computerPanel");
    this.chatLog = document.querySelector("#chatLog");
    this.logLines = [];
  }

  update(stats) {
    this.hp.textContent = String(Math.ceil(stats.hp));
    this.room.textContent = String(stats.room);
    this.scrap.textContent = String(stats.scrap);
    this.robotParts.textContent = String(stats.robotParts);
    this.backpack.textContent = `${stats.backpackUsed}/${stats.capacity}`;
    this.battery.textContent = `${Math.ceil(stats.battery)}%`;
    this.power.textContent = stats.power;
    this.weapon.textContent = stats.weapon;
    this.robot.textContent = String(stats.robots);
    this.quest.textContent = stats.quest;
    this.cosmetic.textContent = stats.cosmetic;
    this.stealth.textContent = stats.stealth;
    this.prompt.textContent = stats.prompt;
    this.renderBackpackItems(stats.inventoryItems || []);
  }

  renderBackpackItems(items) {
    this.backpackItems.replaceChildren();
    for (const item of items) {
      const chip = document.createElement("span");
      chip.className = `inventory-chip ${item.kind || ""}`.trim();
      chip.textContent = `${item.label}: ${item.value}`;
      this.backpackItems.appendChild(chip);
    }
  }

  addLog(text) {
    this.logLines.unshift(text);
    this.logLines = this.logLines.slice(0, 5);
    this.log.innerHTML = this.logLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  }

  openComputer() {
    this.computer.classList.remove("hidden");
    document.exitPointerLock?.();
  }

  closeComputer() {
    this.computer.classList.add("hidden");
  }

  isComputerOpen() {
    return !this.computer.classList.contains("hidden");
  }

  addChatLine(text) {
    const line = document.createElement("p");
    line.textContent = text;
    this.chatLog.appendChild(line);
    while (this.chatLog.children.length > 80) this.chatLog.firstElementChild?.remove();
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  renderCosmetics(items, unlocked, selectedId, onSelect, labels = {}) {
    const lockedText = labels.locked || "kilitli";
    const selectText = labels.select || "sec";
    this.cosmeticButtons.innerHTML = "";
    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.disabled = !unlocked.has(item.id);
      button.className = item.id === selectedId ? "active" : "";
      button.title = button.disabled ? `${item.label} ${lockedText}` : `${item.label} ${selectText}`;
      button.addEventListener("click", () => onSelect(item.id));
      this.cosmeticButtons.appendChild(button);
    }
  }

  renderAchievements(items, labels = {}) {
    const unlockedText = labels.unlocked || "Acildi";
    this.achievementList.innerHTML = "";
    for (const item of items) {
      const row = document.createElement("span");
      row.className = item.unlocked ? "achievement unlocked" : "achievement";
      const progress = Math.min(item.target, item.progress);
      row.textContent = item.unlocked ? `${item.label}: ${unlockedText}` : `${item.label}: ${progress}/${item.target}`;
      this.achievementList.appendChild(row);
    }
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char];
  });
}
