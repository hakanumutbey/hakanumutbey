// IN A SPACE — hikâye: bölümler, olaylar (elektrik, gövde deliği, uzaylı saldırısı), hiper yolculuk,
// etkileşim noktaları, düşmanlar, silah, menü, ölüm ve kayıt. Geometri world.js'te, çekirdek engine.js'te.
"use strict";

const PLANET_INFO = {
  kizil: { name: "Kızıl Gezegen", color: 0xc4623a, css: "radial-gradient(circle at 35% 35%, #f6a77a, #a8401f 60%, #4a1708)", desc: "Tozlu çöl, düşük yer çekimi." },
  buz: { name: "Buz Gezegeni", color: 0xcfe8f7, emissive: 0x10283a, css: "radial-gradient(circle at 35% 35%, #ffffff, #9cc9e8 60%, #3b6a8a)", desc: "Tipi ve soğuk: oksijen daha hızlı biter." },
  mor: { name: "Mor Gezegen", color: 0x8b45c4, emissive: 0x1a0630, css: "radial-gradient(circle at 35% 35%, #e9b8ff, #7e3fae 60%, #2a0a40)", desc: "Parlayan orman. Uzaylı sinyali!" },
  dunya: { name: "Dünya", color: 0x3b82f6, emissive: 0x0a1a33, css: "radial-gradient(circle at 35% 35%, #bfe1ff, #2f6fd0 55%, #14532d 75%, #0b1d3a)", desc: "Eve dönüş." },
  // İkinci–dördüncü perde (act: haritada hangi perdeden itibaren görünür)
  kum: { act: 2, name: "Kum Ayı", color: 0xe0b878, css: "radial-gradient(circle at 35% 35%, #fff0c8, #d9a860 60%, #7a5226)", desc: "Kapsül sinyali: Pilot Arda." },
  bataklik: { act: 2, name: "Zehir Bataklığı", color: 0x6a9a4a, emissive: 0x0a1a08, css: "radial-gradient(circle at 35% 35%, #d8f5b0, #5f8a3a 60%, #1f3018)", desc: "Kapsül sinyali: Doktor Elif." },
  kristal: { act: 2, name: "Kristal Ay", color: 0x9ab8f0, emissive: 0x101a38, css: "radial-gradient(circle at 35% 35%, #ffffff, #8aa8f0 55%, #2a3a7a)", desc: "Kapsül sinyali: Mühendis Deniz." },
  anagemi: { act: 3, name: "Uzaylı Ana Gemisi", color: 0x4a1a6a, emissive: 0x2a0838, css: "radial-gradient(circle at 35% 35%, #ff7ad8, #5a1a7a 55%, #12041c)", desc: "İzleyici çekirdek burada." },
  ay: { act: 4, name: "Ay", color: 0xb4b4ba, css: "radial-gradient(circle at 35% 35%, #ffffff, #a0a0a8 60%, #3a3a40)", desc: "Ay üssü: yakıt ve röle." }
};
const PLANET_STAGE = { kizil: "gezegen1", buz: "gezegen2", mor: "gezegen3", kum: "kumgorev", bataklik: "batakgorev", kristal: "kristalgorev", anagemi: "anagemi", ay: "aygorev" };
const CODE = "2719";
const f = () => G.flags;
const nova = (...lines) => say(lines.map(t => ["NOVA", t]));
const inShip = () => G.zone === W.ship;
const later = (ms, fn) => after((TEST ? Math.min(ms, 150) : ms) / 1000, fn);

// ---------------------------------------------------------------- bölüm sistemi
const STAGES = {};
function stage(id, o) { STAGES[id] = Object.assign({ id }, o); }
function goStage(id, opts) {
  G.stage = STAGES[id];
  G.flags.stage = id;
  player.push.set(0, 0, 0);
  if (G.stage.enter) G.stage.enter(opts || {});
  saveGame();
}
// Kayıttan bir olayın ortasında yüklenince yolculuğu yeniden kur (hedef kayıttaki rotadan gelir)
function ensureTravel(dest, eventAt) {
  if (!G.travel) G.travel = { dest: G.flags.travelDest || dest, t: eventAt, dur: 14, eventAt, fired: true, paused: true };
}

// ---------------------------------------------------------------- hiper yolculuk
function startTravel(dest) {
  const s = G.stage;
  // Serbest uçuşta yolculukların çoğunda rastgele bir olay çıkar (G.forceEvent: test botu seçer)
  const eventAt = s.free ? (G.forceEvent || Math.random() < 0.85 ? 4 + Math.random() * 4 : 0) : (s.eventAt || 0);
  // Pilot Arda gemideyse yolculuklar daha kısa sürer (ikinci perdenin ödülü)
  const dur = (dest === "dunya" && !s.free ? 9 : 14) * (G.flags.crew_arda ? 0.65 : 1);
  G.travel = { dest, t: 0, dur: Math.max(dur, eventAt + 2), eventAt, fired: false, paused: false };
  G.flags.travelDest = dest;
  G.flags.at = null;
  W.showWindowPlanet(null);
  sfx("warp");
  shake = 0.8;
  nova(`Rota onaylandı: ${PLANET_INFO[dest].name}. Hiper sürücü devrede.`);
}
function arrive(dest) {
  G.travel = null;
  W.warp.visible = false;
  G.flags.at = dest;
  const P = PLANET_INFO[dest];
  W.showWindowPlanet(P.color, P.emissive);
  sfx("power");
  shake = 0.5;
  if (f().free) {
    nova(dest === "dunya" ? "Dünya yörüngesindeyiz. Buraya iniş yok ama manzara harika." : `${P.name} yörüngesindeyiz. İnmek istersen giysini giy, dış kapak hazır.`);
    return goStage("serbest");
  }
  if (dest === "dunya") return (f().act || 1) >= 4 ? goStage("dunyainis") : finishGame();
  if (dest === "anagemi") { nova("Ana gemiye kenetlendik. Hava kilidimiz onların giriş kapağına bağlı."); return goStage(PLANET_STAGE[dest]); }
  nova(`${P.name} yörüngesine ulaştık. Köprünün camından görebilirsin.`, "İniş aracı hava kilidine bağlı. Giysini giy ve dış kapaktan in.");
  goStage(PLANET_STAGE[dest]);
}
updaters.push(dt => {
  const tr = G.travel;
  W.warp.visible = !!tr && !tr.paused;
  if (!tr || tr.paused) return;
  tr.t += dt * (TEST ? 4 : 1);
  if (tr.eventAt && !tr.fired && tr.t >= tr.eventAt) {
    tr.fired = true;
    tr.paused = true;
    if (G.stage.onEvent) G.stage.onEvent();
    return;
  }
  if (tr.t >= tr.dur) arrive(tr.dest);
});
const travelText = () => `Hiper yolculuk sürüyor… (${PLANET_INFO[G.travel ? G.travel.dest : "kizil"].name})`;

// ---------------------------------------------------------------- küçük yardımcı modeller
function prop(pos, w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(pos[0], pos[1], pos[2]);
  W.ship.group.add(m);
  return m;
}
W.p.keypad = [6.4, 1.4, -1.8];
prop([6.4, 1.4, -1.81], 0.35, 0.45, 0.06, M.dark);
prop([6.4, 1.45, -1.77], 0.25, 0.12, 0.02, M.screenGreen);
// Acil düğme kargo kapısının doğusunda: köprüden koşan oyuncu kapının önünden geçmeden ulaşsın
// (batıdayken hava akımı oyuncuyu kapıdan içeri, deliğe çekiyordu).
W.p.seal = [-4.8, 1.4, 1.8];
prop([-4.8, 1.4, 1.81], 0.5, 0.5, 0.06, M.yellow);
prop([-4.8, 1.4, 1.76], 0.3, 0.3, 0.06, M.screenRed);
for (const id of ["log1", "log2", "log3", "log4", "log5", "log6"]) {
  const p = W.p[id];
  prop([p[0], p[1] - 0.02, p[2]], 0.34, 0.03, 0.24, M.dark);
  prop([p[0], p[1], p[2]], 0.28, 0.01, 0.18, basic(0x34d399));
}
W.batMeshes = {};
for (const id of ["bat1", "bat2", "bat3"]) {
  const p = W.p[id];
  W.batMeshes[id] = prop([p[0], p[1] + 0.08, p[2]], 0.18, 0.26, 0.12, M.yellow);
}

// ---------------------------------------------------------------- not defterleri
const LOGS = {
  log1: ["NOVA — Bakım kaydı",
    "Kriyo kapsülü 3: UYANDIRMA BAŞLADI.\nMürettebat: 7 kişi. Gemide algılanan: 1 kişi.\nKaçış kapsülleri: 6 tanesi fırlatılmış.\nHiper sürücü çekirdekleri: 0/3 (yanmış).\n\nNot: Kaptan Mert, kapsül 3'ü \"son ana kadar uyutun\" diye işaretlemiş."],
  log2: ["Mühendis Deniz — Günlük",
    "Hiper sürücünün üç çekirdeği de aşırı yüklenip eridi. Yenileri ancak gezegenlerdeki doğal kristallerden yapılabilir.\n\nŞebeke sürekli dalgalanıyor. Yedek sigortaları KARGODAKİ RAFA koydum.\nAna şalteri indirmeden önce sigortayı takmayı unutmayın!"],
  log3: ["Pilot Arda — Günlük",
    "Mor gezegenden garip bir sinyal geliyor. Kaptan inmek istiyor; Kaan ve Elif ile iniş aracını hazırladık.\n\nİçimde kötü bir his var. O parlayan ormanda bir şey bizi izliyordu."],
  log4: ["Doktor Elif — Revir kaydı",
    "Mor gezegenden dönen Kaan'ın çantasında yumurtaya benzer yeşil şeyler vardı. Hepsini kargoya kilitledik.\n\nBu gece kargodan tıkırtılar geliyor…\n\nİyi haber: tedavi istasyonu herkesi iyileştiriyor."],
  log5: ["Kaptan Mert — Son kayıt",
    "Yumurtalar çatladı. Yaratıklar havalandırmaya kaçtı. Mürettebatı kaçış kapsülleriyle Dünya'ya yolladım.\n\nSen kapsül 3'tesin; NOVA seni uyandıracak. Gemiyi eve sen getir.\n\nSilaha ihtiyacın olacak.\nCEPHANELİK ŞİFRESİ: 2719\n\nÇekirdekleri bul. Bol şans, yolcu."],
  log6: ["Aşçı Zeynep — Not",
    "Hidroponik bahçedeki mavi meyveler yaraları iyileştiriyor. Her bitkiden bir tane yeter!\n\nYemek makinesi bozulmadıysa sıcak çorba da verir. Uzayda en güzel şey sıcak çorbadır."]
};
function readLog(id) {
  G.flags[id] = true;
  if (id === "log5") G.flags.code = true;
  $("padTitle").innerText = "📜 " + LOGS[id][0];
  $("padText").innerText = LOGS[id][1];
  sfx("pickup");
  openUI("datapad");
}
for (const id in LOGS) {
  addInteract(W.ship, { id, pos: W.p[id], label: () => G.flags[id] ? "Not defterini tekrar oku" : "Not defterini oku", act: () => readLog(id) });
}
$("btnPadClose").onclick = () => closeUI();

// ---------------------------------------------------------------- gemideki diğer etkileşimler
addInteract(W.ship, {
  id: "heal", pos: W.p.heal,
  label: () => player.health < 100 ? "Tedavi istasyonu: canı doldur" : "Tedavi istasyonu (canın dolu)",
  act: () => { if (player.health < 100) { heal(100); sfx("pickup"); toast("Yaraların iyileşti. Can: 100"); } }
});
addInteract(W.ship, {
  id: "food", pos: W.p.food, label: () => "Yemek makinesi: sıcak çorba (+25 can)",
  act: () => { heal(25); sfx("pickup"); toast("Mmm, sıcak çorba! +25 can"); }
});
for (const fr of W.fruits) {
  addInteract(W.ship, {
    id: "fruit" + fr.i, pos: fr.pos, size: 0.3,
    label: () => G.flags["fruit_" + fr.i] ? null : "Mavi meyveyi ye (+35 can)",
    act: () => { G.flags["fruit_" + fr.i] = true; fr.mesh.visible = false; heal(35); sfx("pickup"); toast("Tatlı ve ekşi! +35 can"); }
  });
}
for (const id of ["bat1", "bat2", "bat3"]) {
  addInteract(W.ship, {
    id, pos: W.p[id], size: 0.3,
    label: () => G.flags[id] ? null : "Pil paketi al (fener +60)",
    act: () => { G.flags[id] = true; W.batMeshes[id].visible = false; player.battery = Math.min(100, player.battery + 60); sfx("pickup"); toast("Fener pili: " + Math.round(player.battery)); }
  });
}

// Navigasyon + yıldız haritası
addInteract(W.ship, {
  id: "nav", pos: W.p.nav, size: 0.6,
  label: () => G.travel ? `Rota: ${PLANET_INFO[G.travel.dest].name} — yolculuk sürüyor` : (canChart() ? "Yıldız haritasını aç" : "Navigasyon konsolu"),
  act: () => {
    if (G.travel) return toast("Hiper yolculuk sürüyor. Varınca NOVA haber verecek.");
    if (!canChart()) return toast(G.stage && G.stage.planet ? "Önce bu gezegenin çekirdeğini sürücüye yerleştir." : "NOVA: Önce konuşmamız lazım.");
    openStarMap();
  }
});
const canChart = () => !!G.stage && !!(G.stage.free || G.stage.dest);
// Hikâyede yalnızca sıradaki gezegen seçilir; serbest uçuşta bulunduğun yer hariç her yer.
const destAllowed = id => G.stage.free ? id !== f().at : id === G.stage.dest;
function openStarMap() {
  const list = $("mapList");
  list.innerHTML = "";
  // Hikâyede yalnızca açılmış perdelerin yerleri görünür; serbest uçuşta (patlamış ana gemi hariç) hepsi
  const shown = Object.keys(PLANET_INFO).filter(id => G.stage.free ? id !== "anagemi" : ((PLANET_INFO[id].act || 1) <= (f().act || 1) || id === G.stage.dest));
  for (const id of shown) {
    const P = PLANET_INFO[id];
    const b = document.createElement("button");
    b.className = "planetBtn";
    b.id = "map_" + id;
    const status = f().at === id ? "📍 Şu an buradasın" : G.flags["core_" + id] && !G.stage.free ? "✅ Çekirdek alındı" : P.desc;
    b.disabled = !destAllowed(id);
    b.innerHTML = `<div class="ball" style="background:${P.css}"></div><b>${P.name}</b>${status}`;
    b.onclick = () => chooseDest(id);
    list.appendChild(b);
  }
  openUI("starMap");
}
function chooseDest(id) {
  if (!canChart() || !destAllowed(id) || G.travel) return false;
  closeUI();
  startTravel(id);
  return true;
}
$("btnMapClose").onclick = () => closeUI();

// Cephanelik tuş takımı
let kpEntry = "";
function kpShow(text) { $("kpDisplay").innerText = text || (kpEntry + "____").slice(0, 4); }
function keypadPress(k) {
  if (k === "DEL") kpEntry = kpEntry.slice(0, -1);
  else if (k === "OK") {
    if (kpEntry === CODE) {
      G.flags.armoryOpen = true;
      G.doors.armory.locked = false;
      sfx("pickup");
      kpShow("AÇIK");
      later(500, () => { closeUI(); toast("Cephanelik kilidi açıldı!"); });
    } else {
      sfx("wrong");
      kpEntry = "";
      kpShow("HATA");
      later(700, () => kpShow());
    }
    return;
  } else if (kpEntry.length < 4) kpEntry += k;
  sfx("click");
  kpShow();
}
for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "DEL", "0", "OK"]) {
  const b = document.createElement("button");
  b.innerText = k === "DEL" ? "⌫" : k === "OK" ? "✔" : k;
  b.onclick = () => keypadPress(k);
  $("kpGrid").appendChild(b);
}
$("btnKpClose").onclick = () => closeUI();
addInteract(W.ship, {
  id: "keypad", pos: W.p.keypad, size: 0.3,
  label: () => G.flags.armoryOpen ? null : "Cephanelik tuş takımı",
  act: () => { kpEntry = ""; kpShow(); openUI("keypad"); }
});
addInteract(W.ship, {
  id: "gun", pos: W.p.gun, size: 0.5,
  label: () => G.flags.gun ? null : "Plazma tüfeğini al",
  act: () => {
    G.flags.gun = true;
    player.gun = true;
    W.gunRack.visible = false;
    W.gunView.visible = true;
    sfx("pickup");
    toast("Plazma tüfeği! Sol tık: ateş. Çok hızlı ateş edersen ısınır.", 3500);
    if (G.stage && G.stage.onGun) G.stage.onGun();
  }
});

// Makine dairesi: sigorta, şalter, hiper sürücü
addInteract(W.ship, {
  id: "spareFuse", pos: W.p.spareFuse, size: 0.3,
  label: () => f().powerOut && !f().fuseTaken ? "Yedek sigortayı al" : null,
  act: () => { f().fuseTaken = true; W.fuseMesh.visible = false; sfx("pickup"); toast("Yedek sigorta alındı. Makine dairesine götür."); }
});
addInteract(W.ship, {
  id: "fuse", pos: W.p.fuse,
  label: () => !f().powerOut ? null : f().fuseIn ? null : f().fuseTaken ? "Yedek sigortayı tak" : "Sigorta kutusu (sigorta yanmış)",
  act: () => {
    if (!f().fuseTaken) { sfx("wrong"); toast("Sigorta yanmış. Yedeği kargodaki rafta olmalı."); return; }
    f().fuseIn = true;
    W.fuseLamp.color.set(0xfacc15);
    sfx("click");
    toast("Sigorta takıldı. Şimdi ana şalteri indir.");
  }
});
addInteract(W.ship, {
  id: "lever", pos: W.p.lever,
  label: () => !f().powerOut ? null : f().fuseIn ? "Ana şalteri indir" : "Ana şalter (önce sigorta)",
  act: () => {
    if (!f().fuseIn) { sfx("wrong"); toast("Sigorta takılmadan şalter çalışmaz!"); return; }
    restorePower();
  }
});
function restorePower() {
  f().powerOut = false;
  f().powerFixed = true;
  W.setPower(true);
  W.fuseLamp.color.set(0x22ff66);
  W.lever.rotation.z = 1.2;
  G.alarm = false;
  sfx("power");
  shake = 0.5;
  nova("Güç geri geldi! Harika iş.", "Hiper sürücü yeniden çalışıyor, yolculuğa devam.");
  if (G.travel) G.travel.paused = false;
}
addInteract(W.ship, {
  id: "reactor", pos: W.p.reactor, size: 0.7,
  label: () => f().carry ? "Enerji çekirdeğini hiper sürücüye yerleştir" : `Hiper sürücü — çekirdek ${f().cores || 0}/3`,
  act: () => {
    if (!f().carry) return toast(`Hiper sürücüde ${f().cores || 0}/3 çekirdek var.`);
    f().carry = null;
    f().cores = (f().cores || 0) + 1;
    syncCoreSlots();
    sfx("power");
    shake = 0.4;
    toast(`⚡ Çekirdek yerleştirildi: ${f().cores}/3`, 3000);
    if (G.stage.onInstall) G.stage.onInstall();
  }
});
function syncCoreSlots() {
  W.coreSlots.forEach((s, i) => s.material.color.set(i < (f().cores || 0) ? 0xfde047 : 0x333333));
}

// Hava kilidi: giysi dolabı ve dış kapak
addInteract(W.ship, {
  id: "locker", pos: W.p.locker, size: 0.6,
  label: () => player.suit ? "Giysiyi çıkar" : "Uzay giysisini giy",
  act: () => {
    player.suit = !player.suit;
    player.suitO2 = 100;
    W.suitMesh.visible = !player.suit;
    $("helmet").style.display = player.suit ? "block" : "none";
    sfx("hiss");
    toast(player.suit ? "Giysi giyildi. Oksijen tüpü: %100" : "Giysiyi dolaba astın.");
  }
});
function exitTarget() {
  if (f().hullMission && !f().welded) return "hull";
  if (f().hullMission && f().welded) return "hull";
  if (G.travel) return null;
  const pl = G.stage && (G.stage.free ? (W.planets[f().at] ? f().at : null) : G.stage.planet);
  if (pl && f().at === pl) return pl;
  return null;
}
addInteract(W.ship, {
  id: "hatch", pos: W.p.hatch, size: 0.8,
  label: () => {
    const t = exitTarget();
    if (!t) return G.travel ? "Dış kapak (hiper yolculukta kilitli)" : "Dış kapak";
    return player.suit || !G.zones[t].vacuum ? "Hava kilidini çalıştır: dışarı çık" : "Dış kapak (önce giysiyi giy)";
  },
  act: () => {
    const t = exitTarget();
    if (!t) return toast(G.travel ? "Hiper yolculukta dış kapak açılmaz!" : "Dışarıda gidilecek bir yer yok.");
    if (!player.suit && G.zones[t].vacuum) { sfx("wrong"); return toast("Giysisiz çıkarsan boşlukta ölürsün! Dolaptan giysiyi giy."); }
    exitAnim(t, () => {   // features.js: hava kilidi + iniş aracı animasyonu
      if (t === "hull") setZone("hull", 8, 3.4, Math.PI / 2);
      else { const sp = G.zones[t].spawn; setZone(t, sp[0], sp[2] === 0 ? 1.5 : sp[2], t === "anagemi" ? -Math.PI / 2 : 0); }
      resetCans(t);
      // Serbest uçuşta Mor Gezegen'in uzaylıları geri gelir
      if (f().free && t === "mor" && aliveIn(W.planets.mor.zone) < 2) {
        G.enemies = G.enemies.filter(e => { if (e.dead && e.zone === W.planets.mor.zone) { e.zone.group.remove(e.mesh); return false; } return true; });
        for (const [x, z] of [[-12, -40], [10, -46], [2, -30], [-16, -56]]) spawnAlien(W.planets.mor.zone, x, z, { speed: 2.5, see: 14 });
      }
    });
  }
});
function transition(fn) {
  G.cutscene = true;
  fadeTo(1);
  sfx("hiss");
  later(650, () => {
    fn();
    fadeTo(0);
    G.cutscene = false;
  });
}
function enterShip() {
  transition(() => {
    setZone("ship", 5, 7.4, 0);
    player.suit = false;
    player.suitO2 = 100;
    W.suitMesh.visible = true;
    $("helmet").style.display = "none";
    toast("Giysini dolaba astın, tüpü dolduruldu.");
    if (G.stage && G.stage.onReturn) G.stage.onReturn();
  });
}

// ---------------------------------------------------------------- dışarıdaki etkileşimler
const cansUsed = {};
function resetCans(zoneName) {
  cansUsed[zoneName] = {};
  const meshes = zoneName === "hull" ? W.hullCanMeshes : (W.planets[zoneName] ? W.planets[zoneName].canMeshes : []);
  for (const m of meshes) { m.visible = true; if (m.userData.glow) m.userData.glow.visible = true; }
}
function addCans(zone, zoneName, cans, meshes, h) {
  cans.forEach(([x, z], i) => {
    addInteract(zone, {
      id: `can_${zoneName}_${i}`, pos: [x, (h ? h(x, z) : 0) + 0.5, z], size: 0.4,
      label: () => cansUsed[zoneName] && cansUsed[zoneName][i] ? null : "Oksijen tüpünü tak (+40)",
      act: () => {
        cansUsed[zoneName] = cansUsed[zoneName] || {};
        cansUsed[zoneName][i] = true;
        meshes[i].visible = false;
        if (meshes[i].userData.glow) meshes[i].userData.glow.visible = false;
        player.suitO2 = Math.min(100, player.suitO2 + 40);
        sfx("hiss");
        toast("Oksijen: %" + Math.round(player.suitO2));
      }
    });
  });
}
addInteract(W.hull, { id: "hullHatch", pos: W.p.hullHatch, size: 0.8, label: () => "Hava kilidine gir (gemiye dön)", act: enterShip });
addInteract(W.hull, {
  id: "hullHole", pos: W.p.hullHole, size: 1.0, r: 3.2, hold: TEST ? 1 : 4,
  label: () => f().welded ? null : "Deliği kaynakla",
  onHold: () => { shake = Math.max(shake, 0.15); },
  act: () => {
    f().welded = true;
    W.hullPatch.visible = true;
    W.hullHole.visible = false;
    sfx("power");
    nova("Delik kapandı! Gövde basıncı dengelendi.", "Hava kilidine dön.");
  }
});
addCans(W.hull, "hull", W.hullCans, W.hullCanMeshes, null);

// Her gezegende iniş aracı ve oksijen tüpleri; enerji çekirdeği yalnızca birinci perdenin gezegenlerinde
for (const pid in W.planets) {
  const P = W.planets[pid];
  addInteract(P.zone, { id: "hatch_" + pid, pos: P.hatch, size: 0.8, label: () => "İniş aracına bin (gemiye dön)", act: enterShip });
  addCans(P.zone, pid, P.cans, P.canMeshes, P.h);
  if (!W.cores[pid]) continue;
  addInteract(P.zone, {
    id: "core_" + pid, pos: [P.core[0], P.h(P.core[0], P.core[1]) + 1.25, P.core[1]], size: 0.6, r: 2.8,
    label: () => f()["core_" + pid] ? null : "Enerji çekirdeğini al",
    act: () => {
      f()["core_" + pid] = true;
      f().carry = pid;
      syncCores();
      sfx("pickup");
      shake = 0.3;
      nova("Çekirdek sende! İniş aracına dön, sonra hiper sürücüye yerleştir.");
    }
  });
}
// Yıldız kristalleri: tırmanılabilir sütunların tepesinde; her biri dayanıklılık çarkını büyütür
// (Breath of the Wild'daki dayanıklılık yükseltmesi gibi).
G.crystalTotal = 0;
const crystalsFound = () => Object.keys(G.flags).filter(k => k.startsWith("crystal_")).length;
const staminaMax = () => 100 + 10 * crystalsFound();
function syncCrystals() {
  for (const pid in W.planets) for (const c of W.planets[pid].crystals) c.mesh.visible = c.glow.visible = !G.flags[c.id];
}
for (const pid in W.planets) {
  for (const c of W.planets[pid].crystals) {
    G.crystalTotal++;
    addInteract(W.planets[pid].zone, {
      id: c.id, pos: c.pos, size: 0.5, r: 2.6,
      label: () => G.flags[c.id] ? null : "Yıldız kristalini al",
      act: () => {
        G.flags[c.id] = true;
        syncCrystals();
        player.maxStamina = staminaMax();
        player.stamina = player.maxStamina;
        player.exhausted = false;
        sfx("crystal");
        showBanner("YILDIZ KRİSTALİ", `DAYANIKLILIK ARTTI · ${crystalsFound()}/${G.crystalTotal}`, true);
        saveGame();
      }
    });
  }
}

function syncCores() {
  for (const pid in W.cores) {
    const c = W.cores[pid], taken = !!f()["core_" + pid];
    c.core.visible = !taken;
    c.beacon.visible = !taken;
    c.light.intensity = taken ? 0 : 1.4;
  }
}

// ---------------------------------------------------------------- uzaylılar
function spawnAlien(zone, x, z, opts) {
  opts = opts || {};
  // Kayanın/mantarın içinde doğmasın (Mor Gezegen'de biri kayanın içinde kalıp ne hareket ediyor ne görülüyordu)
  if (blockedAt(zone, x, z, 0.5)) {
    search: for (let r = 0.5; r < 10; r += 0.5) {
      for (let a = 0; a < Math.PI * 2; a += 0.35) {
        const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
        if (!blockedAt(zone, nx, nz, 0.5)) { x = nx; z = nz; break search; }
      }
    }
  }
  const mesh = W.makeAlienMesh();
  mesh.position.set(x, zone.ground(x, z), z);
  zone.group.add(mesh);
  mesh.scale.setScalar(opts.scale || 1);
  const e = { zone, mesh, pos: mesh.position, hp: opts.hp || 3, dmg: opts.dmg || 10, scale: opts.scale || 1, speed: opts.speed || 2.2, dormant: !!opts.dormant, home: [x, z],
    wander: null, wt: 0, dead: false, dieT: 0, hitT: 0, growl: Math.random() * 3, see: opts.see || 15, anim: Math.random() * 6, lastSeen: null, moving: false,
    // akıllı davranış: yandan sarma, asit tükürme, kaçma, sıçrayıp kaçınma
    maxHp: opts.hp || 3, side: Math.random() < 0.5 ? -1 : 1, spitT: 1.5 + Math.random() * 2, dodgeT: 0, dodgeDir: null, fleeT: 0, fled: false,
    alerted: false, atk: 0, lean: 0 };
  G.enemies.push(e);
  return e;
}
function clearAliens(zone) {
  G.enemies = G.enemies.filter(e => {
    if (zone && e.zone !== zone) return true;
    e.zone.group.remove(e.mesh);
    return false;
  });
}
const aliveIn = zone => G.enemies.filter(e => e.zone === zone && !e.dead).length;

// Bir adım dene; yol kapalıysa açıyı sağa/sola çevirerek engelin etrafından dolaşmayı dene
function alienStep(e, ux, uz, sp) {
  for (const a of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
    const c = Math.cos(a * e.side), s = Math.sin(a * e.side);
    const vx = ux * c - uz * s, vz = ux * s + uz * c;
    const nx = e.pos.x + vx * sp, nz = e.pos.z + vz * sp;
    if (!blockedAt(e.zone, nx, nz, 0.45)) { e.pos.x = nx; e.pos.z = nz; return [vx, vz]; }
  }
  return null;
}
function killAlien(e) {
  e.dead = true;
  e.dieT = 0;
  G.stats.kills++;
  sfx("alienDie");
  if (G.stage && G.stage.onKill) G.stage.onKill();
}
function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.zone !== G.zone) continue;
    const m = e.mesh;
    if (e.dead) {
      // ters dönüp yere çöker, küçülerek kaybolur
      e.dieT += dt;
      m.rotation.z = Math.min(Math.PI, e.dieT * 7);
      m.position.y = e.zone.ground(e.pos.x, e.pos.z) + Math.sin(Math.min(1, e.dieT * 3) * Math.PI) * 0.5 * e.scale;
      m.scale.setScalar(Math.max(0.01, (1 - Math.max(0, e.dieT - 0.3) * 2) * e.scale));
      if (e.dieT > 0.8) m.visible = false;
      continue;
    }
    e.anim += dt * (e.moving ? 12 : 2);
    m.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(e.anim + i * 1.7) * 0.5; });
    e.hitT = Math.max(0, e.hitT - dt);
    m.userData.eyes.color.set(e.hitT > 0 ? 0xffffff : 0xff2d55);
    e.moving = false;
    if (e.dormant) continue;
    const dx = player.pos.x - e.pos.x, dz = player.pos.z - e.pos.z, d = Math.hypot(dx, dz);
    const sees = d < e.see && !lineBlocked(e.pos.x, e.pos.z, player.pos.x, player.pos.z);
    // Gören uzaylı çığlık atıp yakındaki arkadaşlarını çağırır
    if (sees && !e.alerted) {
      e.alerted = true;
      sfx("alienAlert");
      for (const o of G.enemies) {
        if (o === e || o.zone !== e.zone || o.dead || o.dormant) continue;
        if (Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < 18) { o.lastSeen = [player.pos.x, player.pos.z]; o.alerted = true; }
      }
    }
    if (!sees && !e.lastSeen) e.alerted = false;
    // Çok yaralanınca bir kez geri çekilir
    if (!e.fled && e.maxHp >= 3 && e.hp === 1) { e.fled = true; e.fleeT = 2.2; }
    let tx, tz, speed = e.speed;
    if (e.fleeT > 0) {
      e.fleeT -= dt;
      tx = e.pos.x - dx; tz = e.pos.z - dz; speed = e.speed * 1.2;
    } else if (sees) {
      e.lastSeen = [player.pos.x, player.pos.z];
      // Yandan sarar: her biri oyuncunun bir yanına doğru kavis çizerek yaklaşır
      const k = d > 2.5 ? Math.min(3, d * 0.35) : 0;
      tx = player.pos.x - dz / d * k * e.side; tz = player.pos.z + dx / d * k * e.side;
    } else if (e.lastSeen) {
      [tx, tz] = e.lastSeen;
      if (Math.hypot(tx - e.pos.x, tz - e.pos.z) < 0.6) e.lastSeen = null;
    } else {
      e.wt -= dt;
      if (e.wt <= 0 || !e.wander) { e.wt = 2 + Math.random() * 3; e.wander = [e.home[0] + (Math.random() - 0.5) * 8, e.home[1] + (Math.random() - 0.5) * 8]; }
      [tx, tz] = e.wander;
      speed = e.speed * 0.45;
    }
    if (e.dodgeT > 0) {
      // vurulunca yana sıçrar
      e.dodgeT -= dt;
      if (alienStep(e, e.dodgeDir[0], e.dodgeDir[1], 6 * dt)) e.moving = true;
    } else {
      const ddx = tx - e.pos.x, ddz = tz - e.pos.z, dd = Math.hypot(ddx, ddz);
      if (dd > (sees ? 1.0 : 0.3)) {
        const v = alienStep(e, ddx / dd, ddz / dd, speed * dt);
        if (v) e.moving = true;
        else { e.wt = 0; if (!sees) e.lastSeen = null; }
      }
    }
    // Yüzü oyuncuya (görüyorsa) ya da gittiği yöne dönük
    const fx = sees && e.fleeT <= 0 ? dx : tx - e.pos.x, fz = sees && e.fleeT <= 0 ? dz : tz - e.pos.z;
    if (fx || fz) m.rotation.y = Math.atan2(-fx, -fz);
    e.pos.y = e.zone.ground(e.pos.x, e.pos.z);
    // Yakındayken atılma hamlesi (öne eğilip geri çekilir)
    if (sees && d < 2.2 * e.scale) e.atk += dt * 9; else e.atk = 0;
    e.lean += ((e.atk > 0 ? Math.abs(Math.sin(e.atk)) * 0.45 : 0) - e.lean) * Math.min(1, dt * 12);
    m.rotation.x = -e.lean;
    if (sees && d < 1.45 * e.scale) hurt(e.dmg * dt, "Uzaylılar seni yakaladı.");
    // Uzaktan asit tükürür
    e.spitT -= dt;
    if (sees && e.fleeT <= 0 && d > 3.5 && d < 12 && e.spitT <= 0) {
      e.spitT = 2.4 + Math.random() * 2.2;
      spit(e);
    }
    e.growl -= dt;
    if (sees && e.growl <= 0) { sfx("alien"); e.growl = 2 + Math.random() * 3; }
  }
  updateSpit(dt);
}

// ---------------------------------------------------------------- uzaylı asidi
const spits = [];
const spitGeo = new THREE.SphereGeometry(0.13, 10, 8), spitMat = new THREE.MeshBasicMaterial({ color: 0x9cff3a });
function spit(e) {
  const m = new THREE.Mesh(spitGeo, spitMat);
  m.scale.setScalar(e.scale);
  const y0 = e.pos.y + 1.25 * e.scale;
  m.position.set(e.pos.x, y0, e.pos.z);
  e.zone.group.add(m);
  // oyuncunun gövdesine nişan alır, biraz da sapar
  const tx = player.pos.x + (Math.random() - 0.5) * 0.8, ty = player.pos.y + 1.1, tz = player.pos.z + (Math.random() - 0.5) * 0.8;
  const v = new THREE.Vector3(tx - e.pos.x, ty - y0, tz - e.pos.z).normalize().multiplyScalar(10);
  spits.push({ m, v, zone: e.zone, dmg: e.dmg * 0.7, t: 0 });
  sfx("spit");
}
function updateSpit(dt) {
  for (let i = spits.length - 1; i >= 0; i--) {
    const s = spits[i], p = s.m.position;
    s.t += dt;
    p.addScaledVector(s.v, dt);
    let gone = s.t > 2.5 || s.zone !== G.zone;
    if (!gone && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 0.55 && Math.abs(p.y - (player.pos.y + 1.0)) < 1.0) {
      hurt(s.dmg, "Uzaylı asidi seni yaktı.");
      G.acidFlash = 1;
      sfx("splat");
      gone = true;
    }
    if (!gone && (blockedAt(s.zone, p.x, p.z, 0.05, p.y) || p.y < s.zone.ground(p.x, p.z))) gone = true;
    if (gone) { s.zone.group.remove(s.m); spits.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- plazma tüfeği
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9 }));
beam.visible = false;
scene.add(beam);
let beamT = 0;
const _sd = new THREE.Vector3();
function shoot() {
  if (!player.gun || player.overheat > 0 || G.cutscene || player.dead) return false;
  if (!G.admin) {
    player.heat += 17 * (G.heatMult || 1);
    if (player.heat >= 100) { player.overheat = 1.6; toast("Tüfek aşırı ısındı! Soğumasını bekle.", 1300); }
  }
  sfx("laser");
  if (G.onGunFired) G.onGunFired();
  updateCamera(0);   // atış, oyuncunun şu anki bakışına gitsin (kamera bir kare geriden geliyordu)
  camera.getWorldDirection(_sd);
  const origin = camera.position.clone();
  let maxT = 40;
  for (let t = 0.3; t < 40; t += 0.2) {
    if (blockedAt(G.zone, origin.x + _sd.x * t, origin.z + _sd.z * t, 0.01)) { maxT = t; break; }
  }
  let hit = null, hitT = maxT;
  for (const e of G.enemies) {
    if (e.zone !== G.zone || e.dead) continue;
    const v = new THREE.Vector3(e.pos.x, e.pos.y + 1.0, e.pos.z).sub(origin);
    const t = v.dot(_sd);
    if (t < 0 || t > hitT) continue;
    if (v.sub(_sd.clone().multiplyScalar(t)).length() < 0.8 * e.scale) { hit = e; hitT = t; }
  }
  // Vurulabilir nesneler (ana gemideki enerji düğümleri, kristal duvar)
  let hitS = null;
  for (const s of G.shootables) {
    if (s.zone !== G.zone || !s.alive) continue;
    const v = s.pos.clone().sub(origin), t = v.dot(_sd);
    if (t < 0 || t > hitT + s.r + 0.3) continue;   // kaidenin çarpıştırıcısı ışını kürenin biraz önünde keser
    if (v.sub(_sd.clone().multiplyScalar(t)).length() < s.r) { hitS = s; hit = null; hitT = t; }
  }
  if (hitS) {
    hitS.hp--;
    sfx("hurt");
    if (hitS.hp <= 0) { hitS.alive = false; sfx("explosion"); hitS.onBreak(); }
  }
  const end = origin.clone().add(_sd.clone().multiplyScalar(hitT));
  const start = new THREE.Vector3(0.28, -0.2, -0.85).applyMatrix4(camera.matrixWorld);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.scale.set(1, Math.max(0.1, start.distanceTo(end)), 1);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  beam.visible = true;
  beamT = 0.08;
  if (hit) {
    hit.hp--;
    hit.hitT = 0.15;
    hit.dormant = false;
    hit.lastSeen = [player.pos.x, player.pos.z];
    if (hit.hp <= 0) killAlien(hit);
    else if (Math.random() < 0.55) {
      // vurulan uzaylı yana sıçrar (her seferinde değil: yoksa hiç vurulamaz)
      const s = Math.random() < 0.5 ? -1 : 1;
      hit.dodgeT = 0.28;
      hit.dodgeDir = [-_sd.z * s, _sd.x * s];
    }
  }
  return !!hit;
}
onShoot = shoot;
visuals.push(dt => {
  beamT -= dt;
  beam.visible = beamT > 0;
  W.gunCoil.color.set(player.overheat > 0 ? 0xef4444 : 0x38bdf8);
});

// ---------------------------------------------------------------- enkaz (uzay yürüyüşü tehlikesi)
const debris = [];
let debrisT = 3;
updaters.push(dt => {
  if (G.zone !== W.hull) return;
  debrisT -= dt;
  if (debrisT <= 0 && !f().welded) {
    debrisT = 3 + Math.random() * 2.5;
    const side = Math.random() < 0.5 ? -1 : 1;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), M.trim);
    m.position.set(player.pos.x - 2 + Math.random() * 4, 1.3, side * 15);
    W.hull.group.add(m);
    debris.push({ m, v: -side * 5, hit: false });
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.m.position.z += d.v * dt;
    d.m.rotation.x += dt * 3; d.m.rotation.y += dt * 2;
    if (!d.hit && Math.hypot(d.m.position.x - player.pos.x, d.m.position.z - player.pos.z) < 0.7) {
      d.hit = true;
      hurt(12, "Uzay enkazı çarptı.");
      shake = 0.6;
      toast("Enkaz çarptı! Dikkat et.", 1500);
    }
    if (Math.abs(d.m.position.z) > 16) { W.hull.group.remove(d.m); debris.splice(i, 1); }
  }
});

// ---------------------------------------------------------------- bölümler
const shipOnly = p => inShip() ? p : null;

stage("uyanis", {
  enter: o => {
    if (!o.loaded) wakeUp();   // features.js: kapsülde uyanma sahnesi + NOVA ile seçmeli ilk konuşma
  },
  obj: () => "Kriyo odasından çık ve köprüye git (koridorun doğu ucu)",
  marker: () => shipOnly([33, 1.6, 0]),
  update: () => {
    if (inShip() && player.pos.x > 31) {
      nova("İşte durum: hiper sürücünün üç enerji çekirdeği de yanmış.", "Yakındaki üç gezegende çekirdek yapılabilecek kristaller var.",
        "Üçünü bulursak Dünya'ya atlayabiliriz.", "Navigasyon konsolundan Kızıl Gezegen'e rota çiz. Mürettebatın not defterlerini de oku — ne olduğunu anlarsın.");
      goStage("rota1");
    }
  }
});

function rotaStage(id, dest, eventAt, eventStage) {
  stage(id, {
    dest, eventAt,
    onEvent: () => eventStage === "random" ? startRandomEvent() : (resetEvent(eventStage), goStage(eventStage)),
    obj: () => G.travel ? travelText() : `Köprüdeki navigasyon konsolundan ${PLANET_INFO[dest].name}'e rota çiz`,
    marker: () => G.travel ? null : shipOnly(W.p.nav)
  });
}
rotaStage("rota1", "kizil", 5, "elektrik");
rotaStage("rota2", "buz", 6, "delik");
rotaStage("rota3", "mor", 5, "saldiri");

stage("elektrik", {
  enter: o => {
    ensureTravel("kizil", 5);
    if (f().powerFixed) return;
    f().powerOut = true;
    W.setPower(false);
    W.fuseLamp.color.set(f().fuseIn ? 0xfacc15 : 0xff2a2a);
    G.alarm = true;
    sfx("powerDown");
    shake = 0.8;
    nova("Güç kaybı! Ana sigorta yandı, hiper sürücü durdu!", "Acil durum ışıklarına geçtim. Karanlıkta fenerini kullan: F tuşu.",
      "Yedek sigorta kargo bölümünde olmalı. Onu makine dairesindeki sigorta kutusuna tak, sonra ana şalteri indir.");
  },
  obj: () => f().powerFixed ? travelText()
    : !f().fuseTaken ? "Kargo bölümünden yedek sigortayı al (karanlıkta fener: F)"
      : !f().fuseIn ? "Makine dairesindeki sigorta kutusuna yedek sigortayı tak" : "Makine dairesindeki ana şalteri indir",
  marker: () => f().powerFixed ? null : shipOnly(!f().fuseTaken ? W.p.spareFuse : !f().fuseIn ? W.p.fuse : W.p.lever)
});

function planetStage(id, pid, next, extra) {
  const name = PLANET_INFO[pid].name;
  stage(id, Object.assign({
    planet: pid,
    enter: o => {
      f().at = pid;
      W.showWindowPlanet(PLANET_INFO[pid].color, PLANET_INFO[pid].emissive);
      if (extra && extra.enterExtra) extra.enterExtra(o);
    },
    obj: () => {
      const P = W.planets[pid];
      if (f().carry === pid) return inShip() ? "Çekirdeği makine dairesindeki hiper sürücüye yerleştir" : "Çekirdek sende! İniş aracına dön";
      if (G.zone === P.zone) return `${name}: işaret ışığını takip et ve enerji çekirdeğini bul — oksijenine dikkat!`;
      return player.suit ? `Hava kilidinin dış kapağından ${name}'e in` : "Hava kilidine git ve uzay giysisini giy";
    },
    marker: () => {
      const P = W.planets[pid];
      if (G.zone === P.zone) return f().carry === pid ? [0, 1.6, 3.9] : [P.core[0], P.h(P.core[0], P.core[1]) + 1.3, P.core[1]];
      if (!inShip()) return null;
      if (f().carry === pid) return W.p.reactor;
      return player.suit ? W.p.hatch : W.p.locker;
    },
    onInstall: () => {
      nova(f().cores >= 3 ? "Üç çekirdek tamam! Hiper sürücü tam güçte. Köprüye gel — eve gidiyoruz!" : "Çekirdek yerleşti. Sıradaki gezegen için köprüye gel.");
      goStage(next);
    }
  }, extra || {}));
}
planetStage("gezegen1", "kizil", "rota2");
planetStage("gezegen2", "buz", "rota3", {
  enterExtra: o => { if (!o.loaded) later(4000, () => nova("Buz Gezegeni'nde tipi var ve çok soğuk. Giysinin oksijeni daha hızlı biter.")); }
});
planetStage("gezegen3", "mor", "eve", {
  enterExtra: () => {
    if (!G.enemies.some(e => e.zone === W.planets.mor.zone)) {
      for (const [x, z] of [[-12, -40], [10, -46], [2, -30], [-16, -56]]) spawnAlien(W.planets.mor.zone, x, z, { speed: 2.5, see: 14 });
    }
    later(4000, () => nova("Dikkat: Mor Gezegen'de yaşam belirtisi çok yüksek. Çekirdek bir uzaylı yuvasının ortasında.", "Tüfeğin hazır olsun."));
  }
});

stage("delik", {
  enter: o => {
    ensureTravel("buz", 6);
    if (f().welded) return;
    f().breach = true;
    W.holeGroup.visible = true;
    if (!f().sealed) {
      G.doors.cargo.forceOpen = true;
      G.alarm = true;
      if (o.loaded) G.shipAir = 100;
      sfx("explosion");
      shake = 1.6;
      nova("METEOR ÇARPMASI! Kargo bölümünde gövde delindi!", "Hava boşluğa kaçıyor ve kargo kapısı açık kaldı!",
        "Koridordaki sarı acil durum düğmesine bas! Kargoya girme, seni dışarı çeker!");
    } else {
      G.doors.cargo.locked = true;
      f().hullMission = true;
    }
  },
  update: dt => {
    player.push.set(0, 0, 0);
    if (f().sealed || f().welded) {
      G.shipAir = Math.min(100, G.shipAir + 5 * dt);
      return;
    }
    G.shipAir = Math.max(0, G.shipAir - 2.2 * dt);
    if (!inShip()) return;
    const p = player.pos;
    if (p.x > -15 && p.x < 0 && p.z > 2.1) {
      const dx = -6 - p.x, dz = 9.4 - p.z, d = Math.hypot(dx, dz);
      if (d < 1.2) { die("Boşluğa çekildin!"); return; }
      player.push.set(dx / d * 2.8, 0, dz / d * 2.8);
    } else if (Math.abs(p.z) < 2.1) {
      const dx = -7.5 - p.x, dz = 3 - p.z, d = Math.hypot(dx, dz), k = 2.3 * Math.max(0, 1 - d / 10);
      if (k > 0) player.push.set(dx / d * k, 0, dz / d * k);
    }
    if (Math.random() < dt * 2) shake = Math.max(shake, 0.12);
  },
  obj: () => {
    if (!f().sealed) return "ACİL! Koridordaki sarı düğmeyle kargo kapısını kapat";
    if (!f().welded) {
      if (G.zone === W.hull) return "Gövdenin batı ucundaki deliği kaynakla (E basılı tut) — enkaza ve oksijene dikkat";
      return player.suit ? "Hava kilidinin dış kapağından gövdeye çık" : "Hava kilidinde uzay giysisini giy";
    }
    if (G.zone === W.hull) return "Kaynak tamam! Hava kilidine dön";
    return travelText();
  },
  marker: () => {
    if (!f().sealed) return shipOnly(W.p.seal);
    if (G.zone === W.hull) return f().welded ? W.p.hullHatch : W.p.hullHole;
    if (f().welded) return null;
    return shipOnly(player.suit ? W.p.hatch : W.p.locker);
  },
  onReturn: () => {
    if (f().welded && f().hullMission) {
      f().hullMission = false;
      G.doors.cargo.locked = false;
      W.holeGroup.visible = false;
      if (G.travel) G.travel.paused = false;
      later(800, () => nova("Gövde sağlam, hava normale dönüyor. Yolculuğa devam ediyoruz."));
      saveGame();
    }
  }
});
addInteract(W.ship, {
  id: "seal", pos: W.p.seal, size: 0.35,
  label: () => f().breach && !f().sealed ? "ACİL DURUM: Kargo kapısını kapat" : null,
  act: () => {
    f().sealed = true;
    f().hullMission = true;
    G.doors.cargo.forceOpen = false;
    G.doors.cargo.locked = true;
    G.alarm = false;
    player.push.set(0, 0, 0);
    sfx("power");
    nova("Kargo izole edildi! Ama delik büyüyor — gövde dışarıdan yamanmalı.", "Hava kilidinde giysini giy ve dışarı çık. Delik, gövdenin batı ucunda.");
  }
});

const CARGO_ALIENS = [[-12.5, 7.5], [-9, 5.2], [-6, 7.4], [-4.6, 6.6], [-8, 8.1]];
stage("saldiri", {
  enter: o => {
    ensureTravel("mor", 5);
    if (f().attackDone) return;
    clearAliens(W.ship);
    for (const [x, z] of CARGO_ALIENS) spawnAlien(W.ship, x, z, { dormant: true, speed: 2.2 });
    G.doors.cargo.locked = true;
    G.alarm = true;
    sfx("alien");
    if (f().free || (f().act || 1) >= 2) nova("Kargo bölümünde hareket var… Uzaylılar havalandırmadan yine sızmış!", player.gun ? "Tüfeğini hazırla!" : "Cephanelikten tüfeğini al!");
    else nova("Kargo bölümünde hareket var… UZAYLILAR! Mor gezegenden gelen yumurtalar çatlamış!",
      "Kargo kapısını kilitledim ama uzun dayanmaz. Silaha ihtiyacın var.",
      f().code ? "Cephanelik şifresini biliyorsun: kapının yanındaki tuş takımına gir." : "Cephanelik şifresi Kaptan Mert'in notlarında olmalı. Kaptan köşkünü ara.");
    if (player.gun) later(2500, wakeShipAliens);
  },
  onGun: () => later(1800, wakeShipAliens),
  onKill: () => {
    const left = aliveIn(W.ship);
    if (left > 0) return toast(`Uzaylı yok edildi! ${left} kaldı.`, 1500);
    f().attackDone = true;
    G.alarm = false;
    G.doors.cargo.locked = false;
    nova("Gemide uzaylı kalmadı. Çok cesursun!", "Mor Gezegen'e yolculuğa devam ediyoruz.");
    if (G.travel) G.travel.paused = false;
    saveGame();
  },
  obj: () => {
    if (f().attackDone) return travelText();
    if (!player.gun) {
      if (f().armoryOpen) return "Cephanelikten plazma tüfeğini al";
      return f().code ? "Cephanelik kapısının yanındaki tuş takımına şifreyi gir" : "Silah lazım! Cephanelik şifresini Kaptan köşkündeki notta bul";
    }
    return `Uzaylıları yok et: ${aliveIn(W.ship)} kaldı (sol tık: ateş)`;
  },
  marker: () => {
    if (f().attackDone || !inShip()) return null;
    if (!player.gun) return f().armoryOpen ? W.p.gun : f().code ? W.p.keypad : W.p.log5;
    let best = null, bd = Infinity;
    for (const e of G.enemies) {
      if (e.zone !== W.ship || e.dead) continue;
      const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
      if (d < bd) { bd = d; best = [e.pos.x, 1.2, e.pos.z]; }
    }
    return best;
  }
});
function wakeShipAliens() {
  if (G.stage.id !== "saldiri" || f().attackDone) return;
  let woke = false;
  for (const e of G.enemies) if (e.zone === W.ship && e.dormant) { e.dormant = false; woke = true; }
  if (!woke) return;
  G.doors.cargo.locked = false;
  sfx("alien");
  nova("Kargo kapısı dayanamadı! Geliyorlar!");
}

stage("eve", {
  dest: "dunya", eventAt: 5,
  onEvent: () => goStage("sapma"),     // birinci perdenin sonu: atlama yarıda kesilir
  obj: () => G.travel ? "Dünya'ya atlanıyor…" : "Köprüdeki navigasyon konsolundan Dünya'ya son atlamayı yap",
  marker: () => G.travel ? null : shipOnly(W.p.nav)
});

function finishGame() {
  G.ended = true;
  G.alarm = false;
  if (document.pointerLockElement) document.exitPointerLock();
  const t = Math.floor(G.time), logs = Object.keys(G.flags).filter(k => /^log\d$/.test(k)).length;
  $("endStats").innerText = `Süre: ${Math.floor(t / 60)} dk ${t % 60} sn · Ölüm: ${G.stats.deaths} · Yok edilen uzaylı: ${G.stats.kills} · Okunan not: ${logs}/6`;
  later(1500, () => { $("endScreen").style.display = "flex"; });
  // Hikâye bitti: kayıt artık serbest uçuştan devam eder
  f().free = true;
  goStage("serbest");
}
$("btnFree").onclick = () => {
  $("endScreen").style.display = "none";
  G.ended = false;
  nova("Serbest uçuş açık! Köprüdeki haritadan istediğin gezegene gidebilirsin.", "Ama dikkat: uzay hâlâ tehlikeli. Meteorlar, uzaylılar, arızalar…");
  if (!TEST) canvas.requestPointerLock();
};

// ---------------------------------------------------------------- serbest uçuş
const FREE_EVENTS = ["meteor", "meteor", "elektrik", "delik", "saldiri"];
function resetEvent(ev) {
  const fl = f();
  if (ev === "elektrik") { Object.assign(fl, { powerOut: false, fuseTaken: false, fuseIn: false, powerFixed: false }); W.fuseMesh.visible = true; W.lever.rotation.z = 0; }
  if (ev === "delik") { Object.assign(fl, { breach: false, sealed: false, welded: false, hullMission: false }); W.hullPatch.visible = false; W.hullHole.visible = true; }
  if (ev === "saldiri") fl.attackDone = false;
  if (ev === "meteor") fl.meteorDone = false;
}
function startRandomEvent() {
  const ev = G.forceEvent || FREE_EVENTS[Math.floor(Math.random() * FREE_EVENTS.length)];
  G.forceEvent = null;
  resetEvent(ev);
  goStage(ev);
}
stage("serbest", {
  free: true,
  enter: () => { f().free = true; },
  onEvent: startRandomEvent,
  obj: () => {
    if (G.travel) return travelText();
    const P = W.planets[f().at];
    if (P && G.zone === P.zone) return `${P.name} yüzeyindesin: keşfet, oksijenine dikkat. İniş aracı gemiye döndürür.`;
    if (P) return `Serbest uçuş: ${P.name} yörüngesindesin. İnmek için giysini giy — ya da köprüden yeni rota seç.`;
    return "Serbest uçuş: köprüdeki navigasyondan istediğin gezegene git";
  },
  marker: () => null
});

// Meteor yağmuru: köprüdeki gemi topuyla vurulur; 3 çarpma gövdeyi deler (→ delik olayı)
W.p.turret = [38.5, 1.15, -4.6];
prop([38.8, 0.5, -4.6], 0.8, 1.0, 1.2, M.dark);
prop([38.45, 1.05, -4.6], 0.1, 0.35, 0.9, M.screenRed);
addCollider(W.ship, 38.4, 39.2, -5.2, -4.0);
const meteors = [];
G.meteors = meteors;
const meteorMat = std(0x6b5442, { emissive: 0x2a0d00, roughness: 1, metalness: 0, fog: false });
function spawnMeteor() {
  const r = 2.5 + Math.random() * 3.5;
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), meteorMat);
  m.position.set(380 + Math.random() * 120, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 150);
  const target = new THREE.Vector3(44, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10);
  W.ship.group.add(m);
  meteors.push({ m, r, hp: r > 4.5 ? 2 : 1, v: target.sub(m.position).normalize().multiplyScalar(32 + Math.random() * 12), spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()) });
}
function removeMeteor(i) { W.ship.group.remove(meteors[i].m); meteors.splice(i, 1); }
const booms = [];
function boom(pos, r) {
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, fog: false }));
  b.position.copy(pos);
  W.ship.group.add(b);
  booms.push({ b, t: 0 });
}
function enterTurret() {
  G.turret = true;
  player.yaw = -Math.PI / 2;
  player.pitch = 0;
  $("turretHud").style.display = "block";
  sfx("click");
}
function exitTurret() {
  G.turret = false;
  $("turretHud").style.display = "none";
  player.yaw = Math.PI / 2;
  player.pitch = 0;
}
addInteract(W.ship, {
  id: "turret", pos: W.p.turret, size: 0.5,
  label: () => G.stage && G.stage.id === "meteor" && !f().meteorDone ? "Gemi topuna geç" : (f().free ? "Gemi topu (hedef yok)" : null),
  act: () => { if (G.stage.id === "meteor" && !f().meteorDone) enterTurret(); else toast("Radar temiz: vurulacak meteor yok."); }
});
const cannonBeams = [0, 1].map(() => {
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: 0.85, fog: false }));
  b.visible = false;
  W.ship.group.add(b);
  return b;
});
let cannonCd = 0, cannonBeamT = 0;
const _cd = new THREE.Vector3(), _oc = new THREE.Vector3();
function shipShoot() {
  if (!G.turret || cannonCd > 0) return false;
  cannonCd = G.flags.crew_arda ? 0.1 : 0.16;
  sfx("laser");
  updateCamera(0);
  camera.getWorldDirection(_cd);
  const o = camera.position;
  let hit = -1, best = 600;
  meteors.forEach((mt, i) => {
    _oc.copy(mt.m.position).sub(o);
    const t = _oc.dot(_cd);
    if (t < 0 || t > best) return;
    if (_oc.lengthSq() - t * t < (mt.r * 1.15) ** 2) { hit = i; best = t; }
  });
  const end = o.clone().add(_cd.clone().multiplyScalar(best));
  cannonBeams.forEach((b, k) => {
    const s = new THREE.Vector3(42.4, 0.4, k ? 3 : -3);
    b.position.copy(s).add(end).multiplyScalar(0.5);
    b.scale.set(1, s.distanceTo(end), 1);
    b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(s).normalize());
    b.visible = true;
  });
  cannonBeamT = 0.07;
  if (hit >= 0) {
    const mt = meteors[hit];
    if (--mt.hp <= 0) {
      boom(mt.m.position, mt.r * 1.3);
      removeMeteor(hit);
      G.meteorWave.killed++;
      sfx("explosion");
    }
  }
  return hit >= 0;
}
onShoot = () => G.turret ? shipShoot() : shoot();
updaters.push(dt => {
  cannonCd -= dt;
  if (G.turret && interactRequested) { exitTurret(); interactRequested = false; }
  const w = G.meteorWave;
  if (!w) return;
  w.spawnT -= dt;
  if (w.toSpawn > 0 && w.spawnT <= 0) { spawnMeteor(); w.toSpawn--; w.spawnT = 1.4; }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const mt = meteors[i];
    mt.m.position.addScaledVector(mt.v, dt);
    mt.m.rotation.x += mt.spin.x * dt; mt.m.rotation.y += mt.spin.y * dt;
    if (mt.m.position.x < 46) {
      removeMeteor(i);
      w.impacts++;
      shake = 1.4;
      sfx("explosion");
      toast(`💥 Meteor gövdeye çarptı! (${w.impacts}/3)`, 1800);
    }
  }
  if (w.toSpawn === 0 && meteors.length === 0) endMeteorWave();
});
visuals.push(dt => {
  cannonBeamT -= dt;
  for (const b of cannonBeams) b.visible = cannonBeamT > 0;
  for (let i = booms.length - 1; i >= 0; i--) {
    const o = booms[i];
    o.t += dt;
    o.b.scale.setScalar(1 + o.t * 4);
    o.b.material.opacity = Math.max(0, 0.9 - o.t * 1.8);
    if (o.t > 0.5) { W.ship.group.remove(o.b); booms.splice(i, 1); }
  }
});
function endMeteorWave() {
  const w = G.meteorWave;
  G.meteorWave = null;
  f().meteorDone = true;
  G.alarm = false;
  if (G.turret) exitTurret();
  if (w.impacts >= 3) {
    nova("Çok fazla çarpma aldık! Gövde delindi!");
    resetEvent("delik");
    goStage("delik");
    return;
  }
  nova(`Meteor yağmuru geçti! ${w.killed} meteor vurdun. Yolculuğa devam.`);
  if (G.travel) G.travel.paused = false;
  saveGame();
}
stage("meteor", {
  enter: () => {
    ensureTravel("kizil", 5);
    if (f().meteorDone) return;
    while (meteors.length) removeMeteor(0);
    G.meteorWave = { toSpawn: (f().act || 1) >= 4 && !f().free ? 14 : 10, spawnT: 2.5, impacts: 0, killed: 0 };
    G.alarm = true;
    shake = 0.6;
    nova("Meteor yağmuru! Tam rotamızdalar!", "Köprüdeki kırmızı gemi topu konsoluna geç ve vur onları. Üç çarpma gövdeyi deler!");
  },
  obj: () => {
    if (f().meteorDone) return travelText();
    const w = G.meteorWave, left = w ? w.toSpawn + meteors.length : 0, hits = w ? w.impacts : 0;
    return G.turret ? `Meteorları vur! Kalan: ${left} · Çarpma: ${hits}/3 · E: koltuktan kalk` : `METEOR YAĞMURU! Köprüdeki gemi topuna geç (kalan ${left}, çarpma ${hits}/3)`;
  },
  marker: () => f().meteorDone || G.turret ? null : shipOnly(W.p.turret)
});

// Ortak bölüm döngüsü: görev metni, hedef işareti, düşmanlar
const _mk = new THREE.Vector3();
updaters.push(dt => {
  const s = G.stage;
  if (!s) return;
  if (s.update) s.update(dt);
  if (!G.stage) return;
  setObjective(G.stage.obj ? G.stage.obj() : "");
  const mk = G.stage.marker ? G.stage.marker() : null;
  G.marker = mk ? _mk.set(mk[0], mk[1], mk[2]) : null;
  updateEnemies(dt);
});

// =============================================================== PERDE 2–4 (Hakan: "oyun bunun 4 katı uzunluğunda olsun")
// 2. Kayıp Mürettebat: üç kaçış kapsülü (Arda, Elif, Deniz) — her kurtarma bir ödül verir
// 3. Uzaylı Ana Gemisi: üç enerji düğümü → izleyici çekirdek → 75 sn'de kaçış
// 4. Eve Dönüş: asteroit kuşağı → Ay üssü (yakıt + röle kulesi) → son saldırı (dev uzaylı) → Dünya'ya iniş
G.shootables = [];
const ESCAPE_TIME = 75;
function addShootable(zone, pos, r, hp, onBreak) {
  const s = { zone, pos: new THREE.Vector3(...pos), r, hp, maxHp: hp, alive: true, onBreak };
  G.shootables.push(s);
  return s;
}
const flagCount = prefix => Object.keys(G.flags).filter(k => k.startsWith(prefix) && G.flags[k]).length;

// Görev adımı başka bir bölgedeyse oraya giden yolu tarif et
function goWhere(where, planet) {
  const zone = where === "ship" ? W.ship : G.zones[planet];
  if (G.zone === zone) return null;
  if (where === "ship") return { text: G.zone === W.mother ? "Hava kilidinden ARGO-7'ye dön" : "İniş aracıyla gemiye dön", marker: G.zone === W.mother ? W.p.motherHatch : [0, 1.4, 3.9] };
  if (!inShip()) return { text: "Önce gemiye dön", marker: null };
  if (zone.vacuum && !player.suit) return { text: "Hava kilidinde uzay giysisini giy", marker: W.p.locker };
  return { text: `Hava kilidinin dış kapağından çık: ${zone.title}`, marker: W.p.hatch };
}
function quest(id, o) {
  const step = () => o.steps.find(s => !s.done());
  stage(id, {
    planet: o.planet,
    enter: opts => {
      f().act = Math.max(f().act || 1, o.act);
      f().at = o.planet;
      W.showWindowPlanet(PLANET_INFO[o.planet].color, PLANET_INFO[o.planet].emissive);
      if (o.enter) o.enter(opts);
    },
    update: dt => {
      if (o.update) o.update(dt);
      if (!f()[id + "_done"] && !step()) { f()[id + "_done"] = true; o.onDone(); }
    },
    onReturn: o.onReturn,
    obj: () => {
      const s = step();
      if (!s) return o.after ? o.after() : "";
      const w = goWhere(s.where, o.planet);
      return w ? w.text : (typeof s.text === "function" ? s.text() : s.text);
    },
    marker: () => {
      const s = step();
      if (!s) return null;
      const w = goWhere(s.where, o.planet);
      return w ? w.marker : (s.marker ? s.marker() : null);
    }
  });
}

// ---- mürettebat (gemide kurtarılınca, Dünya'da sonunda)
const CREW = {
  arda: { name: "ARDA", suit: 0x2563eb, hair: 0x1a1a1a, ship: [35.2, -2.4, Math.PI / 2],
    lines: ["Dümen bende. Kısa yoldan gideriz, merak etme!", "Gemi topunu da ayarladım; artık daha hızlı ateş ediyor.", "Uzaylıların ana gemisini gördüm… dev gibiydi."] },
  elif: { name: "ELİF", suit: 0xf8fafc, hair: 0x7c2d12, ship: [-6, -5.5, Math.PI],
    lines: ["Kalbin artık daha güçlü — fazladan bir kalp verdim sana.", "Yaralanırsan tedavi istasyonu her zaman burada.", "Kaan iyileşti, Dünya'da bizi bekliyor."] },
  deniz: { name: "DENİZ", suit: 0xf97316, hair: 0xfacc15, ship: [-18.6, 6.5, Math.PI / 2],
    lines: ["Giysinin oksijen tüpünü büyüttüm, dışarıda daha uzun kalırsın.", "Hiper sürücü hiç bu kadar iyi çalışmamıştı!", "Sigortalara dikkat et, bu gemi yaşlı."] },
  mert: { name: "KAPTAN MERT", suit: 0x1e3a8a, hair: 0x9ca3af, lines: ["Gemiyi eve getirdin. Seninle gurur duyuyorum.", "ARGO-7'nin kaptanı artık sensin, yolcu."] },
  kaan: { name: "KAAN", suit: 0x16a34a, hair: 0x3b2a1e, lines: ["O yumurtaları gemiye ben getirdim… özür dilerim.", "Bir daha mor gezegene gitmem!"] },
  zeynep: { name: "ZEYNEP", suit: 0xdc2626, hair: 0x111111, lines: ["Sıcak çorba hazır! Dünya'da her şey daha lezzetli.", "Mavi meyvelerden tohum getirdim, buraya ekeceğim."] }
};
for (const id in CREW) {
  const c = CREW[id];
  c.talk = 0;
  const talk = () => { say([[c.name, c.lines[c.talk++ % c.lines.length]]]); };
  if (c.ship) {
    c.shipMesh = W.placePerson(W.ship, W.makePerson(c.suit, 0xf0c8a0, c.hair), c.ship[0], c.ship[1], c.ship[2]);
    c.shipCol = addCollider(W.ship, c.ship[0] - 0.3, c.ship[0] + 0.3, c.ship[1] - 0.3, c.ship[1] + 0.3);
    addInteract(W.ship, { id: "talk_ship_" + id, pos: [c.ship[0], 1.5, c.ship[1]], size: 0.5, label: () => c.shipMesh.visible ? `${c.name} ile konuş` : null, act: talk });
  }
  const i = Object.keys(CREW).indexOf(id), a = i / 6 * Math.PI * 2, ex = Math.cos(a) * 4, ez = -80 + Math.sin(a) * 4;
  const E = W.planets.dunya;
  c.earthMesh = W.placePerson(E.zone, W.makePerson(c.suit, 0xf0c8a0, c.hair), ex, ez, Math.atan2(ex, ez + 80));
  c.earthCol = addCollider(E.zone, ex - 0.3, ex + 0.3, ez - 0.3, ez + 0.3);
  addInteract(E.zone, { id: "talk_earth_" + id, pos: [ex, E.h(ex, ez) + 1.5, ez], size: 0.5, label: () => c.earthMesh.visible ? `${c.name} ile konuş` : null, act: talk });
}

// ---- Kum Ayı: sinyal kuleleri + Arda'nın kapsülü
const towersOn = pid => (W.towers[pid] || []).filter((t, i) => G.flags[`tower_${pid}_${i}`]).length;
W.towers.kum.forEach((t, i) => {
  addInteract(W.planets.kum.zone, {
    id: `tower_kum_${i}`, pos: [t.x, t.top + 1.4, t.z], size: 0.6, r: 2.8,
    label: () => G.flags[`tower_kum_${i}`] ? null : "Sinyal kulesini çalıştır",
    act: () => {
      G.flags[`tower_kum_${i}`] = true;
      syncActs();
      sfx("power");
      toast(`📡 Sinyal kulesi çalıştı: ${towersOn("kum")}/3`);
      if (towersOn("kum") === 3) nova("Üç kule de çalışıyor! Kapsülün yeri haritada.");
    }
  });
});
const podPos = pid => { const [x, z] = W.planets[pid].core; return [x, W.planets[pid].h(x, z) + 1.4, z]; };
addInteract(W.planets.kum.zone, {
  id: "pod_kum", pos: podPos("kum"), size: 1.0, r: 3.2,
  label: () => f().arda_found ? null : towersOn("kum") < 3 ? "Kaçış kapsülü (kilitli — sinyal zayıf)" : "Kapsülü aç",
  act: () => {
    if (towersOn("kum") < 3) return toast("Kapsülün kilit sinyali zayıf. Önce üç sinyal kulesini çalıştır.");
    f().arda_found = true;
    sfx("hiss");
    say([["ARDA", "Kapak sıkışmıştı, sonunda!"], ["ARDA", "Uzaylılar kapsülleri bu sisteme çekti. Elif ve Deniz de buralarda."], ["ARDA", "İniş aracına koşuyorum, gemide görüşürüz!"]]);
  }
});
quest("kumgorev", {
  act: 2, planet: "kum",
  enter: o => { if (!o.loaded) later(3500, () => nova("Kum Ayı'nda yer çekimi çok düşük. Zıplarken havada Space'e tekrar basarsan jetpack ile süzülürsün.", "Kapsülün sinyali zayıf. Kayaların tepesindeki üç eski sinyal kulesini çalıştır.")); },
  steps: [
    { where: "planet", text: () => `Üç sinyal kulesini çalıştır (${towersOn("kum")}/3) — kayaya doğru yürüyerek tırman`, done: () => towersOn("kum") >= 3,
      marker: () => { const i = W.towers.kum.findIndex((t, k) => !G.flags[`tower_kum_${k}`]); const t = W.towers.kum[i]; return t ? [t.x, t.top + 1.5, t.z] : null; } },
    { where: "planet", text: "Sinyal güçlendi! Arda'nın kapsülünü aç", done: () => !!f().arda_found, marker: () => podPos("kum") },
    { where: "ship", text: "Arda ile gemiye dön", done: () => !!f().arda_found && inShip() }
  ],
  onDone: () => {
    f().crew_arda = true;
    syncActs();
    say([["ARDA", "ARGO-7! Seni özlemişim, yaşlı kız."], ["ARDA", "Dümene ben geçiyorum: yolculuklar artık çok daha kısa!"]]);
    showBanner("PİLOT ARDA KATILDI", "YOLCULUKLAR KISALDI · GEMİ TOPU HIZLANDI", true);
    sfx("quest");
    goStage("rota_batak");
  }
});

// ---- Zehir Bataklığı: zehirli havuzlar + uzaylılar + Elif (ilk yardım çantası gemiden)
let poolWarn = 0;
W.planets.bataklik.zone.update = dt => {
  poolWarn -= dt;
  for (const [x, z, r] of W.pools) {
    if (Math.hypot(player.pos.x - x, player.pos.z - z) < r && player.pos.y - W.planets.bataklik.h(player.pos.x, player.pos.z) < 0.6) {
      hurt(9 * dt, "Zehirli suda kaldın.");
      if (poolWarn <= 0) { toast("☠ Zehirli su! Hemen çık!", 1500); poolWarn = 2; }
    }
  }
};
W.p.medkit = [-7.5, 1.0, -8.4];
W.medkitMesh = prop([-7.5, 0.98, -8.4], 0.5, 0.22, 0.35, std(0xdc2626));
{ const cross = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.08), basic(0xffffff)); cross.position.y = 0.12; W.medkitMesh.add(cross); }
addInteract(W.ship, {
  id: "medkit", pos: W.p.medkit, size: 0.4,
  label: () => f().elif_found && !f().medkit ? "İlk yardım çantasını al" : null,
  act: () => { f().medkit = true; syncActs(); sfx("pickup"); toast("🩹 İlk yardım çantası alındı. Elif'e götür!"); }
});
addInteract(W.planets.bataklik.zone, {
  id: "pod_batak", pos: podPos("bataklik"), size: 1.0, r: 3.2,
  label: () => !f().elif_found ? "Kapsülü aç" : f().elif_healed ? null : f().medkit ? "Elif'i tedavi et" : "Elif yaralı — revirden çanta getir",
  act: () => {
    if (!f().elif_found) {
      f().elif_found = true;
      sfx("hiss");
      say([["ELİF", "Kimse gelmeyecek sanmıştım!"], ["ELİF", "Bacağım yaralı, yürüyemiyorum… Revirdeki ilk yardım çantasını getirir misin?"]]);
    } else if (f().medkit && !f().elif_healed) {
      f().elif_healed = true;
      sfx("pickup");
      say([["ELİF", "Çok daha iyiyim, teşekkürler!"], ["ELİF", "Gemide görüşürüz — kalbini de güçlendireceğim."]]);
    } else toast("Elif'in yarası için revirdeki ilk yardım çantası lazım.");
  }
});
const BATAK_ALIENS = [[28, -40], [38, -54], [42, -40], [26, -52], [30, -30]];
quest("batakgorev", {
  act: 2, planet: "bataklik",
  enter: o => {
    if (!f().elif_healed && !G.enemies.some(e => e.zone === W.planets.bataklik.zone && !e.dead))
      for (const [x, z] of BATAK_ALIENS) spawnAlien(W.planets.bataklik.zone, x, z, { speed: 2.3, see: 13 });
    if (!o.loaded) later(3500, () => nova("Zehir Bataklığı: yeşil parlayan sular zehirli, içine girme!", "Elif'in kapsülünün çevresinde uzaylılar var. Tüfeğin hazır olsun."));
  },
  steps: [
    { where: "planet", text: "Elif'in kapsülüne ulaş — zehirli sulardan uzak dur", done: () => !!f().elif_found, marker: () => podPos("bataklik") },
    { where: "ship", text: "Revirden ilk yardım çantasını al", done: () => !!f().medkit, marker: () => W.p.medkit },
    { where: "planet", text: "İlk yardım çantasını Elif'e götür", done: () => !!f().elif_healed, marker: () => podPos("bataklik") },
    { where: "ship", text: "Elif ile gemiye dön", done: () => !!f().elif_healed && inShip() }
  ],
  onDone: () => {
    f().crew_elif = true;
    syncActs();
    player.health = player.maxHealth;
    say([["ELİF", "Revir yine benim! Al bakalım: kalbin artık bir kalp daha güçlü."]]);
    showBanner("DOKTOR ELİF KATILDI", "KALP KABI · +1 KALP", true);
    sfx("quest");
    goStage("rota_kristal");
  }
});

// ---- Kristal Ay: üç güç hücresi + kristal duvar (vurularak kırılır) + Deniz
const KRISTAL_CELLS = () => [[-20, -20], [-46, -36], [W.towers.kristal[0].x, W.towers.kristal[0].z, W.towers.kristal[0].top]];
W.cellMeshes = KRISTAL_CELLS().map(([x, z, top], i) => {
  const P = W.planets.kristal, y = top !== undefined ? top : P.h(x, z);
  const m = cyl(P.zone, x, y + 0.45, z, 0.18, 0.7, basic(0xfde047), 10);
  addInteract(P.zone, {
    id: `cell_${i}`, pos: [x, y + 0.6, z], size: 0.45, r: 2.6,
    label: () => G.flags[`cell_${i}`] ? null : "Güç hücresini al",
    act: () => { G.flags[`cell_${i}`] = true; syncActs(); sfx("pickup"); toast(`🔋 Güç hücresi: ${flagCount("cell_")}/3`); }
  });
  return m;
});
W.crystalBlocks = [];
{
  const P = W.planets.kristal, [px, pz] = P.core, d = Math.hypot(px, pz), dx = -px / d, dz = -pz / d;
  const iceM = std(0x9ae6ff, { emissive: 0x1a4a6a, transparent: true, opacity: 0.9 });
  [-2.4, -0.8, 0.8, 2.4].forEach((k, i) => {
    const x = px + dx * 3.4 + dz * k, z = pz + dz * 3.4 - dx * k, y = P.h(x, z);
    const m = box(P.zone, x, y + 1.3, z, 1.4, 2.6, 1.4, iceM);
    const s = addShootable(P.zone, [x, y + 1.3, z], 1.0, 2, () => { G.flags[`cblock_${i}`] = true; syncActs(); });
    W.crystalBlocks.push({ m, s, col: m.userData.col, pos: [x, y + 1.3, z] });
  });
}
addInteract(W.planets.kristal.zone, {
  id: "pod_kristal", pos: podPos("kristal"), size: 1.0, r: 3.2,
  label: () => f().deniz_found ? null : flagCount("cblock_") < 4 ? "Kapsül (kristal duvar sarmış — vur!)" : flagCount("cell_") < 3 ? "Kapsül (güç hücresi lazım)" : "Güç hücrelerini kapsüle tak",
  act: () => {
    if (flagCount("cblock_") < 4) return toast("Önce kapsülü saran kristalleri tüfekle vur.");
    if (flagCount("cell_") < 3) return toast("Kapsülü açmak için üç güç hücresi lazım.");
    f().deniz_found = true;
    sfx("power");
    say([["DENİZ", "Işıklar yandı! Güç hücrelerini nereden buldun?"], ["DENİZ", "Gemide giysini elden geçireceğim, söz."]]);
  }
});
quest("kristalgorev", {
  act: 2, planet: "kristal",
  enter: o => { if (!o.loaded) later(3500, () => nova("Kristal Ay dondurucu: giysinin oksijeni hızlı biter.", "Deniz'in kapsülünün gücü bitmiş ve etrafını kristal sarmış. Üç güç hücresi bul, sonra kristalleri vur.")); },
  steps: [
    { where: "planet", text: () => `Üç güç hücresi topla (${flagCount("cell_")}/3) — biri kayalık sütunun tepesinde`, done: () => flagCount("cell_") >= 3,
      marker: () => { const i = [0, 1, 2].find(k => !G.flags[`cell_${k}`]); const c = KRISTAL_CELLS()[i]; return c ? [c[0], (c[2] !== undefined ? c[2] : W.planets.kristal.h(c[0], c[1])) + 1, c[1]] : null; } },
    { where: "planet", text: () => `Kapsülü saran kristal duvarı vur (${4 - flagCount("cblock_")} kaldı)`, done: () => flagCount("cblock_") >= 4,
      marker: () => { const b = W.crystalBlocks.find(b => b.s.alive); return b ? b.pos : null; } },
    { where: "planet", text: "Güç hücrelerini kapsüle tak", done: () => !!f().deniz_found, marker: () => podPos("kristal") },
    { where: "ship", text: "Deniz ile gemiye dön", done: () => !!f().deniz_found && inShip() }
  ],
  onDone: () => {
    f().crew_deniz = true;
    f().act = 3;
    syncActs();
    say([["DENİZ", "Giysinin tüpünü büyüttüm: dışarıda çok daha uzun kalabilirsin."],
      ["ARDA", "Dinleyin… uzaylıların ana gemisi bizi izliyor. Bu yüzden rotamız saptı."],
      ["NOVA", "Ana gemideki izleyici çekirdeği yok etmezsek Dünya'ya asla ulaşamayız. Köprüden rota çiz."]]);
    showBanner("MÜHENDİS DENİZ KATILDI", "GİYSİ OKSİJENİ DAHA UZUN", true);
    sfx("quest");
    goStage("rota_ana");
  }
});

// ---- Uzaylı ana gemisi
W.motherNodes.forEach(([x, z], i) => {
  const s = addShootable(W.mother, [x, 1.6, z], 0.75, 4, () => {
    G.flags[`node_${i}`] = true;
    syncActs();
    toast(`💥 Enerji düğümü yok edildi: ${flagCount("node_")}/3`, 2200);
    if (flagCount("node_") === 3) { nova("Üç düğüm de gitti! Kalp odasının bariyeri kalktı."); sfx("powerDown"); }
  });
  W.motherNodeMeshes[i].userData.shoot = s;
});
addInteract(W.mother, { id: "motherHatch", pos: W.p.motherHatch, size: 0.8, label: () => "Hava kilidinden ARGO-7'ye dön", act: enterShip });
addInteract(W.mother, {
  id: "motherCore", pos: [W.motherCore[0], 2.2, W.motherCore[1]], size: 1.3, r: 3.6, hold: TEST ? 1 : 5,
  label: () => flagCount("node_") >= 3 && !f().core_sabotaged ? "İzleyici çekirdeği sabote et" : null,
  onHold: () => { shake = Math.max(shake, 0.2); },
  act: () => {
    f().core_sabotaged = true;
    G.escapeT = ESCAPE_TIME;
    G.alarm = true;
    shake = 1.5;
    sfx("explosion");
    nova(`Çekirdek aşırı ısınıyor! ${ESCAPE_TIME} saniye içinde patlayacak — KAÇ!`);
  }
});
updaters.push(dt => {
  const on = f().core_sabotaged && !f().mother_escaped;
  $("escape").style.display = on && G.zone === W.mother ? "block" : "none";
  if (!on || G.zone !== W.mother) return;
  G.escapeT -= dt;
  $("escape").innerText = "⏱ " + Math.max(0, Math.ceil(G.escapeT)) + " sn";
  if (Math.random() < dt * 1.5) shake = Math.max(shake, 0.3);
  if (G.escapeT <= 0) die("Ana gemiyle birlikte patladın!");
});
quest("anagemi", {
  act: 3, planet: "anagemi",
  enter: o => {
    if (!f().mother_escaped && !G.enemies.some(e => e.zone === W.mother && !e.dead))
      for (const [x, z] of W.motherAliens) spawnAlien(W.mother, x, z, { speed: 2.3, see: 12 });
    if (!o.loaded) later(1500, () => nova("Ana geminin havası zehirli: giysini giy.", "İzleyici çekirdek üç enerji düğümünden güç alıyor. Kırmızı düğümleri vur, sonra çekirdeği sabote et."));
  },
  steps: [
    { where: "planet", text: () => `Üç enerji düğümünü vur (${flagCount("node_")}/3) — kırmızı parlayan küreler`, done: () => flagCount("node_") >= 3,
      marker: () => { const i = [0, 1, 2].find(k => !G.flags[`node_${k}`]); const n = W.motherNodes[i]; return n ? [n[0], 1.6, n[1]] : null; } },
    { where: "planet", text: "Bariyer kalktı! Kalp odasında izleyici çekirdeği sabote et (E basılı tut)", done: () => !!f().core_sabotaged,
      marker: () => [W.motherCore[0], 2.2, W.motherCore[1]] },
    { where: "planet", text: () => `KAÇ! Hava kilidine dön — ${Math.max(0, Math.ceil(G.escapeT))} sn`, done: () => !!f().mother_escaped, marker: () => W.p.motherHatch }
  ],
  onReturn: () => {
    if (!f().core_sabotaged || f().mother_escaped) return;
    f().mother_escaped = true;
    G.alarm = false;
    clearAliens(W.mother);
    shake = 2;
    sfx("explosion");
  },
  onDone: () => {
    f().act = 4;
    syncActs();
    W.showWindowPlanet(0xff7a2f, 0x802000);
    nova("Ana gemi patladı! İzleyici sinyal sustu.", "Artık eve gidebiliriz… ama yakıtımız az. Yol üstünde Ay var: oradaki üsten yakıt alalım.");
    showBanner("ANA GEMİ YOK EDİLDİ", "ÜÇÜNCÜ PERDE TAMAM", false);
    sfx("quest");
    goStage("rota_ay");
  }
});

// ---- Ay: yakıt hücreleri + röle kulesi
W.fuelMeshes = W.fuelCells.map(([x, z], i) => {
  const P = W.planets.ay, y = P.h(x, z);
  const m = cyl(P.zone, x, y + 0.45, z, 0.2, 0.8, basic(0x4ade80), 10);
  addInteract(P.zone, {
    id: `fuel_${i}`, pos: [x, y + 0.6, z], size: 0.45, r: 2.6,
    label: () => G.flags[`fuel_${i}`] ? null : "Yakıt hücresini al",
    act: () => { G.flags[`fuel_${i}`] = true; syncActs(); sfx("pickup"); toast(`⛽ Yakıt hücresi: ${flagCount("fuel_")}/3`); }
  });
  return m;
});
addInteract(W.planets.ay.zone, {
  id: "relay", pos: [44, W.relayTop + 1.4, -54], size: 0.6, r: 2.8, hold: TEST ? 1 : 3,
  label: () => f().relay ? null : "Dünya ile bağlantı kur",
  act: () => { f().relay = true; syncActs(); sfx("power"); say([["DÜNYA", "…ARGO-7? ARGO-7, sizi duyuyoruz! Mürettebatınız burada, sizi bekliyoruz!"]]); }
});
quest("aygorev", {
  act: 4, planet: "ay",
  enter: o => { if (!o.loaded) later(3500, () => nova("Gökyüzündeki mavi küreye bak… Dünya!", "Ay üssünden üç yakıt hücresi topla, sonra röle kulesine tırmanıp Dünya ile bağlantı kur.")); },
  steps: [
    { where: "planet", text: () => `Ay üssünden üç yakıt hücresi topla (${flagCount("fuel_")}/3)`, done: () => flagCount("fuel_") >= 3,
      marker: () => { const i = [0, 1, 2].find(k => !G.flags[`fuel_${k}`]); const c = W.fuelCells[i]; return c ? [c[0], W.planets.ay.h(c[0], c[1]) + 1, c[1]] : null; } },
    { where: "planet", text: "Röle kulesine tırman ve Dünya ile bağlantı kur (E basılı tut)", done: () => !!f().relay, marker: () => [44, W.relayTop + 1.5, -54] },
    { where: "ship", text: "Yakıtla gemiye dön", done: () => !!f().relay && inShip() }
  ],
  onDone: () => {
    nova("Yakıt tamam, Dünya bizi bekliyor!", "Köprüden son atlamayı yap — eve gidiyoruz!");
    sfx("quest");
    goStage("rota_son");
  }
});

// ---- Son saldırı: dev uzaylı dahil
stage("finalsaldiri", {
  enter: () => {
    ensureTravel("dunya", 5);
    if (f().finalDone) return;
    clearAliens(W.ship);
    for (const [x, z] of [[-12, 6], [-4.5, 7], [-22, 3.2], [-25, -6], [15, -6], [20, 6]]) spawnAlien(W.ship, x, z, { speed: 2.2 });
    spawnAlien(W.ship, -7.5, 6.5, { hp: 12, scale: 1.7, dmg: 16, speed: 1.9 });
    G.alarm = true;
    sfx("alien");
    nova("SON SALDIRI! Uzaylıların kalanı gemiye sızdı — içlerinde dev bir tane var!", "Onları yenersek eve gidiyoruz. Tüfeğini hazırla!");
  },
  onKill: () => {
    const left = aliveIn(W.ship);
    if (left > 0) return toast(`Uzaylı yok edildi! ${left} kaldı.`, 1500);
    f().finalDone = true;
    G.alarm = false;
    nova("Hepsi yok edildi! Dünya'ya atlıyoruz!");
    if (G.travel) G.travel.paused = false;
    saveGame();
  },
  obj: () => f().finalDone ? "Dünya'ya atlanıyor…" : `SON SALDIRI! Uzaylıları yok et: ${aliveIn(W.ship)} kaldı (dev uzaylıya dikkat)`,
  marker: () => {
    if (f().finalDone || !inShip()) return null;
    let best = null, bd = Infinity;
    for (const e of G.enemies) {
      if (e.zone !== W.ship || e.dead) continue;
      const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
      if (d < bd) { bd = d; best = [e.pos.x, 1.2, e.pos.z]; }
    }
    return best;
  }
});

// ---- Dünya'ya iniş: köyde mürettebat bekliyor
quest("dunyainis", {
  act: 4, planet: "dunya",
  enter: o => { syncActs(); if (!o.loaded) nova("Dünya yörüngesindeyiz! İniş aracı hazır.", "Burada giysiye gerek yok — temiz hava var!"); },
  update: () => {
    const E = W.planets.dunya;
    if (G.zone === E.zone && !f().met_crew && Math.hypot(player.pos.x, player.pos.z + 80) < 8) {
      f().met_crew = true;
      syncActs();
    }
  },
  steps: [
    { where: "planet", text: "Köye git — mürettebat seni şenlik ateşinin başında bekliyor", done: () => !!f().met_crew, marker: () => [0, W.planets.dunya.h(0, -80) + 2, -80] }
  ],
  onDone: () => {
    say([["KAPTAN MERT", "İşte geldi! ARGO-7'nin son yolcusu!"], ["ZEYNEP", "Çorba hazır! Hoş geldin!"], ["KAAN", "Hepimizi kurtardın…"]]);
    later(5000, finishGame);
  }
});

// ---- perde rotaları
rotaStage("rota_batak", "bataklik", 5, "random");
rotaStage("rota_kristal", "kristal", 5, "random");
rotaStage("rota_ana", "anagemi", 5, "random");
rotaStage("rota_ay", "ay", 5, "meteor");
rotaStage("rota_son", "dunya", 5, "finalsaldiri");

stage("sapma", {
  enter: o => {
    f().act = 2;
    ensureTravel("dunya", 5);
    G.alarm = true;
    shake = 1.2;
    sfx("powerDown");
    nova("UYARI! Bir çekim ışını bizi yakaladı!", "Uzaylılar gemiyi izliyormuş… rotamız saptırıldı!",
      "Bilinmeyen bir sisteme düşüyoruz. Dur… burada üç kaçış kapsülü sinyali var!", "Mürettebat bu sisteme çekilmiş. Onları kurtarmalıyız. İlk sinyal: Kum Ayı.");
    showBanner("İKİNCİ PERDE", "KAYIP MÜRETTEBAT", false);
    later(o.loaded ? 300 : 9000, () => {
      if (G.stage.id !== "sapma" || !G.travel) return;
      G.alarm = false;
      Object.assign(G.travel, { dest: "kum", t: 0, dur: 8, eventAt: 0, paused: false });
      f().travelDest = "kum";
    });
  },
  obj: () => G.travel && !G.travel.paused ? travelText() : "Rota saptırıldı! NOVA'yı dinle…"
});

// ---- bayraklardan perde 2–4 görünümünü kur (kayıttan yükleme dahil)
function syncActs() {
  const fl = G.flags;
  (W.towers.kum || []).forEach((t, i) => t.mesh.userData.lamp.material.color.set(fl[`tower_kum_${i}`] ? 0x4ade80 : 0x553333));
  W.medkitMesh.visible = !fl.medkit;
  W.cellMeshes.forEach((m, i) => { m.visible = !fl[`cell_${i}`]; });
  W.crystalBlocks.forEach((b, i) => { const gone = !!fl[`cblock_${i}`]; b.m.visible = !gone; b.col.on = !gone; b.s.alive = !gone; if (!gone) b.s.hp = b.s.maxHp; });
  W.motherNodeMeshes.forEach((m, i) => {
    const gone = !!fl[`node_${i}`];
    m.userData.dead = gone;
    m.material.color.set(gone ? 0x2a0a2a : 0xff3b3b);
    m.scale.setScalar(gone ? 0.5 : 1);
    m.userData.shoot.alive = !gone;
    if (!gone) m.userData.shoot.hp = m.userData.shoot.maxHp;
  });
  const nodesGone = flagCount("node_") >= 3;
  W.motherBarrier.col.on = !nodesGone;
  W.motherBarrier.mesh.visible = !nodesGone;
  W.motherCoreMesh.visible = !fl.mother_escaped;
  W.fuelMeshes.forEach((m, i) => { m.visible = !fl[`fuel_${i}`]; });
  W.relay.userData.lamp.material.color.set(fl.relay ? 0x4ade80 : 0x553333);
  for (const id in CREW) {
    const c = CREW[id];
    if (c.shipMesh) { c.shipMesh.visible = !!fl["crew_" + id] && !fl.met_crew; c.shipCol.on = c.shipMesh.visible; }
    c.earthMesh.visible = (fl.act || 1) >= 4; c.earthCol.on = c.earthMesh.visible;
  }
  player.maxHealth = fl.crew_elif ? 120 : 100;
  player.health = Math.min(player.health, player.maxHealth);
  player.o2Mult = fl.crew_deniz ? 0.7 : 1;
}

// ---------------------------------------------------------------- dünya durumunu bayraklardan kur
function applyFlags() {
  const fl = G.flags;
  W.setPower(!fl.powerOut);
  G.alarm = false;
  G.shipAir = 100;
  G.doors.armory.locked = !fl.armoryOpen;
  G.doors.cargo.locked = false;
  G.doors.cargo.forceOpen = false;
  player.gun = !!fl.gun;
  W.gunRack.visible = !fl.gun;
  W.gunView.visible = player.gun;
  W.fuseMesh.visible = !fl.fuseTaken;
  W.fuseLamp.color.set(fl.powerFixed ? 0x22ff66 : 0xff2a2a);
  W.lever.rotation.z = fl.powerFixed ? 1.2 : 0;
  W.holeGroup.visible = !!fl.breach && !fl.welded;
  W.hullPatch.visible = !!fl.welded;
  W.hullHole.visible = !fl.welded;
  for (const fr of W.fruits) fr.mesh.visible = !fl["fruit_" + fr.i];
  for (const id in W.batMeshes) W.batMeshes[id].visible = !fl[id];
  syncCoreSlots();
  syncCores();
  syncCrystals();
  syncActs();
  player.maxStamina = staminaMax();
  player.stamina = player.maxStamina;
  W.showWindowPlanet(fl.at ? PLANET_INFO[fl.at].color : null, fl.at ? PLANET_INFO[fl.at].emissive : null);
  player.suit = false;
  W.suitMesh.visible = true;
}

function resetPlayer() {
  Object.assign(player, { health: 100, suit: false, suitO2: 100, battery: 100, light: false, gun: false, heat: 0, overheat: 0, dead: false, vy: 0,
    stamina: 100, maxStamina: 100, exhausted: false, climbing: null, gliding: false, maxHealth: 100, o2Mult: 1 });
  G.escapeT = 0;
  $("escape").style.display = "none";
  player.push.set(0, 0, 0);
  if (G.turret) exitTurret();
  G.meteorWave = null;
  while (meteors.length) removeMeteor(0);
}

function beginPlay() {
  document.body.classList.add("playing");
  $("menu").style.display = "none";
  $("endScreen").style.display = "none";
  G.running = true;
  G.ended = false;
  startMusic();
  later(300, () => fadeTo(0));
  if (!TEST) canvas.requestPointerLock();
}

function startNewGame() {
  G.flags = { cores: 0 };
  G.stats = { deaths: 0, kills: 0 };
  G.time = 0;
  G.travel = null;
  resetPlayer();
  clearAliens(null);
  applyFlags();
  setZone("ship", -25, -6.5, Math.PI);
  goStage("uyanis");
  beginPlay();
}

function continueGame() {
  const s = loadSave();
  if (!s || !s.flags || !STAGES[s.flags.stage]) return startNewGame();
  G.flags = s.flags;
  G.stats = s.stats || { deaths: 0, kills: 0 };
  G.time = s.time || 0;
  G.travel = null;
  resetPlayer();
  player.battery = s.battery === undefined ? 100 : s.battery;
  clearAliens(null);
  applyFlags();
  if (s.flags.stage === "uyanis") setZone("ship", -25, -6.5, Math.PI);
  else setZone("ship", 35, 0, Math.PI / 2);
  goStage(s.flags.stage, { loaded: true });
  toast("Kayıt yüklendi.", 2000);
  beginPlay();
}

function respawn() {
  $("deathScreen").style.display = "none";
  if (G.turret) exitTurret();
  player.dead = false;
  player.health = player.maxHealth;
  player.suitO2 = 100;
  player.vy = 0;
  player.stamina = player.maxStamina;
  player.exhausted = false;
  player.push.set(0, 0, 0);
  const z = G.zone;
  if (z === W.ship) {
    G.shipAir = Math.max(G.shipAir, 60);
    setZone("ship", 35, 0, Math.PI / 2);
  } else if (z === W.hull) setZone("hull", 8, 3.4, Math.PI / 2);
  else if (z === W.mother && f().core_sabotaged && !f().mother_escaped) {
    // Kaçışta öldüysen çekirdek odasının kapısından, sayaç baştan
    const [x, zz] = W.motherCell(9, 7);
    setZone("anagemi", x, zz, Math.PI);
    G.escapeT = ESCAPE_TIME;
  } else { const sp = z.spawn; setZone(z.name, sp[0], sp[2] === 0 ? 1.5 : sp[2], z === W.mother ? -Math.PI / 2 : 0); resetCans(z.name); }
  toast("Tekrar deniyorsun. Dikkatli ol!", 2000);
  if (!TEST) canvas.requestPointerLock();
}

$("btnNew").onclick = startNewGame;
$("btnContinue").onclick = continueGame;
$("btnRetry").onclick = respawn;
$("btnMainMenu").onclick = () => location.reload();
$("btnEndMenu").onclick = () => location.reload();
{
  const s = loadSave();
  $("btnContinue").disabled = !(s && s.flags && STAGES[s.flags.stage]);
}

// Menüde arkada köprü görünsün
applyFlags();
setZone("ship", 31, 0, -Math.PI / 2);
W.showWindowPlanet(PLANET_INFO.kizil.color);
W.warp.visible = false;
// Menü arkası: köprü camından gezegene yavaşça bakan kamera
visuals.push(() => {
  if (G.running) return;
  camera.position.set(37.5, 1.75, 2.2);
  camera.rotation.set(0.05, -Math.PI / 2 + 0.25 + Math.sin(performance.now() / 6000) * 0.08, 0);
});
fadeTo(0);
