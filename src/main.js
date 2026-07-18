import "./styles.css";
import {
  BUILD_VERSION,
  communityEvents,
  devDiaryEntries,
  developerBlogPosts,
  gameExtras,
  musicOptions,
  notificationCards,
  randomTasks,
  seasonInfo,
  surpriseBoxes,
  tournamentCalendar,
  upcomingUpdateCards,
  voteOptions,
} from "./studio-roadmap.js";

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
    mobileStatus: "Mobil hazır",
    mobileNote: "Kendi mobil seçim ekranı, dokunmatik hareket düğmeleri ve dokunarak bakış desteği var.",
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
    mobileStatus: "Dokunarak oynanır",
    mobileNote: "Bardak seçimi ve menüler dokunmatik için sıkılaştırıldı; üst panel telefonda daha az yer kaplar.",
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
    controllerBadge: "Gamepad",
    gamepadNote: "Fiziksel gamepad, klavye ve mobil dokunmatik kontrollerle oynanır.",
    mobileStatus: "Yeni mobil gamepad",
    mobileNote: "Sol hareket, sağ bakış alanı, saldırı ve öfke düğmeleri ortak mobil kontrol katmanına bağlandı.",
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
    controllerBadge: "Mobil gamepad",
    gamepadNote: "Telefonda ekrandaki oyun kolu ile hareket ve aksiyon düğmeleri kullanılabilir.",
    mobileStatus: "Yeni mobil gamepad",
    mobileNote: "Hareket, nişan, yay, kılıç, ateşli ok ve demlik düğmeleri telefonda kullanılabilir.",
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
    controls: "Klavye, gamepad ve dokunmatik",
    controllerBadge: "Gamepad",
    gamepadNote: "Sol analog veya d-pad ile sür, A/RT ile park et; motor modunda X/Y halat, A/Start motor.",
    mobileStatus: "Mobil hazır",
    mobileNote: "Liman sürüşü, park etme ve halat kontrolleri için kendi dokunmatik düğmeleri var.",
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
    controls: "Klavye, gamepad ve dokunmatik",
    controllerBadge: "Gamepad",
    gamepadNote: "Sol analog veya d-pad ile hareket edilir; A hazır olur, Start oyunu başlatır.",
    mobileStatus: "Mobil hazır",
    mobileNote: "Oda girişi, renk seçimi, çember akışı ve hareket için mobil düzen korunup genişletildi.",
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
    controllerBadge: "Mobil gamepad",
    gamepadNote: "Telefonda yürüyüş, sürüş, kamera ve etkileşim için ekrandaki oyun kolu çalışır.",
    mobileStatus: "Yeni mobil gamepad",
    mobileNote: "Yürüme, sürüş, kamera, etkileşim, market ve fren/koş düğmeleri mobil oyun koluna bağlandı.",
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
    controllerBadge: "Mobil gamepad",
    gamepadNote: "Telefonda FPS hareketi, kamera, ateş ve üretim düğmeleri mobil oyun koluna bağlandı.",
    mobileStatus: "Yeni mobil gamepad",
    mobileNote: "FPS kamera, hareket, ateş, etkileşim, fener ve üretim tuşları mobil kontrol panelinden çalışır.",
    achievements: ["İlk robotu yok et", "Yeni silah üret", "Laboratuvar odalarını temizle"],
    updates: ["Babylon.js vendor dosyası üretim build'ine eklendi", "Tek oyunculu tarayıcı erişimi düzeltildi", "Fotoğraf kısayolu desteği eklendi"],
    stockBase: 173,
  },
];

const FUSION_GAME_PATH = "/oyunlar/birlesim-arenasi/";

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

const mobileFeatures = [
  {
    title: "Ortak mobil oyun kolu",
    description: "WASD isteyen oyunlara ekranda hareket, bakış ve aksiyon düğmeleri gelir.",
    label: "Yeni",
  },
  {
    title: "Tam ekran ve ana sayfa",
    description: "Oyun içinde H düğmesi ana merkeze döner; tam ekran düğmesi telefonda kolay erişilir.",
    label: "Hızlı",
  },
  {
    title: "Temiz HUD",
    description: "Vale, Robot Avcısı ve zindan ekranları telefonda daha az alan kaplayacak şekilde toparlandı.",
    label: "Mobil",
  },
  {
    title: "Fotoğraf rozeti",
    description: "Ö tuşu rozeti mobil kontrol panelinin üstüne çıkmaz; oyun fotoğrafları vitrine düşer.",
    label: "Paylaş",
  },
];

const newsItems = [
  {
    date: "Mobil",
    title: "Oyunlara mobil kontrol modu geldi",
    description: "Eşsiz Zindan, Skeleton Wars, Vale ve Robot Avcısı için ortak dokunmatik oyun kolu eklendi.",
  },
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
  {
    id: "favorite",
    title: "Favori Seçici",
    description: "Bir oyunu favorilerine ekledin.",
    isUnlocked: (state) => (state.favoriteGames || []).length > 0,
  },
  {
    id: "commenter",
    title: "Yorumcu",
    description: "Bir oyun için yorum yazdın.",
    isUnlocked: (state) => (Number(state.commentCount) || 0) > 0,
  },
  {
    id: "voter",
    title: "Topluluk Oyuncusu",
    description: "Yeni oyun oylamasına katıldın.",
    isUnlocked: (state) => Boolean(state.votedIdea),
  },
  {
    id: "photo-like",
    title: "Fotoğraf Beğenisi",
    description: "Bir oyun fotoğrafını beğendin.",
    isUnlocked: (state) => (Number(state.photoLikes) || 0) > 0,
  },
  {
    id: "surprise",
    title: "Sürpriz Kutusu",
    description: "Günlük sürpriz kutusunu açtın.",
    isUnlocked: (state) => Boolean(state.surpriseOpened),
  },
  {
    id: "easter",
    title: "Gizli İpucu",
    description: "Hakorocks gizli ipucunu buldun.",
    isUnlocked: (state) => Boolean(state.easterEggFound),
  },
  {
    id: "launcher",
    title: "Launcher Pilotu",
    description: "Hakorocks Launcher merkezini kullandın.",
    isUnlocked: (state) => Boolean(state.launcherOpened),
  },
  {
    id: "bot-chat",
    title: "HakoBot Sohbetçisi",
    description: "HakoBot ile yazılı sohbet ettin.",
    isUnlocked: (state) => (Number(state.botMessages) || 0) > 0,
  },
  {
    id: "click-master",
    title: "Kare Ustası",
    description: "1 dakikalık kare oyununda skor yaptın.",
    isUnlocked: (state) => (Number(state.clickGameBest) || 0) > 0,
  },
];

const dailyBadgePool = [
  {
    id: "daily-rhgpo",
    title: "Günün Kaptanı",
    description: "Bugünün rozetinde RHGPO'yu aç ve limana doğru yola çık.",
    isUnlocked: (state) => state.playedGames.includes("rhgpo"),
  },
  {
    id: "daily-shadow",
    title: "Gizli Dedektif",
    description: "Siyah Adam odasına girerek bugünün sosyal rozetini aç.",
    isUnlocked: (state) => state.playedGames.includes("siyah-adam"),
  },
  {
    id: "daily-dungeon",
    title: "Zindan Nöbetçisi",
    description: "Eşsiz Zindan'ı aç ve bugünün aksiyon rozetini yakala.",
    isUnlocked: (state) => state.playedGames.includes("essiz-zindan"),
  },
  {
    id: "daily-skeleton",
    title: "Kemik Savaşçısı",
    description: "Skeleton Wars oynayanlara bugünün savaş rozeti gelir.",
    isUnlocked: (state) => state.playedGames.includes("skeleton-wars"),
  },
  {
    id: "daily-vale",
    title: "Vale Ustası",
    description: "Vale oyununu aç ve bugünün park görevine başla.",
    isUnlocked: (state) => state.playedGames.includes("vale"),
  },
  {
    id: "daily-robot",
    title: "Robot Avcısı Günü",
    description: "Robot Avcısı'nı açarak laboratuvar rozetini kazan.",
    isUnlocked: (state) => state.playedGames.includes("robot-avcisi"),
  },
  {
    id: "daily-photo",
    title: "Günün Fotoğrafçısı",
    description: "Bir oyun ekranında Ö tuşu ile fotoğraf çek.",
    isUnlocked: (state) => state.photoCount > 0,
  },
  {
    id: "daily-critic",
    title: "Yıldız Hakemi",
    description: "Bir oyuna puan ver ve bugünün eleştirmen rozetini aç.",
    isUnlocked: (state) => state.ratedGames.length > 0,
  },
  {
    id: "daily-guest",
    title: "Defter İmzası",
    description: "Ziyaretçi defterine kısa bir mesaj bırak.",
    isUnlocked: (state) => Boolean(state.guestbook),
  },
  {
    id: "daily-trailer",
    title: "Fragman Saati",
    description: "HAKO ROCKS fragmanını oynat ve bugünün sahne rozetini al.",
    isUnlocked: (state) => Boolean(state.trailerPlayed),
  },
  {
    id: "daily-mobile",
    title: "Mobil Oyuncu",
    description: "Mobil oyun modu bölümünü keşfet ve oyunları telefona hazır gör.",
    isUnlocked: (state) => Boolean(state.visitedAt),
  },
  {
    id: "daily-collector",
    title: "Rozet Toplayıcı",
    description: "En az üç farklı oyunu açarak günlük koleksiyonu büyüt.",
    isUnlocked: (state) => state.playedGames.length >= 3,
  },
];

const DAILY_BADGE_COUNT = 6;

const leagueDefinitions = [
  { id: "acemi", title: "Acemi", minPoints: 0, short: "A", tone: "green" },
  { id: "acemi-plus", title: "Acemi+", minPoints: 100, short: "A+", tone: "cyan" },
  { id: "bakir", title: "Bakır", minPoints: 260, short: "B", tone: "copper" },
  { id: "elmas", title: "Elmas", minPoints: 520, short: "E", tone: "diamond" },
  { id: "efsanevi", title: "Efsanevi", minPoints: 900, short: "EF", tone: "legend" },
];

const leaguePointValues = {
  game: 35,
  details: 8,
  rating: 22,
  photo: 45,
  guestbook: 24,
  trailer: 18,
  voice: 35,
  fusion: 60,
  launcher: 10,
  bot: 16,
  clickGame: 30,
};

const tournamentTemplates = [
  {
    id: "hakorocks-cup",
    title: "Hakorocks Kupası",
    status: "Kayıt açık",
    rule: "Bugünün seçilen oyunlarında puan topla, haftalık tabloda yüksel.",
    prize: "Şampiyon rozeti + özel kişiler adaylığı",
  },
  {
    id: "fusion-cup",
    title: "Birleşim Arenası",
    status: "Günlük mod",
    rule: "Her gün iki oyun birleşir; ana oyuna diğer oyundan özellik eklenir ve mod çok oyunculu sayılır.",
    prize: "Birleşim madalyası",
  },
  {
    id: "league-sprint",
    title: "Lig Sıra Atlama",
    status: "Sürekli",
    rule: "Oyun aç, fotoğraf çek, puan ver ve görevleri bitirerek Acemi'den Efsanevi'ye çık.",
    prize: "Lig madalyası ve profil rozeti",
  },
];

const fusionFeaturePool = [
  "çok oyunculu takım yarışı",
  "ortak skor hedefi",
  "gece-gündüz görev turu",
  "boss veya final dalgası",
  "parkur + savaş karışımı",
  "harita üstünde gizli hedef",
  "oyuncular arası yardım puanı",
  "son dakika oylaması",
];

const leagueMedalDefinitions = [
  { id: "ilk-puan", title: "İlk Puan", description: "Lig puanı kazandın.", isEarned: (state) => state.points > 0 },
  { id: "uc-oyun", title: "3 Oyun", description: "Üç farklı oyun açtın.", isEarned: (_state, badges) => badges.playedGames.length >= 3 },
  { id: "bes-oyun", title: "5 Oyun", description: "Beş farklı oyun açtın.", isEarned: (_state, badges) => badges.playedGames.length >= 5 },
  { id: "birlesim", title: "Birleşim Avcısı", description: "Bugünün birleşen iki oyununu da açtın.", isEarned: (state) => isFusionCompleted(dailyBadgeKey(), state) },
  { id: "efsanevi-gorev", title: "Efsanevi Görev", description: "Günlük 5 efsanevi görevini tamamladın.", isEarned: (state) => areLegendaryTasksComplete(dailyBadgeKey(), state) },
  { id: "ozel-kisi", title: "Özel Kişi", description: "Özel kişiler ligine girdin.", isEarned: (state) => Boolean(state.eliteMember) },
];

const specialPeopleBase = [
  { name: "Hakan Umut", nickname: "hakorocks", league: "Efsanevi", points: 1120 },
  { name: "Test Bot 1", nickname: "testbot1", league: "Efsanevi", points: 1085 },
  { name: "Test Bot 2", nickname: "testbot2", league: "Elmas", points: 820 },
  { name: "Test Bot 3", nickname: "testbot3", league: "Elmas", points: 790 },
  { name: "Studio Arkadaşı", nickname: "studio", league: "Bakır", points: 560 },
  { name: "Kupa Oyuncusu", nickname: "kupa", league: "Bakır", points: 540 },
  { name: "Zindan Ustası", nickname: "zindan", league: "Acemi+", points: 430 },
  { name: "Robot Takımı", nickname: "robot", league: "Acemi+", points: 410 },
  { name: "RHGPO Kaptanı", nickname: "kaptan", league: "Acemi", points: 330 },
  { name: "Siyah Dedektif", nickname: "dedektif", league: "Acemi", points: 315 },
];

const specialChallengers = [
  { name: "Yeni Meydan Okuyan", nickname: "challenger", league: "Elmas", points: 760 },
  { name: "Mobil Şampiyon", nickname: "mobil", league: "Bakır", points: 650 },
  { name: "Birleşim Uzmanı", nickname: "birlesim", league: "Elmas", points: 780 },
  { name: "Günlük Görevci", nickname: "gorevci", league: "Bakır", points: 620 },
];

const sessionId = getSessionId();
const gameMap = new Map(games.map((game) => [game.slug, game]));
let badgeState = ensureBadgeState();
let leagueState = refreshLeagueState(ensureLeagueState());
let latestStats = createFallbackStats();
let latestPhotos = [];
let latestRatings = createFallbackRatings();
let latestGuestbook = [];
let latestFeedback = [];
let latestAnnouncements = [];
let latestComments = createFallbackComments();
let latestVotes = createFallbackVotes();
let latestHealth = createFallbackHealth();
let latestSocial = createFallbackSocial();
let latestVoice = createFallbackVoice();
let latestClickGame = createFallbackClickGame();
let notificationPermission = "Notification" in window ? Notification.permission : "default";
let selectedGame = games[0];
let selectedPhotoFilter = "all";
let selectedInviteGameSlug = localStorage.getItem("hakorocks-invite-game") || "robot-avcisi";
let selectedVoiceRoomId = localStorage.getItem("hakorocks-voice-room") || "hakorocks-oda";
let voiceClient = null;
let soundEnabled = localStorage.getItem("hakorocks-sound") !== "off";
let favoriteGames = ensureFavoriteGames();
let selectedTheme = localStorage.getItem("hakorocks-theme") || "dark";
let selectedMusic = localStorage.getItem("hakorocks-music") || musicOptions[0].id;
let surpriseState = ensureSurpriseState();
let launcherQuery = "";
let launcherMode = "all";
let hakoBotAnswer = "HakoBot hazır. Bir butona basınca sana kısa öneri verir.";
let hakoBotMessages = ensureHakoBotMessages();
let micTestStatus = "Mikrofon testi bekliyor.";
let performanceState = createPerformanceState();
let clickGameState = createClickGameState();
let clickGameTimerId = 0;
let millionHState = {
  visible: false,
  copied: false,
  status: "",
};
let millionHTextCache = "";
let audioContext;

document.documentElement.dataset.theme = selectedTheme;

document.querySelector("#app").innerHTML = `
  <header class="site-header" data-header>
    <a class="brand" href="#top" aria-label="Hakorocks Studio ana sayfa">
      <span class="brand-mark">H</span>
      <span>Hakorocks Studio</span>
    </a>
    <nav class="nav" aria-label="Ana menü">
      <a href="#launcher">Launcher</a>
      <a href="#oyunlar">Oyunlar</a>
      <a href="#bot">HakoBot</a>
      <a href="#pulse">Pulse</a>
      <a href="#mini-oyun">Mini oyun</a>
      <a href="#canli">Canlı</a>
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
          <a class="button primary" href="#launcher">Launcher'ı aç</a>
          <a class="button secondary" href="#bot">HakoBot'a sor</a>
          <button class="button secondary" type="button" data-random-game>Rastgele oyun</button>
        </div>
      </div>
      <aside class="hero-panel" aria-label="Stüdyo özeti">
        <strong>8 oyun</strong>
        <span>Tek domain altında yayında</span>
      </aside>
    </section>

    <section class="section launcher-section" id="launcher" aria-labelledby="launcher-title">
      <div class="section-heading">
        <p class="eyebrow">Hakorocks Launcher</p>
        <h2 id="launcher-title">Oyun konsolu gibi hızlı seçim merkezi.</h2>
        <p class="section-note">
          Devam et, favorilerini aç, rastgele oyuna gir veya arama yap. Oyunlar tek ekranda karşılaştırılır.
        </p>
      </div>
      <div data-launcher-hub>
        ${renderLauncherHub()}
      </div>
    </section>

    <section class="section bot-section" id="bot" aria-labelledby="bot-title">
      <div class="section-heading">
        <p class="eyebrow">HakoBot</p>
        <h2 id="bot-title">Siteyle ilgili soru sorabileceğin yazılı bot.</h2>
        <p class="section-note">
          Oyunlar, launcher, rozetler, fotoğraflar, mini oyun, yayın durumu veya aklına gelen basit sorular için yaz.
        </p>
      </div>
      <div data-hakobot-panel>
        ${renderHakoBotChat()}
      </div>
    </section>

    <section class="section pulse-section" id="pulse" aria-labelledby="pulse-title">
      <div class="section-heading">
        <p class="eyebrow">Studio Pulse</p>
        <h2 id="pulse-title">Sitenin canlı enerjisi tek panelde.</h2>
        <p class="section-note">
          Oyun önerisi, görev akışı, bot hareketi ve mini oyun hazırlığı burada canlı bir stüdyo ekranı gibi görünür.
        </p>
      </div>
      <div data-pulse-panel>
        ${renderStudioPulse()}
      </div>
    </section>

    <section class="section click-game-section" id="mini-oyun" aria-labelledby="click-game-title">
      <div class="section-heading">
        <p class="eyebrow">Mini oyun</p>
        <h2 id="click-game-title">1 dakikada kareye kaç kez basabilirsin?</h2>
        <p class="section-note">
          Süre başlayınca ortadaki kareye hızlıca bas. 60 saniye bitince skorunu liderlik tablosuna gönder.
        </p>
      </div>
      <div data-click-game-panel>
        ${renderClickGame()}
      </div>
    </section>

    <section class="section spotlight-section" id="birlesim" aria-labelledby="spotlight-title">
      <div class="section-heading">
        <p class="eyebrow">Günün büyük modu</p>
        <h2 id="spotlight-title">Bugün iki oyun birleşiyor.</h2>
        <p class="section-note">
          Birinci oyundan ana hedefin yarısı, ikinci oyundan özel kuralın yarısı alınır.
          24 saat sonra yeni birleşim gelir.
        </p>
      </div>
      <div data-spotlight-panel>
        ${renderFusionSpotlight()}
      </div>
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

    <section class="section mobile-section" id="mobil" aria-labelledby="mobile-title">
      <div class="section-heading">
        <p class="eyebrow">Mobil oyun modu</p>
        <h2 id="mobile-title">Telefonla oynarken de oyun kolu ekranda.</h2>
        <p class="section-note">
          Mobilde zorlanan oyunlar için ortak kontrol paneli eklendi. Hareket, bakış, ateş,
          etkileşim ve tam ekran düğmeleri artık oyun içinde görünür.
        </p>
      </div>
      <div class="mobile-showcase">
        <article class="phone-preview" aria-label="Mobil oyun kolu önizlemesi">
          <div class="phone-screen">
            <div class="phone-scene">
              <span>Hakorocks</span>
              <strong>Mobil oyun modu</strong>
            </div>
            <div class="phone-controls">
              <div class="phone-dpad">
                <span>W</span>
                <span>A</span>
                <span>S</span>
                <span>D</span>
              </div>
              <div class="phone-look">Bakış</div>
              <div class="phone-actions">
                <span>Ateş</span>
                <span>E</span>
                <span>F</span>
              </div>
            </div>
          </div>
        </article>
        <div class="mobile-feature-grid">
          ${mobileFeatures.map(renderMobileFeature).join("")}
        </div>
      </div>
      <div class="mobile-status-grid">
        ${games.map(renderMobileStatus).join("")}
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
      <div class="enriched-grid" data-enriched-stats>
        ${renderEnrichedStats()}
      </div>
    </section>

    <section class="section tournament-section" id="turnuvalar" aria-labelledby="tournament-title">
      <div class="section-heading">
        <p class="eyebrow">Turnuvalar ve ligler</p>
        <h2 id="tournament-title">Günlük oyun birleşimi, ligler ve özel kişiler.</h2>
        <p class="section-note">
          Her gün iki oyun birleşir; seçilen ana oyun çok oyunculu turnuva moduna döner ve diğer oyundan özellik alır.
          Oyun açtıkça puan kazanıp lig atlarsın.
        </p>
      </div>
      <div class="tournament-dashboard" data-tournament-dashboard>
        ${renderTournamentDashboard()}
      </div>
    </section>

    <section class="section badges-section" id="rozetler" aria-labelledby="badges-title">
      <div class="section-heading">
        <p class="eyebrow">Görevler ve rozetler</p>
        <h2 id="badges-title">Bugünün rozetleri her gün değişir.</h2>
        <p class="section-note">
          ${dailyBadgeDateLabel()} için seçilen rozetler üstte görünür; yarın yeni görevler gelir.
        </p>
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
      <div data-weekly-photo>
        ${renderWeeklyPhoto()}
      </div>
      <div class="filter-bar" aria-label="Fotoğraf filtreleri">
        ${renderPhotoFilters()}
      </div>
      <div class="photo-grid" data-photo-grid>
        ${renderPhotoGallery()}
      </div>
    </section>

    <section class="section community-section" id="topluluk" aria-labelledby="community-title">
      <div class="section-heading">
        <p class="eyebrow">Topluluk</p>
        <h2 id="community-title">Yorumlar, oylamalar ve etkinlikler.</h2>
        <p class="section-note">Yeni oyun fikrine oy ver, son yorumları gör, mikrofonunu test et ve topluluk etkinliklerini takip et.</p>
      </div>
      <div data-community-hub>
        ${renderCommunityHub()}
      </div>
    </section>

    <section class="section studio-section" id="studio" aria-labelledby="studio-title">
      <div class="section-heading">
        <p class="eyebrow">Studio merkezi</p>
        <h2 id="studio-title">Geliştirici günlüğü, istatistikler ve eğlence.</h2>
        <p class="section-note">Günün duyurusu, yakında gelecekler, HakoBot, tema, müzik ve geliştirici modu burada.</p>
      </div>
      <div data-studio-hub>
        ${renderStudioHub()}
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

    <section class="section million-h-section" id="milyon-h" aria-labelledby="million-h-title">
      ${renderMillionHSection()}
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

function renderMillionHSection() {
  const text = millionHState.visible ? getMillionHText() : "";
  return `
    <div class="million-h-panel">
      <div class="section-heading compact">
        <p class="eyebrow">1 milyon h</p>
        <h2 id="million-h-title">Bana tıkla.</h2>
        <p class="section-note">
          Düğmeye basınca altta 1.000.000 tane h oluşur. İstersen panoya kopyalayabilirsin.
        </p>
      </div>
      <button class="button primary" type="button" data-million-h-toggle>
        ${millionHState.visible ? "1.000.000 h hazır" : "Bana tıkla"}
      </button>
      ${millionHState.visible ? `
        <div class="million-h-result">
          <p class="million-h-warning">
            Not: Bilgisayar kopyalayamayabilir veya bazı kısmını kopyalamaz. Sebep: metin çok büyük.
          </p>
          <button class="button secondary" type="button" data-million-h-copy>Panoya kopyala</button>
          <p class="form-status" data-million-h-status aria-live="polite">${millionHState.status}</p>
          <textarea class="million-h-output" readonly spellcheck="false" aria-label="1 milyon tane h">${text}</textarea>
        </div>
      ` : ""}
    </div>
  `;
}

function getMillionHText() {
  if (!millionHTextCache) millionHTextCache = "h".repeat(1_000_000);
  return millionHTextCache;
}

function renderMillionHPanel() {
  const panel = document.querySelector("#milyon-h");
  if (panel) panel.innerHTML = renderMillionHSection();
}

function renderLauncherHub() {
  const recommended = getLauncherRecommendedGame();
  const continueGame = getLauncherContinueGame();
  const launcherGames = getLauncherGames();
  const activeCount = latestStats.playing ?? 0;
  return `
    <div class="launcher-layout">
      <article class="launcher-console poster-${recommended.accent}">
        <div class="launcher-console-copy">
          <span class="status-pill">Bugünün önerisi</span>
          <h3>${recommended.title}</h3>
          <p>${recommended.description}</p>
          <div class="launcher-actions">
            <button class="button primary" type="button" data-game-open="${recommended.slug}" data-launcher-use>Detayını aç</button>
            <a class="button secondary" href="${recommended.path}" data-play-game="${recommended.slug}" data-launcher-use>Oyuna gir</a>
            <button class="button secondary" type="button" data-continue-game data-launcher-use>Devam et: ${continueGame.title}</button>
          </div>
        </div>
        <div class="launcher-console-stats">
          <div><strong>${games.length}</strong><span>oyun</span></div>
          <div><strong>${favoriteGames.length}</strong><span>favori</span></div>
          <div><strong>${activeCount}</strong><span>aktif</span></div>
        </div>
      </article>

      <aside class="launcher-radar">
        <div class="account-box-head">
          <h3>Görev radarı</h3>
          <span class="status-pill">${renderLauncherMissionCount()}</span>
        </div>
        <div class="launcher-mission-list">
          ${renderLauncherMissions()}
        </div>
      </aside>

      <section class="launcher-library">
        <div class="launcher-toolbar">
          <div class="segmented" aria-label="Launcher filtresi">
            ${[
              ["all", "Tümü"],
              ["favorites", "Favoriler"],
              ["recent", "Son oynanan"],
              ["hard", "Zorlar"],
            ].map(([mode, label]) => `
              <button type="button" data-launcher-mode="${mode}" class="${launcherMode === mode ? "is-active" : ""}">${label}</button>
            `).join("")}
          </div>
          <label class="launcher-search">
            <span>Oyun ara</span>
            <input data-launcher-search value="${escapeHtml(launcherQuery)}" maxlength="40" placeholder="Robot, zindan, vale..." />
          </label>
          <button class="button secondary" type="button" data-random-game data-launcher-use>Rastgele oyun</button>
        </div>
        <div class="launcher-game-grid" data-launcher-grid>
          ${launcherGames.length ? launcherGames.map(renderLauncherGameCard).join("") : renderLauncherEmpty()}
        </div>
      </section>
    </div>
  `;
}

function renderLauncherMissionCount() {
  const missions = getLauncherMissions();
  return `${missions.filter((mission) => mission.done).length}/${missions.length}`;
}

function getLauncherMissions() {
  return [
    {
      title: "Launcher merkezini kullan",
      detail: "Bir oyun detayını, devam et veya rastgele oyunu launcher içinden aç.",
      done: Boolean(badgeState.launcherOpened),
    },
    {
      title: "Favori oyun seç",
      detail: "Bir oyunu favorilere ekle.",
      done: favoriteGames.length > 0,
    },
    {
      title: "HakoBot'a yaz",
      detail: "Bot bölümünde site veya oyunlar hakkında soru sor.",
      done: (Number(badgeState.botMessages) || 0) > 0,
    },
    {
      title: "Kare oyununda skor yap",
      detail: "1 dakikalık mini oyunda liderlik tablosuna gir.",
      done: (Number(badgeState.clickGameBest) || 0) > 0,
    },
  ];
}

function renderLauncherMissions() {
  return getLauncherMissions().map((mission) => `
    <article class="launcher-mission ${mission.done ? "is-done" : ""}">
      <span>${mission.done ? "Tamam" : "Bekliyor"}</span>
      <strong>${mission.title}</strong>
      <small>${mission.detail}</small>
    </article>
  `).join("");
}

function renderLauncherGameCard(game) {
  const extra = gameExtra(game);
  const stats = latestStats.games?.[game.slug] ?? createGameStat(game, 0);
  const isFavorite = favoriteGames.includes(game.slug);
  const comments = latestComments.games?.[game.slug]?.length ?? 0;
  const media = game.image
    ? `<img src="${game.image}" alt="${game.title} oyun kapağı" loading="lazy" />`
    : `<div class="game-poster poster-${game.accent}" aria-hidden="true"><span>${game.title.slice(0, 2)}</span></div>`;
  return `
    <article class="launcher-game-card">
      <div class="launcher-game-media">${media}</div>
      <div class="launcher-game-body">
        <div class="game-meta">
          <span>${game.type}</span>
          <span>${extra.difficulty}</span>
          <span>${extra.averagePlayTime}</span>
        </div>
        <h3>${game.title}</h3>
        <p>${game.description}</p>
        <div class="launcher-game-stats">
          <span>${Math.round(stats.value ?? game.stockBase)} index</span>
          <span>${stats.opens ?? 0} açılış</span>
          <span>${comments} yorum</span>
        </div>
        ${renderProgressBar(extra.progress, "Hazırlık")}
        <div class="launcher-game-actions">
          <button class="button primary" type="button" data-game-open="${game.slug}" data-launcher-use>Detay</button>
          <a class="button secondary" href="${game.path}" data-play-game="${game.slug}" data-launcher-use>Oyna</a>
          <button class="favorite-button ${isFavorite ? "is-active" : ""}" type="button" data-favorite-game="${game.slug}" aria-pressed="${isFavorite ? "true" : "false"}">
            ${isFavorite ? "Favoride" : "Favori"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderLauncherEmpty() {
  return `
    <article class="launcher-empty">
      <h3>Bu filtrede oyun yok</h3>
      <p>Aramayı temizle veya tüm oyunlara dön.</p>
      <button class="button secondary" type="button" data-launcher-mode="all">Tümünü göster</button>
    </article>
  `;
}

function getLauncherRecommendedGame() {
  return games[hashString(`${dailyBadgeKey()}:launcher`) % games.length];
}

function getLauncherContinueGame() {
  const recent = [...badgeState.playedGames].reverse().find((slug) => gameMap.has(slug));
  return gameMap.get(recent) || getLauncherRecommendedGame();
}

function getLauncherGames() {
  const query = launcherQuery.trim().toLocaleLowerCase("tr-TR");
  let list = [...games];
  if (launcherMode === "favorites") {
    list = favoriteGames.map((slug) => gameMap.get(slug)).filter(Boolean);
  } else if (launcherMode === "recent") {
    list = [...new Set([...badgeState.playedGames].reverse())].map((slug) => gameMap.get(slug)).filter(Boolean);
  } else if (launcherMode === "hard") {
    list = list.filter((game) => gameExtra(game).difficulty === "Zor");
  }
  if (!query) return list;
  return list.filter((game) => [
    game.title,
    game.type,
    game.description,
    gameExtra(game).difficulty,
  ].some((value) => value.toLocaleLowerCase("tr-TR").includes(query)));
}

function renderHakoBotChat() {
  return `
    <div class="hakobot-layout">
      <article class="hakobot-console">
        <div class="hakobot-head">
          <div>
            <span class="status-pill">Yazılı sohbet</span>
            <h3>HakoBot</h3>
          </div>
          <button class="button secondary" type="button" data-bot-clear>Sohbeti temizle</button>
        </div>
        <div class="hakobot-messages" aria-live="polite">
          ${hakoBotMessages.map(renderHakoBotMessage).join("")}
        </div>
        <form class="hakobot-form" data-hakobot-form>
          <label>
            Mesaj
            <input name="message" maxlength="180" placeholder="Örn: En zor oyun hangisi?" autocomplete="off" required />
          </label>
          <button class="button primary" type="submit">Gönder</button>
          <p class="form-status" data-hakobot-status aria-live="polite"></p>
        </form>
      </article>
      <aside class="hakobot-side">
        <h3>Hızlı sorular</h3>
        <div class="hakobot-quick-list">
          ${[
            "Oyunlar nerede?",
            "Launcher ne işe yarar?",
            "En zor oyun hangisi?",
            "Mini oyun nasıl çalışacak?",
            "Site canlıya nasıl geçer?",
            "Rozet nasıl kazanılır?",
          ].map((question) => `
            <button type="button" data-bot-quick="${escapeHtml(question)}">${question}</button>
          `).join("")}
        </div>
      </aside>
    </div>
  `;
}

function renderHakoBotMessage(message) {
  const isBot = message.role === "bot";
  return `
    <article class="hakobot-message ${isBot ? "is-bot" : "is-user"}">
      <strong>${isBot ? "HakoBot" : "Sen"}</strong>
      <p>${escapeHtml(message.text)}</p>
    </article>
  `;
}

function ensureHakoBotMessages() {
  const fallback = [{
    role: "bot",
    text: "Merhaba, ben HakoBot. Bana oyunları, rozetleri, launcher'ı, mini oyunu veya siteyi sorabilirsin.",
    createdAt: new Date().toISOString(),
  }];
  try {
    const stored = JSON.parse(localStorage.getItem("hakorocks-bot-messages") || "[]");
    if (!Array.isArray(stored) || !stored.length) return fallback;
    return stored
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        role: item.role === "user" ? "user" : "bot",
        text: String(item.text || "").slice(0, 240),
        createdAt: item.createdAt || new Date().toISOString(),
      }))
      .filter((item) => item.text)
      .slice(-18);
  } catch {
    return fallback;
  }
}

function saveHakoBotMessages() {
  localStorage.setItem("hakorocks-bot-messages", JSON.stringify(hakoBotMessages.slice(-18)));
}

function renderHakoBotPanel() {
  const panel = document.querySelector("[data-hakobot-panel]");
  if (panel) panel.innerHTML = renderHakoBotChat();
  bindOnce(document.querySelector("[data-hakobot-form]"), "submit", submitHakoBotChat);
}

function submitHakoBotChat(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.message;
  const message = String(input.value || "").trim();
  const status = form.querySelector("[data-hakobot-status]");
  if (message.length < 2) {
    if (status) status.textContent = "Biraz daha uzun yaz.";
    return;
  }
  pushHakoBotConversation(message);
  form.reset();
}

function pushHakoBotConversation(message) {
  const answer = createHakoBotReply(message);
  const now = new Date().toISOString();
  hakoBotMessages = [
    ...hakoBotMessages,
    { role: "user", text: message, createdAt: now },
    { role: "bot", text: answer, createdAt: now },
  ].slice(-18);
  hakoBotAnswer = answer;
  saveHakoBotMessages();
  updateBadgeState((state) => {
    state.botMessages = (Number(state.botMessages) || 0) + 1;
  });
  awardLeaguePoints(`bot:${dailyBadgeKey()}`, leaguePointValues.bot, { action: "bot" });
  renderHakoBotPanel();
  renderStudioPanel();
  renderLauncherPanel();
  renderStudioPulsePanel();
}

function createHakoBotReply(message) {
  const text = message.toLocaleLowerCase("tr-TR");
  const compactText = text.replace(/\s+/g, " ").trim();
  const hardGames = games.filter((game) => gameExtra(game).difficulty === "Zor").map((game) => game.title).join(", ");
  const favorite = getMostLovedGame();
  const fusion = getDailyFusion();
  const mentionedGame = games.find((game) => includesAny(text, [
    game.title.toLocaleLowerCase("tr-TR"),
    game.slug,
    game.slug.replaceAll("-", " "),
  ]));
  if (!compactText) {
    return "Bir şey yazarsan cevap verebilirim. Oyun, rozet, mini oyun, fotoğraf veya canlı yayın diye sorabilirsin.";
  }
  if (includesAny(text, ["merhaba", "selam", "günaydın", "gunaydin"])) {
    return "Merhaba. Hakorocks Studio'da oyunlara bakabilir, yorum yazabilir, fotoğraf beğenebilir ve mini oyunda skor kasabilirsin.";
  }
  if (includesAny(text, ["nasılsın", "nasilsin", "iyi misin", "napıyon", "napıyorsun", "ne yapıyorsun"])) {
    return "Ben iyiyim. Şu an Hakorocks Studio için oyun önerisi, rozet bilgisi, canlı yayın durumu ve mini oyun yardımı verebilirim.";
  }
  if (includesAny(text, ["teşekkür", "tesekkur", "sağ ol", "sag ol", "eyvallah"])) {
    return "Rica ederim. Yeni bir oyun fikri, site bölümü veya mini oyun taktiği sorabilirsin.";
  }
  if (includesAny(text, ["yardım", "yardim", "help", "ne sorabilirim", "komut", "komutlar"])) {
    return "Bana şunları sorabilirsin: en zor oyun, mini oyun nasıl çalışır, rozet nasıl kazanılır, fotoğraf nerede, canlıya nasıl geçer, bugünün birleşimi ne.";
  }
  if (includesAny(text, ["komik", "şaka", "saka", "espri"])) {
    return "Hakorocks şakası: 1 milyon h yazdık ama Google bile 'bu kadar heyecan fazla' dedi.";
  }
  if (includesAny(text, ["1 milyon", "1000000", "milyon h", "bana tıkla", "bana tikla", "panoya", "kopyala"])) {
    return "En alttaki Bana tıkla alanı 1.000.000 tane h üretir. Panoya kopyala düğmesi var ama metin çok büyük olduğu için bazı yerler kabul etmeyebilir.";
  }
  if (mentionedGame) {
    const extra = gameExtra(mentionedGame);
    return `${mentionedGame.title}: ${mentionedGame.description} Zorluk: ${extra.difficulty}, ortalama süre: ${extra.averagePlayTime}. Launcher'dan detayını açabilirsin.`;
  }
  if (includesAny(text, ["launcher", "başlatıcı", "baslatici", "konsol"])) {
    return "Launcher oyun seçme merkezi. Favoriler, son oynananlar, zor oyun filtresi, arama ve rastgele oyun aynı yerde durur.";
  }
  if (includesAny(text, ["zor", "zorluk", "en zor"])) {
    return `Zor oyunlar: ${hardGames}. Başlamak için Robot Avcısı iyi bir meydan okuma olur.`;
  }
  if (includesAny(text, ["mini", "kare", "tık", "tik", "lider", "skor"])) {
    return "Mini oyun 1 dakika sürecek. Ortadaki kareye her basışın sayılacak ve skorun liderlik tablosunda diğer oyuncularla karşılaştırılacak.";
  }
  if (includesAny(text, ["rozet", "profil", "ödül", "odul", "xp", "lp"])) {
    return `Rozetler oyun açma, favori seçme, yorum yazma, HakoBot'a yazma ve mini oyun skoru ile açılır. Şu an en sevilen oyunun: ${favorite}.`;
  }
  if (includesAny(text, ["foto", "fotoğraf", "fotograf", "beğen", "begen"])) {
    return "Oyunlarda Ö tuşuyla fotoğraf çekilebilir. Fotoğraflar sitede görünür; beğeniler haftanın fotoğrafını öne çıkarır.";
  }
  if (includesAny(text, ["yorum", "topluluk", "oylama"])) {
    return "Topluluk bölümünde oyun yorumları, yeni oyun oylaması, etkinlikler ve geliştirici blogu var.";
  }
  if (includesAny(text, ["birleşim", "birlesim", "günün", "gunun"])) {
    return `Bugünün birleşimi ${fusion.base.title} + ${fusion.source.title}. Özel kural: ${fusion.feature}.`;
  }
  if (includesAny(text, ["yayın", "yayin", "deploy", "coolify", "canlı", "canli", "push"])) {
    return "Canlıya geçmek için değişiklikler commit + push yapılır. Coolify main branch'ten yeni Docker build alıp siteyi yayınlar.";
  }
  if (includesAny(text, ["pulse", "enerji", "akış", "akis", "canlı akış", "canli akis"])) {
    return "Studio Pulse, sitenin canlı enerji paneli. Önerilen oyun, görev durumu, yorumlar, bot mesajları ve mini oyun skorunu tek yerde gösterir.";
  }
  if (includesAny(text, ["tema", "ışık", "isik", "karanlık", "karanlik", "müzik", "muzik", "ses"])) {
    return "Studio merkezinde tema ve müzik seçenekleri var. Üstteki Ses düğmesi arayüz biplerini açıp kapatır.";
  }
  if (includesAny(text, ["arkadaş", "arkadas", "davet", "hesap", "profil resmi", "takma ad"])) {
    return "Hesap bölümünde profil oluşturabilir, takma ad seçebilir, arkadaş isteği ve oyun daveti gönderebilirsin.";
  }
  if (includesAny(text, ["ne var", "özellik", "ozellik", "neler var", "site ne"])) {
    return "Sitede Launcher, HakoBot, Studio Pulse, mini oyun, liderlik tablosu, fotoğraf alanı, yorumlar, rozetler ve oyun vitrini var.";
  }
  if (includesAny(text, ["sen kimsin", "bot", "hakobot"])) {
    return "Ben HakoBot. Hakorocks Studio içinde çalışan yazılı yardımcıyım; siteyi gezmene ve oyun seçmene yardım ederim.";
  }
  if (includesAny(text, ["oyun", "oyna", "nerede", "hangi"])) {
    return `Sitede ${games.length} oyun var. En hızlı yol Launcher bölümünü açmak. Bugünün önerisi ${getLauncherRecommendedGame().title}.`;
  }
  return `Bunu tam çözemedim ama yardımcı olayım: "${message.slice(0, 60)}" için oyunlar, rozetler, mini oyun, fotoğraf, Pulse veya canlı yayın tarafından birini sorarsan daha net cevap veririm.`;
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function renderStudioPulse() {
  const recommended = getLauncherRecommendedGame();
  const fusion = getDailyFusion();
  const missions = getLauncherMissions();
  const doneCount = missions.filter((mission) => mission.done).length;
  const pulsePercent = Math.max(12, Math.min(100, Math.round((doneCount / missions.length) * 100) + (latestStats.playing || 0) * 4));
  return `
    <div class="pulse-layout">
      <article class="pulse-stage">
        <div class="pulse-orbit" aria-hidden="true">
          <span>H</span>
        </div>
        <div class="pulse-copy">
          <span class="status-pill">Canlı stüdyo</span>
          <h3>${recommended.title}</h3>
          <p>Bugünün önerisi launcher'da hazır. Birleşim modu ${fusion.base.title} + ${fusion.source.title} olarak çalışıyor.</p>
          <div class="pulse-meter">
            <div><span style="width:${pulsePercent}%"></span></div>
            <strong>%${pulsePercent}</strong>
          </div>
        </div>
      </article>

      <aside class="pulse-feed-panel">
        <div class="account-box-head">
          <h3>Canlı akış</h3>
          <span class="status-pill">${latestHealth.status}</span>
        </div>
        <div class="pulse-feed">
          ${getPulseFeedItems().map((item) => `
            <article>
              <span>${item.label}</span>
              <strong>${item.value}</strong>
              <small>${item.detail}</small>
            </article>
          `).join("")}
        </div>
      </aside>

      <section class="pulse-action-panel">
        <a class="button primary" href="#launcher">Launcher'a git</a>
        <a class="button secondary" href="#bot">HakoBot'a yaz</a>
        <a class="button secondary" href="#mini-oyun">Mini oyuna hazırlan</a>
        <button class="button secondary" type="button" data-random-game>Rastgele oyun seç</button>
      </section>
    </div>
  `;
}

function getPulseFeedItems() {
  const fusion = getDailyFusion();
  const commentsTotal = latestComments.total || 0;
  return [
    {
      label: "Aktif oyuncu",
      value: String(latestStats.playing ?? 0),
      detail: `${latestStats.siteOpen ?? 1} cihaz stüdyoda açık.`,
    },
    {
      label: "Bot mesajı",
      value: String(badgeState.botMessages || 0),
      detail: "HakoBot sohbet rozeti için sayılır.",
    },
    {
      label: "Görev durumu",
      value: renderLauncherMissionCount(),
      detail: "Launcher görev radarındaki ilerleme.",
    },
    {
      label: "Yorumlar",
      value: String(commentsTotal),
      detail: "Oyun detaylarında görünen toplam yorum.",
    },
    {
      label: "Kare skoru",
      value: String(latestClickGame.personalBest?.score ?? badgeState.clickGameBest ?? 0),
      detail: "1 dakikalık mini oyundaki en iyi skorun.",
    },
    {
      label: "Birleşim",
      value: `${fusion.base.title} + ${fusion.source.title}`,
      detail: fusion.feature,
    },
  ];
}

function renderStudioPulsePanel() {
  const panel = document.querySelector("[data-pulse-panel]");
  if (panel) panel.innerHTML = renderStudioPulse();
}

function renderClickGame() {
  const seconds = Math.ceil(clickGameState.remainingMs / 1000);
  const nameValue = getClickGameName();
  return `
    <div class="click-game-layout">
      <article class="click-arena">
        <div class="click-game-head">
          <div>
            <span class="status-pill">${clickGameState.running ? "Oyun başladı" : clickGameState.ended ? "Süre bitti" : "Hazır"}</span>
            <h3>Kare Sayacı</h3>
          </div>
          <div class="click-counters">
            <div><span>Süre</span><strong data-click-time>${formatClickTime(seconds)}</strong></div>
            <div><span>Skor</span><strong data-click-score>${clickGameState.score}</strong></div>
            <div><span>En iyi</span><strong>${latestClickGame.personalBest?.score ?? badgeState.clickGameBest ?? 0}</strong></div>
          </div>
        </div>

        <div class="click-square-stage">
          <button class="click-square" type="button" data-click-square ${clickGameState.running ? "" : "disabled"} aria-label="Ortadaki kareye bas">
            <span>${clickGameState.running ? clickGameState.score : "Başla"}</span>
          </button>
        </div>

        <div class="click-controls">
          <button class="button primary" type="button" data-click-start ${clickGameState.running ? "disabled" : ""}>
            ${clickGameState.ended ? "Tekrar başlat" : "60 saniyeyi başlat"}
          </button>
          <button class="button secondary" type="button" data-click-reset>Temizle</button>
          <p class="form-status" data-click-status aria-live="polite">${clickGameState.status}</p>
        </div>

        <form class="click-submit-form" data-click-submit-form>
          <label>
            Liderlik adı
            <input name="name" maxlength="32" value="${escapeHtml(nameValue)}" placeholder="Adın" ${clickGameState.ended ? "" : "disabled"} required />
          </label>
          <button class="button secondary" type="submit" ${clickGameState.ended && !clickGameState.submitted ? "" : "disabled"}>
            Skoru gönder
          </button>
        </form>
      </article>

      <aside class="click-leaderboard">
        <div class="account-box-head">
          <h3>Liderlik tablosu</h3>
          <span class="status-pill">${latestClickGame.totalPlayers || 0} oyuncu</span>
        </div>
        <div class="click-personal">
          <span>Senin en iyi skorun</span>
          <strong>${latestClickGame.personalBest?.score ?? badgeState.clickGameBest ?? 0}</strong>
        </div>
        <div class="click-leader-list">
          ${renderClickLeaders()}
        </div>
      </aside>
    </div>
  `;
}

function renderClickLeaders() {
  const leaders = latestClickGame.leaders || [];
  if (!leaders.length) {
    return `
      <article class="click-leader empty">
        <strong>İlk skor bekleniyor</strong>
        <span>60 saniyelik turu bitir ve ilk sıraya yerleş.</span>
      </article>
    `;
  }
  return leaders.map((leader) => `
    <article class="click-leader">
      <strong>${leader.rank}</strong>
      <div>
        <span>${escapeHtml(leader.name)}</span>
        <small>${formatDate(leader.updatedAt)}</small>
      </div>
      <em>${leader.score}</em>
    </article>
  `).join("");
}

function renderClickGamePanel() {
  const panel = document.querySelector("[data-click-game-panel]");
  if (panel) panel.innerHTML = renderClickGame();
  bindDynamicForms();
}

function getClickGameName() {
  return latestSocial.account?.nickname
    || localStorage.getItem("hakorocks-click-name")
    || "Hakorocks Oyuncusu";
}

function formatClickTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function revealMillionH() {
  millionHState = {
    visible: true,
    copied: false,
    status: "1.000.000 tane h oluşturuldu.",
  };
  renderMillionHPanel();
  requestAnimationFrame(() => {
    document.querySelector(".million-h-output")?.focus();
  });
}

async function copyMillionH() {
  const text = getMillionHText();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      copyMillionHFallback();
    }
    millionHState = {
      ...millionHState,
      copied: true,
      status: "Panoya kopyalandı. Çok büyük olduğu için yapıştırırken bilgisayar zorlanabilir.",
    };
  } catch {
    const copied = copyMillionHFallback();
    millionHState = {
      ...millionHState,
      copied,
      status: copied
        ? "Eski yöntemle kopyalandı. Çok büyük olduğu için bazı programlar tamamını alamayabilir."
        : "Kopyalama başarısız oldu. Metin çok büyük olabilir; istersen kutudan elle seçebilirsin.",
    };
  }
  renderMillionHPanel();
}

function copyMillionHFallback() {
  const output = document.querySelector(".million-h-output");
  if (!output) return false;
  output.focus();
  output.select();
  output.setSelectionRange(0, output.value.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

function startClickGame() {
  clearInterval(clickGameTimerId);
  clickGameState = {
    durationMs: 60_000,
    remainingMs: 60_000,
    score: 0,
    running: true,
    ended: false,
    submitted: false,
    startedAt: performance.now(),
    status: "Süre başladı. Ortadaki kareye bas.",
  };
  renderClickGamePanel();
  clickGameTimerId = setInterval(tickClickGame, 100);
}

function tickClickGame() {
  if (!clickGameState.running) return;
  const elapsed = performance.now() - clickGameState.startedAt;
  clickGameState.remainingMs = Math.max(0, clickGameState.durationMs - elapsed);
  updateClickGameReadout();
  if (clickGameState.remainingMs <= 0) finishClickGame();
}

function updateClickGameReadout() {
  const timeNode = document.querySelector("[data-click-time]");
  const scoreNode = document.querySelector("[data-click-score]");
  if (timeNode) timeNode.textContent = formatClickTime(Math.ceil(clickGameState.remainingMs / 1000));
  if (scoreNode) scoreNode.textContent = String(clickGameState.score);
  const squareLabel = document.querySelector("[data-click-square] span");
  if (squareLabel) squareLabel.textContent = clickGameState.running ? String(clickGameState.score) : "Başla";
}

function pressClickSquare() {
  if (!clickGameState.running) return;
  clickGameState.score += 1;
  updateClickGameReadout();
  if (clickGameState.score % 25 === 0) playTone(560, 0.05);
}

function finishClickGame() {
  clearInterval(clickGameTimerId);
  clickGameState = {
    ...clickGameState,
    remainingMs: 0,
    running: false,
    ended: true,
    status: `Süre bitti. Skorun ${clickGameState.score}. Liderlik tablosuna gönderebilirsin.`,
  };
  updateBadgeState((state) => {
    state.clickGameBest = Math.max(Number(state.clickGameBest) || 0, clickGameState.score);
  });
  awardLeaguePoints(`click-game:${dailyBadgeKey()}`, leaguePointValues.clickGame, { action: "click-game" });
  renderClickGamePanel();
  renderLauncherPanel();
  renderStudioPulsePanel();
}

function resetClickGame() {
  clearInterval(clickGameTimerId);
  clickGameState = createClickGameState();
  renderClickGamePanel();
}

async function submitClickGameScore(event) {
  event.preventDefault();
  if (!clickGameState.ended || clickGameState.submitted) return;
  const form = event.currentTarget;
  const status = document.querySelector("[data-click-status]");
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim() || getClickGameName();
  localStorage.setItem("hakorocks-click-name", name);
  if (status) status.textContent = "Skor gönderiliyor...";
  try {
    const response = await fetch("/api/click-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        name,
        score: clickGameState.score,
        durationMs: clickGameState.durationMs,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "click-score-failed");
    latestClickGame = data;
    clickGameState = {
      ...clickGameState,
      submitted: true,
      status: "Skor liderlik tablosuna gönderildi.",
    };
    updateBadgeState((state) => {
      state.clickGameBest = Math.max(Number(state.clickGameBest) || 0, clickGameState.score);
    });
    renderClickGamePanel();
  } catch {
    if (status) status.textContent = "Skor gönderilemedi. Tekrar dene.";
  }
}

function renderFusionSpotlight() {
  const fusion = getDailyFusion();
  const fusionStats = latestStats.games?.["birlesim-arenasi"] ?? { playing: 0, opens: 0 };
  const likedFusions = getTopFusions();
  return `
    <div class="spotlight-layout">
      <article class="spotlight-card poster-${fusion.base.accent}">
        <div class="spotlight-copy">
          <span class="status-pill">24 saatlik mod</span>
          <h3>${fusion.base.title} + ${fusion.source.title}</h3>
          <p>
            ${fusion.base.title} ana hedefiyle başla; ${fusion.source.title} içinden gelen
            <strong>${fusion.feature}</strong> kuralı modu değiştirir.
          </p>
          <div class="spotlight-actions">
            <a
              class="button primary"
              href="${FUSION_GAME_PATH}?base=${fusion.base.slug}&source=${fusion.source.slug}"
              data-play-game="birlesim-arenasi"
              data-fusion-base="${fusion.base.slug}"
              data-fusion-source="${fusion.source.slug}"
            >Birleşimi oyna</a>
            <button class="button secondary" type="button" data-random-game>Rastgele oyun</button>
          </div>
        </div>
        <div class="spotlight-meter" aria-label="Birleşim bilgileri">
          <div><strong data-fusion-countdown>${fusionCountdownText()}</strong><span>yeni birleşime kaldı</span></div>
          <div><strong>${fusionStats.playing ?? 0}</strong><span>şu an oynayan</span></div>
          <div><strong>${fusionStats.opens ?? 0}</strong><span>bugünkü açılış</span></div>
        </div>
      </article>
      <aside class="spotlight-side">
        <section class="mini-panel">
          <h3>Birleşim görevleri</h3>
          <div class="legendary-task-list">
            ${renderFusionTasks()}
          </div>
        </section>
        <section class="mini-panel">
          <h3>Geçmiş birleşimler</h3>
          <div class="archive-list">
            ${getFusionArchive().map((item) => `
              <span>${item.day}: ${item.base.title} + ${item.source.title}</span>
            `).join("")}
          </div>
        </section>
        <section class="mini-panel">
          <h3>En sevilen birleşimler</h3>
          <div class="archive-list">
            ${likedFusions.map((item) => `
              <span>${item.base.title} + ${item.source.title} · ${item.likes} beğeni</span>
            `).join("")}
          </div>
        </section>
      </aside>
    </div>
  `;
}

function renderFusionTasks(dayKey = dailyBadgeKey()) {
  const fusion = getDailyFusion(dayKey);
  const daily = leagueState.daily?.[dayKey] || {};
  const played = Array.isArray(daily.games) ? daily.games : [];
  const tasks = [
    { title: `${fusion.base.title} ana kuralını dene`, done: played.includes(fusion.base.slug) },
    { title: `${fusion.source.title} özellik kuralını dene`, done: played.includes(fusion.source.slug) },
    { title: "Birleşim Arenası'nı aç", done: played.includes("birlesim-arenasi") || isFusionCompleted(dayKey) },
  ];
  return tasks.map((task) => `
    <article class="legendary-task ${task.done ? "is-done" : ""}">
      <span>${task.done ? "Bitti" : "Görev"}</span>
      <strong>${task.title}</strong>
      <small>Birleşim rozeti için gerekli.</small>
    </article>
  `).join("");
}

function getFusionArchive(count = 5) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index - 1);
    const dayKey = dailyBadgeKey(date);
    const fusion = getDailyFusion(dayKey);
    return {
      day: dailyBadgeDateLabel(dayKey),
      ...fusion,
    };
  });
}

function getTopFusions() {
  return getFusionArchive(8)
    .map((item) => ({
      ...item,
      likes: 12 + (hashString(`${item.base.slug}:${item.source.slug}:likes`) % 88),
    }))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 3);
}

function fusionCountdownText(date = new Date()) {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  const remaining = Math.max(0, next.getTime() - date.getTime());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `${String(hours).padStart(2, "0")}s ${String(minutes).padStart(2, "0")}dk`;
}

function renderSpotlightPanel() {
  const panel = document.querySelector("[data-spotlight-panel]");
  if (panel) panel.innerHTML = renderFusionSpotlight();
}

function renderLauncherPanel() {
  const panel = document.querySelector("[data-launcher-hub]");
  if (panel) panel.innerHTML = renderLauncherHub();
  bindDynamicForms();
}

function markLauncherUsed() {
  updateBadgeState((state) => {
    state.launcherOpened = true;
  });
  awardLeaguePoints(`launcher:${dailyBadgeKey()}`, leaguePointValues.launcher, { action: "launcher" });
}

function renderGamepadBadge(game, extraClass = "") {
  if (!game.controllerBadge) return "";
  const className = ["gamepad-chip", extraClass].filter(Boolean).join(" ");
  return `<span class="${className}"><i class="gamepad-icon" aria-hidden="true"></i>${game.controllerBadge}</span>`;
}

function renderGameCard(game, index) {
  const extra = gameExtra(game);
  const isFavorite = favoriteGames.includes(game.slug);
  const commentCount = latestComments.games?.[game.slug]?.length ?? 0;
  const media = game.image
    ? `<img src="${game.image}" alt="${game.title} oyun görseli" loading="lazy" />`
    : `<div class="game-poster poster-${game.accent}" aria-hidden="true"><span>${String(index + 1).padStart(2, "0")}</span></div>`;

  return `
    <article class="game-card">
      <div class="game-card-inner">
        <button class="game-card-link" type="button" data-game-open="${game.slug}" aria-label="${game.title} detaylarını aç">
          <div class="game-media">${media}</div>
          <div class="game-body">
            <div class="game-meta">
              <span>${game.type}</span>
              <span>${game.status}</span>
              <span>${game.mobileStatus}</span>
              <span class="updated-chip">Yeni: ${extra.lastUpdated}</span>
              ${renderGamepadBadge(game)}
            </div>
            <h3>${game.title}</h3>
            <p>${game.description}</p>
            <div class="game-card-stats">
              <span>${extra.difficulty}</span>
              <span>${extra.averagePlayTime}</span>
              <span>${commentCount} yorum</span>
            </div>
            ${renderProgressBar(extra.progress)}
            <span class="detail-link">Detayları aç</span>
          </div>
        </button>
        <div class="game-card-actions">
          <a class="play-link" href="${game.path}" data-play-game="${game.slug}">Oyunu aç</a>
          <button class="favorite-button ${isFavorite ? "is-active" : ""}" type="button" data-favorite-game="${game.slug}" aria-pressed="${isFavorite ? "true" : "false"}">
            ${isFavorite ? "Favoride" : "Favori"}
          </button>
        </div>
      </div>
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

function renderMobileFeature(item) {
  return `
    <article class="mobile-feature-card">
      <span>${item.label}</span>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
    </article>
  `;
}

function renderMobileStatus(game) {
  return `
    <article class="mobile-status-card">
      <div class="status-card-tags">
        <span>${game.mobileStatus}</span>
        ${renderGamepadBadge(game, "compact")}
      </div>
      <h3>${game.title}</h3>
      <p>${game.mobileNote}</p>
      <a href="${game.path}" data-play-game="${game.slug}">Oyna</a>
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

function createFallbackClickGame() {
  return {
    durationSeconds: 60,
    totalPlayers: 0,
    personalBest: null,
    leaders: [],
  };
}

function createClickGameState() {
  return {
    durationMs: 60_000,
    remainingMs: 60_000,
    score: 0,
    running: false,
    ended: false,
    submitted: false,
    status: "Hazır. Başlatınca 60 saniye sayacak.",
  };
}

function createFallbackComments() {
  return {
    total: 0,
    games: Object.fromEntries(games.map((game) => [game.slug, []])),
    list: [],
  };
}

function createFallbackVotes() {
  return {
    options: Object.fromEntries(voteOptions.map((option) => [option.id, 0])),
    total: 0,
  };
}

function createFallbackHealth() {
  return {
    ok: true,
    status: "Yerel",
    buildVersion: BUILD_VERSION,
    activeServer: "tarayıcı",
    uptimeSeconds: 0,
    onlinePlayers: 0,
  };
}

function ensureFavoriteGames() {
  try {
    const stored = JSON.parse(localStorage.getItem("hakorocks-favorites") || "[]");
    return Array.isArray(stored) ? stored.filter((slug) => gameMap.has(slug)) : [];
  } catch {
    return [];
  }
}

function saveFavoriteGames() {
  localStorage.setItem("hakorocks-favorites", JSON.stringify(favoriteGames));
}

function ensureSurpriseState() {
  const today = dailyBadgeKey();
  try {
    const stored = JSON.parse(localStorage.getItem("hakorocks-surprise") || "{}");
    return {
      dayKey: stored.dayKey || "",
      opened: Boolean(stored.opened && stored.dayKey === today),
      message: stored.dayKey === today ? (stored.message || "") : "",
    };
  } catch {
    return { dayKey: "", opened: false, message: "" };
  }
}

function saveSurpriseState() {
  localStorage.setItem("hakorocks-surprise", JSON.stringify(surpriseState));
}

function createPerformanceState() {
  return {
    fps: 0,
    ping: 0,
    memory: "Ölçülmedi",
  };
}

function gameExtra(game) {
  return gameExtras[game.slug] || {
    progress: 55,
    difficulty: "Orta",
    averagePlayTime: "6 dk",
    lastUpdated: "Yayında",
    hiddenAchievements: ["Gizli görev"],
    wiki: {
      characters: [game.title],
      weapons: ["Kontrol sistemi"],
      craft: ["Oyna + keşfet = yeni fikir"],
    },
    changelog: game.updates || [],
  };
}

function renderProgressBar(value, label = "Tamamlama") {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return `
    <div class="progress-box" aria-label="${label}">
      <div class="progress-head"><span>${label}</span><strong>%${percent}</strong></div>
      <div class="progress-track"><span style="width:${percent}%"></span></div>
    </div>
  `;
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
  const accountLeague = getCurrentLeague();
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
          <div class="profile-league">
            ${renderLeagueMedal(accountLeague, "small")}
            <span>${leagueState.points} LP · ${leagueState.medals.length} madalya</span>
          </div>
        </div>
      </div>
      <div class="account-metrics">
        <div><strong>${friends.length}</strong><span>arkadaş</span></div>
        <div><strong>${incomingRequests.length}</strong><span>istek</span></div>
        <div><strong>${invites.length}</strong><span>davet</span></div>
      </div>
      ${renderProfileExtension()}
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

function renderProfileExtension() {
  const completion = getProfileCompletion();
  const mostLoved = getMostLovedGame();
  const recentPlayed = [...badgeState.playedGames].slice(-4).reverse();
  const rareBadges = badgeDefinitions.filter((badge) => badge.isUnlocked(badgeState)).slice(-4);
  const recentPhotos = latestPhotos.slice(0, 3);
  const rewardReady = badgeState.dailyRewardClaimedDay !== dailyBadgeKey();
  return `
    <div class="profile-dashboard-grid">
      <article>
        <span>Giriş serisi</span>
        <strong>${badgeState.dailyStreak || 1} gün</strong>
      </article>
      <article>
        <span>Günlük ödül</span>
        <button class="button secondary" type="button" data-daily-reward ${rewardReady ? "" : "disabled"}>
          ${rewardReady ? "Ödülü al" : "Alındı"}
        </button>
      </article>
      <article>
        <span>En sevilen oyun</span>
        <strong>${mostLoved}</strong>
      </article>
      <article>
        <span>Profil tamamlama</span>
        ${renderProgressBar(completion, "Profil")}
      </article>
      <article class="wide">
        <span>Nadir rozet vitrini</span>
        <div class="profile-chip-row">
          ${rareBadges.length ? rareBadges.map((badge) => `<em>${badge.title}</em>`).join("") : "<em>Henüz rozet bekliyor</em>"}
        </div>
      </article>
      <article class="wide">
        <span>Son oynananlar</span>
        <div class="profile-chip-row">
          ${recentPlayed.length ? recentPlayed.map((slug) => `<em>${gameTitle(slug)}</em>`).join("") : "<em>Henüz oyun açılmadı</em>"}
        </div>
      </article>
      <article class="wide">
        <span>Son fotoğraflar</span>
        <div class="profile-chip-row">
          ${recentPhotos.length ? recentPhotos.map((photo) => `<em>${escapeHtml(photo.gameTitle || gameTitle(photo.slug))}</em>`).join("") : "<em>Fotoğraf bekleniyor</em>"}
        </div>
      </article>
    </div>
  `;
}

function getProfileCompletion() {
  const checks = [
    Boolean(latestSocial.account),
    badgeState.playedGames.length > 0,
    badgeState.ratedGames.length > 0,
    (badgeState.favoriteGames || []).length > 0,
    (Number(badgeState.commentCount) || 0) > 0,
    badgeState.photoCount > 0,
    Boolean(badgeState.guestbook),
    Boolean(badgeState.votedIdea),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getMostLovedGame() {
  const favorite = favoriteGames[0] || badgeState.favoriteGames?.[0];
  if (favorite) return gameTitle(favorite);
  const rated = badgeState.ratedGames[0];
  if (rated) return gameTitle(rated);
  const played = badgeState.playedGames[badgeState.playedGames.length - 1];
  return played ? gameTitle(played) : "Henüz seçilmedi";
}

function renderTournamentDashboard() {
  leagueState = refreshLeagueState(leagueState);
  const fusion = getDailyFusion();
  const currentLeague = getCurrentLeague();
  const nextLeague = getNextLeague();
  const progress = getLeagueProgressPercent();
  const fusionComplete = isFusionCompleted();
  return `
    <div class="fusion-panel">
      <div class="fusion-poster poster-${fusion.base.accent}">
        <span>${fusion.base.title}</span>
      </div>
      <div class="fusion-copy">
        <span class="status-pill">Bugünün birleşimi</span>
        <h3>${fusion.base.title} + ${fusion.source.title}</h3>
        <p>
          Tek oyun ekranında <strong>${fusion.base.title}</strong> oyunundan ana hedef,
          <strong>${fusion.source.title}</strong> oyunundan özel kural alınır. Mod her zaman 2 oyunculudur.
        </p>
        <div class="fusion-actions">
          <a
            class="button primary"
            href="${FUSION_GAME_PATH}?base=${fusion.base.slug}&source=${fusion.source.slug}"
            data-play-game="birlesim-arenasi"
            data-fusion-base="${fusion.base.slug}"
            data-fusion-source="${fusion.source.slug}"
          >Birleşmiş oyunu oyna</a>
          <a class="button secondary" href="${fusion.base.path}" data-play-game="${fusion.base.slug}">Ana oyuna bak</a>
          <a class="button secondary" href="${fusion.source.path}" data-play-game="${fusion.source.slug}">Özellik oyununa bak</a>
          <span class="fusion-state ${fusionComplete ? "is-done" : ""}">${fusionComplete ? "Birleşim tamam" : "Birleşmiş oyun hazır"}</span>
        </div>
      </div>
    </div>

    <div class="tournament-layout">
      <section class="league-panel">
        <div class="league-head">
          <div>
            <span class="eyebrow">Lig puanı</span>
            <h3>${currentLeague.title}</h3>
          </div>
          ${renderLeagueMedal(currentLeague)}
        </div>
        <div class="league-score">
          <strong>${leagueState.points}</strong>
          <span>LP</span>
        </div>
        <div class="league-progress" aria-label="Lig ilerlemesi">
          <span style="width:${progress}%"></span>
        </div>
        <p>${nextLeague ? `${nextLeague.title} için ${Math.max(0, nextLeague.minPoints - leagueState.points)} LP kaldı.` : "Efsanevi ligdesin. Günlük 5 görevi bitirirsen özel kişiler adayısın."}</p>
        <div class="league-ladder">
          ${leagueDefinitions.map((league) => `
            <span class="${leagueState.points >= league.minPoints ? "is-active" : ""}">${league.title}</span>
          `).join("")}
        </div>
        <div class="league-medal-row">
          ${renderEarnedLeagueMedals()}
        </div>
      </section>

      <section class="legendary-panel">
        <div class="league-head">
          <div>
            <span class="eyebrow">Efsanevi günlük</span>
            <h3>5 görev, 1 gün</h3>
          </div>
          <span class="status-pill">${areLegendaryTasksComplete() ? "Tamam" : "Devam"}</span>
        </div>
        <p class="muted-copy">Efsanevi ligde bu 5 oyun görevini aynı gün bitirmezsen Elmas ligine düşersin.</p>
        <div class="legendary-task-list">
          ${renderLegendaryTasks()}
        </div>
      </section>
    </div>

    <div class="tournament-grid">
      ${tournamentTemplates.map(renderTournamentCard).join("")}
    </div>

    <section class="special-league">
      <div class="section-heading compact">
        <p class="eyebrow">Özel kişiler</p>
        <h3>Sadece 10 yer var.</h3>
        <p class="section-note">3 günde bir bir kişi düşme turuna girer ve yeni biri listeye gelir. Efsanevi görevleri bitirenlerin profilinde lig madalyası görünür.</p>
      </div>
      <div class="special-list">
        ${getSpecialPeople().map(renderSpecialPerson).join("")}
      </div>
    </section>
  `;
}

function renderTournamentCard(item) {
  const fusion = getDailyFusion();
  return `
    <article class="tournament-card">
      <span>${item.status}</span>
      <h3>${item.title}</h3>
      <p>${item.id === "fusion-cup" ? `${fusion.base.title} + ${fusion.source.title}: ${item.rule}` : item.rule}</p>
      <strong>${item.prize}</strong>
    </article>
  `;
}

function renderLegendaryTasks(dayKey = dailyBadgeKey(), state = leagueState) {
  return getLegendaryTasks(dayKey).map((task) => {
    const done = task.isDone(state);
    return `
      <article class="legendary-task ${done ? "is-done" : ""}">
        <span>${done ? "Bitti" : "Bekliyor"}</span>
        <strong>${task.title}</strong>
        <small>${task.description}</small>
      </article>
    `;
  }).join("");
}

function renderSpecialPerson(person, index) {
  const league = leagueDefinitions.find((item) => item.title === person.league) || leagueDefinitions[0];
  return `
    <article class="special-person ${person.isUser ? "is-user" : ""}">
      <strong>${index + 1}</strong>
      <div>
        <h4>${escapeHtml(person.name)}</h4>
        <span>@${escapeHtml(person.nickname)} · ${person.points} LP</span>
      </div>
      ${renderLeagueMedal(league, "small")}
      ${person.status ? `<em>${escapeHtml(person.status)}</em>` : ""}
    </article>
  `;
}

function renderLeagueMedal(league = getCurrentLeague(), extraClass = "") {
  return `<span class="league-medal is-${league.tone} ${extraClass}"><b>${league.short}</b>${league.title}</span>`;
}

function renderEarnedLeagueMedals() {
  if (!leagueState.medals.length) return `<span class="muted-copy">Henüz madalya yok.</span>`;
  return leagueState.medals.map((medalId) => {
    const medal = leagueMedalDefinitions.find((item) => item.id === medalId);
    if (!medal) return "";
    return `<span class="earned-medal">${medal.title}</span>`;
  }).join("");
}

function renderBadges() {
  const dailyBadges = getDailyBadges();
  const dailyCards = dailyBadges.map((badge) => renderBadgeCard(badge, true)).join("");
  const permanentCards = badgeDefinitions.map((badge) => renderBadgeCard(badge, false)).join("");
  return `${dailyCards}${permanentCards}`;
}

function renderBadgeCard(badge, isDaily) {
  const unlocked = badge.isUnlocked(badgeState);
  const classes = ["badge-card", isDaily ? "is-daily" : "", unlocked ? "is-unlocked" : ""].filter(Boolean).join(" ");
  return `
    <article class="${classes}">
      <span>${unlocked ? (isDaily ? "Bugün açıldı" : "Açıldı") : (isDaily ? "Bugün" : "Kilitli")}</span>
      <h3>${badge.title}</h3>
      <p>${badge.description}</p>
    </article>
  `;
}

function getDailyBadges(dayKey = dailyBadgeKey()) {
  return dailyBadgePool
    .map((badge) => ({ ...badge, dailyRank: hashString(`${dayKey}:${badge.id}`) }))
    .sort((a, b) => a.dailyRank - b.dailyRank)
    .slice(0, DAILY_BADGE_COUNT);
}

function dailyBadgeKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dailyBadgeDateLabel(dayKey = dailyBadgeKey()) {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${dayKey}T12:00:00`));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function ensureLeagueState() {
  const fallback = {
    points: 0,
    pointEvents: [],
    daily: {},
    medals: [],
    eliteMember: false,
    eliteRotationKey: "",
    legendaryActiveDay: "",
    legendaryCheckDay: "",
    lastDropMessage: "",
  };
  try {
    const stored = JSON.parse(localStorage.getItem("hakorocks-league-state") || "{}");
    return {
      ...fallback,
      ...stored,
      points: Number(stored.points) || 0,
      pointEvents: Array.isArray(stored.pointEvents) ? stored.pointEvents.slice(-120) : [],
      daily: stored.daily && typeof stored.daily === "object" ? stored.daily : {},
      medals: Array.isArray(stored.medals) ? stored.medals : [],
    };
  } catch {
    localStorage.setItem("hakorocks-league-state", JSON.stringify(fallback));
    return fallback;
  }
}

function saveLeagueState(state = leagueState) {
  localStorage.setItem("hakorocks-league-state", JSON.stringify(state));
}

function refreshLeagueState(state = leagueState) {
  const next = {
    ...state,
    pointEvents: Array.isArray(state.pointEvents) ? state.pointEvents.slice(-120) : [],
    daily: state.daily && typeof state.daily === "object" ? state.daily : {},
    medals: Array.isArray(state.medals) ? [...state.medals] : [],
  };
  const today = dailyBadgeKey();
  const current = getCurrentLeague(next);
  if (current.id === "efsanevi") {
    const activeDay = next.legendaryActiveDay || today;
    if (activeDay !== today && next.legendaryCheckDay !== today && !areLegendaryTasksComplete(activeDay, next)) {
      next.points = Math.min(next.points, leagueDefinitions.find((league) => league.id === "elmas").minPoints + 180);
      next.eliteMember = false;
      next.lastDropMessage = "Efsanevi günlük görevler bitmediği için Elmas ligine düştün.";
    }
    next.legendaryActiveDay = today;
    next.legendaryCheckDay = today;
  }
  if (getCurrentLeague(next).id === "efsanevi" && areLegendaryTasksComplete(today, next)) {
    next.eliteMember = true;
  }
  const fusion = getDailyFusion(today);
  const fusionEventKey = `${today}:fusion:${fusion.base.slug}:${fusion.source.slug}`;
  if (isFusionCompleted(today, next) && !next.pointEvents.includes(fusionEventKey)) {
    next.pointEvents.push(fusionEventKey);
    next.points += leaguePointValues.fusion;
  }
  const rotationKey = getEliteRotationKey();
  if (next.eliteMember && next.eliteRotationKey !== rotationKey) {
    const userDropSlot = hashString(`${sessionId}:${rotationKey}`) % 10;
    if (userDropSlot === 0 && !areLegendaryTasksComplete(today, next)) {
      next.eliteMember = false;
      next.lastDropMessage = "Özel kişiler listesinde 3 günlük düşme turunda seçildin.";
    }
    next.eliteRotationKey = rotationKey;
  }
  for (const medal of leagueMedalDefinitions) {
    if (medal.isEarned(next, badgeState) && !next.medals.includes(medal.id)) {
      next.medals.push(medal.id);
    }
  }
  saveLeagueState(next);
  return next;
}

function awardLeaguePoints(eventId, amount, options = {}) {
  const today = dailyBadgeKey();
  const eventKey = `${today}:${eventId}`;
  const next = refreshLeagueState(leagueState);
  next.daily[today] ??= { games: [], actions: [] };
  const gameSlugs = options.gameSlugs || (options.gameSlug ? [options.gameSlug] : []);
  gameSlugs.filter(Boolean).forEach((gameSlug) => addUnique(next.daily[today].games, gameSlug));
  if (options.action) addUnique(next.daily[today].actions, options.action);
  if (!next.pointEvents.includes(eventKey)) {
    next.pointEvents.push(eventKey);
    next.points += amount;
  }
  leagueState = refreshLeagueState(next);
  if (isFusionCompleted(today, leagueState)) {
    awardFusionBonus(today);
  }
  renderTournamentPanel();
  renderSocialDashboard();
}

function awardFusionBonus(dayKey = dailyBadgeKey()) {
  const eventKey = `${dayKey}:fusion:${getDailyFusion(dayKey).base.slug}:${getDailyFusion(dayKey).source.slug}`;
  if (leagueState.pointEvents.includes(eventKey)) return;
  const next = refreshLeagueState(leagueState);
  next.pointEvents.push(eventKey);
  next.points += leaguePointValues.fusion;
  leagueState = refreshLeagueState(next);
}

function getDailyFusion(dayKey = dailyBadgeKey()) {
  const baseIndex = hashString(`${dayKey}:base`) % games.length;
  let sourceIndex = hashString(`${dayKey}:source`) % (games.length - 1);
  if (sourceIndex >= baseIndex) sourceIndex += 1;
  const featureIndex = hashString(`${dayKey}:feature`) % fusionFeaturePool.length;
  return {
    base: games[baseIndex],
    source: games[sourceIndex],
    feature: fusionFeaturePool[featureIndex],
  };
}

function isFusionCompleted(dayKey = dailyBadgeKey(), state = leagueState) {
  const fusion = getDailyFusion(dayKey);
  const daily = state.daily?.[dayKey] || {};
  const played = Array.isArray(daily.games) ? daily.games : [];
  const actions = Array.isArray(daily.actions) ? daily.actions : [];
  const fusionAction = `fusion:${fusion.base.slug}:${fusion.source.slug}`;
  return (
    played.includes("birlesim-arenasi") ||
    actions.includes(fusionAction) ||
    (played.includes(fusion.base.slug) && played.includes(fusion.source.slug))
  );
}

function getCurrentLeague(state = leagueState) {
  return [...leagueDefinitions].reverse().find((league) => (state.points || 0) >= league.minPoints) || leagueDefinitions[0];
}

function getNextLeague(state = leagueState) {
  return leagueDefinitions.find((league) => league.minPoints > (state.points || 0)) || null;
}

function getLeagueProgressPercent(state = leagueState) {
  const current = getCurrentLeague(state);
  const next = getNextLeague(state);
  if (!next) return areLegendaryTasksComplete() ? 100 : 72;
  const span = next.minPoints - current.minPoints;
  return Math.max(8, Math.min(100, ((state.points - current.minPoints) / span) * 100));
}

function getLegendaryTasks(dayKey = dailyBadgeKey()) {
  return games
    .map((game) => ({ game, rank: hashString(`${dayKey}:legendary:${game.slug}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
    .map(({ game }) => ({
      id: `legendary:${game.slug}`,
      title: `${game.title} görevini yap`,
      description: `${game.title} oyununu bugün aç.`,
      isDone: (state = leagueState) => {
        const played = state.daily?.[dayKey]?.games || [];
        return played.includes(game.slug);
      },
    }));
}

function areLegendaryTasksComplete(dayKey = dailyBadgeKey(), state = leagueState) {
  return getLegendaryTasks(dayKey).every((task) => task.isDone(state));
}

function getEliteRotationKey(date = new Date()) {
  return String(Math.floor(date.getTime() / 259200000));
}

function getSpecialPeople() {
  const rotationKey = getEliteRotationKey();
  const dropIndex = hashString(`drop:${rotationKey}`) % 10;
  const challengerIndex = hashString(`new:${rotationKey}`) % specialChallengers.length;
  const list = specialPeopleBase.map((person) => ({ ...person, status: "" }));
  list[dropIndex] = { ...list[dropIndex], status: "Düşme turunda" };
  list[(dropIndex + 1) % 10] = { ...specialChallengers[challengerIndex], status: "Yeni gelen" };

  const account = latestSocial.account;
  if (leagueState.eliteMember || (getCurrentLeague().id === "efsanevi" && areLegendaryTasksComplete())) {
    list[0] = {
      name: account?.name || "Sen",
      nickname: account?.nickname || "oyuncu",
      league: "Efsanevi",
      points: leagueState.points,
      status: "Profil madalyalı",
      isUser: true,
    };
  }
  return list.slice(0, 10);
}

function renderTournamentPanel() {
  const panel = document.querySelector("[data-tournament-dashboard]");
  if (panel) panel.innerHTML = renderTournamentDashboard();
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
  const extra = gameExtra(game);
  const gameStats = latestStats.games?.[game.slug] ?? createGameStat(game, 0);
  const photos = latestPhotos.filter((photo) => photo.slug === game.slug).slice(0, 4);
  const chartValues = gameStats.history?.length ? gameStats.history : createHistory(game.stockBase);
  const change = gameStats.change ?? 0;
  const changeClass = change >= 0 ? "up" : "down";
  const comments = latestComments.games?.[game.slug] || [];

  return `
    <div class="modal-hero poster-${game.accent}">
      <div>
        <span>${game.type} · ${extra.difficulty} · ${extra.averagePlayTime}</span>
        <h2 id="modal-title">${game.title}</h2>
        <p>${game.longDescription}</p>
      </div>
      <div class="modal-actions">
        ${renderGamepadBadge(game, "large")}
        <a class="button primary" href="${game.path}" data-play-game="${game.slug}">Oyunu aç</a>
      </div>
    </div>
    <section class="modal-section full modal-progress">
      <h3>Oyun ilerlemesi</h3>
      ${renderProgressBar(extra.progress, "Tamamlama yüzdesi")}
      <div class="info-strip">
        <span>Zorluk: ${extra.difficulty}</span>
        <span>Ortalama süre: ${extra.averagePlayTime}</span>
        <span>Son güncelleme: ${extra.lastUpdated}</span>
      </div>
    </section>
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
          ${game.controllerBadge ? `<li>Gamepad: ${game.controllerBadge}</li>` : ""}
          <li>Fotoğraf çekme tuşu: Ö</li>
        </ul>
      </section>
      <section class="modal-section">
        <h3>Mobil durum</h3>
        <div class="mobile-modal-note">
          <strong>${game.mobileStatus}</strong>
          <p>${game.mobileNote}</p>
          ${game.gamepadNote ? `<p>${game.gamepadNote}</p>` : ""}
        </div>
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
        <h3>Gizli başarımlar</h3>
        <ul class="clean-list">${extra.hiddenAchievements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="modal-section">
        <h3>Geliştirme notları</h3>
        <ul class="clean-list">${extra.changelog.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="modal-section">
        <h3>Oyun wiki'si</h3>
        ${renderGameWiki(extra)}
      </section>
      <section class="modal-section">
        <h3>Oyun yorumları</h3>
        <form class="mini-form" data-comment-form data-comment-game="${game.slug}">
          <label>
            İsim
            <input name="name" maxlength="32" placeholder="Adın" />
          </label>
          <label>
            Yorum
            <input name="message" maxlength="220" placeholder="${game.title} için kısa yorum" required />
          </label>
          <button class="button primary" type="submit">Yorum ekle</button>
          <p class="form-status" data-comment-status aria-live="polite"></p>
        </form>
        <div class="comment-list">
          ${renderGameComments(comments)}
        </div>
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

function renderGameWiki(extra) {
  const groups = [
    ["Karakterler", extra.wiki.characters],
    ["Silahlar / araçlar", extra.wiki.weapons],
    ["Craft tarifi", extra.wiki.craft],
  ];
  return `
    <div class="wiki-grid">
      ${groups.map(([title, items]) => `
        <div>
          <strong>${title}</strong>
          <ul class="clean-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      `).join("")}
    </div>
  `;
}

function renderGameComments(comments) {
  if (!comments.length) return `<p class="muted-copy">Bu oyuna ilk yorumu sen yazabilirsin.</p>`;
  return comments.slice(0, 6).map((comment) => `
    <article class="comment-card">
      <strong>${escapeHtml(comment.name || "Oyuncu")}</strong>
      <p>${escapeHtml(comment.message || "")}</p>
      <small>${formatDate(comment.createdAt)}</small>
    </article>
  `).join("");
}

function renderPhoto(photo) {
  return `
    <figure class="photo-card">
      <img src="${photo.dataUrl}" alt="${escapeHtml(photo.title || "Oyun fotoğrafı")}" loading="lazy" />
      <figcaption>
        <span>${escapeHtml(photo.gameTitle || photo.title || "Oyun fotoğrafı")}</span>
        <button class="photo-like" type="button" data-photo-like="${escapeHtml(photo.id)}">Beğen · ${photo.likes || 0}</button>
      </figcaption>
    </figure>
  `;
}

function renderWeeklyPhoto() {
  const photo = [...latestPhotos].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
  if (!photo) {
    return `
      <article class="weekly-photo empty">
        <span>Haftanın fotoğrafı</span>
        <h3>İlk fotoğrafı bekliyor</h3>
        <p>Oyunlarda Ö tuşu ile fotoğraf çekilince en çok beğenilen görsel burada öne çıkar.</p>
      </article>
    `;
  }
  return `
    <article class="weekly-photo">
      <img src="${photo.dataUrl}" alt="${escapeHtml(photo.title || "Haftanın fotoğrafı")}" loading="lazy" />
      <div>
        <span>Haftanın fotoğrafı</span>
        <h3>${escapeHtml(photo.gameTitle || gameTitle(photo.slug))}</h3>
        <p>${photo.likes || 0} beğeni ile fotoğraf yarışmasında önde.</p>
        <button class="button secondary" type="button" data-photo-like="${escapeHtml(photo.id)}">Beğen</button>
      </div>
    </article>
  `;
}

function renderCommunityHub() {
  return `
    <div class="community-layout">
      <section class="community-panel">
        <div class="account-box-head">
          <h3>Yeni oyun oylaması</h3>
          <span class="status-pill">${latestVotes.total || 0} oy</span>
        </div>
        <div class="vote-list">
          ${voteOptions.map(renderVoteOption).join("")}
        </div>
      </section>
      <section class="community-panel">
        <h3>Son oyun yorumları</h3>
        <div class="comment-list">
          ${renderRecentComments()}
        </div>
      </section>
      <section class="community-panel">
        <div class="account-box-head">
          <h3>Mikrofon testi</h3>
          <button class="button secondary" type="button" data-mic-test>Test et</button>
        </div>
        <p class="muted-copy" data-mic-status>${micTestStatus}</p>
      </section>
      <section class="community-panel">
        <h3>Topluluk etkinlikleri</h3>
        <div class="archive-list">
          ${communityEvents.map((event) => `<span>${event.title} · ${event.reward}</span>`).join("")}
        </div>
      </section>
      <section class="community-panel wide">
        <h3>Geliştirici blogu</h3>
        <div class="archive-list">
          ${developerBlogPosts.map((post) => `<span>${post}</span>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderVoteOption(option) {
  const count = latestVotes.options?.[option.id] || 0;
  const percent = latestVotes.total ? Math.round((count / latestVotes.total) * 100) : 0;
  const selected = badgeState.votedIdea === option.id;
  return `
    <article class="vote-card ${selected ? "is-selected" : ""}">
      <div>
        <strong>${option.title}</strong>
        <p>${option.description}</p>
      </div>
      ${renderProgressBar(percent, `${count} oy`)}
      <button class="button secondary" type="button" data-vote-option="${option.id}">
        ${selected ? "Senin oyun" : "Oy ver"}
      </button>
    </article>
  `;
}

function renderRecentComments() {
  const list = latestComments.list || [];
  if (!list.length) return `<p class="muted-copy">Henüz oyun yorumu yok. Bir oyun detayını açıp ilk yorumu yazabilirsin.</p>`;
  return list.slice(0, 8).map((comment) => `
    <article class="comment-card">
      <strong>${escapeHtml(comment.name || "Oyuncu")} · ${gameTitle(comment.slug)}</strong>
      <p>${escapeHtml(comment.message || "")}</p>
      <small>${formatDate(comment.createdAt)}</small>
    </article>
  `).join("");
}

function renderStudioHub() {
  return `
    <div class="studio-layout">
      <section class="studio-panel">
        <h3>Geliştirici günlüğü</h3>
        <div class="timeline-list">
          ${devDiaryEntries.map((entry) => `
            <article>
              <span>${entry.date}</span>
              <strong>${entry.title}</strong>
              <p>${entry.text}</p>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="studio-panel">
        <h3>Bildirim merkezi</h3>
        <div class="archive-list">
          ${notificationCards.map((item) => `<span>${item}</span>`).join("")}
        </div>
      </section>
      <section class="studio-panel">
        <h3>Günün duyurusu</h3>
        ${renderDailyAnnouncement()}
      </section>
      <section class="studio-panel">
        <h3>Yakında gelecek güncellemeler</h3>
        <div class="archive-list">
          ${upcomingUpdateCards.map((item) => `<span>${item.title} · ${item.status}</span>`).join("")}
        </div>
      </section>
      <section class="studio-panel wide">
        <h3>İstatistikler</h3>
        ${renderEnrichedStats()}
      </section>
      <section class="studio-panel">
        <h3>Turnuva takvimi</h3>
        <div class="archive-list">
          ${tournamentCalendar.map((item) => `<span>${item.day}: ${item.title} · ${item.prize}</span>`).join("")}
        </div>
      </section>
      <section class="studio-panel">
        <h3>Sezon sistemi</h3>
        <p class="muted-copy">${seasonInfo.title}</p>
        <div class="archive-list">
          <span>Sezon ödülü: ${seasonInfo.reward}</span>
          <span>Turnuva ödülü: ${seasonInfo.tournamentReward}</span>
        </div>
      </section>
      <section class="studio-panel">
        <h3>Eğlence</h3>
        ${renderFunPanel()}
      </section>
      <section class="studio-panel wide">
        <h3>Geliştirici modu</h3>
        ${renderDeveloperMode()}
      </section>
    </div>
  `;
}

function renderDailyAnnouncement() {
  const latest = latestAnnouncements[0];
  if (latest) {
    return `
      <article class="announcement-card">
        <span>${formatDate(latest.createdAt)}</span>
        <h3>${escapeHtml(latest.title)}</h3>
        <p>${escapeHtml(latest.message)}</p>
      </article>
    `;
  }
  return `
    <article class="announcement-card empty">
      <span>Bugün</span>
      <h3>Hakorocks Studio yayında</h3>
      <p>Yeni oyun yorumları, birleşim görevleri ve fotoğraf yarışması açık.</p>
    </article>
  `;
}

function renderFunPanel() {
  const task = randomTasks[hashString(dailyBadgeKey()) % randomTasks.length];
  const selectedMusicItem = musicOptions.find((item) => item.id === selectedMusic) || musicOptions[0];
  return `
    <div class="fun-panel">
      <div class="segmented">
        <button type="button" data-theme-mode="dark" class="${selectedTheme === "dark" ? "is-active" : ""}">Koyu</button>
        <button type="button" data-theme-mode="light" class="${selectedTheme === "light" ? "is-active" : ""}">Açık</button>
      </div>
      <label class="mini-select">
        Müzik
        <select data-music-select>
          ${musicOptions.map((item) => `<option value="${item.id}" ${item.id === selectedMusic ? "selected" : ""}>${item.title}</option>`).join("")}
        </select>
      </label>
      <button class="button secondary" type="button" data-music-preview>${selectedMusicItem.title} çal</button>
      <button class="button secondary" type="button" data-hakobot>HakoBot önerisi</button>
      <p class="muted-copy" data-hakobot-answer>${hakoBotAnswer}</p>
      <div class="daily-task"><strong>Günün rastgele görevi</strong><span>${task}</span></div>
      <button class="button primary" type="button" data-surprise-box ${surpriseState.opened ? "disabled" : ""}>
        ${surpriseState.opened ? "Sürpriz açıldı" : "Günlük sürpriz kutusu"}
      </button>
      <p class="muted-copy" data-surprise-message>${surpriseState.message || "Sürpriz kutusu her gün bir kez açılır."}</p>
      <button class="button secondary" type="button" data-easter-egg>Gizli ipucu</button>
    </div>
  `;
}

function renderDeveloperMode() {
  return `
    <div class="dev-grid">
      <article><span>FPS</span><strong data-dev-fps>${performanceState.fps || 0}</strong></article>
      <article><span>Ping</span><strong data-dev-ping>${performanceState.ping || 0} ms</strong></article>
      <article><span>Bellek</span><strong data-dev-memory>${performanceState.memory}</strong></article>
      <article><span>Sunucu</span><strong>${latestHealth.status}</strong></article>
      <article><span>Build</span><strong>${latestHealth.buildVersion || BUILD_VERSION}</strong></article>
      <article><span>Aktif sunucu</span><strong>${latestHealth.activeServer}</strong></article>
      <article><span>Çevrimiçi oyuncu</span><strong>${latestStats.playing || 0}</strong></article>
      <article><span>Site oturumu</span><strong>${latestStats.siteOpen || 0}</strong></article>
    </div>
  `;
}

function renderEnrichedStats() {
  const enriched = latestStats.enriched || {};
  const totalGameTime = Number(enriched.totalGameTimeMinutes) || 0;
  const items = [
    ["En çok oynanan oyun", gameTitle(enriched.mostPlayedGame)],
    ["Haftanın popüler oyunu", gameTitle(enriched.weekPopularGame)],
    ["En çok fotoğraf çekilen oyun", gameTitle(enriched.mostPhotoGame)],
    ["Toplam oyuncu", enriched.totalPlayers ?? 0],
    ["Toplam oyun süresi", `${Math.round(totalGameTime)} dk`],
    ["Toplam kazanılan rozet", enriched.totalBadges ?? 0],
    ["Günlük aktif oyuncu", enriched.dailyActivePlayers ?? latestStats.siteOpen ?? 0],
    ["En çok oynanan birleşim", gameTitle(enriched.mostPlayedFusion || "birlesim-arenasi")],
  ];
  return `
    <div class="studio-stat-grid">
      ${items.map(([label, value]) => `
        <article>
          <span>${label}</span>
          <strong>${value}</strong>
        </article>
      `).join("")}
    </div>
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
  const today = dailyBadgeKey();
  const fallback = {
    visitedAt: new Date().toISOString(),
    lastVisitDay: today,
    dailyStreak: 1,
    dailyRewardClaimedDay: "",
    openedGame: false,
    playedGames: [],
    photoCount: 0,
    photoLikes: 0,
    ratedGames: [],
    favoriteGames: [],
    commentCount: 0,
    guestbook: false,
    trailerPlayed: false,
    voiceRoomJoined: false,
    votedIdea: "",
    surpriseOpened: false,
    easterEggFound: false,
    launcherOpened: false,
    botMessages: 0,
    clickGameBest: 0,
  };
  try {
    const stored = JSON.parse(localStorage.getItem("hakorocks-badge-state") || "{}");
    const storedLastVisit = stored.lastVisitDay || today;
    const yesterday = new Date(`${today}T12:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dailyBadgeKey(yesterday);
    const dailyStreak = storedLastVisit === today
      ? Number(stored.dailyStreak) || 1
      : storedLastVisit === yesterdayKey
        ? (Number(stored.dailyStreak) || 0) + 1
        : 1;
    const state = {
      ...fallback,
      ...stored,
      lastVisitDay: today,
      dailyStreak,
      playedGames: Array.isArray(stored.playedGames) ? stored.playedGames : [],
      ratedGames: Array.isArray(stored.ratedGames) ? stored.ratedGames : [],
      favoriteGames: Array.isArray(stored.favoriteGames) ? stored.favoriteGames : [],
      photoCount: Number(stored.photoCount) || 0,
      photoLikes: Number(stored.photoLikes) || 0,
      commentCount: Number(stored.commentCount) || 0,
      botMessages: Number(stored.botMessages) || 0,
      clickGameBest: Number(stored.clickGameBest) || 0,
    };
    localStorage.setItem("hakorocks-badge-state", JSON.stringify(state));
    return state;
  } catch {
    localStorage.setItem("hakorocks-badge-state", JSON.stringify(fallback));
    return fallback;
  }
}

function updateBadgeState(mutator) {
  const next = {
    ...badgeState,
    playedGames: [...badgeState.playedGames],
    ratedGames: [...badgeState.ratedGames],
    favoriteGames: Array.isArray(badgeState.favoriteGames) ? [...badgeState.favoriteGames] : [],
  };
  mutator(next);
  badgeState = next;
  localStorage.setItem("hakorocks-badge-state", JSON.stringify(badgeState));
  leagueState = refreshLeagueState(leagueState);
  renderBadgeGrid();
  renderTournamentPanel();
  renderLauncherPanel();
  renderStudioPulsePanel();
}

function addUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function gameTitle(slug) {
  return gameMap.get(slug)?.title || slug || "Yok";
}

function renderWeeklyPhotoPanel() {
  const panel = document.querySelector("[data-weekly-photo]");
  if (panel) panel.innerHTML = renderWeeklyPhoto();
}

function renderCommunityPanel() {
  const panel = document.querySelector("[data-community-hub]");
  if (panel) panel.innerHTML = renderCommunityHub();
  bindDynamicForms();
}

function renderStudioPanel() {
  const panel = document.querySelector("[data-studio-hub]");
  if (panel) panel.innerHTML = renderStudioHub();
  bindDynamicForms();
}

function renderEnrichedStatsPanel() {
  const panel = document.querySelector("[data-enriched-stats]");
  if (panel) panel.innerHTML = renderEnrichedStats();
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

    const launcherAction = target.closest?.("[data-launcher-use]");
    if (launcherAction) {
      markLauncherUsed();
    }

    const launcherModeButton = target.closest?.("[data-launcher-mode]");
    if (launcherModeButton) {
      launcherMode = launcherModeButton.dataset.launcherMode || "all";
      if (launcherMode === "all") launcherQuery = "";
      renderLauncherPanel();
      return;
    }

    const continueButton = target.closest?.("[data-continue-game]");
    if (continueButton) {
      const game = getLauncherContinueGame();
      openGameModal(game.slug);
      return;
    }

    const botQuickButton = target.closest?.("[data-bot-quick]");
    if (botQuickButton) {
      pushHakoBotConversation(botQuickButton.dataset.botQuick || "");
      return;
    }

    const botClearButton = target.closest?.("[data-bot-clear]");
    if (botClearButton) {
      hakoBotMessages = [{
        role: "bot",
        text: "Sohbet temizlendi. Bana oyunlar, launcher, mini oyun veya rozetler hakkında soru sorabilirsin.",
        createdAt: new Date().toISOString(),
      }];
      saveHakoBotMessages();
      renderHakoBotPanel();
      return;
    }

    const clickStartButton = target.closest?.("[data-click-start]");
    if (clickStartButton) {
      startClickGame();
      return;
    }

    const clickResetButton = target.closest?.("[data-click-reset]");
    if (clickResetButton) {
      resetClickGame();
      return;
    }

    const clickSquare = target.closest?.("[data-click-square]");
    if (clickSquare) {
      pressClickSquare();
      return;
    }

    const millionHToggle = target.closest?.("[data-million-h-toggle]");
    if (millionHToggle) {
      revealMillionH();
      return;
    }

    const millionHCopy = target.closest?.("[data-million-h-copy]");
    if (millionHCopy) {
      void copyMillionH();
      return;
    }

    const gameOpenButton = target.closest?.("[data-game-open]");
    if (gameOpenButton) {
      openGameModal(gameOpenButton.dataset.gameOpen);
      return;
    }

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

    const favoriteButton = target.closest?.("[data-favorite-game]");
    if (favoriteButton) {
      toggleFavoriteGame(favoriteButton.dataset.favoriteGame);
      return;
    }

    const randomButton = target.closest?.("[data-random-game]");
    if (randomButton) {
      openRandomGame();
      return;
    }

    const photoLikeButton = target.closest?.("[data-photo-like]");
    if (photoLikeButton) {
      likePhoto(photoLikeButton.dataset.photoLike);
      return;
    }

    const voteButton = target.closest?.("[data-vote-option]");
    if (voteButton) {
      submitVote(voteButton.dataset.voteOption);
      return;
    }

    const rewardButton = target.closest?.("[data-daily-reward]");
    if (rewardButton) {
      claimDailyReward();
      return;
    }

    const micButton = target.closest?.("[data-mic-test]");
    if (micButton) {
      testMicrophone();
      return;
    }

    const themeButton = target.closest?.("[data-theme-mode]");
    if (themeButton) {
      setTheme(themeButton.dataset.themeMode);
      return;
    }

    const musicPreview = target.closest?.("[data-music-preview]");
    if (musicPreview) {
      playSelectedMusic();
      return;
    }

    const hakoBotButton = target.closest?.("[data-hakobot]");
    if (hakoBotButton) {
      askHakoBot();
      return;
    }

    const surpriseButton = target.closest?.("[data-surprise-box]");
    if (surpriseButton) {
      openSurpriseBox();
      return;
    }

    const easterButton = target.closest?.("[data-easter-egg]");
    if (easterButton) {
      revealEasterEgg();
      return;
    }

    const playLink = target.closest?.("[data-play-game]");
    if (playLink) {
      const fusionBase = playLink.dataset.fusionBase;
      const fusionSource = playLink.dataset.fusionSource;
      const gameSlugs = [playLink.dataset.playGame, fusionBase, fusionSource].filter(Boolean);
      updateBadgeState((state) => {
        gameSlugs.forEach((gameSlug) => addUnique(state.playedGames, gameSlug));
      });
      awardLeaguePoints(`game:${playLink.dataset.playGame}`, leaguePointValues.game, {
        gameSlugs,
        action: fusionBase && fusionSource ? `fusion:${fusionBase}:${fusionSource}` : "game",
      });
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
  document.querySelector("[data-music-select]")?.addEventListener("change", handleMusicSelect);
  document.addEventListener("click", handleAccountActions);
  bindDynamicForms();
}

function bindDynamicForms() {
  document.querySelectorAll("[data-comment-form]").forEach((form) => bindOnce(form, "submit", submitComment));
  bindOnce(document.querySelector("[data-music-select]"), "change", handleMusicSelect);
  bindOnce(document.querySelector("[data-launcher-search]"), "input", handleLauncherSearch);
  bindOnce(document.querySelector("[data-hakobot-form]"), "submit", submitHakoBotChat);
  bindOnce(document.querySelector("[data-click-submit-form]"), "submit", submitClickGameScore);
}

function handleLauncherSearch(event) {
  launcherQuery = event.currentTarget.value || "";
  renderLauncherPanel();
  const input = document.querySelector("[data-launcher-search]");
  input?.focus();
  input?.setSelectionRange(launcherQuery.length, launcherQuery.length);
}

function openGameModal(slug) {
  const game = gameMap.get(slug);
  if (!game) return;
  updateBadgeState((state) => {
    state.openedGame = true;
  });
  awardLeaguePoints(`details:${slug}`, leaguePointValues.details, { action: "details" });
  selectedGame = game;
  document.querySelector("[data-modal-content]").innerHTML = renderModal(game);
  bindDynamicForms();
  const modal = document.querySelector("[data-game-modal]");
  modal.hidden = false;
  document.body.classList.add("modal-open");
  fetch("/api/game-open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, slug }),
  }).catch(() => {});
}

function renderGameGrid() {
  const grid = document.querySelector(".game-grid");
  if (grid) grid.innerHTML = games.map(renderGameCard).join("");
}

function toggleFavoriteGame(slug) {
  if (!gameMap.has(slug)) return;
  if (favoriteGames.includes(slug)) {
    favoriteGames = favoriteGames.filter((item) => item !== slug);
  } else {
    favoriteGames = [slug, ...favoriteGames].slice(0, 8);
  }
  saveFavoriteGames();
  updateBadgeState((state) => {
    state.favoriteGames = favoriteGames;
  });
  renderGameGrid();
  renderLauncherPanel();
  renderSocialDashboard();
}

function openRandomGame() {
  const game = games[hashString(`${Date.now()}:${sessionId}`) % games.length];
  openGameModal(game.slug);
}

async function submitComment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const slug = form.dataset.commentGame;
  const status = form.querySelector("[data-comment-status]");
  const formData = new FormData(form);
  const payload = {
    slug,
    name: formData.get("name"),
    message: formData.get("message"),
  };
  if (status) status.textContent = "Yorum gönderiliyor...";
  try {
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "comment-failed");
    latestComments = data;
    form.reset();
    updateBadgeState((state) => {
      state.commentCount = (Number(state.commentCount) || 0) + 1;
    });
    if (status) status.textContent = "Yorum eklendi.";
    document.querySelector("[data-modal-content]").innerHTML = renderModal(selectedGame);
    bindDynamicForms();
    renderGameGrid();
  } catch {
    if (status) status.textContent = "Yorum eklenemedi. Tekrar dene.";
  }
}

async function likePhoto(photoId) {
  if (!photoId) return;
  try {
    const response = await fetch("/api/photo-like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, photoId }),
    });
    latestPhotos = await response.json();
    updateBadgeState((state) => {
      state.photoLikes = (Number(state.photoLikes) || 0) + 1;
    });
    renderPhotoGrid();
    renderWeeklyPhotoPanel();
    renderStudioPanel();
  } catch {
    latestPhotos = latestPhotos.map((photo) => photo.id === photoId ? { ...photo, likes: (photo.likes || 0) + 1 } : photo);
    renderPhotoGrid();
    renderWeeklyPhotoPanel();
  }
}

async function submitVote(optionId) {
  if (!voteOptions.some((option) => option.id === optionId)) return;
  try {
    const response = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, optionId }),
    });
    latestVotes = await response.json();
    updateBadgeState((state) => {
      state.votedIdea = optionId;
    });
    renderCommunityPanel();
  } catch {
    latestVotes.options[optionId] = (latestVotes.options[optionId] || 0) + 1;
    latestVotes.total += 1;
    updateBadgeState((state) => {
      state.votedIdea = optionId;
    });
    renderCommunityPanel();
  }
}

function claimDailyReward() {
  const today = dailyBadgeKey();
  if (badgeState.dailyRewardClaimedDay === today) return;
  updateBadgeState((state) => {
    state.dailyRewardClaimedDay = today;
  });
  awardLeaguePoints(`daily-reward:${today}`, 20, { action: "daily-reward" });
  renderSocialDashboard();
}

async function testMicrophone() {
  micTestStatus = "Mikrofon izni bekleniyor...";
  renderCommunityPanel();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    micTestStatus = "Mikrofon çalışıyor.";
  } catch {
    micTestStatus = "Mikrofon izni verilmedi veya cihaz bulunamadı.";
  }
  renderCommunityPanel();
}

function setTheme(theme) {
  selectedTheme = theme === "light" ? "light" : "dark";
  localStorage.setItem("hakorocks-theme", selectedTheme);
  document.documentElement.dataset.theme = selectedTheme;
  renderStudioPanel();
}

function handleMusicSelect(event) {
  selectedMusic = event.currentTarget.value;
  localStorage.setItem("hakorocks-music", selectedMusic);
  renderStudioPanel();
}

function playSelectedMusic() {
  const item = musicOptions.find((option) => option.id === selectedMusic) || musicOptions[0];
  playTone(item.frequency, 0.18);
}

function askHakoBot() {
  const fusion = getDailyFusion();
  const options = [
    `Bugün ${fusion.base.title} + ${fusion.source.title} birleşimini dene.`,
    "Bir oyuna yorum yazarsan Yorumcu rozeti açılır.",
    "Fotoğraf beğenisi haftanın fotoğrafını belirler.",
    `Bugünün rastgele görevi: ${randomTasks[hashString(`${dailyBadgeKey()}:task`) % randomTasks.length]}`,
  ];
  hakoBotAnswer = options[hashString(`${Date.now()}:hakobot`) % options.length];
  renderStudioPanel();
}

function openSurpriseBox() {
  if (surpriseState.opened) return;
  const message = surpriseBoxes[hashString(`${dailyBadgeKey()}:surprise`) % surpriseBoxes.length];
  surpriseState = {
    dayKey: dailyBadgeKey(),
    opened: true,
    message,
  };
  saveSurpriseState();
  updateBadgeState((state) => {
    state.surpriseOpened = true;
  });
  awardLeaguePoints(`surprise:${dailyBadgeKey()}`, 12, { action: "surprise" });
  renderStudioPanel();
}

function revealEasterEgg() {
  hakoBotAnswer = "Gizli ipucu: Hakorocks Studio'da en hızlı rozet yolu yorum + favori + fotoğraf beğenisi.";
  updateBadgeState((state) => {
    state.easterEggFound = true;
  });
  renderStudioPanel();
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
    awardLeaguePoints(`rating:${slug}`, leaguePointValues.rating, { action: "rating" });
  } catch {
    latestRatings.games[slug] = {
      average: value,
      count: 1,
    };
    updateBadgeState((state) => addUnique(state.ratedGames, slug));
    awardLeaguePoints(`rating:${slug}`, leaguePointValues.rating, { action: "rating" });
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
    awardLeaguePoints("guestbook", leaguePointValues.guestbook, { action: "guestbook" });
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
  renderTournamentPanel();
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
    awardLeaguePoints("voice-room", leaguePointValues.voice, { action: "voice" });
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

function playTone(frequency = 340, duration = 0.12) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.02);
}

function bindTrailer() {
  const stage = document.querySelector("[data-trailer-stage]");
  document.querySelector("[data-trailer-play]")?.addEventListener("click", () => {
    updateBadgeState((state) => {
      state.trailerPlayed = true;
    });
    awardLeaguePoints("trailer", leaguePointValues.trailer, { action: "trailer" });
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
    const [statsResponse, photosResponse, ratingsResponse, guestbookResponse, feedbackResponse, announcementsResponse, commentsResponse, votesResponse, healthResponse, accountResponse, voiceResponse, clickGameResponse] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/photos"),
      fetch("/api/ratings"),
      fetch("/api/guestbook"),
      fetch("/api/feedback"),
      fetch("/api/announcements"),
      fetch("/api/comments"),
      fetch("/api/votes"),
      fetch("/api/health"),
      fetch(`/api/account?sessionId=${encodeURIComponent(sessionId)}`),
      fetch(`/api/voice?sessionId=${encodeURIComponent(sessionId)}`),
      fetch(`/api/click-game?sessionId=${encodeURIComponent(sessionId)}`),
    ]);
    latestStats = await statsResponse.json();
    latestPhotos = await photosResponse.json();
    latestRatings = await ratingsResponse.json();
    latestGuestbook = await guestbookResponse.json();
    latestFeedback = await feedbackResponse.json();
    latestAnnouncements = await announcementsResponse.json();
    latestComments = await commentsResponse.json();
    latestVotes = await votesResponse.json();
    latestHealth = await healthResponse.json();
    latestSocial = await accountResponse.json();
    latestVoice = await voiceResponse.json();
    latestClickGame = await clickGameResponse.json();
    if (latestVoice.roomId) {
      selectedVoiceRoomId = latestVoice.roomId;
      localStorage.setItem("hakorocks-voice-room", selectedVoiceRoomId);
    }
  } catch {
    latestStats = createFallbackStats();
    latestComments = createFallbackComments();
    latestVotes = createFallbackVotes();
    latestHealth = createFallbackHealth();
    latestSocial = createFallbackSocial();
    latestVoice = createFallbackVoice();
    latestClickGame = createFallbackClickGame();
  }

  renderLiveData();
  renderAnnouncementFeed();
  renderFeedbackFeed();
  renderCommunityPanel();
  renderStudioPanel();
  renderSocialDashboard();
  maybeNotifySocialChanges();
  if (!document.querySelector("[data-game-modal]").hidden) {
    document.querySelector("[data-modal-content]").innerHTML = renderModal(selectedGame);
    bindDynamicForms();
  }
}

function renderLiveData() {
  document.querySelector("[data-site-open]").textContent = latestStats.siteOpen ?? 1;
  document.querySelector("[data-playing-now]").textContent = latestStats.playing ?? 0;
  document.querySelector("[data-mobile-now]").textContent = (latestStats.devices?.mobile ?? 0) + (latestStats.devices?.tablet ?? 0);
  document.querySelector("[data-market-value]").textContent = Math.round(latestStats.marketValue ?? 0);
  document.querySelector("[data-market-chart]").innerHTML = renderSparkline(latestStats.marketHistory ?? createHistory(100));

  renderPhotoGrid();
  renderWeeklyPhotoPanel();
  renderGuestbookList();
  renderBadgeGrid();
  renderTournamentPanel();
  renderSpotlightPanel();
  renderEnrichedStatsPanel();
  renderLauncherPanel();
  renderStudioPulsePanel();
  if (!clickGameState.running) renderClickGamePanel();
}

const header = document.querySelector("[data-header]");
window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
});

bindGameCards();
bindTrailer();
updateSoundButton();
renderBadgeGrid();
renderTournamentPanel();
renderFeedbackFeed();
renderAnnouncementFeed();
renderCommunityPanel();
renderStudioPanel();
renderSocialDashboard();
renderStudioPulsePanel();
renderClickGamePanel();
refreshLiveData();
setInterval(refreshLiveData, 10000);
startPerformanceMonitor();
startRevealAnimations();
setInterval(refreshPerformancePing, 15000);

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

function startPerformanceMonitor() {
  let frames = 0;
  let last = performance.now();
  const tick = (now) => {
    frames += 1;
    if (now - last >= 1000) {
      performanceState.fps = frames;
      frames = 0;
      last = now;
      const memory = performance.memory;
      if (memory?.usedJSHeapSize) {
        performanceState.memory = `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB`;
      }
      const fpsNode = document.querySelector("[data-dev-fps]");
      const memoryNode = document.querySelector("[data-dev-memory]");
      if (fpsNode) fpsNode.textContent = String(performanceState.fps);
      if (memoryNode) memoryNode.textContent = performanceState.memory;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function refreshPerformancePing() {
  const start = performance.now();
  try {
    const response = await fetch("/api/health");
    latestHealth = await response.json();
    performanceState.ping = Math.round(performance.now() - start);
  } catch {
    performanceState.ping = 0;
  }
  const pingNode = document.querySelector("[data-dev-ping]");
  if (pingNode) pingNode.textContent = `${performanceState.ping} ms`;
  renderStudioPanel();
}

function startRevealAnimations() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.classList.add("motion-ready");
  const selector = [
    ".section",
    ".game-card",
    ".launcher-game-card",
    ".community-panel",
    ".studio-panel",
    ".badge-card",
    ".photo-card",
    ".pulse-feed article",
    ".click-arena",
    ".click-leaderboard",
    ".click-leader",
  ].join(",");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -80px 0px", threshold: 0.08 });
  const register = (root = document) => {
    root.querySelectorAll(selector).forEach((element) => {
      if (element.dataset.revealBound === "1") return;
      element.dataset.revealBound = "1";
      element.classList.add("reveal-item");
      observer.observe(element);
    });
  };
  register();
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) register(node);
      });
    });
  });
  mutationObserver.observe(document.querySelector("#app"), { childList: true, subtree: true });
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
