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
  const MOTOR = 'Motor 26.09.-12';   // Versionsstempel: in der Leiste sichtbar, damit klar ist, welche Datei der Browser lädt
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
        ggbLaden().then(() => new window.GGBApplet({ appName: 'classic', width: b || 800, height: h, filename: datei, showToolBar: false, showMenuBar: false,
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

  // ---------- Werkzeugleiste ----------
  const leiste = el('nav', 'leiste');
  const zurueck = el('a', 'zurueck', '←'); zurueck.title = 'Zur Übersicht';
  const von = new URLSearchParams(location.search).get('von');
  zurueck.href = wurzel + 'index.html' + (von ? '#' + von : '');
  const gruppe = (...k) => { const g = el('div', 'gruppe'); g.append(...k); return g; };
  const bTafel = knopf('Tafel'), bDruck = knopf('Druckansicht');
  const bBedienen = knopf('Bedienen'), bStift = knopf('Schreiben'), bRadierer = knopf('Radieren');
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
    zeile(zurueck, ...(phasenKnoepfe.length ? [gruppe(...phasenKnoepfe)] : []), gruppe(bNotizen), gruppe(bLoesung, bSichern)),
    zeile(gruppe(bTafel, bDruck), gruppe(bBedienen, bStift, bRadierer, bZurueck, bLeeren), gruppe(...farbKnoepfe), gruppe(bVoll, bDrucken), status, stempel));

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
  let modus = 'bedienen', farbe = FARBEN[0][0], aktiv = null, geaendert = false;
  const verlauf = [];
  const pfad = p => p.map((q, i) => (i ? 'L' : 'M') + q[0] + ',' + q[1]).join('') + (p.length === 1 ? 'l.01 .01' : '');

  function zeichne(f) {
    f.svg.replaceChildren();
    for (const striche of [zeigeLoesung ? loesung[f.id] || [] : [], eigen[f.id] || []]) for (const s of striche) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', pfad(s.p)); p.setAttribute('stroke', s.c);
      f.svg.append(p);
    }
  }
  function punkt(e, svg) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  }
  function abstand(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], n = dx * dx + dy * dy;
    const t = n ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / n)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function radiere(f, p) {
    const vorher = eigen[f.id] || [];
    const nachher = vorher.filter(s => !s.p.some((q, i) => abstand(p, q, s.p[Math.max(0, i - 1)]) < 13));
    if (nachher.length !== vorher.length) { eigen[f.id] = nachher; geaendert = true; zeichne(f); }
  }
  function beende(e) {
    if (!aktiv || (e && e.pointerId !== aktiv.id)) return;
    if (geaendert) speichern(); else verlauf.pop();
    aktiv = null; geaendert = false;
  }
  for (const f of flaechen) {
    zeichne(f);
    f.svg.addEventListener('pointerdown', e => {
      if (modus === 'bedienen' || aktiv || e.button !== 0) return;
      e.preventDefault();
      verlauf.push(JSON.stringify(eigen)); if (verlauf.length > 60) verlauf.shift();
      aktiv = { f, id: e.pointerId }; geaendert = false;
      f.svg.setPointerCapture(e.pointerId);
      const p = punkt(e, f.svg);
      if (modus === 'stift') { (eigen[f.id] ||= []).push({ p: [p], c: farbe }); geaendert = true; zeichne(f); }
      else radiere(f, p);
    });
    f.svg.addEventListener('pointermove', e => {
      if (!aktiv || aktiv.id !== e.pointerId || aktiv.f !== f) return;
      e.preventDefault();
      const events = e.getCoalescedEvents?.().length ? e.getCoalescedEvents() : [e];
      for (const ev of events) {
        const p = punkt(ev, f.svg);
        if (modus === 'stift') eigen[f.id].at(-1).p.push(p); else radiere(f, p);
      }
      if (modus === 'stift') zeichne(f);
    });
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) f.svg.addEventListener(t, beende);
  }

  // ---------- Bedienung ----------
  const druecke = (liste, aktivKnopf) => liste.forEach(b => b.setAttribute('aria-pressed', b === aktivKnopf));
  function setzeModus(m) {
    beende(); modus = m;
    document.body.dataset.modus = m;
    druecke([bBedienen, bStift, bRadierer], { bedienen: bBedienen, stift: bStift, radierer: bRadierer }[m]);
  }
  bBedienen.onclick = () => setzeModus('bedienen');
  bStift.onclick = () => setzeModus('stift');
  bRadierer.onclick = () => setzeModus('radierer');
  farbKnoepfe.forEach(b => b.onclick = () => { farbe = b.farbe; druecke(farbKnoepfe, b); setzeModus('stift'); });
  bZurueck.onclick = () => { beende(); if (verlauf.length) { eigen = JSON.parse(verlauf.pop()); flaechen.forEach(zeichne); speichern(); } };
  bLeeren.onclick = () => {
    beende();
    if (!confirm('Alle eigenen Anmerkungen und Notizen auf diesem Blatt löschen?')) return;
    eigen = {}; verlauf.length = 0; flaechen.forEach(zeichne);
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
