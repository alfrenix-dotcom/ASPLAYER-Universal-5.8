import assert from 'node:assert/strict';
import worker from '../cloudflare-ai/worker.mjs';
import {cleanWorkTitle} from '../cloudflare-ai/verified-synopsis.mjs';

let calls=0,allowed=true,requests=[];
const synopsis='Una historia comprobada sobre personas que afrontan cambios inesperados y buscan reconstruir sus vidas a través de decisiones difíciles.';
const metadataFetch=async url=>{
 requests.push(url);
 if(url.includes('api.tvmaze.com/search/shows')){
  const query=new URL(url).searchParams.get('q');
  if(query==='Test series')return new Response(JSON.stringify([{show:{
    name:'Test series',premiered:'2020-02-01',summary:'<p>A documented series about characters facing unexpected changes and hard decisions in their lives.</p>',
    url:'https://www.tvmaze.com/shows/123/test-series'
  }}]),{status:200});
  return new Response('[]',{status:200});
 }
 if(url.includes('wikipedia.org'))return new Response(JSON.stringify({query:{pages:{}}}),{status:200});
 throw Error('Unexpected metadata host: '+url);
};
const env={
 AI_LIMIT:{limit:async()=>({success:allowed})},
 METADATA_FETCH:metadataFetch,
 AI:{run:async(model,params)=>{
  calls++;assert.match(model,/gemma-4/);
  const data=JSON.parse(params.messages[1].content);
  assert(!('password' in data));
  if(data.original)return {choices:[{message:{content:'Translated provider text'}}]};
  if(data.sourceText){assert.match(params.messages[0].content,/Spanish/);
   return {choices:[{message:{content:synopsis}}]};}
  assert.equal(params.response_format.type,'json_object');
  return {choices:[{message:{content:JSON.stringify({mode:'search',answer:'Try comedy',keywords:['comedy','comedia']})}}]};
 }}
 ,NOTICE_ID:'notice1',NOTICE_ES:'Hola'
};
const req=(path,body)=>new Request('https://example.workers.dev'+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const ask=(path,body)=>worker.fetch(req(path,body),env);
assert.deepEqual(await (await ask('/')).json(),{service:'ASPLAYER AI',version:4,appVersion:'5.9.25',features:['synopsis-translation','synopsis-generation','assistant','announcements-admin']});
assert.equal((await (await ask('/api/announcements?lang=es')).json()).announcement.message,'Hola');
assert.equal((await (await ask('/api/synopsis?title=Unknown')).json()).verified,false);
assert.equal((await ask('/api/synopsis',{title:'Test'})).status,400);
assert.equal(calls,0);
assert.equal((await (await ask('/api/synopsis',{title:'Test',original:'Provider text',lang:'en'})).json()).grounded,true);
const verified=await (await ask('/api/synopsis',{title:'Test series LAT',category:'series',generate:true,year:'2020',lang:'es'})).json();
assert.equal(verified.generated,true);
assert.equal(verified.grounded,false);
assert.equal(verified.verified_reference,true);
assert.equal(verified.source,'TVmaze');
assert.match(verified.synopsis,/Fuente: TVmaze/);
assert.match(verified.synopsis,/Una historia comprobada/);
assert(requests.some(x=>x.includes('api.tvmaze.com')&&x.includes('Test%20series')));
assert.deepEqual(await (await ask('/api/synopsis',{title:'Unknown',category:'series',generate:true,lang:'es'})).json(),{grounded:false,generated:false,synopsis:''});
assert.deepEqual((await (await ask('/api/assistant',{question:'comedia',lang:'es',password:'never forwarded'})).json()).keywords,['comedy','comedia']);
allowed=false;
assert.equal((await ask('/api/assistant',{question:'hello'})).status,429);
assert.equal(calls,3);
assert.equal((await ask('/api/assistant')).status,405);
assert.equal((await ask('/unknown')).status,404);
assert.equal((await ask('/api/assistant',{question:'x'.repeat(25000)})).status,413);
assert.equal(cleanWorkTitle('Sabor a ti LAT'),'Sabor a ti');
console.log('PASS: legacy Worker routes, source-backed ES synopsis, no guessing, privacy, quota and fallback');
