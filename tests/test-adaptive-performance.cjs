const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

(async () => {
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
 try {
  async function setup(tv,tier) {
   const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({tv,tier})=>{
     window.ASPLAYER={
       isAndroidTv:()=>tv,
       isRemoteNavigation:()=>tv,
       supportsPremiumGlass:()=>true,
       getPerformanceTier:()=>tier
     };
   },{tv,tier});
   // Use a stable origin to validate preferences persisted between loads.
   await page.route('http://asplayer.test/**',route=>{
     const f=path.join(path.resolve('app/src/main/assets'),new URL(route.request().url()).pathname);
     return fs.existsSync(f)?route.fulfill({path:f}):route.abort();
   });
   await page.goto('http://asplayer.test/index.html');
   await page.evaluate(()=>{
     document.querySelector('#auth-screen').classList.add('hidden');
     document.querySelector('#app-shell').classList.remove('hidden');
     document.querySelector('#view-home').classList.add('hidden');
     document.querySelector('#view-settings').classList.remove('hidden');
     if(typeof asplayerUpdateViewportMode==='function')asplayerUpdateViewportMode();
   });
   assert.equal(await page.locator('#asplayer-performance-profile').count(),1,'one selector');
   assert.equal(await page.locator('#asplayer-performance-profile option').count(),4,'four modes');
   assert.equal(await page.locator('#asplayer-performance-profile').inputValue(),'auto');
   assert.equal(await page.locator('body').getAttribute('data-performance-effective'),tier);
   return {page,errors};
  }
  const scenarios=[
   {tv:false,tier:'efficient'},
   {tv:false,tier:'balanced'},
   {tv:false,tier:'complete'},
   {tv:true,tier:'efficient'},
   {tv:true,tier:'balanced'},
   {tv:true,tier:'complete'}
  ];
  for (const {tv,tier} of scenarios) {
   const {page,errors}=await setup(tv,tier);
   // Even a manually enabled premium glass effect must stay lightweight in efficient mode.
   await page.locator('#glass-appearance').selectOption('premium');
   const glass=await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).backdropFilter);
   if(tier==='efficient') assert.equal(glass,'none','efficient disables heavy panel blur');
   if(tier==='balanced') assert.match(glass,/blur\(6px\)/,'balanced uses restrained blur');
   if(tier==='complete') assert.match(glass,/blur\(/,'complete retains premium blur');
   const navButtons=await page.locator('.sidebar [data-nav]').count();
   assert.equal(navButtons,5,'navigation stays available');
   const shellFocus=await page.locator('.sidebar [data-nav="home"]').evaluate(el=>el.getAttribute('tabindex'));
   assert.notEqual(shellFocus,'-1','focusable navigation retained');
   if(tv) {
     await page.locator('.sidebar [data-nav="home"]').focus();
     await page.keyboard.press('ArrowDown');
     assert.equal(await page.evaluate(()=>document.activeElement.dataset.nav),'live','remote focus stays unchanged');
   }
   await page.locator('#asplayer-performance-profile').selectOption('efficient');
   assert.equal(await page.locator('body').getAttribute('data-performance-effective'),'efficient');
   await page.evaluate(()=>window.ASPLAYER_PERFORMANCE_UPDATE('complete'));
   assert.equal(await page.locator('body').getAttribute('data-performance-effective'),'efficient','manual setting remains authoritative');
   await page.locator('#asplayer-performance-profile').selectOption('auto');
   assert.equal(await page.locator('body').getAttribute('data-performance-effective'),'complete','auto reacts to native signal');
   await page.evaluate(()=>window.ASPLAYER_PERFORMANCE_UPDATE('efficient'));
   assert.equal(await page.locator('body').getAttribute('data-performance-effective'),'efficient','low-memory auto signal');
   await page.evaluate(()=>window.ASPLAYER_PERFORMANCE_UPDATE('not-a-tier'));
   assert.equal(await page.locator('body').getAttribute('data-performance-effective'),'efficient','invalid signals ignored');
   await page.locator('#asplayer-performance-profile').selectOption('balanced');
   await page.reload();
   assert.equal(await page.locator('#asplayer-performance-profile').inputValue(),'balanced','preference survives app relaunch');
   assert.equal(await page.locator('body').getAttribute('data-performance-effective'),'balanced');
   assert.equal(await page.evaluate(()=>document.querySelectorAll('#asplayer-performance-setting').length),1,'no duplicate settings block');
   await page.evaluate(()=>{lang='es';languageUI();});
   assert.match(await page.locator('#asplayer-performance-setting h3').innerText(),/Rendimiento/);
   assert.match(await page.locator('#asplayer-performance-status').innerText(),/Equilibrado/);
   assert.equal(await page.locator('#asplayer-performance-profile').inputValue(),'balanced');
   assert.deepEqual(errors,[],'no JS exceptions');
   await page.close();
  }
  console.log('PASS: adaptive performance efficient/balanced/complete/auto on TV and mobile, persistence, language, blur, native tier updates, DPAD');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});