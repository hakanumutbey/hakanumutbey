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
    slug: "rhgpo",
    title: "RHGPO",
    path: "/oyunlar/rhgpo/",
    type: "Deniz Simülasyonu",
    status: "Oynanabilir",
    description: "Park modunda limana yanaş, motor modunda halatları doğru sırayla çek.",
    longDescription: "RHGPO'da önce limana park et, sonra motor modunda rüzgar tarafındaki halatı en son çekerek motoru çalıştır ve çıkışa ilerle. Her turda rüzgar sertleşir, üç çarpma olursa oyun biter.",
    accent: "sea",
    controls: "Klavye, fare ve dokunmatik",
    achievements: ["İlk limana yanaş", "İlk motor turunu bitir", "Beş turu tamamla"],
    updates: ["Park modu ve motor modu eklendi", "Halat sırası kuralı hazırlandı", "Çarpma bazlı başarısızlık kuruldu"],
    stockBase: 121,
  },
  {
    slug: "siyah-adam",
    title: "Siyah Adam",
    path: "/oyunlar/siyah-adam/",
    type: "Sosyal Çıkarım",
    status: "Oynanabilir",
    description: "3 ila 10 kişi ile renk seç, çemberde oy ver ve Siyah Adam'ı geceleri yakala.",
    longDescription: "Siyah hariç renk seç, çember toplantısında şüpheleri topla, gece olduğunda hedefi belirle ve hayaletleri oyunun dışında bırak. Bu sürümde hazırlık odası, oylama ve 10 saniyelik gece kararı tamamlandı.",
    accent: "red",
    controls: "Klavye, fare ve dokunmatik",
    achievements: ["3 kişi ile oda kur", "Siyah Adam'ı çemberde yakala", "Gece hedefini son saniyede seç"],
    updates: ["3-10 oyunculuk çok oyunculu oda eklendi", "Renk seçimi ve hazır odası hazırlandı", "Çember toplantısı ve gece hedef akışı tamamlandı"],
    stockBase: 168,
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
    title: "Skeleton Wars 2",
    description: "Karanlık gözlerden başlayan yeni bölüm için hazırlık klasörü hazır.",
    label: "Devam ediyor",
    status: "Hazırlanıyor",
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

const newsItems = [
  {
    date: "Bugün",
    title: "Fotoğraf tuşu görünür oldu",
    description: "Oyun ekranlarının sağ altına Ö tuşunu hatırlatan fotoğraf rozeti eklendi.",
  },
  {
    date: "Yeni",
    title: "Canlı oyun borsası yayında",
    description: "Site açık kişi, aktif oyuncu ve oyun ilgisi artık canlı panoda hareket ediyor.",
  },
  {
    date: "Studio",
    title: "+team tarzı oyun ekranı",
    description: "Oyun kartına basınca detay, başarımlar, notlar, fotoğraflar ve puanlama açılır.",
  },
];

const badgeDefinitions = [
  {
    id: "visitor",
    title: "İlk Ziyaret",
    description: "Hakorocks Studio ana üssünü açtın.",
    isUnlocked: (state) => Boolean(state.visitedAt),
  },
  {
    id: "explorer",
    title: "Oyun Kaşifi",
    description: "Bir oyun detay ekranı açtın.",
    isUnlocked: (state) => Boolean(state.openedGame),
  },
  {
    id: "player",
    title: "Oyuncu",
    description: "Bir oyunu başlattın veya oyun sayfasına girdin.",
    isUnlocked: (state) => state.playedGames.length > 0,
  },
  {
    id: "voice-room",
    title: "Sesli Oda",
    description: "Bir sesli odaya girdin.",
    isUnlocked: (state) => Boolean(state.voiceRoomJoined),
  },
  {
    id: "shadow-seeker",
    title: "Siyah Adam Kaşifi",
    description: "Siyah Adam oyununu açtın.",
    isUnlocked: (state) => state.playedGames.includes("siyah-adam"),
  },
  {
    id: "rhgpo-pilot",
    title: "RHGPO Pilotu",
    description: "RHGPO'da limana yanaştın.",
    isUnlocked: (state) => state.playedGames.includes("rhgpo"),
  },
  {
    id: "circle-leader",
    title: "Çember Lideri",
    description: "Siyah Adam ve sesli odayı birlikte kullandın.",
    isUnlocked: (state) => state.playedGames.includes("siyah-adam") && state.voiceRoomJoined,
  },
  {
    id: "skeleton",
    title: "Skeleton Savaşçısı",
    description: "Skeleton Wars oynadın.",
    isUnlocked: (state) => state.playedGames.includes("skeleton-wars"),
  },
  {
    id: "photographer",
    title: "Fotoğrafçı",
    description: "Ö tuşuyla oyun fotoğrafı çektin.",
    isUnlocked: (state) => state.photoCount > 0,
  },
  {
    id: "critic",
    title: "Oyun Eleştirmeni",
    description: "Bir oyuna yıldız puanı verdin.",
    isUnlocked: (state) => state.ratedGames.length > 0,
  },
  {
    id: "guest",
    title: "Ziyaretçi Defteri",
    description: "Deftere kısa bir mesaj bıraktın.",
    isUnlocked: (state) => Boolean(state.guestbook),
  },
  {
    id: "trailer",
    title: "Fragman Pilot",
    description: "HAKO ROCKS fragmanını baştan oynattın.",
    isUnlocked: (state) => Boolean(state.trailerPlayed),
  },
];

const sessionId = getSessionId();
const gameMap = new Map(games.map((game) => [game.slug, game]));
let badgeState = ensureBadgeState();
let latestStats = createFallbackStats();
let latestPhotos = [];
let latestRatings = createFallbackRatings();
let latestGuestbook = [];
let latestFeedback = [];
let latestAnnouncements = [];
let latestSocial = createFallbackSocial();
let latestVoice = createFallbackVoice();
let notificationPermission = "Notification" in window ? Notification.permission : "default";
let selectedGame = games[0];
let selectedPhotoFilter = "all";
let selectedInviteGameSlug = localStorage.getItem("hakorocks-invite-game") || "robot-avcisi";
let selectedVoiceRoomId = localStorage.getItem("hakorocks-voice-room") || "hakorocks-oda";
let voiceClient = null;
let soundEnabled = localStorage.getItem("hakorocks-sound") !== "off";
let audioContext;

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
      <a href="#haberler">Haberler</a>
      <a href="#hesap">Hesap</a>
      <a href="#rozetler">Rozetler</a>
      <a href="#yakinda">Yakında</a>
      <a href="#defter">Defter</a>
    </nav>
    <button class="nav-sound" type="button" data-sound-toggle aria-pressed="${soundEnabled ? "true" : "false"}">
      Ses: ${soundEnabled ? "Açık" : "Kapalı"}
    </button>
  </header>

  <main id="top">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-media" aria-hidden="true"></div>
      <div class="hero-content">
        <p class="eyebrow">Tarayıcıda oynanan oyunlar ve yaratıcı kod</p>
        <h1 id="hero-title">Hakorocks Studio</h1>
        <p class="hero-copy">
          Ben Hakan Umut Akadal. Oyunlar, 3D dünyalar ve web projeleri tek merkezde.
          Burada tarayıcıda açılan oyunlar, canlı özellikler ve yeni denemeler bir araya geliyor.
        </p>
        <div class="hero-actions">
          <a class="button primary" href="#oyunlar">Oyunları aç</a>
          <a class="button secondary" href="#hesap">Hesap oluştur</a>
          <a class="button secondary" href="#fragman">Fragmanı izle</a>
        </div>
      </div>
      <aside class="hero-panel" aria-label="Stüdyo özeti">
        <strong>8 oyun</strong>
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
        <aside class="profile-card" aria-label="Mini profil">
          <span>Mini profil</span>
          <h3>Hakan Umut Akadal</h3>
          <p>Oyun, proje ve teknoloji keşiflerini burada topluyor.</p>
          <strong>Herkese açık</strong>
          <small>hakorocks.akadal.tr</small>
        </aside>
        <div class="stats-grid" aria-label="Stüdyo bilgileri">
          <div><strong>Studio</strong><span>oyun vitrini</span></div>
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
            Hakorocks Studio, oyun geliştirme, yeni projeler üretme ve teknolojiyi keşfetme
            odağında ilerliyor. Kendi oyunlarını geliştiriyor ve bunları bu web sitesinde paylaşıyor.
          </p>
        </article>
        <article class="resume-card">
          <h3>Odak alanları</h3>
          <ul>
            <li>Tarayıcı oyunları</li>
            <li>Canlı web deneyleri</li>
            <li>Paylaşılabilir stüdyo vitrini</li>
            <li>Hızlı yayın akışı</li>
          </ul>
        </article>
        <article class="resume-card">
          <h3>Notlar</h3>
          <ul>
            <li>Yeni oyunlar ana vitrinde görünür.</li>
            <li>Haberler ve duyurular canlı güncellenir.</li>
            <li>Projeler ayrı klasörde düzenli tutulur.</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="section news-section" id="haberler" aria-labelledby="news-title">
      <div class="section-heading">
        <p class="eyebrow">Hakorocks Haberleri</p>
        <h2 id="news-title">Stüdyodaki son gelişmeler.</h2>
        <p class="section-note">Sol tarafta otomatik haber kartları, sağ tarafta public geri bildirim ve şifreli duyuru alanı var.</p>
      </div>
      <div class="news-layout">
        <div class="news-grid">
          ${newsItems.map(renderNewsItem).join("")}
        </div>
        <div class="news-sidebar">
          <div class="feedback-panel">
            <div class="announcement-lock">
              <span>Herkese açık</span>
              <strong>Geri bildirim ve talepler</strong>
            </div>
            <form class="feedback-form" data-feedback-form>
              <label>
                İsim
                <input name="name" maxlength="32" placeholder="İstersen adını yaz" />
              </label>
              <label>
                Tür
                <select name="kind">
                  <option value="Geri bildirim">Geri bildirim</option>
                  <option value="Talep">Talep</option>
                  <option value="Fikir">Fikir</option>
                </select>
              </label>
              <label>
                Mesaj
                <textarea name="message" maxlength="220" placeholder="Site veya oyunlar için kısa not" required></textarea>
              </label>
              <button class="button primary" type="submit">Gönder</button>
              <p class="form-status" data-feedback-status aria-live="polite"></p>
            </form>
            <div class="feedback-feed" data-feedback-list>
              ${renderFeedback()}
            </div>
          </div>
          <div class="announcement-panel">
            <div class="announcement-editor">
              <div class="announcement-lock">
                <span>Şifreli alan</span>
                <strong>Duyuru yayınla</strong>
              </div>
              <form class="announcement-form" data-announcement-form>
                <label>
                  Şifre
                  <input name="password" type="password" autocomplete="current-password" placeholder="Duyuru şifresi" required />
                </label>
                <label>
                  Başlık
                  <input name="title" maxlength="60" placeholder="Duyuru başlığı" required />
                </label>
                <label>
                  Duyuru
                  <textarea name="message" maxlength="240" placeholder="Arkadaşlarına göstermek istediğin mesaj" required></textarea>
                </label>
                <button class="button primary" type="submit">Duyuru yayınla</button>
                <p class="form-status" data-announcement-status aria-live="polite"></p>
              </form>
            </div>
            <div class="announcement-feed" data-announcement-list>
              ${renderAnnouncements()}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section social-section" id="hesap" aria-labelledby="social-title">
      <div class="section-heading">
        <p class="eyebrow">Siyah Adam hesabı</p>
        <h2 id="social-title">Arkadaş, davet ve profil sistemi burada hazırlanıyor.</h2>
        <p class="section-note">İlk girişte hesap oluştur; isim, takma ad ve profil fotoğrafı ister. Fotoğraf eklersen görünür, eklemezsen adının baş harfi kullanılır.</p>
      </div>
      <div class="account-layout">
        <article class="account-panel">
          <div class="account-panel-head">
            <div>
              <span>Hesap oluştur</span>
              <strong>Yeni profil</strong>
            </div>
            <button class="button secondary" type="button" data-notification-permission>Bildirimleri aç</button>
          </div>
          <form class="account-form" data-account-form>
            <label>
              İsim
              <input name="name" maxlength="40" placeholder="Gerçek ad" autocomplete="name" required />
            </label>
            <label>
              Takma ad
              <input name="nickname" maxlength="24" placeholder="Oyunda görünecek ad" autocomplete="nickname" required />
            </label>
            <label>
              Profil resmi
              <input name="avatar" type="file" accept="image/*" />
            </label>
            <button class="button primary" type="submit">Hesap oluştur</button>
            <p class="form-status" data-account-status aria-live="polite"></p>
          </form>
        </article>
        <article class="account-panel" data-account-dashboard>
          ${renderAccountDashboard()}
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

    <section class="section badges-section" id="rozetler" aria-labelledby="badges-title">
      <div class="section-heading">
        <p class="eyebrow">Görevler ve rozetler</p>
        <h2 id="badges-title">Siteyi kullandıkça rozetler açılır.</h2>
      </div>
      <div class="badge-grid" data-badge-grid>
        ${renderBadges()}
      </div>
    </section>

    <section class="section games-section" id="oyunlar" aria-labelledby="games-title">
      <div class="section-heading">
        <p class="eyebrow">Oyun vitrini</p>
        <h2 id="games-title">Oyunun üstüne bas, +team tarzı detay ekranı açılsın.</h2>
      </div>
      <div class="game-grid">
        ${games.map(renderGameCard).join("")}
      </div>
    </section>

    <section class="section photos-section" id="fotolar" aria-labelledby="photos-title">
      <div class="section-heading">
        <p class="eyebrow">Oyun fotoğrafları</p>
        <h2 id="photos-title">Oyunlarda fotoğraf çekme tuşu: Ö.</h2>
        <p class="section-note">Oyun ekranının sağ altındaki rozet sana tuşu hatırlatır; çekilen fotoğraflar burada ve oyun detayında görünür.</p>
      </div>
      <div class="filter-bar" aria-label="Fotoğraf filtreleri">
        ${renderPhotoFilters()}
      </div>
      <div class="photo-grid" data-photo-grid>
        ${renderPhotoGallery()}
      </div>
    </section>

    <section class="section guestbook-section" id="defter" aria-labelledby="guestbook-title">
      <div class="section-heading">
        <p class="eyebrow">Ziyaretçi defteri</p>
        <h2 id="guestbook-title">Arkadaşların kısa mesaj bırakabilir.</h2>
        <p class="section-note">Mesajlar herkese açık görünür; kısa, nazik ve oyunlarla ilgili yazmak en iyisi.</p>
      </div>
      <div class="guestbook-layout">
        <form class="guestbook-form" data-guestbook-form>
          <label>
            İsim
            <input name="name" maxlength="32" placeholder="Adın" autocomplete="name" />
          </label>
          <label>
            Mesaj
            <textarea name="message" maxlength="180" required placeholder="Site veya oyunlar hakkında kısa mesaj"></textarea>
          </label>
          <button class="button primary" type="submit">Deftere ekle</button>
          <p class="form-status" data-guestbook-status aria-live="polite"></p>
        </form>
        <div class="guestbook-list" data-guestbook-list>
          ${renderGuestbook()}
        </div>
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
      <div class="project-badges">
        <span>${project.label}</span>
        ${project.status ? `<em>${project.status}</em>` : ""}
      </div>
      <h3>${project.title}</h3>
      <p>${project.description}</p>
    </article>
  `;
}

function renderNewsItem(item) {
  return `
    <article class="news-card">
      <span>${item.date}</span>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    </article>
  `;
}

function renderAnnouncementCard(item) {
  return `
    <article class="announcement-card">
      <span>${formatDate(item.createdAt) || "Bugün"}</span>
      <h3>${escapeHtml(item.title || "Duyuru")}</h3>
      <p>${escapeHtml(item.message || "")}</p>
    </article>
  `;
}

function renderFeedbackCard(item) {
  return `
    <article class="feedback-card">
      <span>${escapeHtml(item.kind || "Geri bildirim")}</span>
      <h3>${escapeHtml(item.name || "Ziyaretçi")}</h3>
      <p>${escapeHtml(item.message || "")}</p>
      <small>${formatDate(item.createdAt)}</small>
    </article>
  `;
}

function renderAnnouncements() {
  if (!latestAnnouncements.length) {
    return `
      <article class="announcement-card empty">
        <span>Hazır</span>
        <h3>İlk duyurunu bekliyor</h3>
        <p>Duyuru şifresini girip ilk mesajı yayınladığında burada görünecek.</p>
      </article>
    `;
  }
  return latestAnnouncements.slice(0, 6).map(renderAnnouncementCard).join("");
}

function renderFeedback() {
  if (!latestFeedback.length) {
    return `
      <article class="feedback-card empty">
        <span>Hazır</span>
        <h3>İlk geri bildirimi bekliyor</h3>
        <p>Buraya site veya oyunlar için taleplerini yazabilirsin.</p>
      </article>
    `;
  }
  return latestFeedback.slice(0, 8).map(renderFeedbackCard).join("");
}

function createFallbackSocial() {
  return {
    account: null,
    people: [],
    incomingRequests: [],
    outgoingRequests: [],
    invites: [],
    friends: [],
  };
}

function createFallbackVoice() {
  return {
    roomId: "",
    self: null,
    participants: [],
  };
}

function avatarMarkup(account, size = "medium") {
  const letter = (account?.nickname || account?.name || "H").trim().charAt(0).toUpperCase();
  const avatarUrl = account?.avatarUrl || "";
  return avatarUrl
    ? `<img class="avatar avatar-${size}" src="${avatarUrl}" alt="${escapeHtml(account?.nickname || account?.name || "Profil resmi")}" loading="lazy" />`
    : `<div class="avatar avatar-${size} avatar-fallback" aria-hidden="true">${escapeHtml(letter)}</div>`;
}

function renderAccountDashboard() {
  const { account, people, incomingRequests, outgoingRequests, invites, friends } = latestSocial;
  if (!account) {
    return `
      <div class="account-empty">
        <span>Hazır değil</span>
        <h3>Önce hesabını oluştur</h3>
        <p>Takma adını ve profilini girince arkadaş ekleme, davet gönderme ve bildirimler açılır.</p>
        <ul class="clean-list">
          <li>Arkadaş isteği gönder</li>
          <li>Çok oyunculu davet al</li>
          <li>Profil resmini kullan veya baş harfini göster</li>
        </ul>
      </div>
    `;
  }

  const voiceRoom = latestVoice.roomId || account.voiceRoomId || "";
  return `
    <div class="account-profile">
      <div class="account-profile-head">
        ${avatarMarkup(account, "large")}
        <div>
          <span>Aktif profil</span>
          <h3>${escapeHtml(account.name)}</h3>
          <p>@${escapeHtml(account.nickname)}</p>
        </div>
      </div>
      <div class="account-metrics">
        <div><strong>${friends.length}</strong><span>arkadaş</span></div>
        <div><strong>${incomingRequests.length}</strong><span>istek</span></div>
        <div><strong>${invites.length}</strong><span>davet</span></div>
      </div>
    </div>
    <div class="account-social-grid">
      <section class="account-box">
        <h4>Arkadaş ekle</h4>
        <form class="mini-form" data-friend-form>
          <label>
            Takma ad veya isim
            <input name="targetNickname" maxlength="24" placeholder="Örn: hakorocks" list="known-handle-options" required />
          </label>
          <datalist id="known-handle-options">
            ${people.map((person) => `<option value="${escapeHtml(person.nickname)}"></option>`).join("")}
            ${account ? `<option value="${escapeHtml(account.nickname)}"></option>` : ""}
          </datalist>
          <label>
            Mesaj
            <input name="message" maxlength="120" placeholder="İstersen kısa not bırak" />
          </label>
          <button class="button primary" type="submit">İstek gönder</button>
          <p class="form-status" data-friend-status aria-live="polite"></p>
        </form>
        <div class="people-list">
          ${people.length ? people.slice(0, 6).map(renderPersonCard).join("") : `<p class="muted-copy">Yakın zamanda burada önerilen kişiler görünecek.</p>`}
        </div>
      </section>
      <section class="account-box">
        <h4>Gelen istekler</h4>
        <div class="request-list" data-friend-request-list>
          ${renderFriendRequests(incomingRequests)}
        </div>
      </section>
      <section class="account-box">
        <h4>Davetler</h4>
        <form class="mini-form" data-invite-form>
          <label>
            Arkadaş takma adı veya isim
            <input name="targetNickname" maxlength="24" placeholder="Arkadaşın takma adı" list="known-handle-options" required />
          </label>
          <label>
            Oyun
            <select name="gameSlug">
              <option value="robot-avcisi" ${selectedInviteGameSlug === "robot-avcisi" ? "selected" : ""}>Robot Avcısı</option>
              <option value="siyah-adam" ${selectedInviteGameSlug === "siyah-adam" ? "selected" : ""}>Siyah Adam</option>
              <option value="skeleton-wars" ${selectedInviteGameSlug === "skeleton-wars" ? "selected" : ""}>Skeleton Wars</option>
              <option value="vale" ${selectedInviteGameSlug === "vale" ? "selected" : ""}>Vale</option>
            </select>
          </label>
          <label>
            Not
            <input name="message" maxlength="120" placeholder="Davet notu" />
          </label>
          <button class="button primary" type="submit">Davet et</button>
          <p class="form-status" data-invite-status aria-live="polite"></p>
        </form>
        <div class="invite-list">
          ${renderInvites(invites)}
        </div>
      </section>
      <section class="account-box account-box-voice">
        <div class="account-box-head">
          <h4>Sesli sohbet</h4>
          <button class="button secondary" type="button" data-voice-copy ${voiceRoom ? "" : "disabled"}>Oda kodunu kopyala</button>
        </div>
        <form class="mini-form" data-voice-form>
          <label>
            Oda kodu
            <input name="roomId" maxlength="40" placeholder="hakorocks-oda" value="${escapeHtml(voiceRoom || selectedVoiceRoomId)}" required />
          </label>
          <div class="voice-actions">
            <button class="button primary" type="submit" data-voice-join>${voiceClient?.connected ? "Sesli odadan çık" : "Sesli odaya gir"}</button>
            <button class="button secondary" type="button" data-voice-refresh>Katılımcıları yenile</button>
          </div>
          <p class="form-status" data-voice-status aria-live="polite">${voiceStatusText()}</p>
        </form>
        <div class="voice-peer-list" data-voice-list>
          ${renderVoiceParticipants()}
        </div>
      </section>
      <section class="account-box">
        <h4>Arkadaşların</h4>
        <div class="friend-list">
          ${friends.length ? friends.map(renderFriendCard).join("") : `<p class="muted-copy">Henüz arkadaş yok. Önce istek gönder.</p>`}
        </div>
      </section>
      <section class="account-box">
        <h4>Dışarıdan görünen örnek hesaplar</h4>
        <div class="people-list">
          ${people.slice(0, 4).map(renderPersonCard).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderPersonCard(person) {
  return `
    <article class="person-card">
      ${avatarMarkup(person)}
      <div>
        <strong>${escapeHtml(person.name)}</strong>
        <span>@${escapeHtml(person.nickname)}</span>
      </div>
    </article>
  `;
}

function renderFriendCard(friend) {
  return `
    <article class="person-card">
      ${avatarMarkup(friend)}
      <div>
        <strong>${escapeHtml(friend.name)}</strong>
        <span>@${escapeHtml(friend.nickname)}</span>
      </div>
    </article>
  `;
}

function renderFriendRequests(requests) {
  if (!requests.length) {
    return `<p class="muted-copy">Gelen arkadaş isteği yok.</p>`;
  }
  return requests.map((request) => `
    <article class="request-card">
      ${avatarMarkup(request.from)}
      <div>
        <strong>${escapeHtml(request.from?.name || "Bilinmeyen")}</strong>
        <span>@${escapeHtml(request.from?.nickname || "")}</span>
        <p>${escapeHtml(request.message || "Arkadaşlık isteği")}</p>
      </div>
      <div class="request-actions">
        <button class="button primary" type="button" data-friend-response="accept" data-request-id="${request.id}">Kabul et</button>
        <button class="button secondary" type="button" data-friend-response="decline" data-request-id="${request.id}">Reddet</button>
      </div>
    </article>
  `).join("");
}

function renderInvites(list) {
  if (!list.length) {
    return `<p class="muted-copy">Henüz davet yok.</p>`;
  }
  return list.map((invite) => `
    <article class="request-card">
      ${avatarMarkup(invite.from)}
      <div>
        <strong>${escapeHtml(invite.from?.name || "Bilinmeyen")}</strong>
        <span>${escapeHtml(invite.gameSlug)}</span>
        <p>${escapeHtml(invite.message || "Oyun daveti")}</p>
      </div>
      <div class="request-actions">
        <span class="status-pill">Bekliyor</span>
      </div>
    </article>
  `).join("");
}

function renderVoiceParticipants() {
  if (!latestVoice.roomId) {
    return `<p class="muted-copy">Sesli oda kapalı. Oda kodunu girip giriş yap.</p>`;
  }
  if (!latestVoice.participants.length) {
    return `<p class="muted-copy">Bu odada henüz kimse yok.</p>`;
  }
  return latestVoice.participants.map((participant) => `
    <article class="person-card">
      ${avatarMarkup(participant)}
      <div>
        <strong>${escapeHtml(participant.name)}</strong>
        <span>@${escapeHtml(participant.nickname)}</span>
      </div>
    </article>
  `).join("");
}

function voiceStatusText() {
  if (!voiceClient) return "Sesli sohbet hazır değil.";
  if (!voiceClient.connected) return "Sesli oda bağlı değil.";
  return `Sesli oda: ${latestVoice.roomId || selectedVoiceRoomId}`;
}

function renderBadges() {
  return badgeDefinitions.map((badge) => {
    const unlocked = badge.isUnlocked(badgeState);
    return `
      <article class="badge-card ${unlocked ? "is-unlocked" : ""}">
        <span>${unlocked ? "Açıldı" : "Kilitli"}</span>
        <h3>${badge.title}</h3>
        <p>${badge.description}</p>
      </article>
    `;
  }).join("");
}

function renderPhotoFilters() {
  const filterItems = [{ slug: "all", title: "Tümü" }, ...games];
  return filterItems.map((item) => `
    <button class="${selectedPhotoFilter === item.slug ? "is-active" : ""}" type="button" data-photo-filter="${item.slug}">
      ${item.title}
    </button>
  `).join("");
}

function renderPhotoGallery() {
  const photos = selectedPhotoFilter === "all"
    ? latestPhotos
    : latestPhotos.filter((photo) => photo.slug === selectedPhotoFilter);
  if (photos.length) return photos.slice(0, 12).map(renderPhoto).join("");
  if (selectedPhotoFilter !== "all") {
    const game = gameMap.get(selectedPhotoFilter);
    return game ? renderScreenshotPlaceholders(game) : renderEmptyPhotos();
  }
  return renderEmptyPhotos();
}

function renderRating(game) {
  const rating = latestRatings.games?.[game.slug] ?? { average: 0, count: 0 };
  const personalRated = badgeState.ratedGames.includes(game.slug);
  return `
    <div class="rating-box">
      <div class="rating-stars" aria-label="${game.title} puanlama">
        ${[1, 2, 3, 4, 5].map((value) => `
          <button type="button" data-rate-game="${game.slug}" data-rate-value="${value}" aria-label="${value} yıldız ver">★</button>
        `).join("")}
      </div>
      <p>
        Ortalama: <strong>${rating.average ? `${rating.average}/5` : "Henüz yok"}</strong>
        <span>${rating.count} oy</span>
      </p>
      <small>${personalRated ? "Bu tarayıcıdan puan verdin." : "Puan verince Oyun Eleştirmeni rozeti açılır."}</small>
    </div>
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
          <li>Fotoğraf çekme tuşu: Ö</li>
        </ul>
      </section>
      <section class="modal-section">
        <h3>Oyunu puanla</h3>
        ${renderRating(game)}
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
      <img src="${photo.dataUrl}" alt="${escapeHtml(photo.title || "Oyun fotoğrafı")}" loading="lazy" />
      <figcaption>${escapeHtml(photo.gameTitle || photo.title || "Oyun fotoğrafı")}</figcaption>
    </figure>
  `;
}

function renderGuestbook() {
  if (!latestGuestbook.length) {
    return `
      <article class="guestbook-entry empty">
        <span>İlk mesaj bekleniyor</span>
        <p>Siteyi deneyen ilk arkadaş kısa bir yorum bırakabilir.</p>
      </article>
    `;
  }
  return latestGuestbook.slice(0, 8).map((entry) => `
    <article class="guestbook-entry">
      <span>${escapeHtml(entry.name || "Ziyaretçi")}</span>
      <p>${escapeHtml(entry.message || "")}</p>
      <small>${formatDate(entry.createdAt)}</small>
    </article>
  `).join("");
}

function renderAnnouncementFeed() {
  const list = document.querySelector("[data-announcement-list]");
  if (list) list.innerHTML = renderAnnouncements();
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

function createFallbackRatings() {
  return {
    games: Object.fromEntries(games.map((game) => [game.slug, { average: 0, count: 0 }])),
  };
}

function ensureBadgeState() {
  const fallback = {
    visitedAt: new Date().toISOString(),
    openedGame: false,
    playedGames: [],
    photoCount: 0,
    ratedGames: [],
    guestbook: false,
    trailerPlayed: false,
    voiceRoomJoined: false,
  };
  try {
    const stored = JSON.parse(localStorage.getItem("hakorocks-badge-state") || "{}");
    const state = {
      ...fallback,
      ...stored,
      playedGames: Array.isArray(stored.playedGames) ? stored.playedGames : [],
      ratedGames: Array.isArray(stored.ratedGames) ? stored.ratedGames : [],
      photoCount: Number(stored.photoCount) || 0,
    };
    localStorage.setItem("hakorocks-badge-state", JSON.stringify(state));
    return state;
  } catch {
    localStorage.setItem("hakorocks-badge-state", JSON.stringify(fallback));
    return fallback;
  }
}

function updateBadgeState(mutator) {
  const next = { ...badgeState, playedGames: [...badgeState.playedGames], ratedGames: [...badgeState.ratedGames] };
  mutator(next);
  badgeState = next;
  localStorage.setItem("hakorocks-badge-state", JSON.stringify(badgeState));
  renderBadgeGrid();
}

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(value));
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
  document.addEventListener("click", (event) => {
    const target = event.target;
    const soundTarget = target.closest?.("button, a");
    if (soundTarget) playUiSound();

    const ratingButton = target.closest?.("[data-rate-game]");
    if (ratingButton) {
      submitRating(ratingButton.dataset.rateGame, Number(ratingButton.dataset.rateValue));
      return;
    }

    const filterButton = target.closest?.("[data-photo-filter]");
    if (filterButton) {
      selectedPhotoFilter = filterButton.dataset.photoFilter;
      renderPhotoFilterBar();
      renderPhotoGrid();
      return;
    }

    const playLink = target.closest?.("[data-play-game]");
    if (playLink) {
      updateBadgeState((state) => addUnique(state.playedGames, playLink.dataset.playGame));
    }
  });
  document.querySelector("[data-sound-toggle]")?.addEventListener("click", toggleSound);
  document.querySelector("[data-guestbook-form]")?.addEventListener("submit", submitGuestbook);
  document.querySelector("[data-feedback-form]")?.addEventListener("submit", submitFeedback);
  document.querySelector("[data-announcement-form]")?.addEventListener("submit", submitAnnouncement);
  document.querySelector("[data-account-form]")?.addEventListener("submit", submitAccount);
  document.querySelector("[data-friend-form]")?.addEventListener("submit", submitFriendRequest);
  document.querySelector("[data-invite-form]")?.addEventListener("submit", submitInvite);
  document.querySelector("[data-notification-permission]")?.addEventListener("click", requestNotificationPermission);
  document.addEventListener("click", handleAccountActions);
}

function openGameModal(slug) {
  const game = gameMap.get(slug);
  if (!game) return;
  updateBadgeState((state) => {
    state.openedGame = true;
  });
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

async function submitRating(slug, value) {
  if (!gameMap.has(slug) || !Number.isInteger(value)) return;
  try {
    const response = await fetch("/api/rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, slug, value }),
    });
    latestRatings = await response.json();
    updateBadgeState((state) => addUnique(state.ratedGames, slug));
  } catch {
    latestRatings.games[slug] = {
      average: value,
      count: 1,
    };
    updateBadgeState((state) => addUnique(state.ratedGames, slug));
  }
  if (!document.querySelector("[data-game-modal]").hidden) {
    document.querySelector("[data-modal-content]").innerHTML = renderModal(selectedGame);
  }
}

async function submitGuestbook(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-guestbook-status]");
  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    message: formData.get("message"),
  };
  status.textContent = "Gönderiliyor...";
  try {
    const response = await fetch("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("guestbook-failed");
    latestGuestbook = await response.json();
    form.reset();
    status.textContent = "Mesaj deftere eklendi.";
    updateBadgeState((state) => {
      state.guestbook = true;
    });
    renderGuestbookList();
  } catch {
    status.textContent = "Mesaj eklenemedi. Biraz sonra tekrar dene.";
  }
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-feedback-status]");
  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    kind: formData.get("kind"),
    message: formData.get("message"),
  };
  status.textContent = "Gönderiliyor...";
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "feedback-failed");
    latestFeedback = data;
    form.reset();
    status.textContent = "Geri bildirim gönderildi.";
    renderFeedbackFeed();
  } catch {
    status.textContent = "Gönderim başarısız. Tekrar dene.";
  }
}

function renderBadgeGrid() {
  const grid = document.querySelector("[data-badge-grid]");
  if (grid) grid.innerHTML = renderBadges();
}

function renderPhotoFilterBar() {
  const bar = document.querySelector(".filter-bar");
  if (bar) bar.innerHTML = renderPhotoFilters();
}

function renderPhotoGrid() {
  const grid = document.querySelector("[data-photo-grid]");
  if (grid) grid.innerHTML = renderPhotoGallery();
}

function renderGuestbookList() {
  const list = document.querySelector("[data-guestbook-list]");
  if (list) list.innerHTML = renderGuestbook();
}

function renderSocialDashboard() {
  const panel = document.querySelector("[data-account-dashboard]");
  if (panel) panel.innerHTML = renderAccountDashboard();
  bindSocialForms();
}

function bindSocialForms() {
  bindOnce(document.querySelector("[data-account-form]"), "submit", submitAccount);
  bindOnce(document.querySelector("[data-friend-form]"), "submit", submitFriendRequest);
  bindOnce(document.querySelector("[data-invite-form]"), "submit", submitInvite);
  bindOnce(document.querySelector("[data-notification-permission]"), "click", requestNotificationPermission);
  bindOnce(document.querySelector("[data-invite-form] select[name='gameSlug']"), "change", handleInviteGameChange);
  bindOnce(document.querySelector("[data-voice-form]"), "submit", submitVoiceRoom);
  bindOnce(document.querySelector("[data-voice-form] input[name='roomId']"), "change", handleVoiceRoomChange);
  bindOnce(document.querySelector("[data-voice-refresh]"), "click", refreshVoiceState);
  bindOnce(document.querySelector("[data-voice-copy]"), "click", copyVoiceRoomCode);
}

function bindOnce(element, eventName, handler) {
  if (!element) return;
  const key = `data-bound-${eventName}-${handler.name}`;
  if (element.getAttribute(key) === "1") return;
  element.addEventListener(eventName, handler);
  element.setAttribute(key, "1");
}

function renderFeedbackFeed() {
  const list = document.querySelector("[data-feedback-list]");
  if (list) list.innerHTML = renderFeedback();
}

async function submitAnnouncement(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-announcement-status]");
  const formData = new FormData(form);
  const payload = {
    password: formData.get("password"),
    title: formData.get("title"),
    message: formData.get("message"),
  };
  status.textContent = "Kontrol ediliyor...";
  try {
    const response = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "announcement-failed");
    latestAnnouncements = data;
    form.reset();
    status.textContent = "Duyuru yayımlandı.";
    renderAnnouncementFeed();
  } catch (error) {
    status.textContent = error?.message === "invalid-password"
      ? "Şifre yanlış."
      : "Duyuru yayımlanamadı. Tekrar dene.";
  }
}

async function submitAccount(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-account-status]");
  const formData = new FormData(form);
  const payload = {
    sessionId,
    name: formData.get("name"),
    nickname: formData.get("nickname"),
  };
  status.textContent = "Kontrol ediliyor...";
  try {
    const avatarFile = formData.get("avatar");
    if (avatarFile instanceof File && avatarFile.size > 0) {
      payload.avatarUrl = await fileToDataUrl(avatarFile);
    }
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "account-failed");
    latestSocial = data;
    form.reset();
    status.textContent = "Hesap oluşturuldu.";
    renderSocialDashboard();
    maybeNotifySocialChanges();
  } catch (error) {
    status.textContent = error?.message === "nickname-taken"
      ? "Bu takma ad alınmış."
      : error?.message === "invalid-account"
        ? "İsim ve takma ad gerekli."
        : error?.message === "avatar-too-large"
          ? "Profil resmi fazla büyük."
          : "Hesap oluşturulamadı.";
  }
}

async function submitFriendRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-friend-status]");
  const formData = new FormData(form);
  const payload = {
    sessionId,
    targetNickname: formData.get("targetNickname"),
    message: formData.get("message"),
  };
  status.textContent = "Gönderiliyor...";
  try {
    const response = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "friend-request-failed");
    latestSocial = data;
    form.reset();
    status.textContent = "Arkadaş isteği gönderildi.";
    renderSocialDashboard();
  } catch (error) {
    status.textContent = error?.message === "account-missing"
      ? "Önce hesap oluştur."
      : error?.message === "user-not-found"
        ? "Bu takma ad bulunamadı."
        : error?.message === "already-friends"
          ? "Zaten arkadaşsınız."
          : "İstek gönderilemedi.";
  }
}

async function submitInvite(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-invite-status]");
  const formData = new FormData(form);
  const payload = {
    sessionId,
    targetNickname: formData.get("targetNickname"),
    gameSlug: formData.get("gameSlug"),
    message: formData.get("message"),
  };
  status.textContent = "Gönderiliyor...";
  try {
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "invite-failed");
    latestSocial = data;
    form.reset();
    persistInviteGameSlug(selectedInviteGameSlug);
    status.textContent = "Davet gönderildi.";
    renderSocialDashboard();
  } catch (error) {
    status.textContent = error?.message === "not-friends"
      ? "Önce arkadaş olmanız gerekiyor."
      : error?.message === "user-not-found"
        ? "Bu takma ad bulunamadı."
        : "Davet gönderilemedi.";
  }
}

async function submitVoiceRoom(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.querySelector("[data-voice-status]");
  const roomId = new FormData(form).get("roomId");
  const nextRoomId = typeof roomId === "string" ? roomId.trim() : "";
  if (!nextRoomId) {
    status.textContent = "Oda kodu gerekli.";
    return;
  }
  selectedVoiceRoomId = nextRoomId;
  localStorage.setItem("hakorocks-voice-room", selectedVoiceRoomId);
  const isConnected = Boolean(voiceClient?.connected);
  const sameRoom = isConnected && voiceClient.roomId === selectedVoiceRoomId;
  if (isConnected && sameRoom) {
    await leaveVoiceRoom();
    return;
  }
  if (isConnected) await leaveVoiceRoom();
  try {
    await ensureVoiceClient();
    await voiceClient.join(selectedVoiceRoomId);
    updateBadgeState((state) => {
      state.voiceRoomJoined = true;
    });
    status.textContent = `Sesli odaya girildi: ${selectedVoiceRoomId}`;
    await refreshVoiceState();
  } catch (error) {
    status.textContent = error?.message === "microphone-denied"
      ? "Mikrofon izni gerekli."
      : "Sesli oda açılamadı.";
  }
}

function handleVoiceRoomChange(event) {
  selectedVoiceRoomId = event.currentTarget.value.trim() || "hakorocks-oda";
  localStorage.setItem("hakorocks-voice-room", selectedVoiceRoomId);
}

async function refreshVoiceState() {
  try {
    const response = await fetch(`/api/voice?sessionId=${encodeURIComponent(sessionId)}`);
    latestVoice = await response.json();
    if (latestVoice.roomId) {
      selectedVoiceRoomId = latestVoice.roomId;
      localStorage.setItem("hakorocks-voice-room", selectedVoiceRoomId);
    }
    renderSocialDashboard();
  } catch {
    latestVoice = createFallbackVoice();
    renderSocialDashboard();
  }
}

async function copyVoiceRoomCode() {
  const code = latestVoice.roomId || selectedVoiceRoomId;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    const status = document.querySelector("[data-voice-status]");
    if (status) status.textContent = "Oda kodu kopyalandı.";
  } catch {
    const status = document.querySelector("[data-voice-status]");
    if (status) status.textContent = "Kopyalama başarısız oldu.";
  }
}

async function leaveVoiceRoom() {
  if (!voiceClient) return;
  await voiceClient.leave();
  latestVoice = createFallbackVoice();
  renderSocialDashboard();
}

async function ensureVoiceClient() {
  if (voiceClient) return voiceClient;
  const account = latestSocial.account;
  if (!account) throw new Error("account-missing");
  voiceClient = new VoiceChatClient({
    sessionId,
    accountId: account.id,
    accountName: account.name,
    accountNickname: account.nickname,
    onState: (state) => {
      latestVoice = state;
      renderSocialDashboard();
    },
    onStatus: (text) => {
      const status = document.querySelector("[data-voice-status]");
      if (status) status.textContent = text;
    }
  });
  return voiceClient;
}

class VoiceChatClient {
  constructor({ sessionId: clientSessionId, accountId, accountName, accountNickname, onState, onStatus }) {
    this.sessionId = clientSessionId;
    this.accountId = accountId;
    this.accountName = accountName;
    this.accountNickname = accountNickname;
    this.onState = onState;
    this.onStatus = onStatus;
    this.roomId = "";
    this.ws = null;
    this.connected = false;
    this.localStream = null;
    this.peers = new Map();
    this.audioElements = new Map();
    this.participants = [];
  }

  async join(roomId) {
    const cleanRoomId = String(roomId || "").trim();
    if (!cleanRoomId) throw new Error("invalid-room");
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }).catch(() => {
        throw new Error("microphone-denied");
      });
    }
    await this.connect();
    this.roomId = cleanRoomId;
    this.send({
      type: "join",
      sessionId: this.sessionId,
      roomId: this.roomId,
      accountId: this.accountId,
      name: this.accountName,
      nickname: this.accountNickname,
    });
    this.connected = true;
    this.onStatus(`Sesli oda bekleniyor: ${this.roomId}`);
    return true;
  }

  async leave() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: "leave" });
    }
    this.cleanupPeers();
    this.stopLocalStream();
    this.closeSocket();
    this.connected = false;
    this.roomId = "";
    this.onState(createFallbackVoice());
    this.onStatus("Sesli sohbet kapandı.");
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${location.host}/voice`);
      this.ws = socket;
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("voice-socket-failed")), { once: true });
      socket.addEventListener("message", (event) => this.handleMessage(event.data));
      socket.addEventListener("close", () => {
        this.cleanupPeers();
        this.connected = false;
        if (this.roomId) this.onStatus("Sesli oda bağlantısı kapandı.");
      });
    });
  }

  closeSocket() {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
  }

  stopLocalStream() {
    if (!this.localStream) return;
    for (const track of this.localStream.getTracks()) track.stop();
    this.localStream = null;
  }

  cleanupPeers() {
    for (const peer of this.peers.values()) peer.close();
    for (const audio of this.audioElements.values()) audio.remove();
    this.peers.clear();
    this.audioElements.clear();
    this.participants = [];
  }

  handleMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (message.type === "voice-state") {
      this.participants = Array.isArray(message.participants) ? message.participants : [];
      this.onState({ roomId: message.roomId || "", self: this.participantSnapshot(), participants: this.participants });
      this.syncPeers();
      this.onStatus(`Sesli oda: ${message.roomId || "hazır"}`);
      return;
    }
    if (message.type === "voice-signal") {
      void this.handleSignal(message.from, message.signal);
      return;
    }
    if (message.type === "voice-error") {
      this.onStatus("Sesli oda hatası oluştu.");
    }
  }

  participantSnapshot() {
    return {
      id: this.accountId,
      name: this.accountName,
      nickname: this.accountNickname,
      avatarUrl: latestSocial.account?.avatarUrl || "",
    };
  }

  syncPeers() {
    if (!this.connected) return;
    const desiredPeers = this.participants.filter((participant) => participant.id && participant.id !== this.accountId);
    for (const participant of desiredPeers) {
      if (!this.peers.has(participant.id)) {
        this.createPeer(participant.id, this.accountId < participant.id);
      }
    }
    for (const peerId of [...this.peers.keys()]) {
      if (!desiredPeers.some((participant) => participant.id === peerId)) {
        this.removePeer(peerId);
      }
    }
  }

  async handleSignal(from, signal) {
    if (!signal || !from) return;
    const peer = this.peers.get(from) || this.createPeer(from, false);
    if (signal.description) {
      await peer.setRemoteDescription(signal.description);
      if (signal.description.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        this.sendSignal(from, { description: peer.localDescription });
      }
    }
    if (signal.candidate) {
      try {
        await peer.addIceCandidate(signal.candidate);
      } catch {
        this.onStatus("Ses sinyali reddedildi.");
      }
    }
  }

  createPeer(peerId, shouldOffer) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) peer.addTrack(track, this.localStream);
    }
    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate) this.sendSignal(peerId, { candidate: event.candidate });
    });
    peer.addEventListener("track", (event) => {
      const audio = this.audioElements.get(peerId) || document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true;
      audio.srcObject = event.streams[0];
      audio.volume = 1;
      if (!this.audioElements.has(peerId)) document.body.appendChild(audio);
      this.audioElements.set(peerId, audio);
    });
    peer.addEventListener("connectionstatechange", () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        this.removePeer(peerId);
      }
    });
    this.peers.set(peerId, peer);
    if (shouldOffer) {
      peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .then(() => this.sendSignal(peerId, { description: peer.localDescription }))
        .catch(() => this.onStatus("Ses bağlantısı başlatılamadı."));
    }
    return peer;
  }

  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) peer.close();
    this.peers.delete(peerId);
    const audio = this.audioElements.get(peerId);
    if (audio) audio.remove();
    this.audioElements.delete(peerId);
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  sendSignal(to, signal) {
    this.send({ type: "signal", to, signal });
  }
}

function handleInviteGameChange(event) {
  selectedInviteGameSlug = event.currentTarget.value;
  persistInviteGameSlug(selectedInviteGameSlug);
}

function persistInviteGameSlug(value) {
  localStorage.setItem("hakorocks-invite-game", value);
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    const status = document.querySelector("[data-account-status]");
    if (status) status.textContent = "Bu tarayıcı bildirimleri desteklemiyor.";
    return;
  }
  notificationPermission = await Notification.requestPermission();
  const status = document.querySelector("[data-account-status]");
  if (status) {
    status.textContent = notificationPermission === "granted"
      ? "Masaüstü bildirimleri açıldı."
      : "Bildirim izni verilmedi.";
  }
}

function handleAccountActions(event) {
  const button = event.target.closest?.("[data-friend-response]");
  if (!button) return;
  void respondFriendRequest(button.dataset.requestId, button.dataset.friendResponse);
}

async function respondFriendRequest(requestId, action) {
  try {
    const response = await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, requestId, action }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "request-response-failed");
    latestSocial = data;
    renderSocialDashboard();
  } catch {
    const status = document.querySelector("[data-account-status]");
    if (status) status.textContent = "İstek güncellenemedi.";
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem("hakorocks-sound", soundEnabled ? "on" : "off");
  updateSoundButton();
  playUiSound("toggle");
}

function updateSoundButton() {
  const button = document.querySelector("[data-sound-toggle]");
  if (!button) return;
  button.textContent = `Ses: ${soundEnabled ? "Açık" : "Kapalı"}`;
  button.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
}

function playUiSound(type = "click") {
  if (!soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(type === "toggle" ? 520 : 340, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(type === "toggle" ? 680 : 430, audioContext.currentTime + 0.08);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.11);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
}

function bindTrailer() {
  const stage = document.querySelector("[data-trailer-stage]");
  document.querySelector("[data-trailer-play]")?.addEventListener("click", () => {
    updateBadgeState((state) => {
      state.trailerPlayed = true;
    });
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
    const [statsResponse, photosResponse, ratingsResponse, guestbookResponse, feedbackResponse, announcementsResponse, accountResponse, voiceResponse] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/photos"),
      fetch("/api/ratings"),
      fetch("/api/guestbook"),
      fetch("/api/feedback"),
      fetch("/api/announcements"),
      fetch(`/api/account?sessionId=${encodeURIComponent(sessionId)}`),
      fetch(`/api/voice?sessionId=${encodeURIComponent(sessionId)}`),
    ]);
    latestStats = await statsResponse.json();
    latestPhotos = await photosResponse.json();
    latestRatings = await ratingsResponse.json();
    latestGuestbook = await guestbookResponse.json();
    latestFeedback = await feedbackResponse.json();
    latestAnnouncements = await announcementsResponse.json();
    latestSocial = await accountResponse.json();
    latestVoice = await voiceResponse.json();
    if (latestVoice.roomId) {
      selectedVoiceRoomId = latestVoice.roomId;
      localStorage.setItem("hakorocks-voice-room", selectedVoiceRoomId);
    }
  } catch {
    latestStats = createFallbackStats();
    latestSocial = createFallbackSocial();
    latestVoice = createFallbackVoice();
  }

  renderLiveData();
  renderAnnouncementFeed();
  renderFeedbackFeed();
  renderSocialDashboard();
  maybeNotifySocialChanges();
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

  renderPhotoGrid();
  renderGuestbookList();
  renderBadgeGrid();
}

const header = document.querySelector("[data-header]");
window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
});

bindGameCards();
bindTrailer();
updateSoundButton();
renderBadgeGrid();
renderFeedbackFeed();
renderAnnouncementFeed();
renderSocialDashboard();
refreshLiveData();
setInterval(refreshLiveData, 10000);

function maybeNotifySocialChanges() {
  if (!("Notification" in window) || notificationPermission !== "granted" || !latestSocial.account) return;
  const seenRequests = new Set(JSON.parse(localStorage.getItem("hakorocks-seen-requests") || "[]"));
  const seenInvites = new Set(JSON.parse(localStorage.getItem("hakorocks-seen-invites") || "[]"));
  const unseenRequests = latestSocial.incomingRequests.filter((request) => !seenRequests.has(request.id));
  const unseenInvites = latestSocial.invites.filter((invite) => !seenInvites.has(invite.id));

  for (const request of unseenRequests) {
    new Notification("Yeni arkadaş isteği", {
      body: `${request.from?.nickname || "Birisi"} sana arkadaşlık isteği gönderdi.`,
    });
    seenRequests.add(request.id);
  }

  for (const invite of unseenInvites) {
    new Notification("Yeni oyun daveti", {
      body: `${invite.from?.nickname || "Birisi"} seni ${invite.gameSlug} için davet etti.`,
    });
    seenInvites.add(invite.id);
  }

  localStorage.setItem("hakorocks-seen-requests", JSON.stringify([...seenRequests]));
  localStorage.setItem("hakorocks-seen-invites", JSON.stringify([...seenInvites]));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 250_000) {
      reject(new Error("avatar-too-large"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("avatar-read-failed"));
    reader.readAsDataURL(file);
  });
}
