# Bauplan Unterrichtsportal (Mathematik und Physik)

Grundsatz: **Gerüst und Inhalt sind getrennt.** Wer etwas ändert, fasst nur die eine Datei an, um die es geht.

## Ordner

```
index.html                  Startseite – reines Gerüst, keine Inhalte
faecher.js                  welche Fächer und Klassen es gibt (Knöpfe oben)
kern/                       Motor – wird nur bei Änderungen am Verhalten/Design angefasst
  portal.css / portal.js    Übersicht (Klassen, Kapitelbaum, Materiallisten)
  seite.css  / seite.js     einfache Textseiten
  tafel.css  / tafel.js     Tafelbild-Motor (Tafel- und Druckansicht, Stift, Speichern)
mathematik/
  klasse-6/inhalt.js        Inhaltsverzeichnis Mathematik 6 (nur Kapitel, ohne Teile)
  klasse-8/inhalt.js        Inhaltsverzeichnis Mathematik 8
physik/
  klasse-9/inhalt.js        Inhaltsverzeichnis Klasse 9 (Teile, Kapitel)
  klasse-9/01-energie/      alles zu Kapitel 9/1
    kapitel.js              Materialliste des Kapitels
    *.html, *.pptx, *.docx, Bilder
```

## Was ändere ich wo?

| Vorhaben | Datei |
|---|---|
| neue Klasse | `faecher.js` + neuer Ordner mit `inhalt.js` (z. B. `mathematik/klasse-7/`) |
| neues Fach | `faecher.js` (neuer Eintrag) + neuer Fachordner |
| Kapitel bekommt erstmals Material | in `inhalt.js` beim Kapitel `ordner: '02-…'` ergänzen, Ordner mit `kapitel.js` anlegen |
| Material hinzufügen/umbenennen | nur `kapitel.js` des Kapitels (+ Datei in den Ordner legen) |
| Tafelbild ändern | nur die HTML-Datei dieses Tafelbilds |
| Farben, Schrift, Werkzeugleiste | `kern/…` – wirkt überall |

## Fächer und Klassen (faecher.js)

```js
{ name: 'Mathematik', klassen: [
  { id: 'm6', name: '6', ordner: 'mathematik/klasse-6' },
]},
```
Die `id` steht in der Adresse (`index.html#m6/3` = Mathematik 6, Kapitel 3) und muss über alle Fächer
eindeutig sein: `m…` für Mathematik, `ph…` für Physik. Eine Klasse, die man nicht mehr unterrichtet,
nimmt man nur aus `faecher.js` heraus – ihr Ordner bleibt erhalten.

## Inhaltsverzeichnis (inhalt.js)

Mit Teilen (Physik, Teile A, B, C …):
```js
Portal.klasse({ teile: [ { id: 'A', name: '…', themen: [ { nr: 1, name: 'Energie', ordner: '01-energie' } ] } ] });
```
Ohne Teile (Mathematik, nur Kapitel):
```js
Portal.klasse({ themen: [ { nr: 1, name: 'Brüche', ordner: '01-brueche' } ] });
```
Unterkapitel (1.1, 1.2 …) sind die Abschnitte in `kapitel.js`.

## Material-Einträge (kapitel.js)

```js
{ titel: 'Die elektrische Feldstärke', rolle: 'hefteintrag', typ: 'tafelbild', datei: 'feldstaerke.html' }
{ titel: 'Folien', rolle: 'hefteintrag', datei: 'Folien.pptx' }        // Typ aus Endung
{ titel: 'LEIFI: Energieumwandlungen', rolle: 'vertiefung', url: 'https://…' }
{ titel: 'Arbeitsblatt 2', rolle: 'uebung' }                            // ohne Datei → „folgt“
```
Rollen: `hefteintrag`, `einstieg`, `uebung`, `vertiefung`, `loesung`, `sonstiges`.

## Tafelbild-Bausteine

Ein Tafelbild ist eine HTML-Datei mit dem Rahmen aus `physik/_beispiele/elektrische-feldstaerke/index.html`.
Pfade `../../../kern/…` ggf. an die Ordnertiefe anpassen.

| Baustein | Wichtige Attribute | Zweck |
|---|---|---|
| `<ab-blatt>` | `titel`, `kapitel`, `phasen="A\|B\|C"`, `fuss` | Rahmen |
| `<ab-versuch>` | `bild`, `bildbreite="48%"`, `verhaeltnis="2.8"` | Bild links, Text (Inhalt) rechts |
| `<ab-bild>` | `bild`, `alt` | Abbildung zum Beschriften |
| `<ab-tabelle>` | `spalten="4"`, darin `<ab-zeile>…</ab-zeile>` | Wertetabelle |
| `<ab-karo>` | `zeilen="8"` (Mindesthöhe in Kästchen), `zeilen-druck="10"` | Karofeld (Heft-Karo, 5 mm im Druck) |
| `<ab-linien>` | `verhaeltnis="3"`, `abstand="55"` | Schreiblinien |
| `<ab-streifen>` | `teile="4"`, `balken="2"` | Balkenmodelle auf dem Karoraster: leere, geteilte Streifen links, Karo für Rechnungen rechts |
| `<ab-merksatz>` | – | hervorgehobener Merksatz |
| `<ab-text>` | – | Fließtext |
| `<ab-simulation>` | `url`, `titel` | Reiter in der Randspalte |

Für alle Bausteine: `titel`, `phase="1 2"` (in welchen Unterrichtsphasen sichtbar; ohne = immer),
`druckbreite="150mm"`, `druck-titel="nein"`, `nur="tafel"` bzw. `nur="druck"`, `id` (fester Name der Schreibfläche).
Randnotizen sind standardmäßig zu (Knopf „Notizen“ in der Leiste) und liegen aufgeklappt über dem Blatt – das Blatt verschiebt sich nie. Die Leiste hat zwei Zeilen. Textblöcke haben in jeder Phase dieselbe Breite (kein Springen); nur Schreibflächen werden in die Resthöhe eingepasst.
Zusätzlich: `tafel-titel="nein"` (Titel nur im Druck); `oben` am `<ab-blatt>` ist überflüssig (alles steht immer oben). Bild-/Tabellen-/Versuchsblöcke: `breite="60"` (in % der Blattbreite; Handschrift skaliert mit) macht sie kleiner und spart Höhe, sodass die Kästchen größer werden. Am `<ab-blatt>`: `titel-aus="3"` blendet die Blattüberschrift ab Phase 3 aus (nur Tafelansicht); der Platz kommt dem Inhalt zugute und die Kästchen können größer werden. Farben im Text: `class="rot"`, `blau`, `gruen` (wie die Stiftfarben). Was eine Farbe bedeutet (z. B. Zähler grün), entscheidet das jeweilige Blatt bzw. der Skill – nicht die Engine. Textstil `stil="loesung"` (gepunkteter Rand links) für Lösungstext.
`verhaeltnis` = Breite : Höhe (nur noch für Bilder/Versuch/Tabelle; Karo und Streifen rechnen in Kästchen). Brüche: `<span class="bruch"><span>F</span><span>q</span></span>`.

**Wichtig:** Wird ein Baustein umbenannt, geht die gespeicherte Handschrift darauf verloren,
weil die Schreibfläche am Titel erkannt wird. Wer das vermeiden will, vergibt ein festes `id`.

## Kästchen, Schrift, Layout (Regeln der Engine)

- **Ein Kästchenmaß pro Blatt:** Jede Karo-/Streifenfläche ist 35 Kästchen breit (Druck: 175 mm = 5 mm je Kästchen) und immer eine ganze Zahl Zeilen hoch.
  Die Kästchengröße (ganze Pixel) ist in allen Phasen und Blöcken gleich; sie wird so gewählt, dass die höchste Phase noch ohne Scrollen passt.
  Restplatz der aktuellen Phase geht als zusätzliche Zeilen an die letzte Karofläche. `zeilen` ist die **Mindesthöhe**. Dünne, einheitliche Linien – keine Verstärkung alle 5 Kästchen.
- **Feste Folie:** Die Tafelansicht ist eine feste Folie von 1600 × 900 Einheiten (16:9), die als Ganzes auf den Bildschirm skaliert wird (oben links, Überschrift gehört dazu). Dadurch ist die Anordnung auf Surface, ThinkPad und Desktop identisch und entspricht Druck und Musterlösung. Übrig bleibt freier Platz rechts/unten (Surface im Vollbild: fast keiner; Fenster mit Browserleiste ca. 13 % frei rechts). Empfehlung: Surface im Vollbild (Knopf „Vollbild“). Die Werkzeugleiste zeigt einen Stempel (Motor-Version, Fenstergröße, Skalierung) zur Fehlersuche.
- **Schrift:** Basisgröße `--s` = 44 Folienpixel; Zwischentitel = 1,15 · `--s`, Blattüberschrift = 1,45 · `--s`. Nie einzeln festlegen.
- **Breite:** Textblöcke immer volle Breite (keine feste Höchstbreite); Schreibflächen so breit wie das Raster. Brüche im Fließtext werden verkleinert (`.textblock .bruch`).
- **Handschrift-Koordinaten** hängen an der Breite (1000 Einheiten); Höhenänderungen verschieben nichts. Beim Ändern von Mindesthöhen darauf achten, dass alte Musterlösungen nicht abgeschnitten werden (Feldstärke-Diagramm: mindestens 15 Zeilen).
- **Prüfen vor dem Abgeben:** `python werkzeuge/tafel-pruefen.py <blatt.html> [--bilder]` (Playwright/Chromium nötig) misst je Bildschirmgröße (u. a. Surface Pro 7: 1368×912 und 1368×760) und Phase: kein Scrollen, Überschrift größer als Text, gleich große ganze Kästchen, Druck = eine A4-Seite.

## Leeres Blatt und Musterlösung

Ein Tafelbild startet **immer leer**. Was im Unterricht geschrieben wird, bleibt nur so lange erhalten, wie der Tab offen ist
(ein versehentliches Neuladen überlebt es, ein neuer Tab beginnt leer).

- **Knopf „Als Musterlösung sichern“** (Werkzeugleiste): schreibt die aktuelle Handschrift in die Datei `<blattname>.loesung.js` neben dem Blatt
  (z. B. `feldstaerke.loesung.js`). Auf der veröffentlichten Seite (GitHub Pages) geht das direkt ins Repository, also auch vom Tablet aus;
  nach etwa einer Minute ist sie überall sichtbar. Die vorhandene Musterlösung wird dabei überschrieben (bleibt in der Git-Historie erhalten).
  Auf dem PC vor dem nächsten Push **`git pull`** nicht vergessen, sonst lehnt Git den Push ab.
  - *Einmalig am Tablet:* GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → neues Token:
    Repository access „Only select repositories“ → `unterricht`; Berechtigung Repository permissions → **Contents: Read and write**; Ablaufdatum wählen.
    Beim ersten Sichern fragt die Seite nach dem Token und merkt ihn sich nur in diesem Browser. Tablet verloren oder Token abgelaufen: Token bei GitHub löschen bzw. neu erzeugen.
  - *Fällt das Speichern aus* (kein Netz, Token ungültig), lädt die Seite die Datei als Sicherung herunter – es geht nichts verloren.
  - *Lokal oder eigene Domain:* ohne GitHub-Pages-Adresse öffnet Chrome/Edge einen Speicherdialog (Datei in den Blatt-Ordner legen). Bei eigener Domain
    im Blatt vor dem Motor `window.TAFEL_GITHUB = { owner: '…', repo: '…' }` setzen.
- **Knopf „Musterlösung“** blendet die gesicherte Lösung ein und aus (ausgegraut, solange es keine gibt).
  Direktlink: `feldstaerke.html?loesung` – als Eintrag in `kapitel.js`: `{ titel: '… Musterlösung', rolle: 'loesung', typ: 'tafelbild', datei: 'feldstaerke.html?loesung' }`.
- **Drucken** druckt, was gerade sichtbar ist – mit eingeblendeter Musterlösung also die Musterlösung.
- Ein leeres Blatt kann nicht als Musterlösung gesichert werden (Schutz vor versehentlichem Überschreiben).

## Zugang (Benutzername + Passwort)

Jede Seite lädt zuerst `kern/zugang.js` und zeigt bis zur Anmeldung nur ein Anmeldefenster (Browser-Passwortmanager funktionieren).
Der Motor (`tafel.js`, `seite.js`, `portal.js`) lädt `zugang.js` selbst nach, falls eine neue Seite die Zeile vergessen hat.

- **Einrichten/ändern:** `kern/zugang-einrichten.html` öffnen (nach Anmeldung), Benutzername und Passwort wählen, die erzeugte Datei `zugang-daten.js`
  in `kern/` legen, committen, pushen. Die Datei enthält nur Prüfwerte, nie Passwörter. **Ohne diese Datei ist die Seite offen.**
- **Mehrere Zugänge:** Ein neuer Zugang wird zu den bestehenden hinzugefügt (Häkchen „ersetzen“ überschreibt alle). Jeder Eintrag `{"n":"Name","h":"Prüfwert"}` lässt sich in `zugang-daten.js` löschen – dann ist dieser Zugang nach dem Push gesperrt, auch wenn das Gerät „angemeldet bleiben“ hatte.
  Das Sichern der Musterlösung braucht zusätzlich einen GitHub-Token; ohne ihn kann eine Testperson nichts im Repository ändern.
- **Angemeldet bleiben:** Häkchen im Anmeldefenster (Standard: an). Auf fremden Rechnern abwählen oder danach eine beliebige Seite mit `?abmelden` öffnen (entfernt auch den gespeicherten GitHub-Token).
- **Grenze:** Das ist ein Sichtschutz im Browser, kein Serverschutz. Wer die Dateien direkt abruft (z. B. im öffentlichen Repository), sieht sie trotzdem –
  auch die Schulbuch-Bilder. Für echten Schutz braucht es einen Server mit Anmeldung (z. B. Cloudflare Access) oder ein privates Hosting.
- Neue Seite: im `<head>` direkt nach dem viewport-Meta `<script src="…/kern/zugang.js"></script>` einfügen (Pfad je nach Ordnertiefe).

## Arbeiten mit Claude

Für eine Änderung nur die betroffene Datei hochladen bzw. nennen, z. B.:
„Hier ist `physik/klasse-9/02-mechanische-energie/kapitel.js` – ergänze das Arbeitsblatt X.“
Neues Tafelbild: Bilder + Überschriften + Stichpunkte liefern, Claude schreibt nur die Tafelbild-Datei.
Den Ordner `kern/` bei Inhaltsänderungen nicht mitschicken.

## GeoGebra-Dateien
- **Immer mit der Classic-App bauen** (mächtigste Web-App); der Grafikrechner kennt z. B. keine Vielecke/Strecken und lehnt solche Dateien ab.
- Einbinden ins Blatt: `<ab-geogebra datei="name.ggb" phase="1" nur="tafel" breite="1500" hoehe="520">` (Größe in Folienpixeln). Die Datei wird beim ersten Anzeigen der Phase von geogebra.org geladen (Internet nötig; sonst Link zur Datei). Für die Größe 1500 × 520 bauen (`werkzeuge/geogebra/app.html`).
- Werkzeug und Beispiel: `werkzeuge/geogebra/` (Befehlsdatei + `bauen.py`, baut per GeoGebra-Web-App in Chromium, speichert Screenshots und die `.ggb`).
- Schrittweises Einblenden: Kontrollkästchen (`Checkbox`) + `SetConditionToShowObject`; beim Speichern alle auf „aus“.
- **Texte nicht mit `Text(...)` erzeugen**, sondern als freie Texte (`t="..."`) mit LaTeX-Schalter – sonst geht LaTeX nach dem Speichern verloren.
- **Immer die gespeicherte Datei neu laden und dann prüfen**, nicht nur den Zustand direkt nach dem Bauen.

## Musterlösungen bei Änderungen
- Wird ein Blatt geändert, wird seine Musterlösung **gelöscht** (`<blatt>.loesung.js` durch eine leere Datei ersetzen), nie angepasst oder „gültig gehalten“. Der Lehrer schreibt sie danach neu und sichert sie.
- Karofeld mit GeoGebra daneben: `<ab-karo geogebra="datei.ggb" spalten-tafel="16" hoehe="470" zeilen="10" zeilen-druck="12">` – links GeoGebra, rechts Karo (16 Kästchen breit); im Druck nur das Karo in voller Breite. GeoGebra-Datei für 832 × 470 bauen.
