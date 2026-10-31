// IN A SPACE 2 — hikâye, ikinci yarı: 9–22. bölümler, boss'lar (Grax, Zhal, Vorakh), uzay kovalamacası,
// seçimlere göre değişen sonlar, serbest dolaşma ve açılış menüsü. Seçimlerin listesi story.js başında.
"use strict";

// ---------------------------------------------------------------- yardımcılar: yer halkası, şok dalgası
function groundRing(x, z, r, color, life) {
  const zone = G.zone;
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 40), new THREE.MeshBasicMaterial({ color: color || 0xff5a2a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, groundAt(zone, x, z, player.pos.y + 1) + 0.08, z);
  zone.group.add(m);
  let t = 0;
  const ep = G.epoch;
  visuals.push(function f(dt) {
    t += dt;
    m.material.opacity = 0.35 + Math.abs(Math.sin(t * 10)) * 0.4;
    if (t > life || ep !== G.epoch) { zone.group.remove(m); visuals.splice(visuals.indexOf(f), 1); }
  });
  return m;
}
// Yerden yayılan halka: üstünden zıplanır (yerdeyken çarparsa can yakar)
function shockwave(x, z, maxR, speed, dmg, color) {
  const zone = G.zone;
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 6, 48), new THREE.MeshBasicMaterial({ color: color || 0xff7a2a }));
  m.rotation.x = Math.PI / 2;
  m.position.set(x, zone.ground(x, z) + 0.3, z);
  zone.group.add(m);
  let r = 1, hit = false;
  sfx("heavy");
  watch(dt => {
    r += speed * dt;
    m.scale.set(r, r, 1);
    const d = Math.hypot(player.pos.x - x, player.pos.z - z);
    const air = player.pos.y - groundAt(zone, player.pos.x, player.pos.z, player.pos.y) > 0.55;
    if (!hit && Math.abs(d - r) < 0.9 && !air) { hit = true; hurt(dmg, "Şok dalgası seni devirdi.", V3(x, 0, z)); }
    if (r > maxR) { zone.group.remove(m); return true; }
    return false;
  });
}
function bossBase(e, title) {
  e.boss = true; e.keep = true; e.title = title; e.alerted = true; e.armor = 1;
  G.boss = e;
  music("epic");
}
function faceP(e, dt, k) { e.yaw += wrapAngle(Math.atan2(-(player.pos.x - e.pos.x), -(player.pos.z - e.pos.z)) - e.yaw) * Math.min(1, dt * (k || 4)); }
const distP = e => Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
function lumiAid(sec) {
  // Lumi'ler arada şifa tohumu atar (köye yardım edildiyse)
  let t = sec;
  watch(dt => {
    if (!G.boss || G.boss.dead) return true;
    t -= dt;
    if (t <= 0) { t = sec; dropHealth(G.zone, player.pos.x + (Math.random() - 0.5) * 4, player.pos.z + (Math.random() - 0.5) * 4); toast("Lumi'ler şifa tohumu attı!", 1600); }
    return false;
  });
}
function selinAid() {
  // Selin yanındaysa ilk ölümde ayağa kaldırır
  G.flags.selinRevive = 1;
}
const _die = die;
die = function (reason) {
  if (G.flags.selinRevive && [15, 16, 17].includes(G.chapter)) {
    G.flags.selinRevive = 0;
    player.health = player.maxHealth * 0.5;
    player.invuln = 2;
    say([["Selin", "Kalk Kaptan! Seni bu kadar kolay bırakmam!"]]);
    flashWhite(200);
    return;
  }
  if (G.flags.milaGift && G.chapter === 21 && !G.flags.milaUsed) {
    G.flags.milaUsed = 1;
    player.health = player.maxHealth;
    player.invuln = 2;
    say([["Mila", "(Lumi kalbi parlıyor) ...dayan!"]]);
    flashWhite(300);
    return;
  }
  _die(reason);
};

// ================================================================ 9. PİLOT KEREM (Kızıl Kumlar) — SEÇİM: Ksha
function ch9() {
  showCampCrew();
  if (G.zone !== G.zones.tahra) setZone("tahra", 6, 12, Math.PI / 2);
  W.commProp && (W.commProp.visible = false);
  music("calm");
  const [kx, kz] = W.keremPod;
  checkpoint(() => setZone("tahra", kx + 30, kz, Math.PI / 2));
  goal("Kızıl Kumlar: Kerem'in kapsülüne git", kx, kz);
  later(1.5, () => say([["Kerem", "(telsiz) ...Kaptan? Kaptan! Sesini duymak ne güzel. Kapsülün kapısı sıkıştı ve dışarıda bir şeyler kapıyı tırmalıyor!"]]));
  onReach("tahra", kx, kz, 30, () => {
    say([["Kaptan", "Dayan Kerem, geliyorum!"], ["BİP", "Sıcaklık 46 derece. Bir de Vorak'lar. Harika bir tatil."]]);
    fight([
      [["hunter", kx + 8, kz + 6], ["hunter", kx - 8, kz + 4], ["shooter", kx, kz - 14, 0, 0.5]],
      [["brute", kx + 10, kz - 6], ["drone", kx - 10, kz - 8], ["drone", kx - 6, kz + 12, 0, 0.6]],
      [["stalker", kx + 14, kz + 10], ["hunter", kx - 14, kz - 4], ["hunter", kx + 2, kz + 16, 0, 0.4], ["shooter", kx - 6, kz - 18, 0, 0.8]]
    ], kshaScene, { between: i => say([["Kerem", ["Bir dalga daha geliyor, Kaptan!", "Son dalga! Sanırım... Umarım!"][i - 1] || "Dikkat!"]]) });
  });
}
function kshaScene() {
  const tahra = G.zones.tahra;
  const [kx, kz] = W.keremPod;
  const K = NPC.ksha;
  K.root.visible = true;
  K.root.position.set(kx - 6, tahra.ground(kx - 6, kz + 8), kz + 8);
  K.hips.rotation.x = 0.9; K.hips.position.y = 0.55;
  faceTo(K, player.pos.x, player.pos.z);
  K.st = {};
  goal("Yaralı Vorak'a yaklaş", kx - 6, kz + 8);
  say([["BİP", "Kaptan... şunlardan biri hâlâ yaşıyor. Gözleri mavi. Diğerlerininki turuncuydu."]]);
  onReach("tahra", kx - 6, kz + 8, 4.5, () => {
    const lookK = () => ({ pos: V3(player.pos.x + 2, player.pos.y + 1.8, player.pos.z + 2), look: K.root.position.clone().setY(K.root.position.y + 1) });
    cinematic([
      { wait: "say", cam: lookK, lines: [["Vorak", "Vrakk... thal... lütfen."], ["BİP", "Çeviri modülü... %71. Diyor ki: \"Ben Ksha. Ben ateş etmedim. Zhal ateş etti. Ben sadece... pilot.\""],
        ["BİP", "\"Zhal kaçanları öldürür. Ben kaçtım.\""]] },
      { wait: "choice", chosen: false, cam: lookK, start() {
        const self = this;
        ask(["\"Git. Ama bir daha karşıma düşman olarak çıkma.\"", "\"Gemimizi siz vurdunuz. Bu iş burada biter.\""], i => {
          if (i === 0) {
            G.flags.c_ksha = "spare";
            say([["Kaptan", "Git. Ama bir daha karşıma düşman olarak çıkma."], ["BİP", "\"Ksha unutmaz. Ksha borcunu öder. Kara Kale'nin kapısı... Ksha bilir.\""]], () => { self.chosen = true; });
            remember("Ksha bunu hatırlayacak.");
            later(2, () => { K.root.visible = false; sfx("warp"); });
          } else {
            G.flags.c_ksha = "kill";
            say([["Kaptan", "Gemimizi siz vurdunuz. Bu iş burada biter."], ["BİP", "...anlaşıldı Kaptan."]], () => { self.chosen = true; });
            remember("Bu seçimin bir bedeli olabilir.");
            later(1.2, () => { sfx("heavy"); flashWhite(80); K.root.visible = false; addScrap(40); acquired("Vorak kimlik kartı"); });
          }
        });
      } }
    ], openKerem);
  });
}
function openKerem() {
  const tahra = G.zones.tahra;
  const [kx, kz] = W.keremPod;
  goal("Kerem'in kapsülünü aç", kx, kz);
  addInteract(tahra, { pos: V3(kx, tahra.ground(kx, kz) + 1.2, kz - 1.6), r: 3.2, label: () => G.chapter === 9 && !G.flags.kerem ? "Kapsül kapısını zorla" : null, hold: 2, act: () => {
    G.flags.kerem = 1;
    sfx("hiss");
    const k = makeNPC(tahra, { helmet: false, skin: 0xd8a27a, hair: 0x1a1410 }, kx + 1.5, kz - 3, 0);
    faceTo(k, player.pos.x, player.pos.z);
    const kshaLine = G.flags.c_ksha === "kill"
      ? [["Kerem", "Camdan gördüm. O yaratık yalvarıyordu, Kaptan. Bilmiyorum... Belki doğrusu buydu."]]
      : [["Kerem", "Camdan gördüm, o yaralıyı bıraktın. Bilmiyorum akıllıca mıydı... ama insanca."]];
    talkChoice(k, [["Kerem", "Kaptan! Hah! Biliyordum, biliyordum geleceğini!"]].concat(kshaLine), [
      ["\"Seni merak ettim, Kerem. İyi misin?\"", [["Kerem", "Biraz ezik, biraz kızarmış. Ama uçabilirim. ATLAS'ı bana bırak."]], () => bond("kerem", 1)],
      ["\"Geciktin pilot. Kapsülünü yanlış yere indirmişsin.\"", [["Kerem", "Yanlış yer mi? Çölün TAM ortasına indim! Bu bir yetenek!"]], () => bond("kerem", -1)]
    ], () => {
      k.root.visible = false;
      showCampCrew();
      say([["Kerem", "Kampa gidiyorum, motoru incelerim. Selin ile Bora'yı bul!"], ["BİP", "Sıradaki sinyal kuzeydoğuda. Buzlu bir ova. Selin'in kapsülü."]], () => startChapter(10));
    });
  } });
}

// ================================================================ 10. DOKTOR SELİN (Ayaz Ovası)
function ch10() {
  showCampCrew();
  if (G.zone !== G.zones.tahra) setZone("tahra", 6, 12, Math.PI);
  music("calm");
  const [sx, sz] = W.selinPod;
  const tahra = G.zones.tahra;
  checkpoint(() => setZone("tahra", sx + 30, sz + 40, Math.PI));
  goal("Ayaz Ovası: Selin'in kapsülüne git", sx, sz);
  later(1.5, () => say([["BİP", "Kuzeydoğu çok soğuk: eksi otuz sekiz. Ateşlerin yanında ısın, yoksa giysi dayanmaz."]]));
  // soğuk: ateşten uzaktayken can yakar
  watch(dt => {
    if (G.zone !== tahra || G.admin) return false;
    const t = W.tahraTemp(player.pos.x, player.pos.z);
    if (t > -20) return false;
    const warm = W.fires.some(f => Math.hypot(player.pos.x - f.x, player.pos.z - f.z) < 7);
    if (warm) { heal(4 * dt); return false; }
    hurt(2.6 * dt, "Dondun.");
    tutorialOnce("cold", "SOĞUK", "Çok soğuk bölgelerde can azalır. <b>Ateşlerin</b> yanında ısın ve iyileş.");
    return false;
  });
  G.flags.selinTalked = 0;
  const selin = W.selinNpc || (W.selinNpc = makeNPC(tahra, { helmet: false, skin: 0xe0b08a, hair: 0x5a2a1a, hairStyle: "long" }, sx + 2, sz + 3, 0));
  selin.root.visible = true; selin.st.sit = true;
  const herbs = W.iceHerbs.map(([x, z], i) => {
    const m = W["herb" + i] || (W["herb" + i] = mesh(new THREE.ConeGeometry(0.3, 0.8, 6), glowMat(0x9fe6ff, 1.4), x, tahra.ground(x, z) + 0.4, z, tahra.group));
    m.visible = true;
    return { x, z, m, got: false };
  });
  onReach("tahra", sx, sz, 8, () => {
    talkChoice(selin, [["Selin", "Kaptan... Bacağım. Kapsül sert indi. Donmuş, kıramadım, yürüyemiyorum."],
                       ["Selin", "Bu ovada mavi parlayan otlar var. Üç tane getirirsen bir serum yapabilirim."]], [
      ["\"Seni kampa taşıyayım, sonra bakarız.\"", [["Selin", "Taşıyamazsın, bacağım bu soğukta kangren olur. Ot şart. Ama... teşekkürler."]], () => bond("selin", 1)],
      ["\"Otları getiriyorum. Kıpırdama.\"", [["Selin", "Nereye gideceğim ki? Kar tanelerini sayarım."]], () => bond("selin", 0)]
    ], () => {
      G.flags.selinTalked = 1;
      goal("Ayaz otu topla (0/3)", herbs[0].x, herbs[0].z);
      // her otun yanında bekçiler
      fight([[["hunter", herbs[0].x + 5, herbs[0].z + 3], ["hunter", herbs[0].x - 5, herbs[0].z - 2]]], null, { quiet: true });
      fight([[["stalker", herbs[1].x + 4, herbs[1].z], ["shooter", herbs[1].x - 8, herbs[1].z + 6]]], null, { quiet: true });
      fight([[["brute", herbs[2].x + 3, herbs[2].z + 4], ["drone", herbs[2].x - 6, herbs[2].z]]], null, { quiet: true });
    });
  });
  let got = 0;
  for (const h of herbs) addInteract(tahra, { pos: V3(h.x, tahra.ground(h.x, h.z) + 0.6, h.z), r: 2.6, label: () => G.chapter === 10 && !h.got && G.flags.selinTalked ? "Ayaz otunu topla" : null, act: () => {
    h.got = true; h.m.visible = false; got++; acquired(`Ayaz otu (${got}/3)`);
    const nxt = herbs.find(q => !q.got);
    if (nxt) goal(`Ayaz otu topla (${got}/3)`, nxt.x, nxt.z);
    else { goal("Otları Selin'e götür", sx, sz); onReach("tahra", sx, sz, 5, selinHeal); }
  } });
  function selinHeal() {
    talkChoice(selin, [["Selin", "Getirdin! Ver bakayım... Ezersin, karıştırırsın, iğneye çekersin. Tıp bu kadar kolay olsaydı keşke."],
                       ["Selin", "Bacağım için yeter. Kalanından sana da bir serum yaptım. Kalbini güçlendirir."]], [
      ["\"Sen olmasan ne yapardık Selin.\"", [["Selin", "Ölürdünüz. Ama kibar olduğun için teşekkür ederim."]], () => bond("selin", 1)],
      ["\"Hızlı ol, Bora'yı bulmalıyız.\"", [["Selin", "Hızlıyım. Sen de biraz sakin ol. Kalp atışın kaplumbağa değil, at gibi."]], () => bond("selin", -1)]
    ], () => {
      G.flags.selin = 1;
      player.maxHealth += 20; heal(999);
      acquired("Selin'in serumu: azami can +20");
      selin.root.visible = false;
      showCampCrew();
      say([["Selin", "Kampa gidiyorum. Bora'yı bul, o adam yalnız kalırsa bir ormanı söker."], ["BİP", "Son sinyal güneyde, Fener Ormanı'nda!"]], () => startChapter(11));
    });
  }
}

// ================================================================ 11. MÜHENDİS BORA (Fener Ormanı)
function ch11() {
  showCampCrew();
  if (G.zone !== G.zones.tahra) setZone("tahra", 6, 12, 0);
  music("calm");
  const tahra = G.zones.tahra;
  const [bx, bz] = W.boraCage;
  checkpoint(() => setZone("tahra", bx, bz - 40, Math.PI));
  W.cageGroup.visible = true; W.cageCol.on = true;
  const bora = W.boraNpc || (W.boraNpc = makeNPC(tahra, { helmet: false, skin: 0xb8865e, hair: 0x2a2a2a, hairStyle: "bald" }, bx, bz, Math.PI));
  bora.root.visible = true;
  goal("Fener Ormanı: Bora'yı bul", bx, bz);
  later(1.5, () => say([["Bora", "(telsiz) Kaptan? Bir bitki beni yuttu. Yani yutmadı, kafes oldu. Bitki kafes. Bilim bunu bilmiyor!"]]));
  const flowers = W.flowers.map(([x, z, h], i) => {
    const y = h ? tahra.ground(x, z) + h : tahra.ground(x, z);
    const g = W["flower" + i] || (W["flower" + i] = (() => {
      const gg = new THREE.Group(); gg.position.set(x, y, z); tahra.group.add(gg);
      mesh(CYL(0.05, 0.08, 1, 5), mat(0x2a6a3a), 0, 0.5, 0, gg);
      const bud = mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3a4a5a, emissive: 0x000000 }), 0, 1.2, 0, gg);
      gg.bud = bud; return gg;
    })());
    g.bud.material.emissive.setHex(0x000000);
    const t = { zone: tahra, pos: V3(x, y + 1.2, z), r: 1.4, lit: false, active: () => !t.lit && G.chapter === 11,
      hit: kind => {
        if (kind !== "thrown") { toast("Çiçek titredi ama açılmadı. Uzaktan, fırlatarak vur!", 1800); return; }
        t.lit = true; g.bud.material.emissive.setHex(0xffd36a); g.bud.material.emissiveIntensity = 2; sfx("crystal");
        const n = flowers.filter(f => f.lit).length;
        acquired(`Işık çiçeği (${n}/3)`);
        if (n < 3) goal(`Işık çiçeklerini fırlatarak yak (${n}/3)`, flowers.find(f => !f.lit).pos.x, flowers.find(f => !f.lit).pos.z);
        else freeBora();
      } };
    return t;
  });
  G.hitTargets = flowers;
  onReach("tahra", bx, bz, 12, () => {
    say([["Bora", "Kaptan! Bak, şu kocaman çiçekler var ya, onlar kapalıyken kafes kapalı. Sanırım ışıkla açılıyorlar!"],
         ["Bora", "Balyozu fırlat! Mıknatıs çarpınca parlıyorlar. Bilimsel bir tahmin. Yani... içgüdü."]]);
    goal("Işık çiçeklerini fırlatarak yak (0/3)", flowers[0].pos.x, flowers[0].pos.z);
    fight([[["hunter", W.flowers[0][0] + 5, W.flowers[0][1] + 4], ["hunter", W.flowers[0][0] - 4, W.flowers[0][1] + 6]]], null, { quiet: true });
    fight([[["brute", W.flowers[2][0] + 4, W.flowers[2][1] - 6], ["shooter", W.flowers[2][0] - 8, W.flowers[2][1] - 2]]], null, { quiet: true });
  });
  function freeBora() {
    W.cageGroup.visible = false; W.cageCol.on = false; G.hitTargets = [];
    sfx("power");
    const mila = NPC.lostSeen || (NPC.lostSeen = placeLumi(tahra, bx + 6, bz + 5, 0x6ff0d2, 0.75));
    mila.root.visible = true;
    faceTo(bora, player.pos.x, player.pos.z);
    talkChoice(bora, [["Bora", "Özgürüm! Kaptan, harikaydı. Bitki kafes açıldı, bilim kazandı!"],
                      ["Bora", "Ama... şuna bak. Biri bizi izliyor. Küçük, parlak bir şey."],
                      ["Lumi", "(çınlayan sesler) ...ti-lu? Tilu mi-la."], ["BİP", "Çeviri: \"Gökten düşenler. Ben Mila.\""]], [
      ["\"Merhaba Mila. Korkma, sana zarar vermeyeceğiz.\"", [["Mila", "(BİP çeviriyor) \"Mila korkmaz. Mila sizi köye götürür. Oru görmek ister.\""]], () => { G.flags.c_mila = "gentle"; }],
      ["\"Geri çekil! Kimsin sen?\"", [["Mila", "(geri kaçar, sonra döner) \"...Oru görmek ister. Mila götürür. Ama yaklaşma.\""]], () => { G.flags.c_mila = "wary"; }]
    ], () => {
      G.flags.bora = 1;
      bora.root.visible = false;
      showCampCrew();
      if (G.flags.c_mila === "gentle") remember("Mila sana güveniyor.");
      say([["Bora", "Ben kampa gidip iletişim modülünü toplarım. Sen yerlilerle tanış, Kaptan. Tarih yazıyorsun!"]], () => { mila.root.visible = false; startChapter(12); });
    });
  }
}

// ================================================================ 12. LUMİ KÖYÜ — SEÇİM: köye yardım
function ch12() {
  showCampCrew();
  const v = W.village, tahra = G.zones.tahra;
  if (G.zone !== tahra) setZone("tahra", v.x - 30, v.z - 20, -2.4);
  music("calm");
  checkpoint(() => setZone("tahra", v.x - 10, v.z - 10, -2.4));
  goal("Lumi Köyü'ne git", v.x, v.z);
  NPC.mila.root.visible = true;
  for (const l of NPC.villagers) l.st.scared = G.flags.c_mila === "wary";
  onReach("tahra", v.x, v.z, 16, () => {
    const O = NPC.oru;
    for (const l of NPC.villagers) l.st.scared = false;
    const wary = G.flags.c_mila === "wary" ? [["Oru", "(BİP çeviriyor) \"Mila senden korkmuş. Ama yine de seni getirdi. Mila cesurdur.\""]] : [["Oru", "(BİP çeviriyor) \"Mila seni sevdi. Mila'nın kalbi yanılmaz.\""]];
    const lumiShot = lines => ({ wait: "say", lines, cam: () => ({ pos: V3(player.pos.x + 1.5, player.pos.y + 2.2, player.pos.z + 1.5), look: O.root.position.clone().setY(O.root.position.y + 1) }) });
    cinematic([
      lumiShot([["Oru", "Tilu... ora-ven, ora-ven."], ["BİP", "Dil modülü %93. Bu yaşlı olan Oru. Köyün bilgesi. Diyor ki: \"Gökten düşen, hoş geldin.\""]].concat(wary)),
      lumiShot([["Oru", "(BİP) \"Otuz yıl önce Vorak geldi. Dağlarımızı kazıyorlar, ışık taşlarımızı yakıt yapıyorlar.\""],
                ["Oru", "(BİP) \"Gençlerimizi Kara Kale'ye götürdüler. Geçitte Bekçi Grax durur. Kimse geçemez.\""],
                ["Oru", "(BİP) \"Kuyumuz kurudu, ışığımız söndü, bir yavrumuz kayboldu. Bize yardım eder misin, gökten düşen?\""]]),
      { wait: "choice", chosen: false, cam: () => ({ pos: V3(player.pos.x + 1.5, player.pos.y + 2.2, player.pos.z + 1.5), look: O.root.position.clone().setY(O.root.position.y + 1) }),
        start() {
          const self = this;
          ask(["\"Size yardım edeceğiz. Önce köy.\"", "\"Üzgünüm. Gemimizi onarmalı, Dünya'ya dönmeliyiz.\""], i => {
            G.flags.c_village = i === 0 ? "help" : "hurry";
            say(i === 0 ? [["Kaptan", "Size yardım edeceğiz. Önce köy."], ["Oru", "(BİP) \"Işık seninle olsun. Lumi unutmaz.\""]]
                        : [["Kaptan", "Üzgünüm. Gemimizi onarmalı, Dünya'ya dönmeliyiz."], ["Oru", "(BİP) \"...Anlıyorum. Herkesin kendi gökyüzü var.\""], ["BİP", "Kaptan... Mila ağlıyor."]], () => { self.chosen = true; });
            remember(i === 0 ? "Lumi'ler bunu hatırlayacak." : "Lumi'ler bunu hatırlayacak.");
          });
        } }
    ], () => G.flags.c_village === "help" ? villageTasks() : villageHurry());
  });
}
function villageTasks() {
  const v = W.village, tahra = G.zones.tahra;
  const done = { water: 0, light: 0, child: 0 };
  const update = () => {
    const n = done.water + done.light + done.child;
    if (n >= 3) { celebrate(); return; }
    goal(`Lumi Köyü'ne yardım et (${n}/3): ${!done.water ? "kuyuya su" : ""}${!done.water && (!done.light || !done.child) ? " · " : ""}${!done.light ? "ağacın ışığı" : ""}${!done.light && !done.child ? " · " : ""}${!done.child ? "kayıp yavru" : ""}`,
      !done.water ? W.waterSpot[0] : !done.light ? v.x - 8 : W.lostLumi[0], !done.water ? W.waterSpot[1] : !done.light ? v.z - 8 : W.lostLumi[1]);
  };
  update();
  // 1) su: kaynakta Vorak dronları
  const [wx, wz] = W.waterSpot;
  const pool = W.poolMesh || (W.poolMesh = (() => { const m = mesh(new THREE.CircleGeometry(3, 20), new THREE.MeshStandardMaterial({ color: 0x3a8aaa, roughness: 0.1, metalness: 0.3 }), wx, tahra.ground(wx, wz) + 0.05, wz, tahra.group); m.rotation.x = -Math.PI / 2; return m; })());
  let waterArmed = false;
  onReach("tahra", wx, wz, 22, () => { fight([[["drone", wx + 6, wz], ["drone", wx - 6, wz + 4], ["shooter", wx, wz - 10]]], () => { waterArmed = true; }); });
  addInteract(tahra, { pos: V3(wx, tahra.ground(wx, wz) + 0.8, wz), r: 4, label: () => G.chapter === 12 && waterArmed && !done.water ? "Su kabını doldur" : null, hold: 1.5, act: () => {
    done.water = 1; acquired("Kaynak suyu"); say([["BİP", "Su tamam! Kuyuya götürmeye gerek yok, Lumi'ler akıttı bile. Kanal açmışlar. Akıllılar."]]); update();
  } });
  // 2) ışık: köy ağacına tırman, tepedeki küreyi uyandır
  const tree = tahra.colliders.find(c => Math.abs((c.minX + c.maxX) / 2 - (v.x - 8)) < 0.1 && Math.abs((c.minZ + c.maxZ) / 2 - (v.z - 8)) < 0.1);
  if (tree) { tree.top = 14; tree.climb = true; delete tree.h; }
  const orb = W.treeOrb || (W.treeOrb = mesh(SPH(0.6), new THREE.MeshStandardMaterial({ color: 0x6ff0d2, emissive: 0x000000 }), v.x - 8, 14.8, v.z - 8, tahra.group));
  addInteract(tahra, { pos: V3(v.x - 8, 14.8, v.z - 8), r: 3, label: () => G.chapter === 12 && !done.light && player.pos.y > 13 ? "Işık küresini uyandır" : null, act: () => {
    done.light = 1; orb.material.emissive.setHex(0x6ff0d2); orb.material.emissiveIntensity = 2.5; sfx("crystal");
    const l = new THREE.PointLight(0x6ff0d2, 2, 50); l.position.copy(orb.position); tahra.group.add(l);
    acquired("Köy ağacının ışığı"); say([["Oru", "(BİP) \"Ağacımız yeniden parlıyor!\""]]); update();
  } });
  // 3) kayıp yavru: iki avcı ve bir gölge avcısı köşeye sıkıştırmış
  const [lx, lz] = W.lostLumi;
  NPC.lost.root.visible = true; NPC.lost.st.scared = true;
  onReach("tahra", lx, lz, 20, () => {
    say([["BİP", "Yavru orada! Vorak'lar çevrelemiş!"]]);
    fight([[["hunter", lx + 4, lz + 3], ["hunter", lx - 4, lz + 2], ["stalker", lx, lz - 6, 0, 0.5]]], () => {
      NPC.lost.st.scared = false; NPC.lost.st.happy = true;
      say([["Lumi", "(yavru) Tii! Tii-lu!"], ["BİP", "\"Teşekkürler, uzun bacaklı!\" Bana dedi sanırım. Benim bacağım yok."]]);
      done.child = 1;
      later(2, () => { NPC.lost.root.position.set(v.x - 2, tahra.ground(v.x - 2, v.z + 6), v.z + 6); });
      update();
    });
  });
  function celebrate() {
    for (const l of NPC.villagers) l.st.happy = true;
    NPC.mila.st.happy = true;
    music("calm");
    cinematic([{ wait: "say", lines: [["Oru", "(BİP) \"Su, ışık ve yavrumuz. Gökten düşen, sen bir Lumi gibi davrandın.\""],
                                       ["Mila", "(BİP) \"Mila sana bir şarkı söyleyecek. ...Tilu, tilu, ora-ven...\""]],
      cam: (t) => ({ pos: V3(v.x + Math.cos(t * 0.2) * 20, 8, v.z + Math.sin(t * 0.2) * 20), look: V3(v.x, 2, v.z) }) },
      { dur: 3, lines: [["BİP", "Kaptan... yer titriyor. Geçitten bir şey geliyor. BÜYÜK bir şey."]], start: () => { sfx("rumble"); shake = 0.8; for (const l of NPC.villagers) { l.st.happy = false; l.st.scared = true; } },
        cam: (t, k) => ({ pos: V3(v.x - 10, 4, v.z - 10), look: V3(W.gate.x, 8, W.gate.z) }) }
    ], () => startChapter(13));
  }
}
function villageHurry() {
  const v = W.village, tahra = G.zones.tahra;
  NPC.mila.st.scared = true;
  goal("Köyden ayrıl: kampa dön", 0, 0);
  later(6, () => {
    say([["BİP", "Kaptan! Arkamızda... köyden çığlıklar! Geçitten bir dev çıktı ve köye yürüyor!"], ["Kaptan", "...Lanet olsun. Geri dönüyoruz!"]]);
    sfx("rumble"); shake = 0.8;
    // köy yanıyor
    for (let i = 0; i < 4; i++) { const a = i * 1.6; fireLight(tahra, v.x + Math.cos(a) * 20, v.z + Math.sin(a) * 20, 0xff6a2a); }
    later(3, () => startChapter(13));
  });
}

// ================================================================ 13. BEKÇİ GRAX (boss)
function ch13() {
  const tahra = G.zones.tahra, gt = W.gate;
  if (G.zone !== tahra || Math.hypot(player.pos.x - gt.x, player.pos.z - gt.z) > 60) setZone("tahra", gt.x + 6, gt.z + 24, 0);
  showCampCrew();
  checkpoint(() => { clearEnemies(); setZone("tahra", gt.x + 4, gt.z + 20, 0); later(0.5, spawnGrax); });
  const helped = choice("village") === "help";
  goal("Bekçi Grax'ı durdur", gt.x, gt.z);
  later(0.5, spawnGrax);
  function spawnGrax() {
    const e = spawnEnemy(tahra, "brute", gt.x, gt.z - 4, { rig: makeGrax(), hp: 1500, r: 2.0, h: 5.4, name: "Grax", scrap: 150, shield: 0 });
    e.shieldHp = 0;
    bossBase(e, "BEKÇİ GRAX");
    e.yaw = 0;
    e.intro = 3;
    let summoned = false, aided = false;
    say([["Grax", "GRAAAH! Küçük gökten düşen! Grax seni ezer, Lumi'leri ezer!"], ["BİP", "Kaptan, tokmağı yere vurunca bir an saplanıyor. O an saldır! Şok dalgasının üstünden zıpla!"]]);
    tutorial("BOSS: GRAX", "Tokmak yere saplanınca <b>daha fazla hasar</b> alır. Halka şeklindeki şok dalgasından <kbd>Space</kbd> ile zıpla. Hücumunu <kbd>C</kbd> ile atla.");
    if (helped) { lumiAid(16); say([["Oru", "(BİP) \"Lumi'ler! Gökten düşene ışık verin!\""]]); }
    e.ai = (e, dt) => {
      e.pos.y = tahra.ground(e.pos.x, e.pos.z);
      if (e.intro > 0) { e.intro -= dt; e.state = "windup"; faceP(e, dt); return; }
      const d = distP(e), enraged = e.hp < e.maxHp * 0.5;
      if (enraged && !summoned) {
        summoned = true;
        say([["Grax", "GRAAH! Kardeşler! Gelin!"]]);
        fight([[["hunter", gt.x + 10, gt.z + 6], ["hunter", gt.x - 10, gt.z + 6]]], null);
        music("epic");
      }
      if (enraged && helped && !aided && e.hp < e.maxHp * 0.4) {
        aided = true;
        say([["Mila", "(BİP) \"Grax! Bize bak, taş kafa!\""], ["BİP", "Lumi'ler onu ışıkla kör etti! ŞİMDİ, Kaptan!"]]);
        e.act = { n: "stuck", t: 0, len: 4 }; e.armor = 1.6;
      }
      if (e.act) {
        const a = e.act; a.t += dt;
        if (a.n === "slam") {
          e.state = "windup";
          if (a.t < 0.9) faceP(e, dt, 3);
          if (a.t >= 1.0 && !a.hit) {
            a.hit = true;
            const fx = e.pos.x - Math.sin(e.yaw) * 3.5, fz = e.pos.z - Math.cos(e.yaw) * 3.5;
            if (Math.hypot(player.pos.x - fx, player.pos.z - fz) < 3.6) hurt(26, "Grax'ın tokmağı seni ezdi.", V3(fx, 0, fz));
            shockwave(fx, fz, enraged ? 20 : 14, 11, 16, 0xff7a1a);
            shake = 1; e.lunge = 0.3;
            e.act = { n: "stuck", t: 0, len: enraged ? 1.4 : 2.0 };
            e.armor = 1.6;
          }
        } else if (a.n === "stuck") {
          e.state = "stun";
          if (a.t > a.len) { e.act = null; e.armor = 1; }
        } else if (a.n === "charge") {
          if (a.t < 0.8) { e.state = "windup"; faceP(e, dt, 6); a.dx = -Math.sin(e.yaw); a.dz = -Math.cos(e.yaw); }
          else {
            e.state = "move";
            const sp = (enraged ? 19 : 16) * dt;
            const nx = e.pos.x + a.dx * sp, nz = e.pos.z + a.dz * sp;
            if (blockedAt(tahra, nx, nz, 1.2, e.pos.y) || a.t > 2.2) { e.act = { n: "stuck", t: 0, len: 1.6 }; e.armor = 1.6; sfx("heavy"); shake = 0.7; return; }
            e.pos.x = nx; e.pos.z = nz;
            if (distP(e) < 2.6 && !a.hit) { a.hit = true; hurt(22, "Grax seni ezip geçti.", e.pos); }
          }
        } else if (a.n === "rock") {
          e.state = "windup"; faceP(e, dt, 5);
          if (a.t >= 0.8 && !a.hit) {
            a.hit = true;
            fireProjectile(V3(e.pos.x, e.pos.y + 5, e.pos.z), V3(player.pos.x, player.pos.y + 0.8, player.pos.z), 20, 0x8a6a4a, 17, { size: 0.7, reason: "Grax'ın kayası çarptı." });
            sfx("throw");
          }
          if (a.t > 1.3) e.act = null;
        }
        return;
      }
      faceP(e, dt, 3);
      e.atkT -= dt;
      if (d > 4.5) { moveEnemyTo(e, player.pos.x, player.pos.z, dt, enraged ? 1.25 : 1); e.state = "move"; }
      else e.state = "ready";
      if (e.atkT <= 0) {
        e.atkT = enraged ? 1.4 : 2.1;
        sfx("windup");
        if (d < 6) e.act = { n: "slam", t: 0 };
        else if (d > 12 && Math.random() < 0.5) e.act = { n: "rock", t: 0 };
        else e.act = { n: "charge", t: 0 };
      }
    };
    e.onDeath = () => {
      G.boss = null;
      clearEnemies();
      music("calm");
      G.flags.grax = 1; G.flags.keycard = 1;
      player.maxHealth += 20; heal(999);
      acquired("Grax'ın kalp taşı: azami can +20");
      acquired("Vorak geçiş kartı");
      later(2, graxAfter);
    };
  }
  function graxAfter() {
    const v = W.village;
    for (const l of NPC.villagers) { l.st.scared = false; l.st.happy = helped; }
    NPC.mila.st.scared = false; NPC.mila.st.happy = true;
    const lines = helped
      ? [["Oru", "(BİP) \"Bekçi düştü! Otuz yıldır ilk kez geçit açık!\""], ["Oru", "(BİP) \"Gökten düşen, Lumi'ler artık senin halkın. Kara Kale'ye gittiğinde savaşçılarımız seninle.\""], ["Mila", "(BİP) \"Kahraman! Kahraman!\""]]
      : [["Oru", "(BİP) \"Köyümüz yandı... ama Grax öldü. Geri döndün. Bunu unutmayacağız.\""], ["Oru", "(BİP) \"Ama savaşçılarımız yaralı. Kara Kale'ye seninle gelemezler.\""], ["Mila", "(sessizce bakıyor)"]];
    cinematic([{ wait: "say", lines, cam: t => ({ pos: V3(player.pos.x + 3, player.pos.y + 2.5, player.pos.z + 4), look: V3(player.pos.x, player.pos.y + 1.2, player.pos.z) }) }], () => startChapter(14));
  }
}

// ================================================================ 14. SİNYAL — SEÇİM: kaleye kim gelecek
function ch14() {
  const tahra = G.zones.tahra;
  setZone("tahra", 8, 22, Math.PI);
  showCampCrew();
  music("tense");
  checkpoint(() => setZone("tahra", 8, 22, Math.PI));
  goal("Kampa dön: iletişim modülünü çalıştır", W.camp[0], W.camp[1]);
  const [cx, cz] = W.camp;
  const commSet = W.campComm || (W.campComm = (() => {
    const g = new THREE.Group(); g.position.set(cx - 5, tahra.ground(cx - 5, cz), cz + 1); tahra.group.add(g);
    mesh(BOX(1.4, 0.9, 1.0), mat(0xdddddd), 0, 0.45, 0, g); mesh(CYL(0.05, 0.05, 2.4), mat(0x999999), 0.4, 2, 0, g);
    mesh(new THREE.SphereGeometry(0.7, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), mat(0xeeeeee, { side: THREE.DoubleSide }), 0.4, 3.2, 0, g).rotation.x = Math.PI;
    return g;
  })());
  addInteract(tahra, { pos: V3(cx - 5, tahra.ground(cx - 5, cz) + 1, cz + 1), r: 3, label: () => G.chapter === 14 && !G.flags.signal ? "İletişim modülünü çalıştır" : null, hold: 2, act: signalScene });
  function signalScene() {
    G.flags.signal = 1;
    sfx("power");
    const B = NPC.bora;
    const shot = lines => ({ wait: "say", lines, cam: t => ({ pos: V3(cx - 2 + Math.sin(t * 0.3) * 2, tahra.ground(cx, cz) + 2.4, cz + 7), look: V3(cx - 4, tahra.ground(cx, cz) + 1.4, cz) }) });
    const kshaMsg = choice("ksha") === "spare"
      ? [["Telsiz", "(ikinci bir sinyal, zayıf) ...gökten düşen. Ben Ksha. Kara Kale kapısı. Sen gel, ben açarım. Borç."], ["Kerem", "Bıraktığın yaratık! Gerçekten borcunu ödüyor!"]]
      : [["BİP", "Kalenin ön kapısı kapalı ve korunuyor. Doğu duvarında bir çatlak var. Tırmanıp gizlice girmemiz gerek."]];
    cinematic([
      shot([["Bora", "Bağlantı... Bağlantı... Var! Ama Dünya'yı alamıyoruz. Ay'daki anten olmadan sinyal ulaşmıyor."], ["BİP", "Bir şey yakaladım. Vorak frekansı. Çeviriyorum..."]]),
      shot([["Vorakh", "(BİP çeviriyor) \"Ay'daki göz kör edildi. Mavi gezegen bizi görmüyor.\""],
            ["Vorakh", "(BİP) \"Tahra'nın ışık taşlarından yakıt hazır. Üç gün sonra filo mavi gezegene iner.\""],
            ["Selin", "Dünya... Dünya'ya saldıracaklar. Ve kimse bilmeyecek, çünkü anten kör."],
            ["Kerem", "ATLAS'ın sıçrama çekirdeği parçalandı. Ay'a yetişmemiz için onların hiper sürücüsü lazım."],
            ["Bora", "Hiper sürücü... Kara Kale'de. Esir Lumi'ler de orada."]].concat(kshaMsg)),
      shot([["Kerem", "Kaptan, biri seninle gelmeli. Ben havadan kollarım. Alarm çalarsa ilk ben yetişirim."],
            ["Selin", "Hayır, ben gelmeliyim. Orada yaralanırsan beni yanında istersin."],
            ["Bora", "Ben gelirim! O kale bir makine. Makineleri ben konuşturürüm. Işıldakları söndürürüm."]]),
      { wait: "choice", chosen: false, cam: t => ({ pos: V3(cx, tahra.ground(cx, cz) + 3, cz + 9), look: V3(cx, tahra.ground(cx, cz) + 1, cz) }),
        start() {
          const self = this;
          ask(["\"Kerem, sen gel. Havadan kolla.\"", "\"Selin, yanımda ol.\"", "\"Bora, kaleyi sen sustur.\""], i => {
            const who = ["kerem", "selin", "bora"][i];
            G.flags.c_partner = who; bond(who, 2);
            say([[["Kerem", "Selin", "Bora"][i], ["Motorları ısıtıyorum. Kale üstünde görüşürüz!", "Çantam hazır. Bu sefer ben de varım.", "Kale kör olacak, Kaptan. Söz!"][i]]], () => { self.chosen = true; });
            remember(["Kerem havadan destek verecek.", "Selin seni bir kez ayağa kaldırabilir.", "Bora ışıldakları söndürecek, kapılar daha hızlı açılacak."][i]);
          });
        } }
    ], () => startChapter(15));
  }
}

// ================================================================ 15. SIZMA (Kara Kale)
function ch15() {
  const tahra = G.zones.tahra, ft = W.fort;
  setZone("tahra", ft.x + 6, ft.z + 70, Math.PI);
  showCampCrew();
  music("tense");
  checkpoint(() => { G.alarm = false; setZone("tahra", ft.x + 6, ft.z + 70, Math.PI); });
  const partner = choice("partner"), spared = choice("ksha") === "spare";
  if (partner === "selin") selinAid();
  W.fortGate.on = true; W.fortGateMesh.position.y = 5;
  for (const L of W.lights) { L.on = true; L.cone.visible = true; L.spot.visible = true; }
  // devriyeler (fark etmezlerse yaklaşmazlar)
  const patrols = [
    ["hunter", ft.x - 10, ft.z + 20, { patrol: [[ft.x - 10, ft.z + 20], [ft.x - 10, ft.z - 4]] }],
    ["hunter", ft.x + 10, ft.z + 4, { patrol: [[ft.x + 10, ft.z + 4], [ft.x + 24, ft.z + 4]] }],
    ["shooter", ft.x + 4, ft.z + 24, { patrol: [[ft.x + 4, ft.z + 24], [ft.x - 4, ft.z + 10]] }],
    ["hunter", ft.x - 14, ft.z - 18, { patrol: [[ft.x - 14, ft.z - 18], [ft.x + 2, ft.z - 22]] }]
  ];
  for (const [t, x, z, o] of patrols) spawnEnemy(tahra, t, x, z, Object.assign({ tag: "fortGuard", aggro: 14 }, o));
  // ışıldaklar: balyozla vurulursa söner (Bora gelirse ikisi zaten sönük)
  G.hitTargets = W.lights.map((L, i) => {
    if (partner === "bora" && i < 2) { L.on = false; L.cone.visible = false; L.spot.visible = false; }
    return { zone: tahra, pos: V3(L.x, 6, L.z), r: 1.2, active: () => L.on, hit: () => { L.on = false; L.cone.visible = false; L.spot.visible = false; sfx("clang"); acquired("Işıldak söndü"); } };
  });
  later(1, () => say(partner === "bora" ? [["Bora", "(telsiz) İki ışıldağı kapattım! Üçüncüsüne erişemiyorum, onu balyozla patlat."]] : [["BİP", "Işıldaklara yakalanma. Balyozu fırlatırsan sönerler!"]]));
  tutorial("SIZMA", "Işıldakların yere düşen ışığına girme: alarm çalar. Işıldağı balyozu <b>fırlatarak</b> söndürebilirsin. Devriyeler seni ancak yakından fark eder.");
  // alarm
  let alarmed = false;
  const raise = () => {
    if (alarmed) return;
    alarmed = true; G.alarm = true;
    sfx("alarm"); toast("ALARM! Fark edildin!", 2500);
    for (const e of aliveEnemies("fortGuard")) e.alerted = true;
    const waves = [[["brute", ft.x, ft.z + 26], ["shooter", ft.x - 20, ft.z + 10, 0, 0.5], ["shooter", ft.x + 20, ft.z + 10, 0, 0.8], ["drone", ft.x, ft.z, 0, 1]]];
    fight(waves, () => { G.alarm = false; toast("Alarm sustu.", 1500); }, { after: "tense" });
    if (partner === "kerem") later(4, () => {
      say([["Kerem", "Kale üstündeyim! Bombardıman geliyor, eğil!"]]);
      sfx("explosion"); shake = 0.8; flashWhite(100);
      let n = 0;
      for (const e of G.enemies) if (!e.dead && e.zone === tahra && n < 2 && !e.boss && Math.hypot(e.pos.x - ft.x, e.pos.z - ft.z) < 40) { damageEnemy(e, 999); n++; }
    });
  };
  watch(dt => {
    if (G.zone !== tahra) return false;
    for (const L of W.lights) {
      L.ph += dt * 0.7;
      const sx = L.x + Math.cos(L.ph) * 8, sz = L.z + Math.sin(L.ph) * 8;
      const gy = tahra.ground(sx, sz);
      L.spot.position.set(sx, gy + 0.06, sz);
      // koni: tepesi lambada, tabanı yerdeki ışık lekesinde
      const lamp = V3(L.x, 6, L.z), spotP = V3(sx, gy, sz), dir = lamp.clone().sub(spotP), len = dir.length();
      L.cone.position.set((lamp.x + spotP.x) / 2 - L.x, (lamp.y + spotP.y) / 2, (lamp.z + spotP.z) / 2 - L.z);
      L.cone.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
      L.cone.scale.set(1, len / 12, 1);
      if (L.on && !alarmed && Math.hypot(player.pos.x - sx, player.pos.z - sz) < 3.2 && player.pos.y < 3) raise();
    }
    for (const e of aliveEnemies("fortGuard")) if (e.alerted && !alarmed) raise();
    return false;
  });
  if (spared) {
    goal("Kale kapısına git: Ksha bekliyor", ft.x, ft.z + 42);
    onReach("tahra", ft.x, ft.z + 42, 7, () => {
      const K = NPC.ksha;
      K.root.visible = true; K.hips.rotation.x = 0; K.hips.position.y = 1.05;
      K.root.position.set(ft.x + 3, 0, ft.z + 37); faceTo(K, player.pos.x, player.pos.z);
      say([["Ksha", "(BİP) \"Gökten düşen. Ksha borcunu öder. Kapı açılıyor. Devriyeler hâlâ içeride, dikkat.\""], ["Ksha", "(BİP) \"Esirler batı duvarında. Sürücü doğuda. Zhal... kulede.\""]], () => {
        W.fortGate.on = false; sfx("door");
        let t = 0; watch(dt => { t += dt; W.fortGateMesh.position.y = 5 + t * 4; return t > 2.2; });
        later(2, () => { K.root.visible = false; sfx("warp"); });
        goal("İçeri sız: esirlerin hücrelerine git", W.cells[1][0] + 6, W.cells[1][1]);
      });
    });
  } else {
    goal("Doğu duvarındaki çatlağa tırman", ft.x + 36, ft.z + 1);
    onReach("tahra", ft.x + 30, ft.z + 1, 5, () => goal("İçeri sız: esirlerin hücrelerine git", W.cells[1][0] + 6, W.cells[1][1]));
  }
  onReach("tahra", W.cells[1][0] + 6, W.cells[1][1], 5, () => startChapter(16, { noCard: false }));
}

// ================================================================ 16. KURTARMA — SEÇİM: esirler mi sürücü mü
function ch16(opts) {
  const tahra = G.zones.tahra, ft = W.fort;
  if (G.zone !== tahra || Math.hypot(player.pos.x - ft.x, player.pos.z - ft.z) > 45) setZone("tahra", W.cells[1][0] + 6, W.cells[1][1], -Math.PI / 2);
  for (const L of W.lights) { L.on = false; L.cone.visible = false; L.spot.visible = false; }
  music("tense");
  const partner = choice("partner");
  if (partner === "selin") selinAid();
  checkpoint(() => startChapter(16));
  G.flags.lostGroup = 0; G.flags.zhalIntro = 0;
  for (const b of W.cellBars) { b.g.visible = true; b.c.on = true; }
  NPC.prisoners.forEach(g => g.forEach(l => { l.root.visible = true; l.st.scared = true; }));
  const holdT = partner === "bora" ? 0.8 : 2.2;
  const freed = [false, false, false];
  let picked = null, driveTaken = false;
  say([["Lumi", "(hücrelerden) Tii... tii-lu..."], ["BİP", "Kaptan! Devriye değişimi 60 saniye içinde. Ya esirleri ya sürücüyü alabiliriz, ikisine birden vakit yok!"]], () => {
    ask(["\"Önce esirler. Hiçbirini geride bırakmam.\"", "\"Önce sürücü. Dünya'yı kurtarmazsak hepsi boşa.\""], i => {
      picked = G.flags.c_rescue = i === 0 ? "prisoners" : "drive";
      say([["Kaptan", i === 0 ? "Önce esirler. Hiçbirini geride bırakmam." : "Önce sürücü. Dünya'yı kurtarmazsak hepsi boşa."]]);
      remember("Bu seçim Lumi'lerin kaderini değiştirecek.");
      if (picked === "prisoners") prisonersFirst(); else driveFirst();
    });
  });
  // hücre kapıları
  W.cellBars.forEach((b, i) => {
    const [x, z] = W.cells[i];
    addInteract(tahra, { pos: V3(x + 3.4, 1.4, z), r: 2.8, label: () => G.chapter === 16 && picked && !freed[i] && !(picked === "drive" && i === 2 && G.flags.lostGroup) ? "Hücre kapısını kır" : null, hold: holdT, act: () => {
      freed[i] = true; b.g.visible = false; b.c.on = false; sfx("clang");
      NPC.prisoners[i].forEach(l => { l.st.scared = false; l.st.happy = true; });
      acquired(`Lumi esirler kurtuldu (${freed.filter(Boolean).length})`);
      later(2, () => NPC.prisoners[i].forEach(l => { l.root.visible = false; }));
      progress();
    } });
  });
  const [dx, dz] = W.drive;
  const drive = W.driveProp || (W.driveProp = (() => {
    const g = new THREE.Group(); g.position.set(dx, 0, dz); tahra.group.add(g);
    mesh(CYL(0.9, 0.9, 1.6, 12), mat(0x2a2028, { metalness: 0.7 }), 0, 0.8, 0, g);
    mesh(new THREE.TorusGeometry(1, 0.12, 8, 24), glowMat(0xff3a8a, 2), 0, 1.6, 0, g).rotation.x = Math.PI / 2;
    mesh(SPH(0.4), glowMat(0xff3a8a, 3), 0, 2, 0, g);
    return g;
  })());
  drive.visible = true;
  addInteract(tahra, { pos: V3(dx, 1.4, dz), r: 3, label: () => G.chapter === 16 && picked && !driveTaken && (picked === "drive" || freed.filter(Boolean).length === 3) ? "Hiper sürücüyü sök" : null, hold: 2.5, act: () => {
    driveTaken = true; G.flags.drive = 1; drive.visible = false; sfx("warp"); acquired("Vorak hiper sürücüsü");
    progress();
  } });
  let clock = 60;
  function prisonersFirst() {
    goal("Hücreleri aç (0/3)", W.cells[0][0] + 3, W.cells[0][1]);
    watch(dt => { clock -= dt; if (clock <= 0) { alarmWaves(); return true; } return picked && freed.every(Boolean); });
    if (choice("village") === "help") later(4, () => say([["Oru", "(telsiz, BİP) \"Lumi savaşçıları kapıda! Kurtardıklarını biz kaçırırız!\""]]));
  }
  function driveFirst() {
    goal("Hiper sürücüyü sök", dx, dz);
    // sürücü alınınca alarm; bir grup esir taşınır
    watch(() => {
      if (!driveTaken) return false;
      alarmWaves();
      later(3, () => {
        if (freed[2]) { G.flags.c_rescue = "prisoners"; return; }   // o kadar hızlıydın ki hepsini kurtardın
        G.flags.lostGroup = 1;
        say([["BİP", "Kaptan! Vorak'lar bir hücreyi ışınladı! Batıdaki son hücre... boş."], ["Kaptan", "Hayır... Kalan ikisini aç! Çabuk!"]]);
        NPC.prisoners[2].forEach(l => { l.root.visible = false; }); sfx("warp");
        freed[2] = true;
        goal("Kalan hücreleri aç", W.cells[0][0] + 3, W.cells[0][1]);
      });
      return true;
    });
  }
  let alarmOn = false;
  function alarmWaves() {
    if (alarmOn) return;
    alarmOn = true;
    G.alarm = true; sfx("alarm"); toast("ALARM!", 2000);
    const w = picked === "prisoners"
      ? [[["brute", dx - 6, dz + 6], ["shooter", dx + 6, dz + 10], ["hunter", dx, dz + 14, 0, 0.5]], [["brute", dx + 4, dz + 12], ["drone", dx - 8, dz, 0, 0.4], ["stalker", dx, dz + 18, 0, 0.8]]]
      : [[["hunter", ft.x - 14, ft.z, 0, 0], ["shooter", ft.x - 10, ft.z + 12], ["hunter", ft.x - 18, ft.z + 8, 0, 0.5]]];
    fight(w, () => { G.alarm = false; progress(); });
    if (partner === "kerem") later(5, () => { say([["Kerem", "Bombalar geliyor!"]]); sfx("explosion"); flashWhite(100); let n = 0; for (const e of G.enemies) if (!e.dead && n < 2) { damageEnemy(e, 999); n++; } });
  }
  function progress() {
    const nFree = freed.filter(Boolean).length;
    if (picked === "prisoners") {
      if (nFree < 3) { goal(`Hücreleri aç (${nFree}/3)`, W.cells[freed.indexOf(false)][0] + 3, W.cells[freed.indexOf(false)][1]); return; }
      if (!alarmOn) alarmWaves();
      if (!driveTaken) { goal("Alarm çaldı! Hiper sürücüyü sök", dx, dz); return; }
    } else {
      if (!driveTaken) return;
      if (nFree < 3) { goal("Kalan hücreleri aç", W.cells[freed.indexOf(false)][0] + 3, W.cells[freed.indexOf(false)][1]); return; }
    }
    if (aliveEnemies().length) { goal("Muhafızları yen"); return; }
    if (G.flags.zhalIntro) return;
    G.flags.zhalIntro = 1;
    say([["Zhal", "Böcek. Kalemde dolaşan küçük, sıcak kanlı böcek."], ["Zhal", "Meydana çık. Hükümdar'a başını götüreceğim."]], () => startChapter(17));
  }
}

// ================================================================ 17. KOMUTAN ZHAL (boss)
function ch17() {
  const tahra = G.zones.tahra, ft = W.fort;
  const [ax, az] = W.arena;
  setZone("tahra", ax, az + 9, 0);
  G.flags.zhalIntro = 1;
  const partner = choice("partner");
  if (partner === "selin") selinAid();
  checkpoint(() => startChapter(17, { noCard: true }));
  W.fortGate.on = true;
  goal("Komutan Zhal'ı yen", ax, az);
  const e = spawnEnemy(tahra, "hunter", ax, az - 5, { rig: makeZhal(), hp: 1800, r: 0.8, h: 3.2, name: "Zhal", scrap: 200 });
  bossBase(e, "KOMUTAN ZHAL");
  e.intro = 2.5;
  const allies = choice("village") === "help" && choice("rescue") === "prisoners";
  say([["Zhal", "Grax'ı devirdin. Etkileyici. Grax aptaldı."], ["BİP", "Kaptan, ışınlanıyor! Arkanı kolla. Kırmızı halkalar gelince zıpla!"]]);
  tutorial("BOSS: ZHAL", "Zhal ışınlanıp arkana geçer: gözü parlayınca <kbd>C</kbd> ile yuvarlan. Takip eden kırmızı kürelerden kaç. Halkalardan zıpla.");
  if (allies) { lumiAid(14); later(5, () => say([["Oru", "(BİP) \"Kurtardığın gençler burada! Işık seninle, gökten düşen!\""]])); }
  let summon66 = false, summon33 = false;
  e.ai = (e, dt) => {
    e.pos.y = groundAt(tahra, e.pos.x, e.pos.z, e.pos.y + 1);
    if (e.intro > 0) { e.intro -= dt; e.state = "idle"; faceP(e, dt); return; }
    const d = distP(e), p2 = e.hp < e.maxHp * 0.5;
    if (!summon66 && e.hp < e.maxHp * 0.66) { summon66 = true; say([["Zhal", "Gölgelerim! Parçalayın!"]]); fight([[["stalker", ax + 8, az], ["stalker", ax - 8, az]]], null); music("epic"); }
    if (!summon33 && e.hp < e.maxHp * 0.33) { summon33 = true; fight([[["stalker", ax + 8, az + 4], ["shooter", ax - 10, az - 4]]], null); music("epic"); if (allies) { say([["Mila", "(BİP) \"Zhal! Işığa bak!\""]]); e.act = { n: "dazed", t: 0 }; e.armor = 1.5; } }
    if (e.rig.cape) e.rig.cape.rotation.x = 0.2 + Math.sin(G.time * 3) * 0.1;
    if (e.act) {
      const a = e.act; a.t += dt;
      if (a.n === "combo") {
        e.state = "windup"; faceP(e, dt, 6);
        for (let k = 0; k < 3; k++) if (a.t >= 0.45 + k * 0.42 && a.k === k) {
          a.k++;
          e.lunge = 0.2; e.vel.set(-Math.sin(e.yaw) * 6, 0, -Math.cos(e.yaw) * 6); sfx("swing");
          if (distP(e) < 3.2) hurt(13, "Zhal'ın asası seni biçti.", e.pos);
        }
        if (a.t > 1.6) e.act = null;
      } else if (a.n === "teleport") {
        e.rig.root.visible = a.t > 0.5;
        if (a.t > 0.5 && !a.moved) {
          a.moved = true;
          const bx = player.pos.x + Math.sin(player.yaw) * 3, bz = player.pos.z + Math.cos(player.yaw) * 3;
          if (!blockedAt(tahra, bx, bz, 0.8, player.pos.y)) { e.pos.x = bx; e.pos.z = bz; }
          sfx("warp"); flashWhite(60);
          e.act = { n: "combo", t: 0.1, k: 0 };
        } else e.state = "idle";
      } else if (a.n === "volley") {
        e.state = "windup"; faceP(e, dt, 4);
        const shots = p2 ? 7 : 5;
        if (a.t > 0.6 && (a.k || 0) < shots && a.t > 0.6 + (a.k || 0) * 0.2) {
          a.k = (a.k || 0) + 1;
          const ang = e.yaw + (a.k - shots / 2) * 0.3;
          fireProjectile(V3(e.pos.x, e.pos.y + 2.8, e.pos.z), V3(e.pos.x - Math.sin(ang) * 10, e.pos.y + 1.2, e.pos.z - Math.cos(ang) * 10), 10, 0xff3a5a, 9, { homing: 1.6, life: 5, reason: "Zhal'ın kürelerinden kaçamadın." });
          sfx("plasma");
        }
        if (a.t > 0.6 + shots * 0.2 + 0.4) e.act = null;
      } else if (a.n === "rings") {
        e.state = "windup";
        if (a.t > 0.8 && !a.k) { a.k = 1; shockwave(e.pos.x, e.pos.z, 22, 9, 15, 0xff3a5a); }
        if (p2 && a.t > 1.6 && a.k === 1) { a.k = 2; shockwave(e.pos.x, e.pos.z, 22, 9, 15, 0xff3a5a); }
        if (a.t > 2.4) e.act = null;
      } else if (a.n === "dazed") {
        e.state = "stun";
        if (a.t > 4) { e.act = null; e.armor = 1; }
      }
      return;
    }
    faceP(e, dt, 5);
    e.atkT -= dt;
    if (d > 3) { moveEnemyTo(e, player.pos.x, player.pos.z, dt, 1.1); e.state = "move"; } else e.state = "ready";
    if (e.atkT <= 0) {
      e.atkT = p2 ? 1.2 : 1.8;
      sfx("windup");
      const r = Math.random();
      if (d < 3.5) e.act = { n: "combo", t: 0, k: 0 };
      else if (r < 0.35) e.act = { n: "teleport", t: 0 };
      else if (r < 0.7) e.act = { n: "volley", t: 0 };
      else e.act = { n: "rings", t: 0 };
    }
  };
  e.onDeath = () => {
    G.boss = null;
    clearEnemies(); clearProjectiles();
    G.flags.zhal = 1;
    music("calm");
    later(1.5, () => {
      cinematic([
        { wait: "say", lines: [["Zhal", "Hah... Gökten düşen... Hükümdar Vorakh... seni Ay'da bekliyor..."], ["Zhal", "Mavi gezegenin ışığı... sönecek..."]],
          cam: () => ({ pos: V3(player.pos.x + 2, player.pos.y + 2, player.pos.z + 3), look: V3(e.pos.x, e.pos.y + 1, e.pos.z) }) },
        { wait: "say", lines: [["BİP", "Zhal düştü! Kalenin kapısı açılıyor!"], ["Kaptan", "Kampa dönüyoruz. ATLAS'ı birleştirme vakti."]],
          start: () => { W.fortGate.on = false; W.fortGateMesh.position.y = 14; }, cam: () => ({ pos: V3(ft.x, 12, ft.z + 50), look: V3(ft.x, 4, ft.z) }) }
      ], () => startChapter(18));
    });
  };
}

// ================================================================ 18. TAMİR (ATLAS birleşiyor, veda)
function ch18() {
  const tahra = G.zones.tahra;
  setZone("tahra", 10, 18, Math.PI * 0.8);
  showCampCrew();
  for (const p of ["wingL", "wingR", "engine"]) W.wreck.parts[p].visible = true;
  W.wreck.root.rotation.set(0, 0.5, 0);
  W.wreck.root.position.y = tahra.ground(0, 0) + 1.6;
  G.flags.smokeOff = 1;
  music("calm");
  checkpoint(() => setZone("tahra", 10, 18, Math.PI * 0.8));
  const helped = choice("village") === "help";
  const O = NPC.oru, M = NPC.mila;
  O.root.position.set(6, tahra.ground(6, 6), 6); M.root.position.set(4, tahra.ground(4, 8), 8);
  goal("Oru ile vedalaş", 6, 6);
  addInteract(tahra, { pos: V3(6, tahra.ground(6, 6) + 1, 6), r: 3.2, label: () => G.chapter === 18 && !G.flags.farewell ? "Oru ile vedalaş" : null, act: () => {
    G.flags.farewell = 1;
    const cam = () => ({ pos: V3(player.pos.x + 2, player.pos.y + 2.2, player.pos.z + 2.5), look: O.root.position.clone().setY(O.root.position.y + 1) });
    const lost = choice("rescue") === "drive" ? [["Oru", "(BİP) \"Işınlanan gençlerimiz... Onları da bir gün bulacak mısın?\""]] : [["Oru", "(BİP) \"Bütün gençlerimiz evde. Otuz yıldır ilk kez.\""]];
    cinematic([
      { wait: "say", cam, lines: [["Oru", helped ? "(BİP) \"Gökten düşen. Kuyumuz dolu, ağacımız parlıyor, Grax yok, Zhal yok.\"" : "(BİP) \"Gökten düşen. Köyümüz küllerden kalkacak. Grax yok, Zhal yok.\""]].concat(lost) },
      { wait: "choice", chosen: false, cam, start() {
        const self = this;
        ask(["\"Söz veriyorum, geri döneceğim.\"", "\"Teşekkürler Oru. Hepiniz kendinize iyi bakın.\""], i => {
          G.flags.c_promise = i === 0 ? "return" : "thanks";
          say([["Kaptan", i === 0 ? "Söz veriyorum, geri döneceğim." : "Teşekkürler Oru. Hepiniz kendinize iyi bakın."], ["Oru", i === 0 ? "(BİP) \"Lumi'ler bekler. Lumi'ler hep bekler.\"" : "(BİP) \"Işık seninle olsun.\""]], () => { self.chosen = true; });
        });
      } },
      { wait: "say", cam: () => ({ pos: V3(player.pos.x + 2, player.pos.y + 1.6, player.pos.z + 2), look: M.root.position.clone().setY(M.root.position.y + 0.8) }),
        lines: G.flags.c_mila === "gentle" || helped
          ? [["Mila", "(BİP) \"Mila'nın hediyesi. Lumi kalbi. Düşersen... seni kaldırır.\""], ["BİP", "Kaptan, bu taş çok güçlü bir enerji yayıyor. Ölümcül bir darbede seni bir kez ayağa kaldırabilir."]]
          : [["Mila", "(uzaktan el sallıyor)"]],
        start: () => { if (G.flags.c_mila === "gentle" || helped) { G.flags.milaGift = 1; acquired("Lumi kalbi"); } } }
    ], () => {
      goal("ATLAS'a bin", 0, 4);
      say([["Kerem", "Motorlar sıcak! Hiper sürücü bağlandı! Kaptan, kokpite!"]]);
    });
  } });
  addInteract(tahra, { pos: V3(0, tahra.ground(0, 4) + 1.5, 4), r: 3.5, label: () => G.chapter === 18 && G.flags.farewell ? "ATLAS'a bin" : null, act: () => {
    const A = W.wreck;
    G.hidePlayer = true; G.bipHidden = true;
    for (const k of ["kerem", "selin", "bora"]) NPC[k].root.visible = false;
    setAtlasThrust(A, true, 1.2);
    let t = 0;
    for (const l of NPC.villagers) l.st.happy = true;
    cinematic([
      { dur: 6, lines: [["Kerem", "ATLAS... tekrar uçuyor. Tutunun!"], ["Selin", "Hoşça kal, Tahra."]], start: () => sfx("power"),
        tick: dt => { t += dt; A.root.position.y += dt * (t * 2); A.root.rotation.x = Math.min(0.5, t * 0.1); shake = 0.3; },
        cam: (tt, k) => ({ pos: V3(30, 6, 40), look: A.root.position.clone() }) },
      { dur: 3, start: () => { sfx("warp"); flashWhite(300); }, tick: dt => { A.root.position.y += dt * 120; A.root.position.z -= dt * 80; }, cam: () => ({ pos: V3(30, 6, 40), look: A.root.position.clone() }) }
    ], () => {
      A.root.position.set(0, tahra.ground(0, 0) + 1.6, 0); A.root.rotation.set(0, 0.5, 0); setAtlasThrust(A, false);
      G.hidePlayer = false; G.bipHidden = false;
      startChapter(19);
    });
  } });
}

// ================================================================ 19. KOVALAMACA (asteroit kuşağı)
function ch19() {
  setZone("chase", 0, 0, 0);
  G.cutscene = true; G.hidePlayer = true; G.bipHidden = true;
  $("hud").style.display = "none"; $("shipHud").style.display = "block";
  music("battle");
  checkpoint(() => startChapter(19, { noCard: true }));
  const Z = G.zones.chase, S = W.chaseShip;
  S.root.position.set(0, 0, 0); S.root.rotation.set(0, 0, 0);
  setAtlasThrust(S, true, 1.4);
  const st = { x: 0, y: 0, vx: 0, vy: 0, hull: 100, prog: 0, kills: 0, fire: 0, spawned: 0, fT: 3, cross: { x: 0.5, y: 0.45 } };
  G.mouseHook = (mx, my) => { st.cross.x = clamp(st.cross.x + mx / innerWidth * 0.9, 0.08, 0.92); st.cross.y = clamp(st.cross.y + my / innerHeight * 0.9, 0.1, 0.9); };
  const kerem = choice("partner") === "kerem";
  // asteroitler
  const rocks = [];
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(W.asteroidGeo, W.asteroidMat); m.castShadow = false; Z.group.add(m);
    const r = { m, s: 1 + Math.random() * 4, w: V3(Math.random(), Math.random(), Math.random()) };
    resetRock(r, true); rocks.push(r);
  }
  function resetRock(r, init) {
    r.m.position.set((Math.random() - 0.5) * 110, (Math.random() - 0.5) * 60, init ? -60 - Math.random() * 500 : -520 - Math.random() * 80);
    r.m.scale.setScalar(r.s);
  }
  const fighters = [], lasers = [], bolts = [];
  const esc = kerem ? makeAtlas() : null;
  if (esc) { esc.root.scale.setScalar(0.6); Z.group.add(esc.root); setAtlasThrust(esc, true, 1.2); }
  const ray = new THREE.Raycaster();
  const lgeo = new THREE.BoxGeometry(0.12, 0.12, 4), lmat = new THREE.MeshBasicMaterial({ color: 0x7fd8ff }), bmat = new THREE.MeshBasicMaterial({ color: 0xff5a2a });
  const shoot = (from, dir, list, m, speed) => { const l = new THREE.Mesh(lgeo, m); l.position.copy(from); l.lookAt(from.clone().add(dir)); Z.group.add(l); list.push({ m: l, v: dir.clone().multiplyScalar(speed), life: 2.5 }); };
  say([["Kerem", "Asteroit kuşağına giriyoruz! Kaptan, toplar sende. WASD ile ben yönlendiririm... yani sen yönlendir, ben dua ederim!"],
       ["BİP", "Vorak avcıları peşimizde! Fareyle nişan al, sol tıkla ateş!"]].concat(kerem ? [["Kerem", "(eskort gemisinden) Sağ kanattayım Kaptan! Avcıları ben de vururum!"]] : []));
  tutorial("KOVALAMACA", "<kbd>W A S D</kbd>: gemiyi kaydır. Fare: nişan. <kbd>Sol tık</kbd>: ateş. Asteroitlere çarpma!");
  G.cine = () => ({ pos: V3(st.x * 0.7, st.y * 0.7 + 3.4, 16), look: V3(st.x * 0.9, st.y * 0.9 + 1, -40), fov: 68 });
  watch(dt => {
    if (player.dead) return false;
    // gemi
    const ax = ((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)), ay = ((keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0));
    st.vx = lerp(st.vx, ax * 26, Math.min(1, dt * 4)); st.vy = lerp(st.vy, ay * 18, Math.min(1, dt * 4));
    st.x = clamp(st.x + st.vx * dt, -24, 24); st.y = clamp(st.y + st.vy * dt, -12, 12);
    S.root.position.set(st.x, st.y, 0);
    S.root.rotation.z = -st.vx * 0.02; S.root.rotation.x = st.vy * 0.015;
    if (esc) { esc.root.position.set(st.x + 9, st.y + 2 + Math.sin(G.time) * 1.2, 4); }
    // nişangâh
    const cr = $("shipCross");
    cr.style.left = st.cross.x * 100 + "%"; cr.style.top = st.cross.y * 100 + "%";
    st.fire -= dt;
    if ((mouse.left || (TEST && window.BOT_FIRE)) && st.fire <= 0) {
      st.fire = 0.11;
      ray.setFromCamera({ x: st.cross.x * 2 - 1, y: -(st.cross.y * 2 - 1) }, camera);
      const target = camera.position.clone().addScaledVector(ray.ray.direction, 160);
      for (const s of [-1.3, 1.3]) { const from = V3(st.x + s, st.y - 0.3, -5); shoot(from, target.clone().sub(from).normalize(), lasers, lmat, 260); }
      sfx("laser");
    }
    // asteroitler
    for (const r of rocks) {
      r.m.position.z += dt * 95;
      r.m.rotation.x += r.w.x * dt; r.m.rotation.y += r.w.y * dt;
      if (r.m.position.z > 30) resetRock(r);
      if (r.m.position.distanceTo(S.root.position) < r.s + 2.2) { st.hull -= 14; shake = 0.9; sfx("explosion"); resetRock(r); }
    }
    // avcılar
    st.fT -= dt;
    if (st.fT <= 0 && st.spawned < 16 && st.prog < 0.92) {
      st.fT = 4 + Math.random() * 2; st.spawned++;
      const f = makeVorakShip(0.22); Z.group.add(f.root);
      const fx = { f, hp: 4, ph: Math.random() * 6, z: -320, shot: 1.5 + Math.random() };
      f.root.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 30, -320);
      fighters.push(fx);
    }
    for (const fx of fighters) {
      if (fx.dead) continue;
      fx.ph += dt; fx.z = lerp(fx.z, -55, Math.min(1, dt * 0.6));
      fx.f.root.position.set(st.x * 0.4 + Math.sin(fx.ph * 0.9) * 22, st.y * 0.4 + Math.sin(fx.ph * 1.3) * 10, fx.z);
      fx.f.root.lookAt(S.root.position);
      fx.shot -= dt;
      if (fx.shot <= 0) { fx.shot = 1.4 + Math.random(); const from = fx.f.root.position.clone(); shoot(from, S.root.position.clone().sub(from).normalize(), bolts, bmat, 75); sfx("plasma"); }
    }
    if (esc) {
      st.escT = (st.escT || 1.5) - dt;
      const tgt = fighters.find(f => !f.dead);
      if (tgt && st.escT <= 0) { st.escT = 1.8; const from = esc.root.position.clone(); shoot(from, tgt.f.root.position.clone().sub(from).normalize(), lasers, lmat, 260); }
    }
    // mermiler
    for (const L of lasers) {
      L.life -= dt; L.m.position.addScaledVector(L.v, dt);
      for (const fx of fighters) if (!fx.dead && L.life > 0 && L.m.position.distanceTo(fx.f.root.position) < 3.2) {
        L.life = 0; fx.hp--;
        if (fx.hp <= 0) { fx.dead = true; Z.group.remove(fx.f.root); st.kills++; sfx("explosion"); flashWhite(40); }
      }
      for (const r of rocks) if (L.life > 0 && L.m.position.distanceTo(r.m.position) < r.s + 0.5) { L.life = 0; if (r.s < 2.5) resetRock(r); }
      if (L.life <= 0) Z.group.remove(L.m);
    }
    for (const B of bolts) {
      B.life -= dt; B.m.position.addScaledVector(B.v, dt);
      if (B.life > 0 && B.m.position.distanceTo(S.root.position) < 2.4) { B.life = 0; st.hull -= 7; shake = 0.5; sfx("hurt"); }
      if (B.life <= 0) Z.group.remove(B.m);
    }
    for (const list of [lasers, bolts]) for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
    if (G.admin) st.hull = 100;
    st.prog = Math.min(1, st.prog + dt / 95);
    $("hullFill").style.width = Math.max(0, st.hull) + "%";
    $("shipDist").innerText = `ASTEROİT KUŞAĞI · %${Math.round(st.prog * 100)} · AVCI: ${st.kills}`;
    if (st.hull <= 0) { for (const fx of fighters) Z.group.remove(fx.f.root); die("ATLAS parçalandı."); return true; }
    if (st.prog >= 1) {
      for (const fx of fighters) if (!fx.dead) Z.group.remove(fx.f.root);
      for (const r of rocks) Z.group.remove(r.m);
      if (esc) Z.group.remove(esc.root);
      G.flags.chase = 1;
      G.mouseHook = null;
      say([["Kerem", "Kuşaktan çıktık! Hiper sürücü... ŞİMDİ!"]]);
      sfx("warp"); flashWhite(400);
      later(1.5, () => startChapter(20));
      return true;
    }
    return false;
  });
}

// ================================================================ 20. AY (anteni onar)
function ch20() {
  const Z = G.zones.moon;
  setZone("moon", W.moonLand[0], W.moonLand[1], 0);
  music("tense");
  player.o2 = 100;
  checkpoint(() => startChapter(20, { noCard: true }));
  showArea("Ay", "RÖLE ÜSSÜ");
  const done = [false, false, false];
  goal("Anteni onar (0/3)", 0, -30);
  say([["Kerem", "(telsiz) Üssün yanına indirdim. Düşük yerçekimi, zıplarken dikkat. Oksijenine göz kulak ol."],
       ["BİP", "Anten kafesinde üç arıza var: güç kablosu, sinyal kartı, çanak motoru. Hepsi Vorak işi."]].concat(choice("ksha") === "spare" ? [["Ksha", "(telsiz, BİP) \"Ksha da burada. Küçük gemi. Dronları ben oyalarım.\""]] : []));
  tutorial("AY", "Yerçekimi düşük: daha yükseğe zıplarsın. Oksijen azalırsa üs modüllerinden <kbd>E</kbd> ile doldur.");
  // oksijen istasyonları
  for (const [x, z] of [[-20, 10], [20, 10], [0, 26]]) addInteract(Z, { pos: V3(x, 1.5, z + 5), r: 3, label: () => (G.chapter === 20 || G.chapter === 21) && player.o2 < 95 ? "Oksijen doldur" : null, act: () => { player.o2 = 100; sfx("hiss"); acquired("Oksijen"); } });
  W.antennaSteps.forEach(([x, z, name], i) => {
    addInteract(Z, { pos: V3(x, 1.4, z), r: 2.8, label: () => G.chapter === 20 && !done[i] && !G.flags["antWave" + i] ? "Onar: " + name : null, hold: 3, act: () => {
      done[i] = true; G.flags["antWave" + i] = 1; sfx("power"); acquired(name + " onarıldı");
      const n = done.filter(Boolean).length;
      goal(`Anteni onar (${n}/3)`, 0, -30);
      const waves = [
        [[["hunter", 14, -20], ["hunter", -14, -22], ["drone", 0, -50, 0, 0.5]]],
        [[["brute", 16, -36], ["shooter", -18, -40], ["drone", 10, -10, 0, 0.6]], [["stalker", -10, -12], ["hunter", 12, -44, 0, 0.4]]],
        [[["brute", -16, -30], ["brute", 16, -30, 0, 0.4], ["shooter", 0, -55, 0, 0.8]], [["drone", -12, -50], ["drone", 12, -50], ["stalker", 0, -10, 0, 0.5]]]
      ][n - 1];
      say([["BİP", ["Bir tamam! Ve... dronlar geliyor!", "İki tamam! Daha büyük bir grup iniyor!", "Üçü de tamam! Ama... hepsi geliyor!"][n - 1]]]);
      if (choice("ksha") === "spare") later(4, () => { let k = 0; for (const e of G.enemies) if (!e.dead && e.type === "drone" && k < 1) { damageEnemy(e, 999); k++; } if (k) say([["Ksha", "(BİP) \"Bir dron daha düştü. Ksha iyi nişancı.\""]]); });
      fight(waves, () => {
        if (done.every(Boolean)) {
          const ant = W.antenna;
          let t = 0;
          watch(dt => { t += dt; ant.dish.rotation.y = t * 0.6; ant.tip.material.emissive.setHex(t % 0.5 < 0.25 ? 0x6fd36a : 0x113311); return t > 3; });
          say([["BİP", "Anten çalışıyor! Sinyal Dünya'ya gidiyor... Yüklemeyi bitirmek için bir dakika lazım!"], ["Vorakh", "Küçük gökten düşen. Gözümü açtın. Şimdi... ben seni kapatacağım."]], () => startChapter(21));
        }
      }, { after: "tense" });
    } });
  });
}

// ================================================================ 21. HÜKÜMDAR VORAKH (son boss) — SEÇİM: teslimiyet
function ch21() {
  const Z = G.zones.moon;
  const [ax, az] = W.moonArena;
  if (G.zone !== Z) setZone("moon", ax, az + 18, 0);
  checkpoint(() => startChapter(21, { noCard: true }));
  player.o2 = 100;
  G.o2Drain = 0;
  goal("Hükümdar Vorakh'ı yen");
  const e = spawnEnemy(Z, "brute", ax, az - 14, { rig: makeVorakh(), hp: 2600, r: 2.6, h: 7.5, name: "Vorakh", scrap: 0 });
  e.shieldHp = 0;
  bossBase(e, "HÜKÜMDAR VORAKH");
  e.armor = 0.5;
  e.intro = 4;
  e.phaseText = "Zırhı kalın: göğsündeki çekirdek parladığında vur!";
  const kshaHelp = choice("ksha") === "spare";
  let p66 = false, p33 = false, kshaDone = false;
  // İniş sinematiği
  cinematic([{ wait: "say", lines: [["Vorakh", "Otuz yıldır yıldızları yutuyorum. Mavi gezegen sadece bir lokma."], ["Vorakh", "Gel, gökten düşen. Ay'ın tozunda yat."]],
    start: () => { e.pos.y = Z.ground(e.pos.x, e.pos.z) + 30; },
    tick: dt => { e.pos.y = Math.max(Z.ground(e.pos.x, e.pos.z), e.pos.y - dt * 12); if (e.pos.y <= Z.ground(e.pos.x, e.pos.z) + 0.1 && !e.landed) { e.landed = true; shake = 1.2; sfx("explosion"); } },
    cam: () => ({ pos: V3(ax + 10, 4, az + 14), look: V3(e.pos.x, e.pos.y + 6, e.pos.z) }) }], () => {
    tutorial("BOSS: VORAKH", "Göğsündeki <b>çekirdek</b> parladığında hasar alır (en çok fırlatılan balyozdan). Şok dalgalarından zıpla, kırmızı halkalardan uzak dur.");
  });
  const exposeCore = sec => { e.armor = 1.7; e.coreT = sec; e.phaseText = "ÇEKİRDEK AÇIK! VUR!"; };
  e.onHit = (amt, info) => { if (info.thrown && e.coreT > 0) { e.hp -= amt * 0.4; } };
  e.ai = (e, dt) => {
    if (G.cutscene) return;
    e.pos.y = Z.ground(e.pos.x, e.pos.z);
    if (e.intro > 0) { e.intro -= dt; return; }
    if (e.coreT > 0) { e.coreT -= dt; e.rig.core.material.emissiveIntensity = 3 + Math.sin(G.time * 20) * 2; if (e.coreT <= 0) { e.armor = 0.5; e.phaseText = "Zırhı kalın: göğsündeki çekirdek parladığında vur!"; } }
    else e.rig.core.material.emissiveIntensity = 1;
    const d = distP(e);
    if (!p66 && e.hp < e.maxHp * 0.66) { p66 = true; say([["Vorakh", "Ana gemim! Yağdır!"]]); music("epic"); }
    if (!p33 && e.hp < e.maxHp * 0.33) { p33 = true; say([["Vorakh", "YETER!"]]); fight([[["drone", ax + 14, az], ["drone", ax - 14, az], ["drone", ax, az + 16]]], null); music("epic"); }
    if (kshaHelp && p66 && !kshaDone && e.hp < e.maxHp * 0.5) {
      kshaDone = true;
      say([["Ksha", "(BİP) \"Hükümdar! Ksha artık senin değil!\""], ["BİP", "Ksha'nın gemisi Vorakh'a çarptı! Çekirdeği açıkta!"]]);
      sfx("explosion"); flashWhite(150); shake = 1;
      e.act = { n: "stun", t: 0, len: 5 }; exposeCore(5);
    }
    // ikinci kol çifti hareket etsin
    if (e.rig.extra) for (const x of e.rig.extra) { x.sh.rotation.x = 0.6 + Math.sin(G.time * 2 + x.s) * 0.4; x.el.rotation.x = 0.8; }
    if (e.act) {
      const a = e.act; a.t += dt;
      if (a.n === "stomp") {
        e.state = "windup";
        if (a.t > 1.1 && !a.k) { a.k = 1; shockwave(e.pos.x, e.pos.z, 30, 12, 20, 0xff3a8a); shake = 1; e.lunge = 0.3; if (p33) later(0.7, () => shockwave(e.pos.x, e.pos.z, 30, 12, 20, 0xff3a8a)); }
        if (a.t > 1.4) { e.act = { n: "stun", t: 0, len: 2.4 }; exposeCore(2.4); }
      } else if (a.n === "sweep") {
        e.state = "windup"; if (a.t < 0.9) faceP(e, dt, 2);
        if (a.t > 1.1 && !a.k) {
          a.k = 1; e.lunge = 0.3; sfx("heavy");
          const toP = Math.atan2(-(player.pos.x - e.pos.x), -(player.pos.z - e.pos.z));
          if (distP(e) < 9 && Math.abs(wrapAngle(toP - e.yaw)) < 1.1) hurt(30, "Vorakh'ın pençesi seni savurdu.", e.pos);
        }
        if (a.t > 1.6) e.act = null;
      } else if (a.n === "meteors") {
        e.state = "windup";
        if (!a.spots) {
          a.spots = [];
          const n = kshaDone ? 4 : 7;
          for (let i = 0; i < n; i++) {
            const x = player.pos.x + (i ? (Math.random() - 0.5) * 18 : 0), z = player.pos.z + (i ? (Math.random() - 0.5) * 18 : 0);
            a.spots.push([x, z]); groundRing(x, z, 3.2, 0xff2a2a, 1.7);
          }
          sfx("alarm");
        }
        if (a.t > 1.7 && !a.k) {
          a.k = 1;
          for (const [x, z] of a.spots) {
            const boom = mesh(SPH(3.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.8 }), x, Z.ground(x, z) + 1, z, Z.group);
            later(0.3, () => Z.group.remove(boom));
            if (Math.hypot(player.pos.x - x, player.pos.z - z) < 3.4) hurt(24, "Ana gemiden düşen ateş seni yaktı.", V3(x, 0, z));
          }
          sfx("explosion"); shake = 0.8;
        }
        if (a.t > 2.2) e.act = null;
      } else if (a.n === "stun") {
        e.state = "stun";
        if (a.t > a.len) e.act = null;
      }
      return;
    }
    faceP(e, dt, 2.5);
    e.atkT -= dt;
    if (d > 7) { moveEnemyTo(e, player.pos.x, player.pos.z, dt, p33 ? 1.3 : 1); e.state = "move"; } else e.state = "ready";
    if (e.atkT <= 0) {
      e.atkT = p33 ? 1.3 : 2.0;
      sfx("roar");
      const r = Math.random();
      if (p66 && r < 0.35) e.act = { n: "meteors", t: 0 };
      else if (d < 8 && r < 0.7) e.act = { n: "sweep", t: 0 };
      else e.act = { n: "stomp", t: 0 };
    }
  };
  e.onDeath = () => {
    G.boss = null;
    clearEnemies(); clearProjectiles();
    music("tense");
    // Vorakh dizlerinin üstüne çöker; teslimiyet ister
    const cam = () => ({ pos: V3(player.pos.x + 3, player.pos.y + 2.5, player.pos.z + 5), look: V3(e.pos.x, e.pos.y + 3, e.pos.z) });
    later(1.5, () => cinematic([
      { wait: "say", cam, lines: [["Vorakh", "...Yeter. Yeter, gökten düşen."], ["Vorakh", "Filomu alır giderim. Mavi gezegene bir daha bakmam. Yaşamama izin ver."],
        ["BİP", "Kaptan... Ana gemi geri çekilmeye hazırlanıyor. Karar senin."]] },
      { wait: "choice", chosen: false, cam, start() {
        const self = this;
        ask(["\"Filonu al ve git. Bir daha bu yıldızlara gelme.\"", "\"Tahra'yı otuz yıl yaktın. Bu iş burada biter.\""], i => {
          G.flags.c_vorakh = i === 0 ? "spare" : "end";
          if (i === 0) say([["Kaptan", "Filonu al ve git. Bir daha bu yıldızlara gelme."], ["Vorakh", "...Merhametin tuhaf, gökten düşen. Hatırlayacağım."]], () => { self.chosen = true; });
          else say([["Kaptan", "Tahra'yı otuz yıl yaktın. Bu iş burada biter."], ["Vorakh", "O zaman... ışığım... sönsün..."]], () => { self.chosen = true; });
        });
      } },
      { dur: 4, cam: () => ({ pos: V3(30, 10, 40), look: V3(0, 120, -240) }), start: () => {
        if (G.flags.c_vorakh === "end") { flashWhite(300); sfx("explosion"); e.rig.root.visible = false; }
        else { sfx("warp"); e.rig.root.visible = false; }
      }, tick: (dt, t) => {
        const ms = W.mothership.root;
        if (G.flags.c_vorakh === "spare") { ms.position.y += dt * 40 * t; ms.scale.multiplyScalar(1 - dt * 0.2); }
        else { ms.position.y -= dt * 25; ms.position.z -= dt * 30; ms.rotation.z += dt * 0.2; if (Math.random() < dt * 4) sfx("explosion"); }
      } }
    ], () => {
      W.mothership.root.visible = false;
      G.flags.vorakh = 1;
      say([["Başkan Carter", "(telsiz, cızırtılı) ...ATLAS? ATLAS! Sizi duyuyoruz! Sinyal geldi! Bütün dünya duydu!"], ["Kaptan", "Carter... Eve dönüyoruz."]], () => {
        fadeTo(1);
        later(2, () => startChapter(22));
      });
    }));
  };
}

// ================================================================ 22. DÜNYA (tören, sonlar)
function endingName() {
  const f = G.flags;
  const mercy = (f.c_ksha === "spare") + (f.c_vorakh === "spare");
  const lumi = (f.c_village === "help") + (f.c_rescue === "prisoners");
  if (mercy === 2 && lumi === 2) return "IŞIĞIN DOSTU";
  if (mercy === 0 && lumi === 0) return "DEMİR YUMRUK";
  if (f.c_vorakh === "spare") return "GÖLGEDE BARIŞ";
  if (lumi === 2) return "LUMİ'NİN KAHRAMANI";
  return "EVE DÖNÜŞ";
}
function ch22() {
  const Z = G.zones.nasa;
  setZone("nasa", 0, 30, Math.PI);
  music("calm");
  checkpoint(() => startChapter(22, { noCard: true }));
  const f = G.flags;
  // tören alanı: mürettebat ve Başkan dışarıda
  const C = NPC.carter, K = NPC.keremE, S = NPC.selinE, B = NPC.boraE;
  C.root.position.set(0, 0, 40); faceTo(C, 0, 30);
  K.root.position.set(-3, 0, 34); S.root.position.set(3, 0, 34); B.root.position.set(5.5, 0, 33);
  S.st.sit = false;
  for (const n of [K, S, B]) { faceTo(n, 0, 40); n.st.pose = "salute"; }
  goal("Başkan Carter'ın yanına git", 0, 38);
  onReach("nasa", 0, 38, 3.5, () => {
    for (const n of [K, S, B]) n.st.pose = null;
    const speech = [["Başkan Carter", "Kaptan. Bir antenin onarılması için gönderdik seni. Sen bir gezegenle döndün."]];
    speech.push(f.c_village === "help" ? ["Başkan Carter", "Raporunda Lumi diye bir halk yazıyor. Bir gezegen dolusu yeni dost."] : ["Başkan Carter", "Raporunda yanan bir Lumi köyünden söz ediyorsun. Onlara bir borcumuz var."]);
    speech.push(f.c_rescue === "prisoners" ? ["Başkan Carter", "Kara Kale'deki bütün esirleri kurtarmışsın."] : ["Başkan Carter", "Bir grup Lumi hâlâ kayıp. Onları bulacağız, söz."]);
    speech.push(f.c_ksha === "spare" ? ["Başkan Carter", "Ve bir Vorak'ın, Ksha'nın, sizin için savaştığını okudum. Düşmanına merhamet etmek... bunu az kişi yapar."] : ["Başkan Carter", "Vorak'larla aramızda hâlâ çok kan var."]);
    speech.push(f.c_vorakh === "spare" ? ["Başkan Carter", "Vorakh'ın filosu galaksinin öbür ucuna çekildi. Barış mı, ateşkes mi, zaman gösterecek."] : ["Başkan Carter", "Ana gemi Ay'ın karanlık yüzüne düştü. Vorak filosu dağıldı."]);
    speech.push(["Başkan Carter", "Dünya bunu bilmeyecek belki. Ama ben biliyorum."]);
    const crewLine = [];
    if ((f.bond_kerem || 0) >= 2) crewLine.push(["Kerem", "Söylemiştim, kusursuz iniş! ...Çölü saymazsak."]);
    if ((f.bond_selin || 0) >= 2) crewLine.push(["Selin", "Kaptan, bu sefer gerçekten dinlen. Doktor emri."]);
    if ((f.bond_bora || 0) >= 2) crewLine.push(["Bora", "Balyoza bir isim koymalıyız. \"Bora'nın Harikası\" mesela."]);
    crewLine.push(["BİP", "Bip! Ben de kahramanım. Kimse sormadı ama söylüyorum."]);
    cinematic([
      talkShot(C, speech),
      { wait: "choice", chosen: false, cam: () => ({ pos: V3(4, 2.2, 32), look: V3(0, 1.6, 40) }), start() {
        const self = this;
        ask(["\"Mürettebatım olmasa yapamazdım.\"", "\"Tahra'ya geri döneceğim. Söz verdim.\""], i => {
          f.c_final = i === 0 ? "crew" : "tahra";
          say(i === 0 ? [["Kaptan", "Mürettebatım olmasa yapamazdım."], ["Başkan Carter", "Biliyorum. O yüzden hepinize madalya var."]]
                      : [["Kaptan", "Tahra'ya geri döneceğim. Söz verdim."], ["Başkan Carter", "ATLAS-2 yapım aşamasında. Hazır olduğunda... gemi senin."]], () => { self.chosen = true; });
        });
      } },
      { wait: "say", lines: crewLine, start: () => { for (const n of [K, S, B]) n.st.pose = "cheer"; }, cam: t => ({ pos: V3(Math.sin(t * 0.3) * 10, 3, 30 + Math.cos(t * 0.3) * 4), look: V3(0, 1.4, 36) }) }
    ], credits);
  });
}
function credits() {
  G.ended = true;
  const f = G.flags;
  const roll = $("creditsRoll");
  const end = endingName();
  const epi = [];
  epi.push(f.c_village === "help" ? "Lumi köyünün ağacı her gece parlamaya devam etti." : "Lumi köyü küllerinden yeniden kuruldu.");
  epi.push(f.c_rescue === "prisoners" ? "Kara Kale'nin hücreleri bir daha hiç dolmadı." : "Kayıp Lumi'lerin izi, Vorak'ların eski bir yıldız haritasında görüldü.");
  epi.push(f.c_ksha === "spare" ? "Ksha, Tahra'nın göğünde Lumi'leri koruyan tek Vorak oldu." : "Ksha'nın adı hiçbir kayıtta geçmedi.");
  epi.push(f.c_vorakh === "spare" ? "Vorakh'ın filosu galaksinin kenarında bekliyor. Belki bir gün yine gelecekler." : "Ay'ın karanlık yüzünde, düşmüş bir ana geminin enkazı hâlâ soğuyor.");
  roll.innerHTML = `<div class="s">SON</div><div>${end}</div>` + epi.map(e => `<div style="font-size:19px;font-family:var(--sans);letter-spacing:0">${e}</div>`).join("") +
    `<div class="s">IN A SPACE 2 — TAHRA'NIN GÖLGESİ</div><div>Fikir ve hikâye: Hakan</div><div class="s">KARAKTERLER</div><div>Kaptan · Başkan Carter</div><div>Kerem · Selin · Bora · BİP</div><div>Oru · Mila · Ksha</div><div>Grax · Zhal · Vorakh</div>` +
    `<div class="s">GÖRÜNÜM REFERANSI</div><div>God of War arayüzü (Hakan'ın seçimi)</div><div class="s">TEŞEKKÜRLER</div><div>Oynadığın için</div><div class="s">SERBEST DOLAŞMA AÇILDI</div>`;
  openUI("credits");
  saveGame({ ending: end, done: true });
  let y = innerHeight;
  const dur = TEST ? 0.5 : 34;
  let t = 0;
  visuals.push(function cr(dt) {
    t += dt;
    roll.style.top = (innerHeight - (innerHeight + roll.offsetHeight) * Math.min(1, t / dur)) + "px";
    if (t > dur + 1) { visuals.splice(visuals.indexOf(cr), 1); $("credits").style.display = "none"; G.uiOpen = null; startChapter(23); }
  });
}

// ================================================================ SERBEST DOLAŞMA
function chFree() {
  setZone("tahra", 8, 18, Math.PI);
  G.freeRoam = true;
  for (const p of ["wingL", "wingR", "engine"]) W.wreck.parts[p].visible = true;
  G.flags.smokeOff = 1;
  showCampCrew();
  for (const l of NPC.villagers) l.st.happy = true;
  music("calm");
  checkpoint(() => setZone("tahra", 8, 18, Math.PI));
  const upd = () => goal(`Serbest dolaşma — Lumi fenerleri: ${lanternCount()}/12`);
  upd();
  say([["BİP", "Tahra'ya geri döndük! Söz verdiğin gibi. Lumi fenerleri hâlâ dağınık, Vorak artıkları da ortalıkta dolaşıyor."]]);
  let t = 20;
  watch(dt => {
    upd();
    if (G.zone.name !== "tahra") return false;
    t -= dt;
    if (t <= 0 && aliveEnemies().length < 3) {
      t = 45;
      const a = Math.random() * Math.PI * 2, x = clamp(player.pos.x + Math.cos(a) * 40, -250, 250), z = clamp(player.pos.z + Math.sin(a) * 40, -250, 250);
      if (Math.hypot(x - W.village.x, z - W.village.z) > 40 && Math.hypot(x, z) > 30) {
        const types = ["hunter", "shooter", "brute", "drone", "stalker"];
        fight([[[types[Math.floor(Math.random() * 5)], x, z], [types[Math.floor(Math.random() * 5)], x + 3, z + 2], ["hunter", x - 3, z, 0, 0.5]]], null, { quiet: true });
      }
    }
    return false;
  });
}

CHAPTERS.push(
  { name: "Pilot Kerem", start: ch9 }, { name: "Doktor Selin", start: ch10 }, { name: "Mühendis Bora", start: ch11 },
  { name: "Lumi Köyü", start: ch12 }, { name: "Bekçi Grax", start: ch13 }, { name: "Sinyal", start: ch14 },
  { name: "Sızma", start: ch15 }, { name: "Kurtarma", start: ch16 }, { name: "Komutan Zhal", start: ch17 },
  { name: "Tamir", start: ch18 }, { name: "Kovalamaca", start: ch19 }, { name: "Ay", start: ch20 },
  { name: "Hükümdar Vorakh", start: ch21 }, { name: "Dünya", start: ch22 }, { name: "Serbest Dolaşma", start: chFree }
);

// ================================================================ açılış
function resetGame() {
  G.flags = {}; G.scrap = 0; G.up = { dmg: 0, hp: 0, throw: 0, bip: 0 }; G.stats = { deaths: 0, kills: 0 };
}
function begin(n, fromSave) {
  $("titleScreen").style.display = "none";
  $("chapterScreen").style.display = "none";
  G.running = true;
  lockPointer();
  startChapter(n);
}
function boot() {
  makeCast();
  makeInteractions();
  $("loading").style.display = "none";
  fadeTo(0);
  setZone("nasa", 0, 30, Math.PI);       // menü arkasında NASA görünsün
  G.cine = () => ({ pos: V3(Math.sin(performance.now() / 9000) * 40, 14, 60 + Math.cos(performance.now() / 9000) * 30), look: V3(0, 8, 0) });
  const save = loadSave();
  if (save && save.chapter) {
    $("btnContinue").style.display = "block";
    $("btnContinue").innerText = `DEVAM ET — BÖLÜM ${save.chapter}: ${CHAPTERS[save.chapter - 1].name.toLocaleUpperCase("tr")}`;
  }
  $("btnContinue").onclick = () => {
    const s = loadSave();
    resetGame();
    Object.assign(G.flags, s.flags || {}); G.scrap = s.scrap || 0; Object.assign(G.up, s.up || {}); Object.assign(G.stats, s.stats || {});
    G.cine = null;
    begin(s.chapter, true);
  };
  $("btnNew").onclick = () => { resetGame(); G.cine = null; begin(1); };
  $("btnChapters").onclick = () => {
    const s = loadSave() || {};
    const reached = TEST || G.admin ? 23 : Math.max(1, s.reached || 1);
    const box = $("chapterList");
    box.innerHTML = "";
    CHAPTERS.forEach((c, i) => {
      if (i + 1 > reached) return;
      const b = document.createElement("button");
      b.textContent = `${i + 1}. ${c.name}`;
      b.onclick = () => { resetGame(); if (s.flags) Object.assign(G.flags, s.flags); G.scrap = s.scrap || 0; if (s.up) Object.assign(G.up, s.up); G.cine = null; begin(i + 1); };
      box.appendChild(b);
    });
    $("titleScreen").style.display = "none";
    $("chapterScreen").style.display = "flex";
  };
  $("btnChBack").onclick = () => { $("chapterScreen").style.display = "none"; $("titleScreen").style.display = "flex"; };
  $("btnCheckpoint").onclick = () => { closeUI(); respawn(); };
  $("btnQuit").onclick = () => location.reload();
  G.running = false;
  // menüde de kamera dönsün
  visuals.push(() => { if (!G.running && G.cine) updateCamera(0); });
}
boot();
