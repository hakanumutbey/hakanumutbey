export const BUILD_VERSION = "2026.07.17-roadmap";

export const gameExtras = {
  "annenden-kac": {
    progress: 82,
    difficulty: "Orta",
    averagePlayTime: "6 dk",
    lastUpdated: "Mobil kontrol yenilendi",
    hiddenAchievements: ["Sessiz koşucu", "Kapıdan tek seferde kaçış"],
    wiki: {
      characters: ["Hakan", "Takip eden anne"],
      weapons: ["Zaman yavaşlatma gücü", "Anahtar rotası"],
      craft: ["3 anahtar + doğru kapı = final kaçışı"],
    },
    changelog: ["5 seviyeli kaçış yapısı", "Mobil seçim ekranı", "Fotoğraf rozeti"],
  },
  bardak: {
    progress: 68,
    difficulty: "Kolay",
    averagePlayTime: "4 dk",
    lastUpdated: "Stüdyo logosu eklendi",
    hiddenAchievements: ["Dengeli bardak", "İlk düşüşsüz tur"],
    wiki: {
      characters: ["Hakorocks bardağı", "Stüdyo masası"],
      weapons: ["Denge", "Zıplama açısı"],
      craft: ["Logo + fizik sahnesi = stüdyo modu"],
    },
    changelog: ["3D sahne düzeni", "Logo assetleri", "Tarayıcıdan tek tık"],
  },
  "essiz-zindan": {
    progress: 76,
    difficulty: "Zor",
    averagePlayTime: "11 dk",
    lastUpdated: "Debug kısayolları temizlendi",
    hiddenAchievements: ["Öfke patlaması", "Boss yolcusu"],
    wiki: {
      characters: ["Zindan savaşçısı", "Kral düşman"],
      weapons: ["Kılıç", "Öfke gücü", "Oda temizleme taktiği"],
      craft: ["Hazine + öfke puanı = güçlenmiş saldırı"],
    },
    changelog: ["Boss saldırıları korundu", "Mobil saldırı düğmesi", "Tam ekran desteği"],
  },
  "skeleton-wars": {
    progress: 74,
    difficulty: "Orta",
    averagePlayTime: "9 dk",
    lastUpdated: "Hikaye videosu korundu",
    hiddenAchievements: ["Kemik kıran", "Kardeş kurtarıcı"],
    wiki: {
      characters: ["Kahraman", "Kardeş", "İskelet kral"],
      weapons: ["Yay", "Kılıç", "Ateşli ok"],
      craft: ["Ok + ateş gücü = özel saldırı"],
    },
    changelog: ["Mobil gamepad", "Skeleton Wars 2 hazırlığı", "Canlı fotoğraf sistemi"],
  },
  rhgpo: {
    progress: 72,
    difficulty: "Orta",
    averagePlayTime: "7 dk",
    lastUpdated: "Park ve motor modu eklendi",
    hiddenAchievements: ["Rüzgar ustası", "Çarpmasız kaptan"],
    wiki: {
      characters: ["Kaptan", "Liman görevlisi"],
      weapons: ["Halatlar", "Motor", "Rüzgar yönü"],
      craft: ["Doğru halat sırası + motor = güvenli çıkış"],
    },
    changelog: ["Halat sırası kuralı", "Çarpma limiti", "Mobil sürüş düğmeleri"],
  },
  "siyah-adam": {
    progress: 80,
    difficulty: "Zor",
    averagePlayTime: "12 dk",
    lastUpdated: "Çember ve gece akışı tamamlandı",
    hiddenAchievements: ["Gizli dedektif", "Son saniye kararı"],
    wiki: {
      characters: ["Siyah Adam", "Renk oyuncuları", "Hayaletler"],
      weapons: ["Oylama", "Şüphe", "Gece hedefi"],
      craft: ["Toplantı + doğru oy = yakalama"],
    },
    changelog: ["3-10 oyuncu odası", "Renk seçimi", "10 saniyelik gece kararı"],
  },
  vale: {
    progress: 70,
    difficulty: "Orta",
    averagePlayTime: "8 dk",
    lastUpdated: "Market ve yükseltme sistemi",
    hiddenAchievements: ["Hasarsız vale", "10 kat hedefi"],
    wiki: {
      characters: ["Vale", "Müşteri", "Market"],
      weapons: ["Fren", "Direksiyon", "Park alanı"],
      craft: ["Para + yükseltme = daha iyi vale işletmesi"],
    },
    changelog: ["3D park alanı", "Market sistemi", "Mobil sürüş paneli"],
  },
  "robot-avcisi": {
    progress: 78,
    difficulty: "Zor",
    averagePlayTime: "13 dk",
    lastUpdated: "Babylon vendor build'e eklendi",
    hiddenAchievements: ["İlk hurda", "Laboratuvar kaçışı"],
    wiki: {
      characters: ["Robot avcısı", "Güvenlik robotu", "Yardımcı robot"],
      weapons: ["Hurda silah", "Fener", "Craft masası"],
      craft: ["Hurda + enerji parçası = yeni silah"],
    },
    changelog: ["Tek oyunculu erişim düzeldi", "Fotoğraf kısayolu", "Mobil FPS paneli"],
  },
};

export const devDiaryEntries = [
  {
    title: "Günlük birleşim sistemi büyüyor",
    date: "Bugün",
    text: "Ana oyun ve özellik oyunu her gün değişen bir turnuva kartına bağlandı.",
  },
  {
    title: "Mobil oyuncular için sade HUD",
    date: "Mobil",
    text: "Telefon ekranında önemli düğmeler daha az yer kaplayacak şekilde toparlandı.",
  },
  {
    title: "Topluluk panosu açıldı",
    date: "Studio",
    text: "Yorum, oy verme, etkinlik ve geliştirici günlüğü aynı alanda toplanıyor.",
  },
];

export const developerBlogPosts = [
  "Yeni oyun eklerken önce oyun klasörü hazırlanır, sonra ana vitrindeki kart güncellenir.",
  "Birleşim Arenası, iki oyunun fikrini 24 saatlik özel moda çevirmek için tasarlandı.",
  "Mobil kontrollerin amacı arkadaşların telefondan hızlıca oyuna girebilmesi.",
];

export const upcomingUpdateCards = [
  { title: "Gerçek oyun ekran görüntüleri", status: "Sırada" },
  { title: "Birleşim Arenası görev çeşitleri", status: "Devam" },
  { title: "Profil rozet vitrini", status: "Yayında" },
  { title: "Fotoğraf yarışmaları", status: "Yeni" },
];

export const voteOptions = [
  { id: "uzay-yarisi", title: "Uzay Yarışı", description: "Roketle engellerden kaçılan hızlı oyun." },
  { id: "market-savasi", title: "Market Savaşı", description: "Raflardan güç toplayıp rakipleri geçen oyun." },
  { id: "okul-gorevi", title: "Okul Görevi", description: "Mini bulmacalarla sınıf sınıf ilerleyen macera." },
];

export const communityEvents = [
  { title: "Hafta sonu fotoğraf yarışı", reward: "Fotoğrafçı rozeti" },
  { title: "Birleşim Arenası puan gecesi", reward: "Birleşim madalyası" },
  { title: "Yeni oyun fikri oylaması", reward: "Topluluk etiketi" },
];

export const tournamentCalendar = [
  { day: "Pazartesi", title: "Lig Sıra Atlama", prize: "LP bonusu" },
  { day: "Çarşamba", title: "Birleşim Kupası", prize: "Birleşim rozeti" },
  { day: "Cumartesi", title: "Fotoğraf Finali", prize: "Haftanın fotoğrafı" },
];

export const seasonInfo = {
  title: "Sezon 1: Stüdyo Başlangıcı",
  reward: "Efsanevi profil çerçevesi",
  tournamentReward: "Şampiyon rozeti ve ana sayfa etiketi",
};

export const musicOptions = [
  { id: "studio", title: "Studio bipleri", frequency: 340 },
  { id: "space", title: "Uzay tonu", frequency: 180 },
  { id: "arcade", title: "Arcade hızlı", frequency: 520 },
];

export const randomTasks = [
  "Bugünün birleşimini aç.",
  "Bir oyuna yorum yaz.",
  "Bir fotoğrafı beğen.",
  "Rastgele oyun butonunu kullan.",
  "Yeni oyun oylamasında oy ver.",
];

export const surpriseBoxes = [
  "Bugünün sürprizi: +15 hayali LP ve yeşil enerji etiketi.",
  "Bugünün sürprizi: Fotoğraf yarışmasına otomatik adaylık.",
  "Bugünün sürprizi: HakoBot sana yeni oyun fikri önerdi.",
  "Bugünün sürprizi: Birleşim Arenası görev ipucu açıldı.",
];

export const notificationCards = [
  "Günün duyurusu hazır.",
  "Yeni oyun yorumu yazabilirsin.",
  "Birleşim görevi 24 saat içinde değişecek.",
];
