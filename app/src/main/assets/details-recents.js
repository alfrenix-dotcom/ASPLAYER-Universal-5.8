/* 5.9.20: provider artwork and a bounded, date-ordered recent catalog. */
(()=>{
 'use strict';
 const G=id=>document.getElementById(id), RECENT='__asplayer_recent__', LIMIT=300;
 const isRecent=()=>['vod','series'].includes(active)&&category===RECENT;
 Object.assign(LABELS.es,{recentCategory:'Recientes',recentScan:'Buscando títulos recientes',recentAdded:'Últimos títulos agregados o actualizados por el servidor (hasta 300).',recentNoDates:'El servidor no indicó fechas de incorporación o actualización.',recentPartial:'Algunas categorías no estuvieron disponibles.',liveFormat:'Formato de reproducción (TV en vivo)',liveFormatHelp:'Default elige automáticamente; HLS y MPEG-TS fijan el formato si el servidor lo admite.'});
 Object.assign(LABELS.en,{recentCategory:'Recent',recentScan:'Finding recent titles',recentAdded:'Latest titles added or updated by the server (up to 300).',recentNoDates:'The server did not provide add or update dates.',recentPartial:'Some categories were unavailable.',liveFormat:'Playback format (Live TV)',liveFormatHelp:'Default selects automatically; HLS and MPEG-TS select a fixed format if supported by the server.'});
 const oldCats=renderCats;
 renderCats=function(){
  oldCats();if(!['vod','series'].includes(active))return;
  const all=G('categories').querySelector('[data-category="all"]');if(!all)return;
  const b=document.createElement('button');b.type='button';b.dataset.category=RECENT;
  b.className='tab'+(isRecent()?' active':'');b.textContent='◴ '+tr('recentCategory');
  b.setAttribute('aria-pressed',String(isRecent()));all.before(b);
 };
 function stamp(it,tab){
  for(const value of [it.added,it.added_date,it.date_added,it.created_at,...(tab==='series'?[it.last_modified,it.updated_at]:[])]){
   if(value==null||value==='')continue;
   const raw=String(value).trim(),n=Number(raw);
   if(/^\d{10,13}$/.test(raw)&&n>=1e9&&n<=5e12)return n>=1e12?n:n*1000;
   if(/^\d{4}-\d{2}-\d{2}/.test(raw)){const d=Date.parse(raw);if(Number.isFinite(d))return d;}
  }return 0;
 }
 const recentStatus=()=>G('all-global-status');
 const setStatus=s=>{const el=recentStatus();if(el){el.textContent=s;el.classList.remove('hidden');}};
 function permitted(it){
  if(!parentEnabled)return true;
  const ids=[it.category_id,...(Array.isArray(it.category_ids)?it.category_ids:[])].map(String);
  return !cats.some(c=>ids.includes(String(c.category_id))&&isAdult(c.category_name)&&!unlockedCats.has(String(c.category_id)));
 }
 const previousFilter=applyFilter;
 applyFilter=function(){
  if(!isRecent())return previousFilter();
  filtered=catalog.filter(it=>permitted(it)&&(!filter||String(it.name||it.title||'').toLowerCase().includes(filter)));
  renderItems();
 };
 const previousLoad=loadItems;
 loadItems=async function(force=false){
  if(!isRecent())return previousLoad(force);
  const op=++operation,tab=active,key=sessionPrefix(),gen=sessionGeneration;
  const valid=()=>isRecent()&&active===tab&&operation===op&&sessionPrefix()===key&&sessionGeneration===gen;
  const source=cats.filter(c=>c?.category_id!=null&&permitted({category_id:c.category_id}));
  const best=new Map();let next=0,done=0,errors=0;
  catalog=[];filtered=[];G('count').textContent='';G('loadmore').classList.add('hidden');
  G('cards').innerHTML='<p class="empty"><span class="spin"></span> '+esc(tr('loading'))+'</p>';
  setStatus(tr('recentScan')+' · 0/'+source.length);
  const sorted=()=>Array.from(best.values()).sort((a,b)=>b.date-a.date||String(a.item.name||a.item.title||'').localeCompare(String(b.item.name||b.item.title||''),lang));
  function publish(){
   if(!valid())return;const rows=sorted().slice(0,LIMIT);best.clear();
   for(const r of rows)best.set(r.id,r);catalog=rows.map(r=>r.item);applyFilter();
   setStatus(done===source.length?(rows.length?tr('recentAdded'):tr('recentNoDates'))+(errors?' '+tr('recentPartial'):''):tr('recentScan')+' · '+done+'/'+source.length);
  }
  async function worker(){while(next<source.length&&valid()){
   const cat=source[next++];try{
    const rows=await cached(ACTIONS[tab][1],{category_id:String(cat.category_id)},force);
    if(!valid())return;if(!Array.isArray(rows))throw Error('Invalid catalog');
    for(const raw of rows){if(!raw||typeof raw!=='object')continue;
     const item={...raw,category_id:raw.category_id??cat.category_id};
     const id=String((tab==='vod'?item.stream_id:item.series_id)??''),date=stamp(item,tab);
     if(!id||!date||!permitted(item))continue;
     const old=best.get(id);if(!old||date>old.date)best.set(id,{id,date,item});
    }
   }catch(_){errors++;}done++;publish();
  }}
  await Promise.all(Array.from({length:Math.min(3,source.length)},worker));
  if(valid()&&source.length===0)publish();
 };
 const oldTry=tryCategory;
 tryCategory=function(id){
  if(id!==RECENT||!['vod','series'].includes(active))return oldTry(id);
  category=RECENT;filter='';G('search').value='';renderCats();const task=loadItems();
  window.ASPLAYER_TV_CATEGORY?.(id);return task;
 };
 const oldLoadCats=loadCategories;
 loadCategories=async function(tab,force=false){
  const restore=isRecent(),op=operation;await oldLoadCats(tab,force);
  if(restore&&isRecent()&&active===tab&&operation===op)return loadItems(force);
 };

 // Static artwork stays outside the focus ring. On narrow screens the poster
 // and metadata stack; on TV they share a row, leaving episodes scrollable.
 const dialog=G('detail-title').closest('.dialog');dialog.classList.add('artwork-dialog');
 const body=document.createElement('div');body.className='detail-art-body';
 const art=document.createElement('div');art.className='detail-art';art.hidden=true;
 const poster=document.createElement('img');poster.alt='';poster.decoding='async';art.append(poster);
 const text=document.createElement('div');text.className='detail-art-text';
 const backdrop=document.createElement('img');backdrop.className='detail-backdrop';backdrop.alt='';backdrop.setAttribute('aria-hidden','true');backdrop.hidden=true;
 dialog.prepend(backdrop);G('detail-subtitle').before(body);body.append(art,text);
 for(const id of ['detail-subtitle','detail-plot','detail-actions'])text.append(G(id));
 let fallback='';
 function artwork(it,info){
  const source=o=>[o?.movie_image,o?.cover_big,o?.cover,o?.stream_icon,o?.poster_path].map(safeImage).find(Boolean)||'';
  const previous=source(it),url=source(info)||previous;
  fallback=url!==previous?previous:'';
  if(!url){poster.removeAttribute('src');backdrop.removeAttribute('src');art.hidden=true;backdrop.hidden=true;return;}
  art.hidden=false;backdrop.hidden=false;poster.src=url;backdrop.src=url;
 }
 poster.addEventListener('error',()=>{if(fallback){const next=fallback;fallback='';poster.src=next;backdrop.src=next;}else{art.hidden=true;backdrop.hidden=true;}});
 backdrop.addEventListener('error',()=>{backdrop.hidden=true;});
 window.ASPLAYER_DETAILS_ART=artwork;
 const previousDetail=showDetail;
 showDetail=function(){artwork(null,null);return previousDetail.apply(this,arguments);};

 const setting=G('preferred-player')?.closest('.setting'),label=document.createElement('label'),select=document.createElement('select'),hint=document.createElement('p');
 select.id='live-stream-format';label.htmlFor=select.id;hint.className='tiny';
 for(const [v,l] of [['default','Default'],['hls','HLS'],['mpegts','MPEG-TS']]){const o=document.createElement('option');o.value=v;o.textContent=l;select.append(o);}
 select.value=['hls','mpegts'].includes(settings.liveFormat)?settings.liveFormat:'default';
 select.addEventListener('change',()=>{settings.liveFormat=select.value;saveSettings();});
 setting?.append(label,select,hint);
 const updateBox=document.createElement('section');updateBox.className='box setting';updateBox.id='play-update-settings';
 const updateTitle=document.createElement('h3'),updateText=document.createElement('p'),check=document.createElement('button'),storeButton=document.createElement('button');
 check.type=storeButton.type='button';check.className='ghost';storeButton.className='primary';
 updateBox.append(updateTitle,updateText,check,storeButton);G('view-settings').querySelector('.settings-grid').prepend(updateBox);
 const alert=document.createElement('section');alert.className='box';alert.hidden=true;
 const alertText=document.createElement('p'),alertButton=document.createElement('button');alertButton.className='primary';alertButton.type='button';alert.append(alertText,alertButton);G('view-home').prepend(alert);
 let updateState='unknown';
 const translate=(es,en)=>lang==='es'?es:en;
 function showUpdate(){
  updateTitle.textContent=translate('Actualizaciones de ASPLAYER','ASPLAYER updates');
  check.textContent=translate('Buscar actualización','Check for update');
  storeButton.textContent=alertButton.textContent=translate('Abrir Google Play','Open Google Play');
  const messages={available:translate('Hay una nueva versión disponible en Google Play.','A new version is available on Google Play.'),current:translate('No hay una actualización disponible para tu cuenta.','No update is available for your account.'),unsupported:translate('Consulta Google Play para ver si hay una actualización en este dispositivo.','Check Google Play for updates on this device.'),checking:translate('Consultando Google Play…','Checking Google Play…'),unknown:translate('Abre Google Play para consultar actualizaciones.','Open Google Play to check for updates.')};
  updateText.textContent=messages[updateState]||messages.unknown;
  alert.hidden=updateState!=='available';alertText.textContent=messages.available;
 }
 window.ASPLAYER_UPDATE_RESULT=(state,version)=>{updateState=state;showUpdate();};
 check.onclick=()=>{if(typeof window.ASPLAYER?.checkPlayUpdate==='function'){updateState='checking';showUpdate();window.ASPLAYER.checkPlayUpdate();}else{updateState='unsupported';showUpdate();}};
 storeButton.onclick=alertButton.onclick=()=>window.ASPLAYER?.openPlayUpdate?.();
 function localize(){label.textContent=tr('liveFormat');hint.textContent=tr('liveFormatHelp');showUpdate();}
 const oldLanguage=languageUI;languageUI=function(){oldLanguage.apply(this,arguments);localize();};localize();
 const style=document.createElement('style');style.textContent=`
 #details-modal .artwork-dialog{position:relative;isolation:isolate;max-width:850px;overflow:auto}
 #details-modal .detail-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.13;filter:blur(18px);z-index:-1;pointer-events:none;border-radius:inherit}
 #details-modal .detail-art-body{display:flex;gap:18px;align-items:flex-start}
 #details-modal .detail-art{flex:0 0 clamp(105px,25%,200px);max-width:40%;border:1px solid var(--glass-border,#7896bd);border-radius:16px;overflow:hidden;box-shadow:0 8px 20px #01030a90}
 #details-modal .detail-art img{width:100%;aspect-ratio:2/3;object-fit:contain;display:block;background:#10172b}
 #details-modal .detail-art-text{flex:1;min-width:0}
 #details-modal .detail-art[hidden],#details-modal .detail-backdrop[hidden]{display:none!important}
 body[data-glass-effective=light] #details-modal .detail-backdrop{filter:none;opacity:.07}
 @media(max-width:480px){#details-modal .detail-art-body{flex-direction:column;align-items:center;gap:10px}#details-modal .detail-art{width:min(44vw,160px);max-width:none;flex:none}#details-modal .detail-art-text{width:100%}}
 `;document.head.append(style);
})();
