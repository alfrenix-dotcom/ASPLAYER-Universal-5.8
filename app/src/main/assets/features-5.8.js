/* ASPLAYER Universal 5.8: LibVLC route and native watch progress.
   Installed only with the corresponding LibVLC Android bridge. */
(function(){
'use strict';
const bridge=window.ASPLAYER;
if(!bridge || typeof bridge.playMedia!=='function'){
  console.warn('ASPLAYER 5.8: LibVLC bridge unavailable, preserving 5.7.1 playback');
  return;
}
const get=id=>document.getElementById(id);
function syncNativeLanguage(){try{bridge.setUiLanguage(lang)}catch(_){}}
syncNativeLanguage();
let currentItem=null,currentMode=null,currentId='',currentPrefix='',nativeVisible=false;
// Remember the last format which delivered video, for this account in this app session.
const workingLiveFormats=new Map();
const idOf=item=>String(item?.stream_id??item?.series_id??item?.id??item?.name??'');
function liveExtension(account,profile){
  if(settings.liveFormat==='hls')return 'm3u8';
  if(settings.liveFormat==='mpegts')return 'ts';
  const advertised=Array.isArray(account?.meta?.allowed_output_formats)
    ?account.meta.allowed_output_formats.map(value=>String(value).toLowerCase()):[];
  const ts=advertised.includes('ts')||advertised.includes('mpegts');
  const hls=advertised.includes('m3u8')||advertised.includes('hls');
  if(ts&&!hls)return 'ts';
  if(hls&&!ts)return 'm3u8';
  return workingLiveFormats.get(sessionPrefix())||'m3u8';
}
const oldPlay=play;
play=function(item,mode){
  currentItem=item;
  currentMode=mode;
  currentId=idOf(item);
  currentPrefix=sessionPrefix();
  syncNativeLanguage();
  if(mode==='live'){
    const account=session();
    if(!account)return toast(tr('noSession'));
    if(!item?.stream_id)return toast(tr('error'));
    const profile=settings.bufferProfile||'adaptive',ext=liveExtension(account,profile);
    const url=server().base+'/live/'+encodeURIComponent(account.user)+'/'+encodeURIComponent(account.pass)+'/'+encodeURIComponent(item.stream_id)+'.'+ext;
    // Native LibVLC is already initialized. Bypass the retired mini-player,
    // HTML video element and its competing legacy stream-retry timers.
    if(nativeVisible||!get('modern-player').classList.contains('hidden'))stopPlayer();
    playback={url,ext,mode:'live',title:String(item.name||'Live TV')};
    get('player-choice').classList.add('hidden');
    get('modern-player').classList.add('hidden');
    try{
      const manual=settings.liveFormat==='hls'||settings.liveFormat==='mpegts';
      if(manual&&typeof bridge.playLiveMedia==='function')bridge.playLiveMedia(url,profile,playAspect,audioPref,subsPref,0);
      else bridge.playMedia(url,profile,playAspect,audioPref,subsPref,0);
      nativeVisible=true;
    }catch(_){
      nativeVisible=false;
      return oldPlay(item,mode);
    }
    rememberPlay('live',item);
    window.ASPLAYER_REFRESH_WATCH?.();
    return;
  }
  try{bridge.setPlaybackOptions(settings.bufferProfile||'adaptive',playAspect,audioPref,subsPref)}catch(_){ }
  return oldPlay(item,mode);
};
function record(){
  const all=load(HISTORY_KEY,{});
  const data=all[currentPrefix]||{};
  const rows=Array.isArray(data[currentMode])?data[currentMode]:[];
  const i=rows.findIndex(x=>String(x.id)===String(currentId));
  return {all,data,rows,i};
}
function rememberNativeProgress(ms,durationMs,ended){
  if(!currentId||!currentPrefix||!['vod','series'].includes(currentMode))return;
  const pos=Number(ms)/1000,dur=Number(durationMs)/1000;
  if(!Number.isFinite(pos)||pos<0)return;
  const state=record();
  if(state.i<0)return;
  const row=state.rows.splice(state.i,1)[0];
  row.position=Math.max(0,pos);
  if(Number.isFinite(dur)&&dur>0)row.duration=dur;
  row.watchedAt=Date.now();
  row.finished=Boolean(ended)||(row.duration>0&&row.position/row.duration>=0.96);
  state.rows.unshift(row);
  state.data[currentMode]=state.rows.slice(0,300);
  state.all[currentPrefix]=state.data;
  store(HISTORY_KEY,state.all);
  if(ended)window.ASPLAYER_REFRESH_WATCH?.();
}
window.ASPLAYER58_EVENT=function(event){
  if(!event||!event.type)return;
  if(event.type==='videoReady'&&currentMode==='live'&&currentPrefix===sessionPrefix()&&
     !['hls','mpegts'].includes(settings.liveFormat)&&['m3u8','ts'].includes(event.transport)){
    workingLiveFormats.set(currentPrefix,event.transport);
  }else if(event.type==='position'){
    rememberNativeProgress(event.position,event.duration,event.ended);
  }else if(event.type==='ended'){
    /* Final position arrives in the preceding position event. */
  }else if(event.type==='closed'){
    nativeVisible=false;
    stopPlayer();
  }else if(event.type==='error'){
    // Native LibVLC displays a bilingual maintenance panel with Retry / Close.
    // Avoid replacing it with the old generic failure toast.
  }
};
const prevOpenPlayer=openPlayer;
openPlayer=function(){
  if(!playback||!currentItem)return prevOpenPlayer();
  const r=record(),row=r.i>=0?r.rows[r.i]:null;
  const resume=row?.finished?0:(Number(row?.position)||0);
  try{
    get('player-choice').classList.add('hidden');
    get('modern-player').classList.add('hidden');
    nativeVisible=true;
    bridge.playMedia(playback.url, settings.bufferProfile||'adaptive',playAspect,
                     audioPref,subsPref,Math.round(resume*1000));
  }catch(error){
    nativeVisible=false;
    return prevOpenPlayer();
  }
};
const prevStop=stopPlayer;
stopPlayer=function(){
  if(nativeVisible){
    nativeVisible=false;
    try{bridge.stopMedia()}catch(_){ }
  }
  prevStop();
};
const settingsHint=document.createElement('p');
settingsHint.className='tiny';
settingsHint.textContent=lang==='es'
  ?'ASPLAYER 5.9.4 usa LibVLC/VLC para TV, películas y series. Selecciona pistas disponibles desde los controles nativos del reproductor.'
  :'ASPLAYER 5.9.4 uses LibVLC/VLC for live TV, films and series. Choose available audio/subtitle tracks in the native player controls.';
const playerSetting=get('preferred-player')?.closest('.setting');
if(playerSetting)playerSetting.appendChild(settingsHint);
const decoderKey='asplayer:decoder:v592';
let decoderMode='auto';
try{decoderMode=localStorage.getItem(decoderKey)||'auto';}catch(_){}
if(!['auto','hardware','software'].includes(decoderMode))decoderMode='auto';
try{bridge.setDecoderMode(decoderMode);}catch(_){}
const decoderLabel=document.createElement('label');
const decoderSelect=document.createElement('select');
decoderSelect.id='decoder-mode-v592';
decoderSelect.setAttribute('aria-label','Decoder mode / Modo de decodificación');
[['auto','auto'],['hardware','hardware'],['software','software']].forEach(([value,text])=>{
  const option=document.createElement('option');option.value=value;option.textContent=text;
  decoderSelect.appendChild(option);
});
decoderSelect.value=decoderMode;
decoderSelect.addEventListener('change',()=>{
  decoderMode=decoderSelect.value;
  try{localStorage.setItem(decoderKey,decoderMode);}catch(_){}
  try{bridge.setDecoderMode(decoderMode);}catch(_){}
});
if(playerSetting){playerSetting.appendChild(decoderLabel);playerSetting.appendChild(decoderSelect);}
function syncDecoderLabels(){
  decoderLabel.textContent=lang==='es'?'Decodificación de vídeo':'Video decoding';
  decoderSelect.options[0].textContent=lang==='es'?'Automático (recomendado)':'Automatic (recommended)';
  decoderSelect.options[1].textContent=lang==='es'?'Hardware':'Hardware';
  decoderSelect.options[2].textContent=lang==='es'?'Software':'Software';
}
syncDecoderLabels();
const about=Array.from(document.querySelectorAll('#view-settings p'))
  .find(el=>el.textContent.includes('ASPLAYER Universal 5.7.1'));
if(about)about.textContent='ASPLAYER Universal 5.9.4 · LibVLC/VLC · Alftech Solutions';
const refreshLanguage=languageUI;
languageUI=function(){
  refreshLanguage();
  syncNativeLanguage();
  syncDecoderLabels();
  settingsHint.textContent=lang==='es'
    ?'LibVLC/VLC está configurado para TV, películas y series. Los idiomas y subtítulos disponibles se eligen en el reproductor.'
    :'LibVLC/VLC is configured for live TV, movies and series. Choose available tracks in the player.';
};
console.info('ASPLAYER 5.8 LibVLC bridge active');
})();
