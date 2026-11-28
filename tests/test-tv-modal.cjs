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
    await page.waitForFunction(()=>document.activeElement.id==='access-pin');
    assert.equal(await page.locator('#access-pin').evaluate(el=>el.readOnly),true,'PIN focus must not open editing');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#access-pin').evaluate(el=>el.readOnly),false,'OK explicitly enables text editing');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#access-pin').evaluate(el=>el.readOnly),true,'Escape returns focus to navigation mode');
    await page.keyboard.press('ArrowDown');
    assert.notEqual(await page.evaluate(()=>document.activeElement.id),'access-pin','D-pad must move from initial PIN without tapping');
    await page.evaluate(()=>{document.activeElement.blur();window.ASPLAYER_REMOTE_FOCUS()});
    assert.equal(await page.evaluate(()=>document.activeElement.id),'access-pin');
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
    await page.evaluate(()=>{document.activeElement.blur();window.ASPLAYER_REMOTE_FOCUS()});
    await page.waitForFunction(()=>document.activeElement.matches('.sidebar [data-nav="home"]'));
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.nav),'live');
    await page.evaluate(()=>window.ASPLAYER_REMOTE_FOCUS());
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.nav),'live','Native focus reminder must not reset current selection');
    console.log('PASS: cold launch PIN autofocus, D-pad without touch, home dock and focus recovery');
    assert.equal(await page.locator('#most-watched-home').isVisible(),false);
    await page.route('https://logos.example.test/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="cyan"/></svg>'}));
    await page.evaluate(async()=>{
      loginPinAccepted=true;sessions[server().key]={user:'tester',pass:'test',meta:{}};active='home';parentEnabled=false;
      const rows=Array.from({length:25},(_,i)=>({id:String(i+1),title:'Channel '+(i+1),playCount:i+1,watchedAt:i,item:{stream_id:String(i+1),name:'Channel '+(i+1)}}));
      rows[24].item.stream_icon='https://logos.example.test/direct.svg';rows[23].item.category_id='88';
      await cacheWrite(sessionPrefix()+'get_live_streams|'+JSON.stringify({category_id:'88'}),[{stream_id:'24',stream_icon:'https://logos.example.test/cached.svg'}]);
      store(HISTORY_KEY,{[sessionPrefix()]:{live:rows,vod:[],series:[]}});window.ASPLAYER_REFRESH_WATCH();
    });
    assert.equal(await page.locator('#most-watched-channels button').count(),20);
    assert.equal(await page.locator('#most-watched-channels button strong').first().textContent(),'Channel 25');
    const watched=page.locator('#most-watched-channels');
    await watched.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('[data-channel-id="25"]').classList.contains('channel-logo-ready')&&document.querySelector('[data-channel-id="24"]').classList.contains('channel-logo-ready'));
    assert.equal(await watched.locator('[data-channel-id="23"] .channel-logo-fallback').isVisible(),true);
    assert(await watched.evaluate(el=>getComputedStyle(el).display==='flex'&&el.scrollWidth>el.clientWidth&&el.firstElementChild.offsetTop===el.lastElementChild.offsetTop));
    await watched.locator('button').first().focus();
    for(let i=0;i<7;i++)await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>document.activeElement.dataset.channelId==='18'&&document.querySelector('#most-watched-channels').scrollLeft>0);
    console.log('PASS: watched-channel logo cache, fallback, horizontal carousel and D-pad');
    // ASPLAYER 6.0.4: Home's compact header and vertical row-to-row D-pad.
    await page.evaluate(()=>{
      document.body.classList.add('asplayer-home-open');
      document.getElementById('recent-posters').innerHTML='<button class="poster" id="test-home-movie">Movie</button>';
      document.getElementById('recent-series').innerHTML='<button class="poster" id="test-home-series">Series</button>';
    });
    assert.equal(await page.locator('#asplayer-home-refresh').isVisible(),true);
    assert.equal(await page.locator('#app-shell .topbar .pill').isVisible(),true);
    assert((await page.locator('#app-shell .sidebar').boundingBox()).width<=110);
    await page.locator('#asplayer-home-refresh').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.channelId),'25');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.channelId),'24');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'test-home-movie');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'see-all-series');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'test-home-series');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'test-home-series','Home must not jump to dock at last row');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.nav),'home','Left from first row item returns to the Home dock');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'asplayer-home-refresh');
    console.log('PASS: responsive Home header, vertical rows, horizontal channels, dock at deliberate boundary only');
    // Regression: all three real Home rails must follow 20 D-pad selections.
    // Prior bug: main scrolled vertically, but movies/series X scroll stayed 0.
    await page.evaluate(()=>{
      for(const rail of ['recent-posters','recent-series']){
        const parent=document.getElementById(rail);
        parent.replaceChildren();
        for(let i=0;i<20;i++){
          const b=document.createElement('button');
          b.type='button';b.className='poster';
          b.textContent=rail+' '+(i+1);b.dataset.carouselPosition=String(i);
          parent.append(b);
        }
      }
    });
    for(const id of ['most-watched-channels','recent-posters','recent-series']){
      const rail=page.locator('#'+id);
      assert.equal(await rail.locator('button').count(),20,'Expected full 20 '+id+' cards');
      await rail.evaluate(el=>{el.scrollLeft=0});
      await rail.locator('button').first().focus();
      for(let i=1;i<20;i++)await page.keyboard.press('ArrowRight');
      assert.equal(await rail.evaluate(el=>document.activeElement===el.lastElementChild),true,'D-pad must reach 20th '+id+' item');
      await page.waitForFunction(id=>{
        const el=document.getElementById(id),tile=el.lastElementChild;
        if(!el||!tile)return false;
        const panel=el.getBoundingClientRect(),card=tile.getBoundingClientRect();
        return el.scrollLeft>0&&card.right<=panel.right+2&&card.left>=panel.left-2;
      },id,{timeout:10000});
      assert(await rail.evaluate(el=>el.scrollLeft>0),'Carousel did not scroll right '+id);
      for(let i=1;i<20;i++)await page.keyboard.press('ArrowLeft');
      assert.equal(await rail.evaluate(el=>document.activeElement===el.firstElementChild),true,'D-pad returns to first '+id);
      await page.waitForFunction(id=>document.getElementById(id).scrollLeft<5,id,{timeout:10000});
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Home carousels must not overflow entire viewport horizontally');
    console.log('PASS: 20/20 cards visible by D-pad in movies, series and most watched carousels, both directions');

    await page.evaluate(()=>document.body.classList.remove('asplayer-home-open'));

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
    // Regression: category -> search must be a single arrow, without activating it.
    const selectedBeforeBrowsing=await page.evaluate(()=>String(category));
    await page.locator('#categories [data-category="42"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'search');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.category),'42','Return to last highlighted, even unselected category');
    assert.equal(await page.evaluate(()=>String(category)),selectedBeforeBrowsing,'Browsing never activates category');

    await page.locator('#categories [data-category="43"]').focus();
    const previouslySelected=await page.evaluate(()=>String(category));
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'search');
    assert.equal(await page.evaluate(()=>String(category)),previouslySelected,'D-pad must not trigger category selection');
    assert.equal(await page.locator('#search').evaluate(el=>el.readOnly),true,'Search focus is not editing');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'refresh-cat','Refresh is reachable from search');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'search','Refresh returns to search');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#search').evaluate(el=>!el.readOnly&&document.activeElement===el),true,'Enter enables search editing');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#search').evaluate(el=>el.readOnly),true,'Back returns to navigation');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.category),'43');
    // Worker announcement is a real remote dialog: OK and Back both dismiss it.
    await page.evaluate(()=>{document.getElementById('announcement-message').textContent='Worker test';document.getElementById('announcement').classList.remove('hidden');});
    await page.waitForFunction(()=>document.activeElement.id==='dismiss-announcement');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.getElementById('announcement').classList.contains('hidden'));
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.category),'43','Focus returns to the original category');
    await page.evaluate(()=>document.getElementById('announcement').classList.remove('hidden'));
    await page.waitForFunction(()=>document.activeElement.id==='dismiss-announcement');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.getElementById('announcement').classList.contains('hidden'));
    // Settings: OK toggles checkbox, Enter enables PIN typing, arrows leave it.
    await page.evaluate(()=>{
      active='settings';
      document.getElementById('view-catalog').classList.add('hidden');
      document.getElementById('view-settings').classList.remove('hidden');
      const cb=document.createElement('input');cb.id='tv-focus-checkbox-test';cb.type='checkbox';
      document.getElementById('view-settings').appendChild(cb);
    });

    // Settings uses the actually visible reading order after earlier UI
    // modules have arranged the cards. D-pad Down must never skip controls.
    await page.evaluate(()=>{
      document.body.classList.remove('asplayer-home-open');
      document.body.classList.add('asplayer-settings-open');
      const selector='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      window.__settingsTargets=Array.from(document.getElementById('view-settings').querySelectorAll(selector)).filter(el=>{
        if(!el.isConnected||el.closest('.hidden,[hidden],[inert],[aria-hidden="true"]')||el.matches(':disabled')||el.tabIndex<0)return false;
        const st=getComputedStyle(el),r=el.getBoundingClientRect();
        return st.visibility!=='hidden'&&st.display!=='none'&&r.width>=3&&r.height>=3;
      });
      const row=Array.from(document.querySelectorAll('#view-settings .actions')).find(row=>
        window.__settingsTargets.filter(el=>row.contains(el)).length>=2);
      window.__settingsActionPair=row?window.__settingsTargets.filter(el=>row.contains(el)).slice(0,2):[];
    });
    const settingCount=await page.evaluate(()=>window.__settingsTargets.length);
    assert(settingCount>=18,'Settings controls must be visible and navigable');
    assert((await page.locator('#app-shell .sidebar').boundingBox()).width<=110);
    if(await page.evaluate(()=>window.__settingsActionPair.length===2)){
      await page.evaluate(()=>window.__settingsActionPair[0].focus());
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(()=>document.activeElement===window.__settingsActionPair[1]),true,'Right moves within actions row');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(()=>document.activeElement===window.__settingsActionPair[0]),true,'Left returns within actions row');
    }
    const visited=new Set();
    await page.evaluate(()=>window.__settingsTargets[0].focus());
    for(let i=1;i<settingCount;i++){
      await page.keyboard.press('ArrowDown');
      const reached=await page.evaluate(i=>({
        expected:document.activeElement===window.__settingsTargets[i],
        id:document.activeElement.id,
        inSettings:document.getElementById('view-settings').contains(document.activeElement)
      }),i);
      assert.equal(reached.inSettings,true,'Down must never jump from Settings to dock');
      assert.equal(reached.expected,true,'Down must reach next control (step '+i+', '+reached.id+')');
      visited.add(reached.id);
    }
    for(const id of ['language','parent-pin','refresh-cache','preferred-player','default-aspect','audio-language','asplayer-593-picture','asplayer-593-vpn']){
      assert(visited.has(id),'Settings item not reachable with Down: '+id);
    }
    assert(await page.locator('#app-shell main').evaluate(el=>el.scrollTop)>0,'Settings scroll must track focus');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement===window.__settingsTargets.at(-1)),true,'Down stays at last item');
    for(let i=settingCount-2;i>=0;i--){
      await page.keyboard.press('ArrowUp');
      assert.equal(await page.evaluate(i=>document.activeElement===window.__settingsTargets[i],i),true,'Up reaches previous item '+i);
    }
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.nav),'settings','Only deliberate Left returns to dock');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>document.activeElement===window.__settingsTargets[0]),true,'Right reenters first Settings control');
    console.log('PASS: all Settings controls, vertical focus, independent scroll and intentional dock access');

    await page.locator('#tv-focus-checkbox-test').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#tv-focus-checkbox-test').isChecked(),true);
    await page.locator('#parent-pin').focus();
    assert.equal(await page.locator('#parent-pin').evaluate(el=>el.readOnly),true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#parent-pin').evaluate(el=>el.readOnly),false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#parent-pin').evaluate(el=>el.readOnly),true);
    await page.evaluate(()=>{
      document.getElementById('tv-focus-checkbox-test').remove();
      document.body.classList.remove('asplayer-settings-open');
      document.getElementById('view-settings').classList.add('hidden');
      document.getElementById('view-catalog').classList.remove('hidden');
      active='vod';
    });
    console.log('PASS: category-to-search without Enter, refresh, Worker OK/Back, checkbox and PIN editing');

    await page.evaluate(()=>{
      active='vod';category='none';filter='';operation++;
      cats=[{category_id:'1',category_name:'New releases'}];
      const movie={id:'movie1',mode:'vod',title:'An unfinished movie',position:42,duration:120,item:{stream_id:'movie1',category_id:'1',name:'An unfinished movie'}};
      const finished={id:'movie2',mode:'vod',title:'Already watched movie',position:120,duration:120,finished:true,item:{stream_id:'movie2',category_id:'1',name:'Already watched movie'}};
      const episode={id:'ep42',mode:'series',title:'Series · Episode 42',position:25,duration:80,item:{id:'ep42',name:'Episode 42',seriesId:'s42',category_id:'1'}};
      store(HISTORY_KEY,{[sessionPrefix()]:{vod:[movie,finished],series:[episode],live:[]}});
      window.watchApiCalls=0;
      cached=async action=>{window.watchApiCalls++;if(action==='get_series_info')return {episodes:{'1':[{id:'ep42',title:'Episode 42',episode_num:42,container_extension:'mp4'}]}};throw Error('Local history list must not request provider');};
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
    await page.waitForFunction(()=>!!document.activeElement.dataset.watchKey);
    assert.equal(await page.locator('#cards .watch-finished').count(),1);
    await page.locator('#search').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#search').evaluate(el=>el===document.activeElement&&!el.readOnly),true);
    await page.locator('#search').fill('Already watched');
    await page.waitForFunction(()=>document.querySelectorAll('#cards [data-watch-key]').length===1&&document.querySelector('#cards [data-watch-key]').dataset.watchKey==='movie2');
    await page.evaluate(()=>{active='series';category='none';filter='';operation++;renderCats();});
    await page.locator('#categories [data-category="__asplayer_continue__"]').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.dataset.watchKey==='ep42');
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!!document.getElementById('series-continue-episode'));
    assert.match(await page.locator('#season-select').innerText(),/Season 1/);
    await page.locator('#series-continue-episode').click();
    assert.deepEqual(await page.evaluate(()=>window.playResults.at(-1)),['ep42','series']);
    assert.equal(await page.evaluate(()=>window.watchApiCalls),1,'Only opening series details queries metadata');
    console.log('PASS: local history list with no provider fetch; series history opens seasons then explicit resume');
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

    // Touch Home remains responsive and keeps its server pill after reparenting.
    await mobile.evaluate(()=>{
      document.getElementById('view-catalog').classList.add('hidden');
      document.getElementById('view-home').classList.remove('hidden');
      active='home';asplayerUpdateViewportMode();
    });
    assert.equal(await mobile.locator('#asplayer-home-refresh').isVisible(),false);
    assert.equal(await mobile.locator('#app-shell .topbar .pill').isVisible(),true);
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
    await mobile.evaluate(()=>{
      document.getElementById('view-home').classList.add('hidden');
      document.getElementById('view-catalog').classList.remove('hidden');
      active='live';asplayerUpdateViewportMode();
    });
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
