# Textul listării pe addons.thunderbird.net

Se copiază în formularul de publicare. Rezumatul (summary) vine din `_locales/*/messages.json` (`extDescription`);
descrierea lungă e mai jos, în engleză (implicit) și în română. Declarația de marcă e cerută de Mozilla
(`docs/mozilla-trademark-raspuns-2026-11.md`) și trebuie să rămână în descriere.

## English (default)

**Name:** ThunderLook

**Summary:** Thunderbird in the New Outlook style: Light/Dark, message cards, start page. Thunderbird is a trademark of
mozilla.org. ThunderLook is not part of, endorsed by, sponsored by, or otherwise affiliated with Mozilla.org or any other
Mozilla entity.

**Description:**

ThunderLook gives Thunderbird a clean, modern look inspired by the New Outlook: rounded cards, soft colors and a calm
reading layout, in Light and Dark.

- Message list as cards: avatar with initials, sender, subject, the first line of the message and a short date. Hover
  actions for read/unread, archive and delete.
- Reading pane as a sheet, with a "Close" button that brings back the start page.
- Start page: clock, date, weather with a 3-day forecast (Open-Meteo), your latest starred messages (remove a star with
  one click) and a daily background image from Wallhaven (or the Thunderbird illustration, without any request).
- Compose window and formatting toolbar restyled, with the font size shown as a number.
- Light/Dark follows Thunderbird's own toggle; Calendar, Tasks and the Address Book follow the theme.
- English and Romanian; the language can be chosen on the start page.

Everything is applied by the extension itself: no userChrome.css, no profile changes. Disabling or removing the
add-on restores the default Thunderbird look.

**Privacy.** ThunderLook does not collect or send any data about you or your messages. Message previews are read
locally. The start page makes only these requests: Open-Meteo, for the weather of the city you choose (city name and
coordinates); and Wallhaven, the default background, for an image matching the theme word you set. Choosing the
Thunderbird illustration as background stops the Wallhaven requests.
Settings are stored locally in the add-on.

**Why "full access" (Experiment API).** Thunderbird's regular extension APIs cannot restyle the message list or add the
start page, so ThunderLook uses an Experiment API. It only changes the look of Thunderbird windows and reads message
headers to show them; it does not modify your messages, folders or accounts, except for removing a star when you click
the × on the start page.

Thunderbird is a trademark of mozilla.org. ThunderLook is not part of, endorsed by, sponsored by, or otherwise
affiliated with Mozilla.org or any other Mozilla entity. Outlook is a trademark of Microsoft Corporation; ThunderLook is
not affiliated with or endorsed by Microsoft.

**Privacy policy (ATN field, full text):**

ThunderLook does not collect, store or share any personal data on servers of its own; it has none.

Data that leaves your computer, only to provide the start page features:
- Open-Meteo (open-meteo.com): the latitude and longitude of the city chosen for the weather, to get the forecast,
  and the city name you type, to look it up (geocoding-api.open-meteo.com). The default city is Bucharest. No
  account, no identifier.
- Wallhaven (wallhaven.cc): the default start page background; choosing "Thunderbird illustration" in the start page
  settings stops these requests. The theme word you set
  (for example "landscape") is sent to search for an image, and the image is downloaded from wallhaven.cc.

All requests use HTTPS and are made directly from Thunderbird. These services may log your IP address under their own
privacy policies. ThunderLook sends nothing from your messages, contacts or accounts to anyone: message previews and the
starred messages on the start page are read locally from Thunderbird. Settings (city, background, theme word, language)
are stored locally in the add-on's storage and are removed when the add-on is removed.

**Screenshots:** `capturi/demo/*.jpg` (English, for the listing) and `capturi/demo/ro/*.jpg` (Romanian), all from a
demo profile with made-up messages.

**Categories:** Appearance / Message Reading
**License:** MIT (code). The ThunderLook logo is not covered by the MIT License.

## Română

**Descriere:**

ThunderLook dă Thunderbird-ului un aspect curat și modern, inspirat de New Outlook: carduri rotunjite, culori discrete și
un panou de citire liniștit, în Light și Dark.

- Lista de mesaje ca niște carduri: avatar cu inițiale, expeditor, subiect, primul rând din mesaj și o dată scurtă.
  La hover: citit/necitit, arhivare și ștergere.
- Panoul de citire ca o foaie, cu butonul „Închide”, care readuce pagina de start.
- Pagina de start: ora, data, vremea și prognoza pe 3 zile (Open-Meteo), ultimele mesaje cu steluță (steluța se scoate
  dintr-un clic) și un fundal zilnic de pe Wallhaven (sau ilustrația Thunderbird, fără nicio cerere).
- Fereastra de scriere și bara de formatare refăcute; mărimea fontului e afișată ca număr.
- Light/Dark urmează comutatorul Thunderbird; Calendarul, Tasks și Agenda urmează tema.
- Română și engleză; limba se alege din pagina de start.

**Confidențialitate.** ThunderLook nu colectează și nu trimite date despre tine sau despre mesajele tale.
Previzualizarea mesajelor se citește local. Pagina de start face doar aceste cereri: Open-Meteo, pentru vremea orașului
ales (numele și coordonatele); și Wallhaven, fundalul implicit, pentru o imagine pe tema aleasă (alegerea ilustrației
Thunderbird oprește aceste cereri). Setările
stau local, în extensie.

Thunderbird is a trademark of mozilla.org. ThunderLook is not part of, endorsed by, sponsored by, or otherwise
affiliated with Mozilla.org or any other Mozilla entity.
