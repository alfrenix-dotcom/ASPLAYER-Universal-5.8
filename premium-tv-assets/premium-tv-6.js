/* ASPLAYER 6.0 Premium TV preview: sidebar and D-pad accessibility.
   Never reads or stores credentials. Existing playback and auth remain owned by 5.9.7. */
(()=>{'use strict';
const mq=matchMedia('(min-width:760px) and (pointer:coarse)');
const items=[['⌂','Inicio',['inicio','home']],['▣','TV en vivo',['tv en vivo','live tv']],['▤','Películas',['películas','movies']],['▥','Series',['series']],['▦','Guía EPG',['epg','guía']],['☆','Favoritos',['favoritos','favorites']],['⚙','Ajustes',['ajustes','settings']]];
const nav=document.createElement('nav');nav.className='premium-sidebar';nav.setAttribute('aria-label','Navegación ASPLAYER Premium TV');
let lastContent=null;
function visible(el){if(!el||!el.isConnected||el.closest('.hidden,[hidden],[aria-hidden="true"]'))return false;const r=el.getBoundingClientRect();const c=getComputedStyle(el);return r.width>2&&r.height>2&&c.visibility!=='hidden'&&c.display!=='none'}
function focusables(){return [...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,[role=button],[tabindex]:not([tabindex="-1"])')].filter(el=>!nav.contains(el)&&visible(el)&&!el.disabled)}
function findTarget(names){return focusables().find(el=>names.some(name=>(el.textContent||el.getAttribute('aria-label')||'').trim().toLowerCase().includes(name)))}
items.forEach(([icon,label,names])=>{const b=document.createElement('button');b.type='button';b.innerHTML='<span aria-hidden="true"></span><span class="premium-label"></span>';b.firstChild.textContent=icon;b.lastChild.textContent=label;b.setAttribute('aria-label',label);b.addEventListener('click',()=>{const target=findTarget(names);if(target){target.focus();target.click()}else{const first=focusables()[0];if(first)first.focus()}collapse()});nav.appendChild(b)});
const brand=document.createElement('div');brand.className='premium-brand';brand.textContent='ASPLAYER 6.0';nav.prepend(brand);
function expand(){document.body.classList.add('premium-sidebar-expanded')}
function collapse(){document.body.classList.remove('premium-sidebar-expanded')}
function isTV(){return innerWidth>=760 && (mq.matches||!!document.querySelector('[data-tv-mode],.tv-mode'))}
function update(){document.body.classList.toggle('premium-tv-active',isTV());if(!isTV())collapse()}
document.body.appendChild(nav);update();addEventListener('resize',update);
nav.addEventListener('focusin',expand);
document.addEventListener('focusin',e=>{if(nav.contains(e.target))expand();else if(visible(e.target)){lastContent=e.target;collapse()}});
document.addEventListener('keydown',e=>{if(!isTV()||e.altKey||e.ctrlKey||e.metaKey)return;
 const a=document.activeElement;
 if(a?.matches('input,textarea,select,[contenteditable="true"]'))return;
 if(e.key==='ArrowLeft'&&!nav.contains(a)){
   const candidates=focusables();if(!candidates.length)return;
   const r=a?.getBoundingClientRect();const min=Math.min(...candidates.map(x=>x.getBoundingClientRect().left));
   if(!r||r.left<=min+24){lastContent=a;expand();nav.querySelector('button')?.focus();e.preventDefault();return}
 }
 if(nav.contains(a)&&e.key==='ArrowRight'){collapse();const t=visible(lastContent)?lastContent:focusables()[0];t?.focus();e.preventDefault();return}
 if(nav.contains(a)&&e.key==='Escape'){collapse();lastContent?.focus();e.preventDefault()}
},true);
})();