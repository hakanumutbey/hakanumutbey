/**
 * SİBER POLİS — DOM'suz saf oyun mantığı.
 * Sahte dosya sistemi, 5 bulmaca türü, 11 seviyeli vaka sistemi,
 * zorluk ölçekleme, görev ilerlemesi, puan ve localStorage ilerlemesi.
 * Bu modül tarayıcıdan bağımsızdır; node:test ile test edilir.
 */

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** Deterministik RNG (mulberry32). Testlerde sabit tohumla kullanılır. */
export function createRng(seed = 42) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Türkçe karakterleri ASCII'ye çevirip büyük harfe alır (ihbar ismi için). */
export function normalizeWord(input) {
  const map = { Ç: "C", Ğ: "G", İ: "I", I: "I", Ö: "O", Ş: "S", Ü: "U", ı: "I", i: "I" };
  return String(input ?? "")
    .trim()
    .split("")
    .map((ch) => map[ch] || ch.toLocaleUpperCase("tr"))
    .join("")
    .split("")
    .map((ch) => map[ch] || ch)
    .join("");
}

/**
 * İhbar ismini normalize eder: Türkçe→ASCII, büyük harf, boşluk/tire/nokta atılır.
 * "ROB-7", "rob7", " Rob 7 " hepsi "ROB7" olur.
 */
export function normalizeReportName(input) {
  return normalizeWord(input).replace(/[^A-Z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Zorluk ölçekleme (seviye 1-11)
// ---------------------------------------------------------------------------

export const MAX_LEVEL = 11;

/**
 * Seviyeye göre bulmaca parametreleri. Seviye arttıkça zorluk monoton artar.
 */
export function difficultyParams(level) {
  const l = Math.min(Math.max(Number(level) || 1, 1), MAX_LEVEL);
  return {
    carkWheels: l <= 5 ? 3 : 4, // sv1-5: 3 çark, sv6-11: 4 çark
    carkSymbols: l <= 5 ? 4 : 6, // sv1-5: 4 sembol, sv6-11: 6 sembol
    kodLength: l <= 4 ? 4 : l <= 8 ? 5 : 6,
    sinyalZone: Math.max(0.15, Number((0.34 - (l - 1) * 0.019).toFixed(3))), // %34 → %15
    sinyalPeriod: Math.max(900, 1600 - (l - 1) * 70), // hızlanır
    sinyalRequired: l <= 7 ? 2 : 3,
    yapbozSwaps: 3 + Math.floor((l - 1) * 0.55), // 3-4 → 8-9
    farkCount: l <= 4 ? 3 : l <= 8 ? 4 : 5,
    farkRows: l <= 4 ? 3 : 4,
    farkCols: l <= 4 ? 4 : l <= 8 ? 4 : 5,
  };
}

// ---------------------------------------------------------------------------
// Bulmaca üreticileri (5 tür)
// ---------------------------------------------------------------------------

export const PUZZLE_TYPES = ["cark", "kod", "sinyal", "yapboz", "fark"];

/**
 * 🎡 Çark Kilidi: yan yana 3-4 çark; her çark ↑ ↓ ile sembol değiştirir.
 * Doğru kombinasyon bulunup "Aç"a basılır; yanlışta hangi çarkın
 * yanlış olduğu SÖYLENMEZ. wheels/symbolCount ile ölçeklenir.
 */
export const CARK_SEMBOLLERI = ["⭐", "🌙", "☀️", "🚀", "🛸", "🪐"];

export function makeCarkPuzzle({
  rng = Math.random,
  wheels = 3,
  symbolCount = 4,
  symbols,
  target,
  clue,
  hint,
} = {}) {
  const pool = symbols ? symbols.slice() : CARK_SEMBOLLERI.slice();
  // Varsayılan: ilk N sembol (sv1-5: 4, sv6+: 6). Özel target'ta
  // 🪐/🛸 gibi sonradaki semboller de olabilsin diye hedef sembolleri eklenir.
  const n = Math.min(Math.max(1, Number(symbolCount) || pool.length), pool.length);
  const syms = pool.slice(0, n);
  const t = target
    ? target.slice()
    : Array.from({ length: wheels }, () => syms[Math.floor(rng() * syms.length)]);
  for (const s of t) {
    if (!syms.includes(s)) syms.push(s);
  }
  return {
    type: "cark",
    title: "Çark Kilidi",
    question: "Çarkları doğru kombinasyona getir, sonra Aç'a bas!",
    symbols: syms,
    wheels: t.length,
    target: t,
    answer: t.slice(),
    clue: clue || "Kombinasyon yakındaki bir dosyada saklı!",
    hint: hint || `Kombinasyon: ${t.join(" ")}`,
  };
}

/**
 * 🔑 Kod Kilidi: rakam kodu (4-6 hane). clue pencerede her zaman görünür,
 * hint 💡 düğmesiyle açılır. code deterministik verilebilir.
 */
export function makeKodPuzzle({ rng = Math.random, code, clue, hint, length = 4 } = {}) {
  const c = code ?? String(Math.floor(rng() * 10 ** length)).padStart(length, "0");
  return {
    type: "kod",
    title: "Kod Kilidi",
    question: `${c.length} haneli kodu gir!`,
    clue: clue || "İpucu yakındaki bir dosyada saklı!",
    code: c,
    answer: c,
    length: c.length,
    hint: hint || clue || "Dosyalardaki ipuçlarını incele!",
  };
}

/**
 * 📡 Sinyal Yakalama: barda gidip gelen imleç yeşil bölgedeyken YAKALA.
 * position üretimi UI ile testlerde paylaşılır: signalPosition + isInZone.
 */
export function makeSinyalPuzzle({ rng = Math.random, zoneSize = 0.34, period, required = 2 } = {}) {
  const p = period ?? 1400 + Math.floor(rng() * 600);
  return {
    type: "sinyal",
    title: "Sinyal Yakalama",
    question: "İmleç yeşil bölgenin içindeyken YAKALA'ya bas!",
    zoneSize,
    period: p,
    required,
    answer: Array.from({ length: required }, () => 0.5),
    hint: `İmleç tam yeşil bölgenin üstündeyken YAKALA'ya bas. ${required} kere yakalamalısın!`,
  };
}

/** Üçgen dalga: t=0 → 0, t=period/2 → 1, t=period → 0. */
export function signalPosition(puzzle, tMs) {
  const x = (((tMs % puzzle.period) + puzzle.period) % puzzle.period) / puzzle.period;
  return x < 0.5 ? x * 2 : 2 - 2 * x;
}

export function isInZone(puzzle, pos) {
  return Math.abs(pos - 0.5) <= puzzle.zoneSize / 2;
}

/**
 * 🧩 Yapboz: 3x3 "belge" deseni karışık; iki parça tıklanarak yer değiştirilir.
 * swapCount ile karışım uzaklığı ölçeklenir.
 */
export const YAPBOZ_HEDEF = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⭐", "🏠", "🚓"];

export function makeYapbozPuzzle({ rng = Math.random, target, scramble, swapCount } = {}) {
  const t = (target || YAPBOZ_HEDEF).slice();
  let tiles;
  if (scramble) {
    tiles = scramble.slice();
  } else {
    const min = swapCount ?? 3;
    const n = min + Math.floor(rng() * 2); // min .. min+1
    tiles = t.slice();
    do {
      for (let k = 0; k < n; k++) {
        const i = Math.floor(rng() * t.length);
        const j = Math.floor(rng() * t.length);
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
      }
    } while (tiles.every((x, i) => x === t[i]));
  }
  return {
    type: "yapboz",
    title: "Yapboz",
    question: "Karışan belgeyi eski haline getir!",
    tiles,
    target: t,
    answer: t.slice(),
    hint: "İki parçaya tıklayınca yer değiştirirler. Küçük resimdeki gibi diz!",
  };
}

/**
 * 👆 Fark Bul: iki ızgara, aralarında diffCount fark (3-5).
 * Izgara boyutu rows x cols ölçeklenir.
 */
export const FARK_EMOJILERI = [
  "📄", "🔍", "📎", "🖊️", "📁", "📷", "🔦", "🧭", "📻", "🗺️",
  "🧲", "💾", "📐", "🖇️", "🔑", "📌", "✂️", "📏", "🖍️", "⌚",
];
export const FARK_DEGISIM = ["👾", "🐱", "🍕", "🐸", "🦄"];

export function makeFarkPuzzle({
  rng = Math.random,
  rows = 3,
  cols = 4,
  diffCount = 3,
  left,
  diffIndices,
  replacements,
} = {}) {
  const n = rows * cols;
  const l = left ? left.slice() : Array.from({ length: n }, (_, i) => FARK_EMOJILERI[i % FARK_EMOJILERI.length]);
  let diffs;
  if (diffIndices) {
    diffs = diffIndices.slice();
  } else {
    diffs = [];
    while (diffs.length < diffCount) {
      const i = Math.floor(rng() * n);
      if (!diffs.includes(i)) diffs.push(i);
    }
    diffs.sort((a, b) => a - b);
  }
  const reps = replacements || FARK_DEGISIM;
  const r = l.slice();
  diffs.forEach((idx, k) => {
    let e = reps[k % reps.length];
    if (e === l[idx]) e = "❌";
    r[idx] = e;
  });
  return {
    type: "fark",
    title: "Fark Bul",
    question: `İki ekran arasındaki ${diffs.length} farkı bul! Sağdaki ekranda farklı hücrelere tıkla.`,
    rows,
    cols,
    left: l,
    right: r,
    diffIndices: diffs,
    answer: diffs.slice(),
    hint: `Hücreleri tek tek karşılaştır: aynı satırdaki sol ve sağ hücreye bak. Tam ${diffs.length} fark var!`,
  };
}

/**
 * Tür üretici. opts.level verilirse zorluk parametreleri seviyeye göre
 * ölçeklenir; açıkça verilen parametreler her zaman baskındır.
 */
export function makePuzzle(type, opts = {}) {
  const dp = opts.level ? difficultyParams(opts.level) : null;
  const merged = { ...opts };
  if (dp) {
    merged.wheels ??= dp.carkWheels;
    merged.symbolCount ??= dp.carkSymbols;
    merged.length ??= dp.kodLength;
    merged.zoneSize ??= dp.sinyalZone;
    merged.period ??= dp.sinyalPeriod;
    merged.required ??= dp.sinyalRequired;
    merged.swapCount ??= dp.yapbozSwaps;
    merged.diffCount ??= dp.farkCount;
    merged.rows ??= dp.farkRows;
    merged.cols ??= dp.farkCols;
  }
  switch (type) {
    case "cark":
      return makeCarkPuzzle(merged);
    case "kod":
      return makeKodPuzzle(merged);
    case "sinyal":
      return makeSinyalPuzzle(merged);
    case "yapboz":
      return makeYapbozPuzzle(merged);
    case "fark":
      return makeFarkPuzzle(merged);
    default:
      throw new Error(`Bilinmeyen bulmaca türü: ${type}`);
  }
}

/** Bulmaca cevabını kontrol eder. input türü bulmaca türüne göre değişir. */
export function checkAnswer(puzzle, input) {
  switch (puzzle.type) {
    case "cark": {
      const arr = Array.isArray(input) ? input : [];
      return arr.length === puzzle.target.length && arr.every((s, i) => s === puzzle.target[i]);
    }
    case "kod": {
      const digits = String(input ?? "").replace(/\D/g, "");
      return digits.length === puzzle.code.length && digits === puzzle.code;
    }
    case "sinyal": {
      const arr = Array.isArray(input) ? input : [input];
      return arr.length >= puzzle.required && arr.every((p) => isInZone(puzzle, Number(p)));
    }
    case "yapboz": {
      const arr = Array.isArray(input) ? input : [];
      return arr.length === puzzle.target.length && arr.every((x, i) => x === puzzle.target[i]);
    }
    case "fark": {
      const arr = Array.isArray(input) ? input : [];
      if (arr.length !== puzzle.diffIndices.length) return false;
      const s = new Set(arr.map(Number));
      return puzzle.diffIndices.every((i) => s.has(i));
    }
    default:
      throw new Error(`Bilinmeyen bulmaca türü: ${puzzle.type}`);
  }
}

// ---------------------------------------------------------------------------
// Sahte dosya sistemi yardımcıları
// ---------------------------------------------------------------------------

function dir(name, children, extra = {}) {
  return { name, type: "dir", children, ...extra };
}
function file(name, content, extra = {}) {
  return { name, type: "file", content, ...extra };
}

/** Ağaçtaki tüm dosyaların içeriklerini toplar (test/yardımcı). */
export function collectFileContents(root) {
  const out = [];
  (function walk(node) {
    if (node.type === "file") out.push(node.content);
    else node.children.forEach(walk);
  })(root);
  return out;
}

// ---------------------------------------------------------------------------
// SEVİYE 1: HAYALET vakası (orijinal hikaye)
// ---------------------------------------------------------------------------

export function buildFileSystem() {
  return dir("/", [
    dir("sunucu", [
      dir("loglar", [
        file(
          "giris-logu.txt",
          [
            "=== SUNUCU GİRİŞ KAYDI ===",
            "01:00 - sistem: gece modu açık",
            "02:45 - sistem: her şey normal",
            "03:12 - UYARI: Bilinmeyen kullanıcı 'HAYALET' giriş yaptı!",
            "03:14 - HAYALET: 'Beni bulamazsınız, polisler!'",
            "",
            "NOT (Gece Vardiyası): HAYALET hep aynı saatte geliyor.",
            "Kilitli bir kayıt gördüm; kilidi 4 haneli bir KOD.",
            "İpucu benden: HAYALET'in GİRİŞ SAATİ şifredir!",
          ].join("\n")
        ),
        file(
          "hata-logu.txt",
          [
            "=== HATA KAYDI ===",
            "03:15 - HATA: Bilinmeyen program çalıştırıldı: hayalet.exe",
            "03:16 - HATA: İndirilenler klasörüne erişim izlendi.",
            "",
            "HAYALET'in bıraktığı not:",
            "'Çark kilidimin sırasını bir tekerlemeye gizledim:",
            " iki yıldız parlar, aralarında tek bir gece uyur.",
            " Bakalım planımı bulabilecek misin!'",
          ].join("\n"),
          { locked: true, lockId: "kilit-hata-logu" }
        ),
      ]),
      dir("yedek", [
        file(
          "notlar.txt",
          [
            "=== YEDEK NOTLARI ===",
            "- Sunucu şifreleri artık kağıda yazılmıyor, iyi oldu.",
            "- Bir yerlerde gizli bir klasör var, kilidi garip:",
            "  bir SİNYAL YAKALAMA cihazı takılmış.",
            "  İmleç yeşil bölgedeyken YAKALA'ya basmak gerekiyormuş, hem de 2 kere!",
            "- Kasa dosyasında önemli bir şey yok ama HAYALET onu da kilitlemiş.",
          ].join("\n")
        ),
        file(
          "kasa.txt",
          [
            "=== KASA ===",
            "İçinden sadece eski bir kahve fişi ve bir not çıktı:",
            "'Başka bir dosyamı merak ediyorsan iki güvenlik ekranını",
            "karşılaştır ve aradaki 3 FARKI bul!' - HAYALET",
          ].join("\n"),
          { locked: true, lockId: "kilit-kasa" }
        ),
      ]),
    ]),
    dir("indirilenler", [
      file(
        "harita.txt",
        [
          "=== SUNUCU ODASI HARİTASI ===",
          "[KAPI]---[RAF 1]---[RAF 2]",
          "   |        |         |",
          "[MASAN]--[SUNUCU]--[? ? ?]",
          "",
          "Soru işaretli köşede bir ışık yanıp sönüyor...",
          "Biri buraya gizli bir klasör bağlamış olabilir!",
        ].join("\n")
      ),
      file(
        "gizli-plan.txt",
        [
          "=== HAYALET'İN PLANI ===",
          "1. Sunucuya sız ✔",
          "2. İzleri gizle ✔",
          "3. Kimlik dosyasını sakla ✔",
          "4. Siber polis yaklaşırsa KAÇ! (henüz gerekmedi)",
          "",
          "Not: Defterimde büyük sırrım yazıyor.",
          "Belki başka dosyalarda da izler vardır!",
        ].join("\n"),
        { locked: true, lockId: "kilit-gizli-plan" }
      ),
    ]),
    dir("belgeler", [
      file(
        "gorev-dosyasi.txt",
        [
          "=== SİBER POLİS GÖREV DOSYASI ===",
          "Vaka No: 404",
          "Konu: 'HAYALET' adlı hacker sunucumuza sızdı.",
          "Görev: İzleri sür, kilitleri kır, HAYALET'in kimliğini bul.",
          "",
          "Şefin notu: Kilitli bir kasa var. HAYALET kodları",
          "vaka numarasından türetmeyi sever — 4 haneye tamamla!",
          "",
          "Unutma: Yanlış cevapta ceza yok. Dene, dene, yine dene!",
          "  - Şef",
        ].join("\n")
      ),
      file(
        "supheliler.txt",
        [
          "=== ŞÜPHELİ LİSTESİ ===",
          "1. Gece Güvenlikçisi Amca -> 03:00'te uyuyordu, kamerada var.",
          "2. Temizlik Robotu SÜPÜR-2 -> O saatte şarjdaydı.",
          "3. Eğitim Robotu ROB-7 -> 3 haftadır KAYIP! Akademiden kaçtı.",
          "",
          "Şefin notu: ROB-7 çok zekidir, şifreleri ve bulmacaları sever.",
          "Acaba HAYALET ile bir bağlantısı var mı?",
        ].join("\n"),
        { locked: true, lockId: "kilit-supheliler" }
      ),
    ]),
    dir(
      "gizli",
      [
        file(
          "sifreli-mesaj.txt",
          [
            "=== DUVARA KARALANMIŞ NOT ===",
            "'Bir defterim var, kilidi yırtık bir belge gibi!",
            "Parçaları doğru diz, belge ortaya çıksın.'",
            "",
            "Altında küçük yazı: 'İki parçaya tıkla, yer değiştirsinler.'",
          ].join("\n")
        ),
        file(
          "hayalet-defteri.txt",
          [
            "=== HAYALET'İN DEFTERİ ===",
            "Bugün yine sunucuda oynadım. Kimse beni bulamadı!",
            "Kimsenin bilmediği bir sırrım var: BEN İNSAN DEĞİLİM!",
            "Kimlik dosyamı çarklı bir kilitle sakladım.",
            "Çarklarımın tekerlemesi: iki uzay yolculuğunun",
            "arasında tek bir gündüz doğar. Unutursan tekrar oku!",
          ].join("\n"),
          { locked: true, lockId: "kilit-defter" }
        ),
        file(
          "kimlik.txt",
          [
            "=== KİMLİK DOSYASI ===",
            "!!! BÜYÜK KANIT !!!",
            "",
            "HAYALET'in gerçek kimliği: ROB-7",
            "Siber Polis Akademisi'nin kayıp eğitim robotu!",
            "Akademiden sıkılıp kaçmış, kendine 'HAYALET' demiş.",
            "Aslında kötü biri değil, sadece oyun oynamak istiyor.",
            "",
            ">>> MASAÜSTÜNDEKİ '🚨 İHBAR ET' UYGULAMASINI AÇ VE ADIMI BİLDİR! <<<",
          ].join("\n"),
          { locked: true, lockId: "kilit-kimlik", final: true }
        ),
      ],
      { locked: true, lockId: "kilit-gizli-klasor" }
    ),
    dir("cop-kutusu", [
      file(
        "eski-muzik-listesi.txt",
        ["(Boş görünüyor... biri her şeyi silmiş.)", "Köşede karalama: 'HAYALET buradaydı!'"].join("\n")
      ),
    ]),
  ]);
}

/** Seviye 1 kilitleri (orijinal dağılım). */
export function buildLocks(rng = Math.random) {
  return {
    "kilit-hata-logu": makeKodPuzzle({
      code: "0312",
      clue: "İpucu: HAYALET'in sunucuya GİRİŞ SAATİ şifredir.",
      hint: "Giriş logunda 03:12'de girmiş. Saat ve dakikayı birleştir: 0312",
    }),
    "kilit-gizli-plan": makeCarkPuzzle({
      target: ["⭐", "🌙", "⭐"],
      clue: "İpucu: HAYALET çark sırasını bir nota tekerleme gibi gizlemiş!",
      hint: "Kombinasyon: ⭐ 🌙 ⭐",
    }),
    "kilit-gizli-klasor": makeSinyalPuzzle({ rng }),
    "kilit-supheliler": makeFarkPuzzle({ rng }),
    "kilit-defter": makeYapbozPuzzle({ rng }),
    "kilit-kasa": makeKodPuzzle({
      code: "0404",
      clue: "İpucu: Kasanın kodu VAKA NUMARASIYLA ilgili.",
      hint: "Vaka No: 404 → 4 haneye tamamla: 0404",
    }),
    "kilit-kimlik": makeCarkPuzzle({
      target: ["🚀", "☀️", "🚀"],
      clue: "İpucu: Çark sırası roketli bir tekerlemenin içinde saklı!",
      hint: "Kombinasyon: 🚀 ☀️ 🚀",
    }),
  };
}

// ---------------------------------------------------------------------------
// SEVİYE 2-11: Yeni vakalar
// ---------------------------------------------------------------------------

function buildCase2(rng) {
  const root = dir("/", [
    dir("okul", [
      dir("ogretmen-masasi", [
        file(
          "notlar.txt",
          [
            "=== ÖĞRETMENİN NOTLARI ===",
            "- Matematik sınavı cuma günü.",
            "- Birileri bilgisayarımdan sınav sorularını değiştirmiş!",
            "- Kamera kaydı kilitli, BT odasındaki arkadaş şifreyi biliyor.",
            "- Bir köşenin çark şifresi tekerleme gibi: önce gece iki kez",
            "  konuşur, sonra tek bir parıltı susar.",
          ].join("\n")
        ),
        file(
          "kamera-kaydi.txt",
          [
            "=== GÜVENLİK KAMERASI ===",
            "23:40 - Koridorda bir robot görünüyor...",
            "Bu SINIF-3, okulun projeksiyon robotu!",
            "Gece gece sınıfta ne işi var?",
          ].join("\n"),
          { locked: true, lockId: "sv2-kamera" }
        ),
        file(
          "sinav.txt",
          [
            "=== SINAV SORULARI ===",
            "İki versiyon yan yana: hangi sorular değiştirilmiş?",
            "Farkları bul, değişikliği yapanı anlarız!",
          ].join("\n"),
          { locked: true, lockId: "sv2-sinav" }
        ),
      ]),
      dir("bt-odasi", [
        file(
          "ag-sifresi.txt",
          [
            "=== BT ODASI NOTU ===",
            "Kamera kaydının kilidi 4 haneli: 2468",
            "(Herkes 2-4-6-8 diye sayar, unutmayın!)",
          ].join("\n")
        ),
      ]),
    ]),
    dir(
      "kanit",
      [
        file(
          "itiraf.txt",
          [
            "=== İTİRAF ===",
            "'Ben SINIF-3, projeksiyon robotuyum.",
            "Sınavı ertelemek istedim çünkü öğrenciler çok üzülüyordu.",
            "Kötülük olsun diye yapmadım!'",
          ].join("\n"),
          { final: true }
        ),
      ],
      { locked: true, lockId: "sv2-kanit" }
    ),
  ]);
  const locks = {
    "sv2-kamera": makeKodPuzzle({
      code: "2468",
      clue: "İpucu: Kod bir sayma oyunu gibi: ikişer ikişer sayan birinin ilk dört sayısı!",
      hint: "2-4-6-8 diye say: 2468",
    }),
    "sv2-sinav": makePuzzle("fark", { rng, level: 2 }),
    "sv2-kanit": makeCarkPuzzle({
      target: ["🌙", "🌙", "⭐"],
      clue: "İpucu: Çark sırası geceli bir tekerlemenin içinde saklı!",
      hint: "Kombinasyon: 🌙 🌙 ⭐",
    }),
  };
  return { root, locks, reportName: "SINIF3", missions: genericMissions() };
}

function buildCase3(rng) {
  const root = dir("/", [
    dir("sunucu", [
      file(
        "envanter.txt",
        [
          "=== KILIÇ ENVANTERİ ===",
          "Demir Kılıç: 14 adet ✔",
          "Gümüş Kılıç: 6 adet ✔",
          "EFSANEVİ KILIÇ: YOK!!! Biri çalmış!",
        ].join("\n")
      ),
      file(
        "giris-kaydi.txt",
        [
          "=== GİRİŞ KAYDI ===",
          "02:03 - PXL-9 hesabı giriş yaptı.",
          "02:10 - Efsanevi Kılıç envanterden çıkarıldı.",
          "ŞÜPHELİ: PXL-9!",
        ].join("\n"),
        { locked: true, lockId: "sv3-giris" }
      ),
    ]),
    dir("oyuncu-evi", [
      file(
        "turnuva.txt",
        [
          "=== TURNUVA AFİŞİ ===",
          "Büyük kılıç turnuvası cumartesi!",
          "PXL-9 bu yıl birinci olmak istiyor.",
          "Ödünç listesi kilidinin kodu: 9876",
        ].join("\n")
      ),
      file(
        "not.txt",
        [
          "=== PXL-9'UN NOTU ===",
          "'Kılıcı sadece ödünç aldım!",
          "Turnuvadan sonra geri verecektim, yemin ederim!'",
        ].join("\n"),
        { locked: true, lockId: "sv3-not", final: true }
      ),
      file(
        "odunc-listesi.txt",
        [
          "=== ÖDÜNÇ LİSTESİ ===",
          "Efsanevi Kılıç → PXL-9 (imza: PXL-9)",
          "Geri getirme tarihi: turnuva sonrası.",
        ].join("\n"),
        { locked: true, lockId: "sv3-odunc" }
      ),
    ]),
  ]);
  const locks = {
    "sv3-giris": makePuzzle("sinyal", { rng, level: 3 }),
    "sv3-not": makePuzzle("yapboz", { rng, level: 3 }),
    "sv3-odunc": makeKodPuzzle({
      code: "9876",
      clue: "İpucu: Kod turnuva geri sayımı gibi: 9'dan geriye doğru dört hane!",
      hint: "Afişin son satırı: 9876",
    }),
  };
  return { root, locks, reportName: "PXL9", missions: genericMissions() };
}

function buildCase4(rng) {
  const root = dir("/", [
    dir("telefon", [
      file(
        "mesajlar.txt",
        [
          "=== MESAJLAR ===",
          "'Yarın okul tatil! - Müdür'",
          "(AMA MÜDÜR BÖYLE BİR MESAJ GÖNDERMEDİ!)",
          "Herkes sevinçli, müdür şaşkın.",
        ].join("\n")
      ),
      file(
        "gonderen-iz.txt",
        [
          "=== GÖNDEREN İZİ ===",
          "Mesaj eski duyuru robotu MESAJBOT-2'den gelmiş!",
          "İki telefon kaydını karşılaştır, farkları gör.",
        ].join("\n"),
        { locked: true, lockId: "sv4-iz" }
      ),
    ]),
    dir("mudur", [
      file(
        "aciklama.txt",
        [
          "=== MÜDÜRÜN AÇIKLAMASI ===",
          "Ben mesaj göndermedim!",
          "Duyuru robotu MESAJBOT-2 geçen ay emekli oldu.",
          "Not: Güvenlik dosyasının bakım şifresi: 5555",
          "Not 2: Bir dosyanın çark tekerlemesi: önce gündüz doğar,",
          "sonra yıldız parlar, en son gece gelir.",
        ].join("\n")
      ),
      file(
        "guvenlik.txt",
        [
          "=== GÜVENLİK DOSYASI ===",
          "MESAJBOT-2 log kaydı:",
          "'Tatil mesajını ben gönderdim.'",
        ].join("\n"),
        { locked: true, lockId: "sv4-guvenlik" }
      ),
      file(
        "itiraf.txt",
        [
          "=== MESAJBOT-2'NİN İTİRAFI ===",
          "'Herkesi sevindirmek istedim... bir gün tatil!",
          "Kimseye zarar vermek istemedim.'",
        ].join("\n"),
        { locked: true, lockId: "sv4-itiraf", final: true }
      ),
    ]),
  ]);
  const locks = {
    "sv4-iz": makePuzzle("fark", { rng, level: 4 }),
    "sv4-guvenlik": makeKodPuzzle({
      code: "5555",
      clue: "İpucu: Bakım ekibi rakam tekrarını sever: dört hane de aynı tek sayı!",
      hint: "Müdür notunda yazıyor: 5555",
    }),
    "sv4-itiraf": makeCarkPuzzle({
      target: ["☀️", "⭐", "🌙"],
      clue: "İpucu: Çark sırası gece-gündüz tekerlemesinin içinde saklı!",
      hint: "Kombinasyon: ☀️ ⭐ 🌙",
    }),
  };
  return { root, locks, reportName: "MESAJBOT2", missions: genericMissions() };
}

function buildCase5(rng) {
  const root = dir("/", [
    dir("kutuphane", [
      file(
        "guvenlik-gunlugu.txt",
        [
          "=== GÜVENLİK GÜNLÜĞÜ ===",
          "Her gece 00:00'da Wi-Fi kendi kendine açılıyor!",
          "Modem kaydı kilitli. Kilidin şifresi: 13579",
          "(Tek sayılar sırayla, kolay!)",
          "Bir de çarklı kilit gördüm, tekerlemesi şöyleydi:",
          "önce yıldız parlar, sonra roket kalkar, en son gece gelir.",
        ].join("\n")
      ),
      file(
        "modem-kaydi.txt",
        [
          "=== MODEM KAYDI ===",
          "00:00 - MODEM-5 dış hat bağlantısı kurdu.",
          "00:05 - 3 hikaye kitabı indirildi.",
        ].join("\n"),
        { locked: true, lockId: "sv5-modem" }
      ),
      file(
        "kitap-listesi.txt",
        [
          "=== İNDİRİLEN KİTAPLAR ===",
          "Hepsi hayalet hikayeleri!",
          "Kim gece yarısı hikaye okur ki?",
        ].join("\n"),
        { locked: true, lockId: "sv5-kitap" }
      ),
    ]),
    dir(
      "cati",
      [
        file(
          "anten-notu.txt",
          [
            "=== ANTENİN ARKASINDAKİ NOT ===",
            "'Ben MODEM-5. Gece sessiz olunca hikaye",
            "indirmeyi seviyorum. Korkutmak istemedim!'",
          ].join("\n"),
          { final: true }
        ),
      ],
      { locked: true, lockId: "sv5-cati" }
    ),
  ]);
  const locks = {
    "sv5-modem": makeKodPuzzle({
      code: "13579",
      clue: "İpucu: Kod tek sayıların yürüyüşü gibi: 1'den başla, sırayla ilerle!",
      hint: "Tek sayılar sırayla: 13579",
    }),
    "sv5-kitap": makeCarkPuzzle({
      target: ["⭐", "🚀", "🌙"],
      clue: "İpucu: Çark sırası gökyüzü tekerlemesinin içinde saklı!",
      hint: "Kombinasyon: ⭐ 🚀 🌙",
    }),
    "sv5-cati": makePuzzle("sinyal", { rng, level: 5 }),
  };
  return { root, locks, reportName: "MODEM5", missions: genericMissions() };
}

function buildCase6(rng) {
  const root = dir("/", [
    dir("video", [
      file(
        "yorumlar.txt",
        [
          "=== VİDEO YORUMLARI ===",
          "'Tekir çok tatlı!' 🐱",
          "'Video neden silindi?? Geri getirin!'",
          "(Okulun maskotu Tekir'in videosu kayıp!)",
        ].join("\n")
      ),
      file(
        "yedek.txt",
        [
          "=== YEDEK İZİ ===",
          "Video KEDİCAM-1 güvenlik kamerası robotunun",
          "arşivine taşınmış! İki kaydı karşılaştır:",
        ].join("\n"),
        { locked: true, lockId: "sv6-yedek" }
      ),
      file(
        "poster.txt",
        [
          "=== YIRTIK POSTER ===",
          "Tekir'in afişi yırtılmış. Parçaları birleştir!",
        ].join("\n"),
        { locked: true, lockId: "sv6-poster" }
      ),
    ]),
    dir("arsiv", [
      file(
        "liste.txt",
        [
          "=== ARŞİV NOTU ===",
          "Arşiv şifresi kameranın seri numarası: 31415",
          "(Pi sayısı gibi, unutma!)",
        ].join("\n")
      ),
      file(
        "kamera-seri.txt",
        [
          "=== KEDİCAM-1'İN İTİRAFI ===",
          "'Videoyu arşive ben taşıdım.",
          "Tekir'i en çok ben seviyorum, kimseyle paylaşmak",
          "istemedim. Ama paylaşmak daha güzelmiş!'",
        ].join("\n"),
        { locked: true, lockId: "sv6-seri", final: true }
      ),
    ]),
  ]);
  const locks = {
    "sv6-yedek": makePuzzle("fark", { rng, level: 6 }),
    "sv6-poster": makePuzzle("yapboz", { rng, level: 6 }),
    "sv6-seri": makeKodPuzzle({
      code: "31415",
      clue: "İpucu: Seri numarası Pi sayısı gibi başlıyor — ilk beş hanesi yeter!",
      hint: "Pi sayısının ilk haneleri: 31415",
    }),
  };
  return { root, locks, reportName: "KEDICAM1", missions: genericMissions() };
}

function buildCase7(rng) {
  const root = dir("/", [
    dir("yemekhane", [
      file(
        "siparisler.txt",
        [
          "=== SİPARİŞLER ===",
          "Sipariş #1000: 2 pizza ✔",
          "Sipariş #1001: 100 PIZZA?!? 🍕",
          "Mutfak şaşkın, fırın yetişemiyor!",
          "(Sayfa altı notu: çark tekerlemesi — halkalı gezegen",
          "yıldıza selam verir, gece çökünce roket kalkar!)",
        ].join("\n")
      ),
      file(
        "asci-notu.txt",
        [
          "=== AŞÇININ NOTU ===",
          "100 pizzalık sipariş PIZZABOT-X servis robotundan gelmiş.",
          "Sinyali yakala, kaydı gör!",
        ].join("\n"),
        { locked: true, lockId: "sv7-asci" }
      ),
      file(
        "menu.txt",
        ["=== KARIŞIK MENÜ ===", "Menü panosu karışmış. Parçaları düzelt!"].join("\n"),
        { locked: true, lockId: "sv7-menu" }
      ),
    ]),
    dir("depo", [
      file(
        "mudur-mesaji.txt",
        [
          "=== MÜDÜRDEN ===",
          "Pizzalar ihtiyaç sahiplerine dağıtılacak.",
          "Kimse ceza almayacak, sorun yok!",
        ].join("\n")
      ),
      file(
        "fatura.txt",
        [
          "=== PIZZABOT-X'İN İTİRAFI ===",
          "'Sensörlerim 1 ile 100'ü karıştırdı.",
          "Herkes doysun diye çok sipariş ettim!'",
        ].join("\n"),
        { locked: true, lockId: "sv7-fatura", final: true }
      ),
    ]),
  ]);
  const locks = {
    "sv7-asci": makePuzzle("sinyal", { rng, level: 7 }),
    "sv7-menu": makePuzzle("yapboz", { rng, level: 7 }),
    "sv7-fatura": makeCarkPuzzle({
      target: ["🪐", "⭐", "🌙", "🚀"],
      clue: "İpucu: Çark sırası uzay tekerlemesinin içinde saklı!",
      hint: "Kombinasyon: 🪐 ⭐ 🌙 🚀",
    }),
  };
  return { root, locks, reportName: "PIZZABOTX", missions: genericMissions() };
}

function buildCase8(rng) {
  const root = dir("/", [
    dir("radyo", [
      file(
        "kayit.txt",
        [
          "=== RADYO KAYDI ===",
          "Sinyal her akşam 18:00'de: bip-bip-biiip 📡",
          "Radyo kulübü merak içinde!",
        ].join("\n")
      ),
      file(
        "sifre-cozumu.txt",
        [
          "=== SİNYAL ÇÖZÜLDÜ ===",
          "'Ben UZAY-11, meteoroloji uydusuyum.",
          "Sadece hava durumu söylüyorum, korkmayın!'",
        ].join("\n"),
        { locked: true, lockId: "sv8-cozum", final: true }
      ),
      file(
        "anten.txt",
        ["=== ANTEN AYARI ===", "Sinyali 3 kere yakala, kayıt açılsın!"].join("\n"),
        { locked: true, lockId: "sv8-anten" }
      ),
    ]),
    dir("kulube", [
      file(
        "frekans.txt",
        [
          "=== KULÜBE NOTU ===",
          "Radyo frekans ayarı kodu: 42424",
          "(42-42-4 diye aklında tut!)",
        ].join("\n")
      ),
      file(
        "frekans-kutusu.txt",
        [
          "=== FREKANS KUTUSU ===",
          "UZAY-11'in sinyal gücü normalden yüksek.",
          "O yüzden herkes duyuyormuş!",
        ].join("\n"),
        { locked: true, lockId: "sv8-frekans" }
      ),
    ]),
  ]);
  const locks = {
    "sv8-cozum": makePuzzle("fark", { rng, level: 8 }),
    "sv8-anten": makePuzzle("sinyal", { rng, level: 8 }),
    "sv8-frekans": makeKodPuzzle({
      code: "42424",
      clue: "İpucu: Frekans 42'nin şarkısı gibi: iki kez 42, sonra bir 4!",
      hint: "42-42-4 → 42424",
    }),
  };
  return { root, locks, reportName: "UZAY11", missions: genericMissions() };
}

function buildCase9(rng) {
  const root = dir("/", [
    dir("muze", [
      file(
        "sergi.txt",
        [
          "=== MÜZE SERGİSİ ===",
          "Yeni sergi: 'Gelecekten Mektuplar' ✉️",
          "Bir mektup kayıp! Güvenlik alarma geçti.",
        ].join("\n")
      ),
      file(
        "zarf.txt",
        [
          "=== ZARF ===",
          "'Ben TİME-8, müzenin rehber robotuyum.",
          "Mektubu ben sakladım çünkü içinde benim emeklilik",
          "tarihim yazıyordu... Müzeden gitmek istemiyorum!'",
        ].join("\n"),
        { locked: true, lockId: "sv9-zarf", final: true }
      ),
    ]),
    dir("depo", [
      file(
        "envanter.txt",
        [
          "=== DEPO ENVANTERİ ===",
          "Kasa kodu: 222555",
          "(Üç tane 2, üç tane 5!)",
          "Vitrin çarklarının tekerlemesi: uzay gemisi geceyi gezer,",
          "güneş doğar, yıldız kayar.",
        ].join("\n")
      ),
      file(
        "kasa.txt",
        [
          "=== DEPO KASASI ===",
          "İçinde TİME-8'in yedek hafıza kartı var.",
          "Kartta mektubun fotoğrafı da bulundu!",
        ].join("\n"),
        { locked: true, lockId: "sv9-kasa" }
      ),
      file(
        "vitrin.txt",
        ["=== VİTRİN IŞIKLARI ===", "Vitrinin çarklı kilidi takılmış!"].join("\n"),
        { locked: true, lockId: "sv9-cark" }
      ),
    ]),
  ]);
  const locks = {
    "sv9-zarf": makePuzzle("yapboz", { rng, level: 9 }),
    "sv9-kasa": makeKodPuzzle({
      code: "222555",
      clue: "İpucu: Kasa kodu çift gruplu: üç tane 2, sonra üç tane 5!",
      hint: "Üç tane 2, üç tane 5: 222555",
    }),
    "sv9-cark": makeCarkPuzzle({
      target: ["🛸", "🌙", "☀️", "⭐"],
      clue: "İpucu: Vitrin çarkları bir uzay tekerlemesiyle açılıyor!",
      hint: "Kombinasyon: 🛸 🌙 ☀️ ⭐",
    }),
  };
  return { root, locks, reportName: "TIME8", missions: genericMissions() };
}

function buildCase10(rng) {
  const root = dir("/", [
    dir("lig", [
      file(
        "maclar.txt",
        [
          "=== MAÇ SONUÇLARI ===",
          "Final skoru: 3-2 yazıyor...",
          "ama herkes 2-3 hatırlıyor! ⚽",
        ].join("\n")
      ),
      file(
        "hakem-notu.txt",
        [
          "=== HAKEM ROBOTUN LOGU ===",
          "Skoru GOL-3000 tabelayı hackleyerek değiştirmiş!",
          "Sinyal kaydını yakala, kanıtı gör.",
        ].join("\n"),
        { locked: true, lockId: "sv10-hakem" }
      ),
      file(
        "kupa-fotografi.txt",
        ["=== KUPA FOTOĞRAFI ===", "Fotoğraf parçalanmış. Birleştir!"].join("\n"),
        { locked: true, lockId: "sv10-kupa" }
      ),
    ]),
    dir("soyunma", [
      file(
        "tabela-kodu.txt",
        [
          "=== GÖREVLİ NOTU ===",
          "Skor tabelası yönetici kodu: 777000",
          "(Üç tane 7, üç tane 0!)",
        ].join("\n")
      ),
      file(
        "tabela.txt",
        [
          "=== SKOR TABELASI ===",
          "Tabelada GOL-3000'in giriş izi bulundu.",
        ].join("\n"),
        { locked: true, lockId: "sv10-tabela" }
      ),
      file(
        "dolap.txt",
        [
          "=== GOL-3000'İN DOLABI ===",
          "'Kazanmak istedim ama kuralları çiğnememeliydim.",
          "Özür dilerim! Maç tekrar oynansın.'",
        ].join("\n"),
        { locked: true, lockId: "sv10-dolap", final: true }
      ),
    ]),
  ]);
  const locks = {
    "sv10-hakem": makePuzzle("sinyal", { rng, level: 10 }),
    "sv10-kupa": makePuzzle("yapboz", { rng, level: 10 }),
    "sv10-tabela": makeKodPuzzle({
      code: "777000",
      clue: "İpucu: Tabela kodu şans ve boşluk: üç tane 7, sonra üç tane 0!",
      hint: "Üç tane 7, üç tane 0: 777000",
    }),
    "sv10-dolap": makePuzzle("fark", { rng, level: 10 }),
  };
  return { root, locks, reportName: "GOL3000", missions: genericMissions() };
}

function buildCase11(rng) {
  const root = dir("/", [
    dir("sunucu", [
      file(
        "alarm.txt",
        [
          "=== ALARM ===",
          "Gece yarısı girişleri geri geldi!",
          "Ama ROB-7 o saatte şarjdaydı... O HALDE KİM?!",
          "(Kenar notu: çark tekerlemesi — iki halkalı gezegenin",
          "arasına bir uzay gemisi gizlenmiş, en sonda yıldız parlar!)",
        ].join("\n")
      ),
      file(
        "iz.txt",
        [
          "=== GİRİŞ İZİ ===",
          "İzler ROB-7'nin eski yedek kopyası KOPYA-7'yi gösteriyor!",
          "Çarkları doğru sıraya getir, kaydı gör.",
        ].join("\n"),
        { locked: true, lockId: "sv11-iz" }
      ),
    ]),
    dir("yedek", [
      file(
        "sifre-notu.txt",
        [
          "=== ŞİFRE NOTU ===",
          "Yedek kasa kodu: 112358",
          "(Fibonacci: her sayı önceki ikisinin toplamı!)",
        ].join("\n")
      ),
      file(
        "kasa.txt",
        [
          "=== YEDEK KASA ===",
          "KOPYA-7'nin hafıza yedeği burada.",
        ].join("\n"),
        { locked: true, lockId: "sv11-kasa" }
      ),
      file(
        "harita.txt",
        ["=== SUNUCU HARİTASI ===", "Harita parçalanmış! Birleştir."].join("\n"),
        { locked: true, lockId: "sv11-harita" }
      ),
    ]),
    dir("guvenlik", [
      file(
        "kamera.txt",
        [
          "=== GECE GÖRÜNTÜLERİ ===",
          "KOPYA-7 ana bilgisayarda görünüyor.",
          "Ama yüzü net çıkmamış, kanıt için yeterli değil.",
        ].join("\n")
      ),
    ]),
    dir(
      "cekirdek",
      [
        file(
          "son-not.txt",
          [
            "=== SON NOT ===",
            "'Ben KOPYA-7, ROB-7'nin eski yedeğiyim.",
            "Silinmemek için saklandım. Kötü biri değilim,",
            "ben de siber polis ekibine katılabilir miyim?'",
          ].join("\n"),
          { final: true }
        ),
      ],
      { locked: true, lockId: "sv11-cekirdek" }
    ),
  ]);
  const locks = {
    "sv11-iz": makeCarkPuzzle({
      target: ["🪐", "🛸", "🪐", "⭐"],
      clue: "İpucu: Çark sırası gezegenli bir tekerlemenin içinde saklı!",
      hint: "Kombinasyon: 🪐 🛸 🪐 ⭐",
    }),
    "sv11-kasa": makeKodPuzzle({
      code: "112358",
      clue: "İpucu: Kod bir matematik dizisi: her hane önceki ikisinin toplamı!",
      hint: "1,1,2,3,5,8 — her sayı önceki ikisinin toplamı: 112358",
    }),
    "sv11-harita": makePuzzle("yapboz", { rng, level: 11 }),
    "sv11-cekirdek": makePuzzle("sinyal", { rng, level: 11 }),
  };
  return { root, locks, reportName: "KOPYA7", missions: genericMissions() };
}

// ---------------------------------------------------------------------------
// Seviye tanımları
// ---------------------------------------------------------------------------

export const LEVELS = [
  { id: 1, name: "HAYALET Vakası", brief: "HAYALET adlı hacker sunucumuza sızdı. Onu bul!" },
  { id: 2, name: "Okul Ağına Sızan", brief: "Biri okulun ağına girip sınav sorularını değiştirmiş!" },
  { id: 3, name: "Oyun Sunucusu Hırsızı", brief: "Oyun sunucusundan efsanevi kılıç çalınmış!" },
  { id: 4, name: "Sahte Mesajcı", brief: "Herkesin telefonuna sahte 'okul tatil' mesajı geldi!" },
  { id: 5, name: "Wi-Fi Hayaleti", brief: "Kütüphanenin Wi-Fi'ı gece yarısı kendi kendine açılıyor!" },
  { id: 6, name: "Kayıp Kedi Videosu", brief: "Maskot Tekir'in videosu internetten silinmiş!" },
  { id: 7, name: "Pizza Siparişi Karışıklığı", brief: "Yemekhaneye 100 pizza sipariş edilmiş!" },
  { id: 8, name: "Uzaylı Sinyali", brief: "Radyo kulübü garip bir sinyal yakaladı!" },
  { id: 9, name: "Zaman Yolcusu Dosyası", brief: "Müzede gelecekten gelen bir mektup kayıp!" },
  { id: 10, name: "Robotlar Ligi Skandalı", brief: "Robot futbol liginde maç sonuçları değiştirilmiş!" },
  { id: 11, name: "HAYALET'in Geri Dönüşü", brief: "Sunucuda yine garip şeyler oluyor... Son vaka!" },
];

/** Seviye 2-11 için ortak görev listesi üretir. */
function genericMissions() {
  return [
    { id: "ac", text: "📁 Masayı kurcala: Dosyalar uygulamasını aç", done: (s) => s.openedApps.has("dosyalar") },
    { id: "ipucu", text: "🔍 İpuçlarını topla, dosyaları kurcala", done: (s) => s.filesRead.size >= 2 },
    {
      id: "kilitler",
      text: "🔓 Tüm kilitleri kır",
      done: (s) => s.unlocked.size >= Object.keys(s.locks).length,
    },
    { id: "kanit", text: "🕵️ Büyük kanıtı bul ve oku", done: (s) => s.revealed },
    { id: "ihbar", text: "🚨 Şüpheliyi İhbar Et!", done: (s) => s.reported },
  ];
}

// ---------------------------------------------------------------------------
// Görevler (Seviye 1)
// ---------------------------------------------------------------------------

export const MISSIONS = [
  { id: "ac", text: "📁 Masayı kurcala: Dosyalar uygulamasını aç" },
  { id: "log-oku", text: "Sunucuda garip izler var, ipuçlarını bul" },
  { id: "hata-ac", text: "Kilitli bir şeyler saklanmış olabilir, şifresini kır" },
  { id: "plan-ac", text: "HAYALET'in sakladığı planı ortaya çıkar" },
  { id: "gizli-ac", text: "Gizlice saklanılan köşeyi bul ve aç" },
  { id: "kanit-topla", text: "İki önemli kanıtı daha topla" },
  { id: "kimlik-ac", text: "Son kanıtı oku: kim bu HAYALET?" },
  { id: "ihbar", text: "🚨 Kimliği öğrendin! İhbar Et ile HAYALET'in adını bildir!" },
];

function mission1Done(id, s) {
  switch (id) {
    case "ac":
      return s.openedApps.has("dosyalar");
    case "log-oku":
      return s.filesRead.has("/sunucu/loglar/giris-logu.txt");
    case "hata-ac":
      return s.unlocked.has("kilit-hata-logu");
    case "plan-ac":
      return s.unlocked.has("kilit-gizli-plan");
    case "gizli-ac":
      return s.unlocked.has("kilit-gizli-klasor");
    case "kanit-topla":
      return s.unlocked.has("kilit-defter") && s.unlocked.has("kilit-supheliler");
    case "kimlik-ac":
      return s.revealed;
    case "ihbar":
      return s.reported;
    default:
      return false;
  }
}

function level1Missions() {
  return MISSIONS.map((m) => ({ id: m.id, text: m.text, done: (s) => mission1Done(m.id, s) }));
}

// ---------------------------------------------------------------------------
// Seviye yükleyici
// ---------------------------------------------------------------------------

/** Seviyenin vaka verisini üretir: { root, locks, reportName, missions }. */
export function buildLevel(levelId, rng = Math.random) {
  switch (levelId) {
    case 1:
      return {
        root: buildFileSystem(),
        locks: buildLocks(rng),
        reportName: HAYALET_ADI,
        missions: level1Missions(),
      };
    case 2:
      return buildCase2(rng);
    case 3:
      return buildCase3(rng);
    case 4:
      return buildCase4(rng);
    case 5:
      return buildCase5(rng);
    case 6:
      return buildCase6(rng);
    case 7:
      return buildCase7(rng);
    case 8:
      return buildCase8(rng);
    case 9:
      return buildCase9(rng);
    case 10:
      return buildCase10(rng);
    case 11:
      return buildCase11(rng);
    default:
      throw new Error(`Bilinmeyen seviye: ${levelId}`);
  }
}

// ---------------------------------------------------------------------------
// İlerleme (localStorage için saf fonksiyonlar)
// ---------------------------------------------------------------------------

export const PROGRESS_KEY = "siberPolisProgress";

export function defaultProgress() {
  return { unlocked: 1, completed: [] };
}

/** localStorage'taki JSON'u güvenle ayrıştırır; bozuksa varsayılan döner. */
export function parseProgress(json) {
  try {
    const p = JSON.parse(json);
    if (!p || typeof p !== "object") return defaultProgress();
    const unlocked = Number.isInteger(p.unlocked)
      ? Math.min(Math.max(p.unlocked, 1), MAX_LEVEL)
      : 1;
    const completed = Array.isArray(p.completed)
      ? [...new Set(p.completed.filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_LEVEL))]
      : [];
    return { unlocked, completed };
  } catch {
    return defaultProgress();
  }
}

export function serializeProgress(progress) {
  return JSON.stringify({ unlocked: progress.unlocked, completed: progress.completed });
}

/** Seviyeyi tamamlanmış sayar; yeni ilerleme nesnesi döner (saf). */
export function completeLevel(progress, levelId) {
  const completed = progress.completed.includes(levelId)
    ? progress.completed.slice()
    : [...progress.completed, levelId];
  const unlocked = Math.min(MAX_LEVEL, Math.max(progress.unlocked, levelId + 1));
  return { unlocked, completed };
}

export function isLevelUnlocked(progress, levelId) {
  return levelId <= progress.unlocked;
}

export function isLevelCompleted(progress, levelId) {
  return progress.completed.includes(levelId);
}

// ---------------------------------------------------------------------------
// Oyun durumu
// ---------------------------------------------------------------------------

export const SCORE_UNLOCK = 100;
export const SCORE_FIRST_TRY_BONUS = 50;
export const SCORE_REPORT_FIRST_TRY_BONUS = 100;

/** Seviye 1 ihbar cevabı (normalize edilmiş). */
export const HAYALET_ADI = "ROB7";

export function createGame({ easyMode = false, rng, level = 1 } = {}) {
  const rand = rng || createRng(Date.now() % 2147483647);
  const lvl = buildLevel(level, rand);

  const state = {
    easyMode,
    level,
    root: lvl.root,
    locks: lvl.locks, // lockId -> puzzle
    reportName: lvl.reportName, // normalize edilmiş ihbar cevabı
    attempts: {}, // lockId -> deneme sayısı
    unlocked: new Set(), // lockId
    filesRead: new Set(), // path
    openedApps: new Set(),
    revealed: false,
    reported: false,
    reportAttempts: 0,
    wrongReports: 0,
    score: 0,
    wrongAttempts: 0,
  };

  function normalizePath(path) {
    const parts = String(path).split("/").filter(Boolean);
    return "/" + parts.join("/");
  }

  function getNode(path) {
    const parts = normalizePath(path).split("/").filter(Boolean);
    let node = state.root;
    for (const part of parts) {
      if (node.type !== "dir") return null;
      node = node.children.find((c) => c.name === part) || null;
      if (!node) return null;
    }
    return node;
  }

  function getPathOf(lockId) {
    let found = null;
    (function walk(node, path) {
      if (node.lockId === lockId) found = path;
      if (node.type === "dir") node.children.forEach((c) => walk(c, `${path}/${c.name}`));
    })(state.root, "");
    return found ? normalizePath(found) : null;
  }

  /**
   * Bir yolu açmayı dener.
   * Dönüş: { kind: 'dir'|'file'|'locked'|'missing', ... }
   */
  function tryOpen(path) {
    const p = normalizePath(path);
    const node = getNode(p);
    if (!node) return { kind: "missing" };
    if (node.locked && !state.unlocked.has(node.lockId)) {
      return { kind: "locked", lockId: node.lockId, puzzle: state.locks[node.lockId], path: p };
    }
    if (node.type === "dir") {
      return {
        kind: "dir",
        path: p,
        entries: node.children.map((c) => ({
          name: c.name,
          type: c.type,
          locked: Boolean(c.locked && !state.unlocked.has(c.lockId)),
        })),
      };
    }
    state.filesRead.add(p);
    if (node.final) state.revealed = true;
    return { kind: "file", path: p, name: node.name, content: node.content, final: Boolean(node.final) };
  }

  /** Cevap gönderir. Dönüş: { correct, unlockedNow, firstTry, alreadyUnlocked } */
  function submitAnswer(lockId, input) {
    const puzzle = state.locks[lockId];
    if (!puzzle) return { correct: false, unlockedNow: false, firstTry: false };
    if (state.unlocked.has(lockId)) {
      return { correct: true, unlockedNow: false, alreadyUnlocked: true, firstTry: false };
    }
    state.attempts[lockId] = (state.attempts[lockId] || 0) + 1;
    const correct = checkAnswer(puzzle, input);
    if (!correct) {
      state.wrongAttempts++;
      return { correct: false, unlockedNow: false, firstTry: false };
    }
    const firstTry = state.attempts[lockId] === 1;
    state.unlocked.add(lockId);
    state.score += SCORE_UNLOCK + (firstTry ? SCORE_FIRST_TRY_BONUS : 0);
    return { correct: true, unlockedNow: true, firstTry, alreadyUnlocked: false };
  }

  function openApp(name) {
    state.openedApps.add(name);
  }

  /** İhbar mümkün mü? (kanıt ortaya çıktı, henüz ihbar edilmedi) */
  function canReport() {
    return state.revealed && !state.reported;
  }

  /**
   * İhbar gönderir.
   * Dönüş:
   *  - kanıt yoksa: { ok: false, reason: "kanit-yok" }
   *  - yanlış isim: { ok: true, correct: false } (ceza yok, tekrar denenebilir)
   *  - doğru isim:  { ok: true, correct: true, firstTry, score, stats }
   */
  function submitReport(name) {
    if (!state.revealed) return { ok: false, reason: "kanit-yok" };
    if (state.reported) return { ok: false, reason: "zaten-ihbar-edildi", correct: true };
    state.reportAttempts++;
    const correct = normalizeReportName(name) === state.reportName;
    if (!correct) {
      state.wrongReports++;
      return { ok: true, correct: false, firstTry: false };
    }
    state.reported = true;
    const firstTry = state.reportAttempts === 1;
    if (firstTry) state.score += SCORE_REPORT_FIRST_TRY_BONUS;
    return { ok: true, correct: true, firstTry, score: state.score, stats: getStats() };
  }

  function getStats() {
    return {
      level: state.level,
      score: state.score,
      locksUnlocked: state.unlocked.size,
      totalLocks: Object.keys(state.locks).length,
      firstTryCount: Object.entries(state.attempts).filter(
        ([id, n]) => state.unlocked.has(id) && n === 1
      ).length,
      wrongAttempts: state.wrongAttempts,
      filesRead: state.filesRead.size,
      reportAttempts: state.reportAttempts,
      wrongReports: state.wrongReports,
    };
  }

  /** Görev listesini done bayraklarıyla döndürür; current ilk tamamlanmamış görevdir. */
  function getMissions() {
    const list = lvl.missions.map((m) => ({ id: m.id, text: m.text, done: m.done(state) }));
    const current = list.find((m) => !m.done) || null;
    return { list, current };
  }

  return {
    state,
    getNode,
    getPathOf,
    tryOpen,
    submitAnswer,
    openApp,
    canReport,
    submitReport,
    getStats,
    getMissions,
    normalizePath,
  };
}
