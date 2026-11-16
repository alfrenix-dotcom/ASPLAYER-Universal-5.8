#!/usr/bin/env python3
"""First-pass Sunset-inspired TV presentation and focus handling for ASPLAYER 6.
Keeps the existing ASPLAYER DOM, playback bridge, accounts and server configuration.
This is an incremental UI layer, not a pixel-exact Sunset clone.
"""
from pathlib import Path
root=Path("app/src/main/assets")
html=root/"index.html"
s=html.read_text("utf-8")
needle='<script src="features-5.9.3.js"></script>'
assert s.count(needle)==1, "Cannot find unique HTML body insertion"
assert "asplayer-6-tv.js" not in s, "6.0 UI already injected"
s=s.replace(needle,'<script src="asplayer-6-tv.js"></script>\n'+needle,1)
html.write_text(s,"utf-8")
(root/"asplayer-6-tv.js").write_text(r'''(function(){
"use strict";
const css=document.createElement("style");
css.textContent=`
:root{--as6-accent:#24d9ec;--as6-bg:#080e1c;--as6-panel:#161f32;--as6-gold:#ffca3d}
@media(min-width:850px) and (orientation:landscape){
 body{background:var(--as6-bg)!important;color:#f4f7fd!important;font-family:system-ui,Roboto,sans-serif}
 #view-live,#view-movies,#view-series,#view-tv,#view-vod,#view-settings,
 main,.app-shell,.content,.main-content{background:var(--as6-bg);color:#f4f7fd}
 #as6-shell{display:grid;grid-template-columns:minmax(210px,23vw) minmax(0,1fr);gap:22px;align-items:start;width:100%;min-height:65vh}
 #as6-sidebar{background:#0b1221;border:1px solid #253148;border-radius:18px;padding:22px 14px;position:sticky;top:16px;max-height:85vh;overflow-y:auto}
 #as6-sidebar h2{font-size:17px;letter-spacing:1.3px;color:var(--as6-gold);margin:4px 10px 18px}
 #as6-sidebar button{display:block;width:100%;text-align:left;padding:15px 13px;margin:6px 0;background:transparent;border:1px solid transparent;border-radius:12px;color:#c8d3e2;font-size:16px}
 #as6-sidebar button[aria-current="true"],#as6-sidebar button:focus{background:#0b3544!important;border-color:var(--as6-accent)!important;color:var(--as6-gold)!important}
 #as6-content{min-width:0;padding:6px 10px 28px}
 #as6-content h1,#as6-content h2{color:var(--as6-gold)}
 #as6-content input[type="search"],#as6-content input[type="text"]{background:#1c2637;color:#fff;border:1px solid #3b4a61;border-radius:12px;min-height:52px}
 #as6-content .card,#as6-content .item,#as6-content .channel,#as6-content .movie,#as6-content .series-card{background:#182234;border:1px solid #26354c;border-radius:16px}
 #as6-content button{min-height:48px}
 button,.card,[role="button"]{transition:transform .13s ease,box-shadow .13s ease,border-color .13s ease}
 button:focus-visible,a:focus-visible,[tabindex]:focus-visible,
 .card:focus-visible,[role="button"]:focus-visible{
 outline:3px solid var(--as6-accent)!important;outline-offset:3px!important;
 box-shadow:0 0 0 5px #082b45,0 0 22px #32d9f27a!important;
 transform:scale(1.025);z-index:8;position:relative
 }
}
`;
document.head.appendChild(css);
function buildTvLayout(){
 if(!window.matchMedia('(min-width:850px) and (orientation:landscape)').matches)return;
 const root=document.querySelector('#view-live:not(.hidden),#view-movies:not(.hidden),#view-series:not(.hidden),#view-tv:not(.hidden),#view-vod:not(.hidden)');
 if(!root||root.querySelector('#as6-shell'))return;
 // Reuse the existing category controls, without cloning event handlers.
 const groups=[...root.querySelectorAll('[class*="categor"],[id*="categor"],aside')].filter(el=>
  el!==root && el.querySelectorAll('button,[role="button"],a').length>=2 &&
  el.querySelectorAll('button,[role="button"],a').length<150);
 const group=groups.sort((a,b)=>a.querySelectorAll('button').length-b.querySelectorAll('button').length)[0];
 if(!group)return;
 const shell=document.createElement('div');shell.id='as6-shell';
 const sidebar=document.createElement('div');sidebar.id='as6-sidebar';
 const content=document.createElement('div');content.id='as6-content';
 const heading=document.createElement('h2');heading.textContent='CATEGORÍAS';sidebar.appendChild(heading);
 const marker=document.createComment('as6-layout');root.insertBefore(marker,root.firstChild);
 const original=[...root.childNodes].filter(n=>n!==marker);
 for(const node of original)content.appendChild(node);
 // Move the real category node, retaining its existing click handlers.
 sidebar.appendChild(group);shell.append(sidebar,content);root.insertBefore(shell,marker);marker.remove();
 const buttons=[...group.querySelectorAll('button,[role="button"],a')];
 buttons.forEach(btn=>btn.addEventListener('click',()=>{
  buttons.forEach(x=>x.removeAttribute('aria-current'));
  btn.setAttribute('aria-current','true');
  requestAnimationFrame(()=>{const first=content.querySelector('.card,.item,.channel,.movie,[role="listitem"]');
   if(first)first.scrollIntoView({block:'start',behavior:'smooth'});});
 }));
}
let layoutScheduled=false;
new MutationObserver(()=>{
 if(layoutScheduled)return;layoutScheduled=true;
 requestAnimationFrame(()=>{layoutScheduled=false;buildTvLayout();});
}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
buildTvLayout();

const selector='button:not([disabled]),a[href],select:not([disabled]),input:not([disabled]),[role="button"],[tabindex]:not([tabindex="-1"])';
function visible(el){
 if(!el||!el.isConnected||el.closest('[aria-hidden="true"],.hidden,[inert]'))return false;
 const st=getComputedStyle(el),r=el.getBoundingClientRect();
 return st.display!=='none'&&st.visibility!=='hidden'&&r.width>2&&r.height>2;
}
function scope(){
 const modal=[...document.querySelectorAll('[role="dialog"],.modal')].filter(visible).pop();
 return modal||document;
}
function candidates(){return [...scope().querySelectorAll(selector)].filter(visible);}
function move(key){
 const items=candidates(),current=document.activeElement;
 if(!items.length)return false;
 if(!items.includes(current)){items[0].focus({preventScroll:true});items[0].scrollIntoView({block:'nearest'});return true;}
 const r=current.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
 const vector={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
 if(!vector)return false;
 let best=null,bestScore=Infinity;
 for(const el of items){
  if(el===current)continue;
  const b=el.getBoundingClientRect(),dx=b.left+b.width/2-x,dy=b.top+b.height/2-y;
  const forward=dx*vector[0]+dy*vector[1],lateral=Math.abs(dx*vector[1]-dy*vector[0]);
  if(forward<=3)continue;
  const score=forward+2.8*lateral;
  if(score<bestScore){best=el;bestScore=score;}
 }
 if(!best)return false;
 best.focus({preventScroll:true});
 best.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
 return true;
}
// Capture before the legacy 5.9.3 spatial handler to prevent conflicting moves.
// Native VLC player controls remain managed by Android, not this DOM listener.
document.addEventListener('keydown',function(e){
 if(!window.matchMedia('(min-width:850px) and (orientation:landscape)').matches)return;
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
 const a=document.activeElement;
 if(a&&((a.tagName==='INPUT'&&a.type!=='button')||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable))return;
 if(move(e.key)){e.preventDefault();e.stopImmediatePropagation();}
},true);
document.addEventListener('focusin',e=>{
 if(e.target&&e.target.scrollIntoView) e.target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
},true);
})();''',"utf-8")
print("ASPLAYER 6 TV UI layer injected; visual/remote tests still required")
