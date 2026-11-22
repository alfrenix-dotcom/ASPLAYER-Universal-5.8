const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

(async()=>{
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
  try{
    for(const [width,height,tv] of [[390,844,false],[360,640,false],[844,390,false],[1280,720,true],[1920,1080,true]]){
      const page=await browser.newPage({viewport:{width,height},hasTouch:!tv});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(tv=>{window.ASPLAYER={isAndroidTv:()=>tv,supportsPremiumGlass:()=>!tv};},tv);
      await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
      await page.evaluate(tv=>{
        document.querySelector('#auth-screen').classList.add('hidden');
        document.querySelector('#app-shell').classList.remove('hidden');
        document.querySelector('#mobilebar').classList.remove('hidden');
        document.querySelector('#view-home').classList.add('hidden');
        document.querySelector('#view-catalog').classList.remove('hidden');
        if(!tv){document.documentElement.style.setProperty('--android-top','24px');document.documentElement.style.setProperty('--android-bottom','18px');}
      },tv);
      for(const section of ['live','vod','series']){
        await page.evaluate(section=>{
          active=section;category='one';filter='';operation++;
          cats=Array.from({length:60},(_,i)=>({category_id:i?'cat'+i:'one',category_name:'Category '+i}));
          catalog=Array.from({length:350},(_,i)=>({stream_id:'s'+i,series_id:'s'+i,category_id:'one',name:'Title '+i}));
          filtered=catalog;renderCats();window.ASPLAYER_REFRESH_WATCH();renderItems();
          document.querySelector('#tv-content-pane').scrollTop=0;
        },section);
        const m=await page.evaluate(()=>{
          const r=s=>document.querySelector(s).getBoundingClientRect();
          const pane=document.querySelector('#tv-content-pane'),cat=document.querySelector('#categories'),bar=document.querySelector('#mobilebar');
          const barVisible=getComputedStyle(bar).display!=='none';
          const end=barVisible?r('#mobilebar').top:innerHeight;
          const gap=end-r('#tv-content-pane').bottom;
          const layout={gap,barVisible,catBottom:r('#tv-category-pane').bottom,contentBottom:r('#tv-content-pane').bottom,paneTop:r('#tv-content-pane').top,headerBottom:r('.topbar').bottom,scrollWidth:document.documentElement.scrollWidth,scrollY:window.scrollY};
          pane.scrollTop=200;cat.scrollTop=200;layout.contentScroll=pane.scrollTop;layout.categoryScroll=cat.scrollTop;
          return layout;
        });
        const label=`${width}x${height} ${section}: ${JSON.stringify(m)}`;
        assert(m.gap>=-1&&m.gap<=35,label);
        assert(Math.abs(m.catBottom-m.contentBottom)<=2,label);
        assert(m.paneTop>=m.headerBottom-1,label);
        assert(m.scrollWidth<=width+1&&m.scrollY===0,label);
        assert(m.contentScroll>0&&m.categoryScroll>0,label);
        if(tv){
          await page.locator('#cards [data-item]').first().focus();
          await page.keyboard.press('ArrowDown');
          assert.equal(await page.evaluate(()=>document.activeElement.dataset.item),'1');
        }
      }
      const order=await page.evaluate(()=>Array.from(document.querySelector('#view-settings .settings-grid').children).slice(0,4).map(el=>el.querySelector('h3')?.getAttribute('data-i18n')||el.id));
      assert.equal(order[0],'accountSettings');
      assert.equal(await page.evaluate(()=>document.querySelector('#view-settings .settings-grid').children[1].contains(document.querySelector('#parent-toggle'))),true);
      assert.equal(await page.evaluate(()=>document.querySelector('#view-settings .settings-grid').children[2].contains(document.querySelector('#language'))),true);
      assert.equal(order[3],'glass-settings');
      await page.evaluate(()=>{document.querySelector('#view-catalog').classList.add('hidden');document.querySelector('#view-settings').classList.remove('hidden');active='settings';window.ASPLAYER_REFRESH_WATCH()});
      const settingsLayout=await page.locator('#view-settings .settings-grid').evaluate(el=>{
        const cards=[...el.children].filter(c=>c.getBoundingClientRect().height>0),bounds=el.getBoundingClientRect();
        const button=el.querySelector('#settings-connect').getBoundingClientRect();
        return {columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,aligned:cards.every((c,i)=>{const r=c.getBoundingClientRect();return Math.abs(r.left-bounds.left)<2&&Math.abs(r.width-bounds.width)<2&&(!i||r.top>=cards[i-1].getBoundingClientRect().bottom-1)}),buttonWidth:button.width,gridWidth:bounds.width};
      });
      assert.equal(settingsLayout.columns,1,`${width}x${height} settings must use a single column`);
      assert(settingsLayout.aligned,`${width}x${height} settings cards must span the available width`);
      if(width>640)assert(settingsLayout.buttonWidth<settingsLayout.gridWidth*.7,'Server button must keep its natural width');
      assert.deepEqual(errors,[]);
      await page.close();
    }
    console.log('PASS: all three catalogs fill portrait, landscape and TV viewport; independent scrolling, DPAD focus and settings order');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
