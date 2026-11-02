// Marketingportal Sparverein – Interaktionen
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const basis = (window.SV_BASIS || "/").replace(/\/$/, "/");
  // Für statische Vorschau ohne Server: Ordner-Links auf index.html umbiegen
  const mitIndex = (u) => window.SV_INDEX ? u.replace(/\/(#|$)/, "/index.html$1") : u;
  const lies = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const TAG = 864e5;
  const deDatum = (s) => { const m = String(s).match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  const heute = new Date(); heute.setHours(0, 0, 0, 0);

  function toast(text) {
    const t = $("#toast"); if (!t) return;
    t.textContent = text; t.classList.add("sichtbar");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("sichtbar"), 2200);
  }

  // ── Status der Aktionen live berechnen ──────────────────
  function status(start, ende, dauerhaft) {
    if (dauerhaft) return ["dauerhaft", "Dauerhaft verfügbar"];
    const s = start ? new Date(start + "T00:00:00") : null;
    const e = ende ? new Date(ende + "T23:59:59") : null;
    const jetzt = new Date();
    if (s && jetzt < s) { const n = Math.ceil((s - jetzt) / TAG); return ["bald", n === 1 ? "Startet morgen" : `Startet in ${n} Tagen`]; }
    if (e && jetzt > e) return ["beendet", "Beendet"];
    if (e) { const n = Math.ceil((e - jetzt) / TAG); return ["laeuft", n <= 1 ? "Läuft · letzter Tag" : `Läuft · noch ${n} Tage`]; }
    return ["laeuft", "Läuft"];
  }
  $$(".js-status").forEach((el) => {
    const q = el.dataset.start !== undefined && el.dataset.start !== "" || el.dataset.dauerhaft ? el : el.closest("[data-start]");
    if (!q) return;
    const [code, text] = status(q.dataset.start, q.dataset.ende, q.dataset.dauerhaft === "ja");
    el.textContent = text;
    el.className = el.className.replace(/chip--(laeuft|bald|beendet|dauerhaft)/, "chip--" + code);
  });

  // „Neu“-Etikett nach 30 Tagen ausblenden (die Seite wird nicht täglich neu gebaut)
  $$(".js-neu").forEach((el) => { el.hidden = new Date(el.dataset.bis + "T00:00:00") < heute; });

  // ── Institut wählen (Sparkasse / Volksbank) ─────────────
  function setzeInstitut(wert, melden) {
    document.documentElement.dataset.institut = wert;
    schreib("sv-institut", wert);
    $$(".js-institut").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wert === wert)));
    $$(".js-institut-link").forEach((a) => { a.href = mitIndex(a.dataset.vorlage.replace("{institut}", wert)); });
    $$(".js-reiter").forEach((b) => { if (b.dataset.ziel === wert) waehleReiter(b, false); });
    if (melden) toast(wert === "sparkassen" ? "Sie sehen jetzt zuerst die Sparkassen-Formate" : "Sie sehen jetzt zuerst die Volksbanken-Formate");
  }
  $$(".js-institut").forEach((b) => b.addEventListener("click", () => setzeInstitut(b.dataset.wert, true)));

  // ── Reiter auf Aktionsseiten ────────────────────────────
  function waehleReiter(knopf, fokus) {
    const gruppe = knopf.closest(".reiter");
    $$(".js-reiter", gruppe).forEach((b) => b.setAttribute("aria-selected", String(b === knopf)));
    $$(".reiter__panel").forEach((p) => { p.hidden = p.dataset.ziel !== knopf.dataset.ziel; });
    if (fokus) knopf.focus();
  }
  $$(".js-reiter").forEach((b, i, alle) => {
    b.addEventListener("click", () => waehleReiter(b, false));
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const n = alle[(i + (e.key === "ArrowRight" ? 1 : alle.length - 1)) % alle.length];
        waehleReiter(n, true);
      }
    });
  });
  // Sprung zu einem Kanal (#anker) öffnet den passenden Reiter
  function oeffneAnker() {
    const ziel = location.hash && document.getElementById(location.hash.slice(1));
    const panel = ziel && ziel.closest(".reiter__panel");
    if (panel) { const k = $(`.js-reiter[data-ziel="${panel.dataset.ziel}"]`); if (k) waehleReiter(k, false); ziel.scrollIntoView(); }
  }
  const gespeichert = lies("sv-institut");
  if (gespeichert) setzeInstitut(gespeichert, false);
  oeffneAnker();
  window.addEventListener("hashchange", oeffneAnker);

  // ── Mega-Menü & mobile Navigation ───────────────────────
  const menues = $$(".js-menue");
  const schliesseMenues = (ausser) => menues.forEach((m) => { if (m !== ausser) m.setAttribute("aria-expanded", "false"); });
  menues.forEach((m) => m.addEventListener("click", (e) => {
    e.stopPropagation();
    const offen = m.getAttribute("aria-expanded") === "true";
    schliesseMenues(m); m.setAttribute("aria-expanded", String(!offen));
  }));
  document.addEventListener("click", (e) => { if (!e.target.closest(".nav")) schliesseMenues(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { schliesseMenues(); schliesseSuche(); } });
  const toggle = $(".menu-toggle"), nav = $("#hauptnav");
  if (toggle && nav) toggle.addEventListener("click", () => {
    const offen = nav.classList.toggle("offen"); toggle.setAttribute("aria-expanded", String(offen));
  });

  // ── Link kopieren ───────────────────────────────────────
  document.addEventListener("click", async (e) => {
    const b = e.target.closest(".js-kopieren"); if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.url); toast("Link kopiert – zum Weiterleiten an Kolleginnen und Kollegen"); }
    catch (err) { toast("Kopieren nicht möglich – Link: " + b.dataset.url); }
  });

  // ── Nächste Termine (Startseite) ────────────────────────
  const liste = $(".js-termine");
  if (liste) {
    const kommend = $$(".termin", liste)
      .map((li) => ({ li, d: deDatum(li.dataset.datum) }))
      .filter((x) => x.d && x.d >= heute)
      .sort((a, b) => a.d - b.d).slice(0, 5);
    kommend.forEach(({ li, d }, i) => {
      li.hidden = false; liste.appendChild(li);
      const n = Math.round((d - heute) / TAG);
      $(".js-in", li).textContent = n === 0 ? "heute" : n === 1 ? "morgen" : `in ${n} Tagen`;
      if (i === 0) li.classList.add("termin--naechster");
    });
  }
  // Aktueller Sparmonat in der Termin-Tabelle
  $$(".js-termintabelle tbody tr").forEach((tr) => {
    const b = deDatum(tr.dataset.beginn), e = deDatum(tr.dataset.ende);
    if (b && e && heute >= b && heute <= e) { tr.classList.add("aktuell"); const c = $(".js-aktuell", tr); if (c) c.hidden = false; }
  });

  // ── Suche ───────────────────────────────────────────────
  const suche = $("#suche"), eingabe = $("#suche-eingabe"), treffer = $("#suche-treffer");
  let index = [];
  try { index = JSON.parse($("#suchindex").textContent); } catch (e) {}
  const norm = (s) => String(s || "").toLowerCase().replace(/×/g, "x").normalize("NFD").replace(/[̀-ͯ]/g, "");
  index.forEach((e) => { e._n = norm([e.t, e.s, e.k, e.a].join(" ")); });
  const pfad = (u) => /^https?:/.test(u) ? u : mitIndex(basis + u.replace(/^\//, ""));
  function oeffneSuche() { if (!suche) return; suche.hidden = false; document.body.classList.add("suche-offen"); eingabe.focus(); eingabe.select(); zeige(); }
  function schliesseSuche() { if (!suche || suche.hidden) return; suche.hidden = true; document.body.classList.remove("suche-offen"); }
  // Aktionen & Seiten zuerst, dann Dateien des eigenen Instituts
  function rang(e) {
    const inst = document.documentElement.dataset.institut;
    const eigen = inst && e.s.toLowerCase().includes(inst === "sparkassen" ? "sparkassen" : "volksbanken");
    const fremd = inst && e.s.toLowerCase().includes(inst === "sparkassen" ? "volksbanken" : "sparkassen");
    return e.a === "Aktion" ? 0 : e.a === "Seite" ? 1 : eigen ? 2 : fremd ? 4 : 3;
  }
  function zeige() {
    const q = norm(eingabe.value.trim());
    if (!q) { treffer.innerHTML = '<li class="suche__leer">Tippen Sie einen Begriff, ein Format (z. B. 1440x420) oder einen Kanal.</li>'; return; }
    const woerter = q.split(/\s+/);
    const res = index.filter((e) => woerter.every((w) => e._n.includes(w)))
      .sort((a, b) => rang(a) - rang(b))
      .slice(0, 40);
    treffer.innerHTML = res.length ? res.map((e) => `
      <li class="suche__eintrag">
        <a href="${pfad(e.u)}"><span class="suche__art">${e.a}</span><span><strong>${e.t}</strong><span>${e.s}${e.k ? " · " + e.k : ""}</span></span></a>
        ${e.d ? `<a class="btn btn--download btn--klein" href="${e.d}" aria-label="${e.t} herunterladen">Download</a>` : ""}
      </li>`).join("") : `<li class="suche__leer">Keine Treffer für „${eingabe.value}“. Fragen Sie uns gern: info@sparverein.de</li>`;
  }
  $$(".js-suche-auf").forEach((b) => b.addEventListener("click", oeffneSuche));
  $$(".js-suche-zu").forEach((b) => b.addEventListener("click", schliesseSuche));
  $$(".js-tipp").forEach((b) => b.addEventListener("click", () => { eingabe.value = b.textContent; zeige(); eingabe.focus(); }));
  if (eingabe) eingabe.addEventListener("input", zeige);
  if (suche) suche.addEventListener("click", (e) => { if (e.target === suche) schliesseSuche(); });
  if (treffer) treffer.addEventListener("click", (e) => { if (e.target.closest("a")) schliesseSuche(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); oeffneSuche(); }
  });
  // ── Großansicht für „So sieht's im Einsatz aus“ ─────────
  const kasten = $("#leuchtkasten");
  if (kasten) {
    const bilder = $$(".js-gross");
    const img = $("img", kasten), unter = $("figcaption", kasten);
    let akt = 0;
    const zeige = (n) => {
      akt = (n + bilder.length) % bilder.length;
      img.src = bilder[akt].getAttribute("href");
      img.alt = unter.textContent = `${bilder[akt].dataset.titel || "Beispiel"} (${akt + 1} von ${bilder.length})`;
    };
    bilder.forEach((a, n) => a.addEventListener("click", (e) => { e.preventDefault(); zeige(n); kasten.showModal(); }));
    $(".leuchtkasten__zu", kasten).addEventListener("click", () => kasten.close());
    $(".leuchtkasten__pfeil--vor", kasten).addEventListener("click", () => zeige(akt + 1));
    $(".leuchtkasten__pfeil--zurueck", kasten).addEventListener("click", () => zeige(akt - 1));
    kasten.addEventListener("click", (e) => { if (e.target === kasten) kasten.close(); });
    kasten.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") zeige(akt + 1);
      if (e.key === "ArrowLeft") zeige(akt - 1);
    });
  }
})();
