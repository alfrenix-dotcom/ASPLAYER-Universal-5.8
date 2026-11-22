/* ASPLAYER 6.0 – TV-friendly season navigation and home/settings layout. */
Object.assign(LABELS.en,{mostWatched:'Most watched channels',chooseSeason:'Choose season',episodeCount:'episodes'});
Object.assign(LABELS.es,{mostWatched:'Canales más vistos',chooseSeason:'Elegir temporada',episodeCount:'capítulos'});
function renderSeasonEpisodes(seasons){
 const holder=document.getElementById('episodes');
 const groups=Object.keys(seasons||{}).sort((a,b)=>Number(a)-Number(b)||a.localeCompare(b)).map(key=>({key,rows:(Array.isArray(seasons[key])?seasons[key]:Object.values(seasons[key]||{})).filter(e=>e&&typeof e==='object')})).filter(g=>g.rows.length);
 holder.replaceChildren();episodeMap={};
 if(!groups.length){holder.textContent=tr('noItems');return;}
 const selector=document.createElement('button'),list=document.createElement('div'),episodes=document.createElement('div');
 selector.type='button';selector.id='season-select';selector.className='season-select';selector.setAttribute('aria-expanded','false');selector.setAttribute('aria-controls','season-options');
 list.id='season-options';list.className='season-options';list.hidden=true;episodes.className='season-episodes';
 holder.append(selector,list,episodes);
 let selected=0;
 function choose(index,focus){
  selected=index;const g=groups[index];selector.textContent=tr('seasons')+' '+g.key+' · '+g.rows.length+' '+tr('episodeCount')+' ▾';selector.setAttribute('aria-expanded','false');list.hidden=true;episodes.hidden=false;episodeMap={};episodes.replaceChildren();
  for(const [i,ep] of g.rows.entries()){const b=document.createElement('button');b.type='button';b.className='episode';b.dataset.episode=String(i);episodeMap[String(i)]=ep;b.textContent='▶ '+(ep.episode_num||i+1)+' · '+(ep.title||ep.name||'Episode');episodes.append(b);}
  if(focus)episodes.querySelector('button')?.focus();
 }
 for(const [index,g] of groups.entries()){const b=document.createElement('button');b.type='button';b.className='season-option';b.textContent=tr('seasons')+' '+g.key+' · '+g.rows.length+' '+tr('episodeCount');b.onclick=()=>choose(index,document.body.classList.contains('asplayer-tv-dpad'));list.append(b);}
 selector.onclick=()=>{const open=list.hidden;list.hidden=!open;episodes.hidden=open;selector.setAttribute('aria-expanded',String(open));if(open&&document.body.classList.contains('asplayer-tv-dpad'))list.children[selected]?.focus();};
 choose(0,false);
}
const asplayer6Style=document.createElement('style');
asplayer6Style.textContent=`
 .season-select{display:block;width:100%;text-align:left;min-height:52px;margin:10px 0;color:var(--txt);font-weight:700;background:#155674;border:1px solid #478eaa;border-radius:14px}
 .season-options:not([hidden]){display:grid;grid-template-columns:1fr;gap:5px;max-height:240px;overflow:auto;padding:8px;border-radius:14px;background:#101d31;margin-bottom:10px}
 .season-option{width:100%;text-align:left;min-height:48px}
 #most-watched-channels{display:flex;flex-wrap:nowrap;gap:12px;overflow-x:auto;overflow-y:hidden;min-height:0;padding:7px 5px 13px;scroll-snap-type:x mandatory;scroll-padding-inline:5px;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
 #most-watched-channels .most-watched-channel{display:flex;flex:0 0 clamp(146px,40vw,190px);flex-direction:column;min-width:0;min-height:0;padding:0;scroll-snap-align:start;scroll-margin-inline:5px;border:1px solid #527294;border-radius:19px;overflow:hidden;text-align:left;background:#17233b;color:var(--txt);box-shadow:0 5px 14px #02051455}
 #most-watched-channels .channel-logo-frame{position:relative;width:100%;aspect-ratio:16/10;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse at 22% 12%,#618eae30,transparent 63%),linear-gradient(145deg,#182b4590,#291e4690);border-bottom:1px solid #a6c4e525}
 #most-watched-channels .channel-logo-frame img{display:block;width:100%;height:100%;padding:12px;object-fit:contain;position:absolute;inset:0;opacity:0}
 #most-watched-channels .channel-logo-ready .channel-logo-frame img{opacity:1}
 #most-watched-channels .channel-logo-fallback{display:grid;place-items:center;width:55px;height:40px;border:2px solid #b0d7f3a0;border-radius:9px;color:#b8e3ff;font-size:23px;box-shadow:0 0 18px #61cbd42b}
 #most-watched-channels [hidden]{display:none!important}
 #most-watched-channels .most-watched-channel strong{font-size:13px;line-height:1.25;padding:10px 11px 12px;white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;width:100%;min-height:44px}
 body[data-glass-effective]:not([data-glass-effective=off]) #most-watched-channels .most-watched-channel{background:var(--glass-surface);border-color:var(--glass-border);box-shadow:var(--glass-highlight)}
 body[data-glass-effective]:not([data-glass-effective=off]) #most-watched-channels .channel-logo-frame{background:radial-gradient(ellipse at 16% 0%,#86d7f42b,transparent 64%),linear-gradient(145deg,#5987ad20,#29244642)}
 body[data-glass-effective=off] #most-watched-channels .most-watched-channel{background:#121e34;border-color:#465875;box-shadow:none}
 body[data-glass-effective=off] #most-watched-channels .channel-logo-frame{background:#1a2841}
 #most-watched-channels .most-watched-channel:focus-visible{border-color:#8df5ef;box-shadow:0 0 0 3px #58dedc,0 0 18px #43dcff55;outline:none}
 #view-settings .settings-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:16px;width:100%;max-width:none}
 #view-settings .settings-grid>.setting{grid-column:1/-1!important;width:100%;min-width:0;scroll-margin:24px}
 #view-settings{width:100%;max-width:none}
 #view-settings .setting .actions{justify-content:flex-start;align-items:center}
 #view-settings .setting .actions>button{flex:0 1 auto;width:auto;max-width:100%}
 #view-settings .setting :is(select,input:not([type=checkbox]):not([type=radio]),.glass-slider-label,.glass-preview-stage){max-width:36rem}
 #view-settings .setting :is(select,input:not([type=checkbox]):not([type=radio])){display:block}
 body.asplayer-tv-dpad.asplayer-settings-open #app-shell{height:100dvh;min-height:0;overflow:hidden}
 body.asplayer-tv-dpad.asplayer-settings-open #app-shell main{height:100%;min-height:0;max-width:none;margin:0;overflow-y:auto;overflow-x:hidden;scroll-padding:20px}
 body.asplayer-tv-dpad #view-settings button,body.asplayer-tv-dpad #view-settings select{min-height:52px}
 body.asplayer-tv-dpad .season-option,body.asplayer-tv-dpad .season-select{min-height:58px;font-size:17px;scroll-margin:12px}
 body.asplayer-tv-dpad #most-watched-channels .most-watched-channel{flex-basis:196px}
 body.asplayer-tv-dpad #most-watched-channels .most-watched-channel strong{font-size:15px;min-height:48px}
`;
document.head.append(asplayer6Style);
const asplayer6Back=window.ASPLAYER_BACK;
window.ASPLAYER_BACK=function(){const selector=document.getElementById('season-select');if(selector&&selector.getAttribute('aria-expanded')==='true'&&!document.getElementById('details-modal').classList.contains('hidden')){selector.click();selector.focus();return;}return asplayer6Back?.();};
languageUI();
