(() => {
  const V = typeof window !== "undefined" ? window.Vespera : null;
  const THREE = typeof window !== "undefined" ? window.THREE : null;
  const api = {
    ready: Boolean(V),
    mode: "boot",
    getState() {
      return state;
    },
    startNew,
    continueSave,
    interact: doInteract,
    shoot,
    step,
  };
  if (typeof window !== "undefined") window.VesperaGame = api;
  if (!V) return;

  const canvas = typeof document !== "undefined" ? document.getElementById("game") : null;
  const overlay = typeof document !== "undefined" ? document.getElementById("overlay") : null;
  const overlayCard = typeof document !== "undefined" ? document.getElementById("overlayCard") : null;
  const hud = typeof document !== "undefined" ? document.getElementById("hud") : null;
  const questLabel = typeof document !== "undefined" ? document.getElementById("questLabel") : null;
  const regionLabel = typeof document !== "undefined" ? document.getElementById("regionLabel") : null;
  const hpFill = typeof document !== "undefined" ? document.getElementById("hpFill") : null;
  const storyLog = typeof document !== "undefined" ? document.getElementById("storyLog") : null;
  const fileHint = typeof document !== "undefined" ? document.getElementById("fileHint") : null;
  const storage = typeof localStorage !== "undefined" ? localStorage : null;
  const keys = new Set();

  let state = V.createState();
  let last = 0;
  let logTimer = 0;
  let lastBeat = "";
  let yaw = 0;
  let pitch = 0.28;
  let dash = 0;
  let dashCd = 0;
  let shootCd = 0;
  let world = null;

  if (typeof document !== "undefined" && document.location && document.location.protocol === "file:") {
    if (fileHint) fileHint.textContent = "Bu oyun file:// ile de açılır. Sitede yol: /oyunlar/vespera/";
  }

  if (!canvas || !THREE) {
    api.mode = "headless";
    return;
  }

  world = buildWorld();
  showMenu();
  requestAnimationFrame(loop);
  bindInput();

  function bindInput() {
    window.addEventListener("keydown", (event) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      keys.add(event.code);
      if (api.mode === "playing") {
        if (event.code === "KeyE") doInteract();
        if (event.code === "Space" || event.code === "KeyJ") shoot();
        if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "KeyK") tryDash();
      } else if ((api.mode === "menu" || api.mode === "ended") && (event.code === "Enter" || event.code === "Space")) {
        startNew();
      }
    });
    window.addEventListener("keyup", (event) => keys.delete(event.code));
    overlay?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-act]");
      if (!btn) return;
      if (btn.dataset.act === "new") startNew();
      if (btn.dataset.act === "continue") continueSave();
      if (btn.dataset.act === "menu") showMenu();
    });
    canvas.addEventListener("click", () => {
      if (api.mode === "playing") {
        canvas.requestPointerLock?.();
        shoot();
      }
    });
    document.addEventListener("mousemove", (event) => {
      if (document.pointerLockElement !== canvas || api.mode !== "playing") return;
      yaw -= event.movementX * 0.0024;
      pitch = clamp(pitch - event.movementY * 0.0018, 0.08, 0.7);
    });
    window.addEventListener("resize", fitRenderer);
  }

  function showMenu() {
    api.mode = "menu";
    if (hud) hud.hidden = true;
    if (storyLog) storyLog.hidden = true;
    if (overlay) overlay.hidden = false;
    const has = V.hasSave(storage);
    overlayCard.innerHTML = `
      <h2>Vespera</h2>
      <p>3D gezegende koş ve ateş et. Drone'lar peşinde. Hikaye uzun; Mira sandığın kişi değil.</p>
      <div class="actions">
        <button class="go" type="button" data-act="new">Dövüşe gir</button>
        ${has ? '<button class="ghost" type="button" data-act="continue">Yarıda devam</button>' : ""}
      </div>
    `;
  }

  function startNew() {
    state = V.createState();
    resetWorld();
    lastBeat = "";
    beginPlay("KAIA: Uyandın. Burası Vespera. Silahın hazır, önce beni dinle.");
  }

  function continueSave() {
    const loaded = V.loadFrom(storage);
    if (!loaded) {
      startNew();
      return;
    }
    state = V.prepareContinue(loaded);
    if (V.getOutcome(state) !== "playing" || state.hp <= 0) {
      startNew();
      return;
    }
    resetWorld();
    lastBeat = V.getCurrentBeat(state).id;
    beginPlay("Kayıt yüklendi. Silahı çek, kaldığın yerden devam.");
  }

  function beginPlay(line) {
    api.mode = "playing";
    if (overlay) overlay.hidden = true;
    if (hud) hud.hidden = false;
    say(line);
    paintHud();
    syncMeshes();
    V.saveTo(state, storage);
  }

  function endPlay() {
    api.mode = "ended";
    if (overlay) overlay.hidden = false;
    document.exitPointerLock?.();
    V.saveTo(state, storage);
    if (V.isWon(state)) {
      overlayCard.innerHTML = `
        <h2>Çekirdek kapandı</h2>
        <p>Mira gezegenin kendisiydi. Savaş bitti. Eve dönüş yolu açık.</p>
        <div class="actions"><button class="go" type="button" data-act="menu">Menü</button></div>
      `;
    } else {
      overlayCard.innerHTML = `
        <h2>Düştün</h2>
        <p>Drone'lar seni yere serdi. Yarıdan devam et, bu kez daha hızlı ateş et.</p>
        <div class="actions">
          <button class="go" type="button" data-act="continue">Yarıda devam</button>
          <button class="ghost" type="button" data-act="new">Baştan</button>
        </div>
      `;
    }
  }

  function doInteract() {
    if (api.mode !== "playing") return { ok: false };
    const before = V.getCurrentBeat(state).id;
    const result = V.interact(state);
    if (result.ok) {
      if (result.kind === "talk") say(lineFor(result.npcId));
      if (result.kind === "collect") say("Parça alındı. " + V.getObjective(state));
      if (result.kind === "event") say("Arşiv: Mira kurtarıcı değil. Koloni yapay zekâsı. Savaş!");
      if (result.kind === "boss-hit") say("Çekirdek sarsıldı.");
      if (V.getCurrentBeat(state).id !== before) V.saveTo(state, storage);
      paintHud();
      syncMeshes();
      if (V.getOutcome(state) !== "playing") endPlay();
    }
    return result;
  }

  function tryDash() {
    if (dash > 0 || dashCd > 0 || api.mode !== "playing") return;
    dash = 0.18;
    dashCd = 0.7;
  }

  function shoot() {
    if (api.mode !== "playing" || V.getOutcome(state) !== "playing" || shootCd > 0) return;
    shootCd = 0.14;
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const bolt = {
      x: state.x + dirX * 18,
      z: state.y + dirZ * 18,
      vx: dirX * 920,
      vz: dirZ * 920,
      life: 0.7,
      mesh: makeBolt(),
    };
    bolt.mesh.position.set(bolt.x, 1.4, bolt.z);
    world.scene.add(bolt.mesh);
    world.shots.push(bolt);
  }

  function lineFor(npcId) {
    if (npcId === "kaia") return "KAIA: İşaretleri topla. Drone'lar uyanıyor, ateş etmeyi unutma.";
    if (npcId === "mira") return "Mira: Birlikte sinyal kuralım. İstasyondaki hücreler lazım.";
    return V.getObjective(state);
  }

  function say(text) {
    if (!storyLog) return;
    storyLog.hidden = false;
    storyLog.textContent = text;
    logTimer = 5.5;
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    if (api.mode === "playing") step(dt);
    render();
    requestAnimationFrame(loop);
  }

  function step(dt) {
    if (V.getOutcome(state) !== "playing") {
      endPlay();
      return;
    }
    dash = Math.max(0, dash - dt);
    dashCd = Math.max(0, dashCd - dt);
    shootCd = Math.max(0, shootCd - dt);
    V.tickIFrames(state);

    let ax = 0;
    let az = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) az += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) az -= 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) ax -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) ax += 1;
    if (document.pointerLockElement !== canvas) {
      if (keys.has("KeyA") || keys.has("ArrowLeft")) {
        yaw += 2.2 * dt;
        ax = 0;
      }
      if (keys.has("KeyD") || keys.has("ArrowRight")) {
        yaw -= 2.2 * dt;
        ax = 0;
      }
    }
    if (ax || az) {
      const len = Math.hypot(ax, az) || 1;
      ax /= len;
      az /= len;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      const speed = (dash > 0 ? 620 : 340) * dt;
      V.tryMove(state, (fx * az + rx * ax) * speed, (fz * az + rz * ax) * speed);
    }
    if (dash > 0) state.iFrames = Math.max(state.iFrames, 4);

    for (const enemy of world.enemies) tickEnemy(enemy, dt);
    for (let i = world.shots.length - 1; i >= 0; i -= 1) {
      const shot = world.shots[i];
      shot.x += shot.vx * dt;
      shot.z += shot.vz * dt;
      shot.life -= dt;
      shot.mesh.position.set(shot.x, 1.4, shot.z);
      let hit = false;
      for (const enemy of world.enemies) {
        if (!enemy.alive || state.beatIndex < enemy.fromBeat) continue;
        if (Math.hypot(shot.x - enemy.x, shot.z - enemy.z) < 22) {
          enemy.hp -= 12;
          hit = true;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            enemy.mesh.visible = false;
          }
        }
      }
      const beat = V.getCurrentBeat(state);
      if (beat.type === "boss") {
        const boss = V.NPCS.find((npc) => npc.id === "mira-core");
        if (boss && Math.hypot(shot.x - boss.x, shot.z - boss.y) < 38) {
          V.applyBossDamage(state, 9);
          hit = true;
        }
      }
      if (hit || shot.life <= 0) {
        world.scene.remove(shot.mesh);
        world.shots.splice(i, 1);
      }
    }

    if (logTimer > 0) {
      logTimer -= dt;
      if (logTimer <= 0 && storyLog) storyLog.hidden = true;
    }
    const beatId = V.getCurrentBeat(state).id;
    if (beatId !== lastBeat) {
      lastBeat = beatId;
      V.saveTo(state, storage);
    }
    paintHud();
    syncMeshes();
    if (V.getOutcome(state) !== "playing") endPlay();
  }

  function tickEnemy(enemy, dt) {
    if (!enemy.alive || state.beatIndex < enemy.fromBeat) {
      enemy.mesh.visible = false;
      return;
    }
    enemy.mesh.visible = true;
    const dx = state.x - enemy.x;
    const dz = state.y - enemy.z;
    const dist = Math.hypot(dx, dz) || 1;
    const speed = enemy.id === "core-ring" ? 40 : 95;
    enemy.x += (dx / dist) * speed * dt;
    enemy.z += (dz / dist) * speed * dt;
    enemy.mesh.position.set(enemy.x, 1.2 + Math.sin(performance.now() / 180 + enemy.x) * 0.15, enemy.z);
    enemy.mesh.rotation.y += dt * 3;
    if (V.overlapCircles(state.x, state.y, V.PLAYER_R, enemy.x, enemy.z, enemy.r)) {
      V.applyPlayerDamage(state, enemy.dmg);
    }
  }

  function paintHud() {
    const region = V.regionAt(state.x, state.y);
    if (regionLabel) regionLabel.textContent = region ? region.name : "Bilinmeyen toz";
    if (questLabel) questLabel.textContent = V.getObjective(state);
    if (hpFill) hpFill.style.width = `${Math.max(0, (state.hp / state.maxHp) * 100)}%`;
  }

  function syncMeshes() {
    if (!world) return;
    world.player.position.set(state.x, 0, state.y);
    world.player.rotation.y = yaw;
    for (const item of world.items) {
      item.mesh.visible = !state.collected[item.id];
      item.mesh.rotation.y += 0.03;
      item.mesh.position.y = 1.1 + Math.sin(performance.now() / 250 + item.x) * 0.18;
    }
    for (const npc of world.npcs) {
      const beat = V.getCurrentBeat(state);
      if (npc.id === "mira-core") npc.mesh.visible = beat.type === "boss" || beat.id === "done";
      if (npc.id === "mira") {
        const mat = npc.mesh.userData.body.material;
        mat.color.set(state.miraRole === "enemy" ? 0xff4d6d : 0x8fff6a);
      }
    }
    updateCamera();
  }

  function updateCamera() {
    const back = 28;
    const height = 14 + pitch * 18;
    const cx = state.x - Math.sin(yaw) * back;
    const cz = state.y - Math.cos(yaw) * back;
    world.camera.position.lerp(new THREE.Vector3(cx, height, cz), 0.18);
    world.camera.lookAt(state.x, 1.6, state.y);
  }

  function render() {
    if (!world) return;
    world.renderer.render(world.scene, world.camera);
  }

  function resetWorld() {
    yaw = 0;
    pitch = 0.28;
    dash = 0;
    world.shots.splice(0).forEach((shot) => world.scene.remove(shot.mesh));
    for (const enemy of world.enemies) {
      const src = V.HAZARDS.find((item) => item.id === enemy.id);
      enemy.x = src.x;
      enemy.z = src.y;
      enemy.hp = 28;
      enemy.alive = true;
      enemy.mesh.visible = state.beatIndex >= enemy.fromBeat;
      enemy.mesh.position.set(enemy.x, 1.2, enemy.z);
    }
  }

  function buildWorld() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070614);
    scene.fog = new THREE.FogExp2(0x0b0816, 0.0016);
    const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.4, 4200);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.shadowMap.enabled = true;
    fitRenderer.renderer = renderer;
    fitRenderer.camera = camera;
    fitRenderer();

    scene.add(new THREE.HemisphereLight(0xb8d4ff, 0x221018, 0.7));
    const sun = new THREE.DirectionalLight(0xffe0c0, 1.15);
    sun.position.set(600, 420, 200);
    sun.castShadow = true;
    scene.add(sun);
    const rim = new THREE.PointLight(0x9d4edd, 1.4, 1800);
    rim.position.set(2480, 80, 2040);
    scene.add(rim);

    addStars(scene);
    addGround(scene);
    addLandmarks(scene);

    const player = makePlayer();
    scene.add(player);
    const items = V.ITEMS.map((item) => {
      const mesh = makeCrystal(0xffd166);
      mesh.position.set(item.x, 1.1, item.y);
      scene.add(mesh);
      return { ...item, mesh };
    });
    const npcs = V.NPCS.map((npc) => {
      const mesh = makeNpc(npc);
      mesh.position.set(npc.x, 0, npc.y);
      scene.add(mesh);
      return { ...npc, mesh };
    });
    const enemies = V.HAZARDS.map((hazard) => {
      const mesh = makeDrone(hazard.id.includes("core") ? 0xff4d6d : 0xc46cff);
      mesh.position.set(hazard.x, 1.2, hazard.y);
      scene.add(mesh);
      return { ...hazard, z: hazard.y, hp: 28, alive: true, mesh };
    });

    return { scene, camera, renderer, player, items, npcs, enemies, shots: [] };
  }

  function addStars(scene) {
    const count = 700;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = Math.random() * 3600 - 200;
      pos[i * 3 + 1] = 80 + Math.random() * 280;
      pos[i * 3 + 2] = Math.random() * 2800 - 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6 })));
  }

  function addGround(scene) {
    const w = V.PLANET.w;
    const h = V.PLANET.h;
    const geo = new THREE.PlaneGeometry(w, h, 32, 24);
    geo.rotateX(-Math.PI / 2);
    const colors = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i) + w / 2;
      const z = pos.getZ(i) + h / 2;
      const region = V.regionAt(x, z) || V.REGIONS[0];
      const c = new THREE.Color(region.ground);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.08 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(w / 2, 0, h / 2);
    mesh.receiveShadow = true;
    scene.add(mesh);
    for (const region of V.REGIONS) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(region.w - 20, 0.4, 2),
        new THREE.MeshBasicMaterial({ color: region.accent, transparent: true, opacity: 0.35 })
      );
      line.position.set(region.x + region.w / 2, 0.2, region.y + 12);
      scene.add(line);
    }
  }

  function addLandmarks(scene) {
    scene.add(box(168, 8, 360, 70, 16, 28, 0x6b7380));
    scene.add(box(1980, 16, 200, 90, 32, 60, 0x3a2a1c));
    for (let i = 0; i < 10; i += 1) {
      const tree = cone(1040 + (i % 5) * 70, 1120 + Math.floor(i / 5) * 80, 0x5dffc8);
      scene.add(tree);
    }
    const ice = new THREE.Mesh(new THREE.ConeGeometry(28, 46, 5), new THREE.MeshStandardMaterial({ color: 0x9fd6ff, transparent: true, opacity: 0.7 }));
    ice.position.set(360, 23, 1040);
    scene.add(ice);
    const crater = new THREE.Mesh(new THREE.TorusGeometry(70, 8, 8, 24), new THREE.MeshStandardMaterial({ color: 0xc48cff }));
    crater.rotation.x = Math.PI / 2;
    crater.position.set(2580, 1, 1180);
    scene.add(crater);
    for (let i = 0; i < 8; i += 1) scene.add(box(700 + i * 40, 12 + (i % 3) * 8, 1860, 18, 24 + (i % 4) * 10, 18, 0x1c1830));
    const core = new THREE.Mesh(new THREE.SphereGeometry(22, 18, 18), new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0x880018, emissiveIntensity: 0.8 }));
    core.position.set(2480, 22, 2040);
    scene.add(core);
  }

  function makePlayer() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.3, 6, 10), new THREE.MeshStandardMaterial({ color: 0x1b2430, metalness: 0.4 }));
    body.position.y = 1.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), new THREE.MeshStandardMaterial({ color: 0x35d2ff, emissive: 0x123040, emissiveIntensity: 0.4 }));
    head.position.y = 2.4;
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 1.4), new THREE.MeshStandardMaterial({ color: 0xffd166 }));
    gun.position.set(0.6, 1.4, 0.7);
    g.add(body, head, gun);
    g.castShadow = true;
    return g;
  }

  function makeNpc(npc) {
    const g = new THREE.Group();
    const color = npc.id === "kaia" ? 0x35d2ff : npc.id === "mira-core" ? 0xff4d6d : npc.id === "arsiv" ? 0xc48cff : 0x8fff6a;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.6, 6, 10), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18 }));
    body.position.y = 1.5;
    g.add(body);
    g.userData.body = body;
    return g;
  }

  function makeCrystal(color) {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55 }));
    return mesh;
  }

  function makeDrone(color) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, metalness: 0.5 }));
    return mesh;
  }

  function makeBolt() {
    return new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
  }

  function box(x, y, z, w, h, d, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  }

  function cone(x, z, color) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(8, 28, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 }));
    mesh.position.set(x, 14, z);
    return mesh;
  }

  function fitRenderer() {
    if (!fitRenderer.renderer) return;
    const w = canvas.clientWidth || 960;
    const h = canvas.clientHeight || 540;
    fitRenderer.renderer.setSize(w, h, false);
    fitRenderer.camera.aspect = w / Math.max(1, h);
    fitRenderer.camera.updateProjectionMatrix();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
