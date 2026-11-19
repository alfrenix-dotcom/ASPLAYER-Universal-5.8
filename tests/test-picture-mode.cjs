const { chromium } = require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
  try{
    for(const [viewport,upgrade] of [[{width:390,height:844},false],[{width:1280,height:720},true]]){
      const page=await browser.newPage({viewport});
      await page.addInitScript(upgrade=>{
        if(upgrade&&!localStorage.getItem('asplayer:settings:v5.2'))localStorage.setItem('asplayer:settings:v5.2',JSON.stringify({aspect:'cover',language:'es',audioPref:'es'}));
      },upgrade);
      await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
      assert.equal(await page.locator('#default-aspect').inputValue(),'contain');
      assert.equal(await page.evaluate(()=>playAspect),'contain');
      if(upgrade)assert.equal(await page.evaluate(()=>({lang,audioPref})).then(x=>x.lang+'-'+x.audioPref),'es-es');
      await page.evaluate(()=>{const select=document.querySelector('#default-aspect');select.value='cover';select.dispatchEvent(new Event('change'));});
      assert.equal(await page.evaluate(()=>playAspect),'cover');
      await page.waitForFunction(()=>document.querySelector('#video').style.objectFit==='cover');
      await page.reload();
      assert.equal(await page.locator('#default-aspect').inputValue(),'cover');
      await page.evaluate(()=>{const select=document.querySelector('#default-aspect');select.value='contain';select.dispatchEvent(new Event('change'));});
      await page.waitForFunction(()=>document.querySelector('#video').style.objectFit==='contain');
      await page.close();
    }
    console.log('PASS: Fit default on new and upgraded installs; Fill selection persists; both orientations');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
