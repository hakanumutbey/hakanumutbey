/**
 * SİBER POLİS — masaüstü, pencere sistemi ve oyun arayüzü.
 */
import {
  createGame,
  signalPosition,
  isInZone,
  LEVELS,
  MAX_LEVEL,
  PROGRESS_KEY,
  defaultProgress,
  parseProgress,
  serializeProgress,
  completeLevel,
  isLevelUnlocked,
  isLevelCompleted,
} from "./gameLogic.js";
import { createAudioBus } from "./seriesFeatures.js";

const audio = createAudioBus();

let game = null;
let easyModeFlag = false;
let progress = loadProgress();

function loadProgress() {
  try {
    return parseProgress(localStorage.getItem(PROGRESS_KEY));
  } catch {
    return defaultProgress();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, serializeProgress(progress));
  } catch {
    /* yok say */
  }
}

/** İlk tamamlanmamış açık seviye (hepsi bittiyse son seviye). */
function firstIncompleteLevel() {
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if (isLevelUnlocked(progress, l) && !isLevelCompleted(progress, l)) return l;
  }
  return MAX_LEVEL;
}

let zCounter = 100;
const openWindows = new Map(); // appId -> window element

// ---------------------------------------------------------------------------
// Pencere sistemi
// ---------------------------------------------------------------------------

function bringToFront(win) {
  document.querySelectorAll(".window").forEach((w) => w.classList.remove("active"));
  win.classList.add("active");
  win.style.zIndex = ++zCounter;
}

function makeDraggable(win, handle) {
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".window-close")) return;
    dragging = true;
    sx = e.clientX;
    sy = e.clientY;
    ox = win.offsetLeft;
    oy = win.offsetTop;
    handle.setPointerCapture(e.pointerId);
    bringToFront(win);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const desktop = document.getElementById("desktop");
    const nx = Math.min(Math.max(0, ox + e.clientX - sx), desktop.clientWidth - 80);
    const ny = Math.min(Math.max(0, oy + e.clientY - sy), desktop.clientHeight - 40);
    win.style.left = nx + "px";
    win.style.top = ny + "px";
  });
  handle.addEventListener("pointerup", () => (dragging = false));
}

function createWindow(id, title, x, y) {
  const existing = openWindows.get(id);
  if (existing) {
    bringToFront(existing);
    return existing;
  }
  const win = document.createElement("div");
  win.className = "window";
  win.id = `window-${id}`;
  win.style.left = x + "px";
  win.style.top = y + "px";
  win.style.zIndex = ++zCounter;

  const bar = document.createElement("div");
  bar.className = "window-titlebar";
  const titleSpan = document.createElement("span");
  titleSpan.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.className = "window-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => {
    audio.click();
    win.remove();
    openWindows.delete(id);
    updateTaskbar();
  });
  bar.append(titleSpan, closeBtn);

  const body = document.createElement("div");
  body.className = "window-body";

  win.append(bar, body);
  document.getElementById("windows").append(win);
  makeDraggable(win, bar);
  win.addEventListener("pointerdown", () => bringToFront(win));
  openWindows.set(id, win);
  bringToFront(win);
  updateTaskbar();
  return win;
}

function updateTaskbar() {
  const box = document.getElementById("taskbar-items");
  box.innerHTML = "";
  for (const [id, win] of openWindows) {
    const item = document.createElement("button");
    item.className = "taskbar-item";
    item.textContent = win.querySelector(".window-titlebar span").textContent;
    item.addEventListener("click", () => {
      audio.click();
      bringToFront(win);
    });
    box.append(item);
  }
}

// ---------------------------------------------------------------------------
// Konfeti
// ---------------------------------------------------------------------------

function confetti(count = 30) {
  const layer = document.getElementById("confetti-layer");
  const emojis = ["🎉", "⭐", "🟦", "🟨", "✨", "🎊"];
  for (let i = 0; i < count; i++) {
    const c = document.createElement("span");
    c.className = "confetti";
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = 1.5 + Math.random() * 1.5 + "s";
    layer.append(c);
    setTimeout(() => c.remove(), 3200);
  }
}

// ---------------------------------------------------------------------------
// Görev paneli + puan
// ---------------------------------------------------------------------------

function renderMissions() {
  const { list, current } = game.getMissions();
  const ul = document.getElementById("mission-list");
  ul.innerHTML = "";
  for (const m of list) {
    const li = document.createElement("li");
    li.textContent = (m.done ? "✅ " : "⬜ ") + m.text;
    if (m.done) li.classList.add("done");
    if (current && m.id === current.id) li.classList.add("current");
    ul.append(li);
  }
  document.getElementById("score-value").textContent = game.state.score;
  // Kimlik ortaya çıkınca 🚨 İhbar Et simgesi parlasın
  const ihbarIcon = document.querySelector('.desktop-icon[data-app="ihbar"]');
  if (ihbarIcon) ihbarIcon.classList.toggle("glow", game.canReport());
}

// ---------------------------------------------------------------------------
// Dosyalar uygulaması
// ---------------------------------------------------------------------------

let currentPath = "/";

function openFilesApp() {
  game.openApp("dosyalar");
  renderMissions();
  const win = createWindow("dosyalar", "📁 Dosyalar", 130, 60);
  renderFilesWindow(win);
}

function renderFilesWindow(win) {
  const body = win.querySelector(".window-body");
  body.innerHTML = "";

  const pathbar = document.createElement("div");
  pathbar.id = "files-pathbar";
  const upBtn = document.createElement("button");
  upBtn.id = "btn-up";
  upBtn.textContent = "⬆ Üst";
  upBtn.addEventListener("click", () => {
    audio.click();
    if (currentPath !== "/") {
      const parts = currentPath.split("/").filter(Boolean);
      parts.pop();
      currentPath = "/" + parts.join("/");
      renderFilesWindow(win);
    }
  });
  const pathText = document.createElement("span");
  pathText.id = "files-current-path";
  pathText.textContent = currentPath;
  pathbar.append(upBtn, pathText);
  body.append(pathbar);

  const res = game.tryOpen(currentPath);
  const grid = document.createElement("div");
  grid.className = "file-grid";
  if (res.kind === "dir") {
    for (const entry of res.entries) {
      const el = document.createElement("div");
      el.className = "file-entry" + (entry.locked ? " locked" : "");
      el.dataset.name = entry.name;
      el.dataset.type = entry.type;
      const emoji = document.createElement("span");
      emoji.className = "f-emoji";
      emoji.textContent = entry.type === "dir" ? "📁" : "📄";
      const name = document.createElement("span");
      name.className = "f-name";
      name.textContent = entry.name;
      el.append(emoji, name);
      el.addEventListener("dblclick", () => openEntry(entry.name, win));
      grid.append(el);
    }
    if (res.entries.length === 0) {
      grid.innerHTML = "<p>(Boş klasör)</p>";
    }
  }
  body.append(grid);
}

function entryPath(name) {
  return (currentPath === "/" ? "" : currentPath) + "/" + name;
}

function openEntry(name, filesWin) {
  const path = entryPath(name);
  const res = game.tryOpen(path);
  if (res.kind === "missing") return;
  if (res.kind === "locked") {
    audio.door();
    openPuzzleWindow(res.lockId, res.puzzle, path, filesWin);
    return;
  }
  if (res.kind === "dir") {
    audio.ui();
    currentPath = res.path;
    renderFilesWindow(filesWin);
    return;
  }
  // dosya
  audio.pickup();
  openTextViewer(res);
  renderMissions();
}

function openTextViewer(fileRes) {
  const id = "viewer-" + fileRes.path.replace(/[^\w]/g, "_");
  const win = createWindow(id, "📄 " + fileRes.name, 200 + Math.random() * 120, 100 + Math.random() * 80);
  const body = win.querySelector(".window-body");
  body.innerHTML = "";
  const pre = document.createElement("div");
  pre.className = "text-viewer-content";
  pre.textContent = fileRes.content;
  body.append(pre);
  if (fileRes.final) {
    audio.win();
    confetti(40);
    renderMissions();
  }
}

// ---------------------------------------------------------------------------
// Bulmaca penceresi
// ---------------------------------------------------------------------------

function openPuzzleWindow(lockId, puzzle, path, filesWin) {
  const win = createWindow("puzzle-" + lockId, `🔓 Şifre Kırma: ${puzzle.title}`, 260, 120);
  const body = win.querySelector(".window-body");
  body.innerHTML = "";

  const q = document.createElement("div");
  q.className = "puzzle-question";
  q.textContent = puzzle.question;
  body.append(q);

  const feedback = document.createElement("div");
  feedback.className = "puzzle-feedback";
  feedback.id = "puzzle-feedback-" + lockId;

  const tryAnswer = (answer) => {
    const res = game.submitAnswer(lockId, answer);
    if (res.correct) {
      audio.win();
      confetti(24);
      feedback.textContent = "✅ KİLİT AÇILDI! Harikasın!";
      feedback.className = "puzzle-feedback ok";
      renderMissions();
      setTimeout(() => {
        win.remove();
        openWindows.delete("puzzle-" + lockId);
        updateTaskbar();
        openEntryAfterUnlock(path, filesWin);
      }, 900);
    } else {
      audio.fail();
      feedback.textContent = "❌ Olmadı! Ceza yok, tekrar dene 💪";
      feedback.className = "puzzle-feedback err";
    }
  };

  if (puzzle.type === "kod") {
    // İpucu cümlesi her zaman görünür
    const clue = document.createElement("div");
    clue.className = "puzzle-clue";
    clue.id = `kod-clue-${lockId}`;
    clue.textContent = puzzle.clue;
    body.append(clue);

    const row = document.createElement("div");
    row.className = "puzzle-row";
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = puzzle.length;
    input.id = `puzzle-input-${lockId}`;
    input.placeholder = `${puzzle.length} haneli kod...`;
    const submit = document.createElement("button");
    submit.className = "puzzle-btn";
    submit.id = `puzzle-submit-${lockId}`;
    submit.textContent = "Kontrol Et";
    const go = () => {
      if (input.value.trim()) tryAnswer(input.value);
      input.select();
    };
    submit.addEventListener("click", go);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    row.append(input, submit);
    body.append(row);
    input.focus();
  } else if (puzzle.type === "cark") {
    // İpucu cümlesi her zaman görünür
    const clue = document.createElement("div");
    clue.className = "puzzle-clue";
    clue.id = `cark-clue-${lockId}`;
    clue.textContent = puzzle.clue;
    body.append(clue);

    // Çarklar hedeften farklı bir başlangıç konumunda açılır
    const syms = puzzle.symbols;
    const current = puzzle.target.map((t, i) => {
      const found = syms.indexOf(t);
      const idx = found >= 0 ? found : 0;
      // En az 1 adım kaydır; tek sembol olsa bile güvenli
      const step = 1 + (syms.length > 1 ? i % (syms.length - 1) : 0);
      return syms[(idx + step) % syms.length];
    });

    const wrap = document.createElement("div");
    wrap.className = "cark-wrap";
    wrap.id = `cark-wrap-${lockId}`;

    current.forEach((sym, i) => {
      const wheel = document.createElement("div");
      wheel.className = "cark-wheel";

      const up = document.createElement("button");
      up.className = "cark-btn";
      up.dataset.wheel = i;
      up.dataset.dir = "up";
      up.textContent = "⬆";

      const display = document.createElement("div");
      display.className = "cark-display";
      display.dataset.wheel = i;
      display.textContent = sym;

      const down = document.createElement("button");
      down.className = "cark-btn";
      down.dataset.wheel = i;
      down.dataset.dir = "down";
      down.textContent = "⬇";

      const turn = (delta) => {
        audio.click();
        const idx = syms.indexOf(current[i]);
        current[i] = syms[(idx + delta + syms.length) % syms.length];
        display.textContent = current[i];
      };
      up.addEventListener("click", () => turn(1));
      down.addEventListener("click", () => turn(-1));

      wheel.append(up, display, down);
      wrap.append(wheel);
    });
    body.append(wrap);

    const openBtn = document.createElement("button");
    openBtn.className = "puzzle-btn";
    openBtn.id = `cark-ac-${lockId}`;
    openBtn.textContent = "🔓 Aç";
    openBtn.addEventListener("click", () => tryAnswer(current.slice()));
    body.append(openBtn);
  } else if (puzzle.type === "sinyal") {
    const bar = document.createElement("div");
    bar.className = "sinyal-bar";
    const zone = document.createElement("div");
    zone.className = "sinyal-zone";
    zone.style.left = (0.5 - puzzle.zoneSize / 2) * 100 + "%";
    zone.style.width = puzzle.zoneSize * 100 + "%";
    const cursor = document.createElement("div");
    cursor.className = "sinyal-cursor";
    cursor.id = `sinyal-cursor-${lockId}`;
    cursor.dataset.pos = "0";
    bar.append(zone, cursor);
    body.append(bar);

    const count = document.createElement("div");
    count.className = "sinyal-count";
    count.id = `sinyal-count-${lockId}`;
    count.textContent = `Yakalanan: 0/${puzzle.required}`;
    body.append(count);

    const btn = document.createElement("button");
    btn.className = "puzzle-btn";
    btn.id = `sinyal-yakala-${lockId}`;
    btn.textContent = "📡 YAKALA!";
    body.append(btn);

    const start = performance.now();
    const tick = (now) => {
      if (!win.isConnected) return; // pencere kapandı, animasyonu durdur
      const pos = signalPosition(puzzle, now - start);
      cursor.style.left = pos * 100 + "%";
      cursor.dataset.pos = String(pos);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const catches = [];
    btn.addEventListener("click", () => {
      const pos = parseFloat(cursor.dataset.pos);
      if (isInZone(puzzle, pos)) {
        catches.push(pos);
        audio.pickup();
        count.textContent = `Yakalanan: ${catches.length}/${puzzle.required}`;
        feedback.textContent = `🎯 Yakaladın! ${catches.length}/${puzzle.required}`;
        feedback.className = "puzzle-feedback ok";
        if (catches.length >= puzzle.required) tryAnswer(catches);
      } else {
        audio.fail();
        feedback.textContent = "📡 Kaçırdın! İmleç yeşil bölgedeyken bas. Ceza yok 💪";
        feedback.className = "puzzle-feedback err";
      }
    });
  } else if (puzzle.type === "yapboz") {
    // Hedef küçük referans resmi
    const ref = document.createElement("div");
    ref.className = "yapboz-ref";
    ref.id = `yapboz-ref-${lockId}`;
    const refLabel = document.createElement("div");
    refLabel.textContent = "Belge böyle görünmeli:";
    const refGrid = document.createElement("div");
    refGrid.className = "yapboz-grid mini";
    puzzle.target.forEach((t) => {
      const cell = document.createElement("span");
      cell.className = "yapboz-cell-static";
      cell.textContent = t;
      refGrid.append(cell);
    });
    ref.append(refLabel, refGrid);
    body.append(ref);

    const arr = puzzle.tiles.slice();
    let selected = -1;
    const grid = document.createElement("div");
    grid.className = "yapboz-grid";
    grid.id = `yapboz-grid-${lockId}`;
    body.append(grid);

    const render = () => {
      grid.innerHTML = "";
      arr.forEach((t, i) => {
        const btn = document.createElement("button");
        btn.className = "yapboz-tile" + (i === selected ? " secili" : "");
        btn.dataset.idx = i;
        btn.textContent = t;
        btn.addEventListener("click", () => {
          if (selected < 0) {
            selected = i;
            audio.click();
            render();
          } else if (selected === i) {
            selected = -1;
            render();
          } else {
            [arr[selected], arr[i]] = [arr[i], arr[selected]];
            audio.ui();
            selected = -1;
            render();
            if (arr.every((x, k) => x === puzzle.target[k])) tryAnswer(arr);
          }
        });
        grid.append(btn);
      });
    };
    render();
  } else if (puzzle.type === "fark") {
    const wrap = document.createElement("div");
    wrap.className = "fark-wrap";

    const mkGrid = (cells, clickable) => {
      const g = document.createElement("div");
      g.className = "fark-grid";
      g.style.gridTemplateColumns = `repeat(${puzzle.cols}, 1fr)`;
      cells.forEach((emoji, i) => {
        if (clickable) {
          const btn = document.createElement("button");
          btn.className = "fark-cell";
          btn.dataset.idx = i;
          btn.textContent = emoji;
          btn.addEventListener("click", () => onPick(i, btn));
          g.append(btn);
        } else {
          const sp = document.createElement("span");
          sp.className = "fark-cell-static";
          sp.textContent = emoji;
          g.append(sp);
        }
      });
      return g;
    };

    const found = new Set();
    const onPick = (i, btn) => {
      if (found.has(i)) return;
      if (puzzle.diffIndices.includes(i)) {
        found.add(i);
        audio.pickup();
        btn.classList.add("bulundu");
        btn.textContent = "✅";
        feedback.textContent = `👏 Fark bulundu! ${found.size}/${puzzle.diffIndices.length}`;
        feedback.className = "puzzle-feedback ok";
        if (found.size === puzzle.diffIndices.length) tryAnswer([...found]);
      } else {
        audio.fail();
        feedback.textContent = "🤔 Orası aynı görünüyor. Başka hücreye bak!";
        feedback.className = "puzzle-feedback err";
      }
    };

    const leftLabel = document.createElement("div");
    leftLabel.className = "fark-label";
    leftLabel.textContent = "📷 Kamera 1";
    const rightLabel = document.createElement("div");
    rightLabel.className = "fark-label";
    rightLabel.textContent = "📷 Kamera 2 (buraya tıkla!)";
    const leftCol = document.createElement("div");
    leftCol.append(leftLabel, mkGrid(puzzle.left, false));
    const rightCol = document.createElement("div");
    rightCol.append(rightLabel, mkGrid(puzzle.right, true));
    wrap.append(leftCol, rightCol);
    body.append(wrap);
  }

  // 💡 İpucu düğmesi herkese açık; kolay modda ipucu otomatik açık gelir
  {
    const hintBtn = document.createElement("button");
    hintBtn.className = "puzzle-btn";
    hintBtn.id = `puzzle-hint-btn-${lockId}`;
    hintBtn.textContent = "💡 İpucu";
    const hintText = document.createElement("div");
    hintText.className = "puzzle-hint-text" + (game.state.easyMode ? "" : " hidden");
    hintText.id = `puzzle-hint-text-${lockId}`;
    hintText.textContent = puzzle.hint;
    hintBtn.addEventListener("click", () => {
      audio.ui();
      hintText.classList.toggle("hidden");
    });
    body.append(hintBtn, hintText);
  }

  body.append(feedback);
}

function openEntryAfterUnlock(path, filesWin) {
  // Kilidi açılan öğeyi artık aç
  const res = game.tryOpen(path);
  if (res.kind === "dir") {
    currentPath = res.path;
    renderFilesWindow(filesWin);
  } else if (res.kind === "file") {
    openTextViewer(res);
    renderMissions();
    if (openWindows.has("dosyalar")) renderFilesWindow(filesWin);
  }
}

// ---------------------------------------------------------------------------
// Rozetler & Yardım
// ---------------------------------------------------------------------------

function openBadgesApp() {
  const win = createWindow("rozetler", "🏅 Rozetler", 180, 90);
  const body = win.querySelector(".window-body");
  body.innerHTML = "";
  const TUR_EMOJI = { cark: "🎡", kod: "🔑", sinyal: "📡", yapboz: "🧩", fark: "👆" };
  const grid = document.createElement("div");
  grid.className = "badge-grid";
  for (const [lockId, puzzle] of Object.entries(game.state.locks)) {
    const earned = game.state.unlocked.has(lockId);
    const item = document.createElement("div");
    item.className = "badge-item " + (earned ? "earned" : "locked-badge");
    item.dataset.badge = lockId;
    const emoji = TUR_EMOJI[puzzle.type] || "🔒";
    item.innerHTML = `<span class="b-emoji">${earned ? emoji : "🔒"}</span>${puzzle.title}`;
    grid.append(item);
  }
  body.append(grid);
}

function openHelpApp() {
  const win = createWindow("yardim", "❓ Yardım", 220, 110);
  const body = win.querySelector(".window-body");
  body.innerHTML = `
    <div class="text-viewer-content">
🛡️ <b>SİBER POLİS NASIL OYNANIR?</b>

1. 📁 <b>Dosyalar</b> simgesine tıkla.
2. Klasörleri <b>çift tıklayarak</b> aç, dosyaları çift tıklayarak oku.
3. 🔒 Kilitli dosyalara çift tıklayınca <b>şifre kırma bulmacası</b> açılır.
4. Bulmacaları çözünce kilit açılır ve dosyayı okuyabilirsin.
5. Dosyalardaki ipuçları başka kilitleri açmana yardım eder!
6. Yanlış cevapta ceza yok — istediğin kadar dene.
7. Kimliği öğrenince 🚨 <b>İhbar Et</b> uygulamasını aç ve HAYALET'in adını bildir!

🎵 Sesler: tıklama, başarı ve hata sesleri otomatik çalar.
    </div>`;
}

// ---------------------------------------------------------------------------
// 🚨 İhbar Et uygulaması
// ---------------------------------------------------------------------------

function openReportApp() {
  game.openApp("ihbar");
  const win = createWindow("ihbar", "🚨 İhbar Et", 260, 100);
  const body = win.querySelector(".window-body");
  body.innerHTML = "";

  if (!game.state.revealed) {
    const warn = document.createElement("div");
    warn.className = "report-no-evidence";
    warn.id = "report-no-evidence";
    warn.textContent =
      "🔎 Henüz yeterli kanıtın yok — dosyaları incelemeye devam et! " +
      "Şüphelinin kim olduğunu öğrenmeden kimseyi ihbar edemezsin.";
    const desc = document.createElement("p");
    desc.className = "report-desc";
    desc.textContent = "Suçlu olduğunu düşündüğün şüphelinin adını yaz:";
    const row = document.createElement("div");
    row.className = "report-input-row";
    const input = document.createElement("input");
    input.type = "text";
    input.id = "report-input";
    input.disabled = true;
    input.placeholder = "Önce kanıt topla...";
    const btn = document.createElement("button");
    btn.className = "puzzle-btn";
    btn.id = "report-submit";
    btn.textContent = "İHBAR ET";
    btn.disabled = true;
    row.append(input, btn);
    body.append(desc, row, warn);
    return;
  }

  const desc = document.createElement("p");
  desc.className = "report-desc";
  desc.textContent = "Suçlu olduğunu düşündüğün şüphelinin adını yaz:";
  const row = document.createElement("div");
  row.className = "report-input-row";
  const input = document.createElement("input");
  input.type = "text";
  input.id = "report-input";
  input.placeholder = "İsmi yaz...";
  const btn = document.createElement("button");
  btn.className = "puzzle-btn";
  btn.id = "report-submit";
  btn.textContent = "İHBAR ET";
  row.append(input, btn);
  const feedback = document.createElement("div");
  feedback.className = "report-feedback";
  feedback.id = "report-feedback";
  body.append(desc, row, feedback);

  const submit = () => {
    const name = input.value.trim();
    if (!name) return;
    const res = game.submitReport(name);
    if (!res.ok) return;
    if (!res.correct) {
      audio.fail();
      feedback.textContent =
        "❌ Bu kişi suçlu değil gibi görünüyor... İpuçlarını tekrar incele!";
      feedback.className = "report-feedback err";
      input.select();
      return;
    }
    // ✅ İhbar başarılı: polisler yola çıktı!
    audio.win();
    confetti(40);
    input.disabled = true;
    btn.disabled = true;
    feedback.textContent = "";
    const ok = document.createElement("div");
    ok.className = "report-success";
    ok.id = "report-success";
    ok.innerHTML =
      "✅ İHBAR ALINDI!<br><span class='police-car'>🚓</span><br>Polisler yola çıktı...";
    body.append(ok);
    renderMissions(); // simge parlaklığını kaldır
    setTimeout(finishLevel, 2200);
  };
  btn.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
  input.focus();
}

// ---------------------------------------------------------------------------
// 🗂️ Vakalar uygulaması + seviye yönetimi
// ---------------------------------------------------------------------------

function closeAllWindows() {
  for (const [, win] of openWindows) win.remove();
  openWindows.clear();
  updateTaskbar();
}

/** Seviyeyi yükler: yeni oyun durumu, temiz masaüstü. */
function loadLevel(n) {
  game = createGame({ easyMode: easyModeFlag, level: n });
  window.__siberPolis = game; // test/otomasyon için
  currentPath = "/";
  closeAllWindows();
  renderMissions();
}

function openVakalarApp() {
  const win = createWindow("vakalar", "🗂️ Vakalar", 150, 70);
  const body = win.querySelector(".window-body");
  body.innerHTML = "";

  const lv = LEVELS.find((l) => l.id === game.state.level);
  const brief = document.createElement("div");
  brief.className = "vaka-brief";
  brief.innerHTML = `<b>Aktif vaka ${game.state.level}: ${lv.name}</b><br>${lv.brief}`;
  body.append(brief);

  const list = document.createElement("div");
  list.className = "vaka-list";
  for (const l of LEVELS) {
    const row = document.createElement("button");
    const done = isLevelCompleted(progress, l.id);
    const open = isLevelUnlocked(progress, l.id);
    row.className =
      "vaka-row" + (done ? " cozuldu" : "") + (l.id === game.state.level ? " aktif" : "");
    row.dataset.level = l.id;
    row.disabled = !open;
    const icon = done ? "✅" : open ? "▶️" : "🔒";
    row.innerHTML =
      `<span class="vaka-no">${l.id}</span>` +
      `<span class="vaka-ad">${l.name}</span>` +
      `<span class="vaka-durum">${icon}</span>`;
    if (open) {
      row.addEventListener("click", () => {
        audio.ui();
        loadLevel(l.id);
        openVakalarApp(); // listeyi tazele
        openFilesApp();
      });
    }
    list.append(row);
  }
  body.append(list);

  const reset = document.createElement("button");
  reset.id = "btn-sifirla";
  reset.textContent = "🗑️ İlerlemeyi Sıfırla";
  reset.addEventListener("click", () => {
    if (confirm("Tüm vaka ilerlemen silinsin mi?")) {
      try {
        localStorage.removeItem(PROGRESS_KEY);
      } catch {
        /* yok say */
      }
      location.reload();
    }
  });
  body.append(reset);
}

// ---------------------------------------------------------------------------
// Seviye bitişi / büyük final
// ---------------------------------------------------------------------------

function statsHtml(stats) {
  return `
    <div class="stat"><b>${stats.score}</b>PUAN</div>
    <div class="stat"><b>${stats.locksUnlocked}/${stats.totalLocks}</b>KİLİT</div>
    <div class="stat"><b>${stats.firstTryCount}</b>İLK DENEME ✨</div>
    <div class="stat"><b>${stats.filesRead}</b>OKUNAN DOSYA</div>`;
}

/** İhbar başarılı → ilerlemeyi kaydet → seviye bitiş ekranı. */
function finishLevel() {
  const level = game.state.level;
  progress = completeLevel(progress, level);
  saveProgress();
  if (level >= MAX_LEVEL) showFinalVictory();
  else showLevelComplete(level);
}

function showLevelComplete(level) {
  const stats = game.getStats();
  const lv = LEVELS.find((l) => l.id === level);
  const content = document.getElementById("end-content");
  content.innerHTML = `
    <div id="end-badge">✅</div>
    <h1>VAKA ÇÖZÜLDÜ!</h1>
    <p id="end-story"><b>Vaka ${level}: ${lv.name}</b> kapanmıştır. Şüpheli yakalandı —
    ona kötü davranmayacağız, o da artık iyi bir robot olacak!</p>
    <div id="end-badge-name">🎖️ SİBER POLİS ROZETİ: VAKA ${level} 🎖️</div>
    <div id="end-stats">${statsHtml(stats)}</div>
    <p id="end-thanks">Harika iş polis! ${MAX_LEVEL - level} vaka daha seni bekliyor! 🫡</p>`;
  const btn = document.createElement("button");
  btn.id = "btn-sonraki-vaka";
  btn.className = "puzzle-btn";
  btn.textContent = "▶️ SONRAKİ VAKA";
  btn.style.fontSize = "18px";
  btn.style.padding = "14px 34px";
  btn.addEventListener("click", () => {
    document.getElementById("end-screen").classList.add("hidden");
    audio.click();
    loadLevel(level + 1);
    openVakalarApp();
  });
  content.append(btn);
  document.getElementById("end-screen").classList.remove("hidden");
  audio.win();
  confetti(60);
}

function showFinalVictory() {
  const stats = game.getStats();
  const content = document.getElementById("end-content");
  content.innerHTML = `
    <div id="end-badge">🏆</div>
    <h1>BAŞ SİBER POLİS OLDUN!</h1>
    <p id="end-story">11 vakanın 11'ini de çözdün! KOPYA-7 de ekibe katıldı.
    Siber şehir artık güvende — ve hepsi senin sayende!</p>
    <div id="end-badge-name">👑 BAŞ SİBER POLİS ROZETİ 👑</div>
    <div id="end-stats">${statsHtml(stats)}</div>
    <p id="end-thanks">Oynadığın için teşekkürler, efsane polis! 🫡</p>`;
  const btn = document.createElement("button");
  btn.id = "btn-tekrar";
  btn.className = "puzzle-btn";
  btn.textContent = "🔄 TEKRAR OYNA";
  btn.style.fontSize = "18px";
  btn.style.padding = "14px 34px";
  btn.addEventListener("click", () => location.reload());
  content.append(btn);
  document.getElementById("end-screen").classList.remove("hidden");
  audio.win();
  confetti(100);
}

// ---------------------------------------------------------------------------
// Başlangıç
// ---------------------------------------------------------------------------

function startClock() {
  const el = document.getElementById("topbar-clock");
  const tick = () => {
    const d = new Date();
    el.textContent =
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  };
  tick();
  setInterval(tick, 5000);
}

function boot() {
  startClock();

  document.getElementById("btn-basla").addEventListener("click", () => {
    easyModeFlag = document.getElementById("chk-kolay").checked;
    document.getElementById("intro-overlay").classList.add("hidden");
    loadLevel(firstIncompleteLevel());
    audio.win();
  });

  document.querySelectorAll(".desktop-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      if (!game) return;
      audio.click();
      const app = icon.dataset.app;
      if (app === "dosyalar") openFilesApp();
      else if (app === "rozetler") openBadgesApp();
      else if (app === "yardim") openHelpApp();
      else if (app === "ihbar") openReportApp();
      else if (app === "vakalar") openVakalarApp();
    });
  });

  document.getElementById("taskbar-start").addEventListener("click", () => {
    if (!game) return;
    audio.click();
    openFilesApp();
  });
}

boot();
