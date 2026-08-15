/* 2D Car Simulator — sonsuz mod: prosedurel bolum ureteci.
   Yuklenme sirasi: levels.js -> levelgen.js -> game.js.
   100 el yapimi bolum bitince 101. bolumden itibaren bu uretec devreye girer.

   - Tohum = bolum numarasi: ayni numara her zaman ayni bolumu verir,
     boylece ilerleme ve yildiz kayitlari tutarli kalir.
   - Cozulebilirlik GARANTILI: once cozum yolu kurulur (zemin + cizgi + fan
     rotasi), engeller o yolun etrafina yerlestirilir; solve referans cizgisi
     bolume gomulur ve game.test.mjs her uretilen bolumu gercek motorla oynar.
   - Onceki bolume cok benzeyen adaylar yeniden zarlanir (deterministik,
     ayni bolum numarasi ayni deneme sirasindan gecer). */
"use strict";

// Tohumlu rastgele sayi ureteci (mulberry32)
function genMulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const genClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Bolum "imzasi": ardisik bolum benzerlik kiyasinda kullanilir
function genLevelSignature(L) {
  return [L.genChunks.join(","), Math.round(L.worldW / 150), Math.round(L.truck.bedY / 40)].join("|");
}

function genTooSimilar(a, b) {
  if (genLevelSignature(a) === genLevelSignature(b)) return true;
  const ca = a.genChunks;
  const cb = b.genChunks;
  if (ca.length !== cb.length) return false;
  let same = 0;
  for (let i = 0; i < ca.length; i++) if (ca[i] === cb[i]) same++;
  return same / ca.length >= 0.7;
}

// Tek bir aday bolum kurar. index: 0-tabanli bolum numarasi (100 = 101. bolum).
function genBuildCandidate(index, attempt) {
  const rng = genMulberry32(((index + 1) * 2654435761 + attempt * 974634 + 11) >>> 0);
  const d = Math.min(1, (index - LEVELS.length) / 130); // 0..1 zorluk katsayisi
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const rf = (a, b) => a + rng() * (b - a);

  const grounds = [];
  const walls = [];
  const noZones = [];
  const fans = [];
  const movers = [];
  const strokes = []; // solve cizgisi: parcalar (fan gecislerinde kalem kalkar)
  const chunkNames = []; // imza icin engel dizisi
  let cur = null;
  const lp = (x, y) => {
    if (!cur) {
      cur = [];
      strokes.push(cur);
    }
    cur.push(C(Math.round(x), Math.round(y)));
  };
  const breakStroke = () => {
    cur = null;
  };

  // Yol durumu: (px, py) = yolun uc noktasi; px'e kadar zeminde/cizgide
  // kesintisiz yuzey oldugu her parcada korunur.
  let px = ri(230, 330);
  let py = 400;
  grounds.push(G(0, py, px)); // baslangic zemini (araba 70,400'de)

  // --- Parcalar ---
  const doFlat = () => {
    breakStroke();
    const w = ri(150, 280);
    const py2 = genClamp(py + ri(-8, 8), 330, 400); // ufak basamak (araba yapisir)
    grounds.push(G(px, py2, w));
    px += w;
    py = py2;
  };

  const doGap = () => {
    const gw = ri(90, Math.round(140 + d * 70));
    const py2 = genClamp(py + ri(-20, 25), 315, 400);
    lp(px - 10, py);
    lp(px + gw + 10, py2); // cizgi kopru
    grounds.push(G(px + gw, py2, 40)); // inis seridi
    px += gw + 40;
    py = py2;
    chunkNames.push("gap");
  };

  const doWall = () => {
    const ww = ri(30, 44);
    const wh = ri(55, Math.round(80 + d * 45));
    const wx = px + 100;
    const wt = py - wh;
    walls.push(WL(wx, wt, ww, wh));
    grounds.push(G(px, py, ww + 210));
    lp(px - 10, py);
    lp(wx - 22, wt - 35); // duvarin ustunden kemer
    lp(wx + ww + 22, wt - 35);
    lp(px + ww + 200, py);
    px += ww + 210;
    chunkNames.push("wall");
  };

  const doZone = () => {
    const zw = ri(60, 110);
    const zt = py - ri(60, Math.round(95 + d * 35));
    const zx = px + 90;
    noZones.push(NZ(zx, zt, zw, 490 - zt)); // zeminden yukselen cizilmez blok
    grounds.push(G(px, py, zw + 200));
    lp(px - 10, py);
    lp(zx - 18, zt - 35); // cizgi blok ustunden dolanir
    lp(zx + zw + 18, zt - 35);
    lp(px + zw + 185, py);
    px += zw + 200;
    chunkNames.push("zone");
  };

  const doCeilingGap = () => {
    const gw = ri(100, 160);
    const zb = py - ri(55, 85); // tavan bolgesinin alt kenari
    noZones.push(NZ(px + 12, 0, gw - 24, zb)); // boslugun ustunde tavan
    const py2 = genClamp(py + ri(-15, 15), 315, 400);
    lp(px - 10, py); // cizgi alcaktan kopru kurmak zorunda
    lp(px + gw + 10, py2);
    grounds.push(G(px + gw, py2, 40));
    px += gw + 40;
    py = py2;
    chunkNames.push("ceiling");
  };

  const doFan = () => {
    breakStroke(); // cizgi biter: araba ruzgara birakilir
    const climb = ri(60, 85);
    const ft = py - climb; // fan ust cizgisi (araba burada suzulur)
    // fan genisligi: tirmanis suresi + suzulme payi (0.95px/kare tirmanis)
    const fw = Math.max(ri(240, 320), Math.ceil(climb * 2.65 + 60));
    fans.push(FN(px, ft, fw, climb + 50, rf(0.5, 0.6)));
    const py2 = ft + 45; // inis zemini fan ustunun ~45px altinda
    grounds.push(G(px + fw + 18, py2, 40)); // inis seridi (fan cikisi ~43-47px)
    px += fw + 58;
    py = py2;
    chunkNames.push("fan");
  };

  const doMover = () => {
    breakStroke();
    const w = ri(160, 260);
    const range = ri(40, 65);
    const my = py - 112 - range - ri(0, 25); // engel hicbir zaman yola inemez
    movers.push(MV(px + Math.round(w / 2) - 20, my, 40, 70, "y", range, rf(0.04, 0.06), rf(0, 6.28)));
    grounds.push(G(px, py, w));
    px += w;
    chunkNames.push("mover");
  };

  const doMoverGap = () => {
    const gw = ri(100, 150);
    const range = ri(40, 60);
    const my = py - 112 - range - ri(0, 20);
    movers.push(MV(px + Math.round(gw / 2) - 20, my, 40, 70, "y", range, rf(0.04, 0.06), rf(0, 6.28)));
    lp(px - 10, py); // kopru alcaktan, engelin saliniminin altindan gecer
    lp(px + gw + 10, py);
    grounds.push(G(px + gw, py, 40));
    px += gw + 40;
    chunkNames.push("movergap");
  };

  const doGate = () => {
    const gw = 34;
    const gx = px + 90;
    walls.push(WL(gx, py - 170, gw, 90)); // ust duvar: py-170 .. py-80
    walls.push(WL(gx, py - 34, gw, 34)); // alt duvar: py-34 .. py
    grounds.push(G(px, py, 260));
    lp(px - 10, py);
    lp(gx - 25, py - 42); // cizgi kapi araligindan gecer (govde 24px sigar)
    lp(gx + gw + 25, py - 42);
    lp(px + 250, py);
    px += 260;
    chunkNames.push("gate");
  };

  // --- Bolumu kur ---
  const CHUNKS = {
    gap: doGap,
    wall: doWall,
    zone: doZone,
    ceiling: doCeilingGap,
    fan: doFan,
    mover: doMover,
    movergap: doMoverGap,
    gate: doGate,
  };
  const pool = ["gap", "wall", "zone", "ceiling", "mover", "gap", "wall"];
  if (d > 0.05) pool.push("fan");
  if (d > 0.12) pool.push("gate", "movergap");

  const nObs = 2 + Math.min(4, Math.floor((index - LEVELS.length) / 18)) + (rng() < 0.5 ? 1 : 0);
  let placed = 0;
  let lastType = "";
  while (placed < nObs && px < 1750) {
    let t = pool[Math.floor(rng() * pool.length)];
    if (t === lastType) t = pool[Math.floor(rng() * pool.length)]; // ust uste ayni engel olmasin
    if (px < 1400 && rng() < 0.55) doFlat(); // nefes alan duz zemin (sona dogru kisa tut)
    CHUNKS[t]();
    chunkNames.push(t);
    lastType = t;
    placed++;
  }

  // Her bolumde en az bir "eglenceli parca" garantisi — duz zemin + basit
  // rampa bolumu uretilmez. (flat parcalar sadece nefes aldiran baglantidir)
  const FUN = ["fan", "mover", "movergap", "gate", "ceiling"];
  if (!chunkNames.some((t) => FUN.includes(t))) {
    const funPool = ["mover", "ceiling"];
    if (d > 0.05) funPool.push("fan");
    if (d > 0.12) funPool.push("movergap", "gate");
    const t = funPool[Math.floor(rng() * funPool.length)];
    if (px < 1500 && rng() < 0.5) doFlat();
    CHUNKS[t]();
    chunkNames.push(t);
  }

  while (px < 1450) doFlat(); // minimum dunya uzunlugu

  // --- Kasa yaklasimi: cizgi kasanin icine iner ---
  const bedW = ri(Math.round(88 - d * 8), 125);
  const bedX = px + ri(120, 200);
  const bedY = genClamp(py - ri(5, 55), 265, 405);
  lp(px - 10, py);
  lp(px + 40, py);
  lp(Math.round(bedX + bedW / 2), bedY);
  if (bedY <= 375) grounds.push(G(bedX - 15, bedY + 48, bedW + 75)); // kamyon alti raf
  const worldW = bedX + bedW + 44 + ri(30, 60); // kasa + kabin + pay

  let solveLen = 0;
  for (const s of strokes) {
    for (let i = 0; i < s.length - 1; i++) {
      solveLen += Math.hypot(s[i + 1].x - s[i].x, s[i + 1].y - s[i].y);
    }
  }

  const ADJ = ["Rüzgarlı", "Tozlu", "Gizli", "Uzun", "Dar", "Çılgın", "Sessiz", "Kıvrımlı", "Yüksek", "Derin", "Hızlı", "Karanlık"];
  const NOUN = ["Vadi", "Geçit", "Köprü", "Yol", "Kanyon", "Tepe", "Tünel", "Rampa", "Ova", "Sırt"];

  return {
    name: `${ADJ[ri(0, ADJ.length - 1)]} ${NOUN[ri(0, NOUN.length - 1)]}`,
    carStart: C(70, 400),
    grounds,
    walls,
    noZones,
    fans,
    movers,
    truck: T(bedX, bedY, bedW),
    lineLimit: Math.ceil(solveLen * 1.12 + 30), // cozum + biraz ek murekkep
    solve: strokes.length === 1 ? strokes[0] : strokes, // tek parca ya da parcali
    worldW,
    genChunks: chunkNames,
    generated: true,
  };
}

// Kabul edilmis bolumler (oncekiyle kiyas icin memoize)
const genMemo = new Map();

function genResolve(index) {
  // onceki bolumun KABUL EDILMIS halini bul (el yapimi son bolume kiyas yapilmaz)
  let prev = null;
  if (index - 1 >= LEVELS.length) prev = generateLevel(index - 1);
  let cand = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    cand = genBuildCandidate(index, attempt);
    if (!prev || !genTooSimilar(cand, prev)) break; // yeterince farkli: kabul
  }
  return cand;
}

// Bolum numarasindan bolum uretir (deterministik + memoize).
function generateLevel(index) {
  if (!genMemo.has(index)) genMemo.set(index, genResolve(index));
  return genMemo.get(index);
}

// Test icin: memo'yu atlayip ayni deterministik cozumlemeyi bastan yapar.
function genRebuildFresh(index) {
  return genResolve(index);
}
