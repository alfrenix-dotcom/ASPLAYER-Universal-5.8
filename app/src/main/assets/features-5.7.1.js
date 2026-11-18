/* ASPLAYER 5.7.1: no-EPG live TV, account-scoped favourites and watch progress,
   and three playback preferences. Only real provider/device tracks are shown.
   The Android VideoView engine cannot guarantee target buffer seconds. */
(function(){
'use strict';
const G=id=>document.getElementById(id);
const words={
 en:{favourites:'Favorites',favourite:'Add to favorites',removeFavourite:'Remove from favorites',noFavourites:'Mark a channel with ☆ to see it here.',continueWatching:'Continue watching',viewHistory:'History',watchEmpty:'Nothing watched yet',resume:'Resume',fromStart:'From beginning',watched:'Watched',watchProgress:'Playback progress',watchNote:'Resume positions are saved for supported in-app playback. Android/external players may not report position.',bufferProfiles:'Playback stability',bufferProfilesHelp:'Choose a startup/recovery preference. Actual buffer duration and startup time depend on Android and your provider.',adaptiveProfile:'ADAPTIVE · auto stability',adaptiveInfo:'Gradually increases buffer on subsequent streams after playback interruptions.',fastProfile:'FAST · lower latency',normalProfile:'NORMAL · balanced (default)',ultraProfile:'ULTRA · stability first',fastInfo:'Prioritizes startup speed; no fixed 1-second guarantee.',normalInfo:'Balanced preloading preference; 4 seconds is a target, not a guaranteed buffer.',ultraInfo:'Stability preference; an 8–10 second RAM buffer requires a capable native player.',tracksExternal:'Open in an external player for more audio/subtitle options',historyEpisode:'Episode',allFaves:'Favorite channels'},
 es:{favourites:'Favoritos',favourite:'Agregar a favoritos',removeFavourite:'Quitar de favoritos',noFavourites:'Marca un canal con ☆ para verlo aquí.',continueWatching:'Seguir viendo',viewHistory:'Historial',watchEmpty:'Todavía no has visto contenido',resume:'Continuar',fromStart:'Desde el inicio',watched:'Visto',watchProgress:'Progreso de reproducción',watchNote:'El progreso se guarda en el reproductor integrado cuando el formato lo permite. Android y los reproductores externos podrían no informar la posición.',bufferProfiles:'Estabilidad de reproducción',bufferProfilesHelp:'Elige una preferencia de inicio y recuperación. La duración real del búfer y la apertura dependen de Android y del servidor.',adaptiveProfile:'ADAPTATIVO · estabilidad automática',adaptiveInfo:'Aumenta el búfer en las siguientes reproducciones si aparecen interrupciones.',fastProfile:'RÁPIDO · baja latencia',normalProfile:'NORMAL · equilibrado (predeterminado)',ultraProfile:'ULTRA · máxima estabilidad',fastInfo:'Da prioridad a abrir rápido; no garantiza iniciar en 1 segundo.',normalInfo:'Prefiere la precarga equilibrada; 4 segundos es un objetivo, no un búfer garantizado.',ultraInfo:'Prefiere estabilidad; mantener 8–10 segundos en RAM exige un reproductor nativo compatible.',tracksExternal:'Abrir en otro reproductor para más opciones de audio y subtítulos',historyEpisode:'Capítulo',allFaves:'Canales favoritos'}
};
for(const langKey of ['en','es'])Object.assign(LABELS[langKey],words[langKey]);
LABELS.en.onlineHint='Optional HTTPS service for AI synopses and announcements. Do not enter OpenAI API keys here.';
LABELS.es.onlineHint='Servicio HTTPS opcional para sinopsis por IA y avisos. No introduzcas claves de OpenAI aquí.';
const FAVORITES_KEY='asplayer:favorites:v571';
const getPrefix=()=>sessionPrefix();
function accountStore(key){const all=load(key,{});return Array.isArray(all[getPrefix()])?all[getPrefix()]:[]}
function writeAccountStore(key,rows){const all=load(key,{});all[getPrefix()]=rows;store(key,all)}
function contentId(it){return String(it?.stream_id??it?.series_id??it?.id??it?.name??'')}
function favouriteItems(){return accountStore(FAVORITES_KEY)}
function favouriteId(it){return String(it.stream_id??it.id??'')}
function favHas(it){return favouriteItems().some(x=>favouriteId(x)===favouriteId(it))}
function cleanItem(it){const allowed=['stream_id','series_id','id','category_id','name','title','container_extension','stream_icon','cover','movie_image','added','episode_num','season','seriesName','seriesId'];const out={};for(const k of allowed)if(it&&it[k]!=null)out[k]=it[k];return out}
function toggleFavourite(it){
 if(!it?.stream_id)return;
 let rows=favouriteItems().filter(x=>favouriteId(x)!==favouriteId(it));
 if(!favHas(it))rows.unshift(cleanItem(it));
 writeAccountStore(FAVORITES_KEY,rows.slice(0,400));
 if(category==='favorites'&&active==='live')loadFavoriteList();
 else if(active==='live')renderItems();
 renderFavoritePreview();renderCats();
}
const favPreview=document.createElement('section');favPreview.id='favorite-preview';favPreview.className='box fav-preview hidden';
G('category-tools').before(favPreview);
function favTile(it,i){const image=safeImage(it.stream_icon||it.cover);return `<button class="fav-quick" data-fav-play="${i}">${image?`<img src="${esc(image)}" alt="" loading="lazy" onerror="this.style.display='none'">`:'<span>📺</span>'}<small>${esc(it.name||it.title||'Channel')}</small></button>`}
function renderFavoritePreview(){
 const show=active==='live'&&!!session();favPreview.classList.toggle('hidden',!show);if(!show)return;
 const items=favouriteItems();favPreview.innerHTML=`<div class="fav-header"><strong>★ ${esc(tr('allFaves'))} (${items.length})</strong><button type="button" class="ghost" data-open-faves>${esc(tr('favourites'))}</button></div>`+(items.length?`<div class="fav-rail">${items.slice(0,12).map(favTile).join('')}</div>`:`<p class="tiny">${esc(tr('noFavourites'))}</p>`);
}
favPreview.addEventListener('click',event=>{
 if(event.target.closest('[data-open-faves]'))return tryCategory('favorites');
 const btn=event.target.closest('[data-fav-play]');if(!btn)return;
 const it=favouriteItems()[Number(btn.dataset.favPlay)];if(it)play(it,'live');
});
function loadFavoriteList(){category='favorites';filter='';visible=32;G('search').value='';catalog=favouriteItems();filtered=catalog.slice();renderCats();renderItems();}
const historicalRenderCats=renderCats;
renderCats=function(){historicalRenderCats();if(active!=='live')return;const wrap=G('categories');const btn=document.createElement('button');btn.type='button';btn.className='tab fav-tab'+(category==='favorites'?' active':'');btn.dataset.category='favorites';btn.textContent='★ '+tr('favourites')+' ('+favouriteItems().length+')';wrap.prepend(btn);renderFavoritePreview()};
const historicalTryCategory=tryCategory;
tryCategory=function(id){if(id==='favorites'&&active==='live'){loadFavoriteList();window.ASPLAYER_TV_CATEGORY?.(id);return;}return historicalTryCategory(id)};
const historicalRenderItems=renderItems, historicalCatalogTile=renderCatalogTile;
let renderedFavorites=new Set();
renderItems=function(){
 if(active==='live')renderedFavorites=new Set(favouriteItems().map(favouriteId));
 return historicalRenderItems();
};
renderCatalogTile=function(item,index){
 const html=historicalCatalogTile(item,index);
 if(active!=='live'||!item?.stream_id)return html;
 const selected=renderedFavorites.has(favouriteId(item));
 return '<div class="fav-tile">'+html+'<button type="button" class="fav-star'+
  (selected?' selected':'')+'" data-fav-index="'+index+'" aria-label="'+
  esc(tr(selected?'removeFavourite':'favourite'))+'" aria-pressed="'+selected+'">'+
  (selected?'★':'☆')+'</button></div>';
};
G('cards').addEventListener('click',event=>{const star=event.target.closest('[data-fav-index]');if(!star)return;event.stopPropagation();event.preventDefault();const item=filtered[Number(star.dataset.favIndex)];if(item)toggleFavourite(item);},true);

// Existing HISTORY_KEY and localStorage format are preserved across updates.
function getHistory(mode){const all=load(HISTORY_KEY,{});const set=all[getPrefix()]||{};return Array.isArray(set[mode])?set[mode]:[]}
function putHistory(mode,rows){const all=load(HISTORY_KEY,{}),prefix=getPrefix();const record=all[prefix]&&typeof all[prefix]==='object'?all[prefix]:{live:[],vod:[],series:[]};record[mode]=rows.slice(0,300);all[prefix]=record;store(HISTORY_KEY,all)}
function findRow(mode,id){return getHistory(mode).find(x=>String(x.id)===String(id))}
let currentSeries=null,nowPlaying=null,pendingResume=0,lastProgressSave=0;
const historicalShowSeries=showSeries;
showSeries=function(it){currentSeries=cleanItem(it);return historicalShowSeries(it)};
const historicalRemember=rememberPlay;
rememberPlay=function(mode,it){
 const id=contentId(it),prev=findRow(mode,id),item=cleanItem(it);
 if(mode==='series'&&currentSeries){item.seriesName=item.seriesName||currentSeries.name;item.seriesId=item.seriesId||currentSeries.series_id;item.category_id=item.category_id||currentSeries.category_id;}
 historicalRemember(mode,it);
 const rows=getHistory(mode).filter(x=>String(x.id)!==id);
 const title=mode==='series'&&item.seriesName?`${item.seriesName} · ${it.title||it.name||tr('historyEpisode')}`:String(it.title||it.name||'');
 rows.unshift({...prev,id,mode,title,watchedAt:Date.now(),item,
  position:Number(prev?.position)||0,duration:Number(prev?.duration)||0});
 putHistory(mode,rows);
};
function writeProgress(force=false,ended=false){
 if(!nowPlaying||!['vod','series'].includes(nowPlaying.mode)||!session())return;
 const v=G('video');if(v?.readyState<1)return;
 const pos=Number(v.currentTime);if(!Number.isFinite(pos)||pos<0)return;
 if(!force&&Date.now()-lastProgressSave<5000)return;
 const dur=Number(v.duration),rows=getHistory(nowPlaying.mode),i=rows.findIndex(x=>String(x.id)===nowPlaying.id);
 if(i<0)return;
 const row=rows.splice(i,1)[0];row.position=ended?(Number.isFinite(dur)?dur:pos):pos;
 if(Number.isFinite(dur)&&dur>0)row.duration=dur;
 row.watchedAt=Date.now();row.finished=ended||(row.duration>0&&row.position/row.duration>=.96);
 rows.unshift(row);putHistory(nowPlaying.mode,rows);lastProgressSave=Date.now();
}
const historyPlay=play;
play=function(it,mode){
 if(mode==='series'&&it?.seriesName&&!currentSeries)currentSeries={name:it.seriesName,series_id:it.seriesId};
 nowPlaying=['vod','series'].includes(mode)?{mode,id:contentId(it)}:null;
 historyPlay(it,mode);lastProgressSave=0;renderWatchPanels();
};
const historyOpenPlayer=openPlayer;
openPlayer=function(){historyOpenPlayer();if(!nowPlaying)return;
 const row=findRow(nowPlaying.mode,nowPlaying.id),position=row?.finished?0:(pendingResume||Number(row?.position)||0);
 pendingResume=0;
 if(position>5){const v=G('video');const restore=()=>{
   if(!nowPlaying||v.readyState<1)return;
   try{if(!Number.isFinite(v.duration)||position<v.duration-3)v.currentTime=position}catch(_){}
   v.removeEventListener('loadedmetadata',restore);
  };v.addEventListener('loadedmetadata',restore,{once:true});if(v.readyState>=1)restore();}
};
const historyStopPlayer=stopPlayer;
stopPlayer=function(){writeProgress(true);historyStopPlayer();nowPlaying=null;renderWatchPanels()};
const v=G('video');v.addEventListener('timeupdate',()=>writeProgress());v.addEventListener('pause',()=>writeProgress(true));v.addEventListener('ended',()=>{writeProgress(true,true);renderWatchPanels()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)writeProgress(true)});

// Local virtual categories are never sent to the provider API.
const WATCH_CONTINUE='__asplayer_continue__',WATCH_HISTORY='__asplayer_history__';
const watchTabs=()=>active==='vod'||active==='series'||active==='live';
const isWatchCategory=()=>watchTabs()&&(category===WATCH_HISTORY||
    (category===WATCH_CONTINUE&&active!=='live'));
function watchRows(group){
  if(!watchTabs())return [];
  const all=getHistory(active).filter(row=>row&&row.item&&contentId(row.item));
  return group===WATCH_CONTINUE
    ? all.filter(row=>Number(row.position)>8&&!row.finished&&
        (Number(row.duration)<=0||Number(row.position)/Number(row.duration)<.96))
    : all;
}
function updateWatchButtons(){
  if(!watchTabs())return;
  const holder=G('categories');
  const ids=active==='live'?[WATCH_HISTORY]:[WATCH_CONTINUE,WATCH_HISTORY];
  // Refresh counts in place, so the remote focus cannot disappear on a tick.
  for(const id of ids.slice().reverse()){
    let b=Array.from(holder.querySelectorAll('[data-watch-category]')).find(el=>el.dataset.category===id);
    if(!b){
      b=document.createElement('button');b.type='button';
      b.dataset.category=id;b.dataset.watchCategory='true';
      holder.prepend(b);
    }
    const label=id===WATCH_CONTINUE?'▶ '+tr('continueWatching'):'◷ '+tr('viewHistory');
    const count=watchRows(id).length;
    const text=label+' ('+count+')';
    b.classList.add('tab','watch-category');
    b.classList.toggle('active',category===id);
    b.setAttribute('aria-label',text);
    b.setAttribute('aria-pressed',String(category===id));
    if(b.textContent!==text)b.textContent=text;
  }
}
const renderCatsWithFavorites=renderCats;
renderCats=function(){renderCatsWithFavorites();updateWatchButtons();};

let shownWatchRows=[];
function renderWatchResults(){
  if(!isWatchCategory())return;
  const holder=G('cards'),previous=document.activeElement;
  const previousKey=holder.contains(previous)?previous.dataset.watchKey:null;
  const needle=String(filter||'').toLowerCase();
  const all=watchRows(category).filter(row=>!needle||String(row.title||row.item?.name||row.item?.title||'').toLowerCase().includes(needle));
  shownWatchRows=all;
  G('count').textContent=all.length+' '+tr('titles');
  G('all-global-status')?.classList.add('hidden');
  const renderRow=(row,index)=>{
    const item=row.item;
    const image=safeImage(item.stream_icon||item.cover||item.movie_image);
    const duration=Number(row.duration)||0,position=Number(row.position)||0;
    const pct=duration?Math.max(0,Math.min(100,100*position/duration)):0;
    const label=row.title||item.name||item.title||tr('watched');
    const progress=active!=='live'&&position>0
      ? '<small>'+esc(fmtTime(position))+(duration?' / '+esc(fmtTime(duration)):'')+'</small>'+
        '<span class="watch-meter"><i style="width:'+pct.toFixed(1)+'%"></i></span>'
      : '';
    const finished=active!=='live'&&row.finished?'<small class="watch-finished">✓ '+esc(tr('watched'))+'</small>':'';
    return '<button type="button" class="tile watch-list-tile" data-item="'+index+
      '" data-watch-key="'+esc(String(row.id))+'"><div class="cover">'+
      (image?'<img src="'+esc(image)+'" loading="lazy" decoding="async" alt="" onerror="this.style.display=\'none\'">':'▶')+
      '</div><div class="caption"><strong>'+esc(label)+'</strong>'+progress+finished+'</div></button>';
  };
  G('loadmore').classList.add('hidden');
  if(window.ASPLAYER_PAGER?.mount(holder,all,renderRow,{
    context:catalogPageContext,identity:row=>String(row.id),
    empty:'<p class="empty">'+esc(tr('watchEmpty'))+'</p>'
  }))return;
  holder.innerHTML=all.slice(0,50).map(renderRow).join('')||'<p class="empty">'+esc(tr('watchEmpty'))+'</p>';
  if(previousKey!==null&&previousKey!==undefined){
    const target=Array.from(holder.querySelectorAll('[data-watch-key]')).find(el=>el.dataset.watchKey===previousKey)
      ||holder.querySelector('[data-watch-key]')||G('tv-back-categories');
    if(target)target.focus({preventScroll:true});
  }
}
function renderWatchPanels(){
  document.body.classList.toggle('asplayer-catalog-open',watchTabs());
  updateWatchButtons();
  if(isWatchCategory())renderWatchResults();
}
window.ASPLAYER_REFRESH_WATCH=renderWatchPanels;
const prevWatchItems=renderItems;
renderItems=function(){if(isWatchCategory())return renderWatchResults();return prevWatchItems();};
const prevWatchFilter=applyFilter;
applyFilter=function(){if(isWatchCategory())return renderWatchResults();return prevWatchFilter();};
const prevWatchLoad=loadItems;
loadItems=function(force=false){
  if(isWatchCategory()){operation++;return renderWatchResults();}
  return prevWatchLoad(force);
};
const tryCategoryWithFavorites=tryCategory;
tryCategory=function(id){
  if(watchTabs()&&(id===WATCH_HISTORY||(id===WATCH_CONTINUE&&active!=='live'))){
    operation++; // invalidate any pending provider list/search response
    category=id;filter='';visible=32;catalog=[];filtered=[];
    G('search').value='';
    renderCats();renderWatchResults();
    window.ASPLAYER_TV_CATEGORY?.(id);
    return;
  }
  return tryCategoryWithFavorites(id);
};
const loadCategoriesWithHistory=loadCategories;
loadCategories=async function(tab,force=false){
  const was=category,op=operation;
  await loadCategoriesWithHistory(tab,force);
  if(active===tab&&operation===op&&category===was&&isWatchCategory()){
    updateWatchButtons();renderWatchResults();
  }
};
// Replay the saved item/episode itself. Do not send episode IDs to the
// series-details API or bypass parental PIN on remembered restricted items.
G('cards').addEventListener('click',event=>{
  if(!isWatchCategory())return;
  const button=event.target.closest('[data-watch-key]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const row=shownWatchRows[Number(button.dataset.item)];if(!row?.item)return;
  const mode=active;
  const resume=()=>{
    pendingResume=row.finished?0:Number(row.position)||0;
    if(mode==='series')currentSeries={name:row.item.seriesName||'',series_id:row.item.seriesId||'',category_id:row.item.category_id};
    play(row.item,mode);
  };
  const group=cats.find(c=>String(c.category_id)===String(row.item.category_id));
  if(parentEnabled&&(!group||isAdult(group.category_name))){
    if(parentHash)requestUnlock(resume);
    else toast(tr('pinNeed'));
  }else resume();
},true);
const watchListCss=document.createElement('style');
watchListCss.textContent=`
  /* One heading instead of the old repeated title + refresh row. */
  #view-catalog .sectionhead{display:none}
  .topbar .catalog-header-actions{display:flex;align-items:center;gap:9px}
  .topbar #refresh-cat{display:none}
  body.asplayer-catalog-open .topbar #refresh-cat{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 12px}
  body.asplayer-catalog-open .topbar{margin-bottom:14px}
  body.asplayer-catalog-open.asplayer-tv-dpad #tv-category-pane,
  body.asplayer-catalog-open.asplayer-tv-dpad #tv-content-pane{max-height:calc(100vh - 105px)}
  @media(max-width:640px){
    body.asplayer-catalog-open .topbar{gap:7px;margin-bottom:12px;flex-wrap:nowrap}
    body.asplayer-catalog-open .topbar .catalog-header-actions{gap:5px;flex-wrap:wrap;justify-content:flex-end}
    body.asplayer-catalog-open .topbar #refresh-cat{font-size:12px;padding:6px 8px}
    body.asplayer-catalog-open:not(.asplayer-tv-dpad) #tv-category-pane,
    body.asplayer-catalog-open:not(.asplayer-tv-dpad) #tv-content-pane{height:calc(100vh - 155px);height:calc(100dvh - 155px)}
  }
  #categories .watch-category{border-color:#397e91;background:#122a40;font-weight:650}
  #categories .watch-category.active{background:#12637d;color:white;border-color:#64d9dd}
  #categories .watch-category[data-category="__asplayer_history__"]{margin-bottom:6px}
  #cards .watch-list-tile .watch-meter{height:5px;max-width:100%;margin:6px 0 1px}
  #cards .watch-finished{color:#72ebaf}
`;
document.head.appendChild(watchListCss);
const topbar=document.querySelector('.topbar'),serverPill=topbar?.querySelector('.pill'),refreshCat=G('refresh-cat');
if(topbar&&serverPill&&refreshCat){
  const actions=document.createElement('div');actions.className='catalog-header-actions';
  topbar.append(actions);actions.append(serverPill,refreshCat);
}
const historicalShowTab=showTab;
showTab=function(tab){historicalShowTab(tab);renderWatchPanels();renderFavoritePreview()};
const historicalSwitch=switchToServer;
switchToServer=function(index){writeProgress(true);historicalSwitch(index);renderWatchPanels();renderFavoritePreview()};
const historicalClear=clearHistory;
clearHistory=function(mode){historicalClear(mode);renderWatchPanels()};

// No EPG, guide, channel loading labels, or old buffering toggle visible.
const oldSetting=G('buffer-enabled')?.closest('.buffer-setting');if(oldSetting)oldSetting.classList.add('hidden');
const epgSource=G('epg-source');if(epgSource){const section=epgSource.closest('.setting');if(section)section.classList.add('hidden')}
for(const id of ['player-epg','player-mini','live-guide-pane','epg-panel','epg-standalone','buffer-state','native-guide-status']){const el=G(id);if(el)el.classList.add('hidden')}
window.ASPLAYER_NATIVE_MINI=()=>{stopPlayer()};
// A small settings selector. VideoView controls its own actual buffer; these are
// preferences, not measured/guaranteed durations.
let bufferProfile=['fast','normal','ultra','adaptive'].includes(settings.bufferProfile)?settings.bufferProfile:'adaptive';
const playerBox=G('preferred-player')?.closest('.setting');
if(playerBox){const profileBox=document.createElement('div');profileBox.className='box setting';profileBox.id='profile-settings';playerBox.after(profileBox);const draw=()=>{
 profileBox.innerHTML=`<h3>${esc(tr('bufferProfiles'))}</h3><p>${esc(tr('bufferProfilesHelp'))}</p>`+['fast','normal','ultra','adaptive'].map((type)=>`<label class="profile-choice"><input name="play-profile" type="radio" value="${type}" ${type===bufferProfile?'checked':''}><span><strong>${esc(tr(type+'Profile'))}</strong><small>${esc(tr(type+'Info'))}</small></span></label>`).join('');
 };
 profileBox.addEventListener('change',e=>{if(!e.target.matches('input[name=play-profile]'))return;bufferProfile=e.target.value;settings.bufferProfile=bufferProfile;store(SETTINGS_KEY,settings);
  const oldToggle=G('buffer-enabled');if(oldToggle){oldToggle.checked=bufferProfile!=='fast';oldToggle.dispatchEvent(new Event('change',{bubbles:true}));}
 });
 const oldLanguage=languageUI;languageUI=function(){oldLanguage();draw();renderWatchPanels();renderFavoritePreview()};draw();
}
// HTML5 can expose audioTracks/textTracks on some devices; if not, an installed
// native/external player may expose the embedded alternatives.
const externalTrackButton=document.createElement('button');externalTrackButton.type='button';externalTrackButton.className='ghost';externalTrackButton.id='tracks-external';G('player-track-panel').appendChild(externalTrackButton);
function trackHelp(){externalTrackButton.textContent=tr('tracksExternal');externalTrackButton.classList.toggle('hidden',!playback||playback.mode==='live')}
externalTrackButton.addEventListener('click',()=>{const url=playback?.url;if(url){writeProgress(true);externalPlay(url)}});
const prevTracks=updateTracks;updateTracks=function(){prevTracks();trackHelp()};
// Some devices discover embedded tracks after metadata, not at its first event.
const videoTracks=G('video');for(const kind of ['audioTracks','textTracks']){
 const list=videoTracks[kind];if(list&&typeof list.addEventListener==='function'){
  list.addEventListener('addtrack',()=>updateTracks());list.addEventListener('removetrack',()=>updateTracks());
 }
}
videoTracks.addEventListener('canplay',()=>updateTracks());
const css=document.createElement('style');css.textContent=`
#live-guide-pane,#player-epg,#player-mini,#epg-panel,#epg-standalone,#buffer-state,#native-guide-status,.buffer-setting,.guide-button{display:none!important}
.fav-preview{padding:14px 16px;margin:10px 0 16px}.fav-header{display:flex;justify-content:space-between;align-items:center;gap:10px}.fav-rail{display:flex;gap:9px;overflow-x:auto;margin-top:12px}.fav-quick{background:#12213e;border:1px solid #345578;border-radius:11px;width:100px;min-width:100px;padding:8px;color:#d9efff;overflow:hidden}.fav-quick img{height:54px;max-width:100%;object-fit:contain}.fav-quick span{font-size:23px;display:block}.fav-quick small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fav-tile{position:relative;display:flex;flex-direction:column;min-width:0}.fav-tile .tile{flex:1}.fav-star{position:absolute;right:7px;top:7px;background:#0c1d38ef;color:#dffaff;border:1px solid #5a7ca4;border-radius:22px;font-size:22px;min-width:44px;min-height:44px;padding:4px;z-index:1}.fav-star.selected{color:#ffdc73;border-color:#ffdc73}.watch-meter{display:block;height:4px;border-radius:4px;background:#375072;margin-top:5px}.watch-meter i{display:block;height:100%;border-radius:4px;background:#65dcdb}.profile-choice{display:flex;gap:12px;align-items:center;border:1px solid #3a5170;border-radius:12px;padding:12px;margin:8px 0}.profile-choice input{width:19px;height:19px;min-height:19px;flex:none;accent-color:#6edddd}.profile-choice small{display:block;color:#b7c8df;font-size:11px;margin-top:4px}
`;document.head.appendChild(css);
languageUI();renderWatchPanels();renderFavoritePreview();trackHelp();
console.info('ASPLAYER 5.7.1 favorites, history, resume, no EPG, player preferences');
})();
