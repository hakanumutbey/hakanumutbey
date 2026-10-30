// VIPEND 3D — Bölüm Tasarımları, Portal 2 Tarzı Zor Bulmacalar ve Vipend Boss Diyalogları

window.VIPEND_LEVELS = [
  // ============================================================================
  // BÖLÜM 0: EVİMİZ (GİRİŞ SİNEMATİĞİ — USUL USUL OTURURKEN VIPEND BASIYOR!)
  // ============================================================================
  {
    id: 0,
    type: 'intro',
    title: 'EVİMİZ — GECE 23:40',
    subtitle: 'Evinde koltukta usul usul oturuyorsun...',
    hasPortalGun: false,
    hasPlasmaGun: false
  },

  // ============================================================================
  // BÖLÜM 1: ZAMANLAMALI MANTIK & REAKTÖR ODASI ("Hangi Butona Ne Zaman Basıcam")
  // ============================================================================
  {
    id: 1,
    type: 'puzzle_sequence',
    title: 'BÖLÜM 1: ZAMANLAMALI KOMBİNASYON ODASI',
    subtitle: 'Duvardaki 3 mantık ipucunu oku, 4 butona DOĞRU SIRAYLA ve ZAMANLAMA BARI YEŞİLKEN [E] ile bas!',
    hasPortalGun: false,
    hasPlasmaGun: false,
    vipendIntro: 'Uyan bakalım! Seni evinden alıp 1. Test Odama attım. Karşında 4 buton var ama rastgele basarsan elektrik yersin! Duvardaki 3 ipucunu birleştirip HANGİ BUTONA NE ZAMAN basacağını bul bakalım!',
    clues: [
      '📜 İPUCU PANOSU #1: "İlk basılacak buton ne MAVİ ne de YEŞİLdir. KIRMIZI buton ise kesinlikle 3. sırada basılmalıdır."',
      '📜 İPUCU PANOSU #2: "MAVİ buton, KIRMIZI butondan hemen bir adım önce basılmalıdır."',
      '📜 İPUCU PANOSU #3: "Her butona bastığında üstteki Faz Zamanlama Barı YEŞİL bölgedeyken [E] tuşuna basmalısın ve 4 butonu 16 saniye içinde tamamlamalısın!"'
    ],
    // Çözüm: 1. SARI ('yellow'), 2. MAVİ ('blue'), 3. KIRMIZI ('red'), 4. YEŞİL ('green')
    correctOrder: ['yellow', 'blue', 'red', 'green'],
    buttons: [
      { id: 'blue',   label: 'MAVİ BUTON',    color: 0x38bdf8, x: -95, z: -40 },
      { id: 'red',    label: 'KIRMIZI BUTON', color: 0xef4444, x: -35, z: -95 },
      { id: 'yellow', label: 'SARI BUTON',    color: 0xfacc15, x:  35, z: -95 },
      { id: 'green',  label: 'YEŞİL BUTON',   color: 0x22c55e, x:  95, z: -40 }
    ]
  },

  // ============================================================================
  // BÖLÜM 2: PORTAL SİLAHI & KÜP + LAZER KIRILMASI + ZAMANLI ŞALTER (PORTAL 2!)
  // ============================================================================
  {
    id: 2,
    type: 'puzzle_portal_laser',
    title: 'BÖLÜM 2: KUANTUM PORTAL SİLAHI & LAZER KIRILMASI',
    subtitle: 'Portal Silahıyla (Sol Tık: Mavi, Sağ Tık: Turuncu) Küpü indir, Lazeri Portaldan geçirip Alıcıya vur ve Zamanlı Şaltere bas!',
    hasPortalGun: true,
    hasPlasmaGun: false,
    vipendIntro: 'Şans eseri 1. odayı geçtin! Ama bu odada ortada ölümcül asit çukuru var. Yerdeki Kuantum Portal Silahını al. Çıkış kapısının 3 kilidi var: Küp Plakası, Portal Lazer Alıcısı ve 8 Saniyelik Zamanlı Şalter!',
    hints: [
      '1. KİLİT (Ağırlık Küpü): Karşı yüksek balkondaki duvarına MAVİ PORTAL (Sol Tık), kendi yanındaki duvara TURUNCU PORTAL (Sağ Tık) aç. İçinden geçip Küpü [F] ile al ve aşağıdaki Pembe Basınç Plakasının üstüne bırak!',
      '2. KİLİT (Lazer Yönlendirme): Sol duvardan çıkan Kırmızı Lazerin çarptığı karşı duvara MAVİ PORTAL, sağ duvardaki Sarı Lazer Alıcısının tam karşısına TURUNCU PORTAL aç ki lazer portaldan geçip alıcıyı vursun!',
      '3. KİLİT (Zamanlı Şalter): İlk iki kilit yeşil olunca köşedeki Zamanlı Şaltere [E] ile bas ve 8 saniye bitmeden portaldan geçerek Çıkış Kapısına ulaş!'
    ]
  },

  // ============================================================================
  // BÖLÜM 3: VIPEND İLE İLK BOSS SAVAŞI (PORTAL SİLAHI + PLAZMA SİLAHI!)
  // ============================================================================
  {
    id: 3,
    type: 'boss_fight_1',
    title: 'BÖLÜM 3: VIPEND İLE YÜZLEŞME (KALKAN ŞİFRESİ & PLAZMA SAVAŞI)',
    subtitle: 'Vipend\'in kalkanını kırmak için söylediği Matematik/Frekans şifresindeki 2 butona Portallarla hızla bas, sonra [2] Plazma Silahıyla vur!',
    hasPortalGun: true,
    hasPlasmaGun: true,
    vipendIntro: 'Yeter artık! Test odalarımı bozmana izin vermeyeceğim! Eline Plazma Silahı [2] geçmiş olabilir ama Kuantum Kalkanımı sadece doğru Frekans Butonlarına zamanında basarsan kırabilirsin!'
  },

  // ============================================================================
  // BÖLÜM 4: ÇİFT KÜP & TERS ZAMANLAMA PORTAL ODASI (ZOR PORTAL 2 BULMACASI)
  // ============================================================================
  {
    id: 4,
    type: 'puzzle_double_cube',
    title: 'BÖLÜM 4: ÇİFT REAKTÖR & ASAL ZAMANLAMA ODASI',
    subtitle: '2 Ağırlık Küpünü Portallarla 2 Plakaya yerleştir, sonra sadece ASAL SAYILI şalterleri küçükten büyüğe 10 saniye içinde indir!',
    hasPortalGun: true,
    hasPlasmaGun: true,
    vipendIntro: 'Beni yaraladın ama ana çekirdeğime ulaşamazsın! Bu odada hem 2 ayrı yüksek balkondaki küpleri portallarla indirmen, hem de 5 şalter arasından sadece ASAL SAYI olanları küçükten büyüğe 10 saniye içinde açman gerekiyor!'
  },

  // ============================================================================
  // BÖLÜM 5: FİNAL BOSS — VIPEND ANA ÇEKİRDEK SAVAŞI!
  // ============================================================================
  {
    id: 5,
    type: 'boss_final',
    title: 'FİNAL BÖLÜMÜ: VIPEND ANA ÇEKİRDEK İMHASI',
    subtitle: 'Portallarla asit çukurlarının üstünden uç, aşırı yük şalterlerini zamanında indir ve Plazma Silahıyla [2] Vipend\'i yok et!',
    hasPortalGun: true,
    hasPlasmaGun: true,
    vipendIntro: 'ANA KONTROL ODAMA HOŞ GELDİN! Zemin panellerini asitle doldurdum! Hem portalları kullanıp şalterlere zamanında yetişebileceğini hem de beni vurabileceğini mi sanıyorsun?!'
  }
];
