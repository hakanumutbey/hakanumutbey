# AGENTS

Bu repo `hakanumutbey` GitHub profil reposu ve ayni zamanda `https://hakorocks.akadal.tr` uzerinde yayinlanacak Hakorocks Studio web sitesidir.

## Temel hedef

- Site basligi ve marka adi `Hakorocks Studio` olarak korunmali.
- Site Hakan Umut Akadal'in portfolyosu, oyun vitrini ve proje merkezi gibi davranmali.
- Icerik dili oncelikle Turkce olmali.
- Tasarim modern, oyun odakli, profesyonel ve arkadaslarla paylasmaya uygun etkileyici bir vitrin olarak kalmali.

## Klasor kurallari

- `src/` ana Hakorocks Studio web sitesidir.
- `oyunlar/` tarayicidan oynanabilen oyun kaynaklari icindir.
- `projeler/` yeni web projeleri, deneyler ve uygulamalar icindir.
- `scripts/build-games.mjs` oyunlarin `dist/oyunlar/` altina nasil hazirlandigini belirler.
- `dist/` ve `node_modules/` commitlenmemelidir.

## Yayin ve build

- Coolify bu repoyu `docker-compose.yml` ile Docker Compose olarak calistirir.
- Uretim imaji `Dockerfile` ile build edilir; `server.mjs` statik dosyalari ve canli API'yi sunar.
- `docker-compose.yml` host port bind etmemeli; Coolify reverse proxy icin sadece container portu expose edilmelidir.
- `main` branch'e push sonrasi Coolify otomatik yayin alacak sekilde dusunulmelidir.
- Degisikliklerden sonra mumkunse `npm run build` calistirilip dogrulanmalidir.

## Yeni oyun ekleme

- Yeni oyun `oyunlar/yeni-oyun-adi/` altina eklenmelidir.
- Oyun tarayicida dogrudan acilabilmelidir.
- Ana sayfadaki oyun vitrini icin `src/main.js` icindeki `games` listesine kart eklenmelidir.
- Oyun Vite veya baska build istiyorsa `scripts/build-games.mjs` guncellenmelidir.
- Oyun linkleri canli sitede `/oyunlar/yeni-oyun-adi/` seklinde calismalidir.

## Yeni proje ekleme

- Yeni proje `projeler/proje-adi/` altina eklenmelidir.
- Ana sitede gosterilecekse `src/main.js` icindeki `projects` listesi guncellenmelidir.
- Proje build veya statik kopya istiyorsa build akisi bozulmadan eklenmelidir.

## Dikkat edilmesi gerekenler

- Mevcut oyunlar: `annenden-kac`, `bardak`, `essiz-zindan`, `skeleton-wars`, `rhgpo`, `siyah-adam`, `vale`, `robot-avcisi`, `birlesim-arenasi`, `hentw`, `hentw2`, `hentw3`, `hentw-premium`, `siber-polis`, `space-arena`, `2d-car-simulator`, `yaris-sehri`, `hako-vurus`, `uzay-yarisi`, `isin-savasi` (cok oyunculu arena; WebSocket yolu `/isin-savasi`), `beyaz-bardak` (3D macera + parti modu; beyaz bardak olarak gorev yap, Atatürk'lü Bardağı bul, caddeden kac, zombi bardaklari ez; WebSocket yolu `/beyaz-bardak`), `make-city` (3D sehir kurma; Sonsuz Para ve Ekonomi modlari, kayit sistemi), `ejderha-ucus` (3D ejderha ucusu; yuzuk parkuru, ates nefesi, GLB model yukleme), `karanlik-labirent` (3D cok oyunculu karanlik labirentten kacis; el feneri, 3 ortak altin anahtar, kilitli cikis kapisi, 2 dakikada bir gizli lanet rotasyonu; WebSocket yolu `/karanlik-labirent`), `in-a-space` (Three.js 3D uzay macerasi; 4 perde, Breath of the Wild tarzi arayuz, serbest ucus, sonda Dunya'da dolasma, secmeli diyalog, kazmayla madencilik + atolye, muzik `muzik/standart.m4a`; kaynak deposu `hakanumutbey/in-a-space`), `in-a-space-2` (Three.js 3D hikaye macerasi, 22 bolum; God of War referansli arayuz, ucuncu sahis kamera, secimli diyalog ve 5 son, ATLAS'in ici, Roblox tarzi kendi mobil kontrolleri `mobile.js`; kaynak deposu `hakanumutbey/in-a-space-2`), `kayip-odalar` (Three.js 3D kacis oyunu, 4 bolum), `vipend-3d` (Three.js Portal tarzi bulmaca FPS, 5 bolum).
- Mevcut projeler: `sesli-parti` (yakinlik sesli sohbet; WebSocket yolu `/sesli-parti`, canli adres `/projeler/sesli-parti/`).
- Oyunlarin browser erisimi bozulmamalidir.
- Root `README.md` GitHub profil karşılama ekranidir; sik, Turkce ve proje durumunu anlatan bir vitrin olarak korunmalidir.
- Buyuk refactor yerine calisan yapiyi koruyan net ve odakli degisiklikler tercih edilmelidir.
