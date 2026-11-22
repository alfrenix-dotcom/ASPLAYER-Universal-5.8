const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    page.on('pageerror',e=>console.log('page error',e.message));
    await page.addInitScript(()=>{window.ASPLAYER={isAndroidTv:()=>true};});
    await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
    const password=page.locator('#password'),toggle=page.locator('[data-password-toggle="password"]');
    assert(await password.isVisible());assert(await toggle.isVisible());
    const pbox=await password.boundingBox(),tbox=await toggle.boundingBox();
    assert(tbox.y>=pbox.y+pbox.height-1,'Password toggle must not overlap input');
    await password.focus();await page.keyboard.press('ArrowDown');
    assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Enter');assert.equal(await password.getAttribute('type'),'text');
    await page.keyboard.press('Enter');assert.equal(await password.getAttribute('type'),'password');
    await page.keyboard.press('ArrowUp');assert.equal(await password.evaluate(el=>el===document.activeElement),true);
    const verifyHome=async(p,touch=false)=>{
      await p.evaluate(()=>{
        document.querySelector('#auth-screen').classList.add('hidden');
        document.querySelector('#app-shell').classList.remove('hidden');
        document.querySelector('#view-home').classList.remove('hidden');
        document.querySelector('#view-catalog').classList.add('hidden');
        window.supportLaunches=[];
        window.ASPLAYER.openLink=url=>window.supportLaunches.push(url);
      });
      const contacts=p.locator('#view-home .contact-priority');
      assert.equal(await contacts.locator('a,button,input,select,textarea,[tabindex],[role="button"],[data-open-link]').count(),0);
      assert.equal(await contacts.locator('.contact-info').count(),3);
      assert.match(await contacts.innerText(),/WhatsApp: \+1 236-702-1555/);
      assert.match(await contacts.innerText(),/company@alftechsolutions\.com/);
      assert.match(await contacts.innerText(),/www\.alftechsolutions\.com/);
      assert.doesNotMatch(await p.locator('#view-home .hero').innerText(),/ASPLAYER\s+\d+\.\d+/);
      for(const info of await contacts.locator('.contact-info').all()){
        if(touch)await info.tap();else await info.click();
        assert.equal(await info.evaluate(el=>el.tabIndex),-1);
      }
      assert.deepEqual(await p.evaluate(()=>window.supportLaunches),[]);
      assert.equal(await p.locator('.login-contact a,.login-contact button,.login-contact [tabindex],.login-contact [data-open-link]').count(),0);
      assert.equal(await p.locator('.login-contact .login-contact-info').count(),3);
      assert.equal(await p.locator('.nav-foot').count(),0);
      assert.equal(await p.locator('img[src="brand-logo.jpg"]').count(),3);
      await p.waitForFunction(()=>Array.from(document.querySelectorAll('img[src="brand-logo.jpg"]')).every(el=>el.complete&&el.naturalWidth===800&&el.naturalHeight===800));
      console.log('PASS: Home contact details are static and outdated version badge removed');
    };
    await verifyHome(page);
    assert.equal(await page.locator('#most-watched-home').isVisible(),false);
    await page.evaluate(()=>{
      loginPinAccepted=true;sessions[server().key]={user:'tester',pass:'test',meta:{}};active='home';parentEnabled=false;
      const rows=Array.from({length:25},(_,i)=>({id:String(i+1),title:'Channel '+(i+1),playCount:i+1,watchedAt:i,item:{stream_id:String(i+1),name:'Channel '+(i+1)}}));
      store(HISTORY_KEY,{[sessionPrefix()]:{live:rows,vod:[],series:[]}});window.ASPLAYER_REFRESH_WATCH();
    });
    assert.equal(await page.locator('#most-watched-channels button').count(),20);
    assert.equal(await page.locator('#most-watched-channels button').first().textContent(),'Channel 25');
    await page.evaluate(()=>{store(HISTORY_KEY,{});window.ASPLAYER_REFRESH_WATCH()});
    assert.equal(await page.locator('#most-watched-home').isVisible(),false);
    await page.evaluate(()=>{
      document.querySelector('#auth-screen').classList.add('hidden');
      document.querySelector('#app-shell').classList.remove('hidden');
      document.querySelector('#view-home').classList.add('hidden');
      document.querySelector('#view-catalog').classList.remove('hidden');
      document.querySelector('#cards').innerHTML='<button id="movie" class="tile">Movie</button><button id="series" class="tile">Series</button>';
      window.playResults=[];
      play=(item,mode)=>window.playResults.push([item.id||item.stream_id,mode]);
      cached=async(action)=>{if(action==='get_series_info'){await new Promise(r=>setTimeout(r,200));return {episodes:{1:[{id:'ep1',episode_num:1,title:'First'},{id:'ep2',episode_num:2,title:'Second'}],2:[{id:'ep3',episode_num:1,title:'Third'}]}};}return {info:{plot:'Synopsis'}};};
      document.querySelector('#movie').onclick=()=>showMovie({name:'Movie',stream_id:'m1'});
      document.querySelector('#series').onclick=()=>showSeries({name:'Series',series_id:'s1'});
    });
    const focused=()=>page.evaluate(()=>document.activeElement?.id||document.activeElement?.dataset.episode||document.activeElement?.textContent);
    await page.locator('#movie').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.closest('#detail-actions'));
    assert.match(await focused(),/Play|Reproducir/i);
    assert.equal(await page.locator('#app-shell').getAttribute('inert'),'');
    for(const key of ['ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowUp','ArrowUp']) {
      await page.keyboard.press(key);
      assert(await page.evaluate(()=>document.querySelector('#details-modal').contains(document.activeElement)));
    }
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.activeElement.id==='movie');
    assert.equal(await page.locator('#app-shell').getAttribute('inert'),null);
    await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.closest('#detail-actions'));
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>window.playResults.length===1);
    assert.deepEqual(await page.evaluate(()=>window.playResults),[['m1','vod']]);
    await page.locator('#series').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.id==='season-select');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.classList.contains('season-option'));
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.dataset.episode==='0');
    assert.match(await page.locator('#season-select').textContent(),/2/);
    assert.equal(await page.locator('#episodes [data-episode]').count(),1);
    assert.match(await page.locator('#episodes [data-episode]').textContent(),/Third/);
    await page.keyboard.press('Enter');await page.waitForFunction(()=>window.playResults.length===2);
    assert.deepEqual(await page.evaluate(()=>window.playResults),[['m1','vod'],['ep3','series']]);
    console.log('PASS: TV movie autofocus, directional focus trap, back restore, play and async episodes');
    await page.evaluate(async()=>{
      active='live';category='none';operation++;
      cached=async(action,extra)=>{
        if(action==='get_live_categories')return Array.from({length:62},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
        if(action==='get_live_streams'){
          await new Promise(r=>setTimeout(r,200));
          const id=extra?.category_id||'all';
          return Array.from({length:5},(_,i)=>({stream_id:String(i+1),category_id:id,name:'Channel '+id+' '+(i+1)}));
        }
        return [];
      };
      await loadCategories('live');
      window.ASPLAYER_REFRESH_WATCH();
    });
    await page.waitForFunction(()=>category==='all'&&document.querySelector('#cards button[data-item]'));
    const cat=page.locator('#categories [data-category="42"]');
    await cat.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>category==='42'&&document.activeElement.matches('#cards button[data-item]'));
    const tvBounds=await page.evaluate(()=>{
      const header=document.querySelector('.topbar').getBoundingClientRect();
      const list=document.querySelector('#tv-content-pane').getBoundingClientRect();
      return {top:header.top,bottom:list.bottom,height:innerHeight,scroll:window.scrollY};
    });
    assert(tvBounds.top>=0&&tvBounds.scroll===0);
    assert(tvBounds.bottom>tvBounds.height-40&&tvBounds.bottom<=tvBounds.height+1);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.item),'0');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#categories')).flexDirection),'column');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#cards')).flexDirection),'column');
    await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.item),'1');
    await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.dataset.category),'42');
    await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.category),'43');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>category==='43'&&document.activeElement.matches('#cards button[data-item]'));
    await page.evaluate(()=>window.ASPLAYER_BACK());
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.category),'43');
    console.log('PASS: default All, vertical category and content lists, async category focus handoff, return to selected category');
    await page.evaluate(()=>{
      active='vod';category='none';filter='';operation++;
      cats=[{category_id:'1',category_name:'New releases'}];
      const movie={id:'movie1',mode:'vod',title:'An unfinished movie',position:42,duration:120,item:{stream_id:'movie1',category_id:'1',name:'An unfinished movie'}};
      const finished={id:'movie2',mode:'vod',title:'Already watched movie',position:120,duration:120,finished:true,item:{stream_id:'movie2',category_id:'1',name:'Already watched movie'}};
      const episode={id:'ep42',mode:'series',title:'Series · Episode 42',position:25,duration:80,item:{id:'ep42',name:'Episode 42',seriesId:'s42',category_id:'1'}};
      store(HISTORY_KEY,{[sessionPrefix()]:{vod:[movie,finished],series:[episode],live:[]}});
      window.watchApiCalls=0;
      cached=async()=>{window.watchApiCalls++;throw Error('Local history must not request provider');};
      renderCats();window.ASPLAYER_REFRESH_WATCH();
    });
    assert.equal(await page.locator('#watch-panels').count(),0);
    assert.deepEqual(await page.locator('#categories button').evaluateAll(els=>els.slice(0,4).map(el=>el.dataset.category)),['__asplayer_continue__','__asplayer_history__','__asplayer_recent__','all']);
    assert.equal(await page.locator('#refresh-cat').evaluate(el=>!!el.closest('.topbar')),true);
    await page.locator('#categories [data-category="__asplayer_continue__"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.dataset.watchKey==='movie1');
    assert.equal(await page.locator('#cards [data-watch-key]').count(),1);
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(()=>window.playResults.at(-1)),['movie1','vod']);
    await page.locator('#categories [data-category="__asplayer_history__"]').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelectorAll('#cards [data-watch-key]').length===2);
    assert.equal(await page.locator('#cards .watch-finished').count(),1);
    await page.locator('#search').fill('Already watched');
    await page.waitForFunction(()=>document.querySelectorAll('#cards [data-watch-key]').length===1&&document.querySelector('#cards [data-watch-key]').dataset.watchKey==='movie2');
    await page.evaluate(()=>{active='series';category='none';filter='';operation++;renderCats();});
    await page.locator('#categories [data-category="__asplayer_continue__"]').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.dataset.watchKey==='ep42');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(()=>window.playResults.at(-1)),['ep42','series']);
    assert.equal(await page.evaluate(()=>window.watchApiCalls),0);
    console.log('PASS: local history and resume categories, progress, finished title filtering, exact episode playback, no provider fetch');
    const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    await mobile.addInitScript(()=>{window.ASPLAYER={isAndroidTv:()=>false};});
    await mobile.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
    await verifyHome(mobile,true);
    await mobile.evaluate(()=>{cached=async()=>({info:{}});showMovie({name:'Movie',stream_id:'m1'});});
    assert.equal(await mobile.locator('body').evaluate(el=>el.classList.contains('asplayer-tv-dpad')),false);
    assert.equal(await mobile.locator('#app-shell').getAttribute('inert'),null);
    await mobile.locator('#detail-close').tap();
    assert(await mobile.locator('#details-modal').evaluate(el=>el.classList.contains('hidden')));
    console.log('PASS: touch mobile retains normal dialog');
    await mobile.evaluate(async()=>{
      document.querySelector('#auth-screen').classList.add('hidden');
      document.querySelector('#app-shell').classList.remove('hidden');
      document.querySelector('#mobilebar').classList.remove('hidden');
      document.querySelector('#view-home').classList.add('hidden');
      document.querySelector('#view-catalog').classList.remove('hidden');
      active='live';category='none';operation++;
      cached=async(action,extra)=>{
        if(action==='get_live_categories')return Array.from({length:40},(_,i)=>({category_id:String(i+1),category_name:'Category '+(i+1)}));
        if(action==='get_live_streams'){
          await new Promise(r=>setTimeout(r,200));
          return Array.from({length:20},(_,i)=>({stream_id:String(i+1),category_id:extra?.category_id||'all',name:'Channel '+(i+1)}));
        }
        return [];
      };
      await loadCategories('live');
    });
    await mobile.waitForFunction(()=>category==='all'&&document.querySelector('#cards button[data-item]'));
    assert.equal(await mobile.locator('#tv-catalog-layout').evaluate(el=>getComputedStyle(el).display),'grid');
    assert.equal(await mobile.locator('#categories').evaluate(el=>getComputedStyle(el).flexDirection),'column');
    assert.equal(await mobile.locator('#cards').evaluate(el=>getComputedStyle(el).flexDirection),'column');
    await mobile.locator('#tv-content-pane').evaluate(el=>el.scrollTop=el.scrollHeight);
    await mobile.locator('#categories [data-category="23"]').tap();
    await mobile.waitForFunction(()=>category==='23'&&document.querySelector('#cards button[data-item]'));
    await mobile.waitForFunction(()=>document.querySelector('#tv-content-pane').scrollTop<150);
    assert.equal(await mobile.locator('body').evaluate(el=>el.classList.contains('asplayer-tv-dpad')),false);
    assert.equal(await mobile.evaluate(()=>document.querySelector('#cards').contains(document.activeElement)),false);
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
    await mobile.setViewportSize({width:844,height:390});
    assert.equal(await mobile.locator('#tv-catalog-layout').evaluate(el=>getComputedStyle(el).display),'grid');
    console.log('PASS: vertical lists on touch phone, scroll to selected category results, no keyboard focus capture, portrait and landscape layouts');
    await mobile.setViewportSize({width:390,height:844});
    await mobile.evaluate(()=>{
      active='vod';category='none';operation++;filter='';cats=[{category_id:'1',category_name:'New releases'}];
      store(HISTORY_KEY,{[sessionPrefix()]:{vod:[{id:'mobile1',mode:'vod',title:'Mobile movie',position:31,duration:120,item:{stream_id:'mobile1',category_id:'1',name:'Mobile movie'}}],series:[],live:[]}});
      renderCats();window.ASPLAYER_REFRESH_WATCH();
    });
    await mobile.locator('#categories [data-category="__asplayer_history__"]').tap();
    await mobile.waitForFunction(()=>document.querySelector('#cards [data-watch-key="mobile1"]'));
    assert.equal(await mobile.locator('#watch-panels').count(),0);
    assert.equal(await mobile.locator('#view-catalog .sectionhead').evaluate(el=>getComputedStyle(el).display),'none');
    assert.equal(await mobile.locator('#refresh-cat').evaluate(el=>!!el.closest('.topbar')),true);
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
    console.log('PASS: compact mobile history in the existing right-hand content pane');
    const native=await browser.newPage({viewport:{width:1280,height:720}});
    await native.addInitScript(()=>{
      window.nativeCalls=[];
      window.ASPLAYER={isAndroidTv:()=>true,setUiLanguage:()=>{},setDecoderMode:()=>{},
        playMedia:(...args)=>window.nativeCalls.push(['playMedia',...args]),
        playMini:(...args)=>window.nativeCalls.push(['playMini',...args]),
        stopMedia:()=>window.nativeCalls.push(['stopMedia'])};
    });
    await native.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
    await native.evaluate(()=>{
      loginPinAccepted=true;
      SERVERS[0].base='https://example.invalid';
      sessions[server().key]={user:'test',pass:'test',meta:{allowed_output_formats:['ts','m3u8']}};
      active='live';settings.bufferProfile='adaptive';nativeCalls=[];
      play({stream_id:'101',name:'Channel 101'},'live');
    });
    assert.deepEqual(await native.evaluate(()=>nativeCalls.map(x=>x[0])),['playMedia']);
    assert.match(await native.evaluate(()=>nativeCalls[0][1]),/\/101\.m3u8$/);
    assert.equal(await native.evaluate(()=>nativeCalls[0][2]),'adaptive');
    assert.equal(await native.locator('#modern-player').evaluate(el=>el.classList.contains('hidden')),true);
    assert.equal(await native.evaluate(()=>load(HISTORY_KEY,{})[sessionPrefix()].live[0].id),'101');
    await native.evaluate(()=>{
      window.ASPLAYER58_EVENT({type:'closed'});nativeCalls=[];
      sessions[server().key].meta.allowed_output_formats=['m3u8'];
      play({stream_id:'102',name:'Channel 102'},'live');
    });
    assert.deepEqual(await native.evaluate(()=>nativeCalls.map(x=>x[0])),['playMedia']);
    assert.match(await native.evaluate(()=>nativeCalls[0][1]),/\/102\.m3u8$/);
    await native.evaluate(()=>{
      window.ASPLAYER58_EVENT({type:'closed'});nativeCalls=[];
      sessions[server().key].meta.allowed_output_formats=['ts','m3u8'];
      settings.bufferProfile='ultra';
      play({stream_id:'103',name:'Channel 103'},'live');
    });
    assert.match(await native.evaluate(()=>nativeCalls[0][1]),/\/103\.m3u8$/);
    await native.evaluate(()=>{window.ASPLAYER58_EVENT({type:'videoReady',transport:'ts'});window.ASPLAYER58_EVENT({type:'closed'});nativeCalls=[];play({stream_id:'104',name:'Channel 104'},'live');});
    assert.match(await native.evaluate(()=>nativeCalls[0][1]),/\/104\.ts$/);
    console.log('PASS: channel starts once through native LibVLC, respects advertised formats and buffer preferences');
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});
