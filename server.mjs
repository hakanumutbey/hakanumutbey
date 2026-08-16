import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
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
const adminPasswordHash =
  process.env.ADMIN_PASSWORD_HASH ||
  "5a17dd61a7a6808f9b5b7634cdcb8cfd70d2bc531309d32511a3ec60be97fa5a";
const adminBackupPasswordHash =
  process.env.ADMIN_BACKUP_PASSWORD_HASH ||
  "0fb013de181a8ac917ee0c563bf0b674ecd3cccfa43f4dfe3de07cae050de7d4";
const recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY || "";
const recaptchaSecret = process.env.RECAPTCHA_SECRET || "";
const githubApiBase = process.env.GITHUB_API_BASE || "https://api.github.com";
const sessions = new Map();
const voiceRooms = new Map();
const siyahAdamRooms = new Map();
const yarisSehriWorlds = new Map();
const games = ["annenden-kac", "bardak", "essiz-zindan", "skeleton-wars", "rhgpo", "siyah-adam", "birlesim-arenasi", "vale", "robot-avcisi", "hentw", "hentw2", "hentw3", "hentw-premium", "siber-polis", "space-arena", "2d-car-simulator", "yaris-sehri"];
const baseValues = {
  "annenden-kac": 128,
  bardak: 96,
  "essiz-zindan": 154,
  "skeleton-wars": 188,
  rhgpo: 121,
  "siyah-adam": 168,
  "birlesim-arenasi": 205,
  vale: 112,
  "robot-avcisi": 173,
  hentw: 132,
  hentw2: 148,
  hentw3: 176,
  "hentw-premium": 210,
  "siber-polis": 140,
  "2d-car-simulator": 99,
  "yaris-sehri": 195,
};
const averagePlayMinutes = {
  "annenden-kac": 6,
  bardak: 4,
  "essiz-zindan": 11,
  "skeleton-wars": 9,
  rhgpo: 7,
  "siyah-adam": 12,
  "birlesim-arenasi": 10,
  vale: 8,
  "robot-avcisi": 13,
  hentw: 8,
  hentw2: 9,
  hentw3: 12,
  "hentw-premium": 14,
  "siber-polis": 12,
  "2d-car-simulator": 8,
  "yaris-sehri": 12,
};
const voteOptionIds = ["uzay-yarisi", "market-savasi", "okul-gorevi"];

// Sezon temaları: 7'şer gün, bu sırayla döner. İlk 3 hafta "zaman" sezonları:
// 1 arabaci (Hakorocks Şehri WS süresi) → 2 araba-zaman → 3 site-zaman → yarisci → polis
// → akrobasi → buz → altin → araba-simulator (bölüm sayılı) → 10-24: diğer oyunların
// "oyun-zamanı" sezonları (kind: "game-time", heartbeat süresi) → başa dön.
// Yüklemenin (load) öncesinde tanımlı olmalı — normalizeYarisSeason modül başında çalışır.
const YARIS_SEASON_OBJECTIVES = [
  { id: "arabaci", name: "🚗 Arabacı Sezonu", desc: "Hakorocks Şehri'nde en çok zaman geçiren kazanır.", unit: "time", kind: "ws-time", game: { slug: "yaris-sehri", name: "Hakorocks Şehri" } },
  { id: "araba-zaman", name: "🏎️ 2D Car Simulator Zaman Sezonu", desc: "2D Car Simulator'da en çok zaman geçiren kazanır.", unit: "time", kind: "game-time", game: { slug: "2d-car-simulator", name: "2D Car Simulator" } },
  { id: "site-zaman", name: "🌐 Site Zamanı Sezonu", desc: "Sitede toplam en çok zaman geçiren kazanır.", unit: "time", kind: "site-time", game: { slug: "", name: "Hakorocks Studio" } },
  { id: "yarisci", name: "🏁 Yarışçı Sezonu", desc: "En çok yarış (açık dünya + dereceli) kazanan.", unit: "win", game: { slug: "yaris-sehri", name: "Hakorocks Şehri" } },
  { id: "polis", name: "🚔 Polis Sezonu", desc: "Kovalamacada en çok galibiyet alan takım üyesi.", unit: "win", game: { slug: "yaris-sehri", name: "Hakorocks Şehri" } },
  { id: "akrobasi", name: "🛞 Akrobasi Sezonu", desc: "Tek Mod'da haftalık toplam puanı en yüksek olan.", unit: "point", game: { slug: "yaris-sehri", name: "Hakorocks Şehri" } },
  { id: "buz", name: "🧊 Buz Ustası Sezonu", desc: "Buzlu Zemin'de haftalık toplam puanı en yüksek olan.", unit: "point", game: { slug: "yaris-sehri", name: "Hakorocks Şehri" } },
  { id: "altin", name: "🪙 Altın Avcısı Sezonu", desc: "Haftanın en çok altın kazananı (harcamalar sayılmaz).", unit: "gold", game: { slug: "yaris-sehri", name: "Hakorocks Şehri" } },
  { id: "araba-simulator", name: "🚗 2D Car Simulator Sezonu", desc: "Haftanın en çok bölüm tamamlayanı.", unit: "win", game: { slug: "2d-car-simulator", name: "2D Car Simulator" } },
  // --- Diğer oyunların oyun-zamanı sezonları (heartbeat tabanlı) ---
  { id: "skeleton-wars", name: "💀 İskelet Savaşçısı Sezonu", desc: "Skeleton Wars'ta en uzun süre kılıç sallayan savaşçı kazanır.", unit: "time", kind: "game-time", game: { slug: "skeleton-wars", name: "Skeleton Wars" } },
  { id: "siber-polis", name: "👮 Siber Polis Sezonu", desc: "Vaka dosyalarında en çok mesai yapan dedektif kazanır.", unit: "time", kind: "game-time", game: { slug: "siber-polis", name: "Siber Polis" } },
  { id: "space-arena", name: "🚀 Uzay Arenası Sezonu", desc: "Uzay Arenası'nda en çok dövüş ve parkur antrenmanı yapan kazanır.", unit: "time", kind: "game-time", game: { slug: "space-arena", name: "Space Arena" } },
  { id: "annenden-kac", name: "🏃 Kaçış Ustası Sezonu", desc: "Annenden Kaç'ta kaçış antrenmanına en çok vakit ayıran kazanır.", unit: "time", kind: "game-time", game: { slug: "annenden-kac", name: "Annenden Kaç" } },
  { id: "bardak", name: "🥤 Bardak Şampiyonu Sezonu", desc: "Bardak'ta en çok atış antrenmanı yapan kazanır.", unit: "time", kind: "game-time", game: { slug: "bardak", name: "Bardak" } },
  { id: "birlesim-arenasi", name: "⚔️ Birleşim Arenası Sezonu", desc: "Birleşim Arenası'nda en çok strateji kuran kazanır.", unit: "time", kind: "game-time", game: { slug: "birlesim-arenasi", name: "Birleşim Arenası" } },
  { id: "robot-avcisi", name: "🤖 Robot Avcısı Sezonu", desc: "Robot Avcısı'nda en uzun av süresini yapan kazanır.", unit: "time", kind: "game-time", game: { slug: "robot-avcisi", name: "Robot Avcısı" } },
  { id: "vale", name: "🚗 Vale Sezonu", desc: "Vale'de en çok park mesaisi yapan sürücü kazanır.", unit: "time", kind: "game-time", game: { slug: "vale", name: "Vale" } },
  { id: "essiz-zindan", name: "🏰 Zindan Kaşifi Sezonu", desc: "Eşsiz Zindan'da keşfe en çok vakit ayıran kaşif kazanır.", unit: "time", kind: "game-time", game: { slug: "essiz-zindan", name: "Eşsiz Zindan" } },
  { id: "rhgpo", name: "🎯 RHGPO Ustası Sezonu", desc: "RHGPO'da en çok oynama süresi biriktiren kazanır.", unit: "time", kind: "game-time", game: { slug: "rhgpo", name: "RHGPO" } },
  { id: "siyah-adam", name: "🕵️ Siyah Adam Sezonu", desc: "Siyah Adam'da en çok şüpheli kovalayan kazanır.", unit: "time", kind: "game-time", game: { slug: "siyah-adam", name: "Siyah Adam" } },
  { id: "hentw", name: "🛡️ HENTW Sezonu", desc: "HENTW üssünü en uzun süre savunan kazanır.", unit: "time", kind: "game-time", game: { slug: "hentw", name: "HENTW" } },
  { id: "hentw2", name: "🌊 HENTW 2 Sezonu", desc: "HENTW 2 haritalarında en çok dalga atlatan kazanır.", unit: "time", kind: "game-time", game: { slug: "hentw2", name: "HENTW 2" } },
  { id: "hentw3", name: "🔥 HENTW 3 Sezonu", desc: "HENTW 3'te ateş hattında en çok kalan kazanır.", unit: "time", kind: "game-time", game: { slug: "hentw3", name: "HENTW 3" } },
  { id: "hentw-premium", name: "💎 HENTW Premium Sezonu", desc: "HENTW Premium'da en çok malzeme toplayan kazanır.", unit: "time", kind: "game-time", game: { slug: "hentw-premium", name: "HENTW Premium" } },
];

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
let comments = normalizeComments(await readJson("comments.json", []));
let votes = normalizeVotes(await readJson("votes.json", { voters: {} }));
let clickScores = normalizeClickScores(await readJson("click-scores.json", []));
let accounts = normalizeAccounts(await readJson("accounts.json", []));
accounts = await ensureDefaultBotAccounts(accounts);
let friendRequests = normalizeFriendRequests(await readJson("friend-requests.json", []));
let invites = normalizeInvites(await readJson("invites.json", []));
// İstenen hesap temizliği: hakorocks / hakorock takma adları
{
  const purgeNicks = new Set(["hakorocks", "hakorock"]);
  const removedIds = new Set();
  const kept = [];
  for (const account of accounts) {
    if (purgeNicks.has(normalizeNickname(account.nickname))) {
      removedIds.add(account.id);
      continue;
    }
    kept.push(account);
  }
  if (removedIds.size > 0) {
    accounts = kept.map((account) => ({
      ...account,
      friends: (account.friends || []).filter((id) => !removedIds.has(id)),
    }));
    friendRequests = friendRequests.filter(
      (item) => !removedIds.has(item.fromAccountId) && !removedIds.has(item.toAccountId),
    );
    invites = invites.filter(
      (item) => !removedIds.has(item.fromAccountId) && !removedIds.has(item.toAccountId),
    );
    await writeJson("accounts.json", accounts);
    await writeJson("friend-requests.json", friendRequests);
    await writeJson("invites.json", invites);
    console.log(`[accounts] purged nicknames: ${[...purgeNicks].join(", ")} (${removedIds.size} hesap)`);
  }
}
let adminState = normalizeAdminState(await readJson("admin.json", {}));
let yarisSeason = normalizeYarisSeason(await readJson("yaris-season.json", null));
const adminTokens = new Map();
const adminAuthSessions = new Map();
let githubConsecutiveFailures = 0;
let securityLogRaw = await readJson("security-log.json", []);
let securityLog = Array.isArray(securityLogRaw) ? securityLogRaw.slice(0, 200) : [];
securityLogRaw = null;

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

const yarisSehriSocketServer = new WebSocketServer({ noServer: true });
yarisSehriSocketServer.on("connection", (socket) => {
  socket.yarisPlayerId = "";
  socket.yarisWorldId = "";
  socket.yarisLastPosAt = 0;
  socket.yarisRanked = false;

  socket.on("message", (raw) => {
    if (raw.length > 4000) return;
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message?.type === "join") {
      joinYarisWorld(socket, message);
      return;
    }
    if (message?.type === "ranked-queue") {
      joinYarisRankedQueue(socket, message);
      return;
    }
    if (message?.type === "ranked-leave") {
      leaveYarisRankedQueue(socket);
      return;
    }
    if (message?.type === "pos") {
      setYarisPos(socket, message);
      return;
    }
    if (message?.type === "race-join") {
      yarisRaceJoin(socket);
      return;
    }
    if (message?.type === "race-leave") {
      yarisRaceLeave(socket);
      return;
    }
    if (message?.type === "race-checkpoint") {
      yarisRaceCheckpoint(socket, message);
      return;
    }
    if (message?.type === "tt-finish") {
      yarisTimeTrialFinish(socket, message);
      return;
    }
    if (message?.type === "chat") {
      handleYarisChat(socket, message);
      return;
    }
    if (message?.type === "chase-create") {
      joinYarisChase(socket, message, true);
      return;
    }
    if (message?.type === "chase-join") {
      joinYarisChase(socket, message, false);
      return;
    }
    if (message?.type === "chase-teamsize") {
      setYarisChaseTeamSize(socket, message);
      return;
    }
    if (message?.type === "chase-map") {
      setYarisChaseMap(socket, message);
      return;
    }
    if (message?.type === "chase-start") {
      startYarisChaseBySocket(socket);
      return;
    }
    if (message?.type === "leave") {
      leaveYarisWorld(socket);
      return;
    }
  });

  socket.on("close", () => {
    leaveYarisRankedQueue(socket);
    leaveYarisWorld(socket);
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
  if (pathname === "/yaris-sehri") {
    yarisSehriSocketServer.handleUpgrade(request, socket, head, (ws) => {
      yarisSehriSocketServer.emit("connection", ws, request);
    });
    return;
  }
  socket.destroy();
});

setInterval(() => {
  tickBlackRooms();
  tickYarisWorlds();
  tickYarisRankedQueue();
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
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, {
      ok: true,
      status: "Çalışıyor",
      buildVersion: process.env.BUILD_VERSION || "local",
      activeServer: request.headers.host || "local",
      uptimeSeconds: Math.round(process.uptime()),
      onlinePlayers: sessions.size,
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/photos") {
    sendJson(response, photos.slice(0, 40).map(publicPhoto));
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
  if (request.method === "GET" && url.pathname === "/api/comments") {
    const slug = games.includes(url.searchParams.get("slug")) ? url.searchParams.get("slug") : "";
    sendJson(response, commentSnapshot(slug));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/votes") {
    sendJson(response, currentVotes());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/click-game") {
    const sessionId = safeText(url.searchParams.get("sessionId"), 120);
    sendJson(response, clickGameSnapshot(sessionId));
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
      const activeGame = games.includes(body.activeGame) ? body.activeGame : "";
      sessions.set(sessionId, {
        lastSeen: Date.now(),
        device: ["mobile", "tablet", "desktop"].includes(body.device) ? body.device : "desktop",
        activeGame,
      });
      trackSeasonHeartbeat(sessionId, activeGame);
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
      likedBy: [],
      createdAt: new Date().toISOString(),
    };
    photos = [photo, ...photos].slice(0, 60);
    await writeJson("photos.json", photos);
    sendJson(response, publicPhoto(photo));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/photo-like") {
    const body = await readBody(request, 64_000);
    const photoId = safeText(body.photoId, 120);
    const sessionId = safeText(body.sessionId, 120);
    const photo = photos.find((item) => item.id === photoId);
    if (!photo || !sessionId) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-photo-like" }));
      return;
    }
    photo.likedBy = Array.isArray(photo.likedBy) ? photo.likedBy.map((item) => safeText(item, 120)).filter(Boolean) : [];
    const index = photo.likedBy.indexOf(sessionId);
    if (index >= 0) {
      photo.likedBy.splice(index, 1);
    } else {
      photo.likedBy.push(sessionId);
    }
    await writeJson("photos.json", photos);
    sendJson(response, photos.slice(0, 40).map(publicPhoto));
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
  if (request.method === "POST" && url.pathname === "/api/comments") {
    const body = await readBody(request, 64_000);
    const slug = games.includes(body.slug) ? body.slug : "";
    const name = safeText(body.name, 32) || "Oyuncu";
    const message = safeText(body.message, 220);
    if (!slug || message.length < 2) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-comment" }));
      return;
    }
    const entry = {
      id: createRecordId("comment"),
      slug,
      name,
      message,
      createdAt: new Date().toISOString(),
    };
    comments = [entry, ...comments].slice(0, 240);
    await writeJson("comments.json", comments);
    sendJson(response, commentSnapshot(slug));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/votes") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    const optionId = safeText(body.optionId, 40);
    if (!sessionId || !voteOptionIds.includes(optionId)) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-vote" }));
      return;
    }
    votes.voters[sessionId] = optionId;
    await writeJson("votes.json", votes);
    sendJson(response, currentVotes());
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/click-game") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    const name = safeText(body.name, 32) || "Oyuncu";
    const score = Number(body.score);
    const durationMs = Number(body.durationMs);
    if (!sessionId || !Number.isInteger(score) || score < 0 || score > 1800 || durationMs < 55_000 || durationMs > 75_000) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-click-score" }));
      return;
    }
    const now = new Date().toISOString();
    const existing = clickScores.find((entry) => entry.sessionId === sessionId);
    if (!existing) {
      clickScores.push({
        id: createRecordId("click"),
        sessionId,
        name,
        score,
        durationMs,
        createdAt: now,
        updatedAt: now,
      });
    } else if (score >= existing.score) {
      existing.name = name;
      existing.score = score;
      existing.durationMs = durationMs;
      existing.updatedAt = now;
    } else {
      existing.name = name;
      existing.updatedAt = now;
    }
    clickScores = sortClickScores(clickScores).slice(0, 120);
    await writeJson("click-scores.json", clickScores);
    sendJson(response, clickGameSnapshot(sessionId));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readBody(request, 64_000);
    const result = registerAccount({
      sessionId: safeText(body.sessionId, 120),
      name: safeText(body.name, 40),
      nickname: safeText(body.nickname, 24),
      password: body.password,
    });
    if (result.error) {
      response.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: result.error, message: result.message || "" }));
      return;
    }
    await writeJson("accounts.json", accounts);
    sendJson(response, {
      ...accountSnapshot(result.sessionId),
      welcomeName: result.account.name,
      authToken: result.account.authToken,
      created: true,
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(request, 64_000);
    const result = loginAccount({
      sessionId: safeText(body.sessionId, 120),
      name: safeText(body.name, 40),
      password: body.password,
    });
    if (result.error) {
      response.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: result.error, message: result.message || "" }));
      return;
    }
    await writeJson("accounts.json", accounts);
    sendJson(response, {
      ...accountSnapshot(result.sessionId),
      welcomeName: result.account.name,
      authToken: result.account.authToken,
      created: false,
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/resume") {
    const body = await readBody(request, 64_000);
    const result = resumeAccount({
      sessionId: safeText(body.sessionId, 120),
      authToken: safeText(body.authToken, 128),
    });
    if (result.error) {
      response.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: result.error, message: result.message || "" }));
      return;
    }
    await writeJson("accounts.json", accounts);
    sendJson(response, {
      ...accountSnapshot(result.sessionId),
      welcomeName: result.account.name,
      authToken: result.account.authToken,
      resumed: true,
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/season-score") {
    // Genel sezon skoru (yaris dışı oyunlar için): sadece aktif sezonun oyunu sayılır.
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const game = safeText(body.game, 40);
    const kind = safeText(body.kind, 30);
    const amount = Math.floor(Number(body.amount));
    const SEASON_SCORE_KINDS = { "level-complete": { maxAmount: 1, objective: "araba-simulator" } };
    const kindDef = SEASON_SCORE_KINDS[kind];
    if (!kindDef || !Number.isFinite(amount) || amount < 1 || amount > kindDef.maxAmount) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-score", message: "Skor geçersiz." }));
      return;
    }
    const objective = yarisSeasonObjective(yarisSeason.season);
    if (objective.game.slug !== game || objective.id !== kindDef.objective) {
      // Farklı sezon aktif: hata değil, sadece sayılmaz (istemci sessizce geçer)
      sendJson(response, { ok: true, counted: false, season: yarisSeason.season, objective: objective.id });
      return;
    }
    if (!checkSeasonScoreRateLimit(account.id)) {
      response.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "rate-limited", message: "Çok hızlı skor gönderiyorsun, biraz bekle." }));
      return;
    }
    addYarisSeasonScore(account, objective.id, amount);
    // Bölüm sezonu (araba-simulator): her level-complete bildirimi +5 altın (tek cüzdana)
    let goldEarned = 0;
    if (objective.id === "araba-simulator") {
      goldEarned = 5 * amount;
      const profile = yarisProfileOf(account);
      profile.gold += goldEarned;
      writeJson("accounts.json", accounts).catch(() => {});
    }
    sendJson(response, {
      ok: true,
      counted: true,
      score: yarisSeason.scores[account.id]?.score || 0,
      goldEarned,
      season: yarisSeason.season,
      objective: objective.id,
    });
    return;
  }
  if (request.method === "GET" && (url.pathname === "/api/yaris-sehri/leaderboard" || url.pathname === "/api/seasons/leaderboard")) {
    // Public (auth'suz): mevcut sezon + ilk 20 + geçmiş sezon şampiyonları.
    // Canonical: /api/seasons/leaderboard (eski yaris-sehri yolu geriye uyumluluk için durur).
    const objective = yarisSeasonObjective(yarisSeason.season);
    // Sezonda oynayarak altın kazanma bilgisi (site gösterebilir)
    const goldReward = ["ws-time", "game-time", "site-time"].includes(objective.kind)
      ? { text: "Bu sezonda oynadıkça altın kazanırsın: her 5 dakika +1 altın!", goldPerSeconds: 300, gold: 1 }
      : objective.id === "araba-simulator"
        ? { text: "Bu sezonda her tamamlanan bölüm +5 altın!", goldPer: "level-complete", gold: 5 }
        : null;
    const top = Object.entries(yarisSeason.scores)
      .map(([accountId, entry]) => ({
        accountId,
        nickname: safeText(entry?.nickname, 24) || "oyuncu",
        score: clamp(Math.floor(Number(entry?.score) || 0), 0, 100000000),
        updatedAt: Number(entry?.updatedAt) || 0,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt)
      .slice(0, 20)
      .map(({ nickname, score }) => ({ nickname, score }));
    sendJson(response, {
      season: yarisSeason.season,
      objective,
      game: objective.game,
      goldReward,
      startedAt: yarisSeason.startedAt,
      endsAt: yarisSeason.endsAt,
      top,
      pastSeasons: yarisSeason.pastSeasons,
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/yaris-sehri/profile") {    const account = yarisAccountFromAuth(
      safeText(url.searchParams.get("sessionId"), 120),
      safeText(url.searchParams.get("authToken"), 128),
    );
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    sendJson(response, { ok: true, profile: yarisProfileOf(account), cars: YARIS_CARS, paints: YARIS_PAINTS });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/yaris-sehri/buy-paint") {
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const paintId = safeText(body.paintId, 24);
    const paint = YARIS_PAINTS.find((item) => item.id === paintId);
    const profile = yarisProfileOf(account);
    if (!paint) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "unknown-paint", message: "Böyle bir boya yok." }));
      return;
    }
    if (profile.paints.includes(paint.id)) {
      response.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "already-owned", message: "Bu boya zaten sende var." }));
      return;
    }
    if (profile.gold < paint.price) {
      response.writeHead(402, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-enough-gold", message: "Yeterli altının yok." }));
      return;
    }
    profile.gold -= paint.price;
    profile.paints.push(paint.id);
    profile.selectedPaint = paint.id;
    await writeJson("accounts.json", accounts);
    sendJson(response, { ok: true, profile });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/yaris-sehri/select-paint") {
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const paintId = safeText(body.paintId, 24);
    const profile = yarisProfileOf(account);
    if (!profile.paints.includes(paintId)) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-owned", message: "Bu boyaya sahip değilsin." }));
      return;
    }
    profile.selectedPaint = paintId;
    await writeJson("accounts.json", accounts);
    sendJson(response, { ok: true, profile });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/yaris-sehri/buy-car") {
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const carId = safeText(body.carId, 24);
    const car = YARIS_CARS.find((item) => item.id === carId);
    const profile = yarisProfileOf(account);
    if (!car) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "unknown-car", message: "Böyle bir araba yok." }));
      return;
    }
    if (profile.cars.includes(car.id)) {
      response.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "already-owned", message: "Bu araba zaten garajında." }));
      return;
    }
    if (profile.gold < car.price) {
      response.writeHead(402, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-enough-gold", message: "Yeterli altının yok." }));
      return;
    }
    profile.gold -= car.price;
    profile.cars.push(car.id);
    profile.selectedCar = car.id;
    await writeJson("accounts.json", accounts);
    sendJson(response, { ok: true, profile, cars: YARIS_CARS });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/yaris-sehri/select-car") {
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const carId = safeText(body.carId, 24);
    const profile = yarisProfileOf(account);
    if (!profile.cars.includes(carId)) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-owned", message: "Bu arabaya sahip değilsin." }));
      return;
    }
    profile.selectedCar = carId;
    await writeJson("accounts.json", accounts);
    sendJson(response, { ok: true, profile });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/yaris-sehri/tutorial-done") {
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const profile = yarisProfileOf(account);
    let goldEarned = 0;
    if (!profile.tutorialDone) {
      profile.tutorialDone = true;
      goldEarned = 20;
      profile.gold += goldEarned;
      addYarisSeasonGold(account, goldEarned);
      await writeJson("accounts.json", accounts);
    }
    sendJson(response, { ok: true, profile, goldEarned });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/yaris-sehri/stunt-score") {
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const score = Math.floor(Number(body.score));
    if (!Number.isFinite(score) || score < 0 || score > 500000) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-score", message: "Skor geçersiz." }));
      return;
    }
    const profile = yarisProfileOf(account);
    let goldEarned = 0;
    if (score > profile.stuntBest) {
      // Sadece yeni rekor farkı kadar altın ver (skor/100 kuralı).
      goldEarned = Math.floor(score / 100) - Math.floor(profile.stuntBest / 100);
      addYarisSeasonScore(account, "akrobasi", score - profile.stuntBest); // haftalık puan
      addYarisSeasonGold(account, goldEarned);
      profile.stuntBest = score;
      profile.gold += goldEarned;
      await writeJson("accounts.json", accounts);
    }
    sendJson(response, { ok: true, profile, goldEarned });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/yaris-sehri/ice-score") {
    const body = await readBody(request, 16_000);
    const account = yarisAccountFromAuth(safeText(body.sessionId, 120), safeText(body.authToken, 128));
    if (!account) {
      response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth", message: "Oturum doğrulanamadı." }));
      return;
    }
    const score = Math.floor(Number(body.score));
    const deaths = Math.floor(Number(body.deaths));
    if (!Number.isFinite(score) || score < 0 || score > 500000 || !Number.isFinite(deaths) || deaths < 0 || deaths > 500) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-score", message: "Skor geçersiz." }));
      return;
    }
    const profile = yarisProfileOf(account);
    let goldEarned = 0;
    if (score > profile.iceBest) {
      // Buzlu Zemin: skor/150 altın, sadece yeni rekor farkı kadar.
      goldEarned = Math.floor(score / 150) - Math.floor(profile.iceBest / 150);
      addYarisSeasonScore(account, "buz", score - profile.iceBest); // haftalık puan
      addYarisSeasonGold(account, goldEarned);
      profile.iceBest = score;
      profile.gold += goldEarned;
      await writeJson("accounts.json", accounts);
    }
    sendJson(response, { ok: true, profile, goldEarned });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/delete") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    const password = body.password;
    const account = accountBySessionId(sessionId);
    if (!account) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "account-missing", message: "Aktif hesap yok." }));
      return;
    }
    if (account.passwordHash) {
      const hash = passwordHash(normalizePassword(password));
      if (hash !== account.passwordHash) {
        response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "wrong-password", message: "Şifre yanlış." }));
        return;
      }
    }
    const deletedId = account.id;
    accounts = accounts.filter((item) => item.id !== deletedId);
    friendRequests = friendRequests.filter((item) => item.fromAccountId !== deletedId && item.toAccountId !== deletedId);
    invites = invites.filter((item) => item.fromAccountId !== deletedId && item.toAccountId !== deletedId);
    accounts = accounts.map((item) => ({
      ...item,
      friends: (item.friends || []).filter((friendId) => friendId !== deletedId),
    }));
    await writeJson("accounts.json", accounts);
    await writeJson("friend-requests.json", friendRequests);
    await writeJson("invites.json", invites);
    sendJson(response, { ok: true, ...accountSnapshot(sessionId) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/delete-all") {
    const body = await readBody(request, 64_000);
    const confirm = safeText(body.confirm, 40).toLocaleLowerCase("tr-TR");
    if (confirm !== "hepsini sil" && confirm !== "delete-all") {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({
        error: "confirm-required",
        message: "Onay için 'hepsini sil' yazılmalı.",
      }));
      return;
    }
    accounts = [];
    friendRequests = [];
    invites = [];
    await writeJson("accounts.json", accounts);
    await writeJson("friend-requests.json", friendRequests);
    await writeJson("invites.json", invites);
    sendJson(response, { ok: true, cleared: true, account: null, people: [], friends: [], incomingRequests: [], outgoingRequests: [], invites: [] });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const body = await readBody(request, 64_000);
    const sessionId = safeText(body.sessionId, 120);
    if (sessionId) {
      accounts = accounts.map((account) => (
        account.sessionId === sessionId
          ? { ...account, sessionId: "", updatedAt: new Date().toISOString() }
          : account
      ));
      await writeJson("accounts.json", accounts);
    }
    sendJson(response, { ok: true, ...accountSnapshot("") });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/account") {
    const body = await readBody(request, 250_000);
    const sessionId = safeText(body.sessionId, 120);
    const name = safeText(body.name, 40);
    const nickname = safeText(body.nickname, 24);
    const avatarUrl = safeAvatar(body.avatarUrl);
    const rawPassword = body.password;
    const hasPassword = typeof rawPassword === "string" && normalizePassword(rawPassword).length > 0;
    if (!sessionId || name.length < 2 || nickname.length < 2) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-account" }));
      return;
    }
    if (hasPassword && normalizePassword(rawPassword).length < 3) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "weak-password", message: "Şifre en az 3 karakter olmalı." }));
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
    const nextPasswordHash = hasPassword
      ? passwordHash(normalizePassword(rawPassword))
      : (restored ? taken.passwordHash : existing?.passwordHash) || "";
    const account = restored
      ? Object.assign(taken, {
        sessionId,
        name,
        nickname,
        avatarUrl: avatarUrl || taken.avatarUrl || "",
        passwordHash: nextPasswordHash,
        authToken: taken.authToken || createAuthToken(),
        voiceRoomId: taken.voiceRoomId || "",
        updatedAt: now,
      })
      : existing
        ? Object.assign(existing, {
          name,
          nickname,
          avatarUrl: avatarUrl || existing.avatarUrl || "",
          passwordHash: nextPasswordHash,
          authToken: existing.authToken || createAuthToken(),
          voiceRoomId: existing.voiceRoomId || "",
          updatedAt: now,
        })
        : {
          id: createRecordId("acct"),
          sessionId,
          name,
          nickname,
          avatarUrl,
          passwordHash: nextPasswordHash,
          authToken: createAuthToken(),
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
    ensureAccountAuthToken(account);
    await writeJson("accounts.json", accounts);
    sendJson(response, {
      ...accountSnapshot(sessionId),
      authToken: account.authToken,
    });
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
  if (request.method === "GET" && url.pathname === "/api/public-state") {
    sendJson(response, publicStateSnapshot());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/ban-status") {
    const sessionId = safeText(url.searchParams.get("sessionId"), 120);
    const nickname = safeText(url.searchParams.get("nickname"), 24);
    const ban = findBan(sessionId, nickname);
    sendJson(response, {
      banned: Boolean(ban),
      reason: ban?.reason || "",
      permanent: Boolean(ban?.permanent),
    });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/user-status") {
    const sessionId = safeText(url.searchParams.get("sessionId"), 120);
    const nickname = safeText(url.searchParams.get("nickname"), 24);
    const ban = findBan(sessionId, nickname);
    const warning = findWarning(sessionId, nickname);
    sendJson(response, {
      banned: Boolean(ban),
      reason: ban?.reason || "",
      permanent: Boolean(ban?.permanent),
      warning: warning ? { note: warning.note } : null,
    });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/report") {
    const body = await readBody(request, 64_000);
    const targetNickname = safeText(body.targetNickname, 24);
    const reporterName = safeText(body.reporterName, 40) || "Anonim";
    const note = safeText(body.note, 300);
    if (!targetNickname || !note) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "target-and-note-required" }));
      return;
    }
    const duplicate = adminState.reports.some((report) => report.status === "pending"
      && normalizeNickname(report.targetNickname) === normalizeNickname(targetNickname)
      && report.reporterName.toLocaleLowerCase("tr-TR") === reporterName.toLocaleLowerCase("tr-TR"));
    if (duplicate) {
      response.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "duplicate-report" }));
      return;
    }
    adminState.reports.unshift({
      id: createRecordId("rep"),
      targetNickname,
      reporterName,
      note,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    adminState.reports = adminState.reports.slice(0, 100);
    await saveAdminState();
    sendJson(response, { ok: true, message: "Şikayetin alındı, teşekkürler" });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/appeal") {
    const body = await readBody(request, 64_000);
    const nickname = safeText(body.nickname, 24);
    const sessionId = safeText(body.sessionId, 120);
    const message = safeText(body.message, 500);
    if (!findBan(sessionId, nickname)) {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-banned" }));
      return;
    }
    if (!message) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "message-required" }));
      return;
    }
    adminState.appeals.unshift({
      id: createRecordId("appeal"),
      nickname,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    adminState.appeals = adminState.appeals.slice(0, 200);
    await saveAdminState();
    sendJson(response, { ok: true });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/community-game") {
    const id = safeText(url.searchParams.get("id"), 120);
    const game = adminState.gameQueue.find((item) => item.id === id);
    if (!game || (!game.published && !hasAdminToken(request, url, null))) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-found" }));
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(game.code);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/auth/start") {
    const authId = randomBytes(16).toString("hex");
    adminAuthSessions.set(authId, {
      id: authId,
      stage: 0,
      expiresAt: Date.now() + 10 * 60 * 1000,
      fails: { stage1: 0, backup: 0 },
      lockedUntil: { stage1: 0, backup: 0 },
      challenge: "",
    });
    sendJson(response, { ok: true, authId, recaptchaSiteKey });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/auth/stage1") {
    const body = await readBody(request, 64_000);
    const session = getAuthSession(body.authId);
    if (!session) {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth" }));
      return;
    }
    const remaining = authLockRemaining(session, "stage1");
    if (remaining > 0) {
      response.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "locked", retryAfterSeconds: remaining, message: "⏳ Güvenlik nedeniyle 100 saniye boyunca yeni giriş denemesi yapılamaz." }));
      return;
    }
    if (passwordHash(normalizePassword(body.password)) === adminPasswordHash) {
      session.stage = Math.max(session.stage, 1);
      sendJson(response, { ok: true, message: "✅ Yönetici şifresi doğrulandı." });
      return;
    }
    session.fails.stage1 += 1;
    await logSecurityEvent(request, "stage1", "wrong-password");
    if (session.fails.stage1 >= 3) {
      session.fails.stage1 = 0;
      session.lockedUntil.stage1 = Date.now() + 100_000;
      await logSecurityEvent(request, "stage1", "locked-100s");
      response.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "locked", retryAfterSeconds: 100, message: "⏳ Güvenlik nedeniyle 100 saniye boyunca yeni giriş denemesi yapılamaz." }));
      return;
    }
    response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "wrong-password", message: "❌ Şifre hatalı." }));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/auth/stage2") {
    const body = await readBody(request, 64_000);
    const session = getAuthSession(body.authId);
    if (!session || session.stage < 1) {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth" }));
      return;
    }
    const username = safeText(body.username, 80);
    const normalizedUsername = username.toLocaleLowerCase("tr-TR");
    const isListedAdmin = adminState.adminUsers.some(
      (nickname) => normalizeNickname(nickname) === normalizedUsername,
    );
    if (isListedAdmin && normalizedUsername !== "hakanumutbey") {
      session.stage = Math.max(session.stage, 2);
      session.username = adminState.adminUsers.find(
        (nickname) => normalizeNickname(nickname) === normalizedUsername,
      ) || username;
      sendJson(response, { ok: true, message: "✅ GitHub doğrulaması başarılı." });
      return;
    }
    if (normalizedUsername !== "hakanumutbey") {
      await logSecurityEvent(request, "stage2", `github-no-permission:${username}`);
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "no-permission", message: "❌ Bu GitHub hesabının yönetici yetkisi bulunmuyor." }));
      return;
    }
    let githubUser = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      let githubResponse;
      try {
        githubResponse = await fetch(`${githubApiBase}/users/${encodeURIComponent(username)}`, {
          signal: controller.signal,
          headers: { "User-Agent": "hakorocks-studio", Accept: "application/vnd.github+json" },
        });
      } finally {
        clearTimeout(timer);
      }
      if (!githubResponse.ok && githubResponse.status !== 404) {
        throw new Error("github-unreachable");
      }
      githubUser = githubResponse.ok ? await githubResponse.json() : null;
    } catch {
      githubConsecutiveFailures += 1;
      await logSecurityEvent(request, "stage2", "github-unreachable");
      response.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({
        error: "unreachable",
        message: "❌ GitHub'a bağlanılamadı.",
        backupAvailable: githubConsecutiveFailures >= 3,
      }));
      return;
    }
    githubConsecutiveFailures = 0;
    if (safeText(githubUser?.login, 80).toLocaleLowerCase("tr-TR") === "hakanumutbey") {
      session.stage = Math.max(session.stage, 2);
      session.username = "hakanumutbey";
      sendJson(response, { ok: true, message: "✅ GitHub doğrulaması başarılı." });
      return;
    }
    await logSecurityEvent(request, "stage2", `github-no-permission:${username}`);
    response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "no-permission", message: "❌ Bu GitHub hesabının yönetici yetkisi bulunmuyor." }));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/auth/stage2-backup") {
    const body = await readBody(request, 64_000);
    const session = getAuthSession(body.authId);
    if (!session || session.stage < 1) {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth" }));
      return;
    }
    if (githubConsecutiveFailures < 3) {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "backup-not-available" }));
      return;
    }
    const remaining = authLockRemaining(session, "backup");
    if (remaining > 0) {
      response.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "locked", retryAfterSeconds: remaining, message: "⏳ Güvenlik nedeniyle 100 saniye boyunca yeni giriş denemesi yapılamaz." }));
      return;
    }
    if (passwordHash(normalizePassword(body.password)) === adminBackupPasswordHash) {
      session.stage = Math.max(session.stage, 2);
      session.username = "hakanumutbey";
      sendJson(response, { ok: true, message: "✅ Yedek doğrulama başarılı." });
      return;
    }
    session.fails.backup += 1;
    await logSecurityEvent(request, "stage2-backup", "wrong-backup-password");
    if (session.fails.backup >= 3) {
      session.fails.backup = 0;
      session.lockedUntil.backup = Date.now() + 100_000;
      await logSecurityEvent(request, "stage2-backup", "locked-100s");
      response.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "locked", retryAfterSeconds: 100, message: "⏳ Güvenlik nedeniyle 100 saniye boyunca yeni giriş denemesi yapılamaz." }));
      return;
    }
    response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "wrong-password", message: "❌ Yedek doğrulama başarısız." }));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/admin/auth/stage3-challenge") {
    const session = getAuthSession(url.searchParams.get("authId"));
    if (!session || session.stage < 2) {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth" }));
      return;
    }
    const a = 1 + Math.floor(Math.random() * 9);
    const b = 1 + Math.floor(Math.random() * 9);
    session.challenge = String(a + b);
    sendJson(response, { ok: true, question: `${a} + ${b} = ?` });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/auth/stage3") {
    const body = await readBody(request, 64_000);
    const session = getAuthSession(body.authId);
    if (!session || session.stage < 2) {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-auth" }));
      return;
    }
    if (recaptchaSecret) {
      let verified = false;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        let verifyResponse;
        try {
          verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(safeText(body.recaptchaToken, 2000))}`,
          });
        } finally {
          clearTimeout(timer);
        }
        const result = await verifyResponse.json();
        verified = Boolean(result?.success);
      } catch {
        verified = false;
      }
      if (!verified) {
        await logSecurityEvent(request, "stage3", "recaptcha-failed");
        response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "robot-check-failed", message: "❌ Robot doğrulaması başarısız." }));
        return;
      }
    } else {
      if (!session.challenge || safeText(body.answer, 10) !== session.challenge) {
        await logSecurityEvent(request, "stage3", "robot-check-failed");
        response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "robot-check-failed", message: "❌ Robot doğrulaması başarısız." }));
        return;
      }
    }
    const token = randomBytes(24).toString("hex");
    adminTokens.set(token, { username: session.username || "hakanumutbey", expiresAt: Date.now() + 12 * 60 * 60 * 1000 });
    adminAuthSessions.delete(session.id);
    sendJson(response, { ok: true, token, message: "✅ Robot doğrulaması başarılı." });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/logout") {
    const body = await readBody(request, 64_000);
    const header = request.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    const token = safeText(bearer || body.token || "", 120);
    if (token) adminTokens.delete(token);
    sendJson(response, { ok: true });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/admin/state") {
    const username = requireAdmin(request, response, url, null);
    if (!username) return;
    sendJson(response, { ...adminState, securityLog: securityLog.slice(0, 20), role: adminRole(username), username });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/grant") {
    const body = await readBody(request, 64_000);
    if (!requireSuperAdmin(request, response, url, body)) return;
    const nickname = safeText(body.nickname, 24);
    if (!nickname) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "nickname-required" }));
      return;
    }
    const isSuper = normalizeNickname(nickname) === "hakanumutbey";
    const already = adminState.adminUsers.some((item) => normalizeNickname(item) === normalizeNickname(nickname));
    if (!isSuper && !already) {
      adminState.adminUsers.unshift(nickname);
      await saveAdminState();
    }
    sendJson(response, adminState);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/revoke") {
    const body = await readBody(request, 64_000);
    if (!requireSuperAdmin(request, response, url, body)) return;
    const nickname = safeText(body.nickname, 24);
    if (normalizeNickname(nickname) === "hakanumutbey") {
      response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "cannot-revoke-superadmin" }));
      return;
    }
    adminState.adminUsers = adminState.adminUsers.filter((item) => normalizeNickname(item) !== normalizeNickname(nickname));
    await saveAdminState();
    sendJson(response, adminState);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/admin/accounts") {
    if (!requireAdmin(request, response, url, null)) return;
    const query = safeText(url.searchParams.get("query"), 40).toLocaleLowerCase("tr-TR");
    const list = accounts
      .filter((account) => {
        if (!query) return true;
        return account.nickname.toLocaleLowerCase("tr-TR").includes(query)
          || account.name.toLocaleLowerCase("tr-TR").includes(query);
      })
      .slice(0, 30)
      .map((account) => ({
        nickname: account.nickname,
        name: account.name,
        banned: Boolean(findBan(account.sessionId, account.nickname)),
        isAdmin: normalizeNickname(account.nickname) === "hakanumutbey"
          || adminState.adminUsers.some((item) => normalizeNickname(item) === normalizeNickname(account.nickname)),
        createdAt: account.createdAt,
      }));
    sendJson(response, list);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/maintenance") {
    const body = await readBody(request, 64_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    adminState.maintenance = Boolean(body.on);
    logAdminAction("maintenance", actor, `Bakım arası ${adminState.maintenance ? "açıldı" : "kapatıldı"}`);
    await saveAdminState();
    sendJson(response, publicStateSnapshot());
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/ban") {
    const body = await readBody(request, 64_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    const nickname = safeText(body.nickname, 24);
    const reason = safeText(body.reason, 200);
    if (!nickname) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "nickname-required" }));
      return;
    }
    const ban = createBan(nickname, reason, Boolean(body.permanent));
    logAdminAction("ban", actor, `@${nickname} banlandı${ban.permanent ? " (kalıcı)" : ""}${reason ? ` — ${reason}` : ""}`, ban.id);
    await saveAdminState();
    sendJson(response, adminState);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/unban") {
    const body = await readBody(request, 64_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    const id = safeText(body.id, 120);
    const ban = adminState.bans.find((item) => item.id === id);
    adminState.bans = adminState.bans.filter((item) => item.id !== id);
    logAdminAction("unban", actor, `@${ban?.nickname || id} banı kaldırıldı`);
    await saveAdminState();
    sendJson(response, adminState);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/appeal-decision") {
    const body = await readBody(request, 64_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    const id = safeText(body.id, 120);
    const appeal = adminState.appeals.find((item) => item.id === id);
    if (!appeal) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-found" }));
      return;
    }
    appeal.status = body.approve ? "approved" : "rejected";
    if (body.approve) {
      adminState.bans = adminState.bans.filter((ban) => normalizeNickname(ban.nickname) !== normalizeNickname(appeal.nickname));
    }
    logAdminAction("appeal-decision", actor, `@${appeal.nickname} itirazı ${body.approve ? "onaylandı" : "reddedildi"}`);
    await saveAdminState();
    sendJson(response, adminState);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/game-queue") {
    const body = await readBody(request, 600_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    const title = safeText(body.title, 80);
    const code = typeof body.code === "string" ? body.code : "";
    if (!title || !code.trim()) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "title-and-code-required" }));
      return;
    }
    if (code.length > 500_000) {
      response.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "code-too-large" }));
      return;
    }
    const queuedGame = {
      id: createRecordId("game"),
      title,
      code,
      published: false,
      createdAt: new Date().toISOString(),
    };
    adminState.gameQueue.unshift(queuedGame);
    adminState.gameQueue = adminState.gameQueue.slice(0, 50);
    logAdminAction("game-queue", actor, `"${title}" kuyruğa eklendi`, queuedGame.id);
    await saveAdminState();
    sendJson(response, adminState);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/game-queue-publish") {
    const body = await readBody(request, 64_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    const id = safeText(body.id, 120);
    const game = adminState.gameQueue.find((item) => item.id === id);
    if (!game) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-found" }));
      return;
    }
    game.published = true;
    logAdminAction("game-publish", actor, `"${game.title}" siteye gönderildi`, game.id);
    await saveAdminState();
    sendJson(response, adminState);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/remove-game") {
    const body = await readBody(request, 64_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    const slug = safeText(body.slug, 80);
    const mode = safeText(body.mode, 20);
    if (mode === "restore") {
      delete adminState.removedGames[slug];
    } else if (mode === "temporary" || mode === "permanent") {
      adminState.removedGames[slug] = { mode, createdAt: new Date().toISOString() };
    } else {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-mode" }));
      return;
    }
    logAdminAction("game-remove", actor, `${slug} ${mode === "restore" ? "geri alındı" : mode === "permanent" ? "sonsuz kaldırıldı" : "geçici kaldırıldı"}`, slug);
    await saveAdminState();
    sendJson(response, publicStateSnapshot());
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/report-decision") {
    const body = await readBody(request, 64_000);
    const actor = requireAdmin(request, response, url, body);
    if (!actor) return;
    const id = safeText(body.id, 120);
    const action = safeText(body.action, 20);
    const report = adminState.reports.find((item) => item.id === id);
    if (!report) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-found" }));
      return;
    }
    if (action === "warn") {
      const note = safeText(body.note, 300) || report.note;
      const account = accounts.find((item) => normalizeNickname(item.nickname) === normalizeNickname(report.targetNickname));
      const warning = {
        id: createRecordId("warn"),
        nickname: report.targetNickname,
        sessionId: account?.sessionId || "",
        note,
        by: actor,
        createdAt: new Date().toISOString(),
      };
      adminState.warnings.unshift(warning);
      adminState.warnings = adminState.warnings.slice(0, 100);
      report.status = "warned";
      logAdminAction("warn", actor, `@${report.targetNickname} uyarıldı — ${note}`, warning.id);
    } else if (action === "ban") {
      const reason = safeText(body.note, 200) || report.note;
      const ban = createBan(report.targetNickname, reason, Boolean(body.permanent));
      report.status = "banned";
      logAdminAction("ban", actor, `@${report.targetNickname} şikayet üzerine banlandı${ban.permanent ? " (kalıcı)" : ""} — ${reason}`, ban.id);
    } else if (action === "dismiss") {
      report.status = "dismissed";
      logAdminAction("report-decision", actor, `@${report.targetNickname} şikayeti reddedildi`);
    } else {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "invalid-action" }));
      return;
    }
    await saveAdminState();
    sendJson(response, adminState);
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/admin/undo") {
    const body = await readBody(request, 64_000);
    const actor = requireSuperAdmin(request, response, url, body);
    if (!actor) return;
    const actionId = safeText(body.actionId, 120);
    const action = adminState.actions.find((item) => item.id === actionId);
    if (!action) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-found" }));
      return;
    }
    const undoable = ["ban", "warn", "game-publish", "game-remove", "maintenance"];
    if (action.undone || !undoable.includes(action.type)) {
      response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "not-undoable" }));
      return;
    }
    if (action.type === "ban") {
      adminState.bans = adminState.bans.filter((ban) => ban.id !== action.ref);
    } else if (action.type === "warn") {
      adminState.warnings = adminState.warnings.filter((warning) => warning.id !== action.ref);
    } else if (action.type === "game-publish") {
      const game = adminState.gameQueue.find((item) => item.id === action.ref);
      if (game) game.published = false;
    } else if (action.type === "game-remove") {
      delete adminState.removedGames[action.ref];
    } else if (action.type === "maintenance") {
      adminState.maintenance = false;
    }
    action.undone = true;
    await saveAdminState();
    sendJson(response, adminState);
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
  const photoCounts = Object.fromEntries(games.map((slug) => [slug, 0]));
  let totalPhotoLikes = 0;
  for (const photo of photos) {
    if (photoCounts[photo.slug] !== undefined) photoCounts[photo.slug] += 1;
    totalPhotoLikes += Array.isArray(photo.likedBy) ? photo.likedBy.length : 0;
  }
  const mostPlayedGame = maxEntrySlug(games.map((slug) => [slug, gameStats[slug]?.opens || 0]));
  const weekPopularGame = maxEntrySlug(games.map((slug) => [slug, gameStats[slug]?.value || 0]));
  const mostPhotoGame = maxEntrySlug(Object.entries(photoCounts));
  const totalGameTimeMinutes = games.reduce((sum, slug) => {
    const opens = gameStats[slug]?.opens || 0;
    return sum + opens * (averagePlayMinutes[slug] || 6);
  }, activeSessions.length * 3);
  return {
    siteOpen: activeSessions.length,
    playing: Object.values(playingByGame).reduce((sum, count) => sum + count, 0),
    devices,
    marketValue,
    marketHistory: stock.marketHistory,
    games: gameStats,
    enriched: {
      mostPlayedGame,
      weekPopularGame,
      mostPhotoGame,
      totalPlayers: accounts.length,
      totalGameTimeMinutes,
      totalBadges: Math.max(0, accounts.length * 2 + Object.values(currentRatings().games).reduce((sum, item) => sum + item.count, 0)),
      dailyActivePlayers: activeSessions.length,
      mostPlayedFusion: "birlesim-arenasi",
      totalPhotoLikes,
      commentsTotal: comments.length,
      votesTotal: Object.keys(votes.voters).length,
      clickGamePlayers: clickScores.length,
      clickGameBestScore: sortClickScores(clickScores)[0]?.score || 0,
    },
  };
}

function maxEntrySlug(entries) {
  return entries.reduce((best, entry) => (Number(entry[1]) > Number(best[1]) ? entry : best), ["", -1])[0];
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

function publicPhoto(photo) {
  const likedBy = Array.isArray(photo.likedBy) ? photo.likedBy : [];
  return {
    ...photo,
    likedBy: undefined,
    likes: likedBy.length,
  };
}

function normalizeComments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: safeText(item.id, 120) || createRecordId("comment"),
      slug: games.includes(item.slug) ? item.slug : "",
      name: safeText(item.name, 32) || "Oyuncu",
      message: safeText(item.message, 220),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
    }))
    .filter((item) => item.slug && item.message);
}

function commentSnapshot(slug = "") {
  const visible = slug ? comments.filter((comment) => comment.slug === slug) : comments;
  return {
    total: comments.length,
    games: Object.fromEntries(games.map((gameSlug) => [
      gameSlug,
      comments.filter((comment) => comment.slug === gameSlug).slice(0, 12),
    ])),
    list: visible.slice(0, 30),
  };
}

function normalizeVotes(value) {
  const voters = value && typeof value === "object" && value.voters && typeof value.voters === "object"
    ? value.voters
    : {};
  return {
    voters: Object.fromEntries(Object.entries(voters)
      .map(([sessionId, optionId]) => [safeText(sessionId, 120), safeText(optionId, 40)])
      .filter(([sessionId, optionId]) => sessionId && voteOptionIds.includes(optionId))),
  };
}

function currentVotes() {
  const options = Object.fromEntries(voteOptionIds.map((id) => [id, 0]));
  for (const optionId of Object.values(votes.voters)) {
    if (options[optionId] !== undefined) options[optionId] += 1;
  }
  return {
    options,
    total: Object.keys(votes.voters).length,
  };
}

function normalizeClickScores(value) {
  if (!Array.isArray(value)) return [];
  return sortClickScores(value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: safeText(item.id, 120) || createRecordId("click"),
      sessionId: safeText(item.sessionId, 120),
      name: safeText(item.name, 32) || "Oyuncu",
      score: clamp(Math.round(Number(item.score) || 0), 0, 1800),
      durationMs: clamp(Math.round(Number(item.durationMs) || 60_000), 55_000, 75_000),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
      updatedAt: safeText(item.updatedAt, 40) || safeText(item.createdAt, 40) || new Date().toISOString(),
    }))
    .filter((item) => item.sessionId))
    .slice(0, 120);
}

function sortClickScores(list) {
  return [...list].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.updatedAt).localeCompare(String(b.updatedAt));
  });
}

function clickGameSnapshot(sessionId = "") {
  const sorted = sortClickScores(clickScores);
  const personal = sessionId ? sorted.find((entry) => entry.sessionId === sessionId) : null;
  return {
    durationSeconds: 60,
    totalPlayers: sorted.length,
    personalBest: personal ? publicClickScore(personal, sorted.indexOf(personal) + 1) : null,
    leaders: sorted.slice(0, 10).map((entry, index) => publicClickScore(entry, index + 1)),
  };
}

function publicClickScore(entry, rank) {
  return {
    rank,
    name: entry.name,
    score: entry.score,
    durationSeconds: Math.round(entry.durationMs / 1000),
    updatedAt: entry.updatedAt,
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

function normalizeAdminState(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    maintenance: Boolean(source.maintenance),
    adminUsers: Array.isArray(source.adminUsers)
      ? [...new Set(source.adminUsers.map((item) => safeText(item, 24)).filter(Boolean))]
      : [],
    actions: Array.isArray(source.actions) ? source.actions.filter((item) => item && typeof item === "object").map((item) => ({
      id: safeText(item.id, 120) || createRecordId("act"),
      type: safeText(item.type, 30),
      actor: safeText(item.actor, 40),
      detail: safeText(item.detail, 220),
      ref: safeText(item.ref, 120),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
      undone: Boolean(item.undone),
    })).filter((item) => item.type) : [],
    reports: Array.isArray(source.reports) ? source.reports.filter((item) => item && typeof item === "object").map((item) => ({
      id: safeText(item.id, 120) || createRecordId("rep"),
      targetNickname: safeText(item.targetNickname, 24),
      reporterName: safeText(item.reporterName, 40),
      note: safeText(item.note, 300),
      status: ["pending", "warned", "banned", "dismissed"].includes(item.status) ? item.status : "pending",
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
    })).filter((item) => item.targetNickname) : [],
    warnings: Array.isArray(source.warnings) ? source.warnings.filter((item) => item && typeof item === "object").map((item) => ({
      id: safeText(item.id, 120) || createRecordId("warn"),
      nickname: safeText(item.nickname, 24),
      sessionId: safeText(item.sessionId, 120),
      note: safeText(item.note, 300),
      by: safeText(item.by, 40),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
    })).filter((item) => item.nickname) : [],
    bans: Array.isArray(source.bans) ? source.bans.filter((item) => item && typeof item === "object").map((item) => ({
      id: safeText(item.id, 120) || createRecordId("ban"),
      nickname: safeText(item.nickname, 24),
      sessionId: safeText(item.sessionId, 120),
      reason: safeText(item.reason, 200),
      permanent: Boolean(item.permanent),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
    })).filter((item) => item.nickname) : [],
    appeals: Array.isArray(source.appeals) ? source.appeals.filter((item) => item && typeof item === "object").map((item) => ({
      id: safeText(item.id, 120) || createRecordId("appeal"),
      nickname: safeText(item.nickname, 24),
      message: safeText(item.message, 500),
      status: ["pending", "approved", "rejected"].includes(item.status) ? item.status : "pending",
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
    })) : [],
    gameQueue: Array.isArray(source.gameQueue) ? source.gameQueue.filter((item) => item && typeof item === "object").map((item) => ({
      id: safeText(item.id, 120) || createRecordId("game"),
      title: safeText(item.title, 80),
      code: typeof item.code === "string" ? item.code.slice(0, 500_000) : "",
      published: Boolean(item.published),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
    })).filter((item) => item.title && item.code) : [],
    removedGames: source.removedGames && typeof source.removedGames === "object" && !Array.isArray(source.removedGames)
      ? Object.fromEntries(Object.entries(source.removedGames)
        .filter(([, item]) => item && (item.mode === "temporary" || item.mode === "permanent"))
        .map(([slug, item]) => [safeText(slug, 80), { mode: item.mode, createdAt: safeText(item.createdAt, 40) || new Date().toISOString() }]))
      : {},
  };
}

async function saveAdminState() {
  await writeJson("admin.json", adminState);
}

function logAdminAction(type, actor, detail, ref = "") {
  adminState.actions.unshift({
    id: createRecordId("act"),
    type,
    actor: safeText(actor, 40),
    detail: safeText(detail, 220),
    ref: safeText(ref, 120),
    createdAt: new Date().toISOString(),
    undone: false,
  });
  adminState.actions = adminState.actions.slice(0, 100);
}

function findWarning(sessionId, nickname) {
  const normalized = normalizeNickname(nickname);
  return adminState.warnings.find((warning) => {
    if (normalized && normalizeNickname(warning.nickname) === normalized) return true;
    return Boolean(sessionId && warning.sessionId && warning.sessionId === sessionId);
  }) || null;
}

function publicStateSnapshot() {
  return {
    maintenance: Boolean(adminState.maintenance),
    removedGames: adminState.removedGames,
    adminUsers: ["hakanumutbey", ...adminState.adminUsers],
    publishedGames: adminState.gameQueue
      .filter((game) => game.published)
      .map((game) => ({ id: game.id, title: game.title })),
  };
}

function createBan(nickname, reason, permanent) {
  const account = accounts.find((item) => normalizeNickname(item.nickname) === normalizeNickname(nickname));
  adminState.bans = adminState.bans.filter((ban) => normalizeNickname(ban.nickname) !== normalizeNickname(nickname));
  const ban = {
    id: createRecordId("ban"),
    nickname,
    sessionId: account?.sessionId || "",
    reason,
    permanent: Boolean(permanent),
    createdAt: new Date().toISOString(),
  };
  adminState.bans.unshift(ban);
  return ban;
}

function findBan(sessionId, nickname) {  const normalized = normalizeNickname(nickname);
  return adminState.bans.find((ban) => {
    if (normalized && normalizeNickname(ban.nickname) === normalized) return true;
    return Boolean(sessionId && ban.sessionId && ban.sessionId === sessionId);
  }) || null;
}

function adminUsernameFrom(request, url, body) {
  const header = request.headers.authorization || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = safeText(bearer || body?.token || url?.searchParams.get("token") || "", 120);
  if (!token) return "";
  const entry = adminTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    adminTokens.delete(token);
    return "";
  }
  return entry.username || "";
}

function hasAdminToken(request, url, body) {
  return Boolean(adminUsernameFrom(request, url, body));
}

function adminRole(username) {
  return normalizeNickname(username) === "hakanumutbey" ? "tam" : "yan";
}

function requireAdmin(request, response, url, body) {
  const username = adminUsernameFrom(request, url, body);
  if (username) return username;
  response.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "no-admin-token" }));
  return "";
}

function requireSuperAdmin(request, response, url, body) {
  const username = requireAdmin(request, response, url, body);
  if (!username) return "";
  if (adminRole(username) !== "tam") {
    response.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "superadmin-required" }));
    return "";
  }
  return username;
}

function getAuthSession(authId) {
  const session = adminAuthSessions.get(safeText(authId, 120));
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    adminAuthSessions.delete(session.id);
    return null;
  }
  return session;
}

function authLockRemaining(session, key) {
  return Math.max(0, Math.ceil(((session.lockedUntil[key] || 0) - Date.now()) / 1000));
}

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const first = typeof forwarded === "string" ? forwarded.split(",")[0] : "";
  return safeText(first, 80) || request.socket.remoteAddress || "";
}

async function logSecurityEvent(request, stage, reason) {
  securityLog.unshift({
    createdAt: new Date().toISOString(),
    ip: clientIp(request),
    userAgent: safeText(request.headers["user-agent"], 200),
    stage,
    reason,
  });
  securityLog = securityLog.slice(0, 200);
  await writeJson("security-log.json", securityLog);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function passwordHash(value) {
  return createHash("sha256").update(value || "", "utf8").digest("hex");
}

// Kopyala-yapıştır sırasında araya giren boşluk/satır sonları şifreyi bozmasın.
function normalizePassword(value) {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, "").slice(0, 500);
}

function createAuthToken() {
  return randomBytes(24).toString("hex");
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
      passwordHash: safeText(item.passwordHash, 128),
      authToken: safeText(item.authToken, 128),
      voiceRoomId: safeText(item.voiceRoomId, 40),
      createdAt: safeText(item.createdAt, 40) || new Date().toISOString(),
      updatedAt: safeText(item.updatedAt, 40) || new Date().toISOString(),
      friends: Array.isArray(item.friends) ? item.friends.map((friendId) => safeText(friendId, 80)).filter(Boolean) : [],
      yarisSehri: item.yarisSehri && typeof item.yarisSehri === "object" ? item.yarisSehri : null,
    }))
    .filter((item) => item.id && (item.sessionId || item.passwordHash || item.nickname || item.authToken));
}

function clearSessionBindings(sessionId) {
  if (!sessionId) return;
  // Yerinde (in-place) temizle: map+yayma ile yeni nesne üretmek, az önce bulunan
  // hesap referansını diziden koparıyordu ve ilk resume'da account:null dönüyordu
  // ("hesabınız yok" hatasının kök nedeni).
  for (const account of accounts) {
    if (account.sessionId === sessionId) {
      account.sessionId = "";
      account.updatedAt = new Date().toISOString();
    }
  }
}

function ensureAccountAuthToken(account) {
  if (!account.authToken) {
    account.authToken = createAuthToken();
  }
  return account.authToken;
}

function registerAccount({ sessionId, name, nickname, password }) {
  if (!sessionId || name.length < 2 || nickname.length < 2) {
    return { error: "invalid-account", status: 400, message: "İsim ve takma ad gerekli." };
  }
  const normalizedPass = normalizePassword(password);
  if (normalizedPass.length < 3) {
    return { error: "weak-password", status: 400, message: "Şifre en az 3 karakter olmalı." };
  }
  const normalizedNickname = normalizeNickname(nickname);
  const nicknameTaken = accounts.find((account) => normalizeNickname(account.nickname) === normalizedNickname);
  if (nicknameTaken) {
    return { error: "nickname-taken", status: 409, message: "Bu takma ad alınmış. Oturum açmayı dene." };
  }
  clearSessionBindings(sessionId);
  const now = new Date().toISOString();
  const account = {
    id: createRecordId("acct"),
    sessionId,
    name,
    nickname,
    avatarUrl: "",
    passwordHash: passwordHash(normalizedPass),
    authToken: createAuthToken(),
    voiceRoomId: "",
    yarisSehri: null,
    createdAt: now,
    updatedAt: now,
    friends: [],
  };
  accounts = [account, ...accounts];
  return { account, sessionId };
}

function loginAccount({ sessionId, name, password }) {
  if (!sessionId || name.length < 1) {
    return { error: "invalid-login", status: 400, message: "Ad/takma ad ve şifre gerekli." };
  }
  const normalizedPass = normalizePassword(password);
  if (normalizedPass.length < 1) {
    return { error: "invalid-login", status: 400, message: "Ad/takma ad ve şifre gerekli." };
  }
  const hash = passwordHash(normalizedPass);
  const nameKey = name.toLocaleLowerCase("tr-TR").trim();
  const nickKey = normalizeNickname(name);
  const candidates = accounts.filter((item) => {
    if (!item.passwordHash) return false;
    const sameName = item.name.toLocaleLowerCase("tr-TR") === nameKey;
    const sameNick = normalizeNickname(item.nickname) === nickKey;
    return sameName || sameNick;
  });
  if (candidates.length === 0) {
    return { error: "wrong-credentials", status: 401, message: "Bu ad/takma ad ile hesap bulunamadı." };
  }
  const account = candidates.find((item) => item.passwordHash === hash);
  if (!account) {
    return { error: "wrong-credentials", status: 401, message: "Şifre yanlış." };
  }
  clearSessionBindings(sessionId);
  account.sessionId = sessionId;
  ensureAccountAuthToken(account);
  account.updatedAt = new Date().toISOString();
  return { account, sessionId };
}

function resumeAccount({ sessionId, authToken }) {
  if (!sessionId || !authToken) {
    return { error: "invalid-resume", status: 400, message: "Oturum anahtarı eksik." };
  }
  const account = accounts.find((item) => item.authToken && item.authToken === authToken);
  if (!account) {
    return { error: "invalid-resume", status: 401, message: "Kayıtlı oturum bulunamadı." };
  }
  clearSessionBindings(sessionId);
  account.sessionId = sessionId;
  account.updatedAt = new Date().toISOString();
  return { account, sessionId };
}

async function ensureDefaultBotAccounts(existingAccounts) {
  const botSeed = [
    { id: "acct-bot-1", sessionId: "bot-session-1", name: "Test Bot 1", nickname: "test-bot-1" },
    { id: "acct-bot-2", sessionId: "bot-session-2", name: "Test Bot 2", nickname: "test-bot-2" },
    { id: "acct-bot-3", sessionId: "bot-session-3", name: "Test Bot 3", nickname: "test-bot-3" },
  ];
  const now = new Date().toISOString();
  const accountsById = new Map(existingAccounts.map((account) => [account.id, account]));
  let changed = false;
  for (const bot of botSeed) {
    const present = [...accountsById.values()].some((account) => {
      const sameId = account.id === bot.id;
      const sameNickname = normalizeNickname(account.nickname) === normalizeNickname(bot.nickname);
      return sameId || sameNickname;
    });
    if (present) continue;
    const botAccount = {
      id: bot.id,
      sessionId: bot.sessionId,
      name: bot.name,
      nickname: bot.nickname,
      avatarUrl: "",
      passwordHash: "",
      authToken: "",
      voiceRoomId: "",
      createdAt: now,
      updatedAt: now,
      friends: [],
    };
    existingAccounts.push(botAccount);
    accountsById.set(bot.id, botAccount);
    changed = true;
  }
  if (changed) await writeJson("accounts.json", existingAccounts);
  return existingAccounts;
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

// ---------------------------------------------------------------------------
// Yarış Şehri (yaris-sehri): çok oyunculu açık harita araba oyunu.
// Basit relay + oda yönetimi; konumlar istemci taraflı, sunucu sadece
// doğrular/sınırlar ve yarış + zamana karşı akışını yönetir.
// ---------------------------------------------------------------------------

const YARIS_LIMITS = {
  maxPlayers: 20,
  mapSize: 6000,
  posMinIntervalMs: 50,
  raceMinPlayers: 2,
  raceMaxPlayers: 5,
  raceLobbyMs: 15000,
  raceCountdownMs: 3000,
  raceMaxMs: 120000,
  raceResultsMs: 12000,
  ttMaxScores: 5,
  ttMinMs: 5000,
  ttMaxMs: 600000,
};

const YARIS_COLORS = ["#ff5b6e", "#4ea3ff", "#69d18b", "#ffd166", "#b67dff", "#ff9f43", "#34d1bf", "#ff8fd6", "#e8eef6"];

// Yarış rotası: şehir çevre yolunda saat yönünde tur; start/bitiş route[0].
// Not: y burada zemin düzleminin 2. koordinatı (istemcide 3D z ekseni).
const YARIS_RACE_ROUTE = [
  { x: 600, y: 600 },
  { x: 3000, y: 600 },
  { x: 5400, y: 600 },
  { x: 5400, y: 3000 },
  { x: 5400, y: 5400 },
  { x: 3000, y: 5400 },
  { x: 600, y: 5400 },
  { x: 600, y: 3000 },
];

// Zamana karşı rotası: güneyde küçük tur; start/bitiş route[0].
const YARIS_TT_ROUTE = [
  { x: 3000, y: 5400 },
  { x: 4200, y: 5400 },
  { x: 5400, y: 5400 },
  { x: 5400, y: 4200 },
  { x: 4200, y: 4200 },
  { x: 3000, y: 4200 },
];

const YARIS_ZONES = {
  race: { x: 240, y: 240, w: 720, h: 720 },
  tt: { x: 2640, y: 5040, w: 720, h: 720 },
};

let yarisPlayerCounter = 0;

function normalizeYarisColor(value) {
  const color = safeText(value, 12).toLowerCase();
  return YARIS_COLORS.includes(color) ? color : YARIS_COLORS[Math.floor(Math.random() * YARIS_COLORS.length)];
}

function createYarisRace() {
  return {
    state: "idle", // idle | lobby | countdown | running | results
    lobby: [], // playerId listesi (katılım sırası)
    lobbyDeadline: 0,
    startsAt: 0,
    startedAt: 0,
    endsAt: 0,
    resultsEndAt: 0,
    route: YARIS_RACE_ROUTE,
    progress: new Map(), // playerId -> { next, finishedAt, timeMs }
    results: [],
  };
}

function createYarisWorld(id, partyCode, mapId) {
  const def = yarisMapDef(mapId) || yarisMapDef(YARIS_DEFAULT_MAP_ID);
  return {
    id,
    partyCode: partyCode || "",
    mapId: def.id,
    mapSeed: def.seed,
    weather: "clear", // clear | rain | storm
    weatherNextAt: Date.now() + 120000 + Math.random() * 120000,
    players: new Map(), // playerId -> player
    race: createYarisRace(),
    ttScores: [], // { nickname, timeMs }
    createdAt: Date.now(),
  };
}

function publicYarisPlayer(player) {
  return {
    id: player.id,
    nickname: player.nickname,
    color: player.color,
    paint: player.paint || "standart",
    x: Math.round(player.x),
    y: Math.round(player.y),
    h: Math.round((player.h || 0) * 10) / 10,
    a: Number(player.angle.toFixed(3)),
    s: Math.round(player.speed),
  };
}

function publicYarisRace(world) {
  const race = world.race;
  return {
    state: race.state,
    lobby: race.lobby
      .map((playerId) => world.players.get(playerId))
      .filter(Boolean)
      .map((player) => ({ id: player.id, nickname: player.nickname, color: player.color })),
    lobbyDeadline: race.lobbyDeadline,
    startsAt: race.startsAt,
    endsAt: race.endsAt,
    route: race.state === "idle" || race.state === "lobby" ? null : race.route,
    progress: [...race.progress.entries()].map(([playerId, prog]) => ({
      id: playerId,
      next: prog.next,
      finished: prog.finishedAt > 0,
      timeMs: prog.timeMs,
    })),
    results: race.results,
  };
}

function sendYaris(socket, payload) {
  if (socket.readyState === 1) socket.send(JSON.stringify(payload));
}

function broadcastYarisWorld(world, payload) {
  const raw = JSON.stringify(payload);
  for (const player of world.players.values()) {
    if (player.socket && player.socket.readyState === 1) player.socket.send(raw);
  }
}

function joinYarisWorld(socket, message) {
  const sessionId = safeText(message.sessionId, 120);
  if (!sessionId) {
    sendYaris(socket, { type: "yaris-error", code: "invalid-join", message: "Oturum bilgisi eksik." });
    return;
  }
  const account = accountBySessionId(sessionId);
  const nickname = safeText(message.nickname, 24) || account?.nickname || "misafir";
  const color = normalizeYarisColor(message.color);
  // Boya: hesaplıysa sunucu otoritesi (profildeki seçim), misafirse istemci seçimi (whitelist)
  const paint = account
    ? yarisProfileOf(account).selectedPaint
    : normalizeYarisPaintId(message.paint) || "standart";
  const mode = safeText(message.mode, 20);

  let worldId = "public";
  let partyCode = "";
  if (mode === "party-create") {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = String(Math.floor(100000 + Math.random() * 900000));
      if (!yarisSehriWorlds.has(`party-${candidate}`)) {
        partyCode = candidate;
        break;
      }
    }
    if (!partyCode) {
      sendYaris(socket, { type: "yaris-error", code: "party-create-failed", message: "Parti kurulamadı, tekrar dene." });
      return;
    }
    worldId = `party-${partyCode}`;
  } else if (mode === "party-join") {
    partyCode = safeText(message.code, 8).replace(/\D/g, "").slice(0, 6);
    if (partyCode.length !== 6) {
      sendYaris(socket, { type: "yaris-error", code: "invalid-party-code", message: "Parti kodu 6 haneli olmalı." });
      return;
    }
    worldId = `party-${partyCode}`;
    if (!yarisSehriWorlds.has(worldId)) {
      sendYaris(socket, { type: "yaris-error", code: "party-not-found", message: "Bu kodla bir parti bulunamadı." });
      return;
    }
  }

  let world = yarisSehriWorlds.get(worldId);
  if (!world) {
    // Public dünya klasik harita; parti kurarken host mapId seçebilir.
    let mapId = YARIS_DEFAULT_MAP_ID;
    if (mode === "party-create" && message.mapId != null) {
      mapId = normalizeYarisMapId(message.mapId);
      if (!mapId) {
        sendYaris(socket, { type: "yaris-error", code: "unknown-map", message: "Böyle bir harita yok." });
        return;
      }
    }
    world = createYarisWorld(worldId, partyCode, mapId);
    yarisSehriWorlds.set(worldId, world);
  }
  if (world.players.size >= YARIS_LIMITS.maxPlayers) {
    sendYaris(socket, { type: "yaris-error", code: "world-full", message: "Dünya dolu (en fazla 20 oyuncu)." });
    return;
  }

  // Aynı soket başka dünyadaysa önce oradan çıkar.
  if (socket.yarisWorldId && socket.yarisWorldId !== worldId) {
    leaveYarisWorld(socket);
  }
  if (socket.yarisWorldId === worldId && socket.yarisPlayerId) {
    const existing = world.players.get(socket.yarisPlayerId);
    if (existing) {
      existing.nickname = nickname;
      existing.color = color;
      existing.sessionId = sessionId;
      existing.paint = paint;
      sendYaris(socket, {
        type: "joined",
        worldId,
        partyCode: world.partyCode,
        mapSeed: world.mapSeed,
        mapId: world.mapId,
        weather: world.weather,
        selfId: existing.id,
        players: [...world.players.values()].map(publicYarisPlayer),
        race: publicYarisRace(world),
        ttScores: world.ttScores,
        routes: { race: YARIS_RACE_ROUTE, tt: YARIS_TT_ROUTE },
        zones: YARIS_ZONES,
        limits: { maxPlayers: YARIS_LIMITS.maxPlayers, raceMinPlayers: YARIS_LIMITS.raceMinPlayers, raceMaxPlayers: YARIS_LIMITS.raceMaxPlayers },
        profile: account ? yarisProfileOf(account) : null,
      });
      return;
    }
  }

  yarisPlayerCounter += 1;
  const player = {
    id: `yp${yarisPlayerCounter}`,
    sessionId,
    nickname,
    color,
    paint,
    accountId: account?.id || "",
    isBot: false,
    h: 0,
    x: 3000 + (Math.random() * 120 - 60),
    y: 3000 + (Math.random() * 120 - 60),
    angle: 0,
    speed: 0,
    socket,
    joinedAt: Date.now(),
  };
  world.players.set(player.id, player);
  socket.yarisPlayerId = player.id;
  socket.yarisWorldId = worldId;
  socket.yarisLastPosAt = 0;

  sendYaris(socket, {
    type: "joined",
    worldId,
    partyCode: world.partyCode,
    mapSeed: world.mapSeed,
    mapId: world.mapId,
    weather: world.weather,
    selfId: player.id,
    players: [...world.players.values()].map(publicYarisPlayer),
    race: publicYarisRace(world),
    ttScores: world.ttScores,
    routes: { race: YARIS_RACE_ROUTE, tt: YARIS_TT_ROUTE },
    zones: YARIS_ZONES,
    limits: { maxPlayers: YARIS_LIMITS.maxPlayers, raceMinPlayers: YARIS_LIMITS.raceMinPlayers, raceMaxPlayers: YARIS_LIMITS.raceMaxPlayers },
    profile: account ? yarisProfileOf(account) : null,
  });
  if (world.race.state === "lobby") {
    broadcastYarisWorld(world, { type: "race-lobby", race: publicYarisRace(world) });
  }
}

// Hazır mesaj sohbeti: whitelist (serbest yazı yok — çocuk güvenliği)
const YARIS_CHAT_MESSAGES = [
  "Merhaba! 👋",
  "Yarışalım mı? 🏁",
  "Beni takip et! 🚗",
  "Partiye gel! 🎉",
  "Kazandım! 😄",
  "Çok hızlısın! ⚡",
  "Buzda görüşürüz 🧊",
  "Afiyet olsun altınlar 🪙",
  "Dur bekle! ✋",
  "Geliyorum! 💨",
  "Görüşürüz! 👋",
  "GG! 🏆",
];
const YARIS_CHAT_COOLDOWN_MS = 3000;

function handleYarisChat(socket, message) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world || !player) return;
  const msgId = Number(message.msgId);
  if (!Number.isInteger(msgId) || msgId < 0 || msgId >= YARIS_CHAT_MESSAGES.length) return; // sessiz drop
  const now = Date.now();
  if (player.lastChatAt && now - player.lastChatAt < YARIS_CHAT_COOLDOWN_MS) return; // rate limit
  player.lastChatAt = now;
  // Sadece aynı dünyaya yayın
  broadcastYarisWorld(world, {
    type: "chat",
    playerId: player.id,
    nickname: player.nickname,
    color: player.color,
    msgId,
    text: YARIS_CHAT_MESSAGES[msgId],
  });
}

function yarisPlayerOf(socket) {
  const world = yarisSehriWorlds.get(socket.yarisWorldId);
  if (!world) return { world: null, player: null };
  return { world, player: world.players.get(socket.yarisPlayerId) || null };
}

function setYarisPos(socket, message) {
  const now = Date.now();
  if (now - socket.yarisLastPosAt < YARIS_LIMITS.posMinIntervalMs) return;
  socket.yarisLastPosAt = now;
  const { player } = yarisPlayerOf(socket);
  if (!player) return;
  const x = Number(message.x);
  const y = Number(message.y);
  const angle = Number(message.a);
  const speed = Number(message.s);
  const height = Number(message.h);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const bound = YARIS_LIMITS.mapSize + 200;
  player.x = clamp(x, -200, bound);
  player.y = clamp(y, -200, bound);
  // Yükseklik (3D): geriye uyumlu, yoksa 0.
  player.h = Number.isFinite(height) ? clamp(height, 0, 400) : 0;
  player.angle = Number.isFinite(angle) ? angle : player.angle;
  player.speed = Number.isFinite(speed) ? clamp(speed, 0, 2000) : 0;
}

function yarisRaceJoin(socket) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world || !player) return;
  const race = world.race;
  if (race.state === "countdown" || race.state === "running") {
    sendYaris(socket, { type: "yaris-error", code: "race-in-progress", message: "Yarış sürüyor, bitmesini bekle." });
    return;
  }
  if (race.state === "results") return;
  if (race.lobby.includes(player.id)) return;
  if (race.lobby.length >= YARIS_LIMITS.raceMaxPlayers) {
    sendYaris(socket, { type: "yaris-error", code: "race-full", message: "Yarış lobisi dolu (en fazla 5)." });
    return;
  }
  race.lobby.push(player.id);
  if (race.state === "idle") {
    race.state = "lobby";
    race.lobbyDeadline = Date.now() + YARIS_LIMITS.raceLobbyMs;
  }
  if (race.lobby.length >= YARIS_LIMITS.raceMaxPlayers) {
    startYarisRaceCountdown(world);
    return;
  }
  broadcastYarisWorld(world, { type: "race-lobby", race: publicYarisRace(world) });
}

function yarisRaceLeave(socket) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world || !player) return;
  const race = world.race;
  if (race.state === "lobby") {
    race.lobby = race.lobby.filter((id) => id !== player.id);
    if (race.lobby.length === 0) {
      world.race = createYarisRace();
      broadcastYarisWorld(world, { type: "race-reset" });
      return;
    }
    broadcastYarisWorld(world, { type: "race-lobby", race: publicYarisRace(world) });
  }
}

function yarisRaceCheckpoint(socket, message) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world || !player) return;
  const race = world.race;
  if (race.state !== "running") return;
  const prog = race.progress.get(player.id);
  if (!prog || prog.finishedAt) return;
  const index = Number(message.index);
  if (!Number.isInteger(index) || index < 0 || index >= race.route.length) return;

  if (index === 0 && prog.next >= race.route.length) {
    // Start çizgisine dönüş = bitiş.
    prog.finishedAt = Date.now();
    prog.timeMs = prog.finishedAt - race.startedAt;
    race.results.push({ id: player.id, nickname: player.nickname, color: player.color, timeMs: prog.timeMs });
    broadcastYarisWorld(world, { type: "race-progress", race: publicYarisRace(world) });
    const remaining = [...race.progress.values()].filter((item) => !item.finishedAt);
    if (remaining.length === 0) finishYarisRace(world);
    return;
  }
  if (index === prog.next) {
    prog.next += 1;
    broadcastYarisWorld(world, { type: "race-progress", race: publicYarisRace(world) });
  }
}

function startYarisRaceCountdown(world) {
  const race = world.race;
  race.state = "countdown";
  race.startsAt = Date.now() + YARIS_LIMITS.raceCountdownMs;
  race.progress = new Map();
  race.results = [];
  for (const playerId of race.lobby) {
    race.progress.set(playerId, { next: 1, finishedAt: 0, timeMs: 0 });
  }
  broadcastYarisWorld(world, { type: "race-countdown", race: publicYarisRace(world) });
}

function finishYarisRace(world) {
  const race = world.race;
  if (race.state !== "running") return;
  race.state = "results";
  race.resultsEndAt = Date.now() + YARIS_LIMITS.raceResultsMs;
  // Bitiremeyenler listenin sonuna (süresiz) eklenir.
  for (const playerId of race.lobby) {
    if (race.results.some((item) => item.id === playerId)) continue;
    const player = world.players.get(playerId);
    race.results.push({
      id: playerId,
      nickname: player?.nickname || "oyuncu",
      color: player?.color || "#e8eef6",
      timeMs: 0,
      bot: Boolean(player?.isBot),
    });
  }
  // Ödüller sunucu tarafında hesaplanır: altın + puan (rating).
  let accountsChanged = false;
  race.results.forEach((item, index) => {
    const finished = item.timeMs > 0;
    const gold = finished ? (YARIS_RACE_GOLD[index] ?? 10) : 0;
    const ratingDelta = finished ? (YARIS_RACE_RATING[index] ?? 0) : 0;
    item.goldEarned = gold;
    item.ratingDelta = ratingDelta;
    if (item.bot) return;
    const player = world.players.get(item.id);
    const account = player?.accountId ? accountById(player.accountId) : null;
    const profile = account ? yarisProfileOf(account) : null;
    if (!profile) return;
    profile.gold += gold;
    addYarisSeasonGold(account, gold);
    profile.rating = Math.max(0, profile.rating + ratingDelta);
    item.newGold = profile.gold;
    item.newRating = profile.rating;
    accountsChanged = true;
    if (player.socket) sendYaris(player.socket, { type: "profile", profile });
  });
  if (accountsChanged) writeJson("accounts.json", accounts).catch(() => {});
  // Sezon skoru: yarisci sezonunda birinciye +1 (açık dünya + dereceli ortak)
  const seasonWinner = race.results[0];
  if (seasonWinner && !seasonWinner.bot && seasonWinner.timeMs > 0) {
    const winnerPlayer = world.players.get(seasonWinner.id);
    const winnerAccount = winnerPlayer?.accountId ? accountById(winnerPlayer.accountId) : null;
    if (winnerAccount) addYarisSeasonScore(winnerAccount, "yarisci", 1);
  }
  broadcastYarisWorld(world, { type: "race-finish", race: publicYarisRace(world) });
}

function yarisTimeTrialFinish(socket, message) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world || !player) return;
  const timeMs = Number(message.timeMs);
  if (!Number.isFinite(timeMs) || timeMs < YARIS_LIMITS.ttMinMs || timeMs > YARIS_LIMITS.ttMaxMs) return;
  const rounded = Math.round(timeMs);
  world.ttScores.push({ nickname: player.nickname, timeMs: rounded });
  world.ttScores = world.ttScores
    .sort((first, second) => first.timeMs - second.timeMs)
    .slice(0, YARIS_LIMITS.ttMaxScores);
  // Altın: bitirme 10, kişisel rekor kırılırsa +10 (hesaplı oyuncular için sunucuda).
  let gold = 10;
  let record = false;
  const account = player.accountId ? accountById(player.accountId) : null;
  const profile = account ? yarisProfileOf(account) : null;
  if (profile) {
    if (!profile.ttBestMs || rounded < profile.ttBestMs) {
      profile.ttBestMs = rounded;
      gold += 10;
      record = true;
    }
    profile.gold += gold;
    addYarisSeasonGold(account, gold);
    writeJson("accounts.json", accounts).catch(() => {});
    sendYaris(socket, { type: "profile", profile });
  }
  sendYaris(socket, { type: "tt-reward", gold, record, timeMs: rounded });
  broadcastYarisWorld(world, { type: "tt-scores", scores: world.ttScores });
}

function leaveYarisWorld(socket) {
  leaveYarisRankedQueue(socket);
  const worldId = socket.yarisWorldId;
  const playerId = socket.yarisPlayerId;
  socket.yarisWorldId = "";
  socket.yarisPlayerId = "";
  if (!worldId || !playerId) return;
  const world = yarisSehriWorlds.get(worldId);
  if (!world) return;
  world.players.delete(playerId);
  // Kovalamaca odasından çıkış: lobide host devri + yayın; maçta takımdan düşürme.
  if (world.isChase && world.chase) {
    const chase = world.chase;
    if (chase.hostId === playerId) {
      const nextHuman = [...world.players.values()].find((p) => !p.isBot);
      chase.hostId = nextHuman?.id || "";
    }
    if (chase.phase === "lobby") {
      broadcastYarisChaseLobby(world);
    } else {
      chase.cops = chase.cops.filter((id) => id !== playerId);
      chase.robbers = chase.robbers.filter((id) => id !== playerId);
      delete chase.contact[playerId];
      broadcastYarisWorld(world, { type: "chase-update", chase: publicYarisChase(world) });
    }
    if (![...world.players.values()].some((p) => !p.isBot)) {
      yarisSehriWorlds.delete(worldId);
    }
    return;
  }
  const race = world.race;
  let raceChanged = false;
  if (race.state === "lobby" && race.lobby.includes(playerId)) {
    race.lobby = race.lobby.filter((id) => id !== playerId);
    raceChanged = true;
    if (race.lobby.length === 0) {
      world.race = createYarisRace();
      broadcastYarisWorld(world, { type: "race-reset" });
    }
  } else if ((race.state === "running" || race.state === "countdown") && race.progress.has(playerId)) {
    race.progress.delete(playerId);
    race.lobby = race.lobby.filter((id) => id !== playerId);
    raceChanged = true;
    if (race.state === "running") {
      const remaining = [...race.progress.values()].filter((item) => !item.finishedAt);
      if (race.progress.size > 0 && remaining.length === 0) finishYarisRace(world);
      else if (race.progress.size === 0) {
        world.race = createYarisRace();
        broadcastYarisWorld(world, { type: "race-reset" });
      }
    } else if (race.lobby.length === 0) {
      world.race = createYarisRace();
      broadcastYarisWorld(world, { type: "race-reset" });
    }
  }
  if (world.players.size === 0) {
    yarisSehriWorlds.delete(worldId);
    return;
  }
  if (raceChanged && world.race.state === "lobby") {
    broadcastYarisWorld(world, { type: "race-lobby", race: publicYarisRace(world) });
  }
}

function tickYarisWorlds() {
  const now = Date.now();
  checkYarisSeasonRollover(now);
  const seasonIsArabaci = yarisSeason.objective === "arabaci";
  for (const [worldId, world] of yarisSehriWorlds) {
    if (world.players.size === 0) {
      yarisSehriWorlds.delete(worldId);
      continue;
    }
    // Arabacı Sezonu: hesaplı oyuncunun bağlı olduğu süre sezon skoruna saniye yazılır
    if (seasonIsArabaci) {
      for (const player of world.players.values()) {
        if (!player.socket || player.isBot || !player.accountId) continue;
        player.timeAccum = (player.timeAccum || 0) + 0.1;
        if (player.timeAccum >= 10) {
          const seconds = Math.floor(player.timeAccum);
          player.timeAccum -= seconds;
          const account = accountById(player.accountId);
          if (account) {
            addYarisSeasonScore(account, "arabaci", seconds);
            addYarisTimeGold(account, seconds);
          }
        }
      }
    }
    // Kovalamaca dünyasında insan kalmadıysa (botlar tutuyor olabilir) kapat.
    if (world.isChase && ![...world.players.values()].some((p) => p.socket)) {
      yarisSehriWorlds.delete(worldId);
      continue;
    }

    // Hava durumu rotasyonu (2-4 dk): clear %60 / rain %30 / storm %10
    if (now >= world.weatherNextAt) {
      const roll = Math.random();
      world.weather = roll < 0.6 ? "clear" : roll < 0.9 ? "rain" : "storm";
      world.weatherNextAt = now + 120000 + Math.random() * 120000;
    }

    const race = world.race;
    if (race.state === "lobby" && now >= race.lobbyDeadline) {
      if (race.lobby.length >= YARIS_LIMITS.raceMinPlayers) {
        startYarisRaceCountdown(world);
      } else {
        // Tek kişi bekliyorsa süreyi uzat.
        race.lobbyDeadline = now + YARIS_LIMITS.raceLobbyMs;
        broadcastYarisWorld(world, { type: "race-lobby", race: publicYarisRace(world) });
      }
    } else if (race.state === "countdown" && now >= race.startsAt) {
      race.state = "running";
      race.startedAt = now;
      race.endsAt = now + YARIS_LIMITS.raceMaxMs;
      broadcastYarisWorld(world, { type: "race-start", race: publicYarisRace(world) });
    } else if (race.state === "running" && now >= race.endsAt) {
      finishYarisRace(world);
    } else if (race.state === "results" && now >= race.resultsEndAt) {
      if (world.isRanked) {
        // Dereceli maç bitti: dünya kapanır, oyuncular mod seçimine döner.
        broadcastYarisWorld(world, { type: "ranked-end" });
        for (const player of world.players.values()) {
          if (player.socket) {
            player.socket.yarisWorldId = "";
            player.socket.yarisPlayerId = "";
          }
        }
        yarisSehriWorlds.delete(worldId);
        continue;
      }
      world.race = createYarisRace();
      broadcastYarisWorld(world, { type: "race-reset" });
    }

    if (world.isRanked) updateYarisRankedBots(world, now);
    if (world.isChase) updateYarisChase(world, now, worldId);

    broadcastYarisWorld(world, {
      type: "state",
      t: now,
      weather: world.weather,
      players: [...world.players.values()].map(publicYarisPlayer),
    });
  }
}

// ---------------------------------------------------------------------------
// Sezon sistemi: 7 günlük sezonlar, "en çok yarış kazanan" tablosu.
// Sayılan galibiyetler: açık dünya + dereceli yarış birincilikleri VE
// kovalamaca kazanan takım üyeliği (hesaplı oyuncular; misafirler sayılmaz).
// ---------------------------------------------------------------------------

const YARIS_SEASON_MS = 7 * 24 * 60 * 60 * 1000;
const YARIS_SEASON_REWARDS = [300, 200, 100];

function yarisSeasonObjective(season) {
  return YARIS_SEASON_OBJECTIVES[(Math.max(1, season) - 1) % YARIS_SEASON_OBJECTIVES.length];
}

function normalizeYarisSeason(value) {
  const now = Date.now();
  if (!value || typeof value !== "object" || !Number.isFinite(Number(value.season))) {
    // Not: YARIS_SEASON_MS const'ı dosyanın ilerisinde; burada sabit yazılır (TDZ).
    return { season: 1, objective: "arabaci", startedAt: new Date(now).toISOString(), endsAt: now + 7 * 24 * 60 * 60 * 1000, scores: {}, pastSeasons: [] };
  }
  const season = Math.max(1, Math.floor(Number(value.season)));
  const scores = {};
  if (value.scores && typeof value.scores === "object") {
    for (const [accountId, entry] of Object.entries(value.scores)) {
      // Eski kayıtlar wins alanı taşır -> score'a taşınır
      const score = clamp(Math.floor(Number(entry?.score ?? entry?.wins) || 0), 0, 100000000);
      if (score <= 0) continue;
      scores[safeText(accountId, 80)] = {
        nickname: safeText(entry?.nickname, 24) || "oyuncu",
        score,
        updatedAt: Number(entry?.updatedAt) || 0,
      };
    }
  }
  return {
    season,
    objective: yarisSeasonObjective(season).id,
    startedAt: safeText(value.startedAt, 40) || new Date(now).toISOString(),
    endsAt: Number(value.endsAt) || now + 7 * 24 * 60 * 60 * 1000,
    scores,
    pastSeasons: Array.isArray(value.pastSeasons) ? value.pastSeasons.slice(0, 10) : [],
  };
}

// Tema dışı olaylar skora girmez: objectiveId yalnızca aktif temaysa yazılır.
function addYarisSeasonScore(account, objectiveId, amount) {
  if (!account || yarisSeason.objective !== objectiveId) return;
  const value = Math.floor(Number(amount) || 0);
  if (value <= 0) return;
  const entry = yarisSeason.scores[account.id] || { nickname: account.nickname, score: 0, updatedAt: 0 };
  entry.nickname = account.nickname;
  entry.score += value;
  entry.updatedAt = Date.now();
  yarisSeason.scores[account.id] = entry;
  writeJson("yaris-season.json", yarisSeason).catch(() => {});
}

function addYarisSeasonGold(account, amount) {
  if (amount > 0) addYarisSeasonScore(account, "altin", amount);
}

// Genel sezon skoru rate limit'i: dakikada 30, günde 200 bildirim (bellek içi).
const seasonScoreRate = new Map(); // accountId -> { minuteStart, minuteCount, dayStart, dayCount }

// Heartbeat süre takibi (araba-zaman / site-zaman sezonları): sessionId -> son heartbeat zamanı
const seasonHeartbeat = new Map();

// Zaman sezonlarında oynadıkça altın: skora işlenen her 5 dakika +1🪙 (kalıntı korunur).
// Test için env ile düşürülebilir: YARIS_TIME_GOLD_SECONDS
const YARIS_TIME_GOLD_SECONDS = Number(process.env.YARIS_TIME_GOLD_SECONDS || 300);
const seasonTimeGold = new Map(); // accountId -> altına çevrilmemiş saniye

function addYarisTimeGold(account, seconds) {
  const total = (seasonTimeGold.get(account.id) || 0) + seconds;
  const gold = Math.floor(total / YARIS_TIME_GOLD_SECONDS);
  seasonTimeGold.set(account.id, total % YARIS_TIME_GOLD_SECONDS);
  if (gold > 0) {
    // Site geneli tek cüzdan: yaris-sehri profil altını
    const profile = yarisProfileOf(account);
    profile.gold += gold;
    writeJson("accounts.json", accounts).catch(() => {});
  }
}

function trackSeasonHeartbeat(sessionId, activeGame) {
  const objective = yarisSeasonObjective(yarisSeason.season);
  const kind = objective.kind || "";
  if (kind !== "game-time" && kind !== "site-time") return;
  const account = accountBySessionId(sessionId);
  if (!account) return; // misafirler sayılmaz
  if (kind === "game-time" && activeGame !== objective.game.slug) return;
  const now = Date.now();
  const prev = seasonHeartbeat.get(sessionId);
  seasonHeartbeat.set(sessionId, now);
  if (!prev) return; // ilk heartbeat'te başlangıç işaretlenir
  // Sekme uyursa/ara verirse tek seferde en fazla 90 sn say
  const deltaSec = clamp(Math.round((now - prev) / 1000), 0, 90);
  if (deltaSec > 0) {
    addYarisSeasonScore(account, objective.id, deltaSec);
    addYarisTimeGold(account, deltaSec);
  }
  // Harita şişmesin
  if (seasonHeartbeat.size > 5000) {
    for (const [id, seen] of seasonHeartbeat) {
      if (now - seen > 3600000) seasonHeartbeat.delete(id);
    }
  }
}

function checkSeasonScoreRateLimit(accountId) {
  const now = Date.now();
  let entry = seasonScoreRate.get(accountId);
  if (!entry) {
    entry = { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
    seasonScoreRate.set(accountId, entry);
  }
  if (now - entry.minuteStart > 60000) {
    entry.minuteStart = now;
    entry.minuteCount = 0;
  }
  if (now - entry.dayStart > 86400000) {
    entry.dayStart = now;
    entry.dayCount = 0;
  }
  if (entry.minuteCount >= 30 || entry.dayCount >= 200) return false;
  entry.minuteCount += 1;
  entry.dayCount += 1;
  return true;
}

function checkYarisSeasonRollover(now) {
  if (now < yarisSeason.endsAt) return;
  const ranked = Object.entries(yarisSeason.scores)
    .map(([accountId, entry]) => ({ accountId, ...entry }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
  const top3 = ranked.slice(0, 3);
  top3.forEach((entry, index) => {
    const account = accountById(entry.accountId);
    if (!account) return;
    const profile = yarisProfileOf(account);
    profile.gold += YARIS_SEASON_REWARDS[index] || 0;
    profile.seasonWins = [{ season: yarisSeason.season, rank: index + 1 }, ...profile.seasonWins].slice(0, 50);
  });
  if (top3.length > 0) writeJson("accounts.json", accounts).catch(() => {});
  const nextSeason = yarisSeason.season + 1;
  yarisSeason = {
    season: nextSeason,
    objective: yarisSeasonObjective(nextSeason).id,
    startedAt: new Date(now).toISOString(),
    endsAt: now + YARIS_SEASON_MS,
    scores: {},
    pastSeasons: [
      {
        season: yarisSeason.season,
        objective: yarisSeason.objective,
        game: yarisSeasonObjective(yarisSeason.season).game,
        endedAt: new Date(now).toISOString(),
        top3: top3.map((entry, index) => ({ nickname: entry.nickname, score: entry.score, rank: index + 1 })),
      },
      ...yarisSeason.pastSeasons,
    ].slice(0, 10),
  };
  writeJson("yaris-season.json", yarisSeason).catch(() => {});
  console.log(`[yaris-sehri] sezon ${yarisSeason.season - 1} (${yarisSeason.pastSeasons[0]?.objective}) bitti, sezon ${yarisSeason.season} (${yarisSeason.objective}) başladı`);
}

// ---------------------------------------------------------------------------
// Yarış Şehri (Hakorocks Şehri): araba galerisi, profil kalıcılığı, dereceli
// ---------------------------------------------------------------------------

const YARIS_CARS = [
  { id: "minik", name: "Minik", price: 0, maxSpeed: 560, accel: 390, grip: 2.4, color: "#4ea3ff" },
  { id: "serit", name: "Şerit", price: 80, maxSpeed: 620, accel: 435, grip: 2.55, color: "#69d18b" },
  { id: "pars", name: "Pars", price: 160, maxSpeed: 680, accel: 480, grip: 2.7, color: "#ff9f43" },
  { id: "seytan", name: "Şeytan", price: 280, maxSpeed: 740, accel: 530, grip: 2.85, color: "#ff5b6e" },
  { id: "firtina", name: "Fırtına", price: 430, maxSpeed: 800, accel: 585, grip: 3.0, color: "#b67dff" },
  { id: "efsane", name: "Efsane", price: 650, maxSpeed: 860, accel: 640, grip: 3.2, color: "#ffd166" },
];

// Yarış ödülleri: sıraya göre altın ve puan (4.-5. ve bitiremeyen 0 puan; katılım altını 10).
const YARIS_RACE_GOLD = [30, 20, 15];
const YARIS_RACE_RATING = [15, 10, 5];
const YARIS_RANKED_LIMITS = { matchMinPlayers: 2, matchMaxPlayers: 5, soloWaitMs: 20000, baseWindow: 75, windowPerSecond: 25 };

// Public dünya "klasik" harita; parti/dereceli/kovalamaca host seçimi veya rastgele.
// Üretim parametreleri istemciyle birebir aynı olmalı (oyunlar/yaris-sehri/game.js YARIS_MAPS).
const YARIS_MAPS = [
  { id: "klasik", name: "Klasik Şehir", desc: "Her şeyden biraz: merkez, parklar, liman.", seed: 20260815, params: {} },
  { id: "liman", name: "Büyük Liman", desc: "Geniş su ve uzun iskeleler.", seed: 20260816, params: { waterStart: 5000, piers: 6 } },
  { id: "gokdelen", name: "Gökdelenler", desc: "Yoğun ve çok yüksek şehir merkezi.", seed: 20260817, params: { downtownRadius: 2, downtownH: [180, 330] } },
  { id: "park-sehri", name: "Park Şehri", desc: "Her köşede park ve gölet.", seed: 20260818, params: { parkChance: 0.5, pondChance: 0.6 } },
  { id: "sanayi", name: "Sanayi Bölgesi", desc: "Depolar, vinçler, geniş alanlar.", seed: 20260819, params: { industrialWide: true, craneChance: 0.85 } },
  { id: "cift-stadyum", name: "Çift Stadyum", desc: "İki dev stadyumlu şehir.", seed: 20260820, params: { extraStadium: true } },
  { id: "goletler", name: "Göletler Diyarı", desc: "Her parkta büyük göletler.", seed: 20260821, params: { parkChance: 0.35, pondChance: 1, pondScale: 1.6 } },
  { id: "dar-sokaklar", name: "Dar Sokaklar", desc: "İncecik sokaklar, ustalık ister.", seed: 20260822, params: { roadHalf: 35 } },
  { id: "bulvarlar", name: "Bulvarlar", desc: "Ultra geniş düz yollar — hız için.", seed: 20260823, params: { roadHalf: 100 } },
  { id: "gece", name: "Gece Şehri", desc: "Karanlık tema, sokak lambaları parlar.", seed: 20260824, params: { night: true } },
];
const YARIS_DEFAULT_MAP_ID = "klasik";
const YARIS_PUBLIC_SEED = 20260815;

function yarisMapDef(mapId) {
  return YARIS_MAPS.find((map) => map.id === mapId) || null;
}

function normalizeYarisMapId(value) {
  const mapId = safeText(value, 24);
  return YARIS_MAPS.some((map) => map.id === mapId) ? mapId : "";
}

// Araba boyaları (buy-car deseniyle satılır; "standart" bedava = araba kendi rengi)
const YARIS_PAINTS = [
  { id: "standart", name: "Standart", price: 0, type: "solid", color: "" },
  { id: "mat-siyah", name: "Mat Siyah", price: 60, type: "solid", color: "#15181d" },
  { id: "kar-beyazi", name: "Kar Beyazı", price: 60, type: "solid", color: "#e8eef6" },
  { id: "ates-kirmizi", name: "Ateş Kırmızısı", price: 90, type: "solid", color: "#ff2a2a" },
  { id: "gece-mavisi", name: "Gece Mavisi", price: 90, type: "solid", color: "#1a3aff" },
  { id: "neon-pembe", name: "Neon Pembe", price: 90, type: "solid", color: "#ff4fd8" },
  { id: "zumrut", name: "Zümrüt", price: 120, type: "solid", color: "#00b377" },
  { id: "kamuflaj", name: "Kamuflaj", price: 150, type: "camo", color: "#3a4a2a" },
  { id: "altin", name: "Altın Kaplama", price: 250, type: "solid", color: "#ffd700" },
  { id: "gokkusagi", name: "Gökkuşağı", price: 300, type: "rainbow", color: "#ff8fd6" },
];

function normalizeYarisPaintId(value) {
  const paintId = safeText(value, 24);
  return YARIS_PAINTS.some((paint) => paint.id === paintId) ? paintId : "";
}

function createYarisProfile() {
  return {
    gold: 0,
    cars: ["minik"],
    selectedCar: "minik",
    paints: ["standart"],
    selectedPaint: "standart",
    chaseCups: 0,
    seasonWins: [],
    rating: 100,
    tutorialDone: false,
    ttBestMs: 0,
    stuntBest: 0,
    iceBest: 0,
  };
}

function normalizeYarisProfile(value) {
  const base = createYarisProfile();
  if (!value || typeof value !== "object") return base;
  const cars = Array.isArray(value.cars)
    ? [...new Set(value.cars.map((id) => safeText(id, 24)).filter((id) => YARIS_CARS.some((car) => car.id === id)))]
    : [];
  if (!cars.includes("minik")) cars.unshift("minik");
  const selectedCar = safeText(value.selectedCar, 24);
  const paints = Array.isArray(value.paints)
    ? [...new Set(value.paints.map((id) => safeText(id, 24)).filter((id) => YARIS_PAINTS.some((paint) => paint.id === id)))]
    : [];
  if (!paints.includes("standart")) paints.unshift("standart");
  const selectedPaint = safeText(value.selectedPaint, 24);
  return {
    gold: clamp(Math.floor(Number(value.gold) || 0), 0, 1_000_000),
    cars,
    selectedCar: cars.includes(selectedCar) ? selectedCar : "minik",
    paints,
    selectedPaint: paints.includes(selectedPaint) ? selectedPaint : "standart",
    chaseCups: clamp(Math.floor(Number(value.chaseCups) || 0), 0, 100000),
    seasonWins: Array.isArray(value.seasonWins)
      ? value.seasonWins
          .map((entry) => ({ season: Math.floor(Number(entry?.season) || 0), rank: Math.floor(Number(entry?.rank) || 0) }))
          .filter((entry) => entry.season > 0 && entry.rank >= 1 && entry.rank <= 3)
          .slice(0, 50)
      : [],
    rating: clamp(Math.floor(Number(value.rating) || 100), 0, 100000),
    tutorialDone: Boolean(value.tutorialDone),
    ttBestMs: clamp(Math.floor(Number(value.ttBestMs) || 0), 0, YARIS_LIMITS.ttMaxMs),
    stuntBest: clamp(Math.floor(Number(value.stuntBest) || 0), 0, 500000),
    iceBest: clamp(Math.floor(Number(value.iceBest) || 0), 0, 500000),
  };
}

function yarisProfileOf(account) {
  if (!account) return null;
  account.yarisSehri = normalizeYarisProfile(account.yarisSehri);
  return account.yarisSehri;
}

function yarisAccountFromAuth(sessionId, authToken) {
  if (!sessionId || !authToken) return null;
  const account = accounts.find((item) => item.authToken && item.authToken === authToken);
  if (!account || account.sessionId !== sessionId) return null;
  return account;
}

// ---------------------------------------------------------------------------
// Dereceli eşleştirme: kuyruk -> yakın puanlı grup -> botlu dünya
// ---------------------------------------------------------------------------

let yarisRankedQueue = []; // { socket, playerId, sessionId, nickname, color, rating, accountId, queuedAt }
let yarisRankedCounter = 0;

function joinYarisRankedQueue(socket, message) {
  const sessionId = safeText(message.sessionId, 120);
  if (!sessionId) {
    sendYaris(socket, { type: "yaris-error", code: "invalid-join", message: "Oturum bilgisi eksik." });
    return;
  }
  if (socket.yarisWorldId) leaveYarisWorld(socket);
  if (socket.yarisRanked) return;
  const account = accountBySessionId(sessionId);
  const profile = account ? yarisProfileOf(account) : null;
  const nickname = safeText(message.nickname, 24) || account?.nickname || "misafir";
  yarisPlayerCounter += 1;
  yarisRankedQueue.push({
    socket,
    playerId: `yp${yarisPlayerCounter}`,
    sessionId,
    nickname,
    color: normalizeYarisColor(message.color),
    paint: profile?.selectedPaint || normalizeYarisPaintId(message.paint) || "standart",
    rating: profile?.rating ?? 100,
    accountId: account?.id || "",
    queuedAt: Date.now(),
  });
  socket.yarisRanked = true;
  sendYaris(socket, { type: "ranked-queued", rating: profile?.rating ?? 100 });
}

function leaveYarisRankedQueue(socket) {
  if (!socket.yarisRanked) return;
  socket.yarisRanked = false;
  yarisRankedQueue = yarisRankedQueue.filter((entry) => entry.socket !== socket);
}

function tickYarisRankedQueue() {
  const now = Date.now();
  yarisRankedQueue = yarisRankedQueue.filter((entry) => entry.socket.readyState === 1 && entry.socket.yarisRanked);
  if (yarisRankedQueue.length === 0) return;
  yarisRankedQueue.sort((a, b) => a.queuedAt - b.queuedAt);

  const used = new Set();
  for (const entry of yarisRankedQueue) {
    if (used.has(entry)) continue;
    const waitedMs = now - entry.queuedAt;
    const windowSize = YARIS_RANKED_LIMITS.baseWindow + (waitedMs / 1000) * YARIS_RANKED_LIMITS.windowPerSecond;
    const group = yarisRankedQueue
      .filter((candidate) => !used.has(candidate) && Math.abs(candidate.rating - entry.rating) <= windowSize)
      .slice(0, YARIS_RANKED_LIMITS.matchMaxPlayers);
    if (group.length >= YARIS_RANKED_LIMITS.matchMinPlayers || waitedMs >= YARIS_RANKED_LIMITS.soloWaitMs) {
      for (const member of group) used.add(member);
      startYarisRankedMatch(group);
    }
  }
  if (used.size > 0) yarisRankedQueue = yarisRankedQueue.filter((entry) => !used.has(entry));
}

function yarisGridPosition(route, index) {
  const start = route[0];
  const next = route[1];
  const dirAngle = Math.atan2(next.y - start.y, next.x - start.x);
  const back = 60 + Math.floor(index / 2) * 46;
  const side = (index % 2 === 0 ? -1 : 1) * 24;
  return {
    x: start.x - Math.cos(dirAngle) * back + Math.cos(dirAngle + Math.PI / 2) * side,
    y: start.y - Math.sin(dirAngle) * back + Math.sin(dirAngle + Math.PI / 2) * side,
    angle: dirAngle,
  };
}

const YARIS_BOT_NAMES = ["Bot Efe", "Bot Zeynep", "Bot Can", "Bot Mert", "Bot Ada"];

function startYarisRankedMatch(entries) {
  yarisRankedCounter += 1;
  const worldId = `ranked-${yarisRankedCounter}`;
  const rankedMap = YARIS_MAPS[Math.floor(Math.random() * YARIS_MAPS.length)];
  const world = createYarisWorld(worldId, "", rankedMap.id);
  world.isRanked = true;
  yarisSehriWorlds.set(worldId, world);

  for (const entry of entries) {
    world.players.set(entry.playerId, {
      id: entry.playerId,
      sessionId: entry.sessionId,
      nickname: entry.nickname,
      color: entry.color,
      paint: entry.paint || "standart",
      accountId: entry.accountId,
      isBot: false,
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      socket: entry.socket,
      joinedAt: Date.now(),
    });
    entry.socket.yarisRanked = false;
    entry.socket.yarisWorldId = worldId;
    entry.socket.yarisPlayerId = entry.playerId;
  }

  // Toplam 3-5 yarışçı olacak şekilde botlarla doldur.
  const totalSlots = Math.min(YARIS_RANKED_LIMITS.matchMaxPlayers, Math.max(3, entries.length + (Math.random() < 0.5 ? 1 : 2)));
  const botCount = Math.max(0, totalSlots - entries.length);
  for (let i = 0; i < botCount; i += 1) {
    yarisPlayerCounter += 1;
    const botId = `yp${yarisPlayerCounter}`;
    world.players.set(botId, {
      id: botId,
      sessionId: "",
      nickname: YARIS_BOT_NAMES[i % YARIS_BOT_NAMES.length],
      color: YARIS_COLORS[(i + 2) % YARIS_COLORS.length],
      accountId: "",
      isBot: true,
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      dist: 0,
      botSpeed: 300 + Math.random() * 90,
      h: 0,
      socket: null,
      joinedAt: Date.now(),
    });
  }

  const ids = [...world.players.keys()];
  ids.forEach((id, index) => {
    const player = world.players.get(id);
    const grid = yarisGridPosition(YARIS_RACE_ROUTE, index);
    player.x = grid.x;
    player.y = grid.y;
    player.angle = grid.angle;
  });

  const race = world.race;
  race.state = "countdown";
  race.startsAt = Date.now() + YARIS_LIMITS.raceCountdownMs;
  race.lobby = ids;
  race.progress = new Map(ids.map((id) => [id, { next: 1, finishedAt: 0, timeMs: 0 }]));

  for (const entry of entries) {
    const account = entry.accountId ? accountById(entry.accountId) : null;
    sendYaris(entry.socket, {
      type: "joined",
      worldId,
      partyCode: "",
      ranked: true,
      mapSeed: world.mapSeed,
      mapId: world.mapId,
      weather: world.weather,
      selfId: entry.playerId,
      players: [...world.players.values()].map(publicYarisPlayer),
      race: publicYarisRace(world),
      ttScores: [],
      routes: { race: YARIS_RACE_ROUTE, tt: YARIS_TT_ROUTE },
      zones: YARIS_ZONES,
      limits: { maxPlayers: YARIS_LIMITS.maxPlayers, raceMinPlayers: YARIS_LIMITS.raceMinPlayers, raceMaxPlayers: YARIS_LIMITS.raceMaxPlayers },
      profile: account ? yarisProfileOf(account) : null,
    });
  }
  broadcastYarisWorld(world, { type: "race-countdown", race: publicYarisRace(world) });
}

// Rota poligonu üzerinde mesafe -> konum (bot sürücüler için).
function yarisRouteLengths(route) {
  const cum = [0];
  let total = 0;
  for (let i = 0; i < route.length; i += 1) {
    const a = route[i];
    const b = route[(i + 1) % route.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
    cum.push(total);
  }
  return { cum, total };
}

function pointAlongYarisRoute(route, lengths, dist) {
  const total = lengths.total;
  const d = ((dist % total) + total) % total;
  for (let i = 0; i < route.length; i += 1) {
    if (d <= lengths.cum[i + 1]) {
      const a = route[i];
      const b = route[(i + 1) % route.length];
      const segLen = lengths.cum[i + 1] - lengths.cum[i] || 1;
      const t = (d - lengths.cum[i]) / segLen;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
  }
  return { x: route[0].x, y: route[0].y, angle: 0 };
}

function updateYarisRankedBots(world, now) {
  const race = world.race;
  if (race.state !== "running") return;
  const lengths = yarisRouteLengths(race.route);
  let allFinished = true;
  for (const player of world.players.values()) {
    const prog = race.progress.get(player.id);
    if (!prog) continue;
    if (!player.isBot) {
      if (!prog.finishedAt) allFinished = false;
      continue;
    }
    if (prog.finishedAt) continue;
    player.dist += player.botSpeed * 0.1;
    const pos = pointAlongYarisRoute(race.route, lengths, player.dist);
    player.x = pos.x;
    player.y = pos.y;
    player.angle = pos.angle;
    player.speed = player.botSpeed;
    while (prog.next < race.route.length && player.dist >= lengths.cum[prog.next]) prog.next += 1;
    if (prog.next >= race.route.length && player.dist >= lengths.total) {
      prog.finishedAt = now;
      prog.timeMs = now - race.startedAt;
      race.results.push({ id: player.id, nickname: player.nickname, color: player.color, timeMs: prog.timeMs, bot: true });
      broadcastYarisWorld(world, { type: "race-progress", race: publicYarisRace(world) });
    } else {
      allFinished = false;
    }
  }
  if (allFinished && race.progress.size > 0) finishYarisRace(world);
}

// ---------------------------------------------------------------------------
// Polis Kovalamaca: parti kodlu oda, Polisler vs Kaçaklar (bot dolgulu)
// ---------------------------------------------------------------------------

const YARIS_CHASE_LIMITS = {
  teamSizes: [2, 3, 4, 5],
  headstartMs: 10000, // kaçak avansı
  durationMs: 180000, // 3 dk
  catchDist: 40,
  catchMs: 2000, // temas mesafesinde kalma süresi
  resultsMs: 15000,
  winGold: 25,
  loseGold: 10,
  catchGold: 5,
  botSpeedCop: 345,
  botSpeedRobber: 330,
};

function createYarisChase() {
  return {
    hostId: "",
    teamSize: 2,
    phase: "lobby", // lobby | headstart | running | ended
    cops: [],
    robbers: [],
    caught: [], // yakalanan kaçak id'leri
    catches: {}, // copId -> yakalama sayısı
    winner: "", // cops | robbers
    headstartEndsAt: 0,
    endsAt: 0,
    resultsEndAt: 0,
    contact: {}, // robberId -> temas süresi (ms)
  };
}

function publicYarisChase(world) {
  const chase = world.chase;
  const describe = (id) => {
    const player = world.players.get(id);
    return player
      ? { id, nickname: player.nickname, color: player.color, paint: player.paint || "standart", bot: Boolean(player.isBot) }
      : null;
  };
  return {
    hostId: chase.hostId,
    teamSize: chase.teamSize,
    mapId: world.mapId,
    phase: chase.phase,
    cops: chase.cops.map(describe).filter(Boolean),
    robbers: chase.robbers.map(describe).filter(Boolean),
    caught: chase.caught,
    catches: chase.catches,
    winner: chase.winner,
    headstartEndsAt: chase.headstartEndsAt,
    endsAt: chase.endsAt,
    players: [...world.players.values()]
      .filter((p) => !p.isBot)
      .map((p) => ({ id: p.id, nickname: p.nickname, color: p.color, paint: p.paint || "standart" })),
  };
}

function broadcastYarisChaseLobby(world) {
  broadcastYarisWorld(world, { type: "chase-lobby", chase: publicYarisChase(world) });
}

function joinYarisChase(socket, message, create) {
  const sessionId = safeText(message.sessionId, 120);
  if (!sessionId) {
    sendYaris(socket, { type: "yaris-error", code: "invalid-join", message: "Oturum bilgisi eksik." });
    return;
  }
  const account = accountBySessionId(sessionId);
  const nickname = safeText(message.nickname, 24) || account?.nickname || "misafir";
  const color = normalizeYarisColor(message.color);
  const paint = account
    ? yarisProfileOf(account).selectedPaint
    : normalizeYarisPaintId(message.paint) || "standart";

  let world;
  if (create) {
    let code = "";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = String(Math.floor(100000 + Math.random() * 900000));
      if (!yarisSehriWorlds.has(`chase-${candidate}`)) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      sendYaris(socket, { type: "yaris-error", code: "chase-create-failed", message: "Oda kurulamadı, tekrar dene." });
      return;
    }
    let chaseMapId = YARIS_DEFAULT_MAP_ID;
    if (message.mapId != null) {
      chaseMapId = normalizeYarisMapId(message.mapId);
      if (!chaseMapId) {
        sendYaris(socket, { type: "yaris-error", code: "unknown-map", message: "Böyle bir harita yok." });
        return;
      }
    }
    world = createYarisWorld(`chase-${code}`, code, chaseMapId);
    world.isChase = true;
    world.chase = createYarisChase();
    yarisSehriWorlds.set(world.id, world);
  } else {
    const code = safeText(message.code, 8).replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      sendYaris(socket, { type: "yaris-error", code: "invalid-chase-code", message: "Oda kodu 6 haneli olmalı." });
      return;
    }
    world = yarisSehriWorlds.get(`chase-${code}`);
    if (!world || !world.isChase) {
      sendYaris(socket, { type: "yaris-error", code: "chase-not-found", message: "Bu kodla bir kovalamaca odası bulunamadı." });
      return;
    }
    if (world.chase.phase !== "lobby") {
      sendYaris(socket, { type: "yaris-error", code: "chase-in-progress", message: "Maç çoktan başladı." });
      return;
    }
    const humans = [...world.players.values()].filter((p) => !p.isBot).length;
    if (humans >= 10) {
      sendYaris(socket, { type: "yaris-error", code: "chase-full", message: "Oda dolu (en fazla 10 oyuncu)." });
      return;
    }
  }

  if (socket.yarisWorldId) leaveYarisWorld(socket);

  yarisPlayerCounter += 1;
  const player = {
    id: `yp${yarisPlayerCounter}`,
    sessionId,
    nickname,
    color,
    paint,
    accountId: account?.id || "",
    isBot: false,
    h: 0,
    x: 3000 + (Math.random() * 120 - 60),
    y: 3000 + (Math.random() * 120 - 60),
    angle: 0,
    speed: 0,
    socket,
    joinedAt: Date.now(),
  };
  world.players.set(player.id, player);
  socket.yarisPlayerId = player.id;
  socket.yarisWorldId = world.id;
  socket.yarisLastPosAt = 0;
  if (!world.chase.hostId) world.chase.hostId = player.id;

  sendYaris(socket, {
    type: "joined",
    worldId: world.id,
    partyCode: world.partyCode,
    chase: true,
    mapSeed: world.mapSeed,
    mapId: world.mapId,
    weather: world.weather,
    selfId: player.id,
    players: [...world.players.values()].map(publicYarisPlayer),
    race: publicYarisRace(world),
    ttScores: [],
    routes: { race: YARIS_RACE_ROUTE, tt: YARIS_TT_ROUTE },
    zones: YARIS_ZONES,
    limits: { maxPlayers: YARIS_LIMITS.maxPlayers, raceMinPlayers: YARIS_LIMITS.raceMinPlayers, raceMaxPlayers: YARIS_LIMITS.raceMaxPlayers },
    profile: account ? yarisProfileOf(account) : null,
  });
  broadcastYarisChaseLobby(world);
}

function setYarisChaseTeamSize(socket, message) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world?.isChase || !player) return;
  const chase = world.chase;
  if (chase.phase !== "lobby" || chase.hostId !== player.id) return;
  const size = Number(message.size);
  if (!YARIS_CHASE_LIMITS.teamSizes.includes(size)) return;
  chase.teamSize = size;
  broadcastYarisChaseLobby(world);
}

function setYarisChaseMap(socket, message) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world?.isChase || !player) return;
  const chase = world.chase;
  if (chase.phase !== "lobby" || chase.hostId !== player.id) return;
  const mapId = normalizeYarisMapId(message.mapId);
  if (!mapId) return;
  const def = yarisMapDef(mapId);
  world.mapId = def.id;
  world.mapSeed = def.seed;
  broadcastYarisChaseLobby(world);
}

function startYarisChaseBySocket(socket) {
  const { world, player } = yarisPlayerOf(socket);
  if (!world?.isChase || !player) return;
  const chase = world.chase;
  if (chase.phase !== "lobby" || chase.hostId !== player.id) return;
  const humans = [...world.players.values()].filter((p) => !p.isBot);
  if (humans.length < 2) {
    sendYaris(socket, { type: "yaris-error", code: "chase-not-enough", message: "Başlatmak için en az 2 oyuncu gerekli." });
    return;
  }

  // Takımlar: karıştır, sırayla polis/kaçak dağıt; botlarla teamSize'a tamamla.
  const shuffled = [...humans].sort(() => Math.random() - 0.5);
  chase.cops = [];
  chase.robbers = [];
  shuffled.forEach((p, index) => {
    (index % 2 === 0 ? chase.cops : chase.robbers).push(p.id);
  });
  const botNames = ["Bot Polis Rıza", "Bot Polis Alev", "Bot Kaçak Tilki", "Bot Kaçak Gölge", "Bot Polis Şimşek", "Bot Kaçak Rüzgar"];
  let botIndex = 0;
  const addBot = (team) => {
    yarisPlayerCounter += 1;
    const botId = `yp${yarisPlayerCounter}`;
    world.players.set(botId, {
      id: botId,
      sessionId: "",
      nickname: botNames[botIndex++ % botNames.length],
      color: team === "cops" ? "#4ea3ff" : "#ff9f43",
      paint: "standart",
      accountId: "",
      isBot: true,
      h: 0,
      x: 3000,
      y: 3000,
      angle: Math.random() * Math.PI * 2,
      speed: 0,
      socket: null,
      joinedAt: Date.now(),
    });
    (team === "cops" ? chase.cops : chase.robbers).push(botId);
  };
  while (chase.cops.length < chase.teamSize) addBot("cops");
  while (chase.robbers.length < chase.teamSize) addBot("robbers");
  // Eşitlik için: takımlar tam teamSize olur (insan fazlaysa bot eklenmez)

  chase.caught = [];
  chase.catches = {};
  chase.contact = {};
  chase.winner = "";
  const now = Date.now();
  chase.phase = "headstart";
  chase.headstartEndsAt = now + YARIS_CHASE_LIMITS.headstartMs;
  chase.endsAt = chase.headstartEndsAt + YARIS_CHASE_LIMITS.durationMs;

  // Doğuş: kaçaklar merkezde, polisler yarış başlangıcında (kuzeybatı)
  chase.robbers.forEach((id, i) => {
    const p = world.players.get(id);
    if (!p) return;
    p.x = 3000 + (i % 3) * 80 - 80;
    p.y = 3000 + Math.floor(i / 3) * 80 - 40;
    p.angle = Math.PI / 2;
  });
  chase.cops.forEach((id, i) => {
    const p = world.players.get(id);
    if (!p) return;
    p.x = 600 + (i % 3) * 70 - 70;
    p.y = 600 + Math.floor(i / 3) * 70;
    p.angle = Math.PI / 2;
  });

  broadcastYarisWorld(world, { type: "chase-start", chase: publicYarisChase(world) });
}

function updateYarisChase(world, now, worldId) {
  const chase = world.chase;
  if (!chase) return;

  if (chase.phase === "headstart" && now >= chase.headstartEndsAt) {
    chase.phase = "running";
    broadcastYarisWorld(world, { type: "chase-update", chase: publicYarisChase(world) });
  }

  if (chase.phase === "running") {
    updateYarisChaseBots(world);
    updateYarisChaseCatches(world, now);
    const freeRobbers = chase.robbers.filter((id) => !chase.caught.includes(id) && world.players.has(id));
    if (freeRobbers.length === 0) {
      finishYarisChase(world, "cops");
    } else if (now >= chase.endsAt) {
      finishYarisChase(world, "robbers");
    }
  }

  if (chase.phase === "ended" && now >= chase.resultsEndAt) {
    broadcastYarisWorld(world, { type: "chase-closed" });
    for (const player of world.players.values()) {
      if (player.socket) {
        player.socket.yarisWorldId = "";
        player.socket.yarisPlayerId = "";
      }
    }
    yarisSehriWorlds.delete(worldId);
  }
}

function updateYarisChaseBots(world) {
  const chase = world.chase;
  const dt = 0.1; // 100ms tick
  for (const player of world.players.values()) {
    if (!player.isBot) continue;
    const isCop = chase.cops.includes(player.id);
    const isRobber = chase.robbers.includes(player.id);
    if (!isCop && !isRobber) continue;
    if (isRobber && chase.caught.includes(player.id)) {
      player.speed = 0;
      continue;
    }

    let wantAngle = player.angle;
    if (isCop) {
      // En yakın serbest kaçağı kovala
      let best = null;
      let bestDist = Infinity;
      for (const robberId of chase.robbers) {
        if (chase.caught.includes(robberId)) continue;
        const robber = world.players.get(robberId);
        if (!robber) continue;
        const d = Math.hypot(robber.x - player.x, robber.y - player.y);
        if (d < bestDist) {
          bestDist = d;
          best = robber;
        }
      }
      if (best) wantAngle = Math.atan2(best.y - player.y, best.x - player.x);
    } else {
      // En yakın polisten kaç + hafif sapma
      let threat = null;
      let threatDist = Infinity;
      for (const copId of chase.cops) {
        const cop = world.players.get(copId);
        if (!cop) continue;
        const d = Math.hypot(cop.x - player.x, cop.y - player.y);
        if (d < threatDist) {
          threatDist = d;
          threat = cop;
        }
      }
      if (threat) {
        wantAngle = Math.atan2(player.y - threat.y, player.x - threat.x) + Math.sin(nowish() / 900 + player.joinedAt) * 0.5;
      }
    }
    let diff = wantAngle - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    const top = isCop ? YARIS_CHASE_LIMITS.botSpeedCop : YARIS_CHASE_LIMITS.botSpeedRobber;
    player.speed += (top - player.speed) * 0.6 * dt;
    player.x = clamp(player.x + Math.cos(player.angle) * player.speed * dt, 60, YARIS_LIMITS.mapSize - 60);
    player.y = clamp(player.y + Math.sin(player.angle) * player.speed * dt, 60, YARIS_LIMITS.mapSize - 60);
  }
}

function nowish() {
  return Date.now();
}

function updateYarisChaseCatches(world, now) {
  const chase = world.chase;
  const dtMs = 100;
  for (const robberId of chase.robbers) {
    if (chase.caught.includes(robberId)) continue;
    const robber = world.players.get(robberId);
    if (!robber) continue;
    let nearestCop = null;
    let nearestDist = Infinity;
    for (const copId of chase.cops) {
      const cop = world.players.get(copId);
      if (!cop) continue;
      const d = Math.hypot(cop.x - robber.x, cop.y - robber.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestCop = cop;
      }
    }
    if (nearestCop && nearestDist <= YARIS_CHASE_LIMITS.catchDist) {
      chase.contact[robberId] = (chase.contact[robberId] || 0) + dtMs;
      if (chase.contact[robberId] >= YARIS_CHASE_LIMITS.catchMs) {
        chase.caught.push(robberId);
        chase.catches[nearestCop.id] = (chase.catches[nearestCop.id] || 0) + 1;
        robber.speed = 0;
        broadcastYarisWorld(world, { type: "chase-update", chase: publicYarisChase(world) });
      }
    } else {
      chase.contact[robberId] = 0;
    }
  }
}

function finishYarisChase(world, winner) {
  const chase = world.chase;
  if (chase.phase === "ended") return;
  chase.phase = "ended";
  chase.winner = winner;
  chase.resultsEndAt = Date.now() + YARIS_CHASE_LIMITS.resultsMs;

  // Ödüller sunucuda: kazanan 25 + kupa, kaybeden 10, yakalama başına polise +5.
  const results = [];
  let accountsChanged = false;
  for (const [team, ids] of [
    ["cops", chase.cops],
    ["robbers", chase.robbers],
  ]) {
    const won = winner === team;
    for (const id of ids) {
      const player = world.players.get(id);
      if (!player) continue;
      const catches = chase.catches[id] || 0;
      const gold = player.isBot ? 0 : (won ? YARIS_CHASE_LIMITS.winGold : YARIS_CHASE_LIMITS.loseGold) + catches * YARIS_CHASE_LIMITS.catchGold;
      const row = {
        id,
        nickname: player.nickname,
        color: player.color,
        team,
        won,
        bot: Boolean(player.isBot),
        catches,
        goldEarned: gold,
        cupEarned: won && !player.isBot ? 1 : 0,
      };
      const account = player.accountId ? accountById(player.accountId) : null;
      const profile = account ? yarisProfileOf(account) : null;
      if (profile) {
        profile.gold += gold;
        addYarisSeasonGold(account, gold);
        if (won) {
          profile.chaseCups += 1;
          addYarisSeasonScore(account, "polis", 1); // polis sezonunda galibiyet sayılır
        }
        row.newGold = profile.gold;
        row.newCups = profile.chaseCups;
        accountsChanged = true;
        if (player.socket) sendYaris(player.socket, { type: "profile", profile });
      }
      results.push(row);
    }
  }
  if (accountsChanged) writeJson("accounts.json", accounts).catch(() => {});
  broadcastYarisWorld(world, {
    type: "chase-end",
    winner,
    results,
    chase: publicYarisChase(world),
  });
}
