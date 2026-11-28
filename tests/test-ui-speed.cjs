const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');

(async()=>{
 const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{channel:'chrome'}),headless:true});
 try{
  for(const tv of [false,true]){
   const page=await browser.newPage({viewport:tv?{width:1280,height:720}:{width:390,height:844},hasTouch:!tv});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(tv=>{
    window.ASPLAYER={
     isAndroidTv:()=>tv,isRemoteNavigation:()=>tv,
     supportsPremiumGlass:()=>true,getPerformanceTier:()=>tv?'efficient':'complete',
     setUiLanguage:()=>{},setPlaybackOptions:()=>{},setDecoderMode:()=>{},setImageEnhancement:()=>{}
    };
   },tv);
   const root=path.resolve('app/src/main/assets');
   await page.route('http://asplayer.test/**',route=>{
    const file=path.join(root,new URL(route.request().url()).pathname);
    return fs.existsSync(file)?route.fulfill({path:file}):route.abort();
   });
   await page.goto('http://asplayer.test/index.html');
   const result=await page.evaluate(()=>{
    loginPinAccepted=true;sessions[server().key]={user:'tester',pass:'test'};
    document.querySelector('#auth-screen').classList.add('hidden');
    document.querySelector('#app-shell').classList.remove('hidden');
    document.querySelector('#view-home').classList.add('hidden');
    document.querySelector('#view-catalog').classList.remove('hidden');
    active='vod';category='4';parentEnabled=true;unlockedCats=new Set(['0']);
    cats=Array.from({length:70},(_,i)=>({category_id:String(i),category_name:i%9===0?'Adult films':'General'}));
    catalog=Array.from({length:4200},(_,i)=>({
      stream_id:String(i),category_id:String(i%70),name:'Movie '+String(i*17%4200).padStart(4,'0'),
      added:i%13===0?'':String(1700000000+i*181),
      rating:i%7===0?'':String((i*7%100)/10),release_date:i%13===0?String(2010+i%12):''
    }));
    filter='movie'; 
    const oldRender=renderItems;renderItems=()=>{};
    const refDate=v=>{
     if(!v||typeof v!=='object')return 0;
     const added=Number(v.added||v.added_date||v.date_added||v.created_at);
     if(Number.isFinite(added)&&added>1e9&&added<4e12)return added>1e12?added:added*1000;
     const values=[v.releasedate,v.releaseDate,v.release_date,v.air_date,v.first_air_date,v.date,v.year];
     for(const value of values){if(value==null)continue;const str=String(value).trim(),date=/^(19|20)\d{2}$/.test(str)?Date.UTC(Number(str),0,1):Date.parse(str);if(Number.isFinite(date))return date;}
     const title=String(v.name||v.title||''),m=title.match(/(?:^|\s|\()((?:19|20)\d{2})(?:\)|\s|$)/);
     return m?Date.UTC(Number(m[1]),0,1):0;
    };
    const refRating=v=>{
     if(!v||typeof v!=='object')return -1;
     for(const field of ['rating','rating_imdb','imdb_rating','vote_average','rating_5based','score']){
      const raw=v[field];if(raw===undefined||raw===null||raw==='')continue;
      const m=String(raw).match(/\d+(?:\.\d+)?/);if(!m)continue;
      let n=Number(m[0]);if(field==='rating_5based')n*=2;
      if(n>0&&n<=10)return n;
     }
     return -1;
    };
    const baseline=(mode)=>{
     let result=catalog.filter(it=>!filter||String(it.name||it.title||'').toLowerCase().includes(filter));
     if(parentEnabled)result=result.filter(it=>{const c=cats.find(x=>String(x.category_id)===String(it.category_id));return !isAdult(c?.category_name)||unlockedCats.has(String(it.category_id));});
     if(active!=='live')result.sort((a,b)=>{
      let diff=0;
      if(mode==='rated')diff=refRating(b)-refRating(a);
      if(!diff){const x=refDate(a),y=refDate(b);diff=mode==='old'?(x&&y?x-y:x?-1:y?1:0):(x&&y?y-x:x?-1:y?1:0);}
      return diff||String(a.name||a.title||'').localeCompare(String(b.name||b.title||''),lang);
     });
     return result.map(it=>it.stream_id);
    };
    const measurements=[];
    for(const mode of ['new','old','rated']){
     const order=document.getElementById('order-content');order.value=mode;order.dispatchEvent(new Event('change',{bubbles:true}));
     for(const query of ['movie','movie 0','movie 2']){
      filter=query;
      const t0=performance.now(),expected=baseline(mode),oldTime=performance.now()-t0;
      const t1=performance.now();applyFilter();const newTime=performance.now()-t1;
      const actual=filtered.map(it=>it.stream_id);
      if(actual.length!==expected.length||actual.some((x,i)=>x!==expected[i]))
       throw Error('Sort/filter changed: '+mode+'/'+query);
      measurements.push({mode,query,oldMs:+oldTime.toFixed(1),optimizedMs:+newTime.toFixed(1),count:actual.length});
     }
    }
    renderItems=oldRender;
    // The existing pager and D-pad still own the same card identities.
    filter='movie 0';const order=document.getElementById('order-content');
    order.value='new';order.dispatchEvent(new Event('change',{bubbles:true}));
    const items=document.querySelectorAll('#cards [data-item]');
    if(!items.length)throw Error('Cards missing after optimized filter');
    return {measurements,count:filtered.length,rendered:items.length};
   });
   assert(result.rendered<=100,'bounded DOM preserved');
   assert(result.count>0,'catalog searchable');
   const cache=await page.evaluate(async()=>{
    let calls=0;
    cacheRead=async()=>null;cacheWrite=async()=>{};
    api=async(action)=>{calls++;await new Promise(r=>setTimeout(r,15));return [{category_id:'1',category_name:'One'},{category_id:'2',category_name:'Two'}];};
    const [one,two]=await Promise.all([cached('get_vod_categories'),cached('get_vod_categories')]);
    if(calls!==1||one===two)throw Error('Duplicate category calls were not coalesced and copied');
    const three=await cached('get_vod_categories');if(calls!==1||three.length!==2)throw Error('Small category memo missed');
    await cached('get_vod_categories',{},true);if(calls!==2)throw Error('Manual refresh did not bypass memo');
    await cacheDeletePrefix(sessionPrefix());
    await cached('get_vod_categories');if(calls!==3)throw Error('Cache clear did not invalidate memo');
    await cached('get_vod_streams',{category_id:'1'});await cached('get_vod_streams',{category_id:'1'});
    if(calls!==5)throw Error('Large provider requests should retain original cache path');
    return calls;
   });
   assert.equal(cache,5);
   if(tv){
    await page.evaluate(()=>window.ASPLAYER_PERFORMANCE_UPDATE('efficient'));
    const shadow=await page.locator('#cards .tile').nth(1).evaluate(el=>getComputedStyle(el).boxShadow);
    assert.equal(shadow,'none','only unfocused decorative card shadow removed on low end');
   }
   assert.deepEqual(errors,[],'no browser JS errors');
   console.log('PASS UI speed '+(tv?'TV':'mobile')+': equivalence and low-memory rendering; cache counts='+cache+'; measurements='+JSON.stringify(result.measurements));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});