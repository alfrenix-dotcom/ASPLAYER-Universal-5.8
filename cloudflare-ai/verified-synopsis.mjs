// Public, source-backed metadata lookup for ASPLAYER 5.9.25 through 6.x.
// Only fixed external HTTPS APIs are contacted. Never send IPTV credentials or full catalogs.
const tidy=(x,max=1000)=>String(x??'').trim().slice(0,max);
const key=s=>tidy(s,250).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
export function cleanWorkTitle(input){
 let title=tidy(input,180);
 title=title.replace(/(?:[\s._\-[\]()]+(?:lat|latino|latina|castellano|cast|esp|espanol|español|eng|english|sub|subtitulado|doblado|dual|multi|4k|uhd|hdr|1080p|720p|hd|fhd))+\s*$/giu,'');
 title=title.replace(/\s*\((?:19|20)\d{2}\)\s*$/,'').trim();
 return title||tidy(input,180);
}
const yearOf=s=>{const v=Number(String(s||'').match(/\b(?:19|20)\d{2}\b/)?.[0]||0);return v>=1900&&v<=new Date().getUTCFullYear()+2?v:0};
const htmlText=x=>tidy(x,5000).replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(m,c)=>{
 const symbols={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
 if(c[0]==='#'){let code=c[1].toLowerCase()==='x'?parseInt(c.slice(2),16):parseInt(c.slice(1),10);return Number.isInteger(code)&&code>0&&code<0x110000?String.fromCodePoint(code):' ';}
 return symbols[c.toLowerCase()]||' ';
}).replace(/\s+/g,' ').trim();
const titleMatch=(query,actual)=>{
 const q=key(query),a=key(actual);
 return q&&a&&(q===a||a.startsWith(q+' entre historias')||a.startsWith(q+' the ')||a.startsWith(q+' part '));
};
function select(items,query,year){
 const candidates=items.filter(x=>titleMatch(query,x.title)&&x.text.length>=45);
 const sameYear=year?candidates.filter(x=>x.year&&Math.abs(x.year-year)<=1):[];
 const ranked=(sameYear.length?sameYear:year?candidates.filter(x=>!x.year):candidates)
  .sort((a,b)=>Number(key(b.title)===key(query))-Number(key(a.title)===key(query))||b.text.length-a.text.length);
 if(!ranked.length)return null;
 if(!year&&ranked.length>1){
   const knownYears=new Set(ranked.map(x=>x.year).filter(Boolean));
   if(knownYears.size>1)return null; // Ambiguous remakes cannot be identified by title alone.
 }
 return ranked[0];
}
async function fetchJSON(fetcher,url,limit=70000){
 try{
  const response=await fetcher(url,{headers:{Accept:'application/json','Api-User-Agent':'ASPLAYER/6.0 (alftechsolutions.com; company@alftechsolutions.com)'},signal:AbortSignal.timeout(4500)});
  if(!response.ok)return null;
  const raw=await response.text();if(raw.length>limit)return null;
  return JSON.parse(raw);
 }catch(_){return null}
}
function validUrl(v,host){try{const u=new URL(v);return u.protocol==='https:'&&u.hostname===host&&u.username===''&&u.password===''?u.href:''}catch(_){return''}}
async function lookupTVMaze(title,year,fetcher){
 const u='https://api.tvmaze.com/search/shows?q='+encodeURIComponent(title);
 const data=await fetchJSON(fetcher,u,95000);if(!Array.isArray(data))return null;
 const options=data.slice(0,12).map(x=>x?.show).filter(Boolean).map(show=>({
  title:tidy(show.name,180),year:yearOf(show.premiered),text:htmlText(show.summary),
  url:validUrl(show.url,'www.tvmaze.com'),source:'TVmaze',language:'en'
 })).filter(x=>x.url);
 return select(options,title,year);
}
async function lookupTMDB(title,category,year,language,token,fetcher){
 if(!token||typeof token!=='string'||token.length<20)return null;
 const type=category==='series'?'tv':'movie';
 const u=new URL('https://api.themoviedb.org/3/search/'+type);
 u.searchParams.set('query',title);u.searchParams.set('language',language==='es'?'es-MX':'en-US');
 if(year)u.searchParams.set(category==='series'?'first_air_date_year':'year',String(year));
 const protectedFetch=async(url,opts)=>fetcher(url,{...opts,headers:{...opts.headers,Authorization:'Bearer '+token}});
 const d=await fetchJSON(protectedFetch,u.href,95000);
 if(!Array.isArray(d?.results))return null;
 const items=d.results.slice(0,12).map(x=>({
  title:tidy(x.title||x.name,180),originalTitle:tidy(x.original_title||x.original_name,180),
  year:yearOf(x.release_date||x.first_air_date),text:tidy(x.overview,2500),
  url:'https://www.themoviedb.org/'+type+'/'+x.id,source:'TMDB',language
 }));
 const matched=select(items.filter(x=>titleMatch(title,x.title)||titleMatch(title,x.originalTitle)),title,year);
 if(matched&&matched.text)return matched;
 return null;
}
async function lookupWikipedia(title,category,year,language,fetcher){
 const lang=language==='es'?'es':'en';
 const u=new URL('https://'+lang+'.wikipedia.org/w/api.php');
 u.search=new URLSearchParams({action:'query',generator:'search',gsrsearch:title+' '+(category==='series'?'telenovela':'película'),gsrlimit:'8',gsrnamespace:'0',prop:'extracts',exintro:'1',explaintext:'1',format:'json',redirects:'1'}).toString();
 const data=await fetchJSON(fetcher,u.href,145000);
 const pages=Object.values(data?.query?.pages||{});
 const catRe=category==='series'?/\b(telenovela|serie de television|television series|tv series|soap opera|television drama|drama televisivo|serie televisiva)\b/i:/\b(pelicula|film|movie|largometraje|feature film)\b/i;
 const items=pages.map(p=>{
  const titleWiki=tidy(p?.title,190),text=tidy(p?.extract,2500).replace(/\s+/g,' ');
  const basicTitle=titleWiki.replace(/\s*\([^)]*\)\s*$/,'');
  return {title:basicTitle,text,year:yearOf(text.slice(0,500)),url:'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(titleWiki.replace(/ /g,'_')),source:'Wikipedia',language:lang,
   valid:!!titleWiki&&catRe.test(key(text.slice(0,500)))};
 }).filter(x=>x.valid);
 return select(items,title,year);
}
export async function lookupVerifiedSynopsis({title:rawTitle,category='movie',year:rawYear,lang='es'},env={},fetcher=fetch){
 const title=cleanWorkTitle(rawTitle),year=yearOf(rawYear)||yearOf(rawTitle),language=lang==='es'?'es':'en';
 if(!title||title.length<2)return null;
 const type=category==='series'?'series':'movie';
 // Prefer structured bilingual film and series descriptions when the owner configured TMDB.
 const tmdb=await lookupTMDB(title,type,year,language,env.TMDB_READ_TOKEN,fetcher);
 if(tmdb)return tmdb;
 if(type==='series'){
  const tv=await lookupTVMaze(title,year,fetcher);if(tv)return tv;
 }
 const native=await lookupWikipedia(title,type,year,language,fetcher);if(native)return native;
 return lookupWikipedia(title,type,year,language==='es'?'en':'es',fetcher);
}
