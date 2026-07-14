const LANGUAGE_LABELS = {
  tr: "Turkce",
  en: "English",
  el: "Ελληνικά",
  ar: "العربية",
  ko: "한국어",
  computer: "Bilgisayar Dili"
};

const TEXT = {
  tr: {
    title: "Robot Avcisi",
    subtitle: "Laboratuvardan kac, robotlari parcalara ayir, hurdalarla silahini guclendir.",
    newGame: "Yeni Oyun",
    continueGame: "Devam",
    settings: "Ayarlar",
    exit: "Cik",
    tabs: ["Oyun", "Ses", "Grafik", "Kontroller", "Party", "Dil", "Erisim", "Hakkinda"],
    difficulty: "Zorluk",
    difficultyOptions: ["Kolay", "Normal", "Zor"],
    crosshair: "Nisangah Ac/Kapat",
    cameraSensitivity: "Kamera hassasiyeti",
    fov: "Gorus acisi (FOV)",
    masterVolume: "Ana ses seviyesi",
    musicVolume: "Muzik sesi",
    sfxVolume: "Efekt sesleri",
    voiceVolume: "Sesli sohbet seviyesi",
    micTest: "Mikrofon testi",
    microphone: "Mikrofon Ac/Kapat",
    pushToTalk: "Push-to-Talk Ac/Kapat",
    resolution: "Cozunurluk",
    resolutionAuto: "Otomatik",
    fullscreen: "Tam ekran / Pencere",
    graphicsQuality: "Grafik kalitesi",
    qualityOptions: ["Dusuk", "Orta", "Yuksek", "Ultra"],
    fpsLimit: "FPS siniri",
    unlimited: "Sinirsiz",
    forward: "Ileri",
    backward: "Geri",
    left: "Sol",
    right: "Sag",
    sneak: "Gizlice yuru",
    interact: "Etkilesim",
    place: "Yardimci robot",
    cycleHelper: "Yardimci turu",
    craftWeapon: "Silah uret",
    reclaimBench: "Tezgahi bosalt",
    dropItem: "Cantadan birak",
    pushToTalkKey: "Push-to-Talk",
    flashlight: "El feneri",
    mouseSensitivity: "Fare hassasiyeti",
    invertY: "Y eksenini ters cevirme",
    autoVoice: "Sesli sohbeti otomatik ac",
    playerVoice: "Oyuncu ses seviyeleri",
    language: "Dil",
    languageOptions: ["Turkce", "English", "Ελληνικά", "العربية", "한국어", "Bilgisayar Dili"],
    subtitles: "Altyazilar",
    largeText: "Buyuk yazilar",
    colorBlind: "Renk koru modu",
    reduceShake: "Kamera sallanmasini azalt",
    version: "Oyun surumu:",
    credits: "Emeği Geçenler",
    developer: "Oyun Geliştiricisi",
    editors: "Editörler",
    music: "Müzikler ve Ses Efektleri",
    assets: "3D Modeller ve Asset'ler",
    translation: "Çeviri",
    later: "Daha sonra eklenecek.",
    thanks: "Özel Teşekkürler",
    thanksText: "Oyuna katkıda bulunan ve destek olan herkese teşekkür ederiz.",
    note: "Not",
    aiNote: "Bu oyunun geliştirme sürecinde yapay zekâ destekli araçlardan yararlanılmıştır.",
    thanksForPlaying: "Robot Avcısı'nı oynadığınız için teşekkür ederiz!",
    licenses: "Lisanslar:",
    licensesText: "Babylon.js ve ws paketleri kullanildi.",
    menuNote: "Cik dugmesi tarayici izin verirse siteyi kapatir.",
    confirmLanguage: "Dili degistirmek istediginize emin misiniz?",
    yes: "Evet",
    no: "Hayir",
    hud: ["Can", "Oda", "Hurda", "Parca", "Canta", "Fener", "Icerik", "Elektrik", "Silah", "Robot", "Gorev", "Kozmetik", "Gizlilik", "Gorunum", "Basarimlar"],
    powerOn: "Acik",
    pistol: "Tabanca",
    questStart: "5 robotu yok et",
    none: "Yok",
    startPrompt: "Baslamak icin ekrana tikla",
    computerTitle: "Laboratuvar Bilgisayari",
    computerSubtitle: "Parti kodu buradan olusturulur veya girilir.",
    close: "Kapat",
    name: "Ismin",
    partyCode: "Parti kodu",
    createParty: "Parti olustur",
    joinParty: "Koda katil",
    ready: "Hazirim",
    startParty: "Oyunu baslat",
    leaveParty: "Partiden cik",
    voice: "Ses",
    voiceOn: "Ses acik",
    serverOffline: "Sunucuya bagli degil.",
    chatPlaceholder: "Parti sohbeti veya /dans",
    send: "Gonder",
    changed: "Dil degisti: {language}",
    languageCancelled: "Dil degismedi."
  },
  en: {
    title: "Robot Hunter",
    subtitle: "Escape the laboratory, break robots into parts, and upgrade your weapon with scrap.",
    newGame: "New Game",
    continueGame: "Continue",
    settings: "Settings",
    exit: "Exit",
    tabs: ["Game", "Audio", "Graphics", "Controls", "Party", "Language", "Access", "About"],
    difficulty: "Difficulty",
    difficultyOptions: ["Easy", "Normal", "Hard"],
    crosshair: "Crosshair On/Off",
    cameraSensitivity: "Camera sensitivity",
    fov: "Field of view (FOV)",
    masterVolume: "Master volume",
    musicVolume: "Music volume",
    sfxVolume: "Effect volume",
    voiceVolume: "Voice chat volume",
    micTest: "Microphone test",
    microphone: "Microphone On/Off",
    pushToTalk: "Push-to-Talk On/Off",
    resolution: "Resolution",
    resolutionAuto: "Automatic",
    fullscreen: "Fullscreen / Window",
    graphicsQuality: "Graphics quality",
    qualityOptions: ["Low", "Medium", "High", "Ultra"],
    fpsLimit: "FPS limit",
    unlimited: "Unlimited",
    forward: "Forward",
    backward: "Backward",
    left: "Left",
    right: "Right",
    sneak: "Sneak",
    interact: "Interact",
    place: "Helper robot",
    cycleHelper: "Helper type",
    craftWeapon: "Craft weapon",
    reclaimBench: "Clear bench",
    dropItem: "Drop from backpack",
    pushToTalkKey: "Push-to-Talk",
    flashlight: "Flashlight",
    mouseSensitivity: "Mouse sensitivity",
    invertY: "Invert Y axis",
    autoVoice: "Auto-enable voice chat",
    playerVoice: "Player voice volume",
    language: "Language",
    languageOptions: ["Turkish", "English", "Greek", "Arabic", "Korean", "Computer Language"],
    subtitles: "Subtitles",
    largeText: "Large text",
    colorBlind: "Color blind mode",
    reduceShake: "Reduce camera shake",
    version: "Game version:",
    credits: "Credits",
    developer: "Game Developer",
    editors: "Editors",
    music: "Music and Sound Effects",
    assets: "3D Models and Assets",
    translation: "Translation",
    later: "To be added later.",
    thanks: "Special Thanks",
    thanksText: "Thank you to everyone who contributed to and supported the game.",
    note: "Note",
    aiNote: "AI-assisted tools were used during development of this game.",
    thanksForPlaying: "Thank you for playing Robot Hunter!",
    licenses: "Licenses:",
    licensesText: "Uses Babylon.js and ws packages.",
    menuNote: "The Exit button closes the site if the browser allows it.",
    confirmLanguage: "Are you sure you want to change the language?",
    yes: "Yes",
    no: "No",
    hud: ["Health", "Room", "Scrap", "Part", "Backpack", "Flashlight", "Contents", "Power", "Weapon", "Robot", "Quest", "Cosmetic", "Stealth", "Look", "Achievements"],
    powerOn: "On",
    pistol: "Pistol",
    questStart: "Destroy 5 robots",
    none: "None",
    startPrompt: "Click the screen to start",
    computerTitle: "Laboratory Computer",
    computerSubtitle: "Create or enter a party code here.",
    close: "Close",
    name: "Name",
    partyCode: "Party code",
    createParty: "Create party",
    joinParty: "Join code",
    ready: "Ready",
    startParty: "Start game",
    leaveParty: "Leave party",
    voice: "Voice",
    voiceOn: "Voice on",
    serverOffline: "Not connected to server.",
    chatPlaceholder: "Party chat or /dance",
    send: "Send",
    changed: "Language changed: {language}",
    languageCancelled: "Language was not changed."
  },
  el: {
    title: "Κυνηγός Ρομπότ",
    subtitle: "Ξέφυγε από το εργαστήριο, διάλυσε ρομπότ και δυνάμωσε το όπλο σου με παλιοσίδερα.",
    newGame: "Νέο Παιχνίδι",
    continueGame: "Συνέχεια",
    settings: "Ρυθμίσεις",
    exit: "Έξοδος",
    tabs: ["Παιχνίδι", "Ήχος", "Γραφικά", "Χειρισμός", "Party", "Γλώσσα", "Πρόσβαση", "Σχετικά"],
    difficulty: "Δυσκολία",
    difficultyOptions: ["Εύκολο", "Κανονικό", "Δύσκολο"],
    crosshair: "Στόχαστρο Άνοιγμα/Κλείσιμο",
    cameraSensitivity: "Ευαισθησία κάμερας",
    fov: "Οπτικό πεδίο (FOV)",
    masterVolume: "Κύρια ένταση",
    musicVolume: "Ένταση μουσικής",
    sfxVolume: "Ένταση εφέ",
    voiceVolume: "Ένταση φωνητικής συνομιλίας",
    micTest: "Δοκιμή μικροφώνου",
    microphone: "Μικρόφωνο Άνοιγμα/Κλείσιμο",
    pushToTalk: "Push-to-Talk Άνοιγμα/Κλείσιμο",
    resolution: "Ανάλυση",
    resolutionAuto: "Αυτόματο",
    fullscreen: "Πλήρης οθόνη / Παράθυρο",
    graphicsQuality: "Ποιότητα γραφικών",
    qualityOptions: ["Χαμηλή", "Μεσαία", "Υψηλή", "Ultra"],
    fpsLimit: "Όριο FPS",
    unlimited: "Χωρίς όριο",
    forward: "Μπροστά",
    backward: "Πίσω",
    left: "Αριστερά",
    right: "Δεξιά",
    sneak: "Κρυφή κίνηση",
    interact: "Αλληλεπίδραση",
    place: "Βοηθητικό ρομπότ",
    cycleHelper: "Τύπος βοηθού",
    craftWeapon: "Κατασκευή όπλου",
    reclaimBench: "Άδειασμα πάγκου",
    dropItem: "Ρίψη από σακίδιο",
    pushToTalkKey: "Push-to-Talk",
    flashlight: "Φακός",
    mouseSensitivity: "Ευαισθησία ποντικιού",
    invertY: "Αντιστροφή άξονα Y",
    autoVoice: "Αυτόματη φωνητική συνομιλία",
    playerVoice: "Ένταση φωνής παικτών",
    language: "Γλώσσα",
    languageOptions: ["Τουρκικά", "English", "Ελληνικά", "Αραβικά", "Κορεατικά", "Γλώσσα Υπολογιστή"],
    subtitles: "Υπότιτλοι",
    largeText: "Μεγάλα γράμματα",
    colorBlind: "Λειτουργία αχρωματοψίας",
    reduceShake: "Μείωση κουνήματος κάμερας",
    version: "Έκδοση παιχνιδιού:",
    credits: "Συντελεστές",
    developer: "Δημιουργός Παιχνιδιού",
    editors: "Επιμελητές",
    music: "Μουσική και Ηχητικά Εφέ",
    assets: "3D Μοντέλα και Assets",
    translation: "Μετάφραση",
    later: "Θα προστεθεί αργότερα.",
    thanks: "Ευχαριστίες",
    thanksText: "Ευχαριστούμε όλους όσοι βοήθησαν και στήριξαν το παιχνίδι.",
    note: "Σημείωση",
    aiNote: "Στη δημιουργία του παιχνιδιού χρησιμοποιήθηκαν εργαλεία τεχνητής νοημοσύνης.",
    thanksForPlaying: "Ευχαριστούμε που παίζεις το Robot Hunter!",
    licenses: "Άδειες:",
    licensesText: "Χρησιμοποιούνται τα πακέτα Babylon.js και ws.",
    menuNote: "Το κουμπί εξόδου κλείνει τη σελίδα αν το επιτρέπει ο browser.",
    confirmLanguage: "Είστε σίγουροι ότι θέλετε να αλλάξετε γλώσσα;",
    yes: "Ναι",
    no: "Όχι",
    hud: ["Ζωή", "Δωμάτιο", "Σκραπ", "Μέρος", "Σακίδιο", "Φακός", "Περιεχόμενα", "Ρεύμα", "Όπλο", "Ρομπότ", "Αποστολή", "Εμφάνιση", "Κρυφά", "Στυλ", "Επιτεύγματα"],
    powerOn: "Ανοιχτό",
    pistol: "Πιστόλι",
    questStart: "Κατάστρεψε 5 ρομπότ",
    none: "Κανένα",
    startPrompt: "Κάνε κλικ στην οθόνη για αρχή",
    computerTitle: "Υπολογιστής Εργαστηρίου",
    computerSubtitle: "Εδώ δημιουργείς ή βάζεις κωδικό party.",
    close: "Κλείσιμο",
    name: "Όνομα",
    partyCode: "Κωδικός party",
    createParty: "Δημιουργία party",
    joinParty: "Σύνδεση με κωδικό",
    ready: "Έτοιμος",
    startParty: "Έναρξη παιχνιδιού",
    leaveParty: "Έξοδος από party",
    voice: "Φωνή",
    voiceOn: "Φωνή ενεργή",
    serverOffline: "Δεν υπάρχει σύνδεση με server.",
    chatPlaceholder: "Party chat ή /dance",
    send: "Αποστολή",
    changed: "Η γλώσσα άλλαξε: {language}",
    languageCancelled: "Η γλώσσα δεν άλλαξε."
  },
  ar: {
    title: "صياد الروبوتات",
    subtitle: "اهرب من المختبر، فكك الروبوتات، وقو سلاحك بالخردة.",
    newGame: "لعبة جديدة",
    continueGame: "متابعة",
    settings: "الإعدادات",
    exit: "خروج",
    tabs: ["اللعبة", "الصوت", "الرسوم", "التحكم", "الفريق", "اللغة", "الوصول", "حول"],
    difficulty: "الصعوبة",
    difficultyOptions: ["سهل", "عادي", "صعب"],
    crosshair: "إظهار/إخفاء المؤشر",
    cameraSensitivity: "حساسية الكاميرا",
    fov: "مجال الرؤية (FOV)",
    masterVolume: "الصوت الرئيسي",
    musicVolume: "صوت الموسيقى",
    sfxVolume: "صوت المؤثرات",
    voiceVolume: "صوت الدردشة الصوتية",
    micTest: "اختبار الميكروفون",
    microphone: "تشغيل/إيقاف الميكروفون",
    pushToTalk: "تشغيل/إيقاف اضغط للتحدث",
    resolution: "الدقة",
    resolutionAuto: "تلقائي",
    fullscreen: "ملء الشاشة / نافذة",
    graphicsQuality: "جودة الرسوم",
    qualityOptions: ["منخفضة", "متوسطة", "عالية", "فائقة"],
    fpsLimit: "حد FPS",
    unlimited: "بدون حد",
    forward: "أمام",
    backward: "خلف",
    left: "يسار",
    right: "يمين",
    sneak: "تسلل",
    interact: "تفاعل",
    place: "روبوت مساعد",
    cycleHelper: "نوع المساعد",
    craftWeapon: "صنع سلاح",
    reclaimBench: "إفراغ الطاولة",
    dropItem: "إسقاط من الحقيبة",
    pushToTalkKey: "اضغط للتحدث",
    flashlight: "مصباح",
    mouseSensitivity: "حساسية الفأرة",
    invertY: "عكس محور Y",
    autoVoice: "تشغيل الدردشة الصوتية تلقائيا",
    playerVoice: "مستوى صوت اللاعبين",
    language: "اللغة",
    languageOptions: ["التركية", "English", "اليونانية", "العربية", "الكورية", "لغة الكمبيوتر"],
    subtitles: "الترجمة النصية",
    largeText: "نص كبير",
    colorBlind: "وضع عمى الألوان",
    reduceShake: "تقليل اهتزاز الكاميرا",
    version: "إصدار اللعبة:",
    credits: "فريق العمل",
    developer: "مطور اللعبة",
    editors: "المحررون",
    music: "الموسيقى والمؤثرات الصوتية",
    assets: "نماذج 3D والملفات",
    translation: "الترجمة",
    later: "سيضاف لاحقا.",
    thanks: "شكر خاص",
    thanksText: "شكرا لكل من ساهم ودعم اللعبة.",
    note: "ملاحظة",
    aiNote: "تم استخدام أدوات مدعومة بالذكاء الاصطناعي أثناء تطوير هذه اللعبة.",
    thanksForPlaying: "شكرا للعب Robot Hunter!",
    licenses: "التراخيص:",
    licensesText: "تستخدم حزم Babylon.js و ws.",
    menuNote: "زر الخروج يغلق الموقع إذا سمح المتصفح.",
    confirmLanguage: "هل أنت متأكد أنك تريد تغيير اللغة؟",
    yes: "نعم",
    no: "لا",
    hud: ["الصحة", "الغرفة", "الخردة", "قطعة", "الحقيبة", "المصباح", "المحتوى", "الكهرباء", "السلاح", "روبوت", "المهمة", "المظهر", "تخفي", "الشكل", "الإنجازات"],
    powerOn: "يعمل",
    pistol: "مسدس",
    questStart: "دمر 5 روبوتات",
    none: "لا يوجد",
    startPrompt: "اضغط على الشاشة للبدء",
    computerTitle: "كمبيوتر المختبر",
    computerSubtitle: "أنشئ أو أدخل رمز الفريق هنا.",
    close: "إغلاق",
    name: "اسمك",
    partyCode: "رمز الفريق",
    createParty: "إنشاء فريق",
    joinParty: "انضم بالرمز",
    ready: "جاهز",
    startParty: "ابدأ اللعبة",
    leaveParty: "غادر الفريق",
    voice: "صوت",
    voiceOn: "الصوت يعمل",
    serverOffline: "غير متصل بالخادم.",
    chatPlaceholder: "دردشة الفريق أو /dance",
    send: "إرسال",
    changed: "تم تغيير اللغة: {language}",
    languageCancelled: "لم تتغير اللغة."
  },
  ko: {
    title: "로봇 헌터",
    subtitle: "실험실에서 탈출하고 로봇을 부품으로 부수고 고철로 무기를 강화하세요.",
    newGame: "새 게임",
    continueGame: "계속",
    settings: "설정",
    exit: "나가기",
    tabs: ["게임", "소리", "그래픽", "조작", "파티", "언어", "접근성", "정보"],
    difficulty: "난이도",
    difficultyOptions: ["쉬움", "보통", "어려움"],
    crosshair: "조준점 켜기/끄기",
    cameraSensitivity: "카메라 감도",
    fov: "시야각 (FOV)",
    masterVolume: "전체 소리",
    musicVolume: "음악 소리",
    sfxVolume: "효과음",
    voiceVolume: "음성 채팅 소리",
    micTest: "마이크 테스트",
    microphone: "마이크 켜기/끄기",
    pushToTalk: "Push-to-Talk 켜기/끄기",
    resolution: "해상도",
    resolutionAuto: "자동",
    fullscreen: "전체 화면 / 창",
    graphicsQuality: "그래픽 품질",
    qualityOptions: ["낮음", "중간", "높음", "울트라"],
    fpsLimit: "FPS 제한",
    unlimited: "무제한",
    forward: "앞으로",
    backward: "뒤로",
    left: "왼쪽",
    right: "오른쪽",
    sneak: "은신 이동",
    interact: "상호작용",
    place: "도우미 로봇",
    cycleHelper: "도우미 종류",
    craftWeapon: "무기 제작",
    reclaimBench: "작업대 비우기",
    dropItem: "배낭에서 버리기",
    pushToTalkKey: "Push-to-Talk",
    flashlight: "손전등",
    mouseSensitivity: "마우스 감도",
    invertY: "Y축 반전",
    autoVoice: "음성 채팅 자동 켜기",
    playerVoice: "플레이어 음성 크기",
    language: "언어",
    languageOptions: ["터키어", "English", "그리스어", "아랍어", "한국어", "컴퓨터 언어"],
    subtitles: "자막",
    largeText: "큰 글자",
    colorBlind: "색각 보정 모드",
    reduceShake: "카메라 흔들림 줄이기",
    version: "게임 버전:",
    credits: "크레딧",
    developer: "게임 개발자",
    editors: "편집자",
    music: "음악과 효과음",
    assets: "3D 모델과 에셋",
    translation: "번역",
    later: "나중에 추가됩니다.",
    thanks: "특별 감사",
    thanksText: "게임에 도움을 주고 응원해 준 모든 분께 감사합니다.",
    note: "메모",
    aiNote: "이 게임 개발에는 AI 보조 도구가 사용되었습니다.",
    thanksForPlaying: "Robot Hunter를 플레이해 주셔서 감사합니다!",
    licenses: "라이선스:",
    licensesText: "Babylon.js 및 ws 패키지를 사용합니다.",
    menuNote: "브라우저가 허용하면 나가기 버튼이 사이트를 닫습니다.",
    confirmLanguage: "언어를 변경하시겠습니까?",
    yes: "예",
    no: "아니요",
    hud: ["체력", "방", "고철", "부품", "가방", "손전등", "내용", "전기", "무기", "로봇", "퀘스트", "꾸미기", "은신", "외형", "업적"],
    powerOn: "켜짐",
    pistol: "권총",
    questStart: "로봇 5대 파괴",
    none: "없음",
    startPrompt: "시작하려면 화면을 클릭하세요",
    computerTitle: "실험실 컴퓨터",
    computerSubtitle: "여기서 파티 코드를 만들거나 입력합니다.",
    close: "닫기",
    name: "이름",
    partyCode: "파티 코드",
    createParty: "파티 만들기",
    joinParty: "코드로 참가",
    ready: "준비",
    startParty: "게임 시작",
    leaveParty: "파티 나가기",
    voice: "음성",
    voiceOn: "음성 켜짐",
    serverOffline: "서버에 연결되지 않았습니다.",
    chatPlaceholder: "파티 채팅 또는 /dance",
    send: "보내기",
    changed: "언어 변경됨: {language}",
    languageCancelled: "언어가 변경되지 않았습니다."
  }
};

const GAMEPLAY_TEXT = {
  tr: {
    promptShoot: "Sol tik: ates et",
    promptComputerOpen: "{key}: laboratuvar bilgisayarini ac",
    promptWorkbench: "{upgrade}: silahi guclendir | {craft}: yeni silah uret | {place}: {helper} yap | {cycle}: tur degistir | {reclaim}: geri al | {status}",
    promptNextRoom: "{key}: sonraki odaya gec",
    promptDoorLocked: "Kapi kilitli: once robotlari temizle",
    promptGenerator: "{key}: jeneratoru calistir",
    promptControlRoom: "{key}: kontrol odasini ele gecir",
    promptSneak: "Gizli ilerliyorsun: kameralar seni daha zor gorur",
    promptCameraSneak: "{key}: kameralar yakinda, gizlice yuru",
    promptPointer: "Fare kontrolu icin ekrana tikla",
    stealthAlarm: "Alarm",
    stealthHidden: "Gizli",
    stealthNormal: "Normal",
    stealthWatched: "Tespit {percent}%",
    questKillRobots: "5 robotu yok et",
    questGenerator: "Jeneratoru calistir",
    questControlRoom: "Kontrol odasini ele gecir",
    questAllComplete: "Tum gorevler tamamlandi",
    weaponPistol: "Tabanca",
    weaponScrapRifle: "Hurda Tufegi",
    weaponIonBlaster: "Iyon Patlatici",
    helperMiner: "Madenci robot",
    helperFighter: "Savasci robot",
    cosmeticCap: "Hurda Sapkasi",
    cosmeticHelmet: "Robot Kaski",
    cosmeticArmor: "Robot Kostumu",
    cosmeticRobotSkin: "Neon Robot Gorunumu",
    roomLab: "Laboratuvar",
    roomDarkStorage: "Karanlik Depo",
    roomControlWing: "Kontrol Kanadi",
    roomBossBay: "Boss Bolmesi",
    logScrapCollected: "{count} hurda toplandi.",
    logPartsCollected: "{count} robot parcasi toplandi.",
    logBackpackFull: "Sirt cantasi dolu. Tezgahta malzeme kullan veya yedek pil birak.",
    logDroppedScrap: "Cantadan 1 hurda birakildi.",
    logDroppedPart: "Cantadan 1 robot parcasi birakildi.",
    logDroppedBattery: "Cantadan 1 yedek pil birakildi.",
    logDropNothing: "Cantanda birakacak malzeme yok.",
    logRespawned: "Laboratuvarda yeniden uyandin.",
    logRoomCleared: "Oda temizlendi. Kapi acildi.",
    logGeneratorAlreadyOn: "Jenerator zaten calisiyor.",
    logControlAlarmOff: "Kontrol odasi alarmi kapatti.",
    logSecuritySystemDisabled: "Guvenlik sistemi kapatildi.",
    logPartyStarted: "Party basladi. Laboratuvar gorevi acildi.",
    logDoorLocked: "Kapi kilitli. Once robotlari temizle.",
    logDoorLockedRemaining: "Kapi kilitli. Kalan robot: {count}.",
    logRoomStarted: "Oda {room}: {name} basladi.",
    logNewGame: "Yeni oyun basladi.",
    logNoSave: "Kayit bulunamadi. Yeni oyun baslatildi.",
    logRobotDestroyed: "{robot} parcalandi.",
    logDance: "{name} dans ediyor.",
    logHighFive: "{name}, {target} ile cak yapti.",
    logNoHighFive: "Yakinda cak yapacak oyuncu yok.",
    logHug: "{name}, {target} ile sarildi.",
    logNoHug: "Yakinda sarilacak oyuncu yok.",
    logTestDisabled: "Test komutu kapali.",
    logTestHealed: "Test komutu: can yenilendi.",
    logUnknownCommand: "Bilinmeyen komut: {command}",
    logRemoteCommand: "{name} komutu gorundu: {command}",
    logTooManyShots: "Cok fazla ates edildi.",
    logExplosionAlarm: "Patlama yapildi.",
    logAlarmTriggered: "{reason} Alarm tetiklendi.",
    logSecurityCameraSpotted: "Guvenlik kamerasi seni gordu.",
    logAlarmReinforcement: "Alarm takviyesi geldi: {count} guclu robot.",
    logAlarmRobotsRetreated: "Alarm robotlari geri cekildi: {count}.",
    logAlarmEnded: "Alarm suresi bitti.",
    logDifficultyApplied: "Zorluk uygulandi: {difficulty}",
    logNoScrap: "Sirt cantanda hurda yok.",
    logNoParts: "Sirt cantanda robot parcasi yok.",
    logScrapOnBench: "Tezgaha hurda koyuldu: {count}/{target}",
    logPartOnBench: "Tezgaha robot parcasi koyuldu: {count}/{target}",
    logHelperSelected: "Yardimci robot secildi: {helper}.",
    logAllWeaponsCrafted: "Tum silahlar uretildi.",
    logWeaponNeedsParts: "{weapon} icin robot parcasi lazim.",
    logWeaponNeedsScrap: "{weapon} icin hurda lazim.",
    logWeaponBenchProgress: "{weapon} tezgahi: parca {parts}/{partsTarget}, hurda {scrap}/{scrapTarget}",
    logBenchEmpty: "Tezgahta geri alinacak malzeme yok.",
    logBenchReturnBlocked: "Sirt cantasi dolu. Tezgahtaki malzemeler kaldi.",
    logBenchReturned: "Tezgahtan geri alindi: {scrap} hurda, {parts} parca.",
    logBenchStillHasItems: "Tezgahta {count} malzeme kaldi.",
    benchStatusEmpty: "Tezgah bos",
    benchStatusUpgrade: "Guc: {count}/{target} hurda",
    benchStatusHelper: "{helper}: {count}/{target} parca",
    benchStatusWeapon: "{weapon}: parca {parts}/{partsTarget}, hurda {scrap}/{scrapTarget}",
    benchStatusAllWeapons: "Tum silahlar",
    inventoryScrap: "Hurda",
    inventoryParts: "Parca",
    inventoryBattery: "Pil",
    inventoryBatteryPack: "Yedek pil",
    inventoryFree: "Bos yer",
    healthPromptEmpty: "{key}: can istasyonu sarj bekliyor",
    healthPromptPreparing: "Can istasyonu hazirlaniyor",
    healthPromptReady: "{key}: can istasyonunu kullan ({charges}/{max})",
    logHealthRecharged: "Can istasyonu sarj oldu: {charges}/{max}.",
    logHealthFull: "Canin zaten dolu.",
    logHealthCharging: "Can istasyonu sarj bekliyor.",
    logHealthPreparing: "Can istasyonu tekrar hazirlaniyor.",
    logHealthUsed: "Can istasyonu kullanildi: +{amount} can.",
    achievementRobot100: "100 robot yok et",
    achievementNoDeathRoom: "Hic olmeden bolumu bitir",
    achievementScrap1000: "1000 hurda topla",
    achievementSoloBoss: "Boss'u tek basina yen",
    achievementUnlocked: "Acildi",
    logAchievementUnlocked: "Basarim acildi: {achievement}",
    cosmeticLocked: "kilitli",
    cosmeticSelect: "sec",
    logCosmeticUnlocked: "{cosmetic} kozmetigi acildi.",
    logFlashlightBatteryEmpty: "Fenerin pili bitti.",
    logFlashlightOn: "Fener acildi.",
    logFlashlightOff: "Fener kapandi.",
    logFlashlightBatteryLow: "Fener pili azaldi.",
    logFlashlightBatteryEmptyFind: "Fenerin pili bitti. Yeni pil bul.",
    logBatteryFound: "Fener pili bulundu.",
    logBatteryStored: "Yedek pil cantaya eklendi: {count}.",
    logBatteryAutoLoaded: "Yedek pil takildi.",
    logVoiceChatOn: "Sesli sohbet acildi.",
    logVoiceChatOff: "Sesli sohbet kapandi.",
    logVoicePermissionDenied: "Mikrofon izni alinamadi.",
    logVoiceCandidateRejected: "Ses baglantisi adayi reddedildi.",
    logVoiceConnectionFailed: "Ses baglantisi baslatilamadi.",
    logQuestCompleted: "Gorev tamamlandi: {quest}",
    logBulletMissed: "Mermi duvara carpti.",
    logRobotPartHit: "{robot} {part} parcasi vuruldu.",
    logWeaponUpgraded: "Silah guclendi: {weapon} +{level}",
    logWeaponCrafted: "Yeni silah yapildi: {weapon}",
    logWeaponSlotLocked: "{slot}. silah henuz uretilmedi.",
    logWeaponSelected: "Silah secildi: {weapon}",
    logExplosionWave: "Patlama dalgasi {count} robota ulasti.",
    robotNormal: "Normal robot",
    robotFast: "Hizli robot",
    robotShield: "Kalkanli robot",
    robotDrone: "Ucan drone",
    robotBoss: "Dev boss robot",
    partBody: "govde",
    partHead: "bas",
    partLeftArm: "sol kol",
    partRightArm: "sag kol",
    partLeftLeg: "sol bacak",
    partRightLeg: "sag bacak",
    partLeftRotor: "sol pervane",
    partRightRotor: "sag pervane",
    logPowerStable: "Elektrik sistemi sabit. Kesinti yok.",
    logGeneratorChecked: "Jenerator kontrol edildi. Elektrik acik.",
    logGeneratorRestored: "Jenerator calisti. Elektrik geri geldi.",
    logHelperBuilt: "{helper} uretildi.",
    logMinerCollected: "Madenci robot {count} hurda topladi.",
    logMinerPartsCollected: "Madenci robot {count} parca topladi.",
    logFighterShot: "Savasci robot hedefe ates etti.",
    logSaveLoaded: "Kayit yuklendi.",
    partyConnecting: "Baglaniyor...",
    partyKicked: "Partiden atildin.",
    partyCommandUsed: "{name} komut kullandi: {command}",
    partyGameStarted: "Parti oyunu basladi.",
    partyNotReadyButton: "Hazir degilim",
    partyStatusConnected: "{code} kodlu parti",
    partyStatusReadyCount: "{code} kodlu parti - hazir {ready}/{total}",
    partyOwnerBadge: "kurucu",
    partyReadyBadge: "hazir",
    partyWaitingBadge: "bekliyor",
    partyRoomBadge: "oda {room}",
    partyHpBadge: "can {hp}",
    partyKick: "At",
    partyVoiceNeedsParty: "Sesli sohbet icin once partiye katil.",
    partyChatNeedsParty: "Sohbet icin once partiye katil.",
    partyErrorInvalidMessage: "Mesaj bozuk geldi.",
    partyErrorLimit: "En fazla 3 parti olabilir.",
    partyErrorNotFound: "Bu kodda parti yok.",
    partyErrorStarted: "Bu parti basladi.",
    partyErrorFull: "Bu parti dolu. En fazla 5 oyuncu olabilir.",
    partyErrorNotReady: "Baslatmak icin herkes hazir olmali.",
    partyErrorUnknown: "Parti hatasi."
  },
  en: {
    promptShoot: "Left click: shoot",
    promptComputerOpen: "{key}: open laboratory computer",
    promptWorkbench: "{upgrade}: upgrade weapon | {craft}: craft weapon | {place}: build {helper} | {cycle}: change type | {reclaim}: reclaim | {status}",
    promptNextRoom: "{key}: go to next room",
    promptDoorLocked: "Door locked: clear the robots first",
    promptGenerator: "{key}: start generator",
    promptControlRoom: "{key}: capture control room",
    promptSneak: "Sneaking: cameras detect you more slowly",
    promptCameraSneak: "{key}: cameras nearby, sneak",
    promptPointer: "Click the screen for mouse control",
    stealthAlarm: "Alarm",
    stealthHidden: "Sneak",
    stealthNormal: "Normal",
    stealthWatched: "Detected {percent}%",
    questKillRobots: "Destroy 5 robots",
    questGenerator: "Start the generator",
    questControlRoom: "Capture the control room",
    questAllComplete: "All quests complete",
    weaponPistol: "Pistol",
    weaponScrapRifle: "Scrap Rifle",
    weaponIonBlaster: "Ion Blaster",
    helperMiner: "Miner robot",
    helperFighter: "Fighter robot",
    cosmeticCap: "Scrap Cap",
    cosmeticHelmet: "Robot Helmet",
    cosmeticArmor: "Robot Suit",
    cosmeticRobotSkin: "Neon Robot Skin",
    roomLab: "Laboratory",
    roomDarkStorage: "Dark Storage",
    roomControlWing: "Control Wing",
    roomBossBay: "Boss Bay",
    logScrapCollected: "{count} scrap collected.",
    logPartsCollected: "{count} robot part collected.",
    logBackpackFull: "Backpack full. Use materials at the workbench or drop a spare battery.",
    logDroppedScrap: "Dropped 1 scrap from the backpack.",
    logDroppedPart: "Dropped 1 robot part from the backpack.",
    logDroppedBattery: "Dropped 1 spare battery from the backpack.",
    logDropNothing: "No material to drop in your backpack.",
    logRespawned: "You woke up again in the laboratory.",
    logRoomCleared: "Room cleared. Door opened.",
    logGeneratorAlreadyOn: "Generator is already running.",
    logControlAlarmOff: "Control room shut down the alarm.",
    logSecuritySystemDisabled: "Security system disabled.",
    logPartyStarted: "Party started. Laboratory mission opened.",
    logDoorLocked: "Door locked. Clear the robots first.",
    logDoorLockedRemaining: "Door locked. Robots remaining: {count}.",
    logRoomStarted: "Room {room}: {name} started.",
    logNewGame: "New game started.",
    logNoSave: "No save found. New game started.",
    logRobotDestroyed: "{robot} destroyed.",
    logDance: "{name} is dancing.",
    logHighFive: "{name} high-fived {target}.",
    logNoHighFive: "No nearby player to high-five.",
    logHug: "{name} hugged {target}.",
    logNoHug: "No nearby player to hug.",
    logTestDisabled: "Test command disabled.",
    logTestHealed: "Test command: health restored.",
    logUnknownCommand: "Unknown command: {command}",
    logRemoteCommand: "{name} command shown: {command}",
    logTooManyShots: "Too many shots fired.",
    logExplosionAlarm: "Explosion detected.",
    logAlarmTriggered: "{reason} Alarm triggered.",
    logSecurityCameraSpotted: "Security camera spotted you.",
    logAlarmReinforcement: "Alarm reinforcements arrived: {count} strong robot.",
    logAlarmRobotsRetreated: "Alarm robots retreated: {count}.",
    logAlarmEnded: "Alarm timer ended.",
    logDifficultyApplied: "Difficulty applied: {difficulty}",
    logNoScrap: "No scrap in your backpack.",
    logNoParts: "No robot parts in your backpack.",
    logScrapOnBench: "Scrap placed on bench: {count}/{target}",
    logPartOnBench: "Robot part placed on bench: {count}/{target}",
    logHelperSelected: "Helper robot selected: {helper}.",
    logAllWeaponsCrafted: "All weapons crafted.",
    logWeaponNeedsParts: "{weapon} needs robot parts.",
    logWeaponNeedsScrap: "{weapon} needs scrap.",
    logWeaponBenchProgress: "{weapon} bench: parts {parts}/{partsTarget}, scrap {scrap}/{scrapTarget}",
    logBenchEmpty: "No materials to reclaim on the bench.",
    logBenchReturnBlocked: "Backpack full. Bench materials stayed in place.",
    logBenchReturned: "Reclaimed from bench: {scrap} scrap, {parts} parts.",
    logBenchStillHasItems: "{count} materials remain on the bench.",
    benchStatusEmpty: "Bench empty",
    benchStatusUpgrade: "Power: {count}/{target} scrap",
    benchStatusHelper: "{helper}: {count}/{target} parts",
    benchStatusWeapon: "{weapon}: parts {parts}/{partsTarget}, scrap {scrap}/{scrapTarget}",
    benchStatusAllWeapons: "All weapons",
    inventoryScrap: "Scrap",
    inventoryParts: "Parts",
    inventoryBattery: "Battery",
    inventoryBatteryPack: "Spare battery",
    inventoryFree: "Free",
    healthPromptEmpty: "{key}: health station recharging",
    healthPromptPreparing: "Health station preparing",
    healthPromptReady: "{key}: use health station ({charges}/{max})",
    logHealthRecharged: "Health station recharged: {charges}/{max}.",
    logHealthFull: "Health already full.",
    logHealthCharging: "Health station is recharging.",
    logHealthPreparing: "Health station is preparing.",
    logHealthUsed: "Health station used: +{amount} health.",
    achievementRobot100: "Destroy 100 robots",
    achievementNoDeathRoom: "Clear a room without dying",
    achievementScrap1000: "Collect 1000 scrap",
    achievementSoloBoss: "Defeat the boss solo",
    achievementUnlocked: "Unlocked",
    logAchievementUnlocked: "Achievement unlocked: {achievement}",
    cosmeticLocked: "locked",
    cosmeticSelect: "select",
    logCosmeticUnlocked: "{cosmetic} cosmetic unlocked.",
    logFlashlightBatteryEmpty: "Flashlight battery is empty.",
    logFlashlightOn: "Flashlight on.",
    logFlashlightOff: "Flashlight off.",
    logFlashlightBatteryLow: "Flashlight battery is low.",
    logFlashlightBatteryEmptyFind: "Flashlight battery is empty. Find a new battery.",
    logBatteryFound: "Flashlight battery found.",
    logBatteryStored: "Spare battery added to backpack: {count}.",
    logBatteryAutoLoaded: "Spare battery loaded.",
    logVoiceChatOn: "Voice chat on.",
    logVoiceChatOff: "Voice chat off.",
    logVoicePermissionDenied: "Microphone permission was denied.",
    logVoiceCandidateRejected: "Voice connection candidate was rejected.",
    logVoiceConnectionFailed: "Voice connection could not start.",
    logQuestCompleted: "Quest completed: {quest}",
    logBulletMissed: "Bullet hit the wall.",
    logRobotPartHit: "{robot} {part} part hit.",
    logWeaponUpgraded: "Weapon upgraded: {weapon} +{level}",
    logWeaponCrafted: "New weapon crafted: {weapon}",
    logWeaponSlotLocked: "Weapon {slot} has not been crafted yet.",
    logWeaponSelected: "Weapon selected: {weapon}",
    logExplosionWave: "Explosion wave hit {count} robots.",
    robotNormal: "Normal robot",
    robotFast: "Fast robot",
    robotShield: "Shield robot",
    robotDrone: "Flying drone",
    robotBoss: "Giant boss robot",
    partBody: "body",
    partHead: "head",
    partLeftArm: "left arm",
    partRightArm: "right arm",
    partLeftLeg: "left leg",
    partRightLeg: "right leg",
    partLeftRotor: "left rotor",
    partRightRotor: "right rotor",
    logPowerStable: "Power system is fixed. No outage.",
    logGeneratorChecked: "Generator checked. Power is on.",
    logGeneratorRestored: "Generator started. Power restored.",
    logHelperBuilt: "{helper} built.",
    logMinerCollected: "Miner robot collected {count} scrap.",
    logMinerPartsCollected: "Miner robot collected {count} parts.",
    logFighterShot: "Fighter robot fired at the target.",
    logSaveLoaded: "Save loaded.",
    partyConnecting: "Connecting...",
    partyKicked: "You were kicked from the party.",
    partyCommandUsed: "{name} used command: {command}",
    partyGameStarted: "Party game started.",
    partyNotReadyButton: "Not ready",
    partyStatusConnected: "Party {code}",
    partyStatusReadyCount: "Party {code} - ready {ready}/{total}",
    partyOwnerBadge: "leader",
    partyReadyBadge: "ready",
    partyWaitingBadge: "waiting",
    partyRoomBadge: "room {room}",
    partyHpBadge: "hp {hp}",
    partyKick: "Kick",
    partyVoiceNeedsParty: "Join or create a party before using voice chat.",
    partyChatNeedsParty: "Join or create a party before chatting.",
    partyErrorInvalidMessage: "Invalid party message.",
    partyErrorLimit: "There can be at most 3 parties.",
    partyErrorNotFound: "No party exists with that code.",
    partyErrorStarted: "That party has already started.",
    partyErrorFull: "That party is full. Max 5 players.",
    partyErrorNotReady: "Everyone must be ready to start.",
    partyErrorUnknown: "Party error."
  },
  el: {
    promptShoot: "Αριστερό κλικ: πυροβολισμός",
    promptComputerOpen: "{key}: άνοιγμα υπολογιστή εργαστηρίου",
    promptWorkbench: "{upgrade}: αναβάθμιση όπλου | {craft}: κατασκευή όπλου | {place}: κατασκευή {helper} | {cycle}: αλλαγή τύπου | {reclaim}: επιστροφή | {status}",
    promptNextRoom: "{key}: επόμενο δωμάτιο",
    promptDoorLocked: "Η πόρτα είναι κλειδωμένη: καθάρισε πρώτα τα ρομπότ",
    promptGenerator: "{key}: εκκίνηση γεννήτριας",
    promptControlRoom: "{key}: κατάληψη αίθουσας ελέγχου",
    promptSneak: "Κινείσαι κρυφά: οι κάμερες σε βλέπουν πιο δύσκολα",
    promptCameraSneak: "{key}: κάμερες κοντά, κινήσου κρυφά",
    promptPointer: "Κάνε κλικ στην οθόνη για έλεγχο ποντικιού",
    stealthAlarm: "Συναγερμός",
    stealthHidden: "Κρυφά",
    stealthNormal: "Κανονικά",
    stealthWatched: "Εντοπισμός {percent}%",
    questKillRobots: "Κατάστρεψε 5 ρομπότ",
    questGenerator: "Εκκίνησε τη γεννήτρια",
    questControlRoom: "Κατέλαβε την αίθουσα ελέγχου",
    questAllComplete: "Όλες οι αποστολές ολοκληρώθηκαν",
    weaponPistol: "Πιστόλι",
    weaponScrapRifle: "Τουφέκι Σκραπ",
    weaponIonBlaster: "Ιονικός Εκρηκτής",
    helperMiner: "Ρομπότ μεταλλωρύχος",
    helperFighter: "Ρομπότ μαχητής",
    cosmeticCap: "Καπέλο Σκραπ",
    cosmeticHelmet: "Κράνος Ρομπότ",
    cosmeticArmor: "Στολή Ρομπότ",
    cosmeticRobotSkin: "Neon Robot Skin",
    roomLab: "Εργαστήριο",
    roomDarkStorage: "Σκοτεινή Αποθήκη",
    roomControlWing: "Πτέρυγα Ελέγχου",
    roomBossBay: "Θάλαμος Boss",
    achievementRobot100: "Κατάστρεψε 100 ρομπότ",
    achievementNoDeathRoom: "Καθάρισε δωμάτιο χωρίς θάνατο",
    achievementScrap1000: "Σύλλεξε 1000 σκραπ",
    achievementSoloBoss: "Νίκησε το boss μόνος",
    achievementUnlocked: "Ξεκλειδώθηκε",
    cosmeticLocked: "κλειδωμένο",
    cosmeticSelect: "επιλογή",
    logFlashlightBatteryEmpty: "Η μπαταρία του φακού τελείωσε.",
    logFlashlightOn: "Ο φακός άνοιξε.",
    logFlashlightOff: "Ο φακός έκλεισε.",
    logBatteryFound: "Βρέθηκε μπαταρία φακού.",
    logBatteryStored: "Εφεδρική μπαταρία στο σακίδιο: {count}.",
    logBatteryAutoLoaded: "Τοποθετήθηκε εφεδρική μπαταρία.",
    logDroppedScrap: "Έριξες 1 σκραπ από το σακίδιο.",
    logDroppedPart: "Έριξες 1 κομμάτι ρομπότ από το σακίδιο.",
    logDroppedBattery: "Έριξες 1 εφεδρική μπαταρία από το σακίδιο.",
    logDropNothing: "Δεν υπάρχει υλικό για ρίψη στο σακίδιο.",
    logQuestCompleted: "Αποστολή ολοκληρώθηκε: {quest}",
    inventoryScrap: "Σκραπ",
    inventoryParts: "Μέρη",
    inventoryBattery: "Μπαταρία",
    inventoryBatteryPack: "Εφεδρική μπαταρία",
    inventoryFree: "Ελεύθερο",
    partyConnecting: "Σύνδεση...",
    partyKicked: "Σε έβγαλαν από το party.",
    partyGameStarted: "Το party ξεκίνησε.",
    partyNotReadyButton: "Δεν είμαι έτοιμος",
    partyStatusConnected: "Party {code}",
    partyStatusReadyCount: "Party {code} - έτοιμοι {ready}/{total}",
    partyOwnerBadge: "αρχηγός",
    partyReadyBadge: "έτοιμος",
    partyWaitingBadge: "αναμονή",
    partyRoomBadge: "δωμάτιο {room}",
    partyHpBadge: "ζωή {hp}",
    partyKick: "Βγάλσιμο",
    partyVoiceNeedsParty: "Μπες ή δημιούργησε party πριν τη φωνητική συνομιλία.",
    partyChatNeedsParty: "Μπες ή δημιούργησε party πριν τη συνομιλία.",
    partyCommandUsed: "{name} χρησιμοποίησε εντολή: {command}",
    partyErrorInvalidMessage: "Το μήνυμα party δεν είναι έγκυρο.",
    partyErrorLimit: "Μπορούν να υπάρχουν το πολύ 3 party.",
    partyErrorNotFound: "Δεν υπάρχει party με αυτόν τον κωδικό.",
    partyErrorStarted: "Αυτό το party έχει ήδη ξεκινήσει.",
    partyErrorFull: "Αυτό το party είναι γεμάτο. Μέγιστο 5 παίκτες.",
    partyErrorNotReady: "Όλοι πρέπει να είναι έτοιμοι για να ξεκινήσει.",
    partyErrorUnknown: "Σφάλμα party.",
    healthPromptEmpty: "{key}: ο σταθμός ζωής φορτίζει",
    healthPromptPreparing: "Ο σταθμός ζωής ετοιμάζεται",
    healthPromptReady: "{key}: χρήση σταθμού ζωής ({charges}/{max})"
  },
  ar: {
    promptShoot: "النقر الأيسر: إطلاق النار",
    promptComputerOpen: "{key}: فتح كمبيوتر المختبر",
    promptWorkbench: "{upgrade}: تطوير السلاح | {craft}: صنع سلاح | {place}: بناء {helper} | {cycle}: تغيير النوع | {reclaim}: استرجاع | {status}",
    promptNextRoom: "{key}: الغرفة التالية",
    promptDoorLocked: "الباب مغلق: اقض على الروبوتات أولا",
    promptGenerator: "{key}: تشغيل المولد",
    promptControlRoom: "{key}: السيطرة على غرفة التحكم",
    promptSneak: "أنت تتسلل: الكاميرات تراك بصعوبة أكبر",
    promptCameraSneak: "{key}: الكاميرات قريبة، تسلل",
    promptPointer: "اضغط على الشاشة للتحكم بالفأرة",
    stealthAlarm: "إنذار",
    stealthHidden: "تسلل",
    stealthNormal: "عادي",
    stealthWatched: "كشف {percent}%",
    questKillRobots: "دمر 5 روبوتات",
    questGenerator: "شغل المولد",
    questControlRoom: "سيطر على غرفة التحكم",
    questAllComplete: "اكتملت كل المهام",
    weaponPistol: "مسدس",
    weaponScrapRifle: "بندقية خردة",
    weaponIonBlaster: "مدفع أيوني",
    helperMiner: "روبوت عامل منجم",
    helperFighter: "روبوت مقاتل",
    cosmeticCap: "قبعة خردة",
    cosmeticHelmet: "خوذة روبوت",
    cosmeticArmor: "بدلة روبوت",
    cosmeticRobotSkin: "مظهر روبوت نيون",
    roomLab: "المختبر",
    roomDarkStorage: "المخزن المظلم",
    roomControlWing: "جناح التحكم",
    roomBossBay: "غرفة الزعيم",
    achievementRobot100: "دمر 100 روبوت",
    achievementNoDeathRoom: "أنهِ غرفة دون أن تموت",
    achievementScrap1000: "اجمع 1000 خردة",
    achievementSoloBoss: "اهزم الزعيم وحدك",
    achievementUnlocked: "مفتوح",
    cosmeticLocked: "مقفل",
    cosmeticSelect: "اختيار",
    logFlashlightBatteryEmpty: "بطارية المصباح فارغة.",
    logFlashlightOn: "تم تشغيل المصباح.",
    logFlashlightOff: "تم إيقاف المصباح.",
    logBatteryFound: "تم العثور على بطارية مصباح.",
    logBatteryStored: "تمت إضافة بطارية احتياطية للحقيبة: {count}.",
    logBatteryAutoLoaded: "تم تركيب بطارية احتياطية.",
    logDroppedScrap: "تم إسقاط خردة واحدة من الحقيبة.",
    logDroppedPart: "تم إسقاط قطعة روبوت واحدة من الحقيبة.",
    logDroppedBattery: "تم إسقاط بطارية احتياطية واحدة من الحقيبة.",
    logDropNothing: "لا توجد مواد لإسقاطها في الحقيبة.",
    logQuestCompleted: "اكتملت المهمة: {quest}",
    inventoryScrap: "خردة",
    inventoryParts: "قطع",
    inventoryBattery: "بطارية",
    inventoryBatteryPack: "بطارية احتياطية",
    inventoryFree: "فارغ",
    partyConnecting: "جار الاتصال...",
    partyKicked: "تم طردك من الفريق.",
    partyGameStarted: "بدأت لعبة الفريق.",
    partyNotReadyButton: "لست جاهزا",
    partyStatusConnected: "الفريق {code}",
    partyStatusReadyCount: "الفريق {code} - جاهز {ready}/{total}",
    partyOwnerBadge: "القائد",
    partyReadyBadge: "جاهز",
    partyWaitingBadge: "ينتظر",
    partyRoomBadge: "الغرفة {room}",
    partyHpBadge: "الصحة {hp}",
    partyKick: "طرد",
    partyVoiceNeedsParty: "انضم إلى فريق أو أنشئ فريقا قبل استخدام الدردشة الصوتية.",
    partyChatNeedsParty: "انضم إلى فريق أو أنشئ فريقا قبل الدردشة.",
    partyCommandUsed: "{name} استخدم الأمر: {command}",
    partyErrorInvalidMessage: "رسالة الفريق غير صالحة.",
    partyErrorLimit: "يمكن وجود 3 فرق كحد أقصى.",
    partyErrorNotFound: "لا يوجد فريق بهذا الرمز.",
    partyErrorStarted: "هذا الفريق بدأ بالفعل.",
    partyErrorFull: "هذا الفريق ممتلئ. الحد الأقصى 5 لاعبين.",
    partyErrorNotReady: "يجب أن يكون الجميع جاهزا للبدء.",
    partyErrorUnknown: "خطأ في الفريق.",
    healthPromptEmpty: "{key}: محطة الصحة تشحن",
    healthPromptPreparing: "محطة الصحة تستعد",
    healthPromptReady: "{key}: استخدم محطة الصحة ({charges}/{max})"
  },
  ko: {
    promptShoot: "왼쪽 클릭: 발사",
    promptComputerOpen: "{key}: 실험실 컴퓨터 열기",
    promptWorkbench: "{upgrade}: 무기 강화 | {craft}: 새 무기 제작 | {place}: {helper} 만들기 | {cycle}: 종류 변경 | {reclaim}: 회수 | {status}",
    promptNextRoom: "{key}: 다음 방으로 이동",
    promptDoorLocked: "문 잠김: 로봇을 먼저 정리하세요",
    promptGenerator: "{key}: 발전기 작동",
    promptControlRoom: "{key}: 통제실 점령",
    promptSneak: "은신 중: 카메라가 더 늦게 감지합니다",
    promptCameraSneak: "{key}: 카메라 근처, 은신 이동",
    promptPointer: "마우스 조작을 위해 화면을 클릭하세요",
    stealthAlarm: "경보",
    stealthHidden: "은신",
    stealthNormal: "보통",
    stealthWatched: "감지 {percent}%",
    questKillRobots: "로봇 5대 파괴",
    questGenerator: "발전기 작동",
    questControlRoom: "통제실 점령",
    questAllComplete: "모든 퀘스트 완료",
    weaponPistol: "권총",
    weaponScrapRifle: "고철 소총",
    weaponIonBlaster: "이온 블래스터",
    helperMiner: "광부 로봇",
    helperFighter: "전투 로봇",
    cosmeticCap: "고철 모자",
    cosmeticHelmet: "로봇 헬멧",
    cosmeticArmor: "로봇 슈트",
    cosmeticRobotSkin: "네온 로봇 스킨",
    roomLab: "실험실",
    roomDarkStorage: "어두운 창고",
    roomControlWing: "통제 구역",
    roomBossBay: "보스 구역",
    achievementRobot100: "로봇 100대 파괴",
    achievementNoDeathRoom: "죽지 않고 방 클리어",
    achievementScrap1000: "고철 1000개 수집",
    achievementSoloBoss: "보스 혼자 처치",
    achievementUnlocked: "해제됨",
    cosmeticLocked: "잠김",
    cosmeticSelect: "선택",
    logFlashlightBatteryEmpty: "손전등 배터리가 없습니다.",
    logFlashlightOn: "손전등 켜짐.",
    logFlashlightOff: "손전등 꺼짐.",
    logBatteryFound: "손전등 배터리를 찾았습니다.",
    logBatteryStored: "예비 배터리를 배낭에 넣었습니다: {count}.",
    logBatteryAutoLoaded: "예비 배터리를 장착했습니다.",
    logDroppedScrap: "배낭에서 고철 1개를 버렸습니다.",
    logDroppedPart: "배낭에서 로봇 부품 1개를 버렸습니다.",
    logDroppedBattery: "배낭에서 예비 배터리 1개를 버렸습니다.",
    logDropNothing: "배낭에 버릴 재료가 없습니다.",
    logQuestCompleted: "퀘스트 완료: {quest}",
    inventoryScrap: "고철",
    inventoryParts: "부품",
    inventoryBattery: "배터리",
    inventoryBatteryPack: "예비 배터리",
    inventoryFree: "빈 칸",
    partyConnecting: "연결 중...",
    partyKicked: "파티에서 추방되었습니다.",
    partyGameStarted: "파티 게임이 시작되었습니다.",
    partyNotReadyButton: "준비 안 됨",
    partyStatusConnected: "파티 {code}",
    partyStatusReadyCount: "파티 {code} - 준비 {ready}/{total}",
    partyOwnerBadge: "리더",
    partyReadyBadge: "준비됨",
    partyWaitingBadge: "대기 중",
    partyRoomBadge: "방 {room}",
    partyHpBadge: "체력 {hp}",
    partyKick: "추방",
    partyVoiceNeedsParty: "음성 채팅을 사용하려면 먼저 파티에 들어가세요.",
    partyChatNeedsParty: "채팅하려면 먼저 파티에 들어가세요.",
    partyCommandUsed: "{name} 명령 사용: {command}",
    partyErrorInvalidMessage: "파티 메시지가 올바르지 않습니다.",
    partyErrorLimit: "파티는 최대 3개까지 가능합니다.",
    partyErrorNotFound: "이 코드의 파티가 없습니다.",
    partyErrorStarted: "이 파티는 이미 시작되었습니다.",
    partyErrorFull: "이 파티는 가득 찼습니다. 최대 5명입니다.",
    partyErrorNotReady: "시작하려면 모두 준비해야 합니다.",
    partyErrorUnknown: "파티 오류.",
    healthPromptEmpty: "{key}: 체력 스테이션 충전 중",
    healthPromptPreparing: "체력 스테이션 준비 중",
    healthPromptReady: "{key}: 체력 스테이션 사용 ({charges}/{max})"
  }
};

for (const [language, values] of Object.entries(GAMEPLAY_TEXT)) {
  Object.assign(TEXT[language], language === "tr" ? values : { ...GAMEPLAY_TEXT.en, ...values });
}

const SETTING_NOTE_TEXT = {
  tr: {
    difficultyChanged: "Zorluk: {value}",
    crosshairOn: "Nisangah acik.",
    crosshairOff: "Nisangah kapali.",
    volumeChanged: "{label}: {value}%",
    pushToTalkOn: "Push-to-Talk acildi.",
    pushToTalkOff: "Push-to-Talk kapandi.",
    resolutionChanged: "Cozunurluk: {value}",
    fpsLimitChanged: "FPS siniri: {value}",
    fpsLimitOff: "FPS siniri kapali.",
    vsyncOn: "V-Sync acik.",
    vsyncOff: "V-Sync kapali.",
    invertYOn: "Y ekseni ters.",
    invertYOff: "Y ekseni normal.",
    autoVoiceOn: "Party sesli sohbet otomatik acilacak.",
    autoVoiceOff: "Party sesli sohbet elle acilacak.",
    microphoneOn: "Mikrofon acik.",
    microphoneOff: "Mikrofon kapali.",
    micTestSuccess: "Mikrofon testi basarili.",
    micTestFail: "Mikrofon testi basarisiz.",
    fullscreenOn: "Tam ekran acik.",
    fullscreenOff: "Pencere modu.",
    fullscreenDenied: "Tam ekran izni alinamadi.",
    qualityChanged: "Grafik kalitesi: {value}",
    keybindChanged: "{action} tusu: {value}",
    accessibilityOn: "Erisilebilirlik ayari acildi.",
    accessibilityOff: "Erisilebilirlik ayari kapandi.",
    exitDenied: "Tarayici kapatmaya izin vermezse sekmeyi elle kapatabilirsin."
  },
  en: {
    difficultyChanged: "Difficulty: {value}",
    crosshairOn: "Crosshair on.",
    crosshairOff: "Crosshair off.",
    volumeChanged: "{label}: {value}%",
    pushToTalkOn: "Push-to-Talk on.",
    pushToTalkOff: "Push-to-Talk off.",
    resolutionChanged: "Resolution: {value}",
    fpsLimitChanged: "FPS limit: {value}",
    fpsLimitOff: "FPS limit off.",
    vsyncOn: "V-Sync on.",
    vsyncOff: "V-Sync off.",
    invertYOn: "Y axis inverted.",
    invertYOff: "Y axis normal.",
    autoVoiceOn: "Party voice chat will start automatically.",
    autoVoiceOff: "Party voice chat will be started manually.",
    microphoneOn: "Microphone on.",
    microphoneOff: "Microphone off.",
    micTestSuccess: "Microphone test successful.",
    micTestFail: "Microphone test failed.",
    fullscreenOn: "Fullscreen on.",
    fullscreenOff: "Window mode.",
    fullscreenDenied: "Fullscreen permission was denied.",
    qualityChanged: "Graphics quality: {value}",
    keybindChanged: "{action} key: {value}",
    accessibilityOn: "Accessibility option on.",
    accessibilityOff: "Accessibility option off.",
    exitDenied: "If the browser cannot close the site, close the tab manually."
  },
  el: {
    difficultyChanged: "Δυσκολία: {value}",
    crosshairOn: "Το στόχαστρο άνοιξε.",
    crosshairOff: "Το στόχαστρο έκλεισε.",
    volumeChanged: "{label}: {value}%",
    pushToTalkOn: "Το Push-to-Talk άνοιξε.",
    pushToTalkOff: "Το Push-to-Talk έκλεισε.",
    resolutionChanged: "Ανάλυση: {value}",
    fpsLimitChanged: "Όριο FPS: {value}",
    fpsLimitOff: "Το όριο FPS έκλεισε.",
    vsyncOn: "Το V-Sync άνοιξε.",
    vsyncOff: "Το V-Sync έκλεισε.",
    invertYOn: "Ο άξονας Y αντιστράφηκε.",
    invertYOff: "Ο άξονας Y είναι κανονικός.",
    autoVoiceOn: "Η φωνητική συνομιλία party θα ανοίγει αυτόματα.",
    autoVoiceOff: "Η φωνητική συνομιλία party θα ανοίγει χειροκίνητα.",
    microphoneOn: "Το μικρόφωνο άνοιξε.",
    microphoneOff: "Το μικρόφωνο έκλεισε.",
    micTestSuccess: "Η δοκιμή μικροφώνου πέτυχε.",
    micTestFail: "Η δοκιμή μικροφώνου απέτυχε.",
    fullscreenOn: "Πλήρης οθόνη ενεργή.",
    fullscreenOff: "Λειτουργία παραθύρου.",
    fullscreenDenied: "Δεν δόθηκε άδεια πλήρους οθόνης.",
    qualityChanged: "Ποιότητα γραφικών: {value}",
    keybindChanged: "{action} πλήκτρο: {value}",
    accessibilityOn: "Η επιλογή πρόσβασης άνοιξε.",
    accessibilityOff: "Η επιλογή πρόσβασης έκλεισε.",
    exitDenied: "Αν ο browser δεν κλείσει τη σελίδα, κλείσε την καρτέλα χειροκίνητα."
  },
  ar: {
    difficultyChanged: "الصعوبة: {value}",
    crosshairOn: "تم تشغيل المؤشر.",
    crosshairOff: "تم إيقاف المؤشر.",
    volumeChanged: "{label}: {value}%",
    pushToTalkOn: "تم تشغيل اضغط للتحدث.",
    pushToTalkOff: "تم إيقاف اضغط للتحدث.",
    resolutionChanged: "الدقة: {value}",
    fpsLimitChanged: "حد FPS: {value}",
    fpsLimitOff: "تم إيقاف حد FPS.",
    vsyncOn: "تم تشغيل V-Sync.",
    vsyncOff: "تم إيقاف V-Sync.",
    invertYOn: "تم عكس محور Y.",
    invertYOff: "محور Y عادي.",
    autoVoiceOn: "سيتم تشغيل دردشة الفريق الصوتية تلقائيا.",
    autoVoiceOff: "سيتم تشغيل دردشة الفريق الصوتية يدويا.",
    microphoneOn: "الميكروفون يعمل.",
    microphoneOff: "الميكروفون متوقف.",
    micTestSuccess: "نجح اختبار الميكروفون.",
    micTestFail: "فشل اختبار الميكروفون.",
    fullscreenOn: "ملء الشاشة يعمل.",
    fullscreenOff: "وضع النافذة.",
    fullscreenDenied: "تم رفض إذن ملء الشاشة.",
    qualityChanged: "جودة الرسوم: {value}",
    keybindChanged: "مفتاح {action}: {value}",
    accessibilityOn: "تم تشغيل خيار الوصول.",
    accessibilityOff: "تم إيقاف خيار الوصول.",
    exitDenied: "إذا لم يغلق المتصفح الموقع، أغلق التبويب يدويا."
  },
  ko: {
    difficultyChanged: "난이도: {value}",
    crosshairOn: "조준점 켜짐.",
    crosshairOff: "조준점 꺼짐.",
    volumeChanged: "{label}: {value}%",
    pushToTalkOn: "Push-to-Talk 켜짐.",
    pushToTalkOff: "Push-to-Talk 꺼짐.",
    resolutionChanged: "해상도: {value}",
    fpsLimitChanged: "FPS 제한: {value}",
    fpsLimitOff: "FPS 제한 꺼짐.",
    vsyncOn: "V-Sync 켜짐.",
    vsyncOff: "V-Sync 꺼짐.",
    invertYOn: "Y축 반전.",
    invertYOff: "Y축 보통.",
    autoVoiceOn: "파티 음성 채팅이 자동으로 켜집니다.",
    autoVoiceOff: "파티 음성 채팅을 직접 켭니다.",
    microphoneOn: "마이크 켜짐.",
    microphoneOff: "마이크 꺼짐.",
    micTestSuccess: "마이크 테스트 성공.",
    micTestFail: "마이크 테스트 실패.",
    fullscreenOn: "전체 화면 켜짐.",
    fullscreenOff: "창 모드.",
    fullscreenDenied: "전체 화면 권한이 거부되었습니다.",
    qualityChanged: "그래픽 품질: {value}",
    keybindChanged: "{action} 키: {value}",
    accessibilityOn: "접근성 옵션 켜짐.",
    accessibilityOff: "접근성 옵션 꺼짐.",
    exitDenied: "브라우저가 사이트를 닫지 못하면 탭을 직접 닫으세요."
  }
};

for (const [language, values] of Object.entries(SETTING_NOTE_TEXT)) {
  Object.assign(TEXT[language], language === "tr" ? values : { ...SETTING_NOTE_TEXT.en, ...values });
}

export class MainMenu {
  constructor(game) {
    this.game = game;
    this.game.localization = this;
    this.root = document.querySelector("#mainMenu");
    this.settings = document.querySelector("#settingsPanel");
    this.note = document.querySelector("#menuNote");
    this.newGame = document.querySelector("#newGameBtn");
    this.continueGame = document.querySelector("#continueBtn");
    this.settingsButton = document.querySelector("#settingsBtn");
    this.exit = document.querySelector("#exitBtn");
    this.tabs = [...document.querySelectorAll("[data-settings-tab]")];
    this.sections = [...document.querySelectorAll("[data-settings-section]")];
    this.languageConfirm = document.querySelector("#languageConfirm");
    this.pendingLanguage = null;
    this.pendingLanguageSetting = null;
    this.currentLanguage = "tr";
    this.applyingSettings = false;
    this.ui = this.collectSettingsUi();
    this.bind();
    this.applyStoredSettings();
    this.activateTab("game");
  }

  collectSettingsUi() {
    return {
      difficulty: document.querySelector("#difficultySelect"),
      crosshair: document.querySelector("#crosshairToggle"),
      sensitivity: document.querySelector("#sensitivityInput"),
      fov: document.querySelector("#fovInput"),
      volume: document.querySelector("#volumeInput"),
      music: document.querySelector("#musicVolumeInput"),
      sfx: document.querySelector("#sfxVolumeInput"),
      voice: document.querySelector("#voiceVolumeInput"),
      micTest: document.querySelector("#micTestBtn"),
      microphone: document.querySelector("#microphoneToggle"),
      pushToTalk: document.querySelector("#pushToTalkToggle"),
      resolution: document.querySelector("#resolutionSelect"),
      fullscreen: document.querySelector("#fullscreenToggle"),
      quality: document.querySelector("#qualitySelect"),
      fpsLimit: document.querySelector("#fpsLimitSelect"),
      vsync: document.querySelector("#vsyncToggle"),
      mouseSensitivity: document.querySelector("#mouseSensitivityInput"),
      invertY: document.querySelector("#invertYToggle"),
      autoVoice: document.querySelector("#autoVoiceToggle"),
      playerVoice: document.querySelector("#playerVoiceVolumeInput"),
      language: document.querySelector("#languageSelect"),
      subtitles: document.querySelector("#subtitlesToggle"),
      largeText: document.querySelector("#largeTextToggle"),
      colorBlind: document.querySelector("#colorBlindToggle"),
      reduceShake: document.querySelector("#reduceShakeToggle"),
      confirmLanguageYes: document.querySelector("#confirmLanguageYes"),
      confirmLanguageNo: document.querySelector("#confirmLanguageNo"),
      menuTitle: document.querySelector("#mainMenu h1"),
      menuSubtitle: document.querySelector("#mainMenu .menu-panel > p"),
      confirmText: document.querySelector("#languageConfirm p"),
      hudLabels: [...document.querySelectorAll(".hud strong")],
      powerText: document.querySelector("#powerText"),
      weaponText: document.querySelector("#weaponText"),
      questText: document.querySelector("#questText"),
      cosmeticText: document.querySelector("#cosmeticText"),
      promptText: document.querySelector("#promptText"),
      computerTitle: document.querySelector("#computerPanel h1"),
      computerSubtitle: document.querySelector("#computerPanel header p"),
      closeComputer: document.querySelector("#closeComputerBtn"),
      nameInput: document.querySelector("#nameInput"),
      partyCodeInput: document.querySelector("#partyCodeInput"),
      createParty: document.querySelector("#createPartyBtn"),
      joinParty: document.querySelector("#joinPartyBtn"),
      ready: document.querySelector("#readyBtn"),
      startParty: document.querySelector("#startPartyBtn"),
      leaveParty: document.querySelector("#leavePartyBtn"),
      voiceButton: document.querySelector("#voiceBtn"),
      partyStatus: document.querySelector("#partyStatus"),
      chatInput: document.querySelector("#chatInput"),
      chatSubmit: document.querySelector("#chatForm button"),
      keybinds: [...document.querySelectorAll("[data-keybind]")]
    };
  }

  bind() {
    this.continueGame.disabled = !this.game.saveSystem.hasSave();
    this.newGame.addEventListener("click", () => {
      this.game.audio.unlock();
      this.game.resetNewGame();
      this.close(true);
    });
    this.continueGame.addEventListener("click", () => {
      this.game.audio.unlock();
      this.game.continueSavedGame();
      this.close(true);
    });
    this.settingsButton.addEventListener("click", () => {
      this.settings.classList.toggle("hidden");
      this.activateTab("game");
    });
    this.exit.addEventListener("click", () => this.exitSite());

    for (const tab of this.tabs) {
      tab.addEventListener("click", () => this.activateTab(tab.dataset.settingsTab));
    }

    this.ui.difficulty.addEventListener("change", () => this.setDifficulty(this.ui.difficulty.value));
    this.ui.crosshair.addEventListener("change", () => this.toggleCrosshair(this.ui.crosshair.checked));
    this.ui.sensitivity.addEventListener("input", () => this.setCameraSensitivity(Number(this.ui.sensitivity.value)));
    this.ui.mouseSensitivity.addEventListener("input", () => {
      this.ui.sensitivity.value = this.ui.mouseSensitivity.value;
      this.setCameraSensitivity(Number(this.ui.mouseSensitivity.value));
    });
    this.ui.fov.addEventListener("input", () => this.setFov(Number(this.ui.fov.value)));

    this.ui.volume.addEventListener("input", () => this.setVolume("volume", this.ui.volume.value, "masterVolume"));
    this.ui.music.addEventListener("input", () => this.setVolume("musicVolume", this.ui.music.value, "musicVolume"));
    this.ui.sfx.addEventListener("input", () => this.setVolume("sfxVolume", this.ui.sfx.value, "sfxVolume"));
    this.ui.voice.addEventListener("input", () => this.setVolume("voiceVolume", this.ui.voice.value, "voiceVolume"));
    this.ui.playerVoice.addEventListener("input", () => this.setVolume("playerVoiceVolume", this.ui.playerVoice.value, "playerVoice"));
    this.ui.micTest.addEventListener("click", () => this.testMicrophone());
    this.ui.microphone.addEventListener("change", () => this.toggleMicrophone(this.ui.microphone.checked));
    this.ui.pushToTalk.addEventListener("change", () => {
      this.game.settings.pushToTalk = this.ui.pushToTalk.checked;
      this.game.voice.applySettings(this.game.settings);
      this.note.textContent = this.t(this.ui.pushToTalk.checked ? "pushToTalkOn" : "pushToTalkOff");
      this.saveSettings();
    });

    this.ui.resolution.addEventListener("change", () => {
      this.game.settings.resolution = this.ui.resolution.value;
      this.note.textContent = this.t("resolutionChanged", { value: this.ui.resolution.options[this.ui.resolution.selectedIndex].text });
      this.saveSettings();
    });
    this.ui.fullscreen.addEventListener("change", () => this.toggleFullscreen(this.ui.fullscreen.checked));
    this.ui.quality.addEventListener("change", () => this.setQuality(this.ui.quality.value));
    this.ui.fpsLimit.addEventListener("change", () => {
      this.game.settings.fpsLimit = Number(this.ui.fpsLimit.value);
      this.note.textContent = this.game.settings.fpsLimit
        ? this.t("fpsLimitChanged", { value: this.game.settings.fpsLimit })
        : this.t("fpsLimitOff");
      this.saveSettings();
    });
    this.ui.vsync.addEventListener("change", () => {
      this.game.settings.vsync = this.ui.vsync.checked;
      this.note.textContent = this.t(this.ui.vsync.checked ? "vsyncOn" : "vsyncOff");
      this.saveSettings();
    });

    this.ui.invertY.addEventListener("change", () => {
      this.game.settings.invertY = this.ui.invertY.checked;
      this.game.player.setLookSettings(this.game.settings.cameraSensitivity, this.game.settings.invertY);
      this.note.textContent = this.t(this.ui.invertY.checked ? "invertYOn" : "invertYOff");
      this.saveSettings();
    });
    for (const input of this.ui.keybinds) {
      input.addEventListener("change", () => this.updateKeybind(input));
    }

    this.ui.autoVoice.addEventListener("change", () => {
      this.game.settings.autoVoice = this.ui.autoVoice.checked;
      this.game.voice.applySettings(this.game.settings);
      this.note.textContent = this.t(this.ui.autoVoice.checked ? "autoVoiceOn" : "autoVoiceOff");
      this.saveSettings();
    });
    this.ui.language.addEventListener("change", () => this.askLanguageChange(this.ui.language.value));
    this.ui.confirmLanguageYes.addEventListener("click", () => this.confirmLanguageChange(true));
    this.ui.confirmLanguageNo.addEventListener("click", () => this.confirmLanguageChange(false));

    this.ui.subtitles.addEventListener("change", () => this.setAccessibility("subtitles", this.ui.subtitles.checked));
    this.ui.largeText.addEventListener("change", () => this.setAccessibility("largeText", this.ui.largeText.checked));
    this.ui.colorBlind.addEventListener("change", () => this.setAccessibility("colorBlind", this.ui.colorBlind.checked));
    this.ui.reduceShake.addEventListener("change", () => this.setAccessibility("reduceShake", this.ui.reduceShake.checked));

  }

  activateTab(name) {
    for (const tab of this.tabs) tab.classList.toggle("active", tab.dataset.settingsTab === name);
    for (const section of this.sections) section.classList.toggle("hidden", section.dataset.settingsSection !== name);
  }

  applyStoredSettings() {
    const settings = this.game.settings;
    this.applyingSettings = true;

    this.ui.difficulty.value = settings.difficulty;
    this.ui.crosshair.checked = settings.crosshair;
    this.ui.sensitivity.value = String(settings.cameraSensitivity);
    this.ui.mouseSensitivity.value = String(settings.cameraSensitivity);
    this.ui.fov.value = String(settings.fov);
    this.ui.volume.value = String(Math.round(settings.volume * 100));
    this.ui.music.value = String(Math.round(settings.musicVolume * 100));
    this.ui.sfx.value = String(Math.round(settings.sfxVolume * 100));
    this.ui.voice.value = String(Math.round(settings.voiceVolume * 100));
    this.ui.playerVoice.value = String(Math.round(settings.playerVoiceVolume * 100));
    this.ui.microphone.checked = false;
    this.game.settings.microphone = false;
    this.ui.pushToTalk.checked = settings.pushToTalk;
    this.ui.resolution.value = settings.resolution;
    this.ui.fullscreen.checked = Boolean(document.fullscreenElement);
    this.ui.quality.value = settings.quality;
    this.ui.fpsLimit.value = String(settings.fpsLimit);
    this.ui.vsync.checked = settings.vsync;
    this.ui.invertY.checked = settings.invertY;
    this.ui.autoVoice.checked = settings.autoVoice;
    this.ui.subtitles.checked = settings.subtitles;
    this.ui.largeText.checked = settings.largeText;
    this.ui.colorBlind.checked = settings.colorBlind;
    this.ui.reduceShake.checked = settings.reduceShake;

    this.applyKeybindSettings(settings.keybinds);
    this.toggleCrosshair(settings.crosshair);
    this.setCameraSensitivity(settings.cameraSensitivity);
    this.setFov(settings.fov);
    this.setQuality(settings.quality);
    this.game.audio.applySettings(settings);
    this.game.voice.applySettings(settings);
    this.setAccessibilityClasses();
    this.currentLanguage = resolveLanguageSetting(settings.language);
    this.ui.language.value = settings.language;
    this.applyLanguage(this.currentLanguage);

    this.applyingSettings = false;
    this.note.textContent = this.t("menuNote");
  }

  applyKeybindSettings(keybinds) {
    for (const input of this.ui.keybinds) {
      const key = keybinds?.[input.dataset.keybind] || input.value;
      input.value = key.toUpperCase();
      this.applyKeybind(input.dataset.keybind, key);
    }
  }

  saveSettings() {
    if (this.applyingSettings) return;
    this.game.settingsSystem.save(this.game.settings);
  }

  setDifficulty(value) {
    this.game.settings.difficulty = value;
    this.game.applyDifficultyToCurrentRobots();
    this.note.textContent = this.t("difficultyChanged", { value: this.ui.difficulty.options[this.ui.difficulty.selectedIndex].text });
    this.saveSettings();
  }

  toggleCrosshair(show) {
    this.game.settings.crosshair = show;
    document.querySelector(".crosshair").classList.toggle("hidden", !show);
    this.note.textContent = this.t(show ? "crosshairOn" : "crosshairOff");
    this.saveSettings();
  }

  setCameraSensitivity(value) {
    this.game.settings.cameraSensitivity = value;
    this.game.player.setLookSettings(value, this.game.settings.invertY);
    this.ui.sensitivity.value = String(value);
    this.ui.mouseSensitivity.value = String(value);
    this.saveSettings();
  }

  setFov(value) {
    this.game.player.camera.fov = BABYLON.Tools.ToRadians(value);
    this.game.settings.fov = value;
    this.note.textContent = `FOV: ${value}`;
    this.saveSettings();
  }

  setVolume(key, value, labelKey) {
    this.game.settings[key] = Number(value) / 100;
    this.game.audio.applySettings(this.game.settings);
    this.game.voice.applySettings(this.game.settings);
    this.note.textContent = this.t("volumeChanged", { label: this.t(labelKey), value });
    this.saveSettings();
  }

  async testMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      this.note.textContent = this.t("micTestSuccess");
    } catch {
      this.note.textContent = this.t("micTestFail");
    }
  }

  async toggleMicrophone(enabled) {
    this.game.settings.microphone = enabled;
    if (enabled && !this.game.voice.enabled) await this.game.voice.toggle();
    if (!enabled && this.game.voice.enabled) this.game.voice.stop();
    this.note.textContent = this.t(enabled ? "microphoneOn" : "microphoneOff");
    this.saveSettings();
  }

  async toggleFullscreen(enabled) {
    try {
      if (enabled && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!enabled && document.fullscreenElement) await document.exitFullscreen();
      this.note.textContent = this.t(enabled ? "fullscreenOn" : "fullscreenOff");
      this.saveSettings();
    } catch {
      this.ui.fullscreen.checked = Boolean(document.fullscreenElement);
      this.note.textContent = this.t("fullscreenDenied");
    }
  }

  setQuality(value) {
    const scaling = { low: 1.55, medium: 1, high: 0.85, ultra: 0.7 }[value] || 1;
    this.game.settings.quality = value;
    this.game.engine.setHardwareScalingLevel(scaling);
    this.note.textContent = this.t("qualityChanged", { value: this.ui.quality.options[this.ui.quality.selectedIndex].text });
    this.saveSettings();
  }

  updateKeybind(input) {
    const action = input.dataset.keybind;
    const value = input.value.trim().slice(0, 1).toLowerCase();
    if (!value) return;
    input.value = value.toUpperCase();

    this.applyKeybind(action, value);
    this.game.settings.keybinds[action] = value;
    this.note.textContent = this.t("keybindChanged", { action: this.t(action) || action, value: input.value });
    this.saveSettings();
  }

  applyKeybind(action, value) {
    const code = value.toUpperCase().charCodeAt(0);
    if (action === "forward") this.game.player.camera.keysUp = [code];
    if (action === "backward") this.game.player.camera.keysDown = [code];
    if (action === "left") this.game.player.camera.keysLeft = [code];
    if (action === "right") this.game.player.camera.keysRight = [code];
    if (action === "sneak") this.game.input.updateKeybind("sneak", value);
    if (action === "interact") this.game.input.updateKeybind("interact", value);
    if (action === "place") this.game.input.updateKeybind("place", value);
    if (action === "cycleHelper") this.game.input.updateKeybind("cycleHelper", value);
    if (action === "craftWeapon") this.game.input.updateKeybind("craftWeapon", value);
    if (action === "reclaimBench") this.game.input.updateKeybind("reclaimBench", value);
    if (action === "dropItem") this.game.input.updateKeybind("dropItem", value);
    if (action === "flashlight") this.game.input.updateKeybind("flashlight", value);
  }

  askLanguageChange(value) {
    this.pendingLanguageSetting = value;
    this.pendingLanguage = resolveLanguageSetting(value);
    this.languageConfirm.classList.remove("hidden");
  }

  confirmLanguageChange(confirmed) {
    this.languageConfirm.classList.add("hidden");
    if (!confirmed) {
      this.ui.language.value = this.game.settings.language;
      this.pendingLanguage = null;
      this.pendingLanguageSetting = null;
      this.note.textContent = this.t("languageCancelled");
      return;
    }

    const selectedLanguage = this.pendingLanguageSetting || this.pendingLanguage || "tr";
    this.currentLanguage = resolveLanguageSetting(selectedLanguage);
    this.game.settings.language = selectedLanguage;
    this.applyLanguage(this.currentLanguage);
    if ([...this.ui.language.options].some((option) => option.value === selectedLanguage)) {
      this.ui.language.value = selectedLanguage;
    }
    const label = selectedLanguage === "computer"
      ? `${LANGUAGE_LABELS.computer}: ${LANGUAGE_LABELS[this.currentLanguage] || this.currentLanguage}`
      : LANGUAGE_LABELS[this.currentLanguage] || this.currentLanguage;
    this.note.textContent = this.t("changed", { language: label });
    this.pendingLanguage = null;
    this.pendingLanguageSetting = null;
    this.saveSettings();
  }

  applyLanguage(language) {
    const text = TEXT[language] || TEXT.tr;
    this.currentLanguage = TEXT[language] ? language : "tr";
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = text.title;
    this.ui.menuTitle.textContent = text.title;
    this.ui.menuSubtitle.textContent = text.subtitle;
    this.newGame.textContent = text.newGame;
    this.continueGame.textContent = text.continueGame;
    this.settingsButton.textContent = text.settings;
    this.exit.textContent = text.exit;
    this.tabs.forEach((tab, index) => {
      tab.textContent = text.tabs[index];
    });

    setLabelPrefix(this.ui.difficulty.closest("label"), text.difficulty);
    setOptionTexts(this.ui.difficulty, text.difficultyOptions);
    setLabelSuffix(this.ui.crosshair.closest("label"), text.crosshair);
    setLabelPrefix(this.ui.sensitivity.closest("label"), text.cameraSensitivity);
    setLabelPrefix(this.ui.fov.closest("label"), text.fov);
    setLabelPrefix(this.ui.volume.closest("label"), text.masterVolume);
    setLabelPrefix(this.ui.music.closest("label"), text.musicVolume);
    setLabelPrefix(this.ui.sfx.closest("label"), text.sfxVolume);
    setLabelPrefix(this.ui.voice.closest("label"), text.voiceVolume);
    this.ui.micTest.textContent = text.micTest;
    setLabelSuffix(this.ui.microphone.closest("label"), text.microphone);
    setLabelSuffix(this.ui.pushToTalk.closest("label"), text.pushToTalk);
    setLabelPrefix(this.ui.resolution.closest("label"), text.resolution);
    this.ui.resolution.options[0].textContent = text.resolutionAuto;
    setLabelSuffix(this.ui.fullscreen.closest("label"), text.fullscreen);
    setLabelPrefix(this.ui.quality.closest("label"), text.graphicsQuality);
    setOptionTexts(this.ui.quality, text.qualityOptions);
    setLabelPrefix(this.ui.fpsLimit.closest("label"), text.fpsLimit);
    this.ui.fpsLimit.options[3].textContent = text.unlimited;
    setLabelSuffix(this.ui.vsync.closest("label"), "V-Sync");

    for (const input of this.ui.keybinds) {
      setLabelPrefix(input.closest("label"), text[input.dataset.keybind]);
    }
    setLabelPrefix(this.ui.mouseSensitivity.closest("label"), text.mouseSensitivity);
    setLabelSuffix(this.ui.invertY.closest("label"), text.invertY);
    setLabelSuffix(this.ui.autoVoice.closest("label"), text.autoVoice);
    setLabelPrefix(this.ui.playerVoice.closest("label"), text.playerVoice);
    setLabelPrefix(this.ui.language.closest("label"), text.language);
    setOptionTexts(this.ui.language, text.languageOptions);
    setLabelSuffix(this.ui.subtitles.closest("label"), text.subtitles);
    setLabelSuffix(this.ui.largeText.closest("label"), text.largeText);
    setLabelSuffix(this.ui.colorBlind.closest("label"), text.colorBlind);
    setLabelSuffix(this.ui.reduceShake.closest("label"), text.reduceShake);

    const about = this.settings.querySelector("[data-settings-section='about']");
    const aboutLabels = about.querySelectorAll("p > b");
    aboutLabels[0].textContent = text.version;
    about.querySelector("h3").textContent = text.credits;
    aboutLabels[1].textContent = text.developer;
    aboutLabels[2].textContent = text.editors;
    aboutLabels[3].textContent = text.music;
    aboutLabels[4].textContent = text.assets;
    aboutLabels[5].textContent = text.translation;
    aboutLabels[6].textContent = text.thanks;
    aboutLabels[7].textContent = text.note;
    aboutLabels[8].textContent = text.thanksForPlaying;
    aboutLabels[9].textContent = text.licenses;
    about.querySelectorAll("ul li")[3].textContent = text.later;
    about.querySelectorAll("ul li")[4].textContent = text.later;
    about.querySelectorAll("ul li")[5].textContent = text.later;
    about.querySelectorAll("ul li")[6].textContent = text.thanksText;
    about.querySelectorAll("ul li")[7].textContent = text.aiNote;
    about.lastElementChild.lastChild.nodeValue = ` ${text.licensesText}`;

    this.note.textContent = text.menuNote;
    this.ui.confirmText.textContent = text.confirmLanguage;
    this.ui.confirmLanguageYes.textContent = text.yes;
    this.ui.confirmLanguageNo.textContent = text.no;
    this.ui.hudLabels.forEach((label, index) => {
      label.textContent = text.hud[index];
    });
    this.ui.powerText.textContent = text.powerOn;
    this.ui.weaponText.textContent = text.pistol;
    this.ui.questText.textContent = text.questStart;
    this.ui.cosmeticText.textContent = text.none;
    this.ui.promptText.textContent = text.startPrompt;

    this.ui.computerTitle.textContent = text.computerTitle;
    this.ui.computerSubtitle.textContent = text.computerSubtitle;
    this.ui.closeComputer.textContent = text.close;
    setLabelPrefix(this.ui.nameInput.closest("label"), text.name);
    setLabelPrefix(this.ui.partyCodeInput.closest("label"), text.partyCode);
    this.ui.createParty.textContent = text.createParty;
    this.ui.joinParty.textContent = text.joinParty;
    this.ui.ready.textContent = text.ready;
    this.ui.startParty.textContent = text.startParty;
    this.ui.leaveParty.textContent = text.leaveParty;
    this.game.party.setVoiceLabels(text.voice, text.voiceOn);
    if (this.ui.partyStatus.textContent === TEXT.tr.serverOffline || Object.values(TEXT).some((entry) => entry.serverOffline === this.ui.partyStatus.textContent)) {
      this.ui.partyStatus.textContent = text.serverOffline;
    }
    this.ui.chatInput.placeholder = text.chatPlaceholder;
    this.ui.chatSubmit.textContent = text.send;
    this.game.party.render?.(this.game.party.players, this.game.party.ownerId);
    this.game.refreshLocalizedSystems?.();
    this.game.updateHud?.();
  }

  t(key, replacements = {}) {
    let value = (TEXT[this.currentLanguage] || TEXT.tr)[key] || TEXT.tr[key] || key;
    for (const [name, replacement] of Object.entries(replacements)) {
      value = value.replace(`{${name}}`, replacement);
    }
    return value;
  }

  setAccessibility(key, enabled) {
    this.game.settings[key] = enabled;
    this.setAccessibilityClasses();
    this.note.textContent = this.t(enabled ? "accessibilityOn" : "accessibilityOff");
    this.saveSettings();
  }

  setAccessibilityClasses() {
    document.body.classList.toggle("large-text", this.game.settings.largeText);
    document.body.classList.toggle("color-blind", this.game.settings.colorBlind);
    document.body.classList.toggle("reduce-shake", this.game.settings.reduceShake);
  }

  close(startGame) {
    this.root.classList.add("hidden");
    if (startGame) this.game.started = true;
    this.game.canvas.requestPointerLock?.();
  }

  open() {
    this.continueGame.disabled = !this.game.saveSystem.hasSave();
    this.root.classList.remove("hidden");
    document.exitPointerLock?.();
  }

  exitSite() {
    window.close();
    this.note.textContent = this.t("exitDenied");
  }
}

function detectComputerLanguage() {
  const language = (navigator.language || "tr").slice(0, 2).toLowerCase();
  if (["tr", "en", "el", "ar", "ko"].includes(language)) return language;
  return "en";
}

function resolveLanguageSetting(language) {
  return language === "computer" ? detectComputerLanguage() : language;
}

function setOptionTexts(select, labels) {
  labels.forEach((label, index) => {
    if (select.options[index]) select.options[index].textContent = label;
  });
}

function setLabelPrefix(label, text) {
  const node = [...label.childNodes].find((child) => child.nodeType === Node.TEXT_NODE);
  if (node) node.nodeValue = `${text} `;
}

function setLabelSuffix(label, text) {
  const nodes = [...label.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE);
  const node = nodes[nodes.length - 1];
  if (node) node.nodeValue = ` ${text}`;
}
