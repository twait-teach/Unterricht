"""GeoGebra-Datei bauen und prüfen (Beispiel: Bestimmung des Anteils). Immer mit der Classic-App (mächtigste Web-App)!
Ablauf: im Ordner  python3 -m http.server 8831  starten, dann  python3 bauen.py  (Playwright/Chromium nötig).
Baut per Befehlsdatei (anteil-befehle.txt), macht Screenshots je Häkchen-Zustand (s0..s4.png) und speichert anteil.ggb.
Regeln: Texte NIE mit dem Befehl Text(...) (verliert nach dem Speichern die LaTeX-Einstellung) – freie Texte "..." verwenden.
Danach die .ggb in frischer Sitzung laden (setBase64) und nochmals prüfen; Häkchen beim Speichern auf "aus".
"""
import asyncio, base64, json
from playwright.async_api import async_playwright
HTML='''<!doctype html><html><body style="margin:0"><div id="g"></div>
<script src="https://www.geogebra.org/apps/deployggb.js"></script>
<script>
window.ready=false;
new GGBApplet({appName:"classic",width:1100,height:480,showToolBar:false,showAlgebraInput:false,showMenuBar:false,showResetIcon:false,enableRightClick:false,enableShiftDragZoom:false,useBrowserForJS:true,appletOnLoad:()=>{window.ready=true;}},true).inject("g");
</script></body></html>'''
CMDS=open('anteil-befehle.txt',encoding='utf-8').read().strip().split('\n')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']); pg=await b.new_page(viewport={'width':1520,'height':540})
        await pg.goto('http://127.0.0.1:8831/app.html')
        await pg.wait_for_function('window.ready===true',timeout=90000)
        for c in CMDS:
            if not c.strip() or c.startswith('#'): continue
            r=await pg.evaluate('c=>ggbApplet.evalCommand(c)',c)
            if r is False: print('FEHLER bei:',c)
        js='''() => {
          const set=(n,fn)=>{ let x=ggbApplet.getXML(n); x=fn(x); ggbApplet.evalXML(x); };
          const cbs=[['cbJan',20],['cbMia',52],['cbGanzes',84],['cbAnteil',116]];
          for (const [n,y] of cbs) set(n,x=>x.replace('<checkbox fixed="true"/>','<checkbox fixed="true"/><absoluteScreenLocation x="1150" y="'+y+'"/>'));
          for (const [n,m] of [['tJan',2.4],['tMia',2.4],['tGanz',2.4],['tAnt',3.0]]) set(n,x=>x.includes('<font')?x.replace(/sizeM="[^"]*"/,'sizeM="'+m+'"'):x.replace(/<\/element>/,'<font serif="false" sizeM="'+m+'" size="0" style="0"/></element>'));
          const P={"tJan": [0.9, 2.75], "tMia": [7.3, 2.75], "tGanz": [4.6, 0.05], "tAnt": [3.6, -1.3]};
          for (const n in P) set(n,x=>x.replace(/<startPoint[^>]*\/>/,'').replace(/<\/element>/,'<startPoint x="'+P[n][0]+'" y="'+P[n][1]+'" z="1"/></element>'));
          set('tAnt',x=>x.replace('<element type="text"','<element type="text"').replace(/<\/element>/,'<isLaTeX val="true"/></element>'));
        }'''
        await pg.evaluate(js)
        await pg.wait_for_timeout(800)
        import sys
        for name,vals in [('s0',{}),('s1',{'cbJan':1}),('s2',{'cbJan':1,'cbMia':1}),('s3',{'cbJan':1,'cbMia':1,'cbGanzes':1}),('s4',{'cbJan':1,'cbMia':1,'cbGanzes':1,'cbAnteil':1})]:
            for k in ['cbJan','cbMia','cbGanzes','cbAnteil']:
                await pg.evaluate('([k,v])=>ggbApplet.setValue(k,v)',[k,vals.get(k,0)])
            await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'./{name}.png')
        for k in ['cbJan','cbMia','cbGanzes','cbAnteil']:
            await pg.evaluate('k=>ggbApplet.setValue(k,0)',k)
        data=await pg.evaluate('ggbApplet.getBase64()')
        open('./anteil.ggb','wb').write(base64.b64decode(data))
        print('ok',len(data))
        await b.close()
asyncio.run(main())
