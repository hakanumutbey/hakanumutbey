import "./styles.css";

const games = [
  {
    title: "Annenden Kaç",
    path: "/oyunlar/annenden-kac/",
    type: "3D Kaçış",
    status: "Oynanabilir",
    description: "Anahtarları topla, yakalanmadan kapıya ulaş ve seviyeleri aç.",
    accent: "mint",
  },
  {
    title: "Bardak",
    path: "/oyunlar/bardak/",
    type: "3D Fizik",
    status: "Oynanabilir",
    description: "Bardağı kontrol et, hedefleri tamamla ve stüdyo enerjisini göster.",
    accent: "amber",
    image: "/oyunlar/bardak/assets/hakorocks_studios.png",
  },
  {
    title: "Eşsiz Zindan",
    path: "/oyunlar/essiz-zindan/",
    type: "Zindan Aksiyonu",
    status: "Oynanabilir",
    description: "Odaları temizle, gücünü büyüt ve zindanın sonuna kadar ilerle.",
    accent: "violet",
  },
  {
    title: "Skeleton Wars",
    path: "/oyunlar/skeleton-wars/",
    type: "Macera Savaşı",
    status: "Oynanabilir",
    description: "İskelet ordusuyla savaş, hikaye videosunu izle ve bölümleri geç.",
    accent: "bone",
  },
  {
    title: "Vale",
    path: "/oyunlar/vale/",
    type: "3D Simülasyon",
    status: "Oynanabilir",
    description: "Arabaları teslim al, park et, para kazan ve vale işini büyüt.",
    accent: "sky",
  },
  {
    title: "Robot Avcısı",
    path: "/oyunlar/robot-avcisi/",
    type: "Laboratuvar FPS",
    status: "Oynanabilir",
    description: "Robotları avla, hurdalarla silah üret ve laboratuvardan kaç.",
    accent: "lime",
  },
];

const projects = [
  {
    title: "Oyun Motoru Denemeleri",
    description: "Babylon.js, canvas ve fizik denemeleri için yeni proje alanı.",
    label: "Hazır altyapı",
  },
  {
    title: "Hakorocks Launcher",
    description: "Gelecekte tüm oyunları puan, sürüm ve kayıtlarla bağlayacak merkez.",
    label: "Sıradaki fikir",
  },
  {
    title: "Yeni Web Projeleri",
    description: "Projeler klasörüne eklenen her çalışma sitede vitrine taşınabilir.",
    label: "Geliştirme alanı",
  },
];

document.querySelector("#app").innerHTML = `
  <header class="site-header" data-header>
    <a class="brand" href="#top" aria-label="Hakorocks Studio ana sayfa">
      <span class="brand-mark">H</span>
      <span>Hakorocks Studio</span>
    </a>
    <nav class="nav" aria-label="Ana menü">
      <a href="#hakkimda">Hakkımda</a>
      <a href="#oyunlar">Oyunlar</a>
      <a href="#projeler">Projeler</a>
      <a href="https://github.com/hakanumutbey" rel="noreferrer">GitHub</a>
    </nav>
  </header>

  <main id="top">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-media" aria-hidden="true"></div>
      <div class="hero-content">
        <p class="eyebrow">Tarayıcıda oynanan oyunlar ve yaratıcı kod</p>
        <h1 id="hero-title">Hakorocks Studio</h1>
        <p class="hero-copy">
          Ben Hakan Umut Akadal. 9 yaşındayım; oyunlar, 3D dünyalar ve web projeleri geliştiriyorum.
          Burası kendi oyun stüdyomun ana üssü.
        </p>
        <div class="hero-actions">
          <a class="button primary" href="#oyunlar">Oyunları aç</a>
          <a class="button secondary" href="https://hakorocks.akadal.tr">hakorocks.akadal.tr</a>
        </div>
      </div>
      <aside class="hero-panel" aria-label="Stüdyo özeti">
        <strong>6 oyun</strong>
        <span>Tek domain altında yayında</span>
      </aside>
    </section>

    <section class="section intro-section" id="hakkimda" aria-labelledby="about-title">
      <div class="section-heading">
        <p class="eyebrow">Hakan Umut Akadal</p>
        <h2 id="about-title">Kendi oyun evrenimi kuruyorum.</h2>
      </div>
      <div class="about-grid">
        <article class="about-copy">
          <p>
            Kod yazmayı, oyun fikirleri üretmeyi ve yaptığım şeyleri arkadaşlarımla paylaşmayı seviyorum.
            Bu site benim portfolyom, oyun vitrinim ve yeni projelerimi büyüteceğim yer.
          </p>
          <p>
            Repoya her yeni oyun veya proje eklendiğinde ana sayfa güncellenebilir; main branch'e gelen
            değişiklikler Coolify üzerinden otomatik yayına çıkacak şekilde hazırlandı.
          </p>
        </article>
        <div class="stats-grid" aria-label="Stüdyo bilgileri">
          <div><strong>9</strong><span>yaşında geliştirici</span></div>
          <div><strong>3D</strong><span>Babylon.js oyunları</span></div>
          <div><strong>Main</strong><span>push sonrası yayın</span></div>
          <div><strong>Docker</strong><span>Coolify uyumlu</span></div>
        </div>
      </div>
    </section>

    <section class="section games-section" id="oyunlar" aria-labelledby="games-title">
      <div class="section-heading">
        <p class="eyebrow">Oyun vitrini</p>
        <h2 id="games-title">Tarayıcıdan hemen oynanabilen oyunlar.</h2>
      </div>
      <div class="game-grid">
        ${games.map(renderGameCard).join("")}
      </div>
    </section>

    <section class="section projects-section" id="projeler" aria-labelledby="projects-title">
      <div class="section-heading">
        <p class="eyebrow">Gelecek projeler</p>
        <h2 id="projects-title">Bu repo yeni fikirler için hazır.</h2>
      </div>
      <div class="project-grid">
        ${projects.map(renderProjectCard).join("")}
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div>
      <strong>Hakorocks Studio</strong>
      <span>Hakan Umut Akadal tarafından geliştiriliyor.</span>
    </div>
    <a href="#top">Yukarı çık</a>
  </footer>
`;

function renderGameCard(game, index) {
  const media = game.image
    ? `<img src="${game.image}" alt="${game.title} oyun görseli" loading="lazy" />`
    : `<div class="game-poster poster-${game.accent}" aria-hidden="true"><span>${String(index + 1).padStart(2, "0")}</span></div>`;

  return `
    <article class="game-card">
      <a class="game-card-link" href="${game.path}" aria-label="${game.title} oyununu aç">
        <div class="game-media">${media}</div>
        <div class="game-body">
          <div class="game-meta">
            <span>${game.type}</span>
            <span>${game.status}</span>
          </div>
          <h3>${game.title}</h3>
          <p>${game.description}</p>
          <span class="play-link">Oyunu başlat</span>
        </div>
      </a>
    </article>
  `;
}

function renderProjectCard(project) {
  return `
    <article class="project-card">
      <span>${project.label}</span>
      <h3>${project.title}</h3>
      <p>${project.description}</p>
    </article>
  `;
}

const header = document.querySelector("[data-header]");
window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
});
