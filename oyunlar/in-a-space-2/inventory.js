// IN A SPACE 2 — envanter (Hakan: "oyuna envanter ekle"). I / Tab (telefonda ÇANTA) açar.
// Sekmeler: Eşyalar (görev eşyaları, şifa tohumu, hurda; seçince açıklama), Balyoz (yükseltmeler), Mürettebat,
// Günlük (bölüm, görev ve verdiğin kararlar). Görünüm oyunun God of War referanslı menü diliyle aynı.
"use strict";
(function () {
  const css = document.createElement("style");
  css.textContent = `
    #invScreen { justify-content: flex-start; padding-top: 5vh; }
    #invScreen .tabs { display: flex; gap: 6px; margin-top: 14px; }
    #invScreen .tabs button { font-size: 16px; padding: 8px 18px; border: 1px solid var(--line); }
    #invScreen .tabs button.on { color: var(--amber); border-color: var(--amber); background: rgba(255,180,60,0.12); }
    #invBody { display: flex; gap: 18px; margin-top: 18px; width: min(920px, 94vw); max-height: 66vh; }
    #invGrid { flex: 1.4; display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; overflow: auto; align-content: start; }
    .slot { position: relative; height: 92px; background: rgba(10,14,18,0.85); border: 1px solid var(--line); cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 6px; text-align: center; }
    .slot:hover, .slot.sel { border-color: var(--amber); box-shadow: inset 0 0 14px rgba(255,180,60,0.18); }
    .slot .ic { width: 30px; height: 30px; transform: rotate(45deg); border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; }
    .slot .ic b { transform: rotate(-45deg); font-family: var(--cond); font-size: 13px; }
    .slot .nm { font-size: 11px; line-height: 1.2; color: var(--ink); }
    .slot .ct { position: absolute; right: 6px; top: 4px; font-family: var(--cond); font-size: 14px; color: var(--amber); }
    .slot.empty { opacity: 0.25; cursor: default; }
    #invInfo { flex: 1; background: var(--panel); border: 1px solid var(--line); padding: 16px 18px; overflow: auto; }
    #invInfo h3 { font-family: var(--serif); font-size: 24px; letter-spacing: 2px; font-weight: 500; }
    #invInfo .k { font-family: var(--cond); letter-spacing: 3px; font-size: 12px; color: var(--amber); margin-top: 2px; }
    #invInfo p { font-size: 14px; line-height: 1.55; color: var(--dim); margin-top: 10px; }
    #invInfo button { margin-top: 14px; font-size: 16px; }
    .invList { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: auto; }
    .invRow { display: flex; justify-content: space-between; gap: 14px; background: rgba(10,14,18,0.85); border: 1px solid var(--line); padding: 10px 14px; font-size: 15px; }
    .invRow b { font-family: var(--cond); color: var(--amber); letter-spacing: 1px; white-space: nowrap; }
    .invRow span { color: var(--dim); }
    .pips { letter-spacing: 3px; color: var(--amber); font-family: var(--cond); }
    body.touch #invBody { flex-direction: column; max-height: 70vh; }
    body.touch #invGrid { grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); }
    body.touch .slot { height: 78px; }
  `;
  document.head.appendChild(css);
  const scr = document.createElement("div");
  scr.className = "screen"; scr.id = "invScreen";
  scr.innerHTML = `<h2>ÇANTA</h2><div class="tabs" id="invTabs"></div><div id="invBody"></div>
    <div class="menu" style="margin-top:14px;min-width:0"><button id="btnInvClose">KAPAT (I)</button></div>`;
  document.body.insertBefore(scr, $("credits"));
  $("btnInvClose").onclick = () => closeUI();

  const f = () => G.flags;
  // [ad, ikon harfi, renk, sahip mi?, adet?, açıklama, kullan?]
  const ITEMS = () => [
    ["Şifa tohumu", "Ş", "#6fe37a", () => (f().seeds || 0) > 0, () => f().seeds || 0, `Lumi'lerin şifa tohumu. Canın doluyken topladıkların burada birikir (en çok ${SEED_MAX}). Kullanınca 45 can verir. Kısayol: H.`, () => useSeed()],
    ["Hurda", "◆", "#ffb43c", () => true, () => G.scrap, "Vorak'lardan düşen metal. Tezgâhta balyozunu, zırhını ve BİP'i yükseltmekte kullanılır."],
    ["Manyetik Balyoz", "B", "#7fd8ff", () => player.hasHammer, null, "Bora'nın gizli projesi. Vur, fırlat (sağ tık + sol tık), geri çağır (R). Mıknatısı takıldığı düşmanı dondurur."],
    ["ATLAS motoru", "M", "#e9e4d8", () => f().engine, null, "Demir Zirve'nin tepesinden çekici ışınla kampa taşındı."],
    ["ATLAS kanadı", "K", "#e9e4d8", () => f().wing, null, "Rüzgâr Kanyonu'ndaki kayalık adadan kurtarıldı."],
    ["İletişim modülü", "İ", "#e9e4d8", () => f().comm, null, "Işıltı Mağarası'ndan alındı. Vorak frekanslarını da dinleyebiliyor."],
    ["Hiper sürücü", "H", "#ff3a8a", () => f().drive, null, "Kara Kale'den sökülen Vorak sürücüsü. ATLAS'ın kırık sıçrama çekirdeğinin yerine takıldı."],
    ["Vorak geçiş kartı", "G", "#ff7a3a", () => f().keycard, null, "Bekçi Grax'tan düştü. Kara Kale'nin iç kapılarını açar."],
    ["Vorak kimlik kartı", "V", "#ff5a4a", () => f().c_ksha === "kill", null, "Ksha'nın kartı. Onu bıraksaydın kapıyı kendisi açacaktı."],
    ["Lumi kalbi", "L", "#6ff0d2", () => f().milaGift, null, f().milaUsed ? "Mila'nın hediyesi. Işığını bir kez verdi ve seni ölümden kaldırdı." : "Mila'nın hediyesi. Son savaşta ölümcül bir darbede seni bir kez ayağa kaldırır."],
    ["Selin'in serumu", "S", "#ff9fc4", () => f().selin, null, "Ayaz otundan yapıldı. Azami canın kalıcı olarak 20 arttı."],
    ["Grax'ın kalp taşı", "T", "#ff9a2a", () => f().grax, null, "Bekçi Grax'ın göğsündeki taş. Azami canın kalıcı olarak 20 arttı."],
    ["Lumi fenerleri", "F", "#ffd36a", () => lanternCount() > 0, () => lanternCount() + "/12", "Tahra'nın dört bir yanına saçılmış eski Lumi fenerleri. Her biri 25 hurda; on ikisi birden dayanıklılığını artırır."]
  ];
  let tab = "items", sel = 0;
  const TABS = [["items", "EŞYALAR"], ["hammer", "BALYOZ"], ["crew", "MÜRETTEBAT"], ["log", "GÜNLÜK"]];

  window.openInventory = function () {
    if (!G.running || G.uiOpen || player.dead || G.cutscene) return;
    openUI("invScreen");
    draw();
  };
  function draw() {
    const tabs = $("invTabs");
    tabs.innerHTML = "";
    for (const [id, name] of TABS) {
      const b = document.createElement("button");
      b.textContent = name; b.className = id === tab ? "on" : "";
      b.onclick = () => { tab = id; sel = 0; draw(); };
      tabs.appendChild(b);
    }
    const body = $("invBody");
    body.innerHTML = "";
    if (tab === "items") drawItems(body);
    else if (tab === "hammer") drawRows(body, hammerRows());
    else if (tab === "crew") drawRows(body, crewRows());
    else drawRows(body, logRows());
  }
  function drawItems(body) {
    const grid = document.createElement("div"); grid.id = "invGrid";
    const info = document.createElement("div"); info.id = "invInfo";
    const items = ITEMS().filter(it => it[3]());
    if (sel >= items.length) sel = 0;
    items.forEach((it, i) => {
      const s = document.createElement("div");
      s.className = "slot" + (i === sel ? " sel" : "");
      const cnt = it[4] ? it[4]() : "";
      s.innerHTML = `<div class="ic" style="color:${it[2]}"><b>${it[1]}</b></div><div class="nm"></div>${cnt !== "" ? `<div class="ct">${cnt}</div>` : ""}`;
      s.querySelector(".nm").textContent = it[0];
      s.onclick = () => { sel = i; draw(); };
      grid.appendChild(s);
    });
    for (let i = items.length; i < 15; i++) { const s = document.createElement("div"); s.className = "slot empty"; grid.appendChild(s); }
    const it = items[sel];
    if (it) {
      info.innerHTML = `<h3></h3><div class="k">${it[6] ? "KULLANILABİLİR" : (it[4] ? "MALZEME" : "ÖNEMLİ EŞYA")}</div><p></p>`;
      info.querySelector("h3").textContent = it[0];
      info.querySelector("p").textContent = it[5];
      if (it[6]) {
        const b = document.createElement("button"); b.textContent = "KULLAN";
        b.onclick = () => { it[6](); draw(); };
        info.appendChild(b);
      }
    }
    body.append(grid, info);
  }
  function drawRows(body, rows) {
    const list = document.createElement("div"); list.className = "invList";
    for (const [a, b, c] of rows) {
      const r = document.createElement("div"); r.className = "invRow";
      const left = document.createElement("div");
      const t = document.createElement("div"); t.textContent = a; left.appendChild(t);
      if (c) { const s = document.createElement("span"); s.textContent = c; s.style.fontSize = "13px"; left.appendChild(s); }
      const right = document.createElement("b"); right.textContent = b;
      r.append(left, right); list.appendChild(r);
    }
    body.appendChild(list);
  }
  const pips = (n, max) => "◆".repeat(n) + "◇".repeat(Math.max(0, max - n));
  function hammerRows() {
    const r = UPGRADES.map(u => [u.name, pips(G.up[u.id], u.cost.length), u.desc]);
    r.push(["Can", `${Math.ceil(player.health)} / ${player.maxHealth}`, "Selin'in serumu, Grax'ın kalp taşı ve Giysi Zırhı azami canı artırır."]);
    r.push(["Yükseltme", "TEZGÂH", "Kamptaki ve ATLAS'ın kargosundaki tezgâhta hurdayla yükseltilir."]);
    return r;
  }
  function crewRows() {
    const b = k => { const v = f()["bond_" + k] || 0; return v >= 2 ? "Bağ: güçlü" : v > 0 ? "Bağ: iyi" : v < 0 ? "Bağ: gergin" : "Bağ: normal"; };
    const st = (k, where) => f()[k] ? "KURTARILDI" : (G.chapter >= 9 ? "KAYIP · " + where : "—");
    return [
      ["Kerem — pilot", st("kerem", "Kızıl Kumlar"), b("kerem")],
      ["Selin — doktor", st("selin", "Ayaz Ovası"), b("selin")],
      ["Bora — mühendis", st("bora", "Fener Ormanı"), b("bora")],
      ["BİP — yardımcı robot", f().bip ? "YANINDA" : "—", f().bip ? `Lazer seviyesi ${G.up.bip}. Q ile ateş emri.` : ""],
      ["Ksha — Vorak kaçağı", f().c_ksha === "spare" ? "DOST" : f().c_ksha === "kill" ? "ÖLDÜ" : "—", ""],
      ["Mila — Lumi yavrusu", f().c_mila === "gentle" ? "SANA GÜVENİYOR" : f().c_mila === "wary" ? "ÇEKİNGEN" : "—", ""]
    ];
  }
  function logRows() {
    const c = f(), r = [["Bölüm", `${G.chapter}`, CHAPTER_NAME()], ["Görev", "", $("objText").innerText || "—"]];
    const D = [
      ["c_hail", "Vorak gemisine", { peace: "selam verdin", shields: "kalkanları açtırdın" }],
      ["c_ksha", "Ksha'yı", { spare: "bağışladın", kill: "öldürdün" }],
      ["c_mila", "Mila'ya", { gentle: "nazik davrandın", wary: "temkinli davrandın" }],
      ["c_village", "Lumi köyüne", { help: "yardım ettin", hurry: "yardım etmedin" }],
      ["c_partner", "Kaleye yanında", { kerem: "Kerem geldi", selin: "Selin geldi", bora: "Bora geldi" }],
      ["c_rescue", "Kara Kale'de önce", { prisoners: "esirleri kurtardın", drive: "sürücüyü aldın" }],
      ["c_vorakh", "Vorakh'ı", { spare: "bağışladın", end: "yok ettin" }]
    ];
    for (const [k, a, m] of D) if (c[k]) r.push(["Karar", m[c[k]] || c[k], a + " " + (m[c[k]] || "")]);
    r.push(["İstatistik", `${G.stats.kills} Vorak`, `${G.stats.deaths} kez düştün`]);
    return r;
  }
  // kullan tuşuyla değişen sayılar açık pencerede de güncellensin
  visuals.push(() => { if (G.uiOpen === "invScreen" && tab === "items" && (G.flags.seeds || 0) !== (window._invSeeds || 0)) { window._invSeeds = G.flags.seeds || 0; draw(); } });
})();
