// IN A SPACE 2 — dünya: NASA merkezi (Dünya), uzay (sinematikler), Tahra gezegeni (açık dünya: kaza yeri,
// Demir Zirve, Rüzgâr Kanyonu, Işıltı Mağarası, Kızıl Kumlar, Ayaz Ovası, Fener Ormanı, Lumi Köyü, Kara Kale),
// kovalamaca (asteroit kuşağı) ve Ay. Hikâye mantığı story.js'te; burada yalnızca yerler ve konumlar (W).
"use strict";

const W = {};                 // story.js'in kullandığı önemli konumlar
G.hitTargets = [];            // balyozla vurulabilen nesneler (çiçekler, hedefler, düğmeler)

// ---------------------------------------------------------------- yardımcılar
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  return t;
}
function addBox(zone, x, y, z, w, h, d, m, solid, extra) {
  const o = mesh(BOX(w, h, d), m, x, y + h / 2, z, zone.group);
  if (solid) boxCollider(zone, x, z, w, d, Object.assign({ h: y + h }, extra || {}));
  return o;
}
function textSign(zone, text, x, y, z, rotY, w, h, color, bg) {
  const tex = canvasTex(512, 128, (g, W2, H2) => {
    g.fillStyle = bg || "#101820"; g.fillRect(0, 0, W2, H2);
    g.fillStyle = color || "#e9e4d8"; g.font = "bold 64px 'Barlow Condensed', Arial"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, W2 / 2, H2 / 2 + 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 4, h || 1), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z); m.rotation.y = rotY || 0;
  zone.group.add(m);
  return m;
}
function skyDome(zone, top, hor, bottom, r) {
  const geo = new THREE.SphereGeometry(r || 1500, 32, 16);
  const cols = [], pos = geo.attributes.position, cT = new THREE.Color(top), cH = new THREE.Color(hor), cB = new THREE.Color(bottom || hor);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / (r || 1500);
    const c = y > 0 ? cH.clone().lerp(cT, Math.pow(y, 0.6)) : cH.clone().lerp(cB, Math.min(1, -y * 3));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  zone.group.add(m);
  visuals.push(() => { if (zone.group.visible) m.position.set(player.pos.x, 0, player.pos.z); });
  return m;
}
function starField(zone, n, r, size) {
  const g = new THREE.BufferGeometry(), p = [];
  const R = rng(7);
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    p.push(Math.cos(a) * s * r, u * r, Math.sin(a) * s * r);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: size || 1.6, sizeAttenuation: false, fog: false }));
  zone.group.add(pts);
  return pts;
}
// Gezegen/küre dokusu (Dünya, Ay, gökyüzündeki gezegenler)
function planetTex(kind) {
  return canvasTex(512, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = vnoise(x / 40, y / 40) * 0.6 + vnoise(x / 12, y / 12) * 0.3 + vnoise(x / 4, y / 4) * 0.1;
      let r, gg, b;
      if (kind === "earth") {
        const lat = Math.abs(y / h - 0.5) * 2;
        if (lat > 0.85) { r = gg = b = 240; }
        else if (n > 0.55) { r = 70 + n * 60; gg = 120 + n * 50; b = 60; if (n > 0.7) { r = 150; gg = 130; b = 90; } }
        else { r = 20; gg = 60 + n * 60; b = 140 + n * 80; }
        const cl = vnoise(x / 18 + 50, y / 9);
        if (cl > 0.62) { const k = (cl - 0.62) * 3; r = lerp(r, 255, k); gg = lerp(gg, 255, k); b = lerp(b, 255, k); }
      } else if (kind === "moon") { const v = 120 + n * 100 - (vnoise(x / 6, y / 6) > 0.8 ? 40 : 0); r = gg = b = v; }
      else if (kind === "tahra") { r = 60 + n * 80; gg = 110 + n * 70; b = 120 + n * 60; }
      else { r = 150 + n * 80; gg = 80 + n * 40; b = 140 + n * 60; }
      const i = (y * w + x) * 4;
      img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}
function sphereBody(zone, kind, r, x, y, z, emissive) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), new THREE.MeshStandardMaterial({ map: planetTex(kind), roughness: 0.9,
    emissive: emissive || 0x000000, emissiveIntensity: 0.25, fog: false }));
  m.position.set(x, y, z);
  zone.group.add(m);
  return m;
}
// Yükseklik alanından arazi örgüsü (renk fonksiyonu köşe renkleri verir)
function terrain(zone, size, segs, cx, cz, colorFn) {
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx, z = pos.getZ(i) + cz;
    const y = zone.ground(x, z);
    pos.setY(i, y);
    const c = colorFn(x, y, z);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.position.set(cx, 0, cz);
  m.receiveShadow = true;
  zone.group.add(m);
  return m;
}
// Örnekli (instanced) nesneler: çok sayıda ağaç/kaya/çimen tek çizimle
function instanced(zone, geo, m, items, shadow) {
  const im = new THREE.InstancedMesh(geo, m, items.length);
  const d = new THREE.Object3D();
  items.forEach((it, i) => {
    d.position.set(it[0], it[1], it[2]);
    d.rotation.set(it[5] || 0, it[3] || 0, 0);
    d.scale.setScalar(it[4] || 1);
    if (it[6]) d.scale.y *= it[6];
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  });
  im.castShadow = shadow !== false;
  im.receiveShadow = true;
  zone.group.add(im);
  return im;
}
// Tırmanılabilir kaya: görsel kaya + üstüne çıkılan, W ile tırmanılan çarpıştırıcı (1'den)
function rockPillar(zone, x, z, w, d, top, color, climb, base) {
  const b = base !== undefined ? base : zone.ground(x, z) - 2;
  const h = top - b;
  const m = mesh(BOX(w, h, d), mat(color || 0x5a5a62, { roughness: 1 }), x, b + h / 2, z, zone.group);
  // kaya yüzeyine tutunma çizgileri (tırmanılabilir olduğu anlaşılsın)
  if (climb !== false) for (let y = b + 2; y < top - 0.5; y += 1.6) {
    for (const [ox, oz, rw, rd] of [[0, -d / 2 - 0.05, w * 0.7, 0.12], [0, d / 2 + 0.05, w * 0.7, 0.12], [-w / 2 - 0.05, 0, 0.12, d * 0.7], [w / 2 + 0.05, 0, 0.12, d * 0.7]]) {
      mesh(BOX(rw, 0.12, rd), mat(0x8a8478), x + ox, y + hash2(x + y, z) * 0.5, z + oz, zone.group).castShadow = false;
    }
  }
  return boxCollider(zone, x, z, w, d, { top, climb: climb !== false, base: b });
}
function fireLight(zone, x, z, color) {
  const y = zone.ground(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); zone.group.add(g);
  for (let i = 0; i < 5; i++) { const l = mesh(CYL(0.08, 0.1, 0.9, 5), mat(0x3a2a1a), Math.cos(i) * 0.25, 0.1, Math.sin(i) * 0.25, g); l.rotation.z = Math.PI / 2; l.rotation.y = i; }
  const f = mesh(new THREE.ConeGeometry(0.35, 0.9, 8), new THREE.MeshBasicMaterial({ color: color || 0xffa040, transparent: true, opacity: 0.85 }), 0, 0.55, 0, g);
  f.castShadow = false;
  const l = new THREE.PointLight(color || 0xffa040, 1.6, 12); l.position.y = 1; g.add(l);
  visuals.push(dt => { if (zone.group.visible) { f.scale.y = 0.85 + Math.random() * 0.35; l.intensity = 1.4 + Math.random() * 0.4; } });
  return { x, z, g };
}

// ================================================================ 1) NASA MERKEZİ (Dünya)
(function buildNasa() {
  const Z = makeZone("nasa", {
    title: "NASA Merkezi", bg: 0x9cc3e6, fog: 0.0045, fogColor: 0xb8d0e4, speed: 4.2, sunDir: [0.4, 0.9, 0.3],
    sunColor: 0xfff2dc, sunIntensity: 1.3, hemiSky: 0xcfe4ff, hemiGround: 0x4a5a3a, hemiIntensity: 0.6, exposure: 1.05, killY: -20
  });
  skyDome(Z, 0x3d7fc4, 0xcfe0ee, 0x6a7a5a);
  // zemin: çim + beton yollar
  const gr = mesh(new THREE.PlaneGeometry(600, 600), mat(0x5c7a3c, { roughness: 1 }), 0, -0.02, 60, Z.group); gr.rotation.x = -Math.PI / 2; gr.castShadow = false;
  const road = mesh(new THREE.PlaneGeometry(10, 190), mat(0x8a8a86), 0, 0, 95, Z.group); road.rotation.x = -Math.PI / 2; road.castShadow = false;
  const plaza = mesh(new THREE.PlaneGeometry(70, 40), mat(0x9a9894), 0, 0.01, 34, Z.group); plaza.rotation.x = -Math.PI / 2; plaza.castShadow = false;
  // uzak ağaçlar ve binalar (ufuk)
  const R = rng(3), trees = [];
  for (let i = 0; i < 160; i++) { const a = R() * Math.PI * 2, d = 90 + R() * 160; trees.push([Math.cos(a) * d, 0, 60 + Math.sin(a) * d, R() * 6, 0.8 + R() * 0.8]); }
  instanced(Z, new THREE.ConeGeometry(2.2, 7, 7).translate(0, 4.5, 0), mat(0x2f5a2a), trees);
  instanced(Z, CYL(0.3, 0.4, 2, 6).translate(0, 1, 0), mat(0x4a3424), trees);
  for (const [x, z, w, h, d] of [[-60, -30, 30, 18, 20], [60, -20, 26, 26, 24], [-70, 60, 20, 12, 40], [70, 70, 24, 16, 30]]) addBox(Z, x, 0, z, w, h, d, mat(0xd8d4cc), true);

  // ---- ana bina: lobi (x -22..22, z -14..14), kuzeyde Başkan'ın ofisi, batıda giysi odası, doğuda mürettebat salonu
  const WALL = mat(0xe4e0d8, { roughness: 0.9 }), TRIM = mat(0x2a3a5a), FLOOR = mat(0xb9b5ae, { roughness: 0.6 }), GLASS = new THREE.MeshStandardMaterial({ color: 0x9fc7e6, transparent: true, opacity: 0.35, metalness: 0.5 });
  const H = 8;
  const wallX = (z, x1, x2, gaps) => { // z sabit duvar, x1..x2, boşluklar [[a,b]]
    let s = x1;
    for (const [a, b] of (gaps || []).concat([[x2, x2]])) { if (a > s) addBox(Z, (s + a) / 2, 0, z, a - s, H, 0.5, WALL, true); s = b; }
  };
  const wallZ = (x, z1, z2, gaps) => {
    let s = z1;
    for (const [a, b] of (gaps || []).concat([[z2, z2]])) { if (a > s) addBox(Z, x, 0, (s + a) / 2, 0.5, H, a - s, WALL, true); s = b; }
  };
  const floor = (x, z, w, d) => { const f = mesh(new THREE.PlaneGeometry(w, d), FLOOR, x, 0.03, z, Z.group); f.rotation.x = -Math.PI / 2; f.castShadow = false; };
  const roof = (x, z, w, d) => { const r = mesh(BOX(w, 0.4, d), mat(0xc8c4bc), x, H + 0.2, z, Z.group); r.castShadow = true; };
  floor(0, 0, 44, 28); roof(0, 0, 44, 28);
  floor(0, -20, 16, 12); roof(0, -20, 16, 12);
  floor(-29, 0, 14, 16); roof(-29, 0, 14, 16);
  floor(29, 0, 14, 16); roof(29, 0, 14, 16);
  wallX(14, -22, 22, [[-3, 3]]);                // güney: giriş
  wallX(-14, -22, 22, [[-2, 2]]);               // kuzey: ofis kapısı
  wallZ(-22, -14, 14, [[-2, 2]]); wallZ(22, -14, 14, [[-2, 2]]);
  wallX(-26, -8, 8); wallZ(-8, -26, -14); wallZ(8, -26, -14);
  wallZ(-36, -8, 8); wallX(-8, -36, -22); wallX(8, -36, -22);
  wallZ(36, -8, 8); wallX(-8, 22, 36); wallX(8, 22, 36);
  // giriş camı ve tabela
  textSign(Z, "NASA", 0, 10.2, 14.3, 0, 8, 2, "#ffffff", "#0b3d91");
  textSign(Z, "GÖREV KONTROL", 0, 6.4, 13.7, Math.PI, 6, 0.9);
  // lobi: dev ekran, Ay haritası, masalar
  const screen = mesh(BOX(14, 5, 0.2), mat(0x0a1420), 0, 4, -13.6, Z.group);
  const scrTex = canvasTex(1024, 360, (g, w, h) => {
    g.fillStyle = "#06101c"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(127,216,255,0.25)"; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = "#cfd4d8"; g.beginPath(); g.arc(760, 180, 120, 0, 7); g.fill();
    g.fillStyle = "#ff4a3a"; g.beginPath(); g.arc(800, 140, 10, 0, 7); g.fill();
    g.fillStyle = "#7fd8ff"; g.font = "bold 40px Arial"; g.fillText("AY RÖLE ANTENİ — SİNYAL YOK", 40, 80);
    g.font = "28px Arial"; g.fillStyle = "#ff8a6a"; g.fillText("Son veri: 3 gün önce. Neden: bilinmiyor.", 40, 140);
    g.fillStyle = "#e9e4d8"; g.fillText("Görev: ATLAS-1 · Mürettebat: 4 + BİP", 40, 200);
  });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(13.6, 4.7), new THREE.MeshBasicMaterial({ map: scrTex }));
  scr.position.set(0, 4, -13.45); Z.group.add(scr);
  for (const [x, z] of [[-10, -4], [10, -4], [-10, 5], [10, 5]]) {
    addBox(Z, x, 0, z, 5, 0.9, 1.8, mat(0x3a3f48), true);
    for (let i = -1; i <= 1; i++) { const m = mesh(BOX(1.1, 0.7, 0.05), glowMat(0x2a6aa0, 0.8), x + i * 1.6, 1.3, z - 0.4, Z.group); m.rotation.x = -0.3; }
  }
  addBox(Z, 0, 0, 3, 6, 0.4, 6, mat(0x2a3040), true, { top: 0.4 });          // ortadaki model kaidesi
  const moonModel = mesh(SPH(1.4), mat(0xbdbdb8), 0, 2.3, 3, Z.group);
  visuals.push(dt => { moonModel.rotation.y += dt * 0.2; });
  // ofis: masa, bayrak, pencere
  addBox(Z, 0, 0, -22.5, 5, 1, 1.8, mat(0x4a3424), true);
  mesh(BOX(1.2, 1.4, 0.2), mat(0x3a3f48), 0, 1.7, -23.2, Z.group);
  mesh(BOX(6, 3, 0.1), GLASS, 0, 4.5, -25.7, Z.group);
  mesh(CYL(0.04, 0.04, 3, 6), mat(0x999999), 5, 1.5, -24, Z.group);
  mesh(BOX(1.4, 0.9, 0.02), mat(0x2f5fb8), 5.7, 2.5, -24, Z.group);
  // giysi odası: dolaplar ve giysiler
  for (let i = 0; i < 4; i++) {
    addBox(Z, -35, 0, -6 + i * 4, 1, 3, 3, mat(0x707880), true);
    const s = makeHuman({ helmet: true });
    s.root.position.set(-34.2, 0.3, -6 + i * 4); s.root.rotation.y = -Math.PI / 2; Z.group.add(s.root);
  }
  // mürettebat salonu: kanepe, masa, kahve makinesi
  addBox(Z, 33, 0, 0, 2, 0.8, 7, mat(0x8a2a2a), true);
  addBox(Z, 29, 0, 0, 2, 0.7, 3, mat(0x4a3424), true);
  addBox(Z, 30, 0, 7, 1.2, 1.6, 0.8, mat(0x30343c), true);
  // ışıklar
  for (const [x, z] of [[-11, 0], [11, 0], [0, -20], [-29, 0], [29, 0]]) { const l = new THREE.PointLight(0xfff2dc, 0.8, 22); l.position.set(x, 7, z); Z.group.add(l); }

  // ---- eğitim sahası (binanın güneyi)
  W.nasa = { spawn: [0, 10], carter: [0, -21.4], crew: { kerem: [27, -3], selin: [30, 4], bora: [-30, 2] }, suit: [-33, -5], exit: [0, 18] };
  textSign(Z, "EĞİTİM SAHASI", 0, 3.5, 45, Math.PI, 5, 1);
  addBox(Z, -2.5, 0, 45, 0.3, 3, 0.3, mat(0x666666), false); addBox(Z, 2.5, 0, 45, 0.3, 3, 0.3, mat(0x666666), false);
  W.train = { dummies: [[-8, 58], [-4, 61], [0, 58]], wall: [14, 62], tower: [24, 74], targets: [[-18, 74, 3.5], [-24, 78, 5], [-14, 82, 2.5]], glideLand: [24, 104] };
  rockPillar(Z, 14, 62, 4, 3, 7, 0x8a7a66, true, 0);
  rockPillar(Z, 24, 74, 5, 5, 14, 0x7a6a56, true, 0);
  addBox(Z, 24, 14, 74, 5.4, 0.3, 5.4, mat(0x444444), false);
  // süzülme hedefi: yere çizili halka
  const ring = mesh(new THREE.RingGeometry(2.4, 3, 32), glowMat(0xffb43c, 1.2), 24, 0.05, 104, Z.group); ring.rotation.x = -Math.PI / 2;
  W.trainRing = ring;
  // fırlatma rampası (güneyde, z=170)
  W.pad = { x: 0, z: 170 };
  addBox(Z, 0, 0, 170, 30, 1, 30, mat(0x6a6a66), true, { top: 1 });
  const rocket = makeRocket();
  rocket.root.position.set(0, 1, 170);
  Z.group.add(rocket.root);
  W.rocket = rocket;
  // fırlatma kulesi
  for (let y = 0; y < 34; y += 3) addBox(Z, -9, 1 + y, 170, 3, 0.3, 3, mat(0xb83a2a), false);
  for (const [x, z] of [[-10.3, 168.7], [-7.7, 168.7], [-10.3, 171.3], [-7.7, 171.3]]) addBox(Z, x, 1, z, 0.3, 35, 0.3, mat(0xb83a2a), false);
  boxCollider(Z, -9, 170, 3, 3, { h: 36 });
  textSign(Z, "FIRLATMA RAMPASI 39", 12, 4, 154, Math.PI, 7, 1.2);
})();

// ================================================================ 2) UZAY (sinematik sahneler)
(function buildSpace() {
  const Z = makeZone("space", { title: null, bg: 0x000004, fog: 0, speed: 0, gravity: 0, jump: 0, sunDir: [1, 0.3, 0.2],
    sunColor: 0xffffff, sunIntensity: 1.6, hemiSky: 0x223355, hemiGround: 0x000000, hemiIntensity: 0.3, exposure: 1.1 });
  starField(Z, 3000, 1400, 1.5);
  W.earth = sphereBody(Z, "earth", 180, 0, -60, 420, 0x112244);
  W.moon = sphereBody(Z, "moon", 60, -200, 40, -900);
  const atlas = makeAtlas(); Z.group.add(atlas.root); W.spaceAtlas = atlas;
  const enemy = makeVorakShip(1.6); Z.group.add(enemy.root); enemy.root.visible = false; W.vorakShip = enemy;
  // ışın: uzun silindir (kaza sahnesinde)
  const beam = mesh(CYL(0.8, 0.8, 1, 12, 1), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.85 }), 0, 0, 0, Z.group);
  beam.visible = false; beam.castShadow = false; W.beam = beam;
  // Tahra (kaza sahnesinde yaklaşan gezegen)
  W.tahraBody = sphereBody(Z, "tahra", 400, 0, -900, 0, 0x0a2222);
  W.tahraBody.visible = false;
  // yavaş çekimde savrulan kaptan (astronot)
  const kap = makeHuman({}); Z.group.add(kap.root); kap.root.visible = false; W.spaceKaptan = kap;
  // hız çizgileri
  const lines = [], lg = new THREE.BoxGeometry(0.05, 0.05, 8), lm = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 });
  for (let i = 0; i < 160; i++) { const l = new THREE.Mesh(lg, lm); l.visible = false; Z.group.add(l); lines.push(l); }
  W.speedLines = lines;
})();

// ================================================================ 3) TAHRA (açık dünya)
(function buildTahra() {
  const REG = {
    crash: { x: 0, z: 0, r: 40, name: "Enkaz Düzlüğü" },
    mount: { x: 0, z: -175, r: 55, name: "Demir Zirve" },
    canyon: { x: 155, z: 0, r: 60, name: "Rüzgâr Kanyonu" },
    cave: { x: -150, z: 135, r: 34, name: "Işıltı Mağarası" },
    desert: { x: -195, z: 15, r: 60, name: "Kızıl Kumlar" },
    ice: { x: 165, z: -175, r: 60, name: "Ayaz Ovası" },
    forest: { x: 10, z: 190, r: 55, name: "Fener Ormanı" },
    village: { x: 185, z: 160, r: 42, name: "Lumi Köyü" },
    gate: { x: 120, z: 105, r: 22, name: "Bekçi Geçidi" },
    fort: { x: -195, z: -185, r: 48, name: "Kara Kale" }
  };
  W.reg = REG;
  const CANYON = { minX: 95, maxX: 215, minZ: -55, maxZ: 55 };
  const MESA = { x: 155, z: 0, w: 18, d: 18, top: 4 };
  const inCanyon = (x, z) => x > CANYON.minX && x < CANYON.maxX && z > CANYON.minZ && z < CANYON.maxZ;
  const dReg = (r, x, z) => Math.hypot(x - r.x, z - r.z);
  function ground(x, z) {
    let y = vnoise(x * 0.018, z * 0.018) * 7 + vnoise(x * 0.06, z * 0.06) * 2 - 4.5;
    // kaza yeri ve köy düz
    y = lerp(y, -1, 1 - smooth(25, 45, dReg(REG.crash, x, z)));
    y = lerp(y, 0, 1 - smooth(30, 46, dReg(REG.village, x, z)));
    y = lerp(y, 0, 1 - smooth(40, 56, dReg(REG.fort, x, z)));
    // dağ eteği yükselir
    y += 14 * (1 - smooth(20, 80, dReg(REG.mount, x, z)));
    // çöl kum tepeleri
    const dd = dReg(REG.desert, x, z);
    if (dd < 75) y = lerp(y, Math.sin(x * 0.12 + Math.sin(z * 0.05) * 2) * 1.6 + 0.5, 1 - smooth(50, 75, dd));
    // ova: buz düz ve hafif dalgalı
    const di = dReg(REG.ice, x, z);
    if (di < 75) y = lerp(y, vnoise(x * 0.05, z * 0.05) * 1.5, 1 - smooth(50, 75, di));
    // kanyon: dipsiz uçurum
    if (inCanyon(x, z)) return -90;
    // dünya sınırı: kenarlarda yükselen dağlar
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (edge > 270) y += (edge - 270) * 1.6;
    return y;
  }
  const Z = makeZone("tahra", {
    title: "Tahra", ground, bg: 0x6f8f9a, fog: 0.0075, fogColor: 0x7d9aa3, speed: 4.4, killY: -25,
    sunDir: [-0.5, 0.75, -0.4], sunColor: 0xffe6c4, sunIntensity: 1.15, hemiSky: 0xa8d4e0, hemiGround: 0x3a2f3a, hemiIntensity: 0.6, exposure: 1.1,
    temp: () => tahraTemp(player.pos.x, player.pos.z)
  });
  W.tahraGround = ground;
  function tahraTemp(x, z) {
    const di = dReg(REG.ice, x, z), dd = dReg(REG.desert, x, z);
    if (di < 65) return lerp(-38, -5, smooth(30, 65, di));
    if (dd < 70) return lerp(46, 22, smooth(30, 70, dd));
    return 16;
  }
  W.tahraTemp = tahraTemp;
  Z.areas = Object.keys(REG).map(k => Object.assign({ id: k }, REG[k]));
  skyDome(Z, 0x2a4a66, 0x9fb8b8, 0x4a4a52);
  // gökyüzünde iki ay ve halkalı dev gezegen (Tahra'nın göğü)
  const sp = (k, r, x, y, z) => { const m = sphereBody(Z, k, r, x, y, z, 0x334455); visuals.push(() => { if (Z.group.visible) m.position.set(player.pos.x + x, y, player.pos.z + z); }); return m; };
  sp("gas", 160, -700, 420, -900);
  const ringM = new THREE.Mesh(new THREE.RingGeometry(200, 290, 64), new THREE.MeshBasicMaterial({ color: 0xd8b8c8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false }));
  ringM.rotation.x = 1.2; Z.group.add(ringM);
  visuals.push(() => { if (Z.group.visible) ringM.position.set(player.pos.x - 700, 420, player.pos.z - 900); });
  sp("moon", 40, 600, 300, -500);

  // arazi renkleri: bölgeye göre
  const cA = new THREE.Color(), cB = new THREE.Color();
  terrain(Z, 640, 256, 0, 0, (x, y, z) => {
    const n = vnoise(x * 0.1, z * 0.1);
    cA.setHex(0x3f6a5a).lerp(cB.setHex(0x5a7a4a), n);                      // mor-yeşil yabancı çim
    const dd = dReg(REG.desert, x, z), di = dReg(REG.ice, x, z), df = dReg(REG.forest, x, z), dm = dReg(REG.mount, x, z), dk = dReg(REG.fort, x, z);
    if (dd < 75) cA.lerp(cB.setHex(0xb8603a).lerp(new THREE.Color(0xd8884a), n), 1 - smooth(45, 75, dd));
    if (di < 75) cA.lerp(cB.setHex(0xdfeaf2).lerp(new THREE.Color(0xb0c8dc), n), 1 - smooth(45, 75, di));
    if (df < 70) cA.lerp(cB.setHex(0x1f3a3a), 1 - smooth(40, 70, df));
    if (dm < 80) cA.lerp(cB.setHex(0x5a5658), 1 - smooth(30, 80, dm));
    if (dk < 60) cA.lerp(cB.setHex(0x2a2428), 1 - smooth(35, 60, dk));
    if (y < -20) cA.setHex(0x221c22);
    return cA.clone();
  });
  // görünmez dünya sınırı
  for (const [x, z, w, d] of [[0, -300, 640, 10], [0, 300, 640, 10], [-300, 0, 10, 640], [300, 0, 10, 640]]) boxCollider(Z, x, z, w, d, { h: 200, noMap: true });

  // ---- bitki örtüsü
  const R = rng(11);
  const trees = [], bulbs = [], rocks = [], crystals = [], grass = [], dunes = [];
  const free = (x, z) => !inCanyon(x, z) && dReg(REG.crash, x, z) > 30 && dReg(REG.village, x, z) > 30 && dReg(REG.fort, x, z) > 55 &&
    dReg(REG.mount, x, z) > 40 && dReg(REG.cave, x, z) > 30 && dReg(REG.gate, x, z) > 20 && Math.abs(x) < 265 && Math.abs(z) < 265;
  for (let i = 0; i < 2600; i++) {
    const x = (R() - 0.5) * 540, z = (R() - 0.5) * 540;
    if (!free(x, z)) continue;
    const y = ground(x, z);
    const dd = dReg(REG.desert, x, z), di = dReg(REG.ice, x, z), df = dReg(REG.forest, x, z);
    if (df < 65 && R() < 0.5) {
      const s = 1.2 + R() * 1.2;
      trees.push([x, y, z, R() * 6, s]); bulbs.push([x, y + 6.4 * s, z, R() * 6, s]);
      if (R() < 0.5) boxCollider(Z, x, z, 0.9 * s, 0.9 * s, { h: y + 7 * s, noMap: true });
    } else if (dd < 60) { if (R() < 0.12) rocks.push([x, y, z, R() * 6, 0.8 + R() * 2.2, R()]); }
    else if (di < 60) { if (R() < 0.18) crystals.push([x, y, z, R() * 6, 0.8 + R() * 1.6, (R() - 0.5) * 0.4]); }
    else {
      if (R() < 0.07) { const s = 0.8 + R() * 0.8; trees.push([x, y, z, R() * 6, s]); bulbs.push([x, y + 6.4 * s, z, R() * 6, s]); }
      else if (R() < 0.12) rocks.push([x, y, z, R() * 6, 0.6 + R() * 1.6, R()]);
      else grass.push([x, y, z, R() * 6, 0.7 + R() * 0.8]);
    }
  }
  // yabancı ağaç: kıvrık gövde + parlayan tomurcuk tacı
  instanced(Z, CYL(0.25, 0.45, 6.5, 7).translate(0, 3.2, 0), mat(0x3a2a3a, { roughness: 1 }), trees);
  instanced(Z, new THREE.SphereGeometry(1.9, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2a8a7a, emissive: 0x1a5a50, emissiveIntensity: 0.6, roughness: 0.7 }), bulbs);
  instanced(Z, new THREE.DodecahedronGeometry(1, 0), mat(0x6a5a5a, { roughness: 1 }), rocks);
  instanced(Z, new THREE.OctahedronGeometry(0.8, 0).scale(0.6, 2.2, 0.6), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x3f7aa0, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3 }), crystals);
  instanced(Z, new THREE.ConeGeometry(0.12, 0.8, 4).translate(0, 0.4, 0), mat(0x6aa07a), grass, false);
  for (const r of rocks) if (r[4] > 1.6) boxCollider(Z, r[0], r[2], r[4] * 1.3, r[4] * 1.3, { h: r[1] + r[4], noMap: true });

  // ---- kaza yeri: ATLAS enkazı (parçalar sonra toplanıp burada birleştirilir)
  const wreck = makeAtlas();
  wreck.root.position.set(0, ground(0, 0) + 0.6, 0);
  wreck.root.rotation.set(0.08, 0.5, 0.18);
  Z.group.add(wreck.root);
  setAtlasThrust(wreck, false);
  for (const p of ["wingL", "wingR", "engine"]) wreck.parts[p].visible = false;
  boxCollider(Z, 0, 0, 5, 12, { h: 4 });
  W.wreck = wreck;
  // düşüş izi (kara toprak) ve dumanlar
  const scar = mesh(new THREE.PlaneGeometry(10, 60), mat(0x1a1416, { roughness: 1 }), -10, ground(-10, -30) + 0.05, -30, Z.group); scar.rotation.x = -Math.PI / 2; scar.rotation.z = 0.35; scar.castShadow = false;
  const smoke = [];
  for (let i = 0; i < 18; i++) { const s = mesh(SPH(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.35 }), 0, 0, 0, Z.group); s.castShadow = false; smoke.push({ s, t: i / 18 * 6 }); }
  visuals.push(dt => {
    if (!Z.group.visible || G.flags.smokeOff) { for (const s of smoke) s.s.visible = false; return; }
    for (const s of smoke) { s.t += dt; if (s.t > 6) s.t = 0; s.s.visible = true; s.s.position.set(1 + Math.sin(s.t) * 0.6, 2 + s.t * 2.2, 2 + s.t * 0.8); s.s.scale.setScalar(0.6 + s.t * 0.5); s.s.material.opacity = 0.35 * (1 - s.t / 6); }
  });
  // savrulmuş kaptan: kaza yerinin 60 m kuzeyinde, yere gömülü
  W.crashPlayer = [-14, -48];
  const crater = mesh(new THREE.RingGeometry(1.5, 4, 20), mat(0x1a1416), -14, ground(-14, -48) + 0.05, -48, Z.group); crater.rotation.x = -Math.PI / 2;
  W.o2Tank = [-6, -40];
  W.bipSpot = [6, 8];
  W.bench = [-7, 6];
  addBox(Z, -7, ground(-7, 6), 6, 3, 1, 1.4, mat(0x50545c, { metalness: 0.6 }), true);
  W.camp = [4, 14];
  fireLight(Z, 8, 14);

  // ---- Demir Zirve: basamaklı kaya sütunları (tırmanma); tepede motor
  const mz = REG.mount;
  const mg = ground(mz.x, mz.z);
  W.mountBase = [mz.x, mz.z + 40];
  rockPillar(Z, mz.x, mz.z + 22, 14, 6, mg + 9, 0x5a5658);
  rockPillar(Z, mz.x - 9, mz.z + 10, 8, 14, mg + 9, 0x5a5658, false);
  rockPillar(Z, mz.x + 9, mz.z + 10, 8, 14, mg + 9, 0x5a5658, false);
  rockPillar(Z, mz.x, mz.z + 10, 10, 18, mg + 9, 0x5a5658, false);                 // 1. kat düzlüğü
  rockPillar(Z, mz.x + 2, mz.z + 2, 8, 5, mg + 19, 0x55515a);                     // 2. kat
  rockPillar(Z, mz.x + 2, mz.z - 6, 10, 12, mg + 19, 0x55515a, false);
  rockPillar(Z, mz.x - 4, mz.z - 8, 5, 5, mg + 30, 0x4f4b52);                     // 3. kat
  rockPillar(Z, mz.x - 4, mz.z - 16, 12, 12, mg + 30, 0x4f4b52, false);
  // zirvenin çevresi: geçilmez kayalar (yalnızca tırmanarak çıkılsın)
  for (let a = 0; a < 12; a++) {
    const ang = a / 12 * Math.PI * 2, rx = mz.x + Math.cos(ang) * 30, rz = mz.z - 4 + Math.sin(ang) * 30;
    if (Math.sin(ang) > 0.85) continue;                                            // güneyden giriş
    rockPillar(Z, rx, rz, 14, 14, mg + 26 + hash2(a, 3) * 10, 0x4a464c, false);
  }
  W.engineSpot = [mz.x - 4, mz.z - 18, mg + 30];
  W.mountTop = mg + 30;
  // tepeden kaza yerine süzülmek için: bayrak
  // ---- Rüzgâr Kanyonu: batı kenarında yüksek sütun, ortada masa, doğu kenarına dönüş sütunu
  const meso = boxCollider(Z, MESA.x, MESA.z, MESA.w, MESA.d, { top: MESA.top, base: -90 });
  mesh(BOX(MESA.w, 94, MESA.d), mat(0x6a4a3a, { roughness: 1 }), MESA.x, MESA.top - 47, MESA.z, Z.group);
  rockPillar(Z, 88, 0, 8, 8, ground(88, 0) + 20, 0x7a5a48);
  rockPillar(Z, MESA.x + 4, MESA.z - 4, 5, 5, MESA.top + 18, 0x7a5a48);
  rockPillar(Z, 222, 0, 8, 8, ground(222, 0) + 6, 0x7a5a48);
  W.wingSpot = [MESA.x - 4, MESA.z + 4, MESA.top];
  W.canyonPillar = [88, 6];
  // kanyon duvarları görseli: rüzgâr akımı (yukarı iten sütunlar)
  W.updrafts = [[125, 20], [185, -20]];
  for (const [ux, uz] of W.updrafts) {
    const col = mesh(CYL(2.5, 2.5, 60, 16, 1), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.12, depthWrite: false }), ux, -10, uz, Z.group);
    col.castShadow = false;
    visuals.push(dt => { col.rotation.y += dt; });
  }
  updaters.push(dt => {
    if (G.zone !== Z || !player.gliding) return;
    for (const [ux, uz] of W.updrafts) if (Math.hypot(player.pos.x - ux, player.pos.z - uz) < 3) player.vy = Math.min(9, player.vy + 26 * dt);
  });

  // ---- Işıltı Mağarası: kapalı kaya kubbe, içi karanlık; kristaller ışık verir
  const cv = REG.cave, cg = ground(cv.x, cv.z);
  const CAVE = { minX: cv.x - 26, maxX: cv.x + 26, minZ: cv.z - 20, maxZ: cv.z + 20 };
  W.cave = CAVE;
  const rockM = mat(0x3a343c, { roughness: 1 });
  addBox(Z, cv.x, cg - 2, CAVE.minZ, 52, 12, 2, rockM, true);                       // kuzey
  addBox(Z, CAVE.minX, cg - 2, cv.z, 2, 12, 40, rockM, true);
  addBox(Z, CAVE.maxX, cg - 2, cv.z, 2, 12, 40, rockM, true);
  addBox(Z, cv.x - 16, cg - 2, CAVE.maxZ, 20, 12, 2, rockM, true);                    // güney: giriş ortada
  addBox(Z, cv.x + 16, cg - 2, CAVE.maxZ, 20, 12, 2, rockM, true);
  const roofM = mesh(BOX(54, 2, 42), rockM, cv.x, cg + 8, cv.z, Z.group);
  // iç duvarlar: labirent
  addBox(Z, cv.x - 8, cg - 1, cv.z + 6, 2, 10, 18, rockM, true);
  addBox(Z, cv.x + 8, cg - 1, cv.z - 4, 2, 10, 22, rockM, true);
  addBox(Z, cv.x - 16, cg - 1, cv.z - 8, 16, 10, 2, rockM, true);
  W.caveCeil = cg + 7;
  const cryCol = [0x7fd8ff, 0xc3a6ff, 0x6ff0d2];
  for (let i = 0; i < 14; i++) {
    const x = CAVE.minX + 3 + hash2(i, 1) * 46, z = CAVE.minZ + 3 + hash2(i, 2) * 34;
    const c = mesh(new THREE.OctahedronGeometry(0.6, 0), glowMat(cryCol[i % 3], 1.5), x, ground(x, z) + 0.8, z, Z.group);
    c.scale.set(0.6, 2, 0.6);
  }
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(cryCol[i % 3], 0.8, 14); l.position.set(cv.x - 18 + i * 12, cg + 3, cv.z + (i % 2 ? 8 : -8)); Z.group.add(l); }
  W.commSpot = [cv.x + 18, cv.z - 14];
  W.caveEntry = [cv.x, CAVE.maxZ + 6];
  Z.ceil = (x, z) => (x > CAVE.minX && x < CAVE.maxX && z > CAVE.minZ && z < CAVE.maxZ) ? W.caveCeil : null;
  // mağarada ışık azalır
  updaters.push(dt => {
    if (G.zone !== Z) return;
    const inCave = Z.ceil(player.pos.x, player.pos.z) !== null;
    sun.intensity = lerp(sun.intensity, inCave ? 0.05 : Z.sunIntensity, Math.min(1, dt * 2));
    hemi.intensity = lerp(hemi.intensity, inCave ? 0.12 : Z.hemiIntensity, Math.min(1, dt * 2));
  });

  // ---- Kızıl Kumlar: Kerem'in kapsülü, yıkık sütunlar
  const ds = REG.desert;
  W.keremPod = [ds.x + 6, ds.z - 4];
  const pod = (x, z, color) => {
    const g = new THREE.Group(); g.position.set(x, ground(x, z), z); g.rotation.set(0.3, hash2(x, z) * 6, 0.2); Z.group.add(g);
    mesh(SPH(1.4, 16, 12), mat(0xeeeeea), 0, 1, 0, g).scale.set(1, 1.3, 1);
    mesh(new THREE.CircleGeometry(0.8, 16), new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.9, roughness: 0.1 }), 0, 1.3, -1.35, g).rotation.y = Math.PI;
    mesh(CYL(1.45, 1.45, 0.2, 16), mat(color || 0xff8a2a), 0, 0.6, 0, g);
    boxCollider(Z, x, z, 2.6, 2.6, { h: 3 });
    return g;
  };
  pod(W.keremPod[0], W.keremPod[1]);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, x = ds.x + Math.cos(a) * 26, z = ds.z + Math.sin(a) * 26;
    addBox(Z, x, ground(x, z) - 1, z, 2.2, 5 + hash2(i, 7) * 6, 2.2, mat(0x8a5a3a), true);
  }
  // ---- Ayaz Ovası: Selin'in kapsülü, ateş noktaları (soğuktan korur)
  const ic = REG.ice;
  W.selinPod = [ic.x - 10, ic.z - 8];
  pod(W.selinPod[0], W.selinPod[1], 0x7fd8ff);
  W.fires = [[ic.x + 30, ic.z + 40], [ic.x + 8, ic.z + 18], [ic.x - 20, ic.z + 4], [ic.x + 18, ic.z - 20], [ic.x - 8, ic.z - 30]].map(([x, z]) => fireLight(Z, x, z));
  W.iceHerbs = [[ic.x + 32, ic.z - 30], [ic.x - 34, ic.z + 18], [ic.x + 40, ic.z + 10]];
  // ---- Fener Ormanı: Bora'nın kafesi, 3 ışık çiçeği
  const fo = REG.forest;
  W.boraCage = [fo.x, fo.z + 10];
  const cage = new THREE.Group(); cage.position.set(fo.x, ground(fo.x, fo.z + 10), fo.z + 10); Z.group.add(cage);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const v = mesh(CYL(0.12, 0.2, 4.5, 5), mat(0x2a5a2a), Math.cos(a) * 1.8, 2.2, Math.sin(a) * 1.8, cage); v.rotation.z = Math.cos(a) * 0.15; }
  mesh(new THREE.ConeGeometry(2.4, 1.6, 12), mat(0x2a5a2a), 0, 5, 0, cage);
  W.cageGroup = cage;
  W.cageCol = boxCollider(Z, fo.x, fo.z + 10, 4, 4, { h: 6 });
  W.flowers = [[fo.x - 30, fo.z - 14, 0], [fo.x + 34, fo.z - 4, 6], [fo.x + 6, fo.z + 40, 0]];
  rockPillar(Z, fo.x + 34, fo.z - 4, 4, 4, ground(fo.x + 34, fo.z - 4) + 6, 0x3a4a3a);
  // ---- Lumi Köyü
  const vl = REG.village;
  W.village = vl;
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + 0.3, x = vl.x + Math.cos(a) * 22, z = vl.z + Math.sin(a) * 22;
    const g = new THREE.Group(); g.position.set(x, ground(x, z), z); g.rotation.y = -a + Math.PI / 2; Z.group.add(g);
    mesh(new THREE.SphereGeometry(3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8cfb8, { roughness: 1 }), 0, 0, 0, g).scale.set(1, 1.1, 1);
    mesh(new THREE.CircleGeometry(1, 12), mat(0x1a1416), 0, 1, -2.98, g).rotation.y = Math.PI;
    mesh(SPH(0.3), glowMat(0x6ff0d2, 2), 0, 3.4, 0, g);
    boxCollider(Z, x, z, 5, 5, { h: 3.3 });
  }
  W.villageWell = [vl.x, vl.z];
  addBox(Z, vl.x, 0, vl.z, 3, 1, 3, mat(0x8a8478), true);
  W.villageTree = mesh(CYL(0.8, 1.4, 14, 8), mat(0x3a2a3a), vl.x - 8, 7, vl.z - 8, Z.group);
  boxCollider(Z, vl.x - 8, vl.z - 8, 2.4, 2.4, { h: 14 });
  W.lightStoneSpot = [vl.x + 8, vl.z - 6];
  W.waterSpot = [vl.x + 36, vl.z + 34];
  W.lostLumi = [vl.x - 60, vl.z + 50];
  // ---- Bekçi Geçidi: iki büyük taş arası arena
  const gt = REG.gate;
  W.gate = gt;
  for (const s of [-1, 1]) rockPillar(Z, gt.x + s * 20, gt.z - 6, 6, 30, ground(gt.x, gt.z) + 16, 0x5a5048, false);

  // ---- Kara Kale (Vorak üssü)
  const ft = REG.fort, fg = 0;
  W.fort = ft;
  const FW = mat(0x1e1a22, { roughness: 0.6, metalness: 0.4 }), FL = glowMat(0xff7a2a, 1.6);
  const S = 34;
  W.fortGate = boxCollider(Z, ft.x, ft.z + S, 12, 2, { h: 10 });
  W.fortGateMesh = addBox(Z, ft.x, fg, ft.z + S, 12, 10, 1.5, mat(0x3a1a1a, { metalness: 0.5 }), false);
  addBox(Z, ft.x - 21, fg, ft.z + S, 30, 10, 2, FW, true); addBox(Z, ft.x + 21, fg, ft.z + S, 30, 10, 2, FW, true);
  addBox(Z, ft.x, fg, ft.z - S, 72, 10, 2, FW, true);
  addBox(Z, ft.x - S, fg, ft.z, 2, 10, 70, FW, true);
  // doğu duvarında tırmanılabilir çatlak (gizli giriş)
  addBox(Z, ft.x + S, fg, ft.z - 20, 2, 10, 30, FW, true);
  addBox(Z, ft.x + S, fg, ft.z + 21, 2, 10, 28, FW, true);
  W.fortClimb = rockPillar(Z, ft.x + S, ft.z + 1, 2.4, 12, 10.5, 0x3a2a2a, true, 0);
  for (let i = -3; i <= 3; i++) { mesh(BOX(0.3, 0.3, 66), FL, ft.x + S + 1.1, 9, ft.z, Z.group); }
  // iç düzen: kışla, hapishane, hiper sürücü, komuta platformu
  addBox(Z, ft.x - 18, fg, ft.z + 14, 12, 5, 8, FW, true);
  addBox(Z, ft.x + 16, fg, ft.z + 16, 10, 5, 8, FW, true);
  W.cells = [[ft.x - 22, ft.z - 10], [ft.x - 22, ft.z - 2], [ft.x - 22, ft.z + 6]];
  W.cellBars = W.cells.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x + 3, 0, z); Z.group.add(g);
    for (let i = -3; i <= 3; i++) mesh(BOX(0.12, 3, 0.12), FL, 0, 1.5, i * 0.5, g);
    const c = boxCollider(Z, x + 3, z, 0.4, 3.6, { h: 3 });
    addBox(Z, x, fg, z - 2, 6, 3, 0.4, FW, true); addBox(Z, x, fg, z + 2, 6, 3, 0.4, FW, true);
    addBox(Z, x - 3, fg, z, 0.4, 3, 4, FW, true);
    return { g, c };
  });
  W.drive = [ft.x + 18, ft.z - 18];
  W.arena = [ft.x, ft.z - 12];
  addBox(Z, ft.x, fg, ft.z - 12, 20, 0.6, 16, mat(0x2a2028), true, { top: 0.6 });
  const tower = addBox(Z, ft.x, fg, ft.z - 28, 6, 18, 6, FW, true);
  mesh(SPH(1.2), glowMat(0xff3a2a, 2.5), ft.x, 19, ft.z - 28, Z.group);
  // ışıldaklar: dönen koniler (sızma bölümünde görülürsen alarm)
  W.lights = [[ft.x - 10, ft.z + 4, 0], [ft.x + 8, ft.z - 4, 2], [ft.x + 22, ft.z + 26, 4]].map(([x, z, ph]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); Z.group.add(g);
    addBox(Z, x, fg, z, 1, 6, 1, FW, true);
    const cone = mesh(new THREE.ConeGeometry(4, 12, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }), 0, 6, 0, g);
    cone.castShadow = false;
    const spot = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.35, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2; Z.group.add(spot);
    return { x, z, ph, cone, spot, g, sx: x, sz: z, on: true };
  });

  // ---- hızlı yolculuk taşları
  W.stones = [
    { id: "crash", name: "Enkaz Düzlüğü", x: 10, z: -12 }, { id: "mount", name: "Demir Zirve eteği", x: 8, z: -128 },
    { id: "canyon", name: "Kanyon kenarı", x: 80, z: 12 }, { id: "desert", name: "Kızıl Kumlar", x: -168, z: 20 },
    { id: "ice", name: "Ayaz Ovası", x: 145, z: -140 }, { id: "forest", name: "Fener Ormanı", x: 22, z: 160 },
    { id: "village", name: "Lumi Köyü", x: 165, z: 150 }, { id: "fort", name: "Kara Kale önü", x: -190, z: -135 }
  ];
  for (const s of W.stones) {
    const y = ground(s.x, s.z);
    s.mesh = mesh(new THREE.OctahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: 0x6ff0d2, emissive: 0x2f8a7a, emissiveIntensity: 0.3 }), s.x, y + 2, s.z, Z.group);
    s.mesh.scale.y = 1.6;
    mesh(CYL(0.9, 1.2, 0.8, 6), mat(0x5a5658), s.x, y + 0.4, s.z, Z.group);
    boxCollider(Z, s.x, s.z, 1.6, 1.6, { h: y + 1 });
  }
  visuals.push(dt => { for (const s of W.stones) s.mesh.rotation.y += dt; });
})();

// ================================================================ 4) KOVALAMACA (asteroit kuşağı)
(function buildChase() {
  const Z = makeZone("chase", { title: null, bg: 0x02030a, speed: 0, gravity: 0, jump: 0, sunDir: [0.5, 0.6, 0.3], sunColor: 0xfff0e0,
    sunIntensity: 1.6, hemiSky: 0x334466, hemiGround: 0x110a10, hemiIntensity: 0.35, exposure: 1.1 });
  starField(Z, 2500, 1300, 1.4);
  const neb = sphereBody(Z, "gas", 300, 400, 200, -1100, 0x331122);
  const ship = makeAtlas(); Z.group.add(ship.root); W.chaseShip = ship;
  W.asteroidGeo = new THREE.DodecahedronGeometry(1, 1);
  W.asteroidMat = mat(0x5a5048, { roughness: 1 });
})();

// ================================================================ 5) AY
(function buildMoon() {
  const ground = (x, z) => vnoise(x * 0.03, z * 0.03) * 4 + vnoise(x * 0.1, z * 0.1) * 0.8 - 2 - Math.max(0, 6 - Math.hypot(x - 60, z + 40) * 0.4) * 0;
  const Z = makeZone("moon", {
    title: "Ay — Röle Üssü", ground, bg: 0x000000, fog: 0, gravity: 3.2, jump: 6.5, speed: 4.0, vacuum: true, o2Rate: 0.4, killY: -30,
    sunDir: [0.8, 0.5, 0.2], sunColor: 0xffffff, sunIntensity: 1.7, hemiSky: 0x3a4a6a, hemiGround: 0x222222, hemiIntensity: 0.3, exposure: 1.1, temp: -120
  });
  // düzleştirilmiş üs alanı
  const base = (x, z) => lerp(ground(x, z), 0, 1 - smooth(40, 60, Math.hypot(x, z)));
  Z.ground = base;
  starField(Z, 3000, 1400, 1.6);
  const earth = sphereBody(Z, "earth", 90, -500, 260, -700, 0x112244);
  visuals.push(() => { if (Z.group.visible) earth.position.set(player.pos.x - 500, 260, player.pos.z - 700); });
  terrain(Z, 400, 160, 0, 0, (x, y, z) => new THREE.Color().setScalar(0.42 + vnoise(x * 0.2, z * 0.2) * 0.18 + y * 0.01));
  const R = rng(5), rocks = [];
  for (let i = 0; i < 300; i++) { const x = (R() - 0.5) * 380, z = (R() - 0.5) * 380; if (Math.hypot(x, z) < 50) continue; rocks.push([x, base(x, z), z, R() * 6, 0.5 + R() * 2]); }
  instanced(Z, new THREE.DodecahedronGeometry(1, 0), mat(0x8a8a88, { roughness: 1 }), rocks);
  for (const [x, z, w, d] of [[0, -190, 400, 10], [0, 190, 400, 10], [-190, 0, 10, 400], [190, 0, 10, 400]]) boxCollider(Z, x, z, w, d, { h: 100, noMap: true });
  // üs modülleri
  const MW = mat(0xd8d8d4, { metalness: 0.3 });
  for (const [x, z] of [[-20, 10], [20, 10], [0, 26]]) {
    const m = mesh(CYL(5, 5, 4, 16), MW, x, 2, z, Z.group);
    mesh(new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MW, x, 4, z, Z.group);
    boxCollider(Z, x, z, 9, 9, { h: 9 });
  }
  addBox(Z, 0, 0, 10, 30, 2, 3, MW, false);
  const ant = makeAntenna(); ant.root.position.set(0, 0, -30); Z.group.add(ant.root); W.antenna = ant;
  boxCollider(Z, 0, -30, 3.5, 3.5, { h: 20 });
  W.antennaSteps = [[-3.5, -28, "Güç kablosu"], [3.5, -32, "Sinyal kartı"], [0, -26.5, "Çanak motoru"]];
  W.moonLand = [0, 45];
  // Vorak ana gemisi gökte
  const ms = makeMothership(); ms.root.position.set(0, 160, -260); ms.root.scale.setScalar(1.2); Z.group.add(ms.root); W.mothership = ms;
  W.moonArena = [0, -8];
})();
