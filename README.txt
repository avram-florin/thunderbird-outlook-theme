THUNDERBIRD 161 - TEMA OUTLOOK 365 (LIGHT / DARK)
=================================================

Fișiere
-------
  userChrome.css        punctul unic de intrare: alege tema + geometria comună
  userContent.css       corpul mesajelor (aliniat cu numele) + pagina de start doar cu fundalul
  userChrome-light.css  paleta Light (doar culori)
  userChrome-dark.css   paleta Dark (doar culori)
  Icons\                iconițe Fluent (din FluentBird, MIT; licența în Icons\LICENSE.txt)
  README.txt            acest fișier

Instalare
---------
1. Thunderbird: Setări > General > Config Editor (jos de tot), caută
   toolkit.legacyUserProfileCustomizations.stylesheets și pune-l pe true.
   (Pe acest calculator e deja setat.)
2. Copiază fișierele .css (inclusiv userContent.css) și folderul Icons în folderul "chrome" din profil:
   %APPDATA%\Thunderbird\Profiles\<profil>\chrome\
   (aici: ...\Profiles\fngeiywe.default-release\chrome\)
3. Repornește Thunderbird.

Schimbarea temei
----------------
Din comutatorul lună/soare din dreapta sus a antetului mesajului: tema se schimbă
pe loc în toată aplicația, fără repornire, iar corpul mesajelor devine întunecat
odată cu Dark (comutatorul e cel al Thunderbird, preferința mail.dark-reader.enabled).
Același lucru: Setări > General > „Dark mode” pentru mesaje.
În userChrome.css, Light e baza, iar Dark se aplică peste ea doar când preferința e
activă (@import ... -moz-pref("mail.dark-reader.enabled")). @import trebuie să rămână
ÎNAINTEA oricărei alte reguli din fișier; altfel e ignorat.
Dacă comutatorul nu apare: meniul ⋯ More din antet > Customize > „Show dark mode toggle”.
Un mesaj deja deschis își schimbă corpul la următoarea deschidere.

Ce schimbă
----------
- Culorile Thunderbird sunt suprascrise prin variabilele lui interne
  (--layout-background-*, --selected-item-color, --tree-card-*, --list-container-*),
  deci și dialogurile, meniurile și fereastra de scriere urmează tema.
- Accentul e albastrul Microsoft în loc de culoarea de accent Windows.
- Panourile listă și citire sunt suprafețe rotunjite pe fundal comun, ca în New Outlook.
- Bara de sus (căutare, butoanele ferestrei): albastră în Light, aproape neagră în Dark.
- Căutarea ca în Outlook: lupa în stânga, text mai mare, scurtătura CTRL+K în colțul din dreapta.
- Lista de mesaje (vizualizarea Carduri), ca în New Outlook: rânduri plate cu
  separator fin; citit = expeditor normal, data în culoarea textului;
  necitit = bară albastră în stânga, expeditor îngroșat, subiect și dată albastre;
  selectat = chenar albastru subțire (Dark) / fundal albastru deschis (Light),
  care rămâne la fel și la hover.
- Foldere: text puțin mai mare, selecție gri rotunjită și îngroșată, contor
  necitite albastru fără fundal.
- Bara galbenă (conținut extern blocat, spam etc.) devine bara de informare
  bleu din Outlook.
- Fereastra de scriere: buton Send albastru, corpul mesajului încadrat pe fond gri.
- Mesajul deschis apare ca o „foaie” separată, ca în Outlook: subiectul stă pe
  fundalul ferestrei, iar antetul, notificările și conținutul formează o pagină
  cu margini și colțuri rotunjite, umbră difuză de jur împrejur.
- Panoul de citire ca în Outlook: subiectul ca titlu sus; avatarul (40px, cu
  inițiale și culoare din extensie) în stânga expeditorului; To/Cc aliniate după
  el; butoane plate cu iconițe albastre; corpul mesajului începe în dreptul
  numelui (userContent.css). Expeditorul pe un rând: „Nume<adresă>”, numele
  îngroșat. Ca în Outlook, antetul nu arată Reply to, List-ID și iconițele de
  agendă de lângă adrese; Reply to și List-ID se văd în More > View Source,
  „adaugă în agendă” e în meniul de la click pe adresă.
- Pagina de start Thunderbird (când nu e selectat niciun mesaj): rămâne doar
  ilustrația de fundal; textul, Donate și cardurile sunt ascunse (userContent.css).
- Calendar, Tasks și Agenda urmează tema aleasă (Light/Dark), nu tema din Windows;
  ziua selectată din calendar are doar o nuanță discretă, ca în Outlook;
  butoanele principale din Agendă și Setări sunt albastre, nu în culoarea Windows.
- Logo în colțul din stânga sus: logo-ul Outlook 2024, refăcut în Figma de comunitate
  („Full logo”), cu T în loc de O. Folosit: Icons	hunderbird-t-mare.svg (pătratul mărit
  și coborât pe mijlocul plicului, T-ul și mai mare, cu colțuri rotunjite, ca să se vadă la 32px). Varianta apropiată de
  original: Icons	hunderbird-t.svg (se schimbă numele în secțiunea 2 din userChrome.css).
- Scrollbar subțire. Conținutul e-mailurilor nu e modificat (doar retras spre dreapta).

Lista de mesaje ca în Outlook (3 rânduri)
-----------------------------------------
Doar cu CSS, cardul are 2 rânduri: numele (mai mare) și subiectul cu data în
dreapta. Rândul 3 (începutul mesajului), avatarul cu inițiale și numele fără
adresă vin din extensia proprie outlook-cards.xpi (sursa în folderul extensie\):
  1. Thunderbird > meniu ≡ > Add-ons and Themes > rotița > Install Add-on From File
  2. Alege outlook-cards.xpi și confirmă „Add” (cere acces complet, ca orice
     extensie „Experiment”; codul e în extensie\implementation.js).
Ce face extensia: completează cardurile din listă. Textul de previzualizare îl
citește din copia locală a mesajului, cu parserul MIME al Thunderbird, fără
descărcare din rețea, și îl ține doar în memorie (nu scrie în mesaje sau în
baza de date). Mesajele care nu sunt păstrate local rămân fără rândul 3.
Dezactivare: Add-ons and Themes > Extensions > Outlook Cards > dezactivează;
fără extensie, tema revine singură la 2 rânduri.
Funcționează în vizualizarea Carduri cu 3 rânduri (meniul ≡ din antetul listei
> Cards View, implicit în 161).
Tot din extensie (versiunea 1.2):
- Data scurtă, cu ora în format de 24 de ore: azi „13:07”, ieri „Ieri 13:07”,
  ultimele 6 zile „mar. 13:07”, anul acesta „17 nov.”, mai vechi „17.11.2025”.
  Data completă apare în tooltip.
- Butoane la hover pe fiecare mesaj, ca în Outlook: citit/necitit, arhivează,
  șterge (mută în Deleted/Trash; Ctrl+Z anulează). Acționează pe acel mesaj fără
  să-l deschidă și fără să-l marcheze citit.

Iconița aplicației (extensia, versiunea 1.3)
-------------------------------------------
Ferestrele Thunderbird (Alt+Tab, bara de titlu, butonul din taskbar când Thunderbird
nu e fixat) primesc logo-ul temei în loc de pasăre. Iconița pusă în profil
(chrome\icons\default) nu ajunge, pentru că Thunderbird o găsește întâi pe a lui,
în folderul aplicației; de aceea o pune extensia, direct pe fiecare fereastră.
La dezactivarea extensiei revine pasărea.
Butonul fixat în taskbar și scurtăturile păstrează iconița scurtăturii: click dreapta
pe scurtătură > Proprietăți > Schimbare pictogramă > Icons\thunderbird-t.ico.

Pagina de start (extensia, versiunea 1.4)
-----------------------------------------
Când nu e selectat niciun mesaj, panoul de citire arată pagina extensiei:
ora, data, vremea, prognoza pe 3 zile, câte mesaje cu steluță sunt în Inbox și
ultimele 3 dintre ele, citite sau nu (click pe unul îl deschide), peste o fotografie de fundal.
- Butonul „✕ Închide” din antetul mesajului deselectează mesajul și readuce pagina.
- Rotița ⚙ (dreapta jos) deschide setările; click pe numele orașului face la fel:
    Oraș pentru vreme     implicit București; scrii alt oraș și apeși Salvează
    Fundal                Ilustrația Thunderbird / Wallhaven (fără cont, doar SFW) /
                          Unsplash (cere „Access Key”: unsplash.com/developers >
                          New Application; cheia se lipește aici)
    Tema fotografiilor    cuvinte în engleză, ex. mountains, nature, city night
    Fotografie nouă       schimbă imediat fotografia (altfel se schimbă o dată pe zi)
- Cereri în rețea, făcute direct din Thunderbird: Open-Meteo (coordonatele orașului),
  Wallhaven sau Unsplash (tema aleasă). Setările stau în extensie (storage.local).
- Extensia setează preferința mailnews.start_page.url spre pagina ei; la dezactivare
  o readuce la valoarea dinainte.

Ce nu se poate face
-------------------
- Colțul din stânga sus (deasupra barei Spaces) nu se colorează odată cu bara de sus;
  acolo stă logo-ul.

Idei preluate (nu cod) din add-on-ul „Outlook Style 2026” 2.0, care nu se
instalează pe 161 (strict_max_version 160.*): bara de sus albastră, bara de
informare bleu, butonul Send albastru și corpul încadrat în fereastra de scriere.

Din FluentBird (https://github.com/Deathbyteacup/fluentbird, licență MIT, iconițe
Fluent UI de la Microsoft, MIT): iconițele colorate din bara din stânga (Mail,
Contacte, Calendar, Tasks, Chat, Setări) și iconițele Reply/Forward/More din
antetul mesajului (secțiunea 11 din userChrome.css). Iconițele lor de foldere
sunt pline, iar Outlook folosește contur, așa că pentru foldere am păstrat
iconițele Thunderbird, monocrome, în culoarea textului.

Selectori (verificați în Thunderbird 161.0, din omni.ja, și pe ecran)
--------------------------------------------------------------------
  Bara de instrumente   unified-toolbar, #unifiedToolbarContainer, #unifiedToolbar
  Bara de taburi        #tabs-toolbar, .tabmail-tab
  Bara Spaces           #spacesToolbar, .spaces-toolbar-button
  Panoul de foldere     #folderPane, #folderPaneHeaderBar, #folderTree li > .container
  Lista de mesaje       #threadPane, #threadTree (tree-view)
  Antetul listei        #threadPaneHeaderBar, #quick-filter-bar
  Elemente din listă    #threadTree .card-layout .card-container (Carduri),
                        #threadTree tr (Tabel); stări: .selected, [data-properties~="unread"]
  Panoul de citire      #messagePane, browser#messageBrowser; în interior
                        (aboutMessage.xhtml): #messagepanebox, #messageHeader
  Separatoare           #folderPaneSplitter, #messagePaneSplitter
  Bara de stare         #status-bar
  Bare de avertizare    notification-message[type="warning"] (--message-bar-*)
  Fereastra de scriere  #compose-toolbar-menubar2, #composeToolbar2, #button-send,
                        #messageArea, #messageEditor
Nu mai există în 161: arborii XUL (::-moz-tree-row) pentru foldere și mesaje.

Dezinstalare / revenire
-----------------------
Șterge sau redenumește userChrome.css și repornește Thunderbird.
Copia fișierelor anterioare: ...\fngeiywe.default-release\chrome-backup-2026-11-25\

Note
----
- userChrome.css nu e suportat oficial; o versiune nouă de Thunderbird poate
  schimba selectorii. Dacă ceva nu se mai aplică, pune temporar un fundal roșu
  pe selectorul respectiv ca să vezi dacă se mai potrivește.
- Vizualizarea Tabel a listei de mesaje primește culorile, dar a fost verificată
  pe ecran doar vizualizarea Carduri (cea folosită acum).
