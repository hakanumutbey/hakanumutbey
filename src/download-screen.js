// İndir'e basınca açılan indirme ekranı: oyun adı, boyut, gerçek ilerleme çubuğu ve
// "zip'i aç, exe'ye çift tıkla" adımları. Akış okunamazsa doğrudan bağlantıya düşer.

let overlay = null;
let controller = null;

function formatMB(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Cloudflare Content-Length'i siliyor; sunucu boyutu X-Download-Size ile de gönderir.
function sizeOf(response) {
  return Number(response.headers.get("Content-Length")) || Number(response.headers.get("X-Download-Size")) || 0;
}

function fileNameOf(href) {
  return decodeURIComponent(new URL(href, location.href).pathname.split("/").pop() || "oyun.zip");
}

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "dl-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="dl-card" role="dialog" aria-modal="true" aria-labelledby="dl-title">
      <button class="dl-close" type="button" data-dl-close aria-label="Kapat">×</button>
      <div class="dl-head">
        <div class="dl-icon" aria-hidden="true"><span>↓</span></div>
        <div>
          <span class="dl-kicker">💻 Bilgisayar oyunu · Windows</span>
          <h2 id="dl-title" data-dl-title></h2>
          <span class="dl-size" data-dl-size>Boyut hesaplanıyor…</span>
        </div>
      </div>
      <div class="dl-progress" aria-hidden="true"><span data-dl-bar></span></div>
      <div class="dl-status" data-dl-status aria-live="polite">Hazır. Başlat'a bas.</div>
      <ol class="dl-steps">
        <li data-step="1"><b>İndir</b><span>Tek zip dosyası; oyunun her şeyi içinde.</span></li>
        <li data-step="2"><b>Zip'i aç</b><span>Sağ tık → Tümünü ayıkla.</span></li>
        <li data-step="3"><b>Oyna</b><span><em data-dl-exe></em> dosyasına çift tıkla. Kurulum yok.</span></li>
      </ol>
      <p class="dl-note">Windows "Bilgisayarınız korundu" derse <b>Ek bilgi → Yine de çalıştır</b>'a bas. Tarayıcıda değil, bilgisayarda çalışır.</p>
      <div class="dl-actions">
        <button class="button primary dl-start" type="button" data-dl-start><i class="download-icon" aria-hidden="true"></i>İndirmeyi başlat</button>
        <button class="button secondary" type="button" data-dl-close>Kapat</button>
      </div>
    </div>`;
  document.body.append(overlay);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-dl-close]")) closeScreen();
    if (event.target.closest("[data-dl-start]")) startDownload();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) closeScreen();
  });
  return overlay;
}

function setStep(step) {
  overlay.querySelectorAll(".dl-steps li").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("is-done", n < step);
    li.classList.toggle("is-current", n === step);
  });
}

function setProgress(ratio) {
  overlay.querySelector("[data-dl-bar]").style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
}

function setStatus(text) {
  overlay.querySelector("[data-dl-status]").textContent = text;
}

function openScreen(link) {
  ensureOverlay();
  const href = link.getAttribute("href");
  const title = link.dataset.downloadTitle || "Oyun";
  overlay.dataset.href = href;
  overlay.dataset.file = fileNameOf(href);
  overlay.querySelector("[data-dl-title]").textContent = title;
  overlay.querySelector("[data-dl-exe]").textContent = `${title}.exe`;
  overlay.querySelector("[data-dl-size]").textContent = "Boyut hesaplanıyor…";
  overlay.classList.remove("is-done", "is-busy");
  overlay.querySelector("[data-dl-start]").disabled = false;
  overlay.querySelector("[data-dl-start]").lastChild.textContent = "İndirmeyi başlat";
  setProgress(0);
  setStep(1);
  setStatus("Hazır. Başlat'a bas.");
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("is-open"));
  document.documentElement.classList.add("dl-lock");
  overlay.querySelector("[data-dl-start]").focus({ preventScroll: true });

  fetch(href, { method: "HEAD" })
    .then((response) => {
      const size = sizeOf(response);
      overlay.querySelector("[data-dl-size]").textContent = response.ok && size ? formatMB(size) : response.ok ? "Zip dosyası" : "Paket hazırlanıyor";
    })
    .catch(() => {
      overlay.querySelector("[data-dl-size]").textContent = "Zip dosyası";
    });
}

function closeScreen() {
  if (!overlay) return;
  controller?.abort();
  controller = null;
  overlay.classList.remove("is-open");
  document.documentElement.classList.remove("dl-lock");
  setTimeout(() => {
    if (!overlay.classList.contains("is-open")) overlay.hidden = true;
  }, 220);
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function directDownload(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

async function startDownload() {
  if (overlay.classList.contains("is-busy")) return;
  const href = overlay.dataset.href;
  const name = overlay.dataset.file;
  overlay.classList.add("is-busy");
  overlay.querySelector("[data-dl-start]").disabled = true;
  setStatus("İndiriliyor…");
  controller = new AbortController();
  try {
    const response = await fetch(href, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const total = sizeOf(response);
    if (!response.body || !total) {
      // İlerleme okunamıyor: tarayıcının kendi indirmesine bırak.
      setStatus("İndirme tarayıcıda başladı…");
      directDownload(href, name);
      finish();
      return;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    const started = performance.now();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      const seconds = Math.max(0.25, (performance.now() - started) / 1000);
      const speed = received / seconds;
      const left = Math.max(0, (total - received) / speed);
      setProgress(received / total);
      setStatus(`%${Math.floor((received / total) * 100)} · ${formatMB(received)} / ${formatMB(total)} · ${formatMB(speed)}/sn · ~${Math.ceil(left)} sn kaldı`);
    }
    saveBlob(new Blob(chunks, { type: "application/zip" }), name);
    finish();
  } catch (error) {
    if (error.name === "AbortError") return;
    setStatus("Bağlantı koptu; tarayıcının indirmesiyle deniyorum…");
    directDownload(href, name);
    finish();
  } finally {
    controller = null;
  }
}

function finish() {
  setProgress(1);
  setStep(2);
  overlay.classList.remove("is-busy");
  overlay.classList.add("is-done");
  setStatus("İndirme bitti! Şimdi zip'i aç ve exe'ye çift tıkla.");
  const start = overlay.querySelector("[data-dl-start]");
  start.disabled = false;
  start.lastChild.textContent = "Tekrar indir";
}

document.addEventListener(
  "click",
  (event) => {
    const link = event.target.closest?.("a[download][data-download-title]");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    openScreen(link);
  },
  true,
);
