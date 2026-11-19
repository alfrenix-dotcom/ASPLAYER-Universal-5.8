const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});try{
 for(const tv of [false,true]){
  const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(tv=>{window.aiCalls=[];window.ASPLAYER={isAndroidTv:()=>tv,requestAsync:(url,id)=>window.ASPLAYER_REPLY(id,'{}'),requestAiAsync:(url,body,id)=>{window.aiCalls.push([url,JSON.parse(body)]);window.ASPLAYER_REPLY(id,JSON.stringify(url.endsWith('/synopsis')?{grounded:true,synopsis:'AI translated plot'}:{mode:'search',answer:'Try comedy',keywords:['comedy']}))}}},tv);
  await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
  assert.equal(await page.locator('#online-endpoint').inputValue(),'https://asplayer-ai.alfrenix.workers.dev');
  assert.equal(await page.locator('#synopsis-source').inputValue(),'server');
  await page.evaluate(()=>{loginPinAccepted=true;sessions[server().key]={user:'secret-user',pass:'secret-pass',meta:{}};document.querySelector('#auth-screen').classList.add('hidden');document.querySelector('#app-shell').classList.remove('hidden');document.querySelector('#view-home').classList.add('hidden');document.querySelector('#view-catalog').classList.remove('hidden');active='vod';category='all';parentEnabled=true;cats=[{category_id:'1',category_name:'Comedy'},{category_id:'2',category_name:'Adult'}];catalog=[{stream_id:'1',name:'Family fun',category_id:'1'},{stream_id:'2',name:'Adult comedy',category_id:'2'}];cached=async()=>({info:{plot:'Provider detail',genre:'Comedy'}});applyFilter();});
  await page.locator('button[data-i18n="aiTitle"]').click();await page.locator('#ai-question').fill('Find comedy');await page.locator('button[data-i18n="aiAsk"]').click();
  await page.waitForFunction(()=>document.querySelector('#ai-results button'));
  assert.equal(await page.evaluate(()=>window.aiCalls.at(-1)[0]),'https://asplayer-ai.alfrenix.workers.dev/api/assistant');
  await page.evaluate(()=>{document.querySelector('#online-endpoint').value='https://example.workers.dev';document.querySelector('#save-online').click();const s=document.querySelector('#synopsis-source');s.value='ai';s.dispatchEvent(new Event('change'));});
  await page.locator('button[data-i18n="aiAsk"]').click();await page.waitForFunction(()=>document.querySelector('#ai-results button'));
  assert.deepEqual(await page.locator('#ai-results button').allTextContents(),['Family fun']);assert(!JSON.stringify(await page.evaluate(()=>window.aiCalls)).includes('secret-'));
  await page.locator('#ai-results button').click();await page.waitForFunction(()=>document.querySelector('#detail-plot').textContent==='AI translated plot');
  assert.equal(await page.evaluate(()=>window.aiCalls.at(-1)[1].original),'Provider detail');
  await page.reload();assert.equal(await page.locator('#online-endpoint').inputValue(),'https://example.workers.dev');
  await page.evaluate(()=>{document.querySelector('#online-endpoint').value='';document.querySelector('#save-online').click()});
  await page.reload();assert.equal(await page.locator('#online-endpoint').inputValue(),'');
  await page.evaluate(()=>window.ASPLAYER_RESET_AI_ENDPOINT());assert.equal(await page.locator('#online-endpoint').inputValue(),'https://asplayer-ai.alfrenix.workers.dev');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: AI opt-in, private account data, parental filtering and grounded synopsis on phone and TV');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
