// Übernimmt alle Downloads aus dem alten Portal / der Nextcloud ins CMS.
// Lädt jede verlinkte Datei nach src/assets/uploads/<bereich>/<eintrag>/,
// trägt sie im Feld „datei“ ein und entfernt den alten Link.
//
//   node scripts/dateien-uebernehmen.mjs            → nur anzeigen (Probelauf)
//   node scripts/dateien-uebernehmen.mjs --los      → wirklich herunterladen und umstellen
//   node scripts/dateien-uebernehmen.mjs --los --aus ~/Downloads/freigabe
//        → Nextcloud-Dateien aus einem bereits heruntergeladenen (entpackten) Freigabe-Ordner nehmen
//
// Muss auf einem Rechner laufen, der marketing.sparverein.de und cloud.sparverein.de erreicht.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const LOS = process.argv.includes("--los");
const AUS = process.argv.includes("--aus") ? process.argv[process.argv.indexOf("--aus") + 1] : null;
const NUR_LOKAL = process.argv.includes("--nur-lokal"); // nichts herunterladen, nur lokal Vorhandenes übernehmen

// Nextcloud-Link → Pfad im heruntergeladenen Freigabe-Ordner
function lokalerPfad(url) {
  if (!AUS) return null;
  const u = new URL(url);
  const datei = u.searchParams.get("files");
  if (!u.hostname.startsWith("cloud.") || !datei) return null;
  const ordner = path.join(AUS, ...(u.searchParams.get("path") || "/").split("/").filter(Boolean));
  const p = path.join(ordner, datei);
  if (fs.existsSync(p)) return p;
  // Umlaute können beim Entpacken anders kodiert sein (z. B. „#U00e4“ oder macOS-NFD)
  const norm = (n) => n.replace(/#U([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).normalize("NFC");
  if (!fs.existsSync(ordner)) return null;
  const treffer = fs.readdirSync(ordner).find((n) => norm(n) === norm(datei));
  return treffer ? path.join(ordner, treffer) : null;
}
const QUELLEN = /^https:\/\/(marketing|cloud)\.sparverein\.de\//;
const ORDNER = ["kampagnen", "formate", "bereiche"];
const sauber = (n) => n.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss")
  .replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();

function dateinameAus(res, url, ersatz) {
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
  if (m) return decodeURIComponent(m[1]);
  const files = new URL(url).searchParams.get("files");
  if (files) return files;
  const typ = (res.headers.get("content-type") || "").split(";")[0];
  const endung = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "application/pdf": "pdf",
    "video/mp4": "mp4", "application/zip": "zip", "image/svg+xml": "svg" }[typ] || "bin";
  return `${ersatz}.${endung}`;
}

async function hole(url, zielOrdner, ersatz) {
  const lokal = lokalerPfad(url);
  if (lokal) {
    fs.mkdirSync(zielOrdner, { recursive: true });
    const ziel = path.join(zielOrdner, sauber(new URL(url).searchParams.get("files") || path.basename(lokal)));
    fs.copyFileSync(lokal, ziel);
    return "/" + path.relative("src", ziel).split(path.sep).join("/");
  }
  if (NUR_LOKAL) throw new Error("nicht im lokalen Ordner");
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let name = sauber(dateinameAus(res, url, ersatz));
  fs.mkdirSync(zielOrdner, { recursive: true });
  let ziel = path.join(zielOrdner, name), i = 2;
  while (fs.existsSync(ziel)) ziel = path.join(zielOrdner, name.replace(/(\.\w+)$/, `-${i++}$1`));
  fs.writeFileSync(ziel, Buffer.from(await res.arrayBuffer()));
  return "/" + path.relative("src", ziel).split(path.sep).join("/");
}

let gesamt = 0, fehler = 0;
for (const o of ORDNER) {
  for (const f of fs.readdirSync(path.join("src", o)).filter((f) => f.endsWith(".md"))) {
    const pfad = path.join("src", o, f);
    const doc = matter(fs.readFileSync(pfad, "utf8"));
    const eintrag = f.replace(/\.md$/, "");
    const zielOrdner = path.join("src/assets/uploads", o, eintrag);
    let geaendert = false;
    const aufgaben = [];
    for (const d of doc.data.dateien || []) {
      if (!d.datei && QUELLEN.test(d.link || "")) aufgaben.push([d, "link", "datei", sauber(d.bezeichnung || "datei")]);
    }
    if (QUELLEN.test(doc.data.steckbrief?.link || "")) aufgaben.push([doc.data.steckbrief, "link", "link", "steckbrief"]);
    if (QUELLEN.test(doc.data.bild || "")) aufgaben.push([doc.data, "bild", "bild", "titelbild"]);
    (doc.data.beispiele || []).forEach((b, i) => { if (QUELLEN.test(b.bild || "")) aufgaben.push([b, "bild", "bild", `beispiel-${i + 1}`]); });
    for (const [obj, von, nach, ersatz] of aufgaben) {
      gesamt++;
      if (!LOS) { console.log(`[Probe] ${pfad}: ${obj[von]}${lokalerPfad(obj[von]) ? "  (lokal vorhanden)" : ""}`); continue; }
      try {
        const neu = await hole(obj[von], zielOrdner, ersatz);
        obj[nach] = neu;
        if (von !== nach) delete obj[von];
        if (obj.bezeichnung) { delete obj.groesse; delete obj.typ; } // wird beim Bauen neu ermittelt
        geaendert = true;
        console.log(`✓ ${neu}`);
      } catch (e) { fehler++; if (!NUR_LOKAL) console.log(`✗ ${pfad}: ${obj[von]} (${e.message})`); }
    }
    if (geaendert) fs.writeFileSync(pfad, matter.stringify(doc.content, doc.data, { lineWidth: -1 }));
  }
}
console.log(`\n${gesamt} Dateien ${LOS ? "verarbeitet" : "gefunden"}${fehler ? `, ${fehler} ${NUR_LOKAL ? "übersprungen" : "Fehler"}` : ""}.`);
if (!LOS) console.log("Zum Übernehmen: node scripts/dateien-uebernehmen.mjs --los");
