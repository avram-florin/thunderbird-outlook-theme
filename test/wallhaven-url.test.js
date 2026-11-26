// Testeaza wallhavenURL exact cum e in home.js (extrage functia din fisier).
const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "..", "extensie", "home", "home.js"), "utf8");
const fn = src.match(/function wallhavenURL[\s\S]*?\n}\n/)[0];
const wallhavenURL = new Function(fn + "; return wallhavenURL;")();
const ok = ["https://w.wallhaven.cc/full/ab/wallhaven-ab12.jpg", "https://wallhaven.cc/w/ab12"];
const bad = [
  "http://w.wallhaven.cc/x.jpg",
  "https://evilwallhaven.cc/x",
  'https://w.wallhaven.cc/x").jpg',
  "javascript:alert(1)",
  "https://wallhaven.cc.evil.com/x",
  "https://w.wallhaven.cc/a\\b",
];
for (const u of ok) if (!wallhavenURL(u)) throw new Error("respins gresit: " + u);
for (const u of bad) if (wallhavenURL(u)) throw new Error("acceptat gresit: " + u);
console.log("teste ok");
