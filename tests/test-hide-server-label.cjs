const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app/src/main/assets/app.js','utf8');
const match=app.match(/function renderCatalogTile\(it,i\)\{[^\n]+\}/);
assert.ok(match,'Catalog renderer found');
const serverHost='play.example-provider.net:8080';
const esc=s=>String(s).replace(/[&<>"']/g,'');
const context={safeImage:s=>String(s||''),esc,server:()=>({name:serverHost})};
vm.createContext(context);
vm.runInContext(match[0]+'\nthis.render=renderCatalogTile;',context);
for(const [kind,item] of [
 ['TV',{name:'Channel One',stream_icon:'https://assets.example/c.png',stream_id:'11'}],
 ['Movie',{name:'Movie One',stream_icon:'https://assets.example/m.png',stream_id:'22'}],
 ['Series',{name:'Series One',cover:'https://assets.example/s.png',series_id:'33'}]]){
 const html=context.render(item,0);
 assert.ok(html.includes(item.name),kind+' title must remain');
 assert.ok(html.includes('class="cover"'),kind+' artwork slot must remain');
 assert.ok(html.includes('data-item="0"'),kind+' item identity must remain');
 assert.ok(!html.includes(serverHost),kind+' must not reveal server name');
 assert.ok(!html.includes('<small>'),kind+' must have no provider subtitle');
}
assert.ok(app.includes("server().base+'/'+path"),'Playback provider URL generation must be retained');
console.log('PASS: Live/Movies/Series tiles omit provider host; artwork, names, identity and playback unchanged');
