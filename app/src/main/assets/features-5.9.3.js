/* ASPLAYER 5.9.7: independent UI update layer, no credentials. */
(function(){
'use strict';
const bridge=window.ASPLAYER||{};
const t=(es,en)=>(typeof lang!=='undefined' && lang==='es')?es:en;
const storeKey='asplayer:video:enhancement:593';
const vpnKey='asplayer:vpn:warp-enabled:v593';
const focusable='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const css=document.createElement('style');
css.textContent=`
  .asplayer-593-focus:focus-visible, .asplayer-593-focus:focus {
    outline:4px solid #f8d873 !important; outline-offset:3px !important;
    box-shadow:0 0 0 3px #14364b,0 0 25px #26dcf9aa !important;
    position:relative; z-index:5;
  }
  @media (min-width:800px) {
    .asplayer-593-focus {scroll-margin:40px;}
    button,select{min-height:52px;}
  }
  #asplayer-593-options {margin:18px 0 8px;padding:17px;border:1px solid #425d78;
    border-radius:14px;background:#0c192f;}
  #asplayer-593-options label{margin-top:10px;}
  #asplayer-593-options select{width:100%;max-width:560px;}
  #asplayer-593-options p{font-size:12px;color:#adc9da;line-height:1.55;}
  .asplayer-593-button {display:block;margin-top:10px;max-width:440px;}
`;
document.head.appendChild(css);

// Android TV and keyboard input use one focus controller.
let remote = false, modal = null, opener = null, waitingEpisode = false;
let locked = [], lastDpadAt = 0, lastTrigger = null, redirecting = false;
try { remote = bridge.isAndroidTv() === true; } catch (_) {}
remote = remote || !!window.AndroidTVNavigation || /Android TV|Google TV|AFT[A-Z]/i.test(navigator.userAgent);
const arrows = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
const overlaySelector = '.modal:not(.hidden),.playeroverlay:not(.hidden)';
const tvStyle = document.createElement('style');
tvStyle.textContent = `
  body.asplayer-tv-dialog {overflow:hidden!important}
  body.asplayer-tv-dpad .modal {background:rgba(4,8,20,.94)}
  body.asplayer-tv-dpad #details-modal .dialog {
    width:min(86vw,1050px);max-width:86vw;max-height:88vh;
    overflow-y:auto;padding:clamp(22px,3vw,42px);
  }
  body.asplayer-tv-dpad #detail-actions .primary {
    min-width:220px;min-height:64px;font-size:clamp(18px,2vw,26px);
  }
  body.asplayer-tv-dpad #episodes .episode {
    display:block;width:100%;min-height:58px;text-align:left;margin:8px 0;
  }
  body.asplayer-tv-dpad .modal button:focus {
    outline:4px solid #ffe189!important;outline-offset:4px!important;
    box-shadow:0 0 0 3px #102c4d,0 0 22px #5de8ffaa!important;
  }
`;
document.head.appendChild(tvStyle);
function visible(el){
  if(!el || !el.isConnected || el.closest('.hidden,[hidden],[inert],[aria-hidden="true"]'))return false;
  if(el.matches(':disabled') || el.tabIndex<0)return false;
  const st=getComputedStyle(el), r=el.getBoundingClientRect();
  return st.visibility!=='hidden' && st.display!=='none' && r.width>=3 && r.height>=3;
}
function choices(scope=document){
  return Array.from(scope.querySelectorAll(focusable)).filter(visible);
}
function focusElement(el){
  if(!visible(el))return false;
  try{el.focus({preventScroll:true});}catch(_){el.focus();}
  if(document.activeElement!==el)return false;
  el.classList.add('asplayer-593-focus');
  const pane=remote&&document.body.classList.contains('asplayer-catalog-open')
    ?el.closest('#categories,#tv-content-pane,.sidebar'):null;
  if(pane)scrollInPane(el,pane,false);
  else el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  return true;
}
function scrollInPane(el,pane,alignTop){
  if(!el||!pane)return;
  const bounds=pane.getBoundingClientRect(),rect=el.getBoundingClientRect();
  const gap=10,top=rect.top-bounds.top-gap,bottom=rect.bottom-bounds.bottom+gap;
  if(alignTop||top<0)pane.scrollTop+=top;
  else if(bottom>0)pane.scrollTop+=bottom;
}
function shownOverlay(){
  return Array.from(document.querySelectorAll(overlaySelector)).filter(el=>el.getBoundingClientRect().width>0).pop()||null;
}
function unlockBackground(){
  for(const el of locked)el.removeAttribute('inert');
  locked=[];
}
function lockBackground(scope){
  // Overlay nodes are siblings of the main shell. Lock every sibling branch
  // up to body, leaving only the active overlay and its descendants active.
  for(let node=scope;node && node!==document.body;node=node.parentElement){
    for(const sibling of node.parentElement.children){
      if(sibling!==node && !sibling.hasAttribute('inert') &&
         !['SCRIPT','STYLE','LINK'].includes(sibling.tagName)){
        sibling.setAttribute('inert','');locked.push(sibling);
      }
    }
  }
}
function preferred(scope){
  if(scope.id==='details-modal')
    return scope.querySelector('#detail-actions button:not(:disabled),#episodes button[data-episode]:not(:disabled)')||scope.querySelector('#detail-close');
  if(scope.id==='parent-modal')return scope.querySelector('#unlock-pin');
  if(scope.id==='player-choice')return scope.querySelector('#choose-modern');
  if(scope.id==='modern-player')return scope.querySelector('#player-toggle');
  return choices(scope)[0];
}
function syncScope(){
  if(!remote)return;
  document.body.classList.add('asplayer-tv-dpad');
  const next=shownOverlay();
  if(next!==modal){
    const prev=modal;
    unlockBackground();
    if(prev)prev.removeAttribute('aria-modal');
    if(next&&!prev){
      const focused=document.activeElement;
      opener=focused && focused!==document.body && !next.contains(focused)?focused:lastTrigger;
    }
    modal=next; waitingEpisode=false;
    document.body.classList.toggle('asplayer-tv-dialog',!!modal);
    if(modal){
      if(modal.matches('.modal')){
        modal.setAttribute('role','dialog');
        modal.setAttribute('aria-modal','true');
        if(modal.id==='details-modal')modal.setAttribute('aria-labelledby','detail-title');
      }
      lockBackground(modal);
      const target=preferred(modal);
      waitingEpisode=modal.id==='details-modal' && target?.id==='detail-close';
      focusElement(target)||focusElement(choices(modal)[0]);
    }else if(prev){
      const restore=opener;opener=null;lastTrigger=null;
      focusElement(restore)||focusElement(choices()[0]);
    }
  }
  if(modal){
    // Series episodes arrive asynchronously; select first episode on arrival
    // only if the viewer hasn't deliberately moved or activated a control.
    const ready=modal.querySelector('#episodes button[data-episode]');
    if(waitingEpisode&&ready){waitingEpisode=false;focusElement(ready);}
    if(!modal.contains(document.activeElement)||!visible(document.activeElement)){
      focusElement(preferred(modal))||focusElement(choices(modal)[0]);
    }
  }
}
function enableRemote(){if(!remote)remote=true;syncScope();}
if(remote)enableRemote();
// Observe only overlay state/content, not catalog refreshes or focus styling.
const observer=new MutationObserver(records=>{
  if(!remote)return;
  if(records.some(r=>r.type==='attributes'&&r.target.matches('.modal,.playeroverlay') ||
      r.type==='childList'&&r.target.closest('.modal,.playeroverlay')))syncScope();
});
observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('click',e=>{
  if(remote&&!shownOverlay()){
    const el=e.target.closest(focusable);
    if(el)lastTrigger=el;
  }
},true);
document.addEventListener('focusin',e=>{
  if(!remote)return;
  if(modal&&!modal.contains(e.target)&&!redirecting){
    redirecting=true;focusElement(preferred(modal))||focusElement(choices(modal)[0]);redirecting=false;
    return;
  }
  if(e.target.matches?.(focusable))e.target.classList.add('asplayer-593-focus');
},true);
function navigate(direction){
  // Never fall back to the document if an overlay is active, even at edges.
  const available=choices(modal||document);
  if(!available.length)return;
  const current=document.activeElement;
  if(!available.includes(current)){focusElement(preferred(modal||document))||focusElement(available[0]);return;}
  const r=current.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const [x,y]=arrows[direction];
  let best=null,score=Infinity;
  for(const el of available){
    if(el===current)continue;
    const b=el.getBoundingClientRect(),dx=b.left+b.width/2-cx,dy=b.top+b.height/2-cy;
    const ahead=dx*x+dy*y,side=Math.abs(dx*y-dy*x);
    if(ahead<=5)continue;
    const cost=ahead+side*2.6;
    if(cost<score){score=cost;best=el;}
  }
  if(best)focusElement(best);
}
function consume(e){e.preventDefault();e.stopImmediatePropagation();}
document.addEventListener('keydown',e=>{
  if(remote&&!shownOverlay()&&catalogTabs.includes(active)&&
     ['Escape','Backspace'].includes(e.key)&&
     (cards.contains(document.activeElement)||resultBar.contains(document.activeElement))){
    consume(e);goCategories();return;
  }
  const arrow=Object.prototype.hasOwnProperty.call(arrows,e.key);
  const ok=['Enter','Accept','Select',' '].includes(e.key);
  if(arrow||e.key==='Tab')pendingCategory=null;
  if(!arrow&&!ok&&e.key!=='Tab')return;
  if(!remote&&!arrow)return; // touch-only mobile remains unchanged
  enableRemote();
  const a=document.activeElement,tag=a?.tagName;
  if(modal && (arrow||ok||e.key==='Tab'))waitingEpisode=false;
  if(e.key==='Tab'&&modal){
    consume(e);const list=choices(modal);
    if(list.length)focusElement(list[(list.indexOf(a)+(e.shiftKey?-1:1)+list.length)%list.length]);
    return;
  }
  if(ok&&modal&&a?.matches('button,input[type="button"],input[type="submit"],a[href]')){
    consume(e);if(!e.repeat)a.click();return;
  }
  if(!arrow)return;
  const horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight';
  // Allow native text editing, dropdown choices and timeline adjustment.
  if(tag==='TEXTAREA'||a?.isContentEditable||
     (tag==='SELECT'&&!horizontal)||
     (tag==='INPUT'&&(/^(text|search|password|email|url|tel|number|range)$/.test(a.type))&&horizontal))return;
  consume(e);
  if(e.repeat&&Date.now()-lastDpadAt<90)return;
  lastDpadAt=Date.now();
  if(!catalogDirection(e.key))navigate(e.key);
},true);


// Category selection is a two-stage TV interaction: move to the results
// while the request runs, then focus the first real item when it arrives.
const resultBar=document.createElement('div');
resultBar.id='tv-results-bar';
resultBar.innerHTML='<button type="button" class="ghost" id="tv-back-categories"></button><strong id="tv-results-title"></strong>';
const cards=document.getElementById('cards');
cards.before(resultBar);
const backCats=resultBar.querySelector('button');
const categoryList=document.getElementById('categories');
const catTools=document.getElementById('category-tools');
const layout=document.createElement('div');layout.id='tv-catalog-layout';
catTools.before(layout);
const categoryPane=document.createElement('div');categoryPane.id='tv-category-pane';
const contentPane=document.createElement('div');contentPane.id='tv-content-pane';
layout.append(categoryPane,contentPane);
categoryPane.append(catTools,categoryList);
contentPane.append(document.querySelector('.catalogtools'));
const globalStatus=document.getElementById('all-global-status');
if(globalStatus)contentPane.append(globalStatus);
contentPane.append(resultBar,cards,document.getElementById('loadmore'));
let pendingCategory=null, defaultCategorySelection=false;
const catalogTabs=['live','vod','series'];
const categoryStyle=document.createElement('style');
categoryStyle.textContent=`
  #tv-catalog-layout,#tv-category-pane,#tv-content-pane{display:contents}
  #tv-results-bar{display:none}
  body.asplayer-tv-dpad main{margin:0 auto;padding-bottom:22px}
  body.asplayer-tv-dpad #view-catalog .sectionhead{margin:8px 0 14px}
  body.asplayer-tv-dpad #view-catalog .fav-preview{display:none}
  body.asplayer-tv-dpad #tv-catalog-layout{display:grid;grid-template-columns:minmax(155px,30%) minmax(0,1fr);gap:18px;align-items:start}
  body.asplayer-tv-dpad #tv-category-pane{display:flex;flex-direction:column;min-width:0;max-height:calc(100vh - 135px);border:1px solid #39516b;border-radius:14px;background:#101b31;padding:6px}
  body.asplayer-tv-dpad #tv-content-pane{display:block;min-width:0;max-height:calc(100vh - 135px);overflow-y:auto;overflow-x:hidden;padding:7px 12px 18px 7px;scrollbar-width:thin}
  body.asplayer-tv-dpad #category-tools{flex:none;margin:0 0 6px;padding:12px 8px}
  body.asplayer-tv-dpad #category-expand{display:none!important}
  body.asplayer-tv-dpad #categories,body.asplayer-tv-dpad #categories.expanded{display:flex;flex-direction:column;flex-wrap:nowrap;flex:1;min-height:0;max-height:none;overflow-y:auto;overflow-x:hidden;gap:7px;padding:7px}
  body.asplayer-tv-dpad #categories button{flex:none;width:100%;text-align:left;white-space:normal;min-height:46px;font-size:15px;line-height:1.2;padding:11px;scroll-margin:8px}
  body.asplayer-tv-dpad #categories button.active{background:#12637d;color:white}
  body.asplayer-tv-dpad #tv-results-bar{display:flex;align-items:center;gap:20px;margin:18px 0 14px;padding:8px 4px;scroll-margin-top:18px}
  body.asplayer-tv-dpad #tv-results-bar button{min-height:52px;font-size:16px}
  body.asplayer-tv-dpad #tv-results-title{font-size:20px}
  body.asplayer-tv-dpad #cards{display:flex;flex-direction:column;gap:9px;padding:5px}
  body.asplayer-tv-dpad #cards .tile{display:flex;align-items:center;width:100%;min-height:78px;scroll-margin:12px;background:#111f38}
  body.asplayer-tv-dpad #cards .cover{flex:0 0 92px;width:92px;height:78px;border-radius:10px 0 0 10px;overflow:hidden}
  body.asplayer-tv-dpad #cards .cover img{width:100%;height:100%;object-fit:contain}
  body.asplayer-tv-dpad #cards .caption{flex:1;min-width:0;white-space:normal;padding:9px 14px}
  body.asplayer-tv-dpad #cards .caption strong{font-size:18px;display:block;white-space:normal}
  body.asplayer-tv-dpad #cards .fav-tile{display:flex;flex-direction:row;gap:8px;align-items:center;min-width:0}
  body.asplayer-tv-dpad #cards .fav-tile .tile{flex:1;min-width:0}
  body.asplayer-tv-dpad #cards .fav-star{position:static;flex:0 0 56px;min-height:54px}

  body:not(.asplayer-tv-dpad) #view-catalog .sectionhead{margin:12px 0 10px}
  body:not(.asplayer-tv-dpad) #view-catalog .fav-preview{display:none}
  body:not(.asplayer-tv-dpad) #tv-catalog-layout{display:grid;grid-template-columns:minmax(108px,34%) minmax(0,1fr);gap:10px;align-items:start}
  body:not(.asplayer-tv-dpad) #tv-category-pane{display:flex;flex-direction:column;min-width:0;height:calc(100vh - 140px);height:calc(100dvh - 140px);min-height:150px;border:1px solid #39516b;border-radius:12px;background:#101b31;padding:4px}
  body:not(.asplayer-tv-dpad) #tv-content-pane{display:block;min-width:0;height:calc(100vh - 140px);height:calc(100dvh - 140px);min-height:150px;overflow-y:auto;overflow-x:hidden;padding:3px 5px 12px;scrollbar-width:thin;overscroll-behavior:contain}
  body:not(.asplayer-tv-dpad) #category-tools{flex:none;margin:0 0 4px;padding:8px 5px;font-size:11px}
  body:not(.asplayer-tv-dpad) #category-expand{display:none!important}
  body:not(.asplayer-tv-dpad) #categories,body:not(.asplayer-tv-dpad) #categories.expanded{display:flex;flex-direction:column;flex-wrap:nowrap;flex:1;min-height:0;max-height:none;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;gap:5px;padding:4px}
  body:not(.asplayer-tv-dpad) #categories button{flex:none;width:100%;text-align:left;white-space:normal;overflow-wrap:anywhere;min-height:44px;font-size:13px;line-height:1.25;padding:8px}
  body:not(.asplayer-tv-dpad) #categories button.active{background:#12637d;color:white}
  body:not(.asplayer-tv-dpad) #tv-content-pane .catalogtools{margin:0 0 6px;gap:4px}
  body:not(.asplayer-tv-dpad) #tv-content-pane #search{width:100%;min-width:0;padding:9px 8px;font-size:14px}
  body:not(.asplayer-tv-dpad) #tv-results-bar{display:flex;align-items:center;margin:4px 0 9px;padding:6px 2px;border-bottom:1px solid #39516b}
  body:not(.asplayer-tv-dpad) #tv-back-categories{display:none}
  body:not(.asplayer-tv-dpad) #tv-results-title{font-size:15px;overflow-wrap:anywhere}
  body:not(.asplayer-tv-dpad) #cards{display:flex;flex-direction:column;gap:7px;padding:2px}
  body:not(.asplayer-tv-dpad) #cards .tile{display:flex;align-items:center;width:100%;min-height:65px;background:#111f38}
  body:not(.asplayer-tv-dpad) #cards .cover{flex:0 0 58px;width:58px;height:65px;overflow:hidden;border-radius:8px 0 0 8px;font-size:21px}
  body:not(.asplayer-tv-dpad) #cards .cover img{width:100%;height:100%;object-fit:contain}
  body:not(.asplayer-tv-dpad) #cards .caption{flex:1;min-width:0;padding:7px 6px;white-space:normal;overflow-wrap:anywhere}
  body:not(.asplayer-tv-dpad) #cards .caption strong{font-size:13px;display:block;white-space:normal}
  body:not(.asplayer-tv-dpad) #cards .caption small{font-size:10px}
  body:not(.asplayer-tv-dpad) #cards .fav-tile{display:flex;flex-direction:row;align-items:center;gap:4px;min-width:0}
  body:not(.asplayer-tv-dpad) #cards .fav-tile .tile{flex:1;min-width:0}
  body:not(.asplayer-tv-dpad) #cards .fav-star{position:static;flex:0 0 44px;min-width:44px;min-height:44px;font-size:18px}
  @media(max-width:640px){
    body:not(.asplayer-tv-dpad) #tv-catalog-layout{grid-template-columns:minmax(100px,36%) minmax(0,1fr);gap:7px}
    body:not(.asplayer-tv-dpad) #tv-category-pane,body:not(.asplayer-tv-dpad) #tv-content-pane{height:calc(100vh - 192px);height:calc(100dvh - 192px)}
    body:not(.asplayer-tv-dpad) #cards .cover{flex-basis:46px;width:46px;height:62px}
    body:not(.asplayer-tv-dpad) #cards .caption{padding:6px 4px}
  }
  @media(max-height:500px) and (orientation:landscape){
    body:not(.asplayer-tv-dpad) #tv-category-pane,body:not(.asplayer-tv-dpad) #tv-content-pane{height:calc(100dvh - 100px)}
  }
  /* TV catalogs use the real viewport; only the two lists scroll.
     The header and the navigation panel remain within the TV frame. */
  body.asplayer-tv-dpad.asplayer-catalog-open #app-shell{height:100vh;height:100dvh;min-height:0;overflow:hidden}
  body.asplayer-tv-dpad.asplayer-catalog-open #app-shell .sidebar{height:100%;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding-top:12px;padding-bottom:12px}
  body.asplayer-tv-dpad.asplayer-catalog-open #app-shell main{height:100%;min-height:0;margin:0 auto;display:flex;flex-direction:column;overflow:hidden;padding-top:12px;padding-bottom:12px}
  body.asplayer-tv-dpad.asplayer-catalog-open #app-shell .topbar{flex:none;margin-bottom:10px}
  body.asplayer-tv-dpad.asplayer-catalog-open #view-catalog{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
  body.asplayer-tv-dpad.asplayer-catalog-open #tv-catalog-layout{flex:1;min-height:0;grid-template-rows:minmax(0,1fr);align-items:stretch}
  body.asplayer-tv-dpad.asplayer-catalog-open #tv-category-pane,
  body.asplayer-tv-dpad.asplayer-catalog-open #tv-content-pane{height:100%;min-height:0;max-height:none;overscroll-behavior:contain}
  body.asplayer-tv-dpad.asplayer-catalog-open #tv-content-pane{padding-bottom:10px}

`;
document.head.appendChild(categoryStyle);
function selectedCategoryButton(){
  return Array.from(document.querySelectorAll('#categories [data-category]'))
    .find(el=>String(el.dataset.category)===String(category));
}
function updateResultBar(){
  backCats.textContent=t('↑ Categorías','↑ Categories');
  const chosen=selectedCategoryButton();
  resultBar.querySelector('strong').textContent=chosen?.textContent?.trim()||t('Contenido','Content');
}
function goCategories(){
  pendingCategory=null;
  const target=selectedCategoryButton()||document.querySelector('#categories button:not([disabled])')||document.getElementById('category-expand');
  if(target){
    if(!remote)document.getElementById('category-tools').scrollIntoView({block:'start',behavior:'auto'});
    focusElement(target);
  }
}
function catalogDirection(key){
  if(modal||!catalogTabs.includes(active)||!remote)return false;
  const a=document.activeElement;
  const categories=Array.from(categoryList.querySelectorAll('button[data-category]')).filter(visible);
  const titles=Array.from(cards.querySelectorAll('button[data-item]')).filter(visible);
  const loadMore=document.getElementById('loadmore');
  const currentCategory=selectedCategoryButton()||categories[0];
  if(a.closest('.sidebar')&&key==='ArrowRight'){focusElement(currentCategory);return true;}
  if(categoryList.contains(a)){
    if(key==='ArrowRight'){focusElement(titles[0]||backCats);return true;}
    if(key==='ArrowLeft'){
      focusElement(document.querySelector('.sidebar [data-nav="'+active+'"]'));return true;
    }
    const n=categories.indexOf(a)+(key==='ArrowUp'?-1:1);
    if(categories[n])focusElement(categories[n]);return true;
  }
  if(a===backCats&&key==='ArrowDown'){focusElement(titles[0]);return true;}
  if(a===loadMore&&key==='ArrowUp'){focusElement(titles[titles.length-1]);return true;}
  if(cards.contains(a)){
    const tile=a.closest('.fav-tile')?.querySelector('button[data-item]')||a.closest('button[data-item]');
    if(!tile)return false;
    if(key==='ArrowLeft'){
      if(a.matches('.fav-star'))focusElement(tile);else goCategories();
      return true;
    }
    if(key==='ArrowRight'){focusElement(tile.parentElement.querySelector('.fav-star'));return true;}
    const n=titles.indexOf(tile)+(key==='ArrowUp'?-1:1);
    if(n<0)focusElement(backCats);
    else if(n>=titles.length)focusElement(loadMore);
    else if(a.matches('.fav-star'))focusElement(titles[n].parentElement.querySelector('.fav-star')||titles[n]);
    else focusElement(titles[n]);
    return true;
  }
  return false;
}
backCats.addEventListener('click',goCategories);
function focusCategoryResults(){
  if(!pendingCategory||shownOverlay())return;
  if(active!==pendingCategory.tab||String(category)!==pendingCategory.id||operation!==pendingCategory.op){pendingCategory=null;return;}
  updateResultBar();
  const first=cards.querySelector('button[data-item]:not(:disabled),button[data-episode]:not(:disabled),#retry-catalog');
  if(first&&visible(first)){
    pendingCategory=null;
    if(remote){
      scrollInPane(resultBar,contentPane,true);
      focusElement(first);
    }else{
      contentPane.scrollTop=Math.max(0,contentPane.scrollTop+resultBar.getBoundingClientRect().top-contentPane.getBoundingClientRect().top-6);
    }
  }else if(!pendingCategory.anchored){
    pendingCategory.anchored=true;
    if(remote){
      scrollInPane(resultBar,contentPane,true);
      focusElement(backCats);
    }else contentPane.scrollTop=0;
  }
}
window.ASPLAYER_TV_CATEGORY=function(id){
  updateResultBar();
  if(defaultCategorySelection||!catalogTabs.includes(active))return;
  pendingCategory={tab:active,id:String(id),op:operation,anchored:false};
  requestAnimationFrame(focusCategoryResults);
};
new MutationObserver(()=>{if(pendingCategory)requestAnimationFrame(focusCategoryResults);})
  .observe(cards,{childList:true,subtree:true});
// Default to All on entry, but retain the viewer's category focus. VOD/series
// use the historical bounded preview rather than fetching the entire catalog.
const prevLoadCategoriesTv=loadCategories;
loadCategories=async function(tab,force=false){
  const initialOp=operation;
  await prevLoadCategoriesTv(tab,force);
  if(active===tab&&operation===initialOp&&category==='none'&&cats.length){
    defaultCategorySelection=true;
    try{tryCategory('all');}finally{defaultCategorySelection=false;}
  }
  updateResultBar();
};
const oldBackTv=window.ASPLAYER_BACK;
window.ASPLAYER_BACK=function(){
  if(remote&&!shownOverlay()&&catalogTabs.includes(active)&&
     (cards.contains(document.activeElement)||resultBar.contains(document.activeElement))){
    goCategories();return;
  }
  pendingCategory=null;
  if(oldBackTv)oldBackTv();
};
// Cancel a deferred focus transfer as soon as the viewer chooses to navigate
// elsewhere; never steal focus later when a slow list arrives.
document.addEventListener('click',e=>{
  if(pendingCategory&&!cards.contains(e.target)&&!e.target.closest('[data-category]'))pendingCategory=null;
},true);
const priorTvLanguage=languageUI;
languageUI=function(){priorTvLanguage.apply(this,arguments);updateResultBar();};
updateResultBar();

const panel=document.createElement('div');panel.id='asplayer-593-options';
const heading=document.createElement('h3');panel.appendChild(heading);
const version=document.createElement('p');version.id='asplayer-593-version';panel.appendChild(version);
const sharpLabel=document.createElement('label');sharpLabel.htmlFor='asplayer-593-picture';panel.appendChild(sharpLabel);
const sharp=document.createElement('select');sharp.id='asplayer-593-picture';
[['off','off'],['sharp','sharp']].forEach(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;sharp.appendChild(o);});
sharp.value=localStorage.getItem(storeKey)==='sharp'?'sharp':'off';panel.appendChild(sharp);
const pictureHelp=document.createElement('p');panel.appendChild(pictureHelp);
sharp.addEventListener('change',()=>{
  localStorage.setItem(storeKey,sharp.value);
  try{bridge.setImageEnhancement(sharp.value);}catch(_){}
});
try{bridge.setImageEnhancement(sharp.value);}catch(_){}
const netLabel=document.createElement('label');panel.appendChild(netLabel);
const netHelp=document.createElement('p');panel.appendChild(netHelp);
const vpnLabel=document.createElement('label');vpnLabel.htmlFor='asplayer-593-vpn';panel.appendChild(vpnLabel);
const vpnCheck=document.createElement('input');vpnCheck.type='checkbox';vpnCheck.id='asplayer-593-vpn';vpnCheck.style.width='auto';vpnCheck.style.minHeight='auto';
// 'Enabled' is a user preference to launch the separate WARP client,
// not a claim that a VPN tunnel is connected.
vpnCheck.checked=localStorage.getItem(vpnKey)==='true';vpnLabel.prepend(vpnCheck);
const vpnHelp=document.createElement('p');panel.appendChild(vpnHelp);
const warpButton=document.createElement('button');warpButton.className='ghost asplayer-593-button';panel.appendChild(warpButton);
warpButton.addEventListener('click',()=>{try{bridge.openWarpVpn();}catch(_){window.open('https://one.one.one.one/','_blank');}});
vpnCheck.addEventListener('change',()=>{
  localStorage.setItem(vpnKey,String(vpnCheck.checked));
  if(vpnCheck.checked)warpButton.click();
});
function localize(){
  version.textContent='ASPLAYER Universal 5.9.17 · LibVLC 3.7.7 · Alftech Solutions';
  heading.textContent=t('Imagen, rendimiento y conexión','Picture, performance and connection');
  sharpLabel.textContent=t('Mejora de nitidez (experimental)','Sharpness enhancement (experimental)');
  sharp.options[0].textContent=t('Normal (recomendado)','Normal (recommended)');
  sharp.options[1].textContent=t('Nitidez suave (requiere compatibilidad de LibVLC)','Gentle sharpening (requires LibVLC support)');
  pictureHelp.textContent=t('Filtro de nitidez de VLC para señales de baja calidad. No es escalado 4K por IA y puede no funcionar con algunas salidas por hardware. Se aplica al siguiente vídeo.','VLC sharpening for low-quality streams. Not AI 4K upscaling; may be unsupported by some hardware output paths. Applies on the next video.');
  netLabel.textContent=t('Búfer adaptativo y fotogramas tardíos','Adaptive buffer and late frames');
  netHelp.textContent=t('En Rendimiento/Búfer selecciona Adaptativo: aumenta el prebúfer en reproducciones posteriores cuando se detectan interrupciones. LibVLC prioriza sincronía de audio/vídeo y descarta fotogramas atrasados.','Choose Adaptive under Performance/Buffer: raises prebuffer on subsequent playback after interruptions. LibVLC prioritizes audio/video sync and drops late frames.');
  // textContent would detach checkbox, keep it in the label.
  for(const n of Array.from(vpnLabel.childNodes))if(n!==vpnCheck)vpnLabel.removeChild(n);
  vpnLabel.appendChild(document.createTextNode(' '+t('Asistente VPN gratuita Cloudflare WARP (desactivado por defecto)','Free Cloudflare WARP VPN helper (off by default)')));
  vpnHelp.textContent=t('Requiere instalar la app independiente 1.1.1.1 / WARP y autorizar manualmente su conexión. ASPLAYER no puede saber si el túnel está conectado ni garantiza anonimato o acceso a todos los servicios.','Requires the separate 1.1.1.1 / WARP app and your approval. ASPLAYER cannot confirm that its tunnel is connected or guarantee anonymity or access to every service.');
  warpButton.textContent=t('Abrir / instalar Cloudflare WARP','Open / install Cloudflare WARP');
}
localize();
const place=document.querySelector('#preferred-player')?.closest('.setting')||document.querySelector('#view-settings');
if(place)place.appendChild(panel);
// Make the actual version visible on the existing About text as well.
for(const el of document.querySelectorAll('#view-settings p')){
  if(el===version)continue;
  if(/ASPLAYER Universal 5\.\d/.test(el.textContent||''))el.textContent='ASPLAYER Universal 5.9.17 · LibVLC/VLC · Alftech Solutions';
}
if(typeof languageUI==='function'){
 const prior=languageUI;languageUI=function(){prior.apply(this,arguments);localize();};
}
// Add an adaptive choice to existing buffer profile controls where available.
for(const element of document.querySelectorAll('select')){
  if(!/buffer|cache/i.test(element.id||''))continue;
  if(element.querySelector('option[value="adaptive"]'))continue;
  const o=document.createElement('option');o.value='adaptive';o.textContent=t('Adaptativo (recomendado)','Adaptive (recommended)');element.appendChild(o);
}
})();
