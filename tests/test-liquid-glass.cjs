const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');

(async()=>{
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
  try{
    const setup=async(tv,capable)=>{
      const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(({tv,capable})=>{
        try{localStorage.setItem('asplayer:appearance:glass-transparency:v1','100');}catch(_){}
        window.glassNative=[];window.glassTransparency=[];
        window.ASPLAYER={isAndroidTv:()=>tv,supportsPremiumGlass:()=>capable,setGlassAppearance:m=>window.glassNative.push(m),setGlassTransparency:v=>window.glassTransparency.push(v)};
      },{tv,capable});
      // Give storage a stable origin. Desktop Chrome's file:// storage
      // semantics differ from Android WebView and are not portable on reload.
      await page.route('http://asplayer.test/**',route=>{
        const file=path.join(path.resolve('app/src/main/assets'),new URL(route.request().url()).pathname);
        return fs.existsSync(file)?route.fulfill({path:file}):route.abort();
      });
      await page.goto('http://asplayer.test/index.html');
      await page.evaluate(()=>{
        document.querySelector('#auth-screen').classList.add('hidden');
        document.querySelector('#app-shell').classList.remove('hidden');
        document.querySelector('#mobilebar').classList.remove('hidden');
        document.querySelector('#view-settings').classList.remove('hidden');
        document.documentElement.style.setProperty('--android-top','28px');
        document.documentElement.style.setProperty('--android-bottom','24px');
      });
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.topbar')).borderRadius!=='0px');
      return {page,errors};
    };
    const {page:mobile,errors}=await setup(false,true);
    assert.equal(await mobile.locator('body').getAttribute('data-glass-effective'),'premium');
    assert.equal(await mobile.locator('#glass-transparency').inputValue(),'50');
    const metrics=await mobile.evaluate(()=>{
      const bar=document.querySelector('.mobilebar'),h=document.querySelector('.topbar');
      return {left:bar.getBoundingClientRect().left,bottom:innerHeight-bar.getBoundingClientRect().bottom,pad:parseFloat(getComputedStyle(h).paddingTop),blur:getComputedStyle(bar).backdropFilter};
    });
    assert(metrics.left>=8&&metrics.bottom>=24&&metrics.pad>=28&&metrics.blur.includes('blur'));
    await mobile.locator('#glass-appearance').selectOption('light');
    assert.equal(await mobile.locator('body').getAttribute('data-glass-effective'),'light');
    assert.equal(await mobile.locator('.mobilebar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    assert.equal(await mobile.evaluate(()=>window.glassNative.at(-1)),'light');
    await mobile.locator('#glass-transparency').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await mobile.locator('.mobilebar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    await mobile.locator('#glass-appearance').selectOption('premium');
    const setTransparency=value=>mobile.locator('#glass-transparency').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
    await setTransparency(0);
    const solid=await mobile.locator('.glass-preview-surface').evaluate(el=>getComputedStyle(el).backgroundImage);
    const panelAlpha=()=>mobile.locator('.mobilebar').evaluate(el=>{
      const matches=[...getComputedStyle(el).backgroundImage.matchAll(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/g)];
      return Number(matches.at(-1)?.[1]);
    });
    await setTransparency(50);
    assert(Math.abs(await panelAlpha()-.54)<.02,'50% matches the old maximum');
    await setTransparency(100);
    assert(Math.abs(await panelAlpha()-.12)<.02,'100% has a substantially more transparent premium surface');
    assert.equal(await mobile.locator('.mobilebar').evaluate(el=>getComputedStyle(el).opacity),'1','text remains opaque');
    assert.notEqual(await mobile.locator('.glass-preview-surface').evaluate(el=>getComputedStyle(el).backgroundImage),solid);
    assert.equal(await mobile.locator('#glass-transparency-value').textContent(),'100%');
    assert.equal(await mobile.evaluate(()=>window.glassTransparency.at(-1)),100);
    await mobile.locator('#glass-appearance').selectOption('off');
    assert.equal(await mobile.locator('#glass-transparency').isDisabled(),true);
    assert.equal(await mobile.locator('.mobilebar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    await mobile.locator('#glass-appearance').selectOption('premium');
    await mobile.waitForFunction(()=>localStorage.getItem('asplayer:appearance:glass:v1')==='premium');
    await mobile.reload();
    await mobile.waitForFunction(()=>document.body.dataset.glassMode==='premium');
    assert.equal(await mobile.locator('#glass-appearance').inputValue(),'premium');
    assert.equal(await mobile.locator('#glass-transparency').inputValue(),'100');
    await mobile.locator('#glass-reset').evaluate(el=>el.click());
    assert.equal(await mobile.locator('#glass-appearance').inputValue(),'adaptive');
    assert.equal(await mobile.locator('#glass-transparency').inputValue(),'50');
    await mobile.evaluate(()=>{lang='es';languageUI();});
    assert.match(await mobile.locator('#glass-heading').innerText(),/Apariencia/);
    await mobile.evaluate(()=>{document.querySelector('#mobilebar').classList.remove('hidden');document.documentElement.classList.add('android-keyboard');});
    assert.equal(await mobile.locator('.mobilebar').isVisible(),false);
    assert.deepEqual(errors,[]);
    const {page:tv,errors:tvErrors}=await setup(true,false);
    assert.equal(await tv.locator('body').getAttribute('data-glass-effective'),'light');
    assert.equal(await tv.locator('.sidebar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    await tv.locator('#glass-appearance').selectOption('premium');
    assert.equal(await tv.locator('body').getAttribute('data-glass-effective'),'premium');
    await tv.locator('#glass-transparency').focus();
    await tv.keyboard.press('ArrowRight');
    assert.equal(await tv.locator('#glass-transparency').inputValue(),'55');
    await tv.locator('.sidebar [data-nav="home"]').focus();
    assert.equal(await tv.evaluate(()=>document.activeElement.dataset.nav),'home');
    assert.deepEqual(tvErrors,[]);
    console.log('PASS: floating glass, real menu blur, safe system insets, adaptive TV fallback, keyboard, persisted preference, localization and focus');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
