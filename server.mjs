import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const distRoot = join(root, "dist");
const dataRoot = process.env.DATA_DIR || join(root, ".data");
const port = Number(process.env.PORT || 8080);
const announcementPasswordHash =
  process.env.ANNOUNCEMENT_PASSWORD_HASH ||
  "7241bb00842e01487a32ea059136a43484969ae967f2dfd50e8ac15a4234d257";
const sessions = new Map();
const voiceRooms = new Map();
const siyahAdamRooms = new Map();
const games = ["annenden-kac", "bardak", "essiz-zindan", "skeleton-wars", "rhgpo", "siyah-adam", "vale", "robot-avcisi"];
const baseValues = {
  "annenden-kac": 128,
  bardak: 96,
  "essiz-zindan": 154,
  "skeleton-wars": 188,
  rhgpo: 121,
  "siyah-adam": 168,
  vale: 112,
  "robot-avcisi": 173,
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".wav": "audio/wav",
};

await mkdir(dataRoot, { recursive: true });

let photos = await readJson("photos.json", []);
let stock = await readJson("stats.json", {
  marketHistory: createHistory(140),
  games: Object.fromEntries(games.map((slug) => [slug, {
    opens: 0,
    value: baseValues[slug],
    history: createHistory(baseValues[slug]),
  }])),
});
let ratings = await readJson("ratings.json", {
  games: Object.fromEntries(games.map((slug) => [slug, { total: 0, count: 0 }])),
});
let guestbook = await readJson("guestbook.json", []);
let feedback = await readJson("feedback.json", []);
let announcements = await readJson("announcements.json", []);
let accounts = normalizeAccounts(await readJson("accounts.json", []));
let friendRequests = normalizeFriendRequests(await readJson("friend-requests.json", []));
let invites = normalizeInvites(await readJson("invites.json", []));

const server = createServer(async (request, response) => {
  try {
    if (request.url.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

const voiceSocketServer = new WebSocketServer({ noServer: true });
voiceSocketServer.on("connection", (socket) => {
  socket.voiceAccountId = "";
  socket.voiceRoomId = "";

  socket.on("message", async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message?.type === "join") {
      await joinVoiceRoom(socket, message);
      return;
    }
    if (message?.type === "leave") {
      leaveVoiceRoom(socket);
      return;
    }
    if (message?.type === "signal") {
      relayVoiceSignal(socket, message);
      return;
    }
  });

  socket.on("close", () => {
    leaveVoiceRoom(socket);
  });
});

const siyahAdamSocketServer = new WebSocketServer({ noServer: true });
siyahAdamSocketServer.on("connection", (socket) => {
  socket.blackSessionId = "";
  socket.blackRoomId = "";

  socket.on("message", async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message?.type === "join") {
      await joinBlackRoom(socket, message);
      return;
    }
    if (message?.type === "ready") {
      setBlackReady(socket, message);
      return;
    }
    if (message?.type === "input") {
      setBlackInput(socket, message);
      return;
    }
    if (message?.type === "vote") {
      castBlackVote(socket, message);
      return;
    }
    if (message?.type === "night-target") {
      setBlackNightTarget(socket, message);
      return;
    }
    if (message?.type === "start") {
      startBlackGameBySocket(socket);
      return;
    }
    if (message?.type === "call-meeting") {
      callBlackMeeting(socket);
      return;
    }
    if (message?.type === "leave") {
      leaveBlackRoom(socket);
      return;
    }
  });

  socket.on("close", () => {
    leaveBlackRoom(socket);
  });
});

server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  if (pathname === "/voice") {
    voiceSocketServer.handleUpgrade(request, socket, head, (ws) => {
      voiceSocketServer.emit("connection", ws, request);
    });
    return;
  }
  if (pathname === "/siyah-adam") {
    siyahAdamSocketServer.handleUpgrade(request, socket, head, (ws) => {
      siyahAdamSocketServer.emit("connection", ws, request);
    });
    return;
  }
  socket.destroy();
});

setInterval(() => {
  tickBlackRooms();
}, 100);

server.listen(port, () => {
  console.log(`Hakorocks Studio running on ${port}`);
});

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/api/stats") {
    sendJson(response, currentStats());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/photos") {
    sendJson(response, photos.slice(0, 40));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/ratings") {
    sendJson(response, currentRatings());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/guestbook") {
    sendJson(response, guestbook.slice(0, 30));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/feedback") {
    sendJson(response, feedback.slice(0, 30));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/announcements") {
    sendJson(response, announcements.slice(0, 20));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/account") {
    const sessionId = safeText(url.searchParams.get("sessionId"), 120);
    sendJson(response, accountSnapshot(sessionId));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/users") {
    const sessionId = safeText(url.searchParams.get("sessionId"), 120);
    const query = safeText(url.searchParams.get("query"), 40).toLocaleLowerCase("tr-TR");
    const list = accounts
      .filter((account) => account.sessionId !== sessionId)
      .filter((account) => {
        if (!query) return true;
        return [
          account.name,
          account.nickname,
        ].some((value) => value.toLocaleLowerCase("tr-TR").includes(query));
      })
      .slice(0, 12)
      .map(publicAccount);
    sendJson(response, list);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/heartbeat") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    if (sessionId) {
      sessions.set(sessionId, {
        lastSeen: Date.now(),
        device: ["mobile", "tablet", "desktop"].includes(body.device) ? body.device : "desktop",
        activeGame: games.includes(body.activeGame) ? body.activeGame : "",
      });
    }
    sendJson(response, currentStats());
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/game-open") {
    const body = await readBody(request, 64_000);
    const slug = games.includes(body.slug) ? body.slug : "";
    if (slug) {
      const item = gameStock(slug);
      item.opens += 1;
      item.value = Math.max(12, item.value + 2.5);
      pushHistory(item.history, item.value);
      await saveStats();
    }
    sendJson(response, currentStats());
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/photo") {
    const body = await readBody(request, 900_000);
    const slug = games.includes(body.slug) ? body.slug : "";
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    if (!slug || !dataUrl.startsWith("data:image/") || dataUrl.length > 850_000) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-photo" }));
      return;
    }
    const photo = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      slug,
      title: safeText(body.title, 80) || "Oyun fotoğrafı",
      gameTitle: safeText(body.gameTitle, 80),
      dataUrl,
      createdAt: new Date().toISOString(),
    };
    photos = [photo, ...photos].slice(0, 60);
    await writeJson("photos.json", photos);
    sendJson(response, photo);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/rating") {
    const body = await readBody(request, 64_000);
    const slug = games.includes(body.slug) ? body.slug : "";
    const value = Number(body.value);
    if (!slug || !Number.isInteger(value) || value < 1 || value > 5) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-rating" }));
      return;
    }
    const item = gameRating(slug);
    item.total += value;
    item.count += 1;
    await writeJson("ratings.json", ratings);
    sendJson(response, currentRatings());
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/guestbook") {
    const body = await readBody(request, 64_000);
    const name = safeText(body.name, 32) || "Hakorocks ziyaretçisi";
    const message = safeText(body.message, 180);
    if (message.length < 2) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-message" }));
      return;
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      message,
      createdAt: new Date().toISOString(),
    };
    guestbook = [entry, ...guestbook].slice(0, 60);
    await writeJson("guestbook.json", guestbook);
    sendJson(response, guestbook.slice(0, 30));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/feedback") {
    const body = await readBody(request, 64_000);
    const name = safeText(body.name, 32) || "Ziyaretçi";
    const kind = ["Geri bildirim", "Talep", "Fikir"].includes(safeText(body.kind, 32))
      ? safeText(body.kind, 32)
      : "Geri bildirim";
    const message = safeText(body.message, 220);
    if (message.length < 2) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-feedback" }));
      return;
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      kind,
      message,
      createdAt: new Date().toISOString(),
    };
    feedback = [entry, ...feedback].slice(0, 60);
    await writeJson("feedback.json", feedback);
    sendJson(response, feedback.slice(0, 30));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/announcements") {
    const body = await readBody(request, 64_000);
    const password = safeText(body.password, 256);
    if (passwordHash(password) !== announcementPasswordHash) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-password" }));
      return;
    }
    const title = safeText(body.title, 60) || "Duyuru";
    const message = safeText(body.message, 240);
    if (message.length < 2) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-announcement" }));
      return;
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      message,
      createdAt: new Date().toISOString(),
    };
    announcements = [entry, ...announcements].slice(0, 40);
    await writeJson("announcements.json", announcements);
    sendJson(response, announcements.slice(0, 20));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/account") {
    const body = await readBody(request, 250_000);
    const sessionId = safeText(body.sessionId, 120);
    const name = safeText(body.name, 40);
    const nickname = safeText(body.nickname, 24);
    const avatarUrl = safeAvatar(body.avatarUrl);
    if (!sessionId || name.length < 2 || nickname.length < 2) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-account" }));
      return;
    }
    const normalizedNickname = normalizeNickname(nickname);
    const taken = accounts.find((account) => normalizeNickname(account.nickname) === normalizedNickname && account.sessionId !== sessionId);
    if (taken && normalizeNickname(taken.name) !== normalizeNickname(name)) {
      response.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "nickname-taken" }));
      return;
    }
    const now = new Date().toISOString();
    const existing = accounts.find((account) => account.sessionId === sessionId);
    const restored = taken && normalizeNickname(taken.name) === normalizeNickname(name);
    const account = restored
      ? Object.assign(taken, {
        sessionId,
        name,
        nickname,
        avatarUrl,
        voiceRoomId: taken.voiceRoomId || "",
        updatedAt: now,
      })
      : existing
        ? Object.assign(existing, {
          name,
          nickname,
          avatarUrl,
          voiceRoomId: existing.voiceRoomId || "",
          updatedAt: now,
        })
        : {
          id: createRecordId("acct"),
          sessionId,
          name,
          nickname,
          avatarUrl,
          voiceRoomId: "",
          createdAt: now,
          updatedAt: now,
        friends: [],
      };
    if (restored && existing && existing.id !== taken.id) {
      transferAccountReferences(existing.id, taken.id);
      accounts = accounts.filter((item) => item.id !== existing.id);
    }
    if (!existing && !restored) accounts = [account, ...accounts];
    await writeJson("accounts.json", accounts);
    sendJson(response, accountSnapshot(sessionId));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/friends/request") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    const targetNickname = safeText(body.targetNickname, 24);
    const message = safeText(body.message, 120);
    const result = createFriendRequest(sessionId, targetNickname, message);
    if (result.error) {
      response.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: result.error }));
      return;
    }
    await writeJson("friend-requests.json", friendRequests);
    sendJson(response, accountSnapshot(sessionId));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/friends/respond") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    const requestId = safeText(body.requestId, 120);
    const action = safeText(body.action, 16);
    const result = respondFriendRequest(sessionId, requestId, action);
    if (result.error) {
      response.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: result.error }));
      return;
    }
    await writeJson("friend-requests.json", friendRequests);
    await writeJson("accounts.json", accounts);
    sendJson(response, accountSnapshot(sessionId));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/invites") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    const targetNickname = safeText(body.targetNickname, 24);
    const gameSlug = games.includes(body.gameSlug) ? body.gameSlug : "";
    const message = safeText(body.message, 120);
    const result = createInvite(sessionId, targetNickname, gameSlug, message);
    if (result.error) {
      response.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: result.error }));
      return;
    }
    await writeJson("invites.json", invites);
    sendJson(response, accountSnapshot(sessionId));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/voice") {
    const sessionId = safeText(url.searchParams.get("sessionId"), 120);
    sendJson(response, voiceSnapshot(sessionId));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/siyah-adam") {
    const roomId = normalizeBlackRoomId(safeText(url.searchParams.get("roomId"), 40));
    const sessionId = safeText(url.searchParams.get("sessionId"), 120);
    sendJson(response, blackSnapshot(roomId, sessionId));
    return;
  }
  response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "not-found" }));
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const filePath = normalize(join(distRoot, pathname));
  if (!filePath.startsWith(distRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      streamFile(filePath, response);
      return;
    }
  } catch {
    if (!extname(filePath)) {
      streamFile(join(distRoot, "index.html"), response);
      return;
    }
  }

  response.writeHead(404);
  response.end("Not found");
}

function streamFile(filePath, response) {
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=2592000",
  });
  createReadStream(filePath).pipe(response);
}

function currentStats() {
  cleanupSessions();
  const activeSessions = [...sessions.values()];
  const devices = { mobile: 0, tablet: 0, desktop: 0 };
  const playingByGame = Object.fromEntries(games.map((slug) => [slug, 0]));
  for (const session of activeSessions) {
    devices[session.device] = (devices[session.device] ?? 0) + 1;
    if (session.activeGame && playingByGame[session.activeGame] !== undefined) {
      playingByGame[session.activeGame] += 1;
    }
  }

  const gameStats = {};
  for (const slug of games) {
    const item = gameStock(slug);
    const playing = playingByGame[slug];
    const target = baseValues[slug] + item.opens * 1.2 + playing * 18 + activeSessions.length * 2;
    item.value = item.value * 0.82 + target * 0.18;
    pushHistory(item.history, item.value);
    gameStats[slug] = {
      value: item.value,
      change: percentageChange(item.history),
      playing,
      opens: item.opens,
      history: item.history,
    };
  }

  const marketValue = Object.values(gameStats).reduce((sum, item) => sum + item.value, 0) / games.length;
  pushHistory(stock.marketHistory, marketValue);
  return {
    siteOpen: activeSessions.length,
    playing: Object.values(playingByGame).reduce((sum, count) => sum + count, 0),
    devices,
    marketValue,
    marketHistory: stock.marketHistory,
    games: gameStats,
  };
}

function gameStock(slug) {
  stock.games[slug] ??= {
    opens: 0,
    value: baseValues[slug],
    history: createHistory(baseValues[slug]),
  };
  return stock.games[slug];
}

function currentRatings() {
  return {
    games: Object.fromEntries(games.map((slug) => {
      const item = gameRating(slug);
      return [slug, {
        average: item.count ? Number((item.total / item.count).toFixed(2)) : 0,
        count: item.count,
      }];
    })),
  };
}

function gameRating(slug) {
  ratings.games ??= {};
  ratings.games[slug] ??= { total: 0, count: 0 };
  return ratings.games[slug];
}

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastSeen > 45_000) sessions.delete(id);
  }
}

function createHistory(value) {
  return Array.from({ length: 18 }, (_, index) => Math.max(12, value + Math.sin(index * 0.8) * 8));
}

function pushHistory(history, value) {
  history.push(Number(value.toFixed(2)));
  while (history.length > 18) history.shift();
}

function percentageChange(history) {
  if (history.length < 2) return 0;
  const first = history[0];
  const last = history[history.length - 1];
  return ((last - first) / Math.max(1, first)) * 100;
}

async function readBody(request, maxBytes) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > maxBytes) throw new Error("Request body too large");
  }
  return raw ? JSON.parse(raw) : {};
}

async function readJson(name, fallback) {
  try {
    return JSON.parse(await readFile(join(dataRoot, name), "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(name, value) {
  await writeFile(join(dataRoot, name), JSON.stringify(value), "utf8");
}

async function saveStats() {
  await writeJson("stats.json", stock);
}

function sendJson(response, payload) {
  response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function safeText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function passwordHash(value) {
  return createHash("sha256").update(value || "", "utf8").digest("hex");
}

function normalizeAccounts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: safeText(item.id, 80) || createRecordId("acct"),
      sessionId: safeText(item.sessionId, 120),
      name: safeText(item.name, 40) || "Hakan",
      nickname: safeText(item.nickname, 24) || "hakan",
      avatarUrl: safeAvatar(item.avatarUrl),
      voiceRoomId: safeText(item.voiceRoomId, 40),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
      updatedAt: safeText(item.updatedAt, 40) || new Date().toISOString(),
      friends: Array.isArray(item.friends) ? item.friends.map((friendId) => safeText(friendId, 80)).filter(Boolean) : [],
    }))
    .filter((item) => item.sessionId);
}

function normalizeFriendRequests(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: safeText(item.id, 80) || createRecordId("req"),
      fromAccountId: safeText(item.fromAccountId, 80),
      toAccountId: safeText(item.toAccountId, 80),
      message: safeText(item.message, 120),
      status: ["pending", "accepted", "declined"].includes(item.status) ? item.status : "pending",
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
      updatedAt: safeText(item.updatedAt, 40) || new Date().toISOString(),
    }))
    .filter((item) => item.fromAccountId && item.toAccountId);
}

function normalizeInvites(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: safeText(item.id, 80) || createRecordId("inv"),
      fromAccountId: safeText(item.fromAccountId, 80),
      toAccountId: safeText(item.toAccountId, 80),
      gameSlug: games.includes(item.gameSlug) ? item.gameSlug : "",
      message: safeText(item.message, 120),
      status: ["pending", "accepted", "declined"].includes(item.status) ? item.status : "pending",
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
      updatedAt: safeText(item.updatedAt, 40) || new Date().toISOString(),
    }))
    .filter((item) => item.fromAccountId && item.toAccountId && item.gameSlug);
}

function safeAvatar(value) {
  const avatar = safeText(value, 220_000);
  return avatar.startsWith("data:image/") ? avatar : "";
}

function normalizeNickname(value) {
  return safeText(value, 24).toLocaleLowerCase("tr-TR");
}

function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function publicAccount(account) {
  if (!account) return null;
  const friends = account.friends
    .map((friendId) => accountById(friendId))
    .filter(Boolean)
    .map((friend) => ({
      id: friend.id,
      name: friend.name,
      nickname: friend.nickname,
      avatarUrl: friend.avatarUrl,
    }));
  return {
    id: account.id,
    name: account.name,
    nickname: account.nickname,
    avatarUrl: account.avatarUrl,
    voiceRoomId: account.voiceRoomId || "",
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    friendCount: friends.length,
    friends,
  };
}

function accountById(id) {
  return accounts.find((account) => account.id === id) || null;
}

function accountBySessionId(sessionId) {
  return accounts.find((account) => account.sessionId === sessionId) || null;
}

function accountSnapshot(sessionId) {
  const account = sessionId ? accountBySessionId(sessionId) : null;
  if (!account) {
    return {
      account: null,
      people: accounts.slice(0, 12).map(publicAccount),
      incomingRequests: [],
      outgoingRequests: [],
      invites: [],
    };
  }
  const incomingRequests = friendRequests
    .filter((request) => request.toAccountId === account.id && request.status === "pending")
    .map((request) => ({
      ...request,
      from: publicAccount(accountById(request.fromAccountId)),
    }));
  const outgoingRequests = friendRequests
    .filter((request) => request.fromAccountId === account.id && request.status === "pending")
    .map((request) => ({
      ...request,
      to: publicAccount(accountById(request.toAccountId)),
    }));
  const incomingInvites = invites
    .filter((invite) => invite.toAccountId === account.id && invite.status === "pending")
    .map((invite) => ({
      ...invite,
      from: publicAccount(accountById(invite.fromAccountId)),
    }));
  const friends = account.friends
    .map((friendId) => accountById(friendId))
    .filter(Boolean)
    .map(publicAccount);
  return {
    account: publicAccount(account),
    people: accounts
      .filter((item) => item.id !== account.id)
      .slice(0, 12)
      .map(publicAccount),
    incomingRequests,
    outgoingRequests,
    invites: incomingInvites,
    friends,
  };
}

function createFriendRequest(sessionId, targetNickname, message) {
  const source = accountBySessionId(sessionId);
  if (!source) return { error: "account-missing", status: 404 };
  const target = findAccountByHandle(targetNickname);
  if (!target) return { error: "user-not-found", status: 404 };
  if (target.id === source.id) return { error: "self-request", status: 400 };
  if (source.friends.includes(target.id)) return { error: "already-friends", status: 409 };
  if (friendRequests.some((request) => request.fromAccountId === source.id && request.toAccountId === target.id && request.status === "pending")) {
    return { error: "request-exists", status: 409 };
  }
  friendRequests = [
    {
      id: createRecordId("req"),
      fromAccountId: source.id,
      toAccountId: target.id,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...friendRequests,
  ].slice(0, 120);
  return { ok: true };
}

function respondFriendRequest(sessionId, requestId, action) {
  const account = accountBySessionId(sessionId);
  if (!account) return { error: "account-missing", status: 404 };
  const request = friendRequests.find((item) => item.id === requestId && item.toAccountId === account.id);
  if (!request) return { error: "request-not-found", status: 404 };
  if (action === "accept") {
    request.status = "accepted";
    request.updatedAt = new Date().toISOString();
    addFriendship(request.fromAccountId, request.toAccountId);
    return { ok: true };
  }
  if (action === "decline") {
    request.status = "declined";
    request.updatedAt = new Date().toISOString();
    return { ok: true };
  }
  return { error: "invalid-action", status: 400 };
}

function addFriendship(firstId, secondId) {
  const first = accountById(firstId);
  const second = accountById(secondId);
  if (!first || !second) return;
  if (!first.friends.includes(second.id)) first.friends.push(second.id);
  if (!second.friends.includes(first.id)) second.friends.push(first.id);
  first.updatedAt = new Date().toISOString();
  second.updatedAt = first.updatedAt;
}

function createInvite(sessionId, targetNickname, gameSlug, message) {
  const source = accountBySessionId(sessionId);
  if (!source) return { error: "account-missing", status: 404 };
  const target = findAccountByHandle(targetNickname);
  if (!target) return { error: "user-not-found", status: 404 };
  if (target.id === source.id) return { error: "self-invite", status: 400 };
  if (!source.friends.includes(target.id)) return { error: "not-friends", status: 403 };
  invites = [
    {
      id: createRecordId("inv"),
      fromAccountId: source.id,
      toAccountId: target.id,
      gameSlug,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...invites,
  ].slice(0, 120);
  return { ok: true };
}

function findAccountByHandle(value) {
  const normalized = normalizeNickname(value);
  if (!normalized) return null;
  return accounts.find((account) => normalizeNickname(account.nickname) === normalized || normalizeNickname(account.name) === normalized) || null;
}

function transferAccountReferences(fromId, toId) {
  if (fromId === toId) return;
  for (const account of accounts) {
    if (!account?.friends) continue;
    account.friends = [...new Set(account.friends.map((friendId) => (friendId === fromId ? toId : friendId)))];
  }
  for (const request of friendRequests) {
    if (request.fromAccountId === fromId) request.fromAccountId = toId;
    if (request.toAccountId === fromId) request.toAccountId = toId;
  }
  for (const invite of invites) {
    if (invite.fromAccountId === fromId) invite.fromAccountId = toId;
    if (invite.toAccountId === fromId) invite.toAccountId = toId;
  }
  for (const room of voiceRooms.values()) {
    for (const memberSocket of room.members.values()) {
      if (memberSocket.voiceAccountId === fromId) memberSocket.voiceAccountId = toId;
    }
  }
}

function voiceSnapshot(sessionId) {
  const account = sessionId ? accountBySessionId(sessionId) : null;
  if (!account) {
    return { roomId: "", self: null, participants: [] };
  }
  const room = voiceRooms.get(account.voiceRoomId || "") || null;
  if (!room) {
    return { roomId: "", self: publicAccount(account), participants: [] };
  }
  return {
    roomId: room.id,
    self: publicAccount(account),
    participants: [...room.members.values()]
      .map((memberSocket) => accountById(memberSocket.voiceAccountId))
      .filter(Boolean)
      .map(publicAccount),
  };
}

async function joinVoiceRoom(socket, message) {
  const sessionId = safeText(message.sessionId, 120);
  const roomId = normalizeVoiceRoomId(message.roomId);
  const account = accountBySessionId(sessionId);
  if (!account || !roomId) {
    socket.send(JSON.stringify({ type: "voice-error", code: "invalid-join" }));
    return;
  }

  leaveVoiceRoom(socket);
  for (const [existingRoomId, existingRoom] of voiceRooms) {
    if (!existingRoom.members.has(account.id)) continue;
    existingRoom.members.delete(account.id);
    if (existingRoom.members.size === 0) voiceRooms.delete(existingRoomId);
    else broadcastVoiceRoom(existingRoomId);
  }
  const room = voiceRooms.get(roomId) || { id: roomId, members: new Map() };
  room.members.set(account.id, socket);
  voiceRooms.set(roomId, room);
  socket.voiceAccountId = account.id;
  socket.voiceRoomId = roomId;
  account.voiceRoomId = roomId;
  account.updatedAt = new Date().toISOString();
  await writeJson("accounts.json", accounts);
  broadcastVoiceRoom(roomId);
}

function leaveVoiceRoom(socket) {
  const accountId = socket.voiceAccountId;
  const roomId = socket.voiceRoomId;
  if (!accountId || !roomId) return;

  const room = voiceRooms.get(roomId);
  if (room) {
    room.members.delete(accountId);
    if (room.members.size === 0) voiceRooms.delete(roomId);
    else broadcastVoiceRoom(roomId);
  }

  const account = accountById(accountId);
  if (account && account.voiceRoomId === roomId) {
    account.voiceRoomId = "";
    account.updatedAt = new Date().toISOString();
    void writeJson("accounts.json", accounts);
  }

  socket.voiceAccountId = "";
  socket.voiceRoomId = "";
}

function relayVoiceSignal(socket, message) {
  const roomId = socket.voiceRoomId;
  if (!roomId || !socket.voiceAccountId) return;
  const room = voiceRooms.get(roomId);
  if (!room) return;
  const targetAccountId = safeText(message.to, 120);
  const target = room.members.get(targetAccountId);
  if (!target || target.readyState !== target.OPEN) return;
  target.send(JSON.stringify({
    type: "voice-signal",
    from: socket.voiceAccountId,
    signal: message.signal,
  }));
}

function broadcastVoiceRoom(roomId) {
  const room = voiceRooms.get(roomId);
  if (!room) return;
  const participants = [...room.members.values()]
    .map((memberSocket) => accountById(memberSocket.voiceAccountId))
    .filter(Boolean)
    .map(publicAccount);
  const payload = JSON.stringify({
    type: "voice-state",
    roomId,
    participants,
  });
  for (const memberSocket of room.members.values()) {
    if (memberSocket.readyState === memberSocket.OPEN) memberSocket.send(payload);
  }
}

function normalizeVoiceRoomId(value) {
  const roomId = safeText(value, 40).replace(/[^a-zA-Z0-9-_]/g, "");
  return roomId || "";
}

const BLACK_PHASE = {
  LOBBY: "lobby",
  DAY: "day",
  VOTE: "vote",
  NIGHT: "night",
  ENDED: "ended",
};

const BLACK_COLORS = [
  { id: "red", label: "Kırmızı", hex: "#ff5b6e" },
  { id: "blue", label: "Mavi", hex: "#4ea3ff" },
  { id: "green", label: "Yeşil", hex: "#69d18b" },
  { id: "yellow", label: "Sarı", hex: "#ffd166" },
  { id: "purple", label: "Mor", hex: "#b67dff" },
  { id: "orange", label: "Turuncu", hex: "#ff9f43" },
  { id: "teal", label: "Turkuaz", hex: "#34d1bf" },
  { id: "pink", label: "Pembe", hex: "#ff8fd6" },
  { id: "white", label: "Beyaz", hex: "#e8eef6" },
];

const BLACK_LIMITS = {
  minPlayers: 3,
  maxPlayers: 10,
  dayMs: 40000,
  voteMs: 20000,
  nightMs: 10000,
  disconnectGraceMs: 15000,
  arenaWidth: 1200,
  arenaHeight: 760,
  centerX: 600,
  centerY: 380,
  moveSpeed: 2.8,
};

function createBlackRoom(roomId) {
  return {
    id: roomId,
    hostSessionId: "",
    phase: BLACK_PHASE.LOBBY,
    round: 0,
    phaseEndsAt: 0,
    winner: "",
    blackSessionId: "",
    nightTargetSessionId: "",
    meetingCallsLeft: 2,
    lastEvent: "Oda hazır.",
    players: new Map(),
    votes: new Map(),
    events: [],
    broadcastAt: 0,
  };
}

function createBlackPlayerFromMessage(sessionId, message) {
  const account = accountBySessionId(sessionId);
  const nickname = safeText(message.nickname, 24) || account?.nickname || "misafir";
  const name = safeText(message.name, 40) || account?.name || nickname;
  const avatarUrl = safeAvatar(message.avatarUrl) || account?.avatarUrl || "";
  return {
    sessionId,
    name,
    nickname,
    avatarUrl,
    colorId: normalizeBlackColorId(message.colorId) || pickBlackColorId(),
    x: randomBlackX(),
    y: randomBlackY(),
    dx: 0,
    dy: 0,
    ready: false,
    alive: true,
    ghost: false,
    connected: true,
    disconnectedAt: 0,
    joinedAt: Date.now(),
    voteTargetSessionId: "",
    isBlack: false,
    blackMarkedTargetSessionId: "",
  };
}

function randomBlackX() {
  return 140 + Math.random() * (BLACK_LIMITS.arenaWidth - 280);
}

function randomBlackY() {
  return 110 + Math.random() * (BLACK_LIMITS.arenaHeight - 220);
}

function pickBlackColorId() {
  return BLACK_COLORS[Math.floor(Math.random() * BLACK_COLORS.length)]?.id || "red";
}

function normalizeBlackColorId(value) {
  const colorId = safeText(value, 24).toLowerCase();
  return BLACK_COLORS.some((color) => color.id === colorId) ? colorId : "";
}

function colorFromId(colorId) {
  return BLACK_COLORS.find((color) => color.id === colorId) || BLACK_COLORS[0];
}

function blackRoomPlayerList(room) {
  return [...room.players.values()].sort((first, second) => first.joinedAt - second.joinedAt);
}

function blackAlivePlayers(room) {
  return blackRoomPlayerList(room).filter((player) => player.connected && player.alive && !player.ghost);
}

function blackLivingPlayers(room) {
  return blackRoomPlayerList(room).filter((player) => player.connected !== false && !player.ghost);
}

function blackPlayerBySession(room, sessionId) {
  return room.players.get(sessionId) || null;
}

function blackPlayerLabel(player) {
  return `${player.nickname || player.name}`.trim();
}

function queueBlackEvent(room, text) {
  room.lastEvent = text;
  room.events = [
    { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, createdAt: new Date().toISOString() },
    ...room.events,
  ].slice(0, 8);
}

function normalizeBlackRoomId(value) {
  const roomId = safeText(value, 40).replace(/[^a-zA-Z0-9-_]/g, "");
  return roomId || "";
}

function blackSnapshot(roomId, sessionId) {
  const room = siyahAdamRooms.get(roomId);
  if (!room) {
    return {
      roomId,
      room: null,
      self: null,
      players: [],
      colors: BLACK_COLORS,
    };
  }

  const selfPlayer = sessionId ? blackPlayerBySession(room, sessionId) : null;
  return {
    roomId: room.id,
    room: publicBlackRoom(room, sessionId),
    self: selfPlayer ? publicBlackPlayer(selfPlayer, room, sessionId) : null,
    players: blackRoomPlayerList(room).map((player) => publicBlackPlayer(player, room, sessionId)),
    colors: BLACK_COLORS,
  };
}

function publicBlackRoom(room, sessionId) {
  const players = blackRoomPlayerList(room).map((player) => publicBlackPlayer(player, room, sessionId));
  const aliveCount = players.filter((player) => player.alive && !player.ghost && player.connected !== false).length;
  const blackAlive = players.find((player) => player.isBlack && player.alive && !player.ghost && player.connected !== false);
  return {
    id: room.id,
    phase: room.phase,
    round: room.round,
    phaseEndsAt: room.phaseEndsAt,
    hostSessionId: room.hostSessionId,
    winner: room.winner,
    meetingCallsLeft: room.meetingCallsLeft,
    aliveCount,
    playerCount: players.length,
    blackKnown: room.phase === BLACK_PHASE.ENDED,
    blackAlive: Boolean(blackAlive),
    lastEvent: room.lastEvent,
    events: room.events,
    players,
    me: sessionId ? players.find((player) => player.sessionId === sessionId) || null : null,
    selectedTargetSessionId: sessionId && room.blackSessionId === sessionId ? room.nightTargetSessionId : "",
    colors: BLACK_COLORS,
    limits: BLACK_LIMITS,
  };
}

function publicBlackPlayer(player, room, sessionId) {
  const color = colorFromId(player.colorId);
  const revealBlack = room.phase === BLACK_PHASE.ENDED || sessionId === room.blackSessionId;
  const isBlack = revealBlack && player.sessionId === room.blackSessionId;
  return {
    sessionId: player.sessionId,
    name: player.name,
    nickname: player.nickname,
    avatarUrl: player.avatarUrl,
    colorId: player.colorId,
    colorLabel: color.label,
    colorHex: isBlack ? "#101010" : color.hex,
    x: player.x,
    y: player.y,
    dx: player.dx,
    dy: player.dy,
    ready: player.ready,
    alive: player.alive,
    ghost: player.ghost,
    connected: player.connected !== false,
    isBlack,
    voteTargetSessionId: player.voteTargetSessionId || "",
    blackMarkedTargetSessionId: sessionId === room.blackSessionId ? room.nightTargetSessionId : "",
  };
}

async function joinBlackRoom(socket, message) {
  const sessionId = safeText(message.sessionId, 120);
  const roomId = normalizeBlackRoomId(message.roomId);
  if (!sessionId || !roomId) {
    socket.send(JSON.stringify({ type: "black-error", code: "invalid-join" }));
    return;
  }

  let room = siyahAdamRooms.get(roomId);
  if (!room) {
    room = createBlackRoom(roomId);
    siyahAdamRooms.set(roomId, room);
  }

  for (const [existingRoomId, existingRoom] of siyahAdamRooms) {
    if (existingRoomId === roomId || !existingRoom.players.has(sessionId)) continue;
    existingRoom.players.delete(sessionId);
    existingRoom.votes.delete(sessionId);
    if (existingRoom.hostSessionId === sessionId) {
      existingRoom.hostSessionId = blackRoomPlayerList(existingRoom).find((item) => item.sessionId !== sessionId)?.sessionId || "";
    }
    if (existingRoom.players.size === 0) siyahAdamRooms.delete(existingRoomId);
    else broadcastBlackRoom(existingRoomId);
  }

  const existingPlayer = blackPlayerBySession(room, sessionId);
  if (!existingPlayer && room.phase !== BLACK_PHASE.LOBBY && room.phase !== BLACK_PHASE.ENDED) {
    socket.send(JSON.stringify({ type: "black-error", code: "game-in-progress" }));
    return;
  }
  if (!existingPlayer && blackLivingPlayers(room).length >= BLACK_LIMITS.maxPlayers) {
    socket.send(JSON.stringify({ type: "black-error", code: "room-full" }));
    return;
  }

  const player = existingPlayer || createBlackPlayerFromMessage(sessionId, message);
  if (message.colorId && normalizeBlackColorId(message.colorId)) {
    const chosenColor = normalizeBlackColorId(message.colorId);
    const colorInUse = [...room.players.values()].some((item) => item.sessionId !== sessionId && item.colorId === chosenColor);
    if (!colorInUse) player.colorId = chosenColor;
  }

  player.name = safeText(message.name, 40) || player.name;
  player.nickname = safeText(message.nickname, 24) || player.nickname;
  player.avatarUrl = safeAvatar(message.avatarUrl) || player.avatarUrl;
  player.connected = true;
  player.disconnectedAt = 0;
  if (room.phase === BLACK_PHASE.LOBBY) {
    player.ready = Boolean(message.ready);
    player.alive = true;
    player.ghost = false;
  }

  room.players.set(sessionId, player);
  if (!room.hostSessionId) room.hostSessionId = sessionId;
  socket.blackSessionId = sessionId;
  socket.blackRoomId = roomId;
  queueBlackEvent(room, `${blackPlayerLabel(player)} odaya katıldı.`);
  broadcastBlackRoom(roomId);
}

function setBlackReady(socket, message) {
  const room = siyahAdamRooms.get(socket.blackRoomId);
  if (!room) return;
  const player = room.players.get(socket.blackSessionId);
  if (!player || room.phase !== BLACK_PHASE.LOBBY) return;
  player.ready = Boolean(message.ready);
  broadcastBlackRoom(room.id);
}

function setBlackInput(socket, message) {
  const room = siyahAdamRooms.get(socket.blackRoomId);
  if (!room || !socket.blackSessionId) return;
  const player = room.players.get(socket.blackSessionId);
  if (!player || !player.connected || !player.alive || player.ghost) return;
  player.dx = Number(message.dx) || 0;
  player.dy = Number(message.dy) || 0;
}

function castBlackVote(socket, message) {
  const room = siyahAdamRooms.get(socket.blackRoomId);
  if (!room || room.phase !== BLACK_PHASE.VOTE) return;
  const player = room.players.get(socket.blackSessionId);
  if (!player || !player.alive || player.ghost) return;
  const targetSessionId = safeText(message.targetSessionId, 120);
  const target = room.players.get(targetSessionId);
  if (!target || !target.alive || target.ghost || target.sessionId === player.sessionId) return;
  room.votes.set(player.sessionId, targetSessionId);
  player.voteTargetSessionId = targetSessionId;
  queueBlackEvent(room, `${blackPlayerLabel(player)} oy verdi.`);
  if (blackAlivePlayers(room).every((alivePlayer) => room.votes.has(alivePlayer.sessionId))) {
    finishBlackVote(room, "Oylar tamamlandı");
    return;
  }
  broadcastBlackRoom(room.id);
}

function setBlackNightTarget(socket, message) {
  const room = siyahAdamRooms.get(socket.blackRoomId);
  if (!room || room.phase !== BLACK_PHASE.NIGHT) return;
  if (socket.blackSessionId !== room.blackSessionId) return;
  const targetSessionId = safeText(message.targetSessionId, 120);
  const target = room.players.get(targetSessionId);
  const blackPlayer = room.players.get(room.blackSessionId);
  if (!target || !target.alive || target.ghost || target.sessionId === blackPlayer?.sessionId) return;
  room.nightTargetSessionId = targetSessionId;
  queueBlackEvent(room, `Siyah Adam hedef seçti.`);
  broadcastBlackRoom(room.id);
}

function startBlackGameBySocket(socket) {
  const room = siyahAdamRooms.get(socket.blackRoomId);
  if (!room || socket.blackSessionId !== room.hostSessionId) return;
  startBlackGame(room);
}

function callBlackMeeting(socket) {
  const room = siyahAdamRooms.get(socket.blackRoomId);
  if (!room || room.phase !== BLACK_PHASE.DAY || room.meetingCallsLeft <= 0) return;
  const player = room.players.get(socket.blackSessionId);
  if (!player || !player.alive || player.ghost) return;
  room.meetingCallsLeft -= 1;
  queueBlackEvent(room, `${blackPlayerLabel(player)} çember toplantısı çağırdı.`);
  startBlackVote(room, "Çember çağrıldı");
}

function leaveBlackRoom(socket) {
  const roomId = socket.blackRoomId;
  const sessionId = socket.blackSessionId;
  if (!roomId || !sessionId) return;
  const room = siyahAdamRooms.get(roomId);
  if (!room) {
    socket.blackRoomId = "";
    socket.blackSessionId = "";
    return;
  }

  const player = room.players.get(sessionId);
  if (player) {
    player.connected = false;
    player.disconnectedAt = Date.now();
    player.dx = 0;
    player.dy = 0;
    player.ready = false;
    if (room.phase === BLACK_PHASE.LOBBY || room.phase === BLACK_PHASE.ENDED) {
      room.players.delete(sessionId);
      room.votes.delete(sessionId);
    }
    if (room.hostSessionId === sessionId) {
      room.hostSessionId = blackRoomPlayerList(room).find((item) => item.sessionId !== sessionId)?.sessionId || "";
    }
    queueBlackEvent(room, `${blackPlayerLabel(player)} odadan ayrıldı.`);
  }

  if (room.players.size === 0 || (room.phase === BLACK_PHASE.ENDED && room.players.size === 0)) {
    siyahAdamRooms.delete(roomId);
  } else {
    broadcastBlackRoom(roomId);
  }

  socket.blackRoomId = "";
  socket.blackSessionId = "";
}

function tickBlackRooms() {
  const now = Date.now();
  for (const [roomId, room] of siyahAdamRooms) {
    for (const player of blackRoomPlayerList(room)) {
      if (!player.connected && player.disconnectedAt && now - player.disconnectedAt > BLACK_LIMITS.disconnectGraceMs) {
        if (room.phase !== BLACK_PHASE.LOBBY && room.phase !== BLACK_PHASE.ENDED && player.sessionId === room.blackSessionId) {
          endBlackGame(room, "crew", "Siyah Adam oyundan çıktı.");
          break;
        }
        room.players.delete(player.sessionId);
        room.votes.delete(player.sessionId);
      }
    }

    if (room.phase === BLACK_PHASE.LOBBY) {
      if (room.players.size >= BLACK_LIMITS.minPlayers && blackLivingPlayers(room).length === room.players.size && blackLivingPlayers(room).every((player) => player.ready)) {
        // Host başlatmadıkça bekle.
      }
      continue;
    }

    if (room.phase === BLACK_PHASE.DAY) {
      updateBlackMovement(room);
      if (room.phaseEndsAt && now >= room.phaseEndsAt) {
        startBlackVote(room, "Gündüz bitti");
      }
    } else if (room.phase === BLACK_PHASE.VOTE) {
      if (room.phaseEndsAt && now >= room.phaseEndsAt) {
        finishBlackVote(room, "Oylama bitti");
      }
    } else if (room.phase === BLACK_PHASE.NIGHT) {
      if (room.phaseEndsAt && now >= room.phaseEndsAt) {
        finishBlackNight(room, "Gece süresi bitti");
      }
    }

    if (room.phase !== BLACK_PHASE.LOBBY && room.phase !== BLACK_PHASE.ENDED) {
      const shouldBroadcast = !room.broadcastAt || now - room.broadcastAt > 80;
      if (shouldBroadcast) {
        room.broadcastAt = now;
        broadcastBlackRoom(roomId);
      }
    }
  }
}

function updateBlackMovement(room) {
  for (const player of blackRoomPlayerList(room)) {
    if (!player.connected || !player.alive || player.ghost) continue;
    const speed = BLACK_LIMITS.moveSpeed;
    player.x = clamp(player.x + player.dx * speed, 56, BLACK_LIMITS.arenaWidth - 56);
    player.y = clamp(player.y + player.dy * speed, 76, BLACK_LIMITS.arenaHeight - 76);
  }
}

function startBlackGame(room) {
  const activePlayers = blackRoomPlayerList(room).filter((player) => player.connected !== false);
  if (activePlayers.length < BLACK_LIMITS.minPlayers || activePlayers.length > BLACK_LIMITS.maxPlayers) {
    queueBlackEvent(room, "Başlatmak için 3-10 aktif oyuncu gerekli.");
    broadcastBlackRoom(room.id);
    return;
  }
  if (!activePlayers.every((player) => player.ready)) {
    queueBlackEvent(room, "Herkes hazır olmadan oyun başlamaz.");
    broadcastBlackRoom(room.id);
    return;
  }

  for (const player of blackRoomPlayerList(room)) {
    if (player.connected === false) {
      room.players.delete(player.sessionId);
      continue;
    }
    player.alive = true;
    player.ghost = false;
    player.ready = false;
    player.voteTargetSessionId = "";
    player.blackMarkedTargetSessionId = "";
    player.disconnectedAt = 0;
    player.dx = 0;
    player.dy = 0;
  }

  room.phase = BLACK_PHASE.DAY;
  room.round = 1;
  room.phaseEndsAt = Date.now() + BLACK_LIMITS.dayMs;
  room.meetingCallsLeft = 2;
  room.nightTargetSessionId = "";
  room.votes.clear();
  room.winner = "";
  room.lastEvent = "Oyun başladı.";
  room.events = [];
  room.blackSessionId = activePlayers[Math.floor(Math.random() * activePlayers.length)]?.sessionId || "";

  for (const player of activePlayers) {
    player.alive = true;
    player.ghost = false;
    player.ready = false;
    player.voteTargetSessionId = "";
    player.blackMarkedTargetSessionId = "";
    player.isBlack = player.sessionId === room.blackSessionId;
    if (!player.isBlack) {
      const position = spreadBlackSpawn(room, player.joinedAt);
      player.x = position.x;
      player.y = position.y;
    } else {
      player.x = BLACK_LIMITS.centerX;
      player.y = BLACK_LIMITS.centerY;
    }
  }

  queueBlackEvent(room, "Siyah Adam gizlendi.");
  broadcastBlackRoom(room.id);
}

function startBlackVote(room, reason) {
  if (room.phase === BLACK_PHASE.ENDED) return;
  room.phase = BLACK_PHASE.VOTE;
  room.phaseEndsAt = Date.now() + BLACK_LIMITS.voteMs;
  room.votes.clear();
  room.nightTargetSessionId = "";
  for (const player of blackRoomPlayerList(room)) {
    player.voteTargetSessionId = "";
    if (player.alive && !player.ghost) {
      player.x = moveToMeetingCircle(player, room).x;
      player.y = moveToMeetingCircle(player, room).y;
    }
  }
  queueBlackEvent(room, reason);
  broadcastBlackRoom(room.id);
}

function finishBlackVote(room, reason) {
  if (room.phase === BLACK_PHASE.ENDED) return;
  const votes = new Map();
  for (const [voterSessionId, targetSessionId] of room.votes) {
    const voter = room.players.get(voterSessionId);
    const target = room.players.get(targetSessionId);
    if (!voter || !target || !voter.alive || voter.ghost || !target.alive || target.ghost) continue;
    votes.set(targetSessionId, (votes.get(targetSessionId) || 0) + 1);
  }

  const sortedVotes = [...votes.entries()].sort((first, second) => second[1] - first[1]);
  const topVote = sortedVotes[0] || null;
  const isTie = sortedVotes.length > 1 && sortedVotes[0][1] === sortedVotes[1][1];
  if (topVote && !isTie) {
    const target = room.players.get(topVote[0]);
    if (target) {
      target.alive = false;
      target.ghost = true;
      target.dx = 0;
      target.dy = 0;
      if (target.sessionId === room.blackSessionId) {
        endBlackGame(room, "crew", `${blackPlayerLabel(target)} bulundu.`);
        return;
      }
      queueBlackEvent(room, `${blackPlayerLabel(target)} çemberde elendi.`);
    }
  } else {
    queueBlackEvent(room, "Oylama berabere bitti.");
  }

  if (checkBlackVictory(room)) {
    endBlackGame(room, "black", "Siyah Adam son kalan kişi oldu.");
    return;
  }

  room.phase = BLACK_PHASE.NIGHT;
  room.phaseEndsAt = Date.now() + BLACK_LIMITS.nightMs;
  room.round += 1;
  room.nightTargetSessionId = "";
  for (const player of blackRoomPlayerList(room)) {
    player.voteTargetSessionId = "";
  }
  queueBlackEvent(room, reason);
  broadcastBlackRoom(room.id);
}

function finishBlackNight(room, reason) {
  if (room.phase === BLACK_PHASE.ENDED) return;
  const blackPlayer = room.players.get(room.blackSessionId);
  if (!blackPlayer || !blackPlayer.alive || blackPlayer.ghost) {
    endBlackGame(room, "crew", "Siyah Adam kayboldu.");
    return;
  }

  let target = room.nightTargetSessionId ? room.players.get(room.nightTargetSessionId) : null;
  if (!target || !target.alive || target.ghost || target.sessionId === blackPlayer.sessionId) {
    const candidates = blackRoomPlayerList(room).filter((player) => player.alive && !player.ghost && player.sessionId !== blackPlayer.sessionId);
    target = candidates[Math.floor(Math.random() * candidates.length)] || null;
  }

  if (target) {
    target.alive = false;
    target.ghost = true;
    target.dx = 0;
    target.dy = 0;
    queueBlackEvent(room, `${blackPlayerLabel(target)} gece ele geçirildi.`);
    if (target.sessionId === room.blackSessionId) {
      endBlackGame(room, "crew", `${blackPlayerLabel(target)} siyah rolden düştü.`);
      return;
    }
  } else {
    queueBlackEvent(room, "Gece kimse ele geçirilemedi.");
  }

  if (checkBlackVictory(room)) {
    endBlackGame(room, "black", "Siyah Adam son kalan kişi oldu.");
    return;
  }

  room.phase = BLACK_PHASE.DAY;
  room.phaseEndsAt = Date.now() + BLACK_LIMITS.dayMs;
  room.nightTargetSessionId = "";
  scatterBlackPlayers(room);
  queueBlackEvent(room, reason);
  broadcastBlackRoom(room.id);
}

function endBlackGame(room, winner, reason) {
  room.phase = BLACK_PHASE.ENDED;
  room.phaseEndsAt = 0;
  room.winner = winner;
  room.lastEvent = reason || (winner === "black" ? "Siyah Adam kazandı." : "Diğerleri kazandı.");
  room.events = [
    { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text: room.lastEvent, createdAt: new Date().toISOString() },
    ...room.events,
  ].slice(0, 8);
  for (const player of blackRoomPlayerList(room)) {
    player.ready = false;
    player.voteTargetSessionId = "";
    player.blackMarkedTargetSessionId = "";
    player.dx = 0;
    player.dy = 0;
  }
  broadcastBlackRoom(room.id);
}

function checkBlackVictory(room) {
  const living = blackRoomPlayerList(room).filter((player) => player.connected !== false && player.alive && !player.ghost);
  return living.length <= 1 && living.some((player) => player.sessionId === room.blackSessionId);
}

function spreadBlackSpawn(room, seed) {
  const index = blackRoomPlayerList(room).filter((player) => player.alive && !player.ghost).length + (seed % 5);
  const angle = (index / Math.max(1, room.players.size)) * Math.PI * 2;
  return {
    x: clamp(BLACK_LIMITS.centerX + Math.cos(angle) * 320, 80, BLACK_LIMITS.arenaWidth - 80),
    y: clamp(BLACK_LIMITS.centerY + Math.sin(angle) * 220, 100, BLACK_LIMITS.arenaHeight - 100),
  };
}

function scatterBlackPlayers(room) {
  const alivePlayers = blackRoomPlayerList(room).filter((player) => player.alive && !player.ghost);
  alivePlayers.forEach((player, index) => {
    if (player.sessionId === room.blackSessionId) return;
    const angle = (index / Math.max(1, alivePlayers.length)) * Math.PI * 2;
    player.x = clamp(BLACK_LIMITS.centerX + Math.cos(angle) * 330, 70, BLACK_LIMITS.arenaWidth - 70);
    player.y = clamp(BLACK_LIMITS.centerY + Math.sin(angle) * 230, 90, BLACK_LIMITS.arenaHeight - 90);
  });
  const blackPlayer = room.players.get(room.blackSessionId);
  if (blackPlayer && blackPlayer.alive && !blackPlayer.ghost) {
    blackPlayer.x = BLACK_LIMITS.centerX;
    blackPlayer.y = BLACK_LIMITS.centerY;
  }
}

function moveToMeetingCircle(player, room) {
  const alivePlayers = blackRoomPlayerList(room).filter((item) => item.alive && !item.ghost);
  const index = Math.max(0, alivePlayers.findIndex((item) => item.sessionId === player.sessionId));
  const angle = (index / Math.max(1, alivePlayers.length)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: clamp(BLACK_LIMITS.centerX + Math.cos(angle) * 240, 100, BLACK_LIMITS.arenaWidth - 100),
    y: clamp(BLACK_LIMITS.centerY + Math.sin(angle) * 160, 110, BLACK_LIMITS.arenaHeight - 110),
  };
}

function broadcastBlackRoom(roomId) {
  const room = siyahAdamRooms.get(roomId);
  if (!room) return;
  for (const client of siyahAdamSocketServer.clients) {
    if (client.blackRoomId !== room.id || client.readyState !== 1) continue;
    const state = publicBlackRoom(room, client.blackSessionId);
    client.send(JSON.stringify({
      type: "black-state",
      state,
    }));
  }
}
