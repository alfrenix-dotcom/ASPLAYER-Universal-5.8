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
 body.asplayer-catalog-open #app-shell .topbar,
 body.asplayer-catalog-open[data-glass-effective] #app-shell .topbar{margin-bottom:7px;padding-block:7px;gap:6px}
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
 body.asplayer-catalog-open #cards.asplayer-paged > .asplayer-page-row{min-height:0;height:calc(var(--pager-stride) - var(--pager-gap))}
 body.asplayer-catalog-open #cards.asplayer-paged .fav-tile .tile{min-height:0;height:100%}
 body.asplayer-catalog-open #cards .cover{flex:0 0 47px;width:47px;height:100%;max-height:100%;border-radius:8px 0 0 8px}
 body.asplayer-catalog-open #cards .cover img{object-fit:contain}
 body.asplayer-catalog-open #cards .caption{padding:5px 7px;line-height:1.2;min-width:0}
 body.asplayer-catalog-open #cards .caption strong{font-size:14px;line-height:1.2;overflow-wrap:anywhere}
 body.asplayer-catalog-open #cards .caption small{font-size:11px;line-height:1.15}
 body.asplayer-catalog-open #cards .fav-tile{gap:5px}
 body.asplayer-catalog-open #cards .fav-star{flex:0 0 44px;min-width:44px;min-height:44px}
 @media(min-width:641px){
  body.asplayer-catalog-open #app-shell main,
  body.asplayer-catalog-open:not(.asplayer-tv-dpad)[data-glass-effective] #app-shell main{padding-inline:10px;padding-top:calc(7px + var(--glass-top,0px))}
  body.asplayer-catalog-open.asplayer-tv-dpad #app-shell main{padding-top:8px}
  body.asplayer-catalog-open #app-shell .sidebar{width:clamp(68px,7vw,104px);flex:0 0 clamp(68px,7vw,104px);padding:7px 5px;gap:4px}
  body.asplayer-catalog-open #app-shell .sidebar .brand{justify-content:center;margin:2px 0 7px}
  body.asplayer-catalog-open #app-shell .sidebar .brand-text{display:none}
  body.asplayer-catalog-open #app-shell .sidebar .nav{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:3px;min-height:50px;padding:5px 2px}
  body.asplayer-catalog-open #app-shell .sidebar .navico{margin:0;font-size:21px}
  body.asplayer-catalog-open #app-shell .sidebar .navlabel{display:block;font-size:10px;line-height:1.1;white-space:normal}
  body.asplayer-catalog-open #tv-catalog-layout{grid-template-columns:minmax(162px,25%) minmax(0,1fr);gap:10px}
  body.asplayer-catalog-open #tv-content-pane .catalogtools{flex-wrap:nowrap;gap:8px}
  body.asplayer-catalog-open #tv-content-pane #search{flex:1 1 0;width:auto;min-width:0}
  body.asplayer-catalog-open #tv-content-pane #count{flex:none;white-space:nowrap;font-size:12px}
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
  body.asplayer-catalog-open:not(.asplayer-tv-dpad)[data-glass-effective] #app-shell .topbar{padding-top:calc(6px + var(--glass-top,0px))}
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
  body.asplayer-catalog-open[data-glass-effective] #app-shell .topbar{padding-block:3px;margin-bottom:4px}
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
 body.asplayer-catalog-open #categories button.asplayer-593-focus:focus,
 body.asplayer-catalog-open #cards button.asplayer-593-focus:focus{outline:3px solid #f8d873!important;outline-offset:-3px!important;box-shadow:0 0 0 2px #26dcf980!important}

 /* 6.0.4: the Home viewport follows the same adaptive geometry as catalogs.
    Settings keeps a single focus path and an independent scroll container. */
 .asplayer-home-tools{display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap}
 .asplayer-home-refresh{display:none}
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell{
   height:100vh;height:100dvh;min-height:0;overflow:hidden
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar{
   width:clamp(68px,7vw,104px);flex:0 0 clamp(68px,7vw,104px);
   height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain;
   padding:7px 5px;gap:4px
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .brand{
   justify-content:center;margin:2px 0 7px
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .brand-text{display:none}
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .nav{
   display:flex;flex-direction:column;align-items:center;justify-content:center;
   text-align:center;gap:3px;min-height:50px;padding:5px 2px
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .navico{
   margin:0;font-size:21px
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .navlabel{
   display:block;font-size:10px;line-height:1.1;white-space:normal
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell main{
   flex:1;min-width:0;min-height:0;height:100%;max-width:none;margin:0;
   overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;
   scroll-padding-block:14px;padding:8px clamp(8px,1.3vw,24px) 22px
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .topbar{
   margin-bottom:9px;padding:7px 12px;border:1px solid #5b9ec4;
   border-radius:17px;background:linear-gradient(110deg,#193154,#155788);
   min-height:58px;flex-wrap:nowrap;gap:10px
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .topbar h1{
   font-size:clamp(19px,2.3vw,31px);line-height:1.1
 }
 body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .topbar small{
   font-size:10px;letter-spacing:1px
 }
 body.asplayer-tv-dpad.asplayer-home-open .asplayer-home-tools{display:flex}
 body.asplayer-tv-dpad.asplayer-home-open .asplayer-home-refresh{display:block;min-height:44px;padding:8px 13px}
 body.asplayer-tv-dpad.asplayer-home-open #refresh-home{display:none}
 body.asplayer-tv-dpad.asplayer-home-open #view-home{min-width:0;padding-bottom:14px}
 body.asplayer-tv-dpad.asplayer-home-open #view-home .account-summary{
   padding:8px 13px;margin:0 0 9px;gap:8px;min-height:38px;
   border-color:#426a8d
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .account-summary span{
   font-size:11px;padding:3px 7px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .hero{
   min-height:0;padding:12px clamp(12px,2vw,24px);margin:0 0 13px;
   border:1px solid #508bb4;border-radius:15px;
   background:linear-gradient(110deg,#241c48,#174b74)
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .hero h2{
   font-size:clamp(19px,2.5vw,33px);line-height:1.12;margin:0 0 6px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .hero p{
   font-size:clamp(11px,1.15vw,14px);line-height:1.3;margin:0 0 6px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .hero .eyebrow{font-size:10px}
 body.asplayer-tv-dpad.asplayer-home-open #view-home .hero-logo{
   float:right;width:clamp(56px,10vw,118px);max-height:105px;margin:0 0 0 10px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .hero .chips{
   margin:5px 0 0;gap:5px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .hero .chip{
   font-size:10px;padding:4px 9px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .sectionhead{
   margin:12px 0 6px;gap:6px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .sectionhead h2{
   font-size:clamp(16px,1.55vw,22px);line-height:1.2
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .posters{
   min-height:0;min-width:0;max-width:100%;gap:8px;padding:6px 12px 12px;
   overflow-x:auto;overflow-y:hidden;
   scroll-behavior:smooth;scroll-padding-inline:12px;
   scroll-snap-type:x proximity;overscroll-behavior-x:contain
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .posters > button{
   scroll-snap-align:start;scroll-margin-inline:12px;flex-shrink:0
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .posters .poster{
   flex:0 0 clamp(110px,11vw,168px);border-radius:12px;min-width:0
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .posters .poster img{
   object-fit:contain;max-width:100%
 }
 body.asplayer-tv-dpad.asplayer-home-open #most-watched-channels .most-watched-channel{
   flex:0 0 clamp(146px,18vw,225px);min-height:0
 }
 body.asplayer-tv-dpad.asplayer-home-open #most-watched-channels .channel-logo-frame{
   aspect-ratio:16/7
 }
 body.asplayer-tv-dpad.asplayer-home-open #most-watched-channels .most-watched-channel strong{
   min-height:0;padding:7px 9px;font-size:clamp(11px,1.05vw,15px)
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .contact-priority{
   margin:16px 0 5px!important;padding:10px 14px!important;
   border-radius:12px;gap:5px 12px!important
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .contact-priority strong{
   font-size:13px
 }
 body.asplayer-tv-dpad.asplayer-home-open #view-home .contact-priority .contact-info{
   font-size:12px
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings{
   max-width:1100px;margin:0 auto
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .sectionhead{
   margin:5px 0 10px
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .settings-grid{
   display:grid!important;grid-template-columns:minmax(0,1fr)!important;
   gap:10px
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .settings-grid>.setting{
   min-width:0;width:100%;padding:clamp(13px,1.7vw,22px);
   border:1px solid #456787;border-radius:15px;
   background:linear-gradient(130deg,#142440,#111c35)
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting:focus-within{
   border-color:#59deda;background:linear-gradient(130deg,#183250,#102c45)
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting h3{
   font-size:clamp(16px,1.5vw,21px);line-height:1.25;
   margin:0 0 6px;color:#d8f4ff
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting p{
   margin:5px 0 9px
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting :is(button,select,input,a[href]){
   min-height:46px;scroll-margin:15px
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting :is(select,input:not([type=checkbox]):not([type=radio])){
   width:min(100%,40rem);max-width:100%
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting .actions{
   display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-start
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting .actions>button{
   flex:0 1 auto;min-width:min(160px,100%);min-height:48px
 }
 body.asplayer-tv-dpad.asplayer-settings-open #view-settings .setting label:has(:focus-visible){
   border-radius:8px;outline:2px solid #f8d873;outline-offset:3px
 }
 @media(min-width:1500px) and (min-height:850px){
   body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .nav{min-height:62px}
   body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .navlabel{font-size:12px}
   body.asplayer-tv-dpad.asplayer-home-open #view-home .posters .poster{flex-basis:clamp(160px,12vw,235px)}
   body.asplayer-tv-dpad.asplayer-home-open #most-watched-channels .most-watched-channel{flex-basis:clamp(190px,19vw,290px)}
 }
 @media(min-width:641px) and (max-height:500px){
   body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .sidebar .nav{min-height:43px;padding:3px 2px;gap:1px}
   body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .topbar{padding-block:4px;min-height:49px;margin-bottom:6px}
   body.asplayer-tv-dpad:is(.asplayer-home-open,.asplayer-settings-open) #app-shell .topbar small{display:none}
   body.asplayer-tv-dpad.asplayer-home-open #view-home .hero{padding:8px 13px;margin-bottom:7px}
   body.asplayer-tv-dpad.asplayer-home-open #view-home .hero-logo{width:64px;max-height:60px}
   body.asplayer-tv-dpad.asplayer-home-open #view-home .sectionhead{margin:9px 0 4px}
   body.asplayer-tv-dpad.asplayer-home-open #most-watched-channels .channel-logo-frame{aspect-ratio:16/6}
   body.asplayer-tv-dpad.asplayer-settings-open #view-settings .settings-grid{gap:7px}
 }
 /* Phone landscape/tablet remain touch-first and scale card widths. */
 @media(min-width:641px){
   body.asplayer-home-open:not(.asplayer-tv-dpad) #view-home .posters .poster{
     flex-basis:clamp(135px,16vw,210px)
   }
 }
 @media(max-width:640px){
   body.asplayer-home-open:not(.asplayer-tv-dpad) #view-home .hero{
     padding:18px 15px;border-radius:14px
   }
   body.asplayer-home-open:not(.asplayer-tv-dpad) #view-home .account-summary{
     gap:6px;margin-bottom:10px
   }
 }

`;
document.head.append(asplayer6Style);

/* Home's compact refresh is part of the header, not the movie section.
   Reuse the existing refresh handler, do not duplicate network logic. */
const asplayerHome=document.getElementById('view-home');
const asplayerContact=asplayerHome?.querySelector('.contact-priority');
if(asplayerHome&&asplayerContact)asplayerHome.append(asplayerContact);
const asplayerTopbar=document.querySelector('#app-shell .topbar');
if(asplayerTopbar&&!document.getElementById('asplayer-home-refresh')){
  const tools=document.createElement('div');tools.className='asplayer-home-tools';
  const pill=asplayerTopbar.querySelector('.pill');
  if(pill)tools.append(pill);
  const refresh=document.createElement('button');
  refresh.type='button';refresh.id='asplayer-home-refresh';
  refresh.className='ghost asplayer-home-refresh';refresh.dataset.i18n='refresh';
  refresh.textContent=tr('refresh');
  refresh.addEventListener('click',()=>document.getElementById('refresh-home')?.click());
  tools.append(refresh);asplayerTopbar.append(tools);
}
// Body modes reflect the visible tab, not window dimensions.  This preserves
// phone touch behavior while giving each TV screen its own viewport layout.
function asplayerUpdateViewportMode(){
  const shell=document.getElementById('app-shell');
  const ready=shell&&!shell.classList.contains('hidden');
  const home=ready&&!document.getElementById('view-home').classList.contains('hidden');
  const settings=ready&&!document.getElementById('view-settings').classList.contains('hidden');
  document.body.classList.toggle('asplayer-home-open',Boolean(home));
  document.body.classList.toggle('asplayer-settings-open',Boolean(settings));
}
const asplayerShowTab6=showTab;
showTab=function(tab){
  const value=asplayerShowTab6.apply(this,arguments);
  asplayerUpdateViewportMode();
  return value;
};
asplayerUpdateViewportMode();

const asplayer6Back=window.ASPLAYER_BACK;
window.ASPLAYER_BACK=function(){const selector=document.getElementById('season-select');if(selector&&selector.getAttribute('aria-expanded')==='true'&&!document.getElementById('details-modal').classList.contains('hidden')){selector.click();selector.focus();return;}return asplayer6Back?.();};
languageUI();
