#!/usr/bin/env python3
"""Prüft Tafelbilder automatisch (Playwright + Chromium). Aufruf im Projektordner:
   python werkzeuge/tafel-pruefen.py mathematik/klasse-6/01-brueche/berechnung-des-ganzen.html [weitere.html] [--bilder]
Die Folie ist fest (1600 x 1000) und wird nur skaliert. Geprüft wird je Bildschirmgröße und Phase:
 - Anordnung in Folienpixeln auf ALLEN Bildschirmgrößen identisch (Kern der Regel "überall gleich")
 - nichts ragt aus der Folie, kein Scrollen, Folie vollständig sichtbar
 - Überschrift > Zwischentitel > Text
 - Karo: ganze Kästchen, Gitter sichtbar (Bildpunkte gezählt), Spaltenzahl 35
 - Ausnutzung des Bildschirms (Hinweis), Druck = eine A4-Seite
Zugangsschutz wird für den Test ausgeblendet. Bilder: /tmp/pruef_*.png"""
import os
import io, re, sys, os, asyncio, json, threading, socketserver, http.server
from playwright.async_api import async_playwright

# (Breite, Höhe, Pixeldichte, Name): Surface Pro 7 (Vollbild / mit Browserleiste), ThinkPad 16:9, Desktop
GROESSEN = [(1368, 912, 1, 'Surface Vollbild 3:2'), (1368, 760, 1, 'Surface mit Browserleiste'), (1280, 720, 1.5, 'ThinkPad 16:9'),
            (1920, 1080, 1, 'Desktop 16:9'), (1900, 800, 1, 'Desktop breites Fenster'), (1024, 768, 1, 'kleines Fenster 4:3')]
wurzel = os.getcwd()
seiten = [a for a in sys.argv[1:] if not a.startswith('--')]
bilder = '--bilder' in sys.argv

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=wurzel, **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

JS = """() => {
  const b = document.querySelector('.bogen'), m = document.querySelector('.module'), fs = e => parseFloat(getComputedStyle(e).fontSize);
  const k = new DOMMatrix(getComputedStyle(b).transform).a, br = b.getBoundingClientRect(), mr = m.getBoundingClientRect();
  const ps = [...m.children].filter(c => !c.hidden);
  const r = { k, scroll: m.scrollHeight - m.clientHeight, h1: fs(document.querySelector('h1')),
    folie: [br.left, br.top, br.right, br.bottom], vw: innerWidth, vh: innerHeight, leiste: document.querySelector('.leiste').offsetHeight,
    stempel: document.querySelector('.stempel')?.textContent, blocks: [] };
  for (const p of ps) {
    const f = p.querySelector('.flaeche'), t = p.querySelector('.textblock,.merksatz'), h2 = p.querySelector('h2'), pr = p.getBoundingClientRect();
    const g = f && f.querySelector('svg.raster');
    r.blocks.push({ pos: [Math.round((pr.left - mr.left) / k), Math.round((pr.top - mr.top) / k), Math.round(pr.width / k), Math.round(pr.height / k)],
      h2: h2 ? fs(h2) : null, text: t ? fs(t) : null,
      zelle: g ? (f.offsetWidth / (g.viewBox.baseVal.width / (1000 / 35))) : null, spalten: g ? Math.round(g.viewBox.baseVal.width / (1000 / 35)) : null,
      bottom: Math.round((pr.bottom - mr.top) / k) });
  }
  r.mH = m.clientHeight;
  return r; }"""

async def main():
    fehler = 0
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for seite in seiten:
            url = f'http://127.0.0.1:{port}/{seite}'
            name = seite.split('/')[-1]
            fingerabdruck = {}
            for (w, h, dsf, gname) in GROESSEN:
                pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dsf)
                await pg.route('**/kern/zugang.js*', lambda r: r.fulfill(body='window.Zugang={};', content_type='text/javascript'))
                await pg.goto(url); await pg.wait_for_timeout(700)
                knoepfe = pg.locator('.leiste .zeile:first-child .gruppe button', has_text=re.compile(r'^\d ')); n = await knoepfe.count()
                for i in range(max(n, 1)):
                    if n: await knoepfe.nth(i).click(); await pg.wait_for_timeout(300)
                    r = await pg.evaluate(JS); pr = []
                    fl, ft, fr, fb = r['folie']
                    if fr > r['vw'] + 1 or fb > r['vh'] - r['leiste'] + 1: pr.append('Folie ragt über den Bildschirm')
                    if r['scroll'] > 1: pr.append(f"Inhalt zu hoch (scrollt um {r['scroll']} px)")
                    if any(x['bottom'] > r['mH'] + 1 for x in r['blocks']): pr.append('Block ragt aus der Folie')
                    for x in r['blocks']:
                        if x['text'] and not (r['h1'] > x['h2'] > x['text'] if x['h2'] else r['h1'] > x['text']):
                            pr.append(f"Überschrift nicht größer als Text (h1 {r['h1']:.0f}, h2 {x['h2']}, Text {x['text']:.0f})")
                        if x['zelle'] is not None:
                            if abs(x['zelle'] - round(x['zelle'])) > .01: pr.append(f"Kästchen nicht ganzzahlig: {x['zelle']:.2f}")
                            if not 6 <= x['spalten'] <= 35: pr.append(f"Spaltenzahl {x['spalten']} unzulässig")
                    try:
                        from PIL import Image
                        for el in await pg.locator('.panel:not([hidden]) svg.raster').all():
                            im = Image.open(io.BytesIO(await el.screenshot())).convert('RGB')
                            px = im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()
                            anteil = sum(1 for c in px if abs(c[0] - 180) < 30 and abs(c[1] - 192) < 30 and abs(c[2] - 203) < 30) / len(px)
                            if anteil < 0.02: pr.append(f'Karo-Gitter nicht sichtbar (Anteil {anteil:.3f})')
                    except ImportError: pass
                    print('   ', gname, i+1, [x['pos']+[x['zelle']] for x in r['blocks']]) if os.environ.get('DBG') else None; fingerabdruck.setdefault(i, {})[gname] = json.dumps([x['pos'] + [x['zelle']] for x in r['blocks']])
                    nutz_b = (fr - fl) / r['vw']; nutz_h = (fb - ft) / (r['vh'] - r['leiste'])
                    print(('FEHLER ' if pr else 'ok     ') + f'{name} {gname} ({w}x{h}) Phase {i+1}: Folie {r["k"]*100:.0f} %, Breite {nutz_b*100:.0f} %, Höhe {nutz_h*100:.0f} %'
                          + (' – ' + '; '.join(sorted(set(pr))) if pr else ''))
                    fehler += bool(pr)
                    if bilder: await pg.screenshot(path=f'/tmp/pruef_{w}x{h}_p{i+1}.png')
                await pg.close()
            for i, d in fingerabdruck.items():
                L = [json.loads(v) for v in d.values()]
                def gleich(a, b): return len(a) == len(b) and all(len(x) == len(y) and all((abs(u - v) <= 2 if u is not None and v is not None else u == v) for u, v in zip(x, y)) for x, y in zip(a, b))
                if not all(gleich(L[0], o) for o in L[1:]):
                    print(f'FEHLER Phase {i+1}: Anordnung unterscheidet sich zwischen Bildschirmgrößen'); fehler += 1
            pg = await b.new_page(viewport={'width': 1368, 'height': 912})
            await pg.route('**/kern/zugang.js*', lambda r: r.fulfill(body='window.Zugang={};', content_type='text/javascript'))
            await pg.goto(url); await pg.wait_for_timeout(700)
            await pg.emulate_media(media='print'); await pg.pdf(path='/tmp/pruef_druck.pdf', format='A4', print_background=True)
            seitenzahl = len(re.findall(rb'/Type\s*/Page[^s]', open('/tmp/pruef_druck.pdf', 'rb').read()))
            print(('ok     ' if seitenzahl == 1 else 'FEHLER ') + f'{name} Druck: {seitenzahl} Seite(n) A4'); fehler += seitenzahl != 1
        await b.close()
    print('\nGESAMT:', 'alles in Ordnung' if not fehler else f'{fehler} Problem(e)')
asyncio.run(main())
