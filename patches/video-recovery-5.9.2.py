#!/usr/bin/env python3
"""ASPLAYER 5.9.2: LibVLC output-surface recovery and decoder preferences.
Apply after seek-controls-5.9.py and loading-maintenance-5.9.1.py.
"""
from pathlib import Path
import re

native = Path('app/src/main/java/com/alftech/asplayer/universal/MainActivity.java')
s = native.read_text(encoding='utf-8')

def replace_one(old, new, name):
    global s
    hits = s.count(old)
    if hits != 1:
        raise RuntimeError(f'{name}: expected one Java anchor, found {hits}')
    s = s.replace(old, new, 1)

replace_one('import android.content.res.Configuration;',
            'import android.content.res.Configuration;\nimport android.content.SharedPreferences;',
            'preferences import')
replace_one('    private Button playPause;', '    private Button playPause, repairVideoButton;', 'repair button field')
replace_one('    private boolean playbackStarted, playbackFailed, rebufferWaiting;',
'''    private boolean playbackStarted, playbackFailed, rebufferWaiting;
    private String decoderMode="auto", activeMediaUrl="";
    private boolean usingSoftwareFallback, videoOutputSeen;
    private Runnable videoWatchdog;
''', 'decoder state fields')
replace_one('        super.onCreate(state);',
'''        super.onCreate(state);
        decoderMode=getSharedPreferences("asplayer_decoder",MODE_PRIVATE).getString("mode","auto");
        if(!"auto".equals(decoderMode) && !"hardware".equals(decoderMode)
             && !"software".equals(decoderMode)) decoderMode="auto";''', 'decoder restored')

replace_one('''                case MediaPlayer.Event.Playing:
                    if(playbackFailed)break;
                    playbackStarted=true;
                    rebufferWaiting=false;
                    cancelPlaybackDeadline();
                    handler.removeCallbacks(showRebuffer);
                    hidePlaybackFeedback();
                    syncTimeline();''',
'''                case MediaPlayer.Event.Vout:
                    if(playbackFailed)break;
                    if(e.getVoutCount()>0) {
                        videoOutputSeen=true;
                        cancelVideoWatchdog();
                        if(playbackStarted && !rebufferWaiting)hidePlaybackFeedback();
                    } else if(videoOutputSeen && playbackStarted && !rebufferWaiting) {
                        videoOutputSeen=false;
                        scheduleVideoWatchdog(8500);
                    }
                    break;
                case MediaPlayer.Event.Playing:
                    if(playbackFailed)break;
                    playbackStarted=true;
                    rebufferWaiting=false;
                    cancelPlaybackDeadline();
                    handler.removeCallbacks(showRebuffer);
                    if(videoOutputSeen) {
                        cancelVideoWatchdog();
                        hidePlaybackFeedback();
                    } else {
                        showLoadingFeedback();
                        scheduleVideoWatchdog(12000);
                    }
                    syncTimeline();''', 'Playing needs actual video output')
replace_one('''                        if(playbackStarted){cancelPlaybackDeadline();hidePlaybackFeedback();}''',
'''                        if(playbackStarted){
                            cancelPlaybackDeadline();
                            if(videoOutputSeen)hidePlaybackFeedback();
                            else scheduleVideoWatchdog(12000);
                        }''', 'buffering end must require video')
replace_one('''                case MediaPlayer.Event.EndReached:
                    cancelPlaybackDeadline();hidePlaybackFeedback();''',
'''                case MediaPlayer.Event.EndReached:
                    cancelVideoWatchdog();cancelPlaybackDeadline();hidePlaybackFeedback();''', 'ended watchdog cleanup')

# Helper routines are defined ahead of the 5.9.1 overlay methods.
helpers='''    private void cancelVideoWatchdog() {
        if(videoWatchdog!=null)handler.removeCallbacks(videoWatchdog);
        videoWatchdog=null;
    }
    private void scheduleVideoWatchdog(long milliseconds) {
        cancelVideoWatchdog();
        final long attempt=playbackAttempt;
        videoWatchdog=()->{
            if(playerVisible && !playbackFailed && playbackAttempt==attempt
                    && playbackStarted && !videoOutputSeen) {
                // Audio may already be playing: try software decode only once.
                if(!trySoftwareRecovery())handlePlaybackFailure();
            }
        };
        handler.postDelayed(videoWatchdog,milliseconds);
    }
    private boolean useSoftwareDecoder() {
        return "software".equals(decoderMode) || usingSoftwareFallback;
    }
    private boolean trySoftwareRecovery() {
        if(!playerVisible || playingUrl.isEmpty() || usingSoftwareFallback
                || !"auto".equals(decoderMode))return false;
        usingSoftwareFallback=true;
        long resume=(!isLive && player!=null)?Math.max(0,player.getTime()):0;
        startMediaInternal(activeMediaUrl.isEmpty()?playingUrl:activeMediaUrl,resume);
        return true;
    }
    private void manualRepairVideo() {
        if(!playerVisible || playingUrl.isEmpty())return;
        // Manual recovery also works when a decoder reports Vout but draws black frames.
        usingSoftwareFallback=true;
        long resume=(!isLive && player!=null)?Math.max(0,player.getTime()):0;
        startMediaInternal(activeMediaUrl.isEmpty()?playingUrl:activeMediaUrl,resume);
    }
'''
replace_one('    private String localized(String spanish,String english) {',
             helpers + '    private String localized(String spanish,String english) {',
             'recovery helper methods')
replace_one('''    private void handlePlaybackFailure() {
        if(!playerVisible || playbackFailed)return;''',
'''    private void handlePlaybackFailure() {
        if(!playerVisible || playbackFailed)return;
        cancelVideoWatchdog();
        if(trySoftwareRecovery())return;''', 'software before maintenance')
replace_one('''        controls.addView(extras);

        root.addView(controls,''',
'''        controls.addView(extras);
        LinearLayout videoRepairRow=row();
        repairVideoButton=button(localized("Recuperar imagen", "Recover video"),this::manualRepairVideo);
        repairVideoButton.setContentDescription(localized("Reintentar vídeo con decodificación por software",
                     "Retry video with software decoding"));
        videoRepairRow.addView(repairVideoButton,new LinearLayout.LayoutParams(-1,dp(43)));
        controls.addView(videoRepairRow);

        root.addView(controls,''', 'manual recovery control')
replace_one('''        this.playingUrl=url; this.triedLiveFallback=false;
        startMediaInternal(url,resumeMs);''',
'''        this.playingUrl=url; this.triedLiveFallback=false;
        this.usingSoftwareFallback=false;
        startMediaInternal(url,resumeMs);''', 'new content resets automatic fallback')
replace_one('''        try {
            player.stop();
            if(!attached) {
                player.attachViews(video,null,true,false);
                attached=true;
            }
            Media media=new Media(vlc,Uri.parse(url));
            media.setHWDecoderEnabled(true,false);''',
'''        try {
            cancelVideoWatchdog();
            videoOutputSeen=false;
            activeMediaUrl=url;
            player.stop();
            if(attached) {
                player.detachViews();
                attached=false;
            }
            // A visible surface must be ready BEFORE attaching LibVLC's video output.
            video.setVisibility(View.VISIBLE);
            video.requestLayout();
            player.attachViews(video,null,true,false);
            attached=true;
            Media media=new Media(vlc,Uri.parse(url));
            media.setHWDecoderEnabled(!useSoftwareDecoder(),false);''', 'surface activation and decoder config')
replace_one('''            playbackAttempt++;
            playbackStarted=false;''',
'''            playbackAttempt++;
            videoOutputSeen=false;
            playbackStarted=false;''', 'attempt reset')
replace_one('''        playerVisible=false;
        playbackAttempt++;''',
'''        playerVisible=false;
        cancelVideoWatchdog();
        videoOutputSeen=false;
        playbackAttempt++;''', 'close cancels video check')
replace_one('''                uiLanguage="es".equals(code)?"es":"en";
                if(playbackFeedback!=null''',
'''                uiLanguage="es".equals(code)?"es":"en";
                if(repairVideoButton!=null) {
                    repairVideoButton.setText(localized("Recuperar imagen","Recover video"));
                    repairVideoButton.setContentDescription(localized(
                        "Reintentar vídeo con decodificación por software",
                        "Retry video with software decoding"));
                }
                if(playbackFeedback!=null''', 'localize manual recovery')
replace_one('''        @JavascriptInterface public void play(String url) {''',
'''        @JavascriptInterface public void setDecoderMode(String value) {
            runOnUiThread(()->{
                String next="hardware".equals(value)||"software".equals(value)?value:"auto";
                decoderMode=next;
                getSharedPreferences("asplayer_decoder",MODE_PRIVATE)
                    .edit().putString("mode",next).apply();
                // The selected decoder takes effect on the next playback.
            });
        }
        @JavascriptInterface public void play(String url) {''', 'decoder selection bridge')
replace_one('''        cancelPlaybackDeadline();
        handler.removeCallbacks(showRebuffer);
        super.onStop();''',
'''        cancelPlaybackDeadline();
        cancelVideoWatchdog();
        handler.removeCallbacks(showRebuffer);
        super.onStop();''', 'pause watchdog cleanup')

native.write_text(s,encoding='utf-8')

feature=Path('app/src/main/assets/features-5.8.js')
a=feature.read_text(encoding='utf-8')
# Reuse the settings UI rather than adding a second disconnected native settings screen.
anchor='if(playerSetting)playerSetting.appendChild(settingsHint);'
assert a.count(anchor)==1, ('decoder settings anchor',a.count(anchor))
selection='''if(playerSetting)playerSetting.appendChild(settingsHint);
const decoderKey='asplayer:decoder:v592';
let decoderMode='auto';
try{decoderMode=localStorage.getItem(decoderKey)||'auto';}catch(_){}
if(!['auto','hardware','software'].includes(decoderMode))decoderMode='auto';
try{bridge.setDecoderMode(decoderMode);}catch(_){}
const decoderLabel=document.createElement('label');
const decoderSelect=document.createElement('select');
decoderSelect.id='decoder-mode-v592';
decoderSelect.setAttribute('aria-label','Decoder mode / Modo de decodificación');
[['auto','auto'],['hardware','hardware'],['software','software']].forEach(([value,text])=>{
  const option=document.createElement('option');option.value=value;option.textContent=text;
  decoderSelect.appendChild(option);
});
decoderSelect.value=decoderMode;
decoderSelect.addEventListener('change',()=>{
  decoderMode=decoderSelect.value;
  try{localStorage.setItem(decoderKey,decoderMode);}catch(_){}
  try{bridge.setDecoderMode(decoderMode);}catch(_){}
});
if(playerSetting){playerSetting.appendChild(decoderLabel);playerSetting.appendChild(decoderSelect);}
function syncDecoderLabels(){
  decoderLabel.textContent=lang==='es'?'Decodificación de vídeo':'Video decoding';
  decoderSelect.options[0].textContent=lang==='es'?'Automático (recomendado)':'Automatic (recommended)';
  decoderSelect.options[1].textContent=lang==='es'?'Hardware':'Hardware';
  decoderSelect.options[2].textContent=lang==='es'?'Software':'Software';
}
syncDecoderLabels();'''
a=a.replace(anchor,selection,1)
anchor='''languageUI=function(){
  refreshLanguage();
  syncNativeLanguage();'''
assert a.count(anchor)==1, ('decoder localization anchor',a.count(anchor))
a=a.replace(anchor,anchor+'\n  syncDecoderLabels();',1)
a=a.replace('ASPLAYER Universal 5.9.1','ASPLAYER Universal 5.9.2')
a=a.replace('ASPLAYER 5.9.1 usa','ASPLAYER 5.9.2 usa')
a=a.replace('ASPLAYER 5.9.1 uses','ASPLAYER 5.9.2 uses')
feature.write_text(a,encoding='utf-8')

build=Path('app/build.gradle')
g=build.read_text(encoding='utf-8')
assert g.count('versionCode 5901')==1
assert g.count("versionName '5.9.1-LibVLC'")==1
# 5.9.1 was signed with an ephemeral CI debug certificate. Use an independent
# application ID to avoid misleading in-place-upgrade promises/signature errors.
assert g.count("applicationId 'com.alftech.asplayer.universal.vlc.final.v591'")==1
g=g.replace('versionCode 5901','versionCode 5902').replace("versionName '5.9.1-LibVLC'","versionName '5.9.2-LibVLC'")
g=g.replace("applicationId 'com.alftech.asplayer.universal.vlc.final.v591'",
            "applicationId 'com.alftech.asplayer.universal.vlc.final.v592'")
build.write_text(g,encoding='utf-8')
html=Path('app/src/main/assets/index.html')
h=html.read_text(encoding='utf-8').replace('ASPLAYER Universal 5.9.1','ASPLAYER Universal 5.9.2')
html.write_text(h,encoding='utf-8')

checks=[
 ('MediaPlayer.Event.Vout',s),('scheduleVideoWatchdog',s),('setDecoderMode(String value)',s),
 ('Recuperar imagen',s),('decoder-mode-v592',a),('versionCode 5902',g)
]
assert all(term in data for term,data in checks)
print('ASPLAYER 5.9.2 video recovery patch applied',len(s),'Java chars')