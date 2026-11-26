/* Pagina de start ThunderLook: ora, data, vremea (Open-Meteo) si,
 * optional, o imagine de fundal de pe Wallhaven.
 * Setarile stau in browser.storage.local al extensiei. */
"use strict";

const DEFAULT_CITY = { name: "București", lat: 44.43, lon: 26.1 };
const WEATHER_EVERY_MS = 30 * 60 * 1000;

// Codurile WMO folosite de Open-Meteo -> [pictograma zi, pictograma noapte]; descrierea e in _locales (wmo<cod>)
const WMO = {
  0: ["☀️", "🌙"],
  1: ["🌤️", "🌙"],
  2: ["⛅", "☁️"],
  3: ["☁️", "☁️"],
  45: ["🌫️", "🌫️"],
  48: ["🌫️", "🌫️"],
  51: ["🌦️", "🌧️"],
  53: ["🌦️", "🌧️"],
  55: ["🌧️", "🌧️"],
  56: ["🌧️", "🌧️"],
  57: ["🌧️", "🌧️"],
  61: ["🌦️", "🌧️"],
  63: ["🌧️", "🌧️"],
  65: ["🌧️", "🌧️"],
  66: ["🌧️", "🌧️"],
  67: ["🌧️", "🌧️"],
  71: ["🌨️", "🌨️"],
  73: ["🌨️", "🌨️"],
  75: ["❄️", "❄️"],
  77: ["🌨️", "🌨️"],
  80: ["🌦️", "🌧️"],
  81: ["🌧️", "🌧️"],
  82: ["⛈️", "⛈️"],
  85: ["🌨️", "🌨️"],
  86: ["❄️", "❄️"],
  95: ["⛈️", "⛈️"],
  96: ["⛈️", "⛈️"],
  99: ["⛈️", "⛈️"],
};

const $ = id => document.getElementById(id);

/* ---------- limba: textele vin din _locales/<ro|en>/messages.json ----------
   Se alege din setari (Automat / Română / English); Automat urmeaza limba
   Thunderbird. Fisierul se citeste direct, ca alegerea sa nu depinda de
   limba aplicatiei (browser.i18n stie doar limba Thunderbird). */
let MESSAGES = {};
let LANG = "en";
let IS_RO = false;
let timeFmt, dateFmt, dayFmt;

function t(key, ...subs) {
  const m = MESSAGES[key];
  if (!m) {
    return browser.i18n.getMessage(key, subs.map(String)) || key;
  }
  return m.message.replace(/\$(\d+)\$/g, (_, n) => String(subs[n - 1] ?? ""));
}

function languageCode(choice) {
  if (choice == "ro" || choice == "en") {
    return choice;
  }
  return browser.i18n.getUILanguage().startsWith("ro") ? "ro" : "en";
}

async function loadLanguage() {
  const code = languageCode(await store.get("lang", "auto"));
  IS_RO = code == "ro";
  LANG = IS_RO ? "ro-RO" : browser.i18n.getUILanguage().startsWith("en") ? browser.i18n.getUILanguage() : "en";
  try {
    MESSAGES = await (await fetch(browser.runtime.getURL(`_locales/${code}/messages.json`))).json();
  } catch (e) {
    MESSAGES = {};
  }
  timeFmt = new Intl.DateTimeFormat(LANG, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  dateFmt = new Intl.DateTimeFormat(LANG, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  dayFmt = new Intl.DateTimeFormat(LANG, { weekday: "short" });
}

function weatherText(code) {
  return WMO[code] ? t(`wmo${code}`) : "";
}

function localizePage() {
  document.documentElement.lang = IS_RO ? "ro" : "en";
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const attr of ["title", "placeholder", "aria-label"]) {
    const data = "i18n" + attr.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
    for (const el of document.querySelectorAll(`[data-i18n-${attr}]`)) {
      el.setAttribute(attr, t(el.dataset[data]));
    }
  }
}

/* ---------- stocare ---------- */
const store = {
  async get(key, fallback) {
    try {
      const res = await browser.storage.local.get(key);
      return res[key] ?? fallback;
    } catch (e) {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      await browser.storage.local.set({ [key]: value });
    } catch (e) {
      // fara stocare: setarea ramane doar pana la inchidere
    }
  },
};

/* ---------- ora si data ---------- */
function tick() {
  const now = new Date();
  $("time").textContent = timeFmt.format(now);
  const d = dateFmt.format(now);
  $("date").textContent = d.charAt(0).toUpperCase() + d.slice(1);
}

/* ---------- vremea ---------- */
let city = DEFAULT_CITY;

async function loadWeather() {
  $("city").textContent = city.name;
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    "&current=temperature_2m,weather_code,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4";
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const cur = data.current;
    const [dayIcon, nightIcon] = WMO[cur.weather_code] || ["🌡️", "🌡️"];
    $("wicon").textContent = cur.is_day ? dayIcon : nightIcon;
    $("wtemp").textContent = `${Math.round(cur.temperature_2m)}°`;
    $("wdesc").textContent = weatherText(cur.weather_code);
    $("weather").classList.remove("hidden");
    const max = Math.round(data.daily.temperature_2m_max[0]);
    const min = Math.round(data.daily.temperature_2m_min[0]);
    $("wrange").textContent = t("weatherRange", max, min);
    renderForecast(data.daily);
  } catch (e) {
    $("weather").classList.add("hidden");
    $("forecast").replaceChildren();
    $("wrange").textContent = t("weatherUnavailable");
  }
}


/** Urmatoarele 3 zile (fara azi): zi, pictograma, max/min. */
function renderForecast(daily) {
  const items = [];
  for (let i = 1; i < Math.min(4, daily.time.length); i++) {
    const [y, m, d] = daily.time[i].split("-").map(Number);
    const name = dayFmt.format(new Date(y, m - 1, d)).replace(/\.$/, "");
    const [icon] = WMO[daily.weather_code[i]] || ["🌡️"];
    const li = document.createElement("li");
    li.title = weatherText(daily.weather_code[i]);
    li.append(
      span("fday", name.charAt(0).toUpperCase() + name.slice(1)),
      span("ficon", icon),
      span(
        "ftemp",
        `${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°`
      )
    );
    items.push(li);
  }
  $("forecast").replaceChildren(...items);
}

function span(className, text) {
  const s = document.createElement("span");
  s.className = className;
  s.textContent = text;
  return s;
}

/* ---------- mesaje cu steluta (din extensie, local) ---------- */
function flaggedLabel(n) {
  if (n == 0) {
    return t("flaggedNone");
  }
  if (n == 1) {
    return t("flaggedOne");
  }
  // in romana: 2-19 "mesaje", 20+ (si 0 la final de 1xx) "de mesaje"; in engleza flaggedFew == flaggedMany
  const rest = n % 100;
  return t(rest >= 1 && rest <= 19 ? "flaggedFew" : "flaggedMany", n);
}

// steluta pusa sau scoasa: caseta se reface imediat (o data pentru mai multe
// schimbari la rand). Abonarea se face dupa primul raspuns al extensiei, ca sa
// nu se piarda cand pagina porneste inaintea ei.
let flagTimer = 0;
function watchFlags() {
  if (watchFlags.done) {
    return;
  }
  try {
    browser.outlookCards.onFlaggedChanged.addListener(() => {
      clearTimeout(flagTimer);
      flagTimer = setTimeout(loadMail, 300);
    });
    watchFlags.done = true;
  } catch (e) {}
}

async function loadMail() {
  let summary;
  try {
    summary = await browser.outlookCards.getInboxSummary(3);
  } catch (e) {
    $("mail").hidden = true;
    // la pornirea Thunderbird pagina poate fi gata inaintea extensiei: reincercam
    // la 3 secunde, cel mult un minut (apoi ramane reimprospatarea la 5 minute)
    loadMail.tries = (loadMail.tries || 0) + 1;
    if (loadMail.tries <= 20) {
      setTimeout(loadMail, 3000);
    }
    return;
  }
  loadMail.tries = 0;
  watchFlags();
  $("mailCount").textContent = flaggedLabel(summary.flagged);
  const list = summary.latest.map(m => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.title = t("openMessage");
    b.append(span("mfrom", m.from), span("mdate", m.date), span("msubj", m.subject));
    b.addEventListener("click", () => browser.outlookCards.openMessage(m.folderURI, m.messageKey));
    // x in cerc, ca la notificarile Apple: scoate steluta (caseta se reface din onFlaggedChanged)
    const x = document.createElement("button");
    x.type = "button";
    x.className = "munstar";
    x.title = t("unstar");
    x.setAttribute("aria-label", t("unstarNamed", m.subject || m.from));
    x.addEventListener("click", () => {
      li.classList.add("leaving");
      browser.outlookCards.unflagMessage(m.folderURI, m.messageKey).catch(loadMail);
    });
    li.append(b, x);
    return li;
  });
  $("mailList").replaceChildren(...list);
  $("mail").hidden = false;
}

async function findCity(name) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(name)}&count=1&language=${IS_RO ? "ro" : "en"}&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const hit = (await res.json()).results?.[0];
  if (!hit) {
    return null;
  }
  return { name: hit.name, lat: hit.latitude, lon: hit.longitude, country: hit.country };
}

/* ---------- fundal: ilustratia Thunderbird sau Wallhaven ---------- */
const DEFAULT_SOURCE = "wallhaven";
const DEFAULT_TOPIC = "landscape";
// cheia din storage a ramas "unsplashTopic" din versiunile cu Unsplash, ca tema aleasa sa nu se piarda
const TOPIC_KEY = "unsplashTopic";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// doar adrese https de la Wallhaven: URL-ul ajunge in CSS (url("...")) si intr-un link
function wallhavenURL(u) {
  try {
    const url = new URL(u);
    return url.protocol == "https:" && /(^|\.)wallhaven\.cc$/.test(url.hostname) && !/["'()\s\\]/.test(u);
  } catch (e) {
    return false;
  }
}

function showPhoto(photo) {
  const bg = $("bg");
  const credit = $("credit");
  if (photo && !(wallhavenURL(photo.url) && wallhavenURL(photo.pageLink))) {
    photo = null;
  }
  if (!photo) {
    bg.style.removeProperty("background-image");
    bg.style.removeProperty("background-position");
    credit.replaceChildren();
    return;
  }
  bg.style.backgroundImage = `url("${photo.url}")`;
  bg.style.backgroundPosition = "center";
  credit.replaceChildren(t("photoCredit"), link(photo.pageLink, "Wallhaven"));
}

async function fetchWallhaven(topic) {
  // purity=100: doar imagini SFW; categories=100: generale (fara anime/persoane)
  const params = new URLSearchParams({
    q: topic,
    categories: "100",
    purity: "100",
    sorting: "random",
    atleast: "1920x1080",
    ratios: "16x9,16x10,21x9",
  });
  const res = await fetch(`https://wallhaven.cc/api/v1/search?${params}`);
  if (!res.ok) {
    throw new Error(res.status == 429 ? t("tooManyRequests") : `HTTP ${res.status}`);
  }
  const all = (await res.json()).data || [];
  // Evitam imaginile uriase (ex. 7680px): ajung pana la 4K pentru fundal.
  const fit = all.filter(h => h.dimension_x <= 3840);
  const pool = fit.length ? fit : all;
  const hit = pool[Math.floor(Math.random() * pool.length)];
  if (!hit) {
    throw new Error(t("noImage"));
  }
  return { source: "wallhaven", url: hit.path, pageLink: hit.url };
}

function link(href, text) {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = text;
  return a;
}

// cine alesese Unsplash (scos in 3.2) trece pe sursa implicita
async function getSource() {
  const source = await store.get("bgSource", DEFAULT_SOURCE);
  return source == "thunderbird" ? source : DEFAULT_SOURCE;
}

async function loadBackground(force) {
  const source = await getSource();
  const topic = await store.get(TOPIC_KEY, DEFAULT_TOPIC);
  if (source == "thunderbird") {
    showPhoto(null);
    return;
  }
  // Fotografia se schimba o data pe zi (sau la "Fotografie noua").
  let photo = await store.get("bgPhoto", null);
  const stale =
    !photo || photo.day != todayKey() || photo.topic != topic || photo.source != source;
  if (force || stale) {
    try {
      const fresh = await fetchWallhaven(topic);
      photo = { ...fresh, day: todayKey(), topic };
      await store.set("bgPhoto", photo);
      $("photoMsg").textContent = "";
    } catch (e) {
      $("photoMsg").textContent = t("photoError", e.message);
      if (photo?.source != source) {
        photo = null;
      }
    }
  }
  showPhoto(photo);
}

/* ---------- setari ---------- */
function toggleSettings(open) {
  const panel = $("settings");
  panel.hidden = !open;
  $("settingsBtn").setAttribute("aria-expanded", String(open));
  if (open) {
    $("cityInput").focus();
  }
}

async function fillSettings() {
  $("cityInput").value = city.name;
  $("bgSource").value = await getSource();
  $("photoTopic").value = await store.get(TOPIC_KEY, DEFAULT_TOPIC);
  $("langSelect").value = await store.get("lang", "auto");
}

async function saveSettings(event) {
  event.preventDefault();
  const wanted = $("cityInput").value.trim();
  if (wanted && wanted != city.name) {
    $("cityMsg").textContent = t("searchingCity");
    try {
      const found = await findCity(wanted);
      if (found) {
        city = found;
        await store.set("city", city);
        $("cityMsg").textContent = `${found.name}${found.country ? ", " + found.country : ""}`;
        loadWeather();
      } else {
        $("cityMsg").textContent = t("cityNotFound");
      }
    } catch (e) {
      $("cityMsg").textContent = t("citySearchFailed");
    }
  }
  await store.set("bgSource", $("bgSource").value);
  await store.set(TOPIC_KEY, $("photoTopic").value.trim() || DEFAULT_TOPIC);
  const lang = $("langSelect").value;
  if (lang != (await store.get("lang", "auto"))) {
    await store.set("lang", lang);
    // lista de mesaje si antetul (din extensie) trec si ele pe limba aleasa
    await browser.outlookCards.setLanguage(lang).catch(() => {});
    location.reload();
    return;
  }
  await loadBackground(false);
}

async function main() {
  await loadLanguage();
  localizePage();
  city = await store.get("city", DEFAULT_CITY);
  tick();
  setInterval(tick, 10 * 1000);
  loadWeather();
  setInterval(loadWeather, WEATHER_EVERY_MS);
  loadBackground(false);
  // cheia Unsplash salvata de versiunile vechi nu mai e folosita
  browser.storage.local.remove("unsplashKey").catch(() => {});
  loadMail();
  // stelutele vin pe loc din onFlaggedChanged; intervalul prinde restul (mesaje noi, sterse)
  setInterval(loadMail, 5 * 60 * 1000);
  // la revenirea pe pagina (dupa "Inchide"), lista e actualizata imediat
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadMail();
    }
  });

  $("settingsBtn").addEventListener("click", async () => {
    await fillSettings();
    toggleSettings($("settings").hidden);
  });
  $("city").addEventListener("click", async () => {
    await fillSettings();
    toggleSettings(true);
  });
  $("closeSettings").addEventListener("click", () => toggleSettings(false));
  $("settings").addEventListener("submit", saveSettings);
  $("newPhoto").addEventListener("click", () => loadBackground(true));
  document.addEventListener("keydown", e => {
    if (e.key == "Escape") {
      toggleSettings(false);
    }
  });
}

main();
