import * as THREE from "./lib/three.module.min.js";

const $ = (id) => document.getElementById(id);
const BEST_KEY = "hakorocks-ejderha-ucus-best";
const STORY_KEY = "hakorocks-ejderha-ucus-story-v2";
let RING_COUNT = 15;

const CHAPTERS = [
  {
    title: "Köy Söylentisi",
    text: "Sen Hako’sun. Ejderha değilsin. Köyde masalcı diyor: \"Son ejderha saklambaçta. Onu GÖR, yanına koş, bin. Birlikte uçarsınız.\" Altın izleri takip et, bayrağa ulaş.",
    phase: "walk", rings: 0, gems: 8, balloons: 0, amp: 16,
    sky: 0x6ec6ff, fog: 0x8ecae6, toast: "MASALCI: Ejderha olma. Onu bul, bin!",
  },
  {
    title: "Çayır İzleri",
    text: "Çayırda kocaman ayak izi. Koyun: \"O iz benim değil, ben 4 numarayım. Bu 40 numara.\" Mücevherleri topla, bayrağa koş.",
    phase: "walk", rings: 0, gems: 10, balloons: 0, amp: 18,
    sky: 0x7ad0ff, fog: 0x9ed8ee, toast: "KOYUN: 40 numara ayak izi! Meee.",
  },
  {
    title: "Nehir Kenarı",
    text: "Nehir kıyısında ıslak tüy. Balık: \"Üstümden uçtu. Beni yemedi, teşekkür ederim.\" Suya düşme, karşıdaki bayrağa git.",
    phase: "walk", rings: 0, gems: 8, balloons: 0, amp: 20,
    sky: 0x4cc9f0, fog: 0x7ec8d8, toast: "BALIK: Üstümden geçti, yemedi!",
  },
  {
    title: "Fırıncı Amca",
    text: "Fırıncı Amca ekmek sallıyor: \"Dün kırmızı bir gölge ekmeğimi kokladı. Çalmadı. Demek hâlâ bir ejderha var. Sen binici olursun, o da uçak.\"",
    phase: "walk", rings: 0, gems: 12, balloons: 0, amp: 19,
    sky: 0xffb703, fog: 0xe9c46a, toast: "FIRINCI: Kokladı, çalmadı. Yakın!",
  },
  {
    title: "Sisli Orman",
    text: "Ağaçlar: \"Sağa gitme, dün bir ejderha esnedi, yapraklar uçtu. Düz git.\" Sis yalan söyleyebilir. Bayrağı kaçırma.",
    phase: "walk", rings: 0, gems: 8, balloons: 0, amp: 14,
    sky: 0x609966, fog: 0x8fbc8f, toast: "AĞAÇ: Düz git. Esneme rüzgarı oradan.",
  },
  {
    title: "Kristal İz",
    text: "Kayada kocaman tırnak izi. Kristal: \"Yuva yerin altında değil, dağın ÜSTÜNDE. Sen hâlâ yürüyorsun. İyi. Ejderha meraklıları hep acele uçmak ister.\"",
    phase: "walk", rings: 0, gems: 10, balloons: 0, amp: 12,
    sky: 0x3a0ca3, fog: 0x7209b7, toast: "KRİSTAL: Yuva yukarıda. Sen yürü.",
  },
  {
    title: "Harabe Kale",
    text: "Kapıda yazıyor: EJDERHA GİREMEZ. Kapı kırık. Zırh: \"Sahibim 200 yıldır bekliyor. Ejderha gelmedi. Sen git, bin, selamımı götür.\"",
    phase: "walk", rings: 0, gems: 9, balloons: 0, amp: 22,
    sky: 0x6d6875, fog: 0x9a8c98, toast: "ZIRH: Selamı götür. Yürü!",
  },
  {
    title: "Gördün mü?!",
    text: "Vadinin ucunda kocaman bir gölge. Ejderha. Uyuyor gibi. Koş. Yanına git. E tuşuna bas, BİN. Korkma: o da bir binici arıyormuş.",
    phase: "mount", rings: 0, gems: 4, balloons: 0, amp: 16,
    sky: 0xff9e00, fog: 0xdc2f02, toast: "EJDERHA ORADA! Koş, E ile bin!",
  },
  {
    title: "İlk Uçuş",
    text: "Bindin! Artık sen ejderha değilsin, binekçisin. W ile yüksel, yüzüklerden geç. Ejderha fısıldıyor: \"Sırtım gıdıklanıyor. Daha hızlı!\"",
    phase: "ride", rings: 12, gems: 8, balloons: 8, amp: 18,
    sky: 0xe63946, fog: 0x9d0208, toast: "EJDERHA: Sırtım gıdıklanıyor!",
  },
  {
    title: "Yıldız Yolu",
    text: "Gece. Yüzükler yıldız. Ejderha: \"Yuvamı unutmuştum. Sen yön göster. Saklambaç bitti sayılır.\"",
    phase: "ride", rings: 14, gems: 10, balloons: 6, amp: 17,
    sky: 0x0d1b2a, fog: 0x1b263b, toast: "EJDERHA: Yuvayı sen göster.",
  },
  {
    title: "Eve Dönüş",
    text: "Köy sizi görüyor. Masalcı bağırıyor: \"İşte! Ejderha yok olmamış, binici yokmuş!\" Yüzükleri bitir. Efsane sizsiniz.",
    phase: "ride", rings: 12, gems: 8, balloons: 8, amp: 16,
    sky: 0xffb703, fog: 0xe9c46a, toast: "MASALCI: Binici + ejderha = efsane!",
  },
];

const SKINS = {
  kizil: { name: "KIZIL", body: 0xc1121f, dark: 0x6a040f, belly: 0xffd166, eye: 0xffe066, fire: 0xff6b1a, tex: "textures/scales-red.jpg" },
  altin: { name: "ALTIN", body: 0xe9c46a, dark: 0xb08900, belly: 0xfff1c1, eye: 0xfff6d8, fire: 0xffd166, tex: "textures/scales-gold.jpg" },
  buz: { name: "BUZ", body: 0x4cc9f0, dark: 0x16697a, belly: 0xe0fbfc, eye: 0xffffff, fire: 0x90e0ef, tex: "textures/scales-ice.jpg" },
};

const keys = Object.create(null);
let skinId = "kizil";

let renderer, scene, camera, clock;
let dragonRoot, wingL, wingR, mouth, mixer;
let hero = null;
let riding = false;
let vy = 0;
let phase = "walk";
let goalFlag = null;
let rings = [];
let gems = [];
let balloons = [];
let firePts, fireArr, fireLife;
let nextRing = 0;
let gemCount = 0;
let score = 0;
let speed = 22;
let heading = 0;
let pitch = 0.08;
let roll = 0;
let firing = false;
let boosting = false;
let playing = false;
let fireCool = 0;
let announceT = 0;
let padSteer = { x: 0, y: 0 };
let audioCtx = null;
let playMode = "free";
let chapterI = 0;
let pathAmp = 22;
let pathLen = 360;
let gemTarget = 12;
let balloonTarget = 8;
let clueCount = 0;
let legendDragon = null;
let findGoal = false;
let pads = [];
let boars = [];
let crates = [];
let logs = [];
let plats = [];
let bells = [];
let keyHave = 0;
let keyNeed = 3;
let invuln = 0;
let throwCool = 0;
let pebbles = [];
let mountSafe = 0;

const texLoader = new THREE.TextureLoader();

function loadTex(url, repeat = 1) {
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

function heightAt(x, z) {
  const ax = Math.abs(x);
  let h = 1.1;
  h += Math.sin(z * 0.018) * 1.6 + Math.cos(x * 0.045 + z * 0.01) * 1.1;
  if (ax > 26) {
    const t = (ax - 26) / 16;
    h += t * t * 22;
    h += Math.sin(x * 0.31) * Math.sin(z * 0.19) * (6 + t * 8);
  }
  h += 26 * Math.exp(-((x - 62) ** 2 + (z - 140) ** 2) / 420);
  h += 22 * Math.exp(-((x + 70) ** 2 + (z - 240) ** 2) / 520);
  h += 18 * Math.exp(-((x - 55) ** 2 + (z - 330) ** 2) / 400);
  return h;
}

function pathPoint(t) {
  const z = 36 + t * pathLen;
  const x = Math.sin(t * Math.PI * 3.1) * pathAmp;
  let y = 18 + Math.sin(t * Math.PI * 2.2) * 8;
  y = Math.max(y, heightAt(x, z) + 9);
  return new THREE.Vector3(x, y, z);
}

function announce(text, ms = 900) {
  const el = $("announce");
  el.textContent = text;
  el.classList.add("show");
  announceT = ms / 1000;
}

function beep(freq, dur, type = "sine", vol = 0.08) {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  } catch {
    /* sessiz kalabilir */
  }
}

function bestScore() {
  return Number(localStorage.getItem(BEST_KEY) || 0);
}

function saveBest(n) {
  const b = Math.max(bestScore(), n);
  localStorage.setItem(BEST_KEY, String(b));
}

function storyProgress() {
  return Math.max(0, Number(localStorage.getItem(STORY_KEY) || 0));
}

function saveStory(i) {
  localStorage.setItem(STORY_KEY, String(Math.max(storyProgress(), i)));
}

function chapter() {
  return CHAPTERS[chapterI] || CHAPTERS[0];
}

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.12, ...extra });
}

function addMesh(parent, geo, material, pos, rot, scale) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function makeProceduralDragon(skin) {
  const root = new THREE.Group();
  const scaleTex = loadTex(skin.tex, 3);
  const wingTex = loadTex("textures/wing.jpg", 1);
  const bodyMat = mat(skin.body, { map: scaleTex });
  const darkMat = mat(skin.dark, { map: scaleTex });
  const bellyMat = mat(skin.belly);
  const hornMat = mat(0x222222, { roughness: 0.35, metalness: 0.4 });
  const wingMat = mat(skin.body, { map: wingTex, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });

  addMesh(root, new THREE.SphereGeometry(0.72, 18, 14), bodyMat, [0, 0.1, 0], null, [1.35, 0.72, 2.15]);
  addMesh(root, new THREE.SphereGeometry(0.5, 14, 12), bellyMat, [0, -0.18, 0.1], null, [1.05, 0.55, 1.7]);
  addMesh(root, new THREE.SphereGeometry(0.38, 12, 10), bodyMat, [0, 0.22, 1.55], null, [0.95, 0.75, 1.15]);
  addMesh(root, new THREE.SphereGeometry(0.32, 12, 10), bodyMat, [0, 0.38, 2.15], null, [1.05, 0.85, 1.05]);

  const head = new THREE.Group();
  head.position.set(0, 0.48, 2.55);
  addMesh(head, new THREE.SphereGeometry(0.42, 16, 12), bodyMat, [0, 0.05, 0.1]);
  addMesh(head, new THREE.ConeGeometry(0.28, 0.7, 12), bodyMat, [0, -0.05, 0.55], [Math.PI / 2, 0, 0]);
  addMesh(head, new THREE.ConeGeometry(0.09, 0.55, 8), hornMat, [0.16, 0.42, -0.05], [0.35, 0, -0.2]);
  addMesh(head, new THREE.ConeGeometry(0.09, 0.55, 8), hornMat, [-0.16, 0.42, -0.05], [0.35, 0, 0.2]);
  addMesh(head, new THREE.SphereGeometry(0.08, 10, 8), mat(skin.eye, { emissive: skin.eye, emissiveIntensity: 0.5 }), [0.16, 0.14, 0.28]);
  addMesh(head, new THREE.SphereGeometry(0.08, 10, 8), mat(skin.eye, { emissive: skin.eye, emissiveIntensity: 0.5 }), [-0.16, 0.14, 0.28]);
  mouth = new THREE.Object3D();
  mouth.position.set(0, -0.05, 0.9);
  head.add(mouth);
  root.add(head);

  for (let i = 0; i < 6; i++) {
    const z = -0.4 - i * 0.38;
    const s = 0.42 - i * 0.05;
    addMesh(root, new THREE.SphereGeometry(s, 10, 8), i % 2 ? darkMat : bodyMat, [0, 0.05 - i * 0.04, z]);
  }
  for (let i = 0; i < 5; i++) {
    addMesh(root, new THREE.ConeGeometry(0.07, 0.28, 6), darkMat, [0, 0.42, 0.8 - i * 0.45], [0.2, 0, 0]);
  }

  function makeWing(sign) {
    const g = new THREE.Group();
    g.position.set(sign * 0.55, 0.22, 0.15);
    addMesh(g, new THREE.CylinderGeometry(0.05, 0.035, 2.3, 6), darkMat, [sign * 1.05, 0.15, -0.15], [0.2, 0, sign * 1.15]);
    const mem = addMesh(g, new THREE.PlaneGeometry(2.5, 1.55), wingMat, [sign * 1.15, -0.05, -0.05], [0.15, sign * 0.45, sign * 0.15]);
    mem.castShadow = false;
    return g;
  }
  wingL = makeWing(1);
  wingR = makeWing(-1);
  root.add(wingL, wingR);

  addMesh(root, new THREE.CylinderGeometry(0.08, 0.06, 0.7, 6), darkMat, [0.28, -0.42, 0.7], [0.7, 0, 0.2]);
  addMesh(root, new THREE.CylinderGeometry(0.08, 0.06, 0.7, 6), darkMat, [-0.28, -0.42, 0.7], [0.7, 0, -0.2]);

  root.rotation.order = "YXZ";
  return root;
}

function makeHero() {
  const g = new THREE.Group();
  const skin = mat(0x22d3ee);
  const pants = mat(0x1d3557);
  const hair = mat(0x111111);
  addMesh(g, new THREE.SphereGeometry(0.28, 12, 10), skin, [0, 1.35, 0]);
  addMesh(g, new THREE.SphereGeometry(0.16, 8, 8), hair, [0, 1.52, 0]);
  addMesh(g, new THREE.SphereGeometry(0.05, 8, 8), mat(0x111111), [0.1, 1.38, 0.22]);
  addMesh(g, new THREE.SphereGeometry(0.05, 8, 8), mat(0x111111), [-0.1, 1.38, 0.22]);
  addMesh(g, new THREE.BoxGeometry(0.5, 0.62, 0.32), mat(0xffb703), [0, 0.88, 0]);
  addMesh(g, new THREE.BoxGeometry(0.16, 0.5, 0.16), skin, [0.32, 0.85, 0]);
  addMesh(g, new THREE.BoxGeometry(0.16, 0.5, 0.16), skin, [-0.32, 0.85, 0]);
  addMesh(g, new THREE.BoxGeometry(0.18, 0.5, 0.18), pants, [0.12, 0.28, 0]);
  addMesh(g, new THREE.BoxGeometry(0.18, 0.5, 0.18), pants, [-0.12, 0.28, 0]);
  g.rotation.order = "YXZ";
  return g;
}

function groundAt(x, z) {
  return heightAt(x, z);
}

function makeSky() {
  const geo = new THREE.SphereGeometry(420, 24, 16);
  const col = new Float32Array(geo.attributes.position.count * 3);
  const pos = geo.attributes.position;
  const cTop = new THREE.Color(0x4cc9f0);
  const cHor = new THREE.Color(0xffb703);
  const cBot = new THREE.Color(0xe76f51);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 420;
    if (y > 0) tmp.copy(cHor).lerp(cTop, y);
    else tmp.copy(cHor).lerp(cBot, -y * 1.4);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(mesh);
}

function makeWorld() {
  const terrainTex = loadTex("textures/terrain.jpg", 18);
  const w = 220;
  const d = 500;
  const segX = 70;
  const segZ = 110;
  const geo = new THREE.PlaneGeometry(w, d, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + 200;
    pos.setY(i, heightAt(x, z));
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: terrainTex, roughness: 0.92, metalness: 0.02 })
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 500),
    new THREE.MeshStandardMaterial({ color: 0x1d8a99, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.72 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.6, 200);
  scene.add(water);

  const treeMat = mat(0x2d6a4f);
  const trunkMat = mat(0x6f4e37);
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (32 + (i * 17) % 40);
    const z = 20 + (i * 23) % 420;
    const y = heightAt(x, z);
    if (y > 28) continue;
    const t = new THREE.Group();
    addMesh(t, new THREE.CylinderGeometry(0.18, 0.26, 1.4, 5), trunkMat, [0, 0.7, 0]);
    addMesh(t, new THREE.ConeGeometry(1.15, 2.4, 7), treeMat, [0, 2.2, 0]);
    t.position.set(x, y, z);
    scene.add(t);
  }

  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(3.5 + (i % 4), 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 1 })
    );
    c.position.set((i % 6) * 18 - 45, 38 + (i % 5) * 4, 30 + i * 22);
    c.scale.set(1.6, 0.55, 1);
    scene.add(c);
  }
}

function applyTheme(ch) {
  if (!scene) return;
  scene.background = new THREE.Color(ch.sky || 0x6ec6ff);
  scene.fog = new THREE.Fog(ch.fog || 0x8ecae6, 55, 310);
}

function makeLegendDragon() {
  if (legendDragon) {
    scene.remove(legendDragon);
    legendDragon = null;
  }
  if (phase !== "mount") return;
  const saveL = wingL;
  const saveR = wingR;
  const saveM = mouth;
  const big = makeProceduralDragon(SKINS[skinId]);
  big.userData.wL = wingL;
  big.userData.wR = wingR;
  big.userData.mouth = mouth;
  wingL = saveL;
  wingR = saveR;
  mouth = saveM;
  big.scale.setScalar(2.4);
  let x = 0;
  let z = 52;
  if (playMode !== "free") {
    const p = pathPoint(0.82);
    x = p.x;
    z = p.z;
  }
  const gy = groundAt(x, z);
  big.position.set(x, gy + 2.4, z);
  big.rotation.y = 0;
  scene.add(big);
  legendDragon = big;
}

function makeCourse() {
  rings = [];
  gems = [];
  balloons = [];
  const ringGeo = new THREE.TorusGeometry(5.6, 0.32, 12, 36);
  const n = RING_COUNT;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = pathPoint(t);
    const p2 = pathPoint(Math.min(1, t + 0.02));
    const mesh = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffe566,
        transparent: false,
      })
    );
    mesh.position.copy(p);
    mesh.lookAt(p2);
    mesh.castShadow = true;
    scene.add(mesh);
    rings.push({ mesh, taken: false, t });
  }

  const gemGeo = new THREE.OctahedronGeometry(0.55);
  const gn = Math.max(0, gemTarget);
  for (let i = 0; i < gn; i++) {
    const t = (i + 0.4) / (gn + 1);
    const p = pathPoint(t);
    p.x += (i % 2 ? 1 : -1) * 4.5;
    if (phase === "ride") p.y += 1.5;
    else p.y = groundAt(p.x, p.z) + 1.15;
    const mesh = new THREE.Mesh(gemGeo, mat(0x80ffdb, { emissive: 0x2ec4b6, emissiveIntensity: 0.6, metalness: 0.5 }));
    mesh.position.copy(p);
    mesh.castShadow = true;
    scene.add(mesh);
    gems.push({ mesh, taken: false, clue: i % 3 === 0 });
  }

  const ballGeo = new THREE.SphereGeometry(0.85, 14, 12);
  const bn = Math.max(0, balloonTarget);
  for (let i = 0; i < bn; i++) {
    const t = (i + 0.5) / (bn + 1);
    const p = pathPoint(t);
    p.x += (i % 2 ? -1 : 1) * 7;
    p.y += 5;
    const g = new THREE.Group();
    const col = i % 2 ? 0xe63946 : 0x9b5de5;
    addMesh(g, ballGeo, mat(col, { emissive: col, emissiveIntensity: 0.25 }), [0, 0, 0]);
    g.position.copy(p);
    scene.add(g);
    balloons.push({ mesh: g, taken: false, base: p.clone() });
  }
  if (goalFlag) {
    scene.remove(goalFlag);
    goalFlag = null;
  }
  if (phase === "walk") {
    const p = pathPoint(1);
    const gy = groundAt(p.x, p.z);
    goalFlag = new THREE.Group();
    addMesh(goalFlag, new THREE.CylinderGeometry(0.12, 0.16, 4.2, 8), mat(0xffb703, { emissive: 0xffb703, emissiveIntensity: 0.4 }), [0, 2.1, 0]);
    addMesh(goalFlag, new THREE.SphereGeometry(0.55, 12, 10), mat(0xff6b1a, { emissive: 0xff6b1a, emissiveIntensity: 0.6 }), [0, 4.4, 0]);
    goalFlag.position.set(p.x, gy, p.z);
    scene.add(goalFlag);
  }
  makeLegendDragon();
  makeWalkAction();
}

function clearAction() {
  for (const arr of [pads, boars, crates, logs, plats, bells, pebbles]) {
    arr.forEach((o) => {
      const m = o.mesh || o;
      if (m.parent) m.parent.remove(m);
      else scene.remove(m);
    });
  }
  pads = [];
  boars = [];
  crates = [];
  logs = [];
  plats = [];
  bells = [];
  pebbles = [];
  keyHave = 0;
}

function makeWalkAction() {
  clearAction();
  if (phase === "ride") return;
  keyNeed = 3;
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.12;
    const p = pathPoint(t);
    const gy = groundAt(p.x, p.z);
    const pad = addMesh(scene, new THREE.CylinderGeometry(1.3, 1.3, 0.35, 12), mat(0x8fff6a, { emissive: 0x2d6a4f, emissiveIntensity: 0.5 }), [p.x + ((i % 2) * 4 - 2), gy + 0.2, p.z]);
    pads.push({ mesh: pad });
  }
  for (let i = 0; i < 5; i++) {
    const t = 0.18 + i * 0.14;
    const p = pathPoint(t);
    const gy = groundAt(p.x, p.z);
    const box = new THREE.Group();
    addMesh(box, new THREE.BoxGeometry(2.4, 1.1, 2.4), mat(0x6f4e37), [0, 0.55, 0]);
    addMesh(box, new THREE.BoxGeometry(2.2, 1.1, 2.2), mat(0x9c6644), [0, 1.65, 0]);
    box.position.set(p.x + (i % 2 ? -5 : 5), gy, p.z);
    scene.add(box);
    plats.push({ mesh: box, top: gy + 2.2, w: 1.4, d: 1.4 });
  }
  for (let i = 0; i < 4; i++) {
    const t = 0.22 + i * 0.16;
    const p = pathPoint(t);
    const gy = groundAt(p.x, p.z);
    const g = new THREE.Group();
    addMesh(g, new THREE.BoxGeometry(1.1, 1.1, 1.1), mat(0xc9a227), [0, 0.55, 0]);
    g.position.set(p.x + (i % 2 ? 3.5 : -3.5), gy, p.z);
    scene.add(g);
    crates.push({ mesh: g, smashed: false });
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + i * 0.22;
    const p = pathPoint(t);
    const gy = groundAt(p.x, p.z);
    const g = new THREE.Group();
    addMesh(g, new THREE.SphereGeometry(0.55, 10, 8), mat(0x6b3f2a), [0, 0.5, 0.4]);
    addMesh(g, new THREE.SphereGeometry(0.7, 10, 8), mat(0x4a2c1a), [0, 0.55, 0]);
    addMesh(g, new THREE.ConeGeometry(0.18, 0.4, 6), mat(0x222), [0.35, 0.7, 0.5], [Math.PI / 2, 0, 0]);
    g.position.set(p.x + 8, gy, p.z);
    scene.add(g);
    boars.push({ mesh: g, dir: -1, baseX: p.x, z: p.z, hit: false });
  }
  for (let i = 0; i < 4; i++) {
    const t = 0.15 + i * 0.18;
    const p = pathPoint(t);
    const gy = groundAt(p.x, p.z);
    const log = addMesh(scene, new THREE.CylinderGeometry(0.45, 0.45, 3.4, 8), mat(0x5c4033), [p.x, gy + 0.5, p.z]);
    log.rotation.z = Math.PI / 2;
    logs.push({ mesh: log, spin: 2 + i * 0.4, z: p.z });
  }
  for (let i = 0; i < 5; i++) {
    const t = 0.25 + i * 0.12;
    const p = pathPoint(t);
    const gy = groundAt(p.x, p.z);
    const bell = addMesh(scene, new THREE.SphereGeometry(0.45, 10, 8), mat(0xffd166, { emissive: 0xffb703, emissiveIntensity: 0.45 }), [p.x + (i % 2 ? -6 : 6), gy + 3.2, p.z]);
    bells.push({ mesh: bell, hit: false });
  }
}

function walkHeight(x, z) {
  let h = groundAt(x, z);
  for (const pl of plats) {
    const dx = x - pl.mesh.position.x;
    const dz = z - pl.mesh.position.z;
    if (Math.abs(dx) < 1.5 && Math.abs(dz) < 1.5) h = Math.max(h, pl.top);
  }
  return h;
}

function throwPebble() {
  if (riding || throwCool > 0 || !hero) return;
  throwCool = 0.28;
  const pebble = addMesh(scene, new THREE.SphereGeometry(0.14, 6, 6), mat(0x888), [0, 0, 0]);
  pebble.position.copy(hero.position);
  pebble.position.y += 1.2;
  const fwd = new THREE.Vector3(0, 0.25, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
  pebbles.push({ mesh: pebble, vel: fwd.multiplyScalar(28), life: 1.2 });
  beep(700, 0.06, "square", 0.05);
}

function makeFire() {
  const count = 90;
  fireArr = new Float32Array(count * 3);
  fireLife = new Float32Array(count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(fireArr, 3));
  firePts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xff6b1a, size: 0.38, transparent: true, opacity: 0.85, depthWrite: false })
  );
  firePts.frustumCulled = false;
  firePts.userData = [];
  scene.add(firePts);
}

function spawnFire() {
  if (!dragonRoot) return;
  const origin = new THREE.Vector3();
  const fwd = new THREE.Vector3(0, 0, 1).applyEuler(dragonRoot.rotation);
  if (mouth) mouth.getWorldPosition(origin);
  else dragonRoot.getWorldPosition(origin);
  for (let i = 0; i < fireLife.length; i++) {
    if (fireLife[i] > 0.05) continue;
    fireLife[i] = 1;
    fireArr[i * 3] = origin.x + (Math.random() - 0.5) * 0.4;
    fireArr[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.3;
    fireArr[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.4;
    firePts.userData[i] = fwd.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.2, 0));
  }
}

function updateFire(dt) {
  if (!firePts || !dragonRoot) return;
  const varr = firePts.userData;
  let hitPos = null;
  if (firing && fireCool <= 0) {
    spawnFire();
    fireCool = 0.04;
    const origin = new THREE.Vector3();
    if (mouth) mouth.getWorldPosition(origin);
    else dragonRoot.getWorldPosition(origin);
    const fwd = new THREE.Vector3(0, 0, 1).applyEuler(dragonRoot.rotation);
    hitPos = origin.add(fwd.multiplyScalar(7));
  }
  fireCool = Math.max(0, fireCool - dt);
  for (let i = 0; i < fireLife.length; i++) {
    if (fireLife[i] <= 0) {
      fireArr[i * 3 + 1] = -999;
      continue;
    }
    fireLife[i] -= dt * 1.8;
    const v = varr[i] || new THREE.Vector3(0, 0, 1);
    fireArr[i * 3] += v.x * dt * 38;
    fireArr[i * 3 + 1] += v.y * dt * 38;
    fireArr[i * 3 + 2] += v.z * dt * 38;
  }
  firePts.geometry.attributes.position.needsUpdate = true;
  firePts.material.color.setHex(SKINS[skinId].fire);
  if (hitPos) {
    for (const b of balloons) {
      if (b.taken) continue;
      if (b.mesh.position.distanceTo(hitPos) < 4.2) {
        b.taken = true;
        b.mesh.visible = false;
        score += 80;
        beep(220, 0.18, "sawtooth", 0.07);
        announce("PATLADI! 🎈", 500);
      }
    }
  }
}

function hud() {
  $("hud-rings").textContent = `${nextRing} / ${RING_COUNT}`;
  $("hud-gems").textContent = String(gemCount);
  $("hud-score").textContent = String(score);
  $("hud-speed").textContent = String(Math.round(speed));
  $("hud-clue").textContent = riding ? String(clueCount) : `${keyHave}/${keyNeed}`;
  $("hud-chap").textContent = playMode === "story" ? `${chapterI + 1}/${CHAPTERS.length}` : "Serbest";
}

function hidePlayUi() {
  $("hud").style.display = "none";
  $("hint").style.display = "none";
  $("touch").style.display = "none";
  setPrompt("");
}

function showStoryCard(i) {
  chapterI = i;
  const ch = chapter();
  $("menu").style.display = "none";
  $("end-screen").style.display = "none";
  $("story-screen").style.display = "flex";
  $("story-chap").textContent = `Bölüm ${i + 1} / ${CHAPTERS.length}`;
  $("story-title").textContent = ch.title;
  $("story-text").textContent = ch.text;
}

function win() {
  playing = false;
  saveBest(score);
  hidePlayUi();
  beep(523, 0.2, "triangle", 0.1);
  setTimeout(() => beep(784, 0.35, "triangle", 0.1), 180);
  if (playMode === "story") {
    const next = chapterI + 1;
    saveStory(next);
    if (next < CHAPTERS.length) {
      showStoryCard(next);
      return;
    }
    $("end-title").textContent = "BİNDİN! 🐉💛";
    $("end-text").textContent = `Ejderhayı gördün, bindin, birlikte uçtunuz. Saklambaç bitti. Skorun ${score}. İpucu ${clueCount}.`;
    $("end-screen").style.display = "flex";
    return;
  }
  $("end-title").textContent = "EFSANESİN! 🐉";
  $("end-text").textContent = `Tüm yüzükler tamam. Skorun ${score}.`;
  $("end-screen").style.display = "flex";
}

function crash(why) {
  playing = false;
  saveBest(score);
  hidePlayUi();
  $("end-title").textContent = "ÇARPTIN!";
  $("end-text").textContent = playMode === "story"
    ? `${why} Bölüm ${chapterI + 1} baştan. Skor: ${score}`
    : `${why} Skor: ${score}`;
  $("end-screen").style.display = "flex";
  beep(90, 0.35, "square", 0.08);
}

function clearWorldExtras() {
  rings.forEach((r) => scene.remove(r.mesh));
  gems.forEach((g) => scene.remove(g.mesh));
  balloons.forEach((b) => scene.remove(b.mesh));
  if (dragonRoot && dragonRoot.parent) dragonRoot.parent.remove(dragonRoot);
  else if (dragonRoot) scene.remove(dragonRoot);
  if (hero && hero.parent) hero.parent.remove(hero);
  else if (hero) scene.remove(hero);
  if (firePts) scene.remove(firePts);
  if (legendDragon) {
    scene.remove(legendDragon);
    legendDragon = null;
  }
  if (goalFlag) {
    scene.remove(goalFlag);
    goalFlag = null;
  }
  clearAction();
  dragonRoot = null;
  hero = null;
}

function applyChapterStats() {
  if (playMode === "story") {
    const ch = chapter();
    phase = ch.phase || "walk";
    RING_COUNT = ch.rings;
    gemTarget = phase === "ride" ? ch.gems : 0;
    balloonTarget = phase === "ride" ? ch.balloons : 0;
    pathAmp = ch.amp;
    pathLen = phase === "ride" ? 360 : 130;
    findGoal = phase === "mount";
    applyTheme(ch);
  } else {
    phase = "mount";
    RING_COUNT = 15;
    gemTarget = 6;
    balloonTarget = 8;
    pathAmp = 22;
    pathLen = 140;
    findGoal = true;
    applyTheme({ sky: 0x6ec6ff, fog: 0x8ecae6 });
  }
}

function seatHero() {
  if (!hero || !dragonRoot) return;
  if (hero.parent) hero.parent.remove(hero);
  hero.position.set(0, 1.15, 0.15);
  hero.rotation.set(0, 0, 0);
  dragonRoot.add(hero);
}

function mountDragon() {
  if (riding || !legendDragon || !hero) return;
  riding = true;
  dragonRoot = legendDragon;
  legendDragon = null;
  wingL = dragonRoot.userData.wL || wingL;
  wingR = dragonRoot.userData.wR || wingR;
  mouth = dragonRoot.userData.mouth || mouth;
  seatHero();
  const gx = dragonRoot.position.x;
  const gz = dragonRoot.position.z;
  dragonRoot.position.x = THREE.MathUtils.clamp(gx, -12, 12);
  dragonRoot.position.z = gz;
  dragonRoot.position.y = groundAt(dragonRoot.position.x, dragonRoot.position.z) + 14;
  heading = 0;
  pitch = 0.22;
  roll = 0;
  speed = 10;
  mountSafe = 2.6;
  announce("BİNDİN! 🐉", 1200);
  beep(392, 0.15, "triangle", 0.1);
  if (playMode === "story" && phase === "mount") {
    win();
  }
}

async function startGame() {
  if (!renderer) initThree();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  applyChapterStats();
  clearWorldExtras();
  wingL = wingR = mouth = mixer = null;
  riding = phase === "ride";
  vy = 0;
  heading = 0;
  pitch = 0.05;
  roll = 0;
  speed = riding ? 22 : 0;
  nextRing = 0;
  gemCount = 0;
  clueCount = playMode === "story" ? clueCount : 0;
  if (playMode !== "story") score = 0;
  firing = false;
  boosting = false;
  hero = makeHero();
  const start = pathPoint(0);
  start.z -= 8;
  start.y = groundAt(start.x, start.z);
  if (riding) {
    dragonRoot = makeProceduralDragon(SKINS[skinId]);
    dragonRoot.position.set(start.x, start.y + 16, start.z);
    scene.add(dragonRoot);
    seatHero();
  } else {
    hero.position.copy(start);
    scene.add(hero);
  }
  makeCourse();
  makeFire();
  playing = true;
  $("menu").style.display = "none";
  $("end-screen").style.display = "none";
  $("story-screen").style.display = "none";
  $("hud").style.display = "flex";
  $("hint").style.display = "block";
  if (window.matchMedia("(pointer: coarse)").matches) $("touch").style.display = "block";
  const toast = playMode === "story" ? (chapter().toast || "KOŞ!") : "Ejderhayı gör, E ile bin!";
  announce(toast, 1400);
  hud();
}

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  document.body.prepend(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8ecae6, 55, 310);
  scene.background = new THREE.Color(0x6ec6ff);

  camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 700);
  clock = new THREE.Clock();

  scene.add(new THREE.HemisphereLight(0xffe0b0, 0x3a5a30, 0.85));
  const sun = new THREE.DirectionalLight(0xfff1c1, 1.35);
  sun.position.set(-40, 70, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  scene.add(sun);

  makeSky();
  makeWorld();
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  loop();
}

function steerFromKeys() {
  const up = (keys.w || keys.arrowup || padSteer.y < -0.25) ? 1 : 0;
  const down = (keys.s || keys.arrowdown || padSteer.y > 0.25) ? 1 : 0;
  const left = (keys.a || keys.arrowleft || padSteer.x < -0.25) ? 1 : 0;
  const right = (keys.d || keys.arrowright || padSteer.x > 0.25) ? 1 : 0;
  return { pitch: up - down, yaw: left - right };
}

function setPrompt(text) {
  const el = $("prompt");
  if (!el) return;
  if (!text) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = text;
}

function loop() {
  requestAnimationFrame(loop);
  if (!renderer) return;
  const dt = Math.min(0.033, clock.getDelta());
  if (announceT > 0) {
    announceT -= dt;
    if (announceT <= 0) $("announce").classList.remove("show");
  }
  if (playing && hero) {
    const st = steerFromKeys();
    const actor = riding && dragonRoot ? dragonRoot : hero;

    if (!riding) {
      heading += st.yaw * 2.1 * dt;
      hero.rotation.set(0, heading, 0);
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
      const wish = (keys.w || keys.arrowup || padSteer.y < -0.2 ? 1 : 0) - (keys.s || keys.arrowdown || padSteer.y > 0.2 ? 1 : 0);
      const sprint = keys.shift ? 1.45 : 1;
      hero.position.addScaledVector(fwd, wish * 24 * sprint * dt);
      vy -= 42 * dt;
      invuln = Math.max(0, invuln - dt);
      throwCool = Math.max(0, throwCool - dt);
      const gy = walkHeight(hero.position.x, hero.position.z);
      const grounded = hero.position.y <= gy + 0.08;
      if (grounded) {
        hero.position.y = gy;
        vy = 0;
        if (keys[" "]) vy = 10.5;
        for (const pad of pads) {
          if (hero.position.distanceTo(pad.mesh.position) < 1.6) {
            vy = 16;
            announce("FIRLATMA! 🟢", 400);
            beep(880, 0.08, "triangle", 0.07);
          }
        }
      }
      hero.position.y += vy * dt;
      if (hero.position.y < gy) hero.position.y = gy;
      for (const crate of crates) {
        if (crate.smashed) continue;
        if (hero.position.distanceTo(crate.mesh.position) < 1.4 && vy < -1) {
          crate.smashed = true;
          crate.mesh.visible = false;
          keyHave += 1;
          score += 80;
          announce(`ANAHTAR ${keyHave}/${keyNeed} 🔑`, 700);
          beep(523, 0.12, "triangle", 0.09);
        }
      }
      for (const boar of boars) {
        boar.mesh.position.x += boar.dir * 10 * dt;
        if (Math.abs(boar.mesh.position.x - boar.baseX) > 11) boar.dir *= -1;
        boar.mesh.rotation.y = boar.dir < 0 ? Math.PI / 2 : -Math.PI / 2;
        if (invuln <= 0 && hero.position.distanceTo(boar.mesh.position) < 1.5) {
          invuln = 1.1;
          hero.position.add(new THREE.Vector3(-boar.dir * 3, 0.4, 0));
          vy = 6;
          announce("DOMUZ ÇARPTI! 🐗", 500);
          beep(120, 0.15, "sawtooth", 0.07);
        }
      }
      for (const log of logs) {
        log.mesh.rotation.x += log.spin * dt;
        if (invuln <= 0 && hero.position.distanceTo(log.mesh.position) < 1.7 && hero.position.y < log.mesh.position.y + 1.1) {
          invuln = 0.9;
          vy = 8;
          announce("KÜTÜK! 🪵", 400);
        }
      }
      if ((keys.j || keys.f) && throwCool <= 0) throwPebble();
      for (let i = pebbles.length - 1; i >= 0; i--) {
        const pb = pebbles[i];
        pb.mesh.position.addScaledVector(pb.vel, dt);
        pb.vel.y -= 18 * dt;
        pb.life -= dt;
        for (const bell of bells) {
          if (!bell.hit && pb.mesh.position.distanceTo(bell.mesh.position) < 0.8) {
            bell.hit = true;
            bell.mesh.material.emissiveIntensity = 1;
            score += 60;
            announce("ÇAN! 🔔", 400);
            beep(990, 0.12, "sine", 0.08);
          }
        }
        if (pb.life <= 0) {
          scene.remove(pb.mesh);
          pebbles.splice(i, 1);
        }
      }
      if (Math.abs(hero.position.x) > 95 || hero.position.z < -20 || hero.position.z > 470) {
        return crash("Kayboldun!");
      }
      if (legendDragon && hero.position.distanceTo(legendDragon.position) < 8) {
        setPrompt("E  —  EJDERHAYA BİN");
        if (keys.e) mountDragon();
      } else if (phase === "walk" && goalFlag && hero.position.distanceTo(goalFlag.position) < 5) {
        if (keyHave < keyNeed) setPrompt(`KAPI KİLİTLİ  ${keyHave}/${keyNeed} anahtar`);
        else setPrompt("KAPI AÇIK — GİR");
        if (keyHave >= keyNeed) return win();
      } else setPrompt("Boşluk zıpla · J taş at · sandığa üstten zıpla");
      const camBehind = new THREE.Vector3(0, 3.2, -8).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
      camera.position.lerp(hero.position.clone().add(camBehind), 0.12);
      camera.lookAt(hero.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
    } else if (dragonRoot) {
      setPrompt("");
      heading += st.yaw * 1.45 * dt;
      pitch += st.pitch * 1.15 * dt;
      pitch = THREE.MathUtils.clamp(pitch, -0.75, 0.9);
      roll = THREE.MathUtils.lerp(roll, st.yaw * 0.5, 0.12);
      dragonRoot.rotation.set(pitch, heading, roll);
      const target = (boosting || keys[" "]) ? 48 : 26;
      speed = THREE.MathUtils.lerp(speed, target, 0.04);
      const fwd = new THREE.Vector3(0, 0, 1).applyEuler(dragonRoot.rotation);
      dragonRoot.position.addScaledVector(fwd, speed * dt);
      const p = dragonRoot.position;
      const h = heightAt(p.x, p.z);
      mountSafe = Math.max(0, mountSafe - dt);
      if (mountSafe > 0) {
        if (p.y < h + 6) p.y = h + 8;
        if (Math.abs(p.x) > 18) p.x *= 0.92;
      } else {
        if (p.y < h + 2.4) return crash("Dağa çarptın!");
        if (p.y < 1.2) return crash("Suya düştün!");
        if (Math.abs(p.x) > 95 || p.z < -15 || p.z > 470) return crash("Vadiden çıktın!");
      }
      if (p.y > 85) p.y = 85;
      const flap = Math.sin(performance.now() / 140) * (0.28 + (boosting ? 0.18 : 0));
      if (wingL && wingL.rotation) wingL.rotation.z = 0.25 + flap;
      if (wingR && wingR.rotation) wingR.rotation.z = -0.25 - flap;
      for (const r of rings) {
        if (r.taken) continue;
        r.mesh.rotation.z += dt * 1.4;
        r.mesh.scale.setScalar(1.05 + Math.sin(performance.now() / 180) * 0.08);
        if (p.distanceTo(r.mesh.position) < 8.5) {
          r.taken = true;
          r.mesh.material.color.setHex(0x88ffaa);
          r.mesh.material.transparent = true;
          r.mesh.material.opacity = 0.28;
          nextRing += 1;
          score += 100;
          beep(660, 0.12, "triangle", 0.09);
          announce(`${nextRing} / ${rings.length}`, 500);
          if (nextRing >= rings.length) return win();
        }
      }
      firing = keys.j || keys.f || firing;
      updateFire(dt);
      const camBehind = new THREE.Vector3(0, 2.8, -10).applyEuler(dragonRoot.rotation);
      camera.position.lerp(p.clone().add(camBehind), 0.08);
      const look = p.clone().add(fwd.multiplyScalar(14));
      look.y += 1.2;
      camera.lookAt(look);
    }

    const pCollect = actor.position;
    for (const g of gems) {
      if (g.taken) continue;
      g.mesh.rotation.y += dt * 2.2;
      if (riding) g.mesh.position.y += Math.sin(performance.now() / 280 + g.mesh.position.z) * 0.01;
      if (pCollect.distanceTo(g.mesh.position) < 2.4) {
        g.taken = true;
        g.mesh.visible = false;
        gemCount += 1;
        score += 50;
        if (g.clue) {
          clueCount += 1;
          announce("İPUCU! 🪶", 700);
        }
        beep(880, 0.1, "sine", 0.07);
      }
    }
    for (const b of balloons) {
      if (b.taken) continue;
      b.mesh.position.y = b.base.y + Math.sin(performance.now() / 400 + b.base.z) * 0.7;
    }
    hud();
  } else if (renderer) {
    renderer.render(scene, camera);
    return;
  }
  renderer.render(scene, camera);
}

function bindInput() {
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === " ") e.preventDefault();
    if (e.key.toLowerCase() === "r" && !playing) startGame();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key.toLowerCase() === "j" || e.key.toLowerCase() === "f") firing = false;
  });
  window.addEventListener("mousedown", () => {
    if (playing) firing = true;
  });
  window.addEventListener("mouseup", () => {
    firing = false;
  });

  $("btn-fire").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!riding) mountDragon();
    else firing = true;
  });
  $("btn-fire").addEventListener("pointerup", () => {
    firing = false;
  });
  $("btn-fire").addEventListener("pointerleave", () => {
    firing = false;
  });
  $("btn-boost").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    boosting = true;
  });
  $("btn-boost").addEventListener("pointerup", () => {
    boosting = false;
  });
  $("btn-boost").addEventListener("pointerleave", () => {
    boosting = false;
  });

  const pad = $("pad");
  const knob = $("pad-knob");
  const setPad = (clientX, clientY) => {
    const r = pad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let x = (clientX - cx) / (r.width / 2);
    let y = (clientY - cy) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    padSteer.x = x;
    padSteer.y = y;
    knob.style.left = `${37 + x * 32}px`;
    knob.style.top = `${37 + y * 32}px`;
  };
  const endPad = () => {
    padSteer.x = 0;
    padSteer.y = 0;
    knob.style.left = "37px";
    knob.style.top = "37px";
  };
  pad.addEventListener("pointerdown", (e) => {
    pad.setPointerCapture(e.pointerId);
    setPad(e.clientX, e.clientY);
  });
  pad.addEventListener("pointermove", (e) => {
    if (pad.hasPointerCapture(e.pointerId)) setPad(e.clientX, e.clientY);
  });
  pad.addEventListener("pointerup", endPad);
  pad.addEventListener("pointercancel", endPad);
}

function goMenu() {
  playing = false;
  $("end-screen").style.display = "none";
  $("story-screen").style.display = "none";
  $("hud").style.display = "none";
  $("hint").style.display = "none";
  $("touch").style.display = "none";
  $("menu").style.display = "flex";
}

function playStoryFromMenu() {
  playMode = "story";
  score = 0;
  clueCount = 0;
  const saved = storyProgress();
  chapterI = saved >= CHAPTERS.length ? 0 : saved;
  showStoryCard(chapterI);
}

function bindMenu() {
  document.querySelectorAll(".char-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".char-card").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      skinId = btn.dataset.skin;
    });
  });
  const run = () => startGame().catch((err) => {
    console.error(err);
    $("model-status").textContent = "Hata: " + (err && err.message ? err.message : String(err));
  });
  $("btn-start").addEventListener("click", () => {
    playMode = "free";
    score = 0;
    clueCount = 0;
    run();
  });
  $("btn-story").addEventListener("click", () => playStoryFromMenu());
  $("btn-story-go").addEventListener("click", () => run());
  $("btn-story-menu").addEventListener("click", () => goMenu());
  $("btn-end-menu").addEventListener("click", () => goMenu());
  $("btn-again").addEventListener("click", () => run());
}

bindInput();
bindMenu();
