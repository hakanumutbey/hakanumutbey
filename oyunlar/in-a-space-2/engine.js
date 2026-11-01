// IN A SPACE 2 — çekirdek: render, giriş, üçüncü şahıs kamera (Minecraft F5 gibi, omuz üstü), oyuncu
// (dayanıklılık, tırmanma, süzülme — 1'den), dövüş (Manyetik Balyoz: vur, fırlat, geri çağır), düşmanlar,
// mermiler, HUD (God of War referansı), diyalog ve seçimler, ses, kontrol noktası, kayıt.
// models.js modelleri, world.js bölgeleri, story.js 22 bölümü kurar.
"use strict";

const TEST = location.search.includes("test");
// Dokunmatik cihaz: fare kilidi yok (telefonda requestPointerLock ya yok ya hata veriyor), kontroller mobile.js'te
const TOUCH = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;
function lockPointer() {
  if (TOUCH || TEST) return;
  try { const p = $("gameCanvas").requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* desteklenmiyor */ }
}
const $ = id => document.getElementById(id);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// ---------------------------------------------------------------- render
const renderer = new THREE.WebGLRenderer({ canvas: $("gameCanvas"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 3000);
camera.rotation.order = "YXZ";
scene.add(camera);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Güneş oyuncuyu izler; gölge kutusu yalnızca çevresini kapsar (açık dünyada tüm haritaya gölge pahalı)
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a3025, 0.55);
scene.add(hemi);
// Fener oyuncunun göğsünde; kapalıyken yoğunluğu 0 (ışık sayısı değişince materyaller yeniden derleniyordu)
const flashlight = new THREE.SpotLight(0xfff1d6, 0, 34, 0.5, 0.5, 1.2);
scene.add(flashlight, flashlight.target);

// ---------------------------------------------------------------- durum
const G = {
  zone: null, zones: {}, enemies: [], projectiles: [], flags: {}, running: false, ended: false, uiOpen: null,
  time: 0, admin: false, cutscene: false, cine: null, marker: null, markerLabel: "", boss: null, chapter: 0,
  respawn: null, scrap: 0, up: { dmg: 0, hp: 0, throw: 0, bip: 0 }, stats: { deaths: 0, kills: 0 },
  timeScale: 1, hitStop: 0, o2Drain: 0, bip: null, I: {}, alarm: false, freeRoam: false
};
const player = {
  pos: V3(0, 0, 0), vy: 0, yaw: 0, camYaw: 0, camPitch: -0.25, r: 0.38, onGround: true,
  health: 100, maxHealth: 100, over: 0, overT: 0, stamina: 100, maxStamina: 100, exhausted: false, staminaRest: 0,
  climbing: null, gliding: false, o2: 100, light: false, battery: 100, dead: false, aiming: false,
  moving: false, running: false, push: V3(0, 0, 0), invuln: 0, rig: null, lastSafe: V3(0, 0, 0),
  attack: null, combo: 0, comboT: 0, dodge: null, dodgeCd: 0, hurtT: 0, bipCd: 0,
  hammer: { state: "hand", pos: V3(), vel: V3(), t: 0, mesh: null, hits: new Set() }, hasHammer: true
};
const keys = {};
let interactRequested = false, spaceTap = false, mouseSens = 0.0022 * 1.2;
const updaters = [];          // world/story her karede çağrılacak fonksiyonları buraya ekler
const visuals = [];           // duraklatılmışken de dönen görsel animasyonlar
const STEP = 0.4;             // bu kadar alçak kenara yürüyerek çıkılır

// ---------------------------------------------------------------- bölgeler
function makeZone(name, opts) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const z = Object.assign({
    name, group, colliders: [], interact: [], gravity: 9.8, jump: 5.2, speed: 4.2,
    vacuum: false, ground: () => 0, bg: 0x000000, fog: 0, fogColor: undefined, spawn: [0, 0, 0],
    update: null, onEnter: null, temp: 18, title: null, killY: -40,
    sunColor: 0xffffff, sunIntensity: 1.2, sunDir: [0.5, 1, 0.3], hemiSky: 0xbfd8ff, hemiGround: 0x3a3025, hemiIntensity: 0.55,
    exposure: 1.15, areas: []
  }, opts);
  G.zones[name] = z;
  return z;
}

function setZone(name, x, z, yaw) {
  const zone = G.zones[name];
  for (const k in G.zones) G.zones[k].group.visible = (k === name);
  G.zone = zone;
  scene.background = new THREE.Color(zone.bg);
  scene.fog = zone.fog ? new THREE.FogExp2(zone.fogColor === undefined ? zone.bg : zone.fogColor, zone.fog) : null;
  sun.color.setHex(zone.sunColor);
  sun.intensity = zone.sunIntensity;
  hemi.color.setHex(zone.hemiSky);
  hemi.groundColor.setHex(zone.hemiGround);
  hemi.intensity = zone.hemiIntensity;
  renderer.toneMappingExposure = zone.exposure;
  player.pos.set(x, groundAt(zone, x, z, 999), z);
  player.lastSafe.copy(player.pos);
  player.vy = 0;
  player.climbing = null;
  player.gliding = false;
  if (yaw !== undefined) { player.yaw = yaw; player.camYaw = yaw; player.camPitch = -0.22; }
  if (player.rig) { scene.add(player.rig.root); }
  if (G.bip) scene.add(G.bip.root);
  lastArea = null;
  if (zone.onEnter) zone.onEnter();
  snapCamera();
}

// ---------------------------------------------------------------- çarpışma
// Kutu çarpıştırıcılar (XZ düzleminde). `top` verilmişse üstüne çıkılır (tırmanılan kayalar, platformlar):
// ayakları o yükseklikteki oyuncuyu engellemez, zemini olur. `h` kameranın içinden geçemeyeceği yükseklik.
function addCollider(zone, minX, maxX, minZ, maxZ, extra) {
  const c = Object.assign({ minX, maxX, minZ, maxZ, on: true }, extra || {});
  zone.colliders.push(c);
  return c;
}
function boxCollider(zone, x, z, w, d, extra) { return addCollider(zone, x - w / 2, x + w / 2, z - d / 2, z + d / 2, extra); }

function circleHits(x, z, r, c) {
  const cx = clamp(x, c.minX, c.maxX), cz = clamp(z, c.minZ, c.maxZ);
  const dx = x - cx, dz = z - cz;
  return dx * dx + dz * dz < r * r;
}
function blockedAt(zone, x, z, r, feetY) {
  for (const c of zone.colliders) {
    if (!c.on) continue;
    if (feetY !== undefined && c.top !== undefined && feetY >= c.top - STEP) continue;
    if (c.bottom !== undefined && feetY !== undefined && feetY + 1.7 < c.bottom) continue;
    if (circleHits(x, z, r, c)) return true;
  }
  return false;
}
function groundAt(zone, x, z, feetY) {
  let g = zone.ground(x, z);
  for (const c of zone.colliders) {
    if (c.top === undefined || !c.on) continue;
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && feetY >= c.top - STEP) g = Math.max(g, c.top);
  }
  return g;
}
// Bir nokta katı mı? (kamera, mermi ve fırlatılan balyoz için)
function solidAt(zone, x, y, z) {
  if (y < zone.ground(x, z) - 0.05) return true;
  for (const c of zone.colliders) {
    if (!c.on || c.noSolid) continue;
    if (x < c.minX || x > c.maxX || z < c.minZ || z > c.maxZ) continue;
    const top = c.top !== undefined ? c.top : (c.h !== undefined ? (c.base || 0) + c.h : 8);
    const bottom = c.bottom !== undefined ? c.bottom : -999;
    if (y < top && y > bottom) return true;
  }
  return false;
}
function segBox(ax, az, bx, bz, c) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const clip = (p, q) => {
    if (Math.abs(p) < 1e-9) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, ax - c.minX) && clip(dx, c.maxX - ax) && clip(-dz, az - c.minZ) && clip(dz, c.maxZ - az) && t0 <= t1;
}
function lineBlocked(ax, az, bx, bz, zone) {
  zone = zone || G.zone;
  for (const c of zone.colliders) {
    if (!c.on || c.seeThrough || c.top !== undefined && c.top < 1.2) continue;
    if (segBox(ax, az, bx, bz, c)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- giriş
let adminArmed = false, altGrHeld = false;
function handleAdminCombo(e) {
  // ADMIN MODU (Hakan'ın Kayıp Odalar'daki kombinasyonu): AltGr basılıyken önce Ctrl, sonra 7.
  if (e.code === "AltRight") { altGrHeld = true; adminArmed = false; return false; }
  const altGr = altGrHeld || (e.getModifierState && e.getModifierState("AltGraph"));
  if (!altGr) { adminArmed = false; return false; }
  if (e.code === "ControlLeft" || e.code === "ControlRight") { adminArmed = true; return false; }
  if (e.code === "Digit7" && adminArmed) { adminArmed = false; e.preventDefault(); toggleAdmin(); return true; }
  return false;
}
function toggleAdmin() {
  G.admin = !G.admin;
  $("adminBadge").style.display = G.admin ? "block" : "none";
  toast(G.admin ? "ADMİN MODU: ölümsüzlük, sınırsız dayanıklılık/oksijen, Aşırı Yük hep dolu, hızlı koşu." : "Admin modu kapandı.", 3500);
  sfx(G.admin ? "power" : "click");
}

const mouse = { left: false, right: false };
addEventListener("keydown", e => {
  if (handleAdminCombo(e)) return;
  if (G.uiOpen) {
    if (e.code === "Escape" || (e.code === "KeyE" && (G.uiOpen === "upgradeScreen" || G.uiOpen === "travelScreen"))) closeUI();
    return;
  }
  if (choiceActive && /^Digit[1-3]$/.test(e.code)) { pickChoice(+e.code.slice(5) - 1); return; }
  keys[e.code] = true;
  if (e.code === "KeyE" && !e.repeat) interactRequested = true;
  if (!G.running || G.cutscene || player.dead) return;
  if (e.code === "Space") { e.preventDefault(); if (!e.repeat) spaceTap = true; }
  if (e.code === "KeyF" && !e.repeat) toggleFlashlight();
  if (e.code === "KeyR" && !e.repeat) recallHammer();
  if (e.code === "KeyC" && !e.repeat) startDodge();
  if (e.code === "KeyV" && !e.repeat) activateOvercharge();
  if (e.code === "KeyQ" && !e.repeat) bipCommand();
  if (e.code === "Tab") e.preventDefault();
});
addEventListener("keyup", e => {
  keys[e.code] = false;
  if (e.code === "AltRight") { altGrHeld = false; adminArmed = false; }
});
addEventListener("blur", () => { for (const k in keys) keys[k] = false; altGrHeld = false; mouse.left = mouse.right = false; });

const canvas = $("gameCanvas");
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("click", () => {
  if (G.running && !G.uiOpen && !player.dead && !G.ended && document.pointerLockElement !== canvas) lockPointer();
});
addEventListener("mousedown", e => {
  if (!G.running || G.uiOpen || player.dead || document.pointerLockElement !== canvas) return;
  if (e.button === 0) { mouse.left = true; if (!G.cutscene) attackPressed(); }
  if (e.button === 2) mouse.right = true;
});
addEventListener("mouseup", e => {
  if (e.button === 0) mouse.left = false;
  if (e.button === 2) mouse.right = false;
});
addEventListener("mousemove", e => {
  if (document.pointerLockElement !== canvas || G.uiOpen) return;
  lookDelta(e.movementX, e.movementY);
});
// Fare ve dokunmatik bakış aynı yoldan geçer
function lookDelta(mx, my) {
  const k = player.aiming ? 0.6 : 1;
  player.camYaw -= mx * mouseSens * k;
  player.camPitch = clamp(player.camPitch - my * mouseSens * k, -1.15, 0.8);
  if (G.mouseHook) G.mouseHook(mx, my);
}
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  $("clickHint").style.display = (!locked && G.running && !G.uiOpen && !player.dead && !G.ended && !TEST) ? "block" : "none";
  if (!locked && G.running && !G.uiOpen && !player.dead && !G.ended && !TEST) openUI("pauseMenu");
});

// ---------------------------------------------------------------- arayüz pencereleri
function openUI(id) {
  G.uiOpen = id;
  for (const k in keys) keys[k] = false;
  mouse.left = mouse.right = false;
  $(id).style.display = "flex";
  $("clickHint").style.display = "none";
  if (document.pointerLockElement) document.exitPointerLock();
  if (id === "pauseMenu") $("pauseInfo").innerText = `Bölüm ${G.chapter}: ${CHAPTER_NAME()}\nÖlüm: ${G.stats.deaths} · Yenilen Vorak: ${G.stats.kills}`;
}
function closeUI() {
  if (!G.uiOpen) return;
  $(G.uiOpen).style.display = "none";
  G.uiOpen = null;
  if (G.running && !TEST && !TOUCH) {
    lockPointer();
    setTimeout(() => { if (document.pointerLockElement !== canvas && !G.uiOpen && G.running) $("clickHint").style.display = "block"; }, 150);
  }
}
const CHAPTER_NAME = () => (window.CHAPTERS && CHAPTERS[G.chapter - 1]) ? CHAPTERS[G.chapter - 1].name : "";
$("btnResume").onclick = () => closeUI();
$("sens").oninput = e => { mouseSens = 0.0022 * parseFloat(e.target.value); };

// ---------------------------------------------------------------- bildirimler
let toastTimer = 0;
function toast(text, ms) {
  const t = $("toast");
  t.innerText = text;
  t.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = 0; }, ms || 2600);
}
let areaT = 0;
function showArea(title, sub) {
  $("areaS").innerText = sub || "BÖLGE KEŞFEDİLDİ";
  $("areaT").innerText = title.toLocaleUpperCase("tr");
  $("area").style.opacity = 1;
  areaT = 4.2;
  sfx("area");
}
function acquired(name, amount) {
  const box = $("acquired");
  if (!box.querySelector(".h")) { const h = document.createElement("div"); h.className = "h"; h.textContent = "ALINDI"; box.appendChild(h); }
  const row = document.createElement("div");
  row.className = "acq";
  const n = document.createElement("span"); n.textContent = name;
  const a = document.createElement("b"); a.textContent = amount !== undefined ? "+" + amount : "";
  row.append(n, a);
  box.appendChild(row);
  sfx("pickup");
  setTimeout(() => { row.remove(); if (!box.querySelector(".acq")) box.innerHTML = ""; }, 3800);
}
function addScrap(n) { G.scrap += n; acquired("Hurda", n); }

let tutT = 0;
function tutorial(head, html, sec) {
  $("tutH").innerText = head;
  $("tutT").innerHTML = html;
  $("tutorial").style.opacity = 1;
  tutT = sec || 7;
}

let lastObjective = "";
function setObjective(text) {
  if (text === lastObjective) return;
  lastObjective = text;
  $("objText").innerText = text;
  if (text) sfx("quest");
}
function setMarker(x, y, z, label) {
  G.marker = x === null ? null : V3(x, y, z);
  G.markerLabel = label || "";
}

// ---------------------------------------------------------------- diyalog
// say([[kim, metin], ...], bitince) — sırayla, kendi kendine ilerleyen altyazılar (God of War gibi oyun
// akarken konuşulur). ask([...seçenekler], seçilince(i)) — 1/2/3 ile seçilen diyalog seçenekleri.
const SPEAKER = {
  "Kaptan": "#ffb43c", "Başkan Carter": "#9fc7ff", "BİP": "#7fd8ff", "Kerem": "#9be37a", "Selin": "#ff9fc4",
  "Bora": "#ffd36a", "Oru": "#6ff0d2", "Lumi": "#6ff0d2", "Zhal": "#ff5a4a", "Grax": "#ff7a3a", "Vorakh": "#ff3a5a",
  "Vorak": "#ff5a4a", "Telsiz": "#c8c8c8", "NASA": "#9fc7ff", "Anons": "#c8c8c8", "Mila": "#c3a6ff"
};
const sayQueue = [];
let sayTimer = 0, sayBusy = false;
function say(lines, done) {
  for (const l of lines) sayQueue.push(l);
  if (done) sayQueue.push({ done });
}
function talking() { return sayBusy || sayQueue.length > 0; }
function updateSay(dt) {
  sayTimer -= dt;
  if (sayTimer > 0) return;
  const el = $("subtitle");
  while (sayQueue.length && sayQueue[0].done) sayQueue.shift().done();
  if (!sayQueue.length) { el.style.display = "none"; sayBusy = false; return; }
  const [who, text] = sayQueue.shift();
  sayBusy = true;
  el.innerHTML = "";
  const w = document.createElement("span"); w.className = "who"; w.textContent = who + ":"; w.style.color = SPEAKER[who] || "#e9e4d8";
  el.append(w, document.createTextNode(text));
  el.style.display = "block";
  sayTimer = (1.5 + text.length * 0.052) / (TEST ? 12 : 1);
  if (who === "BİP") sfx("beep");
}
let choiceActive = null;
function ask(options, cb) {
  const box = $("choices");
  box.innerHTML = "";
  options.forEach((o, i) => {
    const b = document.createElement("button");
    const n = document.createElement("b"); n.textContent = i + 1;
    b.append(n, document.createTextNode(o));
    b.onclick = () => pickChoice(i);
    box.appendChild(b);
  });
  box.style.display = "flex";
  choiceActive = { cb, n: options.length };
  if (TEST && window.BOT_CHOICE !== undefined) after(0.05, () => pickChoice(window.BOT_CHOICE));
}
function pickChoice(i) {
  if (!choiceActive || i >= choiceActive.n) return;
  const c = choiceActive;
  choiceActive = null;
  $("choices").style.display = "none";
  sfx("click");
  c.cb(i);
}

// ---------------------------------------------------------------- can, ölüm
let damageFlash = 0;
function hurt(amount, reason, from) {
  if (G.admin || player.dead || G.ended || G.cutscene) return;
  if (player.invuln > 0) return;
  if (player.overT > 0) amount *= 0.5;
  player.health -= amount;
  player.hurtT = 0.3;
  damageFlash = Math.min(0.85, damageFlash + amount * 0.035);
  player.over = Math.min(100, player.over + amount * 0.6);
  if (from) {
    const dx = player.pos.x - from.x, dz = player.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    player.push.set(dx / d * Math.min(9, amount * 0.5), 0, dz / d * Math.min(9, amount * 0.5));
  }
  shake = Math.max(shake, Math.min(1, amount * 0.05));
  if (amount > 3) sfx("hurt");
  if (player.health <= 0) die(reason);
}
function heal(amount) { player.health = Math.min(player.maxHealth, player.health + amount); }

function die(reason) {
  player.health = 0;
  player.dead = true;
  player.climbing = null;
  player.gliding = false;
  G.stats.deaths++;
  for (const k in keys) keys[k] = false;
  $("deathReason").innerText = reason || "";
  $("deathScreen").style.display = "flex";
  if (document.pointerLockElement) document.exitPointerLock();
}
function respawn() {
  $("deathScreen").style.display = "none";
  player.dead = false;
  player.health = player.maxHealth;
  player.stamina = player.maxStamina;
  player.exhausted = false;
  player.o2 = 100;
  player.push.set(0, 0, 0);
  player.attack = null; player.dodge = null;
  if (player.hammer.state !== "hand") catchHammer(true);
  clearProjectiles();
  sayQueue.length = 0; sayTimer = 0;
  if (G.respawn) G.respawn();
  lockPointer();
}
$("btnRetry").onclick = respawn;
function checkpoint(fn) { G.respawn = fn; }

// ---------------------------------------------------------------- ses (WebAudio sentezi + basit müzik)
let AC = null;
function ac() {
  if (TEST) return null;
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  return AC;
}
function tone(freq, dur, type, vol, slide, delay) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol || 0.1, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master());
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol, freq, type) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = type || "lowpass"; f.frequency.value = freq || 1000; g.gain.value = vol || 0.2;
  s.connect(f); f.connect(g); g.connect(master()); s.start();
}
let masterGain = null;
function master() {
  const a = ac();
  if (!masterGain) { masterGain = a.createGain(); masterGain.gain.value = 0.8; masterGain.connect(a.destination); }
  return masterGain;
}
const SFX = {
  click: () => tone(880, 0.05, "square", 0.04),
  beep: () => { tone(1300, 0.05, "square", 0.035); tone(1700, 0.05, "square", 0.03, 0, 0.07); },
  pickup: () => { tone(660, 0.1, "triangle", 0.1); tone(990, 0.16, "triangle", 0.1, 0, 0.08); },
  quest: () => [392, 523, 659].forEach((f, i) => tone(f, 0.5, "triangle", 0.06, 0, i * 0.11)),
  area: () => { tone(98, 2.5, "sawtooth", 0.05); [196, 294, 392].forEach((f, i) => tone(f, 2.2, "sine", 0.05, 0, i * 0.2)); },
  swing: () => noise(0.18, 0.12, 2200, "bandpass"),
  hit: () => { noise(0.12, 0.35, 700); tone(110, 0.15, "square", 0.12, -50); },
  heavy: () => { noise(0.3, 0.5, 450); tone(70, 0.35, "sine", 0.3, -30); },
  throw: () => noise(0.35, 0.14, 1600, "bandpass"),
  catch: () => { tone(420, 0.08, "square", 0.08); tone(1200, 0.2, "triangle", 0.08, -300, 0.02); },
  clang: () => { tone(900, 0.25, "triangle", 0.08, -200); noise(0.08, 0.2, 3000); },
  shield: () => { tone(300, 0.2, "square", 0.08, 200); noise(0.1, 0.15, 4000, "highpass"); },
  roll: () => noise(0.3, 0.08, 500),
  laser: () => tone(1400, 0.16, "sawtooth", 0.07, -1000),
  plasma: () => { tone(500, 0.25, "sawtooth", 0.06, -350); noise(0.15, 0.06, 1500); },
  explosion: () => { noise(1.6, 0.6, 500); tone(55, 1.2, "sine", 0.4, -30); },
  alarm: () => { tone(760, 0.3, "square", 0.05); tone(540, 0.3, "square", 0.05, 0, 0.34); },
  hurt: () => tone(150, 0.16, "square", 0.09, -60),
  power: () => tone(90, 1.0, "sawtooth", 0.08, 320),
  powerDown: () => tone(400, 1.2, "sawtooth", 0.08, -360),
  over: () => { tone(110, 1.2, "sawtooth", 0.1, 220); [330, 440, 660].forEach((f, i) => tone(f, 0.6, "triangle", 0.06, 0, i * 0.08)); },
  roar: () => { tone(80, 1.4, "sawtooth", 0.18, -30); noise(1.2, 0.25, 300); tone(160, 1.0, "square", 0.05, -80); },
  alien: () => tone(260 + Math.random() * 90, 0.4, "sawtooth", 0.05, -160),
  alienDie: () => { tone(320, 0.6, "sawtooth", 0.07, -260); noise(0.4, 0.1, 900); },
  windup: () => tone(200, 0.4, "triangle", 0.06, 400),
  beam: () => { tone(60, 3, "sawtooth", 0.12, 900); noise(3, 0.15, 2000); },
  warp: () => { tone(50, 3, "sawtooth", 0.06, 500); noise(2.5, 0.08, 900); },
  jet: () => noise(0.25, 0.05, 1800),
  tired: () => { tone(300, 0.25, "sine", 0.06, -120); tone(260, 0.3, "sine", 0.05, -100, 0.3); },
  wrong: () => tone(180, 0.35, "square", 0.07),
  step: () => noise(0.05, 0.03, 600),
  weld: () => noise(0.13, 0.06, 3500),
  heartbeat: () => { tone(60, 0.15, "sine", 0.3); tone(55, 0.15, "sine", 0.25, 0, 0.22); },
  rumble: () => { noise(2.5, 0.35, 200); tone(40, 2.5, "sine", 0.3); }
};
function sfx(name) { try { if (SFX[name]) SFX[name](); } catch (e) { /* ses yoksa oyun sürsün */ } }

// Basit müzik: ruh haline göre yavaş akorlar (sakin / gergin / savaş / destan). Ses dosyası yok, hepsi sentez.
const MOODS = {
  calm: { chords: [[110, 165, 220, 277], [98, 147, 196, 247], [87, 131, 175, 220], [98, 147, 196, 294]], len: 6, vol: 0.022, type: "sine" },
  tense: { chords: [[73, 110, 156], [69, 104, 147], [78, 117, 165], [73, 110, 139]], len: 4, vol: 0.026, type: "triangle" },
  battle: { chords: [[55, 82, 110, 165], [52, 78, 104, 156], [62, 93, 123, 185], [58, 87, 116, 175]], len: 2, vol: 0.03, type: "sawtooth", drum: true },
  epic: { chords: [[65, 98, 131, 196], [73, 110, 147, 220], [82, 123, 165, 247], [98, 147, 196, 294]], len: 3, vol: 0.03, type: "sawtooth", drum: true },
  none: null
};
let mood = "none", moodT = 0, chordI = 0;
function music(m) { if (m !== mood) { mood = m; moodT = 0; chordI = 0; } }
function updateMusic(dt) {
  const M = MOODS[mood];
  if (!M || TEST) return;
  moodT -= dt;
  if (moodT > 0) return;
  moodT = M.len;
  const ch = M.chords[chordI++ % M.chords.length];
  const a = ac(); if (!a) return;
  for (const f of ch) {
    const t0 = a.currentTime;
    const o = a.createOscillator(), g = a.createGain(), flt = a.createBiquadFilter();
    o.type = M.type; o.frequency.value = f;
    flt.type = "lowpass"; flt.frequency.value = M.type === "sawtooth" ? 700 : 2000;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(M.vol, t0 + M.len * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t0 + M.len * 1.1);
    o.connect(flt); flt.connect(g); g.connect(master());
    o.start(t0); o.stop(t0 + M.len * 1.15);
  }
  if (M.drum) for (let i = 0; i < M.len * 2; i++) tone(55, 0.25, "sine", i % 2 ? 0.08 : 0.16, -25, i * 0.5);
}

// ---------------------------------------------------------------- fener, oksijen, dayanıklılık
function toggleFlashlight() {
  if (!player.light && player.battery <= 0) { toast("Fenerin pili bitti.", 2000); return; }
  player.light = !player.light;
  sfx("click");
}
function useStamina(n) {
  if (G.admin) return;
  player.staminaRest = 0;
  player.stamina = Math.max(0, player.stamina - n);
  if (player.stamina <= 0 && !player.exhausted) {
    player.exhausted = true;
    player.climbing = null;
    player.gliding = false;
    sfx("tired");
  }
}
function updateStamina(dt) {
  player.staminaRest += dt;
  if (player.staminaRest > 0.6 && player.onGround && !player.climbing) {
    player.stamina = Math.min(player.maxStamina, player.stamina + (player.exhausted ? 30 : 45) * dt);
    if (player.exhausted && player.stamina >= player.maxStamina) player.exhausted = false;
  }
}
let o2Beep = 0;
function updateOxygen(dt) {
  const drain = G.zone.vacuum ? (G.zone.o2Rate || 1.2) : G.o2Drain;
  if (drain > 0 && !G.admin) {
    player.o2 = Math.max(0, player.o2 - drain * dt * (player.running ? 1.5 : 1));
    if (player.o2 <= 0) hurt(14 * dt, "Oksijenin bitti.");
    if (player.o2 < 25) { o2Beep -= dt; if (o2Beep <= 0) { sfx("beep"); o2Beep = 1; } }
  } else if (drain <= 0) player.o2 = Math.min(100, player.o2 + 10 * dt);
}

// ---------------------------------------------------------------- hareket (üçüncü şahıs)
let stepTimer = 0;
function climbStep(dt, f) {
  const c = player.climbing;
  player.moving = f > 0;
  player.running = false;
  if (f <= 0 || player.exhausted || !c.on) { player.climbing = null; return; }   // bırakınca düşer
  player.vy = 0;
  player.pos.y += (G.admin ? 4 : 2.2) * dt;
  useStamina(8 * dt);
  stepTimer -= dt;
  if (stepTimer <= 0) { sfx("step"); stepTimer = 0.32; }
  if (player.pos.y >= c.top - 0.05) {
    // Kenardan yukarı çık: kutunun içine adım at
    player.pos.y = c.top;
    player.pos.x = clamp(player.pos.x - Math.sin(player.yaw) * 0.8, c.minX + 0.3, c.maxX - 0.3);
    player.pos.z = clamp(player.pos.z - Math.cos(player.yaw) * 0.8, c.minZ + 0.3, c.maxZ - 0.3);
    player.climbing = null;
    player.onGround = true;
  }
}
function land(vy) {
  if (-vy > 13 && !player.glidedRecently) hurt((-vy - 13) * 6, "Yüksekten düştün.");
  sfx("step");
}

function movePlayer(dt) {
  const zone = G.zone;
  let [f, s] = moveInput();
  if (player.climbing) { climbStep(dt, f); spaceTap = false; return; }
  const sin = Math.sin(player.camYaw), cos = Math.cos(player.camYaw);
  let dx = -sin * f + cos * s, dz = -cos * f - sin * s;
  const len = Math.hypot(dx, dz);
  player.moving = len > 0.05;
  const busy = player.attack && player.attack.t < player.attack.lock;
  // joystick sonuna kadar itilince koşar (Roblox gibi; ayrı koş tuşu gerekmez)
  const stickRun = G.stick && Math.hypot(G.stick.x, G.stick.y) > 0.92;
  player.running = !!(keys.ShiftLeft || keys.ShiftRight || stickRun) && player.moving && !player.exhausted && player.onGround && !player.aiming;
  let speed = zone.speed * (player.running ? 1.75 : 1) * (player.exhausted ? 0.6 : 1) * (G.admin ? 1.6 : 1);
  if (G.stick && !player.running) speed *= Math.min(1, 0.35 + len);      // az itince yavaş yürür
  if (player.aiming) speed *= 0.55;
  if (busy) speed *= 0.25;
  if (player.gliding) speed = Math.max(speed, 6.5);
  // Yön: yürürken gövde hareket yönüne döner; nişan alırken kameraya bakar
  if (player.aiming) player.yaw = player.camYaw;
  else if (len > 0 && !busy) {
    const want = Math.atan2(-dx, -dz);
    player.yaw += wrapAngle(want - player.yaw) * Math.min(1, dt * 12);
  }
  if (player.dodge) {
    const d = player.dodge;
    dx = d.dx * 11 * dt; dz = d.dz * 11 * dt;
  } else if (len > 0) { dx = dx / len * speed * dt; dz = dz / len * speed * dt; }
  if (player.running) useStamina(14 * dt);
  dx += player.push.x * dt;
  dz += player.push.z * dt;
  player.push.multiplyScalar(Math.max(0, 1 - dt * 6));
  const total = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(total / 0.08));
  for (let i = 0; i < steps; i++) {
    const nx = player.pos.x + dx / steps, nz = player.pos.z + dz / steps;
    if (!blockedAt(zone, nx, player.pos.z, player.r, player.pos.y) && !stepTooHigh(nx, player.pos.z)) player.pos.x = nx;
    if (!blockedAt(zone, player.pos.x, nz, player.r, player.pos.y) && !stepTooHigh(player.pos.x, nz)) player.pos.z = nz;
  }
  // Tırmanma: tırmanılabilir bir kayaya doğru yürüyünce (1'deki gibi W)
  if (f > 0 && !player.exhausted && player.stamina > 0 && !player.dodge) {
    const px = player.pos.x - Math.sin(player.yaw) * 0.5, pz = player.pos.z - Math.cos(player.yaw) * 0.5;
    for (const c of zone.colliders) {
      if (c.climb && c.on && player.pos.y < c.top - STEP && player.pos.y >= (c.climbFrom || -999) && circleHits(px, pz, 0.15, c)) {
        player.climbing = c;
        player.gliding = false;
        player.vy = 0;
        spaceTap = false;
        tutorialOnce("climb", "TIRMANMA", "Kayaya doğru <kbd>W</kbd> basılı tut. Dayanıklılık çarkı biterse düşersin.");
        return;
      }
    }
  }
  // Zıplama; havada ikinci basış jetpack süzülmesini açıp kapatır (1'den)
  if (spaceTap) {
    if (player.onGround && zone.jump > 0 && !player.exhausted && player.stamina > 0) {
      player.vy = zone.jump;
      player.onGround = false;
      useStamina(5);
    } else if (!player.onGround && G.flags.jetpack !== false && !player.exhausted && player.stamina > 0) {
      player.gliding = !player.gliding;
      if (player.gliding) { player.glidedRecently = true; sfx("jet"); }
    }
  }
  spaceTap = false;
  if (player.gliding) { useStamina(10 * dt); if (Math.random() < dt * 5) sfx("jet"); }
  const ground = groundAt(zone, player.pos.x, player.pos.z, player.pos.y);
  player.vy -= zone.gravity * dt;
  if (player.gliding) player.vy = Math.max(player.vy, -1.6);
  player.pos.y += player.vy * dt;
  if (player.pos.y <= ground || (player.onGround && player.vy <= 0 && player.pos.y - ground < STEP)) {
    if (!player.onGround) land(player.vy);
    player.pos.y = ground;
    player.vy = 0;
    player.onGround = true;
    player.gliding = false;
    player.glidedRecently = false;
    if (!zone.noSafe || !zone.noSafe(player.pos.x, player.pos.z)) player.lastSafe.copy(player.pos);
  } else player.onGround = false;
  // Uçuruma düşmek: God of War gibi kenara geri koyar, biraz can yakar
  if (player.pos.y < zone.killY) {
    hurt(15, "Uçuruma düştün.");
    player.pos.copy(player.lastSafe);
    player.vy = 0;
    fadeFlash();
  }
  if (player.moving && player.onGround) {
    stepTimer -= dt * (player.running ? 1.6 : 1);
    if (stepTimer <= 0) { sfx("step"); stepTimer = 0.4; }
  }
}
// Hareket girişi: [ileri, yan]. Joystick (mobile.js, G.stick) basılıysa analog, değilse WASD.
function moveInput() {
  if (G.stick && (G.stick.x || G.stick.y)) return [-G.stick.y, G.stick.x];
  return [(keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)];
}
// Zemin fonksiyonundaki dik yamaçlar duvar sayılır (dağ eteğinden yürüyerek çıkılmasın)
function stepTooHigh(x, z) {
  if (!player.onGround) return false;
  const g = G.zone.ground(x, z);
  return g - player.pos.y > 0.9;
}

// ---------------------------------------------------------------- kamera
let shake = 0, camDist = 4.6;
const camPos = V3(), _fw = V3(), _rt = V3(), _tg = V3();
function cameraTarget(out) { return out.set(player.pos.x, player.pos.y + 1.55, player.pos.z); }
function desiredCam(out, distOverride) {
  const y = player.camYaw, p = player.camPitch;
  _fw.set(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
  _rt.set(Math.cos(y), 0, -Math.sin(y));
  cameraTarget(_tg);
  const side = player.aiming ? 0.85 : 0.55;
  const want = distOverride !== undefined ? distOverride : (player.aiming ? 2.4 : 4.6);
  // kamera çarpışması: hedeften geriye doğru ilerle, katı bir şeye değince dur
  let d = 0;
  const stepL = 0.15;
  while (d < want) {
    const nd = Math.min(want, d + stepL);
    const x = _tg.x - _fw.x * nd + _rt.x * side * (nd / want), yy = _tg.y - _fw.y * nd, z = _tg.z - _fw.z * nd + _rt.z * side * (nd / want);
    if (solidAt(G.zone, x, yy - 0.2, z)) break;
    d = nd;
  }
  return { dist: Math.max(0.6, d), side, want };
}
function snapCamera() { const r = desiredCam(camPos); camDist = r.dist; }
function updateCamera(dt) {
  if (G.cine) {
    const c = typeof G.cine === "function" ? G.cine(dt) : G.cine;
    if (c) {
      camera.position.copy(c.pos);
      camera.lookAt(c.look);
      if (c.fov && camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
      if (c.roll) camera.rotateZ(c.roll);
    }
  } else {
    if (camera.fov !== 62) { camera.fov = 62; camera.updateProjectionMatrix(); }
    const r = desiredCam(camPos);
    camDist = r.dist < camDist ? r.dist : lerp(camDist, r.dist, Math.min(1, dt * 4));
    const y = player.camYaw, p = player.camPitch;
    cameraTarget(_tg);
    camera.position.set(
      _tg.x - _fw.x * camDist + _rt.x * r.side * (camDist / r.want),
      _tg.y - _fw.y * camDist + 0.15,
      _tg.z - _fw.z * camDist + _rt.z * r.side * (camDist / r.want));
    const gy = G.zone.ground(camera.position.x, camera.position.z) + 0.3;
    if (camera.position.y < gy) camera.position.y = gy;
    // kapalı yerlerde (mağara) kamera tavanın altında kalır
    const ceil = G.zone.ceil && G.zone.ceil(player.pos.x, player.pos.z);
    if (ceil !== null && ceil !== undefined && camera.position.y > ceil - 0.4) camera.position.y = ceil - 0.4;
    camera.rotation.set(p, y, 0);
  }
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.25;
    camera.position.y += (Math.random() - 0.5) * shake * 0.25;
    shake = Math.max(0, shake - dt * 2.2);
  }
  // güneş ve gölge kutusu oyuncuyu izler
  const sd = G.zone.sunDir;
  sun.position.set(player.pos.x + sd[0] * 80, player.pos.y + sd[1] * 80, player.pos.z + sd[2] * 80);
  sun.target.position.copy(player.pos);
  // fener göğüsten ileri
  flashlight.position.set(player.pos.x, player.pos.y + 1.4, player.pos.z);
  flashlight.target.position.set(player.pos.x - Math.sin(player.camYaw) * 8, player.pos.y + 1.0 + Math.sin(player.camPitch) * 8, player.pos.z - Math.cos(player.camYaw) * 8);
}
function fadeFlash() { $("fade").style.transition = "none"; $("fade").style.opacity = 0.7; requestAnimationFrame(() => { $("fade").style.transition = "opacity 0.7s"; $("fade").style.opacity = 0; }); }

// ---------------------------------------------------------------- dövüş: Manyetik Balyoz
const DMG = () => (1 + G.up.dmg * 0.25) * (player.overT > 0 ? 2 : 1);
const COMBO = [
  { dmg: 22, lock: 0.32, len: 0.5, hitAt: 0.16, range: 2.7, arc: 1.3, push: 3 },
  { dmg: 24, lock: 0.32, len: 0.5, hitAt: 0.16, range: 2.7, arc: 1.3, push: 3 },
  { dmg: 48, lock: 0.55, len: 0.8, hitAt: 0.34, range: 3.2, arc: 2.2, push: 9, heavy: true }
];
function attackPressed() {
  if (player.dead || G.cutscene || player.climbing) return;
  if (player.aiming && player.hammer.state === "hand" && player.hasHammer) { throwHammer(); return; }
  if (player.attack && player.attack.t < player.attack.lock) { player.attack.queued = true; return; }
  startAttack();
}
function startAttack() {
  const unarmed = player.hammer.state !== "hand" || !player.hasHammer;
  if (player.comboT <= 0) player.combo = 0;
  const c = unarmed ? { dmg: 9, lock: 0.25, len: 0.35, hitAt: 0.12, range: 2.0, arc: 1.2, push: 2 } : COMBO[player.combo % 3];
  player.attack = Object.assign({ t: 0, hit: false, idx: unarmed ? 9 : player.combo % 3, unarmed }, c);
  player.combo++;
  player.comboT = 0.9;
  // hafif hedef yardımı: öndeki en yakın düşmana dön
  const e = nearestEnemy(4.5, player.yaw, 1.6);
  if (e) player.yaw = Math.atan2(-(e.pos.x - player.pos.x), -(e.pos.z - player.pos.z));
  else if (player.moving) {
    const [f, s] = moveInput();
    const sin = Math.sin(player.camYaw), cos = Math.cos(player.camYaw);
    player.yaw = Math.atan2(-(-sin * f + cos * s), -(-cos * f - sin * s));
  } else player.yaw = player.camYaw;
  useStamina(c.heavy ? 8 : 3);
  sfx("swing");
}
function updateAttack(dt) {
  player.comboT -= dt;
  const a = player.attack;
  if (!a) return;
  a.t += dt;
  if (!a.hit && a.t >= a.hitAt) {
    a.hit = true;
    let any = false;
    for (const e of G.enemies) {
      if (e.dead || e.zone !== G.zone) continue;
      const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
      if (d > a.range + e.r) continue;
      if (Math.abs((e.fly ? e.y - player.pos.y : 0)) > 3) continue;
      const ang = Math.abs(wrapAngle(Math.atan2(-dx, -dz) - player.yaw));
      if (ang > a.arc / 2 + Math.atan2(e.r, d)) continue;
      damageEnemy(e, a.dmg * DMG(), { melee: true, push: a.push, heavy: a.heavy });
      any = true;
    }
    if (G.hitTargets) for (const t of G.hitTargets) if (t.zone === G.zone && t.active() && t.pos.distanceTo(player.pos) < a.range + (t.r || 0.6)) { t.hit("melee"); any = true; }
    if (any) { G.hitStop = a.heavy ? 0.09 : 0.05; shake = Math.max(shake, a.heavy ? 0.6 : 0.3); sfx(a.heavy ? "heavy" : "hit"); }
  }
  if (a.t >= a.len) {
    const q = a.queued;
    player.attack = null;
    if (q) startAttack();
  } else if (a.queued && a.t >= a.lock) { player.attack = null; startAttack(); }
}
function nearestEnemy(range, yaw, arc) {
  let best = null, bd = range;
  for (const e of G.enemies) {
    if (e.dead || e.zone !== G.zone || e.hidden) continue;
    const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d > bd) continue;
    if (arc !== undefined && Math.abs(wrapAngle(Math.atan2(-dx, -dz) - yaw)) > arc) continue;
    best = e; bd = d;
  }
  return best;
}

function throwHammer() {
  const h = player.hammer;
  if (h.state !== "hand") return;
  camera.getWorldDirection(_fw);
  // Balyozu kameranın baktığı noktaya gönder: nişangâh nereyi gösteriyorsa oraya gider
  const aimPoint = V3().copy(camera.position).addScaledVector(_fw, 40);
  const start = V3(player.pos.x, player.pos.y + 1.5, player.pos.z).addScaledVector(_rt, 0.4);
  h.vel.copy(aimPoint).sub(start).normalize().multiplyScalar(36 + G.up.throw * 6);
  h.pos.copy(start);
  h.state = "flying";
  h.t = 0;
  h.hits.clear();
  detachHammer();
  sfx("throw");
  player.attack = { t: 0, lock: 0.25, len: 0.35, hitAt: 99, hit: true, idx: 5 };
  tutorialOnce("recall", "GERİ ÇAĞIR", "Balyozu geri çağırmak için <kbd>R</kbd>. Dönerken yolundaki düşmanlara da çarpar.");
}
function recallHammer() {
  const h = player.hammer;
  if (h.state === "flying" || h.state === "stuck") { h.state = "returning"; h.t = 0; h.hits.clear(); sfx("throw"); }
}
function catchHammer(silent) {
  const h = player.hammer;
  h.state = "hand";
  attachHammer();
  if (!silent) { sfx("catch"); shake = Math.max(shake, 0.25); }
}
const _hv = V3();
function updateHammer(dt) {
  const h = player.hammer;
  if (h.state === "hand") return;
  h.t += dt;
  const m = h.mesh;
  if (h.state === "flying") {
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      h.pos.addScaledVector(h.vel, dt / steps);
      if (h.t > 0.15) h.vel.y -= 4 * dt / steps;
      const e = hammerHitsEnemy(h.pos, 1.0);
      if (e && !h.hits.has(e)) {
        h.hits.add(e);
        damageEnemy(e, 40 * DMG() * (1 + G.up.throw * 0.2), { thrown: true, push: 4 });
        G.hitStop = 0.06; sfx("heavy");
        h.state = "stuck"; h.vel.set(0, 0, 0); h.stuckTo = e; break;
      }
      if (G.hitTargets) {
        const t = G.hitTargets.find(t => t.zone === G.zone && t.active() && t.pos.distanceTo(h.pos) < (t.r || 0.8));
        if (t) { t.hit("thrown"); h.state = "stuck"; h.stuckTo = null; sfx("clang"); break; }
      }
      if (solidAt(G.zone, h.pos.x, h.pos.y, h.pos.z) || h.t > 1.6) {
        h.state = "stuck"; h.stuckTo = null; sfx("clang");
        const gy = G.zone.ground(h.pos.x, h.pos.z);
        if (h.pos.y < gy + 0.3) h.pos.y = gy + 0.3;
        break;
      }
    }
    m.rotation.x -= dt * 22;
  } else if (h.state === "stuck") {
    if (h.stuckTo && !h.stuckTo.dead) h.pos.set(h.stuckTo.pos.x, (h.stuckTo.fly ? h.stuckTo.y : h.stuckTo.pos.y) + h.stuckTo.h * 0.6, h.stuckTo.pos.z);
    else if (h.stuckTo && h.stuckTo.dead) { h.stuckTo = null; h.pos.y = G.zone.ground(h.pos.x, h.pos.z) + 0.3; }
    // takılıyken düşman donar (balyozun mıknatısı) — God of War'daki dondurmanın bizim karşılığı
    if (h.stuckTo) h.stuckTo.stun = Math.max(h.stuckTo.stun, 0.2);
  } else if (h.state === "returning") {
    const hand = _hv.set(player.pos.x, player.pos.y + 1.3, player.pos.z);
    const d = hand.distanceTo(h.pos);
    const sp = Math.min(55, 18 + h.t * 60);
    if (d < sp * dt + 0.4) { catchHammer(); return; }
    h.pos.addScaledVector(hand.sub(h.pos).normalize(), sp * dt);
    h.pos.y += Math.sin(h.t * 6) * 0.04;
    const e = hammerHitsEnemy(h.pos, 1.1);
    if (e && !h.hits.has(e)) { h.hits.add(e); damageEnemy(e, 22 * DMG(), { thrown: true, push: 3 }); sfx("hit"); }
    m.rotation.x += dt * 26;
  }
  m.position.copy(h.pos);
  if (h.state === "flying" || h.state === "returning") m.rotation.y = player.yaw;
}
function hammerHitsEnemy(p, r) {
  for (const e of G.enemies) {
    if (e.dead || e.zone !== G.zone) continue;
    const ey = (e.fly ? e.y : e.pos.y) + e.h * 0.5;
    const dx = e.pos.x - p.x, dz = e.pos.z - p.z, dy = ey - p.y;
    if (dx * dx + dz * dz < (r + e.r) * (r + e.r) && Math.abs(dy) < e.h * 0.6 + r) return e;
  }
  return null;
}
function attachHammer() {
  const h = player.hammer;
  if (!player.rig || !h.mesh) return;
  player.rig.hand.add(h.mesh);
  h.mesh.position.set(0, -0.12, 0);
  h.mesh.rotation.set(0, 0, 0);
  h.mesh.visible = player.hasHammer;
}
function detachHammer() {
  const h = player.hammer;
  scene.add(h.mesh);
  h.mesh.position.copy(h.pos);
  h.mesh.visible = true;
}

function startDodge() {
  if (player.dodge || player.dodgeCd > 0 || !player.onGround || player.climbing || player.exhausted) return;
  const [f, s] = moveInput();
  const sin = Math.sin(player.camYaw), cos = Math.cos(player.camYaw);
  let dx = -sin * f + cos * s, dz = -cos * f - sin * s;
  if (!f && !s) { dx = Math.sin(player.yaw); dz = Math.cos(player.yaw); }   // tuş yoksa geriye
  const l = Math.hypot(dx, dz) || 1;
  player.dodge = { t: 0, dx: dx / l, dz: dz / l };
  player.invuln = 0.4;
  player.attack = null;
  player.dodgeCd = 0.7;
  useStamina(18);
  sfx("roll");
}
function updateDodge(dt) {
  player.dodgeCd -= dt;
  player.invuln = Math.max(0, player.invuln - dt);
  if (player.dodge) { player.dodge.t += dt; if (player.dodge.t > 0.42) player.dodge = null; }
}
function activateOvercharge() {
  if (player.over < 100 || player.overT > 0) { if (player.over < 100) toast("Aşırı Yük dolmadı. Vurdukça ve hasar aldıkça dolar.", 1800); return; }
  player.overT = 10;
  player.over = 0;
  sfx("over");
  shake = 0.8;
  // çevredeki düşmanları savuran şok dalgası
  for (const e of G.enemies) {
    if (e.dead || e.zone !== G.zone) continue;
    if (e.pos.distanceTo(player.pos) < 6) damageEnemy(e, 30, { push: 10 });
  }
}
function bipCommand() {
  if (!G.bip || !G.flags.bip) return;
  if (player.bipCd > 0) return;
  const e = nearestEnemy(30);
  if (!e) { say([["BİP", "Hedef yok Kaptan."]]); player.bipCd = 1; return; }
  player.bipCd = 7 - G.up.bip;
  G.bip.burst = { target: e, n: 5, t: 0 };
  say([["BİP", ["Ateş!", "Hedefe kilitlendim!", "Bip bip, yakaladım!"][Math.floor(Math.random() * 3)]]]);
}

// ---------------------------------------------------------------- düşmanlar
// Vorak düşmanları dayanıklı ve saldırgan (Hakan'ın isteği): uzaktan fark eder, gruptakiler birbirini uyarır,
// saldırıdan önce kısa bir uyarı (gözler parlar) verir. Kalkanlı önden vurulmaz; arkadan ya da balyoz fırlatarak.
const ETYPES = {
  hunter: { hp: 110, speed: 4.6, dmg: 13, range: 2.0, windup: 0.45, cool: 1.2, r: 0.5, h: 2.0, aggro: 24, scrap: 12 },
  shooter: { hp: 85, speed: 3.4, dmg: 11, range: 16, windup: 0.6, cool: 2.0, r: 0.5, h: 2.1, aggro: 28, scrap: 14, ranged: true, keep: 9 },
  brute: { hp: 260, speed: 2.8, dmg: 24, range: 2.8, windup: 0.85, cool: 1.8, r: 0.9, h: 2.9, aggro: 22, scrap: 30, shield: 70 },
  drone: { hp: 55, speed: 5.5, dmg: 8, range: 14, windup: 0.5, cool: 1.6, r: 0.5, h: 0.8, aggro: 30, scrap: 10, ranged: true, keep: 7, fly: 2.6 },
  stalker: { hp: 140, speed: 6.0, dmg: 16, range: 2.2, windup: 0.35, cool: 1.0, r: 0.5, h: 2.2, aggro: 26, scrap: 20 }
};
function spawnEnemy(zone, type, x, z, opts) {
  const T = ETYPES[type] || {};
  const o = opts || {};
  const e = Object.assign({
    type, zone, pos: V3(x, 0, z), yaw: o.yaw || 0, hp: 0, maxHp: 0, r: T.r || 0.6, h: T.h || 2,
    state: "idle", t: 0, atkT: 1 + Math.random(), wind: 0, stun: 0, dead: false, deadT: 0, alerted: false,
    vel: V3(), home: V3(x, 0, z), flash: 0, y: 0
  }, T, o);
  e.maxHp = e.hp = (o.hp || T.hp || 100) * (o.hpMul || 1);
  if (T.shield) e.shieldHp = T.shield;
  e.pos.y = groundAt(zone, x, z, o.spawnY !== undefined ? o.spawnY : 999);
  e.y = (e.fly ? flyBase(e) : e.pos.y) + (e.fly || 0);
  e.rig = o.rig || makeEnemyModel(type);
  rememberMats(e.rig.root);
  zone.group.add(e.rig.root);
  e.rig.root.position.copy(e.pos);
  G.enemies.push(e);
  return e;
}
function clearEnemies(zone) {
  for (const e of G.enemies) if (!zone || e.zone === zone) { if (e.rig && e.rig.root.parent) e.rig.root.parent.remove(e.rig.root); e.dead = true; e.removed = true; }
  G.enemies = G.enemies.filter(e => !e.removed);
  for (const el of ebarPool) el.style.display = "none";
}
function aliveEnemies(tag) { return G.enemies.filter(e => !e.dead && (!tag || e.tag === tag)); }

function damageEnemy(e, amount, info) {
  if (e.dead || e.invuln) return;
  info = info || {};
  if (e.shieldHp > 0) {
    // önden gelen yakın dövüş vuruşu kalkana takılır
    const toP = Math.atan2(-(player.pos.x - e.pos.x), -(player.pos.z - e.pos.z));
    const front = Math.abs(wrapAngle(toP - e.yaw)) < 1.2;
    if (info.thrown || info.heavy) {
      e.shieldHp -= info.thrown ? 80 : 35;
      sfx("shield");
      if (e.shieldHp <= 0) { if (e.rig.shield) e.rig.shield.visible = false; toast("Kalkan kırıldı!", 1200); }
      if (front && !info.thrown) { e.stun = 0.4; return; }
    } else if (front && info.melee) { sfx("shield"); e.flash = 0.1; e.stun = 0.1; player.push.set(-Math.sin(player.yaw) * -4, 0, -Math.cos(player.yaw) * -4); return; }
  }
  if (e.armor) amount *= e.armor;
  e.hp -= amount;
  e.flash = 0.15;
  e.alerted = true;
  player.over = Math.min(100, player.over + amount * 0.18);
  if (player.overT > 0) heal(1.5);
  if (info.push && !e.boss) {
    const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
    e.vel.set(dx / d * info.push, 0, dz / d * info.push);
  }
  if (!e.boss) { e.stun = Math.max(e.stun, info.heavy ? 0.6 : 0.25); if (e.wind > 0 && info.heavy) e.wind = 0; }
  if (e.onHit) e.onHit(amount, info);
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  e.deadT = 0;
  G.stats.kills++;
  sfx(e.boss ? "roar" : "alienDie");
  if (e.scrap) addScrap(e.scrap + Math.floor(Math.random() * 6));
  if (Math.random() < 0.25 && !e.boss) dropHealth(e.zone, e.pos.x, e.pos.z);
  if (player.hammer.stuckTo === e) { player.hammer.stuckTo = null; }
  if (e.onDeath) e.onDeath();
}
// Yeşil can taşı (God of War'daki can taşlarının bizim karşılığı: Lumi şifa tohumu)
const pickups = [];
function dropHealth(zone, x, z) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshStandardMaterial({ color: 0x6fe37a, emissive: 0x2f9a3a, emissiveIntensity: 1.2 }));
  m.position.set(x, zone.ground(x, z) + 0.5, z);
  zone.group.add(m);
  pickups.push({ zone, mesh: m, t: 0 });
}
function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt;
    p.mesh.rotation.y += dt * 2;
    p.mesh.position.y += Math.sin(p.t * 3) * 0.004;
    if (p.zone !== G.zone) continue;
    const d = Math.hypot(p.mesh.position.x - player.pos.x, p.mesh.position.z - player.pos.z);
    if (d < 4 && player.health < player.maxHealth) {
      p.mesh.position.lerp(V3(player.pos.x, player.pos.y + 1, player.pos.z), Math.min(1, dt * 6));
      if (d < 0.8) { heal(25); acquired("Şifa tohumu"); p.zone.group.remove(p.mesh); pickups.splice(i, 1); }
    }
    if (p.t > 60) { p.zone.group.remove(p.mesh); pickups.splice(i, 1); }
  }
}

const _ev = V3();
function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.zone !== G.zone) continue;
    if (e.dead) {
      e.deadT += dt;
      if (e.rig) {
        animateEnemy(e, dt);
        if (e.deadT > 2.2) { e.rig.root.visible = false; }
      }
      continue;
    }
    if (e.hidden) { e.rig.root.visible = false; continue; }
    e.rig.root.visible = true;
    e.flash = Math.max(0, e.flash - dt);
    if (e.ai) e.ai(e, dt);
    else basicAI(e, dt);
    // itme ve çarpışma
    if (e.vel.lengthSq() > 0.01) {
      const nx = e.pos.x + e.vel.x * dt, nz = e.pos.z + e.vel.z * dt;
      if (!blockedAt(e.zone, nx, e.pos.z, e.r * 0.8, e.pos.y) && !enemySlope(e, nx, e.pos.z)) e.pos.x = nx;
      if (!blockedAt(e.zone, e.pos.x, nz, e.r * 0.8, e.pos.y) && !enemySlope(e, e.pos.x, nz)) e.pos.z = nz;
      e.vel.multiplyScalar(Math.max(0, 1 - dt * 5));
    }
    if (!e.boss) e.pos.y = enemyGround(e, e.pos.x, e.pos.z);
    if (e.fly) e.y = lerp(e.y, flyBase(e) + e.fly + Math.sin(G.time * 2 + e.pos.x) * 0.3, Math.min(1, dt * 3));
    animateEnemy(e, dt);
  }
  G.enemies = G.enemies.filter(e => !(e.dead && e.deadT > 3 && !e.keep && (e.rig.root.parent && e.rig.root.parent.remove(e.rig.root), true)));
}
function basicAI(e, dt) {
  const dx = player.pos.x - e.pos.x, dz = player.pos.z - e.pos.z, d = Math.hypot(dx, dz);
  const seen = !player.dead && !G.cutscene && (d < e.aggro && !lineBlocked(e.pos.x, e.pos.z, player.pos.x, player.pos.z, e.zone) || e.alerted && d < e.aggro * 2);
  if (e.stun > 0) { e.stun -= dt; e.wind = 0; e.state = "stun"; return; }
  if (!seen) {
    e.state = "idle";
    // devriye: evinin çevresinde dolaş
    e.t += dt;
    if (e.patrol) {
      const p = e.patrol[Math.floor(e.t / 6) % e.patrol.length];
      moveEnemyTo(e, p[0], p[1], dt, 0.45);
    }
    return;
  }
  if (!e.alerted) {
    e.alerted = true;
    sfx("alien");
    // grubu uyar
    for (const o of G.enemies) if (!o.dead && o.zone === e.zone && o.pos.distanceTo(e.pos) < 14) o.alerted = true;
    if (e.onAlert) e.onAlert();
  }
  const want = Math.atan2(-dx, -dz);
  e.yaw += wrapAngle(want - e.yaw) * Math.min(1, dt * (e.wind > 0 ? 2 : 7));
  e.atkT -= dt;
  if (e.wind > 0) {
    e.wind -= dt;
    e.state = "windup";
    if (e.wind <= 0) enemyStrike(e, d);
    return;
  }
  if (e.ranged) {
    // nişancı: mesafeyi korur, yana kayar, ateş eder
    const keep = e.keep;
    if (d > e.range) moveEnemyTo(e, player.pos.x, player.pos.z, dt, 1);
    else if (d < keep) moveEnemyTo(e, e.pos.x - dx, e.pos.z - dz, dt, 0.9);
    else { e.strafe = e.strafe || (Math.random() < 0.5 ? 1 : -1); moveEnemyTo(e, e.pos.x + dz / d * e.strafe * 3, e.pos.z - dx / d * e.strafe * 3, dt, 0.5); if (Math.random() < dt * 0.3) e.strafe *= -1; }
    if (e.atkT <= 0 && d < e.range + 2) { e.wind = e.windup; e.atkT = e.cool + Math.random() * 0.8; sfx("windup"); }
    e.state = e.state === "windup" ? "windup" : "move";
  } else {
    // yakın dövüş: sür, etrafını sar (aynı yere yığılmasınlar)
    let tx = player.pos.x, tz = player.pos.z;
    if (d > e.range * 0.85) {
      for (const o of G.enemies) {
        if (o === e || o.dead || o.zone !== e.zone) continue;
        const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = Math.hypot(ox, oz);
        if (od < 1.8 && od > 0.01) { tx += ox / od * 1.5; tz += oz / od * 1.5; }
      }
      moveEnemyTo(e, tx, tz, dt, e.alerted && d > 8 ? 1.15 : 1);
      e.state = "move";
    } else e.state = "ready";
    if (e.atkT <= 0 && d < e.range + 0.4) { e.wind = e.windup; e.atkT = e.cool + Math.random() * 0.6; sfx("windup"); }
  }
}
function moveEnemyTo(e, x, z, dt, k) {
  const dx = x - e.pos.x, dz = z - e.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.2) return;
  const sp = e.speed * (k || 1) * dt;
  const nx = e.pos.x + dx / d * sp, nz = e.pos.z + dz / d * sp;
  let moved = false;
  if (!blockedAt(e.zone, nx, e.pos.z, e.r * 0.8, e.pos.y) && !enemySlope(e, nx, e.pos.z)) { e.pos.x = nx; moved = true; }
  if (!blockedAt(e.zone, e.pos.x, nz, e.r * 0.8, e.pos.y) && !enemySlope(e, e.pos.x, nz)) { e.pos.z = nz; moved = true; }
  if (!moved && !e.fly) {
    // engelin etrafından dolaşmayı dene
    const side = e.pos.x * 0.37 + e.pos.z * 0.21 > 0 ? 1 : -1;
    const sx = e.pos.x + dz / d * sp * side, sz = e.pos.z - dx / d * sp * side;
    if (!blockedAt(e.zone, sx, sz, e.r * 0.8, e.pos.y) && !enemySlope(e, sx, sz)) { e.pos.x = sx; e.pos.z = sz; }
  }
  if (e.state !== "windup") e.yaw += wrapAngle(Math.atan2(-dx, -dz) - e.yaw) * Math.min(1, dt * 6);
}
// Dronlar seni fark edince senin yüksekliğinde uçar. Altlarındaki zemine göre uçunca, Demir Zirve'nin tepesinde
// 26 m aşağıda, kayaların içinde kalıyor; görünmeden ateş ediyorlardı (Hakan'ın bildirdiği hata).
function flyBase(e) { return e.alerted && !player.dead && e.zone === G.zone ? Math.max(e.pos.y, player.pos.y) : e.pos.y; }
// Düşmanlar platformların (kanyondaki ada, kale) üstünde de yürür; uçurumdan aşağı atlamaz
function enemyGround(e, x, z) { return groundAt(e.zone, x, z, e.pos.y + 0.5); }
function enemySlope(e, x, z) { return !e.fly && Math.abs(enemyGround(e, x, z) - e.pos.y) > 1.2; }
function enemyStrike(e, d) {
  if (e.ranged) {
    const from = V3(e.pos.x, (e.fly ? e.y : e.pos.y + e.h * 0.7), e.pos.z);
    const to = V3(player.pos.x, player.pos.y + 1.1, player.pos.z);
    // biraz önünü kestir (hareket ederken de isabet etsin ama kaçılabilsin)
    fireProjectile(from, to, e.dmg, e.projColor || 0xff7a2a, 19);
    sfx("plasma");
  } else {
    if (d < e.range + 0.5) {
      const toP = Math.atan2(-(player.pos.x - e.pos.x), -(player.pos.z - e.pos.z));
      if (Math.abs(wrapAngle(toP - e.yaw)) < 1.2) hurt(e.dmg, `${e.name || "Bir Vorak"} seni yere serdi.`, e.pos);
    }
    e.lunge = 0.25;
    const ly = e.yaw;
    e.vel.set(-Math.sin(ly) * 5, 0, -Math.cos(ly) * 5);
  }
}

// ---------------------------------------------------------------- mermiler
function fireProjectile(from, to, dmg, color, speed, opts) {
  const dir = V3().copy(to).sub(from).normalize();
  const m = new THREE.Mesh(new THREE.SphereGeometry(opts && opts.size || 0.22, 8, 6), new THREE.MeshBasicMaterial({ color }));
  m.position.copy(from);
  // Mermiye ışık eklenmez: her yeni ışık bütün materyalleri yeniden derletip oyunu takılttırıyordu
  G.zone.group.add(m);
  const p = Object.assign({ pos: from.clone(), vel: dir.multiplyScalar(speed), dmg, mesh: m, life: 4, zone: G.zone, enemy: true }, opts || {});
  G.projectiles.push(p);
  return p;
}
function clearProjectiles() { for (const p of G.projectiles) p.zone.group.remove(p.mesh); G.projectiles.length = 0; }
function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    p.life -= dt;
    p.pos.addScaledVector(p.vel, dt);
    if (p.homing && p.life > 1) {
      const to = V3(player.pos.x, player.pos.y + 1, player.pos.z).sub(p.pos).normalize().multiplyScalar(p.vel.length());
      p.vel.lerp(to, Math.min(1, dt * p.homing));
    }
    p.mesh.position.copy(p.pos);
    let gone = p.life <= 0 || p.zone !== G.zone || solidAt(p.zone, p.pos.x, p.pos.y, p.pos.z);
    if (!gone && p.enemy) {
      const dx = p.pos.x - player.pos.x, dz = p.pos.z - player.pos.z, dy = p.pos.y - (player.pos.y + 1);
      if (dx * dx + dz * dz < 0.55 && Math.abs(dy) < 1.1) { hurt(p.dmg, p.reason || "Plazma atışı seni vurdu.", p.pos); gone = true; }
    }
    if (!gone && !p.enemy) {
      const e = hammerHitsEnemy(p.pos, 0.4);
      if (e) { damageEnemy(e, p.dmg, {}); gone = true; }
    }
    if (gone) { p.zone.group.remove(p.mesh); G.projectiles.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- BİP (yardımcı robot)
function updateBip(dt) {
  const b = G.bip;
  if (!b || !G.flags.bip) return;      // onarılmadan önce BİP enkazdaki bir eşya (story yönetir)
  b.root.visible = !G.bipHidden;
  // oyuncunun sol omzunun arkasında süzülür
  const tx = player.pos.x + Math.cos(player.yaw) * -0.9 + Math.sin(player.yaw) * 0.6;
  const tz = player.pos.z - Math.sin(player.yaw) * -0.9 + Math.cos(player.yaw) * 0.6;
  const ty = player.pos.y + 2.1 + Math.sin(G.time * 2.4) * 0.12;
  b.root.position.lerp(V3(tx, ty, tz), Math.min(1, dt * 4));
  const e = nearestEnemy(18);
  const look = e ? Math.atan2(-(e.pos.x - b.root.position.x), -(e.pos.z - b.root.position.z)) : player.yaw;
  b.root.rotation.y += wrapAngle(look - b.root.rotation.y) * Math.min(1, dt * 5);
  if (b.rotor) b.rotor.rotation.y += dt * 30;
  player.bipCd -= dt;
  // kendi kendine küçük atışlar
  b.auto = (b.auto || 2) - dt;
  if (e && b.auto <= 0 && !G.cutscene) { b.auto = 2.4; bipShot(e, 5 + G.up.bip * 2); }
  if (b.burst) {
    b.burst.t -= dt;
    if (b.burst.t <= 0) {
      b.burst.t = 0.18;
      if (!b.burst.target.dead) bipShot(b.burst.target, 9 + G.up.bip * 3);
      if (--b.burst.n <= 0) b.burst = null;
    }
  }
}
function bipShot(e, dmg) {
  const from = G.bip.root.position.clone();
  const to = V3(e.pos.x, (e.fly ? e.y : e.pos.y) + e.h * 0.6, e.pos.z);
  fireProjectile(from, to, dmg, 0x7fd8ff, 40, { enemy: false, size: 0.1 });
  sfx("laser");
}

// ---------------------------------------------------------------- etkileşim
// item: { pos, label:()=>string|null, act, hold:sn?, r?, visible?:()=>bool }
function addInteract(zone, item) {
  item.pos = item.pos instanceof THREE.Vector3 ? item.pos : V3(...item.pos);
  item.r = item.r || 2.6;
  item.zone = zone;
  zone.interact.push(item);
  if (item.id) G.I[item.id] = item;
  return item;
}
let target = null, holdT = 0;
function findTarget() {
  let best = null, bestS = Infinity;
  for (const it of G.zone.interact) {
    if (it.visible && !it.visible()) continue;
    const label = it.label();
    if (!label) continue;
    const dx = it.pos.x - player.pos.x, dz = it.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d > it.r || Math.abs(it.pos.y - player.pos.y - 1) > 2.6) continue;
    const ang = Math.abs(wrapAngle(Math.atan2(-dx, -dz) - player.yaw));
    const s = d + ang * 1.2;
    if (s < bestS) { bestS = s; best = { it, label }; }
  }
  return best;
}
function updateInteraction(dt) {
  const el = $("prompt");
  const found = (player.attack || player.dodge || talking() && !G.allowTalkInteract) ? null : findTarget();
  target = found ? found.it : null;
  if (!found) { el.style.display = "none"; $("holdBar").style.display = "none"; holdT = 0; interactRequested = false; return; }
  el.style.display = "flex";
  el.innerHTML = "";
  const k = document.createElement("span"); k.className = "k"; k.textContent = "E";
  el.append(k, document.createTextNode((target.hold ? "Basılı tut: " : "") + found.label));
  if (target.hold) {
    if (keys.KeyE) { holdT += dt; if (Math.random() < dt * 10) sfx("weld"); }
    else holdT = Math.max(0, holdT - dt);
    $("holdBar").style.display = "block";
    $("holdFill").style.width = Math.min(100, holdT / target.hold * 100) + "%";
    if (holdT >= target.hold) { holdT = 0; target.act(); }
  } else {
    $("holdBar").style.display = "none";
    if (interactRequested) target.act();
  }
  interactRequested = false;
}

// ---------------------------------------------------------------- tek seferlik ipuçları
const tutShown = {};
function tutorialOnce(id, head, html) { if (tutShown[id]) return; tutShown[id] = true; tutorial(head, html); }

// ---------------------------------------------------------------- HUD
const ebarPool = [];
function ebar(i) {
  while (ebarPool.length <= i) {
    const d = document.createElement("div"); d.className = "ebar";
    const f = document.createElement("div"); f.className = "f"; d.appendChild(f);
    $("ebars").appendChild(d); ebarPool.push(d);
  }
  return ebarPool[i];
}
const _proj = V3();
function compassX(x, z) {
  const heading = Math.atan2(-(x - player.pos.x), -(z - player.pos.z));
  const rel = wrapAngle(heading - player.camYaw);
  return rel;
}
let compassCache = "";
function drawCompass() {
  const inner = $("compassInner");
  let html = "";
  const W = 100;
  const put = (rel, cls, content) => {
    if (Math.abs(rel) > Math.PI / 2) return;
    const x = 50 - rel / (Math.PI / 2) * (W / 2);
    html += `<div class="${cls}" style="left:${x.toFixed(1)}%">${content}</div>`;
  };
  const dirs = [["K", 0], ["B", Math.PI / 2], ["G", Math.PI], ["D", -Math.PI / 2]];
  for (const [n, a] of dirs) put(wrapAngle(a - player.camYaw), "c", n);
  for (let a = 0; a < 16; a++) { const ang = a * Math.PI / 8; if (a % 4) put(wrapAngle(ang - player.camYaw), "tick", ""); }
  // görev yeri artık şeritte değil, ekranda tam yerinde gösteriliyor (drawMarker)
  for (const e of G.enemies) {
    if (e.dead || e.zone !== G.zone || !e.alerted) continue;
    if (e.pos.distanceTo(player.pos) > 30) continue;
    put(compassX(e.pos.x, e.pos.z), "m enemy", "<i></i>");
  }
  if (html !== compassCache) { inner.innerHTML = html; compassCache = html; }
}
// Görev işareti (1. oyundaki gibi): hedefin tam üstünde elmas + mesafe; ekran dışındaysa kenara yapışır,
// arkadaysa altta görünür ki hangi yöne dönüleceği anlaşılsın.
function drawMarker() {
  const m = $("marker");
  if (!G.marker || G.cutscene || G.uiOpen || G.zone.name === "chase") { m.style.display = "none"; return; }
  _proj.copy(G.marker);
  camera.getWorldDirection(_fw);
  const front = _v1.copy(G.marker).sub(camera.position).dot(_fw) > 0;
  _proj.project(camera);
  let x = (_proj.x * 0.5 + 0.5) * innerWidth, y = (-_proj.y * 0.5 + 0.5) * innerHeight;
  if (!front) { x = innerWidth - x; y = innerHeight - 60; }
  const pad = 46, top = TOUCH ? 120 : 90;
  const cx = clamp(x, pad, innerWidth - pad), cy = clamp(y, top, innerHeight - 50);
  m.classList.toggle("edge", !front || cx !== x || cy !== y);
  m.style.left = cx + "px";
  m.style.top = cy + "px";
  $("markerDist").innerText = Math.round(Math.hypot(G.marker.x - player.pos.x, G.marker.z - player.pos.z)) + " m";
  if ($("markerLabel").innerText !== G.markerLabel) $("markerLabel").innerText = G.markerLabel || "";
  m.style.display = "block";
}
let hpGhostT = 0;
function updateHUD(dt) {
  const hpPct = Math.max(0, player.health) / player.maxHealth * 100;
  $("hpFill").style.width = hpPct + "%";
  $("hpGhost").style.width = hpPct + "%";
  $("hpBar").style.width = (180 + player.maxHealth * 0.4) + "px";
  $("status").classList.toggle("low", hpPct < 25);
  $("ovFill").style.width = (player.overT > 0 ? player.overT * 10 : player.over) + "%";
  $("ovBar").classList.toggle("full", player.over >= 100 || player.overT > 0);
  $("overTint").style.opacity = player.overT > 0 ? 1 : 0;
  $("hpText").innerText = `${Math.ceil(Math.max(0, player.health))} / ${player.maxHealth}` + (player.over >= 100 ? "  ·  V: AŞIRI YÜK HAZIR" : "");
  $("weaponRing").classList.toggle("away", player.hammer.state !== "hand");
  $("abilC").classList.toggle("cool", player.dodgeCd > 0);
  $("abilQ").style.display = G.flags.bip ? "flex" : "none";
  $("abilQ").classList.toggle("cool", player.bipCd > 0);
  $("scrapVal").innerText = G.scrap;
  const showO2 = G.zone.vacuum || G.o2Drain > 0 || player.o2 < 99;
  $("o2Row").style.display = showO2 ? "flex" : "none";
  $("o2Val").innerText = Math.ceil(player.o2);
  $("o2Val").style.color = player.o2 < 25 ? "var(--danger)" : "";
  const showSt = player.stamina < player.maxStamina - 0.5 || player.climbing || player.gliding;
  $("stWheel").style.opacity = showSt ? 1 : 0;
  $("stWheel").classList.toggle("tired", player.exhausted);
  $("stArc").setAttribute("stroke-dasharray", `${132 * player.stamina / player.maxStamina} 132`);
  $("reticle").style.display = player.aiming && player.hammer.state === "hand" ? "block" : "none";
  $("dot").style.display = player.aiming ? "none" : "block";
  drawCompass();
  drawMarker();
  // düşman can çubukları
  let n = 0;
  for (const e of G.enemies) {
    if (e.dead || e.zone !== G.zone || e.boss || e.hidden || !e.alerted) continue;
    if (e.hp >= e.maxHp && !(e.shieldHp > 0)) continue;
    _proj.set(e.pos.x, (e.fly ? e.y : e.pos.y) + e.h + 0.35, e.pos.z);
    if (_proj.distanceTo(camera.position) > 35) continue;
    camera.getWorldDirection(_fw);
    if (_fw.dot(_v1.copy(_proj).sub(camera.position)) < 0) continue;
    _proj.project(camera);
    const el = ebar(n++);
    el.style.display = "block";
    el.style.left = ((_proj.x * 0.5 + 0.5) * innerWidth) + "px";
    el.style.top = ((-_proj.y * 0.5 + 0.5) * innerHeight) + "px";
    el.classList.toggle("shield", e.shieldHp > 0);
    el.firstChild.style.width = (e.shieldHp > 0 ? e.shieldHp / ETYPES[e.type].shield * 100 : Math.max(0, e.hp) / e.maxHp * 100) + "%";
  }
  for (let i = n; i < ebarPool.length; i++) ebarPool[i].style.display = "none";
  // boss
  if (G.boss && !G.boss.dead) {
    $("boss").style.display = "block";
    $("bossName").innerText = G.boss.title;
    $("bossFill").style.width = Math.max(0, G.boss.hp) / G.boss.maxHp * 100 + "%";
    $("bossPhase").innerText = G.boss.phaseText || "";
  } else $("boss").style.display = "none";
  areaT -= dt; if (areaT <= 0) $("area").style.opacity = 0;
  tutT -= dt; if (tutT <= 0) $("tutorial").style.opacity = 0;
  damageFlash = Math.max(0, damageFlash - dt * 1.2);
  $("damage").style.opacity = damageFlash;
  const temp = typeof G.zone.temp === "function" ? G.zone.temp() : G.zone.temp;
  $("cold").style.opacity = temp < -15 ? Math.min(0.6, (-temp - 15) / 40) : 0;
}
const _v1 = V3();

// bölge (alan) afişleri: oyuncu bir alana girince "BÖLGE KEŞFEDİLDİ"
let lastArea = null;
function updateAreas() {
  const zone = G.zone;
  if (!zone.areas.length) return;
  let cur = null;
  for (const a of zone.areas) if (Math.hypot(player.pos.x - a.x, player.pos.z - a.z) < a.r) { cur = a; break; }
  // bölüm kartı ekrandayken afiş bekler (üst üste binmesin)
  if (cur !== lastArea && $("chapterCard").style.opacity !== "1" && !G.cutscene) {
    lastArea = cur;
    if (cur && !G.flags["area_" + cur.id]) { G.flags["area_" + cur.id] = 1; showArea(cur.name); }
    if (cur && cur.onEnter) cur.onEnter();
  }
}

// ---------------------------------------------------------------- kayıt
const SAVE_KEY = "inASpace2.v1";
function saveGame(extra) {
  if (TEST) return;
  try {
    const old = loadSave() || {};
    localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign(old, {
      chapter: G.chapter, flags: G.flags, scrap: G.scrap, up: G.up, stats: G.stats, maxHealth: player.maxHealth,
      reached: Math.max(old.reached || 1, G.chapter)
    }, extra || {})));
  } catch (e) { /* gizli pencerede kayıt olmayabilir */ }
}
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }

// ---------------------------------------------------------------- döngü
function update(dt) {
  player.aiming = mouse.right && !G.cutscene && !player.climbing && !player.dodge && player.hasHammer && !player.dead;
  if (G.admin) { player.stamina = player.maxStamina; player.exhausted = false; player.o2 = 100; if (player.overT <= 0) player.over = 100; }
  if (!G.cutscene) movePlayer(dt);
  else { player.moving = false; player.running = false; spaceTap = false; }
  updateStamina(dt);
  updateDodge(dt);
  updateAttack(dt);
  updateHammer(dt);
  if (player.overT > 0) player.overT = Math.max(0, player.overT - dt);
  player.hurtT = Math.max(0, player.hurtT - dt);
  for (const f of updaters) f(dt);
  if (G.zone.update) G.zone.update(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updatePickups(dt);
  updateBip(dt);
  updateOxygen(dt);
  updateAreas();
  if (player.light) {
    if (!G.admin) player.battery = Math.max(0, player.battery - 0.5 * dt);
    if (player.battery <= 0) { player.light = false; toast("Fenerin pili bitti.", 2000); }
  } else player.battery = Math.min(100, player.battery + 2 * dt);
  flashlight.intensity = player.light ? 2.6 : 0;
  if (!G.cutscene && !player.dead) updateInteraction(dt);
  interactRequested = false;
  if (player.rig) {
    player.rig.root.position.copy(player.pos);
    player.rig.root.rotation.y = player.yaw;
    player.rig.root.visible = !G.hidePlayer;
    animateHuman(player.rig, playerAnimState(), dt);
  }
}
function playerAnimState() {
  return {
    moving: player.moving, running: player.running, onGround: player.onGround, climbing: !!player.climbing,
    gliding: player.gliding, attack: player.attack, dodge: player.dodge, aiming: player.aiming,
    hurt: player.hurtT, dead: player.dead, vy: player.vy, holding: player.hammer.state === "hand" && player.hasHammer, over: player.overT > 0
  };
}

// Oyun saatine bağlı zamanlayıcılar: setTimeout gizli sekmede yavaşlıyor ve duraklatmayı bilmiyor.
const timers = [];
function after(sec, fn) { timers.push({ t: sec, fn }); }
function clearTimers() { timers.length = 0; }

let last = performance.now();
function tick(rawDt, withHud) {
  let dt = rawDt * G.timeScale;
  if (G.hitStop > 0) { G.hitStop -= rawDt; dt *= 0.08; }
  for (let i = timers.length - 1; i >= 0; i--) {
    if (!G.uiOpen && !player.dead) timers[i].t -= dt;
    if (timers[i] && timers[i].t <= 0) { const t = timers.splice(i, 1)[0]; t.fn(); }
  }
  if (G.running && !G.ended && !player.dead && !G.uiOpen) {
    G.time += dt;
    update(dt);
  }
  if (G.running) {
    updateSay(rawDt);
    for (const f of visuals) f(dt);
    updateCamera(rawDt);
    if (withHud) updateHUD(rawDt);
    updateMusic(rawDt);
  } else for (const f of visuals) f(dt);
}
function step(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!G.manualClock) tick(dt, true);
  renderer.render(scene, camera);
}
function frame(now) { requestAnimationFrame(frame); step(now); }
requestAnimationFrame(frame);
// Test botu saati kendisi ilerletir (G.manualClock): gizli panelde rAF durur, ama bot her "bekle"
// çağrısında oyunu 1/60 sn'lik adımlarla tam o kadar ilerletir (1'de öğrenildi).
function advance(sec) {
  const n = Math.max(1, Math.round(sec * 60));
  for (let i = 0; i < n; i++) tick(1 / 60, i === n - 1);
  renderer.render(scene, camera);
}
function fadeTo(opacity) { $("fade").style.opacity = opacity; }
function flashWhite(ms) { $("flash").style.opacity = 1; setTimeout(() => { $("flash").style.opacity = 0; }, ms || 120); }
function cine(on) { document.body.classList.toggle("cine", !!on); }
function chapterCard(n, title, sec) {
  $("ccN").innerText = n ? "BÖLÜM " + n : "";
  $("ccT").innerText = title.toLocaleUpperCase("tr");
  $("chapterCard").style.opacity = 1;
  after(sec || 3.2, () => { $("chapterCard").style.opacity = 0; });
}
