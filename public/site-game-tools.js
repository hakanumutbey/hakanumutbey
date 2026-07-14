const match = location.pathname.match(/\/oyunlar\/([^/]+)/);
const slug = match?.[1] || "";
const sessionKey = "hakorocks-session-id";
const sessionId = localStorage.getItem(sessionKey) || createSessionId();
const gameTitles = {
  "annenden-kac": "Annenden Kaç",
  bardak: "Bardak",
  "essiz-zindan": "Eşsiz Zindan",
  "skeleton-wars": "Skeleton Wars",
  vale: "Vale",
  "robot-avcisi": "Robot Avcısı",
};

localStorage.setItem(sessionKey, sessionId);

if (slug) {
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
      bottom: 14px;
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
        bottom: 10px;
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
  `;

  document.head.appendChild(style);
  document.body.appendChild(hint);
}
