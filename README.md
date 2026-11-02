# Marketingportal Sparverein Saarland

Statische Website (Eleventy) mit Redaktionsoberfläche (Decap CMS) als Nachfolger des Synergy-CMS auf marketing.sparverein.de.

- **Keine Datenbank, kein PHP:** Die Website besteht aus fertigen HTML-Dateien und läuft auf jedem Webserver.
- **Pflege im Browser** unter `/admin/`. Jede Änderung wird als Commit im Git-Repository gespeichert und löst automatisch einen neuen Build aus.
- **Design** nach dem Sparverein Corporate Design (Farben, PT Sans, offizielles Logo). Die Schriften liegen lokal. Einzige externe Verbindung: das Anmelde-Skript von Netlify im Redaktionsbereich `/admin/`.

## Wo läuft was?

| | |
|---|---|
| Code | GitHub: `fbeck-sparverein/marketingportal` (öffentlich), Branch `main` |
| Testseite | https://sparverein-marketingportal.netlify.app (zurzeit nur mit Netlify-Team-Login) |
| Redaktion | https://sparverein-marketingportal.netlify.app/admin/ (Netlify Identity, nur auf Einladung) |

Jeder Commit auf `main`, auch aus der Redaktion, baut die Seite bei Netlify in ein bis zwei Minuten neu. Die Build-Einstellungen stehen in `netlify.toml`. Testadressen sind für Suchmaschinen gesperrt (noindex), nur die echte Domain wird später indexiert.

**Redakteure einladen:** Netlify → Projekt → Identity → „Invite users“. Sie klicken den Link in der Einladung, legen ein Passwort fest und landen unter `/admin/`. Ein GitHub-Konto brauchen sie nicht. Solange der Team-Login aktiv ist, kommen sie allerdings nur mit Netlify-Konto auf die Seite.

**Git Gateway** (Verbindung Redaktion → GitHub) ist bei Netlify als veraltet markiert, läuft aber weiter. Falls es abgeschaltet wird: siehe „Alternativen zu Netlify“.

### Noch offen für den Livegang

- **Zugang für die Banken:** Team-Login ersetzen, z. B. durch ein gemeinsames Passwort (Netlify Pro).
- **Domain umstellen (einmalig, durch den DNS-Verwalter):** In Netlify unter Domain-Verwaltung `marketing.sparverein.de` hinzufügen. Netlify zeigt den nötigen DNS-Eintrag (CNAME auf `sparverein-marketingportal.netlify.app`). Das SSL-Zertifikat erstellt Netlify automatisch. Danach `site_url`/`display_url` in `src/admin/config.yml` anpassen.
- **Datenschutz:** Auftragsverarbeitungsvertrag mit Netlify (US-Anbieter) mit dem Datenschutzbeauftragten klären, Datenschutzerklärung ergänzen.
- **Restliche Dateien übernehmen:** Siehe „Dateien aus dem alten Portal übernehmen“.

## Lokal starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm start          # Website mit Live-Reload auf http://localhost:8080
npm run cms        # zweites Terminal: lokaler CMS-Server (Port 8081)
```

Danach `http://localhost:8080/admin/` öffnen und auf „Login“ klicken. Im lokalen Modus ist kein Konto nötig, Änderungen landen direkt in den Dateien unter `src/`.

`npm run build` erzeugt die fertige Website im Ordner `_site/`.

## Aufbau

Die Navigation folgt dem alten Portal, ist aber nach Aufgaben sortiert: **Aktionen · Online-Formate · Werbemittel · Vertrieb · Termine & Gewinne · Service**. Jeder Hauptpunkt öffnet ein Mega-Menü mit seinen Unterseiten.

| Bereich in der Redaktion | Datei(en) | Erscheint auf |
|---|---|---|
| Aktionen | `src/kampagnen/*.md` | Startseite („Was läuft gerade?“), /aktionen/, /aktionen/<name>/ |
| Online-Formate | `src/formate/*.md` (ein Formatpaket je Kanal und Aktion) | Aktionsseite (Reiter je Zielgruppe), /formate/sparkassen/ usw. |
| Werbemittel, Vertrieb & Service | `src/bereiche/<gruppe>-<name>.md` | /werbemittel/…, /vertrieb/…, /service/… |
| Neu im Portal | `src/neuigkeiten/*.md` | Startseite |
| Termine / Gewinnplan | `src/_data/termine.json`, `gewinne.json` | Startseite (nächste Termine), /termine-gewinne/ |
| Schnellzugriff | `src/_data/schnellzugriff.json` | Startseite |
| Kontakt & Pflichtangaben | `src/_data/site.json` | Fußbereich, /kontakt/ |
| Menü | `src/_data/navigation.json` | Kopfbereich |

**Aktionsstatus automatisch:** Aus Start- und Enddatum berechnet die Seite selbst, ob eine Aktion „läuft“, „bald startet“ oder „beendet“ ist, inklusive Countdown. Niemand muss einen Schalter umlegen.

**Komfort für Vertriebler:** globale Suche (Taste „/“) über Aktionen, Seiten und alle Dateien mit direktem Download; Umschalter „Sparkasse/Volksbank“ (merkt sich die Wahl und zeigt passende Formate zuerst); Link kopieren je Datei.

**Dateien liegen im CMS:** Hochgeladene Dateien landen in `src/assets/uploads/<bereich>/` (kampagnen, formate, bereiche) und werden mit der Website ausgeliefert. Beim Bauen ermittelt die Seite Dateityp, Dateigröße und bei Bildern die Pixelmaße automatisch. Bilder dienen gleichzeitig als Vorschaubild. Ein externer Link ist nur noch als Ausnahme vorgesehen (z. B. sehr große Videos). Die Felder der Redaktionsoberfläche stehen in `src/admin/config.yml`.

## Dateien aus dem alten Portal übernehmen (einmalig)

Die Inhalte verweisen noch auf marketing.sparverein.de bzw. die Nextcloud (rund 175 Dateien, ca. 170 MB). Das Skript lädt sie herunter, legt sie im CMS ab und stellt die Einträge um:

```bash
npm run dateien            # Probelauf: zeigt, was übernommen würde
npm run dateien -- --los   # übernimmt wirklich
```

Alternativ einen heruntergeladenen und entpackten Nextcloud-Ordner verwenden: `npm run dateien -- --los --aus <ordner>` (mit `--nur-lokal` wird nichts aus dem Internet geladen).

Es muss auf einem Rechner laufen, der beide Server erreicht (z. B. im Büronetz). Danach mit `npm run build` prüfen und das Ergebnis committen. Fehlgeschlagene Downloads werden aufgelistet und behalten ihren alten Link.

## Typische Redaktionsaufgaben

- **Neue Aktion:** Unter „Aktionen“ anlegen, Bilder hochladen, Start- und Enddatum setzen, Highlights und Steckbrief eintragen. Die Startseite zeigt sie automatisch zum richtigen Zeitpunkt. Die rechte Vorschau zeigt die Karte so, wie sie auf der Startseite erscheint.
- **Formate zur Aktion:** Unter „Online-Formate“ ein „Formatpaket“ anlegen (Aktion, Zielgruppe, Kanal) und die Dateien hinzufügen. Die Liste lässt sich nach Aktion gruppieren und nach Zielgruppe filtern.
- **Werbemittel/Service-Seite pflegen:** Unter „Werbemittel, Vertrieb & Service“ die Seite öffnen, Text, Hinweis und Dateien ändern.
- **Termine:** Unter „Termine, Gewinne & Kontakt“ → „Termine“ einen Sparmonat hinzufügen.

## Redaktionsregeln (im CMS hinterlegt)

- **Aktionen:** genau drei Highlights; Titelbild ist Pflicht (Format 1453×640 px, wie der „Header Marketingportal“).
- **Freigabe-Workflow:** Gespeicherte Änderungen landen unter „Arbeitsablauf“ (Entwurf → Zur Prüfung → Bereit) und erscheinen auf GitHub als Pull Request. Erst „Veröffentlichen“ bringt sie online. Jede Änderung ist in Git gespeichert und kann zurückgeholt werden. Lokal (`npm run cms`) gibt es keinen Workflow, dort wird direkt gespeichert.
- **Neu im Portal:** jeder Eintrag mit Datum; die neuesten stehen oben, das Etikett „Neu“ verschwindet nach 30 Tagen von selbst.
- **Dateien** werden hochgeladen; Typ, Größe, Maße und Vorschaubild ermittelt die Seite selbst.

## Alternativen zu Netlify

- **Cloudflare Pages / eigener Webserver:** möglich (Build: `npm run build`, Ordner `_site`). Für die Anmeldung im CMS wird dann statt Netlify Identity ein Dienst wie DecapBridge oder ein eigener OAuth-Proxy benötigt; `backend` in `src/admin/config.yml` entsprechend anpassen.

## Offene Punkte

- **Dateiübernahme:** Die drei Aktionen (Weihnachtsauslosung, Q4, Geschenk-Lose) liegen vollständig im CMS. Werbemittel, Vertrieb und Service verweisen noch auf das alte Portal → Übernahme-Skript ausführen.
- **Fehlt noch:** Flyer & Plakat zur Weihnachtsauslosung, Dateien für „Promomaterialien“, Mockups zu Geschenk-Lose mit neuem Logo.
- **Gewinnplan prüfen:** Das alte Portal nennt „Opel Corsa Mokka“, hier steht „Opel Mokka“. Die drei Zeilen à 6.300 × 5 EUR sind zu 18.900 × 5 EUR zusammengefasst.
- **CD-Frage:** Weißes Logo auf dunkelblauem Fußbereich – laut CD-Auszug ist die weiße Version für Orange und Bilder vorgesehen.
- **Vorschaubilder:** entstehen automatisch für JPG, PNG, GIF und WEBP. BMP, PCX und PDF zeigen einen Platzhalter mit dem Seitenverhältnis.
- **Optional später:** Brevo-Anmeldung „Updates per E-Mail“ mit RSS-Feed aus „Neu im Portal“.
