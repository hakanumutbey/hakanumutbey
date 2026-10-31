// IN A SPACE 2 — 3D modeller (hepsi kodla, ilkel şekillerden): eklemli insan (astronot, mürettebat, Başkan),
// Manyetik Balyoz, BİP, Vorak türleri ve boss'lar, Lumi yerlileri, ATLAS gemisi ve parçaları, Vorak gemileri,
// Ay anteni. 1'den kalan: astronot giysi çizgisi ve jetpack süzülme duruşu.
"use strict";

const MATS = {};
function mat(color, o) {
  const key = color + JSON.stringify(o || {});
  if (!MATS[key]) MATS[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, o || {}));
  return MATS[key];
}
function glowMat(color, k) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k || 1.4, roughness: 0.4 }); }
function mesh(geo, m, x, y, z, parent) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x || 0, y || 0, z || 0);
  o.castShadow = true;
  o.receiveShadow = true;
  if (parent) parent.add(o);
  return o;
}
function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CYL = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 12);
const SPH = (r, w, h) => new THREE.SphereGeometry(r, w || 16, h || 12);
const CAP = (r, h) => { const g = new THREE.CylinderGeometry(r, r, h, 12); return g; };

// ---------------------------------------------------------------- insan
// opts: suit (giysi rengi), accent, helmet (kask), visor, skin, hair, formal (takım elbise), backpack, scale, badge
function makeHuman(opts) {
  const o = Object.assign({ suit: 0xe8e6e0, accent: 0xff8a2a, helmet: true, visor: 0xd9a441, skin: 0xc99872, hair: 0x2a1d14,
    formal: false, backpack: true, scale: 1, hairStyle: "short" }, opts || {});
  const root = new THREE.Group();
  const S = mat(o.suit, { roughness: 0.8 }), A = mat(o.accent), D = mat(o.formal ? 0x1e2330 : 0x50545c), SK = mat(o.skin);
  const hips = pivot(root, 0, 0.98, 0);
  const pelvis = mesh(BOX(0.38, 0.2, 0.24), o.formal ? D : S, 0, 0, 0, hips);
  const torso = pivot(hips, 0, 0.08, 0);
  // gövde
  mesh(BOX(0.44, 0.5, 0.27), o.formal ? D : S, 0, 0.3, 0, torso);
  if (!o.formal) {
    mesh(BOX(0.46, 0.08, 0.29), A, 0, 0.12, 0, torso);                 // bel bandı
    mesh(BOX(0.2, 0.14, 0.04), mat(0x30343c), 0, 0.36, -0.15, torso);   // göğüs paneli
    mesh(BOX(0.05, 0.05, 0.02), glowMat(0x7fd8ff, 2), -0.05, 0.38, -0.175, torso);
    mesh(BOX(0.05, 0.05, 0.02), glowMat(0x6fd36a, 2), 0.05, 0.38, -0.175, torso);
    mesh(BOX(0.1, 0.06, 0.02), mat(0x2f5fb8), -0.15, 0.48, -0.14, torso); // bayrak yaması
  } else {
    mesh(BOX(0.12, 0.42, 0.02), mat(0xf2f2f2), 0, 0.32, -0.137, torso);   // gömlek
    mesh(BOX(0.05, 0.34, 0.02), mat(0x8a1f2a), 0, 0.3, -0.148, torso);    // kravat
  }
  if (o.backpack) {
    const bp = mesh(BOX(0.4, 0.46, 0.18), mat(0xd6d3cc), 0, 0.32, 0.22, torso);
    mesh(BOX(0.3, 0.06, 0.02), A, 0, 0.45, 0.32, torso);
    // jetpack memeleri ve alevler (süzülürken görünür)
    for (const x of [-0.12, 0.12]) mesh(CYL(0.05, 0.07, 0.12), mat(0x40444c, { metalness: 0.6 }), x, 0.06, 0.24, torso);
    var flames = new THREE.Group(); torso.add(flames);
    for (const x of [-0.12, 0.12]) {
      const f = mesh(new THREE.ConeGeometry(0.06, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.8 }), x, -0.25, 0.24, flames);
      f.rotation.x = Math.PI; f.castShadow = false;
    }
    flames.visible = false;
  }
  // baş
  const neck = pivot(torso, 0, 0.58, 0);
  const head = pivot(neck, 0, 0.14, 0);
  if (o.helmet) {
    mesh(SPH(0.2), S, 0, 0.02, 0, head);
    const vis = mesh(new THREE.SphereGeometry(0.17, 16, 12, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.28, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({ color: o.visor, metalness: 0.9, roughness: 0.15 }), 0, 0.02, -0.04, head);
    vis.scale.set(1.08, 1.08, 1.12);
    mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 20), A, 0, -0.14, 0, head).rotation.x = Math.PI / 2;
  } else {
    mesh(BOX(0.2, 0.25, 0.22), SK, 0, 0.02, 0, head);
    mesh(BOX(0.035, 0.035, 0.01), mat(0x111111), -0.05, 0.05, -0.112, head);
    mesh(BOX(0.035, 0.035, 0.01), mat(0x111111), 0.05, 0.05, -0.112, head);
    mesh(BOX(0.08, 0.015, 0.01), mat(0x7a3f35), 0, -0.05, -0.112, head);
    const H = mat(o.hair);
    if (o.hairStyle === "long") { mesh(BOX(0.23, 0.12, 0.25), H, 0, 0.15, 0.01, head); mesh(BOX(0.23, 0.3, 0.07), H, 0, -0.02, 0.11, head); }
    else if (o.hairStyle === "bald") mesh(BOX(0.21, 0.04, 0.2), H, 0, 0.13, 0.03, head);
    else if (o.hairStyle === "gray") { mesh(BOX(0.22, 0.09, 0.24), H, 0, 0.15, 0.01, head); mesh(BOX(0.22, 0.12, 0.05), H, 0, 0.06, 0.1, head); }
    else { mesh(BOX(0.22, 0.08, 0.24), H, 0, 0.15, 0.01, head); mesh(BOX(0.22, 0.1, 0.05), H, 0, 0.08, 0.1, head); }
    if (!o.formal) mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 16), A, 0, -0.14, 0, head).rotation.x = Math.PI / 2;  // giysi yakası
  }
  // kollar
  const mkArm = side => {
    const sh = pivot(torso, side * 0.29, 0.5, 0);
    mesh(SPH(0.09), o.formal ? D : S, 0, 0, 0, sh);
    mesh(CAP(0.075, 0.3), o.formal ? D : S, 0, -0.16, 0, sh);
    const el = pivot(sh, 0, -0.31, 0);
    mesh(CAP(0.068, 0.28), o.formal ? D : S, 0, -0.14, 0, el);
    if (!o.formal) mesh(CYL(0.08, 0.08, 0.06), A, 0, -0.25, 0, el);
    const hand = pivot(el, 0, -0.32, 0);
    mesh(BOX(0.1, 0.11, 0.09), o.formal ? SK : mat(0x50545c), 0, 0, 0, hand);
    return { sh, el, hand };
  };
  const L = mkArm(-1), R = mkArm(1);
  // bacaklar
  const mkLeg = side => {
    const hip = pivot(hips, side * 0.11, -0.06, 0);
    mesh(CAP(0.095, 0.44), o.formal ? D : S, 0, -0.22, 0, hip);
    const knee = pivot(hip, 0, -0.45, 0);
    mesh(CAP(0.085, 0.42), o.formal ? D : S, 0, -0.2, 0, knee);
    if (!o.formal) mesh(CYL(0.095, 0.095, 0.05), A, 0, -0.06, 0, knee);
    const foot = mesh(BOX(0.13, 0.1, 0.26), o.formal ? mat(0x111111) : mat(0x55585e), 0, -0.44, -0.05, knee);
    return { hip, knee, foot };
  };
  const LL = mkLeg(-1), RL = mkLeg(1);
  root.scale.setScalar(o.scale);
  return { root, hips, torso, neck, head, armL: L.sh, armR: R.sh, foreL: L.el, foreR: R.el, hand: R.hand, handL: L.hand,
    legL: LL.hip, legR: RL.hip, shinL: LL.knee, shinR: RL.knee, flames, phase: 0, t: 0 };
}

// Eklemli insan animasyonu. st: { moving, running, onGround, climbing, gliding, attack, dodge, aiming, hurt, dead, vy, holding, talk, wave, sit, pose }
function animateHuman(r, st, dt) {
  r.t += dt;
  const sp = st.running ? 11 : 7.5;
  if (st.moving && st.onGround && !st.climbing) r.phase += dt * sp; else r.phase *= Math.max(0, 1 - dt * 6);
  const ph = r.phase, sw = st.moving && st.onGround ? (st.running ? 0.95 : 0.6) : 0;
  const k = Math.min(1, dt * 14);
  const set = (o, x, y, z) => { o.rotation.x += (x - o.rotation.x) * k; o.rotation.y += ((y || 0) - o.rotation.y) * k; o.rotation.z += ((z || 0) - o.rotation.z) * k; };
  // varsayılan: yürüme/koşma döngüsü
  let legL = Math.sin(ph) * sw, legR = -Math.sin(ph) * sw;
  let shinL = -Math.max(0, -Math.cos(ph)) * sw * 1.2 - 0.05, shinR = -Math.max(0, Math.cos(ph)) * sw * 1.2 - 0.05;
  let armL = -Math.sin(ph) * sw * 0.8, armR = Math.sin(ph) * sw * 0.8, armLz = -0.12, armRz = 0.12;
  let foreL = 0.25 + (st.running ? 0.9 : 0.2), foreR = 0.25 + (st.running ? 0.9 : 0.2);
  let torsoX = st.running ? 0.22 : 0.04, torsoY = 0, torsoZ = 0, hipsY = 0.98 + Math.abs(Math.sin(ph)) * 0.05 * sw, hipsX = 0;
  let headX = 0, headY = 0;
  // nefes
  torsoX += Math.sin(r.t * 2) * 0.012;
  if (!st.onGround && !st.climbing && !st.gliding) {
    legL = 0.5; legR = -0.2; shinL = -0.9; shinR = -0.4; armL = -0.4; armR = -0.4; armLz = -0.6; armRz = 0.6;
  }
  if (st.gliding) {
    legL = -0.3; legR = -0.4; shinL = -0.5; shinR = -0.3; armL = 0.2; armR = 0.2; armLz = -1.35; armRz = 1.35; foreL = 0.1; foreR = 0.1; torsoX = 0.5;
  }
  if (st.climbing) {
    const c = r.t * 7;
    armL = 2.6 + Math.sin(c) * 0.4; armR = 2.6 - Math.sin(c) * 0.4; armLz = -0.2; armRz = 0.2; foreL = 0.4; foreR = 0.4;
    legL = 0.6 + Math.sin(c) * 0.4; legR = 0.6 - Math.sin(c) * 0.4; shinL = -1.1; shinR = -1.1; torsoX = -0.1;
  }
  if (st.holding && !st.climbing && !st.gliding && !st.attack) { armR = Math.max(armR, 0.15); foreR = 0.5; }
  if (st.aiming) {
    // sağ el balyozu omzun arkasına kaldırır, sol el hedefi gösterir
    armR = 2.6; armRz = 0.5; foreR = 1.4; armL = 1.45; armLz = -0.1; foreL = 0.05; torsoY = 0.3;
  }
  const a = st.attack;
  if (a) {
    const p = Math.min(1, a.t / a.len);
    const e = p < 0.3 ? p / 0.3 : 1;          // hazırlık → vuruş
    if (a.idx === 0) { torsoY = lerp(0.9, -0.9, easeOut(p)); armR = 1.45; armRz = 0.3; foreR = 0.15; }
    else if (a.idx === 1) { torsoY = lerp(-0.9, 0.9, easeOut(p)); armR = 1.45; armRz = -0.1; foreR = 0.2; armL = 0.6; }
    else if (a.idx === 2) {
      const q = p < 0.4 ? p / 0.4 : 1;
      armR = p < 0.4 ? lerp(1.0, 3.1, q) : lerp(3.1, 0.7, Math.min(1, (p - 0.4) / 0.15)); armL = armR; armRz = 0.05; armLz = -0.05;
      foreR = 0.2; foreL = 0.2; torsoX = p < 0.4 ? -0.25 : 0.55; legL = 0.5; shinL = -0.5; legR = -0.3; hipsY = p < 0.4 ? 0.98 : 0.86;
    }
    else if (a.idx === 5) { armR = p < 0.35 ? 2.9 : 1.3; foreR = 0.1; armL = 1.3; torsoY = p < 0.35 ? 0.5 : -0.4; }
    else { armR = lerp(0.3, 1.55, e); foreR = lerp(1.6, 0.05, e); torsoY = -0.3; }
  }
  if (st.hurt > 0) { torsoX -= 0.3; headX -= 0.2; }
  if (st.talk) { headY = Math.sin(r.t * 1.3) * 0.15; armR = 0.4 + Math.sin(r.t * 3) * 0.15; foreR = 1.0; }
  if (st.wave) { armR = 2.8; armRz = 0.4 + Math.sin(r.t * 9) * 0.35; foreR = 0.3; }
  if (st.sit) { legL = 1.5; legR = 1.5; shinL = -1.5; shinR = -1.5; hipsY = 0.55; }
  if (st.lie) { hipsY = 0.2; hipsX = -1.5; armLz = -0.8; armRz = 0.8; }
  if (st.pose === "point") { armR = 1.6; foreR = 0; }
  if (st.pose === "salute") { armR = 2.2; armRz = 1.0; foreR = 2.2; }
  if (st.pose === "cheer") { armR = 3.0; armL = 3.0; armRz = 0.3; armLz = -0.3; foreL = foreR = 0.2; hipsY += Math.abs(Math.sin(r.t * 6)) * 0.08; }
  set(r.legL, legL); set(r.legR, legR); set(r.shinL, shinL); set(r.shinR, shinR);
  set(r.armL, armL, 0, armLz); set(r.armR, armR, 0, armRz); set(r.foreL, foreL); set(r.foreR, foreR);
  set(r.torso, torsoX, torsoY, torsoZ);
  set(r.head, headX, headY);
  r.hips.position.y += (hipsY - r.hips.position.y) * k;
  // yuvarlanma: kalçadan öne takla
  if (st.dodge) {
    const p = st.dodge.t / 0.42;
    r.hips.rotation.x = p * Math.PI * 2;
    r.hips.position.y = 0.55;
    r.legL.rotation.x = r.legR.rotation.x = 1.4; r.shinL.rotation.x = r.shinR.rotation.x = -2;
  } else if (st.dead) {
    r.hips.rotation.x += (-1.45 - r.hips.rotation.x) * Math.min(1, dt * 4);
    r.hips.position.y += (0.22 - r.hips.position.y) * Math.min(1, dt * 4);
  } else r.hips.rotation.x += (hipsX - r.hips.rotation.x) * k;
  if (r.flames) { r.flames.visible = !!st.gliding; if (st.gliding) r.flames.scale.y = 0.8 + Math.random() * 0.5; }
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// Basit NPC: konuşurken başını sallar, dönebilir
function makeNPC(zone, opts, x, z, yaw) {
  const r = makeHuman(opts);
  r.root.position.set(x, zone.ground(x, z), z);
  r.root.rotation.y = yaw || 0;
  zone.group.add(r.root);
  r.st = { onGround: true };
  visuals.push(dt => { if (zone.group.visible && r.root.visible) animateHuman(r, r.st, dt); });
  return r;
}
function faceTo(r, x, z) { r.root.rotation.y = Math.atan2(-(x - r.root.position.x), -(z - r.root.position.z)); }

// ---------------------------------------------------------------- Manyetik Balyoz
function makeHammer() {
  const g = new THREE.Group();
  mesh(CYL(0.035, 0.035, 0.62, 8), mat(0x3a2a20), 0, -0.25, 0, g);          // sap
  mesh(CYL(0.045, 0.045, 0.1, 8), mat(0x8a8f99, { metalness: 0.7 }), 0, 0.08, 0, g);
  const head = mesh(BOX(0.38, 0.2, 0.22), mat(0x5b6270, { metalness: 0.8, roughness: 0.35 }), 0, -0.62, 0, g);
  mesh(BOX(0.06, 0.24, 0.26), mat(0x2a2e36, { metalness: 0.8 }), -0.2, -0.62, 0, g);
  mesh(BOX(0.06, 0.24, 0.26), mat(0x2a2e36, { metalness: 0.8 }), 0.2, -0.62, 0, g);
  // mıknatıs çekirdeği: buz mavisi parıltı
  mesh(BOX(0.2, 0.06, 0.24), glowMat(0x7fd8ff, 2.2), 0, -0.62, 0, g);
  const light = new THREE.PointLight(0x7fd8ff, 0.6, 3);
  light.position.set(0, -0.62, 0);
  g.add(light);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- BİP
function makeBip() {
  const root = new THREE.Group();
  const body = mesh(SPH(0.24), mat(0xf0ede6, { roughness: 0.4 }), 0, 0, 0, root);
  mesh(new THREE.TorusGeometry(0.245, 0.03, 8, 24), mat(0xff8a2a), 0, 0, 0, root).rotation.x = Math.PI / 2;
  const eye = mesh(new THREE.CircleGeometry(0.1, 16), glowMat(0x7fd8ff, 2.5), 0, 0.02, -0.235, root);
  eye.rotation.y = Math.PI;
  mesh(CYL(0.01, 0.01, 0.2), mat(0x333333), 0, 0.3, 0, root);
  const rotor = pivot(root, 0, 0.4, 0);
  mesh(BOX(0.6, 0.015, 0.06), mat(0x30343c), 0, 0, 0, rotor);
  mesh(BOX(0.06, 0.015, 0.6), mat(0x30343c), 0, 0, 0, rotor);
  mesh(CYL(0.03, 0.05, 0.1), mat(0x50545c), 0.18, -0.2, 0, root);
  mesh(CYL(0.03, 0.05, 0.1), mat(0x50545c), -0.18, -0.2, 0, root);
  const l = new THREE.PointLight(0x7fd8ff, 0.5, 4); root.add(l);
  return { root, rotor, eye };
}

// ---------------------------------------------------------------- Vorak (düşman uzaylılar)
// Uzun, ince, koyu mor kabuklu; turuncu parlayan gözler; geriye bükük (dijitigrad) bacaklar.
function makeAlienRig(o) {
  o = Object.assign({ color: 0x3a2346, plate: 0x1c1224, eye: 0xff7a2a, scale: 1, bulk: 1, arms: "claw" }, o);
  const root = new THREE.Group();
  const B = mat(o.color, { roughness: 0.55, metalness: 0.2 }), P = mat(o.plate, { roughness: 0.35, metalness: 0.5 });
  const eyeM = new THREE.MeshStandardMaterial({ color: o.eye, emissive: o.eye, emissiveIntensity: 1.5 });
  const flashM = [];
  const hips = pivot(root, 0, 1.05, 0);
  const torso = pivot(hips, 0, 0.05, 0);
  const ch = mesh(BOX(0.42 * o.bulk, 0.62, 0.3 * o.bulk), B, 0, 0.36, 0.04, torso);
  mesh(BOX(0.5 * o.bulk, 0.2, 0.34 * o.bulk), P, 0, 0.58, 0.02, torso);           // omuz zırhı
  mesh(BOX(0.3 * o.bulk, 0.3, 0.05), P, 0, 0.35, -0.14 * o.bulk, torso);          // göğüs plakası
  for (let i = 0; i < 3; i++) mesh(BOX(0.05, 0.12, 0.1), P, 0, 0.3 + i * 0.16, 0.2 * o.bulk, torso);   // sırt dikenleri
  const neck = pivot(torso, 0, 0.7, -0.02);
  const head = pivot(neck, 0, 0.08, 0);
  const skull = mesh(new THREE.ConeGeometry(0.17, 0.42, 6), B, 0, 0.05, 0.08, head);
  skull.rotation.x = -1.2;
  mesh(BOX(0.26, 0.16, 0.22), P, 0, 0.04, -0.02, head);
  const e1 = mesh(BOX(0.07, 0.035, 0.02), eyeM, -0.07, 0.05, -0.135, head), e2 = mesh(BOX(0.07, 0.035, 0.02), eyeM, 0.07, 0.05, -0.135, head);
  mesh(BOX(0.05, 0.03, 0.02), eyeM, 0, 0.11, -0.13, head);
  // mandibular
  const jawL = mesh(BOX(0.04, 0.14, 0.04), P, -0.07, -0.08, -0.1, head), jawR = mesh(BOX(0.04, 0.14, 0.04), P, 0.07, -0.08, -0.1, head);
  const mkArm = side => {
    const sh = pivot(torso, side * 0.3 * o.bulk, 0.56, 0);
    mesh(CAP(0.07 * o.bulk, 0.42), B, 0, -0.2, 0, sh);
    const el = pivot(sh, 0, -0.42, 0);
    mesh(CAP(0.06 * o.bulk, 0.4), B, 0, -0.18, 0, el);
    const hand = pivot(el, 0, -0.4, 0);
    if (o.arms === "cannon" && side > 0) {
      mesh(CYL(0.09, 0.11, 0.42, 8), P, 0, -0.1, 0, hand);
      mesh(CYL(0.06, 0.06, 0.05, 8), eyeM, 0, -0.32, 0, hand);
    } else {
      for (const dx of [-0.05, 0, 0.05]) { const c = mesh(new THREE.ConeGeometry(0.025, 0.24, 5), P, dx, -0.12, -0.02, hand); c.rotation.x = Math.PI + 0.3; }
    }
    return { sh, el, hand };
  };
  const L = mkArm(-1), R = mkArm(1);
  let shield = null;
  if (o.arms === "shield") {
    shield = new THREE.Group();
    const s = mesh(BOX(0.9, 1.3, 0.1), mat(0x2a3a4a, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0, shield);
    mesh(BOX(0.7, 0.08, 0.12), glowMat(0x7fd8ff, 1.6), 0, 0.3, 0, shield);
    mesh(BOX(0.7, 0.08, 0.12), glowMat(0x7fd8ff, 1.6), 0, -0.3, 0, shield);
    shield.position.set(0, -0.15, -0.25);
    L.hand.add(shield);
  }
  // dijitigrad bacak: uyluk öne, baldır geriye, uzun ayak
  const mkLeg = side => {
    const hip = pivot(hips, side * 0.14 * o.bulk, -0.05, 0);
    mesh(CAP(0.09 * o.bulk, 0.42), B, 0, -0.2, 0, hip);
    const knee = pivot(hip, 0, -0.42, 0);
    mesh(CAP(0.07 * o.bulk, 0.38), B, 0, -0.18, 0, knee);
    const ankle = pivot(knee, 0, -0.38, 0);
    mesh(CAP(0.05, 0.3), P, 0, -0.14, 0, ankle);
    mesh(BOX(0.14, 0.05, 0.26), P, 0, -0.29, -0.08, ankle);
    return { hip, knee, ankle };
  };
  const LL = mkLeg(-1), RL = mkLeg(1);
  root.scale.setScalar(o.scale);
  root.traverse(m => { if (m.isMesh) flashM.push(m); });
  return { root, hips, torso, head, armL: L.sh, armR: R.sh, foreL: L.el, foreR: R.el, handL: L.hand, handR: R.hand,
    legL: LL.hip, legR: RL.hip, kneeL: LL.knee, kneeR: RL.knee, ankL: LL.ankle, ankR: RL.ankle, eyeM, shield, jawL, jawR, phase: 0, t: 0, kind: "alien", scale: o.scale };
}
function makeDroneModel() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  mesh(new THREE.OctahedronGeometry(0.42, 0), mat(0x2a1d33, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0, body).scale.set(1, 0.6, 1.3);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff7a2a, emissiveIntensity: 1.6 });
  mesh(SPH(0.12), eyeM, 0, 0, -0.45, body);
  for (const s of [-1, 1]) { const f = mesh(BOX(0.6, 0.04, 0.3), mat(0x1c1224, { metalness: 0.6 }), s * 0.5, 0, 0.1, body); f.rotation.z = s * 0.3; }
  return { root, body, eyeM, kind: "drone", t: 0 };
}
function makeEnemyModel(type) {
  if (type === "drone") return makeDroneModel();
  if (type === "shooter") return makeAlienRig({ arms: "cannon", color: 0x2e2a4a, eye: 0xffb43c });
  if (type === "brute") return makeAlienRig({ arms: "shield", scale: 1.35, bulk: 1.5, color: 0x3f2a2a, plate: 0x231616 });
  if (type === "stalker") return makeAlienRig({ color: 0x1a1a24, plate: 0x0c0c12, eye: 0xff3a5a, scale: 1.1 });
  return makeAlienRig({});
}

function animateEnemy(e, dt) {
  const r = e.rig;
  r.t += dt;
  r.root.position.set(e.pos.x, e.fly ? e.y : e.pos.y, e.pos.z);
  r.root.rotation.y = e.yaw;
  // vurulunca beyaz parla, saldırı hazırlığında gözler parlar
  const flashOn = e.flash > 0;
  if (r.flashOn !== flashOn) {
    r.flashOn = flashOn;
    r.root.traverse(m => { if (m.isMesh && m.material.emissive && m.material !== r.eyeM) { m.material = flashOn ? FLASH_MAT : (m.userData.mat || m.material); } });
  }
  if (r.eyeM) r.eyeM.emissiveIntensity = e.state === "windup" ? 4 + Math.sin(r.t * 40) * 1.5 : 1.5;
  if (r.kind === "drone") {
    r.body.rotation.z = Math.sin(r.t * 2) * 0.15;
    if (e.dead) { r.root.position.y = Math.max(e.pos.y + 0.3, r.root.position.y - e.deadT * 4); r.body.rotation.x += dt * 8; }
    return;
  }
  if (e.dead) {
    r.hips.rotation.x += (1.5 - r.hips.rotation.x) * Math.min(1, dt * 5);
    r.hips.position.y += (0.3 - r.hips.position.y) * Math.min(1, dt * 5);
    r.root.position.y -= Math.max(0, e.deadT - 1.5) * 0.6;
    return;
  }
  const k = Math.min(1, dt * 12);
  const set = (o, x, z) => { o.rotation.x += (x - o.rotation.x) * k; o.rotation.z += ((z || 0) - o.rotation.z) * k; };
  const moving = e.state === "move" || (e.state === "idle" && e.patrol);
  if (moving) r.phase += dt * (e.speed * 2.2); else r.phase *= 0.9;
  const sw = moving ? 0.7 : 0, ph = r.phase;
  let legL = Math.sin(ph) * sw + 0.35, legR = -Math.sin(ph) * sw + 0.35;
  let kneeL = -0.9 - Math.max(0, Math.cos(ph)) * sw * 0.6, kneeR = -0.9 - Math.max(0, -Math.cos(ph)) * sw * 0.6;
  let armL = -Math.sin(ph) * sw * 0.6 + 0.2, armR = Math.sin(ph) * sw * 0.6 + 0.2, foreL = 0.6, foreR = 0.6, torso = moving ? 0.35 : 0.15;
  let armLz = -0.2, armRz = 0.2;
  if (e.state === "windup") {
    if (e.ranged) { armR = 1.55; foreR = 0; torso = 0.05; }
    else { armR = 2.7; armL = 2.4; foreR = 0.9; foreL = 0.9; torso = -0.3; armRz = 0.5; armLz = -0.5; }
  }
  if (e.lunge > 0) { e.lunge -= dt; armR = 1.0; armL = 1.2; foreR = 0; foreL = 0; torso = 0.7; }
  if (e.state === "stun") { torso = -0.35; armL = -0.3; armR = -0.3; armLz = -0.9; armRz = 0.9; }
  if (e.state === "ready") { armL = 0.9; armR = 0.9; foreL = 1.2; foreR = 1.2; torso = 0.3; }
  if (e.rig.shield && e.shieldHp > 0 && e.state !== "windup") { armL = 1.4; foreL = 0.2; armLz = 0.3; }
  if (e.ranged && e.state !== "windup" && e.alerted) { armR = 1.3; foreR = 0.1; }
  set(r.legL, legL); set(r.legR, legR); set(r.kneeL, kneeL); set(r.kneeR, kneeR);
  set(r.ankL, 0.6); set(r.ankR, 0.6);
  set(r.armL, armL, armLz); set(r.armR, armR, armRz); set(r.foreL, foreL); set(r.foreR, foreR);
  set(r.torso, torso);
  r.jawL.rotation.z = -0.2 - Math.abs(Math.sin(r.t * 3)) * (e.state === "windup" ? 0.5 : 0.1);
  r.jawR.rotation.z = -r.jawL.rotation.z;
  r.hips.position.y = 1.05 + Math.abs(Math.sin(ph)) * 0.06 * sw - (e.state === "windup" && !e.ranged ? 0.1 : 0);
}
const FLASH_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 });
// Parlama malzeme değişiminden sonra asıl malzemeye dönebilmek için saklanır
function rememberMats(root) { root.traverse(m => { if (m.isMesh) m.userData.mat = m.material; }); }

// ---------------------------------------------------------------- boss'lar
function makeGrax() {
  // Bekçi Grax: kaya zırhlı dev; çatlaklarından turuncu ışık sızar
  const r = makeAlienRig({ scale: 2.6, bulk: 2.1, color: 0x4a3b30, plate: 0x2b2420, eye: 0xff9a2a });
  const lava = glowMat(0xff7a1a, 2.2);
  const rock = mat(0x5a5048, { roughness: 0.95 });
  for (let i = 0; i < 9; i++) {
    const m = mesh(new THREE.DodecahedronGeometry(0.16 + Math.random() * 0.1, 0), rock, (Math.random() - 0.5) * 0.7, 0.2 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4, r.torso);
    m.scale.y = 0.7;
  }
  mesh(BOX(0.6, 0.04, 0.02), lava, 0, 0.4, -0.25, r.torso);
  mesh(BOX(0.04, 0.4, 0.02), lava, 0.1, 0.3, -0.255, r.torso);
  // dev taş tokmak (sağ el)
  const club = mesh(BOX(0.36, 1.1, 0.36), rock, 0, -0.5, 0, r.handR);
  mesh(BOX(0.38, 0.06, 0.38), lava, 0, -0.3, 0, r.handR);
  mesh(BOX(0.38, 0.06, 0.38), lava, 0, -0.7, 0, r.handR);
  r.club = club;
  const l = new THREE.PointLight(0xff7a1a, 1.2, 10); l.position.y = 2; r.root.add(l);
  return r;
}
function makeZhal() {
  // Komutan Zhal: uzun, pelerinli, enerji asalı; ışınlanır
  const r = makeAlienRig({ scale: 1.45, color: 0x24183a, plate: 0x0f0a18, eye: 0xff3a5a });
  const cape = mesh(BOX(0.6, 1.3, 0.04), mat(0x5a0f1a, { side: THREE.DoubleSide }), 0, -0.05, 0.2, r.torso);
  cape.geometry.translate(0, -0.25, 0);
  r.cape = cape;
  const crest = mesh(new THREE.ConeGeometry(0.12, 0.5, 4), mat(0x0f0a18, { metalness: 0.7 }), 0, 0.3, 0.05, r.head);
  crest.rotation.x = -0.5;
  const staff = new THREE.Group();
  mesh(CYL(0.03, 0.03, 1.9, 6), mat(0x1a1a1a, { metalness: 0.8 }), 0, 0, 0, staff);
  mesh(new THREE.OctahedronGeometry(0.14), glowMat(0xff3a5a, 2.5), 0, 1.0, 0, staff);
  staff.position.set(0, -0.1, 0);
  staff.rotation.x = Math.PI / 2;
  r.handR.add(staff);
  const l = new THREE.PointLight(0xff3a5a, 1, 8); l.position.y = 2.5; r.root.add(l);
  return r;
}
function makeVorakh() {
  // Hükümdar Vorakh: dört kollu, taçlı dev
  const r = makeAlienRig({ scale: 3.6, bulk: 1.7, color: 0x2a1036, plate: 0x12061a, eye: 0xff3a8a });
  const crownM = mat(0xc9a24a, { metalness: 0.9, roughness: 0.25 });
  for (let i = 0; i < 5; i++) { const c = mesh(new THREE.ConeGeometry(0.035, 0.22, 4), crownM, (i - 2) * 0.06, 0.2, -0.02, r.head); c.rotation.z = (i - 2) * 0.2; }
  // ikinci kol çifti
  const B = mat(0x2a1036, { roughness: 0.55, metalness: 0.2 });
  r.extra = [];
  for (const s of [-1, 1]) {
    const sh = pivot(r.torso, s * 0.34, 0.28, 0);
    mesh(CAP(0.06, 0.38), B, 0, -0.18, 0, sh);
    const el = pivot(sh, 0, -0.38, 0);
    mesh(CAP(0.05, 0.36), B, 0, -0.16, 0, el);
    mesh(new THREE.ConeGeometry(0.04, 0.2, 5), glowMat(0xff3a8a, 1.8), 0, -0.42, 0, el).rotation.x = Math.PI;
    r.extra.push({ sh, el, s });
  }
  const core = mesh(SPH(0.09), glowMat(0xff3a8a, 3), 0, 0.38, -0.17, r.torso);
  r.core = core;
  const l = new THREE.PointLight(0xff3a8a, 1.5, 18); l.position.y = 4; r.root.add(l);
  return r;
}

// ---------------------------------------------------------------- Lumi (Tahra'nın yerlileri)
function makeLumi(color, scale) {
  const c = color || 0x6ff0d2;
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  mesh(SPH(0.32, 16, 12), mat(0xe6f5ee, { roughness: 0.5 }), 0, 0.5, 0, body).scale.set(1, 1.15, 1);
  mesh(SPH(0.31, 16, 12), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, transparent: true, opacity: 0.55 }), 0, 0.52, 0, body).scale.set(1.08, 1.2, 1.08);
  const head = pivot(body, 0, 0.98, 0);
  mesh(SPH(0.28), mat(0xe6f5ee, { roughness: 0.5 }), 0, 0, 0, head);
  for (const s of [-1, 1]) {
    mesh(SPH(0.085), mat(0x0c1a1a), s * 0.11, 0.03, -0.22, head);
    mesh(SPH(0.03), glowMat(0xffffff, 1), s * 0.09, 0.06, -0.29, head);
    const ant = pivot(head, s * 0.12, 0.22, 0);
    ant.rotation.z = -s * 0.4;
    mesh(CYL(0.012, 0.012, 0.3, 5), mat(0xbfd8cf), 0, 0.15, 0, ant);
    mesh(SPH(0.06), glowMat(c, 2.2), 0, 0.32, 0, ant);
  }
  const armL = pivot(body, -0.3, 0.62, 0), armR = pivot(body, 0.3, 0.62, 0);
  mesh(CAP(0.05, 0.3), mat(0xe6f5ee), 0, -0.14, 0, armL);
  mesh(CAP(0.05, 0.3), mat(0xe6f5ee), 0, -0.14, 0, armR);
  root.scale.setScalar(scale || 1);
  return { root, body, head, armL, armR, t: Math.random() * 10, st: {} };
}
function animateLumi(r, dt) {
  r.t += dt;
  r.body.position.y = Math.abs(Math.sin(r.t * (r.st.happy ? 7 : 2))) * (r.st.happy ? 0.2 : 0.04);
  r.head.rotation.z = Math.sin(r.t * 1.4) * 0.1;
  r.armL.rotation.z = -0.3 - (r.st.happy ? Math.abs(Math.sin(r.t * 7)) * 1.6 : Math.sin(r.t * 2) * 0.1);
  r.armR.rotation.z = 0.3 + (r.st.happy || r.st.wave ? Math.abs(Math.sin(r.t * 7)) * 1.6 : Math.sin(r.t * 2) * 0.1);
  if (r.st.scared) { r.body.position.y = Math.sin(r.t * 30) * 0.02; r.armL.rotation.z = -1.8; r.armR.rotation.z = 1.8; }
}
function placeLumi(zone, x, z, color, scale) {
  const r = makeLumi(color, scale);
  r.root.position.set(x, zone.ground(x, z), z);
  zone.group.add(r.root);
  visuals.push(dt => { if (zone.group.visible) animateLumi(r, dt); });
  return r;
}

// ---------------------------------------------------------------- gemiler
// ATLAS: beyaz, uzun gövdeli mekik; parçaları ayrı gruplar (kaza sahnesinde ayrı ayrı savrulurlar)
function makeAtlas() {
  const root = new THREE.Group();
  const W = mat(0xeeeeea, { roughness: 0.5, metalness: 0.2 }), Dk = mat(0x2a2e36, { metalness: 0.6, roughness: 0.4 }), O = mat(0xff8a2a);
  const parts = {};
  const part = name => { const g = new THREE.Group(); root.add(g); parts[name] = g; return g; };
  const nose = part("nose");
  const n = mesh(new THREE.ConeGeometry(1.1, 3.2, 16), W, 0, 0, -6.6, nose); n.rotation.x = -Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x223344, metalness: 0.9, roughness: 0.1 }), 0, 0.55, -5.0, nose).scale.set(0.9, 0.55, 1.6);
  const mid = part("mid");
  const body = mesh(CYL(1.1, 1.25, 7, 16), W, 0, 0, -1.5, mid); body.rotation.x = Math.PI / 2;
  mesh(BOX(2.3, 0.15, 6.4), O, 0, -0.95, -1.5, mid);
  mesh(BOX(0.12, 0.5, 4), O, 1.12, 0.3, -1.5, mid);
  mesh(BOX(0.12, 0.5, 4), O, -1.12, 0.3, -1.5, mid);
  for (let i = 0; i < 5; i++) mesh(BOX(0.05, 0.25, 0.35), glowMat(0x9fd8ff, 1.2), 1.2, 0.35, -3.6 + i * 0.9, mid);
  const wingL = part("wingL"), wingR = part("wingR");
  for (const [g, s] of [[wingL, -1], [wingR, 1]]) {
    const w = mesh(BOX(4.2, 0.18, 3.2), W, s * 3.1, -0.4, 0.6, g);
    w.rotation.y = s * -0.35;
    mesh(BOX(0.6, 0.2, 2.4), O, s * 4.9, -0.38, 1.3, g).rotation.y = s * -0.35;
    mesh(BOX(0.12, 0.12, 0.12), glowMat(s < 0 ? 0xff3a3a : 0x3aff6a, 3), s * 5.2, -0.3, 1.6, g);
  }
  const tail = part("tail");
  const fin = mesh(BOX(0.18, 2.2, 2.2), W, 0, 1.6, 2.4, tail); fin.rotation.x = -0.4;
  mesh(BOX(0.2, 0.3, 1.2), O, 0, 2.5, 2.9, tail).rotation.x = -0.4;
  const engine = part("engine");
  mesh(CYL(1.25, 1.0, 1.6, 16), Dk, 0, 0, 2.8, engine).rotation.x = Math.PI / 2;
  const glow = [];
  for (const [x, y] of [[-0.5, 0.3], [0.5, 0.3], [0, -0.4]]) {
    mesh(CYL(0.42, 0.5, 0.8, 12), Dk, x, y, 3.8, engine).rotation.x = Math.PI / 2;
    const gm = mesh(new THREE.CircleGeometry(0.38, 16), new THREE.MeshBasicMaterial({ color: 0x7fd8ff }), x, y, 4.21, engine);
    glow.push(gm);
    const flame = mesh(new THREE.ConeGeometry(0.34, 2.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), x, y, 5.4, engine);
    flame.rotation.x = Math.PI / 2; flame.castShadow = false;
    glow.push(flame);
  }
  const l = new THREE.PointLight(0x7fd8ff, 1.5, 14); l.position.set(0, 0, 5.5); engine.add(l);
  return { root, parts, glow, light: l };
}
function setAtlasThrust(a, on, k) {
  for (const g of a.glow) { g.visible = on; if (g.geometry.type === "ConeGeometry") g.scale.set(1, k || 1, 1); }
  a.light.intensity = on ? 1.5 * (k || 1) : 0;
}
// Fırlatma roketi: ATLAS'ı sırtında taşıyan iki yan iticili ana yakıt tankı
function makeRocket() {
  const root = new THREE.Group();
  const tank = mesh(CYL(2.2, 2.2, 26, 20), mat(0xd9772c, { roughness: 0.7 }), 0, 13, 0, root);
  mesh(new THREE.ConeGeometry(2.2, 4, 20), mat(0xd9772c), 0, 28, 0, root);
  const boosters = [];
  for (const s of [-1, 1]) {
    const b = new THREE.Group(); b.position.set(s * 3.4, 0, 0); root.add(b);
    mesh(CYL(1.1, 1.1, 24, 16), mat(0xf2f0ea), 0, 12, 0, b);
    mesh(new THREE.ConeGeometry(1.1, 3, 16), mat(0xf2f0ea), 0, 25.5, 0, b);
    mesh(CYL(1.2, 1.4, 1.5, 16), mat(0x2a2e36, { metalness: 0.6 }), 0, 0.2, 0, b);
    boosters.push(b);
  }
  const atlas = makeAtlas();
  atlas.root.rotation.x = -Math.PI / 2;
  atlas.root.position.set(0, 16, 2.6);
  root.add(atlas.root);
  setAtlasThrust(atlas, false);
  const fire = new THREE.Group(); root.add(fire);
  for (const x of [-3.4, 0, 3.4]) {
    const f = mesh(new THREE.ConeGeometry(1.4, 12, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc06a, transparent: true, opacity: 0.8, side: THREE.DoubleSide }), x, -6, 0, fire);
    f.rotation.x = Math.PI; f.castShadow = false;
  }
  const fl = new THREE.PointLight(0xffb060, 0, 80); fl.position.y = -4; fire.add(fl);
  fire.visible = false;
  return { root, atlas, fire, fireLight: fl, boosters };
}
// Vorak gemisi: koyu, köşeli, kama biçimli; turuncu ışık çizgileri; burnunda ışın yayıcı
function makeVorakShip(scale) {
  const root = new THREE.Group();
  const H = mat(0x1a1420, { metalness: 0.7, roughness: 0.35 }), L = glowMat(0xff7a2a, 2);
  const hull = mesh(new THREE.ConeGeometry(3, 12, 4), H, 0, 0, 0, root);
  hull.rotation.x = -Math.PI / 2; hull.rotation.y = Math.PI / 4; hull.scale.set(1.6, 1, 0.45);
  for (const s of [-1, 1]) {
    const w = mesh(BOX(7, 0.3, 4), H, s * 4.5, 0, 3, root); w.rotation.y = s * 0.5; w.rotation.z = s * -0.25;
    mesh(BOX(6, 0.08, 0.15), L, s * 4.5, 0.2, 2.2, root).rotation.y = s * 0.5;
    const spike = mesh(new THREE.ConeGeometry(0.5, 5, 4), H, s * 7.8, -0.6, 4.4, root); spike.rotation.x = Math.PI / 2;
  }
  mesh(BOX(0.2, 0.1, 9), L, 0, 1.0, 0.5, root);
  const emitter = mesh(SPH(0.7), glowMat(0xff5a2a, 3), 0, -0.4, -6, root);
  const l = new THREE.PointLight(0xff7a2a, 1.5, 30); l.position.set(0, 0, -6); root.add(l);
  root.scale.setScalar(scale || 1);
  return { root, emitter };
}
function makeMothership() {
  const root = new THREE.Group();
  const H = mat(0x15101c, { metalness: 0.7, roughness: 0.4 }), L = glowMat(0xff3a8a, 2.2);
  const ring = mesh(new THREE.TorusGeometry(60, 9, 8, 40), H, 0, 0, 0, root); ring.rotation.x = Math.PI / 2; ring.scale.z = 0.5;
  mesh(CYL(40, 52, 14, 40), H, 0, 0, 0, root);
  mesh(CYL(16, 30, 18, 24), H, 0, 14, 0, root);
  mesh(new THREE.ConeGeometry(14, 30, 8), H, 0, 36, 0, root);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; mesh(BOX(4, 1, 1), L, Math.cos(a) * 52, -2, Math.sin(a) * 52, root).rotation.y = -a; }
  const core = mesh(SPH(8), glowMat(0xff3a8a, 3), 0, -8, 0, root);
  return { root, core };
}
// Ay anteni: kafes kule + çanak
function makeAntenna() {
  const root = new THREE.Group();
  const M = mat(0xc8c8c4, { metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const leg = mesh(CYL(0.12, 0.2, 18, 6), M, Math.cos(a) * 1.4, 9, Math.sin(a) * 1.4, root);
    leg.rotation.z = Math.cos(a) * 0.08; leg.rotation.x = -Math.sin(a) * 0.08;
  }
  for (let y = 2; y < 18; y += 2.5) mesh(BOX(2.6 - y * 0.05, 0.1, 2.6 - y * 0.05), M, 0, y, 0, root);
  const dishG = new THREE.Group(); dishG.position.y = 19; root.add(dishG);
  const dish = mesh(new THREE.SphereGeometry(4, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), mat(0xe8e8e4, { side: THREE.DoubleSide, metalness: 0.4 }), 0, 0, 0, dishG);
  dish.rotation.x = Math.PI * 0.75;
  const feed = mesh(CYL(0.08, 0.08, 3, 6), M, 0, 0.6, -1.4, dishG); feed.rotation.x = -0.6;
  const tip = mesh(SPH(0.25), glowMat(0xff3a3a, 2), 0, 1.4, -2.6, dishG);
  return { root, dish: dishG, tip };
}
