/* Pagina de start "Outlook Cards": ora, data, vremea (Open-Meteo) si,
 * optional, o fotografie de fundal de pe Unsplash (cu cheia utilizatorului).
 * Setarile stau in browser.storage.local al extensiei. */
"use strict";

const DEFAULT_CITY = { name: "București", lat: 44.43, lon: 26.1 };
const WEATHER_EVERY_MS = 30 * 60 * 1000;
const UTM = "utm_source=outlook_cards_thunderbird&utm_medium=referral";

// Codurile WMO folosite de Open-Meteo -> [descriere, pictograma zi, pictograma noapte]
const WMO = {
  0: ["Senin", "☀️", "🌙"],
  1: ["Predominant senin", "🌤️", "🌙"],
  2: ["Parțial noros", "⛅", "☁️"],
  3: ["Înnorat", "☁️", "☁️"],
  45: ["Ceață", "🌫️", "🌫️"],
  48: ["Ceață cu chiciură", "🌫️", "🌫️"],
  51: ["Burniță slabă", "🌦️", "🌧️"],
  53: ["Burniță", "🌦️", "🌧️"],
  55: ["Burniță densă", "🌧️", "🌧️"],
  56: ["Burniță înghețată", "🌧️", "🌧️"],
  57: ["Burniță înghețată", "🌧️", "🌧️"],
  61: ["Ploaie slabă", "🌦️", "🌧️"],
  63: ["Ploaie", "🌧️", "🌧️"],
  65: ["Ploaie puternică", "🌧️", "🌧️"],
  66: ["Ploaie înghețată", "🌧️", "🌧️"],
  67: ["Ploaie înghețată", "🌧️", "🌧️"],
  71: ["Ninsoare slabă", "🌨️", "🌨️"],
  73: ["Ninsoare", "🌨️", "🌨️"],
  75: ["Ninsoare abundentă", "❄️", "❄️"],
  77: ["Fulgi de zăpadă", "🌨️", "🌨️"],
  80: ["Averse slabe", "🌦️", "🌧️"],
  81: ["Averse", "🌧️", "🌧️"],
  82: ["Averse puternice", "⛈️", "⛈️"],
  85: ["Averse de ninsoare", "🌨️", "🌨️"],
  86: ["Averse de ninsoare", "❄️", "❄️"],
  95: ["Furtună", "⛈️", "⛈️"],
  96: ["Furtună cu grindină", "⛈️", "⛈️"],
  99: ["Furtună cu grindină", "⛈️", "⛈️"],
};

const $ = id => document.getElementById(id);

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
const timeFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

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
    const [desc, dayIcon, nightIcon] = WMO[cur.weather_code] || ["", "🌡️", "🌡️"];
    $("wicon").textContent = cur.is_day ? dayIcon : nightIcon;
    $("wtemp").textContent = `${Math.round(cur.temperature_2m)}°`;
    $("wdesc").textContent = desc;
    $("weather").classList.remove("hidden");
    const max = Math.round(data.daily.temperature_2m_max[0]);
    const min = Math.round(data.daily.temperature_2m_min[0]);
    $("wrange").textContent = `max ${max}° · min ${min}°`;
    renderForecast(data.daily);
  } catch (e) {
    $("weather").classList.add("hidden");
    $("forecast").replaceChildren();
    $("wrange").textContent = "vremea nu e disponibilă acum";
  }
}

const dayFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "short" });

/** Urmatoarele 3 zile (fara azi): zi, pictograma, max/min. */
function renderForecast(daily) {
  const items = [];
  for (let i = 1; i < Math.min(4, daily.time.length); i++) {
    const [y, m, d] = daily.time[i].split("-").map(Number);
    const name = dayFmt.format(new Date(y, m - 1, d)).replace(/\.$/, "");
    const [desc, icon] = WMO[daily.weather_code[i]] || ["", "🌡️"];
    const li = document.createElement("li");
    li.title = desc;
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
    return "Niciun mesaj cu steluță";
  }
  if (n == 1) {
    return "1 mesaj cu steluță";
  }
  // in romana: 2-19 "mesaje", 20+ (si 0 la final de 1xx) "de mesaje"
  const rest = n % 100;
  return rest >= 1 && rest <= 19 ? `${n} mesaje cu steluță` : `${n} de mesaje cu steluță`;
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
    // la 3 secunde, cel mult un minut (apoi ramane reimprospatarea pe minut)
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
    b.title = "Deschide mesajul";
    b.append(span("mfrom", m.from), span("mdate", m.date), span("msubj", m.subject));
    b.addEventListener("click", () => browser.outlookCards.openMessage(m.folderURI, m.messageKey));
    // x in cerc, ca la notificarile Apple: scoate steluta (caseta se reface din onFlaggedChanged)
    const x = document.createElement("button");
    x.type = "button";
    x.className = "munstar";
    x.title = "Scoate steluța";
    x.setAttribute("aria-label", `Scoate steluța: ${m.subject || m.from}`);
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
    `?name=${encodeURIComponent(name)}&count=1&language=ro&format=json`;
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

/* ---------- fundal: ilustratia Thunderbird, Wallhaven sau Unsplash ---------- */
const DEFAULT_SOURCE = "wallhaven";
const DEFAULT_TOPIC = "landscape";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function showPhoto(photo) {
  const bg = $("bg");
  const credit = $("credit");
  if (!photo) {
    bg.style.removeProperty("background-image");
    bg.style.removeProperty("background-position");
    credit.replaceChildren();
    return;
  }
  bg.style.backgroundImage = `url("${photo.url}")`;
  bg.style.backgroundPosition = "center";
  if (photo.source == "unsplash") {
    credit.replaceChildren(
      "Foto: ",
      link(`${photo.userLink}?${UTM}`, photo.userName),
      " pe ",
      link(`https://unsplash.com/?${UTM}`, "Unsplash")
    );
  } else {
    credit.replaceChildren("Fundal: ", link(photo.pageLink, "Wallhaven"));
  }
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
    throw new Error(res.status == 429 ? "prea multe cereri, încearcă peste un minut" : `HTTP ${res.status}`);
  }
  const all = (await res.json()).data || [];
  // Evitam imaginile uriase (ex. 7680px): ajung pana la 4K pentru fundal.
  const fit = all.filter(h => h.dimension_x <= 3840);
  const pool = fit.length ? fit : all;
  const hit = pool[Math.floor(Math.random() * pool.length)];
  if (!hit) {
    throw new Error("nicio imagine pentru această temă");
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

async function fetchUnsplash(key, topic) {
  const params = new URLSearchParams({ orientation: "landscape", content_filter: "high" });
  if (topic) {
    params.set("query", topic);
  }
  const headers = { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" };
  const res = await fetch(`https://api.unsplash.com/photos/random?${params}`, { headers });
  if (!res.ok) {
    throw new Error(res.status == 401 ? "cheie invalidă" : `HTTP ${res.status}`);
  }
  const p = await res.json();
  // Regula Unsplash: se anunta "descarcarea" cand fotografia e folosita.
  fetch(p.links.download_location, { headers }).catch(() => {});
  const width = Math.round(screen.width * (window.devicePixelRatio || 1));
  return {
    source: "unsplash",
    url: `${p.urls.raw}&w=${width}&q=80&fm=jpg&fit=max`,
    userName: p.user.name,
    userLink: p.user.links.html,
  };
}

async function loadBackground(force) {
  const source = await store.get("bgSource", DEFAULT_SOURCE);
  const topic = await store.get("unsplashTopic", DEFAULT_TOPIC);
  const key = await store.get("unsplashKey", "");
  if (source == "thunderbird" || (source == "unsplash" && !key)) {
    if (source == "unsplash") {
      $("photoMsg").textContent = "Unsplash: lipsește cheia. Arăt ilustrația Thunderbird.";
    }
    showPhoto(null);
    return;
  }
  // Fotografia se schimba o data pe zi (sau la "Fotografie noua").
  let photo = await store.get("bgPhoto", null);
  const stale =
    !photo || photo.day != todayKey() || photo.topic != topic || photo.source != source;
  if (force || stale) {
    try {
      const fresh = source == "unsplash" ? await fetchUnsplash(key, topic) : await fetchWallhaven(topic);
      photo = { ...fresh, day: todayKey(), topic };
      await store.set("bgPhoto", photo);
      $("photoMsg").textContent = "";
    } catch (e) {
      const name = source == "unsplash" ? "Unsplash" : "Wallhaven";
      $("photoMsg").textContent = `${name}: ${e.message}. Rămâne fundalul anterior.`;
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

function syncKeyRow() {
  $("unsplashKeyRow").hidden = $("bgSource").value != "unsplash";
}

async function fillSettings() {
  $("cityInput").value = city.name;
  $("bgSource").value = await store.get("bgSource", DEFAULT_SOURCE);
  $("unsplashKey").value = await store.get("unsplashKey", "");
  $("unsplashTopic").value = await store.get("unsplashTopic", DEFAULT_TOPIC);
  syncKeyRow();
}

async function saveSettings(event) {
  event.preventDefault();
  const wanted = $("cityInput").value.trim();
  if (wanted && wanted != city.name) {
    $("cityMsg").textContent = "Caut orașul…";
    try {
      const found = await findCity(wanted);
      if (found) {
        city = found;
        await store.set("city", city);
        $("cityMsg").textContent = `${found.name}${found.country ? ", " + found.country : ""}`;
        loadWeather();
      } else {
        $("cityMsg").textContent = "Nu am găsit orașul. Încearcă alt nume.";
      }
    } catch (e) {
      $("cityMsg").textContent = "Căutarea nu a mers (fără internet?).";
    }
  }
  await store.set("bgSource", $("bgSource").value);
  await store.set("unsplashKey", $("unsplashKey").value.trim());
  await store.set("unsplashTopic", $("unsplashTopic").value.trim() || DEFAULT_TOPIC);
  await loadBackground(false);
}

async function main() {
  city = await store.get("city", DEFAULT_CITY);
  tick();
  setInterval(tick, 10 * 1000);
  loadWeather();
  setInterval(loadWeather, WEATHER_EVERY_MS);
  loadBackground(false);
  loadMail();
  setInterval(loadMail, 60 * 1000);
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
  $("bgSource").addEventListener("change", syncKeyRow);
  $("settings").addEventListener("submit", saveSettings);
  $("newPhoto").addEventListener("click", () => loadBackground(true));
  document.addEventListener("keydown", e => {
    if (e.key == "Escape") {
      toggleSettings(false);
    }
  });
}

main();
