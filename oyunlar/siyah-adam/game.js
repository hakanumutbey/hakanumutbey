const SESSION_KEY = "hakorocks-session-id";
const ROOM_KEY = "hakorocks-siyah-adam-room";
const NAME_KEY = "siyah-adam-name";
const NICKNAME_KEY = "siyah-adam-nickname";
const COLOR_KEY = "siyah-adam-color";

const arena = document.querySelector("#arena");
const ctx = arena.getContext("2d");
const joinForm = document.querySelector("#joinForm");
const joinButton = document.querySelector("#joinButton");
const readyButton = document.querySelector("#readyButton");
const startButton = document.querySelector("#startButton");
const meetingButton = document.querySelector("#meetingButton");
const leaveButton = document.querySelector("#leaveButton");
const statusText = document.querySelector("#statusText");
const phaseLabel = document.querySelector("#phaseLabel");
const timerLabel = document.querySelector("#timerLabel");
const playerCountLabel = document.querySelector("#playerCountLabel");
const meetingLabel = document.querySelector("#meetingLabel");
const eventLabel = document.querySelector("#eventLabel");
const roleLabel = document.querySelector("#roleLabel");
const playerList = document.querySelector("#playerList");
const actionList = document.querySelector("#actionList");
const eventList = document.querySelector("#eventList");
const roomInput = document.querySelector("#roomInput");
const nameInput = document.querySelector("#nameInput");
const nicknameInput = document.querySelector("#nicknameInput");
const colorSelect = document.querySelector("#colorSelect");

const colors = [
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

const state = {
  roomId: localStorage.getItem(ROOM_KEY) || "siyah-oda",
  connected: false,
  ready: false,
  selfSessionId: "",
  self: null,
  room: null,
  players: [],
  colors,
  targetSessionId: "",
  input: { dx: 0, dy: 0 },
  keyboardInput: { dx: 0, dy: 0 },
  touchInput: { dx: 0, dy: 0 },
  gamepadInput: { dx: 0, dy: 0 },
  heartbeatTimer: null,
  reconnectTimer: null,
};

const sessionId = getSessionId();
const GAMEPAD_DEADZONE = 0.35;
let socket = null;
let account = null;
const gamepadState = { buttons: new Set() };

populateColorSelect();
await loadAccount();
applyPrefill();
bindUI();
joinButton.addEventListener("click", () => {
  if (state.connected) leaveRoom();
  else joinRoom();
});
requestAnimationFrame(draw);
setInterval(() => {
  if (state.connected) sendHeartbeat();
}, 12000);
window.addEventListener("beforeunload", () => {
  try {
    socket?.send(JSON.stringify({ type: "leave" }));
  } catch {}
});
window.addEventListener("gamepaddisconnected", () => {
  gamepadState.buttons = new Set();
  state.gamepadInput.dx = 0;
  state.gamepadInput.dy = 0;
  syncMoveInput();
});

async function loadAccount() {
  try {
    const response = await fetch(`/api/account?sessionId=${encodeURIComponent(sessionId)}`);
    const data = await response.json();
    account = data.account;
    if (account) {
      nameInput.value = account.name || "";
      nicknameInput.value = account.nickname || "";
    }
  } catch {
    account = null;
  }
}

function applyPrefill() {
  roomInput.value = state.roomId;
  nameInput.value ||= localStorage.getItem(NAME_KEY) || account?.name || "Hakan";
  nicknameInput.value ||= localStorage.getItem(NICKNAME_KEY) || account?.nickname || "hakan";
  colorSelect.value = localStorage.getItem(COLOR_KEY) || "red";
}

function populateColorSelect() {
  colorSelect.innerHTML = colors.map((color) => `<option value="${color.id}">${color.label}</option>`).join("");
}

function bindUI() {
  joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    joinRoom();
  });
  readyButton.addEventListener("click", toggleReady);
  startButton.addEventListener("click", () => sendAction({ type: "start" }));
  meetingButton.addEventListener("click", () => sendAction({ type: "call-meeting" }));
  leaveButton.addEventListener("click", leaveRoom);
  roomInput.addEventListener("change", () => {
    state.roomId = normalizeRoomId(roomInput.value);
    roomInput.value = state.roomId;
    localStorage.setItem(ROOM_KEY, state.roomId);
  });
  nameInput.addEventListener("change", persistProfile);
  nicknameInput.addEventListener("change", persistProfile);
  colorSelect.addEventListener("change", persistProfile);

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("pointerdown", () => startTouchMove(button.dataset.move));
    button.addEventListener("pointerup", stopTouchMove);
    button.addEventListener("pointerleave", stopTouchMove);
    button.addEventListener("pointercancel", stopTouchMove);
  });
}

function persistProfile() {
  localStorage.setItem(NAME_KEY, nameInput.value.trim());
  localStorage.setItem(NICKNAME_KEY, nicknameInput.value.trim());
  localStorage.setItem(COLOR_KEY, colorSelect.value);
}

async function joinRoom() {
  try {
    state.roomId = normalizeRoomId(roomInput.value);
    localStorage.setItem(ROOM_KEY, state.roomId);
    persistProfile();
    await connectSocket();
    sendAction({
      type: "join",
      sessionId,
      roomId: state.roomId,
      name: nameInput.value.trim(),
      nickname: nicknameInput.value.trim(),
      colorId: colorSelect.value,
      avatarUrl: account?.avatarUrl || "",
    });
    statusText.textContent = `Odaya bağlanılıyor: ${state.roomId}`;
    sendHeartbeat();
  } catch {
    statusText.textContent = "Soket bağlantısı kurulamadı.";
  }
}

function leaveRoom() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    sendAction({ type: "leave" });
  }
  state.connected = false;
  state.room = null;
  state.players = [];
  state.self = null;
  joinButton.textContent = "Odaya gir";
  readyButton.disabled = true;
  startButton.disabled = true;
  meetingButton.disabled = true;
  leaveButton.disabled = true;
  roleLabel.textContent = "Rol gizli";
  statusText.textContent = "Odadan çıkıldı.";
  renderPanels();
}

async function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    state.connected = true;
    joinButton.textContent = "Odadan çık";
    leaveButton.disabled = false;
    return socket;
  }
  socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/siyah-adam`);
  socket.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type === "black-state") {
      applyState(message.state);
      return;
    }
    if (message.type === "black-error") {
      statusText.textContent = errorText(message.code);
    }
  });
  socket.addEventListener("close", () => {
    state.connected = false;
    joinButton.textContent = "Odaya gir";
    readyButton.disabled = true;
    startButton.disabled = true;
    meetingButton.disabled = true;
    leaveButton.disabled = true;
    statusText.textContent = "Bağlantı kapandı.";
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      state.connected = true;
      joinButton.textContent = "Odadan çık";
      readyButton.disabled = true;
      leaveButton.disabled = true;
      statusText.textContent = "Bağlantı kuruldu.";
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => reject(new Error("soket-baglantisi-basarisiz")), { once: true });
  });
  return socket;
}

function applyState(nextState) {
  state.room = nextState.room || nextState;
  state.players = nextState.players || nextState.room?.players || nextState.players || [];
  state.self = nextState.self || nextState.me || null;
  state.roomId = nextState.roomId || nextState.id || state.roomId;
  roomInput.value = state.roomId;
  state.ready = Boolean(state.self?.ready);
  const canPrepare = Boolean(state.room && ["lobby", "ended"].includes(state.room.phase));
  startButton.disabled = !state.room || !["lobby", "ended"].includes(state.room.phase) || state.room.hostSessionId !== sessionId;
  readyButton.disabled = !canPrepare;
  readyButton.textContent = state.ready ? "Hazırım değil" : "Hazırım";
  meetingButton.disabled = !state.room || state.room.phase !== "day" || (state.room.meetingCallsLeft ?? 0) <= 0;
  leaveButton.disabled = false;
  roleLabel.textContent = state.self?.isBlack
    ? "Rol: Siyah Adam"
    : state.self?.ghost
      ? "Rol: Hayalet"
      : "Rol gizli";
  phaseLabel.textContent = phaseText(state.room?.phase);
  timerLabel.textContent = timerText(state.room?.phaseEndsAt);
  playerCountLabel.textContent = `${state.room?.playerCount || state.players.length}/10`;
  meetingLabel.textContent = `${state.room?.meetingCallsLeft ?? 0} hak`;
  eventLabel.textContent = state.room?.lastEvent || "Bekleniyor.";
  statusText.textContent = roomStatusText(state.room);
  renderActionList();
  renderPanels();
}

function renderPanels() {
  renderPlayerList();
  renderEventList();
}

function renderPlayerList() {
  playerList.innerHTML = state.players.map((player) => {
    const classNames = [
      "player-card",
      player.isBlack ? "is-black" : "",
      player.ghost ? "is-ghost" : "",
    ].filter(Boolean).join(" ");
    const votes = state.room?.phase === "vote" ? `Oyu: ${player.voteTargetSessionId ? "kullanıldı" : "bekliyor"}` : player.alive ? "Canlı" : "Hayalet";
    const color = player.isBlack ? "#111111" : player.colorHex || "#ffffff";
    return `
      <article class="${classNames}">
        <div class="player-head">
          <span class="avatar-dot" style="background:${color}"></span>
          <div>
            <strong>${escapeHtml(player.nickname)}</strong>
            <small>${escapeHtml(player.name)}</small>
          </div>
        </div>
        <div class="chip-row">
          <span class="chip ${player.ready ? "green" : ""}">${player.ready ? "Hazır" : "Hazır değil"}</span>
          <span class="chip">${escapeHtml(player.colorLabel || "Renk")}</span>
          <span class="chip ${player.ghost ? "gold" : ""}">${votes}</span>
          ${player.isBlack ? `<span class="chip red">Siyah</span>` : ""}
          ${player.connected ? "" : `<span class="chip">Çevrimdışı</span>`}
        </div>
      </article>
    `;
  }).join("") || `<p class="muted">Henüz oyuncu yok.</p>`;
}

function renderActionList() {
  if (!state.room) {
    actionList.innerHTML = `<p class="muted">Önce bir odaya gir.</p>`;
    return;
  }
  if (state.room.phase === "vote") {
    actionList.innerHTML = state.players
      .filter((player) => player.alive && !player.ghost && player.sessionId !== sessionId)
      .map((player) => `
        <button type="button" data-vote="${player.sessionId}">
          ${escapeHtml(player.nickname)} için oy ver
        </button>
      `)
      .join("") || `<p class="muted">Oylanacak kimse kalmadı.</p>`;
  } else if (state.room.phase === "night" && state.self?.isBlack) {
    actionList.innerHTML = state.players
      .filter((player) => player.alive && !player.ghost && player.sessionId !== sessionId)
      .map((player) => `
        <button type="button" data-night-target="${player.sessionId}">
          ${escapeHtml(player.nickname)} hedefini seç
        </button>
      `)
      .join("") || `<p class="muted">Hedef kalmadı.</p>`;
  } else {
    actionList.innerHTML = `<p class="muted">Bu fazda aktif bir aksiyon yok.</p>`;
  }

  actionList.querySelectorAll("[data-vote]").forEach((button) => {
    button.addEventListener("click", () => sendAction({ type: "vote", targetSessionId: button.dataset.vote }));
  });
  actionList.querySelectorAll("[data-night-target]").forEach((button) => {
    button.addEventListener("click", () => {
      state.targetSessionId = button.dataset.nightTarget;
      sendAction({ type: "night-target", targetSessionId: button.dataset.nightTarget });
    });
  });
}

function renderEventList() {
  const events = state.room?.events || [];
  eventList.innerHTML = events.map((item) => `
    <article class="event-card">
      <strong>${escapeHtml(item.text)}</strong>
      <small>${formatTime(item.createdAt)}</small>
    </article>
  `).join("") || `<p class="muted">Günlük kayıt bekleniyor.</p>`;
}

function sendAction(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function toggleReady() {
  state.ready = !state.ready;
  readyButton.textContent = state.ready ? "Hazırım değil" : "Hazırım";
  sendAction({ type: "ready", ready: state.ready });
}

function sendHeartbeat() {
  fetch("/api/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      device: deviceType(),
      activeGame: "siyah-adam",
    }),
  }).catch(() => {});
}

function handleKeyDown(event) {
  if (!state.connected) return;
  let handled = false;
  if (event.key === "w" || event.key === "ArrowUp") {
    state.keyboardInput.dy = -1;
    handled = true;
  }
  if (event.key === "s" || event.key === "ArrowDown") {
    state.keyboardInput.dy = 1;
    handled = true;
  }
  if (event.key === "a" || event.key === "ArrowLeft") {
    state.keyboardInput.dx = -1;
    handled = true;
  }
  if (event.key === "d" || event.key === "ArrowRight") {
    state.keyboardInput.dx = 1;
    handled = true;
  }
  if (!handled) return;
  event.preventDefault();
  syncMoveInput();
}

function handleKeyUp(event) {
  if (!state.connected) return;
  if (event.key === "w" || event.key === "ArrowUp" || event.key === "s" || event.key === "ArrowDown") {
    state.keyboardInput.dy = 0;
  }
  if (event.key === "a" || event.key === "ArrowLeft" || event.key === "d" || event.key === "ArrowRight") {
    state.keyboardInput.dx = 0;
  }
  syncMoveInput();
}

let touchMove = "";

function startTouchMove(direction) {
  touchMove = direction;
  state.touchInput.dx = 0;
  state.touchInput.dy = 0;
  if (direction === "up") state.touchInput.dy = -1;
  if (direction === "down") state.touchInput.dy = 1;
  if (direction === "left") state.touchInput.dx = -1;
  if (direction === "right") state.touchInput.dx = 1;
  syncMoveInput();
}

function stopTouchMove() {
  touchMove = "";
  state.touchInput.dx = 0;
  state.touchInput.dy = 0;
  syncMoveInput();
}

function sendMove() {
  sendAction({ type: "input", dx: state.input.dx, dy: state.input.dy });
}

function syncMoveInput() {
  const dx = clampMove(state.keyboardInput.dx + state.touchInput.dx + state.gamepadInput.dx);
  const dy = clampMove(state.keyboardInput.dy + state.touchInput.dy + state.gamepadInput.dy);
  if (dx === state.input.dx && dy === state.input.dy) return;
  state.input.dx = dx;
  state.input.dy = dy;
  if (state.connected) sendMove();
}

function pollGamepadInput() {
  const gamepad = getPrimaryGamepad();
  if (!gamepad) {
    if (gamepadState.buttons.size || state.gamepadInput.dx || state.gamepadInput.dy) {
      gamepadState.buttons = new Set();
      state.gamepadInput.dx = 0;
      state.gamepadInput.dy = 0;
      syncMoveInput();
    }
    return;
  }

  const nextButtons = new Set();
  const button = (index, name) => {
    const control = gamepad.buttons[index];
    const pressed = Boolean(control?.pressed || control?.value > 0.6);
    if (pressed) nextButtons.add(name);
    return pressed;
  };
  const primary = button(0, "primary");
  const secondary = button(1, "secondary");
  const rightAction = button(3, "right-action");
  const start = button(9, "start");
  const dpadUp = button(12, "dpad-up");
  const dpadDown = button(13, "dpad-down");
  const dpadLeft = button(14, "dpad-left");
  const dpadRight = button(15, "dpad-right");
  const axisX = deadzone(gamepad.axes[0] || 0);
  const axisY = deadzone(gamepad.axes[1] || 0);
  const dx = clampMove((axisX < 0 ? -1 : axisX > 0 ? 1 : 0) + (dpadLeft ? -1 : 0) + (dpadRight ? 1 : 0));
  const dy = clampMove((axisY < 0 ? -1 : axisY > 0 ? 1 : 0) + (dpadUp ? -1 : 0) + (dpadDown ? 1 : 0));

  if (dx !== state.gamepadInput.dx || dy !== state.gamepadInput.dy) {
    state.gamepadInput.dx = dx;
    state.gamepadInput.dy = dy;
    syncMoveInput();
  }
  if (primary && pressedOnce(nextButtons, "primary") && state.connected && !readyButton.disabled) {
    toggleReady();
  }
  if (start && pressedOnce(nextButtons, "start") && state.connected && !startButton.disabled) {
    sendAction({ type: "start" });
  }
  if ((secondary && pressedOnce(nextButtons, "secondary")) || (rightAction && pressedOnce(nextButtons, "right-action"))) {
    if (state.connected && !meetingButton.disabled) sendAction({ type: "call-meeting" });
  }

  gamepadState.buttons = nextButtons;
}

function getPrimaryGamepad() {
  if (!navigator.getGamepads) return null;
  return Array.from(navigator.getGamepads()).find((gamepad) => gamepad?.connected) || null;
}

function pressedOnce(nextButtons, name) {
  return nextButtons.has(name) && !gamepadState.buttons.has(name);
}

function deadzone(value) {
  return Math.abs(value) >= GAMEPAD_DEADZONE ? value : 0;
}

function clampMove(value) {
  return Math.max(-1, Math.min(1, value));
}

function draw() {
  pollGamepadInput();
  const width = arena.width;
  const height = arena.height;
  ctx.clearRect(0, 0, width, height);
  drawBackground(width, height);
  drawMap(width, height);
  drawPlayers();
  drawOverlay();
  requestAnimationFrame(draw);
}

function drawBackground(width, height) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 680);
  gradient.addColorStop(0, "#18202d");
  gradient.addColorStop(1, "#07090d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawMap(width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 156, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 290, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(88,215,255,0.16)";
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(width / 2 - 220, height / 2 - 28, 440, 56);
  ctx.fillRect(width / 2 - 28, height / 2 - 160, 56, 320);
  ctx.restore();
}

function drawPlayers() {
  for (const player of state.players) {
    const radius = player.isBlack ? 20 : 18;
    const x = player.x || 0;
    const y = player.y || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = player.ghost ? 0.45 : 1;
    ctx.fillStyle = player.isBlack ? "#080808" : player.colorHex || "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#eef4f2";
    ctx.font = "700 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(player.nickname.slice(0, 10), 0, radius + 16);
    if (player.isBlack) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText("S", 0, 4);
    }
    ctx.restore();
  }
}

function drawOverlay() {
  if (!state.room) return;
  const alpha = state.room.phase === "night" ? 0.35 : state.room.phase === "vote" ? 0.16 : 0.06;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "800 24px Inter, sans-serif";
  ctx.fillText(phaseText(state.room.phase), 24, 36);
  ctx.font = "700 15px Inter, sans-serif";
  ctx.fillText(`Kalan süre: ${timerText(state.room.phaseEndsAt)}`, 24, 60);
  if (state.room.phase === "night" && state.self?.isBlack && state.room.selectedTargetSessionId) {
    ctx.fillStyle = "rgba(255, 209, 102, 0.85)";
    ctx.fillText("Hedef seçildi.", 24, 86);
  }
}

function phaseText(phase) {
  if (phase === "day") return "Gündüz";
  if (phase === "vote") return "Çember Toplantısı";
  if (phase === "night") return "Karanlık";
  if (phase === "ended") return `Bitti`;
  return "Hazır değil";
}

function timerText(endsAt) {
  if (!endsAt) return "--";
  const remaining = Math.max(0, endsAt - Date.now());
  return `${Math.ceil(remaining / 1000)} sn`;
}

function roomStatusText(room) {
  if (!room) return "Bağlantı bekleniyor.";
  if (room.phase === "ended") {
    return room.winner === "black" ? "Siyah Adam kazandı." : "Diğerleri kazandı.";
  }
  if (room.phase === "night" && state.self?.isBlack) return "Hedef seç, süre dolmadan karar ver.";
  if (room.phase === "vote") return "Çemberde oylama yapılıyor.";
  if (room.phase === "day") return "Dolaş, şüphe topla ve çemberi çağır.";
  return "Hazırlık odası açık.";
}

function errorText(code) {
  if (code === "room-full") return "Oda dolu. En fazla 10 kişi.";
  if (code === "game-in-progress") return "Oyun başladı; lobi bitene kadar bekle.";
  if (code === "invalid-join") return "Odaya girerken bilgi eksik.";
  return "İşlem yapılamadı.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function deviceType() {
  if (window.innerWidth < 720) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

function normalizeRoomId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .slice(0, 40) || "siyah-oda";
}

function getSessionId() {
  const current = localStorage.getItem(SESSION_KEY);
  if (current) return current;
  const next = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(SESSION_KEY, next);
  return next;
}
