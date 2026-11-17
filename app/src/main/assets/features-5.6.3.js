/* ASPLAYER 5.6.3: global catalog search and native Live TV load status.
   Xtream's unfiltered get_vod_streams / get_series provide an all-categories
   catalog. No artificial progress percentage is calculated for live streams. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
Object.assign(LABELS.en,{
 allCatalogHint:'Search movies or series from every category',
 allCatalogLoading:'Loading the complete server catalog…',
 channelOpening:'Opening channel…',
 channelReconnecting:'Reconnecting channel…',
 channelLoadingPercent:'Channel loading',
 channelReady:'Channel ready',
 allCategoriesNotice:'All categories'
});
Object.assign(LABELS.es,{
 allCatalogHint:'Busca películas o series de todas las categorías',
 allCatalogLoading:'Cargando el catálogo completo del servidor…',
 channelOpening:'Abriendo canal…',
 channelReconnecting:'Reconectando canal…',
 channelLoadingPercent:'Cargando canal',
 channelReady:'Canal listo',
 allCategoriesNotice:'Todas las categorías'
});

// Retain original Xtream categories as-is. The synthetic "all" chip must
// NOT be included in the server category count or the parental-category list.
const previousRenderCats563=renderCats;
renderCats=function(){
 previousRenderCats563();
 if(active!=='vod'&&active!=='series')return;
 const row=byId('categories');
 const btn=document.createElement('button');
 btn.type='button';btn.className='tab all-catalog-tab'+(category==='all'?' active':'');
 btn.dataset.category='all';btn.setAttribute('aria-label',tr('allCatalogHint'));
 btn.title=tr('allCatalogHint');btn.textContent='✦ '+tr('all');
 row.prepend(btn);
};

// First try Xtream's unfiltered list (fastest and usually complete). If that
// fails, e.g. because a large JSON response exceeds the native size limit,
// scan individual provider categories with bounded concurrency. Do not
// silently represent a partial result as a complete category index.
let partialGlobalIndex=false;
const priorCached563=cached;
cached=async function(action,extra={},force=false){
 const allRequest=category==='all' && ((active==='vod'&&action==='get_vod_streams')||(active==='series'&&action==='get_series')) && !Object.keys(extra).length;
 if(!allRequest)return priorCached563(action,extra,force);
 partialGlobalIndex=false;
 try{
  const direct=await priorCached563(action,extra,force);
  if(!Array.isArray(direct))throw Error('Invalid catalog response');
  return direct;
 }catch(failedFull){
  const providerCats=cats.filter(c=>c&&c.category_id!==undefined&&c.category_id!==null);
  if(!providerCats.length)throw failedFull;
  const generation=operation,account=sessionPrefix(),tab=active;
  let nextCategory=0,done=0,failed=0;
  const found=[];
  const stillCurrent=()=>generation===operation&&tab===active&&category==='all'&&sessionPrefix()===account;
  async function scan(){
   while(nextCategory<providerCats.length && stillCurrent()){
    const cat=providerCats[nextCategory++],id=String(cat.category_id);
    try{
     const values=await priorCached563(action,{category_id:id},force);
     if(!Array.isArray(values))throw Error('Unexpected category response');
     if(!stillCurrent())return;
     for(const item of values){
      if(item&&typeof item==='object')found.push(item.category_id==null?{...item,category_id:id}:item);
     }
    }catch(_){failed++}
    done++;
    if(stillCurrent()){
     byId('count').textContent=tr('allCatalogScan')+' '+done+'/'+providerCats.length;
    }
   }
  }
  await Promise.all(Array.from({length:Math.min(3,providerCats.length)},scan));
  if(!stillCurrent())throw Error('Cancelled');
  if(!found.length)throw failedFull;
  const index=new Map();
  for(const item of found){
   const id=String(item.stream_id??item.series_id??item.id??item.name??'');
   if(id&&!index.has(id))index.set(id,item);
  }
  partialGlobalIndex=failed>0;
  if(partialGlobalIndex)toast(tr('partialCatalog')+' ('+failed+'/'+providerCats.length+')');
  return [...index.values()];
 }
};
Object.assign(LABELS.en,{allCatalogScan:'Scanning categories',partialCatalog:'Some server categories could not be indexed; results may be incomplete.'});
Object.assign(LABELS.es,{allCatalogScan:'Revisando categorías',partialCatalog:'Algunas categorías no pudieron consultarse; los resultados podrían estar incompletos.'});

// "All" uses complete Xtream catalogs or the explicitly-labelled fallback.
// Native cache and 32-item visual paging are retained.
const previousLoadItems563=loadItems;
loadItems=function(force=false){
 if(category==='all'&&(active==='vod'||active==='series')){
  byId('count').textContent=tr('allCatalogLoading');
 }
 const job=previousLoadItems563(force);
 if(category==='all'&&(active==='vod'||active==='series')){
  byId('cards').innerHTML='<p class="empty"><span class="spin"></span> '+esc(tr('allCatalogLoading'))+'</p>';
 }
 return job;
};

// Allow typing a general query without a category if the user chose "All".
// Debouncing is implemented in the base search listener to avoid re-sorting
// a large movie catalog on every keystroke.
const progress=document.createElement('span');
progress.id='channel-load-progress';progress.className='channel-load-progress hidden';
progress.setAttribute('role','status');progress.setAttribute('aria-live','off');
byId('guide-origin').insertAdjacentElement('afterend',progress);
let loadingChannel=false,lastPercent=null,progressHideTimer=0;
function clearProgressTimer(){clearTimeout(progressHideTimer);progressHideTimer=0}
function showProgress(message){progress.textContent=message;progress.classList.toggle('hidden',!message)}
function isLiveVisible(){return playback?.mode==='live'&&!byId('modern-player').classList.contains('hidden')}
function openChannelIndicator(){
 clearProgressTimer();lastPercent=null;loadingChannel=true;
 showProgress(tr('channelOpening'));
}
function finishChannelIndicator(){
 if(!isLiveVisible())return;
 loadingChannel=false;lastPercent=100;showProgress(tr('channelLoadingPercent')+' 100%');
 clearProgressTimer();progressHideTimer=setTimeout(()=>showProgress(''),1000);
}
window.ASPLAYER_NATIVE_PROGRESS=function(value){
 if(!loadingChannel||!isLiveVisible())return;
 const n=Number(value);
 if(!Number.isInteger(n)||n<0||n>100)return;
 // Percentages are displayed only if Android actually reports them.
 lastPercent=n;
 showProgress(tr('channelLoadingPercent')+' '+n+'%');
};
const previousNativeEvent563=window.ASPLAYER_NATIVE_EVENT;
window.ASPLAYER_NATIVE_EVENT=function(state){
 if(typeof previousNativeEvent563==='function')previousNativeEvent563(state);
 if(!isLiveVisible())return;
 if(state==='ready'||state==='playing')finishChannelIndicator();
 else if(state==='buffering'||state==='error'){
  clearProgressTimer();loadingChannel=true;lastPercent=null;
  showProgress(tr(state==='error'?'channelReconnecting':'channelOpening'));
 }
};
const previousPlay563=play;
play=function(item,mode){
 if(mode!=='live'){clearProgressTimer();loadingChannel=false;showProgress('')}
 previousPlay563(item,mode);
 if(mode==='live'&&isLiveVisible())openChannelIndicator();
};
const previousStop563=stopPlayer;
stopPlayer=function(){clearProgressTimer();loadingChannel=false;showProgress('');previousStop563()};
const previousLanguage563=languageUI;
languageUI=function(){
 previousLanguage563();
 if(loadingChannel)showProgress(lastPercent==null?tr('channelOpening'):tr('channelLoadingPercent')+' '+lastPercent+'%');
};
// The old "buffering" badge is removed from every player. The new indicator
// appears only beside the guide and only for the live native channel.
const uiStyle=document.createElement('style');uiStyle.textContent=`
#buffer-state,#native-guide-status{display:none!important}
.all-catalog-tab{border-color:#41bfd0;background:linear-gradient(115deg,#173859,#283065);color:#e5faff;font-weight:750}
.all-catalog-tab.active{border-color:#65edec;box-shadow:0 0 0 1px #57cbd080,0 0 12px #4dd7f022}
.channel-load-progress{display:inline-flex;width:max-content;max-width:100%;margin-top:5px;border-radius:14px;padding:3px 10px;font-size:11px;letter-spacing:.1px;font-weight:750;color:#aaf4f1;background:#12394c;border:1px solid #4aabb176}
@media(max-width:650px){.channel-load-progress{font-size:10px;padding:3px 7px}}
`;document.head.appendChild(uiStyle);
console.info('ASPLAYER 5.6.3: global Movies/Series & native TV reported progress');
})();
