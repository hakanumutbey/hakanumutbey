// Site düzeni: okuma ilerleme çubuğu, gruplu "Bölümler" menüsü, aktif menü vurgusu,
// yukarı çık butonu ve oyun kartlarında fareyi izleyen ışık. Hiçbir içeriği gizlemez.

const SECTION_GROUPS = [
  ["Oyna", [["oyunlar", "Oyun vitrini"], ["launcher", "Launcher"], ["yaris-sezon", "Sezon tablosu"], ["mini-oyun", "Mini oyun"], ["birlesim", "Günün birleşimi"], ["turnuvalar", "Turnuvalar"]]],
  ["Topluluk", [["pulse", "Studio Pulse"], ["canli", "Canlı borsa"], ["topluluk", "Topluluk"], ["rozetler", "Rozetler"], ["fotolar", "Fotoğraflar"], ["defter", "Ziyaretçi defteri"], ["sikayet", "Şikâyet"]]],
  ["Stüdyo", [["haberler", "Haberler"], ["studio", "Geliştirici günlüğü"], ["fragman", "Fragman"], ["yakinda", "Yakında"], ["projeler", "Projeler"], ["mobil", "Mobil"]]],
  ["Ben", [["hakkimda", "Hakkımda"], ["ozgecmis", "Özgeçmiş"], ["hesap", "Hesap"], ["bot", "HakoBot"], ["milyon-h", "Milyon H"]]],
];

function buildSectionsMenu(header) {
  if (header.querySelector(".pz-sections")) return;
  const groups = SECTION_GROUPS.map(([title, items]) => {
    const links = items
      .filter(([id]) => document.getElementById(id))
      .map(([id, label]) => `<a href="#${id}" data-pz-link="${id}">${label}</a>`)
      .join("");
    return links ? `<div class="pz-sections-group"><strong>${title}</strong>${links}</div>` : "";
  }).join("");
  if (!groups) return;
  const wrap = document.createElement("div");
  wrap.className = "pz-sections";
  wrap.innerHTML = `
    <button class="pz-sections-toggle" type="button" aria-expanded="false" aria-haspopup="true">Bölümler <i aria-hidden="true"></i></button>
    <div class="pz-sections-panel" role="menu">${groups}</div>`;
  const sound = header.querySelector(".nav-sound");
  header.insertBefore(wrap, sound || null);

  const toggle = wrap.querySelector(".pz-sections-toggle");
  const setOpen = (open) => {
    wrap.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  };
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!wrap.classList.contains("is-open"));
  });
  wrap.querySelector(".pz-sections-panel").addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

function watchActiveSection() {
  if (!("IntersectionObserver" in window)) return;
  const ids = SECTION_GROUPS.flatMap(([, items]) => items.map(([id]) => id));
  const targets = ids.map((id) => document.getElementById(id)).filter(Boolean);
  const visible = new Map();
  const mark = () => {
    let best = null;
    let bestTop = Infinity;
    visible.forEach((top, id) => {
      if (top < bestTop) {
        bestTop = top;
        best = id;
      }
    });
    document.querySelectorAll(".nav a, [data-pz-link]").forEach((link) => {
      const id = link.getAttribute("href")?.slice(1) || link.dataset.pzLink;
      link.classList.toggle("is-active", Boolean(best) && id === best);
    });
  };
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.set(entry.target.id, Math.abs(entry.boundingClientRect.top));
        else visible.delete(entry.target.id);
      });
      mark();
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );
  targets.forEach((target) => observer.observe(target));
}

function addScrollChrome() {
  const bar = document.createElement("div");
  bar.className = "pz-progress";
  bar.setAttribute("aria-hidden", "true");
  const top = document.createElement("button");
  top.className = "pz-top";
  top.type = "button";
  top.setAttribute("aria-label", "Yukarı çık");
  top.textContent = "↑";
  top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.append(bar, top);

  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.setProperty("--pz-progress", ratio.toFixed(4));
    top.classList.toggle("is-visible", window.scrollY > 900);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

function addCardGlow() {
  if (window.matchMedia?.("(pointer: coarse)").matches) return;
  document.addEventListener(
    "pointermove",
    (event) => {
      const card = event.target.closest?.(".game-card-inner, .launcher-game-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    },
    { passive: true },
  );
}

function initPolish() {
  try {
    const header = document.querySelector("[data-header]");
    if (header) buildSectionsMenu(header);
    addScrollChrome();
    watchActiveSection();
    addCardGlow();
  } catch (error) {
    console.warn("polish:", error);
  }
}

if (document.readyState === "complete") setTimeout(initPolish, 0);
else window.addEventListener("load", () => setTimeout(initPolish, 0), { once: true });
