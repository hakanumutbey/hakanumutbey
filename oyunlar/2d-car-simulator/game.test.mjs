// 2D Car Simulator — 100 bolumun tamamini otomatik oynayan test.
// game.js'i sahte DOM ile Node icinde calistirir, her bolum icin cozucu bir
// cizgi cizer ve fizik motorunu adim adim calistirarak "won" durumunu bekler.
// Calistirma: node oyunlar/2d-car-simulator/game.test.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "game.js"), "utf8");

// ---------- Sahte DOM ----------
function el() {
  return {
    textContent: "",
    innerHTML: "",
    className: "",
    hidden: false,
    disabled: false,
    type: "",
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    appendChild() {},
    replaceChildren() {},
    setPointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 480 }),
  };
}

const ctxStub = new Proxy(
  {},
  {
    get: (t, p) => (t[p] ??= () => ({ addColorStop() {} })),
    set: (t, p, v) => ((t[p] = v), true),
  }
);

const canvasEl = el();
canvasEl.width = 800;
canvasEl.height = 480;
canvasEl.getContext = () => ctxStub;

const storage = new Map();
const sandbox = {
  document: {
    getElementById: (id) => (id === "game" ? canvasEl : el()),
    createElement: () => el(),
    addEventListener() {},
  },
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
  },
  requestAnimationFrame: () => 0, // ana dongu bir kez calissin, donmesin
  setTimeout: () => 0,
  setInterval: () => 0,
  clearInterval() {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "game.js" });

const sim = sandbox.window.__carSim;
if (!sim) throw new Error("__carSim test kancasi bulunamadi");

// ---------- Cozucu: duz rampa + duvar ustunden / bolge altindan gecis ----------
function solveLine(L) {
  const pts = [{ x: L.carStart.x, y: L.carStart.y }];
  const bedCX = L.truck.bedX + L.truck.bedW / 2;
  const rampY = (x) =>
    L.carStart.y + ((L.truck.bedY - L.carStart.y) * (x - L.carStart.x)) / (bedCX - L.carStart.x);
  const obstacles = [];
  for (const w of [...L.walls].sort((a, b) => a.x - b.x)) {
    // rampa duvarin icinden geciyorsa duvarin ustunden plato yap
    if (rampY(w.x + w.w / 2) > w.y - 30) {
      obstacles.push({ x: w.x, w: w.w, y: w.y - 35 });
    }
  }
  for (const z of L.noZones || []) {
    if (z.y + z.h >= 400) {
      obstacles.push({ x: z.x, w: z.w, y: z.y - 35 }); // yerden yukselen blok: ustunden
    } else {
      obstacles.push({ x: z.x, w: z.w, y: z.y + z.h + 35 }); // tavan blogu: altindan
    }
  }
  obstacles.sort((a, b) => a.x - b.x);
  for (const o of obstacles) {
    pts.push({ x: o.x - 15, y: o.y }, { x: o.x + o.w + 15, y: o.y });
  }
  pts.push({ x: bedCX, y: L.truck.bedY });
  return pts;
}

// Cozum cizgisi cizilmez bolgeyi ihlal ediyor mu? (4px aralikla ornekle)
function zoneViolation(pts, L) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d <= len; d += 4) {
      const px = a.x + ((b.x - a.x) * d) / len;
      const py = a.y + ((b.y - a.y) * d) / len;
      for (const z of L.noZones || []) {
        if (px > z.x - 2 && px < z.x + z.w + 2 && py > z.y - 2 && py < z.y + z.h + 2) {
          return `cizgi bolgeyi ihlal ediyor (${Math.round(px)},${Math.round(py)})`;
        }
      }
    }
  }
  return null;
}

function lineLength(pts) {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return len;
}

// ---------- 100 bolumu oyna ----------
const failures = [];
let maxSteps = 0;
for (let i = 0; i < sim.LEVELS.length; i++) {
  const L = sim.LEVELS[i];
  const pts = solveLine(L);
  const len = Math.round(lineLength(pts));
  const limit = L.lineLimit || sim.MAX_LINE;
  if (len > limit) {
    failures.push(`#${i + 1} (${L.name}): cozum cizgisi cok uzun (${len} > ${limit})`);
    continue;
  }
  const violation = zoneViolation(pts, L);
  if (violation) {
    failures.push(`#${i + 1} (${L.name}): ${violation}`);
    continue;
  }
  sim.selectLevel(i);
  sim.setLine(pts);
  let steps = 0;
  while (sim.mode === "drive" && steps < 4000) {
    sim.step();
    steps++;
  }
  maxSteps = Math.max(maxSteps, steps);
  if (sim.mode !== "won") {
    const car = sim.car;
    failures.push(
      `#${i + 1} (${L.name}): ${steps} adimda "${sim.mode}" — ${sim.lastOverlay.title}: ${sim.lastOverlay.text} ` +
        `(araba x=${Math.round(car.x)}, yukseklik=${Math.round(car.bottom)})`
    );
  }
}

console.log(`Toplam bolum: ${sim.LEVELS.length}`);
console.log(`Gecen: ${sim.LEVELS.length - failures.length}, kalan: ${failures.length} (en uzun suruc: ${maxSteps} adim)`);
for (const f of failures) console.log("  HATA:", f);

// Regresyon: 5. bolumde (Duvar Engeli) yerde duz giden araba duvarin icinden
// GECEMEMELI — govde carpma kontrolu calisiyor mu?
sim.selectLevel(4);
sim.setLine([
  { x: 70, y: 400 },
  { x: 680, y: 400 },
]);
for (let s = 0; s < 4000 && sim.mode === "drive"; s++) sim.step();
if (sim.mode === "lost" && sim.lastOverlay.text.includes("duvar")) {
  console.log("Regresyon OK: 5. bolumde duvar arabayi durduruyor.");
} else {
  failures.push(`#5 duvar regresyonu: mod "${sim.mode}", mesaj "${sim.lastOverlay.text}"`);
  console.log("  HATA: 5. bolumde araba duvarin icinden gecti!");
}

if (failures.length) process.exit(1);
console.log("Tum bolumler otomatik oynanip bitirilebildi.");

// ---------- Kalite/cesitlilik raporu (--stats) ----------
if (process.argv.includes("--stats")) {
  console.log("\nBolum istatistikleri (10'arli gruplar):");
  for (let base = 0; base < sim.LEVELS.length; base += 10) {
    const group = sim.LEVELS.slice(base, base + 10);
    const walls = group.map((L) => L.walls.length);
    const lifts = group.map((L) => Math.round(352 - L.truck.bedY));
    const gaps = group.map((L) => {
      const sorted = [...L.grounds].sort((a, b) => a.x - b.x);
      let g = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        g += Math.max(0, sorted[i + 1].x - (sorted[i].x + sorted[i].w));
      }
      return Math.round(g);
    });
    console.log(
      `  ${String(base + 1).padStart(3)}-${base + 10}: duvar ${Math.min(...walls)}-${Math.max(...walls)}, ` +
        `kasa yukseltisi ${Math.min(...lifts)}-${Math.max(...lifts)}px, toplam bosluk ${Math.min(...gaps)}-${Math.max(...gaps)}px`
    );
  }
  // tekdüzelik kontrolu: duvarsiz + bosluksuz + duz bolumler ust uste gelmemeli
  let flatRun = 0;
  let worstFlatRun = 0;
  for (let i = 5; i < sim.LEVELS.length; i++) {
    const L = sim.LEVELS[i];
    const sorted = [...L.grounds].sort((a, b) => a.x - b.x);
    let gap = 0;
    for (let j = 0; j < sorted.length - 1; j++) gap += Math.max(0, sorted[j + 1].x - (sorted[j].x + sorted[j].w));
    const plain = L.walls.length === 0 && gap === 0 && L.truck.bedY > 340;
    flatRun = plain ? flatRun + 1 : 0;
    worstFlatRun = Math.max(worstFlatRun, flatRun);
  }
  console.log(`En uzun duz/sade bolum serisi: ${worstFlatRun}`);
}
