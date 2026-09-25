#!/usr/bin/env python3
"""Prüft ein Tafelbild automatisch (Playwright + Chromium). Aufruf:
   cd <Projektordner> ; python werkzeuge/tafel-pruefen.py mathematik/klasse-6/01-brueche/berechnung-des-ganzen.html [--bilder]
Prüft je Bildschirmgröße und Phase: kein Scrollen, Überschriften größer als Text, gleich große ganze Kästchen,
Breite genutzt, dazu die Druckansicht (Seitenzahl). Zugangsschutz wird für den Test ausgeblendet."""
import asyncio, http.server, socketserver, threading, sys, os, re, functools
from playwright.async_api import async_playwright

GROESSEN = [(1368, 912), (1368, 760), (1280, 800), (1024, 768)]   # Surface Pro 7 (200 %) mit/ohne Browserleiste u. a.
wurzel = os.getcwd()
seiten = [a for a in sys.argv[1:] if not a.startswith('--')]
bilder = '--bilder' in sys.argv

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=wurzel,**k)
    def log_message(s,*a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

JS = """() => {
  const m = document.querySelector('.module'), fs = e => parseFloat(getComputedStyle(e).fontSize);
  const ps = [...m.children].filter(c => !c.hidden);
  const r = { scroll: m.scrollHeight - m.clientHeight, modulW: m.clientWidth, h1: fs(document.querySelector('h1')), blocks: [] };
  for (const p of ps) {
    const f = p.querySelector('.flaeche'), t = p.querySelector('.textblock,.merksatz'), h2 = p.querySelector('h2');
    r.blocks.push({ w: p.getBoundingClientRect().width, bottom: p.getBoundingClientRect().bottom, h2: h2 ? fs(h2) : null, text: t ? fs(t) : null,
      zelle: f && f.querySelector('svg.raster') ? f.getBoundingClientRect().width / 35 : null });
  }
  r.mBottom = m.getBoundingClientRect().bottom;
  return r; }"""

async def main():
    fehler = 0
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for seite in seiten:
            url = f'http://127.0.0.1:{port}/{seite}'
            for (w, h) in GROESSEN:
                pg = await b.new_page(viewport={'width': w, 'height': h})
                await pg.route('**/kern/zugang.js*', lambda r: r.fulfill(body='window.Zugang={};', content_type='text/javascript'))
                await pg.goto(url); await pg.wait_for_timeout(600)
                knoepfe = pg.locator('.leiste .zeile:first-child .gruppe button', has_text=re.compile(r'^\d ')); n = await knoepfe.count()
                zellen = set()
                for i in range(max(n, 1)):
                    if n: await knoepfe.nth(i).click(); await pg.wait_for_timeout(250)
                    r = await pg.evaluate(JS); pr = []; hinweise = set()
                    if r['scroll'] > 1: pr.append(f"scrollt um {r['scroll']} px")
                    if r['mBottom'] < max([x['bottom'] for x in r['blocks']] or [0]) - 1: pr.append('Inhalt ragt über den Bereich')
                    for x in r['blocks']:
                        if x['text'] and not (r['h1'] > x['h2'] > x['text'] if x['h2'] else r['h1'] > x['text']): pr.append(f"Überschrift nicht größer als Text (h1 {r['h1']:.0f}, h2 {x['h2']}, Text {x['text']:.0f})")
                        if x['zelle'] is not None:
                            zellen.add(round(x['zelle'], 2))
                            if abs(x['zelle'] - round(x['zelle'])) > .01: pr.append(f"Kästchen nicht ganzzahlig: {x['zelle']:.2f}")
                            if x['w'] < r['modulW'] * 0.85: hinweise.add(f"Breite nur {x['w']:.0f} von {r['modulW']} px genutzt (Höhe begrenzt)")
                    print(('FEHLER ' if pr else 'ok     ') + f'{seite.split("/")[-1]} {w}x{h} Phase {i+1}: Kästchen {sorted(zellen)}' + (' – ' + '; '.join(sorted(set(pr))) if pr else '') + (' [Hinweis: ' + '; '.join(sorted(hinweise)) + ']' if hinweise else ''))
                    fehler += bool(pr)
                    if bilder: await pg.screenshot(path=f'/tmp/pruef_{w}x{h}_p{i+1}.png')
                if len(zellen) > 1: print(f'FEHLER Kästchengröße wechselt zwischen Blöcken/Phasen: {sorted(zellen)}'); fehler += 1
                await pg.close()
            pg = await b.new_page(viewport={'width': 1368, 'height': 912})
            await pg.route('**/kern/zugang.js*', lambda r: r.fulfill(body='window.Zugang={};', content_type='text/javascript'))
            await pg.goto(url); await pg.wait_for_timeout(600)
            await pg.emulate_media(media='print'); await pg.pdf(path='/tmp/pruef_druck.pdf', format='A4', print_background=True)
            seitenzahl = len(re.findall(rb'/Type\s*/Page[^s]', open('/tmp/pruef_druck.pdf', 'rb').read()))
            print(('ok     ' if seitenzahl == 1 else 'FEHLER ') + f'Druck: {seitenzahl} Seite(n) A4'); fehler += seitenzahl != 1
        await b.close()
    print('\nGESAMT:', 'alles in Ordnung' if not fehler else f'{fehler} Problem(e)')
asyncio.run(main())
