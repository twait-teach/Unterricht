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
| `<ab-merksatz>` | – | hervorgehobener Merksatz |
| `<ab-text>` | – | Fließtext |
| `<ab-simulation>` | `url`, `titel` | Reiter in der Randspalte |

Für alle Bausteine: `titel`, `phase="1 2"` (in welchen Unterrichtsphasen sichtbar; ohne = immer),
`druckbreite="150mm"`, `druck-titel="nein"`, `nur="tafel"` bzw. `nur="druck"`, `id` (fester Name der Schreibfläche).
`verhaeltnis` = Breite : Höhe. Brüche: `<span class="bruch"><span>F</span><span>q</span></span>`.

**Wichtig:** Wird ein Baustein umbenannt, geht die gespeicherte Handschrift darauf verloren,
weil die Schreibfläche am Titel erkannt wird. Wer das vermeiden will, vergibt ein festes `id`.

## Arbeiten mit Claude

Für eine Änderung nur die betroffene Datei hochladen bzw. nennen, z. B.:
„Hier ist `physik/klasse-9/02-mechanische-energie/kapitel.js` – ergänze das Arbeitsblatt X.“
Neues Tafelbild: Bilder + Überschriften + Stichpunkte liefern, Claude schreibt nur die Tafelbild-Datei.
Den Ordner `kern/` bei Inhaltsänderungen nicht mitschicken.
