#!/usr/bin/env python3
"""Replace the old top history panels with local categories in the shared catalog."""
from pathlib import Path
assets=Path("app/src/main/assets")
p=assets/"features-5.7.1.js"
s=p.read_text()
def replace(old,new):
    global s
    assert s.count(old)==1,(old[:100],s.count(old))
    s=s.replace(old,new,1)

# Preserve the parental category when recording an episode.
replace("item.seriesId=item.seriesId||currentSeries.series_id;",
        "item.seriesId=item.seriesId||currentSeries.series_id;item.category_id=item.category_id||currentSeries.category_id;")
replace("const row=findRow(nowPlaying.mode,nowPlaying.id),position=pendingResume||Number(row?.position)||0;",
        "const row=findRow(nowPlaying.mode,nowPlaying.id),position=row?.finished?0:(pendingResume||Number(row?.position)||0);")
start=s.index("const watchPanels=document.createElement('section');")
end=s.index("const historicalShowTab=showTab;",start)
s=s[:start]+r"""
// Local virtual categories are never sent to the provider API.
const WATCH_CONTINUE='__asplayer_continue__',WATCH_HISTORY='__asplayer_history__';
const watchTabs=()=>active==='vod'||active==='series'||active==='live';
const isWatchCategory=()=>watchTabs()&&(category===WATCH_HISTORY||
    (category===WATCH_CONTINUE&&active!=='live'));
function watchRows(group){
  if(!watchTabs())return [];
  const all=getHistory(active).filter(row=>row&&row.item&&contentId(row.item));
  return group===WATCH_CONTINUE
    ? all.filter(row=>Number(row.position)>8&&!row.finished&&
        (Number(row.duration)<=0||Number(row.position)/Number(row.duration)<.96))
    : all;
}
function updateWatchButtons(){
  if(!watchTabs())return;
  const holder=G('categories');
  const ids=active==='live'?[WATCH_HISTORY]:[WATCH_CONTINUE,WATCH_HISTORY];
  // Refresh counts in place, so the remote focus cannot disappear on a tick.
  for(const id of ids.slice().reverse()){
    let b=Array.from(holder.querySelectorAll('[data-watch-category]')).find(el=>el.dataset.category===id);
    if(!b){
      b=document.createElement('button');b.type='button';
      b.dataset.category=id;b.dataset.watchCategory='true';
      holder.prepend(b);
    }
    const label=id===WATCH_CONTINUE?'▶ '+tr('continueWatching'):'◷ '+tr('viewHistory');
    const count=watchRows(id).length;
    const text=label+' ('+count+')';
    b.classList.add('tab','watch-category');
    b.classList.toggle('active',category===id);
    b.setAttribute('aria-label',text);
    b.setAttribute('aria-pressed',String(category===id));
    if(b.textContent!==text)b.textContent=text;
  }
}
const renderCatsWithFavorites=renderCats;
renderCats=function(){renderCatsWithFavorites();updateWatchButtons();};

let shownWatchRows=[];
function renderWatchResults(){
  if(!isWatchCategory())return;
  const holder=G('cards'),previous=document.activeElement;
  const previousKey=holder.contains(previous)?previous.dataset.watchKey:null;
  const needle=String(filter||'').toLowerCase();
  const all=watchRows(category).filter(row=>!needle||String(row.title||row.item?.name||row.item?.title||'').toLowerCase().includes(needle));
  shownWatchRows=all.slice(0,visible);
  G('count').textContent=all.length+' '+tr('titles');
  G('all-global-status')?.classList.add('hidden');
  holder.innerHTML=shownWatchRows.map((row,index)=>{
    const item=row.item;
    const image=safeImage(item.stream_icon||item.cover||item.movie_image);
    const duration=Number(row.duration)||0,position=Number(row.position)||0;
    const pct=duration?Math.max(0,Math.min(100,100*position/duration)):0;
    const label=row.title||item.name||item.title||tr('watched');
    const progress=active!=='live'&&position>0
      ? '<small>'+esc(fmtTime(position))+(duration?' / '+esc(fmtTime(duration)):'')+'</small>'+
        '<span class="watch-meter"><i style="width:'+pct.toFixed(1)+'%"></i></span>'
      : '';
    const finished=active!=='live'&&row.finished?'<small class="watch-finished">✓ '+esc(tr('watched'))+'</small>':'';
    return '<button type="button" class="tile watch-list-tile" data-item="'+index+
      '" data-watch-key="'+esc(String(row.id))+'"><div class="cover">'+
      (image?'<img src="'+esc(image)+'" loading="lazy" decoding="async" alt="" onerror="this.style.display=\'none\'">':'▶')+
      '</div><div class="caption"><strong>'+esc(label)+'</strong>'+progress+finished+'</div></button>';
  }).join('')||'<p class="empty">'+esc(tr('watchEmpty'))+'</p>';
  G('loadmore').classList.toggle('hidden',shownWatchRows.length>=all.length);
  if(previousKey!==null&&previousKey!==undefined){
    const target=Array.from(holder.querySelectorAll('[data-watch-key]')).find(el=>el.dataset.watchKey===previousKey)
      ||holder.querySelector('[data-watch-key]')||G('tv-back-categories');
    if(target)target.focus({preventScroll:true});
  }
}
function renderWatchPanels(){
  document.body.classList.toggle('asplayer-catalog-open',watchTabs());
  updateWatchButtons();
  if(isWatchCategory())renderWatchResults();
}
window.ASPLAYER_REFRESH_WATCH=renderWatchPanels;
const prevWatchItems=renderItems;
renderItems=function(){if(isWatchCategory())return renderWatchResults();return prevWatchItems();};
const prevWatchFilter=applyFilter;
applyFilter=function(){if(isWatchCategory())return renderWatchResults();return prevWatchFilter();};
const prevWatchLoad=loadItems;
loadItems=function(force=false){
  if(isWatchCategory()){operation++;return renderWatchResults();}
  return prevWatchLoad(force);
};
const tryCategoryWithFavorites=tryCategory;
tryCategory=function(id){
  if(watchTabs()&&(id===WATCH_HISTORY||(id===WATCH_CONTINUE&&active!=='live'))){
    operation++; // invalidate any pending provider list/search response
    category=id;filter='';visible=32;catalog=[];filtered=[];
    G('search').value='';
    renderCats();renderWatchResults();
    window.ASPLAYER_TV_CATEGORY?.(id);
    return;
  }
  return tryCategoryWithFavorites(id);
};
const loadCategoriesWithHistory=loadCategories;
loadCategories=async function(tab,force=false){
  const was=category,op=operation;
  await loadCategoriesWithHistory(tab,force);
  if(active===tab&&operation===op&&category===was&&isWatchCategory()){
    updateWatchButtons();renderWatchResults();
  }
};
// Replay the saved item/episode itself. Do not send episode IDs to the
// series-details API or bypass parental PIN on remembered restricted items.
G('cards').addEventListener('click',event=>{
  if(!isWatchCategory())return;
  const button=event.target.closest('[data-watch-key]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();
  const row=shownWatchRows[Number(button.dataset.item)];if(!row?.item)return;
  const mode=active;
  const resume=()=>{
    pendingResume=row.finished?0:Number(row.position)||0;
    if(mode==='series')currentSeries={name:row.item.seriesName||'',series_id:row.item.seriesId||'',category_id:row.item.category_id};
    play(row.item,mode);
  };
  const group=cats.find(c=>String(c.category_id)===String(row.item.category_id));
  if(parentEnabled&&(!group||isAdult(group.category_name))){
    if(parentHash)requestUnlock(resume);
    else toast(tr('pinNeed'));
  }else resume();
},true);
const watchListCss=document.createElement('style');
watchListCss.textContent=`
  /* One heading instead of the old repeated title + refresh row. */
  #view-catalog .sectionhead{display:none}
  .topbar .catalog-header-actions{display:flex;align-items:center;gap:9px}
  .topbar #refresh-cat{display:none}
  body.asplayer-catalog-open .topbar #refresh-cat{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 12px}
  body.asplayer-catalog-open .topbar{margin-bottom:14px}
  body.asplayer-catalog-open.asplayer-tv-dpad #tv-category-pane,
  body.asplayer-catalog-open.asplayer-tv-dpad #tv-content-pane{max-height:calc(100vh - 105px)}
  @media(max-width:640px){
    body.asplayer-catalog-open .topbar{gap:7px;margin-bottom:12px;flex-wrap:nowrap}
    body.asplayer-catalog-open .topbar .catalog-header-actions{gap:5px;flex-wrap:wrap;justify-content:flex-end}
    body.asplayer-catalog-open .topbar #refresh-cat{font-size:12px;padding:6px 8px}
    body.asplayer-catalog-open:not(.asplayer-tv-dpad) #tv-category-pane,
    body.asplayer-catalog-open:not(.asplayer-tv-dpad) #tv-content-pane{height:calc(100vh - 155px);height:calc(100dvh - 155px)}
  }
  #categories .watch-category{border-color:#397e91;background:#122a40;font-weight:650}
  #categories .watch-category.active{background:#12637d;color:white;border-color:#64d9dd}
  #categories .watch-category[data-category="__asplayer_history__"]{margin-bottom:6px}
  #cards .watch-list-tile .watch-meter{height:5px;max-width:100%;margin:6px 0 1px}
  #cards .watch-finished{color:#72ebaf}
`;
document.head.appendChild(watchListCss);
const topbar=document.querySelector('.topbar'),serverPill=topbar?.querySelector('.pill'),refreshCat=G('refresh-cat');
if(topbar&&serverPill&&refreshCat){
  const actions=document.createElement('div');actions.className='catalog-header-actions';
  topbar.append(actions);actions.append(serverPill,refreshCat);
}
"""+s[end:]
# Remove the stale horizontal panel styling as well.
start=s.index(".watch-panels{")
end=s.index(".watch-meter{",start)
s=s[:start]+s[end:]
p.write_text(s)

# A finished media row restarts at zero instead of resuming near credits.
p=assets/"features-5.8.js"
s=p.read_text()
replace("const resume=Number(row?.position)||0;","const resume=row?.finished?0:(Number(row?.position)||0);")
replace("if(typeof renderWatchPanels==='function')renderWatchPanels();",
        "if(ended)window.ASPLAYER_REFRESH_WATCH?.();")
p.write_text(s)
print("ASPLAYER 5.9.14: history and continue watching as native catalog categories; preserved account history")
