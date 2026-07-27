/**
 * HENTW series kit: WebAudio SFX, particles, minimap.
 */
export function createAudioBus() {
  let ctx = null;
  function ensure() {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  function beep(freq, dur, type = "square", vol = 0.07) {
    try {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur + 0.02);
    } catch {
      /* ignore */
    }
  }
  return {
    click: () => beep(440, 0.05, "sine", 0.05),
    ui: () => beep(520, 0.06, "sine", 0.06),
    shoot: () => beep(220, 0.07, "square", 0.045),
    hit: () => beep(110, 0.1, "sawtooth", 0.06),
    pickup: () => {
      beep(660, 0.07, "sine", 0.06);
      setTimeout(() => beep(880, 0.09, "sine", 0.06), 55);
    },
    win: () => {
      beep(523, 0.09, "sine", 0.06);
      setTimeout(() => beep(659, 0.09, "sine", 0.06), 90);
      setTimeout(() => beep(784, 0.18, "sine", 0.07), 180);
    },
    door: () => beep(180, 0.14, "triangle", 0.07),
    fail: () => beep(95, 0.18, "sawtooth", 0.05),
  };
}

export function createParticleSystem(THREE, scene) {
  const particles = [];
  function spawnBurst(x, y, z, color = 0x66ffcc, count = 14, speed = 3.5) {
    if (particles.length > 180) {
      const kill = particles.length - 140;
      for (let k = 0; k < kill; k++) {
        const old = particles.shift();
        if (!old) break;
        scene.remove(old.mesh);
        old.mesh.geometry.dispose();
        old.mesh.material.dispose();
      }
    }
    const n = Math.min(22, count);
    for (let i = 0; i < n; i++) {
      const size = 0.05 + Math.random() * 0.08;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 5, 5),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 1,
          depthWrite: false,
        })
      );
      mesh.position.set(x, y, z);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.95,
        (Math.random() - 0.5) * speed
      );
      const life = 0.35 + Math.random() * 0.55;
      scene.add(mesh);
      particles.push({ mesh, vel, life, maxLife: life, grav: 5 + Math.random() * 4 });
    }
  }
  function spawnSparks(x, y, z, color = 0xffcc66, count = 10) {
    spawnBurst(x, y, z, color, count, 5);
  }
  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.vel.y -= p.grav * dt;
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      const t = Math.max(0, p.life / p.maxLife);
      p.mesh.material.opacity = t;
      const s = 0.35 + t * 0.9;
      p.mesh.scale.set(s, s, s);
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        particles.splice(i, 1);
      }
    }
  }
  return { spawnBurst, spawnSparks, update };
}

export function drawMinimap(canvas, bounds, worldToMinimap, player, markers) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(8,12,24,0.85)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(120,180,255,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  const size = Math.min(w, h);
  for (const m of markers || []) {
    if (!m || m.x == null) continue;
    const p = worldToMinimap(m.x, m.z, bounds, size);
    ctx.fillStyle = m.color || "#ffcc66";
    ctx.beginPath();
    ctx.arc(p.x, p.y, m.r || 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (player) {
    const p = worldToMinimap(player.x, player.z, bounds, size);
    ctx.fillStyle = "#66ffcc";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
