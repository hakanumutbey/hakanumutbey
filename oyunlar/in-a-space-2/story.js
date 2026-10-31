// IN A SPACE 2 — hikâye, birinci yarı: altyapı (bölüm sistemi, tetikleyiciler, dalgalar, sinematik, seçimler,
// tezgâh, hızlı yolculuk) ve 1–8. bölümler. 9–22. bölümler, boss'lar, kovalamaca ve açılış story2.js'te.
//
// SEÇİMLER HİKÂYEYİ DEĞİŞTİRİR (Hakan'ın isteği). Kalıcı seçimler G.flags.c_* içinde:
//   c_ksha    (9)  yaralı Vorak kaçağı Ksha: "spare" → 15'te kale kapısını açar, 21'de yardım eder; "kill" → gizli sızma
//   c_village (12) Lumi köyüne yardım: "help" → Lumi'ler Grax'ta ve kalede yanında; "hurry" → köy yanar, yardım yok
//   c_partner (14) kaleye kim gelir: "kerem" (kovalamacada eskort), "selin" (şifa), "bora" (ışıldakları söndürür)
//   c_rescue  (16) önce esirler mi hiper sürücü mü: "prisoners" → hepsi kurtulur; "drive" → bir grup kaybolur
//   c_vorakh  (21) Hükümdar teslim olmak ister: "spare" / "end" → farklı son
// Küçük seçimler (ton, kimi dinlersin) mürettebat bağını (G.flags.bond_*) değiştirir; repliklere yansır.
"use strict";

// ---------------------------------------------------------------- bölüm altyapısı
G.epoch = 0;
let watchers = [];
function watch(fn) { fn.epoch = G.epoch; watchers.push(fn); }
updaters.push(dt => {
  const cur = watchers;
  watchers = [];
  for (const f of cur) if (f.epoch === G.epoch && !f(dt)) watchers.push(f);
});
function later(sec, fn) { const ep = G.epoch; after(sec, () => { if (ep === G.epoch) fn(); }); }
function onReach(zoneName, x, z, r, fn) {
  watch(() => {
    if (G.zone.name !== zoneName || G.cutscene) return false;
    if (Math.hypot(player.pos.x - x, player.pos.z - z) < r) { fn(); return true; }
    return false;
  });
}
function goal(text, x, z, y) {
  setObjective(text);
  if (x === undefined || x === null) setMarker(null);
  else setMarker(x, y !== undefined ? y : G.zone.ground(x, z) + 1.5, z);
}
const choice = id => G.flags["c_" + id];
function remember(text) { later(0.3, () => toast(text, 3000)); }
function bond(who, n) { G.flags["bond_" + who] = (G.flags["bond_" + who] || 0) + n; }

// Dalgalar: fight([[["hunter", x, z], ...], ...], bitince). Her dalga temizlenince sıradaki gelir.
let fightN = 0;
function fight(waves, done, opts) {
  opts = opts || {};
  const tag = "f" + (++fightN);
  let i = 0;
  const next = () => {
    const w = waves[i++];
    for (const s of w) {
      const [type, x, z, o] = s;
      later(s[4] || 0, () => { if (!opts.quiet) spawnFx(x, z); spawnEnemy(G.zone, type, x, z, Object.assign({ tag, alerted: !opts.quiet }, o || {})); });
    }
  };
  if (!opts.quiet) music("battle");
  next();
  let wait = 1.5;
  watch(dt => {
    wait -= dt;
    if (wait > 0 || aliveEnemies(tag).length) return false;
    if (i < waves.length) { if (opts.between) opts.between(i); next(); wait = 2; return false; }
    music(opts.after || "calm");
    if (done) done();
    return true;
  });
  return tag;
}
// Vorak'ların iniş ışını
function spawnFx(x, z) {
  const zone = G.zone;
  const y = zone.ground(x, z);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  col.position.set(x, y + 15, z);
  zone.group.add(col);
  let t = 0;
  visuals.push(function fx(dt) {
    t += dt;
    col.material.opacity = 0.5 * Math.max(0, 1 - t / 0.9);
    col.scale.x = col.scale.z = 1 + t;
    if (t > 0.9) { zone.group.remove(col); visuals.splice(visuals.indexOf(fx), 1); }
  });
  if (Math.hypot(x - player.pos.x, z - player.pos.z) < 40) sfx("warp");
}

// Sinematik: shots = [{ dur, cam:(t,k)=>{pos,look,fov}, start?, tick?(dt,t), lines?, wait?:"say" }], bitince done.
// Oyun akışı durur (G.cutscene), siyah şeritler iner. Bir çekim "wait: say" ise konuşma bitene kadar sürer.
function cinematic(shots, done, keepBars) {
  G.cutscene = true;
  cine(true);
  let i = -1, t = 0, cur = null;
  const ep = G.epoch;
  const nextShot = () => {
    i++;
    if (i >= shots.length) {
      G.cine = null;
      if (!keepBars) { cine(false); G.cutscene = false; }
      if (done) done();
      return;
    }
    cur = shots[i]; t = 0;
    if (cur.start) cur.start();
    if (cur.lines) say(cur.lines);
  };
  G.cine = rawDt => {
    if (ep !== G.epoch) return null;
    if (!cur) return null;
    t += rawDt;
    if (cur.tick) cur.tick(rawDt, t);
    const k = cur.dur ? Math.min(1, t / cur.dur) : 0;
    const c = cur.cam ? cur.cam(t, k) : null;
    const over = cur.wait === "say" ? (!talking() && t > 0.5) : (cur.wait === "choice" ? cur.chosen : t >= cur.dur);
    if (over) nextShot();
    return c;
  };
  nextShot();
}
// Konuşan NPC'ye omuz üstü çekim
function talkShot(npc, lines, extra) {
  const p = npc.root.position;
  return Object.assign({
    wait: "say", lines,
    start: () => { faceTo(npc, player.pos.x, player.pos.z); player.yaw = Math.atan2(-(p.x - player.pos.x), -(p.z - player.pos.z)); npc.st.talk = true; },
    cam: () => {
      const dx = p.x - player.pos.x, dz = p.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
      const ox = -dz / d, oz = dx / d;
      return { pos: V3(player.pos.x - dx / d * 1.8 + ox * 0.9, player.pos.y + 1.9, player.pos.z - dz / d * 1.8 + oz * 0.9), look: V3(p.x, p.y + 1.5, p.z) };
    },
    tick: () => { if (!talking()) npc.st.talk = false; }
  }, extra || {});
}
// Konuşma + seçim: talkChoice(npc, giriş, [ [seçenek, cevap satırları, fn], ... ], bitince)
function talkChoice(npc, intro, options, done) {
  const shot = talkShot(npc, intro);
  const choose = {
    wait: "choice", chosen: false, cam: shot.cam,
    start: () => {
      ask(options.map(o => o[0]), idx => {
        const o = options[idx];
        say([["Kaptan", o[0]]].concat(o[1] || []), () => { choose.chosen = true; });
        if (o[2]) o[2]();
      });
    }
  };
  cinematic([shot, choose], done);
}

const CH_START = [];
function startChapter(n, opts) {
  opts = opts || {};
  G.epoch++;
  G.chapter = n;
  G.ended = false;
  G.boss = null;
  G.cine = null;
  G.cutscene = false;
  G.timeScale = 1;
  G.hidePlayer = false;
  G.alarm = false;
  G.bipHidden = false;
  G.mouseHook = null;
  G.hitTargets = [];
  setObjective(""); setMarker(null);
  cine(false);
  clearEnemies();
  clearProjectiles();
  sayQueue.length = 0; sayTimer = 0;
  $("subtitle").style.display = "none";
  $("choices").style.display = "none"; choiceActive = null;
  $("shipHud").style.display = "none"; $("hud").style.display = "";
  $("speedo").style.display = "none";
  player.dead = false;
  $("deathScreen").style.display = "none";
  ensureState(n);
  player.health = player.maxHealth;
  player.stamina = player.maxStamina; player.exhausted = false;
  if (player.hammer.state !== "hand") catchHammer(true);
  saveGame();
  fadeTo(0);
  const ch = CHAPTERS[n - 1];
  if (!opts.noCard) chapterCard(n, ch.name);
  ch.start(opts);
}

// Bölüm seçince/devam edince önceki bölümlerin sonuçları yerinde olsun
function ensureState(n) {
  const f = G.flags;
  if (n >= 2) f.suit = 1;
  if (n >= 6) { f.bip = 1; f.hammerFound = 1; f.filter = 1; }
  if (n >= 7) f.engine = 1;
  if (n >= 8) f.wing = 1;
  if (n >= 9) f.comm = 1;
  if (n >= 10) { f.kerem = 1; if (!f.c_ksha) f.c_ksha = "spare"; }
  if (n >= 11) f.selin = 1;
  if (n >= 12) f.bora = 1;
  if (n >= 13 && !f.c_village) f.c_village = "help";
  if (n >= 14) { f.grax = 1; f.keycard = 1; }
  if (n >= 15) { f.signal = 1; if (!f.c_partner) f.c_partner = "bora"; }
  if (n >= 17) { f.drive = 1; f.cells = 1; if (!f.c_rescue) f.c_rescue = "prisoners"; }
  if (n >= 18) f.zhal = 1;
  if (n >= 20) f.chase = 1;
  if (n >= 21) f.antenna = 1;
  if (n >= 22) { f.vorakh = 1; if (!f.c_vorakh) f.c_vorakh = "end"; }
  G.flags.jetpack = n >= 2;
  player.hasHammer = n >= 2 && !(n === 5 && !f.hammerFound);
  G.o2Drain = 0;
  player.maxHealth = 100 + (f.selin ? 20 : 0) + (f.grax ? 20 : 0) + G.up.hp * 20;
  setPlayerSuit(n >= 2 && n !== 22);
  attachHammer();
  G.bip.root.visible = !!f.bip;
}

// ---------------------------------------------------------------- oyuncu modeli
function setPlayerSuit(suited) {
  if (player.rig && player.rig.suited === suited) return;
  if (player.rig) scene.remove(player.rig.root);
  player.rig = suited ? makeHuman({}) : makeHuman({ helmet: false, suit: 0x2f4f7a, accent: 0xff8a2a, backpack: false, skin: 0xc99872, hair: 0x2a1d14 });
  player.rig.suited = suited;
  player.rig.root.traverse(m => { if (m.isMesh) m.castShadow = true; });
  scene.add(player.rig.root);
  attachHammer();
}
player.hammer.mesh = makeHammer();
G.bip = makeBip();
G.bip.root.visible = false;
scene.add(G.bip.root);

// ---------------------------------------------------------------- tezgâh (yükseltmeler) ve hızlı yolculuk
const UPGRADES = [
  { id: "dmg", name: "Balyoz Gücü", desc: "Yakın dövüş ve fırlatma hasarı +%25.", cost: [60, 120, 200, 320] },
  { id: "throw", name: "Mıknatıs Bobini", desc: "Fırlatılan balyoz daha hızlı ve +%20 hasar.", cost: [80, 160, 260] },
  { id: "hp", name: "Giysi Zırhı", desc: "Azami can +20.", cost: [90, 180, 300] },
  { id: "bip", name: "BİP Lazeri", desc: "BİP'in atışları güçlenir, Q daha sık.", cost: [70, 150, 250] }
];
function openUpgrade() {
  openUI("upgradeScreen");
  const box = $("upCards");
  const draw = () => {
    $("upScrap").innerText = "HURDA: " + G.scrap;
    box.innerHTML = "";
    for (const u of UPGRADES) {
      const lv = G.up[u.id], max = u.cost.length, cost = u.cost[lv];
      const c = document.createElement("div"); c.className = "card";
      c.innerHTML = `<div class="n">${u.name}</div><div class="d">${u.desc}</div><div class="lv">SEVİYE ${lv} / ${max}</div>`;
      const b = document.createElement("button");
      b.textContent = lv >= max ? "TAMAM" : `YÜKSELT · ${cost}`;
      b.disabled = lv >= max || G.scrap < cost;
      b.onclick = () => {
        if (lv >= max || G.scrap < cost) return;
        G.scrap -= cost; G.up[u.id]++;
        if (u.id === "hp") { player.maxHealth += 20; player.health = player.maxHealth; }
        sfx("quest"); saveGame(); draw();
      };
      c.appendChild(b); box.appendChild(c);
    }
  };
  draw();
}
$("btnUpClose").onclick = () => closeUI();
function openTravel() {
  openUI("travelScreen");
  const box = $("travelList");
  box.innerHTML = "";
  for (const s of W.stones) {
    const b = document.createElement("button");
    b.textContent = s.name;
    b.disabled = !G.flags["stone_" + s.id];
    b.onclick = () => { closeUI(); travelTo(s); };
    box.appendChild(b);
  }
}
$("btnTravelClose").onclick = () => closeUI();
function travelTo(s) {
  fadeTo(1);
  later(0.7, () => { setZone("tahra", s.x + 2.5, s.z + 2.5, player.yaw); fadeTo(0); sfx("warp"); });
}

// ---------------------------------------------------------------- NPC'ler
const NPC = {};
function makeCast() {
  const nasa = G.zones.nasa, tahra = G.zones.tahra;
  // Dünya'da (giysisiz) mürettebat ve Başkan
  NPC.carter = makeNPC(nasa, { helmet: false, formal: true, backpack: false, skin: 0x8a5a3c, hair: 0x9a9a9a, hairStyle: "gray" }, W.nasa.carter[0], W.nasa.carter[1], 0);
  NPC.keremE = makeNPC(nasa, { helmet: false, suit: 0x2f4f7a, backpack: false, skin: 0xd8a27a, hair: 0x1a1410 }, W.nasa.crew.kerem[0], W.nasa.crew.kerem[1], Math.PI / 2);
  NPC.selinE = makeNPC(nasa, { helmet: false, suit: 0x2f4f7a, backpack: false, skin: 0xe0b08a, hair: 0x5a2a1a, hairStyle: "long" }, W.nasa.crew.selin[0], W.nasa.crew.selin[1], Math.PI / 2);
  NPC.boraE = makeNPC(nasa, { helmet: false, suit: 0x2f4f7a, backpack: false, skin: 0xb8865e, hair: 0x2a2a2a, hairStyle: "bald" }, W.nasa.crew.bora[0], W.nasa.crew.bora[1], -Math.PI / 2);
  NPC.selinE.st.sit = true;
  // Tahra'da kampta (giysili, kask yok — filtreli hava)
  const cx = W.camp[0], cz = W.camp[1];
  NPC.kerem = makeNPC(tahra, { helmet: false, skin: 0xd8a27a, hair: 0x1a1410 }, cx - 3, cz + 2, 0);
  NPC.selin = makeNPC(tahra, { helmet: false, skin: 0xe0b08a, hair: 0x5a2a1a, hairStyle: "long" }, cx + 3, cz + 3, 0.6);
  NPC.bora = makeNPC(tahra, { helmet: false, skin: 0xb8865e, hair: 0x2a2a2a, hairStyle: "bald" }, cx + 1, cz - 2, 2.4);
  for (const k of ["kerem", "selin", "bora"]) NPC[k].root.visible = false;
  // Lumi köyü
  const v = W.village;
  NPC.oru = placeLumi(tahra, v.x + 3, v.z + 3, 0xc3a6ff, 1.25);
  NPC.mila = placeLumi(tahra, v.x - 4, v.z + 5, 0x6ff0d2, 0.75);
  NPC.villagers = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, r = 12 + (i % 3) * 3;
    NPC.villagers.push(placeLumi(tahra, v.x + Math.cos(a) * r, v.z + Math.sin(a) * r, [0x6ff0d2, 0x7fd8ff, 0xc3a6ff][i % 3], 0.9 + (i % 2) * 0.1));
  }
  // kaledeki esirler
  NPC.prisoners = W.cells.map(([x, z]) => [0, 1, 2].map(j => placeLumi(tahra, x - 1 + j * 0.9, z + (j - 1) * 0.6, 0x7fd8ff, 0.8)));
  // Ksha: yaralı Vorak kaçağı (9. bölüm), Dünya'daki tören için ayrı
  NPC.ksha = makeAlienRig({ color: 0x4a3a5a, eye: 0x7fd8ff });
  tahra.group.add(NPC.ksha.root);
  NPC.ksha.root.visible = false;
  // kayıp Lumi yavrusu (12)
  NPC.lost = placeLumi(tahra, W.lostLumi[0], W.lostLumi[1], 0xffd36a, 0.6);
  NPC.lost.root.visible = false;
}
function showCampCrew() {
  NPC.kerem.root.visible = !!G.flags.kerem;
  NPC.selin.root.visible = !!G.flags.selin;
  NPC.bora.root.visible = !!G.flags.bora;
}

// ---------------------------------------------------------------- kalıcı etkileşimler (bölüme göre etiket değişir)
function makeInteractions() {
  const nasa = G.zones.nasa, tahra = G.zones.tahra;
  // NASA: mürettebatla sohbet (seçimli) — 1. bölüm
  const crewTalk = (id, npc, intro, opts) => addInteract(nasa, {
    pos: npc.root.position.clone().setY(1.5), r: 3,
    label: () => G.chapter === 1 && G.flags.carterDone && !G.flags["talk_" + id] ? "Konuş" : null,
    act: () => talkChoice(npc, intro, opts, () => { G.flags["talk_" + id] = 1; crewProgress(); })
  });
  crewTalk("kerem", NPC.keremE, [["Kerem", "Kaptan! Duydun mu? Ay'a gidiyoruz. Ben uçuruyorum, sen de bana yol tarifi vermeyeceksin bu sefer."]], [
    ["Sen en iyi pilotsun Kerem.", [["Kerem", "Biliyorum. Ama senden duymak güzel. Bu yolculuk sana borcum olsun."]], () => bond("kerem", 1)],
    ["Geçen sefer yanlış piste indin ama.", [["Kerem", "Bir kere oldu! Bir kere! ...Peki, iki."], ["Kerem", "Bu sefer kusursuz olacak. Göreceksin."]], () => bond("kerem", -1)]
  ]);
  crewTalk("selin", NPC.selinE, [["Selin", "Kaptan. Anten sessizliği üç gündür sürüyor ve kimse nedenini bilmiyor. Bu beni rahatsız ediyor."]], [
    ["Haklısın, dikkatli olacağız.", [["Selin", "Teşekkürler. Herkesin ilk yardım çantası benden. İtiraz istemem."]], () => bond("selin", 1)],
    ["Bir antendir, büyütme.", [["Selin", "Üç gündür hiçbir şey göndermeyen bir anten... Umarım haklısındır."]], () => bond("selin", -1)]
  ]);
  crewTalk("bora", NPC.boraE, [["Bora", "Kaptan, sana bir şey yaptım. Gizli proje. Başkan'a söyleme, bütçeden yemedim. Çok değil."]], [
    ["Göster bakalım.", [["Bora", "Manyetik Balyoz! Fırlat, geri çağır, kendi kendine geri gelir. Giysi odasında, dolabında."]], () => bond("bora", 1)],
    ["Bütçeyi sonra konuşacağız.", [["Bora", "Tamam tamam... Ama dene bir. Giysi odasında, dolabında. Seveceksin."]], () => bond("bora", -1)]
  ]);
  // Başkan Carter
  addInteract(nasa, { pos: V3(W.nasa.carter[0], 1.5, W.nasa.carter[1] + 0.5), r: 3.5, label: () => G.chapter === 1 && !G.flags.carterDone ? "Başkan Carter ile konuş" : null, act: carterTalk });
  // Giysi dolabı
  addInteract(nasa, { pos: V3(W.nasa.suit[0], 1.5, W.nasa.suit[1]), r: 3, label: () => G.chapter === 1 && G.flags.crewDone ? "Giysini giy" : null, act: suitUp });
  // Tahra: tezgâh, kamp
  addInteract(tahra, { pos: V3(W.bench[0], W.tahraGround(W.bench[0], W.bench[1]) + 1, W.bench[1]), r: 3, label: () => G.flags.bench ? "Tezgâh (yükseltme)" : null, act: openUpgrade });
  // hızlı yolculuk taşları
  for (const s of W.stones) addInteract(tahra, {
    pos: V3(s.x, W.tahraGround(s.x, s.z) + 1.5, s.z), r: 3,
    label: () => G.chapter < 5 ? null : (G.flags["stone_" + s.id] ? "Işık Taşı: hızlı yolculuk" : "Işık Taşını uyandır"),
    act: () => {
      if (!G.flags["stone_" + s.id]) {
        G.flags["stone_" + s.id] = 1; s.mesh.material.emissiveIntensity = 1.5; sfx("crystal"); acquired("Işık Taşı: " + s.name);
        tutorialOnce("stone", "IŞIK TAŞLARI", "Uyandırdığın taşlar arasında hızlı yolculuk yapabilirsin. Bir taşa gelip <kbd>E</kbd>.");
        saveGame();
      } else openTravel();
    }
  });
  // kamptaki mürettebat (yan sohbetler; bölüme göre)
  for (const k of ["kerem", "selin", "bora"]) addInteract(tahra, {
    pos: NPC[k].root.position.clone().setY(NPC[k].root.position.y + 1.5), r: 3,
    label: () => NPC[k].root.visible && !G.cutscene && campLine(k, true) ? "Konuş: " + k[0].toUpperCase() + k.slice(1) : null,
    act: () => cinematic([talkShot(NPC[k], campLine(k))])
  });
  // Lumi fenerleri (toplanabilir, God of War'daki eserlerin karşılığı)
  const R = rng(99);
  W.lanterns = [];
  const spots = [[-30, 60], [60, -40], [-90, -60], [40, -120], [-60, 200], [230, 120], [130, -230], [-240, -60], [-120, -230], [100, 230], [-230, 140], [70, 130]];
  for (const [x, z] of spots) {
    const y = W.tahraGround(x, z);
    const m = mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.5, 6), glowMat(0xffd36a, 1.8), x, y + 0.9, z, tahra.group);
    const id = "lantern_" + W.lanterns.length;
    W.lanterns.push(id);
    addInteract(tahra, { pos: V3(x, y + 1, z), r: 2.5, label: () => G.flags[id] || G.chapter < 5 ? null : "Lumi fenerini al", act: () => {
      G.flags[id] = 1; m.visible = false; addScrap(25); acquired(`Lumi feneri (${lanternCount()}/12)`);
      if (lanternCount() === 12) { say([["BİP", "On iki fenerin hepsi! Lumi'ler buna bayılacak, Kaptan."]]); player.maxStamina = 130; }
      saveGame();
    } });
    visuals.push(dt => { if (G.flags[id]) m.visible = false; else m.rotation.y += dt; });
  }
}
const lanternCount = () => W.lanterns.filter(id => G.flags[id]).length;
function campLine(k, check) {
  const c = G.chapter, f = G.flags;
  const L = {
    kerem: c <= 11 ? [["Kerem", "Kumdan çıkardığın için sağ ol. Bir dahaki sefere ben seni çıkarırım. Söz."]]
      : c <= 14 ? [["Kerem", "Gemi parçaları geldikçe içim rahatlıyor. ATLAS'ı tekrar uçuracağım, Kaptan."]]
      : [["Kerem", f.c_partner === "kerem" ? "Kale yolunda arkanı ben kollayacağım. Söz verdim ya." : "Kaledeyken burada motoru ısıtıyorum. Çabuk dön."]],
    selin: c <= 12 ? [["Selin", "Ayaz otu işe yaradı. Şimdi sıra sende: dinlen biraz. ...Tamam, dinlenmeyeceksin, biliyorum."]]
      : [["Selin", f.c_village === "help" ? "Lumi'ler bana şifa tohumlarını gösterdi. İnanılmaz bir tıp bilgileri var." : "Köydekiler bize küs. Onları suçlayamam."]],
    bora: c <= 13 ? [["Bora", "İletişim modülünü toparlıyorum. Bir de... balyozu sevdin mi? Sevdin. Biliyorum."]]
      : [["Bora", "Tezgâhta hurdayla balyozunu güçlendirebilirim. Vorak hurdası çok kaliteli, söylemesi acı."]]
  };
  return L[k];
}

// ================================================================ 1. NASA MERKEZİ
function ch1() {
  G.flags.carterDone = 0; G.flags.crewDone = 0;
  setZone("nasa", W.nasa.spawn[0], W.nasa.spawn[1], 0);
  music("calm");
  checkpoint(() => setZone("nasa", W.nasa.spawn[0], W.nasa.spawn[1], 0));
  goal("Başkan Carter'ın ofisine git", W.nasa.carter[0], W.nasa.carter[1]);
  later(1.5, () => say([["Anons", "Kaptan, Başkan Carter sizi ofisinde bekliyor. Tekrar ediyorum: Başkan sizi bekliyor."]]));
  later(4, () => tutorial("HAREKET", "<kbd>W A S D</kbd> yürü, <kbd>Shift</kbd> koş, fare ile kamerayı döndür. Konuşmak için <kbd>E</kbd>."));
  onReach("nasa", W.nasa.carter[0], W.nasa.carter[1] + 2, 4, () => { if (!G.flags.carterDone) carterTalk(); });
}
function carterTalk() {
  if (G.flags.carterDone || G.cutscene) return;
  G.flags.carterDone = 1;
  const c = NPC.carter;
  talkChoice(c, [
    ["Başkan Carter", "Kaptan, geldin. Otur... ya da otur deme, sen hiç oturmazsın."],
    ["Başkan Carter", "Ay'daki röle antenimiz üç gündür sessiz. Dünya ile derin uzay arasındaki tek gözümüz o."],
    ["Başkan Carter", "Son gönderdiği görüntüde... bir gölge var. Bir gemi mi, bir parazit mi, bilmiyoruz."]
  ], [
    ["Bir gemi mi? Kimin gemisi?", [["Başkan Carter", "Bilmiyoruz. Ve bilmediğimiz şeylerden korkarım. Gidip bakmanı, anteni onarmanı istiyorum."]], () => { G.flags.c_carter = "curious"; }],
    ["Anteni onarırız. Ne zaman kalkıyoruz?", [["Başkan Carter", "Bu akşam. ATLAS hazır. Seni bu yüzden seviyorum, Kaptan: soru sormuyorsun."]], () => { G.flags.c_carter = "duty"; }]
  ], () => {
    say([["Başkan Carter", "Mürettebatınla konuş, sonra giysini giy. Eğitim sahasında son kontrolleri yap."], ["Başkan Carter", "Ve Kaptan... dikkatli ol."]]);
    goal("Mürettebatla konuş: Kerem, Selin, Bora (0/3)", W.nasa.crew.kerem[0], W.nasa.crew.kerem[1]);
  });
}
function crewProgress() {
  const n = ["kerem", "selin", "bora"].filter(k => G.flags["talk_" + k]).length;
  if (n < 3) {
    const nextK = ["kerem", "selin", "bora"].find(k => !G.flags["talk_" + k]);
    goal(`Mürettebatla konuş: Kerem, Selin, Bora (${n}/3)`, W.nasa.crew[nextK][0], W.nasa.crew[nextK][1]);
  } else {
    G.flags.crewDone = 1;
    goal("Giysi odasında giysini giy", W.nasa.suit[0], W.nasa.suit[1]);
  }
}
function suitUp() {
  fadeTo(1);
  sfx("power");
  later(0.9, () => {
    setPlayerSuit(true);
    G.flags.suit = 1;
    player.hasHammer = true;
    attachHammer();
    acquired("Uzay giysisi");
    acquired("Manyetik Balyoz");
    fadeTo(0);
    say([["Bora", "(telsiz) Balyozu buldun! Sağ elinde. Eğitim sahasına çık, mankenleri dövelim. Yani... dene."]], () => startChapter(2));
  });
}

// ================================================================ 2. EĞİTİM
function ch2() {
  setZone("nasa", W.nasa.exit[0], W.nasa.exit[1] + 4, Math.PI);
  G.flags.jetpack = true;
  music("calm");
  checkpoint(() => setZone("nasa", 0, 40, Math.PI));
  const T = W.train;
  // 1) mankenler (yakın dövüş)
  const dummies = T.dummies.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); G.zones.nasa.group.add(g);
    mesh(CYL(0.08, 0.08, 1.2, 6), mat(0x6a5a4a), 0, 0.6, 0, g);
    const body = mesh(CYL(0.4, 0.35, 1.0, 10), mat(0xc8a878), 0, 1.6, 0, g);
    mesh(SPH(0.25), mat(0xc8a878), 0, 2.35, 0, g);
    const d = { zone: G.zones.nasa, pos: V3(x, 1.5, z), r: 1.2, hp: 3, g, active: () => d.hp > 0,
      hit: () => { d.hp--; g.rotation.z = 0.4; later(0.15, () => { g.rotation.z = 0; }); sfx("hit"); if (d.hp <= 0) { g.visible = false; acquired("Manken devrildi"); step1(); } } };
    return d;
  });
  G.hitTargets = dummies;
  goal("Eğitim mankenlerini balyozla devir (0/3)", T.dummies[1][0], T.dummies[1][1]);
  later(1, () => {
    say([["Bora", "(telsiz) Sol tık: vur. Üst üste üç kez basarsan üçüncüsü ağır bir darbe olur. Hadi göster kendini!"]]);
    tutorial("DÖVÜŞ", "<kbd>Sol tık</kbd> vur. Üç vuruşluk kombo: üçüncüsü güçlü. <kbd>C</kbd> yuvarlanarak kaç.");
  });
  let down = 0;
  function step1() {
    down++;
    if (down < 3) { setObjective(`Eğitim mankenlerini balyozla devir (${down}/3)`); return; }
    // 2) fırlatma hedefleri
    const targets = T.targets.map(([x, z, h]) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); G.zones.nasa.group.add(g);
      mesh(CYL(0.06, 0.06, h, 6), mat(0x666666), 0, h / 2, 0, g);
      const disc = mesh(CYL(0.6, 0.6, 0.1, 16), glowMat(0xff5a4a, 0.8), 0, h + 0.4, 0, g); disc.rotation.x = Math.PI / 2;
      const t = { zone: G.zones.nasa, pos: V3(x, h + 0.4, z), r: 0.9, done: false, active: () => !t.done,
        hit: kind => { if (kind !== "thrown") { toast("Bunu fırlatarak vurmalısın!", 1500); return; } t.done = true; disc.material = glowMat(0x6fd36a, 1); acquired("Hedef vuruldu"); step2(); } };
      return t;
    });
    G.hitTargets = targets;
    goal("Balyozu fırlatarak hedefleri vur (0/3)", T.targets[1][0], T.targets[1][1]);
    say([["Bora", "Şimdi en güzel kısmı! Sağ tıkla nişan al, sol tıkla fırlat. R ile geri çağır. Mıknatıs gerisini halleder."]]);
    tutorial("FIRLAT VE ÇAĞIR", "<kbd>Sağ tık</kbd> basılı: nişan al. <kbd>Sol tık</kbd>: fırlat. <kbd>R</kbd>: geri çağır.");
    let hits = 0;
    function step2() {
      hits++;
      if (hits < 3) { setObjective(`Balyozu fırlatarak hedefleri vur (${hits}/3)`); return; }
      G.hitTargets = [];
      goal("Tırmanma kayasına tırman", T.wall[0], T.wall[1]);
      say([["Bora", "Harika! Şimdi tırmanma kayası. Kayaya doğru W basılı tut. Dayanıklılığın biterse düşersin, dikkat."]]);
      watch(() => {
        if (player.pos.y < 6.5 || Math.hypot(player.pos.x - T.wall[0], player.pos.z - T.wall[1]) > 3) return false;
        acquired("Tırmanma");
        goal("Süzülme kulesine tırman, halkaya süzül", T.tower[0], T.tower[1], 15);
        say([["Bora", "Şimdi kuleye. Tepeden atla, havadayken Space'e tekrar bas: jetpack süzülmesi. Turuncu halkaya in!"]]);
        tutorial("SÜZÜLME", "Havadayken <kbd>Space</kbd>'e tekrar bas: süzül. Tekrar basarsan bırakırsın. Süzülmek dayanıklılık harcar.");
        step3();
        return true;
      });
    }
  }
  function step3() {
    let wasHigh = false;
    watch(() => {
      if (player.pos.y > 12) { wasHigh = true; setMarker(T.glideLand[0], 1, T.glideLand[1]); }
      if (!wasHigh || !player.onGround) return false;
      if (Math.hypot(player.pos.x - T.glideLand[0], player.pos.z - T.glideLand[1]) < 3.2) {
        acquired("Süzülme");
        W.trainRing.visible = false;
        step4();
        return true;
      }
      if (player.pos.y < 1) { wasHigh = false; toast("Halkayı kaçırdın. Kuleye tekrar tırman.", 2200); setMarker(T.tower[0], 15, T.tower[1]); }
      return false;
    });
  }
  function step4() {
    // eğitim robotlarıyla son sınav (yuvarlanma, kombo)
    goal("Eğitim robotlarını yen", 0, 80);
    say([["Bora", "Son sınav: iki eğitim robotu. Saldırmadan önce gözleri parlar. O an C ile yuvarlan!"]]);
    tutorial("KAÇ VE VUR", "Düşmanın gözleri parladığında saldıracak demektir: <kbd>C</kbd> ile yuvarlan, sonra karşılık ver.");
    fight([[["hunter", -4, 84, { hp: 70, dmg: 4, name: "Eğitim robotu", rig: makeAlienRig({ color: 0x8a8a8a, plate: 0x4a4a4a, eye: 0x7fd8ff }) }],
            ["hunter", 4, 84, { hp: 70, dmg: 4, name: "Eğitim robotu", rig: makeAlienRig({ color: 0x8a8a8a, plate: 0x4a4a4a, eye: 0x7fd8ff }) }]]], () => {
      say([["Bora", "Eğitim bitti! Seni gururla kızdırdım. Yani... gururlandırdım."],
           ["Başkan Carter", "(telsiz) Mürettebat, fırlatma rampasına. Yolculuk başlıyor."]]);
      goal("Fırlatma rampasına git", W.pad.x, W.pad.z - 18);
      onReach("nasa", W.pad.x, W.pad.z - 18, 6, () => startChapter(3));
    }, { after: "calm" });
  }
}

// ================================================================ 3. KALKIŞ (sinematik)
function ch3() {
  setZone("nasa", W.pad.x + 4, W.pad.z - 20, Math.PI);
  const R = W.rocket;
  R.root.position.y = 1; R.fire.visible = false; R.fireLight.intensity = 0;
  G.hidePlayer = true;
  music("tense");
  const smoke = [];
  const zone = G.zones.nasa;
  let liftT = 0, ignite = false;
  checkpoint(() => startChapter(3));
  cinematic([
    { dur: 7, lines: [["Kerem", "Kontroller tamam. Yakıt tamam. Kahve... yok. Kahve yok!"], ["Selin", "Kahve yok, Kerem. Kalp atışın zaten 110."], ["BİP", "Bip! Ben de geliyorum. Kimse sormadı ama söylüyorum."]],
      cam: (t, k) => ({ pos: V3(40 - k * 10, 6 + k * 4, 120), look: V3(0, 18, 170) }) },
    { dur: 6, lines: [["Anons", "On... dokuz... sekiz... yedi..."], ["Anons", "Altı... beş... dört..."]],
      cam: (t, k) => ({ pos: V3(-14, 3, 150), look: V3(0, 8 + k * 6, 170) }) },
    { dur: 3, lines: [["Anons", "Üç... iki... bir... Ateşleme!"]], start: () => { ignite = true; R.fire.visible = true; sfx("rumble"); },
      tick: dt => { R.fireLight.intensity = 3; shake = 0.6; },
      cam: (t, k) => ({ pos: V3(26, 2, 140), look: V3(0, 4, 170) }) },
    { dur: 8, lines: [["Başkan Carter", "(telsiz) ATLAS kalktı. Yolunuz açık olsun, çocuklar."]],
      tick: dt => { liftT += dt; R.root.position.y = 1 + liftT * liftT * 3; shake = Math.max(0, 0.5 - liftT * 0.05); },
      cam: (t, k) => ({ pos: V3(30, 4, 120), look: V3(0, 12 + R.root.position.y, 170), fov: 55 }) }
  ], () => { G.hidePlayer = false; startChapter(4); });
  // duman
  visuals.push(function sm(dt) {
    if (G.chapter !== 3) { for (const s of smoke) zone.group.remove(s.m); visuals.splice(visuals.indexOf(sm), 1); return; }
    if (ignite && smoke.length < 90 && Math.random() < 0.8) {
      const m = mesh(SPH(2, 8, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd, transparent: true, opacity: 0.7 }), W.pad.x + (Math.random() - 0.5) * 6, 2, W.pad.z, zone.group);
      m.castShadow = false;
      smoke.push({ m, v: V3((Math.random() - 0.5) * 14, Math.random() * 2, (Math.random() - 0.5) * 14), t: 0 });
    }
    for (const s of smoke) { s.t += dt; s.m.position.addScaledVector(s.v, dt); s.m.scale.setScalar(1 + s.t * 1.2); s.m.material.opacity = Math.max(0, 0.7 - s.t * 0.08); }
  });
}

// ================================================================ 4. IŞIN (yolculuk, saldırı, 1000 km/s savrulma, kaza)
function ch4() {
  setZone("space", 0, 0, 0);
  G.hidePlayer = true;
  G.bipHidden = true;
  const A = W.spaceAtlas, V = W.vorakShip, K = W.spaceKaptan;
  // sahneyi sıfırla
  A.root.position.set(0, 0, 0); A.root.rotation.set(0, 0, 0);
  for (const k in A.parts) { A.parts[k].position.set(0, 0, 0); A.parts[k].rotation.set(0, 0, 0); A.parts[k].visible = true; }
  setAtlasThrust(A, true, 1);
  V.root.visible = false; W.beam.visible = false; K.root.visible = false; W.tahraBody.visible = false;
  for (const l of W.speedLines) l.visible = false;
  music("calm");
  checkpoint(() => startChapter(4));
  const debris = [];
  let parts = null, kVel = 0, slow = 1;
  const kpos = V3();
  cinematic([
    { dur: 8, lines: [["Kerem", "Dünya yörüngesinden çıktık. Ay'a altı saat. Kimse kemerini çözmesin, ben dahil."],
                      ["Selin", "Kaptan, sen de biraz uyu. İki gündür gözünü kırpmadın."], ["BİP", "Ben uyumam. Ben bekçiyim. Bip."]],
      cam: (t, k) => { const a = 0.6 + k * 0.8; return { pos: V3(Math.cos(a) * 18, 4, Math.sin(a) * 18 - 2), look: V3(0, 0, -2) }; } },
    { dur: 6, lines: [["BİP", "Kaptan... radarda bir şey var. Ay'ın arkasından çıktı. Büyük. Çok büyük."], ["Kerem", "Bu bizim değil. Bu kimsenin değil!"]],
      start: () => { V.root.visible = true; V.root.position.set(-80, 30, -500); V.root.lookAt(0, 0, 0); sfx("alarm"); music("tense"); },
      tick: (dt, t) => { V.root.position.lerp(V3(0, 10, -90), Math.min(1, dt * 0.6)); V.root.lookAt(0, 0, 0); },
      cam: (t, k) => ({ pos: V3(3, 3, 14), look: V3(V.root.position.x * 0.5, V.root.position.y * 0.5, -60) }) },
    { wait: "choice", chosen: false, cam: () => ({ pos: V3(-4, 2.5, 12), look: V3(V.root.position.x, V.root.position.y, V.root.position.z) }),
      start() {
        const self = this;
        say([["Telsiz", "...kshhh... vrak... thal... Ksha... kshhh..."], ["Kerem", "Kaptan, ne yapıyoruz?"]], () => {
          ask(["Selam ver: \"Biz barışçıl bir araştırma gemisiyiz.\"", "Kalkanları aç, Kerem! Kaçış rotası!"], i => {
            G.flags.c_hail = i === 0 ? "peace" : "shields";
            say(i === 0 ? [["Kaptan", "Burası ATLAS. Barışçıl bir araştırma gemisiyiz. Kimsiniz?"], ["Telsiz", "...kshhh... Ay'ın gözü kapandı. Siz de kapanacaksınız."]]
                        : [["Kaptan", "Kalkanlar! Kerem, bizi buradan çıkar!"], ["Kerem", "Kalkanlar açık! Dön, dön, dön...!"]], () => { self.chosen = true; });
          });
        });
      } },
    { dur: 2.2, start: () => { W.beam.visible = true; sfx("beam"); },
      tick: (dt, t) => {
        const from = V.emitter.getWorldPosition(V3()), to = V3(0, 0, -1);
        W.beam.position.copy(from).lerp(to, 0.5);
        W.beam.scale.set(1 + Math.sin(t * 40) * 0.2, from.distanceTo(to), 1 + Math.sin(t * 40) * 0.2);
        W.beam.lookAt(to); W.beam.rotateX(Math.PI / 2);
        shake = 0.4;
      },
      cam: (t, k) => ({ pos: V3(10, 4, 10), look: V3(0, 2, -20) }) },
    // PARÇALANMA ve 1000 km/s savrulma: yandan, ağır çekim, film gibi (Hakan'ın sahnesi)
    { dur: 7.5, start: () => {
        flashWhite(180); sfx("explosion"); shake = 1.2; W.beam.visible = false;
        if (G.flags.c_hail === "shields") toast("Kalkanlar ışını yavaşlattı ama durduramadı.", 2500);
        parts = Object.keys(A.parts).map((k, i) => ({ g: A.parts[k], v: V3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10), w: V3(Math.random() * 2, Math.random() * 2, Math.random() * 2) }));
        setAtlasThrust(A, false);
        for (let i = 0; i < 40; i++) {
          const m = mesh(BOX(0.2 + Math.random() * 0.8, 0.1 + Math.random() * 0.3, 0.2 + Math.random() * 1), mat(Math.random() < 0.3 ? 0xff8a2a : 0xdddddd), 0, 0, 0, G.zones.space.group);
          debris.push({ m, off: V3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10), w: V3(Math.random() * 3, Math.random() * 3, Math.random() * 3), v: (Math.random() - 0.5) * 0.4 });
        }
        K.root.visible = true; kpos.set(0, 0, 0); kVel = 0;
        for (const l of W.speedLines) { l.visible = true; l.position.set((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30 - 2); l.rotation.y = Math.PI / 2; }
        $("speedo").style.display = "block";
        sfx("heartbeat");
        later(1.2, () => sfx("heartbeat")); later(2.4, () => sfx("heartbeat")); later(3.6, () => sfx("heartbeat"));
      },
      tick: (dt, t) => {
        // ağır çekim: ilk saniyede hızla yavaşlar, sonra çok yavaş akar
        slow = t < 0.4 ? 1 - t * 2.1 : 0.12;
        kVel = 1000 / 3.6;                             // 1000 km/s ≈ 278 m/sn (ekranda gösterilen)
        const simDt = dt * slow;
        kpos.x += simDt * 60;                          // sahnede kaptan sağa savrulur
        K.root.position.copy(kpos);
        K.root.rotation.x += simDt * 2.4; K.root.rotation.z += simDt * 1.3;
        animateHuman(K, { gliding: false, onGround: false, vy: -1 }, dt);
        K.armL.rotation.z = -1.3; K.armR.rotation.z = 1.3; K.legL.rotation.x = 0.4; K.legR.rotation.x = -0.3;
        for (const p of parts) { p.g.position.addScaledVector(p.v, simDt); p.g.rotation.x += p.w.x * simDt; p.g.rotation.y += p.w.y * simDt; }
        for (const d of debris) { d.m.position.copy(kpos).add(d.off); d.off.x -= simDt * 60 * (0.3 + d.v); d.m.rotation.x += d.w.x * simDt; d.m.rotation.y += d.w.y * simDt; }
        for (const l of W.speedLines) { l.position.x -= dt * (slow < 0.5 ? 40 : 400); if (l.position.x < kpos.x - 60) l.position.x = kpos.x + 60 + Math.random() * 20; }
        $("speedo").innerText = Math.round(kVel * 3.6) + " KM/S";
        $("speedo").style.opacity = t < 6.5 ? 1 : Math.max(0, 1 - (t - 6.5));
      },
      // yandan takip eden kamera, hafif yaklaşma
      cam: (t, k) => ({ pos: V3(kpos.x - 1.5 + k * 1, kpos.y + 0.6, kpos.z + 7 - k * 3), look: V3(kpos.x, kpos.y, kpos.z), fov: 50 - k * 8, roll: Math.sin(t * 0.6) * 0.08 }) },
    { dur: 5, lines: [["BİP", "Kaptan! KAPTAN! Yerçekimi alanı! Bir gezegene düşüyoruz!"]],
      start: () => { $("speedo").style.display = "none"; W.tahraBody.visible = true; W.tahraBody.position.set(kpos.x + 500, kpos.y - 700, kpos.z); music("tense"); for (const l of W.speedLines) l.visible = false; },
      tick: (dt, t) => {
        kpos.x += dt * 70; kpos.y -= dt * t * 30;
        K.root.position.copy(kpos); K.root.rotation.x += dt * 3;
        W.tahraBody.position.lerp(V3(kpos.x + 30, kpos.y - 420, kpos.z), Math.min(1, dt * 0.35));
        $("overTint").style.opacity = Math.min(1, t / 3);
        shake = Math.min(1.4, t * 0.3);
        for (const d of debris) d.m.visible = false;
      },
      cam: (t, k) => ({ pos: V3(kpos.x - 6, kpos.y + 2, kpos.z + 3), look: V3(kpos.x + 20, kpos.y - 14, kpos.z) }) },
    { dur: 1.2, start: () => { flashWhite(400); sfx("explosion"); fadeTo(1); $("overTint").style.opacity = 0; },
      cam: () => ({ pos: V3(kpos.x - 6, kpos.y + 2, kpos.z + 3), look: V3(kpos.x + 20, kpos.y - 14, kpos.z) }) }
  ], () => {
    for (const d of debris) G.zones.space.group.remove(d.m);
    G.hidePlayer = false; G.bipHidden = false;
    $("overTint").style.opacity = 0;
    later(1.2, () => startChapter(5));
  });
}

// ================================================================ 5. HAYATTA KAL
function ch5(opts) {
  const [px, pz] = W.crashPlayer;
  setZone("tahra", px, pz, Math.PI * 0.85);
  G.flags.hammerFound = 0; G.flags.bip = 0; G.flags.filter = 0;
  player.hasHammer = false; attachHammer();
  player.o2 = 42; G.o2Drain = 0.55;
  G.bip.root.visible = false;
  showCampCrew();
  music("tense");
  fadeTo(1);
  checkpoint(() => { setZone("tahra", px, pz, 0); player.o2 = Math.max(player.o2, 60); });
  // kalkış: yerde yatarken uyanma
  let wake = 0;
  cinematic([
    { dur: 4, lines: [["Kaptan", "...ugh. Neredeyim..."], ["Giysi", "UYARI: Oksijen %42. Hava filtresi çevrimdışı."]],
      start: () => fadeTo(0), tick: dt => { wake += dt; },
      cam: (t, k) => ({ pos: V3(px + 1, G.zone.ground(px, pz) + 6 - k * 3, pz + 1), look: V3(px, G.zone.ground(px, pz), pz) }) },
    { dur: 3, lines: [["Kaptan", "Tahra... Bu gezegenin adını haritada görmüştüm. Kimse gelmemişti buraya."]],
      cam: (t, k) => ({ pos: V3(px + 3, G.zone.ground(px, pz) + 2, pz + 4), look: V3(px - 10, G.zone.ground(px, pz) + 3, pz + 30) }) }
  ], () => {
    showArea("Tahra", "GEZEGEN KEŞFEDİLDİ");
    goal("Oksijen tüpü bul (enkazdan saçılmış)", W.o2Tank[0], W.o2Tank[1]);
    tutorial("OKSİJEN", "Sağ alttaki O₂ biterse can kaybedersin. Koşmak oksijeni hızlı harcar.");
  });
  const tahra = G.zones.tahra;
  // oksijen tüpü
  const tank = mesh(CYL(0.25, 0.25, 0.9, 10), mat(0x2f8a4a), W.o2Tank[0], tahra.ground(W.o2Tank[0], W.o2Tank[1]) + 0.3, W.o2Tank[1], tahra.group);
  tank.rotation.z = Math.PI / 2;
  addInteract(tahra, { pos: tank.position.clone(), r: 2.6, label: () => G.chapter === 5 && !G.flags.filter ? "Oksijen tüpünü tak" : null, act: () => {
    G.flags.filter = 1; tank.visible = false; player.o2 = 100; G.o2Drain = 0; sfx("pickup");
    acquired("Oksijen tüpü"); acquired("Yedek hava filtresi");
    say([["Giysi", "Hava filtresi çevrimiçi. Tahra atmosferi filtreyle solunabilir."], ["Kaptan", "Nefes... Tamam. Şimdi gemi. ATLAS nerede?"]]);
    goal("Enkaza git", 0, 6);
    onReach("tahra", 0, 6, 9, wreckSearch);
  } });
  later(60, () => { if (!G.flags.filter && G.chapter === 5) say([["Kaptan", "Oksijen azalıyor... Tüp şu enkaz parçalarının arasında olmalı."]]); });
}
function wreckSearch() {
  const tahra = G.zones.tahra;
  say([["Kaptan", "ATLAS... Yarısı yok. Motor yok, kanatlar yok. Kerem? Selin? Bora? Kimse yok."], ["Kaptan", "Kapsüller fırlatılmış. Yaşıyorlar. Yaşıyor olmalılar."]]);
  goal("Enkazın içinden balyozunu al", W.wreck.root.position.x, W.wreck.root.position.z + 3);
  addInteract(tahra, { pos: V3(0.5, tahra.ground(0, 6) + 1, 6.5), r: 3, label: () => G.chapter === 5 && !G.flags.hammerFound ? "Balyozu çek" : null, hold: 1.2, act: () => {
    G.flags.hammerFound = 1; player.hasHammer = true; attachHammer(); sfx("catch"); acquired("Manyetik Balyoz");
    say([["Kaptan", "Sağ ol Bora. Bu şey her şeye dayanıyor."]]);
    const [bx, bz] = W.bipSpot;
    goal("BİP'i bul ve onar", bx, bz);
    G.bip.root.visible = true; G.bip.root.position.set(bx, tahra.ground(bx, bz) + 0.3, bz); G.bip.root.rotation.z = 1.2;
    addInteract(tahra, { pos: V3(bx, tahra.ground(bx, bz) + 0.6, bz), r: 2.6, label: () => G.chapter === 5 && !G.flags.bip ? "BİP'i onar" : null, hold: 3, act: bipWake });
  } });
}
function bipWake() {
  G.flags.bip = 1;
  G.bip.root.rotation.z = 0;
  sfx("power");
  acquired("BİP çevrimiçi");
  say([["BİP", "...bip? Bip! Kaptan! Yaşıyorsun! Ben de yaşıyorum! Bir pervanem eğrildi ama karizmam yerinde."],
       ["Kaptan", "Seni gördüğüme sevindim, ufaklık. Diğerleri?"],
       ["BİP", "Tarıyorum... Kaçış kapsülü sinyalleri: üç tane. Batıda, kuzeydoğuda, güneyde. Hepsi canlı!"]], () => {
    // ilk Vorak saldırısı
    say([["BİP", "Ah. Ve... Bir sinyal daha. Yukarıdan. İniş ışınları! KAPTAN, SAKLAN... Yok, saklanacak yer yok. SAVAŞ!"]]);
    tutorial("BİP", "BİP savaşta kendi kendine ateş eder. <kbd>Q</kbd> ile güçlü bir atış emri ver.");
    goal("Vorak saldırısını püskürt");
    fight([[["hunter", 14, -10], ["hunter", -12, -14, 0, 0.6]], [["hunter", 18, 12], ["shooter", -16, 18, 0, 0.5], ["hunter", 0, 22, 0, 1]]], () => {
      say([["Kaptan", "Bunlar... bizi vuran gemideki şeyler. Bu gezegen onların."],
           ["BİP", "Tarama tamam: ATLAS'ın parçaları da saçılmış. Motor kuzeydeki dağda, kanat doğudaki kanyonda, iletişim modülü güneybatıdaki bir mağarada."],
           ["BİP", "Kaptan, Vorak hurdası topladım! Enkazın yanındaki tezgâhta balyozunu güçlendirebiliriz."],
           ["Kaptan", "Önce motor. Gemiyi uçuramazsak kimseyi kurtaramayız."]], () => {
        G.flags.bench = 1;
        tutorial("TEZGÂH", "Düşmanlardan düşen hurdayla tezgâhta yükseltme yap. Işık Taşlarını uyandırırsan hızlı yolculuk açılır.");
        startChapter(6);
      });
    });
  });
}

// ================================================================ 6. MOTOR (Demir Zirve)
function ch6() {
  if (G.zone !== G.zones.tahra || G.chapter !== 6 || player.pos.distanceTo(V3(0, 0, 0)) > 60) setZone("tahra", 6, 12, Math.PI);
  showCampCrew();
  music("calm");
  const [mx, mz] = W.mountBase;
  checkpoint(() => setZone("tahra", mx + 4, mz + 12, 0));
  goal("Demir Zirve'ye git: motor dağın tepesinde", mx, mz);
  later(2, () => say([["BİP", "Motorun sinyali kuzeyden geliyor. Yüksekten. Çok yüksekten. Umarım tırmanmayı seviyorsun."]]));
  onReach("tahra", mx, mz + 25, 30, () => {
    say([["BİP", "Dağın eteğinde Vorak var! Üç tane. Biri uzaktan ateş ediyor, dikkat!"]]);
    fight([[["shooter", mx - 10, mz + 4], ["hunter", mx + 8, mz + 8], ["hunter", mx, mz + 14, 0, 0.5]]], () => {
      goal("Kayalara tırman: zirveye çık", W.engineSpot[0], W.engineSpot[1], W.mountTop + 1.5);
      say([["BİP", "Temiz! Şimdi yukarı. Kayaların tutunma çizgilerini gör? Oradan tırman."]]);
    });
  });
  const tahra = G.zones.tahra;
  const [ex, ez, ey] = W.engineSpot;
  const eng = W.engineProp || (W.engineProp = (() => {
    const e = makeAtlas().parts.engine;
    e.position.set(ex, ey + 1.3, ez + 3.4); e.rotation.set(0.3, 0.6, 0.2); tahra.group.add(e); return e;
  })());
  eng.visible = true;
  addInteract(tahra, { pos: V3(ex, ey + 1.3, ez + 1), r: 4, label: () => G.chapter === 6 && !G.flags.engine && player.pos.y > ey - 1 ? "Motoru çekici ışına bağla" : null, hold: 2, act: () => {
    G.flags.engine = 1;
    eng.visible = false;
    sfx("warp");
    acquired("ATLAS motoru");
    say([["BİP", "Bağladım! Çekici ışın motoru kampa taşıyor. Bip bip!"], ["BİP", "Ah. Ah hayır. Gözcü dronlar! Zirvede! Üç tane!"]], () => {
      fight([[["drone", ex + 10, ez - 6], ["drone", ex - 10, ez - 4], ["drone", ex, ez - 14, 0, 0.6]]], () => {
        say([["BİP", "Bitti! Aşağı inmek için tepeden atla ve süzül. Yürüyerek inmek... bacaklarına yazık."]], () => startChapter(7));
      });
    });
  } });
}

// ================================================================ 7. KANAT (Rüzgâr Kanyonu)
function ch7() {
  showCampCrew();
  if (G.zone !== G.zones.tahra) setZone("tahra", 6, 12, Math.PI);
  music("calm");
  const [cx, cz] = W.canyonPillar;
  checkpoint(() => setZone("tahra", cx - 8, cz + 6, -Math.PI / 2));
  goal("Rüzgâr Kanyonu'na git", cx - 6, cz);
  W.engineProp && (W.engineProp.visible = false);
  later(1.5, () => say([["BİP", "Kanat doğuda. Kanyonun ortasındaki kayalık adanın üstünde. Altında... hiçbir şey yok. Dipsiz."]]));
  onReach("tahra", cx - 6, cz, 12, () => {
    say([["Kaptan", "Uçurumun kenarındaki şu sütun. Tepesinden süzülürsem adaya ulaşırım."], ["BİP", "Rüzgâr akımlarını görüyor musun? Mavi sütunlar. İçinden süzülürsen seni yukarı iter!"]]);
    goal("Sütuna tırman ve adaya süzül", W.wingSpot[0], W.wingSpot[1], W.wingSpot[2] + 1.5);
    tutorial("RÜZGÂR AKIMI", "Süzülürken mavi rüzgâr sütunlarına gir: yukarı yükselirsin.");
  });
  let fought = false;
  watch(() => {
    if (fought || G.zone.name !== "tahra") return false;
    if (Math.hypot(player.pos.x - 155, player.pos.z) < 10 && player.onGround && player.pos.y > 2) {
      fought = true;
      say([["BİP", "Kanat burada! Ama yalnız değiliz. O büyük olan... kalkanlı!"]]);
      tutorial("KALKANLI", "Kalkanlı Vorak önden gelen vuruşları engeller. <b>Arkasından vur</b> ya da balyozu <b>fırlat</b>: fırlatma kalkanı kırar.");
      // doğma noktaları adanın üstünde ama ortadaki yüksek kayanın (156–161, -6–-1) dışında
      fight([[["brute", 151, -5], ["hunter", 150, 5, 0, 0.5]], [["hunter", 160, 6], ["hunter", 149, -6, 0, 0.4]]], () => {
        goal("Kanadı al", W.wingSpot[0], W.wingSpot[1], W.wingSpot[2] + 1);
      });
      return true;
    }
    return false;
  });
  const tahra = G.zones.tahra;
  const [wx, wz, wy] = W.wingSpot;
  const wing = W.wingProp || (W.wingProp = (() => { const g = makeAtlas().parts.wingL; g.position.set(wx + 3, wy + 0.4, wz); g.rotation.set(0.2, 0.4, 0.3); tahra.group.add(g); return g; })());
  wing.visible = true;
  addInteract(tahra, { pos: V3(wx, wy + 1, wz), r: 4, label: () => G.chapter === 7 && fought && !aliveEnemies().length && !G.flags.wing ? "Kanadı çekici ışına bağla" : null, hold: 2, act: () => {
    G.flags.wing = 1; wing.visible = false; sfx("warp"); acquired("ATLAS kanadı");
    say([["BİP", "Kanat yolda! Şimdi geri dönmeliyiz. Adadaki yüksek kayaya tırman, oradan kenara süzül."]], () => {
      goal("Adadaki kayaya tırman ve kanyondan çık", 222, 0);
      onReach("tahra", 222, 0, 12, () => startChapter(8));
      watch(() => { if (G.zone.name === "tahra" && (player.pos.x < 92 || player.pos.x > 218) && player.onGround) { startChapter(8); return true; } return false; });
    });
  } });
}

// ================================================================ 8. İLETİŞİM MODÜLÜ (Işıltı Mağarası)
function ch8() {
  showCampCrew();
  if (G.zone !== G.zones.tahra) setZone("tahra", 6, 12, Math.PI);
  W.wingProp && (W.wingProp.visible = false);
  music("tense");
  const [ex, ez] = W.caveEntry;
  checkpoint(() => setZone("tahra", ex, ez + 4, 0));
  goal("Işıltı Mağarası'na git", ex, ez);
  later(1.5, () => say([["BİP", "İletişim modülü güneybatıdaki mağarada. İçerisi karanlık. Fenerin var, değil mi? F."]]));
  onReach("tahra", ex, ez, 8, () => {
    tutorial("FENER", "<kbd>F</kbd> feneri açar/kapar. Mağarada kristaller de biraz ışık verir.");
    say([["Kaptan", "Kristaller parlıyor... ve bir şey hırlıyor."], ["BİP", "Gölge avcıları. Karanlıkta çok hızlılar. Gözlerine dikkat et!"]]);
    const C = W.cave;
    fight([[["stalker", C.minX + 10, C.maxZ - 8], ["stalker", C.minX + 18, C.minZ + 6, 0, 0.3]], [["stalker", C.maxX - 12, C.minZ + 8], ["stalker", C.maxX - 6, C.maxZ - 10, 0, 0.5]]], () => {
      goal("İletişim modülünü al", W.commSpot[0], W.commSpot[1]);
    }, { quiet: true });
    goal("Mağarayı keşfet", W.commSpot[0], W.commSpot[1]);
  });
  const tahra = G.zones.tahra;
  const [cx, cz] = W.commSpot;
  const comm = W.commProp || (W.commProp = (() => {
    const g = new THREE.Group(); g.position.set(cx, tahra.ground(cx, cz), cz); tahra.group.add(g);
    mesh(BOX(1.4, 0.9, 1.0), mat(0xdddddd), 0, 0.45, 0, g); mesh(BOX(0.6, 0.6, 0.05), glowMat(0x7fd8ff, 1), 0, 0.6, -0.52, g);
    mesh(CYL(0.05, 0.05, 1.2), mat(0x999999), 0.4, 1.4, 0, g);
    return g;
  })());
  comm.visible = true;
  addInteract(tahra, { pos: V3(cx, tahra.ground(cx, cz) + 1, cz), r: 3, label: () => G.chapter === 8 && !G.flags.comm && !aliveEnemies().length ? "İletişim modülünü bağla" : null, hold: 2, act: () => {
    G.flags.comm = 1; comm.visible = false; sfx("warp"); acquired("İletişim modülü");
    say([["BİP", "Üçü de tamam! Motor, kanat, iletişim. Şimdi mürettebat!"], ["BİP", "Dışarıda... nişancılar bekliyor. Pusu!"]], () => {
      const [ox, oz] = W.caveEntry;
      fight([[["shooter", ox - 8, oz + 12], ["shooter", ox + 8, oz + 14], ["hunter", ox, oz + 18, 0, 0.6]]], () => {
        say([["BİP", "En yakın kapsül batıda, Kızıl Kumlar'da. Kerem'in sinyali!"]], () => startChapter(9));
      });
    });
  } });
}

const CHAPTERS = [
  { name: "NASA Merkezi", start: ch1 }, { name: "Eğitim", start: ch2 }, { name: "Kalkış", start: ch3 }, { name: "Işın", start: ch4 },
  { name: "Hayatta Kal", start: ch5 }, { name: "Motor", start: ch6 }, { name: "Kanat", start: ch7 }, { name: "İletişim Modülü", start: ch8 }
];
window.CHAPTERS = CHAPTERS;
