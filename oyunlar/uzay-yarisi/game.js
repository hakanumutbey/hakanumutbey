(() => {
  const W = 960;
  const H = 540;
  const SAVE_KEY = "hakorocks-uzay-yarisi-save-v2";
  const MAX_LEVEL = 100;
  const DAILY_TARGET = 25;
  const DAILY_REWARD = 100;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hud = document.getElementById("hud");
  const levelLabel = document.getElementById("levelLabel");
  const livesLabel = document.getElementById("livesLabel");
  const starLabel = document.getElementById("starLabel");

  const SHIPS = [
    { id: "s1", name: "Başlangıç", price: 0, body: "#dfe8ff", wing: "#ff4d6d", glass: "#35d2ff", trail: "#35d2ff", span: 1, power: "Güçsüz ama sadık" },
    { id: "s2", name: "Kırmızı Şimşek", price: 150, body: "#ff5a4d", wing: "#7a1010", glass: "#ffd166", trail: "#ff8a4d", span: 1.05, power: "Turbo %30 az yakıt yakar" },
    { id: "s3", name: "Mavi Yıldız", price: 300, body: "#4da6ff", wing: "#0a2a6a", glass: "#dff4ff", trail: "#35d2ff", span: 1.1, power: "Yıldızlar +1 coin verir" },
    { id: "s4", name: "Zümrüt", price: 550, body: "#3ddc84", wing: "#0a4a2a", glass: "#e8fff2", trail: "#8fff6a", span: 1.1, power: "Kalkan +2 sn sürer" },
    { id: "s5", name: "Turuncu Fırtına", price: 850, body: "#ff9f43", wing: "#6a3a08", glass: "#fff2d9", trail: "#ffd166", span: 1.18, power: "+1 can ile başlar" },
    { id: "s6", name: "Mor Hayalet", price: 1200, body: "#c46cff", wing: "#3a0a5a", glass: "#f2d9ff", trail: "#ff4dff", span: 1.2, power: "Turbo %30 az yakıt yakar" },
    { id: "s7", name: "Altın Kartal", price: 1700, body: "#ffd166", wing: "#7a4a00", glass: "#fffbe8", trail: "#ffd166", span: 1.28, power: "Bölüm ödülü %25 fazla" },
    { id: "s8", name: "Gece Avcısı", price: 2400, body: "#2a2430", wing: "#0c0a10", glass: "#ff4d6d", trail: "#ff4d6d", span: 1.3, power: "Çarpma koruması 2 kat sürer" },
    { id: "s9", name: "Gümüş Ok", price: 3400, body: "#c8d4e8", wing: "#4a5a70", glass: "#35d2ff", trail: "#dff4ff", span: 1.38, power: "Mıknatıs: yıldızları çeker" },
    { id: "s10", name: "Efsane Nova", price: 5000, body: "#ff4dff", wing: "#12083a", glass: "#8fff6a", trail: "#ff4dff", span: 1.45, power: "Kalkanla başlar, ödül %50 fazla" },
  ];

  const UPGRADES = [
    { id: "life", name: "Ekstra Can", desc: "Her bölüme +1 canla başla", prices: [400, 900] },
    { id: "tank", name: "Yakıt Deposu", desc: "Maksimum yakıt +50", prices: [250, 500, 900] },
    { id: "magnet", name: "Mıknatıs", desc: "Yıldızlar sana çekilir", prices: [350, 750] },
    { id: "shield", name: "Kalkan Süresi", desc: "Kalkan +2 sn daha sürer", prices: [300, 700] },
    { id: "luck", name: "Şanslı Yıldız", desc: "Her yıldız +1 coin daha verir", prices: [450, 950] },
  ];

  const WEAPONS = [
    { id: "laser", name: "Meteor Kırıcı", desc: "J veya Boşluk: lazer at, meteorları parçala (+2 coin)", price: 2000 },
    { id: "bomb", name: "Süper Bomba", desc: "B: ekrandaki TÜM meteorları patlatır · 12 sn şarj", price: 3500 },
  ];

  const keys = new Set();
  const particles = [];
  const floats = [];
  const asteroids = [];
  const pickups = [];
  const bolts = [];
  const rings = [];
  const bgStars = [];
  let uiButtons = [];

  let audio;
  let last = 0;
  let shake = 0;
  let flash = 0;
  let state = "lobby";
  let lobbyTab = "garaj";
  let shopTab = "upg";
  let player = null;
  let boss = null;
  let bossDone = false;
  let shootCd = 0;
  let bombCd = 0;
  let level = 1;
  let params = levelParams(1);
  let theme = themeFor(1);
  let distance = 0;
  let starCount = 0;
  let runCoins = 0;
  let noDamage = true;
  let spawnT = 0;
  let starT = 0;
  let heartT = 0;
  let shieldT = 0;
  let fuelT = 0;
  let bannerT = 0;
  let bannerSub = "";
  let launchT = 0;
  let lastReward = 0;
  let lobbyIndex = 0;
  let codeInput = "";

  for (let i = 0; i < 90; i += 1) {
    bgStars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 1 + Math.random() * 2,
      v: 20 + Math.random() * 70,
    });
  }

  let save = loadSave();
  lobbyIndex = Math.max(0, SHIPS.findIndex((ship) => ship.id === save.ship));
  checkDaily();
  showLobby();
  requestAnimationFrame(loop);

  window.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    const code = event.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
    keys.add(code);
    if (code === "Enter" || code === "Space") {
      if (state === "lobby") {
        if (lobbyTab === "kod") {
          if (code === "Enter") redeemCode();
        } else startLaunch();
      } else if (state === "launch") startLevel();
      else if (state === "over") startLaunch();
      else if (state === "clear") startLaunch();
      else if (state === "pause") resumeGame();
    }
    if (code === "Escape") {
      if (state === "playing") pauseGame();
      else if (state === "pause") resumeGame();
    }
    if (state === "playing") {
      if (code === "KeyJ" || code === "Space") tryShoot();
      if (code === "KeyB" || code === "KeyE") tryBomb();
    }
    if (state === "lobby" && lobbyTab === "garaj") {
      if (code === "ArrowLeft" || code === "KeyA") browseShip(-1);
      if (code === "ArrowRight" || code === "KeyD") browseShip(1);
    }
    if (state === "lobby" && lobbyTab === "kod") {
      if (code === "Backspace") codeInput = codeInput.slice(0, -1);
      else if (event.key && /^[a-zA-Z0-9]$/.test(event.key) && codeInput.length < 12) codeInput += event.key.toLowerCase();
    }
  });

  window.addEventListener("keyup", (event) => keys.delete(event.code));

  canvas.addEventListener("pointerdown", (event) => {
    const p = canvasPoint(event);
    if (state === "launch") {
      startLevel();
      return;
    }
    for (const btn of uiButtons) {
      if (p.x >= btn.x && p.x <= btn.x + btn.w && p.y >= btn.y && p.y <= btn.y + btn.h) {
        handleAction(btn.act);
        return;
      }
    }
  });

  function handleAction(act) {
    if (act === "prev") browseShip(-1);
    if (act === "next") browseShip(1);
    if (act === "buy") buyOrSelect();
    if (act === "play") startLaunch();
    if (act === "resume") resumeGame();
    if (act === "lobi") showLobby();
    if (act === "retry") startLaunch();
    if (act === "tab-garaj") {
      lobbyTab = "garaj";
      beep(340, 0.04, "triangle");
    }
    if (act === "tab-shop") {
      lobbyTab = "shop";
      beep(340, 0.04, "triangle");
    }
    if (act === "tab-kod") {
      lobbyTab = "kod";
      beep(340, 0.04, "triangle");
    }
    if (act.startsWith("upg:")) buyUpgrade(act.slice(4));
    if (act.startsWith("wpn:")) buyWeapon(act.slice(4));
    if (act === "shoptab-upg") {
      shopTab = "upg";
      beep(340, 0.04, "triangle");
    }
    if (act === "shoptab-wpn") {
      shopTab = "wpn";
      beep(340, 0.04, "triangle");
    }
  }

  function loadSave() {
    const blank = {
      coins: 0,
      nextLevel: 1,
      owned: ["s1"],
      ship: "s1",
      totalStars: 0,
      upgrades: {},
      weapons: [],
      codesUsed: [],
      daily: { day: "", stars: 0, done: false },
    };
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!raw || typeof raw !== "object") return blank;
      return {
        ...blank,
        ...raw,
        owned: Array.isArray(raw.owned) && raw.owned.length ? raw.owned : ["s1"],
        upgrades: raw.upgrades && typeof raw.upgrades === "object" ? raw.upgrades : {},
        weapons: Array.isArray(raw.weapons) ? raw.weapons : [],
        codesUsed: Array.isArray(raw.codesUsed) ? raw.codesUsed : [],
        daily: raw.daily && typeof raw.daily === "object" ? raw.daily : blank.daily,
      };
    } catch {
      return blank;
    }
  }

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {}
  }

  function dayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function checkDaily() {
    if (save.daily.day !== dayKey()) {
      save.daily = { day: dayKey(), stars: 0, done: false };
      persist();
    }
  }

  function shipById(id) {
    return SHIPS.find((ship) => ship.id === id) || SHIPS[0];
  }

  function currentShip() {
    return shipById(save.ship);
  }

  function upgLevel(id) {
    return Number(save.upgrades[id] || 0);
  }

  function levelParams(n) {
    return {
      target: 700 + n * 250,
      speed: Math.min(780, 160 + n * 6),
      spawn: Math.max(0.2, 0.85 - n * 0.0065),
      doubleChance: Math.min(0.55, Math.max(0, (n - 6) * 0.012)),
      alienChance: n >= 5 ? Math.min(0.22, 0.1 + n * 0.001) : 0,
      isBoss: n % 10 === 0,
    };
  }

  function themeFor(n) {
    if (n <= 25) return { top: "#0a0e20", bot: "#04060e", rock: ["#8a7f78", "#6a615c"], name: "Derin Uzay" };
    if (n <= 50) return { top: "#220a0c", bot: "#0e0405", rock: ["#9a6a5c", "#7a4a40"], name: "Kızıl Dev Bölgesi" };
    if (n <= 75) return { top: "#0a1826", bot: "#040a12", rock: ["#7a95a8", "#5a7588"], name: "Buz Kuşağı" };
    return { top: "#1e0a26", bot: "#0e0414", rock: ["#b09a6a", "#8a7a52"], name: "Nova Bölgesi" };
  }

  function fuelDrainMult() {
    return save.ship === "s2" || save.ship === "s6" ? 0.7 : 1;
  }

  function starCoinValue() {
    return (2 + upgLevel("luck") + (save.ship === "s3" ? 1 : 0));
  }

  function shieldDuration() {
    return 5 + upgLevel("shield") * 2 + (save.ship === "s4" ? 2 : 0);
  }

  function startLives() {
    return Math.min(6, 3 + upgLevel("life") + (save.ship === "s5" ? 1 : 0));
  }

  function hurtDuration() {
    return save.ship === "s8" ? 2.6 : 1.4;
  }

  function magnetRadius() {
    const base = save.ship === "s9" ? 90 : 0;
    return base + upgLevel("magnet") * 70;
  }

  function rewardMult() {
    if (save.ship === "s10") return 1.5;
    if (save.ship === "s7") return 1.25;
    return 1;
  }

  function maxFuel() {
    return 100 + upgLevel("tank") * 50;
  }

  function browseShip(dir) {
    lobbyIndex = (lobbyIndex + dir + SHIPS.length) % SHIPS.length;
    beep(340, 0.04, "triangle");
  }

  function buyOrSelect() {
    const ship = SHIPS[lobbyIndex];
    if (save.owned.includes(ship.id)) {
      save.ship = ship.id;
      persist();
      beep(560, 0.07, "triangle");
      return;
    }
    if (save.coins < ship.price) {
      floatText(W / 2 - 60, 380, "Coin yetmiyor", "#ff4d6d");
      sfxFail();
      return;
    }
    save.coins -= ship.price;
    save.owned.push(ship.id);
    save.ship = ship.id;
    persist();
    burst(W / 2, 250, "#ffd166", 24);
    sfxCoin();
  }

  function buyUpgrade(id) {
    const upg = UPGRADES.find((item) => item.id === id);
    if (!upg) return;
    const lvl = upgLevel(id);
    if (lvl >= upg.prices.length) return;
    const price = upg.prices[lvl];
    if (save.coins < price) {
      floatText(W / 2 - 60, 100, "Coin yetmiyor", "#ff4d6d");
      sfxFail();
      return;
    }
    save.coins -= price;
    save.upgrades[id] = lvl + 1;
    persist();
    burst(W / 2, 240, "#8fff6a", 20);
    sfxCoin();
  }

  function ownsWeapon(id) {
    return save.weapons.includes(id);
  }

  function buyWeapon(id) {
    const weapon = WEAPONS.find((item) => item.id === id);
    if (!weapon || ownsWeapon(id)) return;
    if (save.coins < weapon.price) {
      floatText(W / 2 - 60, 100, "Coin yetmiyor", "#ff4d6d");
      sfxFail();
      return;
    }
    save.coins -= weapon.price;
    save.weapons.push(id);
    persist();
    burst(W / 2, 240, "#ff4dff", 26);
    sfxFanfare();
  }

  function tryShoot() {
    if (!ownsWeapon("laser") || !player) return;
    if (shootCd > 0) return;
    shootCd = 0.3;
    bolts.push({ x: player.x + player.w / 2 - 2, y: player.y - 12, w: 4, h: 14, vy: -760 });
    beep(980, 0.05, "square", 0.035);
  }

  function tryBomb() {
    if (!player) return;
    if (!ownsWeapon("bomb")) return;
    if (bombCd > 0) {
      floatText(player.x - 20, player.y - 20, `Bomba şarj oluyor: ${Math.ceil(bombCd)} sn`, "#a8b4c8");
      return;
    }
    bombCd = 12;
    flash = 0.35;
    shake = 16;
    rings.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, r: 20, life: 0.5 });
    let gained = 0;
    for (const rock of asteroids) {
      burst(rock.x + rock.w / 2, rock.y + rock.h / 2, rock.alien ? "#c46cff" : "#ffd166", 8);
      gained += rock.alien ? 8 : 2;
    }
    asteroids.length = 0;
    runCoins += gained;
    floatText(player.x - 30, player.y - 26, `SÜPER BOMBA! +${gained} coin`, "#ffd166");
    noise(0.5, 0.12);
    beep(55, 0.4, "sawtooth", 0.08);
  }

  function redeemCode() {
    const code = codeInput.trim().toLowerCase();
    if (!code) return;
    codeInput = "";
    if (save.codesUsed.includes(code)) {
      floatText(W / 2 - 80, 300, "Bu kod zaten kullanıldı", "#ff4d6d");
      sfxFail();
      return;
    }
    const rewards = {
      koinat42: () => {
        save.coins += 2000;
        return "+2000 coin";
      },
      hazinex77: () => {
        save.coins += 10000;
        return "+10000 coin";
      },
      isin9k: () => {
        if (!save.weapons.includes("laser")) save.weapons.push("laser");
        return "Meteor Kırıcı açıldı";
      },
      mega3patla: () => {
        if (!save.weapons.includes("bomb")) save.weapons.push("bomb");
        return "Süper Bomba açıldı";
      },
      garaj6full: () => {
        save.owned = SHIPS.map((ship) => ship.id);
        return "Tüm araçlar garajda";
      },
    };
    const grant = rewards[code];
    if (!grant) {
      floatText(W / 2 - 60, 300, "Geçersiz kod", "#ff4d6d");
      sfxFail();
      return;
    }
    const message = grant();
    save.codesUsed.push(code);
    persist();
    burst(W / 2, 260, "#ffd166", 30);
    floatText(W / 2 - 110, 300, `KOD KABUL: ${message}`, "#8fff6a");
    sfxFanfare();
  }

  function drawKod() {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "900 26px Inter, sans-serif";
    ctx.fillText("Gizli Kod Ekranı", W / 2, 150);
    ctx.fillStyle = "#a8b4c8";
    ctx.font = "700 14px Inter, sans-serif";
    ctx.fillText("Kodu yaz, Enter'a bas. Backspace siler.", W / 2, 180);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.strokeStyle = "rgba(53,210,255,0.45)";
    ctx.lineWidth = 2;
    roundRect(W / 2 - 200, 210, 400, 64, 12);
    ctx.fill();
    ctx.stroke();

    const cursor = Math.floor(performance.now() / 500) % 2 === 0 ? "_" : "";
    ctx.fillStyle = "#ffd166";
    ctx.font = "900 28px Inter, sans-serif";
    ctx.fillText((codeInput + cursor).toUpperCase() || cursor, W / 2, 252);

    ctx.fillStyle = "#a8b4c8";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillText("Kodlar gizlidir... geliştirici bilir 😉", W / 2, 320);
    ctx.textAlign = "left";
  }

  function showLobby() {
    state = "lobby";
    hud.hidden = true;
    theme = themeFor(Math.min(save.nextLevel, MAX_LEVEL));
    lobbyIndex = Math.max(0, SHIPS.findIndex((ship) => ship.id === save.ship));
    boss = null;
    particles.length = 0;
    asteroids.length = 0;
    pickups.length = 0;
  }

  function startLaunch() {
    state = "launch";
    launchT = 3.4;
    hud.hidden = true;
    flash = 0;
    particles.length = 0;
    sfxLaunch();
  }

  function startLevel() {
    state = "playing";
    level = Math.min(save.nextLevel, MAX_LEVEL);
    params = levelParams(level);
    theme = themeFor(level);
    distance = 0;
    starCount = 0;
    runCoins = 0;
    noDamage = true;
    shake = 0;
    flash = 0;
    bannerT = 2;
    bannerSub = params.isBoss ? "BOSS BÖLÜMÜ — dikkat!" : `${theme.name} · hedefe ulaş!`;
    spawnT = 1;
    starT = 1.6;
    heartT = 8;
    shieldT = 13;
    fuelT = 5;
    boss = null;
    bossDone = false;
    shootCd = 0;
    bombCd = 0;
    bolts.length = 0;
    rings.length = 0;
    asteroids.length = 0;
    pickups.length = 0;
    floats.length = 0;
    player = {
      x: W / 2 - 17,
      y: H - 120,
      w: 34,
      h: 46,
      lives: startLives(),
      hurt: 0,
      shield: save.ship === "s10" ? shieldDuration() : 0,
      fuel: maxFuel(),
      tilt: 0,
    };
    hud.hidden = false;
    updateHud();
    beep(440, 0.1, "square");
  }

  function pauseGame() {
    state = "pause";
  }

  function resumeGame() {
    state = "playing";
  }

  function levelClear() {
    state = "clear";
    hud.hidden = true;
    const reward = Math.round((15 + level * 8 + runCoins + (noDamage ? 30 : 0)) * rewardMult());
    lastReward = reward;
    save.coins += reward;
    save.totalStars += starCount;
    if (level === save.nextLevel && save.nextLevel < MAX_LEVEL) save.nextLevel += 1;
    persist();
    burst(W / 2, H / 2 - 40, "#ffd166", 40);
    sfxFanfare();
  }

  function gameOver() {
    state = "over";
    hud.hidden = true;
    lastReward = runCoins;
    save.coins += lastReward;
    save.totalStars += starCount;
    persist();
    burst(player.x + player.w / 2, player.y + player.h / 2, "#ff4d6d", 30);
    shake = 12;
    sfxHit();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    updateBg(dt);
    if (state === "launch") {
      launchT -= dt;
      if (launchT <= 0) startLevel();
    }
    if (state === "playing") updateGame(dt);
    for (let i = floats.length - 1; i >= 0; i -= 1) {
      const f = floats[i];
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) floats.splice(i, 1);
    }
    draw();
    requestAnimationFrame(loop);
  }

  function turboOn() {
    return (keys.has("ShiftLeft") || keys.has("ShiftRight")) && player && player.fuel > 0;
  }

  function worldSpeed() {
    return params.speed * (turboOn() ? 1.6 : 1);
  }

  function updateBg(dt) {
    const fast = state === "playing" ? worldSpeed() * 0.35 : state === "launch" ? 300 : 40;
    for (const star of bgStars) {
      star.y += (star.v + fast) * dt;
      if (star.y > H) {
        star.y = -4;
        star.x = Math.random() * W;
      }
    }
  }

  function updateGame(dt) {
    shake = Math.max(0, shake - dt * 26);
    flash = Math.max(0, flash - dt);
    bannerT = Math.max(0, bannerT - dt);

    distance += worldSpeed() * dt * 0.25;
    if (distance >= params.target) {
      levelClear();
      return;
    }

    player.hurt = Math.max(0, player.hurt - dt);
    player.shield = Math.max(0, player.shield - dt);
    shootCd = Math.max(0, shootCd - dt);
    bombCd = Math.max(0, bombCd - dt);

    for (let i = bolts.length - 1; i >= 0; i -= 1) {
      const bolt = bolts[i];
      bolt.y += bolt.vy * dt;
      if (bolt.y < -20) {
        bolts.splice(i, 1);
        continue;
      }
      let consumed = false;
      for (let j = asteroids.length - 1; j >= 0; j -= 1) {
        if (overlap(bolt, asteroids[j])) {
          const rock = asteroids[j];
          burst(rock.x + rock.w / 2, rock.y + rock.h / 2, rock.alien ? "#c46cff" : "#35d2ff", 12);
          const bonus = rock.alien ? 8 : 2;
          runCoins += bonus;
          floatText(rock.x, rock.y, `+${bonus} coin`, "#35d2ff");
          asteroids.splice(j, 1);
          bolts.splice(i, 1);
          consumed = true;
          noise(0.08, 0.05);
          break;
        }
      }
      if (consumed) continue;
      if (boss && overlap(bolt, boss)) {
        bolts.splice(i, 1);
        burst(bolt.x, bolt.y, "#ffd166", 4);
      }
    }

    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const ring = rings[i];
      ring.life -= dt;
      ring.r += 1400 * dt;
      if (ring.life <= 0) rings.splice(i, 1);
    }

    if (turboOn()) player.fuel = Math.max(0, player.fuel - 26 * fuelDrainMult() * dt);
    else player.fuel = Math.min(maxFuel(), player.fuel + 7 * dt);

    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const up = keys.has("KeyW") || keys.has("ArrowUp");
    const down = keys.has("KeyS") || keys.has("ArrowDown");
    const speed = 370;
    const moveX = (right ? 1 : 0) - (left ? 1 : 0);
    player.tilt += ((moveX * 0.35) - player.tilt) * Math.min(1, dt * 10);
    player.x += moveX * speed * dt;
    player.y += ((down ? 1 : 0) - (up ? 1 : 0)) * speed * dt;
    player.x = clamp(player.x, 12, W - player.w - 12);
    player.y = clamp(player.y, 70, H - player.h - 16);

    if (Math.random() < dt * 30) {
      particles.push({
        x: player.x + player.w / 2 + (Math.random() - 0.5) * 8,
        y: player.y + player.h,
        vx: (Math.random() - 0.5) * 40,
        vy: 150 + Math.random() * 90,
        s: 2 + Math.random() * 3,
        life: 0.3,
        color: turboOn() ? "#ffd166" : currentShip().trail,
      });
    }

    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = params.spawn * (0.7 + Math.random() * 0.6);
      if (Math.random() < params.alienChance) spawnAlien();
      else spawnAsteroid();
      if (Math.random() < params.doubleChance) spawnAsteroid();
    }

    starT -= dt;
    if (starT <= 0) {
      starT = 2.2 + Math.random() * 1.8;
      spawnPickup("star");
    }
    heartT -= dt;
    if (heartT <= 0) {
      heartT = 10 + Math.random() * 6;
      spawnPickup("heart");
    }
    shieldT -= dt;
    if (shieldT <= 0) {
      shieldT = 15 + Math.random() * 8;
      spawnPickup("shield");
    }
    fuelT -= dt;
    if (fuelT <= 0) {
      fuelT = 6 + Math.random() * 4;
      spawnPickup("fuel");
    }

    if (params.isBoss && !bossDone && !boss && distance > params.target * 0.45) spawnBoss();
    if (boss) updateBoss(dt);

    const magnet = magnetRadius();
    for (let i = asteroids.length - 1; i >= 0; i -= 1) {
      const rock = asteroids[i];
      if (rock.alien) {
        rock.t += dt;
        rock.x = rock.baseX + Math.sin(rock.t * 2.4) * 150;
      } else {
        rock.x += rock.vx * dt;
      }
      rock.y += rock.vy * dt;
      rock.rot += rock.spin * dt;
      if (rock.y > H + 60) {
        asteroids.splice(i, 1);
        continue;
      }
      if (player.hurt <= 0 && player.shield <= 0 && overlap(shrink(player, 6), shrink(rock, 6))) {
        asteroids.splice(i, 1);
        hitPlayer(rock);
        if (state !== "playing") return;
      } else if (player.shield > 0 && overlap(shrink(player, 2), shrink(rock, 4))) {
        asteroids.splice(i, 1);
        burst(rock.x + rock.w / 2, rock.y + rock.h / 2, "#8fff6a", 14);
        const bonus = rock.alien ? 8 : 2;
        runCoins += bonus;
        floatText(rock.x, rock.y, `+${bonus} coin`, "#8fff6a");
        beep(520, 0.06, "triangle");
      }
    }

    for (let i = pickups.length - 1; i >= 0; i -= 1) {
      const p = pickups[i];
      p.y += p.vy * dt;
      if (magnet > 0) {
        const dx = player.x + player.w / 2 - (p.x + p.w / 2);
        const dy = player.y + player.h / 2 - (p.y + p.h / 2);
        const d = Math.hypot(dx, dy);
        if (d < magnet && d > 1) {
          p.x += (dx / d) * 260 * dt;
          p.y += (dy / d) * 260 * dt;
        }
      }
      if (p.y > H + 30) {
        pickups.splice(i, 1);
        continue;
      }
      if (overlap(player, p)) {
        collectPickup(p);
        pickups.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    updateHud();
  }

  function spawnAsteroid() {
    const size = 20 + Math.random() * 30;
    asteroids.push({
      x: Math.random() * (W - size - 20) + 10,
      y: -size - 10,
      w: size,
      h: size,
      vx: (Math.random() - 0.5) * (50 + level * 2),
      vy: worldSpeed() * (0.9 + Math.random() * 0.4),
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 3,
      tone: Math.random(),
      alien: false,
    });
  }

  function spawnAlien() {
    const baseX = 120 + Math.random() * (W - 240);
    asteroids.push({
      x: baseX,
      baseX,
      t: Math.random() * Math.PI * 2,
      y: -40,
      w: 42,
      h: 28,
      vx: 0,
      vy: worldSpeed() * 1.1,
      rot: 0,
      spin: 0,
      tone: 1,
      alien: true,
    });
  }

  function spawnBoss() {
    boss = {
      x: W / 2 - 80,
      y: -180,
      w: 160,
      h: 160,
      vy: 52 + level,
      rot: 0,
      shedT: 1,
    };
    bannerT = 2;
    bannerSub = "BOSS METEOR! Kaç, dokunma!";
    sfxSiren();
  }

  function updateBoss(dt) {
    boss.y += boss.vy * dt;
    boss.rot += dt * 0.6;
    boss.shedT -= dt;
    if (boss.shedT <= 0 && boss.y > 0 && boss.y < H) {
      boss.shedT = 1.1;
      const size = 18 + Math.random() * 16;
      asteroids.push({
        x: boss.x + Math.random() * boss.w,
        y: boss.y + boss.h - 10,
        w: size,
        h: size,
        vx: (Math.random() - 0.5) * 90,
        vy: worldSpeed() * 0.9,
        rot: 0,
        spin: (Math.random() - 0.5) * 3,
        tone: Math.random(),
        alien: false,
      });
    }
    if (player.hurt <= 0 && player.shield <= 0 && overlap(shrink(player, 4), shrink(boss, 14))) {
      hitPlayer(boss);
      if (state !== "playing") return;
    }
    if (boss.y > H + 180) {
      boss = null;
      bossDone = true;
      runCoins += 50;
      bannerT = 2;
      bannerSub = "BOSS GEÇİLDİ! +50 coin";
      burst(W / 2, H / 2, "#ffd166", 36);
      sfxFanfare();
    }
  }

  function spawnPickup(kind) {
    pickups.push({
      x: Math.random() * (W - 60) + 30,
      y: -24,
      w: 22,
      h: 22,
      vy: worldSpeed() * 0.7,
      kind,
    });
  }

  function collectPickup(p) {
    if (p.kind === "star") {
      const mult = turboOn() ? 2 : 1;
      const value = starCoinValue() * mult;
      starCount += 1;
      runCoins += value;
      floatText(p.x, p.y, `+${value} coin`, "#ffd166");
      burst(p.x + 11, p.y + 11, "#ffd166", 10);
      sfxCoin();
      if (!save.daily.done) {
        save.daily.stars += 1;
        if (save.daily.stars >= DAILY_TARGET) {
          save.daily.done = true;
          save.coins += DAILY_REWARD;
          floatText(W / 2 - 130, 160, `GÜNLÜK GÖREV TAMAM! +${DAILY_REWARD} coin`, "#8fff6a");
          sfxFanfare();
        }
        persist();
      }
    } else if (p.kind === "heart") {
      if (player.lives < 6) player.lives += 1;
      floatText(p.x, p.y, "+CAN", "#ff8fa8");
      burst(p.x + 11, p.y + 11, "#ff4d6d", 12);
      sfxHeart();
    } else if (p.kind === "shield") {
      player.shield = shieldDuration();
      floatText(p.x, p.y, "KALKAN", "#8fff6a");
      burst(p.x + 11, p.y + 11, "#8fff6a", 12);
      sfxShield();
    } else if (p.kind === "fuel") {
      player.fuel = Math.min(maxFuel(), player.fuel + 40);
      floatText(p.x, p.y, "+YAKIT", "#35d2ff");
      burst(p.x + 11, p.y + 11, "#35d2ff", 10);
      sfxShield();
    }
  }

  function hitPlayer(rock) {
    player.lives -= 1;
    player.hurt = hurtDuration();
    noDamage = false;
    shake = 10;
    burst(rock.x + rock.w / 2, rock.y + rock.h / 2, "#ff4d6d", 18);
    floatText(player.x, player.y - 14, "-1 CAN", "#ff4d6d");
    sfxHit();
    if (player.lives <= 0) gameOver();
  }

  function updateHud() {
    if (levelLabel) levelLabel.textContent = `${level} / ${MAX_LEVEL}`;
    if (livesLabel) livesLabel.textContent = "❤".repeat(Math.max(0, player.lives)) || "0";
    if (starLabel) starLabel.textContent = String(starCount);
  }

  function draw() {
    uiButtons = [];
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    drawSpace();
    if (state === "lobby") drawLobby();
    if (state === "launch") drawLaunch();
    if (state === "playing" || state === "pause" || state === "clear" || state === "over") drawFlight();
    if (state === "pause") drawCard("Duraklatıldı", [`Bölüm ${level} · ${Math.floor(distance)} / ${params.target} m`], [
      { act: "resume", label: "Devam", go: true },
      { act: "lobi", label: "Lobi" },
    ]);
    if (state === "clear") {
      const all = level >= MAX_LEVEL && save.nextLevel >= MAX_LEVEL;
      drawCard(
        `Bölüm ${level} bitti!`,
        [`+${lastReward} coin kazandın${noDamage ? " (hasarsız bonus dahil)" : ""}`, all ? "100 bölüm de temiz. Efsanesin!" : `Sıradaki: Bölüm ${Math.min(level + 1, MAX_LEVEL)}`],
        [
          { act: "play", label: "Sonraki bölüm", go: true },
          { act: "lobi", label: "Lobi" },
        ]
      );
    }
    if (state === "over") drawCard("Roket düştü!", [`${starCount} yıldız topladın · +${lastReward} coin teselli`, `Bölüm ${level} seni bekliyor.`], [
      { act: "retry", label: "Tekrar dene", go: true },
      { act: "lobi", label: "Lobi" },
    ]);

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2.4);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.s, p.s);
      ctx.globalAlpha = 1;
    }
    for (const f of floats) {
      ctx.globalAlpha = Math.max(0, f.life * 1.6);
      ctx.fillStyle = f.color;
      ctx.font = "900 18px Inter, sans-serif";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash * 2)})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawSpace() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.top);
    sky.addColorStop(1, theme.bot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#dfe8ff";
    for (const star of bgStars) {
      ctx.globalAlpha = 0.3 + star.s * 0.2;
      ctx.fillRect(star.x, star.y, star.s, star.s + star.v * 0.02);
    }
    ctx.globalAlpha = 1;
  }

  function drawLobby() {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(6,8,16,0.78)";
    ctx.fillRect(16, 14, 300, 62);
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "900 18px Inter, sans-serif";
    ctx.fillText(`Bölüm ${Math.min(save.nextLevel, MAX_LEVEL)} / ${MAX_LEVEL}`, 30, 40);
    ctx.fillStyle = save.daily.done ? "#8fff6a" : "#a8b4c8";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.fillText(save.daily.done ? "Günlük görev tamam ✓" : `Günlük görev: ${save.daily.stars}/${DAILY_TARGET} yıldız`, 30, 62);

    ctx.fillStyle = "rgba(6,8,16,0.78)";
    ctx.fillRect(W - 216, 14, 200, 62);
    ctx.fillStyle = "#ffd166";
    ctx.font = "900 22px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${save.coins} coin`, W - 30, 48);
    ctx.textAlign = "left";

    drawButton(258, 20, 140, 40, "GARAJ", "tab-garaj", lobbyTab === "garaj");
    drawButton(410, 20, 140, 40, "MAĞAZA", "tab-shop", lobbyTab === "shop");
    drawButton(562, 20, 140, 40, "KOD", "tab-kod", lobbyTab === "kod");

    if (lobbyTab === "garaj") drawGarage();
    else if (lobbyTab === "shop") drawShop();
    else drawKod();

    drawButton(W / 2 - 180, 470, 360, 52, `BÖLÜM ${Math.min(save.nextLevel, MAX_LEVEL)} OYNA`, "play", true);
  }

  function drawGarage() {
    const ship = SHIPS[lobbyIndex];
    drawShipLobby(W / 2, 240, ship);

    drawArrowButton(70, 210, -1, "prev");
    drawArrowButton(W - 130, 210, 1, "next");

    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "900 24px Inter, sans-serif";
    ctx.fillText(ship.name, W / 2, 356);
    ctx.fillStyle = "#35d2ff";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillText(ship.power, W / 2, 378);
    const owned = save.owned.includes(ship.id);
    const selected = save.ship === ship.id;
    ctx.fillStyle = owned ? "#8fff6a" : "#ffd166";
    ctx.font = "800 14px Inter, sans-serif";
    ctx.fillText(owned ? (selected ? "Garajda · seçili" : "Garajda") : `${ship.price} coin`, W / 2, 400);
    ctx.textAlign = "left";

    drawButton(W / 2 - 110, 412, 220, 42, selected ? "SEÇİLDİ" : owned ? "BU ARACI SEÇ" : "SATIN AL", "buy", false, !owned && save.coins < ship.price);

    ctx.textAlign = "center";
    ctx.fillStyle = "#a8b4c8";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.fillText("A/D veya oklarla araç değiştir · Enter ile bölümü başlat", W / 2, 534);
    ctx.textAlign = "left";
  }

  function drawShop() {
    drawButton(300, 68, 170, 34, "YÜKSELTME", "shoptab-upg", shopTab === "upg");
    drawButton(490, 68, 170, 34, "SİLAHLAR", "shoptab-wpn", shopTab === "wpn");
    ctx.textAlign = "left";
    if (shopTab === "upg") {
      UPGRADES.forEach((upg, i) => {
        const y = 116 + i * 70;
        const lvl = upgLevel(upg.id);
        const maxed = lvl >= upg.prices.length;
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.strokeStyle = "rgba(53,210,255,0.22)";
        ctx.lineWidth = 1.5;
        roundRect(70, y, W - 140, 60, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f4f7ff";
        ctx.font = "900 16px Inter, sans-serif";
        ctx.fillText(upg.name, 92, y + 24);
        ctx.fillStyle = "#a8b4c8";
        ctx.font = "700 12px Inter, sans-serif";
        ctx.fillText(upg.desc, 92, y + 44);

        for (let p = 0; p < upg.prices.length; p += 1) {
          ctx.fillStyle = p < lvl ? "#8fff6a" : "rgba(255,255,255,0.16)";
          ctx.beginPath();
          ctx.arc(420 + p * 22, y + 30, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        drawButton(
          W - 260,
          y + 10,
          170,
          40,
          maxed ? "MAX" : `${upg.prices[lvl]} coin`,
          `upg:${upg.id}`,
          false,
          !maxed && save.coins < upg.prices[lvl]
        );
      });
      ctx.textAlign = "center";
      ctx.fillStyle = "#a8b4c8";
      ctx.font = "700 12px Inter, sans-serif";
      ctx.fillText("Yükseltmeler kalıcıdır — bir kere al, hep sende kalsın.", W / 2, 534);
      ctx.textAlign = "left";
      return;
    }
    WEAPONS.forEach((weapon, i) => {
      const y = 130 + i * 110;
      const owned = ownsWeapon(weapon.id);
      ctx.fillStyle = "rgba(255,77,255,0.07)";
      ctx.strokeStyle = "rgba(255,77,255,0.3)";
      ctx.lineWidth = 1.5;
      roundRect(70, y, W - 140, 92, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f4f7ff";
      ctx.font = "900 19px Inter, sans-serif";
      ctx.fillText(weapon.name, 92, y + 32);
      ctx.fillStyle = "#a8b4c8";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText(weapon.desc, 92, y + 58);

      drawButton(
        W - 270,
        y + 26,
        180,
        42,
        owned ? "SENDE VAR" : `${weapon.price} coin`,
        `wpn:${weapon.id}`,
        false,
        owned || save.coins < weapon.price
      );
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#a8b4c8";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.fillText("Silahlar pahalı ama efsane. Coin biriktir!", W / 2, 534);
    ctx.textAlign = "left";
  }

  function drawLaunch() {
    const gone = 3.4 - launchT;
    const open = clamp(gone / 1.4, 0, 1);

    ctx.fillStyle = "#0a0c14";
    ctx.fillRect(0, 0, W, 150);
    ctx.fillRect(0, H - 90, W, 90);

    ctx.fillStyle = "#141824";
    ctx.fillRect(0, 150, W, H - 240);
    ctx.strokeStyle = "rgba(53,210,255,0.25)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const y = 170 + i * 52 + ((gone * 160) % 52);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const doorW = (W / 2) * (1 - open);
    ctx.fillStyle = "#232a3a";
    ctx.fillRect(0, 150, doorW, H - 240);
    ctx.fillRect(W - doorW, 150, doorW, H - 240);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(doorW - 8, 150, 8, H - 240);
    ctx.fillRect(W - doorW, 150, 8, H - 240);

    if (open > 0) {
      ctx.fillStyle = `rgba(223,232,255,${open * 0.8})`;
      ctx.fillRect(doorW, 150, W - doorW * 2, H - 240);
      ctx.fillStyle = "#0a0e20";
      for (const star of bgStars.slice(0, 30)) {
        ctx.fillRect(doorW + ((star.x * 3) % Math.max(1, W - doorW * 2)), 170 + (star.y % (H - 280)), 2, 2);
      }
    }

    const scale = 1.3 + gone * 0.35;
    const flame = 10 + gone * 26;
    drawShipRear(W / 2, 300 + Math.sin(gone * 6) * 3, scale, flame);

    if (gone > 1.6) {
      ctx.strokeStyle = "rgba(223,232,255,0.6)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 24; i += 1) {
        const a = (i / 24) * Math.PI * 2;
        const r1 = ((gone * 260 + i * 53) % 300) + 60;
        const r2 = r1 + 26 + gone * 20;
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a) * r1, 250 + Math.sin(a) * r1 * 0.6);
        ctx.lineTo(W / 2 + Math.cos(a) * r2, 250 + Math.sin(a) * r2 * 0.6);
        ctx.stroke();
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "900 26px Inter, sans-serif";
    ctx.fillText(gone < 1.4 ? "Kapı açılıyor..." : "Kalkış!", W / 2, 110);
    ctx.fillStyle = "#a8b4c8";
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillText("tıkla veya Enter: atla", W / 2, 506);
    ctx.textAlign = "left";

    if (launchT < 0.4) flash = Math.max(flash, 0.3);
  }

  function drawFlight() {
    for (const p of pickups) drawPickup(p);
    for (const rock of asteroids) {
      if (rock.alien) drawAlien(rock);
      else drawAsteroid(rock);
    }
    if (boss) drawBoss();
    ctx.fillStyle = "#35d2ff";
    for (const bolt of bolts) ctx.fillRect(bolt.x, bolt.y, bolt.w, bolt.h);
    for (const ring of rings) {
      ctx.strokeStyle = `rgba(255,209,102,${Math.max(0, ring.life * 2)})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player && (state === "playing" || state === "pause")) drawShipTop(player.x, player.y, 1, currentShip(), player.tilt, player);

    if (state === "playing") {
      ctx.fillStyle = "rgba(6,8,16,0.72)";
      ctx.fillRect(W / 2 - 170, 12, 340, 30);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(W / 2 - 160, 22, 320, 10);
      ctx.fillStyle = "#35d2ff";
      ctx.fillRect(W / 2 - 160, 22, 320 * clamp(distance / params.target, 0, 1), 10);
      ctx.fillStyle = "#f4f7ff";
      ctx.font = "800 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`HEDEF: ${params.target} m · ${theme.name}`, W / 2, 54);
      ctx.textAlign = "left";

      ctx.fillStyle = "rgba(6,8,16,0.72)";
      ctx.fillRect(16, H - 52, 160, 36);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(26, H - 40, 140, 10);
      ctx.fillStyle = player.fuel > 25 ? "#35d2ff" : "#ff4d6d";
      ctx.fillRect(26, H - 40, 140 * clamp(player.fuel / maxFuel(), 0, 1), 10);
      ctx.fillStyle = "#a8b4c8";
      ctx.font = "800 10px Inter, sans-serif";
      ctx.fillText("YAKIT", 26, H - 46);

      if (bannerT > 0) {
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.min(1, bannerT);
        ctx.fillStyle = params.isBoss && !bossDone ? "#ff4d6d" : "#35d2ff";
        ctx.font = "900 34px Inter, sans-serif";
        ctx.fillText(`BÖLÜM ${level}`, W / 2, 120);
        ctx.fillStyle = "#a8b4c8";
        ctx.font = "800 15px Inter, sans-serif";
        ctx.fillText(bannerSub, W / 2, 146);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }

      if (turboOn()) {
        ctx.fillStyle = "rgba(255,209,102,0.9)";
        ctx.font = "900 15px Inter, sans-serif";
        ctx.fillText("TURBO x2", 20, H - 62);
      }
      if (ownsWeapon("laser") || ownsWeapon("bomb")) {
        ctx.fillStyle = "rgba(6,8,16,0.72)";
        ctx.fillRect(W - 236, H - 52, 220, 36);
        ctx.font = "800 12px Inter, sans-serif";
        ctx.fillStyle = "#35d2ff";
        let wtext = ownsWeapon("laser") ? "J: Lazer" : "";
        if (ownsWeapon("bomb")) wtext += `${wtext ? "  ·  " : ""}B: Bomba${bombCd > 0 ? ` (${Math.ceil(bombCd)})` : " hazır"}`;
        ctx.fillText(wtext, W - 226, H - 30);
      }
      ctx.fillStyle = "#ffd166";
      ctx.font = "900 15px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${save.coins + runCoins} coin`, W - 20, H - 20);
      ctx.textAlign = "left";
    }
  }

  function drawCard(title, lines, buttons) {
    ctx.fillStyle = "rgba(4,6,12,0.68)";
    ctx.fillRect(0, 0, W, H);
    const cw = 440;
    const ch = 120 + buttons.length * 56 + lines.length * 24;
    const cx = W / 2 - cw / 2;
    const cy = H / 2 - ch / 2;
    ctx.fillStyle = "rgba(10,12,24,0.96)";
    ctx.strokeStyle = "rgba(53,210,255,0.4)";
    ctx.lineWidth = 2;
    roundRect(cx, cy, cw, ch, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "900 30px Inter, sans-serif";
    ctx.fillText(title, W / 2, cy + 52);
    ctx.fillStyle = "#a8b4c8";
    ctx.font = "700 15px Inter, sans-serif";
    lines.forEach((line, i) => ctx.fillText(line, W / 2, cy + 86 + i * 24));
    ctx.textAlign = "left";

    buttons.forEach((btn, i) => {
      drawButton(W / 2 - 150, cy + 104 + lines.length * 24 + i * 56, 300, 46, btn.label, btn.act, btn.go);
    });
  }

  function drawButton(x, y, w, h, label, act, go, disabled) {
    uiButtons.push({ x, y, w, h, act });
    ctx.fillStyle = disabled ? "rgba(255,255,255,0.08)" : go ? "#35d2ff" : "rgba(255,255,255,0.1)";
    ctx.strokeStyle = disabled ? "rgba(255,255,255,0.14)" : go ? "#35d2ff" : "rgba(255,255,255,0.24)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = disabled ? "#6a7280" : go ? "#061018" : "#f4f7ff";
    ctx.font = "900 16px Inter, sans-serif";
    ctx.fillText(label, x + w / 2, y + h / 2 + 6);
    ctx.textAlign = "left";
  }

  function drawArrowButton(x, y, dir, act) {
    uiButtons.push({ x, y, w: 60, h: 60, act });
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.strokeStyle = "rgba(53,210,255,0.4)";
    ctx.lineWidth = 2;
    roundRect(x, y, 60, 60, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#35d2ff";
    ctx.beginPath();
    if (dir < 0) {
      ctx.moveTo(x + 38, y + 16);
      ctx.lineTo(x + 20, y + 30);
      ctx.lineTo(x + 38, y + 44);
    } else {
      ctx.moveTo(x + 22, y + 16);
      ctx.lineTo(x + 40, y + 30);
      ctx.lineTo(x + 22, y + 44);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawShipTop(x, y, scale, ship, tilt, pl) {
    const w = 34 * scale;
    const h = 46 * scale;
    const blink = pl && pl.hurt > 0 && Math.floor(performance.now() / 70) % 2 === 0;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(tilt || 0);
    if (blink) ctx.globalAlpha = 0.4;
    ctx.translate(-w / 2, -h / 2);

    const span = ship.span;
    ctx.fillStyle = ship.wing;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.lineTo(-9 * span, h);
    ctx.lineTo(7, h * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, h * 0.62);
    ctx.lineTo(w + 9 * span, h);
    ctx.lineTo(w - 7, h * 0.82);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ship.body;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h * 0.62);
    ctx.lineTo(w, h * 0.82);
    ctx.lineTo(0, h * 0.82);
    ctx.lineTo(0, h * 0.62);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ship.glass;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.38, 7 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (pl && pl.shield > 0) {
      ctx.strokeStyle = "rgba(143,255,106,0.8)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.max(w, h) * 0.78, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawShipLobby(cx, cy, ship) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.32);
    ctx.scale(2.1, 2.1);
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
    glow.addColorStop(0, "rgba(53,210,255,0.22)");
    glow.addColorStop(1, "rgba(53,210,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-100, -100, 200, 200);
    drawShipTop(-17, -23, 1, ship, 0, null);
    ctx.fillStyle = ship.wing;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(6, 14);
    ctx.lineTo(26 * ship.span, 34);
    ctx.lineTo(10, 24);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawShipRear(cx, cy, scale, flame) {
    const ship = currentShip();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = ship.trail;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-7, 16);
    ctx.lineTo(0, 16 + flame);
    ctx.lineTo(7, 16);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = ship.wing;
    ctx.beginPath();
    ctx.moveTo(-26 * ship.span, 10);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-8, 16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26 * ship.span, 10);
    ctx.lineTo(8, -6);
    ctx.lineTo(8, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ship.body;
    roundRect(-10, -20, 20, 38, 8);
    ctx.fill();
    ctx.fillStyle = ship.glass;
    roundRect(-6, -16, 12, 12, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawAsteroid(rock) {
    ctx.save();
    ctx.translate(rock.x + rock.w / 2, rock.y + rock.h / 2);
    ctx.rotate(rock.rot);
    ctx.fillStyle = rock.tone > 0.5 ? theme.rock[0] : theme.rock[1];
    ctx.beginPath();
    const r = rock.w / 2;
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const rr = r * (0.78 + ((i * 37 + rock.w) % 10) / 40);
      const px = Math.cos(angle) * rr;
      const py = Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.15, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.28, r * 0.3, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAlien(rock) {
    ctx.save();
    ctx.translate(rock.x + rock.w / 2, rock.y + rock.h / 2);
    ctx.fillStyle = "#c46cff";
    ctx.beginPath();
    ctx.ellipse(0, 4, rock.w / 2, rock.h / 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a3adf";
    ctx.beginPath();
    ctx.ellipse(0, -4, rock.w / 4, rock.h / 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8fff6a";
    ctx.beginPath();
    ctx.arc(0, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBoss() {
    ctx.save();
    ctx.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);
    ctx.rotate(boss.rot);
    ctx.strokeStyle = "rgba(255,77,109,0.7)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, boss.w / 2 + 8 + Math.sin(performance.now() / 150) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#7a4a40";
    ctx.beginPath();
    const r = boss.w / 2;
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const rr = r * (0.8 + ((i * 31) % 10) / 42);
      const px = Math.cos(angle) * rr;
      const py = Math.sin(angle) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.arc(r * 0.3, r * 0.32, r * 0.14, 0, Math.PI * 2);
    ctx.arc(r * 0.1, -r * 0.42, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPickup(p) {
    const bob = Math.sin(performance.now() / 200 + p.x) * 2;
    if (p.kind === "star") {
      ctx.fillStyle = "#ffd166";
      drawStar(p.x + 11, p.y + 11 + bob, 11, 5);
    } else if (p.kind === "heart") {
      ctx.fillStyle = "#ff4d6d";
      ctx.beginPath();
      ctx.arc(p.x + 7, p.y + 8 + bob, 6, 0, Math.PI * 2);
      ctx.arc(p.x + 15, p.y + 8 + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x + 2, p.y + 10 + bob);
      ctx.lineTo(p.x + 11, p.y + 22 + bob);
      ctx.lineTo(p.x + 20, p.y + 10 + bob);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === "shield") {
      ctx.strokeStyle = "#8fff6a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x + 11, p.y + 11 + bob, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#8fff6a";
      ctx.font = "900 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("S", p.x + 11, p.y + 15 + bob);
      ctx.textAlign = "left";
    } else if (p.kind === "fuel") {
      ctx.fillStyle = "#35d2ff";
      roundRect(p.x + 5, p.y + 3 + bob, 12, 17, 3);
      ctx.fill();
      ctx.fillStyle = "#061018";
      ctx.fillRect(p.x + 8, p.y + 6 + bob, 6, 8);
    }
  }

  function drawStar(cx, cy, outer, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const r = i % 2 === 0 ? outer : outer * 0.45;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shrink(b, pad) {
    return { x: b.x + pad, y: b.y + pad, w: b.w - pad * 2, h: b.h - pad * 2 };
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i += 1) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 320,
        vy: (Math.random() - 0.5) * 320,
        s: 2 + Math.random() * 4,
        life: 0.4 + Math.random() * 0.3,
        color,
      });
    }
  }

  function floatText(x, y, text, color) {
    floats.push({ x, y, text, color, life: 0.9 });
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function canvasPoint(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * W,
      y: ((event.clientY - box.top) / box.height) * H,
    };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function beep(freq, dur, type, vol = 0.04, when = 0) {
    try {
      audio = audio || new AudioContext();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(audio.destination);
      o.start(audio.currentTime + when);
      o.stop(audio.currentTime + when + dur);
    } catch {}
  }

  function noise(dur, vol = 0.08) {
    try {
      audio = audio || new AudioContext();
      const buffer = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = audio.createBufferSource();
      const g = audio.createGain();
      g.gain.value = vol;
      src.buffer = buffer;
      src.connect(g);
      g.connect(audio.destination);
      src.start();
    } catch {}
  }

  function sfxCoin() {
    beep(880, 0.05, "square");
    beep(1320, 0.08, "square", 0.04, 0.05);
  }

  function sfxHit() {
    noise(0.2, 0.09);
    beep(70, 0.16, "sawtooth", 0.06);
  }

  function sfxFail() {
    beep(120, 0.12, "sawtooth", 0.05);
    beep(90, 0.14, "sawtooth", 0.05, 0.1);
  }

  function sfxHeart() {
    beep(560, 0.08, "sine");
    beep(840, 0.1, "sine", 0.04, 0.08);
  }

  function sfxShield() {
    beep(520, 0.06, "square");
    beep(780, 0.08, "square", 0.04, 0.06);
  }

  function sfxSiren() {
    for (let i = 0; i < 3; i += 1) {
      beep(520, 0.12, "square", 0.05, i * 0.3);
      beep(340, 0.12, "square", 0.05, i * 0.3 + 0.15);
    }
  }

  function sfxFanfare() {
    [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.1, "square", 0.05, i * 0.09));
  }

  function sfxLaunch() {
    beep(90, 0.6, "sawtooth", 0.05);
    beep(60, 0.9, "sawtooth", 0.04, 0.4);
    noise(1.2, 0.03);
  }
})();
