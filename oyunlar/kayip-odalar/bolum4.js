// BÖLÜM 4 — KONTROL ODASI, İSKELE VE KAÇIŞ (Z: -54.7'den denize)
// Hakan'ın tarifi: bilgisayarda dosyaları araştır, kapının şifresini bul; sonra kabloları değiştirip
// bağlayarak tamir et; en sonda sürüp karaya git, oyun bitsin.
// 1) Kontrol odası: giriş şifresi odada (dolap çekmecesi). Bilgisayarda e-posta, resimler, belgeler,
//    geri dönüşüm kutusu ve şifreli gizli.zip; zip şifresi = köpeğin adı + teknenin numarası; zip'te
//    iskele kapısının şifresi. Belgeler gizemi açar: odalar bir testti, burası denizin ortasında bir platform.
// 2) İskele: fırtına. Teknenin motorunda 3 yanık kablo; yedekleri kulübede. Değiştir, sonra bağlantı
//    panelinde kabloları e-postadaki sembollere bağla (yanlış uç kıvılcım; 3 hata = kısa devre, baştan).
// 3) Tekne: fırtınada kayaların arasından deniz fenerinin olduğu kıyıya sür. 3 çarpma = batar, iskeleden
//    tekrar. Kıyıya varınca oyun biter.

const PC_LOGIN = "marti22";
const ZIP_PASS = "zeytin47";
const DOCK_CODE = "3608";
const BOAT_START = { x: 0, z: -83 };
const SHORE_Z = -318;
const WIRE_COLORS = [
  { id: "kirmizi", name: "Kırmızı", hex: "#ef4444", symbol: "★" },
  { id: "mavi", name: "Mavi", hex: "#3b82f6", symbol: "●" },
  { id: "sari", name: "Sarı", hex: "#facc15", symbol: "▲" },
  { id: "yesil", name: "Yeşil", hex: "#22c55e", symbol: "■" }
];
const RIGHT_ORDER = ["▲", "■", "★", "●"]; // paneldeki uçların sırası (karışık)

// Kayalar [x, z, yarıçap]: ortadaki rota bunların arasından kıvrılır; yanlarda sık kayalık
const ROCKS = [
  [-6, -108, 3], [7, -122, 3.5], [-2, -140, 3], [10, -152, 3], [-11, -166, 3.5], [2, -180, 3], [-12, -198, 3],
  [9, -210, 3.5], [-3, -226, 3], [6, -242, 3], [-9, -256, 3.5], [3, -270, 3], [-4, -290, 3], [11, -300, 3]
];
for (let i = 0; i < 26; i++) {
  const side = i % 2 ? 1 : -1;
  ROCKS.push([side * (24 + ((i * 37) % 30)), -100 - i * 8.5, 3 + (i % 3)]);
}
// Kayalardan temiz geçen rota (test botu bu noktaları izler)
const SEA_ROUTE = [[0, -95], [4, -108], [-3, -122], [7, -140], [2, -152], [0, -166], [-8, -180], [3, -196], [-1, -210], [6, -226], [-3, -242], [2, -256], [-6, -270], [5, -290], [0, -300], [0, -332]];

const ch4 = {
  entered: false,
  outdoors: false,
  drawers: [false, false, false],
  pcState: "login",
  pcLoggedIn: false,
  zipOpen: false,
  readMail: new Set(),
  bag: new Set(),
  replaced: { kirmizi: false, mavi: false, sari: false },
  wired: false,
  wireDone: new Set(),
  wirePick: null,
  wireMistakes: 0,
  started: false,
  boatMode: false,
  ended: false,
  boat: null,
  lights: [],
  outdoorLights: [],
  lightningT: 6,
  deaths: 0,
  startTime: performance.now()
};
let dockDoor;

chapterBuilders.push(buildChapter4);
updateHooks.push(updateChapter4);

// ------------------------------------------------------------------ yardımcılar
function zWallWithOpenings(z, x0, x1, openings, mat, H, lintelFrom) {
  let cur = x0;
  openings.forEach(([cx, w]) => {
    const a = cx - w / 2, b = cx + w / 2;
    if (a > cur) addWall((cur + a) / 2, H / 2, z, a - cur, H, 0.3, mat);
    if (lintelFrom < H) addWall(cx, (lintelFrom + H) / 2, z, w, H - lintelFrom, 0.3, mat);
    cur = b;
  });
  if (x1 > cur) addWall((cur + x1) / 2, H / 2, z, x1 - cur, H, 0.3, mat);
}

function box4(w, h, d, color, x, y, z, solid, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshPhongMaterial(Object.assign({ color, shininess: 30 }, extra)));
  m.position.set(x, y, z);
  scene.add(m);
  if (solid) addColliderBox(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2);
  return m;
}

function canvasImage(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}

function canvasPlane4(w, h, draw, pos, rotY) {
  const c = canvasImage(Math.round(w * 256), Math.round(h * 256), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  m.position.copy(pos);
  m.rotation.y = rotY;
  scene.add(m);
  return m;
}

function addLight4(color, power, dist, x, y, z, outdoor) {
  const l = new THREE.PointLight(color, power, dist);
  l.position.set(x, y, z);
  l.visible = false; // bölüme girilene kadar çizim maliyetine girmesin
  scene.add(l);
  (outdoor ? ch4.outdoorLights : ch4.lights).push(l);
  return l;
}

// ------------------------------------------------------------------ yapı
function buildChapter4() {
  const H = 3.2;
  const wallMat = new THREE.MeshPhongMaterial({ map: makeTileTexture("#334155", "#1e293b"), shininess: 25 });
  const floorMat = new THREE.MeshPhongMaterial({ map: makeTileTexture("#111827", "#1f2937"), shininess: 20 });

  // Kontrol odası X -5..5, Z -54.7..-64.7 (güneyde Bölüm 3 koridoru, kuzeyde iskele kapısı)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.3, 10.4), floorMat);
  floor.position.set(0, -0.15, -59.7);
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.3, 10.4), new THREE.MeshPhongMaterial({ color: 0x0b1120 }));
  ceil.position.set(0, H + 0.15, -59.7);
  scene.add(ceil);
  zWallWithOpenings(-54.85, -5.3, 5.3, [[0, 3.0]], wallMat, H, H);
  zWallWithOpenings(-64.7, -5.3, 5.3, [[0, 2.4]], wallMat, H, 3.0);
  addWall(-5.15, H / 2, -59.7, 0.3, H, 10.0, wallMat);
  addWall(5.15, H / 2, -59.7, 0.3, H, 10.0, wallMat);

  addLight4(0x93c5fd, 0.55, 9, 0, 2.9, -58.0);
  ch4.monitorLight = addLight4(0x38bdf8, 0.9, 4, -3.0, 1.4, -59.4);

  buildComputerDesk();
  buildServers();
  buildFilingCabinet();
  buildControlRoomProps();

  dockDoor = createDoubleDoor(0, -64.7, "keypad", "🔒 Kapı kilitli! Sağdaki tuş takımına şifreyi gir.", d => {
    if (!d.isOpen) {
      showToast("İskele kapısı kilitli. Şifre bilgisayarda bir yerde olmalı...");
      playSound("error");
    }
  });
  const keypad = new THREE.Mesh(getBlenderGeo("keypad_panel", new THREE.BoxGeometry(0.45, 0.65, 0.15)), new THREE.MeshPhongMaterial({ color: 0x475569 }));
  keypad.position.set(1.9, 1.6, -64.475);
  scene.add(keypad);
  addColliderBox(1.67, 1.27, -64.55, 2.13, 1.93, -64.39);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.12), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  screen.position.set(1.9, 1.75, -64.39);
  scene.add(screen);
  registerInteractable({
    pos: new THREE.Vector3(1.9, 1.6, -64.4),
    radius: 3.0,
    getPrompt: () => (dockDoor.isOpen ? "Şifre Çözüldü ✅" : "[E] İskele Kapısı Şifresi"),
    action: () => {
      if (dockDoor.isOpen) return;
      openKeypad({
        code: DOCK_CODE,
        title: "İSKELE KAPISI",
        onSuccess: () => {
          dockDoor.isOpen = true;
          showToast("ŞİFRE DOĞRU! Kapı açıldı... dışarıdan rüzgar ve dalga sesi geliyor.");
          updateObjective("BÖLÜM 4 · İSKELE", "Dışarı çık. Neredesin?");
        }
      });
    }
  });

  buildDock();
  buildBoat();
  buildSea();
}

function buildComputerDesk() {
  box4(2.4, 0.78, 0.9, 0x1f2937, -3.0, 0.39, -60.0, true);
  box4(0.9, 0.55, 0.05, 0x0f172a, -3.0, 1.15, -60.25, false);
  box4(0.08, 0.3, 0.08, 0x0f172a, -3.0, 0.92, -60.25, false);
  ch4.monitor = canvasPlane4(0.84, 0.48, (ctx, w, h) => drawMonitor(ctx, w, h), new THREE.Vector3(-3.0, 1.15, -60.22), 0);
  box4(0.6, 0.03, 0.22, 0x111827, -3.0, 0.795, -59.75, false);
  box4(0.6, 0.5, 0.6, 0x111827, -3.0, 0.25, -58.9, true); // sandalye
  registerInteractable({
    pos: new THREE.Vector3(-3.0, 1.1, -60.2),
    radius: 2.6,
    getPrompt: () => "💻 [E] Bilgisayarı Kullan",
    action: openComputer
  });
}

function drawMonitor(ctx, w, h) {
  ctx.fillStyle = "#082f49";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#7dd3fc";
  ctx.font = `bold ${Math.round(h / 7)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("PLATFORM-7", w / 2, h * 0.42);
  ctx.font = `${Math.round(h / 11)}px monospace`;
  ctx.fillText(ch4.pcLoggedIn ? "oturum: kaptan" : "giriş bekleniyor_", w / 2, h * 0.65);
}

function buildServers() {
  ch4.leds = [];
  [-56.8, -58.0, -59.2].forEach(z => {
    box4(0.8, 2.0, 1.0, 0x0f172a, 4.55, 1.0, z, true, { shininess: 60 });
    for (let i = 0; i < 6; i++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.05), new THREE.MeshBasicMaterial({ color: [0x22c55e, 0xf59e0b, 0x3b82f6][i % 3] }));
      led.position.set(4.14, 0.5 + i * 0.25, z - 0.3 + (i % 2) * 0.2);
      scene.add(led);
      ch4.leds.push(led);
    }
  });
}

const DRAWER_TEXT = [
  "Çekmece 1: kırık bir kalem ve paslı ataşlar.",
  "Çekmece 2: eski faturalar... 'Platform-7 yakıt teslimatı'.",
  null
];
const NOTE_LOGIN = {
  title: "📌 SARI YAPIŞKAN NOT",
  body: "Bilgisayar girişi\nKullanıcı: kaptan\nŞifre:",
  big: PC_LOGIN
};

function buildFilingCabinet() {
  box4(0.6, 1.3, 0.7, 0x475569, -4.7, 0.65, -56.5, true);
  ch4.drawerMeshes = [];
  for (let i = 0; i < 3; i++) {
    const d = box4(0.04, 0.34, 0.6, 0x64748b, -4.38, 0.25 + i * 0.4, -56.5, false);
    ch4.drawerMeshes.push(d);
    registerInteractable({
      pos: new THREE.Vector3(-4.3, 0.25 + i * 0.4, -56.5),
      radius: 2.4,
      getPrompt: () => (isNoteOpen && i === 2 ? "[E] Notu Kapat" : `🗄️ [E] ${i + 1}. Çekmece`),
      action: () => {
        handTriggerReach();
        if (!ch4.drawers[i]) {
          ch4.drawers[i] = true;
          d.position.x = -4.2;
          playSound("drawer");
        }
        if (DRAWER_TEXT[i]) showToast(DRAWER_TEXT[i]);
        else toggleNote(NOTE_LOGIN);
      }
    });
  }
  addColliderBox(-4.4, 0, -56.85, -4.15, 1.3, -56.15); // açık çekmeceler öne taşar
}

function buildControlRoomProps() {
  // Çöp kutusu: buruşuk kağıt
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.45, 12), new THREE.MeshPhongMaterial({ color: 0x374151 }));
  bin.position.set(-1.3, 0.225, -60.2);
  scene.add(bin);
  addColliderBox(-1.5, 0, -60.4, -1.1, 0.45, -60.0);
  registerInteractable({
    pos: new THREE.Vector3(-1.3, 0.45, -60.2),
    radius: 2.2,
    getPrompt: () => (isNoteOpen ? "[E] Kapat" : "🗑️ [E] Çöp Kutusunu Karıştır"),
    action: () => toggleNote({ title: "🗒️ BURUŞUK KAĞIT", body: "Hatırlatma: zip şifrelerinde HEP küçük harf kullan, boşluk bırakma. Sistem Türkçe harf kabul etmiyor." })
  });
  // Duvardaki platform haritası (gizem)
  canvasPlane4(1.6, 1.0, (ctx, w, h) => {
    ctx.fillStyle = "#0c4a6e";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(w * 0.3, h * 0.55, 20 + i * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#facc15";
    ctx.fillRect(w * 0.3 - 10, h * 0.55 - 10, 20, 20);
    ctx.fillStyle = "#fef3c7";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("PLATFORM-7", w * 0.3 - 80, 40);
    ctx.fillStyle = "#86efac";
    ctx.fillRect(w * 0.82, h * 0.15, 40, 60);
    ctx.font = "22px sans-serif";
    ctx.fillText("KIYI ⛯", w * 0.72, h * 0.15 - 8);
    ctx.fillText("12 km →", w * 0.55, h * 0.3);
  }, new THREE.Vector3(3.4, 1.8, -55.01), Math.PI); // güney duvarın oda yüzü, koridor boşluğunun yanı
  box4(1.0, 0.75, 0.6, 0x1f2937, 3.6, 0.375, -62.8, true); // yazıcı masası
  box4(0.5, 0.25, 0.4, 0xe5e7eb, 3.6, 0.875, -62.8, false);
}

// ------------------------------------------------------------------ bilgisayar
function openComputer() {
  document.getElementById("pcOverlay").style.display = "flex";
  document.exitPointerLock();
  playSound("click");
  uiKeyHandler = e => {
    if (e.code === "Escape") closeComputer();
    return true;
  };
  renderPc();
}

function closeComputer() {
  document.getElementById("pcOverlay").style.display = "none";
  uiKeyHandler = null;
  lockPointer();
}

const MAILS = [
  { from: "Kaptan Rıza", subj: "Tekne bozuldu!", body: "Fırtınada motor kısa devre yaptı, 3 kablo yandı.\nYedek KIRMIZI, MAVİ ve SARI kabloları iskeledeki kulübeye koydum.\n\nBağlantı panelinde uçlar sembollü:\n  KIRMIZI → ★ yıldız\n  MAVİ    → ● daire\n  SARI    → ▲ üçgen\n  YEŞİL   → ■ kare\nKarıştırırsan kıvılcım çıkar, üç kere karıştırırsan her şey kısa devre yapar!" },
  { from: "Sistem", subj: "Güvenlik uyarısı", body: "İskele kapısının şifresi güvenlik nedeniyle gizli.zip dosyasına taşındı.\nZip şifresini bilmeyen kişiler iskeleye çıkamaz." },
  { from: "Dr. Aras", subj: "zip şifresi (yine)", body: "Kaçıncı kez soruyorsun! Zip şifresi:\nköpeğimin adı + teknemizin numarası.\nKüçük harf, boşluk yok. Resimlere bak, ikisi de orada." }
];

function pcIcons() {
  const icons = [["mail", "📧", "E-posta"], ["pics", "🖼️", "Resimler"], ["docs", "📁", "Belgeler"], ["trash", "🗑️", "Geri Dönüşüm"], ["zip", "🔒", "gizli.zip"]];
  return `<div class="pc-icons">${icons.map(([id, ic, name]) => `<button class="pc-icon" onclick="pcOpen('${id}')"><span>${ic}</span>${name}</button>`).join("")}</div>`;
}

function renderPc(windowHtml = "") {
  const body = document.getElementById("pcBody");
  if (!ch4.pcLoggedIn) {
    body.innerHTML = `<div style="text-align:center; margin-top:60px;">
      <div style="font-size:48px;">🖥️</div>
      <div style="font-size:22px; font-weight:900; color:#7dd3fc; margin:10px 0;">PLATFORM-7 · OTURUM AÇ</div>
      <div>Kullanıcı: <b>kaptan</b></div>
      <input id="pcPass" class="pc-input" type="password" placeholder="şifre" onkeydown="if(event.key==='Enter')pcLogin(this.value)">
      <button class="pc-btn" onclick="pcLogin(document.getElementById('pcPass').value)">Giriş</button>
      <div id="pcMsg" style="color:#fca5a5; margin-top:10px; min-height:20px;"></div>
      <div style="color:#94a3b8; font-size:12px; margin-top:20px;">İpucu: kaptan şifresini bir yere yazmış olabilir...</div></div>`;
    setTimeout(() => {
      const i = document.getElementById("pcPass");
      if (i) i.focus();
    }, 50);
    return;
  }
  body.innerHTML = pcIcons() + (windowHtml ? `<div class="pc-window">${windowHtml}</div>` : "");
}

// Türkçe klavyeyle "ZEYTİN" / "zeytİn" / "Zeytin 47" yazan da kabul edilsin
function normPass(s) {
  return String(s).replace(/[İIı]/g, "i").toLowerCase().replace(/\s/g, "");
}

function pcLogin(pass) {
  if (normPass(pass) === PC_LOGIN) {
    ch4.pcLoggedIn = true;
    playSound("success");
    const c = ch4.monitor.material.map.image;
    drawMonitor(c.getContext("2d"), c.width, c.height);
    ch4.monitor.material.map.needsUpdate = true;
    renderPc("Hoş geldin kaptan. 3 okunmamış e-posta var.");
    return true;
  }
  playSound("error");
  const msg = document.getElementById("pcMsg");
  if (msg) msg.innerText = "❌ Hatalı şifre!";
  return false;
}

function pcOpen(app) {
  playSound("click");
  if (app === "mail") {
    renderPc(MAILS.map((m, i) => `<div style="cursor:pointer; padding:4px 0; ${ch4.readMail.has(i) ? "color:#94a3b8" : "font-weight:900"}" onclick="pcMail(${i})">✉️ ${m.from} — ${m.subj}</div>`).join(""));
  } else if (app === "pics") {
    renderPc(`<div style="display:flex; gap:14px; flex-wrap:wrap;">${PICS.map((p, i) => `<div style="text-align:center; cursor:pointer;" onclick="pcPic(${i})"><img src="${p.url()}" width="150" style="border:2px solid #334155; border-radius:6px;"><br>${p.name}</div>`).join("")}</div>`);
  } else if (app === "docs") {
    renderPc(`<div style="cursor:pointer" onclick="pcDoc('rapor')">📄 rapor.txt</div><div style="cursor:pointer" onclick="pcDoc('notlar')">📄 notlar.txt</div>`);
  } else if (app === "trash") {
    renderPc(`<div style="cursor:pointer" onclick="pcDoc('eski')">📄 eski_sifre.txt</div><div style="cursor:pointer" onclick="pcDoc('liste')">📄 alisveris.txt</div>`);
  } else if (app === "zip") {
    if (ch4.zipOpen) {
      renderPc(ZIP_CONTENT);
      return;
    }
    renderPc(`🔒 gizli.zip şifreli.\n\n<input id="zipPass" class="pc-input" placeholder="zip şifresi" onkeydown="if(event.key==='Enter')pcUnzip(this.value)"> <button class="pc-btn" onclick="pcUnzip(document.getElementById('zipPass').value)">Aç</button>\n<span id="zipMsg" style="color:#fca5a5"></span>`);
    setTimeout(() => {
      const i = document.getElementById("zipPass");
      if (i) i.focus();
    }, 50);
  }
}

function pcMail(i) {
  ch4.readMail.add(i);
  const m = MAILS[i];
  renderPc(`<b>Kimden:</b> ${m.from}\n<b>Konu:</b> ${m.subj}\n\n${m.body}\n\n<span style="cursor:pointer; color:#7dd3fc" onclick="pcOpen('mail')">← gelen kutusu</span>`);
}

const DOCS = {
  rapor: "PLATFORM-7 · GİZLİ RAPOR\n\nDenek 7 bütün odaları geçti: şifreli kapılar, karanlık oda, bomba deposu.\nHiçbir denek bu kadar ileri gitmemişti.\n\nUnutmayın: platform denizin ortasında. Kıyı 12 km uzakta.\nTek tekne iskelede ve motoru bozuk bırakıldı.\nDenek 7 KARAYA ULAŞMAMALI.",
  notlar: "Kendime not:\n- İskele kapısının şifresini zip'e koydum.\n- Zip şifresi = köpeğimin adı + tekne numarası.\n- Kaptan yedek kabloları kulübeye bıraktı.",
  eski: "zip şifresi: kedi99\n\n(ESKİ! Değiştirildi, artık çalışmıyor.)",
  liste: "- ekmek\n- köpek maması (Zeytin için)\n- tekne boyası\n- pil"
};

function pcDoc(id) {
  renderPc(DOCS[id]);
}

const ZIP_CONTENT = "📂 gizli.zip\n\n📄 kapi_sifresi.txt\n─────────────────\nİSKELE KAPISI ŞİFRESİ:\n\n        3  6  0  8\n\n(Bu dosyayı okuduktan sonra sil!)";

function pcUnzip(pass) {
  if (normPass(pass) === ZIP_PASS) {
    ch4.zipOpen = true;
    playSound("success");
    renderPc(ZIP_CONTENT);
    updateObjective("BÖLÜM 4 · KONTROL ODASI", "Şifreyi buldun! Kapının sağındaki tuş takımına gir.");
    return true;
  }
  playSound("error");
  const msg = document.getElementById("zipMsg");
  if (msg) msg.innerText = " ❌ Yanlış şifre!";
  return false;
}

function pcPic(i) {
  renderPc(`<img src="${PICS[i].url()}" style="max-width:100%; border-radius:8px;"><br>${PICS[i].name}`);
}

// Resimler (çizilerek üretilir; ipuçları resmin içinde)
const PICS = [
  {
    name: "kopek.png",
    url: memoPic(() => canvasImage(400, 260, (ctx, w, h) => {
      ctx.fillStyle = "#86efac";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#92400e";
      ctx.beginPath();
      ctx.ellipse(200, 170, 110, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(300, 100, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(315, 90, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(260, 140, 70, 12);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(295, 165, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("ZEYTİN", 255, 205);
    }))
  },
  {
    name: "tekne.png",
    url: memoPic(() => canvasImage(400, 260, (ctx, w, h) => {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#0369a1";
      ctx.fillRect(0, 170, w, 90);
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(60, 150);
      ctx.lineTo(340, 150);
      ctx.lineTo(300, 200);
      ctx.lineTo(90, 200);
      ctx.fill();
      ctx.fillStyle = "#1e3a8a";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText("47", 180, 188);
      ctx.fillStyle = "#334155";
      ctx.fillRect(150, 110, 70, 40);
    }))
  },
  {
    name: "platform.png",
    url: memoPic(() => canvasImage(400, 260, (ctx, w, h) => {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#0c4a6e";
      ctx.fillRect(0, 180, w, 80);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(120, 80, 160, 100);
      [140, 200, 260].forEach(x => ctx.fillRect(x, 180, 12, 80));
      ctx.fillStyle = "#facc15";
      ctx.fillRect(190, 60, 20, 20);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "16px sans-serif";
      ctx.fillText("Platform-7, açık deniz", 120, 30);
    }))
  }
];

function memoPic(make) {
  let url = null;
  return () => url || (url = make().toDataURL());
}

// ------------------------------------------------------------------ iskele
function buildDock() {
  const wood = new THREE.MeshPhongMaterial({ map: makeTileTexture("#5b3a1e", "#3f2812"), shininess: 15 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.3, 15.3), wood);
  deck.position.set(0, -0.15, -72.4);
  scene.add(deck);
  // İskele ayakları
  [-4.5, 4.5].forEach(x => [-66, -72, -78].forEach(z => box4(0.4, 3.0, 0.4, 0x3f2812, x, -1.7, z, false)));
  // Korkuluklar (yan + uç). Uçta ortadaki boşluk yalnızca görsel; geçiş [E] ile tekneye binerek
  const rail = (x, z, w, d) => {
    box4(w, 0.08, d, 0x78350f, x, 1.0, z, false);
    box4(w, 0.06, d, 0x78350f, x, 0.55, z, false);
  };
  rail(-4.95, -72.4, 0.08, 15.2);
  rail(4.95, -72.4, 0.08, 15.2);
  rail(-3.0, -79.95, 4.0, 0.08);
  rail(3.0, -79.95, 4.0, 0.08);
  for (let z = -65.2; z >= -80; z -= 2.4) {
    box4(0.1, 1.05, 0.1, 0x78350f, -4.95, 0.52, z, false);
    box4(0.1, 1.05, 0.1, 0x78350f, 4.95, 0.52, z, false);
  }
  addColliderBox(-5.1, 0, -80.0, -4.85, 1.2, -64.85);
  addColliderBox(4.85, 0, -80.0, 5.1, 1.2, -64.85);
  addColliderBox(-5.1, 0, -80.15, 5.1, 1.2, -79.9);

  // Lambalar
  [[4.92, -67.5], [4.92, -77.0]].forEach(([x, z]) => { // direk korkuluğun çarpışma kutusu içinde (X ≥ 4.85): oyuncu değmez
    box4(0.12, 2.6, 0.12, 0x1f2937, x, 1.3, z, false);
    box4(0.3, 0.2, 0.3, 0xfef3c7, x, 2.65, z, false, { emissive: 0xfde68a });
    addLight4(0xfde68a, 0.9, 11, x, 2.5, z, true);
  });

  // Kulübe (X -4.85..-2, Z -68..-72), kapısı doğuda
  const sw =(x, z, w, d, h = 2.4, y = h / 2) => {
    box4(w, h, d, 0x57534e, x, y, z, false);
    addColliderBox(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2);
    wallColliders.push(solidColliders[solidColliders.length - 1]);
  };
  sw(-3.4, -67.95, 2.9, 0.1);
  sw(-3.4, -72.05, 2.9, 0.1);
  sw(-4.8, -70.0, 0.1, 4.0);
  sw(-2.0, -68.7, 0.1, 1.4);
  sw(-2.0, -71.3, 0.1, 1.4);
  sw(-2.0, -70.0, 0.1, 1.2, 0.3, 2.25);
  box4(3.1, 0.12, 4.3, 0x44403c, -3.4, 2.46, -70.0, false);
  addLight4(0xfbbf24, 0.6, 4, -3.4, 2.1, -70.0, true);
  box4(0.45, 1.0, 2.0, 0x78350f, -4.45, 0.5, -70.0, true); // raf
  // Yedek kablolar
  const coil = (color, z, id) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 18).rotateX(Math.PI / 2), new THREE.MeshPhongMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.3) }));
    m.position.set(-4.45, 1.03, z);
    scene.add(m);
    const name = WIRE_COLORS.find(c => c.id === id).name;
    registerInteractable({
      pos: m.position.clone(),
      radius: 2.4,
      getPrompt: () => (ch4.bag.has(id) ? "" : `🔌 [E] Yedek ${name} Kablo Al`),
      action: () => {
        ch4.bag.add(id);
        m.visible = false;
        handTriggerReach();
        playSound("success");
        showToast(`YEDEK ${name.toUpperCase()} KABLO ALINDI! (${["kirmizi", "mavi", "sari"].filter(c => ch4.bag.has(c)).length}/3)`);
      }
    });
  };
  coil(0xef4444, -69.4, "kirmizi");
  coil(0x3b82f6, -70.0, "mavi");
  coil(0xfacc15, -70.6, "sari");
  box4(0.5, 0.3, 0.3, 0xb91c1c, -2.6, 0.15, -71.5, true); // alet çantası
}

// ------------------------------------------------------------------ tekne
function buildBoat() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshPhongMaterial({ color: 0xf1f5f9, shininess: 60 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 4.4), hullMat);
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.2, 1.6, 4, 1).rotateX(-Math.PI / 2).rotateZ(Math.PI / 4), hullMat);
  bow.scale.set(1, 0.53, 1);
  bow.position.set(0, 0, -3.0);
  g.add(bow);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.15, 4.42), new THREE.MeshPhongMaterial({ color: 0x1d4ed8 }));
  stripe.position.y = 0.2;
  g.add(stripe);
  const number = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvasImage(128, 64, (ctx) => {
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = "#1e3a8a";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("47", 34, 50);
  })) }));
  number.rotation.y = -Math.PI / 2;
  number.position.set(-1.215, 0.05, -1.0);
  g.add(number);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.6), new THREE.MeshPhongMaterial({ color: 0x334155 }));
  dash.position.set(0, 0.85, -0.6);
  g.add(dash);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), new THREE.MeshPhongMaterial({ color: 0x111827 }));
  wheel.position.set(0, 1.35, -0.25);
  wheel.rotation.x = -0.5;
  g.add(wheel);
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.5), new THREE.MeshPhongMaterial({ color: 0x1f2937 }));
  engine.position.set(0, 0.7, 2.35);
  g.add(engine);
  // Motordaki 3 yanık kablo (değiştirilince renklenir)
  ch4.burnt = {};
  ["kirmizi", "mavi", "sari"].forEach((id, i) => {
    const c = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), new THREE.MeshPhongMaterial({ color: 0x1c1917 }));
    c.position.set(-0.18 + i * 0.18, 0.95, 2.08);
    g.add(c);
    ch4.burnt[id] = c;
  });
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0x111827 }));
  light.position.set(0, 1.3, -0.95);
  g.add(light);
  ch4.boatLamp = light;
  g.position.set(BOAT_START.x, -1.0, BOAT_START.z);
  scene.add(g);
  ch4.boat = { mesh: g, x: BOAT_START.x, z: BOAT_START.z, h: 0, v: 0, damage: 0, hitT: 0, t: 0 };

  registerInteractable({
    pos: new THREE.Vector3(0, -0.2, -80.6),
    radius: 3.0,
    getPrompt: enginePrompt,
    action: useEngine
  });
  registerInteractable({
    pos: new THREE.Vector3(0, -0.2, -81.6), // iskele ucundan (Z -79.6) erişilebilir
    radius: 3.2,
    getPrompt: () => (ch4.started && !ch4.boatMode ? "🚤 [E] Tekneye Bin" : ""),
    action: boardBoat
  });
}

function enginePrompt() {
  if (ch4.boatMode) return "";
  const left = ["kirmizi", "mavi", "sari"].filter(id => !ch4.replaced[id]);
  if (left.length) return `🔧 [E] Motor: yanık kablo (${3 - left.length}/3 değişti)`;
  if (!ch4.wired) return "⚡ [E] Motor Bağlantı Paneli";
  if (!ch4.started) return "🔑 [E] Motoru Çalıştır";
  return "";
}

function useEngine() {
  handTriggerReach();
  const left = ["kirmizi", "mavi", "sari"].filter(id => !ch4.replaced[id]);
  if (left.length) {
    const id = left[0];
    const c = WIRE_COLORS.find(w => w.id === id);
    if (!ch4.bag.has(id)) {
      showToast(`Yanık ${c.name.toUpperCase()} kablo! Yedeği kulübede olmalı.`);
      playSound("error");
      return;
    }
    ch4.replaced[id] = true;
    ch4.burnt[id].material.color.set(c.hex);
    playSound("click");
    showToast(`Yanık ${c.name.toLowerCase()} kablo yenisiyle değiştirildi (${4 - left.length}/3)`);
    if (left.length === 1) updateObjective("BÖLÜM 4 · TAMİR", "Kablolar yenilendi. Şimdi motor panelinde doğru uçlara bağla. (İpucu: e-posta!)");
    return;
  }
  if (!ch4.wired) {
    openWires();
    return;
  }
  if (!ch4.started) {
    ch4.started = true;
    ch4.boatLamp.material.color.setHex(0x22c55e);
    playSound("power");
    showToast("MOTOR ÇALIŞTI! 🚤 Tekneye bin ve karaya git!", 5000);
    updateObjective("BÖLÜM 4 · KAÇIŞ", "Tekneye bin [E]. Fırtınada kayalara çarpmadan deniz fenerine git!");
  }
}

// ------------------------------------------------------------------ kablo bağlama paneli
function openWires() {
  ch4.wirePick = null;
  document.getElementById("wireOverlay").style.display = "flex";
  document.exitPointerLock();
  uiKeyHandler = e => {
    if (e.code === "Escape") closeWires();
    return true;
  };
  renderWires();
}

function closeWires() {
  document.getElementById("wireOverlay").style.display = "none";
  uiKeyHandler = null;
  lockPointer();
}

function renderWires() {
  const L = document.getElementById("wireLeft");
  const R = document.getElementById("wireRight");
  L.innerHTML = WIRE_COLORS.map((c, i) => `<button class="wire-end${ch4.wirePick === i ? " picked" : ""}" style="background:${c.hex}; ${ch4.wireDone.has(c.symbol) ? "opacity:.5" : ""}" onclick="wirePickLeft(${i})"></button>`).join("");
  R.innerHTML = RIGHT_ORDER.map(s => `<button class="wire-end" onclick="wireConnect(${ch4.wirePick === null ? -1 : ch4.wirePick}, '${s}')">${s}</button>`).join("");
  const svg = document.getElementById("wireSvg");
  const lb = L.getBoundingClientRect(), rb = R.getBoundingClientRect(), sb = svg.getBoundingClientRect();
  let lines = "";
  WIRE_COLORS.forEach((c, i) => {
    if (!ch4.wireDone.has(c.symbol)) return;
    const y1 = lb.top - sb.top + (lb.height / 4) * (i + 0.5);
    const y2 = rb.top - sb.top + (rb.height / 4) * (RIGHT_ORDER.indexOf(c.symbol) + 0.5);
    lines += `<line x1="${lb.right - sb.left}" y1="${y1}" x2="${rb.left - sb.left}" y2="${y2}" stroke="${c.hex}" stroke-width="6" stroke-linecap="round"/>`;
  });
  svg.innerHTML = lines;
  document.getElementById("wireStatus").innerText = `Bağlı: ${ch4.wireDone.size}/4 · Kıvılcım: ${ch4.wireMistakes}/3`;
}

function wirePickLeft(i) {
  if (ch4.wireDone.has(WIRE_COLORS[i].symbol)) return;
  ch4.wirePick = i;
  playSound("click");
  renderWires();
}

function wireConnect(i, symbol) {
  if (i < 0 || i === null) {
    document.getElementById("wireStatus").innerText = "Önce soldan bir kablo seç!";
    return false;
  }
  const c = WIRE_COLORS[i];
  ch4.wirePick = null;
  if (c.symbol !== symbol) {
    ch4.wireMistakes++;
    playSound("error");
    const flash = document.getElementById("flashOverlay");
    flash.style.transition = "none";
    flash.style.opacity = "0.5";
    setTimeout(() => {
      flash.style.transition = "opacity 0.4s";
      flash.style.opacity = "0";
    }, 60);
    if (ch4.wireMistakes >= 3) {
      ch4.wireMistakes = 0;
      ch4.wireDone.clear();
      showToast("⚡ KISA DEVRE! Bütün bağlantılar koptu. E-postadaki eşleşmeye bak!", 4500);
    } else {
      showToast("⚡ KIVILCIM! Yanlış uç.");
    }
    renderWires();
    return false;
  }
  ch4.wireDone.add(symbol);
  playSound("click");
  renderWires();
  if (ch4.wireDone.size === 4) {
    ch4.wired = true;
    playSound("success");
    showToast("BAĞLANTILAR TAMAM! Motoru çalıştırabilirsin.");
    setTimeout(closeWires, 700);
  }
  return true;
}

// ------------------------------------------------------------------ deniz
function buildSea() {
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900, 90, 90),
    new THREE.MeshPhongMaterial({ color: 0x0c4a6e, shininess: 90, specular: 0x7dd3fc, flatShading: true })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.2, -300);
  scene.add(water);
  ch4.water = water;
  ch4.waterBase = water.geometry.attributes.position.array.slice();

  const rockMat = new THREE.MeshPhongMaterial({ color: 0x292524, flatShading: true });
  ch4.rocks = ROCKS.map(([x, z, r]) => {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
    m.position.set(x, -0.6, z);
    m.rotation.set(x, z, 0);
    m.scale.y = 0.8;
    scene.add(m);
    return { x, z, r, m };
  });
  // Rotayı işaretleyen şamandıralar
  SEA_ROUTE.slice(1, -1).forEach(([x, z], i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.9, 10), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22c55e : 0xef4444 }));
    b.position.set(x + (i % 2 ? 3.5 : -3.5), -0.8, z);
    scene.add(b);
  });

  // Kıyı: kumsal, tepeler, deniz feneri (sisin içinden görünür)
  box4(200, 1.0, 50, 0xd6b48a, 0, -1.0, -348, false);
  box4(200, 10, 30, 0x14532d, 0, 3, -385, false);
  const tower = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(1.3 - i * 0.1, 1.4 - i * 0.1, 2.4, 16), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xdc2626 : 0xf8fafc, fog: false }));
    s.position.y = 1.2 + i * 2.4;
    tower.add(s);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.0, 14, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false }));
  lamp.position.y = 15.4;
  tower.add(lamp);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 4, 60, 12, 1, true).rotateZ(Math.PI / 2).translate(30, 0, 0), new THREE.MeshBasicMaterial({ color: 0xfef9c3, transparent: true, opacity: 0.18, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 15.4;
  tower.add(beam);
  tower.position.set(14, -0.5, -338);
  scene.add(tower);
  ch4.beam = beam;

  // Ay ışığı ve yağmur
  const moon = new THREE.DirectionalLight(0x93c5fd, 0.45);
  moon.position.set(-30, 50, -100);
  moon.visible = false;
  scene.add(moon);
  ch4.outdoorLights.push(moon);
  const n = 1400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = Math.random() * 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  ch4.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfdbfe, size: 0.07, transparent: true, opacity: 0.7 }));
  ch4.rain.visible = false;
  scene.add(ch4.rain);
}

function boardBoat() {
  ch4.boatMode = true;
  player.frozen = true;
  if (player.crouch) {
    player.crouch = false;
    updateCrouchHud();
  }
  player.yaw = ch4.boat.h;
  player.pitch = -0.05;
  document.getElementById("boatHud").style.display = "block";
  playSound("drawer");
  startEngineHum();
  showToast("Tekneye bindin! W gaz, A/D dümen. Fenere doğru git!", 5000);
}

function startEngineHum() {
  if (!audioCtx || ch4.hum) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 40;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  ch4.hum = { osc, gain };
}

function stopEngineHum() {
  if (!ch4.hum) return;
  ch4.hum.osc.stop();
  ch4.hum = null;
}

function updateBoat(dt) {
  const b = ch4.boat;
  b.t += dt;
  if (ch4.boatMode && !ch4.ended && !b.sunk) {
    if (keys.KeyW) b.v = Math.min(13, b.v + 5 * dt);
    else if (keys.KeyS) b.v = Math.max(-4, b.v - 6 * dt);
    else b.v *= 1 - 0.35 * dt;
    const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
    // 1.6 rad/s: tam gazda dönüş yarıçapı ~8m (1.2'de 11m'ydi, kayalar arası kıvrımlarda savruluyordu)
    const dh = steer * dt * 1.6 * Math.min(1, 0.35 + Math.abs(b.v) / 6);
    b.h += dh;
    player.yaw += dh; // bakış tekneyle döner
    b.x += -Math.sin(b.h) * b.v * dt;
    b.z += -Math.cos(b.h) * b.v * dt;
    b.z = Math.min(b.z, BOAT_START.z); // iskeleye geri çarpmasın
    if (Math.abs(b.x) > 70) {
      b.x = Math.sign(b.x) * 70;
      showToast("Açık denizde kaybolursun! Fenere doğru dön.", 2500);
    }
    b.hitT -= dt;
    ch4.rocks.forEach(r => {
      const d = Math.hypot(b.x - r.x, b.z - r.z);
      if (d < r.r + 1.3 && b.hitT <= 0) crashBoat(r, d);
    });
    if (ch4.hum) ch4.hum.osc.frequency.value = 40 + Math.abs(b.v) * 6;
    if (b.z < SHORE_Z) reachShore();
    document.getElementById("boatSpeed").innerText = `${Math.round(Math.abs(b.v) * 3.6)} km/s`;
    const dmg = Math.min(3, b.damage);
    document.getElementById("boatHull").innerText = "❤️".repeat(3 - dmg) + "🖤".repeat(dmg);
    document.getElementById("boatDist").innerText = `Kıyıya: ${Math.max(0, Math.round(b.z - SHORE_Z))} m`;
  }
  const bob = Math.sin(b.t * 1.4) * 0.12;
  b.mesh.position.set(b.x, -1.0 + bob, b.z);
  b.mesh.rotation.set(Math.sin(b.t * 1.1) * 0.04, b.h, Math.sin(b.t * 0.9) * 0.05);
  if (ch4.boatMode) {
    // Kamera: dümenin arkasında, tekneyle birlikte
    player.pos.set(b.x + Math.sin(b.h) * 0.4, 1.7, b.z + Math.cos(b.h) * 0.4);
    camera.position.set(player.pos.x, -1.0 + bob + 1.7, player.pos.z);
  }
}

function crashBoat(r, d) {
  const b = ch4.boat;
  b.hitT = 1.2;
  b.damage++;
  (ch4.crashLog = ch4.crashLog || []).push([r.x, r.z, Math.round(b.x), Math.round(b.z)]);
  const nx = (b.x - r.x) / (d || 1), nz = (b.z - r.z) / (d || 1);
  b.x = r.x + nx * (r.r + 1.4);
  b.z = r.z + nz * (r.r + 1.4);
  b.v = -3;
  ch3.shake = 0.8;
  playSound("slam");
  if (b.damage >= 3) {
    b.sunk = true; // "tekrar dene"ye kadar tekne kımıldamaz, hasar daha artmaz
    b.v = 0;
    ch4.deaths++;
    stopEngineHum();
    showDeath("TEKNE BATTI!", "Kayalara üç kez çarptın. Şamandıraların arasından, dikkatli geç!", resetBoat);
  } else {
    showToast(`💥 KAYAYA ÇARPTIN! Tekne hasar aldı (${b.damage}/3)`, 3000);
  }
}

function resetBoat() {
  const b = ch4.boat;
  b.x = BOAT_START.x;
  b.z = BOAT_START.z;
  b.h = 0;
  b.v = 0;
  b.damage = 0;
  b.hitT = 0;
  b.sunk = false;
  player.yaw = 0;
  player.pitch = -0.05;
  startEngineHum();
}

function reachShore() {
  ch4.ended = true;
  stopEngineHum();
  playSound("success");
  const sec = Math.round((performance.now() - ch4.startTime) / 1000);
  document.getElementById("endStats").innerText = `Bölüm 4 süresi: ${Math.floor(sec / 60)} dk ${sec % 60} sn · Tekne batması: ${ch4.deaths}`;
  document.getElementById("endOverlay").style.display = "flex";
  document.getElementById("boatHud").style.display = "none";
  document.exitPointerLock();
  uiKeyHandler = () => true;
}

// ------------------------------------------------------------------ her kare
function updateChapter4(dt) {
  const inside = player.pos.z < -54.0;
  const outdoors = ch4.boatMode || player.pos.z < -64.85;
  ch4.lights.forEach(l => (l.visible = inside && !outdoors));
  ch4.outdoorLights.forEach(l => (l.visible = outdoors));
  ch4.rain.visible = outdoors;
  if (!inside) return;

  if (!ch4.entered) {
    ch4.entered = true;
    ch4.startTime = performance.now();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.03);
    document.getElementById("matsHud").style.display = "none";
    showToast("Bir kontrol odası... Bilgisayar hâlâ açık.", 4500);
    updateObjective("BÖLÜM 4 · KONTROL ODASI", "Bilgisayarı araştır, iskele kapısının şifresini bul. (Giriş şifresi odada bir yerde...)");
  }
  if (outdoors && !ch4.outdoors) {
    ch4.outdoors = true;
    camera.far = 600; // içeride 80m yetiyordu; fener ve kayalar yüzlerce metre ötede
    camera.updateProjectionMatrix();
    scene.background = new THREE.Color(0x1e293b);
    scene.fog = new THREE.FogExp2(0x1e293b, 0.0062);
    playSound("whisper");
    showToast("Denizin ortasındasın! Burası bir platform... Tek kaçış: tekne.", 5000);
    updateObjective("BÖLÜM 4 · İSKELE", "Teknenin motoru yanmış. Kulübeden yedek kabloları al, motoru tamir et.");
  }
  document.getElementById("matsHud").style.display = "none";
  ambientLight.intensity += ((outdoors ? 0.38 : 0.22) - ambientLight.intensity) * Math.min(1, dt * 2);

  // Sunucu ışıkları yanıp söner, monitör titrer
  ch4.leds.forEach(l => {
    if (Math.random() < dt * 3) l.visible = !l.visible;
  });

  if (outdoors) {
    // Dalgalar (düz gölgeli yüzey: normal hesaplamaya gerek yok)
    const t = performance.now() / 1000;
    const p = ch4.water.geometry.attributes.position;
    const base = ch4.waterBase;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      p.array[i * 3 + 2] = Math.sin(x * 0.08 + t * 1.3) * 0.35 + Math.cos(y * 0.11 + t * 1.1) * 0.3;
    }
    p.needsUpdate = true;
    // Yağmur kameranın çevresinde düşer
    const r = ch4.rain.geometry.attributes.position;
    for (let i = 0; i < r.count; i++) {
      r.array[i * 3 + 1] -= dt * 18;
      if (r.array[i * 3 + 1] < -2) r.array[i * 3 + 1] += 20;
    }
    r.needsUpdate = true;
    ch4.rain.position.set(camera.position.x, camera.position.y - 6, camera.position.z);
    // Şimşek
    ch4.lightningT -= dt;
    if (ch4.lightningT <= 0) {
      ch4.lightningT = 5 + Math.random() * 7;
      ambientLight.intensity = 2.2;
      setTimeout(() => playNoise(2.2, 0.45, 180), 300 + Math.random() * 700);
    }
    ch4.beam.rotation.y += dt * 0.8;
  }

  updateBoat(dt);
}
