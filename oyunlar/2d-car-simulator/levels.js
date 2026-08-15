/* 2D Car Simulator — 100 el yapimi bolum.
   Zorluk giderek artar: once temel cizim, sonra duvarlar, cizilmez bolgeler,
   murekkep limitleri, fanlar (41+) ve hareketli engeller (51+).
   Her bolum cozulebilirligi otomatik testle (game.test.mjs) dogrulanir.
   Bolum verisi:
     carStart: arabanin baslangic noktasi (x, taban y)
     grounds:  zemin bloklari (y = ust yuzey)
     walls:    carpinca patlatan bloklar (yere oturan ya da tavandan sarkan)
     noZones:  icine cizgi cizilemeyen bolgeler (arabaya zarar vermez)
     fans:     havadaki arabayi yukari iten ruzgar alanlari
     movers:   surus baslayinca salinan engeller (deterministik)
     truck:    bedX/bedY = acik kasanin sol-ustu, bedW = kasa genisligi
     lineLimit: bolume ozel murekkep limiti (yoksa standart 1300)
     solve:    testin oynadigi referans cizgi (yoksa otomatik rampa) */
"use strict";

const C = (x, y) => ({ x, y });
const G = (x, y, w, h = 490 - y) => ({ x, y, w, h });
const WL = (x, y, w, h) => ({ x, y, w, h });
const NZ = (x, y, w, h) => ({ x, y, w, h });
const FN = (x, y, w, h, lift = 0.55) => ({ x, y, w, h, lift });
const MV = (x, y, w, h, axis, range, speed, phase = 0) => ({ x, y, w, h, axis, range, speed, phase });
const T = (bedX, bedY, bedW) => ({ bedX, bedY, bedW });

const LEVELS = [
  // ---------- 1-10: Temel hareketler (ogretici, kolay) ----------
  { name: "Isınma Turu", carStart: C(70, 400), grounds: [G(0, 400, 520), G(560, 400, 260)], walls: [], truck: T(600, 352, 120) },
  { name: "Boşluk Var", carStart: C(70, 400), grounds: [G(0, 400, 420), G(500, 400, 320)], walls: [], truck: T(640, 352, 120) },
  { name: "Yüksek Kasa", carStart: C(70, 400), grounds: [G(0, 400, 460), G(560, 320, 260)], walls: [], truck: T(620, 272, 120) },
  { name: "Merdiven Yol", carStart: C(60, 400), grounds: [G(0, 400, 300), G(380, 380, 180), G(640, 360, 180)], walls: [], truck: T(672, 312, 110) },
  { name: "Duvar Engeli", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(380, 296, 40, 104)], truck: T(620, 352, 120) },
  { name: "Alçaktan Geçiş", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [], noZones: [NZ(280, 0, 340, 350)], truck: T(650, 330, 105) },
  { name: "Çift Boşluk", carStart: C(70, 400), grounds: [G(0, 400, 260), G(330, 400, 200), G(600, 400, 220)], walls: [], truck: T(640, 352, 110) },
  { name: "İlk Tırmanış", carStart: C(70, 400), grounds: [G(0, 400, 500), G(560, 330, 260)], walls: [WL(300, 335, 34, 65)], truck: T(600, 282, 110) },
  { name: "Geç Kalan Boşluk", carStart: C(70, 400), grounds: [G(0, 400, 420), G(490, 400, 330)], walls: [], truck: T(550, 352, 115) },
  { name: "Kontrol Noktası", carStart: C(70, 400), grounds: [G(0, 400, 300), G(360, 385, 170), G(590, 368, 230)], walls: [], truck: T(640, 320, 105) },

  // ---------- 11-20: Duvarlar (yere oturan, sarkan, kapi) ----------
  { name: "Tek Duvar", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(350, 320, 36, 80)], truck: T(600, 352, 115) },
  {
    name: "Sarkan Duvar", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(400, 175, 40, 150)], truck: T(630, 300, 110),
    solve: [C(70, 400), C(385, 360), C(455, 360), C(685, 300)],
  },
  { name: "İkili Duvar", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(300, 320, 34, 80), WL(520, 300, 36, 100)], truck: T(640, 352, 110) },
  { name: "Yüksek Duvar", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(420, 262, 40, 138)], truck: T(620, 352, 115) },
  { name: "Duvar Tepesi", carStart: C(70, 400), grounds: [G(0, 400, 820), G(580, 348, 240)], walls: [WL(300, 310, 38, 90)], truck: T(640, 300, 110) },
  { name: "Dar Kasa", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(400, 300, 36, 100)], truck: T(630, 352, 88) },
  { name: "Duvarlı Merdiven", carStart: C(70, 400), grounds: [G(0, 400, 280), G(340, 385, 180), G(580, 370, 240)], walls: [WL(450, 290, 34, 95)], truck: T(640, 322, 105) },
  { name: "Uzun Boşluk", carStart: C(70, 400), grounds: [G(0, 400, 300), G(620, 400, 200)], walls: [], truck: T(660, 352, 100) },
  {
    name: "Kapı", carStart: C(70, 400), grounds: [G(0, 400, 820)],
    walls: [WL(460, 200, 36, 120), WL(460, 384, 36, 16)], truck: T(660, 352, 100),
    solve: [C(70, 400), C(460, 362), C(690, 352)],
  },
  { name: "Duvar Sınavı", carStart: C(70, 400), grounds: [G(0, 400, 360), G(430, 400, 390)], walls: [WL(560, 290, 40, 110)], truck: T(660, 352, 105) },

  // ---------- 21-30: Cizilmez bolgeler ----------
  { name: "Köprü Altı", carStart: C(70, 400), grounds: [G(0, 400, 300), G(560, 400, 260)], walls: [], noZones: [NZ(390, 270, 80, 220)], truck: T(640, 352, 105) },
  { name: "Alçak Tavan", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [], noZones: [NZ(300, 0, 220, 320)], truck: T(620, 270, 110) },
  { name: "Blok Üstü", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [], noZones: [NZ(380, 260, 80, 230)], truck: T(620, 352, 110) },
  { name: "İkiz Blok", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [], noZones: [NZ(300, 270, 70, 220), NZ(500, 280, 70, 210)], truck: T(640, 352, 105) },
  { name: "Tavan ve Duvar", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(400, 310, 36, 90)], noZones: [NZ(340, 0, 180, 268)], truck: T(640, 352, 110) },
  {
    name: "S Virajı", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [],
    noZones: [NZ(280, 0, 140, 300), NZ(460, 250, 80, 240)], truck: T(660, 352, 100),
    solve: [C(70, 400), C(290, 318), C(430, 318), C(455, 240), C(555, 240), C(700, 352)],
  },
  { name: "Blok ve Boşluk", carStart: C(70, 400), grounds: [G(0, 400, 280), G(600, 400, 220)], walls: [], noZones: [NZ(400, 250, 90, 240)], truck: T(650, 352, 100) },
  { name: "Tavanlı Merdiven", carStart: C(70, 400), grounds: [G(0, 400, 260), G(320, 385, 170), G(550, 368, 270)], walls: [], noZones: [NZ(380, 0, 160, 350)], truck: T(620, 320, 100) },
  {
    name: "Dar Koridor", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(430, 300, 36, 100)],
    noZones: [NZ(350, 0, 120, 270)], truck: T(630, 352, 110),
    solve: [C(70, 400), C(415, 285), C(481, 285), C(685, 352)],
  },
  {
    name: "Çifte Bölge", carStart: C(70, 400), grounds: [G(0, 400, 320), G(600, 400, 220)], walls: [],
    noZones: [NZ(350, 0, 120, 330), NZ(560, 270, 70, 220)], truck: T(660, 352, 95),
    solve: [C(70, 400), C(335, 365), C(485, 365), C(545, 235), C(645, 235), C(707, 352)],
  },

  // ---------- 31-40: Murekkep limitleri ve dar kasalar ----------
  { name: "Cimri", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [], noZones: [NZ(400, 275, 80, 215)], lineLimit: 800, truck: T(600, 352, 115) },
  { name: "Kısa Çizgi, Uzun Boşluk", carStart: C(70, 400), grounds: [G(0, 400, 300), G(620, 400, 200)], walls: [], lineLimit: 760, truck: T(660, 352, 100) },
  { name: "Dar Geçit", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(380, 290, 40, 110)], lineLimit: 780, truck: T(625, 352, 85) },
  { name: "İp Gibi", carStart: C(70, 400), grounds: [G(0, 400, 340), G(500, 400, 320)], walls: [], lineLimit: 700, truck: T(640, 352, 90) },
  { name: "Zirve", carStart: C(70, 400), grounds: [G(0, 400, 480), G(540, 320, 280)], walls: [], lineLimit: 800, truck: T(590, 272, 100) },
  { name: "Cep Delik", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(300, 315, 34, 85), WL(530, 300, 36, 100)], lineLimit: 850, truck: T(645, 352, 88) },
  { name: "Alçak Uçuş", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [], noZones: [NZ(280, 0, 240, 335)], lineLimit: 780, truck: T(630, 290, 100) },
  { name: "Kemer", carStart: C(70, 400), grounds: [G(0, 400, 260), G(610, 400, 210)], walls: [], noZones: [NZ(400, 255, 90, 235)], lineLimit: 850, truck: T(655, 352, 95) },
  { name: "Son Damla", carStart: C(70, 400), grounds: [G(0, 400, 300), G(370, 380, 160), G(590, 360, 230)], walls: [WL(470, 270, 34, 90)], lineLimit: 800, truck: T(640, 312, 95) },
  {
    name: "Limit Sınavı", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(360, 285, 38, 115)],
    noZones: [NZ(520, 0, 140, 300)], lineLimit: 820, truck: T(650, 345, 95),
    solve: [C(70, 400), C(345, 250), C(398, 250), C(505, 335), C(675, 335), C(697, 345)],
  },

  // ---------- 41-50: FAN (yeni sey!) ----------
  {
    name: "İlk Rüzgar", carStart: C(70, 400), grounds: [G(0, 400, 300), G(560, 400, 260)], walls: [],
    fans: [FN(300, 340, 375, 110)], lineLimit: 380, truck: T(620, 352, 110),
    solve: [C(70, 400), C(360, 392)],
  },
  {
    name: "Rüzgar Asansörü", carStart: C(70, 400), grounds: [G(0, 400, 260), G(600, 340, 220)], walls: [],
    fans: [FN(260, 300, 380, 150, 0.6)], lineLimit: 320, truck: T(640, 312, 100),
    solve: [C(70, 400), C(245, 394)],
  },
  {
    name: "Yükselen Rüzgar", carStart: C(70, 400), grounds: [G(0, 400, 280), G(620, 360, 200)], walls: [],
    fans: [FN(280, 300, 400, 150, 0.6)], lineLimit: 350, truck: T(660, 312, 100),
    solve: [C(70, 400), C(255, 394)],
  },
  {
    name: "Rüzgar ve Duvar", carStart: C(70, 400), grounds: [G(0, 400, 300), G(580, 400, 240)], walls: [WL(420, 320, 36, 80)],
    fans: [FN(300, 310, 375, 140)], lineLimit: 340, truck: T(620, 352, 105),
    solve: [C(70, 400), C(299, 340)],
  },
  {
    name: "Sessiz Fan", carStart: C(70, 400), grounds: [G(0, 400, 240), G(620, 380, 200)], walls: [],
    fans: [FN(240, 320, 415, 130, 0.6)], lineLimit: 300, truck: T(660, 332, 90),
    solve: [C(70, 400), C(215, 395)],
  },
  {
    name: "Fan ve Bölge", carStart: C(70, 400), grounds: [G(0, 400, 300), G(600, 400, 220)], walls: [],
    noZones: [NZ(380, 250, 90, 240)], fans: [FN(300, 345, 392, 105)], lineLimit: 380, truck: T(640, 352, 105),
    solve: [C(70, 400), C(350, 393)],
  },
  {
    name: "Çift Fan", carStart: C(70, 400), grounds: [G(0, 400, 240), G(400, 380, 120), G(640, 360, 180)], walls: [],
    fans: [FN(240, 330, 160, 120), FN(520, 290, 170, 140, 0.6)], lineLimit: 320, truck: T(660, 312, 90),
    solve: [C(235, 398), C(455, 366), C(520, 345)],
  },
  {
    name: "Rüzgar Tüneli", carStart: C(70, 400), grounds: [G(0, 400, 320), G(620, 400, 200)], walls: [],
    noZones: [NZ(320, 0, 300, 280)], fans: [FN(340, 330, 370, 120)], lineLimit: 420, truck: T(660, 352, 100),
    solve: [C(70, 400), C(315, 394)],
  },
  {
    name: "Alçak Rüzgar", carStart: C(70, 400), grounds: [G(0, 400, 280), G(640, 400, 180)], walls: [WL(430, 330, 36, 70)],
    fans: [FN(280, 320, 447, 130, 0.5)], lineLimit: 360, truck: T(680, 352, 95),
    solve: [C(70, 400), C(275, 345)],
  },
  {
    name: "Fan Sınavı", carStart: C(70, 400), grounds: [G(0, 400, 260), G(620, 370, 200)], walls: [WL(500, 300, 34, 70)],
    noZones: [NZ(360, 280, 80, 210)], fans: [FN(260, 290, 380, 160, 0.58)], lineLimit: 340, truck: T(660, 322, 95),
    solve: [C(70, 400), C(255, 350)],
  },
];

// ---------- 51-100 ----------
LEVELS.push(
  // ---------- 51-60: HAREKETLI ENGEL (yeni sey!) ----------
  {
    name: "Salınım Kapısı", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [],
    movers: [MV(400, 240, 44, 70, "y", 80, 0.05)], truck: T(620, 352, 110),
    solve: [C(70, 400), C(370, 120), C(475, 120), C(675, 352)],
  },
  {
    name: "Yukarı Aşağı", carStart: C(70, 400), grounds: [G(0, 400, 340), G(560, 400, 260)], walls: [],
    movers: [MV(430, 250, 40, 80, "y", 70, 0.06)], truck: T(640, 352, 105),
    solve: [C(70, 400), C(395, 140), C(505, 140), C(692, 352)],
  },
  {
    name: "Yan Gezgin", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [],
    movers: [MV(380, 300, 40, 100, "x", 90, 0.04)], truck: T(630, 352, 110),
    solve: [C(70, 400), C(360, 260), C(520, 260), C(685, 352)],
  },
  {
    name: "Alçak Köprü", carStart: C(70, 400), grounds: [G(0, 400, 300), G(560, 400, 260)], walls: [],
    movers: [MV(420, 200, 44, 70, "y", 50, 0.05)], truck: T(660, 352, 105),
    solve: [C(70, 400), C(310, 392), C(550, 388), C(700, 352)],
  },
  {
    name: "Engel Çarkı", carStart: C(70, 400), grounds: [G(0, 400, 300), G(620, 400, 200)], walls: [],
    movers: [MV(380, 240, 44, 90, "y", 90, 0.055)], truck: T(660, 352, 100),
    solve: [C(70, 400), C(350, 110), C(454, 110), C(710, 352)],
  },
  {
    name: "Salınımlı Merdiven", carStart: C(70, 400), grounds: [G(0, 400, 260), G(320, 388, 160), G(540, 376, 280)], walls: [],
    movers: [MV(400, 180, 40, 70, "y", 70, 0.05)], truck: T(620, 328, 95),
    solve: [C(70, 400), C(270, 394), C(330, 388), C(490, 382), C(550, 376), C(667, 328)],
  },
  {
    name: "Blok ve Salınım", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [],
    noZones: [NZ(300, 265, 75, 225)], movers: [MV(520, 240, 44, 80, "y", 80, 0.05)], truck: T(650, 352, 100),
    solve: [C(70, 400), C(285, 230), C(390, 230), C(465, 135), C(579, 135), C(700, 352)],
  },
  {
    name: "Ada Yolu", carStart: C(70, 400), grounds: [G(0, 400, 220), G(320, 385, 140), G(600, 370, 220)], walls: [],
    movers: [MV(240, 180, 40, 70, "y", 60, 0.05)], truck: T(640, 322, 105),
    solve: [C(70, 400), C(230, 386), C(470, 360), C(590, 352), C(710, 322)],
  },
  {
    name: "Salınım ve Tavan", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [],
    noZones: [NZ(380, 0, 160, 150)], movers: [MV(400, 260, 44, 70, "y", 60, 0.05)], truck: T(640, 352, 105),
    solve: [C(70, 400), C(365, 165), C(479, 165), C(692, 352)],
  },
  {
    name: "Engel Sınavı", carStart: C(70, 400), grounds: [G(0, 400, 300), G(580, 400, 240)], walls: [],
    noZones: [NZ(430, 0, 120, 140)], movers: [MV(340, 240, 40, 80, "y", 80, 0.05), MV(500, 230, 40, 90, "x", 70, 0.045)],
    truck: T(640, 352, 100),
    solve: [C(70, 400), C(300, 125), C(400, 125), C(430, 190), C(640, 190), C(690, 352)],
  },

  // ---------- 61-70: Fan + bolge kombolari ----------
  {
    name: "Rüzgar ve Tavan", carStart: C(70, 400), grounds: [G(0, 400, 280), G(600, 400, 220)], walls: [],
    noZones: [NZ(280, 0, 320, 250)], fans: [FN(280, 330, 410, 120)], lineLimit: 340, truck: T(640, 352, 105),
    solve: [C(70, 400), C(262, 394)],
  },
  {
    name: "İkiz Asansör", carStart: C(70, 400), grounds: [G(0, 400, 240), G(580, 320, 240)], walls: [],
    fans: [FN(240, 330, 200, 120), FN(420, 240, 220, 160, 0.6)], lineLimit: 300, truck: T(620, 282, 95),
    solve: [C(70, 400), C(225, 395)],
  },
  {
    name: "İkiz Fan Geçidi", carStart: C(70, 400), grounds: [G(0, 400, 220), G(380, 385, 130), G(590, 370, 230)], walls: [],
    fans: [FN(220, 335, 160, 115), FN(510, 300, 130, 150, 0.6)], lineLimit: 300, truck: T(640, 322, 95),
    solve: [C(215, 398), C(385, 372), C(500, 342)],
  },
  {
    name: "Rüzgar Atlaması", carStart: C(70, 400), grounds: [G(0, 400, 280), G(590, 400, 230)], walls: [WL(600, 350, 32, 50)],
    fans: [FN(280, 300, 310, 150)], lineLimit: 300, truck: T(630, 368, 110),
    solve: [C(70, 400), C(262, 393)],
  },
  {
    name: "Rüzgar Altı Duvar", carStart: C(70, 400), grounds: [G(0, 400, 260), G(620, 400, 200)], walls: [WL(410, 330, 38, 70)],
    fans: [FN(260, 315, 440, 135, 0.52)], lineLimit: 330, truck: T(660, 352, 95),
    solve: [C(70, 400), C(255, 345)],
  },
  {
    name: "Tavan, Blok, Fan", carStart: C(70, 400), grounds: [G(0, 400, 280), G(640, 400, 180)], walls: [],
    noZones: [NZ(280, 0, 200, 240), NZ(520, 230, 70, 260)], fans: [FN(280, 330, 400, 120)], lineLimit: 340, truck: T(680, 352, 90),
    solve: [C(70, 400), C(262, 394)],
  },
  {
    name: "Rüzgarlı Çukur", carStart: C(70, 400), grounds: [G(0, 400, 260), G(640, 430, 180, 60)], walls: [],
    fans: [FN(260, 290, 380, 160)], lineLimit: 320, truck: T(660, 382, 95),
    solve: [C(70, 400), C(245, 394)],
  },
  {
    name: "Fan ve Salınım", carStart: C(70, 400), grounds: [G(0, 400, 280), G(620, 400, 200)], walls: [],
    movers: [MV(430, 170, 40, 70, "y", 60, 0.05)], fans: [FN(280, 330, 420, 120)], lineLimit: 340, truck: T(660, 352, 100),
    solve: [C(70, 400), C(262, 395)],
  },
  {
    name: "Çift Boşluk Tek Fan", carStart: C(70, 400), grounds: [G(0, 400, 240), G(420, 390, 110), G(630, 400, 190)], walls: [],
    fans: [FN(240, 320, 450, 130)], lineLimit: 310, truck: T(670, 352, 90),
    solve: [C(70, 400), C(225, 395)],
  },
  {
    name: "Rüzgar Finali", carStart: C(70, 400), grounds: [G(0, 400, 260), G(600, 370, 220)], walls: [WL(480, 300, 36, 70)],
    noZones: [NZ(300, 0, 180, 230)], fans: [FN(260, 295, 420, 155)], lineLimit: 330, truck: T(640, 322, 95),
    solve: [C(70, 400), C(255, 350)],
  },

  // ---------- 71-80: Engel + duvar + limit kombolari ----------
  {
    name: "Duvar ve Salınım", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(300, 315, 36, 85)],
    movers: [MV(520, 240, 44, 80, "y", 80, 0.05)], truck: T(650, 352, 105),
    solve: [C(70, 400), C(285, 280), C(351, 280), C(480, 120), C(604, 120), C(702, 352)],
  },
  {
    name: "Kısa Mürekkep, Sarkan Engel", carStart: C(70, 400), grounds: [G(0, 400, 320), G(600, 400, 220)], walls: [],
    movers: [MV(420, 230, 44, 90, "y", 90, 0.05)], lineLimit: 900, truck: T(650, 352, 100),
    solve: [C(70, 400), C(385, 105), C(499, 105), C(700, 352)],
  },
  {
    name: "İkili Duvar ve Engel", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(280, 320, 34, 80), WL(560, 300, 36, 100)],
    movers: [MV(410, 250, 40, 80, "y", 70, 0.05)], truck: T(660, 352, 100),
    solve: [C(70, 400), C(265, 285), C(349, 285), C(395, 140), C(465, 140), C(545, 265), C(611, 265), C(710, 352)],
  },
  {
    name: "Derin Kasa", carStart: C(70, 400), grounds: [G(0, 400, 300), G(620, 430, 200, 60)], walls: [],
    movers: [MV(430, 150, 44, 70, "y", 70, 0.05)], truck: T(660, 382, 100),
    solve: [C(70, 400), C(600, 350), C(710, 382)],
  },
  {
    name: "Blok Engel Dansı", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [],
    noZones: [NZ(300, 265, 75, 225)], movers: [MV(500, 245, 44, 80, "y", 75, 0.05)], truck: T(650, 352, 100),
    solve: [C(70, 400), C(285, 230), C(390, 230), C(465, 135), C(579, 135), C(700, 352)],
  },
  {
    name: "Üç Engel", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(260, 320, 34, 80)],
    noZones: [NZ(600, 255, 70, 235)], movers: [MV(430, 240, 40, 80, "y", 80, 0.05)], truck: T(670, 352, 85),
    solve: [C(70, 400), C(245, 285), C(329, 285), C(395, 125), C(505, 125), C(570, 220), C(680, 222), C(712, 352)],
  },
  {
    name: "Tavan Altı Salınım", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [],
    noZones: [NZ(360, 0, 180, 150)], movers: [MV(400, 280, 44, 70, "y", 55, 0.05)], truck: T(640, 352, 105),
    solve: [C(70, 400), C(365, 190), C(479, 190), C(692, 352)],
  },
  {
    name: "Gezgin Duvar", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(560, 300, 36, 100)],
    movers: [MV(350, 290, 40, 110, "x", 100, 0.035)], truck: T(660, 352, 100),
    solve: [C(70, 400), C(310, 250), C(510, 250), C(545, 265), C(611, 265), C(710, 352)],
  },
  {
    name: "Dar Kasa Dansı", carStart: C(70, 400), grounds: [G(0, 400, 320), G(600, 400, 220)], walls: [],
    movers: [MV(400, 235, 44, 85, "y", 85, 0.05)], lineLimit: 850, truck: T(650, 352, 85),
    solve: [C(70, 400), C(365, 110), C(479, 110), C(692, 352)],
  },
  {
    name: "Engel Maratonu", carStart: C(70, 400), grounds: [G(0, 400, 820), G(610, 358, 210)], walls: [WL(240, 325, 32, 75)],
    noZones: [NZ(370, 270, 70, 220)], movers: [MV(560, 240, 44, 85, "y", 85, 0.05)], truck: T(665, 310, 85),
    solve: [C(70, 400), C(225, 290), C(305, 290), C(355, 235), C(455, 235), C(520, 120), C(644, 120), C(707, 310)],
  },

  // ---------- 81-90: Zor geometri ----------
  { name: "Yüksek Duvar Sırası", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(300, 270, 38, 130), WL(540, 280, 38, 120)], truck: T(650, 352, 100) },
  { name: "Kuyu ve Kasa", carStart: C(70, 400), grounds: [G(0, 400, 240), G(300, 430, 120, 60), G(480, 400, 340)], walls: [], noZones: [NZ(330, 300, 60, 190)], truck: T(620, 352, 105) },
  {
    name: "Asma Geçit", carStart: C(70, 400), grounds: [G(0, 400, 820)],
    walls: [WL(320, 170, 38, 140), WL(520, 200, 38, 130)], truck: T(660, 300, 90),
    solve: [C(70, 400), C(300, 360), C(380, 356), C(500, 362), C(580, 358), C(705, 300)],
  },
  { name: "Basamak Duvar", carStart: C(70, 400), grounds: [G(0, 400, 260), G(320, 385, 150), G(530, 365, 290)], walls: [WL(430, 290, 34, 95), WL(620, 270, 34, 95)], truck: T(665, 317, 85) },
  {
    name: "Yüksek İkiz", carStart: C(70, 400), grounds: [G(0, 400, 300), G(560, 330, 260)], walls: [WL(400, 285, 36, 115)],
    noZones: [NZ(500, 0, 140, 300)], truck: T(630, 282, 95),
    solve: [C(70, 400), C(385, 250), C(451, 250), C(490, 335), C(645, 335), C(677, 282)],
  },
  {
    name: "Mürekkep Krizi", carStart: C(70, 400), grounds: [G(0, 400, 820)],
    walls: [WL(340, 295, 38, 105), WL(520, 180, 40, 120)], lineLimit: 720, truck: T(630, 352, 95),
    solve: [C(70, 400), C(325, 260), C(393, 260), C(505, 340), C(575, 340), C(677, 352)],
  },
  {
    name: "Fanlı Yüksek Sınav", carStart: C(70, 400), grounds: [G(0, 400, 260), G(600, 340, 220)], walls: [],
    noZones: [NZ(320, 0, 160, 260)], fans: [FN(260, 275, 420, 175, 0.6)], lineLimit: 320, truck: T(640, 292, 95),
    solve: [C(70, 400), C(242, 395)],
  },
  {
    name: "Hareketli Basamak", carStart: C(70, 400), grounds: [G(0, 400, 280), G(350, 385, 140), G(560, 370, 260)], walls: [],
    movers: [MV(300, 250, 36, 70, "x", 50, 0.06), MV(500, 240, 36, 80, "y", 60, 0.05)], truck: T(620, 322, 95),
    solve: [C(70, 400), C(260, 215), C(400, 215), C(460, 140), C(545, 140), C(667, 322)],
  },
  {
    name: "Bloklar Arası", carStart: C(70, 400), grounds: [G(0, 400, 280), G(600, 400, 220)], walls: [],
    noZones: [NZ(340, 270, 70, 220), NZ(480, 250, 70, 240)], truck: T(650, 352, 95),
    solve: [C(70, 400), C(325, 235), C(425, 235), C(465, 215), C(565, 215), C(697, 352)],
  },
  {
    name: "Zorlu Geçit", carStart: C(70, 400), grounds: [G(0, 400, 260), G(620, 360, 200)], walls: [],
    noZones: [NZ(300, 0, 150, 300)], movers: [MV(560, 220, 44, 75, "y", 65, 0.05)], lineLimit: 1050, truck: T(690, 312, 65),
    solve: [C(70, 400), C(285, 335), C(465, 335), C(545, 125), C(659, 125), C(722, 312)],
  },

  // ---------- 91-100: Final serisi ----------
  {
    name: "Rüzgar Duvarı", carStart: C(70, 400), grounds: [G(0, 400, 260), G(600, 400, 220)], walls: [WL(400, 315, 38, 85)],
    fans: [FN(260, 300, 420, 150)], lineLimit: 340, truck: T(645, 352, 95),
    solve: [C(70, 400), C(250, 335)],
  },
  {
    name: "Asma Rüzgar", carStart: C(70, 400), grounds: [G(0, 400, 260), G(620, 400, 200)], walls: [WL(480, 150, 40, 120)],
    fans: [FN(260, 310, 380, 140, 0.58)], lineLimit: 330, truck: T(670, 352, 95),
    solve: [C(70, 400), C(242, 395)],
  },
  {
    name: "Salınımlı Rüzgar", carStart: C(70, 400), grounds: [G(0, 400, 280), G(620, 400, 200)], walls: [],
    movers: [MV(420, 160, 40, 60, "y", 50, 0.06)], fans: [FN(280, 325, 420, 125)], lineLimit: 340, truck: T(660, 352, 95),
    solve: [C(70, 400), C(262, 395)],
  },
  {
    name: "Dar Koridor Finali", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(400, 300, 36, 100)],
    noZones: [NZ(340, 0, 130, 255)], movers: [MV(560, 235, 40, 80, "y", 75, 0.05)], truck: T(660, 352, 95),
    solve: [C(70, 400), C(385, 280), C(451, 280), C(475, 260), C(515, 125), C(619, 125), C(707, 352)],
  },
  {
    name: "Her Şey Karışık", carStart: C(70, 400), grounds: [G(0, 400, 240), G(620, 370, 200)], walls: [WL(500, 300, 34, 70)],
    noZones: [NZ(300, 270, 70, 220)], fans: [FN(240, 290, 440, 160, 0.58)], lineLimit: 320, truck: T(660, 322, 90),
    solve: [C(70, 400), C(225, 395)],
  },
  { name: "Son Tırmanış", carStart: C(70, 400), grounds: [G(0, 400, 240), G(300, 390, 120), G(480, 375, 110), G(640, 350, 180)], walls: [WL(360, 300, 32, 90), WL(540, 285, 32, 90)], truck: T(670, 302, 80) },
  {
    name: "Mürekkep ve Engel", carStart: C(70, 400), grounds: [G(0, 400, 820)], walls: [WL(560, 295, 36, 105)],
    movers: [MV(380, 240, 44, 85, "y", 85, 0.05)], lineLimit: 900, truck: T(650, 352, 95),
    solve: [C(70, 400), C(345, 120), C(459, 120), C(525, 260), C(631, 260), C(697, 352)],
  },
  {
    name: "Rüzgar Çukuru", carStart: C(70, 400), grounds: [G(0, 400, 240), G(620, 430, 200, 60)], walls: [],
    noZones: [NZ(300, 0, 180, 240)], fans: [FN(240, 300, 400, 150, 0.58)], lineLimit: 310, truck: T(650, 384, 90),
    solve: [C(70, 400), C(225, 395)],
  },
  {
    name: "Cehennem Kapısı", carStart: C(70, 400), grounds: [G(0, 400, 260), G(580, 370, 240)], walls: [],
    noZones: [NZ(300, 0, 140, 290)], movers: [MV(540, 230, 40, 80, "y", 70, 0.05)], lineLimit: 1000, truck: T(640, 322, 95),
    solve: [C(70, 400), C(285, 325), C(455, 325), C(525, 125), C(595, 125), C(687, 322)],
  },
  {
    name: "Büyük Final", carStart: C(70, 400), grounds: [G(0, 400, 220), G(620, 380, 200)], walls: [],
    noZones: [NZ(260, 0, 130, 285), NZ(430, 265, 65, 225)], fans: [FN(220, 310, 420, 140, 0.58)],
    movers: [MV(520, 175, 36, 60, "y", 45, 0.06)], lineLimit: 300, truck: T(650, 332, 85),
    solve: [C(70, 400), C(205, 396)],
  }
);
