import { normalizePartyUpgradeLevel, normalizePartyWeaponId } from "../utils/partyLoadout.js";
import {
  normalizePartyBattery,
  normalizePartyFlashlight,
  normalizePartyHp,
  normalizePartyRoom,
  normalizePartyX,
  normalizePartyY,
  normalizePartyYaw,
  normalizePartyZ
} from "../utils/partyState.js";

export class PartyClient {
  constructor(player, hud, onCommand = () => {}, getRoom = () => 1, getLoadout = () => ({}), getEquipment = () => ({}), onRemoteCommand = () => {}) {
    this.player = player;
    this.hud = hud;
    this.onCommand = onCommand;
    this.getRoom = getRoom;
    this.getLoadout = getLoadout;
    this.getEquipment = getEquipment;
    this.onRemoteCommand = onRemoteCommand;
    this.ws = null;
    this.code = "";
    this.isOwner = false;
    this.ready = false;
    this.started = false;
    this.otherPlayers = new Map();
    this.players = [];
    this.ownerId = "";
    this.lastSend = 0;
    this.voice = null;
    this.autoVoiceRequested = false;
    this.voiceLabelOff = "Ses";
    this.voiceLabelOn = "Ses acik";
    this.disconnectStatus = "";
    this.translate = null;
    this.messageHandlers = {
      error: (message) => this.handleError(message),
      kicked: () => this.handleKicked(),
      party: (message) => this.handleParty(message),
      "voice-signal": (message) => this.voice?.handleSignal(message.from, message.signal),
      chat: (message) => this.handleChat(message)
    };

    this.ui = {
      name: document.querySelector("#nameInput"),
      code: document.querySelector("#partyCodeInput"),
      create: document.querySelector("#createPartyBtn"),
      join: document.querySelector("#joinPartyBtn"),
      ready: document.querySelector("#readyBtn"),
      start: document.querySelector("#startPartyBtn"),
      leave: document.querySelector("#leavePartyBtn"),
      voice: document.querySelector("#voiceBtn"),
      status: document.querySelector("#partyStatus"),
      players: document.querySelector("#playersList"),
      close: document.querySelector("#closeComputerBtn"),
      chatForm: document.querySelector("#chatForm"),
      chatInput: document.querySelector("#chatInput"),
      chatSubmit: document.querySelector("#chatForm button")
    };

    this.bindUi();
    this.renderVoiceButton(false);
    this.render();
  }

  setTranslator(translate) {
    this.translate = translate;
    this.render(this.players, this.ownerId);
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  bindUi() {
    this.ui.create.addEventListener("click", () => this.connect("create"));
    this.ui.join.addEventListener("click", () => this.connect("join"));
    this.ui.ready.addEventListener("click", () => this.send({ type: "ready", ready: !this.ready }));
    this.ui.start.addEventListener("click", () => this.send({ type: "start" }));
    this.ui.leave.addEventListener("click", () => this.disconnect());
    this.ui.voice.addEventListener("click", () => this.toggleVoice());
    this.ui.close.addEventListener("click", () => this.hud.closeComputer());
    this.ui.chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!this.code || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.ui.status.textContent = this.t("partyChatNeedsParty");
        return;
      }
      const text = this.ui.chatInput.value.trim();
      if (!text) return;
      if (text.startsWith("/")) this.onCommand(text, this.ui.name.value.trim() || "Oyuncu");
      this.send({ type: "chat", text });
      this.ui.chatInput.value = "";
    });
  }

  connect(action) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.disconnectStatus = "";
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(`${protocol}://${location.host}/party`);
    this.ui.status.textContent = this.t("partyConnecting");

    this.ws.addEventListener("open", () => {
      this.playerName = this.ui.name.value.trim() || "Oyuncu";
      this.ws.send(JSON.stringify({
        type: action,
        code: this.ui.code.value.trim(),
        player: this.currentPlayerState()
      }));
    });

    this.ws.addEventListener("message", (event) => this.handleMessage(event.data));

    this.ws.addEventListener("close", () => {
      if (this.voice?.enabled) this.voice.stop();
      this.ws = null;
      this.code = "";
      this.ready = false;
      this.started = false;
      this.isOwner = false;
      this.otherPlayers.clear();
      this.players = [];
      this.ownerId = "";
      this.voice?.syncPeers();
      this.render();
    });
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      this.handleError({ code: "invalidMessage" });
      return;
    }

    const handler = message && typeof message === "object" ? this.messageHandlers[message.type] : null;
    if (!handler) {
      this.handleError({ code: "unknownMessage" });
      return;
    }
    handler(message);
  }

  handleError(message) {
    this.disconnectStatus = this.errorText(message);
    this.ui.status.textContent = this.disconnectStatus;
    if (this.shouldDisconnectOnError(message)) this.disconnect();
    else this.hud.addLog(this.disconnectStatus);
  }

  handleKicked() {
    this.disconnectStatus = this.t("partyKicked");
    this.ui.status.textContent = this.disconnectStatus;
    this.hud.addLog(this.disconnectStatus);
    this.disconnect();
  }

  handleChat(message) {
    const name = message.name || "Oyuncu";
    const text = typeof message.text === "string" ? message.text : "";
    if (!text) return;
    this.hud.addChatLine(`${name}: ${text}`);
    if (text.startsWith("/")) {
      this.hud.addLog(this.t("partyCommandUsed", { name, command: text }));
      if (message.from && message.from !== this.playerId()) this.onRemoteCommand(text, message.from, name);
    }
  }

  handleParty(message) {
    const wasStarted = this.started;
    this.code = message.code;
    this.players = Array.isArray(message.players) ? message.players : [];
    this.ownerId = message.ownerId || "";
    this.isOwner = message.ownerId === this.playerId();
    this.started = Boolean(message.started);
    const self = message.players.find((item) => item.id === this.playerId());
    this.ready = Boolean(self?.ready);
    this.ui.code.value = message.code;
    this.otherPlayers.clear();
    for (const item of this.players) {
      if (item.id !== this.playerId()) this.otherPlayers.set(item.id, item);
    }
    this.voice?.syncPeers();
    if (this.started && !wasStarted) this.hud.addLog(this.t("partyGameStarted"));
    this.maybeAutoVoice();
    this.render(this.players, this.ownerId);
  }

  update(time) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.code || time - this.lastSend < 100) return;
    this.lastSend = time;
    this.send({ type: "state", player: this.currentPlayerState() });
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  disconnect() {
    if (!this.disconnectStatus) this.disconnectStatus = this.t("serverOffline");
    if (this.ws) this.ws.close();
  }

  currentPlayerState() {
    const loadout = this.currentLoadout();
    const equipment = this.currentEquipment();
    return {
      id: this.playerId(),
      name: this.ui.name.value.trim() || "Oyuncu",
      x: normalizePartyX(this.player.position.x),
      y: normalizePartyY(this.player.position.y),
      z: normalizePartyZ(this.player.position.z),
      yaw: normalizePartyYaw(this.playerYaw()),
      room: this.currentRoom(),
      hp: normalizePartyHp(this.player.hp),
      cosmeticId: this.player.cosmeticId || "none",
      sneaking: Boolean(this.player.isSneaking),
      weaponId: loadout.weaponId,
      upgradeLevel: loadout.upgradeLevel,
      flashlightOn: equipment.flashlightOn,
      battery: equipment.battery
    };
  }

  currentEquipment() {
    const equipment = this.getEquipment() || {};
    const battery = normalizePartyBattery(equipment.battery, 0);
    return {
      flashlightOn: normalizePartyFlashlight(equipment.flashlightOn, battery),
      battery
    };
  }

  currentLoadout() {
    const loadout = this.getLoadout() || {};
    const weaponId = normalizePartyWeaponId(loadout.weaponId);
    const upgradeLevel = normalizePartyUpgradeLevel(loadout.upgradeLevel);
    return { weaponId, upgradeLevel };
  }

  playerYaw() {
    const direction = this.player.camera.getForwardRay(1).direction;
    return Math.atan2(direction.x, direction.z);
  }

  currentRoom() {
    return normalizePartyRoom(this.getRoom());
  }

  playerId() {
    if (!this.id) this.id = crypto.randomUUID();
    return this.id;
  }

  attachVoice(voice) {
    this.voice = voice;
  }

  playerCount() {
    return this.code ? this.otherPlayers.size + 1 : 1;
  }

  isSolo() {
    return this.playerCount() === 1;
  }

  async toggleVoice() {
    if (!this.voice || !this.code || !this.ws) {
      this.ui.status.textContent = this.t("partyVoiceNeedsParty");
      return;
    }
    const enabled = await this.voice.toggle();
    this.setVoiceButton(enabled);
  }

  async maybeAutoVoice() {
    if (!this.voice || !this.voice.settings.autoVoice || this.voice.enabled || this.autoVoiceRequested) return;
    this.autoVoiceRequested = true;
    const enabled = await this.voice.ensureEnabled();
    this.setVoiceButton(enabled);
    this.autoVoiceRequested = false;
  }

  setVoiceButton(enabled = Boolean(this.voice?.enabled)) {
    this.renderVoiceButton(enabled);
  }

  setVoiceLabels(offLabel = "Ses", onLabel = "Ses acik") {
    this.voiceLabelOff = offLabel;
    this.voiceLabelOn = onLabel;
    this.renderVoiceButton(Boolean(this.voice?.enabled));
  }

  errorText(message) {
    const key = {
      invalidMessage: "partyErrorInvalidMessage",
      partyLimit: "partyErrorLimit",
      partyNotFound: "partyErrorNotFound",
      partyAlreadyStarted: "partyErrorStarted",
      partyFull: "partyErrorFull",
      notEveryoneReady: "partyErrorNotReady",
      unknownMessage: "partyErrorUnknown"
    }[message?.code];
    return key ? this.t(key) : message?.message || this.t("partyErrorUnknown");
  }

  shouldDisconnectOnError(message) {
    return !["invalidMessage", "unknownMessage", "notEveryoneReady"].includes(message?.code);
  }

  renderVoiceButton(enabled) {
    const icon = this.ui.voice.querySelector(".voice-icon") || document.createElement("span");
    icon.className = "voice-icon";
    icon.setAttribute("aria-hidden", "true");
    this.ui.voice.replaceChildren(icon, document.createTextNode(` ${enabled ? this.voiceLabelOn : this.voiceLabelOff}`));
    this.ui.voice.setAttribute("aria-pressed", enabled ? "true" : "false");
    this.ui.voice.title = enabled ? this.voiceLabelOn : this.voiceLabelOff;
  }

  render(players = this.players, ownerId = this.ownerId) {
    const connected = Boolean(this.code && this.ws);
    const canOwnerStart = this.isOwner && !this.started && players.length > 0 && players.every((item) => item.ready);
    this.ui.create.disabled = connected;
    this.ui.join.disabled = connected;
    this.ui.leave.disabled = !connected;
    this.ui.ready.disabled = !connected || this.started;
    this.ui.start.disabled = !connected || !canOwnerStart;
    this.ui.name.disabled = connected;
    this.ui.code.disabled = connected;
    this.ui.voice.disabled = !connected;
    this.ui.chatInput.disabled = !connected;
    this.ui.chatSubmit.disabled = !connected;
    this.ui.ready.textContent = this.ready ? this.t("partyNotReadyButton") : this.t("ready");
    if (connected) {
      const readyCount = players.filter((player) => player.ready).length;
      this.ui.status.textContent = this.t("partyStatusReadyCount", {
        code: this.code,
        ready: readyCount,
        total: players.length
      });
    }
    if (!connected) this.ui.status.textContent = this.disconnectStatus || this.t("serverOffline");

    this.ui.players.innerHTML = "";
    for (const player of players) {
      const row = document.createElement("div");
      row.className = "player-row";
      const label = document.createElement("span");
      const owner = player.id === ownerId ? ` ${this.t("partyOwnerBadge")}` : "";
      const ready = player.ready ? ` ${this.t("partyReadyBadge")}` : ` ${this.t("partyWaitingBadge")}`;
      const room = normalizePartyRoom(player.room);
      const hp = normalizePartyHp(player.hp);
      label.innerHTML = `${escapeHtml(player.name)} <span class="badge">${owner} ${ready} ${this.t("partyRoomBadge", { room })} ${this.t("partyHpBadge", { hp })}</span>`;
      row.appendChild(label);
      if (this.isOwner && player.id !== this.playerId()) {
        const kick = document.createElement("button");
        kick.type = "button";
        kick.textContent = this.t("partyKick");
        kick.addEventListener("click", () => this.send({ type: "kick", playerId: player.id }));
        row.appendChild(kick);
      }
      this.ui.players.appendChild(row);
    }
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    ready: "Hazirim",
    serverOffline: "Sunucuya bagli degil.",
    partyConnecting: "Baglaniyor...",
    partyKicked: "Partiden atildin.",
    partyCommandUsed: "{name} komut kullandi: {command}",
    partyGameStarted: "Parti oyunu basladi.",
    partyNotReadyButton: "Hazir degilim",
    partyStatusConnected: "{code} kodlu parti",
    partyStatusReadyCount: "{code} kodlu parti - hazir {ready}/{total}",
    partyOwnerBadge: "kurucu",
    partyReadyBadge: "hazir",
    partyWaitingBadge: "bekliyor",
    partyRoomBadge: "oda {room}",
    partyHpBadge: "can {hp}",
    partyKick: "At",
    partyVoiceNeedsParty: "Sesli sohbet icin once partiye katil.",
    partyChatNeedsParty: "Sohbet icin once partiye katil.",
    partyErrorInvalidMessage: "Mesaj bozuk geldi.",
    partyErrorLimit: "En fazla 3 parti olabilir.",
    partyErrorNotFound: "Bu kodda parti yok.",
    partyErrorStarted: "Bu parti basladi.",
    partyErrorFull: "Bu parti dolu. En fazla 5 oyuncu olabilir.",
    partyErrorNotReady: "Baslatmak icin herkes hazir olmali.",
    partyErrorUnknown: "Parti hatasi."
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char];
  });
}
