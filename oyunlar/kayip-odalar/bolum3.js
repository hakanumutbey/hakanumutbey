// BÖLÜM 3 — DEPO VE BOMBA (Z: -26.5 ile -50.5 arası, X ±8)
// Uzun ve zor bölüm: 12 malzeme rafların arasına, sandıklara, şifreli dolaba, vidalı havalandırmaya ve
// kilitli depo odasına saklandı. Çalışma masasındaki tarif kitapçığına göre bomba 11 adımda, doğru
// sırayla kurulur; yanlış adım bütün düzeneği söker. Bomba çatlak duvara kurulunca oyuncunun 6 saniyesi
// var: masanın altına girip eğilmezse ölür ve bombayı kurmadan önceki ana döner.

const CH3_CABINET_CODE = "472";
const BOMB_SECONDS = 6;
const WORKBENCH = { x: 4.2, z: -46.5 };

const MATERIALS = {
  kutu: { name: "Metal Kutu", icon: "📦" },
  kart: { name: "Devre Kartı", icon: "💾" },
  vida: { name: "Vida Seti", icon: "🔩" },
  tornavida: { name: "Tornavida", icon: "🪛" },
  pil: { name: "Büyük Pil Paketi", icon: "🔋" },
  kirmizi: { name: "Kırmızı Kablo", icon: "🟥" },
  saat: { name: "Saat Mekanizması", icon: "⏰" },
  mavi: { name: "Mavi Kablo", icon: "🟦" },
  cip: { name: "Ateşleyici Çip", icon: "📟" },
  jel: { name: "Patlayıcı Jel", icon: "🧪" },
  yay: { name: "Yay", icon: "🌀" },
  bant: { name: "Koli Bandı", icon: "🧻" }
};
// Kurulum sırası. Tornavida bir araçtır: tarifte yok ama 'vida' adımında yanında olmalı.
const RECIPE = ["kutu", "kart", "vida", "pil", "kirmizi", "saat", "mavi", "cip", "jel", "yay", "bant"];

const BOOK_PAGES = [
  "<h3>📖 TARİF KİTAPÇIĞI · Sayfa 1/3</h3><p><b>UYARI:</b> Parçalar tam bu sırayla takılır. Yanlış sırada takılan tek bir parça bütün düzeneği söker, en baştan başlarsın!</p><ol><li><b>Metal Kutu</b> — gövdeyi masaya koy.</li><li><b>Devre Kartı</b> — kutunun dibine yerleştir.</li><li><b>Vida Seti</b> — kartı vidala. Elinde <b>tornavida</b> yoksa olmaz!</li><li><b>Büyük Pil Paketi</b> — kartın soluna.</li></ol>",
  "<h3>📖 TARİF KİTAPÇIĞI · Sayfa 2/3</h3><ol start='5'><li><b>Kırmızı Kablo</b> — pilden saate. Saatten <b>ÖNCE</b> takılır!</li><li><b>Saat Mekanizması</b> — kırmızı kablonun ucuna.</li><li><b>Mavi Kablo</b> — saatten çipe. Kırmızıyla karıştırma!</li><li><b>Ateşleyici Çip</b> — mavi kablonun ucuna.</li></ol>",
  "<h3>📖 TARİF KİTAPÇIĞI · Sayfa 3/3</h3><ol start='9'><li><b>Patlayıcı Jel</b> — kutuyu doldur.</li><li><b>Yay</b> — kapağın yayı.</li><li><b>Koli Bandı</b> — hepsini sıkıca sar.</li></ol><p class='danger'>⚠️ Zamanlayıcı <b>6 saniye!</b> Bombayı çatlak duvara kurduktan sonra HEMEN bu masanın altına gir ve <b>[C]</b> ile eğil. Açıkta kalan ölür!</p>"
];

const ch3 = {
  lightsOn: false,
  entered: false,
  bag: new Set(),
  hasStoreKey: false,
  craftStep: 0,
  hasBomb: false,
  bombArmed: false,
  countdown: 0,
  lastTick: 0,
  wallBroken: false,
  dead: false,
  cabinetOpen: false,
  ventOpen: false,
  bookPage: 0,
  lights: [],
  uvTexts: [],
  crackedWall: null,
  crackedBox: null,
  benchParts: [],
  bombMesh: null,
  rubble: [],
  shake: 0
};
let storeDoor;

chapterBuilders.push(buildChapter3);
updateHooks.push(updateChapter3);

function buildChapter3() {
  const H = 5.0;
  const wallMat = new THREE.MeshPhongMaterial({ map: makeTileTexture("#27272a", "#3f3f46"), shininess: 15 });
  const floorMat = new THREE.MeshPhongMaterial({ map: makeTileTexture("#1c1917", "#292524"), shininess: 10 });
  const rackMat = new THREE.MeshPhongMaterial({ color: 0xc2410c, shininess: 40 });
  const woodMat = new THREE.MeshPhongMaterial({ color: 0x78350f, shininess: 20 });
  const metalMat = new THREE.MeshPhongMaterial({ color: 0x52525b, shininess: 70 });

  // Zemin ve tavan (depo 5m yüksek); duvarın ardındaki koridor 3.2m
  const floor = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.3, 28), floorMat);
  floor.position.set(0, -0.15, -40.5);
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.3, 24), new THREE.MeshPhongMaterial({ color: 0x0c0a09 }));
  ceiling.position.set(0, H + 0.15, -38.5);
  scene.add(ceiling);
  const corridorCeiling = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 4.2), new THREE.MeshPhongMaterial({ color: 0x0c0a09 }));
  corridorCeiling.position.set(0, 3.35, -52.6);
  scene.add(corridorCeiling);

  // Duvarlar (giriş duvarı Z = -26.5 bolum2.js'te)
  addWall(-8.15, H / 2, -38.5, 0.3, H, 24.0, wallMat);
  addWall(8.15, H / 2, -38.5, 0.3, H, 24.0, wallMat);
  addWall(-4.825, H / 2, -50.5, 6.65, H, 0.35, wallMat);
  addWall(4.825, H / 2, -50.5, 6.65, H, 0.35, wallMat);
  addWall(0, 4.1, -50.5, 3.0, 1.8, 0.35, wallMat);
  addWall(-1.65, 1.6, -52.6, 0.3, 3.2, 4.2, wallMat);
  addWall(1.65, 1.6, -52.6, 0.3, 3.2, 4.2, wallMat);
  // Koridorun ucu (Z = -54.7) Bölüm 4 laboratuvarının lobisine açılır (bolum4.js)

  // Çatlak duvar: patlayınca yok olur (çarpışma kutusu dizilerden çıkarılır)
  ch3.crackedWall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.2, 0.35), new THREE.MeshPhongMaterial({ map: makeCrackTexture() }));
  ch3.crackedWall.position.set(0, 1.6, -50.5);
  scene.add(ch3.crackedWall);
  ch3.crackedBox = new THREE.Box3(new THREE.Vector3(-1.5, 0, -50.675), new THREE.Vector3(1.5, 3.2, -50.325));
  solidColliders.push(ch3.crackedBox);
  wallColliders.push(ch3.crackedBox);

  // Işıklar: bölüm 2 bitene kadar kapalı (duvardan geçip karanlık odayı aydınlatmasınlar)
  // visible=false: kapalı ışık da her pikselde hesaplanır; görünmez ışık hesaba hiç girmez (FPS)
  [[0, -31], [0, -39], [0, -47], [6.2, -35], [-6.2, -35]].forEach(([x, z]) => {
    const l = new THREE.PointLight(0xfde68a, 0, 13);
    l.visible = false;
    l.position.set(x, H - 0.4, z);
    scene.add(l);
    ch3.lights.push({ light: l, power: 1.15 });
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0x3f3f46 }));
    fixture.position.set(x, H - 0.05, z);
    scene.add(fixture);
    ch3.lights[ch3.lights.length - 1].fixture = fixture;
  });
  const storeLamp = new THREE.PointLight(0xfca5a5, 0, 7);
  storeLamp.visible = false;
  storeLamp.position.set(-5.5, H - 0.6, -47.5);
  scene.add(storeLamp);
  ch3.lights.push({ light: storeLamp, power: 0.8 });

  // Şarj istasyonu (giriş duvarında, kapının solunda)
  const charger = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.12), new THREE.MeshPhongMaterial({ color: 0x1e3a8a, emissive: 0x1e40af }));
  charger.position.set(-2.4, 1.4, -26.74);
  scene.add(charger);
  addColliderBox(-2.7, 1.0, -26.8, -2.1, 1.8, -26.675);

  // Raflar
  buildRack(-4.5, -35, rackMat);
  buildRack(4.5, -35, rackMat);

  // --- MALZEMELER ---
  addMaterial("bant", flatCoil(0.1, 0.04, 0xd6b48a), new THREE.Vector3(7.2, 0.04, -27.6));
  addMaterial("kirmizi", flatCoil(0.12, 0.025, 0xdc2626), new THREE.Vector3(-4.5, 0.955, -33.0));
  addMaterial("mavi", flatCoil(0.12, 0.025, 0x2563eb), new THREE.Vector3(4.5, 0.155, -39.3));
  addMaterial("yay", springMesh(), new THREE.Vector3(4.5, 2.53, -31.0));
  addMaterial("tornavida", screwdriverMesh(), new THREE.Vector3(-6.6, 0.03, -39.0));

  // Havalandırma (sol duvar): ızgara vidalı, tornavidayla sökülür; arkasında devre kartı
  const ventHole = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  ventHole.rotation.y = Math.PI / 2;
  ventHole.position.set(-7.995, 0.45, -36.0);
  scene.add(ventHole);
  const ventBars = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), metalMat);
    bar.position.set(-7.93, 0.45, -36.36 + i * 0.12);
    ventBars.add(bar);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.84), metalMat);
  frame.position.set(-7.93, 0.72, -36.0);
  ventBars.add(frame);
  const frame2 = frame.clone();
  frame2.position.y = 0.18;
  ventBars.add(frame2);
  scene.add(ventBars);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.32), new THREE.MeshPhongMaterial({ color: 0x15803d, emissive: 0x052e16 }));
  card.position.set(-7.97, 0.45, -36.0);
  registerInteractable({
    pos: new THREE.Vector3(-7.85, 0.45, -36.0),
    radius: 2.8,
    getPrompt: () => (ch3.ventOpen ? "" : "[E] Havalandırma Izgarası (vidalı)"),
    action: () => {
      handTriggerReach();
      if (!ch3.bag.has("tornavida")) {
        showToast("Izgara vidalı! Arkasında yeşil bir şey var... Tornavida lazım.");
        playSound("error");
        return;
      }
      ch3.ventOpen = true;
      ventBars.visible = false;
      playSound("drawer");
      showToast("Tornavidayla ızgarayı söktün! İçeride bir devre kartı var.");
    }
  });
  addMaterial("kart", card, card.position.clone(), () => ch3.ventOpen);

  // Şifreli dolap (sol duvar, girişe yakın). Şifre karşı duvarda, sadece fenerle görünür.
  const cab = { x0: -8.0, x1: -7.3, z0: -29.7, z1: -28.3 };
  const cabPanel = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), metalMat);
    m.position.set(x, y, z);
    scene.add(m);
  };
  cabPanel(0.05, 2.0, 1.4, -7.975, 1.0, -29.0); // arka
  cabPanel(0.7, 2.0, 0.05, -7.65, 1.0, -29.675); // yanlar
  cabPanel(0.7, 2.0, 0.05, -7.65, 1.0, -28.325);
  cabPanel(0.7, 0.05, 1.4, -7.65, 1.975, -29.0); // üst
  cabPanel(0.7, 0.05, 1.4, -7.65, 0.025, -29.0); // alt
  cabPanel(0.65, 0.04, 1.3, -7.65, 1.0, -29.0); // orta raf (üstü 1.02)
  addColliderBox(cab.x0, 0, cab.z0, cab.x1, 2.0, cab.z1);
  const cabDoorPivot = new THREE.Group();
  cabDoorPivot.position.set(-7.28, 0, -29.68);
  const cabDoor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.96, 1.36), new THREE.MeshPhongMaterial({ color: 0x3f3f46, shininess: 80 }));
  cabDoor.position.set(0, 1.0, 0.68);
  cabDoorPivot.add(cabDoor);
  const lockPad = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.12), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  lockPad.position.set(0.03, 1.25, 1.15);
  cabDoorPivot.add(lockPad);
  scene.add(cabDoorPivot);
  movingColliderMeshes.push(cabDoor); // açılan kapak odaya çıkar, içinden geçilmesin
  ch3.cabDoorPivot = cabDoorPivot;
  registerInteractable({
    pos: new THREE.Vector3(-7.2, 1.25, -28.6),
    radius: 2.8,
    getPrompt: () => (ch3.cabinetOpen ? "" : "🔒 [E] Şifreli Dolap (3 hane)"),
    action: () => openKeypad({
      code: CH3_CABINET_CODE,
      title: "ŞİFRELİ DOLAP",
      onSuccess: () => {
        ch3.cabinetOpen = true;
        showToast("DOLAP AÇILDI! İçinde jel ve bir çip var.");
      }
    })
  });
  const jel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 14), new THREE.MeshPhongMaterial({ color: 0xf97316, emissive: 0x7c2d12, transparent: true, opacity: 0.9 }));
  addMaterial("jel", jel, new THREE.Vector3(-7.62, 1.11, -29.3), () => ch3.cabinetOpen);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.09), new THREE.MeshPhongMaterial({ color: 0x166534, emissive: 0x14532d }));
  addMaterial("cip", chip, new THREE.Vector3(-7.62, 1.035, -28.7), () => ch3.cabinetOpen);
  addUvText(["DOLAP", CH3_CABINET_CODE.split("").join(" ")], new THREE.Vector3(7.975, 1.8, -29.0), -Math.PI / 2);

  // Sandıklar (sağ rafla sağ duvar arasında). Bazıları boş.
  // Duvara yaslı (X 7.2..8.0): arada boşluk kalırsa oyuncu arkaya girip açık kapakların içinden geçer
  const crateContents = [null, "pil", null, "anahtar", "vida", null];
  crateContents.forEach((content, i) => buildCrate(7.6, -31.2 - i * 1.6, content, woodMat));

  // Depo odası (sol arka köşe, X -8..-3, Z -44..-50.5); kapı anahtarla açılır
  addWall(-7.425, H / 2, -44, 1.45, H, 0.35, wallMat);
  addWall(-3.575, H / 2, -44, 1.45, H, 0.35, wallMat);
  addWall(-5.5, 4.0, -44, 2.4, 2.0, 0.35, wallMat);
  addWall(-3.0, H / 2, -47.25, 0.3, H, 6.5, wallMat);
  storeDoor = createDoubleDoor(-5.5, -44, "custom", "🔒 [E] Depo Odası (kilitli)", d => {
    if (d.isOpen) return;
    if (ch3.hasStoreKey) {
      d.isOpen = true;
      playSound("door");
      showToast("Depo anahtarıyla kapı açıldı!");
    } else {
      showToast("Kilitli! Anahtarı sandıklardan birinde olabilir.");
      playSound("error");
    }
  });
  addSolidBlock(-6.0, 0.5, -50.05, 2.0, 1.0, 0.5, woodMat); // arka raf
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.3), new THREE.MeshPhongMaterial({ color: 0x71717a, shininess: 90 }));
  addMaterial("kutu", box, new THREE.Vector3(-6.0, 1.14, -50.05));
  addSolidBlock(-4.0, 0.4, -47.5, 0.8, 0.8, 0.8, woodMat); // küçük masa
  addMaterial("saat", clockMesh(), new THREE.Vector3(-4.0, 0.8, -47.5));

  buildWorkbench(woodMat, metalMat);

  // Bomba yerleştirme noktası (çatlak duvarın önü)
  const bomb = new THREE.Group();
  const bombBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.3), new THREE.MeshPhongMaterial({ color: 0x52525b }));
  bombBody.position.y = 0.15;
  bomb.add(bombBody);
  const bombLed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  bombLed.position.set(0, 0.32, 0.1);
  bomb.add(bombLed);
  bomb.position.set(0, 0, -50.05);
  bomb.visible = false;
  scene.add(bomb);
  ch3.bombMesh = bomb;
  ch3.bombLed = bombLed;
  registerInteractable({
    pos: new THREE.Vector3(0, 0.9, -50.05),
    radius: 3.0,
    getPrompt: () => {
      if (ch3.wallBroken || ch3.bombArmed) return "";
      return ch3.hasBomb ? "💣 [E] Bombayı Çatlak Duvara Kur (6 sn!)" : "Çatlak duvar... [E] İncele";
    },
    action: () => {
      if (!ch3.hasBomb) {
        showToast("Bu duvar çatlak. Patlatırsan yıkılır... Masadaki tarife göre bomba yap.");
        return;
      }
      armBomb();
    }
  });
}

function buildRack(x, zc, mat) {
  const len = 10;
  const part = (w, h, d, px, py, pz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    scene.add(m);
  };
  [-0.45, 0.45].forEach(dx => [-len / 2 + 0.05, -len / 6, len / 6, len / 2 - 0.05].forEach(dz => part(0.08, 2.6, 0.08, x + dx, 1.3, zc + dz)));
  [0.1, 0.9, 1.7, 2.5].forEach(y => part(1.0, 0.06, len, x, y, zc));
  addColliderBox(x - 0.5, 0, zc - len / 2, x + 0.5, 2.6, zc + len / 2);
  // Raflarda dekor kutular (malzemelerle çakışmayan yerlerde)
  const deco = new THREE.MeshPhongMaterial({ color: 0xa16207 });
  [[0.93, -3.5], [0.13, -1.2], [1.73, 1.0], [0.93, 3.6], [1.73, -4.2]].forEach(([y, dz]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.7), deco);
    b.position.set(x, y + 0.25, zc + dz);
    scene.add(b);
  });
}

function flatCoil(r, tube, color) {
  return new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 20).rotateX(Math.PI / 2), new THREE.MeshPhongMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.25) }));
}

function springMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({ color: 0xd4d4d8, emissive: 0x27272a, shininess: 120 });
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 14).rotateX(Math.PI / 2), mat);
    ring.position.y = 0.01 + i * 0.035;
    g.add(ring);
  }
  return g;
}

function screwdriverMesh() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10).rotateZ(Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xeab308, emissive: 0x422006 }));
  handle.position.x = -0.06;
  g.add(handle);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6).rotateZ(Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xd4d4d8 }));
  shaft.position.x = 0.08;
  g.add(shaft);
  return g;
}

function clockMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20), new THREE.MeshPhongMaterial({ color: 0x18181b, emissive: 0x111111 }));
  body.position.y = 0.03;
  g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0xfef3c7 }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.061;
  g.add(face);
  return g;
}

function makeCrackTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#57534e";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 3;
  for (let k = 0; k < 7; k++) {
    ctx.beginPath();
    let x = 128, y = 128;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += Math.cos(k * 0.9 + s * 0.5) * 22;
      y += Math.sin(k * 0.9 + s * 0.7) * 22;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "#facc15";
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(i * 36 - 20, 236);
    ctx.rotate(-0.6);
    ctx.fillRect(0, 0, 14, 40);
    ctx.restore();
  }
  ctx.fillStyle = "#fef08a";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⚠ ÇATLAK DUVAR", 128, 40);
  return new THREE.CanvasTexture(c);
}

function addUvText(lines, pos, rotY) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c084fc";
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 14;
  ctx.textAlign = "center";
  ctx.font = "bold 40px monospace";
  ctx.fillText(lines[0], 128, 50);
  ctx.font = "bold 72px monospace";
  ctx.fillText(lines[1], 128, 135);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.62),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false })
  );
  mesh.position.copy(pos);
  mesh.rotation.y = rotY;
  scene.add(mesh);
  ch3.uvTexts.push({ mesh, seen: false });
}

// Malzeme: alınınca çantaya girer; isAvailable false iken (kapalı dolap vb.) seçilemez
function addMaterial(id, mesh, pos, isAvailable = () => true) {
  mesh.position.copy(pos);
  scene.add(mesh);
  const m = MATERIALS[id];
  registerInteractable({
    pos: pos.clone(),
    radius: 2.8,
    getPrompt: () => (ch3.bag.has(id) || !isAvailable() ? "" : `${m.icon} [E] ${m.name} Al`),
    action: () => {
      ch3.bag.add(id);
      mesh.visible = false;
      handTriggerReach();
      playSound("success");
      showToast(`${m.icon} ${m.name.toUpperCase()} ALINDI! (${ch3.bag.size}/12)`);
      if (ch3.bag.size === 12) {
        updateObjective("BÖLÜM 3 · BOMBA", "Bütün malzemeler tamam! Masadaki kitapçığa göre bombayı kur.");
      }
      renderMaterialsHud();
    }
  });
}

function buildCrate(x, z, content, mat) {
  addSolidBlock(x, 0.35, z, 0.8, 0.7, 0.8, mat);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(x + 0.4, 0.7, z);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), new THREE.MeshPhongMaterial({ color: 0x92400e }));
  lid.position.set(-0.4, 0.03, 0);
  lidPivot.add(lid);
  scene.add(lidPivot);
  // İçerik kapak kapalıyken gizli: aksi halde kapağın içinden dışarı taşar
  const crate = { open: false, lidPivot, contentMesh: null };
  registerInteractable({
    pos: new THREE.Vector3(x, 0.75, z),
    radius: 2.6,
    getPrompt: () => (crate.open ? "" : "📦 [E] Sandığı Aç"),
    action: () => {
      crate.open = true;
      lidPivot.rotation.z = -1.5; // kapak dikilip arkadaki duvara yaslanır
      if (crate.contentMesh) crate.contentMesh.visible = true;
      handTriggerReach();
      playSound("drawer");
      if (!content) showToast("Sandık boş... sadece örümcek ağı 🕸️");
      else showToast("Sandıkta bir şey var!");
    }
  });
  if (content === "anahtar") {
    const key = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16).rotateX(Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xfbbf24, emissive: 0x92400e }));
    key.position.set(x, 0.715, z);
    key.visible = false;
    scene.add(key);
    crate.contentMesh = key;
    registerInteractable({
      pos: new THREE.Vector3(x, 0.72, z),
      radius: 2.6,
      getPrompt: () => (crate.open && !ch3.hasStoreKey ? "🗝️ [E] Depo Anahtarını Al" : ""),
      action: () => {
        ch3.hasStoreKey = true;
        key.visible = false;
        storeDoor.promptText = "🗝️ [E] Depo Odasını Aç";
        playSound("success");
        showToast("🗝️ DEPO ANAHTARI ALINDI! Sol arkadaki depo odasını aç.");
      }
    });
  } else if (content) {
    const mesh = content === "pil"
      ? new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.15), new THREE.MeshPhongMaterial({ color: 0x1d4ed8, emissive: 0x172554 }))
      : new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.12), new THREE.MeshPhongMaterial({ color: 0x9ca3af, emissive: 0x1f2937 }));
    addMaterial(content, mesh, new THREE.Vector3(x, 0.7 + mesh.geometry.parameters.height / 2, z), () => crate.open);
    mesh.visible = false;
    crate.contentMesh = mesh;
  }
}

function buildWorkbench(woodMat, metalMat) {
  const { x, z } = WORKBENCH;
  // Tabla Y 1.0-1.1: ayakta çarpar, eğilince (gövde 0.95) altına girilir
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.2), woodMat);
  top.position.set(x, 1.05, z);
  scene.add(top);
  addColliderBox(x - 1.1, 1.0, z - 0.6, x + 1.1, 1.1, z + 0.6);
  [[-1.0, -0.5], [1.0, -0.5], [-1.0, 0.5], [1.0, 0.5]].forEach(([dx, dz]) => addSolidBlock(x + dx, 0.5, z + dz, 0.1, 1.0, 0.1, metalMat));

  const book = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.22), new THREE.MeshPhongMaterial({ color: 0xb91c1c, emissive: 0x450a0a }));
  book.position.set(x - 0.65, 1.125, z);
  scene.add(book);
  registerInteractable({
    pos: book.position.clone(),
    radius: 2.6,
    getPrompt: () => "📖 [E] Tarif Kitapçığını Oku",
    action: openBook
  });
  registerInteractable({
    pos: new THREE.Vector3(x + 0.5, 1.15, z),
    radius: 2.6,
    getPrompt: () => {
      if (ch3.hasBomb || ch3.bombArmed || ch3.wallBroken) return "";
      return `🛠️ [E] Bomba Masası (adım ${ch3.craftStep}/${RECIPE.length})`;
    },
    action: openCraft
  });

  // Masada adım adım beliren parçalar (tamamlanan adım sayısı kadar)
  const colors = [0x71717a, 0x15803d, 0x9ca3af, 0x1d4ed8, 0xdc2626, 0xfef3c7, 0x2563eb, 0x166534, 0xf97316, 0xd4d4d8, 0xd6b48a];
  RECIPE.forEach((id, i) => {
    const size = i === 0 ? [0.4, 0.2, 0.3] : [0.08, 0.04, 0.08];
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshPhongMaterial({ color: colors[i] }));
    if (i === 0) m.position.set(x + 0.5, 1.2, z);
    else m.position.set(x + 0.36 + ((i - 1) % 4) * 0.09, 1.32, z - 0.09 + Math.floor((i - 1) / 4) * 0.09);
    m.visible = false;
    scene.add(m);
    ch3.benchParts.push(m);
  });
}

// ---------------------------------------------------------------- arayüz pencereleri
function openBook() {
  ch3.bookPage = 0;
  renderBook();
  document.getElementById("bookOverlay").style.display = "block";
  playSound("click");
  uiKeyHandler = e => {
    if (e.code === "ArrowRight" || e.code === "KeyD") ch3.bookPage = Math.min(BOOK_PAGES.length - 1, ch3.bookPage + 1);
    else if (e.code === "ArrowLeft" || e.code === "KeyA") ch3.bookPage = Math.max(0, ch3.bookPage - 1);
    else if (e.code === "KeyE" || e.code === "Escape") closeBook();
    else return true;
    renderBook();
    return true;
  };
}

function renderBook() {
  document.getElementById("bookPage").innerHTML = BOOK_PAGES[ch3.bookPage];
}

function closeBook() {
  document.getElementById("bookOverlay").style.display = "none";
  uiKeyHandler = null;
  playSound("click");
}

function openCraft() {
  if (adminMode) {
    // Admin: malzeme ve sıra gerekmeden bomba tek tıkla hazır
    ch3.craftStep = RECIPE.length;
    ch3.hasBomb = true;
    ch3.benchParts.forEach(m => (m.visible = true));
    playSound("success");
    showToast("🛠️ Admin: 💣 BOMBA HAZIR! Çatlak duvara kur, sonra masanın altına gir [C]!", 5000);
    renderMaterialsHud();
    return;
  }
  renderCraft();
  document.getElementById("craftModal").style.display = "flex";
  document.exitPointerLock();
  playSound("click");
  uiKeyHandler = e => {
    if (e.code === "KeyE" || e.code === "Escape") closeCraft();
    return true;
  };
}

function closeCraft() {
  document.getElementById("craftModal").style.display = "none";
  uiKeyHandler = null;
  lockPointer();
}

function renderCraft() {
  document.getElementById("craftStep").innerText = `Adım ${ch3.craftStep}/${RECIPE.length}`;
  const used = new Set(RECIPE.slice(0, ch3.craftStep));
  const box = document.getElementById("craftItems");
  box.innerHTML = "";
  Object.keys(MATERIALS).forEach(id => {
    if (id === "tornavida" || !ch3.bag.has(id)) return;
    const b = document.createElement("button");
    b.className = "craft-btn" + (used.has(id) ? " used" : "");
    b.disabled = used.has(id);
    b.dataset.id = id;
    b.innerText = `${MATERIALS[id].icon} ${MATERIALS[id].name}${used.has(id) ? " ✓" : ""}`;
    b.onclick = () => craftAdd(id);
    box.appendChild(b);
  });
  if (!box.children.length) box.innerHTML = "<div style='color:#94a3b8'>Çantanda takılacak malzeme yok. Depoyu ara!</div>";
  ch3.benchParts.forEach((m, i) => (m.visible = i < ch3.craftStep));
}

function craftAdd(id) {
  if (id === "vida" && RECIPE[ch3.craftStep] === "vida" && !ch3.bag.has("tornavida")) {
    showToast("Vidaları sıkmak için tornavida lazım!");
    playSound("error");
    return;
  }
  if (id !== RECIPE[ch3.craftStep]) {
    ch3.craftStep = 0;
    playSound("error");
    showToast("❌ YANLIŞ ADIM! Düzenek söküldü. Kitapçığa bak ve baştan başla.", 4500);
    renderCraft();
    return;
  }
  ch3.craftStep++;
  playSound("click");
  renderCraft();
  if (ch3.craftStep === RECIPE.length) {
    ch3.hasBomb = true;
    playSound("success");
    closeCraft();
    showToast("💣 BOMBA HAZIR! Çatlak duvara kur, sonra HEMEN masanın altına gir ve [C] ile eğil!", 6000);
    updateObjective("BÖLÜM 3 · KAÇIŞ", "Bombayı çatlak duvara kur. 6 saniyen var: masanın altına gir, [C] ile eğil!");
    renderMaterialsHud();
  }
}

function renderMaterialsHud() {
  const list = document.getElementById("matsList");
  list.innerHTML = "";
  Object.keys(MATERIALS).forEach(id => {
    const has = ch3.bag.has(id);
    const row = document.createElement("div");
    row.className = "mat-row" + (has ? " has" : "");
    row.innerText = has ? `${MATERIALS[id].icon} ${MATERIALS[id].name}` : "❔ ???";
    list.appendChild(row);
  });
  document.getElementById("matsCount").innerText = ch3.hasBomb ? "💣 BOMBA HAZIR" : `MALZEMELER ${ch3.bag.size}/12`;
}

// ---------------------------------------------------------------- bomba
function armBomb() {
  ch3.hasBomb = false;
  ch3.bombArmed = true;
  ch3.countdown = BOMB_SECONDS;
  ch3.lastTick = BOMB_SECONDS + 1;
  ch3.bombMesh.visible = true;
  handTriggerReach();
  playSound("click");
  showToast("💣 ZAMANLAYICI ÇALIŞTI! KOŞ! MASANIN ALTINA GİR VE [C] İLE EĞİL!", BOMB_SECONDS * 1000);
}

function isUnderTable() {
  return player.crouch && Math.abs(player.pos.x - WORKBENCH.x) < 1.0 && Math.abs(player.pos.z - WORKBENCH.z) < 0.6;
}

function explode() {
  ch3.bombArmed = false;
  ch3.bombMesh.visible = false;
  ch3.crackedWall.visible = false;
  [solidColliders, wallColliders].forEach(arr => {
    const i = arr.indexOf(ch3.crackedBox);
    if (i >= 0) arr.splice(i, 1);
  });
  spawnRubble();
  playSound("explosion");
  ch3.shake = 1.0;
  const flash = document.getElementById("flashOverlay");
  flash.style.transition = "none";
  flash.style.opacity = "1";
  setTimeout(() => {
    flash.style.transition = "opacity 1.4s";
    flash.style.opacity = "0";
  }, 60);
  document.getElementById("bombTimer").style.display = "none";

  if (isUnderTable()) {
    ch3.wallBroken = true;
    showToast("💥 BOOM! Masanın altında kurtuldun! Duvar yıkıldı!", 5000);
    updateObjective("BÖLÜM 3 TAMAMLANDI", "Yıkılan duvardan geç! ([C] ile ayağa kalk)");
  } else {
    die();
  }
}

function spawnRubble() {
  // Yerde yassı parçalar (0.09m'den alçak): oyuncunun içinden geçmesi doğal, takılmaz
  const mat = new THREE.MeshPhongMaterial({ color: 0x57534e });
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.15 + Math.random() * 0.3, 0.06, 0.15 + Math.random() * 0.3), mat);
    m.position.set((Math.random() - 0.5) * 3.0, 0.03, -49.6 + (Math.random() - 0.5) * 1.4);
    m.rotation.y = Math.random() * Math.PI;
    scene.add(m);
    ch3.rubble.push(m);
  }
}

function die() {
  ch3.dead = true;
  showDeath("ÖLDÜN!", "Patlamada açıktaydın. Masanın altına girip [C] ile eğilmeliydin!", retryBomb);
}

// Kontrol noktası: bomba elde, duvar sağlam, oyuncu masanın yanında
function retryBomb() {
  ch3.dead = false;
  ch3.hasBomb = true;
  ch3.wallBroken = false;
  ch3.crackedWall.visible = true;
  if (!solidColliders.includes(ch3.crackedBox)) solidColliders.push(ch3.crackedBox);
  if (!wallColliders.includes(ch3.crackedBox)) wallColliders.push(ch3.crackedBox);
  ch3.rubble.forEach(m => scene.remove(m));
  ch3.rubble = [];
  player.crouch = false;
  updateCrouchHud();
  player.pos.set(WORKBENCH.x, 1.7, WORKBENCH.z + 1.8);
  player.yaw = Math.PI * 0.8;
  player.pitch = 0;
  updateObjective("BÖLÜM 3 · TEKRAR", "Bombayı yine kur. Bu sefer HEMEN masanın altına gir ve [C] ile eğil!");
}

// ---------------------------------------------------------------- her kare
function updateChapter3(dt) {
  if (!ch3.lightsOn && doorCh2Exit.isOpen) {
    ch3.lightsOn = true;
    ch3.lights.forEach(l => {
      l.light.visible = true;
      l.light.intensity = l.power;
    });
    ch3.lights.forEach(l => l.fixture && l.fixture.material.color.setHex(0xfef3c7));
  }

  const inHall = player.pos.z < -26.5 && player.pos.z > -54.7;
  // Laboratuvara geçince depo ışıkları kapanır (görünmez ışık çizim maliyetine girmez); geri dönünce yanar
  if (ch3.lightsOn) {
    const inLab = player.pos.z < -54.0;
    ch3.lights.forEach(l => (l.light.visible = !inLab));
  }
  if (inHall && !ch3.entered) {
    ch3.entered = true;
    player.battery = 100;
    ch2.glow.visible = false;
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.018);
    showToast("Şarj istasyonu fenerini %100 doldurdu. Burası kocaman bir depo...", 4500);
    updateObjective("BÖLÜM 3 · DEPO", "Dipte sağdaki masada tarif kitapçığı var. 12 malzemeyi bul ve bomba yap!");
    renderMaterialsHud();
  }
  if (inHall) ambientLight.intensity += (0.3 - ambientLight.intensity) * Math.min(1, dt * 2);
  document.getElementById("matsHud").style.display = ch3.entered && !ch3.wallBroken ? "block" : "none";

  // Arada titreyen bir lamba
  if (ch3.lightsOn) ch3.lights[3].light.intensity = Math.random() < 0.04 ? 0.2 : ch3.lights[3].power;

  // Dolap kapağı açılır
  const target = ch3.cabinetOpen ? 1.9 : 0;
  ch3.cabDoorPivot.rotation.y += (target - ch3.cabDoorPivot.rotation.y) * Math.min(1, dt * 6);

  // Mor yazı: sadece fener ışığında
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  ch3.uvTexts.forEach(t => {
    const v = t.mesh.position.clone().sub(camera.position);
    const on = player.hasFlashlight && player.flashOn && v.length() < 10 && camDir.angleTo(v) < 0.42;
    t.mesh.material.opacity += ((on ? 1 : 0) - t.mesh.material.opacity) * Math.min(1, dt * 6);
    if (on && !t.seen && t.mesh.material.opacity > 0.6) {
      t.seen = true;
      showToast("Fenerle gizli bir yazı buldun!");
    }
  });

  // Geri sayım
  const timerEl = document.getElementById("bombTimer");
  if (ch3.bombArmed) {
    ch3.countdown -= dt;
    const sec = Math.ceil(ch3.countdown);
    if (sec < ch3.lastTick) {
      ch3.lastTick = sec;
      playSound("tick");
    }
    ch3.bombLed.visible = Math.floor(ch3.countdown * 4) % 2 === 0;
    timerEl.style.display = "block";
    timerEl.innerText = (isUnderTable() ? "🛡️ GÜVENDESİN " : "💣 ") + Math.max(0, ch3.countdown).toFixed(1);
    timerEl.style.color = isUnderTable() ? "#22c55e" : "#ef4444";
    if (ch3.countdown <= 0) explode();
  }

  // Patlama sarsıntısı
  if (ch3.shake > 0) {
    ch3.shake = Math.max(0, ch3.shake - dt * 1.2);
    camera.position.x += (Math.random() - 0.5) * 0.25 * ch3.shake;
    camera.position.y += (Math.random() - 0.5) * 0.25 * ch3.shake;
  }
}
