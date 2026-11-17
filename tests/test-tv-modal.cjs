const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    page.on('pageerror',e=>console.log('page error',e.message));
    await page.addInitScript(()=>{window.ASPLAYER={isAndroidTv:()=>true};});
    await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
    await page.evaluate(()=>{
      document.querySelector('#auth-screen').classList.add('hidden');
      document.querySelector('#app-shell').classList.remove('hidden');
      document.querySelector('#view-home').classList.add('hidden');
      document.querySelector('#view-catalog').classList.remove('hidden');
      document.querySelector('#cards').innerHTML='<button id="movie" class="tile">Movie</button><button id="series" class="tile">Series</button>';
      window.playResults=[];
      play=(item,mode)=>window.playResults.push([item.id||item.stream_id,mode]);
      cached=async(action)=>{if(action==='get_series_info'){await new Promise(r=>setTimeout(r,200));return {episodes:{1:[{id:'ep1',episode_num:1,title:'First'},{id:'ep2',episode_num:2,title:'Second'}]}};}return {info:{plot:'Synopsis'}};};
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
    await page.waitForFunction(()=>document.activeElement.dataset.episode==='0');
    await page.keyboard.press('ArrowDown');assert.equal(await focused(),'1');
    await page.keyboard.press('Enter');await page.waitForFunction(()=>window.playResults.length===2);
    assert.deepEqual(await page.evaluate(()=>window.playResults),[['m1','vod'],['ep2','series']]);
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
    });
    await page.waitForFunction(()=>category==='all'&&document.querySelector('#cards button[data-item]'));
    const cat=page.locator('#categories [data-category="42"]');
    await cat.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>category==='42'&&document.activeElement.matches('#cards button[data-item]'));
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
    const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    await mobile.addInitScript(()=>{window.ASPLAYER={isAndroidTv:()=>false};});
    await mobile.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
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
  }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});
