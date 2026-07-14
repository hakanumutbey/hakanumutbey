import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const distRoot = join(root, "dist");
const dataRoot = process.env.DATA_DIR || join(root, ".data");
const port = Number(process.env.PORT || 3000);
const announcementPasswordHash =
  process.env.ANNOUNCEMENT_PASSWORD_HASH ||
  "ed7131195cfb7baf313567082394af98a2215e972720fa0b0853505b575b5fa4";
const sessions = new Map();
const games = ["annenden-kac", "bardak", "essiz-zindan", "skeleton-wars", "vale", "robot-avcisi"];
const baseValues = {
  "annenden-kac": 128,
  bardak: 96,
  "essiz-zindan": 154,
  "skeleton-wars": 188,
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
let announcements = await readJson("announcements.json", []);

createServer(async (request, response) => {
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
}).listen(port, () => {
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
  if (request.method === "GET" && url.pathname === "/api/announcements") {
    sendJson(response, announcements.slice(0, 20));
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

function passwordHash(value) {
  return createHash("sha256").update(value || "", "utf8").digest("hex");
}
