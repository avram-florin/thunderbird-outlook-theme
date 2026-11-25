/* Outlook Cards - Experiment API (Thunderbird 140+, verificat pe 161).
 *
 * Completeaza cardurile din lista de mesaje (element <tr is="thread-card"> din
 * about:3pane) cu:
 *   - .ol-avatar  : cerc cu initialele expeditorului (culoare stabila dupa nume)
 *   - .ol-preview : inceputul textului din mesaj
 *   - numele expeditorului fara adresa (adresa ramane in tooltip)
 * Textul vine din proprietatea "preview" a antetului, iar daca lipseste, din
 * mesajul pastrat local, prin parserul MIME al Thunderbird (MsgHdrToMimeMessage,
 * fara descarcare). Rezultatul sta doar in memorie: nu se scrie nimic in mesaje
 * sau in baza de date si nu se fac cereri in retea.
 * Asezarea si culorile sunt in userChrome.css (sectiunea 6).
 */
"use strict";

/* global ExtensionAPI, ChromeUtils */
const { ExtensionSupport } = ChromeUtils.importESModule(
  "resource:///modules/ExtensionSupport.sys.mjs"
);
const { MsgHdrToMimeMessage } = ChromeUtils.importESModule(
  "resource:///modules/gloda/MimeMessage.sys.mjs"
);
const { MailServices } = ChromeUtils.importESModule(
  "resource:///modules/MailServices.sys.mjs"
);
const { MailUtils } = ChromeUtils.importESModule(
  "resource:///modules/MailUtils.sys.mjs"
);
const { MessageArchiver } = ChromeUtils.importESModule(
  "resource:///modules/MessageArchiver.sys.mjs"
);

/* ---- Data scurta, ca in Outlook, cu ora in format de 24 de ore ----
   azi: "13:07"; ieri: "Ieri 13:07"; ultimele 6 zile: "mar. 13:07";
   anul acesta: "17 nov."; mai vechi: "17.11.2025". */
const WEEKDAYS = ["dum.", "lun.", "mar.", "mie.", "joi", "vin.", "sâm."];
const MONTHS = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function shortDate(date, now = new Date()) {
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const startOf = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (days <= 0) {
    return time;
  }
  if (days == 1) {
    return `Ieri ${time}`;
  }
  if (days < 7) {
    return `${WEEKDAYS[date.getDay()]} ${time}`;
  }
  if (date.getFullYear() == now.getFullYear()) {
    return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  }
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function fullDate(date) {
  return (
    `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ` +
    `${date.getFullYear()}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}

const ID = "outlook-cards";
// Pasul randurilor din Outlook / Thunderbird, masurat pe ecran (134 / 149 px).
const ROW_SCALE = 0.9;
// Paleta de avatare din Fluent (Outlook)
const COLORS = [
  "#c4314b", "#d13438", "#ca5010", "#986f0b", "#498205", "#0b6a0b",
  "#038387", "#005b70", "#0078d4", "#4f6bed", "#5c2e91", "#8764b8",
  "#881798", "#c239b3", "#e3008c", "#7a7574",
];

const patchedWindows = new Set(); // ferestre about:3pane modificate
const hookedBrowsers = new Map(); // browser -> listener "load"
const tabMonitors = new Map(); // tabmail -> monitor

/** "Nume <adresa>" -> "Nume"; doar adresa -> adresa. */
function displayName(text) {
  const m = /^\s*"?(.*?)"?\s*<([^>]+)>\s*$/.exec(text || "");
  if (!m) {
    return (text || "").trim();
  }
  return m[1].trim() || m[2].trim();
}

function initials(name) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) {
    return "?";
  }
  // ca in Outlook: un cuvant -> o litera; mai multe -> prima + ultima
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function colorFor(name) {
  let h = 0;
  for (const ch of name.toLowerCase()) {
    h = (h * 31 + ch.codePointAt(0)) >>> 0;
  }
  return COLORS[h % COLORS.length];
}

/** Text simplu -> un rand: fara citate ("> ..."), spatii comprimate, max 300 car. */
function cleanPreview(text) {
  return (text || "")
    .split(/\r?\n/)
    .filter(line => !/^\s*>/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function msgId(hdr) {
  return `${hdr.folder.URI}#${hdr.messageKey}`;
}

// Previzualizari calculate in aceasta sesiune (doar in memorie).
// shortcut: cache nelimitat pe durata sesiunii; de limitat daca apar foldere foarte mari.
const cache = new Map();

function patch3Pane(win) {
  if (patchedWindows.has(win)) {
    return;
  }
  const Card = win.customElements.get("thread-card");
  if (!Card || Card.prototype.__olOrigFillRow) {
    return;
  }
  patchedWindows.add(win);

  const doc = win.document;
  const tree = () => doc.getElementById("threadTree");
  const queue = []; // antete de citit, unul cate unul
  const queued = new Set(); // "uri#key" deja in coada sau terminate
  let running = false;
  let refreshTimer = null;

  // O singura reimprospatare a listei dupa un grup de previzualizari noi.
  function refreshSoon() {
    if (!refreshTimer) {
      refreshTimer = win.setTimeout(() => {
        refreshTimer = null;
        tree()?.invalidate();
      }, 150);
    }
  }

  function next() {
    const hdr = queue.shift();
    if (!hdr) {
      running = false;
      return;
    }
    running = true;
    const id = msgId(hdr);
    let done = false;
    const finish = text => {
      if (done) {
        return;
      }
      done = true;
      cache.set(id, text);
      if (text) {
        refreshSoon();
      }
      win.setTimeout(next, 0);
    };
    try {
      // false = doar din copia locala, fara descarcare din retea
      MsgHdrToMimeMessage(
        hdr,
        null,
        (_hdr, mimeMsg) => {
          let text = "";
          try {
            text = cleanPreview(mimeMsg?.coerceBodyToPlaintext(hdr.folder));
          } catch (e) {}
          finish(text);
        },
        false,
        { saneBodySize: true }
      );
    } catch (e) {
      finish(""); // mesaj care nu e pastrat local
    }
  }

  function queuePreview(hdr) {
    const id = msgId(hdr);
    if (queued.has(id)) {
      return;
    }
    queued.add(id);
    queue.push(hdr);
    if (!running) {
      next();
    }
  }

  function decorate(card) {
    if ((card.dataset.properties || "").split(" ").includes("dummy")) {
      return;
    }
    const container = card.querySelector(".card-container");
    const column = card.querySelector(".thread-card-column:not(.read-status-column)");
    if (!container || !column) {
      return;
    }

    // Expeditor: doar numele, adresa ramane in tooltip.
    const full = card.senderLine.textContent;
    const name = displayName(full);
    card.senderLine.textContent = name;
    card.senderLine.title = full;

    // Avatar cu initiale.
    let avatar = container.querySelector(":scope > .ol-avatar");
    if (!avatar) {
      avatar = doc.createElement("span");
      avatar.className = "ol-avatar";
      avatar.setAttribute("aria-hidden", "true");
      container.prepend(avatar);
    }
    avatar.textContent = initials(name);
    avatar.style.setProperty("--ol-avatar-color", colorFor(name));

    // Previzualizare.
    let preview = column.querySelector(":scope > .ol-preview");
    if (!preview) {
      preview = doc.createElement("span");
      preview.className = "ol-preview";
      column.append(preview);
    }
    let text = "";
    let hdr = null;
    try {
      hdr = card.view.getMsgHdrAt(card._index);
      text =
        cleanPreview(hdr.getStringProperty("preview")) ||
        cache.get(msgId(hdr)) ||
        "";
      if (!text && !cache.has(msgId(hdr))) {
        queuePreview(hdr);
      }
    } catch (e) {
      // rand fara antet (ex. in timpul reincarcarii listei)
    }
    preview.textContent = text;

    if (hdr) {
      // Data scurta, 24 de ore; data completa ramane in tooltip.
      const date = new Date(hdr.date / 1000);
      card.dateLine.textContent = shortDate(date);
      card.dateLine.title = fullDate(date);
      addHoverActions(card, container, hdr);
    }
  }

  /**
   * Butoane la hover, ca in Outlook: arhiveaza, sterge, citit/necitit.
   * Lucreaza direct pe mesajul randului, fara sa-l selecteze (deci fara sa-l
   * deschida sau sa-l marcheze citit). Stergerea muta in Trash, cu Undo.
   */
  function addHoverActions(card, container, hdr) {
    let bar = container.querySelector(":scope > .ol-actions");
    if (!bar) {
      bar = doc.createElement("span");
      bar.className = "ol-actions";
      for (const [action, title] of [
        ["read", ""],
        ["archive", "Arhivează"],
        ["delete", "Șterge"],
      ]) {
        const b = doc.createElement("button");
        b.type = "button";
        b.className = `ol-act ol-act-${action}`;
        b.dataset.action = action;
        b.title = title;
        b.tabIndex = -1;
        b.addEventListener("mousedown", e => e.stopPropagation());
        b.addEventListener("click", e => {
          e.stopPropagation();
          e.preventDefault();
          runAction(b.dataset.action, bar.__olHdr);
        });
        bar.append(b);
      }
      container.append(bar);
    }
    bar.__olHdr = hdr;
    const readBtn = bar.querySelector(".ol-act-read");
    readBtn.title = hdr.isRead ? "Marchează ca necitit" : "Marchează ca citit";
    readBtn.classList.toggle("is-read", hdr.isRead);
  }

  function runAction(action, hdr) {
    if (!hdr) {
      return;
    }
    try {
      const msgWindow = win.top.msgWindow;
      if (action == "read") {
        hdr.folder.markMessagesRead([hdr], !hdr.isRead);
      } else if (action == "delete") {
        hdr.folder.deleteMessages([hdr], msgWindow, false, false, null, true);
      } else if (action == "archive") {
        const archiver = new MessageArchiver();
        archiver.msgWindow = msgWindow;
        archiver.archiveMessages([hdr]);
      }
    } catch (e) {
      console.error(`${ID}: ${action}`, e);
    }
  }

  // Inaltimea randului: Thunderbird o calculeaza in threadPane.densityChange()
  // (densitate + font). O reducem la pasul masurat in Outlook (134/149 = 0.9).
  const pane = win.threadPane;
  if (pane && !pane.__olOrigDensityChange) {
    pane.__olOrigDensityChange = pane.densityChange;
    pane.densityChange = async function () {
      await this.__olOrigDensityChange();
      Card.ROW_HEIGHT = Math.round(Card.ROW_HEIGHT * ROW_SCALE);
    };
    pane.updateThreadItemSize();
  }

  Card.prototype.__olOrigFillRow = Card.prototype.fillRow;
  Card.prototype.fillRow = function () {
    this.__olOrigFillRow();
    try {
      decorate(this);
    } catch (e) {
      console.error(`${ID}: decorate`, e);
    }
  };
  doc.documentElement.classList.add("ol-cards");
  tree()?.invalidate();

  // Orice incarcare a paginii de start Thunderbird devine pagina extensiei,
  // indiferent de ordinea in care pornesc Thunderbird si extensia.
  const mp = win.messagePane;
  if (mp && !mp.__olOrigDisplayWebPage) {
    mp.__olOrigDisplayWebPage = mp.displayWebPage;
    mp.displayWebPage = function (url, params) {
      return this.__olOrigDisplayWebPage(startPageFor(url), params);
    };
  }
  for (const delay of [0, 1500, 5000]) {
    win.setTimeout(() => replaceThunderbirdStartPage(win), delay);
  }
}

/** Pagina de start Thunderbird (thunderbird.net/.../start) -> pagina extensiei. */
function startPageFor(url) {
  if (homeURL && /^https?:\/\/[^/]*thunderbird\.net\/.*start/i.test(url || "")) {
    return homeURL;
  }
  return url;
}

/** Daca pagina Thunderbird e deja afisata, o inlocuim. */
function replaceThunderbirdStartPage(win) {
  try {
    const web = win.messagePane?.webBrowser;
    const spec = web?.currentURI?.spec || "";
    if (homeURL && web && !web.hidden && /thunderbird\.net/.test(spec)) {
      win.messagePane.displayWebPage(homeURL);
    }
  } catch (e) {}
}

function unpatch3Pane(win) {
  try {
    const Card = win.customElements.get("thread-card");
    if (Card?.prototype.__olOrigFillRow) {
      Card.prototype.fillRow = Card.prototype.__olOrigFillRow;
      delete Card.prototype.__olOrigFillRow;
    }
    const pane = win.threadPane;
    if (pane?.__olOrigDensityChange) {
      pane.densityChange = pane.__olOrigDensityChange;
      delete pane.__olOrigDensityChange;
      pane.updateThreadItemSize();
    }
    const mp = win.messagePane;
    if (mp?.__olOrigDisplayWebPage) {
      mp.displayWebPage = mp.__olOrigDisplayWebPage;
      delete mp.__olOrigDisplayWebPage;
    }
    const doc = win.document;
    doc.documentElement.classList.remove("ol-cards");
    for (const el of doc.querySelectorAll(".ol-avatar, .ol-preview, .ol-actions")) {
      el.remove();
    }
    doc.getElementById("threadTree")?.invalidate();
  } catch (e) {
    // fereastra inchisa intre timp
  }
}

/* ---- Antetul mesajului (about:message): avatar cu initiale si culoare ---- */
const patchedMessageWindows = new Map(); // fereastra about:message -> observer

function patchAboutMessage(mwin) {
  if (patchedMessageWindows.has(mwin)) {
    return;
  }
  const mdoc = mwin.document;
  const box = mdoc.getElementById("expandedfromBox");
  if (!box) {
    return;
  }
  const update = () => {
    for (const avatar of box.querySelectorAll(".recipient-avatar")) {
      if (avatar.classList.contains("has-avatar")) {
        continue; // poza din agenda ramane
      }
      const rec = avatar.closest(".header-recipient");
      const name = displayName(
        rec?.displayName || rec?.fullAddress || avatar.textContent
      );
      const text = initials(name);
      const span = avatar.querySelector("span");
      if (span && span.textContent != text) {
        span.textContent = text;
      }
      avatar.style.setProperty("--ol-avatar-color", colorFor(name));
    }
  };
  const observer = new mwin.MutationObserver(update);
  observer.observe(box, { childList: true, subtree: true, characterData: true });
  patchedMessageWindows.set(mwin, observer);
  mdoc.documentElement.classList.add("ol-msg");
  update();
  addCloseButton(mwin);
}

/**
 * Butonul "Inchide" din antetul mesajului (doar in panoul de citire din
 * about:3pane): deselecteaza mesajul si reafiseaza pagina de start.
 */
function addCloseButton(mwin) {
  const mdoc = mwin.document;
  const toolbar = mdoc.getElementById("header-view-toolbar");
  const w3 = mwin.parent;
  if (
    !toolbar ||
    mdoc.getElementById("olCloseMessageButton") ||
    !w3?.location?.href.startsWith("about:3pane")
  ) {
    return;
  }
  const button = mdoc.createXULElement("toolbarbutton");
  button.id = "olCloseMessageButton";
  button.className = "toolbarbutton-1 message-header-view-button";
  button.setAttribute("label", "Închide");
  button.setAttribute("tooltiptext", "Închide mesajul și arată pagina de start");
  button.addEventListener("command", () => {
    try {
      w3.threadTree.selectedIndex = -1;
      w3.messagePane.showStartPage();
    } catch (e) {
      console.error(`${ID}: close message`, e);
    }
  });
  toolbar.append(button);
}

function unpatchAboutMessage(mwin, observer) {
  try {
    observer.disconnect();
    mwin.document.documentElement.classList.remove("ol-msg");
    mwin.document.getElementById("olCloseMessageButton")?.remove();
  } catch (e) {}
}

/** Urmareste un <browser> si aplica `patch` cand incarca pagina potrivita. */
function hookBrowser(browser, prefix, patch) {
  if (!browser || hookedBrowsers.has(browser)) {
    return;
  }
  const tryPatch = () => {
    const w = browser.contentWindow;
    if (w?.location?.href.startsWith(prefix)) {
      patch(w);
    }
  };
  browser.addEventListener("load", tryPatch, true);
  hookedBrowsers.set(browser, tryPatch);
  tryPatch();
}

function hookTab(tab) {
  const mode = tab?.mode?.name;
  if (mode == "mail3PaneTab") {
    hookBrowser(tab.chromeBrowser, "about:3pane", w => {
      w.customElements.whenDefined("thread-card").then(() => patch3Pane(w));
      hookBrowser(
        w.document.getElementById("messageBrowser"),
        "about:message",
        patchAboutMessage
      );
    });
  } else if (mode == "mailMessageTab") {
    hookBrowser(tab.chromeBrowser, "about:message", patchAboutMessage);
  }
}

function hookMainWindow(win) {
  const tabmail = win.document.getElementById("tabmail");
  if (!tabmail?.tabInfo) {
    win.setTimeout(() => hookMainWindow(win), 500);
    return;
  }
  tabmail.tabInfo.forEach(hookTab);
  const monitor = {
    monitorName: ID,
    onTabTitleChanged() {},
    onTabClosing() {},
    onTabPersist() {},
    onTabRestored() {},
    onTabOpened: hookTab,
    onTabSwitched: hookTab,
  };
  tabmail.registerTabMonitor(monitor);
  tabMonitors.set(tabmail, monitor);
}

let started = false;

/* ---- Pagina de start proprie (ora, data, vremea) ---- */
const START_PREF = "mailnews.start_page.url";
let homeURL = "";
let savedStartPref = null; // { user: bool, value: string } inainte de extensie

function setStartPage(url) {
  homeURL = url;
  if (!url) {
    return;
  }
  if (!savedStartPref) {
    const user = Services.prefs.prefHasUserValue(START_PREF);
    const value = user ? Services.prefs.getStringPref(START_PREF) : "";
    // Nu salvam ca "original" o adresa lasata de o versiune anterioara a extensiei.
    savedStartPref = { user: user && !value.startsWith("moz-extension:"), value };
  }
  Services.prefs.setStringPref(START_PREF, url);
  // Pagina Thunderbird poate fi inca in curs de incarcare: reverificam de cateva ori.
  for (const delay of [0, 1500, 5000]) {
    for (const win of patchedWindows) {
      win.setTimeout(() => replaceThunderbirdStartPage(win), delay);
    }
  }
}

function restoreStartPage() {
  if (!savedStartPref) {
    return;
  }
  if (savedStartPref.user) {
    Services.prefs.setStringPref(START_PREF, savedStartPref.value);
  } else {
    Services.prefs.clearUserPref(START_PREF);
  }
  savedStartPref = null;
}

function start(url) {
  setStartPage(url);
  if (started) {
    return;
  }
  started = true;
  ExtensionSupport.registerWindowListener(ID, {
    chromeURLs: ["chrome://messenger/content/messenger.xhtml"],
    onLoadWindow: hookMainWindow,
  });
}

function stop() {
  if (!started) {
    return;
  }
  started = false;
  restoreStartPage();
  ExtensionSupport.unregisterWindowListener(ID);
  for (const [tabmail, monitor] of tabMonitors) {
    try {
      tabmail.unregisterTabMonitor(monitor);
    } catch (e) {}
  }
  tabMonitors.clear();
  for (const [browser, fn] of hookedBrowsers) {
    browser.removeEventListener("load", fn, true);
  }
  hookedBrowsers.clear();
  for (const win of patchedWindows) {
    unpatch3Pane(win);
  }
  patchedWindows.clear();
  for (const [mwin, observer] of patchedMessageWindows) {
    unpatchAboutMessage(mwin, observer);
  }
  patchedMessageWindows.clear();
}

/* ---- Pentru pagina de start: necititele din Inbox-uri ---- */
const INBOX_FLAG = 0x00001000; // nsMsgFolderFlags.Inbox

function inboxes() {
  const out = [];
  for (const account of MailServices.accounts.accounts) {
    try {
      const root = account.incomingServer?.rootFolder;
      // Conturile doar locale (Local Folders) nu au folder marcat Inbox:
      // folosim atunci folderul numit "Inbox", daca exista.
      const inbox =
        root?.getFolderWithFlags(INBOX_FLAG) ||
        (account.incomingServer.type == "none" && root?.containsChildNamed("Inbox")
          ? root.getChildNamed("Inbox")
          : null);
      if (inbox) {
        out.push(inbox);
      }
    } catch (e) {}
  }
  return out;
}

/** Numarul de necitite si ultimele `limit` mesaje necitite (cele mai noi). */
function inboxSummary(limit) {
  let unread = 0;
  const latest = [];
  for (const folder of inboxes()) {
    unread += folder.getNumUnread(false);
    try {
      for (const hdr of folder.messages) {
        if (!hdr.isRead) {
          latest.push(hdr);
        }
      }
    } catch (e) {}
  }
  latest.sort((a, b) => b.date - a.date);
  return {
    unread,
    latest: latest.slice(0, limit).map(hdr => ({
      folderURI: hdr.folder.URI,
      messageKey: hdr.messageKey,
      from: displayName(hdr.mime2DecodedAuthor),
      subject: hdr.mime2DecodedSubject,
      date: shortDate(new Date(hdr.date / 1000)),
    })),
  };
}

/* ---- Iconita ferestrelor (Windows): logo-ul temei in loc de pasarea Thunderbird ----
   Iconita din profil (chrome/icons/default) nu ajunge: Thunderbird o gaseste
   intai pe a lui, in folderul aplicatiei. O setam direct pe fiecare fereastra,
   cu nsIWindowsUIUtils; la dezactivare revine iconita din thunderbird.exe.
   shortcut: butonul fixat in taskbar pastreaza iconita scurtaturii; se schimba
   doar din Proprietati > Schimbare pictograma pe scurtatura. */
const ICON_LISTENER = ID + "-icon";
let windowIcon = null;

function loadWindowIcon(url) {
  const { NetUtil } = ChromeUtils.importESModule("resource://gre/modules/NetUtil.sys.mjs");
  const stream = NetUtil.newChannel({ uri: url, loadUsingSystemPrincipal: true }).open();
  const bytes = NetUtil.readInputStreamToString(stream, stream.available());
  stream.close();
  const tools = Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools);
  return tools.decodeImageFromBuffer(bytes, bytes.length, "image/png");
}

function windowsUI() {
  return "nsIWindowsUIUtils" in Ci
    ? Cc["@mozilla.org/windows-ui-utils;1"]?.getService(Ci.nsIWindowsUIUtils)
    : null;
}

function setIcon(win) {
  try {
    windowsUI()?.setWindowIcon(win, windowIcon, windowIcon);
  } catch (e) {
    console.error("Outlook Cards: iconita ferestrei", e);
  }
}

function startWindowIcons(url) {
  if (windowIcon || !windowsUI()) {
    return;
  }
  try {
    windowIcon = loadWindowIcon(url);
  } catch (e) {
    console.error("Outlook Cards: nu pot citi iconita", e);
    return;
  }
  ExtensionSupport.registerWindowListener(ICON_LISTENER, { onLoadWindow: setIcon });
}

function stopWindowIcons() {
  if (!windowIcon) {
    return;
  }
  windowIcon = null;
  ExtensionSupport.unregisterWindowListener(ICON_LISTENER);
  const exe = Services.dirsvc.get("XREExeF", Ci.nsIFile).path;
  for (const win of Services.wm.getEnumerator(null)) {
    try {
      windowsUI().setWindowIconFromExe(win, exe, 0);
    } catch (e) {}
  }
}

this.outlookCards = class extends ExtensionAPI {
  // Pornim cat mai devreme (manifest: "events": ["startup"]), inainte de
  // scriptul de fundal, ca adresa paginii de start sa fie cunoscuta din prima.
  onStartup() {
    start(this.extension.baseURI.resolve("home/home.html"));
    startWindowIcons(this.extension.baseURI.resolve("icons/app-256.png"));
  }

  getAPI() {
    return {
      outlookCards: {
        async init(url) {
          start(url);
        },
        async getInboxSummary(limit) {
          return inboxSummary(Math.max(0, Math.min(limit || 3, 10)));
        },
        async openMessage(folderURI, messageKey) {
          const folder = MailServices.folderLookup.getFolderForURL(folderURI);
          const hdr = folder?.msgDatabase.getMsgHdrForKey(messageKey);
          if (hdr) {
            MailUtils.displayMessageInFolderTab(hdr, true);
          }
        },
      },
    };
  }

  onShutdown(isAppShutdown) {
    if (!isAppShutdown) {
      stop();
      stopWindowIcons();
    }
  }
};
