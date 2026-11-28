const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const java=fs.readFileSync('app/src/main/java/com/alftech/asplayer/universal/MainActivity.java','utf8');
assert.match(java,/@JavascriptInterface public void setPlaybackTitle\(String name,String mode\)/);
assert.match(java,/localized\("Canal: ","Channel: "\)\+playbackContentTitle/);
assert.match(java,/localized\("Película: ","Movie: "\)\+playbackContentTitle/);
assert.match(java,/if\(!isLive\)showControls\(\);\s*break;\s*case MediaPlayer\.Event\.EndReached:/);
assert.match(java,/&&\s*\(isLive\|\|player==null\|\|mediaPlaying\(\)\)/);
assert.match(java,/playbackContentTitle="";playbackContentMode="";/);
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
 try{
  for(const tv of [false,true]){
   const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(tv=>{
    window.calls=[];
    window.ASPLAYER={
      isAndroidTv:()=>tv,isRemoteNavigation:()=>tv,
      playMedia:(...args)=>window.calls.push(['media',...args]),
      playLiveMedia:(...args)=>window.calls.push(['liveMedia',...args]),
      stopMedia:()=>window.calls.push(['stop']),
      setPlaybackTitle:(...args)=>window.calls.push(['title',...args]),
      setSeriesNavigation:(...args)=>window.calls.push(['nav',...args]),
      setUiLanguage:()=>{},setPlaybackOptions:()=>{},setDecoderMode:()=>{},
      supportsPremiumGlass:()=>true,getPerformanceTier:()=>tv?'efficient':'complete'
    };
   },tv);
   const root=path.resolve('app/src/main/assets');
   await page.route('http://asplayer.test/**',r=>{
    const f=path.join(root,new URL(r.request().url()).pathname);
    return fs.existsSync(f)?r.fulfill({path:f}):r.abort();
   });
   await page.goto('http://asplayer.test/index.html');
   const result=await page.evaluate(()=>{
    loginPinAccepted=true;sessions[server().key]={user:'test',pass:'test'};
    active='vod';parentEnabled=false;
    play({stream_id:'101',name:'Película de prueba',container_extension:'mp4'},'vod');
    const film=window.calls.slice();
    window.calls=[];
    play({stream_id:'201',name:'Canal Noticias',stream_icon:'https://assets.example.invalid/p.png'},'live');
    const live=window.calls.slice();
    return {film,live};
   });
   const filmTitle=result.film.findIndex(x=>x[0]==='title');
   const filmMedia=result.film.findIndex(x=>x[0]==='media');
   assert.ok(filmTitle>=0&&filmMedia>filmTitle,'movie title is sent before playMedia');
   assert.deepEqual(result.film[filmTitle],['title','Película de prueba','vod']);
   const liveTitle=result.live.findIndex(x=>x[0]==='title');
   const liveMedia=result.live.findIndex(x=>x[0]==='media'||x[0]==='liveMedia');
   assert.ok(liveTitle>=0&&liveMedia>liveTitle,'live title is sent before stream opens');
   assert.deepEqual(result.live[liveTitle],['title','Canal Noticias','live']);
   assert.ok(!result.live[liveTitle].join('|').includes('test/test'),'no stream credentials in title');
   assert.deepEqual(errors,[],'no JS errors');
   console.log('PASS native movie/channel title forwarding '+(tv?'TV':'mobile'));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});