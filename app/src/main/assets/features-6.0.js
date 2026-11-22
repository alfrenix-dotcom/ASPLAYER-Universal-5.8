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
 /* Catalog density: use viewport CSS pixels, not device type or physical DPI.
    Keep the two scroll regions and the existing remote focus targets. */
 body.asplayer-catalog-open #app-shell main{max-width:none;min-width:0}
 body.asplayer-catalog-open #app-shell .topbar{margin-bottom:7px;padding-block:7px;gap:6px}
 body.asplayer-catalog-open #app-shell .topbar h1{font-size:clamp(22px,2.3vw,31px);line-height:1.12}
 body.asplayer-catalog-open #app-shell .topbar small{font-size:10px;letter-spacing:1.2px}
 body.asplayer-catalog-open #tv-catalog-layout{grid-template-columns:minmax(103px,34%) minmax(0,1fr);gap:7px}
 body.asplayer-catalog-open #tv-category-pane{padding:4px}
 body.asplayer-catalog-open #category-tools{padding:6px 7px;margin:0 0 3px;font-size:12px;line-height:1.2}
 body.asplayer-catalog-open #categories,body.asplayer-catalog-open #categories.expanded{gap:4px;padding:4px;scroll-padding:5px}
 body.asplayer-catalog-open #categories button{min-height:44px;padding:6px 8px;line-height:1.2;font-size:13px;scroll-margin:5px}
 body.asplayer-catalog-open #tv-content-pane{padding:4px 5px 7px;scroll-padding:5px}
 body.asplayer-catalog-open #tv-content-pane .catalogtools{margin:0 0 4px;gap:5px}
 body.asplayer-catalog-open #tv-content-pane #search{min-height:40px;padding:7px 9px;font-size:14px}
 body.asplayer-catalog-open #tv-results-bar{gap:7px;margin:2px 0 5px;padding:3px 2px;scroll-margin-top:5px}
 body.asplayer-catalog-open #tv-results-title{font-size:15px;line-height:1.2}
 body.asplayer-catalog-open #tv-results-bar button{min-height:44px;padding:5px 9px;font-size:13px}
 body.asplayer-catalog-open #cards.asplayer-paged{--pager-stride:70px;--pager-gap:5px;padding:3px}
 body.asplayer-catalog-open #cards .tile{padding:0;scroll-margin:5px;border-radius:10px;min-width:0}
 body.asplayer-catalog-open #cards.asplayer-paged .tile{min-height:0;height:100%}
 body.asplayer-catalog-open #cards .cover{flex:0 0 47px;width:47px;height:100%;max-height:100%;border-radius:8px 0 0 8px}
 body.asplayer-catalog-open #cards .cover img{object-fit:contain}
 body.asplayer-catalog-open #cards .caption{padding:5px 7px;line-height:1.2;min-width:0}
 body.asplayer-catalog-open #cards .caption strong{font-size:14px;line-height:1.2;overflow-wrap:anywhere}
 body.asplayer-catalog-open #cards .caption small{font-size:11px;line-height:1.15}
 body.asplayer-catalog-open #cards .fav-tile{gap:5px}
 body.asplayer-catalog-open #cards .fav-star{flex:0 0 44px;min-width:44px;min-height:44px}
 @media(min-width:641px){
  body.asplayer-catalog-open #app-shell main{padding-inline:10px;padding-top:calc(7px + var(--glass-top,0px))}
  body.asplayer-catalog-open.asplayer-tv-dpad #app-shell main{padding-top:8px}
  body.asplayer-catalog-open #app-shell .sidebar{width:clamp(68px,7vw,104px);flex:0 0 clamp(68px,7vw,104px);padding:7px 5px;gap:4px}
  body.asplayer-catalog-open #app-shell .sidebar .brand{justify-content:center;margin:2px 0 7px}
  body.asplayer-catalog-open #app-shell .sidebar .brand-text{display:none}
  body.asplayer-catalog-open #app-shell .sidebar .nav{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:3px;min-height:50px;padding:5px 2px}
  body.asplayer-catalog-open #app-shell .sidebar .navico{margin:0;font-size:21px}
  body.asplayer-catalog-open #app-shell .sidebar .navlabel{display:block;font-size:10px;line-height:1.1;white-space:normal}
  body.asplayer-catalog-open #tv-catalog-layout{grid-template-columns:minmax(162px,25%) minmax(0,1fr);gap:10px}
  body.asplayer-catalog-open #categories button{font-size:15px}
  body.asplayer-catalog-open #category-tools{font-size:13px}
  body.asplayer-catalog-open #cards.asplayer-paged{--pager-stride:74px;--pager-gap:5px}
  body.asplayer-catalog-open #cards .cover{flex-basis:52px;width:52px}
  body.asplayer-catalog-open #cards .caption{padding-inline:10px}
  body.asplayer-catalog-open #cards .caption strong{font-size:17px}
  body.asplayer-catalog-open #cards .caption small{font-size:12px}
  body.asplayer-catalog-open #tv-results-title{font-size:17px}
  body.asplayer-catalog-open #tv-results-bar button{font-size:14px}
 }
 @media(max-width:640px){
  body.asplayer-catalog-open:not(.asplayer-tv-dpad) #app-shell .topbar{padding-top:calc(6px + var(--glass-top,0px))}
 }
 @media(min-width:1500px) and (min-height:850px){
  body.asplayer-catalog-open #cards.asplayer-paged{--pager-stride:82px;--pager-gap:6px}
  body.asplayer-catalog-open #cards .cover{flex-basis:58px;width:58px}
  body.asplayer-catalog-open #cards .caption strong{font-size:18px}
  body.asplayer-catalog-open #cards .caption small{font-size:13px}
  body.asplayer-catalog-open #categories button{min-height:48px;font-size:16px}
  body.asplayer-catalog-open #app-shell .sidebar .nav{min-height:63px}
  body.asplayer-catalog-open #app-shell .sidebar .navlabel{font-size:12px}
 }
 @media(min-width:641px) and (max-height:500px){
  body.asplayer-catalog-open #app-shell .sidebar .nav{min-height:44px;padding:3px 2px;gap:1px}
  body.asplayer-catalog-open #app-shell .topbar{padding-block:4px;margin-bottom:4px}
  body.asplayer-catalog-open #app-shell .topbar small{display:none}
  body.asplayer-catalog-open #cards.asplayer-paged{--pager-stride:62px;--pager-gap:4px}
  body.asplayer-catalog-open #cards .cover{flex-basis:43px;width:43px}
  body.asplayer-catalog-open #cards .caption strong{font-size:15px}
  body.asplayer-catalog-open #cards .caption small{font-size:11px}
  body.asplayer-catalog-open #categories button{font-size:13px}
 }
 /* The virtual row renderer owns exact heights; focus effects must not resize
    either pane or the cards. */
 body.asplayer-catalog-open #categories button:focus-visible,
 body.asplayer-catalog-open #cards button:focus-visible{outline:2px solid #8df5ef;outline-offset:-3px}
`;
document.head.append(asplayer6Style);
const asplayer6Back=window.ASPLAYER_BACK;
window.ASPLAYER_BACK=function(){const selector=document.getElementById('season-select');if(selector&&selector.getAttribute('aria-expanded')==='true'&&!document.getElementById('details-modal').classList.contains('hidden')){selector.click();selector.focus();return;}return asplayer6Back?.();};
languageUI();
