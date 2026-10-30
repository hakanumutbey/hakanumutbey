// BÖLÜM 2 — KARANLIK ODA (Z: -16.5 ile -26.5 arası)
// Güç odasının son kapısından girilince kapı arkadan çarpıp kilitlenir, bütün ışıklar söner.
// Oyuncu karanlıkta parlayan el fenerini bulur; fener açıkken pil azalır. Çıkış kapısının şifresinin
// 4 hanesi duvarlara yazılı ama yalnızca fener ışığı üstüne tutulunca görünür. Karanlıkta zararsız
// bir gölge dolaşır, fenerle bakınca kaybolur.

const CH2_CODE = "3816";
const CH2_Z = { start: -16.5, end: -26.5 };

const ch2 = {
  entered: false, // kapı arkadan çarptı mı
  done: false, // çıkış kapısı açıldı mı
  batteries: [],
  clues: [],
  shadow: null,
  shadowTimer: 9,
  shadowLife: 0,
  crankCooldown: 0,
  glow: null
};
let doorCh2Exit;

chapterBuilders.push(buildChapter2);
updateHooks.push(updateChapter2);

const NOTE_CH2 = {
  title: "🕯️ YIRTIK KAĞIT",
  body: "Çıkış kapısının şifresi 4 haneli. Rakamlar bu odanın duvarlarına yazıldı ama sadece fener ışığı tutunca görünür. Rakamın üstündeki çizgi sayısı, kaçıncı hane olduğunu söyler. Pil çabuk biter, fenerini boşa yakma!"
};

function buildChapter2() {
  const wallMat = new THREE.MeshPhongMaterial({ map: makeTileTexture("#141b2b", "#1f2937"), shininess: 20 });
  const crateMat = new THREE.MeshPhongMaterial({ color: 0x57381c, shininess: 10 });
  const metalMat = new THREE.MeshPhongMaterial({ color: 0x3f4856, shininess: 60 });

  // Çıkış duvarı Z = -26.5. Bölüm 3 deposu daha geniş (X ±8) ve yüksek (5m) olduğu için duvar ona göre.
  addWall(-4.675, 2.5, -26.5, 6.95, 5.0, 0.35, wallMat);
  addWall(4.675, 2.5, -26.5, 6.95, 5.0, 0.35, wallMat);
  addWall(0, 4.0, -26.5, 2.4, 2.0, 0.35, wallMat);

  doorCh2Exit = createDoubleDoor(0, -26.5, "keypad", "Kapı kilitli! Sağdaki tuş takımına şifreyi gir.", d => {
    if (!d.isOpen) {
      showToast("Kapı kilitli! Şifre duvarlarda gizli, fenerle ara.");
      playSound("error");
    }
  });

  // Çıkış tuş takımı (kapının sağında; açılan kanat X = 1.2'de durur)
  const keypadMesh = new THREE.Mesh(getBlenderGeo("keypad_panel", new THREE.BoxGeometry(0.45, 0.65, 0.15)), metalMat);
  keypadMesh.position.set(1.9, 1.6, -26.25);
  scene.add(keypadMesh);
  addColliderBox(1.67, 1.27, -26.35, 2.13, 1.93, -26.17);
  const keypadScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.12), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  keypadScreen.position.set(1.9, 1.75, -26.165);
  scene.add(keypadScreen);
  registerInteractable({
    pos: new THREE.Vector3(1.9, 1.6, -26.2),
    radius: 3.2,
    getPrompt: () => (ch2.done ? "Şifre Çözüldü ✅" : "[E] Çıkış Şifresini Gir"),
    action: () => {
      if (!ch2.done) openKeypad({ code: CH2_CODE, title: "ÇIKIŞ KAPISI", onSuccess: openChapter2Exit });
    }
  });

  // Fener sandığı: girişin sağında, yeşil ışıkla zayıfça parlar
  addSolidBlock(3.0, 0.4, -18.4, 0.8, 0.8, 0.8, crateMat);
  const torch = new THREE.Group();
  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12), new THREE.MeshPhongMaterial({ color: 0x1f2937, emissive: 0x052e16 }));
  torchBody.rotation.z = Math.PI / 2;
  torch.add(torchBody);
  const torchHead = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.1, 12), new THREE.MeshPhongMaterial({ color: 0x22c55e, emissive: 0x15803d }));
  torchHead.rotation.z = Math.PI / 2;
  torchHead.position.x = -0.2;
  torch.add(torchHead);
  torch.position.set(3.0, 0.885, -18.4);
  scene.add(torch);
  const glow = new THREE.PointLight(0x22c55e, 1.3, 3.2);
  glow.position.set(3.0, 1.3, -18.4);
  glow.visible = false; // odaya girilince yanar (görünmez ışık FPS'e yük olmaz)
  scene.add(glow);
  ch2.glow = glow;
  registerInteractable({
    pos: new THREE.Vector3(3.0, 0.9, -18.4),
    radius: 3.0,
    getPrompt: () => {
      if (!ch2.entered) return "";
      return player.hasFlashlight ? "🔄 [E] Şarj Kolunu Çevir (+%15 pil)" : "🔦 [E] El Fenerini Al";
    },
    action: () => {
      handTriggerReach();
      if (!player.hasFlashlight) {
        player.hasFlashlight = true;
        player.flashOn = true;
        player.battery = Math.max(player.battery, 60);
        torch.visible = false;
        glow.intensity = 0.35;
        playSound("success");
        showToast("EL FENERİ ALINDI! [F] ile aç/kapat. Pil azalıyor, dikkat!", 4500);
        updateObjective("BÖLÜM 2 · KARANLIK ODA", "Soldaki parlayan kağıdı oku, duvarlardaki gizli rakamları fenerle bul.");
      } else if (ch2.crankCooldown <= 0) {
        ch2.crankCooldown = 0.8;
        player.battery = Math.min(100, player.battery + 15);
        playSound("click");
        showToast("Şarj kolu çevrildi: pil %" + Math.round(player.battery));
      }
    }
  });

  // Fosforlu not (sol duvarda, karanlıkta hafif parlar)
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), new THREE.MeshBasicMaterial({ color: 0x4d7c0f }));
  paper.rotation.y = Math.PI / 2;
  paper.position.set(-3.98, 1.5, -18.2);
  scene.add(paper);
  registerInteractable({
    pos: new THREE.Vector3(-3.85, 1.5, -18.2),
    radius: 3.0,
    getPrompt: () => (isNoteOpen ? "[E] Kağıdı Kapat" : "[E] Yırtık Kağıdı Oku"),
    action: () => toggleNote(NOTE_CH2)
  });

  // Orta sütun, sol raf, sağ sandıklar
  addSolidBlock(0, 2.0, -21.5, 0.6, 4.0, 0.6, metalMat);
  buildShelfUnit(-3.55, -21.0, metalMat);
  addSolidBlock(3.2, 0.45, -22.8, 0.9, 0.9, 0.9, crateMat);
  addSolidBlock(3.3, 0.35, -24.6, 0.7, 0.7, 0.7, crateMat);

  // Piller: karanlıkta görülsünler diye sarı parlarlar
  // y = üstünde durduğu yüzey (pil yarıçapı kadar yukarıda çizilir)
  addBattery(-3.5, 2.005, -20.4); // rafın üstü
  addBattery(0, 0, -22.25); // sütunun arkasında yerde
  addBattery(3.2, 0.9, -22.8); // sandığın üstü

  // Gizli rakamlar: [hane sırası, rakam, konum, Y dönüşü]
  addClue(1, CH2_CODE[0], new THREE.Vector3(-3.975, 2.1, -19.6), Math.PI / 2);
  addClue(2, CH2_CODE[1], new THREE.Vector3(-3.0, 1.8, -26.31), 0);
  addClue(3, CH2_CODE[2], new THREE.Vector3(3.975, 1.5, -23.8), -Math.PI / 2);
  addClue(4, CH2_CODE[3], new THREE.Vector3(0, 1.7, -21.81), Math.PI);

  buildShadowFigure();
}

function buildShelfUnit(x, z, mat) {
  // Görünür arka/yan paneller ve raf tahtaları; çarpışma tüm raf için tek kutu (X ±0.4, Z ±1.2, Y 0..2)
  const panel = (w, h, d, px, py, pz) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    scene.add(m);
  };
  panel(0.08, 2.0, 2.4, x - 0.36, 1.0, z);
  panel(0.8, 2.0, 0.08, x, 1.0, z + 1.16);
  panel(0.8, 2.0, 0.08, x, 1.0, z - 1.16);
  [0.05, 0.7, 1.35, 1.98].forEach(y => panel(0.8, 0.05, 2.4, x, y, z));
  addColliderBox(x - 0.4, 0, z - 1.2, x + 0.4, 2.0, z + 1.2);
}

function addBattery(x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12),
    new THREE.MeshPhongMaterial({ color: 0xfacc15, emissive: 0x6b5300 })
  );
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y + 0.05, z);
  scene.add(mesh);
  const b = { mesh, taken: false };
  ch2.batteries.push(b);
  registerInteractable({
    pos: new THREE.Vector3(x, y + 0.05, z),
    radius: 2.8,
    getPrompt: () => (b.taken || !ch2.entered ? "" : "🔋 [E] Pil Al (+%40)"),
    action: () => {
      b.taken = true;
      mesh.visible = false;
      player.battery = Math.min(100, player.battery + 40);
      playSound("success");
      handTriggerReach();
      showToast("PİL ALINDI! Fener pili %" + Math.round(player.battery));
    }
  });
}

// Yalnızca fener ışığında görünen rakam: üstte hane sırasını gösteren çizgiler, altta rakam
function addClue(order, digit, pos, rotY) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c084fc";
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 12;
  for (let i = 0; i < order; i++) ctx.fillRect(64 - order * 11 + i * 22 + 4, 10, 12, 30);
  ctx.font = "bold 100px monospace";
  ctx.textAlign = "center";
  ctx.fillText(digit, 64, 145);
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), mat);
  mesh.position.copy(pos);
  mesh.rotation.y = rotY;
  scene.add(mesh);
  ch2.clues.push({ mesh, order, digit, seen: false });
}

function buildShadowFigure() {
  const g = new THREE.Group();
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 1.6, 10), black);
  body.position.y = 0.8;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), black);
  head.position.y = 1.8;
  g.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1a1a });
  [-0.07, 0.07].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
    eye.position.set(x, 1.83, 0.18);
    g.add(eye);
  });
  g.visible = false;
  g.userData.ghost = true; // içinden geçilebilir, çarpışma taraması saymaz
  scene.add(g);
  ch2.shadow = g;
}

// Gölgenin görünebileceği yerler (raf, sandık ve sütunlardan uzak)
const SHADOW_SPOTS = [[-2.2, -24.6], [2.1, -20.4], [-2.0, -22.8], [1.9, -24.0]];

function openChapter2Exit() {
  doorCh2Exit.isOpen = true;
  ch2.done = true;
  ch2.shadow.visible = false;
  showToast("ŞİFRE DOĞRU! Çıkış kapısı açıldı. Karanlıktan kurtuldun!");
  updateObjective("BÖLÜM 3 · DEPO", "Kapıdan geç ve büyük depoya gir.");
}

function inChapter2Zone() {
  return player.pos.z < CH2_Z.start && player.pos.z > CH2_Z.end;
}

function enterDarkRoom() {
  ch2.entered = true;
  doorFinal.isOpen = false;
  doorFinal.promptText = "Kapı arkandan kilitlendi!";
  player.hasFlashlight = false;
  player.flashOn = false;
  roomLights.forEach(l => {
    l.intensity = 0;
    l.visible = false;
  });
  ch2.glow.visible = true;
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.07);
  playSound("slam");
  showToast("KAPI ARKANDAN ÇARPTI! Işıklar söndü... Sağda bir şey yeşil parlıyor.", 5000);
  updateObjective("BÖLÜM 2 · KARANLIK ODA", "Karanlıkta yeşil parlayan el fenerini bul [E].");
}

function updateChapter2(dt) {
  if (!ch2.entered && doorFinal.isOpen && player.pos.z < -18.2) enterDarkRoom();
  if (!ch2.entered) return;

  if (inChapter2Zone()) {
    ambientLight.intensity += (0.012 - ambientLight.intensity) * Math.min(1, dt * 3);

    if (player.flashOn) {
      player.battery = Math.max(0, player.battery - 1.6 * dt);
      if (player.battery <= 0) {
        player.flashOn = false;
        playSound("error");
        showToast("🔋 PİL BİTTİ! Sarı parlayan pilleri ara ya da fener sandığındaki kolu çevir.", 5000);
      }
    }
  }
  ch2.crankCooldown -= dt;

  const flashing = player.hasFlashlight && player.flashOn;
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const lit = (pos, maxAngle, maxDist) => {
    if (!flashing) return false;
    const v = pos.clone().sub(camera.position);
    const d = v.length();
    return d < maxDist && camDir.angleTo(v) < maxAngle && hasLineOfSight(camera.position, pos);
  };

  // Rakamlar: fener tutulunca belirir, çekince kaybolur
  ch2.clues.forEach(c => {
    const on = lit(c.mesh.position, 0.42, 9);
    c.mesh.material.opacity += ((on ? 1 : 0) - c.mesh.material.opacity) * Math.min(1, dt * 6);
    if (on && !c.seen && c.mesh.material.opacity > 0.6) {
      c.seen = true;
      playSound("click");
      showToast(`Gizli rakam bulundu! (${ch2.clues.filter(x => x.seen).length}/4)`);
    }
  });

  // Gölge: arada bir uzak bir köşede belirir, fenerle bakınca fısıldayıp kaybolur
  if (!ch2.done) {
    const s = ch2.shadow;
    if (!s.visible) {
      ch2.shadowTimer -= dt;
      if (ch2.shadowTimer <= 0) {
        const spots = SHADOW_SPOTS.filter(([x, z]) => Math.hypot(x - player.pos.x, z - player.pos.z) > 4.5);
        if (spots.length) {
          const [x, z] = spots[Math.floor(Math.random() * spots.length)];
          s.position.set(x, 0, z);
          s.lookAt(player.pos.x, 0, player.pos.z);
          s.visible = true;
          ch2.shadowLife = 5;
        }
        ch2.shadowTimer = 3;
      }
    } else {
      ch2.shadowLife -= dt;
      if (lit(s.position.clone().setY(1.5), 0.35, 12)) {
        s.visible = false;
        playSound("whisper");
        showToast("...bir fısıltı duydun.", 2000);
        ch2.shadowTimer = 10 + Math.random() * 8;
      } else if (ch2.shadowLife <= 0) {
        s.visible = false;
        ch2.shadowTimer = 8 + Math.random() * 8;
      }
    }
  }

  const hud = document.getElementById("batteryHud");
  hud.style.display = player.hasFlashlight ? "flex" : "none";
  const fill = document.getElementById("batteryFill");
  fill.style.width = player.battery + "%";
  fill.style.background = player.battery > 40 ? "#22c55e" : player.battery > 15 ? "#f59e0b" : "#ef4444";
  document.getElementById("batteryText").innerText = (player.flashOn ? "🔦 " : "⚫ ") + Math.round(player.battery) + "%";
}
