/* Portal-Gerüst – Navigation und Anzeige.
   Enthält KEINE Inhalte. Inhalte liegen als kleine Moduldateien:
     faecher.js                          → Portal.faecher([...])  (Fächer und Klassen)
     physik/klasse-9/inhalt.js           → Portal.klasse({...})   (Inhaltsverzeichnis)
     physik/klasse-9/01-energie/kapitel.js → Portal.kapitel({...}) (Materialien)
   Moduldateien werden erst geladen, wenn sie gebraucht werden. */
'use strict';

const Portal = (() => {
  const ROLLEN = [
    ['hefteintrag', 'Hefteintrag'],
    ['einstieg', 'Einstieg'],
    ['uebung', 'Übung / Arbeitsblatt'],
    ['vertiefung', 'Vertiefung & Links'],
    ['loesung', 'Lösung'],
    ['sonstiges', 'Weiteres Material'],
  ];
  const TYPEN = { seite: 'Öffnen', tafelbild: 'Tafelbild', link: 'Link', pptx: 'PowerPoint', docx: 'Word', pdf: 'PDF', bild: 'Bild' };

  let faecherListe = [];
  let klassenListe = [];   // alle Klassen aller Fächer, jeweils mit .fach
  const klassen = {};   // ordner → Inhaltsverzeichnis
  const kapitel = {};   // ordner → Materialien
  const ladevorgaenge = {};

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // Ordner der gerade ausgeführten Moduldatei – so muss keine Datei ihren eigenen Pfad kennen.
  function ordnerDesSkripts() {
    const src = document.currentScript.getAttribute('src');
    return src.slice(0, src.lastIndexOf('/'));
  }

  function lade(src) {
    return ladevorgaenge[src] ||= new Promise((ok, fehler) => {
      const s = document.createElement('script');
      s.src = src + '?v=' + Date.now().toString(36).slice(0, -4); // Cache nach Änderungen umgehen
      s.onload = ok;
      s.onerror = () => { delete ladevorgaenge[src]; fehler(new Error(src)); };
      document.head.append(s);
    });
  }

  // ---------- Registrierung durch Moduldateien ----------
  function registriereFaecher(liste) {
    faecherListe = liste;
    klassenListe = liste.flatMap(f => f.klassen.map(k => ({ ...k, fach: f })));
    start();
  }
  function registriereKlasse(daten) { klassen[ordnerDesSkripts()] = daten; }
  function registriereKapitel(daten) { kapitel[ordnerDesSkripts()] = daten; }

  // ---------- Adresse: #ph9  bzw.  #ph9/1 ----------
  function leseAdresse() {
    const [k, t] = decodeURIComponent(location.hash.slice(1)).split('/');
    return { klasseId: k || klassenListe[0]?.id, themaNr: t };
  }

  async function zeige() {
    const { klasseId, themaNr } = leseAdresse();
    const klasse = klassenListe.find(k => k.id === klasseId) || klassenListe[0];
    zeichneKlassen(klasse);
    try { await lade(klasse.ordner + '/inhalt.js'); }
    catch { return meldung('Das Inhaltsverzeichnis von ' + klasse.name + ' fehlt.', klasse.ordner + '/inhalt.js'); }
    const inhalt = klassen[klasse.ordner];
    // Inhaltsverzeichnis mit Teilen (Physik) oder direkt mit Kapiteln (Mathematik)
    if (!inhalt.teile) inhalt.teile = [{ id: '', name: '', themen: inhalt.themen || [] }];
    const themen = inhalt.teile.flatMap(t => t.themen.map(th => ({ ...th, teil: t })));
    const thema = themen.find(t => String(t.nr) === themaNr) || themen[0];
    zeichneBaum(klasse, inhalt, thema);
    await zeichneThema(klasse, thema);
  }

  function zeichneKlassen(aktiv) {
    const nav = $('klassen');
    nav.replaceChildren(...faecherListe.map(f => {
      const gruppe = el('div', 'fach');
      if (f.name === aktiv.fach.name) gruppe.classList.add('aktiv');
      gruppe.append(el('span', 'fach-name', f.name));
      for (const k of klassenListe.filter(k => k.fach.name === f.name)) {
        const a = el('a', null, k.name);
        a.href = '#' + k.id;
        a.title = f.name + ' ' + k.name;
        if (k.id === aktiv.id) a.setAttribute('aria-current', 'page');
        gruppe.append(a);
      }
      return gruppe;
    }));
    $('fach').textContent = aktiv.fach.name;
    document.title = aktiv.fach.name + ' ' + aktiv.name + ' · Gymnasium Dorfen';
  }

  function zeichneBaum(klasse, inhalt, aktiv) {
    const baum = $('baum');
    baum.replaceChildren();
    for (const teil of inhalt.teile) {
      const block = el('div', 'teil');
      if (teil.name) block.append(el('div', 'teil-name', teil.id + '  ' + teil.name));
      for (const th of teil.themen) {
        const a = el('a', 'thema' + (th.ordner ? ' hat-material' : ''));
        a.href = '#' + klasse.id + '/' + th.nr;
        a.append(el('span', 'nr', th.nr), el('span', null, th.name));
        if (th.nr === aktiv.nr) a.setAttribute('aria-current', 'page');
        block.append(a);
      }
      baum.append(block);
    }
  }

  async function zeichneThema(klasse, thema) {
    const main = $('inhalt');
    const kopf = el('header', 'thema-kopf');
    const pfad = klasse.fach.name + ' ' + klasse.name + (thema.teil.name ? ' › ' + thema.teil.id + ' ' + thema.teil.name : '');
    kopf.append(el('div', 'pfad', pfad), el('h1', null, thema.nr + ' ' + thema.name));
    main.replaceChildren(kopf);

    if (!thema.ordner) {
      main.append(el('p', 'leer', 'Für dieses Kapitel ist noch kein Material hinterlegt.'));
      return;
    }
    const ordner = klasse.ordner + '/' + thema.ordner;
    try { await lade(ordner + '/kapitel.js'); }
    catch { return meldung('Die Kapiteldatei fehlt.', ordner + '/kapitel.js'); }

    const von = klasse.id + '/' + thema.nr;
    for (const abschnitt of kapitel[ordner].abschnitte) {
      const sec = el('section', 'abschnitt');
      sec.append(el('h2', null, abschnitt.titel));
      for (const [rolle, label] of ROLLEN) {
        const mats = abschnitt.materialien.filter(m => (m.rolle || 'sonstiges') === rolle);
        if (!mats.length) continue;
        sec.append(el('h3', 'rolle', label));
        const liste = el('ul', 'materialien');
        mats.forEach(m => liste.append(karte(m, ordner, von)));
        sec.append(liste);
      }
      main.append(sec);
    }
  }

  function karte(m, ordner, von) {
    const li = el('li');
    const typ = m.typ || (m.datei ? m.datei.split('.').pop() : null);
    if (!m.datei && !m.url) {
      li.className = 'karte offen';
      li.append(el('span', 'titel', m.titel), el('span', 'art', m.hinweis || 'folgt'));
      return li;
    }
    const a = el('a', 'karte');
    if (m.url) { a.href = m.url; a.target = '_blank'; a.rel = 'noopener'; }
    else if (typ === 'seite' || typ === 'tafelbild') a.href = ordner + '/' + m.datei + '?von=' + encodeURIComponent(von);
    else { a.href = ordner + '/' + m.datei; a.setAttribute('download', ''); }
    a.append(el('span', 'titel', m.titel), el('span', 'art art-' + typ, TYPEN[typ] || typ));
    li.append(a);
    return li;
  }

  function meldung(text, datei) {
    const p = el('p', 'fehler', text + ' Erwartet wird die Datei ');
    p.append(el('code', null, datei), '.');
    $('inhalt').append(p);
  }

  function start() {
    window.addEventListener('hashchange', zeige);
    zeige();
  }

  return { faecher: registriereFaecher, klasse: registriereKlasse, kapitel: registriereKapitel };
})();
