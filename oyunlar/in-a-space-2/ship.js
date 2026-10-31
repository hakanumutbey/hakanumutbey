// IN A SPACE 2 — ATLAS'ın içi (Hakan: "uzay gemisine giremiyorum ... gemiye hiç giriş yok, olsun istiyorum").
// Kokpit, mürettebat bölümü, kargo/tezgâh. Kazadan sonra (5. bölüm, BİP onarılınca) enkazın kapısından girilir;
// gemi tamir edilene kadar içi hasarlı (kırmızı acil ışık, kıvılcım, devrik eşyalar) ve kokpit eksik parçaları
// sayar. Tamirden sonra (serbest dolaşma) kokpitten Tahra, Ay ve Dünya arasında uçulur.
"use strict";

(function buildAtlasInterior() {
  const Z = makeZone("atlas", {
    title: "ATLAS", bg: 0x05070a, fog: 0, speed: 3.6, jump: 4.2, killY: -10, ground: () => 0,
    sunDir: [0.2, 1, 0.1], sunColor: 0xffffff, sunIntensity: 0.15, hemiSky: 0x9fb8d0, hemiGround: 0x30302c, hemiIntensity: 0.45, exposure: 1.1,
    ceil: () => 3.7
  });
  const HULL = mat(0xd9d6cf, { roughness: 0.6 }), DARK = mat(0x2a2e36, { metalness: 0.5, roughness: 0.5 }), ORANGE = mat(0xff8a2a), FLOOR = mat(0x4a4e56, { roughness: 0.8 });
  const H = 4;
  // zemin, tavan, dış duvarlar (x -5..5, z -16..12)
  const fl = mesh(new THREE.PlaneGeometry(10, 28), FLOOR, 0, 0.01, -2, Z.group); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  for (let z = -15; z < 12; z += 2) mesh(BOX(9.6, 0.02, 0.08), mat(0x6a6e76), 0, 0.03, z, Z.group).castShadow = false;
  mesh(BOX(10.4, 0.3, 28.4), HULL, 0, 3.95, -2, Z.group);
  for (let z = -14; z < 12; z += 3) mesh(BOX(9.8, 0.2, 0.3), DARK, 0, 3.7, z, Z.group);   // tavan kirişleri
  addBox(Z, -5.2, 0, -2, 0.4, H, 28.4, HULL, true);
  addBox(Z, 5.2, 0, -2, 0.4, H, 28.4, HULL, true);
  addBox(Z, 0, 0, -16.2, 10.4, H, 0.4, HULL, true);
  addBox(Z, 0, 0, 12.2, 10.4, H, 0.4, HULL, true);
  for (const s of [-1, 1]) mesh(BOX(0.06, 0.12, 27.6), ORANGE, s * 4.98, 1.2, -2, Z.group);
  // bölmeler: kokpit | salon (z=-9), salon | kargo (z=3); ortada kapı boşluğu
  for (const z of [-9, 3]) {
    addBox(Z, -3.25, 0, z, 3.5, H, 0.3, HULL, true);
    addBox(Z, 3.25, 0, z, 3.5, H, 0.3, HULL, true);
    mesh(BOX(3, 0.6, 0.3), HULL, 0, 3.5, z, Z.group);
    mesh(BOX(3.1, 0.08, 0.34), ORANGE, 0, 3.15, z, Z.group);
  }
  textSign(Z, "KOKPİT", 0, 2.85, -8.82, 0, 1.6, 0.35, "#ffb43c");
  textSign(Z, "KARGO", 0, 2.85, 3.18, Math.PI, 1.6, 0.35, "#ffb43c");

  // ---- kokpit: ön camlar, konsol, iki koltuk
  const winMat = new THREE.MeshBasicMaterial({ color: 0x9fb8b8 });
  const win = mesh(new THREE.PlaneGeometry(8.4, 1.8), winMat, 0, 2.3, -15.95, Z.group); win.castShadow = false;
  for (const x of [-2.8, 0, 2.8]) mesh(BOX(0.18, 1.9, 0.1), DARK, x, 2.3, -15.9, Z.group);
  addBox(Z, 0, 0, -15, 9, 1.1, 1.4, DARK, true);
  const screens = [];
  for (let i = -3; i <= 3; i++) {
    const s = mesh(BOX(0.9, 0.5, 0.04), glowMat(0x2a8ac0, 0.9), i * 1.2, 1.35, -14.35, Z.group);
    s.rotation.x = -0.5; screens.push(s);
  }
  for (const x of [-1.8, 1.8]) {
    addBox(Z, x, 0, -12.6, 1.1, 0.55, 1.1, mat(0x30343c), true, { top: 0.55 });
    mesh(BOX(1.1, 1.3, 0.25), mat(0x30343c), x, 1.2, -12.05, Z.group);
  }
  W.cockpitConsole = [0, -14];
  // ---- salon: masa, ranzalar, revir, dolaplar
  addBox(Z, 0, 0, -3, 2.4, 0.8, 3.4, mat(0x50545c, { metalness: 0.4 }), true);
  mesh(CYL(0.6, 0.6, 0.04, 20), glowMat(0x7fd8ff, 0.6), 0, 0.84, -3, Z.group);       // masada hologram tablası
  const holo = mesh(SPH(0.45, 16, 10), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, wireframe: true, transparent: true, opacity: 0.6 }), 0, 1.5, -3, Z.group);
  visuals.push(dt => { holo.rotation.y += dt * 0.6; });
  for (const z of [-7, -4.4, -1.8]) {
    addBox(Z, -4.2, 0, z, 1.4, 0.6, 2.2, mat(0x3a4a6a), true);
    mesh(BOX(1.4, 0.15, 2.2), mat(0xe8e4dc), -4.2, 0.68, z, Z.group);
    mesh(BOX(1.4, 0.08, 2.2), DARK, -4.2, 2.1, z, Z.group);
  }
  addBox(Z, 4.2, 0, -6.5, 1.4, 0.9, 2.4, mat(0xeeeeee), true);                            // revir yatağı
  mesh(BOX(0.6, 0.8, 0.1), glowMat(0x6fd36a, 0.8), 4.6, 1.8, -7.6, Z.group);
  textSign(Z, "REVİR", 4.85, 2.6, -6.5, -Math.PI / 2, 1.2, 0.3, "#ff9fc4");
  for (const z of [-2.5, -0.5, 1.5]) addBox(Z, 4.6, 0, z, 0.7, 2.6, 1.8, mat(0x707880), true);
  // ---- kargo: sandıklar, tezgâh, kapı
  for (const [x, z, s] of [[-3.6, 5, 1.2], [-3.4, 6.6, 1], [-3.8, 9.5, 1.4], [3.7, 10, 1.1]]) addBox(Z, x, 0, z, s, s, s, mat(0x8a6a3a), true);
  addBox(Z, 3.8, 0, 6, 1.6, 0.95, 2.6, mat(0x50545c, { metalness: 0.6 }), true);
  mesh(BOX(1.2, 0.05, 0.6), glowMat(0xffb43c, 0.8), 3.8, 1.0, 6, Z.group);
  W.atlasBench = [3.8, 6];
  const hatch = mesh(BOX(2.6, 2.9, 0.2), mat(0x8a8f99, { metalness: 0.6 }), 0, 1.45, 11.95, Z.group);
  mesh(BOX(2.8, 0.12, 0.25), ORANGE, 0, 2.95, 11.95, Z.group);
  mesh(BOX(0.25, 0.25, 0.05), glowMat(0x6fd36a, 2), 1.6, 1.4, 11.85, Z.group);
  W.atlasHatch = [0, 11];

  // ---- ışıklar: hasarlıyken kırmızı acil ışık + kıvılcım; tamirden sonra beyaz
  const lights = [-12, -4, 7].map(z => { const l = new THREE.PointLight(0xfff2dc, 1, 14); l.position.set(0, 3.3, z); Z.group.add(l); return l; });
  const debris = [];
  for (const [x, z, r] of [[-1.5, -5.5, 0.6], [2, 0.5, 1.1], [-2.6, 8, 0.3], [1.2, -11, 0.9]]) {
    const d = mesh(BOX(1.2, 0.15, 0.6), HULL, x, 0.1, z, Z.group); d.rotation.set(0.2, r, 0.3); debris.push(d);
  }
  const sparks = [];
  for (let i = 0; i < 12; i++) { const s = mesh(BOX(0.04, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xffd36a }), 3, 2, -14, Z.group); s.castShadow = false; sparks.push({ s, v: V3(), t: 9 }); }
  const repaired = () => G.chapter >= 18;
  visuals.push(dt => {
    if (!Z.group.visible) return;
    const ok = repaired();
    for (const d of debris) d.visible = !ok;
    for (const [i, l] of lights.entries()) {
      if (ok) { l.color.setHex(0xfff2dc); l.intensity = 1; }
      else { l.color.setHex(0xff3a2a); l.intensity = 0.6 + Math.sin(G.time * 3 + i) * 0.3 + (Math.random() < 0.03 ? -0.5 : 0); }
    }
    for (const s of screens) s.material.emissiveIntensity = ok ? 0.9 : (Math.random() < 0.1 ? 0 : 0.25);
    for (const p of sparks) {
      p.t += dt;
      if (p.t > 0.8 && !ok && Math.random() < 0.08) { p.t = 0; p.s.position.set(2.8, 1.6, -14.2); p.v.set((Math.random() - 0.5) * 3, Math.random() * 2, Math.random() * 2); }
      p.s.visible = !ok && p.t < 0.8;
      if (p.s.visible) { p.v.y -= 9 * dt; p.s.position.addScaledVector(p.v, dt); }
    }
    // camdan görünen gökyüzü bulunduğun yere göre
    winMat.color.setHex(G.atlasFrom ? ({ tahra: 0x7d9aa3, moon: 0x05060a, nasa: 0x9cc3e6 }[G.atlasFrom.zone] || 0x05060a) : 0x7d9aa3);
  });

  // ---- içerideki mürettebat (serbest dolaşmada)
  W.atlasCrew = {
    kerem: makeNPC(Z, { helmet: false, skin: 0xd8a27a, hair: 0x1a1410 }, -1.8, -12.6, 0),
    selin: makeNPC(Z, { helmet: false, skin: 0xe0b08a, hair: 0x5a2a1a, hairStyle: "long" }, 3.4, -6.5, Math.PI / 2),
    bora: makeNPC(Z, { helmet: false, skin: 0xb8865e, hair: 0x2a2a2a, hairStyle: "bald" }, 2.6, 6, -Math.PI / 2)
  };
  W.atlasCrew.kerem.st.sit = true;
  W.atlasCrew.kerem.root.position.y = 0.05;
  visuals.push(() => { for (const k in W.atlasCrew) W.atlasCrew[k].root.visible = G.chapter >= 23 && !!G.flags[k]; });

  // ---- dışarıdaki ATLAS'lar: serbest dolaşmada Ay'da ve NASA'da park etmiş gemi (oradan geri binilir)
  W.parked = {};
  for (const [zone, x, z, yaw] of [["moon", 14, 52, 0.4], ["nasa", 18, 64, -0.5]]) {
    const a = makeAtlas(); setAtlasThrust(a, false);
    a.root.position.set(x, G.zones[zone].ground(x, z) + 1.5, z); a.root.rotation.y = yaw;
    G.zones[zone].group.add(a.root);
    for (const s of [-1, 1]) mesh(CYL(0.12, 0.2, 1.6, 6), DARK, x + s * 1.4, G.zones[zone].ground(x, z) + 0.7, z + 1, G.zones[zone].group);
    const c = boxCollider(G.zones[zone], x, z, 5, 11, { h: G.zones[zone].ground(x, z) + 3.5 });
    W.parked[zone] = { a, x, z, yaw, c };
  }
  // yalnızca serbest dolaşmada orada (Ay bölümlerinde görünmez bir duvar olmasın)
  visuals.push(() => { for (const k in W.parked) { const on = G.chapter >= 23; W.parked[k].a.root.visible = on; W.parked[k].c.on = on; } });
})();

// ---------------------------------------------------------------- giriş / çıkış
function enterAtlas(fromZone, x, z, yaw) {
  G.atlasFrom = { zone: fromZone, x, z, yaw };
  fadeTo(1);
  sfx("door");
  later(0.6, () => {
    setZone("atlas", 0, 9.5, 0);
    fadeTo(0);
    sfx("hiss");
    if (!G.flags.atlasSeen) {
      G.flags.atlasSeen = 1;
      say(G.chapter >= 18
        ? [["BİP", "Ev, tatlı ev! Kokpitten nereye istersen uçabiliriz, Kaptan."]]
        : [["BİP", "ATLAS... İçi berbat ama çökmedi. Kokpit konsolu hangi parçaların eksik olduğunu gösterir."], ["BİP", "Kargoda yedek bir tezgâh da var. Hurdan varsa yükseltme yapabilirsin."]]);
    }
  });
}
function exitAtlas() {
  const f = G.atlasFrom || { zone: "tahra", x: 3.6, z: 8, yaw: Math.PI };
  fadeTo(1);
  sfx("door");
  later(0.6, () => { setZone(f.zone, f.x, f.z, f.yaw); fadeTo(0); sfx("hiss"); });
}
// Uçuş: tamirden sonra kokpitten (serbest dolaşmada)
const FLIGHTS = [
  { zone: "tahra", name: "Tahra — Kamp", x: 3.6, z: 9, yaw: Math.PI },
  { zone: "moon", name: "Ay — Röle Üssü", x: 14, z: 44, yaw: 0 },
  { zone: "nasa", name: "Dünya — NASA Merkezi", x: 18, z: 56, yaw: 0 }
];
function openFlight() {
  openUI("travelScreen");
  $("travelScreen").querySelector("h2").innerText = "UÇUŞ ROTASI";
  $("travelScreen").querySelector(".sub").innerText = "ATLAS";
  const box = $("travelList");
  box.innerHTML = "";
  for (const d of FLIGHTS) {
    const b = document.createElement("button");
    b.textContent = d.name + (G.atlasFrom && G.atlasFrom.zone === d.zone ? "  (buradasın)" : "");
    b.onclick = () => { closeUI(); fly(d); };
    box.appendChild(b);
  }
}
// openTravel (ışık taşları) başlığı geri koysun
const _openTravel = openTravel;
openTravel = function () {
  _openTravel();
  $("travelScreen").querySelector("h2").innerText = "IŞIK TAŞLARI";
  $("travelScreen").querySelector(".sub").innerText = "HIZLI YOLCULUK";
};
function fly(d) {
  if (G.atlasFrom && G.atlasFrom.zone === d.zone) { exitAtlas(); return; }
  G.cutscene = true;
  say([["Kerem", ["Rota girildi. Tutunun!", "Motorlar sıcak, gidiyoruz!", "Kemerler! Bu sefer ciddiyim."][Math.floor(Math.random() * 3)]]]);
  sfx("power");
  shake = 0.6;
  later(1.6, () => { sfx("warp"); flashWhite(250); fadeTo(1); });
  later(2.6, () => {
    G.cutscene = false;
    G.atlasFrom = { zone: d.zone, x: d.x, z: d.z, yaw: d.yaw };
    fadeTo(0);
    say([["BİP", { tahra: "Tahra'ya indik. Lumi'ler el sallıyor!", moon: "Ay'a indik. Oksijenine dikkat, Kaptan.", nasa: "Dünya! Hava gerçek hava. Bip!" }[d.zone]]]);
  });
}

// ---------------------------------------------------------------- etkileşimler
(function shipInteractions() {
  const A = G.zones.atlas, T = G.zones.tahra;
  // Tahra: enkazın / tamir edilmiş geminin yan kapısı
  addInteract(T, {
    pos: V3(3.4, T.ground(3.4, 3) + 1.3, 3), r: 3,
    label: () => G.zone === T && G.chapter >= 5 && G.chapter !== 18 && G.flags.bip && !G.cutscene ? "ATLAS'a gir" : null,
    act: () => enterAtlas("tahra", 3.6, 8.5, Math.PI)
  });
  for (const k in W.parked) {
    const p = W.parked[k], Zk = G.zones[k];
    addInteract(Zk, {
      pos: V3(p.x, Zk.ground(p.x, p.z - 6.5) + 1.5, p.z - 6.5), r: 3.2,
      label: () => G.chapter >= 23 ? "ATLAS'a gir" : null,
      act: () => enterAtlas(k, p.x, p.z - 8, 0)
    });
  }
  // içeride: kapı, kokpit, tezgâh, mürettebat
  addInteract(A, { pos: V3(W.atlasHatch[0], 1.3, W.atlasHatch[1]), r: 2.8, label: () => "Dışarı çık", act: exitAtlas });
  addInteract(A, {
    pos: V3(W.cockpitConsole[0], 1.3, W.cockpitConsole[1]), r: 3,
    label: () => G.chapter >= 23 ? "Uçuş rotası seç" : "Kokpit konsolu",
    act: () => {
      if (G.chapter >= 23) { openFlight(); return; }
      const f = G.flags, m = x => x ? "TAMAM" : "EKSİK";
      say([["BİP", `Durum raporu: Motor ${m(f.engine)}, kanat ${m(f.wing)}, iletişim modülü ${m(f.comm)}, hiper sürücü ${m(f.drive)}.`],
           ["BİP", f.engine && f.wing && f.comm && f.drive ? "Her şey yerinde! Kerem'e söyle, kalkışa hazırız." : "Bunlar olmadan ATLAS kalkamaz. Eksikleri toplamamız lazım."]]);
    }
  });
  addInteract(A, { pos: V3(W.atlasBench[0], 1.2, W.atlasBench[1]), r: 2.6, label: () => G.flags.bench ? "Tezgâh (yükseltme)" : null, act: openUpgrade });
  const crewLines = {
    kerem: [["Kerem", "Pilot koltuğu, kahve ve sonsuz uzay. Başka bir şey istemem. ...Belki biraz daha kahve."]],
    selin: [["Selin", "Revir her zaman açık. Ama lütfen bu sefer yaralanmadan dön."]],
    bora: [["Bora", "Tezgâh senin, hurda senin, deha benim. Ortaklık bu."]]
  };
  for (const k in W.atlasCrew) addInteract(A, {
    pos: W.atlasCrew[k].root.position.clone().setY(1.4), r: 2.6,
    label: () => W.atlasCrew[k].root.visible ? "Konuş: " + k[0].toUpperCase() + k.slice(1) : null,
    act: () => cinematic([talkShot(W.atlasCrew[k], crewLines[k])])
  });
  // Ay'daki oksijen istasyonları serbest dolaşmada da (20–21. bölümdekiler o bölümlerde ayrıca kurulur)
  for (const [x, z] of [[-20, 10], [20, 10], [0, 26]]) addInteract(G.zones.moon, {
    pos: V3(x, 1.5, z + 5), r: 3, label: () => G.chapter >= 23 && player.o2 < 95 ? "Oksijen doldur" : null,
    act: () => { player.o2 = 100; sfx("hiss"); acquired("Oksijen"); }
  });
  // enkazın yan kapısı görünsün (nereden girileceği anlaşılsın)
  const door = mesh(BOX(0.12, 1.9, 1.3), mat(0x8a8f99, { metalness: 0.6 }), 2.75, T.ground(2.75, 3) + 1.15, 3, T.group);
  mesh(BOX(0.14, 0.2, 0.2), glowMat(0x6fd36a, 2), 2.8, T.ground(2.8, 3) + 1.4, 3.75, T.group);
  visuals.push(() => { door.visible = G.chapter >= 5; });
})();
