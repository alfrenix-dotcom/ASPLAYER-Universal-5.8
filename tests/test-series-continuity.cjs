const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
 try {
  for(const tv of [false,true]){
   const errors=[];
   const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
   page.on('pageerror',err=>errors.push(err.message));
   await page.addInitScript(tv=>{
    window.calls=[];
    window.ASPLAYER={
      isAndroidTv:()=>tv,isRemoteNavigation:()=>tv,
      playMedia:(...args)=>window.calls.push(['media',...args]),
      setSeriesNavigation:(...args)=>window.calls.push(['nav',...args]),
      stopMedia:()=>window.calls.push(['stop']),
      setUiLanguage:()=>{},setPlaybackOptions:()=>{},setDecoderMode:()=>{},
      supportsPremiumGlass:()=>true,getPerformanceTier:()=>tv?'efficient':'complete'
    };
   },tv);
   const root=path.resolve('app/src/main/assets');
   await page.route('http://asplayer.test/**',r=>{
    const f=path.join(root,new URL(r.request().url()).pathname);
    return fs.existsSync(f)?r.fulfill({path:f}):r.abort();
   });
   await page.route('https://images.example.invalid/**',r=>r.fulfill({
    contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="180" height="105"><rect width="180" height="105" fill="teal"/></svg>'
   }));
   await page.goto('http://asplayer.test/index.html');
   await page.evaluate(()=>{
    loginPinAccepted=true;
    sessions[server().key]={user:'test',pass:'test'};
    lang='es';languageUI();
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-catalog').classList.remove('hidden');
    active='series';cats=[{category_id:'7',category_name:'Drama'}];parentEnabled=false;category='none';
    store(HISTORY_KEY,{[sessionPrefix()]:{
      live:[],vod:[],series:[{
       id:'101',title:'Chicago Fire · Pilot',mode:'series',position:120,duration:1400,finished:false,
       watchedAt:Date.now(),item:{id:'101',seriesId:'SERIES-7',seriesName:'Chicago Fire',category_id:'7',title:'Pilot'}
      }]
    }});
    cached=async(action,params)=>{
     if(action==='get_series_info')return {
      info:{plot:'Series synopsis'},
      episodes:{
       '1':[{id:'101',episode_num:1,title:'Pilot',container_extension:'mp4',info:{movie_image:'https://images.example.invalid/pilot.svg'}},
            {id:'102',episode_num:2,title:'Second',container_extension:'mp4'}],
       '2':[{id:'201',episode_num:1,title:'New season',container_extension:'mp4',info:{thumbnail:'https://images.example.invalid/new.svg'}}]
      }
     };
     return [];
    };
    renderCats();tryCategory('__asplayer_history__');
   });
   assert.equal(await page.locator('#series-auto-next-v607').isChecked(),true);
   await page.locator('#cards [data-watch-key="101"]').click();
   await page.waitForSelector('#season-select');
   assert.equal(await page.locator('#season-select').getAttribute('aria-expanded'),'false');
   assert.match(await page.locator('#season-select').innerText(),/Temporadas disponibles · Temporada 1/);
   assert.match(await page.locator('#season-select').getAttribute('title'),/Selecciona una temporada/);
   assert.equal(await page.locator('.episode-still-row').count(),2);
   assert.equal(await page.locator('.episode-still-art img').count(),1,'provider episode image only');
   if(tv){
    const sizes=await page.evaluate(()=>{
     const row=document.querySelector('#episodes .episode-still-row');
     const art=row?.querySelector('.episode-still-art');
     const caption=row?.querySelector('.episode-still-caption');
     const image=art?.querySelector('img');
     return {
      display:getComputedStyle(row).display,
      artWidth:art.getBoundingClientRect().width,
      rowWidth:row.getBoundingClientRect().width,
      captionWidth:caption.getBoundingClientRect().width,
      captionLeft:caption.getBoundingClientRect().left,
      artRight:art.getBoundingClientRect().right,
      imageWidth:image?.getBoundingClientRect().width||0
     };
    });
    assert.equal(sizes.display,'flex','Android TV episode card must use horizontal layout');
    assert.ok(sizes.artWidth>=120&&sizes.artWidth<=195,'episode thumbnail must be bounded');
    assert.ok(sizes.artWidth<sizes.rowWidth/2,'image must not fill full card');
    assert.ok(sizes.captionWidth>120,'episode name has its own column');
    assert.ok(sizes.captionLeft>=sizes.artRight,'caption is beside thumbnail');
    assert.ok(sizes.imageWidth<=195,'episode image cannot overflow thumbnail');
    const fit=await page.locator('#episodes .episode-still-art img').first().evaluate(img=>getComputedStyle(img).objectFit);
    assert.equal(fit,'contain','Android TV should show the whole episode image');
   }
   assert.equal(await page.locator('#episodes .episode-still-art img').first().evaluate(img=>getComputedStyle(img).objectFit),'contain','all devices should show full thumbnail');
   assert.match(await page.locator('#series-continue-episode').innerText(),/Temporada 1 · Capítulo 1 · 02:00/);
   // Season changing remains possible directly from the historical episode.
   await page.locator('#season-select').click();
   assert.equal(await page.locator('#season-options').isVisible(),true);
   await page.locator('#season-options .season-option').nth(1).click();
   assert.match(await page.locator('#season-select').innerText(),/Temporada 2/);
   assert.match(await page.locator('.episode-still-row strong').first().innerText(),/New season/);
   await page.locator('#season-select').click();
   await page.locator('#season-options .season-option').first().click();
   // Explicit continue should resume the original episode via native bridge.
   await page.locator('#series-continue-episode').click();
   const first=await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').at(-1));
   assert.match(first[1],/\/series\/test\/test\/101\.mp4$/);
   assert.equal(first.at(-1),120000,'saved position in milliseconds');
   const nav1=await page.evaluate(()=>window.calls.filter(x=>x[0]==='nav').at(-1));
   assert.match(nav1[1],/Temporada 1 · Capítulo 1/);
   assert.equal(nav1[2],'','previous episode unavailable in first season');
   assert.match(nav1[3],/Temporada 1 · Capítulo 2/);
   // Explicit disable must prevent auto-next on native ended signals.
   await page.locator('#series-auto-next-v607').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.evaluate(()=>window.ASPLAYER58_EVENT({type:'position',position:1400000,duration:1400000,ended:true}));
   await page.evaluate(()=>window.ASPLAYER58_EVENT({type:'ended'}));
   await page.waitForTimeout(1050);
   assert.equal(await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').length),1,'opt-out works');
   await page.locator('#series-auto-next-v607').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
   await page.evaluate(()=>window.ASPLAYER58_EVENT({type:'ended'}));
   await page.waitForFunction(()=>window.calls.filter(x=>x[0]==='media').length===2);
   const second=await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').at(-1));
   assert.match(second[1],/\/series\/test\/test\/102\.mp4$/,'next episode');
   await page.evaluate(()=>window.ASPLAYER58_EVENT({type:'ended'}));
   await page.waitForFunction(()=>window.calls.filter(x=>x[0]==='media').length===3);
   const third=await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').at(-1));
   assert.match(third[1],/\/series\/test\/test\/201\.mp4$/,'next season');
   const lastNav=await page.evaluate(()=>window.calls.filter(x=>x[0]==='nav').at(-1));
   assert.equal(lastNav[3],'','last episode disables next');
   assert.match(lastNav[2],/Temporada 1 · Capítulo 2/);
   await page.evaluate(()=>window.ASPLAYER58_EVENT({type:'ended'}));
   await page.waitForTimeout(950);
   assert.equal(await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').length),3,'last episode does not loop');
   // Manual previous navigates across season boundaries without using seekBy.
   assert.equal(await page.evaluate(()=>window.ASPLAYER_SERIES_STEP(-1)),true);
   assert.match((await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').at(-1)))[1],/\/102\.mp4$/);
   assert.equal(await page.evaluate(()=>window.ASPLAYER_SERIES_STEP(-1)),true);
   assert.match((await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').at(-1)))[1],/\/101\.mp4$/);
   assert.equal(await page.evaluate(()=>window.ASPLAYER_SERIES_STEP(-1)),false,'first episode disables previous');
   assert.equal(await page.evaluate(()=>window.ASPLAYER_SERIES_STEP(1)),true);
   assert.match((await page.evaluate(()=>window.calls.filter(x=>x[0]==='media').at(-1)))[1],/\/102\.mp4$/);
   assert.equal(await page.evaluate(()=>window.ASPLAYER_SERIES_STEP(0)),false,'reject unknown direction');
   await page.evaluate(()=>play({stream_id:'401',name:'Movie',container_extension:'mp4'},'vod'));
   const filmNav=await page.evaluate(()=>window.calls.filter(x=>x[0]==='nav').at(-1));
   assert.deepEqual(filmNav,['nav','','',''],'movie clears series navigation');
   await page.reload();
   assert.equal(await page.locator('#series-auto-next-v607').isChecked(),true,'setting persisted');
   await page.evaluate(()=>{lang='en';languageUI();});
   assert.match(await page.locator('#series-auto-next-setting h3').innerText(),/Automatically play/);
   assert.deepEqual(errors,[],'no browser JavaScript exceptions');
   await page.close();
  }
  console.log('PASS: history opens series, episode still images, TV/mobile season picker, resume, opt-out, cross-season auto-next, last episode and localization');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});