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
| `<ab-karo>` | `verhaeltnis="2"`, `kaestchen="40"` | Karofeld / Diagramm |
| `<ab-linien>` | `verhaeltnis="3"`, `abstand="55"` | Schreiblinien |
| `<ab-streifen>` | `teile="4"`, `balken="2"`, `karo="nein"`, `verhaeltnis="2.3"` | Balkenmodelle: leere, geteilte Streifen (Beschriften/Ausmalen von Hand) + Karofeld daneben |
| `<ab-merksatz>` | – | hervorgehobener Merksatz |
| `<ab-text>` | – | Fließtext |
| `<ab-simulation>` | `url`, `titel` | Reiter in der Randspalte |

Für alle Bausteine: `titel`, `phase="1 2"` (in welchen Unterrichtsphasen sichtbar; ohne = immer),
`druckbreite="150mm"`, `druck-titel="nein"`, `nur="tafel"` bzw. `nur="druck"`, `id` (fester Name der Schreibfläche).
Randnotizen sind standardmäßig zu (Knopf „Notizen“ in der Leiste) und liegen aufgeklappt über dem Blatt – das Blatt verschiebt sich nie. Die Leiste hat zwei Zeilen. Textblöcke haben in jeder Phase dieselbe Breite (kein Springen); nur Schreibflächen werden in die Resthöhe eingepasst.
Zusätzlich: `gross` (größere Schrift bei `ab-text`/`ab-merksatz` in der Tafelansicht); am `<ab-blatt>`: `oben` (Bausteine oben statt mittig – Text springt beim Phasenwechsel nicht). Farben im Text: `class="z"` (Zähler, grün), `n` (Nenner, blau), `w` (Wert, rot).
`verhaeltnis` = Breite : Höhe. Brüche: `<span class="bruch"><span>F</span><span>q</span></span>`.

**Wichtig:** Wird ein Baustein umbenannt, geht die gespeicherte Handschrift darauf verloren,
weil die Schreibfläche am Titel erkannt wird. Wer das vermeiden will, vergibt ein festes `id`.

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
