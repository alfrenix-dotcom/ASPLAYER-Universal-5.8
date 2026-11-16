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
:root{--as6-accent:#32d9f2;--as6-bg:#07111f;--as6-panel:#102238}
@media(min-width:850px) and (orientation:landscape){
 body{background:var(--as6-bg);color:#eef7ff}
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
