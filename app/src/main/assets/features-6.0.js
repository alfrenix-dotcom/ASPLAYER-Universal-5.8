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
 #most-watched-channels{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;max-height:none;overflow:visible}
 .most-watched-channel{min-height:66px;text-align:left;white-space:normal;overflow-wrap:anywhere}
 body.asplayer-tv-dpad #view-settings .settings-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:16px;width:100%;max-width:none}
 body.asplayer-tv-dpad #view-settings .settings-grid>.setting{grid-column:1/-1!important;width:100%;min-width:0;scroll-margin:24px}
 body.asplayer-tv-dpad #view-settings{width:100%;max-width:none}
 body.asplayer-tv-dpad.asplayer-settings-open #app-shell{height:100dvh;min-height:0;overflow:hidden}
 body.asplayer-tv-dpad.asplayer-settings-open #app-shell main{height:100%;min-height:0;max-width:none;margin:0;overflow-y:auto;overflow-x:hidden;scroll-padding:20px}
 body.asplayer-tv-dpad #view-settings button,body.asplayer-tv-dpad #view-settings select{min-height:52px}
 body.asplayer-tv-dpad .season-option,body.asplayer-tv-dpad .season-select{min-height:58px;font-size:17px;scroll-margin:12px}
 body.asplayer-tv-dpad #most-watched-channels{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
`;
document.head.append(asplayer6Style);
const asplayer6Back=window.ASPLAYER_BACK;
window.ASPLAYER_BACK=function(){const selector=document.getElementById('season-select');if(selector&&selector.getAttribute('aria-expanded')==='true'&&!document.getElementById('details-modal').classList.contains('hidden')){selector.click();selector.focus();return;}return asplayer6Back?.();};
languageUI();
