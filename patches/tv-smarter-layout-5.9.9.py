#!/usr/bin/env python3
"""ASPLAYER TV-first Smarters-inspired layout, original Alftech branding.
Apply after all other patches, before JS syntax validation.
No external brand artwork or proprietary assets.
"""
from pathlib import Path
p=Path("app/src/main/assets/index.html")
s=p.read_text("utf-8")
assert s.count("</head>")==1, "unexpected HTML head"
assert 'id="app-shell"' in s and 'id="view-catalog"' in s
css=r"""
<style id="asplayer-tv-first-599">
/* Landscape Android TV / large-screen remote layout only. */
@media (min-width:900px) and (orientation:landscape) {
  :root { color-scheme:dark; }
  body { background:#07101d !important; }
  #app-shell.shell { display:grid !important; grid-template-columns:230px minmax(0,1fr);
    align-items:stretch; min-height:100vh; max-width:none !important; gap:0 !important; }
  #app-shell.shell.hidden { display:none !important; }
  #app-shell .sidebar { position:sticky; top:0; height:100vh; overflow-y:auto;
    display:flex !important; flex-direction:column; gap:9px; padding:24px 14px !important;
    background:linear-gradient(180deg,#111f36,#091321) !important;
    border-right:1px solid #27435e; width:auto !important; transform:none !important; }
  #app-shell .sidebar .brand { margin-bottom:24px; }
  #app-shell .sidebar .nav { display:flex !important; align-items:center; gap:12px;
    min-height:60px; padding:10px 15px; border-radius:12px; text-align:left;
    font-size:18px; }
  #app-shell .sidebar .navico { font-size:25px; min-width:30px; }
  #app-shell .sidebar .navlabel { display:inline !important; }
  #app-shell main, #app-shell .main, #app-shell .content {
    min-width:0; max-width:none !important; }
  #view-home .hero { border-radius:20px; padding:28px !important; }
  #view-catalog #categories { display:flex; flex-wrap:nowrap; gap:10px;
    overflow-x:auto; overscroll-behavior-x:contain; padding:12px 4px 18px; }
  #view-catalog #categories button { flex:0 0 auto; min-height:54px;
    padding:10px 19px; border-radius:12px; }
  #view-catalog #cards.tiles { display:grid;
    grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:18px; }
  #view-catalog .catalogtools { position:relative; }
  #view-catalog #search { min-height:56px; font-size:19px; }
  #view-settings button, #view-settings select { min-height:52px; }
  #app-shell button:focus-visible, #app-shell a:focus-visible,
  #app-shell input:focus-visible, #app-shell select:focus-visible,
  #app-shell [tabindex]:focus-visible {
    outline:4px solid #f9d35d !important; outline-offset:3px !important;
    box-shadow:0 0 0 6px #153f5b !important;
    scroll-margin:70px; z-index:10; }
  #app-shell button, #app-shell a, #app-shell [tabindex] {
    transition:background-color .12s ease,box-shadow .12s ease !important; }
  #mobilebar { display:none !important; }
}
</style>
"""
s=s.replace("</head>",css+"\n</head>",1)
# Add an actual home dashboard wired to existing navigation actions.
# Only visible on landscape TVs; no demo catalog or fake download actions.
js=r"""
<script id="asplayer-tv-dashboard-599">
(function(){
  const css=document.createElement('style');
  css.textContent=`
  @media (min-width:900px) and (orientation:landscape){
    #app-shell{display:block!important}
    #app-shell.hidden{display:none!important}
    #app-shell>.sidebar{display:none!important}
    #app-shell>main{max-width:none!important;padding:26px 3.2vw 70px!important}
    #view-home>.hero{display:none!important}
    #asplayer-tv-dashboard{display:block;margin:8px 0 30px}
    .as-tv-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;gap:22px}
    .as-tv-logo{font-size:clamp(26px,3vw,48px);font-weight:900;letter-spacing:1px}
    .as-tv-logo span{color:#bc80ff}.as-tv-logo small{display:block;font-size:14px;font-weight:500;text-align:center;letter-spacing:.4px}
    .as-tv-clock{font-size:23px;color:#e5e8ff}
    .as-tv-main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px}
    .as-tv-tile{border:2px solid #ffffff22;border-radius:24px;min-height:190px;
      color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:20px;font-size:clamp(18px,2.1vw,30px);font-weight:800}
    .as-tv-tile .as-tv-ico{font-size:55px}
    .as-tv-tile:nth-child(1){background:linear-gradient(130deg,#176de9,#6821df)}
    .as-tv-tile:nth-child(2){background:linear-gradient(130deg,#ff8835,#b91b56)}
    .as-tv-tile:nth-child(3){background:linear-gradient(130deg,#00bc91,#1167a4)}
    .as-tv-tile:nth-child(4){background:linear-gradient(130deg,#a75bfa,#6526b7)}
    .as-tv-small{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px;margin-top:25px}
    .as-tv-small button{min-height:82px;border:1px solid #5c68a1;border-radius:18px;
      background:linear-gradient(130deg,#273e77,#1d204d);font-size:21px;font-weight:700;color:white}
    .as-tv-tile:focus,.as-tv-small button:focus{outline:5px solid #ffcf27!important;
      outline-offset:3px!important;box-shadow:0 0 22px #ffcc35aa!important;transform:none}
    #view-home .posters{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:17px}
    #view-home h2{font-size:25px}
  }
  @media not all and (min-width:900px){#asplayer-tv-dashboard{display:none}}
  `;
  document.head.appendChild(css);
  function make(label,ico,nav,cls){
    const b=document.createElement('button');b.type='button';b.className=cls;
    const i=document.createElement('span');i.className='as-tv-ico';i.textContent=ico;
    const t=document.createElement('span');t.textContent=label;
    b.append(i,t);
    b.addEventListener('click',()=>{const target=document.querySelector('[data-nav="'+nav+'"]');if(target)target.click();});
    return b;
  }
  function init(){
    const home=document.querySelector('#view-home');
    if(!home||document.querySelector('#asplayer-tv-dashboard'))return;
    const root=document.createElement('div');root.id='asplayer-tv-dashboard';
    const head=document.createElement('div');head.className='as-tv-head';
    const logo=document.createElement('div');logo.className='as-tv-logo';
    logo.innerHTML='<span>▶</span> ASPLAYER <small>Alftech Solutions · v5.9.9</small>';
    const clock=document.createElement('div');clock.className='as-tv-clock';
    const update=()=>{clock.textContent=new Date().toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});};
    update();setInterval(update,60000);head.append(logo,clock);
    const tiles=document.createElement('div');tiles.className='as-tv-main';
    [['TV en Vivo','▣','live'],['Películas','▶','vod'],['Series','▤','series'],['Listas (Xtream)','☷','settings']].forEach(x=>tiles.append(make(...x,'as-tv-tile')));
    const small=document.createElement('div');small.className='as-tv-small';
    [['Favoritos','☆','home'],['Continuar viendo','◴','home'],['Buscar','⌕','vod'],['Ajustes','⚙','settings']].forEach(x=>small.append(make(x[0]+'  '+x[1],'',x[2],'as-tv-shortcut')));
    root.append(head,tiles,small);home.prepend(root);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
</script>
"""
assert s.count("</head>")==1
s=s.replace("</head>",js+"\\n</head>",1)
p.write_text(s,"utf-8")
print("TV-first ASPLAYER layout injected without modifying Android package/signing")
