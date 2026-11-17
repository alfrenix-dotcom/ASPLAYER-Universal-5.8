/* ASPLAYER Universal 5.6 - server Xtream schedules and split-screen TV player.
   Source: selected Xtream provider only
   No third-party TV guide requests.
   Unknown schedules are never invented. No password is sent to an server provider. */
(function(){
'use strict';
const G=id=>document.getElementById(id);
const V55={
 en:{epgUsLarge:'US national server is too large for a device download. Configure a filtered HTTPS guide service.',epgAuto:'Automatic · server, server only',epgExternal:'External server only',epgCountryLabel:'External EPG region',epgNotes:'Only matching channel guides are displayed. External guides are cached for 8 hours.',liveAndGuide:'LIVE CHANNEL + NEXT PROGRAMMES',epgRefresh:'Refresh guide',fullscreen:'Full screen ⛶',epgView:'TV + guide',epgMatchMissing:'No programme guide is available from this server for this channel.',epgOffline:'External guide unavailable. Check your connection and try again.',epgLoadingExternal:'Searching external server guide…',epgFromExternal:'External server guide',epgNow:'NOW',epgNext:'NEXT',epgGuideMode:'TV opens beside the programme guide; full screen hides the guide.',epgGuideRegion:'server region',epgUnknown:'No verified programming',nativeMiniMode:'Android TV player',webMiniMode:'Built-in web player'},
 es:{epgUsLarge:'El server nacional de EE. UU. es demasiado grande para el dispositivo. Configura una guía HTTPS filtrada.',epgAuto:'Automático · servidor y luego server',epgExternal:'Solo server externo',epgCountryLabel:'Región de EPG externo',epgNotes:'Solo se muestra programación de canales identificados. Las guías externas se guardan durante 8 horas.',liveAndGuide:'CANAL EN VIVO + PRÓXIMOS PROGRAMAS',epgRefresh:'Actualizar guía',fullscreen:'Pantalla completa ⛶',epgView:'TV + guía',epgMatchMissing:'El servidor no proporciona programación para este canal.',epgOffline:'La guía externa no está disponible. Comprueba la conexión.',epgLoadingExternal:'Buscando guía server externa…',epgFromExternal:'Guía server externa',epgNow:'AHORA',epgNext:'SIGUIENTE',epgGuideMode:'TV se abre junto a la programación; pantalla completa oculta la guía.',epgGuideRegion:'Región server',epgUnknown:'Sin programación verificada',nativeMiniMode:'Reproductor Android',webMiniMode:'Reproductor web'}
};
for(const k of ['en','es'])Object.assign(LABELS[k],V55[k]);
const CACHE_8H=8*60*60*1000, scheduleMemory=new Map();
let epgRun=0,miniItem=null,miniNative=false,miniActive=false,miniFull=false;
async function providerSchedule(item){
 const r=await api('get_short_epg',{stream_id:item.stream_id,limit:20});
 const decoder=str=>{if(!str)return'';const s=String(str);if(!/^[A-Za-z0-9+/]{8,}={0,2}$/.test(s)||s.length%4!==0)return s;try{const bytes=atob(s);return decodeURIComponent(Array.from(bytes,c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))}catch(_){try{return atob(s)}catch(e){return s}}};
 return (Array.isArray(r?.epg_listings)?r.epg_listings:[]).map(x=>({name:decoder(x.title||x.name||''),description:decoder(x.description||''),start:fromServerTime(x.start_timestamp||x.start),end:fromServerTime(x.stop_timestamp||x.end_timestamp||x.end)}))
  .filter(x=>x.name&&x.end>=Date.now()-300000).sort((a,b)=>a.start-b.start).slice(0,28);
}
function fromServerTime(v){if(Number(v)>1e9){const n=Number(v);return n>1e12?n:n*1000;}const d=Date.parse(String(v||'').replace(' ','T'));return Number.isFinite(d)?d:0}
async function getLiveSchedule(item,force=false){
 if(!item?.stream_id)throw Error('Missing channel stream ID');
 const cacheKey=[server().key,session()?.user,item.stream_id].join(':');
 const cached=scheduleMemory.get(cacheKey);
 if(!force&&cached&&Date.now()-cached.updated<CACHE_8H)return cached.data;
 let rows=[];
 try{rows=await providerSchedule(item)}catch(_){/* Try second Xtream endpoint */}
 if(!rows.length){
  try{const table=await api('get_simple_data_table',{stream_id:item.stream_id});
   let list=Array.isArray(table?.epg_listings)?table.epg_listings:Array.isArray(table?.listings)?table.listings:[];
   rows=list.map(x=>({name:decodeGuide(x.title||x.name||''),description:decodeGuide(x.description||''),start:fromServerTime(x.start_timestamp||x.start),end:fromServerTime(x.stop_timestamp||x.end_timestamp||x.end)}))
    .filter(x=>x.name&&x.end>Date.now()-300000).sort((a,b)=>a.start-b.start).slice(0,28);
  }catch(_){/* Unavailable on some Xtream panels */}
 }
 const data={rows,origin:rows.length?tr('epgFromServer'):tr('epgMatchMissing')};
 scheduleMemory.set(cacheKey,{updated:Date.now(),data});
 return data;
}
function decodeGuide(s){
 if(!s)return'';s=String(s);
 if(!/^[A-Za-z0-9+/]{8,}={0,2}$/.test(s)||s.length%4!==0)return s;
 try{const bytes=atob(s);return decodeURIComponent(Array.from(bytes,c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))}catch(_){return s}
}
window.ASPLAYER_FETCH_GUIDE_V55=getLiveSchedule;
function fmtClock(ts){return new Date(ts).toLocaleTimeString(lang==='es'?'es-MX':'en-US',{hour:'2-digit',minute:'2-digit'})}
function displayLiveRows({rows,origin}){
 G('guide-origin').textContent=origin||'';
 if(!rows.length){G('live-guide-items').innerHTML='<p class="live-guide-placeholder">'+esc(tr('epgMatchMissing'))+'</p>';return}
 const now=Date.now();
 G('live-guide-items').innerHTML=rows.map((x,i)=>{
  const playing=x.start<=now&&x.end>now,soon=!playing&&x.start>now&&i===rows.findIndex(q=>q.start>now);
  return `<article class="live-guide-row ${playing?'now':''}"><div class="time">${esc(fmtClock(x.start))}<br>${esc(fmtClock(x.end))}</div><div>${playing?`<small>● ${esc(tr('epgNow'))}</small>`:soon?`<small>${esc(tr('epgNext'))}</small>`:''}<strong>${esc(x.name)}</strong>${x.description?`<small>${esc(x.description)}</small>`:''}</div></article>`;
 }).join('');
}
async function refreshLiveGuide(force=false){
 if(!miniItem)return;const current=miniItem,serial=++epgRun;
 G('guide-channel-title').textContent=String(current.name||current.title||'ASPLAYER');
 G('guide-origin').textContent=tr('epgLoading');G('live-guide-items').innerHTML='<p class="live-guide-placeholder">'+esc(tr('epgLoading'))+'</p>';
 try{const result=await getLiveSchedule(current,force);if(serial!==epgRun||miniItem!==current)return;displayLiveRows(result)}
 catch(e){if(serial===epgRun)displayLiveRows({rows:[],origin:tr('epgOffline')})}
}
function playerView(full){
 miniFull=!!full;
 const shell=G('modern-player');if(!miniActive)return;
 shell.classList.toggle('live-split',!full);shell.classList.toggle('live-full',!!full);shell.classList.remove('controls-hidden');
 G('player-mini').classList.toggle('hidden',!full);G('player-fullscreen').classList.toggle('hidden',full);
 if(miniNative&&window.ASPLAYER?.resizeMini){try{ASPLAYER.resizeMini(!!full)}catch(_){}}
 else if(window.ASPLAYER?.resizeMini){try{ASPLAYER.resizeMini(!!full)}catch(_){}}
 if(full)showControls();else clearTimeout(controlsTimer);
}
window.ASPLAYER_NATIVE_MINI=()=>playerView(false); // Android TV back from fullscreen returns to live guide
const previousPlay=play;
play=function(item,mode){
 if(mode!=='live'){
  if(miniActive)stopPlayer();miniItem=null;miniActive=false;miniNative=false;
  G('modern-player').classList.remove('live-split','live-full');
  previousPlay(item,mode);
  return;
 }
 if(!session())return toast(tr('noSession'));
 if(!item?.stream_id)return toast(tr('error'));
 // Preserve the native VideoView when zapping channels, so its surface
 // and decoder do not need to be destroyed and recreated.
 if(miniActive)previousStop();else stopPlayer();
 miniItem=item;miniActive=true;miniFull=false;
 if(window.ASPLAYER_SET_LIVE_ITEM)window.ASPLAYER_SET_LIVE_ITEM(item);
 const s=session(),url=server().base+'/live/'+encodeURIComponent(s.user)+'/'+encodeURIComponent(s.pass)+'/'+encodeURIComponent(item.stream_id)+'.m3u8';
 playback={url,ext:'m3u8',mode:'live',title:String(item.name||'Live TV')};
 rememberPlay('live',item);
 G('modern-player').classList.remove('hidden','controls-hidden');G('modern-player').classList.add('live-split');
 G('live-guide-pane').classList.remove('hidden');G('playing-title').textContent=playback.title;
 G('player-epg').classList.remove('hidden');G('player-mini').classList.add('hidden');G('player-fullscreen').classList.remove('hidden');
 G('player-track-panel').classList.add('hidden');G('epg-panel').classList.add('hidden');G('player-message').textContent='';
 const video=G('video');video.pause();video.removeAttribute('src');video.load();video.style.objectFit='contain';
 // The Android VideoView (when supported by the app bridge) is layered over the mini video area.
 // It preserves the same native IPTV playback that worked in older ASPLAYER versions.
 miniNative=typeof window.ASPLAYER?.playMini==='function';
 if(miniNative){try{ASPLAYER.playMini(url)}catch(_){miniNative=false}}
 if(!miniNative){
  video.src=url;video.load();Promise.resolve(video.play()).catch(()=>{G('player-message').textContent=tr('unsupported')});
 }
 playerView(true);
 // Live TV opens directly in native fullscreen; no guide is requested.
 // Guide has been disabled in 5.7.1: do not issue EPG requests on live playback.
};
const previousStop=stopPlayer;
stopPlayer=function(){
 epgRun++;if(miniNative&&window.ASPLAYER?.stopMini){try{ASPLAYER.stopMini()}catch(_){}}
 if(window.ASPLAYER?.resizeMini){try{ASPLAYER.resizeMini(false)}catch(_){}}
 miniItem=null;miniNative=false;miniActive=false;miniFull=false;
 if(window.ASPLAYER_SET_LIVE_ITEM)window.ASPLAYER_SET_LIVE_ITEM(null);
 G('modern-player').classList.remove('live-split','live-full');G('live-guide-pane').classList.add('hidden');
 previousStop();
};
const oldOpen=openPlayer;
openPlayer=function(){miniActive=false;G('modern-player').classList.remove('live-split','live-full');oldOpen();if(window.ASPLAYER?.resizeMini){try{ASPLAYER.resizeMini(true)}catch(_){}}};
const previousControls=showControls;
showControls=function(){
 if(miniActive&&!miniFull)return;
 previousControls();
 // The guide mode never hides its EPG. Fullscreen toolbar and controls auto-hide in 3 sec.
 if(miniActive&&miniFull){clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>{
  if(miniActive&&miniFull&&G('player-track-panel').classList.contains('hidden')&&G('epg-panel').classList.contains('hidden'))G('modern-player').classList.add('controls-hidden');
 },3000)}
};
G('guide-expand').addEventListener('click',()=>playerView(true));
G('player-fullscreen').addEventListener('click',()=>{if(miniActive)playerView(true);else{try{ASPLAYER?.resizeMini(true)}catch(_){}showControls()}});
G('player-mini').addEventListener('click',()=>playerView(false));
G('guide-refresh').addEventListener('click',()=>refreshLiveGuide(true));
G('guide-exit').addEventListener('click',stopPlayer);
G('epg-source').value='server';
G('epg-source').addEventListener('change',()=>{scheduleMemory.clear();if(miniItem)refreshLiveGuide(true)});
settings.epgSource='server';saveSettings();
const oldUI=languageUI;languageUI=function(){oldUI();G('epg-source').value='server'};
// Rotation preserves the same video element and guide; native overlay measures the new height when split.
window.addEventListener('resize',()=>{if(miniActive&&miniNative&&window.ASPLAYER?.resizeMini){try{ASPLAYER.resizeMini(miniFull)}catch(_){}}});
window.addEventListener('orientationchange',()=>{if(miniActive&&miniNative&&window.ASPLAYER?.resizeMini){try{ASPLAYER.resizeMini(miniFull)}catch(_){}}});
languageUI();
console.info('ASPLAYER 5.6: Xtream server guide only, mini player and fullscreen');
})();
