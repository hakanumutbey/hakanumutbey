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

- Mevcut oyunlar: `annenden-kac`, `bardak`, `essiz-zindan`, `skeleton-wars`, `vale`, `robot-avcisi`.
- Oyunlarin browser erisimi bozulmamalidir.
- Root `README.md` GitHub profil karşılama ekranidir; sik, Turkce ve proje durumunu anlatan bir vitrin olarak korunmalidir.
- Buyuk refactor yerine calisan yapiyi koruyan net ve odakli degisiklikler tercih edilmelidir.
