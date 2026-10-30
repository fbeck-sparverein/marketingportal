// Eleventy-Konfiguration für das Sparverein-Marketingportal
import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import Image from "@11ty/eleventy-img";

// Hochgeladene Dateien: Typ, Größe und Pixelmaße automatisch ermitteln,
// damit die Redaktion nur Datei + Bezeichnung pflegen muss.
const BILDTYPEN = ["JPG", "JPEG", "PNG", "GIF", "BMP", "SVG", "WEBP"];
function groesseLesbar(bytes) {
  if (bytes >= 1000 * 1024) return (bytes / 1048576).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " MB";
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}
function dateiErgaenzen(d) {
  if (!d || !d.datei || d._ergaenzt) return d;
  d._ergaenzt = true;
  const lokal = path.join("src", decodeURI(d.datei));
  const endung = path.extname(d.datei).slice(1).toUpperCase();
  if (endung) d.typ = endung === "JPEG" ? "JPG" : endung;
  try {
    const st = fs.statSync(lokal);
    d.groesse = groesseLesbar(st.size);
    if (BILDTYPEN.includes(endung) && !d.masse) {
      const m = imageSize(fs.readFileSync(lokal));
      if (m.width && m.height) d.masse = `${m.width}×${m.height}`;
    }
  } catch { /* Datei (noch) nicht vorhanden – Angaben aus dem CMS bleiben */ }
  return d;
}
// Kleine Vorschaubilder (WebP, 480 px breit) für hochgeladene Bilder erzeugen
const VORSCHAU_TYPEN = ["JPG", "PNG", "GIF", "WEBP"];
async function vorschauErzeugen(d) {
  if (!d?.datei || d.vorschau || d._vorschau !== undefined || !VORSCHAU_TYPEN.includes(d.typ)) return;
  d._vorschau = null;
  try {
    const meta = await Image(path.join("src", decodeURI(d.datei)), {
      widths: [480], formats: ["webp"], outputDir: "_site/assets/vorschau/", urlPath: "/assets/vorschau/",
      sharpWebpOptions: { quality: 72 }, sharpOptions: { animated: false },
    });
    d._vorschau = meta.webp[0].url;
  } catch (e) { console.warn("[vorschau]", d.datei, e.message); }
}
const mitDateien = async (liste) => {
  for (const e of liste) for (const d of e.data.dateien || []) { dateiErgaenzen(d); await vorschauErzeugen(d); }
  return liste;
};
const nachReihenfolge = (a, b) => (a.data.reihenfolge ?? 99) - (b.data.reihenfolge ?? 99);

// Status einer Aktion relativ zu "heute" (wird im Browser per JS aktualisiert)
function aktionsStatus(k, heute = new Date()) {
  if (k.dauerhaft) return { code: "dauerhaft", text: "Dauerhaft verfügbar" };
  const tag = 864e5;
  const start = k.start ? new Date(k.start + "T00:00:00") : null;
  const ende = k.ende ? new Date(k.ende + "T23:59:59") : null;
  if (start && heute < start) {
    const n = Math.ceil((start - heute) / tag);
    return { code: "bald", text: n === 1 ? "Startet morgen" : `Startet in ${n} Tagen` };
  }
  if (ende && heute > ende) return { code: "beendet", text: "Beendet" };
  if (ende) {
    const n = Math.ceil((ende - heute) / tag);
    return { code: "laeuft", text: n <= 1 ? "Läuft · letzter Tag" : `Läuft · noch ${n} Tage` };
  }
  return { code: "laeuft", text: "Läuft" };
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.ignores.add("src/admin/**");

  eleventyConfig.addCollection("kampagnen", (api) => api.getFilteredByGlob("src/kampagnen/*.md").sort(nachReihenfolge));
  eleventyConfig.addCollection("formate", async (api) => (await mitDateien(api.getFilteredByGlob("src/formate/*.md"))).sort(nachReihenfolge));
  eleventyConfig.addCollection("bereiche", async (api) => (await mitDateien(api.getFilteredByGlob("src/bereiche/*.md"))).sort(nachReihenfolge));
  eleventyConfig.addCollection("neuigkeiten", (api) => api.getFilteredByGlob("src/neuigkeiten/*.md").sort(nachReihenfolge));

  // ── Filter ──────────────────────────────────────────────
  // Verkleinerte Fassung eines hochgeladenen Bildes (z. B. Mockups, Titelbild)
  eleventyConfig.addAsyncFilter("verkleinert", async (src, breite = 800) => {
    if (!src || /^https?:/.test(src)) return src;
    try {
      const meta = await Image(path.join("src", decodeURI(src)), { widths: [breite], formats: ["webp"], outputDir: "_site/assets/vorschau/", urlPath: "/assets/vorschau/", sharpWebpOptions: { quality: 75 } });
      return meta.webp[0].url;
    } catch { return src; }
  });
  // Bis zu drei Vorschaubilder für eine Zielgruppe – je Aktion eins, bevorzugt im Querformat (Social: beliebig)
  eleventyConfig.addFilter("vorschauBilder", (formate, kampagnen, zielgruppe, anzahl = 3) => {
    const bilder = [];
    for (const k of kampagnen || []) {
      const dateien = (formate || []).filter((f) => f.data.kampagne === k.fileSlug && f.data.zielgruppe === zielgruppe)
        .sort((a, b) => (a.data.reihenfolge ?? 99) - (b.data.reihenfolge ?? 99))
        .flatMap((f) => f.data.dateien || []).filter((d) => d._vorschau);
      const quer = dateien.find((d) => { const m = String(d.masse || "").match(/(\d+)\D+(\d+)/); const r = m ? m[1] / m[2] : 0; return r > 1.3 && r < 2.6; });
      const wahl = zielgruppe === "social" ? dateien[0] : (quer || dateien[0]);
      if (wahl) bilder.push({ src: wahl._vorschau, alt: k.data.title });
      if (bilder.length >= anzahl) break;
    }
    return bilder;
  });
  eleventyConfig.addFilter("head", (liste, n) => (liste || []).slice(0, n));
  eleventyConfig.addFilter("status", (k) => aktionsStatus(k));
  // Laufende und kommende Aktionen zuerst, beendete ans Ende
  eleventyConfig.addFilter("aktuelleZuerst", (kampagnen) => {
    const rang = { laeuft: 0, bald: 1, dauerhaft: 2, beendet: 3 };
    return [...(kampagnen || [])].sort((a, b) =>
      (rang[aktionsStatus(a.data).code] - rang[aktionsStatus(b.data).code]) || nachReihenfolge(a, b));
  });
  eleventyConfig.addFilter("formateVon", (formate, kampagne, zielgruppe) =>
    (formate || []).filter((f) => (!kampagne || f.data.kampagne === kampagne) && (!zielgruppe || f.data.zielgruppe === zielgruppe)));
  eleventyConfig.addFilter("bereicheIn", (bereiche, gruppe) => (bereiche || []).filter((b) => b.data.gruppe === gruppe));
  eleventyConfig.addFilter("finde", (liste, schluessel, wert) => (liste || []).find((x) => (x.data ? x.data[schluessel] ?? x[schluessel] : x[schluessel]) === wert));
  eleventyConfig.addFilter("anzahlDateien", (formate) => (formate || []).reduce((s, f) => s + (f.data.dateien?.length || 0), 0));

  // Platzhalter-Rahmen im echten Seitenverhältnis (passt in 132×84 px)
  eleventyConfig.addFilter("rahmen", (d) => {
    let w = 4, h = 3;
    const m = String(d?.masse || "").match(/(\d+)\s*[x×]\s*(\d+)/i);
    const r = String(d?.seitenverhaeltnis || "").match(/(\d+(?:,\d+)?)\s*:\s*(\d+)/);
    if (m) { w = +m[1]; h = +m[2]; }
    else if (r) { w = parseFloat(r[1].replace(",", ".")); h = +r[2]; }
    else if (d?.typ === "PDF") { w = 210; h = 297; }
    else if (d?.typ === "SVG" || d?.typ === "PNG") { w = 3; h = 2; }
    const s = Math.min(132 / w, 84 / h);
    return `width:${Math.round(w * s)}px;height:${Math.round(h * s)}px`;
  });

  // Suchindex über Aktionen, Formate, Werbemittel und Downloads
  eleventyConfig.addFilter("suchindex", (c, zielgruppen) => {
    const eintraege = [];
    const zg = Object.fromEntries((zielgruppen || []).map((z) => [z.schluessel, z.titel]));
    const kamp = Object.fromEntries((c.kampagnen || []).map((k) => [k.fileSlug, k.data.title]));
    for (const k of c.kampagnen || []) eintraege.push({ t: k.data.title, s: "Aktion · " + (k.data.zeitraum || ""), u: `/aktionen/${k.fileSlug}/`, a: "Aktion" });
    for (const b of c.bereiche || []) eintraege.push({ t: b.data.title, s: b.data.kurz || "", u: `/${b.data.gruppe}/${b.fileSlug.replace(b.data.gruppe + "-", "")}/`, a: "Seite" });
    for (const f of c.formate || []) {
      const seite = `/aktionen/${f.data.kampagne}/#${f.fileSlug}`;
      for (const d of f.data.dateien || []) {
        eintraege.push({
          t: d.bezeichnung,
          s: [kamp[f.data.kampagne], zg[f.data.zielgruppe], f.data.title].filter(Boolean).join(" · "),
          k: [d.masse, d.seitenverhaeltnis, d.typ].filter(Boolean).join(" "),
          u: seite, d: d.datei || d.link, a: d.typ,
        });
      }
    }
    for (const b of c.bereiche || []) {
      for (const d of b.data.dateien || []) {
        eintraege.push({ t: d.bezeichnung, s: b.data.title, k: [d.masse, d.typ].filter(Boolean).join(" "),
          u: `/${b.data.gruppe}/${b.fileSlug.replace(b.data.gruppe + "-", "")}/`, d: d.datei || d.link, a: d.typ });
      }
    }
    return JSON.stringify(eintraege).replace(/</g, "\\u003c");
  });

  eleventyConfig.addFilter("downloadUrl", (d) => d?.datei || d?.link || "#");
  eleventyConfig.addFilter("bereichUrl", (b) => `/${b.data.gruppe}/${b.fileSlug.replace(b.data.gruppe + "-", "")}/`);
  eleventyConfig.addFilter("absatz", (t) => String(t || "").split(/\n\s*\n/).map((p) => `<p>${p.trim()}</p>`).join(""));
  eleventyConfig.addFilter("heuteIso", () => new Date().toISOString().slice(0, 10));

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
