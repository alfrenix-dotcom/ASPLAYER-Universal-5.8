/* ASPLAYER 6.0.1 Premium TV — landscape dashboard, portrait unchanged. */
(()=>{'use strict';
const menu=[['⌂','Inicio',['inicio','home']],['▣','TV en vivo',['tv en vivo','live tv']],['▤','Películas',['películas','movies']],['▥','Series',['series']],['▦','Guía EPG',['epg','guía']],['☆','Favoritos',['favoritos','favorites']],['⚙','Ajustes',['ajustes','settings']]];
const tiles=[['▣','TV EN VIVO',1,'live'],['▤','PELÍCULAS',2,'movies'],['▥','SERIES',3,'series'],['▦','GUÍA EPG',4,'epg']];
const nav=document.createElement('nav');nav.className='premium-sidebar';nav.setAttribute('aria-label','Navegación Premium TV');
const shell=document.createElement('section');shell.className='premium-home';shell.setAttribute('aria-label','Inicio Premium TV');
shell.innerHTML='<header class="premium-top"><div><strong>ASPLAYER <em>6.0</em></strong><span>Premium TV · Alftech Solutions</span></div><span class="premium-top-hint">◈ Android TV · Control remoto</span></header><div class="premium-welcome"><p>ENTRETENIMIENTO A TU MANERA</p><h1>Bienvenido a <b>ASPLAYER</b></h1><span>Selecciona una categoría para comenzar</span></div><div class="premium-tiles"></div><footer class="premium-foot">ASPLAYER by Alftech Solutions <span>◀ ▶ Navegar · OK Seleccionar · Atrás Volver</span></footer>';
const tileWrap=shell.querySelector('.premium-tiles');
let lastContent=null,screen='home',lastTile=null;
const canShow=()=>innerWidth>=800&&innerWidth>innerHeight*1.18;
function visible(el){if(!el||!el.isConnected||el.closest('.hidden,[hidden],[aria-hidden="true"]'))return false;const r=el.getBoundingClientRect(),c=getComputedStyle(el);return r.width>2&&r.height>2&&c.visibility!=='hidden'&&c.display!=='none'}
function contentButtons(){return [...document.querySelectorAll('button,a[href],[role="button"],[tabindex="0"]')].filter(el=>!nav.contains(el)&&!shell.contains(el)&&visible(el)&&!el.disabled)}
function target(names){const arr=contentButtons();return arr.find(el=>names.some(name=>(el.textContent||'').trim().toLowerCase()===name))||arr.find(el=>names.some(name=>(el.textContent||el.getAttribute('aria-label')||'').toLowerCase().includes(name)))}
function activeApp(){const auth=document.querySelector('#auth-screen,#login-screen,#login-view');const app=document.querySelector('#app-screen,#main-screen,#app-view');if(app)return visible(app);if(auth&&visible(auth))return false;return !!target(['tv en vivo','live tv'])&&!!target(['películas','movies'])}
function expand(){document.body.classList.add('premium-sidebar-expanded')}
function collapse(){document.body.classList.remove('premium-sidebar-expanded')}
function go(index){if(index===0){screen='home';update();shell.querySelector('.premium-tile')?.focus();return}const t=target(menu[index][2]);if(t){screen='content';update();t.focus();t.click();collapse()}else{screen='home';update();shell.querySelector('.premium-tile')?.focus()}}
const brand=document.createElement('div');brand.className='premium-brand';brand.innerHTML='<strong>◈ ASPLAYER</strong><small>ALFTECH SOLUTIONS</small>';nav.append(brand);
menu.forEach(([glyph,label],i)=>{const b=document.createElement('button');b.type='button';b.className='premium-nav-btn';b.innerHTML='<span class="premium-glyph"></span><span class="premium-label"></span>';b.children[0].textContent=glyph;b.children[1].textContent=label;b.setAttribute('aria-label',label);b.addEventListener('click',()=>go(i));nav.append(b)});
tiles.forEach(([glyph,label,index,kind])=>{const b=document.createElement('button');b.type='button';b.className='premium-tile premium-'+kind;b.innerHTML='<span class="premium-tile-icon"></span><strong></strong><small>EXPLORAR →</small>';b.children[0].textContent=glyph;b.children[1].textContent=label;b.addEventListener('click',()=>{lastTile=b;go(index)});tileWrap.append(b)});
function update(){const on=canShow()&&activeApp();document.body.classList.toggle('premium-tv-active',on);shell.classList.toggle('premium-show',on&&screen==='home');if(!on)collapse();nav.querySelectorAll('.premium-nav-btn').forEach((b,i)=>b.classList.toggle('premium-selected',i===(screen==='home'?0:-1)))}
document.body.append(nav,shell);update();addEventListener('resize',update);
const observer=new MutationObserver(()=>{if(!document.body.classList.contains('premium-tv-active')||!activeApp())update()});observer.observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','style','hidden']});
nav.addEventListener('focusin',expand);
document.addEventListener('focusin',e=>{if(nav.contains(e.target))expand();else if(visible(e.target)&&!shell.contains(e.target)){lastContent=e.target;collapse()}});
document.addEventListener('keydown',e=>{if(!document.body.classList.contains('premium-tv-active')||e.altKey||e.ctrlKey||e.metaKey)return;const a=document.activeElement;if(a?.matches('input,textarea,select,[contenteditable="true"]'))return;
if(e.key==='Escape'||e.key==='Backspace'){if(nav.contains(a)){collapse();(screen==='home'?lastTile:lastContent)?.focus();e.preventDefault()}else if(screen==='content'){screen='home';update();(lastTile||shell.querySelector('.premium-tile'))?.focus();e.preventDefault()}return}
if(e.key==='ArrowLeft'&&!nav.contains(a)){const r=a?.getBoundingClientRect();if(shell.contains(a)||!r||r.left<110){lastContent=a;expand();nav.querySelector('.premium-nav-btn')?.focus();e.preventDefault();return}}
if(nav.contains(a)&&e.key==='ArrowRight'){collapse();(screen==='home'?lastTile||shell.querySelector('.premium-tile'):lastContent||contentButtons()[0])?.focus();e.preventDefault()}
},true);
setInterval(update,1500);
})();