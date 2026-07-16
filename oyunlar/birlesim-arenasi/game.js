const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const statusText = document.querySelector("#statusText");
const timeLabel = document.querySelector("#timeLabel");
const teamLabel = document.querySelector("#teamLabel");
const p1Label = document.querySelector("#p1Label");
const p2Label = document.querySelector("#p2Label");

const games = [
  {
    slug: "annenden-kac",
    title: "Annenden Kaç",
    color: "#8fff6a",
    arena: "ev koridoru",
    objective: "anahtar toplama",
    objectName: "anahtar",
    power: "hızlı kaçış",
    rule: "Aksiyon tuşu kısa hız patlaması verir.",
  },
  {
    slug: "bardak",
    title: "Bardak",
    color: "#ffd166",
    arena: "denge masası",
    objective: "bardağı dengede tutma",
    objectName: "parlak bardak",
    power: "kırılgan denge",
    rule: "Sert çarpışma daha fazla puan düşürür, aksiyon tuşu denge kalkanı açar.",
  },
  {
    slug: "essiz-zindan",
    title: "Eşsiz Zindan",
    color: "#b892ff",
    arena: "zindan odası",
    objective: "güç kristali toplama",
    objectName: "zindan kristali",
    power: "kılıç darbesi",
    rule: "Aksiyon tuşu yakındaki tehlikeyi temizler.",
  },
  {
    slug: "skeleton-wars",
    title: "Skeleton Wars",
    color: "#ece7d4",
    arena: "iskelet savaş alanı",
    objective: "kemik sancağı toplama",
    objectName: "savaş sancağı",
    power: "iskelet dalgası",
    rule: "Tehlikeler daha sık gelir, aksiyon tuşu ok atar.",
  },
  {
    slug: "rhgpo",
    title: "RHGPO",
    color: "#35d2ff",
    arena: "liman parkuru",
    objective: "şamandıra toplama",
    objectName: "liman şamandırası",
    power: "rüzgar akıntısı",
    rule: "Arena oyuncuları rüzgar yönüne iter, aksiyon tuşu kısa süre sabitler.",
  },
  {
    slug: "siyah-adam",
    title: "Siyah Adam",
    color: "#ff4d5f",
    arena: "çember toplantısı",
    objective: "şüpheli izi bulma",
    objectName: "gizli iz",
    power: "gölge oylaması",
    rule: "Hareket eden çember bonus verir, aksiyon tuşu gölgeleri uzaklaştırır.",
  },
  {
    slug: "vale",
    title: "Vale",
    color: "#77c7ff",
    arena: "otopark çizgileri",
    objective: "park fişi toplama",
    objectName: "park fişi",
    power: "park alanı bonusu",
    rule: "Yeşil park alanında durunca ekstra takım puanı gelir.",
  },
  {
    slug: "robot-avcisi",
    title: "Robot Avcısı",
    color: "#9cff57",
    arena: "laboratuvar sahası",
    objective: "hurda çekirdeği toplama",
    objectName: "robot hurdası",
    power: "blaster atışı",
    rule: "Aksiyon tuşu uzaktaki tehlikeye ateş eder.",
  },
];

const keys = new Set();
const touch = new Set();
const params = new URLSearchParams(location.search);
const fusion = getFusion();
const players = [
  createPlayer("P1", "#35d2ff", 220, 340),
  createPlayer("P2", "#ffd166", 320, 420),
];
const items = [];
const hazards = [];
const projectiles = [];
const particles = [];
let started = false;
let finished = false;
let lastTime = performance.now();
let timeLeft = 90;
let teamScore = 0;
let spawnTimer = 0;
let hazardTimer = 0;
let sourcePulse = 0;

setupPage();
resetGame();
requestAnimationFrame(loop);

startButton.addEventListener("click", () => {
  if (!started || finished) resetGame();
  started = true;
  finished = false;
  markFusionPlayed();
  setStatus("Birleşim başladı: iki oyunun özellikleri aynı arenada.");
});

restartButton.addEventListener("click", () => {
  resetGame();
  started = true;
  markFusionPlayed();
  setStatus("Yeni tur başladı.");
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

document.querySelectorAll("[data-touch]").forEach((button) => {
  const name = button.dataset.touch;
  const down = (event) => {
    event.preventDefault();
    touch.add(name);
  };
  const up = (event) => {
    event.preventDefault();
    touch.delete(name);
  };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("pointerleave", up);
});

function setupPage() {
  document.querySelector("#fusionTitle").textContent = `${fusion.base.title} + ${fusion.source.title}`;
  document.querySelector("#fusionSummary").textContent =
    `${fusion.base.title} oyunundan ${fusion.base.objective}, ${fusion.source.title} oyunundan ${fusion.source.power} alındı.`;
  document.querySelector("#baseFeature").textContent = `${fusion.base.title}: ${fusion.base.objective}`;
  document.querySelector("#baseDescription").textContent =
    `Arena ${fusion.base.arena}; toplanacak hedef ${fusion.base.objectName}.`;
  document.querySelector("#sourceFeature").textContent = `${fusion.source.title}: ${fusion.source.power}`;
  document.querySelector("#sourceDescription").textContent = fusion.source.rule;
}

function resetGame() {
  players[0].x = 220;
  players[0].y = 340;
  players[1].x = 320;
  players[1].y = 420;
  players.forEach((player) => {
    player.vx = 0;
    player.vy = 0;
    player.score = 0;
    player.cooldown = 0;
    player.shield = 0;
    player.parkTimer = 0;
  });
  items.length = 0;
  hazards.length = 0;
  projectiles.length = 0;
  particles.length = 0;
  started = false;
  finished = false;
  timeLeft = 90;
  teamScore = 0;
  spawnTimer = 0;
  hazardTimer = 0;
  sourcePulse = 0;
  for (let index = 0; index < 8; index += 1) spawnItem();
  for (let index = 0; index < 4; index += 1) spawnHazard();
  setStatus("Hazır. Tek arenada iki oyunun özellikleri birleşti.");
  updateLabels();
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  if (started && !finished) update(dt);
  draw(dt);
  requestAnimationFrame(loop);
}

function update(dt) {
  timeLeft = Math.max(0, timeLeft - dt);
  spawnTimer -= dt;
  hazardTimer -= dt;
  sourcePulse += dt;

  pollGamepads();
  players.forEach((player, index) => updatePlayer(player, index, dt));
  updateItems();
  updateHazards(dt);
  updateProjectiles(dt);
  applySourceWorld(dt);

  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = 1.1;
  }
  if (hazardTimer <= 0) {
    spawnHazard();
    hazardTimer = fusion.source.slug === "skeleton-wars" ? 1.35 : 2.2;
  }

  if (teamScore >= 24) finishGame("Kazandın. İki oyunun birleşim hedefi tamamlandı.");
  if (timeLeft <= 0) finishGame(teamScore >= 14 ? "Süre bitti ama turnuva puanı iyi." : "Süre bitti. Tekrar dene.");
  updateLabels();
}

function updatePlayer(player, index, dt) {
  const input = getInput(index);
  const speed = input.action && fusion.source.slug === "annenden-kac" ? 420 : 280;
  player.vx += input.x * speed * 5 * dt;
  player.vy += input.y * speed * 5 * dt;

  if (fusion.source.slug === "rhgpo" && player.shield <= 0) {
    player.vx += Math.cos(sourcePulse * 0.9) * 32 * dt;
    player.vy += Math.sin(sourcePulse * 0.7) * 26 * dt;
  }

  player.vx *= 0.84;
  player.vy *= 0.84;
  player.x = clamp(player.x + player.vx * dt, 28, canvas.width - 28);
  player.y = clamp(player.y + player.vy * dt, 96, canvas.height - 42);
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.shield = Math.max(0, player.shield - dt);

  if (input.action && player.cooldown <= 0) {
    usePower(player);
    player.cooldown = 0.62;
  }
}

function updateItems() {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    item.pulse += 0.05;
    const collector = players.find((player) => distance(player, item) < player.radius + item.radius);
    if (!collector) continue;
    collector.score += item.value;
    teamScore += item.value;
    burst(item.x, item.y, fusion.base.color, 8);
    items.splice(index, 1);
    spawnItem();
    setStatus(`${collector.name} ${fusion.base.objectName} aldı.`);
  }
}

function updateHazards(dt) {
  const leader = players[0].score >= players[1].score ? players[0] : players[1];
  for (let index = hazards.length - 1; index >= 0; index -= 1) {
    const hazard = hazards[index];
    const target = fusion.source.slug === "annenden-kac" ? leader : nearestPlayer(hazard);
    const dx = target.x - hazard.x;
    const dy = target.y - hazard.y;
    const length = Math.hypot(dx, dy) || 1;
    const speed = hazard.speed * (fusion.source.slug === "skeleton-wars" ? 1.16 : 1);
    hazard.vx += (dx / length) * speed * dt;
    hazard.vy += (dy / length) * speed * dt;
    hazard.vx *= 0.96;
    hazard.vy *= 0.96;
    hazard.x += hazard.vx * dt;
    hazard.y += hazard.vy * dt;

    for (const player of players) {
      if (distance(player, hazard) >= player.radius + hazard.radius) continue;
      hitPlayer(player, hazard);
      hazards.splice(index, 1);
      spawnHazard();
      break;
    }
  }
}

function updateProjectiles(dt) {
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const shot = projectiles[index];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    const hitIndex = hazards.findIndex((hazard) => distance(shot, hazard) < shot.radius + hazard.radius);
    if (hitIndex >= 0) {
      const [hazard] = hazards.splice(hitIndex, 1);
      burst(hazard.x, hazard.y, fusion.source.color, 10);
      teamScore += 1;
      projectiles.splice(index, 1);
      continue;
    }
    if (shot.life <= 0 || shot.x < 0 || shot.x > canvas.width || shot.y < 0 || shot.y > canvas.height) {
      projectiles.splice(index, 1);
    }
  }
}

function applySourceWorld(dt) {
  if (fusion.source.slug === "vale") {
    const zone = parkingZone();
    for (const player of players) {
      if (player.x > zone.x && player.x < zone.x + zone.w && player.y > zone.y && player.y < zone.y + zone.h) {
        player.parkTimer += dt;
        if (player.parkTimer > 1.1) {
          player.score += 1;
          teamScore += 1;
          player.parkTimer = 0;
          setStatus(`${player.name} park alanı bonusu aldı.`);
        }
      } else {
        player.parkTimer = 0;
      }
    }
  }

  if (fusion.source.slug === "siyah-adam") {
    const zone = shadowZone();
    for (const player of players) {
      if (distance(player, zone) < zone.radius) {
        player.score += 0.035;
        teamScore += 0.035;
      }
    }
  }
}

function usePower(player) {
  if (fusion.source.slug === "essiz-zindan") {
    slash(player, 92);
    setStatus(`${player.name} zindan kılıcı kullandı.`);
    return;
  }
  if (fusion.source.slug === "robot-avcisi" || fusion.source.slug === "skeleton-wars") {
    shoot(player);
    setStatus(`${player.name} uzaktan atış yaptı.`);
    return;
  }
  if (fusion.source.slug === "rhgpo" || fusion.source.slug === "bardak") {
    player.shield = 1.2;
    setStatus(`${player.name} denge kalkanı açtı.`);
    return;
  }
  if (fusion.source.slug === "siyah-adam") {
    hazards.forEach((hazard) => {
      if (distance(player, hazard) < 140) {
        hazard.vx *= -1.4;
        hazard.vy *= -1.4;
      }
    });
    setStatus(`${player.name} gölge taraması yaptı.`);
    return;
  }
  player.vx *= 2.4;
  player.vy *= 2.4;
  burst(player.x, player.y, player.color, 7);
  setStatus(`${player.name} hızlı kaçış yaptı.`);
}

function hitPlayer(player, hazard) {
  if (player.shield > 0) {
    burst(hazard.x, hazard.y, player.color, 9);
    return;
  }
  const penalty = fusion.source.slug === "bardak" ? 2 : 1;
  player.score = Math.max(0, player.score - penalty);
  teamScore = Math.max(0, teamScore - penalty);
  player.vx *= -1.8;
  player.vy *= -1.8;
  burst(player.x, player.y, "#ff4d5f", 12);
  setStatus(`${fusion.source.power}: ${player.name} puan kaybetti.`);
}

function finishGame(message) {
  finished = true;
  started = false;
  markFusionPlayed();
  setStatus(message);
}

function draw(dt) {
  drawBackground();
  drawSourceZones();
  items.forEach(drawItem);
  projectiles.forEach(drawProjectile);
  hazards.forEach(drawHazard);
  players.forEach(drawPlayer);
  updateParticles(dt);
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0b1117");
  gradient.addColorStop(0.5, mixColor(fusion.base.color, "#0b1117", 0.78));
  gradient.addColorStop(1, mixColor(fusion.source.color, "#0b1117", 0.78));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 90);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 120; y < canvas.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "900 28px system-ui";
  ctx.fillText(fusion.base.arena, 28, 58);
  ctx.fillStyle = fusion.source.color;
  ctx.font = "800 18px system-ui";
  ctx.fillText(fusion.source.power, 30, 84);
}

function drawSourceZones() {
  if (fusion.source.slug === "vale") {
    const zone = parkingZone();
    ctx.fillStyle = "rgba(143,255,106,0.16)";
    ctx.strokeStyle = "rgba(143,255,106,0.65)";
    ctx.lineWidth = 3;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    ctx.fillStyle = "#8fff6a";
    ctx.font = "900 18px system-ui";
    ctx.fillText("PARK BONUS", zone.x + 18, zone.y + 38);
  }

  if (fusion.source.slug === "siyah-adam") {
    const zone = shadowZone();
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,77,95,0.13)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,77,95,0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  if (fusion.source.slug === "rhgpo") {
    ctx.strokeStyle = "rgba(53,210,255,0.34)";
    ctx.lineWidth = 5;
    for (let y = 170; y < canvas.height; y += 120) {
      ctx.beginPath();
      ctx.moveTo(40, y + Math.sin(sourcePulse + y) * 8);
      ctx.lineTo(canvas.width - 40, y + Math.cos(sourcePulse + y) * 8);
      ctx.stroke();
    }
  }
}

function drawItem(item) {
  const radius = item.radius + Math.sin(item.pulse) * 2;
  ctx.beginPath();
  ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fusion.base.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.74)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawHazard(hazard) {
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  ctx.rotate(sourcePulse);
  ctx.fillStyle = fusion.source.color;
  ctx.strokeStyle = "rgba(0,0,0,0.42)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    const radius = i % 2 ? hazard.radius * 0.72 : hazard.radius;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawProjectile(shot) {
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f7f4ea";
  ctx.fill();
}

function drawPlayer(player) {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + (player.shield > 0 ? 7 : 0), 0, Math.PI * 2);
  ctx.fillStyle = player.shield > 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = player.color;
  ctx.fill();
  ctx.fillStyle = "#071012";
  ctx.font = "900 16px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(player.name, player.x, player.y);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function updateParticles(dt) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 4, 4);
    ctx.globalAlpha = 1;
    if (particle.life <= 0) particles.splice(index, 1);
  }
}

function getInput(index) {
  const prefix = index === 0 ? "p1" : "p2";
  const keyboard = index === 0
    ? {
        up: keys.has("KeyW"),
        down: keys.has("KeyS"),
        left: keys.has("KeyA"),
        right: keys.has("KeyD"),
        action: keys.has("Space"),
      }
    : {
        up: keys.has("ArrowUp"),
        down: keys.has("ArrowDown"),
        left: keys.has("ArrowLeft"),
        right: keys.has("ArrowRight"),
        action: keys.has("Enter"),
      };
  const x = Number(keyboard.right || touch.has(`${prefix}-right`)) - Number(keyboard.left || touch.has(`${prefix}-left`));
  const y = Number(keyboard.down || touch.has(`${prefix}-down`)) - Number(keyboard.up || touch.has(`${prefix}-up`));
  return {
    x,
    y,
    action: keyboard.action || touch.has(`${prefix}-action`),
  };
}

function pollGamepads() {
  const pads = navigator.getGamepads?.() || [];
  players.forEach((player, index) => {
    const pad = pads[index];
    if (!pad) return;
    const x = axis(pad.axes[0]) + buttonAxis(pad.buttons[15], pad.buttons[14]);
    const y = axis(pad.axes[1]) + buttonAxis(pad.buttons[13], pad.buttons[12]);
    player.vx += x * 60;
    player.vy += y * 60;
    if (pad.buttons[0]?.pressed && player.cooldown <= 0) {
      usePower(player);
      player.cooldown = 0.62;
    }
  });
}

function axis(value = 0) {
  return Math.abs(value) > 0.16 ? value : 0;
}

function buttonAxis(positive, negative) {
  return Number(positive?.pressed) - Number(negative?.pressed);
}

function createPlayer(name, color, x, y) {
  return { name, color, x, y, vx: 0, vy: 0, radius: 24, score: 0, cooldown: 0, shield: 0, parkTimer: 0 };
}

function spawnItem() {
  items.push({
    x: random(55, canvas.width - 55),
    y: random(128, canvas.height - 55),
    radius: random(12, 18),
    value: 1,
    pulse: random(0, Math.PI * 2),
  });
}

function spawnHazard() {
  const side = Math.floor(Math.random() * 4);
  const positions = [
    { x: -20, y: random(130, canvas.height - 40) },
    { x: canvas.width + 20, y: random(130, canvas.height - 40) },
    { x: random(40, canvas.width - 40), y: 92 },
    { x: random(40, canvas.width - 40), y: canvas.height + 20 },
  ];
  hazards.push({
    ...positions[side],
    vx: random(-30, 30),
    vy: random(-30, 30),
    radius: random(18, 28),
    speed: random(42, 76),
  });
}

function slash(player, radius) {
  for (let index = hazards.length - 1; index >= 0; index -= 1) {
    const hazard = hazards[index];
    if (distance(player, hazard) < radius) {
      hazards.splice(index, 1);
      teamScore += 1;
      burst(hazard.x, hazard.y, fusion.source.color, 10);
    }
  }
}

function shoot(player) {
  const target = nearestHazard(player);
  const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.vy, player.vx || 1);
  projectiles.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * 520,
    vy: Math.sin(angle) * 520,
    radius: 7,
    life: 1.2,
  });
}

function burst(x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(60, 180);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: random(0.28, 0.9),
    });
  }
}

function nearestPlayer(point) {
  return players.reduce((best, player) => (distance(point, player) < distance(point, best) ? player : best), players[0]);
}

function nearestHazard(point) {
  return hazards.reduce((best, hazard) => (!best || distance(point, hazard) < distance(point, best) ? hazard : best), null);
}

function parkingZone() {
  return { x: canvas.width - 250, y: canvas.height - 180, w: 180, h: 94 };
}

function shadowZone() {
  return {
    x: canvas.width / 2 + Math.cos(sourcePulse * 0.8) * 240,
    y: canvas.height / 2 + Math.sin(sourcePulse * 0.7) * 160,
    radius: 62,
  };
}

function updateLabels() {
  timeLabel.textContent = Math.ceil(timeLeft);
  teamLabel.textContent = Math.floor(teamScore);
  p1Label.textContent = Math.floor(players[0].score);
  p2Label.textContent = Math.floor(players[1].score);
}

function setStatus(message) {
  statusText.textContent = message;
}

function markFusionPlayed() {
  const detail = { baseSlug: fusion.base.slug, sourceSlug: fusion.source.slug };
  window.__hakorocksFusionPlayed = detail;
  window.dispatchEvent(new CustomEvent("hakorocks:fusion-played", { detail }));
}

function getFusion() {
  const forcedBase = games.find((game) => game.slug === params.get("base"));
  const forcedSource = games.find((game) => game.slug === params.get("source"));
  if (forcedBase && forcedSource && forcedBase.slug !== forcedSource.slug) {
    return { base: forcedBase, source: forcedSource };
  }
  const dayKey = todayKey();
  const baseIndex = hashString(`${dayKey}:base`) % games.length;
  let sourceIndex = hashString(`${dayKey}:source`) % (games.length - 1);
  if (sourceIndex >= baseIndex) sourceIndex += 1;
  return { base: games[baseIndex], source: games[sourceIndex] };
}

function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mixColor(hex, base, amount) {
  const a = parseColor(hex);
  const b = parseColor(base);
  const mixed = a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function parseColor(hex) {
  const clean = hex.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(clean.slice(index, index + 2), 16));
}
