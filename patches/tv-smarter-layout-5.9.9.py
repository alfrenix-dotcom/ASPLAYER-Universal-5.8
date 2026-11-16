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
p.write_text(s,"utf-8")
print("TV-first ASPLAYER layout injected without modifying Android package/signing")
