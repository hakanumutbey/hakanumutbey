import "./styles.css";

const games = [
  {
    slug: "annenden-kac",
    title: "Annenden Kaç",
    path: "/oyunlar/annenden-kac/",
    type: "3D Kaçış",
    status: "Oynanabilir",
    description: "Anahtarları topla, yakalanmadan kapıya ulaş ve seviyeleri aç.",
    longDescription: "Ev sessiz gibi görünüyor ama her köşe riskli. Anahtarları topla, zamanı iyi kullan ve yakalanmadan çıkış kapısına ulaş.",
    accent: "mint",
    controls: "Klavye, fare ve mobil dokunmatik",
    achievements: ["3 anahtarı tek seferde topla", "Final seviyesine ulaş", "Zaman gücünü boşa harcama"],
    updates: ["5 seviyeli kaçış sistemi eklendi", "Mobil kontrol butonları hazır", "Anne yüz görseli oyun içine taşındı"],
    stockBase: 128,
  },
  {
    slug: "bardak",
    title: "Bardak",
    path: "/oyunlar/bardak/",
    type: "3D Fizik",
    status: "Oynanabilir",
    description: "Bardağı kontrol et, hedefleri tamamla ve stüdyo enerjisini göster.",
    longDescription: "Hakorocks enerjisiyle hazırlanmış fizik denemesi. Sahnedeki hareketleri çöz, bardağı kontrol et ve hedefleri tamamla.",
    accent: "amber",
    image: "/oyunlar/bardak/assets/hakorocks_studios.png",
    controls: "Fare, klavye ve dokunmatik",
    achievements: ["İlk denemede başla", "Bardağı dengede tut", "Hakorocks intro sahnesini izle"],
    updates: ["Stüdyo logosu eklendi", "3D sahne ve görsel assetler düzenlendi", "Tarayıcıdan tek tıkla oynanır hale getirildi"],
    stockBase: 96,
  },
  {
    slug: "essiz-zindan",
    title: "Eşsiz Zindan",
    path: "/oyunlar/essiz-zindan/",
    type: "Zindan Aksiyonu",
    status: "Oynanabilir",
    description: "Odaları temizle, gücünü büyüt ve zindanın sonuna kadar ilerle.",
    longDescription: "Zindan odalarını geç, öfke gücünü doldur, kılıcını geliştir ve boss savaşına hazırlan. Yayındaki sürümde ölümsüzlük kısayolu kapatıldı.",
    accent: "violet",
    controls: "Klavye, gamepad ve dokunmatik saldırı",
    achievements: ["20 odayı temizle", "Öfke gücüyle düşmanları dağıt", "Kral savaşına ulaş"],
    updates: ["Ölümsüzlük debug kısayolu kaldırıldı", "Boss özel saldırıları korundu", "Mobil tam ekran düğmesi korundu"],
    stockBase: 154,
  },
  {
    slug: "skeleton-wars",
    title: "Skeleton Wars",
    path: "/oyunlar/skeleton-wars/",
    type: "Macera Savaşı",
    status: "Oynanabilir",
    description: "İskelet ordusuyla savaş, hikaye videosunu izle ve bölümleri geç.",
    longDescription: "Kardeşini kurtarmak için yola çık. Ok, kılıç ve özel sahnelerle uzun bir macera seni bekliyor.",
    accent: "bone",
    controls: "Klavye, fare ve ekran butonları",
    achievements: ["İskelet kralı yen", "Kardeşini kurtar", "Hikaye videosunu tamamla"],
    updates: ["Hazır WebM hikaye videosu korundu", "Skeleton Wars 2 klasörü geleceğe hazır", "Canlı fotoğraf sistemi eklendi"],
    stockBase: 188,
  },
  {
    slug: "vale",
    title: "Vale",
    path: "/oyunlar/vale/",
    type: "3D Simülasyon",
    status: "Oynanabilir",
    description: "Arabaları teslim al, park et, para kazan ve vale işini büyüt.",
    longDescription: "Müşterilerin arabalarını al, doğru yere park et, hasar yapmadan para kazan ve vale işletmeni büyüt.",
    accent: "sky",
    controls: "Klavye ve fare",
    achievements: ["İlk müşteriyi memnun et", "Hasarsız park yap", "10 katlı otopark hedefini aç"],
    updates: ["3D park alanı yayınlandı", "Market ve yükseltme sistemi eklendi", "Oyun istatistik paneline bağlandı"],
    stockBase: 112,
  },
  {
    slug: "robot-avcisi",
    title: "Robot Avcısı",
    path: "/oyunlar/robot-avcisi/",
    type: "Laboratuvar FPS",
    status: "Oynanabilir",
    description: "Robotları avla, hurdalarla silah üret ve laboratuvardan kaç.",
    longDescription: "Laboratuvarda hayatta kal, robotları parçala, hurdalarla silah üret ve parti sistemi olan büyük FPS denemesini keşfet.",
    accent: "lime",
    controls: "Klavye, fare ve ayarlanabilir kontroller",
    achievements: ["İlk robotu yok et", "Yeni silah üret", "Laboratuvar odalarını temizle"],
    updates: ["Babylon.js vendor dosyası üretim build'ine eklendi", "Tek oyunculu tarayıcı erişimi düzeltildi", "Fotoğraf kısayolu desteği eklendi"],
    stockBase: 173,
  },
];

const upcomingGames = [
  {
    title: "Uzay Macerası",
    description: "Keşfet, savaş, eğlen. Yeni fragmanda görünen uzay temalı oyun dünyası.",
    label: "Yakında",
  },
  {
    title: "Hakorocks Launcher",
    description: "Oyun istatistiklerini, başarımları ve yeni sürümleri tek merkezde gösterecek panel.",
    label: "Planlanıyor",
  },
  {
    title: "Skeleton Wars 2",
    description: "Karanlık gözlerden başlayan yeni bölüm için hazırlık klasörü hazır.",
    label: "Hazırlık",
  },
];

const projects = [
  {
    title: "Oyun Motoru Denemeleri",
    description: "Babylon.js, canvas ve fizik denemeleri için yeni proje alanı.",
    label: "Hazır altyapı",
  },
  {
    title: "Canlı Studio Paneli",
    description: "Site açık kişi, oyunda kişi, cihaz dağılımı ve oyun borsası API ile güncellenir.",
    label: "Yeni sistem",
  },
  {
    title: "Yeni Web Projeleri",
    description: "Projeler klasörüne eklenen her çalışma sitede vitrine taşınabilir.",
    label: "Geliştirme alanı",
  },
];

const sessionId = getSessionId();
const gameMap = new Map(games.map((game) => [game.slug, game]));
let latestStats = createFallbackStats();
let latestPhotos = [];
let selectedGame = games[0];

document.querySelector("#app").innerHTML = `
  <header class="site-header" data-header>
    <a class="brand" href="#top" aria-label="Hakorocks Studio ana sayfa">
      <span class="brand-mark">H</span>
      <span>Hakorocks Studio</span>
    </a>
    <nav class="nav" aria-label="Ana menü">
      <a href="#hakkimda">Hakkımda</a>
      <a href="#ozgecmis">Özgeçmiş</a>
      <a href="#fragman">Fragman</a>
      <a href="#oyunlar">Oyunlar</a>
      <a href="#canli">Canlı</a>
      <a href="#yakinda">Yakında</a>
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
          <a class="button secondary" href="#fragman">Fragmanı izle</a>
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
          <div><strong>Live</strong><span>oyun ve site sayaçları</span></div>
        </div>
      </div>
    </section>

    <section class="section resume-section" id="ozgecmis" aria-labelledby="resume-title">
      <div class="section-heading">
        <p class="eyebrow">Özgeçmiş</p>
        <h2 id="resume-title">Hakan Umut Akadal</h2>
      </div>
      <div class="resume-grid">
        <article class="resume-card wide">
          <h3>Merhaba!</h3>
          <p>
            Ben Hakan Umut Akadal. 5 Ekim'de doğdum. Oyun geliştirmeyi, yeni projeler üretmeyi
            ve teknolojiyi keşfetmeyi çok seviyorum. Kendi oyunlarımı geliştiriyor ve bunları
            bu web sitesinde paylaşıyorum.
          </p>
        </article>
        <article class="resume-card">
          <h3>Aile</h3>
          <ul>
            <li>Anne: İnayet Akadal</li>
            <li>Baba: Emre Akadal</li>
            <li>Babaanne: Ayşe Akadal</li>
            <li>Dede: Yunus Akadal</li>
            <li>Kardeş: Yok</li>
          </ul>
        </article>
        <article class="resume-card">
          <h3>Madalyalar ve Belgeler</h3>
          <ul>
            <li>Anadak Kampçılık etkinliğinden madalya.</li>
            <li>Kavaklı Anaokulu Spor Turnuvası Başarı Madalyası.</li>
            <li>Büyükşehir İlkokulu "Ben Artık Okuyorum Yazıyorum" Belgesi (2023-2024).</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section trailer-section" id="fragman" aria-labelledby="trailer-title">
      <div class="section-heading">
        <p class="eyebrow">30 saniyelik fragman</p>
        <h2 id="trailer-title">HAKO ROCKS tanıtım videosu.</h2>
      </div>
      <div class="trailer-layout">
        <div class="trailer-stage is-playing" data-trailer-stage aria-label="Hakorocks fragman videosu">
          <div class="space-field" aria-hidden="true"></div>
          <div class="trailer-scene scene-logo">
            <strong>HAKO ROCKS</strong>
            <span>Uzay sesi</span>
          </div>
          <div class="trailer-scene scene-skeleton">
            <strong>Skeleton Wars</strong>
            <span>Kendi geliştirdiğim oyunlar</span>
          </div>
          <div class="trailer-scene scene-space">
            <strong>Uzay Macerası</strong>
            <span>Keşfet, savaş, eğlen!</span>
          </div>
          <div class="trailer-scene scene-action">
            <strong>Hızlı aksiyon sahneleri</strong>
            <span>Zindan, robotlar, yarış ve savaş</span>
          </div>
          <div class="trailer-scene scene-final">
            <strong>hakorocks.akadal.tr</strong>
            <span>Hemen Oyna!</span>
          </div>
          <div class="trailer-progress" aria-hidden="true"></div>
        </div>
        <aside class="trailer-panel">
          <button class="button primary" type="button" data-trailer-play>Fragmanı baştan oynat</button>
          <p>0:00 HAKO ROCKS logosu, 0:03 Skeleton Wars, 0:08 Uzay Macerası, 0:15 aksiyon, 0:22 hemen oyna.</p>
        </aside>
      </div>
    </section>

    <section class="section live-section" id="canli" aria-labelledby="live-title">
      <div class="section-heading">
        <p class="eyebrow">Canlı studio panosu</p>
        <h2 id="live-title">Site ve oyun kullanımı borsa gibi hareket ediyor.</h2>
      </div>
      <div class="live-grid">
        <article class="ticker-card">
          <span>Site açık</span>
          <strong data-site-open>0</strong>
          <small>aktif cihaz</small>
        </article>
        <article class="ticker-card">
          <span>Oyunda</span>
          <strong data-playing-now>0</strong>
          <small>aktif oyuncu</small>
        </article>
        <article class="ticker-card">
          <span>Mobil</span>
          <strong data-mobile-now>0</strong>
          <small>telefon/tablet</small>
        </article>
        <article class="market-card">
          <div>
            <span>Hakorocks Index</span>
            <strong data-market-value>0</strong>
          </div>
          <div data-market-chart class="market-chart"></div>
        </article>
      </div>
    </section>

    <section class="section games-section" id="oyunlar" aria-labelledby="games-title">
      <div class="section-heading">
        <p class="eyebrow">Oyun vitrini</p>
        <h2 id="games-title">Oyunun üstüne bas, Steam tarzı detay ekranı açılsın.</h2>
      </div>
      <div class="game-grid">
        ${games.map(renderGameCard).join("")}
      </div>
    </section>

    <section class="section photos-section" id="fotolar" aria-labelledby="photos-title">
      <div class="section-heading">
        <p class="eyebrow">Oyun fotoğrafları</p>
        <h2 id="photos-title">Oyunlarda Ö tuşuna basınca burada görünür.</h2>
      </div>
      <div class="photo-grid" data-photo-grid>
        ${renderEmptyPhotos()}
      </div>
    </section>

    <section class="section upcoming-section" id="yakinda" aria-labelledby="upcoming-title">
      <div class="section-heading">
        <p class="eyebrow">Yakında gelecek oyunlar</p>
        <h2 id="upcoming-title">Sıradaki fikirler için vitrin hazır.</h2>
      </div>
      <div class="project-grid">
        ${upcomingGames.map(renderProjectCard).join("")}
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

  <section class="game-modal" data-game-modal hidden>
    <button class="modal-backdrop" type="button" data-modal-close aria-label="Detay ekranını kapat"></button>
    <article class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="modal-close" type="button" data-modal-close aria-label="Kapat">×</button>
      <div data-modal-content></div>
    </article>
  </section>
`;

function renderGameCard(game, index) {
  const media = game.image
    ? `<img src="${game.image}" alt="${game.title} oyun görseli" loading="lazy" />`
    : `<div class="game-poster poster-${game.accent}" aria-hidden="true"><span>${String(index + 1).padStart(2, "0")}</span></div>`;

  return `
    <article class="game-card">
      <button class="game-card-link" type="button" data-game-open="${game.slug}" aria-label="${game.title} detaylarını aç">
        <div class="game-media">${media}</div>
        <div class="game-body">
          <div class="game-meta">
            <span>${game.type}</span>
            <span>${game.status}</span>
            <span>Mobil bilgi</span>
          </div>
          <h3>${game.title}</h3>
          <p>${game.description}</p>
          <span class="play-link">Detayları aç</span>
        </div>
      </button>
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

function renderModal(game) {
  const gameStats = latestStats.games?.[game.slug] ?? createGameStat(game, 0);
  const photos = latestPhotos.filter((photo) => photo.slug === game.slug).slice(0, 4);
  const chartValues = gameStats.history?.length ? gameStats.history : createHistory(game.stockBase);
  const change = gameStats.change ?? 0;
  const changeClass = change >= 0 ? "up" : "down";

  return `
    <div class="modal-hero poster-${game.accent}">
      <div>
        <span>${game.type}</span>
        <h2 id="modal-title">${game.title}</h2>
        <p>${game.longDescription}</p>
      </div>
      <a class="button primary" href="${game.path}" data-play-game="${game.slug}">Oyunu aç</a>
    </div>
    <div class="modal-grid">
      <section class="modal-section">
        <h3>Oyun borsası</h3>
        <div class="game-market ${changeClass}">
          <strong>${Math.round(gameStats.value)}</strong>
          <span>${change >= 0 ? "+" : ""}${change.toFixed(1)}%</span>
        </div>
        <div class="market-chart">${renderSparkline(chartValues)}</div>
        <p>Oynayan kişi arttıkça yükselir, azalınca düşer.</p>
      </section>
      <section class="modal-section">
        <h3>Canlı durum</h3>
        <ul class="clean-list">
          <li>Şu an oyunda: ${gameStats.playing ?? 0}</li>
          <li>Toplam açılış: ${gameStats.opens ?? 0}</li>
          <li>Kontrol: ${game.controls}</li>
        </ul>
      </section>
      <section class="modal-section">
        <h3>Başarımlar</h3>
        <ul class="clean-list">${game.achievements.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>
      <section class="modal-section">
        <h3>Geliştirme notları</h3>
        <ul class="clean-list">${game.updates.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>
    </div>
    <section class="modal-section full">
      <h3>Oyunda çekilen fotoğraflar</h3>
      <div class="modal-photo-row">
        ${photos.length ? photos.map(renderPhoto).join("") : renderScreenshotPlaceholders(game)}
      </div>
    </section>
  `;
}

function renderPhoto(photo) {
  return `
    <figure class="photo-card">
      <img src="${photo.dataUrl}" alt="${photo.title || "Oyun fotoğrafı"}" loading="lazy" />
      <figcaption>${photo.gameTitle || photo.title || "Oyun fotoğrafı"}</figcaption>
    </figure>
  `;
}

function renderEmptyPhotos() {
  return games.slice(0, 3).map((game) => `
    <figure class="photo-card placeholder">
      <div class="game-poster poster-${game.accent}"><span>${game.title.slice(0, 2)}</span></div>
      <figcaption>${game.title} içinde Ö tuşuna basınca fotoğraf buraya gelir.</figcaption>
    </figure>
  `).join("");
}

function renderScreenshotPlaceholders(game) {
  return [1, 2, 3].map((index) => `
    <figure class="photo-card placeholder">
      <div class="game-poster poster-${game.accent}"><span>${index}</span></div>
      <figcaption>${game.title} fotoğraf yuvası</figcaption>
    </figure>
  `).join("");
}

function getSessionId() {
  const key = "hakorocks-session-id";
  const current = localStorage.getItem(key);
  if (current) return current;
  const next = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, next);
  return next;
}

function deviceType() {
  const width = window.innerWidth;
  if (width < 720) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

function createFallbackStats() {
  const siteOpen = 1;
  const playing = 0;
  const gamesStats = Object.fromEntries(games.map((game, index) => [game.slug, createGameStat(game, index)]));
  const marketValue = Math.round(Object.values(gamesStats).reduce((sum, item) => sum + item.value, 0) / games.length);
  return {
    siteOpen,
    playing,
    devices: { mobile: deviceType() === "mobile" ? 1 : 0, tablet: deviceType() === "tablet" ? 1 : 0, desktop: deviceType() === "desktop" ? 1 : 0 },
    marketValue,
    marketHistory: createHistory(marketValue),
    games: gamesStats,
  };
}

function createGameStat(game, index) {
  const wave = Math.sin(Date.now() / 90000 + index) * 9;
  const value = Math.max(20, game.stockBase + wave);
  return {
    value,
    change: wave / 10,
    playing: 0,
    opens: 0,
    history: createHistory(value),
  };
}

function createHistory(value) {
  return Array.from({ length: 18 }, (_, index) => Math.max(12, value + Math.sin(index * 0.85) * 9 + (index - 9) * 0.7));
}

function renderSparkline(values) {
  const width = 260;
  const height = 86;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Borsa grafiği"><polyline points="${points}" /></svg>`;
}

function bindGameCards() {
  document.querySelectorAll("[data-game-open]").forEach((button) => {
    button.addEventListener("click", () => openGameModal(button.dataset.gameOpen));
  });
  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", closeGameModal);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeGameModal();
  });
}

function openGameModal(slug) {
  const game = gameMap.get(slug);
  if (!game) return;
  selectedGame = game;
  document.querySelector("[data-modal-content]").innerHTML = renderModal(game);
  const modal = document.querySelector("[data-game-modal]");
  modal.hidden = false;
  document.body.classList.add("modal-open");
  fetch("/api/game-open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, slug }),
  }).catch(() => {});
}

function closeGameModal() {
  const modal = document.querySelector("[data-game-modal]");
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function bindTrailer() {
  const stage = document.querySelector("[data-trailer-stage]");
  document.querySelector("[data-trailer-play]")?.addEventListener("click", () => {
    stage.classList.remove("is-playing");
    void stage.offsetWidth;
    stage.classList.add("is-playing");
    playSpaceSound();
  });
}

function playSpaceSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(72, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(36, context.currentTime + 1.8);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 2.4);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 2.5);
}

async function refreshLiveData() {
  const payload = {
    sessionId,
    device: deviceType(),
    path: location.pathname,
  };

  try {
    await fetch("/api/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const [statsResponse, photosResponse] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/photos"),
    ]);
    latestStats = await statsResponse.json();
    latestPhotos = await photosResponse.json();
  } catch {
    latestStats = createFallbackStats();
  }

  renderLiveData();
  if (!document.querySelector("[data-game-modal]").hidden) {
    document.querySelector("[data-modal-content]").innerHTML = renderModal(selectedGame);
  }
}

function renderLiveData() {
  document.querySelector("[data-site-open]").textContent = latestStats.siteOpen ?? 1;
  document.querySelector("[data-playing-now]").textContent = latestStats.playing ?? 0;
  document.querySelector("[data-mobile-now]").textContent = (latestStats.devices?.mobile ?? 0) + (latestStats.devices?.tablet ?? 0);
  document.querySelector("[data-market-value]").textContent = Math.round(latestStats.marketValue ?? 0);
  document.querySelector("[data-market-chart]").innerHTML = renderSparkline(latestStats.marketHistory ?? createHistory(100));

  const grid = document.querySelector("[data-photo-grid]");
  if (latestPhotos.length) {
    grid.innerHTML = latestPhotos.slice(0, 8).map(renderPhoto).join("");
  }
}

const header = document.querySelector("[data-header]");
window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
});

bindGameCards();
bindTrailer();
refreshLiveData();
setInterval(refreshLiveData, 10000);
