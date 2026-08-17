// Sesli Parti — yakınlık sesli sohbet istemcisi
// Akış: takma ad → parti oluştur/katıl → karakter seç → kareli alanda yürü + yakındakini duy.

const TILE = 44;
const GRID = { w: 20, h: 14 }; // sunucu "joined" ile doğrular
const WALK_SPEED = 5.5; // kare / saniye
const HEAR_FULL = 3; // bu mesafeye kadar tam ses
const HEAR_NONE = 15; // bu mesafede ve ötesinde hiç ses yok

const CHARACTERS = [
  { name: "Ateş", skin: "#f1c27d", hair: "#3b2a1a", shirt: "#e74c3c", pants: "#2c3e50" },
  { name: "Deniz", skin: "#ffdbac", hair: "#123a5e", shirt: "#3498db", pants: "#1b2a41" },
  { name: "Orman", skin: "#c68642", hair: "#1e1e1e", shirt: "#27ae60", pants: "#34495e" },
  { name: "Güneş", skin: "#f1c27d", hair: "#d4a017", shirt: "#f1c40f", pants: "#7f5539" },
  { name: "Gece", skin: "#8d5524", hair: "#0d0d0d", shirt: "#2c3e50", pants: "#111111" },
  { name: "Bulut", skin: "#ffdbac", hair: "#e8e8e8", shirt: "#ecf0f1", pants: "#5d6d7e" },
  { name: "Çilek", skin: "#f1c27d", hair: "#8e44ad", shirt: "#e84393", pants: "#2d3436" },
  { name: "Limon", skin: "#c68642", hair: "#6e2c00", shirt: "#a3e635", pants: "#365314" },
  { name: "Lavanta", skin: "#ffdbac", hair: "#5b2c6f", shirt: "#9b59b6", pants: "#4a235a" },
  { name: "Gölge", skin: "#8d5524", hair: "#212121", shirt: "#7f8c8d", pants: "#2c3e50" },
];

const RTC_CONFIG = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

const state = {
  nickname: "",
  avatar: -1,
  pendingAction: "", // "create" | "join"
  pendingCode: "",
  myId: "",
  partyCode: "",
  ws: null,
  self: { tile: { x: 0, y: 0 }, render: { x: 0, y: 0 }, queue: [], walkPhase: 0, walking: false },
  remotes: new Map(), // id -> { id, nickname, avatar, tile, render, walkPhase, walking }
  peers: new Map(), // id -> { pc, gain, pendingCandidates }
  audioCtx: null,
  micStream: null,
  micOk: false,
};

// --- DOM ---
const screens = {
  name: document.getElementById("screen-name"),
  party: document.getElementById("screen-party"),
  character: document.getElementById("screen-character"),
  game: document.getElementById("screen-game"),
};
const nicknameInput = document.getElementById("nickname-input");
const nameError = document.getElementById("name-error");
const partyCodeInput = document.getElementById("party-code-input");
const partyError = document.getElementById("party-error");
const characterGrid = document.getElementById("character-grid");
const characterError = document.getElementById("character-error");
const characterStart = document.getElementById("character-start");
const partyCodeText = document.getElementById("party-code-text");
const copyCodeButton = document.getElementById("copy-code");
const gameStatus = document.getElementById("game-status");
const gameHint = document.getElementById("game-hint");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle("hidden", key !== name);
  }
}

function setStatus(text) {
  gameStatus.textContent = text;
}

// --- İnsan çizimi (ayaklar (0,0) noktasında olacak şekilde) ---
function drawHuman(context, def, walkPhase, walking) {
  const swing = walking ? Math.sin(walkPhase) : 0;
  const bob = walking ? Math.abs(Math.sin(walkPhase)) * 2.2 : 0;
  context.save();
  context.translate(0, -bob);

  // bacaklar
  context.lineCap = "round";
  context.lineWidth = 4;
  context.strokeStyle = def.pants;
  context.beginPath();
  context.moveTo(-2.5, -13);
  context.lineTo(-2.5 + swing * 3.5, 0);
  context.moveTo(2.5, -13);
  context.lineTo(2.5 - swing * 3.5, 0);
  context.stroke();

  // kollar
  context.lineWidth = 3.4;
  context.strokeStyle = def.shirt;
  context.beginPath();
  context.moveTo(-6.5, -24);
  context.lineTo(-7.5 - swing * 3, -13);
  context.moveTo(6.5, -24);
  context.lineTo(7.5 + swing * 3, -13);
  context.stroke();

  // gövde
  context.fillStyle = def.shirt;
  roundRectPath(context, -7, -27, 14, 16, 5);
  context.fill();

  // kafa
  context.fillStyle = def.skin;
  context.beginPath();
  context.arc(0, -34, 6.8, 0, Math.PI * 2);
  context.fill();

  // saç
  context.fillStyle = def.hair;
  context.beginPath();
  context.arc(0, -35.5, 6.4, Math.PI, Math.PI * 2);
  context.fill();

  // gözler
  context.fillStyle = "#1c1c1c";
  context.beginPath();
  context.arc(-2.2, -34, 0.9, 0, Math.PI * 2);
  context.arc(2.2, -34, 0.9, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

// --- Ekran 1: takma ad ---
document.getElementById("name-continue").addEventListener("click", () => {
  const nickname = nicknameInput.value.trim();
  if (nickname.length < 2) {
    nameError.textContent = "Takma adın en az 2 harf olmalı.";
    return;
  }
  state.nickname = nickname.slice(0, 16);
  nameError.textContent = "";
  showScreen("party");
});
nicknameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.getElementById("name-continue").click();
});

// --- Ekran 2: parti ---
document.getElementById("party-create").addEventListener("click", () => {
  state.pendingAction = "create";
  state.pendingCode = "";
  partyError.textContent = "";
  showScreen("character");
});
document.getElementById("party-join").addEventListener("click", () => {
  const code = partyCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    partyError.textContent = "Parti kodu 6 haneli olmalı.";
    return;
  }
  state.pendingAction = "join";
  state.pendingCode = code;
  partyError.textContent = "";
  showScreen("character");
});
partyCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.getElementById("party-join").click();
});

// --- Ekran 3: karakter seçimi ---
function renderCharacterCards() {
  characterGrid.innerHTML = "";
  CHARACTERS.forEach((def, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "character-card";
    const preview = document.createElement("canvas");
    preview.width = 64;
    preview.height = 64;
    const pctx = preview.getContext("2d");
    pctx.save();
    pctx.translate(32, 60);
    pctx.scale(1.45, 1.45);
    drawHuman(pctx, def, 0, false);
    pctx.restore();
    const label = document.createElement("span");
    label.textContent = def.name;
    card.append(preview, label);
    card.addEventListener("click", () => {
      state.avatar = index;
      characterError.textContent = "";
      characterStart.disabled = false;
      characterGrid.querySelectorAll(".character-card").forEach((el) => el.classList.remove("selected"));
      card.classList.add("selected");
    });
    characterGrid.append(card);
  });
}
renderCharacterCards();

characterStart.addEventListener("click", () => {
  if (state.avatar < 0) {
    characterError.textContent = "Önce bir karakter seçmelisin.";
    return;
  }
  showScreen("game");
  void startGame();
});

// --- Oyun başlangıcı: mikrofon + WebSocket ---
async function startGame() {
  partyCodeText.textContent = state.pendingAction === "join" ? state.pendingCode : "------";
  setStatus("Mikrofon isteniyor...");
  state.audioCtx = new AudioContext();
  try {
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    state.micOk = true;
  } catch {
    state.micStream = null;
    state.micOk = false;
  }
  connectWs();
}

function connectWs() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}/sesli-parti`);
  state.ws = ws;
  setStatus("Bağlanıyor...");

  ws.addEventListener("open", () => {
    const message = {
      type: state.pendingAction,
      nickname: state.nickname,
      avatar: state.avatar,
    };
    if (state.pendingAction === "join") message.code = state.pendingCode;
    ws.send(JSON.stringify(message));
  });

  ws.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    handleServerMessage(message);
  });

  ws.addEventListener("close", () => {
    setStatus("🔴 Bağlantı koptu. Sayfayı yenileyip tekrar katılabilirsin.");
    for (const peer of state.peers.values()) peer.pc.close();
    state.peers.clear();
  });

  ws.addEventListener("error", () => {
    setStatus("🔴 Bağlantı hatası oldu.");
  });
}

function wsSend(payload) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(payload));
  }
}

function handleServerMessage(message) {
  if (message.type === "joined") {
    state.myId = message.id;
    state.partyCode = message.code;
    if (message.grid) {
      GRID.w = message.grid.w;
      GRID.h = message.grid.h;
    }
    partyCodeText.textContent = message.code;
    syncPlayers(Array.isArray(message.players) ? message.players : []);
    setStatus(statusText());
    return;
  }
  if (message.type === "state") {
    syncPlayers(Array.isArray(message.players) ? message.players : []);
    setStatus(statusText());
    return;
  }
  if (message.type === "pos") {
    const remote = state.remotes.get(message.id);
    if (remote) {
      remote.tile = { x: message.x, y: message.y };
    }
    return;
  }
  if (message.type === "player-left") {
    state.remotes.delete(message.id);
    closePeer(message.id);
    setStatus(statusText());
    return;
  }
  if (message.type === "signal") {
    void handleSignal(message.from, message.data);
    return;
  }
  if (message.type === "error") {
    showScreen("party");
    partyError.textContent =
      message.code === "room-not-found"
        ? "Bu kodla bir parti bulunamadı. Kodu kontrol et!"
        : message.code === "room-full"
          ? "Bu parti dolu, başka bir parti dene."
          : "Bir hata oldu, tekrar dene.";
  }
}

function statusText() {
  const count = state.remotes.size + 1;
  const mic = state.micOk ? "🎙️ Mikrofon açık" : "🔇 Mikrofon yok (sessiz mod)";
  return `🟢 Partidesin — ${count} kişi · ${mic}`;
}

function syncPlayers(players) {
  const seen = new Set();
  for (const p of players) {
    if (p.id === state.myId) {
      // Kendi ilk konumumuz
      if (!state.selfPlaced) {
        state.self.tile = { x: p.x, y: p.y };
        state.self.render = { x: p.x, y: p.y };
        state.selfPlaced = true;
      }
      continue;
    }
    seen.add(p.id);
    let remote = state.remotes.get(p.id);
    if (!remote) {
      remote = {
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        tile: { x: p.x, y: p.y },
        render: { x: p.x, y: p.y },
        walkPhase: 0,
        walking: false,
      };
      state.remotes.set(p.id, remote);
      maybeCreatePeer(p.id);
    } else {
      remote.nickname = p.nickname;
      remote.avatar = p.avatar;
      remote.tile = { x: p.x, y: p.y };
    }
  }
  for (const id of [...state.remotes.keys()]) {
    if (!seen.has(id)) {
      state.remotes.delete(id);
      closePeer(id);
    }
  }
}

// --- Hareket: tıklanan/dokunulan kareye yürüme (mobil + bilgisayar) ---
canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const tx = Math.floor(((event.clientX - rect.left) * scaleX) / TILE);
  const ty = Math.floor(((event.clientY - rect.top) * scaleY) / TILE);
  if (tx < 0 || ty < 0 || tx >= GRID.w || ty >= GRID.h) return;

  const start = state.self.queue.length
    ? state.self.queue[state.self.queue.length - 1]
    : state.self.tile;
  const path = [];
  let { x, y } = start;
  while (x !== tx) {
    x += Math.sign(tx - x);
    path.push({ x, y });
  }
  while (y !== ty) {
    y += Math.sign(ty - y);
    path.push({ x, y });
  }
  state.self.queue = path;
});

window.addEventListener("pagehide", () => {
  wsSend({ type: "leave" });
});

// --- Oyun döngüsü ---
let lastFrame = performance.now();
function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  stepSelf(dt);
  for (const remote of state.remotes.values()) stepRemote(remote, dt);
  draw();
  updateVolumes();
  requestAnimationFrame(gameLoop);
}

function stepSelf(dt) {
  const self = state.self;
  const target = self.queue[0];
  if (!target) {
    self.walking = false;
    return;
  }
  self.walking = true;
  self.walkPhase += dt * 10;
  const step = WALK_SPEED * dt;
  const dx = target.x - self.render.x;
  const dy = target.y - self.render.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= step) {
    self.render = { ...target };
    self.tile = { ...target };
    self.queue.shift();
    wsSend({ type: "pos", x: target.x, y: target.y });
  } else {
    self.render.x += (dx / dist) * step;
    self.render.y += (dy / dist) * step;
  }
}

function stepRemote(remote, dt) {
  const dx = remote.tile.x - remote.render.x;
  const dy = remote.tile.y - remote.render.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.03) {
    remote.walking = false;
    return;
  }
  remote.walking = true;
  remote.walkPhase += dt * 10;
  const step = WALK_SPEED * dt;
  if (dist <= step) {
    remote.render = { ...remote.tile };
  } else {
    remote.render.x += (dx / dist) * step;
    remote.render.y += (dy / dist) * step;
  }
}

// --- Çizim ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // zemin + kareler
  ctx.fillStyle = "#10162e";
  ctx.fillRect(0, 0, GRID.w * TILE, GRID.h * TILE);
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < GRID.h; y += 1) {
    for (let x = (y % 2); x < GRID.w; x += 2) {
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GRID.w; x += 1) {
    ctx.moveTo(x * TILE, 0);
    ctx.lineTo(x * TILE, GRID.h * TILE);
  }
  for (let y = 0; y <= GRID.h; y += 1) {
    ctx.moveTo(0, y * TILE);
    ctx.lineTo(GRID.w * TILE, y * TILE);
  }
  ctx.stroke();

  // hedef işareti
  const target = state.self.queue[state.self.queue.length - 1];
  if (target) {
    ctx.strokeStyle = "rgba(0,212,166,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc((target.x + 0.5) * TILE, (target.y + 0.6) * TILE, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // karakterler (alttakiler en son çizilsin)
  const drawList = [
    ...[...state.remotes.values()].map((p) => ({ ...p, isSelf: false })),
    {
      id: state.myId,
      nickname: state.nickname,
      avatar: state.avatar,
      render: state.self.render,
      walkPhase: state.self.walkPhase,
      walking: state.self.walking,
      isSelf: true,
    },
  ].sort((a, b) => a.render.y - b.render.y);

  for (const p of drawList) {
    if (p.avatar < 0) continue;
    const def = CHARACTERS[p.avatar] || CHARACTERS[0];
    const cx = (p.render.x + 0.5) * TILE;
    const footY = (p.render.y + 0.85) * TILE;

    // gölge
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, footY + 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // kendi oyuncunun halkası
    if (p.isSelf) {
      ctx.strokeStyle = "rgba(0,212,166,0.8)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, footY + 2, 13, 5.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx, footY);
    drawHuman(ctx, def, p.walkPhase, p.walking);
    ctx.restore();

    // takma ad kafanın üstünde
    const name = p.nickname || "Oyuncu";
    ctx.font = "bold 11px 'Segoe UI', system-ui, sans-serif";
    const w = ctx.measureText(name).width;
    const pillX = cx - w / 2 - 6;
    const pillY = footY - 58;
    ctx.fillStyle = p.isSelf ? "rgba(0,140,110,0.85)" : "rgba(0,0,0,0.6)";
    roundRectPath(ctx, pillX, pillY, w + 12, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, cx, pillY + 8.5);
  }
}
requestAnimationFrame(gameLoop);

// --- Ses: WebRTC mesh + mesafeye göre ses şiddeti ---
function maybeCreatePeer(id) {
  if (id === state.myId || state.peers.has(id)) return;
  // Çift taraflı teklif çakışmasını önlemek için sadece "küçük id" teklif gönderir.
  if (state.myId && state.myId < id) {
    const peer = createPeer(id);
    void makeOffer(peer);
  }
}

function createPeer(id) {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  const peer = { id, pc, gain: null, pendingCandidates: [] };
  state.peers.set(id, peer);

  if (state.micStream) {
    for (const track of state.micStream.getTracks()) {
      pc.addTrack(track, state.micStream);
    }
  } else {
    // Mikrofon yoksa sadece dinle
    pc.addTransceiver("audio", { direction: "recvonly" });
  }

  pc.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      wsSend({ type: "signal", to: id, data: { candidate: event.candidate.toJSON() } });
    }
  });

  pc.addEventListener("track", (event) => {
    const stream = event.streams[0];
    if (!stream || !state.audioCtx) return;
    const source = state.audioCtx.createMediaStreamSource(stream);
    const gain = state.audioCtx.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(state.audioCtx.destination);
    peer.gain = gain;
  });

  pc.addEventListener("connectionstatechange", () => {
    if (pc.connectionState === "failed") {
      pc.restartIce();
    }
  });

  return peer;
}

async function makeOffer(peer) {
  try {
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    wsSend({ type: "signal", to: peer.id, data: { description: peer.pc.localDescription.toJSON() } });
  } catch {
    // bağlantı kurulamadı; bir sonraki state mesajında tekrar denenir
  }
}

async function handleSignal(from, data) {
  if (!data || from === state.myId) return;
  let peer = state.peers.get(from);
  if (!peer) peer = createPeer(from);

  try {
    if (data.description) {
      await peer.pc.setRemoteDescription(data.description);
      for (const candidate of peer.pendingCandidates.splice(0)) {
        await peer.pc.addIceCandidate(candidate).catch(() => {});
      }
      if (data.description.type === "offer") {
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        wsSend({ type: "signal", to: from, data: { description: peer.pc.localDescription.toJSON() } });
      }
    } else if (data.candidate) {
      if (peer.pc.remoteDescription) {
        await peer.pc.addIceCandidate(data.candidate).catch(() => {});
      } else {
        peer.pendingCandidates.push(data.candidate);
      }
    }
  } catch {
    // bozuk sinyal: yoksay
  }
}

function closePeer(id) {
  const peer = state.peers.get(id);
  if (!peer) return;
  try {
    if (peer.gain) peer.gain.disconnect();
    peer.pc.close();
  } catch {
    // zaten kapalı olabilir
  }
  state.peers.delete(id);
}

function distanceGain(dist) {
  if (dist <= HEAR_FULL) return 1;
  if (dist >= HEAR_NONE) return 0;
  return 1 - (dist - HEAR_FULL) / (HEAR_NONE - HEAR_FULL);
}

function updateVolumes() {
  if (!state.audioCtx) return;
  for (const [id, peer] of state.peers) {
    if (!peer.gain) continue;
    const remote = state.remotes.get(id);
    if (!remote) continue;
    const dist = Math.hypot(
      remote.render.x - state.self.render.x,
      remote.render.y - state.self.render.y,
    );
    const value = distanceGain(dist);
    peer.gain.gain.setTargetAtTime(value, state.audioCtx.currentTime, 0.1);
  }
}

// --- Parti kodu kopyalama ---
copyCodeButton.addEventListener("click", async () => {
  if (!state.partyCode) return;
  try {
    await navigator.clipboard.writeText(state.partyCode);
    copyCodeButton.textContent = "✅ Kopyalandı";
  } catch {
    copyCodeButton.textContent = state.partyCode;
  }
  setTimeout(() => {
    copyCodeButton.textContent = "📋 Kopyala";
  }, 1500);
});

gameHint.textContent = "Bir kareye tıkla ya da dokun, insanın oraya yürüsün. Yakınındakileri net duyarsın, 15 kareden uzaktakileri hiç duyamazsın!";
