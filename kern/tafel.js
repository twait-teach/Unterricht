/* Tafelbild-Motor.
   Ein Tafelbild ist eine kleine HTML-Datei mit Bausteinen (siehe BAUPLAN.md):
     <ab-blatt titel="…" kapitel="…" phasen="Versuch|Messung|Auswertung">
       <ab-versuch phase="1" titel="…" bild="…">Idee …</ab-versuch> …
     </ab-blatt>
     <script src="../../../kern/tafel.js"></script>
   Dieser Motor baut daraus Werkzeugleiste, Tafelansicht, Druckansicht und Schreibflächen.
   Tafelbilder selbst enthalten nie Logik – Änderungen am Verhalten nur hier. */
'use strict';
{ if (!window.Zugang) { const z = document.createElement('script'); z.src = document.currentScript.src.replace(/[^/]*$/, 'zugang.js'); document.head.append(z); } } // Zugangsschutz sicherstellen
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const SKRIPT_V = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [0, ''])[1];   // Versionsnummer aus dem Script-Link; hängt sich an die GeoGebra-Datei, damit der Browser sie nicht veraltet aus dem Cache nimmt
  const MOTOR = 'Motor 26.09.-16 (Stift+)';   // Versionsstempel: in der Leiste sichtbar, damit klar ist, welche Datei der Browser lädt
  const FB = 1600, FH = 900;   // feste Folie (16:9) in logischen Pixeln; wird als Ganzes auf den Bildschirm skaliert
  const SPALTEN = 35;   // Kästchen je Blattbreite (im Druck 5 mm); alle Karo-Flächen eines Blatts haben dieselbe Kästchengröße
  const FARBEN = [['#174fa1', 'Blau'], ['#20773b', 'Grün'], ['#c32e2e', 'Rot'], ['#171717', 'Schwarz']];
  const src = document.currentScript.getAttribute('src');
  const wurzel = src.slice(0, src.lastIndexOf('kern/'));
  const blatt = document.querySelector('ab-blatt');
  if (!blatt) return;

  // ---------- kleine Helfer ----------
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const knopf = (text, titel, cls) => { const b = el('button', cls, text); b.type = 'button'; if (titel) b.title = titel; return b; };
  const zahl = (wert, standard) => { const z = parseFloat(String(wert ?? '').replace(',', '.')); return Number.isFinite(z) && z > 0 ? z : standard; };
  const kennung = t => (t || '').toLowerCase().replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c])).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // ---------- Bausteine ----------
  // Jeder Baustein liefert ein Panel. Schreibbare Bausteine haben eine "Fläche" mit festem
  // Seitenverhältnis (Breite : Höhe); darauf liegt die Stiftebene.
  const flaechen = [];
  let zaehler = 0;

  function neueFlaeche(quelle, verhaeltnis) {
    const f = { id: quelle.id || kennung(quelle.getAttribute('titel')) || 'flaeche-' + (++zaehler), el: el('div', 'flaeche') };
    f.svg = document.createElementNS(NS, 'svg');
    f.svg.classList.add('tinte');
    f.el.append(f.svg);
    setzeVerhaeltnis(f, verhaeltnis);
    flaechen.push(f);
    return f;
  }
  function setzeVerhaeltnis(f, v) {
    f.verhaeltnis = v;
    f.einheiten = f.einheiten || 1000;   // Koordinatenbreite: 1000, bei Karoflächen Spalten · Kästchenmaß
    f.hoehe = f.einheiten / v;
    f.el.style.setProperty('--v', v);
    f.svg.setAttribute('viewBox', '0 0 ' + f.einheiten + ' ' + f.hoehe);
  }

  // Karofläche auf sp Spalten × z Zeilen setzen. Handschrift-Koordinaten zählen ab links oben in Kästchen
  // (1 Kästchen = 1000/SPALTEN Einheiten): wird das Blatt breiter, kommen rechts Kästchen dazu, nichts verschiebt sich.
  function setzeZeilen(f, z, sp = f.spalten) {
    f.zeilen = z; f.spalten = sp; f.einheiten = sp * 1000 / SPALTEN;
    setzeVerhaeltnis(f, sp / z); f.zeichneRaster();
  }

  // Schreibfläche aus ganzen Kästchen: Breite = SPALTEN Kästchen, Höhe = ganze Zeilen. Das Gitter wird aus
  // f.zeilen gezeichnet und deshalb bei jeder Höhenänderung neu erzeugt. Kästchen bleiben so überall gleich groß.
  function rasterFlaeche(q, zeilen, inhalt) {
    const f = neueFlaeche(q, SPALTEN / zeilen);
    f.raster = true; f.min = zeilen; f.zeilen = zeilen; f.spalten = SPALTEN; f.einheiten = 1000;
    f.druckZeilen = Math.max(zeilen, Math.round(zahl(q.getAttribute('zeilen-druck'), zeilen)));
    const svg = document.createElementNS(NS, 'svg');
    svg.classList.add('raster');
    const u = 1000 / SPALTEN;   // Kästchen in Koordinateneinheiten
    // Gitter aus einfachen Linien (kein Muster, keine Sondereffekte – das lief nicht in jedem Browser)
    f.zeichneRaster = () => {
      const B = f.spalten * u, H = f.zeilen * u;
      let d = '';
      for (let i = 1; i < f.spalten; i++) d += `M${i * u} 0V${H}`;
      for (let j = 1; j < f.zeilen; j++) d += `M0 ${j * u}H${B}`;
      svg.setAttribute('viewBox', `0 0 ${B} ${H}`);
      svg.innerHTML = `<path d="${d}" fill="none" stroke="#b4c0cb" stroke-width="${u * .035}"/>${inhalt ? inhalt(u, H, f.spalten) : ''}
        <rect x="${u * .02}" y="${u * .02}" width="${B - u * .04}" height="${H - u * .04}" fill="none" stroke="#8e9ca9" stroke-width="${u * .05}"/>`;
    };
    f.zeichneRaster();
    f.el.prepend(svg);
    return f;
  }

  const BAUSTEINE = {
    versuch(q) {
      const f = neueFlaeche(q, zahl(q.getAttribute('verhaeltnis'), 2.8));
      const img = el('img', 'versuch-bild');
      img.src = q.getAttribute('bild'); img.alt = q.getAttribute('alt') || '';
      img.style.width = q.getAttribute('bildbreite') || '48%';
      const idee = el('div', 'versuch-text', q.innerHTML);
      f.el.prepend(img, idee);
      return f;
    },
    bild(q) {
      const f = neueFlaeche(q, zahl(q.getAttribute('verhaeltnis'), 3));
      const img = el('img', 'bild');
      img.alt = q.getAttribute('alt') || '';
      if (!q.hasAttribute('verhaeltnis')) img.onload = () => { setzeVerhaeltnis(f, img.naturalWidth / img.naturalHeight); zeichne(f); einpassen(); };
      img.src = q.getAttribute('bild');
      f.el.prepend(img);
      return f;
    },
    tabelle(q) {
      const zeilen = [...q.querySelectorAll('ab-zeile')];
      const spalten = Math.round(zahl(q.getAttribute('spalten'), 4));
      const f = neueFlaeche(q, zahl(q.getAttribute('verhaeltnis'), 15 / Math.max(zeilen.length, 1)));
      const tab = el('table', 'tabelle');
      for (const z of zeilen) {
        const tr = el('tr');
        tr.append(el('th', null, z.innerHTML));
        for (let i = 0; i < spalten; i++) tr.append(el('td'));
        tab.append(tr);
      }
      f.el.prepend(tab);
      return f;
    },
    // Karofeld: zeilen="8" (ganze Kästchenzeilen; mehr Platz wird automatisch dazugegeben), zeilen-druck="10".
    // Altes verhaeltnis="2.3" wird in Zeilen umgerechnet. Einheitlich dünne Linien wie im Heft.
    // Mit geogebra="datei.ggb": links GeoGebra, rechts das Karofeld (spalten-tafel="16" Kästchen breit); im Druck nur das Karofeld.
    karo(q) {
      const z = q.hasAttribute('zeilen') ? zahl(q.getAttribute('zeilen'), 8) : SPALTEN / zahl(q.getAttribute('verhaeltnis'), 2);
      const f = rasterFlaeche(q, Math.max(2, Math.round(z)));
      if (q.hasAttribute('geogebra')) {
        f.tafelSpalten = Math.min(SPALTEN - 8, Math.max(6, Math.round(zahl(q.getAttribute('spalten-tafel'), 16))));
        const g = ggbBox(q.getAttribute('geogebra'), null, zahl(q.getAttribute('hoehe'), 470));
        g.el.classList.add('nur-tafel');
        const reihe = el('div', 'reihe'); reihe.append(g.el, f.el);
        f.panelEl = reihe; f.start = g.start;
      }
      return f;
    },
    linien(q) {
      const f = neueFlaeche(q, zahl(q.getAttribute('verhaeltnis'), 3));
      const a = zahl(q.getAttribute('abstand'), 55);
      const svg = document.createElementNS(NS, 'svg');
      svg.classList.add('raster');
      svg.setAttribute('viewBox', '0 0 1000 ' + f.hoehe);
      let d = '';
      for (let y = a; y < f.hoehe - 5; y += a) d += `M0 ${y}H1000`;
      svg.innerHTML = `<path d="${d}" stroke="#9aa6b2" stroke-width="1.2"/>`;
      f.el.prepend(svg);
      return f;
    },
    // Balkenmodelle: leere, in gleiche Teile geteilte Streifen auf dem Kästchenraster; rechts davon Platz für Rechnungen
    // (dünne Trennlinie). <ab-streifen teile="4" balken="2"> – Beschriften und Ausmalen von Hand.
    streifen(q) {
      const teile = Math.max(1, Math.round(zahl(q.getAttribute('teile'), 4)));
      const balken = Math.max(1, Math.round(zahl(q.getAttribute('balken'), 2)));
      const links = 18, tw = Math.max(1, Math.floor((links - 2) / teile));   // Teilbreite in Kästchen
      return rasterFlaeche(q, 5 * balken + 2, (u, H) => {
        let s = '';
        const dick = u * .08;
        for (let b = 0; b < balken; b++) {
          const y = (2 + 5 * b) * u, h = 3 * u, x = u, w = tw * teile * u;
          s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="#222" stroke-width="${dick}"/>`;
          for (let i = 1; i < teile; i++) s += `<path d="M${x + i * tw * u} ${y}V${y + h}" stroke="#222" stroke-width="${dick}"/>`;
        }
        return s + `<path d="M${links * u} 0V${H}" stroke="#8e9ca9" stroke-width="${u * .06}"/>`;
      });
    },
    merksatz: q => ({ el: el('div', 'merksatz', q.innerHTML) }),
    text: q => ({ el: el('div', 'textblock' + (q.getAttribute('stil') === 'loesung' ? ' loesung' : ''), q.innerHTML) }),
    // GeoGebra-Datei (Classic) eingebettet; lädt erst, wenn die Phase sichtbar ist. Braucht Internet (geogebra.org),
    // sonst erscheint ein Hinweis mit Link auf die Datei.
    geogebra: q => ggbBox(q.getAttribute('datei'), zahl(q.getAttribute('breite'), 1500), zahl(q.getAttribute('hoehe'), 520)),
  };
  // GeoGebra-Datei (Classic) eingebettet; lädt erst, wenn die Phase sichtbar ist. Braucht Internet (geogebra.org),
  // sonst erscheint ein Hinweis mit Link auf die Datei. breite = null: füllt den freien Platz (neben einem Karofeld).
  function ggbBox(datei, breite, h) {
    const box = el('div', 'ggb'), ziel = el('div');
    if (breite) box.style.width = breite + 'px';
    box.style.height = h + 'px'; box.append(ziel);
    let gestartet = false;
    const hinweis = () => { box.replaceChildren(); const a = el('a', null, 'GeoGebra nicht erreichbar – Datei öffnen'); a.href = datei; box.append(a); };
    const start = () => {
      if (gestartet) return; gestartet = true;
      const los = (n = 0) => {
        const b = breite || Math.floor(box.clientWidth);
        if (!b && n < 40) return setTimeout(() => los(n + 1), 100);
        ggbLaden().then(() => new window.GGBApplet({ appName: 'classic', width: b || 800, height: h, filename: datei + (SKRIPT_V ? '?v=' + SKRIPT_V : ''), showToolBar: false, showMenuBar: false,
          showAlgebraInput: false, showResetIcon: false, enableRightClick: false, enableShiftDragZoom: false, enableLabelDrags: false, showFullscreenButton: false,
          useBrowserForJS: true, borderColor: 'none' }, true).inject(ziel)).catch(hinweis);
      };
      setTimeout(() => los(), 150);   // erst nach dem Einpassen (Breite steht dann fest)
    };
    return { el: box, start };
  }
  let ggbSkript = null;
  const ggbLaden = () => ggbSkript ||= new Promise((ok, fehler) => {
    const sk = document.createElement('script'); sk.src = 'https://www.geogebra.org/apps/deployggb.js';
    sk.onload = ok; sk.onerror = fehler; document.head.append(sk); setTimeout(() => fehler(new Error('Zeitüberschreitung')), 20000);
  });

  // ---------- Gerüst des Blatts ----------
  const phasenNamen = (blatt.getAttribute('phasen') || '').split('|').map(s => s.trim()).filter(Boolean);
  const bogen = el('main', 'bogen');
  const kopf = el('header', 'kopfzeile');
  kopf.append(el('span', null, blatt.getAttribute('kapitel') || ''), el('span', null, 'Datum: _____________________'));
  const h1 = el('h1', null, blatt.getAttribute('titel') || '');
  const buehne = el('div', 'buehne');
  const rand = el('aside', 'rand');
  const module = el('div', 'module');
  const panels = [];

  // Randspalte: Notizen + ggf. Simulationen
  const reiter = el('div', 'reiter'), raender = [];
  function randReiter(name, inhalt) {
    const b = knopf(name, null); const box = el('div', 'rand-inhalt');
    box.append(inhalt); reiter.append(b); raender.push([b, box]);
    b.onclick = () => raender.forEach(([x, y]) => { const an = x === b; x.setAttribute('aria-pressed', an); y.hidden = !an; });
  }
  const notiz = neueFlaeche({ id: 'notizen', getAttribute: () => null }, 1000 / 1400);
  notiz.el.classList.add('notizflaeche');
  randReiter('Notizen', notiz.el);

  for (const q of [...blatt.children]) {
    const art = q.tagName.toLowerCase().replace(/^ab-/, '');
    if (art === 'simulation') {
      const box = el('div', 'simulation');
      const frame = el('iframe'); frame.src = q.getAttribute('url'); frame.title = q.getAttribute('titel') || 'Simulation'; frame.loading = 'lazy';
      const link = el('a', null, 'In neuem Tab öffnen'); link.href = frame.src; link.target = '_blank'; link.rel = 'noopener';
      box.append(frame, link);
      randReiter(q.getAttribute('titel') || 'Simulation', box);
      continue;
    }
    const bau = BAUSTEINE[art];
    if (!bau) { console.warn('Unbekannter Baustein:', q.tagName); continue; }
    const teil = bau(q);
    const panel = el('section', 'panel');
    const titel = q.getAttribute('titel');
    if (titel) {
      const h2 = el('h2', null, titel);
      if (q.getAttribute('druck-titel') === 'nein') h2.classList.add('nur-tafel');
      if (q.getAttribute('tafel-titel') === 'nein') h2.classList.add('nur-druck');
      panel.append(h2);
    }
    panel.append(teil.panelEl || teil.el); panel.start = teil.start;
    if (q.getAttribute('nur')) panel.classList.add('nur-' + q.getAttribute('nur'));
    if (q.getAttribute('druckbreite')) panel.style.setProperty('--druckbreite', q.getAttribute('druckbreite'));
    else if (teil.raster) panel.style.setProperty('--druckbreite', '175mm');   // 35 Kästchen à 5 mm
    panel.anteil = Math.min(1, Math.max(.2, parseFloat(q.getAttribute('breite')) / 100 || 1));   // Breite in % der Blattbreite (nur Bild-/Tabellenblöcke)
    panel.phasen = (q.getAttribute('phase') || '').split(/[\s,]+/).filter(Boolean);
    panel.flaeche = teil.svg ? teil : null;
    panels.push(panel);
    module.append(panel);
  }
  raender[0][0].click();

  const randZu = knopf('×', 'Randspalte ein-/ausblenden', 'rand-zu');
  rand.append(randZu, reiter, ...raender.map(r => r[1]));
  buehne.append(module);
  document.body.append(rand);   // Randnotizen liegen außerhalb der skalierten Folie über dem Bildschirm
  const fuss = el('footer', 'fusszeile', blatt.getAttribute('fuss') || '');
  bogen.append(kopf, h1, buehne, fuss);

  // Phasen: aus den phase-Attributen der Bausteine
  const phasen = [...new Set(panels.flatMap(p => p.phasen))].sort((a, b) => a - b);

  // Neue Stiftfunktionen (Druck, Radierer-Ende, Auswahl, Lineal); mit ?klassisch in der Adresse zum Vergleich abschaltbar.
  const PLUS = !/[?&]klassisch\b/.test(location.search);
  const EINST = { staerke: 1, druck: 0.6 };   // Strichstärke (Faktor) und Druckempfindlichkeit (0 = aus … 1 = stark)
  try { Object.assign(EINST, JSON.parse(localStorage.getItem('tafel:stift')) || {}); } catch { /* Standardwerte */ }
  // ---------- Werkzeugleiste ----------
  const leiste = el('nav', 'leiste');
  const zurueck = el('a', 'zurueck', '←'); zurueck.title = 'Zur Übersicht';
  const von = new URLSearchParams(location.search).get('von');
  zurueck.href = wurzel + 'index.html' + (von ? '#' + von : '');
  const gruppe = (...k) => { const g = el('div', 'gruppe'); g.append(...k); return g; };
  const bTafel = knopf('Tafel'), bDruck = knopf('Druckansicht');
  const bBedienen = knopf('Bedienen'), bStift = knopf('Schreiben'), bRadierer = knopf('Radieren');
  const bAuswahl = knopf('Auswahl', 'Striche mit einer Schlinge einfangen und verschieben – Tippen wählt einen einzelnen Strich');
  const bAuswLoe = knopf('Auswahl löschen', 'Ausgewählte Striche löschen (Taste Entf)'); bAuswLoe.disabled = true;
  const bLineal = knopf('Lineal', 'Lineal ein-/ausblenden: Mitte ziehen = verschieben, runder Griff oder zwei Finger = drehen; Striche an der Kante werden gerade');
  const regler = (text, titel, min, max, step, wert, cb) => {
    const l = el('label', 'regler'); l.title = titel; const i = el('input'); i.type = 'range'; i.min = min; i.max = max; i.step = step; i.value = wert;
    i.oninput = () => { cb(+i.value); try { localStorage.setItem('tafel:stift', JSON.stringify(EINST)); } catch { /* egal */ } };
    l.append(text + ' ', i); return l;
  };
  const bZurueck = knopf('↶', 'Letzten Strich rückgängig'), bLeeren = knopf('⌫', 'Alle eigenen Anmerkungen löschen');
  const farbKnoepfe = FARBEN.map(([c, n]) => { const b = knopf('<span></span>', n, 'farbe'); b.style.setProperty('--farbe', c); b.farbe = c; return b; });
  const phasenKnoepfe = phasen.map((p, i) => { const b = knopf((i + 1) + ' ' + (phasenNamen[i] || 'Phase ' + p)); b.phase = p; return b; });
  const bLoesung = knopf('Musterlösung', 'Musterlösung ein-/ausblenden'), bSichern = knopf('Als Musterlösung sichern', 'Aktuelle Handschrift als Musterlösung speichern (ersetzt die vorhandene)');
  bLoesung.disabled = true; bLoesung.title = 'Noch keine Musterlösung gespeichert';
  const bVoll = knopf('Vollbild'), bDrucken = knopf('Drucken'), bNotizen = knopf('Notizen', 'Randnotizen ein-/ausblenden (liegen über dem Blatt)');
  const status = el('span', 'status'); const stempel = el('span', 'stempel', MOTOR);
  // Zwei Zeilen: oben Phasen, Notizen, Musterlösung – unten Ansicht, Werkzeuge, Farben, Vollbild/Drucken
  const zeile = (...k) => { const z = el('div', 'zeile'); z.append(...k); return z; };
  leiste.append(
    zeile(zurueck, ...(phasenKnoepfe.length ? [gruppe(...phasenKnoepfe)] : []), gruppe(bNotizen), gruppe(bLoesung, bSichern), ...(PLUS ? [gruppe(regler('Stärke', 'Strichstärke der neuen Striche', .6, 2.5, .1, EINST.staerke, v => EINST.staerke = v), regler('Druck', 'Wie stark der Stiftdruck die Strichbreite ändert (0 = aus)', 0, 1, .05, EINST.druck, v => EINST.druck = v), bAuswLoe)] : [])),
    zeile(gruppe(bTafel, bDruck), gruppe(bBedienen, bStift, bRadierer, ...(PLUS ? [bAuswahl, bLineal] : []), bZurueck, bLeeren), gruppe(...farbKnoepfe), gruppe(bVoll, bDrucken), status, stempel));

  if (blatt.hasAttribute('oben')) document.body.classList.add('oben');   // Bausteine oben ausrichten statt mittig
  blatt.replaceWith(bogen);
  document.body.append(leiste);
  document.body.classList.add('tafel');

  // ---------- Speicher ----------
  // Das Blatt startet immer leer. Was im Unterricht geschrieben wird ("eigen"), bleibt nur in dieser
  // Sitzung erhalten (sessionStorage: übersteht ein versehentliches Neuladen, nicht das Schließen des Tabs).
  // Die Musterlösung liegt als Datei <blattname>.loesung.js neben dem Blatt (nur lesen, per Knopf sichtbar,
  // oder direkt über den Link  blatt.html?loesung). Ein Skript statt fetch: funktioniert auch ohne Server.
  const SCHLUESSEL = 'tafel:' + location.pathname;
  const blattname = (location.pathname.split('/').pop() || 'index').replace(/\.html?$/i, '') || 'index';
  let eigen = {}, loesung = {}, zeigeLoesung = new URLSearchParams(location.search).has('loesung');
  try { eigen = JSON.parse(sessionStorage.getItem(SCHLUESSEL))?.eigen || {}; } catch { /* leer beginnen */ }
  const hatStriche = d => Object.values(d).some(a => a.length);
  const ladeLoesung = () => new Promise(fertig => {
    const sk = document.createElement('script');
    sk.src = blattname + '.loesung.js?v=' + Date.now();
    sk.onload = () => { loesung = window.TAFEL_LOESUNG?.eigen || {}; fertig(); };
    sk.onerror = () => fertig();
    document.head.append(sk);
  });

  function speichern() {
    try { sessionStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 1, eigen })); }
    catch { /* nur Sitzungspuffer – kein Grund zur Meldung */ }
  }
  const melde = t => { status.textContent = t; status.title = t; };

  // ---------- Stift ----------
  // PLUS = neue Stiftfunktionen (Druck, Radierer-Ende, Auswahl, Lineal). Mit ?klassisch in der Adresse werden sie zum
  // Vergleich abgeschaltet; die frühere Fassung des Motors liegt unverändert als tafel-v14.js/-css daneben.
  let modus = 'bedienen', farbe = FARBEN[0][0], aktiv = null, geaendert = false;
  const verlauf = [];
  const BASIS = 3.2;   // Strichstärke in Koordinateneinheiten (wie tafel.css .tinte)
  let sel = null;   // Auswahl: { f, s: [Striche] }
  const pfad = p => p.map((q, i) => (i ? 'L' : 'M') + q[0] + ',' + q[1]).join('') + (p.length === 1 ? 'l.01 .01' : '');
  // Ein Strich (Punkte [x, y] oder [x, y, Druck]) wird als ein Pfad gezeichnet; hat er Druckwerte, in Stücke gleicher Breite zerlegt.
  const breiteAn = (s, q) => BASIS * (s.w || 1) * (q[2] == null ? 1 : Math.max(.25, 1 + (s.e || 0) * (2 * q[2] - 1)));
  function teile(s) {
    if (!s.e || !s.p.some(q => q[2] != null) || s.p.length < 2) return [{ d: pfad(s.p), w: s.p.length === 1 && s.p[0][2] != null ? breiteAn(s, s.p[0]) : (s.w ? BASIS * s.w : 0) }];
    const aus = []; let start = 0, wAlt = null;
    for (let i = 1; i < s.p.length; i++) {
      const w = Math.round((breiteAn(s, s.p[i - 1]) + breiteAn(s, s.p[i])) / 2 * 4) / 4;
      if (wAlt !== null && w !== wAlt) { aus.push({ d: pfad(s.p.slice(start, i)), w: wAlt }); start = i - 1; }
      wAlt = w;
    }
    aus.push({ d: pfad(s.p.slice(start)), w: wAlt });
    return aus;
  }
  const grenzen = striche => {
    const r = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (const s of striche) for (const q of s.p) { r.x0 = Math.min(r.x0, q[0]); r.y0 = Math.min(r.y0, q[1]); r.x1 = Math.max(r.x1, q[0]); r.y1 = Math.max(r.y1, q[1]); }
    return r;
  };

  function zeichne(f) {
    f.svg.replaceChildren();
    const mk = (tag, attr) => { const p = document.createElementNS(NS, tag); for (const k in attr) p.setAttribute(k, attr[k]); f.svg.append(p); return p; };
    const strich = (s, extra = 0, farbeAlt) => { for (const t of teile(s)) mk('path', { d: t.d, stroke: farbeAlt || s.c, ...(t.w || extra ? { 'stroke-width': (t.w || BASIS) + extra } : {}), ...(farbeAlt ? { opacity: .35 } : {}) }); };
    if (zeigeLoesung) for (const s of loesung[f.id] || []) strich(s);
    const eig = eigen[f.id] || [];
    if (sel && sel.f === f) for (const s of sel.s) strich(s, 8, '#4a9bff');
    for (const s of eig) strich(s);
    if (sel && sel.f === f && sel.s.length) {
      const r = grenzen(sel.s), pad = 10;
      mk('rect', { x: r.x0 - pad, y: r.y0 - pad, width: r.x1 - r.x0 + 2 * pad, height: r.y1 - r.y0 + 2 * pad, stroke: '#4a9bff', 'stroke-width': 2, 'stroke-dasharray': '8 6' });
    }
    if (f.lasso && f.lasso.length > 1) mk('path', { d: pfad(f.lasso) + 'Z', stroke: '#4a9bff', 'stroke-width': 2, 'stroke-dasharray': '8 6', fill: 'rgba(74,155,255,.08)' });
  }
  const punktXY = (x, y, svg) => {
    const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse());
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  };
  const punkt = (e, svg) => {
    const p = punktXY(e.clientX, e.clientY, svg);
    if (PLUS && e.pointerType === 'pen') p.push(Math.round(Math.min(1, Math.max(.05, e.pressure || .5)) * 100) / 100);
    return p;
  };
  function abstand(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], n = dx * dx + dy * dy;
    const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / n)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function radiere(f, p, r = 13) {
    const vorher = eigen[f.id] || [];
    const nachher = vorher.filter(s => !s.p.some((q, i) => abstand(p, q, s.p[Math.max(0, i - 1)]) < r));
    if (nachher.length !== vorher.length) { eigen[f.id] = nachher; geaendert = true; zeichne(f); }
  }
  const imPolygon = (p, poly) => {
    let innen = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) innen = !innen;
    }
    return innen;
  };
  const radierNun = e => PLUS && e.pointerType === 'pen' && (e.buttons & 32) > 0;   // Radierer-Flag während der Bewegung
  const radierEnde = e => PLUS && e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32) > 0);   // Rückseite des Surface Pen

  function starte(f, e, m, global) {
    verlauf.push(JSON.stringify(eigen)); if (verlauf.length > 60) verlauf.shift();
    aktiv = { f, id: e.pointerId, m, global, pen: e.pointerType === 'pen', ende: radierEnde(e) };
    geaendert = false;
    const p = punkt(e, f.svg);
    if (m === 'stift') {
      const s = { p: [p], c: farbe };
      if (PLUS && EINST.staerke !== 1) s.w = EINST.staerke;
      if (PLUS && aktiv.pen && EINST.druck > 0) s.e = EINST.druck;
      const sn = PLUS && lineal.an ? lineal.schnapp(e.clientX, e.clientY) : null;
      if (sn) { aktiv.sn = sn; const q = lineal.projiziere(e.clientX, e.clientY, sn); s.p = [punktXY(q[0], q[1], f.svg)]; delete s.e; }
      (eigen[f.id] ||= []).push(s); geaendert = true; zeichne(f);
    } else if (m === 'radierer') radiere(f, p, aktiv.ende ? 17 : 13);
    else if (m === 'auswahl') {
      const b = sel && sel.f === f ? grenzen(sel.s) : null;
      if (b && p[0] >= b.x0 - 10 && p[0] <= b.x1 + 10 && p[1] >= b.y0 - 10 && p[1] <= b.y1 + 10) aktiv.schiebe = p;
      else { sel = null; aktiv.lasso = f.lasso = [p]; flaechen.forEach(zeichne); }
      meldeAuswahl();
    }
  }
  function bewege(e) {
    const f = aktiv.f, m = aktiv.m;
    const events = e.getCoalescedEvents?.().length ? e.getCoalescedEvents() : [e];
    for (const ev of events) {
      if (aktiv.m === 'stift' && radierNun(ev)) {   // Stift wurde umgedreht: angefangenen Strich verwerfen und radieren
        eigen[f.id].pop(); aktiv.m = 'radierer'; aktiv.ende = true; aktiv.sn = null; geaendert = true;
      }
      if (aktiv.m === 'radierer') { radiere(f, punkt(ev, f.svg), aktiv.ende ? 17 : 13); continue; }
      if (m === 'stift') {
        const s = eigen[f.id].at(-1);
        if (aktiv.sn) { const q = lineal.projiziere(ev.clientX, ev.clientY, aktiv.sn); s.p = [s.p[0], punktXY(q[0], q[1], f.svg)]; }
        else s.p.push(punkt(ev, f.svg));
      } else if (m === 'radierer') radiere(f, punkt(ev, f.svg), aktiv.ende ? 17 : 13);
      else if (m === 'auswahl') {
        const p = punkt(ev, f.svg);
        if (aktiv.schiebe) {
          const dx = p[0] - aktiv.schiebe[0], dy = p[1] - aktiv.schiebe[1];
          for (const s of sel.s) for (const q of s.p) { q[0] = Math.round((q[0] + dx) * 10) / 10; q[1] = Math.round((q[1] + dy) * 10) / 10; }
          aktiv.schiebe = p; geaendert = true;
        } else aktiv.lasso.push(p);
      }
    }
    if (m !== 'radierer') zeichne(f);
  }
  function beende(e) {
    if (!aktiv || (e && e.pointerId !== aktiv.id)) return;
    const f = aktiv.f;
    if (aktiv.m === 'auswahl' && aktiv.lasso) {
      const poly = aktiv.lasso, r = grenzen([{ p: poly }]);
      const eig = eigen[f.id] || [];
      if (poly.length > 3 && Math.max(r.x1 - r.x0, r.y1 - r.y0) > 20) {
        const drin = eig.filter(s => s.p.filter(q => imPolygon(q, poly)).length >= s.p.length / 2);
        sel = drin.length ? { f, s: drin } : null;
      } else {   // Tippen: den nächsten Strich wählen
        const p = poly[0]; let best = null, bd = 16;
        for (const s of eig) for (let i = 0; i < s.p.length; i++) { const d = abstand(p, s.p[i], s.p[Math.max(0, i - 1)]); if (d < bd) { bd = d; best = s; } }
        sel = best ? { f, s: [best] } : null;
      }
      f.lasso = null; verlauf.pop(); flaechen.forEach(zeichne); meldeAuswahl();
    } else if (geaendert) speichern(); else verlauf.pop();
    aktiv = null; geaendert = false;
  }
  for (const f of flaechen) {
    zeichne(f);
    f.svg.addEventListener('pointerdown', e => {
      const m = radierEnde(e) ? 'radierer' : modus;
      if (m === 'bedienen' || aktiv || (e.button !== 0 && !radierEnde(e))) return;
      e.preventDefault();
      try { f.svg.setPointerCapture(e.pointerId); } catch { /* z. B. bei künstlichen Ereignissen */ }
      starte(f, e, m, false);
    });
    f.svg.addEventListener('pointermove', e => {
      if (!aktiv || aktiv.global || aktiv.id !== e.pointerId || aktiv.f !== f) return;
      e.preventDefault(); bewege(e);
    });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) f.svg.addEventListener(t, e => { if (!aktiv || !aktiv.global) beende(e); });
  }
  // Stift-Info: Klick auf die Versionsangabe unten rechts zeigt für jeden Stiftkontakt, was der Browser meldet
  let stiftInfo = false, letzteTasten = null;
  stempel.style.cursor = 'pointer';
  stempel.onclick = () => { stiftInfo = !stiftInfo; melde(stiftInfo ? 'Stift-Info an: Stift aufsetzen' : 'Stift-Info aus'); };
  const infoText = e => 'Stift-Info: ' + e.pointerType + ' · button=' + e.button + ' · buttons=' + e.buttons + ' · Druck=' + (e.pressure || 0).toFixed(2);
  addEventListener('pointerdown', e => { if (stiftInfo && e.pointerType !== 'mouse') { melde(infoText(e)); letzteTasten = e.buttons; } }, true);
  addEventListener('pointermove', e => { if (stiftInfo && e.pointerType !== 'mouse' && e.buttons && e.buttons !== letzteTasten) { melde(infoText(e)); letzteTasten = e.buttons; } }, true);
  // Radierer-Ende des Stifts funktioniert auch im Modus „Bedienen“ (dort nimmt die Schreibfläche sonst nichts an)
  addEventListener('pointerdown', e => {
    if (!PLUS || aktiv || modus !== 'bedienen' || !radierEnde(e)) return;
    const f = flaechen.find(g => { if (!g.svg.getClientRects().length) return false; const r = g.svg.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    if (!f) return;
    e.preventDefault(); e.stopPropagation(); starte(f, e, 'radierer', true);
  }, true);
  addEventListener('pointermove', e => { if (aktiv && aktiv.global && e.pointerId === aktiv.id) { e.preventDefault(); bewege(e); } }, true);
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, e => { if (aktiv && aktiv.global) beende(e); }, true);

  // ---------- Lineal ----------
  // Ein Lineal als Ebene über der Folie (in Bildschirmpixeln). Verschieben: mit dem Finger (oder Maus) in der Mitte ziehen;
  // drehen: am runden Griff ziehen oder mit zwei Fingern. Ein Strich, der an einer Längskante beginnt, wird zur Geraden an der Kante.
  const lineal = (() => {
    const svg = document.createElementNS(NS, 'svg'); svg.classList.add('lineal'); svg.style.display = 'none';
    const g = document.createElementNS(NS, 'g'); svg.append(g);
    const z = { x: 0, y: 0, w: 0, an: false, L: 0, H: 0, zp: 40 };
    const KANTE = 16;
    const zellePx = () => {
      for (const f of flaechen) if (f.raster && f.svg.getClientRects().length) return f.svg.getScreenCTM().a * 1000 / SPALTEN;
      return 40 * (parseFloat(getComputedStyle(document.body).getPropertyValue('--k')) || 1);
    };
    const el2 = (tag, attr, parent = g) => { const n = document.createElementNS(NS, tag); for (const k in attr) n.setAttribute(k, attr[k]); parent.append(n); return n; };
    function bau() {
      z.zp = zellePx(); z.L = 24 * z.zp; z.H = 2.6 * z.zp;
      g.replaceChildren();
      el2('rect', { x: 0, y: 0, width: z.L, height: z.H, rx: 4, fill: 'rgba(255,238,170,.62)', stroke: '#a58a2a', 'stroke-width': 1.5 });
      for (let i = 0; i <= 24; i++) {
        const gross = i % 2 === 0;
        el2('line', { x1: i * z.zp, y1: 0, x2: i * z.zp, y2: (gross ? .5 : .28) * z.zp, stroke: '#5b4a10', 'stroke-width': gross ? 1.6 : 1 });
        if (gross && i > 0 && i < 24) el2('text', { x: i * z.zp, y: .95 * z.zp, 'text-anchor': 'middle', 'font-size': Math.max(10, .36 * z.zp), fill: '#5b4a10', 'font-family': 'Calibri,Carlito,sans-serif' }).textContent = i / 2;
      }
      el2('text', { x: .25 * z.zp, y: 1.6 * z.zp, 'font-size': Math.max(10, .3 * z.zp), fill: '#7a6620', 'font-family': 'Calibri,Carlito,sans-serif' }).textContent = 'cm (2 Kästchen)';
      el2('circle', { cx: z.L - 1.1 * z.zp, cy: z.H / 2, r: .55 * z.zp, fill: '#fff5cc', stroke: '#a58a2a', 'stroke-width': 1.5 });
      el2('text', { x: z.L - 1.1 * z.zp, y: z.H / 2 + .2 * z.zp, 'text-anchor': 'middle', 'font-size': .6 * z.zp, fill: '#5b4a10' }).textContent = '↻';
      setze();
    }
    const setze = () => g.setAttribute('transform', `translate(${z.x} ${z.y}) rotate(${z.w})`);
    const lokal = (cx, cy) => { const r = z.w * Math.PI / 180, dx = cx - z.x, dy = cy - z.y; return [dx * Math.cos(r) + dy * Math.sin(r), -dx * Math.sin(r) + dy * Math.cos(r)]; };
    const global = (lx, ly) => { const r = z.w * Math.PI / 180; return [z.x + lx * Math.cos(r) - ly * Math.sin(r), z.y + lx * Math.sin(r) + ly * Math.cos(r)]; };
    function zone(cx, cy) {
      const [lx, ly] = lokal(cx, cy);
      if (lx < -6 || lx > z.L + 6 || ly < -6 || ly > z.H + 6) return null;
      if (Math.hypot(lx - (z.L - 1.1 * z.zp), ly - z.H / 2) < .7 * z.zp) return 'drehen';
      if (ly < KANTE || ly > z.H - KANTE) return 'kante';
      return 'schieben';
    }
    function schnapp(cx, cy) {
      const [lx, ly] = lokal(cx, cy);
      if (lx < -6 || lx > z.L + 6) return null;
      if (Math.abs(ly) < KANTE) return { y0: 0 };
      if (Math.abs(ly - z.H) < KANTE) return { y0: z.H };
      return null;
    }
    function projiziere(cx, cy, sn) { const [lx] = lokal(cx, cy); return global(Math.max(0, Math.min(z.L, lx)), sn.y0); }
    function dreheUm(px, py, dw) {   // Lineal um den Punkt (px, py) um dw Grad drehen
      const r = dw * Math.PI / 180, dx = z.x - px, dy = z.y - py;
      z.x = px + dx * Math.cos(r) - dy * Math.sin(r); z.y = py + dx * Math.sin(r) + dy * Math.cos(r); z.w += dw;
    }
    // Bedienung
    const finger = new Map();   // pointerId → letzte Position
    let art = null;
    addEventListener('pointerdown', e => {
      if (!z.an) return;
      if (finger.size && e.pointerType === 'touch') { finger.set(e.pointerId, [e.clientX, e.clientY]); art = 'zwei'; e.preventDefault(); e.stopPropagation(); return; }
      const zn = zone(e.clientX, e.clientY);
      if (!zn || zn === 'kante') return;
      if (e.pointerType === 'pen' && modus !== 'bedienen') return;
      e.preventDefault(); e.stopPropagation();
      finger.set(e.pointerId, [e.clientX, e.clientY]); art = zn;
    }, true);
    addEventListener('pointermove', e => {
      if (!z.an || !finger.has(e.pointerId)) return;
      e.preventDefault(); e.stopPropagation();
      const alt = finger.get(e.pointerId), neu = [e.clientX, e.clientY];
      if (art === 'schieben') { z.x += neu[0] - alt[0]; z.y += neu[1] - alt[1]; }
      else if (art === 'drehen') {
        const m = global(z.L / 2, z.H / 2), a0 = Math.atan2(alt[1] - m[1], alt[0] - m[0]), a1 = Math.atan2(neu[1] - m[1], neu[0] - m[0]);
        let dw = (a1 - a0) * 180 / Math.PI; if (dw > 180) dw -= 360; if (dw < -180) dw += 360;
        dreheUm(m[0], m[1], dw);
      } else if (art === 'zwei' && finger.size >= 2) {
        const ids = [...finger.keys()].slice(0, 2), P = ids.map(i => finger.get(i));
        const Q = ids.map(i => i === e.pointerId ? neu : finger.get(i));
        const m0 = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2], m1 = [(Q[0][0] + Q[1][0]) / 2, (Q[0][1] + Q[1][1]) / 2];
        let dw = (Math.atan2(Q[1][1] - Q[0][1], Q[1][0] - Q[0][0]) - Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0])) * 180 / Math.PI;
        if (dw > 180) dw -= 360; if (dw < -180) dw += 360;
        dreheUm(m0[0], m0[1], dw); z.x += m1[0] - m0[0]; z.y += m1[1] - m0[1];
      }
      finger.set(e.pointerId, neu); setze();
    }, true);
    for (const t of ['pointerup', 'pointercancel']) addEventListener(t, e => { if (finger.has(e.pointerId)) { finger.delete(e.pointerId); if (finger.size < 2 && art === 'zwei') art = finger.size ? 'schieben' : null; if (!finger.size) art = null; } }, true);
    function umschalten(an) {
      z.an = an; svg.style.display = an ? '' : 'none';
      if (an) { if (!svg.isConnected) document.body.append(svg); if (!z.x && !z.y) { z.zp = zellePx(); z.x = innerWidth / 2 - 12 * z.zp; z.y = (innerHeight - leiste.offsetHeight) / 2; } bau(); }
    }
    return { get an() { return z.an; }, umschalten, neuBauen: () => { if (z.an) bau(); }, schnapp, projiziere };
  })();
  const meldeAuswahl = () => { bAuswLoe.disabled = !(sel && sel.s.length); };

  // ---------- Bedienung ----------
  const druecke = (liste, aktivKnopf) => liste.forEach(b => b.setAttribute('aria-pressed', b === aktivKnopf));
  function setzeModus(m) {
    beende(); modus = m;
    if (m !== 'auswahl' && sel) { sel = null; flaechen.forEach(zeichne); meldeAuswahl(); }
    document.body.dataset.modus = m;
    druecke([bBedienen, bStift, bRadierer, bAuswahl], { bedienen: bBedienen, stift: bStift, radierer: bRadierer, auswahl: bAuswahl }[m]);
  }
  bBedienen.onclick = () => setzeModus('bedienen');
  bStift.onclick = () => setzeModus('stift');
  bRadierer.onclick = () => setzeModus('radierer');
  bAuswahl.onclick = () => setzeModus('auswahl');
  bLineal.onclick = () => { const an = !lineal.an; lineal.umschalten(an); bLineal.setAttribute('aria-pressed', an); };
  function loescheAuswahl() {
    if (!sel || !sel.s.length) return;
    verlauf.push(JSON.stringify(eigen)); if (verlauf.length > 60) verlauf.shift();
    eigen[sel.f.id] = (eigen[sel.f.id] || []).filter(s => !sel.s.includes(s));
    sel = null; flaechen.forEach(zeichne); speichern(); meldeAuswahl();
  }
  bAuswLoe.onclick = loescheAuswahl;
  addEventListener('keydown', e => { if (e.key === 'Delete' && sel && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) loescheAuswahl(); });
  farbKnoepfe.forEach(b => b.onclick = () => { farbe = b.farbe; druecke(farbKnoepfe, b); setzeModus('stift'); });
  bZurueck.onclick = () => { beende(); sel = null; meldeAuswahl(); if (verlauf.length) { eigen = JSON.parse(verlauf.pop()); flaechen.forEach(zeichne); speichern(); } };
  bLeeren.onclick = () => {
    beende();
    if (!confirm('Alle eigenen Anmerkungen und Notizen auf diesem Blatt löschen?')) return;
    eigen = {}; sel = null; meldeAuswahl(); verlauf.length = 0; flaechen.forEach(zeichne);
    try { sessionStorage.removeItem(SCHLUESSEL); } catch { /* egal */ }
    melde('Anmerkungen gelöscht');
  };

  function zeigeLoesungAn(an) {
    zeigeLoesung = an; bLoesung.setAttribute('aria-pressed', an);
    flaechen.forEach(zeichne);
    melde(an ? 'Musterlösung wird angezeigt' : 'Leeres Blatt');
  }
  const loesungVerfuegbar = () => { bLoesung.disabled = !hatStriche(loesung); bLoesung.title = bLoesung.disabled ? 'Noch keine Musterlösung gespeichert' : 'Musterlösung ein-/ausblenden'; };
  bLoesung.onclick = () => zeigeLoesungAn(!zeigeLoesung);
  // ---- Sichern: auf GitHub Pages direkt ins Repository (per Token), sonst Speicherdialog/Download ----
  const TOKEN_KEY = 'unterricht-github-token';
  function githubZiel() {
    const c = window.TAFEL_GITHUB || {}, m = location.hostname.match(/^([^.]+)\.github\.io$/);
    const teile = location.pathname.split('/').filter(Boolean);
    const owner = c.owner || (m && m[1]);
    const repo = c.repo || (m && teile.shift());
    if (!owner || !repo) return null;
    if (!/\.html?$/i.test(teile.at(-1) || '')) teile.push('index.html');
    teile[teile.length - 1] = teile.at(-1).replace(/\.html?$/i, '.loesung.js');
    return { owner, repo, pfad: teile.join('/') };
  }
  const base64 = t => { const b = new TextEncoder().encode(t); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return btoa(s); };
  const speicherfehler = m => Object.assign(new Error(m), { speicher: true });

  async function insRepo(text, z) {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = (prompt('Einmalig: GitHub-Token einfügen (nur für dieses Repository, Berechtigung „Contents: Read and write“).\nEr bleibt nur in diesem Browser gespeichert.') || '').trim();
      if (!token) throw Object.assign(new Error('abgebrochen'), { name: 'AbortError' });
    }
    const url = 'https://api.github.com/repos/' + z.owner + '/' + z.repo + '/contents/' + z.pfad.split('/').map(encodeURIComponent).join('/');
    const kopf = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    for (let versuch = 0; versuch < 2; versuch++) {
      const alt = await fetch(url, { headers: kopf, cache: 'no-store' });
      if (alt.status === 401) { localStorage.removeItem(TOKEN_KEY); throw speicherfehler('Token ungültig oder abgelaufen – beim nächsten Sichern neu einfügen'); }
      const sha = alt.ok ? (await alt.json()).sha : undefined;
      const r = await fetch(url, { method: 'PUT', headers: { ...kopf, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Musterlösung ' + blattname + ' (' + new Date().toLocaleString('de-DE') + ')', content: base64(text), sha }) });
      if (r.ok) { localStorage.setItem(TOKEN_KEY, token); return; }
      if (r.status === 401) { localStorage.removeItem(TOKEN_KEY); throw speicherfehler('Token ungültig oder abgelaufen – beim nächsten Sichern neu einfügen'); }
      if (r.status === 403 || r.status === 404) throw speicherfehler('Token darf in diesem Repository nicht schreiben (Contents: Read and write?)');
      if (r.status !== 409 && r.status !== 422) throw speicherfehler('GitHub meldet Fehler ' + r.status);
    }
    throw speicherfehler('Datei wurde gleichzeitig geändert – bitte noch einmal sichern');
  }
  function alsDownload(text, name) {
    const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  bSichern.onclick = async () => {
    beende();
    if (!hatStriche(eigen)) { melde('Nichts geschrieben – nichts zu sichern'); return; }
    const name = blattname + '.loesung.js';
    const text = '// Musterlösung zu ' + blattname + '.html – gesichert am ' + new Date().toLocaleString('de-DE') + '\nwindow.TAFEL_LOESUNG = ' + JSON.stringify({ version: 1, eigen }) + ';\n';
    const z = githubZiel();
    try {
      if (z) {
        melde('Sichere im Repository …');
        try { await insRepo(text, z); melde('Musterlösung gespeichert – in etwa 1 Minute überall sichtbar'); }
        catch (e) {
          if (e.name === 'AbortError') throw e;
          alsDownload(text, name);   // nichts verlieren: Sicherungsdatei lokal
          melde((e.speicher ? e.message : 'Keine Verbindung zu GitHub') + ' – Sicherungsdatei heruntergeladen');
          return;
        }
      } else if (window.showSaveFilePicker) {
        const h = await showSaveFilePicker({ suggestedName: name, id: 'tafel-loesung', types: [{ description: 'Musterlösung', accept: { 'text/javascript': ['.js'] } }] });
        const w = await h.createWritable(); await w.write(text); await w.close();
        melde('Musterlösung gespeichert (' + h.name + ')');
      } else { alsDownload(text, name); melde(name + ' heruntergeladen – in den Blatt-Ordner legen'); }
      loesung = JSON.parse(JSON.stringify(eigen)); loesungVerfuegbar();
    } catch (e) { if (e.name !== 'AbortError') melde('Sichern fehlgeschlagen: ' + (e.message || e.name)); }
  };

  function setzeAnsicht(druck) {
    beende();
    document.body.classList.toggle('druckansicht', druck);
    document.body.classList.toggle('tafelansicht', !druck);
    druecke([bTafel, bDruck], druck ? bDruck : bTafel);
    einpassen(); requestAnimationFrame(einpassen);   // sofort (für den Druck) und nach dem Zeichnen nochmals
  }
  bTafel.onclick = () => setzeAnsicht(false);
  bDruck.onclick = () => setzeAnsicht(true);
  let warTafel = true;
  addEventListener('beforeprint', () => { warTafel = document.body.classList.contains('tafelansicht'); setzeAnsicht(true); });
  addEventListener('afterprint', () => setzeAnsicht(!warTafel));
  bDrucken.onclick = () => { beende(); window.print(); };
  bVoll.onclick = async () => {
    try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); }
    catch { melde('Vollbild nicht verfügbar – F11 verwenden'); }
  };
  // Randnotizen: standardmäßig zu; aufgeklappt liegen sie über dem Blatt (das Blatt selbst verschiebt sich nie).
  const setzeNotizen = an => { document.body.classList.toggle('notizen-offen', an); bNotizen.setAttribute('aria-pressed', an); };
  bNotizen.onclick = () => { beende(); setzeNotizen(!document.body.classList.contains('notizen-offen')); };
  randZu.onclick = () => setzeNotizen(false);
  setzeNotizen(false);

  // Überschrift ausblenden ab Phase N (Attribut titel-aus am ab-blatt): der Platz kommt dem Inhalt zugute
  const titelAus = parseFloat(blatt.getAttribute('titel-aus')) || Infinity;
  const titelWeg = ph => Number(ph) >= titelAus;
  const zeigeTitel = ph => document.body.classList.toggle('ohne-titel', titelWeg(ph));
  let phase = null;
  function setzePhase(p) {
    beende(); phase = p; zeigeTitel(p);
    for (const panel of panels) { panel.hidden = panel.phasen.length > 0 && !panel.phasen.includes(p); if (!panel.hidden && document.body.classList.contains('tafelansicht')) panel.start?.(); }
    druecke(phasenKnoepfe, phasenKnoepfe.find(b => b.phase === p));
    requestAnimationFrame(einpassen);
  }
  phasenKnoepfe.forEach(b => b.onclick = () => setzePhase(b.phase));

  // Tafelansicht: Layout ohne Scrollen.
  // Textblöcke haben immer die volle Breite (kein Springen). Schreibflächen sind SPALTEN ganze Kästchen breit; die
  // Kästchengröße c (ganze Pixel) ist für das ganze Blatt gleich und so gewählt, dass die höchste Phase noch passt.
  // Übrige Höhe der aktuellen Phase bekommt die letzte Karo-Fläche als zusätzliche ganze Zeilen.
  function einpassen() {
    const tafel = document.body.classList.contains('tafelansicht');
    const raster = flaechen.filter(f => f.raster);
    for (const p of panels) p.style.removeProperty('--breite');
    for (const f of raster) f.el.style.removeProperty('width');
    if (!tafel || !phasen.length) {
      for (const f of raster) { setzeZeilen(f, tafel ? f.min : f.druckZeilen, SPALTEN); zeichne(f); }
      return;
    }
    const gap = parseFloat(getComputedStyle(module).rowGap) || 0;
    const W = module.clientWidth, vorPhase = phase;
    const vorher = panels.map(p => p.hidden);
    const messe = ph => {
      const ps = panels.filter(p => !p.classList.contains('nur-druck') && (!p.phasen.length || p.phasen.includes(ph)));
      panels.forEach(p => { p.hidden = !ps.includes(p); });
      zeigeTitel(ph); const Hp = module.clientHeight;
      let fest = gap * Math.max(0, ps.length - 1), feste = 0, rasterZ = 0;
      for (const p of ps) {
        if (p.flaeche) {
          const t = p.querySelector('h2'); fest += t ? t.offsetHeight + 6 : 0;
          if (p.flaeche.raster) rasterZ += p.flaeche.min; else feste += p.anteil * SPALTEN / p.flaeche.verhaeltnis;
        } else fest += p.offsetHeight;
      }
      return { ps, fest, feste, rasterZ, H: Hp };
    };
    const daten = phasen.map(ph => [ph, messe(ph)]);
    panels.forEach((p, i) => { p.hidden = vorher[i]; });
    zeigeTitel(vorPhase);
    let c = Math.floor(W / SPALTEN);
    for (const [, d] of daten) if (d.feste + d.rasterZ) c = Math.min(c, Math.floor((d.H - d.fest) / (d.feste + d.rasterZ)));
    c = Math.max(8, c);
    // Karoflächen: so viele ganze Kästchen nebeneinander, wie in die Breite passen (mindestens SPALTEN)
    const spalten = SPALTEN;   // Folie ist fest: immer genau SPALTEN Kästchen breit, wie im Druck
    for (const p of panels) if (p.flaeche) if (!p.flaeche.tafelSpalten) p.style.setProperty('--breite', (p.flaeche.raster ? spalten : SPALTEN * p.anteil) * c + 'px');
    for (const f of raster) { setzeZeilen(f, f.min, f.tafelSpalten || spalten); if (f.tafelSpalten) f.el.style.width = f.tafelSpalten * c + 'px'; }
    const d = daten.find(x => x[0] === phase)?.[1];
    const letzte = d?.ps.filter(p => p.flaeche?.raster).at(-1);
    if (letzte) { const rest = Math.floor((d.H - d.fest - (d.feste + d.rasterZ) * c) / c); if (rest > 0) setzeZeilen(letzte.flaeche, letzte.flaeche.min + rest, letzte.flaeche.tafelSpalten || spalten); }
    raster.forEach(zeichne);
  }
  document.fonts?.ready.then(() => requestAnimationFrame(einpassen));
  new ResizeObserver(() => requestAnimationFrame(einpassen)).observe(module);

  // Folie skalieren: k passt die feste Folie (FB × FH) in den Bereich über der Leiste. Waagerecht mittig, oben
  // ausgerichtet; Restfläche seitlich (grau) bzw. unten bleibt frei. Der Stempel zeigt Version, Fenstergröße und Maßstab.
  function skaliere() {
    const k = Math.min(innerWidth / FB, (innerHeight - leiste.offsetHeight) / FH);
    document.body.style.setProperty('--k', k);
    document.body.style.setProperty('--x', Math.max(0, (innerWidth - FB * k) / 2) + 'px');   // Folie waagerecht mittig, grauer Rand beidseitig
    stempel.textContent = MOTOR + ' · ' + innerWidth + '×' + innerHeight + ' · ' + Math.round(k * 100) + ' %';
    stempel.title = 'Motorversion · Fenstergröße · Maßstab der Folie';
    lineal.neuBauen();
  }
  addEventListener('resize', skaliere);

  // Start
  document.title = (blatt.getAttribute('titel') || 'Tafelbild') + ' · Tafelbild';
  setzeModus('bedienen');
  skaliere();
  setzeAnsicht(false);
  if (phasen.length) setzePhase(phasen[0]);
  melde(hatStriche(eigen) ? 'Sitzung wiederhergestellt' : 'Leeres Blatt');
  bLoesung.setAttribute('aria-pressed', zeigeLoesung);
  ladeLoesung().then(() => { loesungVerfuegbar(); if (zeigeLoesung && !hatStriche(loesung)) { zeigeLoesung = false; bLoesung.setAttribute('aria-pressed', false); melde('Keine Musterlösung vorhanden'); } flaechen.forEach(zeichne); });
})();
