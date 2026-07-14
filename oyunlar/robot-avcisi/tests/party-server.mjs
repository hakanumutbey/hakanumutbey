import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import WebSocket from "ws";
import { assert, delay, withServer } from "./helpers/testServer.mjs";

const PORT = Number(process.env.TEST_PARTY_PORT || 3138);
const WS_URL = `ws://127.0.0.1:${PORT}/party`;
const PARTY_LIMITS = JSON.parse(await readFile(resolve("shared/partyLimits.json"), "utf8"));
const PARTY_LOADOUT = JSON.parse(await readFile(resolve("shared/partyLoadout.json"), "utf8"));
const PARTY_STATE_LIMITS = JSON.parse(await readFile(resolve("shared/partyStateLimits.json"), "utf8"));

function makePlayer(id, name = id) {
  return {
    id,
    name,
    x: 0,
    y: 1.7,
    z: -8,
    yaw: 0,
    room: 1,
    hp: 100,
    cosmeticId: "none",
    weaponId: "pistol",
    upgradeLevel: 0,
    flashlightOn: true,
    battery: 100
  };
}

async function openClient() {
  const messages = [];
  const socket = new WebSocket(WS_URL);
  socket.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  return {
    socket,
    messages,
    send(payload) {
      socket.send(JSON.stringify(payload));
    },
    sendRaw(payload) {
      socket.send(payload);
    },
    waitFor(predicate, label = "message") {
      return waitForMessage(messages, predicate, label);
    },
    close() {
      socket.close();
    }
  };
}

async function waitForMessage(messages, predicate, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const match = messages.find(predicate);
    if (match) return match;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${label}. Messages: ${JSON.stringify(messages)}`);
}

async function createParty(playerId) {
  const client = await openClient();
  client.send({ type: "create", player: makePlayer(playerId) });
  const party = await client.waitFor((message) => message.type === "party", "created party");
  return { client, code: party.code, party };
}

async function joinParty(code, playerId) {
  const client = await openClient();
  client.send({ type: "join", code, player: makePlayer(playerId) });
  await client.waitFor((message) => message.type === "party" && message.code === code, "joined party");
  return client;
}

async function joinPartyWithPlayer(code, player) {
  const client = await openClient();
  client.send({ type: "join", code, player });
  await client.waitFor((message) => message.type === "party" && message.code === code, "joined party");
  return client;
}

function closeAll(clients) {
  for (const client of clients) client.close();
}

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}

check("server enforces at most three parties", async () => {
  const clients = [];
  try {
    for (let index = 1; index <= PARTY_LIMITS.maxParties; index += 1) {
      const party = await createParty(`owner-${index}`);
      clients.push(party.client);
      assert(party.party.maxParties === PARTY_LIMITS.maxParties, `Expected shared maxParties ${PARTY_LIMITS.maxParties}, got ${party.party.maxParties}.`);
    }

    const fourth = await openClient();
    clients.push(fourth);
    fourth.send({ type: "create", player: makePlayer("owner-4") });
    const error = await fourth.waitFor((message) => message.type === "error", "party limit error");
    assert(error.code === "partyLimit", `Expected partyLimit, got ${error.code}.`);
  } finally {
    closeAll(clients);
  }
});

check("server rejects invalid and unknown party messages", async () => {
  const client = await openClient();
  try {
    client.sendRaw("{bad json");
    const invalid = await client.waitFor((message) => message.type === "error" && message.code === "invalidMessage", "invalid message error");
    assert(invalid.message.includes("bozuk"), `Invalid JSON should return invalidMessage, got ${JSON.stringify(invalid)}.`);

    client.send({ type: "dance-party" });
    const unknown = await client.waitFor((message) => message.type === "error" && message.code === "unknownMessage", "unknown message error");
    assert(unknown.message.includes("Bilinmeyen"), `Unknown message should return unknownMessage, got ${JSON.stringify(unknown)}.`);
  } finally {
    closeAll([client]);
  }
});

check("party accepts five players and rejects the sixth", async () => {
  const clients = [];
  try {
    const { client: owner, code } = await createParty("owner");
    clients.push(owner);
    for (let index = 2; index <= PARTY_LIMITS.maxPlayersPerParty; index += 1) {
      clients.push(await joinParty(code, `player-${index}`));
    }

    const sixth = await openClient();
    clients.push(sixth);
    sixth.send({ type: "join", code, player: makePlayer("player-6") });
    const error = await sixth.waitFor((message) => message.type === "error", "party full error");
    assert(error.code === "partyFull", `Expected partyFull, got ${error.code}.`);
    assert(error.message.includes(String(PARTY_LIMITS.maxPlayersPerParty)), `Party full error should include shared player limit, got ${error.message}.`);
  } finally {
    closeAll(clients);
  }
});

check("only the owner can start and everyone must be ready", async () => {
  const clients = [];
  try {
    const { client: owner, code } = await createParty("owner");
    const guest = await joinParty(code, "guest");
    clients.push(owner, guest);

    owner.send({ type: "start" });
    const notReady = await owner.waitFor((message) => message.type === "error", "not ready error");
    assert(notReady.code === "notEveryoneReady", `Expected notEveryoneReady, got ${notReady.code}.`);
    assert(owner.socket.readyState === WebSocket.OPEN, "Owner should stay connected after not-ready error.");

    owner.send({ type: "ready", ready: true });
    guest.send({ type: "ready", ready: true });
    await owner.waitFor((message) => message.type === "party" && message.players.every((player) => player.ready), "all ready party");

    guest.send({ type: "start" });
    await delay(150);
    assert(!owner.messages.some((message) => message.type === "party" && message.started), "Guest should not start the party.");

    owner.send({ type: "start" });
    const started = await guest.waitFor((message) => message.type === "party" && message.started, "started party");
    assert(started.ownerId === "owner", `Expected owner to remain owner, got ${started.ownerId}.`);
  } finally {
    closeAll(clients);
  }
});

check("owner can kick a player and chat stays inside the party", async () => {
  const clients = [];
  try {
    const { client: owner, code } = await createParty("owner");
    const guest = await joinParty(code, "guest");
    const outsiderParty = await createParty("outsider");
    clients.push(owner, guest, outsiderParty.client);

    guest.send({ type: "chat", text: "merhaba" });
    const chat = await owner.waitFor((message) => message.type === "chat" && message.text === "merhaba", "party chat");
    assert(chat.from === "guest", `Expected chat from guest, got ${chat.from}.`);
    await delay(150);
    assert(!outsiderParty.client.messages.some((message) => message.type === "chat" && message.text === "merhaba"), "Chat leaked to another party.");

    owner.send({ type: "kick", playerId: "guest" });
    const kicked = await guest.waitFor((message) => message.type === "kicked", "kicked message");
    assert(kicked.type === "kicked", "Guest should receive kicked message.");
  } finally {
    closeAll(clients);
  }
});

check("voice signaling is relayed only to the target player", async () => {
  const clients = [];
  try {
    const { client: owner, code } = await createParty("owner");
    const guest = await joinParty(code, "guest");
    const third = await joinParty(code, "third");
    clients.push(owner, guest, third);

    owner.send({ type: "voice-signal", to: "guest", signal: { kind: "offer", sdp: "test" } });
    const signal = await guest.waitFor((message) => message.type === "voice-signal", "voice signal");
    assert(signal.from === "owner", `Expected signal from owner, got ${signal.from}.`);
    assert(signal.signal?.kind === "offer", `Expected offer signal, got ${JSON.stringify(signal.signal)}.`);
    await delay(150);
    assert(!third.messages.some((message) => message.type === "voice-signal"), "Voice signal leaked to non-target player.");
  } finally {
    closeAll(clients);
  }
});

check("player loadout ids are sanitized from the shared party loadout", async () => {
  const clients = [];
  try {
    const { client: owner, code } = await createParty("owner");
    const guest = await joinPartyWithPlayer(code, {
      ...makePlayer("guest"),
      weaponId: "badJoinWeapon",
      cosmeticId: "badJoinCosmetic"
    });
    clients.push(owner, guest);

    const joined = await owner.waitFor((message) => {
      const guestPlayer = message.players?.find((player) => player.id === "guest");
      return message.type === "party"
        && guestPlayer?.weaponId === PARTY_LOADOUT.weapons[0]
        && guestPlayer?.cosmeticId === PARTY_LOADOUT.cosmetics[0];
    }, "sanitized join loadout");
    const joinedGuest = joined.players.find((player) => player.id === "guest");
    assert(joinedGuest.weaponId === PARTY_LOADOUT.weapons[0], `Invalid join weapon should fall back to shared default, got ${joinedGuest.weaponId}.`);
    assert(joinedGuest.cosmeticId === PARTY_LOADOUT.cosmetics[0], `Invalid join cosmetic should fall back to shared default, got ${joinedGuest.cosmeticId}.`);

    guest.send({
      type: "state",
      player: {
        ...makePlayer("guest"),
        weaponId: "unknownWeapon",
        cosmeticId: "unknownCosmetic",
        upgradeLevel: 123
      }
    });
    const sanitized = await owner.waitFor((message) => {
      const guestPlayer = message.players?.find((player) => player.id === "guest");
      return message.type === "party"
        && guestPlayer?.weaponId === PARTY_LOADOUT.weapons[0]
        && guestPlayer?.cosmeticId === PARTY_LOADOUT.cosmetics[0]
        && guestPlayer?.upgradeLevel === 99;
    }, "sanitized loadout");
    const guestPlayer = sanitized.players.find((player) => player.id === "guest");
    assert(guestPlayer.upgradeLevel === 99, `Upgrade level should be clamped to 99, got ${guestPlayer.upgradeLevel}.`);
  } finally {
    closeAll(clients);
  }
});

check("player state numbers are clamped from shared party state limits", async () => {
  const clients = [];
  try {
    const { client: owner, code } = await createParty("owner");
    const guest = await joinPartyWithPlayer(code, {
      ...makePlayer("guest"),
      x: 999,
      y: -10,
      z: -999,
      yaw: 99,
      room: -20,
      hp: 999,
      battery: -50,
      upgradeLevel: 123
    });
    clients.push(owner, guest);

    const joined = await owner.waitFor((message) => {
      const guestPlayer = message.players?.find((player) => player.id === "guest");
      return message.type === "party"
        && guestPlayer?.x === PARTY_STATE_LIMITS.position.maxX
        && guestPlayer?.y === PARTY_STATE_LIMITS.position.minY
        && guestPlayer?.z === PARTY_STATE_LIMITS.position.minZ
        && guestPlayer?.yaw === PARTY_STATE_LIMITS.yaw.max
        && guestPlayer?.room === PARTY_STATE_LIMITS.room.min
        && guestPlayer?.hp === PARTY_STATE_LIMITS.hp.max
        && guestPlayer?.battery === PARTY_STATE_LIMITS.battery.min
        && guestPlayer?.upgradeLevel === PARTY_STATE_LIMITS.upgradeLevel.max;
    }, "clamped join state");
    const joinedGuest = joined.players.find((player) => player.id === "guest");
    assert(joinedGuest.x === PARTY_STATE_LIMITS.position.maxX, `Join x should clamp to maxX, got ${joinedGuest.x}.`);
    assert(joinedGuest.y === PARTY_STATE_LIMITS.position.minY, `Join y should clamp to minY, got ${joinedGuest.y}.`);
    assert(joinedGuest.z === PARTY_STATE_LIMITS.position.minZ, `Join z should clamp to minZ, got ${joinedGuest.z}.`);

    guest.send({
      type: "state",
      player: {
        ...makePlayer("guest"),
        x: -999,
        y: 999,
        z: 999,
        yaw: -99,
        room: 5000,
        hp: -5,
        battery: 999,
        upgradeLevel: -20
      }
    });
    const updated = await owner.waitFor((message) => {
      const guestPlayer = message.players?.find((player) => player.id === "guest");
      return message.type === "party"
        && guestPlayer?.x === PARTY_STATE_LIMITS.position.minX
        && guestPlayer?.y === PARTY_STATE_LIMITS.position.maxY
        && guestPlayer?.z === PARTY_STATE_LIMITS.position.maxZ
        && guestPlayer?.yaw === PARTY_STATE_LIMITS.yaw.min
        && guestPlayer?.room === PARTY_STATE_LIMITS.room.max
        && guestPlayer?.hp === PARTY_STATE_LIMITS.hp.min
        && guestPlayer?.battery === PARTY_STATE_LIMITS.battery.max
        && guestPlayer?.upgradeLevel === PARTY_STATE_LIMITS.upgradeLevel.min;
    }, "clamped update state");
    const updatedGuest = updated.players.find((player) => player.id === "guest");
    assert(updatedGuest.room === PARTY_STATE_LIMITS.room.max, `Update room should clamp to max room, got ${updatedGuest.room}.`);
    assert(updatedGuest.hp === PARTY_STATE_LIMITS.hp.min, `Update hp should clamp to min hp, got ${updatedGuest.hp}.`);
  } finally {
    closeAll(clients);
  }
});

check("partial player state updates preserve existing sanitized fields", async () => {
  const clients = [];
  try {
    const { client: owner, code } = await createParty("owner");
    const guest = await joinPartyWithPlayer(code, {
      ...makePlayer("guest"),
      name: "Guest",
      sneaking: true,
      flashlightOn: true,
      battery: 80,
      weaponId: PARTY_LOADOUT.weapons[1],
      cosmeticId: PARTY_LOADOUT.cosmetics[1]
    });
    clients.push(owner, guest);

    guest.send({ type: "state", player: { hp: 55 } });
    const updated = await owner.waitFor((message) => {
      const guestPlayer = message.players?.find((player) => player.id === "guest");
      return message.type === "party" && guestPlayer?.hp === 55;
    }, "partial state update");
    const guestPlayer = updated.players.find((player) => player.id === "guest");
    assert(guestPlayer.name === "Guest", `Partial update should preserve name, got ${guestPlayer.name}.`);
    assert(guestPlayer.sneaking === true, "Partial update should preserve sneaking.");
    assert(guestPlayer.flashlightOn === true, "Partial update should preserve flashlight state.");
    assert(guestPlayer.battery === 80, `Partial update should preserve battery, got ${guestPlayer.battery}.`);
    assert(guestPlayer.weaponId === PARTY_LOADOUT.weapons[1], `Partial update should preserve weapon, got ${guestPlayer.weaponId}.`);
    assert(guestPlayer.cosmeticId === PARTY_LOADOUT.cosmetics[1], `Partial update should preserve cosmetic, got ${guestPlayer.cosmeticId}.`);
  } finally {
    closeAll(clients);
  }
});

await withServer(PORT, async () => {
  for (const { name, fn } of checks) {
    await fn();
    console.log(`ok - ${name}`);
  }
});
