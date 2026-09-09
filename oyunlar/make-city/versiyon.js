/* Make City — Ortak sürüm seçici (versiyon.js)
   Her sürüm dosyası bunu yükler ve initVersionPicker("X.0") çağırır. */
(function () {
  "use strict";

  const VERSIONS = [
    { id: "1.0", file: "v1.html", name: "Klasik 2D", note: "İlk sürüm: ızgaraya emoji binalar, iki mod" },
    { id: "2.0", file: "v2.html", name: "3D'ye Geçiş", note: "3D şehir, dönen kamera, gerçekçi birleşen yollar, tam ekran" },
    { id: "3.0", file: "v3.html", name: "Mega Güncelleme", note: "Arabalar, gece/gündüz, bulutlar, kayıt sistemi, Gölgekent, okul/polis/itfaiye/fabrika, seviyeler" },
    { id: "4.0", file: "index.html", name: "Versiyon Sistemi", note: "Sürümler arası gerçek geçiş ve sürüm notları" },
    { id: "5.0", name: "Ultra Grafik", note: "Işın izlemeli süper gerçekçi grafikler", locked: "💻🔥 Bilgisayarın bu sürümü kaldıramaz!" },
    { id: "6.0", file: "v6.html", name: "Şehir Halkı", note: "Sokaklarda yürüyen ve şehir hakkında konuşan vatandaşlar! Gerçek ekonomi: bina masrafları, artan fiyatlar, afk kalınca uyku modu" },
  ];

  function num(id) { return parseFloat(id); }

  function make(tag, style, text) {
    const el = document.createElement(tag);
    if (style) el.style.cssText = style;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  window.initVersionPicker = function (currentId) {
    // ---- Sürüm düğmesi ----
    const btn = make("button",
      "position:fixed; right:10px; bottom:70px; z-index:40;" +
      "background:#6a1b9a; color:#fff; border:none; border-radius:10px;" +
      "padding:7px 14px; font-weight:700; cursor:pointer; font-size:14px;" +
      "box-shadow:0 4px 14px #0008; font-family:inherit;",
      "🔀 v" + currentId);
    document.body.appendChild(btn);

    // ---- Kaplama ----
    const overlay = make("div",
      "display:none; position:fixed; inset:0; background:#000b; z-index:50;" +
      "align-items:center; justify-content:center;");
    document.body.appendChild(overlay);

    const box = make("div",
      "background:#1c2b33; color:#fff; border-radius:16px; padding:24px 28px;" +
      "max-width:480px; width:92%; text-align:center; font-family:inherit;" +
      "max-height:85vh; overflow-y:auto;");
    overlay.appendChild(box);

    function close() { overlay.style.display = "none"; }
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    btn.onclick = () => { renderList(); overlay.style.display = "flex"; };

    // ---- Sürüm listesi ----
    function renderList() {
      box.innerHTML = "";
      box.appendChild(make("h2", "margin-bottom:6px;", "🔀 Sürümler"));
      box.appendChild(make("p", "color:#ffd54f; margin-bottom:14px;", "Şu an: v" + currentId));

      for (const v of VERSIONS) {
        const row = make("div",
          "background:#ffffff10; border-radius:12px; padding:10px 14px; margin-bottom:10px;" +
          "display:flex; align-items:center; gap:12px; text-align:left;");
        const info = make("div", "flex:1;");
        info.appendChild(make("b", "", "v" + v.id + " — " + v.name));
        info.appendChild(make("div", "color:#b0bec5; font-size:12px; margin-top:2px;", v.note));
        row.appendChild(info);

        if (v.id === currentId) {
          row.appendChild(make("span", "color:#69f0ae; font-weight:700; font-size:13px;", "✔ Mevcut"));
        } else if (v.locked) {
          const lock = make("button",
            "background:#37474f; color:#90a4ae; border:none; border-radius:8px;" +
            "padding:7px 14px; cursor:pointer; font-weight:600; font-family:inherit;",
            "🔒 Seç");
          lock.onclick = () => renderLocked(v);
          row.appendChild(lock);
        } else {
          const go = make("button",
            "background:#6a1b9a; color:#fff; border:none; border-radius:8px;" +
            "padding:7px 14px; cursor:pointer; font-weight:600; font-family:inherit;",
            "Seç");
          go.onclick = () => {
            if (num(currentId) < 4.0) renderHoldF(v);
            else renderConfirm(v);
          };
          row.appendChild(go);
        }
        box.appendChild(row);
      }

      const closeBtn = make("button",
        "background:#455a64; color:#fff; border:none; border-radius:10px;" +
        "padding:8px 22px; cursor:pointer; font-weight:600; font-family:inherit;",
        "Kapat");
      closeBtn.onclick = close;
      box.appendChild(closeBtn);
    }

    // ---- Kilitli sürüm: giriş yok, sebep göster ----
    function renderLocked(v) {
      box.innerHTML = "";
      box.appendChild(make("h2", "color:#ef5350; margin-bottom:12px;", "🚫 Giriş Yok"));
      box.appendChild(make("p", "margin-bottom:6px;", "v" + v.id + " — " + v.name));
      box.appendChild(make("p", "color:#ffd54f; margin-bottom:18px; font-weight:600; font-size:17px;", v.locked));
      const ok = make("button",
        "background:#455a64; color:#fff; border:none; border-radius:10px;" +
        "padding:9px 24px; cursor:pointer; font-weight:700; font-family:inherit;",
        "Tamam");
      ok.onclick = renderList;
      box.appendChild(ok);
    }

    // ---- 4.0 ve sonrası: basit onay (Git / Vazgeç) ----
    function renderConfirm(v) {
      box.innerHTML = "";
      box.appendChild(make("h2", "margin-bottom:12px;", "🔀 v" + v.id + " — " + v.name));
      box.appendChild(make("p", "color:#b0bec5; margin-bottom:18px;",
        "Bu sürüme geçilsin mi? Kaydın silinmez."));
      const row = make("div", "display:flex; gap:12px; justify-content:center;");
      const go = make("button",
        "background:#6a1b9a; color:#fff; border:none; border-radius:10px;" +
        "padding:10px 26px; font-size:16px; cursor:pointer; font-weight:700; font-family:inherit;",
        "Git");
      go.onclick = () => { location.href = v.file; };
      const cancel = make("button",
        "background:#455a64; color:#fff; border:none; border-radius:10px;" +
        "padding:10px 26px; font-size:16px; cursor:pointer; font-weight:700; font-family:inherit;",
        "Vazgeç");
      cancel.onclick = renderList;
      row.appendChild(go); row.appendChild(cancel);
      box.appendChild(row);
    }

    // ---- 4.0 öncesi: DİKKAT + F'ye basılı tut ----
    function renderHoldF(v) {
      box.innerHTML = "";
      box.appendChild(make("h2", "color:#ef5350; margin-bottom:12px;", "⚠️ DİKKAT"));
      box.appendChild(make("p", "color:#ffd54f; margin-bottom:8px; font-weight:600;",
        "4.0 versiyonu öncesinde versiyon değiştirme yoktur!"));
      box.appendChild(make("p", "color:#b0bec5; margin-bottom:16px;",
        "v" + v.id + " sürümüne gitmek için klavyeden \"F\" tuşuna basılı tut."));

      const barBg = make("div",
        "background:#00000066; border-radius:8px; height:22px; margin-bottom:16px; overflow:hidden;");
      const bar = make("div",
        "background:linear-gradient(90deg,#6a1b9a,#ab47bc); height:100%; width:0%; transition:width .1s;");
      barBg.appendChild(bar);
      box.appendChild(barBg);

      const hint = make("p", "color:#b0bec5; font-size:13px; margin-bottom:14px;",
        "F tuşuna basılı tut...");
      box.appendChild(hint);

      const cancel = make("button",
        "background:#455a64; color:#fff; border:none; border-radius:10px;" +
        "padding:9px 24px; cursor:pointer; font-weight:700; font-family:inherit;",
        "Vazgeç");
      box.appendChild(cancel);

      let progress = 0, holding = false, timer = null;
      function step() {
        if (holding) {
          progress = Math.min(progress + 2, 100);
          bar.style.width = progress + "%";
          if (progress >= 100) {
            cleanup();
            location.href = v.file;
            return;
          }
        }
        timer = setTimeout(step, 40);
      }
      function onDown(e) { if (e.key.toLowerCase() === "f") { holding = true; hint.textContent = "Doluyor..."; } }
      function onUp(e) { if (e.key.toLowerCase() === "f") { holding = false; hint.textContent = "Bıraktın! Devam etmek için yine basılı tut."; } }
      function cleanup() {
        clearTimeout(timer);
        window.removeEventListener("keydown", onDown);
        window.removeEventListener("keyup", onUp);
      }
      cancel.onclick = () => { cleanup(); renderList(); };
      window.addEventListener("keydown", onDown);
      window.addEventListener("keyup", onUp);
      step();
    }
  };
})();
