#!/usr/bin/env python3
"""Apply after tv-dpad-modal-focus.py. Improve TV catalog and native LibVLC input."""
from pathlib import Path
import re

base = Path("app/src/main")
assets = base / "assets"
def change(s, old, new):
    assert s.count(old) == 1, (old[:120], s.count(old))
    return s.replace(old,new,1)

# Hook the real committed selection, including the async parental PIN path.
p=assets/"app.js"
s=p.read_text()
s=change(s,"renderCats();loadItems()};if(parentEnabled&&cat",
         "renderCats();loadItems();window.ASPLAYER_TV_CATEGORY?.(id)};if(parentEnabled&&cat")
p.write_text(s)
p=assets/"features-5.7.1.js"
s=p.read_text()
s=change(s,"if(id==='favorites'&&active==='live')return loadFavoriteList();return historicalTryCategory(id)",
         "if(id==='favorites'&&active==='live'){loadFavoriteList();window.ASPLAYER_TV_CATEGORY?.(id);return;}return historicalTryCategory(id)")
p.write_text(s)
p=assets/"features-5.8.js"
s=p.read_text()
assert s.count("settings.bufferProfile||'normal'")==2
s=s.replace("settings.bufferProfile||'normal'","settings.bufferProfile||'adaptive'")
p.write_text(s)

p=assets/"features-5.9.3.js"
s=p.read_text()
catalog=r"""
// Category selection is a two-stage TV interaction: move to the results
// while the request runs, then focus the first real item when it arrives.
const resultBar=document.createElement('div');
resultBar.id='tv-results-bar';
resultBar.innerHTML='<button type="button" class="ghost" id="tv-back-categories"></button><strong id="tv-results-title"></strong>';
const cards=document.getElementById('cards');
cards.before(resultBar);
const backCats=resultBar.querySelector('button');
const categoryList=document.getElementById('categories');
const catTools=document.getElementById('category-tools');
const layout=document.createElement('div');layout.id='tv-catalog-layout';
catTools.before(layout);
const categoryPane=document.createElement('div');categoryPane.id='tv-category-pane';
const contentPane=document.createElement('div');contentPane.id='tv-content-pane';
layout.append(categoryPane,contentPane);
categoryPane.append(catTools,categoryList);
contentPane.append(document.querySelector('.catalogtools'));
const globalStatus=document.getElementById('all-global-status');
if(globalStatus)contentPane.append(globalStatus);
contentPane.append(resultBar,cards,document.getElementById('loadmore'));
let pendingCategory=null, defaultCategorySelection=false;
const catalogTabs=['live','vod','series'];
const categoryStyle=document.createElement('style');
categoryStyle.textContent=`
  #tv-catalog-layout,#tv-category-pane,#tv-content-pane{display:contents}
  #tv-results-bar{display:none}
  body.asplayer-tv-dpad main{margin:0 auto;padding-bottom:22px}
  body.asplayer-tv-dpad #view-catalog .sectionhead{margin:8px 0 14px}
  body.asplayer-tv-dpad #view-catalog .fav-preview{display:none}
  body.asplayer-tv-dpad #tv-catalog-layout{display:grid;grid-template-columns:minmax(155px,30%) minmax(0,1fr);gap:18px;align-items:start}
  body.asplayer-tv-dpad #tv-category-pane{display:flex;flex-direction:column;min-width:0;max-height:calc(100vh - 135px);border:1px solid #39516b;border-radius:14px;background:#101b31;padding:6px}
  body.asplayer-tv-dpad #tv-content-pane{display:block;min-width:0;max-height:calc(100vh - 135px);overflow-y:auto;overflow-x:hidden;padding:7px 12px 18px 7px;scrollbar-width:thin}
  body.asplayer-tv-dpad #category-tools{flex:none;margin:0 0 6px;padding:12px 8px}
  body.asplayer-tv-dpad #category-expand{display:none!important}
  body.asplayer-tv-dpad #categories,body.asplayer-tv-dpad #categories.expanded{display:flex;flex-direction:column;flex-wrap:nowrap;flex:1;min-height:0;max-height:none;overflow-y:auto;overflow-x:hidden;gap:7px;padding:7px}
  body.asplayer-tv-dpad #categories button{flex:none;width:100%;text-align:left;white-space:normal;min-height:46px;font-size:15px;line-height:1.2;padding:11px;scroll-margin:8px}
  body.asplayer-tv-dpad #categories button.active{background:#12637d;color:white}
  body.asplayer-tv-dpad #tv-results-bar{display:flex;align-items:center;gap:20px;margin:18px 0 14px;padding:8px 4px;scroll-margin-top:18px}
  body.asplayer-tv-dpad #tv-results-bar button{min-height:52px;font-size:16px}
  body.asplayer-tv-dpad #tv-results-title{font-size:20px}
  body.asplayer-tv-dpad #cards{display:flex;flex-direction:column;gap:9px;padding:5px}
  body.asplayer-tv-dpad #cards .tile{display:flex;align-items:center;width:100%;min-height:78px;scroll-margin:12px;background:#111f38}
  body.asplayer-tv-dpad #cards .cover{flex:0 0 92px;width:92px;height:78px;border-radius:10px 0 0 10px;overflow:hidden}
  body.asplayer-tv-dpad #cards .cover img{width:100%;height:100%;object-fit:contain}
  body.asplayer-tv-dpad #cards .caption{flex:1;min-width:0;white-space:normal;padding:9px 14px}
  body.asplayer-tv-dpad #cards .caption strong{font-size:18px;display:block;white-space:normal}
  body.asplayer-tv-dpad #cards .fav-tile{display:flex;flex-direction:row;gap:8px;align-items:center;min-width:0}
  body.asplayer-tv-dpad #cards .fav-tile .tile{flex:1;min-width:0}
  body.asplayer-tv-dpad #cards .fav-star{position:static;flex:0 0 56px;min-height:54px}
`;
document.head.appendChild(categoryStyle);
function selectedCategoryButton(){
  return Array.from(document.querySelectorAll('#categories [data-category]'))
    .find(el=>String(el.dataset.category)===String(category));
}
function updateResultBar(){
  backCats.textContent=t('↑ Categorías','↑ Categories');
  const chosen=selectedCategoryButton();
  resultBar.querySelector('strong').textContent=chosen?.textContent?.trim()||t('Contenido','Content');
}
function goCategories(){
  pendingCategory=null;
  const target=selectedCategoryButton()||document.querySelector('#categories button:not([disabled])')||document.getElementById('category-expand');
  if(target){
    document.getElementById('category-tools').scrollIntoView({block:'start',behavior:'auto'});
    focusElement(target);
  }
}
function catalogDirection(key){
  if(modal||!catalogTabs.includes(active)||!remote)return false;
  const a=document.activeElement;
  const categories=Array.from(categoryList.querySelectorAll('button[data-category]')).filter(visible);
  const titles=Array.from(cards.querySelectorAll('button[data-item]')).filter(visible);
  const loadMore=document.getElementById('loadmore');
  const currentCategory=selectedCategoryButton()||categories[0];
  if(a.closest('.sidebar')&&key==='ArrowRight'){focusElement(currentCategory);return true;}
  if(categoryList.contains(a)){
    if(key==='ArrowRight'){focusElement(titles[0]||backCats);return true;}
    if(key==='ArrowLeft'){
      focusElement(document.querySelector('.sidebar [data-nav="'+active+'"]'));return true;
    }
    const n=categories.indexOf(a)+(key==='ArrowUp'?-1:1);
    if(categories[n])focusElement(categories[n]);return true;
  }
  if(a===backCats&&key==='ArrowDown'){focusElement(titles[0]);return true;}
  if(a===loadMore&&key==='ArrowUp'){focusElement(titles[titles.length-1]);return true;}
  if(cards.contains(a)){
    const tile=a.closest('.fav-tile')?.querySelector('button[data-item]')||a.closest('button[data-item]');
    if(!tile)return false;
    if(key==='ArrowLeft'){
      if(a.matches('.fav-star'))focusElement(tile);else goCategories();
      return true;
    }
    if(key==='ArrowRight'){focusElement(tile.parentElement.querySelector('.fav-star'));return true;}
    const n=titles.indexOf(tile)+(key==='ArrowUp'?-1:1);
    if(n<0)focusElement(backCats);
    else if(n>=titles.length)focusElement(loadMore);
    else if(a.matches('.fav-star'))focusElement(titles[n].parentElement.querySelector('.fav-star')||titles[n]);
    else focusElement(titles[n]);
    return true;
  }
  return false;
}
backCats.addEventListener('click',goCategories);
function focusCategoryResults(){
  if(!pendingCategory||shownOverlay())return;
  if(active!==pendingCategory.tab||String(category)!==pendingCategory.id||operation!==pendingCategory.op){pendingCategory=null;return;}
  updateResultBar();
  const first=cards.querySelector('button[data-item]:not(:disabled),button[data-episode]:not(:disabled),#retry-catalog');
  if(first&&visible(first)){
    pendingCategory=null;
    resultBar.scrollIntoView({block:'start',behavior:'auto'});
    focusElement(first);
  }else if(!pendingCategory.anchored){
    pendingCategory.anchored=true;
    resultBar.scrollIntoView({block:'start',behavior:'auto'});
    focusElement(backCats);
  }
}
window.ASPLAYER_TV_CATEGORY=function(id){
  updateResultBar();
  if(!remote||defaultCategorySelection||!catalogTabs.includes(active))return;
  pendingCategory={tab:active,id:String(id),op:operation,anchored:false};
  requestAnimationFrame(focusCategoryResults);
};
new MutationObserver(()=>{if(pendingCategory)requestAnimationFrame(focusCategoryResults);})
  .observe(cards,{childList:true,subtree:true});
// Default to All on entry, but retain the viewer's category focus. VOD/series
// use the historical bounded preview rather than fetching the entire catalog.
const prevLoadCategoriesTv=loadCategories;
loadCategories=async function(tab,force=false){
  const initialOp=operation;
  await prevLoadCategoriesTv(tab,force);
  if(active===tab&&operation===initialOp&&category==='none'&&cats.length){
    defaultCategorySelection=true;
    try{tryCategory('all');}finally{defaultCategorySelection=false;}
  }
  updateResultBar();
};
const oldBackTv=window.ASPLAYER_BACK;
window.ASPLAYER_BACK=function(){
  if(remote&&!shownOverlay()&&catalogTabs.includes(active)&&
     (cards.contains(document.activeElement)||resultBar.contains(document.activeElement))){
    goCategories();return;
  }
  pendingCategory=null;
  if(oldBackTv)oldBackTv();
};
// Cancel a deferred focus transfer as soon as the viewer chooses to navigate
// elsewhere; never steal focus later when a slow list arrives.
document.addEventListener('keydown',e=>{
  if(!remote)return;
  if(Object.prototype.hasOwnProperty.call(arrows,e.key)||e.key==='Tab')pendingCategory=null;
  if(!shownOverlay()&&catalogTabs.includes(active)&&
     ['Escape','Backspace'].includes(e.key)&&
     (cards.contains(document.activeElement)||resultBar.contains(document.activeElement))){
    consume(e);goCategories();
  }
},true);
document.addEventListener('click',e=>{
  if(pendingCategory&&!cards.contains(e.target)&&!e.target.closest('[data-category]'))pendingCategory=null;
},true);
const priorTvLanguage=languageUI;
languageUI=function(){priorTvLanguage.apply(this,arguments);updateResultBar();};
updateResultBar();
"""
# The primary capture handler consumes directional keys; cancel pending focus
# inside it, before stopImmediatePropagation, instead of registering another
# directional handler.
catalog=catalog.replace("  if(Object.prototype.hasOwnProperty.call(arrows,e.key)||e.key==='Tab')pendingCategory=null;\n","")
s=change(s,"  if(!arrow&&!ok&&e.key!=='Tab')return;",
         "  if(arrow||e.key==='Tab')pendingCategory=null;\n  if(!arrow&&!ok&&e.key!=='Tab')return;")
s=change(s,"  navigate(e.key);","  if(!catalogDirection(e.key))navigate(e.key);")
# Move Escape/Backspace handling into that same capture listener.
back_start=catalog.index("document.addEventListener('keydown',e=>")
back_end=catalog.index("document.addEventListener('click',e=>",back_start)
catalog=catalog[:back_start]+catalog[back_end:]
s=change(s,"  const arrow=Object.prototype.hasOwnProperty.call(arrows,e.key);",
         """  if(remote&&!shownOverlay()&&catalogTabs.includes(active)&&
     ['Escape','Backspace'].includes(e.key)&&
     (cards.contains(document.activeElement)||resultBar.contains(document.activeElement))){
    consume(e);goCategories();return;
  }
  const arrow=Object.prototype.hasOwnProperty.call(arrows,e.key);""")
s=change(s,"\nconst panel=document.createElement('div');","\n"+catalog+"\nconst panel=document.createElement('div');")
p.write_text(s)

java=base/"java/com/alftech/asplayer/universal/MainActivity.java"
s=java.read_text()
s=change(s,'private Button playPause, repairVideoButton;',
'''private Button playPause, repairVideoButton, audioButton, subtitlesButton, aspectButton;
    private final ArrayList<List<View>> navigationRows=new ArrayList<>();
    private final ArrayList<Button> seekButtons=new ArrayList<>();
    private boolean remotePlayerMode, trackDialogOpen;
    private AlertDialog trackDialog;
    private long lastSeekAt, stableSince, pendingResumeMs;
    private boolean isTvDevice() {
        return (getResources().getConfiguration().uiMode
              & Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION
            || getPackageManager().hasSystemFeature("android.software.leanback");
    }
    private boolean remotePlayer(){return remotePlayerMode||isTvDevice();}
    private void focusRemote(View v){
        if(v!=null&&!v.requestFocus()&&remotePlayer())v.requestFocusFromTouch();
    }''')
s=change(s,'private String profile="normal",','private String profile="adaptive",')
s=change(s,'if(controls != null && playerVisible && !timelineDragging) controls.setVisibility(View.GONE);',
'''if(controls != null && playerVisible && !timelineDragging && !trackDialogOpen) {
            controls.setVisibility(View.GONE);
            if(remotePlayer()&&!feedbackBlocking())video.requestFocus();
        }''')
s=change(s,'b.setTextSize(13);','b.setTextSize(isTvDevice()?16:13);')
s=change(s,'b.setBackgroundColor(0xB523174A);\n        b.setFocusable(true);\n        b.setFocusableInTouchMode(false);',
'''b.setBackground(controlBackground(false));
        b.setFocusable(true);
        b.setFocusableInTouchMode(isTvDevice());''')
s=change(s,'v.setBackgroundColor(focused?0xFF156B91:0xB523174A);\n            v.setScaleX(focused?1.045f:1f);\n            v.setScaleY(focused?1.045f:1f);',
'''v.setBackground(controlBackground(focused));
            v.setElevation(focused?dp(4):0);
            if(focused&&playerVisible&&remotePlayer()&&!trackDialogOpen)resetControlsTimer();''')
s=change(s,'    private TextView timeText(String value) {',
'''    private GradientDrawable controlBackground(boolean focused) {
        GradientDrawable bg=new GradientDrawable();
        bg.setColor(focused?0xFF176B91:0xC223174A);
        bg.setCornerRadius(dp(8));
        bg.setStroke(dp(focused?3:1),focused?0xFFFFDF79:0xFF53638B);
        return bg;
    }
    private void addControl(LinearLayout row,Button b,float weight,boolean seek) {
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(isTvDevice()?54:44),weight);
        lp.setMargins(dp(3),dp(3),dp(3),dp(3));row.addView(b,lp);
        if(seek)seekButtons.add(b);
    }
    private void addNavigationRow(LinearLayout row) {
        ArrayList<View> views=new ArrayList<>();
        for(int i=0;i<row.getChildCount();i++){
            View v=row.getChildAt(i);if(v.isFocusable())views.add(v);
        }
        navigationRows.add(views);
    }
    private TextView timeText(String value) {''')
s=change(s,'if(seekRow!=null)seekRow.setVisibility(available?View.VISIBLE:View.GONE);',
'''if(seekRow!=null)seekRow.setVisibility(available?View.VISIBLE:View.GONE);
        for(Button b:seekButtons)b.setEnabled(available);''')
s=change(s,'timeline.setFocusable(true);',
'''timeline.setFocusable(true);
        timeline.setFocusableInTouchMode(isTvDevice());
        timeline.setOnFocusChangeListener((v,f)->{
            v.setBackground(f?controlBackground(true):null);
            if(f&&playerVisible)resetControlsTimer();
        });''')
start=s.index('        LinearLayout transport=row();',s.index('private void createControls()'))
end=s.index('        root.addView(controls,',start)
s=s[:start]+'''        addNavigationRow(seekRow);
        LinearLayout transport=row();
        addControl(transport,button("−30s",()->seekBy(-30000)),1,true);
        addControl(transport,button("−10s",()->seekBy(-10000)),1,true);
        playPause=button("Pause",this::togglePause);
        addControl(transport,playPause,1.5f,false);
        addControl(transport,button("+10s",()->seekBy(10000)),1,true);
        addControl(transport,button("+30s",()->seekBy(30000)),1,true);
        controls.addView(transport);addNavigationRow(transport);

        LinearLayout extras=row();
        addControl(extras,button("−5m",()->seekBy(-300000)),1,true);
        addControl(extras,button("+5m",()->seekBy(300000)),1,true);
        audioButton=button("Audio",()->chooseTrack(false));
        subtitlesButton=button("Subtitles",()->chooseTrack(true));
        aspectButton=button("Fit / Fill",this::toggleAspect);
        addControl(extras,audioButton,1.3f,false);
        addControl(extras,subtitlesButton,1.5f,false);
        addControl(extras,aspectButton,1.5f,false);
        addControl(extras,button("✕",()->closePlayer(true)),.7f,false);
        controls.addView(extras);addNavigationRow(extras);
        LinearLayout repair=row();
        repairVideoButton=button(localized("Recuperar imagen","Recover video"),this::manualRepairVideo);
        addControl(repair,repairVideoButton,1,false);
        controls.addView(repair);addNavigationRow(repair);

'''+s[end:]
s=change(s,'if(playPause!=null)playPause.setText(player.isPlaying()?"Pause":"Play");',
'''updatePlayerLabels();''')
start=s.index('    private void showControls() {')
end=s.index('    private void seekTo(',start)
s=s[:start]+'''    private boolean feedbackBlocking(){
        return playbackFeedback!=null&&playbackFeedback.getVisibility()==View.VISIBLE
            &&(!playbackStarted||playbackFailed);
    }
    private boolean isInControls(View view) {
        for(View v=view;v!=null;){
            if(v==controls)return true;
            if(!(v.getParent() instanceof View))break;v=(View)v.getParent();
        }
        return false;
    }
    private void resetControlsTimer() {
        handler.removeCallbacks(hideControls);
        if(!timelineDragging&&!trackDialogOpen&&!feedbackBlocking())
            handler.postDelayed(hideControls,remotePlayer()?6500:3000);
    }
    private void updatePlayerLabels(){
        if(playPause!=null)playPause.setText(player!=null&&player.isPlaying()?localized("Pausar","Pause"):localized("Reproducir","Play"));
        if(subtitlesButton!=null)subtitlesButton.setText(localized("Subtítulos","Subtitles"));
        if(aspectButton!=null)aspectButton.setText("contain".equals(pictureMode)?localized("Ampliar","Fill screen"):localized("Ajustar","Fit screen"));
        if(repairVideoButton!=null)repairVideoButton.setText(localized("Recuperar imagen","Recover video"));
    }
    private void showControls() {
        if(!playerVisible||feedbackBlocking())return;
        controls.setVisibility(View.VISIBLE);
        syncTimeline();updatePlayerLabels();
        if(remotePlayer()&&!trackDialogOpen&&!isInControls(getCurrentFocus())&&playPause!=null)
            focusRemote(playPause);
        resetControlsTimer();
    }
    private boolean selectable(View v){return v!=null&&v.isShown()&&v.isEnabled()&&v.isFocusable();}
    private float centerX(View v){int[] xy=new int[2];v.getLocationOnScreen(xy);return xy[0]+v.getWidth()/2f;}
    private void movePlayerFocus(int key){
        View current=getCurrentFocus();
        for(int r=0;r<navigationRows.size();r++){
            List<View> row=navigationRows.get(r);int index=row.indexOf(current);
            if(index<0)continue;
            if(key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT){
                int step=key==KeyEvent.KEYCODE_DPAD_LEFT?-1:1;
                for(int i=index+step;i>=0&&i<row.size();i+=step)
                    if(selectable(row.get(i))){focusRemote(row.get(i));return;}
            }else{
                int step=key==KeyEvent.KEYCODE_DPAD_UP?-1:1;
                float x=centerX(current);
                for(int i=r+step;i>=0&&i<navigationRows.size();i+=step){
                    View best=null;float distance=Float.MAX_VALUE;
                    for(View v:navigationRows.get(i))if(selectable(v)){
                        float d=Math.abs(centerX(v)-x);
                        if(d<distance){best=v;distance=d;}
                    }
                    if(best!=null){focusRemote(best);return;}
                }
            }
            return;
        }
        if(playPause!=null)focusRemote(playPause);
    }
'''+s[end:]
s=change(s,'long target=Math.max(0,Math.min(player.getLength()-1,at));',
'''long target=Math.max(0,Math.min(player.getLength()-1,at));
        lastSeekAt=android.os.SystemClock.elapsedRealtime();''')
start=s.index('    @Override public boolean dispatchKeyEvent(KeyEvent event) {')
end=s.index('    private boolean allowedProviderUrl(',start)
s=s[:start]+'''    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if(!playerVisible||trackDialogOpen)return super.dispatchKeyEvent(event);
        int key=event.getKeyCode();
        boolean arrow=key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT
            ||key==KeyEvent.KEYCODE_DPAD_UP||key==KeyEvent.KEYCODE_DPAD_DOWN;
        boolean ok=key==KeyEvent.KEYCODE_DPAD_CENTER||key==KeyEvent.KEYCODE_ENTER
            ||key==KeyEvent.KEYCODE_NUMPAD_ENTER;
        boolean transport=key==KeyEvent.KEYCODE_MEDIA_REWIND||key==KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
            ||key==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE||key==KeyEvent.KEYCODE_MEDIA_PLAY||key==KeyEvent.KEYCODE_MEDIA_PAUSE;
        if(!arrow&&!ok&&!transport)return super.dispatchKeyEvent(event);
        if(event.getAction()!=KeyEvent.ACTION_DOWN)return true; // prevent a second activation on key-up
        if(arrow||ok)remotePlayerMode=true;
        if(feedbackBlocking()){
            if(playbackFailed&&(key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT)){
                focusRemote(getCurrentFocus()==feedbackRetry?feedbackClose:feedbackRetry);
            }else if(ok&&event.getRepeatCount()==0){
                View selected=getCurrentFocus();
                if(selected==feedbackRetry||selected==feedbackClose)selected.performClick();
                else focusRemote(feedbackClose);
            }else if(!playbackFailed)focusRemote(feedbackClose);
            return true;
        }
        if(transport){
            if(key==KeyEvent.KEYCODE_MEDIA_REWIND)seekBy(-10000);
            else if(key==KeyEvent.KEYCODE_MEDIA_FAST_FORWARD)seekBy(10000);
            else if(event.getRepeatCount()==0&&player!=null){
                if(key==KeyEvent.KEYCODE_MEDIA_PLAY){if(!player.isPlaying())player.play();}
                else if(key==KeyEvent.KEYCODE_MEDIA_PAUSE){if(player.isPlaying())player.pause();}
                else togglePause();
            }
            showControls();return true;
        }
        if(controls.getVisibility()!=View.VISIBLE||!isInControls(getCurrentFocus())){
            showControls();return true;
        }
        resetControlsTimer();
        View selected=getCurrentFocus();
        if(ok){
            if(event.getRepeatCount()==0){
                if(selected instanceof Button)selected.performClick();
                else if(selected==timeline&&playPause!=null)focusRemote(playPause);
            }
        }else if(selected==timeline&&(key==KeyEvent.KEYCODE_DPAD_LEFT||key==KeyEvent.KEYCODE_DPAD_RIGHT)){
            long step=event.getRepeatCount()>5?30000:10000;
            seekBy(key==KeyEvent.KEYCODE_DPAD_LEFT?-step:step);
        }else movePlayerFocus(key);
        return true;
    }
'''+s[end:]
s=change(s,'private void toggleAspect() { pictureMode="contain".equals(pictureMode)?"cover":"contain"; updateAspect(); }',
'''private void toggleAspect() { pictureMode="contain".equals(pictureMode)?"fill":"contain"; updateAspect();updatePlayerLabels(); }''')
s=change(s,'if("adaptive".equals(profile))return Math.min(9500,3000+(rebufferCount*1500));',
'''if("adaptive".equals(profile)){
            long now=android.os.SystemClock.elapsedRealtime();
            if(stableSince>0&&now-stableSince>90000)rebufferCount=Math.max(0,rebufferCount-1);
            // Lower initial latency, increasing buffer on subsequent genuine stalls.
            return Math.min(8500,(isLive?1500:2400)+(rebufferCount*1200));
        }''')
s=change(s,'this.profile="fast".equals(newProfile)||"ultra".equals(newProfile)\n            ||"adaptive".equals(newProfile)?newProfile:"normal";',
'''this.profile="fast".equals(newProfile)||"ultra".equals(newProfile)||"normal".equals(newProfile)
            ?newProfile:"adaptive";''')
# Compute buffer once; do not let the decay repeatedly execute for each option.
s=change(s,'media.addOption(":network-caching="+networkCache());\n            media.addOption(":live-caching="+networkCache());\n            media.addOption(":file-caching="+networkCache());',
'''int cache=networkCache();
            media.addOption(":network-caching="+cache);
            media.addOption(":live-caching="+cache);
            media.addOption(":file-caching="+cache);''')
s=change(s,'activeMediaUrl=url;\n            player.stop();',
'''activeMediaUrl=url;
            if(playerVisible)player.stop();''')
s=change(s,'playbackStarted=false;\n            playbackFailed=false;',
'''playbackStarted=false;
            pendingResumeMs=resumeMs;
            lastSeekAt=0;stableSince=0;
            playbackFailed=false;''')
s=change(s,'            video.requestFocus();\n            getWindow().addFlags',
'''            if(remotePlayer())focusRemote(feedbackClose);else video.requestFocus();
            getWindow().addFlags''')
s=change(s,'            if(resumeMs>0 && !isLive)handler.postDelayed(()->{if(playerVisible && player!=null) player.setTime(resumeMs);},700);\n            showControls();',
'''            if(!remotePlayer())showControls();''')
s=change(s,'if(playerVisible && playbackStarted && rebufferWaiting && !playbackFailed) showLoadingFeedback();',
'''if(playerVisible && playbackStarted && rebufferWaiting && !playbackFailed) {
            if(android.os.SystemClock.elapsedRealtime()-lastSeekAt>3500){
                rebufferCount=Math.min(5,rebufferCount+1);
                stableSince=0;
            }
            showLoadingFeedback();
        }''')
s=change(s,'rebufferCount=Math.min(5,rebufferCount+1);\n                        handler.removeCallbacks(showRebuffer);\n                        handler.postDelayed(showRebuffer,650);',
'''handler.removeCallbacks(showRebuffer);
                        handler.postDelayed(showRebuffer,1400);''')
s=change(s,'                    playbackStarted=true;\n                    rebufferWaiting=false;',
'''                    boolean firstStart=!playbackStarted;
                    playbackStarted=true;
                    stableSince=android.os.SystemClock.elapsedRealtime();
                    rebufferWaiting=false;''')
s=change(s,'                    if(playPause!=null)playPause.setText("Pause");\n                    sendEvent("ready");',
'''                    updatePlayerLabels();
                    if(firstStart&&videoOutputSeen)showControls();
                    if(firstStart&&pendingResumeMs>0&&!isLive){
                        final long attempt=playbackAttempt,position=pendingResumeMs;pendingResumeMs=0;
                        handler.postDelayed(()->{if(playerVisible&&playbackAttempt==attempt)seekTo(position);},400);
                    }
                    sendEvent("ready");''')
s=change(s,'if(playbackStarted && !rebufferWaiting)hidePlaybackFeedback();',
'''if(playbackStarted && !rebufferWaiting){
                            boolean opening=controls.getVisibility()!=View.VISIBLE&&playbackFeedback.getVisibility()==View.VISIBLE;
                            hidePlaybackFeedback();
                            if(opening)showControls();
                        }''')
# Feedback on initial load owns focus. Buffering after playback remains a
# status indication (doesn't take focus away from the currently selected control).
s=change(s,'        playbackFeedback.setVisibility(View.VISIBLE);\n    }\n    private void hidePlaybackFeedback()',
'''        playbackFeedback.setVisibility(View.VISIBLE);
        if(remotePlayer()&&!playbackStarted){
            controls.setVisibility(View.GONE);focusRemote(feedbackClose);
        }
    }
    private void hidePlaybackFeedback()''')
s=change(s,'if(playbackFeedback!=null)playbackFeedback.setVisibility(View.GONE);',
'''if(playbackFeedback!=null){
            boolean focusWasFeedback=getCurrentFocus()==feedbackClose||getCurrentFocus()==feedbackRetry;
            playbackFeedback.setVisibility(View.GONE);
            if(focusWasFeedback&&playerVisible&&playbackStarted&&remotePlayer())showControls();
        }''')
s=change(s,'if(playbackFeedback!=null){playbackFeedback.setVisibility(View.VISIBLE);playbackFeedback.requestFocus();}',
'''if(playbackFeedback!=null){
            playbackFeedback.setVisibility(View.VISIBLE);
            if(remotePlayer()){controls.setVisibility(View.GONE);focusRemote(feedbackRetry);}
        }''')
s=change(s,'        if(trySoftwareRecovery())return;\n        if(!triedLiveFallback',
'''        // Try the provider's alternate live transport before software decoding.
        if(!triedLiveFallback''')
s=change(s,'        retryPosition=player!=null && !isLive?',
'''        if((!playbackStarted||!videoOutputSeen)&&trySoftwareRecovery())return;
        retryPosition=player!=null && !isLive?''')
s=change(s,'if(playbackStarted){rebufferWaiting=false;cancelPlaybackDeadline();handler.removeCallbacks(showRebuffer);hidePlaybackFeedback();}\n                    break;',
'''if(playbackStarted){rebufferWaiting=false;cancelPlaybackDeadline();handler.removeCallbacks(showRebuffer);hidePlaybackFeedback();}
                    updatePlayerLabels();
                    break;''')
# Track menus retain focus and do not hide while the user is choosing.
start=s.index('        new AlertDialog.Builder(this)',s.index('private void chooseTrack'))
end=s.index('    private void selectTrack(',start)
s=s[:start]+'''        Object current=invokeNoArgs(player,subtitles?"getSpuTrack":"getAudioTrack");
        int chosen=-1;
        if(current!=null)for(int i=0;i<options.size();i++)if(options.get(i).id.equals(String.valueOf(current)))chosen=i;
        final Button origin=subtitles?subtitlesButton:audioButton;
        trackDialogOpen=true;handler.removeCallbacks(hideControls);
        trackDialog=new AlertDialog.Builder(this)
                .setTitle(subtitles?localized("Subtítulos","Subtitles"):localized("Idioma de audio","Audio language"))
                .setSingleChoiceItems(labels,chosen,(d,which)->{
                    selectTrack(subtitles,options.get(which).id);d.dismiss();
                })
                .setNegativeButton(localized("Cancelar","Cancel"),null).create();
        trackDialog.setOnDismissListener(d->{
            trackDialogOpen=false;trackDialog=null;
            if(playerVisible){showControls();if(origin!=null&&remotePlayer())focusRemote(origin);}
        });
        trackDialog.show();
        if(remotePlayer()){
            trackDialog.getListView().requestFocus();
            trackDialog.getListView().setSelection(Math.max(0,chosen));
        }
    }
'''+s[end:]
s=change(s,'if(id.isEmpty())continue;\n                out.add(new TrackOption(id,name.isEmpty()?"Track "+id:name));',
'''if(id.isEmpty()||(subtitles&&"-1".equals(id)))continue;
                out.add(new TrackOption(id,name.isEmpty()?"Track "+id:name));''')
s=change(s,'        playerVisible=false;\n        cancelVideoWatchdog();',
'''        playerVisible=false;
        if(trackDialog!=null)trackDialog.dismiss();
        trackDialogOpen=false;pendingResumeMs=0;
        cancelVideoWatchdog();''')
s=change(s,'        if(notifyWeb)sendEvent("closed");',
'''        if(notifyWeb){web.requestFocus();sendEvent("closed");}''')
s=change(s,'    private void closePlayer(boolean notifyWeb) {\n        sendPosition(false);',
'''    private void closePlayer(boolean notifyWeb) {
        if(!playerVisible)return;
        sendPosition(false);''')
s=change(s,'        } else {\n            String title=isLive ? localized("CARGANDO CANAL…","LOADING CHANNEL…")',
'''        } else if(playbackStarted&&rebufferWaiting) {
            feedbackTitle.setText(localized("RECUPERANDO SEÑAL…","BUFFERING…"));
            feedbackDetail.setText(localized("La reproducción continuará al recuperar la señal.","Playback will continue when the signal recovers."));
        } else {
            String title=isLive ? localized("CARGANDO CANAL…","LOADING CHANNEL…")''')
s=change(s,'        if(playerVisible)closePlayer(true);\n        else evaluate',
'''        if(playerVisible){
            if(trackDialog!=null){trackDialog.dismiss();return;}
            if(remotePlayer()&&!feedbackBlocking()&&controls.getVisibility()==View.VISIBLE){
                handler.removeCallbacks(hideControls);controls.setVisibility(View.GONE);video.requestFocus();return;
            }
            closePlayer(true);
        }
        else evaluate''')
s=change(s,'return (getResources().getConfiguration().uiMode\n                  & Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION\n                || getPackageManager().hasSystemFeature("android.software.leanback");',
'''return isTvDevice();''')
java.write_text(s)
print("TV 5.9.12: category handoff, native directional controls and adaptive startup")
