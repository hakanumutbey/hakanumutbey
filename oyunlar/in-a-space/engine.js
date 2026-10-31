// IN A SPACE — çekirdek: render, giriş, oyuncu (dayanıklılık, tırmanma, süzülme), çarpışma, etkileşim, oksijen,
// HUD (Breath of the Wild tarzı), ses, diyalog, bölgeler, kayıt. world.js dünyayı kurar, story.js hikâyeyi yönetir.
"use strict";

const TEST = location.search.includes("test");
const $ = id => document.getElementById(id);

// ---------------------------------------------------------------- render
const renderer = new THREE.WebGLRenderer({ canvas: $("gameCanvas"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 2500);
camera.rotation.order = "YXZ";
scene.add(camera);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Fener kameraya bağlı. Kapalıyken görünmez yapılmaz, yoğunluğu 0 olur: ışık sayısı değişince tüm
// materyaller yeniden derlenip oyun takılıyordu.
const flashlight = new THREE.SpotLight(0xfff1d6, 0, 30, 0.45, 0.5, 1.2);
flashlight.position.set(0.25, -0.2, 0);
camera.add(flashlight);
camera.add(flashlight.target);
flashlight.target.position.set(0, -0.15, -5);

// ---------------------------------------------------------------- durum
const G = {
  zone: null, zones: {}, doors: {}, enemies: [], flags: {}, stage: null,
  running: false, ended: false, uiOpen: null, time: 0, admin: false,
  travel: null, shipAir: 100, alarm: false, marker: null, cutscene: false,
  stats: { deaths: 0, kills: 0 }, roomAt: null
};
const player = {
  pos: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, eye: 1.7, r: 0.3, onGround: true,
  health: 100, maxHealth: 100, o2Mult: 1, suit: false, suitO2: 100, battery: 100, light: false,
  gun: false, heat: 0, overheat: 0, dead: false, push: new THREE.Vector3(), moving: false, running: false,
  // Breath of the Wild mekanikleri: dayanıklılık çarkı, tırmanma, süzülme (jetpack), düşme hasarı
  stamina: 100, maxStamina: 100, exhausted: false, staminaRest: 0, climbing: null, gliding: false, glidedOnce: false
};
const keys = {};
let interactRequested = false;
let spaceTap = false;
let mouseSens = 0.0022 * 1.4;
const updaters = [];          // world/story her karede çağrılacak fonksiyonları buraya ekler
let onShoot = null;           // story.js atar
const STEP = 0.35;            // bu kadar alçak kenara çıkılabilir

// ---------------------------------------------------------------- bölgeler
// Her bölge (gemi, gövde dışı, gezegenler) kendi grubunda; yalnızca içinde bulunulan görünür.
function makeZone(name, opts) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const z = Object.assign({
    name, group, colliders: [], interact: [], gravity: 9.8, jump: 4.2, speed: 3.6,
    vacuum: false, o2Rate: 1.1, ground: () => 0, bg: 0x000000, fog: 0, spawn: [0, 0, 0],
    update: null, onEnter: null, temp: 21, title: null, sub: "", mapScale: 4
  }, opts);
  G.zones[name] = z;
  return z;
}

function setZone(name, x, z, yaw) {
  const zone = G.zones[name];
  const changed = G.zone !== zone;
  for (const k in G.zones) G.zones[k].group.visible = (k === name);
  G.zone = zone;
  scene.background = new THREE.Color(zone.bg);
  scene.fog = zone.fog ? new THREE.FogExp2(zone.fogColor === undefined ? zone.bg : zone.fogColor, zone.fog) : null;
  player.pos.set(x, zone.ground(x, z), z);
  player.vy = 0;
  player.climbing = null;
  player.gliding = false;
  if (yaw !== undefined) player.yaw = yaw;
  player.pitch = 0;
  $("helmet").style.display = player.suit ? "block" : "none";
  $("zoneName").innerText = zone.title || "ARGO-7";
  lastRoom = null;
  if (changed && zone.title && G.running) showBanner(zone.title, zone.sub, false);
  if (zone.onEnter) zone.onEnter();
}

// ---------------------------------------------------------------- çarpışma
// Kutu çarpıştırıcılar (XZ düzleminde). `top` verilmişse üstüne çıkılabilir (tırmanılan kaya sütunları);
// ayakları o yükseklikteki oyuncuyu engellemez, zemini olur.
function addCollider(zone, minX, maxX, minZ, maxZ, extra) {
  const c = Object.assign({ minX, maxX, minZ, maxZ, on: true }, extra || {});
  zone.colliders.push(c);
  return c;
}

function circleHits(x, z, r, c) {
  const cx = Math.max(c.minX, Math.min(x, c.maxX));
  const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
  const dx = x - cx, dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

function blockedAt(zone, x, z, r, feetY) {
  for (const c of zone.colliders) {
    if (!c.on) continue;
    if (feetY !== undefined && c.top !== undefined && feetY >= c.top - STEP) continue;
    if (circleHits(x, z, r, c)) return true;
  }
  return false;
}

// Bot ve oyuncu aynı testi kullanır (playtest.js de bunu çağırır).
function testCollision(to) {
  return blockedAt(G.zone, to.x, to.z, player.r, player.pos.y);
}

function groundAt(zone, x, z, feetY) {
  let g = zone.ground(x, z);
  for (const c of zone.colliders) {
    if (c.top === undefined || !c.on) continue;
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && feetY >= c.top - STEP) g = Math.max(g, c.top);
  }
  return g;
}

// 2B doğru parçası – kutu kesişimi (görüş hattı için)
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

// ignore: bu noktayı içeren kutular sayılmaz (masanın üstündeki not defterini masa engellemesin)
function lineBlocked(ax, az, bx, bz, zone, ignore) {
  zone = zone || G.zone;
  for (const c of zone.colliders) {
    if (!c.on || c.seeThrough) continue;
    if (ignore && ignore.x > c.minX - 0.1 && ignore.x < c.maxX + 0.1 && ignore.z > c.minZ - 0.1 && ignore.z < c.maxZ + 0.1) continue;
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
  toast(G.admin ? "🛠️ ADMIN MODU: ölümsüzlük, sınırsız oksijen/pil/dayanıklılık, tüfek ısınmaz, hızlı koşu." : "Admin modu kapandı.", 4000);
  sfx(G.admin ? "power" : "click");
}

addEventListener("keydown", e => {
  if (handleAdminCombo(e)) return;
  if (G.uiOpen) {
    if (G.uiOpen === "datapad" && (e.code === "KeyE" || e.code === "Escape")) closeUI();
    else if (e.code === "Escape") closeUI();
    else if (G.uiOpen === "keypad" && /^Digit\d$/.test(e.code)) keypadPress(e.code.slice(5));
    else if (G.uiOpen === "keypad" && e.code === "Enter") keypadPress("OK");
    else if (G.uiOpen === "keypad" && e.code === "Backspace") keypadPress("DEL");
    return;
  }
  keys[e.code] = true;
  if (e.code === "KeyE" && !e.repeat) interactRequested = true;
  if (e.code === "KeyF" && !e.repeat && G.running) toggleFlashlight();
  if (e.code === "KeyM" && !e.repeat && G.running) toggleMusic();
  if (e.code === "Space") { e.preventDefault(); if (!e.repeat) spaceTap = true; }
});
addEventListener("keyup", e => {
  keys[e.code] = false;
  if (e.code === "AltRight") { altGrHeld = false; adminArmed = false; }
});
addEventListener("blur", () => { for (const k in keys) keys[k] = false; altGrHeld = false; });

const canvas = $("gameCanvas");
canvas.addEventListener("click", () => {
  if (G.running && !G.uiOpen && !player.dead && !G.ended && document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
addEventListener("mousedown", e => {
  if (e.button === 0 && G.running && !G.uiOpen && !player.dead && document.pointerLockElement === canvas && onShoot) onShoot();
});
addEventListener("mousemove", e => {
  if (document.pointerLockElement !== canvas || G.uiOpen) return;
  player.yaw -= e.movementX * mouseSens;
  player.pitch -= e.movementY * mouseSens;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
});
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  $("clickHint").style.display = (!locked && G.running && !G.uiOpen && !player.dead && !G.ended && !TEST) ? "block" : "none";
  if (!locked && G.running && !G.uiOpen && !player.dead && !G.ended && !TEST) openUI("pauseMenu");
});

// ---------------------------------------------------------------- arayüz pencereleri
function openUI(id) {
  G.uiOpen = id;
  for (const k in keys) keys[k] = false;
  $(id).style.display = "flex";
  $("clickHint").style.display = "none";
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeUI() {
  if (!G.uiOpen) return;
  $(G.uiOpen).style.display = "none";
  G.uiOpen = null;
  if (G.running && !TEST) {
    canvas.requestPointerLock();
    // Tarayıcı tıklamasız kilidi reddederse ipucu görünsün
    setTimeout(() => { if (document.pointerLockElement !== canvas && !G.uiOpen && G.running) $("clickHint").style.display = "block"; }, 150);
  }
}
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
window.showToast = toast;

// Bölge/oda adı afişi (BotW'de yeni bir bölgeye girince çıkan büyük yazı)
let bannerT = 0;
function showBanner(title, sub, small) {
  $("bannerTitle").innerText = title;
  $("bannerSub").innerText = sub || "";
  $("banner").classList.toggle("small", !!small);
  $("banner").style.opacity = 1;
  bannerT = small ? 2.2 : 3.6;
}
// Görev güncellendi bildirimi; yalnızca sayılar değiştiyse (ör. "3 kaldı") çıkmaz
let lastObjective = "", lastObjectiveKey = "", questT = 0;
function setObjective(text) {
  if (text === lastObjective) return;
  const key = text.replace(/\d+/g, "#");
  if (key !== lastObjectiveKey && lastObjective && text) {
    $("questText").innerText = text;
    $("quest").style.opacity = 1;
    questT = 3.2;
    sfx("quest");
  }
  lastObjective = text;
  lastObjectiveKey = key;
  $("objText").innerText = text;
}

// Altyazılı diyalog kuyruğu
const sayQueue = [];
let sayTimer = 0;
function say(lines) {
  for (const l of lines) sayQueue.push(l);
}
function updateSay(dt) {
  sayTimer -= dt;
  if (sayTimer > 0) return;
  const el = $("subtitle");
  if (!sayQueue.length) { el.style.display = "none"; return; }
  const [who, text] = sayQueue.shift();
  el.innerHTML = "";
  const w = document.createElement("div"); w.className = "who"; w.textContent = who;
  const t = document.createElement("div"); t.className = "txt"; t.textContent = text;
  el.append(w, t);
  if (sayQueue.length) { const m = document.createElement("div"); m.className = "more"; m.textContent = "▼"; el.appendChild(m); }
  el.style.display = "block";
  sayTimer = (1.6 + text.length * 0.05) / (TEST ? 6 : 1);
  if (who === "NOVA") sfx("beep");
  if (G.onSayLine) G.onSayLine(who, sayTimer);
}

let damageFlash = 0;
function hurt(amount, reason) {
  if (G.admin || player.dead || G.ended) return;
  player.health -= amount;
  damageFlash = Math.min(0.85, damageFlash + amount * 0.04);
  if (amount > 4) sfx("hurt");
  if (player.health <= 0) die(reason);
}
function heal(amount) { player.health = Math.min(player.maxHealth, player.health + amount); }

let deathHook = null;
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
  if (deathHook) deathHook();
}

// ---------------------------------------------------------------- ses (WebAudio ile sentez)
let AC = null;
function ac() {
  if (TEST) return null;
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  return AC;
}
function tone(freq, dur, type, vol, slide) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), a.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.1, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur + 0.02);
}
function noise(dur, vol, freq) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = "lowpass"; f.frequency.value = freq || 1000; g.gain.value = vol || 0.2;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start();
}
const SFX = {
  click: () => tone(880, 0.06, "square", 0.05),
  beep: () => tone(1250, 0.05, "square", 0.04),
  door: () => tone(240, 0.3, "sawtooth", 0.035, -90),
  pickup: () => { tone(660, 0.1, "sine", 0.12); setTimeout(() => tone(990, 0.14, "sine", 0.12), 90); },
  // BotW'nin "eşya aldın" ve "görev" akorlarını andıran kısa arpejler
  quest: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.35, "triangle", 0.07), i * 90)); },
  crystal: () => { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.4, "sine", 0.09), i * 70)); },
  laser: () => tone(1500, 0.16, "sawtooth", 0.08, -1200),
  explosion: () => { noise(1.6, 0.6, 500); tone(55, 1.2, "sine", 0.4, -30); },
  alarm: () => { tone(760, 0.32, "square", 0.06); setTimeout(() => tone(540, 0.32, "square", 0.06), 360); },
  hurt: () => tone(150, 0.16, "square", 0.09, -60),
  power: () => tone(90, 1.0, "sawtooth", 0.08, 320),
  powerDown: () => tone(400, 1.2, "sawtooth", 0.08, -360),
  weld: () => noise(0.13, 0.07, 3500),
  alien: () => tone(280 + Math.random() * 80, 0.45, "sawtooth", 0.05, -180),
  warp: () => { tone(50, 3, "sawtooth", 0.06, 500); noise(2.5, 0.08, 900); },
  hiss: () => noise(1.2, 0.12, 2500),
  jet: () => noise(0.25, 0.06, 1800),
  tired: () => { tone(300, 0.25, "sine", 0.06, -120); setTimeout(() => tone(260, 0.3, "sine", 0.05, -100), 300); },
  wrong: () => tone(180, 0.35, "square", 0.08),
  step: () => noise(0.05, 0.03, 600),
  // kazma, maden, kapsül, uyanış, uzaylı tükürüğü, seçmeli diyalog, atölye
  pick: () => { tone(1900, 0.07, "square", 0.05); tone(1250, 0.1, "triangle", 0.06); noise(0.08, 0.12, 4200); },
  swoosh: () => noise(0.15, 0.05, 2600),
  oreBreak: () => { noise(0.5, 0.3, 900); tone(140, 0.35, "triangle", 0.14, -60); },
  oreGet: () => { tone(880, 0.09, "triangle", 0.08); setTimeout(() => tone(1320, 0.16, "triangle", 0.08), 80); },
  podOpen: () => { noise(1.0, 0.14, 2200); tone(110, 0.4, "square", 0.05, -40); setTimeout(() => tone(220, 0.12, "square", 0.06), 550); },
  heartbeat: () => { tone(60, 0.16, "sine", 0.4, -15); setTimeout(() => tone(52, 0.2, "sine", 0.32, -15), 230); },
  spit: () => { noise(0.18, 0.14, 1400); tone(520, 0.2, "sawtooth", 0.04, -300); },
  splat: () => { noise(0.3, 0.2, 700); tone(90, 0.2, "sine", 0.12, -30); },
  alienAlert: () => { tone(300, 0.45, "sawtooth", 0.06, 520); setTimeout(() => tone(760, 0.3, "sawtooth", 0.045, -260), 200); },
  alienDie: () => { tone(420, 0.5, "sawtooth", 0.06, -360); noise(0.35, 0.12, 900); },
  choice: () => { tone(660, 0.08, "sine", 0.06); setTimeout(() => tone(990, 0.1, "sine", 0.05), 70); },
  upgrade: () => { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.3, "triangle", 0.07), i * 70)); }
};
function sfx(name) { try { if (SFX[name]) SFX[name](); } catch (e) { /* ses yoksa oyun sürsün */ } }

// ---------------------------------------------------------------- müzik (Hakan'ın Suno şarkıları)
// Normalde "normal" çalar; savaşta (meteor dalgası, seni gören uzaylı) "battle"a geçer, savaş bitince
// birkaç saniye sonra geri döner. Savaş dosyası yoksa normal müzik çalmaya devam eder. M: aç/kapa.
const MUSIC_FILES = { normal: "muzik/standart.m4a", battle: null };
const MUSIC_VOL = 0.32;          // kayıt çok yüksek (tepeleri kesik); efektlerin altında kalsın
const music = { on: true, started: false, buffers: {}, tracks: {}, want: "normal", battleT: 0, out: null };
try { music.on = localStorage.getItem("inaspace_music") !== "off"; } catch (e) { /* depolama kapalı */ }

async function loadTrack(name) {
  const a = ac(), url = MUSIC_FILES[name];
  if (!a || !url) return;
  try {
    const buf = await a.decodeAudioData(await (await fetch(url)).arrayBuffer());
    // Kaydın başındaki ve sonundaki sessizliği atla, döngü boşluksuz olsun
    const d = buf.getChannelData(0), th = 0.02;
    let s = 0, e = d.length - 1;
    while (s < e && Math.abs(d[s]) < th) s++;
    while (e > s && Math.abs(d[e]) < th) e--;
    music.buffers[name] = { buf, start: s / buf.sampleRate, end: e / buf.sampleRate };
  } catch (err) { /* müzik yüklenemese de oyun sürsün */ }
}
function startMusic() {
  const a = ac();
  if (!a) return;
  if (a.state === "suspended") a.resume();
  if (music.started) return;
  music.started = true;
  // Bozuk kaydın sertliğini biraz yumuşat
  const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000;
  music.out = a.createGain(); music.out.gain.value = music.on ? 1 : 0;
  lp.connect(music.out); music.out.connect(a.destination);
  music.lp = lp;
  loadTrack("normal"); loadTrack("battle");
}
function playTrack(name) {
  const a = ac(), b = music.buffers[name];
  if (!a || !b || music.tracks[name]) return;
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = b.buf; src.loop = true; src.loopStart = b.start; src.loopEnd = b.end;
  g.gain.value = 0;
  src.connect(g); g.connect(music.lp);
  src.start(0, b.start);
  music.tracks[name] = { src, g };
}
function updateMusic(dt) {
  const a = AC;
  if (!a || !music.started) return;
  const fighting = !!G.meteorWave || G.enemies.some(e => e.zone === G.zone && !e.dead && !e.dormant && e.lastSeen);
  music.battleT = fighting ? 4 : Math.max(0, music.battleT - dt);
  const want = music.battleT > 0 && music.buffers.battle ? "battle" : "normal";
  for (const name in music.buffers) {
    if (name === want) playTrack(name);
    const t = music.tracks[name];
    if (!t) continue;
    const target = name === want ? MUSIC_VOL : 0;
    t.g.gain.setTargetAtTime(target, a.currentTime, name === want ? 0.6 : 0.4);
  }
}
function toggleMusic() {
  music.on = !music.on;
  try { localStorage.setItem("inaspace_music", music.on ? "on" : "off"); } catch (e) { /* depolama kapalı */ }
  if (music.out && AC) music.out.gain.setTargetAtTime(music.on ? 1 : 0, AC.currentTime, 0.15);
  toast(music.on ? "🎵 Müzik açık (M)" : "🔇 Müzik kapalı (M)", 1600);
}

// ---------------------------------------------------------------- fener, oksijen, dayanıklılık
function toggleFlashlight() {
  if (!player.light && player.battery <= 0) { toast("Fenerin pili bitti. Pil paketi bul.", 2200); return; }
  player.light = !player.light;
  sfx("click");
}

let lowO2Beep = 0;
function updateOxygen(dt) {
  const zone = G.zone;
  if (zone.vacuum) {
    if (!player.suit) { hurt(45 * dt, "Boşlukta giysisiz kaldın."); return; }
    const rate = zone.o2Rate * player.o2Mult * (player.running && player.moving ? 1.7 : 1);
    if (!G.admin) player.suitO2 = Math.max(0, player.suitO2 - rate * dt);
    if (player.suitO2 <= 0) hurt(16 * dt, "Giysinin oksijeni bitti.");
    if (player.suitO2 < 25) {
      lowO2Beep -= dt;
      if (lowO2Beep <= 0) { sfx("beep"); lowO2Beep = 1; }
    }
  } else if (!player.suit && G.shipAir < 25) {
    hurt((25 - G.shipAir) * 0.35 * dt, "Gemide hava kalmadı.");
  }
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
    player.stamina = Math.min(player.maxStamina, player.stamina + (player.exhausted ? 30 : 42) * dt);
    if (player.exhausted && player.stamina >= player.maxStamina) player.exhausted = false;
  }
}

// ---------------------------------------------------------------- hareket
let stepTimer = 0;
function climbStep(dt, f) {
  const c = player.climbing;
  player.moving = f > 0;
  player.running = false;
  if (f <= 0 || player.exhausted || !c.on) { player.climbing = null; return; }   // bırakınca düşer
  player.vy = 0;
  player.pos.y += (G.admin ? 3.5 : 1.9) * dt;
  useStamina(9 * dt);
  stepTimer -= dt;
  if (stepTimer <= 0) { sfx("step"); stepTimer = 0.35; }
  if (player.pos.y >= c.top - 0.05) {
    // Kenardan yukarı çık: kutunun içine adım at
    player.pos.y = c.top;
    player.pos.x = Math.max(c.minX + 0.25, Math.min(c.maxX - 0.25, player.pos.x - Math.sin(player.yaw) * 0.7));
    player.pos.z = Math.max(c.minZ + 0.25, Math.min(c.maxZ - 0.25, player.pos.z - Math.cos(player.yaw) * 0.7));
    player.climbing = null;
    player.onGround = true;
  }
}

function land(vy) {
  // Breath of the Wild gibi: yüksekten düşmek can yakar, süzülerek inmek yakmaz
  if (-vy > 10.5) hurt((-vy - 10.5) * 7, "Yüksekten düştün.");
  sfx("step");
}

function movePlayer(dt) {
  const zone = G.zone;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (player.climbing) { climbStep(dt, f); spaceTap = false; return; }
  const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
  let dx = -sin * f + cos * s, dz = -cos * f - sin * s;
  const len = Math.hypot(dx, dz);
  player.moving = len > 0;
  player.running = !!(keys.ShiftLeft || keys.ShiftRight) && player.moving && !player.exhausted && player.onGround;
  let speed = zone.speed * (player.running ? 1.65 : 1) * (player.exhausted ? 0.62 : 1) * (G.admin ? 1.6 : 1);
  if (player.gliding) speed = Math.max(speed, 5.2);
  if (len > 0) { dx = dx / len * speed * dt; dz = dz / len * speed * dt; }
  if (player.running) useStamina(16 * dt);
  dx += player.push.x * dt;
  dz += player.push.z * dt;
  const total = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(total / 0.08));
  const p = new THREE.Vector3();
  for (let i = 0; i < steps; i++) {
    p.set(player.pos.x + dx / steps, 0, player.pos.z);
    if (!testCollision(p)) player.pos.x = p.x;
    p.set(player.pos.x, 0, player.pos.z + dz / steps);
    if (!testCollision(p)) player.pos.z = p.z;
  }
  // Tırmanma: tırmanılabilir bir kayaya doğru W'ye basınca
  if (f > 0 && !player.exhausted && player.stamina > 0) {
    const px = player.pos.x - sin * 0.42, pz = player.pos.z - cos * 0.42;
    for (const c of zone.colliders) {
      if (c.climb && c.on && player.pos.y < c.top - STEP && circleHits(px, pz, 0.15, c)) {
        player.climbing = c;
        player.gliding = false;
        player.vy = 0;
        spaceTap = false;
        return;
      }
    }
  }
  // Zıplama; havada ikinci basış jetpack süzülmesini açıp kapatır (BotW'deki yamaç paraşütü)
  if (spaceTap) {
    if (player.onGround && zone.jump > 0 && !player.exhausted && player.stamina > 0) {
      player.vy = zone.jump;
      player.onGround = false;
      useStamina(6);
    } else if (!player.onGround && zone.vacuum && player.suit && !player.exhausted && player.stamina > 0) {
      player.gliding = !player.gliding;
      if (player.gliding) { player.glidedOnce = true; sfx("jet"); }
    }
  }
  spaceTap = false;
  if (player.gliding) {
    useStamina(12 * (G.glideCost || 1) * dt);
    if (Math.random() < dt * 5) sfx("jet");
  }
  const ground = groundAt(zone, player.pos.x, player.pos.z, player.pos.y);
  player.vy -= zone.gravity * dt;
  if (player.gliding) player.vy = Math.max(player.vy, -1.4);
  player.pos.y += player.vy * dt;
  if (player.pos.y <= ground || (player.onGround && player.vy <= 0 && player.pos.y - ground < STEP)) {
    if (!player.onGround) land(player.vy);
    player.pos.y = ground;
    player.vy = 0;
    player.onGround = true;
    player.gliding = false;
  } else player.onGround = false;

  if (player.moving && player.onGround) {
    stepTimer -= dt * (player.running ? 1.6 : 1);
    if (stepTimer <= 0) { sfx("step"); stepTimer = 0.42; }
  }
}

let bobT = 0;
let shake = 0;
// Gemi topu: kamera köprü camının dışına geçer (içerideyken camın orta pervazı nişanın tam önüne düşüp
// meteorları kapatıyordu), fare yalnızca dar bir açıda nişan alır.
const TURRET_EYE = new THREE.Vector3(43.6, 2.0, 0);
function updateCamera(dt) {
  if (player.moving && player.onGround) bobT += dt * (player.running ? 13 : 9);
  const bob = player.moving && player.onGround ? Math.sin(bobT) * 0.035 : 0;
  if (G.turret) {
    player.yaw = Math.max(-Math.PI / 2 - 0.9, Math.min(-Math.PI / 2 + 0.9, player.yaw));
    player.pitch = Math.max(-0.55, Math.min(0.55, player.pitch));
    camera.position.copy(TURRET_EYE);
  } else camera.position.set(player.pos.x, player.pos.y + player.eye + bob, player.pos.z);
  camera.rotation.set(player.pitch, player.yaw, player.climbing ? 0 : (player.gliding ? Math.sin(G.time * 2) * 0.03 : 0));
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.12;
    camera.position.y += (Math.random() - 0.5) * shake * 0.12;
    shake = Math.max(0, shake - dt * 1.5);
  }
}

// ---------------------------------------------------------------- etkileşim
// item: { pos:Vector3, label:()=>string|null, act:()=>void, hold:saniye?, r:mesafe?, size:?, visible?:()=>bool }
function addInteract(zone, item) {
  item.pos = item.pos instanceof THREE.Vector3 ? item.pos : new THREE.Vector3(...item.pos);
  item.r = item.r || 2.4;
  item.size = item.size || 0.4;
  item.zone = zone;
  zone.interact.push(item);
  if (item.id) G.I[item.id] = item;
  return item;
}
G.I = {};

let target = null, holdT = 0;
const _dir = new THREE.Vector3(), _v = new THREE.Vector3();
function findTarget() {
  camera.getWorldDirection(_dir);
  const cam = camera.position;
  let best = null, bestAng = Infinity;
  for (const it of G.zone.interact) {
    if (it.visible && !it.visible()) continue;
    const label = it.label();
    if (!label) continue;
    _v.copy(it.pos).sub(cam);
    const d = _v.length();
    if (d > it.r || d < 0.01) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, _v.dot(_dir) / d)));
    if (ang > Math.atan2(it.size, d) + 0.1) continue;
    // görüş hattı: hedefin 0.35m önüne kadar duvar olmamalı (duvar arkasından etkileşim yok)
    const k = Math.max(0, (d - 0.35) / d);
    if (lineBlocked(cam.x, cam.z, cam.x + (it.pos.x - cam.x) * k, cam.z + (it.pos.z - cam.z) * k, null, it.pos)) continue;
    if (ang < bestAng) { bestAng = ang; best = { it, label }; }
  }
  return best;
}

function updateInteraction(dt) {
  const pill = $("interactPill");
  const found = findTarget();
  target = found ? found.it : null;
  if (!found) {
    pill.style.display = "none";
    $("holdBar").style.display = "none";
    holdT = 0;
  } else {
    pill.style.display = "flex";
    pill.innerHTML = "";
    const k = document.createElement("span"); k.className = "k"; k.textContent = "E";
    pill.append(k, document.createTextNode((target.hold ? "Basılı tut: " : "") + found.label));
    if (target.hold) {
      if (keys.KeyE) {
        holdT += dt;
        if (Math.random() < dt * 12) sfx("weld");
        if (target.onHold) target.onHold(dt);
      } else holdT = Math.max(0, holdT - dt);
      $("holdBar").style.display = "block";
      $("holdFill").style.width = Math.min(100, holdT / target.hold * 100) + "%";
      if (holdT >= target.hold) { holdT = 0; target.act(); }
    } else {
      $("holdBar").style.display = "none";
      if (interactRequested) target.act();
    }
  }
  interactRequested = false;
}

// ---------------------------------------------------------------- HUD (Breath of the Wild tarzı)
const HEART_PATH = "M15 26 C 6 19, 1 13, 1 8 C 1 4, 4 1, 8 1 C 11 1, 13 3, 15 6 C 17 3, 19 1, 22 1 C 26 1, 29 4, 29 8 C 29 13, 24 19, 15 26 Z";
const heartEls = [];
function addHeart() {
  const h = document.createElement("div");
  h.className = "heart";
  h.innerHTML = `<svg viewBox="0 0 30 27"><path d="${HEART_PATH}" fill="rgba(0,0,0,0.55)" stroke="#f3ead2" stroke-width="1.6"/></svg>` +
    `<svg class="full" viewBox="0 0 30 27"><path d="${HEART_PATH}" fill="#e8473f" stroke="#f3ead2" stroke-width="1.6"/></svg>`;
  $("hearts").appendChild(h);
  heartEls.push(h.querySelector(".full"));
}
let lastHeartQ = -1;
function drawHearts() {
  // Her kalp 20 can; çeyrek kalp hassasiyetiyle dolar (BotW gibi). Kalp kabı ödülüyle kalp sayısı artar.
  while (heartEls.length < Math.ceil(player.maxHealth / 20)) { addHeart(); lastHeartQ = -1; }
  while (heartEls.length > Math.ceil(player.maxHealth / 20)) { heartEls.pop().parentNode.remove(); lastHeartQ = -1; }
  const q = Math.ceil(Math.max(0, player.health) / 5);
  if (q === lastHeartQ) return;
  lastHeartQ = q;
  heartEls.forEach((el, i) => {
    const quarters = Math.max(0, Math.min(4, q - i * 4));
    el.style.clipPath = `inset(0 ${100 - quarters * 25}% 0 0)`;
  });
  $("hearts").classList.toggle("low", q <= 4 && q > 0);
}

const mapCtx = $("minimap").getContext("2d");
let mapT = 0;
function drawMinimap() {
  const g = mapCtx, S = 176, half = S / 2, zone = G.zone, k = zone.mapScale;
  const px = G.turret ? TURRET_EYE.x : player.pos.x, pz = G.turret ? TURRET_EYE.z : player.pos.z;
  g.clearRect(0, 0, S, S);
  g.fillStyle = zone.mapBg || "rgba(20,24,28,0.75)";
  g.fillRect(0, 0, S, S);
  g.save();
  g.translate(half, half);
  for (const c of zone.colliders) {
    if (!c.on || c.noMap) continue;
    const x0 = (c.minX - px) * k, z0 = (c.minZ - pz) * k, w = (c.maxX - c.minX) * k, h = (c.maxZ - c.minZ) * k;
    if (x0 > half || z0 > half || x0 + w < -half || z0 + h < -half) continue;
    g.fillStyle = c.top !== undefined ? "rgba(214,190,150,0.85)" : (zone.mapWall || "rgba(232,226,206,0.8)");
    g.fillRect(x0, z0, Math.max(1, w), Math.max(1, h));
  }
  // Sensör: yakındaki uzaylılar kırmızı nokta
  for (const e of G.enemies) {
    if (e.zone !== zone || e.dead) continue;
    const x = (e.pos.x - px) * k, z = (e.pos.z - pz) * k;
    if (Math.abs(x) < half && Math.abs(z) < half) { g.fillStyle = "#ff4d4d"; g.beginPath(); g.arc(x, z, 3.2, 0, 7); g.fill(); }
  }
  // Hedef: altın elmas (harita dışındaysa kenara yapışır)
  if (G.marker) {
    let x = (G.marker.x - px) * k, z = (G.marker.z - pz) * k;
    const m = Math.max(Math.abs(x), Math.abs(z)) / (half - 8);
    if (m > 1) { x /= m; z /= m; }
    g.save(); g.translate(x, z); g.rotate(Math.PI / 4);
    g.fillStyle = "#d9c27e"; g.strokeStyle = "#000"; g.lineWidth = 1.5;
    g.fillRect(-4.5, -4.5, 9, 9); g.strokeRect(-4.5, -4.5, 9, 9);
    g.restore();
  }
  // Oyuncu oku (kuzey yukarıda; ileri yön = (-sin, -cos))
  g.rotate(-player.yaw);
  g.fillStyle = "#ffe066"; g.strokeStyle = "#000"; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

const _proj = new THREE.Vector3();
function updateHUD(dt) {
  drawHearts();
  const zone = G.zone;
  // dayanıklılık ve oksijen çarkları
  const showSt = player.stamina < player.maxStamina - 0.5 || player.climbing || player.gliding || player.running;
  $("stWheel").style.opacity = showSt ? 1 : 0;
  $("stWheel").classList.toggle("tired", player.exhausted);
  const stScale = player.maxStamina / 100;
  $("stWheel").style.transform = `scale(${Math.min(1.5, stScale)})`;
  $("stArc").setAttribute("stroke-dasharray", `${132 * player.stamina / player.maxStamina} 132`);
  const o2 = player.suit ? player.suitO2 : G.shipAir;
  $("o2Wheel").style.opacity = (player.suit || zone.vacuum || G.shipAir < 99) ? 1 : 0;
  $("o2Wheel").classList.toggle("low", o2 < 25);
  $("o2Arc").setAttribute("stroke-dasharray", `${132 * o2 / 100} 132`);
  $("batFill").style.width = player.battery + "%";
  $("heatRow").style.display = player.gun ? "flex" : "none";
  $("heatFill").style.width = (player.overheat > 0 ? 100 : player.heat) + "%";
  $("coreCount").innerText = (G.flags.cores || 0) + "/3";
  $("logCount").innerText = Object.keys(G.flags).filter(k => /^log\d$/.test(k)).length + "/6";
  $("crystalCount").innerText = Object.keys(G.flags).filter(k => k.startsWith("crystal_")).length + "/" + (G.crystalTotal || 9);
  // sıcaklık
  const temp = typeof zone.temp === "function" ? zone.temp() : zone.temp;
  $("thermoVal").innerText = Math.round(temp) + "°C";
  const tf = Math.max(0.05, Math.min(1, (temp + 160) / 200));
  $("thermoFill").style.height = tf * 100 + "%";
  $("thermoFill").style.background = temp < 0 ? "linear-gradient(0deg,#4fa3ff,#bfe9ff)" : temp > 35 ? "linear-gradient(0deg,#ff7a2f,#ffd27a)" : "linear-gradient(0deg,#6fdc4a,#e8f5a0)";
  $("cold").style.opacity = temp < -30 && zone.vacuum ? Math.min(0.5, (-temp - 30) / 80) : 0;
  // afişler
  bannerT -= dt; if (bannerT <= 0) $("banner").style.opacity = 0;
  questT -= dt; if (questT <= 0) $("quest").style.opacity = 0;
  damageFlash = Math.max(0, damageFlash - dt * 1.2);
  $("damage").style.opacity = damageFlash;
  $("alarmTint").style.opacity = G.alarm ? (0.06 + 0.06 * Math.sin(G.time * 6)) : 0;
  mapT -= dt;
  if (mapT <= 0) { drawMinimap(); mapT = 1 / 30; }

  // ekrandaki hedef işareti
  const m = $("marker");
  if (G.marker && !G.uiOpen) {
    _proj.copy(G.marker).project(camera);
    camera.getWorldDirection(_dir);
    _v.copy(G.marker).sub(camera.position);
    const front = _v.dot(_dir) > 0;
    let x = (_proj.x * 0.5 + 0.5) * innerWidth, y = (-_proj.y * 0.5 + 0.5) * innerHeight;
    if (!front) { x = innerWidth - x; y = innerHeight - 40; }
    x = Math.max(40, Math.min(innerWidth - 40, x));
    y = Math.max(90, Math.min(innerHeight - 40, y));
    m.style.left = x + "px";
    m.style.top = y + "px";
    $("markerDist").innerText = Math.round(_v.length()) + " m";
    m.style.display = "block";
  } else m.style.display = "none";
}

// Gemide oda değişince küçük afiş
let lastRoom = null;
function updateRoomBanner() {
  if (!G.roomAt || G.zone.name !== "ship") return;
  const r = G.roomAt(player.pos.x, player.pos.z);
  if (r !== lastRoom) {
    if (lastRoom !== null && r) showBanner(r, "ARGO-7", true);
    lastRoom = r;
  }
}

// ---------------------------------------------------------------- kayıt
const SAVE_KEY = "inASpace.v1";
function saveGame() {
  if (TEST) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ flags: G.flags, stats: G.stats, battery: player.battery, time: G.time }));
  } catch (e) { /* gizli pencerede kayıt olmayabilir */ }
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}

// ---------------------------------------------------------------- döngü
let alarmT = 0;
function update(dt) {
  if (!G.cutscene && !G.turret) movePlayer(dt);
  else { player.moving = false; spaceTap = false; }
  updateStamina(dt);
  for (const f of updaters) f(dt);
  if (G.zone.update) G.zone.update(dt);
  updateOxygen(dt);
  updateRoomBanner();
  if (player.light) {
    if (!G.admin) player.battery = Math.max(0, player.battery - 0.9 * dt);
    if (player.battery <= 0) { player.light = false; toast("Fenerin pili bitti.", 2000); }
  }
  flashlight.intensity = player.light ? 2.4 : 0;
  if (player.overheat > 0) { player.overheat -= dt; if (player.overheat <= 0) player.heat = 0; }
  else player.heat = Math.max(0, player.heat - 22 * dt);
  if (!G.cutscene && !G.turret && !player.dead) updateInteraction(dt);
  interactRequested = false;
  if (G.alarm) { alarmT -= dt; if (alarmT <= 0) { sfx("alarm"); alarmT = 1.4; } }
}

// Oyun saatine bağlı zamanlayıcılar: setTimeout gizli sekmede yavaşlıyor ve duraklatmayı bilmiyor.
const timers = [];
function after(sec, fn) { timers.push({ t: sec, fn }); }

let last = performance.now();
const visuals = [];           // duraklatılmışken de dönen görsel animasyonlar
function tick(dt, withHud) {
  for (let i = timers.length - 1; i >= 0; i--) {
    timers[i].t -= dt;
    if (timers[i].t <= 0) { const t = timers.splice(i, 1)[0]; t.fn(); }
  }
  if (G.running && !G.ended && !player.dead && !G.uiOpen) {
    G.time += dt;
    update(dt);
  }
  if (G.running) {
    updateSay(dt);
    updateMusic(dt);
    for (const f of visuals) f(dt);
    updateCamera(dt);
    if (withHud) updateHUD(dt);
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
// Test botu saati kendisi ilerletir (G.manualClock): gizli panelde rAF durur, zamanlayıcılar yavaşlar,
// ama bot her "bekle" çağrısında oyunu 1/60 sn'lik adımlarla tam o kadar ilerletir.
function advance(sec) {
  const n = Math.max(1, Math.round(sec * 60));
  for (let i = 0; i < n; i++) tick(1 / 60, i === n - 1);
  renderer.render(scene, camera);
}

function fadeTo(opacity) { $("fade").style.opacity = opacity; }
