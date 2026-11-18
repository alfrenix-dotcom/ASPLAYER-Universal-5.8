const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

(async()=>{
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
  try{
    const setup=async(tv,capable)=>{
      const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(({tv,capable})=>{
        window.glassNative=[];
        window.ASPLAYER={isAndroidTv:()=>tv,supportsPremiumGlass:()=>capable,setGlassAppearance:m=>window.glassNative.push(m)};
      },{tv,capable});
      await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
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
    const metrics=await mobile.evaluate(()=>{
      const bar=document.querySelector('.mobilebar'),h=document.querySelector('.topbar');
      return {left:bar.getBoundingClientRect().left,bottom:innerHeight-bar.getBoundingClientRect().bottom,pad:parseFloat(getComputedStyle(h).paddingTop),blur:getComputedStyle(bar).backdropFilter};
    });
    assert(metrics.left>=8&&metrics.bottom>=24&&metrics.pad>=28&&metrics.blur.includes('blur'));
    await mobile.locator('#glass-appearance').selectOption('light');
    assert.equal(await mobile.locator('body').getAttribute('data-glass-effective'),'light');
    assert.equal(await mobile.locator('.mobilebar').evaluate(el=>getComputedStyle(el).backdropFilter),'none');
    assert.equal(await mobile.evaluate(()=>window.glassNative.at(-1)),'light');
    await mobile.locator('#glass-appearance').selectOption('premium');
    await mobile.reload();
    assert.equal(await mobile.locator('#glass-appearance').inputValue(),'premium');
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
    await tv.locator('.sidebar [data-nav="home"]').focus();
    assert.equal(await tv.evaluate(()=>document.activeElement.dataset.nav),'home');
    assert.deepEqual(tvErrors,[]);
    console.log('PASS: floating glass, real menu blur, safe system insets, adaptive TV fallback, keyboard, persisted preference, localization and focus');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
