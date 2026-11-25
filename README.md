# Thunderbird în stil Outlook 365

Temă pentru **Thunderbird 161** pe Windows 11 care aduce aspectul **New Outlook / Microsoft 365**:
variantele Light și Dark, plus o extensie proprie, **Outlook Cards**, pentru ce nu se poate face doar din CSS.

| Dark | Light |
|---|---|
| ![Dark: lista și pagina de start](capturi/demo/dark-lista-start.jpg) | ![Light: lista și pagina de start](capturi/demo/light-lista-start.jpg) |
| ![Dark: mesaj deschis](capturi/demo/dark-mesaj.jpg) | ![Light: mesaj deschis și butoane la hover](capturi/demo/light-mesaj-hover.jpg) |

Capturile sunt făcute într-un profil demo, cu mesaje inventate (`example.com`).

## Ce conține

| Fișier | Rol |
|---|---|
| `userChrome.css` | punctul de intrare: alege tema (Light/Dark) și conține geometria comună |
| `userChrome-light.css`, `userChrome-dark.css` | doar paletele de culori |
| `userContent.css` | corpul mesajelor aliniat cu antetul; pagina de start Thunderbird fără text |
| `Icons/` | iconițe Fluent din [FluentBird](https://github.com/Deathbyteacup/fluentbird) (MIT, iconițe Microsoft Fluent UI) |
| `outlook-cards.xpi` | extensia gata de instalat |
| `extensie/` | sursa extensiei (Experiment API + pagina de start) |
| `README.txt` | instrucțiunile complete, în detaliu |

## Ce face

- **Interfața**: bara de sus albastră, iconițele colorate ale aplicațiilor în bara din stânga, iconițe de foldere monocrome, panouri rotunjite, accent albastru Microsoft, foldere și fonturi la mărimile din Outlook (măsurate pe ecran).
- **Lista de mesaje** (extensia): avatar cu inițiale, numele expeditorului, subiectul cu dată scurtă în format de 24 de ore, primul rând din mesaj. Butoane la hover pentru citit/necitit, arhivează și șterge.
- **Panoul de citire**: mesajul ca o foaie separată (subiectul pe fundalul ferestrei, antetul și conținutul pe o pagină cu colțuri rotunjite), avatarul lângă expeditor, butoane plate, buton „✕ Închide”.
- **Pagina de start** (extensia): ora, data, vremea și prognoza pe 3 zile (Open-Meteo), mesajele necitite, fundal din Wallhaven (fără cont), Unsplash (cu cheia ta) sau ilustrația Thunderbird.

## Instalare pe scurt

1. În Config Editor: `toolkit.legacyUserProfileCustomizations.stylesheets` = `true`.
2. Copiază fișierele `.css` și folderul `Icons` în `%APPDATA%\Thunderbird\Profiles\<profil>\chrome\`.
3. Add-ons and Themes → rotița → **Install Add-on From File** → `outlook-cards.xpi`.
4. Repornește Thunderbird.

Tema se schimbă dintr-o singură linie (`@import`) la începutul `userChrome.css`. Detaliile, selectorii verificați și ce nu se poate face sunt în `README.txt`.

## Confidențialitate

Previzualizarea mesajelor se citește local, din copia offline, fără cereri în rețea, și stă doar în memorie. Pagina de start face cereri doar către Open-Meteo (coordonatele orașului) și, dacă le alegi, către Wallhaven sau Unsplash (tema fotografiilor).

## Credite

Iconițele din `Icons/` provin din [FluentBird](https://github.com/Deathbyteacup/fluentbird) de Danny King (MIT) și sunt iconițele Fluent UI de la Microsoft (MIT). Licența e în `Icons/LICENSE.txt`.
