// ASPLAYER 6.0.5 — synthetic, read-only performance baseline.
// No provider calls, login, passwords, real media or changes to app/.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { performance } = require('node:perf_hooks');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const APP_PATH = pathToFileURL(path.resolve('app/src/main/assets/index.html')).href;
const OUT_DIR = path.resolve('diagnostics-output');
fs.mkdirSync(OUT_DIR, {recursive:true});
const p95 = (values) => {
  if (!values.length) return null;
  const s = [...values].sort((a,b)=>a-b);
  return Number(s[Math.min(s.length - 1, Math.ceil(s.length * .95) - 1)].toFixed(1));
};
const round = (n) => Number(n.toFixed(1));
const git = (args) => { try { return execFileSync('git', args, {encoding:'utf8'}).trim(); } catch {return 'unknown';} };

(async()=>{
 const browser = await chromium.launch({
   ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {channel:'chrome'}),
   headless:true
 });
 const cases = [];
 try {
   for (const tv of [true,false]) {
     const errors=[];
     const page=await browser.newPage({
       viewport:tv?{width:1280,height:720}:{width:390,height:844},
       hasTouch:!tv
     });
     page.on('pageerror',err=>errors.push(err.message));
     await page.addInitScript(flag => {
       window.ASPLAYER={isAndroidTv:()=>flag};
       window.__diagLongTasks=[];
       try {
         new PerformanceObserver(list=>{
           for(const e of list.getEntries()) window.__diagLongTasks.push(Number(e.duration.toFixed(1)));
         }).observe({entryTypes:['longtask']});
       } catch(_) {}
     },tv);
     const loadStart=performance.now();
     await page.goto(APP_PATH,{waitUntil:'load'});
     await page.waitForFunction(()=>document.querySelector('#access-pin')?.isConnected && document.readyState==='complete');
     const shellLoadedMs=round(performance.now()-loadStart);
     const createStart=performance.now();
     await page.evaluate(()=>{
       document.querySelector('#auth-screen').classList.add('hidden');
       document.querySelector('#app-shell').classList.remove('hidden');
       document.querySelector('#view-home').classList.add('hidden');
       document.querySelector('#view-catalog').classList.remove('hidden');
       active='vod';category='one';filter='';operation++;
       catalog=Array.from({length:1200},(_,i)=>({
         stream_id:'test'+i,category_id:'one',name:'Title '+String(i).padStart(4,'0')
       }));
       filtered=catalog;
       window.ASPLAYER_REFRESH_WATCH?.();
       renderItems();
     });
     await page.waitForFunction(()=>document.querySelectorAll('#cards [data-item]').length===50);
     const initialCatalogMs=round(performance.now()-createStart);
     const initialNodes=await page.locator('#cards [data-item]').count();
     assert.equal(initialNodes,50);

     let navigations=0, navigationMs=null, navigationP95=null, peakNodes=initialNodes, mobileScrollMs=null;
     const samples=[];
     if(tv) {
       await page.locator('#cards [data-item="44"]').focus();
       const t0=performance.now();
       for(let i=45;i<=105;i++) {
         const itemStart=performance.now();
         await page.keyboard.press('ArrowDown');
         const focused=await page.evaluate(()=>Number(document.activeElement.dataset.item));
         assert.equal(focused,i,'DPAD must preserve exact focus order at '+i);
         const nodes=await page.locator('#cards [data-item]').count();
         peakNodes=Math.max(peakNodes,nodes);
         assert(nodes<=100,'TV DOM window must remain <=100');
         samples.push(performance.now()-itemStart);
         navigations++;
       }
       navigationMs=round(performance.now()-t0);
       navigationP95=p95(samples);
     } else {
       const pane=page.locator('#tv-content-pane');
       const t0=performance.now();
       for(let block=1;block<=5;block++) {
         await pane.evaluate(el=>{el.scrollTop=el.scrollHeight;});
         await page.waitForFunction(n=>Number(document.querySelector('#cards [data-item]:last-of-type')?.dataset.item)>=n,block*50);
         const nodes=await page.locator('#cards [data-item]').count();
         peakNodes=Math.max(peakNodes,nodes);
         assert(nodes<=100,'Mobile DOM window must remain <=100');
       }
       mobileScrollMs=round(performance.now()-t0);
     }

     const searchMs=await page.evaluate(()=>{
       filter='Title 1199';
       const start=performance.now();
       applyFilter();
       return Number((performance.now()-start).toFixed(1));
     });
     await page.waitForFunction(()=>document.querySelectorAll('#cards [data-item]').length===1);
     assert.match(await page.locator('#cards [data-item="0"]').innerText(),/1199/);
     const browserStats=await page.evaluate(()=>{
       const perf=performance;
       const firstPaint=perf.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint');
       return {
         firstContentfulPaintMs:firstPaint?Number(firstPaint.startTime.toFixed(1)):null,
         longTaskCount:window.__diagLongTasks.length,
         longTasksTotalMs:Number(window.__diagLongTasks.reduce((a,b)=>a+b,0).toFixed(1)),
         jsHeapUsedBytes:perf.memory?.usedJSHeapSize??null
       };
     });
     assert.deepEqual(errors,[],'No JS page exceptions');
     cases.push({
       scenario:tv?'Chromium TV 1280x720 keyboard':'Chromium mobile 390x844 touch',
       shellLoadedMs, initialCatalogMs, rowsInSyntheticCatalog:1200,
       initialRenderedCards:initialNodes,peakRenderedCards:peakNodes,
       dpads:navigations,dpadsTotalMs:navigationMs,dpadsP95WallMs:navigationP95,
       mobileScrollMs,filterRenderMs:searchMs,
       pageErrors:errors, ...browserStats
     });
     await page.close();
   }
 } finally { await browser.close(); }
 const report={
   diagnostic:'ASPLAYER 6.0.5 Chromium synthetic UI baseline',
   commit:git(['rev-parse','HEAD']), utc:new Date().toISOString(),
   methodology:'Local file WebView-style UI in headless Chromium. No IPTV network/media, no physical Android device. Numbers depend on runner and Playwright overhead.',
   results:cases
 };
 fs.writeFileSync(path.join(OUT_DIR,'baseline.json'),JSON.stringify(report,null,2)+'\n');
 const rows=cases.map(x=>
   '| '+x.scenario+' | '+x.shellLoadedMs+' ms | '+x.initialCatalogMs+' ms | '+
   x.peakRenderedCards+' | '+(x.dpadsP95WallMs===null?'—':x.dpadsP95WallMs+' ms')+
   ' | '+x.filterRenderMs+' ms | '+x.longTaskCount+' |'
 );
 const md=[
   '# ASPLAYER 6.0.5 — synthetic UI baseline',
   'Commit: '+report.commit+'  ',
   'UTC: '+report.utc,
   '',
   '| Scenario | Shell load | 1200-item catalog initial view | Peak rendered cards | DPAD wall p95 | Local filter render | Long tasks |',
   '|---|---:|---:|---:|---:|---:|---:|',...rows,'',
   '**Interpretation:** numbers are headless Chromium CI measurements, not performance on an Android phone, Android TV, IPTV provider or LibVLC player.',
   'DPAD wall latency includes Playwright automation and browser scheduling; use only for relative comparisons on comparable CI runs.',
   'No source files in app/ are changed by this diagnostic branch.',
   'Physical-device cold start, actual memory, streaming and stutter remain unmeasured.'
 ].join('\n');
 fs.writeFileSync(path.join(OUT_DIR,'baseline.md'),md+'\n');
 console.log(md);
})().catch(e=>{console.error(e);process.exitCode=1;});
