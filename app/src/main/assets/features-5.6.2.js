/* ASPLAYER 5.6.2 - Faster channel switching, Android buffer status,
   progressive media preloading, bounded stall recovery, password visibility.
   Native VideoView buffers video via Android MediaPlayer; the app does not
   claim a fixed buffer size or download protected content to disk. */
(function(){
'use strict';
const E=id=>document.getElementById(id);
Object.assign(LABELS.en,{
 revealPassword:'Show password',concealPassword:'Hide password',
 streamBuffering:'Buffering video…',streamReconnecting:'Reconnecting stream…',
 streamReady:'Playing',streamFailed:'Stream interrupted. Try another player.',
 bufferHeading:'Playback loading',bufferDescription:'Automatically preload supported videos while playing and retry brief connection stalls. Live TV uses Android’s streaming buffer.',
 bufferSwitch:'Automatic background buffering (supported formats)',
 bufferOn:'Automatic buffer enabled',bufferOff:'Automatic buffer disabled'
});
Object.assign(LABELS.es,{
 revealPassword:'Mostrar contraseña',concealPassword:'Ocultar contraseña',
 streamBuffering:'Almacenando vídeo en búfer…',streamReconnecting:'Reconectando transmisión…',
 streamReady:'Reproduciendo',streamFailed:'Transmisión interrumpida. Prueba otro reproductor.',
 bufferHeading:'Carga de reproducción',bufferDescription:'Precarga automáticamente los vídeos compatibles mientras se reproducen y recupera interrupciones breves. La TV en vivo utiliza el búfer de Android.',
 bufferSwitch:'Búfer automático en segundo plano (formatos compatibles)',
 bufferOn:'Búfer automático activado',bufferOff:'Búfer automático desactivado'
});

// Password controls must also work with remote-control focus navigation.
for(const id of ['password','settings-password','parent-pin','unlock-pin']){
 const input=E(id);if(!input)continue;
 const group=document.createElement('div');group.className='password-group';
 input.parentNode.insertBefore(group,input);group.appendChild(input);
 const toggle=document.createElement('button');toggle.type='button';
 toggle.className='password-toggle';toggle.dataset.passwordToggle=id;
 toggle.setAttribute('aria-controls',id);toggle.setAttribute('aria-pressed','false');
 group.appendChild(toggle);
 const paint=()=>{const visible=input.type==='text';toggle.textContent=visible?'🙈':'👁';toggle.title=tr(visible?'concealPassword':'revealPassword');toggle.setAttribute('aria-label',toggle.title);toggle.setAttribute('aria-pressed',String(visible))};
 toggle.addEventListener('click',()=>{const pos=input.selectionStart;input.type=input.type==='password'?'text':'password';paint();input.focus();try{input.setSelectionRange(pos,pos)}catch(_){}});
 paint();
}

const bufferSetting=document.createElement('div');bufferSetting.className='box setting buffer-setting';
bufferSetting.innerHTML='<h3 id="buffer-heading"></h3><p id="buffer-description"></p><label class="buffer-option"><input type="checkbox" id="buffer-enabled"><span id="buffer-switch-label"></span></label><p id="buffer-note" class="tiny"></p>';
const playerOptions=E('preferred-player')?.closest('.setting');
if(playerOptions)playerOptions.insertAdjacentElement('afterend',bufferSetting);
let enableBuffer=settings.preloadVideo!==false;
const originalSaveSettings=saveSettings;
saveSettings=function(){originalSaveSettings();settings.preloadVideo=enableBuffer;store(SETTINGS_KEY,settings)};
function renderBufferUI(){
 E('buffer-heading').textContent=tr('bufferHeading');E('buffer-description').textContent=tr('bufferDescription');
 E('buffer-switch-label').textContent=tr('bufferSwitch');E('buffer-note').textContent=tr(enableBuffer?'bufferOn':'bufferOff');
 E('buffer-enabled').checked=enableBuffer;
 for(const node of document.querySelectorAll('.password-toggle')){const input=E(node.dataset.passwordToggle),shown=input.type==='text';node.title=tr(shown?'concealPassword':'revealPassword');node.setAttribute('aria-label',node.title)}
}
E('buffer-enabled').addEventListener('change',event=>{
 enableBuffer=event.target.checked;saveSettings();renderBufferUI();
 E('video').preload=enableBuffer?'auto':'metadata';
});
const previousLanguage=languageUI;
languageUI=function(){previousLanguage();renderBufferUI()};

// The browser downloads and keeps a progressive buffer *while the video plays*
// when the stream and WebView permit it.  Native streams use their OS buffer.
const video=E('video');video.preload=enableBuffer?'auto':'metadata';
video.setAttribute('playsinline','');
const stage=E('playerstage');
const status=document.createElement('div');status.className='buffer-state hidden';
status.id='buffer-state';status.setAttribute('role','status');status.setAttribute('aria-live','off');
stage.appendChild(status);
let nativeStream='',nativeRetryCount=0,retryTimeout=0,stallTimeout=0,webRecovery=0,bufferPercent=0;
let nativeLastReady=false,webCurrentSession='';
function statusText(text){
 status.textContent=text;status.classList.toggle('hidden',!text);
 let label=E('native-guide-status');
 if(!label&&E('guide-origin')){
  label=document.createElement('span');label.id='native-guide-status';
  label.className='tiny native-guide-status';E('guide-origin').parentNode.appendChild(label);
 }
 if(label){label.textContent=isLiveShowing()?text:'';label.classList.toggle('hidden',!text||!isLiveShowing())}
}
function clearRecovery(){clearTimeout(retryTimeout);clearTimeout(stallTimeout);retryTimeout=0;stallTimeout=0}
function isLiveShowing(){return playback?.mode==='live'&&!E('modern-player').classList.contains('hidden')}
function liveRetry(){
 if(!isLiveShowing()||!window.ASPLAYER?.playMini)return;
 if(nativeRetryCount>=2){statusText(tr('streamFailed'));return}
 const attempt=++nativeRetryCount;
 statusText(tr('streamReconnecting'));
 clearTimeout(retryTimeout);
 retryTimeout=setTimeout(()=>{
  if(!isLiveShowing()||!nativeStream)return;
  // Xtream panels commonly expose MPEG-TS as a compatible HLS fallback.
  // Only attempt this on a retry, never replace a working stream.
  if(attempt===2&&/\.m3u8(?:\?|$)/i.test(nativeStream)){
   nativeStream=nativeStream.replace(/\.m3u8(?=\?|$)/i,'.ts');
  }
  try{ASPLAYER.playMini(nativeStream)}catch(_){statusText(tr('streamFailed'))}
 },attempt===1?900:2200);
}
function startNativeWatchdog(){
 clearTimeout(stallTimeout);
 stallTimeout=setTimeout(()=>{
  if(isLiveShowing()&&!nativeLastReady)liveRetry();
 },14000);
}
// Android VideoView invokes these events from the UI thread. The JS handler
// does not receive stream credentials or player internals.
window.ASPLAYER_NATIVE_EVENT=function(state){
 if(!isLiveShowing())return;
 if(state==='ready'||state==='playing'){
  nativeLastReady=true;clearTimeout(stallTimeout);statusText('');return;
 }
 if(state==='buffering'){
  nativeLastReady=false;statusText(tr('streamBuffering'));
  startNativeWatchdog();return;
 }
 if(state==='error'){
  nativeLastReady=false;liveRetry();return;
 }
};
const prevPlay=play;
play=function(item,mode){
 clearRecovery();bufferPercent=0;webRecovery=0;nativeRetryCount=0;nativeLastReady=false;
 prevPlay(item,mode);
 if(mode==='live'&&isLiveShowing()){
  nativeStream=playback?.url||'';statusText(tr('streamBuffering'));
  startNativeWatchdog();
 }else if(mode!=='live'){
  nativeStream='';statusText(enableBuffer?tr('streamBuffering'):'');
 }
};
const prevStop=stopPlayer;
stopPlayer=function(){clearRecovery();nativeStream='';nativeLastReady=false;statusText('');prevStop()};
const prevOpen=openPlayer;
openPlayer=function(){
 video.preload=enableBuffer?'auto':'metadata';
 prevOpen();
 if(!E('modern-player').classList.contains('hidden'))statusText(tr('streamBuffering'));
};

function webStall(){
 if(!enableBuffer||E('modern-player').classList.contains('hidden')||isLiveShowing()||video.paused)return;
 statusText(tr('streamBuffering'));
 clearTimeout(stallTimeout);
 const source=playback?.url||'';webCurrentSession=source;
 stallTimeout=setTimeout(()=>{
  if(!enableBuffer||E('modern-player').classList.contains('hidden')||video.paused||isLiveShowing()||webRecovery>=2||playback?.url!==source)return;
  if(video.readyState>=3)return;
  webRecovery++;
  const currentTime=Number.isFinite(video.currentTime)?video.currentTime:0;
  statusText(tr('streamReconnecting'));
  try{
   video.pause();video.load();
   const resume=()=>{video.removeEventListener('loadedmetadata',resume);if(currentTime>0)try{video.currentTime=currentTime}catch(_){}video.play().catch(()=>{})};
   video.addEventListener('loadedmetadata',resume,{once:true});
   // For simple MP4s resume directly, and browsers decide how many bytes to fetch.
  }catch(_){}
 },12000);
}
video.addEventListener('waiting',webStall);
video.addEventListener('stalled',webStall);
video.addEventListener('canplay',()=>{if(!isLiveShowing()){clearTimeout(stallTimeout);statusText('')}});
video.addEventListener('playing',()=>{if(!isLiveShowing()){webRecovery=0;clearTimeout(stallTimeout);statusText('')}});
video.addEventListener('progress',()=>{
 if(!enableBuffer||isLiveShowing()||!Number.isFinite(video.duration)||video.duration<=0)return;
 try{
  const ranges=video.buffered;let end=0;
  for(let i=0;i<ranges.length;i++)if(ranges.start(i)<=video.currentTime+.2&&ranges.end(i)>=video.currentTime)end=ranges.end(i);
  bufferPercent=Math.max(0,Math.min(100,Math.round(end/video.duration*100)));
  status.dataset.bufferPercent=String(bufferPercent);
 }catch(_){}
});

const uiStyle=document.createElement('style');uiStyle.textContent=`
.password-group{position:relative;width:100%}
.password-group input{width:100%;padding-right:57px}
.password-toggle{position:absolute;top:1px;right:2px;width:47px;height:43px;min-height:43px;background:#152643;border:1px solid #33516b;border-radius:9px;color:#7eecf3;font-size:26px;line-height:1;display:grid;place-items:center}
.password-toggle:focus-visible{outline:3px solid #f9d77a;outline-offset:1px}
.buffer-setting .buffer-option{display:flex;align-items:center;gap:12px;margin:18px 0 5px;cursor:pointer}
.buffer-setting .buffer-option input{width:24px;height:24px;min-height:24px;flex:none;margin:0;accent-color:#58dce4}
.buffer-state{position:absolute;left:14px;bottom:14px;border-radius:99px;max-width:calc(100% - 28px);padding:8px 13px;font-size:12px;font-weight:700;color:#dcfbff;background:#0a1d30dd;border:1px solid #64dce7b0;pointer-events:none;z-index:3;backdrop-filter:blur(8px)}
.live-full .buffer-state{bottom:80px}
.native-guide-status{display:block;color:#67e3eb;font-weight:700;margin-top:4px}
@media(max-width:650px){.buffer-state{font-size:11px;padding:7px 10px}}
`;
document.head.appendChild(uiStyle);
renderBufferUI();
console.info('ASPLAYER 5.6.2: native stream monitor, browser prebuffer and password visibility');
})();
