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

// ---------------------------------------------------------------- elde alet görünümü, sallanma, geri tepme
const _shootBase = onShoot;
onShoot = () => holdingPick() ? swing() : _shootBase();
G.onGunFired = () => { recoil = 1; };
let oreHudT = 0;
visuals.push(dt => {
  swingCd = Math.max(0, swingCd - dt);
  const pick = holdingPick() && G.running;
  W.pickView.visible = pick;
  W.gunView.visible = player.gun && !pick;
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
