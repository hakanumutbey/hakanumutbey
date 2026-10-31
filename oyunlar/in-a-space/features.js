// IN A SPACE — Hakan'ın ikinci isteği listesi: uyanış sahnesi, seçmeli diyalog, mürettebatın kapsülden çıkıp iniş aracına
// yürümesi, kazmayla madencilik + atölye geliştirmeleri, elde alet değiştirme ve küçük animasyonlar.
// engine.js / world.js / story.js'ten sonra yüklenir; oradaki fonksiyonları kullanır, birkaçını sarar.
"use strict";

// ---------------------------------------------------------------- seçmeli diyalog
// ask(kim, soru, [{ t: seçenek, reply: [[kim, söz], ...], fx: () => {} }]) — karşıdakinin cevabı seçime göre değişir.
// Sıradaki altyazılar bitince açılır; 1/2/3 ya da tıklayarak seçilir. Testte (G.autoChoose) ilk seçenek kendiliğinden seçilir.
const askQueue = [];
let askOpen = null;
G.autoChoose = TEST;
function ask(who, text, opts) {
  if (G.autoChoose) { say([[who, text]]); return chooseOpt({ who, text, opts }, 0); }
  askQueue.push({ who, text, opts });
}
function openAsk(a) {
  askOpen = a;
  $("choiceWho").textContent = a.who;
  $("choiceText").textContent = a.text;
  const box = $("choiceOpts");
  box.innerHTML = "";
  a.opts.forEach((o, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.innerHTML = `<span class="n">${i + 1}</span>`;
    b.appendChild(document.createTextNode(o.t));
    b.onclick = () => pickAsk(i);
    box.appendChild(b);
  });
  $("subtitle").style.display = "none";
  openUI("choiceBox");
  talkAnim(a.who, 2.5);
  sfx("choice");
}
function pickAsk(i) {
  const a = askOpen;
  if (!a || !a.opts[i]) return;
  askOpen = null;
  closeUI();
  chooseOpt(a, i);
}
function chooseOpt(a, i) {
  const o = a.opts[i];
  sfx("click");
  G.lastChoice = o.t;
  if (o.reply) say(o.reply);
  if (o.fx) o.fx();
}
visuals.push(() => {
  // Esc ile kapatıldıysa soru iptal
  if (askOpen && G.uiOpen !== "choiceBox") askOpen = null;
  // Bir önceki konuşma bitince sıradaki soruyu aç
  if (!askOpen && askQueue.length && G.running && !G.uiOpen && !player.dead && !G.cutscene && sayQueue.length === 0 && sayTimer < 0.6)
    openAsk(askQueue.shift());
});
addEventListener("keydown", e => {
  if (G.uiOpen === "choiceBox" && /^Digit[1-3]$/.test(e.code)) pickAsk(+e.code.slice(5) - 1);
});

// Konuşan mürettebatın ağzı oynar
const personByName = {};
function talkAnim(who, sec) {
  const p = personByName[who];
  if (p) for (const m of p) if (m.visible && m.userData.rig) m.userData.rig.talkT = sec;
}
G.onSayLine = (who, sec) => talkAnim(who, sec);

// ---------------------------------------------------------------- mürettebatla konuşmalar
const CREW_TALK = {
  arda: ["Kaptanım! Bugün nereye uçuyoruz?", [
    ["Gemi topunu anlat.", "Topu ben ayarladım; artık daha hızlı ateş ediyor. Meteorlar kaçamaz!"],
    ["Uzaylı ana gemisini gördün mü?", "Gördüm… dev gibiydi. Ama biz ondan daha cesuruz."],
    ["Bir şaka yap Arda.", "Uzaylı neden partiye gelmemiş? Ortam fazla 'uzay'mış! …Tamam, kötüydü."]]],
  elif: ["Nasılsın? Bir yerin acıyor mu?", [
    ["Beni iyileştir.", "Kıpırdama… tamam, turp gibisin!", () => { player.health = player.maxHealth; sfx("pickup"); }],
    ["Madenlerle ne yapabilirim?", "Hava kilidindeki atölyede kalp kabı yapabilirsin. Demirle altın lazım."],
    ["Kaan nasıl?", "Kaan iyileşti, Dünya'da bizi bekliyor."]]],
  deniz: ["Motorlar mırıl mırıl! Ne lazım?", [
    ["Hangi maden nerede?", "Altın sıcak gezegenlerde, buz kristali soğuklarda. Elmas her yerde ama çok nadir!"],
    ["Oksijen tüpümü anlat.", "Tüpünü büyüttüm; dışarıda daha uzun kalırsın. Atölyede daha da büyütebilirsin."],
    ["Bu gemi dağılır mı?", "Dağılmaz! …herhalde. Sigortalara dikkat et."]]],
  mert: ["Gemiyi eve getirdin, yolcu.", [
    ["Teşekkürler kaptan.", "ARGO-7'nin kaptanı artık sensin."],
    ["Neden beni en son uyandırdınız?", "Çünkü en cesurumuz sendin. Son ana kadar seni sakladık."],
    ["Sıradaki görev ne?", "Gökyüzü kocaman. Gemi hazır olunca yine uçarsın."]]],
  kaan: ["O yumurtalar… gerçekten özür dilerim.", [
    ["Önemli değil Kaan.", "Sağ ol… Bir daha mor gezegene gitmem!"],
    ["Bir daha yapma!", "Söz! Artık sadece taş topluyorum."],
    ["Yumurtalar nasıldı?", "Yeşil, yapış yapış… ve tıkırdıyorlardı. Brr."]]],
  zeynep: ["Sıcak çorba hazır! İster misin?", [
    ["Çorba ver!", "Afiyet olsun! Uzayın en güzel şeyi sıcak çorbadır.", () => { player.health = player.maxHealth; sfx("pickup"); }],
    ["Ne ekiyorsun?", "Mavi meyvelerden tohum getirdim, buraya ekeceğim."],
    ["Hiç acıkmadım.", "Olmaz öyle şey! Bir kaşık bari."]]]
};
function crewTalk(id) {
  const c = CREW[id], [q, opts] = CREW_TALK[id];
  ask(c.name, q, opts.map(([t, r, fx]) => ({ t, reply: [[c.name, r]], fx })));
}
for (const id in CREW) {
  const c = CREW[id];
  personByName[c.name] = [c.shipMesh, c.earthMesh].filter(Boolean);
  for (const it of [G.I["talk_ship_" + id], G.I["talk_earth_" + id]]) if (it) it.act = () => crewTalk(id);
}

// ---------------------------------------------------------------- uyanış sahnesi
// Kapsülde sırtüstü uyanırsın: kalp atışı, göz kapakları kırpışarak açılır, buzlu cam ve bulanıklık kaybolur,
// doğrulup ayağa kalkarsın; sonra NOVA ile ilk (seçmeli) konuşma.
function wakeTalk() {
  ask("NOVA", "Uyandırma protokolü tamamlandı. Merhaba, yolcu. Ben NOVA, ARGO-7'nin yapay zekâsıyım.", [
    { t: "Neredeyim?", reply: [["NOVA", "ARGO-7 gemisindesin, kriyo odasında. Çok uzun uyudun."]] },
    { t: "Mürettebat nerede?", reply: [["NOVA", "Gemide senden başka kimse yok… Not defterlerinde bir şeyler olmalı."]] },
    { t: "Beş dakika daha uyuyayım…", reply: [["NOVA", "Olmaz! Üç yıl uyudun zaten. Kalk bakalım, yolcu."]] }
  ]);
  if (G.autoChoose) nova("Lütfen köprüye gel. Koridorun doğu ucu.");
  else askQueue.push({ who: "NOVA", text: "Lütfen köprüye gel, koridorun doğu ucu. Hazır mısın?", opts: [
    { t: "Hazırım!", reply: [["NOVA", "Harika. Kapılar senin için açılacak."]] },
    { t: "Ya uzaylı varsa?", reply: [["NOVA", "Şimdilik sensörlerim temiz. Ama gözünü dört aç."]] }
  ] });
}
let wake = null;
function wakeUp() {
  if (TEST) return wakeTalk();
  wake = { t: 0, yaw: player.yaw, beats: 0, hissed: false };
  G.cutscene = true;
  $("lids").style.display = "block";
  setLids(0);
  $("frost").style.opacity = 0.85;
  canvas.style.filter = "blur(10px)";
}
function setLids(open) {
  const h = 50 * (1 - Math.max(0, Math.min(1, open)));
  $("lidTop").style.height = h + "%";
  $("lidBot").style.height = h + "%";
}
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const span = (t, a, b) => ease((t - a) / (b - a));
visuals.push(dt => {
  if (!wake) return;
  const w = wake;
  w.t += dt;
  const t = w.t;
  document.body.classList.remove("playing");   // uyanırken gösterge yok
  if (w.beats < 3 && t > 0.3 + w.beats * 0.9) { sfx("heartbeat"); w.beats++; }
  // göz kapakları: aralanır, kapanır, yarı açılır, kırpar, tam açılır
  let lid = 0;
  if (t < 1.3) lid = 0;
  else if (t < 1.8) lid = span(t, 1.3, 1.6) * 0.25;
  else if (t < 2.3) lid = 0.25 * (1 - span(t, 1.8, 2.0));
  else if (t < 3.0) lid = span(t, 2.3, 2.7) * 0.55;
  else if (t < 3.3) lid = 0.55 * (1 - span(t, 3.0, 3.12)) + 0.55 * span(t, 3.15, 3.3);
  else lid = 0.55 + 0.45 * span(t, 3.3, 4.6);
  setLids(lid);
  canvas.style.filter = `blur(${(10 * (1 - span(t, 3.2, 6.2))).toFixed(1)}px)`;
  $("frost").style.opacity = (0.85 * (1 - span(t, 3.6, 5.6))).toFixed(2);
  if (!w.hissed && t > 3.6) { w.hissed = true; sfx("hiss"); }
  // sırtüstü → doğrulma → ayağa kalkma (kamera tavana bakarken iner)
  const up = span(t, 4.6, 7.0);
  player.pitch = 1.25 * (1 - up) + Math.sin(t * 1.3) * 0.03 * (1 - up);
  player.yaw = w.yaw + Math.sin(t * 0.7) * 0.06 * (1 - up);
  player.eye = 0.95 + 0.75 * up;
  if (t > 7.2) {
    wake = null;
    G.cutscene = false;
    player.eye = 1.7;
    player.pitch = 0;
    canvas.style.filter = "";
    $("frost").style.opacity = 0;
    $("lids").style.display = "none";
    document.body.classList.add("playing");
    showBanner("ARGO-7", "KRİYO ODASI", true);
    wakeTalk();
  }
});

// ---------------------------------------------------------------- mürettebat kapsülden çıkar, iniş aracına yürür
const RESCUE = { arda: "kum", elif: "bataklik", deniz: "kristal" };
const walkers = [];
function podMesh(id) {
  const c = CREW[id], P = W.planets[RESCUE[id]];
  if (!c.podMesh) {
    c.podMesh = W.placePerson(P.zone, W.makePerson(c.suit, 0xf0c8a0, c.hair), 0, 0, Math.PI);
    c.podMesh.visible = false;
    personByName[c.name].push(c.podMesh);
  }
  return c.podMesh;
}
// mode: "walk" (çık, el salla, iniş aracına yürü) · "sit" (çık, yanına otur — yaralı) · "stand" (oturduğu yerden kalk, yürü)
function crewExit(id, mode) {
  const pid = RESCUE[id], P = W.planets[pid], pod = W.pods[pid], m = podMesh(id), r = m.userData.rig;
  const px = pod.position.x, pz = pod.position.z;
  const w = { id, m, r, zone: P.zone, mode, t: 0, phase: mode === "stand" ? "stand" : "hatch", px, pz,
    path: [[0, 2.3], [0, 5.4]], hinge: pod.userData.hinge };
  if (mode !== "stand") {
    m.visible = false;
    r.sit = 0;
    sfx("podOpen");
  }
  for (let i = walkers.length - 1; i >= 0; i--) if (walkers[i].id === id) walkers.splice(i, 1);
  walkers.push(w);
}
function placeSitting(id) {
  const pid = RESCUE[id], pod = W.pods[pid], m = podMesh(id);
  W.pods[pid].userData.hinge.rotation.x = -1.7;
  m.position.set(pod.position.x + 0.9, W.planets[pid].h(pod.position.x + 0.9, pod.position.z + 2.3), pod.position.z + 2.3);
  m.rotation.y = Math.PI;
  m.userData.rig.sit = 1;
  m.visible = true;
}
function faceDir(m, dx, dz) { m.rotation.y = Math.atan2(-dx, -dz); }
visuals.push(dt => {
  for (let i = walkers.length - 1; i >= 0; i--) {
    const w = walkers[i], m = w.m, r = w.r, h = W.planets[RESCUE[w.id]].h;
    // Oyuncu gezegenden ayrıldıysa animasyonu bitir
    if (G.zone !== w.zone) {
      if (w.mode === "sit") placeSitting(w.id); else { m.visible = false; r.speed = 0; }
      walkers.splice(i, 1);
      continue;
    }
    w.t += dt;
    if (w.phase === "hatch") {
      w.hinge.rotation.x = -1.7 * ease(w.t / 0.7);
      if (w.t > 0.8) { w.phase = "out"; w.t = 0; m.visible = true; }
    } else if (w.phase === "out") {
      // kapaktan atlayıp öne çıkar
      const k = Math.min(1, w.t / 0.9), x = w.px + (w.mode === "sit" ? 0.9 * k : 0), z = w.pz + 0.6 + 1.7 * k;
      m.position.set(x, h(x, z) + 0.55 * (1 - k) + Math.sin(k * Math.PI) * 0.5, z);
      m.rotation.y = Math.PI;
      r.armL.rotation.x = r.armR.rotation.x = -1.2 * (1 - k);
      if (k >= 1) { w.phase = w.mode === "sit" ? "sitdown" : "wave"; w.t = 0; }
    } else if (w.phase === "sitdown") {
      r.sit = Math.min(1, w.t / 0.6);
      if (w.t > 0.6) { r.sit = 1; walkers.splice(i, 1); }
    } else if (w.phase === "stand") {
      r.sit = Math.max(0, 1 - w.t / 0.7);
      if (w.t > 0.8) { w.phase = "wave"; w.t = 0; }
    } else if (w.phase === "wave") {
      faceDir(m, player.pos.x - m.position.x, player.pos.z - m.position.z);
      r.wave = 0.2;
      if (w.t > 1.3) { w.phase = "walk"; w.t = 0; }
    } else if (w.phase === "walk") {
      const [tx, tz] = w.path[0], dx = tx - m.position.x, dz = tz - m.position.z, d = Math.hypot(dx, dz);
      const sp = 2.5;
      r.speed = sp;
      faceDir(m, dx, dz);
      if (d < sp * dt + 0.05) {
        w.path.shift();
        if (!w.path.length) { m.visible = false; r.speed = 0; walkers.splice(i, 1); continue; }
      } else {
        m.position.x += dx / d * sp * dt;
        m.position.z += dz / d * sp * dt;
      }
      // iniş aracının rampasından yukarı çık
      const onRamp = m.position.z > 2.2 && Math.abs(m.position.x) < 1;
      m.position.y = onRamp ? Math.min(0.55, (m.position.z - 2.2) * 0.35) : h(m.position.x, m.position.z);
    }
  }
});
function rescueTalk(id) {
  const c = CREW[id], n = c.name;
  const T = {
    arda: ["Kapak sıkışmıştı, sonunda! Seni gördüğüme çok sevindim.", [
      ["İyi misin Arda?", "Biraz başım dönüyor ama iyiyim. Uzaylılar kapsülleri bu sisteme çekti!"],
      ["Hadi, gemiye koş!", "Emredersin! Elif ve Deniz de buralarda bir yerde."],
      ["Seni bulmak çok zordu!", "Üç kuleyi çalıştırdın ha? Sen gerçek bir kahramansın!"]]],
    elif: ["Kimse gelmeyecek sanmıştım!", [
      ["Yaralı mısın?", "Bacağım yaralı, yürüyemiyorum. Revirdeki ilk yardım çantasını getirir misin?"],
      ["Uzaylıları temizledim.", "Gördüm, çok cesursun! Ama bacağım yaralı… Revirdeki ilk yardım çantası lazım."],
      ["Seni hemen kurtaracağım!", "Teşekkürler! Revirdeki ilk yardım çantasını getirirsen yürüyebilirim."]]],
    deniz: ["Işıklar yandı! Güç hücrelerini nereden buldun?", [
      ["Kristal Ay'ın her yerinden!", "Harika iş! Gemide giysini elden geçireceğim, söz."],
      ["Kristalleri tüfekle kırdım.", "O ses sendin demek! Gemide giysinin oksijen tüpünü büyüteceğim."],
      ["Hadi eve gidelim.", "Önce gemiye! Giysini de elden geçiririm, dışarıda daha uzun kalırsın."]]]
  }[id];
  ask(n, T[0], T[1].map(([t, rep]) => ({ t, reply: [[n, rep]] })));
}
// story.js'teki kapsül etkileşimlerine animasyonu ve seçmeli konuşmayı ekle
{
  const wrap = (iid, fn) => { const it = G.I[iid], old = it.act; it.act = () => { const before = JSON.stringify(G.flags); old(); fn(before !== JSON.stringify(G.flags)); }; };
  wrap("pod_kum", changed => { if (changed && f().arda_found) { sayQueue.length = 0; crewExit("arda", "walk"); rescueTalk("arda"); } });
  wrap("pod_batak", changed => {
    if (!changed) return;
    if (f().elif_healed) crewExit("elif", "stand");
    else if (f().elif_found) { sayQueue.length = 0; crewExit("elif", "sit"); rescueTalk("elif"); }
  });
  wrap("pod_kristal", changed => { if (changed && f().deniz_found) { sayQueue.length = 0; crewExit("deniz", "walk"); rescueTalk("deniz"); } });
}

// ---------------------------------------------------------------- madencilik
const ORE_KEYS = ["demir", "buz", "altin", "elmas"];
const ORE_REGROW = 600;   // kazılan damar 10 dakika (oyun saati) sonra yeniden çıkar: her dünyada hep bol maden
const oreBag = () => (f().ore = f().ore || { demir: 0, buz: 0, altin: 0, elmas: 0 });
const upLv = k => (f().up && f().up[k]) || 0;
const oreMined = o => G.flags[o.id] !== undefined && G.time - G.flags[o.id] < ORE_REGROW;
function syncOres() {
  for (const pid in W.planets) for (const o of W.planets[pid].ores || []) {
    const gone = oreMined(o);
    o.group.visible = !gone;
    o.col.on = !gone;
    if (!gone && G.flags[o.id] !== undefined) delete G.flags[o.id];
  }
}
let oreSyncT = 0;
updaters.push(dt => { oreSyncT -= dt; if (oreSyncT <= 0) { oreSyncT = 2; syncOres(); } });

// Elde alet: tüfek ya da kazma (Q değiştirir, 1 tüfek, 2 kazma)
G.tool = "gun";
function setTool(t) {
  if (t === "pick" && !f().pickaxe) return;
  if (t === "gun" && !player.gun) return;
  if (G.tool === t) return;
  G.tool = t;
  sfx("click");
  toast(t === "pick" ? "⛏️ Kazma elinde — sol tık ya da E: kaz" : "🔫 Tüfek elinde", 1300);
}
addEventListener("keydown", e => {
  if (G.uiOpen || !G.running || G.turret || e.repeat) return;
  if (e.code === "KeyQ") setTool(G.tool === "pick" ? "gun" : "pick");
  if (e.code === "Digit1") setTool("gun");
  if (e.code === "Digit2") setTool("pick");
});
const holdingPick = () => !!f().pickaxe && (G.tool === "pick" || !player.gun) && !G.turret;

let swingCd = 0, swingT = 0, recoil = 0;
function swing() {
  if (swingCd > 0 || G.cutscene || player.dead) return false;
  swingCd = 0.42;
  swingT = 0.42;
  sfx("swoosh");
  if (!G.admin) useStamina(2);
  // önündeki maden ya da yakın uzaylı
  const o = target && target.ore ? target.ore : null;
  if (o) { after(0.12, () => hitOre(o)); return true; }
  updateCamera(0);
  camera.getWorldDirection(_sd);
  for (const e of G.enemies) {
    if (e.zone !== G.zone || e.dead) continue;
    const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz);
    if (d < 2.3 * e.scale && (dx * _sd.x + dz * _sd.z) / d > 0.5) { after(0.12, () => damageAlien(e)); return true; }
  }
  return false;
}
function hitOre(o) {
  if (oreMined(o) || o.zone !== G.zone) return;
  o.hp++;
  shake = Math.max(shake, 0.12);
  sfx("pick");
  chips(o.pos, W.ORES[o.type].color, 6);
  o.group.rotation.y += 0.08;
  const need = Math.max(1, 3 - upLv("kazma"));
  if (o.hp < need) return;
  o.hp = 0;
  G.flags[o.id] = G.time;
  syncOres();
  const n = o.type === "elmas" ? 1 : o.type === "altin" ? 1 + (Math.random() < 0.5 ? 1 : 0) : 2 + (Math.random() < 0.4 ? 1 : 0);
  oreBag()[o.type] += n;
  chips(o.pos, W.ORES[o.type].color, 14);
  sfx("oreBreak");
  after(0.15, () => sfx("oreGet"));
  toast(`+${n} ${W.ORES[o.type].icon} ${W.ORES[o.type].name}`, 1600);
  if (!f().oreHint) { f().oreHint = true; nova("Güzel kazdın! Madenleri hava kilidindeki atölyede geliştirmeye çevirebilirsin."); }
  saveGame();
}
// Kazmanın uzaylıya vuruşu (yakın dövüş)
function damageAlien(e) {
  if (e.dead) return;
  e.hp--;
  e.hitT = 0.15;
  e.dormant = false;
  e.lastSeen = [player.pos.x, player.pos.z];
  sfx("pick");
  const dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z, d = Math.hypot(dx, dz) || 1;
  e.dodgeT = 0.2; e.dodgeDir = [dx / d, dz / d];
  if (e.hp <= 0) killAlien(e);
}

// kırılan taş parçacıkları
const chipGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09), chipList = [];
function chips(pos, color, n) {
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(chipGeo, mat);
    m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5));
    scene.add(m);
    chipList.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4), t: 0.9 });
  }
}
visuals.push(dt => {
  for (let i = chipList.length - 1; i >= 0; i--) {
    const c = chipList[i];
    c.t -= dt;
    c.v.y -= 9 * dt;
    c.m.position.addScaledVector(c.v, dt);
    c.m.rotation.x += dt * 8; c.m.rotation.y += dt * 6;
    c.m.scale.setScalar(Math.max(0.01, c.t));
    if (c.t <= 0) { scene.remove(c.m); chipList.splice(i, 1); }
  }
});

// Madenler etkileşim noktası olarak: E ile de kazılır, kazma yoksa ipucu verir
for (const pid in W.planets) {
  for (const o of W.planets[pid].ores || []) {
    const it = addInteract(o.zone, {
      id: o.id, pos: o.pos, size: 0.8, r: 2.9,
      label: () => oreMined(o) ? null : f().pickaxe ? `Kaz: ${W.ORES[o.type].icon} ${W.ORES[o.type].name}` : `${W.ORES[o.type].name} damarı (kazma lazım)`,
      act: () => {
        if (!f().pickaxe) return toast("Kazma hava kilidindeki atölye tezgâhında.", 2400);
        if (G.tool !== "pick" && player.gun) setTool("pick");
        swing();
      }
    });
    it.ore = o;
  }
}
// Gemideki kazma ve atölye
addInteract(W.ship, {
  id: "pickaxe", pos: W.p.pickaxe, size: 0.5,
  label: () => f().pickaxe ? null : "Kazmayı al",
  act: () => {
    f().pickaxe = true;
    W.pickRack.visible = false;
    G.tool = "pick";
    sfx("pickup");
    showBanner("KAZMA", "GEZEGENLERDEKİ MADENLERİ KAZ · Q: ALET DEĞİŞTİR", true);
    saveGame();
  }
});
// Tüfeği alınca doğrudan eline geçer
{ const it = G.I.gun, old = it.act; it.act = () => { old(); if (player.gun) G.tool = "gun"; }; }
addInteract(W.ship, { id: "workbench", pos: W.p.workbench, size: 0.5, label: () => "Atölye: madenlerle geliştirme yap", act: () => openWorkshop() });

// İlk gezegene inişte ipucu
updaters.push(() => {
  if (f().pickHint || !G.zone || !G.zone.title || G.zone === W.ship || !W.planets[G.zone.name] || f().pickaxe) return;
  f().pickHint = true;
  later(9000, () => nova("Kayalarda parlak maden damarları var. Hava kilidindeki atölyeden kazmayı alırsan onları kazabilirsin."));
});

// ---------------------------------------------------------------- atölye geliştirmeleri
const UPGRADES = {
  kalp: { name: "❤️ Kalp Kabı", desc: "+1 kalp", max: 3, cost: l => ({ demir: 4 + 2 * l, altin: 1 + l }) },
  tup: { name: "🫧 Büyük Oksijen Tüpü", desc: "Giysinin oksijeni %15 daha yavaş biter", max: 3, cost: l => ({ buz: 3 + 2 * l, demir: 2 + l }) },
  sogutucu: { name: "🧊 Tüfek Soğutucu", desc: "Tüfek %20 daha az ısınır", max: 3, cost: l => ({ demir: 3 + l, buz: 1 + l, elmas: l }) },
  jet: { name: "🚀 Jetpack Motoru", desc: "Süzülürken %25 daha az dayanıklılık", max: 3, cost: l => ({ altin: 2 + l, buz: 2 }) },
  kazma: { name: "⛏️ Elmas Uçlu Kazma", desc: "Madenler daha az vuruşta kırılır", max: 2, cost: l => ({ demir: 3 + 2 * l, elmas: 1 + l }) }
};
function canPay(cost) { const b = oreBag(); return Object.keys(cost).every(k => (b[k] || 0) >= cost[k]); }
function buyUpgrade(k) {
  const U = UPGRADES[k], l = upLv(k);
  if (l >= U.max) return false;
  const cost = U.cost(l);
  if (!canPay(cost)) { sfx("wrong"); return false; }
  const b = oreBag();
  for (const o in cost) b[o] -= cost[o];
  f().up = f().up || {};
  f().up[k] = l + 1;
  syncActs();
  if (k === "kalp") player.health = player.maxHealth;
  sfx("upgrade");
  toast(`${U.name} — seviye ${l + 1}!`, 2000);
  saveGame();
  renderWorkshop();
  return true;
}
const costText = cost => Object.keys(cost).filter(k => cost[k] > 0).map(k => `${W.ORES[k].icon} ${cost[k]}`).join("  ");
function renderWorkshop() {
  const b = oreBag();
  $("wsOres").innerHTML = ORE_KEYS.map(k => `<span>${W.ORES[k].icon} ${W.ORES[k].name}: <b>${b[k] || 0}</b></span>`).join("");
  const list = $("wsList");
  list.innerHTML = "";
  for (const k in UPGRADES) {
    const U = UPGRADES[k], l = upLv(k), maxed = l >= U.max, cost = maxed ? null : U.cost(l);
    const row = document.createElement("div");
    row.className = "wsRow";
    row.innerHTML = `<div><b>${U.name}</b> <span class="lv">${"◆".repeat(l)}${"◇".repeat(U.max - l)}</span><br><small>${U.desc}</small></div>`;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.id = "up_" + k;
    btn.textContent = maxed ? "Tamam" : costText(cost);
    btn.disabled = maxed || !canPay(cost);
    btn.onclick = () => buyUpgrade(k);
    row.appendChild(btn);
    list.appendChild(row);
  }
}
function openWorkshop() { renderWorkshop(); openUI("workshop"); }
$("btnWsClose").onclick = () => closeUI();

// Geliştirmelerin etkisi: syncActs mürettebat ödüllerini kurar, üstüne atölye seviyeleri eklenir
{
  const base = syncActs;
  syncActs = function () {
    base();
    player.maxHealth += 20 * upLv("kalp");
    player.health = Math.min(player.health, player.maxHealth);
    player.o2Mult *= 1 - 0.15 * upLv("tup");
    G.heatMult = 1 - 0.2 * upLv("sogutucu");
    G.glideCost = 1 - 0.25 * upLv("jet");
    W.pickRack.visible = !f().pickaxe;
    syncOres();
    syncPodCrew();
  };
}
// Kapsül kapakları ve yaralı Elif kayıttan yüklenince de doğru dursun
function syncPodCrew() {
  const fl = G.flags;
  for (const id in RESCUE) {
    const found = !!fl[id + "_found"], pod = W.pods[RESCUE[id]];
    if (walkers.some(w => w.id === id)) continue;
    pod.userData.hinge.rotation.x = found ? -1.7 : 0;
    if (id === "elif" && found && !fl.elif_healed) placeSitting("elif");
    else if (CREW[id].podMesh) CREW[id].podMesh.visible = false;
  }
}

// ---------------------------------------------------------------- admin: istediğin yere anında atla (J)
// Hakan: "istediğimiz yere anında atlayabildiğimiz: bir felaket olayına, bir dünyaya, birini kurtardığımız ana".
// Her durak o ana kadarki hikâye bayraklarını kurar, bölümü başlatır ve oyuncuyu yerine koyar. Kazma, madenler ve
// atölye geliştirmeleri atlarken korunur.
const ALL = (prefix, n) => Object.fromEntries([...Array(n)].map((_, i) => [prefix + i, true]));
const J = {};
J.p1 = { powerFixed: true, fuseTaken: true, fuseIn: true };
J.p2 = { breach: true, sealed: true, welded: true };
J.gun = { gun: true, armoryOpen: true, code: true };
J.cores = { cores: 3, core_kizil: true, core_buz: true, core_mor: true };
J.logs = { log1: true, log2: true, log3: true, log4: true, log5: true, log6: true };
J.a2 = Object.assign({}, J.cores, J.p1, J.p2, J.gun, J.logs, { attackDone: true, act: 2 });
J.arda = Object.assign(ALL("tower_kum_", 3), { arda_found: true, crew_arda: true, kumgorev_done: true });
J.elif = { elif_found: true, medkit: true, elif_healed: true, crew_elif: true, batakgorev_done: true };
J.deniz = Object.assign(ALL("cell_", 3), ALL("cblock_", 4), { deniz_found: true, crew_deniz: true, kristalgorev_done: true, act: 3 });
J.ana = Object.assign(ALL("node_", 3), { core_sabotaged: true, mother_escaped: true, anagemi_done: true, act: 4 });
J.ay = Object.assign(ALL("fuel_", 3), { relay: true, aygorev_done: true });
J.free = { finalDone: true, met_crew: true, dunyainis_done: true, free: true };
const upTo = (...parts) => Object.assign({}, ...parts.map(p => J[p] || p));
const pod = id => { const p = W.pods[RESCUE[id]].position; return [p.x, p.z + 5, 0]; };
const JUMPS = [
  ["📖 Bölümler", [
    ["Uyanış (yeni oyun)", { newGame: true }],
    ["Kızıl Gezegen", { flags: upTo("p1", { at: "kizil" }), stage: "gezegen1", planet: "kizil" }],
    ["Buz Gezegeni", { flags: upTo("p1", "p2", { cores: 1, core_kizil: true, at: "buz" }), stage: "gezegen2", planet: "buz" }],
    ["Mor Gezegen", { flags: upTo("p1", "p2", "gun", { cores: 2, core_kizil: true, core_buz: true, attackDone: true, at: "mor" }), stage: "gezegen3", planet: "mor" }],
    ["Rota sapması (2. perde)", { flags: upTo("cores", "p1", "p2", "gun", { attackDone: true }), stage: "sapma", ship: [35, 0, Math.PI / 2] }],
    ["Uzaylı ana gemisi (3. perde)", { flags: upTo("a2", "arda", "elif", "deniz"), stage: "anagemi", planet: "anagemi" }],
    ["Ay üssü (4. perde)", { flags: upTo("a2", "arda", "elif", "deniz", "ana"), stage: "aygorev", planet: "ay" }],
    ["Dünya'ya iniş", { flags: upTo("a2", "arda", "elif", "deniz", "ana", "ay", { finalDone: true }), stage: "dunyainis", planet: "dunya" }],
    ["Serbest uçuş (oyun sonu)", { flags: upTo("a2", "arda", "elif", "deniz", "ana", "ay", "free"), stage: "serbest", ship: [35, 0, Math.PI / 2] }]]],
  ["🔥 Felaketler", [
    ["Elektrik kesintisi", { flags: {}, stage: "elektrik", ship: [-18, 0, Math.PI / 2] }],
    ["Gövde deliği", { flags: upTo("p1", { cores: 1, core_kizil: true }), stage: "delik", ship: [16, 0, Math.PI / 2] }],
    ["Uzaylı saldırısı", { flags: upTo("p1", "p2", "gun", { cores: 2, core_kizil: true, core_buz: true }), stage: "saldiri", ship: [22, 0, Math.PI / 2] }],
    ["Meteor yağmuru", { flags: upTo("a2", "arda", "elif", "deniz", "ana", { travelDest: "ay" }), stage: "meteor", ship: [35, 0, -Math.PI / 2] }],
    ["Son saldırı (dev uzaylı)", { flags: upTo("a2", "arda", "elif", "deniz", "ana", "ay", { travelDest: "dunya" }), stage: "finalsaldiri", ship: [30, 0, Math.PI / 2] }]]],
  ["🧑‍🚀 Kurtarmalar", [
    ["Arda'nın kapsülü", { flags: upTo("a2", ALL("tower_kum_", 3)), stage: "kumgorev", planet: "kum", spot: () => pod("arda") }],
    ["Elif'in kapsülü", { flags: upTo("a2", "arda"), stage: "batakgorev", planet: "bataklik", spot: () => pod("elif") }],
    ["Elif'i tedavi et", { flags: upTo("a2", "arda", { elif_found: true, medkit: true }), stage: "batakgorev", planet: "bataklik", spot: () => pod("elif") }],
    ["Deniz'in kapsülü", { flags: upTo("a2", "arda", "elif", ALL("cell_", 3), ALL("cblock_", 4)), stage: "kristalgorev", planet: "kristal", spot: () => pod("deniz") }],
    ["Köyde mürettebat", { flags: upTo("a2", "arda", "elif", "deniz", "ana", "ay", "free"), stage: "serbest", planet: "dunya", spot: () => [0, -72, 0] }]]],
  ["🪐 Dünyalar", Object.keys(W.planets).map(pid => [W.planets[pid].name,
    { flags: upTo("a2", "arda", "elif", "deniz", "ana", "ay", "free", { at: pid }), stage: "serbest", planet: pid }])]
];
// Kayaya/duvara denk gelmeyen en yakın boş nokta
function freeSpot(zone, x, z) {
  if (!blockedAt(zone, x, z, 0.5)) return [x, z];
  for (let r = 0.5; r < 12; r += 0.5) for (let a = 0; a < Math.PI * 2; a += 0.4) {
    const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
    if (!blockedAt(zone, nx, nz, 0.5)) return [nx, nz];
  }
  return [x, z];
}
function adminJump(label, cp) {
  closeUI();
  // sürmekte olan sahne, soru ve konuşmalar biter
  if (exitSt) endExit();
  wake = null;
  G.cutscene = false;
  canvas.style.filter = "";
  $("lids").style.display = "none";
  $("frost").style.opacity = 0;
  askQueue.length = 0;
  sayQueue.length = 0;
  $("deathScreen").style.display = "none";
  $("endScreen").style.display = "none";
  if (cp.newGame) return startNewGame();
  const keep = {};
  for (const k of ["pickaxe", "ore", "up", "oreHint", "pickHint"]) if (G.flags[k] !== undefined) keep[k] = G.flags[k];
  G.flags = Object.assign({ cores: 0 }, cp.flags, keep);
  G.travel = null;
  G.ended = false;
  resetPlayer();
  clearAliens(null);
  applyFlags();
  const s = cp.ship || [35, 0, Math.PI / 2];
  setZone("ship", s[0], s[1], s[2]);
  goStage(cp.stage, {});
  if (cp.planet) {
    const Z = G.zones[cp.planet];
    const sp = cp.spot ? cp.spot() : [Z.spawn[0], Z.spawn[2] === 0 ? 1.5 : Z.spawn[2], cp.planet === "anagemi" ? -Math.PI / 2 : 0];
    const [x, z] = freeSpot(Z, sp[0], sp[1]);
    player.suit = !!Z.vacuum || cp.planet === "anagemi";
    player.suitO2 = 100;
    W.suitMesh.visible = !player.suit;
    setZone(cp.planet, x, z, sp[2]);
    resetCans(cp.planet);
  }
  beginPlay();
  showBanner("ADMİN", label.toLocaleUpperCase("tr"), true);
  sfx("warp");
  saveGame();
}
function openAdminJump() {
  const box = $("ajList");
  box.innerHTML = "";
  for (const [group, items] of JUMPS) {
    const h = document.createElement("h3");
    h.textContent = group;
    const grid = document.createElement("div");
    grid.className = "ajGrid";
    for (const [label, cp] of items) {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = label;
      b.onclick = () => adminJump(label, cp);
      grid.appendChild(b);
    }
    box.append(h, grid);
  }
  openUI("adminJump");
}
$("btnAjClose").onclick = () => closeUI();
$("btnAdminJump").onclick = () => { closeUI(); openAdminJump(); };
addEventListener("keydown", e => {
  if (e.code !== "KeyJ" || e.repeat || !G.running || !G.admin) return;
  if (G.uiOpen === "adminJump") closeUI();
  else if (!G.uiOpen || G.uiOpen === "pauseMenu") { if (G.uiOpen) closeUI(); openAdminJump(); }
});
visuals.push(() => { $("btnAdminJump").style.display = G.admin ? "inline-block" : "none"; });

// ---------------------------------------------------------------- dışarı çıkma animasyonu
// Hava kilidi: kapıya yürü, sarı uyarı ışığı ve bip, hava boşalır (tıslama), yuvarlak kapak dönüp yana kayar, içinden geç.
// Gezegene çıkışta dışarıdan görüntü: iniş aracı ateş püskürterek iner, toz kalkar, sarsılarak konar; sonra rampadan yürüyerek inersin.
SFX.clank = () => { tone(180, 0.18, "square", 0.08, -40); noise(0.12, 0.12, 2000); };
SFX.rumble = () => { noise(2.6, 0.16, 300); tone(48, 2.4, "sawtooth", 0.05, 30); };
SFX.thump = () => { tone(55, 0.5, "sine", 0.45, -25); noise(0.6, 0.3, 500); };
let exitSt = null;
function exitAnim(t, fn) {
  if (TEST) return transition(fn);
  exitSt = { t: 0, phase: "lock", target: t, fn, x0: player.pos.x, z0: player.pos.z, yaw0: player.yaw, pitch0: player.pitch, beeps: 0, hissed: false, clanked: false };
  G.cutscene = true;
  document.body.classList.remove("playing");
  showBanner("HAVA KİLİDİ", "BASINÇ BOŞALTILIYOR", true);
}
function landerFx(P) {
  if (P.flame) return P.flame;
  const g = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.85, depthWrite: false }));
  cone.rotation.x = Math.PI; cone.position.y = -1.3;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: CLOUD_TEX, color: 0xffc070, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
  glow.scale.set(5, 5, 1); glow.position.y = -1;
  g.add(cone, glow);
  const dust = new THREE.Sprite(new THREE.SpriteMaterial({ map: CLOUD_TEX, color: 0xd6c3a0, transparent: true, opacity: 0, depthWrite: false }));
  P.zone.group.add(g, dust);
  P.flame = g; P.dust = dust; P.cone = cone;
  return g;
}
function setLanderY(P, dy) { for (const m of P.landerParts) m.position.y = m.userData.y0 + dy; }
visuals.push(dt => {
  const e = exitSt;
  if (!e) return;
  e.t += dt;
  const t = e.t, amber = $("airlockTint");
  if (e.phase === "lock") {
    // kapının önüne geç, kapıya dön
    const k = ease(t / 0.9);
    player.pos.x = e.x0 + (5 - e.x0) * k;
    player.pos.z = e.z0 + (8.5 - e.z0) * k;
    let dyaw = Math.PI - e.yaw0; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    player.yaw = e.yaw0 + dyaw * k;
    player.pitch = e.pitch0 * (1 - k);
    amber.style.opacity = (0.12 + 0.12 * Math.sin(t * 9)).toFixed(2);
    if (e.beeps < 3 && t > 0.2 + e.beeps * 0.4) { sfx("beep"); e.beeps++; }
    if (!e.hissed && t > 1.1) { e.hissed = true; sfx("hiss"); setTimeout(() => sfx("hiss"), 500); shake = 0.25; }
    // kapak döner (kilit açılır), sonra yana kayar
    W.hatchDoor.rotation.z = -Math.PI * 1.5 * ease((t - 1.3) / 1.0);
    if (!e.clanked && t > 2.3) { e.clanked = true; sfx("clank"); shake = 0.3; }
    W.hatchDoor.position.x = 5 + 1.9 * ease((t - 2.3) / 0.6);
    if (t > 2.9) player.pos.z = 8.5 + 1.1 * ease((t - 2.9) / 0.7);
    if (t > 3.0 && !e.faded) { e.faded = true; fadeTo(1); }
    if (t > 3.7) {
      amber.style.opacity = 0;
      e.fn();
      W.hatchDoor.rotation.z = 0;
      W.hatchDoor.position.x = 5;
      const P = W.planets[e.target];
      e.t = 0;
      if (P && P.landerParts && P.landerParts.length) {
        e.phase = "land"; e.P = P;
        landerFx(P);
        $("helmet").style.display = "none";
        const h0 = P.h(10, 13);
        G.camOverride = cam => {
          cam.position.set(10, h0 + 3.2, 14);
          cam.lookAt(0, 2.2 + e.dy * 0.7, 6.5);
          if (shake > 0) { cam.position.x += (Math.random() - 0.5) * shake * 0.2; cam.position.y += (Math.random() - 0.5) * shake * 0.2; shake = Math.max(0, shake - 0.03); }
        };
        e.dy = 24;
        setLanderY(P, e.dy);
        fadeTo(0);
        sfx("rumble");
      } else { e.phase = "out"; fadeTo(0); }
    }
  } else if (e.phase === "land") {
    const P = e.P, k = Math.min(1, t / 3.0);
    e.dy = 24 * Math.pow(1 - k, 2);
    setLanderY(P, e.dy);
    const on = k < 1;
    P.flame.visible = on;
    P.flame.position.set(0, 0.4 + e.dy, 6.5);
    P.cone.scale.set(1, 0.7 + Math.random() * 0.5 + (1 - k), 1);
    // yere yaklaşınca toz bulutu
    const near = Math.max(0, 1 - e.dy / 7);
    P.dust.position.set(0, P.h(0, 6.5) + 0.8, 6.5);
    P.dust.scale.set(4 + near * 10, 2 + near * 4, 1);
    P.dust.material.opacity = on ? near * 0.75 : Math.max(0, P.dust.material.opacity - dt * 0.6);
    if (!e.landed && k >= 1) { e.landed = true; sfx("thump"); shake = 1.2; }
    if (t > 3.7 && !e.faded2) { e.faded2 = true; fadeTo(1); }
    if (t > 4.3) {
      // rampanın başına geç, ilk şahısta aşağı yürü
      G.camOverride = null;
      P.flame.visible = false;
      P.dust.material.opacity = 0;
      $("helmet").style.display = player.suit ? "block" : "none";
      e.phase = "ramp"; e.t = 0;
      player.yaw = 0; player.pitch = -0.08;
      fadeTo(0);
    }
  } else if (e.phase === "ramp") {
    const P = e.P, k = ease(t / 1.4);
    player.pos.z = 3.6 - 2.1 * k;
    player.pos.x = 0;
    player.pos.y = Math.max(P.h(0, player.pos.z), 0.55 * (1 - k));
    bobT += dt * 9;
    if (t > 1.5) endExit();
  } else if (e.phase === "out") {
    if (t > 0.7) endExit();
  }
});
function endExit() {
  const e = exitSt;
  exitSt = null;
  G.camOverride = null;
  G.cutscene = false;
  player.vy = 0;
  player.onGround = true;
  document.body.classList.add("playing");
  $("airlockTint").style.opacity = 0;
  W.hatchDoor.rotation.z = 0;
  W.hatchDoor.position.x = 5;
  if (e && e.P) { setLanderY(e.P, 0); e.P.flame.visible = false; e.P.dust.material.opacity = 0; }
}

// ---------------------------------------------------------------- menü: Envanter · Ayarlar · Sistem
// Esc menüyü açar (son açık sekme), I ya da Tab doğrudan envanteri. ←/→ sekme değiştirir.
const MENU = { tab: "inv", cat: "alet", sel: 0 };
const INV_CATS = [["alet", "⚒️", "ALETLER"], ["maden", "⛏️", "MADENLER"], ["onemli", "🔑", "ÖNEMLİ EŞYALAR"], ["not", "📜", "NOT DEFTERLERİ"], ["gelisim", "⬆️", "GELİŞTİRMELER"]];
const LOG_TITLES = { log1: "NOVA — Bakım kaydı", log2: "Mühendis Deniz", log3: "Pilot Arda", log4: "Doktor Elif", log5: "Kaptan Mert", log6: "Aşçı Zeynep" };
function invItems(cat) {
  const fl = G.flags, b = oreBag(), it = [];
  if (cat === "alet") {
    if (player.gun) it.push({ icon: "🔫", name: "Plazma Tüfeği", eq: holdingPick() ? "" : "ELDE",
      desc: `Sol tık ile ateş eder. Çok hızlı ateş edersen ısınır, biraz beklemen gerekir.\nIsı: %${Math.round(player.heat)}${upLv("sogutucu") ? ` · Soğutucu seviye ${upLv("sogutucu")}` : ""}`,
      act: ["Eline al", () => { setTool("gun"); }] });
    if (fl.pickaxe) it.push({ icon: "⛏️", name: upLv("kazma") ? "Elmas Uçlu Kazma" : "Kazma", eq: holdingPick() ? "ELDE" : "",
      desc: `Gezegenlerdeki maden damarlarını kırar; uzaylılara yakından da vurabilirsin.\nBir damar ${Math.max(1, 3 - upLv("kazma"))} vuruşta kırılır.`,
      act: ["Eline al", () => { setTool("pick"); }] });
    it.push({ icon: "🔦", name: "El Feneri", count: Math.round(player.battery) + "%", desc: "F ile açılır, kapanır. Açıkken pil azalır; pil paketleri doldurur." });
    it.push({ icon: "🧑‍🚀", name: "Uzay Giysisi", eq: player.suit ? "GİYİLİ" : "", count: player.suit ? Math.round(player.suitO2) + "%" : "",
      desc: `Boşlukta hayatta kalmanı sağlar. Giysinin oksijeni azalır; gezegenlerdeki tüpler doldurur.\nHava kilidindeki dolapta durur.${upLv("tup") ? `\nBüyük tüp seviye ${upLv("tup")}` : ""}` });
  } else if (cat === "maden") {
    for (const k of ORE_KEYS) it.push({ icon: W.ORES[k].icon, name: W.ORES[k].name, count: "x" + (b[k] || 0), dim: !b[k],
      desc: { demir: "Her gezegende bol. Atölyede neredeyse her geliştirmede lazım.", buz: "Soğuk dünyalarda (Buz Gezegeni, Kristal Ay) bol bulunur.",
        altin: "Sıcak dünyalarda (Kızıl Gezegen, Kum Ayı, Mor Gezegen) parlar.", elmas: "Her gezegende ama çok nadir; damarı parlıyor. Güçlü geliştirmeler için." }[k] });
  } else if (cat === "onemli") {
    it.push({ icon: "⚡", name: "Enerji Çekirdekleri", count: (fl.cores || 0) + "/3", desc: "Hiper sürücü için. Üçü de takılınca eve atlayabilirsin." });
    it.push({ icon: "✦", name: "Yıldız Kristalleri", count: crystalsFound() + "/" + G.crystalTotal, desc: "Kaya sütunlarının tepesinde. Her biri dayanıklılık çarkını büyütür." });
    if (fl.code) it.push({ icon: "🔢", name: "Cephanelik Şifresi", desc: "Kaptan Mert'in notundan: 2719" });
    if (fl.medkit && !fl.elif_healed) it.push({ icon: "🩹", name: "İlk Yardım Çantası", desc: "Elif'in yaralı bacağı için. Zehir Bataklığı'ndaki kapsüle götür." });
    if (flagCount("cell_") && !fl.deniz_found) it.push({ icon: "🔋", name: "Güç Hücreleri", count: flagCount("cell_") + "/3", desc: "Deniz'in kapsülünü açmak için üç tane lazım." });
    if (flagCount("fuel_") && !fl.aygorev_done) it.push({ icon: "⛽", name: "Yakıt Hücreleri", count: flagCount("fuel_") + "/3", desc: "Ay üssünden. Eve dönüş yakıtı." });
  } else if (cat === "not") {
    for (const id in LOG_TITLES) if (fl[id]) it.push({ icon: "📜", name: LOG_TITLES[id], desc: "Okumak için seç.", act: ["Oku", () => { closeUI(); readLog(id); }] });
  } else if (cat === "gelisim") {
    for (const k in UPGRADES) {
      const U = UPGRADES[k], l = upLv(k);
      it.push({ icon: U.name.split(" ")[0], name: U.name.slice(U.name.indexOf(" ") + 1), lv: "◆".repeat(l) + "◇".repeat(U.max - l), dim: !l,
        desc: `${U.desc}.\nSeviye ${l}/${U.max}${l < U.max ? ` · Sonraki: ${costText(U.cost(l))}` : " · TAMAM"}\nHava kilidindeki atölyede yapılır.` });
    }
  }
  return it;
}
function renderMenu() {
  for (const b of document.querySelectorAll(".mt")) b.classList.toggle("on", b.dataset.tab === MENU.tab);
  for (const t of ["inv", "set", "sys"]) $("tab_" + t).classList.toggle("on", MENU.tab === t);
  const hearts = Math.ceil(player.maxHealth / 20), full = Math.ceil(Math.max(0, player.health) / 20);
  $("menuHearts").textContent = "♥".repeat(full) + "♡".repeat(Math.max(0, hearts - full));
  const b = oreBag();
  $("menuOre").innerHTML = ORE_KEYS.map(k => `<span>${W.ORES[k].icon} ${b[k] || 0}</span>`).join("");
  if (MENU.tab === "inv") renderInv();
}
function renderInv() {
  $("invCats").innerHTML = "";
  for (const [id, icon, name] of INV_CATS) {
    const c = document.createElement("div");
    c.className = "ic" + (MENU.cat === id ? " on" : "");
    c.textContent = icon;
    c.title = name;
    c.onclick = () => { MENU.cat = id; MENU.sel = 0; sfx("click"); renderInv(); };
    $("invCats").appendChild(c);
  }
  $("invCatName").textContent = INV_CATS.find(c => c[0] === MENU.cat)[2];
  const items = invItems(MENU.cat), grid = $("invGrid");
  MENU.sel = Math.min(MENU.sel, Math.max(0, items.length - 1));
  grid.innerHTML = "";
  for (let i = 0; i < Math.max(15, Math.ceil(items.length / 5) * 5); i++) {
    const it = items[i], s = document.createElement("div");
    if (!it) { s.className = "slot empty"; grid.appendChild(s); continue; }
    s.className = "slot" + (i === MENU.sel ? " sel" : "");
    if (it.dim) s.style.filter = "grayscale(0.8) brightness(0.7)";
    s.innerHTML = `<span>${it.icon}</span>${it.count ? `<span class="cnt">${it.count}</span>` : ""}${it.eq ? `<span class="eq">●</span>` : ""}${it.lv ? `<span class="lv">${it.lv}</span>` : ""}`;
    s.onclick = () => { MENU.sel = i; sfx("choice"); renderInv(); };
    grid.appendChild(s);
  }
  const it = items[MENU.sel];
  $("invName").textContent = it ? it.name : "Boş";
  $("invDesc").textContent = it ? it.desc : "Bu bölmede henüz bir şey yok.";
  $("invHave").innerHTML = it && it.count ? `Sende: <b>${it.count}</b>` : it && it.eq ? `<b style="color:var(--sheikah);font-size:15px">● ${it.eq}</b>` : "";
  const act = $("invAct");
  act.textContent = it && it.act ? it.act[0] : "";
  act.onclick = () => { if (it && it.act) { it.act[1](); sfx("pickup"); if (G.uiOpen === "pauseMenu") renderInv(); } };
}
for (const b of document.querySelectorAll(".mt")) b.onclick = () => { MENU.tab = b.dataset.tab; sfx("click"); renderMenu(); };
{
  const base = openUI;
  openUI = function (id) { base(id); if (id === "pauseMenu") renderMenu(); };
}
addEventListener("keydown", e => {
  if (G.uiOpen === "pauseMenu" && (e.code === "ArrowLeft" || e.code === "ArrowRight")) {
    const tabs = ["inv", "set", "sys"], i = tabs.indexOf(MENU.tab);
    MENU.tab = tabs[(i + (e.code === "ArrowRight" ? 1 : 2)) % 3];
    sfx("click");
    renderMenu();
  }
  if ((e.code === "KeyI" || e.code === "Tab") && !e.repeat && G.running) {
    e.preventDefault();
    if (G.uiOpen === "pauseMenu" && MENU.tab === "inv") closeUI();
    else if (!G.uiOpen && !G.cutscene && !player.dead) { MENU.tab = "inv"; openUI("pauseMenu"); }
  }
});
// Envanterin sağında dönen astronot (kendi küçük sahnesi)
let hero = null;
function heroScene() {
  const r = new THREE.WebGLRenderer({ canvas: $("invHero"), alpha: true, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  r.setSize(240, 400, false);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 240 / 400, 0.1, 50);
  cam.position.set(0, 1.15, 5.2);
  cam.lookAt(0, 1.0, 0);
  sc.add(new THREE.HemisphereLight(0xdff2ff, 0x2a2014, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(2, 4, 3); sc.add(sun);
  const mk = suit => {
    const p = W.makePerson(suit ? 0xe5e7eb : 0x2563eb, 0xf0c8a0, 0x3b2a1e);
    if (suit) {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: TOON, transparent: true, opacity: 0.35 }));
      helm.position.y = 0.02;
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 14, Math.PI * 0.75, Math.PI * 0.5, Math.PI * 0.3, Math.PI * 0.35), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.55 }));
      p.userData.rig.headG.add(helm, visor);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.22), new THREE.MeshToonMaterial({ color: 0xcbd5e1, gradientMap: TOON }));
      pack.position.set(0, 0.45, 0.32);
      p.userData.rig.torso.add(pack);
    }
    p.rotation.y = Math.PI;
    sc.add(p);
    return p;
  };
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.08, 32), new THREE.MeshBasicMaterial({ color: 0x4fd4ff, transparent: true, opacity: 0.18 }));
  sc.add(base);
  return { r, sc, cam, suitP: mk(true), plainP: mk(false), t: 0 };
}
visuals.push(dt => {
  document.body.classList.toggle("inMenu", G.uiOpen === "pauseMenu");
  if (G.uiOpen !== "pauseMenu" || MENU.tab !== "inv") return;
  if (!hero) hero = heroScene();
  hero.t += dt;
  hero.suitP.visible = player.suit; hero.plainP.visible = !player.suit;
  const p = player.suit ? hero.suitP : hero.plainP;
  p.rotation.y = Math.PI + Math.sin(hero.t * 0.6) * 0.7;
  W.animPerson(p, dt);
  hero.r.render(hero.sc, hero.cam);
});

// ---------------------------------------------------------------- ayarlar
const SET_ROWS = [
  ["Müzik sesi", "range", "music", 0, 1, 0.05, v => { if (music.out && music.on) music.out.gain.value = v; }],
  ["Efekt sesleri", "range", "sfx", 0, 1, 0.05, v => { if (sfxGain) sfxGain.gain.value = v; }],
  ["Fare hassasiyeti", "range", "sens", 0.6, 3, 0.1, v => { mouseSens = 0.0022 * v; }],
  ["Görüş alanı (FOV)", "range", "fov", 60, 95, 1, v => { camera.fov = v; camera.updateProjectionMatrix(); }],
  ["Grafik kalitesi", "seg", "quality", [["dusuk", "Düşük"], ["orta", "Orta"], ["yuksek", "Yüksek"]], v => {
    renderer.setPixelRatio(v === "dusuk" ? 0.65 : v === "orta" ? 1 : Math.min(devicePixelRatio || 1, 1.75));
    renderer.setSize(innerWidth, innerHeight);
  }, "Düşük: yavaş bilgisayarlarda daha akıcı"],
  ["Fareyi ters çevir", "seg", "invertY", [[false, "Kapalı"], [true, "Açık"]], () => {}, "Yukarı bakmak için fareyi aşağı çek"],
  ["Yürürken kafa sallanması", "seg", "bob", [[true, "Açık"], [false, "Kapalı"]], () => {}],
  ["Altyazı boyutu", "seg", "subSize", [["kucuk", "Küçük"], ["normal", "Normal"], ["buyuk", "Büyük"]], v => {
    document.body.classList.toggle("subS", v === "kucuk"); document.body.classList.toggle("subL", v === "buyuk");
  }]
];
function buildSettings() {
  const list = $("setList");
  list.innerHTML = "";
  for (const r of SET_ROWS) {
    const [name, kind, key] = r, apply = kind === "range" ? r[6] : r[4], note = kind === "range" ? r[7] : r[5];
    const row = document.createElement("div");
    row.className = "setRow";
    row.innerHTML = `<div class="nm">${name}${note ? `<small>${note}</small>` : ""}</div>`;
    const ctl = document.createElement("div");
    if (kind === "range") {
      const inp = document.createElement("input");
      Object.assign(inp, { type: "range", min: r[3], max: r[4], step: r[5], value: SET[key] });
      inp.id = "set_" + key;
      inp.oninput = () => { SET[key] = parseFloat(inp.value); apply(SET[key]); saveSettings(); };
      ctl.appendChild(inp);
    } else {
      ctl.className = "seg";
      for (const [val, label] of r[3]) {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.className = SET[key] === val ? "on" : "";
        btn.onclick = () => { SET[key] = val; apply(val); saveSettings(); sfx("click"); buildSettings(); };
        ctl.appendChild(btn);
      }
    }
    row.appendChild(ctl);
    list.appendChild(row);
  }
}
for (const r of SET_ROWS) r[r[1] === "range" ? 6 : 4](SET[r[2]]);
buildSettings();

// ---------------------------------------------------------------- uzay giysisi giyme animasyonu
// Dolaba dön → giysi sana doğru gelir → beyaz parlama (giyildi) → fermuar/kilit sesleri → kask camı yukarıdan iner,
// oksijen tıslaması. Çıkarırken kask kalkar.
let suitSt = null;
{
  const it = G.I.locker, old = it.act, home = W.suitMesh.position.clone();
  it.act = () => {
    if (suitSt) return;
    if (TEST) return old();
    suitSt = { t: 0, on: !player.suit, old, home, yaw0: player.yaw, pitch0: player.pitch, steps: 0 };
    G.cutscene = true;
  };
  visuals.push(dt => {
    const s = suitSt;
    if (!s) return;
    s.t += dt;
    const t = s.t, v = $("visor");
    if (s.on) {
      const look = ease(t / 0.45);
      const dx = W.p.locker[0] - player.pos.x, dz = W.p.locker[2] - player.pos.z;
      let dyaw = Math.atan2(-dx, -dz) - s.yaw0; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      if (t < 0.5) { player.yaw = s.yaw0 + dyaw * look; player.pitch = s.pitch0 * (1 - look) - 0.1 * look; }
      // giysi sana doğru süzülür
      const k = ease((t - 0.45) / 0.75);
      W.suitMesh.position.lerpVectors(s.home, new THREE.Vector3(player.pos.x, -0.2, player.pos.z), k);
      if (s.steps === 0 && t > 0.5) { s.steps++; sfx("swoosh"); }
      if (s.steps === 1 && t > 1.2) {
        s.steps++;
        s.old();                              // giysi giyildi (bayrak, toast)
        W.suitMesh.position.copy(s.home);
        $("helmet").style.display = "none";
        $("suitFlash").style.opacity = 0.9;
        sfx("clank");
      }
      if (t > 1.2) $("suitFlash").style.opacity = Math.max(0, 0.9 - (t - 1.2) * 2.2).toFixed(2);
      if (s.steps === 2 && t > 1.55) { s.steps++; sfx("click"); setTimeout(() => sfx("click"), 140); }
      // kask camı iner
      if (t > 1.7) { v.style.display = "block"; v.style.transform = `translateY(${(-100 * (1 - ease((t - 1.7) / 0.55))).toFixed(1)}%)`; }
      if (s.steps === 3 && t > 2.25) { s.steps++; sfx("clank"); shake = 0.2; setTimeout(() => sfx("hiss"), 120); }
      if (t > 2.6) {
        v.style.display = "none";
        $("helmet").style.display = "block";
        sfx("beep");
        showBanner("UZAY GİYSİSİ", "OKSİJEN %100", true);
        suitSt = null;
        G.cutscene = false;
      }
    } else {
      // çıkarma: kask camı kalkar, sonra giysi dolaba
      if (s.steps === 0) { s.steps++; sfx("hiss"); $("helmet").style.display = "none"; v.style.display = "block"; }
      v.style.transform = `translateY(${(-100 * ease(t / 0.5)).toFixed(1)}%)`;
      if (t > 0.6) { v.style.display = "none"; s.old(); suitSt = null; G.cutscene = false; }
    }
  });
}

// ---------------------------------------------------------------- elde alet görünümü, sallanma, geri tepme
const _shootBase = onShoot;
onShoot = () => holdingPick() ? swing() : _shootBase();
G.onGunFired = () => { recoil = 1; };
let oreHudT = 0;
visuals.push(dt => {
  swingCd = Math.max(0, swingCd - dt);
  const pick = holdingPick() && G.running && !G.camOverride;
  W.pickView.visible = pick;
  W.gunView.visible = player.gun && !pick && !G.camOverride;
  const walkBob = player.moving && player.onGround ? Math.sin(bobT) : 0;
  // kazma vuruşu: geri kalkar, öne iner
  swingT = Math.max(0, swingT - dt);
  const s = swingT > 0 ? 1 - swingT / 0.42 : 0;
  const piv = W.pickView.userData.pivot;
  piv.rotation.x = -0.35 + (s < 0.35 ? -0.9 * (s / 0.35) : -0.9 + 2.0 * Math.min(1, (s - 0.35) / 0.3)) * (swingT > 0 ? 1 : 0);
  W.pickView.position.set(0.3 + walkBob * 0.012, -0.42 + Math.abs(walkBob) * 0.015, -0.5);
  // tüfek geri tepmesi
  recoil = Math.max(0, recoil - dt * 7);
  W.gunView.position.set(0.28 + walkBob * 0.01, -0.25 + Math.abs(walkBob) * 0.012 + recoil * 0.02, -0.55 + recoil * 0.07);
  W.gunView.rotation.x = recoil * 0.18;
  // asit sıçraması
  G.acidFlash = Math.max(0, (G.acidFlash || 0) - dt * 1.6);
  $("acid").style.opacity = G.acidFlash;
  // maden çantası göstergesi
  oreHudT -= dt;
  if (oreHudT <= 0) {
    oreHudT = 0.25;
    const show = !!f().pickaxe;
    $("oreBar").style.display = show ? "flex" : "none";
    if (show) { const b = oreBag(); $("oreBar").innerHTML = ORE_KEYS.map(k => `<span>${W.ORES[k].icon} ${b[k] || 0}</span>`).join(""); }
  }
});
