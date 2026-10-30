// KAYIP ODALAR — 3D Kaçış & Macera (Gelişmiş Çift Kanatlı Kapılar, Kusursuz Hitbox & Sıfır Takılma)

let scene, camera, renderer, clock;
let isLocked = false;
let gameStarted = false;

// Oyuncu Durumu & Envanter
const player = {
  pos: new THREE.Vector3(0, 1.7, 4.0),
  yaw: 0, // Karşıya (negatif Z yönündeki ilk kapıya) doğrudan bakış
  pitch: 0,
  hasKey: false,
  hasCables: false,
  cablesReplaced: false,
  systemRebooted: false,
  leverPulled: false,
  radius: 0.28, // İdeal çevik FPS oyuncu yarıçapı
  crouch: false, // [C] ile eğilme (masanın altına girmek için)
  eye: 1.7,
  hasFlashlight: true,
  flashOn: true,
  battery: 100
};

const EYE_STAND = 1.7;
const EYE_CROUCH = 0.8;
const BODY_TOP_STAND = 2.0;
const BODY_TOP_CROUCH = 0.95;

let ignoreMouseFrames = 0;

// Bölüm dosyaları (bolum2.js, bolum3.js) dünyayı buraya kaydeder; init sırayla kurar.
// updateHooks her karede (oyun kilitliyken) dt ile çağrılır.
const chapterBuilders = [];
const updateHooks = [];
const doors = [];
const roomLights = [];
let ambientLight, flashLight;
// Oyunun henüz yazılmamış kısmı: son bölüm bu sınırı ve mesajı kendi çıkışına göre ayarlar
let isNotCoded = p => false;
let notCodedMessage = "🚫 BURASI DAHA KODLANMADI! Tebrikler, şu ana kadarki tüm bölümleri başarıyla bitirdin!";
// Açık bir bölüm penceresi (kitapçık, bomba masası, ölüm ekranı) tuşları kendisi işler
let uiKeyHandler = null;
// Bölümlerin kendi tuşları (ör. [M] harita); oyun tuşlarından sonra sırayla çağrılır
const keyHooks = [];

// ADMIN MODU (Hakan'ın isteği): AltGr basılıyken önce Ctrl, sonra 7 → aç/kapat.
// Açıkken kapılar ve şifreli kilitler tek tıkla açılır, fener pili bitmez, bomba tek tıkla yapılır.
// Windows'ta AltGr kendisi de sahte bir Ctrl gönderir ama AltGr'den ÖNCE geldiği için sayılmaz.
let adminMode = false;
let altGrHeld = false;
let adminArmed = false;

function handleAdminCombo(e) {
  if (e.code === "AltRight") {
    altGrHeld = true;
    adminArmed = false;
    return false;
  }
  const altGr = altGrHeld || (e.getModifierState && e.getModifierState("AltGraph"));
  if (!altGr) {
    adminArmed = false;
    return false;
  }
  if (e.code === "ControlLeft" || e.code === "ControlRight") {
    adminArmed = true;
    return false;
  }
  if (e.code === "Digit7" && adminArmed) {
    adminArmed = false;
    e.preventDefault();
    toggleAdmin();
    return true;
  }
  return false;
}

function toggleAdmin() {
  adminMode = !adminMode;
  document.getElementById("adminBadge").style.display = adminMode ? "block" : "none";
  playSound(adminMode ? "power" : "click");
  showToast(adminMode
    ? "🛠️ ADMIN MODU AÇIK: kapılar tek tıkla açılır, fener sonsuz, bomba tek tıkla!"
    : "Admin modu kapandı.", 4500);
}

// Ölüm ekranı: başlık, açıklama ve "tekrar dene" davranışını ölümün sebebi belirler
function showDeath(title, text, onRetry) {
  document.getElementById("deathTitle").innerText = title;
  document.getElementById("deathText").innerText = text;
  document.getElementById("deathOverlay").style.display = "flex";
  window.deathRetry = () => {
    document.getElementById("deathOverlay").style.display = "none";
    uiKeyHandler = null;
    onRetry();
    lockPointer();
  };
  uiKeyHandler = e => {
    if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") window.deathRetry();
    return true;
  };
  document.exitPointerLock();
}

const keys = {};
let interactRequested = false;

// 3D Blender Modelleri ve Animasyon Referansları
let handGroup, handMesh;
let handReachAnim = 0;
let handWalkBob = 0;

// Odalar ve Çift Kanatlı Kapılar
let door1, door2, door3, doorFinal;
let deskDrawer;
let drawerOpen = false;
let brassKeyMesh, keyLight;
let cableBoxDrawer, cableDrawerOpen = false;

// Tuş Takımı Durumu
let keypadCode = "";
const TARGET_CODE = "7429";
let isKeypadOpen = false;
let isNoteOpen = false;

// Güç Odası
let rustyCables = [];
let powerLeverMesh;
let panelLamp1, panelLamp2;

// Katı Duvar & Mobilya Hitbox Çarpışma Kutuları (AABB)
const solidColliders = [];
// Sadece duvarlar: etkileşimin duvar arkasından yapılmasını engelleyen görüş testi için
const wallColliders = [];
// Hareket eden nesneler (açık çekmeceler): kutuları her testte yeniden hesaplanır
const movingColliderMeshes = [];

// Çekmece konumları (X ekseninde kayarlar; kapalıyken masanın içinde durur)
const DESK_DRAWER_X = { closed: -2.15, open: -1.7 };
const CABLE_DRAWER_X = { closed: 2.35, open: 1.9 };

// Etkileşimli Nesneler Listesi (Raycaster + Mesafe)
const interactables = [];

// Ses Sentezleyici
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
}

function playSound(type) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "door") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.4);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === "drawer") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "click") {
      osc.type = "square";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.12);
      osc.frequency.setValueAtTime(783, now + 0.24);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.setValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "power") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(70, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.85);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
      osc.start(now);
      osc.stop(now + 0.9);
    } else if (type === "tick") {
      osc.type = "square";
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "slam") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      playNoise(0.35, 0.4, 600);
    } else if (type === "explosion") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 1.5);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.6);
      osc.start(now);
      osc.stop(now + 1.6);
      playNoise(1.8, 0.9, 900);
    } else if (type === "whisper") {
      osc.disconnect();
      playNoise(1.2, 0.18, 2600);
    } else if (type === "heartbeat") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(55, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "growl") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(70, now);
      osc.frequency.linearRampToValueAtTime(48, now + 1.0);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);
      osc.start(now);
      osc.stop(now + 1.1);
      playNoise(1.0, 0.2, 400);
    } else if (type === "scream") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.9);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      osc.start(now);
      osc.stop(now + 1.0);
      playNoise(1.0, 0.6, 3000);
    } else if (type === "step") {
      osc.disconnect();
      playNoise(0.12, 0.25, 220);
    } else if (type === "cough") {
      osc.disconnect();
      playNoise(0.25, 0.3, 1200);
    } else if (type === "alarm") {
      osc.type = "square";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.25);
      osc.frequency.setValueAtTime(880, now + 0.5);
      osc.frequency.setValueAtTime(660, now + 0.75);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      osc.start(now);
      osc.stop(now + 1.0);
    }
  } catch (e) {}
}

// Hışırtı/patlama için filtrelenmiş beyaz gürültü
function playNoise(duration, volume, cutoff) {
  if (!audioCtx) return;
  const len = Math.floor(audioCtx.sampleRate * duration);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

let toastTimer = null;
function showToast(msg, duration = 3800) {
  const t = document.getElementById("toastBox");
  t.innerText = msg;
  t.style.display = "block";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.display = "none";
  }, duration);
}

function updateObjective(title, text) {
  document.getElementById("objTitle").innerText = title;
  document.getElementById("objText").innerText = text;
}

// Blender modelleri ~1m'lik ham ölçülerle dışa aktarıldı; sahnede istenen boyuta (size veya
// yedek geometrinin kutusu) oturtulmazsa masaların, duvarların içine taşıyorlar.
function getBlenderGeo(name, fallback, size, uniform) {
  if (window.BLENDER_MODELS && window.BLENDER_MODELS[name]) {
    try {
      const data = window.BLENDER_MODELS[name];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(data.normals, 3));
      fallback.computeBoundingBox();
      fitGeometry(geo, size || fallback.boundingBox.getSize(new THREE.Vector3()).toArray(), uniform);
      return geo;
    } catch (e) {}
  }
  return fallback;
}

function fitGeometry(geo, size, uniform) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  const center = box.getCenter(new THREE.Vector3());
  const ext = box.getSize(new THREE.Vector3());
  let s = [size[0] / ext.x, size[1] / ext.y, size[2] / ext.z];
  if (uniform) {
    const m = Math.min(...s);
    s = [m, m, m];
  }
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, (pos.getX(i) - center.x) * s[0], (pos.getY(i) - center.y) * s[1], (pos.getZ(i) - center.z) * s[2]);
    n.set(nor.getX(i) / s[0], nor.getY(i) / s[1], nor.getZ(i) / s[2]).normalize();
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

// ============================================================================
// OYUN DÜNYASININ KURULUMU
// ============================================================================
function init() {
  const canvas = document.getElementById("gameCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070e1c);
  scene.fog = new THREE.FogExp2(0x0a1428, 0.032);

  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(player.pos.x, player.pos.y, player.pos.z);
  camera.rotation.order = "YXZ";
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  clock = new THREE.Clock();

  // Ortam Işıkları
  ambientLight = new THREE.AmbientLight(0x475569, 0.85);
  scene.add(ambientLight);

  // Oyuncunun el feneri ışığı
  flashLight = new THREE.SpotLight(0xf8fafc, 2.4, 18, Math.PI / 4, 0.35, 1.2);
  camera.add(flashLight);
  camera.add(flashLight.target);
  flashLight.position.set(0.2, -0.1, 0);
  flashLight.target.position.set(0, 0, -4);
  scene.add(camera);

  buildPlayerHand();
  buildCompleteEnvironment();
  chapterBuilders.forEach(build => build());
  scene.traverse(o => {
    if (o.isLight) o.layers.enableAll(); // el (katman 1) de aydınlansın
  });
  setupControls();

  window.addEventListener("resize", onWindowResize);
  animate();
}

// 1. BLENDER 3D OYUNCU ELİ
function buildPlayerHand() {
  handGroup = new THREE.Group();
  camera.add(handGroup);

  const handGeo = getBlenderGeo("fps_hand", new THREE.BoxGeometry(0.25, 0.3, 0.6), null, true);
  const handMat = new THREE.MeshPhongMaterial({
    color: 0xd4a373,
    shininess: 40,
    specular: 0x443322
  });

  handMesh = new THREE.Mesh(handGeo, handMat);
  handMesh.layers.set(1); // renderFrame eli ayrı geçişte en öne çizer
  handMesh.position.set(0.32, -0.32, -0.55);
  handMesh.rotation.set(0.2, -0.15, 0.1);
  handGroup.add(handMesh);
}

// 2. KATI DUVAR VE ÇARPIŞMA EKLEME FONKSİYONU
function addSolidBlock(x, y, z, w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  solidColliders.push(new THREE.Box3(
    new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
    new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
  ));
  return mesh;
}

function addWall(x, y, z, w, h, d, mat) {
  const mesh = addSolidBlock(x, y, z, w, h, d, mat);
  wallColliders.push(solidColliders[solidColliders.length - 1]);
  return mesh;
}

function addColliderBox(minX, minY, minZ, maxX, maxY, maxZ) {
  solidColliders.push(new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ)));
}

// DOKU ÜRETECİ (Gerçekçi Parke & Duvar Dokuları)
function makeTileTexture(color1, color2) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = color2;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

// 3. ÇİFT KANATLI GENİŞ KAPI YAPISI (2.4m Tam Açıklık, Duvara Katlanan Menteşeler)
// onUse verilirse kapının [E] davranışını o belirler (yeni bölümlerin kapıları)
function createDoubleDoor(x, z, type, promptText, onUse) {
  const doorWidth = 2.4;
  const leafW = doorWidth / 2; // 1.2m her bir kanat
  const leafH = 3.0;
  const leafD = 0.12;

  // Sol Kanat Grubu & Menteşesi (x - 1.2 noktasında)
  const pivotL = new THREE.Group();
  pivotL.position.set(x - leafW, 0, z);

  const slabMat = new THREE.MeshPhongMaterial({
    color: type === "keypad" || type === "final" ? 0x334155 : 0x78350f,
    shininess: 40
  });

  const slabL = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, leafD), slabMat);
  slabL.position.set(leafW / 2, leafH / 2, 0);
  pivotL.add(slabL);

  const handleMat = new THREE.MeshPhongMaterial({ color: 0xf59e0b, shininess: 120 });
  const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28), handleMat);
  handleL.position.set(leafW - 0.1, 1.4, 0.1);
  pivotL.add(handleL);
  scene.add(pivotL);

  // Sağ Kanat Grubu & Menteşesi (x + 1.2 noktasında)
  const pivotR = new THREE.Group();
  pivotR.position.set(x + leafW, 0, z);

  const slabR = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, leafD), slabMat);
  slabR.position.set(-leafW / 2, leafH / 2, 0);
  pivotR.add(slabR);

  const handleR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28), handleMat);
  handleR.position.set(-leafW + 0.1, 1.4, 0.1);
  pivotR.add(handleR);
  scene.add(pivotR);

  // Açık kanatlar menteşeden +Z yönüne katlanır; açıkken içlerinden geçilmesin diye katı kutu
  const leafBox = hx => new THREE.Box3(
    new THREE.Vector3(hx - leafD / 2, 0, z),
    new THREE.Vector3(hx + leafD / 2, leafH, z + leafW)
  );

  const doorObj = {
    pivotL,
    pivotR,
    isOpen: false,
    type,
    x,
    z,
    leafColliders: [leafBox(x - leafW), leafBox(x + leafW)],
    promptText
  };
  doors.push(doorObj);

  registerInteractable({
    pos: new THREE.Vector3(x, 1.5, z),
    radius: 3.5,
    getPrompt: () => (doorObj.isOpen ? "Kapı Açık ✅" : doorObj.promptText),
    action: () => {
      handTriggerReach();
      if (adminMode && !doorObj.isOpen) {
        doorObj.isOpen = true;
        playSound("door");
        showToast("🛠️ Admin: kapı açıldı");
      } else if (onUse) {
        onUse(doorObj);
      } else if (type === "normal") {
        if (!doorObj.isOpen) {
          doorObj.isOpen = true;
          playSound("door");
          showToast("İlk kapı açıldı. Dağınık odaya girdin.");
          updateObjective("GÖREV 2", "Dağınık odadaki çekmeceleri [E] ile açarak 4 haneli şifreli notu bul.");
        }
      } else if (type === "keypad") {
        if (!doorObj.isOpen) {
          showToast("Kapı kilitli! Sağ duvardaki tuş takımına şifreyi gir.");
          playSound("error");
        }
      } else if (type === "key_locked") {
        if (player.hasKey) {
          if (!doorObj.isOpen) {
            doorObj.isOpen = true;
            playSound("door");
            showToast("Altın anahtarla Güç Odası açıldı!");
            updateObjective("GÖREV 4", "Güç odasındaki çekmeceden sağlam kabloları bul ve paslanmış kabloları yenile.");
          }
        } else {
          showToast("Bu kapı kilitli! Masadaki Altın Anahtar gerekiyor.");
          playSound("error");
        }
      } else if (type === "final") {
        if (!doorObj.isOpen) {
          showToast(player.leverPulled ? "Kapı arkandan kilitlendi! Geri dönüş yok..." : "Kapı kilitli! Güç şalterini indirmelisin.");
          playSound("error");
        }
      }
    }
  });

  return doorObj;
}

// 4. TÜM ODALAR, DUVARLAR VE MOBİLYALARIN İNŞASI
function buildCompleteEnvironment() {
  const floorTex = makeTileTexture("#0f172a", "#1e293b");
  const wallTex = makeTileTexture("#1e293b", "#334155");

  const wallMat = new THREE.MeshPhongMaterial({ map: wallTex, shininess: 40 });
  const floorMat = new THREE.MeshPhongMaterial({ map: floorTex, shininess: 30 });
  const ceilingMat = new THREE.MeshPhongMaterial({ color: 0x090d16, shininess: 15 });
  const woodMat = new THREE.MeshPhongMaterial({ color: 0x92400e, shininess: 35 });
  const metalMat = new THREE.MeshPhongMaterial({ color: 0x475569, shininess: 85 });

  const H = 4.0; // Tavan yüksekliği

  // ZEMİN & TAVAN: Bölüm 1 + Bölüm 2 karanlık odası (Z: +6.0'dan -26.5'e kadar yekpare)
  const fullFloor = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 32.5), floorMat);
  fullFloor.position.set(0, -0.15, -10.25);
  scene.add(fullFloor);

  const fullCeiling = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.3, 32.5), ceilingMat);
  fullCeiling.position.set(0, H + 0.15, -10.25);
  scene.add(fullCeiling);

  // DIŞ ÇEVRELEYEN SAĞLAM KALIN DUVARLAR (X: -4.0 ile +4.0, sıfır kaçak)
  // Yan duvarlar Z = 5.3'ten karanlık odanın sonu Z = -26.5'e kadar; bitiş duvarı bolum2.js'te (kapılı)
  // Sol Duvar (X = -4.15)
  addWall(-4.15, H / 2, -10.6, 0.3, H, 31.8, wallMat);
  // Sağ Duvar (X = 4.15)
  addWall(4.15, H / 2, -10.6, 0.3, H, 31.8, wallMat);
  // Arka Başlangıç Duvarı (Z = 5.15)
  addWall(0, H / 2, 5.15, 8.6, H, 0.3, wallMat);

  // ARA BÖLME DUVARLAR (4 AYRI ODA, 4 SAĞLAM BÖLME DUVARI)
  // 1. Z = 2.0 (Başlangıç ile Dağınık Oda arası)
  // 2. Z = -5.5 (Dağınık Oda ile Güvenlik Odası arası)
  // 3. Z = -11.0 (Güvenlik Odası ile Güç Odası arası - KESİNTİSİZ SAĞLAM!)
  // 4. Z = -16.5 (Güç Odası ile Son Bölge arası)
  // Kapı açıklığı: 2.4m (-1.2 ile +1.2 arası).
  // Sol duvar: -4.0'dan -1.2'ye (genişlik 2.8m, merkez -2.6).
  // Sağ duvar: +1.2'den +4.0'a (genişlik 2.8m, merkez +2.6).
  // Üst kiriş: 3.0m'den 4.0m'ye (yükseklik 1.0m, merkez Y = 3.5).
  const zWalls = [2.0, -5.5, -11.0, -16.5];
  zWalls.forEach(zw => {
    addWall(-2.6, H / 2, zw, 2.8, H, 0.35, wallMat);
    addWall(2.6, H / 2, zw, 2.8, H, 0.35, wallMat);
    addWall(0, 3.5, zw, 2.4, 1.0, 0.35, wallMat);
  });

  // ODALARA ATMOSFERİK TAVAN LAMBALARI
  const roomLight1 = new THREE.PointLight(0xfef08a, 1.3, 12);
  roomLight1.position.set(0, H - 0.4, 3.5);
  scene.add(roomLight1);

  const roomLight2 = new THREE.PointLight(0x93c5fd, 1.5, 14);
  roomLight2.position.set(0, H - 0.4, -1.8);
  scene.add(roomLight2);

  const roomLight3 = new THREE.PointLight(0xfbbf24, 1.4, 14);
  roomLight3.position.set(0, H - 0.4, -8.25);
  scene.add(roomLight3);

  const roomLight4 = new THREE.PointLight(0xef4444, 1.4, 14);
  roomLight4.position.set(0, H - 0.4, -13.5);
  scene.add(roomLight4);
  // Gölge yok: ışıklar duvardan geçer, karanlık oda için bölüm 2 bunları söndürür
  roomLights.push(roomLight1, roomLight2, roomLight3, roomLight4);

  // -------------------------------------------------------------
  // KAPI 1: İlk Normal Açılan Çift Kanatlı Kapı (Z = 2.0)
  // -------------------------------------------------------------
  door1 = createDoubleDoor(0, 2.0, "normal", "[E] İlk Kapıyı Aç");

  // -------------------------------------------------------------
  // ODA 2: DAĞINIK ODA (Z: 2.0 ile -5.5 arası)
  // -------------------------------------------------------------
  // Masa & Çekmece (Sol duvara yaslı, orta geçit TAMAMEN AÇIK!)
  addSolidBlock(-2.6, 0.45, -1.5, 1.4, 0.9, 1.8, woodMat);

  // Çekmece: yerel +Z ön yüz (kulp), genişlik X 0.7, derinlik Z 0.55
  const drawerGeo = getBlenderGeo("drawer_box", new THREE.BoxGeometry(0.7, 0.22, 0.55));
  deskDrawer = new THREE.Mesh(drawerGeo, new THREE.MeshPhongMaterial({ color: 0xb45309 }));
  deskDrawer.rotation.y = Math.PI / 2; // ön yüz odaya (+X) bakar
  deskDrawer.position.set(DESK_DRAWER_X.closed, 0.65, -1.5);
  scene.add(deskDrawer);
  movingColliderMeshes.push(deskDrawer);

  // Çekmecedeki Sarı Not Kağıdı
  const paperMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.25),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide })
  );
  paperMesh.rotation.x = -Math.PI / 2;
  paperMesh.position.set(0, 0.115, 0); // Blender çekmecesinin üstü kapalı: not üst yüzde durur
  deskDrawer.add(paperMesh);

  registerInteractable({
    pos: new THREE.Vector3(-1.85, 0.7, -1.5),
    radius: 3.2,
    getPrompt: () => (drawerOpen ? (isNoteOpen ? "[E] Notu Kapat" : "[E] Notu Oku") : "[E] Çekmeceyi Aç"),
    action: () => {
      handTriggerReach();
      if (!drawerOpen) {
        drawerOpen = true;
        playSound("drawer");
        showToast("Çekmece açıldı! Notu okumak için [E] tuşuna bas.");
      } else {
        toggleNote();
      }
    }
  });

  // Dağınık Odadaki Eşyalar (Kenarlarda, yürüme yoluna engel OLMAYAN yerlerde)
  addSolidBlock(-3.2, 0.35, -3.8, 0.6, 0.6, 0.6, woodMat); // Sandalye
  addSolidBlock(3.0, 0.5, -1.0, 0.9, 1.0, 0.9, metalMat);  // Metal Kutu 1
  addSolidBlock(3.1, 0.4, -3.2, 0.8, 0.8, 0.8, metalMat);  // Metal Kutu 2

  // -------------------------------------------------------------
  // KAPI 2 & TUŞ TAKIMI (Z = -5.5) -> Oda 2'den Güvenlik Odasına Giriş
  // -------------------------------------------------------------
  door2 = createDoubleDoor(0, -5.5, "keypad", "Kapı kilitli! Sağdaki tuş takımına şifreyi gir.");

  // Tuş Takımı Paneli (Kapının sağındaki duvarda; açılan sağ kanat X = 1.2'de durduğu için
  // X = 1.9'da, arka yüzü duvar yüzeyinde Z = -5.325)
  const keypadGeo = getBlenderGeo("keypad_panel", new THREE.BoxGeometry(0.45, 0.65, 0.15));
  const keypadMesh = new THREE.Mesh(keypadGeo, metalMat);
  keypadMesh.position.set(1.9, 1.6, -5.25);
  scene.add(keypadMesh);
  addColliderBox(1.67, 1.27, -5.35, 2.13, 1.93, -5.17);

  const keypadScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  keypadScreen.position.set(1.9, 1.75, -5.165);
  scene.add(keypadScreen);

  registerInteractable({
    pos: new THREE.Vector3(1.9, 1.6, -5.2),
    radius: 3.2,
    getPrompt: () => (door2.isOpen ? "Şifre Çözüldü ✅" : "[E] Tuşlu Şifreyi Gir"),
    action: () => {
      if (door2.isOpen) {
        showToast("Şifre zaten doğru girildi!");
      } else {
        openKeypad();
      }
    }
  });

  // -------------------------------------------------------------
  // ODA 3: GÜVENLİK ODASI (Z: -5.5 ile -11.0 arası)
  // Masadaki Parlayan Altın Anahtar (SAĞ DUVARA YASLI - ORTA YOL TAMAMEN AÇIK!)
  // -------------------------------------------------------------
  addSolidBlock(2.6, 0.45, -8.25, 1.4, 0.9, 1.8, woodMat);

  const keyGroup = new THREE.Group();
  const keyRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.045, 12, 24),
    new THREE.MeshPhongMaterial({ color: 0xfbbf24, shininess: 150, emissive: 0xd97706 })
  );
  keyRing.position.y = -0.2;
  keyGroup.add(keyRing);

  const keyStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.55),
    new THREE.MeshPhongMaterial({ color: 0xfbbf24, shininess: 150, emissive: 0xd97706 })
  );
  keyStem.position.y = 0.15;
  keyGroup.add(keyStem);

  const keyTooth = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.05),
    new THREE.MeshPhongMaterial({ color: 0xfbbf24, shininess: 150, emissive: 0xd97706 })
  );
  keyTooth.position.set(0.1, 0.32, 0);
  keyGroup.add(keyTooth);

  keyLight = new THREE.PointLight(0xfbbf24, 2.8, 6);
  keyGroup.add(keyLight);

  keyGroup.position.set(2.6, 1.35, -8.25);
  scene.add(keyGroup);
  brassKeyMesh = keyGroup;

  registerInteractable({
    pos: new THREE.Vector3(2.6, 1.35, -8.25),
    radius: 3.2,
    getPrompt: () => (!player.hasKey ? "🔑 [E] Masadaki Altın Anahtarı Al!" : ""),
    action: () => {
      if (!player.hasKey) {
        player.hasKey = true;
        brassKeyMesh.visible = false;
        keyLight.visible = false;
        playSound("success");
        handTriggerReach();
        document.getElementById("slotKey").classList.add("has-item");
        document.getElementById("iconKey").innerText = "🔑";
        showToast("ALTIN ANAHTAR ALINDI! Şimdi Güç Odası kapısını açabilirsin!");
        updateObjective("GÖREV 3", "Altın anahtarla Güç Odasının kapısını [E] ile aç.");
      }
    }
  });

  // -------------------------------------------------------------
  // KAPI 3: GÜÇ ODASI GİRİŞ KAPISI (Z = -11.0, İki Kanatlı Kapı)
  // -------------------------------------------------------------
  door3 = createDoubleDoor(0, -11.0, "key_locked", "[E] Anahtarla Güç Odasını Aç");

  // Tavandan ve Duvarlardan Sarkan Karmaşık Kablolar
  buildHangingCables();

  // -------------------------------------------------------------
  // ODA 4: GÜÇ ODASI (Z: -11.0 ile -16.5 arası)
  // -------------------------------------------------------------
  // Sağ Duvar Tezgahı ve Sağlam Kablo Çekmecesi (Z = -13.5)
  addSolidBlock(2.8, 0.45, -13.5, 1.4, 0.9, 1.8, woodMat);

  cableBoxDrawer = new THREE.Mesh(drawerGeo, new THREE.MeshPhongMaterial({ color: 0x0284c7 }));
  cableBoxDrawer.rotation.y = -Math.PI / 2; // ön yüz odaya (-X) bakar
  cableBoxDrawer.position.set(CABLE_DRAWER_X.closed, 0.65, -13.5);
  scene.add(cableBoxDrawer);
  movingColliderMeshes.push(cableBoxDrawer);

  // Çekmecedeki Mavi Sağlam Kablo (yatay kangal: 0.4 x 0.1 x 0.4)
  const cableGeo = getBlenderGeo("cable_bundle", new THREE.TorusGeometry(0.17, 0.03, 8, 16).rotateX(Math.PI / 2), [0.4, 0.1, 0.4]);
  const newCablesMesh = new THREE.Mesh(cableGeo, new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0369a1 }));
  newCablesMesh.position.set(0, 0.16, 0);
  cableBoxDrawer.add(newCablesMesh);

  registerInteractable({
    pos: new THREE.Vector3(2.05, 0.65, -13.5),
    radius: 3.2,
    getPrompt: () => (cableDrawerOpen ? (!player.hasCables ? "🔌 [E] Sağlam Kabloları Al" : "[E] Çekmeceyi Kapat") : "[E] Kablo Çekmecesini Aç"),
    action: () => {
      handTriggerReach();
      if (!cableDrawerOpen) {
        cableDrawerOpen = true;
        playSound("drawer");
        showToast("Çekmece açıldı! İçinde parlak mavi sağlam kablolar var.");
      } else if (!player.hasCables) {
        player.hasCables = true;
        document.getElementById("slotCables").classList.add("has-item");
        document.getElementById("iconCables").innerText = "🔌";
        playSound("click");
        showToast("SAĞLAM KABLOLAR ALINDI! Şimdi karşı duvardaki paslanmış kabloları değiştir.");
        updateObjective("GÖREV 4", "Sol duvardaki paslanmış kabloları sağlam kablolarla [E] ile değiştir.");
      } else {
        cableDrawerOpen = false;
        playSound("drawer");
      }
    }
  });

  // Sol Duvardaki PASLANMIŞ KABLOLAR: kangallar dik çevrilip duvar yüzeyine (X = -4.0) yaslanır,
  // üst üste binmesinler diye 0.45m arayla dizilir
  const rustyMat = new THREE.MeshPhongMaterial({ color: 0x7c2d12, shininess: 10, emissive: 0x431407 });
  for (let i = 0; i < 3; i++) {
    const rC = new THREE.Mesh(cableGeo, rustyMat);
    rC.position.set(-3.93, 1.2 + i * 0.45, -13.5);
    rC.rotation.set(0.15 * i, 0, Math.PI / 2);
    scene.add(rC);
    rustyCables.push(rC);
  }
  addColliderBox(-4.0, 0.95, -13.75, -3.85, 2.35, -13.25);

  registerInteractable({
    pos: new THREE.Vector3(-3.8, 1.65, -13.5),
    radius: 3.2,
    getPrompt: () => (player.cablesReplaced ? "Kablolar Yenilendi ✅" : "[E] Paslanmış Kabloları Değiştir"),
    action: () => {
      handTriggerReach();
      if (!player.hasCables) {
        showToast("Önce çekmeceden sağlam kabloları almalısın!");
        playSound("error");
        return;
      }
      if (player.cablesReplaced) {
        showToast("Kablolar zaten yenileriyle değiştirildi!");
        return;
      }
      player.cablesReplaced = true;
      rustyCables.forEach(c => {
        c.material.color.setHex(0x38bdf8);
        c.material.emissive.setHex(0x0284c7);
      });
      playSound("click");
      showToast("KABLOLAR YENİLENDİ! Şimdi ana panelden sistemi yeniden başlat.");
      updateObjective("GÖREV 5", "Panelden sistemi yeniden başlat [E] ve şalter kolunu indir!");
    }
  });

  // ANA GÜÇ PANELİ (Sol bölme duvarında; açılan son kapının sol kanadı X = -1.2'de durduğu için
  // panel X = -3.0 ile -1.8 arasında, arka yüzü duvar yüzeyinde Z = -16.325)
  const panelGeo = getBlenderGeo("power_panel", new THREE.BoxGeometry(1.2, 1.6, 0.3));
  const panelMesh = new THREE.Mesh(panelGeo, metalMat);
  panelMesh.position.set(-2.4, 1.6, -16.175);
  scene.add(panelMesh);
  addColliderBox(-3.0, 0, -16.35, -1.8, 2.4, -15.65); // şalter kolu panelden öne çıkar

  // Panel Gösterge Lambaları
  panelLamp1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  panelLamp1.position.set(-2.7, 2.15, -16.0);
  scene.add(panelLamp1);

  panelLamp2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  panelLamp2.position.set(-2.4, 2.15, -16.0);
  scene.add(panelLamp2);

  // Şalter Kolu
  const leverGeo = getBlenderGeo("power_lever", new THREE.CylinderGeometry(0.04, 0.04, 0.45), [0.12, 0.45, 0.25]);
  powerLeverMesh = new THREE.Mesh(leverGeo, new THREE.MeshPhongMaterial({ color: 0xdc2626 }));
  powerLeverMesh.position.set(-2.05, 1.4, -15.9);
  powerLeverMesh.rotation.x = -0.6; // Yukarıda durur
  scene.add(powerLeverMesh);

  // Sistemi Yeniden Başlatma Butonu
  registerInteractable({
    pos: new THREE.Vector3(-2.65, 1.7, -16.0),
    radius: 3.0,
    getPrompt: () => (player.systemRebooted ? "Sistem Aktif ✅" : "[E] Sistemi Yeniden Başlat (Reboot)"),
    action: () => {
      handTriggerReach();
      if (!player.cablesReplaced) {
        showToast("HATA: Kablolar paslanmış ve devre kopuk! Önce kabloları yenile!");
        playSound("error");
        return;
      }
      player.systemRebooted = true;
      panelLamp1.material.color.setHex(0x10b981);
      playSound("power");
      showToast("SİSTEM ÇALIŞTI! Şimdi kırmızı şalter kolunu indir.");
    }
  });

  // Şalter Kolunu İndirme
  registerInteractable({
    pos: new THREE.Vector3(-2.05, 1.4, -15.95),
    radius: 3.0,
    getPrompt: () => (player.leverPulled ? "Güç Verildi ✅" : "[E] Ana Güç Kolunu İndir"),
    action: () => {
      handTriggerReach();
      if (!player.systemRebooted) {
        showToast("Önce yanındaki butondan sistemi yeniden başlatmalısın!");
        playSound("error");
        return;
      }
      if (player.leverPulled) return;
      player.leverPulled = true;
      powerLeverMesh.rotation.x = 0.6; // Aşağı iner
      panelLamp2.material.color.setHex(0x10b981);
      playSound("success");
      doorFinal.isOpen = true;
      showToast("GÜÇ HATTI DEVREDE! Son kapı açıldı!");
      updateObjective("GÖREV 6", "Açılan kapıdan içerideki karanlık odaya gir...");
    }
  });

  // -------------------------------------------------------------
  // KAPI 4: Güç odasından Bölüm 2 karanlık odaya (Z = -16.5)
  // -------------------------------------------------------------
  doorFinal = createDoubleDoor(0, -16.5, "final", "[E] Diğer Odaya Geç");
}

function registerInteractable({ pos, radius, getPrompt, action }) {
  interactables.push({ pos, radius, getPrompt, action });
}

// Güç odasının tavanından sarkan kablolar: rastgele konum duvarlardan ve birbirinden geçiyordu;
// 4 x 3 ızgarada, halkalar komşularına ve duvarlara değmeyecek yarıçapta sabit dizilir
function buildHangingCables() {
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, shininess: 50 });
  const xs = [-2.6, -0.9, 0.9, 2.6];
  const zs = [-12.2, -13.4, -14.6];
  let i = 0;
  zs.forEach(z => xs.forEach(x => {
    const c = new THREE.Mesh(new THREE.TorusGeometry(0.38 + (i % 3) * 0.06, 0.04, 6, 16), darkMat);
    c.position.set(x, 3.5 - (i % 3) * 0.25, z);
    c.rotation.x = Math.PI / 2 + 0.15;
    scene.add(c);
    i++;
  }));
}

// ============================================================================
// ŞİFRE VE NOT MODAL MANTIĞI
// ============================================================================
const NOTE_CH1 = {
  title: "📌 GİZLİ NOT",
  body: '"Güvenlik odasının 4 haneli tuşlu kapı şifresi:"',
  big: TARGET_CODE
};

function openNote(content = NOTE_CH1) {
  isNoteOpen = true;
  document.getElementById("noteTitle").innerText = content.title;
  document.getElementById("noteBody").innerText = content.body;
  const big = document.getElementById("noteBig");
  big.innerText = content.big || "";
  big.style.display = content.big ? "block" : "none";
  document.getElementById("noteOverlay").style.display = "block";
  playSound("click");
}

function closeNote() {
  isNoteOpen = false;
  document.getElementById("noteOverlay").style.display = "none";
  playSound("click");
}

function toggleNote(content) {
  if (isNoteOpen) closeNote();
  else openNote(content);
}

// Tuş takımı birden çok kapıda/dolapta kullanılır: { code, title, onSuccess }
let activeKeypad = null;
const KEYPAD_CH1 = {
  code: TARGET_CODE,
  title: "KAPI TUŞ TAKIMI",
  onSuccess: () => {
    door2.isOpen = true;
    showToast("ŞİFRE DOĞRU! 2. Kapı açıldı. İçeri girip masadaki Altın Anahtarı al!");
    updateObjective("GÖREV 2 TAMAMLANDI", "İçeri girip masadaki parlayan Altın Anahtarı [E] ile al.");
  }
};

function keypadBlank() {
  return "-".repeat(activeKeypad.code.length);
}

function openKeypad(config = KEYPAD_CH1) {
  if (adminMode) {
    playSound("success");
    config.onSuccess();
    showToast("🛠️ Admin: " + config.title + " açıldı");
    return;
  }
  activeKeypad = config;
  isKeypadOpen = true;
  keypadCode = "";
  document.getElementById("keypadTitle").innerText = config.title;
  document.getElementById("keypadDisplay").innerText = keypadBlank();
  document.getElementById("keypadResumeBtn").style.display = "none";
  document.getElementById("keypadGrid").style.display = "grid";
  document.getElementById("keypadModal").style.display = "flex";
  document.exitPointerLock();
  playSound("click");
}

function closeKeypad() {
  isKeypadOpen = false;
  document.getElementById("keypadModal").style.display = "none";
  lockPointer();
  playSound("click");
}

function pressKey(k) {
  const len = activeKeypad.code.length;
  if (k === "C") {
    keypadCode = "";
    document.getElementById("keypadDisplay").innerText = keypadBlank();
    playSound("click");
  } else if (k === "OK") {
    if (keypadCode === activeKeypad.code) {
      document.getElementById("keypadDisplay").innerText = "ONAY";
      playSound("success");
      activeKeypad.onSuccess();

      // Kullanıcıya tek tıkla devam etme butonu sun
      document.getElementById("keypadGrid").style.display = "none";
      document.getElementById("keypadResumeBtn").style.display = "block";
    } else {
      document.getElementById("keypadDisplay").innerText = "HATA";
      playSound("error");
      setTimeout(() => {
        keypadCode = "";
        document.getElementById("keypadDisplay").innerText = keypadBlank();
      }, 700);
    }
  } else {
    if (keypadCode.length < len) {
      keypadCode += k;
      document.getElementById("keypadDisplay").innerText = keypadCode.padEnd(len, "-");
      playSound("click");
    }
  }
}

// ============================================================================
// KONTROLLER VE OYUNCU HAREKETİ (KATI ÇARPIŞMA / HITBOX KORUMALI)
// ============================================================================
// Tarayıcı Esc'den hemen sonra yeniden kilitlemeyi reddeder (yakalanmayan Promise hatası);
// oyuncu bir kez daha tıklayınca kilitlenir, hata yutulur.
function lockPointer() {
  const p = document.getElementById("gameCanvas").requestPointerLock();
  if (p && p.catch) p.catch(() => {});
}

function startGame() {
  initAudio();
  ignoreMouseFrames = 3;
  lockPointer();
  document.getElementById("startScreen").style.display = "none";
  gameStarted = true;
}

function handTriggerReach() {
  handReachAnim = 1.0;
}

function toggleFlashlight() {
  if (!player.hasFlashlight) return;
  if (!player.flashOn && player.battery <= 0) {
    showToast("🔋 Pil bitti! Parlayan pilleri bul ya da şarj kolunu çevir.");
    playSound("error");
    return;
  }
  player.flashOn = !player.flashOn;
  playSound("click");
}

// Eğilme açma/kapama. Masanın altındayken ayağa kalkılamaz (kafa tabla çarpar).
function toggleCrouch() {
  if (player.crouch) {
    player.crouch = false;
    if (testCollision(player.pos)) {
      player.crouch = true;
      showToast("Kafanı çarpıyorsun! Önce masanın altından çık.");
      return;
    }
  } else {
    player.crouch = true;
  }
  updateCrouchHud();
}

function updateCrouchHud() {
  const el = document.getElementById("crouchBadge");
  if (el) el.style.display = player.crouch ? "block" : "none";
}

function setupControls() {
  const canvas = document.getElementById("gameCanvas");

  // Tuval tıklaması ile doğrudan pointerlock yakalama
  canvas.addEventListener("click", () => {
    if (!isLocked && gameStarted && !isKeypadOpen) {
      ignoreMouseFrames = 3;
      lockPointer();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === canvas;
    if (isLocked) {
      ignoreMouseFrames = 3; // Kilitlenme sırasındaki fare sıçramasını yoksay
      document.getElementById("startScreen").style.display = "none";
    } else if (gameStarted && !isKeypadOpen && !isNoteOpen && !uiKeyHandler) {
      document.getElementById("startTitle").innerText = "OYUN DURAKLATILDI";
      document.getElementById("startDesc").innerText = "Devam etmek için butona tıkla veya ekrana tıkla.";
      document.getElementById("startScreen").style.display = "flex";
    }
  });

  document.addEventListener("mousemove", e => {
    if (!isLocked) return;
    if (ignoreMouseFrames > 0) {
      ignoreMouseFrames--;
      return;
    }

    const rawDx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    const rawDy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    // Tarayıcı imleç ortalama sıçramalarını sınırla (ışınlanma ve ani dönüşü engeller)
    const dx = Math.max(-45, Math.min(45, rawDx));
    const dy = Math.max(-45, Math.min(45, rawDy));

    const sens = 0.0018;
    player.yaw -= dx * sens;
    player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - dy * sens));
  });

  window.addEventListener("keydown", e => {
    if (handleAdminCombo(e)) return;

    // Tuş takımı açıkken klavye desteği
    if (isKeypadOpen) {
      if (e.key >= "0" && e.key <= "9") {
        pressKey(e.key);
      } else if (e.key === "Enter") {
        if (keypadCode === activeKeypad.code) closeKeypad();
        else pressKey("OK");
      } else if (e.key === "Backspace" || e.key.toLowerCase() === "c") {
        pressKey("C");
      } else if (e.key === "Escape" || e.key.toLowerCase() === "e") {
        closeKeypad();
      }
      return;
    }

    if (uiKeyHandler && uiKeyHandler(e)) return;

    // Not açıkken [E] veya [Escape] ile kapatma
    if (isNoteOpen && (e.code === "KeyE" || e.code === "Escape")) {
      closeNote();
      return;
    }

    keys[e.code] = true;
    if (e.code === "KeyE") {
      interactRequested = true;
    } else if (e.code === "KeyF" && !e.repeat) {
      toggleFlashlight();
    } else if (e.code === "KeyC" && !e.repeat) {
      toggleCrouch();
    } else if (!e.repeat) {
      keyHooks.forEach(h => h(e));
    }
  });

  window.addEventListener("keyup", e => {
    keys[e.code] = false;
    if (e.code === "AltRight") {
      altGrHeld = false;
      adminArmed = false;
    }
  });
}

// AABB & DUVAR KATI ÇARPIŞMA KONTROLÜ
function testCollision(testPos) {
  const r = player.radius;
  const top = player.crouch ? BODY_TOP_CROUCH : BODY_TOP_STAND;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(testPos.x - r, 0.1, testPos.z - r),
    new THREE.Vector3(testPos.x + r, top, testPos.z + r)
  );

  // 1. Sabit Katı Duvarlar ve Mobilyalar
  for (let i = 0; i < solidColliders.length; i++) {
    if (playerBox.intersectsBox(solidColliders[i])) {
      return true;
    }
  }

  // 2. KAPALI KAPILAR (Kapalıyken tüm kapı boşluğu boyunca geçiş YASAK!)
  const doorsList = doors;
  for (let i = 0; i < doorsList.length; i++) {
    const d = doorsList[i];
    if (d && !d.isOpen) {
      // Kapı kapalıysa: Z derinliği 0.45m ve tüm X kapı aralığı (-1.35 ile +1.35 arası) katı duvardır
      if (Math.abs(testPos.z - d.z) < 0.45 && Math.abs(testPos.x - d.x) < 1.35) {
        return true;
      }
    }
  }

  // 3. AÇIK KAPI KANATLARI VE AÇIK ÇEKMECELER
  // Kanat/çekmece oyuncunun üstüne açıldıysa (zaten içindeyse) o kutu yok sayılır, yoksa oyuncu kilitlenir
  const r0 = player.radius;
  const currentBox = new THREE.Box3(
    new THREE.Vector3(player.pos.x - r0, 0.1, player.pos.z - r0),
    new THREE.Vector3(player.pos.x + r0, top, player.pos.z + r0)
  );
  const blocksMove = box => playerBox.intersectsBox(box) && !currentBox.intersectsBox(box);
  for (let i = 0; i < doorsList.length; i++) {
    const d = doorsList[i];
    if (d && d.isOpen && d.leafColliders.some(blocksMove)) return true;
  }
  for (let i = 0; i < movingColliderMeshes.length; i++) {
    if (blocksMove(new THREE.Box3().setFromObject(movingColliderMeshes[i]))) return true;
  }

  // 4. "Burası daha kodlanmadı" engeli: son bölümün çıkışının ötesi
  if (isNotCoded(testPos)) {
    showToast(notCodedMessage, 4000);
    return true; // Geçişe izin vermez!
  }

  return false;
}

// ============================================================================
// ANA OYUN DÖNGÜSÜ (60 FPS AKICI FİZİK & GELİŞMİŞ RAYCASTER HITBOX)
// ============================================================================
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Çift kanatlı kapıların 90 derece duvara katlanma (ve çarpıp kapanma) animasyonu
  doors.forEach(d => {
    const maxRot = Math.PI * 0.5;
    if (d.isOpen) {
      d.pivotL.rotation.y = Math.max(-maxRot, d.pivotL.rotation.y - dt * 3.5);
      d.pivotR.rotation.y = Math.min(maxRot, d.pivotR.rotation.y + dt * 3.5);
    } else {
      d.pivotL.rotation.y = Math.min(0, d.pivotL.rotation.y + dt * 6);
      d.pivotR.rotation.y = Math.max(0, d.pivotR.rotation.y - dt * 6);
    }
  });

  if (adminMode) player.battery = 100; // admin: fener pili bitmez
  flashLight.intensity = player.hasFlashlight && player.flashOn ? 2.4 : 0;

  // Çekmece açılma animasyonları
  if (deskDrawer) {
    const targetX = drawerOpen ? DESK_DRAWER_X.open : DESK_DRAWER_X.closed;
    deskDrawer.position.x += (targetX - deskDrawer.position.x) * 12 * dt;
  }
  if (cableBoxDrawer) {
    const targetX = cableDrawerOpen ? CABLE_DRAWER_X.open : CABLE_DRAWER_X.closed;
    cableBoxDrawer.position.x += (targetX - cableBoxDrawer.position.x) * 12 * dt;
  }

  // Altın Anahtarın Havada Dönüşü ve Parıldaması
  if (brassKeyMesh && brassKeyMesh.visible) {
    brassKeyMesh.rotation.y += dt * 3.0;
    brassKeyMesh.position.y = 1.35 + Math.sin(clock.getElapsedTime() * 4) * 0.08;
  }

  if (!isLocked) {
    renderFrame();
    return;
  }

  // Kamera Açıları
  camera.rotation.order = "YXZ";
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;

  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

  const moveDir = new THREE.Vector3();
  if (keys["KeyW"]) moveDir.add(forward);
  if (keys["KeyS"]) moveDir.sub(forward);
  if (keys["KeyD"]) moveDir.add(right);
  if (keys["KeyA"]) moveDir.sub(right);

  const isMoving = moveDir.lengthSq() > 0 && !player.frozen; // frozen: dolapta saklanırken / yakalanınca
  player.isMoving = isMoving;
  if (isMoving) {
    moveDir.normalize();
    const speed = player.crouch ? 2.0 : 4.5;
    const moveStep = moveDir.clone().multiplyScalar(speed * dt);

    // X Ekseni Ayrı Çarpışma Testi (Duvarlara sürtünerek kayma)
    const testX = new THREE.Vector3(player.pos.x + moveStep.x, player.pos.y, player.pos.z);
    if (!testCollision(testX)) {
      player.pos.x = testX.x;
    }

    // Z Ekseni Ayrı Çarpışma Testi
    const testZ = new THREE.Vector3(player.pos.x, player.pos.y, player.pos.z + moveStep.z);
    if (!testCollision(testZ)) {
      player.pos.z = testZ.z;
    }

    handWalkBob += dt * 10;
  }

  const eyeTarget = player.crouch ? EYE_CROUCH : EYE_STAND;
  player.eye += (eyeTarget - player.eye) * Math.min(1, dt * 12);
  camera.position.set(
    player.pos.x,
    player.eye + Math.sin(handWalkBob) * 0.035,
    player.pos.z
  );

  for (let i = 0; i < updateHooks.length; i++) updateHooks[i](dt);
  if (!isLocked) {
    renderFrame(); // bir bölüm olayı (ölüm ekranı vb.) kilidi bıraktıysa
    return;
  }

  // 3D EL ANİMASYONU
  if (handMesh) {
    if (handReachAnim > 0) {
      handReachAnim = Math.max(0, handReachAnim - dt * 4.5);
    }
    const reachOffset = Math.sin(handReachAnim * Math.PI) * 0.22;
    handMesh.position.set(
      0.32 + Math.cos(handWalkBob * 0.5) * 0.02,
      -0.32 + Math.sin(handWalkBob) * 0.02 + reachOffset * 0.3,
      -0.55 - reachOffset
    );
    handMesh.rotation.set(
      0.2 - reachOffset * 0.8,
      -0.15,
      0.1 + Math.sin(handWalkBob * 0.5) * 0.05
    );
  }

  // GELİŞMİŞ RAYCASTER + MESAFE HİTBOX SİSTEMİ
  const promptEl = document.getElementById("interactPill");
  let activeInteractable = null;
  let bestScore = Infinity;

  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);

  // Şu an sunacak bir şeyi olmayan (alınmış, henüz görünmeyen) nesneler seçilmez; yoksa yanındaki
  // gerçek hedefin (ör. açılmış sandığın içindeki eşya) önüne geçip onu gizler
  for (let i = 0; i < interactables.length; i++) {
    const it = interactables[i];
    const dist = player.pos.distanceTo(it.pos);
    if (dist <= it.radius && it.getPrompt()) {
      const toItem = it.pos.clone().sub(camera.position).normalize();
      const dot = camDir.dot(toItem);
      if (dot > 0.35 && hasLineOfSight(camera.position, it.pos)) {
        const score = dist * (1.5 - dot);
        if (score < bestScore) {
          bestScore = score;
          activeInteractable = it;
        }
      }
    }
  }

  if (activeInteractable) {
    const promptText = activeInteractable.getPrompt();
    if (promptText) {
      promptEl.style.display = "block";
      promptEl.innerText = promptText;
      if (interactRequested) {
        activeInteractable.action();
      }
    } else {
      promptEl.style.display = "none";
    }
  } else {
    promptEl.style.display = "none";
  }

  interactRequested = false;
  renderFrame();
}

// İki geçişli çizim: önce dünya, sonra derinlik temizlenip el. El duvara yaklaşınca içine girmez.
// r128'de ışıklar da katmana göre süzülür (init'te tüm katmanlara açılır) ve renk arka planı her
// render'da ekranı siler; bu yüzden el geçişinde arka plan geçici olarak kaldırılır.
function renderFrame() {
  renderer.autoClear = true;
  camera.layers.set(0);
  renderer.render(scene, camera);
  const bg = scene.background;
  scene.background = null;
  renderer.autoClear = false;
  renderer.clearDepth();
  camera.layers.set(1);
  renderer.render(scene, camera);
  scene.background = bg;
  camera.layers.set(0);
}

// Duvar veya kapalı kapı araya giriyorsa nesneyle etkileşim kurulamaz (duvar arkasından çekmece
// açma, kablo değiştirme olmasın). Nesneler duvara/masaya yaslı durduğu için hedefin son 0.25m'si sayılmaz.
const losRay = new THREE.Ray();
const losHit = new THREE.Vector3();
function hasLineOfSight(from, to) {
  const dist = from.distanceTo(to);
  losRay.origin.copy(from);
  losRay.direction.copy(to).sub(from).normalize();
  const blockers = wallColliders.slice();
  doors.forEach(d => {
    if (!d.isOpen) {
      blockers.push(new THREE.Box3(new THREE.Vector3(d.x - 1.2, 0, d.z - 0.06), new THREE.Vector3(d.x + 1.2, 3.0, d.z + 0.06)));
    }
  });
  for (let i = 0; i < blockers.length; i++) {
    if (losRay.intersectBox(blockers[i], losHit) && losHit.distanceTo(from) < dist - 0.25) return false;
  }
  return true;
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("DOMContentLoaded", init);