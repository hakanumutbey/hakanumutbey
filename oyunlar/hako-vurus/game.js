(() => {
  const W = 960;
  const H = 540;
  const GROUND = 452;
  const GRAVITY = 2300;
  const BEST_KEY = "hakorocks-hako-vurus-best";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayCard = document.getElementById("overlayCard");
  const hud = document.getElementById("hud");
  const waveLabel = document.getElementById("waveLabel");
  const scoreLabel = document.getElementById("scoreLabel");
  const comboLabel = document.getElementById("comboLabel");
  const hpFill = document.getElementById("hpFill");
  const bestLabel = document.getElementById("bestLabel");

  const keys = new Set();
  const particles = [];
  const floats = [];
  const pickups = [];

  let audio;
  let last = 0;
  let shake = 0;
  let flash = 0;
  let state = "menu";
  let player;
  let enemies = [];
  let spawnQueue = [];
  let spawnTimer = 0;
  let wave = 1;
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let wavePause = 0;
  let specialReady = false;

  bestLabel.textContent = String(best);
  showMenu();
  requestAnimationFrame(loop);

  window.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    const code = event.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      event.preventDefault();
    }
    keys.add(code);
    if (state === "playing") {
      if (code === "Space" || code === "KeyJ") tryAttack();
      if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyK") tryDash();
      if (code === "KeyW" || code === "ArrowUp") tryJump();
    }
    if ((state === "menu" || state === "over") && (code === "Enter" || code === "Space")) {
      startGame();
    }
    if (code === "Escape" && state === "playing") showMenu();
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  overlay.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-act]");
    if (!btn) return;
    if (btn.dataset.act === "start") startGame();
    if (btn.dataset.act === "menu") showMenu();
  });

  function showMenu() {
    state = "menu";
    hud.hidden = true;
    overlay.hidden = false;
    overlayCard.innerHTML = `
      <h2>Hako Vuruş</h2>
      <p>Gece arenasında gölge düşmanları ez. Combo biriktir, 6 vuruşta özel saldırı patlasın.</p>
      <p class="score-line">Rekor: ${best}</p>
      <div class="actions">
        <button class="go" type="button" data-act="start">Dövüşe gir</button>
      </div>
    `;
  }

  function showOver() {
    state = "over";
    hud.hidden = false;
    overlay.hidden = false;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestLabel.textContent = String(best);
    }
    overlayCard.innerHTML = `
      <h2>Yere serildin</h2>
      <p>Dalga ${wave} · Skor ${score}</p>
      <p class="score-line">Rekor: ${best}</p>
      <div class="actions">
        <button class="go" type="button" data-act="start">Tekrar dövüş</button>
        <button class="ghost" type="button" data-act="menu">Menü</button>
      </div>
    `;
  }

  function startGame() {
    state = "playing";
    overlay.hidden = true;
    hud.hidden = false;
    score = 0;
    wave = 1;
    spawnTimer = 0;
    wavePause = 1.1;
    spawnQueue = [];
    enemies = [];
    particles.length = 0;
    floats.length = 0;
    pickups.length = 0;
    shake = 0;
    flash = 0;
    player = {
      x: W / 2 - 18,
      y: GROUND - 58,
      w: 36,
      h: 58,
      vx: 0,
      vy: 0,
      face: 1,
      hp: 100,
      maxHp: 100,
      atk: 0,
      swing: 0,
      atkCd: 0,
      dash: 0,
      dashCd: 0,
      hurt: 0,
      combo: 0,
      comboT: 0,
      smash: false,
    };
    updateHud();
    beep(180, 0.08, "square");
  }

  function tryJump() {
    if (!player || player.dash > 0) return;
    if (player.y + player.h >= GROUND - 0.5) {
      player.vy = -680;
      beep(420, 0.05, "triangle");
    }
  }

  function tryAttack() {
    if (!player || player.atk > 0 || player.atkCd > 0 || player.dash > 0) return;
    player.smash = player.combo >= 6;
    player.swing += 1;
    player.atk = player.smash ? 0.28 : 0.16;
    player.atkCd = player.smash ? 0.42 : 0.22;
    if (player.smash) {
      specialReady = false;
      flash = 0.12;
      shake = 10;
      beep(90, 0.16, "sawtooth");
    } else {
      beep(240, 0.05, "square");
    }
  }

  function tryDash() {
    if (!player || player.dash > 0 || player.dashCd > 0) return;
    player.dash = 0.16;
    player.dashCd = 0.52;
    player.vx = player.face * 820;
    player.hurt = Math.max(player.hurt, 0.16);
    beep(140, 0.07, "triangle");
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    if (state === "playing") update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    shake = Math.max(0, shake - dt * 28);
    flash = Math.max(0, flash - dt);
    spawnTimer += dt;
    if (wavePause > 0) {
      wavePause -= dt;
      if (wavePause <= 0) queueWave(wave);
    }
    while (spawnQueue.length && spawnTimer >= spawnQueue[0].at) {
      spawnEnemy(spawnQueue.shift());
    }

    updatePlayer(dt);
    for (const enemy of enemies) updateEnemy(enemy, dt);
    resolveHits();
    updatePickups(dt);

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floats.length - 1; i >= 0; i -= 1) {
      const f = floats[i];
      f.life -= dt;
      f.y -= 38 * dt;
      if (f.life <= 0) floats.splice(i, 1);
    }

    enemies = enemies.filter((e) => e.hp > 0);
    if (wavePause <= 0 && !spawnQueue.length && !enemies.length) {
      player.hp = Math.min(player.maxHp, player.hp + 10);
      wave += 1;
      wavePause = 1.35;
      score += 40 + wave * 8;
      burst(player.x + player.w / 2, player.y, "#35d2ff", 10);
      beep(520, 0.08, "square");
      updateHud();
    }
    if (player.hp <= 0) showOver();
  }

  function updatePlayer(dt) {
    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    if (player.dash <= 0) {
      player.vx = 0;
      if (left) {
        player.vx = -300;
        player.face = -1;
      }
      if (right) {
        player.vx = 300;
        player.face = 1;
      }
    } else {
      player.dash -= dt;
    }
    player.vy += GRAVITY * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.y + player.h > GROUND) {
      player.y = GROUND - player.h;
      player.vy = 0;
    }
    player.x = clamp(player.x, 16, W - player.w - 16);
    player.atk = Math.max(0, player.atk - dt);
    player.atkCd = Math.max(0, player.atkCd - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.hurt = Math.max(0, player.hurt - dt);
    player.comboT = Math.max(0, player.comboT - dt);
    if (player.comboT <= 0) player.combo = 0;
    specialReady = player.combo >= 6;
    if (player.dash > 0) {
      for (const enemy of enemies) {
        if (overlap(player, enemy) && enemy.dashHit !== wave + enemy.id) {
          hurtEnemy(enemy, 10, player.face * 260, -80);
          enemy.dashHit = wave + enemy.id;
        }
      }
    }
    updateHud();
  }

  function updateEnemy(enemy, dt) {
    enemy.stun = Math.max(0, enemy.stun - dt);
    enemy.wind = Math.max(0, enemy.wind - dt);
    enemy.cool = Math.max(0, enemy.cool - dt);
    if (enemy.stun > 0) {
      enemy.x += enemy.vx * dt;
      enemy.vy += GRAVITY * dt;
      enemy.y += enemy.vy * dt;
      land(enemy);
      enemy.x = clamp(enemy.x, 8, W - enemy.w - 8);
      return;
    }

    const mid = player.x + player.w / 2;
    const emid = enemy.x + enemy.w / 2;
    enemy.face = mid >= emid ? 1 : -1;

    if (enemy.type === "jumper" && enemy.y + enemy.h >= GROUND - 0.5 && Math.random() < dt * 0.9) {
      enemy.vy = -620;
    }
    if (enemy.type === "boss" && enemy.cool <= 0 && Math.abs(mid - emid) < 160) {
      enemy.vy = -520;
      enemy.wind = 0.35;
      enemy.cool = 1.6;
    }

    const reach = enemy.type === "boss" ? 70 : 42;
    if (Math.abs(mid - emid) < reach && enemy.cool <= 0) {
      enemy.wind = enemy.type === "boss" ? 0.28 : 0.2;
      enemy.cool = enemy.type === "boss" ? 1.1 : 0.85;
      enemy.vx = 0;
    } else if (enemy.wind <= 0) {
      enemy.vx = enemy.face * enemy.speed;
    }

    if (enemy.wind > 0 && enemy.wind < 0.04 && overlapGrow(enemy, player, 8)) {
      hurtPlayer(enemy.dmg, enemy.face);
    }

    enemy.vy += GRAVITY * dt;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    land(enemy);
    enemy.x = clamp(enemy.x, 8, W - enemy.w - 8);
  }

  function land(body) {
    if (body.y + body.h > GROUND) {
      body.y = GROUND - body.h;
      body.vy = 0;
    }
  }

  function resolveHits() {
    if (!player || player.atk <= 0) return;
    const wide = player.smash;
    const box = {
      x: player.face > 0 ? player.x + player.w - 6 : player.x - (wide ? 78 : 48),
      y: player.y + (wide ? 4 : 14),
      w: wide ? 84 : 52,
      h: wide ? 54 : 34,
    };
    let hit = false;
    for (const enemy of enemies) {
      if (enemy.hitStamp === player.swing) continue;
      if (!overlap(box, enemy)) continue;
      enemy.hitStamp = player.swing;
      const dmg = wide ? 38 : 14;
      hurtEnemy(enemy, dmg, player.face * (wide ? 480 : 240), wide ? -220 : -120);
      hit = true;
    }
    if (hit) {
      player.combo += 1;
      player.comboT = 1.15;
      score += wide ? 30 : 10 + player.combo;
      shake = wide ? 12 : 5;
      if (player.combo % 4 === 0) dropPickup();
    }
  }

  function hurtEnemy(enemy, dmg, kx, ky) {
    enemy.hp -= dmg;
    enemy.stun = 0.18;
    enemy.vx = kx;
    enemy.vy = ky;
    burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.color, 8);
    floatText(enemy.x, enemy.y, `-${dmg}`, "#ffd166");
    beep(160 + dmg * 4, 0.04, "square");
    if (enemy.hp <= 0) {
      score += enemy.score;
      burst(enemy.x + enemy.w / 2, enemy.y + 10, "#fff", 16);
      if (Math.random() < 0.28) dropPickup(enemy.x, enemy.y);
    }
  }

  function hurtPlayer(dmg, dir) {
    if (player.hurt > 0) return;
    player.hp -= dmg;
    player.hurt = 0.55;
    player.vx = dir * 220;
    player.vy = -180;
    player.combo = 0;
    shake = 8;
    flash = 0.1;
    burst(player.x + 16, player.y + 20, "#ff4d6d", 10);
    beep(80, 0.1, "sawtooth");
  }

  function queueWave(n) {
    spawnTimer = 0;
    spawnQueue = [];
    const count = 3 + Math.floor(n * 1.25);
    for (let i = 0; i < count; i += 1) {
      let type = "grunt";
      if (n >= 2 && i % 3 === 2) type = "runner";
      if (n >= 3 && i % 4 === 1) type = "jumper";
      if (n >= 4 && i % 5 === 0) type = "tank";
      spawnQueue.push({ type, side: i % 2 === 0 ? -1 : 1, at: 0.25 + i * 0.48 });
    }
    if (n % 5 === 0) {
      spawnQueue.push({ type: "boss", side: Math.random() < 0.5 ? -1 : 1, at: 0.8 });
    }
  }

  let enemyId = 1;
  function spawnEnemy(item) {
    const kind = kinds[item.type] || kinds.grunt;
    const w = kind.w;
    const h = kind.h;
    enemies.push({
      id: enemyId++,
      type: item.type,
      x: item.side < 0 ? 20 : W - w - 20,
      y: GROUND - h,
      w,
      h,
      vx: 0,
      vy: 0,
      hp: kind.hp + Math.floor(wave * kind.scale),
      speed: kind.speed,
      dmg: kind.dmg,
      score: kind.score,
      color: kind.color,
      face: item.side < 0 ? 1 : -1,
      stun: 0,
      wind: 0,
      cool: 0.2,
    });
  }

  const kinds = {
    grunt: { w: 34, h: 50, hp: 26, speed: 88, dmg: 8, score: 20, color: "#c46cff", scale: 2 },
    runner: { w: 30, h: 44, hp: 16, speed: 168, dmg: 6, score: 24, color: "#ff9f43", scale: 1 },
    jumper: { w: 32, h: 42, hp: 18, speed: 110, dmg: 7, score: 26, color: "#8fff6a", scale: 2 },
    tank: { w: 48, h: 58, hp: 58, speed: 54, dmg: 12, score: 40, color: "#7f93b0", scale: 4 },
    boss: { w: 72, h: 86, hp: 160, speed: 70, dmg: 16, score: 160, color: "#ff4d6d", scale: 10 },
  };

  function dropPickup(x = player.x, y = player.y - 20) {
    pickups.push({
      x,
      y,
      w: 18,
      h: 18,
      kind: Math.random() < 0.55 ? "heart" : "star",
      life: 8,
    });
  }

  function updatePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i -= 1) {
      const p = pickups[i];
      p.life -= dt;
      p.y = Math.min(GROUND - 22, p.y + 40 * dt);
      if (overlap(p, player)) {
        if (p.kind === "heart") {
          player.hp = Math.min(player.maxHp, player.hp + 18);
          floatText(p.x, p.y, "+CAN", "#8fff6a");
        } else {
          score += 50;
          floatText(p.x, p.y, "+50", "#ffd166");
        }
        beep(640, 0.06, "triangle");
        pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) pickups.splice(i, 1);
    }
  }

  function updateHud() {
    if (!player) return;
    waveLabel.textContent = String(wave);
    scoreLabel.textContent = String(score);
    comboLabel.textContent = player.combo ? `${player.combo}${specialReady ? "!" : ""}` : "0";
    hpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  }

  function draw() {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    drawArena();
    for (const p of pickups) drawPickup(p);
    for (const enemy of enemies) drawFighter(enemy, false);
    if (player && state !== "menu") drawFighter(player, true);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.s, p.s);
      ctx.globalAlpha = 1;
    }
    for (const f of floats) {
      ctx.globalAlpha = Math.max(0, f.life * 1.6);
      ctx.fillStyle = f.color;
      ctx.font = "900 16px Inter, sans-serif";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    if (player && player.combo >= 3 && state === "playing") {
      ctx.fillStyle = "#ffd166";
      ctx.font = "900 28px Inter, sans-serif";
      ctx.fillText(`${player.combo} COMBO`, 36, 86);
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawArena() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#140816");
    sky.addColorStop(0.55, "#0b0d16");
    sky.addColorStop(1, "#1a0c12");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffd9a0";
    ctx.beginPath();
    ctx.arc(780, 88, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#140816";
    ctx.beginPath();
    ctx.arc(792, 82, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0a0710";
    const roofs = [40, 130, 210, 300, 390, 500, 610, 720, 820];
    roofs.forEach((x, i) => {
      const h = 90 + ((i * 47) % 110);
      ctx.fillRect(x, GROUND - h - 40, 70, h + 40);
      ctx.fillStyle = i % 2 ? "rgba(53,210,255,0.12)" : "rgba(255,77,109,0.12)";
      ctx.fillRect(x + 12, GROUND - h, 12, 16);
      ctx.fillRect(x + 36, GROUND - h + 24, 12, 16);
      ctx.fillStyle = "#0a0710";
    });

    ctx.fillStyle = "#161018";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(0, GROUND, W, 4);
    ctx.fillStyle = "rgba(53,210,255,0.35)";
    ctx.fillRect(0, GROUND + 6, W, 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < W; x += 48) ctx.fillRect(x, GROUND + 18, 24, 3);
  }

  function drawFighter(body, isPlayer) {
    const blink = body.hurt > 0 && Math.floor(performance.now() / 60) % 2 === 0;
    if (blink && isPlayer) ctx.globalAlpha = 0.45;
    const x = body.x;
    const y = body.y;
    if (isPlayer && body.atk > 0) {
      ctx.fillStyle = body.smash ? "rgba(255,209,102,0.45)" : "rgba(53,210,255,0.35)";
      const hx = body.face > 0 ? x + body.w - 4 : x - (body.smash ? 70 : 42);
      ctx.fillRect(hx, y + 12, body.smash ? 76 : 46, 28);
    }
    ctx.fillStyle = isPlayer ? "#35d2ff" : body.color;
    ctx.fillRect(x + 6, y + 16, body.w - 12, body.h - 20);
    ctx.fillStyle = isPlayer ? "#102028" : "#140810";
    ctx.fillRect(x + 8, y, body.w - 16, 20);
    ctx.fillStyle = isPlayer ? "#ffd166" : "#fff";
    const eye = body.face > 0 ? x + body.w - 16 : x + 8;
    ctx.fillRect(eye, y + 7, 7, 6);
    if (isPlayer) {
      ctx.fillStyle = "#071012";
      ctx.font = "900 14px Inter, sans-serif";
      ctx.fillText("H", x + body.w / 2 - 6, y + 38);
    } else if (body.type === "boss") {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 8, y - 10, 8, 12);
      ctx.fillRect(x + body.w - 16, y - 10, 8, 12);
    }
    ctx.fillStyle = isPlayer ? "#f7f4ea" : body.color;
    ctx.fillRect(x + 4, y + body.h - 12, 10, 12);
    ctx.fillRect(x + body.w - 14, y + body.h - 12, 10, 12);
    if (body.wind > 0) {
      ctx.strokeStyle = "#ff4d6d";
      ctx.strokeRect(x - 4, y - 4, body.w + 8, body.h + 8);
    }
    if (!isPlayer) {
      const max = (kinds[body.type]?.hp || 26) + wave * (kinds[body.type]?.scale || 1);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(x, y - 8, body.w, 4);
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(x, y - 8, body.w * Math.max(0, body.hp / max), 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawPickup(p) {
    ctx.fillStyle = p.kind === "heart" ? "#ff4d6d" : "#ffd166";
    ctx.fillRect(p.x, p.y, 16, 16);
    ctx.fillStyle = "#140810";
    ctx.font = "900 11px Inter, sans-serif";
    ctx.fillText(p.kind === "heart" ? "+" : "*", p.x + 3, p.y + 12);
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i += 1) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 360,
        vy: -80 - Math.random() * 220,
        s: 3 + Math.random() * 4,
        life: 0.35 + Math.random() * 0.3,
        color,
      });
    }
  }

  function floatText(x, y, text, color) {
    floats.push({ x, y, text, color, life: 0.7 });
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function overlapGrow(a, b, pad) {
    return overlap({ x: a.x - pad, y: a.y - pad, w: a.w + pad * 2, h: a.h + pad * 2 }, b);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function beep(freq, dur, type) {
    try {
      audio = audio || new AudioContext();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = 0.04;
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + dur);
    } catch {}
  }
})();
