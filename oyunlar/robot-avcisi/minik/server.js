const http = require("http");
const path = require("path");
const fs = require("fs");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(__dirname, "..");
const PARTY_LIMITS = loadSharedJson("partyLimits.json");
const PARTY_LOADOUT = loadSharedJson("partyLoadout.json");
const PARTY_STATE_LIMITS = loadSharedJson("partyStateLimits.json");
const MAX_PARTIES = Number(PARTY_LIMITS.maxParties) || 3;
const MAX_PLAYERS_PER_PARTY = Number(PARTY_LIMITS.maxPlayersPerParty) || 5;
const ALLOWED_COSMETIC_IDS = nonEmptyStringArray(PARTY_LOADOUT.cosmetics, ["none"]);
const ALLOWED_WEAPON_IDS = nonEmptyStringArray(PARTY_LOADOUT.weapons, ["pistol"]);
const DEFAULT_COSMETIC_ID = ALLOWED_COSMETIC_IDS[0];
const DEFAULT_WEAPON_ID = ALLOWED_WEAPON_IDS[0];
const ALLOWED_COSMETICS = new Set(ALLOWED_COSMETIC_IDS);
const ALLOWED_WEAPONS = new Set(ALLOWED_WEAPON_IDS);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const parties = new Map();

const server = http.createServer((req, res) => {
  const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
  const requested = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const filePath = path.normalize(path.join(ROOT, requested));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Yasak");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Bulunamadi");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: "/party" });
const partyMessageHandlers = {
  create: (socket, message) => createParty(socket, message),
  join: (socket, message) => joinParty(socket, message),
  ready: (socket, message) => setReady(socket, message.ready),
  start: (socket) => startParty(socket),
  kick: (socket, message) => kickPlayer(socket, message.playerId),
  chat: (socket, message) => sendChat(socket, message.text),
  "voice-signal": (socket, message) => relayVoiceSignal(socket, message),
  state: (socket, message) => updatePlayer(socket, message.player)
};

wss.on("connection", (socket) => {
  socket.player = null;
  socket.partyCode = null;

  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendError(socket, "Mesaj bozuk geldi.", "invalidMessage");
      return;
    }

    const handler = message && typeof message === "object" ? partyMessageHandlers[message.type] : null;
    if (!handler) {
      sendError(socket, "Bilinmeyen parti mesaji.", "unknownMessage");
      return;
    }
    handler(socket, message);
  });

  socket.on("close", () => {
    leaveParty(socket);
  });
});

function createParty(socket, message) {
  const currentParty = socket.partyCode ? parties.get(socket.partyCode) : null;
  const freesPartySlot = currentParty && currentParty.players.size === 1;
  if (parties.size >= MAX_PARTIES && !freesPartySlot) {
    sendError(socket, `En fazla ${MAX_PARTIES} parti olabilir.`, "partyLimit");
    return;
  }

  const code = createPartyCode();
  const party = {
    code,
    ownerId: null,
    started: false,
    players: new Map()
  };
  parties.set(code, party);
  addPlayerToParty(socket, party, message.player || {}, true);
}

function joinParty(socket, message) {
  const code = safeName(message.code, "").toUpperCase();
  const player = message.player || {};
  const playerId = safeId(player.id);
  const party = parties.get(code);

  if (!party) {
    sendError(socket, "Bu kodda parti yok.", "partyNotFound");
    return;
  }

  if (party.started) {
    sendError(socket, "Bu parti basladi.", "partyAlreadyStarted");
    return;
  }

  if (!party.players.has(playerId) && party.players.size >= MAX_PLAYERS_PER_PARTY) {
    sendError(socket, `Bu parti dolu. En fazla ${MAX_PLAYERS_PER_PARTY} oyuncu olabilir.`, "partyFull");
    return;
  }

  addPlayerToParty(socket, party, player, false);
}

function addPlayerToParty(socket, party, player, isOwner) {
  const playerId = safeId(player.id);
  leaveParty(socket);
  removeDuplicatePlayerConnection(party, playerId, socket);
  socket.partyCode = party.code;
  socket.player = sanitizePlayerState(player, {
    id: playerId,
    ready: false
  });
  if (isOwner || !party.ownerId) party.ownerId = socket.player.id;
  party.players.set(socket.player.id, socket);
  broadcastParty(party.code);
}

function removeDuplicatePlayerConnection(party, playerId, currentSocket) {
  const existing = party.players.get(playerId);
  if (!existing || existing === currentSocket) return;
  existing.partyCode = null;
  existing.player = null;
  if (existing.readyState === existing.OPEN) existing.close();
  party.players.delete(playerId);
}

function updatePlayer(socket, player) {
  if (!socket.partyCode || !socket.player || !player) return;
  socket.player = sanitizePlayerState(player, socket.player);
  broadcastParty(socket.partyCode);
}

function setReady(socket, ready) {
  if (!socket.partyCode || !socket.player) return;
  const party = parties.get(socket.partyCode);
  if (!party || party.started) return;

  socket.player.ready = Boolean(ready);
  broadcastParty(socket.partyCode);
}

function startParty(socket) {
  if (!socket.partyCode || !socket.player) return;
  const party = parties.get(socket.partyCode);
  if (!party || party.ownerId !== socket.player.id || party.started) return;
  if (![...party.players.values()].every((client) => client.player.ready)) {
    sendError(socket, "Baslatmak icin herkes hazir olmali.", "notEveryoneReady");
    return;
  }
  party.started = true;
  broadcastParty(socket.partyCode);
}

function kickPlayer(socket, playerId) {
  if (!socket.partyCode || !socket.player) return;
  const party = parties.get(socket.partyCode);
  const targetId = safeId(playerId);
  if (!party || party.ownerId !== socket.player.id || targetId === socket.player.id) return;

  const target = party.players.get(targetId);
  if (!target) return;

  party.players.delete(targetId);
  target.partyCode = null;
  target.player = null;
  if (target.readyState === target.OPEN) {
    target.send(JSON.stringify({ type: "kicked" }));
    target.close();
  }
  broadcastParty(party.code);
}

function sendChat(socket, text) {
  if (!socket.partyCode || !socket.player) return;
  const party = parties.get(socket.partyCode);
  if (!party) return;

  const clean = typeof text === "string" ? text.trim().slice(0, 120) : "";
  if (!clean) return;

  const payload = JSON.stringify({
    type: "chat",
    from: socket.player.id,
    name: socket.player.name,
    text: clean
  });
  for (const client of party.players.values()) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
}

function relayVoiceSignal(socket, message) {
  if (!socket.partyCode || !socket.player) return;
  const party = parties.get(socket.partyCode);
  if (!party) return;

  const targetId = safeId(message.to);
  const target = party.players.get(targetId);
  if (!target || target.readyState !== target.OPEN) return;

  target.send(JSON.stringify({
    type: "voice-signal",
    from: socket.player.id,
    signal: message.signal
  }));
}

function leaveParty(socket) {
  if (!socket.partyCode || !socket.player) return;
  const party = parties.get(socket.partyCode);
  if (!party) return;

  party.players.delete(socket.player.id);
  const leftParty = socket.partyCode;
  socket.partyCode = null;
  socket.player = null;

  if (party.players.size === 0) {
    parties.delete(leftParty);
  } else {
    if (![...party.players.keys()].includes(party.ownerId)) {
      party.ownerId = party.players.keys().next().value;
    }
    broadcastParty(leftParty);
  }
}

function broadcastParty(code) {
  const party = parties.get(code);
  if (!party) return;

  const payload = JSON.stringify({
    type: "party",
    code,
    ownerId: party.ownerId,
    started: party.started,
    maxParties: MAX_PARTIES,
    maxPlayers: MAX_PLAYERS_PER_PARTY,
    players: [...party.players.values()].map((socket) => socket.player)
  });

  for (const socket of party.players.values()) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}

function sendError(socket, message, code = "unknown") {
  socket.send(JSON.stringify({ type: "error", code, message }));
}

function sanitizePlayerState(player = {}, fallback = {}) {
  return {
    id: fallback.id || safeId(player.id),
    name: safeName(player.name, fallback.name || "Oyuncu"),
    x: safePositionAxis(player.x, "X", fallback.x),
    y: safePositionAxis(player.y, "Y", fallback.y),
    z: safePositionAxis(player.z, "Z", fallback.z),
    yaw: safeRangedNumber(player.yaw, PARTY_STATE_LIMITS.yaw, fallback.yaw),
    room: safeRangedInteger(player.room, PARTY_STATE_LIMITS.room, fallback.room),
    hp: safeRangedInteger(player.hp, PARTY_STATE_LIMITS.hp, fallback.hp),
    cosmeticId: safeCosmetic(player.cosmeticId, fallback.cosmeticId),
    sneaking: safeBoolean(player.sneaking, fallback.sneaking),
    weaponId: safeWeapon(player.weaponId, fallback.weaponId),
    upgradeLevel: safeRangedInteger(player.upgradeLevel, PARTY_STATE_LIMITS.upgradeLevel, fallback.upgradeLevel),
    flashlightOn: safeBoolean(player.flashlightOn, fallback.flashlightOn),
    battery: safeRangedInteger(player.battery, PARTY_STATE_LIMITS.battery, fallback.battery),
    ready: Boolean(fallback.ready)
  };
}

function loadSharedJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "shared", fileName), "utf8"));
}

function nonEmptyStringArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const clean = value.filter((item) => typeof item === "string" && item.trim());
  return clean.length > 0 ? clean : fallback;
}

function safeName(value, fallback) {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().replace(/[^\wğüşöçıİĞÜŞÖÇ -]/gi, "").slice(0, 24);
  return clean || fallback;
}

function safeId(value) {
  if (typeof value !== "string") return cryptoId();
  const clean = value.trim().replace(/[^\w-]/g, "").slice(0, 64);
  return clean || cryptoId();
}

function safeCosmetic(value, fallback = DEFAULT_COSMETIC_ID) {
  return ALLOWED_COSMETICS.has(value) ? value : fallback;
}

function safeWeapon(value, fallback = DEFAULT_WEAPON_ID) {
  return ALLOWED_WEAPONS.has(value) ? value : fallback;
}

function safeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : Boolean(fallback);
}

function safePositionAxis(value, axis, fallback = undefined) {
  const limits = PARTY_STATE_LIMITS.position || {};
  const min = limitNumber(limits, `min${axis}`, -1000);
  const max = limitNumber(limits, `max${axis}`, 1000);
  const defaultValue = fallback ?? limitNumber(limits, `default${axis}`, 0);
  return boundedNumber(value, min, max, defaultValue);
}

function safeRangedInteger(value, limits, fallback = undefined) {
  const defaultValue = fallback ?? limitNumber(limits, "default", 0);
  return clampNumber(value, limitNumber(limits, "min", 0), limitNumber(limits, "max", 999), defaultValue);
}

function safeRangedNumber(value, limits, fallback = undefined) {
  const defaultValue = fallback ?? limitNumber(limits, "default", 0);
  return boundedNumber(value, limitNumber(limits, "min", -Infinity), limitNumber(limits, "max", Infinity), defaultValue);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function boundedNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function limitNumber(config, key, fallback) {
  const number = Number(config?.[key]);
  return Number.isFinite(number) ? number : fallback;
}

function createPartyCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 100; tries += 1) {
    let code = "";
    for (let i = 0; i < 4; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!parties.has(code)) return code;
  }
  return cryptoId().toUpperCase().slice(0, 4);
}

function cryptoId() {
  return Math.random().toString(36).slice(2, 10);
}

server.listen(PORT, () => {
  console.log(`Robot Avcisi calisiyor: http://localhost:${PORT}`);
  console.log(`Parti siniri: ${MAX_PARTIES} parti, her parti ${MAX_PLAYERS_PER_PARTY} oyuncu.`);
});
