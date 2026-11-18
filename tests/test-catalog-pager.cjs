const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');

(async()=>{
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {channel:'chrome'}),
    headless:true
  });
  try {
    const setup = async (tv) => {
      const page = await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(tv=>{window.ASPLAYER={isAndroidTv:()=>tv};},tv);
      await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
      await page.evaluate(()=>{
        document.querySelector('#auth-screen').classList.add('hidden');
        document.querySelector('#app-shell').classList.remove('hidden');
        document.querySelector('#view-home').classList.add('hidden');
        document.querySelector('#view-catalog').classList.remove('hidden');
        window.testRows=Array.from({length:1200},(_,i)=>({
          stream_id:'id'+i,category_id:'one',name:'Title '+String(i).padStart(4,'0')
        }));
        active='vod';category='one';filter='';operation++;
        catalog=window.testRows;filtered=catalog;
        window.ASPLAYER_REFRESH_WATCH();renderItems();
        window.picked=[];
        showMovie=item=>window.picked.push(item.stream_id);
      });
      assert.equal(await page.locator('#cards [data-item]').count(),50);
      assert.equal(await page.locator('#loadmore').isVisible(),false);
      return {page,errors};
    };
    const {page:tv,errors:tvErrors}=await setup(true);
    const focusIndex=()=>tv.evaluate(()=>Number(document.activeElement.dataset.item));
    const count=()=>tv.locator('#cards [data-item]').count();
    await tv.locator('#cards [data-item="44"]').focus();
    for(let i=45;i<=260;i++){
      await tv.keyboard.press('ArrowDown');
      assert.equal(await focusIndex(),i,'DPAD down index '+i);
      assert((await count())<=100,'card window stays bounded');
    }
    await tv.keyboard.press('Enter');
    assert.deepEqual(await tv.evaluate(()=>window.picked),['id260']);
    for(let i=259;i>=40;i--){
      await tv.keyboard.press('ArrowUp');
      assert.equal(await focusIndex(),i,'DPAD up index '+i);
    }
    assert((await count())<=100);
    await tv.evaluate(()=>{
      active='live';category='one';filter='';operation++;catalog=window.testRows;filtered=catalog;renderItems();
    });
    await tv.locator('#cards [data-item="49"]').focus();
    await tv.keyboard.press('ArrowRight');
    assert.equal(await tv.evaluate(()=>document.activeElement.dataset.favIndex),'49');
    await tv.keyboard.press('ArrowDown');
    assert.equal(await tv.evaluate(()=>document.activeElement.dataset.favIndex),'50');
    await tv.keyboard.press('Enter');
    assert.equal(await tv.locator('#cards [data-fav-index="50"]').getAttribute('aria-pressed'),'true');
    assert.equal(await tv.evaluate(()=>document.activeElement.dataset.favIndex),'50');
    assert.equal(await tv.locator('#cards [data-item="50"]').count(),1);
    await tv.evaluate(()=>{
      filter='Title 1199'; applyFilter();
    });
    assert.equal(await count(),1);
    assert.match(await tv.locator('#cards [data-item="0"]').innerText(),/1199/);
    assert.equal(await tv.evaluate(()=>document.querySelector('#tv-content-pane').scrollTop),0);
    assert.deepEqual(tvErrors,[]);
    console.log('PASS: 1200 items, DPAD forward/back across pages, click identity, favorites, search reset');

    const {page:mobile,errors:mobileErrors}=await setup(false);
    const pane=mobile.locator('#tv-content-pane');
    for(let block=1;block<=8;block++){
      await pane.evaluate(el=>{el.scrollTop=el.scrollHeight;});
      await mobile.waitForFunction(n=>Number(document.querySelector('#cards [data-item]:last-of-type')?.dataset.item)>=n,block*50);
      assert((await mobile.locator('#cards [data-item]').count())<=100);
    }
    await pane.evaluate(el=>{el.scrollTop=0;});
    await mobile.waitForFunction(()=>!!document.querySelector('#cards [data-item="0"]'));
    assert((await mobile.locator('#cards [data-item]').count())<=100);
    await mobile.locator('#cards [data-item="0"]').click();
    assert.deepEqual(await mobile.evaluate(()=>window.picked),['id0']);
    assert.deepEqual(mobileErrors,[]);
    console.log('PASS: mobile scroll, bounded DOM, reversible window and tap identity');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
