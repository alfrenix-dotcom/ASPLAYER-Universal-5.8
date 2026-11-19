/* ASPLAYER Universal v5.4. Account metadata, browsing controls, verified EPG,
   optional owner-operated HTTPS enrichment, and event-based notices.
   No OpenAI keys, IPTV passwords, or privileged ChatGPT tokens are included here. */
(function(){
'use strict';
const labels54={
 en:{sortHeading:'Content order',sortHint:'Order titles inside every category.',sortOptions:'Sort content',newestFirst:'Newest first',oldestFirst:'Oldest first',bestRated:'Top rated',sortCaveat:'Titles without known dates or scores appear last.',guideHeading:'TV programme guide',guideHint:'Read the schedule supplied by the selected server. AI requires a verified guide service.',guideServer:'Server EPG',guideAi:'AI guide (requires HTTPS service)',synopsisHeading:'Synopsis source',synopsisHint:'Original provider descriptions or verified AI-assisted text from your own service.',synopsisServer:'Server synopsis',synopsisAi:'AI synopsis (requires HTTPS service)',onlineHeading:'Online intelligence & notices',onlineHint:'Optional owner-operated HTTPS service for verified EPG, summaries and announcements. Never paste an OpenAI key here.',onlineUrl:'Secure service URL',saveOnline:'Save connection',checkNotices:'Check notices',aboutHeading:'About ASPLAYER',createdBy:'Creator',noticesCaveat:'Promotions appear only when the configured service sends a new notice.',schedule:'Programme guide',accountName:'Connected user',expiresIn:'Days remaining',unlimited:'No expiry reported',expired:'Expired',accountUnknown:'Expiration not provided',epgEmpty:'No upcoming programmes were supplied for this channel.',epgLoading:'Loading programme guide…',epgUnavailable:'Programme guide unavailable',epgFromServer:'Guide provided by IPTV server',epgFromVerified:'Verified guide from online service',endpointSaved:'Service URL saved. AI features require an operational backend.',endpointInvalid:'Use a valid HTTPS address; do not enter a secret key.',endpointMissing:'Configure the HTTPS service first. Using server information.',aiUnavailable:'AI service unavailable. Showing source information.',noNewNotice:'No new notice available.',serviceInactive:'Optional AI service is not configured.',noticesError:'Could not check notices.'},
 es:{sortHeading:'Orden del contenido',sortHint:'Ordena los títulos dentro de cada categoría.',sortOptions:'Ordenar contenido',newestFirst:'Más nuevo a más antiguo',oldestFirst:'Más antiguo a más nuevo',bestRated:'Mejor valorados',sortCaveat:'Los títulos sin fechas ni valoraciones conocidas quedan al final.',guideHeading:'Guía de programación EPG',guideHint:'Consulta la programación del servidor seleccionado. La IA requiere una fuente verificada.',guideServer:'EPG del servidor',guideAi:'Guía IA (requiere servicio HTTPS)',synopsisHeading:'Origen de la sinopsis',synopsisHint:'Descripción original o texto asistido por IA desde tu propio servicio.',synopsisServer:'Sinopsis del servidor',synopsisAi:'Sinopsis IA (requiere servicio HTTPS)',onlineHeading:'Inteligencia y avisos en línea',onlineHint:'Servicio HTTPS opcional para EPG verificado, sinopsis y avisos. Nunca escribas aquí una clave OpenAI.',onlineUrl:'Dirección del servicio seguro',saveOnline:'Guardar conexión',checkNotices:'Comprobar avisos',aboutHeading:'Acerca de ASPLAYER',createdBy:'Creador',noticesCaveat:'Las promociones solo aparecen cuando tu servicio envía un aviso nuevo.',schedule:'Guía EPG',accountName:'Usuario conectado',expiresIn:'Días restantes',unlimited:'Sin fecha de vencimiento',expired:'Caducado',accountUnknown:'Vencimiento no informado',epgEmpty:'El servidor no entregó próximos programas de este canal.',epgLoading:'Cargando programación…',epgUnavailable:'No se pudo cargar el EPG',epgFromServer:'Guía del servidor IPTV',epgFromVerified:'Guía verificada del servicio',endpointSaved:'Dirección guardada. La IA requiere un servicio en funcionamiento.',endpointInvalid:'Introduce una URL HTTPS válida, sin claves secretas.',endpointMissing:'Configura un servicio HTTPS primero. Mostrando información original.',aiUnavailable:'Servicio IA no disponible. Se muestra la información original.',noNewNotice:'No hay avisos nuevos.',serviceInactive:'Servicio IA opcional sin configurar.',noticesError:'No se pudieron consultar los avisos.'}
};
for(const l of ['en','es'])Object.assign(LABELS[l],labels54[l]);
Object.assign(LABELS.en,{synopsisHint:'Translate provider synopses or create a suggested synopsis when missing, in your selected app language.',synopsisAi:'Automatic synopsis (AI)',synopsisTranslated:'Translated with AI',synopsisGenerated:'AI-generated synopsis · not independently verified',synopsisLoading:'Preparing synopsis with AI…'});
Object.assign(LABELS.es,{synopsisHint:'Traduce las sinopsis del servidor o genera una sinopsis sugerida cuando falta, en el idioma seleccionado.',synopsisAi:'Sinopsis automática (IA)',synopsisTranslated:'Traducida con IA',synopsisGenerated:'Sinopsis generada por IA · no verificada',synopsisLoading:'Preparando sinopsis con IA…'});
let sortMode=['new','old','rated'].includes(settings.order)?settings.order:'new';
let epgSource='server';
// Enable translation on upgrades too; later explicit choices survive restarts.
let synopsisSource=settings.synopsisTranslationConfigured===true&&settings.synopsisSource==='server'?'server':'ai';
settings.synopsisSource=synopsisSource;
settings.synopsisTranslationConfigured=true;
const DEFAULT_AI_ENDPOINT='https://asplayer-ai.alfrenix.workers.dev';
// Migrate legacy unset/blank service once; retain custom HTTPS addresses and later opt-outs.
let onlineEndpoint=checkedEndpoint(settings.onlineEndpoint)||((settings.onlineEndpointConfigured===true)?'':DEFAULT_AI_ENDPOINT);
settings.onlineEndpoint=onlineEndpoint;
settings.onlineEndpointConfigured=true;
settings.aiEnabled=settings.aiEnabled!==false;
let aiGeneration=0;
saveSettings();
let liveItem=null,accountInfoTask=0,lastMetaRefresh=0,lastCheck=0,epgTask=0;
window.ASPLAYER_SET_LIVE_ITEM=(item)=>{liveItem=item};
const get=(id)=>document.getElementById(id);
function dateScore(v){
 if(!v||typeof v!=='object')return 0;
 const added=Number(v.added||v.added_date||v.date_added||v.created_at);
 if(Number.isFinite(added)&&added>1e9&&added<4e12)return added>1e12?added:added*1000;
 const values=[v.releasedate,v.releaseDate,v.release_date,v.air_date,v.first_air_date,v.date,v.year];
 for(const value of values){if(value==null)continue;const str=String(value).trim();const parsed=/^(19|20)\d{2}$/.test(str)?Date.UTC(Number(str),0,1):Date.parse(str);if(Number.isFinite(parsed))return parsed}
 const title=String(v.name||v.title||'');const m=title.match(/(?:^|\s|\()((?:19|20)\d{2})(?:\)|\s|$)/);
 return m?Date.UTC(Number(m[1]),0,1):0;
}
function ratingScore(v){
 if(!v||typeof v!=='object')return -1;
 for(const field of ['rating','rating_imdb','imdb_rating','vote_average','rating_5based','score']){
  const raw=v[field];if(raw===undefined||raw===null||raw==='')continue;
  const m=String(raw).match(/\d+(?:\.\d+)?/);if(!m)continue;
  let n=Number(m[0]);if(field==='rating_5based')n*=2;
  if(n>0&&n<=10)return n;
 }
 return -1;
}
const previousApply=applyFilter;
applyFilter=function(){
 filtered=catalog.filter(it=>!filter||String(it.name||it.title||'').toLowerCase().includes(filter));
 if(parentEnabled)filtered=filtered.filter(it=>{const c=cats.find(x=>String(x.category_id)===String(it.category_id));return !isAdult(c?.category_name)||unlockedCats.has(String(it.category_id))});
 if(active!=='live'){
  filtered.sort((a,b)=>{let diff=0;
   if(sortMode==='rated')diff=ratingScore(b)-ratingScore(a);
   if(!diff){const x=dateScore(a),y=dateScore(b);diff=sortMode==='old'?(x&&y?x-y:x?-1:y?1:0):(x&&y?y-x:x?-1:y?1:0)}
   return diff||String(a.name||a.title||'').localeCompare(String(b.name||b.title||''),lang);
  });
 }
 renderItems();
};
const previousRecent=renderRecent;
renderRecent=function(){recent=recent.slice().sort((a,b)=>dateScore(b)-dateScore(a));previousRecent()};
const previousWarm=warmHome;
warmHome=async function(force=false){renderAccountSummary();const r=await previousWarm(force);refreshAccountInfo();return r};
const previousTab=showTab;
showTab=function(tab){previousTab(tab);if(tab==='home'){renderAccountSummary();checkAnnouncements(false)}if(tab==='settings')loadNewSettings()};
const previousLoginUI=languageUI;
languageUI=function(){previousLoginUI();loadNewSettings();renderAccountSummary()};
function loadNewSettings(){
 if(get('order-content'))get('order-content').value=sortMode;
 if(get('epg-source'))get('epg-source').value=epgSource;
 if(get('synopsis-source'))get('synopsis-source').value=synopsisSource;
 if(get('online-endpoint')&&document.activeElement!==get('online-endpoint'))get('online-endpoint').value=onlineEndpoint;
}
function persist(){settings.order=sortMode;settings.epgSource=epgSource;settings.synopsisSource=synopsisSource;settings.onlineEndpoint=onlineEndpoint;saveSettings()}
get('order-content').addEventListener('change',e=>{sortMode=['new','old','rated'].includes(e.target.value)?e.target.value:'new';persist();if(['vod','series'].includes(active)){visible=32;applyFilter()}});
get('epg-source').addEventListener('change',e=>{epgSource='server';persist();if(epgSource==='ai'&&!onlineEndpoint)toast(tr('endpointMissing'))});
get('synopsis-source').addEventListener('change',e=>{synopsisSource=e.target.value==='ai'?'ai':'server';persist();if(synopsisSource==='ai'&&!onlineEndpoint)toast(tr('endpointMissing'))});
function checkedEndpoint(v){try{const u=new URL(String(v||'').trim());if(u.protocol!=='https:'||!u.hostname||u.username||u.password||u.search||u.hash)return null;return u.href.replace(/\/+$/,'')}catch(_){return null}}
get('save-online').addEventListener('click',()=>{const input=get('online-endpoint').value.trim();if(input&&!checkedEndpoint(input)){get('online-status').textContent=tr('endpointInvalid');return}onlineEndpoint=input?checkedEndpoint(input):'';persist();get('online-status').textContent=onlineEndpoint?tr('endpointSaved'):tr('serviceInactive')});
window.ASPLAYER_RESET_AI_ENDPOINT=()=>{get('online-endpoint').value=DEFAULT_AI_ENDPOINT;get('save-online').click()};
window.ASPLAYER_SET_AI_ENABLED=enabled=>{settings.aiEnabled=enabled===true;aiGeneration++;saveSettings();window.dispatchEvent(new Event('asplayer-ai-changed'))};
function remoteJson(url,body){return new Promise((resolve,reject)=>{if(!window.ASPLAYER||typeof window.ASPLAYER.requestAsync!=='function')return reject(Error('Android network bridge unavailable'));const id=String(nextId++);const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout'))},30000);pending.set(id,{resolve,reject,timer});try{if(body===undefined)ASPLAYER.requestAsync(url,id);else ASPLAYER.requestAiAsync(url,JSON.stringify(body),id)}catch(e){clearTimeout(timer);pending.delete(id);reject(e)}})}
function backend(path,params={}){if(!onlineEndpoint)return Promise.reject(Error('Service not configured'));const url=new URL(onlineEndpoint+path);for(const [key,val] of Object.entries(params))url.searchParams.set(key,String(val));return remoteJson(url.toString())}
window.ASPLAYER_AI_REQUEST=(path,body)=>{if(!settings.aiEnabled||!onlineEndpoint||!['/api/synopsis','/api/assistant'].includes(path))return Promise.reject(Error('AI disabled or unavailable'));return remoteJson(onlineEndpoint+path,body)};
function formatDays(meta){const n=Number(meta?.exp_date);if(!Number.isFinite(n)||n<=0)return tr('accountUnknown');const when=n>1e12?n:n*1000;const days=Math.max(0,Math.ceil((when-Date.now())/86400000));return days===0?tr('expired'):tr('expiresIn')+': '+days}
function renderAccountSummary(){if(!get('account-user')||!session())return;get('account-user').textContent=tr('accountName')+': '+session().user;get('account-expiry').textContent=formatDays(session().meta);get('account-server').textContent=server().name}
async function refreshAccountInfo(){if(!session()||Date.now()-lastMetaRefresh<300000)return;lastMetaRefresh=Date.now();const run=++accountInfoTask,serverKey=server().key,account=session().user;try{const response=await api('');if(run!==accountInfoTask||!session()||server().key!==serverKey||session().user!==account)return;const info=response?.user_info;if(!info||typeof info!=='object')return;sessions[serverKey].meta={...sessions[serverKey].meta,exp_date:info.exp_date||null,status:info.status||'',active_cons:info.active_cons||''};saveSessions();renderAccountSummary()}catch(_){/* Retain last known expiration when offline */}}
// Xtream provides get_short_epg (server credentials are sent only to the selected IPTV server).
function decodeEPG(v){const str=String(v??'');if(!str)return'';if(!/^[a-zA-Z0-9+/]+={0,2}$/.test(str)||str.length%4!==0||str.length<8)return str;try{const raw=atob(str);if(/[^\x09\x0a\x0d\x20-\x7e]/.test(raw)){try{return decodeURIComponent(Array.from(raw,c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))}catch(_){return raw}}return raw}catch(_){return str}}
function toStamp(x){const n=Number(x);if(Number.isFinite(n)&&n>1e9)return n>1e12?n:n*1000;const t=Date.parse(String(x||'').replace(' ','T'));return Number.isFinite(t)?t:0}
function sanitizeGuide(rows){return (Array.isArray(rows)?rows:[]).map(x=>({name:decodeEPG(x.title||x.name||x.programme||''),description:decodeEPG(x.description||x.plot||''),start:toStamp(x.start_timestamp||x.start),end:toStamp(x.stop_timestamp||x.end_timestamp||x.end)})).filter(x=>x.name&&(x.end===0||x.end>=Date.now()-60000)).sort((a,b)=>a.start-b.start).slice(0,14)}
async function fetchGuide(it){if(window.ASPLAYER_FETCH_GUIDE_V55)return window.ASPLAYER_FETCH_GUIDE_V55(it);if(!it?.stream_id)throw Error('No channel ID');if(epgSource==='ai'&&onlineEndpoint){try{const response=await backend('/api/epg',{channel:String(it.name||''),lang});if(response?.verified===true&&response?.source_url&&Array.isArray(response.programs)){const r=sanitizeGuide(response.programs);if(r.length)return{rows:r,origin:tr('epgFromVerified')}}}catch(_){}}
 const result=await api('get_short_epg',{stream_id:it.stream_id,limit:12});return{rows:sanitizeGuide(result?.epg_listings),origin:tr('epgFromServer')};}
function formatClock(ts){if(!ts)return'—';try{return new Date(ts).toLocaleTimeString(lang==='es'?'es-MX':'en-US',{hour:'2-digit',minute:'2-digit'})}catch(_){return'—'}}
async function displayEPG(it){if(!it)return;const id=++epgTask;const standalone=get('modern-player').classList.contains('hidden');get('epg-panel').classList.remove('hidden');get('epg-content').textContent=tr('epgLoading');if(standalone)get('epg-standalone').classList.remove('hidden');else showControls();try{const {rows,origin}=await fetchGuide(it);if(id!==epgTask)return;get('epg-content').innerHTML='<p class="epg-status">'+esc(origin)+'</p>'+(rows.length?rows.map(p=>'<div class="epg-row"><strong>'+esc(formatClock(p.start)+'–'+formatClock(p.end)+' · '+p.name)+'</strong>'+(p.description?'<small>'+esc(p.description)+'</small>':'')+'</div>').join(''):'<p class="tiny">'+esc(tr('epgEmpty'))+'</p>');get('epg-standalone-content').innerHTML=get('epg-content').innerHTML}catch(e){if(id===epgTask)get('epg-content').textContent=tr('epgUnavailable')+' · '+String(e.message||'')}}
const playOld=play;
play=function(it,mode){liveItem=mode==='live'?it:null;get('player-epg').classList.toggle('hidden',mode!=='live');get('epg-panel').classList.add('hidden');playOld(it,mode)};
// EPG accessible from the catalog even when the stream opens the native Android player.
const oldRenderItems=renderItems;
renderItems=function(){return oldRenderItems()}; // EPG removed in v5.7.1
get('cards').addEventListener('click',e=>{const b=e.target.closest('[data-guide]');if(!b)return;e.stopPropagation();const item=filtered[Number(b.dataset.guide)];if(!item)return;liveItem=item;displayEPG(item)});
get('player-epg').addEventListener('click',()=>{if(liveItem)displayEPG(liveItem)});
get('epg-close').addEventListener('click',()=>{get('epg-panel').classList.add('hidden');get('epg-standalone').classList.add('hidden')});get('epg-standalone-close').addEventListener('click',()=>{get('epg-standalone').classList.add('hidden');get('epg-panel').classList.add('hidden')});
// Translate on opening details, not for entire catalogs; keep the original until a valid reply arrives.
const synopsisCache=new Map();
async function maybeEnhanceSynopsis(it,version,mode,info={}){
 if(!settings.aiEnabled||synopsisSource!=='ai'||!onlineEndpoint)return;
 const expected=String(it.name||it.title||''),original=synopsisText({plot:get('detail-plot').textContent}),language=lang,endpoint=onlineEndpoint,generation=aiGeneration,account=sessionGeneration;
 const valid=()=>settings.aiEnabled&&generation===aiGeneration&&version===detailVersion&&account===sessionGeneration&&language===lang&&endpoint===onlineEndpoint&&synopsisSource==='ai'&&!get('details-modal').classList.contains('hidden')&&get('detail-title').textContent===expected;
 if(!valid()||!expected.trim())return;
 const str=(...values)=>String(values.find(v=>typeof v==='string'&&v.trim()||typeof v==='number')||'');
 const metadata={year:(str(info.year,info.releaseDate,info.release_date,info.releasedate,it.year,it.releaseDate,it.release_date,it.releasedate,expected).match(/\b(?:19|20)\d{2}\b/)||[])[0]||'',genre:str(info.genre,it.genre).slice(0,180),cast:str(info.cast,info.actors,it.cast,it.actors).slice(0,300),director:str(info.director,it.director).slice(0,180)};
 const generated=!original,body={title:expected.slice(0,180),lang:language,category:mode,original:original.slice(0,3500),...(generated?{generate:true,...metadata}:{})};
 const key=JSON.stringify([endpoint,language,mode,body]);
 const acceptable=r=>typeof r?.synopsis==='string'&&r.synopsis.trim()&&(generated?r.generated===true&&r.grounded===false:r.grounded===true);
 const subtitle=get('detail-subtitle').textContent,loading=subtitle+' · '+tr('synopsisLoading');
 get('detail-subtitle').textContent=loading;
 try{
  let response=synopsisCache.get(key);
  if(!response){response=await window.ASPLAYER_AI_REQUEST('/api/synopsis',body);if(acceptable(response)){if(synopsisCache.size>=60)synopsisCache.delete(synopsisCache.keys().next().value);synopsisCache.set(key,response)}}
  if(valid()&&acceptable(response)){get('detail-plot').textContent=response.synopsis.trim().slice(0,3500);get('detail-subtitle').textContent=subtitle+' · '+tr(generated?'synopsisGenerated':'synopsisTranslated')}
 }catch(_){/* Preserve the original or missing message; never block playback. */}
 finally{if(version===detailVersion&&account===sessionGeneration&&get('detail-subtitle').textContent===loading)get('detail-subtitle').textContent=subtitle}
}
const movieOld=showMovie;showMovie=async function(it){const task=movieOld(it),version=detailVersion;const info=await task;return maybeEnhanceSynopsis(it,version,'movie',info)};
const seriesOld=showSeries;showSeries=async function(it){const task=seriesOld(it),version=detailVersion;const info=await task;return maybeEnhanceSynopsis(it,version,'series',info)};
// Floating event banner. The service controls when/what to show. No background push service.
async function checkAnnouncements(notify=false){if(!onlineEndpoint){if(notify)get('online-status').textContent=tr('serviceInactive');return}if(Date.now()-lastCheck<60000&&!notify)return;lastCheck=Date.now();try{const r=await backend('/api/announcements',{app:'asplayer',lang});const n=r?.announcement||r?.notice||null;const message=String(n?.message||'').trim().slice(0,400);const id=String(n?.id||'');const key='asplayer:notices:seen';if(!id||!message||n?.active===false||localStorage.getItem(key)===id){if(notify)get('online-status').textContent=tr('noNewNotice');return}if(n?.expires_at&&Date.parse(n.expires_at)<Date.now())return;get('announcement-message').textContent=message;get('announcement').dataset.notice=id;get('announcement').classList.remove('hidden');if(notify)get('online-status').textContent='✓'}catch(_){if(notify)get('online-status').textContent=tr('noticesError')}}
get('check-notice').addEventListener('click',()=>checkAnnouncements(true));
get('dismiss-announcement').addEventListener('click',()=>{const el=get('announcement');if(el.dataset.notice)localStorage.setItem('asplayer:notices:seen',el.dataset.notice);el.classList.add('hidden')});
// Honor the chosen aspect in either orientation (Fit is the default).
function updateResponsivePlayer(){const v=get('video');if(!v)return;v.style.objectFit=playAspect}
const oldOpenPlayer=openPlayer;openPlayer=function(){oldOpenPlayer();updateResponsivePlayer()};
get('default-aspect').addEventListener('change',()=>setTimeout(updateResponsivePlayer,0));
window.addEventListener('resize',updateResponsivePlayer);window.addEventListener('orientationchange',updateResponsivePlayer);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session()){renderAccountSummary();checkAnnouncements(false)}});
setInterval(()=>{if(!document.hidden&&session())checkAnnouncements(false)},15*60*1000);
const extra=document.createElement('style');extra.textContent='.tile-guide-wrapper{display:flex;flex-direction:column;min-width:0;gap:6px}.tile-guide-wrapper .tile{flex:1;min-height:190px}.tile-guide-wrapper .guide-button{min-height:39px;padding:8px}.epg-list{flex:1}.epg-row{white-space:normal}.account-summary strong{font-size:13px}';document.head.appendChild(extra);
languageUI();if(session()){renderAccountSummary();refreshAccountInfo();checkAnnouncements(false)}
})();
