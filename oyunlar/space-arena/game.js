/**
 * Space Arena — 2D pixel side-view
 * Modes: Fight (random bot) · Parkour (endless, hardens)
 * Currency: SpaceCoin · 10 unlockable characters
 */
(function () {
  "use strict";

  const W = 320;
  const H = 180;
  const STORAGE = "hakorocks-space-arena-v1";
  const GROUND_Y = 148;
  /** Fixed fight damage (user design) */
  const DMG_PUNCH = 5;
  const DMG_KICK = 10;
  const DMG_BEAM = 25;
  const SHIELD_DURATION = 1;
  const SHIELD_DAMAGE_MULT = 0.5;
  const BEAM_COOLDOWN = 90; // 1.5 minutes

  const CHARACTERS = [
    { id: "nova", name: "Nova", cost: 0, color: "#3de0ff", accent: "#e8f4ff", power: 1, speed: 1 },
    { id: "blaze", name: "Blaze", cost: 50, color: "#ff6b3d", accent: "#ffd24a", power: 1.1, speed: 1 },
    { id: "frost", name: "Frost", cost: 100, color: "#7ecbff", accent: "#d0f0ff", power: 1, speed: 1.1 },
    { id: "volt", name: "Volt", cost: 150, color: "#ffe14a", accent: "#fff8c0", power: 1.15, speed: 1.15 },
    { id: "shadow", name: "Shadow", cost: 200, color: "#6b5cff", accent: "#c4b8ff", power: 1.2, speed: 1.05 },
    { id: "comet", name: "Comet", cost: 300, color: "#ff4fd8", accent: "#ffc0f0", power: 1.25, speed: 1.1 },
    { id: "nebula", name: "Nebula", cost: 400, color: "#b44dff", accent: "#e0b0ff", power: 1.3, speed: 1 },
    { id: "titan", name: "Titan", cost: 500, color: "#8b9bb0", accent: "#e0e6ee", power: 1.45, speed: 0.9 },
    { id: "pixel", name: "Pixel", cost: 750, color: "#5dff9a", accent: "#c8ffe0", power: 1.35, speed: 1.2 },
    { id: "cosmic", name: "Cosmic", cost: 1000, color: "#ffd24a", accent: "#ffffff", power: 1.5, speed: 1.25 },
  ];

  const BOT_NAMES = [
    "AstroKid", "MoonPunch", "StarKick", "NebBot", "OrbitX",
    "PixelFox", "ZeroG", "RocketRon", "Luna", "Quark",
  ];

  const canvas = document.querySelector("#game");
  const ctx = canvas ? canvas.getContext("2d") : null;
  const coinLabel = document.querySelector("#coinLabel");
  const modeLabel = document.querySelector("#modeLabel");
  const statusLabel = document.querySelector("#statusLabel");
  const charLabel = document.querySelector("#charLabel");
  const hud = document.querySelector("#hud");
  const menuPanel = document.querySelector("#menuPanel");
  const charPanel = document.querySelector("#charPanel");
  const touchPanel = document.querySelector("#touchPanel");
  const charGrid = document.querySelector("#charGrid");

  if (!canvas || !ctx) {
    console.error("Space Arena: canvas yok");
    return;
  }

  ctx.imageSmoothingEnabled = false;

  const keys = new Set();
  const touch = new Set();

  const save = loadSave();
  let screen = "menu"; // menu | chars | fight | parkour | result
  let resultMsg = "";
  let resultCoins = 0;
  let last = performance.now();
  let anim = 0;

  // Fight state
  let player = null;
  let enemy = null;
  let fightTime = 0;
  let hitStop = 0;
  let floatTexts = [];
  let beams = [];

  // Parkour state (manual move — no auto-run)
  let runner = null;
  let platforms = [];
  let hazards = []; // walkers, portals, spikes, meteors
  let camX = 0;
  let distance = 0;
  let parkourAlive = true;
  let stars = [];
  let spawnX = 0;
  let hazardTimer = 0;
  /** Three horizontal “paths” — switch by jumping to dodge walkers/portals */
  const LANES = [GROUND_Y, GROUND_Y - 28, GROUND_Y - 56];

  bindUI();
  bindInput();
  renderCharGrid();
  updateCoinUI();
  showMenu();
  requestAnimationFrame(loop);

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          coins: Math.max(0, Number(data.coins) || 0),
          unlocked: Array.isArray(data.unlocked) ? data.unlocked : ["nova"],
          selected: data.selected || "nova",
        };
      }
    } catch {
      /* ignore */
    }
    return { coins: 0, unlocked: ["nova"], selected: "nova" };
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(save));
    } catch {
      /* ignore */
    }
  }

  function selectedChar() {
    return CHARACTERS.find((c) => c.id === save.selected) || CHARACTERS[0];
  }

  function updateCoinUI() {
    if (coinLabel) coinLabel.textContent = String(Math.floor(save.coins));
    if (charLabel) charLabel.textContent = selectedChar().name;
  }

  function setHud(mode, status) {
    if (modeLabel) modeLabel.textContent = mode;
    if (statusLabel) statusLabel.textContent = status;
  }

  function showMenu() {
    screen = "menu";
    if (menuPanel) menuPanel.hidden = false;
    if (charPanel) charPanel.hidden = true;
    if (hud) hud.hidden = true;
    if (touchPanel) touchPanel.hidden = true;
    setHud("Menü", "Mod seç");
  }

  function showChars() {
    screen = "chars";
    if (menuPanel) menuPanel.hidden = true;
    if (charPanel) charPanel.hidden = false;
    if (hud) hud.hidden = true;
    if (touchPanel) touchPanel.hidden = true;
    renderCharGrid();
  }

  function startFight() {
    const me = selectedChar();
    const botChar = CHARACTERS[1 + Math.floor(Math.random() * (CHARACTERS.length - 1))];
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

    player = makeFighter(me, 70, GROUND_Y, 1);
    enemy = makeFighter(botChar, 240, GROUND_Y, -1);
    enemy.name = botName;
    enemy.isBot = true;

    fightTime = 0;
    hitStop = 0;
    floatTexts = [];
    beams = [];
    screen = "fight";
    if (menuPanel) menuPanel.hidden = true;
    if (charPanel) charPanel.hidden = true;
    if (hud) hud.hidden = false;
    if (touchPanel) touchPanel.hidden = false;
    setHud("Dövüş", `vs ${botName}`);
  }

  function startParkour() {
    const me = selectedChar();
    runner = {
      x: 48,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      w: 10,
      h: 16,
      onGround: true,
      color: me.color,
      accent: me.accent,
      speed: me.speed,
      anim: 0,
      facing: 1,
    };
    // Starting triple-path corridor so you can already switch lanes
    platforms = [];
    hazards = [];
    for (let i = 0; i < 4; i += 1) {
      const x = i * 90;
      for (const y of LANES) {
        platforms.push({ x, y, w: 86, h: 8, solid: true });
      }
    }
    camX = 0;
    distance = 0;
    parkourAlive = true;
    spawnX = 360;
    // Safe start: no timed spawns until player has walked a bit
    hazardTimer = 4;
    stars = makeStars();
    // Only build empty multi-lane path first — obstacles unlock with distance
    for (let i = 0; i < 5; i += 1) spawnParkourChunk({ forceSafe: true });
    screen = "parkour";
    if (menuPanel) menuPanel.hidden = true;
    if (charPanel) charPanel.hidden = true;
    if (hud) hud.hidden = false;
    if (touchPanel) touchPanel.hidden = false;
    setHud("Parkur", "Ilerle — engeller yolda cikar");
  }

  function makeFighter(char, x, y, facing) {
    return {
      char,
      name: char.name,
      x,
      y,
      vx: 0,
      vy: 0,
      w: 12,
      h: 18,
      facing,
      hp: 100,
      maxHp: 100,
      onGround: true,
      attack: 0,
      attackKind: null, // punch | kick | beam
      hitbox: null,
      cooldown: 0,
      stun: 0,
      shield: 0, // seconds left
      beamCd: 0, // seconds until H ready (starts ready)
      color: char.color,
      accent: char.accent,
      power: char.power,
      speed: char.speed,
      isBot: false,
      anim: 0,
      _hitThisSwing: false,
    };
  }

  function makeStars() {
    const list = [];
    for (let i = 0; i < 40; i += 1) {
      list.push({
        x: Math.random() * 400,
        y: Math.random() * 100,
        s: Math.random() > 0.7 ? 2 : 1,
      });
    }
    return list;
  }

  /**
   * Build the next world chunk: multi-lane platforms.
   * Obstacles only appear after the player has progressed (distance gates).
   */
  function spawnParkourChunk(opts = {}) {
    const forceSafe = Boolean(opts.forceSafe);
    const difficulty = Math.min(1.15, distance / 280);
    // Unlock tiers as you go further (meters ≈ distance)
    const allowSpikes = !forceSafe && distance >= 12;
    const allowWalkers = !forceSafe && distance >= 22;
    const allowPortals = !forceSafe && distance >= 18;
    const allowMeteors = !forceSafe && distance >= 35;
    // Spawn chance ramps with distance
    const dens = Math.min(1, Math.max(0, (distance - 10) / 120));

    const chunkW = 70 + Math.floor(Math.random() * 30);
    const gap = 10 + Math.random() * (8 + difficulty * 18);
    const x0 = spawnX + gap;

    const laneMask = [true, Math.random() > 0.2, Math.random() > 0.35];
    if (!laneMask[1] && !laneMask[2]) laneMask[1] = true;
    laneMask[0] = true;

    for (let li = 0; li < LANES.length; li += 1) {
      if (!laneMask[li]) continue;
      const y = LANES[li];
      if (difficulty > 0.4 && !forceSafe && Math.random() < 0.25) {
        const half = Math.floor(chunkW * 0.45);
        platforms.push({ x: x0, y, w: half, h: 8, solid: true });
        platforms.push({
          x: x0 + half + 12 + difficulty * 10,
          y,
          w: Math.max(20, chunkW - half - 12),
          h: 8,
          solid: true,
        });
      } else {
        platforms.push({ x: x0, y, w: chunkW, h: 8, solid: true });
      }
      if (allowSpikes && Math.random() < 0.12 + dens * 0.28) {
        hazards.push({
          type: "spike",
          x: x0 + chunkW * (0.3 + Math.random() * 0.4),
          y: y - 6,
          w: 10,
          h: 6,
          vx: 0,
          lane: li,
        });
      }
    }

    spawnX = x0 + chunkW;
    const openLanes = LANES.map((_, i) => i).filter((i) => laneMask[i]);

    if (allowPortals && Math.random() < 0.2 + dens * 0.45) {
      const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
      const speed = -(28 + dens * 50 + Math.random() * 20);
      hazards.push({
        type: "portal",
        x: spawnX + 30 + Math.random() * 50,
        y: LANES[lane] - 14,
        w: 12,
        h: 14,
        vx: speed,
        lane,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    if (allowWalkers && Math.random() < 0.15 + dens * 0.35) {
      const lane = openLanes[Math.floor(Math.random() * openLanes.length)];
      hazards.push({
        type: "walker",
        x: spawnX + 16,
        y: LANES[lane] - 12,
        w: 10,
        h: 12,
        vx: -(35 + dens * 55),
        lane,
        anim: 0,
      });
    }

    if (allowMeteors && Math.random() < 0.12 + dens * 0.3) {
      spawnMeteor(
        x0 + chunkW * (0.2 + Math.random() * 0.6),
        openLanes[Math.floor(Math.random() * openLanes.length)],
        dens
      );
    }
  }

  /** Meteor aims at a fixed red impact spot on a lane. */
  function spawnMeteor(impactX, lane, dens) {
    const impactY = LANES[lane];
    const startX = impactX + (Math.random() * 40 - 20);
    const startY = 8 + Math.random() * 12;
    const fallTime = Math.max(0.85, 1.9 - dens * 0.7);
    hazards.push({
      type: "meteor",
      x: startX,
      y: startY,
      startX,
      startY,
      impactX,
      impactY,
      w: 10,
      h: 10,
      age: 0,
      fallTime,
      lane,
      landed: false,
    });
  }

  function bindUI() {
    document.querySelector("#btnFight")?.addEventListener("click", () => startFight());
    document.querySelector("#btnParkour")?.addEventListener("click", () => startParkour());
    document.querySelector("#btnChars")?.addEventListener("click", () => showChars());
    document.querySelector("#btnCharBack")?.addEventListener("click", () => showMenu());
  }

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        if (screen === "fight" || screen === "parkour" || screen === "result") {
          endToMenu(0, "Menüye döndün.");
        } else if (screen === "chars") showMenu();
      }
      if (screen === "result" && (e.code === "Enter" || e.code === "Space")) {
        showMenu();
      }
    });
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    document.querySelectorAll("[data-k]").forEach((btn) => {
      const k = btn.dataset.k;
      const down = (ev) => {
        ev.preventDefault();
        touch.add(k);
      };
      const up = (ev) => {
        ev.preventDefault();
        touch.delete(k);
      };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("pointercancel", up);
    });
  }

  function pressed(name) {
    const map = {
      left: keys.has("KeyA") || keys.has("ArrowLeft") || touch.has("left"),
      right: keys.has("KeyD") || keys.has("ArrowRight") || touch.has("right"),
      up: keys.has("KeyW") || keys.has("ArrowUp") || keys.has("Space") || touch.has("up") || touch.has("jump"),
      down: keys.has("KeyS") || keys.has("ArrowDown") || touch.has("down"),
      punch: keys.has("KeyJ") || keys.has("KeyZ") || touch.has("punch"),
      kick: keys.has("KeyK") || keys.has("KeyX") || touch.has("kick"),
      jump: keys.has("KeyW") || keys.has("ArrowUp") || keys.has("Space") || touch.has("jump") || touch.has("up"),
      shield: keys.has("KeyC") || touch.has("shield"),
      beam: keys.has("KeyH") || touch.has("beam"),
    };
    return Boolean(map[name]);
  }

  function renderCharGrid() {
    if (!charGrid) return;
    charGrid.innerHTML = "";
    for (const c of CHARACTERS) {
      const unlocked = save.unlocked.includes(c.id);
      const selected = save.selected === c.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `char-card${selected ? " selected" : ""}${unlocked ? "" : " locked"}`;
      btn.innerHTML = `
        <div class="char-swatch" style="background:${c.color}"></div>
        <strong>${c.name}</strong>
        <small>Güç ${c.power.toFixed(1)} · Hız ${c.speed.toFixed(1)}</small>
        <span class="price">${unlocked ? (selected ? "Seçili" : "Açık — seç") : `${c.cost} SC`}</span>
      `;
      btn.addEventListener("click", () => onCharClick(c));
      charGrid.appendChild(btn);
    }
  }

  function onCharClick(c) {
    if (save.unlocked.includes(c.id)) {
      save.selected = c.id;
      persist();
      updateCoinUI();
      renderCharGrid();
      return;
    }
    if (save.coins >= c.cost) {
      save.coins -= c.cost;
      save.unlocked.push(c.id);
      save.selected = c.id;
      persist();
      updateCoinUI();
      renderCharGrid();
    }
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    anim += dt;
    if (screen === "fight") updateFight(dt);
    else if (screen === "parkour") updateParkour(dt);
    else if (screen === "result") {
      /* idle */
    }
    draw();
    requestAnimationFrame(loop);
  }

  function updateFight(dt) {
    fightTime += dt;
    if (hitStop > 0) {
      hitStop -= dt;
      return;
    }

    controlFighter(player, dt, false);
    controlFighter(enemy, dt, true);
    resolveAttacks();
    updateBeams(dt);

    floatTexts = floatTexts
      .map((t) => ({ ...t, y: t.y - 20 * dt, life: t.life - dt }))
      .filter((t) => t.life > 0);

    if (player.hp <= 0) {
      endFight(false);
    } else if (enemy.hp <= 0) {
      endFight(true);
    } else {
      const beamLeft = player.beamCd > 0 ? `${Math.ceil(player.beamCd)}s` : "HAZIR";
      setHud(
        "Dövüş",
        `vs ${enemy.name} · HP ${Math.ceil(player.hp)} · H:${beamLeft}`
      );
    }
  }

  function controlFighter(f, dt, isBot) {
    f.shield = Math.max(0, f.shield - dt);
    f.beamCd = Math.max(0, f.beamCd - dt);

    if (f.stun > 0) {
      f.stun -= dt;
      f.vx *= 0.85;
    } else if (isBot) {
      botAI(f, dt);
    } else {
      playerInput(f, dt);
    }

    f.vy += 420 * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.vy = 0;
      f.onGround = true;
    } else {
      f.onGround = false;
    }

    f.x = Math.max(20, Math.min(W - 20, f.x));
    f.vx *= 0.82;
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.anim += dt * (Math.abs(f.vx) > 10 ? 10 : 4);

    if (f.attack > 0) {
      f.attack -= dt;
      if (f.attack <= 0) {
        f.attack = 0;
        f.attackKind = null;
        f.hitbox = null;
      } else if (f.attackKind === "punch" || f.attackKind === "kick") {
        const reach = f.attackKind === "kick" ? 18 : 14;
        const ox = f.facing * (f.w / 2 + reach / 2);
        f.hitbox = {
          x: f.x + ox,
          y: f.y - f.h * 0.55,
          w: reach,
          h: f.attackKind === "kick" ? 10 : 8,
          dmg: f.attackKind === "kick" ? DMG_KICK : DMG_PUNCH,
          kind: f.attackKind,
        };
      }
    }
  }

  function playerInput(f, dt) {
    const spd = 90 * f.speed;
    if (pressed("left")) {
      f.vx -= spd * 8 * dt;
      f.facing = -1;
    }
    if (pressed("right")) {
      f.vx += spd * 8 * dt;
      f.facing = 1;
    }
    if (pressed("jump") && f.onGround) {
      f.vy = -165;
      f.onGround = false;
    }
    // C = shield 1s, 50% damage taken
    if (pressed("shield") && f.shield <= 0 && f.cooldown <= 0.05) {
      f.shield = SHIELD_DURATION;
      floatTexts.push({
        x: f.x - 10,
        y: f.y - f.h - 8,
        text: "KALKAN",
        life: 0.7,
        color: "#5dff9a",
      });
    }
    // H = special beam, 90s cooldown
    if (pressed("beam") && f.beamCd <= 0 && f.attack <= 0) {
      fireBeam(f);
      f.beamCd = BEAM_COOLDOWN;
      floatTexts.push({
        x: f.x - 8,
        y: f.y - f.h - 10,
        text: "ISIN!",
        life: 0.8,
        color: "#ffd24a",
      });
    }
    if (f.cooldown <= 0 && f.attack <= 0) {
      if (pressed("punch")) startAttack(f, "punch");
      else if (pressed("kick")) startAttack(f, "kick");
    }
  }

  function botAI(f, dt) {
    const target = player;
    const dx = target.x - f.x;
    const dist = Math.abs(dx);
    f.facing = dx >= 0 ? 1 : -1;
    const spd = 75 * f.speed;

    if (dist > 28) {
      f.vx += f.facing * spd * 7 * dt;
    } else if (dist < 16) {
      f.vx -= f.facing * spd * 4 * dt;
    }

    if (f.onGround && Math.random() < 0.008) f.vy = -150;

    // rare shield when low hp
    if (f.hp < 40 && f.shield <= 0 && Math.random() < 0.01) {
      f.shield = SHIELD_DURATION;
    }

    if (f.cooldown <= 0 && f.attack <= 0 && dist < 30) {
      startAttack(f, Math.random() < 0.45 ? "kick" : "punch");
    }
    // bot beam rare if ready and mid range
    if (f.beamCd <= 0 && dist > 40 && dist < 120 && Math.random() < 0.004) {
      fireBeam(f);
      f.beamCd = BEAM_COOLDOWN;
    }
  }

  function startAttack(f, kind) {
    f.attackKind = kind;
    f.attack = kind === "kick" ? 0.28 : 0.2;
    f.cooldown = kind === "kick" ? 0.55 : 0.38;
    f.vx += f.facing * 20;
    f._hitThisSwing = false;
  }

  function fireBeam(f) {
    beams.push({
      x: f.x + f.facing * 10,
      y: f.y - f.h * 0.55,
      vx: f.facing * 220,
      life: 0.85,
      dmg: DMG_BEAM,
      owner: f,
      color: f.accent || "#ffd24a",
      w: 16,
      h: 4,
    });
  }

  function updateBeams(dt) {
    for (let i = beams.length - 1; i >= 0; i -= 1) {
      const b = beams[i];
      b.x += b.vx * dt;
      b.life -= dt;
      const target = b.owner === player ? enemy : player;
      if (
        target &&
        Math.abs(b.x - target.x) < (b.w + target.w) / 2 + 4 &&
        Math.abs(b.y - (target.y - target.h / 2)) < (b.h + target.h) / 2
      ) {
        applyDamage(target, b.dmg, b.owner === player ? player.facing : enemy.facing);
        beams.splice(i, 1);
        continue;
      }
      if (b.life <= 0 || b.x < -20 || b.x > W + 20) beams.splice(i, 1);
    }
  }

  function applyDamage(defender, rawDmg, knockFacing) {
    let dmg = rawDmg;
    if (defender.shield > 0) {
      dmg = Math.max(1, Math.round(dmg * SHIELD_DAMAGE_MULT));
    }
    defender.hp = Math.max(0, defender.hp - dmg);
    defender.stun = 0.22;
    defender.vx = (knockFacing || 1) * 80;
    defender.vy = -40;
    hitStop = 0.05;
    floatTexts.push({
      x: defender.x,
      y: defender.y - defender.h - 4,
      text: `-${dmg}`,
      life: 0.6,
      color: defender.shield > 0 ? "#5dff9a" : "#ff6b8a",
    });
  }

  function resolveAttacks() {
    for (const [attacker, defender] of [
      [player, enemy],
      [enemy, player],
    ]) {
      if (!attacker.hitbox || defender.stun > 0.05) continue;
      if (attacker._hitThisSwing) continue;
      const hb = attacker.hitbox;
      if (rectsOverlap(hb, bodyBox(defender))) {
        attacker._hitThisSwing = true;
        applyDamage(defender, hb.dmg, attacker.facing);
      }
    }
    if (player.attack <= 0) player._hitThisSwing = false;
    if (enemy.attack <= 0) enemy._hitThisSwing = false;
  }

  function bodyBox(f) {
    return { x: f.x, y: f.y - f.h / 2, w: f.w, h: f.h };
  }

  function rectsOverlap(a, b) {
    return (
      Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
      Math.abs(a.y - b.y) < (a.h + b.h) / 2
    );
  }

  function endFight(won) {
    const coins = won ? 25 + Math.floor(Math.random() * 20) + Math.floor(selectedChar().power * 5) : 3;
    save.coins += coins;
    persist();
    updateCoinUI();
    endToMenu(coins, won ? `Kazandın! +${coins} SpaceCoin` : `Kaybettin. +${coins} SpaceCoin (teselli)`);
  }

  function updateParkour(dt) {
    if (!parkourAlive || !runner) return;

    const difficulty = Math.min(1.2, distance / 280);
    // Manual movement only — no auto-forward
    const moveSpeed = 95 * runner.speed;
    runner.vx = 0;
    if (pressed("left")) {
      runner.vx = -moveSpeed;
      runner.facing = -1;
    }
    if (pressed("right")) {
      runner.vx = moveSpeed;
      runner.facing = 1;
    }
    if (pressed("jump") && runner.onGround) {
      runner.vy = -195;
      runner.onGround = false;
    }

    runner.vy += 520 * dt;
    runner.x += runner.vx * dt;
    runner.y += runner.vy * dt;
    runner.onGround = false;

    // Platform collisions (feet on top)
    for (const p of platforms) {
      if (!p.solid) continue;
      const feet = runner.y;
      const prevFeet = feet - runner.vy * dt;
      if (
        runner.vy >= 0 &&
        prevFeet <= p.y + 1 &&
        feet >= p.y - 1 &&
        runner.x + runner.w / 2 > p.x + 1 &&
        runner.x - runner.w / 2 < p.x + p.w - 1
      ) {
        runner.y = p.y;
        runner.vy = 0;
        runner.onGround = true;
      }
    }

    // Don't walk through solid from the side lightly
    runner.x = Math.max(8, runner.x);

    if (runner.y > H + 24) {
      finishParkour(false);
      return;
    }

    // Hazards
    for (let i = hazards.length - 1; i >= 0; i -= 1) {
      const h = hazards[i];
      if (h.type === "portal" || h.type === "walker") {
        h.x += h.vx * dt;
        h.pulse = (h.pulse || 0) + dt * 6;
        h.anim = (h.anim || 0) + dt * 10;
        if (h.lane >= 0) h.y = LANES[h.lane] - (h.type === "portal" ? 14 : 12);
      } else if (h.type === "meteor") {
        h.age = (h.age || 0) + dt;
        const t = Math.min(1, h.age / (h.fallTime || 1.5));
        // ease-in fall toward impact mark
        const ease = t * t;
        h.x = h.startX + (h.impactX - h.startX) * ease;
        h.y = h.startY + (h.impactY - 8 - h.startY) * ease;
        if (t >= 1) {
          // splash then remove — still deadly on the mark for a blink
          h.landed = true;
          h.x = h.impactX;
          h.y = h.impactY - 8;
          h.w = 14;
          h.h = 8;
          h.age += dt;
          if (h.age > (h.fallTime || 1.5) + 0.25) {
            hazards.splice(i, 1);
            continue;
          }
        }
      }

      if (h.x + (h.w || 0) < camX - 40 || h.y > H + 30) {
        hazards.splice(i, 1);
        continue;
      }

      if (parkourHitsRunner(h)) {
        finishParkour(false);
        return;
      }
    }

    camX = Math.max(0, runner.x - 70);
    distance = Math.max(distance, runner.x / 10);
    const nextHint =
      distance < 12
        ? "guvenli bolge — ilerle"
        : distance < 22
          ? "diken/portal basliyor"
          : distance < 35
            ? "yuruyen engeller"
            : "meteor yagiyor!";
    setHud("Parkur", `${Math.floor(distance)} m · ${nextHint}`);

    platforms = platforms.filter((p) => p.x + p.w > camX - 50);
    hazards = hazards.filter((h) => h.x + (h.w || 0) > camX - 50);
    while (spawnX < camX + W + 140) spawnParkourChunk();

    // Timed spawns only after progress — more often the farther you go
    hazardTimer -= dt;
    if (hazardTimer <= 0) {
      const dens = Math.min(1, Math.max(0, (distance - 15) / 100));
      hazardTimer = Math.max(0.9, 3.4 - dens * 2.2);
      if (distance >= 18) {
        const lane = Math.floor(Math.random() * LANES.length);
        const kind =
          distance >= 35 && Math.random() < 0.35
            ? "meteor"
            : Math.random() < 0.55
              ? "portal"
              : "walker";
        if (kind === "meteor") {
          spawnMeteor(camX + 80 + Math.random() * (W - 40), lane, dens);
        } else {
          hazards.push({
            type: kind,
            x: camX + W + 10,
            y: LANES[lane] - 14,
            w: 12,
            h: 14,
            vx: -(40 + dens * 60),
            lane,
            pulse: 0,
            anim: 0,
          });
        }
      }
    }

    runner.anim += dt * (Math.abs(runner.vx) > 5 ? 12 : 4);
  }

  function parkourHitsRunner(h) {
    if (!runner) return false;
    const rx = runner.x;
    const ry = runner.y - runner.h / 2;
    return (
      Math.abs(rx - (h.x + h.w / 2)) < (runner.w + h.w) / 2 &&
      Math.abs(ry - (h.y + h.h / 2)) < (runner.h + h.h) / 2
    );
  }

  function finishParkour(voluntary) {
    if (!parkourAlive) return;
    parkourAlive = false;
    const coins = Math.max(1, Math.floor(distance / 4));
    save.coins += coins;
    persist();
    updateCoinUI();
    endToMenu(
      coins,
      voluntary
        ? `Parkur bitti. +${coins} SpaceCoin`
        : `${Math.floor(distance)} m! +${coins} SpaceCoin`
    );
  }

  function endToMenu(coins, msg) {
    screen = "result";
    resultCoins = coins;
    resultMsg = msg;
    if (touchPanel) touchPanel.hidden = true;
    if (hud) hud.hidden = false;
    setHud("Sonuç", msg);
    // brief then allow click — auto menu after 2.5s via timer on next inputs
    setTimeout(() => {
      if (screen === "result") showMenu();
    }, 2800);
  }

  // ——— Draw (pixel) ———
  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);

    if (screen === "menu" || screen === "chars") drawMenuBg();
    else if (screen === "fight") drawFight();
    else if (screen === "parkour") drawParkour();
    else if (screen === "result") {
      drawMenuBg();
      drawResultOverlay();
    }
  }

  function drawMenuBg() {
    // space sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1530");
    g.addColorStop(1, "#1a0a28");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // stars
    for (let i = 0; i < 50; i += 1) {
      const x = (i * 47 + anim * 8) % W;
      const y = (i * 31) % (H - 40);
      ctx.fillStyle = i % 5 === 0 ? "#3de0ff" : "#ffffff";
      ctx.fillRect(Math.floor(x), Math.floor(y), i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
    }
    // ground strip
    ctx.fillStyle = "#1e3048";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = "#3de0ff";
    ctx.fillRect(0, GROUND_Y, W, 2);

    // title pixels
    const me = selectedChar();
    drawPixelFighter(W / 2 - 30, GROUND_Y, 1, me.color, me.accent, anim * 6, false);
    drawPixelFighter(W / 2 + 30, GROUND_Y, -1, "#ff4fd8", "#ffc0f0", anim * 6 + 3, false);

    ctx.fillStyle = "#e8f4ff";
    pixelText("SPACE ARENA", W / 2 - 52, 28, 1);
    ctx.fillStyle = "#ffd24a";
    pixelText(`${Math.floor(save.coins)} SC`, W / 2 - 20, 44, 1);
  }

  function drawResultOverlay() {
    ctx.fillStyle = "rgba(5,8,16,0.55)";
    ctx.fillRect(40, 60, W - 80, 50);
    ctx.fillStyle = "#5dff9a";
    pixelText(resultMsg.slice(0, 28), 50, 78, 1);
    ctx.fillStyle = "#8aa8c4";
    pixelText("Menuye donuluyor...", 50, 94, 1);
  }

  function drawFight() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#120828");
    g.addColorStop(0.6, "#1a1040");
    g.addColorStop(1, "#0c2030");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i += 1) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect((i * 53) % W, (i * 17) % 80, 1, 1);
    }
    ctx.fillStyle = "#243448";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = "#ff4fd8";
    ctx.fillRect(0, GROUND_Y, W, 2);
    ctx.fillStyle = "rgba(61,224,255,0.15)";
    ctx.fillRect(16, GROUND_Y - 4, W - 32, 4);

    drawHpBar(12, 10, 120, player.hp / player.maxHp, player.color, player.name);
    drawHpBar(W - 132, 10, 120, enemy.hp / enemy.maxHp, enemy.color, enemy.name);

    // shield bubble
    if (player.shield > 0) drawShieldBubble(player);
    if (enemy.shield > 0) drawShieldBubble(enemy);

    drawPixelFighter(
      player.x,
      player.y,
      player.facing,
      player.color,
      player.accent,
      player.anim,
      player.attackKind,
      player.shield > 0
    );
    drawPixelFighter(
      enemy.x,
      enemy.y,
      enemy.facing,
      enemy.color,
      enemy.accent,
      enemy.anim,
      enemy.attackKind,
      enemy.shield > 0
    );

    // beams
    for (const b of beams) {
      ctx.fillStyle = b.color;
      ctx.fillRect(Math.floor(b.x - b.w / 2), Math.floor(b.y - b.h / 2), b.w, b.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.floor(b.x - b.w / 2), Math.floor(b.y - 1), b.w, 2);
    }

    for (const t of floatTexts) {
      ctx.globalAlpha = Math.max(0, t.life);
      ctx.fillStyle = t.color;
      pixelText(t.text, t.x - 6, t.y, 1);
      ctx.globalAlpha = 1;
    }

    drawFightControlsOverlay();
  }

  function drawShieldBubble(f) {
    ctx.strokeStyle = "rgba(93,255,154,0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(f.x - 10), Math.floor(f.y - f.h - 4), 20, f.h + 6);
  }

  /** On-canvas button labels so moves are always visible in fight */
  function drawFightControlsOverlay() {
    const beamReady = player && player.beamCd <= 0;
    const beamTxt = beamReady
      ? "H ISIN HAZIR"
      : `H ISIN ${Math.ceil(player ? player.beamCd : 0)}s`;
    const shieldTxt = player && player.shield > 0 ? "C KALKAN ACIK" : "C KALKAN 1s";

    ctx.fillStyle = "rgba(5, 10, 20, 0.72)";
    ctx.fillRect(4, H - 34, W - 8, 30);

    ctx.fillStyle = "#e8f4ff";
    pixelText("A/D HAREKET  W ZIPLA", 8, H - 28, 1);

    ctx.fillStyle = "#ff4fd8";
    pixelText("J YUMRUK 5", 8, H - 18, 1);
    ctx.fillStyle = "#ff7a5c";
    pixelText("K TEKME 10", 100, H - 18, 1);

    ctx.fillStyle = player && player.shield > 0 ? "#5dff9a" : "#8affb0";
    pixelText(shieldTxt, 8, H - 8, 1);

    ctx.fillStyle = beamReady ? "#ffd24a" : "#8aa8c4";
    pixelText(beamTxt, 140, H - 8, 1);
  }

  function drawHpBar(x, y, w, ratio, color, name) {
    ctx.fillStyle = "#0a1020";
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * ratio), 8);
    ctx.fillStyle = "#e8f4ff";
    pixelText(name.slice(0, 10), x, y + 16, 1);
  }

  function drawParkour() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#050a18");
    g.addColorStop(1, "#102030");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const sx = ((s.x - camX * 0.3) % W + W) % W;
      ctx.fillStyle = "#c0e0ff";
      ctx.fillRect(Math.floor(sx), Math.floor(s.y), s.s, s.s);
    }

    ctx.fillStyle = "#3d2060";
    ctx.fillRect(Math.floor(220 - camX * 0.1), 30, 24, 24);
    ctx.fillStyle = "#5dff9a";
    ctx.fillRect(Math.floor(228 - camX * 0.1), 38, 8, 8);

    // faint lane guides
    for (const y of LANES) {
      ctx.fillStyle = "rgba(61,224,255,0.06)";
      ctx.fillRect(0, Math.floor(y) - 1, W, 1);
    }

    for (const p of platforms) {
      const px = Math.floor(p.x - camX);
      if (px + p.w < 0 || px > W) continue;
      ctx.fillStyle = "#3de0ff";
      ctx.fillRect(px, Math.floor(p.y), Math.floor(p.w), 2);
      ctx.fillStyle = "#1a4060";
      ctx.fillRect(px, Math.floor(p.y) + 2, Math.floor(p.w), Math.floor(p.h));
    }

    // Draw meteor impact zones first (under entities)
    for (const h of hazards) {
      if (h.type !== "meteor" || h.landed) continue;
      const ix = Math.floor(h.impactX - camX);
      const iy = Math.floor(h.impactY);
      if (ix < -20 || ix > W + 20) continue;
      const pulse = 0.45 + Math.sin(anim * 10) * 0.2;
      // red danger pad on the lane where it will hit
      ctx.fillStyle = `rgba(255, 40, 60, ${pulse})`;
      ctx.fillRect(ix - 10, iy - 3, 20, 6);
      ctx.fillStyle = "#ff2040";
      ctx.fillRect(ix - 8, iy - 2, 16, 4);
      // crosshair
      ctx.fillStyle = "#ff6677";
      ctx.fillRect(ix - 1, iy - 10, 2, 10);
      ctx.fillRect(ix - 6, iy - 1, 12, 2);
      // vertical dashed drop line
      ctx.fillStyle = "rgba(255, 60, 80, 0.35)";
      for (let yy = 12; yy < iy - 4; yy += 6) {
        ctx.fillRect(ix - 1, yy, 2, 3);
      }
    }

    for (const h of hazards) {
      const hx = Math.floor(h.x - camX);
      const hy = Math.floor(h.y);
      if (hx > W + 20 || hx < -20) continue;
      if (h.type === "spike") {
        ctx.fillStyle = "#ff4d5f";
        for (let i = 0; i < h.w; i += 3) {
          ctx.fillRect(hx + i, hy, 2, h.h);
          ctx.fillRect(hx + i, hy - 3, 2, 3);
        }
      } else if (h.type === "portal") {
        const pulse = 1 + Math.sin(h.pulse || 0) * 0.2;
        ctx.fillStyle = "#b44dff";
        ctx.fillRect(hx, hy, h.w, h.h);
        ctx.fillStyle = "#ffd24a";
        ctx.fillRect(hx + 2, hy + 2, Math.max(2, h.w - 4), Math.max(2, h.h - 4));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(hx + 4, hy + 4, 2, 2);
        ctx.fillStyle = "rgba(180,77,255,0.4)";
        ctx.fillRect(hx + h.w, hy + 4, Math.floor(8 * pulse), 4);
      } else if (h.type === "walker") {
        ctx.fillStyle = "#ff4fd8";
        ctx.fillRect(hx, hy, h.w, h.h);
        ctx.fillStyle = "#0a1020";
        ctx.fillRect(hx + 2, hy + 3, 2, 2);
        ctx.fillRect(hx + 6, hy + 3, 2, 2);
        const leg = Math.floor(Math.sin(h.anim || 0) * 2);
        ctx.fillStyle = "#ff4fd8";
        ctx.fillRect(hx + 1, hy + h.h, 2, 3 + leg);
        ctx.fillRect(hx + 6, hy + h.h, 2, 3 - leg);
      } else if (h.type === "meteor") {
        ctx.fillStyle = "#ff6b3d";
        ctx.fillRect(hx, hy, h.w, h.h);
        ctx.fillStyle = "#ffd24a";
        ctx.fillRect(hx + 2, hy + 2, 3, 3);
        // fire trail
        ctx.fillStyle = "rgba(255,100,40,0.5)";
        ctx.fillRect(hx + 2, hy - 6, 4, 6);
      }
    }

    if (runner) {
      drawPixelFighter(
        runner.x - camX,
        runner.y,
        runner.facing || 1,
        runner.color,
        runner.accent,
        runner.anim,
        false,
        false
      );
    }

    // controls strip for parkour
    ctx.fillStyle = "rgba(5, 10, 20, 0.72)";
    ctx.fillRect(4, H - 22, W - 8, 18);
    ctx.fillStyle = "#e8f4ff";
    pixelText("A/D YURU  W ZIPLA", 8, H - 16, 1);
    ctx.fillStyle = "#b44dff";
    pixelText("PORTAL=UST YOL", 140, H - 16, 1);

    ctx.fillStyle = "#ffd24a";
    pixelText(`${Math.floor(distance)}m`, 8, 12, 1);
  }

  function drawPixelFighter(x, y, facing, color, accent, t, attackKind, shielded) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const dir = facing >= 0 ? 1 : -1;
    const bob = Math.floor(Math.sin(t) * 1);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(fx - 5, fy, 10, 2);

    const legSwing = attackKind === "kick" ? 4 * dir : Math.floor(Math.sin(t * 2) * 2) * dir;
    ctx.fillStyle = color;
    ctx.fillRect(fx - 3 + (dir < 0 ? 2 : 0), fy - 8 + bob, 3, 8);
    ctx.fillRect(fx + legSwing, fy - 8 + bob, 3, 8);

    ctx.fillStyle = color;
    ctx.fillRect(fx - 4, fy - 16 + bob, 8, 10);
    ctx.fillStyle = accent;
    ctx.fillRect(fx - 2, fy - 14 + bob, 4, 3);

    ctx.fillStyle = accent;
    ctx.fillRect(fx - 3, fy - 22 + bob, 6, 6);
    ctx.fillStyle = "#0a1020";
    ctx.fillRect(fx + (dir > 0 ? 1 : -3), fy - 20 + bob, 2, 2);

    ctx.fillStyle = color;
    if (attackKind === "punch") {
      ctx.fillRect(fx + dir * 5, fy - 14 + bob, dir * 10, 3);
    } else if (attackKind === "kick") {
      ctx.fillRect(fx + dir * 4, fy - 6 + bob, dir * 12, 3);
    } else {
      ctx.fillRect(fx + dir * 4, fy - 14 + bob, 3, 6);
    }

    ctx.fillStyle = "#ff6b3d";
    ctx.fillRect(fx - dir * 5, fy - 14 + bob, 2, 4);

    if (shielded) {
      ctx.fillStyle = "rgba(93,255,154,0.35)";
      ctx.fillRect(fx - 8, fy - 24 + bob, 16, 24);
    }
  }

  /** Tiny 3x5-ish bitmap text (ASCII subset) */
  function pixelText(text, x, y, scale) {
    const s = scale || 1;
    let cx = Math.floor(x);
    const cy = Math.floor(y);
    const str = String(text);
    for (let i = 0; i < str.length; i += 1) {
      const ch = str[i].toUpperCase();
      const glyph = GLYPHS[ch] || GLYPHS["?"];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          if (glyph[row][col] === "1") {
            ctx.fillRect(cx + col * s, cy + row * s, s, s);
          }
        }
      }
      cx += 4 * s;
    }
  }

  const GLYPHS = buildGlyphs();

  function buildGlyphs() {
    const g = {};
    const def = (ch, rows) => {
      g[ch] = rows.map((r) => r.split(""));
    };
    // minimal set
    const map = {
      " ": ["000", "000", "000", "000", "000"],
      A: ["010", "101", "111", "101", "101"],
      B: ["110", "101", "110", "101", "110"],
      C: ["011", "100", "100", "100", "011"],
      D: ["110", "101", "101", "101", "110"],
      E: ["111", "100", "110", "100", "111"],
      F: ["111", "100", "110", "100", "100"],
      G: ["011", "100", "101", "101", "011"],
      H: ["101", "101", "111", "101", "101"],
      I: ["111", "010", "010", "010", "111"],
      J: ["001", "001", "001", "101", "010"],
      K: ["101", "101", "110", "101", "101"],
      L: ["100", "100", "100", "100", "111"],
      M: ["101", "111", "111", "101", "101"],
      N: ["101", "111", "111", "111", "101"],
      O: ["010", "101", "101", "101", "010"],
      P: ["110", "101", "110", "100", "100"],
      Q: ["010", "101", "101", "111", "011"],
      R: ["110", "101", "110", "101", "101"],
      S: ["011", "100", "010", "001", "110"],
      T: ["111", "010", "010", "010", "010"],
      U: ["101", "101", "101", "101", "011"],
      V: ["101", "101", "101", "101", "010"],
      W: ["101", "101", "111", "111", "101"],
      X: ["101", "101", "010", "101", "101"],
      Y: ["101", "101", "010", "010", "010"],
      Z: ["111", "001", "010", "100", "111"],
      "0": ["111", "101", "101", "101", "111"],
      "1": ["010", "110", "010", "010", "111"],
      "2": ["111", "001", "111", "100", "111"],
      "3": ["111", "001", "111", "001", "111"],
      "4": ["101", "101", "111", "001", "001"],
      "5": ["111", "100", "111", "001", "111"],
      "6": ["111", "100", "111", "101", "111"],
      "7": ["111", "001", "010", "010", "010"],
      "8": ["111", "101", "111", "101", "111"],
      "9": ["111", "101", "111", "001", "111"],
      "+": ["000", "010", "111", "010", "000"],
      "-": ["000", "000", "111", "000", "000"],
      ".": ["000", "000", "000", "000", "010"],
      "!": ["010", "010", "010", "000", "010"],
      "?": ["010", "101", "001", "000", "010"],
      "%": ["101", "001", "010", "100", "101"],
      ":": ["000", "010", "000", "010", "000"],
      "/": ["001", "001", "010", "100", "100"],
      "·": ["000", "000", "010", "000", "000"],
    };
    // Turkish-ish fold
    map["Ü"] = map.U;
    map["Ö"] = map.O;
    map["Ş"] = map.S;
    map["İ"] = map.I;
    map["Ğ"] = map.G;
    map["Ç"] = map.C;
    map["I"] = map.I;
    for (const [k, v] of Object.entries(map)) def(k, v);
    def("?", map["?"]);
    return g;
  }

  // expose for debug
  globalThis.SpaceArena = {
    getSave: () => ({ ...save }),
    startFight,
    startParkour,
    showMenu,
  };
})();
