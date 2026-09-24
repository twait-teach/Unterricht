/* Tafelbild-Motor.
   Ein Tafelbild ist eine kleine HTML-Datei mit Bausteinen (siehe BAUPLAN.md):
     <ab-blatt titel="…" kapitel="…" phasen="Versuch|Messung|Auswertung">
       <ab-versuch phase="1" titel="…" bild="…">Idee …</ab-versuch> …
     </ab-blatt>
     <script src="../../../kern/tafel.js"></script>
   Dieser Motor baut daraus Werkzeugleiste, Tafelansicht, Druckansicht und Schreibflächen.
   Tafelbilder selbst enthalten nie Logik – Änderungen am Verhalten nur hier. */
'use strict';
(() => {
  const NS = 'http://www.w3.org/2000/svg';
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
    f.hoehe = 1000 / v;
    f.el.style.setProperty('--v', v);
    f.svg.setAttribute('viewBox', '0 0 1000 ' + f.hoehe);
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
    karo(q) {
      const f = neueFlaeche(q, zahl(q.getAttribute('verhaeltnis'), 2));
      const n = zahl(q.getAttribute('kaestchen'), 40), k = 1000 / n, id = 'karo-' + f.id;
      const svg = document.createElementNS(NS, 'svg');
      svg.classList.add('raster');
      svg.setAttribute('viewBox', '0 0 1000 ' + f.hoehe);
      svg.innerHTML = `<defs><pattern id="${id}-k" width="${k}" height="${k}" patternUnits="userSpaceOnUse"><path d="M${k} 0H0V${k}" fill="none" stroke="#bac4cd" stroke-width="1"/></pattern>
        <pattern id="${id}-g" width="${5 * k}" height="${5 * k}" patternUnits="userSpaceOnUse"><rect width="${5 * k}" height="${5 * k}" fill="url(#${id}-k)"/><path d="M${5 * k} 0H0V${5 * k}" fill="none" stroke="#8e9ca9" stroke-width="1.3"/></pattern></defs>
        <rect x=".5" y=".5" width="999" height="${f.hoehe - 1}" fill="url(#${id}-g)" stroke="#8e9ca9"/>`;
      f.el.prepend(svg);
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
    merksatz: q => ({ el: el('div', 'merksatz', q.innerHTML) }),
    text: q => ({ el: el('div', 'textblock', q.innerHTML) }),
  };

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
      panel.append(h2);
    }
    panel.append(teil.el);
    if (q.getAttribute('nur')) panel.classList.add('nur-' + q.getAttribute('nur'));
    if (q.getAttribute('druckbreite')) panel.style.setProperty('--druckbreite', q.getAttribute('druckbreite'));
    panel.phasen = (q.getAttribute('phase') || '').split(/[\s,]+/).filter(Boolean);
    panel.flaeche = teil.svg ? teil : null;
    panels.push(panel);
    module.append(panel);
  }
  raender[0][0].click();

  const randZu = knopf('×', 'Randspalte ein-/ausblenden', 'rand-zu');
  rand.append(randZu, reiter, ...raender.map(r => r[1]));
  buehne.append(rand, module);
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
  const bVoll = knopf('Vollbild'), bDrucken = knopf('Drucken');
  const status = el('span', 'status');
  leiste.append(zurueck, gruppe(bTafel, bDruck), gruppe(bBedienen, bStift, bRadierer, bZurueck, bLeeren), gruppe(...farbKnoepfe));
  if (phasenKnoepfe.length) leiste.append(gruppe(...phasenKnoepfe));
  leiste.append(gruppe(bVoll, bDrucken), status);

  blatt.replaceWith(bogen);
  document.body.append(leiste);
  document.body.classList.add('tafel');

  // ---------- Speicher ----------
  // Ebenen: "eigen" = was auf diesem Gerät geschrieben wird (localStorage).
  //         "lehrer" = veröffentlichtes Tafelbild aus tafelbild.json im selben Ordner (nur lesen).
  const SCHLUESSEL = 'tafel:' + location.pathname;
  let eigen = {}, lehrer = {};
  try { eigen = JSON.parse(localStorage.getItem(SCHLUESSEL))?.eigen || {}; } catch { /* leer beginnen */ }
  fetch('tafelbild.json').then(r => r.ok ? r.json() : null).then(d => { if (d?.eigen) { lehrer = d.eigen; flaechen.forEach(zeichne); } }).catch(() => {});

  function speichern() {
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 1, eigen })); melde('Auf diesem Gerät gespeichert'); }
    catch { melde('Speichern nicht möglich – vor dem Schließen drucken'); }
  }
  const melde = t => { status.textContent = t; status.title = t; };

  // ---------- Stift ----------
  let modus = 'bedienen', farbe = FARBEN[0][0], aktiv = null, geaendert = false;
  const verlauf = [];
  const pfad = p => p.map((q, i) => (i ? 'L' : 'M') + q[0] + ',' + q[1]).join('') + (p.length === 1 ? 'l.01 .01' : '');

  function zeichne(f) {
    f.svg.replaceChildren();
    for (const striche of [lehrer[f.id] || [], eigen[f.id] || []]) for (const s of striche) {
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
    try { localStorage.removeItem(SCHLUESSEL); } catch { /* egal */ }
    melde('Anmerkungen gelöscht');
  };

  function setzeAnsicht(druck) {
    beende();
    document.body.classList.toggle('druckansicht', druck);
    document.body.classList.toggle('tafelansicht', !druck);
    druecke([bTafel, bDruck], druck ? bDruck : bTafel);
    requestAnimationFrame(einpassen);
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
  randZu.onclick = () => { document.body.classList.toggle('ohne-rand'); randZu.textContent = document.body.classList.contains('ohne-rand') ? '›' : '×'; requestAnimationFrame(einpassen); };

  function setzePhase(p) {
    beende();
    for (const panel of panels) panel.hidden = panel.phasen.length > 0 && !panel.phasen.includes(p);
    druecke(phasenKnoepfe, phasenKnoepfe.find(b => b.phase === p));
    requestAnimationFrame(einpassen);
  }
  phasenKnoepfe.forEach(b => b.onclick = () => setzePhase(b.phase));

  // Tafelansicht: sichtbare Bausteine so groß wie möglich, ohne zu scrollen.
  function einpassen() {
    const sichtbar = panels.filter(p => !p.hidden);
    for (const p of panels) p.style.removeProperty('--breite');
    if (!document.body.classList.contains('tafelansicht') || !phasen.length) return;
    const gap = parseFloat(getComputedStyle(module).rowGap) || 0;
    let fest = gap * Math.max(0, sichtbar.length - 1), anteile = 0;
    for (const p of sichtbar) {
      const titel = p.querySelector('h2');
      fest += titel ? titel.getBoundingClientRect().height + 6 : 0;
      if (p.flaeche) anteile += 1 / p.flaeche.verhaeltnis; else fest += p.lastChild.getBoundingClientRect().height;
    }
    const breite = Math.max(200, Math.min(module.clientWidth, anteile ? (module.clientHeight - fest) / anteile : module.clientWidth));
    for (const p of sichtbar) p.style.setProperty('--breite', breite + 'px');
  }
  new ResizeObserver(() => requestAnimationFrame(einpassen)).observe(module);

  // Start
  document.title = (blatt.getAttribute('titel') || 'Tafelbild') + ' · Tafelbild';
  setzeModus('bedienen');
  setzeAnsicht(false);
  if (phasen.length) setzePhase(phasen[0]);
  melde(Object.keys(eigen).length ? 'Gespeicherte Anmerkungen geladen' : 'Bereit');
})();
