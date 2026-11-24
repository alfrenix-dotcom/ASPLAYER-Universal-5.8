// Regression tests for the isolated 6.0.5 Android/TV Back-to-exit change.
// Does not require a device or touch any user session.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const java = fs.readFileSync('app/src/main/java/com/alftech/asplayer/universal/MainActivity.java','utf8');
const gradle = fs.readFileSync('app/build.gradle','utf8');
assert.match(gradle, /versionCode\s+6007/);
assert.match(gradle, /versionName\s+'6\.0\.5'/);
assert.match(gradle, /applicationId 'com\.alftech\.asplayer\.universal\.vlc\.final\.v592'/);
assert.match(java, /getAppVersion\(\)\s*\{\s*return "6\.0\.5";/);
assert.match(java, /@JavascriptInterface public void requestExit\(\)/);
assert.match(java, /finishAffinity\(\)/);
assert.match(java, /AlertDialog\.BUTTON_NEGATIVE/);
assert.match(java, /if\(playerVisible\)\{/);
const start = java.indexOf('else evaluate("(function(){"');
const end = java.indexOf('+"})()");', start);
assert(start >= 0 && end > start, 'Back-to-exit routing in the native bridge');
const javaExpr = java.slice(start, end+'+"})()");'.length);
const script = [...javaExpr.matchAll(/"([^"]*)"/g)].map(m=>m[1]).join('');
assert(script.startsWith('(function(){') && script.endsWith('})()'));
function run({ auth=false, home=false, overlay=false, field=false }) {
  const events = [];
  const el=(visible)=>({classList:{contains:(name)=>name==='hidden'?!visible:false}});
  const document={
    activeElement:{ matches:()=>field, blur:()=>events.push('blur') },
    getElementById(id) {
      return { 'auth-screen': el(auth), 'app-shell': el(!auth), 'view-home': el(home) }[id];
    },
    querySelectorAll(){return [el(overlay)];}
  };
  vm.runInNewContext(script,{
    document,
    window:{ASPLAYER_BACK:()=>events.push('navigate')},
    ASPLAYER:{requestExit:()=>events.push('confirmExit')}
  });
  return events.join(',');
}
assert.equal(run({auth:true}), 'confirmExit', 'login root prompts to exit');
assert.equal(run({home:true}), 'confirmExit', 'home root prompts to exit');
assert.equal(run({home:false}), 'navigate', 'catalog returns through existing Back handler');
assert.equal(run({home:true,overlay:true}), 'navigate', 'dialog has priority over exit');
assert.equal(run({home:true,field:true}), 'navigate,blur', 'text field never triggers immediate exit');
console.log('6.0.5 Back-to-exit routing regression tests passed');
