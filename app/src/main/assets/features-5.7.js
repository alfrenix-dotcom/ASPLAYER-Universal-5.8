/* ASPLAYER 5.7 — bounded All previews and progressive global Xtream search.
   Standard Xtream player_api.php offers per-category lists, not a portable
   server-side free-text search. Search progressively scans category lists,
   respects the active account, and renders bounded matches without blocking.
   Playback engine stays native VideoView pending a compiled Media3 migration.
*/
(function(){
'use strict';
const el=id=>document.getElementById(id);
Object.assign(LABELS.en,{
 globalSearchHint:'Type at least 2 letters to search ALL categories',
 globalPreview:'Quick preview · recent titles from a few categories',
 globalSearching:'Searching all categories',
 globalComplete:'Search complete',
 globalMatches:'matches',
 globalPartial:'Some categories were unavailable. Results may be incomplete.',
 globalEmpty:'No titles match your search',
 globalQuick:'Showing a small preview. Search to find titles from every category.',
 globalSource:'Categories reviewed',
 globalSearchSlow:'Searching in the background. Results appear as they are found.'
});
Object.assign(LABELS.es,{
 globalSearchHint:'Escribe al menos 2 letras para buscar en TODAS las categorías',
 globalPreview:'Vista rápida · títulos recientes de algunas categorías',
 globalSearching:'Buscando en todas las categorías',
 globalComplete:'Búsqueda terminada',
 globalMatches:'coincidencias',
 globalPartial:'No se pudieron consultar algunas categorías. Los resultados pueden estar incompletos.',
 globalEmpty:'No se encontraron títulos con ese nombre',
 globalQuick:'Mostrando una pequeña selección. Busca para encontrar títulos de todas las categorías.',
 globalSource:'Categorías revisadas',
 globalSearchSlow:'Buscando en segundo plano. Los resultados aparecen conforme se encuentran.'
});

const PREVIEW_CATEGORY_COUNT=2, PREVIEW_LIMIT=18, PER_PAGE=18, MAX_RESULTS=350;
let indexToken=0, currentSearch=null, preview=[], previewLoaded=false, previewAccount='', scanTimer=0;
const categoryCache=new Map();
const historicalLoad=loadItems, historicalApply=applyFilter, historicalRender=renderItems;
const isAll=()=>category==='all'&&(active==='vod'||active==='series');
const accountId=()=>sessionPrefix()+'|'+active;
const allCategoryIds=()=>cats.filter(c=>c&&c.category_id!=null).filter(c=>{
 const id=String(c.category_id);
 return !(parentEnabled&&isAdult(c.category_name)&&!unlockedCats.has(id));
});
function normalized(s){
 try{return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}catch(_){return String(s||'').toLowerCase()}
}
function sortDate(item){
 const n=Number(item.added||item.added_date||item.last_modified||item.created_at||0);
 if(Number.isFinite(n)&&n>1e9&&n<5e12)return n>1e12?n:n*1000;
 for(const d of [item.releasedate,item.releaseDate,item.release_date,item.first_air_date,item.year]){
  const text=String(d||'');if(!text)continue;
  const date=/^(?:19|20)\d{2}$/.test(text)?Date.UTC(Number(text),0,1):Date.parse(text);
  if(Number.isFinite(date))return date;
 }
 return 0;
}
function sortRating(item){
 for(const field of ['rating','imdb_rating','rating_imdb','vote_average','rating_5based']){
  const m=String(item[field]??'').match(/\d+(?:\.\d+)?/);
  if(!m)continue;const n=Number(m[0])*(field==='rating_5based'?2:1);
  if(n>0&&n<=10)return n;
 }
 return -1;
}
function compareContent(a,b){
 const type=settings.order||'new';
 if(type==='rated'){const d=sortRating(b)-sortRating(a);if(d)return d}
 const x=sortDate(a),y=sortDate(b);
 const d=type==='old'?(x&&y?x-y:x?-1:y?1:0):(x&&y?y-x:x?-1:y?1:0);
 return d||String(a.name||a.title||'').localeCompare(String(b.name||b.title||''),lang);
}
function itemId(item){return String(item.stream_id??item.series_id??item.id??item.name??'')}
function statusText(value){
 const bar=el('all-global-status');bar.textContent=value||'';
 bar.classList.toggle('hidden',!isAll());
}
function setStatus(message){
 if(isAll())statusText(message);
}
function isValid(token,account,tab,op){return token===indexToken&&isAll()&&accountId()===account&&active===tab&&operation===op}
function renderAll(list,countText){
 filtered=list.slice().sort(compareContent);
 visible=Math.max(PER_PAGE,visible);
 historicalRender();
 if(countText)el('count').textContent=countText;
}
function clearRun(){indexToken++;currentSearch=null;clearTimeout(scanTimer)}
function keepSample(item,cat){
 if(!item||typeof item!=='object')return null;
 if(!itemId(item))return null;
 return item.category_id==null?{...item,category_id:String(cat.category_id)}:item;
}
async function readCat(tab,cat,force){
 const key=accountId()+'|'+String(cat.category_id),mem=categoryCache.get(key);
 if(mem&&!force&&Date.now()-mem.when<8*3600*1000)return mem.data;
 const data=await cached(ACTIONS[tab][1],{category_id:String(cat.category_id)},force);
 if(!Array.isArray(data))throw Error('Category response is not an array');
 const enriched=data.map(it=>keepSample(it,cat)).filter(Boolean);
 // Memory is bounded; IndexedDB's existing 8-hour cache keeps other categories.
 categoryCache.delete(key);categoryCache.set(key,{when:Date.now(),data:enriched});
 while(categoryCache.size>9)categoryCache.delete(categoryCache.keys().next().value);
 return enriched;
}
function resetAllUI(){
 filtered=[];catalog=[];preview=[];previewLoaded=false;visible=PER_PAGE;
 el('loadmore').classList.add('hidden');
 el('cards').innerHTML='<p class="empty">'+esc(tr('globalSearchHint'))+'</p>';
 el('count').textContent='';
}
async function showPreview(force=false){
 clearRun();const token=indexToken,op=operation,tab=active,account=accountId();
 if(!isAll())return;
 const list=allCategoryIds().slice(0,PREVIEW_CATEGORY_COUNT);
 if(!list.length){setStatus(tr('globalSearchHint'));return}
 setStatus(tr('globalPreview')+' · '+tr('loading'));
 const seen=new Set();let done=0,errors=0;
 const jobs=list.map(async cat=>{
  try{
   const data=await readCat(tab,cat,force);
   if(!isValid(token,account,tab,op)||filter.trim())return;
   const sorted=data.slice().sort(compareContent).slice(0,PREVIEW_LIMIT);
   for(const it of sorted){const id=itemId(it);if(!seen.has(id)){seen.add(id);preview.push(it)}}
  }catch(_){errors++}
  finally{
   done++;
   if(isValid(token,account,tab,op)&&!filter.trim()){
    previewLoaded=true;preview.sort(compareContent);preview=preview.slice(0,PREVIEW_LIMIT);
    visible=PER_PAGE;renderAll(preview,'');el('loadmore').classList.add('hidden');
    if(!preview.length&&done===list.length)el('cards').innerHTML='<p class="empty">'+esc(tr('globalSearchHint'))+'</p>';
    setStatus(tr('globalQuick')+' '+(errors?tr('globalPartial'):'') );
   }
  }
 });
 await Promise.allSettled(jobs);
}
function itemMatches(it,query){
 return normalized(it.name||it.title||'').includes(query);
}
function repaintSearch(force=false){
 const job=currentSearch;if(!job||!isValid(job.token,job.account,job.tab,job.op))return;
 clearTimeout(scanTimer);
 scanTimer=setTimeout(()=>{
  if(!isValid(job.token,job.account,job.tab,job.op))return;
  visible=force?PER_PAGE:visible;
  const displayed=job.hits.slice(0,MAX_RESULTS);
  renderAll(displayed,job.hits.length+' '+tr('globalMatches'));
  el('loadmore').classList.toggle('hidden',visible>=displayed.length);
  if(!displayed.length){el('cards').innerHTML='<p class="empty">'+esc(job.complete?tr('globalEmpty'):tr('globalSearchSlow'))+'</p>'}
  const state=job.complete?tr('globalComplete'):tr('globalSearching');
  setStatus(state+' · '+job.done+'/'+job.total+' '+tr('globalSource')+' · '+job.hits.length+' '+tr('globalMatches')+(job.errors?' · '+tr('globalPartial'):''));
 },force?0:90);
}
async function scanSearch(query){
 clearRun();const tab=active,account=accountId(),op=operation,token=indexToken;
 const list=allCategoryIds();
 const job={tab,account,op,token,query,done:0,total:list.length,errors:0,hits:[],ids:new Set(),complete:false};
 currentSearch=job;visible=PER_PAGE;
 filtered=[];el('loadmore').classList.add('hidden');
 el('cards').innerHTML='<p class="empty"><span class="spin"></span> '+esc(tr('globalSearchSlow'))+'</p>';
 setStatus(tr('globalSearching')+' · 0/'+job.total+' '+tr('globalSource'));
 let next=0;
 const valid=()=>isValid(token,account,tab,op)&&filter.trim()===query;
 async function worker(){
  while(next<list.length&&valid()){
   const cat=list[next++];
   try{
    const entries=await readCat(tab,cat,false);
    if(!valid())return;
    for(const it of entries){
     if(!itemMatches(it,query))continue;
     const id=itemId(it);if(job.ids.has(id))continue;
     job.ids.add(id);job.hits.push(it);
    }
   }catch(_){job.errors++}
   job.done++;
   if(valid())repaintSearch();
  }
 }
 await Promise.allSettled(Array.from({length:Math.min(3,list.length)},worker));
 if(!valid())return;
 job.complete=true;repaintSearch(true);
}
function searchAll(){
 if(!isAll())return historicalApply();
 const query=normalized(filter.trim());
 if(query.length<2){
  clearRun();
  if(previewLoaded){renderAll(preview,'');el('loadmore').classList.add('hidden');setStatus(tr('globalQuick'))}
  else showPreview();
  if(query.length===1)setStatus(tr('globalSearchHint'));
  return;
 }
 if(currentSearch&&currentSearch.query===query&&isValid(currentSearch.token,currentSearch.account,currentSearch.tab,currentSearch.op)){
  repaintSearch(true);return;
 }
 scanSearch(query);
}
const oldShowTab=showTab;
showTab=function(tab){clearRun();oldShowTab(tab);if(!isAll())statusText('')};
loadItems=function(force=false){
 if(!isAll()){clearRun();statusText('');return historicalLoad(force)}
 // Never fetch the unfiltered server catalog just to open All.
 const op=++operation;resetAllUI();setStatus(tr('globalQuick'));
 return showPreview(force);
};
applyFilter=function(){if(isAll())return searchAll();clearRun();return historicalApply()};
const oldLanguageUI=languageUI;
languageUI=function(){oldLanguageUI();if(!isAll())return;searchAll()};
const style=document.createElement('style');style.textContent=`
#all-global-status{margin:12px 0;padding:10px 14px;border:1px solid #48738d;background:linear-gradient(125deg,#0c2940,#241c42);border-radius:12px;font-size:13px;color:#b9e6fa;min-height:36px;line-height:1.5}
.all-catalog-tab{border-color:#56bdc2}
@media(max-width:600px){#all-global-status{font-size:12px;padding:9px 11px}}
`;
document.head.appendChild(style);
const bar=document.createElement('div');bar.id='all-global-status';bar.className='hidden';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');
el('cards').insertAdjacentElement('beforebegin',bar);
console.info('ASPLAYER 5.7: bounded All preview, indexed category-search with streaming UI, native playback retained');
})();
