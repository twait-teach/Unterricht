import asyncio, base64
from playwright.async_api import async_playwright
CM=[l for l in open('/tmp/gg/cmds2.txt',encoding='utf-8').read().split('\n') if l.strip()]
CB=['cbDrei','cbEin','cbGanz']
POS={'tDrei':(3.9,2.05,2.4),'tEin':(1.3,0.35,2.4),'tGanz':(3.9,-1.4,2.4)}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--enable-unsafe-swiftshader']); pg=await b.new_page(viewport={'width':860,'height':500})
        await pg.goto('http://127.0.0.1:8831/app.html'); await pg.wait_for_function('window.ready===true',timeout=90000)
        for c in CM: await pg.evaluate('c=>ggbApplet.evalCommand(c)',c)
        js='''([cbs,P])=>{ const set=(n,fn)=>ggbApplet.evalXML(fn(ggbApplet.getXML(n)));
          cbs.forEach((n,i)=>set(n,x=>x.replace('<checkbox fixed="true"/>','<checkbox fixed="true"/><absoluteScreenLocation x="12" y="'+(12+i*32)+'"/>')));
          for(const n in P) set(n,x=>x.replace(/<startPoint[^>]*\\/>/,'').replace(/<font[^>]*\\/>/,'').replace(/<\\/element>/,'<font serif="false" sizeM="'+P[n][2]+'" size="0" style="0"/><startPoint x="'+P[n][0]+'" y="'+P[n][1]+'" z="1"/></element>')); }'''
        await pg.evaluate(js,[CB,POS]); await pg.wait_for_timeout(800)
        states=[[],['cbDrei'],['cbDrei','cbEin'],['cbDrei','cbEin','cbGanz']]
        for i,st in enumerate(states):
            for k in CB: await pg.evaluate('([k,v])=>ggbApplet.setValue(k,v)',[k,1 if k in st else 0])
            await pg.wait_for_timeout(400); await pg.screenshot(path=f'/tmp/gg/b{i}.png')
        for k in CB: await pg.evaluate('k=>ggbApplet.setValue(k,0)',k)
        d=await pg.evaluate('ggbApplet.getBase64()'); open('/tmp/gg/ganzes.ggb','wb').write(base64.b64decode(d)); print('ok')
        await b.close()
asyncio.run(main())
