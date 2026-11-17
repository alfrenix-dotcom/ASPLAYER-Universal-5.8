#!/usr/bin/env python3
"""Share the two-pane catalog with touch devices, without remote focus capture."""
from pathlib import Path
p=Path("app/src/main/assets/features-5.9.3.js")
s=p.read_text()
def replace(old,new):
    global s
    assert s.count(old)==1,(old,s.count(old))
    s=s.replace(old,new,1)
mobile_css=r"""
  body:not(.asplayer-tv-dpad) #view-catalog .sectionhead{margin:12px 0 10px}
  body:not(.asplayer-tv-dpad) #view-catalog .fav-preview{display:none}
  body:not(.asplayer-tv-dpad) #tv-catalog-layout{display:grid;grid-template-columns:minmax(108px,34%) minmax(0,1fr);gap:10px;align-items:start}
  body:not(.asplayer-tv-dpad) #tv-category-pane{display:flex;flex-direction:column;min-width:0;height:calc(100vh - 140px);height:calc(100dvh - 140px);min-height:150px;border:1px solid #39516b;border-radius:12px;background:#101b31;padding:4px}
  body:not(.asplayer-tv-dpad) #tv-content-pane{display:block;min-width:0;height:calc(100vh - 140px);height:calc(100dvh - 140px);min-height:150px;overflow-y:auto;overflow-x:hidden;padding:3px 5px 12px;scrollbar-width:thin;overscroll-behavior:contain}
  body:not(.asplayer-tv-dpad) #category-tools{flex:none;margin:0 0 4px;padding:8px 5px;font-size:11px}
  body:not(.asplayer-tv-dpad) #category-expand{display:none!important}
  body:not(.asplayer-tv-dpad) #categories,body:not(.asplayer-tv-dpad) #categories.expanded{display:flex;flex-direction:column;flex-wrap:nowrap;flex:1;min-height:0;max-height:none;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;gap:5px;padding:4px}
  body:not(.asplayer-tv-dpad) #categories button{flex:none;width:100%;text-align:left;white-space:normal;overflow-wrap:anywhere;min-height:44px;font-size:13px;line-height:1.25;padding:8px}
  body:not(.asplayer-tv-dpad) #categories button.active{background:#12637d;color:white}
  body:not(.asplayer-tv-dpad) #tv-content-pane .catalogtools{margin:0 0 6px;gap:4px}
  body:not(.asplayer-tv-dpad) #tv-content-pane #search{width:100%;min-width:0;padding:9px 8px;font-size:14px}
  body:not(.asplayer-tv-dpad) #tv-results-bar{display:flex;align-items:center;margin:4px 0 9px;padding:6px 2px;border-bottom:1px solid #39516b}
  body:not(.asplayer-tv-dpad) #tv-back-categories{display:none}
  body:not(.asplayer-tv-dpad) #tv-results-title{font-size:15px;overflow-wrap:anywhere}
  body:not(.asplayer-tv-dpad) #cards{display:flex;flex-direction:column;gap:7px;padding:2px}
  body:not(.asplayer-tv-dpad) #cards .tile{display:flex;align-items:center;width:100%;min-height:65px;background:#111f38}
  body:not(.asplayer-tv-dpad) #cards .cover{flex:0 0 58px;width:58px;height:65px;overflow:hidden;border-radius:8px 0 0 8px;font-size:21px}
  body:not(.asplayer-tv-dpad) #cards .cover img{width:100%;height:100%;object-fit:contain}
  body:not(.asplayer-tv-dpad) #cards .caption{flex:1;min-width:0;padding:7px 6px;white-space:normal;overflow-wrap:anywhere}
  body:not(.asplayer-tv-dpad) #cards .caption strong{font-size:13px;display:block;white-space:normal}
  body:not(.asplayer-tv-dpad) #cards .caption small{font-size:10px}
  body:not(.asplayer-tv-dpad) #cards .fav-tile{display:flex;flex-direction:row;align-items:center;gap:4px;min-width:0}
  body:not(.asplayer-tv-dpad) #cards .fav-tile .tile{flex:1;min-width:0}
  body:not(.asplayer-tv-dpad) #cards .fav-star{position:static;flex:0 0 44px;min-width:44px;min-height:44px;font-size:18px}
  @media(max-width:640px){
    body:not(.asplayer-tv-dpad) #tv-catalog-layout{grid-template-columns:minmax(100px,36%) minmax(0,1fr);gap:7px}
    body:not(.asplayer-tv-dpad) #tv-category-pane,body:not(.asplayer-tv-dpad) #tv-content-pane{height:calc(100vh - 192px);height:calc(100dvh - 192px)}
    body:not(.asplayer-tv-dpad) #cards .cover{flex-basis:46px;width:46px;height:62px}
    body:not(.asplayer-tv-dpad) #cards .caption{padding:6px 4px}
  }
  @media(max-height:500px) and (orientation:landscape){
    body:not(.asplayer-tv-dpad) #tv-category-pane,body:not(.asplayer-tv-dpad) #tv-content-pane{height:calc(100dvh - 100px)}
  }
"""
replace("\n`;\ndocument.head.appendChild(categoryStyle);","\n"+mobile_css+"\n`;\ndocument.head.appendChild(categoryStyle);")
replace("if(!remote||defaultCategorySelection||!catalogTabs.includes(active))return;",
        "if(defaultCategorySelection||!catalogTabs.includes(active))return;")
replace("    resultBar.scrollIntoView({block:'start',behavior:'auto'});\n    focusElement(first);",
        """    if(remote){
      resultBar.scrollIntoView({block:'start',behavior:'auto'});
      focusElement(first);
    }else{
      contentPane.scrollTop=Math.max(0,contentPane.scrollTop+resultBar.getBoundingClientRect().top-contentPane.getBoundingClientRect().top-6);
    }""")
replace("    resultBar.scrollIntoView({block:'start',behavior:'auto'});\n    focusElement(backCats);",
        """    if(remote){
      resultBar.scrollIntoView({block:'start',behavior:'auto'});
      focusElement(backCats);
    }else contentPane.scrollTop=0;""")
p.write_text(s)
print("Mobile 5.9.13: responsive vertical category/content panes; automatic touch scroll without focus stealing")
