<div align="center">
  <img src="https://raw.githubusercontent.com/hakanumutbey/hakanumutbey/main/github_profile_header.png" width="100%" alt="Hakorocks Studio siberpunk oyun stüdyosu başlığı" />
</div>

<h1 align="center">Hakorocks Studio</h1>

<p align="center">
  <strong>Hakan Umut Akadal'in oyun stüdyosu, portfolyosu ve yaratıcı kod üssü.</strong>
</p>

<p align="center">
  <a href="https://hakorocks.akadal.tr"><img src="https://img.shields.io/badge/Site-hakorocks.akadal.tr-35d2ff?style=for-the-badge&logo=google-chrome&logoColor=111111" alt="Hakorocks Studio web sitesi" /></a>
  <a href="https://github.com/hakanumutbey"><img src="https://img.shields.io/badge/GitHub-hakanumutbey-8fff6a?style=for-the-badge&logo=github&logoColor=111111" alt="GitHub profili" /></a>
  <img src="https://img.shields.io/badge/Coolify-Docker%20Compose-ffd166?style=for-the-badge&logo=docker&logoColor=111111" alt="Coolify Docker Compose" />
</p>

---

## Merhaba, Ben Hakan Umut

Ben **Hakan Umut Akadal**. 9 yaşındayım ve oyun geliştirmeyi, 3D dünyalar kurmayı, web projeleri yapmayı seviyorum. Bu repo hem GitHub karşılama ekranım hem de **Hakorocks Studio** web sitemin kaynak kodu.

Buradaki hedefim basit: yeni oyunlarımı ve projelerimi aynı çatı altında toplamak, arkadaşlarıma gösterebileceğim profesyonel bir stüdyo vitrini oluşturmak ve her geliştirmeyi hızlıca yayına almak.

## Oyunlarım

| Oyun | Tür | Durum |
| --- | --- | --- |
| **Annenden Kaç** | 3D kaçış | Tarayıcıdan oynanabilir |
| **Bardak** | 3D fizik oyunu | Tarayıcıdan oynanabilir |
| **Eşsiz Zindan** | Zindan aksiyonu | Tarayıcıdan oynanabilir |
| **Skeleton Wars** | Macera savaşı | Tarayıcıdan oynanabilir |
| **Vale** | 3D simülasyon | Tarayıcıdan oynanabilir |
| **Robot Avcısı** | Laboratuvar FPS | Tarayıcıdan oynanabilir |

Tüm oyunlar web sitesinde `/oyunlar/...` yollarından açılır ve ana sayfadaki oyun vitrini üzerinden yönlendirilir.

## Proje Yapısı

```text
hakanumutbey/
├── src/                 # Hakorocks Studio ana web sitesi
├── oyunlar/             # Tarayıcıdan oynanabilen oyun kaynakları
├── projeler/            # Yeni web projeleri ve denemeler
├── scripts/             # Build ve dağıtım yardımcıları
├── server.mjs           # Canlı sayaç, oyun borsası ve fotoğraf API'si
├── Dockerfile           # Coolify için üretim imajı
└── docker-compose.yml   # Coolify otomatik ayağa kaldırma
```

## Yayın Akışı

- Ana site **Vite** ile build edilir.
- Oyunlar `npm run build` sırasında `dist/oyunlar/` altına hazırlanır.
- Üretimde `server.mjs` statik dosyaları ve canlı API'yi sunar.
- Coolify, `docker-compose.yml` üzerinden container'ı ayağa kaldırır.
- `main` branch'e push sonrası site yeniden build edilip yayına alınır.
- Oyunlarda `Ö` tuşu ile fotoğraf alınır; fotoğraflar canlı sitede oyunların altında görünür.
- Site açık kişi, oyunda kişi ve oyun borsa grafikleri canlı API ile güncellenir.

## Geliştirme

```bash
npm install
npm run dev
npm run build
docker compose up --build
```

Yeni oyun eklerken oyun kaynakları `oyunlar/yeni-oyun/` içine konur, ana sayfadaki kart `src/main.js` içindeki oyun listesine eklenir ve gerekiyorsa `scripts/build-games.mjs` güncellenir.

---

<div align="center">
  <strong>Hakorocks Studio</strong><br />
  Oyunlar, kodlar ve yeni fikirler burada büyüyor.
</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/hakanumutbey/hakanumutbey/main/footer.png" width="100%" alt="Hakorocks Studio alt görseli" />
</div>
