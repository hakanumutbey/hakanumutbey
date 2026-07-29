import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  createRng,
  buildFileSystem,
  buildLocks,
  makeCarkPuzzle,
  makeKodPuzzle,
  makeSinyalPuzzle,
  makeYapbozPuzzle,
  makeFarkPuzzle,
  makePuzzle,
  checkAnswer,
  signalPosition,
  isInZone,
  normalizeWord,
  normalizeReportName,
  PUZZLE_TYPES,
  CARK_SEMBOLLERI,
  YAPBOZ_HEDEF,
  MISSIONS,
  SCORE_UNLOCK,
  SCORE_FIRST_TRY_BONUS,
  SCORE_REPORT_FIRST_TRY_BONUS,
} from "./gameLogic.js";

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

test("normalizeWord Türkçe karakterleri ASCII'ye çevirir", () => {
  assert.equal(normalizeWord("  hayalet "), "HAYALET");
  assert.equal(normalizeWord("ışık"), "ISIK");
});

test("createRng deterministiktir", () => {
  const a = createRng(7);
  const b = createRng(7);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test("PUZZLE_TYPES 5 türü içerir (kablo yok, çark var)", () => {
  assert.deepEqual([...PUZZLE_TYPES].sort(), ["cark", "fark", "kod", "sinyal", "yapboz"]);
});

// ---------------------------------------------------------------------------
// 🎡 Çark Kilidi
// ---------------------------------------------------------------------------

test("cark: deterministik üretici + kombinasyon kontrolü", () => {
  const p = makeCarkPuzzle({
    wheels: 3,
    symbolCount: 4,
    target: ["⭐", "🌙", "⭐"],
    clue: "ipucu!",
  });
  assert.equal(p.wheels, 3);
  assert.deepEqual(p.symbols, ["⭐", "🌙", "☀️", "🚀"]);
  assert.deepEqual(p.target, ["⭐", "🌙", "⭐"]);
  assert.equal(p.clue, "ipucu!");
  assert.ok(p.hint.includes("⭐"));
  // Doğru kombinasyon
  assert.equal(checkAnswer(p, ["⭐", "🌙", "⭐"]), true);
  // Tek çark yanlış → tamamı yanlış (hangisi olduğu söylenmez)
  assert.equal(checkAnswer(p, ["⭐", "☀️", "⭐"]), false);
  assert.equal(checkAnswer(p, ["🌙", "🌙", "⭐"]), false);
  assert.equal(checkAnswer(p, ["⭐", "🌙"]), false); // eksik çark
});

test("cark: rng üretimi geçerli sembol seti ve doğrulanabilir", () => {
  const rng = createRng(11);
  for (let i = 0; i < 20; i++) {
    const p = makeCarkPuzzle({ rng, wheels: 4, symbolCount: 6 });
    assert.equal(p.wheels, 4);
    assert.equal(p.target.length, 4);
    for (const s of p.target) assert.ok(CARK_SEMBOLLERI.includes(s));
    assert.equal(checkAnswer(p, p.target), true);
    const wrong = p.target.slice();
    wrong[0] = CARK_SEMBOLLERI.find((s) => s !== wrong[0]);
    assert.equal(checkAnswer(p, wrong), false);
  }
});

// ---------------------------------------------------------------------------
// 🔑 Kod Kilidi
// ---------------------------------------------------------------------------

test("kod: deterministik üretici + cevap kontrolü (baştaki sıfırlar önemli)", () => {
  const p = makeKodPuzzle({ code: "0404", clue: "Vaka no!", hint: "404 → 0404" });
  assert.equal(p.answer, "0404");
  assert.equal(p.clue, "Vaka no!");
  assert.equal(p.hint, "404 → 0404");
  assert.equal(checkAnswer(p, "0404"), true);
  assert.equal(checkAnswer(p, " 0404 "), true); // boşluk toleranslı
  assert.equal(checkAnswer(p, "404"), false); // 3 hane olmaz
  assert.equal(checkAnswer(p, "0405"), false);
  assert.equal(checkAnswer(p, "abcd"), false);
});

test("kod: rng üretimi 4 haneli ve doğrulanabilir", () => {
  const rng = createRng(3);
  for (let i = 0; i < 20; i++) {
    const p = makeKodPuzzle({ rng });
    assert.match(p.code, /^\d{4}$/);
    assert.equal(checkAnswer(p, p.code), true);
  }
});

// ---------------------------------------------------------------------------
// 📡 Sinyal Yakalama
// ---------------------------------------------------------------------------

test("sinyal: konum fonksiyonu üçgen dalga ve bölge kontrolü", () => {
  const p = makeSinyalPuzzle({ period: 1000, zoneSize: 0.34, required: 2 });
  assert.equal(signalPosition(p, 0), 0);
  assert.equal(signalPosition(p, 500), 1); // tepe
  assert.equal(signalPosition(p, 1000), 0);
  assert.ok(Math.abs(signalPosition(p, 250) - 0.5) < 1e-9);
  assert.ok(isInZone(p, 0.5));
  assert.ok(!isInZone(p, 0.0));
  assert.ok(!isInZone(p, 0.9));
});

test("sinyal: cevap kontrolü — 2 bölge içi yakalama gerekir", () => {
  const p = makeSinyalPuzzle({ period: 1000, zoneSize: 0.34, required: 2 });
  assert.equal(checkAnswer(p, [0.5, 0.5]), true);
  assert.equal(checkAnswer(p, [0.5, 0.45]), true);
  assert.equal(checkAnswer(p, [0.5]), false); // tek yakalama yetmez
  assert.equal(checkAnswer(p, [0.5, 0.9]), false); // biri bölge dışı
  assert.equal(checkAnswer(p, [0.1, 0.2]), false);
});

// ---------------------------------------------------------------------------
// 🧩 Yapboz
// ---------------------------------------------------------------------------

function swapDistance(a, b) {
  // a'yı b'ye çevirmek için gereken minimum swap sayısı = n - döngü sayısı
  const pos = new Map(b.map((v, i) => [v, i]));
  const perm = a.map((v) => pos.get(v));
  const seen = new Array(a.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < a.length; i++) {
    if (seen[i]) continue;
    cycles++;
    let j = i;
    while (!seen[j]) {
      seen[j] = true;
      j = perm[j];
    }
  }
  return a.length - cycles;
}

test("yapboz: deterministik scramble + cevap kontrolü", () => {
  const target = YAPBOZ_HEDEF;
  const scramble = [target[3], target[1], target[2], target[0], target[4], target[5], target[6], target[7], target[8]];
  const p = makeYapbozPuzzle({ target, scramble });
  assert.deepEqual(p.tiles, scramble);
  assert.equal(checkAnswer(p, target), true);
  assert.equal(checkAnswer(p, scramble), false);
});

test("yapboz: rng karışımı çözülebilir ve 3-4 swap uzaklığında", () => {
  const rng = createRng(5);
  for (let i = 0; i < 30; i++) {
    const p = makeYapbozPuzzle({ rng });
    assert.equal(p.tiles.length, 9);
    assert.deepEqual([...p.tiles].sort(), [...p.target].sort()); // permütasyon
    assert.notDeepEqual(p.tiles, p.target); // karışık başlar
    const d = swapDistance(p.tiles, p.target);
    assert.ok(d >= 1 && d <= 4, `swap uzaklığı: ${d}`);
    assert.equal(checkAnswer(p, p.target), true);
  }
});

// ---------------------------------------------------------------------------
// 👆 Fark Bul
// ---------------------------------------------------------------------------

test("fark: deterministik üretici — tam 3 fark, doğru kontrol", () => {
  const p = makeFarkPuzzle({ diffIndices: [1, 5, 9] });
  assert.equal(p.left.length, 12);
  assert.equal(p.right.length, 12);
  const diffs = p.left.map((v, i) => i).filter((i) => p.left[i] !== p.right[i]);
  assert.deepEqual(diffs, [1, 5, 9]);
  assert.equal(checkAnswer(p, [9, 1, 5]), true); // sıra önemsiz
  assert.equal(checkAnswer(p, [1, 5]), false); // eksik
  assert.equal(checkAnswer(p, [1, 5, 8]), false); // yanlış hücre
  assert.equal(checkAnswer(p, [1, 5, 9, 10]), false); // fazla
});

test("fark: rng üretimi tam 3 farklı hücre verir", () => {
  const rng = createRng(21);
  for (let i = 0; i < 20; i++) {
    const p = makeFarkPuzzle({ rng });
    assert.equal(p.diffIndices.length, 3);
    assert.equal(new Set(p.diffIndices).size, 3);
    const diffs = p.left.map((v, k) => k).filter((k) => p.left[k] !== p.right[k]);
    assert.deepEqual(diffs, p.diffIndices);
    assert.equal(checkAnswer(p, p.diffIndices), true);
  }
});

// ---------------------------------------------------------------------------
// Genel üretici
// ---------------------------------------------------------------------------

test("makePuzzle 5 türü de üretir, bilinmeyende hata verir", () => {
  const rng = createRng(3);
  for (const t of PUZZLE_TYPES) {
    const p = makePuzzle(t, { rng });
    assert.equal(p.type, t);
    assert.ok(p.hint.length > 0);
    assert.ok(p.question.length > 0);
  }
  assert.throws(() => makePuzzle("sayi")); // eski türler artık yok
  assert.throws(() => makePuzzle("yok"));
});

// ---------------------------------------------------------------------------
// Dosya sistemi ve kilit mantığı
// ---------------------------------------------------------------------------

test("dosya ağacı beklenen yapıda", () => {
  const root = buildFileSystem();
  assert.equal(root.type, "dir");
  const names = root.children.map((c) => c.name);
  assert.ok(names.includes("sunucu"));
  assert.ok(names.includes("indirilenler"));
  assert.ok(names.includes("gizli"));
  assert.ok(names.includes("belgeler"));
  assert.ok(names.includes("cop-kutusu"));
});

/** Her bulmaca türü için geçerli örnek cevap üretir. */
function sampleAnswer(puzzle) {
  switch (puzzle.type) {
    case "kod":
      return puzzle.code;
    case "cark":
      return puzzle.target;
    case "sinyal":
      return Array.from({ length: puzzle.required }, () => 0.5);
    case "yapboz":
      return puzzle.target;
    case "fark":
      return puzzle.diffIndices;
    default:
      throw new Error("tür yok: " + puzzle.type);
  }
}

test("7 kilitli öğe var, 5 türün hepsi kullanılıyor, kod ve çark ikişer kez", () => {
  const root = buildFileSystem();
  const locked = [];
  (function walk(node) {
    if (node.locked) locked.push(node);
    if (node.type === "dir") node.children.forEach(walk);
  })(root);
  assert.equal(locked.length, 7);
  const locks = buildLocks(createRng(1));
  for (const node of locked) {
    const p = locks[node.lockId];
    assert.ok(p, `${node.name} için bulmaca yok`);
    assert.equal(checkAnswer(p, sampleAnswer(p)), true, node.lockId);
  }
  const counts = {};
  for (const p of Object.values(locks)) counts[p.type] = (counts[p.type] || 0) + 1;
  assert.deepEqual(counts, { kod: 2, cark: 2, sinyal: 1, fark: 1, yapboz: 1 });
});

test("kod kilitlerinin ipuçları dosya içerikleriyle tutarlı", () => {
  const game = createGame({ rng: createRng(1) });
  // hata-logu kodu 0312: giriş logunda 03:12 geçmeli
  const giris = game.tryOpen("/sunucu/loglar/giris-logu.txt");
  assert.ok(giris.content.includes("03:12"));
  const hataLock = game.state.locks["kilit-hata-logu"];
  assert.equal(hataLock.code, "0312");
  assert.ok(hataLock.hint.includes("0312"));
  // kasa kodu 0404: görev dosyasında Vaka No: 404 geçmeli
  const gorev = game.tryOpen("/belgeler/gorev-dosyasi.txt");
  assert.ok(gorev.content.includes("404"));
  const kasaLock = game.state.locks["kilit-kasa"];
  assert.equal(kasaLock.code, "0404");
  assert.ok(kasaLock.hint.includes("0404"));
});

test("kilitli dosya açılmaz, bulmaca döner; doğru cevapla açılır", () => {
  const game = createGame({ rng: createRng(1) });
  const res = game.tryOpen("/sunucu/loglar/hata-logu.txt");
  assert.equal(res.kind, "locked");
  assert.equal(res.lockId, "kilit-hata-logu");
  assert.equal(res.puzzle.type, "kod");

  // Yanlış cevap: ceza yok, tekrar denenebilir
  const wrong = game.submitAnswer("kilit-hata-logu", "9999");
  assert.equal(wrong.correct, false);
  assert.equal(game.state.unlocked.has("kilit-hata-logu"), false);

  const ok = game.submitAnswer("kilit-hata-logu", "0312");
  assert.equal(ok.correct, true);
  assert.equal(ok.unlockedNow, true);
  assert.equal(ok.firstTry, false); // ikinci denemeydi

  const opened = game.tryOpen("/sunucu/loglar/hata-logu.txt");
  assert.equal(opened.kind, "file");
  assert.ok(opened.content.includes("HATA KAYDI"));

  const again = game.submitAnswer("kilit-hata-logu", "0312");
  assert.equal(again.alreadyUnlocked, true);
});

test("kilitli klasör açılmaz; kilidi kırılınca içeriği listelenir", () => {
  const game = createGame({ rng: createRng(1) });
  const res = game.tryOpen("/gizli");
  assert.equal(res.kind, "locked");
  assert.equal(res.puzzle.type, "sinyal");
  const ok = game.submitAnswer("kilit-gizli-klasor", [0.5, 0.5]);
  assert.equal(ok.correct, true);
  const opened = game.tryOpen("/gizli");
  assert.equal(opened.kind, "dir");
  const names = opened.entries.map((e) => e.name);
  assert.ok(names.includes("kimlik.txt"));
});

test("olmayan yol missing döner", () => {
  const game = createGame({ rng: createRng(1) });
  assert.equal(game.tryOpen("/boyle/bir/yol/yok").kind, "missing");
});

test("yol normalizasyonu çalışır", () => {
  const game = createGame({ rng: createRng(1) });
  assert.equal(game.normalizePath("sunucu//loglar/"), "/sunucu/loglar");
  assert.equal(game.tryOpen("sunucu/loglar/giris-logu.txt").kind, "file");
});

// ---------------------------------------------------------------------------
// Puan, görevler ve oyun akışı
// ---------------------------------------------------------------------------

test("ilk denemede doğru cevap bonus puan verir", () => {
  const game = createGame({ rng: createRng(1) });
  const ok = game.submitAnswer("kilit-gizli-klasor", [0.5, 0.5]);
  assert.equal(ok.firstTry, true);
  assert.equal(game.state.score, SCORE_UNLOCK + SCORE_FIRST_TRY_BONUS);
});

test("yanlış denemeden sonra bonus yok, puan sadece kilit puanı", () => {
  const game = createGame({ rng: createRng(1) });
  game.submitAnswer("kilit-gizli-klasor", [0.0, 0.0]);
  const ok = game.submitAnswer("kilit-gizli-klasor", [0.5, 0.5]);
  assert.equal(ok.firstTry, false);
  assert.equal(game.state.score, SCORE_UNLOCK);
  assert.equal(game.state.wrongAttempts, 1);
});

/** Görev zincirini kilide kadar tamamlar (test yardımcısı). */
function playToKimlik(game) {
  const locks = game.state.locks;
  game.openApp("dosyalar");
  game.tryOpen("/sunucu/loglar/giris-logu.txt");
  game.submitAnswer("kilit-hata-logu", "0312");
  game.submitAnswer("kilit-gizli-plan", locks["kilit-gizli-plan"].target);
  game.submitAnswer("kilit-gizli-klasor", [0.5, 0.5]);
  game.submitAnswer("kilit-defter", locks["kilit-defter"].target);
  game.submitAnswer("kilit-supheliler", locks["kilit-supheliler"].diffIndices);
}

test("görevler sırayla ilerler", () => {
  const game = createGame({ rng: createRng(1) });
  assert.equal(game.getMissions().current.id, "ac");
  game.openApp("dosyalar");
  assert.equal(game.getMissions().current.id, "log-oku");
  game.tryOpen("/sunucu/loglar/giris-logu.txt");
  assert.equal(game.getMissions().current.id, "hata-ac");
  game.submitAnswer("kilit-hata-logu", "0312");
  assert.equal(game.getMissions().current.id, "plan-ac");
  game.submitAnswer("kilit-gizli-plan", game.state.locks["kilit-gizli-plan"].target);
  assert.equal(game.getMissions().current.id, "gizli-ac");
  game.submitAnswer("kilit-gizli-klasor", [0.5, 0.5]);
  assert.equal(game.getMissions().current.id, "kanit-topla");
  game.submitAnswer("kilit-defter", game.state.locks["kilit-defter"].target);
  assert.equal(game.getMissions().current.id, "kanit-topla"); // şüpheliler de gerekli
  game.submitAnswer("kilit-supheliler", game.state.locks["kilit-supheliler"].diffIndices);
  assert.equal(game.getMissions().current.id, "kimlik-ac");
});

test("final dosyası kimliği ortaya çıkarır ve ihbar açılır", () => {
  const game = createGame({ rng: createRng(1) });
  assert.equal(game.canReport(), false);
  assert.equal(game.submitReport("ROB-7").reason, "kanit-yok");

  playToKimlik(game);
  const res = game.tryOpen("/gizli/kimlik.txt");
  assert.equal(res.kind, "locked");
  game.submitAnswer("kilit-kimlik", game.state.locks["kilit-kimlik"].target);
  const final = game.tryOpen("/gizli/kimlik.txt");
  assert.equal(final.kind, "file");
  assert.equal(final.final, true);
  assert.ok(final.content.includes("ROB-7"));

  assert.equal(game.canReport(), true);
  const report = game.submitReport("ROB-7");
  assert.equal(report.ok, true);
  assert.equal(report.correct, true);
  assert.ok(report.score > 0);
  assert.equal(game.getMissions().current, null);
  assert.ok(game.getMissions().list.every((m) => m.done));
});

test("uçtan uca tam oyun: tüm kilitler açılır, istatistikler doğru", () => {
  const game = createGame({ easyMode: true, rng: createRng(42) });
  game.openApp("dosyalar");
  const locks = game.state.locks;
  const answers = {
    "kilit-hata-logu": "0312",
    "kilit-gizli-plan": locks["kilit-gizli-plan"].target,
    "kilit-gizli-klasor": [0.5, 0.5],
    "kilit-supheliler": locks["kilit-supheliler"].diffIndices,
    "kilit-defter": locks["kilit-defter"].target,
    "kilit-kasa": "0404",
    "kilit-kimlik": locks["kilit-kimlik"].target,
  };
  for (const [lockId, ans] of Object.entries(answers)) {
    const r = game.submitAnswer(lockId, ans);
    assert.equal(r.correct, true, lockId);
    assert.equal(r.firstTry, true, lockId);
  }
  game.tryOpen("/gizli/kimlik.txt");
  const report = game.submitReport("ROB-7");
  assert.equal(report.ok, true);
  assert.equal(report.firstTry, true);
  const stats = report.stats;
  assert.equal(stats.totalLocks, 7);
  assert.equal(stats.locksUnlocked, 7);
  assert.equal(stats.firstTryCount, 7);
  assert.equal(stats.wrongAttempts, 0);
  assert.equal(stats.wrongReports, 0);
  assert.equal(stats.reportAttempts, 1);
  assert.equal(stats.score, 7 * (SCORE_UNLOCK + SCORE_FIRST_TRY_BONUS) + SCORE_REPORT_FIRST_TRY_BONUS);
});

// ---------------------------------------------------------------------------
// İhbar mantığı
// ---------------------------------------------------------------------------

test("ihbar ismi normalize edilir: büyük/küçük harf, boşluk, tire toleranslı", () => {
  assert.equal(normalizeReportName("ROB-7"), "ROB7");
  assert.equal(normalizeReportName("rob7"), "ROB7");
  assert.equal(normalizeReportName("  Rob 7  "), "ROB7");
  assert.equal(normalizeReportName("r-o-b-7"), "ROB7");
  assert.equal(normalizeReportName("şef"), "SEF");
});

test("ihbar: yanlış isim reddedilir, ceza yok, bonus kaybolur", () => {
  const game = createGame({ rng: createRng(1) });
  game.submitAnswer("kilit-gizli-klasor", [0.5, 0.5]);
  game.submitAnswer("kilit-kimlik", game.state.locks["kilit-kimlik"].target);
  game.tryOpen("/gizli/kimlik.txt");
  const scoreBefore = game.state.score;

  const wrong = game.submitReport("SÜPÜR-2");
  assert.equal(wrong.ok, true);
  assert.equal(wrong.correct, false);
  assert.equal(game.state.reported, false);
  assert.equal(game.state.wrongReports, 1);
  assert.equal(game.state.score, scoreBefore);

  const right = game.submitReport("rob7");
  assert.equal(right.correct, true);
  assert.equal(right.firstTry, false);
  assert.equal(game.state.score, scoreBefore);
  assert.equal(game.state.reported, true);
});

test("ihbar: ilk denemede doğru isim bonus puan verir", () => {
  const game = createGame({ rng: createRng(1) });
  game.submitAnswer("kilit-gizli-klasor", [0.5, 0.5]);
  game.submitAnswer("kilit-kimlik", game.state.locks["kilit-kimlik"].target);
  game.tryOpen("/gizli/kimlik.txt");
  const scoreBefore = game.state.score;
  const res = game.submitReport("ROB-7");
  assert.equal(res.firstTry, true);
  assert.equal(game.state.score, scoreBefore + SCORE_REPORT_FIRST_TRY_BONUS);
  assert.equal(game.submitReport("ROB-7").reason, "zaten-ihbar-edildi");
});

test("görev listesi 8 görev içerir", () => {
  assert.equal(MISSIONS.length, 8);
});

// ---------------------------------------------------------------------------
// Seviye sistemi
// ---------------------------------------------------------------------------

import {
  LEVELS,
  MAX_LEVEL,
  buildLevel,
  difficultyParams,
  collectFileContents,
  defaultProgress,
  parseProgress,
  serializeProgress,
  completeLevel,
  isLevelUnlocked,
  isLevelCompleted,
} from "./gameLogic.js";

test("11 seviye tanımlı, id'ler 1-11 benzersiz", () => {
  assert.equal(LEVELS.length, 11);
  assert.equal(MAX_LEVEL, 11);
  LEVELS.forEach((lv, i) => {
    assert.equal(lv.id, i + 1);
    assert.ok(lv.name.length > 0);
    assert.ok(lv.brief.length > 0);
  });
});

test("her seviye yüklenir: kilitler geçerli, tam 1 final dosyası var", () => {
  for (let l = 1; l <= 11; l++) {
    const game = createGame({ level: l, rng: createRng(l) });
    assert.equal(game.state.level, l);
    // Kilit sayısı: sv1 = 7, sv2-11 = 3-4
    const n = Object.keys(game.state.locks).length;
    if (l === 1) assert.equal(n, 7);
    else assert.ok(n >= 3 && n <= 4, `sv${l} kilit sayısı: ${n}`);
    // Her kilit örnek cevapla açılır
    for (const [lockId, p] of Object.entries(game.state.locks)) {
      assert.equal(checkAnswer(p, sampleAnswer(p)), true, `sv${l} ${lockId}`);
    }
    // Tam 1 final dosyası
    let finals = 0;
    (function walk(node) {
      if (node.final) finals++;
      if (node.type === "dir") node.children.forEach(walk);
    })(game.state.root);
    assert.equal(finals, 1, `sv${l} final sayısı`);
  }
});

test("her vakanın ihbar ismi final dosyasında geçiyor (normalize kontrolü)", () => {
  for (let l = 1; l <= 11; l++) {
    const lvl = buildLevel(l, createRng(l));
    let finalContent = "";
    (function walk(node) {
      if (node.final) finalContent = node.content;
      if (node.type === "dir") node.children.forEach(walk);
    })(lvl.root);
    assert.ok(finalContent.length > 0, `sv${l} final içeriği yok`);
    assert.ok(
      normalizeReportName(finalContent).includes(lvl.reportName),
      `sv${l}: final dosyasında '${lvl.reportName}' bulunamadı`
    );
  }
});

test("kod kilitleri (sv2-11): kod, kilitli olmayan bir dosyada geçiyor", () => {
  for (let l = 2; l <= 11; l++) {
    const lvl = buildLevel(l, createRng(l));
    const unlockedContents = [];
    (function walk(node) {
      if (node.type === "file" && !node.locked) unlockedContents.push(node.content);
      if (node.type === "dir") node.children.forEach(walk);
    })(lvl.root);
    const all = unlockedContents.join("\n");
    for (const [lockId, p] of Object.entries(lvl.locks)) {
      if (p.type !== "kod") continue;
      assert.ok(all.includes(p.code), `sv${l} ${lockId}: kod '${p.code}' dosyalarda yok`);
      assert.ok(p.clue.length > 0 && p.hint.length > 0);
    }
    // Tüm dosya içerikleri toplanabilir
    assert.ok(collectFileContents(lvl.root).length >= 4, `sv${l} dosya sayısı az`);
  }
});

test("zorluk ölçekleme monoton: seviye arttıkça kötüleşmez", () => {
  let prev = difficultyParams(1);
  for (let l = 2; l <= 11; l++) {
    const dp = difficultyParams(l);
    assert.ok(dp.carkWheels >= prev.carkWheels, `çark sv${l}`);
    assert.ok(dp.carkSymbols >= prev.carkSymbols, `çark sembol sv${l}`);
    assert.ok(dp.kodLength >= prev.kodLength, `kod sv${l}`);
    assert.ok(dp.sinyalZone <= prev.sinyalZone, `sinyal bölge sv${l}`);
    assert.ok(dp.sinyalPeriod <= prev.sinyalPeriod, `sinyal hız sv${l}`);
    assert.ok(dp.sinyalRequired >= prev.sinyalRequired, `sinyal yakalama sv${l}`);
    assert.ok(dp.yapbozSwaps >= prev.yapbozSwaps, `yapboz sv${l}`);
    assert.ok(dp.farkCount >= prev.farkCount, `fark sv${l}`);
    assert.ok(dp.farkRows * dp.farkCols >= prev.farkRows * prev.farkCols, `fark ızgara sv${l}`);
    prev = dp;
  }
  // Sınır değerler
  const d1 = difficultyParams(1);
  const d11 = difficultyParams(11);
  assert.equal(d1.carkWheels, 3);
  assert.equal(d1.carkSymbols, 4);
  assert.equal(d11.carkWheels, 4);
  assert.equal(d11.carkSymbols, 6);
  assert.equal(d1.kodLength, 4);
  assert.equal(d11.kodLength, 6);
  assert.equal(d1.sinyalZone, 0.34);
  assert.equal(d11.sinyalZone, 0.15);
  assert.equal(d1.sinyalRequired, 2);
  assert.equal(difficultyParams(8).sinyalRequired, 3);
  assert.equal(d1.yapbozSwaps, 3);
  assert.equal(d11.yapbozSwaps, 8);
  assert.equal(d1.farkCount, 3);
  assert.equal(d11.farkCount, 5);
  // Sınır dışı seviyeler kırpılır
  assert.deepEqual(difficultyParams(0), difficultyParams(1));
  assert.deepEqual(difficultyParams(99), difficultyParams(11));
});

test("makePuzzle level parametresiyle ölçekler", () => {
  const rng = createRng(9);
  const cark11 = makePuzzle("cark", { level: 11, rng });
  assert.equal(cark11.wheels, 4);
  assert.equal(cark11.symbols.length, 6);
  assert.equal(makePuzzle("cark", { level: 2, rng }).wheels, 3);
  assert.equal(makePuzzle("cark", { level: 2, rng }).symbols.length, 4);
  assert.equal(makePuzzle("kod", { level: 9, rng }).code.length, 6);
  assert.equal(makePuzzle("kod", { level: 5, rng }).code.length, 5);
  const fark9 = makePuzzle("fark", { level: 9, rng });
  assert.equal(fark9.diffIndices.length, 5);
  assert.equal(fark9.rows * fark9.cols, 20);
  assert.equal(makePuzzle("sinyal", { level: 8, rng }).required, 3);
  assert.equal(makePuzzle("sinyal", { level: 2, rng }).required, 2);
  const yap11 = makePuzzle("yapboz", { level: 11, rng });
  const d = swapDistance(yap11.tiles, yap11.target);
  assert.ok(d >= 1 && d <= 9, `sv11 yapboz uzaklık: ${d}`);
  // Açık parametre seviyeyi yener
  assert.equal(makePuzzle("cark", { level: 11, wheels: 3, rng }).wheels, 3);
});

// ---------------------------------------------------------------------------
// İlerleme (localStorage mantığı, saf fonksiyonlar)
// ---------------------------------------------------------------------------

test("progress: varsayılan, ayrıştırma, serileştirme", () => {
  assert.deepEqual(defaultProgress(), { unlocked: 1, completed: [] });
  // Bozuk veri → varsayılan
  assert.deepEqual(parseProgress("bozuk json{"), defaultProgress());
  assert.deepEqual(parseProgress(null), defaultProgress());
  assert.deepEqual(parseProgress('"sadece string"'), defaultProgress());
  // Sınır kırpma
  const p = parseProgress('{"unlocked": 99, "completed": [1, 2, 2, 99, -1]}');
  assert.equal(p.unlocked, 11);
  assert.deepEqual(p.completed, [1, 2]);
  // Roundtrip
  const rt = parseProgress(serializeProgress({ unlocked: 4, completed: [1, 2, 3] }));
  assert.deepEqual(rt, { unlocked: 4, completed: [1, 2, 3] });
});

test("progress: seviye sırayla açılır, 11'de durur", () => {
  let p = defaultProgress();
  assert.equal(isLevelUnlocked(p, 1), true);
  assert.equal(isLevelUnlocked(p, 2), false);
  p = completeLevel(p, 1);
  assert.equal(isLevelCompleted(p, 1), true);
  assert.equal(isLevelUnlocked(p, 2), true);
  assert.equal(isLevelUnlocked(p, 3), false);
  // Aynı seviyeyi iki kez bitirmek tekrar eklemez
  p = completeLevel(p, 1);
  assert.deepEqual(p.completed, [1]);
  // Sona kadar
  for (let l = 2; l <= 11; l++) p = completeLevel(p, l);
  assert.equal(p.unlocked, 11);
  assert.equal(p.completed.length, 11);
  p = completeLevel(p, 11);
  assert.equal(p.unlocked, 11); // taşmaz
});

// ---------------------------------------------------------------------------
// Seviye 2 uçtan uca (saf mantık)
// ---------------------------------------------------------------------------

test("seviye 2: farklı vaka, kilit sırası ve ihbar akışı", () => {
  const game = createGame({ level: 2, rng: createRng(2) });
  assert.equal(game.state.level, 2);
  assert.equal(game.state.reportName, "SINIF3");
  assert.equal(Object.keys(game.state.locks).length, 3);

  // Görevler genel akışta ilerler
  assert.equal(game.getMissions().current.id, "ac");
  game.openApp("dosyalar");
  assert.equal(game.getMissions().current.id, "ipucu");
  game.tryOpen("/okul/ogretmen-masasi/notlar.txt");
  game.tryOpen("/okul/bt-odasi/ag-sifresi.txt");
  assert.equal(game.getMissions().current.id, "kilitler");

  // Kilitli kamera dosyası: kod bulmacası
  const res = game.tryOpen("/okul/ogretmen-masasi/kamera-kaydi.txt");
  assert.equal(res.kind, "locked");
  assert.equal(res.puzzle.type, "kod");
  assert.equal(res.puzzle.code, "2468");
  game.submitAnswer("sv2-kamera", "2468");
  game.submitAnswer("sv2-sinav", game.state.locks["sv2-sinav"].diffIndices);
  game.submitAnswer("sv2-kanit", game.state.locks["sv2-kanit"].target);
  assert.equal(game.getMissions().current.id, "kanit");

  // Kanıt (itiraf) okunur → ihbar açılır
  const final = game.tryOpen("/kanit/itiraf.txt");
  assert.equal(final.kind, "file");
  assert.ok(final.content.includes("SINIF-3"));
  assert.equal(game.canReport(), true);
  assert.equal(game.getMissions().current.id, "ihbar");

  // Yanlış isim, sonra doğru isim (küçük harf toleranslı)
  assert.equal(game.submitReport("PXL-9").correct, false);
  const rep = game.submitReport("sinif-3");
  assert.equal(rep.correct, true);
  assert.equal(game.getMissions().current, null);
});

test("seviye 1 geriye dönük uyumlu: 7 kilit ve HAYALET akışı aynı", () => {
  const game = createGame({ level: 1, rng: createRng(1) });
  assert.equal(game.state.level, 1);
  assert.equal(game.state.reportName, "ROB7");
  assert.equal(Object.keys(game.state.locks).length, 7);
  assert.equal(game.getMissions().list.length, 8);
  game.submitAnswer("kilit-hata-logu", "0312");
  assert.equal(game.state.unlocked.has("kilit-hata-logu"), true);
});

test("tüm seviyelerde 5 bulmaca türü de en az bir kez kullanılıyor", () => {
  const used = new Set();
  for (let l = 1; l <= 11; l++) {
    const lvl = buildLevel(l, createRng(l * 7));
    for (const p of Object.values(lvl.locks)) used.add(p.type);
  }
  assert.deepEqual([...used].sort(), ["cark", "fark", "kod", "sinyal", "yapboz"]);
});
