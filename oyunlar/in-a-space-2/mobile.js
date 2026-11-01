// IN A SPACE 2 — mobil kontroller (Hakan: "roblox'taki gibi hareket eden tuşla gidelim, diğer tuşlar ekranda olsun,
// çok yer kaplamasın"). Sol yarı: dokunduğun yerde beliren joystick (sonuna kadar itince koşar). Sağ yarı: kaydırarak
// bakış. Sağ altta küçük tuş kümesi; R, V, Q ve E yalnızca işe yaradıklarında görünür. ?mobile ile masaüstünde denenir.
"use strict";
(function () {
  if (!TOUCH && !location.search.includes("mobile")) return;
  document.body.classList.add("touch");
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

  const css = document.createElement("style");
  css.textContent = `
    body.touch { touch-action: none; -webkit-user-select: none; }
    #touchLayer { position: fixed; inset: 0; z-index: 17; touch-action: none; }
    #stickBase { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%; z-index: 18; pointer-events: none;
      background: rgba(255,255,255,0.08); border: 2px solid rgba(233,228,216,0.35); display: none; }
    #stickKnob { position: absolute; left: 50%; top: 50%; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%;
      background: rgba(233,228,216,0.55); box-shadow: 0 2px 8px rgba(0,0,0,0.5); }
    #stickHint { position: fixed; left: 12%; bottom: 16%; z-index: 18; pointer-events: none; width: 84px; height: 84px; margin: -42px 0 0 -42px;
      border-radius: 50%; border: 2px dashed rgba(233,228,216,0.25); }
    #pad { position: fixed; right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); width: 190px; height: 190px; z-index: 22; pointer-events: none; }
    #pad .tb { position: absolute; width: 50px; height: 50px; border-radius: 50%; pointer-events: auto; touch-action: none;
      background: rgba(8,10,13,0.55); border: 1.5px solid rgba(233,228,216,0.45); color: var(--ink);
      font-family: var(--cond); font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; letter-spacing: 0.5px; }
    #pad .tb.on, #pad .tb:active { background: rgba(255,180,60,0.4); border-color: var(--amber); }
    #pad .tb.hide { display: none; }
    #tbJump { right: 0; bottom: 0; width: 66px !important; height: 66px !important; font-size: 14px !important; }
    #tbHit { right: 74px; bottom: 6px; width: 58px !important; height: 58px !important; }
    #tbAim { right: 4px; bottom: 76px; }
    #tbDodge { right: 136px; bottom: 6px; }
    #tbRecall { right: 64px; bottom: 74px; }
    #tbOver { right: 120px; bottom: 64px; color: var(--amber) !important; border-color: var(--amber) !important; }
    #tbBip { right: 14px; bottom: 134px; width: 42px !important; height: 42px !important; color: var(--ice) !important; }
    #tbLight { right: 64px; bottom: 134px; width: 42px !important; height: 42px !important; }
    #tbGlide { right: 116px; bottom: 120px; color: var(--ice) !important; }
    #tbSeed { right: 118px; bottom: 176px; width: 44px !important; height: 44px !important; color: #6fe37a !important; border-color: #6fe37a !important; }
    #tbBag { position: fixed; top: max(10px, env(safe-area-inset-top)); right: calc(max(10px, env(safe-area-inset-right)) + 46px); z-index: 22; height: 38px;
      padding: 0 12px; border-radius: 19px; background: rgba(8,10,13,0.55); border: 1.5px solid rgba(233,228,216,0.45); color: var(--ink);
      font-family: var(--cond); font-weight: 700; font-size: 13px; letter-spacing: 1px; touch-action: none; }
    body.touch.ctlHide #tbBag { display: none; }
    #tbUse { position: fixed; right: max(14px, env(safe-area-inset-right)); bottom: 214px; z-index: 22; display: none; align-items: center; gap: 8px;
      background: rgba(8,10,13,0.75); border: 1.5px solid var(--amber); border-radius: 26px; padding: 6px 14px 6px 6px; color: var(--ink);
      font-family: var(--sans); font-weight: 600; font-size: 14px; touch-action: none; max-width: 60vw; }
    #tbUse b { width: 34px; height: 34px; border-radius: 50%; background: var(--amber); color: #000; display: inline-flex; align-items: center; justify-content: center; font-family: var(--cond); }
    #tbPause { position: fixed; top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); z-index: 22; width: 38px; height: 38px;
      border-radius: 50%; background: rgba(8,10,13,0.55); border: 1.5px solid rgba(233,228,216,0.45); color: var(--ink); font-size: 14px; touch-action: none; }
    body.touch.ctlHide #pad, body.touch.ctlHide #tbUse, body.touch.ctlHide #stickHint, body.touch.ctlHide #touchLayer { display: none !important; }
    body.touch.chase #pad .tb:not(#tbHit) { display: none; }
    /* göstergeler joystick ve tuşlarla çakışmasın */
    body.touch #status { bottom: auto; top: 86px; left: 14px; transform: scale(0.8); transform-origin: left top; }
    body.touch #res { bottom: auto; top: 56px; right: 14px; font-size: 18px; }
    /* sitenin sol üstteki H ve tam ekran tuşlarına yer bırak */
    body.touch #objective { left: 110px; top: 12px; max-width: 40vw; }
    body.touch #objText { font-size: 13px; }
    body.touch #compass { top: 54px; width: 46vw; }
    body.touch #compassNeedle { top: 84px; }
    body.touch #prompt, body.touch #dot { display: none !important; }
    body.touch #holdBar { bottom: 200px; left: auto; right: 20px; transform: none; width: 160px; }
    body.touch #tutorial { top: auto; bottom: 46%; left: 14px; width: 240px; font-size: 13px; }
    body.touch #subtitle { font-size: 16px; bottom: 30%; }
    body.touch #choices { min-width: 0; width: 86vw; bottom: 26%; }
    body.touch #choices button { font-size: 15px; padding: 9px 14px; }
    body.touch #area .t { font-size: 30px; letter-spacing: 5px; }
    body.touch #chapterCard .t { font-size: 38px; letter-spacing: 6px; }
    body.touch .screen h1 { font-size: 40px; letter-spacing: 6px; }
    body.touch .screen .menu { margin-top: 20px; }
    body.touch #acquired { top: 120px; width: 200px; right: 14px; }
    body.touch #wheels { left: calc(50% + 50px); }
  `;
  document.head.appendChild(css);

  const el = (tag, id, html, parent) => { const e = document.createElement(tag); e.id = id; if (html) e.innerHTML = html; (parent || document.body).appendChild(e); return e; };
  const layer = el("div", "touchLayer");
  const base = el("div", "stickBase", '<div id="stickKnob"></div>');
  el("div", "stickHint");
  const pad = el("div", "pad");
  const btn = (id, text) => { const b = el("button", id, text, pad); b.className = "tb"; b.type = "button"; return b; };
  const bJump = btn("tbJump", "ZIPLA"), bHit = btn("tbHit", "VUR"), bAim = btn("tbAim", "NİŞAN"), bDodge = btn("tbDodge", "KAÇ"),
    bRecall = btn("tbRecall", "ÇAĞIR"), bOver = btn("tbOver", "GÜÇ"), bBip = btn("tbBip", "BİP"), bLight = btn("tbLight", "IŞIK"),
    bGlide = btn("tbGlide", "SÜZÜL"), bSeed = btn("tbSeed", "ŞİFA");
  const bBag = el("button", "tbBag", "ÇANTA");
  const bUse = el("button", "tbUse", "<b>E</b><span></span>");
  const bPause = el("button", "tbPause", "❚❚");
  const knob = document.getElementById("stickKnob");
  document.querySelector("#titleScreen .note").innerHTML = "Sol yarı: dokun ve sürükle — yürü (sonuna kadar itersen koşarsın)<br>Sağ yarı: kaydır — etrafa bak · VUR, ZIPLA, SÜZÜL (basılı tut), NİŞAN (açıkken VUR fırlatır), KAÇ<br>ÇAĞIR, GÜÇ, ŞİFA ve E gerektiğinde çıkar · ÇANTA sağ üstte";

  // ---- joystick ve bakış (sol yarı joystick, sağ yarı bakış; ikisi aynı anda çalışır)
  const R = 50;
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
  G.stick = { x: 0, y: 0 };
  const setStick = (x, y) => {
    G.stick.x = x; G.stick.y = y;
    knob.style.transform = `translate(${x * R}px, ${y * R}px)`;
    // dijital tuşlar da (kovalamaca bölümü WASD okur)
    keys.KeyW = y < -0.35; keys.KeyS = y > 0.35; keys.KeyA = x < -0.35; keys.KeyD = x > 0.35;
  };
  layer.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (e.clientX < innerWidth * 0.45 && stickId === null) {
      stickId = e.pointerId; sx = e.clientX; sy = e.clientY;
      base.style.left = sx + "px"; base.style.top = sy + "px"; base.style.display = "block";
      setStick(0, 0);
    } else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; }
    try { layer.setPointerCapture(e.pointerId); } catch (_) { /* eski tarayıcı */ }
  });
  layer.addEventListener("pointermove", e => {
    if (e.pointerId === stickId) {
      let dx = (e.clientX - sx) / R, dy = (e.clientY - sy) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      setStick(dx, dy);
    } else if (e.pointerId === lookId) {
      if (G.running && !G.uiOpen) lookDelta((e.clientX - lx) * 1.7, (e.clientY - ly) * 1.7);
      lx = e.clientX; ly = e.clientY;
    }
  });
  const end = e => {
    if (e.pointerId === stickId) { stickId = null; base.style.display = "none"; setStick(0, 0); }
    if (e.pointerId === lookId) lookId = null;
  };
  layer.addEventListener("pointerup", end);
  layer.addEventListener("pointercancel", end);

  // ---- tuşlar
  const press = (b, down, up) => {
    b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); if (G.running && !G.uiOpen && !player.dead) down(); });
    if (up) for (const t of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(t, e => { e.preventDefault(); up(); });
  };
  press(bJump, () => { if (!G.cutscene) spaceTap = true; });
  press(bHit, () => { mouse.left = true; if (!G.cutscene) attackPressed(); }, () => { mouse.left = false; });
  press(bAim, () => { mouse.right = !mouse.right; });
  press(bDodge, () => startDodge());
  press(bRecall, () => recallHammer());
  press(bOver, () => activateOvercharge());
  press(bBip, () => bipCommand());
  press(bLight, () => toggleFlashlight());
  // SÜZÜL basılı kaldıkça G tuşu basılı sayılır: yerdeyken zıplar, havada süzülür
  press(bGlide, () => { keys.KeyG = true; }, () => { keys.KeyG = false; });
  press(bSeed, () => useSeed());
  bBag.addEventListener("pointerdown", e => { e.preventDefault(); if (window.openInventory) openInventory(); });
  press(bUse, () => { interactRequested = true; keys.KeyE = true; }, () => { keys.KeyE = false; });
  bPause.addEventListener("pointerdown", e => { e.preventDefault(); if (G.running && !G.uiOpen && !player.dead) openUI("pauseMenu"); });

  // ---- her karede: hangi tuşlar görünsün
  const show = (b, on) => { if (b._on !== on) { b._on = on; b.classList.toggle("hide", !on); } };
  const useLabel = bUse.querySelector("span");
  visuals.push(() => {
    const hidden = !G.running || G.uiOpen || player.dead || (G.cutscene && G.chapter !== 19) || G.ended;
    document.body.classList.toggle("ctlHide", !!hidden);
    document.body.classList.toggle("chase", G.chapter === 19 && G.zone && G.zone.name === "chase");
    if (hidden) { if (stickId !== null) { stickId = null; base.style.display = "none"; setStick(0, 0); } return; }
    bPause.style.display = "block";
    show(bRecall, player.hammer.state !== "hand");
    show(bOver, player.over >= 100 && player.overT <= 0);
    show(bBip, !!G.flags.bip);
    show(bAim, player.hasHammer);
    show(bGlide, G.flags.jetpack !== false);
    show(bSeed, (G.flags.seeds || 0) > 0 && player.health < player.maxHealth * 0.7);
    bAim.classList.toggle("on", !!mouse.right);
    const pr = $("prompt");
    const visible = pr.style.display === "flex";
    bUse.style.display = visible ? "flex" : "none";
    if (visible) { const t = pr.textContent.replace(/^E/, ""); if (useLabel.textContent !== t) useLabel.textContent = t; }
  });
  visuals.push(() => { if (!G.running || G.uiOpen) bPause.style.display = "none"; });
})();
