/* ASPLAYER 5.6: direct support links, recent series, complete category navigation,
   Xtream response normalization and transient connection retries.
   No provider credentials are sent to a third-party guide or service. */
(function(){
'use strict';
const E=id=>document.getElementById(id);
const words={
 en:{recentSeries:'Recently added series',viewSeries:'View all series',showAllCats:'View all categories',collapseCats:'Collapse categories',categoryAvailable:'categories available',categorySelected:'Choose from all available categories',phoneCall:'Call',guideServerOnlyHint:'The programme schedule comes only from the current IPTV server.',guide8h:'Server EPG is cached to improve loading speed.',serverProblem:'Could not connect to this server. Check your network and try again.',seriesEmpty:'No recently added series are available from this server.'},
 es:{recentSeries:'Series recién agregadas',viewSeries:'Ver todas las series',showAllCats:'Ver todas las categorías',collapseCats:'Contraer categorías',categoryAvailable:'categorías disponibles',categorySelected:'Elige entre todas las categorías disponibles',phoneCall:'Llamar',guideServerOnlyHint:'La programación se obtiene solamente del servidor IPTV seleccionado.',guide8h:'El EPG del servidor se guarda temporalmente para acelerar su carga.',serverProblem:'No se pudo conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.',seriesEmpty:'Este servidor no ofrece series recientes.'}
};
Object.assign(LABELS.en,words.en);Object.assign(LABELS.es,words.es);
// Read-only external launches use the restricted Android bridge. No WebView redirects.
document.addEventListener('click',e=>{
 const link=e.target.closest('a[data-open-link]');if(!link)return;
 const url=link.dataset.openLink;
 if(!['https://wa.me/12367021555','mailto:company@alftechsolutions.com','https://www.alftechsolutions.com/','tel:+12367021555'].includes(url))return;
 e.preventDefault();
 if(url==='tel:+12367021555')return; // Original handler performs this action once.
 if(url==='https://www.alftechsolutions.com/'&&link.id==='website')return; // Existing site handler.
 openLink(url);
});
// More compatible parsing for panels that wrap array values in a data property.
const originalApi56=api;
function normalizeResult(value){
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const inner=value.response||value.result;
  if(inner&&typeof inner==='object'&&inner.user_info&&!value.user_info)return inner;
 }
 return value;
}
api=async function(action='',extra={},override=null,serverOverride=null){
 const request=()=>originalApi56(action,extra,override,serverOverride).then(normalizeResult);
 try{return await request()}catch(err){
  const msg=String(err?.message||err||'');
  if(!/timeout|conectar|internet|connection|network|temporar|503|502|504/i.test(msg)||/cancelled/i.test(msg))throw err;
  await new Promise(r=>setTimeout(r,650));
  return await request();
 }
};
const originalCached56=cached;
function normalizedList(x){
 if(Array.isArray(x))return x;
 if(x&&typeof x==='object')for(const key of ['categories','streams','data','items','results','series','list'])if(Array.isArray(x[key]))return x[key];
 return x;
}
cached=async function(action,extra={},force=false){
 const listAction=/^get_(?:live_categories|vod_categories|series_categories|live_streams|vod_streams|series)$/.test(action);
 try{
  const response=await originalCached56(action,extra,force);
  return listAction?normalizedList(response):response;
 }catch(err){
  if(!listAction||!extra?.category_id)return Promise.reject(err);
  // Some Xtream-compatible panels reject the category_id filter; retrieve and filter locally.
  const result=normalizedList(await originalCached56(action,{},force));
  if(!Array.isArray(result))throw err;
  const id=String(extra.category_id);
  return result.filter(it=>String(it.category_id)===id || (Array.isArray(it.category_ids)&&it.category_ids.map(String).includes(id)));
 }
};
// Accept common boolean auth flag variant while retaining prior persistence keys.
// 5.5 already validates server response; this broadens the accepted Xtream representation.
// (No password or token is embedded in the APK.)
let expandedCategories=false;
const originalRenderCats56=renderCats;
renderCats=function(){
 originalRenderCats56();
 const total=Array.isArray(cats)?cats.length:0;
 E('category-tools').classList.toggle('hidden',!['live','vod','series'].includes(active));
 E('category-count').textContent='☷ '+total+' '+tr('categoryAvailable');
 const expand=E('category-expand');
 expand.classList.toggle('hidden',total<=9);
 expand.textContent=expandedCategories?tr('collapseCats'):tr('showAllCats')+' ('+total+')';
 E('categories').classList.toggle('expanded',expandedCategories);
};
const originalLoadCats56=loadCategories;
loadCategories=function(tab,force=false){
 expandedCategories=false;
 E('categories').classList.remove('expanded');
 return originalLoadCats56(tab,force);
};
E('category-expand').addEventListener('click',()=>{
 expandedCategories=!expandedCategories;
 E('categories').classList.toggle('expanded',expandedCategories);
 E('category-expand').textContent=expandedCategories?tr('collapseCats'):tr('showAllCats')+' ('+cats.length+')';
});
// Home series are independent from movies and are tied to the active server/account.
let latestSeries=[],seriesHomeGeneration=0;
function seriesDate(v){
 const n=Number(v.added||v.added_date||v.created_at||0);
 if(Number.isFinite(n)&&n>1e9&&n<4e12)return n>1e12?n:n*1000;
 for(const vdate of [v.release_date,v.releaseDate,v.releasedate,v.first_air_date,v.date,v.year]){
  const y=String(vdate||'');if(!y)continue;
  const date=/^(19|20)\d{2}$/.test(y)?Date.UTC(Number(y),0,1):Date.parse(y);
  if(Number.isFinite(date))return date;
 }
 return 0;
}
function seriesCard(it,i){
 const src=safeImage(it.cover||it.stream_icon||it.movie_image||it.backdrop_path?.[0]);
 return '<button class="poster" data-newseries="'+i+'">'+
  (src?'<img src="'+esc(src)+'" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">':'<div class="pict">🍿</div>')+
  '<strong>'+esc(it.name||it.title||'Series')+'</strong></button>';
}
function paintSeries(){
 if(!session())return;
 E('recent-series').innerHTML=latestSeries.length?latestSeries.map(seriesCard).join(''):'<p class="muted">'+esc(tr('seriesEmpty'))+'</p>';
}
async function fetchLatestSeries(force=false){
 const run=++seriesHomeGeneration,key=sessionPrefix(),generation=sessionGeneration;
 E('recent-series').innerHTML='<p class="tiny"><span class="spin"></span> '+esc(tr('loading'))+'</p>';
 const current=()=>run===seriesHomeGeneration&&key===sessionPrefix()&&generation===sessionGeneration&&!!session();
 try{
  const categoryResponse=await cached('get_series_categories',{},force);
  if(!current())return;
  const choices=Array.isArray(categoryResponse)?categoryResponse:[];
  const featured=choices.find(x=>/recent|new|latest|added|estreno|novedad|nueva|reci[eé]n/i.test(x.category_name||''));
  let items=[];
  if(featured){items=await cached('get_series',{category_id:featured.category_id},force)}
  else{
   try{items=await cached('get_series',{},force)}
   catch(_){if(choices.length)items=await cached('get_series',{category_id:choices[0].category_id},force)}
  }
  if(!current())return;
  if(!Array.isArray(items))items=[];
  if(parentEnabled){
   const restricted=new Set(choices.filter(c=>isAdult(c.category_name)).map(c=>String(c.category_id)));
   items=items.filter(x=>!restricted.has(String(x.category_id)));
  }
  // If the server lacks addition times, use release year and stable original order.
  latestSeries=items.slice().sort((a,b)=>seriesDate(b)-seriesDate(a)).slice(0,20);
  paintSeries();
 }catch(_){if(current()){latestSeries=[];paintSeries()}}
}
const originalWarm56=warmHome;
warmHome=function(force=false){
 if(!session())return Promise.resolve();
 const jobs=[originalWarm56(force),fetchLatestSeries(force)];
 return Promise.allSettled(jobs).then(()=>{});
};
const originalRecent56=renderRecent;
renderRecent=function(){originalRecent56();if(E('recent-series'))paintSeries()};
const originalLanguage56=languageUI;
languageUI=function(){originalLanguage56();if(E('category-count')&&!E('category-tools').classList.contains('hidden'))renderCats();if(session())paintSeries()};
E('recent-series').addEventListener('click',e=>{
 const b=e.target.closest('button[data-newseries]');if(!b)return;
 const it=latestSeries[Number(b.dataset.newseries)];if(it)showSeries(it);
});
E('see-all-series').addEventListener('click',()=>showTab('series'));
const originalSwitch56=switchToServer;
switchToServer=function(index){latestSeries=[];seriesHomeGeneration++;originalSwitch56(index)};
const originalLogout56=logout;
logout=function(){latestSeries=[];seriesHomeGeneration++;originalLogout56()};
// Enforce provider-only EPG even when upgrading an older version that had XMLTV enabled.
settings.epgSource='server';settings.epgCountry='';saveSettings();
E('epg-source').value='server';
languageUI();
console.info('ASPLAYER 5.6: WhatsApp/email, recent series, all categories, Xtream-only EPG');
})();
