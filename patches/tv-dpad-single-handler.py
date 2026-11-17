#!/usr/bin/env python3
"""Replace 5.9.3 capture-phase D-pad listener with one scoped TV navigation handler.
Apply AFTER upgrade-5.9.3.py. Refuse unexpected source rather than stacking listeners.
"""
from pathlib import Path
p=Path("app/src/main/assets/features-5.9.3.js")
s=p.read_text(encoding="utf-8")
start=s.index("document.addEventListener('focusin',e=>")
end=s.index("\nconst panel=document.createElement('div');",start)
legacy=s[start:end]
assert legacy.count("document.addEventListener('keydown'")==1
replacement="""// Single scoped TV controller: do not install on touch-only phones.
const isTvDpad=!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches
  && (document.body.classList.contains('android-tv')||/Android TV|Google TV|AFT[A-Z]/i.test(navigator.userAgent)))
  || !!(window.AndroidTVNavigation);
let lastDpadAt=0;
function focusCandidate(el){
  if(!el)return false;
  el.focus({preventScroll:true});
  if(document.activeElement!==el)return false;
  el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
  highlight(el);return true;
}
if(isTvDpad){
  document.addEventListener('focusin',e=>{
    if(e.target.matches?.(focusable))highlight(e.target);
  });
  document.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    const a=document.activeElement,tag=a?.tagName;
    if(tag==='SELECT'||tag==='TEXTAREA'||(tag==='INPUT'&&a.type!=='button')||a?.isContentEditable)return;
    // Native player receives remote keys independently; never steal timeline seeking.
    if(document.querySelector('.playeroverlay:not(.hidden)'))return;
    if(e.repeat&&Date.now()-lastDpadAt<90){e.preventDefault();e.stopImmediatePropagation();return;}
    lastDpadAt=Date.now();
    if(navigate(e.key)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
}
"""
s=s[:start]+replacement+s[end:]
assert s.count("document.addEventListener('keydown'")==1
p.write_text(s,encoding="utf-8")
print("Replaced legacy capture D-pad listener; no duplicate 5.9.3 handler")
