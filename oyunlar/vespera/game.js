(() => {
  const V = typeof window !== "undefined" ? window.Vespera : null;
  const api = {
    ready: Boolean(V),
    mode: "boot",
    getState() {
      return state;
    },
    startNew,
    continueSave,
    interact: doInteract,
    shoot,
    step,
  };
  if (typeof window !== "undefined") window.VesperaGame = api;
  if (!V) return;

  const canvas = typeof document !== "undefined" ? document.getElementById("game") : null;
  const overlay = typeof document !== "undefined" ? document.getElementById("overlay") : null;
  const overlayCard = typeof document !== "undefined" ? document.getElementById("overlayCard") : null;
  const hud = typeof document !== "undefined" ? document.getElementById("hud") : null;
  const questLabel = typeof document !== "undefined" ? document.getElementById("questLabel") : null;
  const regionLabel = typeof document !== "undefined" ? document.getElementById("regionLabel") : null;
  const hpFill = typeof document !== "undefined" ? document.getElementById("hpFill") : null;
  const storyLog = typeof document !== "undefined" ? document.getElementById("storyLog") : null;
  const fileHint = typeof document !== "undefined" ? document.getElementById("fileHint") : null;
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  const W = canvas ? canvas.width : 960;
  const H = canvas ? canvas.height : 540;
  const keys = new Set();
  const shots = [];
  const motes = [];
  const storage = typeof localStorage !== "undefined" ? localStorage : null;

  let state = V.createState();
  let camX = state.x - W / 2;
  let camY = state.y - H / 2;
  let last = 0;
  let logTimer = 0;
  let lastBeat = "";

  if (typeof document !== "undefined" && document.location && document.location.protocol === "file:") {
    if (fileHint) {
      fileHint.textContent = "Bu oyun file:// ile de açılır. Sitede yol: /oyunlar/vespera/";
    }
  }

  if (!canvas || !ctx) {
    api.mode = "headless";
    return;
  }

  showMenu();
  requestAnimationFrame(loop);

  window.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    keys.add(event.code);
    if (api.mode === "playing") {
      if (event.code === "KeyE") doInteract();
      if (event.code === "Space" || event.code === "KeyJ") shoot();
    } else if ((api.mode === "menu" || api.mode === "ended") && (event.code === "Enter" || event.code === "Space")) {
      startNew();
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  overlay?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "new") startNew();
    if (btn.dataset.act === "continue") continueSave();
    if (btn.dataset.act === "menu") showMenu();
  });

  function showMenu() {
    api.mode = "menu";
    if (hud) hud.hidden = true;
    if (storyLog) storyLog.hidden = true;
    if (overlay) overlay.hidden = false;
    const has = V.hasSave(storage);
    overlayCard.innerHTML = `
      <h2>Vespera</h2>
      <p>Roket Soluk Gezegen'e düştü. Bölgeleri yürü, parçaları topla, insanlarla konuş. Bu yol kısa bir oturumda bitmez.</p>
      <div class="actions">
        <button class="go" type="button" data-act="new">Yeni macera</button>
        ${has ? '<button class="ghost" type="button" data-act="continue">Yarıda devam</button>' : ""}
      </div>
    `;
  }

  function startNew() {
    state = V.createState();
    shots.length = 0;
    lastBeat = "";
    beginPlay("KAIA: Uyandın. Burası Vespera. Önce beni dinle.");
  }

  function continueSave() {
    const loaded = V.loadFrom(storage);
    if (!loaded) {
      startNew();
      return;
    }
    state = V.prepareContinue(loaded);
    if (V.getOutcome(state) !== "playing" || state.hp <= 0) {
      startNew();
      return;
    }
    shots.length = 0;
    lastBeat = V.getCurrentBeat(state).id;
    beginPlay("Kayıt yüklendi. Kaldığın yerden devam.");
  }

  function beginPlay(line) {
    api.mode = "playing";
    if (overlay) overlay.hidden = true;
    if (hud) hud.hidden = false;
    camX = Math.max(0, Math.min(V.PLANET.w - W, state.x - W / 2));
    camY = Math.max(0, Math.min(V.PLANET.h - H, state.y - H / 2));
    say(line);
    paintHud();
    V.saveTo(state, storage);
  }

  function endPlay() {
    api.mode = "ended";
    if (overlay) overlay.hidden = false;
    V.saveTo(state, storage);
    if (V.isWon(state)) {
      overlayCard.innerHTML = `
        <h2>Gezegen durdu</h2>
        <p>Mira çekirdekti. Sinyal bir tuzakmış. Vespera sustu; eve dönüş yolu açıldı.</p>
        <div class="actions">
          <button class="go" type="button" data-act="menu">Menü</button>
        </div>
      `;
    } else {
      overlayCard.innerHTML = `
        <h2>Tozun içinde kaldın</h2>
        <p>Canın bitti. Kayıt durduğu yerde. Tekrar dene, yarıdan devam et.</p>
        <div class="actions">
          <button class="go" type="button" data-act="continue">Yarıda devam</button>
          <button class="ghost" type="button" data-act="new">Baştan</button>
        </div>
      `;
    }
  }

  function doInteract() {
    if (api.mode !== "playing") return { ok: false };
    const before = V.getCurrentBeat(state).id;
    const result = V.interact(state);
    if (result.ok) {
      if (result.kind === "talk") say(lineFor(result.npcId));
      if (result.kind === "collect") say("Parça yerini buldu. " + V.getObjective(state));
      if (result.kind === "event") say("Arşiv: Mira kurtarıcı değil. Koloni yapay zekâsı. Çekirdek uyanıyor.");
      if (result.kind === "boss-hit") say("Çekirdek sarsıldı.");
      if (V.getCurrentBeat(state).id !== before) V.saveTo(state, storage);
      paintHud();
      if (V.getOutcome(state) !== "playing") endPlay();
    }
    return result;
  }

  function shoot() {
    if (api.mode !== "playing" || V.getOutcome(state) !== "playing") return;
    shots.push({
      x: state.x + state.facing * 18,
      y: state.y,
      vx: state.facing * 420,
      vy: 0,
      life: 0.7,
    });
  }

  function lineFor(npcId) {
    if (npcId === "kaia") return "KAIA: İşaret parçalarını topla. Ben kurtarma kanalını açacağım.";
    if (npcId === "mira") return "Mira: Ben de düştüm. İstasyondaki hücreler lazım. Sana yol göstereceğim.";
    return V.getObjective(state);
  }

  function say(text) {
    if (!storyLog) return;
    storyLog.hidden = false;
    storyLog.textContent = text;
    logTimer = 6;
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    if (api.mode === "playing") step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function step(dt) {
    if (V.getOutcome(state) !== "playing") {
      endPlay();
      return;
    }
    let dx = 0;
    let dy = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      V.tryMove(state, (dx / len) * 210 * dt, (dy / len) * 210 * dt);
    }
    V.tickIFrames(state);
    for (const hazard of V.HAZARDS) V.resolveHazardHit(state, hazard);

    for (let i = shots.length - 1; i >= 0; i -= 1) {
      const shot = shots[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      const beat = V.getCurrentBeat(state);
      if (beat.type === "boss") {
        const boss = V.NPCS.find((npc) => npc.id === "mira-core");
        if (boss && V.overlapCircles(shot.x, shot.y, 6, boss.x, boss.y, 36)) {
          V.applyBossDamage(state, 10);
          shot.life = 0;
        }
      }
      if (shot.life <= 0) shots.splice(i, 1);
    }

    if (Math.random() < dt * 8) {
      motes.push({
        x: camX + Math.random() * W,
        y: camY + Math.random() * H,
        vx: -20 - Math.random() * 30,
        vy: 10 + Math.random() * 20,
        life: 1.4,
        c: Math.random() < 0.5 ? "#c48cff" : "#35d2ff",
      });
    }
    for (let i = motes.length - 1; i >= 0; i -= 1) {
      const mote = motes[i];
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.life -= dt;
      if (mote.life <= 0) motes.splice(i, 1);
    }

    camX += (state.x - W / 2 - camX) * Math.min(1, dt * 5);
    camY += (state.y - H / 2 - camY) * Math.min(1, dt * 5);
    camX = Math.max(0, Math.min(V.PLANET.w - W, camX));
    camY = Math.max(0, Math.min(V.PLANET.h - H, camY));
    if (logTimer > 0) {
      logTimer -= dt;
      if (logTimer <= 0 && storyLog) storyLog.hidden = true;
    }
    const beatId = V.getCurrentBeat(state).id;
    if (beatId !== lastBeat) {
      lastBeat = beatId;
      V.saveTo(state, storage);
    }
    paintHud();
    if (V.getOutcome(state) !== "playing") endPlay();
  }

  function paintHud() {
    const region = V.regionAt(state.x, state.y);
    if (regionLabel) regionLabel.textContent = region ? region.name : "Bilinmeyen toz";
    if (questLabel) questLabel.textContent = V.getObjective(state);
    if (hpFill) hpFill.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawSky();
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGround();
    drawLandmarks();
    for (const item of V.ITEMS) {
      if (state.collected[item.id]) continue;
      drawItem(item);
    }
    for (const npc of V.NPCS) drawNpc(npc);
    for (const hazard of V.HAZARDS) {
      if (state.beatIndex >= (hazard.fromBeat || 0)) drawHazard(hazard);
    }
    for (const shot of shots) {
      ctx.fillStyle = "#fff6c8";
      ctx.shadowColor = "#ffd166";
      ctx.shadowBlur = 12;
      ctx.fillRect(shot.x - 5, shot.y - 2, 10, 4);
      ctx.shadowBlur = 0;
    }
    drawPlayer();
    ctx.restore();
    for (const mote of motes) {
      ctx.globalAlpha = Math.max(0, mote.life);
      ctx.fillStyle = mote.c;
      ctx.fillRect(mote.x - camX, mote.y - camY, 2, 2);
      ctx.globalAlpha = 1;
    }
    drawVignette();
    if (api.mode === "playing") drawCompass();
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#12081c");
    sky.addColorStop(0.45, "#1a102c");
    sky.addColorStop(1, "#2a1430");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff4d8";
    ctx.beginPath();
    ctx.arc(W - 120, 70, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a102c";
    ctx.beginPath();
    ctx.arc(W - 104, 62, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 48; i += 1) {
      const sx = ((i * 97 + camX * 0.08) % W + W) % W;
      const sy = ((i * 53 + camY * 0.04) % 180 + 180) % 180;
      ctx.fillRect(sx, sy, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    ctx.fillStyle = "rgba(196,140,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(W * 0.3, 90, 180, 40, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function hash(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function drawGround() {
    for (const region of V.REGIONS) {
      ctx.fillStyle = region.ground;
      ctx.fillRect(region.x, region.y, region.w, region.h);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.strokeRect(region.x + 8, region.y + 8, region.w - 16, region.h - 16);
      ctx.fillStyle = region.accent + "33";
      for (let i = 0; i < 28; i += 1) {
        const px = region.x + 20 + hash(i, region.x) * (region.w - 40);
        const py = region.y + 20 + hash(region.y, i) * (region.h - 40);
        ctx.beginPath();
        ctx.arc(px, py, 6 + hash(i, 3) * 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = region.accent + "55";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const y = region.y + 80 + i * (region.h / 6);
        ctx.beginPath();
        ctx.moveTo(region.x + 24, y);
        ctx.quadraticCurveTo(region.x + region.w * 0.5, y + (hash(i, 9) - 0.5) * 40, region.x + region.w - 24, y);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      if (!V.isRegionUnlocked(state, region.id)) {
        ctx.fillStyle = "rgba(4,3,8,0.45)";
        ctx.fillRect(region.x, region.y, region.w, region.h);
      }
    }
  }

  function drawLandmarks() {
    drawWreck(168, 360);
    drawTrees(1040, 200);
    drawStation(1980, 160);
    drawIce(360, 1040);
    drawCrater(2580, 1180);
    drawCity(700, 1860);
    drawCore(2480, 2040);
  }

  function drawWreck(x, y) {
    ctx.fillStyle = "#6b7380";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 90, y + 18);
    ctx.lineTo(x + 70, y + 48);
    ctx.lineTo(x - 10, y + 34);
    ctx.fill();
    ctx.fillStyle = "#35d2ff";
    ctx.fillRect(x + 24, y + 16, 16, 10);
  }

  function drawTrees(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const tx = x + (i % 6) * 70;
      const ty = y + Math.floor(i / 6) * 90;
      ctx.fillStyle = "#0c2422";
      ctx.fillRect(tx + 10, ty + 28, 8, 26);
      ctx.fillStyle = "rgba(93,255,200,0.55)";
      ctx.beginPath();
      ctx.moveTo(tx + 14, ty);
      ctx.lineTo(tx + 34, ty + 36);
      ctx.lineTo(tx - 6, ty + 36);
      ctx.fill();
    }
  }

  function drawStation(x, y) {
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(x, y, 140, 80);
    ctx.fillStyle = "#e09a4a";
    ctx.fillRect(x + 16, y + 16, 22, 22);
    ctx.fillRect(x + 52, y + 16, 22, 22);
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(x + 96, y + 36, 28, 44);
  }

  function drawIce(x, y) {
    ctx.fillStyle = "rgba(159,214,255,0.35)";
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x + 50, y);
    ctx.lineTo(x + 90, y + 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(200,236,255,0.25)";
    ctx.fillRect(x + 120, y + 20, 180, 16);
  }

  function drawCrater(x, y) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y, 90, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c48cff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawCity(x, y) {
    for (let i = 0; i < 8; i += 1) {
      const h = 40 + (i % 4) * 22;
      ctx.fillStyle = i % 2 ? "#1c1830" : "#141022";
      ctx.fillRect(x + i * 36, y + 80 - h, 28, h);
      ctx.fillStyle = "rgba(109,125,255,0.45)";
      ctx.fillRect(x + i * 36 + 8, y + 88 - h, 6, 8);
    }
  }

  function drawCore(x, y) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, 80);
    g.addColorStop(0, "rgba(255,77,109,0.8)");
    g.addColorStop(1, "rgba(255,77,109,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 80, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawItem(item) {
    const pulse = 5 + Math.sin(performance.now() / 220 + item.x) * 3;
    ctx.fillStyle = "rgba(255,209,102,0.25)";
    ctx.beginPath();
    ctx.arc(item.x, item.y, 16 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(item.x, item.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNpc(npc) {
    if (npc.id === "mira-core" && V.getCurrentBeat(state).type !== "boss" && V.getCurrentBeat(state).id !== "done") return;
    const enemy = npc.id === "mira" && state.miraRole === "enemy";
    ctx.fillStyle = npc.id === "kaia" ? "#35d2ff" : enemy || npc.id === "mira-core" ? "#ff4d6d" : npc.id === "arsiv" ? "#c48cff" : "#8fff6a";
    ctx.fillRect(npc.x - 12, npc.y - 22, 24, 34);
    ctx.fillStyle = "#140814";
    ctx.fillRect(npc.x - 6, npc.y - 16, 5, 5);
    ctx.fillStyle = "#f4eef8";
    ctx.font = "700 11px Inter, sans-serif";
    ctx.fillText(npc.name, npc.x - 22, npc.y - 28);
  }

  function drawHazard(hazard) {
    ctx.fillStyle = "rgba(255,77,109,0.18)";
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,77,109,0.7)";
    ctx.stroke();
  }

  function drawPlayer() {
    const blink = state.iFrames > 0 && Math.floor(performance.now() / 70) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#1b2430";
    ctx.fillRect(state.x - 12, state.y - 8, 24, 22);
    ctx.fillStyle = "#35d2ff";
    ctx.fillRect(state.x - 10, state.y - 22, 20, 16);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(state.x + (state.facing > 0 ? 2 : -8), state.y - 16, 6, 5);
    ctx.fillStyle = "#071012";
    ctx.font = "900 10px Inter, sans-serif";
    ctx.fillText("H", state.x - 4, state.y + 6);
    ctx.globalAlpha = 1;
    const near = V.nearbyInteract(state);
    if (near) {
      ctx.fillStyle = "#fff";
      ctx.font = "800 12px Inter, sans-serif";
      ctx.fillText("E", state.x - 4, state.y - 30);
    }
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 420);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawCompass() {
    const beat = V.getCurrentBeat(state);
    let tx = state.x;
    let ty = state.y;
    if (beat.type === "talk" || beat.type === "boss") {
      const npc = V.NPCS.find((item) => item.id === beat.npcId);
      if (npc) {
        tx = npc.x;
        ty = npc.y;
      }
    } else if (beat.type === "event") {
      const npc = V.NPCS.find((item) => item.id === "arsiv");
      if (npc) {
        tx = npc.x;
        ty = npc.y;
      }
    } else if (beat.type === "collect") {
      const item = V.ITEMS.find((entry) => beat.itemIds.includes(entry.id) && !state.collected[entry.id]);
      if (item) {
        tx = item.x;
        ty = item.y;
      }
    }
    const ang = Math.atan2(ty - state.y, tx - state.x);
    ctx.save();
    ctx.translate(W - 42, 42);
    ctx.rotate(ang);
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, -8);
    ctx.fill();
    ctx.restore();
  }
})();
