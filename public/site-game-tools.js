const match = location.pathname.match(/\/oyunlar\/([^/]+)/);
const slug = match?.[1] || "";
const sessionKey = "hakorocks-session-id";
const sessionId = localStorage.getItem(sessionKey) || createSessionId();
const gameTitles = {
  "annenden-kac": "Annenden Kaç",
  bardak: "Bardak",
  "essiz-zindan": "Eşsiz Zindan",
  "skeleton-wars": "Skeleton Wars",
  rhgpo: "RHGPO",
  "siyah-adam": "Siyah Adam",
  vale: "Vale",
  "robot-avcisi": "Robot Avcısı",
};

const keyBindings = {
  KeyW: { code: "KeyW", key: "w" },
  KeyA: { code: "KeyA", key: "a" },
  KeyS: { code: "KeyS", key: "s" },
  KeyD: { code: "KeyD", key: "d" },
  KeyE: { code: "KeyE", key: "e" },
  KeyF: { code: "KeyF", key: "f" },
  KeyM: { code: "KeyM", key: "m" },
  KeyQ: { code: "KeyQ", key: "q" },
  KeyR: { code: "KeyR", key: "r" },
  KeyT: { code: "KeyT", key: "t" },
  Space: { code: "Space", key: " " },
  ShiftLeft: { code: "ShiftLeft", key: "Shift" },
  Digit1: { code: "Digit1", key: "1" },
  Digit2: { code: "Digit2", key: "2" },
  Digit3: { code: "Digit3", key: "3" },
};

const mobileControlConfigs = {
  "essiz-zindan": {
    hint: "Sol taraf hareket, sağ taraf bakış. Saldır ve öfke düğmeleri hazır.",
    look: true,
    actions: [
      { label: "Saldır", code: "Space" },
      { label: "Öfke", code: "KeyE" },
      { label: "Tam", code: "KeyF" },
    ],
  },
  "skeleton-wars": {
    hint: "Sol taraf hareket, sağ taraf nişan. Yay, kılıç ve ateşli ok mobilde hazır.",
    look: true,
    actions: [
      { label: "Yay", code: "Space" },
      { label: "Kılıç", code: "KeyE" },
      { label: "Ateş", code: "KeyF" },
      { label: "Demlik", code: "KeyT" },
    ],
  },
  vale: {
    hint: "Sol taraf yürü/sür, sağ taraf kamera. E etkileşim, M market.",
    look: true,
    actions: [
      { label: "E", code: "KeyE" },
      { label: "Fren", code: "Space", hold: true },
      { label: "Koş", code: "ShiftLeft", hold: true },
      { label: "M", code: "KeyM" },
    ],
  },
  "robot-avcisi": {
    hint: "Sol taraf hareket, sağ taraf kamera. Ateş ve etkileşim düğmeleri hazır.",
    look: true,
    actions: [
      { label: "Ateş", event: "hakorocks:fire" },
      { label: "E", code: "KeyE" },
      { label: "F", code: "KeyF" },
      { label: "R", code: "KeyR" },
      { label: "Q", code: "KeyQ" },
      { label: "1", code: "Digit1" },
    ],
  },
};

localStorage.setItem(sessionKey, sessionId);

if (slug) {
  markPlayedGame(slug);
  injectMobileGameShell();
  injectMobileGamepad();
  injectPhotoHint();
  sendJson("/api/game-open", { sessionId, slug });
  heartbeat();
  setInterval(heartbeat, 10000);
  window.addEventListener("keydown", (event) => {
    const key = event.key?.toLocaleLowerCase("tr-TR");
    if (key !== "ö" && event.code !== "Semicolon") return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    event.preventDefault();
    capturePhoto();
  });
}

function createSessionId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deviceType() {
  const width = window.innerWidth;
  if (width < 720) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

function heartbeat() {
  sendJson("/api/heartbeat", {
    sessionId,
    device: deviceType(),
    activeGame: slug,
    path: location.pathname,
  });
}

async function capturePhoto() {
  const canvas = largestCanvas();
  if (!canvas) {
    showToast("Fotoğraf için oyun ekranı bulunamadı");
    return;
  }
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
    await sendJson("/api/photo", {
      sessionId,
      slug,
      gameTitle: gameTitles[slug] || slug,
      title: `${gameTitles[slug] || "Oyun"} fotoğrafı`,
      dataUrl,
    });
    markPhotoCaptured();
    showToast("Resim aldınız");
  } catch {
    showToast("Bu sahnede resim alınamadı");
  }
}

function largestCanvas() {
  return [...document.querySelectorAll("canvas")]
    .filter((canvas) => canvas.width > 0 && canvas.height > 0)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
}

async function sendJson(url, payload) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Static preview can run without the live API.
  }
}

function readBadgeState() {
  try {
    return JSON.parse(localStorage.getItem("hakorocks-badge-state") || "{}");
  } catch {
    return {};
  }
}

function writeBadgeState(state) {
  localStorage.setItem("hakorocks-badge-state", JSON.stringify({
    visitedAt: state.visitedAt || new Date().toISOString(),
    openedGame: Boolean(state.openedGame),
    playedGames: Array.isArray(state.playedGames) ? state.playedGames : [],
    photoCount: Number(state.photoCount) || 0,
    ratedGames: Array.isArray(state.ratedGames) ? state.ratedGames : [],
    guestbook: Boolean(state.guestbook),
    trailerPlayed: Boolean(state.trailerPlayed),
    voiceRoomJoined: Boolean(state.voiceRoomJoined),
  }));
}

function readLeagueState() {
  try {
    return JSON.parse(localStorage.getItem("hakorocks-league-state") || "{}");
  } catch {
    return {};
  }
}

function writeLeagueState(state) {
  localStorage.setItem("hakorocks-league-state", JSON.stringify({
    points: Number(state.points) || 0,
    pointEvents: Array.isArray(state.pointEvents) ? state.pointEvents.slice(-120) : [],
    daily: state.daily && typeof state.daily === "object" ? state.daily : {},
    medals: Array.isArray(state.medals) ? state.medals : [],
    eliteMember: Boolean(state.eliteMember),
    eliteRotationKey: state.eliteRotationKey || "",
    legendaryActiveDay: state.legendaryActiveDay || "",
    legendaryCheckDay: state.legendaryCheckDay || "",
    lastDropMessage: state.lastDropMessage || "",
  }));
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function awardLeagueProgress(eventId, amount, gameSlug = "") {
  const dayKey = todayKey();
  const eventKey = `${dayKey}:${eventId}`;
  const state = readLeagueState();
  const pointEvents = Array.isArray(state.pointEvents) ? state.pointEvents : [];
  const daily = state.daily && typeof state.daily === "object" ? state.daily : {};
  daily[dayKey] ??= { games: [], actions: [] };
  if (gameSlug && !daily[dayKey].games.includes(gameSlug)) daily[dayKey].games.push(gameSlug);
  if (!pointEvents.includes(eventKey)) {
    pointEvents.push(eventKey);
    state.points = (Number(state.points) || 0) + amount;
  }
  writeLeagueState({ ...state, pointEvents, daily });
}

function markPlayedGame(gameSlug) {
  const state = readBadgeState();
  const playedGames = Array.isArray(state.playedGames) ? state.playedGames : [];
  if (!playedGames.includes(gameSlug)) playedGames.push(gameSlug);
  writeBadgeState({ ...state, playedGames });
  awardLeagueProgress(`game:${gameSlug}`, 35, gameSlug);
}

function markPhotoCaptured() {
  const state = readBadgeState();
  writeBadgeState({ ...state, photoCount: (Number(state.photoCount) || 0) + 1 });
  awardLeagueProgress("photo", 45);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    right: "16px",
    top: "16px",
    zIndex: "9999",
    padding: "12px 14px",
    border: "1px solid rgba(53, 210, 255, 0.45)",
    borderRadius: "8px",
    color: "#f7f4ea",
    background: "rgba(11, 13, 16, 0.9)",
    font: "700 14px system-ui, sans-serif",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function injectPhotoHint() {
  if (document.querySelector("[data-photo-key-hint]")) return;

  const hint = document.createElement("aside");
  hint.dataset.photoKeyHint = "true";
  hint.setAttribute("aria-label", "Fotoğraf çekme tuşu");
  hint.innerHTML = `
    <span>Foto çek</span>
    <strong>Ö</strong>
    <small>Resim siteye eklenir</small>
  `;

  const style = document.createElement("style");
  style.textContent = `
    [data-photo-key-hint] {
      position: fixed;
      right: 14px;
      bottom: calc(14px + var(--hakorocks-mobile-bottom-offset, 0px));
      z-index: 9998;
      display: grid;
      gap: 2px;
      min-width: 118px;
      padding: 10px 12px;
      border: 1px solid rgba(53, 210, 255, 0.45);
      border-radius: 10px;
      color: #f7f4ea;
      background: rgba(11, 13, 16, 0.82);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(12px);
      font-family: system-ui, sans-serif;
      text-align: center;
      pointer-events: none;
    }
    [data-photo-key-hint] span {
      color: #8fff6a;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    [data-photo-key-hint] strong {
      color: #35d2ff;
      font-size: 26px;
      line-height: 1;
    }
    [data-photo-key-hint] small {
      color: #b8c2c0;
      font-size: 11px;
      line-height: 1.2;
    }
    @media (max-width: 620px) {
      [data-photo-key-hint] {
        right: 10px;
        bottom: calc(10px + var(--hakorocks-mobile-bottom-offset, 0px));
        min-width: 96px;
        padding: 8px 9px;
      }
      [data-photo-key-hint] strong {
        font-size: 22px;
      }
      [data-photo-key-hint] small {
        display: none;
      }
    }
    @media (pointer: coarse), (max-width: 900px) {
      .hakorocks-mobile-controls-ready [data-photo-key-hint] {
        bottom: calc(86px + var(--hakorocks-mobile-bottom-offset, 0px));
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(hint);
}

function injectMobileGameShell() {
  if (document.querySelector("[data-game-mobile-shell]")) return;

  const shell = document.createElement("div");
  shell.dataset.gameMobileShell = "true";
  shell.innerHTML = `
    <a href="/" aria-label="Hakorocks Studio ana sayfasına dön">H</a>
    <button type="button" data-mobile-fullscreen>⛶</button>
  `;

  const style = document.createElement("style");
  style.textContent = `
    [data-game-mobile-shell] {
      position: fixed;
      top: max(10px, env(safe-area-inset-top));
      left: max(10px, env(safe-area-inset-left));
      z-index: 9997;
      display: none;
      gap: 8px;
      align-items: center;
      font-family: system-ui, sans-serif;
    }
    [data-game-mobile-shell] a,
    [data-game-mobile-shell] button {
      display: grid;
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      place-items: center;
      border: 1px solid rgba(53, 210, 255, 0.42);
      border-radius: 10px;
      color: #f7f4ea;
      background: rgba(8, 12, 16, 0.72);
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(12px);
      font: 900 16px/1 system-ui, sans-serif;
      text-decoration: none;
      cursor: pointer;
      touch-action: manipulation;
    }
    [data-game-mobile-shell] button {
      padding: 0;
    }
    @media (pointer: coarse), (max-width: 900px) {
      [data-game-mobile-shell] {
        display: flex;
      }
    }
  `;

  shell.querySelector("[data-mobile-fullscreen]").addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    document.documentElement.requestFullscreen?.();
  });

  document.head.appendChild(style);
  document.body.appendChild(shell);
}

function injectMobileGamepad() {
  const config = mobileControlConfigs[slug];
  if (!config || document.querySelector("[data-hakorocks-mobile-pad]")) return;

  document.body.classList.add("hakorocks-mobile-controls-ready");
  const pad = document.createElement("section");
  pad.dataset.hakorocksMobilePad = "true";
  pad.setAttribute("aria-label", `${gameTitles[slug] || "Oyun"} mobil kontrolleri`);
  pad.innerHTML = `
    <button class="mobile-pad-toggle" type="button" data-mobile-pad-toggle aria-expanded="true">Kontrol</button>
    <div class="mobile-pad-body">
      <div class="mobile-pad-help">
        <strong>Mobil mod</strong>
        <span>${config.hint}</span>
      </div>
      <div class="mobile-pad-grid">
        <div class="mobile-dpad" aria-label="Hareket">
          <button type="button" data-mobile-key="KeyW" style="grid-column: 2; grid-row: 1;">W</button>
          <button type="button" data-mobile-key="KeyA" style="grid-column: 1; grid-row: 2;">A</button>
          <button type="button" data-mobile-key="KeyS" style="grid-column: 2; grid-row: 2;">S</button>
          <button type="button" data-mobile-key="KeyD" style="grid-column: 3; grid-row: 2;">D</button>
        </div>
        ${config.look ? `<div class="mobile-look-pad" data-mobile-look-pad><span>Bakış</span></div>` : ""}
        <div class="mobile-action-pad" aria-label="Aksiyonlar">
          ${config.actions.map((action, index) => `
            <button type="button" data-action-index="${index}">
              ${action.label}
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .hakorocks-mobile-controls-ready {
      --hakorocks-mobile-bottom-offset: 132px;
    }
    [data-hakorocks-mobile-pad] {
      position: fixed;
      right: max(10px, env(safe-area-inset-right));
      bottom: max(10px, env(safe-area-inset-bottom));
      left: max(10px, env(safe-area-inset-left));
      z-index: 9996;
      display: none;
      color: #f7f4ea;
      font-family: system-ui, sans-serif;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
    }
    [data-hakorocks-mobile-pad] button {
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    [data-hakorocks-mobile-pad] .mobile-pad-toggle {
      position: absolute;
      right: 0;
      bottom: 0;
      z-index: 2;
      min-height: 40px;
      padding: 0 12px;
      border: 1px solid rgba(53, 210, 255, 0.38);
      border-radius: 10px;
      color: #35d2ff;
      background: rgba(8, 12, 16, 0.82);
      font: 900 13px/1 system-ui, sans-serif;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(12px);
      pointer-events: auto;
    }
    [data-hakorocks-mobile-pad] .mobile-pad-body {
      display: grid;
      gap: 8px;
      pointer-events: auto;
    }
    [data-hakorocks-mobile-pad].is-collapsed {
      left: auto;
      width: auto;
    }
    [data-hakorocks-mobile-pad].is-collapsed .mobile-pad-body {
      display: none;
    }
    [data-hakorocks-mobile-pad].is-collapsed ~ [data-photo-key-hint],
    .hakorocks-mobile-controls-ready:has([data-hakorocks-mobile-pad].is-collapsed) {
      --hakorocks-mobile-bottom-offset: 0px;
    }
    .mobile-pad-help {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 38px;
      padding: 8px 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      background: rgba(8, 12, 16, 0.62);
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
      backdrop-filter: blur(12px);
    }
    .mobile-pad-help strong {
      color: #8fff6a;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
      text-transform: uppercase;
    }
    .mobile-pad-help span {
      min-width: 0;
      color: #d9e4e2;
      font-size: 12px;
      font-weight: 760;
      line-height: 1.25;
      text-align: right;
    }
    .mobile-pad-grid {
      display: grid;
      grid-template-columns: 132px minmax(94px, 1fr) minmax(126px, 0.78fr);
      gap: 10px;
      align-items: end;
    }
    .mobile-dpad {
      display: grid;
      grid-template-columns: repeat(3, 42px);
      grid-template-rows: repeat(2, 42px);
      gap: 6px;
    }
    .mobile-action-pad {
      display: grid;
      grid-template-columns: repeat(2, minmax(56px, 1fr));
      gap: 6px;
    }
    .mobile-dpad button,
    .mobile-action-pad button,
    .mobile-look-pad {
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 12px;
      color: #f7f4ea;
      background: rgba(8, 12, 16, 0.66);
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(12px);
    }
    .mobile-dpad button,
    .mobile-action-pad button {
      min-height: 42px;
      padding: 0 8px;
      font: 900 13px/1 system-ui, sans-serif;
    }
    .mobile-dpad button.is-pressed,
    .mobile-action-pad button.is-pressed {
      border-color: rgba(143, 255, 106, 0.72);
      color: #071012;
      background: #8fff6a;
      transform: translateY(1px);
    }
    .mobile-action-pad button:first-child {
      border-color: rgba(53, 210, 255, 0.52);
      color: #071012;
      background: #35d2ff;
    }
    .mobile-look-pad {
      position: relative;
      display: grid;
      min-height: 90px;
      place-items: center;
      overflow: hidden;
      color: #b8c2c0;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .mobile-look-pad::after {
      position: absolute;
      width: 34px;
      height: 34px;
      border: 2px solid rgba(53, 210, 255, 0.7);
      border-radius: 999px;
      content: "";
      box-shadow: 0 0 28px rgba(53, 210, 255, 0.2);
    }
    @media (pointer: coarse), (max-width: 900px) {
      [data-hakorocks-mobile-pad] {
        display: block;
      }
    }
    @media (max-width: 620px) {
      .hakorocks-mobile-controls-ready {
        --hakorocks-mobile-bottom-offset: 174px;
      }
      [data-hakorocks-mobile-pad] {
        right: 8px;
        bottom: 8px;
        left: 8px;
      }
      .mobile-pad-help {
        align-items: flex-start;
        flex-direction: column;
        gap: 3px;
      }
      .mobile-pad-help span {
        text-align: left;
      }
      .mobile-pad-grid {
        grid-template-columns: 126px 1fr;
        grid-template-areas:
          "move look"
          "move actions";
      }
      .mobile-dpad {
        grid-area: move;
        grid-template-columns: repeat(3, 38px);
        grid-template-rows: repeat(2, 38px);
      }
      .mobile-look-pad {
        grid-area: look;
        min-height: 58px;
      }
      .mobile-action-pad {
        grid-area: actions;
        grid-template-columns: repeat(3, minmax(42px, 1fr));
      }
      .mobile-dpad button,
      .mobile-action-pad button {
        min-height: 38px;
        border-radius: 10px;
        font-size: 12px;
      }
    }
    @media (orientation: portrait) and (max-width: 620px) {
      .mobile-pad-help span::after {
        content: " Telefonu yan çevirirsen alan büyür.";
        color: #ffd166;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(pad);

  const toggle = pad.querySelector("[data-mobile-pad-toggle]");
  toggle.addEventListener("click", () => {
    const collapsed = pad.classList.toggle("is-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.textContent = collapsed ? "Kontrol aç" : "Kontrol";
  });

  pad.querySelectorAll("[data-mobile-key]").forEach((button) => {
    bindKeyboardButton(button, { code: button.dataset.mobileKey, hold: true });
  });

  config.actions.forEach((action, index) => {
    const button = pad.querySelector(`[data-action-index="${index}"]`);
    if (button) bindActionButton(button, action);
  });

  const lookPad = pad.querySelector("[data-mobile-look-pad]");
  if (lookPad) bindLookPad(lookPad);

  window.addEventListener("blur", releaseAllVirtualKeys);
  window.addEventListener("pagehide", releaseAllVirtualKeys);
}

const activeVirtualKeys = new Set();

function bindKeyboardButton(button, action) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    trySetPointerCapture(button, event);
    button.classList.add("is-pressed");
    pressVirtualKey(action.code);
  });
  const release = (event) => {
    event.preventDefault();
    button.classList.remove("is-pressed");
    releaseVirtualKey(action.code);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => {
    button.classList.remove("is-pressed");
    releaseVirtualKey(action.code);
  });
}

function bindActionButton(button, action) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    trySetPointerCapture(button, event);
    button.classList.add("is-pressed");
    if (action.event) {
      dispatchGameEvent(action.event);
      return;
    }
    if (action.hold) {
      pressVirtualKey(action.code);
    } else {
      tapVirtualKey(action.code);
    }
  });
  const release = (event) => {
    event.preventDefault();
    button.classList.remove("is-pressed");
    if (action.hold) releaseVirtualKey(action.code);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => {
    button.classList.remove("is-pressed");
    if (action.hold) releaseVirtualKey(action.code);
  });
}

function bindLookPad(lookPad) {
  let lastPoint = null;

  lookPad.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    trySetPointerCapture(lookPad, event);
    lastPoint = { x: event.clientX, y: event.clientY };
    dispatchAimMove(event.clientX, event.clientY, 0, 0);
  });

  lookPad.addEventListener("pointermove", (event) => {
    if (!lastPoint) return;
    event.preventDefault();
    const dx = event.clientX - lastPoint.x;
    const dy = event.clientY - lastPoint.y;
    lastPoint = { x: event.clientX, y: event.clientY };
    dispatchAimMove(event.clientX, event.clientY, dx, dy);
  });

  const clear = () => {
    lastPoint = null;
  };
  lookPad.addEventListener("pointerup", clear);
  lookPad.addEventListener("pointercancel", clear);
  lookPad.addEventListener("lostpointercapture", clear);
}

function tapVirtualKey(code) {
  pressVirtualKey(code);
  window.setTimeout(() => releaseVirtualKey(code), 70);
}

function pressVirtualKey(code) {
  if (activeVirtualKeys.has(code)) return;
  activeVirtualKeys.add(code);
  dispatchKeyboard("keydown", code);
}

function releaseVirtualKey(code) {
  if (!activeVirtualKeys.has(code)) return;
  activeVirtualKeys.delete(code);
  dispatchKeyboard("keyup", code);
}

function releaseAllVirtualKeys() {
  for (const code of [...activeVirtualKeys]) {
    releaseVirtualKey(code);
  }
}

function dispatchKeyboard(type, code) {
  const binding = keyBindings[code] || { code, key: code };
  const targets = [
    window,
    document,
    document.body,
    largestCanvas(),
  ].filter(Boolean);

  for (const target of targets) {
    target.dispatchEvent(new KeyboardEvent(type, {
      key: binding.key,
      code: binding.code,
      bubbles: true,
      cancelable: true,
    }));
  }
}

function dispatchAimMove(clientX, clientY, dx, dy) {
  const canvas = largestCanvas();
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const boundedX = Math.max(rect.left, Math.min(rect.right, clientX));
  const boundedY = Math.max(rect.top, Math.min(rect.bottom, clientY));
  const move = new MouseEvent("mousemove", {
    bubbles: true,
    cancelable: true,
    clientX: boundedX,
    clientY: boundedY,
    movementX: dx,
    movementY: dy,
  });
  Object.defineProperty(move, "movementX", { value: dx });
  Object.defineProperty(move, "movementY", { value: dy });
  canvas.dispatchEvent(move);
  window.dispatchEvent(move);
  window.dispatchEvent(new CustomEvent("hakorocks:look", {
    detail: { dx, dy, clientX: boundedX, clientY: boundedY },
  }));
}

function dispatchGameEvent(name) {
  window.dispatchEvent(new CustomEvent(name, {
    detail: { slug },
  }));
}

function trySetPointerCapture(element, event) {
  try {
    element.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic browser tests may not have an active pointer capture target.
  }
}
