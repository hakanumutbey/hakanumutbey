const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const healthText = document.querySelector("#healthText");
const waveText = document.querySelector("#waveText");
const scoreText = document.querySelector("#scoreText");
const arrowText = document.querySelector("#arrowText");
const restartButton = document.querySelector("#restartButton");
const exportIntroButton = document.querySelector("#exportIntroButton");
const introOverlay = document.querySelector("#introOverlay");
const introVideo = document.querySelector("#introVideo");
const startIntroButton = document.querySelector("#startIntroButton");
const skipIntroButton = document.querySelector("#skipIntroButton");
const introVideoFile = "remotion/out/skeleton-wars-intro.webm?v=dialogue-1";

const world = {
  width: 5400,
  height: 1500,
  campX: 210,
  campY: 760,
  castleX: 5160,
  castleY: 720,
};

const castleRoom = {
  width: 960,
  height: 540,
  entranceX: 115,
  entranceY: 300,
};

const keys = new Set();
const mouse = {
  screenX: canvas.width / 2,
  screenY: canvas.height / 2,
  worldX: world.campX + 200,
  worldY: world.campY,
};

const camera = { x: 0, y: 0 };
let audioContext = null;
let screenShake = 0;

const player = {
  x: world.campX,
  y: world.campY,
  radius: 18,
  speed: 255,
  baseSpeed: 255,
  health: 100,
  maxHealth: 100,
  arrows: 12,
  fireArrows: 3,
  swordDamage: 3,
  bowReload: 0,
  swordReload: 0,
  swordTime: 0,
  invincible: 0,
};

const brother = {
  x: 792,
  y: 370,
  radius: 15,
  rescued: false,
};

const teapot = {
  x: world.campX + 285,
  y: world.campY + 18,
  radius: 34,
  messageIndex: 0,
};

const teapotMessages = [
  "Bu bir otomatik demlik mesajidir. Cay demleniyor.",
  "Evlat, iskelet gorursen once sakin kal, sonra kac.",
  "Kilic keskin olabilir ama sicak cay daha tehlikelidir.",
  "Linux caydanlik servisi baslatildi.",
  "Kardesini kurtar, sonra caya gel.",
];

const teapotDialogLines = [
  "Baban sesleri yapacakmis. Guzel, robot sesi kazana geri koyuyoruz.",
  "Sen sesleri ses klasorune koyunca ben videoya takarim.",
  "Cay hazir olunca kahraman da hazir olur.",
  "Bu bir otomatik demlik mesajidir: macera demleniyor.",
  "Iskelet Krali cok havali konusuyor ama ben daha iyi fokurdarim.",
  "Kardesini kurtarmadan caya seker atmak yok.",
  "Ben eskiyim ama savas planim taze.",
  "Kilicini bile, okunu say, cayini unutma.",
  "Bir iskelet sana bakarsa ona sicak su degil, ok at.",
  "Magazadaki fiyatlari ben belirlemedim, ekonomi iskeletlerin sucu.",
  "Eger kaybolursan kamp atesine don. Ben burada fokur fokur beklerim.",
  "Bu oyunda en guclu silah cesaret, ikinci en guclu silah iyi demlenmis cay.",
];

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(frequency, duration, type = "sine", volume = 0.08, slideTo = frequency) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playSound(name) {
  if (!audioContext) {
    return;
  }

  if (name === "bow") {
    playTone(440, 0.08, "triangle", 0.055, 760);
  } else if (name === "fire") {
    playTone(260, 0.08, "sawtooth", 0.06, 620);
    setTimeout(() => playTone(780, 0.08, "triangle", 0.045, 980), 55);
  } else if (name === "sword") {
    playTone(820, 0.09, "sawtooth", 0.045, 260);
  } else if (name === "hit") {
    playTone(180, 0.12, "square", 0.06, 90);
  } else if (name === "pickup") {
    playTone(520, 0.08, "sine", 0.06, 780);
    setTimeout(() => playTone(760, 0.08, "sine", 0.05, 980), 70);
  } else if (name === "death") {
    playTone(220, 0.5, "triangle", 0.08, 70);
  } else if (name === "boss") {
    playTone(130, 0.45, "sawtooth", 0.075, 95);
  } else if (name === "victory") {
    playTone(440, 0.12, "triangle", 0.07, 660);
    setTimeout(() => playTone(660, 0.12, "triangle", 0.07, 880), 120);
    setTimeout(() => playTone(880, 0.18, "triangle", 0.07, 1170), 240);
  } else if (name === "cutscene") {
    playTone(340, 0.06, "sine", 0.04, 420);
  }
}

const storyScenes = [
  {
    title: "Mutlu Kamp",
    text: "Sen ve kardesin ormanda kamp yapiyorsunuz.",
    duration: 2,
  },
  {
    title: "Iskelet Krali",
    text: "Gece olunca Iskelet Krali geliyor ve ikinizi de yakaliyor.",
    duration: 2,
  },
  {
    title: "Kacis",
    text: "Yolda ipini cozup kaciyorsun, ama kardesin onun elinde kaliyor.",
    duration: 2,
  },
  {
    title: "Gorev",
    text: "Kampa geri dog, haritada ilerle ve kardesini kurtarmak icin kralliga ulas.",
    duration: 2,
  },
];

const deathScenes = [
  {
    title: "Karanlik Cokuyor",
    text: "Iskeletlerin arasinda yere dusuyorsun.",
    duration: 2.1,
  },
  {
    title: "Kamp Atesi",
    text: "Alevler tekrar yaniyor ve kampta yeniden doguyorsun.",
    duration: 2.5,
  },
];

const victoryScenes = [
  {
    title: "Kral Yenildi",
    text: "Iskelet Krali tacini dusurur ve salon sessizlesir.",
    duration: 999,
  },
  {
    title: "Kafes Aciliyor",
    text: "Kardesinin kafesindeki kilit kirilir.",
    duration: 999,
  },
  {
    title: "Kardesler Birlikte",
    text: "Kardesini kurtardin. Skeleton Wars'in ilk gorevi tamamlandi!",
    duration: 999,
  },
];

const captureScenes = [
  {
    title: "Ormanda Tuzak",
    text: "Kralin askerleri sizi tekrar yakalar. Bu kez ikiniz de kacamazsiniz.",
    duration: 999,
  },
  {
    title: "Guvenlikli Zindan",
    text: "Sizi cok guvenlikli bir yere hapsederler.",
    duration: 999,
  },
  {
    title: "Ucuz Kapi",
    text: "Ama kral ucuz malzeme kullanmistir. Kapi kiliçla kirilabilir.",
    duration: 999,
  },
];

const postBossScenes = [
  {
    title: "Son",
    text: "Boss bos delige duser ve patlar. Patlamanin etkisiyle sen ve kardesin havaya savrulursunuz.",
    duration: 999,
  },
  {
    title: "Demire Tutunus",
    text: "Sen havadaki demir parcasina tutunup kalmayi basarirsin ama kardesin bossun ustune duser.",
    duration: 999,
  },
  {
    title: "Iskelet Enerjisi",
    text: "Kardesinin vucudunu guclu bir iskelet enerjisi kaplar ve agir yarali olarak hastaneye kaldirilir.",
    duration: 999,
  },
  {
    title: "Doktor",
    text: "\"Bunun bir tedavisi var: Iskelet Kalesi'ndeki siseyi alip icirmek.\"",
    duration: 999,
  },
  {
    title: "Yanlis Sise",
    text: "Siseyi icirince kardesin daha kotu olur. Etiketin altinda bir etiket daha oldugunu fark edersin.",
    duration: 999,
  },
  {
    title: "Zehir",
    text: "Ondeki kagidi cikarinca gercek yazi gorunur: ZEHIR. Gercek ilac icin kampa isinlanirsin.",
    duration: 999,
  },
];

const cureThrowScenes = [
  {
    title: "Zaman Kalmadi",
    text: "Siseyi aldiginda zaman kalmadigini gorursun. Kaleden bosluga firlatirsin.",
    duration: 999,
  },
  {
    title: "Tam Isabet",
    text: "Sise bosluktan gecip kardesinin agzina girer. Iskelet enerjisi dagilmaya baslar.",
    duration: 999,
  },
  {
    title: "Kardesler",
    text: "Kardesin kurtulur. Mutluluktan birbirinize sarilirsiniz.",
    duration: 999,
  },
  {
    title: "Siyah Gozler",
    text: "Kamera oldugunu sandigin bossun yanina gider. Boss gozlerini acar. Gozleri siyahtir.",
    duration: 999,
  },
];

const badEndingScenes = [
  {
    title: "Gec Kaldin",
    text: "Zaman biter. Kardesini kurtaramazsin.",
    duration: 999,
  },
  {
    title: "Doktor",
    text: "\"Zamani geri alabilirim. Kral oldugunde hemen kampa kacmalisiniz.\"",
    duration: 999,
  },
  {
    title: "Zaman Geri Aliyor",
    text: "Her sey bossun oldugu ana geri sarilir. Bu kez patlama olmadan kampa kosmalisin.",
    duration: 999,
  },
];

const rewindSuccessScenes = [
  {
    title: "Kampa Kacis",
    text: "Kampa yetisince boss bosluga duser ve patlar ama bu kez kimseye bir sey olmaz.",
    duration: 999,
  },
  {
    title: "Siyah Gozler",
    text: "Kamera yatan bossun yanina gelir. Boss gozlerini acar. Gozleri siyahtir.",
    duration: 999,
  },
];

const spawnPits = [
  { x: 650, y: 705, count: 3, triggered: false },
  { x: 980, y: 850, count: 4, triggered: false },
  { x: 1340, y: 640, count: 5, triggered: false },
  { x: 1740, y: 820, count: 5, triggered: false },
  { x: 2180, y: 680, count: 6, triggered: false },
  { x: 2620, y: 830, count: 7, triggered: false },
  { x: 3020, y: 700, count: 8, triggered: false },
  { x: 3440, y: 880, count: 8, triggered: false },
  { x: 3820, y: 620, count: 9, triggered: false },
  { x: 4240, y: 830, count: 9, triggered: false },
  { x: 4680, y: 675, count: 10, triggered: false },
];

const arrowPickups = [
  { x: 470, y: 625, amount: 6, collected: false },
  { x: 1120, y: 760, amount: 8, collected: false },
  { x: 1540, y: 520, amount: 7, collected: false },
  { x: 2050, y: 900, amount: 9, collected: false },
  { x: 2480, y: 650, amount: 8, collected: false },
  { x: 2920, y: 910, amount: 10, collected: false },
  { x: 3300, y: 650, amount: 8, collected: false },
  { x: 3700, y: 900, amount: 10, collected: false },
  { x: 4140, y: 610, amount: 9, collected: false },
  { x: 4560, y: 890, amount: 12, collected: false },
];

const healthPickups = [
  { state: "playing", x: 760, y: 610, amount: 25, collected: false },
  { state: "playing", x: 1880, y: 620, amount: 25, collected: false },
  { state: "playing", x: 3560, y: 780, amount: 30, collected: false },
  { state: "tunnel", x: 465, y: 300, amount: 25, collected: false },
  { state: "forestEscape", x: 500, y: 300, amount: 25, collected: false },
  { state: "rooms", room: 3, x: 470, y: 300, amount: 25, collected: false },
  { state: "rooms", room: 6, x: 470, y: 300, amount: 30, collected: false },
  { state: "rooms", room: 9, x: 470, y: 300, amount: 30, collected: false },
  { state: "finalBoss", x: 330, y: 420, amount: 40, collected: false },
];

const secretChests = [
  { x: 900, y: 520, opened: false, coins: 35, arrows: 8, fireArrows: 1 },
  { x: 2360, y: 990, opened: false, coins: 55, arrows: 10, fireArrows: 2 },
  { x: 4050, y: 520, opened: false, coins: 80, arrows: 14, fireArrows: 3 },
];

const timedPotion = {
  x: world.castleX - 95,
  y: world.castleY - 42,
  radius: 30,
  collected: false,
};

let skeletons = [];
let shots = [];
let particles = [];
let floatingTexts = [];
let score = 0;
let coins = 0;
let gameState = "introVideo";
let sceneIndex = 0;
let sceneTimer = 0;
let lastTime = 0;
let reachedCastle = false;
let insideCastle = false;
let kingDefeated = false;
let escapeComplete = false;
let tunnelComplete = false;
let forestComplete = false;
let doorHits = 0;
let prisonDoorOpen = false;
let roomNumber = 1;
let roomCleared = false;
let finalBossDefeated = false;
let pendingVictoryTimer = 0;
let timedRunTimer = 60;
let timedRunTarget = "cure";
let storedPlayerSpeed = player.baseSpeed;
let currentMap = "forest";
let shopLevel = 0;
let brotherHelpCooldown = 0;
let lastShopHint = 0;
let lastTeapotHint = 0;
let teapotDialogOpen = false;
let teapotDialogIndex = 0;
let checkpoint = { state: "playing", x: world.campX, y: world.campY, label: "Kamp" };
let introStream = null;
let introAnimationId = 0;
let introStartTime = 0;
let introFallbackTimer = 0;
const introDuration = storyScenes.reduce((total, scene) => total + scene.duration, 0);

function resetGame() {
  player.x = world.campX;
  player.y = world.campY;
  player.health = 100;
  player.maxHealth = 100;
  player.speed = player.baseSpeed;
  player.arrows = 12;
  player.fireArrows = 3;
  player.swordDamage = 3;
  player.bowReload = 0;
  player.swordReload = 0;
  player.swordTime = 0;
  player.invincible = 0;
  skeletons = [];
  shots = [];
  particles = [];
  floatingTexts = [];
  screenShake = 0;
  score = 0;
  coins = 0;
  reachedCastle = false;
  insideCastle = false;
  kingDefeated = false;
  escapeComplete = false;
  tunnelComplete = false;
  forestComplete = false;
  doorHits = 0;
  prisonDoorOpen = false;
  roomNumber = 1;
  roomCleared = false;
  finalBossDefeated = false;
  pendingVictoryTimer = 0;
  timedRunTimer = 60;
  timedRunTarget = "cure";
  storedPlayerSpeed = player.baseSpeed;
  timedPotion.collected = false;
  currentMap = "forest";
  shopLevel = 0;
  brotherHelpCooldown = 0;
  lastShopHint = 0;
  lastTeapotHint = 0;
  teapotDialogOpen = false;
  teapotDialogIndex = 0;
  checkpoint = { state: "playing", x: world.campX, y: world.campY, label: "Kamp" };
  brother.x = 792;
  brother.y = 370;
  brother.rescued = false;
  sceneIndex = 0;
  sceneTimer = 0;
  gameState = "introVideo";
  for (const pit of spawnPits) {
    pit.triggered = false;
  }
  for (const pickup of arrowPickups) {
    pickup.collected = false;
  }
  for (const pickup of healthPickups) {
    pickup.collected = false;
  }
  for (const chest of secretChests) {
    chest.opened = false;
  }
  updateHud();
  playIntroVideo();
}

function startPlaying() {
  gameState = "playing";
  sceneIndex = 0;
  sceneTimer = 0;
  stopIntroVideo();
  burst(player.x, player.y, "#ffd36b", 22);
  updateHud();
}

function playIntroVideo() {
  stopIntroVideo();
  gameState = "introVideo";
  introOverlay.classList.remove("hidden");
  startIntroButton.classList.remove("hidden");
  introVideo.onended = startPlaying;
  introVideo.onerror = () => {
    window.alert("Video acilamadi. WebM dosyasini kontrol edelim.");
  };
  introVideo.onloadedmetadata = () => {
    introVideo.currentTime = 0;
    startIntroPlayback();
  };
  introVideo.src = introVideoFile;
  introVideo.load();
}

function startIntroPlayback() {
  if (gameState !== "introVideo") {
    return;
  }

  introVideo.play().then(() => {
    startIntroButton.classList.add("hidden");
  }).catch(() => {
    startIntroButton.classList.remove("hidden");
  });
}

function stopIntroVideo() {
  if (introFallbackTimer) {
    window.clearTimeout(introFallbackTimer);
    introFallbackTimer = 0;
  }

  if (introAnimationId) {
    cancelAnimationFrame(introAnimationId);
    introAnimationId = 0;
  }

  if (introStream) {
    for (const track of introStream.getTracks()) {
      track.stop();
    }
    introStream = null;
  }

  introVideo.onended = null;
  introVideo.onerror = null;
  introVideo.onloadedmetadata = null;
  introVideo.pause();
  introVideo.srcObject = null;
  introVideo.removeAttribute("src");
  introVideo.load();
  introOverlay.classList.add("hidden");
}

function recordIntroVideoFile() {
  const link = document.createElement("a");
  link.href = introVideoFile;
  link.download = "skeleton-wars-intro.webm";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return;

  if (!HTMLCanvasElement.prototype.captureStream || !window.MediaRecorder) {
    window.alert("Bu tarayici video kaydetmeyi desteklemiyor.");
    return;
  }

  const producer = document.createElement("canvas");
  producer.width = canvas.width;
  producer.height = canvas.height;
  const producerCtx = producer.getContext("2d");
  const stream = producer.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
    ? "video/webm; codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  let animationId = 0;
  let startTime = 0;

  exportIntroButton.disabled = true;
  exportIntroButton.textContent = "Kaydediliyor...";

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  recorder.addEventListener("stop", () => {
    cancelAnimationFrame(animationId);
    for (const track of stream.getTracks()) {
      track.stop();
    }

    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "skeleton-wars-intro.webm";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    exportIntroButton.disabled = false;
    exportIntroButton.textContent = "Videoyu Kaydet";
  });

  const drawFrame = (time) => {
    if (!startTime) {
      startTime = time;
    }

    const elapsed = (time - startTime) / 1000;
    drawIntroVideoFrame(producerCtx, elapsed, producer.width, producer.height);

    if (elapsed >= introDuration) {
      recorder.stop();
      return;
    }

    animationId = requestAnimationFrame(drawFrame);
  };

  recorder.start();
  animationId = requestAnimationFrame(drawFrame);
}

function respawnAtCamp() {
  player.x = checkpoint.x;
  player.y = checkpoint.y;
  player.health = 100;
  player.arrows = Math.max(8, player.arrows);
  player.invincible = 2;
  player.bowReload = 0;
  player.swordReload = 0;
  player.swordTime = 0;
  insideCastle = checkpoint.state !== "playing";
  shots = [];
  skeletons = [];
  brother.rescued = checkpoint.state !== "playing" && checkpoint.state !== "castleInside";
  gameState = checkpoint.state;
  restoreCheckpointState();
  sceneIndex = 0;
  sceneTimer = 0;
  burst(player.x, player.y, "#ffd36b", 28);
  addFloatingText(player.x, player.y - 52, `${checkpoint.label} kontrol noktasinda dogdun`, "#ffe6a1");
  updateHud();
}

function setCheckpoint(state, x, y, label) {
  checkpoint = { state, x, y, label };
}

function restoreCheckpointState() {
  if (checkpoint.state === "playing") {
    insideCastle = false;
    brother.rescued = false;
    return;
  }

  insideCastle = true;

  if (checkpoint.state === "castleInside") {
    kingDefeated = false;
    brother.rescued = false;
    spawnCastleBoss();
  } else if (checkpoint.state === "escape") {
    brother.rescued = true;
    brother.x = player.x + 42;
    brother.y = player.y + 20;
    spawnEscapeGuards();
  } else if (checkpoint.state === "tunnel") {
    brother.rescued = true;
    brother.x = player.x - 42;
    brother.y = player.y + 28;
    spawnTunnelGuards();
  } else if (checkpoint.state === "forestEscape") {
    brother.rescued = true;
    brother.x = player.x - 45;
    brother.y = player.y + 30;
    spawnForestChasers();
  } else if (checkpoint.state === "prison") {
    brother.rescued = false;
    doorHits = 0;
    prisonDoorOpen = false;
  } else if (checkpoint.state === "rooms") {
    brother.rescued = true;
    brother.x = player.x - 45;
    brother.y = player.y + 25;
    spawnRoomEnemies();
  } else if (checkpoint.state === "finalBoss") {
    brother.rescued = true;
    brother.x = player.x - 45;
    brother.y = player.y + 25;
    spawnFinalBoss();
  }
}

function triggerDeath() {
  if (insideCastle) {
    shots = [];
    skeletons = [];
  }

  gameState = "death";
  sceneIndex = 0;
  sceneTimer = 0;
  playSound("death");
  burst(player.x, player.y, "#d84b45", 34);
  updateHud();
}

function triggerVictory(boss = player) {
  kingDefeated = true;
  pendingVictoryTimer = 1.4;
  sceneIndex = 0;
  sceneTimer = 0;
  skeletons = [];
  shots = [];
  score += 250;
  playSound("victory");
  bossExplosion(boss.x, boss.y, false);
  addFloatingText(boss.x, boss.y - 130, "KRAL PARCALANDI!", "#ff8a3d");
  updateHud();
}

function updateHud() {
  const progress = insideCastle ? 100 : Math.min(100, Math.floor((player.x / world.castleX) * 100));
  healthText.textContent = Math.max(0, Math.ceil(player.health));
  waveText.textContent = gameState === "timedRun" ? `${Math.ceil(timedRunTimer)} sn` : `${progress}%`;
  scoreText.textContent = `${score} / ${coins} TL`;
  arrowText.textContent = player.fireArrows > 0
    ? `${player.arrows} / Ates ${player.fireArrows}`
    : player.arrows;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function updateMouseWorld() {
  mouse.worldX = mouse.screenX + camera.x;
  mouse.worldY = mouse.screenY + camera.y;
}

function shoot(useFireArrow = false) {
  if (gameState === "intro" || gameState === "introVideo") {
    startPlaying();
    return;
  }

  if (
    gameState !== "playing" &&
    gameState !== "castleInside" &&
    gameState !== "escape" &&
    gameState !== "tunnel" &&
    gameState !== "forestEscape" &&
    gameState !== "prison" &&
    gameState !== "rooms" &&
    gameState !== "finalBoss"
  ) {
    return;
  }

  if (player.bowReload > 0 || player.arrows <= 0) {
    return;
  }

  const isFireArrow = useFireArrow && player.fireArrows > 0;

  if (useFireArrow && !isFireArrow) {
    addFloatingText(player.x, player.y - 52, "Atesli okun kalmadi!", "#ffe6a1");
    return;
  }

  const angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
  shots.push({
    x: player.x + Math.cos(angle) * 24,
    y: player.y + Math.sin(angle) * 24,
    vx: Math.cos(angle) * 590,
    vy: Math.sin(angle) * 590,
    radius: isFireArrow ? 8 : 5,
    life: isFireArrow ? 1.55 : 1.35,
    fire: isFireArrow,
  });
  player.arrows -= 1;
  if (isFireArrow) {
    player.fireArrows -= 1;
  }
  player.bowReload = isFireArrow ? 0.35 : 0.25;
  playSound(isFireArrow ? "fire" : "bow");
  updateHud();
}

function swordAttack() {
  if (gameState === "intro" || gameState === "introVideo") {
    startPlaying();
    return;
  }

  if (
    gameState !== "playing" &&
    gameState !== "castleInside" &&
    gameState !== "escape" &&
    gameState !== "tunnel" &&
    gameState !== "forestEscape" &&
    gameState !== "prison" &&
    gameState !== "rooms" &&
    gameState !== "finalBoss"
  ) {
    return;
  }

  if (player.swordReload > 0) {
    return;
  }

  player.swordReload = 0.34;
  player.swordTime = 0.22;
  playSound("sword");
  const aim = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
  let hitSomething = false;

  if (gameState === "prison" && !prisonDoorOpen && distance(player, { x: 795, y: 302 }) < 116) {
    doorHits += 1;
    hitSomething = true;
    playSound("hit");
    burst(795, 302, "#f6d16d", 12);
    addFloatingText(795, 238, `${doorHits}/10`, "#ffe6a1");

    if (doorHits >= 10) {
      prisonDoorOpen = true;
      brother.rescued = true;
      addFloatingText(690, 238, "Kapi acildi!", "#ffe6a1");
      playSound("victory");
    }
  }

  for (const skeleton of skeletons) {
    if (skeleton.rise < 1) {
      continue;
    }

    const hitDistance = distance(player, skeleton);
    const hitAngle = Math.atan2(skeleton.y - player.y, skeleton.x - player.x);
    const arc = Math.abs(angleDifference(aim, hitAngle));

    if (hitDistance < 105 && arc < 1.65) {
      skeleton.health -= 3;
      skeleton.hitFlash = 0.12;
      skeleton.knockbackX = Math.cos(hitAngle) * 190;
      skeleton.knockbackY = Math.sin(hitAngle) * 190;
      burst(skeleton.x, skeleton.y, "#f4f0df", 12);
      playSound("hit");
      hitSomething = true;
    }
  }

  if (!hitSomething) {
    burst(player.x + Math.cos(aim) * 55, player.y + Math.sin(aim) * 55, "#ffe6a1", 5);
  }
}

function isCutsceneState() {
  return (
    gameState === "intro" ||
    gameState === "death" ||
    gameState === "victory" ||
    gameState === "capture" ||
    gameState === "postBoss" ||
    gameState === "cureThrow" ||
    gameState === "badEnding" ||
    gameState === "rewindSuccess" ||
    gameState === "ending"
  );
}

function advanceCutscene() {
  playSound("cutscene");

  if (gameState === "intro") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= storyScenes.length) {
      startPlaying();
    }
    return;
  }

  if (gameState === "death") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= deathScenes.length) {
      respawnAtCamp();
    }
    return;
  }

  if (gameState === "victory") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= victoryScenes.length) {
      startEscapeLevel();
    }
    return;
  }

  if (gameState === "capture") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= captureScenes.length) {
      startPrisonLevel();
    }
    return;
  }

  if (gameState === "postBoss") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= postBossScenes.length) {
      startTimedPotionRun();
    }
    return;
  }

  if (gameState === "cureThrow") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= cureThrowScenes.length) {
      showSkeletonWarsTwoEnding();
    }
    return;
  }

  if (gameState === "badEnding") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= badEndingScenes.length) {
      startRewindEscapeRun();
    }
    return;
  }

  if (gameState === "rewindSuccess") {
    sceneIndex += 1;
    sceneTimer = 0;
    if (sceneIndex >= rewindSuccessScenes.length) {
      showSkeletonWarsTwoEnding();
    }
    return;
  }

  if (gameState === "ending") {
    resetGame();
  }
}

function startEscapeLevel() {
  gameState = "escape";
  sceneIndex = 0;
  insideCastle = true;
  brother.rescued = true;
  player.x = 760;
  player.y = 360;
  brother.x = player.x + 42;
  brother.y = player.y + 20;
  player.health = Math.min(100, player.health + 35);
  player.arrows += 12;
  player.fireArrows += 2;
  skeletons = [];
  shots = [];
  spawnEscapeGuards();
  addFloatingText(player.x, player.y - 70, "Kaleden Kacis basladi!", "#ffe6a1");
  playSound("victory");
  updateHud();
}

function update(dt) {
  screenShake = Math.max(0, screenShake - dt);

  if (teapotDialogOpen) {
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateHud();
    return;
  }

  if (pendingVictoryTimer > 0) {
    pendingVictoryTimer = Math.max(0, pendingVictoryTimer - dt);
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateHud();

    if (pendingVictoryTimer === 0 && gameState === "castleInside") {
      gameState = "victory";
      sceneIndex = 0;
      sceneTimer = 0;
    }

    return;
  }

  if (gameState === "introVideo") {
    return;
  }

  if (gameState === "ending") {
    sceneTimer += dt;
    updateParticles(dt);
    updateFloatingTexts(dt);
    return;
  }

  if (
    gameState === "intro" ||
    gameState === "victory" ||
    gameState === "capture" ||
    gameState === "postBoss" ||
    gameState === "cureThrow" ||
    gameState === "badEnding" ||
    gameState === "rewindSuccess"
  ) {
    sceneTimer += dt;
    updateParticles(dt);
    return;
  }

  if (gameState === "death") {
    sceneTimer += dt;
    updateParticles(dt);
    return;
  }

  if (
    gameState === "castleInside" ||
    gameState === "escape" ||
    gameState === "tunnel" ||
    gameState === "forestEscape" ||
    gameState === "prison" ||
    gameState === "rooms" ||
    gameState === "finalBoss"
  ) {
    updatePlayer(dt);
    updateBrother(dt);
    updateSkeletons(dt);
    updateShots(dt);
    updateHits();
    updateHealthPickups();
    updateParticles(dt);
    updateFloatingTexts(dt);
    checkEscapeExit();
    checkTunnelExit();
    checkForestExit();
    checkPrisonExit();
    checkRoomExit();
    updateHud();
    return;
  }

  if (gameState === "timedRun") {
    updatePlayer(dt);
    updateBrother(dt);
    updateTimedRun(dt);
    updateParticles(dt);
    updateFloatingTexts(dt);
    updateHud();
    return;
  }

  updatePlayer(dt);
  updateSpawns();
  updateArrowPickups();
  updateHealthPickups();
  updateSecretChests();
  updateShop();
  updateTeapot();
  updateSkeletons(dt);
  updateShots(dt);
  updateHits();
  updateParticles(dt);
  updateFloatingTexts(dt);
  checkCastle();
  updateHud();
}

function updateScene(dt, scenes, onDone) {
  sceneTimer += dt;
  if (sceneTimer >= scenes[sceneIndex].duration) {
    sceneTimer = 0;
    sceneIndex += 1;
    if (sceneIndex >= scenes.length) {
      onDone();
    }
  }
}

function updatePlayer(dt) {
  let moveX = 0;
  let moveY = 0;

  if (keys.has("arrowleft") || keys.has("a")) moveX -= 1;
  if (keys.has("arrowright") || keys.has("d")) moveX += 1;
  if (keys.has("arrowup") || keys.has("w")) moveY -= 1;
  if (keys.has("arrowdown") || keys.has("s")) moveY += 1;

  const moveLength = Math.hypot(moveX, moveY) || 1;
  player.x += (moveX / moveLength) * player.speed * dt;
  player.y += (moveY / moveLength) * player.speed * dt;

  if (
    gameState === "castleInside" ||
    gameState === "escape" ||
    gameState === "tunnel" ||
    gameState === "forestEscape" ||
    gameState === "prison" ||
    gameState === "rooms" ||
    gameState === "finalBoss"
  ) {
    player.x = clamp(player.x, 62, castleRoom.width - 62);
    player.y = clamp(player.y, 105, castleRoom.height - 68);
  } else {
    player.x = clamp(player.x, player.radius, world.width - player.radius);
    player.y = clamp(player.y, 320, world.height - 250);
  }

  player.bowReload = Math.max(0, player.bowReload - dt);
  player.swordReload = Math.max(0, player.swordReload - dt);
  player.swordTime = Math.max(0, player.swordTime - dt);
  player.invincible = Math.max(0, player.invincible - dt);
}

function updateBrother(dt) {
  if (!brother.rescued) {
    return;
  }

  if (distance(player, brother) > 54) {
    const angle = Math.atan2(player.y - brother.y, player.x - brother.x);
    brother.x += Math.cos(angle) * 185 * dt;
    brother.y += Math.sin(angle) * 185 * dt;
  }

  if (gameState === "timedRun") {
    brother.x = clamp(brother.x, player.radius, world.width - player.radius);
    brother.y = clamp(brother.y, 320, world.height - 250);
  } else {
    brother.x = clamp(brother.x, 62, castleRoom.width - 62);
    brother.y = clamp(brother.y, 105, castleRoom.height - 68);
  }
}

function spawnEscapeGuards() {
  const guards = [
    { x: 360, y: 205 },
    { x: 440, y: 405 },
    { x: 610, y: 235 },
    { x: 650, y: 420 },
  ];

  guards.forEach((guard, index) => {
    skeletons.push(makeSkeleton({
      x: guard.x,
      y: guard.y,
      homeX: guard.x,
      homeY: guard.y,
      speed: 92,
      health: 3,
      variant: chooseSkeletonVariant(index + 2),
    }));
  });
}

function checkEscapeExit() {
  if (gameState !== "escape" || escapeComplete) {
    return;
  }

  if (player.x < 150 && player.y > 220 && player.y < 380 && distance(player, brother) < 120) {
    escapeComplete = true;
    startTunnelLevel();
  }
}

function startTunnelLevel() {
  gameState = "tunnel";
  insideCastle = true;
  player.x = 125;
  player.y = 300;
  brother.x = 82;
  brother.y = 328;
  player.health = Math.min(100, player.health + 20);
  player.arrows += 8;
  player.fireArrows += 1;
  skeletons = [];
  shots = [];
  spawnTunnelGuards();
  score += 150;
  addFloatingText(250, 230, "Gizli tunele girdiniz!", "#ffe6a1");
  playSound("victory");
  burst(player.x, player.y, "#ffd36b", 36);
}

function spawnTunnelGuards() {
  const guards = [
    { x: 360, y: 275 },
    { x: 520, y: 390 },
    { x: 650, y: 225 },
    { x: 770, y: 350 },
  ];

  guards.forEach((guard, index) => {
    skeletons.push(makeSkeleton({
      x: guard.x,
      y: guard.y,
      homeX: guard.x,
      homeY: guard.y,
      speed: 100,
      health: 3,
      variant: chooseSkeletonVariant(index + 4),
    }));
  });
}

function checkTunnelExit() {
  if (gameState !== "tunnel" || tunnelComplete) {
    return;
  }

  if (player.x > 810 && player.y > 210 && player.y < 390 && distance(player, brother) < 130) {
    tunnelComplete = true;
    startForestEscapeLevel();
  }
}

function startForestEscapeLevel() {
  gameState = "forestEscape";
  insideCastle = true;
  player.x = 135;
  player.y = 315;
  brother.x = 90;
  brother.y = 345;
  player.health = Math.min(100, player.health + 25);
  player.arrows += 10;
  player.fireArrows += 2;
  skeletons = [];
  shots = [];
  spawnForestChasers();
  score += 200;
  addFloatingText(270, 240, "Ormana kactiniz!", "#ffe6a1");
  playSound("victory");
  burst(player.x, player.y, "#ffd36b", 42);
}

function spawnForestChasers() {
  const chasers = [
    { x: 160, y: 175 },
    { x: 255, y: 425 },
    { x: 420, y: 230 },
    { x: 565, y: 390 },
    { x: 690, y: 250 },
  ];

  chasers.forEach((chaser, index) => {
    skeletons.push(makeSkeleton({
      x: chaser.x,
      y: chaser.y,
      homeX: chaser.x,
      homeY: chaser.y,
      speed: 108,
      health: 3,
      variant: chooseSkeletonVariant(index + 5),
    }));
  });
}

function checkForestExit() {
  if (gameState !== "forestEscape" || forestComplete) {
    return;
  }

  if (player.x > 810 && player.y > 215 && player.y < 390 && distance(player, brother) < 130) {
    forestComplete = true;
    skeletons = [];
    shots = [];
    score += 250;
    gameState = "capture";
    sceneIndex = 0;
    sceneTimer = 0;
    playSound("victory");
    burst(player.x, player.y, "#ffd36b", 54);
  }
}

function startPrisonLevel() {
  gameState = "prison";
  insideCastle = true;
  doorHits = 0;
  prisonDoorOpen = false;
  brother.rescued = false;
  player.x = 170;
  player.y = 310;
  brother.x = 245;
  brother.y = 330;
  skeletons = [];
  shots = [];
  setCheckpoint("prison", player.x, player.y, "Guvenlikli zindan");
  addFloatingText(520, 238, "Kapiya kiliçla 10 kez vur!", "#ffe6a1");
  updateHud();
}

function checkPrisonExit() {
  if (gameState !== "prison" || !prisonDoorOpen) {
    return;
  }

  if (player.x > 810 && distance(player, brother) < 150) {
    startRoomLevel(1);
  }
}

function startRoomLevel(number) {
  gameState = "rooms";
  insideCastle = true;
  roomNumber = number;
  roomCleared = false;
  brother.rescued = true;
  player.x = 105;
  player.y = 300;
  brother.x = 70;
  brother.y = 330;
  skeletons = [];
  shots = [];
  setCheckpoint("rooms", player.x, player.y, `Oda ${roomNumber}`);
  spawnRoomEnemies();
  addFloatingText(480, 92, `Oda ${roomNumber}/10`, "#ffe6a1");
  updateHud();
}

function spawnRoomEnemies() {
  roomCleared = false;
  skeletons = [];
  const count = Math.min(3 + roomNumber, 12);

  for (let i = 0; i < count; i += 1) {
    const x = 315 + ((i * 137) % 470);
    const y = 170 + ((i * 91) % 250);
    skeletons.push(makeSkeleton({
      x,
      y,
      homeX: x,
      homeY: y,
      speed: 88 + roomNumber * 4,
      health: 2 + Math.floor(roomNumber / 3),
      variant: chooseSkeletonVariant(i + roomNumber),
    }));
  }
}

function checkRoomExit() {
  if (gameState !== "rooms") {
    return;
  }

  if (skeletons.length === 0 && !roomCleared) {
    roomCleared = true;
    addFloatingText(800, 250, "Kapi acildi!", "#ffe6a1");
    playSound("pickup");
  }

  if (roomCleared && player.x > 820 && distance(player, brother) < 145) {
    if (roomNumber >= 10) {
      startFinalBoss();
    } else {
      startRoomLevel(roomNumber + 1);
    }
  }
}

function startFinalBoss() {
  gameState = "finalBoss";
  insideCastle = true;
  finalBossDefeated = false;
  player.x = 120;
  player.y = 310;
  brother.x = 75;
  brother.y = 340;
  skeletons = [];
  shots = [];
  setCheckpoint("finalBoss", player.x, player.y, "Son boss");
  spawnFinalBoss();
  addFloatingText(560, 130, "Kral geri dondu!", "#ffe6a1");
  playSound("boss");
}

function startTimedPotionRun() {
  gameState = "timedRun";
  timedRunTarget = "cure";
  timedRunTimer = 60;
  timedPotion.collected = false;
  insideCastle = false;
  currentMap = "forest";
  storedPlayerSpeed = player.speed;
  player.speed = Math.max(player.speed, player.baseSpeed + 180);
  player.x = world.campX;
  player.y = world.campY;
  brother.rescued = false;
  skeletons = [];
  shots = [];
  addFloatingText(player.x + 110, player.y - 60, "Bolum: Son - siseyi gercekten al!", "#ffe6a1");
  burst(player.x, player.y, "#d9f0ff", 42);
  playSound("boss");
  updateHud();
}

function startRewindEscapeRun() {
  gameState = "timedRun";
  timedRunTarget = "rewind";
  timedRunTimer = 60;
  insideCastle = false;
  currentMap = "forest";
  player.speed = Math.max(player.speed, player.baseSpeed + 210);
  player.x = world.castleX - 95;
  player.y = world.castleY;
  brother.rescued = true;
  brother.x = player.x - 38;
  brother.y = player.y + 30;
  skeletons = [];
  shots = [];
  addFloatingText(player.x - 60, player.y - 70, "Kampa kos!", "#ffe6a1");
  burst(player.x, player.y, "#d9f0ff", 48);
  playSound("boss");
  updateHud();
}

function updateTimedRun(dt) {
  timedRunTimer = Math.max(0, timedRunTimer - dt);

  if (timedRunTarget === "cure" && !timedPotion.collected && distance(player, timedPotion) < timedPotion.radius + player.radius) {
    timedPotion.collected = true;
    addFloatingText(timedPotion.x, timedPotion.y - 62, "Iskelet iksiri sandigin sise alindi!", "#d9f0ff");
    burst(timedPotion.x, timedPotion.y, "#6ed0ff", 42);
    playSound("pickup");
    player.speed = storedPlayerSpeed;
    gameState = "cureThrow";
    sceneIndex = 0;
    sceneTimer = 0;
    score += 400;
    burst(player.x, player.y, "#ffd36b", 52);
    playSound("victory");
    return;
  }

  if (timedRunTarget === "rewind" && distance(player, { x: world.campX, y: world.campY }) < 150) {
    player.speed = storedPlayerSpeed;
    gameState = "rewindSuccess";
    sceneIndex = 0;
    sceneTimer = 0;
    score += 400;
    burst(player.x, player.y, "#ffd36b", 52);
    playSound("victory");
    return;
  }

  if (timedRunTimer <= 0) {
    player.speed = storedPlayerSpeed;
    gameState = timedRunTarget === "cure" ? "badEnding" : "badEnding";
    timedRunTarget = "rewind";
    sceneIndex = 0;
    sceneTimer = 0;
    skeletons = [];
    shots = [];
    playSound("death");
  }
}

function spawnFinalBoss() {
  skeletons = skeletons.filter((skeleton) => skeleton.type !== "finalKing");
  skeletons.push({
    type: "finalKing",
    x: 660,
    y: 280,
    homeX: 660,
    homeY: 280,
    radius: 40,
    speed: 128,
    health: 36,
    rise: 1,
    hitFlash: 0,
    knockbackX: 0,
    knockbackY: 0,
    wander: 0,
  });
}

function updateArrowPickups() {
  for (const pickup of arrowPickups) {
    if (!pickup.collected && distance(player, pickup) < 42) {
      pickup.collected = true;
      const fireBonus = pickup.amount >= 9 ? 2 : 1;
      player.arrows += pickup.amount;
      player.fireArrows += fireBonus;
      addFloatingText(pickup.x, pickup.y - 34, `+${pickup.amount} ok, +${fireBonus} ates`, "#ffe6a1");
      playSound("pickup");
      burst(pickup.x, pickup.y, "#f6d16d", 14);
    }
  }
}

function isHealthPickupActive(pickup) {
  if (pickup.collected || pickup.state !== gameState) {
    return false;
  }

  if (pickup.state === "rooms") {
    return pickup.room === roomNumber;
  }

  return true;
}

function updateHealthPickups() {
  for (const pickup of healthPickups) {
    if (!isHealthPickupActive(pickup)) {
      continue;
    }

    if (distance(player, pickup) < 42) {
      pickup.collected = true;
      player.health = Math.min(100, player.health + pickup.amount);
      addFloatingText(pickup.x, pickup.y - 34, `+${pickup.amount} can`, "#ffb3a7");
      playSound("pickup");
      burst(pickup.x, pickup.y, "#e15b4f", 16);
    }
  }
}

function updateSecretChests() {
  if (insideCastle) {
    return;
  }

  for (const chest of secretChests) {
    if (chest.opened || distance(player, chest) >= 46) {
      continue;
    }

    chest.opened = true;
    coins += chest.coins;
    player.arrows += chest.arrows;
    player.fireArrows += chest.fireArrows;
    score += 25;
    addFloatingText(chest.x, chest.y - 44, `Gizli sandik! +${chest.coins} TL`, "#ffd36b");
    playSound("pickup");
    burst(chest.x, chest.y, "#ffd36b", 34);
  }
}

function updateShop() {
  if (insideCastle || distance(player, { x: world.campX + 165, y: world.campY + 45 }) > 105) {
    return;
  }

  if (performance.now() - lastShopHint < 1400) {
    return;
  }

  lastShopHint = performance.now();
  const offer = shopOffer();
  addFloatingText(world.campX + 165, world.campY - 28, `Magaza: B - ${offer.text}`, "#ffe6a1");
}

function shopOffer() {
  const offers = [
    { cost: 40, text: "40 TL hizli ok", apply: () => { player.arrows += 18; player.fireArrows += 2; } },
    { cost: 70, text: "70 TL guclu kilic", apply: () => { player.swordDamage += 1; } },
    { cost: 90, text: "90 TL fazla can", apply: () => { player.maxHealth += 25; player.health = player.maxHealth; } },
    { cost: 110, text: "110 TL hizli kosu", apply: () => { player.speed += 35; } },
  ];

  return offers[Math.min(shopLevel, offers.length - 1)];
}

function buyShopUpgrade() {
  if (insideCastle || distance(player, { x: world.campX + 165, y: world.campY + 45 }) > 120) {
    addFloatingText(player.x, player.y - 48, "Magazaya yaklas!", "#ffe6a1");
    return;
  }

  const offer = shopOffer();
  if (coins < offer.cost) {
    addFloatingText(player.x, player.y - 48, "Para yetmedi!", "#ffb3a7");
    playSound("hit");
    return;
  }

  coins -= offer.cost;
  offer.apply();
  shopLevel += 1;
  addFloatingText(player.x, player.y - 62, "Yukseltme alindi!", "#ffd36b");
  playSound("pickup");
  burst(player.x, player.y, "#ffd36b", 30);
  updateHud();
}

function updateTeapot() {
  if (insideCastle || distance(player, teapot) > 120) {
    return;
  }

  if (performance.now() - lastTeapotHint < 1800) {
    return;
  }

  lastTeapotHint = performance.now();
  addFloatingText(teapot.x, teapot.y - 58, "Yasli Demlik Usta: T ile konus", "#d9f0ff");
}

function talkToTeapot() {
  if (insideCastle || distance(player, teapot) > 135) {
    addFloatingText(player.x, player.y - 48, "Demlige yaklas!", "#ffe6a1");
    return;
  }

  teapotDialogOpen = true;
  teapotDialogIndex = 0;
  playSound("pickup");
  burst(teapot.x, teapot.y - 18, "#d9f0ff", 18);
}

function advanceTeapotDialog() {
  if (!teapotDialogOpen) {
    return;
  }

  teapotDialogIndex += 1;
  playSound("cutscene");

  if (teapotDialogIndex >= teapotDialogLines.length) {
    teapotDialogOpen = false;
    teapot.messageIndex += 1;
  }
}

function updateSpawns() {
  for (const pit of spawnPits) {
    if (!pit.triggered && distance(player, pit) < 290) {
      pit.triggered = true;
      addFloatingText(pit.x, pit.y - 42, "Kemikler kipirdiyor!", "#ffe6a1");
      for (let i = 0; i < pit.count; i += 1) {
        const angle = (Math.PI * 2 * i) / pit.count + Math.random() * 0.45;
        const spread = 42 + Math.random() * 72;
        skeletons.push(makeSkeleton({
          x: pit.x + Math.cos(angle) * spread,
          y: pit.y + Math.sin(angle) * spread,
          homeX: pit.x,
          homeY: pit.y,
          rise: 0,
          speed: 78 + Math.random() * 32,
          variant: chooseSkeletonVariant(i + pit.count),
        }));
      }
    }
  }
}

function chooseSkeletonVariant(seed) {
  if (seed % 7 === 0) {
    return "big";
  }

  if (seed % 4 === 0) {
    return "fast";
  }

  return "normal";
}

function makeSkeleton(options) {
  const variant = options.variant || "normal";
  const stats = {
    normal: { radius: 17, speed: 1, health: 0, damage: 11, color: "#ece7d4" },
    fast: { radius: 14, speed: 1.45, health: -1, damage: 8, color: "#d9f0ff" },
    big: { radius: 24, speed: 0.72, health: 3, damage: 17, color: "#d8c2a0" },
  }[variant];

  return {
    x: options.x,
    y: options.y,
    homeX: options.homeX ?? options.x,
    homeY: options.homeY ?? options.y,
    type: options.type,
    variant,
    radius: options.radius ?? stats.radius,
    speed: (options.speed ?? 90) * stats.speed,
    health: Math.max(1, (options.health ?? 3) + stats.health),
    damage: options.damage ?? stats.damage,
    boneColor: options.boneColor ?? stats.color,
    rise: options.rise ?? 1,
    hitFlash: 0,
    knockbackX: 0,
    knockbackY: 0,
    wander: options.wander ?? Math.random() * Math.PI * 2,
  };
}

function updateSkeletons(dt) {
  for (const skeleton of skeletons) {
    skeleton.hitFlash = Math.max(0, skeleton.hitFlash - dt);

    if (skeleton.rise < 1) {
      skeleton.rise = Math.min(1, skeleton.rise + dt * 1.25);
      continue;
    }

    const playerDistance = distance(player, skeleton);
    let targetX = skeleton.homeX + Math.cos(skeleton.wander) * 85;
    let targetY = skeleton.homeY + Math.sin(skeleton.wander) * 85;

    if (playerDistance < 260) {
      targetX = player.x;
      targetY = player.y;
    } else {
      skeleton.wander += dt * 0.9;
    }

    const angle = Math.atan2(targetY - skeleton.y, targetX - skeleton.x);
    skeleton.x += Math.cos(angle) * skeleton.speed * dt;
    skeleton.y += Math.sin(angle) * skeleton.speed * dt;
    skeleton.x += skeleton.knockbackX * dt;
    skeleton.y += skeleton.knockbackY * dt;
    skeleton.knockbackX *= 0.86;
    skeleton.knockbackY *= 0.86;

    if (playerDistance < player.radius + skeleton.radius && player.invincible <= 0) {
      player.health -= skeleton.damage || 11;
      player.invincible = 0.55;
      burst(player.x, player.y, "#e15b4f", 12);

      if (player.health <= 0) {
        triggerDeath();
      }
    }
  }
}

function updateShots(dt) {
  for (const shot of shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
  }

  shots = shots.filter((shot) => (
    shot.life > 0 &&
    shot.x > -80 &&
    shot.x < world.width + 80 &&
    shot.y > -80 &&
    shot.y < world.height + 80
  ));
}

function updateHits() {
  for (const shot of shots) {
    if (shot.life <= 0) {
      continue;
    }

    for (const skeleton of skeletons) {
      if (skeleton.rise >= 1 && distance(shot, skeleton) < shot.radius + skeleton.radius) {
        shot.life = 0;
        skeleton.health -= shot.fire ? 2 : 1;
        skeleton.hitFlash = 0.08;
        playSound("hit");
        burst(skeleton.x, skeleton.y, shot.fire ? "#ff8a3d" : "#f4f0df", shot.fire ? 18 : 8);

        if (shot.fire) {
          screenShake = Math.max(screenShake, 0.12);
          for (const other of skeletons) {
            if (other !== skeleton && other.rise >= 1 && distance(skeleton, other) < 92) {
              other.health -= 1;
              other.hitFlash = 0.12;
              burst(other.x, other.y, "#ffb347", 8);
            }
          }
        }
        break;
      }
    }
  }

  const defeatedKing = insideCastle && gameState === "castleInside" && skeletons.find((skeleton) => (
    skeleton.type === "king" && skeleton.health <= 0
  ));
  const defeatedFinalKing = gameState === "finalBoss" && skeletons.find((skeleton) => (
    skeleton.type === "finalKing" && skeleton.health <= 0
  ));
  const before = skeletons.length;
  skeletons = skeletons.filter((skeleton) => skeleton.health > 0);
  const defeated = before - skeletons.length;

  if (defeated > 0) {
    score += defeated * 10;
    player.arrows += defeated;
    burst(player.x, player.y, "#ffe6a1", defeated * 2);
  }

  if (defeatedKing) {
    triggerVictory(defeatedKing);
  }

  if (defeatedFinalKing) {
    triggerEnding(defeatedFinalKing);
  }
}

function triggerEnding(boss = player) {
  finalBossDefeated = true;
  gameState = "postBoss";
  sceneIndex = 0;
  sceneTimer = 0;
  skeletons = [];
  shots = [];
  score += 500;
  playSound("victory");
  bossExplosion(boss.x, boss.y, true);
  updateHud();
}

function showSkeletonWarsTwoEnding() {
  gameState = "ending";
  sceneIndex = 0;
  sceneTimer = 0;
  player.speed = storedPlayerSpeed;
  skeletons = [];
  shots = [];
  playSound("victory");
  updateHud();
}

function updateParticles(dt) {
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  particles = particles.filter((particle) => particle.life > 0);
}

function updateFloatingTexts(dt) {
  for (const text of floatingTexts) {
    text.y -= 22 * dt;
    text.life -= dt;
  }
  floatingTexts = floatingTexts.filter((text) => text.life > 0);
}

function checkCastle() {
  if (!insideCastle && distance(player, { x: world.castleX, y: world.castleY }) < 92) {
    enterCastle();
    return;
  }

  if (!reachedCastle && distance(player, { x: world.castleX, y: world.castleY }) < 135) {
    reachedCastle = true;
    score += 100;
    addFloatingText(player.x, player.y - 60, "Kapiya yaklas!", "#ffe6a1");
    burst(player.x, player.y, "#ffd36b", 36);
  }
}

function enterCastle() {
  insideCastle = true;
  reachedCastle = true;
  kingDefeated = false;
  escapeComplete = false;
  tunnelComplete = false;
  forestComplete = false;
  brother.rescued = false;
  gameState = "castleInside";
  player.x = castleRoom.entranceX;
  player.y = castleRoom.entranceY;
  player.arrows += 10;
  skeletons = [];
  shots = [];
  score += 100;
  setCheckpoint("castleInside", castleRoom.entranceX, castleRoom.entranceY, "Kale girisi");
  playSound("boss");
  spawnCastleBoss();
  addFloatingText(player.x + 145, player.y - 80, "Kaleye girdin!", "#ffe6a1");
  addFloatingText(585, 210, "Iskelet Krali!", "#ffe6a1");
  burst(player.x, player.y, "#ffd36b", 32);
}

function spawnCastleBoss() {
  skeletons = skeletons.filter((skeleton) => skeleton.type !== "king");
  skeletons.push({
    type: "king",
    x: 585,
    y: 275,
    homeX: 585,
    homeY: 275,
    radius: 32,
    speed: 92,
    health: 18,
    rise: 1,
    hitFlash: 0,
    knockbackX: 0,
    knockbackY: 0,
    wander: 0,
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDifference(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 130;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 2 + Math.random() * 4,
      life: 0.35 + Math.random() * 0.4,
    });
  }
}

function bossExplosion(x, y, finalBlast) {
  screenShake = Math.max(screenShake, finalBlast ? 0.65 : 0.42);
  burst(x, y, "#ffd36b", finalBlast ? 120 : 78);
  burst(x, y, "#ff8a3d", finalBlast ? 82 : 48);
  burst(x, y, "#f4f0df", finalBlast ? 70 : 38);
  addFloatingText(x, y - 82, finalBlast ? "BUYUK PATLAMA!" : "KRAL PATLADI!", "#ffd36b");
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 1.8 });
}

function draw() {
  updateCamera();
  updateMouseWorld();
  ctx.save();
  if (screenShake > 0) {
    const shake = screenShake * 18;
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }

  if (gameState === "ending") {
    drawEnding();
    drawParticles();
    drawFloatingTexts();
    ctx.restore();
    return;
  } else if (gameState === "prison") {
    drawPrison();
  } else if (gameState === "rooms" || gameState === "finalBoss") {
    drawChallengeRoom();
  } else if (gameState === "forestEscape") {
    drawForestEscape();
  } else if (gameState === "tunnel") {
    drawTunnel();
  } else if (gameState === "castleInside" || gameState === "victory" || gameState === "escape") {
    drawCastleInterior();
  } else {
    drawWorld();
    drawArrowPickups();
    drawSecretChests();
    drawTimedPotion();
    drawShop();
    drawPits();
  }
  drawParticles();
  drawHealthPickups();
  drawShots();
  drawSkeletons();
  drawPlayer();
  drawBrother();
  drawAtmosphere();
  drawFloatingTexts();
  drawAimLine();
  drawMiniMap();

  if (gameState === "intro") {
    drawCinematic(storyScenes, "Bosluk veya tiklama: gec");
  } else if (gameState === "introVideo") {
    drawMessage("Hikaye Videosu", "Video bitince oyun baslayacak.");
  } else if (gameState === "death") {
    drawCinematic(deathScenes, "Tikla veya bosluk: devam");
  } else if (gameState === "victory") {
    drawCinematic(victoryScenes, "Tikla veya bosluk: devam");
  } else if (gameState === "capture") {
    drawCinematic(captureScenes, "Tikla veya bosluk: devam");
  } else if (gameState === "postBoss") {
    drawCinematic(postBossScenes, "Tikla veya bosluk: devam");
  } else if (gameState === "cureThrow") {
    drawCinematic(cureThrowScenes, "Tikla veya bosluk: devam");
  } else if (gameState === "badEnding") {
    drawCinematic(badEndingScenes, "Tikla veya bosluk: devam");
  } else if (gameState === "rewindSuccess") {
    drawCinematic(rewindSuccessScenes, "Tikla veya bosluk: devam");
  } else if (gameState === "castleInside" || gameState === "escape" || gameState === "tunnel" || gameState === "forestEscape") {
    drawCastleInsideMessage();
  } else if (gameState === "prison" || gameState === "rooms" || gameState === "finalBoss") {
    drawCastleInsideMessage();
  } else if (gameState === "timedRun") {
    drawTimedRunMessage();
  }
  if (teapotDialogOpen) {
    drawTeapotDialog();
  }
  ctx.restore();
}

function updateCamera() {
  if (insideCastle) {
    camera.x = 0;
    camera.y = 0;
    return;
  }

  camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function worldToScreen(x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

function drawWorld() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ground = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ground.addColorStop(0, "#1f3b23");
  ground.addColorStop(0.48, "#263f22");
  ground.addColorStop(1, "#182818");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGroundPattern();
  drawPath();
  drawCamp();
  drawTeapot();
  drawCastle();
  drawTrees();
}

function drawGroundPattern() {
  ctx.strokeStyle = "rgba(235, 219, 155, 0.08)";
  ctx.lineWidth = 2;
  const startX = Math.floor(camera.x / 120) * 120 - camera.x;
  const startY = Math.floor(camera.y / 90) * 90 - camera.y;

  for (let x = startX; x < canvas.width + 120; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 90, canvas.height);
    ctx.stroke();
  }

  ctx.fillStyle = "#334927";
  for (let i = 0; i < 105; i += 1) {
    const worldX = (i * 173) % world.width;
    const worldY = 260 + ((i * 97) % 980);
    const point = worldToScreen(worldX, worldY);
    if (point.x > -30 && point.x < canvas.width + 30 && point.y > -30 && point.y < canvas.height + 30) {
      ctx.fillRect(point.x, point.y, 22, 6);
    }
  }

  for (let i = 0; i < 150; i += 1) {
    const worldX = (i * 211) % world.width;
    const worldY = 290 + ((i * 137) % 950);
    const point = worldToScreen(worldX, worldY);
    if (point.x > -12 && point.x < canvas.width + 12 && point.y > -12 && point.y < canvas.height + 12) {
      ctx.fillStyle = i % 5 === 0 ? "rgba(255, 211, 107, 0.25)" : "rgba(190, 220, 155, 0.22)";
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, 2 + (i % 3), 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPath() {
  const pathPoints = [
    [world.campX, world.campY],
    [620, 710],
    [1000, 850],
    [1380, 635],
    [1770, 825],
    [2190, 680],
    [2630, 830],
    [3050, 700],
    [3460, 880],
    [3840, 620],
    [4250, 835],
    [4680, 675],
    [world.castleX, world.castleY],
  ];

  ctx.strokeStyle = "rgba(26, 18, 12, 0.45)";
  ctx.lineWidth = 90;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < pathPoints.length; i += 1) {
    const point = worldToScreen(pathPoints[i][0], pathPoints[i][1]);
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = "#6b5530";
  ctx.lineWidth = 72;
  ctx.stroke();

  const path = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  path.addColorStop(0, "#b38a4a");
  path.addColorStop(0.5, "#9a7a43");
  path.addColorStop(1, "#755a32");
  ctx.strokeStyle = path;
  ctx.lineWidth = 44;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 235, 180, 0.16)";
  ctx.lineWidth = 5;
  ctx.setLineDash([18, 28]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCamp() {
  const camp = worldToScreen(world.campX, world.campY);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(camp.x, camp.y + 55, 150, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#47301c";
  ctx.fillRect(camp.x - 90, camp.y + 30, 170, 50);
  ctx.fillStyle = "#b44b37";
  ctx.beginPath();
  ctx.moveTo(camp.x - 78, camp.y + 30);
  ctx.lineTo(camp.x - 20, camp.y - 35);
  ctx.lineTo(camp.x + 38, camp.y + 30);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#f0c46a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(camp.x - 20, camp.y - 35);
  ctx.lineTo(camp.x - 20, camp.y + 30);
  ctx.stroke();

  const fireGlow = ctx.createRadialGradient(camp.x + 95, camp.y + 28, 4, camp.x + 95, camp.y + 28, 78);
  fireGlow.addColorStop(0, "rgba(255, 211, 107, 0.5)");
  fireGlow.addColorStop(1, "rgba(255, 211, 107, 0)");
  ctx.fillStyle = fireGlow;
  ctx.beginPath();
  ctx.arc(camp.x + 95, camp.y + 28, 78, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd36b";
  ctx.beginPath();
  ctx.arc(camp.x + 95, camp.y + 28, 16 + Math.sin(performance.now() / 120) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7b3d20";
  ctx.fillRect(camp.x + 75, camp.y + 43, 42, 8);

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Kamp", camp.x, camp.y + 105);
}

function drawTeapot() {
  const point = worldToScreen(teapot.x, teapot.y);
  if (point.x < -80 || point.x > canvas.width + 80 || point.y < -100 || point.y > canvas.height + 100) {
    return;
  }

  const steam = Math.sin(performance.now() / 220);
  ctx.save();
  ctx.translate(point.x, point.y);

  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 42, 44, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(217, 240, 255, 0.62)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-18 + i * 18, -44);
    ctx.bezierCurveTo(-32 + i * 18 + steam * 4, -68, -5 + i * 14, -78, -18 + i * 18, -102);
    ctx.stroke();
  }

  const body = ctx.createRadialGradient(-14, -10, 6, 0, 6, 58);
  body.addColorStop(0, "#e8edf7");
  body.addColorStop(0.65, "#8ba6b8");
  body.addColorStop(1, "#4d6470");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 8, 46, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d9f0ff";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#5e7480";
  ctx.fillRect(-20, -34, 40, 18);
  ctx.fillStyle = "#d9f0ff";
  ctx.beginPath();
  ctx.arc(0, -39, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#d9f0ff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(-43, 4, 22, Math.PI * 0.55, Math.PI * 1.45);
  ctx.stroke();

  ctx.fillStyle = "#8ba6b8";
  ctx.beginPath();
  ctx.moveTo(38, -4);
  ctx.lineTo(74, -20);
  ctx.lineTo(48, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d9f0ff";
  ctx.stroke();

  ctx.fillStyle = "#111712";
  ctx.fillRect(-15, -2, 7, 10);
  ctx.fillRect(9, -2, 7, 10);
  ctx.fillStyle = "#fff0bd";
  ctx.fillRect(-17, -10, 12, 4);
  ctx.fillRect(7, -10, 12, 4);

  ctx.strokeStyle = "#fff0bd";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-3, 15);
  ctx.quadraticCurveTo(-18, 25, -34, 16);
  ctx.moveTo(3, 15);
  ctx.quadraticCurveTo(18, 25, 34, 16);
  ctx.stroke();

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Demlik Usta", 0, 68);
  ctx.restore();
}

function drawTeapotDialog() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#151a1d";
  ctx.fillRect(110, 330, 740, 150);
  ctx.strokeStyle = "#d9f0ff";
  ctx.lineWidth = 4;
  ctx.strokeRect(110, 330, 740, 150);

  ctx.fillStyle = "#24313a";
  ctx.fillRect(132, 350, 120, 108);
  ctx.strokeStyle = "#8ba6b8";
  ctx.strokeRect(132, 350, 120, 108);

  ctx.translate(192, 408);
  ctx.scale(0.82, 0.82);
  drawTeapotFaceIcon();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = "#ffd36b";
  ctx.font = "700 22px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Yasli Demlik Usta", 280, 370);

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 24px Arial";
  wrapText(teapotDialogLines[teapotDialogIndex] || "", 280, 408, 520, 32);

  ctx.fillStyle = "#c6d6b9";
  ctx.font = "15px Arial";
  ctx.textAlign = "right";
  ctx.fillText("T / Bosluk: devam    Esc: kapat", 826, 458);
  ctx.restore();
}

function drawTeapotFaceIcon() {
  ctx.fillStyle = "#8ba6b8";
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d9f0ff";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#d9f0ff";
  ctx.beginPath();
  ctx.arc(0, -44, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111712";
  ctx.fillRect(-17, -8, 8, 12);
  ctx.fillRect(10, -8, 8, 12);
  ctx.strokeStyle = "#fff0bd";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-4, 16);
  ctx.quadraticCurveTo(-22, 28, -38, 14);
  ctx.moveTo(4, 16);
  ctx.quadraticCurveTo(22, 28, 38, 14);
  ctx.stroke();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, y);
  }
}

function drawCastle() {
  const gate = worldToScreen(world.castleX, world.castleY);
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(gate.x, gate.y + 78, 145, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#39383e";
  ctx.fillRect(gate.x - 105, gate.y - 105, 210, 175);
  ctx.fillStyle = "#4a4950";
  for (let x = -88; x <= 76; x += 42) {
    for (let y = -86; y <= 36; y += 34) {
      ctx.fillRect(gate.x + x, gate.y + y, 26, 13);
    }
  }
  ctx.fillStyle = "#2d2c33";
  ctx.fillRect(gate.x - 76, gate.y - 145, 45, 55);
  ctx.fillRect(gate.x + 31, gate.y - 145, 45, 55);
  ctx.fillStyle = "#17151a";
  ctx.fillRect(gate.x - 34, gate.y - 18, 68, 88);
  ctx.fillStyle = "#d9d0c1";
  ctx.beginPath();
  ctx.arc(gate.x, gate.y - 72, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#181719";
  ctx.fillRect(gate.x - 10, gate.y - 86, 8, 10);
  ctx.fillRect(gate.x + 8, gate.y - 86, 8, 10);
  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Iskelet Kralligi", gate.x, gate.y + 102);
}

function drawTrees() {
  for (let i = 0; i < 80; i += 1) {
    const x = 80 + ((i * 239) % (world.width - 160));
    const y = 160 + ((i * 151) % (world.height - 320));
    const point = worldToScreen(x, y);

    if (point.x < -40 || point.x > canvas.width + 40 || point.y < -70 || point.y > canvas.height + 70) {
      continue;
    }

    ctx.fillStyle = "#4b301c";
    ctx.fillRect(point.x - 5, point.y + 4, 10, 30);
    ctx.fillStyle = "#1d5a32";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPits() {
  for (const pit of spawnPits) {
    const point = worldToScreen(pit.x, pit.y);
    ctx.fillStyle = pit.triggered ? "#2a231c" : "#3f3429";
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, 52, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#806348";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawArrowPickups() {
  for (const pickup of arrowPickups) {
    if (pickup.collected) {
      continue;
    }

    const point = worldToScreen(pickup.x, pickup.y);

    if (point.x < -50 || point.x > canvas.width + 50 || point.y < -50 || point.y > canvas.height + 50) {
      continue;
    }

    ctx.save();
    ctx.translate(point.x, point.y + Math.sin(performance.now() / 250 + pickup.x) * 4);
    ctx.fillStyle = "#5b351d";
    ctx.fillRect(-22, -13, 44, 26);
    ctx.strokeStyle = "#d5b25c";
    ctx.lineWidth = 3;
    ctx.strokeRect(-22, -13, 44, 26);

    ctx.strokeStyle = "#f6d16d";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const x = -13 + i * 8;
      ctx.beginPath();
      ctx.moveTo(x, -23);
      ctx.lineTo(x + 8, 8);
      ctx.stroke();
      ctx.fillStyle = "#f4f0df";
      ctx.beginPath();
      ctx.moveTo(x + 9, 10);
      ctx.lineTo(x + 2, 1);
      ctx.lineTo(x + 13, 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#fff0bd";
    ctx.font = "700 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`+${pickup.amount}`, 0, 33);
    ctx.restore();
  }
}

function drawSecretChests() {
  for (const chest of secretChests) {
    if (chest.opened) {
      continue;
    }

    const point = worldToScreen(chest.x, chest.y);
    if (point.x < -60 || point.x > canvas.width + 60 || point.y < -60 || point.y > canvas.height + 60) {
      continue;
    }

    ctx.save();
    ctx.translate(point.x, point.y + Math.sin(performance.now() / 260 + chest.x) * 4);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 24, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5b351d";
    ctx.fillRect(-28, -14, 56, 34);
    ctx.fillStyle = "#8f5725";
    ctx.fillRect(-28, -24, 56, 18);
    ctx.strokeStyle = "#ffd36b";
    ctx.lineWidth = 4;
    ctx.strokeRect(-28, -24, 56, 44);
    ctx.fillStyle = "#ffd36b";
    ctx.fillRect(-6, -6, 12, 14);
    ctx.fillStyle = "#fff0bd";
    ctx.font = "700 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Gizli", 0, 39);
    ctx.restore();
  }
}

function drawTimedPotion() {
  if (gameState !== "timedRun" || timedRunTarget !== "cure" || timedPotion.collected) {
    return;
  }

  const point = worldToScreen(timedPotion.x, timedPotion.y);
  if (point.x < -80 || point.x > canvas.width + 80 || point.y < -80 || point.y > canvas.height + 80) {
    return;
  }

  const pulse = 0.5 + Math.sin(performance.now() / 150) * 0.5;
  ctx.save();
  ctx.translate(point.x, point.y + Math.sin(performance.now() / 180) * 4);
  ctx.fillStyle = `rgba(110, 208, 255, ${0.18 + pulse * 0.22})`;
  ctx.beginPath();
  ctx.arc(0, 0, 54 + pulse * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6ed0ff";
  ctx.fillRect(-14, -34, 28, 50);
  ctx.fillStyle = "#d9f0ff";
  ctx.fillRect(-8, -50, 16, 18);
  ctx.fillStyle = "#15130f";
  ctx.fillRect(-12, -15, 24, 17);
  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 7px Arial";
  ctx.textAlign = "center";
  ctx.fillText("IKSIR", 0, -3);
  ctx.fillStyle = "#d9f0ff";
  ctx.font = "700 14px Arial";
  ctx.fillText("Siseyi al", 0, -66);
  ctx.restore();
}

function drawShop() {
  const point = worldToScreen(world.campX + 165, world.campY + 45);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 52, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4f2f1b";
  ctx.fillRect(-42, -16, 84, 54);
  ctx.fillStyle = "#d5b25c";
  ctx.fillRect(-48, -34, 96, 22);
  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("MAGAZA", 0, -18);
  ctx.font = "12px Arial";
  ctx.fillText("B", 0, 18);
  ctx.restore();
}

function drawHealthPickups() {
  for (const pickup of healthPickups) {
    if (!isHealthPickupActive(pickup)) {
      continue;
    }

    const point = worldToScreen(pickup.x, pickup.y);

    if (point.x < -50 || point.x > canvas.width + 50 || point.y < -50 || point.y > canvas.height + 50) {
      continue;
    }

    ctx.save();
    ctx.translate(point.x, point.y + Math.sin(performance.now() / 220 + pickup.x) * 4);
    ctx.fillStyle = "#8e2f2b";
    ctx.fillRect(-19, -15, 38, 30);
    ctx.strokeStyle = "#ffd6c9";
    ctx.lineWidth = 3;
    ctx.strokeRect(-19, -15, 38, 30);
    ctx.fillStyle = "#ffd6c9";
    ctx.fillRect(-5, -11, 10, 22);
    ctx.fillRect(-13, -3, 26, 7);
    ctx.fillStyle = "#fff0bd";
    ctx.font = "700 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`+${pickup.amount}`, 0, 31);
    ctx.restore();
  }
}

function drawCastleInterior() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const floor = ctx.createLinearGradient(0, 0, 0, canvas.height);
  floor.addColorStop(0, "#2d2c34");
  floor.addColorStop(1, "#19191f");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(244, 240, 223, 0.08)";
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#17151a";
  ctx.fillRect(0, 0, canvas.width, 70);
  ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
  ctx.fillRect(0, 0, 48, canvas.height);
  ctx.fillRect(canvas.width - 48, 0, 48, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let x = 72; x < canvas.width - 72; x += 115) {
    for (let y = 94; y < canvas.height - 80; y += 76) {
      ctx.fillRect(x, y, 58, 18);
    }
  }

  drawTorch(220, 78);
  drawTorch(740, 78);

  ctx.fillStyle = "#342b22";
  ctx.fillRect(70, 222, 78, 156);
  ctx.fillStyle = "#0d0c0f";
  ctx.fillRect(82, 238, 54, 124);
  ctx.fillStyle = "#d5b25c";
  ctx.beginPath();
  ctx.arc(142, 300, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5b2730";
  ctx.fillRect(690, 132, 130, 210);
  ctx.fillStyle = "#d5b25c";
  ctx.fillRect(716, 106, 78, 34);
  ctx.fillStyle = "#17151a";
  ctx.fillRect(718, 170, 76, 172);

  if (gameState !== "escape") {
    drawPrisoner(792, 370, kingDefeated);
  }

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 18px Arial";
  ctx.textAlign = "center";
  const title = gameState === "escape" ? "Bolum 2 - Kaleden Kacis" : "Iskelet Kralligi - Giris Salonu";
  ctx.fillText(title, canvas.width / 2, 38);
}

function drawTunnel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#15130f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#2a241c";
  ctx.beginPath();
  ctx.moveTo(0, 120);
  ctx.quadraticCurveTo(canvas.width / 2, 55, canvas.width, 120);
  ctx.lineTo(canvas.width, canvas.height - 78);
  ctx.quadraticCurveTo(canvas.width / 2, canvas.height - 30, 0, canvas.height - 78);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 230, 161, 0.08)";
  ctx.lineWidth = 3;
  for (let x = 80; x < canvas.width; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 125);
    ctx.quadraticCurveTo(x + 34, 270, x - 10, canvas.height - 95);
    ctx.stroke();
  }

  ctx.fillStyle = "#0d0c0b";
  ctx.fillRect(0, 210, 84, 180);
  ctx.fillStyle = "#68482b";
  ctx.fillRect(58, 195, 26, 210);

  ctx.fillStyle = "rgba(255, 220, 130, 0.24)";
  ctx.beginPath();
  ctx.ellipse(875, 300, 78, 126, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6d16d";
  ctx.beginPath();
  ctx.ellipse(905, 300, 34, 82, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLight(905, 300, 140, "rgba(255, 211, 107, 0.28)");

  ctx.fillStyle = "#6f5635";
  for (let i = 0; i < 22; i += 1) {
    const x = 115 + ((i * 97) % 700);
    const y = 160 + ((i * 53) % 250);
    ctx.fillRect(x, y, 28, 8);
  }

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Bolum 3 - Gizli Tunel", canvas.width / 2, 38);
}

function drawForestEscape() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#19321f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#8d6d3c";
  ctx.lineWidth = 90;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(85, 320);
  ctx.bezierCurveTo(260, 245, 410, 415, 585, 330);
  ctx.bezierCurveTo(690, 280, 780, 310, 900, 300);
  ctx.stroke();

  ctx.strokeStyle = "#b28b4b";
  ctx.lineWidth = 56;
  ctx.stroke();

  ctx.fillStyle = "#10120f";
  ctx.beginPath();
  ctx.ellipse(48, 315, 58, 96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c4428";
  ctx.fillRect(82, 230, 22, 172);

  ctx.fillStyle = "rgba(255, 224, 132, 0.22)";
  ctx.beginPath();
  ctx.ellipse(880, 300, 82, 128, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6d16d";
  ctx.beginPath();
  ctx.ellipse(910, 300, 34, 82, 0, 0, Math.PI * 2);
  ctx.fill();
  drawLight(910, 300, 150, "rgba(255, 221, 126, 0.24)");

  for (let i = 0; i < 34; i += 1) {
    const x = 40 + ((i * 83) % 880);
    const y = 90 + ((i * 137) % 370);

    if (Math.abs(x - 480) < 170 && y > 230 && y < 390) {
      continue;
    }

    ctx.fillStyle = "#4b301c";
    ctx.fillRect(x - 5, y + 15, 10, 38);
    ctx.fillStyle = i % 2 === 0 ? "#1d5a32" : "#246438";
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Bolum 4 - Ormana Kacis", canvas.width / 2, 38);
}

function drawPrison() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1b1a20";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#2a2931";
  ctx.fillRect(65, 105, 830, 340);
  ctx.strokeStyle = "#6d7480";
  ctx.lineWidth = 6;
  ctx.strokeRect(65, 105, 830, 340);

  ctx.fillStyle = prisonDoorOpen ? "#6b5530" : "#35271f";
  ctx.fillRect(758, 190, 78, 220);
  ctx.strokeStyle = prisonDoorOpen ? "#ffd36b" : "#9b8060";
  ctx.strokeRect(758, 190, 78, 220);

  if (!prisonDoorOpen) {
    ctx.fillStyle = "#fff0bd";
    ctx.font = "700 22px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${doorHits}/10`, 797, 178);
  }

  drawPrisoner(brother.x, brother.y, prisonDoorOpen);

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Bolum 5 - Guvenlikli Zindan", canvas.width / 2, 38);
}

function drawChallengeRoom() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#202026";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(244, 240, 223, 0.1)";
  ctx.lineWidth = 2;
  for (let x = 60; x < canvas.width; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 76);
    ctx.lineTo(x, canvas.height - 54);
    ctx.stroke();
  }
  for (let y = 95; y < canvas.height; y += 70) {
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(canvas.width - 48, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#17151a";
  ctx.fillRect(0, 0, canvas.width, 70);
  ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
  ctx.fillRect(0, 0, 48, canvas.height);
  ctx.fillRect(canvas.width - 48, 0, 48, canvas.height);

  ctx.fillStyle = roomCleared || gameState === "finalBoss" ? "#c69b4f" : "#3a2d23";
  ctx.fillRect(850, 220, 62, 160);

  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 18px Arial";
  ctx.textAlign = "center";
  const title = gameState === "finalBoss" ? "Son Savas - Guclenen Kral" : `Oda ${roomNumber}/10`;
  ctx.fillText(title, canvas.width / 2, 38);

  if (gameState === "finalBoss") {
    ctx.font = "700 46px Arial";
    ctx.fillStyle = "rgba(255, 211, 107, 0.22)";
    ctx.fillText("Skeleton Wars", canvas.width / 2, canvas.height / 2);
  }
}

function drawEnding() {
  const zoom = clamp(1 + sceneTimer * 1.45, 1, 5.8);
  const titleFade = clamp((sceneTimer - 2.4) / 1.2, 0, 1);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#090b0b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2 - 42);
  ctx.scale(zoom, zoom);
  ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
  ctx.beginPath();
  ctx.ellipse(0, 58, 170, 96, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ece7d4";
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2b2530";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-32, -10, 22, 0, Math.PI * 2);
  ctx.arc(32, -10, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(17, 8, 28, ${0.4 + Math.sin(sceneTimer * 5) * 0.18})`;
  ctx.beginPath();
  ctx.arc(-32, -10, 38, 0, Math.PI * 2);
  ctx.arc(32, -10, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = `rgba(0, 0, 0, ${clamp((sceneTimer - 1.8) / 1.1, 0, 0.72)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = titleFade;
  ctx.fillStyle = "#ffd36b";
  ctx.textAlign = "center";
  ctx.font = "700 62px Arial";
  ctx.fillText("Skeleton Wars", canvas.width / 2, canvas.height / 2 + 108);
  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 26px Arial";
  ctx.fillText("Devami: Skeleton Wars 2", canvas.width / 2, canvas.height / 2 + 148);
  ctx.font = "18px Arial";
  ctx.fillText("Yeniden oynamak icin bosluk tusuna bas", canvas.width / 2, canvas.height / 2 + 188);
  ctx.globalAlpha = 1;
}

function drawPrisoner(x, y, freed = false) {
  ctx.save();
  ctx.translate(x, y);

  if (!freed) {
    ctx.strokeStyle = "#6d7480";
    ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 14, -58);
      ctx.lineTo(i * 14, 38);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#8ac05d";
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0c46a";
  ctx.fillRect(-7, -29, 14, 11);
  ctx.restore();
}

function drawBrother() {
  if (!brother.rescued) {
    return;
  }

  const point = worldToScreen(brother.x, brother.y);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(-7, -8, 3, 0, 0, brother.radius + 8);
  body.addColorStop(0, "#b7ef86");
  body.addColorStop(0.6, "#8ac05d");
  body.addColorStop(1, "#4c7d34");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, brother.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d9ffc4";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#f0c46a";
  ctx.fillRect(-6, -25, 12, 10);
  ctx.fillStyle = "#6b401d";
  ctx.fillRect(-8, -28, 16, 5);
  ctx.strokeStyle = "#f0c46a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, 8);
  ctx.lineTo(-20, 18);
  ctx.moveTo(10, 8);
  ctx.lineTo(20, 18);
  ctx.stroke();
  ctx.restore();
}

function drawCastleInsideMessage() {
  ctx.save();
  ctx.fillStyle = "rgba(12, 15, 12, 0.64)";
  ctx.fillRect(canvas.width / 2 - 245, canvas.height - 92, 490, 58);
  ctx.strokeStyle = "#d5b25c";
  ctx.strokeRect(canvas.width / 2 - 245, canvas.height - 92, 490, 58);
  ctx.fillStyle = "#fff0bd";
  ctx.textAlign = "center";
  ctx.font = "700 18px Arial";
  let message = kingDefeated
    ? "Kardesini kurtardin. Sonraki bolumde kaleden kacis baslayacak."
    : "Iskelet Krali'ni yen, sonra kardesinin kafesi acilacak.";

  if (gameState === "escape") {
    message = escapeComplete
      ? "Bolum 2 tamamlandi. Sonraki bolum: gizli tunel."
      : "Kardesin seni takip ediyor. Sol kapidan beraber kac.";
  }

  if (gameState === "tunnel") {
    message = tunnelComplete
      ? "Gizli tunelden ciktin. Ormana kacis basladi."
      : "Kalenin yanindaki gizli tuneldesin. Sag taraftaki isiga ulas.";
  }

  if (gameState === "forestEscape") {
    message = forestComplete
      ? "Ormana kacis tamamlandi. Sonraki bolum: kampi bulmak."
      : "Disaridasin. Kardesinle sagdaki guvenli orman yoluna kos.";
  }

  if (gameState === "prison") {
    message = prisonDoorOpen
      ? "Kapi acildi. Kardesinle sagdaki cikisa git."
      : "Kapiya kiliçla 10 kere vur. Ucuz malzeme kirilacak.";
  }

  if (gameState === "rooms") {
    message = roomCleared
      ? "Oda temizlendi. Kardesinle sag kapiya gec."
      : "Bu odadaki butun iskeletleri yen.";
  }

  if (gameState === "finalBoss") {
    message = "Guclenen kral geri dondu. Onu yen ve savasi bitir.";
  }

  ctx.fillText(message, canvas.width / 2, canvas.height - 56);
  ctx.restore();
}

function drawTimedRunMessage() {
  ctx.save();
  ctx.fillStyle = "rgba(12, 15, 12, 0.72)";
  ctx.fillRect(canvas.width / 2 - 280, canvas.height - 106, 560, 72);
  ctx.strokeStyle = "#ffd36b";
  ctx.strokeRect(canvas.width / 2 - 280, canvas.height - 106, 560, 72);
  ctx.fillStyle = "#ffd36b";
  ctx.textAlign = "center";
  ctx.font = "700 18px Arial";
  ctx.fillText("Bolum: Son", canvas.width / 2, canvas.height - 78);
  ctx.fillStyle = "#fff0bd";
  ctx.font = "700 16px Arial";
  const target = timedRunTarget === "cure"
    ? "60 saniye icinde kaleye ulas ve Iskelet Iksiri yazan siseyi al."
    : "Zaman geri alindi. Boss patlamadan once kampa kac.";
  ctx.fillText(`${target} Kalan: ${Math.ceil(timedRunTimer)} sn`, canvas.width / 2, canvas.height - 52);
  ctx.restore();
}

function drawPlayer() {
  const point = worldToScreen(player.x, player.y);
  ctx.save();
  ctx.translate(point.x, point.y);

  if (player.invincible > 0) {
    ctx.globalAlpha = 0.58 + Math.sin(performance.now() / 45) * 0.25;
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 20, 25, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(-8, -10, 4, 0, 0, player.radius + 8);
  body.addColorStop(0, "#7fa0ff");
  body.addColorStop(0.55, "#486de0");
  body.addColorStop(1, "#243f9f");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d6e0ff";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#f0c46a";
  ctx.fillRect(-8, -24, 16, 12);
  ctx.fillStyle = "#3a2512";
  ctx.fillRect(-10, -27, 20, 6);

  const angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
  ctx.rotate(angle);

  if (player.swordTime > 0) {
    ctx.strokeStyle = "rgba(255, 236, 172, 0.88)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 0, 68, -0.85, 0.85);
    ctx.stroke();
  }

  ctx.fillStyle = "#c18a43";
  ctx.fillRect(8, -4, 25, 8);
  ctx.strokeStyle = "#70431f";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, -4, 25, 8);
  ctx.fillStyle = "#e8edf7";
  ctx.fillRect(9, 8, 48, 7);
  ctx.fillStyle = "#f4f0df";
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.lineTo(24, -7);
  ctx.lineTo(24, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawSkeletons() {
  for (const skeleton of skeletons) {
    const point = worldToScreen(skeleton.x, skeleton.y);
    ctx.save();
    ctx.translate(point.x, point.y);

    if (skeleton.type === "king" || skeleton.type === "finalKing") {
      drawBossSkeleton(skeleton);
      ctx.restore();
      continue;
    }

    if (skeleton.rise < 1) {
      ctx.fillStyle = "#2a231c";
      ctx.beginPath();
      ctx.ellipse(0, 8, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, 34 * (1 - skeleton.rise));
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 38, skeleton.radius + 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = clamp(skeleton.rise + 0.15, 0.15, 1);

    if (skeleton.variant === "fast") {
      ctx.strokeStyle = "rgba(108, 204, 255, 0.48)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -5, skeleton.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    } else if (skeleton.variant === "big") {
      ctx.strokeStyle = "rgba(216, 194, 160, 0.5)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -5, skeleton.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = skeleton.hitFlash > 0 ? "#ffe8a6" : skeleton.boneColor || "#ece7d4";
    ctx.beginPath();
    ctx.arc(0, -5, skeleton.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1d241b";
    ctx.beginPath();
    ctx.arc(-6, -8, 3, 0, Math.PI * 2);
    ctx.arc(6, -8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-8, 1, 16, 3);

    ctx.strokeStyle = skeleton.boneColor || "#ece7d4";
    ctx.lineWidth = skeleton.variant === "big" ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(0, 31);
    ctx.moveTo(-15, 15);
    ctx.lineTo(15, 15);
    ctx.moveTo(-13, 22);
    ctx.quadraticCurveTo(0, 15, 13, 22);
    ctx.moveTo(-12, 28);
    ctx.quadraticCurveTo(0, 22, 12, 28);
    ctx.moveTo(-15, 15);
    ctx.lineTo(-25, 30);
    ctx.moveTo(15, 15);
    ctx.lineTo(25, 30);
    ctx.moveTo(0, 31);
    ctx.lineTo(-13, 49);
    ctx.moveTo(0, 31);
    ctx.lineTo(13, 49);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBossSkeleton(skeleton) {
  const pulse = 1 + Math.sin(performance.now() / 180) * 0.04;
  const isFinal = skeleton.type === "finalKing";
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 92, isFinal ? 78 : 58, isFinal ? 18 : 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(isFinal ? pulse * 1.28 : pulse, isFinal ? pulse * 1.28 : pulse);

  const robe = ctx.createLinearGradient(0, -12, 0, 92);
  robe.addColorStop(0, isFinal ? "#7d2431" : "#5b2730");
  robe.addColorStop(1, "#231015");
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(-46, 0);
  ctx.lineTo(46, 0);
  ctx.lineTo(58, 92);
  ctx.lineTo(-58, 92);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d5b25c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 92);
  ctx.stroke();

  ctx.fillStyle = skeleton.hitFlash > 0 ? "#ffe8a6" : "#ece7d4";
  ctx.beginPath();
  ctx.arc(0, -22, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-18, 5, 36, 15);

  ctx.fillStyle = "#181719";
  ctx.fillRect(-13, -34, 9, 12);
  ctx.fillRect(6, -34, 9, 12);
  ctx.fillRect(-12, -8, 24, 5);

  ctx.fillStyle = "#d5b25c";
  ctx.beginPath();
  ctx.moveTo(-30, -52);
  ctx.lineTo(-14, -82);
  ctx.lineTo(0, -52);
  ctx.lineTo(14, -82);
  ctx.lineTo(30, -52);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ece7d4";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(0, 76);
  ctx.moveTo(-42, 28);
  ctx.lineTo(42, 28);
  ctx.moveTo(-28, 48);
  ctx.quadraticCurveTo(0, 34, 28, 48);
  ctx.moveTo(-24, 62);
  ctx.quadraticCurveTo(0, 50, 24, 62);
  ctx.moveTo(0, 76);
  ctx.lineTo(-28, 108);
  ctx.moveTo(0, 76);
  ctx.lineTo(28, 108);
  ctx.stroke();

  ctx.strokeStyle = "#7c5f2c";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(40, 25);
  ctx.lineTo(88, -28);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(12, 15, 12, 0.76)";
  ctx.fillRect(-58, -104, 116, 12);
  ctx.fillStyle = "#d84b45";
  ctx.fillRect(-56, -102, 112 * clamp(skeleton.health / (isFinal ? 36 : 18), 0, 1), 8);
}

function drawShots() {
  for (const shot of shots) {
    const point = worldToScreen(shot.x, shot.y);
    ctx.fillStyle = shot.fire ? "#ff8a3d" : "#f6d16d";
    ctx.beginPath();
    ctx.arc(point.x, point.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();

    if (shot.fire) {
      ctx.strokeStyle = "rgba(255, 211, 107, 0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(point.x, point.y, shot.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawParticles() {
  for (const particle of particles) {
    const point = worldToScreen(particle.x, particle.y);
    ctx.globalAlpha = Math.max(0, particle.life * 2);
    ctx.fillStyle = particle.color;
    const size = particle.size || 4;
    ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
  ctx.textAlign = "center";
  ctx.font = "700 18px Arial";
  for (const text of floatingTexts) {
    const point = worldToScreen(text.x, text.y);
    ctx.globalAlpha = clamp(text.life, 0, 1);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, point.x, point.y);
  }
  ctx.globalAlpha = 1;
}

function drawAimLine() {
  if (
    gameState !== "playing" &&
    gameState !== "castleInside" &&
    gameState !== "escape" &&
    gameState !== "tunnel" &&
    gameState !== "forestEscape" &&
    gameState !== "prison" &&
    gameState !== "rooms" &&
    gameState !== "finalBoss"
  ) {
    return;
  }
  const point = worldToScreen(player.x, player.y);
  ctx.strokeStyle = "rgba(246, 209, 109, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(mouse.screenX, mouse.screenY);
  ctx.stroke();
}

function drawLight(x, y, radius, color) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "rgba(255, 211, 107, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorch(x, y) {
  drawLight(x, y + 20, 96, "rgba(255, 151, 61, 0.28)");
  ctx.fillStyle = "#5c351d";
  ctx.fillRect(x - 8, y, 16, 42);
  ctx.fillStyle = "#ff8a3d";
  ctx.beginPath();
  ctx.moveTo(x, y - 16 - Math.sin(performance.now() / 100) * 5);
  ctx.lineTo(x - 13, y + 12);
  ctx.lineTo(x + 13, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd36b";
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 7);
  ctx.lineTo(x - 6, y + 13);
  ctx.lineTo(x + 8, y + 13);
  ctx.closePath();
  ctx.fill();
}

function drawAtmosphere() {
  ctx.save();

  if (!insideCastle) {
    const camp = worldToScreen(world.campX + 95, world.campY + 28);
    drawLight(camp.x, camp.y, 150, "rgba(255, 190, 84, 0.18)");
  } else if (gameState === "castleInside" || gameState === "escape" || gameState === "rooms" || gameState === "finalBoss" || gameState === "prison") {
    drawLight(220, 98, 140, "rgba(255, 138, 61, 0.12)");
    drawLight(740, 98, 140, "rgba(255, 138, 61, 0.12)");
  }

  const vignette = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.18,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.72,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawMiniMap() {
  if (gameState === "timedRun") {
    const x = canvas.width - 214;
    const y = 18;
    const width = 192;
    const height = 62;
    const targetX = timedRunTarget === "cure" ? world.castleX : world.campX;
    const progress = targetX === world.castleX
      ? player.x / world.width
      : 1 - player.x / world.width;

    ctx.fillStyle = "rgba(12, 15, 12, 0.78)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#ffd36b";
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = "#9a7a43";
    ctx.fillRect(x + 14, y + 34, width - 28, 5);
    ctx.fillStyle = "#486de0";
    ctx.beginPath();
    ctx.arc(x + 14 + (width - 28) * clamp(player.x / world.width, 0, 1), y + 36, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff0bd";
    ctx.font = "700 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Son: ${Math.ceil(timedRunTimer)} sn`, x + width / 2, y + 20);
    ctx.font = "11px Arial";
    ctx.fillText(timedRunTarget === "cure" ? "Hedef: Kale" : "Hedef: Kamp", x + width / 2, y + 55);
    return;
  }

  if (
    gameState === "castleInside" ||
    gameState === "escape" ||
    gameState === "tunnel" ||
    gameState === "forestEscape" ||
    gameState === "prison" ||
    gameState === "rooms" ||
    gameState === "finalBoss"
  ) {
    ctx.fillStyle = "rgba(12, 15, 12, 0.72)";
    ctx.fillRect(canvas.width - 188, 18, 166, 54);
    ctx.strokeStyle = "#d5b25c";
    ctx.strokeRect(canvas.width - 188, 18, 166, 54);
    ctx.fillStyle = "#fff0bd";
    ctx.font = "700 16px Arial";
    ctx.textAlign = "center";
    let label = "Kale ici";
    if (gameState === "escape") label = "Kacis";
    if (gameState === "tunnel") label = "Tunel";
    if (gameState === "forestEscape") label = "Orman";
    if (gameState === "prison") label = "Zindan";
    if (gameState === "rooms") label = `Oda ${roomNumber}`;
    if (gameState === "finalBoss") label = "Son Boss";
    ctx.fillText(label, canvas.width - 105, 50);
    return;
  }

  const x = canvas.width - 188;
  const y = 18;
  const width = 166;
  const height = 54;
  const progress = player.x / world.width;

  ctx.fillStyle = "rgba(12, 15, 12, 0.72)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#d5b25c";
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = "#9a7a43";
  ctx.fillRect(x + 12, y + 26, width - 24, 5);
  ctx.fillStyle = "#486de0";
  ctx.beginPath();
  ctx.arc(x + 12 + (width - 24) * progress, y + 28, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ece7d4";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Kamp", x + 20, y + 18);
  ctx.fillText("Krallik", x + width - 28, y + 18);
}

function drawCinematic(scenes, hint) {
  const scene = scenes[sceneIndex] || scenes[scenes.length - 1];
  const fade = Math.min(1, sceneTimer / 0.7);

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "#090b0b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;

  drawSceneArt(scene.title, fade);

  ctx.fillStyle = `rgba(255, 240, 189, ${fade})`;
  ctx.textAlign = "center";
  ctx.font = "700 38px Arial";
  ctx.fillText(scene.title, canvas.width / 2, canvas.height - 132);
  ctx.font = "20px Arial";
  wrapText(scene.text, canvas.width / 2, canvas.height - 96, canvas.width - 160, 24);
  ctx.font = "15px Arial";
  ctx.fillStyle = `rgba(220, 214, 189, ${fade})`;
  ctx.fillText(hint, canvas.width / 2, canvas.height - 54);
  ctx.restore();
}

function drawIntroVideoFrame(videoCtx, elapsed, width, height) {
  const sceneInfo = introSceneAt(elapsed);
  const fade = Math.min(1, sceneInfo.time / 0.28, (sceneInfo.scene.duration - sceneInfo.time) / 0.28);
  const t = sceneInfo.time;

  videoCtx.save();
  videoCtx.fillStyle = "#070909";
  videoCtx.fillRect(0, 0, width, height);

  if (sceneInfo.scene.title === "Mutlu Kamp") {
    drawVideoCamp(videoCtx, width, height, t);
  } else if (sceneInfo.scene.title === "Iskelet Krali") {
    drawVideoKingArrival(videoCtx, width, height, t);
  } else if (sceneInfo.scene.title === "Kacis") {
    drawVideoEscape(videoCtx, width, height, t);
  } else {
    drawVideoQuest(videoCtx, width, height, t);
  }

  videoCtx.globalAlpha = 1 - fade;
  videoCtx.fillStyle = "#050606";
  videoCtx.fillRect(0, 0, width, height);
  videoCtx.globalAlpha = 1;

  if (!(sceneInfo.scene.title === "Gorev" && t > 1.1)) {
    videoCtx.fillStyle = "rgba(0, 0, 0, 0.56)";
    videoCtx.fillRect(0, height - 142, width, 142);
    videoCtx.fillStyle = "#fff0bd";
    videoCtx.textAlign = "center";
    videoCtx.font = "700 34px Arial";
    videoCtx.fillText(sceneInfo.scene.title, width / 2, height - 86);
    videoCtx.font = "19px Arial";
    videoCtx.fillText(sceneInfo.scene.text, width / 2, height - 50);
  }

  if (sceneInfo.scene.title === "Gorev" && t > 1.1) {
    const dark = clamp((t - 1.1) / 0.55, 0, 1);
    const logo = clamp((t - 1.35) / 0.35, 0, 1);
    videoCtx.globalAlpha = dark;
    videoCtx.fillStyle = "#050606";
    videoCtx.fillRect(0, 0, width, height);
    videoCtx.globalAlpha = logo;
    drawVideoLogo(videoCtx, width / 2, height / 2);
    videoCtx.globalAlpha = 1;
  }

  videoCtx.restore();
}

function introSceneAt(elapsed) {
  let time = elapsed;

  for (const scene of storyScenes) {
    if (time <= scene.duration) {
      return { scene, time };
    }
    time -= scene.duration;
  }

  const scene = storyScenes[storyScenes.length - 1];
  return { scene, time: scene.duration };
}

function drawVideoCamp(videoCtx, width, height, t) {
  videoCtx.fillStyle = "#17261a";
  videoCtx.fillRect(0, 0, width, height);
  drawVideoMoon(videoCtx, 760, 96);
  drawVideoForest(videoCtx, t);
  drawVideoTent(videoCtx, 320, 308, "#b44b37");
  drawVideoFire(videoCtx, 610, 360, t);
  drawVideoPerson(videoCtx, 470, 344 + Math.sin(t * 3) * 2, "#486de0");
  drawVideoPerson(videoCtx, 535, 344 + Math.cos(t * 3) * 2, "#8ac05d");
}

function drawVideoKingArrival(videoCtx, width, height, t) {
  const zoom = 1 + clamp((t - 0.35) / 1.25, 0, 1) * 0.1;
  videoCtx.save();
  videoCtx.translate(width / 2, height / 2);
  videoCtx.scale(zoom, zoom);
  videoCtx.translate(-width / 2, -height / 2);
  videoCtx.fillStyle = "#15151c";
  videoCtx.fillRect(0, 0, width, height);
  drawVideoMoon(videoCtx, 780, 88);
  drawVideoForest(videoCtx, t);
  drawVideoTent(videoCtx, 250, 320, "#7c3329");
  drawVideoFire(videoCtx, 355, 380, t);
  drawVideoMist(videoCtx, 610, 340, t);
  drawVideoPerson(videoCtx, 430, 360, "#486de0");
  videoCtx.save();
  videoCtx.globalAlpha = 1 - clamp((t - 1.25) / 0.5, 0, 1);
  drawVideoPerson(videoCtx, 480 + clamp((t - 0.65) / 0.75, 0, 1) * 130, 360, "#8ac05d");
  videoCtx.restore();
  drawVideoSkeletonKing(videoCtx, 705 - t * 55, 318);
  videoCtx.restore();
}

function drawVideoEscape(videoCtx, width, height, t) {
  videoCtx.fillStyle = "#1f2b1d";
  videoCtx.fillRect(0, 0, width, height);
  drawVideoForest(videoCtx, t);
  drawVideoPath(videoCtx);
  drawVideoHeroReady(videoCtx, 480, 346, t);
}

function drawVideoQuest(videoCtx, width, height, t) {
  videoCtx.fillStyle = "#24381f";
  videoCtx.fillRect(0, 0, width, height);
  drawVideoPath(videoCtx);
  drawVideoForest(videoCtx, t);
  drawVideoTent(videoCtx, 210, 340, "#b44b37");
  drawVideoCastle(videoCtx, 715, 295);
  drawVideoPerson(videoCtx, 250 + t * 145, 405 - t * 36 + Math.sin(t * 9) * 6, "#486de0");
}

function drawVideoMoon(videoCtx, x, y) {
  videoCtx.fillStyle = "#f3e9bd";
  videoCtx.beginPath();
  videoCtx.arc(x, y, 44, 0, Math.PI * 2);
  videoCtx.fill();
}

function drawVideoForest(videoCtx, t) {
  for (let i = 0; i < 26; i += 1) {
    const x = 35 + i * 39;
    const y = 205 + ((i * 71) % 150);
    videoCtx.fillStyle = "#4b301c";
    videoCtx.fillRect(x - 5, y + 34, 10, 46);
    videoCtx.fillStyle = i % 2 === 0 ? "#1d5a32" : "#246438";
    videoCtx.beginPath();
    videoCtx.arc(x + Math.sin(t + i) * 2, y, 30, 0, Math.PI * 2);
    videoCtx.fill();
  }
}

function drawVideoMist(videoCtx, x, y, t) {
  for (let i = 0; i < 7; i += 1) {
    const offset = i * 38;
    videoCtx.fillStyle = `rgba(154, 102, 207, ${0.14 + i * 0.015})`;
    videoCtx.beginPath();
    videoCtx.ellipse(
      x + Math.sin(t * 2 + i) * 22 - offset / 2,
      y + Math.cos(t * 2 + i) * 12,
      70 + i * 8,
      28 + i * 2,
      0,
      0,
      Math.PI * 2,
    );
    videoCtx.fill();
  }
}

function drawVideoTent(videoCtx, x, y, color) {
  videoCtx.fillStyle = "#47301c";
  videoCtx.fillRect(x - 90, y + 44, 180, 44);
  videoCtx.fillStyle = color;
  videoCtx.beginPath();
  videoCtx.moveTo(x - 78, y + 44);
  videoCtx.lineTo(x, y - 52);
  videoCtx.lineTo(x + 78, y + 44);
  videoCtx.closePath();
  videoCtx.fill();
  videoCtx.fillStyle = "rgba(0, 0, 0, 0.28)";
  videoCtx.beginPath();
  videoCtx.moveTo(x, y - 34);
  videoCtx.lineTo(x - 18, y + 44);
  videoCtx.lineTo(x + 18, y + 44);
  videoCtx.closePath();
  videoCtx.fill();
}

function drawVideoPerson(videoCtx, x, y, color) {
  videoCtx.fillStyle = color;
  videoCtx.beginPath();
  videoCtx.arc(x, y, 21, 0, Math.PI * 2);
  videoCtx.fill();
  videoCtx.fillStyle = "#f0c46a";
  videoCtx.fillRect(x - 8, y - 32, 16, 13);
  videoCtx.strokeStyle = "#f0c46a";
  videoCtx.lineWidth = 5;
  videoCtx.beginPath();
  videoCtx.moveTo(x - 14, y + 8);
  videoCtx.lineTo(x - 32, y + 25);
  videoCtx.moveTo(x + 14, y + 8);
  videoCtx.lineTo(x + 32, y + 25);
  videoCtx.stroke();
}

function drawVideoHeroReady(videoCtx, x, y, t) {
  const lift = clamp(t / 1.15, 0, 1);
  const heroY = y + 50 - lift * 50;

  drawVideoPerson(videoCtx, x, heroY, "#486de0");

  videoCtx.save();
  videoCtx.translate(x, heroY);
  videoCtx.rotate(-0.55 + lift * 0.25);
  videoCtx.fillStyle = "#e8edf7";
  videoCtx.fillRect(18, -6, 74, 9);
  videoCtx.fillStyle = "#d5b25c";
  videoCtx.fillRect(10, -11, 15, 19);
  videoCtx.restore();

  videoCtx.strokeStyle = "#c18a43";
  videoCtx.lineWidth = 7;
  videoCtx.beginPath();
  videoCtx.arc(x - 34, heroY - 3, 23, -1.4, 1.4);
  videoCtx.stroke();

  videoCtx.fillStyle = "rgba(255, 230, 161, 0.85)";
  videoCtx.beginPath();
  videoCtx.arc(x + 55, heroY - 8, 10 + Math.sin(t * 8) * 2, 0, Math.PI * 2);
  videoCtx.fill();
}

function drawVideoFire(videoCtx, x, y, t) {
  videoCtx.fillStyle = "#7b3d20";
  videoCtx.fillRect(x - 36, y + 30, 72, 10);
  videoCtx.fillStyle = "#ffd36b";
  videoCtx.beginPath();
  videoCtx.moveTo(x, y - 34 - Math.sin(t * 8) * 8);
  videoCtx.lineTo(x - 26, y + 32);
  videoCtx.lineTo(x + 26, y + 32);
  videoCtx.closePath();
  videoCtx.fill();
  videoCtx.fillStyle = "#e15b4f";
  videoCtx.beginPath();
  videoCtx.moveTo(x + 5, y - 10);
  videoCtx.lineTo(x - 12, y + 30);
  videoCtx.lineTo(x + 16, y + 30);
  videoCtx.closePath();
  videoCtx.fill();
}

function drawVideoSkeletonKing(videoCtx, x, y) {
  drawVideoSkeleton(videoCtx, x, y + 42);
  videoCtx.fillStyle = "#d5b25c";
  videoCtx.beginPath();
  videoCtx.moveTo(x - 23, y - 12);
  videoCtx.lineTo(x - 8, y - 42);
  videoCtx.lineTo(x, y - 13);
  videoCtx.lineTo(x + 8, y - 42);
  videoCtx.lineTo(x + 23, y - 12);
  videoCtx.closePath();
  videoCtx.fill();
  videoCtx.strokeStyle = "#7c5f2c";
  videoCtx.lineWidth = 8;
  videoCtx.beginPath();
  videoCtx.moveTo(x + 34, y + 28);
  videoCtx.lineTo(x + 92, y - 20);
  videoCtx.stroke();
}

function drawVideoSkeleton(videoCtx, x, y) {
  videoCtx.fillStyle = "#ece7d4";
  videoCtx.beginPath();
  videoCtx.arc(x, y - 40, 22, 0, Math.PI * 2);
  videoCtx.fill();
  videoCtx.fillStyle = "#181719";
  videoCtx.fillRect(x - 9, y - 48, 7, 9);
  videoCtx.fillRect(x + 6, y - 48, 7, 9);
  videoCtx.strokeStyle = "#ece7d4";
  videoCtx.lineWidth = 5;
  videoCtx.beginPath();
  videoCtx.moveTo(x, y - 16);
  videoCtx.lineTo(x, y + 32);
  videoCtx.moveTo(x - 28, y + 2);
  videoCtx.lineTo(x + 28, y + 2);
  videoCtx.moveTo(x, y + 32);
  videoCtx.lineTo(x - 18, y + 58);
  videoCtx.moveTo(x, y + 32);
  videoCtx.lineTo(x + 18, y + 58);
  videoCtx.stroke();
}

function drawVideoPath(videoCtx) {
  videoCtx.strokeStyle = "#6b5530";
  videoCtx.lineWidth = 92;
  videoCtx.lineCap = "round";
  videoCtx.beginPath();
  videoCtx.moveTo(105, 420);
  videoCtx.bezierCurveTo(315, 270, 560, 510, 850, 288);
  videoCtx.stroke();
  videoCtx.strokeStyle = "#9a7a43";
  videoCtx.lineWidth = 58;
  videoCtx.stroke();
}

function drawVideoCastle(videoCtx, x, y) {
  videoCtx.fillStyle = "#39383e";
  videoCtx.fillRect(x - 88, y - 68, 176, 140);
  videoCtx.fillStyle = "#17151a";
  videoCtx.fillRect(x - 28, y + 8, 56, 64);
  videoCtx.fillStyle = "#2d2c33";
  videoCtx.fillRect(x - 70, y - 104, 42, 52);
  videoCtx.fillRect(x + 28, y - 104, 42, 52);
  videoCtx.fillStyle = "#ece7d4";
  videoCtx.beginPath();
  videoCtx.arc(x, y - 42, 26, 0, Math.PI * 2);
  videoCtx.fill();
  videoCtx.fillStyle = "#181719";
  videoCtx.fillRect(x - 10, y - 51, 7, 9);
  videoCtx.fillRect(x + 7, y - 51, 7, 9);
}

function drawVideoLogo(videoCtx, x, y) {
  videoCtx.textAlign = "center";
  videoCtx.font = "700 58px Arial";
  videoCtx.lineWidth = 8;
  videoCtx.strokeStyle = "#17151a";
  videoCtx.strokeText("Skeleton Wars", x, y);
  videoCtx.fillStyle = "#ffd36b";
  videoCtx.fillText("Skeleton Wars", x, y);
  videoCtx.font = "700 18px Arial";
  videoCtx.fillStyle = "#f4f0df";
  videoCtx.fillText("Kardesini kurtar", x, y + 38);
}

function drawSceneArt(title, fade) {
  ctx.globalAlpha = fade;

  if (title === "Mutlu Kamp") {
    drawCampScene();
  } else if (title === "Iskelet Krali") {
    drawKingScene();
  } else if (title === "Kacis") {
    drawEscapeScene();
  } else if (title === "Gorev") {
    drawQuestScene();
  } else if (title === "Kral Yenildi") {
    drawKingDefeatedScene();
  } else if (title === "Kafes Aciliyor") {
    drawCageOpenScene();
  } else if (title === "Kardesler Birlikte") {
    drawTogetherScene();
  } else if (title === "Son" || title === "Bos Delik" || title === "Demire Tutunus" || title === "Siyah Gozler") {
    drawVoidScene(title);
  } else if (title === "Iskelet Enerjisi" || title === "Doktor" || title === "Yanlis Sise" || title === "Zehir" || title === "Gec Kaldin") {
    drawHospitalScene(title);
  } else if (title === "Zaman Kalmadi" || title === "Tam Isabet" || title === "Zaman Geri Aliyor") {
    drawPotionScene(title);
  } else if (title === "Kardesler" || title === "Kampa Kacis") {
    drawTogetherScene();
  } else {
    drawDeathScene();
  }

  ctx.globalAlpha = 1;
}

function drawCampScene() {
  ctx.fillStyle = "#192719";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawMoon(760, 100);
  drawSimpleTent(330, 300, "#b44b37");
  drawSimplePerson(475, 330, "#486de0");
  drawSimplePerson(535, 330, "#8ac05d");
  drawFire(610, 360);
}

function drawKingScene() {
  ctx.fillStyle = "#16151b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawMoon(780, 90);
  drawSimpleTent(255, 320, "#7c3329");
  drawSkeletonKing(620, 305);
  drawSimplePerson(430, 340, "#486de0");
  drawSimplePerson(475, 340, "#8ac05d");
}

function drawEscapeScene() {
  ctx.fillStyle = "#1c241d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPathScene();
  drawSimplePerson(390 + sceneTimer * 55, 350, "#486de0");
  drawSkeletonKing(650, 305);
  drawSimplePerson(595, 350, "#8ac05d");
}

function drawQuestScene() {
  ctx.fillStyle = "#24381f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPathScene();
  drawSimpleTent(210, 340, "#b44b37");
  drawCastleIcon(710, 285);
  drawSimplePerson(330, 370, "#486de0");
}

function drawDeathScene() {
  ctx.fillStyle = "#120f12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFire(480, 360);
  drawSimplePerson(480, 395, "#486de0");
  ctx.fillStyle = "rgba(236, 231, 212, 0.9)";
  for (let i = 0; i < 5; i += 1) {
    drawSmallSkeleton(300 + i * 90, 300 + Math.sin(sceneTimer * 4 + i) * 15);
  }
}

function drawKingDefeatedScene() {
  ctx.fillStyle = "#17151a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCastleIcon(480, 260);
  drawSmallSkeleton(520, 365);
  ctx.fillStyle = "#d5b25c";
  ctx.beginPath();
  ctx.moveTo(392, 345);
  ctx.lineTo(420, 330);
  ctx.lineTo(448, 345);
  ctx.lineTo(420, 360);
  ctx.closePath();
  ctx.fill();
  drawSimplePerson(360, 365, "#486de0");
}

function drawCageOpenScene() {
  ctx.fillStyle = "#242329";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSimplePerson(410, 355, "#486de0");
  drawSimplePerson(535, 355, "#8ac05d");
  ctx.strokeStyle = "#6d7480";
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(500 + i * 22, 270);
    ctx.lineTo(475 + i * 22, 430);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffd36b";
  ctx.beginPath();
  ctx.arc(478, 390, 16, 0, Math.PI * 2);
  ctx.fill();
}

function drawTogetherScene() {
  ctx.fillStyle = "#24381f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawVideoPath(ctx);
  drawVideoCastle(ctx, 705, 300);
  drawSimplePerson(430, 365, "#486de0");
  drawSimplePerson(510, 365, "#8ac05d");
  drawFire(345, 390);
}

function drawVoidScene(title) {
  ctx.fillStyle = "#070708";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(480, 305, 40, 480, 305, 220);
  gradient.addColorStop(0, "#030303");
  gradient.addColorStop(0.58, "#17151f");
  gradient.addColorStop(1, "#3b2c18");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(480, 315, 230, 92, 0, 0, Math.PI * 2);
  ctx.fill();
  drawSimplePerson(350, title === "Demire Tutunus" ? 230 : 350, "#486de0");
  drawSimplePerson(610, 350, "#8ac05d");
  drawSmallSkeleton(510, 330);
  if (title === "Siyah Gozler") {
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(475, 292, 18, 0, Math.PI * 2);
    ctx.arc(535, 292, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHospitalScene(title) {
  ctx.fillStyle = "#182126";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d9f0ff";
  ctx.fillRect(290, 305, 380, 72);
  ctx.fillStyle = "#8ac05d";
  ctx.fillRect(420, 275, 110, 38);
  ctx.fillStyle = "rgba(120, 75, 255, 0.55)";
  ctx.beginPath();
  ctx.arc(475, 295, title === "Zehir" || title === "Gec Kaldin" ? 82 : 56, 0, Math.PI * 2);
  ctx.fill();
  drawSimplePerson(705, 340, "#f4f0df");
  if (title === "Yanlis Sise" || title === "Zehir") {
    drawBottle(250, 310, title === "Zehir" ? "ZEHIR" : "IKSIR");
  }
}

function drawPotionScene(title) {
  ctx.fillStyle = "#17151a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCastleIcon(665, 255);
  drawBottle(470, title === "Tam Isabet" ? 250 : 330, title === "Zaman Geri Aliyor" ? "GERI" : "ILAC");
  drawSimplePerson(330, 365, "#486de0");
  drawSimplePerson(565, 375, "#8ac05d");
}

function drawBottle(x, y, label) {
  ctx.fillStyle = "#6ed0ff";
  ctx.fillRect(x - 18, y - 48, 36, 70);
  ctx.fillStyle = "#d9f0ff";
  ctx.fillRect(x - 10, y - 66, 20, 22);
  ctx.fillStyle = "#111712";
  ctx.font = "700 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y - 10);
}

function drawMoon(x, y) {
  ctx.fillStyle = "#f3e9bd";
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fill();
}

function drawSimpleTent(x, y, color) {
  ctx.fillStyle = "#47301c";
  ctx.fillRect(x - 86, y + 44, 172, 42);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 75, y + 44);
  ctx.lineTo(x, y - 48);
  ctx.lineTo(x + 75, y + 44);
  ctx.closePath();
  ctx.fill();
}

function drawSimplePerson(x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0c46a";
  ctx.fillRect(x - 8, y - 31, 16, 12);
}

function drawFire(x, y) {
  ctx.fillStyle = "#7b3d20";
  ctx.fillRect(x - 35, y + 28, 70, 10);
  ctx.fillStyle = "#ffd36b";
  ctx.beginPath();
  ctx.moveTo(x, y - 28 - Math.sin(performance.now() / 130) * 9);
  ctx.lineTo(x - 24, y + 32);
  ctx.lineTo(x + 24, y + 32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e15b4f";
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 8);
  ctx.lineTo(x - 12, y + 30);
  ctx.lineTo(x + 16, y + 30);
  ctx.closePath();
  ctx.fill();
}

function drawSkeletonKing(x, y) {
  drawSmallSkeleton(x, y + 35);
  ctx.fillStyle = "#d5b25c";
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 12);
  ctx.lineTo(x - 8, y - 38);
  ctx.lineTo(x, y - 12);
  ctx.lineTo(x + 8, y - 38);
  ctx.lineTo(x + 22, y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#7c5f2c";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x + 30, y + 26);
  ctx.lineTo(x + 82, y - 18);
  ctx.stroke();
}

function drawSmallSkeleton(x, y) {
  ctx.fillStyle = "#ece7d4";
  ctx.beginPath();
  ctx.arc(x, y - 36, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#181719";
  ctx.fillRect(x - 8, y - 43, 6, 8);
  ctx.fillRect(x + 6, y - 43, 6, 8);
  ctx.strokeStyle = "#ece7d4";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x, y + 30);
  ctx.moveTo(x - 26, y + 2);
  ctx.lineTo(x + 26, y + 2);
  ctx.moveTo(x, y + 30);
  ctx.lineTo(x - 18, y + 55);
  ctx.moveTo(x, y + 30);
  ctx.lineTo(x + 18, y + 55);
  ctx.stroke();
}

function drawPathScene() {
  ctx.strokeStyle = "#6b5530";
  ctx.lineWidth = 90;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(130, 410);
  ctx.bezierCurveTo(340, 260, 560, 500, 830, 300);
  ctx.stroke();
  ctx.strokeStyle = "#9a7a43";
  ctx.lineWidth = 58;
  ctx.stroke();
}

function drawCastleIcon(x, y) {
  ctx.fillStyle = "#39383e";
  ctx.fillRect(x - 82, y - 60, 164, 130);
  ctx.fillStyle = "#17151a";
  ctx.fillRect(x - 25, y + 10, 50, 60);
  ctx.fillStyle = "#2d2c33";
  ctx.fillRect(x - 64, y - 95, 40, 50);
  ctx.fillRect(x + 24, y - 95, 40, 50);
}

function drawMessage(title, subtitle) {
  ctx.save();
  ctx.fillStyle = "rgba(12, 15, 12, 0.78)";
  ctx.fillRect(canvas.width / 2 - 245, canvas.height / 2 - 78, 490, 156);
  ctx.strokeStyle = "#d5b25c";
  ctx.lineWidth = 3;
  ctx.strokeRect(canvas.width / 2 - 245, canvas.height / 2 - 78, 490, 156);

  ctx.fillStyle = "#fff0bd";
  ctx.textAlign = "center";
  ctx.font = "700 32px Arial";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 14);
  ctx.font = "18px Arial";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 30);
  ctx.restore();
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  initAudio();
  keys.add(event.key.toLowerCase());

  if (teapotDialogOpen) {
    if (event.code === "Space" || event.key.toLowerCase() === "t" || event.key === "Enter") {
      event.preventDefault();
      advanceTeapotDialog();
    } else if (event.key === "Escape") {
      teapotDialogOpen = false;
    }
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (isCutsceneState()) {
      advanceCutscene();
      return;
    }
    shoot();
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    if (isCutsceneState()) {
      advanceCutscene();
      return;
    }
    shoot(true);
  }

  if (event.key.toLowerCase() === "t") {
    event.preventDefault();
    if (!isCutsceneState()) {
      talkToTeapot();
    }
  }

  if (event.key.toLowerCase() === "b") {
    event.preventDefault();
    if (!isCutsceneState()) {
      buyShopUpgrade();
    }
  }

  if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "e") {
    if (isCutsceneState()) {
      advanceCutscene();
      return;
    }
    swordAttack();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("mousemove", (event) => {
  const point = canvasPoint(event);
  mouse.screenX = point.x;
  mouse.screenY = point.y;
  updateMouseWorld();
});

canvas.addEventListener("pointerdown", (event) => {
  initAudio();
  event.preventDefault();
  const point = canvasPoint(event);
  mouse.screenX = point.x;
  mouse.screenY = point.y;
  updateMouseWorld();

  if (isCutsceneState()) {
    advanceCutscene();
    return;
  }

  if (event.button === 2) {
    swordAttack();
  } else {
    shoot();
  }
});

canvas.addEventListener("mousedown", (event) => {
  initAudio();
  if (event.button !== 2) {
    return;
  }

  event.preventDefault();
  const point = canvasPoint(event);
  mouse.screenX = point.x;
  mouse.screenY = point.y;
  updateMouseWorld();

  if (isCutsceneState()) {
    return;
  }

  swordAttack();
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

restartButton.addEventListener("click", resetGame);
exportIntroButton.addEventListener("click", recordIntroVideoFile);
startIntroButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startIntroPlayback();
});
introVideo.addEventListener("click", (event) => {
  if (gameState !== "introVideo") {
    return;
  }

  event.stopPropagation();
  startIntroPlayback();
});
introOverlay.addEventListener("click", () => {
  if (gameState !== "introVideo") {
    return;
  }

  startIntroPlayback();
});
introVideo.addEventListener("play", () => {
  startIntroButton.classList.add("hidden");
});
introVideo.addEventListener("pause", () => {
  if (gameState === "introVideo" && !introVideo.ended) {
    startIntroButton.classList.remove("hidden");
  }
});
introVideo.addEventListener("error", () => {
  if (gameState === "introVideo") {
    window.alert("Video baslatilamadi. Sayfayi yenileyip tekrar dene.");
  }
});
skipIntroButton.addEventListener("click", startPlaying);

resetGame();
requestAnimationFrame(loop);
