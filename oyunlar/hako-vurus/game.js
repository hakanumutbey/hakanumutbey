(() => {
  const W = 960;
  const H = 540;
  const GROUND = 452;
  const GRAVITY = 2300;
  const SAVE_KEY = "hakorocks-hako-vurus-save-v3";
  const BEST_KEY = "hakorocks-hako-vurus-best-v3";
  const TRAVEL_TIME = 10;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const overlayCard = document.getElementById("overlayCard");
  const hud = document.getElementById("hud");
  const levelLabel = document.getElementById("levelLabel");
  const waveLabel = document.getElementById("waveLabel");
  const scoreLabel = document.getElementById("scoreLabel");
  const comboLabel = document.getElementById("comboLabel");
  const hpFill = document.getElementById("hpFill");
  const bestLabel = document.getElementById("bestLabel");
  const coinLabel = document.getElementById("coinLabel");
  const cityBar = document.getElementById("cityBar");

  const STORY = [
    { title: "Dünya bitti.", text: "Uzaylılar geldi. Kutular. Bütün şehirleri yaktılar." },
    { title: "20 harabe.", text: "Haritada 20 şehir kaldı. Her biri daha tehlikeli." },
    { title: "Yolculuk.", text: "Şehirden şehre araba ile gidilir. Hako direksiyonda." },
    { title: "Her şehirde dükkân.", text: "Mustafa yalnız değil. Her harabede başka bir dükkân var." },
    { title: "Hako Vuruş", text: "Şehirde 5 arena var. Haritada yürü. K'ye basınca 20 şehri görürsün." },
  ];

  const ARENAS = [
    { id: 1, name: "Sokak", x: 170, y: 368, r: 38, theme: "street" },
    { id: 2, name: "Çatı", x: 220, y: 132, r: 38, theme: "roof" },
    { id: 3, name: "Metro", x: 480, y: 430, r: 38, theme: "metro" },
    { id: 4, name: "Neon", x: 750, y: 146, r: 38, theme: "neon" },
    { id: 5, name: "Merkez", x: 786, y: 378, r: 42, theme: "arena" },
  ];
  const SHOP_SPOT = { x: 480, y: 248, r: 50 };

  const CITIES = [
    { id: 1, name: "İstanbul", to: "İstanbul'a", keeper: "Mustafa", food: "Simit", glove: "Köprü Eldiveni", x: 78, y: 168, theme: "neon" },
    { id: 2, name: "Kocaeli", to: "Kocaeli'ye", keeper: "Ece", food: "Pide", glove: "Sanayi Eldiveni", x: 168, y: 188, theme: "street" },
    { id: 3, name: "Bursa", to: "Bursa'ya", keeper: "Can", food: "İskender", glove: "Dağ Eldiveni", x: 148, y: 278, theme: "roof" },
    { id: 4, name: "Eskişehir", to: "Eskişehir'e", keeper: "Elif", food: "Çibörek", glove: "Tren Eldiveni", x: 248, y: 248, theme: "metro" },
    { id: 5, name: "Ankara", to: "Ankara'ya", keeper: "Ayşe", food: "Döner", glove: "Başkent Eldiveni", x: 348, y: 208, theme: "arena" },
    { id: 6, name: "Konya", to: "Konya'ya", keeper: "Ömer", food: "Etliekmek", glove: "Oval Eldiven", x: 368, y: 328, theme: "street" },
    { id: 7, name: "Antalya", to: "Antalya'ya", keeper: "Deniz", food: "Portakal", glove: "Sahil Eldiveni", x: 300, y: 438, theme: "neon" },
    { id: 8, name: "İzmir", to: "İzmir'e", keeper: "Ege", food: "Boyoz", glove: "Kordon Eldiveni", x: 108, y: 408, theme: "roof" },
    { id: 9, name: "Muğla", to: "Muğla'ya", keeper: "Lara", food: "Bal", glove: "Çam Eldiveni", x: 198, y: 478, theme: "street" },
    { id: 10, name: "Denizli", to: "Denizli'ye", keeper: "Barış", food: "Horoz Şeker", glove: "Pamukkale Eldiveni", x: 278, y: 368, theme: "metro" },
    { id: 11, name: "Adana", to: "Adana'ya", keeper: "Cemil", food: "Kebap", glove: "Sıcak Eldiven", x: 478, y: 398, theme: "arena" },
    { id: 12, name: "Mersin", to: "Mersin'e", keeper: "Naz", food: "Tantuni", glove: "Liman Eldiveni", x: 528, y: 458, theme: "neon" },
    { id: 13, name: "Kayseri", to: "Kayseri'ye", keeper: "Hakan", food: "Mantı", glove: "Erciyes Eldiveni", x: 508, y: 278, theme: "roof" },
    { id: 14, name: "Samsun", to: "Samsun'a", keeper: "Yılmaz", food: "Pide", glove: "Karadeniz Eldiveni", x: 528, y: 118, theme: "street" },
    { id: 15, name: "Trabzon", to: "Trabzon'a", keeper: "Faruk", food: "Hamsi", glove: "Sümela Eldiveni", x: 648, y: 98, theme: "metro" },
    { id: 16, name: "Gaziantep", to: "Gaziantep'e", keeper: "Filiz", food: "Baklava", glove: "Antep Eldiveni", x: 628, y: 368, theme: "arena" },
    { id: 17, name: "Şanlıurfa", to: "Şanlıurfa'ya", keeper: "Rojda", food: "Çiğköfte", glove: "Balıklıgöl Eldiveni", x: 708, y: 408, theme: "street" },
    { id: 18, name: "Diyarbakır", to: "Diyarbakır'a", keeper: "Amed", food: "Kabak", glove: "Sur Eldiveni", x: 768, y: 328, theme: "neon" },
    { id: 19, name: "Erzurum", to: "Erzurum'a", keeper: "Kaan", food: "Cağ Kebabı", glove: "Kar Eldiveni", x: 788, y: 178, theme: "roof" },
    { id: 20, name: "Son Kale", to: "Son Kale'ye", keeper: "Kaptan", food: "Son Simit", glove: "Son Yumruk", x: 888, y: 258, theme: "arena" },
  ];

  const DANCES = [
    { id: "win-hop", name: "Zıpla Dansı", desc: "Zafer: zıpla zıpla", cost: 380, type: "winAnim", value: "hop", cat: "dans", city: 3 },
    { id: "win-robot", name: "Robot Dansı", desc: "Zafer: robot adımı", cost: 520, type: "winAnim", value: "robot", cat: "dans", city: 5 },
    { id: "win-boom", name: "Patlama Pozu", desc: "Zafer: kıvılcım", cost: 560, type: "winAnim", value: "boom", cat: "dans", city: 7 },
    { id: "win-slide", name: "Kayarak Geç", desc: "Zafer: ayak kaydırma", cost: 680, type: "winAnim", value: "slide", cat: "dans", city: 11 },
    { id: "win-flip", name: "Takla Şov", desc: "Zafer: havada takla", cost: 740, type: "winAnim", value: "flip", cat: "dans", city: 15 },
    { id: "win-rain", name: "Yıldız Yağmuru", desc: "Zafer: gökten yıldız", cost: 820, type: "winAnim", value: "rain", cat: "dans", city: 16 },
    { id: "win-king", name: "Kral Pozu", desc: "Zafer: taç ve altın", cost: 900, type: "winAnim", value: "king", cat: "dans", city: 19 },
    { id: "win-storm", name: "Şimşek Şov", desc: "Zafer: fırtına", cost: 980, type: "winAnim", value: "storm", cat: "dans", city: 20 },
  ];

  const SKINS = [
    { id: "skin-gold", name: "Altın Hako", desc: "Altın kostüm", cost: 80, type: "skin", value: "gold", cat: "kostüm", city: 2 },
    { id: "skin-shadow", name: "Gölge Hako", desc: "Siyah kostüm", cost: 120, type: "skin", value: "shadow", cat: "kostüm", city: 8 },
    { id: "skin-neon", name: "Neon Hako", desc: "Pembe-mavi kostüm", cost: 180, type: "skin", value: "neon", cat: "kostüm", city: 12 },
  ];

  const MOVES = [
    { id: "move-upper", name: "Yukarı Fırlat", desc: "3. vuruş uçurur", cost: 140, type: "move", value: "upper", cat: "vuruş", city: 4 },
    { id: "move-double", name: "Çift Zıpla", desc: "Havada bir zıplama daha", cost: 160, type: "move", value: "double", cat: "vuruş", city: 6 },
    { id: "move-slam", name: "Yere Çak", desc: "Havada S + vur", cost: 180, type: "move", value: "slam", cat: "vuruş", city: 10 },
    { id: "anim-fire", name: "Ateş Yumruğu", desc: "Vuruş animasyonu", cost: 260, type: "punchAnim", value: "fire", cat: "vuruş", city: 13 },
    { id: "anim-shock", name: "Şok Halkası", desc: "Vuruş animasyonu", cost: 280, type: "punchAnim", value: "shock", cat: "vuruş", city: 18 },
  ];

  const kinds = {
    grunt: { w: 34, h: 50, hp: 26, speed: 88, dmg: 8, score: 20, coins: 4, color: "#c46cff", scale: 2 },
    runner: { w: 30, h: 44, hp: 16, speed: 168, dmg: 6, score: 24, coins: 5, color: "#ff9f43", scale: 1 },
    jumper: { w: 32, h: 42, hp: 18, speed: 110, dmg: 7, score: 26, coins: 5, color: "#8fff6a", scale: 2 },
    tank: { w: 48, h: 58, hp: 58, speed: 54, dmg: 12, score: 40, coins: 8, color: "#7f93b0", scale: 4 },
    thrower: { w: 34, h: 48, hp: 22, speed: 70, dmg: 7, score: 28, coins: 6, color: "#ff4dff", scale: 2 },
    boss: { w: 72, h: 86, hp: 180, speed: 70, dmg: 16, score: 160, coins: 25, color: "#ff4d6d", scale: 10 },
  };

  const keys = new Set();
  const particles = [];
  const floats = [];
  const pickups = [];
  const projectiles = [];

  let audio;
  let last = 0;
  let shake = 0;
  let flash = 0;
  let hitstop = 0;
  let state = "story";
  let storyPage = 0;
  let player;
  let mapHero = { x: 170, y: 300, vx: 0, vy: 0 };
  let standT = 0;
  let standId = "";
  let mapTarget = null;
  let enemies = [];
  let spawnQueue = [];
  let spawnTimer = 0;
  let wave = 1;
  let score = 0;
  let wavePause = 0;
  let specialReady = false;
  let currentCity = CITIES[0];
  let currentArena = ARENAS[0];
  let winTimer = 0;
  let enemyId = 1;
  let hoverNode = null;
  let shopTab = "hepsi";
  let travelT = 0;
  let travelFrom = null;
  let arrivedHere = false;

  try {
    ["", "-v2"].forEach((suffix) => {
      localStorage.removeItem(`hakorocks-hako-vurus-save${suffix}`);
      localStorage.removeItem(`hakorocks-hako-vurus-best${suffix}`);
    });
  } catch {}

  let save = loadSave();
  if (bestLabel) bestLabel.textContent = String(save.best);
  renderCoins();
  showMap();
  if (!save.seenStory) showStory();
  requestAnimationFrame(loop);

  window.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    const code = event.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) event.preventDefault();
    keys.add(code);
    if (state === "story" && (code === "Enter" || code === "Space")) nextStory();
    if (state === "travel" && (code === "Enter" || code === "Space") && travelT < 8) finishTravel();
    if (state === "playing") {
      if (code === "Space" || code === "KeyJ") tryAttack();
      if (code === "ShiftLeft" || code === "ShiftRight") tryDash();
      if (code === "KeyW" || code === "ArrowUp") tryJump();
    }
    if (code === "KeyK") {
      if (state === "world") showMap();
      else if (state === "map" || state === "shop" || state === "city") showWorld();
    }
    if ((state === "map" || state === "world") && (code === "Space" || code === "KeyJ" || code === "Enter")) tryUseMapSpot(true);
    if (code === "Escape") {
      if (state === "playing") pauseFight();
      else if (state === "world" || state === "shop" || state === "city") showMap();
    }
    if ((state === "dead" || state === "win" || state === "pause") && code === "Enter") {
      if (state === "dead") restartLevel();
      if (state === "win" || state === "pause") showCityHub();
    }
  });

  window.addEventListener("keyup", (event) => keys.delete(event.code));
  overlay.addEventListener("click", handleUiClick);
  if (cityBar) cityBar.addEventListener("click", handleUiClick);

  canvas.addEventListener("pointerdown", (event) => {
    if (state === "travel" && travelT < 8) {
      finishTravel();
      return;
    }
    if (state === "world") {
      const p = canvasPoint(event);
      const node = CITIES.find((city) => dist(p, city) <= 26);
      if (node) tryEnterCity(node, true);
      else mapTarget = p;
      return;
    }
    if (state !== "map") return;
    const p = canvasPoint(event);
    if (dist(p, SHOP_SPOT) <= SHOP_SPOT.r + 8) {
      openShop();
      return;
    }
    const arena = ARENAS.find((item) => dist(p, item) <= item.r + 8);
    if (arena) {
      tryEnterArena(arena, true);
      return;
    }
    mapTarget = p;
  });

  function handleUiClick(event) {
    const btn = event.target.closest("[data-act], [data-buy], [data-tab]");
    if (!btn) {
      if (state === "story") nextStory();
      if (state === "travel" && travelT < 8) finishTravel();
      return;
    }
    if (btn.dataset.act === "story") nextStory();
    if (btn.dataset.act === "skip") {
      save.seenStory = true;
      persist();
      showMap();
    }
    if (btn.dataset.act === "map") showMap();
    if (btn.dataset.act === "world") showWorld();
    if (btn.dataset.act === "retry") restartLevel();
    if (btn.dataset.act === "resume") resumeFight();
    if (btn.dataset.act === "shop") openShop();
    if (btn.dataset.act === "fight") startLevel(currentCity.id, nextOpenArena().id);
    if (btn.dataset.act === "hub") showMap();
    if (btn.dataset.act === "travel-skip") finishTravel();
    if (btn.dataset.tab) {
      shopTab = btn.dataset.tab;
      openShop();
    }
    if (btn.dataset.buy) buyItem(btn.dataset.buy);
  }

  function loadSave() {
    const blank = {
      coins: 0,
      best: Number(localStorage.getItem(BEST_KEY) || 0),
      unlocked: 1,
      cleared: [],
      hpBonus: 0,
      atkBonus: 0,
      skin: "default",
      owned: [],
      moves: [],
      punchAnim: "default",
      winAnim: "default",
      seenStory: false,
      lastCity: 1,
      arenas: {},
    };
    try {
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!raw || typeof raw !== "object") return blank;
      const merged = {
        ...blank,
        ...raw,
        moves: raw.moves || [],
        owned: raw.owned || [],
        cleared: raw.cleared || [],
        arenas: raw.arenas && typeof raw.arenas === "object" ? raw.arenas : {},
      };
      if (merged.winAnim === "dance") merged.winAnim = "hop";
      return merged;
    } catch {
      return blank;
    }
  }

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      localStorage.setItem(BEST_KEY, String(save.best));
    } catch {}
    renderCoins();
    if (bestLabel) bestLabel.textContent = String(save.best);
  }

  function renderCoins() {
    if (coinLabel) coinLabel.textContent = String(save.coins);
  }

  function setCityBar(on) {
    if (cityBar) cityBar.hidden = !on;
  }

  function hasMove(id) {
    return save.moves.includes(id);
  }

  function owns(id) {
    return save.owned.includes(id);
  }

  function cityById(id) {
    return CITIES.find((city) => city.id === id) || CITIES[0];
  }

  function isUnlocked(city) {
    return city.id <= save.unlocked;
  }

  function cityArenas(cityId) {
    const key = String(cityId);
    if (!Array.isArray(save.arenas[key])) save.arenas[key] = [];
    return save.arenas[key];
  }

  function arenaCleared(cityId, arenaId) {
    return cityArenas(cityId).includes(arenaId);
  }

  function arenaOpen(arena) {
    if (arena.id === 1) return true;
    return arenaCleared(currentCity.id, arena.id - 1);
  }

  function nextOpenArena() {
    return ARENAS.find((arena) => arenaOpen(arena) && !arenaCleared(currentCity.id, arena.id)) || ARENAS[0];
  }

  function cityFullyCleared(cityId) {
    return ARENAS.every((arena) => arenaCleared(cityId, arena.id));
  }

  function wavesFor(city, arena) {
    const n = city.id;
    const a = arena?.id || 1;
    const pool = ["grunt"];
    if (n >= 2 || a >= 2) pool.push("runner");
    if (n >= 4 || a >= 3) pool.push("jumper");
    if (n >= 7 || a >= 4) pool.push("tank");
    if (n >= 10 || a >= 5) pool.push("thrower");
    return [1, 2, 3, 4, 5].map((w) => {
      const count = 2 + Math.floor(n / 5) + Math.floor(a / 2) + w;
      const list = [];
      for (let i = 0; i < count; i += 1) list.push(pool[(i + w + n + a) % pool.length]);
      if (w === 5 && (a === 5 || n >= 5)) list.push("boss");
      if (w === 5 && n === 20 && a === 5) list.push("boss");
      return list;
    });
  }

  function catalogFor(city) {
    const items = [
      {
        id: `food-${city.id}`,
        name: city.food,
        desc: `${city.name} yiyeceği. +${8 + city.id} can`,
        cost: 18 + city.id * 5,
        type: "hp",
        value: 8 + city.id,
        cat: "güç",
      },
      {
        id: `glove-${city.id}`,
        name: city.glove,
        desc: `${city.keeper} satıyor. +${2 + Math.floor(city.id / 4)} vuruş`,
        cost: 22 + city.id * 6,
        type: "atk",
        value: 2 + Math.floor(city.id / 4),
        cat: "güç",
      },
    ];
    for (const extra of [...SKINS, ...MOVES, ...DANCES]) {
      if (extra.city === city.id) items.push(extra);
    }
    return items;
  }

  function showStory() {
    state = "story";
    hud.hidden = true;
    overlay.hidden = false;
    setCityBar(true);
    const page = STORY[storyPage] || STORY[0];
    overlayCard.className = "overlay-card";
    overlayCard.innerHTML = `
      <p class="eyebrow">Hikaye ${storyPage + 1} / ${STORY.length}</p>
      <h2>${page.title}</h2>
      <p>${page.text}</p>
      <div class="actions">
        <button class="go" type="button" data-act="story">${storyPage === STORY.length - 1 ? "Haritayı aç" : "Devam"}</button>
        <button class="ghost" type="button" data-act="skip">Atla</button>
      </div>
    `;
  }

  function nextStory() {
    if (storyPage >= STORY.length - 1) {
      save.seenStory = true;
      persist();
      showMap();
      return;
    }
    storyPage += 1;
    showStory();
  }

  function showMap() {
    const fromWorld = state === "world" || state === "travel";
    state = "map";
    hud.hidden = true;
    overlay.hidden = true;
    overlayCard.className = "overlay-card";
    standT = 0;
    standId = "";
    mapTarget = null;
    if (fromWorld) {
      mapHero.x = 170;
      mapHero.y = 300;
    }
    setCityBar(true);
  }

  function showWorld() {
    state = "world";
    hud.hidden = true;
    overlay.hidden = true;
    standT = 0;
    standId = "";
    mapTarget = null;
    mapHero.x = currentCity.x;
    mapHero.y = currentCity.y + 28;
    setCityBar(true);
  }

  function showCityHub() {
    showMap();
  }

  function startTravel(city) {
    travelFrom = currentCity;
    currentCity = city;
    save.lastCity = city.id;
    persist();
    state = "travel";
    travelT = TRAVEL_TIME;
    hud.hidden = true;
    overlay.hidden = true;
    setCityBar(false);
    particles.length = 0;
    beep(180, 0.1, "square");
  }

  function finishTravel() {
    travelT = 0;
    arrivedHere = true;
    mapHero.x = 170;
    mapHero.y = 300;
    showMap();
  }

  function tryUseMapSpot(force) {
    if (state === "world") {
      const node = CITIES.find((city) => dist(mapHero, city) <= 26);
      if (node) tryEnterCity(node, force);
      return;
    }
    if (dist(mapHero, SHOP_SPOT) <= SHOP_SPOT.r + 6) {
      openShop();
      return;
    }
    const arena = ARENAS.find((item) => dist(mapHero, item) <= item.r + 6);
    if (arena) tryEnterArena(arena, force);
  }

  function tryEnterArena(arena, force) {
    if (!arenaOpen(arena)) {
      floatText(arena.x - 36, arena.y - 48, "Önce önceki arena", "#ff4d6d");
      beep(90, 0.08, "sawtooth");
      return;
    }
    if (!force && standT < 0.28) return;
    startLevel(currentCity.id, arena.id);
  }

  function tryEnterCity(node, force) {
    if (!isUnlocked(node)) {
      floatText(node.x - 30, node.y - 36, "Kilitli", "#ff4d6d");
      beep(90, 0.08, "sawtooth");
      return;
    }
    if (!force && standT < 0.28) return;
    if (node.id === currentCity.id) {
      showMap();
      return;
    }
    startTravel(node);
  }

  function openShop() {
    if (save.lastCity) currentCity = cityById(save.lastCity);
    state = "shop";
    hud.hidden = true;
    overlay.hidden = false;
    setCityBar(true);
    overlayCard.className = "overlay-card shop-card";
    const catalog = catalogFor(currentCity);
    const tabs = [
      ["hepsi", "Hepsi"],
      ["dans", "Dans"],
      ["kostüm", "Kostüm"],
      ["güç", "Güç"],
      ["vuruş", "Vuruş"],
    ];
    const items = shopTab === "hepsi" ? catalog : catalog.filter((item) => item.cat === shopTab);
    overlayCard.innerHTML = `
      <div class="shop-head">
        <div>
          <p class="eyebrow">${currentCity.name} · ${currentCity.keeper}</p>
          <h2>${currentCity.keeper}'nin Dükkânı</h2>
          <p>Bu şehirde başka şeyler var. Danslar belirli şehirlerde.</p>
        </div>
        <p class="score-line">${save.coins} coin</p>
      </div>
      <div class="shop-tabs">
        ${tabs.map(([id, label]) => `<button type="button" class="${shopTab === id ? "go" : "ghost"}" data-tab="${id}">${label}</button>`).join("")}
      </div>
      <div class="shop-list">
        ${items.length ? items.map(shopRow).join("") : `<p>Bu rafta bir şey yok. Başka şehre git.</p>`}
      </div>
      <div class="actions">
        <button class="ghost" type="button" data-act="map">Şehir haritası</button>
        <button class="ghost" type="button" data-act="world">Şehirler (K)</button>
      </div>
    `;
  }

  function shopRow(item) {
    const bought = owns(item.id);
    const equipped =
      (item.type === "skin" && save.skin === item.value) ||
      (item.type === "punchAnim" && save.punchAnim === item.value) ||
      (item.type === "winAnim" && save.winAnim === item.value) ||
      (item.type === "move" && hasMove(item.value)) ||
      ((item.type === "hp" || item.type === "atk") && bought);
    let label = `${item.cost} coin`;
    let extra = "";
    if (equipped && ["skin", "punchAnim", "winAnim"].includes(item.type)) {
      label = "Üstünde";
      extra = "ghost";
    } else if (bought && ["skin", "punchAnim", "winAnim"].includes(item.type)) {
      label = "Giy";
      extra = "ghost";
    } else if (bought) {
      label = "Alındı";
      extra = "ghost";
    }
    const disabled = (!bought && save.coins < item.cost) || (bought && !["skin", "punchAnim", "winAnim"].includes(item.type));
    return `
      <article class="shop-item">
        <div>
          <h3>${item.name}</h3>
          <p>${item.desc}${item.cat === "dans" ? " · pahalı zafer dansı" : ""}</p>
        </div>
        <button type="button" class="${extra}" data-buy="${item.id}" ${disabled ? "disabled" : ""}>${label}</button>
      </article>
    `;
  }

  function buyItem(id) {
    const item = catalogFor(currentCity).find((entry) => entry.id === id);
    if (!item) return;
    if (owns(item.id)) {
      if (item.type === "skin") save.skin = item.value;
      if (item.type === "punchAnim") save.punchAnim = item.value;
      if (item.type === "winAnim") save.winAnim = item.value;
      persist();
      openShop();
      beep(520, 0.06, "triangle");
      return;
    }
    if (save.coins < item.cost) return;
    save.coins -= item.cost;
    save.owned.push(item.id);
    if (item.type === "hp") save.hpBonus += item.value;
    if (item.type === "atk") save.atkBonus += item.value;
    if (item.type === "move" && !hasMove(item.value)) save.moves.push(item.value);
    if (item.type === "skin") save.skin = item.value;
    if (item.type === "punchAnim") save.punchAnim = item.value;
    if (item.type === "winAnim") save.winAnim = item.value;
    persist();
    openShop();
    beep(640, 0.08, "square");
  }

  function startLevel(id, arenaId) {
    currentCity = cityById(id);
    currentArena = ARENAS.find((item) => item.id === arenaId) || nextOpenArena();
    state = "playing";
    overlay.hidden = true;
    hud.hidden = false;
    setCityBar(false);
    score = 0;
    wave = 1;
    spawnTimer = 0;
    wavePause = 0.9;
    spawnQueue = [];
    enemies = [];
    projectiles.length = 0;
    particles.length = 0;
    floats.length = 0;
    pickups.length = 0;
    shake = 0;
    flash = 0;
    hitstop = 0;
    specialReady = false;
    player = {
      x: W / 2 - 18,
      y: GROUND - 58,
      w: 36,
      h: 58,
      vx: 0,
      vy: 0,
      face: 1,
      hp: 100 + save.hpBonus,
      maxHp: 100 + save.hpBonus,
      atk: 0,
      swing: 0,
      atkCd: 0,
      dash: 0,
      dashCd: 0,
      hurt: 0,
      combo: 0,
      comboT: 0,
      smash: false,
      move: "jab",
      string: 0,
      jumps: 0,
      coyote: 0,
      spin: 0,
    };
    updateHud();
    beep(180, 0.08, "square");
  }

  function restartLevel() {
    startLevel(currentCity.id, currentArena.id);
  }

  function pauseFight() {
    state = "pause";
    overlay.hidden = false;
    overlayCard.className = "overlay-card";
    overlayCard.innerHTML = `
      <h2>Duraklatıldı</h2>
      <p>${currentCity.name} · ${currentArena.name} · Dalga ${wave} / 5</p>
      <div class="actions">
        <button class="go" type="button" data-act="resume">Devam</button>
        <button class="ghost" type="button" data-act="map">Şehir haritası</button>
      </div>
    `;
  }

  function resumeFight() {
    state = "playing";
    overlay.hidden = true;
  }

  function showDead() {
    state = "dead";
    hud.hidden = false;
    overlay.hidden = false;
    overlayCard.className = "overlay-card";
    overlayCard.innerHTML = `
      <h2>Yere serildin</h2>
      <p>${currentArena.name} baştan. 1. dalgaya dönüyorsun.</p>
      <p class="score-line">Skor ${score} · ${save.coins} coin</p>
      <div class="actions">
        <button class="go" type="button" data-act="retry">1. dalgadan dene</button>
        <button class="ghost" type="button" data-act="map">Şehir haritası</button>
      </div>
    `;
  }

  function winAnimName() {
    const item = DANCES.find((entry) => entry.value === save.winAnim);
    return item ? `Şov: ${item.name}` : "Şov yok. Bir şehir dükkânından dans al.";
  }

  function beginWin() {
    state = "win";
    winTimer = save.winAnim === "default" ? 1.8 : 3.3;
    hud.hidden = false;
    overlay.hidden = true;
    const done = cityArenas(currentCity.id);
    if (!done.includes(currentArena.id)) done.push(currentArena.id);
    if (cityFullyCleared(currentCity.id) && !save.cleared.includes(currentCity.id)) {
      save.cleared.push(currentCity.id);
      if (save.unlocked === currentCity.id && currentCity.id < CITIES.length) save.unlocked += 1;
    }
    save.coins += 16 + currentCity.id * 4 + currentArena.id * 4;
    if (score > save.best) save.best = score;
    persist();
    player.spin = 0;
    if (save.winAnim === "boom") burst(player.x + 18, player.y + 20, "#ffd166", 36);
    beep(520, 0.12, "square");
  }

  function showWinCard() {
    overlay.hidden = false;
    overlayCard.className = "overlay-card";
    const cityDone = cityFullyCleared(currentCity.id);
    const nextArena = ARENAS.find((item) => item.id === currentArena.id + 1);
    const nextCity = cityById(currentCity.id + 1);
    overlayCard.innerHTML = `
      <h2>${currentArena.name} bitti</h2>
      <p>${currentCity.name} · 5 / 5 dalga · arena ${currentArena.id} / 5</p>
      <p class="score-line">${winAnimName()}</p>
      <p>${cityDone ? (currentCity.id === 20 ? "20 şehir de temiz." : `Şehir bitti. K'ye bas, ${nextCity.name}'e git.`) : `Sıradaki arena: ${nextArena.name}`}</p>
      <div class="actions">
        <button class="go" type="button" data-act="map">Şehir haritası</button>
        <button class="ghost" type="button" data-act="world">Şehirler (K)</button>
      </div>
    `;
  }

  function tryJump() {
    if (!player || player.dash > 0.08) return;
    const grounded = player.y + player.h >= GROUND - 0.5;
    if (grounded || player.coyote > 0) {
      player.vy = -700;
      player.jumps = hasMove("double") ? 1 : 0;
      player.coyote = 0;
      beep(420, 0.05, "triangle");
      return;
    }
    if (hasMove("double") && player.jumps > 0) {
      player.jumps -= 1;
      player.vy = -640;
      beep(500, 0.04, "triangle");
    }
  }

  function tryAttack() {
    if (!player || player.atk > 0.05 || (player.atkCd > 0 && player.atk <= 0)) return;
    const airborne = player.y + player.h < GROUND - 2;
    const down = keys.has("KeyS") || keys.has("ArrowDown");
    player.smash = player.combo >= 30;
    player.swing += 1;
    if (player.smash) {
      player.move = "super";
      player.atk = 0.28;
      player.atkCd = 0.42;
      specialReady = false;
      flash = 0.12;
      shake = 10;
      beep(90, 0.16, "sawtooth");
      return;
    }
    if (airborne && down && hasMove("slam")) {
      player.move = "slam";
      player.atk = 0.22;
      player.atkCd = 0.34;
      player.vy = 520;
      beep(140, 0.08, "sawtooth");
      return;
    }
    if (airborne) {
      player.move = "air";
      player.atk = 0.16;
      player.atkCd = 0.24;
      beep(260, 0.05, "square");
      return;
    }
    if (player.dash > 0.02) {
      player.move = "dash";
      player.atk = 0.18;
      player.atkCd = 0.28;
      beep(180, 0.06, "square");
      return;
    }
    const chain = ["jab", hasMove("upper") ? "hook" : "jab", hasMove("upper") ? "upper" : "jab"];
    player.move = chain[player.string % 3];
    player.string += 1;
    player.atk = player.move === "upper" ? 0.2 : 0.15;
    player.atkCd = player.move === "upper" ? 0.3 : 0.2;
    beep(240, 0.05, "square");
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
    if (state === "map" || state === "world") updateMap(dt);
    if (state === "travel") updateTravel(dt);
    if (state === "playing") {
      if (hitstop > 0) hitstop -= dt;
      else updateFight(dt);
    }
    if (state === "win") {
      winTimer -= dt;
      updateWinAnim(dt);
      if (winTimer <= 0 && overlay.hidden) showWinCard();
    }
    draw();
    requestAnimationFrame(loop);
  }

  function updateMap(dt) {
    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const up = keys.has("KeyW") || keys.has("ArrowUp");
    const down = keys.has("KeyS") || keys.has("ArrowDown");
    mapHero.vx = (right ? 1 : 0) - (left ? 1 : 0);
    mapHero.vy = (down ? 1 : 0) - (up ? 1 : 0);
    if (!mapHero.vx && !mapHero.vy && mapTarget) {
      const dx = mapTarget.x - mapHero.x;
      const dy = mapTarget.y - mapHero.y;
      if (Math.hypot(dx, dy) < 8) mapTarget = null;
      else {
        mapHero.vx = dx;
        mapHero.vy = dy;
      }
    } else if (mapHero.vx || mapHero.vy) mapTarget = null;
    const len = Math.hypot(mapHero.vx, mapHero.vy) || 1;
    const speed = 220;
    mapHero.x = clamp(mapHero.x + (mapHero.vx / len) * speed * dt, 20, W - 20);
    mapHero.y = clamp(mapHero.y + (mapHero.vy / len) * speed * dt, 20, H - 20);

    let node = null;
    if (state === "world") {
      node = CITIES.find((city) => dist(mapHero, city) <= 24);
      if (node && standId === `c${node.id}`) standT += dt;
      else {
        standId = node ? `c${node.id}` : "";
        standT = 0;
      }
      if (node && standT > 0.32) {
        standT = 0;
        tryEnterCity(node, true);
      }
      hoverNode = node;
    } else {
      const onShop = dist(mapHero, SHOP_SPOT) <= SHOP_SPOT.r + 4;
      node = ARENAS.find((item) => dist(mapHero, item) <= item.r + 4);
      const id = onShop ? "shop" : node ? `a${node.id}` : "";
      if (id && id === standId) standT += dt;
      else {
        standId = id;
        standT = 0;
      }
      if (onShop && standT > 0.32) {
        standT = 0;
        openShop();
        return;
      }
      if (node && standT > 0.32) {
        standT = 0;
        tryEnterArena(node, true);
      }
      hoverNode = onShop ? { name: "Dükkân", keeper: currentCity.keeper } : node;
    }
    for (let i = floats.length - 1; i >= 0; i -= 1) {
      const f = floats[i];
      f.life -= dt;
      f.y -= 28 * dt;
      if (f.life <= 0) floats.splice(i, 1);
    }
  }

  function updateTravel(dt) {
    travelT -= dt;
    if (Math.random() < dt * 10) {
      particles.push({
        x: 820,
        y: 360 + Math.random() * 40,
        vx: -420 - Math.random() * 80,
        vy: (Math.random() - 0.5) * 30,
        s: 3 + Math.random() * 5,
        life: 0.6,
        color: "#ffd166",
      });
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    if (travelT <= 0) finishTravel();
  }

  function updateFight(dt) {
    shake = Math.max(0, shake - dt * 28);
    flash = Math.max(0, flash - dt);
    spawnTimer += dt;
    if (wavePause > 0) {
      wavePause -= dt;
      if (wavePause <= 0) queueWave();
    }
    while (spawnQueue.length && spawnTimer >= spawnQueue[0].at) spawnEnemy(spawnQueue.shift());
    updatePlayer(dt);
    for (const enemy of enemies) updateEnemy(enemy, dt);
    updateProjectiles(dt);
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
      if (wave >= 5) {
        player.hp = Math.min(player.maxHp, player.hp + 8);
        beginWin();
        return;
      }
      player.hp = Math.min(player.maxHp, player.hp + 10);
      wave += 1;
      wavePause = 1.15;
      score += 30 + wave * 6;
      burst(player.x + player.w / 2, player.y, "#35d2ff", 10);
      beep(520, 0.08, "square");
      updateHud();
    }
    if (player.hp <= 0) showDead();
  }

  function updateWinAnim(dt) {
    if (!player) return;
    const t = performance.now() / 1000;
    const style = save.winAnim === "dance" ? "hop" : save.winAnim;
    player.vy = 0;
    player.spin = player.spin || 0;
    if (style === "hop") {
      player.y = GROUND - player.h - Math.abs(Math.sin(t * 10) * 22);
      player.face = Math.sin(t * 8) > 0 ? 1 : -1;
    } else if (style === "robot") {
      player.y = GROUND - player.h;
      player.face = Math.floor(t * 6) % 2 ? 1 : -1;
    } else if (style === "boom") {
      player.y = GROUND - player.h;
      if (Math.random() < dt * 14) burst(player.x + 18, player.y + 20, "#ffd166", 8);
    } else if (style === "slide") {
      player.y = GROUND - player.h;
      player.x = clamp(W / 2 - 18 + Math.sin(t * 3) * 90, 16, W - 54);
      player.face = Math.cos(t * 3) > 0 ? -1 : 1;
    } else if (style === "flip") {
      player.spin += dt * 9;
      player.y = GROUND - player.h - Math.abs(Math.sin(t * 7) * 46);
    } else if (style === "rain") {
      player.y = GROUND - player.h;
      if (Math.random() < dt * 22) {
        particles.push({ x: Math.random() * W, y: 40, vx: 0, vy: 90, s: 4, life: 1.1, color: "#ffd166" });
      }
    } else if (style === "king") {
      player.y = GROUND - player.h - 10;
    } else if (style === "storm") {
      player.y = GROUND - player.h;
      shake = 7;
      if (Math.random() < dt * 6) flash = 0.12;
    } else player.y = GROUND - player.h;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updatePlayer(dt) {
    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const grounded = player.y + player.h >= GROUND - 0.5;
    if (grounded) {
      player.coyote = 0.09;
      player.jumps = hasMove("double") ? 1 : 0;
    } else player.coyote = Math.max(0, player.coyote - dt);
    if (player.dash <= 0) {
      player.vx = 0;
      if (left) {
        player.vx = -310;
        player.face = -1;
      }
      if (right) {
        player.vx = 310;
        player.face = 1;
      }
    } else player.dash -= dt;
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
    if (player.comboT <= 0) {
      player.combo = 0;
      player.string = 0;
    }
    specialReady = player.combo >= 30;
    if (player.dash > 0) {
      for (const enemy of enemies) {
        if (overlap(player, enemy) && enemy.dashHit !== wave + enemy.id) {
          hurtEnemy(enemy, 10 + save.atkBonus, player.face * 260, -80);
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
    if (enemy.type === "jumper" && enemy.y + enemy.h >= GROUND - 0.5 && Math.random() < dt * 0.9) enemy.vy = -620;
    if (enemy.type === "thrower" && enemy.cool <= 0 && Math.abs(mid - emid) > 70) {
      projectiles.push({ x: emid, y: enemy.y + 16, vx: enemy.face * 240, w: 12, h: 12, dmg: 7 + Math.floor(currentCity.id / 5), life: 2.2 });
      enemy.cool = 1.7;
      enemy.wind = 0.12;
    }
    if (enemy.type === "boss" && enemy.cool <= 0 && Math.abs(mid - emid) < 180) {
      enemy.vy = -520;
      enemy.wind = 0.35;
      enemy.cool = 1.6;
    }
    const reach = enemy.type === "boss" ? 70 : 42;
    if (Math.abs(mid - emid) < reach && enemy.cool <= 0 && enemy.type !== "thrower") {
      enemy.wind = enemy.type === "boss" ? 0.28 : 0.2;
      enemy.cool = enemy.type === "boss" ? 1.1 : 0.85;
      enemy.vx = 0;
    } else if (enemy.wind <= 0) enemy.vx = enemy.face * enemy.speed;
    if (enemy.wind > 0 && enemy.wind < 0.04 && overlapGrow(enemy, player, 8)) hurtPlayer(enemy.dmg, enemy.face);
    enemy.vy += GRAVITY * dt;
    enemy.x += enemy.vx * dt;
    enemy.y += enemy.vy * dt;
    land(enemy);
    enemy.x = clamp(enemy.x, 8, W - enemy.w - 8);
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const shot = projectiles[i];
      shot.life -= dt;
      shot.x += shot.vx * dt;
      if (shot.life <= 0 || shot.x < -20 || shot.x > W + 20) {
        projectiles.splice(i, 1);
        continue;
      }
      if (player && overlap(shot, player)) {
        hurtPlayer(shot.dmg, shot.vx > 0 ? 1 : -1);
        projectiles.splice(i, 1);
      }
    }
  }

  function land(body) {
    if (body.y + body.h > GROUND) {
      body.y = GROUND - body.h;
      body.vy = 0;
    }
  }

  function resolveHits() {
    if (!player || player.atk <= 0) return;
    const box = attackBox();
    let hit = false;
    for (const enemy of enemies) {
      if (enemy.hitStamp === player.swing) continue;
      if (!overlap(box, enemy)) continue;
      enemy.hitStamp = player.swing;
      hurtEnemy(enemy, attackDamage(), attackKick().x, attackKick().y);
      hit = true;
    }
    if (hit) {
      player.combo += 1;
      player.comboT = 1.7;
      score += player.smash ? 30 : 10 + player.combo;
      shake = player.smash ? 12 : 5;
      hitstop = player.smash ? 0.08 : 0.045;
      if (player.combo === 30) {
        save.coins += 20;
        persist();
        flash = 0.16;
        floatText(player.x, player.y - 20, "30 COMBO", "#ffd166");
      }
      if (player.combo % 4 === 0) dropPickup();
    }
  }

  function attackBox() {
    const wide = player.smash || player.move === "super";
    if (player.move === "slam") return { x: player.x - 16, y: player.y + player.h - 24, w: player.w + 32, h: 28 };
    if (player.move === "upper") {
      return { x: player.face > 0 ? player.x + 10 : player.x - 20, y: player.y - 18, w: 48, h: 70 };
    }
    return {
      x: player.face > 0 ? player.x + player.w - 6 : player.x - (wide ? 78 : 48),
      y: player.y + (wide ? 4 : 14),
      w: wide ? 84 : 52,
      h: wide ? 54 : 34,
    };
  }

  function attackDamage() {
    const bonus = save.atkBonus;
    if (player.smash || player.move === "super") return 38 + bonus * 2;
    if (player.move === "slam") return 22 + bonus;
    if (player.move === "upper") return 16 + bonus;
    if (player.move === "dash") return 12 + bonus;
    return 14 + bonus;
  }

  function attackKick() {
    if (player.move === "upper") return { x: player.face * 80, y: -430 };
    if (player.move === "slam") return { x: player.face * 40, y: 240 };
    if (player.smash || player.move === "super") return { x: player.face * 480, y: -220 };
    return { x: player.face * 240, y: -120 };
  }

  function hurtEnemy(enemy, dmg, kx, ky) {
    enemy.hp -= dmg;
    enemy.stun = player && player.move === "upper" ? 0.32 : 0.18;
    enemy.vx = kx;
    enemy.vy = ky;
    burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.color, 8);
    floatText(enemy.x, enemy.y, `-${dmg}`, "#ffd166");
    beep(160 + dmg * 4, 0.04, "square");
    if (enemy.hp <= 0) {
      score += enemy.score;
      save.coins += enemy.coins;
      persist();
      burst(enemy.x + enemy.w / 2, enemy.y + 10, "#fff", 16);
      floatText(enemy.x, enemy.y - 12, `+${enemy.coins}`, "#35d2ff");
      if (Math.random() < 0.28) dropPickup(enemy.x, enemy.y);
    }
  }

  function hurtPlayer(dmg, dir) {
    if (!player || player.hurt > 0) return;
    player.hp -= dmg;
    player.hurt = 0.55;
    player.vx = dir * 220;
    player.vy = -180;
    player.combo = 0;
    player.string = 0;
    shake = 8;
    flash = 0.1;
    burst(player.x + 16, player.y + 20, "#ff4d6d", 10);
    beep(80, 0.1, "sawtooth");
  }

  function queueWave() {
    spawnTimer = 0;
    spawnQueue = [];
    const list = wavesFor(currentCity, currentArena)[wave - 1] || ["grunt"];
    list.forEach((type, i) => {
      spawnQueue.push({ type, side: i % 2 === 0 ? -1 : 1, at: 0.18 + i * 0.36 });
    });
  }

  function spawnEnemy(item) {
    const kind = kinds[item.type] || kinds.grunt;
    const n = currentCity.id;
    enemies.push({
      id: enemyId++,
      type: item.type,
      x: item.side < 0 ? 20 : W - kind.w - 20,
      y: GROUND - kind.h,
      w: kind.w,
      h: kind.h,
      vx: 0,
      vy: 0,
      hp: kind.hp + Math.floor(wave * kind.scale) + n * 4,
      speed: kind.speed + Math.min(40, n * 2),
      dmg: kind.dmg + Math.floor(n / 4),
      score: kind.score,
      coins: kind.coins + Math.floor(n / 5),
      color: kind.color,
      face: item.side < 0 ? 1 : -1,
      stun: 0,
      wind: 0,
      cool: 0.2,
    });
  }

  function dropPickup(x = player.x, y = player.y - 20) {
    pickups.push({ x, y, w: 18, h: 18, kind: Math.random() < 0.55 ? "heart" : "star", life: 8 });
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
          save.coins += 8;
          persist();
          floatText(p.x, p.y, "+8", "#ffd166");
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
    if (levelLabel) levelLabel.textContent = `${currentCity.name} · ${currentArena.name}`;
    if (waveLabel) waveLabel.textContent = `${wave} / 5`;
    if (scoreLabel) scoreLabel.textContent = String(score);
    if (comboLabel) comboLabel.textContent = player.combo ? `${player.combo}${specialReady ? "!" : ""}` : "0";
    if (hpFill) hpFill.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  }

  function draw() {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    if (state === "travel") drawTravel();
    else if (state === "world") drawWorld();
    else if (state === "map" || state === "shop" || state === "story" || state === "city") drawMap();
    else {
      drawArena();
      for (const p of pickups) drawPickup(p);
      for (const shot of projectiles) {
        ctx.fillStyle = "#ff4dff";
        ctx.fillRect(shot.x, shot.y, shot.w, shot.h);
      }
      for (const enemy of enemies) drawFighter(enemy, false);
      if (player) drawFighter(player, true);
      if (state === "playing" && wavePause > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(W / 2 - 160, 200, 320, 54);
        ctx.fillStyle = "#f6efe8";
        ctx.font = "900 24px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${currentArena.name} · DALGA ${wave} / 5`, W / 2, 236);
        ctx.textAlign = "left";
      }
    }
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
    if (state === "win") {
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.font = "900 28px Inter, sans-serif";
      ctx.fillText(save.winAnim === "default" ? `${currentCity.name} temiz` : winAnimName(), W / 2, 118);
      ctx.textAlign = "left";
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawHeroDot() {
    ctx.fillStyle = playerPalette().body;
    ctx.beginPath();
    ctx.arc(mapHero.x, mapHero.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = playerPalette().head;
    ctx.beginPath();
    ctx.arc(mapHero.x, mapHero.y - 11, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMap() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#14101c");
    sky.addColorStop(1, "#0a0810");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1a1520";
    ctx.fillRect(0, 250, W, 46);
    ctx.fillRect(430, 0, 100, H);
    ctx.fillStyle = "#121018";
    [{ x: 40, y: 30, w: 90, h: 70 }, { x: 300, y: 24, w: 100, h: 72 }, { x: 560, y: 28, w: 90, h: 68 }, { x: 40, y: 430, w: 70, h: 80 }].forEach((b) => {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    const shopPulse = 1 + Math.sin(performance.now() / 220) * 0.07;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,209,102,0.2)";
    ctx.arc(SHOP_SPOT.x, SHOP_SPOT.y, SHOP_SPOT.r * shopPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffd166";
    ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.font = "900 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DÜKKÂN", SHOP_SPOT.x, SHOP_SPOT.y - 4);
    ctx.font = "800 11px Inter, sans-serif";
    ctx.fillText(currentCity.keeper, SHOP_SPOT.x, SHOP_SPOT.y + 12);

    for (const arena of ARENAS) {
      const open = arenaOpen(arena);
      const done = arenaCleared(currentCity.id, arena.id);
      const pulse = 1 + Math.sin(performance.now() / 240 + arena.id) * 0.06;
      ctx.beginPath();
      ctx.fillStyle = done ? "rgba(143,255,106,0.18)" : open ? "rgba(53,210,255,0.2)" : "rgba(255,255,255,0.06)";
      ctx.arc(arena.x, arena.y, arena.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = done ? "#8fff6a" : open ? "#35d2ff" : "#5a5060";
      ctx.stroke();
      ctx.fillStyle = open ? "#f6efe8" : "#8a8090";
      ctx.font = "900 13px Inter, sans-serif";
      ctx.fillText(`ARENA ${arena.id}`, arena.x, arena.y - 2);
      ctx.font = "800 11px Inter, sans-serif";
      ctx.fillText(done ? `${arena.name} ✓` : open ? arena.name : "Kilit", arena.x, arena.y + 14);
    }

    drawHeroDot();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(8,6,12,0.78)";
    ctx.fillRect(12, 10, 460, 58);
    ctx.fillStyle = "#f6efe8";
    ctx.font = "900 17px Inter, sans-serif";
    ctx.fillText(`${currentCity.name} · 5 arena`, 24, 34);
    ctx.fillStyle = "#b8a8b0";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.fillText("Mavi daire = dövüş. Sarı = dükkân. K = diğer şehirler.", 24, 54);

    if (hoverNode) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 15px Inter, sans-serif";
      ctx.fillText(hoverNode.name === "Dükkân" ? `${currentCity.keeper}'nin dükkânı` : `${hoverNode.name} · 5 dalga`, W / 2, H - 16);
      ctx.textAlign = "left";
    }
  }

  function drawWorld() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1a1010");
    sky.addColorStop(1, "#08060a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(80,40,30,0.35)";
    for (let i = 0; i < 18; i += 1) {
      ctx.beginPath();
      ctx.arc((i * 97) % W, (i * 61) % H, 18 + (i % 5) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,77,109,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    CITIES.forEach((city, i) => {
      if (i === 0) ctx.moveTo(city.x, city.y);
      else ctx.lineTo(city.x, city.y);
    });
    ctx.stroke();

    for (const city of CITIES) {
      const open = isUnlocked(city);
      const pulse = 1 + Math.sin(performance.now() / 250 + city.id) * 0.05;
      ctx.beginPath();
      ctx.fillStyle = open ? "rgba(53,210,255,0.2)" : "rgba(255,255,255,0.05)";
      ctx.arc(city.x, city.y, 18 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = city.id === currentCity.id ? "#ffd166" : open ? "#35d2ff" : "#4a4450";
      ctx.stroke();
      ctx.fillStyle = open ? "#f6efe8" : "#6a6270";
      ctx.font = "800 10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(city.id, city.x, city.y + 3);
      if (save.cleared.includes(city.id)) {
        ctx.fillStyle = "#8fff6a";
        ctx.fillText("✓", city.x, city.y + 26);
      }
    }

    drawHeroDot();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(8,6,12,0.78)";
    ctx.fillRect(12, 10, 470, 58);
    ctx.fillStyle = "#f6efe8";
    ctx.font = "900 17px Inter, sans-serif";
    ctx.fillText("Şehirler · K ile kapat", 24, 34);
    ctx.fillStyle = "#b8a8b0";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.fillText("Başka şehre tıkla, Hako 10 saniye araba sürer.", 24, 54);

    if (hoverNode && hoverNode.keeper) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.font = "800 16px Inter, sans-serif";
      ctx.fillText(
        `${hoverNode.name} · 5 arena · ${hoverNode.keeper}${isUnlocked(hoverNode) ? "" : " · kilit"}`,
        W / 2,
        H - 16
      );
      ctx.textAlign = "left";
    }
  }

  function drawTravel() {
    const gone = TRAVEL_TIME - travelT;
    const scroll = gone * 280;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#12080c");
    sky.addColorStop(1, "#1a1014");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#2a1810";
    for (let i = 0; i < 8; i += 1) {
      const x = ((i * 160 - scroll) % (W + 160)) - 80;
      const h = 70 + ((i * 37) % 90);
      ctx.fillRect(x, GROUND - h - 40, 70, h + 40);
    }
    ctx.fillStyle = "#161018";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#3a3030";
    for (let x = -((scroll / 2) % 48); x < W; x += 48) ctx.fillRect(x, GROUND + 18, 28, 6);

    const carX = 300 + Math.sin(gone * 8) * 4;
    const carY = GROUND - 78;
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(carX, carY, 150, 48);
    ctx.fillStyle = "#102028";
    ctx.fillRect(carX + 70, carY + 8, 50, 22);
    ctx.fillStyle = playerPalette().body;
    ctx.fillRect(carX + 84, carY + 12, 18, 16);
    ctx.fillStyle = playerPalette().head;
    ctx.fillRect(carX + 86, carY + 4, 14, 10);
    ctx.fillStyle = playerPalette().eye;
    ctx.fillRect(carX + 94, carY + 7, 4, 3);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(carX + 28, carY + 50, 14, 0, Math.PI * 2);
    ctx.arc(carX + 122, carY + 50, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(carX + 28, carY + 50, 8, gone * 10, gone * 10 + 1.4);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#f6efe8";
    ctx.font = "900 34px Inter, sans-serif";
    ctx.fillText(`Hako ${currentCity.to} gidiyor`, W / 2, 120);
    ctx.fillStyle = "#b8a8b0";
    ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText(travelFrom && travelFrom.id !== currentCity.id ? `${travelFrom.name} → ${currentCity.name}` : currentCity.name, W / 2, 152);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(W / 2 - 180, 180, 360, 10);
    ctx.fillStyle = "#35d2ff";
    ctx.fillRect(W / 2 - 180, 180, 360 * (1 - Math.max(0, travelT) / TRAVEL_TIME), 10);
    ctx.fillStyle = "#ffd166";
    ctx.font = "800 14px Inter, sans-serif";
    ctx.fillText(travelT > 8 ? `${Math.ceil(travelT)} sn` : `${Math.ceil(Math.max(0, travelT))} sn · tıkla atla`, W / 2, 210);
    ctx.textAlign = "left";
  }

  function drawArena() {
    const theme = currentArena.theme || currentCity.theme;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (theme === "metro") {
      sky.addColorStop(0, "#0a0c10");
      sky.addColorStop(1, "#12141a");
    } else if (theme === "neon") {
      sky.addColorStop(0, "#1a0820");
      sky.addColorStop(1, "#120816");
    } else if (theme === "roof") {
      sky.addColorStop(0, "#12081a");
      sky.addColorStop(1, "#1a0c12");
    } else if (theme === "arena") {
      sky.addColorStop(0, "#1a0a10");
      sky.addColorStop(1, "#10060a");
    } else {
      sky.addColorStop(0, "#140816");
      sky.addColorStop(1, "#1a0c12");
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0a0710";
    const roofs = [40, 130, 210, 300, 390, 500, 610, 720, 820];
    roofs.forEach((x, i) => {
      const h = 90 + ((i * 47) % 110);
      ctx.fillRect(x, GROUND - h - 40, 70, h + 40);
      ctx.fillStyle = i % 2 ? "rgba(53,210,255,0.12)" : "rgba(255,77,109,0.12)";
      ctx.fillRect(x + 12, GROUND - h, 12, 16);
      ctx.fillStyle = "#0a0710";
    });
    ctx.fillStyle = "#161018";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(0, GROUND, W, 4);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < W; x += 48) ctx.fillRect(x, GROUND + 18, 24, 3);
  }

  function playerPalette() {
    if (save.skin === "gold") return { body: "#ffd166", head: "#3a2a08", eye: "#fff", mark: "#7a4a00" };
    if (save.skin === "shadow") return { body: "#2a2430", head: "#0c0a10", eye: "#ff4d6d", mark: "#ff4d6d" };
    if (save.skin === "neon") return { body: "#ff4dff", head: "#101828", eye: "#35d2ff", mark: "#35d2ff" };
    return { body: "#35d2ff", head: "#102028", eye: "#ffd166", mark: "#071012" };
  }

  function drawFighter(body, isPlayer) {
    const blink = body.hurt > 0 && Math.floor(performance.now() / 60) % 2 === 0;
    if (blink && isPlayer) ctx.globalAlpha = 0.45;
    const x = body.x;
    const y = body.y;
    if (isPlayer && body.spin) {
      ctx.save();
      ctx.translate(x + body.w / 2, y + body.h / 2);
      ctx.rotate(body.spin);
      ctx.translate(-(x + body.w / 2), -(y + body.h / 2));
    }
    const pal = isPlayer ? playerPalette() : null;
    if (isPlayer && body.atk > 0) {
      ctx.fillStyle = body.smash ? "rgba(255,209,102,0.45)" : "rgba(53,210,255,0.35)";
      const hx = body.face > 0 ? x + body.w - 4 : x - (body.smash ? 70 : 42);
      ctx.fillRect(hx, y + 12, body.smash ? 76 : 46, 28);
    }
    ctx.fillStyle = isPlayer ? pal.body : body.color;
    ctx.fillRect(x + 6, y + 16, body.w - 12, body.h - 20);
    ctx.fillStyle = isPlayer ? pal.head : "#140810";
    ctx.fillRect(x + 8, y, body.w - 16, 20);
    ctx.fillStyle = isPlayer ? pal.eye : "#fff";
    const eye = body.face > 0 ? x + body.w - 16 : x + 8;
    ctx.fillRect(eye, y + 7, 7, 6);
    if (isPlayer && state === "win" && save.winAnim === "king") {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 6, y - 12, body.w - 12, 8);
    }
    if (isPlayer) {
      ctx.fillStyle = pal.mark;
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
      const max = (kinds[body.type]?.hp || 26) + wave * (kinds[body.type]?.scale || 1) + currentCity.id * 4;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(x, y - 8, body.w, 4);
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(x, y - 8, body.w * Math.max(0, body.hp / max), 4);
    }
    ctx.globalAlpha = 1;
    if (isPlayer && body.spin) ctx.restore();
  }

  function drawPickup(p) {
    ctx.fillStyle = p.kind === "heart" ? "#ff4d6d" : "#ffd166";
    ctx.fillRect(p.x, p.y, 16, 16);
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

  function canvasPoint(event) {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * W,
      y: ((event.clientY - box.top) / box.height) * H,
    };
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
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
