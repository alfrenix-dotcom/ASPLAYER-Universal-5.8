/* ASPLAYER 6.0.7: series History/Continue season navigation, episode stills
 * and opt-out auto-next. No decoder, network or remote-key handlers added. */
(()=>{
'use strict';
const KEY='asplayer:series:auto-next:v607',T={
 es:{available:'Temporadas disponibles',selectHint:'Selecciona una temporada para ver sus capítulos',chapter:'Capítulo',heading:'Avance automático del siguiente capítulo',help:'Inicia el siguiente capítulo disponible al finalizar el actual en el reproductor integrado.',season:'Temporada',episodes:'capítulos',select:'Elegir temporada',continue:'Continuar',replay:'Reproducir otra vez',next:'Siguiente capítulo',watched:'Visto',from:'Continuar desde',image:'Imagen del capítulo'},
 en:{available:'Available seasons',selectHint:'Choose a season to see its episodes',chapter:'Episode',heading:'Automatically play the next episode',help:'Plays the next available episode after the current one ends in the built-in player.',season:'Season',episodes:'episodes',select:'Select season',continue:'Resume',replay:'Replay',next:'Next episode',watched:'Watched',from:'Resume from',image:'Episode image'}};
const langText=()=>T[lang==='es'?'es':'en'],id=x=>String(x?.id??x?.stream_id??''),sid=x=>String(x?.seriesId??x?.series_id??'');
let enabled=true;try{enabled=localStorage.getItem(KEY)!=='false';}catch(_){}
let context=null,historyTarget=null,playing=null,token=0,pending=null;
const cancel=()=>{if(pending!==null)clearTimeout(pending);pending=null;};
function historyRows(){
 if(!session())return [];
 const state=load(HISTORY_KEY,{})[sessionPrefix()]||{};
 return Array.isArray(state.series)?state.series:[];
}
const saved=(ep,parent)=>historyRows().find(row=>String(row.id)===id(ep)&&(!parent||!sid(row.item)||sid(row.item)===parent));
function imageOf(ep){
 const info=ep?.info&&typeof ep.info==='object'?ep.info:{};
 for(const candidate of [info.movie_image,info.cover_big,info.cover,info.thumbnail,info.image,info.screenshot,ep?.episode_image,ep?.thumbnail,ep?.movie_image]){
  if(typeof candidate==='string'&&candidate.trim()){const src=safeImage(candidate);if(src)return src;}
 }
 return '';
}
function seasonGroups(raw){
 const groups=Object.entries(raw||{}).map(([season,value])=>{
  const entries=(Array.isArray(value)?value:Object.values(value||{})).filter(x=>x&&typeof x==='object').slice();
  entries.sort((a,b)=>{const m=Number(a.episode_num??NaN),n=Number(b.episode_num??NaN);return Number.isFinite(m)&&Number.isFinite(n)?m-n:0;});
  return {season,items:entries.map(ep=>({
   ...ep,season:ep.season??season,seriesId:context.id,
   seriesName:context.name,category_id:ep.category_id??context.category
  }))};
 }).filter(g=>g.items.length);
 groups.sort((a,b)=>{const m=Number(a.season),n=Number(b.season);return Number.isFinite(m)&&Number.isFinite(n)?m-n:a.season.localeCompare(b.season,undefined,{numeric:true});});
 return groups;
}
const showOriginal=showSeries;
showSeries=function(it){
 const seriesId=String(it?.series_id??it?.seriesId??'');
 if(historyTarget&&sid(historyTarget.item)!==seriesId)historyTarget=null;
 context={id:seriesId,name:String(it?.name??it?.seriesName??it?.title??''),category:it?.category_id,account:sessionPrefix(),episodes:[]};
 return showOriginal(it);
};
function openHistory(row){
 const parent=sid(row?.item);
 if(!row?.item||!parent||!session())return false;
 historyTarget=row;
 showSeries({series_id:parent,name:row.item.seriesName||String(row.title||'').split(' · ')[0],
             category_id:row.item.category_id,cover:row.item.cover,stream_icon:row.item.stream_icon});
 return true;
}
window.ASPLAYER_SERIES_HISTORY_OPEN=openHistory;
// Intercept series watch-row activation before the old capture listener that replays
// a single episode. Preserve its PIN gate, and leave movies/live unchanged.
document.addEventListener('click',e=>{
 if(active!=='series'||!['__asplayer_history__','__asplayer_continue__'].includes(category))return;
 const b=e.target.closest?.('#cards [data-watch-key]');if(!b)return;
 const row=historyRows().find(r=>String(r.id)===String(b.dataset.watchKey));
 if(!row||!sid(row.item))return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const run=()=>openHistory(row);
 const cat=cats.find(c=>String(c.category_id)===String(row.item.category_id));
 if(parentEnabled&&(!cat||isAdult(cat.category_name))){
  if(parentHash)requestUnlock(run);else toast(tr('pinNeed'));
 }else run();
},true);
const originalSeasonRender=renderSeasonEpisodes;
renderSeasonEpisodes=function(raw){
 if(!context||context.account!==sessionPrefix())return originalSeasonRender(raw);
 const holder=document.getElementById('episodes'),groups=seasonGroups(raw);
 holder.replaceChildren();episodeMap={};
 if(!groups.length){holder.textContent=tr('noItems');return;}
 context.episodes=groups.flatMap(g=>g.items);
 const latest=historyRows().find(r=>sid(r.item)===context.id&&context.episodes.some(ep=>id(ep)===String(r.id)));
 const row=historyTarget&&context.episodes.some(ep=>id(ep)===String(historyTarget.id))?historyTarget:latest;
 const selectedId=row?String(row.id):'';
 let selected=Math.max(0,groups.findIndex(g=>g.items.some(ep=>id(ep)===selectedId)));
 const button=document.createElement('button');button.id='season-select';button.type='button';button.className='season-select';
 button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','season-options');
 const opts=document.createElement('div');opts.id='season-options';opts.className='season-options';opts.hidden=true;
 const list=document.createElement('div');list.className='season-episodes episode-stills';
 holder.append(button,opts,list);
 function choose(index,focus=false){
  const group=groups[index];if(!group)return;selected=index;episodeMap={};list.replaceChildren();
  button.textContent=langText().available+' · '+langText().season+' '+group.season+' · '+group.items.length+' '+langText().episodes+' ▾';
  button.setAttribute('aria-label',langText().available+': '+langText().season+' '+group.season);button.title=langText().selectHint;
  button.setAttribute('aria-expanded','false');opts.hidden=true;list.hidden=false;
  group.items.forEach((ep,i)=>{
   episodeMap[String(i)]=ep;
   const tile=document.createElement('button');tile.type='button';tile.className='episode episode-still-row';tile.dataset.episode=String(i);
   if(id(ep)===selectedId)tile.classList.add('episode-current');
   const art=document.createElement('span');art.className='episode-still-art';const src=imageOf(ep);
   if(src){const img=document.createElement('img');img.src=src;img.alt=langText().image;img.loading='lazy';img.decoding='async';
    img.onerror=()=>{img.remove();art.textContent='▶';art.classList.add('episode-still-fallback');};art.append(img);
   }else{art.textContent='▶';art.classList.add('episode-still-fallback');}
   const caption=document.createElement('span');caption.className='episode-still-caption';
   const title=document.createElement('strong');title.textContent='E'+String(ep.episode_num??i+1).padStart(2,'0')+' · '+String(ep.title||ep.name||langText().next);
   caption.append(title);
   const record=saved(ep,context.id);
   if(record){const status=document.createElement('small');
    status.textContent=record.finished?'✓ '+langText().watched:(record.position>5?langText().from+' '+fmtTime(record.position):'');
    if(status.textContent)caption.append(status);
    if(record.duration>0&&record.position>0){const meter=document.createElement('span');meter.className='episode-still-meter';
     const bar=document.createElement('i');bar.style.width=Math.min(100,Math.max(0,100*record.position/record.duration))+'%';
     meter.append(bar);caption.append(meter);}
   }
   tile.append(art,caption);list.append(tile);
  });
  if(focus){
   const target=[...list.querySelectorAll('[data-episode]')].find(b=>id(group.items[Number(b.dataset.episode)])===selectedId)||list.querySelector('button');
   // Focus the actual episode card and reveal it inside the scrollable list.
   // No secondary D-pad controller is installed: native/TV directional
   // navigation remains owned by the existing focus manager.
   if(target){
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
   }
  }
 }
 groups.forEach((g,i)=>{const option=document.createElement('button');option.type='button';option.className='season-option';
  option.textContent=langText().season+' '+g.season+' · '+g.items.length+' '+langText().episodes;
  option.onclick=()=>choose(i,document.body.classList.contains('asplayer-tv-dpad'));opts.append(option);});
 button.onclick=()=>{const opening=opts.hidden;opts.hidden=!opening;list.hidden=opening;
  button.setAttribute('aria-expanded',String(opening));
  if(opening&&document.body.classList.contains('asplayer-tv-dpad'))opts.children[selected]?.focus();};
 choose(selected);
 if(row){
  const ep=context.episodes.find(e=>id(e)===selectedId);
  if(ep){
   const controls=document.getElementById('detail-actions');
   const resume=document.createElement('button');resume.type='button';resume.className='primary';resume.id='series-continue-episode';
   const location=langText().season+' '+String(ep.season??groups[selected].season)+
     ' · '+langText().chapter+' '+String(ep.episode_num??(context.episodes.indexOf(ep)+1));
   resume.textContent='▶ '+(row.finished?langText().replay:langText().continue)+' · '+location+
      (row.position>5&&!row.finished?' · '+fmtTime(row.position):'');
   resume.onclick=()=>{hideModal();play(ep,'series');};controls.append(resume);
   const next=context.episodes[context.episodes.indexOf(ep)+1];
   if(row.finished&&next){const nextButton=document.createElement('button');nextButton.type='button';nextButton.className='ghost';nextButton.id='series-next-episode';
    nextButton.textContent='▶ '+langText().next;nextButton.onclick=()=>{hideModal();play(next,'series');};controls.append(nextButton);}
  }
 }
 historyTarget=null;
};
function episodeName(ep){
 if(!ep)return '';
 const season=String(ep.season??'1'),number=String(ep.episode_num??'?');
 const name=String(ep.title||ep.name||'').trim();
 return langText().season+' '+season+' · '+langText().chapter+' '+number+(name?' — '+name:'');
}
function adjacentEpisode(at,delta){
 if(!at||at.account!==sessionPrefix()||!at.queue.length)return null;
 const i=at.queue.findIndex(ep=>id(ep)===at.id);
 return i<0?null:(at.queue[i+delta]||null);
}
// One authoritative queue for both native buttons and end-of-play auto-next.
window.ASPLAYER_SERIES_STEP=direction=>{
 const delta=Number(direction)===-1?-1:Number(direction)===1?1:0;
 if(!delta||!playing||playing.account!==sessionPrefix())return false;
 const ep=adjacentEpisode(playing,delta);
 if(!ep||!id(ep))return false;
 play(ep,'series');return true;
};
const previousPlay=play;
play=function(item,mode){
 cancel();token++;
 if(mode==='series'){
  const acc=sessionPrefix(),parent=sid(item)||context?.id||'',episode=id(item);
  const queue=context?.account===acc&&context?.id===parent?context.episodes.slice():[];
  playing={id:episode,parent,account:acc,queue,serial:token,finished:false};
 } else playing=null;
 const result=previousPlay(item,mode);
 // The native bridge queues this update after playMedia, so the active
 // playback URL already identifies series vs movies on the Android UI thread.
 try{
  const at=playing,prev=adjacentEpisode(at,-1),next=adjacentEpisode(at,1);
  window.ASPLAYER?.setSeriesNavigation?.(
    at?episodeName(item):'',prev?episodeName(prev):'',next?episodeName(next):'');
 }catch(_){}
 return result;
};
const previousStop=stopPlayer;
stopPlayer=function(){
 cancel();token++;playing=null;
 try{window.ASPLAYER?.setSeriesNavigation?.('','','');}catch(_){}
 return previousStop();
};
function finish(){
 const at=playing;
 if(!enabled||!at||at.finished||at.account!==sessionPrefix())return;
 at.finished=true;
 const i=at.queue.findIndex(ep=>id(ep)===at.id),next=i<0?null:at.queue[i+1];
 if(!next||!id(next))return;
 pending=setTimeout(()=>{
  pending=null;
  if(!enabled||playing!==at||token!==at.serial||at.account!==sessionPrefix())return;
  play(next,'series');
 },850);
}
const oldEvent=window.ASPLAYER58_EVENT;
window.ASPLAYER58_EVENT=function(evt){if(typeof oldEvent==='function')oldEvent.apply(this,arguments);if(evt?.type==='ended')finish();};
document.getElementById('video')?.addEventListener('ended',finish);
// Standalone opt-out in the existing playback settings.
const setting=document.createElement('div');setting.id='series-auto-next-setting';setting.className='box setting';
const h=document.createElement('h3'),help=document.createElement('p'),choice=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span');
input.id='series-auto-next-v607';input.type='checkbox';input.checked=enabled;input.style.width='auto';input.style.minHeight='auto';
choice.append(input,name);setting.append(h,help,choice);
document.getElementById('preferred-player')?.closest('.setting')?.after(setting);
function translate(){h.textContent=langText().heading;help.textContent=langText().help;name.textContent=langText().heading;}
input.addEventListener('change',()=>{enabled=input.checked;if(!enabled)cancel();try{localStorage.setItem(KEY,String(enabled));}catch(_){}});
const oldLanguage=languageUI;
languageUI=function(){const v=oldLanguage.apply(this,arguments);translate();return v;};
translate();
const css=document.createElement('style');css.id='asplayer-series-still-css';
css.textContent=[
 '#episodes .episode-stills{display:grid;gap:9px;max-height:min(56vh,560px);overflow-y:auto;padding:5px 3px 12px}',
 '#episodes .episode-still-row{display:flex;align-items:center;gap:12px;width:100%;min-height:92px;text-align:left;padding:9px;border-radius:14px}',
 '#episodes .episode-still-art{display:grid;place-items:center;flex:0 0 clamp(100px,30%,165px);aspect-ratio:16/9;overflow:hidden;border-radius:10px;background:#10243d;border:1px solid #46718a;color:#a1deea}',
 '#episodes .episode-still-art img{width:100%;height:100%;object-fit:cover;display:block}',
 '#episodes .episode-still-caption{display:flex;flex:1;min-width:0;flex-direction:column;gap:6px}',
 '#episodes .episode-still-caption strong{overflow-wrap:anywhere;line-height:1.3}',
 '#episodes .episode-still-caption small{font-size:12px;opacity:.84}',
 '#episodes .episode-still-meter{display:block;height:4px;border-radius:10px;background:#345270;overflow:hidden}',
 '#episodes .episode-still-meter i{display:block;height:100%;background:#51e1dc}',
 '#episodes .episode-current{border-color:#46dfda}',
 '#series-auto-next-setting label{display:flex;align-items:center;gap:10px;min-height:44px}',
 // The legacy Android TV rule "body.asplayer-tv-dpad #episodes .episode"
 // forces display:block. Override it with stronger specificity so the episode
 // still never expands to the entire width and the caption stays alongside it.
 'body.asplayer-tv-dpad #episodes .episode.episode-still-row{display:flex;flex-direction:row;align-items:center;gap:14px;width:100%;min-width:0;min-height:112px;max-height:none;scroll-margin:16px;margin:8px 0;padding:10px 12px;overflow:hidden}',
 'body.asplayer-tv-dpad #episodes .episode-still-art{display:grid;flex:0 0 clamp(124px,22%,190px);width:clamp(124px,22%,190px);max-width:190px;min-width:124px;height:auto;max-height:110px;aspect-ratio:16/9;overflow:hidden}',
 'body.asplayer-tv-dpad #episodes .episode-still-art img{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:cover}',
 'body.asplayer-tv-dpad #episodes .episode-still-caption{display:flex;flex:1 1 0;min-width:0;overflow:hidden;overflow-wrap:anywhere;gap:6px}',
 'body.asplayer-tv-dpad #episodes .episode-still-caption strong{display:block;min-width:0;font-size:clamp(14px,1.5vw,19px);line-height:1.3;white-space:normal;overflow-wrap:anywhere}',
 'body.asplayer-tv-dpad #episodes .episode.episode-still-row:focus-visible{outline:4px solid #ffe189!important;outline-offset:2px;box-shadow:0 0 0 3px #102c4d,0 0 18px #5de8ff88!important}',
 'body.asplayer-tv-dpad #episodes #season-select{display:block;width:100%;min-height:58px;white-space:normal;line-height:1.25;text-align:left;padding:12px 15px;font-size:clamp(16px,1.6vw,22px)}',
 'body.asplayer-tv-dpad #episodes #season-options:not([hidden]){display:grid;grid-template-columns:minmax(0,1fr);gap:9px;max-height:34vh;overflow-y:auto;padding:7px}',
 'body.asplayer-tv-dpad #episodes #season-options .season-option{min-height:56px;text-align:left;padding:10px 14px}',
 'body.asplayer-tv-dpad #episodes .episode-still-caption small{color:#c1d5e6;font-size:clamp(12px,1.15vw,15px)}',
 'body.asplayer-tv-dpad #episodes.episodes{display:block;min-width:0;width:100%;overflow:visible}',
 'body.asplayer-tv-dpad #episodes .episode-stills{display:grid;min-width:0;max-height:min(49vh,450px);overflow-y:auto;overflow-x:hidden;gap:8px}',
 'body.asplayer-tv-dpad #details-modal .detail-art-text{min-width:0;max-width:100%}',
 'body.asplayer-tv-dpad #details-modal .dialog{overflow-x:hidden}',

 '@media(max-width:480px){#episodes .episode-still-row{gap:8px;padding:7px}#episodes .episode-still-art{flex-basis:102px}}'
].join('\n');document.head.append(css);
})();