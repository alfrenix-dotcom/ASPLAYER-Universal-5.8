/* ASPLAYER 6.0.8 — conservative UI responsiveness optimizations.
 * Only small account-scoped category lists are memoized. Large stream catalogs,
 * playback URLs, PINs, histories, Worker data and decoders are never cached here.
 */
(()=>{
'use strict';
const priorCached=cached,priorDelete=cacheDeletePrefix;
const entries=new Map(),MAX_ENTRIES=6,MAX_CATEGORIES=300,TTL_MS=30000;
const eligible=action=>/^get_(?:live|vod|series)_categories$/.test(action);
const copy=rows=>Array.isArray(rows)?rows.map(row=>
 row&&typeof row==='object'&&!Array.isArray(row)?{...row}:row):rows;
function keyOf(action,extra){return sessionPrefix()+'\u001f'+action+'|'+JSON.stringify(extra);}
function trim(){
 while(entries.size>MAX_ENTRIES)entries.delete(entries.keys().next().value);
}
cached=async function(action,extra={},force=false){
 if(!session()||!eligible(action))return priorCached(action,extra,force);
 const key=keyOf(action,extra),now=Date.now(),entry=entries.get(key);
 if(!force&&entry){
  if(entry.value&&entry.expires>now){
   entries.delete(key);entries.set(key,entry);
   return copy(entry.value);
  }
  if(entry.pending)return copy(await entry.pending);
 }
 entries.delete(key);
 const request=Promise.resolve().then(()=>priorCached(action,extra,force));
 const fresh={pending:request,value:null,expires:0};
 entries.set(key,fresh);trim();
 try{
  const result=await request;
  if(entries.get(key)===fresh){
   if(Array.isArray(result)&&result.length<=MAX_CATEGORIES){
    fresh.value=copy(result);fresh.expires=Date.now()+TTL_MS;fresh.pending=null;
   }else entries.delete(key);
  }
  return result;
 }catch(error){
  if(entries.get(key)===fresh)entries.delete(key);
  throw error;
 }
};
cacheDeletePrefix=function(prefix){
 // Clearing account caches must invalidate all corresponding RAM entries.
 for(const key of entries.keys())
  if(!prefix||key.startsWith(String(prefix)+'\u001f'))entries.delete(key);
 return priorDelete.apply(this,arguments);
};
// Low-end visual profile: avoid expensive decorative card shadows and
// transitions, while preserving all focus rings, controls and media surfaces.
const css=document.createElement('style');
css.id='asplayer-608-efficient-cards';
css.textContent=[
 'body[data-performance-effective="efficient"] #cards .tile:not(:focus):not(:focus-visible),',
 'body[data-performance-effective="efficient"] .poster:not(:focus):not(:focus-visible){',
 'box-shadow:none!important;transition:none!important}',
 'body[data-performance-effective="efficient"] #episodes .episode-still-row:not(:focus):not(:focus-visible){',
 'box-shadow:none!important;transition:none!important}'
].join('\n');
document.head.append(css);
})();