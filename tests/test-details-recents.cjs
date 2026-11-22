const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
 try{
  for(const tv of [false,true]){
   const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://images.example.invalid/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150"><rect width="100" height="150" fill="blue"/></svg>'}));
   await page.addInitScript(tv=>{window.calls=[];window.ASPLAYER={isAndroidTv:()=>tv,playMedia:(...a)=>window.calls.push(['auto',...a]),playLiveMedia:(...a)=>window.calls.push(['manual',...a]),checkPlayUpdate:()=>window.ASPLAYER_UPDATE_RESULT('available',5922),openPlayUpdate:()=>window.calls.push(['store'])};},tv);
   await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
   await page.evaluate(()=>{
    loginPinAccepted=true;sessions[server().key]={user:'test',pass:'test',meta:{allowed_output_formats:['ts','m3u8']}};
    document.querySelector('#auth-screen').classList.add('hidden');document.querySelector('#app-shell').classList.remove('hidden');
    document.querySelector('#view-home').classList.add('hidden');document.querySelector('#view-catalog').classList.remove('hidden');
    cats=[{category_id:'1',category_name:'Films'},{category_id:'2',category_name:'Other'},{category_id:'3',category_name:'Adult'}];
    parentEnabled=true;active='vod';category='none';operation++;
    cached=async(action,extra)=>{
     if(action==='get_vod_info')return {info:{movie_image:'https://images.example.invalid/detail.svg',genre:'Comedy',duration:'100 min',plot:'Provider detail'}};
     if(action==='get_series_info')return {info:{cover:'https://images.example.invalid/series.svg',plot:'Series detail'},episodes:{1:[{id:'e1',title:'Episode one'}]}};
     if(extra.category_id==='3')throw Error('Adult category must not be queried');
     return extra.category_id==='1'?[{stream_id:'old',series_id:'s-old',name:'Old',added:'1700000000'},{stream_id:'new',series_id:'s-new',name:'Newest',added:'1760000000',cover:'https://images.example.invalid/card.svg'}]:[{stream_id:'mid',series_id:'s-mid',name:'Middle',added:'1750000000'},{stream_id:'new',series_id:'s-new',name:'Newest',added:'1760000000'},{stream_id:'unknown',series_id:'s-unknown',name:'Unknown',year:2026}];
    };renderCats();
   });
   assert.deepEqual(await page.locator('#categories button').evaluateAll(els=>els.slice(0,4).map(e=>e.dataset.category)),['__asplayer_continue__','__asplayer_history__','__asplayer_recent__','all']);
   await page.locator('[data-category="__asplayer_recent__"]').click();
   await page.waitForFunction(()=>filtered.length===3&&document.querySelector('#all-global-status').textContent.includes('300'));
   assert.deepEqual(await page.evaluate(()=>filtered.map(x=>x.stream_id)),['new','mid','old']);
   if(tv){await page.locator('#search').focus();await page.keyboard.press('Enter');}
   await page.locator('#search').fill('Middle');await page.waitForFunction(()=>filtered.length===1);
   await page.evaluate(()=>{filter='';applyFilter();});
   await page.locator('#cards [data-item="0"]').click();
   await page.waitForFunction(()=>document.querySelector('.detail-art img').src.endsWith('detail.svg'));
   assert.equal(await page.locator('#details-modal .detail-art').isVisible(),true);
   assert.equal(await page.locator('#detail-plot').innerText(),'Provider detail');
   await page.locator('#detail-close').click();
   await page.evaluate(()=>{active='series';category='none';operation++;renderCats();});
   await page.locator('[data-category="__asplayer_recent__"]').click();
   await page.waitForFunction(()=>filtered.length===3&&document.querySelector('#all-global-status').textContent.includes('300'));
   await page.locator('#cards [data-item="0"]').click();
   await page.waitForFunction(()=>document.querySelector('.detail-art img').src.endsWith('series.svg'));
   assert.equal(await page.locator('#episodes [data-episode]').count(),1);
   await page.locator('#detail-close').click();
   await page.evaluate(()=>{active='live';category='none';operation++;renderCats();});
   assert.equal(await page.locator('[data-category="__asplayer_recent__"]').count(),0);
   assert.equal(await page.locator('#live-stream-format').inputValue(),'default');
   await page.evaluate(()=>{settings.bufferProfile='adaptive';play({stream_id:'1',name:'Live'},'live');settings.liveFormat='hls';play({stream_id:'2',name:'Live'},'live');settings.liveFormat='mpegts';play({stream_id:'3',name:'Live'},'live');});
   const calls=await page.evaluate(()=>window.calls.filter(c=>['auto','manual'].includes(c[0])).map(c=>[c[0],c[1].split('/').pop()]));
   assert.deepEqual(calls,[['auto','1.m3u8'],['manual','2.m3u8'],['manual','3.ts']]);
   await page.evaluate(()=>window.ASPLAYER_UPDATE_RESULT('available',5922));
   assert.match(await page.locator('#view-home section.box').first().innerText(),/new version/i);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: Recent menu/order/filter, missing dates, movie and series artwork, live transport and update notice on mobile and TV layouts');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
