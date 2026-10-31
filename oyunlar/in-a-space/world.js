// IN A SPACE — dünya: gemi içi, gövde dışı (uzay yürüyüşü) ve üç gezegen. Yalnızca geometri, ışık ve
// görsel animasyon burada; etkileşimlerin mantığı story.js'te. Ortak tutamaklar W nesnesinde.
"use strict";

const W = { planets: {}, cores: {}, strips: [], shipLights: [] };

// ---------------------------------------------------------------- dokular (tuvalle üretilir)
function canvasTex(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function speckle(g, s, n, alpha) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() * 255 | 0;
    g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
}
const TEX = {
  panel: canvasTex(256, (g, s) => {
    g.fillStyle = "#a3adbb"; g.fillRect(0, 0, s, s);
    speckle(g, s, 1500, 0.06);
    g.strokeStyle = "#6b7482"; g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, s - 3, s / 2 - 3); g.strokeRect(1.5, s / 2 + 1.5, s - 3, s / 2 - 3);
    g.fillStyle = "#7d8694";
    for (const [x, y] of [[10, 10], [s - 10, 10], [10, s / 2 - 10], [s - 10, s / 2 - 10], [10, s / 2 + 10], [s - 10, s / 2 + 10], [10, s - 10], [s - 10, s - 10]]) {
      g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
    }
    g.fillStyle = "rgba(40,50,64,0.35)"; g.fillRect(0, s * 0.42, s, 10);
  }),
  floor: canvasTex(256, (g, s) => {
    g.fillStyle = "#3f4652"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#596273"; g.lineWidth = 2;
    for (let i = 0; i <= s; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
    g.strokeStyle = "#2c323b"; g.lineWidth = 3;
    for (let i = -s; i < s; i += 16) { g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
    speckle(g, s, 900, 0.08);
  }),
  ceil: canvasTex(256, (g, s) => {
    g.fillStyle = "#363d49"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#252a33"; g.lineWidth = 4; g.strokeRect(2, 2, s - 4, s - 4);
    g.fillStyle = "#1e232b";
    for (let i = 0; i < 6; i++) g.fillRect(40, 60 + i * 24, s - 80, 8);
  }),
  hull: canvasTex(256, (g, s) => {
    g.fillStyle = "#c3c8d0"; g.fillRect(0, 0, s, s);
    speckle(g, s, 2500, 0.08);
    g.strokeStyle = "#8a909a"; g.lineWidth = 2;
    for (let i = 0; i <= s; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
    g.fillStyle = "#7c828c";
    for (let x = 6; x < s; x += 16) for (const y of [4, 60, 68, 124, 132, 188, 196, 252]) { g.fillRect(x, y - 1, 2, 2); }
    g.fillStyle = "rgba(90,70,50,0.18)";
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 30, 12, Math.random() * 3, 0, 7); g.fill(); }
  }),
  grain: canvasTex(128, (g, s) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const v = 150 + Math.random() * 105 | 0;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
  })
};
TEX.grain.repeat.set(45, 45);

// Dünya koordinatından UV: farklı boyuttaki kutularda doku hep aynı ölçekte ve dikişsiz görünür.
function boxUV(geo, s) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else if (ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u / s, v / s);
  }
  uv.needsUpdate = true;
}

// Cel-shading (Breath of the Wild görünümü): ışık 4 basamakta kırılır, gölgeler yumuşak bantlar halinde.
const TOON = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 150, 205, 255]), 4, 1, THREE.LuminanceFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();
const std = (color, o) => {
  const p = Object.assign({ color, gradientMap: TOON }, o || {});
  delete p.roughness;
  delete p.metalness;
  return new THREE.MeshToonMaterial(p);
};
const basic = (color, o) => new THREE.MeshBasicMaterial(Object.assign({ color }, o || {}));
const M = {
  wall: std(0xb4bdca, { map: TEX.panel }),
  floor: std(0x8a93a3, { map: TEX.floor, metalness: 0.4 }),
  ceil: std(0x9099a8, { map: TEX.ceil }),
  trim: std(0x2b313b, { metalness: 0.5, roughness: 0.5 }),
  dark: std(0x1a1e25, { metalness: 0.4, roughness: 0.6 }),
  door: std(0x6f7c8f, { map: TEX.panel, metalness: 0.5 }),
  white: std(0xe5e9ef, { roughness: 0.5 }),
  orange: std(0xf97316, { roughness: 0.5 }),
  yellow: std(0xfacc15, { roughness: 0.6 }),
  crate: std(0x7c6a4e, { roughness: 0.9, metalness: 0.05 }),
  green: std(0x2f8f46, { roughness: 0.9, metalness: 0 }),
  soil: std(0x3b2a1e, { roughness: 1, metalness: 0 }),
  glass: std(0x9fd6ff, { transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  hull: std(0xc8ccd3, { map: TEX.hull, metalness: 0.45, roughness: 0.6 }),
  screen: basic(0x0ea5e9),
  screenGreen: basic(0x22c55e),
  screenRed: basic(0xef4444),
  glowBlue: basic(0x7dd3fc),
  glowCore: basic(0xfde047)
};

function box(zone, x, y, z, w, h, d, material, solid = true, uv = 2) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  boxUV(geo, uv);
  const m = new THREE.Mesh(geo, material);
  zone.group.add(m);
  if (solid) m.userData.col = addCollider(zone, x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  return m;
}
function cyl(zone, x, y, z, r, h, material, seg, r2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, h, seg || 20), material);
  m.position.set(x, y, z);
  zone.group.add(m);
  return m;
}
function textTex(text, fg, bg, w, h, font) {
  const c = document.createElement("canvas");
  c.width = w || 512; c.height = h || 128;
  const g = c.getContext("2d");
  g.fillStyle = bg || "#0b1220"; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(3, 3, c.width - 6, c.height - 6);
  g.fillStyle = fg; g.font = font || "bold 54px Segoe UI, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  return new THREE.CanvasTexture(c);
}
function sign(zone, text, x, y, z, rotY, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), basic(0xffffff, { map: textTex(text, color || "#7dd3fc") }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  zone.group.add(m);
  return m;
}
function stars(zone, n, r) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection ? new THREE.Vector3().randomDirection() : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    pos.set([v.x * r, v.y * r, v.z * r], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
  zone.group.add(p);
  return p;
}
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// =============================================================== GEMİ
const SHIP = makeZone("ship", { spawn: [35, 0, 0], bg: 0x000000, title: "ARGO-7", sub: "ANA GEMİ", mapScale: 4.2,
  temp: () => G.flags.powerOut ? 9 : G.flags.breach && !G.flags.sealed ? -12 : 21 });
W.ship = SHIP;
// Gemide hangi odadasın (oda afişi için)
G.roomAt = (x, z) => {
  if (x > 30) return "KÖPRÜ";
  if (Math.abs(z) < 2) return "KORİDOR";
  if (z < -2) return x < -20 ? "KRİYO ODASI" : x < -10 ? "MÜRETTEBAT" : x < 0 ? "REVİR" : x < 10 ? "CEPHANELİK" : x < 20 ? "HİDROPONİK BAHÇE" : "KAPTAN KÖŞKÜ";
  return x < -15 ? "MAKİNE DAİRESİ" : x < 0 ? "KARGO" : x < 10 ? "HAVA KİLİDİ" : "YEMEKHANE";
};
const H = 3.2, T = 0.3, GAP = 1.8;

{
  const fg = new THREE.PlaneGeometry(72, 20); fg.rotateX(-Math.PI / 2); fg.translate(6, 0, 0); boxUV(fg, 2);
  SHIP.group.add(new THREE.Mesh(fg, M.floor));
  const cg = new THREE.PlaneGeometry(72, 20); cg.rotateX(Math.PI / 2); cg.translate(6, H, 0); boxUV(cg, 2);
  SHIP.group.add(new THREE.Mesh(cg, M.ceil));
}

function wallX(z, x1, x2, gaps) {
  let cur = x1;
  for (const g of gaps.slice().sort((a, b) => a - b)) {
    const a = g - GAP / 2, b = g + GAP / 2;
    if (a > cur) box(SHIP, (cur + a) / 2, H / 2, z, a - cur, H, T, M.wall);
    box(SHIP, g, (2.6 + H) / 2, z, GAP, H - 2.6, T, M.trim, false);
    cur = b;
  }
  if (x2 > cur) box(SHIP, (cur + x2) / 2, H / 2, z, x2 - cur, H, T, M.wall);
}
function wallZ(x, z1, z2, gaps) {
  let cur = z1;
  for (const g of gaps.slice().sort((a, b) => a - b)) {
    const a = g - GAP / 2, b = g + GAP / 2;
    if (a > cur) box(SHIP, x, H / 2, (cur + a) / 2, T, H, a - cur, M.wall);
    box(SHIP, x, (2.6 + H) / 2, g, T, H - 2.6, GAP, M.trim, false);
    cur = b;
  }
  if (z2 > cur) box(SHIP, x, H / 2, (cur + z2) / 2, T, H, z2 - cur, M.wall);
}

const NORTH = { cryo: -25, crew: -15, med: -5, armory: 5, hydro: 15, captain: 25 };
const SOUTH = { engine: -22.5, cargo: -7.5, airlock: 5, mess: 20 };
wallX(-2, -30, 30, Object.values(NORTH));
wallX(2, -30, 30, Object.values(SOUTH));
wallX(-10, -30, 30, []);
wallX(10, -30, 30, []);
wallZ(-30, -10, 10, []);
for (const x of [-20, -10, 0, 10, 20]) wallZ(x, -10, -2, []);
for (const x of [-15, 0, 10]) wallZ(x, 2, 10, []);
wallZ(30, -10, -2, []);
wallZ(30, 2, 10, []);
// köprü
wallX(-8, 30, 42, []);
wallX(8, 30, 42, []);
box(SHIP, 30, (2.6 + H) / 2, 0, T, H - 2.6, 4, M.trim, false);
{ // büyük cam: alt/üst/yan duvarlar + tek çarpışma kutusu
  box(SHIP, 42, 0.45, 0, T, 0.9, 16, M.wall, false);
  box(SHIP, 42, 3.05, 0, T, 0.3, 16, M.wall, false);
  box(SHIP, 42, H / 2, -7, T, H, 2, M.wall, false);
  box(SHIP, 42, H / 2, 7, T, H, 2, M.wall, false);
  for (const z of [-3, 0, 3]) box(SHIP, 42, 1.9, z, 0.2, 2.1, 0.12, M.trim, false);
  const g = box(SHIP, 42, 1.9, 0, 0.05, 2.1, 12, M.glass, false);
  g.renderOrder = 2;
  addCollider(SHIP, 41.85, 42.3, -8, 8, { seeThrough: true });
}

// Tavan ışık şeritleri (ışık değil, parlayan malzeme — ucuz)
function strip(x, z, w, d) {
  const m = basic(0xd6eeff);
  W.strips.push(m);
  box(SHIP, x, H - 0.03, z, w, 0.04, d, m, false);
}
strip(0, 0, 58, 0.3);
for (const x of Object.values(NORTH)) strip(x, -6, 0.3, 6);
for (const x of Object.values(SOUTH)) strip(x, 6, 0.3, 6);
strip(36, 0, 8, 0.3);

// Işıklar
SHIP.group.add(W.ambient = new THREE.AmbientLight(0x9aa8bb, 0.42));
SHIP.group.add(W.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x2a2f38, 0.5));
function shipLight(x, y, z, color, intensity, dist) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  SHIP.group.add(l);
  W.shipLights.push({ l, base: intensity, color: new THREE.Color(color) });
}
shipLight(-15, 2.9, 0, 0xdfefff, 0.9, 18);
shipLight(15, 2.9, 0, 0xdfefff, 0.9, 18);
shipLight(36, 2.9, 0, 0x9fd8ff, 1.0, 16);
shipLight(-22.5, 2.9, 5, 0xffb070, 1.0, 14);
shipLight(-7.5, 2.9, 6, 0xffe4c4, 0.8, 13);
shipLight(-25, 2.8, -6, 0x80e0ff, 0.9, 12);
shipLight(15, 2.8, -6, 0x80ff9a, 0.9, 12);

W.setPower = on => {
  W.ambient.color.set(on ? 0x9aa8bb : 0xff3030);
  W.ambient.intensity = on ? 0.42 : 0.16;
  W.hemi.intensity = on ? 0.5 : 0.03;
  W.shipLights.forEach((s, i) => {
    s.l.color.copy(on ? s.color : new THREE.Color(0xff2020));
    s.l.intensity = on ? s.base : (i < 2 ? 0.35 : 0);
  });
  for (const m of W.strips) m.color.set(on ? 0xd6eeff : 0x3a0808);
};

// Kapılar: yaklaşınca yukarı kayar; kilitliyken kırmızı lamba.
const DOOR_LABEL = { cryo: "KRİYO", crew: "MÜRETTEBAT", med: "REVİR", armory: "CEPHANELİK", hydro: "HİDROPONİK", captain: "KAPTAN",
  engine: "MAKİNE DAİRESİ", cargo: "KARGO", airlock: "HAVA KİLİDİ", mess: "YEMEKHANE" };
function door(id, x, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(GAP, 2.6, 0.12), M.door);
  mesh.position.set(x, 1.3, z);
  SHIP.group.add(mesh);
  const stripeM = new THREE.Mesh(new THREE.BoxGeometry(GAP, 0.12, 0.14), M.yellow);
  stripeM.position.set(0, -0.6, 0);
  mesh.add(stripeM);
  const lamp = basic(0x22ff88);
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.05), lamp);
    l.position.set(x + 1.1, 2.4, z + s * 0.18);
    SHIP.group.add(l);
  }
  const col = addCollider(SHIP, x - GAP / 2, x + GAP / 2, z - 0.08, z + 0.08);
  const side = z < 0 ? 1 : -1;
  sign(SHIP, DOOR_LABEL[id], x, 2.88, z + side * 0.17, side > 0 ? 0 : Math.PI);
  const d = { id, x, z, mesh, col, lamp, t: 0, locked: false, forceOpen: false };
  G.doors[id] = d;
  return d;
}
for (const [id, x] of Object.entries(NORTH)) door(id, x, -2);
for (const [id, x] of Object.entries(SOUTH)) door(id, x, 2);

function updateDoors(dt) {
  if (G.zone !== SHIP) return;
  for (const id in G.doors) {
    const d = G.doors[id];
    let near = Math.hypot(player.pos.x - d.x, player.pos.z - d.z) < 2.4;
    for (const e of G.enemies) if (!e.dead && !e.dormant && e.zone === SHIP && Math.hypot(e.pos.x - d.x, e.pos.z - d.z) < 1.9) near = true;
    const want = d.forceOpen ? 1 : (!d.locked && near ? 1 : 0);
    const before = d.t;
    d.t = want > d.t ? Math.min(1, d.t + dt * 2.8) : Math.max(0, d.t - dt * 2.2);
    if ((before === 0 && d.t > 0) || (before === 1 && d.t < 1)) sfx("door");
    d.mesh.position.y = 1.3 + d.t * 2.45;
    d.col.on = d.t < 0.85;
    d.lamp.color.set(d.locked ? 0xff2a2a : 0x22ff88);
  }
}
updaters.push(updateDoors);

// ---- oda dekorları ve etkileşim noktalarının konumları (W.p.*)
W.p = {};
// Kriyo
for (const x of [-28.5, -26.5, -23.5, -21.5]) {
  box(SHIP, x, 0.2, -8.7, 1.3, 0.4, 1.3, M.trim);
  const glass = cyl(SHIP, x, 1.4, -8.7, 0.55, 2.0, M.glass, 20);
  glass.renderOrder = 2;
  box(SHIP, x, 2.5, -8.7, 1.3, 0.2, 1.3, M.trim, false);
  cyl(SHIP, x, 0.45, -8.7, 0.5, 0.06, M.glowBlue, 20);
}
box(SHIP, -25, 0.5, -8.1, 1.3, 0.25, 0.05, M.screenRed, false); // açık kapak uyarısı
box(SHIP, -21.2, 0.5, -3.6, 0.9, 1.0, 1.2, M.dark);
box(SHIP, -21.2, 1.02, -3.6, 0.7, 0.04, 0.9, M.screen, false);
W.p.log1 = [-21.2, 1.08, -3.6];

// Mürettebat
for (const x of [-18.3, -11.7]) {
  box(SHIP, x, 0.35, -8.8, 2.2, 0.5, 1.1, M.trim);
  box(SHIP, x, 0.65, -8.8, 2.0, 0.12, 0.95, M.white, false);
  box(SHIP, x, 1.9, -8.8, 2.2, 0.12, 1.1, M.trim, false);
  box(SHIP, x, 2.0, -8.8, 2.0, 0.1, 0.95, M.white, false);
}
for (let i = 0; i < 3; i++) box(SHIP, -19.55, 1.1, -6.5 + i * 0.8, 0.6, 2.2, 0.75, M.door);
box(SHIP, -14, 0.4, -5.5, 1.6, 0.8, 1.0, M.trim);
W.p.log2 = [-18.3, 0.78, -8.6];
W.p.log3 = [-14, 0.88, -5.5];
W.p.bat1 = [-10.6, 1.0, -3.4];
box(SHIP, -10.6, 0.45, -3.4, 0.5, 0.9, 0.6, M.dark);

// Revir
box(SHIP, -7.5, 0.4, -8.4, 2.2, 0.8, 1.0, M.white);
box(SHIP, -7.5, 0.85, -8.4, 2.0, 0.1, 0.9, M.screenGreen, false);
box(SHIP, -3, 1.4, -9.75, 1.4, 1.6, 0.2, M.white);
box(SHIP, -3, 1.5, -9.63, 0.5, 0.14, 0.04, M.screenGreen, false);
box(SHIP, -3, 1.5, -9.63, 0.14, 0.5, 0.04, M.screenGreen, false);
W.p.heal = [-3, 1.4, -9.55];
box(SHIP, -1.2, 0.4, -4.8, 1.0, 0.8, 1.6, M.trim);
W.p.log4 = [-1.2, 0.85, -4.8];

// Cephanelik
for (const x of [2, 8]) box(SHIP, x, 1.1, -9.6, 1.6, 2.2, 0.5, M.dark);
box(SHIP, 5, 1.0, -9.7, 1.8, 0.9, 0.3, M.trim);
W.gunRack = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.14), M.dark);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10), M.glowBlue);
  barrel.rotation.z = Math.PI / 2; barrel.position.x = 0.6;
  W.gunRack.add(body, barrel);
  W.gunRack.position.set(5, 1.2, -9.45);
  SHIP.group.add(W.gunRack);
}
W.p.gun = [5, 1.2, -9.4];
box(SHIP, 8.6, 0.4, -6.5, 1.0, 0.8, 1.0, M.crate);
W.p.bat2 = [8.6, 0.9, -6.5];
box(SHIP, 1.4, 0.5, -5, 1.0, 1.0, 1.0, M.crate);

// Hidroponik
for (const x of [12.2, 17.8]) {
  box(SHIP, x, 0.4, -6, 1.4, 0.8, 6.4, M.trim);
  box(SHIP, x, 0.82, -6, 1.2, 0.05, 6.2, M.soil, false);
  for (let z = -8.6; z <= -3.4; z += 1.3) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 7), M.green);
    p.position.set(x, 1.35, z);
    SHIP.group.add(p);
  }
}
W.fruits = [];
for (const [i, x, z] of [[0, 12.2, -5.3], [1, 17.8, -4.0], [2, 17.8, -7.9]]) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), basic(0x60a5fa));
  f.position.set(x, 1.55, z);
  SHIP.group.add(f);
  W.fruits.push({ i, mesh: f, pos: [x, 1.55, z] });
}

// Kaptan köşkü
box(SHIP, 25, 0.45, -8.3, 2.6, 0.9, 1.1, M.crate);
box(SHIP, 25, 0.5, -7.2, 0.6, 1.0, 0.6, M.dark, false);
W.p.log5 = [25, 0.95, -8.2];
box(SHIP, 29.5, 1.1, -6, 0.5, 2.2, 3, M.crate);
{
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), std(0x2b6cb0, { emissive: 0x0b2a4a }));
  earth.position.set(21, 1.3, -9.2);
  SHIP.group.add(earth);
  cyl(SHIP, 21, 0.5, -9.2, 0.08, 1.0, M.trim);
  box(SHIP, 21, 0.5, -9.2, 0.5, 1.0, 0.5, M.trim, true).visible = false;
  visuals.push(dt => { earth.rotation.y += dt * 0.4; });
}

// Makine dairesi (hiper sürücü + sigorta + şalter)
W.reactor = new THREE.Group();
W.reactor.position.set(-22.5, 0, 7.4);
SHIP.group.add(W.reactor);
{
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.6, 24), M.trim); base.position.y = 0.3;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 24), std(0x334155, { metalness: 0.7 })); core.position.y = 1.7;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 10, 40), basic(0x38bdf8)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.7;
  W.reactorRing = ring;
  W.reactor.add(base, core, ring);
  W.coreSlots = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), basic(0x333333));
    s.position.set(-0.5 + i * 0.5, 1.0, -1.32);
    W.reactor.add(s);
    W.coreSlots.push(s);
  }
  addCollider(SHIP, -24, -21, 5.9, 8.9);
  visuals.push(dt => { ring.rotation.z += dt * (0.5 + (G.flags.cores || 0)); });
}
W.p.reactor = [-22.5, 1.1, 5.9];
box(SHIP, -29.75, 1.5, 4.0, 0.2, 0.9, 0.7, M.trim);
W.fuseLamp = basic(0xff2a2a);
box(SHIP, -29.62, 1.75, 4.0, 0.05, 0.12, 0.3, W.fuseLamp, false);
W.p.fuse = [-29.55, 1.5, 4.0];
box(SHIP, -29.75, 1.3, 6.2, 0.2, 1.0, 0.6, M.dark);
W.lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), M.screenRed);
W.lever.position.set(-29.55, 1.5, 6.2);
SHIP.group.add(W.lever);
W.p.lever = [-29.55, 1.4, 6.2];
for (const z of [3, 9.3]) box(SHIP, -26, 2.6, z, 7, 0.25, 0.25, M.orange, false);
box(SHIP, -16.2, 0.5, 9, 1.0, 1.0, 1.0, M.crate);
W.p.bat3 = [-16.2, 1.05, 9];

// Kargo
for (const [x, z, s] of [[-13.6, 4.2, 1.2], [-13.6, 5.6, 1.0], [-2.0, 4.6, 1.4], [-1.8, 8.7, 1.2], [-3.3, 8.8, 1.0], [-10, 8.9, 1.0]]) box(SHIP, x, s / 2, z, s, s, s, M.crate);
box(SHIP, -12.3, 1.2, 9.65, 2.2, 0.08, 0.5, M.trim);
box(SHIP, -12.3, 0.6, 9.65, 2.2, 0.08, 0.5, M.trim, false);
W.fuseMesh = box(SHIP, -12.3, 1.32, 9.6, 0.3, 0.16, 0.16, M.yellow, false);
W.p.spareFuse = [-12.3, 1.3, 9.55];
W.p.hole = [-6.0, 1.4, 9.8];
W.holeGroup = new THREE.Group();
{
  const black = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), basic(0x000000));
  black.position.set(-6.0, 1.4, 9.83); black.rotation.y = Math.PI;
  W.holeGroup.add(black);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.08), M.trim);
    shard.position.set(-6.0 + Math.cos(a) * 0.95, 1.4 + Math.sin(a) * 0.95, 9.78);
    shard.rotation.z = a + 0.4;
    W.holeGroup.add(shard);
  }
  W.holeGroup.visible = false;
  SHIP.group.add(W.holeGroup);
}

// Hava kilidi
box(SHIP, 0.45, 1.2, 6.5, 0.6, 2.4, 1.6, M.door);
W.suitMesh = new THREE.Group();
{
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.55), M.white); torso.position.y = 1.35;
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), M.white); helm.position.y = 1.95;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), basic(0xf59e0b)); visor.position.set(0.12, 1.95, 0);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.45), M.white); legs.position.y = 0.7;
  W.suitMesh.add(torso, helm, visor, legs);
  W.suitMesh.position.set(0.95, 0, 6.5);
  SHIP.group.add(W.suitMesh);
}
W.p.locker = [0.95, 1.4, 6.5];
cyl(SHIP, 5, 1.4, 9.82, 1.1, 0.1, M.trim, 24).rotation.x = Math.PI / 2;
// Dış kapak: çıkış animasyonunda dönerek açılır, sonra yana kayar
W.hatchDoor = new THREE.Group();
{
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.08, 24), M.door);
  door.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), M.yellow);
  hub.rotation.x = Math.PI / 2; hub.position.z = -0.04;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.05), M.yellow);
  bar.position.z = -0.06;
  W.hatchDoor.add(door, hub, bar);
  W.hatchDoor.position.set(5, 1.4, 9.76);
  SHIP.group.add(W.hatchDoor);
  // kapak açılınca görünen karanlık geçit
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), basic(0x05070a));
  hole.position.set(5, 1.4, 9.765);
  hole.rotation.y = Math.PI;
  SHIP.group.add(hole);
}
W.p.hatch = [5, 1.4, 9.7];
for (let i = 0; i < 6; i++) box(SHIP, 2.0 + i * 1.2, 0.006, 8.6, 0.6, 0.01, 1.4, i % 2 ? M.dark : M.yellow, false);
box(SHIP, 9.5, 0.25, 5, 0.6, 0.5, 2.2, M.trim);
// Atölye tezgâhı (madenlerden geliştirme) ve üstündeki kazma
box(SHIP, 9.35, 0.45, 8.3, 0.9, 0.9, 1.8, M.trim);
box(SHIP, 9.35, 0.92, 8.3, 0.8, 0.05, 1.7, M.dark, false);
box(SHIP, 9.78, 1.55, 8.75, 0.06, 0.6, 0.8, M.dark, false);
box(SHIP, 9.74, 1.55, 8.75, 0.02, 0.48, 0.68, M.screenGreen, false);
W.p.workbench = [9.6, 1.4, 8.75];
W.pickRack = new THREE.Group();
{
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.75, 8), std(0x8b5a2b));
  handle.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.07), std(0x9ca3af));
  head.position.z = -0.36;
  W.pickRack.add(handle, head);
  W.pickRack.position.set(9.25, 0.99, 7.9);
  W.pickRack.rotation.y = 0.4;
  SHIP.group.add(W.pickRack);
}
W.p.pickaxe = [9.25, 1.0, 7.9];

// Yemekhane
for (const x of [14, 24]) for (const z of [5.0, 7.6]) {
  box(SHIP, x, 0.4, z, 2.4, 0.8, 1.0, M.white);
}
box(SHIP, 20, 1.2, 9.7, 1.6, 2.4, 0.35, M.trim);
box(SHIP, 20, 1.5, 9.5, 0.9, 0.5, 0.05, M.screen, false);
W.p.food = [20, 1.3, 9.5];
W.p.log6 = [14, 0.85, 5.0];

// Köprü
box(SHIP, 39.6, 0.5, 0, 0.9, 1.0, 6, M.dark);
box(SHIP, 39.25, 1.05, 0, 0.3, 0.05, 1.4, M.screen, false);
W.p.nav = [39.3, 1.15, 0];
for (const z of [-7.4, 7.4]) {
  box(SHIP, 36, 0.5, z, 6, 1.0, 0.7, M.dark);
  box(SHIP, 36, 1.05, z, 5.6, 0.05, 0.4, M.screenGreen, false);
}
box(SHIP, 36.5, 0.4, 0, 0.8, 0.8, 0.8, M.trim);
box(SHIP, 36.9, 1.0, 0, 0.15, 0.9, 0.8, M.trim, false);
{
  const nova = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), basic(0x22d3ee));
  nova.position.set(33.2, 2.6, 0);
  SHIP.group.add(nova);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 8, 30), basic(0x0891b2));
  halo.position.copy(nova.position);
  SHIP.group.add(halo);
  visuals.push(dt => {
    const s = 1 + Math.sin(G.time * 3) * 0.08;
    nova.scale.setScalar(s);
    halo.rotation.x += dt * 1.2; halo.rotation.y += dt * 0.7;
  });
}

// Uzay: yıldızlar, camdan görünen gezegen, hiper uzay çizgileri
stars(SHIP, 1800, 900);
W.windowPlanet = new THREE.Mesh(new THREE.SphereGeometry(140, 40, 30), std(0xffffff, { roughness: 1, metalness: 0, fog: false }));
W.windowPlanet.position.set(420, -60, 60);
W.windowPlanet.visible = false;
SHIP.group.add(W.windowPlanet);
{
  const sun = new THREE.DirectionalLight(0xffffff, 0.0);
  sun.position.set(0, 1, 1);
  W.windowSun = sun;
  // Yalnızca gezegen küresini aydınlatsın diye ayrı tutulmaz; zayıf yoğunluk iç mekanı bozmaz.
  SHIP.group.add(sun);
}
{
  const n = 260, pos = new Float32Array(n * 6);
  const r = rng(7);
  for (let i = 0; i < n; i++) {
    const x = 60 + r() * 700, y = (r() - 0.5) * 160, z = (r() - 0.5) * 320;
    pos.set([x, y, z, x + 25, y, z], i * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  W.warp = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xa5f3fc, fog: false }));
  W.warp.visible = false;
  SHIP.group.add(W.warp);
  visuals.push(dt => {
    if (!W.warp.visible) return;
    const p = W.warp.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) - dt * 260;
      if (x < 50) x += 720;
      p.setX(i, x);
    }
    p.needsUpdate = true;
  });
}
W.showWindowPlanet = (color, emissive) => {
  if (!color) { W.windowPlanet.visible = false; W.windowSun.intensity = 0; return; }
  W.windowPlanet.material.color.set(color);
  W.windowPlanet.material.emissive.set(emissive || 0x000000);
  W.windowPlanet.visible = true;
  W.windowSun.intensity = 0.15;
};

// Oyuncunun elindeki tüfek (kameraya bağlı)
W.gunView = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.55), std(0x1f2937, { metalness: 0.6, roughness: 0.4 }));
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 12), basic(0x38bdf8));
  coil.rotation.x = Math.PI / 2; coil.position.set(0, 0.03, -0.3);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), M.dark); grip.position.set(0, -0.13, 0.12);
  W.gunCoil = coil.material;
  W.gunView.add(body, coil, grip);
  W.gunView.position.set(0.28, -0.25, -0.55);
  W.gunView.visible = false;
  camera.add(W.gunView);
}
// Elde kazma: sap omuzdan aşağı, baş öne bakar; vuruşta pivot öne döner
W.pickView = new THREE.Group();
{
  const pivot = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.62, 8), std(0x8b5a2b));
  handle.position.y = 0.2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), std(0xb8c0cc));
  head.position.y = 0.5;
  const tipL = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), std(0xe5e7eb));
  tipL.rotation.z = Math.PI / 2; tipL.position.set(-0.26, 0.5, 0);
  const tipR = tipL.clone(); tipR.rotation.z = -Math.PI / 2; tipR.position.x = 0.26;
  pivot.add(handle, head, tipL, tipR);
  pivot.rotation.set(-0.35, 0, -0.25);
  W.pickView.add(pivot);
  W.pickView.userData.pivot = pivot;
  W.pickView.position.set(0.3, -0.42, -0.5);
  W.pickView.visible = false;
  camera.add(W.pickView);
}

// =============================================================== GÖVDE DIŞI (uzay yürüyüşü)
const HULL = makeZone("hull", { vacuum: true, o2Rate: 1.1, gravity: 3, jump: 0, speed: 2.7, bg: 0x00010a, spawn: [8, 0, 3.4],
  title: "GÖVDE DIŞI", sub: "ARGO-7 · UZAY BOŞLUĞU", temp: -120, mapScale: 3 });
W.hull = HULL;
{
  box(HULL, 0, -0.5, 0, 80, 1, 14, M.hull, false, 4);
  box(HULL, 0, -2.2, 0, 80, 2.6, 18, M.hull, false, 4);
  for (const z of [-6.7, 6.7]) {
    box(HULL, 0, 0.9, z, 80, 0.08, 0.08, M.yellow, false);
    for (let x = -39; x <= 39; x += 3) box(HULL, x, 0.45, z, 0.08, 0.9, 0.08, M.trim, false);
    addCollider(HULL, -40, 40, z - 0.3, z + 0.3);
  }
  addCollider(HULL, -41, -39.5, -7, 7);
  addCollider(HULL, 39.5, 41, -7, 7);
  // hava kilidi kapağı
  cyl(HULL, 8, 0.18, 5.4, 0.95, 0.36, M.trim, 24);
  cyl(HULL, 8, 0.38, 5.4, 0.7, 0.06, M.yellow, 24);
  addCollider(HULL, 7.1, 8.9, 4.5, 6.3);
  W.p.hullHatch = [8, 0.5, 4.6];
  // köprünün dış kubbesi ve antenler (manzara)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.glass);
  dome.position.set(34, 0, 0); HULL.group.add(dome);
  addCollider(HULL, 29, 39.5, -5, 5);
  // engel slalomu
  const block = (x, z1, z2, h, mat) => box(HULL, x, h / 2, (z1 + z2) / 2, 1.6, h, z2 - z1, mat);
  block(-2, -6.4, 1.0, 1.6, M.trim);
  cyl(HULL, -2, 3.0, -3, 0.06, 2.8, M.trim, 8);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.5), M.white);
  dish.position.set(-2, 4.2, -3); dish.rotation.x = Math.PI; HULL.group.add(dish);
  block(-10, -1.0, 6.4, 1.1, M.dark);
  for (let i = 0; i < 4; i++) box(HULL, -10, 1.3, -0.4 + i * 1.8, 1.5, 0.05, 1.6, M.screen, false);
  block(-18, -6.4, 1.0, 2.2, M.orange);
  block(-24, -1.0, 6.4, 1.4, M.trim);
  for (const x of [-20, -14, -6, 2]) cyl(HULL, x, 0.2, -6, 0.25, 0.4, M.orange, 10);
  // delik
  W.hullHole = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.0, 20), basic(0x000000));
  hole.rotation.x = -Math.PI / 2; hole.position.set(-31, 0.01, 0);
  W.hullHole.add(hole);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.18), M.trim);
    s.position.set(-31 + Math.cos(a) * 1.05, 0.15, Math.sin(a) * 1.05);
    s.rotation.set(0.5, -a, 0.3);
    W.hullHole.add(s);
  }
  HULL.group.add(W.hullHole);
  W.hullPatch = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.08, 20), std(0x94a3b8, { metalness: 0.8, roughness: 0.3 }));
  W.hullPatch.position.set(-31, 0.04, 0);
  W.hullPatch.visible = false;
  HULL.group.add(W.hullPatch);
  addCollider(HULL, -32.1, -29.9, -1.1, 1.1);
  W.p.hullHole = [-31, 0.3, 0];
  const sparkL = new THREE.PointLight(0xff8a2a, 1.4, 9, 1.5);
  sparkL.position.set(-31, 0.8, 0);
  HULL.group.add(sparkL);
  W.hullSpark = sparkL;
  W.hullCans = [[-6, 4.6], [-21, -4.6]];
  W.hullCanMeshes = W.hullCans.map(([x, z]) => {
    const c = cyl(HULL, x, 0.35, z, 0.18, 0.7, std(0x22d3ee, { emissive: 0x0e7490 }), 12);
    return c;
  });
  HULL.group.add(new THREE.AmbientLight(0x556080, 0.55));
  const sun = new THREE.DirectionalLight(0xfff6e8, 1.15);
  sun.position.set(40, 70, 30);
  HULL.group.add(sun);
  stars(HULL, 2500, 900);
  const ice = new THREE.Mesh(new THREE.SphereGeometry(420, 48, 32), std(0x9cc9e8, { roughness: 1, metalness: 0, emissive: 0x0c2233 }));
  ice.position.set(-100, -520, -520);
  HULL.group.add(ice);
}
W.debris = [];
updaters.push(dt => {
  if (G.zone !== HULL) return;
  W.hullSpark.intensity = W.hullPatch.visible ? 0 : 0.8 + Math.random() * 1.2;
});

// =============================================================== GEZEGENLER
// Breath of the Wild görünümü: renk geçişli gökyüzü kubbesi + ufukla aynı renkte pus, puslu uzak dağ
// siluetleri, yavaş bulutlar, rüzgârda sallanan çimen, tepesi düz tırmanılabilir kaya sütunları.
const UP = new THREE.Vector3(0, 1, 0);
const CLOUD_TEX = canvasTex(128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 6, s / 2, s / 2, s / 2);
  gr.addColorStop(0, "rgba(255,255,255,0.95)");
  gr.addColorStop(0.6, "rgba(255,255,255,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
CLOUD_TEX.wrapS = CLOUD_TEX.wrapT = THREE.ClampToEdgeWrapping;
const grassTime = { value: 0 };
visuals.push(dt => { grassTime.value += dt; });

function skyDome(zone, top, hor, sunDir, sunCol) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(hor) },
      sunDir: { value: new THREE.Vector3(...sunDir).normalize() }, sunCol: { value: new THREE.Color(sunCol) } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.5));
      float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 1.5 + pow(s, 12.0) * 0.28);
      gl_FragColor = vec4(c, 1.0); }`
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1100, 32, 16), mat);
  m.renderOrder = -1;
  m.frustumCulled = false;
  zone.group.add(m);
  visuals.push(() => { if (G.zone === zone) m.position.copy(camera.position); });
}
function mountains(zone, color, hor, seed, ringR) {
  const r = rng(seed);
  for (const [dist, haze, n] of [[ringR, 0.45, 26], [ringR + 260, 0.7, 30]]) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(hor), haze), fog: false });
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + r() * 0.2, d = dist + r() * 120, h = 50 + r() * 140, w = 70 + r() * 110;
      const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5 + (r() * 3 | 0)), mat);
      m.position.set(Math.cos(a) * d, h / 2 - 15, Math.sin(a) * d);
      m.rotation.y = r() * 3;
      zone.group.add(m);
    }
  }
}
function clouds(zone, color, opacity, count, seed) {
  const r = rng(seed), group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const cl = new THREE.Group();
    const a = r() * Math.PI * 2, d = 120 + r() * 420;
    cl.position.set(Math.cos(a) * d, 90 + r() * 90, Math.sin(a) * d);
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: CLOUD_TEX, color, transparent: true, opacity, depthWrite: false, fog: false }));
      const s = 40 + r() * 60;
      sp.scale.set(s * 1.8, s, 1);
      sp.position.set((k - 2) * 28 + r() * 20, r() * 12, r() * 20);
      cl.add(sp);
    }
    group.add(cl);
  }
  zone.group.add(group);
  visuals.push(dt => { if (G.zone === zone) group.rotation.y += dt * 0.004; });
}
function grass(zone, h, count, colA, colB, seed, glow, radius) {
  const blade = new THREE.PlaneGeometry(0.14, 0.75, 1, 3);
  blade.translate(0, 0.375, 0);
  const bp = blade.attributes.position;
  for (let i = 0; i < bp.count; i++) bp.setX(i, bp.getX(i) * (1 - bp.getY(i) / 0.8));
  const mat = new THREE.MeshToonMaterial({ gradientMap: TOON, side: THREE.DoubleSide, emissive: glow || 0x000000 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = grassTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 gw = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(uTime * 1.7 + gw.x * 0.35 + gw.z * 0.27) * 0.22 + sin(uTime * 3.1 + gw.x) * 0.05;
      transformed.x += sway * position.y; transformed.z += sway * 0.5 * position.y;`);
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const r = rng(seed), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const ca = new THREE.Color(colA), cb = new THREE.Color(colB), col = new THREE.Color();
  let n = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    // kümeler: merkeze yakın daha sık, kaya/sütun içine ve iniş aracının altına çimen çıkmaz
    const ang = r() * Math.PI * 2, rad = Math.sqrt(r()) * (radius || 70);
    const x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
    if (blockedAt(zone, x, z, 0.15) || (Math.abs(x) < 2.6 && z > 2.5 && z < 10)) continue;
    pos.set(x, h(x, z) - 0.03, z);
    q.setFromAxisAngle(UP, r() * Math.PI);
    const s = 0.45 + r() * 0.55;
    sc.set(s, s * (0.6 + r() * 0.6), s);
    m4.compose(pos, q, sc);
    mesh.setMatrixAt(n, m4);
    mesh.setColorAt(n, col.copy(ca).lerp(cb, r()));
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  zone.group.add(mesh);
  return mesh;
}

// Maden türleri ve gezegenlere göre dağılımları (sıcak gezegenlerde altın, soğuklarda buz kristali, elmas her yerde ama az)
W.ORES = {
  demir: { name: "Demir", icon: "🔩", color: 0xc8ccd2, emissive: 0x3a1a08 },
  buz: { name: "Buz Kristali", icon: "❄️", color: 0x9fe7ff, emissive: 0x15506a },
  altin: { name: "Altın", icon: "🪙", color: 0xfacc15, emissive: 0x5a3a00 },
  elmas: { name: "Uzay Elması", icon: "💎", color: 0x5eead4, glow: true }
};
const ORE_MIX = {
  kizil: { demir: 5, altin: 3, elmas: 1 }, buz: { demir: 3, buz: 5, elmas: 1 }, mor: { demir: 3, altin: 3, elmas: 2 },
  kum: { demir: 4, altin: 4, elmas: 1 }, bataklik: { demir: 5, altin: 2, buz: 1, elmas: 1 }, kristal: { buz: 5, demir: 2, elmas: 2 },
  ay: { demir: 5, buz: 2, altin: 1, elmas: 1 }, dunya: { demir: 4, altin: 2, buz: 1, elmas: 1 }
};
function buildPlanet(P) {
  const vacuum = P.vacuum !== false;
  const zone = makeZone(P.id, { vacuum, o2Rate: P.o2Rate || 1.1, gravity: P.gravity, jump: P.jump, speed: 3.4,
    bg: P.hor, fog: P.fog, spawn: [0, 0, 1.5], title: P.name.toLocaleUpperCase("tr"), sub: P.sub, temp: P.temp, mapScale: 1.4,
    mapBg: P.mapBg, mapWall: "rgba(30,24,20,0.75)" });
  const site = P.core || [0, -50];
  const [cx, cz] = site;
  const size = P.size || 170, half = size / 2 - 13;
  const h = (x, z) => {
    const base = P.amp * (Math.sin(x * 0.065) + Math.cos(z * 0.058) + 0.6 * Math.sin((x + z) * 0.11) + 0.4 * Math.cos((x - z) * 0.17));
    const f1 = Math.min(1, Math.max(0, (Math.hypot(x, z) - 7) / 14));
    const f2 = Math.min(1, Math.max(0, (Math.hypot(x - cx, z - cz) - 7) / 10));
    return base * f1 * f2;
  };
  zone.ground = h;
  // arazi
  const geo = new THREE.PlaneGeometry(size, size, 120, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
  const lo = new THREE.Color(P.low), hi = new THREE.Color(P.high), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = h(pos.getX(i), pos.getZ(i));
    pos.setY(i, y);
    c.copy(lo).lerp(hi, Math.min(1, Math.max(0, (y / (P.amp * 2.6)) + 0.5)));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  zone.group.add(new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, map: TEX.grain, gradientMap: TOON })));
  // sınırlar (haritada çizilmez)
  addCollider(zone, -half - 20, -half, -half - 20, half + 20, { noMap: true }); addCollider(zone, half, half + 20, -half - 20, half + 20, { noMap: true });
  addCollider(zone, -half - 20, half + 20, -half - 20, -half, { noMap: true }); addCollider(zone, -half - 20, half + 20, half, half + 20, { noMap: true });
  // gökyüzü, pus, dağlar, bulutlar, ışık
  skyDome(zone, P.top, P.hor, P.sunDir || [0.4, 0.5, -0.6], P.sun);
  mountains(zone, P.mount, P.hor, P.seed + 1, Math.max(320, size * 1.6));
  clouds(zone, P.cloud || 0xffffff, P.cloudOpacity || 0.55, P.clouds || 14, P.seed + 2);
  zone.group.add(new THREE.HemisphereLight(P.sky, P.groundLight, P.hemi));
  const sun = new THREE.DirectionalLight(P.sun, P.sunI);
  sun.position.set(...(P.sunDir || [0.4, 0.5, -0.6]).map(v => v * 100));
  zone.group.add(sun);
  // iniş aracı (parçaları iniş animasyonu için ayrıca tutulur)
  const landerFrom = zone.group.children.length;
  if (P.lander !== false) {
    box(zone, 0, 1.7, 6.5, 4, 2.6, 5, M.white);
    box(zone, 0, 3.2, 6.5, 3, 0.5, 4, M.trim, false);
    box(zone, 0, 1.7, 3.98, 1.6, 2.0, 0.06, M.dark, false);
    for (const [x, z] of [[-1.8, 4.3], [1.8, 4.3], [-1.8, 8.7], [1.8, 8.7]]) cyl(zone, x, 0.4, z, 0.12, 0.8, M.trim, 8);
    const ramp = box(zone, 0, 0.3, 3.2, 1.6, 0.08, 1.8, M.trim, false);
    ramp.rotation.x = 0.3;
    box(zone, 0, 2.85, 3.97, 1.0, 0.14, 0.05, M.screenGreen, false);
  }
  const cans = P.cans || [];
  const landerParts = zone.group.children.slice(landerFrom);
  for (const m of landerParts) m.userData.y0 = m.position.y;
  W.planets[P.id] = { zone, hatch: [0, 1.4, 3.9], core: site, cans, h, name: P.name, crystals: [], landerParts };
  const r = rng(P.seed);
  const segDist = (x, z) => {
    const t = Math.max(0, Math.min(1, (x * cx + z * cz) / (cx * cx + cz * cz)));
    return Math.hypot(x - cx * t, z - cz * t);
  };
  const clearSpot = (x, z, rad) => Math.hypot(x, z) > 11 + rad && Math.hypot(x - cx, z - cz) > 11 + rad && segDist(x, z) > 3.5 + rad &&
    !cans.some(([a, b]) => Math.hypot(x - a, z - b) < 4 + rad) && Math.abs(x) < half - 4 && Math.abs(z) < half - 4 &&
    !(P.reserve || []).some(([a, b, rr]) => Math.hypot(x - a, z - b) < rr + rad);   // görev yerlerine kaya/sütun çıkmasın
  // tırmanılabilir kaya sütunları (bazılarının tepesinde yıldız kristali)
  const pillarMat = std(P.pillar || P.rock), topMat = std(P.pillarTop || P.high);
  let crystalsLeft = P.crystals === undefined ? 3 : P.crystals, placed = 0;
  for (let i = 0; i < 200 && placed < (P.pillars === undefined ? 8 : P.pillars); i++) {
    const x = (r() - 0.5) * (half * 1.7), z = (r() - 0.5) * (half * 1.7), rad = 1.4 + r() * 1.2, height = 5 + r() * 6;
    if (!clearSpot(x, z, rad + 2) || blockedAt(zone, x, z, rad + 1.5)) continue;
    const base = h(x, z), top = base + height;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad * 1.05, height + 1, 7), pillarMat);
    col.position.set(x, base + (height - 1) / 2, z);
    col.rotation.y = r() * 3;
    zone.group.add(col);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.95, rad * 0.92, 0.25, 7), topMat);
    cap.position.set(x, top - 0.1, z);
    cap.rotation.y = col.rotation.y;
    zone.group.add(cap);
    addCollider(zone, x - rad * 0.85, x + rad * 0.85, z - rad * 0.85, z + rad * 0.85, { top, climb: true });
    placed++;
    if (crystalsLeft > 0) {
      crystalsLeft--;
      const id = `crystal_${P.id}_${W.planets[P.id].crystals.length}`;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), basic(0xff9ff3));
      gem.position.set(x, top + 0.75, z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: CLOUD_TEX, color: 0xffb3f0, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
      glow.scale.set(2.6, 2.6, 1);
      glow.position.copy(gem.position);
      zone.group.add(gem, glow);
      W.planets[P.id].crystals.push({ id, pos: [x, top + 0.75, z], top, mesh: gem, glow });
      visuals.push(dt => { if (G.zone === zone) { gem.rotation.y += dt * 2; gem.position.y = top + 0.75 + Math.sin(G.time * 2.4) * 0.12; } });
    }
  }
  // kayalar
  const rockMat = std(P.rock, { emissive: P.rockEmissive || 0x000000 });
  for (let i = 0; i < P.rocks; i++) {
    const x = (r() - 0.5) * half * 1.7, z = (r() - 0.5) * half * 1.7, s = 0.6 + r() * 1.8;
    if (!clearSpot(x, z, 0) || blockedAt(zone, x, z, s)) continue;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
    m.position.set(x, h(x, z) + s * 0.35, z);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.scale.y = 0.75;
    zone.group.add(m);
    addCollider(zone, x - s * 0.72, x + s * 0.72, z - s * 0.72, z + s * 0.72);
  }
  // çekirdek ve işaret ışığı
  if (P.coreColor) {
    const core = new THREE.Group();
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38), basic(P.coreColor));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 30), basic(0xffffff));
    core.add(gem, ring);
    core.position.set(cx, h(cx, cz) + 1.25, cz);
    zone.group.add(core);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 80, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: P.coreColor, transparent: true, opacity: 0.35, fog: false, depthWrite: false, side: THREE.DoubleSide }));
    beacon.position.set(cx, h(cx, cz) + 40, cz);
    zone.group.add(beacon);
    const cl = new THREE.PointLight(P.coreColor, 1.4, 12, 1.5);
    cl.position.set(cx, h(cx, cz) + 2, cz);
    zone.group.add(cl);
    W.cores[P.id] = { core, beacon, light: cl };
    visuals.push(dt => {
      if (G.zone !== zone) return;
      gem.rotation.y += dt * 1.5;
      ring.rotation.x += dt; ring.rotation.y += dt * 0.6;
      core.position.y = h(cx, cz) + 1.25 + Math.sin(G.time * 2) * 0.1;
    });
  }
  // oksijen tüpleri
  W.planets[P.id].canMeshes = cans.map(([x, z]) => {
    const m = cyl(zone, x, h(x, z) + 0.4, z, 0.2, 0.8, std(0x22d3ee, { emissive: 0x0e7490 }), 12);
    const glow = cyl(zone, x, h(x, z) + 0.85, z, 0.08, 0.1, basic(0xffffff), 8);
    m.userData.glow = glow;
    return m;
  });
  if (P.deco) P.deco(zone, h, r);
  if (P.grass) grass(zone, h, P.grass.count, P.grass.a, P.grass.b, P.seed + 3, P.grass.glow, P.grass.radius || half * 0.9);
  // Maden damarları (kazmayla kazılır). Ayrı rastgele dizisi var: dekorların yeri değişmesin.
  const mix = ORE_MIX[P.id] || { demir: 1 }, ro = rng(P.seed + 7), rockDark = std(new THREE.Color(P.rock).multiplyScalar(0.7).getHex());
  const pool = [];
  for (const t in mix) for (let i = 0; i < mix[t]; i++) pool.push(t);
  W.planets[P.id].ores = [];
  for (let tries = 0; tries < 600 && W.planets[P.id].ores.length < (P.oreCount || 18); tries++) {
    const x = (ro() - 0.5) * half * 1.75, z = (ro() - 0.5) * half * 1.75;
    if (!clearSpot(x, z, 1.2) || blockedAt(zone, x, z, 1.8)) continue;
    const i = W.planets[P.id].ores.length, type = i === 0 ? "elmas" : pool[Math.floor(ro() * pool.length)];
    const O = W.ORES[type], y = h(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), rockDark);
    rock.position.y = 0.35; rock.scale.y = 0.8; rock.rotation.set(ro() * 3, ro() * 3, ro() * 3);
    g.add(rock);
    const oreMat = O.glow ? basic(O.color) : std(O.color, { emissive: O.emissive || 0x000000 });
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2 + ro(), s = 0.13 + ro() * 0.14;
      const bit = new THREE.Mesh(type === "demir" ? new THREE.BoxGeometry(s * 1.4, s, s * 1.2) : new THREE.OctahedronGeometry(s), oreMat);
      bit.position.set(Math.cos(a) * 0.55, 0.35 + ro() * 0.45, Math.sin(a) * 0.55);
      bit.rotation.set(ro() * 3, ro() * 3, ro() * 3);
      g.add(bit);
    }
    if (O.glow) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: CLOUD_TEX, color: O.color, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
      glow.scale.set(2.4, 2.4, 1); glow.position.y = 0.6;
      g.add(glow);
    }
    zone.group.add(g);
    const col = addCollider(zone, x - 0.6, x + 0.6, z - 0.6, z + 0.6, { ore: true });
    W.planets[P.id].ores.push({ id: `ore_${P.id}_${i}`, type, pid: P.id, zone, pos: new THREE.Vector3(x, y + 0.5, z), group: g, col, hp: 0 });
  }
  return zone;
}

buildPlanet({
  id: "kizil", name: "Kızıl Gezegen", sub: "TOZLU ÇÖLLER", seed: 11, top: 0xd8885a, hor: 0xf3c9a0, sun: 0xfff0d8, sunDir: [0.5, 0.45, -0.5],
  fog: 0.0075, low: 0x7a2e18, high: 0xd98250, amp: 2.4, mount: 0x8a3b22, rock: 0x6a2a16, pillar: 0x9a4a2a, pillarTop: 0xc98a4a,
  rocks: 90, gravity: 3.7, jump: 3.6, o2Rate: 1.1, sky: 0xffd2a8, groundLight: 0x5a2010, hemi: 0.8, sunI: 0.95, temp: -55,
  core: [36, -42], coreColor: 0xfde047, cans: [[12, -14], [26, -30], [-14, -26]], mapBg: "rgba(120,50,25,0.75)",
  grass: { count: 4500, a: 0xb8752e, b: 0xe8c06a }, clouds: 10, cloud: 0xffe6cc, cloudOpacity: 0.4,
  deco: (zone, h) => {
    // düşmüş sonda
    const [cx, cz] = [36, -42], y = h(cx, cz);
    const body = box(zone, cx + 2.6, y + 0.9, cz - 1.0, 2.6, 1.8, 1.8, M.white);
    body.rotation.z = 0.35;
    const pan = box(zone, cx - 2.4, y + 0.5, cz + 1.6, 3, 0.06, 1.4, M.screen, false);
    pan.rotation.set(0.3, 0.6, 0.2);
    box(zone, cx + 4.3, y + 0.3, cz + 1.2, 1.2, 0.6, 1.0, M.trim);
    for (let i = 0; i < 5; i++) {
      const d = box(zone, cx - 3 + i * 1.6, y + 0.1, cz - 3.5 + (i % 2) * 6.8, 0.4, 0.2, 0.5, M.trim, false);
      d.rotation.y = i;
    }
  }
});

buildPlanet({
  id: "buz", name: "Buz Gezegeni", sub: "DONMUŞ VADİLER", seed: 23, top: 0x86b6e6, hor: 0xe6eff7, sun: 0xffffff, sunDir: [-0.3, 0.35, -0.7],
  fog: 0.016, low: 0x9fb5cc, high: 0xf7fbff, amp: 2.0, mount: 0x8aa7c4, rock: 0xa9d6f5, rockEmissive: 0x0c2a40, pillar: 0xb7d3ea, pillarTop: 0xffffff,
  rocks: 70, gravity: 8, jump: 4, o2Rate: 1.5, sky: 0xeef6ff, groundLight: 0x7088a0, hemi: 0.95, sunI: 0.65, temp: -78,
  core: [-42, -40], coreColor: 0x67e8f9, cans: [[-12, -12], [-26, -24], [-40, -22]], mapBg: "rgba(140,170,200,0.75)",
  clouds: 18, cloudOpacity: 0.7,
  deco: (zone, h) => {
    // buz mağarası: çekirdeğin çevresinde açıklığı iniş aracına bakan buz duvarları
    const [cx, cz] = [-42, -40];
    const iceM = std(0xbfe8ff, { emissive: 0x123a52, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
    const open = Math.atan2(-cz, -cx);
    for (let i = 0; i < 12; i++) {
      const a = open + 0.55 + i * ((Math.PI * 2 - 1.1) / 11);
      const x = cx + Math.cos(a) * 6, z = cz + Math.sin(a) * 6;
      const m = box(zone, x, h(x, z) + 1.8, z, 2.6, 3.6, 2.6, iceM, true);
      m.rotation.y = -a;
    }
    const roof = box(zone, cx, h(cx, cz) + 4.2, cz, 11, 0.6, 11, iceM, false);
    roof.rotation.y = 0.3;
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4, d = 14 + (i * 7) % 30;
      const x = cx * 0.5 + Math.cos(a) * d, z = cz * 0.5 + Math.sin(a) * d;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 5), iceM);
      sp.position.set(x, h(x, z) + 1.0, z);
      sp.rotation.z = (i % 5 - 2) * 0.12;
      zone.group.add(sp);
    }
    // kar taneleri oyuncunun çevresinde düşer
    const n = 900, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 40, Math.random() * 14, (Math.random() - 0.5) * 40], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const snow = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
    zone.group.add(snow);
    visuals.push(dt => {
      if (G.zone !== zone) return;
      snow.position.set(player.pos.x, player.pos.y, player.pos.z);
      const a = g.attributes.position;
      for (let i = 0; i < n; i++) {
        let y = a.getY(i) - dt * 2.2, x = a.getX(i) + dt * 3;
        if (y < 0) y += 14;
        if (x > 20) x -= 40;
        a.setY(i, y); a.setX(i, x);
      }
      a.needsUpdate = true;
    });
  }
});

buildPlanet({
  id: "mor", name: "Mor Gezegen", sub: "PARLAYAN ORMAN", seed: 37, top: 0x12062e, hor: 0x5a3590, sun: 0xf0c4ff, sunDir: [0.2, 0.3, 0.8],
  fog: 0.012, low: 0x2a0d40, high: 0x6a2a8a, amp: 2.6, mount: 0x251040, rock: 0x3b1550, pillar: 0x3b1758, pillarTop: 0x7c3aa8,
  rocks: 70, gravity: 9, jump: 4.2, o2Rate: 1.1, sky: 0xc49bff, groundLight: 0x1a0626, hemi: 0.8, sunI: 0.5, temp: 14,
  core: [-4, -56], coreColor: 0xf0abfc, cans: [[6, -16], [-9, -34], [12, -44]], mapBg: "rgba(50,20,80,0.75)",
  grass: { count: 5000, a: 0x2dd4bf, b: 0xd946ef, glow: 0x2a0f3a }, clouds: 12, cloud: 0xd8b4fe, cloudOpacity: 0.35,
  deco: (zone, h, r) => {
    // parlayan mantarlar
    const capA = basic(0xe879f9), capB = basic(0x22d3ee), stem = std(0xd8c8e8, { emissive: 0x2a1a3a });
    for (let i = 0; i < 70; i++) {
      const x = (r() - 0.5) * 130, z = (r() - 0.5) * 130;
      if (Math.hypot(x, z) < 9 || Math.hypot(x + 4, z + 56) < 9) continue;
      const big = r() < 0.25, s = big ? 1.6 + r() : 0.4 + r() * 0.5, y = h(x, z);
      cyl(zone, x, y + s, z, s * 0.18, s * 2, stem, 8);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(s * 0.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), r() < 0.5 ? capA : capB);
      cap.position.set(x, y + s * 2, z);
      zone.group.add(cap);
      if (big) addCollider(zone, x - s * 0.25, x + s * 0.25, z - s * 0.25, z + s * 0.25);
    }
    // yuva: çekirdeğin çevresinde yumurtalar (giriş iniş aracına bakıyor)
    const [cx, cz] = [-4, -56];
    const eggM = std(0x86efac, { emissive: 0x14532d, roughness: 0.4 });
    const open = Math.atan2(-cz, -cx);
    for (let i = 0; i < 10; i++) {
      const a = open + 0.6 + i * ((Math.PI * 2 - 1.2) / 9);
      const x = cx + Math.cos(a) * 4.5, z = cz + Math.sin(a) * 4.5;
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), eggM);
      egg.scale.y = 1.4;
      egg.position.set(x, h(x, z) + 0.8, z);
      zone.group.add(egg);
      addCollider(zone, x - 0.6, x + 0.6, z - 0.6, z + 0.6);
    }
  }
});

// =============================================================== UZAYLI MODELİ
W.makeAlienMesh = () => {
  const g = new THREE.Group();
  const skin = std(0x3f6212, { emissive: 0x1a2e05, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), skin);
  body.scale.set(1, 0.8, 1.3); body.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), skin);
  head.position.set(0, 1.25, -0.55);
  const eyeM = basic(0xff2d55);
  for (const x of [-0.13, 0, 0.13]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeM);
    e.position.set(x, 1.32 + (x === 0 ? 0.06 : 0), -0.83);
    g.add(e);
  }
  const spots = basic(0xa3e635);
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), spots);
    s.position.set((i - 2) * 0.17, 1.33, 0.1 + (i % 2) * 0.2);
    g.add(s);
  }
  g.add(body, head);
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1, k = i % 3;
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.35, 0.95, -0.35 + k * 0.4);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 1.1, 6), skin);
    leg.position.set(side * 0.35, -0.4, 0);
    leg.rotation.z = side * 0.7;
    pivot.add(leg);
    g.add(pivot);
    legs.push(pivot);
  }
  g.userData.legs = legs;
  g.userData.eyes = eyeM;
  return g;
};

// =============================================================== İNSANLAR (mürettebat, köylüler)
// Eklemli insan: bacak ve kollar kalça/omuzdan döner (yürüme), gözler kırpar, baş yakındaki oyuncuya döner.
// Yüz -z yönüne bakar.
W.makePerson = (suit, skin, hair) => {
  const g = new THREE.Group();
  const suitM = std(suit), dark = std(0x2b313b), skinM = std(skin || 0xf0c8a0);
  const limb = (x, y, r0, r1, len, mat) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 8), mat);
    m.position.y = -len / 2;
    pivot.add(m);
    g.add(pivot);
    return pivot;
  };
  const legL = limb(-0.11, 0.76, 0.1, 0.09, 0.76, dark), legR = limb(0.11, 0.76, 0.1, 0.09, 0.76, dark);
  for (const leg of [legL, legR]) {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.26), std(0x1f2937));
    boot.position.set(0, -0.72, -0.04);
    leg.add(boot);
  }
  const torso = new THREE.Group();
  torso.position.y = 0.76;
  g.add(torso);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.78, 10), suitM); body.position.y = 0.39;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.08, 10), dark); belt.position.y = 0.06;
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), basic(0xfacc15)); badge.position.set(0.12, 0.55, -0.25);
  torso.add(body, belt, badge);
  const headG = new THREE.Group();
  headG.position.y = 1.02;
  torso.add(headG);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), skinM);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.215, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(hair || 0x3b2a1e));
  hairM.position.y = 0.02; hairM.rotation.x = 0.25;
  const eyes = [];
  for (const x of [-0.075, 0.075]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), basic(0xffffff));
    white.position.set(x, 0.03, -0.165);
    white.scale.z = 0.5;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), basic(0x1a1a1a));
    pupil.position.z = -0.03;
    white.add(pupil);
    headG.add(white);
    eyes.push(white);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.01), basic(0x7a2e2e));
  mouth.position.set(0, -0.08, -0.19);
  headG.add(head, hairM, mouth);
  const arm = x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.72, 0);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.66, 8), suitM);
    m.position.y = -0.33;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), skinM);
    hand.position.y = -0.69;
    pivot.add(m, hand);
    pivot.rotation.z = x < 0 ? -0.1 : 0.1;
    torso.add(pivot);
    return pivot;
  };
  const armL = arm(-0.34), armR = arm(0.34);
  g.userData.rig = { legL, legR, armL, armR, torso, headG, eyes, mouth, walk: 0, blinkT: 1 + Math.random() * 3, t0: Math.random() * 6,
    speed: 0, wave: 0, sit: 0, talkT: 0 };
  return g;
};
// Bir kare animasyon: speed (m/s) yürüyüş hızı; wave > 0 el sallar; sit 0..1 oturma; talkT > 0 ağız oynar
W.animPerson = (p, dt) => {
  const r = p.userData.rig;
  if (!r) return;
  const k = Math.min(1, r.speed / 2);
  r.walk += dt * (4 + r.speed * 3.2);
  const sw = Math.sin(r.walk) * 0.65 * k;
  r.legL.rotation.x = sw - r.sit * 1.45;
  r.legR.rotation.x = -sw - r.sit * 1.45;
  r.armL.rotation.x = -sw * 0.8;
  r.armR.rotation.x = r.wave > 0 ? -2.6 : sw * 0.8;
  r.armR.rotation.z = r.wave > 0 ? 0.35 + Math.sin(G.time * 12) * 0.35 : 0.1;
  r.wave = Math.max(0, r.wave - dt);
  r.torso.position.y = 0.76 - r.sit * 0.42 + Math.abs(Math.sin(r.walk)) * 0.04 * k + Math.sin(G.time * 2 + r.t0) * 0.006;
  r.torso.rotation.x = -0.12 * k + r.sit * 0.1;
  // göz kırpma
  r.blinkT -= dt;
  const closed = r.blinkT < 0.12;
  for (const e of r.eyes) e.scale.y = closed ? 0.12 : 1;
  if (r.blinkT <= 0) r.blinkT = 1.8 + Math.random() * 3.4;
  // konuşurken ağız
  r.talkT = Math.max(0, r.talkT - dt);
  r.mouth.scale.y = r.talkT > 0 ? 1 + Math.abs(Math.sin(G.time * 18)) * 4 : 1;
};
function placePerson(zone, p, x, z, yaw, y) {
  p.position.set(x, y === undefined ? zone.ground(x, z) : y, z);
  p.rotation.y = yaw || 0;
  zone.group.add(p);
  const r = p.userData.rig;
  visuals.push(dt => {
    if (G.zone !== zone || !p.visible) return;
    // Yakındaki oyuncuya başını çevirir (yürürken değil)
    if (r.speed === 0) {
      const dx = player.pos.x - p.position.x, dz = player.pos.z - p.position.z;
      let want = 0;
      if (dx * dx + dz * dz < 36) {
        want = Math.atan2(-dx, -dz) - p.rotation.y;
        want = Math.atan2(Math.sin(want), Math.cos(want));
        want = Math.max(-0.9, Math.min(0.9, want));
      }
      r.headG.rotation.y += (want - r.headG.rotation.y) * Math.min(1, dt * 5);
    }
    W.animPerson(p, dt);
  });
  return p;
}
W.placePerson = placePerson;

// Düşmüş kaçış kapsülü (ikinci perdenin kurtarma görevleri)
function escapePod(zone, x, z, h) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.4, 14), std(0xe5e9ef));
  body.rotation.z = Math.PI / 2 - 0.25;
  body.position.y = 1.0;
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.1, 8, 20), std(0xf97316));
  band.rotation.y = Math.PI / 2;
  band.position.y = 1.0;
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), basic(0x7dd3fc));
  win.position.set(0, 1.25, -1.08);
  win.rotation.y = Math.PI;
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic(0xff3b3b));
  light.position.set(0.3, 2.15, 0);
  // Yan kapak (+z, iniş aracına bakan taraf): üst kenarından menteşeli, mürettebat buradan çıkar
  const hinge = new THREE.Group();
  hinge.position.set(0, 1.55, 1.08);
  const hatch = new THREE.Mesh(new THREE.CircleGeometry(0.5, 18), std(0xcbd5e1));
  hatch.position.y = -0.5;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 18), std(0xf97316));
  rim.position.y = -0.5;
  hinge.add(hatch, rim);
  const dark = new THREE.Mesh(new THREE.CircleGeometry(0.47, 18), basic(0x0b0f14));
  dark.position.set(0, 1.05, 1.075);
  g.add(body, band, win, light, dark, hinge);
  g.userData.hinge = hinge;
  g.position.set(x, h(x, z), z);
  zone.group.add(g);
  addCollider(zone, x - 2, x + 2, z - 1.1, z + 1.1);
  visuals.push(() => { if (G.zone === zone) light.material.color.set(Math.sin(G.time * 5) > 0 ? 0xff3b3b : 0x400000); });
  return g;
}
// Tepesinde görev nesnesi olan özel tırmanma sütunu (sinyal kulesi, röle kulesi)
function towerPillar(zone, x, z, height, h, color) {
  const base = h(x, z), top = base + height, rad = 1.6;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.92, rad * 1.05, height + 1, 7), std(color || 0x8a8a8a));
  col.position.set(x, base + (height - 1) / 2, z);
  zone.group.add(col);
  addCollider(zone, x - rad * 0.85, x + rad * 0.85, z - rad * 0.85, z + rad * 0.85, { top, climb: true });
  return top;
}
function pylon(zone, x, y, z) {
  const g = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.2, 6), std(0x9aa3ad));
  mast.position.y = 1.1;
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), std(0xe5e9ef));
  dish.position.y = 1.9; dish.rotation.x = Math.PI * 0.7;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), basic(0x553333));
  lamp.position.y = 2.3;
  g.add(mast, dish, lamp);
  g.position.set(x, y, z);
  zone.group.add(g);
  g.userData.lamp = lamp;
  return g;
}

// =============================================================== İKİNCİ PERDE: KAYIP SİSTEM
W.towers = {};
W.pods = {};
buildPlanet({
  id: "kum", name: "Kum Ayı", sub: "ŞARKI SÖYLEYEN KUMLAR", seed: 51, top: 0x7fc0d4, hor: 0xf2e2b8, sun: 0xfff4d0, sunDir: [0.6, 0.4, 0.3],
  fog: 0.006, low: 0xc29a58, high: 0xf0d9a0, amp: 4.2, mount: 0xb88a4a, rock: 0x9a7444, pillar: 0xc08a50, pillarTop: 0xe6c48a,
  rocks: 45, gravity: 1.6, jump: 3.0, o2Rate: 1.1, sky: 0xfff1cc, groundLight: 0x8a6a3a, hemi: 0.85, sunI: 1.0, temp: 38,
  core: [-30, -48], cans: [[-8, -14], [-20, -30], [10, -34]], mapBg: "rgba(160,120,60,0.75)", reserve: [[22, -18, 4], [-40, -16, 4], [6, -56, 4]],
  grass: { count: 1400, a: 0x9a8a4a, b: 0xc8b070 }, clouds: 6, cloudOpacity: 0.35, pillars: 7,
  deco: (zone, h) => {
    const giant = new THREE.Mesh(new THREE.SphereGeometry(260, 40, 24), new THREE.MeshBasicMaterial({ color: 0xe0a070, fog: false }));
    giant.position.set(-500, 330, -700);
    const ring = new THREE.Mesh(new THREE.RingGeometry(330, 470, 64), new THREE.MeshBasicMaterial({ color: 0xf3d6a8, side: THREE.DoubleSide, transparent: true, opacity: 0.55, fog: false }));
    ring.position.copy(giant.position); ring.rotation.set(1.2, 0.3, 0.2);
    zone.group.add(giant, ring);
    W.pods.kum = escapePod(zone, -30, -48, h);
    W.towers.kum = [[22, -18, 9], [-40, -16, 8], [6, -56, 10]].map(([x, z, ht]) => {
      const top = towerPillar(zone, x, z, ht, h, 0xb07a44);
      return { x, z, top, mesh: pylon(zone, x, top, z) };
    });
  }
});
W.pools = [[8, -26, 5], [28, -22, 4.5], [22, -50, 4], [-12, -24, 6], [-6, -46, 5]];
buildPlanet({
  id: "bataklik", name: "Zehir Bataklığı", sub: "SİSLİ SULAR", seed: 63, top: 0x5a7a52, hor: 0xa9bfa0, sun: 0xeaffd0, sunDir: [-0.4, 0.5, -0.5],
  fog: 0.02, low: 0x2c3b22, high: 0x5f7a3a, amp: 1.4, mount: 0x2f4a2a, rock: 0x3a4a30, pillar: 0x4a5a38, pillarTop: 0x6a8a40,
  rocks: 55, gravity: 9, jump: 4.2, o2Rate: 1.2, sky: 0xd8f0c8, groundLight: 0x1f2a18, hemi: 0.8, sunI: 0.55, temp: 26,
  core: [34, -46], cans: [[10, -12], [24, -32], [40, -20]], mapBg: "rgba(40,70,35,0.75)", reserve: W.pools.map(([x, z, r]) => [x, z, r + 2]),
  grass: { count: 6000, a: 0x3f7a2a, b: 0x8ab84a }, clouds: 16, cloud: 0xcfe8c0, cloudOpacity: 0.6,
  deco: (zone, h) => {
    const poolM = new THREE.MeshBasicMaterial({ color: 0x7cff4a, transparent: true, opacity: 0.75 });
    for (const [x, z, r] of W.pools) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), poolM);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, h(x, z) + 0.12, z);
      zone.group.add(m);
    }
    // ölü ağaç kütükleri
    const trunk = std(0x3a2c1e);
    for (let i = 0; i < 30; i++) {
      const a = i * 2.39, d = 18 + (i * 13) % 55, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - 34, z + 46) < 12 || W.pools.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + 1)) continue;
      const t = cyl(zone, x, h(x, z) + 2, z, 0.35, 4, trunk, 7, 0.2);
      t.rotation.z = (i % 3 - 1) * 0.15;
      addCollider(zone, x - 0.35, x + 0.35, z - 0.35, z + 0.35);
    }
    W.pods.bataklik = escapePod(zone, 34, -46, h);
  }
});
buildPlanet({
  id: "kristal", name: "Kristal Ay", sub: "BUZ VE IŞIK", seed: 77, top: 0x14204a, hor: 0x6a8ac8, sun: 0xcfe8ff, sunDir: [0.3, 0.4, 0.8],
  fog: 0.01, low: 0x4a5a8a, high: 0xa8c0f0, amp: 2.2, mount: 0x2a3a6a, rock: 0x6a7ab0, pillar: 0x5a6aa8, pillarTop: 0xbfe0ff,
  rocks: 45, gravity: 2.5, jump: 3.2, o2Rate: 1.4, sky: 0xc8dcff, groundLight: 0x202848, hemi: 0.85, sunI: 0.6, temp: -92,
  core: [-36, -50], cans: [[-10, -14], [-24, -30], [-44, -28]], mapBg: "rgba(40,60,120,0.75)", reserve: [[-14, -40, 4], [-20, -20, 3], [-46, -36, 3]], clouds: 8, cloud: 0xbfd8ff, cloudOpacity: 0.4,
  deco: (zone, h, r) => {
    const cA = basic(0x67e8f9), cB = basic(0xc4b5fd);
    for (let i = 0; i < 60; i++) {
      const x = (r() - 0.5) * 130, z = (r() - 0.5) * 130;
      if (Math.hypot(x, z) < 10 || Math.hypot(x + 36, z + 50) < 12) continue;
      const s = 0.5 + r() * 1.6, m = new THREE.Mesh(new THREE.ConeGeometry(s * 0.35, s * 3, 5), r() < 0.5 ? cA : cB);
      m.position.set(x, h(x, z) + s * 1.3, z);
      m.rotation.set((r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6);
      zone.group.add(m);
      if (s > 1.3) addCollider(zone, x - 0.4, x + 0.4, z - 0.4, z + 0.4);
    }
    W.pods.kristal = escapePod(zone, -36, -50, h);
    W.towers.kristal = [[-14, -40, 9]].map(([x, z, ht]) => ({ x, z, top: towerPillar(zone, x, z, ht, h, 0x5a6aa8) }));
  }
});

// =============================================================== DÖRDÜNCÜ PERDE: AY VE DÜNYA
buildPlanet({
  id: "ay", name: "Ay", sub: "DÜNYA'NIN KAPISINDA", seed: 89, top: 0x01020a, hor: 0x14161e, sun: 0xffffff, sunDir: [0.7, 0.3, 0.2],
  fog: 0.002, low: 0x5e5e64, high: 0xb4b4ba, amp: 1.8, mount: 0x4a4a52, rock: 0x707078, pillar: 0x7a7a82, pillarTop: 0xa0a0a8,
  rocks: 80, gravity: 1.6, jump: 3.0, o2Rate: 1.1, sky: 0x8890a0, groundLight: 0x202024, hemi: 0.5, sunI: 1.15, temp: -170,
  core: [30, -40], cans: [[8, -12], [20, -26], [44, -24]], mapBg: "rgba(70,70,80,0.75)", clouds: 0, pillars: 6, reserve: [[24, -36, 6], [36, -44, 6], [24, -48, 6], [44, -54, 4]],
  deco: (zone, h) => {
    stars(zone, 2200, 900);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(120, 40, 28), new THREE.MeshBasicMaterial({ color: 0x3b82f6, fog: false }));
    earth.position.set(200, 260, -600);
    const land = new THREE.Mesh(new THREE.SphereGeometry(121, 20, 12), new THREE.MeshBasicMaterial({ color: 0x3f8f3a, fog: false, wireframe: false, transparent: true, opacity: 0.45 }));
    land.position.copy(earth.position); land.scale.set(1, 0.6, 1);
    zone.group.add(earth, land);
    // ay üssü: üç bina ve röle kulesi
    const baseM = std(0xd8dde4), stripe = std(0xf97316);
    for (const [x, z, w, d] of [[24, -36, 6, 4], [36, -44, 5, 5], [24, -48, 4, 6]]) {
      box(zone, x, h(x, z) + 1.4, z, w, 2.8, d, baseM);
      box(zone, x, h(x, z) + 2.9, z, w + 0.2, 0.2, d + 0.2, stripe, false);
    }
    W.relayTop = towerPillar(zone, 44, -54, 14, h, 0x9aa3ad);
    W.relay = pylon(zone, 44, W.relayTop, -54);
  }
});
W.fuelCells = [[20, -36], [36, -40], [27, -48]];

buildPlanet({
  id: "dunya", name: "Dünya", sub: "EV", seed: 101, vacuum: false, top: 0x4a8fe0, hor: 0xd4e8f5, sun: 0xfff6e0, sunDir: [0.4, 0.6, -0.4],
  fog: 0.0045, low: 0x3f7a2e, high: 0x8cc152, amp: 3.0, mount: 0x3a6a5a, rock: 0x8a8a80, pillar: 0x9a8a70, pillarTop: 0x6aa84a,
  rocks: 35, gravity: 9.8, jump: 4.4, sky: 0xdff0ff, groundLight: 0x3a5a2a, hemi: 1.0, sunI: 1.0, temp: 18, size: 280,
  core: [0, -80], cans: [], mapBg: "rgba(50,100,50,0.75)", pillars: 8, reserve: [[0, -80, 24], [-55, -20, 18]],
  grass: { count: 11000, a: 0x4c9a2a, b: 0xa8d860, radius: 115 }, clouds: 22, cloudOpacity: 0.8,
  deco: (zone, h, r) => {
    // göl
    const lake = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: 0x3fa0e0, transparent: true, opacity: 0.8 }));
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(-55, h(-55, -20) + 0.3, -20);
    zone.group.add(lake);
    // ağaçlar
    const trunk = std(0x7a5230), leafA = std(0x3d8a2e), leafB = std(0x5aa83a);
    for (let i = 0; i < 160; i++) {
      const x = (r() - 0.5) * 240, z = (r() - 0.5) * 240;
      if (Math.hypot(x, z) < 12 || Math.hypot(x, z + 80) < 26 || Math.hypot(x + 55, z + 20) < 18 || Math.abs(x) > 120 || Math.abs(z) > 120) continue;
      if (blockedAt(zone, x, z, 1.5)) continue;
      const s = 0.8 + r() * 0.8, y = h(x, z);
      cyl(zone, x, y + 1.2 * s, z, 0.22 * s, 2.4 * s, trunk, 7);
      const leaf = r() < 0.5 ? new THREE.ConeGeometry(1.6 * s, 3.6 * s, 7) : new THREE.SphereGeometry(1.6 * s, 10, 8);
      const m = new THREE.Mesh(leaf, r() < 0.5 ? leafA : leafB);
      m.position.set(x, y + 3.6 * s, z);
      zone.group.add(m);
      addCollider(zone, x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s);
    }
    // köy
    const wallM = std(0xf1e4c8), roofM = std(0xb5523b);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + 0.3, x = Math.cos(a) * 15, z = -80 + Math.sin(a) * 15, y = h(x, z);
      box(zone, x, y + 1.2, z, 4, 3.4, 4, wallM);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 2.2, 4), roofM);
      roof.position.set(x, y + 4.0, z); roof.rotation.y = Math.PI / 4;
      zone.group.add(roof);
    }
    // köy meydanında şenlik ateşi
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), basic(0xffa040));
    fire.position.set(0, h(0, -80) + 0.6, -80);
    zone.group.add(fire);
    cyl(zone, 0, h(0, -80) + 0.15, -80, 0.9, 0.3, std(0x6b6b6b), 10);
    addCollider(zone, -0.8, 0.8, -80.8, -79.2);
    const fl = new THREE.PointLight(0xffa040, 1.2, 14, 1.5);
    fl.position.set(0, h(0, -80) + 1.5, -80);
    zone.group.add(fl);
    visuals.push(() => { if (G.zone === zone) { fire.scale.y = 1 + Math.sin(G.time * 9) * 0.15; fl.intensity = 1.1 + Math.sin(G.time * 13) * 0.2; } });
  }
});

// =============================================================== ÜÇÜNCÜ PERDE: UZAYLI ANA GEMİSİ
// Izgara harita (her hücre 4m): # duvar, . zemin, H giriş kapağı, N enerji düğümü, C izleyici çekirdeğin odası,
// D enerji bariyeri (üç düğüm yok olunca kalkar), A uzaylı.
const MOTHER_MAP = [
  "###############",
  "#H....#...#..N#",
  "#.....#.A.#...#",
  "#.###...#...#.#",
  "#....#####..A.#",
  "#.##.#CCC#.##.#",
  "#.#N.#CCC#.A#.#",
  "#.##.#CCC#.##.#",
  "#....##D##....#",
  "###.##...##.###",
  "#N.A......A...#",
  "#...#..A..#...#",
  "###############"
];
const MOTHER = makeZone("anagemi", { vacuum: true, o2Rate: 1.0, gravity: 9.8, jump: 4.2, speed: 3.4, bg: 0x12041c, fog: 0.03,
  title: "UZAYLI ANA GEMİSİ", sub: "İZLEYİCİ ÇEKİRDEK", temp: 31, mapScale: 2.6, mapBg: "rgba(40,10,50,0.8)", mapWall: "rgba(220,150,255,0.85)" });
W.mother = MOTHER;
W.motherNodes = [];
W.motherAliens = [];
{
  const CS = 4, rows = MOTHER_MAP.length, cols = MOTHER_MAP[0].length;
  const cx = c => (c - (cols - 1) / 2) * CS, cz = r => (r - (rows - 1) / 2) * CS;
  W.motherCell = (r, c) => [cx(c), cz(r)];
  const wallM = std(0x3a1450, { emissive: 0x12041c }), veinM = basic(0xd946ef), floorM = std(0x1e0a2a, { emissive: 0x0a0210 });
  const fg = new THREE.PlaneGeometry(cols * CS, rows * CS); fg.rotateX(-Math.PI / 2);
  MOTHER.group.add(new THREE.Mesh(fg, floorM));
  const cg = new THREE.PlaneGeometry(cols * CS, rows * CS); cg.rotateX(Math.PI / 2); cg.translate(0, 4.5, 0);
  MOTHER.group.add(new THREE.Mesh(cg, std(0x14061e)));
  const cores = [];
  MOTHER_MAP.forEach((row, r) => [...row].forEach((ch, c) => {
    const x = cx(c), z = cz(r);
    if (ch === "#") {
      box(MOTHER, x, 2.25, z, CS, 4.5, CS, wallM);
      if ((r * 7 + c * 3) % 4 === 0) box(MOTHER, x, 1.2 + ((r + c) % 3) * 0.9, z, CS + 0.04, 0.08, CS + 0.04, veinM, false);
    } else if (ch === "H") W.motherHatch = [x, z];
    else if (ch === "N") W.motherNodes.push([x, z]);
    else if (ch === "A") W.motherAliens.push([x, z]);
    else if (ch === "C") cores.push([x, z]);
    else if (ch === "D") {
      const field = box(MOTHER, x, 2.25, z, CS, 4.5, 0.2, new THREE.MeshBasicMaterial({ color: 0xff2ad4, transparent: true, opacity: 0.45, depthWrite: false }), false);
      W.motherBarrier = { mesh: field, col: addCollider(MOTHER, x - CS / 2, x + CS / 2, z - 0.4, z + 0.4) };
    }
  }));
  const ccx = cores.reduce((s, p) => s + p[0], 0) / cores.length, ccz = cores.reduce((s, p) => s + p[1], 0) / cores.length;
  W.motherCore = [ccx, ccz];
  const coreG = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), basic(0xff2a6d));
  coreG.add(orb);
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.4, 6), std(0x2a0a3a));
    sp.position.setFromSphericalCoords(1.3, Math.acos(1 - 2 * (i + 0.5) / 8), i * 2.4);
    sp.lookAt(0, 0, 0); sp.rotateX(-Math.PI / 2);
    coreG.add(sp);
  }
  coreG.position.set(ccx, 2.2, ccz);
  MOTHER.group.add(coreG);
  W.motherCoreMesh = coreG;
  addCollider(MOTHER, ccx - 1.2, ccx + 1.2, ccz - 1.2, ccz + 1.2);
  visuals.push(dt => { if (G.zone === MOTHER) { coreG.rotation.y += dt * 0.8; orb.scale.setScalar(1 + Math.sin(G.time * 4) * 0.06); } });
  // düğümler: kaide + kırmızı küre (vurulacak)
  W.motherNodeMeshes = W.motherNodes.map(([x, z]) => {
    cyl(MOTHER, x, 0.5, z, 0.6, 1.0, std(0x2a0a3a), 10);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), basic(0xff3b3b));
    s.position.set(x, 1.6, z);
    MOTHER.group.add(s);
    addCollider(MOTHER, x - 0.6, x + 0.6, z - 0.6, z + 0.6);
    return s;
  });
  visuals.push(() => { if (G.zone === MOTHER) W.motherNodeMeshes.forEach((m, i) => { if (!m.userData.dead) m.scale.setScalar(1 + Math.sin(G.time * 3 + i) * 0.08); }); });
  const [hx, hz] = W.motherHatch;
  cyl(MOTHER, hx - 1.6, 1.6, hz, 1.0, 0.15, M.trim, 20).rotation.z = Math.PI / 2;
  W.p.motherHatch = [hx - 1.5, 1.5, hz];
  MOTHER.spawn = [hx, 0, hz];
  MOTHER.group.add(new THREE.HemisphereLight(0xd8a0ff, 0x200830, 0.75));
  MOTHER.group.add(new THREE.AmbientLight(0x6a2a8a, 0.35));
  for (const [x, z] of [W.motherHatch, ...W.motherNodes, W.motherCore]) {
    const l = new THREE.PointLight(0xff5ad8, 0.9, 14, 1.6);
    l.position.set(x, 3.6, z);
    MOTHER.group.add(l);
  }
}
