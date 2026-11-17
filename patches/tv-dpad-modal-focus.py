#!/usr/bin/env python3
"""One remote controller, with an exclusive focus scope for dialogs."""
from pathlib import Path

assets = Path("app/src/main/assets")
app = assets / "app.js"
s = app.read_text(encoding="utf-8")
# Preserve the original Back/Escape handling but remove the competing
# document-wide spatial navigation that could select the obscured catalog.
start = s.index(" if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;")
end = s.index("\n// Resume/foreground", start)
assert s[start:end].endswith("});")
s = s[:start] + "});" + s[end:]
app.write_text(s, encoding="utf-8")

java = Path("app/src/main/java/com/alftech/asplayer/universal/MainActivity.java")
s = java.read_text(encoding="utf-8")
anchor = "    private final class Bridge {"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + """
        @JavascriptInterface public boolean isAndroidTv() {
            return (getResources().getConfiguration().uiMode
                  & Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION
                || getPackageManager().hasSystemFeature("android.software.leanback");
        }
""", 1)
java.write_text(s, encoding="utf-8")

p = assets / "features-5.9.3.js"
s = p.read_text(encoding="utf-8")
start = s.index("function visible(el){")
end = s.index("\nconst panel=document.createElement('div');", start)
assert s[start:end].count("document.addEventListener('keydown'") == 1
replacement = r"""
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
  el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  return true;
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
  const arrow=Object.prototype.hasOwnProperty.call(arrows,e.key);
  const ok=['Enter','Accept','Select',' '].includes(e.key);
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
  navigate(e.key);
},true);
"""
assert "navigate(e.key)" in replacement and "stopImmediatePropagation" in replacement
s = s[:start] + replacement + s[end:]
assert s.count("document.addEventListener('keydown'") == 1
p.write_text(s, encoding="utf-8")
print("TV focus: replaced both old directional handlers; isolated dialogs and restored opener")
